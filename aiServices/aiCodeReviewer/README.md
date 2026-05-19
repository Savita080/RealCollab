# Multi-Agent AI Code Reviewer

A modular, LangChain-based code review pipeline powered by specialised agents —
one per criteria. Scores are returned per-criteria so your Node.js backend
(or any client) can apply its own weights to compute a final score.

---

## Architecture

```
ReviewInput (code + language)
        │
        ▼
┌──────────────────────────────────────────────────┐
│              ReviewOrchestrator                  │
│  (runs agents in parallel via ThreadPoolExecutor)│
└──┬───────┬────────┬──────────┬────────┬──────────┘
   │       │        │          │        │        │
   ▼       ▼        ▼          ▼        ▼        ▼
Unused   Syntax  Security  Readability Perf  EdgeCase
Code     Agent   Agent     Agent      Agent  Agent
Agent
(fast    (main   (main     (main      (main  (main
 LLM)     LLM)   LLM)      LLM)       LLM)   LLM)
   │       │        │          │        │        │
   └───────┴────────┴──────────┴────────┴────────┘
                        │
                        ▼
                  ReviewReport
          { criteria → score, issues, suggestions }
                        │
              ┌─────────┴─────────┐
              │  (client-side)    │
              ▼                   ▼
       weighted_score()    raw per-criteria JSON
       (Python helper)     → sent to Node backend
```

---

## Project Structure

```
code_reviewer/
├── reviewer.py          ← CLI entry-point
├── orchestrator.py      ← Parallel agent runner
├── models.py            ← Pydantic schemas (ReviewInput, AgentResult, ReviewReport)
├── llm_provider.py      ← LLM factory — swap providers here
├── agents/
│   ├── __init__.py
│   ├── base_agent.py    ← BaseReviewAgent (inherit to add new agents)
│   └── review_agents.py ← 6 concrete agents
├── requirements.txt
└── .env.example
```

---

## Setup

```bash
cd code_reviewer
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your GROQ_API_KEY
```

---

## Usage

### CLI

```bash
# Review a file
python reviewer.py --file my_script.py --language Python --pretty

# Inline code
python reviewer.py --code "def foo(): pass" --language Python --pretty

# With custom weights (values need not sum to 1)
python reviewer.py --file app.py --language Python --pretty \
  --weights '{"security":0.4,"performance":0.3,"syntax":0.2,"readability":0.05,"unused_code":0.03,"edge_cases":0.02}'

# Sequential (for debugging)
python reviewer.py --file app.py --language Python --sequential --pretty
```

### Python API

```python
from models import ReviewInput
from orchestrator import ReviewOrchestrator

report = ReviewOrchestrator().run(
    ReviewInput(code=open("app.py").read(), language="Python")
)

# Raw JSON for Node.js
print(report.model_dump_json(indent=2))

# Python-side weighted score
weights = {"security": 0.4, "performance": 0.3, "syntax": 0.2,
           "readability": 0.05, "unused_code": 0.03, "edge_cases": 0.02}
print(report.weighted_score(weights))  # e.g. 84.5
```

### Node.js integration

```javascript
import { execSync } from "child_process";

function reviewCode(code, language, weights) {
  const result = execSync(
    `python reviewer.py --language "${language}" --weights '${JSON.stringify(weights)}'`,
    { input: code, encoding: "utf-8" }
  );
  const report = JSON.parse(result);

  // report.raw_scores  → { syntax: 90, security: 70, ... }
  // report.agent_results → full issues + suggestions per criteria
  // report.weighted_score → pre-computed if weights were passed

  return report;
}
```

---

## Switching LLM Providers

```bash
# Groq (default)
LLM_PROVIDER=groq python reviewer.py ...

# OpenAI
LLM_PROVIDER=openai OPENAI_API_KEY=sk-... python reviewer.py ...

# Anthropic
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... python reviewer.py ...

# Ollama (local)
LLM_PROVIDER=ollama python reviewer.py ...
```

Or set `LLM_PROVIDER` in your `.env`.

---

## Adding a New Agent

```python
# agents/review_agents.py
class DocumentationAgent(BaseReviewAgent):
    CRITERIA_NAME = "documentation"
    SYSTEM_PROMPT = """
    You are a technical writing expert. Check for missing docstrings,
    incomplete parameter documentation, and unclear module-level comments.
    Score 100 = fully documented.
    """.strip()

# orchestrator.py — add to DEFAULT_AGENTS
from agents.review_agents import DocumentationAgent
DEFAULT_AGENTS = [..., DocumentationAgent]
```

---

## Output Schema

```json
{
  "language": "Python",
  "raw_scores": {
    "unused_code": 95,
    "syntax": 100,
    "security": 60,
    "readability": 80,
    "performance": 75,
    "edge_cases": 55
  },
  "weighted_score": 72.5,
  "agent_results": [
    {
      "criteria": "security",
      "score": 60,
      "issues": ["Hardcoded API key on line 12", "SQL query built via string concatenation"],
      "suggestions": ["Use environment variables for secrets", "Use parameterised queries"],
      "summary": "Two critical security vulnerabilities detected."
    }
  ]
}
```
