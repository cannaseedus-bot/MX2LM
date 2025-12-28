/* ============================================================
   ATOMIC BLOCK RUNTIME
   π-KUHUL Deterministic Block Executor
   Law: Ω-BLACK-PANEL
   ============================================================ */

/**
 * BlockExecutor - Executes atomic blocks deterministically
 * Handles @flow, @data, @control, and @type directives
 */
class BlockExecutor {
  constructor(glyphVM = null, piEngine = null) {
    this.blocks = new Map();
    this.variables = new Map();
    this.executionTrace = [];
    this.glyphVM = glyphVM;
    this.piEngine = piEngine;

    // Block type handlers
    this.handlers = {
      // Math operations
      'math/operation': this.executeMath.bind(this),
      'math/expression': this.executeExpression.bind(this),
      'math/compare': this.executeCompare.bind(this),

      // π-KUHUL physics
      'π/physics': this.executePhysics.bind(this),
      'π/wave': this.executeWave.bind(this),
      'π/transform': this.executeTransform.bind(this),
      'π/field': this.executeField.bind(this),

      // Data operations
      'data/input': this.executeDataInput.bind(this),
      'data/output': this.executeDataOutput.bind(this),
      'data/store': this.executeDataStore.bind(this),
      'data/load': this.executeDataLoad.bind(this),
      'data/transform': this.executeDataTransform.bind(this),

      // Control flow
      'control/if': this.executeControlIf.bind(this),
      'control/loop': this.executeControlLoop.bind(this),
      'control/sequence': this.executeControlSequence.bind(this),
      'control/parallel': this.executeControlParallel.bind(this),
      'control/branch': this.executeControlBranch.bind(this),

      // Glyph operations
      'glyph/execute': this.executeGlyph.bind(this),
      'glyph/compress': this.executeGlyphCompress.bind(this),
      'glyph/expand': this.executeGlyphExpand.bind(this),

      // Block references
      'block/ref': this.executeBlockRef.bind(this),
      'block/define': this.executeBlockDefine.bind(this),
      'block/call': this.executeBlockCall.bind(this),

      // ASX RAM operations
      'asx/read': this.executeAsxRead.bind(this),
      'asx/write': this.executeAsxWrite.bind(this),
      'asx/atomic': this.executeAsxAtomic.bind(this),

      // Network operations
      'net/send': this.executeNetSend.bind(this),
      'net/receive': this.executeNetReceive.bind(this),
      'net/broadcast': this.executeNetBroadcast.bind(this)
    };

    // Built-in math functions
    this.mathFunctions = {
      'add': (a, b) => a + b,
      'subtract': (a, b) => a - b,
      'multiply': (a, b) => a * b,
      'divide': (a, b) => b !== 0 ? a / b : Infinity,
      'power': (a, b) => Math.pow(a, b),
      'sqrt': (a) => Math.sqrt(a),
      'abs': (a) => Math.abs(a),
      'sin': (a) => Math.sin(a),
      'cos': (a) => Math.cos(a),
      'tan': (a) => Math.tan(a),
      'log': (a) => Math.log(a),
      'exp': (a) => Math.exp(a),
      'floor': (a) => Math.floor(a),
      'ceil': (a) => Math.ceil(a),
      'round': (a) => Math.round(a),
      'min': (...args) => Math.min(...args),
      'max': (...args) => Math.max(...args),
      'mod': (a, b) => a % b,
      'pi': () => Math.PI,
      'phi': () => 1.6180339887498948,
      'e': () => Math.E
    };

    // π-KUHUL constants
    this.piConstants = {
      'π': Math.PI,
      'φ': 1.6180339887498948,
      'e': Math.E,
      'τ': Math.PI * 2,
      '√2': Math.SQRT2,
      '√3': Math.sqrt(3),
      '√5': Math.sqrt(5)
    };
  }

  /**
   * Register a block definition
   */
  registerBlock(id, block) {
    this.blocks.set(id, block);
    return this;
  }

  /**
   * Set a variable value
   */
  setVariable(name, value) {
    this.variables.set(name, value);
    return this;
  }

  /**
   * Get a variable value
   */
  getVariable(name) {
    return this.variables.get(name);
  }

  /**
   * Resolve a value - could be literal, variable, or block reference
   */
  resolveValue(value) {
    if (value === null || value === undefined) return null;

    // String variable reference
    if (typeof value === 'string') {
      // Check for π constants
      if (this.piConstants[value]) {
        return this.piConstants[value];
      }
      // Check for variable reference
      if (value.startsWith('$')) {
        return this.getVariable(value.slice(1));
      }
      // Check for number string
      if (!isNaN(value)) {
        return parseFloat(value);
      }
      return value;
    }

    // Number literal
    if (typeof value === 'number') {
      return value;
    }

    // Boolean literal
    if (typeof value === 'boolean') {
      return value;
    }

    // Array - resolve each element
    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(v));
    }

    // Block reference
    if (typeof value === 'object' && value['@type']) {
      return this.execute(value);
    }

    // Object with @ref
    if (typeof value === 'object' && value['@ref']) {
      return this.getVariable(value['@ref']);
    }

    // Object with @id (block reference)
    if (typeof value === 'object' && value['@id']) {
      const block = this.blocks.get(value['@id']);
      return block ? this.execute(block) : null;
    }

    return value;
  }

  /**
   * Execute a block
   */
  execute(block) {
    if (!block || typeof block !== 'object') {
      return this.resolveValue(block);
    }

    const type = block['@type'];
    if (!type) {
      // Not a typed block, return as-is
      return block;
    }

    const handler = this.handlers[type];
    if (!handler) {
      console.warn(`BlockExecutor: Unknown block type: ${type}`);
      return { error: 'unknown_block_type', type };
    }

    // Record execution trace
    const traceEntry = {
      type,
      id: block['@id'] || null,
      timestamp: Date.now(),
      tick: typeof ΩCLOCK !== 'undefined' ? ΩCLOCK.tick : 0
    };

    try {
      const result = handler(block);
      traceEntry.result = result;
      traceEntry.success = true;
      this.executionTrace.push(traceEntry);

      // Store output variable if specified
      if (block['@data']?.output_variable) {
        this.setVariable(block['@data'].output_variable, result);
      }

      return result;
    } catch (error) {
      traceEntry.error = error.message;
      traceEntry.success = false;
      this.executionTrace.push(traceEntry);
      throw error;
    }
  }

  // ==================== MATH OPERATIONS ====================

  executeMath(block) {
    const data = block['@data'] || {};
    const operation = data.operation;
    const inputs = (data.inputs || []).map(i => this.resolveValue(i));

    const fn = this.mathFunctions[operation];
    if (!fn) {
      throw new Error(`Unknown math operation: ${operation}`);
    }

    const result = fn(...inputs);

    // Compress to glyph if VM available
    if (this.glyphVM) {
      return {
        value: result,
        glyph: this.glyphVM.compress(result),
        operation,
        inputs
      };
    }

    return result;
  }

  executeExpression(block) {
    const data = block['@data'] || {};
    const expression = data.expression;
    const context = {};

    // Build context from variables
    for (const [key, value] of this.variables) {
      context[key] = value;
    }

    // Add π constants
    Object.assign(context, this.piConstants);

    // Safe expression evaluation
    return this.evaluateExpression(expression, context);
  }

  executeCompare(block) {
    const data = block['@data'] || {};
    const left = this.resolveValue(data.left);
    const right = this.resolveValue(data.right);
    const operator = data.operator || '==';

    switch (operator) {
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      default: throw new Error(`Unknown comparison operator: ${operator}`);
    }
  }

  evaluateExpression(expr, context) {
    // Simple expression parser for π-KUHUL math
    // Handles: +, -, *, /, ^, sqrt, sin, cos, tan, log, exp, π, φ, e

    let parsed = expr;

    // Replace constants
    parsed = parsed.replace(/π/g, String(Math.PI));
    parsed = parsed.replace(/φ/g, String(1.6180339887498948));
    parsed = parsed.replace(/τ/g, String(Math.PI * 2));

    // Replace variables from context
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'number') {
        parsed = parsed.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
      }
    }

    // Replace functions
    parsed = parsed.replace(/sqrt\(([^)]+)\)/g, (_, arg) => String(Math.sqrt(parseFloat(arg))));
    parsed = parsed.replace(/sin\(([^)]+)\)/g, (_, arg) => String(Math.sin(parseFloat(arg))));
    parsed = parsed.replace(/cos\(([^)]+)\)/g, (_, arg) => String(Math.cos(parseFloat(arg))));
    parsed = parsed.replace(/tan\(([^)]+)\)/g, (_, arg) => String(Math.tan(parseFloat(arg))));
    parsed = parsed.replace(/log\(([^)]+)\)/g, (_, arg) => String(Math.log(parseFloat(arg))));
    parsed = parsed.replace(/exp\(([^)]+)\)/g, (_, arg) => String(Math.exp(parseFloat(arg))));
    parsed = parsed.replace(/abs\(([^)]+)\)/g, (_, arg) => String(Math.abs(parseFloat(arg))));

    // Handle power operator
    parsed = parsed.replace(/\^/g, '**');

    // Evaluate (in sandboxed manner)
    try {
      // Only allow numbers and basic operators
      if (!/^[\d\s+\-*/().%*]+$/.test(parsed)) {
        throw new Error('Invalid expression');
      }
      return Function(`"use strict"; return (${parsed})`)();
    } catch (e) {
      return NaN;
    }
  }

  // ==================== π-KUHUL PHYSICS ====================

  executePhysics(block) {
    const data = block['@data'] || {};
    const equation = data.equation;
    const dt = data.δt || data.dt || 0.016;
    const constants = data.constants || {};

    const field = this.resolveValue(data.field) || { x: 0, y: 0, z: 0 };

    switch (equation) {
      case 'wave_equation':
        return this.computeWaveEquation(field, dt, constants);
      case 'heat_equation':
        return this.computeHeatEquation(field, dt, constants);
      case 'schrodinger':
        return this.computeSchrodinger(field, dt, constants);
      case 'maxwell':
        return this.computeMaxwell(field, dt, constants);
      default:
        return this.computeGenericPhysics(equation, field, dt, constants);
    }
  }

  executeWave(block) {
    const data = block['@data'] || {};
    const amplitude = this.resolveValue(data.amplitude) || 1;
    const frequency = this.resolveValue(data.frequency) || 1;
    const phase = this.resolveValue(data.phase) || 0;
    const t = this.resolveValue(data.t) || 0;

    // π-wave: A * sin(2πft + φ)
    const value = amplitude * Math.sin(2 * Math.PI * frequency * t + phase);

    return {
      value,
      glyph: '🌊π',
      amplitude,
      frequency,
      phase,
      t,
      formula: `${amplitude} * sin(2π * ${frequency} * t + ${phase})`
    };
  }

  executeTransform(block) {
    const data = block['@data'] || {};
    const transform = data.transform;
    const input = this.resolveValue(data.input);

    switch (transform) {
      case 'fourier':
        return this.fourierTransform(input);
      case 'laplace':
        return this.laplaceTransform(input);
      case 'golden_ratio':
        return this.goldenRatioTransform(input);
      case 'pi_normalize':
        return this.piNormalize(input);
      default:
        return input;
    }
  }

  executeField(block) {
    const data = block['@data'] || {};
    const fieldType = data.field_type || 'scalar';
    const dimensions = data.dimensions || [10, 10];
    const initialValue = this.resolveValue(data.initial_value) || 0;

    // Create field based on type
    switch (fieldType) {
      case 'scalar':
        return this.createScalarField(dimensions, initialValue);
      case 'vector':
        return this.createVectorField(dimensions, initialValue);
      case 'tensor':
        return this.createTensorField(dimensions, initialValue);
      default:
        return this.createScalarField(dimensions, initialValue);
    }
  }

  computeWaveEquation(field, dt, constants) {
    const c = constants.c || (1 / Math.PI);
    const { x, y, z } = field;

    // 2D wave: ∂²u/∂t² = c² * (∂²u/∂x² + ∂²u/∂y²)
    const value = Math.sin(Math.PI * x) * Math.cos(Math.PI * y) * Math.exp(-c * dt);

    return {
      value,
      glyph: '🌊π',
      field: { x, y, z },
      c,
      dt
    };
  }

  computeHeatEquation(field, dt, constants) {
    const k = constants.k || 0.1;
    const { x, y } = field;

    // Heat diffusion: ∂u/∂t = k * ∇²u
    const value = Math.exp(-k * Math.PI * Math.PI * dt) * Math.sin(Math.PI * x) * Math.sin(Math.PI * y);

    return { value, glyph: '🔥π', k, dt };
  }

  computeSchrodinger(field, dt, constants) {
    const hbar = constants.hbar || 1;
    const m = constants.m || 1;
    const { x } = field;

    // Free particle wave function
    const k = Math.PI;
    const omega = (hbar * k * k) / (2 * m);
    const psi_real = Math.cos(k * x - omega * dt);
    const psi_imag = Math.sin(k * x - omega * dt);

    return {
      psi: { real: psi_real, imag: psi_imag },
      probability: psi_real * psi_real + psi_imag * psi_imag,
      glyph: 'Ψπ'
    };
  }

  computeMaxwell(field, dt, constants) {
    const c = constants.c || 299792458;
    const epsilon0 = constants.epsilon0 || 8.854e-12;
    const mu0 = constants.mu0 || 1.257e-6;

    // Electromagnetic wave
    const { x } = field;
    const k = 2 * Math.PI;
    const omega = c * k;

    const E = Math.sin(k * x - omega * dt);
    const B = E / c;

    return { E, B, glyph: '⚡π', c, k, omega };
  }

  computeGenericPhysics(equation, field, dt, constants) {
    return {
      equation,
      field,
      dt,
      constants,
      glyph: 'Φπ'
    };
  }

  fourierTransform(input) {
    if (!Array.isArray(input)) return { error: 'input_must_be_array' };

    const N = input.length;
    const result = [];

    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += input[n] * Math.cos(angle);
        imag -= input[n] * Math.sin(angle);
      }
      result.push({ real: real / N, imag: imag / N });
    }

    return { spectrum: result, glyph: '∫π' };
  }

  goldenRatioTransform(input) {
    const phi = 1.6180339887498948;
    if (typeof input === 'number') {
      return { value: input * phi, glyph: 'φ⚡' };
    }
    if (Array.isArray(input)) {
      return { values: input.map(v => v * phi), glyph: 'φ⚡' };
    }
    return input;
  }

  piNormalize(input) {
    if (typeof input === 'number') {
      return { value: input / Math.PI, glyph: 'π⁻¹' };
    }
    return input;
  }

  createScalarField(dimensions, initialValue) {
    const [width, height] = dimensions;
    const field = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(typeof initialValue === 'function' ? initialValue(x, y) : initialValue);
      }
      field.push(row);
    }
    return { type: 'scalar', dimensions, data: field };
  }

  createVectorField(dimensions, initialValue) {
    const [width, height] = dimensions;
    const field = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(typeof initialValue === 'function' ? initialValue(x, y) : { x: 0, y: 0, z: 0 });
      }
      field.push(row);
    }
    return { type: 'vector', dimensions, data: field };
  }

  // ==================== DATA OPERATIONS ====================

  executeDataInput(block) {
    const data = block['@data'] || {};
    const source = data.source || 'user';
    const format = data.format || 'text';
    const value = this.resolveValue(data.value);

    return { source, format, value, glyph: '📥' };
  }

  executeDataOutput(block) {
    const data = block['@data'] || {};
    const target = data.target || 'console';
    const format = data.format || 'text';
    const value = this.resolveValue(data.value);

    if (target === 'console') {
      console.log('[BlockExecutor Output]:', value);
    }

    return { target, format, value, glyph: '📤' };
  }

  executeDataStore(block) {
    const data = block['@data'] || {};
    const key = data.key;
    const value = this.resolveValue(data.value);

    this.setVariable(key, value);
    return { stored: true, key, value, glyph: '💾' };
  }

  executeDataLoad(block) {
    const data = block['@data'] || {};
    const key = data.key;
    const value = this.getVariable(key);

    return { loaded: true, key, value, glyph: '📂' };
  }

  executeDataTransform(block) {
    const data = block['@data'] || {};
    const input = this.resolveValue(data.input);
    const transform = data.transform;

    switch (transform) {
      case 'json_parse':
        return JSON.parse(input);
      case 'json_stringify':
        return JSON.stringify(input);
      case 'to_number':
        return parseFloat(input);
      case 'to_string':
        return String(input);
      case 'to_array':
        return Array.isArray(input) ? input : [input];
      case 'flatten':
        return Array.isArray(input) ? input.flat() : input;
      case 'reverse':
        return Array.isArray(input) ? input.reverse() : input;
      case 'sort':
        return Array.isArray(input) ? input.sort() : input;
      case 'unique':
        return Array.isArray(input) ? [...new Set(input)] : input;
      default:
        return input;
    }
  }

  // ==================== CONTROL FLOW ====================

  executeControlIf(block) {
    const data = block['@data'] || {};
    const condition = this.resolveValue(data.condition);
    const thenBlock = data.then;
    const elseBlock = data.else;

    if (condition) {
      return thenBlock ? this.execute(thenBlock) : true;
    } else {
      return elseBlock ? this.execute(elseBlock) : false;
    }
  }

  executeControlLoop(block) {
    const data = block['@data'] || {};
    const iterations = this.resolveValue(data.iterations) || 1;
    const body = data.body;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      this.setVariable('loop_index', i);
      const result = this.execute(body);
      results.push(result);

      // Check for break condition
      if (data.break_condition) {
        const shouldBreak = this.resolveValue(data.break_condition);
        if (shouldBreak) break;
      }
    }

    return { results, iterations: results.length, glyph: '🔄' };
  }

  executeControlSequence(block) {
    const data = block['@data'] || {};
    const steps = data.steps || [];
    const results = [];

    for (const step of steps) {
      const result = this.execute(step);
      results.push(result);
    }

    return { results, count: results.length, glyph: '➡️' };
  }

  executeControlParallel(block) {
    const data = block['@data'] || {};
    const branches = data.branches || [];

    // In JS single-thread, we simulate parallel by executing all
    const results = branches.map(branch => this.execute(branch));

    return { results, count: results.length, glyph: '⚡' };
  }

  executeControlBranch(block) {
    const data = block['@data'] || {};
    const selector = this.resolveValue(data.selector);
    const cases = data.cases || {};
    const defaultCase = data.default;

    if (cases[selector]) {
      return this.execute(cases[selector]);
    } else if (defaultCase) {
      return this.execute(defaultCase);
    }

    return null;
  }

  // ==================== GLYPH OPERATIONS ====================

  executeGlyph(block) {
    const data = block['@data'] || {};
    const glyph = data.glyph;

    if (this.glyphVM) {
      return this.glyphVM.execute(glyph);
    }

    return { glyph, executed: false, reason: 'no_vm' };
  }

  executeGlyphCompress(block) {
    const data = block['@data'] || {};
    const value = this.resolveValue(data.value);

    if (this.glyphVM) {
      return this.glyphVM.compress(value);
    }

    return { value, compressed: false };
  }

  executeGlyphExpand(block) {
    const data = block['@data'] || {};
    const glyph = data.glyph;

    if (this.glyphVM) {
      return this.glyphVM.expand(glyph);
    }

    return { glyph, expanded: false };
  }

  // ==================== BLOCK REFERENCES ====================

  executeBlockRef(block) {
    const data = block['@data'] || {};
    const refId = data.ref || data['@id'];
    const refBlock = this.blocks.get(refId);

    if (!refBlock) {
      return { error: 'block_not_found', ref: refId };
    }

    return this.execute(refBlock);
  }

  executeBlockDefine(block) {
    const data = block['@data'] || {};
    const id = data.id || block['@id'];
    const definition = data.definition;

    this.registerBlock(id, definition);
    return { defined: true, id, glyph: '📝' };
  }

  executeBlockCall(block) {
    const data = block['@data'] || {};
    const blockId = data.block;
    const args = data.args || {};

    // Set arguments as variables
    for (const [key, value] of Object.entries(args)) {
      this.setVariable(key, this.resolveValue(value));
    }

    const targetBlock = this.blocks.get(blockId);
    if (!targetBlock) {
      return { error: 'block_not_found', block: blockId };
    }

    return this.execute(targetBlock);
  }

  // ==================== ASX RAM OPERATIONS ====================

  executeAsxRead(block) {
    const data = block['@data'] || {};
    const address = data.address;

    // ASX RAM is the variables map in this context
    return this.getVariable(address);
  }

  executeAsxWrite(block) {
    const data = block['@data'] || {};
    const address = data.address;
    const value = this.resolveValue(data.value);

    this.setVariable(address, value);
    return { written: true, address, value };
  }

  executeAsxAtomic(block) {
    const data = block['@data'] || {};
    const operation = data.operation;
    const address = data.address;
    const value = this.resolveValue(data.value);

    const current = this.getVariable(address) || 0;
    let result;

    switch (operation) {
      case 'add':
        result = current + value;
        break;
      case 'sub':
        result = current - value;
        break;
      case 'mul':
        result = current * value;
        break;
      case 'cas': // Compare and swap
        const expected = this.resolveValue(data.expected);
        if (current === expected) {
          result = value;
        } else {
          return { swapped: false, current };
        }
        break;
      default:
        result = value;
    }

    this.setVariable(address, result);
    return { atomic: true, address, result, previous: current };
  }

  // ==================== NETWORK OPERATIONS ====================

  executeNetSend(block) {
    const data = block['@data'] || {};
    const target = data.target;
    const payload = this.resolveValue(data.payload);

    // Network operations are handled by P2P layer
    return { queued: true, target, payload, glyph: '📡' };
  }

  executeNetReceive(block) {
    const data = block['@data'] || {};
    const source = data.source;
    const timeout = data.timeout || 5000;

    // Placeholder for network receive
    return { waiting: true, source, timeout, glyph: '📡' };
  }

  executeNetBroadcast(block) {
    const data = block['@data'] || {};
    const payload = this.resolveValue(data.payload);

    return { broadcast: true, payload, glyph: '📢' };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all state
   */
  reset() {
    this.blocks.clear();
    this.variables.clear();
    this.executionTrace = [];
    return this;
  }

  /**
   * Get execution trace
   */
  getTrace() {
    return this.executionTrace;
  }

  /**
   * Get execution statistics
   */
  getStats() {
    const successful = this.executionTrace.filter(t => t.success).length;
    const failed = this.executionTrace.filter(t => !t.success).length;

    return {
      total_executions: this.executionTrace.length,
      successful,
      failed,
      blocks_registered: this.blocks.size,
      variables_set: this.variables.size
    };
  }

  /**
   * Export state
   */
  exportState() {
    return {
      blocks: Object.fromEntries(this.blocks),
      variables: Object.fromEntries(this.variables),
      trace: this.executionTrace
    };
  }

  /**
   * Import state
   */
  importState(state) {
    if (state.blocks) {
      for (const [id, block] of Object.entries(state.blocks)) {
        this.registerBlock(id, block);
      }
    }
    if (state.variables) {
      for (const [name, value] of Object.entries(state.variables)) {
        this.setVariable(name, value);
      }
    }
    return this;
  }
}

// Export for Service Worker
if (typeof self !== 'undefined') {
  self.BlockExecutor = BlockExecutor;
}
