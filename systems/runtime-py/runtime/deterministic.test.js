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
      "/memory/read": {
        method: "POST",
        authentication: "KERNEL_REQUIRED",
        request_schema: { scx: "string" },
        response_schema: { scx: "string" }
      },
      "/reinforce": {
        method: "POST",
        authentication: "KERNEL_OR_EXTERNAL_TOKEN",
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

function resetKernelState() {
  ΩCLOCK.tick = 0;
  KERNEL_STATE.api.route_metrics = {};
  KERNEL_STATE.api.metrics.total_requests = 0;
  KERNEL_STATE.api.metrics.successful_requests = 0;
  KERNEL_STATE.api.metrics.auth_failures = 0;
  KERNEL_STATE.api.metrics.rate_limit_hits = 0;
  KERNEL_STATE.api.authentication.kernel_tokens = new Set();
  KERNEL_STATE.api.authentication.external_tokens = new Map();
  KERNEL_STATE.api.authentication.quantum_signatures = new Map();
  Object.values(KERNEL_STATE.api.rate_limits).forEach((limit) => {
    limit.tokens = limit.cap;
    limit.reset_tick = 0;
  });
}

test("registry binds manifest handlers deterministically", () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);

  assert.equal(api.routeRegistry.size, Object.keys(DEMO_MANIFEST["🌐NATIVE_JSON_REST_API"].api_routes).length);
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
  resetKernelState();
  const token = api.issueKernelToken("deterministic-test");

  const scxPayload = api.codec.encode({ prompt: "deterministic" });
  const resp = await api.dispatchRoute("/infer", "POST", { scx: scxPayload }, token);

  assert.equal(resp.status, 200);
  assert.equal(typeof resp.data.scx, "string");
  assert.ok(KERNEL_STATE.api.route_metrics["/infer"]);
  assert.equal(KERNEL_STATE.api.route_metrics["/infer"].requests, 1);
});

test("authentication middleware enforces per-route modes", async () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);
  resetKernelState();

  const scxPayload = api.codec.encode({ table: "t", key: "k" });
  const unauthorized = await api.dispatchRoute("/memory/read", "POST", { scx: scxPayload }, null);

  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.data.error, "authentication_failed");
  assert.equal(unauthorized.data.auth_mode, "KERNEL_REQUIRED");
  assert.equal(KERNEL_STATE.api.metrics.auth_failures, 1);

  const kernelToken = api.issueKernelToken("auth-required");
  const authorized = await api.dispatchRoute("/memory/read", "POST", { scx: scxPayload }, kernelToken);

  assert.equal(authorized.status, 200);
});

test("external and quantum helpers populate verification state", async () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);
  resetKernelState();

  const externalToken = api.issueExternalToken({ subject: "client", ttl_ticks: 10 });
  const reinforcePayload = api.codec.encode({ seq: "s", reward: 1, source: "test" });
  const reinforceResp = await api.dispatchRoute("/reinforce", "POST", { scx: reinforcePayload }, externalToken);

  assert.equal(reinforceResp.status, 200);
  assert.ok(KERNEL_STATE.api.authentication.external_tokens.has(externalToken));

  const signature = api.issueQuantumSignature("proof");
  const quantumValidation = api.validateAuthToken(signature);
  assert.equal(quantumValidation.ok, true);
  assert.equal(quantumValidation.type, "quantum");
});

test("rate limits use token buckets and record hits deterministically", async () => {
  const api = new SupremeJSONRESTAPI();
  api.setManifest(DEMO_MANIFEST);
  resetKernelState();
  const token = api.issueKernelToken("rate-limit");

  KERNEL_STATE.api.rate_limits.inference = {
    cap: 1,
    tokens: 1,
    reset_tick: ΩCLOCK.tick + 5,
    window_ticks: 5
  };

  const scxPayload = api.codec.encode({ prompt: "limited" });
  const first = await api.dispatchRoute("/infer", "POST", { scx: scxPayload }, token);
  const second = await api.dispatchRoute("/infer", "POST", { scx: scxPayload }, token);

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.data.error, "rate_limit_exceeded");
  assert.equal(second.data.window_ticks, 5);
  assert.equal(KERNEL_STATE.api.metrics.rate_limit_hits, 1);
});
