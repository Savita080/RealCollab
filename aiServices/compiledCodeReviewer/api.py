"""
FastAPI service for C++, Java, and Go code review.

Pipeline:
  1. run_preflight() — cppcheck (C++) or LLM preflight (Java/Go)
  2. Fatal syntax → early return
  3. Build numbered + dead-code-free numbered source
  4. Six language-specific agents (parallel by default)
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Dict, Optional

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

from agents import get_agent_classes
from models import ReviewInput, ReviewReport
from orchestrator import ReviewOrchestrator
from preflight import normalize_language, run_preflight

SUPPORTED_LANGUAGES = "C++, Java, Go"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.orchestrator = ReviewOrchestrator(parallel=True)
    yield


app = FastAPI(
    title="Compiled Code Reviewer",
    description="Multi-agent code review API for C++, Java, and Go.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    code: str = Field(..., description="Raw source code.")
    language: str = Field(..., description='e.g. "C++", "Java", "Go".')
    context: Optional[str] = Field(None, description="Purpose of the code (≤50 words).")
    weights: Optional[Dict[str, float]] = Field(
        default=None,
        description=(
            "Optional weights for: clean_code, syntax, security, "
            "readability, performance, robustness."
        ),
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "code": "#include <iostream>\nint main() { std::cout << \"hi\"; }",
                "language": "C++",
                "weights": {
                    "security": 0.35,
                    "syntax": 0.2,
                    "performance": 0.2,
                    "readability": 0.1,
                    "clean_code": 0.1,
                    "robustness": 0.05,
                },
            }
        }
    }


def _validate(req: ReviewRequest) -> str:
    if not req.code.strip():
        raise HTTPException(status_code=422, detail="'code' must not be empty.")
    if not req.language.strip():
        raise HTTPException(status_code=422, detail="'language' must not be empty.")
    try:
        return normalize_language(req.language)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"{exc}. Supported: {SUPPORTED_LANGUAGES}.",
        ) from exc


def _add_line_numbers(code: str) -> str:
    return "\n".join(f"[L{i + 1}] {line}" for i, line in enumerate(code.splitlines()))


def _build_review_input(req: ReviewRequest, preflight: dict, normalized: str) -> ReviewInput:
    dead_free = preflight.get("dead_code_free_code", req.code)
    return ReviewInput(
        code=req.code,
        language=normalized,
        context=req.context,
        numbered_code=_add_line_numbers(req.code),
        dead_code_free_numbered_code=_add_line_numbers(dead_free),
        preflight=preflight,
    )


def _serialize(
    report: ReviewReport, weights: Optional[Dict], duration_ms: int, preflight: dict
) -> dict:
    payload = {
        "language": report.language,
        "raw_scores": report.raw_scores,
        "weighted_score": report.weighted_score(weights) if weights else None,
        "agent_results": [r.model_dump() for r in report.agent_results],
        "duration_ms": duration_ms,
    }
    if preflight.get("warning"):
        payload["preflight_warning"] = preflight["warning"]
    return payload


@app.get("/health", tags=["Meta"])
def health():
    return {
        "status": "ok",
        "service": "compiledCodeReviewer",
        "supported_languages": ["cpp", "java", "go"],
        "cppcheck_available": bool(
            __import__("shutil").which("cppcheck")
        ),
    }


@app.get("/agents", tags=["Meta"])
def list_agents(language: str = "C++"):
    try:
        classes = get_agent_classes(language)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "language": normalize_language(language),
        "agents": [
            {"criteria": cls.CRITERIA_NAME, "uses_fast_llm": cls.use_fast_llm}
            for cls in classes
        ],
    }


@app.post("/review", tags=["Review"])
async def review(req: ReviewRequest):
    normalized = _validate(req)
    t0 = time.monotonic()
    preflight = run_preflight(req.code, req.language)

    if preflight.get("has_fatal_syntax_error"):
        return JSONResponse(
            {
                "language": normalized,
                "fatal_syntax_error": preflight.get("errors", []),
                "agent_results": [],
                "raw_scores": {},
                "weighted_score": None,
                "duration_ms": int((time.monotonic() - t0) * 1000),
            }
        )

    review_input = _build_review_input(req, preflight, normalized)
    orchestrator: ReviewOrchestrator = app.state.orchestrator
    report: ReviewReport = await asyncio.get_event_loop().run_in_executor(
        None, orchestrator.run, review_input
    )
    duration_ms = int((time.monotonic() - t0) * 1000)
    return JSONResponse(_serialize(report, req.weights, duration_ms, preflight))


@app.post("/review/stream", tags=["Review"])
async def review_stream(req: ReviewRequest):
    normalized = _validate(req)
    preflight = run_preflight(req.code, req.language)

    if preflight.get("has_fatal_syntax_error"):

        async def fatal_gen():
            yield (
                f"data: {json.dumps({'done': True, 'fatal_syntax_error': preflight.get('errors', [])})}\n\n"
            )

        return StreamingResponse(fatal_gen(), media_type="text/event-stream")

    review_input = _build_review_input(req, preflight, normalized)
    orchestrator: ReviewOrchestrator = app.state.orchestrator
    agent_classes = get_agent_classes(normalized)
    weights = req.weights

    async def event_generator():
        loop = asyncio.get_event_loop()
        agents = [cls() for cls in agent_classes]
        results = []
        t0 = time.monotonic()

        for agent in agents:
            result = await loop.run_in_executor(None, agent.review, review_input)
            results.append(result)
            yield f"data: {json.dumps({'done': False, 'result': result.model_dump()})}\n\n"

        duration_ms = int((time.monotonic() - t0) * 1000)
        raw_scores = {r.criteria: r.score for r in results}
        report = ReviewReport(
            language=normalized,
            agent_results=results,
            raw_scores=raw_scores,
        )
        final = {
            "done": True,
            "raw_scores": raw_scores,
            "weighted_score": report.weighted_score(weights) if weights else None,
            "duration_ms": duration_ms,
        }
        if preflight.get("warning"):
            final["preflight_warning"] = preflight["warning"]
        yield f"data: {json.dumps(final)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8002")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )
