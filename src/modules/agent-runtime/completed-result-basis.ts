import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AuthContext } from "../../auth/api-key.middleware";
import { inspectReady, lockReadyTask } from "./task-execution-readiness";
import { exactReviewCommit, nativeBoundaryResultBlocked, object, reviewDigest } from "./task-review-contract";
import { releaseCandidateNativeError } from "./governed-release-contract";

type Db = Prisma.TransactionClient;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const completedResultBasisSchema = z.object({ requestId: z.string().uuid(), expectedVersion: hash,
  materialVersion: hash, readyPinId: z.string().uuid(), readyRevision: hash,
  commit: z.string().regex(/^[a-f0-9]{40}$/) }).strict();

// A new Ready validates today's required context. It cannot rewrite what the
// native execution saw or grandfather a review made against an earlier basis.
export function completedReadonlyAuditNativeProven(execution: any, contract: any): boolean {
  const boundary = object(contract.nativeBoundary), access = object(contract.access);
  const verification = object(execution.verification), managed = object(verification.managedAdmission);
  const owned = object(verification.ownedTreeReceipt);
  const revision = object(object(execution.metadata).resultRevision);
  return boundary.profile === "inspect-readonly" && object(boundary.inspectReadOnly).kind === "auditor"
    && object(boundary.runtime).required === false && Array.isArray(object(boundary.runtime).ports)
    && object(boundary.runtime).ports.length === 0
    && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(contract.assignment?.agentId ?? "")
    && contract.assignment.agentId === contract.taskRoles?.executor?.id
    && access.sandbox === "read-only" && access.externalWrites === false
    && Array.isArray(access.tools) && access.tools.length === 1 && access.tools[0] === "repository_read"
    && Array.isArray(access.permissions) && access.permissions.length === 1 && access.permissions[0] === "repository_read"
    && contract.modelSelection?.schemaVersion === "roost-managed-hermes-backend-v1"
    && contract.modelSelection?.backend === "codex_responses"
    && managed.qualification === "signed_native_v1"
    && /^[a-f0-9]{64}$/.test(managed.evidenceDigest ?? "")
    && /^[a-f0-9]{64}$/.test(managed.jobSourceDigest ?? "")
    && owned.version === "roost-windows-job-v2"
    && owned.sourceSha256 === managed.jobSourceDigest && owned.attempt === execution.id
    && owned.cleanup === true && owned.jobClosed === true && owned.rootExit === 0 && owned.activeProcesses === 0
    && owned.assignedBeforeResume === true && owned.resumed === true && owned.killOnClose === true && owned.breakaway === false
    && !execution.errorState && !execution.leaseToken && !execution.leaseExpiresAt
    && Array.isArray(execution.changedFiles) && execution.changedFiles.length === 0
    && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(revision.observedAt ?? "")
    && !nativeBoundaryResultBlocked(verification, contract);
}

export function completedResultBasisEligibility(execution: any, pin: any): string | null {
  const metadata = object(execution?.metadata), contract = object(metadata.executionContract);
  const originalPin = object(metadata.readyContextPin), revision = object(metadata.resultRevision);
  if (!execution || execution.status !== "completed" || !execution.completedAt || execution.contextInvalidatedAt
    || !exactReviewCommit({ contract, resultRevision: revision }, execution)
    || !(completedReadonlyAuditNativeProven(execution, contract)
      || (!releaseCandidateNativeError(execution, contract)
        && object(execution.verification).codingTests?.passed === true)))
    return "completed_result_native_unproven";
  if (!pin || pin.status !== "ready" || !originalPin.pinId || !originalPin.revision
    || pin.applicationId !== execution.applicationId
    || reviewDigest(contract) !== reviewDigest(pin.contract ?? {})
    || (execution.prompt ?? null) !== (pin.prompt ?? null)
    || (execution.baseBranch ?? null) !== (pin.baseBranch ?? null)
    || originalPin.riskAdmissionCommit !== pin.riskAdmissionCommit)
    return "completed_result_intent_changed";
  if (pin.pinId === originalPin.pinId || !Number.isFinite(Date.parse(pin.validatedAt ?? ""))
    || Date.parse(pin.validatedAt) < new Date(execution.completedAt).getTime())
    return "completed_result_fresh_ready_required";
  return null;
}

async function owner(db: Db, workspaceId: string, auth: AuthContext) {
  return auth.authType === "user" && auth.userId && Boolean(await db.workspaceMembership.findFirst({
    where: { workspaceId, userId: auth.userId, role: "owner" } }));
}
async function load(db: Db, workspaceId: string, id: string, lock = false) {
  let execution = await db.agentExecution.findFirst({ where: { id, workspaceId } });
  if (!execution) return { error: "execution_not_found" } as const;
  const task = lock ? await lockReadyTask(db, workspaceId, execution.taskId)
    : await db.task.findFirst({ where: { id: execution.taskId, workspaceId } });
  if (!task) return { error: "task_not_found" } as const;
  if (lock) {
    await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${id}::uuid FOR UPDATE`;
    execution = await db.agentExecution.findFirstOrThrow({ where: { id, workspaceId } });
  }
  const material = (await db.$queryRaw<any[]>`SELECT
    encode(sha256(convert_to(task_review_material_original(e)::text,'UTF8')),'hex') AS original,
    encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') AS current,
    encode(sha256(convert_to(t.execution_readiness::text,'UTF8')),'hex') AS pin_digest
    FROM agent_executions e JOIN tasks t ON t.id=e.task_id WHERE e.id=${id}::uuid AND e.workspace_id=${workspaceId}::uuid`)[0];
  const revalidation = (await db.$queryRaw<any[]>`SELECT id,execution_id,original_pin_id,original_revision,
    original_material_version,ready_pin_id,ready_revision,ready_pin_digest,commit,actor_user_id,created_at
    FROM completed_result_basis_revalidations WHERE execution_id=${id}::uuid ORDER BY sequence DESC LIMIT 1`)[0] ?? null;
  const pin = object(task.executionReadiness);
  const expectedVersion = reviewDigest({ executionId: id, originalMaterialVersion: material.original,
    materialVersion: material.current, readyPinDigest: material.pin_digest });
  return { execution, task, pin, revalidation, expectedVersion, materialVersion: material.current as string,
    originalMaterialVersion: material.original as string, readyPinDigest: material.pin_digest as string };
}
const projection = (s: Exclude<Awaited<ReturnType<typeof load>>, { error: string }>) => ({
  executionId: s.execution.id, materialVersion: s.materialVersion, originalMaterialVersion: s.originalMaterialVersion,
  readyPinId: s.pin.pinId ?? null, readyRevision: s.pin.revision ?? null,
  commit: object(object(s.execution.metadata).resultRevision).commit ?? null,
  expectedVersion: s.expectedVersion, revalidation: s.revalidation,
  reason: completedResultBasisEligibility(s.execution, s.pin) });

export async function completedResultBasisView(db: Db, workspaceId: string, id: string, auth: AuthContext) {
  if (!await owner(db, workspaceId, auth)) return { error: "completed_result_owner_required" };
  const state = await load(db, workspaceId, id);
  return "error" in state ? state : projection(state);
}

// Return an in-memory validation envelope only. No persisted pin, native result,
// checkpoint, output, test receipt or original provenance is replaced.
export async function effectiveCompletedResult(db: Db, workspaceId: string, execution: any) {
  if (!execution) return execution;
  const row = (await db.$queryRaw<any[]>`SELECT completed_result_basis_current(e) AS current,
    (SELECT r.ready_pin FROM completed_result_basis_revalidations r WHERE r.execution_id=e.id ORDER BY r.sequence DESC LIMIT 1) AS pin
    FROM agent_executions e WHERE e.id=${execution.id}::uuid AND e.workspace_id=${workspaceId}::uuid`)[0];
  if (!row?.current || !row.pin) return execution;
  const pin = row.pin;
  return { ...execution, metadata: { ...object(execution.metadata), readyContextPin: {
    pinId: pin.pinId, revision: pin.revision, riskAdmissionSeal: pin.riskAdmissionSeal,
    riskAdmissionCommit: pin.riskAdmissionCommit, compositionSeal: pin.procedureComposition?.seal } } };
}

// A rejection deliberately closes Ready. Its manager may still dispose of the
// exact rejected material, but this envelope never grants review or release.
export async function effectiveRejectedResultForDisposition(db: Db, workspaceId: string, execution: any) {
  if (!execution) return execution;
  const row = (await db.$queryRaw<any[]>`SELECT completed_result_rejection_disposition_current(e) AS current,
    (SELECT r.ready_pin FROM completed_result_basis_revalidations r WHERE r.execution_id=e.id ORDER BY r.sequence DESC LIMIT 1) AS pin
    FROM agent_executions e WHERE e.id=${execution.id}::uuid AND e.workspace_id=${workspaceId}::uuid`)[0];
  if (!row?.current || !row.pin) return execution;
  const pin = row.pin;
  return { ...execution, metadata: { ...object(execution.metadata), readyContextPin: {
    pinId: pin.pinId, revision: pin.revision, riskAdmissionSeal: pin.riskAdmissionSeal,
    riskAdmissionCommit: pin.riskAdmissionCommit, compositionSeal: pin.procedureComposition?.seal } } };
}

export async function revalidateCompletedResultBasis(db: Db, workspaceId: string, id: string, auth: AuthContext, body: unknown) {
  const input = completedResultBasisSchema.parse(body);
  if (!await owner(db, workspaceId, auth)) return { error: "completed_result_owner_required" };
  const requestHash = reviewDigest({ input, id, actorUserId: auth.userId });
  const state = await load(db, workspaceId, id, true);
  if ("error" in state) return state;
  const prior = (await db.$queryRaw<any[]>`SELECT id,execution_id,request_hash FROM completed_result_basis_revalidations
    WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
  if (prior) return prior.execution_id === id && prior.request_hash === requestHash
    ? { ...projection(state), revalidationId: prior.id, replayed: true }
    : { error: "completed_result_request_conflict" };
  // Historical approvals stay in the ledger, but cannot approve a changed
  // Ready/material. A rejection always requires the governed correction path.
  if ((await db.$queryRaw<any[]>`SELECT completed_result_review_blocks_revalidation(e) AS blocked
    FROM agent_executions e WHERE id=${id}::uuid AND workspace_id=${workspaceId}::uuid`)[0]?.blocked)
    return { error: "completed_result_already_reviewed" };
  const latest = await db.agentExecution.findFirst({ where: { workspaceId, taskId: state.task.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } });
  if (latest?.id !== id) return { error: "completed_result_superseded" };
  const error = completedResultBasisEligibility(state.execution, state.pin);
  if (error) return { error };
  if (input.expectedVersion !== state.expectedVersion || input.materialVersion !== state.materialVersion
    || input.readyPinId !== state.pin.pinId || input.readyRevision !== state.pin.revision
    || input.commit !== object(object(state.execution.metadata).resultRevision).commit)
    return { error: "completed_result_basis_stale" };
  const metadata = object(state.execution.metadata);
  const envelope = { ...state.execution, metadata: { ...metadata, readyContextPin: {
    pinId: state.pin.pinId, revision: state.pin.revision, riskAdmissionSeal: state.pin.riskAdmissionSeal,
    riskAdmissionCommit: state.pin.riskAdmissionCommit, compositionSeal: state.pin.procedureComposition?.seal } } };
  const current = await inspectReady(db, workspaceId, state.task.id, envelope, true);
  if ("error" in current || current.readiness.status !== "ready") return { error: "completed_result_current_context_required", readiness: current.readiness };
  const revalidationId = randomUUID(), originalPin = object(metadata.readyContextPin);
  await db.$executeRaw`INSERT INTO completed_result_basis_revalidations
    (id,workspace_id,task_id,execution_id,actor_user_id,original_pin_id,original_revision,original_material_version,
     ready_pin_id,ready_revision,ready_pin_digest,ready_pin,commit,request_id,request_hash)
    VALUES (${revalidationId}::uuid,${workspaceId}::uuid,${state.task.id}::uuid,${id}::uuid,${auth.userId}::uuid,
     ${originalPin.pinId}::uuid,${originalPin.revision},${state.originalMaterialVersion},${input.readyPinId}::uuid,
     ${input.readyRevision},${state.readyPinDigest},${JSON.stringify(state.pin)}::jsonb,${input.commit},${input.requestId}::uuid,${requestHash})`;
  await db.event.create({ data: { workspaceId, taskId: state.task.id, actorType: "user", actorId: auth.userId,
    type: "completed_result_basis_revalidated", source: "roost", resourceType: "agent_execution", resourceId: id,
    payload: { revalidationId, executionId: id, originalPinId: originalPin.pinId, readyPinId: input.readyPinId,
      readyRevision: input.readyRevision, commit: input.commit, independentReviewRequired: true } } });
  const saved = await load(db, workspaceId, id);
  if ("error" in saved) throw new Error("completed_result_basis_missing");
  return { ...projection(saved), revalidationId, replayed: false };
}
