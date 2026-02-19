"""Binary shard trainer for SymbolicLLM symbolic routing.

The trainer converts supervision symbols into deterministic binary shards and
binds those shard tokens to target cognitive primitives. This makes training
portable (binary-safe) while preserving deterministic routing behavior.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from typing import Dict, List, Sequence, Tuple

from runtime.symbolic_llm import CognitivePrimitive, SymbolicLLM, SymbolicRouter


@dataclass(frozen=True)
class TrainingExample:
    prompt: str
    symbols: Tuple[str, ...]
    target_primitive: str


@dataclass(frozen=True)
class TrainingReport:
    total_examples: int
    updated_primitives: int
    added_symbol_links: int
    added_binary_shards: int


class BinaryShardTrainer:
    """Trainer that aligns primitive tags using deterministic binary shards."""

    def __init__(self, shard_bits: int = 16) -> None:
        if shard_bits <= 0 or shard_bits % 8 != 0:
            raise ValueError("shard_bits must be a positive multiple of 8")
        self.shard_bits = shard_bits

    def _to_binary_shard(self, symbol: str) -> str:
        digest = hashlib.sha256(symbol.lower().encode("utf-8")).digest()
        take = self.shard_bits // 8
        shard_bytes = digest[:take]
        return "".join(f"{byte:08b}" for byte in shard_bytes)

    def _symbol_and_shard_tags(self, symbols: Tuple[str, ...]) -> set[str]:
        tags: set[str] = set()
        for symbol in symbols:
            sym = symbol.lower()
            tags.add(sym)
            tags.add(f"shard:{self._to_binary_shard(sym)}")
        return tags

    def fit(self, model: SymbolicLLM, examples: Sequence[TrainingExample]) -> tuple[SymbolicLLM, TrainingReport]:
        primitive_map: Dict[str, CognitivePrimitive] = {
            primitive.name: primitive for primitive in model.router.primitives
        }
        tag_updates: Dict[str, set[str]] = {name: set(p.intent_tags) for name, p in primitive_map.items()}

        added_symbol_links = 0
        added_binary_shards = 0

        for example in examples:
            if example.target_primitive not in primitive_map:
                raise KeyError(f"Unknown target primitive: {example.target_primitive}")

            updates = tag_updates[example.target_primitive]
            before = set(updates)
            updates.update(self._symbol_and_shard_tags(example.symbols))

            added = updates - before
            added_symbol_links += sum(1 for tag in added if not tag.startswith("shard:"))
            added_binary_shards += sum(1 for tag in added if tag.startswith("shard:"))

        updated_primitives = 0
        new_primitives: List[CognitivePrimitive] = []
        for primitive in model.router.primitives:
            new_tags = tuple(sorted(tag_updates[primitive.name]))
            if new_tags != primitive.intent_tags:
                updated_primitives += 1
            new_primitives.append(
                CognitivePrimitive(
                    name=primitive.name,
                    intent_tags=new_tags,
                    runtime=primitive.runtime,
                    prompt_template=primitive.prompt_template,
                )
            )

        trained = SymbolicLLM(router=SymbolicRouter(new_primitives), runtimes=model.runtimes)
        report = TrainingReport(
            total_examples=len(examples),
            updated_primitives=updated_primitives,
            added_symbol_links=added_symbol_links,
            added_binary_shards=added_binary_shards,
        )
        return trained, report


__all__ = [
    "BinaryShardTrainer",
    "TrainingExample",
    "TrainingReport",
]
