from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Thought:
    intention: str
    trace: list[str]


@dataclass
class SupernautMind:
    core: Any
    thoughts: list[Thought] = field(default_factory=list)

    def think(self, prompt: str) -> Thought:
        percept = self.core.symbolic.parse(prompt)
        intention = self._intent_from_prompt(percept["tokens"])
        thought = Thought(intention=intention, trace=["perceive", "reason", "intend", "act"])
        self.thoughts.append(thought)
        return thought

    def reflect(self) -> dict[str, Any]:
        return {
            "thought_count": len(self.thoughts),
            "last_intention": self.thoughts[-1].intention if self.thoughts else None,
        }

    def _intent_from_prompt(self, tokens: list[str]) -> str:
        lowered = {t.lower() for t in tokens}
        if {"write", "build", "implement"} & lowered:
            return "code_generation"
        if {"why", "how", "explain"} & lowered:
            return "reasoning_logic"
        return "general_assistance"
