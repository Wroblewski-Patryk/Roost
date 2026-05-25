import fs from "fs";
import path from "path";

const root = process.cwd();
const statusDir = path.join(root, "docs/status");
const jsonPath = path.join(statusDir, "architecture-registry-catalog.json");
const mdPath = path.join(statusDir, "architecture-registry-catalog.md");

const csvFiles = [
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
  "docs/architecture/nodes/workflows.csv",
  "docs/architecture/relations/dependencies.csv",
  "docs/architecture/chains/chains.csv",
  "docs/testing/test-map.csv",
  "docs/status/evidence-status.csv"
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
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0];
  const body = rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });
  return { headers, rows: body };
}

fs.mkdirSync(statusDir, { recursive: true });

const entries = [];
for (const rel of csvFiles) {
  const abs = path.join(root, rel);
  const exists = fs.existsSync(abs);
  if (!exists) {
    entries.push({
      file: rel,
      exists: false,
      rowCount: 0,
      headerCount: 0
    });
    continue;
  }
  const parsed = parseCsv(fs.readFileSync(abs, "utf8"));
  entries.push({
    file: rel,
    exists: true,
    rowCount: parsed.rows.length,
    headerCount: parsed.headers.length
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalFiles: entries.length,
  missingFiles: entries.filter((e) => !e.exists).length,
  totalRows: entries.reduce((acc, e) => acc + e.rowCount, 0),
  files: entries
};

fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

const lines = [
  "# Architecture Registry Catalog",
  "",
  `Generated at: ${summary.generatedAt}`,
  "",
  `- Total CSV files: ${summary.totalFiles}`,
  `- Missing files: ${summary.missingFiles}`,
  `- Total rows: ${summary.totalRows}`,
  "",
  "| File | Exists | Rows | Headers |",
  "| --- | --- | ---: | ---: |",
  ...entries.map((e) => `| \`${e.file}\` | ${e.exists ? "yes" : "no"} | ${e.rowCount} | ${e.headerCount} |`)
];
fs.writeFileSync(mdPath, `${lines.join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      generatedAt: summary.generatedAt,
      totalFiles: summary.totalFiles,
      missingFiles: summary.missingFiles,
      totalRows: summary.totalRows
    },
    null,
    2
  )
);
