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
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
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

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const record of records) {
    lines.push(header.map((name) => csvEscape(record[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nextRelationId(records) {
  const nums = records
    .map((r) => String(r.id || ""))
    .filter((id) => id.startsWith("REL-AUTO-"))
    .map((id) => Number(id.replace("REL-AUTO-", "")))
    .filter((n) => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `REL-AUTO-${String(n).padStart(4, "0")}`;
}

function relationKey(sourceId, targetId, relationType) {
  return `${sourceId}::${targetId}::${relationType}`;
}

function methodFromRouteName(name) {
  const match = String(name).match(/^([A-Z]+)\s+/);
  return match ? match[1] : "";
}

function addRelation(records, relation, existingKeys) {
  const key = relationKey(relation.source_id, relation.target_id, relation.relation_type);
  if (existingKeys.has(key)) return false;
  records.push(relation);
  existingKeys.add(key);
  return true;
}

function main() {
  const relationsPath = "docs/architecture/relations/dependencies.csv";
  const apiPath = "docs/architecture/nodes/api_routes.csv";
  const pagesPath = "docs/architecture/nodes/pages.csv";

  const relationsCsv = loadCsv(relationsPath);
  const apiCsv = loadCsv(apiPath);
  const pagesCsv = loadCsv(pagesPath);
  const allNodes = nodeFiles.flatMap((file) => loadCsv(file).records);

  const existingKeys = new Set(
    relationsCsv.records.map((r) => relationKey(r.source_id, r.target_id, r.relation_type))
  );
  const existingIds = new Set(relationsCsv.records.map((r) => r.id));

  const created = [];
  const create = (payload) => {
    let id = nextRelationId(relationsCsv.records);
    while (existingIds.has(id)) {
      id = nextRelationId([...relationsCsv.records, { id }]);
    }
    const relation = {
      id,
      source_id: payload.source_id,
      target_id: payload.target_id,
      relation_type: payload.relation_type,
      direction: "outbound",
      description: payload.description,
      status: "partial",
      evidence: payload.evidence,
      notes: "Auto-enriched relation. Upgrade to verified when directly proven.",
      tags: payload.tags
    };
    if (addRelation(relationsCsv.records, relation, existingKeys)) {
      existingIds.add(id);
      created.push(relation);
    }
  };

  for (const api of apiCsv.records) {
    if (api.parent_id) {
      create({
        source_id: api.parent_id,
        target_id: api.id,
        relation_type: "owns",
        description: "Feature owns API surface (auto-enriched).",
        evidence: apiPath,
        tags: "#auto #feature #api"
      });
    }

    const method = methodFromRouteName(api.name);
    const dbTargets = splitIds(api.database_related);
    const relType = method === "GET" ? "reads" : "writes";
    for (const db of dbTargets) {
      create({
        source_id: api.id,
        target_id: db,
        relation_type: relType,
        description: `API ${method || "UNKNOWN"} route ${relType} database surface (auto-enriched).`,
        evidence: apiPath,
        tags: "#auto #api #database"
      });
    }
  }

  for (const page of pagesCsv.records) {
    for (const apiId of splitIds(page.api_related)) {
      create({
        source_id: page.id,
        target_id: apiId,
        relation_type: "calls",
        description: "Page calls API route (auto-enriched).",
        evidence: pagesPath,
        tags: "#auto #frontend #api"
      });
    }
  }

  for (const node of allNodes) {
    if (node.parent_id) {
      create({
        source_id: node.parent_id,
        target_id: node.id,
        relation_type: "contains",
        description: "Parent contains child node (auto-enriched).",
        evidence: "docs/architecture/nodes",
        tags: "#auto #hierarchy"
      });
    }

    for (const childId of splitIds(node.child_ids)) {
      create({
        source_id: node.id,
        target_id: childId,
        relation_type: "contains",
        description: "Node contains child node (auto-enriched).",
        evidence: "docs/architecture/nodes",
        tags: "#auto #hierarchy"
      });
    }

    for (const depId of splitIds(node.depends_on)) {
      create({
        source_id: node.id,
        target_id: depId,
        relation_type: "depends_on",
        description: "Node dependency mapping (auto-enriched).",
        evidence: "docs/architecture/nodes",
        tags: "#auto #dependency"
      });
    }

    for (const usedById of splitIds(node.used_by)) {
      create({
        source_id: usedById,
        target_id: node.id,
        relation_type: "depends_on",
        description: "Used-by reverse dependency mapping (auto-enriched).",
        evidence: "docs/architecture/nodes",
        tags: "#auto #dependency"
      });
    }
  }

  writeText(relationsPath, toCsv(relationsCsv.header, relationsCsv.records));

  const report = {
    enrichedAt: new Date().toISOString(),
    added: created.length,
    relationIds: created.map((r) => r.id)
  };
  writeText("docs/status/architecture-relation-enrichment-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
