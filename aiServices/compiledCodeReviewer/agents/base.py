"""Base review agent and shared findings-only agents."""
from __future__ import annotations

import json
import os
import re
import sys
from typing import ClassVar

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from llm_provider import get_fast_llm, get_smart_llm
from models import AgentResult, ReviewInput

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

SCOPE_BOUNDARY = """
IMPORTANT — SCOPE BOUNDARIES:
This is a multi-agent system. Other agents handle these — do NOT flag them:
- Security vulnerabilities → security agent
- Unused variables, dead code, unused imports → clean_code agent
- Syntax / compile errors → syntax agent
- Naming, comments, formatting → readability agent
- Time/space complexity, Big-O → performance agent
- Edge cases, null/nil pointers, boundary values → robustness agent

Only flag issues within YOUR criteria. Omit out-of-scope items entirely.
"""


class BaseReviewAgent:
    CRITERIA_NAME: ClassVar[str] = "base"
    SYSTEM_PROMPT: ClassVar[str] = ""
    use_fast_llm: ClassVar[bool] = False

    def __init__(self, llm: BaseChatModel | None = None):
        if llm is not None:
            self._llm = llm
        elif self.use_fast_llm:
            self._llm = get_fast_llm()
        else:
            self._llm = get_smart_llm()

    def review(self, input: ReviewInput) -> AgentResult:
        messages = self._build_messages(input)
        response = self._llm.invoke(messages)
        return self._parse_response(response.content)

    def _build_messages(self, input: ReviewInput):
        context_line = (
            f"Code purpose (context): {input.context}\n" if input.context else ""
        )
        system = (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"Language: {input.language}\n"
            f"{SCOPE_BOUNDARY}\n\n"
            f"{context_line}"
            "Line numbers use [L<n>] prefixes. Reference exact line numbers in issues.\n"
            "Skip blank lines and '// [commented-out code block removed]' placeholders.\n"
            f"{_JSON_SCHEMA}"
        )
        code_block = (
            input.dead_code_free_numbered_code
            or input.numbered_code
            or input.code
        )
        human = f"```\n{code_block}\n```"
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


class UnusedCodeAgent(BaseReviewAgent):
    CRITERIA_NAME = "clean_code"
    use_fast_llm = False

    def _build_messages(self, input: ReviewInput):
        dead_code = input.preflight.get("dead_code", [])
        commented_out = input.preflight.get("commented_out_blocks", [])
        system = f"{self.SYSTEM_PROMPT}\n\n{_JSON_SCHEMA}"
        human = (
            f"Language: {input.language}\n\n"
            f"=== Dead code (static analyser) ===\n{json.dumps(dead_code, indent=2)}\n\n"
            f"=== Commented-out code blocks ===\n"
            f"{json.dumps(commented_out, indent=2)}\n\n"
            "Score based ONLY on these findings. Do not invent new ones."
        )
        return [SystemMessage(content=system), HumanMessage(content=human)]


class SyntaxAgent(BaseReviewAgent):
    CRITERIA_NAME = "syntax"
    use_fast_llm = True

    def _build_messages(self, input: ReviewInput):
        errors = input.preflight.get("errors", [])
        system = f"{self.SYSTEM_PROMPT}\n\n{_JSON_SCHEMA}"
        human = (
            f"Language: {input.language}\n\n"
            f"=== Static analyser errors ===\n{json.dumps(errors, indent=2)}\n\n"
            "Unused variables/imports are NOT syntax errors — ignore them.\n"
            "Score based ONLY on these errors."
        )
        return [SystemMessage(content=system), HumanMessage(content=human)]
