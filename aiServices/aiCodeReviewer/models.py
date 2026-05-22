"""
Shared Pydantic models for the code review pipeline.
"""
from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


class ReviewInput(BaseModel):
    code: str = Field(..., description="The raw source code to review.")
    language: str = Field(..., description="Programming language (e.g. 'Python', 'TypeScript').")
    context: Optional[str] = Field(None, description="Purpose of the code in ≤50 words.")
    numbered_code: str = Field(
        "",
        description="Original code with [L<n>] line numbers — set by pipeline, not user.",
    )
    dead_code_free_numbered_code: str = Field(
        "",
        description=(
            "Dead-code-free source with [L<n>] line numbers — dead lines blanked, "
            "commented-out blocks replaced. Used by Security/Readability/Performance/Robustness agents."
        ),
    )
    preflight: dict = Field(
        default_factory=dict,
        description="Static analysis results from preflight (errors, dead_code, commented_out_blocks).",
    )


class AgentResult(BaseModel):
    """Output from a single review agent."""
    criteria: str           = Field(..., description="Short name for the criteria reviewed.")
    score: int              = Field(..., ge=0, le=100, description="Score 0-100.")
    issues: List[str]       = Field(default_factory=list, description="Specific issues found.")
    suggestions: List[str]  = Field(default_factory=list, description="Actionable improvements.")
    summary: str            = Field("", description="One-sentence summary.")


class ReviewReport(BaseModel):
    """Final aggregated report returned to the caller."""
    language: str
    agent_results: List[AgentResult]
    raw_scores: dict = Field(default_factory=dict, description="criteria -> score mapping.")

    def weighted_score(self, weights: dict[str, float]) -> float:
        """
        Compute a weighted aggregate score.

        weights: { "unused_code": 0.1, "syntax": 0.2, ... }
        Missing keys default to equal weight.
        Total need not sum to 1 — will be normalised.
        """
        total_weight = 0.0
        weighted_sum = 0.0
        for result in self.agent_results:
            w = weights.get(result.criteria, 1.0)
            weighted_sum += result.score * w
            total_weight += w
        return round(weighted_sum / total_weight, 2) if total_weight else 0.0