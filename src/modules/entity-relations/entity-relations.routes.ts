import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { entityExists, organizationalEntityTypes } from "../organizational-context/organizational-context.service";

const relationTypes = ["depends_on", "blocks", "implements", "consumes", "exposes", "affects", "requires", "owned_by", "validated_by", "governed_by", "supersedes", "related_to"] as const;
const statuses = ["active", "blocked", "resolved", "archived"] as const;
const endpoint = z.object({ entityType: z.enum(organizationalEntityTypes), entityId: z.string().uuid() });
const createSchema = z.object({ dependencyType: z.enum(relationTypes), from: endpoint, to: endpoint, status: z.enum(statuses).optional(), metadata: z.record(z.unknown()).default({}) }).strict();
const updateSchema = z.object({ dependencyType: z.enum(relationTypes).optional(), status: z.enum(statuses).optional(), metadata: z.record(z.unknown()).optional() }).strict();

export const entityRelationsRouter = Router();

entityRelationsRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const entityType = typeof req.query.entityType === "string" ? req.query.entityType : null; const entityId = typeof req.query.entityId === "string" ? req.query.entityId : null;
  const relations = await prisma.dependency.findMany({ where: { workspaceId, ...(typeof req.query.status === "string" ? { status: req.query.status as any } : {}), ...(entityType && entityId ? { OR: [{ fromEntityType: entityType, fromEntityId: entityId }, { toEntityType: entityType, toEntityId: entityId }] } : {}) }, orderBy: { updatedAt: "desc" } });
  res.json({ data: relations });
}));
entityRelationsRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = createSchema.parse(req.body);
  if (!await entityExists(workspaceId, input.from.entityType, input.from.entityId) || !await entityExists(workspaceId, input.to.entityType, input.to.entityId)) return res.status(404).json({ error: "entity_not_found" });
  if (input.from.entityType === input.to.entityType && input.from.entityId === input.to.entityId) return res.status(400).json({ error: "self_relation_not_allowed" });
  const relation = await prisma.dependency.create({ data: { workspaceId, dependencyType: input.dependencyType, fromEntityType: input.from.entityType, fromEntityId: input.from.entityId, toEntityType: input.to.entityType, toEntityId: input.to.entityId, status: input.status, metadata: input.metadata as Prisma.InputJsonValue } });
  res.status(201).json({ data: relation });
}));
entityRelationsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = updateSchema.parse(req.body); const existing = await prisma.dependency.findFirst({ where: { id: String(req.params.id), workspaceId } }); if (!existing) return res.status(404).json({ error: "not_found" });
  const { metadata, ...data } = input; const relation = await prisma.dependency.update({ where: { id: existing.id }, data: { ...data, ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}) } }); res.json({ data: relation });
}));
entityRelationsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const existing = await prisma.dependency.findFirst({ where: { id: String(req.params.id), workspaceId } }); if (!existing) return res.status(404).json({ error: "not_found" });
  const relation = await prisma.dependency.update({ where: { id: existing.id }, data: { status: "archived" } }); res.json({ data: relation });
}));
