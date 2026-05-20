"""
preflight.py — Static analysis before LLM agents run.

Python pipeline:
  1. ast.parse()   → fatal syntax check (returns immediately if broken)
  2. pyflakes      → undefined names, other non-dead-code errors
  3. vulture       → unused variables, imports, functions, classes

Other languages fall back to _generic_preflight (LLM agents handle them).
"""

import ast
import io
import os
import sys
import subprocess
import tempfile


# ── Public entry point ────────────────────────────────────────────────────────

def run_preflight(code: str, language: str) -> dict:
    lang = language.lower()
    runners = {
        "python": _python_preflight,
        # add more languages here as you add their services
    }
    runner = runners.get(lang, _generic_preflight)
    try:
        return runner(code)
    except FileNotFoundError as e:
        # tool not installed — degrade gracefully, LLM agents handle everything
        return {
            "has_fatal_syntax_error": False,
            "errors": [],
            "dead_code": [],
            "warning": f"Static analyser not available: {e.filename}. Install it for better results."
        }


# ── Python ────────────────────────────────────────────────────────────────────

def _python_preflight(code: str) -> dict:
    errors = []
    dead_code = []

    # ── Step 1: ast — fatal syntax check ─────────────────────────────────────
    # If code can't be parsed, skip all agents and return immediately.
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {
            "has_fatal_syntax_error": True,
            "errors": [{"line": e.lineno, "message": e.msg, "type": "syntax"}],
            "dead_code": []
        }

    # ── Step 2: pyflakes — undefined names, redefinitions ────────────────────
    # pyflakes also catches unused imports but vulture does it more thoroughly,
    # so we only keep non-dead-code findings from pyflakes here.
    from pyflakes import api as pyflakes_api

    old_stdout = sys.stdout
    sys.stdout = buffer = io.StringIO()
    pyflakes_api.check(code, filename="<code>")
    sys.stdout = old_stdout
    output = buffer.getvalue()

    # keywords that indicate dead code — skip these, vulture covers them
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
            "message": ":".join(parts[2:]).strip()
        }
        if any(kw in entry["message"] for kw in _DEAD_CODE_KEYWORDS):
            pass  # skip — vulture owns dead code detection
        else:
            errors.append(entry)

    # ── Step 3: vulture — unused vars, imports, functions, classes ────────────
    # Writes code to a temp file because vulture requires a file path.
    # Uses sys.executable so it always finds vulture in the active venv.
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        tmp = f.name

    try:
        result = subprocess.run(
            [sys.executable, "-m", "vulture", tmp, "--min-confidence", "60"],
            capture_output=True,
            text=True
        )
        # vulture return codes:
        #   0 = no unused code found (clean)
        #   1 = invalid arguments / error
        #   3 = unused code found (this is the success case for us)
        if result.returncode not in (0, 3):
            print("VULTURE ERROR:", result.stderr)
        else:
            seen_lines = set()
            for line in result.stdout.splitlines():
                # vulture output: filepath:LINE: MESSAGE (CONFIDENCE%)
                # Windows paths contain "C:" which breaks naive split(":")
                # rsplit from right ensures we get the last two ":" separators
                # e.g. "C:\path\file.py:12: unused variable 'x' (60% confidence)"
                # → ["C:\\path\\file.py", "12", " unused variable 'x' (60% confidence)"]
                parts = line.rsplit(":", 2)
                if len(parts) != 3:
                    continue
                line_num = parts[1].strip()
                message  = parts[2].strip()
                # deduplicate — pyflakes and vulture can both flag the same line
                if line_num not in seen_lines:
                    seen_lines.add(line_num)
                    dead_code.append({
                        "line": line_num,
                        "message": message
                    })
    finally:
        os.unlink(tmp)

    return {
        "has_fatal_syntax_error": False,
        "errors": errors,
        "dead_code": dead_code,
    }


# ── Fallback for unsupported languages ────────────────────────────────────────

def _generic_preflight(code: str) -> dict:
    """No static analyser available — LLM agents handle everything."""
    return {
        "has_fatal_syntax_error": False,
        "errors": [],
        "dead_code": []
    }