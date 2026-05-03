import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { createCompanyCoreNoteInClickUp } from "../../integrations/clickup/clickup.webhooks";
import { IntegrationError } from "../../integrations/errors";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createNoteSchema = z.object({
  content: z.string().min(1),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

export const notesRouter = Router();

notesRouter.get("/", asyncHandler(async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: notes });
}));

notesRouter.post("/", asyncHandler(async (req, res) => {
  const input = createNoteSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  const relationChecks = [
    input.projectId ? prisma.project.findFirst({ where: { id: input.projectId, workspaceId } }) : null,
    input.taskId ? prisma.task.findFirst({ where: { id: input.taskId, workspaceId } }) : null,
    input.clientId ? prisma.client.findFirst({ where: { id: input.clientId, workspaceId } }) : null,
    input.dealId ? prisma.deal.findFirst({ where: { id: input.dealId, workspaceId } }) : null
  ].filter(Boolean);

  const relations = await Promise.all(relationChecks);
  if (relations.some((relation) => !relation)) {
    return res.status(404).json({ error: "not_found" });
  }

  let providerFields = {
    externalId: input.externalId,
    source: input.source
  };

  const task = input.taskId
    ? await prisma.task.findFirst({ where: { id: input.taskId, workspaceId } })
    : null;
  if (!input.externalId && task?.source === "clickup" && task.externalId) {
    try {
      const clickUpComment = await createCompanyCoreNoteInClickUp({
        workspaceId,
        externalTaskId: task.externalId,
        content: input.content
      });
      providerFields = {
        externalId: clickUpComment?.id,
        source: "clickup"
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        await createEvent({
          type: "clickup_comment_create_failed",
          workspaceId,
          taskId: task.id,
          source: "clickup",
          payload: {
            provider: "clickup",
            taskId: task.id,
            externalId: task.externalId,
            errorCode: error.code
          }
        });
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  }

  const note = await prisma.note.create({
    data: {
      ...input,
      ...providerFields,
      workspaceId
    }
  });
  await createEvent({
    type: "note_created",
    workspaceId,
    source: note.source,
    projectId: note.projectId,
    taskId: note.taskId,
    payload: {
      noteId: note.id,
      projectId: note.projectId,
      taskId: note.taskId,
      clientId: note.clientId,
      dealId: note.dealId
    }
  });
  res.status(201).json({ data: note });
}));
