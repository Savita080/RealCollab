"""Agent registry — selects C++, Java, or Go agent sets by language."""
from __future__ import annotations

import os
import sys
from typing import List, Type

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from agents.base import BaseReviewAgent
from agents.cpp_agents import CPP_AGENTS
from agents.go_agents import GO_AGENTS
from agents.java_agents import JAVA_AGENTS
from preflight import normalize_language

_AGENT_REGISTRY = {
    "cpp": CPP_AGENTS,
    "java": JAVA_AGENTS,
    "go": GO_AGENTS,
}


def get_agent_classes(language: str) -> List[Type[BaseReviewAgent]]:
    lang = normalize_language(language)
    return _AGENT_REGISTRY[lang]


__all__ = [
    "BaseReviewAgent",
    "get_agent_classes",
    "CPP_AGENTS",
    "JAVA_AGENTS",
    "GO_AGENTS",
]
