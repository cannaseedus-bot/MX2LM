# systems/core-spec

## Purpose
Holds canonical specification artifacts for MX2LM/ASX-R, including prose docs, formal schemas, and codex guidance.

## Authoritative entrypoints
- `systems/core-spec/specs/` (normative ASX-R specs)
- `systems/core-spec/schemas/` (machine-validated schema definitions)
- `systems/core-spec/docs/` (supporting design and implementation docs)
- `systems/core-spec/codex/` (Codex-facing operational documentation)
- `systems/core-spec/ASX-R_SPEC.md` (single-file ASX-R reference)

## Maturity / status
Primary source-of-truth layer. Changes here should be treated as protocol/legal updates and reviewed as high-impact.

## Dependencies
Conceptually depends on no runtime implementation; downstream runtimes and oracle ports depend on this layer.

## Relationship to ASX/MX2LM core law
Defines the core law itself: invariants, allowed structures, and interpretation rules that all other system folders must implement faithfully.
