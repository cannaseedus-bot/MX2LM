"""
Validate brain topology assets against deterministic, non-executable rules.

Checks performed:
- Required top-level invariants on the bindings file (context, authority, rules, etc.).
- Binding entry structure and patterns.
- Cross-reference between bindings and the topology registry (id existence and domain match).
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys
from typing import Dict, Iterable, List, Mapping, Set, Tuple

import json

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAINS_DIR = REPO_ROOT / "brains"
TOPOLOGY_DIR = BRAINS_DIR / "topologies"

BINDINGS_PATH = TOPOLOGY_DIR / "brain_topology_bindings.svg.json"
REGISTRY_PATH = TOPOLOGY_DIR / "brain_topology_registry.json"
SCHEMA_PATH = BRAINS_DIR / "brain_topology_bindings.schema.json"

SVG_PATTERN = re.compile(r"^brains/[a-z0-9_\-]+\.svg$")
ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,48}$")
ALLOWED_DOMAINS = {"atomic", "cluster", "training", "replay", "runtime"}


def _strip_json_comments(raw: str) -> str:
    raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.DOTALL)
    return raw


def _load_json(path: pathlib.Path) -> Mapping[str, object]:
    with path.open("r", encoding="utf-8") as f:
        content = f.read()
    return json.loads(_strip_json_comments(content))


def _validate_top_level(bindings: Mapping[str, object], schema: Mapping[str, object]) -> List[str]:
    errors: List[str] = []
    required_keys: Iterable[str] = schema.get("required", [])
    for key in required_keys:
        if key not in bindings:
            errors.append(f"missing required top-level key: {key}")

    const_pairs = {
        "@context": "asx://brain/topology/bindings/svg/v1",
        "@authority": "KUHUL_XCFE_OMEGA",
        "@mutation": "forbidden",
        "@extension": "append_only",
        "@executable": False,
    }
    for key, expected in const_pairs.items():
        if bindings.get(key) != expected:
            errors.append(f"{key} expected {expected!r} but found {bindings.get(key)!r}")

    version = bindings.get("@version")
    if not isinstance(version, str) or version != "1.0.0":
        errors.append(f"@version must equal '1.0.0', found {version!r}")

    rules = bindings.get("@rules", {})
    expected_rules = {
        "@svg_policy": "SANITIZED_NO_SCRIPT_NO_EVENT_NO_ANIMATION",
        "@binding_mode": "id_to_asset_only",
        "@runtime_execution": False,
        "@projection_only": True,
    }
    for key, expected in expected_rules.items():
        if rules.get(key) != expected:
            errors.append(f"@rules.{key} expected {expected!r} but found {rules.get(key)!r}")

    return errors


def _index_registry(registry: Mapping[str, object]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for entry in registry.get("@brains", []):
        mapping[entry["id"]] = entry["domain"]
    return mapping


def _validate_binding_entries(
    bindings: Iterable[Mapping[str, object]], registry_map: Mapping[str, str]
) -> Tuple[List[str], Set[str]]:
    errors: List[str] = []
    seen_ids: Set[str] = set()

    for entry in bindings:
        entry_id = entry.get("id")
        svg = entry.get("svg")
        domain = entry.get("domain")

        if not entry_id or not isinstance(entry_id, str) or not ID_PATTERN.match(entry_id):
            errors.append(f"invalid id: {entry_id!r}")
        if entry_id in seen_ids:
            errors.append(f"duplicate id: {entry_id}")
        seen_ids.add(entry_id)

        if not svg or not isinstance(svg, str) or not SVG_PATTERN.match(svg):
            errors.append(f"invalid svg path for {entry_id}: {svg!r}")

        if domain not in ALLOWED_DOMAINS:
            errors.append(f"invalid domain for {entry_id}: {domain!r}")

        if entry_id not in registry_map:
            errors.append(f"id {entry_id} missing from registry")
        elif registry_map[entry_id] != domain:
            errors.append(
                f"domain mismatch for {entry_id}: bindings={domain!r} registry={registry_map[entry_id]!r}"
            )

    return errors, seen_ids


def validate() -> int:
    bindings = _load_json(BINDINGS_PATH)
    schema = _load_json(SCHEMA_PATH)
    registry = _load_json(REGISTRY_PATH)

    errors: List[str] = []
    errors.extend(_validate_top_level(bindings, schema))

    registry_map = _index_registry(registry)
    binding_entries = bindings.get("@bindings", [])
    entry_errors, seen_ids = _validate_binding_entries(binding_entries, registry_map)
    errors.extend(entry_errors)

    missing_from_bindings = set(registry_map) - seen_ids
    if missing_from_bindings:
        errors.append(f"registry ids missing bindings: {sorted(missing_from_bindings)}")

    if errors:
        for err in errors:
            print(f"[ERROR] {err}")
        return 1

    print("All brain topology bindings validated successfully.")
    return 0


def main(argv: List[str]) -> int:
    _ = argparse.ArgumentParser(description="Validate brain topology assets").parse_args(argv)
    return validate()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
