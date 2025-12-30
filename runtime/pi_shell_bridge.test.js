const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

// Minimal globals for service-worker style module expectations
if (!globalThis.atob) {
  globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
}
if (!globalThis.btoa) {
  globalThis.btoa = (bin) => Buffer.from(bin, "binary").toString("base64");
}
globalThis.self = globalThis.self || {
  addEventListener: () => {},
  location: { origin: "http://localhost" },
  clients: { claim: async () => {} },
  skipWaiting: () => {}
};
globalThis.indexedDB = globalThis.indexedDB || {
  open: () => ({})
};

const {
  PI_BRIDGE,
  renderModelShells,
  KERNEL_STATE
} = require("../sw.js");

function fixtureFetch(baseDir) {
  return async (url) => {
    const normalized = url.startsWith("/") ? url.slice(1) : url;
    const fullPath = path.join(baseDir, normalized);
    const data = await fs.readFile(fullPath, "utf-8");
    return {
      ok: true,
      async json() {
        return JSON.parse(data);
      }
    };
  };
}

test("π helper bridge executes deterministic math utilities", () => {
  assert.equal(PI_BRIDGE.vecNorm([3, 4]), 5);
  assert.deepEqual(PI_BRIDGE.softmax([0, 0]), [0.5, 0.5]);
  assert.equal(PI_BRIDGE.entropy([0.5, 0.5]), 1);

  const pmi = PI_BRIDGE.pmi(0.1, 0.2, 0.3);
  const expectedPmi = Math.log2(0.1 / (0.2 * 0.3));
  assert.ok(Math.abs(pmi - expectedPmi) < 1e-12);
});

test("render_model_shells caches deterministic SVG projection for fixtures", async () => {
  const baseDir = path.join(__dirname, "__fixtures__");
  const fetchImpl = fixtureFetch(baseDir);
  KERNEL_STATE.expandedSVG = null;

  const svg = await renderModelShells("demo-model", { fetchImpl });
  const expected = await fs.readFile(path.join(baseDir, "expected", "demo-model.svg"), "utf-8");

  assert.equal(svg, expected);
  assert.equal(KERNEL_STATE.expandedSVG, svg);
});
