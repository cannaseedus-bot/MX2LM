/**
 * K'UHUL Math Engine — AGL (Atomic Glyph Language) executor.
 *
 * This module treats symbolic math glyphs as executable XJSON contracts that
 * can cross DOM ↔ API boundaries without needing a Python runtime.
 * Contracts are plain objects that describe the glyph to run, the expression
 * to evaluate, and any bounds or parameters needed by the operation.
 *
 * Example contract (integral):
 * {
 *   "@glyph": "∫",
 *   "@expression": "x * x + 2 * x",
 *   "@bounds": [0, 10],
 *   "@steps": 200,
 *   "@phase": "Sek",
 *   "@execute": "js.math.integrate"
 * }
 */

const DEFAULT_STEPS = 512;
const DEFAULT_DELTA = 1e-4;

const AGL_GLYPH_REGISTRY = Object.freeze({
  "∫": {
    name: "integrate",
    phase: "Sek",
    description: "Simpson's rule integral over bounded interval",
    handler: integrateGlyph
  },
  "∂": {
    name: "differentiate",
    phase: "Sek",
    description: "Central difference derivative at a point",
    handler: derivativeGlyph
  },
  "∑": {
    name: "summation",
    phase: "Sek",
    description: "Discrete summation across integer bounds",
    handler: summationGlyph
  },
  "√": {
    name: "sqrt",
    phase: "Sek",
    description: "Square root using JavaScript primitives",
    handler: sqrtGlyph
  },
  "sin": {
    name: "sine",
    phase: "Sek",
    description: "Sine function wrapper for completeness",
    handler: sineGlyph
  }
});

/** Compile a string expression into a JavaScript function of x. */
function compileExpression(expression) {
  if (typeof expression !== "string" || !expression.trim()) {
    throw new Error("@expression must be a non-empty string");
  }

  // Restrict scope to Math and the variable x.
  return new Function("Math", "x", `return ${expression};`).bind(null, Math);
}

function ensureNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function ensureBounds(bounds) {
  if (!Array.isArray(bounds) || bounds.length !== 2) {
    throw new Error("@bounds must be a two-element array [lower, upper]");
  }
  return [ensureNumber(bounds[0], "lower bound"), ensureNumber(bounds[1], "upper bound")];
}

function normalizeContract(contract) {
  if (!contract || typeof contract !== "object") {
    throw new Error("Contract must be an object");
  }

  const glyph = contract["@glyph"];
  if (typeof glyph !== "string" || !glyph) {
    throw new Error("@glyph is required");
  }

  const normalized = {
    ...contract,
    "@phase": contract["@phase"] || "Sek"
  };

  return normalized;
}

function integrateGlyph(contract) {
  const bounds = ensureBounds(contract["@bounds"]);
  const steps = contract["@steps"] ? ensureNumber(contract["@steps"], "@steps") : DEFAULT_STEPS;
  const fn = compileExpression(contract["@expression"]);

  // Simpson's rule integration
  const [a, b] = bounds;
  const n = Math.max(2, Math.floor(steps / 2) * 2); // must be even
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * fn(x);
  }

  return (h / 3) * sum;
}

function derivativeGlyph(contract) {
  const at = ensureNumber(contract["@at"], "@at");
  const delta = contract["@delta"] ? ensureNumber(contract["@delta"], "@delta") : DEFAULT_DELTA;
  const fn = compileExpression(contract["@expression"]);
  return (fn(at + delta) - fn(at - delta)) / (2 * delta);
}

function summationGlyph(contract) {
  const bounds = ensureBounds(contract["@bounds"]);
  const fn = compileExpression(contract["@expression"]);

  const start = Math.round(bounds[0]);
  const end = Math.round(bounds[1]);
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  let acc = 0;
  for (let i = lo; i <= hi; i++) {
    acc += fn(i);
  }
  return acc;
}

function sqrtGlyph(contract) {
  const value = ensureNumber(contract["@value"], "@value");
  return Math.sqrt(value);
}

function sineGlyph(contract) {
  const value = ensureNumber(contract["@value"], "@value");
  return Math.sin(value);
}

/**
 * Execute a glyph contract and return a deterministic result envelope.
 * The envelope makes it easy to route over DOM ↔ API without changing shape.
 */
function executeGlyphContract(contract) {
  const normalized = normalizeContract(contract);
  const glyph = AGL_GLYPH_REGISTRY[normalized["@glyph"]];

  if (!glyph) {
    throw new Error(`Unknown glyph: ${normalized["@glyph"]}`);
  }

  const result = glyph.handler(normalized);

  return {
    "@glyph": normalized["@glyph"],
    "@name": glyph.name,
    "@phase": normalized["@phase"],
    "@execute": normalized["@execute"] || `js.math.${glyph.name}`,
    "@result": result,
    "@timestamp": Date.now(),
    "@transport": "XJSON",
    "@law": "K'UHUL_AGL_MATH_ENGINE"
  };
}

/**
 * Helper to assemble a contract payload with sensible defaults.
 */
function buildContract({ glyph, expression, bounds, value, steps, at, delta, execute, phase }) {
  const contract = { "@glyph": glyph };
  if (expression) contract["@expression"] = expression;
  if (bounds) contract["@bounds"] = bounds;
  if (typeof value === "number") contract["@value"] = value;
  if (typeof steps === "number") contract["@steps"] = steps;
  if (typeof at === "number") contract["@at"] = at;
  if (typeof delta === "number") contract["@delta"] = delta;
  if (phase) contract["@phase"] = phase;
  if (execute) contract["@execute"] = execute;
  return contract;
}

const KuhulMathEngine = {
  AGL_GLYPH_REGISTRY,
  buildContract,
  executeGlyphContract,
  compileExpression
};

// Export for Node/CommonJS and browser environments.
if (typeof module !== "undefined" && module.exports) {
  module.exports = KuhulMathEngine;
} else if (typeof self !== "undefined") {
  self.KuhulMathEngine = KuhulMathEngine;
}

