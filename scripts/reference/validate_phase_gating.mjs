import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

if (!globalThis.atob) {
  globalThis.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}
if (!globalThis.btoa) {
  globalThis.btoa = (bin) => Buffer.from(bin, 'binary').toString('base64');
}
globalThis.self = globalThis.self || {
  addEventListener: () => {},
  location: { origin: 'http://localhost' },
  clients: { claim: async () => {} },
  skipWaiting: () => {}
};
globalThis.indexedDB = globalThis.indexedDB || { open: () => ({}) };
globalThis.importScripts = globalThis.importScripts || (() => {});

const { SupremeJSONRESTAPI } = require('../../sw.js');

const manifest = {
  '🌐NATIVE_JSON_REST_API': {
    api_routes: {
      '/infer': {
        method: 'POST',
        request_schema: { scx: 'string' },
        response_schema: { scx: 'string' }
      }
    }
  }
};

const api = new SupremeJSONRESTAPI();
api.setManifest(manifest);

const routeEntry = api.getRouteEntry('/infer', 'POST');

const validPayload = {
  scx: api.codec.encode({ prompt: 'phase-gate-check' })
};
const valid = api.runPhasePipeline(routeEntry, validPayload);

const invalidPayload = {
  scx: api.codec.encode({ prompt: 'phase-gate-check' }),
  scx_proof: 'invalid-proof'
};
const invalid = api.runPhasePipeline(routeEntry, invalidPayload);

const phaseGateHealthy = valid.ok === true;
const invalidRejected = invalid.ok === false && invalid.error === 'proof_invalid' && invalid.phase === '@Sek';

if (!phaseGateHealthy || !invalidRejected) {
  console.error('Phase gate validation failed', { valid, invalid });
  process.exit(1);
}

console.log('Phase gating validation passed.');
console.log(JSON.stringify({
  success: true,
  accepted_phase_order: ['@Pop', '@Wo', '@Sek', '@Collapse'],
  rejected_case: { error: invalid.error, phase: invalid.phase }
}, null, 2));
