import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { budgetFixture } from "./fixtures/hermes-budget.mjs";
import { runHermesOwnedProcess } from "./lib/agent-host-hermes-quiet.mjs";
import { isWindowsJobCleanupReceipt } from "./lib/agent-host-windows-job.mjs";
import { providerInputTransport } from "./lib/agent-host-provider-input.mjs";

test("native quiet process with no answer stops without a second attempt", { skip: process.platform !== "win32", timeout: 30000 }, async t => {
  const f = budgetFixture(t);
  const executable = f.checked.candidate.command;
  const source = path.join(f.root, "empty-result.cs");
  writeFileSync(source, "using System; internal static class EmptyResult { static int Main(string[] args) { Console.In.ReadToEnd(); return 0; } }\n");
  await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    ["/nologo", "/target:exe", "/platform:x64", `/out:${executable}`, source], { windowsHide: true });
  const options = { executable, argv: f.checked.candidate.args, cwd: f.checked.candidate.cwd,
    environment: f.checked.candidate.environment, attempt: f.envelope.identity.executionId,
    input: providerInputTransport("hermes_codex", f.envelope).input,
    budgetReceipt: f.checked.budgetReceipt, remainingMs: () => 10000, assertAuthority() {} };

  await assert.rejects(runHermesOwnedProcess(options), error => {
    assert.equal(error.message, "hermes_quiet_empty_result");
    assert.equal(error.retryable, false);
    assert.notEqual(error.outcome, "candidate_result");
    const job = error.details.ownedTreeReceipt;
    assert.ok(isWindowsJobCleanupReceipt(job));
    assert.equal(job.attempt, f.envelope.identity.executionId);
    assert.equal(job.rootExit, 0);
    assert.equal(job.terminationReason, "root_exit");
    assert.equal(job.stdoutBytes, 0);
    assert.equal(job.cleanup, true);
    assert.equal(job.activeProcesses, 0);
    const budget = error.details.attemptBudgetReceipt;
    assert.equal(budget.ownedTreeReceipt, job);
    assert.equal(budget.outcome, "process_failed");
    for (const counter of ["physicalModelCalls", "toolCalls", "transportRetries", "inputTokens", "outputTokens", "totalTokens", "cost"])
      assert.equal(budget[counter], null);
    return true;
  });
  await assert.rejects(runHermesOwnedProcess(options), /reuse/);
});
