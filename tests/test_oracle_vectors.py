import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import csv

from oracle.oracle import ggl_legality_oracle
from oracle.abi import ABI


def _load_vectors():
    path = Path(__file__).resolve().parents[1] / "specs" / "oracle_conformance_vectors.csv"
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_oracle_conformance_vectors_python():
    abi = ABI(
        tokenizer={
            "allowed_regex": r"^[A-Za-z#\s]+$",
            "disallowed_chars": ["#"],
        },
        grammar={},
        abi_hash="test",
    )

    for vector in _load_vectors():
        result = ggl_legality_oracle(vector["input"], abi, want_lower=True)
        assert result.stage == vector["expected_stage"], vector["id"]
        assert result.code == vector["expected_code"], vector["id"]
        assert result.partial_score == float(vector["expected_score"]), vector["id"]
