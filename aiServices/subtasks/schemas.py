from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional

class ProjectContext(BaseModel):
    project_name: str = Field(description="Name of the software project")
    project_description: Optional[str] = Field(default="", description="High-level description of the project stack and goals")
    existing_tasks: List[str] = Field(default=[], description="Titles of tasks already in the backlog to prevent duplication")

class AnalyzeRequest(BaseModel):
    projectId: str = Field(description="The unique identifier of the project")
    featureDescription: str = Field(description="The user-entered task or feature description to break down")
    context: Optional[ProjectContext] = Field(default=None, description="Enriched project details for context awareness")

class MCQ(BaseModel):
    question: str = Field(description="The multiple choice question to ask the user to clarify ambiguity.")
    options: List[str] = Field(description="A list of 3-4 distinct, realistic options for the user to choose from. One option should always be 'Other (please specify)'.")

class AnalyzeResponse(BaseModel):
    project_id: str
    reasoning_rationale: str = Field(description="A detailed chain-of-thought explanation of why these specific questions are necessary based on the provided input and tech stack context.")
    questions: List[MCQ] = Field(default=[], description="A list of 0 to 3 clarifying multiple-choice questions. If the input is already perfectly clear, this should be empty.")
    duration_ms: int = Field(default=0, description="Processing duration in milliseconds")

class AnswerContext(BaseModel):
    question: str = Field(description="The question that was asked")
    answer: str = Field(description="The answer provided by the user")

class TaskBreakdownRequest(BaseModel):
    projectId: str = Field(description="The unique identifier of the project")
    featureDescription: str = Field(description="The user-entered task or feature description to break down")
    context: Optional[ProjectContext] = Field(default=None, description="Enriched project details for context awareness")
    clarifying_answers: Optional[List[AnswerContext]] = Field(default=[], description="The user's answers to the clarifying questions, if any.")

class SubtaskItem(BaseModel):
    title: str = Field(description="A concise, actionable, verb-first title (e.g., 'Setup JWT authorization middleware')")
    description: str = Field(description="Detailed step-by-step description of what needs to be implemented, including specific files and configurations where applicable.")
    priority: str = Field(description="Priority rating: P0 (critical path), P1 (important), or P2 (low priority)", pattern="^(P0|P1|P2)$")
    labels: List[str] = Field(default=[], description="Relevant skill/context tags (e.g., 'frontend', 'backend', 'auth', 'database', 'testing')")

class TaskBreakdownResponse(BaseModel):
    project_id: str
    reasoning_rationale: str = Field(description="A detailed chain-of-thought explanation of why these specific subtasks were chosen, referencing the tech stack and user constraints.")
    feature_title: str = Field(description="A clean, normalized title for the parent feature.")
    subtasks: List[SubtaskItem] = Field(description="List of 4 to 5 actionable subtasks to implement the feature.")
    duration_ms: int = Field(default=0, description="Processing duration in milliseconds")
