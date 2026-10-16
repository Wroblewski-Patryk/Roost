import { Router } from "express";
import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { companyRuntimeClass } from "../agent-runtime/company-information-runtime";
import { requireWorkspaceRole } from "../../auth/workspace-access";
import { retryContextRead } from "../agent-runtime/context-read-retry";
import { readyTransaction } from "../agent-runtime/task-execution-readiness";
import { authorityState, decisionAuthority } from "../decisions/decision-authority";
import { reviewDigest } from "../agent-runtime/task-review-contract";

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

function briefContext(value: string | null | undefined) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 360) : null;
}

export const dashboardRouter = Router();

const ATTENTION_PAGE_SIZE = 25;
type AttentionRow = { id: string; kind: "decision" | "result" | "blocker" | "incident" | "task" | "risk"; title: string; status: string; severity: string; dueDate: Date | null; updatedAt: Date; executionId: string | null; totalCount: bigint; decisionCount: bigint };
type DecisionAttentionReason = "decision_pending" | "decision_authority_blocked" | "decision_impact_stale" | "decision_agent_admission_required";
type DecisionAttentionAuthority = { responsible: string | null; reason: DecisionAttentionReason };

async function decisionAttentionAuthorities(workspaceId: string, ids: string[], ownerName: string | null) {
  if (!ids.length) return new Map<string, DecisionAttentionAuthority>();
  const resolved = await retryContextRead(() => readyTransaction(async db => {
    const revisions = await db.$queryRaw<Array<{ decisionId: string; body: any; impact: any; previewId: string | null; previewImpact: any; previewAuthority: any }>>`
      SELECT r.decision_id AS "decisionId", r.body,
        decision_current_impact(r.workspace_id, r.body->'scope') AS impact,
        p.id AS "previewId", p.impact AS "previewImpact", p.authority AS "previewAuthority"
      FROM decision_revisions r
      LEFT JOIN LATERAL (
        SELECT p.id, p.impact, p.authority FROM decision_impact_previews p
        WHERE p.decision_id=r.decision_id ORDER BY p.version DESC LIMIT 1
      ) p ON true
      WHERE r.workspace_id=${workspaceId}::uuid
        AND r.decision_id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`;
    const catalog = await authorityState(db, workspaceId, true);
    const names = new Map(catalog.labels.map(label => [label.id, label.name]));
    const result: Array<[string, DecisionAttentionAuthority]> = [];
    for (const revision of revisions) {
      const authority = await decisionAuthority(db, workspaceId, revision.body, revision.impact, catalog);
      if (authority.status === "blocked" || !authority.principal) {
        result.push([revision.decisionId, { responsible: ownerName, reason: "decision_authority_blocked" }]);
        continue;
      }
      if (!revision.previewId || !revision.impact || reviewDigest(revision.impact) !== reviewDigest(revision.previewImpact)
        || (revision.previewAuthority && reviewDigest(authority) !== reviewDigest(revision.previewAuthority))) {
        result.push([revision.decisionId, { responsible: ownerName, reason: "decision_impact_stale" }]);
        continue;
      }
      const principal = authority.principal;
      if (principal.kind === "agent") {
        const taskIds: string[] = revision.impact.taskIds ?? [];
        if (!taskIds.length || taskIds.length > 200 || new Set(taskIds).size !== taskIds.length) {
          result.push([revision.decisionId, { responsible: ownerName, reason: "decision_agent_admission_required" }]);
          continue;
        }
        const grants = await db.$queryRaw<Array<{ taskId: string; credentialId: string }>>`
          SELECT g.task_id AS "taskId", g.credential_id AS "credentialId" FROM task_capability_grants g
          WHERE g.workspace_id=${workspaceId}::uuid AND g.agent_id=${principal.id}::uuid
            AND g.operation='decision_supersede'
            AND g.snapshot->'decision'=jsonb_build_object('decisionId',${revision.decisionId}::uuid,'previewId',${revision.previewId}::uuid)
            AND task_capability_status(g)='active'`;
        const credentialTasks = new Map<string, Set<string>>();
        for (const grant of grants) {
          if (!credentialTasks.has(grant.credentialId)) credentialTasks.set(grant.credentialId, new Set());
          credentialTasks.get(grant.credentialId)!.add(grant.taskId);
        }
        if (![...credentialTasks.values()].some(tasks => taskIds.every(id => tasks.has(id)))) {
          result.push([revision.decisionId, { responsible: ownerName, reason: "decision_agent_admission_required" }]);
          continue;
        }
      }
      const worker = catalog.workers.find(item => item.principal?.kind === principal.kind && item.principal.id === principal.id);
      const responsible = principal.kind === "user" && principal.id === catalog.ownerUserId ? ownerName : names.get(worker?.id ?? "") ?? null;
      result.push([revision.decisionId, {
        responsible: responsible ?? ownerName,
        reason: responsible ? "decision_pending" : "decision_authority_blocked"
      }]);
    }
    return result;
  }, { readOnly: true }));
  if (!Array.isArray(resolved)) throw new Error("decision_attention_authority_unavailable");
  return new Map(resolved);
}

async function attentionPage(workspaceId: string, offset: number) {
  const rows = await prisma.$queryRaw<AttentionRow[]>`
    WITH latest_execution AS (
      SELECT DISTINCT ON (e.task_id) e.id, e.task_id, e.status::text AS status, e.updated_at
      FROM agent_executions e
      WHERE e.workspace_id=${workspaceId}::uuid AND e.application_id IS NULL
        AND e.metadata->'executionContract'->>'executionClass'=${companyRuntimeClass}
      ORDER BY e.task_id, e.created_at DESC, e.id DESC
    ), current_result AS (
      SELECT e.*, EXISTS (SELECT 1 FROM task_review_decisions r
        WHERE r.workspace_id=${workspaceId}::uuid AND r.execution_id=e.id
          AND r.decision='approve' AND r.actor_agent_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM information_owner_decisions o
            WHERE o.workspace_id=r.workspace_id AND o.execution_id=e.id)) AS owner_pending
      FROM latest_execution e WHERE e.status IN ('completed', 'failed')
        AND NOT EXISTS (SELECT 1 FROM agent_execution_events r
          WHERE r.workspace_id=${workspaceId}::uuid AND r.execution_id=e.id AND r.type='information_review')
        AND NOT EXISTS (SELECT 1 FROM task_review_decisions r
          WHERE r.workspace_id=${workspaceId}::uuid AND r.execution_id=e.id
            AND ((r.decision='approve' AND (r.actor_agent_id IS NULL OR EXISTS
              (SELECT 1 FROM information_owner_decisions o WHERE o.workspace_id=r.workspace_id AND o.execution_id=e.id)))
              OR EXISTS (SELECT 1 FROM task_review_actions a
              WHERE a.workspace_id=r.workspace_id AND a.review_id=r.id AND a.action='return_to_executor')))
    ), attention AS (
      SELECT 1 AS rank, d.id, 'decision'::text AS kind, d.title, 'pending'::text AS status, 'high'::text AS severity,
        NULL::timestamp AS due_date, revision.created_at AS updated_at, NULL::uuid AS execution_id
      FROM decisions d JOIN LATERAL (
        SELECT r.created_at, r.body FROM decision_revisions r WHERE r.workspace_id=d.workspace_id AND r.decision_id=d.id
        ORDER BY r.version DESC LIMIT 1
      ) revision ON true
      WHERE d.workspace_id=${workspaceId}::uuid AND d.source='roost_decision' AND decision_state(d.id)='pending'
        AND d.status NOT IN ('archived', 'rejected', 'superseded')
        AND (
          revision.body->'workerCredential' IS NULL OR (
            (revision.body->'workerCredential'->>'validUntil')::timestamptz > now()
            AND (revision.body->'workerCredential'->'handoff' IS NULL OR EXISTS (
              SELECT 1 FROM worker_credential_handoffs h
              WHERE h.workspace_id=d.workspace_id
                AND h.id::text=revision.body->'workerCredential'->'handoff'->>'requestId'
                AND h.state='requested' AND h.expires_at>now()
            ))
          )
        )
      UNION ALL
      SELECT 2, t.id, 'result', t.title, CASE WHEN e.status='failed' THEN 'failed' WHEN e.owner_pending THEN 'owner_pending' ELSE 'review' END,
        CASE WHEN e.status='failed' THEN 'high' ELSE 'medium' END, NULL::timestamp, e.updated_at, e.id
      FROM current_result e JOIN tasks t ON t.id=e.task_id AND t.workspace_id=${workspaceId}::uuid
        AND t.status IN ('todo', 'in_progress', 'blocked')
      UNION ALL
      SELECT 3, t.id, 'blocker', t.title, 'blocked', 'high', t.due_date, t.updated_at, NULL::uuid
      FROM tasks t WHERE t.workspace_id=${workspaceId}::uuid AND t.status='blocked'
        AND NOT EXISTS (SELECT 1 FROM current_result e WHERE e.task_id=t.id)
      UNION ALL
      SELECT 5, c.id, 'incident', c.title, c.status, c.priority, NULL::timestamp, c.updated_at, NULL::uuid
      FROM company_records c WHERE c.workspace_id=${workspaceId}::uuid AND c.record_type='technical_incident'
        AND c.status='blocked'
      UNION ALL
      SELECT 4, t.id, 'task', t.title, t.status::text, 'medium', t.due_date, t.updated_at, NULL::uuid
      FROM tasks t WHERE t.workspace_id=${workspaceId}::uuid AND t.status IN ('todo', 'in_progress')
        AND t.due_date < ${startOfToday()} AND NOT EXISTS (SELECT 1 FROM current_result e WHERE e.task_id=t.id)
    )
    SELECT id, kind, title, status, severity, due_date AS "dueDate", updated_at AS "updatedAt", execution_id AS "executionId",
      count(*) OVER() AS "totalCount", count(*) FILTER (WHERE kind='decision') OVER() AS "decisionCount"
    FROM attention ORDER BY rank, updated_at DESC, id DESC
    LIMIT ${ATTENTION_PAGE_SIZE + 1} OFFSET ${offset}
  `;
  const pageRows = rows.slice(0, ATTENTION_PAGE_SIZE);
  const taskIds = pageRows.filter(row => ["result", "blocker", "task"].includes(row.kind)).map(row => row.id);
  const decisionIds = pageRows.filter(row => row.kind === "decision").map(row => row.id);
  const incidentIds = pageRows.filter(row => row.kind === "incident").map(row => row.id);
  const executionIds = pageRows.filter(row => row.kind === "result" && row.executionId).map(row => row.executionId!);
  const [tasks, decisions, incidents, executions, workspace] = await Promise.all([
    prisma.task.findMany({ where: { workspaceId, id: { in: taskIds } }, select: {
      id: true, source: true, description: true, project: { select: { name: true } }, goal: { select: { title: true } },
      ownerUser: { select: { name: true } },
      assignedWorkforceEntity: { select: { name: true } }
    } }),
    prisma.decision.findMany({ where: { workspaceId, id: { in: decisionIds } }, select: {
      id: true, source: true, problem: true, context: true, rationale: true, project: { select: { name: true } }
    } }),
    prisma.companyRecord.findMany({ where: { workspaceId, id: { in: incidentIds } }, select: {
      id: true, source: true, description: true
    } }),
    prisma.agentExecution.findMany({ where: { workspaceId, id: { in: executionIds } },
      select: { taskId: true, metadata: true } }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { owner: { select: { name: true } } } })
  ]);
  const verifierIds = executions.map(execution => {
    const metadata = execution.metadata as Record<string, any> | null;
    return metadata?.executionContract?.taskRoles?.verifier?.id;
  }).filter((id): id is string => typeof id === "string");
  const managerIds = executions.map(execution => {
    const metadata = execution.metadata as Record<string, any> | null;
    return metadata?.executionContract?.taskRoles?.accountableManager?.id;
  }).filter((id): id is string => typeof id === "string");
  const verifiers = await prisma.workforceEntity.findMany({ where: { workspaceId, id: { in: [...verifierIds, ...managerIds] } }, select: { id: true, name: true } });
  const verifierById = new Map(verifiers.map(verifier => [verifier.id, verifier.name]));
  const verifierByTask = new Map<string, string | null>();
  const managerByTask = new Map<string, string | null>();
  for (const execution of executions) {
    const metadata = execution.metadata as Record<string, any> | null;
    if (!verifierByTask.has(execution.taskId)) verifierByTask.set(execution.taskId, verifierById.get(metadata?.executionContract?.taskRoles?.verifier?.id) ?? null);
    if (!managerByTask.has(execution.taskId)) managerByTask.set(execution.taskId, verifierById.get(metadata?.executionContract?.taskRoles?.accountableManager?.id) ?? null);
  }
  const taskById = new Map(tasks.map(task => [task.id, task]));
  const decisionById = new Map(decisions.map(decision => [decision.id, decision]));
  const incidentById = new Map(incidents.map(incident => [incident.id, incident]));
  const decisionAuthorities = await decisionAttentionAuthorities(workspaceId, decisionIds, workspace?.owner.name ?? null);
  const items = pageRows.map(row => ({
    id: row.id, kind: row.kind, title: row.title, source: row.kind, severity: row.severity,
    status: row.status, dueDate: row.dueDate, updatedAt: row.updatedAt,
    reason: row.kind === "decision" ? decisionAuthorities.get(row.id)?.reason ?? "decision_authority_blocked" : row.kind === "result" ? row.status === "failed" ? "result_failed" : row.status === "owner_pending" ? "result_owner_pending" : "result_review"
      : row.kind === "blocker" ? "task_blocked" : row.kind === "task" ? "task_overdue"
      : row.kind === "incident" ? "incident_blocked" : "risk_high",
    context: briefContext(taskById.get(row.id)?.description ?? decisionById.get(row.id)?.problem
      ?? decisionById.get(row.id)?.context ?? decisionById.get(row.id)?.rationale
      ?? incidentById.get(row.id)?.description),
    responsible: row.kind === "decision" ? decisionAuthorities.get(row.id)?.responsible ?? null
      : row.kind === "result" && row.status === "owner_pending" ? workspace?.owner.name ?? null
      : row.kind === "result" && row.status === "review" ? verifierByTask.get(row.id) ?? null
      : row.kind === "result" && row.status === "failed" ? managerByTask.get(row.id) ?? null
      : row.kind === "result" ? null
      : taskById.get(row.id)?.ownerUser?.name ?? taskById.get(row.id)?.assignedWorkforceEntity?.name ?? null,
    related: taskById.get(row.id)?.project?.name ?? taskById.get(row.id)?.goal?.title
      ?? decisionById.get(row.id)?.project?.name ?? null,
    provenance: taskById.get(row.id)?.source ?? decisionById.get(row.id)?.source ?? incidentById.get(row.id)?.source ?? null,
    provenanceConfirmed: false,
    target: row.kind === "decision" ? `/areas?area=01-strategia&view=decisions&decisionId=${row.id}&from=attention`
      : row.kind === "result" && row.executionId ? `/areas?area=04-operacje&view=tasks&taskId=${row.id}&executionId=${row.executionId}&from=attention`
      : ["result", "blocker", "task"].includes(row.kind) ? `/areas?area=04-operacje&view=tasks&taskId=${row.id}&from=attention`
      : row.kind === "incident" ? `/areas?area=09-technologia&view=incidents&recordId=${row.id}&from=attention`
      : `/areas?area=12-zarzadzanie&view=risks&recordId=${row.id}&from=attention`
  }));
  return { items, totalCount: Number(rows[0]?.totalCount ?? 0), decisionCount: Number(rows[0]?.decisionCount ?? 0), hasMore: rows.length > ATTENTION_PAGE_SIZE, nextOffset: offset + items.length };
}

dashboardRouter.get("/attention", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
  const raw = req.query.offset;
  const offset = typeof raw === "string" && /^(0|[1-9]\d{0,5})$/.test(raw) ? Number(raw) : 0;
  res.json({ data: await attentionPage(req.auth!.workspaceId, offset) });
}));

dashboardRouter.get("/command", asyncHandler(async (req, res) => {
  if (!requireWorkspaceRole(req, res, "owner")) return;
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

  // The newest Worker attempt is the only current result for a Task. Agent
  // verification stays visible until the separate owner decision is recorded.
  const attention = await attentionPage(workspaceId, 0);
  const priorityItems = attention.items;

  const interviewCount=(await prisma.$queryRaw<any[]>`SELECT count(*)::int AS count FROM task_interview_cases c WHERE workspace_id=${workspaceId}::uuid AND task_interview_status(c.id) IN ('pending','proposed') AND NOT EXISTS(SELECT 1 FROM task_interview_cases n WHERE n.supersedes_id=c.id)`)[0].count;
  const decisionCount=attention.decisionCount;
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
      attentionTotal: attention.totalCount,
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
