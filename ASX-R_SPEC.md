# ASX-R Specification

## Appendix A — ASX Family Glossary (Normative)

### 1. ASX
- Language family umbrella defining hierarchy, invariants, and authority model.
- All ASX artifacts reduce to canonical structure with verifiable legality.
- Contains ASX-R, XJSON, XCFE, SCXQ2/CC-v1, K’UHUL layers, query/storage layers, proof layers, conformance.

### 2. ASX-R
- Authoritative runtime language defining legal executions independent of implementation.
- Non-negotiables: determinism, structural legality, replayability, fixed phases, compression semantics.
- Execution phases: `@Pop → @Wo → @Sek → @Collapse` (XCFE-governed).
- Authority source for all other layers.

### 3. XJSON
- Surface serialization and transport form representing ASX structures as JSON envelopes.
- Must lower deterministically into ASX-R-legal AST shapes; not itself the language.

### 4. XCFE
- Control-flow law governing allowed phase ordering, barriers, branch legality, and control vectors.
- Guarantees auditable, proof-bindable branching with no hidden control flow.
- Mandated by ASX-R for anything that runs.

### 5. K’UHUL-A
- AST execution law defining legal execution shapes, node types, child order, and explicitness.
- Requires all content to lower to K’UHUL-A AST with no implicit behavior or hidden mutation.

### 6. K’UHUL-S
- Glyph surface syntax providing compressed/visual surface forms for programs.
- Glyphs have no authority and must deterministically lower to K’UHUL-A AST; ambiguity is illegal.

### 7. ARS
- Structural scripting syntax (human-writable) compiling into XJSON blocks then ASX-R AST.
- Not a JS-like runtime; includes phase, let/const, emit, assert, plan, apply, seal, structural declarations.

### 8. ARS Classes
- Structural types (schemas/templates) defining allowed fields, typing, and defaults.
- Exclude methods, inheritance dispatch, and runtime polymorphism; used for typed state and deterministic validation.

### 9. ASX Geometry
- Structural geometry layer defining spaces (2D/3D), shapes, and coordinate semantics.
- Purpose: verifiable, compressible spatial state; not rendering.

### 10. ASX Metrics
- Metric structure layer defining distance/angle/geodesic meaning and metric spaces/tensors.
- Enforces legality constraints on spatial relationships; not imperative math loops.

### 11. MFA-1 — Metric-aware Fold Assertions
- Metric constraints as verifier-grade assertions (e.g., `distance(p,q) < 10`).
- Failing assertions propose illegal state; bound to proof roots and replay.

### 12. G2L-1 — Geometry → SCXQ2 Lane Mapping
- Deterministic mapping from geometry/types to SCXQ2 lanes with stable-name hashing.
- Enforces canonical ordering; mandatory when geometry exists.

### 13. SCXQ2
- Execution/compression algebra with DICT/FIELD/ LANE/EDGE core layout and batch framing.
- Meaning representation requiring decompression to yield identical semantics.

### 14. CC-v1 (Compression Calculus v1)
- Formal math spec behind compression semantics; SCXQ2 is its instantiation.
- Defines operators and laws for meaning-preserving compression transformations.

### 15. Proof System
- Hash-based proof material binding structure to legality for replay verification.
- Proof failure equals execution failure; scope limited to structural semantics.

### 16. Conformance Suite
- Test vector and verifier contract set for ASX-R.
- Defines compliant runtime accept/reject behavior, including phase rules, AST legality, SCXQ2 decoding, proof checks, KQL normalization, metric assertions.

### 17. ASX-R/REF (Reference Interpreter Profile)
- Non-code profile defining strictest baseline behavior.
- Guarantees portability: passing REF implies passing elsewhere; defines canonical ordering, rejection rules, minimal supported blocks, verifier obligations.

### 18. KQL (K’UHUL Query Language)
- Only legal query language in ASX family, representing queries as data/AST.
- Deterministic lowering of dialects with canonical parameter order; no executable strings.

### 19. IDB-API + KQL v1
- Authoritative persistence interface for ASX runtimes using deterministic commits and replay-verifiable history.
- KQL-only access with SCXQ2 at rest; forbids raw SQL, side-channel writes, implicit indexes.

### 20. MX2DB / Local DB Plane
- Database substrate storing ASX structures (event logs, folds, proofs, lanes, dictionaries, conformance artifacts).
- Storage holds canonical forms without introducing semantics.

### 21. ASX RAM
- Volatile tick-scoped state plane for execution phases.
- Disposable between ticks yet provable/replayable from event/proof log.

### 22. Runtime Folds
- Structural execution substrate comprising named folds (compute, geometry, query, proof, etc.).
- Folds declare structure and constraints; execution is phase-governed and auditable.

### 23. K’UHUL π
- Math/physics script layer within the kernel ecosystem providing deterministic math primitives.
- Must lower to AST and remain deterministic; does not override ASX-R legality.

### 24. Projection Law (CSS/DOM/UI)
- UI projection rule: rendering reflects deterministic runtime state without defining semantics.
- CSS/DOM act as projection surfaces only.

### 25. K’UHUL Kernel Layer (Implementation Substrate)
- Practical execution engine (e.g., `sw.khl`) executing legal structures.
- Replaceable implementation; deviation indicates non-compliance.

### 26. Tape System (Packaging)
- Canonical packaging of runnable fold bundles (“tapes”) for deterministic distribution.
- Tapes are content and cannot change language semantics.

### 27. Shards / Multi-Hive Architecture
- Partitioning of folds/responsibilities into isolated domains (prime, scxq2, math_pi, training, etc.).
- Supports scalability and separation without altering legality; boundaries affect deployment only.

### 28. Mesh / Network Layer
- Transport and coordination layer for moving ASX structures while preserving proofs and canonical forms.
- Network transports content without injecting semantics.

### 29. MeshChain
- Contract/ledger domain expressed as ASX structures for deterministic contract execution and replayable ledger state.
- Uses XJSON + KQL + proofs; contracts are data with verifiable execution.

### 30. Liquidaty
- Solidity-style DSL compiling into ASX contract blocks.
- Human-friendly authoring; compiled XJSON `@asx_contract` blocks define execution under mesh governance.

### 31. SecuroLink
- Zero-trust capability-link identity/auth layer issuing scoped capability keys and domain-bound tokens.
- Auth gates access without defining runtime meaning.

### 32. Verification / Native Verify Flux
- Phase+barrier proof system auditing key transitions (e.g., rotation proofs, replay proofs).
- Enforces structural, deterministic, hash-bound proofs with non-reentrancy and monotonic rules.

### 33. AGL (Atomic Glyph Language)
- Governed glyph lifecycle, registry, and grammar for atomic glyphs.
- Ensures deterministic lowering and safety via registry invariants.

### 34. ASM (Atomic Symbolic Markup)
- Attribute-based symbolic DOM semantics (⚛️ and ⟁) with deterministic binding.
- Embeds semantic structure in valid HTML as projection/structure descriptor without execution authority.

### 35. ATOMIC.CSS / ATOMIC.XJSON
- Visual control surface and machine-readable visual schema.
- CSS variables/classes project runtime state; they do not define semantics.

### 36. ASXR (Runtime Bundle / Browser VM Edition)
- Deployable runtime bundle executing tapes/blocks in browser environments (service worker, DOM bridges).
- Implementation must obey ASX-R.

### 37. Trinity Runtime (CPU/GPU/TPU)
- Multi-runtime orchestration for routing workloads across shards while preserving required determinism.
- Performance layer without semantic alteration.

### 38. ASX “Everything Gets Compressed” Law
- Family-wide rule requiring all semantic artifacts to have SCXQ2 form.
- If content cannot lower into canonical SCXQ2 structure, it is invalid ASX family material.
