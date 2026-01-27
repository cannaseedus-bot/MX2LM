/* ============================================================
   QWEN-ASX π-KUHUL ADAPTER
   Base Training Format Model Integration
   Law: Ω-BLACK-PANEL
   Role: MX2LM base training format (external sees only "brain")
   ============================================================ */

/**
 * QwenASXPiKuhulAdapter - Base format that trains MX2LM
 * External AI platforms see this as just another brain
 * Internally it provides the weight format and training infrastructure
 */
class QwenASXPiKuhulAdapter {
  constructor(config = {}) {
    // π-KUHUL constants
    this.PI = 3.141592653589793;
    this.PHI = 1.6180339887498948;
    this.TAU = 6.283185307179586;
    this.E = 2.718281828459045;

    // Model configuration
    this.config = {
      d_model: config.d_model || 768,
      d_ff: config.d_ff || 3072,
      n_layers: config.n_layers || 12,
      n_heads: config.n_heads || 12,
      vocab_size: config.vocab_size || 151936,
      max_seq_len: config.max_seq_len || 8192,
      rope_theta: config.rope_theta || 10000.0
    };

    // SafeTensors source
    this.source = {
      url: config.url || 'https://mx2lm.app/models/Qwen-ASX/model.safetensors',
      status: 'unloaded',
      index: null,
      buffer: null,
      dataBase: 0,
      cache: new Map()
    };

    // Glyph codex
    this.glyphs = {
      '🧬→🎓': 'base_to_training',
      '🎓→📊': 'training_to_delta',
      '📊→🔄': 'delta_to_rlhf',
      '🔄→✅': 'rlhf_to_conformance'
    };

    this.opcodes = {
      'QWA_TOK': '⟁W0',
      'QWA_EMB': '⟁W1',
      'QWA_ATT': '⟁W2',
      'QWA_FFN': '⟁W3',
      'QWA_NRM': '⟁W4',
      'QWA_LMH': '⟁W5',
      'QWA_DLT': '⟁W6',
      'QWA_RLH': '⟁W7'
    };

    // Wave functions for π-KUHUL transforms
    this.waveFunctions = {
      embedScale: (x, d) => Math.sqrt(d) * Math.sin(this.PI * x),
      deltaScale: (reward, epoch) => Math.pow(this.PHI, -epoch) * reward,
      weightDecay: (w, lambda, t) => w * (1 - lambda * Math.pow(this.PHI, -t)),
      compress: (x) => Math.floor(x * this.PI * this.PHI) / (this.PI * this.PHI)
    };

    // Training state (delta-only mode)
    this.training = {
      enabled: true,
      deltaLog: [],
      epoch: 0,
      minSamples: 10,
      policy: {
        rewardScale: 0.01,
        clamp: 0.05
      }
    };

    // Block registry
    this.blocks = new Map();
    this.blockSequence = [];

    // Audit/conformance
    this.audit = {
      enabled: true,
      trace: []
    };
  }

  /* ============================================================
     SAFETENSORS LOADER
     ============================================================ */

  /**
   * Parse SafeTensors format
   * Format: [u64 header_len][header_json bytes][tensor_data bytes...]
   */
  parseSafeTensors(buffer) {
    const dv = new DataView(buffer);

    // header_len is little-endian u64
    const lo = dv.getUint32(0, true);
    const hi = dv.getUint32(4, true);
    const headerLen = Number((BigInt(hi) << 32n) | BigInt(lo));

    const headerStart = 8;
    const headerEnd = headerStart + headerLen;

    const headerBytes = new Uint8Array(buffer, headerStart, headerLen);
    const headerText = new TextDecoder('utf-8').decode(headerBytes);
    const header = JSON.parse(headerText);

    // The rest is tensor byte storage
    const dataBase = headerEnd;

    return { header, dataBase };
  }

  /**
   * Load model from SafeTensors URL
   */
  async loadModel() {
    if (this.source.status === 'ready') return;

    this.tracePush({ op: 'load.begin', url: this.source.url });

    try {
      const res = await fetch(this.source.url);
      if (!res.ok) throw new Error(`Model fetch failed: ${res.status}`);
      const buffer = await res.arrayBuffer();

      const { header, dataBase } = this.parseSafeTensors(buffer);

      // Build tensor index (excluding __metadata__)
      const index = {};
      for (const k of Object.keys(header)) {
        if (k === '__metadata__') continue;
        index[k] = header[k];
      }

      this.source.buffer = buffer;
      this.source.dataBase = dataBase;
      this.source.index = index;
      this.source.status = 'ready';

      this.tracePush({ op: 'load.ok', tensors: Object.keys(index).length });

      // Initialize block registry
      this.initializeBlocks();

    } catch (error) {
      this.source.status = 'error';
      this.tracePush({ op: 'load.error', error: error.message });
      throw error;
    }
  }

  /**
   * Get tensor by name (lazy decode with caching)
   */
  getTensor(name) {
    if (!this.source.index) throw new Error('Tensor index not built');
    const entry = this.source.index[name];
    if (!entry) throw new Error(`Missing tensor: ${name}`);

    // Check cache
    if (this.source.cache.has(name)) {
      return this.source.cache.get(name);
    }

    const { dtype, shape, data_offsets } = entry;
    const start = this.source.dataBase + data_offsets[0];
    const end = this.source.dataBase + data_offsets[1];
    const bytes = new Uint8Array(this.source.buffer, start, end - start);

    // Decode based on dtype
    let data;
    if (dtype === 'F32') {
      data = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    } else if (dtype === 'F16' || dtype === 'BF16') {
      // Convert F16/BF16 to F32
      data = this.convertToF32(bytes, dtype);
    } else {
      throw new Error(`Unsupported dtype ${dtype} for ${name}`);
    }

    const tensor = { name, dtype: 'float32', shape, data: new Float32Array(data) };
    this.source.cache.set(name, tensor);
    return tensor;
  }

  /**
   * Convert F16/BF16 to F32
   */
  convertToF32(bytes, dtype) {
    const count = bytes.byteLength / 2;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const val = view.getUint16(i * 2, true);
      if (dtype === 'BF16') {
        // BF16: just shift left by 16 bits
        const asU32 = val << 16;
        const buf = new ArrayBuffer(4);
        new Uint32Array(buf)[0] = asU32;
        out[i] = new Float32Array(buf)[0];
      } else {
        // F16: proper conversion
        out[i] = this.f16ToF32(val);
      }
    }
    return out;
  }

  f16ToF32(h) {
    const sign = (h >> 15) & 1;
    const exp = (h >> 10) & 0x1f;
    const frac = h & 0x3ff;

    if (exp === 0) {
      if (frac === 0) return sign ? -0 : 0;
      // Subnormal
      const f = frac / 1024;
      return (sign ? -1 : 1) * Math.pow(2, -14) * f;
    }
    if (exp === 31) {
      return frac ? NaN : (sign ? -Infinity : Infinity);
    }

    return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
  }

  /* ============================================================
     BLOCK REGISTRY
     ============================================================ */

  initializeBlocks() {
    this.blocks.clear();

    // Embedding
    this.blocks.set('embedding', {
      id: 'embedding',
      type: 'tensor.embedding',
      weights: ['model.embed_tokens.weight'],
      in: ['input_ids'],
      out: ['x']
    });

    // Transformer layers
    for (let i = 0; i < this.config.n_layers; i++) {
      // Attention
      this.blocks.set(`attn_${i}`, {
        id: `attn_${i}`,
        type: 'tensor.attention',
        weights: [
          `model.layers.${i}.self_attn.q_proj.weight`,
          `model.layers.${i}.self_attn.k_proj.weight`,
          `model.layers.${i}.self_attn.v_proj.weight`,
          `model.layers.${i}.self_attn.o_proj.weight`
        ],
        in: ['x'],
        out: ['x']
      });

      // FFN
      this.blocks.set(`ffn_${i}`, {
        id: `ffn_${i}`,
        type: 'tensor.ffn',
        weights: [
          `model.layers.${i}.mlp.gate_proj.weight`,
          `model.layers.${i}.mlp.up_proj.weight`,
          `model.layers.${i}.mlp.down_proj.weight`
        ],
        in: ['x'],
        out: ['x']
      });
    }

    // Output norm
    this.blocks.set('norm_out', {
      id: 'norm_out',
      type: 'tensor.rmsnorm',
      weights: ['model.norm.weight'],
      in: ['x'],
      out: ['x']
    });

    // LM head
    this.blocks.set('lm_head', {
      id: 'lm_head',
      type: 'tensor.linear',
      weights: ['lm_head.weight'],
      in: ['x'],
      out: ['logits']
    });

    // Build sequence
    this.blockSequence = ['embedding'];
    for (let i = 0; i < this.config.n_layers; i++) {
      this.blockSequence.push(`attn_${i}`, `ffn_${i}`);
    }
    this.blockSequence.push('norm_out', 'lm_head');

    this.tracePush({ op: 'blocks.initialized', count: this.blocks.size });
  }

  /* ============================================================
     TENSOR OPERATIONS (CPU BASELINE)
     ============================================================ */

  matmul(A, B, m, k, n) {
    const C = new Float32Array(m * n);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0.0;
        const aRow = i * k;
        for (let t = 0; t < k; t++) {
          sum += A[aRow + t] * B[t * n + j];
        }
        C[i * n + j] = sum;
      }
    }
    return C;
  }

  transpose2D(W, rows, cols) {
    const out = new Float32Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out[c * rows + r] = W[r * cols + c];
      }
    }
    return out;
  }

  rmsnorm(x, w, eps = 1e-6) {
    let ss = 0.0;
    for (let i = 0; i < x.length; i++) ss += x[i] * x[i];
    const inv = 1.0 / Math.sqrt(ss / x.length + eps);
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = x[i] * inv * w[i];
    return out;
  }

  silu(x) {
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) {
      const v = x[i];
      out[i] = v / (1.0 + Math.exp(-v));
    }
    return out;
  }

  /* ============================================================
     BLOCK EXECUTION
     ============================================================ */

  execEmbedding(block, ctx) {
    const W = this.getTensor(block.weights[0]);
    const T = ctx.input_ids.length;
    const d = W.shape[1];

    const out = new Float32Array(T * d);
    for (let t = 0; t < T; t++) {
      const tok = ctx.input_ids[t];
      const row = tok * d;
      for (let i = 0; i < d; i++) {
        out[t * d + i] = W.data[row + i];
      }
    }

    this.tracePush({ op: 'block.embedding', T, d });
    return { x: out, shape: [T, d] };
  }

  execAttention(block, ctx) {
    // Minimal attention: linear projections only (baseline)
    const x = ctx.x;
    const [T, d] = ctx.shape;

    const Wq = this.getTensor(block.weights[0]);
    const Wo = this.getTensor(block.weights[3]);

    const out = new Float32Array(x.length);

    // Simple Q projection + O projection
    if (Wq.shape.length === 2 && Wq.shape[0] === d && Wq.shape[1] === d) {
      for (let t = 0; t < T; t++) {
        const row = x.subarray(t * d, (t + 1) * d);
        const y = this.matmul(row, Wq.data, 1, d, d);
        out.set(y, t * d);
      }

      if (Wo.shape.length === 2 && Wo.shape[0] === d) {
        const out2 = new Float32Array(out.length);
        for (let t = 0; t < T; t++) {
          const row = out.subarray(t * d, (t + 1) * d);
          const y = this.matmul(row, Wo.data, 1, d, d);
          out2.set(y, t * d);
        }
        this.tracePush({ op: `block.${block.id}`, T, d });
        return { x: out2, shape: [T, d] };
      }
    }

    // Passthrough fallback
    out.set(x);
    this.tracePush({ op: `block.${block.id}.passthrough`, T, d });
    return { x: out, shape: [T, d] };
  }

  execFFN(block, ctx) {
    const x = ctx.x;
    const [T, d] = ctx.shape;

    const W1 = this.getTensor(block.weights[0]);
    const W2 = this.getTensor(block.weights[1]);
    const W3 = this.getTensor(block.weights[2]);

    // Expected: W1, W2: [d_ff, d], W3: [d, d_ff]
    if (W1.shape.length === 2 && W1.shape[1] === d) {
      const dff = W1.shape[0];
      const out = new Float32Array(T * d);

      for (let t = 0; t < T; t++) {
        const row = x.subarray(t * d, (t + 1) * d);

        // gate = silu(row @ W1.T)
        const W1T = this.transpose2D(W1.data, dff, d);
        const gate = this.matmul(row, W1T, 1, d, dff);
        const gateAct = this.silu(gate);

        // up = row @ W2.T
        const W2T = this.transpose2D(W2.data, dff, d);
        const up = this.matmul(row, W2T, 1, d, dff);

        // hadamard
        for (let i = 0; i < dff; i++) gateAct[i] *= up[i];

        // down = gateAct @ W3.T
        const W3T = this.transpose2D(W3.data, d, dff);
        const y = this.matmul(gateAct, W3T, 1, dff, d);

        // Residual
        for (let i = 0; i < d; i++) {
          out[t * d + i] = row[i] + y[i];
        }
      }

      this.tracePush({ op: `block.${block.id}`, T, d, dff });
      return { x: out, shape: [T, d] };
    }

    // Passthrough fallback
    const out = new Float32Array(x.length);
    out.set(x);
    this.tracePush({ op: `block.${block.id}.passthrough`, T, d });
    return { x: out, shape: [T, d] };
  }

  execRMSNorm(block, ctx) {
    const x = ctx.x;
    const [T, d] = ctx.shape;
    const W = this.getTensor(block.weights[0]);
    const out = new Float32Array(x.length);

    for (let t = 0; t < T; t++) {
      const row = x.subarray(t * d, (t + 1) * d);
      const n = this.rmsnorm(row, W.data);
      out.set(n, t * d);
    }

    this.tracePush({ op: 'block.norm', T, d });
    return { x: out, shape: [T, d] };
  }

  execLinear(block, ctx) {
    const x = ctx.x;
    const [T, d] = ctx.shape;
    const W = this.getTensor(block.weights[0]);

    const vocab = W.shape[0];
    const out = new Float32Array(vocab);

    // Use last token representation
    const last = x.subarray((T - 1) * d, T * d);

    for (let v = 0; v < vocab; v++) {
      let sum = 0.0;
      const row = v * d;
      for (let i = 0; i < d; i++) {
        sum += W.data[row + i] * last[i];
      }
      out[v] = sum;
    }

    this.tracePush({ op: 'block.lm_head', vocab, d });
    return { logits: out, shape: [vocab] };
  }

  execBlock(block, ctx) {
    switch (block.type) {
      case 'tensor.embedding': return this.execEmbedding(block, ctx);
      case 'tensor.attention': return this.execAttention(block, ctx);
      case 'tensor.ffn': return this.execFFN(block, ctx);
      case 'tensor.rmsnorm': return this.execRMSNorm(block, ctx);
      case 'tensor.linear': return this.execLinear(block, ctx);
      default: throw new Error(`Unknown block type: ${block.type}`);
    }
  }

  /* ============================================================
     INFERENCE
     ============================================================ */

  async infer(inputIds) {
    await this.loadModel();

    let ctx = {
      input_ids: Int32Array.from(inputIds),
      x: null,
      shape: null
    };

    this.tracePush({ op: 'infer.begin', seq_len: inputIds.length });

    for (const blockId of this.blockSequence) {
      const block = this.blocks.get(blockId);
      if (!block) throw new Error(`Missing block: ${blockId}`);

      const out = this.execBlock(block, ctx);
      ctx = { ...ctx, ...out };
    }

    // Compute output hash for conformance
    const logitsBytes = this.f32ToBytes(ctx.logits);
    const outHash = this.fnv1a32(logitsBytes);

    this.tracePush({ op: 'infer.ok', out_hash: outHash });

    return {
      logits: ctx.logits,
      hash32: outHash,
      trace: this.audit.trace.slice(),
      piCompressed: this.waveFunctions.compress(ctx.logits[0])
    };
  }

  /* ============================================================
     CONFORMANCE TEST
     ============================================================ */

  async conformanceTest() {
    const sample = [1, 2, 3, 4]; // Test tokens
    const r1 = await this.infer(sample);
    const r2 = await this.infer(sample);

    const okShape = r1.logits instanceof Float32Array && r1.logits.length >= 1000;
    const okHash = r1.hash32 === r2.hash32;

    let okFinite = true;
    for (let i = 0; i < r1.logits.length; i++) {
      if (!Number.isFinite(r1.logits[i])) {
        okFinite = false;
        break;
      }
    }

    const result = {
      '@test': 'infer_min_v1',
      '@ok': Boolean(okShape && okHash && okFinite),
      '@checks': { okShape, okHash, okFinite },
      '@hash32': r1.hash32
    };

    this.tracePush({ op: 'conformance.result', ...result });
    return result;
  }

  /* ============================================================
     TRAINING (DELTA-ONLY MODE)
     ============================================================ */

  recordTrainingSample(input, output, reward) {
    if (!this.training.enabled) return;

    this.training.deltaLog.push({
      input,
      output,
      reward,
      epoch: this.training.epoch,
      timestamp: Date.now()
    });

    this.tracePush({ op: 'training.sample', reward, epoch: this.training.epoch });
  }

  async applyTrainingDeltas() {
    if (this.training.deltaLog.length < this.training.minSamples) {
      return { applied: false, reason: 'insufficient_samples' };
    }

    const avgReward = this.training.deltaLog.reduce((s, t) => s + t.reward, 0) / this.training.deltaLog.length;
    const scaledDelta = this.waveFunctions.deltaScale(avgReward, this.training.epoch);
    const clampedDelta = Math.max(-this.training.policy.clamp, Math.min(this.training.policy.clamp, scaledDelta));

    // In delta-only mode, we don't mutate base weights
    // Instead, we emit a delta record for SCXQ2 to store
    const deltaRecord = {
      '@delta': 'weight.patch',
      '@epoch': this.training.epoch,
      '@avg_reward': avgReward,
      '@scaled_delta': clampedDelta,
      '@sample_count': this.training.deltaLog.length,
      '@lane': 'RAW',
      '@hash': this.fnv1a32(new TextEncoder().encode(JSON.stringify({ avgReward, epoch: this.training.epoch })))
    };

    this.training.epoch++;
    this.training.deltaLog = [];

    this.tracePush({ op: 'training.delta_applied', ...deltaRecord });

    return { applied: true, delta: deltaRecord };
  }

  /* ============================================================
     UTILITIES
     ============================================================ */

  f32ToBytes(f32arr) {
    const buf = new ArrayBuffer(f32arr.length * 4);
    new Float32Array(buf).set(f32arr);
    return new Uint8Array(buf);
  }

  fnv1a32(bytes) {
    let h = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  tracePush(rec) {
    if (!this.audit.enabled) return;
    this.audit.trace.push({ t: Date.now(), ...rec });
  }

  /* ============================================================
     XCFE AST
     ============================================================ */

  buildXcfeAst() {
    return {
      '@type': 'xcfe/adapter',
      '@id': 'qwen_asx_pi_kuhul_adapter',
      '@law': 'Ω-BLACK-PANEL',
      '@role': 'base_training_format',
      'Σ': {
        atoms: ['token', 'embedding', 'attention', 'ffn', 'logits', 'delta'],
        glyphs: this.glyphs
      },
      'V': {
        π: this.PI,
        φ: this.PHI,
        τ: this.TAU,
        ...this.config
      },
      'Φ': {
        entry: 'tokenizer',
        nodes: this.blockSequence.reduce((acc, id) => {
          const block = this.blocks.get(id);
          if (block) {
            acc[id] = { type: block.type, weights: block.weights };
          }
          return acc;
        }, {})
      },
      compression: {
        '@law': 'CC-FULL',
        operators: ['⊕', 'π̂', '⊗', '≈', 'τ']
      },
      training: {
        mode: 'delta_only',
        epoch: this.training.epoch,
        samples: this.training.deltaLog.length
      }
    };
  }

  getStats() {
    return {
      model: 'Qwen-ASX',
      role: 'base_training_format',
      status: this.source.status,
      config: this.config,
      tensors: this.source.index ? Object.keys(this.source.index).length : 0,
      cachedTensors: this.source.cache.size,
      blocks: this.blocks.size,
      training: {
        epoch: this.training.epoch,
        pendingSamples: this.training.deltaLog.length
      },
      piConstants: {
        π: this.PI,
        φ: this.PHI,
        τ: this.TAU
      }
    };
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.QwenASXPiKuhulAdapter = QwenASXPiKuhulAdapter;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QwenASXPiKuhulAdapter };
}
