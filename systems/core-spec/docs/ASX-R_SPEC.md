# ASX-R Specification (Frozen)

This document captures the authoritative, minimal grammar and canonical examples for ASX-R v1. It is locked and mirrors the frozen surface semantics and compression laws already aligned with ASX-R.

---

## ASX-R_GRAMMAR.ebnf

```ebnf
# ASX-R_GRAMMAR.ebnf
# Status: 🔒 Frozen
# Scope: Authoritative Grammar for ASX-R v1
# Role: Defines all legal surface forms that may lower into ASX-R AST

# ============================================================
# 0. Lexical
# ============================================================

letter        ::= "A"…"Z" | "a"…"z" | "_" ;
digit         ::= "0"…"9" ;
hex           ::= digit | "a"…"f" | "A"…"F" ;

ident         ::= letter (letter | digit)* ;
number        ::= digit+ ("." digit+)? ;
string        ::= '"' ( any_char_except_quote )* '"' ;
bool          ::= "true" | "false" ;

literal       ::= number | string | bool | "null" ;

path          ::= ident ( "." ident | "[" number "]" )* ;

# ============================================================
# 1. File Structure
# ============================================================

program       ::= header+ phase_block+ ;

header        ::= version_decl
               | profile_decl
               | fold_decl
               | import_decl ;

version_decl  ::= "asx-r" version ;
profile_decl  ::= "profile" ident version ;
fold_decl     ::= "fold" ident version ;
import_decl   ::= "import" string ;

version       ::= digit+ "." digit+ ( "." digit+ )? ;

# ============================================================
# 2. XCFE Phases
# ============================================================

phase_block   ::= "phase" phase_name "{" statement* "}" ;

phase_name    ::= "@Pop" | "@Wo" | "@Sek" | "@Collapse" ;

# ============================================================
# 3. Statements
# ============================================================

statement     ::= let_stmt
               | const_stmt
               | emit_stmt
               | assert_stmt
               | plan_stmt
               | apply_stmt
               | seal_stmt
               | class_decl
               | shape_decl
               | geometry_decl
               | metric_decl
               | lane_decl
               | lane_op ;

# ============================================================
# 4. State & Binding
# ============================================================

let_stmt      ::= "let" path ( ":" type )?
               | "let" path "=" expr
               | "let" path ":" type "=" expr ;

const_stmt    ::= "const" ident "=" expr ;

type          ::= "number"
               | "string"
               | "bool"
               | ident
               | "array" "<" type ">" ;

expr          ::= literal
               | path
               | call_expr
               | expr infix_op expr ;

infix_op      ::= "+" | "-" | "*" | "/"
               | "==" | "!=" | "<" | "<=" | ">" | ">=" ;

call_expr     ::= ident "(" arg_list? ")" ;
arg_list      ::= expr ( "," expr )* ;

# ============================================================
# 5. Structural Classes
# ============================================================

class_decl    ::= "class" ident "{" class_field* "}" ;
class_field   ::= ident ":" type ( "=" literal )? ;

# ============================================================
# 6. Geometry & Metrics
# ============================================================

shape_decl    ::= "shape" ident "{" shape_field* "}" ;
shape_field   ::= ident ":" type ;

geometry_decl ::= "geometry" ident "{" geometry_prop* "}" ;
geometry_prop ::= "manifold" ":" ident
               | "dimensions" ":" number
               | "metric" ":" ident
               | "metric_tensor" ":" ident ;

metric_decl   ::= "metric" ident "{" metric_prop* "}" ;
metric_prop   ::= "kind" ":" ident
               | "space" ":" ident
               | "dimensions" ":" number
               | "formula" ":" string
               | "tensor" ":" ident ;

# ============================================================
# 7. Events
# ============================================================

emit_stmt     ::= "emit" ident object_literal? ;

object_literal ::= "{" ( object_pair ( "," object_pair )* )? "}" ;
object_pair    ::= ident ":" expr ;

# ============================================================
# 8. Assertions (Structural + Metric)
# ============================================================

assert_stmt   ::= "assert" expr
               | "assert" metric_assert ;

metric_assert ::= metric_fn "(" expr "," expr ")"
                  metric_cmp number
                  "using" ident
                  metric_tol? ;

metric_fn     ::= "distance" | "contains" | "angle" | "geodesic" ;
metric_cmp    ::= "<" | "<=" | ">" | ">=" | "==" ;
metric_tol    ::= "tol" number ;

# ============================================================
# 9. Execution Planning
# ============================================================

plan_stmt     ::= "plan" ident "{" plan_step+ "}" ;
plan_step     ::= "step" ident "uses" ident ( "->" ident )* ;

# ============================================================
# 10. SCXQ2 Lanes
# ============================================================

lane_decl     ::= "lane" ident ":" lane_body ;

lane_body     ::= "dict" number
                  "field" number
                  "batch" number
                  "offsets" array_literal
                  "payload" array_literal ;

array_literal ::= "[" ( expr ( "," expr )* )? "]" ;

lane_op       ::= "lane" ident ":" "op" "(" object_literal ")" ;

# ============================================================
# 11. Collapse & Proof
# ============================================================

apply_stmt    ::= "apply" ident ;
seal_stmt     ::= "seal" ( "as" ident )? ;

# ============================================================
# End of Grammar
# ============================================================
```

---

## ASX-R “Hello World” (Canonical, Minimal, Lawful)

This is the smallest valid ASX-R program that passes XCFE, uses AST authority, emits observable output, and seals proof.

```ars
asx-r 1.0

phase @Pop {
  let message = "hello world"
}

phase @Wo {
  emit log { text: message }
}

phase @Sek {
  apply log
}

phase @Collapse {
  seal
}
```

Canonical lowering summary:

* `message` → FIELD lane (string interned)
* `emit log` → event block
* `apply log` → ordered execution
* `seal` → proof root

---

## Canonical Geometry Catalog (ASX-R v1 — Required Set)

Primitive shapes (structural, not renderable):

```ars
shape Point {
  x: number
  y: number
}
```

```ars
shape Vec3 {
  x: number
  y: number
  z: number
}
```

```ars
shape Line {
  a: Point
  b: Point
}
```

Area and volume shapes:

```ars
shape Circle {
  center: Point
  radius: number
}
```

```ars
shape Rect {
  min: Point
  max: Point
}
```

```ars
shape Box3D {
  min: Vec3
  max: Vec3
}
```

```ars
shape Sphere {
  center: Vec3
  radius: number
}
```

Canonical geometries (manifolds):

```ars
geometry Plane2D {
  manifold: euclidean
  dimensions: 2
  metric: L2
}
```

```ars
geometry Space3D {
  manifold: euclidean
  dimensions: 3
  metric: L2
}
```

```ars
geometry Surface {
  manifold: riemannian
  dimensions: 2
  metric_tensor: g_ij
}
```

---

## Canonical Metric Set (ASX-R v1 — Required)

```ars
metric L2 {
  kind: distance
  space: euclidean
}
```

```ars
metric L1 {
  kind: distance
  space: manhattan
}
```

```ars
metric Linf {
  kind: distance
  space: chebyshev
}
```

```ars
metric Geodesic {
  kind: distance
  space: manifold
}
```

---

## Compression Law (SCXQ2 Bindings)

Every ASX-R artifact must be representable in SCXQ2 form. Nothing uncompressed is legal ASX-R. This applies to:

| Artifact   | Compression Path               |
| ---------- | ------------------------------ |
| AST        | AST → FIELD / EDGE lanes       |
| KQL        | Query → normalized AST → SCXQ2 |
| Geometry   | Shape → DICT + FIELD lanes     |
| Metrics    | Metric blocks → DICT metadata  |
| Assertions | Predicate AST → SCXQ2          |
| Proofs     | Hash roots → SCXQ2 META        |
| Events     | Payload → FIELD lanes          |

ASX-R assumes G2L-1 and MFA-1 and introduces no new semantics beyond the frozen grammar above.

---

## Next Step (Binding)

The only remaining action is to bind the grammar directly to AST node schemas (one-to-one) and emit the SCXQ2 canonical form of the Hello World example.

---

## ASX-R “Ultimate Example” Envelope (Deterministic, Replayable)

```json
{
  "@id": "asx://schema/asx.ultimate.example.v1",
  "@type": "asx.schema.bundle.v1",
  "@status": "FROZEN_EXAMPLE",
  "@note": "Ultimate example pack: one coherent ASX-R envelope that demonstrates XCFE control, AST legality, KQL/IDB-API, SCXQ2 packing lanes, proof/hash binding, and deterministic replay.",
  "@schema": "xjson://schema/core/v1",
  "@version": "1.0.0",

  "@inline": {
    "schemas": {
      "asx.envelope.v1": {
        "@id": "asx://schema/asx.envelope.v1",
        "@type": "schema",
        "@rules": {
          "deterministic": true,
          "offline_replayable": true,
          "no_external_schema_urls": true,
          "phase_order": ["@Pop", "@Wo", "@Sek", "@Ch'en"],
          "no_eval": true
        },
        "required": ["@asx", "@meta", "@hash", "@proof", "@Pop", "@Wo", "@Sek", "@Ch'en"],
        "properties": {
          "@asx": {
            "type": "object",
            "required": ["lang", "profile", "semver"],
            "properties": {
              "lang": { "const": "ASX-R" },
              "profile": { "type": "string", "example": "ASX-R/REF" },
              "semver": { "type": "string", "example": "1.1.0" }
            }
          },

          "@meta": {
            "type": "object",
            "required": ["ts", "nonce", "app_id", "run_id"],
            "properties": {
              "ts": { "type": "integer", "description": "Unix ms timestamp" },
              "nonce": { "type": "string", "description": "Deterministic replay nonce (caller-chosen)" },
              "app_id": { "type": "string" },
              "run_id": { "type": "string" }
            }
          },

          "@hash": {
            "type": "object",
            "required": ["algo", "mode", "bind"],
            "properties": {
              "algo": { "enum": ["sha256"] },
              "mode": { "enum": ["SELF"] },
              "bind": {
                "type": "array",
                "description": "Canonical field paths included in SELF hash, ordered.",
                "items": { "type": "string" }
              }
            }
          },

          "@proof": {
            "type": "object",
            "required": ["canon", "walk", "checks"],
            "properties": {
              "canon": {
                "type": "object",
                "required": ["ordering", "utf8", "float"],
                "properties": {
                  "ordering": { "const": "lexicographic_keys" },
                  "utf8": { "const": true },
                  "float": { "const": "no_nan_no_inf" }
                }
              },
              "walk": {
                "type": "object",
                "required": ["phase_gate", "node_gate"],
                "properties": {
                  "phase_gate": { "const": true },
                  "node_gate": { "const": true }
                }
              },
              "checks": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["id", "ok"],
                  "properties": {
                    "id": { "type": "string" },
                    "ok": { "type": "boolean" },
                    "detail": { "type": "string" }
                  }
                }
              }
            }
          },

          "@Pop": { "type": "object", "description": "Triggers/IO intents (declared, not executed here)." },
          "@Wo": { "type": "object", "description": "State/assignment; constants, geometry, variables." },
          "@Sek": { "type": "object", "description": "Ordered pipelines/flows." },
          "@Ch'en": { "type": "object", "description": "Collapse/output: packed artifacts + next-state deltas." }
        }
      },

      "ast.program.v1": {
        "@id": "asx://schema/ast.program.v1",
        "@type": "schema",
        "@rules": { "closed_node_set": true, "deterministic_walk": true },
        "required": ["@type", "@nodes", "@entry"],
        "properties": {
          "@type": { "const": "ast.program.v1" },
          "@entry": { "type": "string" },
          "@nodes": {
            "type": "array",
            "items": { "$ref": "asx://schema/ast.node.v1" }
          }
        }
      },

      "ast.node.v1": {
        "@id": "asx://schema/ast.node.v1",
        "@type": "schema",
        "@note": "Minimal closed set for the ultimate example (extend via MINOR in real spec).",
        "required": ["id", "t"],
        "properties": {
          "id": { "type": "string" },
          "t": {
            "enum": [
              "@seq",
              "@let",
              "@if",
              "@call",
              "@return",
              "@kql.query",
              "@scxq2.pack"
            ]
          },
          "a": { "type": "array" },
          "k": { "type": "object" }
        }
      },

      "kql.query.v1": {
        "@id": "asx://schema/kql.query.v1",
        "@type": "schema",
        "@rules": { "bounded": true, "no_arbitrary_code": true },
        "required": ["@type", "db", "op", "table"],
        "properties": {
          "@type": { "const": "kql.query.v1" },
          "db": { "type": "string", "example": "idb://primary" },
          "op": { "enum": ["select", "insert", "update", "delete"] },
          "table": { "type": "string" },
          "where": { "type": "array", "items": { "type": "object" } },
          "limit": { "type": "integer", "minimum": 0, "maximum": 1000 },
          "projection": { "type": "array", "items": { "type": "string" } }
        }
      },

      "scxq2.pack.v1": {
        "@id": "asx://schema/scxq2.pack.v1",
        "@type": "schema",
        "@rules": { "decode_never_exec": true, "deterministic_lane_order": true },
        "required": ["@type", "dict", "fields", "lanes"],
        "properties": {
          "@type": { "const": "scxq2.pack.v1" },
          "dict": { "type": "array", "items": { "type": "string" } },
          "fields": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "name", "kind"],
              "properties": {
                "id": { "type": "integer" },
                "name": { "type": "string" },
                "kind": { "enum": ["str", "i32", "f64", "bool", "json"] }
              }
            }
          },
          "lanes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["lane_id", "edge", "rows"],
              "properties": {
                "lane_id": { "type": "string" },
                "edge": { "enum": ["DICT", "FIELD", "LANE", "EDGE"] },
                "rows": { "type": "array", "items": { "type": "array" } }
              }
            }
          }
        }
      }
    }
  },

  "@example": {
    "@asx": { "lang": "ASX-R", "profile": "ASX-R/REF", "semver": "1.1.0" },
    "@meta": {
      "ts": 1767571200000,
      "nonce": "run-0001",
      "app_id": "mx2lm.demo",
      "run_id": "mx2lm.demo#0001"
    },

    "@hash": {
      "algo": "sha256",
      "mode": "SELF",
      "bind": [
        "@asx",
        "@meta.ts",
        "@meta.nonce",
        "@meta.app_id",
        "@meta.run_id",
        "@Pop",
        "@Wo",
        "@Sek",
        "@Ch'en"
      ]
    },

    "@proof": {
      "canon": { "ordering": "lexicographic_keys", "utf8": true, "float": "no_nan_no_inf" },
      "walk": { "phase_gate": true, "node_gate": true },
      "checks": [
        { "id": "phase_order.@Pop>@Wo>@Sek>@Ch'en", "ok": true, "detail": "ok" },
        { "id": "ast.closed_node_set", "ok": true, "detail": "ok" },
        { "id": "kql.bounded", "ok": true, "detail": "limit<=1000" },
        { "id": "scxq2.lane_order", "ok": true, "detail": "stable lanes" },
        { "id": "hash.SELF", "ok": true, "detail": "computed by verifier" }
      ]
    },

    "@Pop": {
      "fetch": [
        {
          "url": "idb://primary",
          "route": "idb.query",
          "payload_ref": "@Wo.inputs.kql"
        }
      ],
      "crypto": [
        {
          "op": "hash",
          "algo": "sha256",
          "payload_ref": "@Ch'en.pack",
          "out_ref": "@Ch'en.out.pack_hash"
        }
      ]
    },

    "@Wo": {
      "entropy": 0.32,
      "layout": { "grid": { "cols": 3, "gap": 12 } },

      "inputs": {
        "kql": {
          "@type": "kql.query.v1",
          "db": "idb://primary",
          "op": "select",
          "table": "tapes",
          "where": [{ "field": "tag", "op": "eq", "value": "canonical" }],
          "projection": ["id", "title", "tag", "hash"],
          "limit": 50
        }
      },

      "ast": {
        "@type": "ast.program.v1",
        "@entry": "main",
        "@nodes": [
          { "id": "main", "t": "@seq", "a": ["q1", "p1", "ret"] },
          { "id": "q1", "t": "@kql.query", "k": { "ref": "@Wo.inputs.kql", "out": "@Wo.state.rows" } },
          { "id": "p1", "t": "@scxq2.pack", "k": { "in": "@Wo.state.rows", "out": "@Ch'en.pack" } },
          { "id": "ret", "t": "@return", "k": { "ref": "@Ch'en.out" } }
        ]
      },

      "state": {
        "rows": []
      }
    },

    "@Sek": {
      "pipelines": [
        {
          "id": "main",
          "flow": ["load", "verify", "execute", "compress", "collapse"],
          "bind": {
            "load": "@Pop.fetch[0]",
            "verify": "@Wo.ast",
            "execute": "@Wo.ast",
            "compress": "@Ch'en.pack",
            "collapse": "@Ch'en.out"
          }
        }
      ],
      "invariants": [
        { "id": "no_network_exec", "rule": "Pop declares IO; executor must not eval strings" },
        { "id": "bounded_kql", "rule": "kql.limit <= 1000" },
        { "id": "deterministic_pack", "rule": "lane order stable; field ids stable" }
      ]
    },

    "@Ch'en": {
      "pack": {
        "@type": "scxq2.pack.v1",
        "dict": ["id", "title", "tag", "hash"],
        "fields": [
          { "id": 1, "name": "id", "kind": "str" },
          { "id": 2, "name": "title", "kind": "str" },
          { "id": 3, "name": "tag", "kind": "str" },
          { "id": 4, "name": "hash", "kind": "str" }
        ],
        "lanes": [
          {
            "lane_id": "LANE.tapes.v1",
            "edge": "LANE",
            "rows": [
              ["t1", "Pocket Book v1", "canonical", "sha256:..."],
              ["t2", "KUHUL-ES Schema Law", "canonical", "sha256:..."]
            ]
          }
        ]
      },

      "out": {
        "ok": true,
        "result_ref": "@Ch'en.pack",
        "pack_hash": "sha256:SELF",
        "next_state": {
          "mutations": [
            { "path": "@Wo.state.rows", "op": "set", "value_ref": "@Wo.state.rows" }
          ]
        }
      }
    }
  },

  "@conformance_vectors": {
    "@type": "asx.conformance.v1",
    "vectors": [
      {
        "id": "V1.phase.order",
        "input_ref": "@example",
        "expect": { "ok": true, "checks": ["phase_order.@Pop>@Wo>@Sek>@Ch'en"] }
      },
      {
        "id": "V2.ast.closed",
        "input": {
          "@type": "ast.program.v1",
          "@entry": "main",
          "@nodes": [{ "id": "main", "t": "@made_up_node" }]
        },
        "expect": { "ok": false, "error": "ast_unknown_node_type" }
      },
      {
        "id": "V3.kql.bounds",
        "input": {
          "@type": "kql.query.v1",
          "db": "idb://primary",
          "op": "select",
          "table": "tapes",
          "limit": 50000
        },
        "expect": { "ok": false, "error": "kql_limit_exceeded" }
      },
      {
        "id": "V4.scxq2.determinism",
        "input": {
          "@type": "scxq2.pack.v1",
          "dict": ["b", "a"],
          "fields": [{ "id": 2, "name": "a", "kind": "str" }, { "id": 1, "name": "b", "kind": "str" }],
          "lanes": [{ "lane_id": "L", "edge": "LANE", "rows": [["x", "y"]] }]
        },
        "expect": { "ok": false, "error": "scxq2_noncanonical_order" }
      }
    ]
  }
}
```
