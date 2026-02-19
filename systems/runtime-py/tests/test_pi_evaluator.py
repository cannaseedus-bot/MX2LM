import copy

from runtime.pi_evaluator import evaluate


def test_evaluate_applies_effects_and_seals():
    brain_row = {
        "id": "test_brain",
        "domain": "atomic",
        "metrics": [
            {"key": "stability", "value": 0.5},
            {"key": "merge_weight", "value": 2},
            {"key": "entropy_weight", "value": 3},
            {"key": "tick_rate", "value": 4},
            {"key": "compression_ratio", "value": 0.25},
            {"key": "confidence_floor", "value": 0.2},
            {"key": "global_gain", "value": 10},
        ],
    }
    input_state = {
        "weights": [1.0, 2.0],
        "merge_bias": 1.0,
        "entropy": 2.0,
        "compression": 8.0,
        "signals": [{"confidence": 0.1}, {"confidence": 0.3}],
        "vector": [1, 2],
    }

    result = evaluate(brain_row, input_state)

    assert result["brain_id"] == "test_brain"
    assert result["domain"] == "atomic"
    assert result["effects"]["weight_multiplier"] == 0.5
    assert result["effects"]["merge_bias"] == 2.0
    assert result["effects"]["entropy_scale"] == 3.0
    assert result["effects"]["scheduler_step"] == 4
    assert result["effects"]["compress_gain"] == 0.25
    assert result["effects"]["filter_threshold"] == 0.2
    assert result["effects"]["vector_gain"] == 10.0

    assert result["output"]["weights"] == [0.5, 1.0]
    assert result["output"]["merge_bias"] == 3.0
    assert result["output"]["entropy"] == 6.0
    assert result["output"]["compression"] == 2.0
    assert result["output"]["filter_threshold"] == 0.2
    assert result["output"]["signals"] == [{"confidence": 0.3}]
    assert result["output"]["vector"] == [10, 20]

    # Seal should be deterministic for the same input
    repeat_result = evaluate(brain_row, copy.deepcopy(input_state))
    assert repeat_result["seal"] == result["seal"]
