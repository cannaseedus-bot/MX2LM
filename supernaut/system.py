from __future__ import annotations

from typing import Any, Dict

from .action import SupernautAction
from .consciousness import SupernautMind
from .core import SupernautCore
from .evolution import SupernautEvolution
from .memory import SupernautMemory
from .micronauts import SupernautBody
from .perception import SupernautPerception


class Supernaut:
    """Unified system merged into the MX2LM repository."""

    def __init__(self, moe_manifest_path: str = "moe-manifest.xjson") -> None:
        self.core = SupernautCore(moe_manifest_path=moe_manifest_path)
        self.mind = SupernautMind(self.core)
        self.memory = SupernautMemory()
        self.perception = SupernautPerception()
        self.action = SupernautAction()
        self.evolution = SupernautEvolution()
        self.body = SupernautBody()

    def awaken(self) -> Dict[str, Any]:
        status = self.core.bootstrap()
        self.body.serve()
        return {"core": status, "body_active": self.body.active}

    def query(self, prompt: str) -> Dict[str, Any]:
        _ = self.perception.perceive(prompt)
        thought = self.mind.think(prompt)
        result = self.action.act(thought.intention, prompt)
        self.memory.encode({"prompt": prompt, "intention": thought.intention})
        self.evolution.evolve({"prompt": prompt})
        return {**result, "thought_process": thought.trace}
