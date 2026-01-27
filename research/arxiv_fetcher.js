/* ============================================================
   ARXIV RESEARCH PAPER FETCHER
   π-KUHUL Knowledge Acquisition Engine
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * ArxivFetcher - Fetches and parses research papers from arXiv
 * Integrates with MX2LM n-gram memory for knowledge ingestion
 */
class ArxivFetcher {
  constructor(config = {}) {
    this.baseUrl = 'https://export.arxiv.org/api/query';
    this.maxResults = config.maxResults || 10;
    this.cache = new Map();
    this.cacheExpiry = config.cacheExpiry || 3600000; // 1 hour

    // Research categories relevant to MX2LM
    this.categories = {
      'cs.AI': 'Artificial Intelligence',
      'cs.CL': 'Computation and Language',
      'cs.LG': 'Machine Learning',
      'cs.CV': 'Computer Vision',
      'cs.NE': 'Neural and Evolutionary Computing',
      'stat.ML': 'Machine Learning (Statistics)',
      'math.OC': 'Optimization and Control'
    };

    // Key research topics for π-KUHUL
    this.piKuhulTopics = [
      'transformer architecture',
      'attention mechanism',
      'neural compression',
      'language model',
      'multimodal learning',
      'vision language model',
      'reinforcement learning human feedback',
      'n-gram language model',
      'golden ratio neural',
      'fractal neural network'
    ];

    // Paper storage
    this.papers = [];
    this.lastFetch = null;
  }

  /**
   * Build arXiv API query URL
   */
  buildQueryUrl(query, options = {}) {
    const params = new URLSearchParams({
      search_query: query,
      start: options.start || 0,
      max_results: options.maxResults || this.maxResults,
      sortBy: options.sortBy || 'relevance',
      sortOrder: options.sortOrder || 'descending'
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Fetch papers from arXiv API
   */
  async fetchPapers(query, options = {}) {
    const cacheKey = `${query}_${JSON.stringify(options)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const url = this.buildQueryUrl(query, options);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivXml(xmlText);

      // Cache results
      this.cache.set(cacheKey, {
        data: papers,
        timestamp: Date.now()
      });

      // Store papers
      this.papers.push(...papers);
      this.lastFetch = Date.now();

      return papers;
    } catch (error) {
      console.error('ArxivFetcher error:', error);
      return { error: error.message, papers: [] };
    }
  }

  /**
   * Parse arXiv Atom XML response
   */
  parseArxivXml(xmlText) {
    const papers = [];

    // Simple XML parsing (regex-based for Service Worker compatibility)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];

      const paper = {
        id: this.extractTag(entry, 'id'),
        title: this.extractTag(entry, 'title').replace(/\s+/g, ' ').trim(),
        summary: this.extractTag(entry, 'summary').replace(/\s+/g, ' ').trim(),
        published: this.extractTag(entry, 'published'),
        updated: this.extractTag(entry, 'updated'),
        authors: this.extractAuthors(entry),
        categories: this.extractCategories(entry),
        pdfLink: this.extractPdfLink(entry),
        arxivId: this.extractArxivId(entry)
      };

      // Extract key concepts using π-KUHUL analysis
      paper.concepts = this.extractConcepts(paper.title + ' ' + paper.summary);
      paper.relevanceScore = this.calculateRelevance(paper);

      papers.push(paper);
    }

    return papers.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Extract XML tag content
   */
  extractTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract authors from entry
   */
  extractAuthors(entry) {
    const authors = [];
    const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
    let match;

    while ((match = authorRegex.exec(entry)) !== null) {
      authors.push(match[1].trim());
    }

    return authors;
  }

  /**
   * Extract categories from entry
   */
  extractCategories(entry) {
    const categories = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let match;

    while ((match = catRegex.exec(entry)) !== null) {
      categories.push(match[1]);
    }

    return categories;
  }

  /**
   * Extract PDF link
   */
  extractPdfLink(entry) {
    const pdfMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    return pdfMatch ? pdfMatch[1] : null;
  }

  /**
   * Extract arXiv ID
   */
  extractArxivId(entry) {
    const id = this.extractTag(entry, 'id');
    const match = id.match(/abs\/(\d+\.\d+)/);
    return match ? match[1] : id;
  }

  /**
   * Extract key concepts using π-KUHUL inspired analysis
   */
  extractConcepts(text) {
    const concepts = [];
    const lowerText = text.toLowerCase();

    // Key ML/AI concepts
    const conceptPatterns = [
      { pattern: /transformer/i, concept: 'transformer' },
      { pattern: /attention/i, concept: 'attention' },
      { pattern: /language model/i, concept: 'language_model' },
      { pattern: /neural network/i, concept: 'neural_network' },
      { pattern: /deep learning/i, concept: 'deep_learning' },
      { pattern: /reinforcement learning/i, concept: 'reinforcement_learning' },
      { pattern: /compression/i, concept: 'compression' },
      { pattern: /multimodal/i, concept: 'multimodal' },
      { pattern: /vision/i, concept: 'vision' },
      { pattern: /generation/i, concept: 'generation' },
      { pattern: /diffusion/i, concept: 'diffusion' },
      { pattern: /embedding/i, concept: 'embedding' },
      { pattern: /tokeniz/i, concept: 'tokenization' },
      { pattern: /fine.?tun/i, concept: 'fine_tuning' },
      { pattern: /pretrain/i, concept: 'pretraining' },
      { pattern: /rlhf/i, concept: 'rlhf' },
      { pattern: /n.?gram/i, concept: 'ngram' },
      { pattern: /autoencoder/i, concept: 'autoencoder' },
      { pattern: /variational/i, concept: 'variational' },
      { pattern: /quantiz/i, concept: 'quantization' }
    ];

    for (const { pattern, concept } of conceptPatterns) {
      if (pattern.test(lowerText)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  /**
   * Calculate relevance score for MX2LM
   */
  calculateRelevance(paper) {
    let score = 0;

    // Concept-based scoring
    const highValueConcepts = ['transformer', 'language_model', 'compression', 'rlhf', 'multimodal'];
    for (const concept of paper.concepts) {
      if (highValueConcepts.includes(concept)) {
        score += 2;
      } else {
        score += 1;
      }
    }

    // Category-based scoring
    const relevantCategories = ['cs.CL', 'cs.LG', 'cs.AI', 'cs.CV'];
    for (const cat of paper.categories) {
      if (relevantCategories.includes(cat)) {
        score += 1;
      }
    }

    // Recency bonus (papers from last 6 months)
    const publishedDate = new Date(paper.published);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (publishedDate > sixMonthsAgo) {
      score += 2;
    }

    return score;
  }

  /**
   * Search for π-KUHUL relevant papers
   */
  async searchPiKuhulPapers() {
    const results = [];

    for (const topic of this.piKuhulTopics.slice(0, 5)) {
      const papers = await this.fetchPapers(topic, { maxResults: 5 });
      if (!papers.error) {
        results.push(...papers);
      }
    }

    // Deduplicate by arxivId
    const seen = new Set();
    return results.filter(p => {
      if (seen.has(p.arxivId)) return false;
      seen.add(p.arxivId);
      return true;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get paper by arXiv ID
   */
  async getPaperById(arxivId) {
    const papers = await this.fetchPapers(`id:${arxivId}`, { maxResults: 1 });
    return papers[0] || null;
  }

  /**
   * Convert paper to n-gram ingestible format
   */
  paperToIngestFormat(paper) {
    return {
      text: `${paper.title}. ${paper.summary}`,
      metadata: {
        source: 'arxiv',
        arxivId: paper.arxivId,
        authors: paper.authors.join(', '),
        categories: paper.categories.join(', '),
        concepts: paper.concepts,
        published: paper.published,
        pdfLink: paper.pdfLink
      }
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalPapers: this.papers.length,
      cacheSize: this.cache.size,
      lastFetch: this.lastFetch,
      categories: this.categories,
      piKuhulTopics: this.piKuhulTopics
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.ArxivFetcher = ArxivFetcher;
}
