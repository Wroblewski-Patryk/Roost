import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const impactPath = "docs/status/architecture-impact-index.json";

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const row of records) {
    lines.push(header.map((key) => csvEscape(row[key] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const impact = JSON.parse(readText(impactPath));
  const rows = Array.isArray(impact.rows) ? impact.rows : [];

  const actionableStatuses = new Set(["implemented", "tested", "verified", "in_progress", "broken", "blocked"]);
  const excludedFeatures = new Set(["coverage-expansion"]);

  const dead = rows.filter((row) => {
    const status = String(row.status || "").toLowerCase();
    if (!actionableStatuses.has(status)) return false;
    if (excludedFeatures.has(String(row.feature || "").toLowerCase())) return false;
    const directOut = Number(row.direct_out_count || 0);
    const directIn = Number(row.direct_in_count || 0);
    const transitiveOut = Number(row.transitive_out_count || 0);
    const transitiveIn = Number(row.transitive_in_count || 0);
    return directOut === 0 && directIn === 0 && transitiveOut === 0 && transitiveIn === 0;
  });

  dead.sort((a, b) => {
    const aImpact = Number(a.impact_score || 0);
    const bImpact = Number(b.impact_score || 0);
    return bImpact - aImpact;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    checkedRows: rows.length,
    deadCount: dead.length,
    deadRows: dead
  };

  writeText("docs/status/architecture-dead-nodes-report.json", `${JSON.stringify(report, null, 2)}\n`);
  writeText(
    "docs/status/architecture-dead-nodes.csv",
    toCsv(
      [
        "node_id",
        "node_name",
        "type",
        "module",
        "feature",
        "status",
        "impact_score",
        "direct_out_count",
        "direct_in_count",
        "transitive_out_count",
        "transitive_in_count"
      ],
      dead
    )
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        checkedRows: report.checkedRows,
        deadCount: report.deadCount
      },
      null,
      2
    )
  );
}

main();
