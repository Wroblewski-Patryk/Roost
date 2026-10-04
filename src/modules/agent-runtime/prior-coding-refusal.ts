import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { workerClaimAllowed, workerTicketIdentitySchema } from "../../auth/worker-ticket-principal";
import { recoveryCheckpoint } from "./execution-recovery";

export const priorCodingRefusalInput = z.object({ leaseToken: z.string().uuid() }).strict();
const uuid = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/), commit = z.string().regex(/^[a-f0-9]{40}$/);
const receiptSchema = z.object({
  version: z.literal("roost-native-review-public-v2"), policy: z.literal("roost-root-scoped-coding-v2"),
  bindingDigest: hash, preFootprintDigest: hash, postFootprintDigest: hash, jobDigest: hash,
  changedPathIds: z.array(hash).max(0), categoryCounts: z.object({ content: z.literal(0), protected: z.literal(0) }).strict(),
  scopeReviewRequired: z.literal(false), refusalCode: z.null(), violations: z.array(z.string()).max(0),
  verdict: z.literal("verification_blocked"), reviewRequired: z.literal(true), releaseAllowed: z.literal(false),
  verification: z.literal("REFUSED"), installation: z.literal("PASS")
}).strict().refine(value => value.preFootprintDigest === value.postFootprintDigest);
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const empty = (value: unknown) => value == null || typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0;
const noResult = (row: any) => row.summary == null && row.finalResponse == null && Array.isArray(row.changedFiles)
  && row.changedFiles.length === 0 && empty(row.verification) && object(row.metadata).resultRevision == null;
const selected = { id: true, workspaceId: true, taskId: true, applicationId: true, agentHostId: true,
  status: true, attempt: true, completedAt: true, contextInvalidatedAt: true, cancelRequestedAt: true,
  leaseToken: true, leaseExpiresAt: true, checkpoint: true, metadata: true, errorState: true,
  summary: true, finalResponse: true, changedFiles: true, verification: true } as const;
const error = (status: 403 | 404 | 409, reason: string) => ({ error: reason, status });

// Called inside the normal Ready transaction. Reads only the predecessor
// explicitly pinned by the current authenticated lease; this grants no launch,
// cleanup, result acceptance or access to other execution history.
export async function priorCodingRefusal(db: Prisma.TransactionClient, auth: AuthContext, executionId: string,
  rawInput: unknown, now = new Date(), allowed = workerClaimAllowed) {
  const input = priorCodingRefusalInput.safeParse(rawInput), identity = workerTicketIdentitySchema.safeParse(auth.workerTicketIdentity);
  if (auth.authType !== "api_key" || !auth.apiKeyId || auth.agentId || auth.userId || !identity.success
      || identity.data.workspaceId !== auth.workspaceId) return error(403, "worker_credential_forbidden");
  if (!input.success || !uuid.safeParse(executionId).success || !Number.isFinite(now.getTime()))
    return error(409, "prior_coding_refusal_invalid_request");
  if (!await allowed(db, auth, identity.data.hostId, now)) return error(403, "worker_credential_forbidden");
  const current = await db.agentExecution.findFirst({ where: { id: executionId, workspaceId: auth.workspaceId,
    agentHostId: identity.data.hostId }, select: selected });
  if (!current) return error(404, "agent_execution_not_found");
  const metadata = object(current.metadata), contract = object(metadata.executionContract), pin = object(metadata.readyContextPin);
  const checkpoint = recoveryCheckpoint.safeParse(current.checkpoint), predecessor = uuid.safeParse(metadata.predecessorExecutionId);
  const branch = object(contract.singleTask).branch;
  if (!["claimed", "running"].includes(current.status) || current.attempt !== 1 || current.completedAt !== null
      || current.contextInvalidatedAt !== null || current.cancelRequestedAt !== null || !current.applicationId
      || current.leaseToken !== input.data.leaseToken || !current.leaseExpiresAt || current.leaseExpiresAt <= now
      || !checkpoint.success || checkpoint.data.stage !== "claimed" || !noResult(current) || !empty(current.errorState)
      || object(contract.nativeBoundary).profile !== "coding-local" || branch !== `codex/task-${current.taskId}`
      || !commit.safeParse(pin.riskAdmissionCommit).success || !hash.safeParse(pin.revision).success
      || !predecessor.success || predecessor.data === current.id)
    return error(409, "prior_coding_refusal_not_pinned");
  const prior = await db.agentExecution.findFirst({ where: { id: predecessor.data, workspaceId: current.workspaceId,
    taskId: current.taskId, applicationId: current.applicationId, agentHostId: current.agentHostId }, select: selected });
  if (!prior) return error(404, "prior_coding_refusal_not_found");
  const priorMetadata = object(prior.metadata), previous = object(priorMetadata.executionContract), previousPin = object(priorMetadata.readyContextPin);
  const previousCheckpoint = recoveryCheckpoint.safeParse(prior.checkpoint), failure = object(prior.errorState), details = object(failure.details);
  const receipt = receiptSchema.safeParse(details.nativeReviewReceipt);
  if (["workspaceId", "taskId", "applicationId", "agentHostId"].some(key => (prior as any)[key] !== (current as any)[key])
      || prior.id !== predecessor.data || prior.status !== "failed" || prior.attempt !== 1
      || !prior.completedAt || !Number.isFinite(prior.completedAt.getTime()) || prior.completedAt > now
      || prior.leaseToken !== null || prior.leaseExpiresAt !== null || prior.contextInvalidatedAt !== null || prior.cancelRequestedAt !== null
      || !noResult(prior) || object(previous.nativeBoundary).profile !== "coding-local" || object(previous.singleTask).branch !== branch
      || previousPin.riskAdmissionCommit !== pin.riskAdmissionCommit || !hash.safeParse(previousPin.revision).success
      || !previousCheckpoint.success || previousCheckpoint.data.stage !== "spawn_intent"
      || previousCheckpoint.data.branch !== branch || previousCheckpoint.data.headCommit !== pin.riskAdmissionCommit
      || !hash.safeParse(previousCheckpoint.data.contextRevision).success
      || failure.code !== "agent_native_review_blocked" || failure.retryable !== false
      || !receipt.success || !hash.safeParse(details.nativeReviewReceiptDigest).success)
    return error(409, "prior_coding_refusal_invalid");
  return { data: { id: prior.id, workspaceId: prior.workspaceId, taskId: prior.taskId, applicationId: prior.applicationId,
    agentHostId: prior.agentHostId, status: prior.status, attempt: prior.attempt, completedAt: prior.completedAt,
    leaseToken: null, leaseExpiresAt: null, contextInvalidatedAt: null, summary: null, finalResponse: null, changedFiles: [],
    metadata: { executionContract: { nativeBoundary: { profile: "coding-local" }, singleTask: { branch } },
      readyContextPin: { riskAdmissionCommit: previousPin.riskAdmissionCommit, revision: previousPin.revision } },
    checkpoint: { stage: "spawn_intent", branch, headCommit: previousCheckpoint.data.headCommit },
    errorState: { code: "agent_native_review_blocked", retryable: false,
      details: { nativeReviewReceipt: receipt.data, nativeReviewReceiptDigest: details.nativeReviewReceiptDigest } } } };
}
