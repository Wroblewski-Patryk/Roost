import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function findRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, "AGENTS.md")) && existsSync(path.join(current, "docs", "documentation-contract.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("roost_repository_root_not_found");
    current = parent;
  }
}

const root = findRoot(process.cwd());
const requirements = readFileSync(path.join(root, "docs", "product", "requirements.md"), "utf8");
const traceability = readFileSync(path.join(root, "docs", "architecture", "traceability-matrix.md"), "utf8");

const requirementIds = [...requirements.matchAll(/<a id="rf-[^"]+"><\/a>(RF-[A-Z]+-\d{3})/g)].map((match) => match[1]);
const uniqueIds = [...new Set(requirementIds)].sort();
const duplicates = [...new Set(requirementIds.filter((id, index) => requirementIds.indexOf(id) !== index))].sort();
const traceabilityIds = [...traceability.matchAll(/^\| \[(RF-[A-Z]+-\d{3})\]\([^\r\n]+\) \|/gm)].map((match) => match[1]);
const uniqueTraceabilityIds = [...new Set(traceabilityIds)].sort();
const traceabilityDuplicates = [...new Set(traceabilityIds.filter((id, index) => traceabilityIds.indexOf(id) !== index))].sort();
const missing = uniqueIds.filter((id) => !uniqueTraceabilityIds.includes(id));
const unknown = uniqueTraceabilityIds.filter((id) => !uniqueIds.includes(id));

const errors = [];
if (uniqueIds.length === 0) errors.push("no_canonical_requirement_ids_found");
if (duplicates.length) errors.push(`duplicate_requirement_ids:${duplicates.join(",")}`);
if (traceabilityDuplicates.length) errors.push(`duplicate_traceability_rows:${traceabilityDuplicates.join(",")}`);
if (missing.length) errors.push(`requirements_missing_from_traceability:${missing.join(",")}`);
if (unknown.length) errors.push(`unknown_traceability_requirement_ids:${unknown.join(",")}`);

console.log(JSON.stringify({
  schema: "roost-requirement-coverage-v2",
  ok: errors.length === 0,
  requirementCount: uniqueIds.length,
  traceabilityRowCount: traceabilityIds.length,
  traceabilityCoveredCount: uniqueIds.length - missing.length,
  duplicates,
  traceabilityDuplicates,
  missing,
  unknown,
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
