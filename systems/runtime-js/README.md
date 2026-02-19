# systems/runtime-js

## Purpose
JavaScript/TypeScript-facing runtime and application surfaces for executing MX2LM/ASX flows.

## Authoritative entrypoints
- `systems/runtime-js/src/` (runtime source)
- `systems/runtime-js/app/` (application/web integration)
- `systems/runtime-js/build-tools/` (JS build and packaging utilities)

## Maturity / status
Implementation-focused and evolving. Expected to track core-spec changes quickly, with compatibility checks against schemas/specs.

## Dependencies
Depends on `systems/core-spec/` for protocol law and schema contracts; may consume assets/models from other top-level domains.

## Relationship to ASX/MX2LM core law
Operationalizes core law in a JS runtime: behavior here must be derivable from and conformant with the normative core-spec definitions.
