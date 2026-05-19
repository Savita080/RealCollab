'''
the base agent class each agent inherits from
'''


from __future__ import annotations
import json
import os
import re
import sys
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel

# ── Path guard ────────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# ─────────────────────────────────────────────────────────────────────────────

from models import AgentResult, ReviewInput
from llm_provider import get_llm, get_fast_llm

_JSON_SCHEMA = """
Respond ONLY with a valid JSON object — no markdown fences, no extra text.
Schema:
{
  "score": <integer 0-100>,
  "issues": [<string>, ...],
  "suggestions": [<string>, ...],
  "summary": "<one sentence>"
}
"""


class BaseReviewAgent:
    CRITERIA_NAME: str = "base"
    SYSTEM_PROMPT: str = ""
    use_fast_llm: bool = False

    def __init__(self, llm: BaseChatModel | None = None):
        if llm is not None:
            self._llm = llm
        elif self.use_fast_llm:
            self._llm = get_fast_llm()
        else:
            self._llm = get_llm()

    def review(self, input: ReviewInput) -> AgentResult:
        messages = self._build_messages(input)
        response = self._llm.invoke(messages)
        return self._parse_response(response.content)

    def _build_messages(self, input: ReviewInput):
        system = (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"Language: {input.language}\n"
            f"{_JSON_SCHEMA}"
        )
        human = f"```{input.language.lower()}\n{input.code}\n```"
        return [SystemMessage(content=system), HumanMessage(content=human)]

    def _parse_response(self, raw: str) -> AgentResult:
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        try:
            data = json.loads(clean)
        except json.JSONDecodeError:
            return AgentResult(
                criteria=self.CRITERIA_NAME,
                score=0,
                issues=["Failed to parse agent response."],
                suggestions=[raw[:500]],
                summary="Parse error.",
            )
        return AgentResult(
            criteria=self.CRITERIA_NAME,
            score=int(data.get("score", 0)),
            issues=data.get("issues", []),
            suggestions=data.get("suggestions", []),
            summary=data.get("summary", ""),
        )
