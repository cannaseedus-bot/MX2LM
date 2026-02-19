import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gglLegalityOracle } from "./oracle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vectorsPath = path.resolve(__dirname, "../specs/oracle_conformance_vectors.csv");

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

const abi = {
  tokenizer: {
    allowed_regex: "^[A-Za-z#\\s]+$",
    disallowed_chars: ["#"],
  },
  grammar: {},
};

const vectors = parseCsv(vectorsPath);
for (const v of vectors) {
  const result = gglLegalityOracle(v.input, abi, true);
  if (result.stage !== v.expected_stage || result.code !== v.expected_code || result.score !== Number(v.expected_score)) {
    throw new Error(
      `${v.id} mismatch: got stage=${result.stage} code=${result.code} score=${result.score}`
    );
  }
}

console.log(`oracle-js vectors passed (${vectors.length} cases)`);
