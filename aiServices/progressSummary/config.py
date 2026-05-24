"""
config.py — Configuration settings for the Project Summary AI service.

Uses Pydantic BaseSettings for type-safe environment variable loading.
All settings can be overridden via a .env file in the same directory.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False

    # ── LLM Provider ──────────────────────────────────────────────────────────
    LLM_PROVIDER: str = "groq"          # groq | openai | anthropic | ollama
    LLM_MODEL: str = "llama3-8b-8192"   # Fast Groq model for low latency
    GROK_API_KEY: str = os.getenv("GROK_API_KEY", "")
    OPENAI_API_KEY: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    # CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    CORS_ORIGINS=["*"]

    # ── ML Health Score weights (must sum to 100) ─────────────────────────────
    # These can be tuned via .env without touching code
    WEIGHT_COMPLETION_RATE: float = 35.0   # % tasks in DONE
    WEIGHT_OVERDUE_PENALTY: float = 25.0   # tasks past dueDate not done
    WEIGHT_VELOCITY:        float = 20.0   # tasks completed in last 7 days
    WEIGHT_PRIORITY_BALANCE: float = 10.0  # ratio of open P0/P1 tasks
    WEIGHT_STALE_PENALTY:   float = 10.0   # tasks stuck IN_PROGRESS > 5 days

    # Stale threshold: days a task can sit in IN_PROGRESS before penalised
    STALE_DAYS_THRESHOLD: int = 5


settings = Settings()
