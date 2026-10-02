import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { completedResultBasisEligibility, completedResultBasisSchema, effectiveCompletedResult,
  revalidateCompletedResultBasis } from "../modules/agent-runtime/completed-result-basis";

function candidate() {
  const id = randomUUID(), taskId = randomUUID(), hostId = randomUUID(), applicationId = randomUUID();
  const digest = "a".repeat(64), branch = `codex/task-${taskId}`, baseline = "b".repeat(40);
  const contract = { nativeBoundary: { profile: "coding-local" }, singleTask: { branch },
    context: { company: [{ id: randomUUID(), revision: "2026-10-01T12:00:00.000Z" }] },
    scope: { allowed: ["release.json"], forbidden: ["push"] },
    assignment: { agentId: randomUUID() }, taskRoles: { verifier: { id: randomUUID(), revision: "1" } },
    modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" } };
  const nativeToolReceipt = { footprintPolicy: "roost-root-scoped-coding-v2", scopeReviewRequired: false,
    policyVersion: "roost-hermes-native-audited-coding-v1", ownerRiskReference: "ADR-004-v7-native-tools",
    authorityProfile: "coding-local", authorities: ["repository_read", "repository_write", "local_test"],
    toolsets: ["file", "terminal"], classification: "review_required", releaseAllowed: false,
    reviewRequired: true, violations: [], postFootprintDigest: digest, jobReceiptDigest: digest };
  const verification = { codingTests: { passed: true },
    managedAdmission: { qualification: "signed_native_v1", evidenceDigest: digest, jobSourceDigest: digest },
    ownedTreeReceipt: { cleanup: true, activeProcesses: 0, attempt: id }, nativeToolReceipt,
    nativeReviewReceiptDigest: digest, nativeReviewReceipt: { version: "roost-native-review-public-v2",
      policy: "roost-root-scoped-coding-v2", verdict: "verified_candidate", verification: "PASS", installation: "PASS",
      reviewRequired: true, releaseAllowed: false, scopeReviewRequired: false, violations: [],
      postFootprintDigest: digest, jobDigest: digest } };
  const execution: any = { id, taskId, agentHostId: hostId, applicationId, attempt: 1, checkpointVersion: 3,
    status: "completed", completedAt: new Date("2026-10-01T12:05:00.000Z"), prompt: "Change only the test release", baseBranch: "main",
    metadata: { executionContract: contract, readyContextPin: { pinId: randomUUID(), revision: digest, riskAdmissionCommit: baseline },
      resultRevisionReviewVersion: "1", resultRevision: { schemaVersion: "roost-result-revision-v1", id: randomUUID(),
        commit: "c".repeat(40), branch, workingTree: "clean", executionId: id, attempt: 1, hostId,
        checkpointVersion: 3, observedAt: "2026-10-01T12:05:00.000Z" } }, verification };
  const pin: any = { status: "ready", pinId: randomUUID(), revision: "d".repeat(64), validatedAt: "2026-10-01T12:10:00.000Z",
    applicationId, contract: structuredClone(contract), prompt: execution.prompt, baseBranch: "main", riskAdmissionCommit: baseline };
  return { execution, pin };
}

test("fresh basis can reuse unchanged native code and tests without changing original evidence", () => {
  const { execution, pin } = candidate(), original = structuredClone(execution);
  assert.equal(completedResultBasisEligibility(execution, pin), null);
  assert.deepEqual(execution, original);
});
for (const [name, mutate] of Object.entries<Record<string, any>>({
  "dirty revision": { revision: { workingTree: "dirty" } },
  "different checkpoint": { revision: { checkpointVersion: 2 } },
  "different host": { revision: { hostId: randomUUID() } },
  "unproven tests": { verification: { codingTests: { passed: false } } },
  "live native descendants": { verification: { ownedTreeReceipt: { cleanup: false, activeProcesses: 1 } } },
  "unsigned admission": { verification: { managedAdmission: { qualification: "unsigned" } } },
  "negative review": { verification: { nativeReviewReceipt: { verdict: "boundary_violation" } } },
  "incomplete execution": { execution: { status: "running" } },
  "invalidated execution": { execution: { contextInvalidatedAt: new Date() } }
})) {
  test(`native ${name} cannot be revalidated into review or release authority`, () => {
    const { execution, pin } = candidate();
    Object.assign(execution, mutate.execution);
    Object.assign(execution.metadata.resultRevision, mutate.revision);
    Object.assign(execution.verification, mutate.verification);
    assert.equal(completedResultBasisEligibility(execution, pin), "completed_result_native_unproven");
  });
}
for (const [name, change] of Object.entries({
  "context reference revision": (p: any) => { p.contract.context.company[0].revision = "2026-10-01T12:11:00.000Z"; },
  "independent reviewer": (p: any) => { p.contract.taskRoles.verifier.id = randomUUID(); },
  "write scope": (p: any) => { p.contract.scope.allowed.push("app.mjs"); },
  "prompt": (p: any) => { p.prompt = "Do more work"; },
  "Git base": (p: any) => { p.baseBranch = "another-base"; },
  "admitted baseline": (p: any) => { p.riskAdmissionCommit = "f".repeat(40); },
  "application": (p: any) => { p.applicationId = randomUUID(); }
})) {
  test(`changed ${name} requires new work, not completed-basis revalidation`, () => {
    const { execution, pin } = candidate(); change(pin);
    assert.equal(completedResultBasisEligibility(execution, pin), "completed_result_intent_changed");
  });
}
test("historical or same Ready pin cannot be relabeled as fresh owner validation", () => {
  const { execution, pin } = candidate();
  for (const changes of [{ validatedAt: "2026-10-01T12:00:00Z" }, { validatedAt: "unknown" },
    { pinId: execution.metadata.readyContextPin.pinId }]) {
    assert.equal(completedResultBasisEligibility(execution, { ...pin, ...changes }), "completed_result_fresh_ready_required");
  }
});
test("request admits only exact versions, commit and Ready identity without code or review effects", () => {
  const valid = { requestId: randomUUID(), expectedVersion: "a".repeat(64), materialVersion: "b".repeat(64),
    readyPinId: randomUUID(), readyRevision: "c".repeat(64), commit: "d".repeat(40) };
  assert.equal(completedResultBasisSchema.safeParse(valid).success, true);
  for (const change of [{ commit: "main" }, { materialVersion: "unknown" }, { executionContract: {} },
    { files: ["app.mjs"] }, { decision: "approve" }]) {
    assert.equal(completedResultBasisSchema.safeParse({ ...valid, ...change }).success, false);
  }
});
test("agent credentials cannot issue completed-basis owner provenance", async () => {
  const db = { workspaceMembership: { findFirst: async () => { throw Error("agent must not resolve owner authority"); } } } as any;
  const input = { requestId: randomUUID(), expectedVersion: "a".repeat(64), materialVersion: "b".repeat(64),
    readyPinId: randomUUID(), readyRevision: "c".repeat(64), commit: "d".repeat(40) };
  assert.deepEqual(await revalidateCompletedResultBasis(db, randomUUID(), randomUUID(),
    { authType: "api_key", workspaceId: randomUUID(), agentId: randomUUID() }, input), { error: "completed_result_owner_required" });
});
test("effective envelope uses only an exact valid append-only mapping and never mutates native pin", async () => {
  const { execution, pin } = candidate(), before = structuredClone(execution), calls: string[] = [];
  for (const current of [false, true]) {
    const db = { $queryRaw: async (sql: TemplateStringsArray) => { calls.push(sql.join("?")); return [{ current, pin }]; } } as any;
    const effective = await effectiveCompletedResult(db, randomUUID(), execution);
    if (!current) assert.equal(effective, execution);
    else {
      assert.notEqual(effective, execution);
      assert.equal(effective.metadata.readyContextPin.pinId, pin.pinId);
      assert.equal(effective.verification, execution.verification);
      assert.equal(effective.metadata.executionContract, execution.metadata.executionContract);
    }
    assert.deepEqual(execution, before);
  }
  assert.ok(calls.every(sql => sql.includes("completed_result_basis_current") && !sql.includes("FOR UPDATE")));
});

for (const [label, blocked] of [["current approval", true], ["any rejection", true], ["stale historical approval", false]] as const) {
  test(`${label} is resolved against the protected review basis before appending`, async () => {
    const { execution, pin } = candidate(), workspaceId = randomUUID(), queries: string[] = [];
    const db = {
      workspaceMembership: { findFirst: async () => ({ role: "owner" }) },
      agentExecution: { findFirst: async () => execution, findFirstOrThrow: async () => execution },
      task: { findFirst: async () => ({ id: execution.taskId, executionReadiness: pin }) },
      $queryRaw: async (sql: TemplateStringsArray) => {
        const query = sql.join("?"); queries.push(query);
        if (query.includes("AS original")) return [{ original: "a".repeat(64), current: "b".repeat(64), pin_digest: "c".repeat(64) }];
        if (query.includes("AS blocked")) return [{ blocked }];
        return [];
      },
      $executeRaw: async (sql: TemplateStringsArray) => {
        assert.ok(/ready_source_fence|decision_authority_invalidate/.test(sql.join("?")), "no append or result mutation permitted");
        return 1;
      }
    } as any;
    // After an eligible stale approval the next normal supersession check is
    // reached; a current decision is refused before that check or any append.
    let reads = 0;
    db.agentExecution.findFirst = async () => ++reads === 1 ? execution : { id: randomUUID() };
    const result = await revalidateCompletedResultBasis(db, workspaceId, execution.id,
      { authType: "user", userId: randomUUID(), workspaceId }, {
        requestId: randomUUID(), expectedVersion: "a".repeat(64), materialVersion: "b".repeat(64),
        readyPinId: pin.pinId, readyRevision: pin.revision, commit: execution.metadata.resultRevision.commit
      });
    assert.equal((result as any).error, blocked ? "completed_result_already_reviewed" : "completed_result_superseded");
    assert.ok(queries.some(query => query.includes("completed_result_review_blocks_revalidation")));
  });
}
