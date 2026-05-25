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
    lines.push(header.map((name) => csvEscape(row[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function normalizeStatus(evidenceStatus) {
  const value = String(evidenceStatus || "").toLowerCase();
  if (value === "verified") return "verified";
  if (value === "tested") return "tested";
  if (value === "implemented_not_verified") return "implemented_not_verified";
  if (value === "partial") return "partial";
  if (value === "missing") return "missing";
  if (value === "failed") return "failed";
  if (value === "blocked") return "blocked";
  return "";
}

function normalizeNodeImplementationStatus(verificationStatus, currentStatus) {
  const verification = String(verificationStatus || "").toLowerCase();
  const status = String(currentStatus || "").toLowerCase();

  if (verification === "verified") return "verified";
  if (verification === "tested") {
    if (["verified", "tested"].includes(status)) return currentStatus || "tested";
    return "implemented";
  }
  if (verification === "implemented_not_verified" || verification === "partial") {
    if (status === "in_progress") return currentStatus || "in_progress";
    return "implemented";
  }
  if (verification === "missing") {
    if (!status || status === "verified" || status === "tested" || status === "implemented") return "planned";
    return currentStatus;
  }
  if (verification === "failed") return "broken";
  if (verification === "blocked") return "blocked";
  return currentStatus;
}

function main() {
  const evidence = loadCsv("docs/status/evidence-status.csv").records;
  const evidenceByNode = new Map();
  for (const row of evidence) {
    if (!row.node_id) continue;
    evidenceByNode.set(row.node_id, row);
  }

  let updated = 0;
  const results = [];

  for (const file of nodeFiles) {
    const csv = loadCsv(file);
    let fileUpdated = 0;
    for (const row of csv.records) {
      if (!row.id) continue;
      const evidenceRow = evidenceByNode.get(row.id);
      if (!evidenceRow) continue;
      const mapped = normalizeStatus(evidenceRow.overall_status);
      if (!mapped) continue;

      const before = JSON.stringify(row);
      row.verification_status = mapped;
      row.status = normalizeNodeImplementationStatus(mapped, row.status);
      if (evidenceRow.last_verified_at) row.last_verified_at = evidenceRow.last_verified_at;
      if (JSON.stringify(row) !== before) {
        fileUpdated += 1;
        updated += 1;
      }
    }

    writeText(file, toCsv(csv.header, csv.records));
    results.push({ file, updated: fileUpdated, total: csv.records.length });
  }

  const report = {
    synchronizedAt: new Date().toISOString(),
    updated,
    files: results
  };
  writeText("docs/status/architecture-node-verification-sync-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
