"""
preflight.py — Static analysis before LLM agents run.

Pipeline for Python:
  1. ast.parse()   → fatal syntax check (returns immediately if broken)
  2. pyflakes      → non-dead-code errors (undefined names, etc.)
  3. vulture       → unused variables, imports, functions, classes
  4. tree-sitter   → commented-out code blocks

The results feed two separate paths:
  • dead_code + syntax errors  → CleanCodeAgent / SyntaxAgent (no source code, just findings)
  • dead_code_free_code        → Security, Readability, Performance, Robustness agents
                                 (source with dead items stripped, commented-out blocks removed)

for now:
Other languages fall back to _generic_preflight (LLM agents handle them).
"""

from __future__ import annotations

import ast
import io
import os
import re
import sys
import subprocess
import tempfile
from typing import Any


# ── Public entry point ────────────────────────────────────────────────────────

def run_preflight(code: str, language: str) -> dict:
    """
    Run static analysis and return a preflight dict with keys:

    has_fatal_syntax_error : bool
    errors                 : list[{line, message}]       — for SyntaxAgent
    dead_code              : list[{line, message}]       — for CleanCodeAgent
    commented_out_blocks   : list[{start_line, end_line, text}]  — tree-sitter
    dead_code_free_code    : str  — source with dead lines + commented-out blocks removed
    """
    lang = language.lower()
    runners = {
        "python": _python_preflight,
    }
    runner = runners.get(lang, _generic_preflight)
    try:
        return runner(code)
    except FileNotFoundError as e:
        return {
            "has_fatal_syntax_error": False,
            "errors": [],
            "dead_code": [],
            "commented_out_blocks": [],
            "dead_code_free_code": code,
            "warning": (
                f"Static analyser not available: {e.filename}. "
                "Install it for better results."
            ),
        }


# ── Python ────────────────────────────────────────────────────────────────────

def _python_preflight(code: str) -> dict:
    errors: list[dict] = []
    dead_code: list[dict] = []

    # ── Step 1: ast — fatal syntax check ─────────────────────────────────────
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {
            "has_fatal_syntax_error": True,
            "errors": [{"line": e.lineno, "message": e.msg, "type": "syntax"}],
            "dead_code": [],
            "commented_out_blocks": [],
            "dead_code_free_code": code,
        }

    # ── Step 2: pyflakes — undefined names, redefinitions ────────────────────
    from pyflakes import api as pyflakes_api

    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()
    pyflakes_api.check(code, filename="<code>")
    sys.stdout = old_stdout
    output = buffer.getvalue()

    _DEAD_CODE_KEYWORDS = [
        "imported but unused",
        "defined but unused",
        "redefinition of unused",
    ]

    for line in output.splitlines():
        parts = line.split(":")
        if len(parts) < 3:
            continue
        entry = {
            "line": parts[1].strip(),
            "message": ":".join(parts[2:]).strip(),
        }
        if any(kw in entry["message"] for kw in _DEAD_CODE_KEYWORDS):
            pass  # vulture owns dead code detection
        else:
            errors.append(entry)

    # ── Step 3: vulture — unused vars, imports, functions, classes ────────────
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        tmp = f.name

    dead_lines: set[str] = set()
    try:
        result = subprocess.run(
            [sys.executable, "-m", "vulture", tmp, "--min-confidence", "60"],
            capture_output=True,
            text=True,
        )
        if result.returncode not in (0, 3):
            pass  # vulture unavailable or error — skip silently
        else:
            seen_lines: set[str] = set()
            for line in result.stdout.splitlines():
                parts = line.rsplit(":", 2)
                if len(parts) != 3:
                    continue
                line_num = parts[1].strip()
                message = parts[2].strip()
                if line_num not in seen_lines:
                    seen_lines.add(line_num)
                    dead_code.append({"line": line_num, "message": message})
                    dead_lines.add(line_num)
    finally:
        os.unlink(tmp)

    # ── Step 4: tree-sitter — commented-out code blocks ──────────────────────
    commented_out_blocks = _find_commented_out_blocks_python(code)

    # ── Step 5: build dead-code-free source ───────────────────────────────────
    dead_code_free_code = _remove_dead_code(
        code, dead_lines, commented_out_blocks
    )

    return {
        "has_fatal_syntax_error": False,
        "errors": errors,
        "dead_code": dead_code,
        "commented_out_blocks": commented_out_blocks,
        "dead_code_free_code": dead_code_free_code,
    }


# ── tree-sitter: find commented-out code blocks ───────────────────────────────

def _find_commented_out_blocks_python(code: str) -> list[dict]:
    """
    Use tree-sitter to walk the AST and identify comment nodes whose
    content looks like commented-out executable code.

    Falls back to a regex heuristic if tree-sitter-python is not installed.
    """
    try:
        return _ts_commented_out_blocks(code)
    except Exception:
        return _regex_commented_out_blocks(code)


def _ts_commented_out_blocks(code: str) -> list[dict]:
    """
    tree-sitter based commented-out block detection.
    Requires: pip install tree-sitter tree-sitter-python
    """
    import tree_sitter_python as tspython          # type: ignore
    from tree_sitter import Language, Parser        # type: ignore

    PY_LANGUAGE = Language(tspython.language())
    parser = Parser(PY_LANGUAGE)

    tree = parser.parse(code.encode())
    lines = code.splitlines()

    # Collect all comment nodes
    comments: list[dict] = []
    _collect_comments(tree.root_node, comments)

    # Group consecutive comment lines into blocks
    groups: list[list[dict]] = []
    current: list[dict] = []
    for c in sorted(comments, key=lambda x: x["row"]):
        if current and c["row"] != current[-1]["row"] + 1:
            groups.append(current)
            current = [c]
        else:
            current.append(c)
    if current:
        groups.append(current)

    result: list[dict] = []
    for group in groups:
        if len(group) < 2:
            # Single comment — check if it looks like code
            text = group[0]["text"].lstrip("#").strip()
            if not _looks_like_code(text):
                continue

        texts = [c["text"].lstrip("#").strip() for c in group]
        code_like = [t for t in texts if _looks_like_code(t)]

        # Need majority of lines to look like code
        if len(code_like) < max(1, len(texts) // 2):
            continue

        start = group[0]["row"] + 1   # 1-based
        end = group[-1]["row"] + 1
        block_text = "\n".join(
            lines[g["row"]] for g in group
        )
        result.append({
            "start_line": start,
            "end_line": end,
            "text": block_text,
        })

    return result


def _collect_comments(node: Any, out: list[dict]) -> None:
    """Recursively collect all comment nodes from a tree-sitter tree."""
    if node.type == "comment":
        out.append({
            "row": node.start_point[0],
            "text": node.text.decode() if isinstance(node.text, bytes) else node.text,
        })
    for child in node.children:
        _collect_comments(child, out)


def _looks_like_code(text: str) -> bool:
    """Heuristic: does this stripped comment text look like executable code?"""
    if not text:
        return False
    # Patterns that strongly suggest executable code
    code_patterns = [
        r"^\s*(def |class |return |import |from |for |while |if |elif |else:|try:|except|with |async |await |yield )",
        r"^\s*\w+\s*=\s*",           # assignment: x = ...
        r"^\s*\w+\(.*\)",            # function call: foo(...)
        r"^\s*\w+\.\w+",             # attribute access: obj.method
        r"^\s*(print|raise|del|pass|break|continue)\b",
        r"^\s*\[.*\]\s*$",           # list literal
        r"^\s*{.*}\s*$",             # dict/set literal
    ]
    for pattern in code_patterns:
        if re.match(pattern, text):
            return True
    return False


def _regex_commented_out_blocks(code: str) -> list[dict]:
    """
    Fallback: pure-regex heuristic for finding commented-out code blocks
    when tree-sitter is not available.
    """
    lines = code.splitlines()
    result: list[dict] = []
    i = 0
    while i < len(lines):
        stripped = lines[i].lstrip()
        if stripped.startswith("#"):
            # Start of a comment run
            block_start = i
            while i < len(lines) and lines[i].lstrip().startswith("#"):
                i += 1
            block_end = i - 1

            block_lines = lines[block_start : block_end + 1]
            texts = [l.lstrip("#").strip() for l in block_lines]
            code_like = [t for t in texts if _looks_like_code(t)]

            if len(code_like) >= max(1, len(texts) // 2) and len(block_lines) >= 2:
                result.append({
                    "start_line": block_start + 1,
                    "end_line": block_end + 1,
                    "text": "\n".join(block_lines),
                })
        else:
            i += 1
    return result


# ── Build dead-code-free source ───────────────────────────────────────────────

def _remove_dead_code(
    code: str,
    dead_lines: set[str],
    commented_out_blocks: list[dict],
) -> str:
    """
    Return source with:
    - Lines flagged by vulture replaced with a blank line (preserves line numbers)
    - Commented-out code blocks replaced with a single placeholder comment

    We preserve line numbers so that agents can still reference them correctly.
    """
    lines = code.splitlines()

    # Build set of 1-based line numbers covered by commented-out blocks
    blocked_lines: set[int] = set()
    for block in commented_out_blocks:
        for ln in range(block["start_line"], block["end_line"] + 1):
            blocked_lines.add(ln)

    result: list[str] = []
    i = 0
    while i < len(lines):
        ln_1based = i + 1  # 1-based

        if ln_1based in blocked_lines:
            # Find the block
            block = next(
                (b for b in commented_out_blocks if b["start_line"] == ln_1based),
                None,
            )
            if block:
                # Replace entire block with a single placeholder
                result.append("# [commented-out code block removed]")
                # Skip to end of block, filling with blanks to preserve line count
                block_len = block["end_line"] - block["start_line"]
                result.extend([""] * block_len)
                i = block["end_line"]
                continue
            else:
                # Middle of a block — already handled, emit blank
                result.append("")
        elif str(ln_1based) in dead_lines:
            # Dead code line — blank it out
            result.append("")
        else:
            result.append(lines[i])

        i += 1

    return "\n".join(result)


# ── Fallback for unsupported languages ────────────────────────────────────────

def _generic_preflight(code: str) -> dict:
    """No static analyser available — LLM agents handle everything."""
    return {
        "has_fatal_syntax_error": False,
        "errors": [],
        "dead_code": [],
        "commented_out_blocks": [],
        "dead_code_free_code": code,
    }