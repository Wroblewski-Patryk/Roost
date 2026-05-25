import fs from "fs";
import path from "path";

const root = process.cwd();

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

const relationFile = "docs/architecture/relations/dependencies.csv";
const chainFile = "docs/architecture/chains/chains.csv";
const testMapFile = "docs/testing/test-map.csv";
const evidenceFile = "docs/status/evidence-status.csv";

const generatedNodeDir = path.join(root, "docs/architecture/nodes/generated");
const graphDir = path.join(root, "docs/graphs");
const statusDir = path.join(root, "docs/status");
const capabilitiesFile = "src/auth/capabilities.ts";
const prismaSchemaFile = "prisma/schema.prisma";
const appFile = "src/app.ts";

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseCsv(text, sourceName) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
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

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values, rowIndex) => {
    const record = {
      __source: sourceName,
      __line: rowIndex + 2,
      __columnCount: values.length,
      __headerCount: headers.length
    };
    headers.forEach((header, headerIndex) => {
      record[header] = values[headerIndex] ?? "";
    });
    return record;
  });
}

function csvRecords(relativePath) {
  return parseCsv(readText(relativePath), relativePath);
}

function splitIds(value) {
  return String(value ?? "")
    .split(/[;>|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function yamlScalar(value) {
  return JSON.stringify(String(value ?? ""));
}

function keyForRoute(method, routePath) {
  return `${String(method || "").toUpperCase()} ${String(routePath || "").trim()}`;
}

function toSnake(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function normalizePageRoute(route) {
  const value = String(route || "").trim();
  if (!value) return value;
  const [base] = value.split("?");
  return base || value;
}

function wiki(id, nodesById) {
  if (!id) return "";
  const node = nodesById.get(id);
  return node ? `[[${slug(id)}|${node.name || id}]]` : `[[${slug(id)}|${id}]]`;
}

function addUnique(map, record) {
  const existing = map.get(record.id);
  if (!existing) {
    map.set(record.id, record);
    return;
  }

  const existingStatus = existing.verification_status || existing.status || "";
  const nextStatus = record.verification_status || record.status || "";
  const preferNext = existingStatus === "partial" || existingStatus === "implemented_not_verified" || existingStatus === "missing"
    ? nextStatus === "verified" || nextStatus === "tested"
    : false;

  if (preferNext) {
    map.set(record.id, { ...existing, ...record });
  }
}

function validateNodeReferences(records, nodesById, errors) {
  const fields = [
    "parent_id",
    "child_ids",
    "depends_on",
    "used_by",
    "ui_related",
    "api_related",
    "database_related",
    "tests_related",
    "docs_related",
    "agent_related"
  ];

  for (const record of records) {
    for (const field of fields) {
      for (const id of splitIds(record[field])) {
        if (!nodesById.has(id)) {
          errors.push(`${record.__source}:${record.__line} ${record.id}.${field} references unknown id ${id}`);
        }
      }
    }
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nodeMarkdown(node, nodesById, outgoing, incoming, chains, tests, evidence) {
  const outgoingRows = outgoing.get(node.id) ?? [];
  const incomingRows = incoming.get(node.id) ?? [];
  const chainRows = chains.filter((chain) => splitIds(chain.node_sequence).includes(node.id) || chain.feature_id === node.id);
  const testRows = tests.filter((test) => splitIds(test.related_node_ids).includes(node.id));
  const evidenceRows = evidence.filter((item) => item.node_id === node.id);

  return `---\n` +
    `id: ${yamlScalar(node.id)}\n` +
    `name: ${yamlScalar(node.name)}\n` +
    `type: ${yamlScalar(node.type)}\n` +
    `status: ${yamlScalar(node.status)}\n` +
    `layer: ${yamlScalar(node.layer)}\n` +
    `module: ${yamlScalar(node.module)}\n` +
    `feature: ${yamlScalar(node.feature)}\n` +
    `risk_level: ${yamlScalar(node.risk_level)}\n` +
    `completion_percent: ${yamlScalar(node.completion_percent)}\n` +
    `verification_status: ${yamlScalar(node.verification_status)}\n` +
    `last_verified_at: ${yamlScalar(node.last_verified_at)}\n` +
    `tags: ${yamlScalar(node.tags)}\n` +
    `---\n\n` +
    `# ${node.name || node.id}\n\n` +
    `- ID: \`${node.id}\`\n` +
    `- Type: \`${node.type}\`\n` +
    `- Status: \`${node.status}\`\n` +
    `- Verification: \`${node.verification_status}\`\n` +
    `- Layer: \`${node.layer}\`\n` +
    `- Module: \`${node.module}\`\n` +
    `- Feature: \`${node.feature}\`\n` +
    `- File: \`${node.file_path || "not mapped"}\`\n\n` +
    `## Description\n\n${node.description || "No description recorded."}\n\n` +
    `## Direct Links\n\n` +
    `- Parent: ${wiki(node.parent_id, nodesById) || "none"}\n` +
    `- Children: ${splitIds(node.child_ids).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Depends on: ${splitIds(node.depends_on).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Used by: ${splitIds(node.used_by).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- UI: ${splitIds(node.ui_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- API: ${splitIds(node.api_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Database: ${splitIds(node.database_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Tests: ${splitIds(node.tests_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Docs: ${splitIds(node.docs_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n` +
    `- Agent: ${splitIds(node.agent_related).map((id) => wiki(id, nodesById)).join(", ") || "none"}\n\n` +
    `## Relations\n\n` +
    `${outgoingRows.map((rel) => `- ${rel.relation_type} -> ${wiki(rel.target_id, nodesById)} (${rel.status})`).join("\n") || "- No outgoing relations."}\n` +
    `${incomingRows.map((rel) => `- ${wiki(rel.source_id, nodesById)} -> ${rel.relation_type} (${rel.status})`).join("\n") || ""}\n\n` +
    `## Chains\n\n` +
    `${chainRows.map((chain) => `- \`${chain.id}\` ${chain.name}: ${splitIds(chain.node_sequence).map((id) => wiki(id, nodesById)).join(" -> ")}`).join("\n") || "- No chain rows."}\n\n` +
    `## Tests\n\n` +
    `${testRows.map((test) => `- \`${test.id}\` ${test.test_name}: \`${test.verification_status}\``).join("\n") || "- No test rows."}\n\n` +
    `## Evidence\n\n` +
    `${evidenceRows.map((item) => `- \`${item.id}\` ${item.overall_status}: missing ${item.missing_evidence || "none"}`).join("\n") || "- No evidence row."}\n\n` +
    `## Notes\n\n${node.notes || "No notes."}\n`;
}

function parseManifestRoutes() {
  const source = readText(capabilitiesFile);
  return Array.from(source.matchAll(/\{\s*method:\s*"([A-Z]+)",\s*path:\s*"([^"]+)",\s*capability:\s*"([^"]+)"/g))
    .map((match) => ({
      method: match[1],
      path: match[2],
      capability: match[3]
    }));
}

function parsePrismaModels() {
  const source = readText(prismaSchemaFile);
  const blocks = Array.from(source.matchAll(/model\s+([A-Za-z0-9_]+)\s+\{([\s\S]*?)\n\}/g));
  const mappedTables = blocks
    .map((match) => {
      const mapMatch = match[2].match(/@@map\("([^"]+)"\)/);
      return mapMatch ? mapMatch[1] : null;
    })
    .filter(Boolean);

  if (mappedTables.length) {
    return mappedTables;
  }

  return blocks.map((match) => match[1]);
}

function parseReactAppRoutes() {
  const source = readText(appFile);
  const match = source.match(/const reactAppRoutes = \[([\s\S]*?)\];/);
  if (!match) return [];
  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map((entry) => entry[1]);
}

function parseScriptsFromPackage() {
  const pkg = JSON.parse(readText("package.json"));
  return Object.keys(pkg.scripts ?? {});
}

function collectNodeSet(records, selector) {
  const set = new Set();
  for (const record of records) {
    const value = selector(record);
    if (value) set.add(value);
  }
  return set;
}

function driftSection(title, codeSet, registrySet) {
  const missingInRegistry = [...codeSet].filter((item) => !registrySet.has(item)).sort();
  const missingInCode = [...registrySet].filter((item) => !codeSet.has(item)).sort();
  return {
    title,
    codeCount: codeSet.size,
    registryCount: registrySet.size,
    missingInRegistry,
    missingInCode
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function main() {
  const errors = [];
  const allNodeRecords = registryFiles.flatMap(csvRecords);
  const nodesById = new Map();

  for (const record of allNodeRecords) {
    if (record.__columnCount !== record.__headerCount) {
      errors.push(`${record.__source}:${record.__line} has ${record.__columnCount} columns but header has ${record.__headerCount}`);
      continue;
    }
    if (!record.id) {
      errors.push(`${record.__source}:${record.__line} is missing id`);
      continue;
    }
    addUnique(nodesById, record);
  }

  const nodes = [...nodesById.values()];
  validateNodeReferences(nodes, nodesById, errors);

  const relations = csvRecords(relationFile);
  const chains = csvRecords(chainFile);
  const tests = csvRecords(testMapFile);
  const evidence = csvRecords(evidenceFile);

  for (const relation of relations) {
    if (!nodesById.has(relation.source_id)) {
      errors.push(`${relation.__source}:${relation.__line} relation ${relation.id} has unknown source_id ${relation.source_id}`);
    }
    if (!nodesById.has(relation.target_id)) {
      errors.push(`${relation.__source}:${relation.__line} relation ${relation.id} has unknown target_id ${relation.target_id}`);
    }
  }

  for (const chain of chains) {
    if (!nodesById.has(chain.feature_id)) {
      errors.push(`${chain.__source}:${chain.__line} chain ${chain.id} has unknown feature_id ${chain.feature_id}`);
    }
    for (const id of splitIds(chain.node_sequence)) {
      if (!nodesById.has(id)) {
        errors.push(`${chain.__source}:${chain.__line} chain ${chain.id} references unknown node ${id}`);
      }
    }
    for (const id of splitIds(chain.tests)) {
      if (!nodesById.has(id)) {
        errors.push(`${chain.__source}:${chain.__line} chain ${chain.id} references unknown test node ${id}`);
      }
    }
    for (const id of splitIds(chain.docs)) {
      if (!nodesById.has(id)) {
        errors.push(`${chain.__source}:${chain.__line} chain ${chain.id} references unknown doc node ${id}`);
      }
    }
  }

  for (const test of tests) {
    for (const id of splitIds(test.related_node_ids)) {
      if (!nodesById.has(id)) {
        errors.push(`${test.__source}:${test.__line} test ${test.id} references unknown node ${id}`);
      }
    }
    for (const chainId of splitIds(test.covered_chain_ids)) {
      if (!chains.some((chain) => chain.id === chainId)) {
        errors.push(`${test.__source}:${test.__line} test ${test.id} references unknown chain ${chainId}`);
      }
    }
  }

  for (const item of evidence) {
    if (!nodesById.has(item.node_id)) {
      errors.push(`${item.__source}:${item.__line} evidence ${item.id} references unknown node ${item.node_id}`);
    }
  }

  if (errors.length) {
    console.error("Architecture graph validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  ensureDir(generatedNodeDir);
  ensureDir(graphDir);
  ensureDir(statusDir);

  const outgoing = new Map();
  const incoming = new Map();
  for (const relation of relations) {
    outgoing.set(relation.source_id, [...(outgoing.get(relation.source_id) ?? []), relation]);
    incoming.set(relation.target_id, [...(incoming.get(relation.target_id) ?? []), relation]);
  }

  for (const node of nodes) {
    fs.writeFileSync(
      path.join(generatedNodeDir, `${slug(node.id)}.md`),
      nodeMarkdown(node, nodesById, outgoing, incoming, chains, tests, evidence)
    );
  }

  const mermaidLines = [
    "graph TD",
    ...nodes.map((node) => `  ${slug(node.id)}["${esc(node.name || node.id)}<br/>${esc(node.type)} / ${esc(node.verification_status || node.status)}"]`),
    ...relations.map((relation) => `  ${slug(relation.source_id)} -->|${esc(relation.relation_type)}| ${slug(relation.target_id)}`)
  ];
  fs.writeFileSync(path.join(graphDir, "project-graph.mmd"), `${mermaidLines.join("\n")}\n`);

  const graphJson = {
    generatedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      status: node.status,
      layer: node.layer,
      module: node.module,
      feature: node.feature,
      verificationStatus: node.verification_status,
      riskLevel: node.risk_level,
      filePath: node.file_path,
      tags: splitIds(node.tags)
    })),
    relations: relations.map((relation) => ({
      id: relation.id,
      source: relation.source_id,
      target: relation.target_id,
      type: relation.relation_type,
      status: relation.status
    })),
    chains: chains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      featureId: chain.feature_id,
      status: chain.status,
      nodeSequence: splitIds(chain.node_sequence),
      missingNodes: splitIds(chain.missing_nodes),
      verificationStatus: chain.verification_status
    })),
    tests: tests.map((test) => ({
      id: test.id,
      name: test.test_name,
      status: test.status,
      command: test.command,
      relatedNodeIds: splitIds(test.related_node_ids),
      coveredChainIds: splitIds(test.covered_chain_ids),
      verificationStatus: test.verification_status
    }))
  };
  fs.writeFileSync(path.join(graphDir, "project-graph.json"), `${JSON.stringify(graphJson, null, 2)}\n`);

  const apiRouteRegistry = collectNodeSet(
    nodes.filter((node) => node.type === "api_route"),
    (node) => node.name
  );
  const dbModelRegistry = collectNodeSet(
    nodes.filter((node) => node.type === "database_model"),
    (node) => {
      const modelMatch = String(node.name ?? "").match(/^([A-Za-z0-9_]+)\s+model$/);
      if (!modelMatch) return "";
      const raw = modelMatch[1];
      if (raw.includes("_")) return raw.toLowerCase();
      const snake = toSnake(raw);
      return snake.endsWith("s") ? snake : `${snake}s`;
    }
  );
  const pageRegistry = collectNodeSet(
    nodes.filter((node) => node.type === "page"),
    (node) => normalizePageRoute(node.name)
  );
  const rawTestRegistry = collectNodeSet(
    nodes.filter((node) => node.type === "test"),
    (node) => node.name
  );
  const testRegistry = new Set(
    [...rawTestRegistry]
      .map((name) => {
        const runMatch = String(name).match(/^npm run ([^\s]+)$/);
        return runMatch ? runMatch[1] : null;
      })
      .filter(Boolean)
  );

  const manifestRouteSet = new Set(parseManifestRoutes().map((route) => keyForRoute(route.method, route.path)));
  const prismaModelSet = new Set(parsePrismaModels());
  const reactRouteSet = new Set(parseReactAppRoutes().map((route) => normalizePageRoute(route)));
  const packageScriptSet = new Set(
    parseScriptsFromPackage().filter((name) => (
      name.startsWith("test")
      || name.startsWith("check:")
      || name === "validate"
      || name === "architecture:graph"
    ))
  );

  const drift = {
    generatedAt: graphJson.generatedAt,
    sections: [
      driftSection("API Routes", manifestRouteSet, apiRouteRegistry),
      driftSection("Prisma Models", prismaModelSet, dbModelRegistry),
      driftSection("React App Routes", reactRouteSet, pageRegistry),
      driftSection("Script/Test Commands", packageScriptSet, testRegistry)
    ]
  };
  fs.writeFileSync(path.join(graphDir, "architecture-drift.json"), `${JSON.stringify(drift, null, 2)}\n`);

  const driftSummaryLines = drift.sections.map((section) => (
    `### ${section.title}\n\n` +
    `- Code sources: ${section.codeCount}\n` +
    `- Registry rows: ${section.registryCount}\n` +
    `- Missing in registry: ${section.missingInRegistry.length}\n` +
    `- Missing in code: ${section.missingInCode.length}\n\n` +
    `Missing in registry:\n` +
    `${section.missingInRegistry.map((item) => `- \`${item}\``).join("\n") || "- none"}\n\n` +
    `Missing in code:\n` +
    `${section.missingInCode.map((item) => `- \`${item}\``).join("\n") || "- none"}`
  ));
  const driftReport = `# Architecture Drift Report\n\n` +
    `Generated at: ${graphJson.generatedAt}\n\n` +
    `This report compares live code surfaces against architecture registry CSV entries.\n\n` +
    `${driftSummaryLines.join("\n\n")}\n`;
  fs.writeFileSync(path.join(statusDir, "architecture-drift-report.md"), driftReport);

  const nodeHeaders = [
    "id", "name", "type", "status", "layer", "module", "feature", "description",
    "file_path", "related_files", "parent_id", "child_ids", "depends_on", "used_by",
    "ui_related", "api_related", "database_related", "tests_related", "docs_related",
    "agent_related", "risk_level", "completion_percent", "last_verified_at",
    "verification_status", "notes", "tags"
  ];
  const scaffoldRows = [];
  let counter = 1;
  for (const route of drift.sections.find((section) => section.title === "API Routes")?.missingInRegistry ?? []) {
    scaffoldRows.push({
      id: `API-AUTO-${String(counter).padStart(4, "0")}`,
      name: route,
      type: "api_route",
      status: "planned",
      layer: "backend",
      module: "unknown",
      feature: "coverage-expansion",
      description: "Auto-scaffolded from manifest drift report.",
      verification_status: "missing",
      notes: "Populate ownership and links before promotion to canonical registry.",
      tags: "#api #auto-scaffold #missing"
    });
    counter += 1;
  }
  for (const model of drift.sections.find((section) => section.title === "Prisma Models")?.missingInRegistry ?? []) {
    scaffoldRows.push({
      id: `DB-AUTO-${String(counter).padStart(4, "0")}`,
      name: `${model} model`,
      type: "database_model",
      status: "planned",
      layer: "database",
      module: "unknown",
      feature: "coverage-expansion",
      description: "Auto-scaffolded from Prisma drift report.",
      file_path: prismaSchemaFile,
      verification_status: "missing",
      notes: "Populate dependencies and evidence links before promotion to canonical registry.",
      tags: "#database #auto-scaffold #missing"
    });
    counter += 1;
  }
  for (const route of drift.sections.find((section) => section.title === "React App Routes")?.missingInRegistry ?? []) {
    scaffoldRows.push({
      id: `PAGE-AUTO-${String(counter).padStart(4, "0")}`,
      name: route,
      type: "page",
      status: "planned",
      layer: "frontend",
      module: "web",
      feature: "coverage-expansion",
      description: "Auto-scaffolded from React route drift report.",
      file_path: appFile,
      verification_status: "missing",
      notes: "Link to canonical route registry and UI components.",
      tags: "#page #auto-scaffold #missing"
    });
    counter += 1;
  }
  for (const scriptName of drift.sections.find((section) => section.title === "Script/Test Commands")?.missingInRegistry ?? []) {
    scaffoldRows.push({
      id: `TEST-AUTO-${String(counter).padStart(4, "0")}`,
      name: `npm run ${scriptName}`,
      type: "test",
      status: "planned",
      layer: "testing",
      module: "cross-app",
      feature: "coverage-expansion",
      description: "Auto-scaffolded from package scripts drift report.",
      file_path: "package.json",
      verification_status: "missing",
      notes: "Confirm this command is a test/validation signal before keeping.",
      tags: "#test #auto-scaffold #missing"
    });
    counter += 1;
  }
  const scaffoldCsv = [
    nodeHeaders.join(","),
    ...scaffoldRows.map((row) => nodeHeaders.map((header) => csvEscape(row[header] ?? "")).join(","))
  ].join("\n");
  fs.writeFileSync(path.join(statusDir, "architecture-drift-missing-scaffold.csv"), `${scaffoldCsv}\n`);

  const byVerification = nodes.reduce((counts, node) => {
    const key = node.verification_status || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const byEvidenceStatus = evidence.reduce((counts, item) => {
    const key = item.overall_status || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const missingEvidence = evidence.filter((item) => item.missing_evidence);
  const missingEvidencePreview = missingEvidence.slice(0, 120);
  fs.writeFileSync(
    path.join(statusDir, "architecture-missing-evidence-full.json"),
    `${JSON.stringify({
      generatedAt: graphJson.generatedAt,
      count: missingEvidence.length,
      items: missingEvidence
    }, null, 2)}\n`
  );
  const summary = `# Architecture Evidence Summary\n\n` +
    `Generated at: ${graphJson.generatedAt}\n\n` +
    `## Counts\n\n` +
    `- Nodes: ${nodes.length}\n` +
    `- Relations: ${relations.length}\n` +
    `- Chains: ${chains.length}\n` +
    `- Test mappings: ${tests.length}\n` +
    `- Evidence rows: ${evidence.length}\n\n` +
    `## Verification Status\n\n` +
    `${Object.entries(byVerification).sort().map(([status, count]) => `- ${status}: ${count}`).join("\n")}\n\n` +
    `## Evidence Status\n\n` +
    `${Object.entries(byEvidenceStatus).sort().map(([status, count]) => `- ${status}: ${count}`).join("\n")}\n\n` +
    `## Missing Evidence Queue\n\n` +
    `${missingEvidencePreview.map((item) => `- \`${item.node_id}\`: ${item.missing_evidence} -> ${item.next_action}`).join("\n") || "- No missing evidence recorded."}\n\n` +
    `${missingEvidence.length > missingEvidencePreview.length ? `...and ${missingEvidence.length - missingEvidencePreview.length} more rows in \`docs/status/architecture-missing-evidence-full.json\`.\n\n` : ""}` +
    `## Drift Detection\n\n` +
    `${drift.sections.map((section) => `- ${section.title}: missing_in_registry=${section.missingInRegistry.length}, missing_in_code=${section.missingInCode.length}`).join("\n")}\n\n` +
    `Detailed report: \`docs/status/architecture-drift-report.md\`\n\n` +
    `Scaffold queue: \`docs/status/architecture-drift-missing-scaffold.csv\`\n\n` +
    `## Obsidian Entry Points\n\n` +
    `- [[FEAT-ARCH-EVIDENCE-SYSTEM|Architecture Evidence System]]\n` +
    `- [[FEAT-MGMT-DEPT-CATALOG|Management Department Catalog]]\n` +
    `- [[FEAT-OPERATIONS-WORK-ITEMS|Operations Work Items]]\n` +
    `- [[FEAT-DASHBOARD-COMMAND|Dashboard Command Packet]]\n`;
  fs.writeFileSync(path.join(statusDir, "architecture-evidence-summary.md"), summary);

  console.log(`Architecture graph generated: ${nodes.length} nodes, ${relations.length} relations, ${chains.length} chains.`);
}

main();
