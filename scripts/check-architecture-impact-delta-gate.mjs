import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "docs/status/architecture-impact-delta-report.json");
const gateReportPath = path.join(root, "docs/status/architecture-impact-delta-gate-report.json");

function fail(reason, details = {}) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: "failed",
    reason,
    ...details
  };
  fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`Architecture impact delta gate failed: ${reason}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) fail("missing_report_file");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch {
  fail("invalid_json");
}

if (payload?.status !== "passed") {
  fail("report_status_not_passed", { reportStatus: payload?.status ?? null });
}

if (typeof payload?.firstRun !== "boolean") {
  fail("missing_first_run_boolean");
}

const summary = payload?.summary ?? {};
const changedNodes = Number(summary.changedNodes);
const enteredTopCount = Number(summary.enteredTopCount);
const leftTopCount = Number(summary.leftTopCount);
if (![changedNodes, enteredTopCount, leftTopCount].every(Number.isFinite)) {
  fail("invalid_summary_counts");
}

const top = Array.isArray(payload?.topImpactDelta) ? payload.topImpactDelta : null;
if (!top) fail("missing_top_impact_delta_array");
if (top.length > 25) fail("top_impact_delta_exceeds_limit", { count: top.length, maxAllowed: 25 });

for (const [index, row] of top.entries()) {
  if (!row?.node_id) fail("top_row_missing_node_id", { index });
  const delta = Number(row?.impact_score_delta);
  if (!Number.isFinite(delta)) fail("top_row_invalid_delta", { index, nodeId: row?.node_id ?? null });
}

for (let i = 1; i < top.length; i += 1) {
  const prev = Math.abs(Number(top[i - 1].impact_score_delta));
  const curr = Math.abs(Number(top[i].impact_score_delta));
  if (curr > prev) {
    fail("top_impact_delta_not_sorted_desc_abs", { index: i, previousAbs: prev, currentAbs: curr });
  }
}

const entered = Array.isArray(payload?.enteredTopNodes) ? payload.enteredTopNodes : null;
const left = Array.isArray(payload?.leftTopNodes) ? payload.leftTopNodes : null;
if (!entered || !left) fail("missing_entered_or_left_arrays");
if (entered.length !== enteredTopCount) fail("entered_count_mismatch", { summary: enteredTopCount, actual: entered.length });
if (left.length !== leftTopCount) fail("left_count_mismatch", { summary: leftTopCount, actual: left.length });

const gateReport = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  firstRun: payload.firstRun,
  changedNodes,
  enteredTopCount,
  leftTopCount,
  topImpactDeltaCount: top.length
};

fs.writeFileSync(gateReportPath, `${JSON.stringify(gateReport, null, 2)}\n`);
console.log(
  `Architecture impact delta gate passed: changedNodes=${changedNodes}, topRows=${top.length}.`
);
