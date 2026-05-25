import fs from "fs";
import path from "path";

const root = process.cwd();
const deltaPath = path.join(root, "docs/status/architecture-delta-report.json");
const reportPath = path.join(root, "docs/status/architecture-delta-zero-report.json");

if (!fs.existsSync(deltaPath)) {
  const report = {
    checkedAt: new Date().toISOString(),
    status: "failed",
    reason: "Missing docs/status/architecture-delta-report.json"
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.reason);
  process.exit(1);
}

const delta = JSON.parse(fs.readFileSync(deltaPath, "utf8"));
const nodes = Number(delta.nodes ?? 0);
const relations = Number(delta.relations ?? 0);
const chains = Number(delta.chains ?? 0);
const driftTotal = Math.abs(nodes) + Math.abs(relations) + Math.abs(chains);

const report = {
  checkedAt: new Date().toISOString(),
  status: driftTotal === 0 ? "passed" : "failed",
  nodes,
  relations,
  chains,
  driftTotal
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (driftTotal !== 0) {
  console.error(
    `Architecture delta-zero gate failed: nodes=${nodes}, relations=${relations}, chains=${chains}`
  );
  process.exit(1);
}

console.log("Architecture delta-zero gate passed: no drift since previous snapshot.");
