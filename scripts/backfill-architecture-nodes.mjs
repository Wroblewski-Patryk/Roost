import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = [
  "docs/architecture/nodes/api_routes.csv",
  "docs/architecture/nodes/database_models.csv",
  "docs/architecture/nodes/pages.csv",
  "docs/architecture/nodes/tests.csv"
];

const moduleToFeature = new Map([
  ["departments", "management-department-catalog"],
  ["operations", "operations-work-items"],
  ["dashboard", "dashboard-command"],
  ["workforce", "people-agents-directory"],
  ["assets", "assets-context"]
]);

const featureToParent = new Map([
  ["management-department-catalog", "FEAT-MGMT-DEPT-CATALOG"],
  ["operations-work-items", "FEAT-OPERATIONS-WORK-ITEMS"],
  ["dashboard-command", "FEAT-DASHBOARD-COMMAND"],
  ["people-agents-directory", "FEAT-PEOPLE-AGENTS-DIRECTORY"],
  ["assets-context", "FEAT-ASSETS-CONTEXT"],
  ["architecture-evidence", "FEAT-ARCH-EVIDENCE-SYSTEM"]
]);

const moduleToDoc = new Map([
  ["departments", "DOC-MGMT-DEPT-CONTRACT"],
  ["operations", "DOC-OPS-WORK-ITEM-CONTRACT"],
  ["dashboard", "DOC-DASHBOARD-CONTRACT"],
  ["workforce", "DOC-PEOPLE-AGENTS-CONTRACT"],
  ["assets", "DOC-ASSETS-CONTEXT-CONTRACT"]
]);

const moduleToTest = new Map([
  ["departments", "TEST-API-LOCAL"],
  ["operations", "TEST-API-LOCAL"],
  ["dashboard", "TEST-API-LOCAL"],
  ["workforce", "TEST-API-LOCAL"],
  ["assets", "TEST-API-LOCAL"]
]);

const moduleToDb = new Map([
  ["departments", "DB-WORKSPACE-DEPARTMENTS"],
  ["operations", "DB-TASK"],
  ["dashboard", "DB-TASK;DB-WORKFORCE-ENTITY;DB-GOOGLE-DRIVE-FILE"],
  ["workforce", "DB-WORKFORCE-ENTITY"],
  ["assets", "DB-GOOGLE-DRIVE-FILE"]
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
  for (const record of records) {
    lines.push(header.map((name) => csvEscape(record[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function routeModule(name) {
  const match = String(name).match(/^[A-Z]+\s+\/v1\/([^\/\s:]+)/);
  return match ? match[1].replace(/_/g, "-") : "unknown";
}

function routeFilePath(moduleName) {
  if (!moduleName || moduleName === "unknown") return "";
  return `src/modules/${moduleName}/${moduleName}.routes.ts`;
}

function dbModule(name) {
  const model = String(name).toLowerCase();
  if (model.includes("workspace_departments")) return "departments";
  if (model.startsWith("tasks")) return "operations";
  if (model.includes("workforce")) return "workforce";
  if (model.includes("google_drive")) return "assets";
  if (model.includes("dashboard")) return "dashboard";
  return "core";
}

function pageModule(name) {
  const value = String(name);
  if (value.includes("people-agents") || value.includes("workforce")) return "workforce";
  if (value.includes("operations")) return "operations";
  if (value.includes("dashboard") || value.includes("/areas")) return "dashboard";
  if (value.includes("assets")) return "assets";
  if (value.includes("management") || value.includes("departments")) return "departments";
  return "web";
}

function main() {
  const report = [];
  for (const file of files) {
    const csv = loadCsv(file);
    let updated = 0;
    for (const row of csv.records) {
      if (!String(row.id || "").includes("AUTO-")) continue;
      let moduleName = row.module || "unknown";
      if (row.type === "api_route") moduleName = routeModule(row.name);
      if (row.type === "database_model") moduleName = dbModule(row.name);
      if (row.type === "page") moduleName = pageModule(row.name);
      if (row.type === "test") moduleName = "cross-app";

      const featureName = moduleToFeature.get(moduleName) ?? "coverage-expansion";
      const parentId = featureToParent.get(featureName) ?? "";

      const before = JSON.stringify(row);
      row.module = moduleName;
      if (!row.feature || row.feature === "coverage-expansion") {
        row.feature = featureName;
      }
      row.layer = row.layer || (row.type === "database_model" ? "database" : row.type === "page" ? "frontend" : row.type === "test" ? "testing" : "backend");
      row.parent_id = row.parent_id || parentId;
      row.tests_related = row.tests_related || moduleToTest.get(moduleName) || "";
      row.docs_related = row.docs_related || moduleToDoc.get(moduleName) || "";
      if (row.type === "api_route") {
        row.database_related = row.database_related || moduleToDb.get(moduleName) || "";
        if (!row.file_path) row.file_path = routeFilePath(moduleName);
        row.related_files = row.related_files || "src/auth/capabilities.ts";
      }
      if (row.type === "page") {
        row.api_related = row.api_related || "";
        if (!row.file_path) row.file_path = "src/app.ts";
      }
      if (row.type === "database_model" && !row.file_path) row.file_path = "prisma/schema.prisma";
      if (row.type === "test" && !row.file_path) row.file_path = "package.json";
      row.notes = row.notes || "Auto-backfilled semantic metadata.";
      row.tags = row.tags || "#auto-scaffold #backfilled";

      if (JSON.stringify(row) !== before) updated += 1;
    }
    writeText(file, toCsv(csv.header, csv.records));
    report.push({ file, updated, total: csv.records.length });
  }

  const payload = {
    backfilledAt: new Date().toISOString(),
    results: report
  };
  writeText("docs/status/architecture-node-backfill-report.json", `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
}

main();
