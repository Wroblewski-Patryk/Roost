import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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

function main() {
  const queue = readJson("docs/status/architecture-evidence-priority-queue.json");
  const evidenceCsv = fs.readFileSync(path.join(root, "docs/status/evidence-status.csv"), "utf8");
  const rows = parseCsv(evidenceCsv);
  const header = rows[0] ?? [];
  const nodeIdIndex = header.indexOf("node_id");
  const nextActionIndex = header.indexOf("next_action");
  const evidenceByNode = new Map();
  for (const cols of rows.slice(1)) {
    evidenceByNode.set(cols[nodeIdIndex], cols[nextActionIndex] || "");
  }

  const workItems = queue.items.slice(0, 200).map((item, index) => ({
    rank: index + 1,
    node_id: item.node_id,
    node_type: item.node_type,
    module: item.module,
    feature: item.feature,
    risk_level: item.risk_level || "unspecified",
    status: item.status,
    missing: item.missing || "none",
    score: item.score,
    next_action: evidenceByNode.get(item.node_id) || "Review evidence row."
  }));

  const csvHeader = ["rank", "node_id", "node_type", "module", "feature", "risk_level", "status", "missing", "score", "next_action"];
  const csvRows = [
    csvHeader.join(","),
    ...workItems.map((row) => csvHeader.map((h) => csvEscape(row[h])).join(","))
  ];
  fs.writeFileSync(path.join(root, "docs/status/architecture-evidence-worklist.csv"), `${csvRows.join("\n")}\n`);

  const byModule = {};
  for (const row of workItems) {
    byModule[row.module] = (byModule[row.module] ?? 0) + 1;
  }
  fs.writeFileSync(
    path.join(root, "docs/status/architecture-evidence-worklist-summary.json"),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      selected: workItems.length,
      modules: byModule
    }, null, 2)}\n`
  );

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    selected: workItems.length
  }, null, 2));
}

main();
