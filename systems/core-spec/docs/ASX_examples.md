# ASX — Canonical Examples (v1)

These specimens are canonical, hash-bound examples for the ASX language family. Each envelope is independent and demonstrates one frozen vertical slice.

## Canonical Index

The language family index is frozen at:

* `asx://codex/asx.v1`
* Source: `codex/asx_language_family_codex_v1.json`

## 1) Geometry + Metrics — `asx://example/geometry_metrics.v1`

```json
{
  "@id": "asx://example/geometry_metrics.v1",
  "@type": "asx.example.geometry_metrics.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@note": "Geometry + Metrics vertical slice: G2L-1 geometry lowering, MFA-1 metric assertions, deterministic SCXQ2 lanes.",
  "@asx": {
    "lang": "ASX-R",
    "profile": "ASX-R/REF",
    "semver": "1.1.0"
  },
  "@geometry": {
    "manifold": "Plane2D",
    "metric": "L2",
    "shapes": {
      "point_a": { "type": "Point", "x": 1, "y": 2 },
      "point_b": { "type": "Point", "x": 4, "y": 6 },
      "segment": { "type": "Line", "a": "point_a", "b": "point_b" }
    }
  },
  "@metrics": {
    "assertions": [
      {
        "id": "distance_ab",
        "op": "distance",
        "metric": "L2",
        "from": "point_a",
        "to": "point_b",
        "equals": 5,
        "tolerance": 0
      }
    ]
  },
  "@lowering": {
    "g2l": {
      "dict_id": "H32(\"DICT|geometry|Plane2D\")",
      "field_ids": [
        "H32(\"FIELD|Plane2D|point_a\")",
        "H32(\"FIELD|Plane2D|point_b\")",
        "H32(\"FIELD|Plane2D|segment\")"
      ],
      "batch_id": "H32(\"BATCH|Plane2D|geometry_stream\")"
    },
    "scxq2": {
      "layout": ["DICT", "FIELD", "LANE", "EDGE"],
      "lanes": ["geometry", "metric_assertions"],
      "ordering": "lexicographic_keys"
    }
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": [
      "@asx",
      "@geometry",
      "@lowering",
      "@metrics",
      "@id",
      "@status",
      "@type",
      "@version"
    ]
  }
}
```

## 2) KPI syscall + lowering — `asx://example/kpi_syscall_lowering.v1`

```json
{
  "@id": "asx://example/kpi_syscall_lowering.v1",
  "@type": "asx.example.kpi_syscall_lowering.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@note": "KPI syscall + lowering vertical slice: syscall declaration, capability guard, deterministic AST lowering.",
  "@asx": {
    "lang": "ASX-R",
    "profile": "ASX-R/REF",
    "semver": "1.1.0"
  },
  "@kpi": {
    "syscall": "kpi.syscall.v1",
    "capability": "cap://tensor.readonly",
    "call": "tensor.load",
    "args": {
      "tensor_id": "tensor://vocab/main",
      "shape": [4096, 768],
      "dtype": "f16"
    },
    "guards": {
      "no_side_effects": true,
      "deterministic": true
    }
  },
  "@lowering": {
    "ast": {
      "@type": "ast.program.v1",
      "@entry": "node0",
      "@nodes": [
        {
          "@id": "node0",
          "@type": "kpi.syscall",
          "@op": "tensor.load",
          "@args": "node1",
          "@caps": "node2",
          "@next": "node3"
        },
        {
          "@id": "node1",
          "@type": "kpi.args",
          "@value": {
            "tensor_id": "tensor://vocab/main",
            "shape": [4096, 768],
            "dtype": "f16"
          }
        },
        {
          "@id": "node2",
          "@type": "kpi.capability",
          "@value": "cap://tensor.readonly"
        },
        {
          "@id": "node3",
          "@type": "kpi.result.bind",
          "@assign": "tensor_handle"
        }
      ]
    },
    "xcfe": {
      "phase": "@Sek",
      "ordering": "declared"
    }
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": [
      "@asx",
      "@kpi",
      "@lowering",
      "@id",
      "@status",
      "@type",
      "@version"
    ]
  }
}
```

## 3) Temporal persistence — `asx://example/temporal_persistence.v1`

```json
{
  "@id": "asx://example/temporal_persistence.v1",
  "@type": "asx.example.temporal_persistence.v1",
  "@schema": "xjson://schema/core/v1",
  "@status": "CANONICAL",
  "@version": "1.0.0",
  "@note": "Temporal persistence vertical slice: deterministic tick ledger, KQL commit, IDB-API persistence, replay seal.",
  "@asx": {
    "lang": "ASX-R",
    "profile": "ASX-R/REF",
    "semver": "1.1.0"
  },
  "@temporal": {
    "tick": 1842,
    "previous_root": "sha256:...",
    "barrier": "@Ch'en",
    "monotonic": true
  },
  "@persistence": {
    "idb": "idb://primary",
    "kql": {
      "op": "insert",
      "into": "ledger.events",
      "values": [
        {
          "tick": 1842,
          "event": "session.persist",
          "payload_ref": "scxq2://lane/events/1842"
        }
      ]
    },
    "commit": {
      "mode": "append_only",
      "canonical_order": ["tick", "event", "payload_ref"],
      "proof_required": true
    }
  },
  "@replay": {
    "sealed": true,
    "proof": "sha256:...",
    "scxq2": {
      "lane": "events",
      "layout": ["DICT", "FIELD", "LANE", "EDGE"]
    }
  },
  "@hash": {
    "algo": "sha256",
    "mode": "SELF",
    "bind": [
      "@asx",
      "@temporal",
      "@persistence",
      "@replay",
      "@id",
      "@status",
      "@type",
      "@version"
    ]
  }
}
```
