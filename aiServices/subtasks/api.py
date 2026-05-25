from __future__ import annotations

import os
import sys
import time
from contextlib import asynccontextmanager

# Add local path to import modules correctly
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import TaskBreakdownRequest, TaskBreakdownResponse
from breaker import get_task_breaker_prompt


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Task Breaker microservice starting on port 8004...")
    yield
    print("Task Breaker microservice shutting down.")


app = FastAPI(
    title="RealCollab Task Breaker",
    description=(
        "FastAPI microservice that uses LLMs to split a high-level user task "
        "description into 4 to 5 highly structured, granular subtasks."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Meta"])
def health():
    return {
        "status": "ok",
        "service": "task-breaker",
        "llm_provider": settings.LLM_PROVIDER,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY),
    }


@app.post("/api/breakdown", response_model=TaskBreakdownResponse, tags=["AI Breakdown"])
async def break_task(request: TaskBreakdownRequest):
    """
    Decompose a high-level task/feature request into exactly 4-5 granular, structured subtasks.
    """
    t0 = time.monotonic()

    provider = settings.LLM_PROVIDER.lower()
    try:
        # Resolve LangChain LLM instance
        if provider == "groq":
            if not settings.GROQ_API_KEY:
                raise HTTPException(
                    status_code=400,
                    detail="GROQ_API_KEY is not configured in settings."
                )
            from langchain_groq import ChatGroq
            llm = ChatGroq(
                model=settings.LLM_MODEL or "llama-3.3-70b-versatile",
                api_key=settings.GROQ_API_KEY,
                temperature=0.3
            )
        elif provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise HTTPException(
                    status_code=400,
                    detail="OPENAI_API_KEY is not configured in settings."
                )
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=settings.LLM_MODEL or "gpt-4o-mini",
                api_key=settings.OPENAI_API_KEY,
                temperature=0.3
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported LLM provider: '{provider}'."
            )

        # Enforce structured Pydantic schema return
        structured_llm = llm.with_structured_output(TaskBreakdownResponse)

        # Prepare payload inputs
        ctx = request.context
        project_name = ctx.project_name if ctx else "Unknown Project"
        project_desc = ctx.project_description if ctx else "No description provided"
        existing = ", ".join(ctx.existing_tasks) if ctx and ctx.existing_tasks else "None"

        # Format and invoke prompt
        prompt = get_task_breaker_prompt()
        formatted_prompt = prompt.format_messages(
            featureDescription=request.featureDescription,
            projectName=project_name,
            projectDescription=project_desc,
            existingTasks=existing
        )

        response: TaskBreakdownResponse = await structured_llm.ainvoke(formatted_prompt)

        # Apply standard response identifiers
        duration_ms = int((time.monotonic() - t0) * 1000)
        response.duration_ms = duration_ms
        response.project_id = request.projectId

        return response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal AI Breakdown Pipeline Error: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
    )
