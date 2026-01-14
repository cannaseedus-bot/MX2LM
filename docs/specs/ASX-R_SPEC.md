# ASX-R Specification

## Image Inference Plane v1 (Janus-style) — ASX-R Extension

### 11.0 Scope

This plane standardizes **vision → structured outputs** (captioning, OCR-lite labels, embeddings, detection summaries, multimodal chat context) using:

**image.inference → IDB-API → KQL → (optional SCXQ2 decode) → vision.run → result + proof**

No direct storage. No ad-hoc JS logic. All behavior is a **plan**.

---

## 11.1 Canonical Step Ops (Allowlist)

These are the only image-plane ops permitted inside `image.plan.v1`:

* `idb.kql` (fetch image refs + prior events + labels)
* `idb.txn` (optional bounded write-back of derived artifacts)
* `scxq2.decode` / `scxq2.encode`
* `img.fetch` (resolve bytes by ref; must be bounded + deterministic)
* `img.decode` (bytes → pixel tensor; deterministic)
* `img.preprocess` (resize/normalize/crop; deterministic)
* `vision.run` (Janus-like model execution)
* `return`

Anything else ⇒ non-conformant.

---

## 11.2 Input Model: ImageRef (no raw URLs as behavior)

Image data enters by **reference**, not by arbitrary fetch logic.

**Accepted sources** (deterministic):

* `idb://blob/<id>` (IndexedDB blob)
* `cache://<key>` (SW cache entry)
* `mesh://...` (only if already resolved by an IDB-API result)
* `data:` (allowed for tests only, size bounded)

---

## 11.3 Determinism + Proof Binding (Exact)

Define canonical context:

**CTX = hash( normalized `idb.query.result.v1` blocks used )**
**IMG = hash( normalized image.bytes.v1 OR image.tensor.v1 )**

Then:

* `image.proof.v1.@context_hash = H(CTX)`
* `image.proof.v1.@image_hash = H(IMG)`
* `image.proof.v1.@plan_hash = H(normalized image.plan.v1)`
* `image.proof.v1.@output_hash = H(normalized image.result.v1)`

If `vision.run` uses embeddings or tokens, record:

* `@model_hash` (exact Janus/Qwen-V/vision build id hash)
* `@prompt_hash` (if prompt present)
* optional `@seed` policy hash (if you allow seeded stochasticity)

---

## 11.4 Minimal Plan Example (Janus-style caption + embeddings)

```json
{
  "@type":"image.plan.v1",
  "@id":"plan:img:caption:v1",
  "@bounds":{"@max_steps":24,"@max_bytes":2097152,"@max_pixels":1048576,"@max_tokens":512},
  "@steps":[
    { "@op":"idb.kql", "@into":"ctx",
      "@kql":"⟁LOAD⟁ ⟁EVENTS⟁ \"vision_context\" ⟁LIMIT⟁ 16" },

    { "@op":"idb.kql", "@into":"imgref",
      "@kql":"⟁LOAD⟁ image_assets ⟁WHERE⟁ id = \"img_001\" ⟁LIMIT⟁ 1" },

    { "@op":"img.fetch", "@into":"bytes",
      "@ref_from":"imgref", "@field":"blob_ref" },

    { "@op":"img.decode", "@into":"tensor",
      "@from":"bytes", "@format":"auto" },

    { "@op":"img.preprocess", "@into":"x",
      "@from":"tensor",
      "@resize":{"@w":768,"@h":768,"@mode":"fit"},
      "@normalize":{"@mean":[0.5,0.5,0.5],"@std":[0.5,0.5,0.5]} },

    { "@op":"vision.run", "@into":"y",
      "@task":"caption+embed",
      "@model_ref":{"@family":"janus","@id":"janus_asx_v1"},
      "@input":"x",
      "@prompt":"Describe the image. Return JSON with caption, tags, safety, and embedding_ref." },

    { "@op":"return", "@from":"y" }
  ]
}
```

---

## 11.5 Storage Binding (Inference ↔ IDB-API ↔ KQL)

**Rule:** all reads/writes MUST be explicit plan steps.

### Read pattern (required)

* `idb.kql` returns `idb.query.result.v1`
* if result payload is packed ⇒ explicit `scxq2.decode`
* plan uses decoded values only

### Write-back pattern (optional, bounded)

If you want to persist embeddings/tags:

* `idb.txn` with explicit `put` ops and deterministic keys

Example write-back:

```json
{ "@op":"idb.txn", "@into":"persist",
  "@ops":[
    { "@op":"idb.put", "@store":"vision_embeddings", "@key":"emb:img_001",
      "@value_from":"y.@embedding" },
    { "@op":"idb.put", "@store":"vision_labels", "@key":"lbl:img_001",
      "@value_from":"y.@tags" }
  ]
}
```

---

# ✅ The five JSON Schemas (Image Inference Plane v1)

Below are the **five** schemas you asked for. They’re written in the same “custom header” style you’ve been enforcing (no external `$schema` URL). If you want them as separate files, you can split them 1:1.

> Note: these are intentionally **tight**: allowlist ops, bounded sizes, explicit refs.

---

## 1) `asx://schema/image.inference.request.v1`

```json
{
  "$id": "asx://schema/image.inference.request.v1",
  "title": "Image Inference Request v1",
  "type": "object",
  "required": ["@type", "@image_ref"],
  "properties": {
    "@type": { "const": "image.inference.request.v1" },
    "@id": { "type": "string" },
    "@image_ref": {
      "type": "object",
      "required": ["@ref"],
      "properties": {
        "@ref": { "type": "string", "minLength": 1 },
        "@mime": { "type": "string" },
        "@hint": { "type": "string" }
      },
      "additionalProperties": false
    },
    "@task": {
      "type": "string",
      "enum": ["caption", "embed", "detect", "ocr-lite", "vqa", "caption+embed", "custom"]
    },
    "@prompt": { "type": "string" },
    "@model_ref": {
      "type": "object",
      "required": ["@family", "@id"],
      "properties": {
        "@family": { "type": "string", "enum": ["janus", "qwen_vl", "mx2lm_vision"] },
        "@id": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false
    },
    "@bounds": { "$ref": "asx://schema/image.inference.bounds.v1" }
  },
  "additionalProperties": false
}
```

---

## 2) `asx://schema/image.plan.v1`

```json
{
  "$id": "asx://schema/image.plan.v1",
  "title": "Image Inference Plan v1",
  "type": "object",
  "required": ["@type", "@steps", "@bounds"],
  "properties": {
    "@type": { "const": "image.plan.v1" },
    "@id": { "type": "string" },
    "@bounds": { "$ref": "asx://schema/image.inference.bounds.v1" },
    "@steps": {
      "type": "array",
      "minItems": 1,
      "maxItems": 256,
      "items": { "$ref": "asx://schema/image.plan.step.v1" }
    }
  },
  "additionalProperties": false
}
```

---

## 3) `asx://schema/image.plan.step.v1`

```json
{
  "$id": "asx://schema/image.plan.step.v1",
  "title": "Image Plan Step v1",
  "type": "object",
  "required": ["@op"],
  "properties": {
    "@op": {
      "type": "string",
      "enum": [
        "idb.kql", "idb.txn",
        "scxq2.decode", "scxq2.encode",
        "img.fetch", "img.decode", "img.preprocess",
        "vision.run",
        "return"
      ]
    },
    "@into": { "type": "string" },
    "@from": { "type": "string" },

    "@kql": { "type": "string" },

    "@ops": { "type": "array", "items": { "type": "object" } },

    "@ref_from": { "type": "string" },
    "@field": { "type": "string" },

    "@format": { "type": "string", "enum": ["auto", "png", "jpeg", "webp"] },

    "@resize": {
      "type": "object",
      "properties": {
        "@w": { "type": "integer", "minimum": 1, "maximum": 8192 },
        "@h": { "type": "integer", "minimum": 1, "maximum": 8192 },
        "@mode": { "type": "string", "enum": ["fit", "fill", "crop_center"] }
      },
      "required": ["@w", "@h", "@mode"],
      "additionalProperties": false
    },
    "@normalize": {
      "type": "object",
      "properties": {
        "@mean": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 },
        "@std": { "type": "array", "items": { "type": "number" }, "minItems": 3, "maxItems": 3 }
      },
      "required": ["@mean", "@std"],
      "additionalProperties": false
    },

    "@task": {
      "type": "string",
      "enum": ["caption", "embed", "detect", "ocr-lite", "vqa", "caption+embed", "custom"]
    },
    "@model_ref": {
      "type": "object",
      "properties": {
        "@family": { "type": "string", "enum": ["janus", "qwen_vl", "mx2lm_vision"] },
        "@id": { "type": "string" }
      },
      "required": ["@family", "@id"],
      "additionalProperties": false
    },
    "@input": { "type": "string" },
    "@prompt": { "type": "string" }
  },
  "additionalProperties": false
}
```

---

## 4) `asx://schema/image.inference.result.v1`

```json
{
  "$id": "asx://schema/image.inference.result.v1",
  "title": "Image Inference Result v1",
  "type": "object",
  "required": ["@type", "@ok"],
  "properties": {
    "@type": { "const": "image.inference.result.v1" },
    "@id": { "type": "string" },
    "@ok": { "type": "boolean" },

    "@task": { "type": "string" },
    "@caption": { "type": "string" },
    "@tags": { "type": "array", "items": { "type": "string" }, "maxItems": 256 },

    "@detections": {
      "type": "array",
      "maxItems": 512,
      "items": {
        "type": "object",
        "required": ["@label", "@score", "@box"],
        "properties": {
          "@label": { "type": "string" },
          "@score": { "type": "number", "minimum": 0, "maximum": 1 },
          "@box": {
            "type": "object",
            "required": ["@x", "@y", "@w", "@h"],
            "properties": {
              "@x": { "type": "number", "minimum": 0 },
              "@y": { "type": "number", "minimum": 0 },
              "@w": { "type": "number", "minimum": 0 },
              "@h": { "type": "number", "minimum": 0 }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      }
    },

    "@embedding": {
      "type": "object",
      "properties": {
        "@ref": { "type": "string" },
        "@dim": { "type": "integer", "minimum": 1, "maximum": 65536 }
      },
      "required": ["@ref"],
      "additionalProperties": false
    },

    "@error": {
      "type": "object",
      "properties": {
        "@type": { "type": "string" },
        "@message": { "type": "string" },
        "@stage": { "type": "string" }
      },
      "required": ["@type", "@message", "@stage"],
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

## 5) `asx://schema/image.inference.proof.v1`

```json
{
  "$id": "asx://schema/image.inference.proof.v1",
  "title": "Image Inference Proof v1",
  "type": "object",
  "required": [
    "@type",
    "@context_hash",
    "@image_hash",
    "@plan_hash",
    "@output_hash",
    "@model_hash"
  ],
  "properties": {
    "@type": { "const": "image.inference.proof.v1" },
    "@id": { "type": "string" },

    "@context_hash": { "type": "string", "minLength": 8 },
    "@image_hash": { "type": "string", "minLength": 8 },
    "@plan_hash": { "type": "string", "minLength": 8 },
    "@output_hash": { "type": "string", "minLength": 8 },

    "@model_hash": { "type": "string", "minLength": 8 },
    "@prompt_hash": { "type": "string" },

    "@metrics": {
      "type": "object",
      "properties": {
        "@bytes_in": { "type": "integer", "minimum": 0 },
        "@pixels": { "type": "integer", "minimum": 0 },
        "@tokens_out": { "type": "integer", "minimum": 0 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

## Bonus (small but important): Bounds schema used above

If you want it embedded rather than referenced:

```json
{
  "$id": "asx://schema/image.inference.bounds.v1",
  "title": "Image Inference Bounds v1",
  "type": "object",
  "required": ["@max_steps", "@max_bytes", "@max_pixels", "@max_tokens"],
  "properties": {
    "@max_steps": { "type": "integer", "minimum": 1, "maximum": 256 },
    "@max_bytes": { "type": "integer", "minimum": 1, "maximum": 16777216 },
    "@max_pixels": { "type": "integer", "minimum": 1, "maximum": 16777216 },
    "@max_tokens": { "type": "integer", "minimum": 0, "maximum": 8192 }
  },
  "additionalProperties": false
}
```

---

## 🧬 “Janus Python but with K’UHUL”

Here’s the clean mental mapping:

### “Python-like”

```py
img = idb.kql("...get img ref...")
x = decode(img)
y = janus(x, prompt="caption+embed")
return y
```

### ASX-R lawful equivalent

* `image.plan.v1` expresses the same flow
* every external touch is a **step**
* proof binds context + image + plan + output
* KQL is the only query language
* IDB-API is the only gateway

---

If you want, next message I can emit the **conformance vectors** for image inference (OK + failure stages) in the same style as your text inference set, including:

* invalid ref scheme
* bytes limit exceeded
* preprocess exceeds max_pixels
* missing decode step
* proof hash mismatch
* model hash mismatch
