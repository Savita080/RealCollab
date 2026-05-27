# Blockage Identifier

> AI-powered task stall & bottleneck detection microservice — v2.0.0

[![Stack](https://img.shields.io/badge/stack-Python%20%2F%20FastAPI-blue)](https://fastapi.tiangolo.com)
[![LLM](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com)
[![Trigger](https://img.shields.io/badge/trigger-manual%20%28Node%20backend%29-green)]()

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [The 4-Step Pipeline](#3-the-4-step-pipeline)
   - [Step 1 — Statistical Stall Detection](#step-1--statistical-stall-detection-stall_detectorpy)
   - [Step 2 — NLP Analysis](#step-2--nlp-analysis-nlp_analyzerpy)
   - [Step 3 — Mention Graph](#step-3--mention-graph-graph_analyzerpy)
   - [Step 4 — Severity Boost + AI Synthesis](#step-4--severity-boost--ai-synthesis-analyzerpy--synthesizerpy)
4. [API Reference](#4-api-reference)
   - [GET /health](#get-health)
   - [POST /find-bottleneck](#post-find-bottleneck)
5. [Configuration Reference](#5-configuration-reference)
6. [End-to-End Data Flow](#6-end-to-end-data-flow)
7. [Node.js Integration](#7-nodejs-integration-aicontrollerjs)
8. [Setup & Running](#8-setup--running)
9. [Key Design Decisions](#9-key-design-decisions)

---

## 1. Overview

The **Blockage Identifier** is a Python microservice that detects stalled tasks, classifies the nature of each blockage, and surfaces the team member creating the most friction — triggered on demand when a user clicks **"Find Bottleneck"** in the UI.

The service is a **pure-compute layer**: it never queries MongoDB or any database directly. The Node.js backend is responsible for collecting task data and POSTing it here.

**Core design principles:**

- **No background scheduler** — analysis runs only when explicitly triggered.
- **Stateless compute** — every request is self-contained; no shared state between calls.
- **Four-step pipeline** — statistical → NLP → graph → LLM, each step informing the next.
- **Negative-comment filtering** — the graph and LLM steps consume only friction-carrying comments, eliminating noise from routine status updates.

---

## 2. System Architecture

### 2.1 Service Topology

```
Browser / UI  →  Node.js Backend (MongoDB queries)  →  Python Microservice (this service)
```

**Request lifecycle:**
1. User clicks "Find Bottleneck"
2. Node queries MongoDB for all `IN_PROGRESS` tasks and `DONE`/`IN_REVIEW` historical tasks
3. Node assembles and POSTs the payload to `POST /find-bottleneck`
4. Python runs the 4-step pipeline
5. JSON response flows back through Node to the browser

### 2.2 Module Map

| File | Role | Responsibility |
|------|------|---------------|
| `api.py` | Entry point | FastAPI app, single `POST /find-bottleneck` endpoint, orchestrates all steps |
| `analyzer.py` | Orchestrator | Runs the 4-step pipeline for a single task; called in parallel for all tasks |
| `stall_detector.py` | Step 1 | Log-normal percentile test and exponential-decay urgency score |
| `nlp_analyzer.py` | Step 2 | Groq-backed blocker classification + VADER per-comment sentiment scoring |
| `graph_analyzer.py` | Step 3 | Directed mention graph built on negative comments; DAG in-degree computation |
| `synthesizer.py` | Step 4 | Groq LLM call producing one-sentence diagnosis + action plan |
| `schemas.py` | Data models | All Pydantic request/response models |
| `config.py` | Configuration | Environment variable loading, all tuneable constants |
| `aicontroller.js` | Node proxy | Express controller that forwards Node requests to this service |

---

## 3. The 4-Step Pipeline

Every active (`IN_PROGRESS`) task is run through the same four steps. Each step enriches the task context and feeds the next. All tasks are **processed in parallel** via an `asyncio` thread-pool executor.

---

### Step 1 — Statistical Stall Detection (`stall_detector.py`)

**Purpose:** Determine objectively whether a task has been in progress for an unusually long time relative to historical data. Produce a normalised urgency score for ranking.

#### A. Log-Normal Baseline (`LogNormalBaseline.fit`)

Historical `DONE`/`IN_REVIEW` tasks are grouped by priority (`P0`, `P1`, `P2`). For each priority group with at least `MIN_HISTORICAL_SAMPLES` (default: 5) tasks, a log-normal distribution is fitted:

```
log_durations = [ln(hours) for hours in group]
μ  = mean(log_durations)
σ  = stddev(log_durations)

Stall threshold  = μ + 1.645σ        # ≈ 95th percentile
is_stalled       = ln(current_hours) > threshold
percentile_rank  = erfc(-z / √2) / 2 × 100
```

> **Rationale:** Task durations are right-skewed — most finish quickly, a few outliers take very long. The log-normal distribution is the correct model for this shape. The 95th percentile is the conventional "this is taking too long" cutoff.

#### B. Static Fallback

When a priority group has fewer than `MIN_HISTORICAL_SAMPLES` tasks, the log-normal model cannot be trusted:

```
is_stalled       = current_duration_hours > STATIC_STALL_HOURS   # default: 72h
stall_method     = "static_fallback"
percentile_rank  = None
```

#### C. Urgency Score (Priority-Weighted Exponential Decay)

The urgency score uses **time since last update** (not creation), with priority-specific decay constants:

```
S = 1 − e^(−λ · Δt)

where  Δt = hours since task.updated_at
       λ  = LAMBDA_P0 (0.05)  for P0 / critical
            LAMBDA_P1 (0.02)  for P1 / high
            LAMBDA_P2 (0.008) for P2 / normal

S ∈ [0, 1]:  0 = just updated,  1 = extremely overdue
```

> **Rationale:** Higher-priority tasks decay faster — a P0 task idle for 46 hours scores `0.90`; the same time on a P2 task scores only `0.31`.

---

### Step 2 — NLP Analysis (`nlp_analyzer.py`)

**Purpose:** Understand what kind of blocker is causing the delay and measure the emotional tone of the task discussion.

#### A. Semantic Blocker Classification (`classify_blocker_categories`)

The task description and all comment text are concatenated and sent to **Groq** with a zero-shot classification prompt. The model returns a JSON object with a float score for each of three blocker categories:

| Category | Meaning | Example signals |
|----------|---------|----------------|
| `access` | Missing permissions, credentials, or environment access | "I cannot deploy", "need access to the S3 bucket" |
| `dependency` | Waiting on another team, service, or task | "blocked by API team", "waiting for PR review" |
| `requirements` | Unclear or changing specifications | "unclear acceptance criteria", "spec keeps changing" |

```python
# LLM system prompt (simplified)
"Return ONLY a JSON: {'access': float, 'dependency': float, 'requirements': float}"

# Score interpretation
is_blocked        = score >= COSINE_THRESHOLD     # default: 0.65
dominant_category = category with highest score (if is_blocked == True)
```

> **Why Groq instead of hardcoded vectors?** Contextual understanding catches paraphrasing — e.g. "the ticket is in limbo" correctly maps to `requirements`, not `access`.

#### B. Sentiment Analysis (`analyse_sentiment` — VADER)

Each comment is scored **individually** by VADER (Valence Aware Dictionary and sEntiment Reasoner):

```python
compound = vader.polarity_scores(comment.content)["compound"]   # -1.0 to +1.0

negative_comment      = compound < SENTIMENT_NEGATIVE_THRESHOLD   # default: -0.3
avg_compound          = mean(all compound scores)
has_negative_sentiment = avg_compound < SENTIMENT_NEGATIVE_THRESHOLD

# negative_comments → fed directly to Step 3
```

> **Why VADER locally and not Groq?** VADER runs in microseconds at zero API cost. Scoring every comment in every active task with an LLM would be prohibitively slow and expensive. Groq is reserved for higher-level tasks.

---

### Step 3 — Mention Graph (`graph_analyzer.py`)

**Purpose:** Identify which team member is the bottleneck resource by analysing who gets `@mentioned` in the context of frustration — and who is doing the mentioning (i.e. who is stuck).

#### A. Per-Task Graph (`build_mention_graph`)

The graph is built **exclusively from `negative_comments`** produced in Step 2. Routine comments ("pushed code", "updating status") are excluded entirely.

| Metric | Meaning | Interpretation |
|--------|---------|---------------|
| `in_degree` (C_D⁻) | Times `@mentioned` inside negative comments | Person being waited on / blamed → **resource bottleneck** |
| `out_degree` (C_D⁺) | Times this user `@mentions` others in negative comments | Developer who is stuck and seeking help |

```python
for comment in negative_comments:
    author = comment.author_name
    for mentioned in re.findall(r"@(\w+)", comment.content):
        in_degree[mentioned] += 1
        out_degree[author]   += 1

# bottleneck_node = node with highest in_degree (if in_degree > 0)
```

#### B. Dependency DAG In-Degrees (`compute_dependency_in_degrees`)

Separately, the service computes how many active tasks each task is blocking via the `depends_on` field:

```python
for task in active_tasks:
    for dep_id in task.depends_on:
        in_degree[dep_id] += 1

# dep_in_degree > 0 → other tasks are waiting on this one
# → feeds the severity multiplier in Step 4
```

#### C. Global Bottleneck (`compute_global_bottleneck`)

After all tasks are analysed, per-task mention graphs are aggregated to find the single person most mentioned project-wide:

```python
global_in[user_name]  = sum of in_degree  across all task graphs
global_out[user_name] = sum of out_degree across all task graphs

global_bottleneck = user with max(global_in) if max > 0 else None
```

---

### Step 4 — Severity Boost + AI Synthesis (`analyzer.py` + `synthesizer.py`)

**Purpose:** Weight tasks that are blocking others higher in the output ranking, then produce a human-readable, actionable diagnosis for each problematic task.

#### A. DAG Severity Multiplier

```python
dep_in_degree      = dependency_in_degrees.get(task.task_id, 0)
severity_multiplier = 2.0 if dep_in_degree > 0 else 1.0

# Final sort key (applied in api.py):
sort_key = severity_multiplier × urgency_score   # descending
```

> A stalled task that 3 other tasks depend on has its urgency effectively doubled, ensuring it always surfaces above equally-urgent leaf tasks.

#### B. AI Synthesis (`synthesize_diagnosis` — Groq)

Groq is called **only when** the task has at least one signal (`is_stalled OR has_negative_sentiment OR dominant_category`). The prompt includes:

- Task title, description (truncated to 300 chars), priority, assignee name
- Duration in progress and urgency score
- Dominant blocker category (if any)
- Sentiment label and compound score
- Bottleneck user name (if identified in Step 3)
- Critical-path warning (if `dep_in_degree > 0`)
- The last 6 negative comments verbatim

The model is instructed to return **exactly one sentence**: (1) identify the specific blocker, (2) suggest a concrete action. Temperature is `0.3` for near-deterministic but natural output.

---

