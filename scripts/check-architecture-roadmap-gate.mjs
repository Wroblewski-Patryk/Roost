import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const roadmapPath = path.join(root, "docs/status/architecture-roadmap.json");
const gateReportPath = path.join(root, "docs/status/architecture-roadmap-gate-report.json");

function fail(reason, details = {}) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: "failed",
    reason,
    ...details
  };
  fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(`Architecture roadmap gate failed: ${reason}`);
  process.exit(1);
}

if (!fs.existsSync(roadmapPath)) fail("missing_roadmap_report");

let payload;
try {
  payload = JSON.parse(fs.readFileSync(roadmapPath, "utf8"));
} catch {
  fail("invalid_json");
}

const status = String(payload?.status ?? "").toUpperCase();
if (!status) fail("missing_status");
if (!["GREEN", "YELLOW", "RED"].includes(status)) fail("invalid_status", { status });

const evidenceQueue = Number(payload?.metrics?.evidenceQueue ?? payload?.evidenceQueue ?? NaN);
const chainWorklist = Number(payload?.metrics?.chainWorklist ?? payload?.chainWorklist ?? NaN);
if (!Number.isFinite(evidenceQueue) || !Number.isFinite(chainWorklist)) {
  fail("invalid_queue_metrics");
}

const shouldBeGreen = evidenceQueue === 0 && chainWorklist === 0;
if (shouldBeGreen && status !== "GREEN") {
  fail("green_invariant_broken", { status, evidenceQueue, chainWorklist });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  roadmapStatus: status,
  evidenceQueue,
  chainWorklist
};

fs.writeFileSync(gateReportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Architecture roadmap gate passed: status=${status}.`);
