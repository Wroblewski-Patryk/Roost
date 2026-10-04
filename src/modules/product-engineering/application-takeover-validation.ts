import type { Prisma } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { applicationBaseline, type ApplicationBaseline } from "./application-takeover-contract";
import { nativeBoundaryResultBlocked, object } from "../agent-runtime/task-review-contract";

const load = new Function("p", "return import(p)") as (path: string) => Promise<{ nativeDigest: (value: unknown) => string }>;
const nativeFootprint = load(pathToFileURL(resolve(__dirname, "../../../scripts/lib/agent-host-native-footprint.mjs")).href);
const hash = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const invalid = () => ({ error: "application_baseline_evidence_invalid" } as const);
export type ApplicationBaselineValidation = { error?: undefined } | { error: "application_baseline_evidence_invalid" };

export type ApplicationBaselineEvidence = {
  repository: string;
  executions: any[];
  taskAssignments: Map<string, string | null>;
  managedApprovals: Set<string>;
  assumptionRevisions: Map<string, string>;
  now: Date;
};

// These inputs come from native records, never from proposal metadata. Receipt
// bytes follow completeReadOnlyBoundary's existing field order: JSONB ordering
// cannot be used to reproduce the Worker's nativeDigest.
export async function validateApplicationBaselineEvidence(baseline: ApplicationBaseline, evidence: ApplicationBaselineEvidence): Promise<ApplicationBaselineValidation> {
  if (evidence.repository !== baseline.canonicalRepository || evidence.executions.length !== 2) return invalid();
  for (const assumption of baseline.assumptions) {
    if (evidence.assumptionRevisions.get(assumption.recordId) !== assumption.revision) return invalid();
  }
  const auditor = evidence.executions.find(e => e.id === baseline.auditorExecutionId);
  const verifier = evidence.executions.find(e => e.id === baseline.verifierExecutionId);
  if (!auditor || !verifier || auditor.taskId !== baseline.auditTaskId || auditor.taskId === verifier.taskId
    || !auditor.agentHostId || auditor.agentHostId !== verifier.agentHostId
    || !auditor.completedAt || !verifier.startedAt || !verifier.completedAt
    || !(new Date(auditor.completedAt).getTime() <= new Date(verifier.startedAt).getTime())
    || !(new Date(auditor.completedAt).getTime() < new Date(verifier.completedAt).getTime())
    || !(new Date(verifier.completedAt).getTime() <= evidence.now.getTime())) return invalid();
  const { nativeDigest } = await nativeFootprint;
  const clean = (execution: any, kind: "auditor" | "verifier", expectedDigest: string) => {
    const metadata = object(execution.metadata), contract = object(metadata.executionContract), verification = object(execution.verification);
    const receipt = object(verification.readOnlyAudit), revision = object(metadata.resultRevision), managed = object(verification.managedAdmission);
    const worker = contract.assignment?.agentId;
    if (execution.status !== "completed" || execution.applicationId !== baseline.applicationId || execution.contextInvalidatedAt
      || execution.contextStoppedAt || execution.cancelRequestedAt || execution.errorState
      || !Array.isArray(execution.changedFiles) || execution.changedFiles.length
      || !uuid.test(worker ?? "") || evidence.taskAssignments.get(execution.taskId) !== worker
      || contract.singleTask?.applicationId !== baseline.applicationId
      || contract.nativeBoundary?.profile !== "inspect-readonly" || contract.nativeBoundary?.inspectReadOnly?.kind !== kind
      || contract.access?.sandbox !== "read-only" || JSON.stringify(contract.access?.tools) !== '["repository_read"]'
      || JSON.stringify(contract.access?.permissions) !== '["repository_read"]'
      || contract.modelSelection?.schemaVersion !== "roost-managed-hermes-backend-v1" || contract.modelSelection?.backend !== "codex_responses"
      || nativeBoundaryResultBlocked(verification, contract)
      || managed.qualification !== "signed_native_v1" || !hash.test(managed.evidenceDigest ?? "") || !hash.test(managed.jobSourceDigest ?? "")
      || !evidence.managedApprovals.has(`${managed.decisionId}:${managed.revision}:${execution.taskId}`)
      || revision.schemaVersion !== "roost-result-revision-v1" || revision.commit !== baseline.baselineCommit || revision.workingTree !== "clean"
      || revision.executionId !== execution.id || revision.hostId !== execution.agentHostId
      || revision.attempt !== execution.attempt || revision.checkpointVersion !== execution.checkpointVersion
      || revision.branch !== contract.singleTask?.branch || metadata.resultRevisionReviewVersion !== "1"
      || !uuid.test(revision.id ?? "") || !Number.isFinite(Date.parse(revision.observedAt ?? ""))
      || verification.ownedTreeReceipt?.cleanup !== true || verification.ownedTreeReceipt?.jobClosed !== true
      || verification.ownedTreeReceipt?.activeProcesses !== 0 || verification.ownedTreeReceipt?.rootExit !== 0
      || verification.ownedTreeReceipt?.attempt !== execution.id
      || receipt.evidenceDigest !== expectedDigest || receipt.processCoverage !== "listening_tcp_plus_owned_job_zero_processes"
      || receipt.dockerCoverage !== "running_container_list" || !hash.test(receipt.digest ?? "")
      || typeof execution.finalResponse !== "string" || !execution.finalResponse.trim() || Buffer.byteLength(execution.finalResponse, "utf8") > 10000) return false;
    const body = { schemaVersion: receipt.schemaVersion, verdict: receipt.verdict, evidenceDigest: receipt.evidenceDigest,
      preTree: receipt.preTree, postTree: receipt.postTree, processState: receipt.processState, dockerState: receipt.dockerState,
      gitState: receipt.gitState, nativeTools: receipt.nativeTools, processCoverage: receipt.processCoverage, dockerCoverage: receipt.dockerCoverage,
      ...(kind === "verifier" ? { verifiedExecutionId: receipt.verifiedExecutionId, verifiedEvidenceDigest: receipt.verifiedEvidenceDigest } : {}) };
    return receipt.digest === nativeDigest(body);
  };
  if (!clean(auditor, "auditor", baseline.auditorEvidenceDigest) || !clean(verifier, "verifier", baseline.verifierEvidenceDigest)
    || auditor.metadata.executionContract.assignment.agentId === verifier.metadata.executionContract.assignment.agentId
    || auditor.metadata.resultRevision.branch !== verifier.metadata.resultRevision.branch
    || auditor.verification.readOnlyAudit.preTree !== verifier.verification.readOnlyAudit.preTree
    || verifier.verification.readOnlyAudit.verifiedExecutionId !== auditor.id
    || verifier.verification.readOnlyAudit.verifiedEvidenceDigest !== baseline.auditorEvidenceDigest
    || verifier.metadata.executionContract.nativeBoundary.inspectReadOnly.verifiedExecutionId !== auditor.id
    || verifier.metadata.executionContract.nativeBoundary.inspectReadOnly.verifiedEvidenceDigest !== baseline.auditorEvidenceDigest) return invalid();
  return {};
}

export async function validateApplicationTakeoverBaseline(db: Prisma.TransactionClient, workspaceId: string, input: unknown): Promise<ApplicationBaselineValidation> {
  const parsed = applicationBaseline.safeParse(input);
  if (!parsed.success) return invalid();
  const baseline = parsed.data;
  const app = await db.application.findFirst({ where: { id: baseline.applicationId, workspaceId }, include: { repositories: true } });
  if (!app) return invalid();
  const primary = app.repositories.filter(repo => repo.isPrimary);
  const repository = primary.length === 1 ? primary[0] : primary.length === 0 && app.repositories.length === 1 ? app.repositories[0] : null;
  if (!repository) return invalid();
  const executions = await db.agentExecution.findMany({ where: { workspaceId, applicationId: baseline.applicationId,
    id: { in: [baseline.auditorExecutionId, baseline.verifierExecutionId] } } });
  const tasks = await db.task.findMany({ where: { workspaceId, id: { in: executions.map(e => e.taskId) },
    project: { applications: { some: { applicationId: baseline.applicationId } } } }, select: { id: true, assignedWorkforceEntityId: true } });
  const assumptions = baseline.assumptions.length ? await db.$queryRaw<Array<{ id: string; revision: string }>>`
    SELECT c.id,task_interview_record(c.id)->>'revision' AS revision FROM company_records c
    WHERE c.workspace_id=${workspaceId}::uuid AND c.application_id=${baseline.applicationId}::uuid AND c.status<>'archived'
    AND c.id=ANY(${baseline.assumptions.map(a => a.recordId)}::uuid[])` : [];
  const approvals = await db.$queryRaw<Array<{ decisionId: string; revision: number; taskId: string }>>`
    SELECT r.decision_id AS "decisionId",r.version AS revision,r.body->'managedRuntimeApproval'->>'taskId' AS "taskId"
    FROM decision_revisions r JOIN decisions d ON d.id=r.decision_id JOIN decision_acceptances a ON a.decision_id=d.id
    JOIN workspaces w ON w.id=d.workspace_id
    WHERE d.workspace_id=${workspaceId}::uuid AND d.status='accepted' AND decision_state(d.id)='accepted'
    AND a.actor_user_id=w.owner_user_id AND a.actor_agent_id IS NULL
    AND r.body->'managedRuntimeApproval'->>'applicationId'=${baseline.applicationId}
    AND r.body->'managedRuntimeApproval'->>'taskId'=ANY(${executions.map(e => e.taskId)}::text[])
    AND NOT EXISTS(SELECT 1 FROM decisions next JOIN decision_acceptances na ON na.decision_id=next.id WHERE next.supersedes_id=d.id)`;
  return validateApplicationBaselineEvidence(baseline, { repository: repository.url, executions,
    taskAssignments: new Map(tasks.map(task => [task.id, task.assignedWorkforceEntityId])),
    assumptionRevisions: new Map(assumptions.map(record => [record.id, record.revision])),
    managedApprovals: new Set(approvals.map(approval => `${approval.decisionId}:${approval.revision}:${approval.taskId}`)), now: new Date() });
}
