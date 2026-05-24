"""
activity_pulse.py — Weighted activity scoring algorithm for projects.

This module computes an "Activity Pulse" score (0-100) for a project based on
three signals from the last 24 hours:

  1. Group chat messages  (weight: 0.2)
  2. Tasks moved on Kanban (weight: 0.4)
  3. Wiki/doc edits        (weight: 0.4)

The weighting rationale:
  - Chat is given lower weight (0.2) because it's easy to generate noise
    (casual messages, greetings, etc.) without productive output.
  - Tasks and wiki edits are weighted equally higher (0.4 each) because they
    represent concrete work: code progress and documentation.

Scoring formula:
  Each raw count is normalised using an exponential saturation function:
    sub_score = 100 * (1 - e^(-k * count))

  This produces a curve that:
    - Starts at 0 when count = 0
    - Rises quickly for the first few events
    - Asymptotically approaches 100 (diminishing returns)

  The constant 'k' controls how fast the curve saturates:
    - k = 0.05 for chat  → 50 messages ≈ 92/100
    - k = 0.2  for tasks → 10 movements ≈ 86/100
    - k = 0.3  for wiki  → 5 edits ≈ 78/100

  Final score = Σ(weight_i * sub_score_i)

This is a PURE MATH module — no LLM calls, no network I/O.
It runs in microseconds and can be called synchronously.
"""
from __future__ import annotations

import math

from config import settings
from schemas import ProjectPayload, ActivityPulse


def calculate_activity_pulse(project: ProjectPayload) -> ActivityPulse:
    """
    Compute the Activity Pulse for a single project.

    Parameters:
        project: A ProjectPayload containing all 24h data for one project.

    Returns:
        An ActivityPulse object with the final score, raw counts,
        and per-signal weighted contributions.

    Example:
        If a project had 20 chat messages, 5 tasks moved, and 2 wiki edits:
          chat_sub  = 100 * (1 - e^(-0.05 * 20)) = 63.2
          task_sub  = 100 * (1 - e^(-0.2 * 5))   = 63.2
          wiki_sub  = 100 * (1 - e^(-0.3 * 2))   = 45.1
          
          chat_weighted = 0.2 * 63.2 = 12.6
          task_weighted = 0.4 * 63.2 = 25.3
          wiki_weighted = 0.4 * 45.1 = 18.0
          
          final_score = 12.6 + 25.3 + 18.0 = 55.9
    """
    # ── Step 1: Count raw signals ─────────────────────────────────────────────
    chat_count = len(project.chat_messages)
    task_count = len(project.tasks_moved)
    wiki_count = len(project.wiki_changes)

    # ── Step 2: Compute sub-scores using exponential saturation ───────────────
    # Formula: sub_score = 100 * (1 - e^(-k * count))
    #
    # Why this function?
    # - Linear scaling is unfair: a project with 200 messages shouldn't score
    #   4x higher than one with 50 — both are clearly "active".
    # - Log scaling can produce negative values for count < 1.
    # - Exponential saturation naturally caps at 100 and gives diminishing
    #   returns, which matches our intuition about "activity levels".

    chat_sub = _exponential_sub_score(chat_count, settings.K_CHAT)
    task_sub = _exponential_sub_score(task_count, settings.K_TASKS)
    wiki_sub = _exponential_sub_score(wiki_count, settings.K_WIKI)

    # ── Step 3: Apply weights and compute final score ─────────────────────────
    chat_weighted = settings.WEIGHT_CHAT * chat_sub
    task_weighted = settings.WEIGHT_TASKS * task_sub
    wiki_weighted = settings.WEIGHT_WIKI * wiki_sub

    final_score = chat_weighted + task_weighted + wiki_weighted

    return ActivityPulse(
        score=round(final_score, 1),
        chat_count=chat_count,
        task_count=task_count,
        wiki_count=wiki_count,
        chat_weighted=round(chat_weighted, 1),
        task_weighted=round(task_weighted, 1),
        wiki_weighted=round(wiki_weighted, 1),
    )


def _exponential_sub_score(count: int, k: float) -> float:
    """
    Compute a single sub-score in the range [0, 100] using exponential saturation.

    Parameters:
        count: Raw event count (e.g., number of messages)
        k:     Decay constant controlling saturation speed

    Returns:
        A float between 0 and 100.

    The function graph looks like:
        100 ┤                          ╭──────────────
            │                     ╭────╯
            │                ╭───╯
            │           ╭───╯
            │      ╭───╯
            │  ╭──╯
          0 ┤──╯
            └───────────────────────────────────────
            0                                    count →
    """
    if count <= 0:
        return 0.0
    return 100.0 * (1.0 - math.exp(-k * count))
