# Daily Standup Report Generator

> AI-powered role-based daily standup report microservice — v1.0.0

[![Stack](https://img.shields.io/badge/stack-Python%20%2F%20FastAPI-blue)](https://fastapi.tiangolo.com)
[![LLM](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com)
[![Trigger](https://img.shields.io/badge/trigger-manual%20%28Node%20backend%29-green)]()

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role-Based Generation Routing](#2-role-based-generation-routing)
3. [Activity Pulse Algorithm](#3-activity-pulse-algorithm)
4. [Map-Reduce Chat Summarization](#4-map-reduce-chat-summarization)
5. [End-to-End Data Flow](#5-end-to-end-data-flow)

---

## 1. Overview

The **Standup Report Generator** evaluates project activity over the last 24 hours to automatically generate a personalized "daily standup". 

As a **pure-compute layer**, it expects the Node.js backend to provide all raw data (tasks moved, chat messages sent, wiki pages edited).

---

## 2. Role-Based Generation Routing (`report_generator.py`)

The service outputs entirely different data structures based on the user's workspace role:

### ADMIN / OWNER (Bird's-Eye View)
- Sees a high-level summary of the entire workspace.
- Highlights new members and role changes.
- Projects are sorted by activity level.
- LLM generates a highly concise 2-3 sentence overview per project.

### MEMBER / VIEWER (Contributor View)
- Detailed per-project granular view.
- Sees exact tasks that moved (table format).
- LLM reads the raw project chat logs and generates a 3-5 bullet point summary of discussions.
- Summarizes wiki document changes and whiteboard edits.

---

## 3. Activity Pulse Algorithm (`activity_pulse.py`)

To sort projects and measure their heartbeat, the service calculates an "Activity Pulse" mathematically using an exponential decay formula. 

```
S = 1 - e^(-k * count)
```

Where:
- `k` is a decay constant specific to the action type.
- `count` is the number of events (e.g., chat messages) in the last 24 hours.

**Weights:**
- Task Movements: 50%
- Chat Messages: 30%
- Wiki Edits: 20%

*Rationale:* A project with 5 chat messages gets a moderate score, 50 messages gets a high score, but 500 messages caps out safely near 100 without breaking the scale.

---

## 4. Map-Reduce Chat Summarization (`chat_summariser.py`)

If a project has 500 chat messages, sending them all to a large LLM is slow and expensive. The service implements a **Map-Reduce** pattern:

1. **Chunking**: Chat logs are split into chunks of 30 messages.
2. **Map**: A fast, inexpensive LLM (`llama-3.1-8b-instant`) summarizes each chunk into key points in parallel using `asyncio.gather()`.
3. **Reduce**: The large, intelligent LLM (`llama-3.3-70b-versatile`) takes the chunk summaries and synthesizes them into the final 3-5 bullet point output for the user.

---

## 5. End-to-End Data Flow

1. User clicks "Generate Standup".
2. Node backend queries MongoDB for the user's projects and gathers all entities modified in the last 24 hours (`updatedAt > now - 24h`).
3. Node POSTs `StandupRequest` to `:8003/api/standup`.
4. Python routes to Admin or Contributor workflow.
5. Python computes Activity Pulse math (instant).
6. Python runs Chat and Wiki summarization in parallel LLM calls.
7. Final personalized `StandupResponse` is returned to the user.
