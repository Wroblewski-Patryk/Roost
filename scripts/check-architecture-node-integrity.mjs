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
  return rows.slice(1).map((values) => {
    const out = {};
    header.forEach((name, idx) => {
      out[name] = values[idx] ?? "";
    });
    return out;
  });
}

function main() {
  const issues = [];
  let checked = 0;

  for (const file of nodeFiles) {
    const rows = loadCsv(file);
    for (const row of rows) {
      checked += 1;
      const status = String(row.status || "").toLowerCase();
      const verification = String(row.verification_status || "").toLowerCase();

      if (verification === "verified" && status !== "verified") {
        issues.push({ file, id: row.id, issue: "verified_verification_status_but_status_not_verified", status, verification_status: verification });
      }
      if (verification === "tested" && ["planned", "missing", "blocked", "broken", "deprecated"].includes(status)) {
        issues.push({ file, id: row.id, issue: "tested_verification_status_with_non_implemented_status", status, verification_status: verification });
      }
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    checkedRows: checked,
    issues: issues.length,
    items: issues
  };

  writeText("docs/status/architecture-node-integrity-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length > 0) {
    console.error(`Architecture node integrity gate failed: ${issues.length} issue(s).`);
    process.exit(1);
  }

  console.log(`Architecture node integrity gate passed: ${checked} rows checked, 0 issues.`);
}

main();
