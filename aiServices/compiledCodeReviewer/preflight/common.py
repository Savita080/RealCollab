"""Shared preflight helpers: commented-out blocks and dead-code-free source."""
from __future__ import annotations

import re
from typing import Any


def empty_preflight(code: str, warning: str | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "has_fatal_syntax_error": False,
        "errors": [],
        "dead_code": [],
        "commented_out_blocks": [],
        "dead_code_free_code": code,
    }
    if warning:
        result["warning"] = warning
    return result


def fatal_preflight(code: str, errors: list[dict]) -> dict[str, Any]:
    return {
        "has_fatal_syntax_error": True,
        "errors": errors,
        "dead_code": [],
        "commented_out_blocks": [],
        "dead_code_free_code": code,
    }


def finalize_preflight(
    code: str,
    errors: list[dict],
    dead_code: list[dict],
    commented_out_blocks: list[dict],
    has_fatal_syntax_error: bool = False,
) -> dict[str, Any]:
    dead_lines = {
        str(item.get("line", "")).strip()
        for item in dead_code
        if item.get("line") not in (None, "", "None")
    }
    return {
        "has_fatal_syntax_error": has_fatal_syntax_error,
        "errors": errors,
        "dead_code": dead_code,
        "commented_out_blocks": commented_out_blocks,
        "dead_code_free_code": build_dead_code_free_code(
            code, dead_lines, commented_out_blocks
        ),
    }


def build_dead_code_free_code(
    code: str,
    dead_lines: set[str],
    commented_out_blocks: list[dict],
) -> str:
    lines = code.splitlines()
    blocked: set[int] = set()
    for block in commented_out_blocks:
        start = int(block.get("start_line", 0))
        end = int(block.get("end_line", start))
        for ln in range(start, end + 1):
            blocked.add(ln)

    result: list[str] = []
    i = 0
    while i < len(lines):
        ln = i + 1
        if ln in blocked:
            block = next(
                (b for b in commented_out_blocks if int(b.get("start_line", 0)) == ln),
                None,
            )
            if block:
                result.append("// [commented-out code block removed]")
                span = int(block["end_line"]) - int(block["start_line"])
                result.extend([""] * span)
                i = int(block["end_line"])
                continue
            result.append("")
        elif str(ln) in dead_lines:
            result.append("")
        else:
            result.append(lines[i])
        i += 1
    return "\n".join(result)


def find_commented_out_blocks(code: str, language: str) -> list[dict]:
    lang = language.lower()
    if lang in ("java",):
        return _find_block_comments(code, "//", "/*", "*/")
    if lang in ("go", "golang"):
        return _find_line_comment_blocks(code, "//")
    return _find_block_comments(code, "//", "/*", "*/")


def _find_line_comment_blocks(code: str, prefix: str) -> list[dict]:
    lines = code.splitlines()
    result: list[dict] = []
    i = 0
    while i < len(lines):
        stripped = lines[i].lstrip()
        if stripped.startswith(prefix):
            start = i
            while i < len(lines) and lines[i].lstrip().startswith(prefix):
                i += 1
            block_lines = lines[start:i]
            texts = [l.split(prefix, 1)[-1].strip() for l in block_lines]
            if len(block_lines) >= 2 and sum(1 for t in texts if _looks_like_code(t)) >= max(
                1, len(texts) // 2
            ):
                result.append(
                    {
                        "start_line": start + 1,
                        "end_line": i,
                        "text": "\n".join(block_lines),
                    }
                )
        else:
            i += 1
    return result


def _find_block_comments(
    code: str,
    line_prefix: str,
    block_start: str,
    block_end: str,
) -> list[dict]:
    line_blocks = _find_line_comment_blocks(code, line_prefix)
    lines = code.splitlines()
    block_comments: list[dict] = []
    i = 0
    while i < len(lines):
        if block_start in lines[i]:
            start = i
            while i < len(lines) and block_end not in lines[i]:
                i += 1
            if i < len(lines):
                i += 1
            segment = lines[start:i]
            inner = "\n".join(segment)
            if _looks_like_code(inner.replace(block_start, "").replace(block_end, "")):
                block_comments.append(
                    {
                        "start_line": start + 1,
                        "end_line": i,
                        "text": "\n".join(segment),
                    }
                )
        else:
            i += 1
    return line_blocks + block_comments


def _looks_like_code(text: str) -> bool:
    if not text.strip():
        return False
    patterns = [
        r"^\s*(if|for|while|switch|return|class|struct|enum|namespace|using|import|package|func|def|void|int|float|double|bool|auto|new|delete|malloc|free|try|catch|throw)\b",
        r"^\s*\w+\s*=\s*",
        r"^\s*\w+\s*\(",
        r"^\s*\w+\.\w+",
        r"^\s*#include\b",
        r"^\s*@\w+",
    ]
    return any(re.match(p, text) for p in patterns)
