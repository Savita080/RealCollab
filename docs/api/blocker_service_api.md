## API Reference

**Base URL:** `http://localhost:8001` *(configurable via `HOST` / `PORT` env vars)*

---

### GET /health

Returns service status. No authentication required.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "blockage-identifier",
  "groq_configured": true
}
```

---

### POST /find-bottleneck

Main analysis endpoint. Triggered by the Node backend when a user clicks "Find Bottleneck".

#### Request Body

```json
{
  "project_id":       "string",
  "project_name":     "string",
  "active_tasks":     "TaskPayload[]",
  "historical_tasks": "TaskPayload[]"
}
```

#### TaskPayload

```json
{
  "task_id":       "string",
  "title":         "string",
  "description":   "string | null",
  "status":        "TODO | IN_PROGRESS | IN_REVIEW | DONE",
  "priority":      "P0 | P1 | P2",
  "assignee_id":   "string | null",
  "assignee_name": "string | null",
  "due_date":      "ISO8601 datetime | null",
  "labels":        "string[]",
  "created_at":    "ISO8601 datetime",
  "updated_at":    "ISO8601 datetime",
  "comments":      "CommentPayload[]",
  "depends_on":    "string[]"
}
```

#### CommentPayload

```json
{
  "_id":         "string",
  "author_id":   "string",
  "author_name": "string",
  "content":     "string",
  "created_at":  "ISO8601 datetime"
}
```

#### Full Request Example

```json
POST /find-bottleneck
Content-Type: application/json

{
  "project_id": "6649a2f1e4b0c3d8f1a2b3c4",
  "project_name": "Payment Gateway v2",
  "active_tasks": [
    {
      "task_id": "6649b1a2e4b0c3d8f1a2b3c5",
      "title": "Integrate Stripe Webhooks",
      "description": "Set up webhook endpoint for payment events.",
      "status": "IN_PROGRESS",
      "priority": "P0",
      "assignee_id": "user_001",
      "assignee_name": "Alice",
      "created_at": "2024-05-01T09:00:00Z",
      "updated_at": "2024-05-03T11:00:00Z",
      "labels": ["backend", "payments"],
      "depends_on": [],
      "comments": [
        {
          "_id": "c1",
          "author_id": "user_001",
          "author_name": "Alice",
          "content": "Still waiting for @Bob to give me access to the Stripe dashboard. This is holding everything up.",
          "created_at": "2024-05-02T14:00:00Z"
        },
        {
          "_id": "c2",
          "author_id": "user_002",
          "author_name": "Charlie",
          "content": "Agreed, @Bob has been unresponsive for two days. Very frustrated.",
          "created_at": "2024-05-03T09:00:00Z"
        }
      ]
    }
  ],
  "historical_tasks": [
    {
      "task_id": "hist_001",
      "title": "Integrate PayPal",
      "status": "DONE",
      "priority": "P0",
      "created_at": "2024-03-01T09:00:00Z",
      "updated_at": "2024-03-03T17:00:00Z",
      "description": "",
      "labels": [],
      "depends_on": [],
      "comments": []
    }
  ]
}
```

#### Response Schema (`ProjectAnalysisResponse`)

```json
{
  "project_id":             "string",
  "project_name":           "string",
  "total_active_tasks":     "integer",
  "stalled_tasks_count":    "integer",
  "results":                "TaskAnalysisResult[]",
  "global_bottleneck_user": "MentionNode | null",
  "analysis_timestamp":     "ISO8601 datetime",
  "duration_ms":            "integer"
}
```

#### TaskAnalysisResult

```json
{
  "task_id":        "string",
  "title":          "string",
  "priority":       "string",
  "status":         "string",
  "assignee_id":    "string | null",
  "assignee_name":  "string | null",

  "duration_hours":   "float",
  "is_stalled":       "boolean",
  "stall_method":     "log_normal | static_fallback",
  "urgency_score":    "float",
  "percentile_rank":  "float | null",

  "blocker_categories":     "BlockageCategory[]",
  "dominant_category":      "access | dependency | requirements | null",
  "sentiment_score":        "float | null",
  "has_negative_sentiment": "boolean",
  "negative_comments":      "CommentPayload[]",

  "mentioned_users": "MentionNode[]",
  "bottleneck_user": "MentionNode | null",

  "dependency_in_degree":  "integer",
  "severity_multiplier":   "1.0 | 2.0",
  "ai_diagnosis":          "string | null",

  "analysis_timestamp": "ISO8601 datetime"
}
```

#### BlockageCategory

```json
{
  "category":         "access | dependency | requirements",
  "similarity_score": "float",
  "is_blocked":       "boolean"
}
```

#### MentionNode

```json
{
  "user_id":    "string",
  "user_name":  "string",
  "in_degree":  "integer",
  "out_degree": "integer"
}
```

#### Full Response Example

```json
HTTP/1.1 200 OK

{
  "project_id": "6649a2f1e4b0c3d8f1a2b3c4",
  "project_name": "Payment Gateway v2",
  "total_active_tasks": 1,
  "stalled_tasks_count": 1,
  "global_bottleneck_user": {
    "user_id": "Bob",
    "user_name": "Bob",
    "in_degree": 2,
    "out_degree": 0
  },
  "analysis_timestamp": "2024-05-03T12:00:00Z",
  "duration_ms": 1847,
  "results": [
    {
      "task_id": "6649b1a2e4b0c3d8f1a2b3c5",
      "title": "Integrate Stripe Webhooks",
      "priority": "P0",
      "status": "IN_PROGRESS",
      "assignee_id": "user_001",
      "assignee_name": "Alice",
      "duration_hours": 50.0,
      "is_stalled": true,
      "stall_method": "static_fallback",
      "urgency_score": 0.9179,
      "percentile_rank": null,
      "blocker_categories": [
        { "category": "access",        "similarity_score": 0.87, "is_blocked": true  },
        { "category": "dependency",    "similarity_score": 0.51, "is_blocked": false },
        { "category": "requirements",  "similarity_score": 0.12, "is_blocked": false }
      ],
      "dominant_category": "access",
      "sentiment_score": -0.6721,
      "has_negative_sentiment": true,
      "negative_comments": [
        {
          "_id": "c1",
          "author_id": "user_001",
          "author_name": "Alice",
          "content": "Still waiting for @Bob to give me access to the Stripe dashboard. This is holding everything up.",
          "created_at": "2024-05-02T14:00:00Z"
        },
        {
          "_id": "c2",
          "author_id": "user_002",
          "author_name": "Charlie",
          "content": "Agreed, @Bob has been unresponsive for two days. Very frustrated.",
          "created_at": "2024-05-03T09:00:00Z"
        }
      ],
      "mentioned_users": [
        { "user_id": "Bob",      "user_name": "Bob",     "in_degree": 2, "out_degree": 0 },
        { "user_id": "user_001", "user_name": "Alice",   "in_degree": 0, "out_degree": 1 },
        { "user_id": "user_002", "user_name": "Charlie", "in_degree": 0, "out_degree": 1 }
      ],
      "bottleneck_user": {
        "user_id": "Bob", "user_name": "Bob", "in_degree": 2, "out_degree": 0
      },
      "dependency_in_degree": 0,
      "severity_multiplier": 1.0,
      "ai_diagnosis": "The Stripe Webhooks integration is stalled because Alice lacks Stripe dashboard access currently held by @Bob — escalate to Bob immediately or reassign credentials to unblock the task.",
      "analysis_timestamp": "2024-05-03T12:00:00Z"
    }
  ]
}
```

#### Error Responses

| HTTP Status | Condition | Response body |
|-------------|-----------|---------------|
| `422` | `active_tasks` is empty or missing | `{"detail": "No active tasks to analyse..."}` |
| `500` | Unhandled internal error | `{"detail": "<exception message>"}` |
| `500` (Node) | Cannot reach Python service | `{"error": "Failed to communicate with AI Service"}` |

---

## 5. Configuration Reference

All settings live in `config.py` and are loaded from a `.env` file. Every value has a safe default so the service starts without any configuration.

| Variable | Default | Type | Purpose |
|----------|---------|------|---------|
| `GROK_API_KEY` | *(empty)* | string | Groq API key. If empty, AI synthesis is skipped. |
| `GROK_MODEL` | `grok-3-mini` | string | Groq model used for classification and synthesis. |
| `STALL_Z_THRESHOLD` | `1.645` | float | 95th-percentile z-score. Raise to `2.0` for stricter stall detection. |
| `MIN_HISTORICAL_SAMPLES` | `5` | int | Minimum DONE tasks per priority before log-normal model is trusted. |
| `STATIC_STALL_HOURS` | `72` | float | Fallback stall threshold in hours when log-normal is unavailable. |
| `LAMBDA_P0` | `0.05` | float | Urgency decay rate for P0 (critical) tasks. |
| `LAMBDA_P1` | `0.02` | float | Urgency decay rate for P1 (high) tasks. |
| `LAMBDA_P2` | `0.008` | float | Urgency decay rate for P2 (normal) tasks. |
| `COSINE_THRESHOLD` | `0.65` | float | LLM score threshold above which a blocker category is considered active. |
| `SENTIMENT_NEGATIVE_THRESHOLD` | `-0.3` | float | VADER compound score below which a comment is considered negative. |
| `HOST` | `0.0.0.0` | string | Bind address for uvicorn. |
| `PORT` | `8001` | int | Service port. |
| `RELOAD` | `true` | bool | Uvicorn hot-reload. Set `false` in production. |
| `CORS_ORIGINS` | `*` | string | Comma-separated allowed origins. Lock down in production. |

---

## 6. End-to-End Data Flow

| Step | Component | What happens |
|------|-----------|-------------|
| 1 | Node.js (`aicontroller.js`) | User clicks "Find Bottleneck". Node queries MongoDB for all `IN_PROGRESS` tasks and `DONE`/`IN_REVIEW` historical tasks, assembles the `AnalyseProjectRequest` payload. |
| 2 | `api.py` — `POST /find-bottleneck` | Validates payload (≥1 active task). Fits `LogNormalBaseline` from `historical_tasks`. Computes dependency DAG in-degrees across `active_tasks`. |
| 3 | `api.py` — parallel loop | Dispatches `analyse_task()` to a thread-pool executor for each active task simultaneously via `asyncio.gather`. |
| 4 | `analyzer.py` — Step 1 | `get_task_duration_hours` → `baseline.is_stalled` → `compute_urgency_score`. Produces `is_stalled`, `stall_method`, `urgency_score`, `percentile_rank`. |
| 5 | `analyzer.py` — Step 2 | `classify_blocker_categories` (Groq API) → `analyse_sentiment` (VADER). Produces `blocker_categories`, `dominant_category`, `sentiment_score`, `negative_comments`. |
| 6 | `analyzer.py` — Step 3 | `build_mention_graph(negative_comments)`. Produces `mentioned_users` (sorted by `in_degree`), `bottleneck_user`. |
| 7 | `analyzer.py` — Step 4 | Applies `severity_multiplier` (`2.0` if `dep_in_degree > 0`). Calls `synthesize_diagnosis` (Groq) if any signal present. Produces `ai_diagnosis`. |
| 8 | `api.py` — post-parallel | Sorts all `TaskAnalysisResult` by `severity_multiplier × urgency_score` descending. Aggregates per-task mention graphs into `global_bottleneck` via `compute_global_bottleneck`. |
| 9 | `api.py` — Response | Returns `ProjectAnalysisResponse` with all results, `global_bottleneck_user`, timing, and counts. |

---

## 7. Node.js Integration (`aicontroller.js`)

The Node backend uses a shared `forwardToAI` helper that wraps every Python service call.

```javascript
// Route handler (Express)
router.post("/api/ai/find-bottleneck/:projectId", findBottleneck);

// Controller
export const findBottleneck = async (req, res) => {
  const { projectId } = req.params;
  const { activeTasks, historicalTasks, projectName } = req.body;

  if (!activeTasks || activeTasks.length === 0)
    return res.status(422).json({ error: "No active tasks provided." });

  await forwardToAI("/find-bottleneck", {
    project_id:       projectId,
    project_name:     projectName || projectId,
    active_tasks:     activeTasks,
    historical_tasks: historicalTasks || [],
  }, res);
};

// The Node route is responsible for:
// 1. Querying MongoDB for IN_PROGRESS tasks + their comments
// 2. Querying MongoDB for DONE / IN_REVIEW tasks (baseline)
// 3. Mapping Mongoose documents to the TaskPayload shape
// 4. Calling this controller
```

**Environment variable required on the Node side:**

```env
AI_SERVICE_URL=http://localhost:8001   # or your deployed Python service URL
```

---

## 8. Setup & Running

### Installation

```bash
# Create virtual environment
python -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and set GROK_API_KEY
```

### Running

```bash
# Development (hot-reload enabled)
python api.py

# Production
RELOAD=false uvicorn api:app --host 0.0.0.0 --port 8001 --workers 4

# Verify
curl http://localhost:8001/health
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi`, `uvicorn` | HTTP framework and ASGI server |
| `pydantic >= 2.0` | Request/response validation and serialisation |
| `openai >= 1.30` | Groq API client (OpenAI-compatible interface) |
| `vaderSentiment` | Local, zero-cost per-comment sentiment scoring |
| `python-dotenv` | `.env` loading |
| `httpx` | Internal HTTP health checks |
| `motor`, `pymongo` | Not used directly by this service — included for completeness |

---

## 9. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Manual trigger only (no polling)** | Avoid continuous LLM API costs. Analysis is expensive; running it on demand ensures intentional use and zero background overhead. |
| **Node owns MongoDB queries** | Python service stays stateless and testable with pure JSON payloads. No DB credentials needed in the AI service. |
| **Log-normal stall model** | Task durations are empirically right-skewed. Log-normal is the correct distributional choice over a simple mean ± n·sigma threshold. |
| **VADER for sentiment (not LLM)** | VADER runs locally in microseconds at zero cost. Scoring every comment with Groq would be prohibitively slow and expensive. |
| **Groq for blocker classification** | Contextual understanding is required. Rule-based keyword matching misses paraphrasing — e.g. "the ticket is in limbo" → `requirements` blocker. |
| **Mention graph on negative comments only** | Routine "updated status" comments add enormous noise. Filtering to negative comments ensures `@mentions` only appear in the context of actual friction. |
| **2× severity for critical-path tasks** | A task blocking 5 others must always surface first, even if its raw `urgency_score` is lower than an independent high-urgency task. |
| **Single-sentence AI diagnosis** | PMs need actionable outputs, not paragraphs. One sentence = one blocker + one action. |
| **Parallel task analysis (`asyncio`)** | Each task makes at least 2 Groq API calls. Sequential processing would be O(n × latency). Parallel reduces wall-clock time to ≈ max(individual task latencies). |

---


