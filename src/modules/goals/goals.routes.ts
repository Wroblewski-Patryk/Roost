import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { isCanonicalDepartmentKey } from "../../operating-model/department-registry";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { createEvent } from "../events/event.service";
import { departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({
  ownerDepartmentKey: z.string().nullable().optional(),
  relatedDepartmentKeys: z.array(z.string()).default([]),
  applicableDepartmentKeys: z.array(z.string()).default([]),
  scopes: z.array(z.object({
    type: z.enum(organizationalScopeTypes),
    entityId: z.string().trim().min(1).nullable().optional(),
    label: z.string().trim().max(160).nullable().optional()
  })).default([])
}).strict();

const createGoalSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  processId: z.string().uuid().nullable().optional(),
  parentGoalId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(5000).nullable().optional(),
  businessPurpose: z.string().trim().max(5000).nullable().optional(),
  priority: z.string().trim().min(1).max(40).optional(),
  deadline: z.coerce.date().nullable().optional(),
  status: z.string().trim().min(1).max(40).optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  organizationalContext: organizationalContextSchema.optional()
}).strict();
const updateGoalSchema = createGoalSchema.partial().omit({ externalId: true, source: true });

export const goalsRouter = Router();

async function relatedRecordIsVisible(workspaceId: string, model: "project" | "process" | "goal", id?: string | null) {
  if (!id) return true;
  if (model === "project") return Boolean(await prisma.project.findFirst({ where: { id, workspaceId } }));
  if (model === "process") return Boolean(await prisma.process.findFirst({ where: { id, workspaceId } }));
  return Boolean(await prisma.goal.findFirst({ where: { id, workspaceId } }));
}

async function invalidRelation(workspaceId: string, input: z.infer<typeof createGoalSchema> | z.infer<typeof updateGoalSchema>, currentGoalId?: string) {
  if (!await relatedRecordIsVisible(workspaceId, "project", input.projectId)) return "project_not_found";
  if (!await relatedRecordIsVisible(workspaceId, "process", input.processId)) return "process_not_found";
  if (input.parentGoalId && input.parentGoalId === currentGoalId) return "invalid_parent_goal";
  if (!await relatedRecordIsVisible(workspaceId, "goal", input.parentGoalId)) return "parent_goal_not_found";
  return null;
}

async function contextualGoalIds(workspaceId: string, departmentKey: string, includeCompanyWide: boolean) {
  await ensureDefaultDepartments(workspaceId);
  const department = await prisma.workspaceDepartment.findFirst({ where: { workspaceId, key: departmentKey } });
  if (!department) return [];
  const [relations, companyScopes] = await Promise.all([
    prisma.organizationalDepartmentRelation.findMany({ where: { workspaceId, entityType: "goal", departmentId: department.id }, select: { entityId: true } }),
    includeCompanyWide ? prisma.organizationalScope.findMany({ where: { workspaceId, entityType: "goal", scopeType: "company" }, select: { entityId: true } }) : Promise.resolve([])
  ]);
  return [...new Set([...relations, ...companyScopes].map((item) => item.entityId))];
}

async function serializeGoals(workspaceId: string, goals: Array<Record<string, any>>) {
  const contexts = await organizationalContextsForEntities(workspaceId, "goal", goals.map((goal) => goal.id));
  return goals.map((goal) => ({ ...goal, organizationalContext: contexts.get(goal.id) }));
}

const goalInclude = {
  project: true,
  process: true,
  parentGoal: { select: { id: true, title: true, status: true } },
  targets: { orderBy: { updatedAt: "desc" as const }, take: 20 },
  tasks: { orderBy: { updatedAt: "desc" as const }, take: 20 }
};

goalsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null;
  if (departmentKey && !isCanonicalDepartmentKey(departmentKey)) return res.status(400).json({ error: "invalid_department_key" });
  const ids = departmentKey ? await contextualGoalIds(workspaceId, departmentKey, req.query.includeCompanyWide !== "false") : null;
  const goals = await prisma.goal.findMany({
    where: { workspaceId, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { updatedAt: "desc" }],
    include: goalInclude
  });
  res.json({ data: await serializeGoals(workspaceId, goals) });
}));

goalsRouter.get("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const goal = await prisma.goal.findFirst({ where: { id: String(req.params.id), workspaceId }, include: goalInclude });
  if (!goal) return res.status(404).json({ error: "not_found" });
  res.json({ data: (await serializeGoals(workspaceId, [goal]))[0] });
}));

goalsRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const input = createGoalSchema.parse(req.body);
  const relationError = await invalidRelation(workspaceId, input);
  if (relationError) return res.status(404).json({ error: relationError });
  if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  await ensureDefaultDepartments(workspaceId);
  const { organizationalContext, ...goalData } = input;
  const goal = await prisma.$transaction(async (transaction) => {
    const created = await transaction.goal.create({ data: { ...goalData, workspaceId } });
    if (organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, "goal", created.id, organizationalContext);
    return transaction.goal.findUniqueOrThrow({ where: { id: created.id }, include: goalInclude });
  });
  await createEvent({ type: "goal_created", workspaceId, projectId: goal.projectId, source: goal.source, payload: { goalId: goal.id, title: goal.title } });
  res.status(201).json({ data: (await serializeGoals(workspaceId, [goal]))[0] });
}));

goalsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const input = updateGoalSchema.parse(req.body);
  const existing = await prisma.goal.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const relationError = await invalidRelation(workspaceId, input, existing.id);
  if (relationError) return res.status(404).json({ error: relationError });
  if (input.organizationalContext && !departmentKeysAreValid(input.organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  await ensureDefaultDepartments(workspaceId);
  const { organizationalContext, ...goalData } = input;
  const goal = await prisma.$transaction(async (transaction) => {
    await transaction.goal.update({ where: { id: existing.id }, data: goalData });
    if (organizationalContext) await replaceOrganizationalContext(transaction, workspaceId, "goal", existing.id, organizationalContext);
    return transaction.goal.findUniqueOrThrow({ where: { id: existing.id }, include: goalInclude });
  });
  await createEvent({ type: "goal_updated", workspaceId, projectId: goal.projectId, source: goal.source, payload: { goalId: goal.id, changed: Object.keys(input) } });
  res.json({ data: (await serializeGoals(workspaceId, [goal]))[0] });
}));

goalsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const existing = await prisma.goal.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const goal = await prisma.goal.update({ where: { id: existing.id }, data: { status: "archived" }, include: goalInclude });
  await createEvent({ type: "goal_archived", workspaceId, projectId: goal.projectId, source: goal.source, payload: { goalId: goal.id } });
  res.json({ data: (await serializeGoals(workspaceId, [goal]))[0] });
}));
