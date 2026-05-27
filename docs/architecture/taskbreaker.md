# Task Breaker Service

> Agentic AI subtask breakdown microservice — v1.1.0

[![Stack](https://img.shields.io/badge/stack-Python%20%2F%20FastAPI-blue)](https://fastapi.tiangolo.com)
[![LLM](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com)
[![Trigger](https://img.shields.io/badge/trigger-manual%20%28Node%20backend%29-green)]()

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Two-Step Agentic Pipeline](#2-the-two-step-agentic-pipeline)
3. [Structured Output Implementation](#3-structured-output-implementation)
4. [Data Flow](#4-data-flow)

---

## 1. Overview

The **Task Breaker** is an intelligent orchestration layer designed to convert high-level feature requests (e.g., "Add Google OAuth login") into 4-5 granular, executable subtasks. 

Instead of generating subtasks blindly, it acts as an agentic system that can halt and ask the user **clarifying questions** if the feature request is ambiguous.

---

## 2. The Two-Step Agentic Pipeline

The system is split into two discrete API endpoints to facilitate human-in-the-loop interactions.

### Step 1: AI Analysis (`POST /api/analyze`)
- The Node backend sends the feature description along with project context (project name, description, and an array of existing tasks to prevent duplication).
- The LLM acts as an architect. It analyzes the prompt.
- **If unambiguous**: Returns `is_ambiguous: false`.
- **If ambiguous**: Returns `is_ambiguous: true` and generates a list of multiple-choice clarifying questions (e.g., "Do you want to use Passport.js or a different library?").

*(The UI displays these questions to the user, who selects their answers).*

### Step 2: Task Breakdown (`POST /api/breakdown`)
- The Node backend sends the original prompt **plus** the user's answers to the clarifying questions.
- The LLM generates the final tasks, assigning each a:
  - `title`
  - `description`
  - `priority` (P0/P1/P2)
  - `labels` (e.g., backend, UI, database)
  - `dependencies` (if Task B relies on Task A)

---

## 3. Structured Output Implementation (`breaker.py`)

Unlike older systems that struggle with parsing raw Markdown from LLMs, this service utilizes LangChain's `with_structured_output` mapping directly to Pydantic schemas. 

The LLM is invoked with a strict temperature (`temperature=0.0`) to ensure absolute deterministic adherence to the JSON schema, preventing runtime parsing errors in the FastAPI controllers.

---

## 4. Data Flow

1. User types "Create a user profile page" and clicks "AI Breakdown".
2. Node backend forwards to `/api/analyze`.
3. Task Breaker returns multiple-choice questions (e.g., "Does the profile need an avatar upload?").
4. User selects "Yes, with AWS S3" in the UI.
5. Node backend forwards original prompt + answers to `/api/breakdown`.
6. Task Breaker returns 4 concrete subtasks (UI, API endpoint, S3 Bucket setup, DB migration).
7. Node backend saves the new tasks to MongoDB.
