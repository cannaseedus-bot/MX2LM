from __future__ import annotations


class SupernautPerception:
    def perceive(self, input_data: str) -> dict:
        tokens = input_data.split()
        return {
            "tokens": tokens,
            "patterns": {"recursive": "fib" in input_data.lower()},
            "structure": {"length": len(tokens)},
            "meaning": input_data,
        }
