// Deterministic simulations for MX2LM kernel routes
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Minimal service-worker style globals
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
  open: () => {
    const req = {};
    // noop async callbacks to satisfy sw.js boot logic if invoked
    setTimeout(() => {
      if (typeof req.onerror === "function") req.onerror();
    }, 0);
    return req;
  }
};

const {
  SupremeJSONRESTAPI,
  SCXQ2Codec,
  SCXQ2Engine,
  KERNEL_STATE,
  ΩCLOCK
} = require(path.join("..", "sw.js"));

const DEMO_MANIFEST = {
  "🌐NATIVE_JSON_REST_API": {
    api_routes: {
      "/health": { method: "GET", response_schema: { scx: "string" } },
      "/infer": {
        method: "POST",
        request_schema: { scx: "string" },
        response_schema: { scx: "string" }
      },
      "/micro/jobs/submit": {
        method: "POST",
        request_schema: { scx: "string" },
        response_schema: { scx: "string" }
      }
    }
  }
};

test("registry binds manifest handlers deterministically", () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);

  assert.equal(api.routeRegistry.size, 3);
  assert.ok(api.getRouteEntry("/health", "GET"));
  assert.ok(api.getRouteEntry("/infer", "POST"));
});

test("SCXQ2 codec is deterministic for encode/decode", () => {
  const codec = new SCXQ2Codec(new SCXQ2Engine());
  const payload = { beta: "ok", alpha: 1 };
  const encoded = codec.encode(payload);
  const decoded = codec.decode(encoded);

  assert.ok(decoded.ok);
  assert.deepEqual(decoded.decoded, codec.canonicalize(payload));
});

test("routes respond and mutate state deterministically", async () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);
  ΩCLOCK.tick = 0;
  KERNEL_STATE.api.route_metrics = {};
  const token = "TEST_KERNEL_TOKEN";
  KERNEL_STATE.api.authentication.kernel_tokens.add(token);

  const scxPayload = api.codec.encode({ prompt: "deterministic" });
  const resp = await api.dispatchRoute("/infer", "POST", { scx: scxPayload }, token);

  assert.equal(resp.status, 200);
  assert.equal(typeof resp.data.scx, "string");
  assert.ok(KERNEL_STATE.api.route_metrics["/infer"]);
  assert.equal(KERNEL_STATE.api.route_metrics["/infer"].requests, 1);
});
