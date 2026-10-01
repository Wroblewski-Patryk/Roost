import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { budgetFixture } from "./fixtures/hermes-budget.mjs";
import { isWindowsJobCleanupReceipt } from "./lib/agent-host-windows-job.mjs";
import { sealHermesBudget, assertHermesBudget, hermesBudgetReceiptSchema, hermesBudgetBlocker, hermesBudgetBlockers,
  assertHermesBudgetReceipt, consumeHermesBudgetReceipt, createHermesBudgetReceipt, classifyHermesOutcome } from "./lib/agent-host-hermes-budget.mjs";
import { sealHermesStartup, assertHermesStartup, createHermesStartupCandidate, hermesStartupEnvironment, hermesStartupReceiptSchema } from "./lib/agent-host-hermes-startup.mjs";
import { hermesBudgetProfileBinding, renderHermesBudgetProfile, hermesNativeProfileBinding, renderHermesNativeProfile } from "./lib/agent-host-hermes-profile.mjs";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { managedSelectionFixture } from "./fixtures/trusted-pilot.mjs";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, assertProviderStartup, consumeProviderInput, providerInputTransport } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch, prepareProviderLaunch, hermesContract } from "./lib/agent-host-provider-launch.mjs";
import { runHermesOwnedProcess } from "./lib/agent-host-hermes-quiet.mjs";
const counters = ["physicalModelCalls", "toolCalls", "transportRetries", "inputTokens", "outputTokens", "totalTokens", "cost"];
const processOptions = f => ({ executable: f.checked.candidate.command, argv: f.checked.candidate.args,
  cwd: f.checked.candidate.cwd, environment: f.checked.candidate.environment, attempt: f.envelope.identity.executionId,
  input: providerInputTransport("hermes_codex", f.envelope).input });

function managedBudgetFixture(t, apiMaxRetries, configuredRetries = apiMaxRetries) {
  const f = budgetFixture(t), file = f.provider.profile.profilePath;
  const profile = hermesBudgetProfileBinding(file, { apiMaxRetries: configuredRetries });
  writeFileSync(file, renderHermesBudgetProfile({ apiMaxRetries: configuredRetries }));
  const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
  writeFileSync(path.join(path.dirname(file), "owner-attestation.json"), owner.bytes);
  f.provider.profile = profile;
  f.f.packet.contract.modelSelection = managedSelectionFixture("codex_responses");
  Object.assign(f.f.packet.contract.modelSelection.attemptPolicy, { maxTurns: 2, apiMaxRetries });
  f.f.claimed.checkpoint = undefined; pinReadyFixture(f.f);
  f.envelope = prepareProviderInput(f.consumption);
  f.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: f.envelope.revisions.packet, contextRevision: f.envelope.revisions.context };
  f.options = { ...f.options, envelope: f.envelope }; f.checked = assertProviderStartup(f.options);
  return f;
}

for (const apiMaxRetries of [0, 1, 2]) {
  test(`native v5 read-only startup binds selected retry setting ${apiMaxRetries}`, t => {
    const f = budgetFixture(t), envelope = structuredClone(f.envelope), file = f.provider.profile.profilePath;
    const profile = hermesNativeProfileBinding(file, { apiMaxRetries });
    writeFileSync(file, renderHermesNativeProfile({ apiMaxRetries }));
    const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
    writeFileSync(path.join(path.dirname(file), "owner-attestation.json"), owner.bytes); f.provider.profile = profile;
    envelope.contract.modelSelection = managedSelectionFixture("codex_responses");
    Object.assign(envelope.contract.modelSelection.attemptPolicy, { maxTurns: 2, apiMaxRetries });
    envelope.contract.nativeBoundary = { profile: "inspect-readonly" };
    envelope.contract.access = { sandbox: "read-only", tools: ["repository_read"], permissions: ["repository_read"] };
    const budget = sealHermesBudget({ envelope, claimed: { ...f.f.claimed, checkpoint: undefined }, inputBytes: 100 });
    const environment = hermesStartupEnvironment(profile, process.env, f.options.repositoryPath);
    const candidate = createHermesStartupCandidate({ provider: f.provider, envelope, repositoryPath: f.options.repositoryPath, environment, budget });
    const options = { provider: f.provider, envelope, repositoryPath: f.options.repositoryPath, candidate, budget };
    const startup = assertHermesStartup(sealHermesStartup(options), options);
    const receipt = createHermesBudgetReceipt(budget, envelope, startup);
    assert.equal(startup.apiMaxRetries, apiMaxRetries); assert.equal(receipt.apiMaxRetries, apiMaxRetries);
    const { apiMaxRetries: omitted, ...historical } = startup;
    assert.equal(hermesStartupReceiptSchema.safeParse(historical).success, apiMaxRetries === 2);
    assert.equal(startup.configDigest, profile.configDigest); assert.equal(receipt.configDigest, profile.configDigest);
    assert.deepEqual(startup.toolsets, ["bot_room"]); assert.deepEqual(startup.expandedTools, []);
    assert.ok(assertHermesBudgetReceipt(receipt).remainingMs > 0);
  });
  test(`managed selected retry setting ${apiMaxRetries} binds actual profile, startup and budget receipts`, t => {
    const f = managedBudgetFixture(t, apiMaxRetries), receipt = f.checked.budgetReceipt;
    assert.equal(JSON.parse(readFileSync(f.provider.profile.profilePath)).agent.api_max_retries, apiMaxRetries);
    assert.equal(f.checked.receipt.apiMaxRetries, apiMaxRetries);
    assert.equal(receipt.apiMaxRetries, apiMaxRetries); assert.equal(receipt.maxTurns, 2);
    assert.equal(f.checked.candidate.args[f.checked.candidate.args.indexOf("--max-turns") + 1], "2");
    assert.equal(hermesStartupReceiptSchema.safeParse(f.checked.receipt).success, true);
    const { apiMaxRetries: omitted, ...historical } = f.checked.receipt;
    assert.equal(hermesStartupReceiptSchema.safeParse(historical).success, apiMaxRetries === 2);
    assert.equal(hermesBudgetReceiptSchema.safeParse(receipt).success, true);
    for (const counter of counters) assert.equal(receipt[counter], null);
    for (const other of [0, 1, 2].filter(value => value !== apiMaxRetries)) {
      assert.equal(hermesStartupReceiptSchema.safeParse({ ...f.checked.receipt, apiMaxRetries: other }).success, false);
      assert.throws(() => assertHermesBudgetReceipt({ ...receipt, apiMaxRetries: other }), /unproven/);
      writeFileSync(f.provider.profile.profilePath, renderHermesBudgetProfile({ apiMaxRetries: other }));
      assert.throws(() => assertProviderStartup(f.options), /hermes_profile_config_invalid/);
      assert.deepEqual(hermesBudgetBlockers([hermesBudgetBlocker], receipt), [hermesBudgetBlocker]);
      writeFileSync(f.provider.profile.profilePath, renderHermesBudgetProfile({ apiMaxRetries }));
    }
    const remaining = consumeHermesBudgetReceipt(receipt, processOptions(f)); assert.ok(remaining() > 0);
    assert.throws(() => consumeHermesBudgetReceipt(receipt, processOptions(f)), /reuse/);
  });
  for (const configured of [0, 1, 2].filter(value => value !== apiMaxRetries)) {
    test(`selected retry setting ${apiMaxRetries} rejects genuine profile configured ${configured}`, t => {
      assert.throws(() => managedBudgetFixture(t, apiMaxRetries, configured), /hermes_startup_retry_policy_mismatch/);
    });
  }
}

test("managed retry and turn policy cannot change after budget sealing", t => {
  const f = budgetFixture(t), envelope = structuredClone(f.envelope);
  envelope.contract.modelSelection = managedSelectionFixture("codex_responses");
  envelope.contract.modelSelection.attemptPolicy.apiMaxRetries = 0;
  const seal = sealHermesBudget({ envelope, claimed: { ...f.f.claimed, checkpoint: undefined }, inputBytes: 100 });
  envelope.contract.modelSelection.attemptPolicy.apiMaxRetries = 1;
  assert.throws(() => assertHermesBudget(seal, envelope), /hermes_attempt_budget_changed/);
  envelope.contract.modelSelection.attemptPolicy.apiMaxRetries = 0;
  envelope.contract.modelSelection.attemptPolicy.maxTurns = 2;
  assert.throws(() => assertHermesBudget(seal, envelope), /hermes_attempt_budget_changed/);
});

test("budget sealing rejects retry settings outside the managed policy", t => {
  const f = budgetFixture(t), envelope = structuredClone(f.envelope);
  envelope.contract.modelSelection = managedSelectionFixture("codex_responses");
  for (const apiMaxRetries of [-1, 3, 0.5, "0", undefined]) {
    envelope.contract.modelSelection.attemptPolicy.apiMaxRetries = apiMaxRetries;
    assert.throws(() => sealHermesBudget({ envelope, claimed: { ...f.f.claimed, checkpoint: undefined }, inputBytes: 100 }), /hermes_attempt_budget_invalid/);
  }
});

test("coding-small-v1 is Ready-bound, private, honest about unknowns, and stops before real launch", t => {
  const f = budgetFixture(t), r = f.checked.budgetReceipt;
  assert.equal(hermesBudgetReceiptSchema.safeParse(r).success, true);
  assert.deepEqual(f.checked.candidate.args.slice(-4), ["--max-turns", "24", "--run-budget", String(r.runBudgetSeconds)]);
  assert.ok(r.runBudgetSeconds <= 595 && r.runBudgetSeconds >= 590);
  assert.equal(Date.parse(r.acceptedDeadline), Date.parse(f.f.claimed.startedAt) + 600000);
  assert.deepEqual(JSON.parse(readFileSync(f.provider.profile.profilePath)).agent, { max_turns: 24, api_max_retries: 2 });
  for (const counter of counters) assert.equal(r[counter], null);
  assert.equal(r.maxOutputTokensIntent, 4000); assert.equal(r.outputTokenEnforcement, "unavailable");
  for (const privateValue of [f.root, "Repair the synthetic fixture", "SYSTEMROOT", "leaseToken", "rawOutput", "@"]) assert.ok(!JSON.stringify(r).includes(privateValue));
  assert.deepEqual(hermesBudgetBlockers([hermesBudgetBlocker, "other"], r), ["other"]);
  for (const fake of [{ ...r }, JSON.parse(JSON.stringify(r)), { ...r, physicalModelCalls: 64 }, { ...r, rawOutput: "secret" }]) {
    assert.deepEqual(hermesBudgetBlockers([hermesBudgetBlocker], fake), [hermesBudgetBlocker]);
    assert.throws(() => assertHermesBudgetReceipt(fake), /unproven/);
  }
  assert.equal(hermesBudgetReceiptSchema.safeParse({ ...r, toolCalls: 96 }).success, false);
  if (process.platform === "win32") {
    const plan = projectProviderLaunch(f.options);
    assert.equal(plan.command, null); assert.equal(plan.args, null);
    assert.equal(plan.blockers.includes(hermesBudgetBlocker), false);
    for (const code of ["hermes_public_launch_contract_unqualified", "hermes_native_tools_isolation_unproven", "hermes_stop_recovery_unproven"])
      assert.ok(plan.blockers.includes(code));
    assert.deepEqual(plan.acceptedResidualBlockers, ["hermes_single_turn_enforcement_unproven", "hermes_output_cost_budget_unproven"]);
    assert.throws(() => prepareProviderLaunch(f.options, f.consumption), /host_containment_admission_blocked/);
  }
  for (const flag of ["implementationReady", "executionSupported", "pilotReady", "liveAdmissionAllowed", "pilotExecutionAuthorized", "pilotExecutionStarted"])
    assert.equal(hermesContract[flag], false);
});

test("read-only Hermes budget receipt accepts the zero-tool bot_room profile", t => {
  const f = budgetFixture(t);
  const projected = { ...f.checked.budgetReceipt, toolsets: ["bot_room"] };
  assert.equal(hermesBudgetReceiptSchema.safeParse(projected).success, true);
});

test("coding budget accepts an exact durable branch checkpoint before model launch", t => {
  const f = budgetFixture(t);
  const envelope = { ...f.envelope, contract: { ...f.envelope.contract,
    nativeBoundary: { profile: "coding-local" }, singleTask: { branch: "codex/task-00000000-0000-4000-8000-000000000001" } } };
  const claimed = { ...f.f.claimed, checkpoint: { stage: "branch_ready",
    packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context,
    workspaceDigest: "b".repeat(64), branch: envelope.contract.singleTask.branch, headCommit: "a".repeat(40) } };
  assert.ok(sealHermesBudget({ envelope, claimed, inputBytes: 100 }));
  assert.ok(sealHermesBudget({ envelope: { ...envelope, contract: { ...envelope.contract,
    budgets: { ...envelope.contract.budgets, maxDurationSeconds: 1800 } } }, claimed, inputBytes: 100 }));
  assert.throws(() => sealHermesBudget({ envelope, claimed: { ...claimed,
    checkpoint: { ...claimed.checkpoint, branch: "main" } }, inputBytes: 100 }), /invalid/);
});

test("signed 1800 second attempt produces a bounded startup receipt", t => {
  const f = budgetFixture(t, state => { state.packet.contract.budgets.maxDurationSeconds = 1800; });
  assert.ok(f.checked.budgetReceipt.runBudgetSeconds <= 1795);
  assert.ok(f.checked.budgetReceipt.runBudgetSeconds >= 1790);
});

test("startup revalidation preserves the original budget receipt identity", t => {
  const f = budgetFixture(t);
  const again = assertProviderStartup(f.options);
  assert.strictEqual(again.receipt, f.checked.receipt);
  assert.strictEqual(again.budgetReceipt, f.checked.budgetReceipt);
});

for (const [label, edit] of Object.entries({ over1800: f => { f.packet.contract.budgets.maxDurationSeconds = 1801; },
  retryTask: f => { f.packet.contract.budgets.maxAttempts = 2; }, resume: f => { f.claimed.codexThreadId = "old-session"; },
  checkpoint: f => { f.claimed.checkpoint = { stage: "prepared" }; }, ultra: f => { f.packet.contract.modelSelection.reasoningEffort = "ultra"; } })) {
  test(`${label} is denied before startup`, t => assert.throws(() => budgetFixture(t, edit)));
}
for (const [label, edit] of Object.entries({ turns: c => { c.args[c.args.indexOf("--max-turns") + 1] = "25"; },
  runBudget: c => { c.args[c.args.indexOf("--run-budget") + 1] = "900"; },
  resume: c => c.args.push("--resume", "session"), checkpoints: c => c.args.push("--checkpoints"),
  worktree: c => c.args.push("--worktree"), fallback: c => c.args.push("--provider", "auto") })) {
  test(`${label} argv drift is rejected`, t => {
    const f = budgetFixture(t), candidate = structuredClone(f.checked.candidate); edit(candidate);
    assert.throws(() => sealHermesStartup({ ...f.checked.options, candidate }), /hermes_startup_candidate_invalid/);
  });
}
for (const [label, edit] of Object.entries({ retries: c => { c.agent.api_max_retries = 3; },
  turns: c => { c.agent.max_turns = 25; }, checkpoints: c => { c.checkpoints.enabled = true; },
  fallback: c => { c.fallback_model = ["auto"]; }, worktree: c => { c.worktree = true; } })) {
  test(`${label} private config drift invalidates existing proof`, t => {
    const f = budgetFixture(t), c = JSON.parse(readFileSync(f.provider.profile.profilePath)); edit(c);
    writeFileSync(f.provider.profile.profilePath, JSON.stringify(c, null, 2) + "\n");
    assert.throws(() => assertProviderStartup(f.options), /hermes_profile/);
    assert.deepEqual(hermesBudgetBlockers([hermesBudgetBlocker], f.checked.budgetReceipt), [hermesBudgetBlocker]);
  });
}
test("original deadline cannot renew, Ready/claim drift and short cleanup reject", t => {
  const f = budgetFixture(t), seal = f.checked.options.budget;
  assert.throws(() => assertHermesBudget(seal, { ...f.envelope }), /changed/);
  const original = f.f.claimed.startedAt;
  f.f.claimed.startedAt = new Date(Date.parse(original) + 1000).toISOString();
  assert.throws(() => consumeProviderInput(f.envelope, f.consumption), /changed/);
  const claimed = { ...f.f.claimed, startedAt: original, checkpoint: undefined };
  assert.throws(() => sealHermesBudget({ envelope: f.envelope, claimed, inputBytes: 100, cleanupMarginMs: 4999 }), /invalid/);
  assert.throws(() => sealHermesBudget({ envelope: f.envelope, claimed, inputBytes: 131073 }), /invalid/);
  const another = sealHermesBudget({ envelope: f.envelope, claimed, inputBytes: f.checked.budgetReceipt.inputBytes });
  assert.throws(() => createHermesBudgetReceipt(another, f.envelope, f.checked.receipt), /startup_unproven/);
  const before = assertHermesBudget(seal, f.envelope).remainingMs;
  t.mock.method(Date, "now", () => Date.parse(original) - 10000);
  assert.ok(assertHermesBudget(seal, f.envelope).remainingMs <= before);
  t.mock.restoreAll();
  t.mock.method(Date, "now", () => Date.parse(original) + 596000);
  assert.throws(() => assertHermesBudget(seal, f.envelope), /expired/);
});
test("opaque attempt consumption binds process/input and forbids automatic restart", t => {
  const f = budgetFixture(t), r = f.checked.budgetReceipt, opts = processOptions(f);
  assert.throws(() => consumeHermesBudgetReceipt(r, { ...opts, argv: [...opts.argv, "--resume"] }), /process_changed/);
  assert.throws(() => consumeHermesBudgetReceipt(r, { ...opts, input: "{}" }), /input_changed/);
  const remaining = consumeHermesBudgetReceipt(r, opts);
  assert.ok(remaining() > 0);
  assert.throws(() => consumeHermesBudgetReceipt(r, opts), /reuse/);
  const another = assertProviderStartup(f.options).budgetReceipt;
  assert.throws(() => consumeHermesBudgetReceipt(another, opts), /reuse/);
});
test("counter metadata and policy fields cannot be injected through packet", t => {
  for (const key of ["physicalModelCalls", "toolCalls", "apiMaxRetries", "attemptBudgetReceipt", "cleanupMarginMs"])
    assert.throws(() => budgetFixture(t, f => { f.packet.contract.budgets[key] = 1; }));
});
test("missing controller proof is policy-blocked, explicit cancellation and timeout are distinct", () => {
  assert.equal(classifyHermesOutcome({ error: { durationLimit: true } }), "timed_out");
  assert.equal(classifyHermesOutcome({ error: { message: "hermes_quiet_cancelled" } }), "cancelled");
  assert.equal(classifyHermesOutcome({ error: { leaseLost: true } }), "policy_blocked");
  assert.equal(classifyHermesOutcome({ exitCode: 0, ownedTreeReceipt: { terminationReason: "root_exit" } }), "policy_blocked");
});

test("native harmless fixture records candidate result with real Job binding and rejects replay", { skip: process.platform !== "win32", timeout: 30000 }, async t => {
  const f = budgetFixture(t), opts = processOptions(f);
  // A compiled repository test fixture at a temporary standard-layout path;
  // no installed Hermes, Python loader, provider or model is executed.
  await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    ["/nologo", "/target:exe", "/platform:x64", `/out:${opts.executable}`, fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url))], { windowsHide: true });
  const result = await runHermesOwnedProcess({ ...opts, budgetReceipt: f.checked.budgetReceipt, remainingMs: () => 10000, assertAuthority() {} });
  assert.equal(result.outcome, "candidate_result"); assert.equal(result.reviewRequired, true);
  const r = result.attemptBudgetReceipt;
  assert.equal(r.outcome, "candidate_result"); assert.equal(r.ownedTreeReceipt.attempt, r.attemptId);
  assert.ok(r.wallTimeMs > 0); assert.equal(r.exitCode, 0);
  for (const counter of counters) assert.equal(r[counter], null);
  assert.ok(!JSON.stringify(r).includes("PID:")); assert.ok(!JSON.stringify(r).includes(f.root));
  await assert.rejects(runHermesOwnedProcess({ ...opts, budgetReceipt: f.checked.budgetReceipt, remainingMs: () => 10000, assertAuthority() {} }), /reuse/);
});

for (const outcome of ["timed_out", "cancelled", "process_failed"]) {
  test(`native budget ${outcome} keeps unknown counters and owns descendant cleanup`, { skip: process.platform !== "win32", timeout: 30000 }, async t => {
    const f = budgetFixture(t, f => { f.claimed.prompt = outcome === "process_failed" ? "owned budget failure fixture" : "owned budget tree fixture"; });
    const opts = processOptions(f);
    await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      ["/nologo", "/target:exe", "/platform:x64", `/out:${opts.executable}`, fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url))], { windowsHide: true });
    const abort = new AbortController();
    const timer = outcome === "cancelled" ? setTimeout(() => abort.abort(), 1500) : null;
    try {
      await assert.rejects(runHermesOwnedProcess({ ...opts, budgetReceipt: f.checked.budgetReceipt, signal: abort.signal,
        remainingMs: () => outcome === "timed_out" ? 4500 : 10000, assertAuthority() {} }), error => {
          assert.equal(error.outcome, outcome);
          const r = error.details.attemptBudgetReceipt;
          assert.equal(r.outcome, outcome); assert.equal(r.ownedTreeReceipt.cleanup, true); assert.equal(r.ownedTreeReceipt.activeProcesses, 0);
          assert.equal(r.ownedTreeReceipt.attempt, f.envelope.identity.executionId);
          for (const counter of counters) assert.equal(r[counter], null);
          return true;
        });
    } finally { clearTimeout(timer); }
  });
}

for (const mode of ["invalid-output", "stdout flood", "stderr flood"]) {
  test(`native budget ${mode} preserves terminal cleanup evidence without retry`, { skip: process.platform !== "win32", timeout: 30000 }, async t => {
    const f = budgetFixture(t, f => { f.claimed.prompt = `owned budget ${mode} fixture`; }), opts = processOptions(f);
    await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      ["/nologo", "/target:exe", "/platform:x64", `/out:${opts.executable}`, fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url))], { windowsHide: true });
    const run = () => runHermesOwnedProcess({ ...opts, budgetReceipt: f.checked.budgetReceipt, remainingMs: () => 10000, assertAuthority() {} });
    await assert.rejects(run(), error => {
      assert.equal(error.retryable, false);
      assert.notEqual(error.outcome, "candidate_result");
      if (mode === "invalid-output") assert.equal(error.message, "hermes_quiet_utf8_invalid");
      const r = error.details.attemptBudgetReceipt, job = r.ownedTreeReceipt;
      assert.ok(isWindowsJobCleanupReceipt(job));
      assert.equal(job.cleanup, true); assert.equal(job.activeProcesses, 0);
      assert.equal(job.attempt, f.envelope.identity.executionId);
      assert.equal(job.terminationReason, mode === "invalid-output" ? "preparation_failed" : "output_limit");
      assert.equal(error.details.ownedTreeReceipt, job);
      assert.equal(r.exitCode, job.rootExit);
      assert.ok(job.stdoutBytes <= 131072 && job.stderrBytes <= 32768);
      for (const pid of [job.rootPid, job.launcherPid]) assert.throws(() => process.kill(pid, 0));
      const serialized = JSON.stringify(error.details);
      for (const privateValue of [f.root, "PID:", "owned budget", "SYSTEMROOT"]) assert.ok(!serialized.includes(privateValue));
      assert.equal(isWindowsJobCleanupReceipt(JSON.parse(JSON.stringify(job))), false);
      return true;
    });
    await assert.rejects(run(), /reuse/);
  });
}
