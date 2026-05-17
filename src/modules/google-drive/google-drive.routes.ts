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
  updateGoogleDriveTextFileContent,
  updateGoogleSheetValues
} from "../../integrations/google-drive/google-drive.content";
import { asyncHandler } from "../../middleware/async-handler";

const createDocSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).optional(),
  initialText: z.string().optional()
}).strict();

const updateDocSchema = z.object({
  requests: z.array(z.unknown()),
  writeControl: z.record(z.unknown()).optional()
}).strict();

const createSheetSchema = z.object({
  title: z.string().min(1),
  parentId: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
  values: z.array(z.array(z.unknown())).optional()
}).strict();

const updateSheetValuesSchema = z.object({
  range: z.string().min(1),
  values: z.array(z.array(z.unknown()))
}).strict();

const uuidSchema = z.string().uuid();

const updateDriveScopeSchema = z.object({
  areaId: uuidSchema,
  applyToChildren: z.boolean().optional()
}).strict();

const updateDriveDescriptionSchema = z.object({
  description: z.string().max(2000).nullable()
}).strict();

const updateDriveTextContentSchema = z.object({
  content: z.string().max(500_000)
}).strict();

export const googleDriveRouter = Router();

googleDriveRouter.get("/files", asyncHandler(async (req, res) => {
  const files = await listGoogleDriveFiles(req.auth!.workspaceId);
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
      content: input.content
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
