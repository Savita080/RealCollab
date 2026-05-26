"""Shared Pydantic models for the compiled-languages code review pipeline."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AgentResult(BaseModel):
    criteria: str
    score: int = Field(..., ge=0, le=100)
    issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    summary: str = ""


class ReviewInput(BaseModel):
    code: str
    language: str
    context: Optional[str] = None
    numbered_code: str = ""
    dead_code_free_numbered_code: str = ""
    preflight: dict = Field(default_factory=dict)


class ReviewReport(BaseModel):
    language: str
    agent_results: List[AgentResult]
    raw_scores: dict = Field(default_factory=dict)

    def weighted_score(self, weights: Optional[dict[str, float]]) -> Optional[float]:
        if not weights:
            return None
        total_weight = sum(weights.values())
        if total_weight == 0:
            return None
        score = 0.0
        for criteria, weight in weights.items():
            agent_score = self.raw_scores.get(criteria, 0)
            score += agent_score * (weight / total_weight)
        return round(score, 2)
