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

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadCsv(relativePath) {
  const rows = parseCsv(readText(relativePath));
  const header = rows[0];
  return rows.slice(1).map((values) => {
    const out = {};
    header.forEach((name, idx) => {
      out[name] = values[idx] ?? "";
    });
    return out;
  });
}

function main() {
  const chains = loadCsv("docs/architecture/chains/chains.csv");
  const issues = [];

  for (const chain of chains) {
    const id = chain.id;
    const verification = String(chain.verification_status || "").toLowerCase();
    const missingNodes = splitIds(chain.missing_nodes);
    const tests = splitIds(chain.tests);
    const docs = splitIds(chain.docs);
    const sequence = splitIds(chain.node_sequence);
    const hasStructuralMissingNodes = missingNodes.some((token) => {
      const normalized = token.toLowerCase();
      return normalized.includes("deep_link_enrichment_required")
        || normalized.includes("missing")
        || normalized.includes("unmapped")
        || normalized.includes("unknown");
    });

    if (!sequence.length) issues.push({ chain_id: id, issue: "empty_node_sequence" });
    if (!chain.entry_node_id) issues.push({ chain_id: id, issue: "missing_entry_node_id" });
    if (!chain.exit_node_id) issues.push({ chain_id: id, issue: "missing_exit_node_id" });

    const normalizedStatus = String(chain.status || "").toLowerCase();
    if (verification === "verified" && normalizedStatus !== "verified") {
      issues.push({ chain_id: id, issue: "verified_verification_status_but_status_not_verified" });
    }

    if (verification === "verified") {
      if (hasStructuralMissingNodes) issues.push({ chain_id: id, issue: "verified_with_missing_nodes" });
      if (!tests.length) issues.push({ chain_id: id, issue: "verified_without_tests" });
      if (!docs.length) issues.push({ chain_id: id, issue: "verified_without_docs" });
      if (!chain.last_verified_at) issues.push({ chain_id: id, issue: "verified_without_last_verified_at" });
    }

    if (verification === "tested") {
      if (!tests.length) issues.push({ chain_id: id, issue: "tested_without_tests" });
      if (!docs.length) issues.push({ chain_id: id, issue: "tested_without_docs" });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    totalChains: chains.length,
    issues: issues.length,
    items: issues
  };

  writeText("docs/status/architecture-chain-integrity-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length > 0) {
    console.error(`Architecture chain integrity gate failed: ${issues.length} issue(s).`);
    process.exit(1);
  }

  console.log(`Architecture chain integrity gate passed: ${chains.length} chains checked, 0 issues.`);
}

main();
