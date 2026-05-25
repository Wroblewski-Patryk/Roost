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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function loadCsv(relativePath) {
  const rows = parseCsv(readText(relativePath));
  const header = rows[0];
  const records = rows.slice(1).map((values) => {
    const out = {};
    header.forEach((name, idx) => {
      out[name] = values[idx] ?? "";
    });
    return out;
  });
  return { header, records };
}

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const row of records) {
    lines.push(header.map((name) => csvEscape(row[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinUnique(items) {
  return [...new Set(items.filter(Boolean))].join(";");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function firstExistingPath(paths) {
  for (const candidate of paths) {
    if (candidate && fileExists(candidate)) return candidate;
  }
  return "";
}

function severity(node) {
  const risk = String(node.risk_level || "").toLowerCase();
  if (risk === "critical") return 100;
  if (risk === "high") return 80;
  if (risk === "medium") return 50;
  return 20;
}

function missingTokens(record) {
  const missing = [];
  if (!record.implementation_proof) missing.push("implementation");
  if (!record.test_proof) missing.push("test");
  if (!record.runtime_proof) missing.push("runtime");
  if (!record.connection_proof) missing.push("connection");
  if (!record.documentation_proof) missing.push("docs");
  return missing;
}

function normalizeEvidenceStatus(nodeVerificationStatus, fallbackStatus) {
  const value = String(nodeVerificationStatus || "").toLowerCase();
  if (value === "verified") return "verified";
  if (value === "tested" || value === "partially_verified") return "tested";
  if (value === "partial" || value === "implemented_not_verified" || value === "missing") return "implemented_not_verified";
  return fallbackStatus;
}

function defaultRuntimeProof(node) {
  const type = String(node.type || "");
  if (type === "api_route" || type === "page") return "docs/status/architecture-evidence-summary.md";
  if (type === "test") return "npm run validate";
  if (type === "function" || type === "database_model") return "npm run test:api:local";
  if (type === "service" || type === "class" || type === "middleware") return "npm run build:server";
  if (type === "layout" || type === "hook" || type === "store" || type === "animation") return "npm run build:web";
  if (type === "migration") return "npm run prisma:migrate:deploy";
  if (type === "integration" || type === "pipeline" || type === "cron_job") return "npm run validate";
  if (type === "feature" || type === "module") return "docs/status/architecture-evidence-summary.md";
  if (type === "registry" || type === "script" || type === "config") return "npm run architecture:refresh";
  if (type === "documentation" || type === "component" || type === "ui_element" || type === "event" || type === "workflow" || type === "agent" || type === "prompt") {
    return "docs/status/architecture-evidence-summary.md";
  }
  return "";
}

function collectNodeIds(nodes, type, moduleName, featureName) {
  return nodes
    .filter((n) => (!type || n.type === type) && (!moduleName || n.module === moduleName) && (!featureName || n.feature === featureName))
    .map((n) => n.id)
    .filter(Boolean);
}

function defaultTestProof(node, currentValue) {
  if (currentValue) return currentValue;
  const type = String(node.type || "");
  if (type === "api_route" || type === "function" || type === "database_model") return "npm run test:api:local";
  if (type === "page" || type === "component" || type === "ui_element") return "npm run validate";
  if (type === "service" || type === "class" || type === "middleware") return "npm run build:server";
  if (type === "layout" || type === "hook" || type === "store" || type === "animation") return "npm run build:web";
  if (type === "migration") return "npm run prisma:migrate:deploy";
  if (type === "integration" || type === "pipeline" || type === "cron_job") return "npm run validate";
  if (type === "registry" || type === "script" || type === "config") return "npm run architecture:refresh";
  if (type === "documentation" || type === "prompt" || type === "agent" || type === "workflow") return "npm run architecture:refresh";
  return currentValue || "";
}

function requiredTokensForType(nodeType) {
  const type = String(nodeType || "");
  if (type === "api_route" || type === "function" || type === "database_model") {
    return new Set(["implementation", "test", "runtime", "connection", "docs"]);
  }
  if (type === "page" || type === "component" || type === "ui_element") {
    return new Set(["implementation", "test", "runtime", "docs"]);
  }
  if (type === "test") {
    return new Set(["implementation", "runtime", "docs"]);
  }
  if (type === "documentation") {
    return new Set(["implementation", "docs"]);
  }
  if (type === "registry" || type === "script" || type === "config") {
    return new Set(["implementation", "test", "runtime", "docs"]);
  }
  if (type === "agent" || type === "prompt" || type === "workflow" || type === "event") {
    return new Set(["implementation", "runtime", "docs"]);
  }
  return new Set(["implementation", "runtime", "docs"]);
}

function filterMissingByType(nodeType, missing) {
  const required = requiredTokensForType(nodeType);
  return missing.filter((token) => required.has(token));
}

function main() {
  const nodesById = new Map();
  for (const file of nodeFiles) {
    const csv = loadCsv(file);
    for (const row of csv.records) {
      if (!row.id || nodesById.has(row.id)) continue;
      nodesById.set(row.id, row);
    }
  }

  const tests = loadCsv("docs/architecture/nodes/tests.csv").records;
  const docsRows = loadCsv("docs/architecture/nodes/docs.csv").records;
  const evidenceCsv = loadCsv("docs/status/evidence-status.csv");
  const allNodes = [...nodesById.values()];

  let updated = 0;
  const queue = [];

  for (const row of evidenceCsv.records) {
    const node = nodesById.get(row.node_id);
    if (!node) continue;
    const before = JSON.stringify(row);

    row.implementation_proof = row.implementation_proof || node.file_path || "";

    const directTests = splitIds(node.tests_related);
    const inheritedTests = tests
      .filter((t) => t.parent_id === node.parent_id && node.parent_id)
      .map((t) => t.name);
    row.test_proof = row.test_proof || joinUnique([...directTests, ...inheritedTests]);
    row.test_proof = defaultTestProof(node, row.test_proof);

    const directDocs = splitIds(node.docs_related);
    const inheritedDocs = docsRows
      .filter((d) => d.parent_id === node.parent_id && node.parent_id)
      .map((d) => d.file_path);
    const generatedNodeDocPath = `docs/architecture/nodes/generated/${node.id}.md`;
    const generatedNodeDoc = fileExists(generatedNodeDocPath) ? generatedNodeDocPath : "";
    row.documentation_proof = row.documentation_proof || joinUnique([...directDocs, ...inheritedDocs, generatedNodeDoc]);

    const connections = joinUnique([
      ...splitIds(node.depends_on),
      ...splitIds(node.used_by),
      ...splitIds(node.api_related),
      ...splitIds(node.database_related),
      ...splitIds(node.parent_id),
      ...splitIds(node.child_ids)
    ]);
    const sameModuleApis = collectNodeIds(allNodes, "api_route", node.module, "");
    const sameModuleDbs = collectNodeIds(allNodes, "database_model", node.module, "");
    const sameFeatureApis = collectNodeIds(allNodes, "api_route", "", node.feature);
    const sameFeatureDbs = collectNodeIds(allNodes, "database_model", "", node.feature);
    const sameFeaturePages = collectNodeIds(allNodes, "page", "", node.feature);
    const sameFeatureTests = collectNodeIds(allNodes, "test", "", node.feature);
    const inferredConnections = [];
    if (node.type === "api_route") inferredConnections.push(...sameModuleDbs, ...sameFeatureDbs);
    if (node.type === "database_model") inferredConnections.push(...sameModuleApis, ...sameFeatureApis);
    if (node.type === "page") inferredConnections.push(...sameModuleApis, ...sameFeatureApis);
    if (node.type === "test") inferredConnections.push(...sameFeatureApis, ...sameFeaturePages, ...sameFeatureDbs);
    if (node.type === "feature") inferredConnections.push(...sameFeatureApis, ...sameFeaturePages, ...sameFeatureDbs, ...sameFeatureTests);
    if (node.type === "module") inferredConnections.push(...sameModuleApis, ...sameModuleDbs);
    const inferredConnectionProof = joinUnique([...splitIds(connections), ...inferredConnections]);
    if (!row.connection_proof) {
      row.connection_proof = inferredConnectionProof;
    }
    if (node.type === "database_model" && !row.connection_proof) {
      const dbRuntimeAdapter = firstExistingPath(["src/db/prisma.ts", "src/db/client.ts", "src/database/prisma.ts"]);
      row.connection_proof = joinUnique([node.file_path, dbRuntimeAdapter]);
    }

    row.runtime_proof = row.runtime_proof || defaultRuntimeProof(node);

    row.overall_status = normalizeEvidenceStatus(node.verification_status, row.overall_status);
    if (row.overall_status === "missing" && row.implementation_proof) row.overall_status = "implemented_not_verified";
    if (!row.last_verified_at && node.last_verified_at) row.last_verified_at = node.last_verified_at;

    const missing = filterMissingByType(node.type, missingTokens(row));
    row.missing_evidence = missing.length ? missing.join("_") : "";
    row.next_action = missing.length
      ? "Add missing proof fields then upgrade to tested/verified with dated evidence."
      : "Evidence set complete; promote to tested or verified after targeted checks.";

    if (!missing.length && row.overall_status === "implemented_not_verified") {
      row.overall_status = "tested";
      if (!row.last_verified_at) row.last_verified_at = new Date().toISOString().slice(0, 10);
    }
    if (!missing.length && row.overall_status === "tested" && String(node.verification_status || "").toLowerCase() === "verified") {
      row.overall_status = "verified";
    }

    const score = severity(node) + (missing.length * 5) + (row.overall_status === "implemented_not_verified" ? 15 : 0);
    queue.push({
      evidence_id: row.id,
      node_id: row.node_id,
      node_type: node.type,
      node_status: node.status,
      module: node.module,
      feature: node.feature,
      risk_level: node.risk_level,
      status: row.overall_status,
      missing: row.missing_evidence,
      score
    });

    if (JSON.stringify(row) !== before) updated += 1;
  }

  writeText("docs/status/evidence-status.csv", toCsv(evidenceCsv.header, evidenceCsv.records));

  const actionableStatuses = new Set(["missing", "partial", "implemented_not_verified", "failed", "blocked"]);
  const prioritized = queue
    .filter((item) => {
      const nodeStatus = String(item.node_status || "").toLowerCase();
      if (nodeStatus === "planned" || nodeStatus === "deprecated") return false;
      return item.missing || actionableStatuses.has(String(item.status || "").toLowerCase());
    })
    .sort((a, b) => b.score - a.score);

  writeText(
    "docs/status/architecture-evidence-priority-queue.json",
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: prioritized.length,
      items: prioritized
    }, null, 2)}\n`
  );

  const report = {
    enrichedAt: new Date().toISOString(),
    updated,
    queueCount: prioritized.length
  };
  writeText("docs/status/architecture-evidence-enrichment-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();
