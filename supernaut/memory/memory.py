from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SupernautMemory:
    episodic: list[dict[str, Any]] = field(default_factory=list)
    semantic: dict[str, Any] = field(default_factory=dict)
    working: list[Any] = field(default_factory=list)

    def encode(self, experience: dict[str, Any]) -> dict[str, Any]:
        self.episodic.append(experience)
        self.working.append(experience)
        for key in experience:
            self.semantic[key] = self.semantic.get(key, 0) + 1
        return experience

    def recall(self, key: str) -> list[dict[str, Any]]:
        return [item for item in self.episodic if key in item or key in str(item)]
