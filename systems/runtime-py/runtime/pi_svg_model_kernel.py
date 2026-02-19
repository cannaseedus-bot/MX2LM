"""
Deterministic SVG shell renderer for MX2LM.

The renderer accepts structured shell payloads and returns sanitized,
projection-only representations. No script, animation, or event payloads
are emitted. All outputs are pure data structures that can be serialized
to JSON or used by an upstream SVG compositor.
"""

from __future__ import annotations

import math
from typing import Dict, Iterable, List, Mapping, Sequence

ALLOWED_SHELLS = {"orbital_halo", "stack_grid", "tunnel_rail", "hud_ring", "fractal_lattice"}


def render_model(model_id: str, data: Mapping[str, object]) -> Dict[str, object]:
    models = data.get("models", {})
    model = models.get(model_id, {})
    shell_id = model.get("shell")
    shells = data.get("shells", {})
    return render_shell(shell_id, shells)


def render_shell(shell_id: str, shells: Mapping[str, Mapping[str, object]]) -> Dict[str, object]:
    if shell_id not in ALLOWED_SHELLS:
        return {"shell": shell_id, "status": "skipped", "reason": "shell_not_registered"}

    shell = shells.get(shell_id, {})

    if shell_id == "orbital_halo":
        return {"shell": shell_id, "rings": _render_orbital_halo(shell)}
    if shell_id == "stack_grid":
        return {"shell": shell_id, "cells": _render_stack_grid(shell)}
    if shell_id == "tunnel_rail":
        return {"shell": shell_id, "segments": _render_tunnel_rail(shell)}
    if shell_id == "hud_ring":
        return {"shell": shell_id, "arcs": _render_hud_ring(shell)}
    if shell_id == "fractal_lattice":
        return {"shell": shell_id, "nodes": _render_fractal_lattice(shell)}

    return {"shell": shell_id, "status": "skipped", "reason": "unhandled_shell"}


def _sanitize_label(label: object) -> str:
    text = str(label or "").strip()
    return text.replace("<", "").replace(">", "")


def _render_ring(kind: str, ring: Mapping[str, object]) -> Dict[str, object]:
    return {
        "kind": kind,
        "radius": float(ring.get("radius", 0)),
        "weight": float(ring.get("weight", 0)),
    }


def _render_orbital_halo(shell: Mapping[str, object]) -> List[Dict[str, object]]:
    return [
        _render_ring("inner", shell.get("inner", {})),
        _render_ring("mid", shell.get("mid", {})),
        _render_ring("outer", shell.get("outer", {})),
    ]


def _render_stack_grid(shell: Mapping[str, object]) -> List[Dict[str, object]]:
    rows = int(shell.get("rows", 0))
    cols = int(shell.get("cols", 0))
    weights: Sequence[Sequence[object]] = shell.get("weights", [])
    cells: List[Dict[str, object]] = []
    for r in range(rows):
        for c in range(cols):
            weight = 0.0
            if r < len(weights) and c < len(weights[r]) and isinstance(weights[r][c], (int, float)):
                weight = float(weights[r][c])
            cells.append({"row": r, "col": c, "weight": weight})
    return cells


def _render_tunnel_rail(shell: Mapping[str, object]) -> List[Dict[str, object]]:
    segments = int(shell.get("segments", 0))
    depths: Sequence[object] = shell.get("depth", [])
    rendered: List[Dict[str, object]] = []
    for i in range(segments):
        depth = float(depths[i]) if i < len(depths) and isinstance(depths[i], (int, float)) else 0.0
        rendered.append({"index": i, "depth": depth})
    return rendered


def _render_hud_ring(shell: Mapping[str, object]) -> List[Dict[str, object]]:
    arcs: Iterable[Mapping[str, object]] = shell.get("arcs", [])
    rendered: List[Dict[str, object]] = []
    for arc in arcs:
        rendered.append(
            {
                "start": float(arc.get("start", 0)),
                "end": float(arc.get("end", 0)),
                "label": _sanitize_label(arc.get("label")),
            }
        )
    return rendered


def _render_fractal_lattice(shell: Mapping[str, object]) -> List[Dict[str, object]]:
    levels = int(shell.get("levels", 0))
    branch_factor = max(0, int(shell.get("branch_factor", 0)))
    nodes: List[Dict[str, object]] = []
    queue: List[Dict[str, int]] = [{"id": 0, "remaining": levels}]

    while queue:
        node = queue.pop(0)
        node_id = node["id"]
        remaining = node["remaining"]
        children = [node_id * branch_factor + i + 1 for i in range(branch_factor)] if remaining > 0 else []
        nodes.append({"id": node_id, "level": remaining, "children": children})
        for child in children:
            queue.append({"id": child, "remaining": remaining - 1})

    return nodes


__all__ = [
    "render_model",
    "render_shell",
    "_render_orbital_halo",
    "_render_stack_grid",
    "_render_tunnel_rail",
    "_render_hud_ring",
    "_render_fractal_lattice",
]
