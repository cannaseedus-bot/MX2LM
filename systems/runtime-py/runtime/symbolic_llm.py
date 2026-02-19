"""Symbolic LLM scaffold built from cognitive primitives and atomic runtimes.

This module provides a minimal, deterministic architecture that can be expanded
into a full LLM stack while keeping routing and execution interpretable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, List, Mapping


AtomicOp = Callable[[str, Mapping[str, str]], str]


@dataclass(frozen=True)
class CognitivePrimitive:
    """Small symbolic skill that maps intent tags to an atomic runtime."""

    name: str
    intent_tags: tuple[str, ...]
    runtime: str
    prompt_template: str


@dataclass
class AtomicRuntime:
    """Deterministic execution engine for primitive transforms."""

    name: str
    operations: Dict[str, AtomicOp] = field(default_factory=dict)

    def run(self, operation: str, text: str, context: Mapping[str, str]) -> str:
        if operation not in self.operations:
            raise KeyError(f"Operation '{operation}' is not available in runtime '{self.name}'.")
        return self.operations[operation](text, context)


@dataclass
class SymbolicRouter:
    """Routes prompts to the best primitive using symbolic intent tags."""

    primitives: List[CognitivePrimitive]

    def route(self, symbols: Iterable[str]) -> CognitivePrimitive:
        symbol_set = {s.lower() for s in symbols}
        scored = [
            (len(symbol_set.intersection({t.lower() for t in primitive.intent_tags})), primitive)
            for primitive in self.primitives
        ]
        score, primitive = max(scored, key=lambda entry: entry[0], default=(0, None))
        if primitive is None or score == 0:
            return next(p for p in self.primitives if p.name == "default")
        return primitive


@dataclass
class SymbolicLLM:
    """Minimal LLM-like orchestrator using symbolic routing + atomic runtimes."""

    router: SymbolicRouter
    runtimes: Dict[str, AtomicRuntime]

    def generate(self, prompt: str, symbols: Iterable[str], context: Mapping[str, str] | None = None) -> Dict[str, str]:
        context = context or {}
        primitive = self.router.route(symbols)
        runtime = self.runtimes[primitive.runtime]
        staged_prompt = primitive.prompt_template.format(prompt=prompt, **context)
        response = runtime.run("transform", staged_prompt, context)
        return {
            "primitive": primitive.name,
            "runtime": runtime.name,
            "response": response,
        }


def _reasoning_op(text: str, context: Mapping[str, str]) -> str:
    return f"[reasoned] {text}".strip()


def _tool_op(text: str, context: Mapping[str, str]) -> str:
    tool = context.get("tool", "none")
    return f"[tool:{tool}] {text}".strip()


def _default_op(text: str, context: Mapping[str, str]) -> str:
    return f"[default] {text}".strip()


def build_default_symbolic_llm() -> SymbolicLLM:
    """Factory for a baseline symbolic LLM configuration."""

    primitives = [
        CognitivePrimitive(
            name="reason",
            intent_tags=("analysis", "reason", "deduce"),
            runtime="atomic-reasoning",
            prompt_template="Reason carefully: {prompt}",
        ),
        CognitivePrimitive(
            name="act",
            intent_tags=("tool", "execute", "call"),
            runtime="atomic-tooling",
            prompt_template="Take action: {prompt}",
        ),
        CognitivePrimitive(
            name="default",
            intent_tags=("general",),
            runtime="atomic-default",
            prompt_template="Respond: {prompt}",
        ),
    ]

    runtimes = {
        "atomic-reasoning": AtomicRuntime("atomic-reasoning", {"transform": _reasoning_op}),
        "atomic-tooling": AtomicRuntime("atomic-tooling", {"transform": _tool_op}),
        "atomic-default": AtomicRuntime("atomic-default", {"transform": _default_op}),
    }

    return SymbolicLLM(router=SymbolicRouter(primitives), runtimes=runtimes)


__all__ = [
    "AtomicRuntime",
    "CognitivePrimitive",
    "SymbolicLLM",
    "SymbolicRouter",
    "build_default_symbolic_llm",
]
