import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureDefaultDepartments } from "../departments/departments.routes";
import {
  departmentKeysAreValid,
  entityExists,
  organizationalContextsForEntities,
  organizationalEntityTypes,
  organizationalScopeTypes,
  replaceOrganizationalContext
} from "./organizational-context.service";

const contextSchema = z.object({
  ownerDepartmentKey: z.string().nullable().optional(),
  relatedDepartmentKeys: z.array(z.string()).default([]),
  applicableDepartmentKeys: z.array(z.string()).default([]),
  scopes: z.array(z.object({
    type: z.enum(organizationalScopeTypes),
    entityId: z.string().trim().min(1).nullable().optional(),
    label: z.string().trim().max(160).nullable().optional()
  })).default([])
}).strict();

const paramsSchema = z.object({ entityType: z.enum(organizationalEntityTypes), entityId: z.string().uuid() });

export const organizationalContextRouter = Router();

organizationalContextRouter.get("/:entityType/:entityId", asyncHandler(async (req, res) => {
  const params = paramsSchema.parse(req.params);
  const workspaceId = req.auth!.workspaceId;
  if (!await entityExists(workspaceId, params.entityType, params.entityId)) return res.status(404).json({ error: "not_found" });
  const contexts = await organizationalContextsForEntities(workspaceId, params.entityType, [params.entityId]);
  res.json({ data: contexts.get(params.entityId) });
}));

organizationalContextRouter.patch("/:entityType/:entityId", asyncHandler(async (req, res) => {
  const params = paramsSchema.parse(req.params);
  const input = contextSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  if (!departmentKeysAreValid(input)) return res.status(400).json({ error: "invalid_department_key" });
  if (!await entityExists(workspaceId, params.entityType, params.entityId)) return res.status(404).json({ error: "not_found" });
  await ensureDefaultDepartments(workspaceId);
  await prisma.$transaction((transaction) => replaceOrganizationalContext(transaction, workspaceId, params.entityType, params.entityId, input));
  const contexts = await organizationalContextsForEntities(workspaceId, params.entityType, [params.entityId]);
  res.json({ data: contexts.get(params.entityId) });
}));
