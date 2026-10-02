import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { codeReviewReferenceMatches, validateCodeReviewView, prepareCodeReviewDecision } from "./lib/agent-host-code-reviewer.mjs";
import { providerInputSchema, prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";

function fixture(mapped = false) {
  const reviewerAgentId = randomUUID(), executionId = randomUUID(), taskId = randomUUID(), originalPinId = randomUUID();
  const review = { verifiedTaskId: taskId, verifiedExecutionId: executionId, verifiedEvidenceDigest: "a".repeat(64),
    reviewedCommit: "b".repeat(40), baselineCommit: "c".repeat(40) };
  const view = { task: { id: taskId }, canReview: true, basisCurrent: false, materialVersion: review.verifiedEvidenceDigest,
    approvalCommit: review.reviewedCommit, expectedVersion: "d".repeat(64),
    grantAccess: { review_decision: { status: "active", grantId: randomUUID() } },
    result: { taskId, executionId, pin: { pinId: originalPinId, revision: "e".repeat(64) },
      resultRevision: { commit: review.reviewedCommit },
      contract: { taskRoles: { verifier: { id: reviewerAgentId } }, assignment: { agentId: randomUUID() } } } };
  if (mapped) {
    view.basisCurrent = true; view.materialVersion = "f".repeat(64);
    view.result.basisRevalidation = { id: randomUUID(), originalPinId, originalRevision: "e".repeat(64),
      originalMaterialVersion: review.verifiedEvidenceDigest, readyPinId: randomUUID(), readyRevision: "1".repeat(64),
      readyPinDigest: "2".repeat(64), commit: review.reviewedCommit, actorUserId: randomUUID(), createdAt: "2026-10-02T00:00:00.000" };
  }
  const config = { agentId: reviewerAgentId, grantId: view.grantAccess.review_decision.grantId };
  const readOnlyAudit = { verifiedExecutionId: executionId, reviewedCommit: review.reviewedCommit,
    verifiedEvidenceDigest: view.materialVersion };
  const candidate = { decision: "approve", reviewedCommit: review.reviewedCommit, evidenceDigest: view.materialVersion,
    summary: "Exact current basis reviewed", evidence: [{ kind: "test", reference: "native test receipt",
      result: "Accepted scoped suite passed", verdict: "pass" }] };
  return { view, review, reviewerAgentId, config, readOnlyAudit, candidate };
}

test("ordinary reference still requires the exact original material with no mapping", () => {
  const x = fixture(); assert.equal(codeReviewReferenceMatches(x.view, x.review), true);
  assert.equal(validateCodeReviewView(x.view, x.review, x.reviewerAgentId), x.view);
  x.view.materialVersion = "f".repeat(64); x.view.basisCurrent = true;
  assert.equal(codeReviewReferenceMatches(x.view, x.review), false);
  assert.throws(() => validateCodeReviewView(x.view, x.review, x.reviewerAgentId), /code_reviewer_unproven/);
  assert.equal(codeReviewReferenceMatches(undefined, undefined), false);
});
test("current server basis mapping preserves original reference and decisions bind the new material", () => {
  const x = fixture(true); assert.equal(codeReviewReferenceMatches(x.view, x.review), true);
  assert.equal(validateCodeReviewView(x.view, x.review, x.reviewerAgentId), x.view);
  const body = prepareCodeReviewDecision({ ...x, finalResponse: JSON.stringify(x.candidate) });
  assert.equal(body.materialVersion, x.view.materialVersion);
  assert.notEqual(body.materialVersion, x.review.verifiedEvidenceDigest);
  assert.equal(body.executionId, x.review.verifiedExecutionId);
  assert.equal(body.reviewedCommit, x.review.reviewedCommit);
});
for (const [label, mutate] of [
  ["missing current flag", x => { delete x.view.basisCurrent; }],
  ["stale current flag", x => { x.view.basisCurrent = false; }],
  ["string current flag", x => { x.view.basisCurrent = "true"; }],
  ["no current review authority", x => { x.view.canReview = false; }],
  ["missing active grant", x => { delete x.view.grantAccess; }],
  ["invalidated grant", x => { x.view.grantAccess.review_decision.status = "invalidated"; }],
  ["wrong original material", x => { x.view.result.basisRevalidation.originalMaterialVersion = "3".repeat(64); }],
  ["wrong mapping commit", x => { x.view.result.basisRevalidation.commit = "3".repeat(40); }],
  ["wrong result commit", x => { x.view.result.resultRevision.commit = "3".repeat(40); }],
  ["wrong execution", x => { x.view.result.executionId = randomUUID(); }],
  ["wrong result task", x => { x.view.result.taskId = randomUUID(); }],
  ["wrong projected task", x => { x.view.task.id = randomUUID(); }],
  ["wrong original pin", x => { x.view.result.basisRevalidation.originalPinId = randomUUID(); }],
  ["wrong original revision", x => { x.view.result.basisRevalidation.originalRevision = "3".repeat(64); }],
  ["same old Ready pin", x => { x.view.result.basisRevalidation.readyPinId = x.view.result.pin.pinId; }],
  ["missing required current Ready digest", x => { delete x.view.result.basisRevalidation.readyPinDigest; }],
  ["invalid current material", x => { x.view.materialVersion = "not-a-digest"; }],
  ["unchanged original material despite mapping", x => { x.view.materialVersion = x.review.verifiedEvidenceDigest; }],
]) test(`basis mapping cannot authorize ${label}`, () => {
  const x = fixture(true); mutate(x);
  assert.equal(codeReviewReferenceMatches(x.view, x.review), false);
  assert.throws(() => validateCodeReviewView(x.view, x.review, x.reviewerAgentId), /code_reviewer_unproven/);
  assert.throws(() => prepareCodeReviewDecision({ ...x, finalResponse: JSON.stringify(x.candidate) }), /code_reviewer_unproven/);
});
for (const [label, mutate] of [
  ["old model digest", x => { x.candidate.evidenceDigest = x.review.verifiedEvidenceDigest; }],
  ["old read-only audit digest", x => { x.readOnlyAudit.verifiedEvidenceDigest = x.review.verifiedEvidenceDigest; }],
  ["changed current material after model input", x => { x.view.materialVersion = "3".repeat(64); }],
  ["different audit execution", x => { x.readOnlyAudit.verifiedExecutionId = randomUUID(); }],
]) test(`current-basis decision rejects ${label}`, () => {
  const x = fixture(true); mutate(x);
  assert.throws(() => prepareCodeReviewDecision({ ...x, finalResponse: JSON.stringify(x.candidate) }),
    error => error.message === "code_reviewer_unproven" && error.details.reason === "model_binding_invalid");
});

function mappedProviderInput() {
  const x = fixture(true), f = validPacketFixture(), c = f.packet.contract;
  c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["release.json"], runtime: { required: false, ports: [] },
    inspectReadOnly: { kind: "code-reviewer", ...x.review } };
  c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
  f.packet.procedureComposition.fields.tools = ["repository_read"]; pinReadyFixture(f);
  f.taskContext.readyAdmission.riskAdmission.commit = x.review.reviewedCommit;
  f.claimed.metadata.readyContextPin.riskAdmissionCommit = x.review.reviewedCommit;
  const repositoryEvidence = { schemaVersion: "roost-readonly-repository-evidence-v1", head: x.review.reviewedCommit,
    branch: c.singleTask.branch, files: [{ path: "release.json", mimeType: "text/plain", content: "{}", sha256: "1".repeat(64) }],
    tree: "2".repeat(64), processDigest: "3".repeat(64), dockerDigest: "4".repeat(64), digest: "5".repeat(64),
    reviewed: { verifiedTaskId: x.review.verifiedTaskId, verifiedExecutionId: x.review.verifiedExecutionId,
      originalMaterialVersion: x.review.verifiedEvidenceDigest, materialVersion: x.view.materialVersion,
      basisCurrent: true, basisRevalidation: x.view.result.basisRevalidation,
      baselineCommit: x.review.baselineCommit, reviewedCommit: x.review.reviewedCommit, changedFiles: ["release.json"],
      codingTests: { passed: true }, localCommit: { commit: x.review.reviewedCommit }, nativeReview: { verdict: "verified_candidate" },
      diff: "bounded fixture diff", diffDigest: "6".repeat(64) } };
  return prepareProviderInput({ fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext },
    claimed: f.claimed, currentCommit: x.review.reviewedCommit, assertAuthority() {}, repositoryEvidence });
}
test("sealed model input retains exact original reference and complete current required basis", () => {
  const input = mappedProviderInput(); assert.equal(providerInputSchema.safeParse(input).success, true);
  const inspected = input.evidence.repositoryInspection;
  assert.equal(inspected.trust, "untrusted_evidence");
  assert.equal(inspected.value.reviewed.originalMaterialVersion, input.contract.nativeBoundary.inspectReadOnly.verifiedEvidenceDigest);
  assert.notEqual(inspected.value.reviewed.materialVersion, inspected.value.reviewed.originalMaterialVersion);
  assert.equal(inspected.value.reviewed.basisRevalidation.readyPinDigest.length, 64);
  assert.equal(Object.isFrozen(inspected.value.reviewed.basisRevalidation), true);
});
for (const [label, mutate] of [
  ["wrong original reference", r => { r.originalMaterialVersion = "7".repeat(64); }],
  ["wrong mapping original", r => { r.basisRevalidation.originalMaterialVersion = "7".repeat(64); }],
  ["wrong mapping commit", r => { r.basisRevalidation.commit = "7".repeat(40); }],
  ["wrong task identity", r => { r.verifiedTaskId = randomUUID(); }],
  ["wrong execution identity", r => { r.verifiedExecutionId = randomUUID(); }],
  ["wrong reviewed commit", r => { r.reviewedCommit = "7".repeat(40); }],
  ["old current material", r => { r.materialVersion = r.originalMaterialVersion; }],
  ["missing mapping", r => { delete r.basisRevalidation; }],
  ["missing original reference", r => { delete r.originalMaterialVersion; }],
  ["missing current flag", r => { delete r.basisCurrent; }],
  ["stale current flag", r => { r.basisCurrent = false; }],
  ["reused old Ready", r => { r.basisRevalidation.readyPinId = r.basisRevalidation.originalPinId; }],
]) test(`sealed provider schema rejects ${label}`, () => {
  const input = structuredClone(mappedProviderInput()); mutate(input.evidence.repositoryInspection.value.reviewed);
  assert.equal(providerInputSchema.safeParse(input).success, false);
});
