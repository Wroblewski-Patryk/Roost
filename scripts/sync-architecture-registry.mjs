import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targets = {
  api_route: "docs/architecture/nodes/api_routes.csv",
  database_model: "docs/architecture/nodes/database_models.csv",
  page: "docs/architecture/nodes/pages.csv",
  test: "docs/architecture/nodes/tests.csv"
};

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

function buildRecord(template, header, id) {
  const out = {};
  for (const key of header) out[key] = "";
  for (const [key, value] of Object.entries(template)) out[key] = value;
  out.id = id;
  return out;
}

function nextId(prefix, records) {
  const nums = records
    .map((r) => String(r.id || ""))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

function routeModule(routeName) {
  const match = String(routeName).match(/^[A-Z]+\s+\/v1\/([^\/\s:]+)/);
  if (!match) return "unknown";
  return match[1].replace(/_/g, "-");
}

function dbModule(modelName) {
  const model = String(modelName).toLowerCase();
  if (model.includes("workspace_departments")) return "departments";
  if (model === "tasks" || model.startsWith("task_")) return "operations";
  if (model.includes("workforce")) return "workforce";
  if (model.includes("google_drive")) return "assets";
  if (model.includes("pipeline")) return "operations";
  return "core";
}

function pageModule(pageName) {
  const value = String(pageName);
  if (value.includes("people-agents") || value.includes("workforce")) return "workforce";
  if (value.includes("operations")) return "operations";
  if (value.includes("dashboard")) return "dashboard";
  if (value.includes("assets")) return "assets";
  if (value.includes("auth")) return "auth";
  return "web";
}

function testModule(testName) {
  const value = String(testName);
  if (value.includes("route-capabilities")) return "architecture";
  if (value.includes("architecture:graph")) return "architecture";
  if (value.includes("test:api")) return "cross-app";
  return "cross-app";
}

function main() {
  const scaffoldPath = "docs/status/architecture-drift-missing-scaffold.csv";
  const scaffold = loadCsv(scaffoldPath);

  const grouped = new Map();
  for (const row of scaffold.records) {
    const target = targets[row.type];
    if (!target) continue;
    grouped.set(target, [...(grouped.get(target) ?? []), row]);
  }

  const report = [];
  for (const [targetPath, missingRows] of grouped.entries()) {
    const csv = loadCsv(targetPath);
    const existingByName = new Set(csv.records.map((r) => `${r.type}::${r.name}`));
    const existingIds = new Set(csv.records.map((r) => r.id));

    let added = 0;
    for (const row of missingRows) {
      const key = `${row.type}::${row.name}`;
      if (existingByName.has(key)) continue;

      let prefix = "AUTO-";
      if (row.type === "api_route") prefix = "API-AUTO-";
      if (row.type === "database_model") prefix = "DB-AUTO-";
      if (row.type === "page") prefix = "PAGE-AUTO-";
      if (row.type === "test") prefix = "TEST-AUTO-";
      let id = nextId(prefix, csv.records);
      while (existingIds.has(id)) {
        id = nextId(prefix, [...csv.records, { id }]);
      }

      const record = buildRecord(row, csv.header, id);
      if (!record.status) record.status = "planned";
      if (!record.verification_status) record.verification_status = "missing";
      if (!record.risk_level) record.risk_level = "medium";
      if (!record.completion_percent) record.completion_percent = "0";

      if (row.type === "api_route") {
        const moduleName = routeModule(record.name);
        const featureName = moduleToFeature.get(moduleName) ?? "coverage-expansion";
        record.layer = "backend";
        record.module = moduleName;
        record.feature = featureName;
        if (!record.file_path || record.file_path === "src/app.ts") {
          record.file_path = `src/modules/${moduleName}/${moduleName}.routes.ts`;
        }
        if (!record.parent_id && featureToParent.has(featureName)) {
          record.parent_id = featureToParent.get(featureName);
        }
      } else if (row.type === "database_model") {
        const moduleName = dbModule(record.name);
        const featureName = moduleToFeature.get(moduleName) ?? "coverage-expansion";
        record.layer = "database";
        record.module = moduleName;
        record.feature = featureName;
        record.file_path = "prisma/schema.prisma";
        if (!record.parent_id && featureToParent.has(featureName)) {
          record.parent_id = featureToParent.get(featureName);
        }
      } else if (row.type === "page") {
        const moduleName = pageModule(record.name);
        const featureName = moduleToFeature.get(moduleName) ?? "coverage-expansion";
        record.layer = "frontend";
        record.module = moduleName;
        record.feature = featureName;
        if (!record.parent_id && featureToParent.has(featureName)) {
          record.parent_id = featureToParent.get(featureName);
        }
      } else if (row.type === "test") {
        const moduleName = testModule(record.name);
        record.layer = "testing";
        record.module = moduleName;
        record.feature = moduleName === "architecture" ? "architecture-evidence" : "coverage-expansion";
        if (!record.parent_id && featureToParent.has(record.feature)) {
          record.parent_id = featureToParent.get(record.feature);
        }
      }

      csv.records.push(record);
      existingIds.add(id);
      existingByName.add(key);
      added += 1;
    }

    writeText(targetPath, toCsv(csv.header, csv.records));
    report.push({ targetPath, added, total: csv.records.length });
  }

  const summary = {
    synchronizedAt: new Date().toISOString(),
    results: report
  };
  writeText("docs/status/architecture-sync-report.json", `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main();
