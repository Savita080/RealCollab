from __future__ import annotations

import concurrent.futures
import os
import sys
from typing import List, Type

# ── Path guard ────────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

from models import ReviewInput, ReviewReport, AgentResult
from agents.base_agent import BaseReviewAgent
from agents import (
    UnusedCodeAgent,
    SyntaxAgent,
    SecurityAgent,
    ReadabilityAgent,
    PerformanceAgent,
    EdgeCaseAgent,
)

DEFAULT_AGENTS: List[Type[BaseReviewAgent]] = [
    UnusedCodeAgent,
    SyntaxAgent,
    SecurityAgent,
    ReadabilityAgent,
    PerformanceAgent,
    EdgeCaseAgent,
]


class ReviewOrchestrator:
    def __init__(
        self,
        agent_classes: List[Type[BaseReviewAgent]] | None = None,
        parallel: bool = True,
        max_workers: int = 6,
    ):
        self._agent_classes = agent_classes or DEFAULT_AGENTS
        self._parallel = parallel
        self._max_workers = max_workers
        self._agents: List[BaseReviewAgent] = [cls() for cls in self._agent_classes]


    # the main run  func which calls each agent : either parallely(one doesnt wait for anothers work to get over) or 1 by one
    def run(self, input: ReviewInput) -> ReviewReport:
        results = self._run_parallel(input) if self._parallel else self._run_sequential(input)
        raw_scores = {r.criteria: r.score for r in results}
        return ReviewReport(language=input.language, agent_results=results, raw_scores=raw_scores)

    def _run_sequential(self, input: ReviewInput) -> List[AgentResult]:
        return [agent.review(input) for agent in self._agents]

    def _run_parallel(self, input: ReviewInput) -> List[AgentResult]:
        results: List[AgentResult] = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self._max_workers) as pool:
            futures = {pool.submit(agent.review, input): agent for agent in self._agents}
            for future in concurrent.futures.as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as exc:
                    agent = futures[future]
                    results.append(AgentResult(
                        criteria=agent.CRITERIA_NAME,
                        score=0,
                        issues=[f"Agent raised an exception: {exc}"],
                        suggestions=[],
                        summary="Agent error.",
                    ))
        order = {cls.CRITERIA_NAME: i for i, cls in enumerate(self._agent_classes)}
        results.sort(key=lambda r: order.get(r.criteria, 99))
        return results
