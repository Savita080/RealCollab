"""
config.py — Centralised settings for the Standup Report AI microservice.

All configuration is loaded from environment variables (with sensible defaults).
This keeps secrets out of source code and makes deployment flexible.

Usage:
    from config import settings
    print(settings.GROQ_API_KEY)
"""
from __future__ import annotations

import os
from dotenv import load_dotenv

# Load .env file if present (development convenience)
load_dotenv()


class Settings:
    """
    Single source of truth for every tuneable knob in the service.
    Grouped by concern for readability.
    """

    # ── LLM Provider ──────────────────────────────────────────────────────────
    # Which LLM backend to use. Options: "groq", "openai", "anthropic", "ollama"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")

    # Groq-specific (default provider)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # OpenAI-specific
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

    # Anthropic-specific
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    # Ollama-specific (local models)
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")

    # ── Activity Pulse Weights ────────────────────────────────────────────────
    # These weights determine how each signal contributes to the final pulse score.
    # They MUST sum to 1.0 for the score to stay in the 0-100 range.
    #
    # Rationale from the product spec:
    #   - Chat (0.2): easy to generate noise, so lower weight
    #   - Tasks (0.4): direct indicator of real work being done
    #   - Wiki/Docs (0.4): documentation updates signal meaningful progress
    WEIGHT_CHAT: float = float(os.getenv("WEIGHT_CHAT", "0.2"))
    WEIGHT_TASKS: float = float(os.getenv("WEIGHT_TASKS", "0.4"))
    WEIGHT_WIKI: float = float(os.getenv("WEIGHT_WIKI", "0.4"))

    # ── Activity Pulse Decay Constants (k) ────────────────────────────────────
    # These control how quickly the sub-score saturates for each signal.
    # Formula: sub_score = 100 * (1 - e^(-k * count))
    #
    # Higher k = saturates faster (fewer events needed to hit ~100)
    # Lower k  = needs more events to reach high scores
    #
    # Tuned so that:
    #   - 50 chat messages → ~92 score (chat is naturally high-volume)
    #   - 10 task movements → ~86 score (moderate volume)
    #   - 5 wiki edits     → ~78 score (low volume but high value)
    K_CHAT: float = float(os.getenv("K_CHAT", "0.05"))
    K_TASKS: float = float(os.getenv("K_TASKS", "0.2"))
    K_WIKI: float = float(os.getenv("K_WIKI", "0.3"))

    # ── Chat Summarisation ────────────────────────────────────────────────────
    # Maximum messages per chunk in the MapReduce summarisation pipeline.
    # Smaller chunks = better per-chunk summaries but more LLM calls.
    # 30 is a sweet spot: ~2000 tokens per chunk, well within context limits.
    CHAT_CHUNK_SIZE: int = int(os.getenv("CHAT_CHUNK_SIZE", "30"))

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8002"))
    RELOAD: bool = os.getenv("RELOAD", "true").lower() == "true"
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")


# Singleton instance — import this everywhere
settings = Settings()
