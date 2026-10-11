import { Router } from "express";
import { z } from "zod";
import { IntegrationError } from "../../integrations/errors";
import { prisma } from "../../db/prisma";
import { toJsonInput } from "../../integrations/integration-settings.service";
import {
  createGoogleDoc,
  createGoogleSheet,
  listGoogleDriveFiles,
  readGoogleDriveFileContent,
  updateGoogleDoc,
  updateGoogleDriveFileMetadata,
  updateGoogleDriveTextFileContent,
  updateGoogleSheetValues
} from "../../integrations/google-drive/google-drive.content";
import { asyncHandler } from "../../middleware/async-handler";
import { appendGovernedGoogleDoc, closeGovernedGoogleDocIntent, createGovernedGoogleDocMandate, governedGoogleDocCandidate, readGovernedGoogleDoc } from "../../integrations/google-drive/google-doc-governance";

const createDocSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).optional(),
  initialText: z.string().optional()
}).strict();

const updateDocSchema = z.object({
  requests: z.array(z.unknown()).min(1),
  expectedRevision: z.string().min(1).optional(),
  writeControl: z.record(z.unknown()).optional()
}).strict();

const createSheetSchema = z.object({
  title: z.string().min(1),
  parentId: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
  values: z.array(z.array(z.unknown())).optional()
}).strict();

const updateSheetValuesSchema = z.object({
  expectedRevision: z.string().min(1),
  valueInputOption: z.enum(["RAW", "USER_ENTERED"]).default("RAW"),
  range: z.string().min(1),
  values: z.array(z.array(z.unknown()))
}).strict();

const uuidSchema = z.string().uuid();
const governedDocMandateSchema = z.object({ requestId: uuidSchema, sourceSnapshotId: uuidSchema, credentialId: uuidSchema,
  expectedRevision: z.string().min(1), classification: z.enum(["fact", "observation", "proposal", "inference"]), validUntil: z.string().datetime() }).strict();
const governedDocAppendSchema = z.object({ requestId: uuidSchema, expectedRevision: z.string().min(1),
  text: z.string().min(1).max(20_000).refine(value => value.trim().length > 0 && !/[\u0000-\u0008\u000c-\u001f\ue000-\uf8ff]/u.test(value), "Unsupported control characters") }).strict();

const updateDriveScopeSchema = z.object({
  areaId: uuidSchema,
  applyToChildren: z.boolean().optional()
}).strict();

const updateDriveDescriptionSchema = z.object({
  description: z.string().max(2000).nullable()
}).strict();

const updateDriveTextContentSchema = z.object({
  expectedRevision: z.string().min(1),
  content: z.string().max(500_000)
}).strict();

export const googleDriveRouter = Router();

googleDriveRouter.get("/tasks/:taskId/docs/:id/governed", asyncHandler(async (req, res) => {
  try {
    const data = await readGovernedGoogleDoc(req.auth!, uuidSchema.parse(req.params.taskId), uuidSchema.parse(req.params.id));
    res.json({ data });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

googleDriveRouter.get("/tasks/:taskId/docs/:id/governed/candidate", asyncHandler(async (req, res) => {
  try {
    const data = await governedGoogleDocCandidate(req.auth!, uuidSchema.parse(req.params.taskId), uuidSchema.parse(req.params.id));
    res.json({ data });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

googleDriveRouter.post("/tasks/:taskId/docs/:id/governed/mandate", asyncHandler(async (req, res) => {
  const body = governedDocMandateSchema.parse(req.body);
  if (!req.header("X-Owner-Action-Proof")) return res.status(403).json({ error: "google_doc_fresh_owner_required" });
  try {
    const data = await createGovernedGoogleDocMandate(req.auth!, { taskId: uuidSchema.parse(req.params.taskId), fileId: uuidSchema.parse(req.params.id), ...body });
    res.status(201).json({ data });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

googleDriveRouter.post("/tasks/:taskId/docs/:id/governed/append", asyncHandler(async (req, res) => {
  const body = governedDocAppendSchema.parse(req.body);
  try {
    const data = await appendGovernedGoogleDoc(req.auth!, { taskId: uuidSchema.parse(req.params.taskId), fileId: uuidSchema.parse(req.params.id), ...body });
    res.status(201).json({ data });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

googleDriveRouter.post("/tasks/:taskId/docs/:id/governed/intents/:intentId/close", asyncHandler(async (req, res) => {
  try {
    const data = await closeGovernedGoogleDocIntent(req.auth!, uuidSchema.parse(req.params.taskId), uuidSchema.parse(req.params.id), uuidSchema.parse(req.params.intentId));
    res.json({ data });
  } catch (error) {
    if (error instanceof IntegrationError) return res.status(error.status).json({ error: error.code });
    throw error;
  }
}));

googleDriveRouter.get("/files", asyncHandler(async (req, res) => {
  const files = await listGoogleDriveFiles(req.auth!.workspaceId, { parentId: typeof req.query.parentId === "string" ? req.query.parentId : undefined, q: typeof req.query.q === "string" ? req.query.q : undefined });
  res.json({ data: files });
}));

googleDriveRouter.get("/files/:id/content", asyncHandler(async (req, res) => {
  try {
    const snapshot = await readGoogleDriveFileContent({
      workspaceId: req.auth!.workspaceId,
      fileId: String(req.params.id),
      range: typeof req.query.range === "string" ? req.query.range : undefined
    });
    res.json({ data: snapshot });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.patch("/files/:id/scope", asyncHandler(async (req, res) => {
  const input = updateDriveScopeSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const fileId = uuidSchema.parse(req.params.id);

  const area = await prisma.operatingArea.findFirst({
    where: { id: input.areaId, workspaceId },
    select: { id: true }
  });
  if (!area) {
    return res.status(404).json({ error: "not_found" });
  }

  const file = await prisma.googleDriveFile.findFirst({
    where: { id: fileId, workspaceId, provider: "google_drive" }
  });
  if (!file) {
    return res.status(404).json({ error: "not_found" });
  }

  const externalIdsToUpdate = new Set([file.externalId]);
  if ((input.applyToChildren ?? true) && file.isFolder) {
    let parents = [file.externalId];
    while (parents.length > 0) {
      const children = await prisma.googleDriveFile.findMany({
        where: {
          workspaceId,
          provider: "google_drive",
          parentExternalId: { in: parents }
        },
        select: {
          externalId: true
        }
      });
      const nextParents: string[] = [];
      for (const child of children) {
        if (!externalIdsToUpdate.has(child.externalId)) {
          externalIdsToUpdate.add(child.externalId);
          nextParents.push(child.externalId);
        }
      }
      parents = nextParents;
    }
  }

  await prisma.googleDriveFile.updateMany({
    where: {
      workspaceId,
      provider: "google_drive",
      externalId: { in: [...externalIdsToUpdate] }
    },
    data: {
      operatingAreaId: area.id
    }
  });

  if (file.isFolder) {
    const settings = await prisma.integrationSetting.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: "google_drive"
        }
      }
    });
    if (settings) {
      const config = settings.config && typeof settings.config === "object" && !Array.isArray(settings.config)
        ? settings.config as Record<string, unknown>
        : {};
      const existingMappings = Array.isArray(config.operatingScopeMappings)
        ? config.operatingScopeMappings.filter((mapping) => (
          mapping
          && typeof mapping === "object"
          && !Array.isArray(mapping)
          && (mapping as Record<string, unknown>).folderId !== file.externalId
        )) as Record<string, unknown>[]
        : [];
      await prisma.integrationSetting.update({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider: "google_drive"
          }
        },
        data: {
          config: toJsonInput({
            ...config,
            operatingScopeMappings: [
              ...existingMappings,
              {
                folderId: file.externalId,
                operatingAreaId: area.id
              }
            ]
          })
        }
      });
    }
  }

  const files = await prisma.googleDriveFile.findMany({
    where: {
      workspaceId,
      provider: "google_drive",
      externalId: { in: [...externalIdsToUpdate] }
    },
    orderBy: [{ isFolder: "desc" }, { name: "asc" }]
  });

  res.json({
    data: {
      updatedCount: files.length,
      files
    }
  });
}));

googleDriveRouter.patch("/files/:id/description", asyncHandler(async (req, res) => {
  const input = updateDriveDescriptionSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const fileId = uuidSchema.parse(req.params.id);

  const file = await prisma.googleDriveFile.findFirst({
    where: { id: fileId, workspaceId, provider: "google_drive" }
  });
  if (!file) {
    return res.status(404).json({ error: "not_found" });
  }

  const updated = await prisma.googleDriveFile.update({
    where: { id: file.id },
    data: {
      description: input.description?.trim() || null
    },
    include: {
      contentSnapshots: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    }
  });

  res.json({ data: updated });
}));

googleDriveRouter.patch("/files/:id/text-content", asyncHandler(async (req, res) => {
  const input = updateDriveTextContentSchema.parse(req.body);
  try {
    const result = await updateGoogleDriveTextFileContent({
      workspaceId: req.auth!.workspaceId,
      fileId: String(req.params.id),
      content: input.content,
      expectedRevision: input.expectedRevision
    });
    res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.post("/docs", asyncHandler(async (req, res) => {
  const input = createDocSchema.parse(req.body);
  try {
    const result = await createGoogleDoc({
      workspaceId: req.auth!.workspaceId,
      ...input
    });
    res.status(201).json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.patch("/docs/:id", asyncHandler(async (req, res) => {
  const input = updateDocSchema.parse(req.body);
  try {
    const result = await updateGoogleDoc({
      workspaceId: req.auth!.workspaceId,
      fileId: String(req.params.id),
      ...input
    });
    res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.post("/sheets", asyncHandler(async (req, res) => {
  const input = createSheetSchema.parse(req.body);
  try {
    const result = await createGoogleSheet({
      workspaceId: req.auth!.workspaceId,
      ...input
    });
    res.status(201).json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.put("/sheets/:id/values", asyncHandler(async (req, res) => {
  const input = updateSheetValuesSchema.parse(req.body);
  try {
    const result = await updateGoogleSheetValues({
      workspaceId: req.auth!.workspaceId,
      fileId: String(req.params.id),
      ...input
    });
    res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

googleDriveRouter.patch("/files/:id/metadata", asyncHandler(async (req, res) => {
  const input = z.object({ name: z.string().min(1).optional(), parentId: z.string().min(1).optional(), trashed: z.boolean().optional() }).strict().parse(req.body);
  const file = await updateGoogleDriveFileMetadata({ workspaceId: req.auth!.workspaceId, fileId: String(req.params.id), ...input });
  res.json({ data: file });
}));
