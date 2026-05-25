import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";

const graphQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional()
}).strict();
const RELATIONSHIPS_DEPARTMENT_KEY = "05-relacje";
const RELATIONSHIPS_LIMIT = 12;

type RelationshipConfidence = "direct" | "provider_hierarchy" | "route_inferred" | "needs_review" | "unsupported";

type RelationshipNode = {
  id: string;
  type: string;
  label: string;
  summary?: string;
  metadata?: Record<string, unknown>;
};

type RelationshipEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  confidence: RelationshipConfidence;
  sourceModel: string;
  sourceField: string;
  actionHint?: {
    label: string;
    method: string;
    path: string;
  };
};

type RelationshipReviewItem = {
  id: string;
  severity: "info" | "warning";
  nodeId: string;
  type: string;
  title: string;
  detail: string;
  actionHint?: {
    label: string;
    method: string;
    path: string;
  };
};

export const relationshipsRouter = Router();

function nodeId(type: string, id: string) {
  return `${type}:${id}`;
}

function addNode(nodes: Map<string, RelationshipNode>, node: RelationshipNode) {
  nodes.set(node.id, node);
}

function addEdge(edges: RelationshipEdge[], edge: RelationshipEdge) {
  edges.push(edge);
}

function addReviewItem(reviewItems: RelationshipReviewItem[], item: RelationshipReviewItem) {
  reviewItems.push(item);
}

function scopeActionHint(kind: "mapping" | "drive", id: string) {
  if (kind === "mapping") {
    return {
      label: "Assign operating area",
      method: "PATCH",
      path: `/v1/operating-model/external-mappings/${id}/scope`
    };
  }

  return {
    label: "Assign operating area",
    method: "PATCH",
    path: `/v1/google-drive/files/${id}/scope`
  };
}

function scopedLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ") || "Unscoped";
}

function textMatchesRelationships(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return [
    "relationship",
    "relacje",
    "client",
    "customer",
    "support",
    "feedback",
    "stakeholder",
    "success",
    "retention",
    "satisfaction",
    "follow-up",
    "follow up",
    "nps",
    "referral"
  ].some((term) => text.includes(term));
}

function asDate(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

relationshipsRouter.get("/context", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const department = resolveDepartmentEntry(RELATIONSHIPS_DEPARTMENT_KEY);
  const [clients, interactions, stakeholders, deals, notes, decisions, tasks, driveFiles, counts] = await Promise.all([
    prisma.client.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: RELATIONSHIPS_LIMIT,
      include: {
        deals: { orderBy: { updatedAt: "desc" }, take: 6 },
        interactions: { orderBy: { occurredAt: "desc" }, take: 8 },
        stakeholders: { orderBy: { updatedAt: "desc" }, take: 8 }
      }
    }),
    prisma.interaction.findMany({
      where: { workspaceId },
      orderBy: [{ occurredAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      include: { client: true }
    }),
    prisma.stakeholder.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50,
      include: { client: true }
    }),
    prisma.deal.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50,
      include: { client: true, pipelineStage: true }
    }),
    prisma.note.findMany({
      where: { workspaceId, clientId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { client: true }
    }),
    prisma.decision.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50
    }),
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 80
    }),
    prisma.googleDriveFile.findMany({
      where: { workspaceId, trashed: false },
      orderBy: [{ modifiedTime: "desc" }, { updatedAt: "desc" }],
      take: 80,
      include: { operatingArea: true }
    }),
    Promise.all([
      prisma.client.count({ where: { workspaceId } }),
      prisma.client.count({ where: { workspaceId, status: "active" } }),
      prisma.client.count({ where: { workspaceId, status: "archived" } }),
      prisma.interaction.count({ where: { workspaceId } }),
      prisma.interaction.count({ where: { workspaceId, status: "active" } }),
      prisma.stakeholder.count({ where: { workspaceId } }),
      prisma.stakeholder.count({ where: { workspaceId, status: "active" } }),
      prisma.deal.count({ where: { workspaceId, status: "open" } }),
      prisma.note.count({ where: { workspaceId, clientId: { not: null } } }),
      prisma.task.count({ where: { workspaceId, status: { in: ["todo", "in_progress", "blocked"] } } }),
      prisma.task.count({ where: { workspaceId, status: "blocked" } }),
      prisma.decision.count({ where: { workspaceId, status: "active" } })
    ])
  ]);

  const relationshipTasks = tasks.filter((task) => textMatchesRelationships(task.title, task.description)).slice(0, RELATIONSHIPS_LIMIT);
  const relationshipDecisions = decisions.filter((decision) => (
    textMatchesRelationships(decision.title, decision.rationale, decision.outcome)
  )).slice(0, RELATIONSHIPS_LIMIT);
  const relationshipNotes = notes.filter((note) => textMatchesRelationships(note.content)).slice(0, RELATIONSHIPS_LIMIT);
  const relationshipDriveFiles = driveFiles.filter((file) => (
    file.operatingArea?.key === (department?.backendAreaKey ?? "relationships-client-success")
    || textMatchesRelationships(file.name, file.description, file.mimeType)
  )).slice(0, RELATIONSHIPS_LIMIT);
  const supportInteractions = interactions.filter((interaction) => (
    textMatchesRelationships(interaction.type, interaction.summary)
  )).slice(0, RELATIONSHIPS_LIMIT);
  const openDeals = deals.filter((deal) => deal.status === "open").slice(0, RELATIONSHIPS_LIMIT);

  const [
    clientCount,
    activeClientCount,
    archivedClientCount,
    interactionCount,
    activeInteractionCount,
    stakeholderCount,
    activeStakeholderCount,
    openDealCount,
    relationshipNoteCount,
    openTaskCount,
    blockedTaskCount,
    activeDecisionCount
  ] = counts;

  return res.json({
    data: {
      department: {
        canonicalKey: department?.canonicalKey ?? RELATIONSHIPS_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "relationships-client-success",
        name: "Relationships Management System",
        purpose: "Protect client trust, relationship continuity, and delivery confidence through evidence-backed client context, interaction history, and follow-up obligations."
      },
      summary: {
        clients: clientCount,
        activeClients: activeClientCount,
        archivedClients: archivedClientCount,
        interactions: interactionCount,
        activeInteractions: activeInteractionCount,
        stakeholders: stakeholderCount,
        activeStakeholders: activeStakeholderCount,
        openDeals: openDealCount,
        relationshipNotes: relationshipNoteCount,
        openTasks: openTaskCount,
        blockedTasks: blockedTaskCount,
        activeDecisions: activeDecisionCount,
        supportInteractions: supportInteractions.length,
        relationshipTasks: relationshipTasks.length,
        relationshipDriveFiles: relationshipDriveFiles.length
      },
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        status: client.status,
        source: client.source,
        deals: client.deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          status: deal.status,
          value: deal.value,
          currency: deal.currency
        })),
        interactions: client.interactions.map((interaction) => ({
          id: interaction.id,
          type: interaction.type,
          summary: interaction.summary,
          status: interaction.status,
          occurredAt: asDate(interaction.occurredAt)
        })),
        stakeholders: client.stakeholders.map((stakeholder) => ({
          id: stakeholder.id,
          name: stakeholder.name,
          role: stakeholder.role,
          email: stakeholder.email,
          status: stakeholder.status
        }))
      })),
      interactions: supportInteractions.map((interaction) => ({
        id: interaction.id,
        type: interaction.type,
        summary: interaction.summary,
        status: interaction.status,
        occurredAt: asDate(interaction.occurredAt),
        client: interaction.client ? {
          id: interaction.client.id,
          name: interaction.client.name,
          companyName: interaction.client.companyName,
          status: interaction.client.status
        } : null
      })),
      stakeholders: stakeholders.slice(0, RELATIONSHIPS_LIMIT).map((stakeholder) => ({
        id: stakeholder.id,
        name: stakeholder.name,
        role: stakeholder.role,
        email: stakeholder.email,
        status: stakeholder.status,
        client: stakeholder.client ? {
          id: stakeholder.client.id,
          name: stakeholder.client.name,
          companyName: stakeholder.client.companyName
        } : null
      })),
      deals: openDeals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        status: deal.status,
        stage: deal.pipelineStage ? {
          id: deal.pipelineStage.id,
          name: deal.pipelineStage.name
        } : null,
        client: deal.client ? {
          id: deal.client.id,
          name: deal.client.name,
          companyName: deal.client.companyName
        } : null
      })),
      notes: relationshipNotes.map((note) => ({
        id: note.id,
        content: note.content,
        status: note.status,
        source: note.source,
        updatedAt: asDate(note.updatedAt),
        client: note.client ? {
          id: note.client.id,
          name: note.client.name,
          companyName: note.client.companyName
        } : null
      })),
      decisions: relationshipDecisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        rationale: decision.rationale,
        outcome: decision.outcome,
        status: decision.status
      })),
      tasks: relationshipTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: asDate(task.dueDate),
        source: task.source
      })),
      driveFiles: relationshipDriveFiles.map((file) => ({
        id: file.id,
        name: file.name,
        description: file.description,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        operatingAreaKey: file.operatingArea?.key ?? null,
        modifiedTime: asDate(file.modifiedTime)
      })),
      agentPacket: {
        mode: "read_only",
        recommendedNextActions: [
          "Review clients with sparse recent interactions before proposing new work.",
          "Use stakeholder context before creating follow-up tasks or outreach proposals.",
          "Treat archived clients as learning evidence, not as active outreach targets.",
          "Escalate pricing, discount, invoice, and payment decisions to Sales or Finance command surfaces."
        ],
        allowedActions: [
          "read_relationships_context",
          "inspect_client",
          "inspect_interaction_history",
          "inspect_stakeholder",
          "propose_relationship_follow_up"
        ],
        blockedActions: [
          {
            action: "send_outreach_or_commitment",
            reason: "Outbound promises and commitments require explicit owner-approved command flows."
          },
          {
            action: "change_contract_terms",
            reason: "Commercial terms and negotiations must stay in Sales and Finance governed command surfaces."
          },
          {
            action: "archive_or_delete_client",
            reason: "Client lifecycle writes require dedicated command routes and explicit approval context."
          },
          {
            action: "execute_provider_side_updates",
            reason: "Provider-side relationship mutations must stay behind integration-specific audited commands."
          }
        ]
      }
    }
  });
}));

relationshipsRouter.get("/graph", asyncHandler(async (req, res) => {
  const input = graphQuerySchema.parse(req.query);
  const limit = input.limit ?? 200;
  const workspaceId = req.auth!.workspaceId;
  await ensureOperatingModelForWorkspace(prisma, workspaceId);

  const [
    workspace,
    areas,
    externalMappings,
    externalFields,
    driveFiles,
    storageLocations,
    knowledgeRoots,
    automationDefinitions,
    toolAdapters,
    resources,
    projectsCount,
    tasksCount,
    clientsCount,
    dealsCount,
    notesCount,
    decisionsCount
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true }
    }),
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
      orderBy: [{ provider: "asc" }, { entityType: "asc" }, { name: "asc" }],
      take: limit
    }),
    prisma.externalFieldMapping.findMany({
      where: { workspaceId },
      orderBy: [{ provider: "asc" }, { name: "asc" }],
      take: limit
    }),
    prisma.googleDriveFile.findMany({
      where: { workspaceId },
      orderBy: [{ isFolder: "desc" }, { name: "asc" }],
      take: limit
    }),
    prisma.storageLocation.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, take: limit }),
    prisma.knowledgeRoot.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, take: limit }),
    prisma.automationDefinition.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, take: limit }),
    prisma.toolAdapter.findMany({
      where: { workspaceId },
      orderBy: { provider: "asc" },
      include: { capabilities: { orderBy: { capabilityKey: "asc" } } }
    }),
    prisma.resource.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      take: limit
    }),
    prisma.project.count({ where: { workspaceId } }),
    prisma.task.count({ where: { workspaceId } }),
    prisma.client.count({ where: { workspaceId } }),
    prisma.deal.count({ where: { workspaceId } }),
    prisma.note.count({ where: { workspaceId } }),
    prisma.decision.count({ where: { workspaceId } })
  ]);

  if (!workspace) {
    return res.status(422).json({ error: "workspace_required" });
  }

  const nodes = new Map<string, RelationshipNode>();
  const edges: RelationshipEdge[] = [];
  const reviewItems: RelationshipReviewItem[] = [];
  const workspaceNodeId = nodeId("workspace", workspace.id);
  addNode(nodes, {
    id: workspaceNodeId,
    type: "workspace",
    label: workspace.name,
    summary: "Workspace boundary for all graph nodes."
  });

  const tableByApiSlug = new Map<string, { id: string; name: string; apiSlug: string }>();
  const driveNodeByExternalId = new Map<string, string>();

  for (const area of areas) {
    const areaNodeId = nodeId("operating_area", area.id);
    addNode(nodes, {
      id: areaNodeId,
      type: "operating_area",
      label: area.name,
      metadata: { key: area.key, position: area.position, isSystem: area.isSystem }
    });
    addEdge(edges, {
      id: `workspace:${workspace.id}->area:${area.id}`,
      from: workspaceNodeId,
      to: areaNodeId,
      label: "owns operating area",
      confidence: "direct",
      sourceModel: "OperatingArea",
      sourceField: "workspaceId"
    });

    for (const folder of area.folders) {
      const folderNodeId = nodeId("operating_folder", folder.id);
      addNode(nodes, {
        id: folderNodeId,
        type: "operating_folder",
        label: folder.name,
        metadata: { key: folder.key, source: folder.source, externalId: folder.externalId }
      });
      addEdge(edges, {
        id: `area:${area.id}->folder:${folder.id}`,
        from: areaNodeId,
        to: folderNodeId,
        label: "contains folder",
        confidence: "direct",
        sourceModel: "OperatingFolder",
        sourceField: "areaId"
      });
    }

    for (const table of area.tables) {
      tableByApiSlug.set(table.apiSlug, table);
      const tableNodeId = nodeId("operating_table", table.id);
      addNode(nodes, {
        id: tableNodeId,
        type: "operating_table",
        label: table.name,
        summary: table.apiSlug,
        metadata: {
          tableName: table.tableName,
          apiSlug: table.apiSlug,
          source: table.source,
          externalId: table.externalId
        }
      });
      addEdge(edges, {
        id: `area:${area.id}->table:${table.id}`,
        from: areaNodeId,
        to: tableNodeId,
        label: "contains table",
        confidence: "direct",
        sourceModel: "OperatingTable",
        sourceField: "areaId"
      });
      if (table.folderId) {
        addEdge(edges, {
          id: `folder:${table.folderId}->table:${table.id}`,
          from: nodeId("operating_folder", table.folderId),
          to: tableNodeId,
          label: "contains table",
          confidence: "direct",
          sourceModel: "OperatingTable",
          sourceField: "folderId"
        });
      }
    }
  }

  const recordCountsBySlug = new Map([
    ["projects", projectsCount],
    ["tasks", tasksCount],
    ["clients", clientsCount],
    ["deals", dealsCount],
    ["notes", notesCount],
    ["decisions", decisionsCount]
  ]);
  for (const [apiSlug, count] of recordCountsBySlug) {
    const table = tableByApiSlug.get(apiSlug);
    if (!table) {
      continue;
    }
    const collectionNodeId = nodeId("record_collection", apiSlug);
    addNode(nodes, {
      id: collectionNodeId,
      type: "record_collection",
      label: `${table.name} records`,
      summary: `${count} workspace record${count === 1 ? "" : "s"}`,
      metadata: { apiSlug, count }
    });
    addEdge(edges, {
      id: `table:${table.id}->records:${apiSlug}`,
      from: nodeId("operating_table", table.id),
      to: collectionNodeId,
      label: "serves record route",
      confidence: "route_inferred",
      sourceModel: "OperatingTable",
      sourceField: "apiSlug"
    });
  }

  for (const mapping of externalMappings) {
    const mappingNodeId = nodeId("external_container_mapping", mapping.id);
    addNode(nodes, {
      id: mappingNodeId,
      type: "external_container_mapping",
      label: mapping.name || mapping.externalId,
      summary: `${mapping.provider} ${mapping.entityType}`,
      metadata: { provider: mapping.provider, entityType: mapping.entityType, externalId: mapping.externalId }
    });
    addEdge(edges, {
      id: `workspace:${workspace.id}->mapping:${mapping.id}`,
      from: workspaceNodeId,
      to: mappingNodeId,
      label: "imports provider container",
      confidence: "direct",
      sourceModel: "ExternalContainerMapping",
      sourceField: "workspaceId"
    });
    if (mapping.areaId) {
      addEdge(edges, {
        id: `mapping:${mapping.id}->area:${mapping.areaId}`,
        from: mappingNodeId,
        to: nodeId("operating_area", mapping.areaId),
        label: "assigned to area",
        confidence: "direct",
        sourceModel: "ExternalContainerMapping",
        sourceField: "areaId",
        actionHint: scopeActionHint("mapping", mapping.id)
      });
    }
    if (mapping.folderId) {
      addEdge(edges, {
        id: `mapping:${mapping.id}->folder:${mapping.folderId}`,
        from: mappingNodeId,
        to: nodeId("operating_folder", mapping.folderId),
        label: "assigned to folder",
        confidence: "direct",
        sourceModel: "ExternalContainerMapping",
        sourceField: "folderId"
      });
    }
    if (mapping.tableId) {
      addEdge(edges, {
        id: `mapping:${mapping.id}->table:${mapping.tableId}`,
        from: mappingNodeId,
        to: nodeId("operating_table", mapping.tableId),
        label: "assigned to table",
        confidence: "direct",
        sourceModel: "ExternalContainerMapping",
        sourceField: "tableId"
      });
    }
    if (!mapping.areaId && !mapping.folderId && !mapping.tableId) {
      addReviewItem(reviewItems, {
        id: `review:mapping:${mapping.id}`,
        severity: "warning",
        nodeId: mappingNodeId,
        type: "unassigned_provider_container",
        title: "Provider container needs operating scope",
        detail: `${mapping.provider} ${mapping.entityType} ${mapping.name || mapping.externalId} is not assigned to an operating area, folder, or table.`,
        actionHint: scopeActionHint("mapping", mapping.id)
      });
    }
  }

  for (const field of externalFields) {
    const fieldNodeId = nodeId("external_field_mapping", field.id);
    addNode(nodes, {
      id: fieldNodeId,
      type: "external_field_mapping",
      label: field.name,
      summary: `${field.provider} field`,
      metadata: { provider: field.provider, externalId: field.externalId, nativeField: field.nativeField }
    });
    if (field.tableId) {
      addEdge(edges, {
        id: `field:${field.id}->table:${field.tableId}`,
        from: fieldNodeId,
        to: nodeId("operating_table", field.tableId),
        label: "maps to table",
        confidence: "direct",
        sourceModel: "ExternalFieldMapping",
        sourceField: "tableId"
      });
    } else {
      addReviewItem(reviewItems, {
        id: `review:field:${field.id}`,
        severity: "info",
        nodeId: fieldNodeId,
        type: "unassigned_external_field",
        title: "Provider field is not mapped to a table",
        detail: `${field.provider} field ${field.name} has no operating table assignment.`
      });
    }
  }

  for (const file of driveFiles) {
    const fileNodeId = nodeId("google_drive_file", file.id);
    driveNodeByExternalId.set(file.externalId, fileNodeId);
    addNode(nodes, {
      id: fileNodeId,
      type: "google_drive_file",
      label: file.name,
      summary: file.isFolder ? "Google Drive folder" : "Google Drive file",
      metadata: {
        externalId: file.externalId,
        mimeType: file.mimeType,
        isFolder: file.isFolder,
        syncStatus: file.syncStatus,
        parentExternalId: file.parentExternalId
      }
    });

    const assignments = [
      ["operating_area", file.operatingAreaId, "operatingAreaId"],
      ["operating_folder", file.operatingFolderId, "operatingFolderId"],
      ["operating_table", file.operatingTableId, "operatingTableId"],
      ["storage_location", file.storageLocationId, "storageLocationId"],
      ["knowledge_root", file.knowledgeRootId, "knowledgeRootId"]
    ] as const;
    for (const [targetType, targetId, sourceField] of assignments) {
      if (!targetId) {
        continue;
      }
      addEdge(edges, {
        id: `drive:${file.id}->${targetType}:${targetId}`,
        from: fileNodeId,
        to: nodeId(targetType, targetId),
        label: `assigned to ${targetType.replace(/_/g, " ")}`,
        confidence: "direct",
        sourceModel: "GoogleDriveFile",
        sourceField,
        actionHint: targetType === "operating_area" ? scopeActionHint("drive", file.id) : undefined
      });
    }
    if (!file.operatingAreaId && !file.operatingFolderId && !file.operatingTableId) {
      addReviewItem(reviewItems, {
        id: `review:drive:${file.id}`,
        severity: "warning",
        nodeId: fileNodeId,
        type: "unassigned_drive_item",
        title: "Drive item needs operating scope",
        detail: `${file.isFolder ? "Folder" : "File"} ${file.name} is not assigned to an operating area, folder, or table.`,
        actionHint: scopeActionHint("drive", file.id)
      });
    }
  }

  for (const file of driveFiles) {
    if (!file.parentExternalId) {
      continue;
    }
    const parentNodeId = driveNodeByExternalId.get(file.parentExternalId);
    if (!parentNodeId) {
      continue;
    }
    addEdge(edges, {
      id: `drive-parent:${file.parentExternalId}->${file.externalId}`,
      from: parentNodeId,
      to: nodeId("google_drive_file", file.id),
      label: "contains Drive child",
      confidence: "provider_hierarchy",
      sourceModel: "GoogleDriveFile",
      sourceField: "parentExternalId"
    });
  }

  for (const location of storageLocations) {
    const locationNodeId = nodeId("storage_location", location.id);
    addNode(nodes, {
      id: locationNodeId,
      type: "storage_location",
      label: location.name,
      summary: location.provider,
      metadata: { provider: location.provider, scope: scopedLabel([location.areaId, location.folderId, location.tableId]) }
    });
    for (const [targetType, targetId, sourceField] of [
      ["operating_area", location.areaId, "areaId"],
      ["operating_folder", location.folderId, "folderId"],
      ["operating_table", location.tableId, "tableId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `storage:${location.id}->${targetType}:${targetId}`,
          from: locationNodeId,
          to: nodeId(targetType, targetId),
          label: `scoped to ${targetType.replace(/_/g, " ")}`,
          confidence: "direct",
          sourceModel: "StorageLocation",
          sourceField
        });
      }
    }
  }

  for (const root of knowledgeRoots) {
    const rootNodeId = nodeId("knowledge_root", root.id);
    addNode(nodes, {
      id: rootNodeId,
      type: "knowledge_root",
      label: root.name,
      summary: root.provider,
      metadata: { provider: root.provider, scope: scopedLabel([root.areaId, root.folderId, root.tableId]) }
    });
    for (const [targetType, targetId, sourceField] of [
      ["operating_area", root.areaId, "areaId"],
      ["operating_folder", root.folderId, "folderId"],
      ["operating_table", root.tableId, "tableId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `knowledge:${root.id}->${targetType}:${targetId}`,
          from: rootNodeId,
          to: nodeId(targetType, targetId),
          label: `scoped to ${targetType.replace(/_/g, " ")}`,
          confidence: "direct",
          sourceModel: "KnowledgeRoot",
          sourceField
        });
      }
    }
  }

  for (const definition of automationDefinitions) {
    const definitionNodeId = nodeId("automation_definition", definition.id);
    addNode(nodes, {
      id: definitionNodeId,
      type: "automation_definition",
      label: definition.name,
      summary: definition.triggerType,
      metadata: { provider: definition.provider, enabled: definition.enabled }
    });
    for (const [targetType, targetId, sourceField] of [
      ["operating_area", definition.areaId, "areaId"],
      ["operating_folder", definition.folderId, "folderId"],
      ["operating_table", definition.tableId, "tableId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `automation-definition:${definition.id}->${targetType}:${targetId}`,
          from: definitionNodeId,
          to: nodeId(targetType, targetId),
          label: `scoped to ${targetType.replace(/_/g, " ")}`,
          confidence: "direct",
          sourceModel: "AutomationDefinition",
          sourceField
        });
      }
    }
  }

  for (const adapter of toolAdapters) {
    const adapterNodeId = nodeId("tool_adapter", adapter.id);
    addNode(nodes, {
      id: adapterNodeId,
      type: "tool_adapter",
      label: adapter.name,
      summary: String(adapter.provider),
      metadata: { connectionStatus: adapter.connectionStatus, healthStatus: adapter.healthStatus }
    });
    addEdge(edges, {
      id: `workspace:${workspace.id}->adapter:${adapter.id}`,
      from: workspaceNodeId,
      to: adapterNodeId,
      label: "has integration adapter",
      confidence: "direct",
      sourceModel: "ToolAdapter",
      sourceField: "workspaceId"
    });
    for (const capability of adapter.capabilities) {
      const capabilityNodeId = nodeId("integration_capability", capability.id);
      addNode(nodes, {
        id: capabilityNodeId,
        type: "integration_capability",
        label: capability.capabilityKey,
        summary: capability.riskLevel,
        metadata: { requiresApproval: capability.requiresApproval, auditRequired: capability.auditRequired }
      });
      addEdge(edges, {
        id: `adapter:${adapter.id}->capability:${capability.id}`,
        from: adapterNodeId,
        to: capabilityNodeId,
        label: "exposes capability",
        confidence: "direct",
        sourceModel: "IntegrationCapability",
        sourceField: "toolAdapterId"
      });
    }
  }

  for (const resource of resources) {
    const resourceNodeId = nodeId("resource", resource.id);
    addNode(nodes, {
      id: resourceNodeId,
      type: "resource",
      label: resource.name,
      summary: resource.type,
      metadata: {
        externalProvider: resource.externalProvider,
        externalId: resource.externalId,
        relatedProjectId: resource.relatedProjectId,
        relatedProcessId: resource.relatedProcessId
      }
    });
    addEdge(edges, {
      id: `workspace:${workspace.id}->resource:${resource.id}`,
      from: workspaceNodeId,
      to: resourceNodeId,
      label: "owns resource",
      confidence: "direct",
      sourceModel: "Resource",
      sourceField: "workspaceId"
    });
    if (resource.relatedProjectId) {
      addEdge(edges, {
        id: `resource:${resource.id}->project:${resource.relatedProjectId}`,
        from: resourceNodeId,
        to: nodeId("business_record", resource.relatedProjectId),
        label: "related project",
        confidence: "direct",
        sourceModel: "Resource",
        sourceField: "relatedProjectId"
      });
    }
  }

  const unsupportedFamilies = [
    {
      family: "custom_cross_domain_edges",
      reason: "No approved generic relationship edge table exists.",
      nextAction: "Use existing model FKs first; add editable custom edges only after a concrete workflow is approved."
    },
    {
      family: "provider_raw_payload_links",
      reason: "Raw provider payload relations are not normalized or guaranteed stable.",
      nextAction: "Expose only provider hierarchy or explicit mapping records until provider-specific normalization is implemented."
    },
    {
      family: "agent_event_entity_links",
      reason: "Agent events are delivery evidence, not durable entity relationships unless they include an explicit resource target.",
      nextAction: "Keep agent-event evidence in readiness/audit panels until durable targets are modeled."
    }
  ];

  res.json({
    data: {
      workspace: {
        id: workspace.id,
        name: workspace.name
      },
      graph: {
        nodes: Array.from(nodes.values()),
        edges,
        reviewItems,
        unsupportedFamilies
      },
      summary: {
        nodes: nodes.size,
        edges: edges.length,
        reviewItems: reviewItems.length,
        unsupportedFamilies: unsupportedFamilies.length,
        confidence: {
          direct: edges.filter((edge) => edge.confidence === "direct").length,
          providerHierarchy: edges.filter((edge) => edge.confidence === "provider_hierarchy").length,
          routeInferred: edges.filter((edge) => edge.confidence === "route_inferred").length,
          needsReview: reviewItems.length,
          unsupported: unsupportedFamilies.length
        },
        limit
      }
    }
  });
}));
