# MX2LEX — Example Instances (v1)

These specimens demonstrate the four MX2LEX schemas as separate envelopes (no mega-schema). Each example is minimal, deterministic, and hash-bound.

## 1) `lex.grammar.v1` — tiny GGL subset

```json
{
  "@id": "mx2lex://example/lex.grammar.v1",
  "@type": "lex.grammar.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@grammar": {
    "name": "ggl.tiny",
    "start": "scene",
    "productions": {
      "scene": ["node+"],
      "node": ["cube", "sphere"],
      "cube": ["cube(id,pos,scale)"],
      "sphere": ["sphere(id,pos,scale)"]
    }
  },
  "@invariants": [
    "Deterministic production ordering",
    "No implicit execution authority"
  ],
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": ["@grammar", "@id", "@status", "@type", "@version"]
  }
}
```

## 2) `mx2lex.pack.v1` — compiled pack specimen

```json
{
  "@id": "mx2lex://example/mx2lex.pack.v1",
  "@type": "mx2lex.pack.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@source": {
    "ref": "mx2lex://example/lex.grammar.v1",
    "hash": "sha256:..."
  },
  "@pack": {
    "format": "SCXQ2",
    "ordering": "lexicographic_keys",
    "payload": "scxq2:...",
    "unpackable": true
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": ["@pack", "@source", "@id", "@status", "@type", "@version"]
  }
}
```

## 3) `mx2lex.oracle.v1` — run outputs (PASS + FAIL)

### 3.1 PASS

```json
{
  "@id": "mx2lex://example/mx2lex.oracle.pass.v1",
  "@type": "mx2lex.oracle.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "PASS",
  "@version": "1.0.0",
  "@input": {
    "ref": "mx2lex://example/lex.grammar.v1",
    "hash": "sha256:..."
  },
  "@result": {
    "ok": true,
    "checks": ["deterministic_ordering", "no_illegal_transitions"],
    "warnings": []
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": ["@input", "@result", "@id", "@status", "@type", "@version"]
  }
}
```

### 3.2 FAIL

```json
{
  "@id": "mx2lex://example/mx2lex.oracle.fail.v1",
  "@type": "mx2lex.oracle.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "FAIL",
  "@version": "1.0.0",
  "@input": {
    "ref": "mx2lex://example/lex.grammar.v1",
    "hash": "sha256:..."
  },
  "@result": {
    "ok": false,
    "checks": ["deterministic_ordering"],
    "warnings": [],
    "errors": [
      {
        "code": "ILLEGAL_TRANSITION",
        "path": "@grammar.productions.node",
        "detail": "found 'pyramid' which is not in the grammar"
      }
    ]
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": ["@input", "@result", "@id", "@status", "@type", "@version"]
  }
}
```

## 4) `mx2lex.weights.bind.v1` — scoring bias specimen

```json
{
  "@id": "mx2lex://example/mx2lex.weights.bind.v1",
  "@type": "mx2lex.weights.bind.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@weights": {
    "illegal_transition_penalty": 0.9,
    "structure_reward": 0.1
  },
  "@invariants": [
    "Weights must sum to 1.0",
    "Higher penalty dominates structural reward"
  ],
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": ["@weights", "@id", "@status", "@type", "@version"]
  }
}
```
