"""Language router for preflight static analysis."""
from __future__ import annotations

from typing import Any

from preflight.cpp_preflight import run_cpp_preflight
from preflight.llm_preflight import run_llm_preflight

_CPP_ALIASES = {"c++", "cpp", "cxx", "cc", "hpp", "h", "c"}
_JAVA_ALIASES = {"java"}
_GO_ALIASES = {"go", "golang"}


def normalize_language(language: str) -> str:
    lang = language.strip().lower().replace(" ", "")
    if lang in _CPP_ALIASES or lang.endswith("++"):
        return "cpp"
    if lang in _JAVA_ALIASES:
        return "java"
    if lang in _GO_ALIASES:
        return "go"
    raise ValueError(
        f"Unsupported language: {language!r}. "
        "Supported: C++, Java, Go (aliases: cpp, cxx, java, go, golang)."
    )


def run_preflight(code: str, language: str) -> dict[str, Any]:
    """
    Run static analysis and return:
      has_fatal_syntax_error, errors, dead_code,
      commented_out_blocks, dead_code_free_code
    """
    lang = normalize_language(language)
    if lang == "cpp":
        return run_cpp_preflight(code)
    if lang in ("java", "go"):
        return run_llm_preflight(code, lang)
    raise ValueError(f"No preflight runner for {lang}")
