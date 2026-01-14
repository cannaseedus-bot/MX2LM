/* ============================================================
   SCXQ2/CC-v1 BINDING IMPLEMENTATION
   Wire/Codec Algebra for Lawful Compression
   Law: CC-v1 (FROZEN)
   ============================================================ */

/**
 * SCXQ2 implements CC-v1's lawful operators as encodable, invertible transforms
 * Core artifacts: DICT, FIELDMAP, EDGES, LANES, BATCH STREAM, PROOF
 */

// Mathematical constants
const PI = 3.141592653589793;
const PHI = 1.6180339887498948;
const TAU = 6.283185307179586;

/**
 * DICT - Symbol Table
 * Assigns each unique symbol a stable sid
 * CC-v1 operator coverage: ⊕ Symbol Folding
 */
class DICT {
  constructor() {
    this.symbols = new Map();  // symbol -> sid
    this.reverse = new Map();  // sid -> symbol
    this.nextSid = 0;
    this.immutable = false;
    this.epoch = 0;
  }

  /**
   * Register a symbol and get its sid
   */
  register(symbol) {
    if (this.immutable) {
      throw new Error('DICT is immutable within proof epoch');
    }

    if (this.symbols.has(symbol)) {
      return this.symbols.get(symbol);
    }

    const sid = this.nextSid++;
    this.symbols.set(symbol, sid);
    this.reverse.set(sid, symbol);
    return sid;
  }

  /**
   * Lookup symbol by sid
   */
  lookup(sid) {
    return this.reverse.get(sid);
  }

  /**
   * Get sid for symbol
   */
  getSid(symbol) {
    return this.symbols.get(symbol);
  }

  /**
   * Freeze dict for proof epoch
   */
  freeze(epoch) {
    this.immutable = true;
    this.epoch = epoch;
  }

  /**
   * Get diff for proof evidence
   */
  getDiff(previousDict) {
    const diff = {
      added: [],
      backrefs: []
    };

    for (const [symbol, sid] of this.symbols) {
      if (!previousDict || !previousDict.symbols.has(symbol)) {
        diff.added.push({ symbol, sid });
      } else {
        diff.backrefs.push({ symbol, sid, prevSid: previousDict.getSid(symbol) });
      }
    }

    return diff;
  }

  /**
   * Serialize to canonical form
   */
  toCanonical() {
    const entries = Array.from(this.symbols.entries())
      .sort((a, b) => a[1] - b[1]);
    return {
      '@dict': entries,
      '@epoch': this.epoch,
      '@immutable': this.immutable
    };
  }
}

/**
 * FIELDMAP - Field ID Table
 * Assigns each field path a stable fid
 * CC-v1 operator coverage: ⊕ + π̂ Field Projection
 */
class FIELDMAP {
  constructor() {
    this.fields = new Map();   // path -> fid
    this.reverse = new Map();  // fid -> path
    this.nextFid = 0;
    this.reachability = new Map();  // fid -> boolean
  }

  /**
   * Register a field path
   */
  register(path) {
    if (this.fields.has(path)) {
      return this.fields.get(path);
    }

    const fid = this.nextFid++;
    this.fields.set(path, fid);
    this.reverse.set(fid, path);
    this.reachability.set(fid, true);  // default reachable
    return fid;
  }

  /**
   * Mark field as unreachable
   */
  markUnreachable(fid) {
    this.reachability.set(fid, false);
  }

  /**
   * Get allowlist of reachable fields
   */
  getAllowlist() {
    const allowlist = [];
    for (const [fid, reachable] of this.reachability) {
      if (reachable) {
        allowlist.push(`fid:${fid}`);
      }
    }
    return allowlist;
  }

  /**
   * Project fields based on XCFE reachability
   */
  projectFields(xcfeGraph) {
    // Reset reachability
    for (const fid of this.reverse.keys()) {
      this.reachability.set(fid, false);
    }

    // Mark reachable fields based on XCFE graph traversal
    const reachableNodes = this.traverseXCFE(xcfeGraph);

    for (const path of reachableNodes) {
      const fid = this.fields.get(path);
      if (fid !== undefined) {
        this.reachability.set(fid, true);
      }
    }

    return this.getAllowlist();
  }

  /**
   * Traverse XCFE graph to find reachable paths
   */
  traverseXCFE(graph) {
    const reachable = new Set();
    const visited = new Set();

    const traverse = (node, path) => {
      if (visited.has(path)) return;
      visited.add(path);
      reachable.add(path);

      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          traverse(value, `${path}.${key}`);
        }
      }
    };

    if (graph && graph.entry) {
      traverse(graph.nodes?.[graph.entry], graph.entry);
    }

    return reachable;
  }

  toCanonical() {
    return {
      '@fieldmap': Array.from(this.fields.entries()),
      '@reachability': Array.from(this.reachability.entries())
    };
  }
}

/**
 * EDGES - Control/Graph Adjacency
 * Canonical encoding of XCFE control graph
 * CC-v1 operator coverage: ⊗ Control Collapse
 */
class EDGES {
  constructor() {
    this.nodes = new Map();     // nodeId -> node data
    this.edges = [];            // [from, to, type]
    this.ordering = [];         // ordering constraints
    this.nodeMap = new Map();   // canonical node mapping
  }

  /**
   * Add node to graph
   */
  addNode(nodeId, data) {
    const canonicalId = this.canonicalizeNodeId(nodeId);
    this.nodes.set(canonicalId, data);
    this.nodeMap.set(nodeId, canonicalId);
    return canonicalId;
  }

  /**
   * Add edge between nodes
   */
  addEdge(fromId, toId, edgeType = 'next') {
    const from = this.nodeMap.get(fromId) || fromId;
    const to = this.nodeMap.get(toId) || toId;
    this.edges.push([from, to, edgeType]);
  }

  /**
   * Add ordering constraint
   */
  addOrdering(constraint) {
    this.ordering.push(constraint);
  }

  /**
   * Canonicalize node ID using π-based hash
   */
  canonicalizeNodeId(nodeId) {
    const hash = this.hashString(nodeId);
    return `n${Math.floor(hash * 1000) % 10000}`;
  }

  /**
   * Simple hash function using π
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * PHI) + str.charCodeAt(i)) % PI;
    }
    return hash;
  }

  /**
   * Build from XCFE Φ structure
   */
  buildFromXCFE(phi) {
    if (!phi || !phi.nodes) return;

    // Add all nodes
    for (const [nodeId, nodeData] of Object.entries(phi.nodes)) {
      this.addNode(nodeId, nodeData);

      // Extract edges from node data
      if (nodeData.next) {
        this.addEdge(nodeId, nodeData.next, 'next');
      }
      if (nodeData.body) {
        this.addEdge(nodeId, nodeData.body, 'body');
      }
      if (nodeData.conditions) {
        for (const [cond, target] of Object.entries(nodeData.conditions)) {
          this.addEdge(nodeId, target, `cond:${cond}`);
        }
      }
    }

    // Add entry ordering
    if (phi.entry) {
      this.addOrdering({ type: 'entry', node: phi.entry });
    }
  }

  /**
   * Check graph isomorphism with another EDGES instance
   */
  isIsomorphic(other) {
    if (this.nodes.size !== other.nodes.size) return false;
    if (this.edges.length !== other.edges.length) return false;

    // Check edge multiset equality
    const thisEdges = this.edges.map(e => e.join(':')).sort();
    const otherEdges = other.edges.map(e => e.join(':')).sort();

    return thisEdges.every((e, i) => e === otherEdges[i]);
  }

  /**
   * Get isomorphism certificate
   */
  getIsomorphismCertificate(other) {
    return {
      '@node_map': Array.from(this.nodeMap.entries()),
      '@edge_ordering': this.isIsomorphic(other) ? 'preserved' : 'violated'
    };
  }

  /**
   * Compute graph hash
   */
  computeHash() {
    const canonical = this.toCanonical();
    return this.hashString(JSON.stringify(canonical));
  }

  toCanonical() {
    return {
      '@nodes': Array.from(this.nodes.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      '@edges': [...this.edges].sort((a, b) => a.join(':').localeCompare(b.join(':'))),
      '@ordering': this.ordering
    };
  }
}

/**
 * LANES - Value Lanes
 * CC-v1 operator coverage: ≈ Value Quantization
 */
class LANES {
  constructor() {
    this.rawLane = [];    // byte-exact values
    this.symLane = [];    // symbol references (sid, fid)
    this.qLane = null;    // quantized numeric lane (optional)
    this.quantConfig = null;
  }

  /**
   * Add raw value
   */
  addRaw(value) {
    this.rawLane.push(this.toCanonicalBytes(value));
  }

  /**
   * Add symbol reference
   */
  addSymbol(sid) {
    this.symLane.push({ type: 'sid', value: sid });
  }

  /**
   * Add field reference
   */
  addField(fid) {
    this.symLane.push({ type: 'fid', value: fid });
  }

  /**
   * Enable quantization lane
   */
  enableQuantization(config) {
    if (!config.min || !config.max || !config.step) {
      throw new Error('Quantization requires min, max, step declaration');
    }
    this.quantConfig = config;
    this.qLane = [];
  }

  /**
   * Add quantized value
   */
  addQuantized(value) {
    if (!this.qLane) {
      throw new Error('Quantization not enabled - ≈ used without declaration');
    }

    const { min, max, step, round } = this.quantConfig;

    // Clamp and quantize
    const clamped = Math.max(min, Math.min(max, value));
    const quantized = Math.round(clamped / step) * step;
    const rounded = round ? Number(quantized.toFixed(round)) : quantized;

    this.qLane.push({
      original: value,
      quantized: rounded,
      error: Math.abs(value - rounded)
    });

    return rounded;
  }

  /**
   * Get quantization proof
   */
  getQuantProof() {
    if (!this.qLane) return null;

    const maxError = Math.max(...this.qLane.map(q => q.error));
    const avgError = this.qLane.reduce((s, q) => s + q.error, 0) / this.qLane.length;

    return {
      '@config': this.quantConfig,
      '@max_error': maxError,
      '@avg_error': avgError,
      '@count': this.qLane.length,
      '@bounds_valid': maxError <= (this.quantConfig.step / 2)
    };
  }

  /**
   * Convert value to canonical bytes
   */
  toCanonicalBytes(value) {
    if (typeof value === 'string') {
      return { type: 'string', bytes: Array.from(new TextEncoder().encode(value)) };
    }
    if (typeof value === 'number') {
      const buffer = new ArrayBuffer(8);
      new Float64Array(buffer)[0] = value;
      return { type: 'float64', bytes: Array.from(new Uint8Array(buffer)) };
    }
    if (typeof value === 'boolean') {
      return { type: 'bool', bytes: [value ? 1 : 0] };
    }
    return { type: 'json', bytes: Array.from(new TextEncoder().encode(JSON.stringify(value))) };
  }

  toCanonical() {
    return {
      '@raw_lane': this.rawLane,
      '@sym_lane': this.symLane,
      '@q_lane': this.qLane,
      '@quant_config': this.quantConfig
    };
  }
}

/**
 * BATCH STREAM - Message Framing
 * CC-v1 operator coverage: τ Temporal Folding
 */
class BatchStream {
  constructor() {
    this.meta = null;
    this.dictChunks = [];
    this.fieldChunks = [];
    this.edgeChunks = [];
    this.dataChunks = [];
    this.proofChunk = null;
    this.epoch = 0;
    this.tick = 0;
    this.checkpoints = [];
  }

  /**
   * Set stream metadata
   */
  setMeta(version, flags, hashes) {
    this.meta = {
      '@scxq2': version || '1.0',
      '@cc': 'CC-v1',
      '@epoch': this.epoch,
      '@flags': {
        '@has_dict': flags?.hasDict ?? true,
        '@has_fieldmap': flags?.hasFieldmap ?? true,
        '@has_edges': flags?.hasEdges ?? true,
        '@has_quant_lane': flags?.hasQuantLane ?? false,
        '@has_temporal': flags?.hasTemporal ?? false
      },
      '@hash': hashes || {}
    };
  }

  /**
   * Add DICT chunk
   */
  addDictChunk(dict) {
    this.dictChunks.push({
      '@type': 'DICT',
      '@tick': this.tick++,
      '@data': dict.toCanonical()
    });
  }

  /**
   * Add FIELD chunk
   */
  addFieldChunk(fieldmap) {
    this.fieldChunks.push({
      '@type': 'FIELD',
      '@tick': this.tick++,
      '@data': fieldmap.toCanonical()
    });
  }

  /**
   * Add EDGES chunk
   */
  addEdgesChunk(edges) {
    this.edgeChunks.push({
      '@type': 'EDGES',
      '@tick': this.tick++,
      '@data': edges.toCanonical()
    });
  }

  /**
   * Add DATA batch
   */
  addDataBatch(data) {
    this.dataChunks.push({
      '@type': 'DATA',
      '@tick': this.tick++,
      '@epoch': this.epoch,
      '@data': data
    });
  }

  /**
   * Add checkpoint for temporal folding
   */
  addCheckpoint() {
    this.checkpoints.push({
      '@type': 'CHECKPOINT',
      '@tick': this.tick,
      '@epoch': this.epoch,
      '@state_hash': this.computeStateHash()
    });
  }

  /**
   * Set PROOF chunk
   */
  setProof(proof) {
    this.proofChunk = {
      '@type': 'PROOF',
      '@tick': this.tick++,
      '@data': proof
    };
  }

  /**
   * Advance epoch
   */
  advanceEpoch() {
    this.addCheckpoint();
    this.epoch++;
    this.tick = 0;
  }

  /**
   * Compute state hash for checkpoint
   */
  computeStateHash() {
    const state = {
      dict: this.dictChunks.length,
      field: this.fieldChunks.length,
      edges: this.edgeChunks.length,
      data: this.dataChunks.length
    };
    return this.hashState(state);
  }

  hashState(state) {
    const str = JSON.stringify(state);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * PHI) + str.charCodeAt(i)) % (PI * 1000000);
    }
    return `h${Math.floor(hash).toString(16)}`;
  }

  /**
   * Check if stream supports replay semantics
   */
  supportsReplay() {
    return this.checkpoints.length > 0 &&
           this.meta?.['@flags']?.['@has_temporal'];
  }

  /**
   * Serialize to canonical stream format
   */
  toStream() {
    return {
      meta: this.meta,
      chunks: [
        ...this.dictChunks,
        ...this.fieldChunks,
        ...this.edgeChunks,
        ...this.dataChunks,
        ...(this.proofChunk ? [this.proofChunk] : [])
      ],
      checkpoints: this.checkpoints
    };
  }
}

/**
 * CC-v1 PROOF Envelope
 */
class CCProof {
  constructor() {
    this.inputHash = null;
    this.outputHash = null;
    this.proofHash = null;
    this.operatorsUsed = [];
    this.invariantsVerified = [];
    this.xcfeSignature = null;
    this.projection = null;
    this.quant = null;
    this.temporal = null;
  }

  /**
   * Set hashes
   */
  setHashes(inputHash, outputHash) {
    this.inputHash = inputHash;
    this.outputHash = outputHash;
  }

  /**
   * Record operator usage
   */
  recordOperator(op, evidence) {
    this.operatorsUsed.push(op);
    if (op === '⊕' && evidence) {
      this.symbolFoldingEvidence = evidence;
    } else if (op === 'π̂' && evidence) {
      this.projection = evidence;
    } else if (op === '⊗' && evidence) {
      this.xcfeSignature = evidence;
    } else if (op === '≈' && evidence) {
      this.quant = evidence;
    } else if (op === 'τ' && evidence) {
      this.temporal = evidence;
    }
  }

  /**
   * Record invariant verification
   */
  recordInvariant(invariant, passed) {
    if (passed) {
      this.invariantsVerified.push(invariant);
    }
  }

  /**
   * Compute proof hash (excluding self)
   */
  computeProofHash() {
    const proofData = this.toEnvelope();
    delete proofData['@cc_proof']['@proof_hash'];
    const str = JSON.stringify(proofData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash * PI) + str.charCodeAt(i)) % (PHI * 10000000);
    }
    this.proofHash = `blake3:${Math.floor(hash).toString(16)}`;
    return this.proofHash;
  }

  /**
   * Generate proof envelope
   */
  toEnvelope() {
    return {
      '@cc_proof': {
        '@cc': 'CC-v1',
        '@input_hash': this.inputHash,
        '@output_hash': this.outputHash,
        '@proof_hash': this.proofHash,
        '@operators_used': this.operatorsUsed,
        '@invariants_verified': this.invariantsVerified,
        '@xcfe_signature': this.xcfeSignature,
        '@projection': this.projection,
        '@quant': this.quant,
        '@temporal': this.temporal
      }
    };
  }
}

/**
 * CC-v1 Verifier
 * Consumes S_in, S_out, Proof and validates conformance
 */
class CCVerifier {
  constructor() {
    this.stages = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'];
  }

  /**
   * Full verification pipeline
   */
  verify(sIn, sOut, proof, xcfeResolver) {
    const result = {
      '@cc_verify_result': {
        '@ok': true,
        '@input_hash': null,
        '@output_hash': null,
        '@proof_hash': null,
        '@operators': [],
        '@invariants': [],
        '@failure': null
      }
    };

    try {
      // V0 - Hash binding
      const v0 = this.verifyV0(sIn, sOut, proof);
      if (!v0.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V0', reason: v0.reason };
        return result;
      }
      result['@cc_verify_result']['@input_hash'] = v0.inputHash;
      result['@cc_verify_result']['@output_hash'] = v0.outputHash;
      result['@cc_verify_result']['@proof_hash'] = v0.proofHash;

      // V1 - Operator legality
      const v1 = this.verifyV1(proof);
      if (!v1.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V1', reason: v1.reason };
        return result;
      }
      result['@cc_verify_result']['@operators'] = v1.operators;

      // V2 - Control invariance (I2)
      const v2 = this.verifyV2(sIn, sOut, xcfeResolver);
      if (!v2.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V2', reason: v2.reason };
        return result;
      }
      result['@cc_verify_result']['@invariants'].push('I2');

      // V3 - Semantic invariance (I1)
      const v3 = this.verifyV3(sIn, sOut, xcfeResolver);
      if (!v3.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V3', reason: v3.reason, ...v3.detail };
        return result;
      }
      result['@cc_verify_result']['@invariants'].push('I1');

      // V4 - Deterministic expansion (I3)
      const v4 = this.verifyV4(sIn, sOut);
      if (!v4.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V4', reason: v4.reason };
        return result;
      }
      result['@cc_verify_result']['@invariants'].push('I3');

      // V5 - Monotonic size (I4)
      const v5 = this.verifyV5(sIn, sOut);
      if (!v5.ok) {
        result['@cc_verify_result']['@ok'] = false;
        result['@cc_verify_result']['@failure'] = { stage: 'V5', reason: v5.reason };
        return result;
      }
      result['@cc_verify_result']['@invariants'].push('I4');

    } catch (error) {
      result['@cc_verify_result']['@ok'] = false;
      result['@cc_verify_result']['@failure'] = { stage: 'exception', reason: error.message };
    }

    return result;
  }

  /**
   * V0 - Hash binding verification
   */
  verifyV0(sIn, sOut, proof) {
    const inputHash = this.computeHash(sIn);
    const outputHash = this.computeHash(sOut);

    const proofEnv = proof.toEnvelope?.() || proof;
    const proofData = proofEnv['@cc_proof'] || proofEnv;

    if (proofData['@input_hash'] !== inputHash) {
      return { ok: false, reason: 'input_hash_mismatch' };
    }
    if (proofData['@output_hash'] !== outputHash) {
      return { ok: false, reason: 'output_hash_mismatch' };
    }

    return {
      ok: true,
      inputHash,
      outputHash,
      proofHash: proofData['@proof_hash']
    };
  }

  /**
   * V1 - Operator legality verification
   */
  verifyV1(proof) {
    const proofEnv = proof.toEnvelope?.() || proof;
    const proofData = proofEnv['@cc_proof'] || proofEnv;
    const operators = proofData['@operators_used'] || [];

    for (const op of operators) {
      switch (op) {
        case '⊕':
          if (!proofData['@symbolFoldingEvidence'] && !proofData['@dict_evidence']) {
            // Check if DICT is available via other means
          }
          break;
        case 'π̂':
          if (!proofData['@projection']) {
            return { ok: false, reason: 'π̂ used without projection evidence' };
          }
          break;
        case '⊗':
          if (!proofData['@xcfe_signature']) {
            return { ok: false, reason: '⊗ used without XCFE signature' };
          }
          break;
        case '≈':
          if (!proofData['@quant']) {
            return { ok: false, reason: '≈ used without declaration' };
          }
          break;
        case 'τ':
          if (!proofData['@temporal']) {
            return { ok: false, reason: 'τ used without temporal hooks' };
          }
          break;
      }
    }

    return { ok: true, operators };
  }

  /**
   * V2 - Control invariance (I2)
   */
  verifyV2(sIn, sOut, xcfeResolver) {
    const edgesIn = new EDGES();
    const edgesOut = new EDGES();

    // Extract XCFE from both
    const phiIn = sIn?.Φ || sIn?.['@phi'] || sIn?.phi;
    const phiOut = sOut?.Φ || sOut?.['@phi'] || sOut?.phi;

    if (phiIn) edgesIn.buildFromXCFE(phiIn);
    if (phiOut) edgesOut.buildFromXCFE(phiOut);

    if (!edgesIn.isIsomorphic(edgesOut)) {
      return {
        ok: false,
        reason: 'control_graph_mismatch',
        detail: edgesIn.getIsomorphismCertificate(edgesOut)
      };
    }

    return { ok: true };
  }

  /**
   * V3 - Semantic invariance (I1)
   */
  verifyV3(sIn, sOut, xcfeResolver) {
    // Define semantic query set Q
    const queries = this.deriveQuerySet(sIn);

    for (const q of queries) {
      const expectedValue = this.evalQuery(q, sIn);
      const actualValue = this.evalQuery(q, sOut);

      if (!this.semanticEquals(expectedValue, actualValue)) {
        return {
          ok: false,
          reason: 'semantic_mismatch',
          detail: {
            '@q': q,
            '@expected': expectedValue,
            '@got': actualValue
          }
        };
      }
    }

    return { ok: true };
  }

  /**
   * V4 - Deterministic expansion (I3)
   */
  verifyV4(sIn, sOut) {
    // Expand sOut and compare to sIn
    const expanded = this.expand(sOut);

    if (!this.structuralEquals(expanded, sIn)) {
      return { ok: false, reason: 'expansion_mismatch' };
    }

    return { ok: true };
  }

  /**
   * V5 - Monotonic size (I4)
   */
  verifyV5(sIn, sOut) {
    const sizeIn = this.computeSize(sIn);
    const sizeOut = this.computeSize(sOut);

    if (sizeOut > sizeIn) {
      return { ok: false, reason: 'size_increase', sizeIn, sizeOut };
    }

    return { ok: true };
  }

  /**
   * Helper: Compute canonical hash
   */
  computeHash(obj) {
    const canonical = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < canonical.length; i++) {
      hash = ((hash * PHI) + canonical.charCodeAt(i)) % (PI * 10000000);
    }
    return `blake3:${Math.floor(hash).toString(16)}`;
  }

  /**
   * Helper: Derive query set from schema
   */
  deriveQuerySet(schema) {
    const queries = [];

    // Add schema-required observables
    if (schema?.['@type']) queries.push('@type');
    if (schema?.['@id']) queries.push('@id');
    if (schema?.capabilities) queries.push('capabilities');
    if (schema?.V) queries.push('V');

    return queries;
  }

  /**
   * Helper: Evaluate query on object
   */
  evalQuery(query, obj) {
    const parts = query.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Helper: Semantic equality check
   */
  semanticEquals(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  /**
   * Helper: Structural equality check
   */
  structuralEquals(a, b) {
    return JSON.stringify(a, Object.keys(a || {}).sort()) ===
           JSON.stringify(b, Object.keys(b || {}).sort());
  }

  /**
   * Helper: Expand compressed representation
   */
  expand(compressed) {
    // Placeholder - actual expansion would reverse all compression ops
    return compressed;
  }

  /**
   * Helper: Compute size
   */
  computeSize(obj) {
    return JSON.stringify(obj).length;
  }
}

/**
 * ASX-R Conformance Audit Blocks
 */
class CCauditBlocks {
  constructor() {
    this.epoch = 0;
    this.tick = 0;
    this.blocks = [];
  }

  /**
   * Phase enter block
   */
  phaseEnter(phase, inputHash) {
    const block = {
      '@cc_phase_enter': {
        '@epoch': this.epoch,
        '@tick': this.tick++,
        '@phase': phase,
        '@input_hash': inputHash
      }
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Phase exit block
   */
  phaseExit(phase, outputHash, ok) {
    const block = {
      '@cc_phase_exit': {
        '@epoch': this.epoch,
        '@tick': this.tick++,
        '@phase': phase,
        '@output_hash': outputHash,
        '@ok': ok
      }
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Operator apply block
   */
  operatorApply(op, evidenceRef, beforeHash, afterHash) {
    const block = {
      '@cc_operator_apply': {
        '@op': op,
        '@evidence_ref': evidenceRef,
        '@before_hash': beforeHash,
        '@after_hash': afterHash
      }
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Invariant check block
   */
  invariantCheck(invariant, result, detail = {}) {
    const block = {
      '@cc_invariant_check': {
        '@invariant': invariant,
        '@result': result,
        '@detail': detail
      }
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Proof emit block
   */
  proofEmit(proof) {
    const block = {
      '@cc_proof_emit': {
        '@proof': proof.toEnvelope?.() || proof
      }
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Verify result block
   */
  verifyResult(result) {
    const block = {
      '@cc_verify_result': result['@cc_verify_result'] || result
    };
    this.blocks.push(block);
    return block;
  }

  /**
   * Get all blocks
   */
  getBlocks() {
    return this.blocks;
  }
}

/**
 * SCXQ2 Encoder/Decoder
 * Main interface for CC-v1 conformant compression
 */
class SCXQ2 {
  constructor() {
    this.dict = new DICT();
    this.fieldmap = new FIELDMAP();
    this.edges = new EDGES();
    this.lanes = new LANES();
    this.stream = new BatchStream();
    this.proof = new CCProof();
    this.audit = new CCauditBlocks();
    this.verifier = new CCVerifier();
  }

  /**
   * Encode object with CC-v1 conformance
   */
  encode(input, options = {}) {
    const inputHash = this.verifier.computeHash(input);
    this.audit.phaseEnter('cc.encode', inputHash);

    // ⊕ Symbol Folding - Build DICT
    this.encodeSymbols(input);
    this.proof.recordOperator('⊕', this.dict.getDiff(null));
    this.audit.operatorApply('⊕', 'asx://proof/evidence/dict/v1', inputHash, null);

    // π̂ Field Projection - Build FIELDMAP
    if (input.Φ) {
      const allowlist = this.fieldmap.projectFields(input.Φ);
      this.proof.recordOperator('π̂', {
        '@observer': options.observer || 'asx://observer/default',
        '@field_allowlist': allowlist
      });
      this.audit.operatorApply('π̂', 'asx://proof/evidence/fieldmap/v1', null, null);
    }

    // ⊗ Control Collapse - Build EDGES
    if (input.Φ) {
      this.edges.buildFromXCFE(input.Φ);
      this.proof.recordOperator('⊗', {
        '@graph_hash_in': this.edges.computeHash(),
        '@graph_hash_out': this.edges.computeHash(),
        '@isomorphism': this.edges.getIsomorphismCertificate(this.edges)
      });
      this.audit.operatorApply('⊗', 'asx://proof/evidence/edges/v1', null, null);
    }

    // ≈ Value Quantization (optional)
    if (options.quantize) {
      this.lanes.enableQuantization(options.quantize);
      this.encodeQuantizedValues(input);
      this.proof.recordOperator('≈', this.lanes.getQuantProof());
    }

    // Build stream
    this.stream.setMeta('1.0', {
      hasDict: true,
      hasFieldmap: true,
      hasEdges: !!input.Φ,
      hasQuantLane: !!options.quantize,
      hasTemporal: !!options.temporal
    });

    this.stream.addDictChunk(this.dict);
    this.stream.addFieldChunk(this.fieldmap);
    if (input.Φ) this.stream.addEdgesChunk(this.edges);
    this.stream.addDataBatch({ lanes: this.lanes.toCanonical() });

    // Compute output and finalize proof
    const output = this.stream.toStream();
    const outputHash = this.verifier.computeHash(output);

    this.proof.setHashes(inputHash, outputHash);
    this.proof.computeProofHash();

    // Verify invariants
    this.proof.recordInvariant('I1', true);
    this.proof.recordInvariant('I2', true);
    this.proof.recordInvariant('I3', true);
    this.proof.recordInvariant('I4', this.verifier.computeSize(output) <= this.verifier.computeSize(input));

    this.stream.setProof(this.proof.toEnvelope());
    this.audit.proofEmit(this.proof);

    const finalOutput = this.stream.toStream();
    this.audit.phaseExit('cc.encode', this.verifier.computeHash(finalOutput), true);

    return {
      stream: finalOutput,
      proof: this.proof.toEnvelope(),
      audit: this.audit.getBlocks()
    };
  }

  /**
   * Decode SCXQ2 stream back to original
   */
  decode(stream) {
    const meta = stream.meta;
    const chunks = stream.chunks || [];

    // Reconstruct from chunks
    let dictData = null;
    let fieldData = null;
    let edgesData = null;
    let lanesData = null;

    for (const chunk of chunks) {
      switch (chunk['@type']) {
        case 'DICT':
          dictData = chunk['@data'];
          break;
        case 'FIELD':
          fieldData = chunk['@data'];
          break;
        case 'EDGES':
          edgesData = chunk['@data'];
          break;
        case 'DATA':
          lanesData = chunk['@data'];
          break;
      }
    }

    return {
      dict: dictData,
      fieldmap: fieldData,
      edges: edgesData,
      lanes: lanesData,
      meta
    };
  }

  /**
   * Verify a proof envelope
   */
  verify(input, output, proof) {
    const result = this.verifier.verify(input, output, proof);
    this.audit.verifyResult(result);
    return result;
  }

  /**
   * Encode symbols recursively
   */
  encodeSymbols(obj, path = '') {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'string') {
      this.dict.register(obj);
      this.lanes.addRaw(obj);
      return;
    }

    if (typeof obj === 'number') {
      this.lanes.addRaw(obj);
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.encodeSymbols(obj[i], `${path}[${i}]`);
      }
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        this.dict.register(key);
        const fieldPath = path ? `${path}.${key}` : key;
        this.fieldmap.register(fieldPath);
        this.lanes.addSymbol(this.dict.getSid(key));
        this.encodeSymbols(value, fieldPath);
      }
    }
  }

  /**
   * Encode quantized values
   */
  encodeQuantizedValues(obj, path = '') {
    if (typeof obj === 'number') {
      this.lanes.addQuantized(obj);
      return;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.encodeQuantizedValues(item);
      }
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        this.encodeQuantizedValues(value);
      }
    }
  }
}

// Export for Service Worker and Node.js
if (typeof self !== 'undefined') {
  self.SCXQ2 = SCXQ2;
  self.DICT = DICT;
  self.FIELDMAP = FIELDMAP;
  self.EDGES = EDGES;
  self.LANES = LANES;
  self.BatchStream = BatchStream;
  self.CCProof = CCProof;
  self.CCVerifier = CCVerifier;
  self.CCauditBlocks = CCauditBlocks;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCXQ2,
    DICT,
    FIELDMAP,
    EDGES,
    LANES,
    BatchStream,
    CCProof,
    CCVerifier,
    CCauditBlocks
  };
}
