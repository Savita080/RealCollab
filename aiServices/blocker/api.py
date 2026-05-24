"""
api.py — FastAPI service for the Blockage Identifier.

Option 2 (manual trigger): the Node backend calls POST /find-bottleneck
when a user clicks "Find Bottleneck" in the UI.  No background scheduler.

The Node backend is responsible for:
  - Querying MongoDB for all IN_PROGRESS tasks of the project + their comments.
  - Querying MongoDB for completed tasks (DONE / IN_REVIEW) as historical baseline.
  - POSTing the assembled payload here.

This service is a pure compute layer — it never touches MongoDB directly.
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import AnalyseProjectRequest, ProjectAnalysisResponse, TaskAnalysisResult
from stall_detector import LogNormalBaseline
from analyzer import analyse_task
from graph_analyzer import compute_dependency_in_degrees, compute_global_bottleneck


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔍 Blockage Identifier service starting …")
    yield
    print("🛑 Blockage Identifier service shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Blockage Identifier",
    description=(
        "AI & mathematical engine that detects stalled tasks, identifies "
        "blockers via NLP, and surfaces team bottlenecks through graph analysis."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health():
    return {
        "status": "ok",
        "service": "blockage-identifier",
        "groq_configured": bool(settings.GROK_API_KEY),
    }


# ── POST /find-bottleneck ─────────────────────────────────────────────────────

@app.post("/find-bottleneck", response_model=ProjectAnalysisResponse, tags=["Analysis"])
async def find_bottleneck(req: AnalyseProjectRequest):
    """
    Triggered when a user clicks "Find Bottleneck" in the UI.

    Pipeline:
      1. Fit log-normal baseline from historical tasks.
      2. Compute dependency in-degrees across all active tasks (DAG).
      3. Run the 4-step analysis pipeline on each active task in parallel.
      4. Sort results by (severity_multiplier × urgency_score) descending.
      5. Aggregate per-task negative-comment mention graphs into a global bottleneck.
    """
    if not req.active_tasks:
        raise HTTPException(
            status_code=422,
            detail="No active tasks to analyse. Provide at least one task.",
        )

    t0 = time.monotonic()

    # ── 1. Fit log-normal baseline ────────────────────────────────────────────
    baseline = LogNormalBaseline()
    baseline.fit(req.historical_tasks)

    # ── 2. Compute dependency DAG in-degrees once for all tasks ───────────────
    dep_in_degrees = compute_dependency_in_degrees(req.active_tasks)

    # ── 3. Analyse each task in parallel ─────────────────────────────────────
    loop = asyncio.get_event_loop()
    futures = [
        loop.run_in_executor(
            None, analyse_task, task, baseline, dep_in_degrees, True
        )
        for task in req.active_tasks
    ]
    results: list[TaskAnalysisResult] = await asyncio.gather(*futures)

    # ── 4. Sort: critical-path stalled tasks first, then by urgency ───────────
    results.sort(
        key=lambda r: r.severity_multiplier * r.urgency_score,
        reverse=True,
    )

    # ── 5. Global bottleneck from negative-comment mention graphs only ────────
    # Each result's mentioned_users was already built from negative comments,
    # so this aggregation is consistent with Step 3's filtered approach.
    all_mention_nodes = [r.mentioned_users for r in results]
    global_bottleneck = compute_global_bottleneck(all_mention_nodes)

    stalled_count = sum(1 for r in results if r.is_stalled)
    duration_ms = int((time.monotonic() - t0) * 1000)

    return ProjectAnalysisResponse(
        project_id=req.project_id,
        project_name=req.project_name,
        total_active_tasks=len(req.active_tasks),
        stalled_tasks_count=stalled_count,
        results=results,
        global_bottleneck_user=global_bottleneck,
        analysis_timestamp=datetime.now(timezone.utc),
        duration_ms=duration_ms,
    )


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
    )