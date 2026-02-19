from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class ParseError(Exception):
    code: str
    msg: str
    line: int = 0
    col: int = 0

    def __str__(self) -> str:  # pragma: no cover - simple exception repr
        return f"{self.code}: {self.msg} (line {self.line}, col {self.col})"


def parse_ggl_to_ast(text: str, grammar_abi: Dict[str, Any]) -> Dict[str, Any]:
    """Parse GGL text into an AST.

    Replace this stub with a real parser implementation bound to grammar_abi.
    """
    raise ParseError(
        code="E_PARSE_UNIMPLEMENTED",
        msg="parse_ggl_to_ast is not implemented for this grammar ABI",
    )
