import copy

import pytest

from runtime.pi_evaluator import Effects, apply_effects, evaluate


@pytest.fixture
def brain_row():
    return {
        "id": "brain-001",
        "domain": "test-domain",
        "metrics": [
            {"key": "stability", "value": 2.0},
            {"key": "merge_weight", "value": 0.5},
            {"key": "entropy_weight", "value": 0.3},
            {"key": "tick_rate", "value": 0},
            {"key": "compression_ratio", "value": 1.5},
            {"key": "confidence_floor", "value": 0.7},
            {"key": "global_gain", "value": 3.0},
        ],
    }


def test_apply_effects_covers_all_pi_effects():
    effects = Effects(
        weight_multiplier=2.0,
        merge_bias=0.5,
        entropy_scale=0.3,
        scheduler_step=0,  # should clamp to at least 1
        compress_gain=1.5,
        filter_threshold=0.7,
        vector_gain=3.0,
    )

    input_state = {
        "weights": [1.0, -1.0, 0.5],
        "merge_bias": 1.0,
        "entropy": 2.0,
        "compression": 4.0,
        "signals": [
            {"confidence": 0.6, "value": "low"},
            {"confidence": 0.7, "value": "edge"},
            {"confidence": 0.9, "value": "high"},
        ],
        "vector": [1, 2, 3],
    }

    result = apply_effects(effects, input_state)

    assert result["weights"] == [2.0, -2.0, 1.0]
    assert result["merge_bias"] == 1.5
    assert result["entropy"] == pytest.approx(0.6)
    assert result["scheduler_step"] == 1
    assert result["compression"] == pytest.approx(6.0)
    assert result["signals"] == [
        {"confidence": 0.7, "value": "edge"},
        {"confidence": 0.9, "value": "high"},
    ]
    assert result["vector"] == [3, 6, 9]


def test_evaluate_applies_metric_table_and_seals_deterministically(brain_row):
    input_state = {
        "weights": [1.0, 2.0],
        "merge_bias": 1.0,
        "entropy": 1.0,
        "compression": 2.0,
        "signals": [{"confidence": 0.8, "value": "ok"}],
        "vector": [1.0],
    }

    first = evaluate(brain_row, input_state)
    second = evaluate(copy.deepcopy(brain_row), copy.deepcopy(input_state))

    assert first["effects"] == second["effects"]
    assert first["output"] == second["output"]
    assert first["seal"] == second["seal"]

    # Different input state yields a different deterministic seal.
    changed_input = copy.deepcopy(input_state)
    changed_input["merge_bias"] += 1.0
    changed = evaluate(copy.deepcopy(brain_row), changed_input)
    assert changed["seal"] != first["seal"]
