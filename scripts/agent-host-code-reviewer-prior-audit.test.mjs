import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifiedCodeReviewerPriorAudit, codeReviewerPriorAuditReferenceSchema,
  codeReviewerPriorAuditEvidenceSchema, qualifyPrimaryReadOnlyReviewMaterial,
  primaryReadOnlyReviewMatches } from "./lib/agent-host-code-reviewer-prior-audit.mjs";

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const h = n => String(n).repeat(64), head = "a".repeat(40);
function fixture() {
  const access = { sandbox: "read-only", externalWrites: false, tools: ["repository_read"], permissions: ["repository_read"] };
  const previous = { access, assignment: { agentId: uuid(6) }, taskRoles: { executor: { id: uuid(6) } },
    modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" },
    singleTask: { branch: "codex/task-example" }, context: { company: [{ id: uuid(7), revision: "v1" }], product: [], technical: [] },
    nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" },
      readPaths: ["docs/release.md"], readFragments: [{ path: "src/main.ts", startLine: 1, endLine: 3 }] } };
  const receipt = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: h(1),
    preTree: h(2), postTree: h(2), processState: "unchanged", dockerState: "unchanged", gitState: "unchanged",
    nativeTools: [], processCoverage: "listening_tcp_plus_owned_job_zero_processes", dockerCoverage: "running_container_list" };
  receipt.digest = createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
  const prior = { id: uuid(1), taskId: uuid(2), workspaceId: uuid(3), applicationId: uuid(4), agentHostId: uuid(5),
    status: "completed", attempt: 1, checkpointVersion: 3, completedAt: "2026-01-01T00:00:00.000Z",
    contextInvalidatedAt: null, errorState: null, leaseToken: null, leaseExpiresAt: null, changedFiles: [],
    finalResponse: "CHANGES_REQUIRED\n1. Required release evidence is missing.\n2. Independent verification remains outstanding.",
    metadata: { executionContract: previous, readyContextPin: { pinId: uuid(8), revision: h(3), compositionSeal: h(4),
      riskAdmissionSeal: h(5), riskAdmissionCommit: head }, resultRevision: { schemaVersion: "roost-result-revision-v1",
      id: uuid(9), executionId: uuid(1), hostId: uuid(5), attempt: 1, checkpointVersion: 3,
      observedAt: "2026-01-01T00:00:00.000Z", branch: "codex/task-example", commit: head, workingTree: "clean" } },
    verification: { readOnlyAudit: receipt, managedAdmission: { revision: 3, decisionId: uuid(10),
      qualification: "signed_native_v1", evidenceDigest: h(6), jobSourceDigest: h(7) },
      ownedTreeReceipt: { version: "roost-windows-job-v2", attempt: uuid(1), type: "receipt", job: uuid(11),
        assignedBeforeResume: true, killOnClose: true, breakaway: false, controllerInJob: true, inheritedJob: true,
        rootPid: 100, rootCreationTime: "123456789012345678", launcherPid: 101, launcherCreationTime: "123456789012345677",
        resumed: true, rootExit: 0, activeProcesses: 0, jobClosed: true, cleanup: true, cleanupMs: 0,
        stdoutBytes: 100, stderrBytes: 0, terminationReason: "root_exit", resumeReceipt: h(8), executableDigest: h(9),
        launcherSha256: "b".repeat(64), sourceSha256: h(7) } } };
  const claimed = { id: uuid(12), taskId: uuid(13), workspaceId: uuid(3), applicationId: uuid(4), agentHostId: uuid(5) };
  const contract = { access: structuredClone(access), assignment: { agentId: uuid(14) }, singleTask: { branch: "codex/task-example" },
    nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "code-reviewer",
      reviewedCommit: head, priorAudit: { executionId: uuid(1), receiptDigest: receipt.digest } } } };
  return { prior, options: { claimed, contract, repositoryEvidence: { head, branch: "codex/task-example", tree: h(2) } } };
}
const qualify = f => verifiedCodeReviewerPriorAudit(f.prior, f.options);

test("full prior auditor response and original native/source evidence are bounded, detached and sealed", () => {
  const f = fixture(), e = qualify(f);
  assert.equal(e.finalResponse, f.prior.finalResponse); assert.equal(e.authority, false);
  assert.deepEqual(e.sourceSelection.readFragments, [["src/main.ts", 1, 3]]);
  assert.deepEqual(e.readOnlyAudit, f.prior.verification.readOnlyAudit);
  assert.equal(codeReviewerPriorAuditEvidenceSchema.safeParse(e).success, true);
  assert.ok(Object.isFrozen(e.ownedTreeReceipt)); f.prior.finalResponse = "changed"; assert.notEqual(e.finalResponse, "changed");
});
test("new reference is strict and does not reinterpret verifier evidenceDigest", () => {
  assert.equal(codeReviewerPriorAuditReferenceSchema.safeParse({ executionId: uuid(1), receiptDigest: h(1) }).success, true);
  for (const ref of [{ executionId: uuid(1), evidenceDigest: h(1) }, { executionId: uuid(1), receiptDigest: h(1), terminalDigest: h(2) }])
    assert.equal(codeReviewerPriorAuditReferenceSchema.safeParse(ref).success, false);
  let f = fixture(); f.options.contract.nativeBoundary.inspectReadOnly.kind = "verifier"; assert.throws(() => qualify(f));
});
test("original receipt cannot be mutated even if its pinned digest is retained", () => {
  for (const mutation of [f => f.prior.verification.readOnlyAudit.evidenceDigest = h(3),
    f => f.prior.verification.readOnlyAudit.preTree = h(4), f => f.prior.verification.readOnlyAudit.nativeTools.push("shell"),
    f => f.options.contract.nativeBoundary.inspectReadOnly.priorAudit.receiptDigest = h(5)]) {
    const f = fixture(); mutation(f); assert.throws(() => qualify(f));
  }
});
test("same workspace/application/host and distinct task/actor are mandatory", () => {
  for (const mutation of [f => f.prior.workspaceId = uuid(20), f => f.prior.applicationId = uuid(20),
    f => f.prior.agentHostId = uuid(20), f => f.prior.taskId = f.options.claimed.taskId,
    f => f.prior.metadata.executionContract.assignment.agentId = f.options.contract.assignment.agentId,
    f => f.prior.id = uuid(20), f => delete f.options.contract.assignment.agentId,
    f => delete f.options.claimed.id]) { const f = fixture(); mutation(f); assert.throws(() => qualify(f)); }
});
test("completed clean immutable original result must match current commit/branch/tree", () => {
  for (const mutation of [f => f.prior.status = "failed", f => f.prior.errorState = { code: "failed" },
    f => f.prior.leaseToken = "active", f => delete f.prior.leaseToken,
    f => delete f.prior.leaseExpiresAt, f => f.prior.changedFiles.push("src/main.ts"),
    f => f.prior.metadata.resultRevision.commit = "b".repeat(40), f => f.prior.metadata.resultRevision.branch = "other",
    f => f.prior.metadata.resultRevision.executionId = uuid(20), f => f.options.repositoryEvidence.tree = h(4),
    f => f.prior.metadata.readyContextPin.riskAdmissionCommit = "b".repeat(40), f => f.prior.contextInvalidatedAt = "2026-01-01T01:00:00Z"])
    { const f = fixture(); mutation(f); assert.throws(() => qualify(f)); }
});
test("mapped Ready cannot replace original evidence and is not copied into transport", () => {
  const f = fixture(), before = qualify(f); f.prior.metadata.basisRevalidation = { readyPinId: uuid(20), materialVersion: h(9) };
  f.prior.metadata.currentReadyContextPin = { riskAdmissionCommit: "b".repeat(40) };
  assert.deepEqual(qualify(f), before);
});
test("native metadata must establish signed admission and an exactly closed successful job", () => {
  for (const mutation of [f => f.prior.verification.managedAdmission.qualification = "unsigned",
    f => f.prior.verification.managedAdmission.jobSourceDigest = h(8), f => f.prior.verification.ownedTreeReceipt.attempt = uuid(20),
    f => f.prior.verification.ownedTreeReceipt.rootExit = 1, f => f.prior.verification.ownedTreeReceipt.activeProcesses = 1,
    f => f.prior.verification.ownedTreeReceipt.jobClosed = false, f => f.prior.verification.ownedTreeReceipt.resumed = false])
    { const f = fixture(); mutation(f); assert.throws(() => qualify(f)); }
});
test("write access, invalid source selection and arbitrary extra native text are refused", () => {
  for (const mutation of [f => f.prior.metadata.executionContract.access.externalWrites = true,
    f => f.prior.metadata.executionContract.nativeBoundary.runtime.ports.push(3000),
    f => f.prior.metadata.executionContract.nativeBoundary.readPaths.push("../outside"),
    f => f.prior.verification.managedAdmission.note = "arbitrary credential text"])
    { const f = fixture(); mutation(f); assert.throws(() => qualify(f)); }
});
test("empty/oversized response and a modified transported result cannot pass the schema", () => {
  for (const finalResponse of ["", " ", "é".repeat(6000)]) { const f = fixture(); f.prior.finalResponse = finalResponse; assert.throws(() => qualify(f)); }
  const e = structuredClone(qualify(fixture())); e.finalResponse += "changed";
  assert.equal(codeReviewerPriorAuditEvidenceSchema.safeParse(e).success, false);
  e.digest = "a".repeat(64); assert.equal(codeReviewerPriorAuditEvidenceSchema.safeParse(e).success, false);
});

function primaryFixture({ naive = true } = {}) {
  const f = fixture(), p = f.prior, materialVersion = "c".repeat(64);
  const inspection = { ...f.options.contract.nativeBoundary.inspectReadOnly, baselineCommit: head,
    verifiedTaskId: p.taskId, verifiedExecutionId: p.id, verifiedEvidenceDigest: materialVersion };
  const view = { task: { id: p.taskId, workspaceId: p.workspaceId }, materialVersion, approvalCommit: head, canReview: true, reason: null,
    result: { executionId: p.id, taskId: p.taskId, applicationId: p.applicationId, contract: p.metadata.executionContract,
      verification: p.verification, resultRevision: p.metadata.resultRevision, pin: p.metadata.readyContextPin,
      completedAt: naive ? p.completedAt.slice(0, -1) : p.completedAt, attempt: p.attempt, checkpointVersion: p.checkpointVersion,
      changedFiles: p.changedFiles, finalResponse: p.finalResponse },
    executionChronology: { schemaVersion: "roost-task-review-execution-chronology-v1", executionId: p.id,
      materialVersion, completedAt: p.completedAt } };
  return { ...f, view: JSON.parse(JSON.stringify(view)), inspection };
}
function matchPrimary(f) {
  const packet = verifiedCodeReviewerPriorAudit(f.prior, f.options), reviewed = qualifyPrimaryReadOnlyReviewMaterial(f.view, f.inspection, f.options.repositoryEvidence);
  return primaryReadOnlyReviewMatches(reviewed, packet, { inspection: f.inspection, repositoryEvidence: f.options.repositoryEvidence,
    identity: f.options.claimed, reviewerAgentId: f.options.contract.assignment.agentId });
}
test("primary SQL-naive completion uses exact authenticated UTC tuple while raw material/hash/native receipts stay unchanged", () => {
  const f = primaryFixture(), raw = JSON.stringify(f.view.result), native = JSON.stringify(f.prior.verification), version = f.view.materialVersion;
  const previousZone = process.env.TZ;
  try {
    process.env.TZ = "Europe/Berlin";
    assert.notEqual(Date.parse(f.view.result.completedAt), Date.parse(f.view.executionChronology.completedAt));
    assert.equal(matchPrimary(f), true);
    assert.equal(JSON.stringify(f.view.result), raw); assert.equal(JSON.stringify(f.prior.verification), native);
    assert.equal(f.view.materialVersion, version);
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});
test("primary naive completion refuses missing/wrong execution/material/UTC witnesses and invalid ISO/calendar/range", () => {
  for (const mutation of [f => delete f.view.executionChronology, f => f.view.executionChronology.executionId = uuid(20),
    f => f.view.executionChronology.materialVersion = h(1), f => f.view.executionChronology.completedAt = "2026-01-01T00:00:01.000Z",
    f => f.view.executionChronology.schemaVersion = "untrusted_clock", f => f.view.executionChronology.authority = true,
    f => f.view.result.completedAt = "2026-01-01 00:00:00.000", f => f.view.result.completedAt = "2026-01-01T00:00:00.0001",
    f => { f.view.result.completedAt = "2026-02-30T00:00:00.000"; f.view.executionChronology.completedAt = "2026-03-02T00:00:00.000Z"; },
    f => { f.view.result.completedAt = "2026-01-01T24:00:00.000"; f.view.executionChronology.completedAt = "2026-01-02T00:00:00.000Z"; },
    f => { f.view.result.completedAt = "0000-01-01T00:00:00.000"; f.view.executionChronology.completedAt = "0000-01-01T00:00:00.000Z"; }]) {
    const f = primaryFixture(); mutation(f); assert.throws(() => matchPrimary(f), /code_reviewer_prior_audit_invalid/);
  }
});
test("already zoned native completion requires no witness and keeps exact native packet timestamp", () => {
  const f = primaryFixture({ naive: false }); delete f.view.executionChronology;
  assert.equal(matchPrimary(f), true);
  assert.equal(f.view.result.completedAt, f.prior.completedAt);
});
