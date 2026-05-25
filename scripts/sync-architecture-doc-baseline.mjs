import fs from "fs";
import path from "path";

const root = process.cwd();
const docPath = path.join(root, "docs/architecture/architecture-evidence-system.md");
const healthPath = path.join(root, "docs/status/architecture-health-dashboard.json");
const reportPath = path.join(root, "docs/status/architecture-doc-baseline-sync-report.json");

if (!fs.existsSync(docPath) || !fs.existsSync(healthPath)) {
  const report = {
    syncedAt: new Date().toISOString(),
    status: "failed",
    reason: "Missing architecture doc or health dashboard JSON."
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const health = JSON.parse(fs.readFileSync(healthPath, "utf8"));
const graph = health.graph ?? {};
const nodes = Number(graph.nodes ?? 0);
const relations = Number(graph.relations ?? 0);
const chains = Number(graph.chains ?? 0);

const source = fs.readFileSync(docPath, "utf8");
const pattern = /Current validated baseline:\r?\n\r?\n- graph: `\d+` nodes, `\d+` relations, `\d+` chains/;
const replacement = `Current validated baseline:\n\n- graph: \`${nodes}\` nodes, \`${relations}\` relations, \`${chains}\` chains`;

if (!pattern.test(source)) {
  const report = {
    syncedAt: new Date().toISOString(),
    status: "failed",
    reason: "Baseline section pattern not found in architecture evidence document."
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const updated = source.replace(pattern, replacement);
const changed = updated !== source;
if (changed) {
  fs.writeFileSync(docPath, updated);
}

const report = {
  syncedAt: new Date().toISOString(),
  status: "passed",
  changed,
  graph: { nodes, relations, chains }
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  changed
    ? `Architecture doc baseline synchronized to ${nodes}/${relations}/${chains}.`
    : "Architecture doc baseline already synchronized."
);
