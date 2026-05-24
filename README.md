# DevCollab

> **A real-time collaboration platform for student dev teams — GitHub + Notion + Slack, in one workspace.**

DevCollab is an all-in-one workspace built for hackathon teams, college projects, and small dev squads. Plan tasks on a live Kanban board, share code snippets, write versioned docs, sketch ideas on a shared whiteboard, and let AI handle the standups, code reviews, and bottleneck reports.

Built for **DevFusion 2.0** Hackathon.

---

## Features

| Domain | What you get |
|---|---|
| **Workspaces & Projects** | Multi-tenant workspaces with role-based access (OWNER / ADMIN / MEMBER / VIEWER). Each workspace holds many projects with their own contributor list. |
| **Tasks & Kanban** | Drag-and-drop kanban (`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`), priorities, assignees, due dates, labels, file attachments. Real-time sync across all viewers. |
| **Real-Time Chat** | Per-project and per-workspace channels. Live message delivery via Socket.IO. |
| **Code Snippets** | Language-tagged snippet library per project with search, syntax highlighting, and tags. |
| **Documentation Wiki** | Markdown wiki pages with full version history and required commit messages — like a lightweight Confluence with Git semantics. |
| **Whiteboards** | Excalidraw-powered collaborative canvas with real-time stroke broadcast and Redis-backed caching. |
| **AI Project Assistant** | One-click standup reports, project summaries, bottleneck analysis, and AI-generated task breakdowns from a feature description. |
| **AI Code Reviewer** | Multi-agent review pipeline (clean code, syntax, security, readability, performance, robustness) with scored reports. |
| **@Mentions & Notifications** | `@username` in comments auto-notifies via Socket.IO + persistent notification feed. |
| **Activity Feed** | Per-project audit trail of every action (tasks, wiki edits, member changes, etc.). |
| **User Profiles** | Bio, avatar, GitHub URL, skill tags. |
| **Payments** | Razorpay-powered FREE → PRO upgrades (test-mode friendly, no KYC needed for development). |

---

## Architecture

Three independent services. Each runs on its own port and can be developed in isolation.

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Frontend   │◄────►│     Backend      │◄────►│   AI Services    │
│ React + Vite │ HTTP │ Express + Socket │ HTTP │ FastAPI (Python) │
│  :5173       │  WS  │  :3000           │      │  :8000 / :8001   │
└──────────────┘      └────────┬─────────┘      └──────────────────┘
                               │
                       ┌───────┴────────┐
                       │ MongoDB  Redis │
                       └────────────────┘
```

| Service | Stack | Purpose |
|---|---|---|
| `backend/` | Node.js, Express 5, Socket.IO, Mongoose, Redis, JWT, Razorpay | Core REST API, real-time events, auth, RBAC, billing |
| `frontend/` | React 19, Vite, React Router, Zustand, socket.io-client, @hello-pangea/dnd | Single-page app — Kanban, chat, wiki editor, whiteboard |
| `aiServices/` | Python, FastAPI, LangChain, Groq | Multi-agent AI pipelines for code review, standups, bottleneck detection, progress reports |

---

## Tech Stack

**Backend:** Node.js · Express v5 · MongoDB (Mongoose v9) · Redis (ioredis) · Socket.IO v4 · JWT · Google OAuth · Brevo (email) · Razorpay (payments)

**Frontend:** React 19 · Vite · React Router v7 · Zustand · socket.io-client · @hello-pangea/dnd · Axios

**AI Services:** Python · FastAPI · LangChain · Groq LLM · Pydantic

**Infra:** MongoDB Atlas · Upstash Redis (optional) · ES Modules throughout

---

## Quick Start

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)
- Redis instance (optional — backend degrades gracefully without it)

### 1. Clone
```bash
git clone <repo-url> RealCollab
cd RealCollab
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
npm run dev                # → http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # → http://localhost:5173
```

### 4. AI Services
Each AI service runs independently on its own port.

```bash
cd aiServices/aiCodeReviewer
pip install -r requirements.txt
python api.py              # → http://localhost:8000
```

Other AI services (`standupReport`, `blocker`, `progressSummary`) follow the same pattern — `pip install -r requirements.txt && python api.py`.

### 5. Verify
```bash
curl http://localhost:3000
# { "message": "RealCollab Backend Is running" }
```

---

## Plan Limits

| Resource | FREE | PRO (₹499 / year) |
|---|---|---|
| Workspaces | 1 | Unlimited |
| Projects per workspace | 3 | Unlimited |
| Members per workspace | 5 | 50 |
| Tasks per project | 50 | Unlimited |
| Wiki pages per project | 10 | Unlimited |
| Whiteboards per project | 2 | Unlimited |
| Snippets per project | 20 | Unlimited |
| AI requests per month | 10 | 200 |

Limits are enforced at the API layer via `planLimits` middleware. Upgrades flow through Razorpay Orders API with HMAC signature verification.

---

## Project Structure

```
RealCollab/
├── backend/                 # Node.js REST + Socket.IO server
│   ├── controllers/         # Domain handlers
│   ├── middleware/          # auth, rbac, planLimits
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express routers
│   ├── sockets/             # kanban + whiteboard real-time
│   └── README.md            # Backend setup + env vars
│
├── frontend/                # React 19 + Vite SPA
│   └── src/                 # Components, pages, store, hooks
│
├── aiServices/              # FastAPI microservices
│   ├── aiCodeReviewer/      # Multi-agent code review (LangChain + Groq)
│   ├── standupReport/       # Auto-generated standups from activity
│   ├── blocker/             # Bottleneck + dependency stall detection
│   └── progressSummary/     # Project health + insights
│
└── docs/
    └── api/
        └── backend_api.md   # Full REST + Socket.IO reference
```

---

## Documentation

- **Backend setup & env vars:** [`backend/README.md`](backend/README.md)
- **Full API reference:** [`docs/api/backend_api.md`](docs/api/backend_api.md)
- **AI services overview:** [`aiServices/ai_services_documentation.md`](aiServices/ai_services_documentation.md)

---

## Team

Built by a 3-person team for DevFusion 2.0:
- **Backend** — Node.js API, real-time, RBAC, billing
- **Frontend** — React SPA, Kanban, whiteboard, wiki editor
- **AI Services** — Multi-agent FastAPI pipelines

---

## License

ISC
