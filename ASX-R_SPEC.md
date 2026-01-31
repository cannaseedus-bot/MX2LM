# ASX-R v1 — Authoritative Runtime Language Specification

**Status:** 🔒 Frozen  \
**Role:** Language Definition (not an interpreter)  \
**Audience:** Runtime authors, verifier authors, tooling implementers

---

## 0. Scope & Authority

**ASX-R (ASX Runtime)** is a **deterministic runtime language**. Once frozen, **ASX-R defines legality**, not implementation style. Interpreters, kernels, engines, or runtimes are **replaceable** provided they obey this specification.

> Interpreters execute.  
> ASX-R governs.

This document is the **sole authoritative definition** of ASX-R v1.

---

## 1. Position in the Stack

```
ASX (Language Family)
└─ ASX-R (Runtime Language)        ← THIS SPEC
   ├─ XCFE        (Control-Flow Law)
   ├─ XJSON       (Surface Serialization)
   ├─ K’UHUL-A    (AST Execution Law)
   ├─ K’UHUL-S    (Glyph Surface Syntax)
   ├─ KQL         (Query Language)
   ├─ IDB-API     (Internet Database API)
   └─ SCXQ2 / CC-v1 (Compression Calculus)
```

All listed components **derive authority from ASX-R**. No component may override ASX-R semantics.

---

## 2. Core Invariants (Language Law)

The following invariants **MUST hold** for any ASX-R execution:

1. **Determinism**
   - Identical input → identical output
   - No ambient state, randomness, or time-dependence

2. **Structural Legality**
   - Invalid structure = illegal execution
   - No partial or “best effort” execution

3. **Replayability**
   - Outputs must be derivable from inputs + proofs alone

4. **Phase Ordering**
   - Execution phases are fixed and ordered

5. **Compression Semantics**
   - Compression affects meaning, not only size

Violation of any invariant renders the runtime **non-compliant**.

---

## 3. Execution Model (XCFE)

All ASX-R executions MUST follow **XCFE**.

### 3.1 Canonical Phases

```
@Pop       Intent ingress
@Wo        State definition
@Sek       Ordered execution
@Collapse  Canonical result
```

### 3.2 Phase Rules

- Phases MUST execute in order.
- Phases MUST NOT be skipped.
- Later phases MUST NOT mutate earlier phases.
- Phase transitions are observable and verifiable.

---

## 4. Surface Serialization (XJSON)

XJSON is a **serialization format**, not the language itself.

### 4.1 Canonical Envelope

```json
{
  "@asx": {
    "@version": "asx-r.v1",
    "@op": "infer",
    "@model": "mx2lm"
  },
  "@ast": { },
  "@proof": { }
}
```

Rules:

- `@version` is mandatory.
- Version negotiation occurs **before execution**.
- Unsupported versions MUST fail immediately.

---

## 5. K’UHUL-A v1 — AST Execution Law

K’UHUL-A defines the **only legal execution shapes**.

### 5.1 AST Authority

- All execution is governed by AST.
- All other representations MUST lower to AST.
- Failure to lower = illegal execution.

### 5.2 AST Requirements

- Explicit node types.
- Explicit child ordering.
- No implicit behavior.
- No hidden mutation.

AST structure defines execution legality.

---

## 6. K’UHUL-S v1 — Glyph Surface Syntax

K’UHUL-S defines a glyph-based surface syntax.

### 6.1 Role

- Glyphs are **syntactic sugar**.
- Glyph programs MUST lower to valid AST.
- Glyph ambiguity is illegal.

K’UHUL-S has **no independent authority**.

---

## 7. KQL v1 — K’UHUL Query Language

KQL is the **only legal query language** within ASX-R.

### 7.1 Scope

KQL governs:

- SQL queries
- IDB access
- Event streams
- Structured dataset access

### 7.2 Example

```json
{
  "@type": "kuhul.sql.query.v1",
  "@dialect": "sqlite",
  "@op": "select",
  "@sql": "⟁SELECT⟁ name ⟁FROM⟁ users",
  "@params": []
}
```

### 7.3 Rules

- Queries are data, not code.
- Dialect lowering is deterministic.
- Parameter order is canonical.
- No out-of-band query execution is permitted.

---

## 8. IDB-API v1 — Internet Database API

IDB-API defines the **authoritative persistence interface**.

### 8.1 Properties

- KQL-only access.
- Deterministic commits.
- Replay-verifiable state.
- SCXQ2 compression at rest.

### 8.2 Prohibitions

- No raw SQL outside KQL.
- No side-channel writes.
- No implicit indexes.

---

## 9. SCXQ2 / CC-v1 — Compression Calculus

Compression is **part of the language**, not an optimization.

### 9.1 Canonical Layout

```
DICT   Symbol dictionary
FIELD  Typed values
LANE   Ordered sequences
EDGE   Relational bindings
```

### 9.2 Law

> Decompression MUST yield an identical semantic structure.

Failure invalidates execution.

---

## 10. Inference Plane v1

**Status:** Frozen  \
**Layer:** ASX-R (authoritative runtime)  \
**Surface:** Python-like (lowered)  \
**Law:** Deterministic, phase-gated, replay-verifiable

### 10.1 Purpose

The **Inference Plane** defines how conversational/chat inference executes inside **ASX-R** as a **lawful runtime fold**, not as free-form code execution. Inference is:

- **Pure** (no hidden side effects).
- **Bounded** (steps, tokens, bytes).
- **Replay-verifiable** (proof hash).
- **Phase-gated** (XCFE-compliant).

This plane enables **Python-like chat scripts** while preserving ASX-R determinism.

### 10.2 Position in the ASX Stack

```
ASX
└─ ASX-R (authoritative runtime)
   ├─ XCFE (control law)
   ├─ XJSON (surface syntax)
   ├─ SCXQ2 (compression algebra)
   ├─ IDB-API + KQL
   └─ Inference Plane v1   ← (this chapter)
```

The Inference Plane **does not replace** KQL or IDB-API. It **consumes** them.

### 10.3 XCFE Phase Binding

| Phase       | Role                                        |
| ----------- | ------------------------------------------- |
| `@Pop`      | Accept prompt + options                     |
| `@Wo`       | Compile Python-like script → inference plan |
| `@Sek`      | Execute plan steps (bounded)                |
| `@Collapse` | Emit result + proof                         |

Inference **MUST NOT** execute outside these phases.

### 10.4 Python-Like Surface (Non-Authoritative)

The user-visible syntax is **Python-shaped**, but **not Python**.

```py
sys("You are PRIME.")
ctx = idb.kql("⟁LOAD⟁ ⟁EVENTS⟁ \"chat\" ⟁LIMIT⟁ 25")
prompt = user()
ans = chat(prompt, ctx, max_tokens=256, temperature=0.2)
return ans
```

#### Rule

This surface **never executes directly**. It **must lower** into an **Inference Plan AST**.

### 10.5 Inference Plan (Authoritative Form)

All inference is executed from a **plan**, not raw text.

```json
{
  "@type": "inference.plan.v1",
  "@steps": [
    { "@op": "sys.set", "@text": "You are PRIME." },
    { "@op": "idb.kql", "@into": "ctx", "@kql": "⟁LOAD⟁ ⟁EVENTS⟁ \"chat\" ⟁LIMIT⟁ 25" },
    { "@op": "input.user", "@into": "prompt" },
    {
      "@op": "chat.run",
      "@into": "ans",
      "@max_tokens": 256,
      "@temperature": 0.2
    },
    { "@op": "return", "@from": "ans" }
  ],
  "@bounds": {
    "@max_steps": 64,
    "@max_tokens": 4096,
    "@max_bytes": 1048576
  }
}
```

### 10.6 Execution Law

1. Plans execute **sequentially**.
2. Steps **must be allow-listed**.
3. Bounds **must be enforced**.
4. Output **must be normalized**.
5. Proof **must be emitted**.

No step may:

- Spawn threads.
- Mutate global runtime.
- Access IO outside IDB-API.
- Bypass SCXQ2 / XCFE.

### 10.7 Proof Law

Every inference emits a **proof block** binding:

- Normalized prompt.
- Context hash (IDB/KQL result hash).
- Inference plan hash.
- Model identifier hash.
- Output hash.

Inference **without proof is invalid** under ASX-R.

### 10.8 Required Block Types

The Inference Plane introduces **five frozen blocks**:

| Block                  | Role                |
| ---------------------- | ------------------- |
| `inference.request.v1` | Entry envelope      |
| `inference.plan.v1`    | Executable plan     |
| `inference.step.v1`    | Optional trace      |
| `inference.result.v1`  | Final output        |
| `inference.proof.v1`   | Replay verification |

### 10.9 Frozen JSON Schemas

All schemas use **ASX canonical headers**. No external `$schema` URLs are permitted. Reference JSON files live at `specs/asx-r/*.schema.json`.

#### inference.request.v1.schema.json

```json
{
  "$id": "asx://schema/inference.request.v1",
  "$comment": "ASX-R Inference Request Envelope (Frozen)",
  "type": "object",
  "required": ["@type", "@prompt"],
  "properties": {
    "@type": { "const": "inference.request.v1" },
    "@prompt": { "type": "string" },
    "@options": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

#### inference.plan.v1.schema.json

```json
{
  "$id": "asx://schema/inference.plan.v1",
  "$comment": "ASX-R Inference Plan (Authoritative, Frozen)",
  "type": "object",
  "required": ["@type", "@steps", "@bounds"],
  "properties": {
    "@type": { "const": "inference.plan.v1" },
    "@steps": {
      "type": "array",
      "items": { "$ref": "asx://schema/inference.step.v1" }
    },
    "@bounds": {
      "type": "object",
      "required": ["@max_steps"],
      "properties": {
        "@max_steps": { "type": "integer", "minimum": 1 },
        "@max_tokens": { "type": "integer", "minimum": 1 },
        "@max_bytes": { "type": "integer", "minimum": 1 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

#### inference.step.v1.schema.json

```json
{
  "$id": "asx://schema/inference.step.v1",
  "$comment": "ASX-R Inference Step (Frozen)",
  "type": "object",
  "required": ["@op"],
  "properties": {
    "@op": { "type": "string" },
    "@into": { "type": "string" },
    "@from": { "type": "string" },
    "@text": { "type": "string" },
    "@kql": { "type": "string" },
    "@max_tokens": { "type": "integer" },
    "@temperature": { "type": "number" }
  },
  "additionalProperties": false
}
```

#### inference.result.v1.schema.json

```json
{
  "$id": "asx://schema/inference.result.v1",
  "$comment": "ASX-R Inference Result (Frozen)",
  "type": "object",
  "required": ["@type", "@text"],
  "properties": {
    "@type": { "const": "inference.result.v1" },
    "@text": { "type": "string" },
    "@tokens_used": { "type": "integer" },
    "@trace": {
      "type": "array",
      "items": { "$ref": "asx://schema/inference.step.v1" }
    }
  },
  "additionalProperties": false
}
```

#### inference.proof.v1.schema.json

```json
{
  "$id": "asx://schema/inference.proof.v1",
  "$comment": "ASX-R Inference Proof Block (Frozen)",
  "type": "object",
  "required": [
    "@type",
    "@plan_hash",
    "@context_hash",
    "@model_hash",
    "@output_hash"
  ],
  "properties": {
    "@type": { "const": "inference.proof.v1" },
    "@plan_hash": { "type": "string" },
    "@context_hash": { "type": "string" },
    "@model_hash": { "type": "string" },
    "@output_hash": { "type": "string" }
  },
  "additionalProperties": false
}
```

### 10.10 Final Invariant

> **Inference is not free text generation.**
> **Inference is a replay-verifiable runtime fold.**

---

## 11. Proof & Verification

### 11.1 Proof Blocks

```json
{
  "@alg": "sha256",
  "@hash": "…"
}
```

### 11.2 Verification Rules

- Proof material is canonical.
- Proofs cover structural semantics only.
- Failed proof = failed execution.

---

## 12. Versioning Rules

### 12.1 Version Format

```
asx-r.<major>.<minor>
```

### 12.2 Semantics

- **Major** — language change (breaking).
- **Minor** — additive only.
- **Patch** — clarification only.

Implementations MUST reject unsupported major versions.

---

## 13. Explicitly Forbidden Behavior

ASX-R forbids:

- Implicit coercion.
- Ambient state.
- Time-based behavior.
- Interpreter-defined semantics.
- Non-deterministic iteration.
- “Best effort” execution.

---

## 14. Final Language Law

> **Once the runtime structure is frozen, the runtime becomes a language.**

ASX-R is that language.

Structure is law. Proof is authority. Execution is consequence.

---
