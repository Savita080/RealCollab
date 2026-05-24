"""
insights_builder.py — Rule-based engine for generating Key Insights.

Detects concrete, actionable issues and positive signals from task data
without needing an LLM. The LLM in report_generator.py then uses these
as structured context to produce its narrative.

Insight Types:
    blocker  — critical issues that need immediate action (🔴)
    warning  — things that need attention soon              (🟡)
    positive — things going well                           (🟢)

Rules (in priority order):
    1. BLOCKER: overdue P0/P1 tasks
    2. BLOCKER: all tasks blocked in IN_REVIEW (none moving to DONE)
    3. WARNING: stale IN_PROGRESS tasks (> threshold days)
    4. WARNING: high P0/P1 open ratio
    5. WARNING: no tasks completed this week (velocity = 0)
    6. POSITIVE: velocity trending up
    7. POSITIVE: completion rate ≥ 80%
    8. POSITIVE: no overdue tasks
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from config import settings
from schemas import KeyInsight, SummaryRequest, HealthScore


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def build_insights(
    request: SummaryRequest,
    health: HealthScore,
    velocity_total: int,
    trend: str,
) -> list[KeyInsight]:
    """
    Generate a prioritised list of Key Insights from task data.

    Returns up to 5 insights: blockers first, then warnings, then positives.
    Always returns at least 1 insight (fallback positive or neutral).
    """
    now = _now()
    tasks = request.tasks
    insights: list[KeyInsight] = []

    # ── Pre-compute useful sets ────────────────────────────────────────────────
    open_tasks = [t for t in tasks if t.status != "DONE"]
    in_progress = [t for t in tasks if t.status == "IN_PROGRESS"]
    in_review = [t for t in tasks if t.status == "IN_REVIEW"]
    done_tasks = [t for t in tasks if t.status == "DONE"]
    stale_threshold = timedelta(days=settings.STALE_DAYS_THRESHOLD)

    # Tasks with due dates that are overdue
    overdue = [
        t for t in open_tasks
        if t.due_date and _make_aware(t.due_date) < now
    ]
    overdue_critical = [t for t in overdue if t.priority in ("P0", "P1")]
    stale_tasks = [
        t for t in in_progress
        if (now - _make_aware(t.updated_at)) > stale_threshold
    ]
    high_prio_open = [t for t in open_tasks if t.priority in ("P0", "P1")]
    total = len(tasks)
    completion_pct = (len(done_tasks) / total * 100) if total else 100

    # ── BLOCKERS ──────────────────────────────────────────────────────────────

    # Rule 1: Overdue critical tasks
    if overdue_critical:
        names = ", ".join(t.title for t in overdue_critical[:2])
        suffix = f" (+{len(overdue_critical) - 2} more)" if len(overdue_critical) > 2 else ""
        insights.append(KeyInsight(
            type="blocker",
            icon="🔴",
            title=f"{len(overdue_critical)} High-Priority Task{'s' if len(overdue_critical) > 1 else ''} Overdue",
            detail=f"{names}{suffix}",
        ))

    # Rule 2: Tasks stuck in IN_REVIEW (review bottleneck)
    if len(in_review) >= 2:
        insights.append(KeyInsight(
            type="blocker",
            icon="🔴",
            title=f"{len(in_review)} Tasks Awaiting Review",
            detail="Multiple tasks are blocked in IN_REVIEW — consider scheduling a review session",
        ))

    # ── WARNINGS ──────────────────────────────────────────────────────────────

    # Rule 3: Stale IN_PROGRESS tasks
    if stale_tasks:
        names = stale_tasks[0].title
        count = len(stale_tasks)
        insights.append(KeyInsight(
            type="warning",
            icon="🟡",
            title=f"{count} Task{'s' if count > 1 else ''} Stale in In-Progress",
            detail=f'"{names}" has had no updates for over {settings.STALE_DAYS_THRESHOLD} days',
        ))

    # Rule 4: Heavy P0/P1 open load
    if len(open_tasks) > 0:
        high_ratio = len(high_prio_open) / len(open_tasks)
        if high_ratio >= 0.5 and len(high_prio_open) >= 2 and not overdue_critical:
            insights.append(KeyInsight(
                type="warning",
                icon="🟡",
                title=f"{len(high_prio_open)} High-Priority Tasks Still Open",
                detail=f"{round(high_ratio * 100)}% of open tasks are P0 or P1 — prioritise accordingly",
            ))

    # Rule 5: Zero velocity (no tasks completed this week)
    if velocity_total == 0 and len(open_tasks) > 0:
        insights.append(KeyInsight(
            type="warning",
            icon="🟡",
            title="No Tasks Completed This Week",
            detail="Consider reviewing blockers or reassigning tasks to unblock the team",
        ))

    # ── POSITIVES ─────────────────────────────────────────────────────────────

    # Rule 6: Velocity trending up
    if trend == "up" and velocity_total > 0:
        insights.append(KeyInsight(
            type="positive",
            icon="🟢",
            title="Velocity Trending Up",
            detail=f"{velocity_total} tasks completed this week — the team is building momentum",
        ))

    # Rule 7: High completion rate
    if completion_pct >= 80 and total >= 3:
        insights.append(KeyInsight(
            type="positive",
            icon="🟢",
            title=f"{round(completion_pct)}% Tasks Complete",
            detail="Project is nearing completion — great execution by the team",
        ))

    # Rule 8: No overdue tasks (and has due dates set)
    tasks_with_dates = [t for t in open_tasks if t.due_date]
    if tasks_with_dates and not overdue:
        insights.append(KeyInsight(
            type="positive",
            icon="🟢",
            title="All Deadlines On Track",
            detail="No tasks are past their due date — the team is keeping to schedule",
        ))

    # ── Fallback: if somehow nothing triggered ────────────────────────────────
    if not insights:
        if total == 0:
            insights.append(KeyInsight(
                type="positive",
                icon="🟢",
                title="Project Is Set Up",
                detail="Start creating tasks to track progress and generate deeper insights",
            ))
        else:
            insights.append(KeyInsight(
                type="positive",
                icon="🟢",
                title="Project Is Progressing",
                detail=f"Health score is {health.score}/100 — keep up the momentum",
            ))

    # Return at most 5 insights, blockers first (already sorted by rule order)
    return insights[:5]
