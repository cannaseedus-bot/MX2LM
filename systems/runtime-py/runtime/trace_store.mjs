import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "runtime", "traces");

function hashJson(value) {
  const h = crypto.createHash("sha256");
  h.update(JSON.stringify(value));
  return h.digest("hex");
}

function sealFromHash(hex) {
  return `⟁SEAL⟁sha256:${hex}⟁`;
}

function computeTraceSeal(trace, shellHash) {
  const payload = [
    trace.trace_id,
    trace.hashes?.inputs,
    trace.hashes?.effects,
    trace.hashes?.output,
  ];
  if (shellHash) payload.push(shellHash);
  return sealFromHash(hashJson(payload));
}

function verifyTraceSeal(trace, shellHash) {
  if (!trace?.seal) return false;
  const expected = computeTraceSeal(trace, shellHash);
  return trace.seal === expected;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizeId(id) {
  return String(id || "trace").replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function copyShellArtifact(shellPath, destPath, shellHash) {
  const existing = await fs
    .readFile(destPath)
    .catch(() => null);
  if (existing) {
    const existingHash = hashJson(existing.toString("utf8"));
    if (existingHash !== shellHash) {
      throw new Error(
        `Shell artifact at ${destPath} mismatches provided hash (immutable violation)`
      );
    }
    return destPath;
  }
  await fs.copyFile(shellPath, destPath);
  return destPath;
}

async function persistTraceRecord({
  trace,
  shellPath,
  outputDir = DEFAULT_OUTPUT_DIR,
}) {
  if (!trace?.trace_id) {
    throw new Error("trace.trace_id required");
  }
  if (!shellPath) {
    throw new Error("shellPath required to bind trace to rendered artifact");
  }

  const shellContent = await fs.readFile(shellPath, "utf8");
  const shellHash = hashJson(shellContent);
  const shellSeal = sealFromHash(shellHash);

  if (!verifyTraceSeal(trace, shellHash)) {
    throw new Error("Trace seal invalid for provided shell artifact");
  }

  await ensureDir(outputDir);
  const safeId = sanitizeId(trace.trace_id);
  const recordPath = path.join(outputDir, `${safeId}.trace.json`);
  const destShellPath = path.join(outputDir, `${safeId}.svg`);

  await copyShellArtifact(shellPath, destShellPath, shellHash);

  const record = {
    trace,
    shell: {
      original_path: shellPath,
      stored_path: destShellPath,
      hash: shellHash,
      seal: shellSeal,
    },
    stored_at: new Date().toISOString(),
  };

  const existing = await fs
    .readFile(recordPath, "utf8")
    .then((v) => JSON.parse(v))
    .catch(() => null);
  if (existing) {
    if (
      existing.trace?.seal !== record.trace.seal ||
      existing.shell?.hash !== record.shell.hash
    ) {
      throw new Error(
        `Existing trace record for ${trace.trace_id} differs (immutable archive)`
      );
    }
    return recordPath;
  }

  await fs.writeFile(recordPath, JSON.stringify(record, null, 2));
  return recordPath;
}

export {
  computeTraceSeal,
  hashJson,
  persistTraceRecord,
  sealFromHash,
  verifyTraceSeal,
};
