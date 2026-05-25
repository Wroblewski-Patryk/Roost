import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const queuePath = path.join(root, "docs/status/architecture-evidence-priority-queue.json");

if (!fs.existsSync(queuePath)) {
  console.error("Architecture evidence gate failed: priority queue file is missing.");
  process.exit(1);
}

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const count = Number(queue.count || 0);

if (count > 0) {
  console.error(`Architecture evidence gate failed: ${count} actionable evidence items remain.`);
  process.exit(1);
}

console.log("Architecture evidence gate passed: no actionable evidence gaps.");
