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

function loadCsv(relativePath) {
  const rows = parseCsv(readText(relativePath));
  const header = rows[0];
  const records = rows.slice(1).map((values, idx) => {
    const record = { __file: relativePath, __line: idx + 2 };
    header.forEach((name, ix) => {
      record[name] = values[ix] ?? "";
    });
    return record;
  });
  return records;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function collectConflicts(records) {
  const byId = new Map();
  for (const row of records) {
    if (!row.id) continue;
    if (!byId.has(row.id)) byId.set(row.id, []);
    byId.get(row.id).push(row);
  }

  const duplicateIds = [];
  const conflicts = [];
  for (const [id, rows] of byId.entries()) {
    if (rows.length <= 1) continue;
    duplicateIds.push(id);

    const baseline = rows[0];
    const comparableFields = ["type", "status", "verification_status", "name", "file_path"];
    for (const row of rows.slice(1)) {
      for (const field of comparableFields) {
        const a = normalize(baseline[field]);
        const b = normalize(row[field]);
        if (a === b) continue;
        if (field === "file_path" && (!a || !b)) continue;
        conflicts.push({
          id,
          field,
          left: { file: baseline.__file, line: baseline.__line, value: baseline[field] || "" },
          right: { file: row.__file, line: row.__line, value: row[field] || "" }
        });
      }
    }
  }

  return { duplicateIds, conflicts };
}

function main() {
  const rows = nodeFiles.flatMap(loadCsv);
  const { duplicateIds, conflicts } = collectConflicts(rows);

  const report = {
    checkedAt: new Date().toISOString(),
    checkedRows: rows.length,
    uniqueIds: new Set(rows.map((row) => row.id).filter(Boolean)).size,
    duplicateIds: duplicateIds.length,
    conflicts: conflicts.length,
    conflictRows: conflicts
  };

  writeText("docs/status/architecture-node-catalog-consistency-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (conflicts.length > 0) {
    console.error(`Architecture node catalog consistency gate failed: ${conflicts.length} duplicate-id conflicts.`);
    process.exit(1);
  }

  console.log(
    `Architecture node catalog consistency gate passed: ${report.uniqueIds} unique ids, ${report.duplicateIds} duplicate ids, 0 conflicts.`
  );
}

main();
