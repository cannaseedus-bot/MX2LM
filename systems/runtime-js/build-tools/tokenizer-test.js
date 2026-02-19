const TokenizerHelper = require('./tokenizer-helper');

const sample = '[Pop frontend_expert] → GET /api/status';
const helper = new TokenizerHelper();

const tokens = sample.split(/\s+/);
const phases = helper.extractPhases(sample);
const errors = helper.validateSequence(tokens);

console.log('Sample input:', sample);
console.log('Phases:', phases);
console.log('Validation errors:', errors);
