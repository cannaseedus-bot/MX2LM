# Worked Examples (Cross-Domain)

This page provides concise end-to-end examples using the symbolic runtime pipeline.

## 1) Safety Policy Enforcement

**Goal:** Reject disallowed route mutation without valid phase progression.

- Input request enters `@Pop` decode.
- Body is canonicalized and checked in `@Wo`.
- Proof mismatch at `@Sek` rejects execution (`proof_invalid`).
- No projection is emitted because collapse never occurs.

**Reference:** `scripts/reference/validate_phase_gating.mjs`

## 2) Deterministic Planning

**Goal:** Produce repeatable plan state from identical symbolic input.

- Encode plan seed with SCXQ2.
- Execute deterministic KQL retrieval/update sequence.
- Run π scoring transform (e.g., normalization/entropy).
- Emit projected plan view from sealed canonical state.

**Invariant:** same canonical input always produces same SCXQ2 fingerprint and plan projection.

**References:** `scripts/reference/validate_compression_invariants.mjs`, `docs/KQL.md`, `docs/kuhul_pi_grammar.md`

## 3) UI Projection

**Goal:** Regenerate identical shell render from sealed trace.

- Persist sealed trace + artifact hash.
- Verify seal (`trace_store.verifyTraceSeal`) before render.
- Render SVG shell from deterministic model assets.
- Compare output against expected view snapshot.

**References:** `runtime/trace_store.mjs`, `runtime/pi_shell_bridge.test.js`, `runtime/TRACE_TOOLS.md`

## Optional Runbook

```bash
node scripts/reference/validate_phase_gating.mjs
node scripts/reference/validate_compression_invariants.mjs
```
