#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { verifyTraceSeal, hashJson, sealFromHash } from "./trace_store.mjs";

function usage() {
  console.error("Usage: node runtime/trace_inspector.mjs <trace_record.json> [--output out.html]");
  process.exit(1);
}

function parseArgs(argv) {
  const args = { tracePath: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--output") {
      args.output = argv[++i];
    } else if (!args.tracePath) {
      args.tracePath = arg;
    } else {
      usage();
    }
  }
  if (!args.tracePath) usage();
  return args;
}

async function readTraceRecord(tracePath) {
  const content = await fs.readFile(tracePath, "utf8");
  const record = JSON.parse(content);
  if (!record.trace || !record.shell) {
    throw new Error("Trace record missing required fields (trace + shell)");
  }
  return record;
}

async function loadShell(record, baseDir) {
  const candidates = [
    record.shell.stored_path,
    record.shell.original_path,
  ].filter(Boolean);

  for (const p of candidates) {
    const abs = path.isAbsolute(p) ? p : path.join(baseDir, p);
    try {
      const svg = await fs.readFile(abs, "utf8");
      return { svg, path: abs };
    } catch {
      // try next candidate
    }
  }
  throw new Error("Unable to load shell artifact for trace record");
}

function verifyImmutability(record, shellHash) {
  const shellValid = record.shell?.hash === shellHash && record.shell?.seal === sealFromHash(shellHash);
  const traceValid = verifyTraceSeal(record.trace, shellHash);
  if (!shellValid || !traceValid) {
    throw new Error("Trace or shell failed seal verification");
  }
  return true;
}

function renderHtml(record, shellSvg, shellPath) {
  const title = `Trace ${record.trace.trace_id}`;
  const metadata = {
    brain: record.trace.brain_id,
    domain: record.trace.domain,
    stored_at: record.stored_at,
    shell_path: shellPath,
  };

  const prelude = [
    "<!DOCTYPE html>",
    "<html><head>",
    `<meta charset="UTF-8"><title>${title}</title>`,
    "<style>",
    "body { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; background:#0b1021; color:#e2e8f0; padding:16px; }",
    ".panel { background:#111827; border:1px solid #1f2937; border-radius:8px; padding:12px; margin-bottom:16px; }",
    "pre { white-space: pre-wrap; word-break: break-word; }",
    "svg { background:#0f172a; border:1px solid #1f2937; border-radius:8px; width:100%; height:auto; }",
    "</style>",
    "</head><body>",
    `<h1>${title}</h1>`,
  ];

  const metaBlock = `<div class="panel"><h2>Metadata</h2><pre>${JSON.stringify(metadata, null, 2)}</pre></div>`;
  const traceBlock = `<div class="panel"><h2>Trace</h2><pre>${JSON.stringify(record.trace, null, 2)}</pre></div>`;
  const shellBlock = `<div class="panel"><h2>Shell Geometry</h2>${shellSvg}</div>`;
  const outro = "</body></html>";

  return [...prelude, metaBlock, traceBlock, shellBlock, outro].join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const record = await readTraceRecord(args.tracePath);
  const baseDir = path.dirname(args.tracePath);
  const { svg, path: shellPath } = await loadShell(record, baseDir);
  const shellHash = hashJson(svg);

  verifyImmutability(record, shellHash);

  const html = renderHtml(record, svg, shellPath);

  if (args.output) {
    const outPath = path.isAbsolute(args.output)
      ? args.output
      : path.join(process.cwd(), args.output);
    await fs.writeFile(outPath, html, "utf8");
    console.log(`Trace inspector output written to ${outPath}`);
  } else {
    console.log(html);
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((err) => {
    console.error("trace_inspector error:", err.message);
    process.exit(1);
  });
}
