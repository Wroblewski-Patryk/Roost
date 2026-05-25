import fs from "fs";
import path from "path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const reportPath = path.join(root, "docs/status/architecture-command-contract-report.json");

const requiredScripts = [
  "architecture:refresh",
  "architecture:graph",
  "architecture:sync",
  "architecture:sync-extended",
  "architecture:sync-evidence",
  "architecture:enrich-evidence",
  "architecture:sync-node-verification",
  "architecture:sync-chains",
  "architecture:normalize-chains",
  "architecture:gate-csv-contract",
  "architecture:gate-node-integrity",
  "architecture:gate-node-catalog",
  "architecture:gate-chains",
  "architecture:gate-chain-integrity",
  "architecture:gate-relations",
  "architecture:gate-connectivity",
  "architecture:gate-node-links",
  "architecture:gate-node-artifacts",
  "architecture:gate-generated-node-frontmatter",
  "architecture:gate-pipeline-nodes",
  "architecture:gate-evidence-cardinality",
  "architecture:gate-graph-artifact-consistency",
  "architecture:gate-delta-zero",
  "architecture:gate-doc-baseline",
  "architecture:gate-report-presence",
  "architecture:gate-proof-bundle",
  "architecture:gate",
  "architecture:build-health-dashboard",
  "architecture:build-proof-bundle",
  "architecture:status"
];

if (!fs.existsSync(packagePath)) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason: "Missing package.json"
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const scripts = pkg.scripts ?? {};

const missing = requiredScripts.filter((name) => typeof scripts[name] !== "string");
const report = {
  checkedAt: new Date().toISOString(),
  status: missing.length ? "failed" : "passed",
  requiredCount: requiredScripts.length,
  missingCount: missing.length,
  missing
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (missing.length) {
  console.error("Architecture command contract gate failed.");
  for (const name of missing) {
    console.error(`- missing script: ${name}`);
  }
  process.exit(1);
}

console.log(`Architecture command contract gate passed: ${requiredScripts.length} scripts present.`);
