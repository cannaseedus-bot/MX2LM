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
  VERSION: "Ω-KUHUL-PI-KERNEL.v1",
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
  const brain = manifest.brains?.[brainId];
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

  return `
    <g class="mx-node" data-node="${node.bind.node}" data-layer="${node.bind.layer}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"
            fill="var(--${node.bind.layer}-bg, #0b1322)"
            stroke="var(--${node.bind.layer}-fg, #1a2b44)" />
      <text x="${x + 20}" y="${y + 28}" font-family="monospace" font-size="12" fill="#e8f5ff">
        ${node.bind.node}
      </text>
    </g>
  `;
}

function expandLayer(layer, nodes) {
  const layout = layer.layout;
  let offsetX = layout.⟁P[0];
  let offsetY = layout.⟁P[1] + 40;

  return nodes.map((node, i) =>
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

  brain.layers_def.forEach(layer => {
    const nodes = layer.nodes.map(id =>
      brain.nodes_def.find(n => n.id === id)
    );
    svg += expandLayer(layer, nodes);
  });

  svg += `</svg>`;
  KERNEL_STATE.expandedSVG = svg;
  return svg;
}

/* ============================================================
   π — COMPRESSION CALCULUS
   ============================================================ */

function compressionDelta(tokens) {
  const unique = new Set(tokens).size;
  return tokens.length === 0 ? 0 : unique / tokens.length;
}

function symbolicWeight(tokens) {
  return tokens.reduce((sum, t) => {
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
   MESSAGE BRIDGE (UI → KERNEL)
   ============================================================ */

self.addEventListener("message", async (event) => {
  const { type } = event.data || {};

  switch (type) {

    case "Ω_INIT": {
      await loadManifest();
      extractBrain(KERNEL_STATE.manifest);
      const svg = expandBrainToSVG(KERNEL_STATE.brain);
      event.source.postMessage({ type: "Ω_SVG_READY", svg });
      break;
    }

    case "Ω_NODE_ACTIVATE": {
      const { node, tokens } = event.data;
      const delta = compressionDelta(tokens);
      const weight = symbolicWeight(tokens);
      kuhulTick();
      event.source.postMessage({
        type: "Ω_NODE_RESULT",
        node,
        delta,
        weight,
        tick: KERNEL_STATE.ticks
      });
      break;
    }

    default:
      // ignore unknown messages
      break;
  }
});

/* ============================================================
   SERVICE WORKER LIFECYCLE
   ============================================================ */

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});


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
    events:  { keyPath: "id", indexes: [["t","t"], ["node","node"], ["layer","layer"]] },
    memory:  { keyPath: "k",  indexes: [["ns","ns"], ["t","t"]] },
    sessions:{ keyPath: "sid",indexes: [["t0","t0"], ["t1","t1"]] },
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
    MANIFEST:    "manifest_brains", // optional: store compressed brain glyph blocks
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

    req.onupgradeneeded = (e) => {
      const db = req.result;

      // Create stores
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

function mx2_idb_get(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
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
   - Buffers are RAM-only; IDB is substrate
--------------------------- */
const MX2_MEM = {
  // RAM buffers (flush to IDB)
  buf: {
    events: [],
    memory: [],    // memory snapshots/deltas
    sessions: []
  },

  // RAM mirrors (optional, keep tiny)
  // These are structural and can be reconstructed from IDB.
  maps: {
    eventTraces: new Map(),       // key: layer -> array[{node,t,tc}]
    coActivation: new Map(),      // key: `${layer}:${node}` -> Set(otherNodes)
    gradients: new Map(),         // key: `${layer}:${node}` -> {count,eff,t}
    deltas: new Map(),            // key: `${node}:${t}` -> delta
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

// Deterministic ID: based on epoch seconds + stable tag
function mx2_make_session_id() {
  const s = Math.floor(mx2_now() / 1000);
  return `mx2_${s}_Ω`;
}

function mx2_hash32(str) {
  // deterministic, non-crypto
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mx2_compression_delta(tokens) {
  if (!tokens || !tokens.length) return 0;
  const uniq = new Set(tokens).size;
  return uniq / tokens.length;
}

/* ---------------------------
   3) BOOT / LOAD SUBSTRATE
--------------------------- */
async function mx2_mem_boot() {
  if (!MX2_MEM.session.sid) {
    MX2_MEM.session.sid = mx2_make_session_id();
    MX2_MEM.session.t0 = mx2_now();
  }

  // Load small structural mirrors from IDB if present
  await mx2_idb_tx(["memory"], "readonly", async ({ memory }) => {
    const all = await mx2_idb_getAll(memory);
    // We only rebuild RAM mirrors for known namespaces.
    for (const row of all) {
      if (!row || !row.ns) continue;

      if (row.ns === MX2_IDB.NS.EVENT_TRACES && row.id === "by_layer") {
        MX2_MEM.maps.eventTraces = new Map(row.v || []);
      }
      if (row.ns === MX2_IDB.NS.COACT && row.id === "graph") {
        // Stored as [key, [vals...]]
        const m = new Map();
        for (const [k, arr] of (row.v || [])) m.set(k, new Set(arr));
        MX2_MEM.maps.coActivation = m;
      }
      if (row.ns === MX2_IDB.NS.GRAD && row.id === "avg") {
        MX2_MEM.maps.gradients = new Map(row.v || []);
      }
    }
  });

  // Start deterministic flush interval
  mx2_mem_start_flush_loop();
}

let __mx2_flush_timer = null;
function mx2_mem_start_flush_loop() {
  if (__mx2_flush_timer) return;
  __mx2_flush_timer = setInterval(() => {
    mx2_mem_flush().catch(() => {});
  }, MX2_IDB.FLUSH_MS);
}

/* ---------------------------
   4) WRITE PATHS (events → substrate)
--------------------------- */
function mx2_record_activation({ node, layer, token, weight, tokens }) {
  const t = mx2_now();
  const ts = Math.floor(t / 1000);

  // Structural event id: stable within second window
  const id = `ev_${node}_${layer}_${ts}`;

  // 1) Update RAM mirrors
  MX2_MEM.session.totalActivations++;
  MX2_MEM.session.totalTokens += (tokens?.length || 0);

  // event traces
  if (!MX2_MEM.maps.eventTraces.has(layer)) MX2_MEM.maps.eventTraces.set(layer, []);
  MX2_MEM.maps.eventTraces.get(layer).push({ node, t, tc: (tokens?.length || 0) });

  // compression deltas
  const d = mx2_compression_delta(tokens || []);
  MX2_MEM.maps.deltas.set(`${node}:${t}`, d);

  // gradients (structural mean efficiency)
  const gk = `${layer}:${node}`;
  const cur = MX2_MEM.maps.gradients.get(gk) || { count: 0, eff: 0, t: 0 };
  const n = cur.count + 1;
  const eff = (cur.eff * cur.count + d) / n;
  MX2_MEM.maps.gradients.set(gk, { count: n, eff, t });

  // co-activation graph (optional): you can feed “active set” externally;
  // here we only store an empty set unless you pass coActivatedWith[].
  // (Keep deterministic: no heuristics.)
  if (!MX2_MEM.maps.coActivation.has(gk)) MX2_MEM.maps.coActivation.set(gk, new Set());

  // 2) Buffer IDB writes (bounded)
  MX2_MEM.buf.events.push({
    id,
    sid: MX2_MEM.session.sid,
    node,
    layer,
    token,
    w: +weight,
    tc: (tokens?.length || 0),
    d,
    t
  });

  if (MX2_MEM.buf.events.length > MX2_IDB.MAX_BUFFER) {
    MX2_MEM.buf.events.splice(0, MX2_MEM.buf.events.length - MX2_IDB.MAX_BUFFER);
  }

  // 3) Buffer memory snapshots (small, periodic – we store mirrors)
  // Snapshots are overwrite-style (same key), so safe.
  mx2_buffer_memory_mirrors(t);
}

function mx2_buffer_memory_mirrors(t) {
  // Convert Sets -> arrays for storage
  const coactArr = [];
  MX2_MEM.maps.coActivation.forEach((set, k) => coactArr.push([k, Array.from(set)]));

  // Overwrite snapshots (same k)
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

  // Keep memory buffer bounded (overwrite-style; keep last few)
  if (MX2_MEM.buf.memory.length > 24) MX2_MEM.buf.memory.splice(0, MX2_MEM.buf.memory.length - 24);
}

/* ---------------------------
   5) FLUSH TO IDB (deterministic)
--------------------------- */
async function mx2_mem_flush() {
  const t = mx2_now();
  MX2_MEM.session.t1 = t;

  const events = MX2_MEM.buf.events.splice(0);
  const memory = MX2_MEM.buf.memory.splice(0);

  // Session snapshot (overwrite)
  const sess = {
    sid: MX2_MEM.session.sid,
    t0: MX2_MEM.session.t0,
    t1: MX2_MEM.session.t1,
    totalTokens: MX2_MEM.session.totalTokens,
    totalActivations: MX2_MEM.session.totalActivations
  };

  await mx2_idb_tx(["events", "memory", "sessions"], "readwrite", async ({ events: ev, memory: mem, sessions }) => {
    // events append
    for (const e of events) await mx2_idb_put(ev, e);

    // memory overwrite snapshots
    for (const m of memory) await mx2_idb_put(mem, m);

    // sessions overwrite
    await mx2_idb_put(sessions, sess);
  });

  return { ok: true, flushed: { events: events.length, memory: memory.length } };
}

/* ---------------------------
   6) RESET (structural only)
   - Clears session + RAM buffers
   - Optionally clears IDB stores
--------------------------- */
async function mx2_mem_reset({ clear_idb = false } = {}) {
  MX2_MEM.buf.events = [];
  MX2_MEM.buf.memory = [];
  MX2_MEM.buf.sessions = [];

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
   7) SW ROUTES (optional, but useful)
   - /mx2/memory/status
   - /mx2/memory/export
   - /mx2/memory/reset?clear=1
--------------------------- */
function mx2_json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function mx2_route_memory(req, url) {
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
    // Export structural data only
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

/* ---------------------------
   8) MESSAGE API (optional)
   - postMessage({type:"mx2.activation", payload:{...}})
--------------------------- */
self.addEventListener("message", (evt) => {
  const msg = evt.data || {};
  if (!msg || !msg.type) return;

  if (msg.type === "mx2.activation") {
    // payload: {node,layer,token,weight,tokens[]}
    try { mx2_record_activation(msg.payload || {}); } catch (_) {}
  }

  if (msg.type === "mx2.flush") {
    mx2_mem_flush().catch(() => {});
  }

  if (msg.type === "mx2.reset") {
    mx2_mem_reset({ clear_idb: !!msg.clear_idb }).catch(() => {});
  }
});

/* ---------------------------
   9) FETCH HOOK (mount routes)
   IMPORTANT: integrate inside your existing fetch router.
   If you don't have one yet, this is safe to paste near the top
   and let it fall through to your other handlers.
--------------------------- */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin routes (3-file law)
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/mx2/memory/")) {
    event.respondWith((async () => {
      const res = await mx2_route_memory(event.request, url);
      return res || mx2_json({ ok: false, err: "not_found" }, 404);
    })());
  }
});

/* ---------------------------
   10) SW LIFECYCLE: boot substrate
--------------------------- */
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

/* ---------------------------
   11) Codex loader (SAFE VERSION)
--------------------------- */

async function loadCodex() {
  const codexFiles = [
    "kuhul_ui_codex.json",
    "kuhul_chat_codex.json",
    "kuhul_visualization_codex.json"
    // optionally auto-discovered
  ];

  const codex = [];

  for (const file of codexFiles) {
    try {
      const res = await fetch(`./codex/${file}`, { cache: "no-store" });
      if (res.ok) codex.push(await res.json());
    } catch (_) {
      // Codex failure must NEVER crash kernel
    }
  }

  return Object.freeze(codex);
}
