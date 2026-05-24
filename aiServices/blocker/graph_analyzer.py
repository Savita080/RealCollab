"""
graph_analyzer.py — Step 3: Mention network built on negative comments only.

Instead of scanning all task comments, the graph is constructed exclusively
from the negative/friction comments identified in Step 2.  This means:

  - In-degree  (C_D⁻): user most @mentioned inside frustrated comments
                        → the resource/person everyone is waiting on.
  - Out-degree (C_D⁺): user who tags others most inside frustrated comments
                        → the developer who is actively stuck and seeking help.

Building the graph only on negative comments eliminates noise from routine
status updates and surfaces only the mentions that occur in the context of
actual friction.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from schemas import CommentPayload, MentionNode


# ── Mention extraction ────────────────────────────────────────────────────────

def _extract_mentions(text: str) -> List[str]:
    return re.findall(r"@(\w+)", text)


# ── Per-task graph (built on negative comments only) ─────────────────────────

def build_mention_graph(
    negative_comments: List[CommentPayload],
) -> Tuple[List[MentionNode], Optional[MentionNode]]:
    """
    Construct a directed mention graph from a pre-filtered list of negative
    comments (produced by Step 2's sentiment analysis).

    Args:
        negative_comments: Comments whose VADER compound score is below the
                           negativity threshold.  Pass an empty list to skip.

    Returns:
        (nodes sorted by in-degree desc, bottleneck_node or None)

    bottleneck_node = the user with the highest in-degree, i.e. the person
    being waited on / blamed across these friction comments.
    """
    in_degree:  Dict[str, int] = defaultdict(int)
    out_degree: Dict[str, int] = defaultdict(int)
    id_map:     Dict[str, str] = {}  # user_name → user_id

    for comment in negative_comments:
        author = comment.author_name
        if comment.author_id:
            id_map[author] = comment.author_id

        for mentioned in _extract_mentions(comment.content):
            in_degree[mentioned] += 1
            out_degree[author]   += 1

    all_nodes = set(in_degree) | set(out_degree)
    # Ensure every comment author appears as a node even with zero degrees
    for c in negative_comments:
        all_nodes.add(c.author_name)

    if not all_nodes:
        return [], None

    nodes: List[MentionNode] = []
    for name in all_nodes:
        uid = id_map.get(name, name)
        nodes.append(MentionNode(
            user_id=uid,
            user_name=name,
            in_degree=in_degree.get(name, 0),
            out_degree=out_degree.get(name, 0),
        ))

    nodes.sort(key=lambda n: n.in_degree, reverse=True)
    bottleneck = nodes[0] if nodes and nodes[0].in_degree > 0 else None
    return nodes, bottleneck


# ── Global bottleneck across all stalled tasks ────────────────────────────────

def compute_global_bottleneck(
    per_task_nodes: List[List[MentionNode]],
) -> Optional[MentionNode]:
    """
    Aggregate per-task mention graphs (all built from negative comments only)
    to identify the single person who is the project-wide bottleneck.
    """
    global_in:  Dict[str, int] = defaultdict(int)
    global_out: Dict[str, int] = defaultdict(int)
    id_map:     Dict[str, str] = {}

    for nodes in per_task_nodes:
        for node in nodes:
            global_in[node.user_name]  += node.in_degree
            global_out[node.user_name] += node.out_degree
            id_map[node.user_name]      = node.user_id

    if not global_in:
        return None

    top = max(global_in, key=lambda k: global_in[k])
    if global_in[top] == 0:
        return None

    return MentionNode(
        user_id=id_map.get(top, top),
        user_name=top,
        in_degree=global_in[top],
        out_degree=global_out.get(top, 0),
    )


# ── DAG in-degree computation ─────────────────────────────────────────────────

def compute_dependency_in_degrees(
    active_tasks: list,  # List[TaskPayload] — avoid circular import
) -> Dict[str, int]:
    """
    Build a simple in-degree count for each task in the active set.

    A task's in-degree = number of other active tasks that list it in
    their `depends_on` field.  Tasks with in-degree > 0 are depended upon
    by others; tasks with in-degree == 0 are leaf tasks or independent.

    This is used in Step 4 to apply a severity multiplier: if a stalled
    task has in-degree > 0 (i.e. other tasks are waiting on it), its
    effective urgency is doubled.
    """
    in_degree: Dict[str, int] = defaultdict(int)

    for task in active_tasks:
        for dep_id in getattr(task, "depends_on", []):
            in_degree[dep_id] += 1

    return dict(in_degree)
