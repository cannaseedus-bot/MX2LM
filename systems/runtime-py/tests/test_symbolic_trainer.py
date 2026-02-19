import pytest

from runtime.symbolic_llm import build_default_symbolic_llm
from runtime.symbolic_trainer import BinaryShardTrainer, TrainingExample


def test_binary_shard_trainer_adds_symbol_and_shard_links():
    model = build_default_symbolic_llm()
    trainer = BinaryShardTrainer(shard_bits=16)

    trained, report = trainer.fit(
        model,
        [
            TrainingExample(prompt="compile plan", symbols=("planner", "analysis"), target_primitive="reason"),
            TrainingExample(prompt="call adapter", symbols=("invoke",), target_primitive="act"),
        ],
    )

    assert report.total_examples == 2
    assert report.updated_primitives >= 1
    assert report.added_symbol_links >= 2
    assert report.added_binary_shards >= 2

    out_reason = trained.generate("test", symbols=["planner"])
    out_act = trained.generate("test", symbols=["invoke"], context={"tool": "adapter"})

    assert out_reason["primitive"] == "reason"
    assert out_act["primitive"] == "act"


def test_binary_shard_output_is_stable():
    trainer = BinaryShardTrainer(shard_bits=16)
    a = trainer._to_binary_shard("planner")
    b = trainer._to_binary_shard("planner")

    assert a == b
    assert len(a) == 16
    assert set(a).issubset({"0", "1"})


def test_binary_shard_trainer_rejects_unknown_primitive_label():
    model = build_default_symbolic_llm()
    trainer = BinaryShardTrainer()

    with pytest.raises(KeyError):
        trainer.fit(
            model,
            [TrainingExample(prompt="x", symbols=("y",), target_primitive="missing")],
        )
