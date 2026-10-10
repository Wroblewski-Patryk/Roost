import { Router } from "express";
import { TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { companyRuntimeClass } from "../agent-runtime/company-information-runtime";

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

const ATTENTION_PAGE_SIZE = 25;
type AttentionRow = { id: string; kind: "decision" | "result" | "blocker" | "incident" | "task" | "risk"; title: string; status: string; severity: string; dueDate: Date | null; updatedAt: Date };
async function attentionPage(workspaceId: string, offset: number) {
  const rows = await prisma.$queryRaw<AttentionRow[]>`
    WITH latest_execution AS (
      SELECT DISTINCT ON (e.task_id) e.id, e.task_id, e.status::text AS status, e.updated_at
      FROM agent_executions e
      WHERE e.workspace_id=${workspaceId}::uuid AND e.application_id IS NULL
        AND e.metadata->'executionContract'->>'executionClass'=${companyRuntimeClass}
      ORDER BY e.task_id, e.created_at DESC, e.id DESC
    ), current_result AS (
      SELECT e.* FROM latest_execution e WHERE e.status IN ('completed', 'failed')
        AND NOT EXISTS (SELECT 1 FROM agent_execution_events r
          WHERE r.workspace_id=${workspaceId}::uuid AND r.execution_id=e.id AND r.type='information_review')
    ), attention AS (
      SELECT 1 AS rank, d.id, 'decision'::text AS kind, d.title, 'pending'::text AS status, 'high'::text AS severity,
        NULL::timestamp AS due_date, revision.created_at AS updated_at
      FROM decisions d JOIN LATERAL (
        SELECT r.created_at FROM decision_revisions r WHERE r.workspace_id=d.workspace_id AND r.decision_id=d.id
        ORDER BY r.version DESC LIMIT 1
      ) revision ON true
      WHERE d.workspace_id=${workspaceId}::uuid AND d.source='roost_decision' AND decision_state(d.id)='pending'
      UNION ALL
      SELECT 2, t.id, 'result', t.title, CASE WHEN e.status='failed' THEN 'failed' ELSE 'review' END,
        CASE WHEN e.status='failed' THEN 'high' ELSE 'medium' END, NULL::timestamp, e.updated_at
      FROM current_result e JOIN tasks t ON t.id=e.task_id AND t.workspace_id=${workspaceId}::uuid
      UNION ALL
      SELECT 3, t.id, 'blocker', t.title, 'blocked', 'high', t.due_date, t.updated_at
      FROM tasks t WHERE t.workspace_id=${workspaceId}::uuid AND t.status='blocked'
        AND NOT EXISTS (SELECT 1 FROM current_result e WHERE e.task_id=t.id)
      UNION ALL
      SELECT 4, c.id, 'incident', c.title, c.status, c.priority, NULL::timestamp, c.updated_at
      FROM company_records c WHERE c.workspace_id=${workspaceId}::uuid AND c.record_type='technical_incident'
        AND c.status IN ('active', 'blocked')
      UNION ALL
      SELECT 5, t.id, 'task', t.title, t.status::text, 'medium', t.due_date, t.updated_at
      FROM tasks t WHERE t.workspace_id=${workspaceId}::uuid AND t.status IN ('todo', 'in_progress')
        AND t.due_date < ${startOfToday()} AND NOT EXISTS (SELECT 1 FROM current_result e WHERE e.task_id=t.id)
      UNION ALL
      SELECT 6, r.id, 'risk', r.name, 'active', r.risk_level::text, NULL::timestamp, r.updated_at
      FROM risks r WHERE r.workspace_id=${workspaceId}::uuid AND r.status='active' AND r.risk_level IN ('high', 'critical')
    )
    SELECT id, kind, title, status, severity, due_date AS "dueDate", updated_at AS "updatedAt"
    FROM attention ORDER BY rank, updated_at DESC, id DESC
    LIMIT ${ATTENTION_PAGE_SIZE + 1} OFFSET ${offset}
  `;
  const items = rows.slice(0, ATTENTION_PAGE_SIZE).map(row => ({
    id: row.id, kind: row.kind, title: row.title, source: row.kind, severity: row.severity,
    status: row.status, dueDate: row.dueDate, updatedAt: row.updatedAt,
    target: row.kind === "decision" ? `/areas?area=01-strategia&view=decisions&decisionId=${row.id}&from=attention`
      : ["result", "blocker", "task"].includes(row.kind) ? `/areas?area=04-operacje&view=tasks&taskId=${row.id}&from=attention`
      : row.kind === "incident" ? `/areas?area=09-technologia&view=incidents&recordId=${row.id}&from=attention`
      : "/areas?area=12-zarzadzanie&view=risks"
  }));
  return { items, hasMore: rows.length > ATTENTION_PAGE_SIZE, nextOffset: offset + items.length };
}

dashboardRouter.get("/attention", asyncHandler(async (req, res) => {
  const raw = req.query.offset;
  const offset = typeof raw === "string" && /^(0|[1-9]\d{0,5})$/.test(raw) ? Number(raw) : 0;
  res.json({ data: await attentionPage(req.auth!.workspaceId, offset) });
}));

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
        eventType: "agent_runtime_config_sync_requested",
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

  // The newest Worker attempt is the only current result for a Task. A review
  // closes that result's attention without changing a provider-owned Task state.
  const attention = await attentionPage(workspaceId, 0);
  const priorityItems = attention.items;

  const interviewCount=(await prisma.$queryRaw<any[]>`SELECT count(*)::int AS count FROM task_interview_cases c WHERE workspace_id=${workspaceId}::uuid AND task_interview_status(c.id) IN ('pending','proposed') AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id)`)[0].count;
  const decisionCount=(await prisma.$queryRaw<any[]>`SELECT count(*)::int AS count FROM decision_revisions WHERE workspace_id=${workspaceId}::uuid AND decision_state(decision_id)='pending'`)[0].count;
  const nextActions = [
    decisionCount>0?{key:"review_decision_impact",label:"Review decision impact",target:"/areas?area=01-strategia&view=decisions",count:decisionCount,priority:"high"}:null,
    interviewCount>0?{key:"resolve_material_questions",label:"Resolve material decision questions",target:"/areas?area=01-strategia&view=decisions",count:interviewCount,priority:"high"}:null,
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
      label: "Deliver pending agent runtime syncs",
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
    } : null,
    ...(await prisma.$queryRaw<any[]>`SELECT v.observation_id AS id,v.application_id AS "applicationId",v.body->>'title' AS title FROM finding_versions v WHERE v.workspace_id=${workspaceId}::uuid AND v.id=(finding_latest(v.observation_id)).id AND ((finding_head(v.observation_id)).state IN ('observed','deduplication_pending','verification_pending','verified','inconclusive','triage_pending') OR (finding_head(v.observation_id)).state='converted_to_task' AND EXISTS(SELECT 1 FROM finding_outputs o WHERE o.observation_id=v.observation_id AND NOT finding_task_current(o.task_id))) AND NOT EXISTS(SELECT 1 FROM finding_outputs o WHERE o.observation_id=v.observation_id AND (o.decision_id IS NOT NULL AND decision_state(o.decision_id)='pending' OR o.interview_id IS NOT NULL AND task_interview_status(o.interview_id) IN ('pending','proposed'))) ORDER BY v.created_at,v.id LIMIT 12`).map(f=>({key:`finding_attention:${f.id}`,label:f.title,target:`/areas?area=11-innowacje&view=portfolio&applicationId=${f.applicationId}&cockpit=evidence&findingId=${f.id}`,count:1,priority:"normal"}))
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
      attentionHasMore: attention.hasMore,
      attentionNextOffset: attention.nextOffset,
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
