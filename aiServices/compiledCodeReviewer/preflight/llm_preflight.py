"""LLM-based preflight for Java and Go (syntax, dead code, commented-out blocks)."""
from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from llm_provider import get_fast_llm
from preflight.common import finalize_preflight, find_commented_out_blocks


_PREFLIGHT_SYSTEM = """You are a static-analysis assistant for {language} source code.
Analyse the code and return ONLY valid JSON (no markdown fences) matching this schema:

{{
  "has_fatal_syntax_error": <bool — true only if the code cannot compile/parse at all>,
  "errors": [
    {{"line": <int or null>, "message": "<string>", "type": "syntax"|"lint"}}
  ],
  "dead_code": [
    {{"line": <int or null>, "message": "<unused variable/import/function>"}}
  ],
  "commented_out_blocks": [
    {{"start_line": <int>, "end_line": <int>, "text": "<snippet>"}}
  ]
}}

Rules:
- Do NOT include style-only nitpicks in errors unless they are real compile issues.
- Unused imports, variables, or functions go in dead_code, NOT errors.
- commented_out_blocks: only consecutive comment lines that look like disabled executable code.
- A single // TODO or doc comment is NOT a commented-out block.
- If unsure about a fatal syntax error, set has_fatal_syntax_error to false.
- Be conservative: fewer accurate findings beat hallucinated ones.
"""

_LANGUAGE_HINTS = {
    "java": (
        "Use Java rules: unused imports, unreachable code, raw types, "
        "missing @Override, empty catch blocks as lint (not fatal unless compile-breaking)."
    ),
    "go": (
        "Use Go rules: unused imports/variables, unreachable code, "
        "incorrect format strings, nil map/slice writes. "
        "Remember blank identifier _ for intentional discards."
    ),
}


def run_llm_preflight(code: str, language: str) -> dict[str, Any]:
    lang = language.lower()
    hint = _LANGUAGE_HINTS.get(lang, "")
    regex_blocks = find_commented_out_blocks(code, lang)

    messages = [
        SystemMessage(content=_PREFLIGHT_SYSTEM.format(language=language) + "\n" + hint),
        HumanMessage(
            content=(
                f"Language: {language}\n\n"
                f"```\n{code}\n```\n\n"
                "Return the JSON object only."
            )
        ),
    ]

    try:
        raw = get_fast_llm().invoke(messages).content
        data = _parse_json(raw)
    except Exception as exc:
        return finalize_preflight(
            code,
            errors=[{"line": None, "message": f"LLM preflight failed: {exc}", "type": "lint"}],
            dead_code=[],
            commented_out_blocks=regex_blocks,
        )

    errors = _normalize_list(data.get("errors", []))
    dead_code = _normalize_list(data.get("dead_code", []))
    llm_blocks = _normalize_blocks(data.get("commented_out_blocks", []))
    commented = _merge_blocks(regex_blocks, llm_blocks)

    if data.get("has_fatal_syntax_error"):
        return finalize_preflight(
            code, errors, dead_code, commented, has_fatal_syntax_error=True
        )

    return finalize_preflight(code, errors, dead_code, commented)


def _parse_json(raw: str) -> dict:
    clean = re.sub(r"```(?:json)?|```", "", raw).strip()
    return json.loads(clean)


def _normalize_list(items: list) -> list[dict]:
    out: list[dict] = []
    for item in items:
        if isinstance(item, dict) and item.get("message"):
            out.append(
                {
                    "line": item.get("line"),
                    "message": str(item["message"]),
                    "type": item.get("type", "lint"),
                }
            )
    return out


def _normalize_blocks(blocks: list) -> list[dict]:
    out: list[dict] = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        try:
            start = int(b.get("start_line", 0))
            end = int(b.get("end_line", start))
        except (TypeError, ValueError):
            continue
        if start > 0 and end >= start:
            out.append(
                {
                    "start_line": start,
                    "end_line": end,
                    "text": str(b.get("text", "")),
                }
            )
    return out


def _merge_blocks(a: list[dict], b: list[dict]) -> list[dict]:
    seen = {(x["start_line"], x["end_line"]) for x in a}
    merged = list(a)
    for block in b:
        key = (block["start_line"], block["end_line"])
        if key not in seen:
            merged.append(block)
            seen.add(key)
    return merged
