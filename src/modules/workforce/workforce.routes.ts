import { WorkforceEntityStatus, WorkforceEntityType, WorkforcePersonalityProfile, WorkforceRuntimeMode } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import {
  archiveWorkforceEntity,
  createWorkforceEntity,
  deleteWorkforceEntity,
  getWorkforceEntity,
  listWorkforceEntities,
  syncWorkforceEntity,
  updateWorkforceEntity
} from "./workforce.service";

const querySchema = z.object({
  type: z.nativeEnum(WorkforceEntityType).optional(),
  status: z.nativeEnum(WorkforceEntityStatus).optional(),
  q: z.string().trim().min(1).optional(),
  refresh: z.string().optional()
}).strict();

const createSchema = z.object({
  type: z.nativeEnum(WorkforceEntityType),
  status: z.nativeEnum(WorkforceEntityStatus).optional(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  avatar: z.string().trim().max(500).nullable().optional(),
  department: z.string().trim().max(120).nullable().optional(),
  role: z.string().trim().max(180).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  personalityProfile: z.nativeEnum(WorkforcePersonalityProfile).optional(),
  model: z.string().trim().max(120).nullable().optional(),
  runtimeMode: z.nativeEnum(WorkforceRuntimeMode).optional(),
  paperclipAgentId: z.string().trim().max(180).nullable().optional(),
  synchronizationEnabled: z.boolean().optional(),
  hierarchyLevel: z.string().trim().max(120).nullable().optional(),
  bigFiveProfile: z.record(z.number().min(0).max(5)).optional(),
  skillIndex: z.array(z.string().trim().min(1).max(160)).max(80).optional(),
  knowledgeIndex: z.array(z.string().trim().min(1).max(180)).max(120).optional(),
  toolIndex: z.array(z.string().trim().min(1).max(180)).max(160).optional(),
  authorityScope: z.array(z.string().trim().min(1).max(180)).max(120).optional(),
  paperclipProfile: z.record(z.unknown()).optional()
}).strict();

const updateSchema = createSchema.partial();

function routeError(error: unknown, res: { status: (status: number) => { json: (body: unknown) => unknown } }) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return res.status(error.status).json({ error: error.message });
  }
  throw error;
}

export const workforceRouter = Router();

workforceRouter.get("/", asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const data = await listWorkforceEntities(req.auth!.workspaceId, query);
  res.json({ data });
}));

workforceRouter.get("/:id", asyncHandler(async (req, res) => {
  const entity = await getWorkforceEntity(req.auth!.workspaceId, z.string().uuid().parse(req.params.id));
  if (!entity) {
    return res.status(404).json({ error: "not_found" });
  }
  res.json({ data: entity });
}));

workforceRouter.post("/", asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  try {
    const entity = await createWorkforceEntity(req.auth!.workspaceId, input);
    res.status(201).json({ data: entity });
  } catch (error) {
    return routeError(error, res);
  }
}));

workforceRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateSchema.parse(req.body);
  try {
    const entity = await updateWorkforceEntity(req.auth!.workspaceId, z.string().uuid().parse(req.params.id), input);
    if (!entity) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json({ data: entity });
  } catch (error) {
    return routeError(error, res);
  }
}));

workforceRouter.delete("/:id", asyncHandler(async (req, res) => {
  const entity = await archiveWorkforceEntity(req.auth!.workspaceId, z.string().uuid().parse(req.params.id));
  if (!entity) {
    return res.status(404).json({ error: "not_found" });
  }
  res.json({ data: entity });
}));

workforceRouter.post("/:id/actions/delete", asyncHandler(async (req, res) => {
  try {
    const result = await deleteWorkforceEntity(req.auth!.workspaceId, z.string().uuid().parse(req.params.id));
    if (!result) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json({ data: result });
  } catch (error) {
    return routeError(error, res);
  }
}));

workforceRouter.post("/:id/actions/sync", asyncHandler(async (req, res) => {
  try {
    const result = await syncWorkforceEntity(req.auth!.workspaceId, z.string().uuid().parse(req.params.id), req.auth!.userId);
    if (!result) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json({ data: result });
  } catch (error) {
    return routeError(error, res);
  }
}));
