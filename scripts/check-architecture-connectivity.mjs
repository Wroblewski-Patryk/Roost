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
  const records = rows.slice(1).map((values) => {
    const record = {};
    header.forEach((name, idx) => {
      record[name] = values[idx] ?? "";
    });
    return record;
  });
  return { header, records };
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function main() {
  const allNodes = nodeFiles.flatMap((file) => loadCsv(file).records);
  const relations = loadCsv("docs/architecture/relations/dependencies.csv").records;
  const chains = loadCsv("docs/architecture/chains/chains.csv").records;

  const relationLinked = new Set();
  for (const rel of relations) {
    if (rel.source_id) relationLinked.add(rel.source_id);
    if (rel.target_id) relationLinked.add(rel.target_id);
  }

  const chainLinked = new Set();
  for (const chain of chains) {
    for (const nodeId of splitIds(chain.node_sequence)) {
      chainLinked.add(nodeId);
    }
    if (chain.feature_id) chainLinked.add(chain.feature_id);
  }

  const actionableStatuses = new Set(["implemented", "tested", "verified", "in_progress", "broken", "blocked"]);
  const issues = [];

  for (const node of allNodes) {
    const status = String(node.status || "").toLowerCase();
    if (!actionableStatuses.has(status)) continue;
    if (String(node.feature || "").toLowerCase() === "coverage-expansion") continue;

    const hasLinkField = Boolean(
      node.parent_id ||
      splitIds(node.child_ids).length ||
      splitIds(node.depends_on).length ||
      splitIds(node.used_by).length ||
      splitIds(node.api_related).length ||
      splitIds(node.database_related).length ||
      splitIds(node.tests_related).length ||
      splitIds(node.docs_related).length ||
      splitIds(node.agent_related).length
    );
    const hasRelation = relationLinked.has(node.id);
    const hasChain = chainLinked.has(node.id);

    if (!hasLinkField && !hasRelation && !hasChain) {
      issues.push({
        node_id: node.id,
        type: node.type,
        status: node.status,
        module: node.module,
        feature: node.feature
      });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    checkedNodes: allNodes.length,
    issues: issues.length,
    issueRows: issues
  };
  writeText("docs/status/architecture-connectivity-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length) {
    console.error(`Architecture connectivity gate failed: ${issues.length} orphan actionable nodes.`);
    process.exit(1);
  }

  console.log(`Architecture connectivity gate passed: ${allNodes.length} nodes checked, 0 orphan actionable nodes.`);
}

main();
