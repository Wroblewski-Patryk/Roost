import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseNodePath = "docs/architecture/nodes";

const targets = [
  { file: "services.csv", type: "service", prefix: "SVC-AUTO-", layer: "backend" },
  { file: "classes.csv", type: "class", prefix: "CLS-AUTO-", layer: "backend" },
  { file: "layouts.csv", type: "layout", prefix: "LAY-AUTO-", layer: "frontend" },
  { file: "hooks.csv", type: "hook", prefix: "HOOK-AUTO-", layer: "frontend" },
  { file: "stores.csv", type: "store", prefix: "STORE-AUTO-", layer: "frontend" },
  { file: "animations.csv", type: "animation", prefix: "ANIM-AUTO-", layer: "frontend" },
  { file: "migrations.csv", type: "migration", prefix: "MIG-AUTO-", layer: "database" },
  { file: "integrations.csv", type: "integration", prefix: "INT-AUTO-", layer: "integration" },
  { file: "middleware.csv", type: "middleware", prefix: "MW-AUTO-", layer: "backend" },
  { file: "pipelines.csv", type: "pipeline", prefix: "PIPE-AUTO-", layer: "backend" },
  { file: "cron_jobs.csv", type: "cron_job", prefix: "CRON-AUTO-", layer: "ops" }
];

const moduleToFeature = new Map([
  ["departments", "management-department-catalog"],
  ["operations", "operations-work-items"],
  ["dashboard", "dashboard-command"],
  ["workforce", "people-agents-directory"],
  ["assets", "assets-context"],
  ["integrations", "assets-context"],
  ["architecture", "architecture-evidence"]
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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function toCsv(header, records) {
  const lines = [header.join(",")];
  for (const record of records) {
    lines.push(header.map((name) => csvEscape(record[name] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
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

function walk(dir, output = []) {
  const entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.posix.join(dir.replace(/\\/g, "/"), entry.name);
    if (entry.isDirectory()) {
      walk(rel, output);
    } else {
      output.push(rel);
    }
  }
  return output;
}

function inferModule(filePath) {
  const match = filePath.match(/src\/modules\/([^\/]+)/);
  if (match) return match[1];
  if (filePath.startsWith("src/integrations/")) return "integrations";
  if (filePath.startsWith("src/middleware/")) return "middleware";
  if (filePath.startsWith("scripts/")) return "architecture";
  if (filePath.startsWith("web/src/")) return "web";
  if (filePath.startsWith("prisma/")) return "database";
  return "core";
}

function inferFeature(moduleName) {
  return moduleToFeature.get(moduleName) ?? "coverage-expansion";
}

function basenameNoExt(filePath) {
  const base = path.posix.basename(filePath);
  return base.replace(/\.[^.]+$/, "");
}

function startCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function collectCandidates(files) {
  const byType = new Map(targets.map((target) => [target.type, []]));
  const architectureMaintenanceScript = /^scripts\/(check|build|sync)-architecture-[^/]+\.mjs$/;

  for (const file of files) {
    if (file.endsWith(".d.ts")) continue;

    if (file.endsWith(".service.ts")) {
      byType.get("service").push(file);
    }
    if (file.endsWith(".middleware.ts") || file.includes("/middleware/")) {
      byType.get("middleware").push(file);
    }
    if (file.endsWith(".tsx") && file.includes("/layout/")) {
      byType.get("layout").push(file);
    }
    if (file.endsWith(".ts") && file.includes("/hooks/")) {
      byType.get("hook").push(file);
    }
    if (file.endsWith(".ts") && file.includes("/stores/")) {
      byType.get("store").push(file);
    }
    if (file.endsWith(".sql") && file.includes("prisma/migrations/")) {
      byType.get("migration").push(file);
    }
    if (file.endsWith(".ts") && file.startsWith("src/integrations/")) {
      byType.get("integration").push(file);
    }
    if (
      file.endsWith(".mjs")
      && file.startsWith("scripts/")
      && /(sync|build|check|smoke|bootstrap)/.test(file)
      && !architectureMaintenanceScript.test(file)
    ) {
      byType.get("pipeline").push(file);
    }
    if (file.endsWith(".ts") && /scheduler|cron/i.test(file)) {
      byType.get("cron_job").push(file);
    }
    if (file.endsWith(".ts") && /animation|motion|transition/i.test(file)) {
      byType.get("animation").push(file);
    }
  }

  const classFiles = files.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
    .filter((file) => {
      if (file.startsWith("dist/")) return false;
      const source = readText(file);
      return /\bclass\s+[A-Z][A-Za-z0-9_]+/.test(source);
    });
  byType.set("class", classFiles);

  return byType;
}

function ensureRecord(header, target, filePath, existingRecords) {
  const existing = existingRecords.find((row) => row.file_path === filePath);
  if (existing) return null;

  const record = {};
  for (const key of header) record[key] = "";

  const moduleName = inferModule(filePath);
  const featureName = inferFeature(moduleName);

  record.id = nextId(target.prefix, existingRecords);
  record.name = startCase(basenameNoExt(filePath));
  record.type = target.type;
  record.status = "planned";
  record.layer = target.layer;
  record.module = moduleName;
  record.feature = featureName;
  record.description = `Auto-synchronized ${target.type} node from repository source.`;
  record.file_path = filePath;
  record.parent_id = featureToParent.get(featureName) ?? "";
  record.risk_level = "medium";
  record.completion_percent = "0";
  record.verification_status = "missing";
  record.notes = "Auto-generated by sync-architecture-extended-registry.";
  record.tags = `#${target.type} #auto`;

  return record;
}

function main() {
  const files = [
    ...walk("src"),
    ...walk("web/src"),
    ...walk("prisma/migrations"),
    ...walk("scripts")
  ];
  const candidates = collectCandidates(files);
  const results = [];

  for (const target of targets) {
    const relativePath = path.posix.join(baseNodePath, target.file);
    const csv = loadCsv(relativePath);
    const candidateFiles = [...new Set(candidates.get(target.type) ?? [])].sort();
    let added = 0;

    for (const filePath of candidateFiles) {
      const record = ensureRecord(csv.header, target, filePath, csv.records);
      if (!record) continue;
      csv.records.push(record);
      added += 1;
    }

    writeText(relativePath, toCsv(csv.header, csv.records));
    results.push({
      file: relativePath,
      type: target.type,
      candidates: candidateFiles.length,
      added,
      total: csv.records.length
    });
  }

  const summary = {
    synchronizedAt: new Date().toISOString(),
    results
  };
  writeText("docs/status/architecture-extended-sync-report.json", `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main();
