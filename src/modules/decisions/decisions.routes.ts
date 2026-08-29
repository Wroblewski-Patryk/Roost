import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import { contextualEntityIds, departmentKeysAreValid, organizationalContextsForEntities, organizationalScopeTypes, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";

const organizationalContextSchema = z.object({ ownerDepartmentKey: z.string().nullable().optional(), relatedDepartmentKeys: z.array(z.string()).default([]), applicableDepartmentKeys: z.array(z.string()).default([]), scopes: z.array(z.object({ type: z.enum(organizationalScopeTypes), entityId: z.string().trim().min(1).nullable().optional(), label: z.string().trim().max(160).nullable().optional() })).default([]) }).strict();

const createDecisionSchema = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().min(1),
  context: z.string().max(10000).nullable().optional(),
  problem: z.string().max(10000).nullable().optional(),
  decision: z.string().max(10000).nullable().optional(),
  rationale: z.string().optional(),
  alternatives: z.array(z.union([z.string(), z.record(z.unknown())])).default([]),
  consequences: z.string().max(10000).nullable().optional(),
  outcome: z.string().optional(),
  authorType: z.string().max(80).nullable().optional(),
  authorId: z.string().max(160).nullable().optional(),
  supersedesId: z.string().uuid().nullable().optional(),
  status: z.string().min(1).optional(),
  externalId: z.string().optional(),
  source: z.string().optional(),
  organizationalContext: organizationalContextSchema.optional()
}).strict();

const updateDecisionSchema = createDecisionSchema.partial().omit({
  externalId: true,
  source: true
});

export const decisionsRouter = Router();
async function serializeDecisions(workspaceId: string, rows: Array<Record<string, any>>) { const contexts = await organizationalContextsForEntities(workspaceId, "decision", rows.map((row) => row.id)); return rows.map((row) => ({ ...row, organizationalContext: contexts.get(row.id) })); }

async function projectIsVisible(workspaceId: string, projectId?: string) {
  if (!projectId) {
    return true;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId }
  });

  return Boolean(project);
}

decisionsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const departmentKey = typeof req.query.departmentKey === "string" ? req.query.departmentKey : null; const ids = departmentKey ? await contextualEntityIds(workspaceId, "decision", departmentKey, req.query.includeCompanyWide !== "false") : null;
  const decisions = await prisma.decision.findMany({
    where: { workspaceId, ...(ids ? { id: { in: ids } } : {}) }, include: { supersedes: { select: { id: true, title: true } }, supersededBy: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: await serializeDecisions(workspaceId, decisions) });
}));

decisionsRouter.get("/:id", asyncHandler(async (req, res) => {
  const decision = await prisma.decision.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!decision) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: (await serializeDecisions(req.auth!.workspaceId, [decision]))[0] });
}));

decisionsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createDecisionSchema.parse(req.body);
  const { organizationalContext, alternatives, ...decisionInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  if (input.supersedesId && !await prisma.decision.findFirst({ where: { id: input.supersedesId, workspaceId: req.auth!.workspaceId } })) return res.status(404).json({ error: "superseded_decision_not_found" });
  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }

  await ensureDefaultDepartments(req.auth!.workspaceId);
  const decision = await prisma.$transaction(async (transaction) => { const created = await transaction.decision.create({ data: { ...decisionInput, alternatives: alternatives as Prisma.InputJsonValue, workspaceId: req.auth!.workspaceId } }); if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "decision", created.id, organizationalContext); return created; });

  await createEvent({
    type: "decision_created",
    workspaceId: req.auth!.workspaceId,
    source: decision.source,
    projectId: decision.projectId,
    payload: {
      decisionId: decision.id,
      projectId: decision.projectId,
      title: decision.title,
      workspaceId: req.auth!.workspaceId
    }
  });

  res.status(201).json({ data: (await serializeDecisions(req.auth!.workspaceId, [decision]))[0] });
}));

decisionsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateDecisionSchema.parse(req.body);
  const { organizationalContext, alternatives, ...decisionInput } = input;
  if (organizationalContext && !departmentKeysAreValid(organizationalContext)) return res.status(400).json({ error: "invalid_department_key" });
  if (!await projectIsVisible(req.auth!.workspaceId, input.projectId)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.decision.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (input.supersedesId === existing.id) return res.status(400).json({ error: "self_supersession_not_allowed" });
  if (input.supersedesId && !await prisma.decision.findFirst({ where: { id: input.supersedesId, workspaceId: req.auth!.workspaceId } })) return res.status(404).json({ error: "superseded_decision_not_found" });
  await ensureDefaultDepartments(req.auth!.workspaceId);
  const decision = await prisma.$transaction(async (transaction) => { const updated = await transaction.decision.update({ where: { id: existing.id }, data: { ...decisionInput, ...(alternatives ? { alternatives: alternatives as Prisma.InputJsonValue } : {}) } }); if (organizationalContext) await replaceOrganizationalContext(transaction, req.auth!.workspaceId, "decision", existing.id, organizationalContext); return updated; });

  await createEvent({
    type: "decision_updated",
    workspaceId: req.auth!.workspaceId,
    source: decision.source,
    projectId: decision.projectId,
    payload: { decisionId: decision.id, changed: Object.keys(input) }
  });

  res.json({ data: (await serializeDecisions(req.auth!.workspaceId, [decision]))[0] });
}));

decisionsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.decision.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const decision = await prisma.decision.update({
    where: { id: existing.id },
    data: { status: "archived" }
  });

  await createEvent({
    type: "decision_archived",
    workspaceId: req.auth!.workspaceId,
    source: decision.source,
    projectId: decision.projectId,
    payload: { decisionId: decision.id }
  });

  res.json({ data: decision });
}));
