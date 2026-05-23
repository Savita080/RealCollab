"""
analyzer.py — Main orchestrator for a single task.

Implements the 4-step pipeline agreed in the design:

  Step 1 — Stall Detection (stall_detector.py)
            Log-normal percentile test + urgency score.
            Produces a boolean is_stalled and a 0–1 urgency_score.
            Only stalled tasks continue to Steps 2–4.

  Step 2 — NLP Analysis (nlp_analyzer.py)
            a. Semantic cosine-similarity → blocker category
               (access / dependency / requirements)
            b. VADER sentiment per comment → returns the list of
               negative comments (not just a boolean flag).

  Step 3 — Mention Graph on negative comments only (graph_analyzer.py)
            In-degree  = person most @mentioned in frustrated comments
                         → the resource bottleneck.
            Out-degree = person tagging others most in frustrated comments
                         → the developer who is stuck.

  Step 4 — Severity boost + AI Synthesis (gemini_synthesizer.py)
            If the stalled task has in-degree > 0 in the dependency DAG
            (other tasks are waiting on it), its severity is doubled.
            Gemini produces a 1-sentence diagnosis + action plan using
            all of the above context, including the negative comments.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from schemas import TaskAnalysisResult, TaskPayload
from stall_detector import (
    LogNormalBaseline,
    compute_urgency_score,
    get_task_duration_hours,
)
from nlp_analyzer import analyse_sentiment, classify_blocker_categories
from graph_analyzer import build_mention_graph
from synthesizer import synthesize_diagnosis


def analyse_task(
    task: TaskPayload,
    baseline: LogNormalBaseline,
    dependency_in_degrees: Dict[str, int],
    run_ai_synthesis: bool = True,
) -> TaskAnalysisResult:
    """
    Run the full 4-step pipeline for a single task.

    Args:
        task:                  The task (and its comments) to analyse.
        baseline:              Pre-fitted LogNormalBaseline from historical data.
        dependency_in_degrees: Dict mapping task_id → number of active tasks
                               that depend on it (from graph_analyzer.compute_dependency_in_degrees).
        run_ai_synthesis:      Set False to skip the Gemini LLM call (faster / cheaper).
    """
    now = datetime.now(timezone.utc)

    # ── Step 1: Statistical Stall Detection ───────────────────────────────────
    duration_hours = get_task_duration_hours(task)
    is_stalled, stall_method, percentile_rank = baseline.is_stalled(task, duration_hours)
    urgency_score = compute_urgency_score(task)

    # ── Step 2: NLP Analysis on all comments ──────────────────────────────────
    blocker_categories, dominant_category = classify_blocker_categories(
        task.comments, task.description
    )
    sentiment_score, has_negative_sentiment, negative_comments = analyse_sentiment(
        task.comments
    )

    # ── Step 3: Mention graph — built on negative comments only ───────────────
    # This is the key difference from the original implementation:
    # we do NOT scan all comments; we only build the graph from the
    # negative/friction comments returned by Step 2b.
    mention_nodes, bottleneck_node = build_mention_graph(negative_comments)

    bottleneck_user_name: Optional[str] = (
        bottleneck_node.user_name if bottleneck_node else None
    )

    # ── Step 4a: DAG severity boost ───────────────────────────────────────────
    # A stalled task that other tasks depend on blocks the whole project.
    # We apply a 2x severity multiplier so it sorts above equally-urgent tasks.
    dep_in_degree = dependency_in_degrees.get(task.task_id, 0)
    severity_multiplier = 2.0 if dep_in_degree > 0 else 1.0

    # ── Step 4b: AI Synthesis via Gemini ──────────────────────────────────────
    # Only synthesise when the task is actually problematic in some way.
    ai_diagnosis: Optional[str] = None
    should_synthesise = is_stalled or has_negative_sentiment or dominant_category
    if run_ai_synthesis and should_synthesise:
        ai_diagnosis = synthesize_diagnosis(
            title=task.title,
            description=task.description,
            priority=task.priority,
            assignee_name=task.assignee_name,
            duration_hours=duration_hours,
            urgency_score=urgency_score,
            dominant_category=dominant_category,
            sentiment_score=sentiment_score,
            negative_comments=negative_comments,   # pass only negative comments
            bottleneck_user=bottleneck_user_name,
            dependency_in_degree=dep_in_degree,
            severity_multiplier=severity_multiplier,
        )

    return TaskAnalysisResult(
        task_id=task.task_id,
        title=task.title,
        priority=task.priority,
        status=task.status,
        assignee_id=task.assignee_id,
        assignee_name=task.assignee_name,
        # Step 1
        duration_hours=duration_hours,
        is_stalled=is_stalled,
        stall_method=stall_method,
        urgency_score=urgency_score,
        percentile_rank=percentile_rank,
        # Step 2
        blocker_categories=blocker_categories,
        dominant_category=dominant_category,
        sentiment_score=sentiment_score,
        has_negative_sentiment=has_negative_sentiment,
        negative_comments=negative_comments,
        # Step 3
        mentioned_users=mention_nodes,
        bottleneck_user=bottleneck_node,
        # Step 4
        dependency_in_degree=dep_in_degree,
        severity_multiplier=severity_multiplier,
        ai_diagnosis=ai_diagnosis,
        analysis_timestamp=now,
    )
