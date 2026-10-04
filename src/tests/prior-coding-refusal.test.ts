import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { workerTicketPrincipal } from "../auth/worker-ticket-principal";
import { priorCodingRefusal, priorCodingRefusalInput } from "../modules/agent-runtime/prior-coding-refusal";

function fixture() {
  const now = new Date("2026-10-04T03:00:00.000Z"), workspaceId = randomUUID(), taskId = randomUUID(), applicationId = randomUUID(), hostId = randomUUID();
  const credential: any = { id: randomUUID(), workspaceId, active: true, revokedAt: null, boundAgentId: null, key: null,
    keyHash: "synthetic-authenticated-key-hash", credentialVersion: 1, workerHostId: hostId, workerInstallationId: randomUUID(),
    workerBindingEpoch: 1, expiresAt: new Date(now.getTime() + 60000), scopes: ["agent-runtime:claim"] };
  const auth: any = { authType: "api_key", workspaceId, apiKeyId: credential.id, workerTicketIdentity: workerTicketPrincipal(credential, now) };
  const contract = { nativeBoundary: { profile: "coding-local" }, singleTask: { branch: `codex/task-${taskId}` },
    secretInternalPrompt: "NEVER_RETURN_SOURCE_PROMPT", providerConfiguration: { secret: "NEVER_RETURN_CONFIGURATION" } };
  const pin = { riskAdmissionCommit: "a".repeat(40), revision: "b".repeat(64), pinId: randomUUID(), secret: "NEVER_RETURN_PIN_EXTRAS" };
  const common = { workspaceId, taskId, applicationId, agentHostId: hostId, attempt: 1, contextInvalidatedAt: null, cancelRequestedAt: null,
    summary: null, finalResponse: null, changedFiles: [], verification: {}, metadata: { executionContract: contract, readyContextPin: pin } };
  const prior: any = { ...structuredClone(common), id: randomUUID(), status: "failed", completedAt: new Date(now.getTime() - 10000),
    leaseToken: null, leaseExpiresAt: null,
    checkpoint: { schemaVersion: "roost-recovery-v1", stage: "spawn_intent", sessionId: randomUUID(), packetRevision: "c".repeat(64),
      workspaceDigest: "d".repeat(64), contextRevision: pin.revision, branch: contract.singleTask.branch, headCommit: pin.riskAdmissionCommit },
    errorState: { code: "agent_native_review_blocked", retryable: false, details: { nativeReviewReceiptDigest: "e".repeat(64),
      secret: "NEVER_RETURN_FAILURE_EXTRAS", nativeReviewReceipt: {
        version: "roost-native-review-public-v2", policy: "roost-root-scoped-coding-v2", bindingDigest: "f".repeat(64),
        preFootprintDigest: "1".repeat(64), postFootprintDigest: "1".repeat(64), jobDigest: "2".repeat(64),
        changedPathIds: [], categoryCounts: { content: 0, protected: 0 }, scopeReviewRequired: false, refusalCode: null,
        violations: [], verdict: "verification_blocked", reviewRequired: true, releaseAllowed: false, verification: "REFUSED", installation: "PASS"
      } } } };
  const current: any = { ...structuredClone(common), id: randomUUID(), status: "claimed", completedAt: null,
    leaseToken: randomUUID(), leaseExpiresAt: new Date(now.getTime() + 60000), errorState: null,
    checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: randomUUID(), packetRevision: null, workspaceDigest: null } };
  current.metadata.predecessorExecutionId = prior.id;
  const host: any = { id: hostId, workspaceId, status: "active" }, head: any = { installationId: credential.workerInstallationId };
  const queries: any[] = [];
  const db: any = {
    apiKey: { findUnique: async ({ where }: any) => where.id === credential.id ? credential : null },
    trustedProviderTicketKey: { findUnique: async ({ where }: any) => where.workspaceId === workspaceId ? head : null },
    agentHost: { findFirst: async ({ where }: any) => host.id === where.id && host.workspaceId === where.workspaceId && host.status !== "disabled" ? host : null },
    agentExecution: { findFirst: async ({ where, select }: any) => {
      queries.push({ where, select });
      return [current, prior].find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null;
    } }
  };
  return { now, auth, credential, current, prior, host, head, queries, db,
    call: (raw: unknown = { leaseToken: current.leaseToken }) => priorCodingRefusal(db, auth, current.id, raw, now) };
}

test("strict request accepts only current lease token, never a caller-selected predecessor", () => {
  assert.equal(priorCodingRefusalInput.safeParse({ leaseToken: randomUUID() }).success, true);
  for (const raw of [{}, null, { leaseToken: "invalid" }, { leaseToken: randomUUID(), predecessorExecutionId: randomUUID() },
    { leaseToken: randomUUID(), prompt: "source" }]) assert.equal(priorCodingRefusalInput.safeParse(raw).success, false);
});
test("actual worker principal and live claimed lease return only the explicitly scoped unchanged refusal", async () => {
  const f = fixture(), before = structuredClone({ current: f.current, prior: f.prior }), result = await f.call();
  assert.ok("data" in result, JSON.stringify(result));
  if (!("data" in result)) return;
  assert.equal(result.data.id, f.prior.id); assert.equal(result.data.status, "failed");
  assert.deepEqual(result.data.metadata, { executionContract: { nativeBoundary: { profile: "coding-local" }, singleTask: { branch: f.prior.checkpoint.branch } },
    readyContextPin: { riskAdmissionCommit: f.prior.checkpoint.headCommit, revision: f.prior.metadata.readyContextPin.revision } });
  assert.deepEqual(result.data.errorState.details.nativeReviewReceipt, f.prior.errorState.details.nativeReviewReceipt);
  assert.equal(Object.keys(result.data.checkpoint).sort().join(), "branch,headCommit,stage");
  for (const forbidden of ["NEVER_RETURN", f.current.leaseToken, f.credential.keyHash, "sessionId", "providerConfiguration", "pinId"])
    assert.ok(!JSON.stringify(result).includes(forbidden), forbidden);
  assert.deepEqual({ current: f.current, prior: f.prior }, before);
  assert.equal(f.queries.length, 2); assert.deepEqual(f.queries[1].where,
    { id: f.prior.id, workspaceId: f.current.workspaceId, taskId: f.current.taskId, applicationId: f.current.applicationId, agentHostId: f.current.agentHostId });
  assert.equal(f.queries.every(q => !q.select.prompt), true);
});
test("JSONB field ordering is normalized to the exact native receipt serialization for local HMAC comparison", async () => {
  const f = fixture(), native = JSON.stringify(f.prior.errorState.details.nativeReviewReceipt);
  const receipt = f.prior.errorState.details.nativeReviewReceipt;
  receipt.categoryCounts = Object.fromEntries(Object.entries(receipt.categoryCounts).reverse());
  f.prior.errorState.details.nativeReviewReceipt = Object.fromEntries(Object.entries(receipt).reverse());
  assert.notEqual(JSON.stringify(f.prior.errorState.details.nativeReviewReceipt), native);
  const result = await f.call(); assert.ok("data" in result);
  if ("data" in result) assert.equal(JSON.stringify(result.data.errorState.details.nativeReviewReceipt), native);
});

const changes: Record<string, (f: ReturnType<typeof fixture>) => void> = {
  "user credential": f => { f.auth.authType = "user"; }, "agent alias": f => { f.auth.agentId = randomUUID(); },
  "user alias": f => { f.auth.userId = randomUUID(); }, "missing worker identity": f => { delete f.auth.workerTicketIdentity; },
  "expired credential": f => { f.credential.expiresAt = f.now; }, "revoked credential": f => { f.credential.revokedAt = f.now; },
  "credential version changed": f => { f.credential.credentialVersion++; }, "binding epoch changed": f => { f.credential.workerBindingEpoch++; },
  "foreign workspace principal": f => { f.auth.workspaceId = randomUUID(); }, "foreign host principal": f => { f.auth.workerTicketIdentity.hostId = randomUUID(); },
  "disabled host": f => { f.host.status = "disabled"; }, "installation changed": f => { f.head.installationId = randomUUID(); },
  "current execution foreign host": f => { f.current.agentHostId = randomUUID(); }, "current execution foreign workspace": f => { f.current.workspaceId = randomUUID(); },
  "current attempt changed": f => { f.current.attempt = 2; }, "expired claim": f => { f.current.leaseExpiresAt = f.now; },
  "missing lease": f => { f.current.leaseToken = null; }, "completed current": f => { f.current.completedAt = f.now; },
  "cancelled current": f => { f.current.cancelRequestedAt = f.now; }, "invalidated current": f => { f.current.contextInvalidatedAt = f.now; },
  "queued current": f => { f.current.status = "queued"; }, "current checkpoint progressed": f => { f.current.checkpoint.stage = "spawn_intent"; },
  "current native profile changed": f => { f.current.metadata.executionContract.nativeBoundary.profile = "inspect-readonly"; },
  "current branch changed": f => { f.current.metadata.executionContract.singleTask.branch = "codex/other"; },
  "missing explicit predecessor": f => { delete f.current.metadata.predecessorExecutionId; },
  "self predecessor": f => { f.current.metadata.predecessorExecutionId = f.current.id; },
  "missing prior": f => { f.current.metadata.predecessorExecutionId = randomUUID(); },
  "foreign prior task": f => { f.prior.taskId = randomUUID(); }, "foreign prior workspace": f => { f.prior.workspaceId = randomUUID(); },
  "foreign prior app": f => { f.prior.applicationId = randomUUID(); }, "foreign prior host": f => { f.prior.agentHostId = randomUUID(); },
  "nonterminal prior": f => { f.prior.status = "running"; }, "prior attempt changed": f => { f.prior.attempt = 2; },
  "missing terminal time": f => { f.prior.completedAt = null; }, "future terminal time": f => { f.prior.completedAt = new Date(f.now.getTime() + 1); },
  "live prior lease": f => { f.prior.leaseToken = randomUUID(); }, "prior lease expiry retained": f => { f.prior.leaseExpiresAt = f.now; },
  "invalidated prior": f => { f.prior.contextInvalidatedAt = f.now; }, "cancelled prior": f => { f.prior.cancelRequestedAt = f.now; },
  "prior final response": f => { f.prior.finalResponse = "candidate"; }, "prior summary": f => { f.prior.summary = "candidate"; },
  "prior changed files": f => { f.prior.changedFiles = ["source.ts"]; }, "prior result revision": f => { f.prior.metadata.resultRevision = {}; },
  "prior verification": f => { f.prior.verification = { passed: true }; },
  "wrong prior profile": f => { f.prior.metadata.executionContract.nativeBoundary.profile = "inspect-readonly"; },
  "wrong prior branch": f => { f.prior.checkpoint.branch = "codex/other"; }, "wrong prior head": f => { f.prior.checkpoint.headCommit = "e".repeat(40); },
  "wrong prior risk commit": f => { f.prior.metadata.readyContextPin.riskAdmissionCommit = "e".repeat(40); },
  "invalid Ready revision": f => { f.prior.metadata.readyContextPin.revision = "invalid"; },
  "missing context revision": f => { f.prior.checkpoint.contextRevision = null; },
  "wrong prior checkpoint": f => { f.prior.checkpoint.stage = "effect_possible"; },
  "wrong failure code": f => { f.prior.errorState.code = "agent_execution_failed"; },
  "retryable predecessor": f => { f.prior.errorState.retryable = true; },
  "invalid review digest": f => { f.prior.errorState.details.nativeReviewReceiptDigest = "invalid"; },
  "missing review": f => { delete f.prior.errorState.details.nativeReviewReceipt; },
  "different footprint": f => { f.prior.errorState.details.nativeReviewReceipt.postFootprintDigest = "e".repeat(64); },
  "wrong verdict": f => { f.prior.errorState.details.nativeReviewReceipt.verdict = "verified_candidate"; },
  "wrong verification": f => { f.prior.errorState.details.nativeReviewReceipt.verification = "PASS"; },
  "failed installation": f => { f.prior.errorState.details.nativeReviewReceipt.installation = "BLOCKED"; },
  "scope review": f => { f.prior.errorState.details.nativeReviewReceipt.scopeReviewRequired = true; },
  "release allowed": f => { f.prior.errorState.details.nativeReviewReceipt.releaseAllowed = true; },
  "public violation": f => { f.prior.errorState.details.nativeReviewReceipt.violations = ["boundary_violation"]; },
  "public changed path": f => { f.prior.errorState.details.nativeReviewReceipt.changedPathIds = ["e".repeat(64)]; },
  "nonzero category": f => { f.prior.errorState.details.nativeReviewReceipt.categoryCounts.content = 1; },
  "capture failure": f => { f.prior.errorState.details.nativeReviewReceipt.refusalCode = "capture_failed"; },
  "unknown public receipt fields": f => { f.prior.errorState.details.nativeReviewReceipt.secret = "private"; }
};
for (const [name, change] of Object.entries(changes)) test(`prior coding refusal denies ${name} without writes or predecessor disclosure`, async () => {
  const f = fixture(); change(f);
  const before = structuredClone({ current: f.current, prior: f.prior }), result = await f.call();
  assert.ok("error" in result, name); assert.ok(!("data" in result));
  assert.deepEqual({ current: f.current, prior: f.prior }, before);
  if ("error" in result) assert.ok([403, 404, 409].includes(result.status));
});
test("another lease and caller supplied predecessor are refused", async () => {
  const f = fixture();
  const wrongLease = await f.call({ leaseToken: randomUUID() });
  assert.ok("error" in wrongLease);
  if ("error" in wrongLease) assert.equal(wrongLease.error, "prior_coding_refusal_not_pinned");
  const extraId = await f.call({ leaseToken: f.current.leaseToken, predecessorExecutionId: f.prior.id });
  assert.ok("error" in extraId);
  if ("error" in extraId) assert.equal(extraId.error, "prior_coding_refusal_invalid_request");
});
