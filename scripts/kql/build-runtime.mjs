import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const inputPath = path.join(root, 'runtime', 'kql.ts');
const outDir = path.join(root, 'runtime');
const outputPath = path.join(root, 'runtime', 'kql.js');

execFileSync('tsc', [
  inputPath,
  '--target',
  'ES2020',
  '--module',
  'commonjs',
  '--outDir',
  outDir,
  '--declaration',
  'false',
  '--sourceMap',
  'false',
  '--skipLibCheck',
  '--noCheck'
], { stdio: 'inherit' });

const output = fs.readFileSync(outputPath, 'utf8');
const banner = `/**\n * GENERATED FILE - DO NOT EDIT DIRECTLY.\n * Source: runtime/kql.ts\n * Regenerate with: npm run build:kql\n */\n\n`;
if (!output.startsWith('/**\n * GENERATED FILE - DO NOT EDIT DIRECTLY.')) {
  fs.writeFileSync(outputPath, banner + output, 'utf8');
}

console.log('Generated runtime/kql.js from runtime/kql.ts');
