import fs from "fs";
import path from "path";

const root = process.cwd();
const reportPath = path.join(root, "docs/status/architecture-evidence-cardinality-report.json");
const evidencePath = path.join(root, "docs/status/evidence-status.csv");
const registryFiles = [
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
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0];
  const records = rows.slice(1).map((values) => {
    const out = {};
    header.forEach((h, idx) => {
      out[h] = values[idx] ?? "";
    });
    return out;
  });
  return { header, records };
}

function fail(reason, details = []) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason,
    details
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(reason);
  for (const d of details.slice(0, 50)) {
    console.error(`- ${d}`);
  }
  if (details.length > 50) {
    console.error(`... and ${details.length - 50} more`);
  }
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  fail("Missing docs/status/evidence-status.csv");
}

const nodeIds = new Set();
for (const rel of registryFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const csv = parseCsv(fs.readFileSync(abs, "utf8"));
  for (const row of csv.records) {
    if (row.id) nodeIds.add(row.id);
  }
}

const evidence = parseCsv(fs.readFileSync(evidencePath, "utf8")).records;
const byNode = new Map();
for (const row of evidence) {
  const id = row.node_id || "";
  if (!id) continue;
  byNode.set(id, (byNode.get(id) ?? 0) + 1);
}

const missing = [];
const duplicated = [];
const unknown = [];

for (const id of nodeIds) {
  const count = byNode.get(id) ?? 0;
  if (count === 0) missing.push(id);
  if (count > 1) duplicated.push(`${id} (${count})`);
}
for (const id of byNode.keys()) {
  if (!nodeIds.has(id)) unknown.push(id);
}

const details = [];
for (const id of missing) details.push(`missing evidence row for node ${id}`);
for (const item of duplicated) details.push(`duplicate evidence rows for node ${item}`);
for (const id of unknown) details.push(`evidence row references unknown node ${id}`);

if (details.length) {
  fail("Architecture evidence cardinality gate failed.", details);
}

const report = {
  checkedAt: new Date().toISOString(),
  status: "passed",
  uniqueNodes: nodeIds.size,
  evidenceRows: evidence.length,
  coveredNodes: byNode.size
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Architecture evidence cardinality gate passed: ${nodeIds.size} nodes, ${evidence.length} evidence rows.`);
