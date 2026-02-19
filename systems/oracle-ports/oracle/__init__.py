"""GGL legality oracle package."""

from .abi import ABI, load_abi
from .oracle import (
    OracleResult,
    BOUNDARY_OPEN,
    BOUNDARY_CLOSE,
    extract_ggl_payload,
    ggl_legality_oracle,
)

__all__ = [
    "ABI",
    "load_abi",
    "OracleResult",
    "BOUNDARY_OPEN",
    "BOUNDARY_CLOSE",
    "extract_ggl_payload",
    "ggl_legality_oracle",
]
