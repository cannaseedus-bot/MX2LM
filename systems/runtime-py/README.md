# systems/runtime-py

## Purpose
Python runtime, tooling, and verification harnesses for MX2LM/ASX workflows.

## Authoritative entrypoints
- `systems/runtime-py/runtime/` (Python runtime modules, including symbolic LLM scaffold in `symbolic_llm.py`)
- `systems/runtime-py/tools/` (developer and automation utilities)
- `systems/runtime-py/tests/` (test and conformance coverage)

## Maturity / status
Reference-capable implementation with active development. Serves as a practical validation environment for spec compliance.

## Dependencies
Depends on `systems/core-spec/` for schemas/specs and may interoperate with oracle ports for cross-runtime checks.

## Relationship to ASX/MX2LM core law
Provides executable interpretation and conformance tests for core law; any divergence from `systems/core-spec/` should be treated as a defect.
