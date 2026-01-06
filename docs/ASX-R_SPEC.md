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
