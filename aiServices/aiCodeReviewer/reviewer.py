"""
reviewer.py  –  CLI entry-point for the multi-agent code reviewer.

Examples
--------
# Review a file:
    python reviewer.py --file my_script.py --language Python

# Pipe code via stdin:
    cat my_script.py | python reviewer.py --language Python

# Apply custom weights (values need not sum to 1):
    python reviewer.py --file app.js --language JavaScript \
        --weights '{"security":0.4,"performance":0.3,"syntax":0.2,"readability":0.05,"unused_code":0.03,"edge_cases":0.02}'

# Use a different LLM provider:
    LLM_PROVIDER=openai python reviewer.py --file app.py --language Python

# Run agents sequentially (useful for debugging):
    python reviewer.py --file app.py --language Python --sequential

Output
------
Prints a JSON report to stdout so Node.js (or any client) can:
  1. Parse raw per-criteria scores
  2. Apply its own weights → weighted_score
"""

import argparse
import json
import sys
import os

# Allow running from project root
sys.path.insert(0, os.path.dirname(__file__))

from models import ReviewInput
from orchestrator import ReviewOrchestrator


def parse_args():
    parser = argparse.ArgumentParser(description="Multi-agent AI code reviewer.")
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--file", help="Path to source file to review.")
    source.add_argument("--code", help="Inline code string to review.")
    parser.add_argument("--language", required=True, help="Programming language (e.g. Python).")
    parser.add_argument(
        "--weights",
        default="{}",
        help='JSON string of {criteria: weight} for weighted score, e.g. \'{"security":0.5}\'',
    )
    parser.add_argument("--sequential", action="store_true", help="Disable parallel agents.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def load_code(args) -> str:
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            return f.read()
    elif args.code:
        return args.code
    else:
        # Read from stdin
        return sys.stdin.read()


def main():
    args = parse_args()
    code = load_code(args)

    if not code.strip():
        print(json.dumps({"error": "No code provided."}))
        sys.exit(1)

    weights = json.loads(args.weights)

    orchestrator = ReviewOrchestrator(parallel=not args.sequential)
    report = orchestrator.run(ReviewInput(code=code, language=args.language))

    # Build output dict
    output = report.model_dump()
    output["weighted_score"] = report.weighted_score(weights) if weights else None

    indent = 2 if args.pretty else None
    print(json.dumps(output, indent=indent))


if __name__ == "__main__":
    main()
