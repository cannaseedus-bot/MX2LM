import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const generatedPath = path.join(root, 'runtime', 'kql.js');
const tempDir = path.join(root, '.tmp-kql-check');
const tempOutputPath = path.join(tempDir, 'kql.js');

fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execFileSync('tsc', [
  path.join(root, 'runtime', 'kql.ts'),
  '--target',
  'ES2020',
  '--module',
  'commonjs',
  '--outDir',
  tempDir,
  '--declaration',
  'false',
  '--sourceMap',
  'false',
  '--skipLibCheck',
  '--noCheck'
], { stdio: 'inherit' });

const banner = `/**\n * GENERATED FILE - DO NOT EDIT DIRECTLY.\n * Source: runtime/kql.ts\n * Regenerate with: npm run build:kql\n */\n\n`;
const expected = banner + fs.readFileSync(tempOutputPath, 'utf8');
const actual = fs.existsSync(generatedPath) ? fs.readFileSync(generatedPath, 'utf8') : '';

fs.rmSync(tempDir, { recursive: true, force: true });

if (actual !== expected) {
  console.error('KQL runtime drift detected: runtime/kql.js is out of date with runtime/kql.ts');
  console.error('Run: npm run build:kql');
  process.exit(1);
}

console.log('KQL runtime is in sync with canonical source.');
