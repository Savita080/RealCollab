"""
llm_provider.py — Pluggable LLM provider for the Standup Report service.

Mirrors the pattern from aiCodeReviewer/llm_provider.py so all AI services
in the project use a consistent interface for swapping LLM backends.

Supports four providers:
  - Groq   (default, fastest — uses llama-3.3-70b-versatile)
  - OpenAI (GPT-4o)
  - Anthropic (Claude Sonnet)
  - Ollama (local models, no API key needed)

Usage:
    from llm_provider import get_llm, get_fast_llm

    llm = get_llm()                      # Full-power model for complex tasks
    fast_llm = get_fast_llm()            # Lightweight model for simple tasks
    response = llm.invoke("Summarise...") # Returns AIMessage
"""
from __future__ import annotations

import os
from langchain_core.language_models.chat_models import BaseChatModel

from config import settings


def get_llm(
    provider: str | None = None,
    model: str | None = None,
    temperature: float = 0.3,
    # Standup reports need some creativity for natural language summaries,
    # but not too much — 0.3 balances factuality with readability.
    **kwargs,
) -> BaseChatModel:
    """
    Returns a LangChain Chat model instance for the configured provider.

    Parameters:
        provider:    Override the default LLM provider (from env LLM_PROVIDER)
        model:       Override the default model name
        temperature: Controls randomness. 0.3 = mostly deterministic but readable
        **kwargs:    Extra args passed through to the LangChain constructor

    Returns:
        A BaseChatModel instance ready for .invoke() or .ainvoke()
    """
    provider = (provider or settings.LLM_PROVIDER).lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model or settings.GROQ_MODEL,
            temperature=temperature,
            api_key=settings.GROQ_API_KEY,
            **kwargs,
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or settings.OPENAI_MODEL,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
            **kwargs,
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model or settings.ANTHROPIC_MODEL,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY,
            **kwargs,
        )

    elif provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model or settings.OLLAMA_MODEL,
            temperature=temperature,
            **kwargs,
        )

    else:
        raise ValueError(
            f"Unknown LLM provider: '{provider}'. "
            f"Choose from: groq, openai, anthropic, ollama"
        )


def get_fast_llm(**kwargs) -> BaseChatModel:
    """
    Returns a lightweight / fast LLM for simpler tasks.

    Used for:
      - Individual chat chunk summarisation (MapReduce map phase)
      - Simple formatting tasks

    The full-power model (get_llm) is reserved for:
      - Final report generation
      - Complex multi-source synthesis
      - Reduce phase of MapReduce
    """
    provider = settings.LLM_PROVIDER.lower()

    # Each provider's fastest model
    fast_models = {
        "groq": "llama-3.1-8b-instant",
        "openai": "gpt-4o-mini",
        "anthropic": "claude-haiku-4-5-20251001",
        "ollama": "llama3",
    }

    model = os.getenv("FAST_LLM_MODEL", fast_models.get(provider, ""))
    return get_llm(model=model, **kwargs)
