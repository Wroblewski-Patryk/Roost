import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const scriptPath = path.resolve(process.cwd(), "scripts/check-architecture-chain-integrity.mjs");

type ScriptResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  report: {
    checkedAt: string;
    totalChains: number;
    issues: number;
    items: Array<{ chain_id: string; issue: string }>;
  };
};

async function runChainIntegrity(csvText: string): Promise<ScriptResult> {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "architecture-chain-integrity-"));
  const chainsPath = path.join(fixtureRoot, "docs", "architecture", "chains", "chains.csv");
  const reportPath = path.join(fixtureRoot, "docs", "status", "architecture-chain-integrity-report.json");

  mkdirSync(path.dirname(chainsPath), { recursive: true });
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(chainsPath, csvText);

  const child = spawn(process.execPath, [scriptPath], {
    cwd: fixtureRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as ScriptResult["report"];
  rmSync(fixtureRoot, { recursive: true, force: true });

  return { exitCode, stdout, stderr, report };
}

test("check-architecture-chain-integrity passes when a verified chain has coherent proof fields", async () => {
  const result = await runChainIntegrity([
    "id,verification_status,missing_nodes,tests,docs,node_sequence,entry_node_id,exit_node_id,status,last_verified_at",
    "CHAIN-OK,verified,,TEST-ARCH-GRAPH,docs/architecture/architecture-evidence-system.md,ui>api>service,node-ui,node-service,verified,2026-07-14T00:00:00.000Z"
  ].join("\n"));

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /Architecture chain integrity gate passed: 1 chains checked, 0 issues\./);
  assert.equal(result.report.totalChains, 1);
  assert.equal(result.report.issues, 0);
  assert.deepEqual(result.report.items, []);
});

test("check-architecture-chain-integrity fails closed and writes a detailed issue report for inconsistent verified chains", async () => {
  const result = await runChainIntegrity([
    "id,verification_status,missing_nodes,tests,docs,node_sequence,entry_node_id,exit_node_id,status,last_verified_at",
    "CHAIN-BAD,verified,missing_api,,,,,implemented,"
  ].join("\n"));

  assert.equal(result.exitCode, 1, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stderr, /Architecture chain integrity gate failed: 7 issue\(s\)\./);
  assert.equal(result.report.totalChains, 1);
  assert.equal(result.report.issues, 7);
  assert.deepEqual(
    result.report.items.map((item) => item.issue),
    [
      "empty_node_sequence",
      "missing_entry_node_id",
      "verified_verification_status_but_status_not_verified",
      "verified_with_missing_nodes",
      "verified_without_tests",
      "verified_without_docs",
      "verified_without_last_verified_at"
    ]
  );
});
