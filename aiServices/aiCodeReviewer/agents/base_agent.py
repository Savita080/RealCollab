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

# Add this to BASE prompt in base_agent.py so every agent inherits it
_SCOPE_BOUNDARY = """
IMPORTANT — SCOPE BOUNDARIES:
This is a multi-agent system. Other agents handle these — do NOT flag them:
- Security vulnerabilities (SQL injection, hardcoded secrets, MD5) → security agent
- Unused variables, dead code, unused imports → clean_code agent  
- Syntax errors, type errors → syntax agent
- Naming, comments, formatting, magic numbers → readability agent
- Time/space complexity, Big-O, data structures → performance agent
- Edge cases, null inputs, boundary values → robustness agent

Only flag issues that fall strictly within YOUR criteria.
If you see an issue outside your scope, ignore it entirely.
STRICT RULE: Your issues list must contain ZERO items outside your scope. 
Do not write 'this is out of scope' — just omit the item entirely. 
A shorter accurate list is better than a longer list with out-of-scope items.
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
        context_line = (
            f"Code purpose (context): {input.context}\n"
            if input.context else ""
        )
        system = (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"Language: {input.language}\n"
            f"{_SCOPE_BOUNDARY}\n\n" 
            f"{context_line}"
            f"Line numbers are provided. You MUST reference exact line numbers "
            f"when reporting issues. Do not guess or approximate.\n"
            f"{_JSON_SCHEMA}"
        )
        # use numbered_code so model can't hallucinate line numbers
        code_block = input.numbered_code if input.numbered_code else input.code
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
