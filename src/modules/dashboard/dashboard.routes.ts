import { Router } from "express";
import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";

const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked"];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function coerceCount(value: number | null | undefined) {
  return Number(value ?? 0);
}

function sumCounts(values: Array<number | null | undefined>) {
  return values.reduce<number>((sum, value) => sum + coerceCount(value), 0);
}

function riskRank(level: string | null | undefined) {
  const ranks: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  return ranks[String(level ?? "").toLowerCase()] ?? 0;
}

function pickHealth(status: "ready" | "watch" | "blocked", count: number) {
  if (count <= 0) return "ready";
  return status;
}

export const dashboardRouter = Router();

dashboardRouter.get("/command", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const today = startOfToday();
  const tomorrow = startOfTomorrow();

  const [
    pendingAgentEvents,
    failedProviderEvents,
    pendingProviderEvents,
    pendingApprovals,
    activeRisks,
    taskCounts,
    overdueTasks,
    dueTodayTasks,
    unscheduledOpenTasks,
    activeTaskLists,
    workforceCounts,
    autonomousAgents,
    pendingWorkforceSyncs,
    driveCounts,
    unmappedDriveFiles,
    unmappedContainerMappings,
    unmappedFieldMappings,
    latestRouteProposals
  ] = await Promise.all([
    prisma.agentEventOutbox.count({ where: { workspaceId, deliveryStatus: "pending" } }),
    prisma.providerEventInbox.count({ where: { workspaceId, processingStatus: "failed" } }),
    prisma.providerEventInbox.count({ where: { workspaceId, processingStatus: "pending" } }),
    prisma.approval.count({ where: { workspaceId, status: "pending" } }),
    prisma.risk.findMany({
      where: { workspaceId, status: "active" },
      orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, name: true, riskLevel: true, category: true, updatedAt: true }
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true }
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        status: { in: OPEN_TASK_STATUSES },
        dueDate: { lt: today }
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, status: true, priority: true, dueDate: true, updatedAt: true }
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        status: { in: OPEN_TASK_STATUSES },
        dueDate: { gte: today, lt: tomorrow }
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, status: true, priority: true, dueDate: true, updatedAt: true }
    }),
    prisma.task.count({
      where: {
        workspaceId,
        status: { in: OPEN_TASK_STATUSES },
        dueDate: null
      }
    }),
    prisma.taskList.count({
      where: {
        workspaceId,
        status: { not: "archived" }
      }
    }),
    prisma.workforceEntity.groupBy({
      by: ["type", "status"],
      where: { workspaceId },
      _count: { _all: true }
    }),
    prisma.workforceEntity.count({
      where: {
        workspaceId,
        type: "agent",
        status: "active",
        runtimeMode: "autonomous"
      }
    }),
    prisma.agentEventOutbox.count({
      where: {
        workspaceId,
        eventType: "paperclip_agent_config_sync_requested",
        deliveryStatus: "pending"
      }
    }),
    prisma.googleDriveFile.groupBy({
      by: ["isFolder", "syncStatus", "scanStatus"],
      where: { workspaceId, trashed: false },
      _count: { _all: true }
    }),
    prisma.googleDriveFile.count({
      where: {
        workspaceId,
        trashed: false,
        operatingAreaId: null,
        operatingFolderId: null,
        operatingTableId: null,
        storageLocationId: null,
        knowledgeRootId: null
      }
    }),
    prisma.externalContainerMapping.count({
      where: { workspaceId, areaId: null, folderId: null, tableId: null }
    }),
    prisma.externalFieldMapping.count({
      where: { workspaceId, tableId: null, nativeField: null }
    }),
    prisma.decision.findMany({
      where: { workspaceId, source: "companycore_intake" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, status: true, outcome: true, updatedAt: true }
    })
  ]);

  const taskStatusCounts = Object.fromEntries(taskCounts.map((row) => [row.status, row._count._all]));
  const workforceSummary = workforceCounts.reduce<Record<string, number>>((summary, row) => {
    summary[`${row.type}_${row.status}`] = row._count._all;
    summary[row.type] = (summary[row.type] ?? 0) + row._count._all;
    return summary;
  }, {});
  const driveSummary = driveCounts.reduce<Record<string, number>>((summary, row) => {
    summary[row.isFolder ? "folders" : "files"] = (summary[row.isFolder ? "folders" : "files"] ?? 0) + row._count._all;
    summary[`sync_${row.syncStatus}`] = (summary[`sync_${row.syncStatus}`] ?? 0) + row._count._all;
    summary[`scan_${row.scanStatus}`] = (summary[`scan_${row.scanStatus}`] ?? 0) + row._count._all;
    return summary;
  }, {});

  const criticalRisks = activeRisks.filter((risk) => riskRank(risk.riskLevel) >= 3);
  const integrationIssues = sumCounts([failedProviderEvents, pendingProviderEvents]);
  const routingBacklog = sumCounts([pendingAgentEvents, unmappedDriveFiles, unmappedContainerMappings, unmappedFieldMappings]);
  const operationPressure = sumCounts([taskStatusCounts.blocked, overdueTasks.length, unscheduledOpenTasks]);
  const peoplePressure = sumCounts([autonomousAgents, pendingWorkforceSyncs]);

  const priorityItems = [
    ...overdueTasks.map((task) => ({
      id: task.id,
      title: task.title,
      source: "operations",
      severity: task.status === "blocked" ? "high" : "medium",
      status: task.status,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt
    })),
    ...criticalRisks.map((risk) => ({
      id: risk.id,
      title: risk.name,
      source: "risk",
      severity: String(risk.riskLevel).toLowerCase(),
      status: "active",
      category: risk.category,
      updatedAt: risk.updatedAt
    })),
    ...latestRouteProposals.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      source: "intake",
      severity: proposal.status === "accepted" ? "low" : "watch",
      status: proposal.status,
      outcome: proposal.outcome,
      updatedAt: proposal.updatedAt
    }))
  ].slice(0, 12);

  const nextActions = [
    pendingApprovals > 0 ? {
      key: "review_approvals",
      label: "Review pending approvals",
      target: "/areas?area=00-ogolny&view=overview",
      count: pendingApprovals,
      priority: "high"
    } : null,
    overdueTasks.length > 0 ? {
      key: "clear_overdue_operations",
      label: "Clear overdue Operations work",
      target: "/areas?area=04-operacje&view=tasks",
      count: overdueTasks.length,
      priority: "high"
    } : null,
    pendingWorkforceSyncs > 0 ? {
      key: "sync_people_agents",
      label: "Deliver pending Paperclip workforce syncs",
      target: "/areas?area=06-kadry&view=directory",
      count: pendingWorkforceSyncs,
      priority: "medium"
    } : null,
    routingBacklog > 0 ? {
      key: "route_unassigned_assets",
      label: "Route unassigned intake and assets",
      target: "/areas?area=00-ogolny&view=overview",
      count: routingBacklog,
      priority: "medium"
    } : null
  ].filter(Boolean);

  res.json({
    data: {
      generatedAt: new Date().toISOString(),
      summary: {
        pendingAgentEvents,
        failedProviderEvents,
        pendingProviderEvents,
        pendingApprovals,
        activeRisks: activeRisks.length,
        criticalRisks: criticalRisks.length,
        openTasks: sumCounts([taskStatusCounts.todo, taskStatusCounts.in_progress, taskStatusCounts.blocked]),
        blockedTasks: coerceCount(taskStatusCounts.blocked),
        overdueTasks: overdueTasks.length,
        dueTodayTasks: dueTodayTasks.length,
        unscheduledOpenTasks,
        activeTaskLists,
        workforceEntities: sumCounts(Object.values(workforceSummary)),
        activeHumans: coerceCount(workforceSummary.human_active),
        activeAgents: coerceCount(workforceSummary.agent_active),
        autonomousAgents,
        pendingWorkforceSyncs,
        driveFiles: coerceCount(driveSummary.files),
        driveFolders: coerceCount(driveSummary.folders),
        unmappedDriveFiles,
        unmappedContainerMappings,
        unmappedFieldMappings,
        latestRouteProposals: latestRouteProposals.length
      },
      departmentSignals: [
        {
          key: "00-ogolny",
          label: "General dashboard",
          health: pickHealth("watch", routingBacklog + pendingApprovals),
          count: routingBacklog + pendingApprovals,
          href: "/areas?area=00-ogolny&view=overview"
        },
        {
          key: "04-operacje",
          label: "Operations tasks and calendar",
          health: pickHealth(operationPressure > 5 ? "blocked" : "watch", operationPressure),
          count: operationPressure,
          href: "/areas?area=04-operacje&view=tasks"
        },
        {
          key: "06-kadry",
          label: "People and agents directory",
          health: pickHealth(peoplePressure > 0 ? "watch" : "ready", peoplePressure),
          count: peoplePressure,
          href: "/areas?area=06-kadry&view=directory"
        },
        {
          key: "08-zasoby",
          label: "Assets and resources",
          health: pickHealth("watch", unmappedDriveFiles + unmappedContainerMappings + unmappedFieldMappings),
          count: unmappedDriveFiles + unmappedContainerMappings + unmappedFieldMappings,
          href: "/areas?area=08-zasoby&view=files"
        }
      ],
      priorityItems,
      nextActions,
      latestRouteProposals,
      blockedActions: [
        {
          action: "assign_human_or_agent_from_dashboard",
          reason: "Assignment is modeled on Operations work items; dashboard context remains read-only and must route writes through the Operations command surface."
        },
        {
          action: "create_provider_calendar_event",
          reason: "Operations stores work-item schedule metadata, but provider calendar creation and recurrence execution need separate integration commands."
        }
      ],
      agentPacket: {
        mode: "read_only_command_center",
        instructions: [
          "Use this packet to decide which department queue needs attention first.",
          "Use domain routes for writes: Operations work-item commands, Workforce commands, and Assets commands.",
          "Do not write assignments from dashboard context; use the Operations work-item command and its explicit responsibility fields."
        ],
        blockedActions: [
          "Do not assign humans or agents from dashboard context alone.",
          "Do not create provider calendar events or execute recurrence rules until integration commands exist."
        ]
      }
    }
  });
}));
