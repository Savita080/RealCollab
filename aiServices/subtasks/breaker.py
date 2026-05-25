from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate
from config import settings
from schemas import TaskBreakdownRequest, TaskBreakdownResponse, AnalyzeRequest, AnalyzeResponse

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

CONTEXT ENRICHMENT & HALLUCINATION PREVENTION:
- Use the provided Project Context (tech stack, goals, existing tasks) to make your task breakdown highly specific to this project's code patterns. 
- DO NOT generate tasks that duplicate existing tasks.
- DO NOT invent technologies, frameworks, or languages that are not explicitly mentioned in the Project Context.
- If the feature description is entirely unrelated to software engineering, return a single subtask asking the user to provide a valid technical request.
- Always provide a detailed `reasoning_rationale` explaining your choices BEFORE generating the subtasks.

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
        
        Clarifying Answers from User: {clarifyingAnswers}
        
        Generate your chain-of-thought rationale followed by exactly 4 to 5 structured subtasks:""")
    ])

ANALYSIS_SYSTEM_PROMPT = """You are a Technical Product Manager.
Your job is to analyze a user's feature request and determine if it is too vague or lacks critical technical details (like architectural choices, UI/UX flows, or specific features to include).

If the request is ambiguous, generate 1 to 3 multiple-choice clarifying questions. 
If the request is already perfectly detailed and unambiguous, return an empty list of questions.

Each question should have 3-4 realistic options, and one option should ALWAYS be 'Other (please specify)'.

HALLUCINATION PREVENTION:
- Ground your questions entirely on the tech stack mentioned in the Project Context.
- Do not ask questions about frameworks if they are already specified.
- Provide a `reasoning_rationale` explaining why you need this information before generating the questions.
"""

def get_analysis_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([
        ("system", ANALYSIS_SYSTEM_PROMPT),
        ("human", """Analyze the following feature request for ambiguity:
        
        Feature Description: {featureDescription}
        
        Project Name: {projectName}
        Project Description: {projectDescription}
        Existing Tasks: {existingTasks}
        
        If needed, generate clarifying multiple-choice questions:""")
    ])
