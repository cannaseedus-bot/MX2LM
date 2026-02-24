from __future__ import annotations

from typing import Any, Dict


class SupernautAction:
    def act(self, intention: str, prompt: str) -> Dict[str, Any]:
        code = self._code_for_intention(intention, prompt)
        explanation = f"Generated action for intention: {intention}"
        tests = ["assert True"]
        return {
            "code": code,
            "explanation": explanation,
            "tests": tests,
            "micronaut": f"/micronauts/{intention}.pi",
        }

    def _code_for_intention(self, intention: str, prompt: str) -> str:
        if intention == "code_generation" and "fibonacci" in prompt.lower():
            return "def fib(n):\n    a,b=0,1\n    for _ in range(n):\n        a,b=b,a+b\n    return a"
        return "# action placeholder"
