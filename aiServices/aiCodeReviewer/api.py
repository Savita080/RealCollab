"""
FastAPI wrapper around the multi-agent code reviewer.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Dict, Optional

# ── Path guard — MUST be before any local imports ─────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from pydantic import BaseModel, Field

load_dotenv()

from models import ReviewInput, ReviewReport
from orchestrator import ReviewOrchestrator, DEFAULT_AGENTS


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.orchestrator = ReviewOrchestrator(parallel=True)
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Code Reviewer",
    description="Multi-agent LangChain code review API.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schema of request─────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    code: str = Field(..., description="Raw source code as plain text.")
    language: str = Field(..., description='Programming language, e.g. "Python", "TypeScript".')
    weights: Optional[Dict[str, float]] = Field(
        default=None,
        description=(
            "Optional per-criteria weights. Keys: unused_code, syntax, security, "
            "readability, performance, edge_cases. Values are normalised automatically."
        ),
    )

    model_config = {"json_schema_extra": {"example": {
        "code": "def add(a, b):\n    unused = 42\n    return a + b",
        "language": "Python",
        "weights": {"security": 0.4, "performance": 0.3, "syntax": 0.2,
                    "readability": 0.05, "unused_code": 0.03, "edge_cases": 0.02},
    }}}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate(req: ReviewRequest):
    if not req.code.strip():
        raise HTTPException(status_code=422, detail="'code' must not be empty.")
    if not req.language.strip():
        raise HTTPException(status_code=422, detail="'language' must not be empty.")


def _serialize(report: ReviewReport, weights: Optional[Dict], duration_ms: int) -> dict:
    return {
        "language": report.language,
        "raw_scores": report.raw_scores,
        "weighted_score": report.weighted_score(weights) if weights else None,
        "agent_results": [r.model_dump() for r in report.agent_results],
        "duration_ms": duration_ms,
    }


# ── Routes ────────────────────────────────────────────────────────────────────
# META routes for easy debugging
@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok", "provider": os.getenv("LLM_PROVIDER", "groq")}


@app.get("/agents", tags=["Meta"])
def list_agents():
    return 
    {
        "agents": [
        {"criteria": cls.CRITERIA_NAME, "uses_fast_llm": cls.use_fast_llm}
        for cls in DEFAULT_AGENTS
        ]
    }


# main entry point
@app.post("/review", tags=["Review"])
async def review(req: ReviewRequest):
    """Run all agents in parallel, return the full report."""
    # reaches next step iff req matches request schema 
    _validate(req)

    orchestrator: ReviewOrchestrator = app.state.orchestrator
    review_input = ReviewInput(code=req.code, language=req.language)

    t0 = time.monotonic()
    report: ReviewReport = await asyncio.get_event_loop().run_in_executor(
        None, orchestrator.run, review_input
    )
    duration_ms = int((time.monotonic() - t0) * 1000)

    return JSONResponse(_serialize(report, req.weights, duration_ms))


@app.post("/review/stream", tags=["Review"])
async def review_stream(req: ReviewRequest):
    """
    Stream agent results as Server-Sent Events.
    Each event: { done: false, result: AgentResult }
    Final event: { done: true, raw_scores, weighted_score, duration_ms }
    """
    _validate(req)
    orchestrator: ReviewOrchestrator = app.state.orchestrator
    review_input = ReviewInput(code=req.code, language=req.language)
    weights = req.weights

    async def event_generator():
        loop = asyncio.get_event_loop()
        results = []
        t0 = time.monotonic()

        for agent in orchestrator._agents:
            result = await loop.run_in_executor(None, agent.review, review_input)
            results.append(result)
            yield f"data: {json.dumps({'done': False, 'result': result.model_dump()})}\n\n"

        duration_ms = int((time.monotonic() - t0) * 1000)
        raw_scores = {r.criteria: r.score for r in results}
        report = ReviewReport(language=req.language, agent_results=results, raw_scores=raw_scores)
        final = {
            "done": True,
            "raw_scores": raw_scores,
            "weighted_score": report.weighted_score(weights) if weights else None,
            "duration_ms": duration_ms,
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── for debugging ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )
