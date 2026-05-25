import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const nodeFiles = [
  "docs/architecture/nodes/nodes.csv",
  "docs/architecture/nodes/features.csv",
  "docs/architecture/nodes/functions.csv",
  "docs/architecture/nodes/components.csv",
  "docs/architecture/nodes/services.csv",
  "docs/architecture/nodes/classes.csv",
  "docs/architecture/nodes/api_routes.csv",
  "docs/architecture/nodes/pages.csv",
  "docs/architecture/nodes/layouts.csv",
  "docs/architecture/nodes/hooks.csv",
  "docs/architecture/nodes/stores.csv",
  "docs/architecture/nodes/ui_elements.csv",
  "docs/architecture/nodes/animations.csv",
  "docs/architecture/nodes/database_models.csv",
  "docs/architecture/nodes/migrations.csv",
  "docs/architecture/nodes/integrations.csv",
  "docs/architecture/nodes/middleware.csv",
  "docs/architecture/nodes/pipelines.csv",
  "docs/architecture/nodes/cron_jobs.csv",
  "docs/architecture/nodes/tests.csv",
  "docs/architecture/nodes/docs.csv",
  "docs/architecture/nodes/config_files.csv",
  "docs/architecture/nodes/agents.csv",
  "docs/architecture/nodes/prompts.csv",
  "docs/architecture/nodes/events.csv",
  "docs/architecture/nodes/workflows.csv"
];

const evidencePath = "docs/status/evidence-status.csv";

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
  return { header, records };
}

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const row of records) {
    lines.push(header.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function nextEvidenceId(records) {
  const nums = records
    .map((r) => String(r.id || ""))
    .filter((id) => id.startsWith("EVID-AUTO-"))
    .map((id) => Number(id.replace("EVID-AUTO-", "")))
    .filter((n) => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `EVID-AUTO-${String(n).padStart(5, "0")}`;
}

function main() {
  const rawNodes = nodeFiles.flatMap((file) => {
    const csv = loadCsv(file);
    return csv.records.map((r) => ({ ...r, __source: file }));
  });
  const byId = new Map();
  for (const node of rawNodes) {
    if (!node.id) continue;
    if (!byId.has(node.id)) byId.set(node.id, node);
  }
  const allNodes = [...byId.values()];

  const evidenceCsv = loadCsv(evidencePath);
  const byNodeId = new Set(evidenceCsv.records.map((r) => r.node_id));
  const existingIds = new Set(evidenceCsv.records.map((r) => r.id));

  let added = 0;
  for (const node of allNodes) {
    if (!node.id || byNodeId.has(node.id)) continue;
    let id = nextEvidenceId(evidenceCsv.records);
    while (existingIds.has(id)) {
      id = nextEvidenceId([...evidenceCsv.records, { id }]);
    }
    const record = {
      id,
      node_id: node.id,
      implementation_proof: node.file_path || "",
      test_proof: "",
      runtime_proof: "",
      connection_proof: "",
      documentation_proof: "",
      overall_status: "missing",
      last_verified_at: "",
      missing_evidence: "implementation_test_runtime_connection_docs",
      next_action: "Add proof artifacts and upgrade status to tested or verified."
    };
    evidenceCsv.records.push(record);
    byNodeId.add(node.id);
    existingIds.add(id);
    added += 1;
  }

  writeText(evidencePath, toCsv(evidenceCsv.header, evidenceCsv.records));
  const report = {
    synchronizedAt: new Date().toISOString(),
    nodeCount: allNodes.length,
    evidenceRows: evidenceCsv.records.length,
    added
  };
  writeText("docs/status/architecture-evidence-sync-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
