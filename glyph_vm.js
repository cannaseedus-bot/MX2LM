/* ============================================================
   GLYPH VIRTUAL MACHINE (GlyphVM)
   π-KUHUL Bytecode Executor
   Law: Ω-BLACK-PANEL
   Compression is Execution
   ============================================================ */

/**
 * GlyphVM - Executes glyph bytecode with π-KUHUL math laws
 * Supports self-modifying glyphs and compression calculus
 */
class GlyphVM {
  constructor() {
    // VM State
    this.stack = [];
    this.memory = new Map();
    this.registers = {
      A: 0,      // Accumulator
      X: 0,      // Index X
      Y: 0,      // Index Y
      P: 0,      // Program counter
      S: 0,      // Stack pointer
      π: Math.PI,
      φ: 1.6180339887498948,
      Ω: 0       // Entropy register
    };

    // Execution state
    this.running = false;
    this.halted = false;
    this.trace = [];
    this.tickCount = 0;

    // π-KUHUL constants
    this.constants = {
      'π': Math.PI,
      'φ': 1.6180339887498948,
      'τ': Math.PI * 2,
      'e': Math.E,
      '√2': Math.SQRT2,
      '√3': Math.sqrt(3),
      '√5': Math.sqrt(5),
      '∞': Infinity,
      '-∞': -Infinity,
      'ε': Number.EPSILON
    };

    // Primitive glyph opcodes
    this.opcodes = {
      // Numbers (compressed)
      '⚡0': () => this.push(0),
      '⚡1': () => this.push(1),
      '⚡2': () => this.push(2),
      '⚡3': () => this.push(3),
      '⚡4': () => this.push(4),
      '⚡5': () => this.push(5),
      '⚡6': () => this.push(6),
      '⚡7': () => this.push(7),
      '⚡8': () => this.push(8),
      '⚡9': () => this.push(9),
      '⚡10': () => this.push(10),
      '⚡100': () => this.push(100),
      '⚡1000': () => this.push(1000),

      // π-constants
      '⚡π': () => this.push(Math.PI),
      '⚡φ': () => this.push(1.6180339887498948),
      '⚡τ': () => this.push(Math.PI * 2),
      '⚡e': () => this.push(Math.E),

      // Arithmetic operators
      '➕': () => this.binaryOp((a, b) => a + b),
      '➖': () => this.binaryOp((a, b) => a - b),
      '✖': () => this.binaryOp((a, b) => a * b),
      '➗': () => this.binaryOp((a, b) => b !== 0 ? a / b : Infinity),
      '🔺': () => this.binaryOp((a, b) => Math.pow(a, b)),  // Power
      '√': () => this.unaryOp(a => Math.sqrt(a)),          // Square root
      '∛': () => this.unaryOp(a => Math.cbrt(a)),          // Cube root
      '%': () => this.binaryOp((a, b) => a % b),           // Modulo
      '±': () => this.unaryOp(a => -a),                    // Negate

      // Comparison operators
      '⚖': () => this.binaryOp((a, b) => a === b ? 1 : 0),  // Equal
      '≠': () => this.binaryOp((a, b) => a !== b ? 1 : 0),  // Not equal
      '⊂': () => this.binaryOp((a, b) => a < b ? 1 : 0),    // Less than
      '⊃': () => this.binaryOp((a, b) => a > b ? 1 : 0),    // Greater than
      '⊆': () => this.binaryOp((a, b) => a <= b ? 1 : 0),   // Less or equal
      '⊇': () => this.binaryOp((a, b) => a >= b ? 1 : 0),   // Greater or equal

      // Logical operators
      '∧': () => this.binaryOp((a, b) => (a && b) ? 1 : 0), // AND
      '∨': () => this.binaryOp((a, b) => (a || b) ? 1 : 0), // OR
      '¬': () => this.unaryOp(a => a ? 0 : 1),              // NOT
      '⊕': () => this.binaryOp((a, b) => (a ^ b) ? 1 : 0),  // XOR

      // Trigonometric
      'sin': () => this.unaryOp(a => Math.sin(a)),
      'cos': () => this.unaryOp(a => Math.cos(a)),
      'tan': () => this.unaryOp(a => Math.tan(a)),
      'asin': () => this.unaryOp(a => Math.asin(a)),
      'acos': () => this.unaryOp(a => Math.acos(a)),
      'atan': () => this.unaryOp(a => Math.atan(a)),
      'sinh': () => this.unaryOp(a => Math.sinh(a)),
      'cosh': () => this.unaryOp(a => Math.cosh(a)),
      'tanh': () => this.unaryOp(a => Math.tanh(a)),

      // Exponential/Logarithmic
      'log': () => this.unaryOp(a => Math.log(a)),
      'log10': () => this.unaryOp(a => Math.log10(a)),
      'log2': () => this.unaryOp(a => Math.log2(a)),
      'exp': () => this.unaryOp(a => Math.exp(a)),
      'ln': () => this.unaryOp(a => Math.log(a)),

      // Rounding
      '⌊': () => this.unaryOp(a => Math.floor(a)),   // Floor
      '⌈': () => this.unaryOp(a => Math.ceil(a)),    // Ceiling
      '⟨⟩': () => this.unaryOp(a => Math.round(a)),  // Round
      '|•|': () => this.unaryOp(a => Math.abs(a)),   // Absolute

      // Stack operations
      '↑': () => this.dup(),           // Duplicate
      '↓': () => this.drop(),          // Drop
      '↔': () => this.swap(),          // Swap
      '↻': () => this.rot(),           // Rotate
      '⎗': () => this.over(),          // Over

      // Memory operations
      '→M': () => this.store(),        // Store to memory
      '←M': () => this.load(),         // Load from memory
      '→A': () => { this.registers.A = this.pop(); }, // Store to accumulator
      '←A': () => this.push(this.registers.A),        // Load from accumulator

      // Control flow
      '⟳': () => {},  // Loop marker (handled in execute)
      '⤴': () => {},  // Jump (handled in execute)
      '⤵': () => {},  // Call (handled in execute)
      '⏹': () => { this.halted = true; }, // Halt
      'NOP': () => {}, // No operation

      // π-KUHUL special operations
      '🌊': () => this.piWave(),           // π-wave
      '⚛': () => this.quantumCollapse(),   // Quantum collapse
      '∮': () => this.contourIntegral(),   // Contour integral
      '∇': () => this.gradient(),          // Gradient/nabla
      '∆': () => this.laplacian(),         // Laplacian
      '∂': () => this.partialDerivative(), // Partial derivative
      '∫': () => this.integrate(),         // Integrate

      // Compression operators
      '⟁': () => this.compress(),    // Compress
      '⟁⁻¹': () => this.decompress(), // Decompress
      '⊛': () => this.convolve(),    // Convolve

      // Golden ratio operations
      'φ⚡': () => this.goldenTransform(),
      'φ⁻¹': () => this.inverseGolden(),

      // Self-modification
      '⟲': () => this.selfModify(),      // Self-modify
      '⊙': () => this.introspect(),      // Introspect
      '∞loop': () => this.infiniteLoop() // Infinite loop marker
    };

    // Meta-rules for self-modification
    this.metaRules = [];

    // Glyph cache for compression
    this.glyphCache = new Map();
  }

  // ==================== STACK OPERATIONS ====================

  push(value) {
    this.stack.push(value);
    this.registers.S = this.stack.length;
    return value;
  }

  pop() {
    if (this.stack.length === 0) {
      throw new Error('Stack underflow');
    }
    const value = this.stack.pop();
    this.registers.S = this.stack.length;
    return value;
  }

  peek(offset = 0) {
    const idx = this.stack.length - 1 - offset;
    if (idx < 0) return undefined;
    return this.stack[idx];
  }

  dup() {
    const a = this.peek();
    if (a !== undefined) this.push(a);
  }

  drop() {
    this.pop();
  }

  swap() {
    const a = this.pop();
    const b = this.pop();
    this.push(a);
    this.push(b);
  }

  rot() {
    const a = this.pop();
    const b = this.pop();
    const c = this.pop();
    this.push(b);
    this.push(a);
    this.push(c);
  }

  over() {
    const a = this.pop();
    const b = this.peek();
    this.push(a);
    if (b !== undefined) this.push(b);
  }

  // ==================== OPERATORS ====================

  unaryOp(fn) {
    const a = this.pop();
    const result = fn(a);
    this.push(result);
    return result;
  }

  binaryOp(fn) {
    const b = this.pop();
    const a = this.pop();
    const result = fn(a, b);
    this.push(result);
    return result;
  }

  // ==================== MEMORY ====================

  store() {
    const addr = this.pop();
    const value = this.pop();
    this.memory.set(addr, value);
    return value;
  }

  load() {
    const addr = this.pop();
    const value = this.memory.get(addr) || 0;
    this.push(value);
    return value;
  }

  // ==================== π-KUHUL OPERATIONS ====================

  piWave() {
    // Generate π-wave: sin(πx) where x is top of stack
    const x = this.pop();
    const result = Math.sin(Math.PI * x);
    this.push(result);
    return result;
  }

  quantumCollapse() {
    // Simulate quantum collapse with pseudo-random
    // Uses golden ratio for deterministic "randomness"
    const amplitude = this.pop();
    const phase = this.pop();
    const phi = 1.6180339887498948;

    // Deterministic collapse based on golden ratio
    const collapsed = amplitude * Math.cos(phase * phi);
    this.push(collapsed);
    this.registers.Ω += Math.abs(collapsed);
    return collapsed;
  }

  contourIntegral() {
    // Approximate contour integral using trapezoidal rule
    const n = Math.floor(this.pop()) || 10;
    const b = this.pop();
    const a = this.pop();

    const h = (b - a) / n;
    let sum = 0;

    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      const fx = Math.sin(Math.PI * x); // Default function
      const weight = (i === 0 || i === n) ? 0.5 : 1;
      sum += weight * fx;
    }

    const result = sum * h;
    this.push(result);
    return result;
  }

  gradient() {
    // Numerical gradient at a point
    const x = this.pop();
    const h = 0.0001;

    // Default function: sin(πx)
    const fx_plus = Math.sin(Math.PI * (x + h));
    const fx_minus = Math.sin(Math.PI * (x - h));
    const gradient = (fx_plus - fx_minus) / (2 * h);

    this.push(gradient);
    return gradient;
  }

  laplacian() {
    // Numerical Laplacian (second derivative)
    const x = this.pop();
    const h = 0.0001;

    // Default function: sin(πx)
    const fx = Math.sin(Math.PI * x);
    const fx_plus = Math.sin(Math.PI * (x + h));
    const fx_minus = Math.sin(Math.PI * (x - h));
    const laplacian = (fx_plus - 2 * fx + fx_minus) / (h * h);

    this.push(laplacian);
    return laplacian;
  }

  partialDerivative() {
    // Partial derivative with respect to indexed variable
    return this.gradient(); // Simplified to gradient
  }

  integrate() {
    // Definite integral using Simpson's rule
    const n = Math.floor(this.pop()) || 100;
    const b = this.pop();
    const a = this.pop();

    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = Math.sin(Math.PI * a) + Math.sin(Math.PI * b);

    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      const fx = Math.sin(Math.PI * x);
      sum += (i % 2 === 0 ? 2 : 4) * fx;
    }

    const result = (h / 3) * sum;
    this.push(result);
    return result;
  }

  // ==================== COMPRESSION ====================

  compress() {
    // Compress value to glyph representation
    const value = this.pop();
    const glyph = this.valueToGlyph(value);
    this.push(glyph);
    return glyph;
  }

  decompress() {
    // Decompress glyph to value
    const glyph = this.pop();
    const value = this.glyphToValue(glyph);
    this.push(value);
    return value;
  }

  valueToGlyph(value) {
    if (typeof value === 'number') {
      // Check for special values
      if (value === Math.PI) return '⚡π';
      if (value === 1.6180339887498948) return '⚡φ';
      if (value === Math.E) return '⚡e';
      if (Number.isInteger(value) && value >= 0 && value <= 10) {
        return `⚡${value}`;
      }
      // Compress as ratio of π if close
      const piRatio = value / Math.PI;
      if (Math.abs(piRatio - Math.round(piRatio)) < 0.001) {
        return `⚡${Math.round(piRatio)}π`;
      }
      return `⚡${value.toFixed(6)}`;
    }
    return `⟁${String(value)}`;
  }

  glyphToValue(glyph) {
    if (typeof glyph !== 'string') return glyph;

    // Parse glyph string
    if (glyph.startsWith('⚡')) {
      const content = glyph.slice(1);
      if (content === 'π') return Math.PI;
      if (content === 'φ') return 1.6180339887498948;
      if (content === 'e') return Math.E;
      if (content.endsWith('π')) {
        const mult = parseFloat(content.slice(0, -1)) || 1;
        return mult * Math.PI;
      }
      return parseFloat(content);
    }
    if (glyph.startsWith('⟁')) {
      return glyph.slice(1);
    }
    return glyph;
  }

  convolve() {
    // Discrete convolution of two arrays on stack
    const kernel = this.pop();
    const signal = this.pop();

    if (!Array.isArray(signal) || !Array.isArray(kernel)) {
      this.push(0);
      return 0;
    }

    const result = [];
    const kLen = kernel.length;
    const sLen = signal.length;

    for (let i = 0; i < sLen + kLen - 1; i++) {
      let sum = 0;
      for (let j = 0; j < kLen; j++) {
        const idx = i - j;
        if (idx >= 0 && idx < sLen) {
          sum += signal[idx] * kernel[j];
        }
      }
      result.push(sum);
    }

    this.push(result);
    return result;
  }

  // ==================== GOLDEN RATIO ====================

  goldenTransform() {
    const value = this.pop();
    const result = value * 1.6180339887498948;
    this.push(result);
    return result;
  }

  inverseGolden() {
    const value = this.pop();
    const result = value / 1.6180339887498948;
    this.push(result);
    return result;
  }

  // ==================== SELF-MODIFICATION ====================

  selfModify() {
    // Apply meta-rules to modify own opcodes
    for (const rule of this.metaRules) {
      if (rule.condition(this)) {
        rule.transform(this);
      }
    }
  }

  introspect() {
    // Push VM state info onto stack
    const state = {
      stackSize: this.stack.length,
      memorySize: this.memory.size,
      registers: { ...this.registers },
      tickCount: this.tickCount
    };
    this.push(state);
    return state;
  }

  infiniteLoop() {
    // Mark for controlled infinite iteration
    this.registers.P = 0; // Reset program counter
  }

  addMetaRule(condition, transform) {
    this.metaRules.push({ condition, transform });
  }

  // ==================== BYTECODE EXECUTION ====================

  /**
   * Parse bytecode string into tokens
   */
  tokenize(bytecode) {
    const tokens = [];
    let current = '';
    let i = 0;

    while (i < bytecode.length) {
      const char = bytecode[i];

      // Check for multi-character opcodes
      let matched = false;
      for (const opcode of Object.keys(this.opcodes)) {
        if (bytecode.slice(i).startsWith(opcode)) {
          if (current) {
            tokens.push(current);
            current = '';
          }
          tokens.push(opcode);
          i += opcode.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Check for number literals
        if (/[\d.]/.test(char) || (char === '-' && /[\d]/.test(bytecode[i + 1]))) {
          current += char;
        } else if (char === ' ' || char === '\n' || char === '\t') {
          if (current) {
            tokens.push(current);
            current = '';
          }
        } else {
          current += char;
        }
        i++;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Execute bytecode
   */
  execute(bytecode) {
    if (typeof bytecode === 'string') {
      return this.executeString(bytecode);
    }
    if (Array.isArray(bytecode)) {
      return this.executeArray(bytecode);
    }
    return { error: 'invalid_bytecode', type: typeof bytecode };
  }

  executeString(bytecode) {
    const tokens = this.tokenize(bytecode);
    return this.executeTokens(tokens);
  }

  executeArray(tokens) {
    return this.executeTokens(tokens);
  }

  executeTokens(tokens) {
    this.running = true;
    this.halted = false;
    this.registers.P = 0;

    const startTick = this.tickCount;

    while (this.registers.P < tokens.length && !this.halted) {
      const token = tokens[this.registers.P];
      this.executeToken(token, tokens);
      this.registers.P++;
      this.tickCount++;

      // Safety: max iterations
      if (this.tickCount - startTick > 10000) {
        console.warn('GlyphVM: Max iterations reached');
        break;
      }
    }

    this.running = false;

    return {
      result: this.peek(),
      stack: [...this.stack],
      registers: { ...this.registers },
      ticks: this.tickCount - startTick,
      glyph: this.valueToGlyph(this.peek())
    };
  }

  executeToken(token, allTokens) {
    // Record trace
    this.trace.push({
      token,
      stackBefore: [...this.stack],
      tick: this.tickCount
    });

    // Check for opcode
    if (this.opcodes[token]) {
      this.opcodes[token]();
      return;
    }

    // Check for constants
    if (this.constants[token]) {
      this.push(this.constants[token]);
      return;
    }

    // Check for number literal
    if (!isNaN(parseFloat(token))) {
      this.push(parseFloat(token));
      return;
    }

    // Check for glyph literal
    if (token.startsWith('⚡')) {
      const value = this.glyphToValue(token);
      this.push(value);
      return;
    }

    // Check for control flow
    if (token.startsWith('⤴')) {
      // Jump to label
      const label = token.slice(1);
      const targetIdx = allTokens.findIndex(t => t === `@${label}`);
      if (targetIdx >= 0) {
        this.registers.P = targetIdx;
      }
      return;
    }

    if (token.startsWith('@')) {
      // Label - no operation
      return;
    }

    if (token === '⟳') {
      // Loop: find matching end and repeat
      // Simplified: just mark for now
      return;
    }

    // Unknown token - push as string
    this.push(token);
  }

  // ==================== HIGH-LEVEL API ====================

  /**
   * Evaluate a simple expression
   */
  eval(expr) {
    this.reset();
    return this.execute(expr);
  }

  /**
   * Compress a value to its minimal glyph representation
   */
  compressValue(value) {
    return this.valueToGlyph(value);
  }

  /**
   * Expand a glyph to its value
   */
  expandGlyph(glyph) {
    return this.glyphToValue(glyph);
  }

  /**
   * Execute math expression
   */
  math(a, op, b) {
    this.push(a);
    this.push(b);

    const opMap = {
      '+': '➕',
      '-': '➖',
      '*': '✖',
      '/': '➗',
      '^': '🔺',
      '%': '%'
    };

    const glyphOp = opMap[op] || op;
    if (this.opcodes[glyphOp]) {
      this.opcodes[glyphOp]();
    }

    return this.pop();
  }

  /**
   * Reset VM state
   */
  reset() {
    this.stack = [];
    this.memory.clear();
    this.registers = {
      A: 0,
      X: 0,
      Y: 0,
      P: 0,
      S: 0,
      π: Math.PI,
      φ: 1.6180339887498948,
      Ω: 0
    };
    this.halted = false;
    this.running = false;
    this.trace = [];
    return this;
  }

  /**
   * Get execution trace
   */
  getTrace() {
    return this.trace;
  }

  /**
   * Get VM statistics
   */
  getStats() {
    return {
      stackSize: this.stack.length,
      memorySize: this.memory.size,
      tickCount: this.tickCount,
      opcodeCount: Object.keys(this.opcodes).length,
      metaRuleCount: this.metaRules.length,
      entropy: this.registers.Ω
    };
  }

  /**
   * Register custom opcode
   */
  registerOpcode(glyph, handler) {
    this.opcodes[glyph] = handler.bind(this);
    return this;
  }

  /**
   * Load opcodes from codex
   */
  loadCodex(codex) {
    if (!codex?.vm_opcodes) return this;

    for (const [category, ops] of Object.entries(codex.vm_opcodes)) {
      for (const [glyph, definition] of Object.entries(ops)) {
        // Create handler from definition
        if (definition.stack_effect) {
          const [inputs, outputs] = definition.stack_effect.split('→').map(s => s.trim().split(' ').filter(x => x));
          this.registerOpcode(glyph, () => {
            // Simple implementation based on stack effect
            const args = [];
            for (let i = 0; i < inputs.length; i++) {
              args.push(this.pop());
            }
            // Default: push args back
            for (const arg of args.reverse()) {
              this.push(arg);
            }
          });
        }
      }
    }

    return this;
  }
}

/**
 * GlyphCompiler - Compiles high-level expressions to glyph bytecode
 */
class GlyphCompiler {
  constructor() {
    this.operatorMap = {
      '+': '➕',
      '-': '➖',
      '*': '✖',
      '/': '➗',
      '^': '🔺',
      '%': '%',
      '==': '⚖',
      '!=': '≠',
      '<': '⊂',
      '>': '⊃',
      '<=': '⊆',
      '>=': '⊇',
      '&&': '∧',
      '||': '∨',
      '!': '¬'
    };

    this.functionMap = {
      'sin': 'sin',
      'cos': 'cos',
      'tan': 'tan',
      'sqrt': '√',
      'abs': '|•|',
      'floor': '⌊',
      'ceil': '⌈',
      'round': '⟨⟩',
      'log': 'log',
      'exp': 'exp',
      'pi': '⚡π',
      'phi': '⚡φ',
      'wave': '🌊'
    };
  }

  /**
   * Compile infix expression to postfix glyph bytecode
   */
  compile(expression) {
    const tokens = this.tokenize(expression);
    const postfix = this.infixToPostfix(tokens);
    const bytecode = this.toGlyphBytecode(postfix);
    return bytecode;
  }

  tokenize(expr) {
    const tokens = [];
    let current = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      if (/[\d.]/.test(char)) {
        current += char;
      } else if (/[a-zA-Z_]/.test(char)) {
        current += char;
      } else if (char === ' ' || char === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if ('+-*/^%()'.includes(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
      } else if (char === '=' || char === '!' || char === '<' || char === '>' || char === '&' || char === '|') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        // Check for two-character operators
        if (i + 1 < expr.length) {
          const next = expr[i + 1];
          if ((char === '=' && next === '=') ||
              (char === '!' && next === '=') ||
              (char === '<' && next === '=') ||
              (char === '>' && next === '=') ||
              (char === '&' && next === '&') ||
              (char === '|' && next === '|')) {
            tokens.push(char + next);
            i++;
            continue;
          }
        }
        tokens.push(char);
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  precedence(op) {
    switch (op) {
      case '||': return 1;
      case '&&': return 2;
      case '==': case '!=': return 3;
      case '<': case '>': case '<=': case '>=': return 4;
      case '+': case '-': return 5;
      case '*': case '/': case '%': return 6;
      case '^': return 7;
      case '!': return 8;
      default: return 0;
    }
  }

  isOperator(token) {
    return '+-*/^%==!=<><=>=&&||!'.includes(token) ||
           ['==', '!=', '<=', '>=', '&&', '||'].includes(token);
  }

  isRightAssociative(op) {
    return op === '^';
  }

  infixToPostfix(tokens) {
    const output = [];
    const stack = [];

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        // Number
        output.push(token);
      } else if (token === 'pi' || token === 'π') {
        output.push('pi');
      } else if (token === 'phi' || token === 'φ') {
        output.push('phi');
      } else if (this.functionMap[token]) {
        stack.push(token);
      } else if (token === '(') {
        stack.push(token);
      } else if (token === ')') {
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          output.push(stack.pop());
        }
        stack.pop(); // Remove '('
        if (stack.length > 0 && this.functionMap[stack[stack.length - 1]]) {
          output.push(stack.pop());
        }
      } else if (this.isOperator(token)) {
        while (stack.length > 0 &&
               stack[stack.length - 1] !== '(' &&
               (this.precedence(stack[stack.length - 1]) > this.precedence(token) ||
                (this.precedence(stack[stack.length - 1]) === this.precedence(token) && !this.isRightAssociative(token)))) {
          output.push(stack.pop());
        }
        stack.push(token);
      } else {
        // Variable or identifier
        output.push(token);
      }
    }

    while (stack.length > 0) {
      output.push(stack.pop());
    }

    return output;
  }

  toGlyphBytecode(postfix) {
    const bytecode = [];

    for (const token of postfix) {
      if (!isNaN(parseFloat(token))) {
        // Number - compress to glyph
        const num = parseFloat(token);
        if (Number.isInteger(num) && num >= 0 && num <= 10) {
          bytecode.push(`⚡${num}`);
        } else {
          bytecode.push(String(num));
        }
      } else if (this.operatorMap[token]) {
        bytecode.push(this.operatorMap[token]);
      } else if (this.functionMap[token]) {
        bytecode.push(this.functionMap[token]);
      } else {
        bytecode.push(token);
      }
    }

    return bytecode.join(' ');
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.GlyphVM = GlyphVM;
  self.GlyphCompiler = GlyphCompiler;
}
