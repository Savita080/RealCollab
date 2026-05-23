"""
stall_detector.py — Step 1: Mathematical stall detection.

Produces the candidate list of stalled tasks using:
  A. Log-Normal Percentile Test  (95th-percentile threshold per priority group)
  B. Priority-Weighted Urgency Score  (exponential decay S = 1 - e^{-λ·Δt})

Tasks that pass the stall test become candidates fed into Steps 2–4.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple


from config import settings
from schemas import TaskPayload


# ── Priority → λ mapping ──────────────────────────────────────────────────────

_LAMBDA: dict[str, float] = {
    "P0": settings.LAMBDA_P0,
    "P1": settings.LAMBDA_P1,
    "P2": settings.LAMBDA_P2,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _duration_hours(start: datetime, end: Optional[datetime] = None) -> float:
    end = end or _now()
    delta = _to_utc(end) - _to_utc(start)
    return max(delta.total_seconds() / 3600.0, 0.0)


# ── A. Log-Normal Baseline ────────────────────────────────────────────────────

class LogNormalBaseline:
    """
    Fits log-normal (μ, σ) from historical completed task durations,
    grouped by priority.  Falls back to a static hour threshold when
    there are fewer than min_samples observations for a priority group.
    """

    def __init__(self, min_samples: int = settings.MIN_HISTORICAL_SAMPLES):
        self._min_samples = min_samples
        self._params: dict[str, Tuple[float, float]] = {}  # priority → (mu, sigma)

    def fit(self, historical_tasks: List[TaskPayload]) -> None:
        """Compute log-normal parameters from DONE/IN_REVIEW tasks."""
        buckets: dict[str, list[float]] = {}

        for t in historical_tasks:
            if t.status not in ("DONE", "IN_REVIEW"):
                continue
            dur = _duration_hours(t.created_at, t.updated_at)
            if dur <= 0:
                continue
            buckets.setdefault(t.priority, []).append(dur)

        for priority, durations in buckets.items():
            if len(durations) < self._min_samples:
                continue
            log_d = [math.log(d) for d in durations]
            mu = sum(log_d) / len(log_d)
            sigma = math.sqrt(sum((x - mu) ** 2 for x in log_d) / (len(log_d) - 1))
            self._params[priority] = (mu, sigma)

    def is_stalled(
        self,
        task: TaskPayload,
        current_duration_hours: float,
    ) -> Tuple[bool, str, Optional[float]]:
        """
        Returns (is_stalled, method_used, percentile_rank 0–100).

        Log-normal: stalled when ln(t) > μ + 1.645σ  (95th percentile).
        Static fallback: stalled when duration > STATIC_STALL_HOURS.
        """
        priority = task.priority
        if priority in self._params and current_duration_hours > 0:
            mu, sigma = self._params[priority]
            if sigma == 0:
                return False, "log_normal", None
            z = (math.log(current_duration_hours) - mu) / sigma
            stalled = z > settings.STALL_Z_THRESHOLD
            percentile = round(math.erfc(-z / math.sqrt(2)) / 2 * 100, 2)
            return stalled, "log_normal", percentile

        stalled = current_duration_hours > settings.STATIC_STALL_HOURS
        return stalled, "static_fallback", None


# ── B. Urgency Score ──────────────────────────────────────────────────────────

def compute_urgency_score(task: TaskPayload) -> float:
    """S = 1 − e^(−λ · Δt),  Δt = hours since task.updated_at."""
    lam = _LAMBDA.get(task.priority, settings.LAMBDA_P2)
    delta_t = _duration_hours(task.updated_at)
    return round(min(max(1.0 - math.exp(-lam * delta_t), 0.0), 1.0), 4)


def get_task_duration_hours(task: TaskPayload) -> float:
    """Hours since task.created_at (total age)."""
    return round(_duration_hours(task.created_at), 2)
