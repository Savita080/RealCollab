"""
report_generator.py — LLM-powered narrative generator using LangChain + Groq.

This module takes the pre-computed stats (health score, insights, task breakdown)
and asks an LLM to write a concise, human-readable 3-sentence project summary.

Architecture:
    - Stats computed by health_scorer.py and insights_builder.py first
    - This module ONLY handles the LLM narrative — never raw task data
    - Graceful fallback: if LLM fails, returns a stat-based template text

LLM Provider:
    - Default: Groq (llama3-8b-8192) — very fast, free tier available
    - Can be swapped to OpenAI / Anthropic via config.py
"""
from __future__ import annotations

import traceback
from datetime import datetime, timezone, timedelta

from config import settings
from schemas import (
    SummaryRequest, SummaryResponse,
    HealthScore, KeyInsight,
    TaskBreakdown, TaskBreakdownStatus,
    VelocityData, DeadlineItem, MemberContribution,
)
from health_scorer import compute_health_score, _avatar_colour, _make_aware
from insights_builder import build_insights


# ── LLM provider factory ──────────────────────────────────────────────────────

def _get_llm():
    """Return the configured LangChain LLM instance."""
    provider = settings.LLM_PROVIDER.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            temperature=0.4,
            max_tokens=300,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL or "gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.4,
            max_tokens=300,
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(
    request: SummaryRequest,
    health: HealthScore,
    insights: list[KeyInsight],
    breakdown: TaskBreakdown,
    velocity_total: int,
    trend: str,
) -> str:
    """Build the prompt sent to the LLM."""
    insight_lines = "\n".join(
        f"  - [{i.type.upper()}] {i.title}: {i.detail}"
        for i in insights
    )

    status_lines = "\n".join(
        f"  - {status}: {data.count} tasks ({data.percent}%)"
        for status, data in breakdown.by_status.items()
    )

    return f"""You are an AI project management assistant for a developer team collaboration tool.
Analyse the following project data and write a concise, professional 2–3 sentence summary.
Be specific — mention actual numbers. Be honest — don't sugarcoat problems.
Write in present tense, third person. No markdown, no bullet points, plain sentences only.

Project: {request.project_name}
Description: {request.project_description or "No description provided"}
Team size: {len(request.members)} members

Health Score: {health.score}/100 ({health.band})

Task Status:
{status_lines}

Velocity: {velocity_total} tasks completed this week, trend is {trend}

Key Issues & Signals:
{insight_lines}

Write the 2–3 sentence summary now:"""


# ── Fallback narrative (no LLM) ───────────────────────────────────────────────

def _fallback_narrative(
    request: SummaryRequest,
    health: HealthScore,
    breakdown: TaskBreakdown,
    velocity_total: int,
) -> str:
    """Generate a template-based summary when LLM is unavailable."""
    done = breakdown.by_status.get("DONE", TaskBreakdownStatus(count=0, percent=0))
    in_prog = breakdown.by_status.get("IN_PROGRESS", TaskBreakdownStatus(count=0, percent=0))

    return (
        f"{request.project_name} currently has a health score of {health.score}/100 ({health.band}). "
        f"{done.count} of {breakdown.total} tasks are complete ({done.percent}%), "
        f"with {in_prog.count} task(s) actively in progress. "
        f"The team completed {velocity_total} task(s) in the last 7 days."
    )


# ── Stats builders ────────────────────────────────────────────────────────────

def _build_task_breakdown(request: SummaryRequest) -> TaskBreakdown:
    tasks = request.tasks
    total = len(tasks)
    statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]
    by_status = {}
    for s in statuses:
        count = sum(1 for t in tasks if t.status == s)
        by_status[s] = TaskBreakdownStatus(
            count=count,
            percent=round(count / total * 100, 1) if total else 0.0,
        )

    priorities = ["P0", "P1", "P2"]
    by_priority = {}
    for p in priorities:
        open_c = sum(1 for t in tasks if t.priority == p and t.status != "DONE")
        done_c = sum(1 for t in tasks if t.priority == p and t.status == "DONE")
        by_priority[p] = {"open": open_c, "done": done_c}

    return TaskBreakdown(total=total, by_status=by_status, by_priority=by_priority)


def _build_upcoming_deadlines(request: SummaryRequest) -> list[DeadlineItem]:
    now = datetime.now(timezone.utc)
    items = []
    for t in request.tasks:
        if t.due_date and t.status != "DONE":
            due = _make_aware(t.due_date)
            days_left = (due - now).days
            items.append(DeadlineItem(
                task_id=t.task_id,
                title=t.title,
                due_date=due.date().isoformat(),
                days_left=days_left,
                priority=t.priority,
                status=t.status,
                is_overdue=days_left < 0,
            ))
    # Sort: overdue first, then soonest deadline
    items.sort(key=lambda x: x.days_left)
    return items[:5]  # Return at most 5


def _build_member_contributions(request: SummaryRequest) -> list[MemberContribution]:
    tasks = request.tasks
    contributions = []

    for member in request.members:
        assigned = [t for t in tasks if t.assignee_id == member.user_id]
        completed = [t for t in assigned if t.status == "DONE"]
        rate = round(len(completed) / len(assigned) * 100, 1) if assigned else 0.0

        contributions.append(MemberContribution(
            user_id=member.user_id,
            name=member.name,
            avatar_color=_avatar_colour(member.user_id),
            assigned=len(assigned),
            completed=len(completed),
            completion_rate=rate,
        ))

    # Sort by assigned tasks descending
    contributions.sort(key=lambda x: x.assigned, reverse=True)
    return contributions


# ── Main Entry Point ──────────────────────────────────────────────────────────

async def generate_summary(request: SummaryRequest) -> SummaryResponse:
    """
    Orchestrate the full summary generation pipeline:
        1. ML health scoring
        2. Rule-based insights detection
        3. Stats assembly (breakdown, velocity, deadlines, contributions)
        4. LLM narrative generation (with fallback)
        5. Assemble final SummaryResponse
    """
    # Step 1: ML health score
    health, daily, labels, trend = compute_health_score(request)

    # Step 2: Rule-based insights
    velocity_total = sum(daily)
    insights = build_insights(request, health, velocity_total, trend)

    # Step 3: Assemble pure stats
    breakdown = _build_task_breakdown(request)
    velocity = VelocityData(
        window_days=7,
        daily_completions=daily,
        labels=labels,
        total_this_week=velocity_total,
        trend=trend,
    )
    deadlines = _build_upcoming_deadlines(request)
    contributions = _build_member_contributions(request)

    # Step 4: LLM narrative (graceful fallback)
    summary_text = ""
    try:
        llm = _get_llm()
        prompt = _build_prompt(request, health, insights, breakdown, velocity_total, trend)
        response = await llm.ainvoke(prompt)
        summary_text = response.content.strip()
    except Exception as e:
        print(f"⚠️  LLM call failed — using fallback narrative. Error: {e}")
        traceback.print_exc()
        summary_text = _fallback_narrative(request, health, breakdown, velocity_total)

    # Step 5: Assemble final response
    return SummaryResponse(
        project_id=request.project_id,
        project_name=request.project_name,
        generated_at=datetime.now(timezone.utc),
        health_score=health,
        summary_text=summary_text,
        key_insights=insights,
        task_breakdown=breakdown,
        velocity=velocity,
        upcoming_deadlines=deadlines,
        member_contributions=contributions,
    )
