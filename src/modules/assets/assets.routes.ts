import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { toJsonInput } from "../../integrations/integration-settings.service";
import { asyncHandler } from "../../middleware/async-handler";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";

const ASSETS_DEPARTMENT_KEY = "08-zasoby";
const DEFAULT_LIMIT = 100;

const querySchema = z.object({
  type: z.string().min(1).optional(),
  readiness: z.enum(["not_indexed", "metadata_ready", "content_ready", "summary_ready", "relation_ready", "ai_context_ready"]).optional(),
  areaKey: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(DEFAULT_LIMIT)
}).strict();

const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  parentExternalId: z.string().trim().min(1).nullable().optional(),
  departmentKey: z.string().trim().min(1).nullable().optional()
}).strict();

type ReadinessLabel = "not_indexed" | "metadata_ready" | "content_ready" | "summary_ready" | "relation_ready" | "ai_context_ready";

export const assetsRouter = Router();

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textMetadata(value: unknown, key: string) {
  const record = metadataRecord(value);
  const nested = record[key];
  return typeof nested === "string" && nested.trim().length > 0 ? nested : null;
}

function driveResourceType(file: { isFolder: boolean; mimeType: string; name: string }) {
  if (file.isFolder) {
    return "folder";
  }

  if (file.mimeType.includes("spreadsheet")) {
    return "spreadsheet";
  }

  if (file.mimeType.startsWith("image/")) {
    return "image";
  }

  if (file.mimeType.startsWith("video/")) {
    return "video";
  }

  if (file.name.toLowerCase().endsWith(".md")) {
    return "markdown";
  }

  if (file.mimeType.includes("document") || file.mimeType.includes("pdf") || file.mimeType.includes("text")) {
    return "document";
  }

  return "knowledge_note";
}

function normalizeResourceType(type: string) {
  const normalized = type.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const supported = new Set([
    "document",
    "markdown",
    "spreadsheet",
    "image",
    "video",
    "prompt",
    "architecture_doc",
    "repository",
    "api_reference",
    "deployment_doc",
    "knowledge_note",
    "contract",
    "brand_asset"
  ]);

  return supported.has(normalized) ? normalized : "knowledge_note";
}

function readinessForDriveFile(file: {
  description: string | null;
  operatingAreaId: string | null;
  operatingFolderId: string | null;
  operatingTableId: string | null;
  storageLocationId: string | null;
  knowledgeRootId: string | null;
  syncStatus: string;
  scanStatus: string;
  contentSnapshots: Array<{ summary: string | null; extractedText: string | null; scanStatus: string }>;
}) {
  const latestSnapshot = file.contentSnapshots[0];
  const hasMetadata = Boolean(file.description || file.operatingAreaId || file.operatingFolderId || file.knowledgeRootId);
  const hasContent = Boolean(latestSnapshot?.extractedText || latestSnapshot?.summary);
  const hasSummary = Boolean(file.description || latestSnapshot?.summary);
  const hasRelation = Boolean(file.operatingAreaId || file.operatingFolderId || file.operatingTableId || file.storageLocationId || file.knowledgeRootId);

  if (hasMetadata && hasContent && hasSummary && hasRelation && file.syncStatus === "synced" && file.scanStatus !== "failed") {
    return "ai_context_ready" satisfies ReadinessLabel;
  }

  if (hasRelation) {
    return "relation_ready" satisfies ReadinessLabel;
  }

  if (hasSummary) {
    return "summary_ready" satisfies ReadinessLabel;
  }

  if (hasContent) {
    return "content_ready" satisfies ReadinessLabel;
  }

  if (hasMetadata) {
    return "metadata_ready" satisfies ReadinessLabel;
  }

  return "not_indexed" satisfies ReadinessLabel;
}

function readinessForResource(resource: {
  metadata: unknown;
  relatedProjectId: string | null;
  relatedProcessId: string | null;
  accessLevel: string;
}) {
  const summary = textMetadata(resource.metadata, "summary") ?? textMetadata(resource.metadata, "description");
  const hasRelation = Boolean(resource.relatedProjectId || resource.relatedProcessId);

  if (summary && hasRelation && resource.accessLevel !== "restricted") {
    return "ai_context_ready" satisfies ReadinessLabel;
  }

  if (hasRelation) {
    return "relation_ready" satisfies ReadinessLabel;
  }

  if (summary) {
    return "summary_ready" satisfies ReadinessLabel;
  }

  if (Object.keys(metadataRecord(resource.metadata)).length > 0) {
    return "metadata_ready" satisfies ReadinessLabel;
  }

  return "not_indexed" satisfies ReadinessLabel;
}

function blockedAssetsActions() {
  return [
    {
      action: "delete_move_or_share_provider_file",
      reason: "Provider-side delete, move, share, and permission changes need explicit Google Drive command contracts and owner approval."
    },
    {
      action: "edit_contract_or_legal_document",
      reason: "Legal and commercial documents require separate legal/commercial review authority."
    },
    {
      action: "expand_sync_scope",
      reason: "Sync scope expansion must use existing Google Drive settings/import contracts and owner confirmation."
    },
    {
      action: "use_restricted_resource_as_agent_context",
      reason: "Private or restricted resources need permission evidence before agent context use."
    },
    {
      action: "execute_provider_write",
      reason: "Assets context is read-only; provider writes stay behind integration-specific commands."
    }
  ];
}

async function descendantExternalIds(workspaceId: string, rootExternalId: string) {
  const externalIds = new Set([rootExternalId]);
  let parents = [rootExternalId];

  while (parents.length > 0) {
    const children = await prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        provider: "google_drive",
        parentExternalId: { in: parents },
        trashed: false
      },
      select: {
        externalId: true
      }
    });
    const nextParents: string[] = [];
    for (const child of children) {
      if (!externalIds.has(child.externalId)) {
        externalIds.add(child.externalId);
        nextParents.push(child.externalId);
      }
    }
    parents = nextParents;
  }

  return [...externalIds];
}

async function driveFolderScopeRoot(workspaceId: string, folder: { externalId: string; parentExternalId: string | null; operatingAreaId: string | null }) {
  let current = folder;
  const visited = new Set<string>();

  while (current.parentExternalId && !visited.has(current.externalId)) {
    visited.add(current.externalId);
    const parent = await prisma.googleDriveFile.findFirst({
      where: {
        workspaceId,
        provider: "google_drive",
        externalId: current.parentExternalId,
        isFolder: true,
        trashed: false
      },
      select: {
        externalId: true,
        parentExternalId: true,
        operatingAreaId: true
      }
    });
    if (!parent) {
      break;
    }
    current = parent;
  }

  return current;
}

async function updateRootScopeMapping(workspaceId: string, folderExternalId: string, operatingAreaId: string | null) {
  const settings = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: "google_drive"
      }
    }
  });
  if (!settings) {
    return;
  }

  const config = settings.config && typeof settings.config === "object" && !Array.isArray(settings.config)
    ? settings.config as Record<string, unknown>
    : {};
  const existingMappings = Array.isArray(config.operatingScopeMappings)
    ? config.operatingScopeMappings.filter((mapping) => (
      mapping
      && typeof mapping === "object"
      && !Array.isArray(mapping)
      && (mapping as Record<string, unknown>).folderId !== folderExternalId
    )) as Record<string, unknown>[]
    : [];

  const operatingScopeMappings = operatingAreaId
    ? [
      ...existingMappings,
      {
        folderId: folderExternalId,
        operatingAreaId
      }
    ]
    : existingMappings;

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
        operatingScopeMappings
      })
    }
  });
}

function folderResponse(folder: {
  id: string;
  name: string;
  externalId: string;
  parentExternalId: string | null;
  operatingArea?: { id: string; key: string; name: string } | null;
}, updatedCount: number) {
  return {
    id: folder.id,
    name: folder.name,
    externalId: folder.externalId,
    parentExternalId: folder.parentExternalId,
    department: folder.operatingArea ? {
      id: folder.operatingArea.id,
      key: folder.operatingArea.key,
      name: folder.operatingArea.name
    } : null,
    updatedCount
  };
}

assetsRouter.patch("/folders/:id", asyncHandler(async (req, res) => {
  const input = updateFolderSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const folderId = z.string().uuid().parse(req.params.id);

  const folder = await prisma.googleDriveFile.findFirst({
    where: {
      id: folderId,
      workspaceId,
      provider: "google_drive",
      isFolder: true,
      trashed: false
    },
    include: {
      operatingArea: true
    }
  });
  if (!folder) {
    return res.status(404).json({ error: "not_found" });
  }

  const descendantIds = await descendantExternalIds(workspaceId, folder.externalId);
  let nextParentExternalId = folder.parentExternalId;
  let inheritedAreaId = folder.operatingAreaId;
  let movingToChild = false;

  if (input.parentExternalId !== undefined) {
    nextParentExternalId = input.parentExternalId;
    if (input.parentExternalId !== null) {
      if (input.parentExternalId === folder.externalId || descendantIds.includes(input.parentExternalId)) {
        return res.status(409).json({ error: "folder_parent_cycle" });
      }

      const parent = await prisma.googleDriveFile.findFirst({
        where: {
          workspaceId,
          provider: "google_drive",
          externalId: input.parentExternalId,
          isFolder: true,
          trashed: false
        },
        select: {
          externalId: true,
          parentExternalId: true,
          operatingAreaId: true
        }
      });
      if (!parent) {
        return res.status(404).json({ error: "parent_folder_not_found" });
      }

      const scopeRoot = await driveFolderScopeRoot(workspaceId, parent);
      inheritedAreaId = scopeRoot.operatingAreaId ?? parent.operatingAreaId;
      movingToChild = true;
    }
  }

  if (nextParentExternalId && input.departmentKey !== undefined) {
    return res.status(409).json({ error: "department_assignment_requires_root_folder" });
  }

  if (!nextParentExternalId && input.departmentKey !== undefined) {
    if (input.departmentKey === null) {
      inheritedAreaId = null;
    } else {
      const department = resolveDepartmentEntry(input.departmentKey);
      if (!department) {
        return res.status(422).json({ error: "invalid_department" });
      }

      const area = await prisma.operatingArea.findFirst({
        where: {
          workspaceId,
          key: department.backendAreaKey
        },
        select: {
          id: true
        }
      });
      if (!area) {
        return res.status(404).json({ error: "department_area_not_found" });
      }
      inheritedAreaId = area.id;
    }
  }

  await prisma.googleDriveFile.update({
    where: {
      id: folder.id
    },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parentExternalId !== undefined ? { parentExternalId: input.parentExternalId } : {})
    }
  });

  const shouldCascadeScope = input.parentExternalId !== undefined || (!nextParentExternalId && input.departmentKey !== undefined);
  if (shouldCascadeScope) {
    await prisma.googleDriveFile.updateMany({
      where: {
        workspaceId,
        provider: "google_drive",
        externalId: { in: descendantIds }
      },
      data: {
        operatingAreaId: inheritedAreaId
      }
    });
  }

  if (input.parentExternalId !== undefined || input.departmentKey !== undefined) {
    await updateRootScopeMapping(workspaceId, folder.externalId, nextParentExternalId ? null : inheritedAreaId);
  }

  const updatedFolder = await prisma.googleDriveFile.findFirstOrThrow({
    where: {
      id: folder.id,
      workspaceId,
      provider: "google_drive"
    },
    include: {
      operatingArea: true
    }
  });

  return res.json({
    data: folderResponse(updatedFolder, shouldCascadeScope || movingToChild ? descendantIds.length : 1)
  });
}));

assetsRouter.get("/context", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const query = querySchema.parse(req.query);
  const department = resolveDepartmentEntry(ASSETS_DEPARTMENT_KEY);
  const areaKey = query.areaKey ?? department?.backendAreaKey ?? "assets-storage";
  const allAreas = areaKey === "all";
  const assetsArea = allAreas ? null : await prisma.operatingArea.findFirst({
    where: { workspaceId, key: areaKey }
  });

  const [
    driveFiles,
    resources,
    knowledgeItems,
    knowledgeRoots,
    counts
  ] = await Promise.all([
    prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        trashed: false,
        ...(assetsArea ? { operatingAreaId: assetsArea.id } : {})
      },
      orderBy: [{ isFolder: "desc" }, { modifiedTime: "desc" }, { updatedAt: "desc" }],
      take: query.limit,
      include: {
        operatingArea: true,
        operatingFolder: true,
        operatingTable: true,
        storageLocation: true,
        knowledgeRoot: true,
        contentSnapshots: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    }),
    prisma.resource.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: query.limit,
      include: {
        ownerRole: true,
        relatedProject: true,
        relatedProcess: true,
        artifacts: { orderBy: { updatedAt: "desc" }, take: 5 }
      }
    }),
    prisma.knowledgeItem.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: query.limit,
      include: {
        process: true,
        pipeline: true,
        project: true,
        client: true,
        agent: true
      }
    }),
    prisma.knowledgeRoot.findMany({
      where: { workspaceId, ...(assetsArea ? { areaId: assetsArea.id } : {}) },
      orderBy: { updatedAt: "desc" },
      take: query.limit,
      include: { area: true, folder: true, table: true }
    }),
    Promise.all([
      prisma.googleDriveFile.count({ where: { workspaceId, trashed: false } }),
      prisma.googleDriveFile.count({ where: { workspaceId, trashed: false, operatingAreaId: null } }),
      prisma.googleDriveFile.count({ where: { workspaceId, trashed: false, description: null } }),
      prisma.googleDriveContentSnapshot.count({ where: { workspaceId } }),
      prisma.resource.count({ where: { workspaceId } }),
      prisma.knowledgeItem.count({ where: { workspaceId } }),
      prisma.knowledgeRoot.count({ where: { workspaceId } })
    ])
  ]);

  const driveResourceItems = driveFiles.map((file) => {
    const latestSnapshot = file.contentSnapshots[0] ?? null;
    const readiness = readinessForDriveFile(file);

    return {
      id: `drive:${file.id}`,
      sourceModel: "GoogleDriveFile",
      sourceId: file.id,
      name: file.name,
      resourceType: driveResourceType(file),
      source: {
        provider: file.provider,
        externalId: file.externalId,
        parentExternalId: file.parentExternalId,
        webViewLink: file.webViewLink,
        mimeType: file.mimeType,
        isFolder: file.isFolder
      },
      organization: {
        department: file.operatingArea?.key ?? null,
        folder: file.operatingFolder?.name ?? null,
        table: file.operatingTable?.name ?? null,
        storageLocation: file.storageLocation?.name ?? null,
        knowledgeRoot: file.knowledgeRoot?.name ?? null,
        visibility: "workspace",
        status: file.syncStatus,
        tags: []
      },
      aiCompatibility: {
        readiness,
        summary: latestSnapshot?.summary ?? file.description,
        extractedEntities: [],
        aiContextReady: readiness === "ai_context_ready",
        contentSnapshot: latestSnapshot ? {
          id: latestSnapshot.id,
          contentKind: latestSnapshot.contentKind,
          scanStatus: latestSnapshot.scanStatus,
          hasExtractedText: Boolean(latestSnapshot.extractedText),
          hasSummary: Boolean(latestSnapshot.summary),
          createdAt: latestSnapshot.createdAt.toISOString()
        } : null
      },
      relations: {
        tasks: [],
        projects: [],
        pipelines: [],
        clients: [],
        agents: [],
        operatingArea: file.operatingArea ? { id: file.operatingArea.id, key: file.operatingArea.key, name: file.operatingArea.name } : null
      },
      freshness: {
        modifiedTime: file.modifiedTime?.toISOString() ?? null,
        syncStatus: file.syncStatus,
        scanStatus: file.scanStatus,
        needsCleanup: readiness !== "ai_context_ready"
      }
    };
  });

  const resourceItems = resources.map((resource) => {
    const readiness = readinessForResource(resource);
    const metadata = metadataRecord(resource.metadata);

    return {
      id: `resource:${resource.id}`,
      sourceModel: "Resource",
      sourceId: resource.id,
      name: resource.name,
      resourceType: normalizeResourceType(resource.type),
      source: {
        provider: resource.externalProvider,
        externalId: resource.externalId,
        webViewLink: resource.url,
        mimeType: null,
        isFolder: false
      },
      organization: {
        department: null,
        folder: null,
        table: null,
        storageLocation: null,
        knowledgeRoot: null,
        visibility: resource.accessLevel,
        status: typeof metadata.status === "string" ? metadata.status : "active",
        tags: Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === "string") : []
      },
      aiCompatibility: {
        readiness,
        summary: textMetadata(resource.metadata, "summary") ?? textMetadata(resource.metadata, "description"),
        extractedEntities: Array.isArray(metadata.extractedEntities) ? metadata.extractedEntities : [],
        aiContextReady: readiness === "ai_context_ready",
        contentSnapshot: null
      },
      relations: {
        tasks: [],
        projects: resource.relatedProject ? [{ id: resource.relatedProject.id, name: resource.relatedProject.name, status: resource.relatedProject.status }] : [],
        pipelines: [],
        clients: [],
        agents: [],
        process: resource.relatedProcess ? { id: resource.relatedProcess.id, name: resource.relatedProcess.name, status: resource.relatedProcess.status } : null
      },
      artifacts: resource.artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.artifactType,
        name: artifact.name,
        status: artifact.status
      })),
      freshness: {
        modifiedTime: resource.updatedAt.toISOString(),
        syncStatus: "companycore",
        scanStatus: readiness === "not_indexed" ? "not_scanned" : "metadata_ready",
        needsCleanup: readiness !== "ai_context_ready"
      }
    };
  });

  const allItems = [...driveResourceItems, ...resourceItems]
    .filter((item) => !query.type || item.resourceType === query.type)
    .filter((item) => !query.readiness || item.aiCompatibility.readiness === query.readiness);

  const readinessCounts = allItems.reduce<Record<ReadinessLabel, number>>((acc, item) => {
    const readiness = item.aiCompatibility.readiness as ReadinessLabel;
    acc[readiness] = (acc[readiness] ?? 0) + 1;
    return acc;
  }, {
    not_indexed: 0,
    metadata_ready: 0,
    content_ready: 0,
    summary_ready: 0,
    relation_ready: 0,
    ai_context_ready: 0
  });
  const typeCounts = allItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.resourceType] = (acc[item.resourceType] ?? 0) + 1;
    return acc;
  }, {});

  return res.json({
    data: {
      department: {
        canonicalKey: department?.canonicalKey ?? ASSETS_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "assets-storage",
        name: "Assets And Resources Management System",
        purpose: "Keep company files, documents, knowledge, prompts, architecture, repositories, and assets usable for humans and external AI clients."
      },
      summary: {
        totalItems: allItems.length,
        driveFiles: counts[0],
        unassignedDriveFiles: counts[1],
        driveFilesMissingDescription: counts[2],
        contentSnapshots: counts[3],
        resources: counts[4],
        knowledgeItems: counts[5],
        knowledgeRoots: counts[6],
        aiReadyItems: readinessCounts.ai_context_ready,
        needsCleanup: allItems.filter((item) => item.freshness.needsCleanup).length,
        readiness: readinessCounts,
        byType: typeCounts
      },
      folders: driveFiles
        .filter((file) => file.isFolder)
        .map((file) => ({
          id: file.id,
          name: file.name,
          parentExternalId: file.parentExternalId,
          department: file.operatingArea?.key ?? null,
          syncStatus: file.syncStatus,
          scanStatus: file.scanStatus,
          webViewLink: file.webViewLink
        })),
      knowledgeRoots: knowledgeRoots.map((root) => ({
        id: root.id,
        name: root.name,
        provider: root.provider,
        area: root.area ? { id: root.area.id, key: root.area.key, name: root.area.name } : null,
        folder: root.folder ? { id: root.folder.id, name: root.folder.name } : null,
        table: root.table ? { id: root.table.id, name: root.table.name } : null
      })),
      knowledgeItems: knowledgeItems.map((item) => ({
        id: item.id,
        title: item.title,
        itemType: item.itemType,
        summary: item.summary,
        status: item.status,
        sourceProvider: item.sourceProvider,
        url: item.url,
        relations: {
          process: item.process ? { id: item.process.id, name: item.process.name } : null,
          pipeline: item.pipeline ? { id: item.pipeline.id, name: item.pipeline.name } : null,
          project: item.project ? { id: item.project.id, name: item.project.name } : null,
          client: item.client ? { id: item.client.id, name: item.client.name } : null,
          agent: item.agent ? { id: item.agent.id, name: item.agent.name } : null
        }
      })),
      resources: allItems,
      agentPacket: {
        mode: "read_only",
        allowedActions: [
          "read_assets_context",
          "inspect_resource_metadata",
          "inspect_content_snapshot",
          "inspect_resource_relations",
          "propose_metadata_cleanup",
          "propose_task_follow_up"
        ],
        blockedActions: blockedAssetsActions()
      }
    }
  });
}));
