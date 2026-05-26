"""C++ preflight via cppcheck subprocess."""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from typing import Any

from preflight.common import (
    empty_preflight,
    fatal_preflight,
    finalize_preflight,
    find_commented_out_blocks,
)  # empty_preflight used on timeout/errors


_DEAD_CODE_PATTERNS = re.compile(
    r"unused|never used|unread|redundant|dead store|assigned.*never",
    re.IGNORECASE,
)
_FATAL_PATTERNS = re.compile(
    r"syntax error|parse error|cannot parse|expected.*before|missing.*;",
    re.IGNORECASE,
)


def run_cpp_preflight(code: str) -> dict[str, Any]:
    if not shutil.which("cppcheck"):
        commented = find_commented_out_blocks(code, "cpp")
        result = finalize_preflight(code, [], [], commented)
        result["warning"] = (
            "cppcheck not found on PATH. Install cppcheck for static analysis; "
            "commented-out block detection still applied."
        )
        return result

    suffix = ".cpp"
    if "#include" in code and "int main" not in code and "class " not in code:
        suffix = ".hpp"

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=suffix, delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name

    errors: list[dict] = []
    dead_code: list[dict] = []
    has_fatal = False

    try:
        proc = subprocess.run(
            [
                "cppcheck",
                "--enable=warning,style,performance,portability",
                "--inline-suppr",
                f"--language=c++",
                "--template={file}:{line}:{severity}:{message}",
                tmp_path,
            ],
            capture_output=True,
            text=True,
            timeout=int(os.getenv("CPPCHECK_TIMEOUT", "60")),
        )
        output = (proc.stdout or "") + "\n" + (proc.stderr or "")
        for line in output.splitlines():
            parsed = _parse_cppcheck_line(line, tmp_path)
            if not parsed:
                continue
            line_no, severity, message = parsed
            entry = {"line": line_no, "message": message, "type": severity}
            if _FATAL_PATTERNS.search(message) or (
                severity == "error" and "syntax" in message.lower()
            ):
                has_fatal = True
                errors.append({**entry, "type": "syntax"})
            elif _DEAD_CODE_PATTERNS.search(message):
                dead_code.append(entry)
            elif severity in ("error", "warning"):
                errors.append(entry)
            elif severity == "style" and _DEAD_CODE_PATTERNS.search(message):
                dead_code.append(entry)
    except subprocess.TimeoutExpired:
        return empty_preflight(code, warning="cppcheck timed out")
    except OSError as exc:
        return empty_preflight(code, warning=f"cppcheck failed: {exc}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    commented = find_commented_out_blocks(code, "cpp")

    if has_fatal:
        return fatal_preflight(code, errors)

    return finalize_preflight(code, errors, dead_code, commented)


def _parse_cppcheck_line(line: str, tmp_path: str) -> tuple[str, str, str] | None:
    # {file}:{line}:{severity}:{message}
    if tmp_path not in line and os.path.basename(tmp_path) not in line:
        return None
    match = re.match(r"[^:]+:(\d+):(\w+):(.+)", line)
    if not match:
        return None
    return match.group(1), match.group(2), match.group(3).strip()
