from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate
from config import settings
from schemas import TaskBreakdownRequest, TaskBreakdownResponse

SYSTEM_PROMPT = """You are a Principal Software Architect and Technical Product Owner.
Your task is to decompose a high-level feature description into exactly 4 to 5 granular, highly actionable developer tasks.

Each task must:
1. Have a concise, verb-first title (e.g. "Configure Express session store" instead of "Database setup").
2. Have a detailed description specifying the technical files, patterns, or directories involved, keeping in mind the project tech stack.
3. Be assigned a realistic priority:
   - P0: Critical infrastructure or backend core logic.
   - P1: Primary user-facing elements or crucial integrations.
   - P2: UX polish, styling, or secondary validation.
4. Have accurate labels matching the context (e.g., "frontend", "backend", "database", "auth", "testing").

CONTEXT ENRICHMENT:
Use the provided Project Context (tech stack, goals, existing tasks) to make your task breakdown highly specific to this project's code patterns. DO NOT generate tasks that duplicate existing tasks.

You must output your response in absolute, structurally valid JSON matching the exact schema provided by the system.
"""

def get_task_breaker_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", """Decompose the following feature request:
        
        Feature Description: {featureDescription}
        
        Project Name: {projectName}
        Project Description: {projectDescription}
        Existing Tasks (Avoid duplicates): {existingTasks}
        
        Generate exactly 4 to 5 subtasks as structured JSON:""")
    ])
