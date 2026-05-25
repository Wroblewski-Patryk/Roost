import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "docs/status/architecture-risk-hotspots-report.json");
const gateReportPath = path.join(root, "docs/status/architecture-risk-hotspots-gate-report.json");

function fail(reason, details = {}) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: "failed",
    reason,
    ...details
  };
  fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`Architecture risk hotspots gate failed: ${reason}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail("missing_report_file");
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch {
  fail("invalid_json");
}

if (payload?.status !== "passed") {
  fail("report_status_not_passed", { reportStatus: payload?.status ?? null });
}

const hotspots = Array.isArray(payload?.topHotspots) ? payload.topHotspots : null;
if (!hotspots) {
  fail("missing_top_hotspots_array");
}

if (hotspots.length > 25) {
  fail("top_hotspots_exceeds_limit", { count: hotspots.length, maxAllowed: 25 });
}

for (const [index, row] of hotspots.entries()) {
  if (!row?.node_id) fail("hotspot_missing_node_id", { index });
  if (!Number.isFinite(Number(row?.risk_score))) {
    fail("hotspot_invalid_risk_score", { index, nodeId: row?.node_id ?? null });
  }
}

const scores = hotspots.map((row) => Number(row.risk_score));
for (let i = 1; i < scores.length; i += 1) {
  if (scores[i] > scores[i - 1]) {
    fail("hotspots_not_sorted_desc", {
      index: i,
      previous: scores[i - 1],
      current: scores[i]
    });
  }
}

const summaryCount = Number(payload?.summary?.hotspotCount ?? -1);
if (summaryCount !== hotspots.length) {
  fail("summary_count_mismatch", { summaryCount, actualCount: hotspots.length });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  hotspotCount: hotspots.length,
  highestRiskScore: hotspots.length ? Number(hotspots[0].risk_score) : 0
};

fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Architecture risk hotspots gate passed: ${report.hotspotCount} hotspots validated.`
);
