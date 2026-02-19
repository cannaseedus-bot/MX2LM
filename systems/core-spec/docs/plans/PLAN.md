# PROJECT: MX2LM Autonomous Scaffold
**Status**: In Progress
**Iteration**: 1

## TODO
- [ ] Define surface-to-π AST lowering contract
- [ ] Wire event log replay into SVG dashboard
- [ ] Add deterministic task runner for KUHUL π

## COMPLETED
- [x] Establish scaffold entrypoints

## ARCHITECTURE
```mermaid
graph TD
  A[Surface Syntax (KUHUL-ES/SVG)] --> B[Lowering to π/AST]
  B --> C[XCFE Validation]
  C --> D[KUHUL π Runtime]
  D --> E[SVG Projection]
```

## NOTES
- Only π/AST lowered via XCFE is authoritative.
- SVG is a projection surface; it triggers tasks but does not execute logic.
- JS is optional as a transport surface, never authoritative.
