# Project Progress Summary

> AI-powered project health summary and metric generation microservice — v1.0.0

[![Stack](https://img.shields.io/badge/stack-Python%20%2F%20FastAPI-blue)](https://fastapi.tiangolo.com)
[![LLM](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com)
[![Trigger](https://img.shields.io/badge/trigger-manual%20%28Node%20backend%29-green)]()

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [The 5-Signal Health Math Model](#3-the-5-signal-health-math-model)
4. [AI Narrative & Insight Engine](#4-ai-narrative--insight-engine)
5. [End-to-End Data Flow](#5-end-to-end-data-flow)

---

## 1. Overview

The **Project Progress Summary** is a Python FastAPI microservice that computes a comprehensive ML-based health score for any given project and generates a human-readable AI summary with key insights. 

It is designed as a **pure-compute layer**. It does not query MongoDB. The Node.js backend fetches all tasks and member data and POSTs it to this service.

---

## 2. System Architecture

### 2.1 Service Topology

```
Browser / UI  →  Node.js Backend (MongoDB queries)  →  Progress Summary Service (Python)
```

### 2.2 Module Map

| File | Responsibility |
|------|---------------|
| `api.py` | FastAPI entry point, exposes `POST /api/summarize`. |
| `health_scorer.py` | Pure Python math engine computing the 5-signal health score. |
| `insights_builder.py` | Rule-based engine that extracts blockers, warnings, and positive signals. |
| `report_generator.py` | Orchestrator that combines the math model with Groq/OpenAI LLM text generation. |
| `schemas.py` | Pydantic data models for request/response payloads. |

---

## 3. The 5-Signal Health Math Model (`health_scorer.py`)

The health score (0–100) is calculated without an LLM. It relies on 5 deterministic mathematical signals.

### Signal 1: Task Completion Rate (35 points)
Percentage of tasks in the `DONE` state.
`Score = (done_tasks / total_tasks) * 35`

### Signal 2: Overdue Task Penalty (25 points)
Penalizes the project for open tasks past their `dueDate`.
`Score = 25 * (1 - (overdue_tasks / tasks_with_due_dates))`

### Signal 3: 7-Day Velocity Score (20 points)
Rewards projects moving tasks to `DONE` within the last 7 days.
Expected weekly rate is assumed at 20% of total tasks.
`Score = min(20, (completed_this_week / expected_weekly_rate) * 20)`

### Signal 4: Priority Balance (10 points)
Penalizes a project if a high percentage of open tasks are critical (`P0`/`P1`).
`Score = 10 * (1 - (open_P0_P1_tasks / total_open_tasks))`

### Signal 5: Stale Task Penalty (10 points)
Penalizes tasks stuck in `IN_PROGRESS` longer than the configured threshold (default: 7 days).
`Score = 10 * (1 - (stale_tasks / in_progress_tasks))`

### Health Bands
The sum of all signals is capped at 100.
- **80–100**: On Track (Green)
- **50–79**: Needs Attention (Amber)
- **0–49**: At Risk (Red)

---

## 4. AI Narrative & Insight Engine

After computing the mathematical score, the orchestrator triggers the LLM (Groq via Langchain) to generate a human-readable summary.

The LLM is provided with:
- The Health Score (e.g., 85/100)
- Task breakdown by status and priority
- Velocity data over the last 7 days
- Member contributions (how many tasks assigned vs completed)

The AI generates a 2-3 paragraph summary detailing the progress, any lagging areas, and overall productivity, returning a JSON array of `KeyInsight` objects (Positive, Warning, Blocker).

---

## 5. End-to-End Data Flow

1. **User Action**: User clicks "Generate Summary" on the project page.
2. **Node backend**: Queries MongoDB for all `Task` and `Member` documents for the project.
3. **Data Transfer**: Node POSTs `SummaryRequest` to Python `:8002/api/summarize`.
4. **Compute Math**: `health_scorer.py` evaluates the 5 signals instantly.
5. **Compute AI**: LLM builds the narrative and insights.
6. **Response Assembly**: The service merges the ML math, the AI text, and standard statistical breakdowns (velocity charts, upcoming deadlines) into a single `SummaryResponse` returned to the browser.
