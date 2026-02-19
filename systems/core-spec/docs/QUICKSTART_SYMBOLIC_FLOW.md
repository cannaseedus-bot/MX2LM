# Quick-Start: End-to-End Symbolic Flow

This diagram shows the canonical runtime path:

`ASX-R → SCXQ2 → KQL → π → projection`

```mermaid
flowchart LR
    A[ASX-R runtime law\nphase/invariant gates] --> B[SCXQ2\ncompression + canonicalization]
    B --> C[KQL\ndeterministic query/execution]
    C --> D[π runtime\ndeterministic math transforms]
    D --> E[Projection\nUI/SVG/chat non-authoritative views]

    A -.spec.-> A1[docs/specs/ASX-R_SPEC.md]
    B -.spec.-> B1[docs/REFERENCE_ATOMIC_RUNTIME_APPENDIX.md]
    C -.spec.-> C1[docs/kuhul_query_language_spec_v1.md]
    D -.spec.-> D1[docs/kuhul_pi_grammar.md]
    E -.runtime.-> E1[runtime/pi_svg_model_kernel.py]
```

## Flow Notes

1. **ASX-R phase gates** validate legal transitions before any computation executes.
2. **SCXQ2** converts payloads to canonical compressed symbolic forms.
3. **KQL** performs deterministic data retrieval/manipulation over runtime stores.
4. **π** computes deterministic transforms (vectors, entropy, scoring, geometry).
5. **Projection** renders artifacts (SVG/UI/chat) as views of already-sealed state.

See also:
- `scripts/reference/validate_phase_gating.mjs`
- `scripts/reference/validate_compression_invariants.mjs`
