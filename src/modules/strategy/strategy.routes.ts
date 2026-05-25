import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { resolveDepartmentEntry } from "../../operating-model/department-registry";

const STRATEGY_DEPARTMENT_KEY = "01-strategia";
const STRATEGY_LIMIT = 12;

function asJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function textMatchesStrategy(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return ["strategy", "strategia", "goal", "target", "kpi", "vision", "positioning", "roadmap", "portfolio", "priority", "decision", "risk"].some((term) => text.includes(term));
}

function taskLooksStrategic(task: { title: string; description: string | null }) {
  return textMatchesStrategy(task.title, task.description);
}

export const strategyRouter = Router();

strategyRouter.get("/context", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const department = resolveDepartmentEntry(STRATEGY_DEPARTMENT_KEY);

  const [
    goals,
    metrics,
    risks,
    decisionLogs,
    decisions,
    knowledgeItems,
    driveFiles,
    tasks,
    counts
  ] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: STRATEGY_LIMIT,
      include: {
        process: true,
        targets: {
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          take: 8,
          include: { metricRef: true, pipeline: true }
        },
        tasks: { orderBy: { updatedAt: "desc" }, take: 8 }
      }
    }),
    prisma.metric.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: STRATEGY_LIMIT,
      include: { ownerRole: true }
    }),
    prisma.risk.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { riskLevel: "desc" }, { updatedAt: "desc" }],
      take: STRATEGY_LIMIT,
      include: { controls: { orderBy: { updatedAt: "desc" }, take: 6 } }
    }),
    prisma.decisionLog.findMany({
      where: { workspaceId },
      orderBy: { decidedAt: "desc" },
      take: STRATEGY_LIMIT
    }),
    prisma.decision.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: STRATEGY_LIMIT
    }),
    prisma.knowledgeItem.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 50
    }),
    prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        trashed: false,
        isFolder: false
      },
      orderBy: [{ modifiedTime: "desc" }, { updatedAt: "desc" }],
      take: 50,
      include: { operatingArea: true }
    }),
    prisma.task.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 50
    }),
    Promise.all([
      prisma.goal.count({ where: { workspaceId } }),
      prisma.goal.count({ where: { workspaceId, status: "active" } }),
      prisma.target.count({ where: { workspaceId } }),
      prisma.target.count({ where: { workspaceId, status: "active" } }),
      prisma.metric.count({ where: { workspaceId, status: "active" } }),
      prisma.risk.count({ where: { workspaceId, status: "active" } }),
      prisma.decisionLog.count({ where: { workspaceId } }),
      prisma.decision.count({ where: { workspaceId, status: "active" } }),
      prisma.task.count({ where: { workspaceId, status: { in: ["todo", "in_progress", "blocked"] } } })
    ])
  ]);

  const strategyKnowledgeItems = knowledgeItems
    .filter((item) => textMatchesStrategy(item.title, item.summary, item.itemType))
    .slice(0, STRATEGY_LIMIT);
  const strategyDriveFiles = driveFiles
    .filter((file) => (
      file.operatingArea?.key === department?.backendAreaKey
      || textMatchesStrategy(file.name, file.description, file.mimeType)
    ))
    .slice(0, STRATEGY_LIMIT);
  const strategicTasks = tasks.filter(taskLooksStrategic).slice(0, STRATEGY_LIMIT);
  const [
    goalCount,
    activeGoalCount,
    targetCount,
    activeTargetCount,
    activeMetricCount,
    activeRiskCount,
    decisionLogCount,
    activeDecisionCount,
    openTaskCount
  ] = counts;

  return res.json({
    data: {
      department: {
        canonicalKey: department?.canonicalKey ?? STRATEGY_DEPARTMENT_KEY,
        backendAreaKey: department?.backendAreaKey ?? "strategy-governance",
        name: "Strategy Management System",
        purpose: "Set company direction through goals, priorities, tradeoffs, metrics, risks, decisions, and strategic follow-up work."
      },
      summary: {
        goals: goalCount,
        activeGoals: activeGoalCount,
        targets: targetCount,
        activeTargets: activeTargetCount,
        activeMetrics: activeMetricCount,
        activeRisks: activeRiskCount,
        decisionLogs: decisionLogCount,
        activeDecisions: activeDecisionCount,
        openTasks: openTaskCount,
        strategicTasks: strategicTasks.length,
        strategyKnowledgeItems: strategyKnowledgeItems.length,
        strategyDriveFiles: strategyDriveFiles.length
      },
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status,
        source: goal.source,
        processId: goal.processId,
        process: goal.process ? {
          id: goal.process.id,
          name: goal.process.name,
          status: goal.process.status,
          category: goal.process.category
        } : null,
        targets: goal.targets.map((target) => ({
          id: target.id,
          title: target.title,
          description: target.description,
          pipelineId: target.pipelineId,
          pipeline: target.pipeline ? {
            id: target.pipeline.id,
            name: target.pipeline.name,
            status: target.pipeline.status,
            triggerType: target.pipeline.triggerType
          } : null,
          metric: target.metric,
          metricId: target.metricId,
          metricRef: target.metricRef ? {
            id: target.metricRef.id,
            name: target.metricRef.name,
            category: target.metricRef.category,
            measurementType: target.metricRef.measurementType,
            unit: target.metricRef.unit,
            status: target.metricRef.status
          } : null,
          targetValue: target.targetValue,
          currentValue: target.currentValue,
          dueDate: target.dueDate?.toISOString() ?? null,
          status: target.status
        })),
        tasks: goal.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null
        }))
      })),
      metrics: metrics.map((metric) => ({
        id: metric.id,
        name: metric.name,
        category: metric.category,
        description: metric.description,
        measurementType: metric.measurementType,
        unit: metric.unit,
        targetValue: metric.targetValue,
        currentValue: metric.currentValue,
        ownerRole: metric.ownerRole?.name ?? null,
        status: metric.status
      })),
      risks: risks.map((risk) => ({
        id: risk.id,
        name: risk.name,
        description: risk.description,
        category: risk.category,
        riskLevel: risk.riskLevel,
        likelihood: risk.likelihood,
        impact: risk.impact,
        status: risk.status,
        controls: risk.controls.map((control) => ({
          id: control.id,
          name: control.name,
          controlType: control.controlType,
          verificationMethod: control.verificationMethod,
          status: control.status
        }))
      })),
      decisionLogs: decisionLogs.map((decisionLog) => ({
        id: decisionLog.id,
        context: decisionLog.context,
        optionsConsidered: asJsonArray(decisionLog.optionsConsidered),
        chosenOption: decisionLog.chosenOption,
        reason: decisionLog.reason,
        decidedByType: decisionLog.decidedByType,
        consequences: decisionLog.consequences,
        reviewDate: decisionLog.reviewDate?.toISOString() ?? null,
        decidedAt: decisionLog.decidedAt.toISOString()
      })),
      decisions: decisions.map((decision) => ({
        id: decision.id,
        title: decision.title,
        rationale: decision.rationale,
        outcome: decision.outcome,
        status: decision.status,
        source: decision.source
      })),
      knowledgeItems: strategyKnowledgeItems.map((item) => ({
        id: item.id,
        title: item.title,
        itemType: item.itemType,
        summary: item.summary,
        sourceProvider: item.sourceProvider,
        url: item.url,
        status: item.status
      })),
      driveFiles: strategyDriveFiles.map((file) => ({
        id: file.id,
        name: file.name,
        description: file.description,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        operatingAreaKey: file.operatingArea?.key ?? null,
        modifiedTime: file.modifiedTime?.toISOString() ?? null
      })),
      tasks: strategicTasks.map((task) => ({
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
          "Compare active goals with current targets before proposing new work.",
          "Use decision logs and risks as constraints for Paperclip task planning.",
          "Convert strategic gaps into task proposals through existing task routes only when authorized.",
          "Request owner review before changing priorities, pricing assumptions, or portfolio direction."
        ],
        allowedActions: [
          "read_strategy_context",
          "inspect_goal",
          "inspect_target",
          "inspect_metric",
          "inspect_risk",
          "inspect_decision",
          "propose_strategy_follow_up"
        ],
        blockedActions: [
          {
            action: "create_or_change_strategy",
            reason: "Strategic direction changes require an explicit owner-approved command contract."
          },
          {
            action: "change_goal_or_target",
            reason: "Goal and target writes must use existing CRUD routes with proper write capability or a future strategy command."
          },
          {
            action: "decide_portfolio_tradeoff",
            reason: "Portfolio tradeoffs are owner decisions until a supervised decision command exists."
          },
          {
            action: "execute_strategy_without_review",
            reason: "Agents may propose follow-up work, but autonomous execution requires separate task and approval authority."
          }
        ]
      }
    }
  });
}));
