import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { withHermesLaunchFixture, runQualifiedHermesFixture } from "./fixtures/hermes-launch.mjs";
import { collectHermesLaunchProofs, qualifyHermesLaunch, assertHermesLaunchAdmission, consumeHermesLaunchAdmission } from "./lib/agent-host-hermes-launch-admission.mjs";
import { projectProviderLaunch, prepareProviderLaunch, hermesContract } from "./lib/agent-host-provider-launch.mjs";
import { consumeHermesBudgetReceipt } from "./lib/agent-host-hermes-budget.mjs";
import { assertWindowsJobCapability } from "./lib/agent-host-windows-job.mjs";
import { assertProviderInputAvailable } from "./lib/agent-host-provider-input.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const windows = { skip: process.platform !== "win32" };
const digest = value => createHash("sha256").update(value).digest("hex");
const consume = x => {
  x.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: x.envelope.revisions.packet, contextRevision: x.envelope.revisions.context };
  return x.options;
};
async function setup(t, fixture, edit) {
  const x = await nativeFixture(t, { executablePath: fixture.executablePath, edit });
  const proofs = collectHermesLaunchProofs(x.projection, fixture.jobArtifact);
  return { ...x, proofs, receipt: qualifyHermesLaunch(x.projection, proofs) };
}

test("genuine same-attempt policy qualifies without activation or spawn; public projection remains closed", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), r = x.receipt;
    assert.equal(r.policyQualified, true); assert.equal(r.activationAuthorized, false); assert.equal(r.spawnStarted, false);
    assert.equal(r.installedExecutableVerified, false); assert.equal(r.authSessionObserved, false); assert.equal(r.futureCleanupProven, false);
    assert.equal(assertHermesLaunchAdmission(r, x.projection), r);
    const plan = projectProviderLaunch({ ...x.projection, jobArtifact: fixture.jobArtifact });
    assert.equal(plan.policyQualified, true); assert.equal(plan.command, null); assert.equal(plan.args, null);
    assert.deepEqual(plan.blockers, ["hermes_public_launch_contract_unqualified"]);
    assert.equal(projectProviderLaunch(x.projection).policyQualified, false);
    const report = contract.projectProvider({ kind: "hermes_codex", ...r, executionSupported: true });
    for (const field of ["implementationReady", "executionSupported", "pilotReady", "liveAdmissionAllowed", "pilotExecutionAuthorized", "pilotExecutionStarted"])
      { assert.equal(hermesContract[field], false, field); assert.notEqual(report[field], true, field); }
    const json = JSON.stringify(r);
    for (const value of [x.root, fixture.executablePath, x.f.claimed.taskId, x.f.packet.contract.objective, x.f.claimed.leaseToken].filter(Boolean)) assert.equal(json.includes(value), false);
    assert.ok(Object.isFrozen(r));
    assert.deepEqual(Object.keys(r).sort(), ["schemaVersion", "policyQualified", "activationAuthorized", "spawnStarted", "scope", "identityDigest",
      "readyRevision", "inputSeal", "stdinDigest", "startupDigest", "ownerAttestationDigest", "budgetDigest", "nativeBoundaryDigest", "launcherDigest",
      "launcherSourceDigest", "installedExecutableVerified", "authSessionObserved", "futureCleanupProven", "residualRiskPolicy", "digest"].sort());
    assert.throws(() => prepareProviderLaunch({ ...x.projection, launchAdmission: r, activationAuthorized: true }, consume(x)), /host_containment_admission_blocked/);
    assert.throws(() => assertHermesLaunchAdmission(r, x.projection));
    assert.throws(() => assertProviderInputAvailable(x.envelope));
    assert.throws(() => qualifyHermesLaunch(x.projection, x.proofs));
  });
});

test("each missing, serialized or unknown proof fails closed; JSON aggregate cannot survive restart", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture);
    for (const key of Object.keys(x.proofs)) {
      const missing = { ...x.proofs }; delete missing[key];
      assert.throws(() => qualifyHermesLaunch(x.projection, missing), /hermes_local_launch_admission_blocked/);
      assert.throws(() => qualifyHermesLaunch(x.projection, { ...x.proofs, [key]: structuredClone(x.proofs[key]) }), /hermes_local_launch_admission_blocked/);
    }
    assert.throws(() => qualifyHermesLaunch(x.projection, { ...x.proofs, activated: true }));
    assert.throws(() => assertHermesLaunchAdmission(JSON.parse(JSON.stringify(x.receipt)), x.projection));
    assert.throws(() => assertHermesLaunchAdmission({ ...x.receipt, activationAuthorized: true }, x.projection));
    assert.equal(assertHermesLaunchAdmission(x.receipt).policyQualified, true);
  });
});

test("foreign Ready/input/workspace/profile/task proofs cannot be combined", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), y = await setup(t, fixture, f => { f.claimed.prompt = "different task input"; });
    for (const key of ["owner", "startup", "budget", "native"])
      assert.throws(() => qualifyHermesLaunch(x.projection, { ...x.proofs, [key]: y.proofs[key] }), /hermes_local_launch_admission_blocked/);
    assert.throws(() => assertHermesLaunchAdmission(x.receipt, y.projection));
    for (const mutate of [
      o => { o.provider.commit = "a".repeat(40); }, o => { o.provider.version = "latest"; },
      o => { o.provider.profile = y.provider.profile; }, o => { o.provider.executablePath = y.provider.executablePath + ".other"; },
      o => { o.repositoryPath = y.repositoryPath; }, o => { o.startupEnvironment.HERMES_SAFE_MODE = "0"; },
      o => { o.sandbox = "danger-full-access"; }, o => { o.platform = "linux"; }
    ]) {
      const options = { ...x.projection, provider: structuredClone(x.provider), startupEnvironment: { ...x.projection.startupEnvironment } };
      mutate(options); assert.throws(() => assertHermesLaunchAdmission(x.receipt, options));
    }
    for (const mutate of [
      e => { e.identity.taskId = "00000000-0000-4000-8000-000000000001"; }, e => { e.identity.attempt = 2; },
      e => { e.identity.workspaceId = "00000000-0000-4000-8000-000000000001"; }, e => { e.revisions.ready = "a".repeat(64); },
      e => { e.contract.modelSelection.model = "gpt-6-astra"; }, e => { e.contract.modelSelection.reasoningEffort = "high"; },
      e => { e.contract.access.tools = ["repository_read"]; }, e => { e.contract.budgets.maxDurationSeconds = 900; }
    ]) {
      const envelope = structuredClone(x.envelope); mutate(envelope);
      assert.throws(() => qualifyHermesLaunch({ ...x.projection, envelope }, x.proofs));
    }
  });
});

test("expiry, profile drift, footprint drift and binary replacement invalidate the final aggregate", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), now = Date.now;
    try { Date.now = () => now() + 61000; assert.throws(() => assertHermesLaunchAdmission(x.receipt)); }
    finally { Date.now = now; }
    for (const file of [x.provider.profile.profilePath, path.join(x.repositoryPath, "editable.txt"), fixture.jobArtifact.executable]) {
      const bytes = readFileSync(file);
      try { writeFileSync(file, Buffer.concat([bytes, Buffer.from("drift")])); assert.throws(() => assertHermesLaunchAdmission(x.receipt)); }
      finally { writeFileSync(file, bytes); }
    }
    assertWindowsJobCapability(fixture.jobArtifact);
  });
});

test("budget consumption cannot be hidden by minting another admission or receipt", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), c = x.checked.candidate;
    consumeHermesBudgetReceipt(x.proofs.budget, { attempt: x.envelope.identity.executionId, input: JSON.stringify(x.envelope),
      executable: c.command, argv: c.args, cwd: c.cwd, environment: c.environment });
    assert.throws(() => assertHermesLaunchAdmission(x.receipt));
    assert.throws(() => qualifyHermesLaunch(x.projection, collectHermesLaunchProofs(x.projection, fixture.jobArtifact)));
  });
});

test("changed original deadline or current task authority burns the handoff before spawn", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), consumption = consume(x);
    consumption.claimed.startedAt = new Date(Date.parse(consumption.claimed.startedAt) - 1000).toISOString();
    assert.throws(() => consumeHermesLaunchAdmission(x.receipt, x.projection, consumption));
    assert.throws(() => consumeHermesLaunchAdmission(x.receipt, x.projection, consumption));
    assert.throws(() => assertProviderInputAvailable(x.envelope));
  });
});

test("profile drift at the final authority check after footprint work prevents spawn", windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture), consumption = consume(x), file = x.provider.profile.profilePath;
    const bytes = readFileSync(file); let calls = 0;
    consumption.assertAuthority = () => { if (++calls === 4) writeFileSync(file, Buffer.concat([bytes, Buffer.from("drift")])); };
    try {
      await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption, activation: fixture.activation }), error => {
        assert.ok(calls >= 4);
        assert.equal(error.details?.attemptBudgetReceipt?.ownedTreeReceipt, null);
        assert.ok(error.protocolAdmission); return true;
      });
    } finally { writeFileSync(file, bytes); }
  });
});

test("only opaque fixed-fixture activation can start; exact stdin argv environment cwd enter the real Job", windows, async t => {
  let ownedRoot;
  await withHermesLaunchFixture(async fixture => {
    ownedRoot = path.dirname(fixture.jobArtifact.executable);
    const x = await setup(t, fixture, f => { f.claimed.prompt = "owned admission echo fixture Żółw"; });
    for (const activation of [true, { activationAuthorized: true }, structuredClone(fixture.activation)])
      await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption: consume(x), activation }), /harmless_fixture_activation_denied/);
    await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt,
      options: { ...x.projection, provider: { ...x.provider, executablePath: "C:\\Fictional\\Installed\\hermes.exe" } },
      consumption: consume(x), activation: fixture.activation }), /harmless_fixture_activation_denied/);
    const original = readFileSync(fixture.executablePath);
    try {
      writeFileSync(fixture.executablePath, Buffer.concat([original, Buffer.from("drift")]));
      await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption: consume(x), activation: fixture.activation }), /harmless_fixture_activation_denied/);
    } finally { writeFileSync(fixture.executablePath, original); }
    const result = await runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption: consume(x), activation: fixture.activation });
    const c = x.checked.candidate;
    const env = Object.entries(c.environment).map(([k, v]) => `${k}=${v}`).sort().join("\0");
    assert.deepEqual(result.finalResponse.match(/DELIVERY:([a-f0-9:]+)/)?.[1].split(":"),
      [JSON.stringify(x.envelope), c.args.join("\0"), c.cwd, env].map(digest));
    assert.deepEqual(result.admission, { policyQualified: true, activationAuthorized: true, spawnStarted: true, scope: "harmless_fixture_only", qualificationDigest: x.receipt.digest });
    assert.equal(result.ownedTreeReceipt.attempt, x.envelope.identity.executionId);
    assert.equal(result.ownedTreeReceipt.launcherSha256, x.receipt.launcherDigest);
    assert.equal(result.ownedTreeReceipt.assignedBeforeResume, true); assert.equal(result.ownedTreeReceipt.activeProcesses, 0);
    assert.equal(result.nativeToolReceipt.classification, "review_required");
    await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption: consume(x), activation: fixture.activation }));
  });
  assert.equal(existsSync(ownedRoot), false);
});

for (const reason of ["cancel", "timeout", "controller_shutdown"]) test(`qualified fixture ${reason} cleans its Job and produces no success`, windows, async t => {
  await withHermesLaunchFixture(async fixture => {
    const x = await setup(t, fixture, f => { f.claimed.prompt = "owned budget tree fixture"; }), controller = new AbortController();
    let stopped = false;
    // Exercise stopping an assigned Job. Preparation now includes the durable
    // Ready proof; a wall timer started before it can cancel without any Job.
    let timer;
    try {
      await assert.rejects(runQualifiedHermesFixture({ receipt: x.receipt, options: x.projection, consumption: consume(x), activation: fixture.activation,
        onAssigned: () => { if (reason !== "timeout") timer = setTimeout(() => { stopped = true; controller.abort(); }, 1400); },
        signal: reason === "cancel" ? controller.signal : undefined,
        remainingMs: reason === "timeout" ? () => 3400 : () => 15000,
        shutdownRequested: reason === "controller_shutdown" ? () => stopped : undefined }), error => {
        const job = error.details?.attemptBudgetReceipt?.ownedTreeReceipt;
        assert.ok(job); assert.equal(job.cleanup, true); assert.equal(job.activeProcesses, 0);
        assert.equal(job.attempt, x.envelope.identity.executionId);
        assert.equal(error.details.nativeToolReceipt.classification, "policy_blocked"); return true;
      });
    } finally { clearTimeout(timer); }
  });
});
