import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessStatus, parseRequirements, parseTraceability } from "./requirement-status.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..", "..", "..");

function run(script) {
  return JSON.parse(execFileSync(process.execPath, [path.join(scriptDirectory, script)], {
    cwd: root,
    encoding: "utf8",
  }));
}

test("delivery preflight exposes a valid repository contract", () => {
  const result = run("preflight.mjs");
  assert.equal(result.schema, "roost-codex-preflight-v1");
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.equal(result.errors.length, 0);
  assert.match(result.git.head, /^[a-f0-9]{40}$/);
  assert.ok(result.defaultContextBytes > 0);
  assert.match(result.activeGate, /^(?:none\b|G\d+[a-z]?\b)/);
});

test("every canonical requirement has traceability coverage", () => {
  const result = run("verify-requirement-coverage.mjs");
  assert.equal(result.schema, "roost-requirement-coverage-v2");
  assert.equal(result.ok, true, result.errors?.join("\n"));
  assert.ok(result.requirementCount > 0);
  assert.equal(result.traceabilityRowCount, result.requirementCount);
  assert.equal(result.traceabilityCoveredCount, result.requirementCount);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.traceabilityDuplicates, []);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.unknown, []);
  assert.deepEqual(result.indexMissingPrefixes, []);
  assert.deepEqual(result.indexUnknownPrefixes, []);
  assert.equal(Object.values(result.decisionCounts).reduce((sum, value) => sum + value, 0), result.requirementCount);
  assert.equal(Object.values(result.acceptedStatusCounts).reduce((sum, value) => sum + value, 0), result.decisionCounts.accepted);
});

test("status assessment distinguishes unassessed evidence from working behavior", () => {
  const requirements = parseRequirements("| <a id=\"rf-host-022\"></a>RF-HOST-022 | reference | accepted | Select a managed model. | — |");
  const unassessed = parseTraceability("| [RF-HOST-022](../product/requirements.md#rf-host-022) | P1 | nieocenione | [MODEL](#e-model) | Native task proof absent. |");
  const report = assessStatus(requirements, unassessed);
  assert.deepEqual(report.errors, []);
  assert.equal(report.rows[0].status, "nieocenione");
  assert.notEqual(report.rows[0].status, "działa");
  const invalid = assessStatus(requirements, [{ ...unassessed[0], status: "ukończone" }]);
  assert.ok(invalid.errors.includes("invalid_traceability_row:RF-HOST-022"));
});
