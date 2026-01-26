#!/usr/bin/env python3
"""
Validate brain topology SVG bindings against the repository schema and registry.

Checks performed:
1) JSON Schema validation using the bundled schema definition.
2) Referential integrity between binding IDs and the topology registry.
3) SVG path and domain validation using the schema's declared constraints.
4) Enforcement of @rules invariants to guarantee projection-only, non-executable assets.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "brains" / "brain_topology_bindings.schema.json"
BINDINGS_PATH = REPO_ROOT / "brains" / "brain_topology_bindings.svg.json"
REGISTRY_PATH = REPO_ROOT / "brains" / "brain_topology.registry.json"
METADATA_FIELDS = {"$id", "$schema", "@description"}

def strip_json_comments(raw: str) -> str:
    """Remove // and /* */ style comments from JSON-like text, ignoring strings."""
    result: list[str] = []
    i = 0
    in_string = False
    escape = False

    while i < len(raw):
        ch = raw[i]
        nxt = raw[i + 1] if i + 1 < len(raw) else ""

        if in_string:
            result.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue

        if ch == '"':
            in_string = True
            result.append(ch)
            i += 1
            continue

        if ch == "/" and nxt == "/":
            # Skip until end of line, preserve newline if present.
            i += 2
            while i < len(raw) and raw[i] not in ("\n", "\r"):
                i += 1
            if i < len(raw):
                result.append(raw[i])
                i += 1
            continue

        if ch == "/" and nxt == "*":
            # Skip until closing */
            i += 2
            while i + 1 < len(raw) and not (raw[i] == "*" and raw[i + 1] == "/"):
                if raw[i] in ("\n", "\r"):
                    result.append(raw[i])
                i += 1
            i += 2  # Skip the closing */
            continue

        result.append(ch)
        i += 1

    return "".join(result)


def load_json(path: Path, *, allow_comments: bool = False) -> Any:
    """Load JSON from disk, optionally stripping comments first."""
    contents = path.read_text(encoding="utf-8")
    if allow_comments:
        contents = strip_json_comments(contents)
    return json.loads(contents)


def validate_against_schema(instance: Any, schema: Mapping[str, Any]) -> List[str]:
    """
    Perform a lightweight JSON schema validation for the specific bindings schema.

    Supported keywords: type, properties, required, additionalProperties, items,
    minItems, pattern, enum, const, and $ref into #/$defs.
    """
    errors: List[str] = []
    definitions: Mapping[str, Any] = schema.get("$defs", {})

    def resolve(node: Mapping[str, Any]) -> Mapping[str, Any]:
        ref = node.get("$ref")
        if ref and isinstance(ref, str) and ref.startswith("#/$defs/"):
            key = ref.split("/")[-1]
            target = definitions.get(key)
            if target is None:
                errors.append(f"Unresolvable schema reference: {ref}")
                return {}
            return target
        return node

    def validate_node(value: Any, node_schema: Mapping[str, Any], path: str) -> None:
        resolved_schema = resolve(node_schema)
        expected_type = resolved_schema.get("type")

        type_mapping = {
            "object": dict,
            "array": list,
            "string": str,
            "boolean": bool,
        }

        if expected_type:
            python_type = type_mapping.get(expected_type)
            if python_type is None:
                errors.append(f"{path}: Unsupported schema type '{expected_type}'")
                return
            if not isinstance(value, python_type):
                errors.append(
                    f"{path}: Expected {expected_type}, found {type(value).__name__}"
                )
                return

        if "const" in resolved_schema and value != resolved_schema["const"]:
            errors.append(
                f"{path}: Expected constant value {resolved_schema['const']!r}, "
                f"found {value!r}"
            )
            return

        if expected_type == "object":
            properties: Mapping[str, Any] = resolved_schema.get("properties", {})
            required_fields: Sequence[str] = resolved_schema.get("required", [])

            for field in required_fields:
                if field not in value:
                    errors.append(f"{path}: Missing required field '{field}'")

            if resolved_schema.get("additionalProperties") is False:
                allowed_extras = METADATA_FIELDS if path == "<root>" else set()
                extras = set(value.keys()) - set(properties.keys()) - allowed_extras
                for extra in sorted(extras):
                    errors.append(f"{path}: Unexpected field '{extra}'")

            for key, child in value.items():
                if key in properties:
                    child_path = f"{path}.{key}" if path else key
                    validate_node(child, properties[key], child_path)

        elif expected_type == "array":
            min_items = resolved_schema.get("minItems")
            if min_items is not None and len(value) < int(min_items):
                errors.append(
                    f"{path}: Expected at least {min_items} item(s), found {len(value)}"
                )
            item_schema = resolved_schema.get("items")
            if item_schema:
                for index, item in enumerate(value):
                    validate_node(item, item_schema, f"{path}[{index}]")

        elif expected_type == "string":
            enum_values: Iterable[str] | None = resolved_schema.get("enum")
            if enum_values is not None and value not in enum_values:
                errors.append(
                    f"{path}: Value {value!r} not in allowed set {list(enum_values)}"
                )

            pattern = resolved_schema.get("pattern")
            if pattern and not re.fullmatch(pattern, value):
                errors.append(
                    f"{path}: Value {value!r} does not match pattern {pattern!r}"
                )

        elif expected_type == "boolean":
            # No extra validation beyond the type/const checks.
            pass

    validate_node(instance, schema, "<root>")
    return errors


def load_registry_ids(path: Path) -> set[str]:
    registry = load_json(path, allow_comments=True)
    brains = registry.get("brains", [])
    if not isinstance(brains, list):
        raise ValueError("Registry 'brains' field must be an array")
    ids = []
    for entry in brains:
        if isinstance(entry, Mapping) and "id" in entry:
            ids.append(str(entry["id"]))
    return set(ids)


def check_bindings(
    bindings: Sequence[Mapping[str, Any]],
    registry_ids: set[str],
    id_pattern: str,
    svg_pattern: str,
    allowed_domains: Sequence[str],
) -> List[str]:
    errors: List[str] = []
    id_regex = re.compile(id_pattern)
    svg_regex = re.compile(svg_pattern)
    seen_ids: set[str] = set()

    for entry in bindings:
        entry_id = entry.get("id")
        svg_path = entry.get("svg")
        domain = entry.get("domain")
        if entry_id is None:
            errors.append("Binding missing 'id'")
            continue

        if not isinstance(entry_id, str) or not id_regex.fullmatch(entry_id):
            errors.append(f"Binding id {entry_id!r} does not match pattern {id_pattern}")
        if entry_id in seen_ids:
            errors.append(f"Duplicate binding id detected: {entry_id}")
        seen_ids.add(entry_id)
        if entry_id not in registry_ids:
            errors.append(f"Binding id {entry_id!r} not found in registry")

        if svg_path is None:
            errors.append(f"{entry_id}: missing 'svg' path")
        elif not isinstance(svg_path, str) or not svg_regex.fullmatch(svg_path):
            errors.append(
                f"{entry_id}: svg path {svg_path!r} does not match {svg_pattern}"
            )

        if domain is None:
            errors.append(f"{entry_id}: missing 'domain'")
        elif domain not in allowed_domains:
            errors.append(
                f"{entry_id}: domain {domain!r} not in allowed set {list(allowed_domains)}"
            )

    return errors


def check_rules_invariants(bindings_doc: Mapping[str, Any]) -> List[str]:
    errors: List[str] = []
    rules = bindings_doc.get("@rules")
    if not isinstance(rules, Mapping):
        return ["Missing @rules block or it is not an object"]

    runtime_exec = rules.get("@runtime_execution")
    projection_only = rules.get("@projection_only")

    if runtime_exec is not False:
        errors.append("@rules.@runtime_execution must be false to forbid execution")
    if projection_only is not True:
        errors.append("@rules.@projection_only must be true to enforce projections")

    executable_flag = bindings_doc.get("@executable")
    if executable_flag not in (False, None):
        errors.append("@executable must be false for bindings documents")

    return errors


def build_report_line(label: str, issues: Sequence[str]) -> str:
    status = "OK" if not issues else f"FAILED ({len(issues)} issue(s))"
    return f"{label}: {status}"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate brain topology SVG bindings against schema and registry."
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only emit errors, suppress success banner.",
    )
    args = parser.parse_args(argv)

    try:
        schema = load_json(SCHEMA_PATH)
        bindings_doc = load_json(BINDINGS_PATH, allow_comments=True)
        registry_ids = load_registry_ids(REGISTRY_PATH)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Failed to load validation inputs: {exc}", file=sys.stderr)
        return 1

    schema_errors = validate_against_schema(bindings_doc, schema)

    defs = schema.get("$defs", {})
    binding_def = defs.get("binding_entry", {})
    id_pattern = binding_def.get("properties", {}).get("id", {}).get(
        "pattern", ".*"
    )
    svg_pattern = binding_def.get("properties", {}).get("svg", {}).get(
        "pattern", ".*"
    )
    allowed_domains = binding_def.get("properties", {}).get("domain", {}).get(
        "enum", []
    )

    bindings = bindings_doc.get("@bindings", [])
    binding_errors = []
    if isinstance(bindings, list):
        binding_errors = check_bindings(
            bindings, registry_ids, id_pattern, svg_pattern, allowed_domains
        )
    else:
        binding_errors = ["@bindings must be an array of binding entries"]

    invariant_errors = check_rules_invariants(bindings_doc)

    all_errors = [*schema_errors, *binding_errors, *invariant_errors]

    report_lines = [
        build_report_line("Schema validation", schema_errors),
        build_report_line("Registry and SVG checks", binding_errors),
        build_report_line("Rules invariants", invariant_errors),
    ]

    if not args.quiet:
        print("Brain topology bindings validation report")
        for line in report_lines:
            print(f"- {line}")

    if all_errors:
        print("Issues detected:")
        for issue in all_errors:
            print(f"- {issue}")
        return 1

    if not args.quiet:
        print("All bindings are valid and projection-only.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
