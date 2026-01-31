/* ============================================================
   VOICE INTERFACE FOR π-KUHUL GLYPH SYSTEM
   Speech-to-Glyph and Glyph-to-Speech
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * VoiceInterface - Natural language interaction with glyphs
 * Converts speech to glyph queries and glyph results to speech
 */
class VoiceInterface {
  constructor(options = {}) {
    // Speech Recognition
    this.recognition = null;
    this.recognitionSupported = false;

    // Speech Synthesis
    this.synthesis = null;
    this.synthesisSupported = false;
    this.voice = null;
    this.voices = [];

    // Configuration
    this.config = {
      language: options.language || 'en-US',
      continuous: options.continuous || false,
      interimResults: options.interimResults || true,
      maxAlternatives: options.maxAlternatives || 3,
      voiceRate: options.voiceRate || 1.0,
      voicePitch: options.voicePitch || 1.0,
      voiceVolume: options.voiceVolume || 1.0,
      preferredVoice: options.preferredVoice || null
    };

    // State
    this.isListening = false;
    this.isSpeaking = false;
    this.lastTranscript = '';
    this.lastGlyphQuery = null;

    // Event handlers
    this.handlers = new Map();

    // Glyph mappings for voice commands
    this.voiceGlyphMap = {
      // Numbers
      'zero': '⚡0', 'one': '⚡1', 'two': '⚡2', 'three': '⚡3',
      'four': '⚡4', 'five': '⚡5', 'six': '⚡6', 'seven': '⚡7',
      'eight': '⚡8', 'nine': '⚡9', 'ten': '⚡10',

      // Math operators
      'plus': '➕', 'add': '➕', 'minus': '➖', 'subtract': '➖',
      'times': '✖', 'multiply': '✖', 'divided by': '➗', 'divide': '➗',
      'power': '🔺', 'squared': '🔺 ⚡2', 'cubed': '🔺 ⚡3',
      'square root': '√', 'root': '√',

      // Constants
      'pi': '⚡π', 'pie': '⚡π', 'phi': '⚡φ', 'golden ratio': '⚡φ',
      'tau': '⚡τ', 'e': '⚡e', 'euler': '⚡e',

      // Comparison
      'equals': '⚖', 'equal to': '⚖', 'not equal': '≠',
      'less than': '⊂', 'greater than': '⊃',
      'less or equal': '⊆', 'greater or equal': '⊇',

      // Logic
      'and': '∧', 'or': '∨', 'not': '¬', 'exclusive or': '⊕',

      // Stack operations
      'duplicate': '↑', 'drop': '↓', 'swap': '↔', 'rotate': '↻',

      // π-KUHUL operations
      'wave': '🌊', 'pi wave': '🌊', 'quantum': '⚛', 'collapse': '⚛',
      'gradient': '∇', 'laplacian': '∆', 'integral': '∫',

      // Compression
      'compress': '⟁', 'decompress': '⟁⁻¹',

      // Control
      'stop': '⏹', 'halt': '⏹', 'loop': '⟳'
    };

    // Natural language patterns
    this.patterns = [
      { regex: /what is (\d+) (\w+) (\d+)/i, handler: 'mathQuery' },
      { regex: /calculate (\d+) (\w+) (\d+)/i, handler: 'mathQuery' },
      { regex: /(\d+) (\w+) (\d+)/i, handler: 'mathQuery' },
      { regex: /square root of (\d+)/i, handler: 'sqrtQuery' },
      { regex: /(\d+) squared/i, handler: 'squareQuery' },
      { regex: /(\d+) cubed/i, handler: 'cubeQuery' },
      { regex: /compress (.+)/i, handler: 'compressQuery' },
      { regex: /decompress (.+)/i, handler: 'decompressQuery' },
      { regex: /what is pi/i, handler: 'piQuery' },
      { regex: /what is phi/i, handler: 'phiQuery' },
      { regex: /execute (.+)/i, handler: 'executeQuery' },
      { regex: /run (.+)/i, handler: 'executeQuery' }
    ];

    // Initialize
    this.init();
  }

  /**
   * Initialize voice capabilities
   */
  init() {
    // Check for Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognitionSupported = true;
      this.setupRecognition();
    }

    // Check for Speech Synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.synthesisSupported = true;
      this.loadVoices();
    }
  }

  /**
   * Setup speech recognition
   */
  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.language;

    // Handle results
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.lastTranscript = finalTranscript;
        this.handleTranscript(finalTranscript);
      }

      if (interimTranscript) {
        this.emit('interim', { transcript: interimTranscript });
      }
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.emit('error', { error: event.error, message: event.message });
      this.isListening = false;
    };

    // Handle end
    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('end', {});

      // Restart if continuous mode
      if (this.config.continuous && this.shouldRestart) {
        this.start();
      }
    };

    // Handle start
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('start', {});
    };
  }

  /**
   * Load available voices
   */
  loadVoices() {
    const loadVoiceList = () => {
      this.voices = this.synthesis.getVoices();

      // Find preferred voice
      if (this.config.preferredVoice) {
        this.voice = this.voices.find(v => v.name.includes(this.config.preferredVoice));
      }

      // Default to first English voice
      if (!this.voice) {
        this.voice = this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
      }

      this.emit('voices-loaded', { voices: this.voices, selected: this.voice });
    };

    // Chrome loads voices asynchronously
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoiceList;
    }
    loadVoiceList();
  }

  // ==================== SPEECH RECOGNITION ====================

  /**
   * Start listening
   */
  start() {
    if (!this.recognitionSupported) {
      console.warn('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    this.shouldRestart = true;
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (!this.recognitionSupported || !this.isListening) {
      return;
    }

    this.shouldRestart = false;
    this.recognition.stop();
  }

  /**
   * Handle recognized transcript
   */
  handleTranscript(transcript) {
    const normalized = transcript.toLowerCase().trim();

    this.emit('transcript', { transcript: normalized });

    // Try pattern matching first
    for (const pattern of this.patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        const glyphQuery = this[pattern.handler](match);
        if (glyphQuery) {
          this.lastGlyphQuery = glyphQuery;
          this.emit('glyph-query', glyphQuery);
          return;
        }
      }
    }

    // Try direct glyph mapping
    const glyphs = this.transcriptToGlyphs(normalized);
    if (glyphs.length > 0) {
      const query = {
        type: 'direct',
        glyphs,
        bytecode: glyphs.join(' '),
        transcript: normalized
      };
      this.lastGlyphQuery = query;
      this.emit('glyph-query', query);
    } else {
      // Unknown command - emit for external handling
      this.emit('unknown-command', { transcript: normalized });
    }
  }

  /**
   * Convert transcript to glyph sequence
   */
  transcriptToGlyphs(transcript) {
    const words = transcript.split(/\s+/);
    const glyphs = [];

    let i = 0;
    while (i < words.length) {
      // Try multi-word phrases first
      let matched = false;
      for (let len = 3; len >= 1; len--) {
        if (i + len <= words.length) {
          const phrase = words.slice(i, i + len).join(' ');
          if (this.voiceGlyphMap[phrase]) {
            glyphs.push(this.voiceGlyphMap[phrase]);
            i += len;
            matched = true;
            break;
          }
        }
      }

      // Try as number
      if (!matched) {
        const num = parseFloat(words[i]);
        if (!isNaN(num)) {
          if (Number.isInteger(num) && num >= 0 && num <= 10) {
            glyphs.push(`⚡${num}`);
          } else {
            glyphs.push(String(num));
          }
          matched = true;
        }
      }

      if (!matched) {
        i++;
      }
    }

    return glyphs;
  }

  // ==================== QUERY HANDLERS ====================

  mathQuery(match) {
    const [, a, op, b] = match;
    const opGlyph = this.voiceGlyphMap[op];
    if (!opGlyph) return null;

    const aGlyph = this.numberToGlyph(parseFloat(a));
    const bGlyph = this.numberToGlyph(parseFloat(b));

    return {
      type: 'math',
      operation: op,
      operands: [parseFloat(a), parseFloat(b)],
      glyphs: [aGlyph, bGlyph, opGlyph],
      bytecode: `${aGlyph} ${bGlyph} ${opGlyph}`,
      transcript: match[0]
    };
  }

  sqrtQuery(match) {
    const [, num] = match;
    const numGlyph = this.numberToGlyph(parseFloat(num));

    return {
      type: 'sqrt',
      operand: parseFloat(num),
      glyphs: [numGlyph, '√'],
      bytecode: `${numGlyph} √`,
      transcript: match[0]
    };
  }

  squareQuery(match) {
    const [, num] = match;
    const numGlyph = this.numberToGlyph(parseFloat(num));

    return {
      type: 'square',
      operand: parseFloat(num),
      glyphs: [numGlyph, '⚡2', '🔺'],
      bytecode: `${numGlyph} ⚡2 🔺`,
      transcript: match[0]
    };
  }

  cubeQuery(match) {
    const [, num] = match;
    const numGlyph = this.numberToGlyph(parseFloat(num));

    return {
      type: 'cube',
      operand: parseFloat(num),
      glyphs: [numGlyph, '⚡3', '🔺'],
      bytecode: `${numGlyph} ⚡3 🔺`,
      transcript: match[0]
    };
  }

  compressQuery(match) {
    const [, value] = match;
    return {
      type: 'compress',
      value,
      glyphs: [value, '⟁'],
      bytecode: `${value} ⟁`,
      transcript: match[0]
    };
  }

  decompressQuery(match) {
    const [, value] = match;
    return {
      type: 'decompress',
      value,
      glyphs: [value, '⟁⁻¹'],
      bytecode: `${value} ⟁⁻¹`,
      transcript: match[0]
    };
  }

  piQuery() {
    return {
      type: 'constant',
      constant: 'pi',
      value: Math.PI,
      glyphs: ['⚡π'],
      bytecode: '⚡π',
      transcript: 'what is pi'
    };
  }

  phiQuery() {
    return {
      type: 'constant',
      constant: 'phi',
      value: 1.6180339887498948,
      glyphs: ['⚡φ'],
      bytecode: '⚡φ',
      transcript: 'what is phi'
    };
  }

  executeQuery(match) {
    const [, command] = match;
    const glyphs = this.transcriptToGlyphs(command);

    return {
      type: 'execute',
      command,
      glyphs,
      bytecode: glyphs.join(' '),
      transcript: match[0]
    };
  }

  numberToGlyph(num) {
    if (Number.isInteger(num) && num >= 0 && num <= 10) {
      return `⚡${num}`;
    }
    return String(num);
  }

  // ==================== SPEECH SYNTHESIS ====================

  /**
   * Speak text
   */
  speak(text, options = {}) {
    if (!this.synthesisSupported) {
      console.warn('Speech synthesis not supported');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      // Cancel any ongoing speech
      if (this.isSpeaking) {
        this.synthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Configure utterance
      utterance.voice = options.voice || this.voice;
      utterance.rate = options.rate || this.config.voiceRate;
      utterance.pitch = options.pitch || this.config.voicePitch;
      utterance.volume = options.volume || this.config.voiceVolume;
      utterance.lang = options.language || this.config.language;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.emit('speak-start', { text });
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.emit('speak-end', { text });
        resolve(true);
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('Speech synthesis error:', event);
        this.emit('speak-error', { error: event.error });
        resolve(false);
      };

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking() {
    if (this.synthesisSupported) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Speak glyph result
   */
  speakGlyphResult(result) {
    let text = '';

    if (result.error) {
      text = `Error: ${result.error}`;
    } else if (typeof result === 'number') {
      text = this.numberToWords(result);
    } else if (result.value !== undefined) {
      text = `The result is ${this.numberToWords(result.value)}`;
    } else if (result.glyph) {
      text = `Compressed to glyph ${result.glyph}`;
    } else if (result.result !== undefined) {
      text = `The answer is ${this.numberToWords(result.result)}`;
    } else {
      text = JSON.stringify(result);
    }

    return this.speak(text);
  }

  /**
   * Convert number to words for natural speech
   */
  numberToWords(num) {
    // Handle special values
    if (num === Math.PI) return 'pi, approximately 3.14159';
    if (num === Math.E) return 'e, approximately 2.71828';
    if (Math.abs(num - 1.618) < 0.001) return 'phi, the golden ratio, approximately 1.618';

    // Round for speech
    if (!Number.isInteger(num)) {
      num = Math.round(num * 1000000) / 1000000;
    }

    return String(num);
  }

  // ==================== EVENT SYSTEM ====================

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
    return this;
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) {
        handlers.splice(idx, 1);
      }
    }
    return this;
  }

  /**
   * Emit event
   */
  emit(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (e) {
          console.error('Event handler error:', e);
        }
      }
    }
  }

  // ==================== CONFIGURATION ====================

  /**
   * Set language
   */
  setLanguage(lang) {
    this.config.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  /**
   * Set voice
   */
  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.voice = voice;
    }
  }

  /**
   * Set speech rate
   */
  setRate(rate) {
    this.config.voiceRate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Set speech pitch
   */
  setPitch(pitch) {
    this.config.voicePitch = Math.max(0, Math.min(2, pitch));
  }

  /**
   * Get available voices
   */
  getVoices() {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      default: v.default,
      localService: v.localService
    }));
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      recognitionSupported: this.recognitionSupported,
      synthesisSupported: this.synthesisSupported,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      language: this.config.language,
      voice: this.voice?.name || null,
      voicesAvailable: this.voices.length,
      lastTranscript: this.lastTranscript,
      lastGlyphQuery: this.lastGlyphQuery
    };
  }

  /**
   * Add custom voice command
   */
  addVoiceCommand(phrase, glyph) {
    this.voiceGlyphMap[phrase.toLowerCase()] = glyph;
  }

  /**
   * Remove voice command
   */
  removeVoiceCommand(phrase) {
    delete this.voiceGlyphMap[phrase.toLowerCase()];
  }

  /**
   * Get all voice commands
   */
  getVoiceCommands() {
    return { ...this.voiceGlyphMap };
  }
}

/**
 * VoiceGlyphBridge - Connects VoiceInterface with GlyphVM
 */
class VoiceGlyphBridge {
  constructor(voiceInterface, glyphVM) {
    this.voice = voiceInterface;
    this.vm = glyphVM;
    this.enabled = true;
    this.autoSpeak = true;

    this.setupBridge();
  }

  setupBridge() {
    // Handle glyph queries from voice
    this.voice.on('glyph-query', async (query) => {
      if (!this.enabled) return;

      try {
        // Execute in GlyphVM
        const result = this.vm.execute(query.bytecode);

        // Emit result
        this.voice.emit('glyph-result', {
          query,
          result,
          success: true
        });

        // Speak result if auto-speak is enabled
        if (this.autoSpeak) {
          await this.voice.speakGlyphResult(result);
        }
      } catch (error) {
        const errorResult = { error: error.message };

        this.voice.emit('glyph-result', {
          query,
          result: errorResult,
          success: false
        });

        if (this.autoSpeak) {
          await this.voice.speak(`Error: ${error.message}`);
        }
      }
    });

    // Handle unknown commands
    this.voice.on('unknown-command', async (data) => {
      if (this.autoSpeak) {
        await this.voice.speak("I didn't understand that command. Try saying something like 'what is 5 plus 3' or 'calculate square root of 16'.");
      }
    });
  }

  /**
   * Enable/disable bridge
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Enable/disable auto-speak
   */
  setAutoSpeak(enabled) {
    this.autoSpeak = enabled;
  }

  /**
   * Start voice interaction
   */
  async start() {
    if (this.autoSpeak) {
      await this.voice.speak("Voice interface ready. Say a command like 'what is 5 plus 3'.");
    }
    return this.voice.start();
  }

  /**
   * Stop voice interaction
   */
  stop() {
    this.voice.stop();
    this.voice.stopSpeaking();
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      autoSpeak: this.autoSpeak,
      voice: this.voice.getStatus()
    };
  }
}

// Export for browser/Service Worker
if (typeof self !== 'undefined') {
  self.VoiceInterface = VoiceInterface;
  self.VoiceGlyphBridge = VoiceGlyphBridge;
}

if (typeof window !== 'undefined') {
  window.VoiceInterface = VoiceInterface;
  window.VoiceGlyphBridge = VoiceGlyphBridge;
}
