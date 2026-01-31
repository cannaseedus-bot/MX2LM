import fs from "node:fs";
import crypto from "node:crypto";

import {
  scxq2PackVerify,
  SCXQ2_DEFAULT_POLICY,
  scxq2DecodeUtf16,
} from "./dist/verify.js";
import { pipeline } from "@huggingface/transformers";

// Placeholder SCXQ2 encoder hook. Replace with ccCompress/ccCompressSync.
function fakeEncodeAsPack(text) {
  return { "@type": "scxq2.pack.placeholder", text };
}

function sha256HexUtf8(input) {
  return crypto.createHash("sha256").update(Buffer.from(input, "utf8")).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pickBlock(pack, laneId = null) {
  if (!Array.isArray(pack.blocks) || pack.blocks.length === 0) {
    throw new Error("SCXQ2 pack has no blocks");
  }
  if (laneId == null) return pack.blocks[0];
  const hit = pack.blocks.find((block) => String(block.lane_id) === String(laneId));
  if (!hit) throw new Error(`lane not found: ${laneId}`);
  return hit;
}

function decodePromptFromPack(pack, { laneId = null, maxOutputUnits = 1 << 20 } = {}) {
  // Verify first (fail-closed).
  const verify = scxq2PackVerify(pack, {
    ...SCXQ2_DEFAULT_POLICY,
    maxOutputUnits,
    // Optionally enforce proof/roundtrip in Node:
    // requireProof: true,
    // requireRoundtrip: true,
  });

  if (!verify.ok) {
    const e = verify.error;
    const msg = `[SCXQ2 VERIFY FAIL] ${e.code} (${e.phase}): ${e.message}`;
    const details = JSON.stringify(verify, null, 2);
    const err = new Error(msg);
    err.details = details;
    throw err;
  }

  const block = pickBlock(pack, laneId);
  const bytes = Buffer.from(block.b64, "base64");

  const dec = scxq2DecodeUtf16(pack.dict.dict, bytes, { maxOutputUnits });
  if (!dec.ok) {
    throw new Error(`[SCXQ2 DECODE FAIL] ${dec.kind} @${dec.byte_offset ?? "?"}`);
  }

  const outSha = sha256HexUtf8(dec.value);
  if (block.source_sha256_utf8 && outSha !== block.source_sha256_utf8) {
    throw new Error("[SCXQ2 ROUNDTRIP FAIL] decoded sha mismatch");
  }

  return dec.value;
}

async function main() {
  const packPath = process.argv[2];
  if (!packPath) {
    console.error("usage: node infer.mjs <prompt.scxq2.pack.json> [lane_id]");
    process.exit(2);
  }
  const laneId = process.argv[3] ?? null;

  const promptPack = readJson(packPath);

  const prompt = decodePromptFromPack(promptPack, {
    laneId,
    maxOutputUnits: 1 << 20,
  });

  const generator = await pipeline("text-generation", "Xenova/distilgpt2", {
    device: "cpu", // Mirrors the { device: 'webgpu' } flag used in browsers.
  });

  const out = await generator(prompt, {
    max_new_tokens: 128,
    temperature: 0.8,
    do_sample: true,
  });

  const generated = out?.[0]?.generated_text ?? "";

  console.log("----- GENERATED -----\n");
  console.log(generated);

  const outPack = fakeEncodeAsPack(generated);
  fs.writeFileSync("output.pack.json", JSON.stringify(outPack, null, 2));
  console.log("\nWrote output.pack.json");
}

main().catch((e) => {
  console.error(String(e.message || e));
  if (e.details) console.error(e.details);
  process.exit(1);
});
