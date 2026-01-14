/* ============================================================
   MX2LM CHAT INFERENCE & WEB LEARNING ENGINE

   Based on Mistral specification for self-learning cognition
   - Question decomposition to glyph queries
   - Web data ingestion and encoding
   - P2P glyph network for distributed knowledge
   - Pi-KUHUL inference with execution traces

   Law: OMEGA-BLACK-PANEL
   ============================================================ */

/* ============================================================
   WEB DATA SCRAPER
   Ingests knowledge from web sources
   ============================================================ */

class WebDataScraper {
  constructor() {
    this.sources = {
      'wikipedia': 'https://en.wikipedia.org/api/rest_v1/page/summary/',
      'duckduckgo': 'https://api.duckduckgo.com/?format=json&q=',
      'arxiv': 'https://export.arxiv.org/api/query?search_query='
    };
    this.cache = new Map();
    this.cacheMaxAge = 1000 * 60 * 60; // 1 hour
  }

  async scrape(source, query) {
    const cacheKey = `${source}:${query}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.data;
    }

    try {
      const url = this.sources[source];
      if (!url) {
        return { error: `Unknown source: ${source}` };
      }

      // For Service Worker, we use fetch
      const response = await fetch(url + encodeURIComponent(query), {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return { error: `Fetch failed: ${response.status}` };
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (e) {
      return { error: e.message };
    }
  }

  // Extract text content from various API response formats
  extractText(data, source) {
    switch (source) {
      case 'wikipedia':
        return data.extract || data.title || '';
      case 'duckduckgo':
        return data.AbstractText || data.Heading || '';
      case 'arxiv':
        // arxiv returns XML, would need parsing
        return typeof data === 'string' ? data : JSON.stringify(data);
      default:
        return JSON.stringify(data);
    }
  }
}

/* ============================================================
   DATA ENCODER
   Converts text to glyph sequences
   ============================================================ */

class DataEncoder {
  constructor(codex) {
    this.codex = codex;
    this.stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once'
    ]);
  }

  encode(text) {
    const keywords = this.extractKeywords(text);
    const glyphs = keywords.map(kw => this.mapToGlyph(kw));
    return {
      glyphs,
      keywords,
      encoded: glyphs.join('')
    };
  }

  extractKeywords(text) {
    if (!text || typeof text !== 'string') return [];

    // Tokenize
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);

    // Remove stop words and deduplicate
    const keywords = [...new Set(
      tokens.filter(t => !this.stopWords.has(t))
    )];

    // Sort by length (longer words often more specific)
    return keywords.sort((a, b) => b.length - a.length).slice(0, 20);
  }

  mapToGlyph(keyword) {
    // Check semantic mappings
    const semanticMap = {
      // Math domain
      'math': 'triangular_ruler', 'mathematics': 'triangular_ruler',
      'calculate': 'bar_chart', 'compute': 'bar_chart',
      'equation': 'plus', 'formula': 'plus',
      'pi': 'pi', 'ratio': 'divide',

      // Code domain
      'code': 'computer', 'program': 'computer', 'software': 'computer',
      'function': 'arrows_clockwise', 'algorithm': 'arrows_clockwise',
      'loop': 'repeat', 'iterate': 'repeat',

      // Physics domain
      'physics': 'atom', 'quantum': 'atom', 'particle': 'atom',
      'wave': 'ocean', 'frequency': 'ocean', 'oscillate': 'ocean',
      'energy': 'zap', 'force': 'zap',

      // Patterns
      'pattern': 'cyclone', 'fractal': 'cyclone', 'spiral': 'cyclone',
      'recursive': 'cyclone', 'self-similar': 'cyclone',

      // Actions
      'learn': 'brain', 'understand': 'brain', 'think': 'brain',
      'explain': 'bulb', 'describe': 'bulb', 'define': 'bulb',
      'solve': 'input_numbers', 'find': 'mag', 'search': 'mag',
      'store': 'file_cabinet', 'save': 'file_cabinet',
      'connect': 'link', 'relate': 'link'
    };

    return semanticMap[keyword] || `raw:${keyword}`;
  }
}

/* ============================================================
   WEB LEARNING ENGINE
   Learns from web data and updates codex
   ============================================================ */

class WebLearningEngine {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.scraper = new WebDataScraper();
    this.encoder = new DataEncoder();
    this.learnedPatterns = new Map();
    this.learningHistory = [];
  }

  async learnFromWeb(query, sources = ['wikipedia', 'duckduckgo']) {
    const results = [];

    for (const source of sources) {
      try {
        const data = await this.scraper.scrape(source, query);
        if (data.error) continue;

        const text = this.scraper.extractText(data, source);
        const encoded = this.encoder.encode(text);

        // Store learned patterns
        for (const keyword of encoded.keywords) {
          const count = this.learnedPatterns.get(keyword) || 0;
          this.learnedPatterns.set(keyword, count + 1);
        }

        results.push({
          source,
          text: text.substring(0, 500),
          glyphs: encoded.glyphs,
          keywords: encoded.keywords
        });

        // Record in learning history
        this.learningHistory.push({
          query,
          source,
          timestamp: Date.now(),
          keywords_learned: encoded.keywords.length
        });

      } catch (e) {
        console.error(`Learning from ${source} failed:`, e);
      }
    }

    // Keep history bounded
    if (this.learningHistory.length > 1000) {
      this.learningHistory = this.learningHistory.slice(-500);
    }

    return {
      query,
      sources: results,
      total_patterns: this.learnedPatterns.size,
      learning_events: this.learningHistory.length
    };
  }

  // Get most common learned patterns
  getTopPatterns(limit = 50) {
    return Array.from(this.learnedPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  // Export learned knowledge
  exportKnowledge() {
    return {
      patterns: Object.fromEntries(this.learnedPatterns),
      history_count: this.learningHistory.length,
      top_patterns: this.getTopPatterns(100)
    };
  }

  // Import previously learned knowledge
  importKnowledge(data) {
    if (data.patterns) {
      for (const [pattern, count] of Object.entries(data.patterns)) {
        const current = this.learnedPatterns.get(pattern) || 0;
        this.learnedPatterns.set(pattern, current + count);
      }
    }
  }
}

/* ============================================================
   QUESTION DECOMPOSER
   Breaks questions into glyph queries
   ============================================================ */

class QuestionDecomposer {
  constructor() {
    this.encoder = new DataEncoder();
    this.questionPatterns = {
      'what': { type: 'definition', priority: 1 },
      'how': { type: 'process', priority: 2 },
      'why': { type: 'explanation', priority: 3 },
      'when': { type: 'temporal', priority: 4 },
      'where': { type: 'location', priority: 5 },
      'who': { type: 'entity', priority: 6 },
      'which': { type: 'selection', priority: 7 },
      'can': { type: 'capability', priority: 8 },
      'does': { type: 'verification', priority: 9 },
      'is': { type: 'verification', priority: 10 }
    };
  }

  decompose(question) {
    const lower = question.toLowerCase().trim();

    // Identify question type
    let questionType = 'general';
    let priority = 100;

    for (const [keyword, info] of Object.entries(this.questionPatterns)) {
      if (lower.startsWith(keyword)) {
        questionType = info.type;
        priority = info.priority;
        break;
      }
    }

    // Encode to glyphs
    const encoded = this.encoder.encode(question);

    // Build GlyphQL query
    const glyphQuery = this.buildGlyphQL(encoded.glyphs, questionType);

    return {
      original: question,
      type: questionType,
      priority,
      keywords: encoded.keywords,
      glyphs: encoded.glyphs,
      glyphQL: glyphQuery
    };
  }

  buildGlyphQL(glyphs, type) {
    // Filter out raw: prefixed glyphs for the query
    const cleanGlyphs = glyphs.filter(g => !g.startsWith('raw:'));

    if (cleanGlyphs.length === 0) {
      return `MATCH * LIMIT 5`;
    }

    const glyphPattern = cleanGlyphs.join('|');

    switch (type) {
      case 'definition':
        return `MATCH (${glyphPattern})* WITH type=definition LIMIT 10`;
      case 'process':
        return `MATCH (${glyphPattern})* WITH type=process ORDER BY steps LIMIT 10`;
      case 'explanation':
        return `MATCH (${glyphPattern})* WITH depth>1 LIMIT 10`;
      default:
        return `MATCH (${glyphPattern})* LIMIT 5`;
    }
  }
}

/* ============================================================
   GLYPH INFERENCE ENGINE
   Executes glyph queries and builds answers
   ============================================================ */

class GlyphInferenceEngine {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.decomposer = new QuestionDecomposer();
    this.trace = [];
    this.inferenceCache = new Map();
  }

  async infer(question, options = {}) {
    const startTime = Date.now();
    this.trace = [];

    // Check cache
    const cacheKey = question.toLowerCase().trim();
    if (!options.skipCache && this.inferenceCache.has(cacheKey)) {
      const cached = this.inferenceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 1000 * 60 * 5) { // 5 min cache
        return { ...cached.result, cached: true };
      }
    }

    // Step 1: Decompose question
    const decomposed = this.decomposer.decompose(question);
    this.trace.push({
      step: 'decompose',
      input: question,
      output: decomposed,
      timestamp: Date.now()
    });

    // Step 2: Execute through brain orchestrator
    let answer;
    if (this.orchestrator) {
      answer = await this.orchestrator.route(question, options);
      this.trace.push({
        step: 'brain_route',
        input: decomposed,
        output: answer,
        timestamp: Date.now()
      });
    } else {
      // Fallback: build answer from glyphs
      answer = this.buildAnswerFromGlyphs(decomposed);
      this.trace.push({
        step: 'glyph_build',
        input: decomposed,
        output: answer,
        timestamp: Date.now()
      });
    }

    // Step 3: Pi-wave synthesis for coherent narrative
    const synthesized = this.piWaveSynthesis(answer, decomposed);
    this.trace.push({
      step: 'pi_synthesis',
      input: answer,
      output: synthesized,
      timestamp: Date.now()
    });

    // Build final result
    const result = {
      question,
      answer: synthesized.narrative,
      decomposition: decomposed,
      source: answer.source || 'glyph_inference',
      confidence: synthesized.confidence,
      trace: options.includeTrace ? this.trace : undefined,
      inference_time_ms: Date.now() - startTime
    };

    // Cache result
    this.inferenceCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Keep cache bounded
    if (this.inferenceCache.size > 1000) {
      const oldest = Array.from(this.inferenceCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 500);
      this.inferenceCache = new Map(oldest);
    }

    return result;
  }

  buildAnswerFromGlyphs(decomposed) {
    const { keywords, glyphs, type } = decomposed;

    // Build answer based on question type
    let answerText = '';

    switch (type) {
      case 'definition':
        answerText = `${keywords[0] || 'This'} is related to ${keywords.slice(1, 4).join(', ') || 'various concepts'}.`;
        break;
      case 'process':
        answerText = `To understand ${keywords[0] || 'this'}, consider: ${keywords.slice(1, 5).join(' -> ') || 'the process'}.`;
        break;
      case 'explanation':
        answerText = `The reason involves: ${keywords.slice(0, 4).join(', ') || 'multiple factors'}.`;
        break;
      default:
        answerText = `Analyzing: ${keywords.slice(0, 5).join(', ') || 'the query'}...`;
    }

    return {
      completion: answerText,
      glyphs,
      keywords,
      source: 'glyph_native'
    };
  }

  piWaveSynthesis(answer, decomposed) {
    const PI = Math.PI;
    const PHI = (1 + Math.sqrt(5)) / 2;

    // Calculate confidence based on keyword coverage and glyph count
    const keywordWeight = Math.min(1, decomposed.keywords.length / 10);
    const glyphWeight = Math.min(1, decomposed.glyphs.filter(g => !g.startsWith('raw:')).length / 5);

    // Pi-wave modulated confidence
    const phase = (keywordWeight + glyphWeight) * PI;
    const waveModulation = (Math.sin(phase) + 1) / 2;
    const confidence = 0.3 + (0.6 * waveModulation);

    // Build narrative with phi-based structure
    let narrative = answer.completion || '';

    if (answer.glyphs && answer.glyphs.length > 0) {
      narrative += ` [Glyph analysis: ${answer.glyphs.slice(0, 5).join(', ')}]`;
    }

    narrative += ` (Pi-alignment: ${(confidence * 100).toFixed(1)}%)`;

    return {
      narrative,
      confidence,
      pi_phase: phase,
      phi_factor: PHI
    };
  }

  // Get explanation of inference trace
  explain() {
    return this.trace.map((step, i) => ({
      step_number: i + 1,
      step_type: step.step,
      input_summary: typeof step.input === 'string'
        ? step.input.substring(0, 100)
        : JSON.stringify(step.input).substring(0, 100),
      output_summary: typeof step.output === 'string'
        ? step.output.substring(0, 100)
        : JSON.stringify(step.output).substring(0, 100),
      timestamp: step.timestamp
    }));
  }
}

/* ============================================================
   P2P GLYPH NETWORK
   Distributed knowledge sharing
   ============================================================ */

class P2PGlyphNetwork {
  constructor(peerId) {
    this.peerId = peerId || `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.peers = new Map();
    this.glyphCache = new Map();
    this.messageHandlers = new Map();
  }

  // In a real implementation, this would use WebRTC
  // For now, it's a local cache simulation

  async queryNetwork(glyphPattern, limit = 10) {
    // Search local cache
    const results = [];

    for (const [key, glyph] of this.glyphCache) {
      if (this.matchesPattern(key, glyphPattern)) {
        results.push(glyph);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  matchesPattern(key, pattern) {
    if (!pattern) return true;
    const patternParts = pattern.split('|');
    return patternParts.some(p => key.includes(p));
  }

  shareGlyph(glyph) {
    const key = glyph.id || `glyph_${Date.now()}`;
    this.glyphCache.set(key, {
      ...glyph,
      shared_by: this.peerId,
      shared_at: Date.now()
    });
    return key;
  }

  getNetworkStats() {
    return {
      peer_id: this.peerId,
      connected_peers: this.peers.size,
      cached_glyphs: this.glyphCache.size
    };
  }
}

/* ============================================================
   CHAT INFERENCE COORDINATOR
   Main interface for chat-based inference
   ============================================================ */

class ChatInferenceCoordinator {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.inferenceEngine = new GlyphInferenceEngine(orchestrator);
    this.learningEngine = new WebLearningEngine(orchestrator);
    this.p2pNetwork = new P2PGlyphNetwork();
    this.conversationHistory = [];
  }

  async chat(message, options = {}) {
    // Record in history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // Perform inference
    const result = await this.inferenceEngine.infer(message, {
      ...options,
      conversationHistory: this.conversationHistory.slice(-10)
    });

    // Record response
    this.conversationHistory.push({
      role: 'assistant',
      content: result.answer,
      timestamp: Date.now()
    });

    // Optionally learn from web
    if (options.learnFromWeb && result.decomposition.keywords.length > 0) {
      const learningResult = await this.learningEngine.learnFromWeb(
        result.decomposition.keywords.slice(0, 3).join(' ')
      );
      result.learned = learningResult;
    }

    return result;
  }

  async learn(query) {
    return this.learningEngine.learnFromWeb(query);
  }

  getStats() {
    return {
      conversation_length: this.conversationHistory.length,
      learned_patterns: this.learningEngine.getTopPatterns(20),
      network_stats: this.p2pNetwork.getNetworkStats(),
      inference_cache_size: this.inferenceEngine.inferenceCache.size
    };
  }

  exportState() {
    return {
      conversation: this.conversationHistory.slice(-100),
      learning: this.learningEngine.exportKnowledge(),
      network: this.p2pNetwork.getNetworkStats()
    };
  }

  importState(state) {
    if (state.conversation) {
      this.conversationHistory = state.conversation;
    }
    if (state.learning) {
      this.learningEngine.importKnowledge(state.learning);
    }
  }
}

/* ============================================================
   EXPORTS
   ============================================================ */

// Global instances
const CHAT_INFERENCE = {
  coordinator: null,

  initialize(orchestrator) {
    this.coordinator = new ChatInferenceCoordinator(orchestrator);
    return this.coordinator;
  }
};

if (typeof self !== 'undefined') {
  self.CHAT_INFERENCE = CHAT_INFERENCE;
  self.WebDataScraper = WebDataScraper;
  self.DataEncoder = DataEncoder;
  self.WebLearningEngine = WebLearningEngine;
  self.QuestionDecomposer = QuestionDecomposer;
  self.GlyphInferenceEngine = GlyphInferenceEngine;
  self.P2PGlyphNetwork = P2PGlyphNetwork;
  self.ChatInferenceCoordinator = ChatInferenceCoordinator;
}
