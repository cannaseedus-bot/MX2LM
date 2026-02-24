from __future__ import annotations


class SupernautEvolution:
    def __init__(self) -> None:
        self.iterations = 0

    def evolve(self, feedback: dict) -> dict:
        self.iterations += 1
        return {"iteration": self.iterations, "feedback_seen": bool(feedback)}
