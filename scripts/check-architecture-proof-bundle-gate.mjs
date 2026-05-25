import fs from "fs";
import path from "path";

const root = process.cwd();
const bundlePath = path.join(root, "docs/status/architecture-proof-bundle.json");
const reportPath = path.join(root, "docs/status/architecture-proof-bundle-gate-report.json");

function writeReport(status, reason, details = []) {
  const report = {
    checkedAt: new Date().toISOString(),
    status,
    reason,
    details
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (!fs.existsSync(bundlePath)) {
  const reason = "Missing docs/status/architecture-proof-bundle.json";
  writeReport("failed", reason);
  console.error(reason);
  process.exit(1);
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const details = [];

if (bundle.allGatesPass !== true) {
  details.push("allGatesPass is not true");
}

const evidenceQueue = Number(bundle.evidenceQueue ?? 0);
const chainWorklist = Number(bundle.chainWorklist ?? 0);
const deltaNodes = Number(bundle.delta?.nodes ?? 0);
const deltaRelations = Number(bundle.delta?.relations ?? 0);
const deltaChains = Number(bundle.delta?.chains ?? 0);

if (evidenceQueue !== 0) {
  details.push(`evidenceQueue=${evidenceQueue} (expected 0)`);
}
if (chainWorklist !== 0) {
  details.push(`chainWorklist=${chainWorklist} (expected 0)`);
}
if (deltaNodes !== 0 || deltaRelations !== 0 || deltaChains !== 0) {
  details.push(
    `delta is not zero: nodes=${deltaNodes}, relations=${deltaRelations}, chains=${deltaChains}`
  );
}

if (details.length) {
  const reason = "Architecture proof bundle gate failed.";
  writeReport("failed", reason, details);
  console.error(reason);
  for (const item of details) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

writeReport("passed", "Architecture proof bundle indicates fully green state.");
console.log("Architecture proof bundle gate passed.");
