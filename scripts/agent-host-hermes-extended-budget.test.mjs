import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { managedSelectionFixture } from "./fixtures/trusted-pilot.mjs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { taskModelSelectionSchema, managedBackendSelectionSchema, managedExtendedBudgetPolicy } from "./lib/agent-host-model-policy.mjs";
import { renderHermesNativeProfile, hermesNativeProfileBinding, hermesProfileBindingSchema, hermesProfileTurnSetting,
  renderHermesBudgetProfile, hermesBudgetProfileBinding, hermesNativeProfileDigest, hermesBudgetProfileDigest } from "./lib/agent-host-hermes-profile.mjs";
import { createOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { prepareProviderInput, assertProviderStartup, providerInputTransport, abandonProviderNativeBoundary } from "./lib/agent-host-provider-input.mjs";
import { sealHermesBudget, assertHermesBudget, hermesBudgetReceiptSchema, assertHermesBudgetReceipt,
  consumeHermesBudgetReceipt, completeHermesBudgetReceipt } from "./lib/agent-host-hermes-budget.mjs";
import { hermesStartupReceiptSchema } from "./lib/agent-host-hermes-startup.mjs";

const selected = maxTurns => {
  const selection = managedSelectionFixture("codex_responses");
  selection.attemptPolicy = { ...selection.attemptPolicy, maxTurns, apiMaxRetries: 0, budgetPolicy: managedExtendedBudgetPolicy };
  return selection;
};
test("only explicit named low-risk Codex tier admits 25–48 turns; historical small tier retains 24 cap", () => {
  const original = managedSelectionFixture("codex_responses");
  assert.deepEqual(managedBackendSelectionSchema.parse(original), original);
  for (const maxTurns of [25, 32, 48]) assert.equal(taskModelSelectionSchema.safeParse(selected(maxTurns)).success, true);
  for (const maxTurns of [0, 1, 24, 49, 48.5, "48"]) assert.equal(taskModelSelectionSchema.safeParse(selected(maxTurns)).success, false);
  for (const budgetPolicy of [undefined, "coding-small-v1", "coding-large-v1"]) {
    const s = selected(48); s.attemptPolicy.budgetPolicy = budgetPolicy;
    assert.equal(taskModelSelectionSchema.safeParse(s).success, false);
  }
  for (const riskClass of ["medium", "high", "critical"]) assert.equal(taskModelSelectionSchema.safeParse({ ...selected(48), riskClass }).success, false);
  const ollama = managedSelectionFixture("ollama_loopback"); ollama.attemptPolicy = selected(48).attemptPolicy;
  assert.equal(taskModelSelectionSchema.safeParse(ollama).success, false);
  for (const patch of [{ fallback: "reserve" }, { auth: "api_key" }, { modelSelection: { model: "gpt-unknown", reasoningEffort: "medium" } }])
    assert.equal(taskModelSelectionSchema.safeParse({ ...selected(48), ...patch }).success, false);
  for (const patch of [{ restart: "retry" }, { unavailable: "fallback" }, { apiMaxRetries: 3 }, { wholeTaskRetries: 1 }])
    assert.equal(taskModelSelectionSchema.safeParse({ ...selected(48), attemptPolicy: { ...selected(48).attemptPolicy, ...patch } }).success, false);
});
test("exact extended profile bytes require explicit 48; existing 24 default digests and security settings stay fixed", () => {
  assert.equal(hermesNativeProfileBinding("synthetic/config.yaml").configDigest, hermesNativeProfileDigest);
  assert.equal(hermesBudgetProfileBinding("synthetic/config.yaml").configDigest, hermesBudgetProfileDigest);
  for (const apiMaxRetries of [0, 1, 2]) {
    for (const [render, bind] of [[renderHermesNativeProfile, hermesNativeProfileBinding], [renderHermesBudgetProfile, hermesBudgetProfileBinding]]) {
      const historical = JSON.parse(render({ apiMaxRetries })), extended = JSON.parse(render({ apiMaxRetries, maxTurns: 48 }));
      assert.equal(extended.agent.max_turns, 48); assert.equal(historical.agent.max_turns, 24);
      assert.equal(extended.agent.api_max_retries, apiMaxRetries);
      extended.agent.max_turns = 24; assert.deepEqual(extended, historical);
      const binding = bind("synthetic/config.yaml", { apiMaxRetries, maxTurns: 48 });
      assert.equal(hermesProfileBindingSchema.safeParse(binding).success, true);
      assert.equal(hermesProfileTurnSetting(binding.schemaVersion, binding.configDigest), 48);
      assert.notEqual(binding.configDigest, bind("synthetic/config.yaml", { apiMaxRetries }).configDigest);
    }
  }
  for (const maxTurns of [25, 47, 49, "48", null]) assert.throws(() => renderHermesNativeProfile({ maxTurns }), /turn_policy_invalid/);
});

async function prepared(t, { maxTurns = 48, configuredTurns = 48, selection = selected(maxTurns) } = {}) {
  let envelope;
  // Hooks execute in registration order: release the genuine synthetic lease
  // while its fixture still exists, before the fixture's final owned cleanup.
  t.after(() => { if (envelope) abandonProviderNativeBoundary(envelope); });
  const x = await nativeFixture(t, { prepare: false, edit: f => { f.packet.contract.modelSelection = selection; } });
  const file = x.provider.profile.profilePath, profile = hermesNativeProfileBinding(file, { apiMaxRetries: 0, maxTurns: configuredTurns });
  writeFileSync(file, renderHermesNativeProfile({ apiMaxRetries: 0, maxTurns: configuredTurns }));
  const owner = createOwnerAttestation(profile); profile.ownerAttestation = owner.binding;
  writeFileSync(path.join(path.dirname(file), "owner-attestation.json"), owner.bytes); x.provider.profile = profile;
  envelope = prepareProviderInput(x.options);
  const options = { provider: x.provider, envelope, repositoryPath: x.repositoryPath,
    startupEnvironment: x.options.startupEnvironment, sandbox: "workspace-write", platform: "win32" };
  return { x, envelope, options, checked: assertProviderStartup(options) };
}
test("full native coding startup binds explicit 48 profile/Ready/input/deadline/receipt and permits only one consumption", async t => {
  const f = await prepared(t), receipt = f.checked.budgetReceipt;
  assert.equal(receipt.policy, "coding-extended-v1"); assert.equal(receipt.maxTurns, 48); assert.equal(receipt.apiMaxRetries, 0);
  assert.equal(receipt.maxAttempts, 1); assert.equal(receipt.wholeTaskRetries, 0); assert.equal(receipt.automaticRestart, false);
  assert.equal(Date.parse(receipt.acceptedDeadline), Date.parse(f.x.f.claimed.startedAt) + f.envelope.contract.budgets.maxDurationSeconds * 1000);
  assert.equal(receipt.cleanupMarginMs, 5000); assert.equal(receipt.inputByteCap, 131072);
  assert.deepEqual(f.checked.candidate.args.slice(-4), ["--max-turns", "48", "--run-budget", String(receipt.runBudgetSeconds)]);
  assert.equal(JSON.parse(readFileSync(f.x.provider.profile.profilePath)).agent.max_turns, 48);
  assert.equal(hermesStartupReceiptSchema.safeParse(f.checked.receipt).success, true);
  assert.equal(hermesBudgetReceiptSchema.safeParse(receipt).success, true);
  assert.equal(receipt.configDigest, f.x.provider.profile.configDigest); assert.equal(receipt.readyRevision, f.envelope.revisions.ready);
  for (const field of ["physicalModelCalls", "toolCalls", "transportRetries", "inputTokens", "outputTokens", "totalTokens", "cost"])
    assert.equal(receipt[field], null);
  for (const forged of [structuredClone(receipt), { ...receipt, maxTurns: 49 }, { ...receipt, policy: "coding-small-v1" }])
    assert.throws(() => assertHermesBudgetReceipt(forged), /unproven/);
  assert.equal(hermesBudgetReceiptSchema.safeParse({ ...receipt, maxTurns: 49 }).success, false);
  assert.equal(hermesBudgetReceiptSchema.safeParse({ ...receipt, policy: "coding-small-v1" }).success, false);
  assert.equal(hermesBudgetReceiptSchema.safeParse({ ...receipt, configDigest: hermesNativeProfileBinding("synthetic/config.yaml", { apiMaxRetries: 0 }).configDigest }).success, false);
  assert.equal(hermesBudgetReceiptSchema.safeParse({ ...receipt, apiMaxRetries: 2 }).success, false);
  const input = providerInputTransport("hermes_codex", f.envelope).input;
  const options = { attempt: f.envelope.identity.executionId, input, executable: f.checked.candidate.command,
    argv: f.checked.candidate.args, cwd: f.checked.candidate.cwd, environment: f.checked.candidate.environment };
  assert.throws(() => consumeHermesBudgetReceipt(receipt, { ...options, argv: options.argv.map(v => v === "48" ? "49" : v) }), /process_changed/);
  const deadline = consumeHermesBudgetReceipt(receipt, options); assert.ok(deadline() > 0);
  assert.throws(() => consumeHermesBudgetReceipt(receipt, options), /reuse/);
  const completed = completeHermesBudgetReceipt(receipt, { wallTimeMs: 1, exitCode: 0 });
  assert.equal(completed.policy, "coding-extended-v1"); assert.equal(completed.maxTurns, 48);
  assert.equal(completed.outcome, "policy_blocked"); // No real process/Job ran in this startup test.
});
test("extended selection cannot use genuine 24 profile and small selection cannot use genuine 48 profile", async t => {
  await assert.rejects(prepared(t, { configuredTurns: 24 }), /hermes_startup_turn_policy_mismatch/);
  const selection = managedSelectionFixture("codex_responses"); selection.attemptPolicy.apiMaxRetries = 0;
  await assert.rejects(prepared(t, { configuredTurns: 48, selection }), /hermes_startup_turn_policy_mismatch/);
});
test("selected turn tier/count stay immutable after sealing and fixed duration cannot be enlarged", async t => {
  const f = await prepared(t), envelope = structuredClone(f.envelope);
  const seal = sealHermesBudget({ envelope, claimed: { ...f.x.f.claimed, checkpoint: undefined }, inputBytes: 100 });
  const expiry = assertHermesBudget(seal, envelope).acceptedDeadline;
  envelope.contract.modelSelection.attemptPolicy.maxTurns = 47;
  assert.throws(() => assertHermesBudget(seal, envelope), /budget_changed/);
  envelope.contract.modelSelection.attemptPolicy.maxTurns = 48;
  delete envelope.contract.modelSelection.attemptPolicy.budgetPolicy;
  assert.throws(() => assertHermesBudget(seal, envelope), /budget_invalid/);
  envelope.contract.modelSelection.attemptPolicy.budgetPolicy = "coding-extended-v1";
  assert.equal(assertHermesBudget(seal, envelope).acceptedDeadline, expiry);
  envelope.contract.budgets.maxDurationSeconds = 1801;
  assert.throws(() => sealHermesBudget({ envelope, claimed: { ...f.x.f.claimed, checkpoint: undefined }, inputBytes: 100 }), /budget_invalid/);
});
