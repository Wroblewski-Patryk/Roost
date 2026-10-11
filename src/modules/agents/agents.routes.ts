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

const updateAgentSchema = createAgentSchema.partial().omit({
  externalId: true,
  source: true
});

export const agentsRouter = Router();

agentsRouter.get("/", asyncHandler(async (req, res) => {
  const retired = z.enum(["exclude", "only", "all"]).default("exclude").parse(req.query.retired);
  const agents = await prisma.agent.findMany({
    where: { workspaceId: req.auth!.workspaceId, ...(retired === "all" ? {} : { status: retired === "only" ? AgentStatus.retired : { not: AgentStatus.retired } }) },
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: agents });
}));

agentsRouter.get("/:id", asyncHandler(async (req, res) => {
  const agent = await prisma.agent.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!agent) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: agent });
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

agentsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateAgentSchema.parse(req.body);
  const existing = await prisma.agent.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const agent = await prisma.agent.update({
    where: { id: existing.id },
    data: input
  });

  await createEvent({
    type: "agent_updated",
    workspaceId: req.auth!.workspaceId,
    source: agent.source,
    payload: { agentId: agent.id, changed: Object.keys(input) }
  });

  res.json({ data: agent });
}));

agentsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const existing = await prisma.agent.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const agent = await prisma.agent.update({
    where: { id: existing.id },
    data: { status: "retired" }
  });

  await createEvent({
    type: "agent_retired",
    workspaceId: req.auth!.workspaceId,
    source: agent.source,
    payload: { agentId: agent.id }
  });

  res.json({ data: agent });
}));
