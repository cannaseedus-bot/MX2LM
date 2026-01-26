"""Deterministic π evaluator for MX2LM metrics.

This module mirrors the pseudocode in ``pi_evaluator_pseudocode.khl`` by:

* Loading the metric interpreter table (``PI_METRIC_TABLE``) from JSON.
* Aggregating metric rows into cumulative effect values.
* Applying the effects deterministically to a supplied input state.
* Producing a seal (stable hash) over the evaluator inputs and outputs.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


METRIC_TABLE_PATH = Path(__file__).resolve().parent.parent / "brains" / "pi_metric_interpreter.table.json"


@dataclasses.dataclass(frozen=True)
class MetricRule:
    key: str
    type: str
    pi_effect: str
    description: str


@dataclasses.dataclass
class Effects:
    weight_multiplier: float = 1.0
    merge_bias: float = 0.0
    entropy_scale: float = 1.0
    scheduler_step: int = 1
    compress_gain: float = 1.0
    filter_threshold: float = 0.0
    vector_gain: float = 1.0

    def as_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


def _load_metric_table(path: Path = METRIC_TABLE_PATH) -> Dict[str, MetricRule]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    table: Dict[str, MetricRule] = {}
    for entry in raw.get("metric_table", []):
        rule = MetricRule(
            key=entry["key"],
            type=entry["type"],
            pi_effect=entry["pi_effect"],
            description=entry["description"],
        )
        table[rule.key] = rule

    return table


PI_METRIC_TABLE = _load_metric_table()


def _accumulate_effects(metric_rows: Iterable[Dict[str, Any]], metric_table: Dict[str, MetricRule]) -> Effects:
    effects = Effects()

    for metric in metric_rows:
        rule = metric_table.get(metric["key"])
        if rule is None:
            raise KeyError(f"Unknown metric key: {metric['key']}")

        value = metric.get("value")
        if value is None:
            raise ValueError(f"Metric row {metric} missing 'value'")

        if rule.pi_effect == "weight_multiplier":
            effects.weight_multiplier *= value
        elif rule.pi_effect == "merge_bias":
            effects.merge_bias += value
        elif rule.pi_effect == "entropy_scale":
            effects.entropy_scale *= value
        elif rule.pi_effect == "scheduler_step":
            effects.scheduler_step = max(1, int(value))
        elif rule.pi_effect == "compress_gain":
            effects.compress_gain *= value
        elif rule.pi_effect == "filter_threshold":
            effects.filter_threshold = max(effects.filter_threshold, value)
        elif rule.pi_effect == "vector_gain":
            effects.vector_gain *= value
        else:
            raise ValueError(f"Unhandled pi_effect: {rule.pi_effect}")

    return effects


def apply_effects(effects: Effects, input_state: Dict[str, Any]) -> Dict[str, Any]:
    """Apply effects deterministically to the provided input state.

    Expected input fields (all optional, defaulting to neutral values):
    * ``weights``: list of numbers
    * ``merge_bias``: float bias value
    * ``entropy``: float entropy measure
    * ``scheduler_step``: int scheduler position
    * ``compression``: float compression scalar
    * ``signals``: list of mappings with ``confidence`` and ``value`` keys
    * ``vector``: list of numbers to be scaled globally
    """

    weights = [w * effects.weight_multiplier for w in input_state.get("weights", [])]
    merge_bias = input_state.get("merge_bias", 0.0) + effects.merge_bias
    entropy = input_state.get("entropy", 0.0) * effects.entropy_scale
    scheduler_step = max(1, effects.scheduler_step)
    compression = input_state.get("compression", 1.0) * effects.compress_gain

    filtered_signals: List[Dict[str, Any]] = []
    for signal in input_state.get("signals", []):
        if signal.get("confidence", 0.0) >= effects.filter_threshold:
            filtered_signals.append(dict(signal))

    vector = [value * effects.vector_gain for value in input_state.get("vector", [])]

    return {
        "weights": weights,
        "merge_bias": merge_bias,
        "entropy": entropy,
        "scheduler_step": scheduler_step,
        "compression": compression,
        "signals": filtered_signals,
        "vector": vector,
    }


def _seal(brain_id: str, effects: Effects, result: Dict[str, Any]) -> str:
    payload = {
        "brain_id": brain_id,
        "effects": effects.as_dict(),
        "output": result,
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def evaluate(brain_row: Dict[str, Any], input_state: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate a brain row and input state using PI metric rules.

    The returned mapping mirrors the pseudocode contract, exposing the
    calculated ``effects``, deterministic ``output``, and a stable ``seal``.
    """

    effects = _accumulate_effects(brain_row.get("metrics", []), PI_METRIC_TABLE)
    result = apply_effects(effects, input_state)

    return {
        "brain_id": brain_row.get("id"),
        "domain": brain_row.get("domain"),
        "effects": effects.as_dict(),
        "output": result,
        "seal": _seal(brain_row.get("id"), effects, result),
    }


__all__ = [
    "Effects",
    "MetricRule",
    "PI_METRIC_TABLE",
    "apply_effects",
    "evaluate",
]
