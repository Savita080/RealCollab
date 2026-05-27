# AI Code Reviewer API Reference

This API reference covers the AI Code Reviewer, JS Code Reviewer, and Compiled Code Reviewer services, which all share the same API signature and orchestration pipeline but use language-specific preflight checks.

**Base URL:** `http://localhost:8000` *(configurable via `HOST` / `PORT` env vars)*

---

### GET /health

Returns service status. No authentication required.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "provider": "groq"
}
```

---

### GET /agents

Returns the list of criteria agents active in the pipeline.

**Response `200 OK`:**
```json
{
  "agents": [
    {
      "criteria": "clean_code",
      "uses_fast_llm": true
    },
    ...
  ]
}
```

---

### POST /review

Main analysis endpoint. Analyzes the provided source code against multiple criteria (security, readability, performance, etc.) using AI agents in parallel.

#### Request Body

```json
{
  "code": "def add(a, b):\n    unused = 42\n    return a + b",
  "language": "Python",
  "context": "Utility function for mathematical addition.",
  "weights": {
    "security": 0.4,
    "performance": 0.3,
    "syntax": 0.2,
    "readability": 0.05,
    "clean_code": 0.03,
    "robustness": 0.02
  }
}
```

| Field | Type | Description |
|---|---|---|
| `code` | `string` | **Required.** Raw source code as plain text. |
| `language` | `string` | **Required.** Programming language, e.g. "Python", "TypeScript". |
| `context` | `string` | Optional. Purpose of the code in ≤50 words. |
| `weights` | `object` | Optional. Per-criteria weights (normalised automatically). |

#### Response Schema

**Response `200 OK`:**
```json
{
  "language": "Python",
  "raw_scores": {
    "clean_code": 8.5,
    "syntax": 9.0,
    "security": 10.0
  },
  "weighted_score": 9.2,
  "agent_results": [
    {
      "criteria": "clean_code",
      "score": 8.5,
      "feedback": "Removed unused variable `unused`.",
      "code_snippet": "def add(a, b):\n    return a + b"
    }
  ],
  "duration_ms": 2345
}
```

---

### POST /review/stream

Streams agent results as Server-Sent Events (SSE). Use this to provide real-time feedback to users while the review is processing.

#### Request Body
*(Same as `POST /review`)*

#### Streaming Events (`text/event-stream`)

As each agent finishes, the server pushes an event.

**Event Chunk Example:**
```json
data: {"done": false, "result": {"criteria": "clean_code", "score": 8.5, "feedback": "...", "code_snippet": "..."}}

data: {"done": false, "result": {"criteria": "security", "score": 10.0, "feedback": "...", "code_snippet": null}}

data: {"done": true, "raw_scores": {"clean_code": 8.5, "security": 10.0}, "weighted_score": 9.25, "duration_ms": 2100}
```

#### Error Responses

| HTTP Status | Condition | Response body |
|-------------|-----------|---------------|
| `422` | `code` or `language` is missing/empty | `{"detail": "'code' must not be empty."}` |
| `200` | Preflight static analysis caught fatal syntax error | `{"language": "Python", "fatal_syntax_error": ["SyntaxError on line 1"], "agent_results": [], "duration_ms": 0}` |
