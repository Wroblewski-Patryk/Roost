import { AgentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createAgentSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1).optional(),
  status: z.nativeEnum(AgentStatus).optional(),
  externalId: z.string().min(1).optional(),
  source: z.string().min(1).optional()
}).strict();

export const agentsRouter = Router();

agentsRouter.get("/", asyncHandler(async (req, res) => {
  const agents = await prisma.agent.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: agents });
}));

agentsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createAgentSchema.parse(req.body);
  const agent = await prisma.agent.create({
    data: {
      ...input,
      workspaceId: req.auth!.workspaceId
    }
  });

  await createEvent({
    type: "agent_created",
    workspaceId: req.auth!.workspaceId,
    source: agent.source,
    payload: {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status
    }
  });

  res.status(201).json({ data: agent });
}));
