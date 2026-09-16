import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, renameSync, symlinkSync, unlinkSync, existsSync } from "node:fs";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { nativeToolBlocker, nativeToolBlockers, nativeToolReceiptSchema, consumeNativeToolBoundary, completeNativeToolBoundary } from "./lib/agent-host-hermes-native-boundary.mjs";
import { captureNativeFootprint, compareNativeFootprint, physicalIdentity, createNativeOwnedTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";
import { assertTypedAuthority } from "./lib/agent-host-native-authority.mjs";
import { assertProviderNativeBoundary, prepareProviderInput, providerInputTransport } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch, prepareProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import { acquireApplicationLease, assertApplicationLease, releaseApplicationLease } from "./lib/agent-host-application-lease.mjs";
import { runHermesOwnedProcess } from "./lib/agent-host-hermes-quiet.mjs";
import { classifyHermesOutcome } from "./lib/agent-host-hermes-budget.mjs";

test("clean and existing dirty workspace, exact tools, private opaque receipt and still denied real launch", async t => {
  for (const dirty of [false, true]) {
    const f = await nativeFixture(t, { dirty, observer() { throw Error("edit task must not observe ports"); } });
    assert.equal(nativeToolReceiptSchema.safeParse(f.receipt).success, true);
    assert.equal(f.receipt.preExistingDirtyCount, dirty ? 1 : 0);
    assert.equal(f.receipt.processCoverage, "not_observed");
    assert.deepEqual(f.receipt.authorities, ["repository_read", "repository_write", "local_test"]);
    assert.deepEqual(f.checked.receipt.toolsets, ["file", "terminal"]);
    assert.equal(f.checked.candidate.environment.HERMES_WRITE_SAFE_ROOT, f.repositoryPath);
    assert.ok(f.envelope.rules.some(r => r.includes("Never use reset --hard")));
    assert.deepEqual(nativeToolBlockers([nativeToolBlocker, "other"], f.receipt, f.envelope), ["other"]);
    for (const fake of [{ ...f.receipt }, { ...f.receipt, authorities: [...f.receipt.authorities, "remote_push"] }])
      assert.deepEqual(nativeToolBlockers([nativeToolBlocker], fake, f.envelope), [nativeToolBlocker]);
    const rendered = JSON.stringify(f.receipt);
    for (const value of [f.root, "unrelated.txt", "editable.txt", "pre-existing dirty", "Fixture", "example.invalid", "rawOutput", "prompt"]) assert.ok(!rendered.includes(value));
    if (process.platform === "win32") {
      const plan = projectProviderLaunch(f.projection);
      assert.ok(!plan.blockers.includes(nativeToolBlocker)); assert.ok(plan.blockers.includes("hermes_public_launch_contract_unqualified"));
      f.f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: f.envelope.revisions.packet, contextRevision: f.envelope.revisions.context };
      assert.throws(() => prepareProviderLaunch(f.projection, f.options), /hermes_public_launch_contract_unqualified/);
    }
    assert.equal(readFileSync(path.join(f.repositoryPath, "unrelated.txt"), "utf8"), dirty ? "pre-existing dirty\n" : "original\n");
  }
});
for (const op of ["repository_read", "repository_write", "local_test"]) test(`missing ${op} blocks coding tools`, async t => {
  const f = await nativeFixture(t, { prepare: false, edit: f => { f.packet.contract.access.tools = f.packet.contract.access.tools.filter(v => v !== op); f.packet.contract.access.permissions = f.packet.contract.access.permissions.filter(v => v !== op); } });
  assert.throws(() => prepareProviderInput(f.options));
});
for (const op of ["local_commit", "remote_push", "deployment"]) test(`${op} is independent and never implicitly granted`, async t => {
  const f = await nativeFixture(t);
  assert.throws(() => assertTypedAuthority(f.envelope.contract.access, op), /not_authorized/);
  assert.doesNotThrow(() => assertTypedAuthority({ tools: [op], permissions: [op] }, op));
  assert.throws(() => assertTypedAuthority({ tools: [op], permissions: ["repository_write"] }, op));
});
for (const mutation of ["outside", "junction", "replacement", "extra-clone", "bare-clone", "worktree", "metadata", "dirty"]) test(`${mutation} fails closed without destructive rollback`, async t => {
  const f = await nativeFixture(t, { dirty: true });
  if (mutation === "outside") writeFileSync(path.join(f.repositoryPath, "unexpected.txt"), "outside declared paths");
  if (mutation === "junction") { mkdirSync(path.join(f.root, "foreign")); symlinkSync(path.join(f.root, "foreign"), path.join(f.repositoryPath, "link"), "junction"); }
  if (mutation === "replacement") { renameSync(f.repositoryPath, f.repositoryPath + "-original"); mkdirSync(f.repositoryPath); }
  if (mutation === "extra-clone") mkdirSync(path.join(f.repositoryPath, "copy", ".git"), { recursive: true });
  if (mutation === "bare-clone") { mkdirSync(path.join(f.repositoryPath, "output", "objects"), { recursive: true }); mkdirSync(path.join(f.repositoryPath, "output", "refs")); writeFileSync(path.join(f.repositoryPath, "output", "HEAD"), "ref: refs/heads/main"); }
  if (mutation === "worktree") mkdirSync(path.join(f.repositoryPath, ".git", "worktrees", "second"), { recursive: true });
  if (mutation === "metadata") writeFileSync(path.join(f.repositoryPath, ".git", "config"), "[core]\n bare = false\n");
  if (mutation === "dirty") writeFileSync(path.join(f.repositoryPath, "unrelated.txt"), "changed foreign data");
  assert.throws(() => assertProviderNativeBoundary(f.envelope));
  assert.deepEqual(nativeToolBlockers([nativeToolBlocker], f.receipt, f.envelope), [nativeToolBlocker]);
});
test("post footprint accepts scoped edits but detects ignored paths and preserves pre-existing dirty data", async t => {
  const f = await nativeFixture(t, { dirty: true });
  const before = captureNativeFootprint(f.repositoryPath, f.options.nativeBoundaryOptions.expected);
  writeFileSync(path.join(f.repositoryPath, "editable.txt"), "intended edit\n");
  let after = captureNativeFootprint(f.repositoryPath, f.options.nativeBoundaryOptions.expected);
  assert.deepEqual(compareNativeFootprint(before, after, ["editable.txt"]).violations, []);
  mkdirSync(path.join(f.repositoryPath, "unexpected-output"));
  writeFileSync(path.join(f.repositoryPath, "unexpected-output", "artifact"), "data");
  after = captureNativeFootprint(f.repositoryPath, f.options.nativeBoundaryOptions.expected);
  assert.deepEqual(compareNativeFootprint(before, after, ["editable.txt"]).violations, []);
  assert.equal(compareNativeFootprint(before, after, ["editable.txt"]).scopeReviewRequired, true);
  assert.equal(readFileSync(path.join(f.repositoryPath, "unrelated.txt"), "utf8"), "pre-existing dirty\n");
});
test("root aliases, ADS and escaping path forms cannot qualify", async t => {
  const f = await nativeFixture(t);
  for (const value of [f.repositoryPath + path.sep + "..", f.repositoryPath + ":stream", "\\\\host\\share", "\\\\?\\C:\\unknown"])
    assert.throws(() => physicalIdentity(value));
});
test("runtime lease rejects occupied/unknown ports and second application holder; edit lease needs no observation", async t => {
  let occupied = false;
  const f = await nativeFixture(t, { runtime: true, observer: () => occupied ? [{ port: 43127, pid: 1234, createdAt: new Date().toISOString() }] : [] });
  assert.throws(() => acquireApplicationLease({ writerLock: f.writerLock, applicationId: f.envelope.identity.applicationId,
    attempt: f.envelope.identity.executionId, runtime: { required: false, ports: [] } }), /lease_busy/);
  occupied = true; assert.throws(() => assertProviderNativeBoundary(f.envelope), /instance_busy/);
  occupied = false;
  const lease = acquireApplicationLease({ writerLock: f.writerLock, applicationId: "another-fixture", attempt: "fixture", runtime: { required: true, ports: [43128] }, observer: () => [] });
  assertApplicationLease(lease); releaseApplicationLease(lease);
  assert.throws(() => acquireApplicationLease({ writerLock: f.writerLock, applicationId: "unknown", attempt: "fixture", runtime: { required: true, ports: [43128] }, observer: () => { throw Error("unknown"); } }), /observation_required/);
});
test("temp cleanup requires genuine attempt marker and preserves unmarked foreign artifacts", async t => {
  const f = await nativeFixture(t), attempt = f.envelope.identity.executionId;
  const proof = createNativeOwnedTemp(f.root, attempt), temp = inspectNativeOwnedTemp(proof, attempt);
  mkdirSync(path.join(temp.root, "nested")); writeFileSync(path.join(temp.root, "nested", "owned.txt"), "owned");
  assert.throws(() => cleanupNativeOwnedTemp({}, attempt));
  assert.throws(() => cleanupNativeOwnedTemp(proof, "another-attempt"));
  assert.equal(cleanupNativeOwnedTemp(proof, attempt).remaining, 0); assert.equal(existsSync(temp.root), false);
  const unmarked = createNativeOwnedTemp(f.root, attempt), item = inspectNativeOwnedTemp(unmarked, attempt);
  writeFileSync(path.join(item.root, "foreign.txt"), "preserve"); unlinkSync(path.join(item.root, ".roost-attempt-owner"));
  assert.throws(() => cleanupNativeOwnedTemp(unmarked, attempt));
  assert.equal(readFileSync(path.join(item.root, "foreign.txt"), "utf8"), "preserve");
  const clone = createNativeOwnedTemp(f.root, attempt), cloneRoot = inspectNativeOwnedTemp(clone, attempt).root;
  mkdirSync(path.join(cloneRoot, ".git"));
  assert.throws(() => cleanupNativeOwnedTemp(clone, attempt), /extra_repository/);
  assert.equal(existsSync(path.join(cloneRoot, ".roost-attempt-owner")), true);
});
test("forged Job and widened receipts never become a completed candidate", async t => {
  const f = await nativeFixture(t), c = f.checked.candidate;
  const proof = consumeNativeToolBoundary(f.receipt, { cwd: c.cwd, environment: c.environment, attempt: f.envelope.identity.executionId, budgetReceipt: f.checked.budgetReceipt });
  const result = completeNativeToolBoundary(proof, { ownedTreeReceipt: { attempt: f.envelope.identity.executionId, cleanup: true } });
  assert.equal(result.classification, "boundary_violation"); assert.equal(result.releaseAllowed, false);
  assert.equal(classifyHermesOutcome({ error: { boundaryViolation: true, durationLimit: true }, exitCode: 0 }), "boundary_violation");
});
test("native harmless Job returns only review-required evidence; no Hermes code executes", { skip: process.platform !== "win32", timeout: 30000 }, async t => {
  const f = await nativeFixture(t, { dirty: true }), c = f.checked.candidate;
  execFileSync(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    ["/nologo", "/target:exe", "/platform:x64", `/out:${c.command}`, fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url))], { windowsHide: true });
  const result = await runHermesOwnedProcess({ executable: c.command, argv: c.args, cwd: c.cwd, environment: c.environment,
    input: providerInputTransport("hermes_codex", f.envelope).input, attempt: f.envelope.identity.executionId,
    remainingMs: () => 15000, assertAuthority() {}, budgetReceipt: f.checked.budgetReceipt, nativeToolReceipt: f.receipt });
  assert.equal(result.nativeToolReceipt.classification, "review_required");
  assert.equal(result.nativeToolReceipt.releaseAllowed, false);
  assert.equal(result.ownedTreeReceipt.activeProcesses, 0);
});

for (const kind of ["cancel", "timeout", "violation"]) test(`native policy ${kind} keeps cleanup and cannot become success`, { skip: process.platform !== "win32", timeout: 30000 }, async t => {
  const f = await nativeFixture(t, { edit: f => { f.claimed.prompt = "owned budget tree fixture"; } }), c = f.checked.candidate;
  execFileSync(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    ["/nologo", "/target:exe", "/platform:x64", `/out:${c.command}`, fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url))], { windowsHide: true });
  const abort = new AbortController();
  const timer = kind !== "timeout" ? setTimeout(() => {
    if (kind === "violation") writeFileSync(path.join(f.repositoryPath, ".git", "description"), "preserve evidence");
    abort.abort();
  }, 1800) : null;
  try {
    await assert.rejects(runHermesOwnedProcess({ executable: c.command, argv: c.args, cwd: c.cwd, environment: c.environment,
      input: providerInputTransport("hermes_codex", f.envelope).input, attempt: f.envelope.identity.executionId,
      remainingMs: () => kind === "timeout" ? 5000 : 15000, assertAuthority() {}, signal: abort.signal,
      budgetReceipt: f.checked.budgetReceipt, nativeToolReceipt: f.receipt }), error => {
        assert.equal(error.outcome, kind === "violation" ? "boundary_violation" : kind === "cancel" ? "cancelled" : "timed_out");
        assert.equal(error.details.nativeToolReceipt.classification, kind === "violation" ? "boundary_violation" : "policy_blocked");
        assert.equal(error.details.attemptBudgetReceipt.ownedTreeReceipt.activeProcesses, 0);
        assert.equal(error.details.nativeToolReceipt.releaseAllowed, false);
        return true;
      });
    if (kind === "violation") assert.equal(readFileSync(path.join(f.repositoryPath, ".git", "description"), "utf8"), "preserve evidence");
  } finally { clearTimeout(timer); }
});

test("v4 runner cannot omit native proof; candidate write-root/config drift and unknown authority reject", async t => {
  const f = await nativeFixture(t), c = f.checked.candidate;
  await assert.rejects(runHermesOwnedProcess({ budgetReceipt: f.checked.budgetReceipt }), /native_boundary_required/);
  assert.throws(() => consumeNativeToolBoundary(f.receipt, { cwd: c.cwd, environment: { ...c.environment, HERMES_WRITE_SAFE_ROOT: f.root },
    attempt: f.envelope.identity.executionId, budgetReceipt: f.checked.budgetReceipt }), /scope_changed/);
  const config = JSON.parse(readFileSync(f.provider.profile.profilePath)); config.lsp.enabled = true;
  writeFileSync(f.provider.profile.profilePath, JSON.stringify(config, null, 2) + "\n");
  assert.throws(() => assertProviderNativeBoundary(f.envelope), /startup_unproven/);
  assert.equal(nativeToolReceiptSchema.safeParse({ ...f.receipt, privatePath: f.root }).success, false);
});
