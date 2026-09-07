import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { createCompanyCoreNoteInClickUp, writeBackCompanyCoreNoteToClickUp } from "../../integrations/clickup/clickup.webhooks";
import { IntegrationError } from "../../integrations/errors";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const createNoteSchema = z.object({
  content: z.string().min(1),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  status: z.string().min(1).optional(),
  externalId: z.string().optional(),
  source: z.string().optional()
});

const updateNoteSchema = createNoteSchema.partial().omit({
  externalId: true,
  source: true
});

export const notesRouter = Router();

async function noteRelationsAreVisible(workspaceId: string, input: {
  projectId?: string;
  taskId?: string;
  clientId?: string;
  dealId?: string;
}) {
  const checks = [
    input.projectId ? prisma.project.findFirst({ where: { id: input.projectId, workspaceId } }) : null,
    input.taskId ? prisma.task.findFirst({ where: { id: input.taskId, workspaceId } }) : null,
    input.clientId ? prisma.client.findFirst({ where: { id: input.clientId, workspaceId } }) : null,
    input.dealId ? prisma.deal.findFirst({ where: { id: input.dealId, workspaceId } }) : null
  ].filter(Boolean);

  const relations = await Promise.all(checks);
  return relations.every((relation) => Boolean(relation));
}

notesRouter.get("/", asyncHandler(async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json({ data: notes });
}));

notesRouter.get("/:id", asyncHandler(async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId }
  });

  if (!note) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ data: note });
}));

notesRouter.post("/", asyncHandler(async (req, res) => {
  const input = createNoteSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  if (!await noteRelationsAreVisible(workspaceId, input)) {
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

notesRouter.patch("/:id", asyncHandler(async (req, res) => {
  const input = updateNoteSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  if (!await noteRelationsAreVisible(workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.note.findFirst({
    where: { id: String(req.params.id), workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (existing.source === "clickup" && existing.externalId) {
    await writeBackCompanyCoreNoteToClickUp({ workspaceId, externalId: existing.externalId, content: input.content, archived: input.status === "archived" });
  }

  const note = await prisma.note.update({
    where: { id: existing.id },
    data: input
  });

  await createEvent({
    type: "note_updated",
    workspaceId,
    source: note.source,
    projectId: note.projectId,
    taskId: note.taskId,
    payload: { noteId: note.id, changed: Object.keys(input) }
  });

  res.json({ data: note });
}));

notesRouter.delete("/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const existing = await prisma.note.findFirst({
    where: { id: String(req.params.id), workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (existing.source === "clickup" && existing.externalId) {
    await writeBackCompanyCoreNoteToClickUp({ workspaceId, externalId: existing.externalId, archived: true });
  }

  const note = await prisma.note.update({
    where: { id: existing.id },
    data: { status: "archived" }
  });

  await createEvent({
    type: "note_archived",
    workspaceId,
    source: note.source,
    projectId: note.projectId,
    taskId: note.taskId,
    payload: { noteId: note.id }
  });

  res.json({ data: note });
}));
