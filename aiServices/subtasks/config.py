"""
config.py — Configuration settings for the Subtask Generator AI service.

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
    PORT: int = 8004
    RELOAD: bool = False

    # ── LLM Provider ──────────────────────────────────────────────────────────
    LLM_PROVIDER: str = "groq"              # groq | openai
    LLM_MODEL: str = "llama-3.3-70b-versatile" # Default Groq model
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
