"""
chat_summariser.py — AI-powered group chat summarisation using MapReduce.

This is the most AI-intensive component of the standup report service.
It takes raw chat messages from the last 24 hours and produces a concise,
standup-friendly summary.

Architecture: MapReduce Summarisation Pattern
═══════════════════════════════════════════════

Why MapReduce instead of dumping all messages into one prompt?

  1. VOLUME: Active projects can have 100+ messages/day. Even if the LLM's
     context window fits them all, quality degrades with very long inputs
     (the "lost in the middle" problem).

  2. COST: Processing 100 messages in one call uses ~5000 tokens of input.
     With MapReduce, we process smaller chunks and get better per-chunk
     extraction, then combine the key points.

  3. PARALLELISM: Each chunk can be summarised independently, so we can
     run them concurrently with asyncio.gather() for faster results.

The pipeline:
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ Chunk 1      │     │ Chunk 2      │     │ Chunk 3      │
  │ (msgs 1-30)  │     │ (msgs 31-60) │     │ (msgs 61-90) │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │ Summary 1    │     │ Summary 2    │     │ Summary 3    │
  │ (fast LLM)   │     │ (fast LLM)   │     │ (fast LLM)   │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Final Summary    │
                    │ (full-power LLM) │
                    └──────────────────┘

The MAP phase uses the fast/cheap LLM (e.g., llama-3.1-8b-instant).
The REDUCE phase uses the full-power LLM (e.g., llama-3.3-70b-versatile)
for higher-quality final synthesis.
"""
from __future__ import annotations

import asyncio
from typing import List

from config import settings
from schemas import ChatMessage
from llm_provider import get_llm, get_fast_llm


# ── System prompts ────────────────────────────────────────────────────────────

# Used in the MAP phase: extract key information from a chunk of messages
_MAP_SYSTEM_PROMPT = (
    "You are a concise meeting-notes assistant for a software development team. "
    "You read a segment of group chat messages and extract ONLY the important items. "
    "Ignore casual/social messages (greetings, jokes, emojis-only). "
    "Focus on: decisions, blockers, action items, technical discussions, and questions. "
    "Use bullet points. Attribute decisions to names. Be factual — never invent information."
)

# Used in the REDUCE phase: combine chunk summaries into a unified summary
_REDUCE_SYSTEM_PROMPT = (
    "You are a standup report writer for a software development team. "
    "You receive summaries from different time segments of a group chat. "
    "Combine them into a single coherent summary (4-6 bullet points). "
    "Remove duplicates. Keep the most important items. Be concise but complete. "
    "The reader should understand what happened without reading the original chat."
)


async def summarise_chat(messages: List[ChatMessage]) -> str:
    """
    Main entry point: summarise a list of chat messages into a standup-friendly digest.

    Routing logic:
      - 0 messages      → static "no activity" message (no LLM call)
      - 1-30 messages    → single-pass summarisation (one LLM call)
      - 30+ messages     → MapReduce pipeline (multiple LLM calls)

    Parameters:
        messages: Chat messages from the last 24 hours, sorted chronologically.

    Returns:
        A string containing 3-6 bullet points summarising the chat.
    """
    # ── Edge case: no messages ────────────────────────────────────────────────
    if not messages:
        return "No chat activity in the last 24 hours."

    # ── Small volume: single-pass (saves an LLM call) ────────────────────────
    if len(messages) <= settings.CHAT_CHUNK_SIZE:
        return await _single_pass_summary(messages, use_full_model=True)

    # ── Large volume: MapReduce ───────────────────────────────────────────────
    return await _map_reduce_summary(messages)


async def _single_pass_summary(
    messages: List[ChatMessage],
    use_full_model: bool = False,
) -> str:
    """
    Summarise a small batch of messages in a single LLM call.

    Parameters:
        messages:       The messages to summarise.
        use_full_model: If True, use the full-power LLM. If False, use the fast LLM.
                        Single-pass for small chats uses full model for quality.
                        Map-phase chunks use fast model for speed/cost.

    Returns:
        A bullet-point summary string.
    """
    # Format messages as a readable chat log
    formatted_chat = _format_messages(messages)

    prompt = (
        f"Here is a segment of project group chat from the last 24 hours:\n\n"
        f"{formatted_chat}\n\n"
        f"Summarise the key points in 3-5 bullet points for a daily standup report. "
        f"Cover: decisions made, blockers raised, action items, important questions, "
        f"and notable technical discussions. Use names when attributing decisions."
    )

    # Pick the appropriate LLM based on the phase
    llm = get_llm() if use_full_model else get_fast_llm()

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": _MAP_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])
        return response.content.strip()
    except Exception as exc:
        # Graceful degradation: if the LLM fails, return a count-based fallback
        return (
            f"Chat summary unavailable ({type(exc).__name__}). "
            f"{len(messages)} messages were exchanged in the last 24 hours."
        )


async def _map_reduce_summary(messages: List[ChatMessage]) -> str:
    """
    MapReduce pipeline for large chat volumes (30+ messages).

    MAP phase:  Split messages into chunks → summarise each in parallel (fast LLM)
    REDUCE phase: Combine all chunk summaries into one final summary (full LLM)

    Returns:
        A unified bullet-point summary string.
    """
    # ── MAP: Split into chunks and summarise each in parallel ─────────────────
    chunks = _chunk_messages(messages, settings.CHAT_CHUNK_SIZE)

    # Run all chunk summarisations concurrently for speed
    # Each chunk uses the fast LLM (cheaper, faster)
    chunk_summaries = await asyncio.gather(*[
        _single_pass_summary(chunk, use_full_model=False)
        for chunk in chunks
    ])

    # Filter out any failed summaries (they'll contain error messages)
    valid_summaries = [s for s in chunk_summaries if not s.startswith("Chat summary unavailable")]

    if not valid_summaries:
        return f"Chat summary unavailable. {len(messages)} messages were exchanged in the last 24 hours."

    # If only one valid summary (unlikely but possible), skip reduce phase
    if len(valid_summaries) == 1:
        return valid_summaries[0]

    # ── REDUCE: Combine chunk summaries into a final summary ──────────────────
    return await _reduce_summaries(valid_summaries)


async def _reduce_summaries(summaries: List[str]) -> str:
    """
    Combine multiple chunk summaries into a single coherent summary.

    This is the REDUCE phase of MapReduce. Uses the full-power LLM because
    synthesis requires higher reasoning ability than extraction.

    Parameters:
        summaries: List of bullet-point summaries from the MAP phase.

    Returns:
        A unified 4-6 bullet point summary.
    """
    # Label each summary with its time period for context
    labelled = []
    for i, summary in enumerate(summaries, 1):
        labelled.append(f"--- Period {i} of {len(summaries)} ---\n{summary}")
    combined = "\n\n".join(labelled)

    prompt = (
        f"Below are summaries from {len(summaries)} different time periods "
        f"of a project group chat over the last 24 hours.\n\n"
        f"{combined}\n\n"
        f"Combine them into a single coherent summary (4-6 bullet points) "
        f"for a daily standup report. Remove duplicates and redundancies. "
        f"Preserve the most important items: decisions, blockers, action items. "
        f"The reader should get a complete picture of the day's discussions."
    )

    llm = get_llm()  # Full-power model for the synthesis step

    try:
        response = await llm.ainvoke([
            {"role": "system", "content": _REDUCE_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])
        return response.content.strip()
    except Exception as exc:
        # Fallback: return all chunk summaries concatenated
        return "\n".join(summaries)


# ── Helper functions ──────────────────────────────────────────────────────────


def _format_messages(messages: List[ChatMessage]) -> str:
    """
    Format a list of ChatMessage objects into a human-readable chat log.

    Example output:
        [09:15] Alice: Has anyone looked at the auth bug?
        [09:17] Bob: I'll take it. Need the Google credentials first.
        [09:20] Alice: Check 1Password, they should be in the Dev vault.
    """
    lines = []
    for msg in messages:
        # Format timestamp as HH:MM for readability
        time_str = msg.created_at.strftime("%H:%M")
        # Truncate very long messages to avoid token bloat
        content = msg.content[:500] if len(msg.content) > 500 else msg.content
        lines.append(f"[{time_str}] {msg.sender_name}: {content}")
    return "\n".join(lines)


def _chunk_messages(
    messages: List[ChatMessage],
    chunk_size: int,
) -> List[List[ChatMessage]]:
    """
    Split messages into chunks of `chunk_size` for parallel processing.

    Messages are kept in chronological order within each chunk so the
    LLM can follow conversation threads.

    Parameters:
        messages:   All messages, sorted chronologically.
        chunk_size: Maximum messages per chunk (default from config: 30).

    Returns:
        A list of message lists, each containing at most `chunk_size` messages.

    Example:
        95 messages with chunk_size=30 → [30, 30, 30, 5]
    """
    return [
        messages[i:i + chunk_size]
        for i in range(0, len(messages), chunk_size)
    ]
