"""
schemas.py — Pydantic request / response models for the Blockage Identifier API.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ── Inbound payload from Node backend ─────────────────────────────────────────

class CommentPayload(BaseModel):
    """A single task comment as sent by the Node backend."""
    _id: str
    author_id: str
    author_name: str
    content: str
    created_at: datetime


class TaskPayload(BaseModel):
    """
    The Node backend collects the task + its comments for a given project
    and POSTs this payload to POST /analyse.
    """
    task_id: str = Field(..., description="MongoDB ObjectId of the task as string")
    title: str
    description: Optional[str] = ""
    status: str                          # TODO | IN_PROGRESS | IN_REVIEW | DONE
    priority: str                        # P0 | P1 | P2
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[datetime] = None
    labels: List[str] = []
    created_at: datetime
    updated_at: datetime
    comments: List[CommentPayload] = []

    # Optional: list of task_ids this task depends on (for DAG severity boost).
    # The Node backend can populate this from task metadata if available.
    # If left empty, the DAG step is skipped for this task.
    depends_on: List[str] = []


class AnalyseProjectRequest(BaseModel):
    """
    Full request body for POST /analyse  (Option 2: manual "Find Bottleneck" trigger).

    The Node backend sends:
      - active_tasks:     all IN_PROGRESS tasks to analyse
      - historical_tasks: DONE/IN_REVIEW tasks used to build the log-normal baseline
    """
    project_id: str
    project_name: str
    active_tasks: List[TaskPayload]
    historical_tasks: List[TaskPayload] = []


# ── Outbound response shapes ───────────────────────────────────────────────────

class BlockageCategory(BaseModel):
    """Result of semantic cosine-similarity classification."""
    category: str                        # "access" | "dependency" | "requirements"
    similarity_score: float
    is_blocked: bool


class MentionNode(BaseModel):
    user_id: str
    user_name: str
    in_degree: int   # times mentioned inside negative/blocked comments → resource bottleneck
    out_degree: int  # times this user tags others inside negative comments → person who is stuck


class TaskAnalysisResult(BaseModel):
    task_id: str
    title: str
    priority: str
    status: str
    assignee_id: Optional[str]
    assignee_name: Optional[str]

    # ── Step 1: Statistical stall detection ──────────────────────────────────
    duration_hours: float
    is_stalled: bool
    stall_method: str                    # "log_normal" | "static_fallback"
    urgency_score: float                 # 0–1 exponential decay
    percentile_rank: Optional[float]     # 0–100; None when no history

    # ── Step 2: Semantic NLP on comments ─────────────────────────────────────
    blocker_categories: List[BlockageCategory]
    dominant_category: Optional[str]
    sentiment_score: Optional[float]     # VADER compound avg across all comments
    has_negative_sentiment: bool
    # The subset of comments that were classified as negative — fed to graph step
    negative_comments: List[CommentPayload]

    # ── Step 3: Mention graph (built on negative comments only) ──────────────
    mentioned_users: List[MentionNode]
    bottleneck_user: Optional[MentionNode]  # highest in-degree within this task

    # ── Step 4: DAG severity boost + AI synthesis ─────────────────────────────
    dependency_in_degree: int            # how many active tasks depend on this task
    severity_multiplier: float           # 2.0 if on critical path, else 1.0
    ai_diagnosis: Optional[str]          # Gemini 1-sentence diagnosis + action

    # ── Meta ─────────────────────────────────────────────────────────────────
    analysis_timestamp: datetime


class ProjectAnalysisResponse(BaseModel):
    project_id: str
    project_name: str
    total_active_tasks: int
    stalled_tasks_count: int
    # Sorted by (severity_multiplier * urgency_score) descending
    results: List[TaskAnalysisResult]
    # Person most mentioned across ALL negative comments in ALL stalled tasks
    global_bottleneck_user: Optional[MentionNode]
    analysis_timestamp: datetime
    duration_ms: int