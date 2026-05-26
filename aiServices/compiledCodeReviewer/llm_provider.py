"""Groq LLM accessors — fast model for preflight/syntax, smart model for deep review."""
from __future__ import annotations

import os

from langchain_groq import ChatGroq

_fast_llm: ChatGroq | None = None
_smart_llm: ChatGroq | None = None


def get_fast_llm() -> ChatGroq:
    global _fast_llm
    if _fast_llm is None:
        _fast_llm = ChatGroq(
            model=os.getenv("GROQ_FAST_MODEL", "llama-3.1-8b-instant"),
            temperature=0.0,
            api_key=os.getenv("GROQ_API_KEY"),
        )
    return _fast_llm


def get_smart_llm() -> ChatGroq:
    global _smart_llm
    if _smart_llm is None:
        _smart_llm = ChatGroq(
            model=os.getenv("GROQ_SMART_MODEL", "llama-3.3-70b-versatile"),
            temperature=0.0,
            api_key=os.getenv("GROQ_API_KEY"),
        )
    return _smart_llm
