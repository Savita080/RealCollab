"""
schemas.py — Pydantic request / response models for the Standup Report API.

This file defines the contract between the Node.js backend and this Python service.
The Node backend is responsible for querying MongoDB and assembling the payload;
this service is a pure compute / LLM layer that never touches the database directly.

The schemas are split into three sections:
  1. INBOUND:  What the Node backend sends us (project data, messages, activity, etc.)
  2. INTERNAL: Intermediate data structures used during processing
  3. OUTBOUND: What we return (the final standup report)
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1: INBOUND SCHEMAS  (Node backend → Python service)
# ══════════════════════════════════════════════════════════════════════════════


class TaskData(BaseModel):
    """
    A single task that was modified in the last 24 hours.

    The Node backend filters tasks by `updatedAt >= 24h ago` before sending.
    We receive the current status plus the activity log tells us what changed.
    """
    task_id: str = Field(..., description="MongoDB ObjectId as string")
    title: str
    status: str = Field(..., description="Current status: TODO | IN_PROGRESS | IN_REVIEW | DONE")
    priority: str = Field(..., description="P0 | P1 | P2")
    assignee_name: Optional[str] = None
    updated_at: datetime


class ActivityLogEntry(BaseModel):
    """
    A single entry from the ActivityLog collection.

    These tell us WHO did WHAT and WHEN — the backbone of the standup report.
    Examples of `action`: CREATED_TASK, MOVED_TASK, COMPLETED_TASK, UPDATED_WIKI, etc.
    """
    user_name: str
    action: str
    target_name: str = Field(default="", description="Name of the affected entity (task title, wiki page, etc.)")
    created_at: datetime


class ChatMessage(BaseModel):
    """
    A single message from the project's group chat.

    We receive the raw messages and use AI (MapReduce summarisation) to distil
    them into a concise summary for the standup report.
    """
    sender_name: str
    content: str
    created_at: datetime


class WikiChange(BaseModel):
    """
    A version snapshot created for a wiki page in the last 24 hours.

    Each time someone saves a wiki page with a commit message (≥10 chars),
    a WikiPageVersion is created. We summarise these commit messages.
    """
    page_title: str
    saved_by_name: str
    commit_message: str = Field(default="Auto-saved version")
    created_at: datetime


class WhiteboardChange(BaseModel):
    """
    A whiteboard that was created or modified in the last 24 hours.

    We only know the name and when it was last updated — no version history
    exists for whiteboards (they store Excalidraw JSON blobs).
    """
    name: str
    is_new: bool = Field(default=False, description="True if created in the last 24h")
    updated_at: datetime


class MemberChange(BaseModel):
    """
    A user who was added to a project or workspace in the last 24 hours.

    Detected by checking `joinedAt >= 24h ago` on the members subdocument.
    """
    user_name: str
    role: str
    joined_at: datetime


class RoleChangeEntry(BaseModel):
    """
    A role change event detected from the Notification model.

    The Notification model has type='ROLE_CHANGE' with the details in `content`.
    """
    user_name: str
    new_role: str
    content: str = Field(default="", description="Human-readable description of the change")
    created_at: datetime


class ProjectPayload(BaseModel):
    """
    All data for a single project, pre-assembled by the Node backend.

    This is the atomic unit of standup generation — we generate one report
    section per project, then combine them for the user's personalised view.
    """
    project_id: str
    project_name: str
    user_role_in_project: str = Field(
        ..., description="The requesting user's role: CONTRIBUTOR | VIEWER"
    )
    tasks_moved: List[TaskData] = []
    activity_logs: List[ActivityLogEntry] = []
    chat_messages: List[ChatMessage] = []
    wiki_changes: List[WikiChange] = []
    whiteboard_changes: List[WhiteboardChange] = []
    new_members: List[MemberChange] = []
    role_changes: List[RoleChangeEntry] = []


class WorkspaceData(BaseModel):
    """
    Workspace-level data only included for ADMIN/OWNER reports.

    This gives the bird's-eye view: who joined, who got new roles, etc.
    """
    new_members: List[MemberChange] = []
    role_changes: List[RoleChangeEntry] = []


class StandupRequest(BaseModel):
    """
    The top-level request body sent by the Node backend.

    Contains the user's workspace role (determines report type) and
    all project payloads. The Node backend handles the MongoDB queries
    and assembles everything into this structure.
    """
    user_workspace_role: str = Field(
        ..., description="OWNER | ADMIN | MEMBER | VIEWER"
    )
    user_name: str
    workspace_name: str = ""
    projects: List[ProjectPayload] = []
    workspace_data: Optional[WorkspaceData] = None


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2: INTERNAL / INTERMEDIATE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════


class ActivityPulse(BaseModel):
    """
    The Activity Pulse score for a single project.

    This is a weighted aggregate of three activity signals:
      - Chat messages (weight: 0.2)
      - Task movements (weight: 0.4)
      - Wiki/doc edits (weight: 0.4)

    Each raw count is normalised using an exponential saturation function:
      sub_score = 100 * (1 - e^(-k * count))

    The final score is: Σ(weight_i * sub_score_i), ranging from 0 to 100.
    """
    score: float = Field(..., ge=0, le=100, description="Aggregated pulse score (0-100)")

    # Raw counts (what actually happened)
    chat_count: int = Field(..., description="Number of chat messages in last 24h")
    task_count: int = Field(..., description="Number of tasks moved in last 24h")
    wiki_count: int = Field(..., description="Number of wiki edits in last 24h")

    # Weighted contributions (how each signal contributed to the final score)
    chat_weighted: float = Field(..., description="Chat contribution after weight: 0.2 * sub_score")
    task_weighted: float = Field(..., description="Task contribution after weight: 0.4 * sub_score")
    wiki_weighted: float = Field(..., description="Wiki contribution after weight: 0.4 * sub_score")


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3: OUTBOUND SCHEMAS  (Python service → Node backend → Frontend)
# ══════════════════════════════════════════════════════════════════════════════


class ProjectContributorReport(BaseModel):
    """
    Detailed report for a CONTRIBUTOR in a specific project.

    Contains granular information: which tasks moved, chat summary,
    wiki changes, whiteboard updates, and team membership changes.
    """
    project_name: str
    tasks_summary: str = Field(
        ..., description="Markdown table of tasks moved: | Task | Who | Change |"
    )
    chat_summary: str = Field(
        ..., description="AI-generated summary of group chat (3-5 bullet points)"
    )
    wiki_summary: str = Field(
        ..., description="Summary of documentation changes from commit messages"
    )
    whiteboard_summary: str = Field(
        ..., description="List of new/modified whiteboards"
    )
    member_changes: str = Field(
        ..., description="New members added + role changes in this project"
    )
    activity_pulse: ActivityPulse


class ProjectAdminReport(BaseModel):
    """
    High-level report for an ADMIN/OWNER viewing a single project.

    Intentionally concise — admins don't need granular details,
    just the pulse score, task count, and 2-3 line highlights.
    """
    project_name: str
    activity_pulse: ActivityPulse
    tasks_moved_count: int
    key_highlights: str = Field(
        ..., description="AI-generated 2-3 line summary of project activity"
    )


class StandupResponse(BaseModel):
    """
    The final standup report returned to the frontend.

    This is a UNION type — either `project_reports` (admin) or
    `contributor_reports` (contributor) will be populated, never both.

    The frontend reads `report_type` to decide which rendering path to use.
    """
    report_type: str = Field(..., description="'admin' | 'contributor'")
    generated_at: datetime
    greeting: str = Field(
        ..., description="Personalised greeting, e.g. 'Good morning, Savita!'"
    )

    # ── Admin/Owner fields ────────────────────────────────────────────────────
    workspace_summary: Optional[str] = Field(
        default=None,
        description="AI-generated bird's-eye summary of the entire workspace"
    )
    new_workspace_members: Optional[List[str]] = Field(
        default=None,
        description="List of new members who joined the workspace in last 24h"
    )
    role_changes_summary: Optional[str] = Field(
        default=None,
        description="Summary of role changes across all projects"
    )
    project_reports: Optional[List[ProjectAdminReport]] = Field(
        default=None,
        description="Per-project admin reports, sorted by activity pulse (highest first)"
    )

    # ── Contributor fields ────────────────────────────────────────────────────
    contributor_reports: Optional[List[ProjectContributorReport]] = Field(
        default=None,
        description="Per-project detailed reports for the contributor's assigned projects"
    )

    # ── Meta ──────────────────────────────────────────────────────────────────
    duration_ms: int = Field(default=0, description="Total processing time in milliseconds")
