# Verification Tooling and Hash-Sealing Workflows

This document describes how runtime traces are sealed and verified.

## Tooling

- `runtime/trace_store.mjs`
  - `hashJson(value)` deterministic SHA-256 for canonical JSON content.
  - `sealFromHash(hex)` emits symbolic seal glyph.
  - `computeTraceSeal(trace, shellHash)` binds trace identity + input/effect/output hashes (+ optional shell hash).
  - `verifyTraceSeal(trace, shellHash)` validates seal integrity.
  - `persistTraceRecord(...)` writes immutable trace + artifact record.
- `runtime/trace_inspector.mjs`
  - Trace diagnostics and replay inspection.
- `runtime/TRACE_TOOLS.md`
  - Operator-facing usage notes.

## Canonical Workflow

1. Build deterministic trace payload (`trace_id`, hashes for inputs/effects/output).
2. Compute trace seal with `computeTraceSeal`.
3. Render or reference a projection artifact (e.g., SVG shell).
4. Compute artifact hash and seal.
5. Persist immutable record via `persistTraceRecord`.
6. On replay/audit, run `verifyTraceSeal` prior to projection use.

## Security and Integrity Invariants

- Immutable archive behavior: existing records cannot be overwritten with divergent seal/hash.
- Trace seal binds both symbolic runtime transitions and projection artifact identity.
- Sealed outputs are suitable for deterministic replay and compliance checks.

## Reference Command Snippet

```bash
node -e "import('./runtime/trace_store.mjs').then(({computeTraceSeal}) => { const t={trace_id:'demo',hashes:{inputs:'a',effects:'b',output:'c'}}; console.log(computeTraceSeal(t,'shell')); })"
```
