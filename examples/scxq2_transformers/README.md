# SCXQ2 + Transformers.js v3 Pipelines

This folder contains runnable samples that show the **two SCXQ2 integration points** around a Transformers.js pipeline:

1. **Input gate:** `scxq2PackVerify()` → `scxq2DecodeUtf16()` to verify and decode the prompt pack before inference.
2. **Output seal:** `ccCompress/ccCompressSync` (placeholder in the samples) to encode the generated text after inference.

Provide your compiled SCXQ2 verifier/decoder bundle at `./dist/verify.js` (relative to this directory), or update the import paths to match your build output.

## Files

| File | Purpose |
| --- | --- |
| `infer.mjs` | Node/CLI ESM runner that verifies + decodes a SCXQ2 prompt pack, runs `pipeline("text-generation")`, and writes an output pack placeholder. |
| `infer.html` | Browser-first WebGPU sample that mirrors the same flow using the CDN build of Transformers.js v3. |

## Node usage

1. Install the Transformers.js v3 package in your project (`npm i @huggingface/transformers`).
2. Place a prompt pack JSON where you can reference it (e.g., `prompt.scxq2.pack.json`).
3. Run:

   ```bash
   node examples/scxq2_transformers/infer.mjs <prompt.scxq2.pack.json> [lane_id]
   ```

4. Replace `fakeEncodeAsPack()` with your real SCXQ2 encoder (e.g., `ccCompressSync`) to seal the output, and optionally re-verify the resulting pack.

The Node sample defaults to `device: "cpu"` but keeps the same API shape as the browser’s `{ device: "webgpu" }` flag.

## Browser usage

1. Serve this directory with any static server (e.g., `npx http-server examples/scxq2_transformers`).
2. Ensure `prompt.pack.json` and `dist/verify.js` are accessible from the same path.
3. Open `infer.html` and click **Run Inference** to verify/decode the prompt, run WebGPU-enabled generation, and log the output.

Wire your encoder where indicated in `infer.html` to emit a SCXQ2 pack from the generated text.

## Integration notes

- Both flows **fail closed** on verification/decoding errors and cap decoded output with `maxOutputUnits` (`1 << 20` by default).
- If you need stricter guarantees in Node, enable `requireProof` / `requireRoundtrip` inside the verifier options.
- For WebGPU support, keep `{ device: "webgpu" }` when constructing the pipeline; the same shape works in Node even if it falls back to CPU.
