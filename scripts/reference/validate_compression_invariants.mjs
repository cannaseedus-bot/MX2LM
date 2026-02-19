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

const { SCXQ2Codec, SCXQ2Engine } = require('../../sw.js');

const codec = new SCXQ2Codec(new SCXQ2Engine());

const source = {
  alpha: 1,
  beta: 'stable',
  gamma: [1, 2, 3],
  nested: { k: 'v', n: 42 }
};

const encodedA = codec.encode(source);
const encodedB = codec.encode({ ...source });
const decodedA = codec.decode(encodedA);
const decodedB = codec.decode(encodedB);

const deterministicEncoding = encodedA === encodedB;
const roundTripA = decodedA.ok && JSON.stringify(decodedA.decoded) === JSON.stringify(codec.canonicalize(source));
const roundTripB = decodedB.ok && JSON.stringify(decodedB.decoded) === JSON.stringify(codec.canonicalize(source));

if (!deterministicEncoding || !roundTripA || !roundTripB) {
  console.error('Compression invariant check failed', {
    deterministicEncoding,
    roundTripA,
    roundTripB
  });
  process.exit(1);
}

console.log('Compression invariants validation passed.');
console.log(JSON.stringify({
  success: true,
  deterministic_encoding: deterministicEncoding,
  round_trip_a: roundTripA,
  round_trip_b: roundTripB,
  fingerprint: encodedA.split(':')[1]
}, null, 2));
