import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessStatus, DECISIONS, EVIDENCE_STATUSES, parseRequirements, parseTraceability } from "./requirement-status.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const requirements = parseRequirements(readFileSync(path.join(root, "docs/product/requirements.md"), "utf8"));
const traceability = parseTraceability(readFileSync(path.join(root, "docs/architecture/traceability-matrix.md"), "utf8"));
const { errors, rows } = assessStatus(requirements, traceability);
if (errors.length) {
  console.error(`Status source invalid:\n${errors.join("\n")}`);
  process.exit(1);
}
const implementation = readFileSync(path.join(root, "docs/implementation.md"), "utf8");
const activeGate = implementation.match(/^\*\*Active gate:\*\* (.+)$/m);
if (!activeGate) {
  console.error("Missing active-gate statement in docs/implementation.md");
  process.exit(1);
}
const gateState = activeGate[1];
const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const selectedId = process.argv.find((arg) => arg.startsWith("--id="))?.slice(5);
const all = process.argv.includes("--all");
const json = process.argv.includes("--json");
if (selectedId && !rows.some((row) => row.id === selectedId)) {
  console.error(`Unknown requirement ID: ${selectedId}`);
  process.exit(1);
}
const count = (subset, key, value) => subset.filter((row) => row[key] === value).length;
const countsByDecision = Object.fromEntries(DECISIONS.map((decision) => [decision, rows.filter((row) => row.decision === decision).length]));
const accepted = rows.filter((row) => row.decision === "accepted");
const countsByStatus = Object.fromEntries(EVIDENCE_STATUSES.map((status) => [status, count(accepted, "status", status)]));
const areas = [...new Set(rows.map((row) => row.area))].sort();
const selectedRows = selectedId ? rows.filter((row) => row.id === selectedId) : all ? rows : [];
if (json) {
  console.log(JSON.stringify({ schema: "roost-requirement-status-v1", head, gateState, total: rows.length,
    countsByDecision, acceptedCountsByStatus: countsByStatus, rows: selectedRows }, null, 2));
  process.exit(0);
}
console.log(`# Roost requirement status at ${head}\n`);
console.log(`Current delivery: ${gateState}. Source: docs/implementation.md.\n`);
console.log(`Requirement rows: ${rows.length}; accepted ${countsByDecision.accepted}, deferred ${countsByDecision.deferred}, rejected ${countsByDecision.rejected}.\n`);
console.log("Accepted requirements by inspected-evidence status:\n");
console.log("| Status | Count |\n| --- | ---: |");
for (const status of EVIDENCE_STATUSES) console.log(`| ${status} | ${countsByStatus[status]} |`);
console.log("\nAccepted requirements by area (evidence status, not percent complete):\n");
console.log(`| Area | Accepted | ${EVIDENCE_STATUSES.join(" | ")} |\n| --- | ---: | ${EVIDENCE_STATUSES.map(() => "---:").join(" | ")} |`);
for (const area of areas) {
  const subset = accepted.filter((row) => row.area === area);
  if (!subset.length) continue;
  console.log(`| ${area} | ${subset.length} | ${EVIDENCE_STATUSES.map((status) => count(subset, "status", status)).join(" | ")} |`);
}
if (selectedRows.length) {
  console.log("\nRequirement detail (canonical acceptance clause and inspected proof):\n");
  for (const row of selectedRows) {
    console.log(`## ${row.id} — ${row.decision}, ${row.priority}, ${row.status}\n`);
    console.log(`Requirement: ${row.requirement}\n`);
    console.log(`Evidence: ${row.evidence}\n`);
    console.log(`Remaining boundary / proof: ${row.remaining}\n`);
  }
}
console.log("Requirement status is not a product-completion percentage. 'nieocenione' means no current audit; 'działa' is limited to the stated scope. Full screen/function inventory remains unverified under RF-UX-010.");
console.log("Use --all for every requirement, --id=RF-... for one, or --json for structured output. Source: docs/product/requirements.md + docs/architecture/traceability-matrix.md.");
