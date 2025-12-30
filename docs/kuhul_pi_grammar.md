# K’UHUL π Grammar v1 (Frozen)

This document captures the frozen π micro-language as designed for MX2LM. π is the deterministic math kernel that feeds metric and geometry evaluation inside ASX-R; it does not provide control, orchestration, or legality authority.

## Role in the stack
- **Scope:** Deterministic numeric, vector, tensor, and geometry computation that always lowers to AST.
- **Position:** Embedded inside ASX-R folds, subordinate to XCFE and subject to ASX-R legality.
- **Purpose:** Supply math used by legality checks (metrics, geometry, physics-style evaluations) without deciding legality itself.

## Core constraints
- No implicit state; no ambient time; no side effects.
- Pure expressions only; replay-deterministic evaluation.
- Always lowerable to AST nodes.
- SCXQ2-compatible numeric streams.
- Disallows runtime-dependent loop bounds, IO, randomness, hidden epsilon, or interpreter-defined shortcuts.

## Canonical grammar (EBNF)

```ebnf
# K’UHUL π Grammar v1 (Frozen)

pi_program     ::= pi_stmt+ ;

pi_stmt        ::= pi_assign
                 | pi_expr
                 | pi_assert ;

pi_assign      ::= ident "=" pi_expr ;

pi_expr        ::= pi_literal
                 | ident
                 | pi_call
                 | pi_expr pi_op pi_expr
                 | "(" pi_expr ")" ;

pi_call        ::= ident "(" pi_args? ")" ;

pi_args        ::= pi_expr ( "," pi_expr )* ;

pi_op          ::= "+" | "-" | "*" | "/"
                 | "^"
                 | "dot" | "cross" ;

pi_literal     ::= number
                 | vector
                 | matrix ;

vector         ::= "[" pi_expr ( "," pi_expr )* "]" ;
matrix         ::= "[" vector ( "," vector )* "]" ;

pi_assert      ::= "assert" pi_expr pi_cmp pi_expr ;

pi_cmp         ::= "<" | "<=" | "==" | ">=" | ">" ;
```

## Canonical function set

π functions are enumerated and not runtime-extensible.

### Scalars
- `abs(x)`
- `sqrt(x)`
- `pow(x, y)`
- `min(a, b)`
- `max(a, b)`

### Vectors
- `length(v)`
- `normalize(v)`
- `dot(a, b)`
- `cross(a, b)` (3D only)

### Geometry helpers
- `distance(p, q)`
- `angle(a, b, c)`

## Non-features
- No IO, randomness, or interpreter shortcuts.
- No loop constructs with runtime-dependent bounds.
- No hidden mutation or ambient clocks.

## Next formalization steps
1. Emit `asx://layer/kuhul-pi` as a formal XJSON grammar and fixed function registry.
2. Show explicit π → AST lowering blocks.
3. Show π numeric streams → SCXQ2 FIELD/LANE encoding.
4. Bind π evaluation outputs to MFA-1 proof material.
