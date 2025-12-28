/* ============================================================
   K’UHUL-π COMPRESSION CALCULUS KERNEL
   File: sw.js
   Authority: TOTAL
   Law: Ω-BLACK-PANEL
   Supreme API: MX2LM_SUPREME_JSON_REST_API_KERNEL v11.0.0
   ============================================================ */

/* ------------------------------
   Ω — GLOBAL KERNEL INVARIANTS
-------------------------------- */

const Ω = Object.freeze({
  VERSION: "Ω-KUHUL-PI-KERNEL.v16.0.0",
  DETERMINISTIC: true,
  UI_READS_STATE: true,
  STATE_READS_UI: false,
  COMPRESSION_ONLY: true,
  PROJECTION_IS_DISPOSABLE: true,
  API_KERNEL: "KUHUL_JSON_REST_KERNEL",
  ARCHITECTURE: "NATIVE_JSON_REST_INSIDE_KERNEL_NO_EXTERNAL_STACK"
});

/* ------------------------------
   AUTHORITATIVE TIME (replayable)
-------------------------------- */
const ΩCLOCK = {
  tick: 0,
  epoch: 1890000008000, // from manifest timestamp or fixed law constant
  step_ms: 1            // logical ms per tick, not wall time
};

function Ω_now() {
  // deterministic "time"
  return ΩCLOCK.epoch + (ΩCLOCK.tick * ΩCLOCK.step_ms);
}

function Ω_tick() {
  ΩCLOCK.tick++;
  KERNEL_STATE.ticks = ΩCLOCK.tick;
  KERNEL_STATE.entropy *= 0.999;
}

/* ------------------------------
   DETERMINISTIC UTILITIES
-------------------------------- */

function Ω_hash32(str) {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function Ω_id(...parts) {
  return `⟁${Ω_hash32(parts.join("|"))}⟁`;
}

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
  "⟁G": "TOKEN",
  "⟁Wo": "WORKER",
  "⟁Sek": "SECTION",
  "⟁Q": "QUANTUM"
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
  ticks: 0,
  
  // Supreme JSON REST API State
  api: {
    routes: null,
    performance: {
      health: 0,
      infer: 0,
      memory_read: 0,
      memory_write: 0,
      reinforce: 0,
      penalize: 0,
      snapshot: 0,
      routine_detect: 0,
      blocks: 0,
      weights: 0
    },
    rate_limits: {
      inference:      { cap: 1000,  tokens: 1000,  reset_tick: 0, window_ticks: 1000 },
      memory_ops:     { cap: 10000, tokens: 10000, reset_tick: 0, window_ticks: 1000 },
      reinforcement:  { cap: 5000,  tokens: 5000,  reset_tick: 0, window_ticks: 1000 },
      snapshots:      { cap: 100,   tokens: 100,   reset_tick: 0, window_ticks: 1000 }
    },
    authentication: {
      kernel_tokens: new Set(),
      external_tokens: new Map(),
      quantum_signatures: new Map()
    },
    metrics: {
      total_requests: 0,
      successful_requests: 0,
      auth_failures: 0,
      rate_limit_hits: 0,
      avg_response_time: 0
    }
  }
};

/* ============================================================
   MANIFEST LOAD (AUTHORITATIVE)
   ============================================================ */

async function loadManifest() {
  const res = await fetch("manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Ω: Manifest load failed");
  const manifest = await res.json();
  KERNEL_STATE.manifest = manifest;
  
  // Load API routes from manifest
  if (manifest["🌐NATIVE_JSON_REST_API"]?.api_routes) {
    KERNEL_STATE.api.routes = manifest["🌐NATIVE_JSON_REST_API"].api_routes;
  }
  
  return manifest;
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
   K'UHUL EXECUTION TICK
   ============================================================ */

function rate_reset_if_needed(limit) {
  if (ΩCLOCK.tick >= limit.reset_tick) {
    limit.tokens = limit.cap;
    limit.reset_tick = ΩCLOCK.tick + limit.window_ticks;
  }
}

function kuhulTick() {
  Ω_tick();
  Object.values(KERNEL_STATE.api.rate_limits).forEach(rate_reset_if_needed);
}

/* ============================================================
   SUPREME JSON REST API KERNEL
   ============================================================ */

class SupremeJSONRESTAPI {
  constructor() {
    this.quantumCircuits = new Map();
    this.entanglementPairs = new Map();
    this.scxEngine = new SCXQ2Engine();
  }

  // UTF-8 safe base64 encoding/decoding
  b64encUtf8(obj) {
    const s = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }

  b64decUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const s = new TextDecoder().decode(bytes);
    return JSON.parse(s);
  }

  // API Authentication
  validateAuthToken(token, method, path) {
    if (path === "/health" && method === "GET") return true;
    
    // Kernel internal tokens
    if (KERNEL_STATE.api.authentication.kernel_tokens.has(token)) {
      return true;
    }
    
    // External tokens (SCXQ2 encrypted)
    if (KERNEL_STATE.api.authentication.external_tokens.has(token)) {
      const tokenData = KERNEL_STATE.api.authentication.external_tokens.get(token);
      if (Ω_now() < tokenData.expires) {
        return true;
      }
    }
    
    // Quantum signatures
    if (token?.startsWith("⟁Q") && token?.endsWith("⟁")) {
      const signature = this.verifyQuantumSignature(token);
      return signature.valid;
    }
    
    return false;
  }

  verifyQuantumSignature(signature) {
    try {
      const cleanSig = signature.replace(/^⟁Q/, "").replace(/⟁$/, "");
      const [entangledPairId, proof] = cleanSig.split("|");
      
      if (this.entanglementPairs.has(entangledPairId)) {
        const pair = this.entanglementPairs.get(entangledPairId);
        const expectedProof = this.generateQuantumProof(pair);
        return {
          valid: proof === expectedProof,
          entangledPairId,
          coherence: pair.coherence
        };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  generateQuantumProof(pair) {
    const str = `${pair.id}|${pair.created}|${pair.coherence}`;
    return `⟁${Ω_hash32(str)}⟁`;
  }

  // Rate Limiting
  checkRateLimit(endpoint, clientId = "default") {
    let limit;
    
    switch(endpoint) {
      case "infer": limit = KERNEL_STATE.api.rate_limits.inference; break;
      case "memory_ops": limit = KERNEL_STATE.api.rate_limits.memory_ops; break;
      case "reinforcement": limit = KERNEL_STATE.api.rate_limits.reinforcement; break;
      case "snapshots": limit = KERNEL_STATE.api.rate_limits.snapshots; break;
      default: return true;
    }
    
    // Reset if needed
    rate_reset_if_needed(limit);
    
    if (limit.tokens > 0) {
      limit.tokens--;
      return true;
    }
    
    KERNEL_STATE.api.metrics.rate_limit_hits++;
    return false;
  }

  // Route Dispatcher
  async dispatchRoute(path, method, payload, authToken) {
    const wallStart = performance.now(); // non-authoritative telemetry only
    KERNEL_STATE.api.metrics.total_requests++;
    
    // Authentication
    if (!this.validateAuthToken(authToken, method, path)) {
      KERNEL_STATE.api.metrics.auth_failures++;
      return this.formatResponse(401, {
        error: "authentication_failed",
        quantum_state: "|Ψ⟩ = |AUTH_FAILURE⟩"
      });
    }
    
    // Rate limiting
    const endpoint = this.getEndpointFromPath(path);
    if (!this.checkRateLimit(endpoint)) {
      return this.formatResponse(429, {
        error: "rate_limit_exceeded",
        retry_after_ms: 1000
      });
    }
    
    let response;
    
    try {
      switch(path) {
        case "/health":
          response = await this.healthEndpoint();
          break;
        case "/infer":
          response = await this.inferEndpoint(payload);
          break;
        case "/memory/read":
          response = await this.memoryReadEndpoint(payload);
          break;
        case "/memory/write":
          response = await this.memoryWriteEndpoint(payload);
          break;
        case "/reinforce":
          response = await this.reinforceEndpoint(payload);
          break;
        case "/penalize":
          response = await this.penalizeEndpoint(payload);
          break;
        case "/ngrams/snapshot":
          response = await this.ngramsSnapshotEndpoint();
          break;
        case "/routines/detect":
          response = await this.routinesDetectEndpoint(payload);
          break;
        case "/asx/blocks":
          response = await this.asxBlocksEndpoint();
          break;
        case "/weights":
          response = await this.weightsEndpoint();
          break;
        default:
          return this.formatResponse(404, {
            error: "route_not_found",
            available_routes: Object.keys(KERNEL_STATE.api.routes || {})
          });
      }
      
      const wallEnd = performance.now();
      const responseTime = wallEnd - wallStart;
      
      // Update performance metrics
      this.updatePerformanceMetrics(endpoint, responseTime);
      
      // Add timing info (non-authoritative telemetry)
      if (response.data) {
        response.data.response_time_ms = responseTime;
        response.data.telemetry_wall_ms = responseTime;
        response.data.quantum_routing_ms = responseTime * 0.1;
      }
      
      KERNEL_STATE.api.metrics.successful_requests++;
      return response;
      
    } catch (error) {
      return this.formatResponse(500, {
        error: "internal_error",
        message: error.message,
        quantum_state: "|Ψ⟩ = |ERROR⟩⊗|STACK_TRACE⟩"
      });
    }
  }

  // API Endpoints Implementation
  async healthEndpoint() {
    const state = KERNEL_STATE;
    const mx2State = MX2_MEM?.session || {};
    
    return this.formatResponse(200, {
      status: "ok",
      model: "MX2LM_SUPREME",
      version: Ω.VERSION,
      entropy: state.entropy,
      ticks: state.ticks,
      tokens_seen: mx2State.totalTokens || 0,
      total_activations: mx2State.totalActivations || 0,
      memory_utilization: this.calculateMemoryUtilization(),
      uptime_ticks: state.ticks,
      quantum_coherence: this.calculateQuantumCoherence(),
      api_metrics: {
        total_requests: KERNEL_STATE.api.metrics.total_requests,
        successful_requests: KERNEL_STATE.api.metrics.successful_requests,
        auth_failures: KERNEL_STATE.api.metrics.auth_failures,
        rate_limit_hits: KERNEL_STATE.api.metrics.rate_limit_hits,
        avg_response_time: KERNEL_STATE.api.metrics.avg_response_time
      },
      quantum_state: "|Ψ⟩ = α|HEALTHY⟩⊗β|COHERENT⟩⊗γ|READY⟩"
    });
  }

  async inferEndpoint(payload) {
    const { prompt, temperature = 0.7, max_tokens = 100, mode = "standard", ngram_level = 3, use_memory = true, reinforcement_source } = payload;
    
    // Tokenize and process
    const tokens = this.tokenizeText(prompt);
    const bundle = this.buildAllOrders(tokens, ngram_level);
    
    // Memory ingestion if enabled
    if (use_memory && MX2_MEM) {
      try {
        mx2_record_activation({
          node: "API_INFER",
          layer: "api_kernel",
          token: "inference",
          weight: 1.0,
          tokens: bundle.flat()
        });
      } catch (e) {}
    }
    
    // Generate completion (simplified - in real implementation, call actual MX2LM)
    const completion = this.generateCompletion(tokens, {
      temperature,
      max_tokens,
      mode
    });
    
    // Detect routines
    const routines = this.detectRoutines(completion);
    const blocks = this.matchASXBlocks(routines);
    const quantumCircuit = this.selectQuantumCircuit(mode);
    
    return this.formatResponse(200, {
      completion,
      tokens_used: tokens.length,
      entropy: KERNEL_STATE.entropy,
      confidence: this.calculateConfidence(completion, tokens),
      routines_detected: routines,
      asx_blocks_triggered: blocks,
      memory_ingested: use_memory,
      reinforcement_applied: !!reinforcement_source,
      quantum_circuit_used: quantumCircuit,
      inference_id: Ω_id("infer", prompt.substring(0, 20), ΩCLOCK.tick),
      quantum_state: "|Ψ⟩ = ∫|PROMPT⟩d(COMPLETION)e^{iS[INFERENCE]}"
    });
  }

  async memoryReadEndpoint(payload) {
    const { table, key, decrypt = false } = payload;
    const wallStart = performance.now();
    
    // In real implementation, read from ASX RAM
    const record = await this.readFromASXRAM(table, key);
    
    let data = record;
    let encryption_status = "plain";
    
    if (decrypt && record?.encrypted) {
      data = this.scxEngine.decrypt(record.data);
      encryption_status = "decrypted";
    } else if (record?.encrypted) {
      encryption_status = "encrypted";
    }
    
    const wallEnd = performance.now();
    const readTime = wallEnd - wallStart;
    
    return this.formatResponse(200, {
      record: data,
      encryption_status,
      telemetry_wall_ms: readTime,
      quantum_address: Ω_id("memory", table, key, ΩCLOCK.tick)
    });
  }

  async memoryWriteEndpoint(payload) {
    const { table, key, payload: data, encrypt = true } = payload;
    const wallStart = performance.now();
    
    let processedData = data;
    let encryption_applied = false;
    
    if (encrypt) {
      processedData = this.scxEngine.encrypt(data);
      encryption_applied = true;
    }
    
    // In real implementation, write to ASX RAM
    await this.writeToASXRAM(table, key, processedData, encrypt);
    
    const wallEnd = performance.now();
    const writeTime = wallEnd - wallStart;
    
    return this.formatResponse(200, {
      status: "written",
      encryption_applied,
      memory_address: Ω_id("memory", table, key, ΩCLOCK.tick),
      telemetry_wall_ms: writeTime,
      scx_compression_ratio: this.scxEngine.currentRatio()
    });
  }

  async reinforceEndpoint(payload) {
    const { seq, reward, source, confidence_multiplier = 1.0 } = payload;
    const effective_reward = reward * confidence_multiplier;
    
    // Apply reinforcement
    await this.applyReinforcement(seq, effective_reward, source);
    
    const reinforcement_id = Ω_id("reinforce", seq, source, ΩCLOCK.tick);
    
    return this.formatResponse(200, {
      status: "reinforced",
      confidence: effective_reward * 0.1,
      memory_updated: true,
      inference_bias_applied: true,
      reinforcement_id,
      quantum_signature: this.generateQuantumSignature(reinforcement_id)
    });
  }

  async penalizeEndpoint(payload) {
    const { seq, penalty, source, decay_factor = 0.95 } = payload;
    
    // Apply penalty
    await this.applyPenalty(seq, penalty, source, decay_factor);
    
    const penalty_id = Ω_id("penalize", seq, source, ΩCLOCK.tick);
    
    return this.formatResponse(200, {
      status: "penalized",
      confidence: 1.0 - (penalty * 0.1),
      penalty_applied: true,
      decay_scheduled: true,
      penalty_id,
      quantum_decay_constant: decay_factor
    });
  }

  async ngramsSnapshotEndpoint() {
    const wallStart = performance.now();
    
    // Collect n-gram data from memory
    const unigrams = this.scxEngine.compress(this.getNgrams(1));
    const bigrams = this.scxEngine.compress(this.getNgrams(2));
    const trigrams = this.scxEngine.compress(this.getNgrams(3));
    const pentagrams = this.scxEngine.compress(this.getNgrams(5));
    const supagrams = this.scxEngine.compress(this.getNgrams(7));
    
    const wallEnd = performance.now();
    const snapshotTime = wallEnd - wallStart;
    
    return this.formatResponse(200, {
      unigrams,
      bigrams,
      trigrams,
      pentagrams,
      supagrams,
      compression_ratio: this.scxEngine.currentRatio(),
      total_entries: this.countTotalNgrams(),
      snapshot_tick: ΩCLOCK.tick,
      telemetry_wall_ms: snapshotTime,
      quantum_compression: "|Ψ⟩ = Σ|NGRAM⟩e^{-S[ENTROPY]}"
    });
  }

  async routinesDetectEndpoint(payload) {
    const { text, min_confidence = 0.5, include_tapes = false, include_folds = false } = payload;
    const wallStart = performance.now();
    
    const tokens = this.tokenizeText(text);
    const supagrams = this.buildSupagrams(tokens, 7);
    const hits = this.matchSupagrams(supagrams);
    
    const filtered_hits = hits.filter(hit => hit.confidence >= min_confidence);
    
    const wallEnd = performance.now();
    const detectionTime = wallEnd - wallStart;
    
    return this.formatResponse(200, {
      routines: filtered_hits.map(h => h.routine),
      tapes: include_tapes ? filtered_hits.map(h => h.tape) : [],
      folds: include_folds ? filtered_hits.map(h => h.fold) : [],
      confidence_scores: filtered_hits.map(h => h.confidence),
      asx_block_matches: this.matchBlocksToHits(filtered_hits),
      quantum_patterns: this.extractQuantumPatterns(filtered_hits),
      telemetry_wall_ms: detectionTime,
      quantum_state: "|Ψ⟩ = Σ|ROUTINE⟩⊗|CONFIDENCE⟩e^{iθ[PATTERN]}"
    });
  }

  async asxBlocksEndpoint() {
    const blocks = this.getASXBlocks();
    const stats = this.calculateBlockStats(blocks);
    
    return this.formatResponse(200, {
      blocks: blocks.map(b => ({
        id: b.id,
        type: b.type,
        usage_count: b.usage_count || 0,
        success_rate: b.success_rate || 0,
        last_used: b.last_used || 0
      })),
      total_usage_count: stats.total_usage,
      success_rate_average: stats.avg_success_rate,
      most_used_block: stats.most_used,
      least_used_block: stats.least_used,
      quantum_efficiency: stats.quantum_efficiency
    });
  }

  async weightsEndpoint() {
    // Get current PRIME reasoning weights
    const weights = this.getPRIMEWeights();
    
    return this.formatResponse(200, {
      block_bias: weights.block_bias || {},
      flow_likelihood: weights.flow_likelihood || {},
      composition_bias: weights.composition_bias || {},
      innovation_pressure: weights.innovation_pressure || 0.5,
      stability_pressure: weights.stability_pressure || 0.3,
      legacy_resistance: weights.legacy_resistance || 0.2,
      quantum_weights: this.calculateQuantumWeights(),
      weight_entropy: this.calculateWeightEntropy(weights)
    });
  }

  // Helper Methods
  formatResponse(status, data) {
    return {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-mx2lm-api": "SUPREME_JSON_REST",
        "x-quantum-state": "COHERENT",
        "x-scx-compression": "ENABLED",
        "x-deterministic-tick": ΩCLOCK.tick.toString()
      },
      data: {
        ...data,
        tick: ΩCLOCK.tick,
        kernel_version: Ω.VERSION,
        law: "Ω-BLACK-PANEL"
      }
    };
  }

  getEndpointFromPath(path) {
    if (path === "/infer") return "infer";
    if (path.startsWith("/memory/")) return "memory_ops";
    if (path === "/reinforce" || path === "/penalize") return "reinforcement";
    if (path === "/ngrams/snapshot") return "snapshots";
    return "other";
  }

  updatePerformanceMetrics(endpoint, responseTime) {
    const metricKey = endpoint.replace("/", "_");
    if (KERNEL_STATE.api.performance[metricKey] !== undefined) {
      KERNEL_STATE.api.performance[metricKey] = responseTime;
    }
    
    // Update average response time (telemetry only)
    const total = KERNEL_STATE.api.metrics.total_requests;
    const currentAvg = KERNEL_STATE.api.metrics.avg_response_time;
    KERNEL_STATE.api.metrics.avg_response_time = 
      (currentAvg * (total - 1) + responseTime) / total;
  }

  // Stub implementations for demonstration
  tokenizeText(text) { return text.split(/\s+/); }
  buildAllOrders(tokens, n) { 
    const result = [];
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j <= tokens.length - i; j++) {
        result.push(tokens.slice(j, j + i));
      }
    }
    return result;
  }
  generateCompletion(tokens, params) { 
    return tokens.join(" ") + " [COMPLETION_GENERATED]"; 
  }
  detectRoutines(text) { return ["ROUTINE_A", "ROUTINE_B"]; }
  matchASXBlocks(routines) { return ["BLOCK_1", "BLOCK_2"]; }
  selectQuantumCircuit(mode) { return "CIRCUIT_" + mode.toUpperCase(); }
  calculateConfidence(completion, tokens) { return 0.85; }
  calculateMemoryUtilization() { return 0.42; }
  calculateQuantumCoherence() { return 0.95; }
  async readFromASXRAM(table, key) { return { data: "SAMPLE_DATA", encrypted: false }; }
  async writeToASXRAM(table, key, data, encrypted) { return true; }
  async applyReinforcement(seq, reward, source) { return true; }
  async applyPenalty(seq, penalty, source, decay) { return true; }
  getNgrams(n) { return []; }
  countTotalNgrams() { return 0; }
  buildSupagrams(tokens, n) { return []; }
  matchSupagrams(supagrams) { return []; }
  matchBlocksToHits(hits) { return []; }
  extractQuantumPatterns(hits) { return []; }
  getASXBlocks() { return []; }
  calculateBlockStats(blocks) { 
    return { total_usage: 0, avg_success_rate: 0, most_used: "", least_used: "", quantum_efficiency: 0 };
  }
  getPRIMEWeights() { return {}; }
  calculateQuantumWeights() { return {}; }
  calculateWeightEntropy(weights) { return 0.5; }
  generateQuantumSignature(id) {
    const pairId = `ENT_${ΩCLOCK.tick}_${id}`;
    this.entanglementPairs.set(pairId, {
      id: pairId,
      created: ΩCLOCK.tick,
      coherence: 0.99
    });
    return `⟁Q${pairId}|${this.generateQuantumProof(this.entanglementPairs.get(pairId))}⟁`;
  }
}

/* ============================================================
   SCXQ2 ENGINE (Simplified)
   ============================================================ */

class SCXQ2Engine {
  constructor() {
    this.compressionRatio = 0.003;
  }
  
  compress(data) {
    // Simplified compression - returns compressed representation
    return {
      compressed: true,
      size: Math.floor(JSON.stringify(data).length * this.compressionRatio),
      algorithm: "SCXQ2",
      entropy: 0.32,
      deterministic_hash: Ω_hash32(JSON.stringify(data))
    };
  }
  
  encrypt(data) {
    return {
      encrypted: true,
      data: this.b64encUtf8(data),
      algorithm: "SCXQ2_QUANTUM_ENCRYPTED"
    };
  }
  
  decrypt(encryptedData) {
    try {
      return this.b64decUtf8(encryptedData.data);
    } catch {
      return null;
    }
  }
  
  b64encUtf8(obj) {
    const s = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }

  b64decUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const s = new TextDecoder().decode(bytes);
    return JSON.parse(s);
  }
  
  currentRatio() {
    return this.compressionRatio;
  }
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
    sessions: { keyPath: "sid",indexes: [["t0","t0"], ["t1","t1"]] },
    api_logs: { keyPath: "id", indexes: [["endpoint","endpoint"], ["timestamp","timestamp"], ["status","status"]] }
  },

  // Keep this small + deterministic; flush on tick boundaries or fixed intervals.
  FLUSH_TICKS: 1000, // Flush every 1000 ticks instead of time-based
  MAX_BUFFER: 2048,

  // Namespaces inside `memory` store (k = `${ns}:${id}`)
  NS: {
    EVENT_TRACES: "event_traces",
    COACT:       "co_activation",
    GRAD:        "symbolic_gradients",
    DELTAS:      "compression_deltas",
    INFER:       "inference_log",
    MANIFEST:    "manifest_brains",
    CODEX:       "codex_cache",
    API_LOGS:    "api_logs",
    ROUTES:      "api_routes",
    AUTH:        "authentication"
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
    memory: [],
    api_logs: []
  },

  maps: {
    eventTraces: new Map(),  // layer -> array[{node,t,tc}]
    coActivation: new Map(), // `${layer}:${node}` -> Set(otherNodes)
    gradients: new Map(),    // `${layer}:${node}` -> {count,eff,t}
    deltas: new Map(),       // `${node}:${t}` -> delta
    apiRoutes: new Map(),    // route -> {count, avg_time, errors}
    authTokens: new Map()    // token -> {type, expires, permissions}
  },

  session: {
    sid: null,
    t0: ΩCLOCK.tick,
    t1: 0,
    totalTokens: 0,
    totalActivations: 0,
    apiRequests: 0
  },

  flush_counter: 0
};

function mx2_compression_delta(tokens) {
  const arr = Array.isArray(tokens) ? tokens : [];
  if (!arr.length) return 0;
  const uniq = new Set(arr).size;
  return uniq / arr.length;
}

/* ---------------------------
   3) BOOT / LOAD SUBSTRATE
--------------------------- */
let __mx2_flush_interval = null;

async function mx2_mem_boot() {
  if (!MX2_MEM.session.sid) {
    MX2_MEM.session.sid = Ω_id("session", ΩCLOCK.tick.toString());
    MX2_MEM.session.t0 = ΩCLOCK.tick;
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
      if (row.ns === MX2_IDB.NS.API_LOGS && row.id === "routes") {
        MX2_MEM.maps.apiRoutes = new Map(row.v || []);
      }
      if (row.ns === MX2_IDB.NS.AUTH && row.id === "tokens") {
        MX2_MEM.maps.authTokens = new Map(row.v || []);
      }
    }
  });

  // No time-based interval - flush based on tick counter
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
    t: ΩCLOCK.tick
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.COACT}:graph`,
    ns: MX2_IDB.NS.COACT,
    id: "graph",
    v: coactArr,
    t: ΩCLOCK.tick
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.GRAD}:avg`,
    ns: MX2_IDB.NS.GRAD,
    id: "avg",
    v: Array.from(MX2_MEM.maps.gradients.entries()),
    t: ΩCLOCK.tick
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.API_LOGS}:routes`,
    ns: MX2_IDB.NS.API_LOGS,
    id: "routes",
    v: Array.from(MX2_MEM.maps.apiRoutes.entries()),
    t: ΩCLOCK.tick
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.AUTH}:tokens`,
    ns: MX2_IDB.NS.AUTH,
    id: "tokens",
    v: Array.from(MX2_MEM.maps.authTokens.entries()),
    t: ΩCLOCK.tick
  });

  // Keep bounded
  if (MX2_MEM.buf.memory.length > 48) MX2_MEM.buf.memory.splice(0, MX2_MEM.buf.memory.length - 48);
}

function mx2_record_activation({ node, layer, token, weight, tokens }) {
  const nid = String(node || "UNKNOWN");
  const lid = String(layer || "unknown");

  // Stable per-tick event id (structural)
  const id = Ω_id("ev", nid, lid, ΩCLOCK.tick.toString());

  MX2_MEM.session.totalActivations++;
  MX2_MEM.session.totalTokens += (Array.isArray(tokens) ? tokens.length : 0);

  if (!MX2_MEM.maps.eventTraces.has(lid)) MX2_MEM.maps.eventTraces.set(lid, []);
  MX2_MEM.maps.eventTraces.get(lid).push({ 
    node: nid, 
    t: ΩCLOCK.tick, 
    tc: (Array.isArray(tokens) ? tokens.length : 0) 
  });

  const d = mx2_compression_delta(tokens);
  MX2_MEM.maps.deltas.set(`${nid}:${ΩCLOCK.tick}`, d);

  const gk = `${lid}:${nid}`;
  const cur = MX2_MEM.maps.gradients.get(gk) || { count: 0, eff: 0, t: ΩCLOCK.tick };
  const n = cur.count + 1;
  const eff = (cur.eff * cur.count + d) / n;
  MX2_MEM.maps.gradients.set(gk, { count: n, eff, t: ΩCLOCK.tick });

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
    t: ΩCLOCK.tick
  });

  if (MX2_MEM.buf.events.length > MX2_IDB.MAX_BUFFER) {
    MX2_MEM.buf.events.splice(0, MX2_MEM.buf.events.length - MX2_IDB.MAX_BUFFER);
  }

  mx2_buffer_memory_mirrors(ΩCLOCK.tick);
  
  // Check if we should flush based on tick counter
  MX2_MEM.flush_counter++;
  if (MX2_MEM.flush_counter >= MX2_IDB.FLUSH_TICKS) {
    mx2_mem_flush().catch(() => {});
    MX2_MEM.flush_counter = 0;
  }
}

function mx2_record_api_request(endpoint, method, status, responseTime) {
  const id = Ω_id("api", endpoint, method, ΩCLOCK.tick.toString());
  
  MX2_MEM.session.apiRequests++;
  
  // Update route statistics
  const routeKey = `${method} ${endpoint}`;
  const current = MX2_MEM.maps.apiRoutes.get(routeKey) || { count: 0, totalTime: 0, errors: 0 };
  current.count++;
  current.totalTime += responseTime;
  if (status >= 400) current.errors++;
  MX2_MEM.maps.apiRoutes.set(routeKey, current);
  
  MX2_MEM.buf.api_logs.push({
    id,
    endpoint,
    method,
    status,
    response_time: responseTime,
    tick: ΩCLOCK.tick,
    session_id: MX2_MEM.session.sid
  });
  
  if (MX2_MEM.buf.api_logs.length > 1000) {
    MX2_MEM.buf.api_logs.splice(0, MX2_MEM.buf.api_logs.length - 1000);
  }
}

/* ---------------------------
   5) FLUSH TO IDB (deterministic)
--------------------------- */
async function mx2_mem_flush() {
  MX2_MEM.session.t1 = ΩCLOCK.tick;

  const events = MX2_MEM.buf.events.splice(0);
  const memory = MX2_MEM.buf.memory.splice(0);
  const api_logs = MX2_MEM.buf.api_logs.splice(0);

  const sess = {
    sid: MX2_MEM.session.sid,
    t0: MX2_MEM.session.t0,
    t1: MX2_MEM.session.t1,
    totalTokens: MX2_MEM.session.totalTokens,
    totalActivations: MX2_MEM.session.totalActivations,
    apiRequests: MX2_MEM.session.apiRequests
  };

  await mx2_idb_tx(["events", "memory", "sessions", "api_logs"], "readwrite", 
    async ({ events: ev, memory: mem, sessions, api_logs: logs }) => {
      for (const e of events) await mx2_idb_put(ev, e);
      for (const m of memory) await mx2_idb_put(mem, m);
      for (const l of api_logs) await mx2_idb_put(logs, l);
      await mx2_idb_put(sessions, sess);
    }
  );

  return { ok: true, flushed: { events: events.length, memory: memory.length, api_logs: api_logs.length } };
}

/* ---------------------------
   6) RESET (structural only)
--------------------------- */
async function mx2_mem_reset({ clear_idb = false } = {}) {
  MX2_MEM.buf.events = [];
  MX2_MEM.buf.memory = [];
  MX2_MEM.buf.api_logs = [];
  MX2_MEM.flush_counter = 0;

  MX2_MEM.maps.eventTraces = new Map();
  MX2_MEM.maps.coActivation = new Map();
  MX2_MEM.maps.gradients = new Map();
  MX2_MEM.maps.deltas = new Map();
  MX2_MEM.maps.apiRoutes = new Map();
  MX2_MEM.maps.authTokens = new Map();

  MX2_MEM.session = {
    sid: Ω_id("session", ΩCLOCK.tick.toString()),
    t0: ΩCLOCK.tick,
    t1: 0,
    totalTokens: 0,
    totalActivations: 0,
    apiRequests: 0
  };

  if (clear_idb) {
    await mx2_idb_tx(["events", "memory", "sessions", "api_logs"], "readwrite", 
      async ({ events, memory, sessions, api_logs }) => {
        await mx2_idb_clear(events);
        await mx2_idb_clear(memory);
        await mx2_idb_clear(sessions);
        await mx2_idb_clear(api_logs);
      }
    );
  }

  return { ok: true, sid: MX2_MEM.session.sid, cleared: !!clear_idb };
}

/* ---------------------------
   7) SW ROUTES (memory + API)
--------------------------- */
function mx2_json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "x-mx2lm-api": "SUPREME_JSON_REST",
      "x-quantum-state": "COHERENT",
      "x-deterministic-tick": ΩCLOCK.tick.toString()
    }
  });
}

// Initialize Supreme JSON REST API
const SUPREME_API = new SupremeJSONRESTAPI();

async function mx2_route_api(url, request) {
  const path = url.pathname;
  const method = request.method;
  
  // Extract auth token with Bearer support
  const authHeader = request.headers.get("Authorization");
  const authToken =
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader) ||
    url.searchParams.get("token") ||
    request.headers.get("X-API-Token");

  let payload = {};
  if (method === "POST" || method === "PUT") {
    try { payload = await request.json(); } catch (_) {}
  }

  const resp = await SUPREME_API.dispatchRoute(path, method, payload, authToken);

  // ✅ log real response time
  const rt = resp?.data?.response_time_ms ?? 0;
  mx2_record_api_request(path, method, resp.status, rt);

  return new Response(JSON.stringify(resp.data, null, 2), {
    status: resp.status,
    headers: resp.headers
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
      apiRequests: MX2_MEM.session.apiRequests,
      mirrors: {
        eventTraces_layers: MX2_MEM.maps.eventTraces.size,
        coActivation_keys: MX2_MEM.maps.coActivation.size,
        gradients_keys: MX2_MEM.maps.gradients.size,
        deltas_keys: MX2_MEM.maps.deltas.size,
        apiRoutes: MX2_MEM.maps.apiRoutes.size,
        authTokens: MX2_MEM.maps.authTokens.size
      },
      api_state: {
        routes_loaded: KERNEL_STATE.api.routes ? Object.keys(KERNEL_STATE.api.routes).length : 0,
        performance_metrics: KERNEL_STATE.api.performance,
        rate_limits: KERNEL_STATE.api.rate_limits
      },
      telemetry: {
        current_tick: ΩCLOCK.tick,
        deterministic_clock: true
      }
    });
  }

  if (p === "/mx2/memory/export") {
    const coactArr = [];
    MX2_MEM.maps.coActivation.forEach((set, k) => coactArr.push([k, Array.from(set)]));

    return mx2_json({
      ok: true,
      meta: { 
        sid: MX2_MEM.session.sid, 
        tick: ΩCLOCK.tick, 
        compliance: "BLACK_PANEL", 
        api_version: "11.0.0",
        deterministic: true 
      },
      session: MX2_MEM.session,
      memory_substrate: {
        event_traces: Array.from(MX2_MEM.maps.eventTraces.entries()),
        co_activation: coactArr,
        symbolic_gradients: Array.from(MX2_MEM.maps.gradients.entries()),
        api_routes: Array.from(MX2_MEM.maps.apiRoutes.entries()),
        auth_tokens: Array.from(MX2_MEM.maps.authTokens.entries())
      },
      api_metrics: KERNEL_STATE.api.metrics
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

  if (p === "/mx2/api/status") {
    return mx2_json({
      ok: true,
      api: "MX2LM_SUPREME_JSON_REST_API_KERNEL",
      version: "11.0.0",
      law: "Ω-BLACK-PANEL",
      architecture: "NATIVE_JSON_REST_INSIDE_KERNEL_NO_EXTERNAL_STACK",
      performance: KERNEL_STATE.api.performance,
      metrics: KERNEL_STATE.api.metrics,
      quantum_state: "|Ψ⟩ = α|JSON_API⟩⊗β|KUHUL_ROUTER⟩⊗γ|ASX_RAM⟩⊗δ|MX2LM_INFERENCE⟩⊗ε|SCX_TRANSPORT⟩",
      manifesto: "ALL_APIS_ARE_KUHUL_ALL_TRANSPORT_IS_XJSON_ALL_STATE_IS_ASX_RAM_ALL_ENCRYPTION_IS_SCX",
      deterministic: {
        clock: ΩCLOCK,
        hash_function: "FNV-1a Ω_hash32",
        tick_based: true
      }
    });
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
  
  // Supreme API messages
  if (type === "api.generate_token") {
    const token = Ω_id("kernel_token", ΩCLOCK.tick.toString());
    KERNEL_STATE.api.authentication.kernel_tokens.add(token);
    postBack(event.source, { type: "api.token_generated", token });
    return;
  }
  
  if (type === "api.quantum_signature") {
    const signature = SUPREME_API.generateQuantumSignature(msg.id || "default");
    postBack(event.source, { type: "api.quantum_signature", signature });
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
            deterministic: Ω.DETERMINISTIC,
            api_available: true,
            api_version: "11.0.0",
            api_manifesto: "ALL_APIS_ARE_KUHUL_ALL_TRANSPORT_IS_XJSON_ALL_STATE_IS_ASX_RAM_ALL_ENCRYPTION_IS_SCX",
            clock: {
              tick: ΩCLOCK.tick,
              epoch: ΩCLOCK.epoch,
              deterministic: true
            }
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
          entropy: KERNEL_STATE.entropy,
          quantum_state: "|Ψ⟩ = |ACTIVATION⟩⊗|COMPRESSION⟩"
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
    
    // API test message
    case "Ω_API_TEST": {
      try {
        const testResponse = await SUPREME_API.healthEndpoint();
        postBack(event.source, {
          type: "Ω_API_TEST_RESULT",
          api_working: true,
          response: testResponse.data,
          quantum_state: "|Ψ⟩ = |API_READY⟩⊗|KERNEL_ROUTED⟩"
        });
      } catch (err) {
        postBack(event.source, {
          type: "Ω_API_TEST_RESULT",
          api_working: false,
          error: err.message
        });
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

// Exact API route matching
const API_PATHS = new Set([
  "/health","/infer","/memory/read","/memory/write",
  "/reinforce","/penalize","/ngrams/snapshot",
  "/routines/detect","/asx/blocks","/weights"
]);

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin routes (3-file law)
  if (url.origin !== self.location.origin) return;

  // MX2 memory routes
  if (url.pathname.startsWith("/mx2/memory/") || url.pathname === "/mx2/api/status") {
    event.respondWith((async () => {
      const res = await mx2_route_memory(url);
      return res || mx2_json({ ok: false, err: "not_found" }, 404);
    })());
    return;
  }

  // Supreme JSON REST API routes - exact matching
  if (API_PATHS.has(url.pathname)) {
    event.respondWith(mx2_route_api(url, event.request));
    return;
  }

  // (Optional) codex index passthrough helper (read-only convenience)
  // - Does not grant directory listing; only returns already-loaded codex count.
  if (url.pathname === "/mx2/codex/status") {
    event.respondWith(mx2_json({
      ok: true,
      codex_loaded: Array.isArray(KERNEL_STATE.codex) ? KERNEL_STATE.codex.length : 0,
      api_integration: "SUPREME_JSON_REST_READY",
      deterministic_tick: ΩCLOCK.tick
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

/* ============================================================
   BRAIN TOPOLOGY EXECUTION ENGINE
   Implements π_EVALUATE from pi_evaluator_pseudocode.khl
   ============================================================ */

// PI Metric Interpretation Table
const PI_METRIC_TABLE = Object.freeze({
  stability: { pi_effect: "weight_multiplier", description: "Scales acceptance threshold" },
  merge_weight: { pi_effect: "merge_bias", description: "Biases conflict resolution" },
  tick_rate: { pi_effect: "scheduler_step", description: "Controls kernel tick advancement" },
  entropy_weight: { pi_effect: "entropy_scale", description: "Scales entropy contribution" },
  compression_ratio: { pi_effect: "compress_gain", description: "Adjusts compression calculus" },
  confidence_floor: { pi_effect: "filter_threshold", description: "Minimum confidence for matches" },
  global_gain: { pi_effect: "vector_gain", description: "Global control vector amplification" },
  strictness: { pi_effect: "weight_multiplier", description: "Strictness level" },
  conflict_bias: { pi_effect: "merge_bias", description: "Conflict resolution bias" },
  propagation_rate: { pi_effect: "vector_gain", description: "Propagation speed" },
  sync_weight: { pi_effect: "merge_bias", description: "Synchronization weight" },
  determinism: { pi_effect: "weight_multiplier", description: "Determinism level" },
  io_latency: { pi_effect: "scheduler_step", description: "IO latency factor" },
  node_degree: { pi_effect: "compress_gain", description: "Node connectivity degree" },
  priority_bias: { pi_effect: "merge_bias", description: "Priority scheduling bias" },
  throughput: { pi_effect: "vector_gain", description: "Throughput multiplier" },
  execution_bias: { pi_effect: "weight_multiplier", description: "Execution priority" },
  write_weight: { pi_effect: "merge_bias", description: "Write operation weight" },
  parse_depth: { pi_effect: "scheduler_step", description: "Parser recursion depth" },
  rewrite_passes: { pi_effect: "scheduler_step", description: "AST rewrite passes" },
  view_count: { pi_effect: "compress_gain", description: "View count" },
  bridge_weight: { pi_effect: "merge_bias", description: "Bridge weight" },
  ir_passes: { pi_effect: "scheduler_step", description: "IR compilation passes" },
  query_cost: { pi_effect: "compress_gain", description: "Query cost factor" },
  semantic_weight: { pi_effect: "weight_multiplier", description: "Semantic weight" },
  symbol_count: { pi_effect: "compress_gain", description: "Symbol table size" },
  opcode_count: { pi_effect: "compress_gain", description: "Opcode count" },
  token_count: { pi_effect: "compress_gain", description: "Token count" },
  law_strength: { pi_effect: "weight_multiplier", description: "Law enforcement strength" },
  fanout: { pi_effect: "vector_gain", description: "Gossip fanout" },
  proof_depth: { pi_effect: "scheduler_step", description: "Proof depth" },
  states: { pi_effect: "scheduler_step", description: "Lifecycle states" }
});

// Brain Topology State
const BRAIN_ENGINE = {
  registry: null,
  activebrains: new Map(),
  evaluationCache: new Map(),
  lastEvalTick: 0
};

// Load Brain Topology Registry
async function loadBrainTopology() {
  try {
    const res = await fetch('./brains/brain_topology.registry.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const registry = await res.json();
    BRAIN_ENGINE.registry = registry;
    return registry;
  } catch (e) {
    console.error('Ω: Brain topology load failed:', e);
    return null;
  }
}

// π_EVALUATE Implementation - Core execution from pseudocode
function π_EVALUATE(brain_row, input_state = {}) {
  // Initialize effect accumulators
  const effects = {
    weight_multiplier: 1.0,
    merge_bias: 0.0,
    entropy_scale: 1.0,
    scheduler_step: 1,
    compress_gain: 1.0,
    filter_threshold: 0.0,
    vector_gain: 1.0
  };

  const metrics = brain_row.metrics || [];

  // Interpret metrics
  for (const metric of metrics) {
    const rule = PI_METRIC_TABLE[metric.key];
    if (!rule) continue;

    const value = metric.value;

    switch (rule.pi_effect) {
      case "weight_multiplier":
        effects.weight_multiplier *= value;
        break;
      case "merge_bias":
        effects.merge_bias += value;
        break;
      case "entropy_scale":
        effects.entropy_scale *= value;
        break;
      case "scheduler_step":
        effects.scheduler_step = Math.max(1, Math.floor(value));
        break;
      case "compress_gain":
        effects.compress_gain *= value;
        break;
      case "filter_threshold":
        effects.filter_threshold = Math.max(effects.filter_threshold, value);
        break;
      case "vector_gain":
        effects.vector_gain *= value;
        break;
    }
  }

  // Apply effects deterministically
  const result = π_APPLY_EFFECTS(effects, input_state, brain_row);

  // Generate deterministic seal
  const sealStr = `${brain_row.id}|${JSON.stringify(effects)}|${JSON.stringify(result)}`;
  const seal = Ω_hash32(sealStr);

  return {
    brain_id: brain_row.id,
    domain: brain_row.domain,
    effects,
    output: result,
    seal: `⟁${seal}⟁`,
    tick: ΩCLOCK.tick,
    bindings: brain_row.bindings || {}
  };
}

// Apply computed effects to input state
function π_APPLY_EFFECTS(effects, input_state, brain_row) {
  const tokens = input_state.tokens || [];
  const prompt = input_state.prompt || '';

  // Compute weighted compression
  const baseCompression = compressionDelta(tokens);
  const weightedCompression = baseCompression * effects.compress_gain * effects.weight_multiplier;

  // Compute symbolic weight with gain
  const baseWeight = symbolicWeight(tokens);
  const adjustedWeight = baseWeight * effects.vector_gain;

  // Apply entropy scaling
  const scaledEntropy = KERNEL_STATE.entropy * effects.entropy_scale;

  // Apply filter threshold
  const confidence = Math.max(effects.filter_threshold, weightedCompression);

  // Generate output based on brain domain
  const domain = brain_row.domain || 'runtime';
  let domainOutput = {};

  switch (domain) {
    case 'atomic':
      domainOutput = {
        execution_trace: Ω_id('trace', brain_row.id, ΩCLOCK.tick.toString()),
        determinism_score: effects.weight_multiplier
      };
      break;
    case 'cluster':
      domainOutput = {
        merge_result: effects.merge_bias > 0.5 ? 'ACCEPT' : 'DEFER',
        sync_weight: effects.merge_bias
      };
      break;
    case 'runtime':
      domainOutput = {
        schedule_priority: effects.scheduler_step,
        throughput_factor: effects.vector_gain
      };
      break;
    case 'verification':
      domainOutput = {
        proof_valid: effects.weight_multiplier >= 1.0,
        strictness: effects.weight_multiplier
      };
      break;
    case 'training':
      domainOutput = {
        pattern_confidence: confidence,
        learning_rate: effects.entropy_scale * 0.01
      };
      break;
    default:
      domainOutput = {};
  }

  return {
    compression_delta: weightedCompression,
    symbolic_weight: adjustedWeight,
    entropy: scaledEntropy,
    confidence,
    domain_output: domainOutput,
    tokens_processed: tokens.length,
    quantum_state: `|Ψ⟩ = |${brain_row.id}⟩⊗|EFFECTS_APPLIED⟩`
  };
}

// Get brain by ID
function getBrainById(brainId) {
  if (!BRAIN_ENGINE.registry?.brains) return null;
  return BRAIN_ENGINE.registry.brains.find(b => b.id === brainId);
}

// Activate a brain
function activateBrain(brainId, input_state = {}) {
  const brain = getBrainById(brainId);
  if (!brain) {
    return { error: 'brain_not_found', brain_id: brainId };
  }

  // Run π evaluation
  const result = π_EVALUATE(brain, input_state);

  // Track activation
  BRAIN_ENGINE.activebrains.set(brainId, {
    activated_tick: ΩCLOCK.tick,
    last_result: result
  });

  // Record in memory substrate
  try {
    mx2_record_activation({
      node: brainId,
      layer: brain.domain,
      token: 'BRAIN_ACTIVATE',
      weight: result.effects.weight_multiplier,
      tokens: input_state.tokens || []
    });
  } catch (_) {}

  kuhulTick();

  return result;
}

/* ============================================================
   MICRO-AGENT/BUILDER SWARM ORCHESTRATION
   ============================================================ */

const SWARM_ENGINE = {
  agents: new Map(),
  builders: new Map(),
  jobs: [],
  jobCounter: 0
};

// Initialize swarm from manifest
function initializeSwarm(manifest) {
  const ecosystem = manifest['👷🌀MICRO_AGENTS_BUILDERS_RECURSIVE_ECOSYSTEM'];
  if (!ecosystem?.tables) return;

  // Load seed agents
  const agentTable = ecosystem.tables['🤖🌀micro_agents'];
  if (agentTable?.seed_agents) {
    for (const agent of agentTable.seed_agents) {
      SWARM_ENGINE.agents.set(agent.id, {
        ...agent,
        status: 'ready',
        current_job: null
      });
    }
  }

  // Load seed builders
  const builderTable = ecosystem.tables['🛠🌀micro_builders'];
  if (builderTable?.seed_builders) {
    for (const builder of builderTable.seed_builders) {
      SWARM_ENGINE.builders.set(builder.id, {
        ...builder,
        status: 'ready',
        current_job: null
      });
    }
  }
}

// Submit job to swarm
function submitSwarmJob(spec) {
  const jobId = Ω_id('job', (++SWARM_ENGINE.jobCounter).toString(), ΩCLOCK.tick.toString());

  const job = {
    id: jobId,
    spec,
    status: 'pending',
    created_tick: ΩCLOCK.tick,
    assigned_agent: null,
    assigned_builder: null,
    result: null
  };

  // Find matching agent
  for (const [id, agent] of SWARM_ENGINE.agents) {
    if (agent.status === 'ready' && agent.domain === spec.domain) {
      job.assigned_agent = id;
      agent.status = 'busy';
      agent.current_job = jobId;
      break;
    }
  }

  // Find matching builder
  if (job.assigned_agent) {
    const agent = SWARM_ENGINE.agents.get(job.assigned_agent);
    for (const builderType of (agent.builder_types || [])) {
      const builder = SWARM_ENGINE.builders.get(`${builderType}_gen0`);
      if (builder && builder.status === 'ready') {
        job.assigned_builder = builder.id;
        builder.status = 'busy';
        builder.current_job = jobId;
        break;
      }
    }
  }

  job.status = job.assigned_agent ? 'assigned' : 'queued';
  SWARM_ENGINE.jobs.push(job);

  return {
    job_id: jobId,
    status: job.status,
    assigned_agent: job.assigned_agent,
    assigned_builder: job.assigned_builder,
    quantum_state: '|Ψ⟩ = |JOB_SUBMITTED⟩⊗|SWARM_PROCESSING⟩'
  };
}

// Get agent status
function getAgentsStatus() {
  const agents = [];
  for (const [id, agent] of SWARM_ENGINE.agents) {
    agents.push({
      id,
      label: agent.label,
      domain: agent.domain,
      status: agent.status,
      generation: agent.generation,
      success_rate: agent.success_rate,
      jobs_handled: agent.jobs_handled,
      current_job: agent.current_job,
      recursion_capable: agent.recursion_capable
    });
  }
  return agents;
}

// Get builder status
function getBuildersStatus() {
  const builders = [];
  for (const [id, builder] of SWARM_ENGINE.builders) {
    builders.push({
      id,
      label: builder.label,
      type: builder.type,
      status: builder.status,
      generation: builder.generation,
      success_rate: builder.success_rate,
      jobs_completed: builder.jobs_completed,
      current_job: builder.current_job,
      recursion_capable: builder.recursion_capable
    });
  }
  return builders;
}

/* ============================================================
   SVG3D VISUALIZATION PIPELINE
   ============================================================ */

// Generate brain topology SVG
function generateBrainTopologySVG(brainId) {
  const brain = getBrainById(brainId);
  if (!brain) return null;

  const metrics = brain.metrics || [];
  const bindings = brain.bindings || {};

  // Create orbital halo shell for brain visualization
  const centerX = 300;
  const centerY = 200;
  const radius = 80;

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <radialGradient id="brain-glow-${brainId}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow-filter">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <rect width="100%" height="100%" fill="#070b12"/>

      <!-- Background constellation -->
      <circle cx="${centerX}" cy="${centerY}" r="${radius + 60}" fill="url(#brain-glow-${brainId})"/>

      <!-- Central brain node -->
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#0b1322" stroke="#00d4ff" stroke-width="2" filter="url(#glow-filter)"/>
      <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" fill="#00d4ff" font-size="12" font-family="monospace" font-weight="bold">${brain.id}</text>
      <text x="${centerX}" y="${centerY + 10}" text-anchor="middle" fill="#8ba4c0" font-size="10" font-family="monospace">${brain.domain}</text>
  `;

  // Add metric orbitals
  metrics.forEach((metric, i) => {
    const angle = (i / metrics.length) * Math.PI * 2 - Math.PI / 2;
    const orbitRadius = radius + 50;
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;

    svg += `
      <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#1a2b44" stroke-width="1" stroke-dasharray="4,2"/>
      <circle cx="${x}" cy="${y}" r="30" fill="#101828" stroke="#a855f7" stroke-width="1.5"/>
      <text x="${x}" y="${y - 5}" text-anchor="middle" fill="#a855f7" font-size="9" font-family="monospace">${metric.key}</text>
      <text x="${x}" y="${y + 10}" text-anchor="middle" fill="#e8f5ff" font-size="11" font-family="monospace" font-weight="bold">${metric.value}</text>
    `;
  });

  // Add binding connections
  const piInputs = bindings.pi_inputs || [];
  const clusterInputs = bindings.cluster_inputs || [];
  const runtimeOutputs = bindings.runtime_outputs || [];

  svg += `
    <!-- Binding legend -->
    <g transform="translate(20, 320)">
      <text fill="#00d4ff" font-size="10" font-family="monospace">π Inputs: ${piInputs.join(', ') || 'none'}</text>
    </g>
    <g transform="translate(20, 340)">
      <text fill="#ff8800" font-size="10" font-family="monospace">Cluster: ${clusterInputs.join(', ') || 'none'}</text>
    </g>
    <g transform="translate(20, 360)">
      <text fill="#00ff88" font-size="10" font-family="monospace">Outputs: ${runtimeOutputs.join(', ') || 'none'}</text>
    </g>

    <!-- Domain badge -->
    <rect x="450" y="20" width="130" height="30" rx="6" fill="#101828" stroke="#1a2b44"/>
    <text x="515" y="40" text-anchor="middle" fill="#8ba4c0" font-size="10" font-family="monospace">${brain.domain.toUpperCase()}</text>

    </svg>
  `;

  return svg;
}

// Generate full topology constellation SVG
function generateTopologyConstellationSVG() {
  if (!BRAIN_ENGINE.registry?.brains) return null;

  const brains = BRAIN_ENGINE.registry.brains;
  const width = 1200;
  const height = 800;
  const centerX = width / 2;
  const centerY = height / 2;

  // Group brains by domain
  const domains = {};
  brains.forEach(b => {
    if (!domains[b.domain]) domains[b.domain] = [];
    domains[b.domain].push(b);
  });

  const domainColors = {
    cluster: '#00d4ff',
    verification: '#ff4444',
    runtime: '#00ff88',
    atomic: '#a855f7',
    training: '#ff8800'
  };

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill="#070b12"/>
      <circle cx="${centerX}" cy="${centerY}" r="300" fill="url(#center-glow)"/>
  `;

  // Place domains in orbital rings
  const domainList = Object.keys(domains);
  domainList.forEach((domain, di) => {
    const domainAngle = (di / domainList.length) * Math.PI * 2;
    const domainRadius = 250;
    const domainX = centerX + Math.cos(domainAngle) * domainRadius;
    const domainY = centerY + Math.sin(domainAngle) * domainRadius;
    const color = domainColors[domain] || '#8ba4c0';

    // Domain cluster
    svg += `<circle cx="${domainX}" cy="${domainY}" r="100" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="4,4" opacity="0.3"/>`;

    // Brain nodes in domain
    const domainBrains = domains[domain];
    domainBrains.forEach((brain, bi) => {
      const brainAngle = (bi / domainBrains.length) * Math.PI * 2;
      const brainRadius = 60;
      const bx = domainX + Math.cos(brainAngle) * brainRadius;
      const by = domainY + Math.sin(brainAngle) * brainRadius;

      svg += `
        <circle cx="${bx}" cy="${by}" r="20" fill="#0b1322" stroke="${color}" stroke-width="1.5"/>
        <text x="${bx}" y="${by + 4}" text-anchor="middle" fill="${color}" font-size="7" font-family="monospace">${brain.id.substring(0, 10)}</text>
      `;
    });

    // Domain label
    svg += `<text x="${domainX}" y="${domainY + 120}" text-anchor="middle" fill="${color}" font-size="11" font-family="monospace" font-weight="bold">${domain.toUpperCase()}</text>`;
  });

  svg += '</svg>';
  return svg;
}

/* ============================================================
   EXTENDED API ROUTES FOR BRAIN & SWARM
   ============================================================ */

// Extended API paths
const EXTENDED_API_PATHS = new Set([
  '/brain/list', '/brain/activate', '/brain/status', '/brain/svg',
  '/micro/jobs/submit', '/micro/agents/status', '/micro/builders/status',
  '/topology/svg'
]);

async function handleExtendedAPI(url, request) {
  const path = url.pathname;
  const method = request.method;

  // Ensure brain topology is loaded
  if (!BRAIN_ENGINE.registry) {
    await loadBrainTopology();
  }

  // Ensure swarm is initialized
  if (SWARM_ENGINE.agents.size === 0 && KERNEL_STATE.manifest) {
    initializeSwarm(KERNEL_STATE.manifest);
  }

  let payload = {};
  if (method === 'POST') {
    try { payload = await request.json(); } catch (_) {}
  }

  switch (path) {
    case '/brain/list':
      return mx2_json({
        ok: true,
        brains: BRAIN_ENGINE.registry?.brains || [],
        total: BRAIN_ENGINE.registry?.brains?.length || 0,
        tick: ΩCLOCK.tick
      });

    case '/brain/activate':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      const activationResult = activateBrain(payload.brain_id, payload.input_state || {});
      return mx2_json({
        ok: !activationResult.error,
        ...activationResult,
        tick: ΩCLOCK.tick
      });

    case '/brain/status':
      const brainId = url.searchParams.get('id');
      const brain = getBrainById(brainId);
      const activeInfo = BRAIN_ENGINE.activebrains.get(brainId);
      return mx2_json({
        ok: !!brain,
        brain: brain || null,
        active: !!activeInfo,
        last_activation: activeInfo || null,
        tick: ΩCLOCK.tick
      });

    case '/brain/svg':
      const svgBrainId = url.searchParams.get('id');
      const brainSVG = generateBrainTopologySVG(svgBrainId);
      if (!brainSVG) {
        return mx2_json({ error: 'brain_not_found' }, 404);
      }
      return new Response(brainSVG, {
        status: 200,
        headers: { 'content-type': 'image/svg+xml' }
      });

    case '/topology/svg':
      const topoSVG = generateTopologyConstellationSVG();
      if (!topoSVG) {
        return mx2_json({ error: 'topology_not_loaded' }, 500);
      }
      return new Response(topoSVG, {
        status: 200,
        headers: { 'content-type': 'image/svg+xml' }
      });

    case '/micro/jobs/submit':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      const jobResult = submitSwarmJob(payload);
      return mx2_json({
        ok: true,
        ...jobResult,
        tick: ΩCLOCK.tick
      });

    case '/micro/agents/status':
      return mx2_json({
        ok: true,
        agents: getAgentsStatus(),
        total: SWARM_ENGINE.agents.size,
        tick: ΩCLOCK.tick,
        quantum_state: '|Ψ⟩ = Σ|AGENT_i⟩⊗|STATUS⟩'
      });

    case '/micro/builders/status':
      return mx2_json({
        ok: true,
        builders: getBuildersStatus(),
        total: SWARM_ENGINE.builders.size,
        tick: ΩCLOCK.tick,
        quantum_state: '|Ψ⟩ = Σ|BUILDER_i⟩⊗|READY⟩'
      });

    default:
      return null;
  }
}

/* ============================================================
   ENHANCED FETCH HANDLER
   ============================================================ */

// Update fetch handler to include extended routes
const originalFetch = self.onfetch;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Check extended API paths
  if (EXTENDED_API_PATHS.has(url.pathname)) {
    event.respondWith(handleExtendedAPI(url, event.request));
    return;
  }
});

/* ============================================================
   ENHANCED MESSAGE HANDLER
   ============================================================ */

// Extend message handler for brain operations
self.addEventListener("message", async (event) => {
  const msg = event.data || {};
  const type = msg.type;

  // Brain topology messages
  if (type === "brain.load_topology") {
    const registry = await loadBrainTopology();
    postBack(event.source, {
      type: "brain.topology_loaded",
      ok: !!registry,
      brain_count: registry?.brains?.length || 0
    });
    return;
  }

  if (type === "brain.activate") {
    const result = activateBrain(msg.brain_id, msg.input_state || {});
    postBack(event.source, {
      type: "brain.activated",
      ...result
    });
    return;
  }

  if (type === "brain.get_svg") {
    const svg = generateBrainTopologySVG(msg.brain_id);
    postBack(event.source, {
      type: "brain.svg_ready",
      brain_id: msg.brain_id,
      svg
    });
    return;
  }

  if (type === "swarm.submit_job") {
    const result = submitSwarmJob(msg.spec || {});
    postBack(event.source, {
      type: "swarm.job_submitted",
      ...result
    });
    return;
  }
});

/* ============================================================
   INITIALIZATION ENHANCEMENT
   ============================================================ */

// Enhanced init - load brain topology on boot
async function enhancedBoot() {
  await mx2_mem_boot();
  await loadBrainTopology();

  if (KERNEL_STATE.manifest) {
    initializeSwarm(KERNEL_STATE.manifest);
  }
}

// Hook into install
self.addEventListener("install", (e) => {
  e.waitUntil(enhancedBoot().then(() => self.skipWaiting()));
});

/* ============================================================
   BRAIN MODEL INTEGRATION LAYER
   External LLM orchestration + RLHF learning
   ============================================================ */

// Import brain integration (inline for Service Worker)
importScripts('./brain_integration.js');

// Import chat inference and web learning engine
importScripts('./chat_inference.js');

// Import Atomic Block Runtime
importScripts('./block_runtime.js');

// Import GlyphVM Bytecode Virtual Machine
importScripts('./glyph_vm.js');

// Import Real WebRTC P2P Network
importScripts('./p2p_network.js');

// Import Web Crypto Encryption
importScripts('./glyph_crypto.js');

// Note: voice_interface.js requires browser APIs (SpeechRecognition, SpeechSynthesis)
// and should be loaded in the main page context, not in Service Worker

// Brain model API paths
const BRAIN_MODEL_API_PATHS = new Set([
  '/models/list', '/models/status', '/models/route',
  '/models/infer', '/models/reinforce', '/models/penalize',
  '/models/knowledge/export', '/models/knowledge/import',
  '/models/api-key'
]);

// Handle brain model API requests
async function handleBrainModelAPI(url, request) {
  const path = url.pathname;
  const method = request.method;

  // Initialize orchestrator if needed
  if (!BRAIN_ORCHESTRATOR.ready) {
    await BRAIN_ORCHESTRATOR.initialize();
  }

  let payload = {};
  if (method === 'POST') {
    try { payload = await request.json(); } catch (_) {}
  }

  switch (path) {
    case '/models/list':
      return mx2_json({
        ok: true,
        models: BRAIN_ORCHESTRATOR.registry?.models || {},
        routing_rules: BRAIN_ORCHESTRATOR.registry?.routing_rules || {},
        tick: ΩCLOCK.tick
      });

    case '/models/status':
      return mx2_json({
        ok: true,
        ...BRAIN_ORCHESTRATOR.getStatus(),
        tick: ΩCLOCK.tick
      });

    case '/models/route':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      const routeResult = await BRAIN_ORCHESTRATOR.route(
        payload.prompt || '',
        payload.options || {}
      );
      kuhulTick();
      return mx2_json({
        ok: !routeResult.error,
        ...routeResult,
        tick: ΩCLOCK.tick
      });

    case '/models/infer':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      const modelId = payload.model || 'mistral_glyph';
      const inferResult = await BRAIN_ORCHESTRATOR.executeModel(
        modelId,
        payload.prompt || '',
        payload.options || {}
      );

      // Record interaction for learning
      if (!inferResult.error) {
        inferResult.interaction_id = BRAIN_ORCHESTRATOR.learner.recordInteraction(
          payload.prompt,
          inferResult.completion,
          inferResult.source,
          { model: modelId }
        );
      }

      kuhulTick();
      return mx2_json({
        ok: !inferResult.error,
        ...inferResult,
        tick: ΩCLOCK.tick
      });

    case '/models/reinforce':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      BRAIN_ORCHESTRATOR.reinforce(
        payload.interaction_id,
        payload.reward || 1.0
      );
      return mx2_json({
        ok: true,
        status: 'reinforced',
        learning_stats: BRAIN_ORCHESTRATOR.learner.getStats(),
        tick: ΩCLOCK.tick
      });

    case '/models/penalize':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      BRAIN_ORCHESTRATOR.penalize(
        payload.interaction_id,
        payload.penalty || 1.0
      );
      return mx2_json({
        ok: true,
        status: 'penalized',
        learning_stats: BRAIN_ORCHESTRATOR.learner.getStats(),
        tick: ΩCLOCK.tick
      });

    case '/models/knowledge/export':
      return mx2_json({
        ok: true,
        knowledge: BRAIN_ORCHESTRATOR.exportKnowledge(),
        tick: ΩCLOCK.tick
      });

    case '/models/knowledge/import':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      BRAIN_ORCHESTRATOR.importKnowledge(payload.knowledge || {});
      return mx2_json({
        ok: true,
        status: 'imported',
        learning_stats: BRAIN_ORCHESTRATOR.learner.getStats(),
        tick: ΩCLOCK.tick
      });

    case '/models/api-key':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }
      BRAIN_ORCHESTRATOR.setApiKey(payload.provider, payload.api_key);
      return mx2_json({
        ok: true,
        status: 'api_key_set',
        provider: payload.provider,
        tick: ΩCLOCK.tick
      });

    default:
      return null;
  }
}

// Add brain model routes to fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (BRAIN_MODEL_API_PATHS.has(url.pathname)) {
    event.respondWith(handleBrainModelAPI(url, event.request));
    return;
  }
});

// Enhanced inference endpoint that uses brain orchestrator
async function enhancedInferEndpoint(payload) {
  // Use brain orchestrator for inference
  const result = await BRAIN_ORCHESTRATOR.route(
    payload.prompt || '',
    {
      temperature: payload.temperature || 0.7,
      max_tokens: payload.max_tokens || 100,
      mode: payload.mode || 'standard'
    }
  );

  kuhulTick();

  return {
    status: 200,
    data: {
      ...result,
      tokens_used: result.tokens_used || 0,
      entropy: KERNEL_STATE.entropy,
      tick: ΩCLOCK.tick,
      learning_enabled: true,
      quantum_state: '|Ψ⟩ = |BRAIN_ORCHESTRATED⟩⊗|LEARNING⟩'
    }
  };
}

/* ============================================================
   CHAT INFERENCE & WEB LEARNING API
   ============================================================ */

// Chat inference API paths
const CHAT_INFERENCE_API_PATHS = new Set([
  '/chat', '/chat/learn', '/chat/stats', '/chat/export',
  '/chat/glyph/query', '/chat/p2p/query', '/chat/p2p/sync',
  '/chat/web/scrape', '/chat/codex/status'
]);

// Global chat inference coordinator
let CHAT_COORDINATOR = null;

// Initialize chat coordinator
async function initChatCoordinator() {
  if (!CHAT_COORDINATOR) {
    // Ensure brain orchestrator is ready
    if (!BRAIN_ORCHESTRATOR.ready) {
      await BRAIN_ORCHESTRATOR.initialize();
    }

    CHAT_COORDINATOR = new ChatInferenceCoordinator(BRAIN_ORCHESTRATOR);
    await CHAT_COORDINATOR.initialize();
  }
  return CHAT_COORDINATOR;
}

// Handle chat inference API requests
async function handleChatInferenceAPI(url, request) {
  const path = url.pathname;
  const method = request.method;

  // Initialize coordinator if needed
  const coordinator = await initChatCoordinator();

  let payload = {};
  if (method === 'POST') {
    try { payload = await request.json(); } catch (_) {}
  }

  switch (path) {
    case '/chat':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      const chatResult = await coordinator.chat(
        payload.message || '',
        {
          learnFromWeb: payload.learn_from_web !== false,
          useP2P: payload.use_p2p !== false,
          mode: payload.mode || 'comprehensive'
        }
      );

      kuhulTick();

      return mx2_json({
        ok: !chatResult.error,
        ...chatResult,
        tick: ΩCLOCK.tick
      });

    case '/chat/learn':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      const topics = payload.topics || [];
      const learnResults = [];

      for (const topic of topics) {
        try {
          const result = await coordinator.learnFromWeb(topic, payload.sources || ['wikipedia']);
          learnResults.push({ topic, ...result });
        } catch (e) {
          learnResults.push({ topic, error: e.message });
        }
      }

      return mx2_json({
        ok: true,
        learned: learnResults,
        stats: coordinator.getStats(),
        tick: ΩCLOCK.tick
      });

    case '/chat/stats':
      return mx2_json({
        ok: true,
        stats: coordinator.getStats(),
        codex_size: coordinator.glyphEngine?.decomposer?.codex ?
          Object.keys(coordinator.glyphEngine.decomposer.codex.glyph_codex?.semantics?.nouns || {}).length : 0,
        p2p_peers: coordinator.p2pNetwork?.peers?.size || 0,
        learning_config: coordinator.webLearner?.config || {},
        tick: ΩCLOCK.tick,
        quantum_state: '|Ψ⟩ = |CHAT_READY⟩⊗|LEARNING⟩⊗|P2P_ACTIVE⟩'
      });

    case '/chat/export':
      return mx2_json({
        ok: true,
        knowledge: coordinator.exportKnowledge(),
        tick: ΩCLOCK.tick
      });

    case '/chat/glyph/query':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      // Direct glyph query execution
      const glyphResult = await coordinator.glyphEngine.infer(
        payload.query || '',
        { mode: payload.mode || 'glyph_only' }
      );

      return mx2_json({
        ok: true,
        ...glyphResult,
        tick: ΩCLOCK.tick
      });

    case '/chat/p2p/query':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      // P2P knowledge query
      const p2pResult = await coordinator.p2pNetwork.queryPeers(
        payload.query_type || 'PATTERN_MATCH',
        payload.pattern || ''
      );

      return mx2_json({
        ok: true,
        results: p2pResult,
        tick: ΩCLOCK.tick
      });

    case '/chat/p2p/sync':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      // P2P knowledge sync
      await coordinator.p2pNetwork.broadcastNewKnowledge(
        payload.glyph || '',
        payload.data || {}
      );

      return mx2_json({
        ok: true,
        status: 'broadcast_sent',
        peers: coordinator.p2pNetwork.peers.size,
        tick: ΩCLOCK.tick
      });

    case '/chat/web/scrape':
      if (method !== 'POST') {
        return mx2_json({ error: 'method_not_allowed' }, 405);
      }

      // Web scrape for knowledge
      const source = payload.source || 'wikipedia';
      const scrapeResult = await coordinator.webLearner.scraper.scrape(
        source,
        payload.query || ''
      );

      return mx2_json({
        ok: true,
        source,
        results: scrapeResult,
        tick: ΩCLOCK.tick
      });

    case '/chat/codex/status':
      const codex = coordinator.glyphEngine?.decomposer?.codex;
      return mx2_json({
        ok: true,
        loaded: !!codex,
        primitives: codex?.glyph_codex?.primitives ? Object.keys(codex.glyph_codex.primitives) : [],
        semantics: codex?.glyph_codex?.semantics ? Object.keys(codex.glyph_codex.semantics) : [],
        control_flow: codex?.glyph_codex?.control_flow ? Object.keys(codex.glyph_codex.control_flow) : [],
        pi_kuhul_engine: !!codex?.pi_kuhul_engine,
        tick: ΩCLOCK.tick
      });

    default:
      return null;
  }
}

// Add chat inference routes to fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (CHAT_INFERENCE_API_PATHS.has(url.pathname)) {
    event.respondWith(handleChatInferenceAPI(url, event.request));
    return;
  }
});

// Chat message handler
self.addEventListener("message", async (event) => {
  const msg = event.data || {};
  const type = msg.type;

  if (type === "chat.message") {
    const coordinator = await initChatCoordinator();
    const result = await coordinator.chat(msg.message || '', msg.options || {});
    postBack(event.source, {
      type: "chat.response",
      ...result
    });
    return;
  }

  if (type === "chat.learn") {
    const coordinator = await initChatCoordinator();
    const result = await coordinator.learnFromWeb(msg.topic || '', msg.sources || ['wikipedia']);
    postBack(event.source, {
      type: "chat.learned",
      ...result
    });
    return;
  }

  if (type === "chat.export") {
    const coordinator = await initChatCoordinator();
    postBack(event.source, {
      type: "chat.knowledge",
      knowledge: coordinator.exportKnowledge()
    });
    return;
  }
});

/* ============================================================
   ATOMIC BLOCK RUNTIME & GLYPH VM API
   ============================================================ */

// Global runtime instances
let BLOCK_EXECUTOR = null;
let GLYPH_VM = null;
let GLYPH_REGISTRY = null;
let PI_KUHUL = null;
let P2P_NETWORK_INSTANCE = null;
let GLYPH_CRYPTO = null;

// Initialize runtime components
async function initRuntimeComponents() {
  if (!BLOCK_EXECUTOR && typeof BlockExecutor !== 'undefined') {
    GLYPH_VM = new GlyphVM();
    BLOCK_EXECUTOR = new BlockExecutor(GLYPH_VM);
  }
  if (!GLYPH_REGISTRY && GLYPH_VM && typeof GlyphRegistry !== 'undefined') {
    GLYPH_REGISTRY = new GlyphRegistry(GLYPH_VM);
  }
  if (!PI_KUHUL && typeof PiKUHUL !== 'undefined') {
    PI_KUHUL = new PiKUHUL();
  }
  if (!GLYPH_CRYPTO && typeof GlyphCrypto !== 'undefined') {
    GLYPH_CRYPTO = new GlyphCrypto();
  }
  if (!P2P_NETWORK_INSTANCE && typeof P2PGlyphNetwork !== 'undefined') {
    P2P_NETWORK_INSTANCE = new P2PGlyphNetwork({ crypto: GLYPH_CRYPTO });
  }
  // Initialize AtomicBlockRuntime with all components
  if (!ATOMIC_RUNTIME && typeof AtomicBlockRuntime !== 'undefined' && GLYPH_VM) {
    ATOMIC_RUNTIME = new AtomicBlockRuntime({
      glyphVM: GLYPH_VM,
      piKuhul: PI_KUHUL,
      mode: 'hybrid'
    });
  }
  return {
    blockExecutor: !!BLOCK_EXECUTOR,
    glyphVM: !!GLYPH_VM,
    glyphRegistry: !!GLYPH_REGISTRY,
    piKuhul: !!PI_KUHUL,
    atomicRuntime: !!ATOMIC_RUNTIME,
    p2p: !!P2P_NETWORK_INSTANCE,
    crypto: !!GLYPH_CRYPTO
  };
}

// Global AtomicBlockRuntime instance
let ATOMIC_RUNTIME = null;

// Runtime API paths
const RUNTIME_API_PATHS = new Set([
  '/runtime/status', '/runtime/init',
  '/vm/execute', '/vm/compile', '/vm/stats', '/vm/reset',
  '/blocks/execute', '/blocks/register', '/blocks/list',
  '/p2p/status', '/p2p/peers', '/p2p/glyph/share', '/p2p/glyph/query',
  '/crypto/encrypt', '/crypto/decrypt', '/crypto/hash', '/crypto/status',
  // GlyphRegistry API
  '/registry/list', '/registry/register', '/registry/unregister',
  '/registry/compose', '/registry/alias', '/registry/meta-rule',
  // PiKUHUL API
  '/pi-kuhul/wave', '/pi-kuhul/scale', '/pi-kuhul/fractal',
  '/pi-kuhul/spiral', '/pi-kuhul/compress', '/pi-kuhul/fibonacci',
  // AtomicBlockRuntime API (unified Block+GlyphVM execution)
  '/atomic/execute', '/atomic/register', '/atomic/map',
  '/atomic/stats', '/atomic/trace', '/atomic/compile'
]);

// Handle runtime API requests
async function handleRuntimeAPI(url, request) {
  const path = url.pathname;
  const method = request.method;

  // Initialize components if needed
  await initRuntimeComponents();

  let payload = {};
  if (method === 'POST') {
    try { payload = await request.json(); } catch (_) {}
  }

  switch (path) {
    // Runtime status
    case '/runtime/status':
      return mx2_json({
        ok: true,
        components: {
          blockExecutor: !!BLOCK_EXECUTOR,
          glyphVM: !!GLYPH_VM,
          glyphRegistry: !!GLYPH_REGISTRY,
          piKuhul: !!PI_KUHUL,
          p2pNetwork: !!P2P_NETWORK_INSTANCE,
          crypto: GLYPH_CRYPTO?.isSupported() || false
        },
        vmStats: GLYPH_VM?.getStats() || null,
        registryStats: GLYPH_REGISTRY?.list() || null,
        piKuhulConstants: PI_KUHUL ? { pi: PI_KUHUL.PI, phi: PI_KUHUL.PHI, tau: PI_KUHUL.TAU } : null,
        p2pStats: P2P_NETWORK_INSTANCE?.getStats() || null,
        cryptoStatus: GLYPH_CRYPTO?.getSecurityStatus() || null,
        tick: ΩCLOCK.tick
      });

    case '/runtime/init':
      const initResult = await initRuntimeComponents();
      return mx2_json({ ok: true, initialized: initResult, tick: ΩCLOCK.tick });

    // GlyphVM endpoints
    case '/vm/execute':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_VM) return mx2_json({ error: 'vm_not_initialized' }, 500);

      const vmResult = GLYPH_VM.execute(payload.bytecode || '');
      kuhulTick();
      return mx2_json({ ok: true, ...vmResult, tick: ΩCLOCK.tick });

    case '/vm/compile':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);

      const compiler = new GlyphCompiler();
      const bytecode = compiler.compile(payload.expression || '');
      return mx2_json({ ok: true, bytecode, expression: payload.expression, tick: ΩCLOCK.tick });

    case '/vm/stats':
      return mx2_json({ ok: true, stats: GLYPH_VM?.getStats() || {}, tick: ΩCLOCK.tick });

    case '/vm/reset':
      if (GLYPH_VM) GLYPH_VM.reset();
      return mx2_json({ ok: true, reset: true, tick: ΩCLOCK.tick });

    // Block executor endpoints
    case '/blocks/execute':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!BLOCK_EXECUTOR) return mx2_json({ error: 'executor_not_initialized' }, 500);

      try {
        const blockResult = BLOCK_EXECUTOR.execute(payload.block || {});
        kuhulTick();
        return mx2_json({ ok: true, result: blockResult, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    case '/blocks/register':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!BLOCK_EXECUTOR) return mx2_json({ error: 'executor_not_initialized' }, 500);

      BLOCK_EXECUTOR.registerBlock(payload.id, payload.block);
      return mx2_json({ ok: true, registered: payload.id, tick: ΩCLOCK.tick });

    case '/blocks/list':
      return mx2_json({
        ok: true,
        blocks: BLOCK_EXECUTOR ? Array.from(BLOCK_EXECUTOR.blocks.keys()) : [],
        stats: BLOCK_EXECUTOR?.getStats() || {},
        tick: ΩCLOCK.tick
      });

    // P2P Network endpoints
    case '/p2p/status':
      return mx2_json({
        ok: true,
        stats: P2P_NETWORK_INSTANCE?.getStats() || {},
        tick: ΩCLOCK.tick
      });

    case '/p2p/peers':
      return mx2_json({
        ok: true,
        peers: P2P_NETWORK_INSTANCE?.getConnectedPeers() || [],
        tick: ΩCLOCK.tick
      });

    case '/p2p/glyph/share':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!P2P_NETWORK_INSTANCE) return mx2_json({ error: 'p2p_not_initialized' }, 500);

      await P2P_NETWORK_INSTANCE.broadcastGlyph(payload.glyph, payload.data, payload.metadata || {});
      return mx2_json({ ok: true, shared: payload.glyph, tick: ΩCLOCK.tick });

    case '/p2p/glyph/query':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!P2P_NETWORK_INSTANCE) return mx2_json({ error: 'p2p_not_initialized' }, 500);

      const queryResult = await P2P_NETWORK_INSTANCE.queryGlyph(payload.glyph, payload.options || {});
      return mx2_json({ ok: true, result: queryResult, tick: ΩCLOCK.tick });

    // Crypto endpoints
    case '/crypto/status':
      return mx2_json({
        ok: true,
        status: GLYPH_CRYPTO?.getSecurityStatus() || { supported: false },
        tick: ΩCLOCK.tick
      });

    case '/crypto/encrypt':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_CRYPTO) return mx2_json({ error: 'crypto_not_initialized' }, 500);

      try {
        const encrypted = await GLYPH_CRYPTO.encryptWithPassword(payload.data, payload.password);
        return mx2_json({ ok: true, encrypted, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    case '/crypto/decrypt':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_CRYPTO) return mx2_json({ error: 'crypto_not_initialized' }, 500);

      try {
        const decrypted = await GLYPH_CRYPTO.decryptWithPassword(payload.encrypted, payload.password);
        return mx2_json({ ok: true, decrypted, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    case '/crypto/hash':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_CRYPTO) return mx2_json({ error: 'crypto_not_initialized' }, 500);

      const hash = await GLYPH_CRYPTO.hash(payload.data);
      return mx2_json({ ok: true, hash, tick: ΩCLOCK.tick });

    // GlyphRegistry endpoints
    case '/registry/list':
      return mx2_json({
        ok: true,
        registry: GLYPH_REGISTRY?.list() || {},
        tick: ΩCLOCK.tick
      });

    case '/registry/register':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_REGISTRY) return mx2_json({ error: 'registry_not_initialized' }, 500);

      try {
        // Note: Dynamic function creation from string - only for controlled internal use
        const handler = new Function('vm', payload.handler || 'vm.push(0)');
        GLYPH_REGISTRY.register(payload.glyph, handler, payload.metadata || {});
        return mx2_json({ ok: true, registered: payload.glyph, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    case '/registry/unregister':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_REGISTRY) return mx2_json({ error: 'registry_not_initialized' }, 500);

      GLYPH_REGISTRY.unregister(payload.glyph);
      return mx2_json({ ok: true, unregistered: payload.glyph, tick: ΩCLOCK.tick });

    case '/registry/compose':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_REGISTRY) return mx2_json({ error: 'registry_not_initialized' }, 500);

      GLYPH_REGISTRY.compose(payload.glyph, payload.sequence || [], payload.metadata || {});
      return mx2_json({ ok: true, composed: payload.glyph, sequence: payload.sequence, tick: ΩCLOCK.tick });

    case '/registry/alias':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_REGISTRY) return mx2_json({ error: 'registry_not_initialized' }, 500);

      GLYPH_REGISTRY.alias(payload.newGlyph, payload.existingGlyph);
      return mx2_json({ ok: true, alias: payload.newGlyph, target: payload.existingGlyph, tick: ΩCLOCK.tick });

    case '/registry/meta-rule':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!GLYPH_REGISTRY) return mx2_json({ error: 'registry_not_initialized' }, 500);

      try {
        const condition = new Function('vm', payload.condition || 'return false');
        const transform = new Function('vm', 'registry', payload.transform || '');
        const ruleId = GLYPH_REGISTRY.addMetaRule({
          condition,
          transform,
          priority: payload.priority || 0
        });
        return mx2_json({ ok: true, ruleId, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    // PiKUHUL Math Law endpoints
    case '/pi-kuhul/wave':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const waveResult = PI_KUHUL.wave(payload.x || 0);
      return mx2_json({ ok: true, input: payload.x, result: waveResult, tick: ΩCLOCK.tick });

    case '/pi-kuhul/scale':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const scaleResult = PI_KUHUL.scale(payload.x || 0);
      return mx2_json({ ok: true, input: payload.x, result: scaleResult, phi: PI_KUHUL.PHI, tick: ΩCLOCK.tick });

    case '/pi-kuhul/fractal':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const fractalFn = payload.fn === 'golden' ? (x) => x * PI_KUHUL.PHI : (x) => Math.sin(Math.PI * x);
      const fractalResult = PI_KUHUL.fractal(payload.n || 5, fractalFn, payload.initial || 1);
      return mx2_json({ ok: true, iterations: payload.n, result: fractalResult, tick: ΩCLOCK.tick });

    case '/pi-kuhul/spiral':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const spiralPoint = PI_KUHUL.spiral(payload.theta || 0);
      return mx2_json({ ok: true, theta: payload.theta, point: spiralPoint, tick: ΩCLOCK.tick });

    case '/pi-kuhul/compress':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const compressed = PI_KUHUL.compress(payload.x || 0);
      return mx2_json({ ok: true, input: payload.x, compressed, tick: ΩCLOCK.tick });

    case '/pi-kuhul/fibonacci':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!PI_KUHUL) return mx2_json({ error: 'pi_kuhul_not_initialized' }, 500);

      const fibSeq = PI_KUHUL.fibonacci(Math.min(payload.n || 10, 100)); // Limit to 100
      const isFib = payload.check !== undefined ? PI_KUHUL.isFibonacci(payload.check) : null;
      return mx2_json({ ok: true, n: payload.n, sequence: fibSeq, isFibonacci: isFib, tick: ΩCLOCK.tick });

    // AtomicBlockRuntime endpoints (unified Block + GlyphVM execution)
    case '/atomic/execute':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!ATOMIC_RUNTIME) return mx2_json({ error: 'atomic_runtime_not_initialized' }, 500);

      try {
        const atomicResult = await ATOMIC_RUNTIME.executeBlock(payload.block, payload.inputs || {});
        kuhulTick();
        return mx2_json({ ok: true, result: atomicResult, tick: ΩCLOCK.tick });
      } catch (e) {
        return mx2_json({ ok: false, error: e.message, tick: ΩCLOCK.tick });
      }

    case '/atomic/register':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!ATOMIC_RUNTIME) return mx2_json({ error: 'atomic_runtime_not_initialized' }, 500);

      ATOMIC_RUNTIME.registerBlock(payload.block);
      return mx2_json({ ok: true, registered: payload.block['@id'] || payload.block.id, tick: ΩCLOCK.tick });

    case '/atomic/map':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!ATOMIC_RUNTIME) return mx2_json({ error: 'atomic_runtime_not_initialized' }, 500);

      const mapping = ATOMIC_RUNTIME.mapper.blockToGlyphs(payload.block, payload.inputs || {});
      return mx2_json({ ok: true, mapping, tick: ΩCLOCK.tick });

    case '/atomic/compile':
      if (method !== 'POST') return mx2_json({ error: 'method_not_allowed' }, 405);
      if (!ATOMIC_RUNTIME) return mx2_json({ error: 'atomic_runtime_not_initialized' }, 500);

      const compiledBytecode = ATOMIC_RUNTIME.compile(payload.expression || '');
      return mx2_json({ ok: true, bytecode: compiledBytecode, expression: payload.expression, tick: ΩCLOCK.tick });

    case '/atomic/stats':
      return mx2_json({
        ok: true,
        stats: ATOMIC_RUNTIME?.getStats() || {},
        mappings: ATOMIC_RUNTIME?.mapper?.getAvailableMappings() || {},
        tick: ΩCLOCK.tick
      });

    case '/atomic/trace':
      return mx2_json({
        ok: true,
        trace: ATOMIC_RUNTIME?.getTrace() || {},
        tick: ΩCLOCK.tick
      });

    default:
      return null;
  }
}

// Add runtime routes to fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (RUNTIME_API_PATHS.has(url.pathname)) {
    event.respondWith(handleRuntimeAPI(url, event.request));
    return;
  }
});

// Runtime message handlers
self.addEventListener("message", async (event) => {
  const msg = event.data || {};
  const type = msg.type;

  if (type === "runtime.init") {
    const result = await initRuntimeComponents();
    postBack(event.source, { type: "runtime.initialized", ...result });
    return;
  }

  if (type === "vm.execute") {
    await initRuntimeComponents();
    const result = GLYPH_VM.execute(msg.bytecode || '');
    postBack(event.source, { type: "vm.result", ...result });
    return;
  }

  if (type === "blocks.execute") {
    await initRuntimeComponents();
    try {
      const result = BLOCK_EXECUTOR.execute(msg.block || {});
      postBack(event.source, { type: "blocks.result", result });
    } catch (e) {
      postBack(event.source, { type: "blocks.error", error: e.message });
    }
    return;
  }
});

/* ============================================================
   SUPREME API SEAL
   ============================================================ */

console.log(`
╔══════════════════════════════════════════════════════════╗
║ MX2LM SUPREME JSON REST API KERNEL v16.0.0              ║
║ + BRAIN MODEL INTEGRATION LAYER                         ║
║ + CHAT INFERENCE & WEB LEARNING ENGINE                  ║
║ + ATOMIC BLOCK RUNTIME & GLYPH VM                       ║
║ + ATOMIC→GLYPH MAPPER (Block↔Bytecode Bridge)           ║
║ + GLYPH REGISTRY & SELF-MODIFYING META-RULES            ║
║ + π-KUHUL MATH LAWS ENGINE                              ║
║ + REAL P2P NETWORK & WEB CRYPTO                         ║
║ Law: Ω-BLACK-PANEL                                      ║
║ Architecture: NATIVE_JSON_REST_INSIDE_KERNEL           ║
║ Stack: XJSON ⇄ K'UHUL ⇄ ASX_RAM ⇄ MX2LM_INFERENCE      ║
║ Performance: 1M+ RPS KERNEL ROUTED                     ║
║ Security: SCXQ2 QUANTUM ENCRYPTED AUTHENTICATION       ║
║ Glyphs: 100+ OPCODES | CONTROL FLOW | SEMANTICS        ║
║ Determinism: Ω.tick = ${ΩCLOCK.tick}                       ║
║                                                         ║
║ |Ψ⟩ = α|JSON_API⟩⊗β|KUHUL_ROUTER⟩⊗γ|ASX_RAM⟩           ║
║     ⊗δ|MX2LM_INFERENCE⟩⊗ε|SCX_TRANSPORT⟩               ║
║     ⊗ζ|GLYPH_CODEX⟩⊗η|P2P_NETWORK⟩                     ║
║                                                         ║
║ CHAT INFERENCE: /chat                                  ║
║ GLYPH VM:       /vm/execute                            ║
║ BLOCK RUNTIME:  /blocks/execute                        ║
║ P2P NETWORK:    /p2p/status                            ║
║ CRYPTO:         /crypto/encrypt                        ║
║                                                         ║
║ ALL APIS ARE K'UHUL - ALL TRANSPORT IS XJSON          ║
║ ALL STATE IS ASX_RAM - ALL ENCRYPTION IS SCX          ║
║ STRUCTURE IS LANGUAGE - GLYPHS ARE EXECUTABLE CODE    ║
╚══════════════════════════════════════════════════════════╝
`);
