"""
schemas.py — Pydantic v2 request/response models for the Project Summary service.

Input (assembled by Node.js backend):
    SummaryRequest — full project snapshot with all tasks + member data

Output (returned to Node.js → Frontend):
    SummaryResponse — health score, AI narrative, insights, stats, velocity, deadlines
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Input Models ─────────────────────────────────────────────────────────────

class TaskPayload(BaseModel):
    """A single task from the project."""
    task_id: str
    title: str
    status: Literal["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]
    priority: Literal["P0", "P1", "P2"]
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None


class MemberPayload(BaseModel):
    """A project member."""
    user_id: str
    name: str
    role: str


class SummaryRequest(BaseModel):
    """Full payload sent from Node.js backend to this service."""
    project_id: str
    project_name: str
    project_description: str = ""
    tasks: list[TaskPayload] = Field(default_factory=list)
    members: list[MemberPayload] = Field(default_factory=list)
    requested_at: datetime = Field(default_factory=datetime.utcnow)


# ── Output Models ─────────────────────────────────────────────────────────────

class SignalScore(BaseModel):
    """Individual ML signal score with human-readable context."""
    score: float        # actual points earned for this signal
    max_score: float    # maximum possible points for this signal
    value: str          # human-readable value e.g. "8/14 done"
    percent: float      # score / max_score * 100


class HealthScore(BaseModel):
    """ML-computed project health score with full breakdown."""
    score: int                          # 0–100 overall
    band: str                           # "On Track" | "Needs Attention" | "At Risk"
    color: str                          # "green" | "amber" | "red"
    breakdown: dict[str, SignalScore]   # per-signal details


class KeyInsight(BaseModel):
    """A single insight card — blocker, warning, or positive signal."""
    type: Literal["blocker", "warning", "positive"]
    icon: str           # emoji e.g. "🔴"
    title: str
    detail: str


class TaskBreakdownStatus(BaseModel):
    count: int
    percent: float


class TaskBreakdown(BaseModel):
    """Task counts grouped by status and priority."""
    total: int
    by_status: dict[str, TaskBreakdownStatus]
    by_priority: dict[str, dict[str, int]]


class VelocityData(BaseModel):
    """7-day task completion velocity."""
    window_days: int = 7
    daily_completions: list[int]        # index 0 = 7 days ago, index 6 = today
    labels: list[str]                   # ["Mon", "Tue", ...]
    total_this_week: int
    trend: Literal["up", "down", "flat"]


class DeadlineItem(BaseModel):
    """An upcoming task deadline."""
    task_id: str
    title: str
    due_date: str           # ISO date string
    days_left: int          # negative = overdue
    priority: str
    status: str
    is_overdue: bool


class MemberContribution(BaseModel):
    """Per-member task contribution stats."""
    user_id: str
    name: str
    avatar_color: str       # deterministic color from user_id hash
    assigned: int
    completed: int
    completion_rate: float  # 0–100


class SummaryResponse(BaseModel):
    """Full AI summary response returned to the frontend."""
    project_id: str
    project_name: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: int = 0

    # ML section
    health_score: HealthScore

    # AI/LLM sections
    summary_text: str
    key_insights: list[KeyInsight]

    # Pure stats sections
    task_breakdown: TaskBreakdown
    velocity: VelocityData
    upcoming_deadlines: list[DeadlineItem]
    member_contributions: list[MemberContribution]
