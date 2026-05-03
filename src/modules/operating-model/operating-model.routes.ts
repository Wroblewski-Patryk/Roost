import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";

const uuidSchema = z.string().uuid();

const scopedResourceSchema = z.object({
  areaId: uuidSchema.optional(),
  folderId: uuidSchema.optional(),
  tableId: uuidSchema.optional()
}).strict();

const reassignmentSchema = z.object({
  areaId: uuidSchema.nullable().optional(),
  folderId: uuidSchema.nullable().optional(),
  tableId: uuidSchema.nullable().optional()
}).strict();

const storageLocationSchema = scopedResourceSchema.extend({
  provider: z.string().min(1),
  name: z.string().min(1),
  locator: z.record(z.unknown())
}).strict();

const knowledgeRootSchema = scopedResourceSchema.extend({
  provider: z.string().min(1),
  name: z.string().min(1),
  locator: z.record(z.unknown())
}).strict();

const automationDefinitionSchema = scopedResourceSchema.extend({
  provider: z.string().min(1).optional(),
  triggerType: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional()
}).strict();

export const operatingModelRouter = Router();

async function assertScope(workspaceId: string, input: {
  areaId?: string;
  folderId?: string;
  tableId?: string;
}) {
  const [area, folder, table] = await Promise.all([
    input.areaId
      ? prisma.operatingArea.findFirst({ where: { id: input.areaId, workspaceId }, select: { id: true } })
      : Promise.resolve(null),
    input.folderId
      ? prisma.operatingFolder.findFirst({ where: { id: input.folderId, workspaceId }, select: { id: true, areaId: true } })
      : Promise.resolve(null),
    input.tableId
      ? prisma.operatingTable.findFirst({ where: { id: input.tableId, workspaceId }, select: { id: true, areaId: true, folderId: true } })
      : Promise.resolve(null)
  ]);

  if ((input.areaId && !area) || (input.folderId && !folder) || (input.tableId && !table)) {
    return false;
  }

  if (area && folder && folder.areaId !== area.id) {
    return false;
  }

  if (area && table && table.areaId !== area.id) {
    return false;
  }

  if (folder && table && table.folderId !== folder.id) {
    return false;
  }

  return true;
}

operatingModelRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [
    areas,
    externalMappings,
    externalFields,
    storageLocations,
    knowledgeRoots,
    automationDefinitions
  ] = await Promise.all([
    prisma.operatingArea.findMany({
      where: { workspaceId },
      orderBy: { position: "asc" },
      include: {
        folders: { orderBy: { name: "asc" } },
        tables: { orderBy: { apiSlug: "asc" } }
      }
    }),
    prisma.externalContainerMapping.findMany({
      where: { workspaceId },
      orderBy: [{ provider: "asc" }, { entityType: "asc" }, { name: "asc" }]
    }),
    prisma.externalFieldMapping.findMany({
      where: { workspaceId },
      orderBy: [{ provider: "asc" }, { name: "asc" }]
    }),
    prisma.storageLocation.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.knowledgeRoot.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.automationDefinition.findMany({ where: { workspaceId }, orderBy: { name: "asc" } })
  ]);

  res.json({
    data: {
      hierarchy: "workspace -> operating_area -> operating_folder -> operating_table -> record",
      areas,
      externalMappings,
      externalFields,
      storageLocations,
      knowledgeRoots,
      automationDefinitions
    }
  });
}));

operatingModelRouter.get("/tables", asyncHandler(async (req, res) => {
  const tables = await prisma.operatingTable.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: [{ source: "asc" }, { apiSlug: "asc" }],
    include: {
      area: true,
      folder: true
    }
  });

  res.json({ data: tables });
}));

operatingModelRouter.get("/external-mappings", asyncHandler(async (req, res) => {
  const mappings = await prisma.externalContainerMapping.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: [{ provider: "asc" }, { entityType: "asc" }, { name: "asc" }]
  });

  res.json({ data: mappings });
}));

operatingModelRouter.patch("/external-mappings/:id/scope", asyncHandler(async (req, res) => {
  const input = reassignmentSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const existing = await prisma.externalContainerMapping.findFirst({
    where: {
      id: String(req.params.id),
      workspaceId
    }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  const nextScope = {
    areaId: input.areaId === undefined ? existing.areaId ?? undefined : input.areaId ?? undefined,
    folderId: input.folderId === undefined ? existing.folderId ?? undefined : input.folderId ?? undefined,
    tableId: input.tableId === undefined ? existing.tableId ?? undefined : input.tableId ?? undefined
  };

  if (!(await assertScope(workspaceId, nextScope))) {
    return res.status(404).json({ error: "not_found" });
  }

  const mapping = await prisma.externalContainerMapping.update({
    where: { id: existing.id },
    data: {
      areaId: input.areaId === undefined ? existing.areaId : input.areaId,
      folderId: input.folderId === undefined ? existing.folderId : input.folderId,
      tableId: input.tableId === undefined ? existing.tableId : input.tableId
    }
  });

  await createEvent({
    type: "external_mapping_scope_updated",
    workspaceId,
    source: "companycore",
    payload: {
      mappingId: mapping.id,
      provider: mapping.provider,
      entityType: mapping.entityType,
      externalId: mapping.externalId,
      previous: {
        areaId: existing.areaId,
        folderId: existing.folderId,
        tableId: existing.tableId
      },
      next: {
        areaId: mapping.areaId,
        folderId: mapping.folderId,
        tableId: mapping.tableId
      }
    }
  });

  res.json({ data: mapping });
}));

operatingModelRouter.get("/external-fields", asyncHandler(async (req, res) => {
  const fields = await prisma.externalFieldMapping.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: [{ provider: "asc" }, { name: "asc" }],
    include: { table: true }
  });

  res.json({ data: fields });
}));

operatingModelRouter.get("/storage-locations", asyncHandler(async (req, res) => {
  const locations = await prisma.storageLocation.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { name: "asc" }
  });

  res.json({ data: locations });
}));

operatingModelRouter.post("/storage-locations", asyncHandler(async (req, res) => {
  const input = storageLocationSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  if (!(await assertScope(workspaceId, input))) {
    return res.status(404).json({ error: "not_found" });
  }

  const location = await prisma.storageLocation.create({
    data: {
      workspaceId,
      areaId: input.areaId,
      folderId: input.folderId,
      tableId: input.tableId,
      provider: input.provider,
      name: input.name,
      locator: input.locator as Prisma.InputJsonValue
    }
  });

  res.status(201).json({ data: location });
}));

operatingModelRouter.get("/knowledge-roots", asyncHandler(async (req, res) => {
  const roots = await prisma.knowledgeRoot.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { name: "asc" }
  });

  res.json({ data: roots });
}));

operatingModelRouter.post("/knowledge-roots", asyncHandler(async (req, res) => {
  const input = knowledgeRootSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  if (!(await assertScope(workspaceId, input))) {
    return res.status(404).json({ error: "not_found" });
  }

  const root = await prisma.knowledgeRoot.create({
    data: {
      workspaceId,
      areaId: input.areaId,
      folderId: input.folderId,
      tableId: input.tableId,
      provider: input.provider,
      name: input.name,
      locator: input.locator as Prisma.InputJsonValue
    }
  });

  res.status(201).json({ data: root });
}));

operatingModelRouter.get("/automation-definitions", asyncHandler(async (req, res) => {
  const automations = await prisma.automationDefinition.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    orderBy: { name: "asc" }
  });

  res.json({ data: automations });
}));

operatingModelRouter.post("/automation-definitions", asyncHandler(async (req, res) => {
  const input = automationDefinitionSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;

  if (!(await assertScope(workspaceId, input))) {
    return res.status(404).json({ error: "not_found" });
  }

  const automation = await prisma.automationDefinition.create({
    data: {
      workspaceId,
      areaId: input.areaId,
      folderId: input.folderId,
      tableId: input.tableId,
      provider: input.provider,
      triggerType: input.triggerType,
      name: input.name,
      enabled: input.enabled ?? true,
      config: (input.config ?? {}) as Prisma.InputJsonValue
    }
  });

  res.status(201).json({ data: automation });
}));
