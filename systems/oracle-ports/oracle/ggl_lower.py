from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class LowerError(Exception):
    code: str
    msg: str

    def __str__(self) -> str:  # pragma: no cover - simple exception repr
        return f"{self.code}: {self.msg}"


def lower_ast_to_scene_xjson(ast: Dict[str, Any], grammar_abi: Dict[str, Any]) -> Dict[str, Any]:
    """Lower AST to scene XJSON.

    Replace this stub with a real lowering implementation bound to grammar_abi.
    """
    raise LowerError(
        code="E_LOWER_UNIMPLEMENTED",
        msg="lower_ast_to_scene_xjson is not implemented for this grammar ABI",
    )
