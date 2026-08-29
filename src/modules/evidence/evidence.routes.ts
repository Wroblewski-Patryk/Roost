import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { entityExists, organizationalEntityTypes } from "../organizational-context/organizational-context.service";

const evidenceTypes = ["source_file", "git_commit", "pull_request", "test", "api_endpoint", "screenshot", "deployment", "documentation", "database_object", "metric", "external_url", "manual_verification"] as const;
const evidenceSources = ["human", "agent", "system", "import", "repository_scan"] as const;
const verificationStatuses = ["unverified", "verified", "rejected", "stale"] as const;
const actorTypes = ["user", "agent", "system", "integration"] as const;
const createSchema = z.object({
  entityType: z.enum(organizationalEntityTypes), entityId: z.string().uuid(), type: z.enum(evidenceTypes), source: z.enum(evidenceSources).optional(),
  reference: z.string().trim().min(1).max(1000), url: z.string().url().max(2000).nullable().optional(), description: z.string().trim().max(5000).nullable().optional(),
  confidence: z.number().int().min(0).max(100).nullable().optional(), observedAt: z.coerce.date().optional(), metadata: z.record(z.unknown()).default({})
}).strict();
const updateSchema = z.object({
  type: z.enum(evidenceTypes).optional(), source: z.enum(evidenceSources).optional(), reference: z.string().trim().min(1).max(1000).optional(),
  url: z.string().url().max(2000).nullable().optional(), description: z.string().trim().max(5000).nullable().optional(), confidence: z.number().int().min(0).max(100).nullable().optional(),
  observedAt: z.coerce.date().optional(), metadata: z.record(z.unknown()).optional()
}).strict();
const verifySchema = z.object({ status: z.enum(verificationStatuses), verifiedByType: z.enum(actorTypes).optional(), verifiedById: z.string().trim().max(160).optional() }).strict();

export const evidenceRouter = Router();

evidenceRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const evidence = await prisma.evidenceRecord.findMany({ where: {
    workspaceId, ...(typeof req.query.entityType === "string" ? { entityType: req.query.entityType } : {}),
    ...(typeof req.query.entityId === "string" ? { entityId: req.query.entityId } : {}),
    ...(typeof req.query.verificationStatus === "string" ? { verificationStatus: req.query.verificationStatus as any } : {})
  }, orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }] });
  res.json({ data: evidence });
}));
evidenceRouter.post("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = createSchema.parse(req.body);
  if (!await entityExists(workspaceId, input.entityType, input.entityId)) return res.status(404).json({ error: "entity_not_found" });
  const evidence = await prisma.evidenceRecord.create({ data: { ...input, metadata: input.metadata as Prisma.InputJsonValue, workspaceId } });
  await createEvent({ type: "evidence_created", workspaceId, source: input.source, resourceType: input.entityType, resourceId: input.entityId, payload: { evidenceId: evidence.id, evidenceType: evidence.type } });
  res.status(201).json({ data: evidence });
}));
evidenceRouter.patch("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = updateSchema.parse(req.body); const existing = await prisma.evidenceRecord.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!existing) return res.status(404).json({ error: "not_found" }); const { metadata, ...data } = input; const evidence = await prisma.evidenceRecord.update({ where: { id: existing.id }, data: { ...data, ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}) } }); res.json({ data: evidence });
}));
evidenceRouter.post("/:id/verification", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const input = verifySchema.parse(req.body); const existing = await prisma.evidenceRecord.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!existing) return res.status(404).json({ error: "not_found" }); const evidence = await prisma.evidenceRecord.update({ where: { id: existing.id }, data: { verificationStatus: input.status, verifiedByType: input.verifiedByType, verifiedById: input.verifiedById, verifiedAt: input.status === "verified" ? new Date() : null } });
  await createEvent({ type: "evidence_verification_changed", workspaceId, resourceType: existing.entityType, resourceId: existing.entityId, payload: { evidenceId: existing.id, status: input.status } }); res.json({ data: evidence });
}));
evidenceRouter.delete("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId; const existing = await prisma.evidenceRecord.findFirst({ where: { id: String(req.params.id), workspaceId } }); if (!existing) return res.status(404).json({ error: "not_found" });
  await prisma.evidenceRecord.delete({ where: { id: existing.id } }); res.status(204).send();
}));
