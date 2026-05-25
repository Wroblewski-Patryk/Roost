import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dashboardPath = path.join(root, "docs/status/architecture-health-dashboard.json");
const gateReportPath = path.join(root, "docs/status/architecture-health-dashboard-gate-report.json");

function readJson(relativePath, fallback = null) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return fallback;
  }
}

function fail(reason, details = {}) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: "failed",
    reason,
    ...details
  };
  fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`Architecture health dashboard gate failed: ${reason}`);
  process.exit(1);
}

const dashboard = readJson("docs/status/architecture-health-dashboard.json");
if (!dashboard) fail("missing_or_invalid_dashboard_json");

const evidenceQueue = Number(dashboard.evidenceQueue ?? NaN);
const chainWorklist = Number(dashboard.chainWorklistTotal ?? NaN);
const chainCoverageCovered = Number(dashboard.chainCoverageCovered ?? NaN);
const chainCoverageTotal = Number(dashboard.chainCoverageTotal ?? NaN);
const roadmapStatus = String(dashboard.roadmapStatus ?? "").toUpperCase();
const allGreen = Boolean(dashboard.allGreen);

if (![evidenceQueue, chainWorklist, chainCoverageCovered, chainCoverageTotal].every(Number.isFinite)) {
  fail("invalid_numeric_metrics");
}
if (!roadmapStatus) fail("missing_roadmap_status");

const expectedAllGreen =
  evidenceQueue === 0 &&
  chainWorklist === 0 &&
  chainCoverageTotal > 0 &&
  chainCoverageCovered === chainCoverageTotal &&
  Number(dashboard.chainIntegrityIssues ?? -1) === 0 &&
  Number(dashboard.nodeIntegrityIssues ?? -1) === 0 &&
  Number(dashboard.relationIntegrityIssues ?? -1) === 0 &&
  Number(dashboard.connectivityIssues ?? -1) === 0 &&
  Number(dashboard.deadNodes ?? -1) === 0 &&
  roadmapStatus === "GREEN";

if (allGreen !== expectedAllGreen) {
  fail("all_green_invariant_mismatch", {
    allGreen,
    expectedAllGreen
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  allGreen,
  expectedAllGreen,
  evidenceQueue,
  chainWorklist,
  chainCoverage: `${chainCoverageCovered}/${chainCoverageTotal}`,
  roadmapStatus
};

fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Architecture health dashboard gate passed: allGreen=${allGreen}.`);
