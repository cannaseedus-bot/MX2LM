"""Canonical JSON serialization helpers for ABI hashing."""

from __future__ import annotations

import json
from typing import Any


def canon_json_bytes_v1(obj: Any) -> bytes:
    """Return canonical JSON bytes for ABI hashing.

    Canonicalization v1 uses sorted keys, no insignificant whitespace, and
    UTF-8 encoding without escaping non-ASCII characters.
    """
    canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return canonical.encode("utf-8")
