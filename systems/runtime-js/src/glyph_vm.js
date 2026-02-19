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
    this.env = {};           // Variables (K'UHUL environment)
    this.labels = {};        // K'UHUL labels → PC
    this.callStack = [];     // Return addresses for CALL/RETURN
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
    this.executionStartTime = 0;

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
      /* ============================================================
         K'UHUL CORE OPCODES (8 Essential Instructions)
         These form the brain pipeline execution foundation
         ============================================================ */

      // ⟁ NOOP - No operation (placeholder/alignment)
      '⟁': () => { /* noop */ },

      // ⊕ LOAD - Load value onto stack (alternate: push literal/variable)
      // Usage: ⊕10 or ⊕varname
      '⊕LOAD': (operand) => {
        if (operand !== undefined) {
          if (typeof operand === 'string' && this.env[operand] !== undefined) {
            this.push(this.env[operand]);
          } else {
            this.push(operand);
          }
        }
      },

      // ⊗ STORE - Store value from stack into variable
      // Usage: ⊗varname (pops value, stores in env[varname])
      '⊗STORE': (varName) => {
        if (varName !== undefined) {
          this.env[varName] = this.pop();
        }
      },

      // → JUMP - Unconditional jump to label
      // Usage: →label
      '→JUMP': (label) => {
        if (this.labels[label] !== undefined) {
          this.registers.P = this.labels[label] - 1; // -1 because P++ in loop
        }
      },

      // ⤈ BRANCH - Conditional jump (pop condition, jump if truthy)
      // Usage: ⤈label
      '⤈BRANCH': (label) => {
        const condition = this.pop();
        if (condition && this.labels[label] !== undefined) {
          this.registers.P = this.labels[label] - 1;
        }
      },

      // ⨁ CALL - Call function (push return address, jump)
      // Usage: ⨁funcLabel
      '⨁CALL': (funcLabel) => {
        if (this.labels[funcLabel] !== undefined) {
          this.callStack.push(this.registers.P + 1);
          this.registers.P = this.labels[funcLabel] - 1;
        }
      },

      // ⨂ RETURN - Return from function (pop return address)
      '⨂RETURN': () => {
        if (this.callStack.length > 0) {
          this.registers.P = this.callStack.pop() - 1;
        } else {
          this.halted = true;
        }
      },

      // 🛑 HALT - Stop execution
      '🛑HALT': () => {
        this.halted = true;
      },

      /* ============================================================
         NUMBERS (compressed) - Standard form
         ============================================================ */

      // Numbers (compressed) - Standard form
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

      // Numbers (alternate symbolic form from spec)
      '❄': () => this.push(0),           // Zero (frozen/cold)
      '⚡': () => this.push(1),           // One (energy/singular)

      // π-constants
      '⚡π': () => this.push(Math.PI),
      '⚡φ': () => this.push(1.6180339887498948),
      '⚡τ': () => this.push(Math.PI * 2),
      '⚡e': () => this.push(Math.E),
      'π': () => this.push(Math.PI),      // Direct π access
      'φ': () => this.push(1.6180339887498948), // Direct φ access
      'τ': () => this.push(Math.PI * 2),  // Direct τ access

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
      '∞loop': () => this.infiniteLoop(), // Infinite loop marker

      // ========== EXTENDED GLYPHS FROM SPEC ==========

      // Control Flow Glyphs
      '❓': () => this.conditionalIf(),   // If: ❓⟨condition⟩▶⟨action⟩
      '🔄': () => this.loopFor(),         // Loop: 🔄⟨i⟷0⟩▶⟨body⟩
      '▶': () => this.executeBlock(),     // Execute: run block
      '⟷': () => this.binaryOp((a, b) => a === b ? 1 : 0), // Equals (alternate)
      '⟨': () => this.beginGroup(),       // Begin group delimiter
      '⟩': () => this.endGroup(),         // End group delimiter

      // Semantic Glyphs (Context/Mode Markers)
      '📐': () => this.setMode('math'),     // Math mode
      '💻': () => this.setMode('code'),     // Code mode
      '🌀': () => this.setMode('fractal'),  // Fractal mode
      '📊': () => this.calculateMode(),     // Calculate: process expression
      '🔢': () => this.solveMode(),         // Solve: find unknowns
      '💡': () => this.explainMode(),       // Explain: generate explanation
      '🗃': () => this.storeResult(),       // Store: save to memory

      // Container/Data Glyphs
      '📦': () => this.rawData(),           // Raw data container
      '🔗': () => this.reference(),         // Reference to stored value
      '📝': () => this.annotate(),          // Annotate with metadata

      // π-KUHUL Extended Math Laws
      '🌊π': () => this.piWaveFull(),       // Full π-wave transform
      'φ🌀': () => this.goldenSpiral(),     // Golden spiral generation
      '∞φ': () => this.infiniteGolden()    // Infinite golden sequence
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

  // ==================== CONTROL FLOW ====================

  conditionalIf() {
    // ❓⟨condition⟩▶⟨action⟩
    // Pops condition from stack, if truthy, executes action
    const condition = this.pop();
    if (condition) {
      // Action will be executed by subsequent ▶
      this.push(1); // Signal to execute
    } else {
      this.push(0); // Signal to skip
    }
  }

  loopFor() {
    // 🔄⟨i⟷n⟩▶⟨body⟩
    // Loop iteration marker - pushes loop context
    const iterations = this.pop();
    const counter = this.registers.X;

    if (counter < iterations) {
      this.push(counter);      // Push current index
      this.registers.X++;      // Increment counter
      this.push(1);            // Continue signal
    } else {
      this.registers.X = 0;    // Reset counter
      this.push(0);            // Stop signal
    }
  }

  executeBlock() {
    // ▶ Execute if condition on stack is truthy
    const shouldExecute = this.peek();
    if (!shouldExecute) {
      // Skip until end of block (find matching ⟩)
      this.push(0);
    }
    // Otherwise, execution continues normally
  }

  beginGroup() {
    // ⟨ - Mark beginning of expression group
    this.push('⟨'); // Push delimiter marker
  }

  endGroup() {
    // ⟩ - End of expression group, evaluate contents
    const contents = [];
    let item = this.pop();

    while (item !== '⟨' && this.stack.length > 0) {
      contents.unshift(item);
      item = this.pop();
    }

    // Push evaluated group result
    if (contents.length === 1) {
      this.push(contents[0]);
    } else if (contents.length > 1) {
      this.push(contents);
    }
  }

  // ==================== SEMANTIC MODES ====================

  setMode(mode) {
    // Set execution mode context
    this.registers.mode = mode;
    this.push(mode);
  }

  calculateMode() {
    // 📊 Calculate: evaluate expression on stack
    const expr = this.pop();

    if (typeof expr === 'number') {
      this.push(expr);
    } else if (Array.isArray(expr)) {
      // Reduce array with addition
      const result = expr.reduce((a, b) => {
        const numA = typeof a === 'number' ? a : parseFloat(a) || 0;
        const numB = typeof b === 'number' ? b : parseFloat(b) || 0;
        return numA + numB;
      }, 0);
      this.push(result);
    } else {
      this.push(expr);
    }
  }

  solveMode() {
    // 🔢 Solve: attempt to solve equation
    // Pop equation representation and find unknown
    const target = this.pop();
    const value = this.pop();

    // Simple linear solve: if target = value * x, find x
    if (target !== 0 && value !== 0) {
      const solution = target / value;
      this.push(solution);
    } else {
      this.push(0);
    }
  }

  explainMode() {
    // 💡 Explain: push explanation metadata
    const value = this.peek();
    const explanation = {
      type: 'explanation',
      value: value,
      glyph: this.valueToGlyph(value),
      meaning: this.describeValue(value)
    };
    this.push(explanation);
  }

  describeValue(value) {
    if (value === Math.PI) return 'π: ratio of circumference to diameter';
    if (value === 1.6180339887498948) return 'φ: golden ratio';
    if (value === Math.E) return 'e: Euler\'s number';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return `integer: ${value}`;
      return `decimal: ${value.toFixed(6)}`;
    }
    return `value: ${String(value)}`;
  }

  storeResult() {
    // 🗃 Store: save top of stack to memory
    const value = this.peek();
    const addr = this.registers.Y++;
    this.memory.set(`@${addr}`, value);
    this.push(addr);
  }

  // ==================== CONTAINER OPERATIONS ====================

  rawData() {
    // 📦 Raw data container - pop and wrap as raw
    const data = this.pop();
    this.push({ type: 'raw', data: data });
  }

  reference() {
    // 🔗 Reference: load from stored address
    const addr = this.pop();
    const key = typeof addr === 'number' ? `@${addr}` : addr;
    const value = this.memory.get(key) || 0;
    this.push(value);
  }

  annotate() {
    // 📝 Annotate: add metadata to value
    const annotation = this.pop();
    const value = this.pop();
    this.push({
      value: value,
      annotation: annotation,
      timestamp: Date.now()
    });
  }

  // ==================== π-KUHUL EXTENDED MATH ====================

  piWaveFull() {
    // 🌊π Full π-wave: complete wave function
    const x = this.pop();
    const amplitude = this.pop() || 1;
    const frequency = this.pop() || 1;

    // Wave equation: A * sin(2πfx)
    const result = amplitude * Math.sin(2 * Math.PI * frequency * x);
    this.push(result);
  }

  goldenSpiral() {
    // φ🌀 Golden spiral: generate spiral point
    const theta = this.pop();
    const phi = 1.6180339887498948;

    // r = φ^(2θ/π)
    const r = Math.pow(phi, (2 * theta) / Math.PI);
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    this.push({ x, y, r, theta });
  }

  infiniteGolden() {
    // ∞φ Infinite golden sequence: push next Fibonacci-like value
    const prev1 = this.pop() || 1;
    const prev2 = this.pop() || 0;

    const next = prev1 + prev2;
    this.push(prev1);
    this.push(next);
    this.push(next / prev1); // Ratio approaches φ
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

  /* ============================================================
     K'UHUL CORE EXECUTION — 8 Opcode Brain Pipeline
     ============================================================ */

  /**
   * Load a K'UHUL program with labels
   * Program format: array of [opcode, operand] tuples
   * Labels format: { labelName: pc }
   */
  loadKUHULProgram(program, labels = {}) {
    this.kuhulProgram = program;
    this.labels = labels;
    this.registers.P = 0;
    this.halted = false;
    this.callStack = [];
    return this;
  }

  /**
   * Execute K'UHUL program (8-opcode format)
   * Returns: { stack, env, ticks, metrics }
   */
  executeKUHUL(program, labels = {}) {
    this.loadKUHULProgram(program, labels);
    this.executionStartTime = performance.now();
    const startTicks = this.tickCount;

    while (this.registers.P < program.length && !this.halted) {
      const [opcode, operand] = program[this.registers.P];
      this.executeKUHULOp(opcode, operand);
      this.registers.P++;
      this.tickCount++;

      // Safety limit
      if (this.tickCount - startTicks > 100000) {
        console.warn('K\'UHUL: Max iterations reached');
        break;
      }
    }

    const executionTime = performance.now() - this.executionStartTime;

    return {
      stack: [...this.stack],
      env: { ...this.env },
      ticks: this.tickCount - startTicks,
      executionTime,
      halted: this.halted,
      metrics: this.collectMetrics(executionTime)
    };
  }

  /**
   * Execute single K'UHUL opcode
   */
  executeKUHULOp(opcode, operand) {
    // Record trace
    this.trace.push({
      pc: this.registers.P,
      opcode,
      operand,
      stackBefore: [...this.stack],
      tick: this.tickCount
    });

    switch (opcode) {
      case '⟁':    // NOOP
        break;

      case '⊕':    // LOAD
        if (operand !== undefined) {
          if (typeof operand === 'string' && this.env[operand] !== undefined) {
            this.push(this.env[operand]);
          } else {
            this.push(operand);
          }
        }
        break;

      case '⊗':    // STORE
        if (operand !== undefined) {
          this.env[operand] = this.pop();
        }
        break;

      case '→':    // JUMP
        if (this.labels[operand] !== undefined) {
          this.registers.P = this.labels[operand] - 1;
        }
        break;

      case '⤈':    // BRANCH
        if (this.pop() && this.labels[operand] !== undefined) {
          this.registers.P = this.labels[operand] - 1;
        }
        break;

      case '⨁':    // CALL
        if (this.labels[operand] !== undefined) {
          this.callStack.push(this.registers.P + 1);
          this.registers.P = this.labels[operand] - 1;
        }
        break;

      case '⨂':    // RETURN
        if (this.callStack.length > 0) {
          this.registers.P = this.callStack.pop() - 1;
        } else {
          this.halted = true;
        }
        break;

      case '🛑':   // HALT
      case '🔄':   // HALT (alternate)
        this.halted = true;
        break;

      // Extended: arithmetic (can be added to programs)
      case '➕':
        this.binaryOp((a, b) => a + b);
        break;
      case '➖':
        this.binaryOp((a, b) => a - b);
        break;
      case '✖':
        this.binaryOp((a, b) => a * b);
        break;
      case '➗':
        this.binaryOp((a, b) => b !== 0 ? a / b : Infinity);
        break;

      // Extended: comparison
      case '⚖':
        this.binaryOp((a, b) => a === b ? 1 : 0);
        break;
      case '⊂':
        this.binaryOp((a, b) => a < b ? 1 : 0);
        break;
      case '⊃':
        this.binaryOp((a, b) => a > b ? 1 : 0);
        break;

      default:
        // Try existing opcodes
        if (this.opcodes[opcode]) {
          this.opcodes[opcode]();
        } else {
          // Unknown - push as literal
          this.push(opcode);
        }
    }
  }

  /**
   * Compile K'UHUL script to program/labels
   * Script format: lines of "opcode operand" or "@label"
   */
  compileKUHUL(script) {
    const lines = script.trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const program = [];
    const labels = {};

    for (const line of lines) {
      // Label definition
      if (line.startsWith('@')) {
        labels[line.slice(1)] = program.length;
        continue;
      }

      // Parse "opcode operand"
      const match = line.match(/^([⟁⊕⊗→⤈⨁⨂🛑🔄➕➖✖➗⚖⊂⊃])\s*(.*)$/u);
      if (match) {
        const [, opcode, operandStr] = match;
        let operand = operandStr.trim();

        // Try to parse as number
        if (operand && !isNaN(parseFloat(operand))) {
          operand = parseFloat(operand);
        }

        program.push([opcode, operand || undefined]);
      } else {
        // Unknown line - treat as data
        program.push(['⊕', line]);
      }
    }

    return { program, labels };
  }

  /**
   * Collect execution metrics
   */
  collectMetrics(executionTime) {
    return {
      execution_time: executionTime,
      ticks: this.tickCount,
      stack_depth: this.stack.length,
      memory_size: this.memory.size,
      env_size: Object.keys(this.env).length,
      call_depth: this.callStack.length,
      entropy: this.registers.Ω
    };
  }
}

/* ============================================================
   PI_METRIC_TABLE — 30+ Metrics for Brain Pipeline
   ============================================================ */

const PI_METRIC_TABLE = {
  // Execution Metrics
  execution_time: [],
  ticks: [],
  stack_depth: [],
  call_depth: [],

  // Memory Metrics
  memory_usage: [],
  env_size: [],
  cache_hits: [],
  cache_misses: [],

  // Compression Metrics
  compression_ratio: [],
  glyph_density: [],
  token_count: [],

  // Throughput Metrics
  token_throughput: [],
  ops_per_second: [],

  // Branch Metrics
  branch_taken: [],
  branch_not_taken: [],
  branch_hit_rate: [],

  // Loop Metrics
  loop_iterations: [],
  loop_depth: [],

  // Call Metrics
  function_calls: [],
  function_returns: [],
  max_call_depth: [],

  // Error Metrics
  error_count: [],
  stack_underflows: [],
  undefined_ops: [],

  // π-KUHUL Metrics
  pi_waves_executed: [],
  phi_transforms: [],
  golden_ratios: [],
  entropy_delta: [],

  // Inference Metrics
  inference_latency: [],
  model_load_time: [],
  tensor_ops: [],
  activation_count: [],

  // Quality Metrics
  determinism_score: [],
  replay_consistency: []
};

/**
 * Update a metric in PI_METRIC_TABLE
 */
function updateMetric(metricType, value) {
  if (PI_METRIC_TABLE[metricType]) {
    PI_METRIC_TABLE[metricType].push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries
    if (PI_METRIC_TABLE[metricType].length > 1000) {
      PI_METRIC_TABLE[metricType].shift();
    }
  }
}

/**
 * Get metric statistics
 */
function getMetricStats(metricType) {
  const data = PI_METRIC_TABLE[metricType];
  if (!data || data.length === 0) {
    return { count: 0, avg: 0, min: 0, max: 0, last: null };
  }

  const values = data.map(d => d.value);
  return {
    count: values.length,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    last: values[values.length - 1]
  };
}

/**
 * Get all metric summaries
 */
function getAllMetricStats() {
  const stats = {};
  for (const key of Object.keys(PI_METRIC_TABLE)) {
    stats[key] = getMetricStats(key);
  }
  return stats;
}

/* ============================================================
   BRAIN PIPELINE — K'UHUL → GlyphVM → Metrics
   ============================================================ */

/**
 * Execute brain pipeline: K'UHUL script → GlyphVM → Result + Metrics
 * @param {string|object} input - K'UHUL script string or { script, env, labels }
 * @param {object} options - Pipeline options
 * @returns {object} - { result, env, metrics, trace }
 */
function executeBrainPipeline(input, options = {}) {
  const startTime = performance.now();

  // Parse input
  let script, initialEnv = {}, initialLabels = {};
  if (typeof input === 'string') {
    script = input;
  } else {
    script = input.script || '';
    initialEnv = input.env || {};
    initialLabels = input.labels || {};
  }

  // Create VM instance
  const vm = new GlyphVM();
  vm.env = { ...initialEnv };

  // Step 1: Parse/Compile K'UHUL script
  const parseStart = performance.now();
  let program, labels;

  if (Array.isArray(script)) {
    // Already compiled
    program = script;
    labels = initialLabels;
  } else {
    // Compile from script
    const compiled = vm.compileKUHUL(script);
    program = compiled.program;
    labels = { ...compiled.labels, ...initialLabels };
  }
  const parseTime = performance.now() - parseStart;

  // Step 2: Execute
  const execStart = performance.now();
  const result = vm.executeKUHUL(program, labels);
  const execTime = performance.now() - execStart;

  // Step 3: Update metrics
  updateMetric('execution_time', execTime);
  updateMetric('ticks', result.ticks);
  updateMetric('stack_depth', result.stack.length);
  updateMetric('env_size', Object.keys(result.env).length);

  if (program.length > 0) {
    updateMetric('glyph_density', program.length / (script.length || 1));
    updateMetric('token_count', program.length);
    updateMetric('ops_per_second', (result.ticks / execTime) * 1000);
  }

  // Calculate compression ratio
  const outputSize = JSON.stringify(result).length;
  const inputSize = (typeof script === 'string' ? script : JSON.stringify(script)).length;
  if (inputSize > 0) {
    updateMetric('compression_ratio', outputSize / inputSize);
  }

  const totalTime = performance.now() - startTime;

  // Step 4: Return comprehensive result
  return {
    success: true,
    result: result.stack[result.stack.length - 1],
    stack: result.stack,
    env: result.env,
    ticks: result.ticks,
    halted: result.halted,
    timing: {
      parse: parseTime,
      execute: execTime,
      total: totalTime
    },
    metrics: {
      current: result.metrics,
      aggregate: getAllMetricStats()
    },
    trace: options.includeTrace ? vm.getTrace() : undefined,
    program: options.includeProgram ? program : undefined
  };
}

/**
 * Quick inference helper - execute K'UHUL and return result
 */
function kuhulInfer(script, env = {}) {
  const result = executeBrainPipeline({ script, env });
  return result.result;
}

/**
 * Batch execution for multiple scripts
 */
function executeBrainPipelineBatch(scripts, options = {}) {
  return scripts.map((script, idx) => ({
    index: idx,
    ...executeBrainPipeline(script, options)
  }));
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
      '===': '⟷',
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
      'wave': '🌊',
      'calculate': '📊',
      'solve': '🔢',
      'explain': '💡',
      'store': '🗃',
      'fractal': '🌀',
      'spiral': 'φ🌀'
    };

    // Control flow keywords
    this.controlMap = {
      'if': '❓',
      'for': '🔄',
      'exec': '▶',
      'begin': '⟨',
      'end': '⟩'
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

/**
 * GlyphRegistry - Dynamic glyph registration and meta-programming
 * Supports self-modifying rules from the π-KUHUL spec
 */
class GlyphRegistry {
  constructor(vm) {
    this.vm = vm;
    this.customGlyphs = new Map();
    this.metaRules = [];
    this.glyphHistory = [];
  }

  /**
   * Register a new glyph dynamically
   * Example: registry.register('🎯', (vm) => vm.push(vm.pop() * 2))
   */
  register(glyph, handler, metadata = {}) {
    const registration = {
      glyph,
      handler: handler.bind(this.vm),
      metadata: {
        ...metadata,
        registered: Date.now(),
        source: 'dynamic'
      }
    };

    this.customGlyphs.set(glyph, registration);
    this.vm.opcodes[glyph] = registration.handler;
    this.glyphHistory.push({ action: 'register', glyph, timestamp: Date.now() });

    return this;
  }

  /**
   * Unregister a glyph
   */
  unregister(glyph) {
    if (this.customGlyphs.has(glyph)) {
      this.customGlyphs.delete(glyph);
      delete this.vm.opcodes[glyph];
      this.glyphHistory.push({ action: 'unregister', glyph, timestamp: Date.now() });
    }
    return this;
  }

  /**
   * Add a meta-rule that can modify glyphs at runtime
   * Meta-rules implement self-modifying behavior
   */
  addMetaRule(rule) {
    const metaRule = {
      id: `meta_${this.metaRules.length}`,
      condition: rule.condition,
      transform: rule.transform,
      priority: rule.priority || 0,
      active: true
    };

    this.metaRules.push(metaRule);
    this.metaRules.sort((a, b) => b.priority - a.priority);

    return metaRule.id;
  }

  /**
   * Apply all active meta-rules
   */
  applyMetaRules() {
    for (const rule of this.metaRules) {
      if (rule.active && rule.condition(this.vm)) {
        rule.transform(this.vm, this);
      }
    }
  }

  /**
   * Create composite glyph from sequence
   * Example: registry.compose('🔮', ['⚡π', '🌊', '✖'])
   */
  compose(newGlyph, sequence, metadata = {}) {
    const handler = () => {
      for (const glyph of sequence) {
        if (this.vm.opcodes[glyph]) {
          this.vm.opcodes[glyph]();
        }
      }
    };

    return this.register(newGlyph, handler, {
      ...metadata,
      type: 'composite',
      sequence
    });
  }

  /**
   * Alias an existing glyph
   */
  alias(newGlyph, existingGlyph) {
    if (this.vm.opcodes[existingGlyph]) {
      return this.register(newGlyph, this.vm.opcodes[existingGlyph], {
        type: 'alias',
        aliasOf: existingGlyph
      });
    }
    return this;
  }

  /**
   * Get all registered glyphs
   */
  list() {
    return {
      builtin: Object.keys(this.vm.opcodes).filter(g => !this.customGlyphs.has(g)),
      custom: Array.from(this.customGlyphs.entries()).map(([glyph, reg]) => ({
        glyph,
        ...reg.metadata
      })),
      metaRules: this.metaRules.map(r => ({ id: r.id, active: r.active, priority: r.priority }))
    };
  }

  /**
   * Export registry state
   */
  export() {
    return {
      customGlyphs: Array.from(this.customGlyphs.entries()),
      metaRules: this.metaRules.length,
      history: this.glyphHistory.slice(-100) // Last 100 actions
    };
  }
}

/**
 * PiKUHUL - π-KUHUL Math Laws Engine
 * Implements the mathematical transformations from the spec
 */
class PiKUHUL {
  constructor() {
    this.PI = Math.PI;
    this.PHI = 1.6180339887498948;
    this.TAU = 2 * Math.PI;
    this.E = Math.E;
  }

  /**
   * πWave: Wave transformation
   * πWave(x) = sin(πx)
   */
  wave(x) {
    return Math.sin(this.PI * x);
  }

  /**
   * πScale: Golden scaling
   * πScale(x) = x * φ
   */
  scale(x) {
    return x * this.PHI;
  }

  /**
   * πFractal: Recursive fractal generation
   * πFractal(n, f) = f(f(f(...n times...)))
   */
  fractal(n, f, initial = 1) {
    let result = initial;
    for (let i = 0; i < n; i++) {
      result = f(result);
    }
    return result;
  }

  /**
   * πCompress: Compress to nearest π-multiple
   */
  compress(x) {
    const piRatio = x / this.PI;
    const rounded = Math.round(piRatio * 1000) / 1000;
    return { ratio: rounded, value: rounded * this.PI, error: Math.abs(x - rounded * this.PI) };
  }

  /**
   * φSpiral: Golden spiral point at angle θ
   */
  spiral(theta) {
    const r = Math.pow(this.PHI, (2 * theta) / this.PI);
    return {
      r,
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }

  /**
   * Fibonacci sequence generator
   */
  fibonacci(n) {
    const seq = [0, 1];
    for (let i = 2; i <= n; i++) {
      seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
  }

  /**
   * Check if number is a Fibonacci number
   */
  isFibonacci(n) {
    const isPerfectSquare = (x) => {
      const s = Math.sqrt(x);
      return s * s === x;
    };
    return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.GlyphVM = GlyphVM;
  self.GlyphCompiler = GlyphCompiler;
  self.GlyphRegistry = GlyphRegistry;
  self.PiKUHUL = PiKUHUL;

  // K'UHUL Pipeline exports
  self.PI_METRIC_TABLE = PI_METRIC_TABLE;
  self.executeBrainPipeline = executeBrainPipeline;
  self.executeBrainPipelineBatch = executeBrainPipelineBatch;
  self.kuhulInfer = kuhulInfer;
  self.updateMetric = updateMetric;
  self.getMetricStats = getMetricStats;
  self.getAllMetricStats = getAllMetricStats;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GlyphVM,
    GlyphCompiler,
    GlyphRegistry,
    PiKUHUL,
    PI_METRIC_TABLE,
    executeBrainPipeline,
    executeBrainPipelineBatch,
    kuhulInfer,
    updateMetric,
    getMetricStats,
    getAllMetricStats
  };
}
