"""
report_generator.py — Orchestrator that assembles the final standup report.

This is the central coordination module. It receives the full StandupRequest
(assembled by the Node backend), determines the report type based on the
user's workspace role, and orchestrates all sub-modules:

  ┌─────────────────────────────────────────────────────────────┐
  │                    StandupRequest                           │
  │  (user role + all project payloads + workspace data)        │
  └──────────────────────────┬──────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
            OWNER / ADMIN         MEMBER / VIEWER
                  │                     │
                  ▼                     ▼
        generate_admin_report   generate_contributor_report
                  │                     │
                  │              For each project:
                  │               ├─ activity_pulse.py  (math)
                  │               ├─ chat_summariser.py  (LLM)
                  │               ├─ wiki_summariser.py  (LLM)
                  │               ├─ format_tasks_table  (formatting)
                  │               └─ format_member_changes (formatting)
                  │
           For each project:
            ├─ activity_pulse.py  (math)
            └─ generate_highlights (LLM, concise)
                  │
                  ▼
           StandupResponse (JSON)
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from schemas import (
    StandupRequest,
    StandupResponse,
    ProjectPayload,
    ProjectAdminReport,
    ProjectContributorReport,
    ActivityPulse,
    TaskData,
    WhiteboardChange,
    MemberChange,
    RoleChangeEntry,
)
from activity_pulse import calculate_activity_pulse
from chat_summariser import summarise_chat
from wiki_summariser import summarise_wiki_changes
from llm_provider import get_llm


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API — Called by api.py
# ══════════════════════════════════════════════════════════════════════════════


async def generate_report(request: StandupRequest) -> StandupResponse:
    """
    Main entry point: determine the report type and delegate to the right generator.

    Report type routing:
      - OWNER or ADMIN → Admin report (bird's-eye view across all projects)
      - MEMBER or VIEWER → Contributor report (detailed per-project view)

    Parameters:
        request: The full StandupRequest with all project data.

    Returns:
        A StandupResponse ready to be serialised as JSON.
    """
    if request.user_workspace_role in ("OWNER", "ADMIN"):
        return await generate_admin_report(request)
    else:
        return await generate_contributor_report(request)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN / OWNER REPORT
# ══════════════════════════════════════════════════════════════════════════════


async def generate_admin_report(request: StandupRequest) -> StandupResponse:
    """
    Generate a bird's-eye view report for workspace OWNER or ADMIN.

    What admins see:
      1. Personalised greeting
      2. New workspace members (who joined in last 24h)
      3. Role changes across the workspace
      4. Per-project summary cards:
         - Activity Pulse score (0-100)
         - Number of tasks moved
         - AI-generated 2-3 line highlights
      5. AI-generated workspace-level summary

    Projects are sorted by Activity Pulse (most active first) so the admin
    immediately sees where the action is.
    """
    # ── Step 1: Generate per-project admin reports in parallel ─────────────────
    project_reports = await asyncio.gather(*[
        _generate_single_admin_project(project)
        for project in request.projects
    ])

    # Sort by activity pulse score (most active projects first)
    project_reports.sort(key=lambda r: r.activity_pulse.score, reverse=True)

    # ── Step 2: Format workspace-level membership changes ─────────────────────
    new_members_list = _format_new_workspace_members(request.workspace_data)
    role_changes_str = _format_workspace_role_changes(request.workspace_data)

    # ── Step 3: Generate workspace-level AI summary ───────────────────────────
    workspace_summary = await _generate_workspace_summary(
        request.workspace_name, project_reports
    )

    # ── Step 4: Assemble the final response ───────────────────────────────────
    return StandupResponse(
        report_type="admin",
        generated_at=datetime.now(timezone.utc),
        greeting=_build_greeting(request.user_name),
        workspace_summary=workspace_summary,
        new_workspace_members=new_members_list,
        role_changes_summary=role_changes_str,
        project_reports=project_reports,
    )


async def _generate_single_admin_project(project: ProjectPayload) -> ProjectAdminReport:
    """
    Generate the admin-level summary card for a single project.

    This runs the Activity Pulse calculator (pure math, instant) and
    an LLM call for 2-3 line highlights.
    """
    # Activity Pulse — pure math, no async needed
    pulse = calculate_activity_pulse(project)

    # AI-generated highlights — concise overview for the admin
    highlights = await _generate_project_highlights(project, pulse)

    return ProjectAdminReport(
        project_name=project.project_name,
        activity_pulse=pulse,
        tasks_moved_count=len(project.tasks_moved),
        key_highlights=highlights,
    )


async def _generate_project_highlights(
    project: ProjectPayload,
    pulse: ActivityPulse,
) -> str:
    """
    Use LLM to generate a 2-3 line highlight summary for admins.

    This is intentionally brief — admins want a quick pulse check,
    not a full breakdown. The input is structured data, not raw chat.
    """
    # Build a compact context string for the LLM
    context_parts = [
        f"Project: {project.project_name}",
        f"Activity Pulse: {pulse.score}/100",
        f"Tasks moved: {len(project.tasks_moved)}",
        f"Chat messages: {pulse.chat_count}",
        f"Wiki edits: {pulse.wiki_count}",
    ]

    # Add task details if any exist
    if project.tasks_moved:
        task_lines = [
            f"  - \"{t.title}\" ({t.status}, {t.priority})"
            for t in project.tasks_moved[:10]  # Cap at 10 to avoid token bloat
        ]
        context_parts.append("Recent task movements:\n" + "\n".join(task_lines))

    # Add notable events
    if project.new_members:
        names = [m.user_name for m in project.new_members]
        context_parts.append(f"New members joined: {', '.join(names)}")

    if project.whiteboard_changes:
        wb_names = [w.name for w in project.whiteboard_changes]
        context_parts.append(f"Whiteboards updated: {', '.join(wb_names)}")

    context = "\n".join(context_parts)

    prompt = (
        f"Based on this project activity data from the last 24 hours:\n\n"
        f"{context}\n\n"
        f"Write a 2-3 line highlight summary for a workspace admin's standup report. "
        f"Mention the most important events. Be specific but concise. "
        f"Don't repeat the pulse score or raw numbers — focus on what matters."
    )

    llm = get_llm()

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": "You are a concise project status reporter. Write brief, insightful highlights."},
            {"role": "user", "content": prompt},
        ])
        return response.content.strip()
    except Exception:
        # Fallback: generate a simple summary without the LLM
        return (
            f"{len(project.tasks_moved)} tasks moved. "
            f"{pulse.chat_count} chat messages. "
            f"{pulse.wiki_count} wiki edits."
        )


async def _generate_workspace_summary(
    workspace_name: str,
    project_reports: List[ProjectAdminReport],
) -> str:
    """
    Generate a bird's-eye workspace summary from all per-project reports.

    This is the first thing the admin reads — a 2-3 sentence overview
    of the entire workspace's health and activity.
    """
    if not project_reports:
        return "No project activity recorded in the last 24 hours."

    # Calculate aggregate stats
    total_tasks = sum(r.tasks_moved_count for r in project_reports)
    avg_pulse = sum(r.activity_pulse.score for r in project_reports) / len(project_reports)
    most_active = project_reports[0].project_name  # Already sorted by pulse
    least_active = project_reports[-1].project_name if len(project_reports) > 1 else None

    # Build context for the LLM
    project_lines = [
        f"  - {r.project_name}: pulse={r.activity_pulse.score}/100, tasks_moved={r.tasks_moved_count}"
        for r in project_reports
    ]
    context = (
        f"Workspace: {workspace_name}\n"
        f"Total projects: {len(project_reports)}\n"
        f"Total tasks moved: {total_tasks}\n"
        f"Average Activity Pulse: {avg_pulse:.1f}/100\n"
        f"Projects (sorted by activity):\n" + "\n".join(project_lines)
    )

    prompt = (
        f"Based on this workspace data from the last 24 hours:\n\n"
        f"{context}\n\n"
        f"Write a 2-3 sentence overview for a workspace admin. "
        f"Highlight overall productivity, the most and least active projects, "
        f"and any concerns (e.g., a project with 0 activity). Be encouraging but honest."
    )

    llm = get_llm()

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": "You are a workspace health analyst. Write brief, actionable summaries."},
            {"role": "user", "content": prompt},
        ])
        return response.content.strip()
    except Exception:
        return (
            f"Your workspace had {total_tasks} tasks moved across "
            f"{len(project_reports)} projects. "
            f"Most active: {most_active} (pulse: {project_reports[0].activity_pulse.score}/100)."
        )


# ══════════════════════════════════════════════════════════════════════════════
# CONTRIBUTOR / MEMBER REPORT
# ══════════════════════════════════════════════════════════════════════════════


async def generate_contributor_report(request: StandupRequest) -> StandupResponse:
    """
    Generate a detailed per-project report for workspace MEMBER or VIEWER.

    What contributors see for EACH project they're part of:
      1. Tasks moved on the Kanban board (table: task | who | status change)
      2. AI-generated chat summary (3-5 bullet points)
      3. Wiki/documentation change summary
      4. New/modified whiteboards
      5. Role changes in the project
      6. New members added to the project
      7. Activity Pulse score

    Multiple projects are listed sequentially — one section per project.
    """
    # Generate reports for all projects in parallel
    contributor_reports = await asyncio.gather(*[
        _generate_single_contributor_project(project)
        for project in request.projects
    ])

    return StandupResponse(
        report_type="contributor",
        generated_at=datetime.now(timezone.utc),
        greeting=_build_greeting(request.user_name),
        contributor_reports=contributor_reports,
    )


async def _generate_single_contributor_project(
    project: ProjectPayload,
) -> ProjectContributorReport:
    """
    Generate the detailed report for a single project (contributor view).

    This is where the heavy lifting happens — chat summarisation and wiki
    summarisation run in parallel via asyncio.gather() to minimise latency.
    """
    # ── Run AI-heavy tasks in parallel ────────────────────────────────────────
    # Both chat and wiki summarisation involve LLM calls, so parallelise them.
    chat_summary, wiki_summary = await asyncio.gather(
        summarise_chat(project.chat_messages),
        summarise_wiki_changes(project.wiki_changes),
    )

    # ── Run pure-formatting tasks (instant, no async needed) ──────────────────
    pulse = calculate_activity_pulse(project)
    tasks_summary = _format_tasks_table(project.tasks_moved)
    whiteboard_summary = _format_whiteboard_changes(project.whiteboard_changes)
    member_changes = _format_project_member_changes(
        project.new_members, project.role_changes
    )

    return ProjectContributorReport(
        project_name=project.project_name,
        tasks_summary=tasks_summary,
        chat_summary=chat_summary,
        wiki_summary=wiki_summary,
        whiteboard_summary=whiteboard_summary,
        member_changes=member_changes,
        activity_pulse=pulse,
    )


# ══════════════════════════════════════════════════════════════════════════════
# FORMATTING HELPERS  (Pure functions — no LLM, no I/O)
# ══════════════════════════════════════════════════════════════════════════════


def _build_greeting(user_name: str) -> str:
    """
    Generate a time-aware personalised greeting.

    Uses UTC time since the server may be in a different timezone than the user.
    The frontend can adjust this if needed.
    """
    hour = datetime.now().hour
    if hour < 12:
        period = "Good morning"
    elif hour < 17:
        period = "Good afternoon"
    else:
        period = "Good evening"

    return f"{period}, {user_name}! Here's your daily standup report."


def _format_tasks_table(tasks: List[TaskData]) -> str:
    """
    Format moved tasks as a Markdown table.

    Output format:
        | Task | Assignee | Status | Priority |
        |------|----------|--------|----------|
        | Fix auth bug | Ankush | IN_PROGRESS | P0 |
        | API rate limit | Suhani | IN_REVIEW | P1 |

    If no tasks were moved, returns a "no movement" message.
    """
    if not tasks:
        return "No task movements in the last 24 hours."

    # Table header
    lines = [
        "| Task | Assignee | Status | Priority |",
        "|------|----------|--------|----------|",
    ]

    # Table rows
    for task in tasks:
        assignee = task.assignee_name or "Unassigned"
        # Escape pipe characters in task titles to avoid breaking the table
        title = task.title.replace("|", "\\|")
        lines.append(f"| {title} | {assignee} | {task.status} | {task.priority} |")

    return "\n".join(lines)


def _format_whiteboard_changes(whiteboards: List[WhiteboardChange]) -> str:
    """
    Format whiteboard changes as a readable list.

    Distinguishes between newly created and modified whiteboards.

    Output format:
        • 🆕 "System Architecture" (new whiteboard created)
        • ✏️ "Sprint Planning Board" (modified)
    """
    if not whiteboards:
        return "No whiteboard activity in the last 24 hours."

    lines = []
    for wb in whiteboards:
        if wb.is_new:
            lines.append(f'• 🆕 "{wb.name}" (new whiteboard created)')
        else:
            lines.append(f'• ✏️ "{wb.name}" (modified)')

    return "\n".join(lines)


def _format_project_member_changes(
    new_members: List[MemberChange],
    role_changes: List[RoleChangeEntry],
) -> str:
    """
    Format membership and role changes for a project.

    Combines new members and role changes into a single readable section.
    """
    parts = []

    if new_members:
        member_lines = [
            f"• {m.user_name} joined as {m.role}"
            for m in new_members
        ]
        parts.append("**New members:**\n" + "\n".join(member_lines))

    if role_changes:
        role_lines = [
            f"• {rc.user_name} → {rc.new_role}"
            for rc in role_changes
        ]
        parts.append("**Role changes:**\n" + "\n".join(role_lines))

    if not parts:
        return "No membership or role changes."

    return "\n\n".join(parts)


def _format_new_workspace_members(
    workspace_data: Optional[object],
) -> Optional[List[str]]:
    """
    Extract new workspace members as a simple string list for the admin report.

    Format: ["Alice (joined as MEMBER)", "Bob (joined as ADMIN)"]
    """
    if not workspace_data or not workspace_data.new_members:
        return None

    return [
        f"{m.user_name} (joined as {m.role})"
        for m in workspace_data.new_members
    ]


def _format_workspace_role_changes(
    workspace_data: Optional[object],
) -> Optional[str]:
    """
    Format workspace-level role changes for the admin report.

    Returns a bulleted list or None if no changes occurred.
    """
    if not workspace_data or not workspace_data.role_changes:
        return None

    lines = [
        f"• {rc.user_name} → {rc.new_role}: {rc.content}"
        for rc in workspace_data.role_changes
    ]
    return "\n".join(lines)
