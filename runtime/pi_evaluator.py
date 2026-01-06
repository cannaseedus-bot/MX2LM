"""
Deterministic π evaluator for MX2LM.

This module materializes the pseudocode in `pi_evaluator_pseudocode.khl`
into executable Python. Effects are applied deterministically to an input
state and the result is sealed with a stable hash for replayability.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, MutableMapping

BRAINS_DIR = pathlib.Path(__file__).resolve().parent.parent / "brains"
METRIC_TABLE_PATH = BRAINS_DIR / "pi_metric_interpreter.table.json"


@dataclass(frozen=True)
class MetricRule:
    key: str
    pi_effect: str


@dataclass
class Effects:
    weight_multiplier: float = 1.0
    merge_bias: float = 0.0
    entropy_scale: float = 1.0
    scheduler_step: int = 1
    compress_gain: float = 1.0
    filter_threshold: float = 0.0
    vector_gain: float = 1.0


def _load_metric_table(path: pathlib.Path = METRIC_TABLE_PATH) -> Dict[str, MetricRule]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    rules: Dict[str, MetricRule] = {}
    for entry in payload.get("metric_table", []):
        key = entry["key"]
        rules[key] = MetricRule(key=key, pi_effect=entry["pi_effect"])
    return rules


def apply_effects(effects: Effects, input_state: Mapping[str, object]) -> Dict[str, object]:
    """
    Apply effects deterministically to the provided input state.

    The transforms are intentionally explicit and side-effect free:
    * Numeric collections (weights, vector) are scaled where relevant.
    * Confidence filtering is applied to signal lists.
    * New derived fields (e.g., `scheduler_step`) are written into the result.
    * All unknown fields are passed through unchanged.
    """
    result: Dict[str, object] = dict(input_state)

    if "weights" in result and isinstance(result["weights"], list):
        result["weights"] = [
            value * effects.weight_multiplier if isinstance(value, (int, float)) else value
            for value in result["weights"]
        ]

    if "weight" in result and isinstance(result["weight"], (int, float)):
        result["weight"] = result["weight"] * effects.weight_multiplier

    if "merge_bias" in result and isinstance(result["merge_bias"], (int, float)):
        result["merge_bias"] = result["merge_bias"] + effects.merge_bias
    else:
        result.setdefault("merge_bias_applied", effects.merge_bias)

    if "entropy" in result and isinstance(result["entropy"], (int, float)):
        result["entropy"] = result["entropy"] * effects.entropy_scale

    result["scheduler_step"] = max(1, int(effects.scheduler_step))

    if "compression" in result and isinstance(result["compression"], (int, float)):
        result["compression"] = result["compression"] * effects.compress_gain
    if "compressed" in result and isinstance(result["compressed"], (int, float)):
        result["compressed"] = result["compressed"] * effects.compress_gain

    threshold = max(result.get("filter_threshold", 0.0), effects.filter_threshold)
    result["filter_threshold"] = threshold
    if "signals" in result and isinstance(result["signals"], list):
        result["signals"] = [
            signal
            for signal in result["signals"]
            if isinstance(signal, Mapping) and signal.get("confidence", 0) >= threshold
        ]

    if "vector" in result and isinstance(result["vector"], list):
        scaled_vector: List[object] = []
        for value in result["vector"]:
            if isinstance(value, (int, float)):
                scaled_vector.append(value * effects.vector_gain)
            else:
                scaled_vector.append(value)
        result["vector"] = scaled_vector

    return result


def _seal_hash(*items: object) -> str:
    normalized = json.dumps(items, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def evaluate(brain_row: Mapping[str, object], input_state: Mapping[str, object]) -> Dict[str, object]:
    metric_table = _load_metric_table()
    effects = Effects()

    metrics: Iterable[Mapping[str, object]] = brain_row.get("metrics", [])
    for metric in metrics:
        rule = metric_table.get(metric.get("key"))
        if not rule:
            continue

        value = metric.get("value", 0)
        if rule.pi_effect == "weight_multiplier":
            effects.weight_multiplier *= float(value)
        elif rule.pi_effect == "merge_bias":
            effects.merge_bias += float(value)
        elif rule.pi_effect == "entropy_scale":
            effects.entropy_scale *= float(value)
        elif rule.pi_effect == "scheduler_step":
            effects.scheduler_step = max(1, int(value))
        elif rule.pi_effect == "compress_gain":
            effects.compress_gain *= float(value)
        elif rule.pi_effect == "filter_threshold":
            effects.filter_threshold = max(effects.filter_threshold, float(value))
        elif rule.pi_effect == "vector_gain":
            effects.vector_gain *= float(value)

    output_state = apply_effects(effects, input_state)

    return {
        "brain_id": brain_row.get("id"),
        "domain": brain_row.get("domain"),
        "effects": effects.__dict__,
        "output": output_state,
        "seal": _seal_hash(brain_row.get("id"), effects.__dict__, output_state),
    }


__all__ = ["evaluate", "Effects", "MetricRule", "apply_effects"]
