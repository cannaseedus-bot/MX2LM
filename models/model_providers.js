/* ============================================================
   MULTI-PROVIDER MODEL API
   π-KUHUL Universal Model Interface
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * ModelProvider - Base class for all model providers
 * Implements π-KUHUL compression and XJSON XCFE AST
 */
class ModelProvider {
  constructor(config = {}) {
    this.name = config.name || 'base';
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl || '';
    this.model = config.model || '';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;

    // π-KUHUL constants for compression
    this.PHI = 1.6180339887498948;
    this.PI = Math.PI;

    // Request/response history
    this.history = [];
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      avgLatency: 0,
      errors: 0
    };
  }

  /**
   * Make API request - to be overridden by subclasses
   */
  async request(messages, options = {}) {
    throw new Error('request() must be implemented by subclass');
  }

  /**
   * Compress prompt using π-KUHUL principles
   */
  compressPrompt(prompt) {
    // Apply golden ratio compression
    const words = prompt.split(/\s+/);
    const targetLength = Math.floor(words.length / this.PHI);

    if (words.length <= targetLength) {
      return prompt;
    }

    // Keep most important words (first and golden-ratio spaced)
    const compressed = [];
    for (let i = 0; i < words.length && compressed.length < targetLength; i++) {
      if (i === 0 || i % Math.floor(this.PHI) === 0) {
        compressed.push(words[i]);
      }
    }

    return compressed.join(' ');
  }

  /**
   * Build XJSON XCFE AST from response
   */
  buildXcfeAst(response) {
    return {
      '@type': 'xcfe/response',
      '@id': `resp_${Date.now()}`,
      '@provider': this.name,
      '@model': this.model,
      '@data': {
        content: response.content || response,
        tokens: response.usage?.total_tokens || 0,
        compressed: this.compressPrompt(response.content || ''),
        glyph: this.responseToGlyph(response)
      },
      '@meta': {
        timestamp: Date.now(),
        latency: response.latency || 0
      }
    };
  }

  /**
   * Convert response to glyph representation
   */
  responseToGlyph(response) {
    const content = response.content || response;
    const length = content.length;

    // Encode length as π-ratio
    const piRatio = Math.round((length / this.PI) * 100) / 100;
    return `⟁${this.name[0]}${piRatio}`;
  }

  /**
   * Record request metrics
   */
  recordMetrics(latency, tokens, error = false) {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokens;
    this.metrics.avgLatency = (
      (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests
    );
    if (error) this.metrics.errors++;
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      name: this.name,
      model: this.model,
      configured: !!this.apiKey,
      metrics: this.metrics
    };
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: config.model || 'gpt-4-turbo-preview',
      ...config
    });
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * Anthropic Claude Provider
 */
class ClaudeProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'claude',
      baseUrl: 'https://api.anthropic.com/v1',
      model: config.model || 'claude-3-5-sonnet-20241022',
      ...config
    });
    this.apiVersion = config.apiVersion || '2023-06-01';
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      // Convert messages to Claude format
      const claudeMessages = messages.filter(m => m.role !== 'system');
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion
        },
        body: JSON.stringify({
          model: options.model || this.model,
          max_tokens: options.maxTokens || this.maxTokens,
          system: systemMessage,
          messages: claudeMessages
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.content[0]?.text || '',
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        latency,
        model: data.model
      };

      this.recordMetrics(latency, result.usage.total_tokens);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * legacy Provider
 */
class legacyProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'legacy',
      baseUrl: 'https://api.legacy.com/v1',
      model: config.model || 'legacy-chat',
      ...config
    });
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * Mistral Provider
 */
class MistralProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      model: config.model || 'mistral-large-latest',
      ...config
    });
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * OpenRouter Provider (Multi-model gateway)
 */
class OpenRouterProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: config.model || 'legacy/legacy-chat',
      ...config
    });
    this.siteUrl = config.siteUrl || '';
    this.siteName = config.siteName || 'MX2LM';
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * Together AI Provider
 */
class TogetherProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'together',
      baseUrl: 'https://api.together.xyz/v1',
      model: config.model || 'meta-llama/Llama-3-70b-chat-hf',
      ...config
    });
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * Groq Provider (Fast inference)
 */
class GroqProvider extends ModelProvider {
  constructor(config = {}) {
    super({
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: config.model || 'llama3-70b-8192',
      ...config
    });
  }

  async request(messages, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature
        })
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (data.error) {
        this.recordMetrics(latency, 0, true);
        return { error: data.error.message };
      }

      const result = {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        latency,
        model: data.model
      };

      this.recordMetrics(latency, data.usage?.total_tokens || 0);
      return this.buildXcfeAst(result);
    } catch (error) {
      this.recordMetrics(Date.now() - startTime, 0, true);
      return { error: error.message };
    }
  }
}

/**
 * ModelProviderManager - Manages multiple providers with routing
 */
class ModelProviderManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.routingRules = [];

    // π-KUHUL routing weights
    this.PHI = 1.6180339887498948;
  }

  /**
   * Register a provider
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = name;
    }
    return this;
  }

  /**
   * Initialize all providers from config
   */
  initializeFromConfig(config) {
    const providerClasses = {
      openai: OpenAIProvider,
      claude: ClaudeProvider,
      legacy: legacyProvider,
      mistral: MistralProvider,
      openrouter: OpenRouterProvider,
      together: TogetherProvider,
      groq: GroqProvider
    };

    for (const [name, providerConfig] of Object.entries(config.providers || {})) {
      if (providerConfig.enabled && providerConfig.apiKey) {
        const ProviderClass = providerClasses[name];
        if (ProviderClass) {
          this.registerProvider(name, new ProviderClass(providerConfig));
        }
      }
    }

    if (config.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }

    return this;
  }

  /**
   * Add routing rule
   */
  addRoutingRule(condition, providerName, priority = 0) {
    this.routingRules.push({ condition, providerName, priority });
    this.routingRules.sort((a, b) => b.priority - a.priority);
    return this;
  }

  /**
   * Route request to appropriate provider
   */
  routeRequest(messages, options = {}) {
    // Check explicit provider
    if (options.provider && this.providers.has(options.provider)) {
      return options.provider;
    }

    // Apply routing rules
    for (const rule of this.routingRules) {
      if (rule.condition(messages, options)) {
        if (this.providers.has(rule.providerName)) {
          return rule.providerName;
        }
      }
    }

    return this.defaultProvider;
  }

  /**
   * Make request with automatic routing
   */
  async request(messages, options = {}) {
    const providerName = this.routeRequest(messages, options);
    const provider = this.providers.get(providerName);

    if (!provider) {
      return { error: 'No provider available' };
    }

    return provider.request(messages, options);
  }

  /**
   * Make request to specific provider
   */
  async requestTo(providerName, messages, options = {}) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return { error: `Provider ${providerName} not found` };
    }
    return provider.request(messages, options);
  }

  /**
   * Get all provider statuses
   */
  getStatus() {
    const statuses = {};
    for (const [name, provider] of this.providers) {
      statuses[name] = provider.getStatus();
    }
    return {
      providers: statuses,
      defaultProvider: this.defaultProvider,
      routingRules: this.routingRules.length
    };
  }

  /**
   * List available providers
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * List available models per provider
   */
  listModels() {
    const models = {};

    models.openai = [
      'gpt-4-turbo-preview', 'gpt-4', 'gpt-4-32k',
      'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'
    ];

    models.claude = [
      'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229',
      'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'
    ];

    models.legacy = [
      'legacy-chat', 'legacy-coder'
    ];

    models.mistral = [
      'mistral-large-latest', 'mistral-medium-latest',
      'mistral-small-latest', 'open-mixtral-8x22b'
    ];

    models.together = [
      'meta-llama/Llama-3-70b-chat-hf',
      'meta-llama/Llama-3-8b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1'
    ];

    models.groq = [
      'llama3-70b-8192', 'llama3-8b-8192',
      'mixtral-8x7b-32768', 'gemma-7b-it'
    ];

    models.openrouter = [
      'legacy/legacy-chat',
      'anthropic/claude-3-5-sonnet',
      'google/gemini-pro',
      'meta-llama/llama-3-70b-instruct'
    ];

    return models;
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.ModelProvider = ModelProvider;
  self.OpenAIProvider = OpenAIProvider;
  self.ClaudeProvider = ClaudeProvider;
  self.legacyProvider = legacyProvider;
  self.MistralProvider = MistralProvider;
  self.OpenRouterProvider = OpenRouterProvider;
  self.TogetherProvider = TogetherProvider;
  self.GroqProvider = GroqProvider;
  self.ModelProviderManager = ModelProviderManager;
}
