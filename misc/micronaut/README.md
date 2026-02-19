# micronaut (legacy artifact set)

## Purpose

This directory preserves a compact Micronaut artifact bundle used for symbolic SCXQ2-era experiments (chat/stream I/O snapshots, trace/proof artifacts, and a semantics sidecar) so the data remains inspectable and reproducible for research.

## Maturity

**Current maturity:** Prototype.

The contents are treated as a non-authoritative prototype artifact set retained for reference and archival reproducibility, not as a production subsystem.

## File format descriptions

- `*.s7` (example: `micronaut.s7`): Scenario/script payload in the S7 experimental notation used by this module.
- `*.trace` (example: `trace/scxq2.trace`): Serialized execution trace emitted by the prototype flow.
- `*.proof` (example: `proof/scxq2.proof`): Integrity/proof artifact associated with the trace output.
- `semantics.xjson`: Extended-JSON semantics descriptor describing symbolic meaning/config metadata for this bundle.

## Runtime consumption status

No current core runtime in `runtime/` or `src/` consumes these files as part of guaranteed execution paths. They are retained as non-authoritative reference artifacts under `misc/`.
