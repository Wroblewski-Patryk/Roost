import fs from "fs";
import path from "path";

const root = process.cwd();
const pipelineCsvPath = path.join(root, "docs/architecture/nodes/pipelines.csv");
const reportPath = path.join(root, "docs/status/architecture-pipeline-nodes-report.json");

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
    if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
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
    const record = {};
    header.forEach((name, idx) => {
      record[name] = values[idx] ?? "";
    });
    return record;
  });
  return { header, records };
}

if (!fs.existsSync(pipelineCsvPath)) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason: "Missing docs/architecture/nodes/pipelines.csv"
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const csv = parseCsv(fs.readFileSync(pipelineCsvPath, "utf8"));
const issues = [];

for (const row of csv.records) {
  const id = row.id || "(missing-id)";
  const type = row.type || "";
  const filePath = row.file_path || "";
  if (type !== "pipeline") {
    issues.push({
      id,
      issue: "invalid_type",
      detail: `Expected type=pipeline, got ${type || "(empty)"}`
    });
  }
  if (!filePath) {
    issues.push({
      id,
      issue: "missing_file_path",
      detail: "file_path is empty"
    });
    continue;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (![".mjs", ".js", ".ts"].includes(ext)) {
    issues.push({
      id,
      issue: "invalid_extension",
      detail: `Unexpected pipeline file extension: ${ext || "(none)"}`
    });
  }
  const absolute = path.join(root, filePath);
  if (!fs.existsSync(absolute)) {
    issues.push({
      id,
      issue: "missing_file",
      detail: `Referenced file does not exist: ${filePath}`
    });
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  status: issues.length ? "failed" : "passed",
  checkedRows: csv.records.length,
  issuesCount: issues.length,
  issues
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (issues.length) {
  console.error(`Architecture pipeline node gate failed with ${issues.length} issue(s).`);
  for (const issue of issues.slice(0, 50)) {
    console.error(`- ${issue.id}: ${issue.issue} -> ${issue.detail}`);
  }
  if (issues.length > 50) {
    console.error(`... and ${issues.length - 50} more`);
  }
  process.exit(1);
}

console.log(`Architecture pipeline node gate passed: ${csv.records.length} rows checked.`);
