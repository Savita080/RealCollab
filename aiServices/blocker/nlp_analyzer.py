"""
nlp_analyzer.py — Step 2: NLP analysis on task comments.

For each candidate task (flagged by Step 1), this module:

  A. Semantic classification
     — Combines task description + all comment text into a single embedding.
     — Computes cosine similarity against pre-defined blocker concept vectors.
     — If similarity ≥ COSINE_THRESHOLD, the task is semantically blocked
       in that category (access / dependency / requirements).

  B. Sentiment analysis (VADER)
     — Scores every comment individually.
     — Returns the average compound score AND the list of negative comments
       (compound < SENTIMENT_NEGATIVE_THRESHOLD).
     — These negative comments are passed directly to Step 3 (graph analysis)
       so the mention graph is built only on friction-carrying comments.
"""
from __future__ import annotations

from typing import List, Optional, Tuple


from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer



from config import settings
from schemas import BlockageCategory, CommentPayload

import json


# ── VADER ─────────────────────────────────────────────────────────────────────

_vader = SentimentIntensityAnalyzer()

from openai import OpenAI
_client = OpenAI(api_key=settings.GROK_API_KEY, base_url="https://api.groq.com/openai/v1")

# ── A. Semantic classification ────────────────────────────────────────────────
def classify_blocker_categories(
    comments: List[CommentPayload],
    task_description: Optional[str] = "",
) -> Tuple[List[BlockageCategory], Optional[str]]:

    texts = ([task_description] if task_description else []) + [c.content for c in comments if c.content.strip()]

    if not texts:
        return [BlockageCategory(category=cat, similarity_score=0.0, is_blocked=False)
                for cat in ("access", "dependency", "requirements")], None

    combined = " ".join(texts)

    response = _client.chat.completions.create(
        model=settings.GROK_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a blocker classifier. Given task text, return ONLY a JSON object "
                    "with keys 'access', 'dependency', 'requirements'. "
                    "Each value is a float 0.0–1.0 representing how strongly the text matches that blocker type. "
                    "No explanation, no markdown, just the JSON."
                )
            },
            {"role": "user", "content": combined}
        ],
        temperature=0.0,
        max_tokens=60,
    )
    raw = response.choices[0].message.content.strip()
    print("DEBUG blocker raw:", raw)
    try:
        scores = json.loads(response.choices[0].message.content.strip())
    except Exception:
        scores = {"access": 0.0, "dependency": 0.0, "requirements": 0.0}

    results = [
    BlockageCategory(
        category=cat,
        similarity_score=round(scores.get(cat, 0.0), 4),
        is_blocked=scores.get(cat, 0.0) >= settings.COSINE_THRESHOLD,
    )
    for cat in ("access", "dependency", "requirements")
    ]

    dominant = max(results, key=lambda r: r.similarity_score)
    dominant_name = dominant.category if dominant.is_blocked else None

    return results, dominant_name




# ── B. Sentiment analysis ─────────────────────────────────────────────────────

def analyse_sentiment(
    comments: List[CommentPayload],
) -> Tuple[Optional[float], bool, List[CommentPayload]]:
    """
    Score every comment with VADER.

    Returns:
        avg_compound_score   — float or None (when no comments)
        has_negative_sentiment — True when the average is below threshold
        negative_comments    — the subset of CommentPayload objects whose
                               individual compound score is below the threshold.
                               These are fed to Step 3 (graph analysis).
    """
    if not comments:
        return None, False, []

    scored: list[Tuple[CommentPayload, float]] = []
    for c in comments:
        if c.content.strip():
            score = _vader.polarity_scores(c.content)["compound"]
            scored.append((c, score))

    if not scored:
        return None, False, []

    scores = [s for _, s in scored]
    avg = round(sum(scores) / len(scores), 4)
    has_negative = avg < settings.SENTIMENT_NEGATIVE_THRESHOLD

    negative_comments = [
        c for c, s in scored
        if s < settings.SENTIMENT_NEGATIVE_THRESHOLD
    ]

    return avg, has_negative, negative_comments
