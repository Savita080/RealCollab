from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional

class ProjectContext(BaseModel):
    project_name: str = Field(description="Name of the software project")
    project_description: Optional[str] = Field(default="", description="High-level description of the project stack and goals")
    existing_tasks: List[str] = Field(default=[], description="Titles of tasks already in the backlog to prevent duplication")

class TaskBreakdownRequest(BaseModel):
    projectId: str = Field(description="The unique identifier of the project")
    featureDescription: str = Field(description="The user-entered task or feature description to break down")
    context: Optional[ProjectContext] = Field(default=None, description="Enriched project details for context awareness")

class SubtaskItem(BaseModel):
    title: str = Field(description="A concise, actionable, verb-first title (e.g., 'Setup JWT authorization middleware')")
    description: str = Field(description="Detailed step-by-step description of what needs to be implemented, including specific files and configurations where applicable.")
    priority: str = Field(description="Priority rating: P0 (critical path), P1 (important), or P2 (low priority)", pattern="^(P0|P1|P2)$")
    labels: List[str] = Field(default=[], description="Relevant skill/context tags (e.g., 'frontend', 'backend', 'auth', 'database', 'testing')")

class TaskBreakdownResponse(BaseModel):
    project_id: str
    feature_title: str = Field(description="A clean, normalized title for the parent feature.")
    subtasks: List[SubtaskItem] = Field(description="List of 4 to 5 actionable subtasks to implement the feature.")
    duration_ms: int = Field(default=0, description="Processing duration in milliseconds")
