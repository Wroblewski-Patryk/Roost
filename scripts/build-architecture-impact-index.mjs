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

function ensureEdge(graph, from, to) {
  if (!from || !to || from === to) return;
  if (!graph.has(from)) graph.set(from, new Set());
  graph.get(from).add(to);
}

function bfsReach(graph, start) {
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const next of graph.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  visited.delete(start);
  return visited;
}

function main() {
  const rawNodes = nodeFiles.flatMap((file) => loadCsv(file).records);
  const nodeMap = new Map();
  for (const node of rawNodes) {
    if (!node.id || nodeMap.has(node.id)) continue;
    nodeMap.set(node.id, node);
  }
  const nodes = [...nodeMap.values()];
  const relations = loadCsv("docs/architecture/relations/dependencies.csv").records;
  const chains = loadCsv("docs/architecture/chains/chains.csv").records;
  const nodeIds = new Set(nodes.map((n) => n.id).filter(Boolean));

  const outgoing = new Map();
  const incoming = new Map();
  const add = (from, to) => {
    if (!nodeIds.has(from) || !nodeIds.has(to)) return;
    ensureEdge(outgoing, from, to);
    ensureEdge(incoming, to, from);
  };

  for (const relation of relations) {
    add(relation.source_id, relation.target_id);
  }

  for (const node of nodes) {
    for (const target of splitIds(node.depends_on)) add(node.id, target);
    for (const target of splitIds(node.used_by)) add(target, node.id);
    for (const target of splitIds(node.api_related)) add(node.id, target);
    for (const target of splitIds(node.database_related)) add(node.id, target);
    for (const target of splitIds(node.tests_related)) add(node.id, target);
    for (const target of splitIds(node.docs_related)) add(node.id, target);
    if (node.parent_id) add(node.parent_id, node.id);
    for (const target of splitIds(node.child_ids)) add(node.id, target);
  }

  for (const chain of chains) {
    const sequence = splitIds(chain.node_sequence);
    for (let i = 0; i < sequence.length - 1; i += 1) {
      add(sequence[i], sequence[i + 1]);
    }
    if (chain.feature_id && sequence.length) {
      add(chain.feature_id, sequence[0]);
    }
  }

  const rows = [];
  for (const node of nodes) {
    const directOut = [...(outgoing.get(node.id) ?? [])].sort();
    const directIn = [...(incoming.get(node.id) ?? [])].sort();
    const transitiveOut = [...bfsReach(outgoing, node.id)].sort();
    const transitiveIn = [...bfsReach(incoming, node.id)].sort();

    rows.push({
      node_id: node.id,
      node_name: node.name || "",
      type: node.type || "",
      module: node.module || "",
      feature: node.feature || "",
      status: node.status || "",
      direct_out_count: directOut.length,
      direct_in_count: directIn.length,
      transitive_out_count: transitiveOut.length,
      transitive_in_count: transitiveIn.length,
      impact_score: (directOut.length * 2) + transitiveOut.length + directIn.length,
      direct_out_nodes: directOut.join(";"),
      direct_in_nodes: directIn.join(";"),
      transitive_out_nodes: transitiveOut.join(";"),
      transitive_in_nodes: transitiveIn.join(";")
    });
  }

  rows.sort((a, b) => Number(b.impact_score) - Number(a.impact_score));
  const top = rows.slice(0, 50);

  const report = {
    generatedAt: new Date().toISOString(),
    nodes: nodes.length,
    relations: relations.length,
    chains: chains.length,
    topByImpact: top.map((row) => ({
      node_id: row.node_id,
      node_name: row.node_name,
      impact_score: row.impact_score,
      direct_out_count: row.direct_out_count,
      transitive_out_count: row.transitive_out_count
    })),
    rows
  };

  writeText("docs/status/architecture-impact-index.json", `${JSON.stringify(report, null, 2)}\n`);
  writeText(
    "docs/status/architecture-impact-top.csv",
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
      top
    )
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        nodes: report.nodes,
        topCount: top.length
      },
      null,
      2
    )
  );
}

main();
