"""CLI entry point for C++/Java/Go code review."""
from __future__ import annotations

import argparse
import json
import os
import sys

_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from dotenv import load_dotenv

load_dotenv()

from models import ReviewInput
from orchestrator import ReviewOrchestrator
from preflight import run_preflight


def parse_args():
    parser = argparse.ArgumentParser(
        description="Multi-agent reviewer for C++, Java, and Go."
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--file", help="Path to source file.")
    source.add_argument("--code", help="Inline source string.")
    parser.add_argument("--language", required=True, help="C++, Java, or Go.")
    parser.add_argument("--weights", default="{}", help="JSON criteria weights.")
    parser.add_argument("--sequential", action="store_true")
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def load_code(args) -> str:
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            return f.read()
    if args.code:
        return args.code
    return sys.stdin.read()


def add_line_numbers(code: str) -> str:
    return "\n".join(f"[L{i + 1}] {line}" for i, line in enumerate(code.splitlines()))


def main():
    args = parse_args()
    code = load_code(args)
    if not code.strip():
        print(json.dumps({"error": "No code provided."}))
        sys.exit(1)

    weights = json.loads(args.weights)
    preflight = run_preflight(code, args.language)

    if preflight.get("has_fatal_syntax_error"):
        print(
            json.dumps(
                {
                    "fatal_syntax_error": preflight.get("errors", []),
                    "language": args.language,
                },
                indent=2 if args.pretty else None,
            )
        )
        sys.exit(2)

    dead_free = preflight.get("dead_code_free_code", code)
    review_input = ReviewInput(
        code=code,
        language=args.language,
        numbered_code=add_line_numbers(code),
        dead_code_free_numbered_code=add_line_numbers(dead_free),
        preflight=preflight,
    )

    orchestrator = ReviewOrchestrator(parallel=not args.sequential)
    report = orchestrator.run(review_input)
    output = report.model_dump()
    output["weighted_score"] = report.weighted_score(weights) if weights else None
    if preflight.get("warning"):
        output["preflight_warning"] = preflight["warning"]
    print(json.dumps(output, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
