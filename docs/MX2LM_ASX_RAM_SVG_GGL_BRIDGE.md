# MX2LM Inference: ASX-RAM + SVG/GGL Bridge

This note pins MX2LM’s runtime to the concrete pieces that make it work: deterministic math, frozen weights, ASX-RAM paging, and SVG/GGL projection.

## 1) Deterministic math engine (no learning at inference)
- Inference executes fixed linear-algebra operations: matrix multiplication, vector addition, normalization, and probability projection.
- The execution order is fixed by the architecture; nothing mutates during the forward pass.
- A forward step is effectively `output = softmax(Wn · fₙ( … f₂(W₂ · f₁(W₁ · input)) … ))` with all `f` and `W` fixed.

## 2) Architecture = sequence of math steps
- Attention, activation, and normalization layers only decide **which math runs and in what order**.
- The architecture is the recipe; it is not where knowledge lives.

## 3) Weights = frozen numeric knowledge
- Weights are static tensors (float/int/quantized) that encode language/statistical structure.
- During inference they are read-only: loaded, multiplied, and released from cache—never updated.
- Without the trained weights, the same math emits noise because no structure is encoded.

## 4) ASX-RAM: weight residency and paging
- MX2LM requests **pages of numbers** from ASX-RAM instead of opaque “load model” calls.
- ASX-RAM provides deterministic, hash-verified, replayable pages; addressing is stable and auditable.
- Typical layout: token tables, attention shards, FFN shards, output projections—each as discrete pages. See the canonical definition in the ASX repository (ASX-RAM.md).

## 5) SVG/GGL bridge: symbolic I/O surface
- The bridge defines how symbols become numbers on the way **into** the math engine (grammar → tokens) and how numbers become geometry on the way **out** (logits → SVG/GGL forms).
- Grammar/policy files constrain legal inputs; template/surface definitions constrain legal outputs.
- SVG/GGL is treated as a deterministic projection surface: serialized, hashable, and safe to exchange—no executable payloads.

## 6) End-to-end flow
1. Input symbols → tokenizer → numeric vectors.
2. MX2LM runs the deterministic math sequence using paged ASX-RAM weights.
3. Output vectors project through the bridge into SVG/GGL, producing verifiable geometry (not code) for downstream use.

## 7) One-sentence definition
**MX2LM is a deterministic linear-algebra engine that pages frozen numeric knowledge from ASX-RAM and projects the results through a constrained SVG/GGL bridge for safe, replayable inference.**
