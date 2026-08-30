import { randomUUID } from "node:crypto";
import { AgentExecutionStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { createEvent } from "../events/event.service";

const jsonRecord = z.record(z.unknown());
const hostSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9._-]*$/),
  platform: z.string().trim().min(1).max(120),
  capabilities: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  applicationSlugs: z.array(z.string().trim().min(1).max(120)).max(200).default([]),
  metadata: jsonRecord.default({})
}).strict();
const createExecutionSchema = z.object({
  taskId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  prompt: z.string().trim().max(20000).optional(),
  baseBranch: z.string().trim().max(240).optional(),
  metadata: jsonRecord.default({})
}).strict();
const claimSchema = z.object({ hostSlug: z.string().trim().min(1).max(120) }).strict();
const leaseSchema = z.object({ leaseToken: z.string().uuid() }).strict();
const heartbeatSchema = leaseSchema.extend({
  codexThreadId: z.string().trim().max(240).nullable().optional(),
  status: z.enum(["claimed", "running", "waiting_for_approval"]).optional(),
  metadata: jsonRecord.optional()
}).strict();
const executionEventSchema = leaseSchema.extend({
  type: z.string().trim().min(1).max(120),
  level: z.enum(["debug", "info", "warning", "error"]).default("info"),
  message: z.string().trim().min(1).max(10000),
  payload: jsonRecord.default({})
}).strict();
const completeSchema = leaseSchema.extend({
  summary: z.string().trim().min(1).max(10000),
  finalResponse: z.string().max(100000).optional(),
  codexThreadId: z.string().trim().max(240).nullable().optional(),
  changedFiles: z.array(z.string().max(1000)).max(2000).default([]),
  verification: jsonRecord.default({}),
  usage: jsonRecord.default({}),
  metadata: jsonRecord.optional()
}).strict();
const failSchema = leaseSchema.extend({
  code: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(10000),
  retryable: z.boolean().default(true),
  details: jsonRecord.default({})
}).strict();

const executionInclude = {
  task: { include: { project: { select: { id: true, name: true } }, goal: { select: { id: true, title: true } }, taskList: { select: { id: true, name: true } } } },
  application: { include: { repositories: true } },
  agentHost: true,
  events: { orderBy: { createdAt: "asc" as const }, take: 500 }
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function actor(req: Express.Request) {
  return {
    requestedByType: req.auth!.authType === "user" ? "user" as const : "agent" as const,
    requestedById: req.auth!.userId ?? req.auth!.apiKeyId ?? null
  };
}

function executionEnabled() {
  return process.env.ROOST_CODEX_EXECUTION_ENABLED === "true";
}

async function appendExecutionEvent(params: { workspaceId: string; executionId: string; type: string; message: string; level?: string; payload?: unknown }) {
  return prisma.agentExecutionEvent.create({
    data: {
      workspaceId: params.workspaceId,
      executionId: params.executionId,
      type: params.type,
      message: params.message,
      level: params.level ?? "info",
      payload: json(params.payload ?? {})
    }
  });
}

async function applicationForTask(workspaceId: string, taskId: string, requestedApplicationId?: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId }, include: { project: true } });
  if (!task) return { task: null, application: null, error: "task_not_found" } as const;
  if (!task.projectId) return { task, application: null, error: "task_application_required" } as const;
  if (requestedApplicationId) {
    const link = await prisma.applicationProject.findFirst({
      where: { projectId: task.projectId, applicationId: requestedApplicationId, application: { workspaceId } },
      include: { application: { include: { repositories: true } } }
    });
    const application = link?.application ?? null;
    return application ? { task, application, error: null } as const : { task, application: null, error: "application_not_found" } as const;
  }
  const links = await prisma.applicationProject.findMany({ where: { projectId: task.projectId, application: { workspaceId } }, include: { application: { include: { repositories: true } } } });
  if (links.length !== 1) return { task, application: null, error: links.length ? "task_application_ambiguous" : "task_application_required" } as const;
  return { task, application: links[0]!.application, error: null } as const;
}

export const agentRuntimeRouter = Router();

agentRuntimeRouter.get("/readiness", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [applications, hosts, executionCounts, triggerRule] = await Promise.all([
    prisma.application.findMany({
      where: { workspaceId },
      include: { repositories: true, projects: { include: { project: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.agentHost.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" } }),
    prisma.agentExecution.groupBy({ by: ["status"], where: { workspaceId }, _count: { _all: true } }),
    prisma.automationRule.findFirst({
      where: { workspaceId, name: "Prepare Codex candidate after explicit task readiness" },
      include: { triggers: true }
    })
  ]);
  const mappedSlugs = new Set(hosts.flatMap((host) => Array.isArray(host.applicationSlugs) ? host.applicationSlugs.filter((value): value is string => typeof value === "string") : []));
  const records = applications.map((application) => {
    const metadata = application.metadata && typeof application.metadata === "object" && !Array.isArray(application.metadata) ? application.metadata as Record<string, unknown> : {};
    const primaryRepository = application.repositories.find((repository) => repository.isPrimary) ?? application.repositories[0] ?? null;
    const checks = {
      repository: Boolean(primaryRepository?.url),
      deployment: typeof metadata.deploymentUrl === "string" || Boolean(application.frontendUrl),
      localMapping: typeof metadata.localDirectory === "string" && typeof metadata.localWorkspaceRoot === "string",
      deliveryProject: application.projects.length === 1,
      hostAdvertised: mappedSlugs.has(application.slug)
    };
    return { id: application.id, name: application.name, slug: application.slug, checks, readyForHost: checks.repository && checks.deployment && checks.localMapping && checks.deliveryProject, project: application.projects[0]?.project ?? null, repository: primaryRepository, deploymentUrl: metadata.deploymentUrl ?? application.frontendUrl ?? null };
  });
  res.json({
    data: {
      executionEnabled: executionEnabled(),
      mode: executionEnabled() ? "supervised_execution" : "foundation_only",
      applications: records,
      hosts,
      triggerPolicy: triggerRule,
      executionCounts: Object.fromEntries(executionCounts.map((item) => [item.status, item._count._all])),
      activationRequirements: ["review_application_context", "validate_local_allowlist", "create_scoped_worker_key", "start_windows_host", "run_non_critical_trial", "explicitly_enable_runtime"]
    }
  });
}));

agentRuntimeRouter.get("/hosts", asyncHandler(async (req, res) => {
  await prisma.agentHost.updateMany({
    where: { workspaceId: req.auth!.workspaceId, status: "online", lastSeenAt: { lt: new Date(Date.now() - 60_000) } },
    data: { status: "offline" }
  });
  const hosts = await prisma.agentHost.findMany({ where: { workspaceId: req.auth!.workspaceId }, orderBy: { updatedAt: "desc" } });
  res.json({ data: hosts });
}));

agentRuntimeRouter.post("/hosts/register", asyncHandler(async (req, res) => {
  const input = hostSchema.parse(req.body);
  const now = new Date();
  const disabled = await prisma.agentHost.findUnique({ where: { workspaceId_slug: { workspaceId: req.auth!.workspaceId, slug: input.slug } }, select: { status: true } });
  if (disabled?.status === "disabled") return sendApiError(res, 409, "agent_host_disabled");
  const host = await prisma.agentHost.upsert({
    where: { workspaceId_slug: { workspaceId: req.auth!.workspaceId, slug: input.slug } },
    create: { ...input, capabilities: json(input.capabilities), applicationSlugs: json(input.applicationSlugs), metadata: json(input.metadata), workspaceId: req.auth!.workspaceId, status: "online", lastSeenAt: now },
    update: { name: input.name, platform: input.platform, capabilities: json(input.capabilities), applicationSlugs: json(input.applicationSlugs), metadata: json(input.metadata), status: "online", lastSeenAt: now }
  });
  res.json({ data: host });
}));

agentRuntimeRouter.post("/hosts/:id/heartbeat", asyncHandler(async (req, res) => {
  const input = hostSchema.partial().pick({ capabilities: true, applicationSlugs: true, metadata: true }).parse(req.body ?? {});
  const existing = await prisma.agentHost.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, status: { not: "disabled" } } });
  if (!existing) return sendApiError(res, 404, "agent_host_not_found");
  const host = await prisma.agentHost.update({ where: { id: existing.id }, data: { status: "online", lastSeenAt: new Date(), ...(input.capabilities ? { capabilities: json(input.capabilities) } : {}), ...(input.applicationSlugs ? { applicationSlugs: json(input.applicationSlugs) } : {}), ...(input.metadata ? { metadata: json(input.metadata) } : {}) } });
  res.json({ data: host });
}));

agentRuntimeRouter.get("/executions", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" && Object.values(AgentExecutionStatus).includes(req.query.status as AgentExecutionStatus) ? req.query.status as AgentExecutionStatus : undefined;
  const taskId = typeof req.query.taskId === "string" ? req.query.taskId : undefined;
  const applicationId = typeof req.query.applicationId === "string" ? req.query.applicationId : undefined;
  const executions = await prisma.agentExecution.findMany({ where: { workspaceId: req.auth!.workspaceId, ...(status ? { status } : {}), ...(taskId ? { taskId } : {}), ...(applicationId ? { applicationId } : {}) }, include: executionInclude, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ data: executions });
}));

agentRuntimeRouter.get("/executions/:id", asyncHandler(async (req, res) => {
  const execution = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }, include: executionInclude });
  if (!execution) return sendApiError(res, 404, "agent_execution_not_found");
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions", asyncHandler(async (req, res) => {
  if (!executionEnabled()) return sendApiError(res, 409, "agent_execution_disabled");
  const input = createExecutionSchema.parse(req.body);
  const resolved = await applicationForTask(req.auth!.workspaceId, input.taskId, input.applicationId);
  if (resolved.error) return sendApiError(res, resolved.error === "task_not_found" || resolved.error === "application_not_found" ? 404 : 422, resolved.error);
  const active = await prisma.agentExecution.findFirst({ where: { workspaceId: req.auth!.workspaceId, taskId: resolved.task!.id, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } });
  if (active) return res.status(409).json({ error: "task_agent_execution_active", data: { executionId: active.id } });
  const execution = await prisma.agentExecution.create({
    data: { workspaceId: req.auth!.workspaceId, taskId: resolved.task!.id, applicationId: resolved.application!.id, prompt: input.prompt, baseBranch: input.baseBranch, metadata: json(input.metadata), ...actor(req) },
    include: executionInclude
  });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "queued", message: "Codex execution queued for a local agent host." });
  await createEvent({ type: "agent_execution_queued", workspaceId: req.auth!.workspaceId, taskId: execution.taskId, projectId: execution.task.projectId, resourceType: "agent_execution", resourceId: execution.id, source: "roost", payload: { executionId: execution.id, applicationId: execution.applicationId } });
  res.status(201).json({ data: execution });
}));

agentRuntimeRouter.post("/executions/claim", asyncHandler(async (req, res) => {
  if (!executionEnabled()) return res.status(204).send();
  const input = claimSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const host = await prisma.agentHost.findFirst({ where: { workspaceId, slug: input.hostSlug, status: { not: "disabled" } } });
  if (!host) return sendApiError(res, 404, "agent_host_not_found");
  const applicationSlugs = Array.isArray(host.applicationSlugs) ? host.applicationSlugs.filter((value): value is string => typeof value === "string") : [];
  const now = new Date();
  await prisma.agentExecution.updateMany({ where: { workspaceId, status: { in: ["claimed", "running", "waiting_for_approval"] }, leaseExpiresAt: { lt: now }, cancelRequestedAt: null }, data: { status: "queued", agentHostId: null, leaseToken: null, leaseExpiresAt: null } });
  await prisma.agentExecution.updateMany({ where: { workspaceId, status: { in: ["claimed", "running", "waiting_for_approval"] }, leaseExpiresAt: { lt: now }, cancelRequestedAt: { not: null } }, data: { status: "cancelled", completedAt: now, leaseToken: null, leaseExpiresAt: null } });
  if (!applicationSlugs.length) return res.status(204).send();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await prisma.agentExecution.findFirst({ where: { workspaceId, status: "queued", cancelRequestedAt: null, ...(applicationSlugs.length ? { application: { slug: { in: applicationSlugs } } } : {}) }, orderBy: { createdAt: "asc" } });
    if (!candidate) return res.status(204).send();
    const leaseToken = randomUUID();
    const claimed = await prisma.agentExecution.updateMany({ where: { id: candidate.id, workspaceId, status: "queued" }, data: { status: "claimed", agentHostId: host.id, leaseToken, leaseExpiresAt: new Date(Date.now() + 90_000), lastHeartbeatAt: now, startedAt: candidate.startedAt ?? now, attempt: { increment: 1 } } });
    if (!claimed.count) continue;
    await prisma.agentHost.update({ where: { id: host.id }, data: { status: "online", lastSeenAt: now } });
    await appendExecutionEvent({ workspaceId, executionId: candidate.id, type: "claimed", message: `Execution claimed by ${host.name}.`, payload: { hostId: host.id, attempt: candidate.attempt + 1 } });
    const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: candidate.id }, include: executionInclude });
    if (execution.task.status === "todo") await prisma.task.update({ where: { id: execution.taskId }, data: { status: "in_progress" } });
    return res.json({ data: execution });
  }
  return res.status(409).json({ error: "agent_execution_claim_conflict" });
}));

agentRuntimeRouter.post("/executions/:id/heartbeat", asyncHandler(async (req, res) => {
  const input = heartbeatSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  if (existing.cancelRequestedAt) return res.status(409).json({ error: "agent_execution_cancel_requested", data: { cancelRequested: true } });
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { status: input.status ?? (existing.status === "claimed" ? "running" : existing.status), codexThreadId: input.codexThreadId === undefined ? existing.codexThreadId : input.codexThreadId, lastHeartbeatAt: new Date(), leaseExpiresAt: new Date(Date.now() + 90_000), ...(input.metadata ? { metadata: json(input.metadata) } : {}) } });
  res.json({ data: { id: execution.id, status: execution.status, cancelRequested: false, leaseExpiresAt: execution.leaseExpiresAt } });
}));

agentRuntimeRouter.post("/executions/:id/events", asyncHandler(async (req, res) => {
  const input = executionEventSchema.parse(req.body);
  const execution = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!execution) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const event = await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: input.type, level: input.level, message: input.message, payload: input.payload });
  res.status(201).json({ data: event });
}));

agentRuntimeRouter.post("/executions/:id/actions/complete", asyncHandler(async (req, res) => {
  const input = completeSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } }, include: { task: true } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { status: "completed", summary: input.summary, finalResponse: input.finalResponse, codexThreadId: input.codexThreadId === undefined ? existing.codexThreadId : input.codexThreadId, changedFiles: json(input.changedFiles), verification: json(input.verification), usage: json(input.usage), ...(input.metadata ? { metadata: json(input.metadata) } : {}), completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "completed", message: input.summary, payload: { changedFiles: input.changedFiles, verification: input.verification } });
  await prisma.evidenceRecord.create({ data: { workspaceId: req.auth!.workspaceId, entityType: "task", entityId: execution.taskId, type: "manual_verification", source: "agent", reference: `Codex execution ${execution.id}`, description: input.summary, metadata: json({ executionId: execution.id, applicationId: execution.applicationId, changedFiles: input.changedFiles, verification: input.verification }) } });
  await createEvent({ type: "agent_execution_completed", workspaceId: req.auth!.workspaceId, taskId: execution.taskId, projectId: existing.task.projectId, resourceType: "agent_execution", resourceId: execution.id, source: "codex", payload: { executionId: execution.id, applicationId: execution.applicationId, changedFiles: input.changedFiles } });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/fail", asyncHandler(async (req, res) => {
  const input = failSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } }, include: { task: true } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { status: "failed", errorState: json({ code: input.code, message: input.message, retryable: input.retryable, details: input.details }), completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "failed", level: "error", message: input.message, payload: { code: input.code, retryable: input.retryable } });
  await createEvent({ type: "agent_execution_failed", workspaceId: req.auth!.workspaceId, taskId: execution.taskId, projectId: existing.task.projectId, resourceType: "agent_execution", resourceId: execution.id, source: "codex", payload: { executionId: execution.id, code: input.code, retryable: input.retryable } });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/cancelled", asyncHandler(async (req, res) => {
  const input = leaseSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, cancelRequestedAt: { not: null }, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { status: "cancelled", completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "cancelled", level: "warning", message: "Local Codex execution stopped after an owner cancellation request." });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/cancel", asyncHandler(async (req, res) => {
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "agent_execution_not_found");
  if (["completed", "failed", "cancelled"].includes(existing.status)) return res.json({ data: existing });
  const immediate = existing.status === "queued";
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { cancelRequestedAt: new Date(), ...(immediate ? { status: "cancelled", completedAt: new Date(), leaseToken: null, leaseExpiresAt: null } : {}) } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "cancel_requested", level: "warning", message: immediate ? "Queued execution cancelled." : "Cancellation requested; the local agent host will stop the run." });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/retry", asyncHandler(async (req, res) => {
  if (!executionEnabled()) return sendApiError(res, 409, "agent_execution_disabled");
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, status: { in: ["failed", "cancelled"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_not_retryable");
  const active = await prisma.agentExecution.findFirst({ where: { workspaceId: req.auth!.workspaceId, taskId: existing.taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } });
  if (active) return res.status(409).json({ error: "task_agent_execution_active", data: { executionId: active.id } });
  const execution = await prisma.agentExecution.create({ data: { workspaceId: existing.workspaceId, taskId: existing.taskId, applicationId: existing.applicationId, prompt: existing.prompt, baseBranch: existing.baseBranch, metadata: existing.metadata as Prisma.InputJsonValue, ...actor(req) }, include: executionInclude });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "queued", message: `Retry queued from execution ${existing.id}.`, payload: { previousExecutionId: existing.id } });
  res.status(201).json({ data: execution });
}));
