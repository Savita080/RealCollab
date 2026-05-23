"""
api.py — FastAPI wrapper around the multi-agent code reviewer.

Pipeline per request:
  1. run_preflight()  → syntax check, dead code (vulture), commented-out blocks (tree-sitter)
  2. If fatal syntax error  → return immediately (no agents run)
  3. Build numbered_code                 (original + line numbers)
  4. Build dead_code_free_numbered_code  (dead lines blanked, commented-out blocks removed)
  5. CleanCodeAgent   ← dead_code + commented_out_blocks (no source code)
  6. SyntaxAgent      ← errors (no source code)
  7. Security / Readability / Performance / Robustness ← dead_code_free_numbered_code
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
from preflight import run_preflight


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.orchestrator = ReviewOrchestrator(parallel=True)
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Code Reviewer",
    description="Multi-agent LangChain code review API.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    code: str = Field(..., description="Raw source code as plain text.")
    language: str = Field(..., description='Programming language, e.g. "Python", "TypeScript".')
    context: Optional[str] = Field(None, description="Purpose of the code in ≤50 words.")
    weights: Optional[Dict[str, float]] = Field(
        default=None,
        description=(
            "Optional per-criteria weights. Keys: clean_code, syntax, security, "
            "readability, performance, robustness. Values are normalised automatically."
        ),
    )

    model_config = {"json_schema_extra": {"example": {
        "code": "def add(a, b):\n    unused = 42\n    return a + b",
        "language": "Python",
        "weights": {
            "security": 0.4, "performance": 0.3, "syntax": 0.2,
            "readability": 0.05, "clean_code": 0.03, "robustness": 0.02,
        },
    }}}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate(req: ReviewRequest) -> None:
    if not req.code.strip():
        raise HTTPException(status_code=422, detail="'code' must not be empty.")
    if not req.language.strip():
        raise HTTPException(status_code=422, detail="'language' must not be empty.")


def _add_line_numbers(code: str) -> str:
    """Prefix each line with [L<n>] for agent reference."""
    return "\n".join(
        f"[L{i + 1}] {line}"
        for i, line in enumerate(code.splitlines())
    )


def _build_review_input(req: ReviewRequest, preflight: dict) -> ReviewInput:
    """
    Construct a ReviewInput with both numbered variants populated.
    """
    numbered_code = _add_line_numbers(req.code)

    # dead_code_free_code comes from preflight (blanked dead lines + removed
    # commented-out blocks). Add line numbers to it too.
    dead_code_free = preflight.get("dead_code_free_code", req.code)
    dead_code_free_numbered = _add_line_numbers(dead_code_free)

    return ReviewInput(
        code=req.code,
        language=req.language,
        context=req.context,
        numbered_code=numbered_code,
        dead_code_free_numbered_code=dead_code_free_numbered,
        preflight=preflight,
    )


def _serialize(report: ReviewReport, weights: Optional[Dict], duration_ms: int) -> dict:
    return {
        "language": report.language,
        "raw_scores": report.raw_scores,
        "weighted_score": report.weighted_score(weights) if weights else None,
        "agent_results": [r.model_dump() for r in report.agent_results],
        "duration_ms": duration_ms,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok", "provider": os.getenv("LLM_PROVIDER", "groq")}


@app.get("/agents", tags=["Meta"])
def list_agents():
    return {
        "agents": [
            {"criteria": cls.CRITERIA_NAME, "uses_fast_llm": cls.use_fast_llm}
            for cls in DEFAULT_AGENTS
        ]
    }


@app.post("/review", tags=["Review"])
async def review(req: ReviewRequest):
    _validate(req)

    # ── Pre-flight: static analysis ───────────────────────────────────────
    preflight = run_preflight(req.code, req.language)

    if preflight["has_fatal_syntax_error"]:
        return JSONResponse({
            "language": req.language,
            "fatal_syntax_error": preflight["errors"],
            "agent_results": [],
            "raw_scores": {},
            "weighted_score": None,
            "duration_ms": 0,
        })

    review_input = _build_review_input(req, preflight)

    orchestrator: ReviewOrchestrator = app.state.orchestrator
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

    preflight = run_preflight(req.code, req.language)

    if preflight["has_fatal_syntax_error"]:
        async def _fatal_gen():
            yield f"data: {json.dumps({'done': True, 'fatal_syntax_error': preflight['errors']})}\n\n"
        return StreamingResponse(_fatal_gen(), media_type="text/event-stream")

    review_input = _build_review_input(req, preflight)
    orchestrator: ReviewOrchestrator = app.state.orchestrator
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
        report = ReviewReport(
            language=req.language,
            agent_results=results,
            raw_scores=raw_scores,
        )
        final = {
            "done": True,
            "raw_scores": raw_scores,
            "weighted_score": report.weighted_score(weights) if weights else None,
            "duration_ms": duration_ms,
        }
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )