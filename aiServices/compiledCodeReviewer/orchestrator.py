"""Runs language-specific agent sets in parallel or sequentially."""
from __future__ import annotations

import concurrent.futures
import os
import sys
from typing import List

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from agents import get_agent_classes
from agents.base import BaseReviewAgent
from models import AgentResult, ReviewInput, ReviewReport


class ReviewOrchestrator:
    def __init__(self, parallel: bool = True, max_workers: int = 6):
        self._parallel = parallel
        self._max_workers = max_workers

    def run(self, input: ReviewInput) -> ReviewReport:
        agent_classes = get_agent_classes(input.language)
        agents: List[BaseReviewAgent] = [cls() for cls in agent_classes]
        results = (
            self._run_parallel(agents, agent_classes, input)
            if self._parallel
            else self._run_sequential(agents, input)
        )
        raw_scores = {r.criteria: r.score for r in results}
        return ReviewReport(
            language=input.language,
            agent_results=results,
            raw_scores=raw_scores,
        )

    def _run_sequential(
        self, agents: List[BaseReviewAgent], input: ReviewInput
    ) -> List[AgentResult]:
        return [agent.review(input) for agent in agents]

    def _run_parallel(
        self,
        agents: List[BaseReviewAgent],
        agent_classes: list,
        input: ReviewInput,
    ) -> List[AgentResult]:
        results: List[AgentResult] = []
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=self._max_workers
        ) as pool:
            futures = {pool.submit(a.review, input): a for a in agents}
            for future in concurrent.futures.as_completed(futures):
                agent = futures[future]
                try:
                    results.append(future.result())
                except Exception as exc:
                    results.append(
                        AgentResult(
                            criteria=agent.CRITERIA_NAME,
                            score=0,
                            issues=[f"Agent raised an exception: {exc}"],
                            suggestions=[],
                            summary="Agent error.",
                        )
                    )
        order = {cls.CRITERIA_NAME: i for i, cls in enumerate(agent_classes)}
        results.sort(key=lambda r: order.get(r.criteria, 99))
        return results
