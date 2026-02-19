# Miscellaneous Modules

This directory contains non-production workstreams that are intentionally excluded from the main runtime path.

## `experimental/kuhul_poc/`

**Status:** Experimental proof-of-concept (not production-path).

`kuhul_poc` is an exploratory CLI/SVG/event-log prototype. It is preserved for iteration, but it is not part of the supported MX2LM runtime surface and should not be treated as canonical execution infrastructure.

### Graduation criteria

The module can be considered for promotion out of `misc/experimental/` only after all of the following are met:

1. **Packaging correctness:** Uses package-safe imports (`python -m ...`) and includes lockstep dependency/runtime metadata.
2. **Test coverage:** Includes automated unit/integration tests for command handling, replay determinism, and SVG output stability.
3. **Docs + operator contract:** Has clear CLI docs, I/O schemas, and failure-mode behavior documented in root docs.
4. **Runtime integration proof:** Demonstrates a validated, deterministic handoff with `runtime/` or `src/` and records artifacts in CI.
5. **Ownership + maintenance:** Declares maintainers and a support policy (versioning, deprecation, and compatibility guarantees).

## `micronaut/`

**Status:** Prototype reference bundle (non-authoritative, excluded from core runtime guarantees).

This module has been relocated to `misc/micronaut/` and is preserved for artifact inspection only. See `misc/micronaut/README.md` for format and runtime-consumption notes.
