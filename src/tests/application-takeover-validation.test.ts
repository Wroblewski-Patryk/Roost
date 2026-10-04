import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateApplicationBaselineEvidence, type ApplicationBaselineEvidence } from "../modules/product-engineering/application-takeover-validation";
import { type ApplicationBaseline } from "../modules/product-engineering/application-takeover-contract";
import { decisionProposal } from "../modules/decisions/decision-governance-contract";
import { decisionAuthority } from "../modules/decisions/decision-authority";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const baseline: ApplicationBaseline = { schemaVersion: "roost-application-takeover-v1", applicationId: id(1), auditTaskId: id(2),
  canonicalRepository: "https://github.com/example/workshop.git", baselineCommit: "a".repeat(40),
  auditorExecutionId: id(3), verifierExecutionId: id(4), auditorEvidenceDigest: "b".repeat(64), verifierEvidenceDigest: "c".repeat(64),
  stage: "implementation", scopeDescription: "Recover booking requirements", intendedUser: "Workshop coordinator",
  primaryProblem: "Bookings can overlap", coreOutcome: "Coordinator sees conflicting bookings",
  assumptions: [{ recordId: id(5), revision: "d".repeat(64), decisionStatus: "accepted", implementationState: "unverified" }],
  limitations: ["Booking conflict audit only"], productReady: false, saleReady: false };
const proposal = () => ({ requestId: id(6), expectedVersion: "e".repeat(64), title: "Adopt workshop baseline", context: "Two native independent audits",
  decision: "Adopt the application's bounded baseline", rationale: "Auditor and verifier agree", consequences: "Only this audited scope is adopted",
  scopeReason: "Application-specific takeover", scope: [{ type: "application", id: baseline.applicationId }, { type: "task", id: baseline.auditTaskId }],
  supersedesId: null, conflicts: [], applicationBaseline: structuredClone(baseline) });

function fixture(): ApplicationBaselineEvidence {
  const execution = (verifier: boolean) => {
    const executionId = verifier ? baseline.verifierExecutionId : baseline.auditorExecutionId;
    const taskId = verifier ? id(7) : baseline.auditTaskId, worker = verifier ? id(9) : id(8);
    const receipt = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified",
      evidenceDigest: verifier ? baseline.verifierEvidenceDigest : baseline.auditorEvidenceDigest,
      preTree: "f".repeat(64), postTree: "f".repeat(64), processState: "unchanged", dockerState: "unchanged", gitState: "unchanged", nativeTools: [],
      processCoverage: "listening_tcp_plus_owned_job_zero_processes", dockerCoverage: "running_container_list",
      ...(verifier ? { verifiedExecutionId: baseline.auditorExecutionId, verifiedEvidenceDigest: baseline.auditorEvidenceDigest } : {}) };
    return { id: executionId, applicationId: baseline.applicationId, taskId, agentHostId: id(10), status: "completed",
      contextInvalidatedAt: null, contextStoppedAt: null, cancelRequestedAt: null, errorState: null, changedFiles: [], attempt: 1, checkpointVersion: 4,
      startedAt: new Date(verifier ? "2026-10-04T09:10:00Z" : "2026-10-04T09:00:00Z"),
      completedAt: new Date(verifier ? "2026-10-04T09:20:00Z" : "2026-10-04T09:10:00Z"), finalResponse: "Independent scoped audit completed.",
      metadata: { executionContract: { singleTask: { applicationId: baseline.applicationId, branch: "main" }, assignment: { agentId: worker },
        nativeBoundary: { profile: "inspect-readonly", inspectReadOnly: { kind: verifier ? "verifier" : "auditor",
          ...(verifier ? { verifiedExecutionId: baseline.auditorExecutionId, verifiedEvidenceDigest: baseline.auditorEvidenceDigest } : {}) } },
        access: { sandbox: "read-only", tools: ["repository_read"], permissions: ["repository_read"] },
        modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" } },
        resultRevisionReviewVersion: "1", resultRevision: { schemaVersion: "roost-result-revision-v1", id: id(verifier ? 12 : 11),
          executionId, hostId: id(10), attempt: 1, checkpointVersion: 4, branch: "main", commit: baseline.baselineCommit,
          workingTree: "clean", observedAt: "2026-10-04T09:10:00Z" } },
      verification: { readOnlyAudit: { ...receipt, digest: digest(receipt) },
        ownedTreeReceipt: { cleanup: true, jobClosed: true, rootExit: 0, activeProcesses: 0, attempt: executionId },
        managedAdmission: { qualification: "signed_native_v1", decisionId: id(verifier ? 14 : 13), revision: 1,
          evidenceDigest: "e".repeat(64), jobSourceDigest: "f".repeat(64) } } };
  };
  return { repository: baseline.canonicalRepository, executions: [execution(false), execution(true)],
    taskAssignments: new Map([[baseline.auditTaskId, id(8)], [id(7), id(9)]]),
    managedApprovals: new Set([`${id(13)}:1:${baseline.auditTaskId}`, `${id(14)}:1:${id(7)}`]),
    assumptionRevisions: new Map([[id(5), "d".repeat(64)]]), now: new Date("2026-10-04T09:30:00Z") };
}

test("takeover validates native managed independent audit receipts and exact scoped records", async () => {
  assert.deepEqual(await validateApplicationBaselineEvidence(baseline, fixture()), {});
  assert.equal(decisionProposal.safeParse(proposal()).success, true);
});

test("JSONB receipt key reordering does not alter the existing native digest algorithm", async () => {
  const evidence = fixture();
  for (const execution of evidence.executions) execution.verification.readOnlyAudit = Object.fromEntries(Object.entries(execution.verification.readOnlyAudit).reverse());
  assert.deepEqual(await validateApplicationBaselineEvidence(baseline, evidence), {});
});

test("takeover rejects changed repository and stale or foreign assumption versions", async () => {
  for (const mutate of [
    (e: ApplicationBaselineEvidence) => { e.repository += "/other"; },
    (e: ApplicationBaselineEvidence) => { e.assumptionRevisions.clear(); },
    (e: ApplicationBaselineEvidence) => { e.assumptionRevisions.set(id(5), "0".repeat(64)); }
  ]) { const evidence = fixture(); mutate(evidence); assert.ok((await validateApplicationBaselineEvidence(baseline, evidence)).error); }
});

test("takeover rejects fake native receipts, dirty work, wrong lineage and missing managed authority", async () => {
  const mutations: Array<(e: ApplicationBaselineEvidence) => void> = [
    e => { e.executions[0].verification.readOnlyAudit.digest = "0".repeat(64); },
    e => { e.executions[0].verification.readOnlyAudit.postTree = "0".repeat(64); },
    e => { e.executions[0].changedFiles.push("app.ts"); },
    e => { e.executions[0].metadata.resultRevision.commit = "0".repeat(40); },
    e => { e.executions[0].metadata.resultRevision.executionId = id(99); },
    e => { e.executions[0].metadata.resultRevision.checkpointVersion = 3; },
    e => { e.executions[0].metadata.executionContract.access.tools.push("repository_write"); },
    e => { e.executions[1].metadata.executionContract.assignment.agentId = id(8); e.taskAssignments.set(id(7), id(8)); },
    e => { e.executions[1].verification.readOnlyAudit.verifiedExecutionId = id(99); },
    e => { e.executions[1].metadata.executionContract.nativeBoundary.inspectReadOnly.verifiedEvidenceDigest = "0".repeat(64); },
    e => { e.executions[1].taskId = baseline.auditTaskId; },
    e => { e.executions[1].applicationId = id(99); },
    e => { e.executions[1].agentHostId = id(99); },
    e => { e.executions[1].startedAt = new Date("2026-10-04T09:09:00Z"); },
    e => { e.executions[1].completedAt = new Date("2026-10-04T09:40:00Z"); },
    e => { e.executions[1].contextInvalidatedAt = new Date(); },
    e => { e.executions[1].verification.ownedTreeReceipt.activeProcesses = 1; },
    e => { e.executions[1].verification.managedAdmission.qualification = "claimed"; },
    e => { e.executions[1].verification.managedAdmission.jobSourceDigest = "unknown"; },
    e => { e.executions[1].verification.managedAdmission.revision = 2; },
    e => { e.managedApprovals.clear(); },
    e => { e.taskAssignments.clear(); }
  ];
  for (const mutate of mutations) { const evidence = fixture(); mutate(evidence); assert.ok((await validateApplicationBaselineEvidence(baseline, evidence)).error); }
});

test("baseline proposal binds application and audit task and cannot combine execution grants", () => {
  assert.equal(decisionProposal.safeParse({ ...proposal(), scope: [{ type: "application", id: id(99) }, { type: "task", id: baseline.auditTaskId }] }).success, false);
  assert.equal(decisionProposal.safeParse({ ...proposal(), scope: [{ type: "application", id: baseline.applicationId }, { type: "task", id: id(99) }] }).success, false);
  const managedRuntimeApproval = { schemaVersion: "roost-managed-runtime-approval-v1", taskId: baseline.auditTaskId, applicationId: baseline.applicationId,
    installationId: id(99), selectionDigest: "a".repeat(64), backend: "codex_responses", riskClass: "low", mode: "trusted_provider_pilot",
    residualRiskAccepted: true, acknowledgement: "windows_account_authority_not_os_isolation" };
  assert.equal(decisionProposal.safeParse({ ...proposal(), managedRuntimeApproval }).success, false);
  const firstWriteApproval = { schemaVersion: "roost-first-write-approval-v1", taskId: baseline.auditTaskId, applicationId: baseline.applicationId,
    installationId: id(99), branch: `codex/task-${baseline.auditTaskId}`, baselineCommit: baseline.baselineCommit,
    auditorExecutionId: baseline.auditorExecutionId, verifierExecutionId: baseline.verifierExecutionId,
    auditorEvidenceDigest: baseline.auditorEvidenceDigest, verifierEvidenceDigest: baseline.verifierEvidenceDigest,
    capabilities: ["repository_read", "repository_write", "local_test"], operations: { localCommit: true },
    remotePush: false, deployment: false, financialWrites: false };
  assert.equal(decisionProposal.safeParse({ ...proposal(), firstWriteApproval }).success, false);
  const authority = { domain: "ordinary_domain", departmentKey: "09-technologia", entities: [{ type: "task", id: baseline.auditTaskId }] };
  assert.equal(decisionProposal.safeParse({ ...proposal(), authority }).success, false);
});

test("takeover acceptance is primary-owner reserved even with a claimed delegated declaration", async () => {
  const owner = id(20);
  const result = await decisionAuthority({} as any, id(21), { applicationBaseline: baseline, authority: { domain: "ordinary_domain" } }, {},
    { ownerUserId: owner, ownerActive: true, truncated: false, mandates: [], workers: [], labels: [] });
  assert.equal(result.status, "owner_reserved");
  assert.deepEqual(result.principal, { kind: "user", id: owner });
});
