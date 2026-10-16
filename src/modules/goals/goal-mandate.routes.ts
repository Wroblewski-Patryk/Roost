import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { taskSourceScope } from "../agent-runtime/task-source-trust";
import { GoalMandateError, adoptGoalMandateDraft, createGoalMandateDraft, currentGoalMandate,
  decideGoalMeasurement, ownerGoalMandateView, previewGoalMandateDraft, proposeGoalMeasurement } from "./goal-mandate";
import { previewGoalRetirement, retireGoal } from "./goal-retirement";

export const goalMandateRouter = Router();
const uuid = z.string().uuid();
const draftSchema = z.object({ result: z.string().trim().min(1).max(2000), metric: z.string().trim().min(1).max(240),
  unit: z.string().trim().min(1).max(80), targetValue: z.number().finite(),
  evidenceSource: z.string().trim().min(1).max(1000), accountableUserId: uuid,
  bindingDeadline: z.coerce.date().nullable().optional(), forecastDate: z.coerce.date().nullable().optional(),
  forecastBasis: z.string().trim().min(1).max(1000).nullable().optional(),
  executionSchedule: z.string().trim().max(1000).nullable().optional(),
  provenance: z.string().trim().min(1).max(1000) }).strict();
const adoptionSchema = z.object({ previewId: uuid, expectedCurrentId: uuid.nullable(),
  impactDigest: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const measurementSchema = z.object({ versionId: uuid, evidenceId: uuid, taskId: uuid.nullable().optional(),
  value: z.number().finite(), note: z.string().trim().min(1).max(2000), observedAt: z.coerce.date() }).strict();
const agentMeasurementSchema = measurementSchema.omit({ taskId: true });
const decisionSchema = z.object({ decision: z.enum(["accept", "reject"]) }).strict();

function owner(req: Request) {
  const auth = req.auth;
  return auth?.authType === "user" && auth.workspaceRole === "owner" && auth.userId ? auth.userId as string : null;
}
function responseError(res: Response, error: unknown) {
  if (error instanceof GoalMandateError) return sendApiError(res, error.status, error.code);
  throw error;
}

goalMandateRouter.get("/goals/:goalId", asyncHandler(async (req, res) => {
  if (!owner(req)) return sendApiError(res, 403, "goal_owner_required");
  try { res.json({ data: await ownerGoalMandateView(req.auth!.workspaceId, uuid.parse(req.params.goalId)) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.get("/goals/:goalId/retirement-preview", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId) return sendApiError(res, 403, "goal_owner_required");
  res.setHeader("Cache-Control", "no-store");
  try { res.json({ data: await previewGoalRetirement(req.auth!.workspaceId, userId, uuid.parse(req.params.goalId)) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/actions/retire", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId || !req.header("X-Owner-Action-Proof") || !req.auth!.authenticatedAt ||
    Math.floor(Date.now() / 1000) - req.auth!.authenticatedAt > 90)
    return sendApiError(res, 403, "goal_fresh_owner_required");
  res.setHeader("Cache-Control", "no-store");
  try { res.json({ data: await retireGoal(req.auth!.workspaceId, userId,
    uuid.parse(req.params.goalId), req.body) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/drafts", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId) return sendApiError(res, 403, "goal_owner_required");
  const input = draftSchema.parse(req.body);
  try { res.status(201).json({ data: await createGoalMandateDraft(req.auth!.workspaceId, userId,
    uuid.parse(req.params.goalId), input) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/drafts/:draftId/preview", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId) return sendApiError(res, 403, "goal_owner_required");
  z.object({}).strict().parse(req.body ?? {});
  try { res.json({ data: await previewGoalMandateDraft(req.auth!.workspaceId, userId,
    uuid.parse(req.params.goalId), uuid.parse(req.params.draftId)) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/drafts/:draftId/adopt", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId || !req.header("X-Owner-Action-Proof") || !req.auth!.authenticatedAt ||
    Math.floor(Date.now() / 1000) - req.auth!.authenticatedAt > 90)
    return sendApiError(res, 403, "goal_fresh_owner_required");
  const input = adoptionSchema.parse(req.body);
  try { res.json({ data: await adoptGoalMandateDraft(req.auth!.workspaceId, userId,
    uuid.parse(req.params.goalId), uuid.parse(req.params.draftId), input.previewId,
    input.expectedCurrentId, input.impactDigest) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/measurements", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId) return sendApiError(res, 403, "goal_owner_required");
  const input = measurementSchema.parse(req.body);
  try { res.status(201).json({ data: await proposeGoalMeasurement(req.auth!.workspaceId, { type: "user", id: userId },
    uuid.parse(req.params.goalId), input.versionId, input.evidenceId, input.taskId ?? null,
    input.value, input.note, input.observedAt) }); }
  catch (error) { return responseError(res, error); }
}));

goalMandateRouter.post("/goals/:goalId/measurements/:measurementId/actions", asyncHandler(async (req, res) => {
  const userId = owner(req);
  if (!userId) return sendApiError(res, 403, "goal_owner_required");
  const input = decisionSchema.parse(req.body);
  try { res.json({ data: await decideGoalMeasurement(req.auth!.workspaceId, userId,
    uuid.parse(req.params.goalId), uuid.parse(req.params.measurementId), input.decision) }); }
  catch (error) { return responseError(res, error); }
}));

async function boundTask(req: Request, taskId: string) {
  const auth = req.auth!;
  if (auth.authType !== "api_key" || !auth.agentId) return null;
  return prisma.$transaction(async db => {
    const principal = await resolveReviewPrincipal(db, auth.workspaceId, auth);
    if (principal?.kind !== "agent" || principal.id !== auth.agentId) return null;
    const workforce = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM workforce_entities
      WHERE id=${auth.agentId}::uuid AND workspace_id=${auth.workspaceId}::uuid AND status='active' FOR SHARE`;
    if (!workforce.length) return null;
    const task = await db.task.findFirst({ where: { id: taskId, workspaceId: auth.workspaceId,
      assignedWorkforceEntityId: auth.agentId, status: { in: ["todo", "in_progress"] } },
      select: { id: true, goalId: true } });
    if (!task?.goalId || !await taskSourceScope(db, auth.workspaceId, taskId, auth.agentId)) return null;
    return { taskId, goalId: task.goalId, current: await currentGoalMandate(db, auth.workspaceId, task.goalId) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

goalMandateRouter.get("/tasks/:taskId", asyncHandler(async (req, res) => {
  const taskId = uuid.parse(req.params.taskId);
  const data = await boundTask(req, taskId);
  if (!data) return sendApiError(res, 404, "goal_task_scope_invalid");
  res.json({ data });
}));

goalMandateRouter.post("/tasks/:taskId/measurements", asyncHandler(async (req, res) => {
  const taskId = uuid.parse(req.params.taskId);
  const bound = await boundTask(req, taskId);
  if (!bound?.current || !req.auth!.agentId) return sendApiError(res, 404, "goal_task_scope_invalid");
  const input = agentMeasurementSchema.parse(req.body);
  try { res.status(201).json({ data: await proposeGoalMeasurement(req.auth!.workspaceId,
    { type: "agent", id: req.auth!.agentId, auth: req.auth! }, bound.goalId, input.versionId, input.evidenceId,
    taskId, input.value, input.note, input.observedAt) }); }
  catch (error) { return responseError(res, error); }
}));
