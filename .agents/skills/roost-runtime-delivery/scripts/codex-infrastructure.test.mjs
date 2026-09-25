import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
});
