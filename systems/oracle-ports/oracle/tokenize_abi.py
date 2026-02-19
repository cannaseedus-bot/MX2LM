from __future__ import annotations

import re
from typing import Any, Dict, Optional


def _within_reserved(codepoint: int, reserved_ranges: list[list[int]]) -> bool:
    for start, end in reserved_ranges:
        if start <= codepoint <= end:
            return True
    return False


def abi_tokenize_ok(text: str, tokenizer_abi: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Validate text against tokenizer ABI rules.

    Supported ABI keys:
    - allowed_regex: fullmatch regex for allowed characters.
    - reserved_codepoints: list of [start, end] ranges to reject.
    - disallowed_chars: list of literal characters to reject.
    """
    allowed_regex = tokenizer_abi.get("allowed_regex")
    if allowed_regex:
        if not re.fullmatch(allowed_regex, text, flags=re.DOTALL):
            return {
                "code": "E_TOKEN_ALLOWED_REGEX",
                "msg": "input contains characters outside tokenizer allowed_regex",
            }

    disallowed_chars = set(tokenizer_abi.get("disallowed_chars", []))
    for idx, ch in enumerate(text):
        if ch in disallowed_chars:
            return {
                "code": "E_TOKEN_DISALLOWED_CHAR",
                "msg": f"disallowed character at index {idx}",
                "col": idx + 1,
            }

    reserved_ranges = tokenizer_abi.get("reserved_codepoints", [])
    if reserved_ranges:
        for idx, ch in enumerate(text):
            if _within_reserved(ord(ch), reserved_ranges):
                return {
                    "code": "E_TOKEN_RESERVED_CODEPOINT",
                    "msg": f"reserved codepoint U+{ord(ch):04X} at index {idx}",
                    "col": idx + 1,
                }

    return None
