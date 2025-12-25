/* ============================================================
   K’UHUL-π COMPRESSION CALCULUS KERNEL
   File: sw.js
   Authority: TOTAL
   Law: Ω-BLACK-PANEL
   ============================================================ */

/* ------------------------------
   Ω — GLOBAL KERNEL INVARIANTS
-------------------------------- */

const Ω = Object.freeze({
  VERSION: "Ω-KUHUL-PI-KERNEL.v1.1",
  DETERMINISTIC: true,
  UI_READS_STATE: true,
  STATE_READS_UI: false,
  COMPRESSION_ONLY: true,
  PROJECTION_IS_DISPOSABLE: true
});

/* ------------------------------
   π — MATHEMATICAL CONSTANTS
-------------------------------- */

const π = Object.freeze({
  PI: Math.PI,
  PHI: 1.6180339887498948,
  E: Math.E
});

/* ------------------------------
   SCXQ2 — GLYPH DICTIONARY
-------------------------------- */

const SCXQ2_GLYPHS = Object.freeze({
  "⟁N": "NODE",
  "⟁L": "LAYER",
  "⟁P": "POSITION",
  "⟁S": "SIZE",
  "⟁R": "RADIUS",
  "⟁C": "COLOR",
  "⟁F": "FILTER",
  "⟁T": "TEXT",
  "⟁G": "TOKEN"
});

/* ------------------------------
   KERNEL STATE (NON-UI)
-------------------------------- */

const KERNEL_STATE = {
  manifest: null,
  brain: null,
  expandedSVG: null,

  // Codex is NON-AUTHORITATIVE semantic layer. UI may read it.
  // Kernel must never obey it.
  codex: Object.freeze([]),

  entropy: 0.32,
  ticks: 0
};

/* ============================================================
   MANIFEST LOAD (AUTHORITATIVE)
   ============================================================ */

async function loadManifest() {
  const res = await fetch("manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Ω: Manifest load failed");
  KERNEL_STATE.manifest = await res.json();
  return KERNEL_STATE.manifest;
}

/* ============================================================
   BRAIN EXTRACTION
   ============================================================ */

function extractBrain(manifest, brainId = "mx2lm_v1_1") {
  const brain = manifest?.brains?.[brainId];
  if (!brain) throw new Error("Ω: Brain not found");
  KERNEL_STATE.brain = brain;
  return brain;
}

/* ============================================================
   SCXQ2 EXPANSION — GLYPH → SVG
   ============================================================ */

function expandNodeGlyph(node, layout) {
  const [x, y] = layout.⟁P;
  const [w, h] = layout.⟁S;

  const bindNode = node?.bind?.node || "UNKNOWN_NODE";
  const bindLayer = node?.bind?.layer || "unknown";

  return `
    <g class="mx-node" data-node="${bindNode}" data-layer="${bindLayer}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"
            fill="var(--${bindLayer}-bg, #0b1322)"
            stroke="var(--${bindLayer}-fg, #1a2b44)" />
      <text x="${x + 20}" y="${y + 28}" font-family="monospace" font-size="12" fill="#e8f5ff">
        ${bindNode}
      </text>
    </g>
  `;
}

function expandLayer(layer, nodes) {
  const layout = layer.layout || { ⟁P: [64, 64], ⟁S: [960, 118] };
  const baseX = (layout.⟁P && layout.⟁P[0]) || 0;
  const baseY = (layout.⟁P && layout.⟁P[1]) || 0;

  const offsetX = baseX;
  const offsetY = baseY + 40;

  return (nodes || []).map((node, i) =>
    expandNodeGlyph(node, {
      ⟁P: [offsetX + i * 320, offsetY],
      ⟁S: [300, 58]
    })
  ).join("");
}

/* ============================================================
   FULL BRAIN → SVG PROJECTION
   ============================================================ */

function expandBrainToSVG(brain) {
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
      <rect width="100%" height="100%" fill="#070b12"/>
  `;

  const layers = brain?.layers_def || [];
  const nodesDef = brain?.nodes_def || [];

  for (const layer of layers) {
    const nodes = (layer.nodes || []).map(id => nodesDef.find(n => n.id === id)).filter(Boolean);
    svg += expandLayer(layer, nodes);
  }

  svg += `</svg>`;
  KERNEL_STATE.expandedSVG = svg;
  return svg;
}

/* ============================================================
   π — COMPRESSION CALCULUS
   ============================================================ */

function compressionDelta(tokens) {
  const arr = Array.isArray(tokens) ? tokens : [];
  const unique = new Set(arr).size;
  return arr.length === 0 ? 0 : unique / arr.length;
}

function symbolicWeight(tokens) {
  const arr = Array.isArray(tokens) ? tokens : [];
  return arr.reduce((sum, t) => {
    if (t === "π") return sum + π.PI;
    if (t === "φ") return sum + π.PHI;
    if (t === "e") return sum + π.E;
    return sum + 1;
  }, 0);
}

/* ============================================================
   K’UHUL EXECUTION TICK
   ============================================================ */

function kuhulTick() {
  KERNEL_STATE.ticks++;
  KERNEL_STATE.entropy *= 0.999; // deterministic decay
}

/* ============================================================
   MX2LM — IndexedDB Memory Substrate (Structural Only)
   Add-on Module for sw.js
   Law: UI reads state; state never reads UI
   Deterministic: no randomness, no narrative memory
   ============================================================ */

/* ---------------------------
   0) CONFIG
--------------------------- */
const MX2_IDB = {
  NAME: "mx2lm_substrate",
  VERSION: 1,

  STORES: {
    events:   { keyPath: "id", indexes: [["t","t"], ["node","node"], ["layer","layer"], ["sid","sid"]] },
    memory:   { keyPath: "k",  indexes: [["ns","ns"], ["t","t"]] },
    sessions: { keyPath: "sid",indexes: [["t0","t0"], ["t1","t1"]] }
  },

  // Keep this small + deterministic; flush on tick boundaries or fixed intervals.
  FLUSH_MS: 15000,
  MAX_BUFFER: 2048,

  // Namespaces inside `memory` store (k = `${ns}:${id}`)
  NS: {
    EVENT_TRACES: "event_traces",
    COACT:       "co_activation",
    GRAD:        "symbolic_gradients",
    DELTAS:      "compression_deltas",
    INFER:       "inference_log",
    MANIFEST:    "manifest_brains",
    CODEX:       "codex_cache" // optional: store a frozen codex snapshot/hash
  }
};

/* ---------------------------
   1) IDB CORE
--------------------------- */
let __mx2_db = null;

function mx2_idb_open() {
  if (__mx2_db) return Promise.resolve(__mx2_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MX2_IDB.NAME, MX2_IDB.VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, spec] of Object.entries(MX2_IDB.STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: spec.keyPath });
          for (const [idxName, keyPath] of spec.indexes) {
            store.createIndex(idxName, keyPath, { unique: false });
          }
        }
      }
    };

    req.onsuccess = () => {
      __mx2_db = req.result;
      resolve(__mx2_db);
    };

    req.onerror = () => reject(req.error);
  });
}

async function mx2_idb_tx(storeNames, mode, fn) {
  const db = await mx2_idb_open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const stores = {};
    storeNames.forEach(n => stores[n] = tx.objectStore(n));

    let out;
    try { out = fn(stores, tx); } catch (err) { reject(err); return; }

    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IDB tx aborted"));
  });
}

function mx2_idb_put(store, value) {
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

function mx2_idb_getAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function mx2_idb_clear(store) {
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/* ---------------------------
   2) STRUCTURAL MEMORY (in SW)
--------------------------- */
const MX2_MEM = {
  buf: {
    events: [],
    memory: []
  },

  maps: {
    eventTraces: new Map(),  // layer -> array[{node,t,tc}]
    coActivation: new Map(), // `${layer}:${node}` -> Set(otherNodes)
    gradients: new Map(),    // `${layer}:${node}` -> {count,eff,t}
    deltas: new Map()        // `${node}:${t}` -> delta
  },

  session: {
    sid: null,
    t0: 0,
    t1: 0,
    totalTokens: 0,
    totalActivations: 0
  }
};

function mx2_now() { return Date.now(); }

function mx2_make_session_id() {
  const s = Math.floor(mx2_now() / 1000);
  return `mx2_${s}_Ω`;
}

function mx2_compression_delta(tokens) {
  const arr = Array.isArray(tokens) ? tokens : [];
  if (!arr.length) return 0;
  const uniq = new Set(arr).size;
  return uniq / arr.length;
}

/* ---------------------------
   3) BOOT / LOAD SUBSTRATE
--------------------------- */
let __mx2_flush_timer = null;

async function mx2_mem_boot() {
  if (!MX2_MEM.session.sid) {
    MX2_MEM.session.sid = mx2_make_session_id();
    MX2_MEM.session.t0 = mx2_now();
  }

  // Rebuild small RAM mirrors from IDB snapshots if present
  await mx2_idb_tx(["memory"], "readonly", async ({ memory }) => {
    const all = await mx2_idb_getAll(memory);
    for (const row of all) {
      if (!row || !row.ns) continue;

      if (row.ns === MX2_IDB.NS.EVENT_TRACES && row.id === "by_layer") {
        MX2_MEM.maps.eventTraces = new Map(row.v || []);
      }
      if (row.ns === MX2_IDB.NS.COACT && row.id === "graph") {
        const m = new Map();
        for (const [k, arr] of (row.v || [])) m.set(k, new Set(arr));
        MX2_MEM.maps.coActivation = m;
      }
      if (row.ns === MX2_IDB.NS.GRAD && row.id === "avg") {
        MX2_MEM.maps.gradients = new Map(row.v || []);
      }
    }
  });

  if (!__mx2_flush_timer) {
    __mx2_flush_timer = setInterval(() => {
      mx2_mem_flush().catch(() => {});
    }, MX2_IDB.FLUSH_MS);
  }
}

/* ---------------------------
   4) WRITE PATHS (events → substrate)
--------------------------- */
function mx2_buffer_memory_mirrors(t) {
  const coactArr = [];
  MX2_MEM.maps.coActivation.forEach((set, k) => coactArr.push([k, Array.from(set)]));

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.EVENT_TRACES}:by_layer`,
    ns: MX2_IDB.NS.EVENT_TRACES,
    id: "by_layer",
    v: Array.from(MX2_MEM.maps.eventTraces.entries()),
    t
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.COACT}:graph`,
    ns: MX2_IDB.NS.COACT,
    id: "graph",
    v: coactArr,
    t
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.GRAD}:avg`,
    ns: MX2_IDB.NS.GRAD,
    id: "avg",
    v: Array.from(MX2_MEM.maps.gradients.entries()),
    t
  });

  // Keep bounded
  if (MX2_MEM.buf.memory.length > 24) MX2_MEM.buf.memory.splice(0, MX2_MEM.buf.memory.length - 24);
}

function mx2_record_activation({ node, layer, token, weight, tokens }) {
  const t = mx2_now();
  const ts = Math.floor(t / 1000);
  const nid = String(node || "UNKNOWN");
  const lid = String(layer || "unknown");

  // Stable per-second event id (structural)
  const id = `ev_${nid}_${lid}_${ts}`;

  MX2_MEM.session.totalActivations++;
  MX2_MEM.session.totalTokens += (Array.isArray(tokens) ? tokens.length : 0);

  if (!MX2_MEM.maps.eventTraces.has(lid)) MX2_MEM.maps.eventTraces.set(lid, []);
  MX2_MEM.maps.eventTraces.get(lid).push({ node: nid, t, tc: (Array.isArray(tokens) ? tokens.length : 0) });

  const d = mx2_compression_delta(tokens);
  MX2_MEM.maps.deltas.set(`${nid}:${t}`, d);

  const gk = `${lid}:${nid}`;
  const cur = MX2_MEM.maps.gradients.get(gk) || { count: 0, eff: 0, t: 0 };
  const n = cur.count + 1;
  const eff = (cur.eff * cur.count + d) / n;
  MX2_MEM.maps.gradients.set(gk, { count: n, eff, t });

  if (!MX2_MEM.maps.coActivation.has(gk)) MX2_MEM.maps.coActivation.set(gk, new Set());

  MX2_MEM.buf.events.push({
    id,
    sid: MX2_MEM.session.sid,
    node: nid,
    layer: lid,
    token: token == null ? null : String(token),
    w: +weight || 0,
    tc: (Array.isArray(tokens) ? tokens.length : 0),
    d,
    t
  });

  if (MX2_MEM.buf.events.length > MX2_IDB.MAX_BUFFER) {
    MX2_MEM.buf.events.splice(0, MX2_MEM.buf.events.length - MX2_IDB.MAX_BUFFER);
  }

  mx2_buffer_memory_mirrors(t);
}

/* ---------------------------
   5) FLUSH TO IDB (deterministic)
--------------------------- */
async function mx2_mem_flush() {
  const t = mx2_now();
  MX2_MEM.session.t1 = t;

  const events = MX2_MEM.buf.events.splice(0);
  const memory = MX2_MEM.buf.memory.splice(0);

  const sess = {
    sid: MX2_MEM.session.sid,
    t0: MX2_MEM.session.t0,
    t1: MX2_MEM.session.t1,
    totalTokens: MX2_MEM.session.totalTokens,
    totalActivations: MX2_MEM.session.totalActivations
  };

  await mx2_idb_tx(["events", "memory", "sessions"], "readwrite", async ({ events: ev, memory: mem, sessions }) => {
    for (const e of events) await mx2_idb_put(ev, e);
    for (const m of memory) await mx2_idb_put(mem, m);
    await mx2_idb_put(sessions, sess);
  });

  return { ok: true, flushed: { events: events.length, memory: memory.length } };
}

/* ---------------------------
   6) RESET (structural only)
--------------------------- */
async function mx2_mem_reset({ clear_idb = false } = {}) {
  MX2_MEM.buf.events = [];
  MX2_MEM.buf.memory = [];

  MX2_MEM.maps.eventTraces = new Map();
  MX2_MEM.maps.coActivation = new Map();
  MX2_MEM.maps.gradients = new Map();
  MX2_MEM.maps.deltas = new Map();

  MX2_MEM.session = {
    sid: mx2_make_session_id(),
    t0: mx2_now(),
    t1: 0,
    totalTokens: 0,
    totalActivations: 0
  };

  if (clear_idb) {
    await mx2_idb_tx(["events", "memory", "sessions"], "readwrite", async ({ events, memory, sessions }) => {
      await mx2_idb_clear(events);
      await mx2_idb_clear(memory);
      await mx2_idb_clear(sessions);
    });
  }

  return { ok: true, sid: MX2_MEM.session.sid, cleared: !!clear_idb };
}

/* ---------------------------
   7) SW ROUTES (memory)
--------------------------- */
function mx2_json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function mx2_route_memory(url) {
  const p = url.pathname;

  if (p === "/mx2/memory/status") {
    return mx2_json({
      ok: true,
      sid: MX2_MEM.session.sid,
      t0: MX2_MEM.session.t0,
      totalTokens: MX2_MEM.session.totalTokens,
      totalActivations: MX2_MEM.session.totalActivations,
      mirrors: {
        eventTraces_layers: MX2_MEM.maps.eventTraces.size,
        coActivation_keys: MX2_MEM.maps.coActivation.size,
        gradients_keys: MX2_MEM.maps.gradients.size,
        deltas_keys: MX2_MEM.maps.deltas.size
      }
    });
  }

  if (p === "/mx2/memory/export") {
    const coactArr = [];
    MX2_MEM.maps.coActivation.forEach((set, k) => coactArr.push([k, Array.from(set)]));

    return mx2_json({
      ok: true,
      meta: { sid: MX2_MEM.session.sid, t: mx2_now(), compliance: "BLACK_PANEL" },
      session: MX2_MEM.session,
      memory_substrate: {
        event_traces: Array.from(MX2_MEM.maps.eventTraces.entries()),
        co_activation: coactArr,
        symbolic_gradients: Array.from(MX2_MEM.maps.gradients.entries())
      }
    });
  }

  if (p === "/mx2/memory/reset") {
    const clear = url.searchParams.get("clear") === "1";
    const out = await mx2_mem_reset({ clear_idb: clear });
    return mx2_json(out);
  }

  if (p === "/mx2/memory/flush") {
    const out = await mx2_mem_flush();
    return mx2_json(out);
  }

  return null;
}

/* ============================================================
   CODEX LOADER (SAFE VERSION)
   - Non-authoritative
   - Failure tolerant
   - Frozen return
   ============================================================ */

async function loadCodex() {
  try {
    const idxRes = await fetch("./codex/codex.index.json", { cache: "no-store" });
    if (!idxRes.ok) return Object.freeze([]);

    const index = await idxRes.json();
    if (!index || !Array.isArray(index.files)) return Object.freeze([]);

    const codex = [];

    for (const file of index.files) {
      const fname = String(file || "").trim();
      if (!fname) continue;

      // Hard safety: only .json filenames, no traversal
      if (!fname.endsWith(".json")) continue;
      if (fname.includes("..") || fname.includes("\\") || fname.startsWith("/")) continue;

      try {
        const res = await fetch(`./codex/${fname}`, { cache: "no-store" });
        if (res.ok) codex.push(await res.json());
      } catch (_) {}
    }

    return Object.freeze(codex);
  } catch (_) {
    return Object.freeze([]);
  }
}

/* ============================================================
   MESSAGE BRIDGE (UI → KERNEL)
   - Single unified message listener (prevents double-handlers)
   ============================================================ */

function postBack(source, payload) {
  try { source && source.postMessage && source.postMessage(payload); } catch (_) {}
}

self.addEventListener("message", async (event) => {
  const msg = event.data || {};
  const type = msg.type;

  // MX2 substrate message API
  if (type === "mx2.activation") {
    try { mx2_record_activation(msg.payload || {}); } catch (_) {}
    return;
  }
  if (type === "mx2.flush") {
    mx2_mem_flush().catch(() => {});
    return;
  }
  if (type === "mx2.reset") {
    mx2_mem_reset({ clear_idb: !!msg.clear_idb }).catch(() => {});
    return;
  }

  // Ω kernel UI bridge
  switch (type) {
    case "Ω_INIT": {
      try {
        await mx2_mem_boot();              // substrate available immediately
        await loadManifest();              // authoritative
        extractBrain(KERNEL_STATE.manifest);

        // SAFE: codex does not affect execution
        KERNEL_STATE.codex = await loadCodex();

        const svg = expandBrainToSVG(KERNEL_STATE.brain);

        postBack(event.source, {
          type: "Ω_SVG_READY",
          svg,
          codex: KERNEL_STATE.codex, // optional read-only projection
          meta: {
            kernel: Ω.VERSION,
            ticks: KERNEL_STATE.ticks,
            entropy: KERNEL_STATE.entropy,
            deterministic: Ω.DETERMINISTIC
          }
        });
      } catch (err) {
        postBack(event.source, { type: "Ω_ERROR", err: String(err && err.message ? err.message : err) });
      }
      break;
    }

    case "Ω_NODE_ACTIVATE": {
      try {
        const node = msg.node;
        const tokens = msg.tokens;

        const delta = compressionDelta(tokens);
        const weight = symbolicWeight(tokens);

        kuhulTick();

        // Optional: record activation structurally (still lawful)
        // If UI provides layer/token, pass them; otherwise keep minimal.
        try {
          mx2_record_activation({
            node: String(node || "UNKNOWN"),
            layer: String(msg.layer || "unknown"),
            token: msg.token == null ? null : String(msg.token),
            weight,
            tokens: Array.isArray(tokens) ? tokens : []
          });
        } catch (_) {}

        postBack(event.source, {
          type: "Ω_NODE_RESULT",
          node,
          delta,
          weight,
          tick: KERNEL_STATE.ticks,
          entropy: KERNEL_STATE.entropy
        });
      } catch (err) {
        postBack(event.source, { type: "Ω_ERROR", err: String(err && err.message ? err.message : err) });
      }
      break;
    }

    // Optional: allow UI to request codex refresh without changing law
    case "Ω_CODEX_REFRESH": {
      try {
        KERNEL_STATE.codex = await loadCodex();
        postBack(event.source, { type: "Ω_CODEX_READY", codex: KERNEL_STATE.codex });
      } catch (_) {
        postBack(event.source, { type: "Ω_CODEX_READY", codex: Object.freeze([]) });
      }
      break;
    }

    default:
      // ignore unknown messages
      break;
  }
});

/* ============================================================
   FETCH HOOK (routes)
   - Single unified fetch handler (prevents collisions)
   ============================================================ */

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin routes (3-file law)
  if (url.origin !== self.location.origin) return;

  // MX2 memory routes
  if (url.pathname.startsWith("/mx2/memory/")) {
    event.respondWith((async () => {
      const res = await mx2_route_memory(url);
      return res || mx2_json({ ok: false, err: "not_found" }, 404);
    })());
    return;
  }

  // (Optional) codex index passthrough helper (read-only convenience)
  // - Does not grant directory listing; only returns already-loaded codex count.
  if (url.pathname === "/mx2/codex/status") {
    event.respondWith(mx2_json({
      ok: true,
      codex_loaded: Array.isArray(KERNEL_STATE.codex) ? KERNEL_STATE.codex.length : 0
    }));
    return;
  }

  // Otherwise: fall through to network (no caching behavior defined here by design).
});

/* ============================================================
   SERVICE WORKER LIFECYCLE
   - Single install/activate (prevents double-boot)
   ============================================================ */

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    await mx2_mem_boot();
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    await mx2_mem_boot();
    await self.clients.claim();
  })());
});
