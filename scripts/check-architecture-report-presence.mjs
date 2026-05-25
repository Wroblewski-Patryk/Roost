import fs from "fs";
import path from "path";

const root = process.cwd();
const reportPath = path.join(root, "docs/status/architecture-report-presence-report.json");

const requiredFiles = [
  "docs/graphs/project-graph.mmd",
  "docs/graphs/project-graph.json",
  "docs/status/architecture-evidence-summary.md",
  "docs/status/architecture-health-dashboard.json",
  "docs/status/architecture-health-dashboard.md",
  "docs/status/architecture-health-dashboard-gate-report.json",
  "docs/status/architecture-evidence-priority-queue.json",
  "docs/status/architecture-chain-hardening-worklist-summary.json",
  "docs/status/architecture-impact-index.json",
  "docs/status/architecture-impact-delta-report.json",
  "docs/status/architecture-impact-delta-gate-report.json",
  "docs/status/architecture-risk-hotspots-report.json",
  "docs/status/architecture-risk-hotspots-gate-report.json",
  "docs/status/architecture-dead-nodes-report.json",
  "docs/status/architecture-roadmap.json",
  "docs/status/architecture-roadmap-gate-report.json",
  "docs/status/architecture-delta-report.json",
  "docs/status/architecture-csv-contract-report.json",
  "docs/status/architecture-doc-baseline-report.json",
  "docs/status/architecture-node-links-report.json",
  "docs/status/architecture-node-artifacts-report.json",
  "docs/status/architecture-pipeline-nodes-report.json",
  "docs/status/architecture-generated-node-frontmatter-report.json",
  "docs/status/architecture-graph-artifact-consistency-report.json",
  "docs/status/architecture-evidence-cardinality-report.json",
  "docs/status/architecture-registry-catalog.json",
  "docs/status/architecture-registry-catalog.md",
  "docs/status/architecture-proof-bundle.json",
  "docs/status/architecture-proof-bundle.md",
  "docs/status/architecture-proof-bundle-gate-report.json",
  "docs/status/architecture-command-contract-report.json"
];

const missing = [];
const empty = [];
const failedStatus = [];

function jsonStatusOk(relativePath, payload) {
  if (relativePath.endsWith("architecture-proof-bundle.json")) {
    return payload?.allGatesPass === true;
  }
  if (relativePath.endsWith("architecture-roadmap.json")) {
    return String(payload?.status ?? "").toUpperCase() === "GREEN";
  }
  if (typeof payload?.status === "string") {
    return payload.status === "passed";
  }
  return true;
}

for (const relative of requiredFiles) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    missing.push(relative);
    continue;
  }
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size === 0) {
    empty.push(relative);
    continue;
  }
  if (relative.endsWith(".json")) {
    try {
      const payload = JSON.parse(fs.readFileSync(absolute, "utf8"));
      if (!jsonStatusOk(relative, payload)) {
        failedStatus.push(relative);
      }
    } catch {
      failedStatus.push(relative);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: missing.length || empty.length || failedStatus.length ? "failed" : "passed",
  requiredCount: requiredFiles.length,
  missingCount: missing.length,
  emptyCount: empty.length,
  failedStatusCount: failedStatus.length,
  missing,
  empty,
  failedStatus
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (missing.length || empty.length || failedStatus.length) {
  console.error("Architecture report presence gate failed.");
  if (missing.length) {
    console.error("Missing:");
    for (const file of missing) console.error(`- ${file}`);
  }
  if (empty.length) {
    console.error("Empty:");
    for (const file of empty) console.error(`- ${file}`);
  }
  if (failedStatus.length) {
    console.error("Failed status:");
    for (const file of failedStatus) console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`Architecture report presence gate passed: ${requiredFiles.length} files present and non-empty.`);
