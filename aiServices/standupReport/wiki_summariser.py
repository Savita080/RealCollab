"""
wiki_summariser.py — Summarise documentation changes for the standup report.

This module processes WikiPageVersion entries from the last 24 hours.
Each version has a `commit_message` (minimum 10 characters, enforced by
the wiki controller) and a `saved_by_name`.

Approach:
  - For LOW volume (≤5 changes): Format directly — no LLM call needed.
    Commit messages are already human-readable, so we just group by page
    and list who edited what.

  - For HIGH volume (>5 changes): Use the LLM to produce a concise summary.
    This handles cases where many small edits would create a noisy list.

This module is intentionally lightweight compared to chat_summariser.py
because commit messages are already structured and concise.
"""
from __future__ import annotations

from collections import defaultdict
from typing import List

from schemas import WikiChange
from llm_provider import get_llm


# ── LLM system prompt for wiki summarisation ─────────────────────────────────

_WIKI_SYSTEM_PROMPT = (
    "You are a documentation progress summariser for a development team. "
    "You receive a list of wiki page edits with commit messages. "
    "Summarise the overall documentation progress in 2-4 bullet points. "
    "Group related edits together. Mention who made significant contributions. "
    "Be concise — this goes into a daily standup report."
)


async def summarise_wiki_changes(changes: List[WikiChange]) -> str:
    """
    Summarise wiki/documentation changes for the standup report.

    Parameters:
        changes: WikiPageVersion entries from the last 24 hours.

    Returns:
        A formatted string summarising documentation activity.

    Routing:
        0 changes  → "No documentation changes."
        1-5 changes → Direct formatting (no LLM)
        5+ changes  → LLM-assisted summary
    """
    if not changes:
        return "No documentation changes in the last 24 hours."

    # Group changes by wiki page for a structured view
    by_page = _group_by_page(changes)

    # ── Low volume: format directly (no LLM needed) ──────────────────────────
    if len(changes) <= 5:
        return _format_changes_directly(by_page)

    # ── High volume: use LLM to synthesise ────────────────────────────────────
    return await _llm_summarise_wiki(by_page)


def _group_by_page(changes: List[WikiChange]) -> dict[str, List[WikiChange]]:
    """
    Group wiki changes by page title.

    Returns a dict mapping page_title → list of WikiChange entries.
    This makes it easy to see all edits per page.

    Example:
        {
            "API Docs": [WikiChange(saved_by="Alice", commit="Added rate limit endpoint"), ...],
            "Setup Guide": [WikiChange(saved_by="Bob", commit="Updated Docker instructions")]
        }
    """
    grouped: dict[str, List[WikiChange]] = defaultdict(list)
    for change in changes:
        grouped[change.page_title].append(change)
    return dict(grouped)


def _format_changes_directly(by_page: dict[str, List[WikiChange]]) -> str:
    """
    Format wiki changes as a readable list without using the LLM.

    Used when there are ≤5 changes — the commit messages are already
    human-readable, so calling the LLM would be wasteful.

    Output format:
        • **API Docs** — edited by Alice: Added rate limit endpoint documentation
        • **Setup Guide** — edited by Bob, Charlie: Updated Docker instructions; Fixed typos
    """
    lines = []
    for page_title, edits in by_page.items():
        # Deduplicate editor names while preserving order
        editors = list(dict.fromkeys(e.saved_by_name for e in edits))
        editors_str = ", ".join(editors)

        # Concatenate commit messages, deduplicating identical ones
        seen_commits = set()
        unique_commits = []
        for edit in edits:
            if edit.commit_message not in seen_commits:
                seen_commits.add(edit.commit_message)
                unique_commits.append(edit.commit_message)
        commits_str = "; ".join(unique_commits)

        lines.append(f"• **{page_title}** — edited by {editors_str}: {commits_str}")

    return "\n".join(lines)


async def _llm_summarise_wiki(by_page: dict[str, List[WikiChange]]) -> str:
    """
    Use the LLM to produce a concise summary of many wiki changes.

    Used when there are >5 changes — listing them all would be noisy,
    so the LLM groups related edits and highlights the most important ones.

    Parameters:
        by_page: Wiki changes grouped by page title.

    Returns:
        A 2-4 bullet point summary from the LLM.
    """
    # Build a structured input for the LLM
    sections = []
    for page_title, edits in by_page.items():
        edit_lines = []
        for edit in edits:
            edit_lines.append(
                f"  - {edit.saved_by_name}: \"{edit.commit_message}\" "
                f"(at {edit.created_at.strftime('%H:%M')})"
            )
        sections.append(f"Page: {page_title}\n" + "\n".join(edit_lines))

    all_changes = "\n\n".join(sections)

    prompt = (
        f"The following wiki/documentation edits were made in the last 24 hours:\n\n"
        f"{all_changes}\n\n"
        f"Summarise the overall documentation progress in 2-4 bullet points "
        f"for a daily standup report. Highlight the most significant changes."
    )

    llm = get_llm()

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": _WIKI_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])
        return response.content.strip()
    except Exception as exc:
        # Fallback: return the direct format even though it might be long
        return _format_changes_directly(by_page)
