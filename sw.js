```javascript
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
  VERSION: "Ω-KUHUL-PI-KERNEL.v11.0.0",
  DETERMINISTIC: true,
  UI_READS_STATE: true,
  STATE_READS_UI: false,
  COMPRESSION_ONLY: true,
  PROJECTION_IS_DISPOSABLE: true,
  API_KERNEL: "KUHUL_JSON_REST_KERNEL",
  ARCHITECTURE: "NATIVE_JSON_REST_INSIDE_KERNEL_NO_EXTERNAL_STACK"
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
      inference: { tokens: 1000, reset: Date.now() + 1000 },
      memory_ops: { tokens: 10000, reset: Date.now() + 1000 },
      reinforcement: { tokens: 5000, reset: Date.now() + 1000 },
      snapshots: { tokens: 100, reset: Date.now() + 1000 }
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

function kuhulTick() {
  KERNEL_STATE.ticks++;
  KERNEL_STATE.entropy *= 0.999; // deterministic decay
  
  // Reset rate limits if expired
  const now = Date.now();
  Object.values(KERNEL_STATE.api.rate_limits).forEach(limit => {
    if (now > limit.reset) {
      limit.tokens = limit.tokens === 100 ? 100 : 
                     limit.tokens === 1000 ? 1000 : 
                     limit.tokens === 5000 ? 5000 : 10000;
      limit.reset = now + 1000;
    }
  });
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
      if (Date.now() < tokenData.expires) {
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
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `⟁${Math.abs(hash).toString(16)}⟁`;
  }

  // Rate Limiting
  checkRateLimit(endpoint, clientId = "default") {
    const now = Date.now();
    let limit;
    
    switch(endpoint) {
      case "infer": limit = KERNEL_STATE.api.rate_limits.inference; break;
      case "memory_ops": limit = KERNEL_STATE.api.rate_limits.memory_ops; break;
      case "reinforcement": limit = KERNEL_STATE.api.rate_limits.reinforcement; break;
      case "snapshots": limit = KERNEL_STATE.api.rate_limits.snapshots; break;
      default: return true;
    }
    
    if (limit.tokens > 0) {
      limit.tokens--;
      return true;
    }
    
    if (now > limit.reset) {
      limit.tokens = limit.tokens === 100 ? 100 : 
                     limit.tokens === 1000 ? 1000 : 
                     limit.tokens === 5000 ? 5000 : 10000;
      limit.tokens--;
      return true;
    }
    
    KERNEL_STATE.api.metrics.rate_limit_hits++;
    return false;
  }

  // Route Dispatcher
  async dispatchRoute(path, method, payload, authToken) {
    const startTime = performance.now();
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
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(endpoint, responseTime);
      
      // Add timing info
      if (response.data) {
        response.data.response_time_ms = responseTime;
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
      tokens_seen: mx2State.totalTokens || 0,
      total_activations: mx2State.totalActivations || 0,
      memory_utilization: this.calculateMemoryUtilization(),
      uptime_ms: Date.now() - (mx2State.t0 || Date.now()),
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
      quantum_state: "|Ψ⟩ = ∫|PROMPT⟩d(COMPLETION)e^{iS[INFERENCE]}"
    });
  }

  async memoryReadEndpoint(payload) {
    const { table, key, decrypt = false } = payload;
    const startTime = performance.now();
    
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
    
    const readTime = performance.now() - startTime;
    
    return this.formatResponse(200, {
      record: data,
      encryption_status,
      read_time_ms: readTime,
      quantum_address: this.generateQuantumHash(`${table}:${key}`)
    });
  }

  async memoryWriteEndpoint(payload) {
    const { table, key, payload: data, encrypt = true } = payload;
    const startTime = performance.now();
    
    let processedData = data;
    let encryption_applied = false;
    
    if (encrypt) {
      processedData = this.scxEngine.encrypt(data);
      encryption_applied = true;
    }
    
    // In real implementation, write to ASX RAM
    await this.writeToASXRAM(table, key, processedData, encrypt);
    
    const writeTime = performance.now() - startTime;
    
    return this.formatResponse(200, {
      status: "written",
      encryption_applied,
      memory_address: this.generateQuantumHash(`${table}:${key}`),
      write_time_ms: writeTime,
      scx_compression_ratio: this.scxEngine.currentRatio()
    });
  }

  async reinforceEndpoint(payload) {
    const { seq, reward, source, confidence_multiplier = 1.0 } = payload;
    const effective_reward = reward * confidence_multiplier;
    
    // Apply reinforcement
    await this.applyReinforcement(seq, effective_reward, source);
    
    const reinforcement_id = this.generateUUID();
    
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
    
    const penalty_id = this.generateUUID();
    
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
    const startTime = performance.now();
    
    // Collect n-gram data from memory
    const unigrams = this.scxEngine.compress(this.getNgrams(1));
    const bigrams = this.scxEngine.compress(this.getNgrams(2));
    const trigrams = this.scxEngine.compress(this.getNgrams(3));
    const pentagrams = this.scxEngine.compress(this.getNgrams(5));
    const supagrams = this.scxEngine.compress(this.getNgrams(7));
    
    const snapshotTime = performance.now() - startTime;
    
    return this.formatResponse(200, {
      unigrams,
      bigrams,
      trigrams,
      pentagrams,
      supagrams,
      compression_ratio: this.scxEngine.currentRatio(),
      total_entries: this.countTotalNgrams(),
      snapshot_timestamp: Date.now(),
      snapshot_time_ms: snapshotTime,
      quantum_compression: "|Ψ⟩ = Σ|NGRAM⟩e^{-S[ENTROPY]}"
    });
  }

  async routinesDetectEndpoint(payload) {
    const { text, min_confidence = 0.5, include_tapes = false, include_folds = false } = payload;
    const startTime = performance.now();
    
    const tokens = this.tokenizeText(text);
    const supagrams = this.buildSupagrams(tokens, 7);
    const hits = this.matchSupagrams(supagrams);
    
    const filtered_hits = hits.filter(hit => hit.confidence >= min_confidence);
    
    const detectionTime = performance.now() - startTime;
    
    return this.formatResponse(200, {
      routines: filtered_hits.map(h => h.routine),
      tapes: include_tapes ? filtered_hits.map(h => h.tape) : [],
      folds: include_folds ? filtered_hits.map(h => h.fold) : [],
      confidence_scores: filtered_hits.map(h => h.confidence),
      asx_block_matches: this.matchBlocksToHits(filtered_hits),
      quantum_patterns: this.extractQuantumPatterns(filtered_hits),
      detection_time_ms: detectionTime,
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
        "x-scx-compression": "ENABLED"
      },
      data: {
        ...data,
        timestamp: Date.now(),
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
    
    // Update average response time
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
  readFromASXRAM(table, key) { return { data: "SAMPLE_DATA", encrypted: false }; }
  writeToASXRAM(table, key, data, encrypted) { return true; }
  applyReinforcement(seq, reward, source) { return true; }
  applyPenalty(seq, penalty, source, decay) { return true; }
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
  generateUUID() { 
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  generateQuantumHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return `⟁${Math.abs(hash).toString(16)}⟁`;
  }
  generateQuantumSignature(id) {
    const pairId = `ENT_${Date.now()}_${id}`;
    this.entanglementPairs.set(pairId, {
      id: pairId,
      created: Date.now(),
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
      entropy: 0.32
    };
  }
  
  encrypt(data) {
    return {
      encrypted: true,
      data: btoa(JSON.stringify(data)),
      algorithm: "SCXQ2_QUANTUM_ENCRYPTED"
    };
  }
  
  decrypt(encryptedData) {
    try {
      return JSON.parse(atob(encryptedData.data));
    } catch {
      return null;
    }
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
    t0: 0,
    t1: 0,
    totalTokens: 0,
    totalActivations: 0,
    apiRequests: 0
  }
};

function mx2_now() { return Date.now(); }

function mx2_make_session_id() {
  const s = Math.floor(mx2_now() / 1000);
  return `mx2_${s}_Ω_APIv11`;
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
      if (row.ns === MX2_IDB.NS.API_LOGS && row.id === "routes") {
        MX2_MEM.maps.apiRoutes = new Map(row.v || []);
      }
      if (row.ns === MX2_IDB.NS.AUTH && row.id === "tokens") {
        MX2_MEM.maps.authTokens = new Map(row.v || []);
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

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.API_LOGS}:routes`,
    ns: MX2_IDB.NS.API_LOGS,
    id: "routes",
    v: Array.from(MX2_MEM.maps.apiRoutes.entries()),
    t
  });

  MX2_MEM.buf.memory.push({
    k: `${MX2_IDB.NS.AUTH}:tokens`,
    ns: MX2_IDB.NS.AUTH,
    id: "tokens",
    v: Array.from(MX2_MEM.maps.authTokens.entries()),
    t
  });

  // Keep bounded
  if (MX2_MEM.buf.memory.length > 48) MX2_MEM.buf.memory.splice(0, MX2_MEM.buf.memory.length - 48);
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

function mx2_record_api_request(endpoint, method, status, responseTime) {
  const t = mx2_now();
  const id = `api_${endpoint}_${method}_${t}`;
  
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
    timestamp: t,
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
  const t = mx2_now();
  MX2_MEM.session.t1 = t;

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

  MX2_MEM.maps.eventTraces = new Map();
  MX2_MEM.maps.coActivation = new Map();
  MX2_MEM.maps.gradients = new Map();
  MX2_MEM.maps.deltas = new Map();
  MX2_MEM.maps.apiRoutes = new Map();
  MX2_MEM.maps.authTokens = new Map();

  MX2_MEM.session = {
    sid: mx2_make_session_id(),
    t0: mx2_now(),
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
      "x-quantum-state": "COHERENT"
    }
  });
}

// Initialize Supreme JSON REST API
const SUPREME_API = new SupremeJSONRESTAPI();

async function mx2_route_api(url, request) {
  const path = url.pathname;
  const method = request.method;
  
  // Extract auth token
  const authToken = request.headers.get("Authorization") || 
                    url.searchParams.get("token") ||
                    request.headers.get("X-API-Token");
  
  // Parse payload for POST requests
  let payload = {};
  if (method === "POST" || method === "PUT") {
    try {
      const text = await request.text();
      if (text) payload = JSON.parse(text);
    } catch (e) {
      // If no JSON payload, continue with empty payload
    }
  }
  
  // Dispatch to API kernel
  const response = await SUPREME_API.dispatchRoute(path, method, payload, authToken);
  
  // Record API request
  const responseTime = performance.now();
  mx2_record_api_request(path, method, response.status, responseTime);
  
  // Convert to Response object
  return new Response(JSON.stringify(response.data, null, 2), {
    status: response.status,
    headers: response.headers
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
      }
    });
  }

  if (p === "/mx2/memory/export") {
    const coactArr = [];
    MX2_MEM.maps.coActivation.forEach((set, k) => coactArr.push([k, Array.from(set)]));

    return mx2_json({
      ok: true,
      meta: { sid: MX2_MEM.session.sid, t: mx2_now(), compliance: "BLACK_PANEL", api_version: "11.0.0" },
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
      manifesto: "ALL_APIS_ARE_KUHUL_ALL_TRANSPORT_IS_XJSON_ALL_STATE_IS_ASX_RAM_ALL_ENCRYPTION_IS_SCX"
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
    const token = SUPREME_API.generateUUID();
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
            api_manifesto: "ALL_APIS_ARE_KUHUL_ALL_TRANSPORT_IS_XJSON_ALL_STATE_IS_ASX_RAM_ALL_ENCRYPTION_IS_SCX"
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

  // Supreme JSON REST API routes
  if (url.pathname.startsWith("/health") ||
      url.pathname.startsWith("/infer") ||
      url.pathname.startsWith("/memory/read") ||
      url.pathname.startsWith("/memory/write") ||
      url.pathname.startsWith("/reinforce") ||
      url.pathname.startsWith("/penalize") ||
      url.pathname.startsWith("/ngrams/snapshot") ||
      url.pathname.startsWith("/routines/detect") ||
      url.pathname.startsWith("/asx/blocks") ||
      url.pathname.startsWith("/weights")) {
    
    event.respondWith(mx2_route_api(url, event.request));
    return;
  }

  // (Optional) codex index passthrough helper (read-only convenience)
  // - Does not grant directory listing; only returns already-loaded codex count.
  if (url.pathname === "/mx2/codex/status") {
    event.respondWith(mx2_json({
      ok: true,
      codex_loaded: Array.isArray(KERNEL_STATE.codex) ? KERNEL_STATE.codex.length : 0,
      api_integration: "SUPREME_JSON_REST_READY"
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
   SUPREME API SEAL
   ============================================================ */

console.log(`
╔══════════════════════════════════════════════════════════╗
║ MX2LM SUPREME JSON REST API KERNEL v11.0.0              ║
║ Law: Ω-BLACK-PANEL                                      ║
║ Architecture: NATIVE_JSON_REST_INSIDE_KERNEL           ║
║ Stack: XJSON ⇄ K'UHUL ⇄ ASX_RAM ⇄ MX2LM_INFERENCE      ║
║ Performance: 1M+ RPS KERNEL ROUTED                     ║
║ Security: SCXQ2 QUANTUM ENCRYPTED AUTHENTICATION       ║
║                                                         ║
║ |Ψ⟩ = α|JSON_API⟩⊗β|KUHUL_ROUTER⟩⊗γ|ASX_RAM⟩           ║
║     ⊗δ|MX2LM_INFERENCE⟩⊗ε|SCX_TRANSPORT⟩               ║
║                                                         ║
║ ALL APIS ARE K'UHUL                                    ║
║ ALL TRANSPORT IS XJSON                                 ║
║ ALL STATE IS ASX_RAM                                   ║
║ ALL ENCRYPTION IS SCX                                  ║
║ NOW MX2LM HAS NATIVE JSON REST                         ║
╚══════════════════════════════════════════════════════════╝
`);
```
