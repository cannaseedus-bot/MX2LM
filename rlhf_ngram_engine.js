/* ============================================================
   RLHF N-GRAM ENGINE
   π-KUHUL Reinforcement Learning & N-gram Memory System
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * NgramBuilder - Automatic N-gram construction with π-KUHUL weighting
 * Builds and maintains n-gram frequency tables with golden ratio decay
 */
class NgramBuilder {
  constructor(config = {}) {
    this.maxN = config.maxN || 5;           // Max n-gram size
    this.minFreq = config.minFreq || 2;     // Min frequency to keep
    this.decayRate = config.decayRate || (1 / 1.6180339887498948); // φ⁻¹ decay

    // N-gram storage by order (1-gram, 2-gram, etc.)
    this.ngrams = new Map();
    for (let n = 1; n <= this.maxN; n++) {
      this.ngrams.set(n, new Map());
    }

    // π-KUHUL constants
    this.PI = Math.PI;
    this.PHI = 1.6180339887498948;
    this.TAU = Math.PI * 2;

    // Event history for dumps
    this.eventHistory = [];
    this.maxEvents = config.maxEvents || 10000;

    // Glyph mappings for compression
    this.glyphMap = new Map();
    this.nextGlyphId = 0;

    // Statistics
    this.stats = {
      totalTokens: 0,
      totalNgrams: 0,
      compressionRatio: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * Tokenize text into normalized tokens
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    return text
      .toLowerCase()
      .replace(/[^\w\s\u0080-\uFFFF]/g, ' ')  // Keep unicode
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Build n-grams from token sequence
   */
  buildNgrams(tokens, n) {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join('|'));
    }
    return ngrams;
  }

  /**
   * Ingest text and update n-gram tables
   * Uses π-KUHUL weighting: weight = base × φ^(-distance)
   */
  ingest(text, metadata = {}) {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return { ingested: 0 };

    const timestamp = Date.now();
    const source = metadata.source || 'unknown';
    let totalIngested = 0;

    // Build n-grams for each order
    for (let n = 1; n <= Math.min(this.maxN, tokens.length); n++) {
      const ngramTable = this.ngrams.get(n);
      const ngrams = this.buildNgrams(tokens, n);

      for (let i = 0; i < ngrams.length; i++) {
        const ngram = ngrams[i];

        // π-KUHUL weight: position-based with golden decay
        const positionWeight = Math.pow(this.PHI, -i / tokens.length);

        // Get or create entry
        let entry = ngramTable.get(ngram);
        if (!entry) {
          entry = {
            ngram,
            n,
            frequency: 0,
            weight: 0,
            firstSeen: timestamp,
            lastSeen: timestamp,
            sources: new Set(),
            glyph: null
          };
        }

        // Update entry
        entry.frequency++;
        entry.weight += positionWeight;
        entry.lastSeen = timestamp;
        entry.sources.add(source);

        // Assign glyph if frequent enough
        if (entry.frequency >= this.minFreq && !entry.glyph) {
          entry.glyph = this.assignGlyph(ngram, n);
        }

        ngramTable.set(ngram, entry);
        totalIngested++;
      }
    }

    // Record event
    this.recordEvent({
      type: 'ingest',
      tokens: tokens.length,
      ngrams: totalIngested,
      source,
      timestamp
    });

    this.stats.totalTokens += tokens.length;
    this.stats.totalNgrams = this.getTotalNgramCount();
    this.stats.lastUpdate = timestamp;

    return { ingested: totalIngested, tokens: tokens.length };
  }

  /**
   * Assign a compressed glyph to an n-gram
   * Uses π-encoded identifier
   */
  assignGlyph(ngram, n) {
    const id = this.nextGlyphId++;

    // Encode with π-KUHUL: ⟁{order}{id}
    const glyph = `⟁${n}${id.toString(36)}`;

    this.glyphMap.set(glyph, ngram);
    this.glyphMap.set(ngram, glyph);

    return glyph;
  }

  /**
   * Compress text to glyphs
   */
  compress(text) {
    const tokens = this.tokenize(text);
    const result = [];
    let i = 0;

    while (i < tokens.length) {
      let matched = false;

      // Try longest n-gram first (greedy)
      for (let n = Math.min(this.maxN, tokens.length - i); n >= 1; n--) {
        const ngram = tokens.slice(i, i + n).join('|');
        const entry = this.ngrams.get(n)?.get(ngram);

        if (entry?.glyph) {
          result.push(entry.glyph);
          i += n;
          matched = true;
          break;
        }
      }

      if (!matched) {
        result.push(tokens[i]);
        i++;
      }
    }

    const compressed = result.join(' ');
    const ratio = text.length / compressed.length;
    this.stats.compressionRatio = ratio;

    return {
      original: text,
      compressed,
      ratio,
      glyphCount: result.filter(r => r.startsWith('⟁')).length
    };
  }

  /**
   * Decompress glyphs back to text
   */
  decompress(compressed) {
    const tokens = compressed.split(/\s+/);
    const result = tokens.map(t => {
      if (t.startsWith('⟁')) {
        const ngram = this.glyphMap.get(t);
        return ngram ? ngram.replace(/\|/g, ' ') : t;
      }
      return t;
    });

    return result.join(' ');
  }

  /**
   * Apply decay to all weights (called periodically)
   * Uses golden ratio decay: weight *= φ⁻¹
   */
  applyDecay() {
    const now = Date.now();

    for (let n = 1; n <= this.maxN; n++) {
      const table = this.ngrams.get(n);

      for (const [key, entry] of table) {
        // Time-based decay: older entries decay more
        const age = (now - entry.lastSeen) / (1000 * 60 * 60); // Hours
        const decayFactor = Math.pow(this.decayRate, age);

        entry.weight *= decayFactor;

        // Prune if below threshold
        if (entry.weight < 0.001 && entry.frequency < this.minFreq) {
          table.delete(key);
        }
      }
    }

    this.recordEvent({ type: 'decay', timestamp: now });
  }

  /**
   * Record event for dumps
   */
  recordEvent(event) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxEvents) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get top n-grams by weight
   */
  getTopNgrams(n, limit = 100) {
    const table = this.ngrams.get(n);
    if (!table) return [];

    return Array.from(table.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map(e => ({
        ngram: e.ngram,
        frequency: e.frequency,
        weight: e.weight,
        glyph: e.glyph
      }));
  }

  /**
   * Get total n-gram count across all orders
   */
  getTotalNgramCount() {
    let total = 0;
    for (let n = 1; n <= this.maxN; n++) {
      total += this.ngrams.get(n).size;
    }
    return total;
  }

  /**
   * Get memory snapshot (for /ngrams/snapshot endpoint)
   */
  getSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      stats: { ...this.stats },
      tables: {}
    };

    for (let n = 1; n <= this.maxN; n++) {
      const table = this.ngrams.get(n);
      snapshot.tables[`${n}gram`] = {
        size: table.size,
        top: this.getTopNgrams(n, 20)
      };
    }

    return snapshot;
  }

  /**
   * Get event dump
   */
  getEventDump(limit = 1000) {
    return {
      total: this.eventHistory.length,
      events: this.eventHistory.slice(-limit)
    };
  }

  /**
   * Export state for persistence
   */
  exportState() {
    const state = {
      version: 1,
      maxN: this.maxN,
      nextGlyphId: this.nextGlyphId,
      stats: this.stats,
      tables: {},
      glyphMap: Array.from(this.glyphMap.entries())
    };

    for (let n = 1; n <= this.maxN; n++) {
      const table = this.ngrams.get(n);
      state.tables[n] = Array.from(table.entries()).map(([k, v]) => ({
        ...v,
        sources: Array.from(v.sources)
      }));
    }

    return state;
  }

  /**
   * Import state from persistence
   */
  importState(state) {
    if (state.version !== 1) return false;

    this.maxN = state.maxN;
    this.nextGlyphId = state.nextGlyphId;
    this.stats = state.stats;

    // Restore glyph map
    this.glyphMap = new Map(state.glyphMap);

    // Restore tables
    for (let n = 1; n <= this.maxN; n++) {
      const table = new Map();
      for (const entry of (state.tables[n] || [])) {
        table.set(entry.ngram, {
          ...entry,
          sources: new Set(entry.sources)
        });
      }
      this.ngrams.set(n, table);
    }

    return true;
  }
}

/**
 * RLHFEngine - Reinforcement Learning from Human Feedback
 * Integrates with n-gram memory and glyph compression
 */
class RLHFEngine {
  constructor(config = {}) {
    this.ngramBuilder = config.ngramBuilder || new NgramBuilder();
    this.glyphVM = config.glyphVM || null;

    // π-KUHUL constants
    this.PHI = 1.6180339887498948;
    this.learningRate = config.learningRate || 0.001;
    this.decayHalfLife = config.decayHalfLife || 24 * 60 * 60 * 1000; // 24 hours

    // Weight storage for glyphs/n-grams
    this.weights = new Map();

    // Interaction history for TD learning
    this.interactions = [];
    this.maxInteractions = config.maxInteractions || 10000;

    // Reward/penalty tracking
    this.rewardHistory = [];
    this.penaltyHistory = [];

    // Metrics
    this.metrics = {
      totalReinforcements: 0,
      totalPenalties: 0,
      avgReward: 0,
      avgPenalty: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * Process input through n-gram builder and store interaction
   */
  processInput(input, context = {}) {
    // Ingest into n-gram memory
    const ingestResult = this.ngramBuilder.ingest(input, context);

    // Compress to glyphs
    const compressed = this.ngramBuilder.compress(input);

    // Create interaction record
    const interaction = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      input,
      compressed: compressed.compressed,
      glyphs: compressed.compressed.split(/\s+/).filter(g => g.startsWith('⟁')),
      ngrams: ingestResult.ingested,
      context,
      timestamp: Date.now(),
      reward: null,
      penalty: null
    };

    this.interactions.push(interaction);
    if (this.interactions.length > this.maxInteractions) {
      this.interactions.shift();
    }

    return interaction;
  }

  /**
   * Reinforce an interaction with positive reward
   * Propagates reward through n-gram chain using TD learning
   */
  reinforce(interactionId, reward, propagationDepth = 3) {
    const interaction = this.interactions.find(i => i.id === interactionId);
    if (!interaction) return { error: 'interaction_not_found' };

    interaction.reward = reward;

    // Propagate reward through glyphs with π decay
    const glyphs = interaction.glyphs;
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];

      // Temporal difference: closer glyphs get more reward
      const distance = glyphs.length - i - 1;
      const decayedReward = reward * Math.pow(this.PHI, -distance);

      this.updateWeight(glyph, decayedReward);
    }

    // Propagate to n-grams
    this.propagateToNgrams(interaction.input, reward, propagationDepth);

    // Update metrics
    this.metrics.totalReinforcements++;
    this.rewardHistory.push({ interactionId, reward, timestamp: Date.now() });
    this.updateAvgReward();

    return {
      reinforced: true,
      interactionId,
      reward,
      glyphsUpdated: glyphs.length
    };
  }

  /**
   * Penalize an interaction with negative feedback
   */
  penalize(interactionId, penalty, propagationDepth = 2) {
    const interaction = this.interactions.find(i => i.id === interactionId);
    if (!interaction) return { error: 'interaction_not_found' };

    interaction.penalty = penalty;

    // Apply penalty with faster decay (less propagation)
    const glyphs = interaction.glyphs;
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i];
      const distance = glyphs.length - i - 1;
      const decayedPenalty = penalty * Math.pow(this.PHI, -distance * 2); // Faster decay for penalties

      this.updateWeight(glyph, -decayedPenalty);
    }

    // Propagate to n-grams with reduced depth
    this.propagateToNgrams(interaction.input, -penalty, propagationDepth);

    // Update metrics
    this.metrics.totalPenalties++;
    this.penaltyHistory.push({ interactionId, penalty, timestamp: Date.now() });
    this.updateAvgPenalty();

    return {
      penalized: true,
      interactionId,
      penalty,
      glyphsUpdated: glyphs.length
    };
  }

  /**
   * Update weight for a glyph
   */
  updateWeight(glyph, delta) {
    const current = this.weights.get(glyph) || 0;
    const updated = current + (delta * this.learningRate);

    // Clamp to reasonable range
    const clamped = Math.max(-10, Math.min(10, updated));
    this.weights.set(glyph, clamped);

    return clamped;
  }

  /**
   * Propagate reward/penalty to n-grams in the builder
   */
  propagateToNgrams(text, reward, depth) {
    const tokens = this.ngramBuilder.tokenize(text);

    for (let n = 1; n <= Math.min(depth, this.ngramBuilder.maxN); n++) {
      const ngrams = this.ngramBuilder.buildNgrams(tokens, n);

      for (let i = 0; i < ngrams.length; i++) {
        const ngram = ngrams[i];
        const table = this.ngramBuilder.ngrams.get(n);
        const entry = table.get(ngram);

        if (entry) {
          // Update weight based on reward
          const decayedReward = reward * Math.pow(this.PHI, -i / ngrams.length);
          entry.weight += decayedReward * this.learningRate;
        }
      }
    }
  }

  /**
   * Get weight for a glyph
   */
  getWeight(glyph) {
    return this.weights.get(glyph) || 0;
  }

  /**
   * Apply temporal decay to all weights
   */
  applyDecay() {
    const now = Date.now();

    for (const [glyph, weight] of this.weights) {
      const decayFactor = Math.pow(0.5, 1 / (this.decayHalfLife / (1000 * 60 * 60)));
      const newWeight = weight * decayFactor;

      if (Math.abs(newWeight) < 0.0001) {
        this.weights.delete(glyph);
      } else {
        this.weights.set(glyph, newWeight);
      }
    }

    // Also decay n-gram weights
    this.ngramBuilder.applyDecay();

    this.metrics.lastUpdate = now;
  }

  /**
   * Update average reward metric
   */
  updateAvgReward() {
    const recent = this.rewardHistory.slice(-100);
    if (recent.length === 0) {
      this.metrics.avgReward = 0;
      return;
    }
    this.metrics.avgReward = recent.reduce((s, r) => s + r.reward, 0) / recent.length;
  }

  /**
   * Update average penalty metric
   */
  updateAvgPenalty() {
    const recent = this.penaltyHistory.slice(-100);
    if (recent.length === 0) {
      this.metrics.avgPenalty = 0;
      return;
    }
    this.metrics.avgPenalty = recent.reduce((s, p) => s + p.penalty, 0) / recent.length;
  }

  /**
   * Get RLHF metrics (for /rlhf/metrics endpoint)
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalWeights: this.weights.size,
      recentRewards: this.rewardHistory.slice(-10),
      recentPenalties: this.penaltyHistory.slice(-10),
      ngramStats: this.ngramBuilder.stats
    };
  }

  /**
   * Get interaction history
   */
  getInteractions(limit = 100) {
    return this.interactions.slice(-limit).map(i => ({
      id: i.id,
      inputLength: i.input.length,
      glyphCount: i.glyphs.length,
      reward: i.reward,
      penalty: i.penalty,
      timestamp: i.timestamp
    }));
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      version: 1,
      weights: Array.from(this.weights.entries()),
      metrics: this.metrics,
      rewardHistory: this.rewardHistory.slice(-1000),
      penaltyHistory: this.penaltyHistory.slice(-1000),
      ngramState: this.ngramBuilder.exportState()
    };
  }

  /**
   * Import state from persistence
   */
  importState(state) {
    if (state.version !== 1) return false;

    this.weights = new Map(state.weights);
    this.metrics = state.metrics;
    this.rewardHistory = state.rewardHistory || [];
    this.penaltyHistory = state.penaltyHistory || [];

    if (state.ngramState) {
      this.ngramBuilder.importState(state.ngramState);
    }

    return true;
  }
}

/**
 * MemoryGlyphBridge - Connects RLHF/N-gram to GlyphVM memory
 * Ensures data flows from learning into executable glyphs
 */
class MemoryGlyphBridge {
  constructor(config = {}) {
    this.rlhfEngine = config.rlhfEngine || new RLHFEngine();
    this.glyphVM = config.glyphVM || null;
    this.glyphRegistry = config.glyphRegistry || null;

    // Sync interval
    this.syncInterval = config.syncInterval || 60000; // 1 minute
    this.lastSync = 0;

    // Thresholds for promotion
    this.promotionThreshold = config.promotionThreshold || 5; // Min frequency
    this.weightThreshold = config.weightThreshold || 0.1;     // Min weight
  }

  /**
   * Process input through full pipeline:
   * Input → N-gram → Compress → Store → GlyphVM Memory
   */
  process(input, context = {}) {
    // Step 1: Process through RLHF engine (creates n-grams, compresses)
    const interaction = this.rlhfEngine.processInput(input, context);

    // Step 2: Store compressed glyphs in GlyphVM memory
    if (this.glyphVM) {
      const glyphs = interaction.compressed.split(/\s+/);
      for (let i = 0; i < glyphs.length; i++) {
        const glyph = glyphs[i];
        const weight = this.rlhfEngine.getWeight(glyph);

        // Store in VM memory with weight
        this.glyphVM.memory.set(`@learn_${i}`, {
          glyph,
          weight,
          timestamp: interaction.timestamp
        });
      }
    }

    return interaction;
  }

  /**
   * Sync high-value n-grams to GlyphVM as executable opcodes
   */
  syncToGlyphVM() {
    if (!this.glyphVM || !this.glyphRegistry) return { synced: 0 };

    let synced = 0;
    const ngramBuilder = this.rlhfEngine.ngramBuilder;

    // Check each n-gram table
    for (let n = 2; n <= ngramBuilder.maxN; n++) {
      const table = ngramBuilder.ngrams.get(n);

      for (const [key, entry] of table) {
        // Only promote if meets thresholds
        if (entry.frequency >= this.promotionThreshold &&
            entry.weight >= this.weightThreshold &&
            entry.glyph) {

          // Check if already registered
          if (!this.glyphVM.opcodes[entry.glyph]) {
            // Create executable handler for this n-gram
            const ngram = entry.ngram;
            const handler = () => {
              this.glyphVM.push(ngram.replace(/\|/g, ' '));
            };

            this.glyphRegistry.register(entry.glyph, handler, {
              type: 'learned',
              ngram,
              frequency: entry.frequency,
              weight: entry.weight
            });

            synced++;
          }
        }
      }
    }

    this.lastSync = Date.now();
    return { synced, timestamp: this.lastSync };
  }

  /**
   * Get bridge status
   */
  getStatus() {
    return {
      rlhfMetrics: this.rlhfEngine.getMetrics(),
      ngramSnapshot: this.rlhfEngine.ngramBuilder.getSnapshot(),
      vmConnected: !!this.glyphVM,
      registryConnected: !!this.glyphRegistry,
      lastSync: this.lastSync
    };
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.NgramBuilder = NgramBuilder;
  self.RLHFEngine = RLHFEngine;
  self.MemoryGlyphBridge = MemoryGlyphBridge;
}
