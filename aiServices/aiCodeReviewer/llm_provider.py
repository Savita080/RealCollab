"""
this will enable us to switch between llm providers as and when we like 
"""

import os
from langchain_core.language_models.chat_models import BaseChatModel

# will return us a Chat object of that provider
def get_llm(
    provider: str | None = None,
    model: str | None = None,
    temperature: float = 0.1, 
    #its a reviewer, we would want it to be very precise therefore temp=0.1
    **kwargs,
) -> BaseChatModel:
    provider = (provider or os.getenv("LLM_PROVIDER", "groq")).lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            temperature=temperature,
            api_key=os.getenv("GROQ_API_KEY"),
            **kwargs,
        )

    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or os.getenv("OPENAI_MODEL", "gpt-4o"),
            temperature=temperature,
            api_key=os.getenv("OPENAI_API_KEY"),
            **kwargs,
        )

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
            temperature=temperature,
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            **kwargs,
        )

    elif provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model or os.getenv("OLLAMA_MODEL", "llama3"),
            temperature=temperature,
            **kwargs,
        )

    else:
        raise ValueError(
            f"Unknown provider: '{provider}'. Choose from: groq, openai, anthropic, ollama"
        )

# return Chat object of faster model of a provider : will help us finsih easy tasks quickly , only complex tasks use slower and complex models
def get_fast_llm(**kwargs) -> BaseChatModel:
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    fast_models = {
        "groq": "llama-3.1-8b-instant",
        "openai": "gpt-4o-mini",
        "anthropic": "claude-haiku-4-5-20251001",
        "ollama": "llama3",
    }
    model = os.getenv("FAST_LLM_MODEL", fast_models.get(provider, ""))
    return get_llm(model=model, **kwargs)
