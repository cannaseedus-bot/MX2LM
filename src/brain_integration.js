/* ============================================================
   MX2LM BRAIN MODEL INTEGRATION LAYER

   Purpose: Orchestrate multiple LLM backends while MX2LM learns
   - WebLLM for local models (Phi-3, Llama, Qwen)
   - API connectors for external models (OpenRouter, Janus)
   - RLHF absorption from all model interactions
   - Native glyph brain execution

   Law: OMEGA-BLACK-PANEL
   Architecture: MX2LM_AS_LEARNING_ORCHESTRATOR
   ============================================================ */

/* ============================================================
   BRAIN MODEL REGISTRY
   ============================================================ */

const BRAIN_MODELS = {
  registry: null,
  loaded: new Map(),
  activeModel: null,
  learningBuffer: [],
  rlhfData: []
};

// Load brain model registry
async function loadBrainModelRegistry() {
  try {
    const res = await fetch('./brains/models/brain_model_registry.json', { cache: 'no-store' });
    if (!res.ok) return null;
    BRAIN_MODELS.registry = await res.json();
    return BRAIN_MODELS.registry;
  } catch (e) {
    console.error('Brain model registry load failed:', e);
    return null;
  }
}

/* ============================================================
   WEBLLM INTEGRATION
   Local browser-based LLM execution
   ============================================================ */

class WebLLMConnector {
  constructor() {
    this.engine = null;
    this.modelId = null;
    this.ready = false;
    this.loadProgress = 0;
  }

  async initialize(modelId) {
    // WebLLM must be loaded from CDN in the main page
    // This connector interfaces with it
    this.modelId = modelId;

    // Check if WebLLM is available
    if (typeof webllm === 'undefined') {
      console.warn('WebLLM not loaded - will use fallback');
      return false;
    }

    try {
      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (progress) => {
          this.loadProgress = progress.progress;
          console.log(`WebLLM loading ${modelId}: ${Math.round(progress.progress * 100)}%`);
        }
      });
      this.ready = true;
      return true;
    } catch (e) {
      console.error('WebLLM initialization failed:', e);
      return false;
    }
  }

  async generate(prompt, config = {}) {
    if (!this.ready) {
      return { error: 'WebLLM not ready', fallback: true };
    }

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: prompt }
    ];

    try {
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 1024,
        top_p: config.top_p || 0.95
      });

      const completion = response.choices[0]?.message?.content || '';

      return {
        completion,
        model: this.modelId,
        tokens_used: response.usage?.total_tokens || 0,
        source: 'webllm'
      };
    } catch (e) {
      return { error: e.message, fallback: true };
    }
  }

  async unload() {
    if (this.engine) {
      await this.engine.unload();
      this.ready = false;
    }
  }
}

/* ============================================================
   API CONNECTOR FRAMEWORK
   External model API integration
   ============================================================ */

class APIConnector {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.config = config;
    this.apiKey = null;
    this.baseUrl = this.getBaseUrl(provider);
  }

  getBaseUrl(provider) {
    const urls = {
      'openrouter': 'https://openrouter.ai/api/v1',
      'together': 'https://api.together.xyz/v1',
      'groq': 'https://api.groq.com/openai/v1',
      'custom': this.config.baseUrl || ''
    };
    return urls[provider] || urls.custom;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async generate(prompt, modelId, config = {}) {
    if (!this.apiKey) {
      return { error: 'API key not set', fallback: true };
    }

    const messages = [
      { role: 'user', content: prompt }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': self.location?.origin || 'https://mx2lm.local',
          'X-Title': 'MX2LM Cognitive Runtime'
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: config.temperature || 0.7,
          max_tokens: config.max_tokens || 1024,
          top_p: config.top_p || 0.95
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { error: `API error: ${error}`, fallback: true };
      }

      const data = await response.json();
      const completion = data.choices?.[0]?.message?.content || '';

      return {
        completion,
        model: modelId,
        tokens_used: data.usage?.total_tokens || 0,
        source: this.provider
      };
    } catch (e) {
      return { error: e.message, fallback: true };
    }
  }
}

/* ============================================================
   MISTRAL GLYPH BRAIN (Native MX2LM Brain)
   Executable glyph-based cognition
   ============================================================ */

class MistralGlyphBrain {
  constructor() {
    this.spec = null;
    this.codex = new Map();
    this.semanticWeights = new Map();
    this.executionStack = [];
    this.trace = [];
  }

  async initialize() {
    try {
      const res = await fetch('./brains/models/mistral_mx2lm_brain.json', { cache: 'no-store' });
      if (!res.ok) return false;
      this.spec = await res.json();
      this.buildCodex();
      return true;
    } catch (e) {
      console.error('Mistral Glyph Brain load failed:', e);
      return false;
    }
  }

  buildCodex() {
    if (!this.spec?.glyph_codex) return;

    // Build primitive codex
    const primitives = this.spec.glyph_codex.primitives;
    if (primitives?.numbers) {
      for (const [key, val] of Object.entries(primitives.numbers)) {
        this.codex.set(val.glyph, { type: 'number', key, ...val });
      }
    }
    if (primitives?.operators) {
      for (const [key, val] of Object.entries(primitives.operators)) {
        this.codex.set(val.glyph, { type: 'operator', key, ...val });
      }
    }

    // Build semantic codex
    const semantics = this.spec.glyph_codex.semantics;
    if (semantics?.nouns) {
      for (const [key, val] of Object.entries(semantics.nouns)) {
        this.codex.set(val.glyph, { type: 'noun', key, ...val });
        this.semanticWeights.set(key, val.pi_weight || 0.5);
      }
    }
    if (semantics?.verbs) {
      for (const [key, val] of Object.entries(semantics.verbs)) {
        this.codex.set(val.glyph, { type: 'verb', key, ...val });
      }
    }
    if (semantics?.actions) {
      for (const [key, val] of Object.entries(semantics.actions)) {
        this.codex.set(val.glyph, { type: 'action', key, ...val });
      }
    }
  }

  // Decompose natural language to glyphs
  decomposeToGlyphs(text) {
    const tokens = text.toLowerCase().split(/\s+/);
    const glyphs = [];

    for (const token of tokens) {
      // Check semantics
      for (const [glyph, entry] of this.codex) {
        if (entry.key === token || entry.domain === token) {
          glyphs.push({ glyph, ...entry });
          break;
        }
      }
    }

    return glyphs;
  }

  // Execute glyph sequence
  async execute(glyphs) {
    this.trace = [];
    const results = [];

    for (const glyph of glyphs) {
      const result = this.executeGlyph(glyph);
      this.trace.push({ input: glyph, output: result, tick: Date.now() });
      results.push(result);
    }

    return {
      results,
      trace: this.trace,
      pi_alignment: this.calculatePiAlignment(results)
    };
  }

  executeGlyph(glyph) {
    const entry = typeof glyph === 'string' ? this.codex.get(glyph) : glyph;
    if (!entry) return { type: 'unknown', value: glyph };

    switch (entry.type) {
      case 'number':
        return this.executeNumber(entry);
      case 'operator':
        return this.executeOperator(entry);
      case 'noun':
        return { type: 'domain', value: entry.domain, weight: entry.pi_weight };
      case 'verb':
        return { type: 'action', action: entry.action, effect: entry.pi_effect };
      case 'action':
        return { type: 'operation', operation: entry.operation };
      default:
        return { type: entry.type, value: entry };
    }
  }

  executeNumber(entry) {
    const key = entry.key;
    if (key === 'pi') return { type: 'number', value: Math.PI };
    if (key === 'phi') return { type: 'number', value: (1 + Math.sqrt(5)) / 2 };
    if (key === 'e') return { type: 'number', value: Math.E };
    if (key === '0') return { type: 'number', value: 0 };
    if (key === '1') return { type: 'number', value: 1 };
    return { type: 'number', value: parseFloat(key) || 0 };
  }

  executeOperator(entry) {
    return { type: 'operator', op: entry.key, meaning: entry.meaning };
  }

  // Pi-wave synthesis for answer generation
  piWaveSynthesis(results) {
    const PI = Math.PI;
    const PHI = (1 + Math.sqrt(5)) / 2;

    let narrative = [];
    let phase = 0;

    results.forEach((result, i) => {
      const waveValue = Math.sin(phase) * 0.5 + 0.5;
      const weight = result.weight || 0.5;
      const importance = waveValue * weight;

      narrative.push({
        step: i + 1,
        content: result,
        importance,
        phase_degrees: phase * 180 / PI
      });

      phase += PHI; // Golden ratio phase shift
    });

    return narrative.sort((a, b) => b.importance - a.importance);
  }

  calculatePiAlignment(results) {
    const weights = results
      .filter(r => r.weight !== undefined)
      .map(r => r.weight);

    if (weights.length === 0) return 0.5;
    return weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  // Generate response using glyph cognition
  async generate(prompt, config = {}) {
    const glyphs = this.decomposeToGlyphs(prompt);
    const execution = await this.execute(glyphs);
    const synthesis = this.piWaveSynthesis(execution.results);

    // Build response from synthesis
    const response = this.buildResponse(synthesis, prompt);

    return {
      completion: response,
      glyphs: glyphs.map(g => g.glyph || g),
      trace: execution.trace,
      pi_alignment: execution.pi_alignment,
      source: 'mistral_glyph'
    };
  }

  buildResponse(synthesis, originalPrompt) {
    // For now, a simple response builder
    // This will improve as the brain learns
    const domains = synthesis
      .filter(s => s.content.type === 'domain')
      .map(s => s.content.value);

    const actions = synthesis
      .filter(s => s.content.type === 'action')
      .map(s => s.content.action);

    if (domains.length === 0 && actions.length === 0) {
      return `Processing: "${originalPrompt}" - Glyph decomposition in progress. Learning from context.`;
    }

    let response = `Analyzing domains: ${domains.join(', ') || 'general'}. `;
    if (actions.length > 0) {
      response += `Actions identified: ${actions.join(', ')}. `;
    }
    response += `Pi-alignment: ${(synthesis[0]?.importance * 100 || 50).toFixed(1)}%`;

    return response;
  }

  // Update weights from RLHF
  applyRLHF(glyphs, reward) {
    for (const glyph of glyphs) {
      const entry = typeof glyph === 'string' ? this.codex.get(glyph) : glyph;
      if (entry?.key && this.semanticWeights.has(entry.key)) {
        const current = this.semanticWeights.get(entry.key);
        const updated = current + (reward * 0.01);
        this.semanticWeights.set(entry.key, Math.max(0, Math.min(1, updated)));
      }
    }
  }
}

/* ============================================================
   RLHF LEARNING ABSORBER
   Learn from all model interactions
   ============================================================ */

class RLHFLearningAbsorber {
  constructor() {
    this.interactions = [];
    this.patterns = new Map();
    this.ngramWeights = new Map();
    this.batchSize = 32;
    this.learningRate = 0.001;
  }

  // Record an interaction for learning
  recordInteraction(prompt, response, source, metadata = {}) {
    const interaction = {
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prompt,
      response,
      source,
      metadata,
      timestamp: Date.now(),
      reward: null,
      processed: false
    };

    this.interactions.push(interaction);

    // Extract patterns
    this.extractPatterns(prompt, response);

    // Keep buffer bounded
    if (this.interactions.length > 10000) {
      this.interactions = this.interactions.slice(-5000);
    }

    return interaction.id;
  }

  // Apply reinforcement to an interaction
  reinforce(interactionId, reward) {
    const interaction = this.interactions.find(i => i.id === interactionId);
    if (interaction) {
      interaction.reward = reward;
      this.updateWeights(interaction, reward);
    }
  }

  // Penalize an interaction
  penalize(interactionId, penalty) {
    this.reinforce(interactionId, -penalty);
  }

  // Extract n-gram patterns from prompt/response
  extractPatterns(prompt, response) {
    const tokens = prompt.toLowerCase().split(/\s+/);

    // Unigrams
    for (const token of tokens) {
      const count = this.patterns.get(token) || 0;
      this.patterns.set(token, count + 1);
    }

    // Bigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      const count = this.patterns.get(bigram) || 0;
      this.patterns.set(bigram, count + 1);
    }

    // Trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      const count = this.patterns.get(trigram) || 0;
      this.patterns.set(trigram, count + 1);
    }
  }

  // Update weights based on reward
  updateWeights(interaction, reward) {
    const tokens = interaction.prompt.toLowerCase().split(/\s+/);

    for (const token of tokens) {
      const current = this.ngramWeights.get(token) || 0.5;
      const updated = current + (reward * this.learningRate);
      this.ngramWeights.set(token, Math.max(0, Math.min(1, updated)));
    }

    interaction.processed = true;
  }

  // Get learning statistics
  getStats() {
    const processed = this.interactions.filter(i => i.processed).length;
    const reinforced = this.interactions.filter(i => i.reward !== null && i.reward > 0).length;
    const penalized = this.interactions.filter(i => i.reward !== null && i.reward < 0).length;

    return {
      total_interactions: this.interactions.length,
      processed,
      reinforced,
      penalized,
      unique_patterns: this.patterns.size,
      weighted_tokens: this.ngramWeights.size,
      avg_reward: this.calculateAvgReward()
    };
  }

  calculateAvgReward() {
    const withReward = this.interactions.filter(i => i.reward !== null);
    if (withReward.length === 0) return 0;
    return withReward.reduce((sum, i) => sum + i.reward, 0) / withReward.length;
  }

  // Export learned weights
  exportWeights() {
    return {
      ngram_weights: Object.fromEntries(this.ngramWeights),
      patterns: Object.fromEntries(
        Array.from(this.patterns.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1000)
      ),
      stats: this.getStats()
    };
  }

  // Import previously learned weights
  importWeights(data) {
    if (data.ngram_weights) {
      this.ngramWeights = new Map(Object.entries(data.ngram_weights));
    }
    if (data.patterns) {
      this.patterns = new Map(Object.entries(data.patterns));
    }
  }
}

/* ============================================================
   BRAIN ORCHESTRATOR
   Routes requests to appropriate models and learns
   ============================================================ */

class BrainOrchestrator {
  constructor() {
    this.registry = null;
    this.connectors = new Map();
    this.glyphBrain = new MistralGlyphBrain();
    this.learner = new RLHFLearningAbsorber();
    this.ready = false;
  }

  async initialize() {
    // Load registry
    this.registry = await loadBrainModelRegistry();
    if (!this.registry) {
      console.error('Failed to load brain model registry');
      return false;
    }

    // Initialize glyph brain
    await this.glyphBrain.initialize();

    // Initialize API connectors
    this.connectors.set('openrouter', new APIConnector('openrouter'));
    this.connectors.set('together', new APIConnector('together'));
    this.connectors.set('groq', new APIConnector('groq'));

    this.ready = true;
    return true;
  }

  // Set API key for a provider
  setApiKey(provider, key) {
    const connector = this.connectors.get(provider);
    if (connector) {
      connector.setApiKey(key);
    }
  }

  // Route query to best model
  async route(prompt, options = {}) {
    const category = this.categorizeQuery(prompt);
    const models = this.registry?.routing_rules?.[category] || ['mistral_glyph'];

    // Try models in priority order
    for (const modelId of models) {
      const result = await this.executeModel(modelId, prompt, options);
      if (!result.error && !result.fallback) {
        // Record for learning
        const interactionId = this.learner.recordInteraction(
          prompt,
          result.completion,
          result.source,
          { model: modelId, category }
        );
        result.interaction_id = interactionId;
        return result;
      }
    }

    // Fallback to glyph brain
    return this.executeModel('mistral_glyph', prompt, options);
  }

  // Categorize query for routing
  categorizeQuery(prompt) {
    const lower = prompt.toLowerCase();

    if (/\b(calculate|equation|formula|math|pi|solve)\b/.test(lower)) {
      return 'math_queries';
    }
    if (/\b(code|function|algorithm|program|debug)\b/.test(lower)) {
      return 'code_queries';
    }
    if (/\b(image|picture|photo|visual|see)\b/.test(lower)) {
      return 'vision_queries';
    }
    if (/\b(fast|quick|brief)\b/.test(lower)) {
      return 'fast_response';
    }
    if (/\b(detailed|thorough|comprehensive)\b/.test(lower)) {
      return 'high_quality';
    }

    return 'general_chat';
  }

  // Execute a specific model
  async executeModel(modelId, prompt, options = {}) {
    const modelConfig = this.registry?.models?.[modelId];
    if (!modelConfig) {
      return { error: `Model ${modelId} not found`, fallback: true };
    }

    switch (modelConfig.type) {
      case 'GLYPH_NATIVE':
        return this.glyphBrain.generate(prompt, options);

      case 'LOCAL_WEBLLM':
        // WebLLM handled via message to main thread
        return {
          completion: `[WebLLM ${modelId} - requires main thread initialization]`,
          source: 'webllm_pending',
          model: modelId
        };

      case 'API_EXTERNAL':
        const connector = this.connectors.get(modelConfig.provider);
        if (!connector) {
          return { error: `Provider ${modelConfig.provider} not configured`, fallback: true };
        }
        return connector.generate(prompt, modelConfig.model_id, options);

      default:
        return { error: `Unknown model type: ${modelConfig.type}`, fallback: true };
    }
  }

  // Apply reinforcement to last interaction
  reinforce(interactionId, reward) {
    this.learner.reinforce(interactionId, reward);

    // Also update glyph brain if it was used
    const interaction = this.learner.interactions.find(i => i.id === interactionId);
    if (interaction?.source === 'mistral_glyph') {
      const glyphs = this.glyphBrain.decomposeToGlyphs(interaction.prompt);
      this.glyphBrain.applyRLHF(glyphs, reward);
    }
  }

  // Penalize last interaction
  penalize(interactionId, penalty) {
    this.reinforce(interactionId, -penalty);
  }

  // Get orchestrator status
  getStatus() {
    return {
      ready: this.ready,
      models_available: Object.keys(this.registry?.models || {}),
      glyph_brain_ready: !!this.glyphBrain.spec,
      connectors: Array.from(this.connectors.keys()),
      learning_stats: this.learner.getStats()
    };
  }

  // Export learned knowledge
  exportKnowledge() {
    return {
      rlhf: this.learner.exportWeights(),
      glyph_weights: Object.fromEntries(this.glyphBrain.semanticWeights),
      timestamp: Date.now()
    };
  }

  // Import previously learned knowledge
  importKnowledge(data) {
    if (data.rlhf) {
      this.learner.importWeights(data.rlhf);
    }
    if (data.glyph_weights) {
      for (const [key, value] of Object.entries(data.glyph_weights)) {
        this.glyphBrain.semanticWeights.set(key, value);
      }
    }
  }
}

/* ============================================================
   EXPORTS FOR SW.JS INTEGRATION
   ============================================================ */

// Global orchestrator instance
const BRAIN_ORCHESTRATOR = new BrainOrchestrator();

// Export for use in sw.js
if (typeof self !== 'undefined') {
  self.BRAIN_ORCHESTRATOR = BRAIN_ORCHESTRATOR;
  self.WebLLMConnector = WebLLMConnector;
  self.APIConnector = APIConnector;
  self.MistralGlyphBrain = MistralGlyphBrain;
  self.RLHFLearningAbsorber = RLHFLearningAbsorber;
}
