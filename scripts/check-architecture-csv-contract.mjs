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

const nodeRequiredHeaders = [
  "id",
  "name",
  "type",
  "status",
  "layer",
  "module",
  "feature",
  "description",
  "file_path",
  "related_files",
  "parent_id",
  "child_ids",
  "depends_on",
  "used_by",
  "ui_related",
  "api_related",
  "database_related",
  "tests_related",
  "docs_related",
  "agent_related",
  "risk_level",
  "completion_percent",
  "last_verified_at",
  "verification_status",
  "notes",
  "tags"
];

const relationRequiredHeaders = [
  "id",
  "source_id",
  "target_id",
  "relation_type",
  "direction",
  "description",
  "status",
  "evidence",
  "notes",
  "tags"
];

const chainRequiredHeaders = [
  "id",
  "name",
  "feature_id",
  "status",
  "entry_node_id",
  "exit_node_id",
  "node_sequence",
  "missing_nodes",
  "tests",
  "docs",
  "risk_level",
  "last_verified_at",
  "verification_status",
  "notes",
  "tags"
];

const evidenceRequiredHeaders = [
  "id",
  "node_id",
  "implementation_proof",
  "test_proof",
  "runtime_proof",
  "connection_proof",
  "documentation_proof",
  "overall_status",
  "last_verified_at",
  "missing_evidence",
  "next_action"
];

const implementationStatuses = new Set([
  "planned",
  "in_progress",
  "implemented",
  "broken",
  "missing",
  "deprecated",
  "tested",
  "verified",
  "blocked"
]);

const evidenceStatuses = new Set([
  "missing",
  "partial",
  "implemented_not_verified",
  "tested",
  "verified",
  "failed",
  "blocked"
]);

const relationStatuses = new Set([
  ...implementationStatuses,
  ...evidenceStatuses
]);

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
  const header = rows[0] || [];
  const records = rows.slice(1).map((values, idx) => {
    const out = { __line: idx + 2 };
    header.forEach((name, ix) => {
      out[name] = values[ix] ?? "";
    });
    return out;
  });
  return { header, records };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function checkHeaders(file, actual, required, issues) {
  const missing = required.filter((name) => !actual.includes(name));
  if (missing.length > 0) {
    issues.push({ type: "missing_headers", file, missing });
  }
}

function main() {
  const issues = [];
  let checkedRows = 0;

  for (const file of nodeFiles) {
    const { header, records } = loadCsv(file);
    checkHeaders(file, header, nodeRequiredHeaders, issues);
    for (const row of records) {
      checkedRows += 1;
      const status = normalize(row.status);
      const verificationStatus = normalize(row.verification_status);
      if (status && !implementationStatuses.has(status)) {
        issues.push({
          type: "invalid_node_status",
          file,
          line: row.__line,
          id: row.id || "",
          value: row.status
        });
      }
      if (verificationStatus && !evidenceStatuses.has(verificationStatus)) {
        issues.push({
          type: "invalid_node_verification_status",
          file,
          line: row.__line,
          id: row.id || "",
          value: row.verification_status
        });
      }
    }
  }

  const relationsFile = "docs/architecture/relations/dependencies.csv";
  const relations = loadCsv(relationsFile);
  checkHeaders(relationsFile, relations.header, relationRequiredHeaders, issues);
  checkedRows += relations.records.length;
  for (const row of relations.records) {
    const status = normalize(row.status);
    if (status && !relationStatuses.has(status)) {
      issues.push({
        type: "invalid_relation_status",
        file: relationsFile,
        line: row.__line,
        id: row.id || "",
        value: row.status
      });
    }
  }

  const chainsFile = "docs/architecture/chains/chains.csv";
  const chains = loadCsv(chainsFile);
  checkHeaders(chainsFile, chains.header, chainRequiredHeaders, issues);
  checkedRows += chains.records.length;
  for (const row of chains.records) {
    const status = normalize(row.status);
    const verificationStatus = normalize(row.verification_status);
    if (status && !implementationStatuses.has(status)) {
      issues.push({
        type: "invalid_chain_status",
        file: chainsFile,
        line: row.__line,
        id: row.id || "",
        value: row.status
      });
    }
    if (verificationStatus && !evidenceStatuses.has(verificationStatus)) {
      issues.push({
        type: "invalid_chain_verification_status",
        file: chainsFile,
        line: row.__line,
        id: row.id || "",
        value: row.verification_status
      });
    }
  }

  const evidenceFile = "docs/status/evidence-status.csv";
  const evidence = loadCsv(evidenceFile);
  checkHeaders(evidenceFile, evidence.header, evidenceRequiredHeaders, issues);
  checkedRows += evidence.records.length;
  for (const row of evidence.records) {
    const status = normalize(row.overall_status);
    if (status && !evidenceStatuses.has(status)) {
      issues.push({
        type: "invalid_evidence_status",
        file: evidenceFile,
        line: row.__line,
        id: row.id || "",
        value: row.overall_status
      });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    filesChecked: nodeFiles.length + 3,
    checkedRows,
    issues: issues.length,
    issueRows: issues
  };

  writeText("docs/status/architecture-csv-contract-report.json", `${JSON.stringify(report, null, 2)}\n`);

  if (issues.length > 0) {
    console.error(`Architecture CSV contract gate failed: ${issues.length} issue(s).`);
    process.exit(1);
  }

  console.log(`Architecture CSV contract gate passed: ${report.filesChecked} files, ${checkedRows} rows checked, 0 issues.`);
}

main();
