import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const createAgentLogSchema = z.object({
  agentId: z.string().uuid().optional(),
  level: z.string().min(1).optional(),
  message: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

export const agentLogsRouter = Router();

agentLogsRouter.get("/", asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit ?? 200);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500) : 200;
  const logs = await prisma.agentLog.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit
  });
  res.json({ data: logs });
}));

agentLogsRouter.get("/:id", asyncHandler(async (req, res) => {
  const log = await prisma.agentLog.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!log) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: log });
}));

agentLogsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createAgentLogSchema.parse(req.body);
  if (input.agentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: input.agentId, workspaceId: req.auth!.workspaceId }
    });
    if (!agent) {
      return res.status(404).json({ error: "not_found" });
    }
  }

  const log = await prisma.agentLog.create({
    data: {
      ...input,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      workspaceId: req.auth!.workspaceId
    }
  });

  res.status(201).json({ data: log });
}));
