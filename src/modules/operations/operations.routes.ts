import { Router } from "express";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { IntegrationError } from "../../integrations/errors";
import { writeBackCompanyCoreTaskToClickUp } from "../../integrations/clickup/clickup.webhooks";
import { asyncHandler } from "../../middleware/async-handler";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";
import { createEvent } from "../events/event.service";

const OPERATIONS_DEPARTMENT_KEY = "04-operacje";
const OPERATIONS_LIMIT = 12;
const WORK_ITEM_LIMIT = 100;

const workItemsQuerySchema = z.object({
  status: z.enum(["todo", "in_progress", "blocked", "done", "archived"]).optional(),
  priority: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  taskListId: z.string().uuid().optional(),
  refresh: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(WORK_ITEM_LIMIT)
}).strict();

const updateWorkItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.string().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  taskListId: z.string().uuid().nullable().optional()
}).strict();

function asJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function taskLooksOperational(task: { title: string; description: string | null }) {
  const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
  return ["operation", "operacje", "procedure", "procedura", "dependency", "approval", "routine", "sop"].some((term) => text.includes(term));
}

function normalizedTaskStatus(status: string) {
  const statusMap: Record<string, string> = {
    todo: "todo",
    in_progress: "in_progress",
    blocked: "blocked",
    done: "completed",
    archived: "archived"
  };

  return statusMap[status] ?? status;
}

async function visibleWorkItemRelations(workspaceId: string, input: z.infer<typeof updateWorkItemSchema>) {
  const checks = [
    input.projectId ? prisma.project.findFirst({ where: { id: input.projectId, workspaceId } }) : null,
    input.goalId ? prisma.goal.findFirst({ where: { id: input.goalId, workspaceId } }) : null,
    input.targetId ? prisma.target.findFirst({ where: { id: input.targetId, workspaceId } }) : null,
    input.taskListId ? prisma.taskList.findFirst({ where: { id: input.taskListId, workspaceId } }) : null
  ].filter(Boolean);

  const relations = await Promise.all(checks);
  return relations.every((relation) => Boolean(relation));
}

function taskRiskLevel(task: { status: string; dueDate: Date | null }, dependencyCount: number) {
  if (task.status === "blocked" || dependencyCount > 0) {
    return "high";
  }

  if (task.dueDate && task.dueDate.getTime() < Date.now() && task.status !== "done" && task.status !== "archived") {
    return "medium";
  }

  return "low";
}

function taskReadiness(task: { status: string; dueDate: Date | null; projectId: string | null; taskListId: string | null }, dependencyCount: number) {
  const missingFields = [
    task.projectId ? null : "project",
    task.taskListId ? null : "task_list",
    "owner_user_id",
    "assigned_agent_id",
    "reviewer_id",
    "estimated_duration_minutes",
    "related_resources"
  ].filter((field): field is string => Boolean(field));

  return {
    blocked: task.status === "blocked" || dependencyCount > 0,
    overdue: Boolean(task.dueDate && task.dueDate.getTime() < Date.now() && task.status !== "done" && task.status !== "archived"),
    dependencyCount,
    riskLevel: taskRiskLevel(task, dependencyCount),
    missingFields
  };
}

function jsonReferencesTask(value: unknown, task: { id: string; externalId: string | null }) {
  const text = JSON.stringify(value ?? {});
  return text.includes(task.id) || Boolean(task.externalId && text.includes(task.externalId));
}

function mapBlockedOperationsActions() {
  return [
    {
      action: "change_task_status",
      reason: "Task status changes must use the existing task command route or a future audited Operations command."
    },
    {
      action: "assign_human_or_agent",
      reason: "Human and AI-agent assignment needs an explicit responsibility model before writes are exposed."
    },
    {
      action: "create_checklist_or_subtask",
      reason: "Checklists and subtasks need a shared task-detail contract instead of page-local structures."
    },
    {
      action: "mutate_pipeline_or_procedure",
      reason: "Pipeline and procedure changes must use Company OS workflow-definition draft and activation commands."
    },
    {
      action: "execute_provider_operation",
      reason: "Provider-side operations must stay behind integration-specific approval-aware commands."
    }
  ];
}

export const operationsRouter = Router();

operationsRouter.get("/work-items", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const query = workItemsQuerySchema.parse(req.query);
  const department = resolveDepartmentEntry(OPERATIONS_DEPARTMENT_KEY);
  const operationsArea = await prisma.operatingArea.findFirst({
    where: {
      workspaceId,
      key: department?.backendAreaKey ?? "operations-administration"
    }
  });

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.taskListId ? { taskListId: query.taskListId } : {})
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: query.limit,
    include: {
      project: true,
      goal: true,
      target: true,
      taskList: true,
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
      events: { orderBy: { createdAt: "desc" }, take: 8 }
    }
  });

  const [taskLists, taskCountByList] = await Promise.all([
    prisma.taskList.findMany({
      where: { workspaceId, status: { not: "archived" } },
      orderBy: [{ source: "asc" }, { name: "asc" }],
      include: { project: true }
    }),
    prisma.task.groupBy({
      by: ["taskListId"],
      where: { workspaceId },
      _count: { _all: true }
    })
  ]);

  const taskCountByListId = new Map(taskCountByList.map((row) => [row.taskListId ?? "unassigned", row._count._all]));
  const taskIds = tasks.map((task) => task.id);
  const projectIds = Array.from(new Set(tasks.map((task) => task.projectId).filter((id): id is string => Boolean(id))));

  const [
    dependencies,
    pipelineRuns,
    agentLogs,
    projectResources,
    operationsDriveFiles
  ] = await Promise.all([
    taskIds.length
      ? prisma.dependency.findMany({
        where: {
          workspaceId,
          OR: [
            { fromEntityType: "task", fromEntityId: { in: taskIds } },
            { toEntityType: "task", toEntityId: { in: taskIds } }
          ]
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 200,
        include: { fromResource: true, toResource: true }
      })
      : Promise.resolve([]),
    prisma.pipelineRun.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        pipeline: true,
        currentStage: { include: { procedure: true } },
        stageRuns: {
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { pipelineStage: { include: { procedure: true } } }
        }
      }
    }),
    prisma.agentLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { agent: true }
    }),
    projectIds.length
      ? prisma.resource.findMany({
        where: { workspaceId, relatedProjectId: { in: projectIds } },
        orderBy: { updatedAt: "desc" },
        take: 100
      })
      : Promise.resolve([]),
    operationsArea
      ? prisma.googleDriveFile.findMany({
        where: { workspaceId, operatingAreaId: operationsArea.id, trashed: false },
        orderBy: [{ isFolder: "desc" }, { modifiedTime: "desc" }, { updatedAt: "desc" }],
        take: 12
      })
      : Promise.resolve([])
  ]);

  const workItems = tasks.map((task) => {
    const taskDependencies = dependencies.filter((dependency) => (
      (dependency.fromEntityType === "task" && dependency.fromEntityId === task.id)
      || (dependency.toEntityType === "task" && dependency.toEntityId === task.id)
    ));
    const taskPipelineRuns = pipelineRuns.filter((run) => asStringArray(run.linkedTaskIds).includes(task.id));
    const taskAgentLogs = agentLogs.filter((log) => jsonReferencesTask(log.metadata, task)).slice(0, 5);
    const taskResources = projectResources.filter((resource) => resource.relatedProjectId === task.projectId).slice(0, 8);
    const readiness = taskReadiness(task, taskDependencies.length);

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        normalizedStatus: normalizedTaskStatus(task.status),
        priority: task.priority ?? "medium",
        dueDate: task.dueDate?.toISOString() ?? null,
        startDate: null,
        estimatedEndDate: null,
        completedAt: task.status === "done" ? task.updatedAt.toISOString() : null,
        estimatedDurationMinutes: null,
        actualDurationMinutes: null,
        trackedTimeMinutes: null,
        source: task.source,
        externalId: task.externalId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      },
      responsibility: {
        ownerUserId: null,
        assignedAgentId: null,
        reviewerId: null,
        teamId: null,
        status: "not_modeled",
        evidence: taskAgentLogs.map((log) => ({
          id: log.id,
          agentId: log.agentId,
          agentName: log.agent?.name ?? null,
          level: log.level,
          message: log.message,
          createdAt: log.createdAt.toISOString()
        }))
      },
      hierarchy: {
        project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status } : null,
        goal: task.goal ? { id: task.goal.id, title: task.goal.title, status: task.goal.status } : null,
        target: task.target ? { id: task.target.id, title: task.target.title, status: task.target.status } : null,
        taskList: task.taskList ? { id: task.taskList.id, name: task.taskList.name, status: task.taskList.status } : null
      },
      operationalContext: {
        pipelineRuns: taskPipelineRuns.map((run) => ({
          id: run.id,
          status: run.status,
          pipeline: { id: run.pipeline.id, name: run.pipeline.name, status: run.pipeline.status },
          currentStage: run.currentStage ? {
            id: run.currentStage.id,
            name: run.currentStage.name,
            status: run.currentStage.status,
            procedure: run.currentStage.procedure ? {
              id: run.currentStage.procedure.id,
              name: run.currentStage.procedure.name,
              status: run.currentStage.procedure.status
            } : null
          } : null,
          stageRuns: run.stageRuns.map((stageRun) => ({
            id: stageRun.id,
            status: stageRun.status,
            approvalStatus: stageRun.approvalStatus,
            stageName: stageRun.pipelineStage.name,
            procedureName: stageRun.pipelineStage.procedure?.name ?? null
          })),
          correlationId: run.correlationId
        }))
      },
      readiness,
      evidence: {
        notes: task.notes.map((note) => ({
          id: note.id,
          content: note.content,
          status: note.status,
          source: note.source,
          createdAt: note.createdAt.toISOString()
        })),
        events: task.events.map((event) => ({
          id: event.id,
          type: event.type,
          source: event.source,
          actorType: event.actorType,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          correlationId: event.correlationId,
          createdAt: event.createdAt.toISOString()
        })),
        dependencies: taskDependencies.map((dependency) => ({
          id: dependency.id,
          type: dependency.dependencyType,
          status: dependency.status,
          from: dependency.fromResource?.name ?? dependency.fromEntityType ?? null,
          to: dependency.toResource?.name ?? dependency.toEntityType ?? null,
          metadata: dependency.metadata
        })),
        projectResources: taskResources.map((resource) => ({
          id: resource.id,
          type: resource.type,
          name: resource.name,
          url: resource.url,
          accessLevel: resource.accessLevel
        }))
      }
    };
  });

  const byStatus = workItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.task.status] = (counts[item.task.status] ?? 0) + 1;
    return counts;
  }, {});
  const byPriority = workItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.task.priority] = (counts[item.task.priority] ?? 0) + 1;
    return counts;
  }, {});
  const statuses = [
    { key: "todo", label: "To do" },
    { key: "in_progress", label: "In progress" },
    { key: "blocked", label: "Blocked" },
    { key: "done", label: "Done" },
    { key: "archived", label: "Archived" }
  ];

  return res.json({
    data: {
      department: {
        canonicalKey: department?.canonicalKey ?? OPERATIONS_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "operations-administration",
        name: "Operations Management System",
        purpose: "Turn current company work into supervised, evidence-backed execution without creating a second task manager."
      },
      summary: {
        total: workItems.length,
        open: workItems.filter((item) => !["done", "archived"].includes(item.task.status)).length,
        blocked: workItems.filter((item) => item.readiness.blocked).length,
        overdue: workItems.filter((item) => item.readiness.overdue).length,
        withProject: workItems.filter((item) => Boolean(item.hierarchy.project)).length,
        withTaskList: workItems.filter((item) => Boolean(item.hierarchy.taskList)).length,
        withPipelineRunEvidence: workItems.filter((item) => item.operationalContext.pipelineRuns.length > 0).length,
        withDependencyEvidence: workItems.filter((item) => item.evidence.dependencies.length > 0).length,
        withNotes: workItems.filter((item) => item.evidence.notes.length > 0).length,
        withEvents: workItems.filter((item) => item.evidence.events.length > 0).length,
        byStatus,
        byPriority
      },
      operationsKnowledge: {
        area: operationsArea ? { id: operationsArea.id, key: operationsArea.key, name: operationsArea.name } : null,
        driveFiles: operationsDriveFiles.map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          isFolder: file.isFolder,
          syncStatus: file.syncStatus,
          scanStatus: file.scanStatus,
          webViewLink: file.webViewLink,
          modifiedTime: file.modifiedTime?.toISOString() ?? null
        }))
      },
      taskLists: [
        {
          id: "unassigned",
          name: "Unassigned",
          description: "Tasks without a list assignment.",
          status: "active",
          source: "companycore",
          externalId: null,
          project: null,
          taskCount: taskCountByListId.get("unassigned") ?? 0
        },
        ...taskLists.map((taskList) => ({
          id: taskList.id,
          name: taskList.name,
          description: taskList.description,
          status: taskList.status,
          source: taskList.source,
          externalId: taskList.externalId,
          project: taskList.project ? {
            id: taskList.project.id,
            name: taskList.project.name,
            status: taskList.project.status
          } : null,
          taskCount: taskCountByListId.get(taskList.id) ?? 0
        }))
      ],
      statuses,
      workItems,
      agentPacket: {
        mode: "read_only",
        allowedActions: [
          "read_operations_work_items",
          "inspect_task",
          "inspect_task_evidence",
          "inspect_pipeline_run_evidence",
          "inspect_operations_drive_context"
        ],
        blockedActions: mapBlockedOperationsActions()
      }
    }
  });
}));

operationsRouter.patch("/work-items/:id", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const input = updateWorkItemSchema.parse(req.body);

  if (!await visibleWorkItemRelations(workspaceId, input)) {
    return res.status(404).json({ error: "not_found" });
  }

  const existing = await prisma.task.findFirst({
    where: { id: String(req.params.id), workspaceId }
  });

  if (!existing) {
    return res.status(404).json({ error: "not_found" });
  }

  if (existing.source === "clickup" && existing.externalId) {
    try {
      await writeBackCompanyCoreTaskToClickUp({
        workspaceId,
        externalId: existing.externalId,
        changes: {
          title: input.title,
          description: input.description ?? undefined,
          status: input.status,
          priority: input.priority ?? undefined,
          dueDate: input.dueDate ?? undefined
        }
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        await createEvent({
          type: "operations_work_item_writeback_failed",
          workspaceId,
          taskId: existing.id,
          source: "clickup",
          payload: {
            provider: "clickup",
            taskId: existing.id,
            externalId: existing.externalId,
            errorCode: error.code
          }
        });
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: input
  });

  await createEvent({
    type: "operations_work_item_updated",
    workspaceId,
    projectId: task.projectId,
    taskId: task.id,
    source: task.source,
    payload: {
      taskId: task.id,
      changed: Object.keys(input)
    }
  });

  return res.json({
    data: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() ?? null,
      source: task.source,
      externalId: task.externalId,
      updatedAt: task.updatedAt.toISOString()
    }
  });
}));

operationsRouter.get("/context", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const department = resolveDepartmentEntry(OPERATIONS_DEPARTMENT_KEY);

  const [
    procedures,
    procedureStepCount,
    approvals,
    dependencies,
    businessFunctions,
    tasks,
    counts
  ] = await Promise.all([
    prisma.procedure.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: OPERATIONS_LIMIT,
      include: {
        process: true,
        ownerRole: true,
        steps: { orderBy: { stepOrder: "asc" }, take: 8 }
      }
    }),
    prisma.procedureStep.count({ where: { procedure: { workspaceId } } }),
    prisma.approval.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: OPERATIONS_LIMIT,
      include: { approverRole: true }
    }),
    prisma.dependency.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: OPERATIONS_LIMIT,
      include: { fromResource: true, toResource: true }
    }),
    prisma.businessFunction.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: OPERATIONS_LIMIT,
      include: { accountableRole: true }
    }),
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    Promise.all([
      prisma.procedure.count({ where: { workspaceId } }),
      prisma.procedure.count({ where: { workspaceId, status: "active" } }),
      prisma.approval.count({ where: { workspaceId, status: "pending" } }),
      prisma.dependency.count({ where: { workspaceId, status: "blocked" } }),
      prisma.businessFunction.count({ where: { workspaceId, status: "active" } }),
      prisma.task.count({ where: { workspaceId, status: { in: ["todo", "in_progress", "blocked"] } } })
    ])
  ]);

  const operationalTasks = tasks.filter(taskLooksOperational).slice(0, OPERATIONS_LIMIT);
  const [procedureCount, activeProcedureCount, pendingApprovalCount, blockedDependencyCount, activeBusinessFunctionCount, openTaskCount] = counts;

  return res.json({
    data: {
      department: {
        canonicalKey: department?.canonicalKey ?? OPERATIONS_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "operations-administration",
        name: "Operations Management System",
        purpose: "Keep the company running through planning, routines, controls, dependencies, approvals, and handoffs."
      },
      summary: {
        procedures: procedureCount,
        activeProcedures: activeProcedureCount,
        procedureSteps: procedureStepCount,
        pendingApprovals: pendingApprovalCount,
        blockedDependencies: blockedDependencyCount,
        activeBusinessFunctions: activeBusinessFunctionCount,
        openTasks: openTaskCount,
        operationalTasks: operationalTasks.length
      },
      procedures: procedures.map((procedure) => ({
        id: procedure.id,
        name: procedure.name,
        purpose: procedure.purpose,
        status: procedure.status,
        version: procedure.version,
        processName: procedure.process?.name ?? null,
        ownerRole: procedure.ownerRole?.name ?? null,
        requiredTools: asJsonArray(procedure.requiredTools),
        requiredPermissions: asJsonArray(procedure.requiredPermissions),
        expectedResult: procedure.expectedResult,
        steps: procedure.steps.map((step) => ({
          id: step.id,
          order: step.stepOrder,
          instruction: step.instruction,
          stepType: step.stepType,
          rollbackInstruction: step.rollbackInstruction
        }))
      })),
      approvals: approvals.map((approval) => ({
        id: approval.id,
        requestedByType: approval.requestedByType,
        requestedById: approval.requestedById,
        requestedForAction: approval.requestedForAction,
        resourceType: approval.resourceType,
        resourceId: approval.resourceId,
        riskLevel: approval.riskLevel,
        status: approval.status,
        approverRole: approval.approverRole?.name ?? null,
        expiresAt: approval.expiresAt?.toISOString() ?? null,
        createdAt: approval.createdAt.toISOString()
      })),
      dependencies: dependencies.map((dependency) => ({
        id: dependency.id,
        type: dependency.dependencyType,
        status: dependency.status,
        from: dependency.fromResource?.name ?? dependency.fromEntityType ?? null,
        to: dependency.toResource?.name ?? dependency.toEntityType ?? null,
        metadata: dependency.metadata
      })),
      businessFunctions: businessFunctions.map((businessFunction) => ({
        id: businessFunction.id,
        name: businessFunction.name,
        category: businessFunction.category,
        status: businessFunction.status,
        accountableRole: businessFunction.accountableRole?.name ?? null,
        description: businessFunction.description
      })),
      tasks: operationalTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() ?? null,
        source: task.source
      })),
      agentPacket: {
        mode: "read_only",
        recommendedNextActions: [
          "Review pending approvals before executing risky operations.",
          "Inspect blocked dependencies before assigning operational work.",
          "Use Company OS workflow-definition drafts for procedure changes.",
          "Create or update tasks only through existing task command routes."
        ],
        allowedActions: [
          "read_operations_context",
          "inspect_procedure",
          "inspect_dependency",
          "inspect_approval",
          "propose_task_follow_up"
        ],
        blockedActions: [
          {
            action: "create_or_change_procedure",
            reason: "Procedure definition changes must use Company OS workflow-definition draft commands."
          },
          {
            action: "decide_approval",
            reason: "Approval decisions require the dedicated approval decision command and proper authority."
          },
          {
            action: "mutate_dependency",
            reason: "Dependency write behavior needs its own command contract."
          },
          {
            action: "execute_provider_operation",
            reason: "Provider-side operations must stay behind integration-specific approval-aware commands."
          }
        ]
      }
    }
  });
}));
