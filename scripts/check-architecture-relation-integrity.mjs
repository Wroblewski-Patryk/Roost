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
  return rows.slice(1).map((values, idx) => {
    const record = { __file: relativePath, __line: idx + 2 };
    header.forEach((name, ix) => {
      record[name] = values[ix] ?? "";
    });
    return record;
  });
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function main() {
  const nodes = nodeFiles.flatMap(loadCsv);
  const nodeIds = new Set(nodes.map((row) => row.id).filter(Boolean));
  const relations = loadCsv("docs/architecture/relations/dependencies.csv");

  const idSeen = new Map();
  const tupleSeen = new Map();
  const issues = [];

  for (const row of relations) {
    if (!row.id) {
      issues.push({
        type: "missing_id",
        file: row.__file,
        line: row.__line
      });
    } else if (idSeen.has(row.id)) {
      issues.push({
        type: "duplicate_relation_id",
        id: row.id,
        left: idSeen.get(row.id),
        right: { file: row.__file, line: row.__line }
      });
    } else {
      idSeen.set(row.id, { file: row.__file, line: row.__line });
    }

    if (!row.source_id || !row.target_id) {
      issues.push({
        type: "missing_endpoint",
        id: row.id || "",
        file: row.__file,
        line: row.__line
      });
    }

    if (row.source_id && !nodeIds.has(row.source_id)) {
      issues.push({
        type: "missing_source_node",
        id: row.id || "",
        source_id: row.source_id,
        file: row.__file,
        line: row.__line
      });
    }

    if (row.target_id && !nodeIds.has(row.target_id)) {
      issues.push({
        type: "missing_target_node",
        id: row.id || "",
        target_id: row.target_id,
        file: row.__file,
        line: row.__line
      });
    }

    const tupleKey = [
      normalize(row.source_id),
      normalize(row.target_id),
      normalize(row.relation_type),
      normalize(row.direction || "outbound")
    ].join("::");

    if (tupleSeen.has(tupleKey)) {
      issues.push({
        type: "duplicate_relation_tuple",
        id: row.id || "",
        tuple: tupleKey,
        left: tupleSeen.get(tupleKey),
        right: { file: row.__file, line: row.__line }
      });
    } else {
      tupleSeen.set(tupleKey, { file: row.__file, line: row.__line, id: row.id || "" });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    checkedRelations: relations.length,
    nodeCount: nodeIds.size,
    issues: issues.length,
    issueRows: issues
  };

  writeText("docs/status/architecture-relation-integrity-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length > 0) {
    console.error(`Architecture relation integrity gate failed: ${issues.length} issues.`);
    process.exit(1);
  }

  console.log(`Architecture relation integrity gate passed: ${relations.length} relations checked, 0 issues.`);
}

main();
