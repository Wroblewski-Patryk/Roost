import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AuthContext } from "../../auth/api-key.middleware";
import { proofLifetimeSeconds } from "../../auth/owner-action-proof";
import { workerClaimAllowed } from "../../auth/worker-ticket-principal";
import { hostCompatibility } from "./host-protocol";
import { hasSchedulerCapacity, schedulerResources, taskDependenciesComplete } from "./execution-scheduler";
import { inspectReady } from "./task-execution-readiness";
import { assertBoundExecutionContinuation } from "./task-execution-continuation";
import { companyRuntimeClass } from "./company-information-runtime";
import { recoveryCheckpoint } from "./execution-recovery";

type Db = Prisma.TransactionClient;
const uuid = z.string().uuid();
export const requestCriticalPreemptionSchema = z.object({
  requestId: uuid, incidentRecordId: uuid, incidentRevision: z.string().datetime(), incomingExecutionId: uuid,
  expectedVersion: z.number().int().positive(), reason: z.string().trim().min(12).max(1000)
}).strict();
export const preemptionStoppedSchema = z.object({
  leaseToken: uuid, expectedVersion: z.number().int().positive(), writerLockDigest: z.string().regex(/^[a-f0-9]{64}$/),
  replayOnly: z.literal(true).optional(),
  stop: z.object({ schemaVersion: z.literal("roost-preemption-stop-v1"), kind: z.literal("windows_job"),
    attempt: uuid, jobClosed: z.literal(true), activeProcesses: z.literal(0), cleanup: z.literal(true),
    terminationReason: z.enum(["lease_lost", "cancel", "root_exit"]) }).strict()
}).strict();

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function asJson(value: unknown): Prisma.InputJsonValue { return value as Prisma.InputJsonValue; }
async function qualifiedIncumbentCheckpoint(db: Db, execution: { id: string; workspaceId: string; checkpoint: unknown; metadata: unknown }) {
  const checkpoint = recoveryCheckpoint.safeParse(execution.checkpoint);
  if (!checkpoint.success) return null;
  if (["running", "effect_possible"].includes(checkpoint.data.stage)) return checkpoint.data;
  // The information runtime keeps its model boundary in a separate native
  // journal and does not advance the generic recovery stage. Its one-use
  // signed admission event is the minimum server-visible launch basis. A
  // pre-spawn race remains safe: without a Job receipt the Worker retains its
  // Writer and cannot acknowledge the stop.
  if (checkpoint.data.stage === "claimed" && (execution.metadata as any)?.executionContract?.executionClass === companyRuntimeClass
    && await db.agentExecutionEvent.count({ where: { workspaceId: execution.workspaceId, executionId: execution.id, type: "information_admitted" } }))
    return checkpoint.data;
  return null;
}

export async function requestCriticalPreemption(db: Db, actor: AuthContext, incumbentId: string, input: z.infer<typeof requestCriticalPreemptionSchema>) {
  const workspaceId = actor.workspaceId;
  if (actor.authType !== "user" || actor.workspaceRole !== "owner" || !actor.userId)
    return { error: "critical_preemption_owner_required" } as const;
  const age = Math.floor(Date.now() / 1000) - (actor.authenticatedAt ?? 0);
  if (age < 0 || age > proofLifetimeSeconds) return { error: "critical_preemption_fresh_owner_required" } as const;
  const [owner, membership] = await Promise.all([
    db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: actor.userId }, select: { id: true } }),
    db.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: actor.userId } }, select: { role: true } })
  ]);
  if (!owner || membership?.role !== "owner") return { error: "critical_preemption_owner_required" } as const;
  const incumbent = await db.agentExecution.findFirst({ where: { id: incumbentId, workspaceId, status: "running", cancelRequestedAt: null }, include: { agentHost: true, criticalPreemption: true } });
  if (!incumbent?.agentHostId || !incumbent.agentHost || !incumbent.leaseToken || !incumbent.leaseExpiresAt || incumbent.leaseExpiresAt <= new Date()
    || incumbent.checkpointVersion !== input.expectedVersion || incumbent.contextInvalidatedAt || incumbent.criticalPreemption)
    return { error: "critical_preemption_incumbent_invalid" } as const;
  // Match claim's lock order: host first, then the exact queued execution.
  // The incoming row cannot be claimed between eligibility and the CAS.
  await db.$queryRaw`SELECT id FROM agent_hosts WHERE id=${incumbent.agentHostId}::uuid FOR UPDATE`;
  await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${input.incomingExecutionId}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`;
  const previous = await qualifiedIncumbentCheckpoint(db, incumbent);
  if (!previous)
    return { error: "critical_preemption_checkpoint_unqualified" } as const;
  const incoming = await db.agentExecution.findFirst({ where: { id: input.incomingExecutionId, workspaceId, status: "queued", attempt: 0, cancelRequestedAt: null }, include: { task: true, application: true } });
  if (!incoming || incoming.id === incumbent.id || incoming.taskId === incumbent.taskId || incoming.task.priority !== "critical"
    || !["todo", "in_progress"].includes(incoming.task.status))
    return { error: "critical_preemption_incoming_invalid" } as const;
  if (!await taskDependenciesComplete(db, workspaceId, incoming.taskId)) return { error: "critical_preemption_dependencies_incomplete" } as const;
  const ready = await inspectReady(db, workspaceId, incoming.taskId, incoming);
  if (ready.error || !ready.pin || (await assertBoundExecutionContinuation(db, incoming, ready.pin)).error)
    return { error: "critical_preemption_ready_required" } as const;
  const host = await db.agentHost.findUniqueOrThrow({ where: { id: incumbent.agentHostId } });
  const resources = schedulerResources(host);
  if (!resources.ok || !hasSchedulerCapacity(resources.resources, incoming) || !hostCompatibility(host).compatible)
    return { error: "critical_preemption_host_unavailable" } as const;
  const slugs = Array.isArray(host.applicationSlugs) ? host.applicationSlugs : [];
  const capabilities = Array.isArray(host.capabilities) ? host.capabilities : [];
  if (incoming.applicationId ? !incoming.application || !slugs.includes(incoming.application.slug)
      : !capabilities.includes("company_information_runtime_v1") || (incoming.metadata as any)?.executionContract?.executionClass !== companyRuntimeClass)
    return { error: "critical_preemption_host_unqualified" } as const;
  await db.$queryRaw`SELECT id FROM company_records WHERE id=${input.incidentRecordId}::uuid AND workspace_id=${workspaceId}::uuid FOR SHARE`;
  const incident = await db.companyRecord.findFirst({ where: { id: input.incidentRecordId, workspaceId, recordType: "technical_incident", status: "active", priority: "critical" } });
  if (!incident) return { error: "critical_preemption_incident_invalid" } as const;
  if (incident.updatedAt.toISOString() !== input.incidentRevision)
    return { error: "critical_preemption_incident_changed" } as const;
  const incidentDigest = hash({ id: incident.id, updatedAt: incident.updatedAt, title: incident.title, description: incident.description,
    currentState: incident.currentState, desiredState: incident.desiredState, priority: incident.priority, status: incident.status, metadata: incident.metadata });
  const changed = await db.agentExecution.updateMany({ where: { id: incumbent.id, workspaceId, status: "running", cancelRequestedAt: null,
    checkpointVersion: input.expectedVersion, leaseToken: incumbent.leaseToken, leaseExpiresAt: { gt: new Date() } }, data: { cancelRequestedAt: new Date() } });
  if (!changed.count) return { error: "critical_preemption_conflict" } as const;
  const request = await db.criticalPreemption.create({ data: { id: input.requestId, workspaceId, incidentRecordId: incident.id,
    incidentRevision: incident.updatedAt, incidentDigest, criticalTaskId: incoming.taskId, incomingExecutionId: incoming.id,
    incumbentExecutionId: incumbent.id, hostId: host.id, ownerUserId: actor.userId, expectedVersion: input.expectedVersion,
    reason: input.reason } });
  await db.agentExecutionEvent.create({ data: { workspaceId, executionId: incumbent.id, type: "critical_preemption_requested", level: "warning",
    message: "Owner confirmed a critical incident and requested native stop.", payload: asJson({ requestId: request.id, incidentRecordId: incident.id, incidentRevision: incident.updatedAt.toISOString(), incidentDigest,
      incomingExecutionId: incoming.id, criticalTaskId: incoming.taskId, expectedVersion: input.expectedVersion }) } });
  return { request } as const;
}

export async function acknowledgeCriticalPreemption(db: Db, actor: AuthContext, incumbentId: string, input: z.infer<typeof preemptionStoppedSchema>) {
  if (actor.authType !== "api_key" || !actor.workerTicketIdentity) return { error: "worker_credential_forbidden" } as const;
  const execution = await db.agentExecution.findFirst({ where: { id: incumbentId, workspaceId: actor.workspaceId }, include: { criticalPreemption: true } });
  const request = execution?.criticalPreemption;
  if (!execution || !request || !execution.agentHostId || request.hostId !== execution.agentHostId
    || execution.attempt !== 1 || input.stop.attempt !== execution.id
    || request.expectedVersion !== input.expectedVersion || !await workerClaimAllowed(db, actor, execution.agentHostId))
    return { error: "critical_preemption_ack_invalid" } as const;
  const receipt = request.stopReceipt as Record<string, unknown> | null;
  if (request.status === "stopped") {
    if (execution.status !== "cancelled" || execution.checkpointVersion !== input.expectedVersion + 1
      || request.stoppedVersion !== input.expectedVersion + 1 || !request.stoppedCheckpoint
      || receipt?.leaseTokenDigest !== hash(input.leaseToken) || receipt?.writerLockDigest !== input.writerLockDigest
      || receipt?.hostId !== execution.agentHostId || receipt?.executionId !== execution.id
      || receipt?.checkpointVersion !== input.expectedVersion || receipt?.schemaVersion !== input.stop.schemaVersion
      || receipt?.kind !== input.stop.kind || receipt?.attempt !== input.stop.attempt
      || receipt?.jobClosed !== input.stop.jobClosed || receipt?.activeProcesses !== input.stop.activeProcesses
      || receipt?.cleanup !== input.stop.cleanup || receipt?.terminationReason !== input.stop.terminationReason)
      return { error: "critical_preemption_replay_mismatch" } as const;
    return { stopped: true, checkpointVersion: request.stoppedVersion, checkpoint: request.stoppedCheckpoint } as const;
  }
  if (input.replayOnly || request.status !== "requested" || execution.status !== "running"
    || execution.leaseToken !== input.leaseToken || !execution.cancelRequestedAt
    || execution.checkpointVersion !== input.expectedVersion)
    return { error: "critical_preemption_ack_invalid" } as const;
  const prior = await qualifiedIncumbentCheckpoint(db, execution);
  if (!prior)
    return { error: "critical_preemption_checkpoint_unqualified" } as const;
  // The bound Worker only constructs this claim from its in-process Windows
  // Job cleanup receipt. Roost stores that attestation; it cannot inspect the
  // remote kernel Job handle independently.
  const stop = { ...input.stop, writerLockDigest: input.writerLockDigest, leaseTokenDigest: hash(input.leaseToken), hostId: execution.agentHostId,
    executionId: execution.id, checkpointVersion: input.expectedVersion, observedAt: new Date().toISOString() };
  const checkpoint = prior;
  const stoppedAt = new Date();
  const changed = await db.agentExecution.updateMany({ where: { id: execution.id, workspaceId: actor.workspaceId, status: "running",
    leaseToken: input.leaseToken, checkpointVersion: input.expectedVersion, cancelRequestedAt: { not: null } }, data: {
    status: "cancelled", completedAt: stoppedAt, leaseToken: null, leaseExpiresAt: null,
    checkpoint: asJson(checkpoint), checkpointVersion: { increment: 1 },
    errorState: asJson({ code: "critical_preemption_stopped", retryable: false, requestId: request.id })
  } });
  if (!changed.count) return { error: "critical_preemption_ack_conflict" } as const;
  await db.criticalPreemption.update({ where: { id: request.id }, data: { status: "stopped", stopReceipt: asJson(stop),
    stoppedCheckpoint: asJson(checkpoint), stoppedVersion: input.expectedVersion + 1, stoppedAt } });
  await db.agentExecutionEvent.create({ data: { workspaceId: actor.workspaceId, executionId: execution.id,
    type: "critical_preemption_stopped", level: "warning", message: "Bound Worker attested native Job stop; execution checkpoint sealed.",
    payload: asJson({ requestId: request.id, checkpointVersion: input.expectedVersion + 1, writerLockDigest: input.writerLockDigest }) } });
  return { stopped: true, checkpointVersion: input.expectedVersion + 1, checkpoint } as const;
}
