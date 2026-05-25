import fs from "fs";
import path from "path";

const root = process.cwd();
const generatedDir = path.join(root, "docs/architecture/nodes/generated");
const reportPath = path.join(root, "docs/status/architecture-node-artifacts-report.json");
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

function slug(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    return record;
  });
}

function collectNodeIds() {
  const ids = new Set();
  for (const relative of registryFiles) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) continue;
    const rows = parseCsv(fs.readFileSync(absolute, "utf8"));
    for (const row of rows) {
      if (!row.id) continue;
      ids.add(row.id);
    }
  }
  return [...ids];
}

function main() {
  if (!fs.existsSync(generatedDir)) {
    const report = {
      generatedAt: new Date().toISOString(),
      status: "failed",
      reason: `Missing generated directory: ${generatedDir}`,
      missing: []
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.error(report.reason);
    process.exit(1);
  }

  const nodeIds = collectNodeIds();
  const missing = [];
  for (const id of nodeIds) {
    const mdFile = path.join(generatedDir, `${slug(id)}.md`);
    if (!fs.existsSync(mdFile)) {
      missing.push({
        id,
        expectedFile: path.relative(root, mdFile).replace(/\\/g, "/")
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: missing.length ? "failed" : "passed",
    totalNodes: nodeIds.length,
    missingCount: missing.length,
    missing
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (missing.length) {
    console.error("Architecture node artifact gate failed:");
    for (const row of missing.slice(0, 50)) {
      console.error(`- ${row.id} -> ${row.expectedFile}`);
    }
    if (missing.length > 50) {
      console.error(`... and ${missing.length - 50} more`);
    }
    process.exit(1);
  }

  console.log(`Architecture node artifact gate passed: ${nodeIds.length} nodes with generated markdown.`);
}

main();
