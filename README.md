<div align="center">

# 🚀 DevCollab

### **The all-in-one workspace where student dev teams actually ship.**

*GitHub's code intelligence. Notion's docs. Slack's chat. Linear's kanban. One tab. Zero context-switching.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat&logo=socket.io&logoColor=white)](https://socket.io)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-Groq-1C3C3C?style=flat)](https://langchain.com)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

**Built for [DevFusion 2.0](#) Hackathon** · *3-person team · 14 days · ~30 endpoints · 6 AI agents*

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Docs](docs/api/backend_api.md) · [Plans](#-pricing)

---

</div>

## 💡 The Problem

Student dev teams spend more time **switching tools** than **shipping code**. Tasks live in Trello. Code lives in GitHub. Notes live in Notion. Discussions die in Discord. Standups never happen because no one wants to summarize what they did yesterday.

## ✨ The Solution

**DevCollab** unifies it all — and adds a layer of AI that handles the boring parts so your team can focus on building.

---

## 🎯 Features

<table>
<tr>
<td width="50%" valign="top">

### 🏢 Workspaces & Projects
Multi-tenant workspaces with **two-tier RBAC** — workspace roles (`OWNER`/`ADMIN`/`MEMBER`/`VIEWER`) and project roles (`CONTRIBUTOR`/`VIEWER`). Email invites via Brevo. Ownership transfer. Member management.

### 📋 Live Kanban Board
Drag-and-drop tasks across `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`. Priorities (`P0`/`P1`/`P2`), assignees, due dates, labels, and file attachments. **Every move syncs to every viewer in real time.**

### 💬 Real-Time Chat
Per-project and per-workspace channels. Messages broadcast over Socket.IO with online-presence tracking via Redis.

### 🧠 AI Project Assistant
One-click **standup reports**, **project summaries**, **bottleneck analysis**, and **AI-generated task breakdowns** — just describe a feature, get a backlog.

### 🔍 AI Code Reviewer
Paste any snippet → six specialist agents review it in parallel: clean code, syntax, security, readability, performance, robustness. Returns a scored report with line-level feedback.

</td>
<td width="50%" valign="top">

### 📚 Versioned Wiki
Markdown pages with **full version history** and **required commit messages** (min 10 chars). Rollback any change. Like Confluence with Git semantics.

### 🎨 Collaborative Whiteboard
Excalidraw-powered canvas with real-time stroke broadcast. Redis caches live state, MongoDB persists every 10s. Sketch architectures together.

### 💻 Snippet Library
Language-tagged snippets per project with search, syntax highlighting, and AI review built in. No more "where did I save that regex?"

### 🔔 @Mentions & Notifications
`@username` in comments auto-detects, persists a notification, and pushes a live Socket.IO event if the user is online. Mark-all-read. Done.

### 📊 Activity Feed
Per-project audit trail of every action — task moves, wiki edits, member changes, role updates. Latest 50 entries, populated with user details.

### 💳 Razorpay Payments
FREE → PRO upgrade flow using Razorpay **Orders API** with HMAC signature verification. **No KYC required for development** — test keys work out of the box.

</td>
</tr>
</table>

---

## 🏗️ Architecture

Three independent services. Each runs on its own port. Each scales on its own.

```
                          ┌─────────────────────────┐
                          │   👤  Browser Client    │
                          │     React 19 · Vite     │
                          │       :5173             │
                          └────────────┬────────────┘
                                       │ HTTPS · WebSocket
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │              Backend  ·  Express 5 + Socket.IO           │
        │                       :3000                              │
        │  ┌────────────┬────────────┬────────────┬─────────────┐  │
        │  │   Auth     │    RBAC    │ PlanLimits │   Sockets   │  │
        │  │  JWT/OAuth │ 2-tier     │ FREE/PRO   │ Kanban + WB │  │
        │  └────────────┴────────────┴────────────┴─────────────┘  │
        └──────┬─────────────────┬──────────────────┬──────────────┘
               │                 │                  │
               ▼                 ▼                  ▼
       ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐
       │   MongoDB    │  │    Redis     │  │   AI Services (4)     │
       │   Atlas      │  │   ioredis    │  │   FastAPI · LangChain │
       │              │  │  (optional)  │  │   Groq LLM            │
       │ 13 models    │  │ presence +   │  │ • Code Reviewer :8000 │
       │              │  │ whiteboard   │  │ • Standup Report      │
       │              │  │ cache        │  │ • Bottleneck Detector │
       │              │  │              │  │ • Progress Summary    │
       └──────────────┘  └──────────────┘  └───────────────────────┘
```

| Service | Stack | Purpose |
|---|---|---|
| 🟢 **`backend/`** | Node.js · Express 5 · Socket.IO 4 · Mongoose 9 · Redis · JWT · Razorpay · Brevo | REST API, real-time events, auth, RBAC, billing, plan limits |
| 🔵 **`frontend/`** | React 19 · Vite 8 · Router 7 · Zustand · socket.io-client · @hello-pangea/dnd | SPA — Kanban, chat, wiki editor, whiteboard, billing UI |
| 🟣 **`aiServices/`** | Python · FastAPI · LangChain · Groq · Pydantic | 4 microservices — code review, standups, bottlenecks, progress |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top"><b>🟢 Backend</b></td>
<td>Node.js 18+ · Express v5 · MongoDB (Mongoose v9) · Redis (ioredis) · Socket.IO v4 · JWT · Google OAuth · Brevo · Razorpay Orders API · ES Modules</td>
</tr>
<tr>
<td valign="top"><b>🔵 Frontend</b></td>
<td>React 19 · Vite 8 · React Router v7 · Zustand · Axios · socket.io-client · @hello-pangea/dnd · Excalidraw</td>
</tr>
<tr>
<td valign="top"><b>🟣 AI</b></td>
<td>Python 3.10+ · FastAPI · LangChain · Groq LLM · Pydantic · Multi-agent orchestration · SSE streaming</td>
</tr>
<tr>
<td valign="top"><b>☁️ Infra</b></td>
<td>MongoDB Atlas · Upstash Redis · Brevo SMTP · Razorpay · Google Cloud OAuth</td>
</tr>
</table>

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ · **Python** 3.10+
- **MongoDB Atlas** account (or local MongoDB)
- **Redis** *(optional — backend degrades gracefully)*

### 1️⃣ Clone

```bash
git clone <repo-url> RealCollab && cd RealCollab
```

### 2️⃣ Backend

```bash
cd backend
npm install
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
npm run dev                # → http://localhost:3000
```

> 📖 Full env reference: [`backend/README.md`](backend/README.md)

### 3️⃣ Frontend

```bash
cd frontend
npm install
npm run dev                # → http://localhost:5173
```

### 4️⃣ AI Services

Each AI service is a standalone FastAPI app. Run any subset you need.

```bash
cd aiServices/aiCodeReviewer
pip install -r requirements.txt
python api.py              # → http://localhost:8000
```

Repeat for `standupReport/`, `blocker/`, `progressSummary/`.

### ✅ Verify

```bash
curl http://localhost:3000
# { "message": "RealCollab Backend Is running" }
```

Open `http://localhost:5173` and you're in.

---

## 💎 Pricing

<div align="center">

|  | 🆓 **FREE** | 💎 **PRO** — ₹499 / year |
|---|:---:|:---:|
| **Workspaces** | 1 | ♾️ Unlimited |
| **Projects** per workspace | 3 | ♾️ Unlimited |
| **Members** per workspace | 5 | 50 |
| **Tasks** per project | 50 | ♾️ Unlimited |
| **Wiki pages** per project | 10 | ♾️ Unlimited |
| **Whiteboards** per project | 2 | ♾️ Unlimited |
| **Snippets** per project | 20 | ♾️ Unlimited |
| **AI requests** per month | 10 | 200 |

</div>

Enforced at the API layer via `planLimits` middleware. Upgrades go through Razorpay's Orders API with HMAC-SHA256 signature verification — no webhooks, no KYC, no friction.

---

## 📁 Project Structure

```
RealCollab/
├── 🟢 backend/                    Node.js · Express 5 · Socket.IO
│   ├── controllers/              Domain handlers (auth, tasks, wiki…)
│   ├── middleware/               auth · rbac · planLimits
│   ├── models/                   13 Mongoose schemas
│   ├── routes/                   Express routers (one per domain)
│   ├── sockets/                  kanbanSocket + whiteboardSocket
│   ├── main.js                   Entry point
│   └── README.md                 Setup & env reference
│
├── 🔵 frontend/                   React 19 · Vite SPA
│   └── src/                      Components · pages · store · hooks
│
├── 🟣 aiServices/                 FastAPI microservices
│   ├── aiCodeReviewer/           Multi-agent review (6 specialists)
│   ├── standupReport/            Auto standups from activity logs
│   ├── blocker/                  Bottleneck + dependency stall detection
│   └── progressSummary/          Project health + insights
│
└── 📚 docs/
    └── api/backend_api.md         Full REST + Socket.IO reference
```

---

## 📡 API at a Glance

```
POST   /api/auth/register                                     Register
POST   /api/auth/login                                        Email/password
POST   /api/auth/google                                       Google OAuth

POST   /api/workspaces                                        Create workspace
POST   /api/workspaces/:wId/projects                          Create project
POST   /api/workspaces/:wId/projects/:pId/tasks               Create task
PATCH  /api/workspaces/:wId/projects/:pId/tasks/:tId          Update task
POST   /api/tasks/:taskId/comments                            Comment + @mentions

POST   /api/ai/review-code                                    AI code review
POST   /api/ai/standup                                        Generate standup
POST   /api/ai/bottleneck                                     Detect bottlenecks

POST   /api/subscriptions/:wId/subscribe                      Razorpay order
POST   /api/subscriptions/:wId/verify                         HMAC verify → PRO
```

> 📖 **Full reference (30+ endpoints + 16 Socket.IO events):** [`docs/api/backend_api.md`](docs/api/backend_api.md)

---

## 🌟 What Makes It Different

- ⚡ **Real-time first** — every kanban move, comment, whiteboard stroke broadcasts instantly
- 🔐 **Two-tier RBAC** — workspace roles + project roles, with workspace admins bypassing project checks
- 📜 **Git-style wiki** — required commit messages on every content change, full version history
- 🤖 **Multi-agent AI** — 6 parallel specialists per code review, not a single-prompt pass
- 💳 **Friction-free billing** — Razorpay Orders API means **no KYC for dev**, just test keys
- 🛡️ **Graceful degradation** — Redis is optional, AI services are optional, app keeps running
- 📦 **Zero monorepo tooling** — three independent services, three independent deploys

---

## 👥 Team

Built by a 3-person hackathon squad in 14 days:

| Role | Owner | Scope |
|---|---|---|
| 🟢 **Backend** | Aditya | REST API, real-time, RBAC, billing, infra |
| 🔵 **Frontend** | — | React SPA, Kanban UI, whiteboard, wiki editor |
| 🟣 **AI** | — | 4 FastAPI services, multi-agent pipelines, LangChain + Groq |

---

## 📖 Documentation

- 🟢 [**Backend Setup & Env Vars**](backend/README.md)
- 📡 [**Full API Reference**](docs/api/backend_api.md) — every REST endpoint + every Socket.IO event
- 🟣 [**AI Services Overview**](aiServices/ai_services_documentation.md)
- 🤖 [**AI Technical Report**](aiServices/ai_services_technical_report.md)

---

## 📜 License

ISC

<div align="center">

---

**Made with ☕ and panic for DevFusion 2.0**

*If you ship faster with this, that's the point.*

</div>
