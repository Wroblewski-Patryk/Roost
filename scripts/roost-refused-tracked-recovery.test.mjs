import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { trustedPilotBytes } from "./lib/agent-host-trusted-pilot.mjs";
import { nativeDigest } from "./lib/agent-host-native-footprint.mjs";
import { runRefusedTrackedRecovery, validateRefusedRecoveryGrant, refusedRecoveryBinding,
  refusedRecoveryRequestSchema, refusedRecoveryScopeSchema } from "./roost-refused-tracked-recovery.mjs";

const executionId = "991ac287-d635-4d0c-a10c-b587e843c941";
const taskId = "73325299-afac-40ee-974b-de5c6c2b7f28";
const workspaceId = "7d0958bb-a32c-4b69-8342-917bd4b97327";
const applicationId = "c08f6c16-0ec5-4e8b-a4c1-17a9e2ba8705";
const requestId = "550d339d-4713-4c27-80f1-687331c70a01";
const installationId = "de56c42f-36b2-4201-bdf0-6b6ef65e0030";
const baselineCommit = "a".repeat(40), digest = "b".repeat(64);
const now = Date.parse("2026-10-04T01:00:00.000Z");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const installation = { installationId, workspaceId, authorityPublicKey: publicKey.export({ type: "spki", format: "pem" }),
  schemaVersion: "roost-trusted-provider-pilot-v1", qualification: "signed_native_v1" };
const privateChanges = [{ path: "web/src/App.tsx", category: "content", priorDigest: "a".repeat(64), currentDigest: digest }];
const scope = { schemaVersion: "roost-refused-tracked-rollback-v1", operation: "restore_task_changes",
  executionId, workspaceId, applicationId, taskId, attempt: 1, reviewDigest: digest, rootIdentity: digest,
  baselineCommit, taskBranchDigest: digest, baseBranchDigest: digest, originDigest: digest, writeScopeDigest: digest, changedScopeDigest: nativeDigest(privateChanges) };
const request = { schemaVersion: "roost-refused-tracked-recovery-request-v1", requestId, executionId,
  applicationSlug: "rendered-fixture", baselineCommit, taskBranch: `codex/task-${taskId}`, writePaths: ["web/src/App.tsx"] };
const payload = { schemaVersion: "roost-refused-tracked-recovery-admission-v1", operation: "restore_task_changes", requestId,
  installationId, firstWriteDecisionId: "41616a26-bc9e-41a7-a2d9-6b75c3f3c279", ownerUserId: "55c1e5ef-1e42-4663-a1a4-762c14558211",
  scope, issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 299000).toISOString() };
const signed = p => ({ payload: p, signature: sign(null, trustedPilotBytes(p), privateKey).toString("hex") });
const grant = signed(payload);
const binding = { request: { ...request, signed: grant }, installation, baseUrl: "https://runtime.example.invalid",
  options: { directory: "private-review", repositoryPath: "approved-checkout", baselineCommit, taskBranch: request.taskBranch,
    baseBranch: "main", origin: "https://example.invalid/RenderedFixture.git", writePaths: request.writePaths } };
const result = { schemaVersion: "roost-refused-tracked-rollback-v1", completed: true, replay: false, executionId,
  reviewDigest: digest, journalDigest: digest, archivedFileCount: 1, restoredFileCount: 1, baselineCommit,
  cleanBaseBranch: true, taskBranchRemoved: true, writerLeaseRetained: true, releaseAllowed: false,
  executionAuthorized: false, modelsInvoked: false, remoteEffects: false };
const args = overrides => ({ mode: "restore", binding, apiKey: "cc_v1_" + "x".repeat(32), now: () => now,
  inspect: async () => scope, rollback: async ({ assertOwnerAuthority }) => { await assertOwnerAuthority(scope); return result; },
  readReview: async () => ({ digest, payload: { privateChanges } }),
  exchange: async ({ receipt }) => receipt ? { recorded: true, receipt, replay: false } : { active: true, signed: grant }, ...overrides });

test("inspect derives scope without API, credential or rollback effects", async () => {
  const inspected = await runRefusedTrackedRecovery(args({ mode: "inspect", apiKey: undefined,
    binding: { ...binding, request }, exchange: () => assert.fail("API called"), rollback: () => assert.fail("rollback called") }));
  assert.deepEqual(inspected.scope, scope); assert.equal(inspected.installationId, installationId);
  assert.equal(JSON.stringify(inspected).includes("private-review"), false);
  assert.equal(JSON.stringify(inspected).includes("approved-checkout"), false);
  assert.equal(JSON.stringify(inspected).includes("authorityPublicKey"), false);
});
test("real Ed25519 exact owner scope validates and restore checks current status twice", async () => {
  let statusReads = 0, effects = 0;
  const answer = await runRefusedTrackedRecovery(args({ exchange: async ({ receipt }) => { if (receipt) return { recorded: true, receipt, replay: false }; statusReads++; return { active: true, signed: grant }; },
    rollback: async ({ assertOwnerAuthority }) => { await assertOwnerAuthority(scope); effects++; return result; } }));
  assert.equal(statusReads, 2); assert.equal(effects, 1); assert.equal(answer.receipt.completed, true);
  assert.equal(answer.nativeReconciliationRequired, true); assert.equal(answer.receipt.writerLeaseRetained, true);
});
for (const [name, mutate] of [
  ["changed signature", g => ({ ...g, signature: "0".repeat(128) })],
  ["another request", () => signed({ ...payload, requestId: taskId })],
  ["another installation", () => signed({ ...payload, installationId: taskId })],
  ["another scope", () => signed({ ...payload, scope: { ...scope, changedScopeDigest: "c".repeat(64) } })],
  ["expired", () => signed({ ...payload, expiresAt: new Date(now).toISOString() })],
  ["future issued", () => signed({ ...payload, issuedAt: new Date(now + 1).toISOString() })],
  ["over five minutes", () => signed({ ...payload, expiresAt: new Date(now + 300000).toISOString() })],
  ["hidden authorization", () => signed({ ...payload, executionAuthorized: true })],
]) test(`blocks ${name} before effects or API`, async () => {
  await assert.rejects(runRefusedTrackedRecovery(args({ binding: { ...binding, request: { ...request, signed: mutate(grant) } },
    exchange: () => assert.fail("API called"), rollback: () => assert.fail("effect called") })));
});
test("revocation between inspection and effect blocks restoration", async () => {
  let reads = 0, effects = 0;
  await assert.rejects(runRefusedTrackedRecovery(args({ exchange: async () => (++reads === 1 ? { active: true, signed: grant } : { active: false, signed: grant }),
    rollback: async ({ assertOwnerAuthority }) => { await assertOwnerAuthority(scope); effects++; return result; } })));
  assert.equal(effects, 0); assert.equal(reads, 2);
});
test("lease-independent recovery still rejects changed local scope at each boundary", async () => {
  let effects = 0;
  await assert.rejects(runRefusedTrackedRecovery(args({ rollback: async ({ assertOwnerAuthority }) => {
    await assertOwnerAuthority({ ...scope, reviewDigest: "c".repeat(64) }); effects++; return result; } })));
  assert.equal(effects, 0);
});
test("server substituted grant fails even with a valid signature", async () => {
  await assert.rejects(runRefusedTrackedRecovery(args({ exchange: async () => ({ active: true,
    signed: signed({ ...payload, ownerUserId: applicationId }) }), rollback: () => assert.fail("effect called") })));
});
test("expiry while awaiting server status fails before effect", async () => {
  let clock = now;
  await assert.rejects(runRefusedTrackedRecovery(args({ now: () => clock, exchange: async () => { clock += 300000; return { active: true, signed: grant }; },
    rollback: () => assert.fail("effect called") })));
});
test("wrong execution and task branch are blocked by derived scope", async () => {
  for (const updated of [{ ...scope, executionId: taskId }, { ...scope, taskId: executionId }]) {
    await assert.rejects(runRefusedTrackedRecovery(args({ inspect: async () => updated, rollback: () => assert.fail("effect called") })));
  }
});
test("forged completion flags and private extra fields cannot become public receipts", async () => {
  for (const updated of [{ ...result, writerLeaseRetained: false }, { ...result, executionAuthorized: true },
    { ...result, reviewDigest: "c".repeat(64) }, { ...result, rawArchive: "private source bytes" }]) {
    await assert.rejects(runRefusedTrackedRecovery(args({ rollback: async () => updated })));
  }
});
test("public authority reader rejects non-Ed25519 key", () => {
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.throws(() => validateRefusedRecoveryGrant(grant, { request, scope, now,
    installation: { ...installation, authorityPublicKey: rsa.publicKey.export({ type: "spki", format: "pem" }) } }));
});
for (const file of ["../App.tsx", "/App.tsx", "C:/App.tsx", "web\\App.tsx", ".git/config", "web//App.tsx", "web/./App.tsx", "web/App.tsx\n"]) {
  test(`rejects unsafe relative path ${JSON.stringify(file)}`, () => assert.equal(refusedRecoveryRequestSchema.safeParse({ ...request, writePaths: [file] }).success, false));
}
test("case-insensitive duplicated paths and arbitrary request config are rejected", () => {
  assert.equal(refusedRecoveryRequestSchema.safeParse({ ...request, writePaths: ["web/App.tsx", "web/app.tsx"] }).success, false);
  for (const extra of ["repositoryPath", "authorityPublicKey", "baseUrl", "ownerToken", "directory"]) {
    assert.equal(refusedRecoveryRequestSchema.safeParse({ ...request, [extra]: "untrusted" }).success, false);
  }
});
test("canonical installation mapping chooses checkout and journal, never supplied paths", () => {
  const config = { executionMode: "supervised", sandbox: "workspace-write", baseUrl: "https://runtime.example.invalid/",
    workspaceRoot: "C:\\Approved", repositories: { "rendered-fixture": { directory: "RenderedFixture", originUrl: "https://github.com/example/RenderedFixture.git", baseBranch: "main" } } };
  const bound = refusedRecoveryBinding(config, request, installation, "C:\\PrivateState");
  assert.equal(bound.options.taskBranch, request.taskBranch); assert.equal(bound.options.baseBranch, "main");
  assert.equal(bound.options.repositoryPath.endsWith("RenderedFixture"), true);
  assert.equal(bound.options.directory.endsWith(`native-review-${executionId}`), true);
  for (const baseUrl of ["http://runtime.example.invalid/", "https://owner:secret@runtime.example.invalid/", "https://runtime.example.invalid/path", "https://runtime.example.invalid/?token=x"]) {
    assert.throws(() => refusedRecoveryBinding({ ...config, baseUrl }, request, installation));
  }
});
test("PowerShell fixed recovery action inherits launcher mutex and gives WCM only to restore child", () => {
  const script = readFileSync(new URL("./roost-agent-host-windows.ps1", import.meta.url), "utf8");
  const recoveryAction = script.slice(script.indexOf("  'RecoverRefusedTracked' {"), script.indexOf("  'Handoff' {"));
  assert.match(recoveryAction, /Local\\Roost\.AgentHost\.Launcher/);
  assert.match(recoveryAction, /if \(\$RecoveryMode -eq 'restore'\)/);
  assert.match(recoveryAction, /EnvironmentVariables\['ROOST_AGENT_API_KEY'\] = \[RoostCredential\]::Read\('Roost\/AgentHost\/Supervised'\)/);
  assert.equal(recoveryAction.includes("roost-codex-agent-host.mjs"), false);
  assert.equal(recoveryAction.includes("Start-ScheduledTask"), false);
  assert.equal(recoveryAction.includes("leaseToken"), false);
  assert.match(recoveryAction, /RedirectStandardOutput = \$true/);
  assert.match(recoveryAction, /RedirectStandardError = \$true/);
  assert.equal(recoveryAction.indexOf("StandardOutput.ReadToEndAsync()") < recoveryAction.indexOf("$child.WaitForExit()"), true);
  assert.equal(recoveryAction.indexOf("StandardError.ReadToEndAsync()") < recoveryAction.indexOf("$child.WaitForExit()"), true);
  assert.match(recoveryAction, /\$recoveryOutput.Length -gt 65536 -or \$recoveryError.Length -gt 128/);
});
test("uncertain result POST reads persisted receipt before accepting success, without another effect or POST", async () => {
  let posts = 0, statusReads = 0, effects = 0;
  const answer = await runRefusedTrackedRecovery(args({ rollback: async ({ assertOwnerAuthority }) => {
    await assertOwnerAuthority(scope); effects++; return result; }, exchange: async ({ receipt }) => {
      if (receipt) { posts++; throw new Error("lost response"); }
      statusReads++; return { active: true, signed: grant, ...(statusReads > 2 ? { receipt: result } : {}) };
    } }));
  assert.equal(answer.recorded, true); assert.equal(posts, 1); assert.equal(statusReads, 3); assert.equal(effects, 1);
});
test("unconfirmed result POST never repeats source operations or POST", async () => {
  let posts = 0, effects = 0;
  await assert.rejects(runRefusedTrackedRecovery(args({ rollback: async () => { effects++; return result; },
    exchange: async ({ receipt }) => { if (receipt) { posts++; throw new Error("lost response"); } return { active: true, signed: grant }; } })),
    /refused_tracked_recovery_result_unconfirmed/);
  assert.equal(posts, 1); assert.equal(effects, 1);
});
test("already recorded disposition uses library verified replay and publishes nothing", async () => {
  let posts = 0;
  const answer = await runRefusedTrackedRecovery(args({ rollback: async () => ({ ...result, replay: true }),
    exchange: async ({ receipt }) => { if (receipt) { posts++; assert.fail("unexpected POST"); }
      return { active: true, signed: grant, receipt: result }; } }));
  assert.equal(posts, 0); assert.equal(answer.receipt.replay, true); assert.equal(answer.recorded, true);
});
test("recorded journal or effect count conflicts are rejected without publication", async () => {
  for (const receipt of [{ ...result, journalDigest: "c".repeat(64) }, { ...result, restoredFileCount: 2 }]) {
    await assert.rejects(runRefusedTrackedRecovery(args({ exchange: async ({ receipt: post }) => {
      assert.equal(post, undefined); return { active: true, signed: grant, receipt }; } })), /result_conflict/);
  }
});
test("result response cannot hide private fields in the published receipt", async () => {
  await assert.rejects(runRefusedTrackedRecovery(args({ exchange: async ({ receipt }) => receipt
    ? { recorded: true, receipt: { ...receipt, sourceBytes: "private" }, replay: false } : { active: true, signed: grant } })), /result_unconfirmed/);
});
test("recovery scope follows the library flat binding identity contract and rejects nested identity", () => {
  assert.equal(refusedRecoveryScopeSchema.safeParse(scope).success, true);
  const { executionId, workspaceId, taskId, applicationId, attempt, ...rest } = scope;
  assert.equal(refusedRecoveryScopeSchema.safeParse({ ...rest, identity: { executionId, workspaceId, taskId, applicationId, attempt } }).success, false);
});
test("inspection exposes actual changed paths separately from broader allowed write paths", async () => {
  const allowed = [...request.writePaths, "web/src/components/dashboard.tsx"];
  const answer = await runRefusedTrackedRecovery(args({ mode: "inspect", binding: { ...binding,
    request: { ...request, writePaths: allowed }, options: { ...binding.options, writePaths: allowed } } }));
  assert.deepEqual(answer.paths, ["web/src/App.tsx"]); assert.deepEqual(answer.writePaths, allowed);
  assert.equal(JSON.stringify(answer).includes("priorDigest"), false);
});
test("reread review drift or unapproved actual change names refuse inspection", async () => {
  for (const review of [{ digest: "c".repeat(64), payload: { privateChanges } },
    { digest, payload: { privateChanges: [{ path: "other.ts" }] } }]) {
    await assert.rejects(runRefusedTrackedRecovery(args({ mode: "inspect", readReview: async () => review })), /scope_changed/);
  }
});
