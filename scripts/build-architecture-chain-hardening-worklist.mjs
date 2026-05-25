import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === "\"") quoted = true;
    else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function loadCsv(relativePath) {
  const rows = parseCsv(readText(relativePath));
  const header = rows[0];
  const records = rows.slice(1).map((values) => {
    const out = {};
    header.forEach((name, idx) => {
      out[name] = values[idx] ?? "";
    });
    return out;
  });
  return records;
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function score(row, featureById) {
  const feature = featureById.get(row.feature_id);
  const featureRisk = String(feature?.risk_level || "").toLowerCase();
  const risk = String(row.risk_level || featureRisk || "medium").toLowerCase();
  const base = risk === "high" ? 80 : risk === "medium" ? 50 : 25;
  const missingNodes = splitIds(row.missing_nodes).length;
  const hasTests = splitIds(row.tests).length > 0;
  const hasDocs = splitIds(row.docs).length > 0;
  let bonus = 0;
  if (missingNodes > 0) bonus += 10;
  if (!hasTests) bonus += 8;
  if (!hasDocs) bonus += 5;
  if (String(row.verification_status || "").toLowerCase() === "partial") bonus += 10;
  if (!row.last_verified_at) bonus += 5;
  return base + bonus;
}

function main() {
  const chains = loadCsv("docs/architecture/chains/chains.csv");
  const features = loadCsv("docs/architecture/nodes/features.csv");
  const featureById = new Map(features.map((f) => [f.id, f]));

  const candidates = chains
    .filter((chain) => ["partial", "partially_verified"].includes(String(chain.verification_status || "").toLowerCase()))
    .map((chain) => {
      const feature = featureById.get(chain.feature_id);
      const missingKinds = [];
      if (splitIds(chain.missing_nodes).length > 0) missingKinds.push("missing_nodes");
      if (splitIds(chain.tests).length === 0) missingKinds.push("tests");
      if (splitIds(chain.docs).length === 0) missingKinds.push("docs");
      if (!chain.last_verified_at) missingKinds.push("dated_verification");
      return {
        chain_id: chain.id,
        chain_name: chain.name,
        feature_id: chain.feature_id,
        feature_name: feature?.name || "",
        module: feature?.module || "",
        verification_status: chain.verification_status || "",
        risk_level: chain.risk_level || feature?.risk_level || "medium",
        missing: missingKinds.join(";"),
        next_action: "Add direct UI/API/DB/test/doc evidence links and promote chain status.",
        score: score(chain, featureById)
      };
    })
    .sort((a, b) => b.score - a.score);

  const csvHeader = [
    "rank",
    "chain_id",
    "chain_name",
    "feature_id",
    "feature_name",
    "module",
    "verification_status",
    "risk_level",
    "missing",
    "score",
    "next_action"
  ];

  const csvRows = [
    csvHeader.join(","),
    ...candidates.map((row, idx) => csvHeader.map((h) => csvEscape(h === "rank" ? idx + 1 : row[h])).join(","))
  ];
  writeText("docs/status/architecture-chain-hardening-worklist.csv", `${csvRows.join("\n")}\n`);

  const summary = {
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    byStatus: candidates.reduce((acc, row) => {
      acc[row.verification_status] = (acc[row.verification_status] ?? 0) + 1;
      return acc;
    }, {}),
    top10: candidates.slice(0, 10)
  };
  writeText("docs/status/architecture-chain-hardening-worklist-summary.json", `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({ generatedAt: summary.generatedAt, total: summary.total }, null, 2));
}

main();
