"""
health_scorer.py — ML weighted scoring engine for project health.

This is a PURE PYTHON module — no external ML library needed.
It implements a weighted multi-signal model that scores a project 0–100
based on 5 signals derived from task data.

Signal weights (configurable via config.py / .env):
    1. Task Completion Rate  — 35 pts  (% tasks in DONE)
    2. Overdue Task Penalty  — 25 pts  (tasks past dueDate not done)
    3. Velocity Score        — 20 pts  (tasks moved to DONE in last 7 days)
    4. Priority Balance      — 10 pts  (ratio of open P0/P1 to total open)
    5. Stale Task Penalty    — 10 pts  (tasks stuck IN_PROGRESS > N days)

Health Bands:
    80–100 → On Track  (green)
    50–79  → Needs Attention (amber)
    0–49   → At Risk   (red)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from config import settings
from schemas import HealthScore, SignalScore, SummaryRequest


# ── Avatar colour palette (deterministic by user_id hash) ────────────────────
_AVATAR_COLOURS = [
    "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b",
    "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
]


def _avatar_colour(user_id: str) -> str:
    """Return a stable colour for a user based on their ID."""
    return _AVATAR_COLOURS[hash(user_id) % len(_AVATAR_COLOURS)]


# ── Helper: UTC-aware now ─────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (assume UTC if naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ── Signal 1: Task Completion Rate ────────────────────────────────────────────

def _score_completion_rate(tasks: list) -> SignalScore:
    """
    Score = (done_tasks / total_tasks) * max_weight

    Edge case: 0 tasks → perfect score (nothing to fail on).
    """
    total = len(tasks)
    if total == 0:
        return SignalScore(
            score=settings.WEIGHT_COMPLETION_RATE,
            max_score=settings.WEIGHT_COMPLETION_RATE,
            value="No tasks yet",
            percent=100.0,
        )

    done = sum(1 for t in tasks if t.status == "DONE")
    ratio = done / total
    score = ratio * settings.WEIGHT_COMPLETION_RATE

    return SignalScore(
        score=round(score, 2),
        max_score=settings.WEIGHT_COMPLETION_RATE,
        value=f"{done}/{total} done ({round(ratio * 100)}%)",
        percent=round(ratio * 100, 1),
    )


# ── Signal 2: Overdue Task Penalty ────────────────────────────────────────────

def _score_overdue_penalty(tasks: list) -> SignalScore:
    """
    Score = max_weight * (1 - overdue_ratio)

    overdue_ratio = overdue_tasks / tasks_with_due_dates
    Tasks without due dates are excluded from this signal.
    """
    now = _now()
    tasks_with_dates = [
        t for t in tasks
        if t.due_date is not None and t.status != "DONE"
    ]

    if not tasks_with_dates:
        # No due dates set — no penalty, but also not a bonus
        return SignalScore(
            score=settings.WEIGHT_OVERDUE_PENALTY,
            max_score=settings.WEIGHT_OVERDUE_PENALTY,
            value="No due dates set",
            percent=100.0,
        )

    overdue = sum(
        1 for t in tasks_with_dates
        if _make_aware(t.due_date) < now
    )
    ratio = overdue / len(tasks_with_dates)
    score = (1 - ratio) * settings.WEIGHT_OVERDUE_PENALTY

    return SignalScore(
        score=round(score, 2),
        max_score=settings.WEIGHT_OVERDUE_PENALTY,
        value=f"{overdue} overdue of {len(tasks_with_dates)} dated tasks",
        percent=round((1 - ratio) * 100, 1),
    )


# ── Signal 3: 7-Day Velocity Score ────────────────────────────────────────────

def _score_velocity(tasks: list) -> tuple[SignalScore, list[int], list[str], str]:
    """
    Score = min(max_weight, completed_this_week / expected_weekly_rate * max_weight)

    Expected weekly rate = 20% of total tasks (reasonable baseline).
    Also returns daily_completions array and trend for the VelocityData model.
    """
    now = _now()
    week_ago = now - timedelta(days=7)

    # Build daily completions array (index 0 = 7 days ago, index 6 = today)
    daily = [0] * 7
    labels = []
    for i in range(7):
        day = week_ago + timedelta(days=i)
        labels.append(day.strftime("%a"))  # "Mon", "Tue", ...

    for t in tasks:
        if t.status == "DONE":
            updated = _make_aware(t.updated_at)
            if week_ago <= updated <= now:
                days_ago = (now - updated).days
                idx = 6 - days_ago
                if 0 <= idx <= 6:
                    daily[idx] += 1

    total_this_week = sum(daily)
    total_tasks = len(tasks) or 1
    expected = max(1, total_tasks * 0.20)  # 20% of tasks per week baseline

    ratio = min(1.0, total_this_week / expected)
    score = ratio * settings.WEIGHT_VELOCITY

    # Determine trend: compare first half vs second half of the week
    first_half = sum(daily[:3])
    second_half = sum(daily[4:])
    if second_half > first_half:
        trend = "up"
    elif second_half < first_half:
        trend = "down"
    else:
        trend = "flat"

    signal = SignalScore(
        score=round(score, 2),
        max_score=settings.WEIGHT_VELOCITY,
        value=f"{total_this_week} tasks completed this week",
        percent=round(ratio * 100, 1),
    )
    return signal, daily, labels, trend


# ── Signal 4: Priority Balance ────────────────────────────────────────────────

def _score_priority_balance(tasks: list) -> SignalScore:
    """
    Score = max_weight * (1 - high_priority_open_ratio)

    high_priority_open_ratio = open P0+P1 tasks / total open tasks
    High ratio of P0/P1 open tasks = bad (these are critical and unfinished).
    """
    open_tasks = [t for t in tasks if t.status != "DONE"]

    if not open_tasks:
        return SignalScore(
            score=settings.WEIGHT_PRIORITY_BALANCE,
            max_score=settings.WEIGHT_PRIORITY_BALANCE,
            value="No open tasks",
            percent=100.0,
        )

    high_priority_open = sum(
        1 for t in open_tasks if t.priority in ("P0", "P1")
    )
    ratio = high_priority_open / len(open_tasks)
    score = (1 - ratio) * settings.WEIGHT_PRIORITY_BALANCE

    return SignalScore(
        score=round(score, 2),
        max_score=settings.WEIGHT_PRIORITY_BALANCE,
        value=f"{high_priority_open} open P0/P1 of {len(open_tasks)} open tasks",
        percent=round((1 - ratio) * 100, 1),
    )


# ── Signal 5: Stale Task Penalty ──────────────────────────────────────────────

def _score_stale_penalty(tasks: list) -> SignalScore:
    """
    Score = max_weight * (1 - stale_ratio)

    stale_ratio = tasks IN_PROGRESS for > STALE_DAYS_THRESHOLD days / IN_PROGRESS tasks
    """
    now = _now()
    in_progress = [t for t in tasks if t.status == "IN_PROGRESS"]

    if not in_progress:
        return SignalScore(
            score=settings.WEIGHT_STALE_PENALTY,
            max_score=settings.WEIGHT_STALE_PENALTY,
            value="No in-progress tasks",
            percent=100.0,
        )

    threshold = timedelta(days=settings.STALE_DAYS_THRESHOLD)
    stale = sum(
        1 for t in in_progress
        if (now - _make_aware(t.updated_at)) > threshold
    )
    ratio = stale / len(in_progress)
    score = (1 - ratio) * settings.WEIGHT_STALE_PENALTY

    return SignalScore(
        score=round(score, 2),
        max_score=settings.WEIGHT_STALE_PENALTY,
        value=f"{stale} stale (>{settings.STALE_DAYS_THRESHOLD}d) of {len(in_progress)} in-progress",
        percent=round((1 - ratio) * 100, 1),
    )


# ── Band & Colour helpers ─────────────────────────────────────────────────────

def _band_and_color(score: int) -> tuple[str, str]:
    if score >= 80:
        return "On Track", "green"
    elif score >= 50:
        return "Needs Attention", "amber"
    else:
        return "At Risk", "red"


# ── Main Entry Point ──────────────────────────────────────────────────────────

def compute_health_score(request: SummaryRequest) -> tuple[HealthScore, list[int], list[str], str]:
    """
    Compute the ML health score for a project.

    Returns:
        health_score  — HealthScore model (score, band, color, breakdown)
        daily         — list[int] of daily completions (7 values)
        labels        — list[str] of day labels ["Mon", "Tue", ...]
        trend         — "up" | "down" | "flat"
    """
    tasks = request.tasks

    # Compute all 5 signals
    completion  = _score_completion_rate(tasks)
    overdue     = _score_overdue_penalty(tasks)
    velocity_signal, daily, labels, trend = _score_velocity(tasks)
    priority    = _score_priority_balance(tasks)
    stale       = _score_stale_penalty(tasks)

    # Total score (sum of all signal scores, capped at 100)
    total = (
        completion.score
        + overdue.score
        + velocity_signal.score
        + priority.score
        + stale.score
    )
    final_score = min(100, max(0, round(total)))
    band, color = _band_and_color(final_score)

    health = HealthScore(
        score=final_score,
        band=band,
        color=color,
        breakdown={
            "completion_rate":   completion,
            "overdue_penalty":   overdue,
            "velocity":          velocity_signal,
            "priority_balance":  priority,
            "stale_penalty":     stale,
        },
    )
    return health, daily, labels, trend
