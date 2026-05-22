"""
review_agents.py — Concrete review agents, one per criteria.

Architecture after refactor:
─────────────────────────────────────────────────────────────────────────────
  Preflight output          →  Agent              Input to LLM
─────────────────────────────────────────────────────────────────────────────
  dead_code list            →  CleanCodeAgent     findings only  (no code)
  syntax errors list        →  SyntaxAgent        errors only    (no code)
  dead_code_free_numbered   →  SecurityAgent      clean numbered code
  dead_code_free_numbered   →  ReadabilityAgent   clean numbered code
  dead_code_free_numbered   →  PerformanceAgent   clean numbered code
  dead_code_free_numbered   →  EdgeCaseAgent      clean numbered code
─────────────────────────────────────────────────────────────────────────────

CleanCodeAgent and SyntaxAgent override _build_messages so the LLM receives
only the static-analysis findings — the source code is never sent to them.
This keeps prompts short and prevents hallucination about unrelated issues.

The four general agents inherit BaseReviewAgent._build_messages unchanged,
which feeds them dead_code_free_numbered_code.
"""

from __future__ import annotations

import json

from langchain_core.messages import SystemMessage, HumanMessage

from agents.base_agent import BaseReviewAgent

# Shared JSON output schema (kept local to avoid circular imports)
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


# ─────────────────────────────────────────────────────────────────────────────
# 1. Clean Code  (dead code + commented-out blocks)
#    Input: static-analysis findings ONLY — no source code sent to LLM
# ─────────────────────────────────────────────────────────────────────────────

class UnusedCodeAgent(BaseReviewAgent):
    """
    Receives pre-computed dead_code (vulture) and commented_out_blocks
    (tree-sitter) from preflight.  No source code is sent to the LLM.
    The LLM's only job is to interpret the findings and score them.
    """
    CRITERIA_NAME = "clean_code"
    use_fast_llm  = False

    SYSTEM_PROMPT = """
    You are a static-analysis expert specialising in dead code detection.

    You will receive two pre-computed lists:
      1. dead_code        — unused variables, imports, functions, or classes found
                            by a static analyser (vulture). Each entry has a line
                            number and a description.
      2. commented_out_blocks — commented-out code blocks found by a tree-sitter
                            AST parser. Each entry has start_line, end_line, and
                            the block text.

    Your job:
      - Interpret the severity of each finding.
      - Distinguish trivial dead code (e.g. an unused import) from serious issues
        (e.g. an entire commented-out class never cleaned up).
      - Summarise the findings into issues and suggestions.
      - Score from 100 down based on the number and severity of findings.

    IMPORTANT: You are NOT re-analysing the source code.  
    You are judging ONLY the findings already provided to you.  
    Do NOT invent new findings.  
    Score 100 = no dead code and no commented-out code blocks.
    """.strip()

    def _build_messages(self, input):
        """Send only preflight findings — no source code."""
        dead_code = input.preflight.get("dead_code", [])
        commented_out = input.preflight.get("commented_out_blocks", [])

        system = f"{self.SYSTEM_PROMPT}\n\n{_JSON_SCHEMA}"
        human = (
            f"Language: {input.language}\n\n"
            f"=== Dead code (unused variables / imports / functions) ===\n"
            f"{json.dumps(dead_code, indent=2)}\n\n"
            f"=== Commented-out code blocks (tree-sitter) ===\n"
            f"{json.dumps(commented_out, indent=2)}\n\n"
            f"Based solely on the above findings, score the code and list issues."
        )
        return [SystemMessage(content=system), HumanMessage(content=human)]


# ─────────────────────────────────────────────────────────────────────────────
# 2. Syntax & Language Correctness
#    Input: static-analysis errors ONLY — no source code sent to LLM
# ─────────────────────────────────────────────────────────────────────────────

class SyntaxAgent(BaseReviewAgent):
    """
    Receives pre-computed syntax/lint errors from preflight.
    No source code is sent to the LLM — the LLM scores what was found.
    """
    CRITERIA_NAME = "syntax"

    SYSTEM_PROMPT = """
  You are a compiler/interpreter expert.

  You will receive a list of syntax and lint errors already found by a static
  parser (ast + pyflakes).  Each entry has a line number and a message.

  Your job:
    - Classify each error: typo / minor issue vs. fundamental syntax mistake.
    - Typo or minor issue  → small score deduction.
    - Wrong language construct → larger score deduction.
    - Score from 100 down based on the number and severity of errors.

  IMPORTANT: You are NOT re-analysing the source code.  
  You are judging ONLY the errors already provided to you.  
  Do NOT invent new errors.  
  HARD RULE: unused variables and unused imports are NEVER a syntax error in any
  language. If they appear in the list, ignore them.
  Score 100 = zero syntax errors.
  """.strip()

    def _build_messages(self, input):
        """Send only preflight errors — no source code."""
        errors = input.preflight.get("errors", [])

        system = f"{self.SYSTEM_PROMPT}\n\n{_JSON_SCHEMA}"
        human = (
            f"Language: {input.language}\n\n"
            f"=== Static parser errors ===\n"
            f"{json.dumps(errors, indent=2)}\n\n"
            f"Based solely on the above errors, score the code and list issues."
        )
        return [SystemMessage(content=system), HumanMessage(content=human)]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Security  — receives dead-code-free numbered code (base class default)
# ─────────────────────────────────────────────────────────────────────────────

class SecurityAgent(BaseReviewAgent):
    CRITERIA_NAME = "security"
    SYSTEM_PROMPT = """
  You are a senior application security engineer (OWASP / SANS expert).
  You will be given the PURPOSE of the code as context.

  The code you receive has already had dead variables/imports and commented-out
  blocks removed, so focus entirely on genuine security vulnerabilities:
    - Injection flaws (SQL, command, LDAP, XSS)
    - Hardcoded secrets, credentials, or API keys
    - Insecure deserialization
    - Missing authentication or authorisation checks
    - Use of deprecated / insecure cryptographic primitives
    - Sensitive data exposure
    - Unvalidated user input that could cause security issues
      (only if exploitable — crashes count, bad UX does not)

  STRICT EXCLUSIONS — do NOT flag:
    - Hardcoded data structures, lookup tables, or constant lists
    - Magic numbers or named constants
    - Maintainability or readability concerns
    - Performance issues
    - Typos in string literals
    - Missing comments or documentation

  EXAMPLE — do NOT flag:
    list2 = ["", "one", "two"]  ← lookup table, NOT a vulnerability
    TIMEOUT = 30                ← constant, NOT a hardcoded secret

  EXAMPLE — DO flag:
    API_KEY = "sk-abc123"       ← hardcoded secret
    query = "SELECT * WHERE id=" + id  ← SQL injection

  If genuinely no security issues exist, score 100 and return empty issues list.
  """.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 4. Readability — receives dead-code-free numbered code (base class default)
# ─────────────────────────────────────────────────────────────────────────────

class ReadabilityAgent(BaseReviewAgent):
    CRITERIA_NAME = "readability"
    SYSTEM_PROMPT = """
  You are a senior software engineer performing a professional code readability
  and maintainability review.

  The code you receive has already had dead variables/imports and commented-out
  blocks removed — focus on the live, active code.

  Your goal is NOT to enforce personal style preferences.
  Your goal IS to identify places where another competent developer would
  struggle to quickly understand, modify, debug, or safely extend the code.

  Evaluate ONLY readability and maintainability concerns.

  Focus on:

  1. Naming clarity
    - Names should communicate intent and avoid ambiguity.
    - Short conventional names are fine (i, ctx, db).

  2. Function and class design
    - Functions should have one clear responsibility.
    - Flag excessively long or deeply nested functions.

  3. Comments and documentation
    - Complex logic should be explained.
    - Outdated or misleading comments are severe issues.
    - Do NOT require comments for self-explanatory code.

  4. Consistency and structure
    - Consistent naming, formatting, logical grouping.

  5. Maintainability risks
    - Magic numbers obscuring intent, excessive duplication (DRY),
      overly clever code, poor abstraction.

  STRICT EXCLUSIONS — do NOT flag:
    - Performance issues
    - Security vulnerabilities
    - Pure stylistic preferences
    - Missing features or edge cases
    - Syntax errors already handled elsewhere

  SCORING:
    90-100 : Clean, professional, highly maintainable.
    70-89  : Generally readable with some issues.
    40-69  : Noticeable readability problems.
    0-39   : Difficult to safely understand or modify.
  """.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 5. Performance — receives dead-code-free numbered code (base class default)
# ─────────────────────────────────────────────────────────────────────────────

class PerformanceAgent(BaseReviewAgent):
    CRITERIA_NAME = "performance"
    SYSTEM_PROMPT = """
  You are an algorithms and performance optimisation expert.

  The code you receive has already had dead variables/imports removed —
  focus on the live execution paths.

  Analyse:
    - Time complexity of key operations (state Big-O)
    - Space complexity and unnecessary memory usage
    - Redundant iterations, nested loops that can be flattened
    - Inefficient data-structure choices (list search when a set suffices)
    - Missing caching / memoisation opportunities
    - I/O bottlenecks or blocking calls in async code

  Score 100 = optimal or near-optimal performance for the task.
  Deduct points for clear inefficiencies; note the Big-O impact.
  """.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 6. Edge Cases / Robustness — receives dead-code-free numbered code
# ─────────────────────────────────────────────────────────────────────────────

class EdgeCaseAgent(BaseReviewAgent):
    CRITERIA_NAME = "robustness"
    use_fast_llm  = False

    SYSTEM_PROMPT = """
  You are a senior QA engineer and test architect.
  You will be given the PURPOSE of the code as context.

  The code you receive has already had dead variables/imports and commented-out
  blocks removed — focus on the live logic.

  Find ONLY edge cases relevant to the specific purpose — do not list generic
  edge cases that don't apply to this use case:
    - Empty / null / None inputs
    - Boundary values (0, -1, INT_MAX, empty string, single-element list)
    - Unexpected data types
    - Concurrency / race conditions (if applicable)
    - Large inputs (performance edge cases)
    - Locale / encoding issues
    - Off-by-one errors

  For each edge case state:
    (a) the input/condition
    (b) the expected behaviour for this use case
    (c) the actual (broken) behaviour

  Score 100 = handles all foreseeable edge cases for this use case.
  Score proportionally to the SEVERITY and LIKELIHOOD of failure.
  A simple utility function does not need the same validation as a public API.

  Do NOT classify typos or misspellings as off-by-one errors.
  Off-by-one errors are logic bugs involving boundary conditions (< vs <=).
  """.strip()