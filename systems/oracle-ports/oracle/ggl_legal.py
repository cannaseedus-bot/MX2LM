from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class LegalityError(Exception):
    code: str
    msg: str
    line: int = 0
    col: int = 0

    def __str__(self) -> str:  # pragma: no cover - simple exception repr
        return f"{self.code}: {self.msg} (line {self.line}, col {self.col})"


def check_legality(ast: Dict[str, Any], grammar_abi: Dict[str, Any]) -> None:
    """Check legality of the AST against grammar ABI rules.

    Replace this stub with a real legality checker bound to grammar_abi.
    """
    raise LegalityError(
        code="E_LEGAL_UNIMPLEMENTED",
        msg="check_legality is not implemented for this grammar ABI",
    )
