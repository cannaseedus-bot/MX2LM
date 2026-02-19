'use strict';

/**
 * Thin adapter for browser/legacy runtime compatibility.
 * Canonical KQL implementation lives in runtime/kql.ts,
 * transpiled to runtime/kql.js.
 */

const runtime = require('../runtime/kql.js');

const KQL_VERSION = 'canonical-runtime-kql-ts';
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_INV = PHI - 1;

class KQLAPI {
  constructor(db) {
    this.db = db;
  }

  parse(kqlString) {
    const tokens = runtime.createTokens(kqlString);
    return new runtime.KQLParser(tokens).parse();
  }

  tokenize(kqlString) {
    return runtime.createTokens(kqlString);
  }

  async execute(ast) {
    const executor = new runtime.KQLExecutor(this.db);
    return executor.execute(ast);
  }

  validate(ast) {
    const errors = [];

    function validateNode(node, path = 'root') {
      if (!node || typeof node !== 'object') return;
      if (!node.type) {
        errors.push({ path, message: 'Missing type field' });
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'location' || key === 'type') continue;
        if (Array.isArray(value)) {
          value.forEach((item, i) => validateNode(item, `${path}.${key}[${i}]`));
        } else if (value && typeof value === 'object') {
          validateNode(value, `${path}.${key}`);
        }
      }
    }

    validateNode(ast);
    return { valid: errors.length === 0, errors };
  }
}

module.exports = {
  KQLAPI,
  KQLLexer: runtime.KQLLexer,
  KQLParser: runtime.KQLParser,
  KQLExecutor: runtime.KQLExecutor,
  KQLCompressor: runtime.KQLCompressor,
  initializeKQL: runtime.initializeKQL,
  createTokens: runtime.createTokens,
  KQL_VERSION,
  PHI,
  PHI_INV
};

if (typeof globalThis !== 'undefined') {
  globalThis.KQLAPI = KQLAPI;
  globalThis.KQLLexer = runtime.KQLLexer;
  globalThis.KQLParser = runtime.KQLParser;
  globalThis.KQLExecutor = runtime.KQLExecutor;
}
