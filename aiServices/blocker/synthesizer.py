"""
gemini_synthesizer.py — Step 4: AI diagnosis synthesis via Gemini.

Called only after a task has been confirmed blocked through Steps 1–3.
Receives the full context (stall stats, dominant blocker category, sentiment,
bottleneck user, dependency severity) and produces a single human-readable
sentence: what is blocked + concrete action step.
"""
from __future__ import annotations

from typing import List, Optional



from config import settings
from schemas import CommentPayload

from openai import OpenAI
_client = OpenAI(
    api_key=settings.GROK_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

_SYSTEM_PROMPT = (
    "You are a senior Project Management assistant for a software development team. "
    "Analyse the task information provided and produce exactly ONE concise sentence "
    "that: (1) identifies the specific blocker, and (2) suggests a concrete action step. "
    "Do NOT use bullet points or headings. Reply with nothing except that single sentence."
)


def _build_prompt(
    title: str,
    description: Optional[str],
    priority: str,
    assignee_name: Optional[str],
    duration_hours: float,
    urgency_score: float,
    dominant_category: Optional[str],
    sentiment_score: Optional[float],
    negative_comments: List[CommentPayload],
    bottleneck_user: Optional[str],
    dependency_in_degree: int,
    severity_multiplier: float,
) -> str:
    lines = [
        f"Task: '{title}'",
        f"Priority: {priority}",
        f"Assignee: {assignee_name or 'Unassigned'}",
        f"Time in progress: {duration_hours:.1f} hours",
        f"Urgency score: {urgency_score:.2f} / 1.00",
    ]

    if description:
        lines.append(f"Description: {description[:300]}")

    if dominant_category:
        lines.append(f"Likely blocker type: {dominant_category}")

    if sentiment_score is not None:
        label = (
            "highly negative" if sentiment_score < -0.5
            else "negative" if sentiment_score < -0.2
            else "neutral" if sentiment_score < 0.2
            else "positive"
        )
        lines.append(f"Team sentiment: {label} ({sentiment_score:.2f})")

    if bottleneck_user:
        lines.append(
            f"Most mentioned person in frustrated comments (likely resource bottleneck): @{bottleneck_user}"
        )

    if dependency_in_degree > 0:
        lines.append(
            f"Critical path warning: {dependency_in_degree} other task(s) are blocked "
            f"waiting on this task (severity multiplier: {severity_multiplier:.1f}x). "
            "Resolving this unblocks the entire dependency chain."
        )

    if negative_comments:
        lines.append("\nFrustrated / blocked comments:")
        for c in negative_comments[-6:]:
            lines.append(f"  - @{c.author_name}: '{c.content[:200]}'")
    else:
        lines.append("\nNo negative comments recorded.")

    return "\n".join(lines)


def synthesize_diagnosis(
    title: str,
    description: Optional[str],
    priority: str,
    assignee_name: Optional[str],
    duration_hours: float,
    urgency_score: float,
    dominant_category: Optional[str],
    sentiment_score: Optional[float],
    negative_comments: List[CommentPayload],
    bottleneck_user: Optional[str] = None,
    dependency_in_degree: int = 0,
    severity_multiplier: float = 1.0,
) -> Optional[str]:
    """
    Call Gemini to produce a 1-sentence diagnosis + action plan.
    Returns None if the API key is missing; returns an error string on failure
    so the rest of the analysis result is never discarded.
    """
    if not settings.GROK_API_KEY:
        return None

    prompt = _build_prompt(
        title=title,
        description=description,
        priority=priority,
        assignee_name=assignee_name,
        duration_hours=duration_hours,
        urgency_score=urgency_score,
        dominant_category=dominant_category,
        sentiment_score=sentiment_score,
        negative_comments=negative_comments,
        bottleneck_user=bottleneck_user,
        dependency_in_degree=dependency_in_degree,
        severity_multiplier=severity_multiplier,
    )

    try:
        response = _client.chat.completions.create(
        model=settings.GROK_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.3,
        max_tokens=120,
        )
        return response.choices[0].message.content.strip().split("\n")[0].strip()
    except Exception as exc:
        return f"[Gemini unavailable: {type(exc).__name__}]"
