import { executionProviderRegistry, projectProvider, sanitizeProviderMetadata } from "./execution-provider";
import { interviewView,interviewCommand } from "./task-interview";
import { clarificationView,clarificationCommand } from "./task-clarification";
import { taskHandoffView, handoffCommand } from "./task-handoff";
import { reviewTransaction } from "./task-capability-admission";
import { capabilitySuspensionRouter, suspensionBlocks } from "./capability-suspension";
import { taskCapabilityView, issueTaskCapability, revokeTaskCapability } from "./task-capability";
import { isDeepStrictEqual } from "node:util";
import { taskReviewView, recordTaskReview, actOnTaskReview } from "./task-review";
import { inspectReady, lockReadyTask, readyTransaction, submitReady, readyEditorData } from "./task-execution-readiness";
import { taskRiskView, prepareRiskScope, recordRiskAssessment } from "./task-risk";
import { acknowledgeContextStop, contextStopCode, guardExecutionContext } from "./execution-context-stop";
import { requireWorkspaceRole, roleAtLeast } from "../../auth/workspace-access";
import { randomUUID } from "node:crypto";
import { AgentExecutionStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { createEvent } from "../events/event.service";
import { nextCheckpointStage, recoveryCheckpoint, recoveryMessage, recoveryReasons } from "./execution-recovery";
import { protocol, hostCompatibility, requestCompatibility } from "./host-protocol";
import type { Request, Response } from "express";

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
const claimSchema = z.object({ hostSlug: z.string().trim().min(1).max(120), sessionId: z.string().uuid().optional() }).strict();
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
  resultRevision: z.object({commit:z.string().regex(/^[a-f0-9]{40}$/),branch:z.string().min(1).max(240),workingTree:z.enum(["clean","dirty"])}).strict().optional(),
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

function hostRuntime(host: { workspaceId: string; metadata: unknown; capabilities: unknown }) {
  const compatibility = hostCompatibility(host);
  const metadata = host.metadata && typeof host.metadata === "object" && !Array.isArray(host.metadata) ? host.metadata as Record<string, unknown> : {};
  const clientReasons = Array.isArray(metadata.executionUnavailableReasons) ? metadata.executionUnavailableReasons.filter((value): value is string => typeof value === "string" && ["api_protocol_missing", "api_protocol_mismatch", "api_capabilities_missing", "api_contract_invalid", "api_unavailable", "execution_reconciliation_required"].includes(value)) : [];
  return { workspaceId: host.workspaceId, executionEnabled: executionEnabled(), mode: executionEnabled() ? "supervised_execution" : "foundation_only", protocol, compatibility, executionProvider: projectProvider(metadata.executionProvider),
    executionUnavailableReasons: [...new Set([...(compatibility.reason ? [compatibility.reason] : []), ...clientReasons, ...(metadata.executionMode === "supervised" && metadata.outputTokenBudgetEnforcement === "unavailable" ? ["output_token_limit_unsupported"] : []), ...(!executionEnabled() ? ["runtime_disabled"] : [])])] };
}

function visibleHost<T extends { status: string; lastSeenAt: Date | null; workspaceId: string; metadata: unknown; capabilities: unknown }>(host: T) {
  return { ...host, metadata: sanitizeProviderMetadata(host.metadata), runtime: hostRuntime(host), status: host.status === "online" && (!host.lastSeenAt || host.lastSeenAt.getTime() < Date.now() - 60_000) ? "offline" : host.status };
}

function protocolBlocked(req: Request, res: Response, host: { metadata: unknown; capabilities: unknown }) {
  const admission = requestCompatibility(host, req.headers["x-roost-host-protocol"], req.headers["x-roost-host-capabilities"]);
  if (admission.compatible) return false;
  sendApiError(res, 409, "agent_host_protocol_blocked", { message: "Host/API compatibility is not confirmed; execution is blocked.", details: admission });
  return true;
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
    if (application?.slug === "roost") return { task, application: null, error: "roost_self_development_excluded" } as const;
    return application ? { task, application, error: null } as const : { task, application: null, error: "application_not_found" } as const;
  }
  const links = await prisma.applicationProject.findMany({ where: { projectId: task.projectId, application: { workspaceId } }, include: { application: { include: { repositories: true } } } });
  if (links.length !== 1) return { task, application: null, error: links.length ? "task_application_ambiguous" : "task_application_required" } as const;
  if (links[0]!.application.slug === "roost") return { task, application: null, error: "roost_self_development_excluded" } as const;
  return { task, application: links[0]!.application, error: null } as const;
}

export const agentRuntimeRouter = Router();
agentRuntimeRouter.use("/capability-suspensions", capabilitySuspensionRouter);

agentRuntimeRouter.get("/tasks/:id/interviews",asyncHandler(async(req,res)=>{
 const result=await reviewTransaction(db=>interviewView(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,z.string().uuid().optional().parse(req.query.caseId)));
 if("error" in result)return sendApiError(res,result.error?.endsWith("not_found")?404:result.error==="interview_forbidden"?403:409,result.error!);
 res.json({data:result});
}));
const interviewHandler=(kind:"publish"|"respond")=>asyncHandler(async(req,res)=>{
 const result=await reviewTransaction(db=>interviewCommand(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,kind,req.body));
 if("error" in result)return sendApiError(res,result.error?.endsWith("not_found")?404:result.error==="interview_forbidden"?403:409,result.error!);
 res.status(result.replayed?200:201).json({data:result});
});
agentRuntimeRouter.post("/tasks/:id/interviews",interviewHandler("publish"));
agentRuntimeRouter.post("/tasks/:id/interviews/actions/respond",interviewHandler("respond"));

agentRuntimeRouter.get("/tasks/:id/clarifications",asyncHandler(async(req,res)=>{
 const query=z.object({relatedTaskId:z.string().uuid().optional(),threadId:z.string().uuid().optional(),before:z.coerce.number().int().min(1).max(501).optional()}).strict().parse(req.query);
 const result=await reviewTransaction(db=>clarificationView(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,query));
 if("error" in result)return sendApiError(res,result.error?.endsWith("not_found")?404:result.error==="clarification_forbidden"?403:409,result.error!);
 res.json({data:result});
}));
const clarificationHandler=(action:"send"|"reply"|"read")=>asyncHandler(async(req,res)=>{
 if(req.auth!.authType==="user"?!roleAtLeast(req.auth!.workspaceRole,"member"):!req.auth!.agentId)return sendApiError(res,403,"clarification_forbidden");
 const result=await reviewTransaction(db=>clarificationCommand(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,action,req.body));
 if("error" in result)return sendApiError(res,result.error?.endsWith("not_found")?404:result.error==="clarification_forbidden"?403:409,result.error!);
 res.status(result.replayed?200:201).json({data:result});
});
agentRuntimeRouter.post("/tasks/:id/clarifications",clarificationHandler("send"));
agentRuntimeRouter.post("/tasks/:id/clarifications/actions/reply",clarificationHandler("reply"));
agentRuntimeRouter.post("/tasks/:id/clarifications/actions/read",clarificationHandler("read"));

agentRuntimeRouter.get("/tasks/:id/handoffs", asyncHandler(async(req,res)=>{
 const result=await readyTransaction(db=>taskHandoffView(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,z.string().uuid().optional().parse(req.query.cursor)));
 if("error" in result)return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
 res.json({data:result});
}));
const handoffHandler=(action:"create"|"accept"|"reject")=>asyncHandler(async(req,res)=>{
 if(req.auth!.authType==="user"?!roleAtLeast(req.auth!.workspaceRole,"member"):!req.auth!.agentId)return sendApiError(res,403,"task_handoff_forbidden");
 if(action!=="create"&&req.body?.decision!==action)return sendApiError(res,400,"task_handoff_decision_mismatch");
 const result=await reviewTransaction(db=>handoffCommand(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!,action==="create"?"create":"decision",req.body));
 if("error" in result)return sendApiError(res,result.error?.endsWith("not_found")?404:result.error==="task_handoff_forbidden"?403:409,result.error!);
 res.status(result.replayed?200:201).json({data:result});
});
agentRuntimeRouter.post("/tasks/:id/handoffs",handoffHandler("create"));
agentRuntimeRouter.post("/tasks/:id/handoffs/actions/accept",handoffHandler("accept"));
agentRuntimeRouter.post("/tasks/:id/handoffs/actions/reject",handoffHandler("reject"));

agentRuntimeRouter.get("/tasks/:id/capability-grants", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "admin")) return;
  const taskId = z.string().uuid().parse(req.params.id), cursor = z.string().uuid().optional().parse(req.query.cursor);
  const result = await readyTransaction(tx => taskCapabilityView(tx, req.auth!.workspaceId, taskId, req.auth!.userId!, cursor));
  if ("error" in result) return sendApiError(res, result.error === "task_not_found" ? 404 : 409, result.error!);
  res.json({ data: result });
}));
agentRuntimeRouter.post("/tasks/:id/capability-grants", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "admin")) return;
  const taskId = z.string().uuid().parse(req.params.id);
  const result = await reviewTransaction(tx => issueTaskCapability(tx, req.auth!.workspaceId, taskId, req.auth!.userId!, req.body));
  if ("error" in result) return sendApiError(res, result.error === "task_not_found" ? 404 : 409, result.error!);
  res.status(result.replayed ? 200 : 201).json({ data: result });
}));
agentRuntimeRouter.post("/tasks/:id/capability-grants/:grantId/actions/revoke", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "admin")) return;
  const taskId = z.string().uuid().parse(req.params.id), grantId = z.string().uuid().parse(req.params.grantId);
  const result = await reviewTransaction(tx => revokeTaskCapability(tx, req.auth!.workspaceId, taskId, grantId, req.auth!.userId!, req.body));
  if ("error" in result) return sendApiError(res, ["task_not_found", "capability_not_found"].includes(result.error!) ? 404 : 409, result.error!);
  res.json({ data: result });
}));
agentRuntimeRouter.get("/tasks/:id/review", asyncHandler(async (req, res) => {
  const taskId = z.string().uuid().parse(req.params.id), cursor = z.string().uuid().optional().parse(req.query.cursor);
  const result = await readyTransaction(tx => taskReviewView(tx, req.auth!.workspaceId, taskId, req.auth!, cursor));
  if ("error" in result) return sendApiError(res, result.error === "task_not_found" ? 404 : 409, result.error!);
  res.json({ data: result });
}));
agentRuntimeRouter.post("/tasks/:id/actions/review", asyncHandler(async (req, res) => {
  if (req.auth!.authType === "user" ? !roleAtLeast(req.auth!.workspaceRole, "member") : !req.auth!.agentId) return sendApiError(res, 403, "task_review_forbidden");
  const taskId = z.string().uuid().parse(req.params.id);
  const result = await reviewTransaction(tx => recordTaskReview(tx, req.auth!.workspaceId, taskId, req.auth!, req.body));
  if ("error" in result) return sendApiError(res, result.error === "task_not_found" ? 404 : result.error === "task_review_forbidden" ? 403 : 409, result.error!);
  res.json({ data: result });
}));
agentRuntimeRouter.post("/tasks/:id/actions/review-return", asyncHandler(async (req, res) => {
  if (req.auth!.authType === "user" ? !roleAtLeast(req.auth!.workspaceRole, "member") : !req.auth!.agentId) return sendApiError(res, 403, "task_review_forbidden");
  const taskId = z.string().uuid().parse(req.params.id);
  const result = await reviewTransaction(tx => actOnTaskReview(tx, req.auth!.workspaceId, taskId, req.auth!, req.body));
  if ("error" in result) return sendApiError(res, result.error === "task_not_found" ? 404 : result.error === "task_review_forbidden" ? 403 : 409, result.error!);
  res.json({ data: result });
}));

function executionReportMetadata(existing: Prisma.JsonValue, reported: Record<string, unknown>) {
  const prior = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const { executionContract: _contract, readyContextPin: _pin, resultRevision: _resultRevision, ...details } = reported;
  // Reports add runtime observations; only Ready/queue author the accepted contract and pin.
  return json({ ...prior, ...details });
}

agentRuntimeRouter.get("/tasks/:id/procedure-composition", asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,"viewer"))return;
 const {compositionView}=await import("./procedure-composition");
 const result=await readyTransaction(db=>compositionView(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!.userId!));
 if("error" in result)return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
 res.json({data:result});
}));
for(const kind of ["selection","exception"] as const) agentRuntimeRouter.post(`/tasks/:id/procedure-composition/${kind}`,asyncHandler(async(req,res)=>{
 if(!requireWorkspaceRole(req,res,kind==="exception"?"owner":"member"))return;
 const {compositionCommand}=await import("./procedure-composition");
 const result=await readyTransaction(db=>compositionCommand(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!.userId!,kind,req.body));
 if("error" in result)return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
 res.json({data:result});
}));
agentRuntimeRouter.get("/tasks/:id/risk-admission", asyncHandler(async (req,res) => {
  if (!requireWorkspaceRole(req,res,"viewer")) return;
  const {admissionView}=await import("./task-risk-admission");
  const result=await readyTransaction(db=>admissionView(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!.userId!));
  if ("error" in result) return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
  res.json({data:result});
}));
for (const kind of ["scope","evidence"] as const) agentRuntimeRouter.post(`/tasks/:id/risk-admission/${kind}`, asyncHandler(async(req,res)=>{
  if (!requireWorkspaceRole(req,res,"member")) return;
  const {admissionCommand}=await import("./task-risk-admission");
  const result=await readyTransaction(db=>admissionCommand(db,req.auth!.workspaceId,z.string().uuid().parse(req.params.id),req.auth!.userId!,kind,req.body));
  if ("error" in result) return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
  res.json({data:result});
}));
agentRuntimeRouter.get("/tasks/:id/risk", asyncHandler(async (req,res) => {
  if (!requireWorkspaceRole(req,res,"viewer")) return;
  const taskId=z.string().uuid().parse(req.params.id);
  const result=await readyTransaction(db=>taskRiskView(db,req.auth!.workspaceId,taskId,req.auth!.userId!));
  if ("error" in result) return sendApiError(res,result.error==="task_not_found"?404:409,result.error!);
  res.json({data:result});
}));
agentRuntimeRouter.post("/tasks/:id/risk/scope", asyncHandler(async (req,res) => {
  if (!requireWorkspaceRole(req,res,"member")) return;
  const taskId=z.string().uuid().parse(req.params.id);
  const result=await readyTransaction(db=>prepareRiskScope(db,req.auth!.workspaceId,taskId,req.auth!.userId!,req.body));
  if ("error" in result) return sendApiError(res,result.error==="task_not_found"?404:result.error==="task_risk_forbidden"?403:409,result.error!);
  res.json({data:result});
}));
agentRuntimeRouter.post("/tasks/:id/risk/assessments", asyncHandler(async (req,res) => {
  if (!requireWorkspaceRole(req,res,"member")) return;
  const taskId=z.string().uuid().parse(req.params.id);
  const result=await readyTransaction(db=>recordRiskAssessment(db,req.auth!.workspaceId,taskId,req.auth!.userId!,req.body));
  if ("error" in result) return sendApiError(res,result.error==="task_not_found"?404:result.error==="task_risk_forbidden"?403:409,result.error!);
  res.json({data:result});
}));

agentRuntimeRouter.post("/tasks/:id/actions/submit-for-execution", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "member")) return;
  const taskId = z.string().uuid().parse(req.params.id);
  const input = z.object({ requestId: z.string().uuid(), expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), applicationId: z.string().uuid(), contract: z.record(z.unknown()), prompt: z.string().max(20000).nullable().optional(), baseBranch: z.string().max(240).nullable().optional() }).strict().parse(req.body);
  const result = await readyTransaction(tx => submitReady(tx, req.auth!.workspaceId, taskId, input, actor(req)));
  if ("error" in result && result.error) return sendApiError(res, result.error === "task_not_found" ? 404 : result.error === "forbidden" ? 403 : 409, result.error, { details: result });
  res.json({ data: result });
}));

agentRuntimeRouter.get("/tasks/:id/execution-readiness", asyncHandler(async (req, res) => {
  const taskId = z.string().uuid().parse(req.params.id);
  const result = await readyTransaction(async tx => {
    const ready = await inspectReady(tx, req.auth!.workspaceId, taskId);
    if (ready.error === "task_not_found" || req.query.editor !== "1") return ready;
    const editor = await readyEditorData(tx, req.auth!.workspaceId, taskId, req.query.applicationId ? z.string().uuid().parse(req.query.applicationId) : undefined, req.auth!.userId ?? undefined);
    if (editor && "error" in editor) return { error: editor.error };
    return { ...ready, readiness: { ...ready.readiness, editor, canSubmit: req.auth!.authType === "user" && roleAtLeast(req.auth!.workspaceRole, "member"), executionEnabled: executionEnabled() } };
  });
  if ("error" in result && result.error === "task_not_found") return sendApiError(res, 404, result.error);
  if ("error" in result && result.error === "application_not_found") return sendApiError(res, 404, result.error);
  res.json({ data: "readiness" in result ? result.readiness : { status: "needs_revalidation", reason: result.error } });
}));

agentRuntimeRouter.get("/recovery", asyncHandler(async (req, res) => {
  const { hostSlug } = claimSchema.pick({ hostSlug: true }).parse(req.query);
  const host = await prisma.agentHost.findFirst({ where: { workspaceId: req.auth!.workspaceId, slug: hostSlug, status: { not: "disabled" } } });
  if (!host) return sendApiError(res, 404, "agent_host_not_found");
  if (protocolBlocked(req, res, host)) return;
  const executions = host ? await prisma.agentExecution.findMany({ where: { workspaceId: req.auth!.workspaceId, agentHostId: host.id, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } }, include: executionInclude, take: 3, orderBy: { createdAt: "asc" } }) : [];
  res.json({ data: { executionEnabled: executionEnabled(), executions: executions.map(({ leaseToken: _leaseToken, ...execution }) => execution) } });
}));

agentRuntimeRouter.post("/executions/:id/checkpoint", asyncHandler(async (req, res) => {
  const input = leaseSchema.extend({ expectedVersion: z.number().int().min(0), checkpoint: recoveryCheckpoint }).strict().parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, cancelRequestedAt: null, status: { in: ["claimed", "running"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  if (existing.contextInvalidatedAt) return sendApiError(res, 409, contextStopCode);
  const previous = recoveryCheckpoint.safeParse(existing.checkpoint);
  if (!input.checkpoint.contextRevision) return sendApiError(res, 409, "agent_checkpoint_context_required");
  if (!previous.success || previous.data.sessionId !== input.checkpoint.sessionId || !nextCheckpointStage(previous.data.stage, input.checkpoint.stage)) return sendApiError(res, 409, "agent_checkpoint_transition_invalid");
  if (previous.data.stage !== "claimed" && (previous.data.packetRevision !== input.checkpoint.packetRevision || previous.data.workspaceDigest !== input.checkpoint.workspaceDigest || previous.data.contextRevision !== input.checkpoint.contextRevision)) return sendApiError(res, 409, "agent_checkpoint_identity_changed");
  const saved = await readyTransaction(async (tx) => {
    const context = await guardExecutionContext(tx, existing, true);
    if (context.error) return context;
    const updated = await tx.agentExecution.updateMany({ where: { id: existing.id, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, cancelRequestedAt: null, checkpointVersion: input.expectedVersion, status: { in: ["claimed", "running"] } }, data: { checkpoint: json(input.checkpoint), checkpointVersion: { increment: 1 } } });
    if (!updated.count) return null;
    await tx.agentExecutionEvent.create({ data: { workspaceId: existing.workspaceId, executionId: existing.id, type: "checkpoint", message: `Recovery checkpoint: ${input.checkpoint.stage}.`, payload: json({ stage: input.checkpoint.stage, version: input.expectedVersion + 1 }) } });
    return { checkpoint: input.checkpoint, checkpointVersion: input.expectedVersion + 1 };
  });
  if (saved && "error" in saved) return sendApiError(res, 409, saved.error!);
  if (!saved) return sendApiError(res, 409, "agent_checkpoint_conflict");
  res.json({ data: saved });
}));

agentRuntimeRouter.post("/executions/:id/actions/recover", asyncHandler(async (req, res) => {
  if (!executionEnabled()) return sendApiError(res, 409, "agent_execution_disabled");
  const input = z.object({ hostSlug: z.string().min(1).max(120), sessionId: z.string().uuid(), expectedVersion: z.number().int().min(1) }).strict().parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, agentHost: { slug: input.hostSlug, status: { not: "disabled" } }, status: { in: ["claimed", "running"] }, cancelRequestedAt: null } });
  if (!existing) return sendApiError(res, 409, "agent_recovery_conflict");
  if (existing.contextInvalidatedAt) return sendApiError(res, 409, contextStopCode);
  const host = await prisma.agentHost.findUniqueOrThrow({ where: { id: existing.agentHostId! } });
  if (protocolBlocked(req, res, host)) return;
  const parsed = recoveryCheckpoint.safeParse(existing.checkpoint);
  if (!parsed.success || !["claimed", "prepared"].includes(parsed.data.stage) || parsed.data.sessionId === input.sessionId) return sendApiError(res, 409, "agent_recovery_ambiguous");
  if (parsed.data.stage === "prepared" && !parsed.data.contextRevision) return sendApiError(res, 409, "agent_recovery_ambiguous");
  if (!existing.leaseExpiresAt || existing.leaseExpiresAt <= new Date()) return sendApiError(res, 409, "agent_recovery_lease_expired");
  const checkpoint = { ...parsed.data, sessionId: input.sessionId };
  const token = randomUUID();
  const updated = await readyTransaction(async (tx) => {
    const ready = await inspectReady(tx, req.auth!.workspaceId, existing.taskId, existing);
    if (ready.error) return { error: ready.error };
    const changed = await tx.agentExecution.updateMany({ where: { id: existing.id, checkpointVersion: input.expectedVersion, leaseToken: existing.leaseToken, leaseExpiresAt: { gt: new Date() }, cancelRequestedAt: null, status: { in: ["claimed", "running"] } }, data: { checkpoint: json(checkpoint), checkpointVersion: { increment: 1 }, leaseToken: token, leaseExpiresAt: new Date(Date.now() + 90_000), lastHeartbeatAt: new Date(), errorState: Prisma.DbNull } });
    if (!changed.count) return null;
    const mode = checkpoint.stage === "prepared" ? "resume_from_checkpoint" : "restart_same_attempt";
    await tx.agentExecutionEvent.create({ data: { workspaceId: existing.workspaceId, executionId: existing.id, type: "recovering", message: `Recovering the same execution and attempt from ${checkpoint.stage}: ${mode}; no worker had been started.`, payload: json({ schemaVersion: "roost-recovery-v1", stage: checkpoint.stage, mode, version: input.expectedVersion + 1, attempt: existing.attempt }) } });
    return tx.agentExecution.findUniqueOrThrow({ where: { id: existing.id }, include: executionInclude });
  });
  if (updated && "error" in updated) return sendApiError(res, 409, updated.error);
  if (!updated) return sendApiError(res, 409, "agent_recovery_conflict");
  res.json({ data: updated });
}));

agentRuntimeRouter.post("/executions/:id/actions/recovery-blocked", asyncHandler(async (req, res) => {
  const input = z.object({ hostSlug: z.string().min(1).max(120), reason: recoveryReasons }).strict().parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, agentHost: { slug: input.hostSlug }, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } });
  if (!existing) return sendApiError(res, 404, "agent_execution_not_found");
  if (existing.contextInvalidatedAt) return res.json({ data: { code: contextStopCode, reason: "context_changed" } });
  const checkpoint = recoveryCheckpoint.safeParse(existing.checkpoint);
  const stage = checkpoint.success ? checkpoint.data.stage : "unknown";
  const message = recoveryMessage(input.reason, stage);
  await prisma.$transaction(async (tx) => {
    const changed = await tx.agentExecution.updateMany({ where: { id: existing.id, checkpointVersion: existing.checkpointVersion, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } }, data: { errorState: json({ code: "agent_execution_recovery_blocked", message, retryable: false, details: { schemaVersion: "roost-recovery-v1", stage, reason: input.reason } }) } });
    if (changed.count) await tx.agentExecutionEvent.create({ data: { workspaceId: existing.workspaceId, executionId: existing.id, type: "recovery_blocked", level: "warning", message, payload: json({ stage, reason: input.reason }) } });
  });
  res.json({ data: { code: "agent_execution_recovery_blocked", stage, reason: input.reason } });
}));

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
      protocol,
      executionProviders: executionProviderRegistry,
      pilotReadiness: { ready: false, requiredProvider: "hermes_codex", blockers: ["hermes_compatibility_unproven"] },
      applications: records,
      hosts: hosts.map(visibleHost),
      triggerPolicy: triggerRule,
      executionCounts: Object.fromEntries(executionCounts.map((item) => [item.status, item._count._all])),
      activationRequirements: ["review_application_context", "validate_local_allowlist", "create_scoped_worker_key", "start_windows_host", "prove_hermes_read_only_compatibility", "run_non_critical_trial", "explicitly_enable_runtime"]
    }
  });
}));

agentRuntimeRouter.get("/hosts", asyncHandler(async (req, res) => {
  const hosts = await prisma.agentHost.findMany({ where: { workspaceId: req.auth!.workspaceId }, orderBy: { updatedAt: "desc" } });
  res.json({ data: hosts.map(visibleHost) });
}));

agentRuntimeRouter.post("/hosts/register", asyncHandler(async (req, res) => {
  const input = hostSchema.parse(req.body);
  const now = new Date();
  const disabled = await prisma.agentHost.findUnique({ where: { workspaceId_slug: { workspaceId: req.auth!.workspaceId, slug: input.slug } }, select: { status: true } });
  if (disabled?.status === "disabled") return sendApiError(res, 409, "agent_host_disabled");
  const host = await prisma.agentHost.upsert({
    where: { workspaceId_slug: { workspaceId: req.auth!.workspaceId, slug: input.slug } },
    create: { ...input, capabilities: json(input.capabilities), applicationSlugs: json(input.applicationSlugs), metadata: json(sanitizeProviderMetadata(input.metadata)), workspaceId: req.auth!.workspaceId, status: "online", lastSeenAt: now },
    update: { name: input.name, platform: input.platform, capabilities: json(input.capabilities), applicationSlugs: json(input.applicationSlugs), metadata: json(sanitizeProviderMetadata(input.metadata)), status: "online", lastSeenAt: now }
  });
  res.json({ data: visibleHost(host) });
}));

agentRuntimeRouter.post("/hosts/:id/heartbeat", asyncHandler(async (req, res) => {
  const input = hostSchema.partial().pick({ capabilities: true, applicationSlugs: true, metadata: true }).parse(req.body ?? {});
  const existing = await prisma.agentHost.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, status: { not: "disabled" } } });
  if (!existing) return sendApiError(res, 404, "agent_host_not_found");
  const host = await prisma.agentHost.update({ where: { id: existing.id }, data: { status: "online", lastSeenAt: new Date(), ...(input.capabilities ? { capabilities: json(input.capabilities) } : {}), ...(input.applicationSlugs ? { applicationSlugs: json(input.applicationSlugs) } : {}), ...(input.metadata ? { metadata: json(sanitizeProviderMetadata(input.metadata)) } : {}) } });
  res.json({ data: visibleHost(host) });
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
  const result = await readyTransaction(async tx => {
    await lockReadyTask(tx, req.auth!.workspaceId, input.taskId);
    if (await tx.agentExecution.count({ where: { workspaceId: req.auth!.workspaceId, taskId: input.taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } })) return { error: "task_agent_execution_active" };
    const ready = await inspectReady(tx, req.auth!.workspaceId, input.taskId);
    if (ready.error) return ready;
    const pin = ready.pin!;
    if (resolved.application!.id !== pin.applicationId || (input.prompt !== undefined && input.prompt !== pin.prompt) || (input.baseBranch !== undefined && input.baseBranch !== pin.baseBranch) || (input.metadata.executionContract !== undefined && !isDeepStrictEqual(input.metadata.executionContract, pin.contract))) return { error: "task_ready_contract_mismatch" };
    const execution = await tx.agentExecution.create({ data: { workspaceId: req.auth!.workspaceId, taskId: input.taskId, applicationId: pin.applicationId,
      prompt: pin.prompt, baseBranch: pin.baseBranch, metadata: json({ ...input.metadata, executionContract: pin.contract, readyContextPin: { pinId: pin.pinId, revision: pin.revision, riskAdmissionSeal:pin.riskAdmissionSeal, riskAdmissionCommit:pin.riskAdmissionCommit, compositionSeal:pin.procedureComposition.seal } }), ...actor(req) }, include: executionInclude });
    return { execution };
  });
  if ("error" in result && result.error) return sendApiError(res, 409, result.error, { details: "readiness" in result ? result.readiness : undefined });
  const execution = (result as { execution: Prisma.AgentExecutionGetPayload<{ include: typeof executionInclude }> }).execution;
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
  if (protocolBlocked(req, res, host)) return;
  const applicationSlugs = Array.isArray(host.applicationSlugs) ? host.applicationSlugs.filter((value): value is string => typeof value === "string" && value !== "roost") : [];
  const now = new Date();
  // Expiry is not proof that an old worker stopped. Keep ownership and identity.
  if (await prisma.agentExecution.count({ where: { workspaceId, agentHostId: host.id, status: { in: ["claimed", "running", "waiting_for_approval"] } } })) return sendApiError(res, 409, "agent_host_recovery_required");
  if (!applicationSlugs.length) return res.status(204).send();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = await prisma.agentExecution.findFirst({ where: { workspaceId, status: "queued", attempt: 0, cancelRequestedAt: null, ...(applicationSlugs.length ? { application: { slug: { in: applicationSlugs } } } : {}) }, orderBy: { createdAt: "asc" } });
    if (!candidate) return res.status(204).send();
    const leaseToken = randomUUID();
    const checkpoint = { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId ?? randomUUID(), packetRevision: null, workspaceDigest: null };
    const admitted = await readyTransaction(async tx => {
      const ready = await inspectReady(tx, workspaceId, candidate.taskId, candidate);
      if (ready.error) return { error: ready.error };
      if (await suspensionBlocks(tx, workspaceId, candidate.taskId, candidate.applicationId, "runtime_execute", ready.taskContext?.task?.assignedWorkforceEntityId, null, host.id)) return { error: "native_capability_suspended" };
    const changed = await tx.agentExecution.updateMany({ where: { id: candidate.id, workspaceId, status: "queued", attempt: 0 }, data: { status: "claimed", agentHostId: host.id, leaseToken, leaseExpiresAt: new Date(Date.now() + 90_000), lastHeartbeatAt: now, startedAt: candidate.startedAt ?? now, attempt: { increment: 1 }, checkpoint: json(checkpoint), checkpointVersion: 1 } });
      return { count: changed.count };
    });
    if ("error" in admitted) return sendApiError(res, 409, admitted.error!);
    const claimed = admitted;
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
  const leaseExpiresAt = new Date(Date.now() + 90_000);
  const status = input.status ?? (existing.status === "claimed" ? "running" : existing.status);
  const updated = await readyTransaction(async tx => {
    const context = await guardExecutionContext(tx, existing);
    if (context.error) return context;
    return tx.agentExecution.updateMany({ where: { id: existing.id, contextInvalidatedAt: null, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, cancelRequestedAt: null, status: { in: ["claimed", "running", "waiting_for_approval"] } }, data: { status, codexThreadId: input.codexThreadId === undefined ? existing.codexThreadId : input.codexThreadId, lastHeartbeatAt: new Date(), leaseExpiresAt, ...(input.metadata ? { metadata: executionReportMetadata(existing.metadata, input.metadata) } : {}) } });
  });
  if ("error" in updated) return sendApiError(res, 409, updated.error!);
  if (!updated.count) return sendApiError(res, 409, "agent_execution_lease_invalid");
  res.json({ data: { id: existing.id, status, cancelRequested: false, leaseExpiresAt } });
}));

agentRuntimeRouter.post("/executions/:id/events", asyncHandler(async (req, res) => {
  const input = executionEventSchema.parse(req.body);
  const execution = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!execution) return sendApiError(res, 409, "agent_execution_lease_invalid");
  if (execution.contextInvalidatedAt) return sendApiError(res, 409, contextStopCode);
  const event = await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: input.type, level: input.level, message: input.message, payload: input.payload });
  res.status(201).json({ data: event });
}));

agentRuntimeRouter.post("/executions/:id/actions/complete", asyncHandler(async (req, res) => {
  const input = completeSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } }, include: { task: true } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const result = await readyTransaction(async tx => {
    const context = await guardExecutionContext(tx, existing, true);
    if (context.error) return context;
    const current = await tx.agentExecution.findUniqueOrThrow({where:{id:existing.id}});
    const metadata=executionReportMetadata(current.metadata,input.metadata??{}) as Record<string,any>;
    if(input.resultRevision && input.resultRevision.branch!==(metadata.executionContract as any)?.singleTask?.branch)return {error:"agent_execution_result_revision_invalid"};
    const resultRevision=input.resultRevision?{schemaVersion:"roost-result-revision-v1",id:randomUUID(),executionId:current.id,attempt:current.attempt,hostId:current.agentHostId,checkpointVersion:current.checkpointVersion,observedAt:new Date().toISOString(),...input.resultRevision}:null;
    const completed = await tx.agentExecution.updateMany({ where: { id: existing.id, contextInvalidatedAt: null, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, cancelRequestedAt: null, status: { in: ["claimed", "running", "waiting_for_approval"] } }, data: { status: "completed", summary: input.summary, finalResponse: input.finalResponse, codexThreadId: input.codexThreadId === undefined ? existing.codexThreadId : input.codexThreadId, changedFiles: json(input.changedFiles), verification: json(input.verification), usage: json(input.usage), metadata:json({...metadata,resultRevision}), errorState: Prisma.DbNull, completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
    if (!completed.count) return { error: "agent_execution_lease_invalid" };
    const execution = await tx.agentExecution.findUniqueOrThrow({ where: { id: existing.id } });
    await tx.agentExecutionEvent.create({ data: { workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "completed", message: input.summary, payload: json({ changedFiles: input.changedFiles, verification: input.verification }) } });
    await tx.evidenceRecord.create({ data: { workspaceId: req.auth!.workspaceId, entityType: "task", entityId: execution.taskId, type: "manual_verification", source: "agent", reference: `Codex execution ${execution.id}`, description: input.summary, metadata: json({ executionId: execution.id, applicationId: execution.applicationId, changedFiles: input.changedFiles, verification: input.verification }) } });
    await tx.event.create({ data: { type: "agent_execution_completed", workspaceId: req.auth!.workspaceId, taskId: execution.taskId, projectId: existing.task.projectId, resourceType: "agent_execution", resourceId: execution.id, source: "codex", payload: { executionId: execution.id, applicationId: execution.applicationId, changedFiles: input.changedFiles } } });
    return { execution };
  });
  if ("error" in result) return sendApiError(res, 409, result.error!);
  res.json({ data: result.execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/context-stopped", asyncHandler(async (req, res) => {
  const input = leaseSchema.parse(req.body);
  // Expired authority cannot run work, but may acknowledge an already requested
  // stop. This endpoint never renews/rotates/releases the retained lease.
  const execution = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!execution) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const result = await readyTransaction(tx => acknowledgeContextStop(tx, execution));
  if ("error" in result) return sendApiError(res, 409, result.error!);
  res.json({ data: result });
}));

agentRuntimeRouter.post("/executions/:id/actions/fail", asyncHandler(async (req, res) => {
  const input = failSchema.parse(req.body);
  if (["agent_execution_output_budget_invalid", "agent_execution_output_budget_exceeded", "agent_execution_output_budget_unsupported"].includes(input.code)) input.retryable = false;
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, status: { in: ["claimed", "running", "waiting_for_approval"] } }, include: { task: true } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  if (existing.contextInvalidatedAt) return sendApiError(res, 409, contextStopCode);
  const failed = await prisma.agentExecution.updateMany({ where: { id: existing.id, contextInvalidatedAt: null, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, status: { in: ["claimed", "running", "waiting_for_approval"] } }, data: { status: "failed", errorState: json({ code: input.code, message: input.message, retryable: input.retryable, details: input.details }), completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
  if (!failed.count) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: existing.id } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "failed", level: "error", message: input.message, payload: { code: input.code, retryable: input.retryable } });
  await createEvent({ type: "agent_execution_failed", workspaceId: req.auth!.workspaceId, taskId: execution.taskId, projectId: existing.task.projectId, resourceType: "agent_execution", resourceId: execution.id, source: "codex", payload: { executionId: execution.id, code: input.code, retryable: input.retryable } });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/cancelled", asyncHandler(async (req, res) => {
  const input = leaseSchema.parse(req.body);
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, leaseToken: input.leaseToken, cancelRequestedAt: { not: null }, status: { in: ["claimed", "running", "waiting_for_approval"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_lease_invalid");
  if (existing.contextInvalidatedAt) return sendApiError(res, 409, contextStopCode);
  const cancelled = await prisma.agentExecution.updateMany({ where: { id: existing.id, contextInvalidatedAt: null, leaseToken: input.leaseToken, leaseExpiresAt: { gt: new Date() }, status: { in: ["claimed", "running", "waiting_for_approval"] } }, data: { status: "cancelled", completedAt: new Date(), leaseExpiresAt: null, leaseToken: null } });
  if (!cancelled.count) return sendApiError(res, 409, "agent_execution_lease_invalid");
  const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: existing.id } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "cancelled", level: "warning", message: "Local Codex execution stopped after an owner cancellation request." });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/cancel", asyncHandler(async (req, res) => {
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "agent_execution_not_found");
  if (["completed", "failed", "cancelled"].includes(existing.status)) return res.json({ data: existing });
  const immediate = existing.status === "queued" || Boolean(existing.contextInvalidatedAt && existing.contextStoppedAt);
  const execution = await prisma.agentExecution.update({ where: { id: existing.id }, data: { cancelRequestedAt: new Date(), ...(immediate ? { status: "cancelled", completedAt: new Date(), leaseToken: null, leaseExpiresAt: null } : {}) } });
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "cancel_requested", level: "warning", message: immediate ? "Queued execution cancelled." : "Cancellation requested; the local agent host will stop the run." });
  res.json({ data: execution });
}));

agentRuntimeRouter.post("/executions/:id/actions/retry", asyncHandler(async (req, res) => {
  if (!executionEnabled()) return sendApiError(res, 409, "agent_execution_disabled");
  const existing = await prisma.agentExecution.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId, status: { in: ["failed", "cancelled"] } } });
  if (!existing) return sendApiError(res, 409, "agent_execution_not_retryable");
  const errorState = existing.errorState as { retryable?: boolean } | null;
  if (errorState?.retryable === false) return sendApiError(res, 409, "agent_execution_requires_correction");
  const result = await readyTransaction(async tx => {
    const ready = await inspectReady(tx, req.auth!.workspaceId, existing.taskId, existing);
    if (ready.error) return { error: ready.error };
    if (await tx.agentExecution.count({ where: { workspaceId: req.auth!.workspaceId, taskId: existing.taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } })) return { error: "task_agent_execution_active" };
    return { execution: await tx.agentExecution.create({ data: { workspaceId: existing.workspaceId, taskId: existing.taskId, applicationId: existing.applicationId, prompt: existing.prompt, baseBranch: existing.baseBranch, metadata: existing.metadata as Prisma.InputJsonValue, ...actor(req) }, include: executionInclude }) };
  });
  if ("error" in result) return sendApiError(res, 409, result.error!);
  const execution = result.execution;
  await appendExecutionEvent({ workspaceId: req.auth!.workspaceId, executionId: execution.id, type: "queued", message: `Retry queued from execution ${existing.id}.`, payload: { previousExecutionId: existing.id } });
  res.status(201).json({ data: execution });
}));
