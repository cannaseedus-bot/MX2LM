# MX2LEX — Language and Spec Index (v1)

This file collects the primary language, schema, and protocol surfaces referenced in this repository. Each entry names the authority spec, its role, and where to find the frozen definition. External specs remain authoritative at their source links; inclusion here is informational unless the content is schema-validated and lowered into π/AST under XCFE.

## Canonical entries

| Name | Role | Authority | Location |
| --- | --- | --- | --- |
| KUHUL π | Deterministic execution physics / math layer | MX2LM | `docs/kuhul_pi_grammar.md` (frozen grammar + constraints) |
| KUHUL-ES | ECMAScript-shaped surface syntax for KUHUL | `@kuhul/es` | External schema: `kuhul://schema/kuhul-es/ast/v2.1` (see upstream); referenced in docs but not embedded here |
| KPI | Binary protocol for execution/query/artifact transport | `kpi://spec/v1` | External spec (see KPI v1); not authoritative unless lowered to π/AST under XCFE |
| KQL | Deterministic query language | `kql.query.v1` | Defined in upstream KQL spec; results/requests wrapped by KPI; external authority |
| IDB | Authoritative local state/events | `idb.event.v1` / `idb.query.result.v1` | External IDB spec; KPI wraps envelopes only |
| SCX/SCXQ2 / Compression Calculus | Compression law for payloads | MX2LM | See `ASX-R_SPEC.md` and references in `docs/kuhul_pi_grammar.md` |
| GGL (Geometric Glyph Language) | Geometric/glyph narrative DSL | External (no authority here) | Only informational; non-authoritative unless lowered into π/AST |
| Sandbox contracts | Execution boundary descriptions | External (e.g., `kuhul-sandbox.v1.json`) | Informational only; authority requires schema validation + π/AST lowering |

## Organization rules

- Specs that originate outside this repo remain external law; this file records their names and roles for discoverability.
- Any new language or protocol reference must be added here with a pointer to its authoritative source and a note about its binding status.
- Only π/AST/XCFE-validated content gains execution authority within this repository’s scope.

## Upstream index

An external canonical lexicon lives at **MX2LEX**: <https://github.com/cannaseedus-bot/MX2LEX.git>. Consult that index for broader ecosystem entries; keep this file aligned when new authoritative specs are adopted.
