import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { canonicalDepartmentKeys, type CanonicalDepartmentKey, departmentRegistry } from "../../operating-model/department-registry";

const intakeQuerySchema = z.object({
  family: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  sourceAgent: z.string().min(1).optional(),
  risk: z.string().min(1).optional(),
  suggestedDepartment: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
}).strict();

const sourceModels = [
  "AgentEventOutbox",
  "ProviderEventInbox",
  "GoogleDriveFile",
  "ExternalContainerMapping",
  "ExternalFieldMapping",
  "Approval",
  "Risk",
  "Task",
  "Event"
] as const;

const classificationValues = [
  "needs_classification",
  "route_to_department",
  "needs_owner_decision",
  "create_task",
  "request_approval",
  "archive_learning",
  "needs_source_fix",
  "defer"
] as const;

const riskLevels = ["low", "medium", "high", "critical"] as const;

const routeProposalSchema = z.object({
  sourceModel: z.enum(sourceModels),
  sourceId: z.string().uuid(),
  targetDepartmentKey: z.enum(canonicalDepartmentKeys),
  classification: z.enum(classificationValues).default("route_to_department"),
  reason: z.string().trim().min(8).max(1200),
  proposedNextAction: z.string().trim().min(3).max(1200).optional(),
  riskLevel: z.enum(riskLevels).default("medium"),
  requestOwnerDecision: z.boolean().default(true),
  createTaskDraft: z.boolean().default(false),
  idempotencyKey: z.string().trim().min(1).max(220).optional()
}).strict();

const routeProposalReadQuerySchema = z.object({
  status: z.string().min(1).optional(),
  sourceModel: z.enum(sourceModels).optional(),
  targetDepartmentKey: z.enum(canonicalDepartmentKeys).optional(),
  risk: z.enum(riskLevels).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
}).strict();

type IntakeItem = {
  id: string;
  family: string;
  status: string;
  title: string;
  source: string;
  sourceAgent?: string | null;
  sourceModel: string;
  sourceId: string;
  risk: "low" | "medium" | "high" | "critical";
  suggestedDepartment: string;
  confidence: "direct" | "inferred" | "needs_review";
  createdAt: string;
  updatedAt: string;
  summary?: string | null;
  evidence: Array<{ label: string; href: string }>;
  allowedActions: string[];
  blockedActions: Array<{ action: string; reason: string }>;
  metadata: Record<string, unknown>;
};

type RouteProposalInput = z.infer<typeof routeProposalSchema>;
type IntakeSourceModel = typeof sourceModels[number];
type IntakeDepartmentKey = CanonicalDepartmentKey;
type IntakeTx = Prisma.TransactionClient;

const departmentHints = departmentRegistry.map((department) => ({
  key: department.canonicalKey,
  terms: department.hintTerms
}));

export const intakeRouter = Router();

intakeRouter.post("/actions/propose-route", asyncHandler(async (req, res) => {
  const input = routeProposalSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const actor = authActor(req);
  const source = await findIntakeSource(prisma, workspaceId, input.sourceModel, input.sourceId);

  if (!source) {
    return res.status(404).json({ error: "intake_source_not_found" });
  }

  const idempotencyKey = input.idempotencyKey
    ?? [
      "intake-route",
      input.sourceModel,
      input.sourceId,
      input.targetDepartmentKey,
      input.classification
    ].join(":");
  const externalId = routeProposalExternalId(input, idempotencyKey);

  const existing = await prisma.decision.findFirst({
    where: {
      workspaceId,
      source: "companycore_intake",
      externalId
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    const existingTask = await prisma.task.findFirst({
      where: {
        workspaceId,
        source: "companycore_intake",
        externalId
      },
      orderBy: { createdAt: "desc" }
    });
    const existingAudit = await prisma.auditLog.findFirst({
      where: {
        workspaceId,
        action: "intake.route_proposed",
        resourceType: "intake_route_proposal",
        resourceId: existing.id
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({
      data: routeProposalResponse({
        decision: existing,
        input,
        idempotencyKey,
        taskId: existingTask?.id ?? null,
        auditLogId: existingAudit?.id ?? null,
        idempotentReplay: true
      })
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const freshSource = await findIntakeSource(tx, workspaceId, input.sourceModel, input.sourceId);
    if (!freshSource) {
      return null;
    }

    const title = `Intake route proposal: ${sourceTitle(freshSource, input.sourceModel)} -> ${input.targetDepartmentKey}`;
    const rationale = [
      input.reason,
      input.proposedNextAction ? `Next action: ${input.proposedNextAction}` : null,
      `Source: ${input.sourceModel}:${input.sourceId}`,
      `Classification: ${input.classification}`,
      `Risk: ${input.riskLevel}`
    ].filter(Boolean).join("\n");

    const decision = await tx.decision.create({
      data: {
        workspaceId,
        title,
        rationale,
        outcome: input.proposedNextAction ?? "Owner should review and route the intake item.",
        status: "proposed",
        source: "companycore_intake",
        externalId
      }
    });

    const task = input.createTaskDraft
      ? await tx.task.create({
        data: {
          workspaceId,
          title: `Review intake route: ${sourceTitle(freshSource, input.sourceModel)}`,
          description: [
            `Target department: ${input.targetDepartmentKey}`,
            `Classification: ${input.classification}`,
            `Reason: ${input.reason}`,
            input.proposedNextAction ? `Proposed next action: ${input.proposedNextAction}` : null,
            `Source: ${input.sourceModel}:${input.sourceId}`,
            "This task is a proposal follow-up only; it does not acknowledge, approve, invoice, discount, delete, retry, or mutate provider state."
          ].filter(Boolean).join("\n"),
          priority: input.riskLevel === "critical" || input.riskLevel === "high" ? "high" : "normal",
          source: "companycore_intake",
          externalId
        }
      })
      : null;

    const correlationId = `intake-route:${decision.id}`;
    const outputPayload = {
      proposalId: decision.id,
      taskId: task?.id ?? null,
      sourceMutated: false,
      agentEventAcknowledged: false,
      providerStateMutated: false,
      taskDraftCreated: Boolean(task),
      ownerDecisionRequested: input.requestOwnerDecision,
      auditRecorded: true
    };

    const auditLog = await tx.auditLog.create({
      data: {
        workspaceId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "intake.route_proposed",
        resourceType: "intake_route_proposal",
        resourceId: decision.id,
        inputPayload: asInputJson({
          ...input,
          idempotencyKey,
          sourceTitle: sourceTitle(freshSource, input.sourceModel)
        }),
        outputPayload: asInputJson(outputPayload),
        correlationId
      }
    });

    await tx.event.create({
      data: {
        workspaceId,
        type: "intake.route_proposed",
        source: "companycore_intake",
        actorType: actor.actorType,
        actorId: actor.actorId,
        resourceType: "intake_route_proposal",
        resourceId: decision.id,
        correlationId,
        taskId: task?.id ?? undefined,
        payload: {
          auditLogId: auditLog.id,
          proposalId: decision.id,
          taskId: task?.id ?? null,
          sourceModel: input.sourceModel,
          sourceId: input.sourceId,
          targetDepartmentKey: input.targetDepartmentKey,
          classification: input.classification,
          riskLevel: input.riskLevel,
          idempotencyKey,
          sourceMutated: false
        }
      }
    });

    return { decision, taskId: task?.id ?? null, auditLogId: auditLog.id };
  });

  if (!result) {
    return res.status(404).json({ error: "intake_source_not_found" });
  }

  res.status(201).json({
    data: routeProposalResponse({
      decision: result.decision,
      input,
      idempotencyKey,
      taskId: result.taskId,
      auditLogId: result.auditLogId,
      idempotentReplay: false
    })
  });
}));

intakeRouter.get("/route-proposals", asyncHandler(async (req, res) => {
  const query = routeProposalReadQuerySchema.parse(req.query);
  const workspaceId = req.auth!.workspaceId;
  const decisions = await prisma.decision.findMany({
    where: {
      workspaceId,
      source: "companycore_intake",
      status: query.status
    },
    orderBy: { createdAt: "desc" },
    take: query.limit
  });
  const decisionIds = decisions.map((decision) => decision.id);
  const externalIds = decisions
    .map((decision) => decision.externalId)
    .filter((externalId): externalId is string => Boolean(externalId));

  const [tasks, auditLogs, events] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId,
        source: "companycore_intake",
        externalId: { in: externalIds }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.auditLog.findMany({
      where: {
        workspaceId,
        action: "intake.route_proposed",
        resourceType: "intake_route_proposal",
        resourceId: { in: decisionIds }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.event.findMany({
      where: {
        workspaceId,
        type: "intake.route_proposed",
        resourceType: "intake_route_proposal",
        resourceId: { in: decisionIds }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const taskByExternalId = new Map(tasks.map((task) => [task.externalId, task]));
  const auditByResourceId = firstBy(auditLogs, (auditLog) => auditLog.resourceId);
  const eventByResourceId = firstBy(events, (event) => event.resourceId);

  const proposals = decisions
    .map((decision) => {
      const auditLog = auditByResourceId.get(decision.id) ?? null;
      const event = eventByResourceId.get(decision.id) ?? null;
      const input = routeProposalInputFromAudit(auditLog?.inputPayload);
      const task = decision.externalId ? taskByExternalId.get(decision.externalId) ?? null : null;

      return routeProposalReadbackResponse({
        decision,
        auditLog,
        event,
        task,
        input
      });
    })
    .filter((proposal) => !query.sourceModel || proposal.proposal.sourceModel === query.sourceModel)
    .filter((proposal) => !query.targetDepartmentKey || proposal.proposal.targetDepartmentKey === query.targetDepartmentKey)
    .filter((proposal) => !query.risk || proposal.proposal.riskLevel === query.risk);

  res.json({
    data: {
      summary: summarizeRouteProposals(proposals),
      proposals,
      agentPacket: {
        mode: "read_only",
        allowedActions: [
          "read_route_proposals",
          "inspect_route_proposal_evidence",
          "propose_replacement_route",
          "create_follow_up_task_through_existing_intake_command"
        ],
        blockedActions: routeProposalBlockedActions()
      }
    }
  });
}));

intakeRouter.get("/", asyncHandler(async (req, res) => {
  const query = intakeQuerySchema.parse(req.query);
  const workspaceId = req.auth!.workspaceId;
  const now = new Date();
  const perSourceLimit = Math.max(20, Math.min(query.limit, 75));

  const [
    agentEvents,
    providerEvents,
    driveFiles,
    containerMappings,
    fieldMappings,
    approvals,
    risks,
    tasks,
    events
  ] = await Promise.all([
    prisma.agentEventOutbox.findMany({
      where: {
        workspaceId,
        deliveryStatus: "pending",
        availableAt: { lte: now },
        OR: query.sourceAgent ? [{ targetAgent: query.sourceAgent }, { targetAgent: null }] : undefined
      },
      orderBy: { availableAt: "asc" },
      take: perSourceLimit
    }),
    prisma.providerEventInbox.findMany({
      where: {
        workspaceId,
        processingStatus: { in: ["pending", "failed"] }
      },
      orderBy: { receivedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        trashed: false,
        operatingAreaId: null,
        operatingFolderId: null,
        operatingTableId: null
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.externalContainerMapping.findMany({
      where: {
        workspaceId,
        areaId: null,
        folderId: null,
        tableId: null
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.externalFieldMapping.findMany({
      where: {
        workspaceId,
        tableId: null
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.approval.findMany({
      where: {
        workspaceId,
        status: "pending"
      },
      orderBy: { createdAt: "desc" },
      take: perSourceLimit
    }),
    prisma.risk.findMany({
      where: {
        workspaceId,
        status: "active",
        riskLevel: { in: ["high", "critical"] }
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          { projectId: null, goalId: null, targetId: null, taskListId: null },
          { source: { in: ["agent_runtime", "codex", "jarvis", "clickup", "google_drive"] } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: perSourceLimit
    }),
    prisma.event.findMany({
      where: {
        workspaceId,
        source: { in: ["agent_runtime", "codex", "jarvis", "clickup", "google_drive", "agent", "automation"] }
      },
      orderBy: { createdAt: "desc" },
      take: perSourceLimit
    })
  ]);

  const items: IntakeItem[] = [
    ...agentEvents.map((event) => item({
      family: "agent_output",
      status: "needs_owner_decision",
      title: readableTitle(event.eventType),
      source: "agent_event_outbox",
      sourceAgent: event.targetAgent,
      sourceModel: "AgentEventOutbox",
      sourceId: event.id,
      risk: inferRisk(event.eventType, event.payload),
      suggestedDepartment: inferDepartment(event.eventType, event.payload),
      confidence: event.targetAgent ? "direct" : "needs_review",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      summary: stringifySummary(event.payload),
      evidence: [{ label: "Agent event", href: `/v1/agent-events?targetAgent=${event.targetAgent ?? ""}` }],
      allowedActions: ["review", "route_to_department", "create_task", "ack_after_handled"],
      blockedActions: [{ action: "ack", reason: "Intake is read-only; use POST /v1/agent-events/:id/ack after handling." }],
      metadata: {
        eventType: event.eventType,
        deliveryStatus: event.deliveryStatus,
        availableAt: event.availableAt.toISOString(),
        scope: event.scope
      }
    })),
    ...providerEvents.map((event) => item({
      family: "provider_signal",
      status: event.processingStatus === "failed" ? "blocked" : "needs_classification",
      title: `${event.provider} ${readableTitle(event.eventName)}`,
      source: event.provider,
      sourceModel: "ProviderEventInbox",
      sourceId: event.id,
      risk: event.processingStatus === "failed" ? "high" : "medium",
      suggestedDepartment: inferDepartment(`${event.provider} ${event.eventName}`, event.payload),
      confidence: "inferred",
      createdAt: event.receivedAt,
      updatedAt: event.updatedAt,
      summary: event.lastErrorCode ?? stringifySummary(event.payload),
      evidence: [{ label: "Provider inbox", href: `/v1/integration-settings/${event.provider}/events?status=${event.processingStatus}` }],
      allowedActions: ["review", "route_to_department", "retry_provider_event"],
      blockedActions: event.processingStatus === "failed"
        ? [{ action: "auto_retry_all", reason: "Failed provider events require bounded replay through provider retry route." }]
        : [],
      metadata: {
        eventName: event.eventName,
        externalTaskId: event.externalTaskId,
        processingStatus: event.processingStatus,
        retryCount: event.retryCount,
        lastErrorCode: event.lastErrorCode
      }
    })),
    ...driveFiles.map((file) => item({
      family: "unassigned_resource",
      status: "needs_classification",
      title: file.name,
      source: "google_drive",
      sourceModel: "GoogleDriveFile",
      sourceId: file.id,
      risk: "low",
      suggestedDepartment: inferDepartment(`${file.name} ${file.description ?? ""} drive file`, file.rawMetadata),
      confidence: "inferred",
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      summary: file.description,
      evidence: [{ label: "Drive file", href: file.webViewLink ?? `/v1/google-drive/files/${file.id}` }],
      allowedActions: ["review", "assign_scope", "route_to_department"],
      blockedActions: [{ action: "delete_file", reason: "Provider deletion is outside the global intake read contract." }],
      metadata: {
        mimeType: file.mimeType,
        isFolder: file.isFolder,
        scanStatus: file.scanStatus,
        syncStatus: file.syncStatus
      }
    })),
    ...containerMappings.map((mapping) => item({
      family: "unassigned_resource",
      status: "needs_classification",
      title: mapping.name ?? `${mapping.provider} ${mapping.entityType} ${mapping.externalId}`,
      source: mapping.provider,
      sourceModel: "ExternalContainerMapping",
      sourceId: mapping.id,
      risk: "low",
      suggestedDepartment: inferDepartment(`${mapping.name ?? ""} ${mapping.entityType}`, mapping.raw),
      confidence: "inferred",
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
      summary: `${mapping.provider} ${mapping.entityType} is not assigned to an operating area, folder, or table.`,
      evidence: [{ label: "Relationship graph", href: "/v1/relationships/graph?includeReview=true" }],
      allowedActions: ["review", "assign_scope", "route_to_department"],
      blockedActions: [],
      metadata: {
        provider: mapping.provider,
        entityType: mapping.entityType,
        externalId: mapping.externalId
      }
    })),
    ...fieldMappings.map((mapping) => item({
      family: "unassigned_resource",
      status: "needs_classification",
      title: mapping.name ?? `${mapping.provider} field ${mapping.externalId}`,
      source: mapping.provider,
      sourceModel: "ExternalFieldMapping",
      sourceId: mapping.id,
      risk: "low",
      suggestedDepartment: inferDepartment(`${mapping.name ?? ""} ${mapping.fieldType ?? ""}`, mapping.typeConfig),
      confidence: "inferred",
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
      summary: `${mapping.provider} field is not mapped to an operating table.`,
      evidence: [{ label: "Relationship graph", href: "/v1/relationships/graph?includeReview=true" }],
      allowedActions: ["review", "map_field", "route_to_department"],
      blockedActions: [],
      metadata: {
        provider: mapping.provider,
        externalId: mapping.externalId,
        fieldType: mapping.fieldType,
        nativeField: mapping.nativeField
      }
    })),
    ...approvals.map((approval) => item({
      family: "risk_or_approval",
      status: "needs_owner_decision",
      title: `Approval required: ${readableTitle(approval.requestedForAction)}`,
      source: "company_os",
      sourceAgent: approval.requestedByType === "agent" ? approval.requestedById : null,
      sourceModel: "Approval",
      sourceId: approval.id,
      risk: approval.riskLevel,
      suggestedDepartment: inferDepartment(`${approval.requestedForAction} ${approval.resourceType}`),
      confidence: "direct",
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
      summary: approval.decisionReason,
      evidence: [{ label: "Approval", href: `/v1/company-os/approvals/${approval.id}` }],
      allowedActions: ["review", "approve_or_reject", "route_to_department"],
      blockedActions: [{ action: "execute_requested_action", reason: "Pending approval must be decided before risky work can continue." }],
      metadata: {
        requestedByType: approval.requestedByType,
        requestedById: approval.requestedById,
        requestedForAction: approval.requestedForAction,
        resourceType: approval.resourceType,
        resourceId: approval.resourceId,
        expiresAt: approval.expiresAt?.toISOString() ?? null
      }
    })),
    ...risks.map((risk) => item({
      family: "risk_or_approval",
      status: "blocked",
      title: `High risk: ${risk.name}`,
      source: "company_os",
      sourceModel: "Risk",
      sourceId: risk.id,
      risk: risk.riskLevel,
      suggestedDepartment: inferDepartment(`${risk.name} ${risk.category ?? ""} risk ${risk.description ?? ""}`),
      confidence: "direct",
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
      summary: risk.description,
      evidence: [{ label: "Company OS risks", href: `/v1/company-os/risks/${risk.id}` }],
      allowedActions: ["review", "create_control", "route_to_department"],
      blockedActions: [{ action: "ignore_risk", reason: "High and critical active risks must have an owner response." }],
      metadata: {
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        processId: risk.processId,
        pipelineId: risk.pipelineId
      }
    })),
    ...tasks.map((task) => item({
      family: ["agent_runtime", "codex"].includes(task.source ?? "") ? "agent_output" : "owner_idea",
      status: "ready_to_route",
      title: task.title,
      source: task.source ?? "companycore",
      sourceAgent: ["agent_runtime", "codex", "jarvis"].includes(task.source ?? "") ? task.source : null,
      sourceModel: "Task",
      sourceId: task.id,
      risk: inferRisk(task.title, task.description),
      suggestedDepartment: inferDepartment(`${task.title} ${task.description ?? ""}`),
      confidence: task.taskListId || task.projectId || task.goalId || task.targetId ? "inferred" : "needs_review",
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      summary: task.description,
      evidence: [{ label: "Task", href: `/v1/tasks/${task.id}` }],
      allowedActions: ["review", "route_to_department", "assign_project_or_list"],
      blockedActions: [],
      metadata: {
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        goalId: task.goalId,
        targetId: task.targetId,
        taskListId: task.taskListId,
        externalId: task.externalId
      }
    })),
    ...events.map((event) => item({
      family: event.type.includes("feedback") ? "feedback_signal" : "provider_signal",
      status: "needs_classification",
      title: readableTitle(event.type),
      source: event.source ?? "companycore",
      sourceAgent: event.actorType === "agent" ? event.actorId : null,
      sourceModel: "Event",
      sourceId: event.id,
      risk: inferRisk(event.type, event.payload),
      suggestedDepartment: inferDepartment(`${event.type} ${event.resourceType ?? ""}`, event.payload),
      confidence: "inferred",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      summary: stringifySummary(event.payload),
      evidence: [{ label: "Event", href: `/v1/events?type=${event.type}` }],
      allowedActions: ["review", "route_to_department", "create_task"],
      blockedActions: [],
      metadata: {
        type: event.type,
        actorType: event.actorType,
        actorId: event.actorId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        correlationId: event.correlationId
      }
    }))
  ];

  const filtered = items
    .filter((intakeItem) => !query.family || intakeItem.family === query.family)
    .filter((intakeItem) => !query.status || intakeItem.status === query.status)
    .filter((intakeItem) => !query.risk || intakeItem.risk === query.risk)
    .filter((intakeItem) => !query.suggestedDepartment || intakeItem.suggestedDepartment === query.suggestedDepartment)
    .filter((intakeItem) => !query.sourceAgent || intakeItem.sourceAgent === query.sourceAgent || intakeItem.sourceAgent == null)
    .sort(compareIntakeItems)
    .slice(0, query.limit);

  res.json({
    data: {
      workspaceId,
      query,
      summary: summarize(filtered),
      items: filtered
    }
  });
}));

function item(input: Omit<IntakeItem, "id" | "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date }): IntakeItem {
  return {
    ...input,
    id: `${input.sourceModel}:${input.sourceId}`,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString()
  };
}

function authActor(req: { auth?: { authType: "user" | "api_key"; userId?: string; apiKeyId?: string } }) {
  if (req.auth?.authType === "user") {
    return {
      actorType: "user" as const,
      actorId: req.auth.userId ?? null
    };
  }

  return {
    actorType: "agent" as const,
    actorId: req.auth?.apiKeyId ?? null
  };
}

function asInputJson(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstBy<T>(items: T[], keyFor: (item: T) => string | null | undefined) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFor(item);
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  }
  return map;
}

function routeProposalExternalId(input: RouteProposalInput, idempotencyKey: string) {
  return [
    "intake-route",
    input.sourceModel,
    input.sourceId,
    input.targetDepartmentKey,
    input.classification,
    idempotencyKey
  ].join(":");
}

async function findIntakeSource(
  client: IntakeTx | typeof prisma,
  workspaceId: string,
  sourceModel: IntakeSourceModel,
  sourceId: string
) {
  switch (sourceModel) {
    case "AgentEventOutbox":
      return client.agentEventOutbox.findFirst({ where: { id: sourceId, workspaceId } });
    case "ProviderEventInbox":
      return client.providerEventInbox.findFirst({ where: { id: sourceId, workspaceId } });
    case "GoogleDriveFile":
      return client.googleDriveFile.findFirst({ where: { id: sourceId, workspaceId } });
    case "ExternalContainerMapping":
      return client.externalContainerMapping.findFirst({ where: { id: sourceId, workspaceId } });
    case "ExternalFieldMapping":
      return client.externalFieldMapping.findFirst({ where: { id: sourceId, workspaceId } });
    case "Approval":
      return client.approval.findFirst({ where: { id: sourceId, workspaceId } });
    case "Risk":
      return client.risk.findFirst({ where: { id: sourceId, workspaceId } });
    case "Task":
      return client.task.findFirst({ where: { id: sourceId, workspaceId } });
    case "Event":
      return client.event.findFirst({ where: { id: sourceId, workspaceId } });
  }
}

function sourceTitle(source: unknown, sourceModel: IntakeSourceModel) {
  const sourceRecord = source && typeof source === "object" ? source as Record<string, unknown> : {};
  const value = sourceRecord.title
    ?? sourceRecord.name
    ?? sourceRecord.eventType
    ?? sourceRecord.eventName
    ?? sourceRecord.type
    ?? sourceRecord.requestedForAction
    ?? sourceRecord.id;
  return `${value ? String(value) : sourceModel}`;
}

function routeProposalInputFromAudit(value: unknown) {
  const payload = asRecord(value);
  return {
    sourceModel: sourceModels.includes(payload.sourceModel as IntakeSourceModel) ? payload.sourceModel as IntakeSourceModel : null,
    sourceId: typeof payload.sourceId === "string" ? payload.sourceId : null,
    targetDepartmentKey: canonicalDepartmentKeys.includes(payload.targetDepartmentKey as IntakeDepartmentKey) ? payload.targetDepartmentKey as IntakeDepartmentKey : null,
    classification: classificationValues.includes(payload.classification as RouteProposalInput["classification"]) ? payload.classification as RouteProposalInput["classification"] : null,
    reason: typeof payload.reason === "string" ? payload.reason : null,
    proposedNextAction: typeof payload.proposedNextAction === "string" ? payload.proposedNextAction : null,
    riskLevel: riskLevels.includes(payload.riskLevel as RouteProposalInput["riskLevel"]) ? payload.riskLevel as RouteProposalInput["riskLevel"] : null,
    requestOwnerDecision: typeof payload.requestOwnerDecision === "boolean" ? payload.requestOwnerDecision : null,
    idempotencyKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : null,
    sourceTitle: typeof payload.sourceTitle === "string" ? payload.sourceTitle : null
  };
}

function routeProposalResponse(params: {
  decision: {
    id: string;
    status: string;
    createdAt: Date;
  };
  input: RouteProposalInput;
  idempotencyKey: string;
  taskId: string | null;
  auditLogId: string | null;
  idempotentReplay: boolean;
}) {
  return {
    proposal: {
      id: params.decision.id,
      sourceModel: params.input.sourceModel,
      sourceId: params.input.sourceId,
      targetDepartmentKey: params.input.targetDepartmentKey as IntakeDepartmentKey,
      classification: params.input.classification,
      status: params.decision.status,
      riskLevel: params.input.riskLevel,
      createdAt: params.decision.createdAt.toISOString()
    },
    effects: {
      sourceMutated: false,
      agentEventAcknowledged: false,
      providerStateMutated: false,
      taskDraftCreated: Boolean(params.taskId),
      ownerDecisionRequested: params.input.requestOwnerDecision,
      auditRecorded: Boolean(params.auditLogId),
      idempotentReplay: params.idempotentReplay
    },
    evidence: {
      decisionId: params.decision.id,
      taskId: params.taskId,
      auditLogId: params.auditLogId,
      idempotencyKey: params.idempotencyKey
    },
    blockedActions: routeProposalBlockedActions()
  };
}

function routeProposalReadbackResponse(params: {
  decision: {
    id: string;
    title: string;
    rationale: string | null;
    outcome: string | null;
    status: string;
    externalId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  input: ReturnType<typeof routeProposalInputFromAudit>;
  task: { id: string; title: string; status: string; createdAt: Date } | null;
  auditLog: { id: string; correlationId: string; createdAt: Date } | null;
  event: { id: string; correlationId: string | null; createdAt: Date } | null;
}) {
  const lifecycleState = params.decision.status === "proposed" && params.task
    ? "task_draft_created"
    : params.decision.status;

  return {
    proposal: {
      id: params.decision.id,
      title: params.decision.title,
      sourceModel: params.input.sourceModel,
      sourceId: params.input.sourceId,
      sourceTitle: params.input.sourceTitle,
      targetDepartmentKey: params.input.targetDepartmentKey,
      classification: params.input.classification,
      status: params.decision.status,
      lifecycleState,
      riskLevel: params.input.riskLevel,
      reason: params.input.reason ?? params.decision.rationale,
      proposedNextAction: params.input.proposedNextAction ?? params.decision.outcome,
      ownerDecisionRequested: params.input.requestOwnerDecision,
      createdAt: params.decision.createdAt.toISOString(),
      updatedAt: params.decision.updatedAt.toISOString()
    },
    effects: {
      sourceMutated: false,
      agentEventAcknowledged: false,
      providerStateMutated: false,
      taskDraftCreated: Boolean(params.task),
      ownerDecisionRequested: Boolean(params.input.requestOwnerDecision),
      auditRecorded: Boolean(params.auditLog),
      eventRecorded: Boolean(params.event)
    },
    evidence: {
      decisionId: params.decision.id,
      taskId: params.task?.id ?? null,
      taskStatus: params.task?.status ?? null,
      auditLogId: params.auditLog?.id ?? null,
      eventId: params.event?.id ?? null,
      correlationId: params.auditLog?.correlationId ?? params.event?.correlationId ?? null,
      idempotencyKey: params.input.idempotencyKey,
      externalId: params.decision.externalId
    },
    allowedActions: [
      "read",
      "inspect_evidence",
      "propose_replacement_route",
      "create_follow_up_task"
    ],
    blockedActions: routeProposalBlockedActions()
  };
}

function routeProposalBlockedActions() {
  return [
    {
      action: "ack",
      reason: "Use POST /v1/agent-events/:id/ack only after the owner or assigned department handles the item."
    },
    {
      action: "provider_write",
      reason: "Provider retry, scope, delete, and write actions stay in provider-specific guarded routes."
    },
    {
      action: "approval_decision",
      reason: "Approvals require a dedicated approval decision command and proper authority."
    },
    {
      action: "commercial_or_legal_action",
      reason: "Invoice, discount, payment, legal, and ads changes require their own approval-aware command contracts."
    }
  ];
}

function summarizeRouteProposals(proposals: Array<ReturnType<typeof routeProposalReadbackResponse>>) {
  const byStatus: Record<string, number> = {};
  const byTargetDepartment: Record<string, number> = {};
  const byRisk: Record<string, number> = {};

  for (const proposal of proposals) {
    byStatus[proposal.proposal.lifecycleState] = (byStatus[proposal.proposal.lifecycleState] ?? 0) + 1;
    if (proposal.proposal.targetDepartmentKey) {
      byTargetDepartment[proposal.proposal.targetDepartmentKey] = (byTargetDepartment[proposal.proposal.targetDepartmentKey] ?? 0) + 1;
    }
    if (proposal.proposal.riskLevel) {
      byRisk[proposal.proposal.riskLevel] = (byRisk[proposal.proposal.riskLevel] ?? 0) + 1;
    }
  }

  return {
    total: proposals.length,
    withTaskDraft: proposals.filter((proposal) => proposal.effects.taskDraftCreated).length,
    withAuditEvidence: proposals.filter((proposal) => proposal.effects.auditRecorded).length,
    withEventEvidence: proposals.filter((proposal) => proposal.effects.eventRecorded).length,
    byStatus,
    byTargetDepartment,
    byRisk
  };
}

function readableTitle(value: string) {
  return value
    .replace(/[_:.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function stringifySummary(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function searchable(value: unknown) {
  if (value == null) {
    return "";
  }
  return typeof value === "string" ? value.toLowerCase() : JSON.stringify(value).toLowerCase();
}

function inferRisk(...values: unknown[]): IntakeItem["risk"] {
  const text = values.map(searchable).join(" ");
  if (["critical", "credential", "secret", "payment", "invoice", "legal", "security"].some((term) => text.includes(term))) {
    return "critical";
  }
  if (["failed", "blocked", "approval", "risk", "delete", "archive", "permission"].some((term) => text.includes(term))) {
    return "high";
  }
  if (["client", "offer", "deadline", "pricing", "discount"].some((term) => text.includes(term))) {
    return "medium";
  }
  return "low";
}

function inferDepartment(...values: unknown[]) {
  const text = values.map(searchable).join(" ");
  const matches = departmentHints
    .map((department) => ({
      key: department.key,
      score: department.terms.filter((term) => text.includes(term)).length
    }))
    .filter((department) => department.score > 0)
    .sort((left, right) => right.score - left.score);
  return matches[0]?.key ?? "00-ogolny";
}

function riskRank(risk: IntakeItem["risk"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[risk];
}

function statusRank(status: string) {
  return {
    blocked: 0,
    needs_owner_decision: 1,
    needs_classification: 2,
    ready_to_route: 3
  }[status] ?? 4;
}

function compareIntakeItems(left: IntakeItem, right: IntakeItem) {
  return riskRank(left.risk) - riskRank(right.risk)
    || statusRank(left.status) - statusRank(right.status)
    || right.updatedAt.localeCompare(left.updatedAt);
}

function summarize(items: IntakeItem[]) {
  const byFamily: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};

  for (const intakeItem of items) {
    byFamily[intakeItem.family] = (byFamily[intakeItem.family] ?? 0) + 1;
    byStatus[intakeItem.status] = (byStatus[intakeItem.status] ?? 0) + 1;
    byRisk[intakeItem.risk] = (byRisk[intakeItem.risk] ?? 0) + 1;
    byDepartment[intakeItem.suggestedDepartment] = (byDepartment[intakeItem.suggestedDepartment] ?? 0) + 1;
  }

  return {
    total: items.length,
    byFamily,
    byStatus,
    byRisk,
    byDepartment
  };
}
