# Canonical Glossary: Glyphs, Atoms, and Phase Gates

This glossary is normative for repository-level terminology and links to authoritative specs.

## Glyphs

- **Glyph**: A stable symbolic token used to represent compressed meaning units and control markers in ASX/KQL/SCXQ2 contexts. See `docs/kuhul_query_language_spec_v1.md`.
- **SCXQ2 envelope glyph**: Encoded wrapper with deterministic fingerprint and payload framing (e.g., `⟁SCXQ2:...⟁`). See `sw.js` and `docs/REFERENCE_ATOMIC_RUNTIME_APPENDIX.md`.
- **Seal glyph**: Immutable integrity wrapper for hashes (e.g., `⟁SEAL⟁sha256:<hex>⟁`). See `runtime/trace_store.mjs` and `runtime/TRACE_TOOLS.md`.

## Atoms

- **Atomic runtime**: Minimal deterministic compute unit that can be replayed, verified, and composed. See `docs/REFERENCE_ATOMIC_RUNTIME_APPENDIX.md`.
- **Projection atom**: Runtime component that produces non-authoritative render output from authoritative state (SVG/UI/chat). See `docs/specs/MX2LM_MANIFESTO.md`.
- **Verification atom**: Tooling unit that checks seals, hashes, and phase legality (`runtime/trace_inspector.mjs`, `runtime/trace_store.mjs`).

## Phase Gates

- **Phase gate**: Hard boundary that constrains legal transitions in ASX-R pipelines.
- **`@Pop`**: Input decode and shape/parsing gate.
- **`@Wo`**: Canonicalization and structural legality gate.
- **`@Sek`**: Proof/integrity validation gate.
- **`@Collapse`**: Frozen output sealing gate.

Authoritative gate ordering is implemented in `sw.js` and grounded in `docs/specs/ASX-R_SPEC.md`.

## Cross-Link Map

- ASX-R runtime law: `docs/specs/ASX-R_SPEC.md`
- KQL formal language spec: `docs/kuhul_query_language_spec_v1.md`
- KQL implementation/runtime notes: `docs/KQL.md`
- π grammar/runtime intent: `docs/kuhul_pi_grammar.md`
- Atomic runtime appendix: `docs/REFERENCE_ATOMIC_RUNTIME_APPENDIX.md`
- Trace tools/hash sealing: `runtime/TRACE_TOOLS.md`, `runtime/trace_store.mjs`
