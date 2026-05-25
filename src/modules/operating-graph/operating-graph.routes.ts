import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../middleware/async-handler";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";
import { normalizeDepartmentKey, resolveDepartmentBackendAreaKey, resolveDepartmentEntry } from "../../operating-model/department-registry";

const querySchema = z.object({
  include: z.string().trim().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
}).strict();

type EdgeConfidence = "direct" | "owner_assigned" | "route_inferred" | "provider_hierarchy" | "content_inferred" | "needs_review" | "unsupported";

type GraphNode = {
  id: string;
  type: string;
  label: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  confidence: EdgeConfidence;
  sourceModel: string;
  sourceField: string;
  actionHint?: {
    label: string;
    method: string;
    path: string;
  };
  evidence: Array<{
    model: string;
    id: string;
    field: string;
    value?: unknown;
  }>;
};

type GraphGap = {
  id: string;
  severity: "info" | "warning" | "critical";
  layer: "goals" | "workflows" | "tasks" | "knowledge" | "sources";
  nodeId?: string;
  title: string;
  detail: string;
  actionHint?: {
    label: string;
    method: string;
    path: string;
  };
  evidence: Array<{
    model: string;
    id: string;
    field: string;
    value?: unknown;
  }>;
};

type LayerKey = "goals" | "workflows" | "tasks" | "knowledge" | "sources";

export const operatingGraphRouter = Router();

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function graphId(type: string, id: string) {
  return `${type}:${id}`;
}

function linkTargetGraphId(targetType: string, targetId: string) {
  switch (targetType) {
    case "goal":
    case "target":
    case "metric":
    case "process":
    case "pipeline":
    case "task":
    case "operating_area":
    case "operating_table":
      return graphId(targetType, targetId);
    default:
      return null;
  }
}

function addNode(nodes: Map<string, GraphNode>, layers: Record<LayerKey, string[]>, layer: LayerKey | null, node: GraphNode) {
  nodes.set(node.id, node);
  if (layer && !layers[layer].includes(node.id)) {
    layers[layer].push(node.id);
  }
}

function addEdge(edges: GraphEdge[], edge: GraphEdge) {
  if (!edges.some((existing) => existing.id === edge.id)) {
    edges.push(edge);
  }
}

function evidence(model: string, id: string, field: string, value?: unknown) {
  return [{ model, id, field, value }];
}

function actionHint(label: string, method: string, path: string) {
  return { label, method, path };
}

function safeText(value: string | null | undefined, fallback = "") {
  return value?.trim() || fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function matchesAreaText(area: { key: string; name: string }, ...values: Array<string | null | undefined>) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  const tokens = [area.key, area.name, ...area.name.split(/\s+/)].map((value) => value.toLowerCase()).filter((value) => value.length > 3);
  return tokens.some((token) => haystack.includes(token));
}

operatingGraphRouter.get("/areas/:areaKey", asyncHandler(async (req, res) => {
  const input = querySchema.parse(req.query);
  const limit = input.limit ?? 100;
  const workspaceId = req.auth!.workspaceId;
  await ensureOperatingModelForWorkspace(prisma, workspaceId);

  const requestedKey = normalizeDepartmentKey(String(req.params.areaKey));
  const departmentEntry = resolveDepartmentEntry(requestedKey);
  const canonicalRequestKey = departmentEntry?.canonicalKey ?? requestedKey;
  const resolvedKey = resolveDepartmentBackendAreaKey(requestedKey);
  const positionMatch = /^(\d{2})-/.exec(requestedKey);
  const requestedPosition = positionMatch ? Number(positionMatch[1]) : null;

  const areaIncludes = {
    folders: { orderBy: { name: "asc" as const } },
    tables: { orderBy: { apiSlug: "asc" as const } }
  };

  const area = await prisma.operatingArea.findFirst({
    where: {
      workspaceId,
      key: { in: [...new Set([resolvedKey, requestedKey])] }
    },
    include: areaIncludes
  }) ?? (requestedPosition === null ? null : await prisma.operatingArea.findFirst({
    where: {
      workspaceId,
      position: requestedPosition
    },
    include: areaIncludes
  }));

  if (!area) {
    return res.status(404).json({ error: "not_found" });
  }

  const areaTableIds = new Set(area.tables.map((table) => table.id));
  const areaFolderIds = new Set(area.folders.map((folder) => folder.id));
  const areaTableSlugs = new Set(area.tables.map((table) => table.apiSlug));
  const layers: Record<LayerKey, string[]> = {
    goals: [],
    workflows: [],
    tasks: [],
    knowledge: [],
    sources: []
  };
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const gaps: GraphGap[] = [];
  const reviewItems: GraphGap[] = [];

  const areaNodeId = graphId("operating_area", area.id);
  addNode(nodes, layers, "sources", {
    id: areaNodeId,
    type: "operating_area",
    label: area.name,
    summary: area.description,
    metadata: {
      key: area.key,
      canonicalRequestKey: requestedKey,
      resolvedKey,
      position: area.position,
      isSystem: area.isSystem
    }
  });

  for (const folder of area.folders) {
    const folderNodeId = graphId("operating_folder", folder.id);
    addNode(nodes, layers, "sources", {
      id: folderNodeId,
      type: "operating_folder",
      label: folder.name,
      summary: folder.description,
      metadata: { key: folder.key, source: folder.source, externalId: folder.externalId }
    });
    addEdge(edges, {
      id: `area:${area.id}->folder:${folder.id}`,
      from: areaNodeId,
      to: folderNodeId,
      label: "contains folder",
      confidence: "direct",
      sourceModel: "OperatingFolder",
      sourceField: "areaId",
      evidence: evidence("OperatingFolder", folder.id, "areaId", folder.areaId)
    });
  }

  for (const table of area.tables) {
    const tableNodeId = graphId("operating_table", table.id);
    addNode(nodes, layers, "sources", {
      id: tableNodeId,
      type: "operating_table",
      label: table.name,
      summary: table.description ?? table.apiSlug,
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
      sourceField: "areaId",
      evidence: evidence("OperatingTable", table.id, "areaId", table.areaId)
    });
    if (table.folderId) {
      addEdge(edges, {
        id: `folder:${table.folderId}->table:${table.id}`,
        from: graphId("operating_folder", table.folderId),
        to: tableNodeId,
        label: "contains table",
        confidence: "direct",
        sourceModel: "OperatingTable",
        sourceField: "folderId",
        evidence: evidence("OperatingTable", table.id, "folderId", table.folderId)
      });
    }
  }

  const shouldLoadAllGoals = areaTableSlugs.has("goals");
  const shouldLoadAllTargets = areaTableSlugs.has("targets") || shouldLoadAllGoals;
  const shouldLoadAllTasks = areaTableSlugs.has("tasks");
  const shouldLoadAllTaskLists = areaTableSlugs.has("task-lists") || shouldLoadAllTasks;
  const shouldLoadAllProcesses = areaTableSlugs.has("processes");
  const shouldLoadAllPipelines = areaTableSlugs.has("pipelines") || areaTableSlugs.has("pipeline-runs");
  const shouldLoadAllMetrics = areaTableSlugs.has("metrics");
  const shouldLoadAllKnowledge = areaTableSlugs.has("knowledge-items");

  const [
    goals,
    targets,
    taskLists,
    tasks,
    processes,
    pipelines,
    pipelineRuns,
    pipelineRunTaskLinks,
    metrics,
    knowledgeItems,
    knowledgeLinks,
    driveFiles,
    externalMappings,
    storageLocations,
    knowledgeRoots
  ] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId, ...(shouldLoadAllGoals ? {} : { id: EMPTY_UUID }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { targets: true, tasks: true, project: true, process: true }
    }),
    prisma.target.findMany({
      where: { workspaceId, ...(shouldLoadAllTargets ? {} : { id: EMPTY_UUID }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { goal: true, tasks: true, metricRef: true, pipeline: true }
    }),
    prisma.taskList.findMany({
      where: { workspaceId, ...(shouldLoadAllTaskLists ? {} : { id: EMPTY_UUID }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { tasks: true, project: true }
    }),
    prisma.task.findMany({
      where: { workspaceId, ...(shouldLoadAllTasks ? {} : { id: EMPTY_UUID }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { goal: true, target: true, taskList: true, project: true }
    }),
    prisma.process.findMany({
      where: { workspaceId, ...(shouldLoadAllProcesses ? {} : { department: { contains: area.name, mode: "insensitive" } }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { pipelines: true, metrics: true, knowledgeItems: true }
    }),
    prisma.pipeline.findMany({
      where: { workspaceId, ...(shouldLoadAllPipelines ? {} : { process: { department: { contains: area.name, mode: "insensitive" } } }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { process: true, stages: { orderBy: { position: "asc" } }, metrics: true, knowledgeItems: true, runs: { take: 10, orderBy: { createdAt: "desc" } } }
    }),
    prisma.pipelineRun.findMany({
      where: { workspaceId, ...(areaTableSlugs.has("pipeline-runs") ? {} : { pipeline: { process: { department: { contains: area.name, mode: "insensitive" } } } }) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { pipeline: true, currentStage: true }
    }),
    prisma.pipelineRunTaskLink.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit * 3
    }),
    prisma.metric.findMany({
      where: { workspaceId, ...(shouldLoadAllMetrics ? {} : { OR: [{ process: { department: { contains: area.name, mode: "insensitive" } } }, { pipeline: { process: { department: { contains: area.name, mode: "insensitive" } } } }] }) },
      orderBy: { name: "asc" },
      take: limit,
      include: { process: true, pipeline: true }
    }),
    prisma.knowledgeItem.findMany({
      where: { workspaceId, ...(shouldLoadAllKnowledge ? {} : { OR: [{ process: { department: { contains: area.name, mode: "insensitive" } } }, { pipeline: { process: { department: { contains: area.name, mode: "insensitive" } } } }] }) },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { process: true, pipeline: true, project: true, client: true, agent: true }
    }),
    prisma.knowledgeLink.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit * 3
    }),
    prisma.googleDriveFile.findMany({
      where: {
        workspaceId,
        OR: [
          { operatingAreaId: area.id },
          { operatingFolderId: { in: [...areaFolderIds] } },
          { operatingTableId: { in: [...areaTableIds] } },
          { storageLocation: { areaId: area.id } },
          { knowledgeRoot: { areaId: area.id } }
        ]
      },
      orderBy: [{ isFolder: "desc" }, { name: "asc" }],
      take: limit,
      include: { contentSnapshots: { orderBy: { createdAt: "desc" }, take: 1 } }
    }),
    prisma.externalContainerMapping.findMany({
      where: {
        workspaceId,
        OR: [
          { areaId: area.id },
          { folderId: { in: [...areaFolderIds] } },
          { tableId: { in: [...areaTableIds] } }
        ]
      },
      orderBy: [{ provider: "asc" }, { entityType: "asc" }, { name: "asc" }],
      take: limit
    }),
    prisma.storageLocation.findMany({
      where: {
        workspaceId,
        OR: [
          { areaId: area.id },
          { folderId: { in: [...areaFolderIds] } },
          { tableId: { in: [...areaTableIds] } }
        ]
      },
      orderBy: { name: "asc" },
      take: limit
    }),
    prisma.knowledgeRoot.findMany({
      where: {
        workspaceId,
        OR: [
          { areaId: area.id },
          { folderId: { in: [...areaFolderIds] } },
          { tableId: { in: [...areaTableIds] } }
        ]
      },
      orderBy: { name: "asc" },
      take: limit
    })
  ]);

  const goalIds = new Set(goals.map((goal) => goal.id));
  const targetIds = new Set(targets.map((target) => target.id));
  const linkedTaskWhere = (goalIds.size > 0 || targetIds.size > 0)
    ? await prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          ...(goalIds.size ? [{ goalId: { in: [...goalIds] } }] : []),
          ...(targetIds.size ? [{ targetId: { in: [...targetIds] } }] : [])
        ]
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { goal: true, target: true, taskList: true, project: true }
    })
    : [];
  const allTasks = [...tasks, ...linkedTaskWhere].filter((task, index, array) => array.findIndex((item) => item.id === task.id) === index);

  const processIds = new Set(processes.map((process) => process.id));
  const pipelineIds = new Set(pipelines.map((pipeline) => pipeline.id));
  for (const metric of metrics) {
    if (metric.processId) {
      processIds.add(metric.processId);
    }
    if (metric.pipelineId) {
      pipelineIds.add(metric.pipelineId);
    }
  }
  for (const item of knowledgeItems) {
    if (item.processId) {
      processIds.add(item.processId);
    }
    if (item.pipelineId) {
      pipelineIds.add(item.pipelineId);
    }
  }

  for (const goal of goals) {
    const id = graphId("goal", goal.id);
    addNode(nodes, layers, "goals", {
      id,
      type: "goal",
      label: goal.title,
      summary: goal.description,
      metadata: { status: goal.status, source: goal.source, projectId: goal.projectId }
    });
    if (goal.processId) {
      addEdge(edges, {
        id: `goal:${goal.id}->process:${goal.processId}`,
        from: id,
        to: graphId("process", goal.processId),
        label: "owned by process",
        confidence: "direct",
        sourceModel: "Goal",
        sourceField: "processId",
        evidence: evidence("Goal", goal.id, "processId", goal.processId)
      });
    }
    const goalTable = area.tables.find((table) => table.apiSlug === "goals");
    if (goalTable) {
      addEdge(edges, {
        id: `table:${goalTable.id}->goal:${goal.id}`,
        from: graphId("operating_table", goalTable.id),
        to: id,
        label: "serves goal record",
        confidence: "route_inferred",
        sourceModel: "OperatingTable",
        sourceField: "apiSlug",
        evidence: evidence("OperatingTable", goalTable.id, "apiSlug", "goals")
      });
    }
    if (goal.targets.length === 0) {
      gaps.push({
        id: `gap:goal:${goal.id}:target`,
        severity: "warning",
        layer: "goals",
        nodeId: id,
        title: "Goal has no target",
        detail: `${goal.title} needs at least one measurable target before the area can show progress.`,
        actionHint: actionHint("Create target", "POST", "/v1/targets"),
        evidence: evidence("Goal", goal.id, "targets", 0)
      });
    }
    if (!goal.processId) {
      gaps.push({
        id: `gap:goal:${goal.id}:process`,
        severity: "warning",
        layer: "workflows",
        nodeId: id,
        title: "Goal has no process link",
        detail: `${goal.title} should be linked to the process that owns its execution domain.`,
        actionHint: actionHint("Update goal", "PATCH", `/v1/goals/${goal.id}`),
        evidence: evidence("Goal", goal.id, "processId", goal.processId)
      });
    }
  }

  for (const target of targets) {
    const id = graphId("target", target.id);
    addNode(nodes, layers, "goals", {
      id,
      type: "target",
      label: target.title,
      summary: target.description,
      metadata: {
        status: target.status,
        pipelineId: target.pipelineId,
        metric: target.metric,
        metricId: target.metricId,
        targetValue: target.targetValue,
        currentValue: target.currentValue,
        dueDate: target.dueDate
      }
    });
    const targetTable = area.tables.find((table) => table.apiSlug === "targets");
    if (targetTable) {
      addEdge(edges, {
        id: `table:${targetTable.id}->target:${target.id}`,
        from: graphId("operating_table", targetTable.id),
        to: id,
        label: "serves target record",
        confidence: "route_inferred",
        sourceModel: "OperatingTable",
        sourceField: "apiSlug",
        evidence: evidence("OperatingTable", targetTable.id, "apiSlug", "targets")
      });
    }
    if (target.goalId) {
      addEdge(edges, {
        id: `goal:${target.goalId}->target:${target.id}`,
        from: graphId("goal", target.goalId),
        to: id,
        label: "measured by target",
        confidence: "direct",
        sourceModel: "Target",
        sourceField: "goalId",
        evidence: evidence("Target", target.id, "goalId", target.goalId)
      });
    }
    if (target.metricId && target.metricRef) {
      addEdge(edges, {
        id: `target:${target.id}->metric:${target.metricRef.id}`,
        from: id,
        to: graphId("metric", target.metricRef.id),
        label: "tracks metric",
        confidence: "direct",
        sourceModel: "Target",
        sourceField: "metricId",
        evidence: evidence("Target", target.id, "metricId", target.metricId)
      });
    }
    if (target.pipelineId) {
      addEdge(edges, {
        id: `pipeline:${target.pipelineId}->target:${target.id}`,
        from: graphId("pipeline", target.pipelineId),
        to: id,
        label: "moves target",
        confidence: "direct",
        sourceModel: "Target",
        sourceField: "pipelineId",
        evidence: evidence("Target", target.id, "pipelineId", target.pipelineId)
      });
    }
    if (!target.metric && !target.metricId) {
      gaps.push({
        id: `gap:target:${target.id}:metric`,
        severity: "warning",
        layer: "goals",
        nodeId: id,
        title: "Target has no metric label",
        detail: `${target.title} needs a metric name or future metric relation before KPI progress is reliable.`,
        actionHint: actionHint("Update target", "PATCH", `/v1/targets/${target.id}`),
        evidence: evidence("Target", target.id, "metric|metricId", { metric: target.metric, metricId: target.metricId })
      });
    }
    if (!target.pipelineId) {
      gaps.push({
        id: `gap:target:${target.id}:pipeline`,
        severity: "warning",
        layer: "workflows",
        nodeId: id,
        title: "Target has no pipeline link",
        detail: `${target.title} should point to a pipeline to prove how execution moves this target.`,
        actionHint: actionHint("Update target", "PATCH", `/v1/targets/${target.id}`),
        evidence: evidence("Target", target.id, "pipelineId", target.pipelineId)
      });
    }
  }

  for (const metric of metrics) {
    const id = graphId("metric", metric.id);
    addNode(nodes, layers, "goals", {
      id,
      type: "metric",
      label: metric.name,
      summary: metric.description,
      metadata: {
        category: metric.category,
        measurementType: metric.measurementType,
        unit: metric.unit,
        targetValue: metric.targetValue,
        currentValue: metric.currentValue,
        status: metric.status
      }
    });
    if (metric.processId) {
      addEdge(edges, {
        id: `process:${metric.processId}->metric:${metric.id}`,
        from: graphId("process", metric.processId),
        to: id,
        label: "measured by metric",
        confidence: "direct",
        sourceModel: "Metric",
        sourceField: "processId",
        evidence: evidence("Metric", metric.id, "processId", metric.processId)
      });
    }
    if (metric.pipelineId) {
      addEdge(edges, {
        id: `pipeline:${metric.pipelineId}->metric:${metric.id}`,
        from: graphId("pipeline", metric.pipelineId),
        to: id,
        label: "measured by metric",
        confidence: "direct",
        sourceModel: "Metric",
        sourceField: "pipelineId",
        evidence: evidence("Metric", metric.id, "pipelineId", metric.pipelineId)
      });
    }
  }

  for (const process of processes) {
    const id = graphId("process", process.id);
    addNode(nodes, layers, "workflows", {
      id,
      type: "process",
      label: process.name,
      summary: process.description,
      metadata: {
        department: process.department,
        category: process.category,
        status: process.status,
        version: process.version,
        maturityLevel: process.maturityLevel
      }
    });
    const processTable = area.tables.find((table) => table.apiSlug === "processes");
    if (processTable) {
      addEdge(edges, {
        id: `table:${processTable.id}->process:${process.id}`,
        from: graphId("operating_table", processTable.id),
        to: id,
        label: "serves process record",
        confidence: "route_inferred",
        sourceModel: "OperatingTable",
        sourceField: "apiSlug",
        evidence: evidence("OperatingTable", processTable.id, "apiSlug", "processes")
      });
    }
    if (process.pipelines.length === 0) {
      gaps.push({
        id: `gap:process:${process.id}:pipeline`,
        severity: "info",
        layer: "workflows",
        nodeId: id,
        title: "Process has no pipeline",
        detail: `${process.name} has no pipeline workflow attached yet.`,
        evidence: evidence("Process", process.id, "pipelines", 0)
      });
    }
    for (const metricName of asStringArray(process.relatedMetrics)) {
      const matchingMetric = metrics.find((metric) => metric.name.toLowerCase() === metricName.toLowerCase());
      if (matchingMetric) {
        addEdge(edges, {
          id: `process:${process.id}->metric:${matchingMetric.id}:relatedMetrics`,
          from: id,
          to: graphId("metric", matchingMetric.id),
          label: "mentions metric",
          confidence: "content_inferred",
          sourceModel: "Process",
          sourceField: "relatedMetrics",
          evidence: evidence("Process", process.id, "relatedMetrics", metricName)
        });
      }
    }
  }

  for (const pipeline of pipelines) {
    const id = graphId("pipeline", pipeline.id);
    addNode(nodes, layers, "workflows", {
      id,
      type: "pipeline",
      label: pipeline.name,
      summary: pipeline.purpose,
      metadata: {
        processId: pipeline.processId,
        status: pipeline.status,
        version: pipeline.version,
        triggerType: pipeline.triggerType,
        isAutomatable: pipeline.isAutomatable,
        riskLevel: pipeline.riskLevel,
        stages: pipeline.stages.length
      }
    });
    if (pipeline.processId) {
      addEdge(edges, {
        id: `process:${pipeline.processId}->pipeline:${pipeline.id}`,
        from: graphId("process", pipeline.processId),
        to: id,
        label: "runs through pipeline",
        confidence: "direct",
        sourceModel: "Pipeline",
        sourceField: "processId",
        evidence: evidence("Pipeline", pipeline.id, "processId", pipeline.processId)
      });
    }
    for (const stage of pipeline.stages) {
      const stageId = graphId("pipeline_stage", stage.id);
      addNode(nodes, layers, "workflows", {
        id: stageId,
        type: "pipeline_stage",
        label: stage.name,
        summary: stage.description,
        metadata: {
          position: stage.position,
          status: stage.status,
          assignedRoleId: stage.assignedRoleId,
          procedureId: stage.procedureId,
          requiredTools: stage.requiredTools,
          requiredApprovals: stage.requiredApprovals
        }
      });
      addEdge(edges, {
        id: `pipeline:${pipeline.id}->stage:${stage.id}`,
        from: id,
        to: stageId,
        label: "contains stage",
        confidence: "direct",
        sourceModel: "PipelineStage",
        sourceField: "pipelineId",
        evidence: evidence("PipelineStage", stage.id, "pipelineId", pipeline.id)
      });
    }
  }

  for (const run of pipelineRuns) {
    const id = graphId("pipeline_run", run.id);
    addNode(nodes, layers, "workflows", {
      id,
      type: "pipeline_run",
      label: `${run.pipeline.name} run`,
      summary: run.status,
      metadata: { pipelineId: run.pipelineId, currentStageId: run.currentStageId, correlationId: run.correlationId }
    });
    addEdge(edges, {
      id: `pipeline:${run.pipelineId}->pipeline_run:${run.id}`,
      from: graphId("pipeline", run.pipelineId),
      to: id,
      label: "has run",
      confidence: "direct",
      sourceModel: "PipelineRun",
      sourceField: "pipelineId",
      evidence: evidence("PipelineRun", run.id, "pipelineId", run.pipelineId)
    });
    const normalizedLinks = pipelineRunTaskLinks.filter((link) => link.pipelineRunId === run.id);
    for (const link of normalizedLinks) {
      addEdge(edges, {
        id: `pipeline_run:${run.id}->task:${link.taskId}:link:${link.id}`,
        from: id,
        to: graphId("task", link.taskId),
        label: "links task",
        confidence: "direct",
        sourceModel: "PipelineRunTaskLink",
        sourceField: "pipelineRunId/taskId",
        evidence: evidence("PipelineRunTaskLink", link.id, "pipelineRunId/taskId", {
          pipelineRunId: link.pipelineRunId,
          taskId: link.taskId,
          linkType: link.linkType
        })
      });
    }
    for (const taskId of asStringArray(run.linkedTaskIds)) {
      if (normalizedLinks.some((link) => link.taskId === taskId)) {
        continue;
      }
      addEdge(edges, {
        id: `pipeline_run:${run.id}->task:${taskId}:linkedTaskIds`,
        from: id,
        to: graphId("task", taskId),
        label: "mentions task",
        confidence: "route_inferred",
        sourceModel: "PipelineRun",
        sourceField: "linkedTaskIds",
        evidence: evidence("PipelineRun", run.id, "linkedTaskIds", taskId)
      });
    }
  }

  for (const taskList of taskLists) {
    const id = graphId("task_list", taskList.id);
    addNode(nodes, layers, "tasks", {
      id,
      type: "task_list",
      label: taskList.name,
      summary: taskList.description,
      metadata: { status: taskList.status, source: taskList.source, projectId: taskList.projectId }
    });
  }

  for (const task of allTasks) {
    const id = graphId("task", task.id);
    addNode(nodes, layers, "tasks", {
      id,
      type: "task",
      label: task.title,
      summary: task.description,
      metadata: {
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        source: task.source,
        goalId: task.goalId,
        targetId: task.targetId,
        taskListId: task.taskListId
      }
    });
    if (task.goalId) {
      addEdge(edges, {
        id: `goal:${task.goalId}->task:${task.id}`,
        from: graphId("goal", task.goalId),
        to: id,
        label: "executed by task",
        confidence: "direct",
        sourceModel: "Task",
        sourceField: "goalId",
        evidence: evidence("Task", task.id, "goalId", task.goalId)
      });
    }
    if (task.targetId) {
      addEdge(edges, {
        id: `target:${task.targetId}->task:${task.id}`,
        from: graphId("target", task.targetId),
        to: id,
        label: "executes target",
        confidence: "direct",
        sourceModel: "Task",
        sourceField: "targetId",
        evidence: evidence("Task", task.id, "targetId", task.targetId)
      });
    }
    if (task.taskListId) {
      addEdge(edges, {
        id: `task_list:${task.taskListId}->task:${task.id}`,
        from: graphId("task_list", task.taskListId),
        to: id,
        label: "contains task",
        confidence: "direct",
        sourceModel: "Task",
        sourceField: "taskListId",
        evidence: evidence("Task", task.id, "taskListId", task.taskListId)
      });
    }
  }

  for (const knowledgeItem of knowledgeItems) {
    const id = graphId("knowledge_item", knowledgeItem.id);
    addNode(nodes, layers, "knowledge", {
      id,
      type: "knowledge_item",
      label: knowledgeItem.title,
      summary: knowledgeItem.summary,
      metadata: {
        itemType: knowledgeItem.itemType,
        sourceProvider: knowledgeItem.sourceProvider,
        sourceExternalId: knowledgeItem.sourceExternalId,
        status: knowledgeItem.status,
        url: knowledgeItem.url
      }
    });
    for (const [targetType, targetId, sourceField] of [
      ["process", knowledgeItem.processId, "processId"],
      ["pipeline", knowledgeItem.pipelineId, "pipelineId"],
      ["project", knowledgeItem.projectId, "projectId"],
      ["client", knowledgeItem.clientId, "clientId"],
      ["agent", knowledgeItem.agentId, "agentId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `${targetType}:${targetId}->knowledge_item:${knowledgeItem.id}`,
          from: graphId(targetType, targetId),
          to: id,
          label: "has knowledge",
          confidence: "direct",
          sourceModel: "KnowledgeItem",
          sourceField,
          evidence: evidence("KnowledgeItem", knowledgeItem.id, sourceField, targetId)
        });
      }
    }
  }
  for (const link of knowledgeLinks) {
    const targetNode = linkTargetGraphId(link.targetType, link.targetId);
    if (!targetNode) {
      continue;
    }
    const sourceNode = link.knowledgeItemId
      ? graphId("knowledge_item", link.knowledgeItemId)
      : link.googleDriveFileId
        ? graphId("google_drive_file", link.googleDriveFileId)
        : link.contentSnapshotId
          ? graphId("google_drive_content_snapshot", link.contentSnapshotId)
          : null;
    if (!sourceNode) {
      continue;
    }
    addEdge(edges, {
      id: `knowledge_link:${link.id}`,
      from: sourceNode,
      to: targetNode,
      label: link.linkType,
      confidence: link.confidence as EdgeConfidence,
      sourceModel: "KnowledgeLink",
      sourceField: "targetType/targetId",
      actionHint: actionHint("Create knowledge link", "POST", "/v1/company-os/knowledge-links"),
      evidence: evidence("KnowledgeLink", link.id, "targetType/targetId", {
        targetType: link.targetType,
        targetId: link.targetId
      })
    });
  }

  const driveNodeByExternalId = new Map<string, string>();
  for (const file of driveFiles) {
    const id = graphId("google_drive_file", file.id);
    const latestSnapshot = file.contentSnapshots[0];
    driveNodeByExternalId.set(file.externalId, id);
    addNode(nodes, layers, "knowledge", {
      id,
      type: "google_drive_file",
      label: file.name,
      summary: latestSnapshot?.summary ?? file.description ?? (file.isFolder ? "Google Drive folder" : "Google Drive file"),
      metadata: {
        externalId: file.externalId,
        mimeType: file.mimeType,
        isFolder: file.isFolder,
        syncStatus: file.syncStatus,
        scanStatus: file.scanStatus,
        webViewLink: file.webViewLink,
        latestSnapshot: latestSnapshot ? {
          id: latestSnapshot.id,
          contentKind: latestSnapshot.contentKind,
          scanStatus: latestSnapshot.scanStatus,
          summary: latestSnapshot.summary,
          createdAt: latestSnapshot.createdAt
        } : null
      }
    });
    for (const [targetType, targetId, sourceField] of [
      ["operating_area", file.operatingAreaId, "operatingAreaId"],
      ["operating_folder", file.operatingFolderId, "operatingFolderId"],
      ["operating_table", file.operatingTableId, "operatingTableId"],
      ["storage_location", file.storageLocationId, "storageLocationId"],
      ["knowledge_root", file.knowledgeRootId, "knowledgeRootId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `drive:${file.id}->${targetType}:${targetId}`,
          from: id,
          to: graphId(targetType, targetId),
          label: `assigned to ${targetType.replace(/_/g, " ")}`,
          confidence: "direct",
          sourceModel: "GoogleDriveFile",
          sourceField,
          actionHint: sourceField === "operatingAreaId" ? actionHint("Assign Drive scope", "PATCH", `/v1/google-drive/files/${file.id}/scope`) : undefined,
          evidence: evidence("GoogleDriveFile", file.id, sourceField, targetId)
        });
      }
    }
    if (latestSnapshot) {
      addEdge(edges, {
        id: `drive:${file.id}->snapshot:${latestSnapshot.id}`,
        from: id,
        to: graphId("google_drive_content_snapshot", latestSnapshot.id),
        label: "has latest content snapshot",
        confidence: "content_inferred",
        sourceModel: "GoogleDriveContentSnapshot",
        sourceField: "googleDriveFileId",
        evidence: evidence("GoogleDriveContentSnapshot", latestSnapshot.id, "googleDriveFileId", file.id)
      });
      addNode(nodes, layers, "knowledge", {
        id: graphId("google_drive_content_snapshot", latestSnapshot.id),
        type: "google_drive_content_snapshot",
        label: `${file.name} snapshot`,
        summary: latestSnapshot.summary,
        metadata: {
          contentKind: latestSnapshot.contentKind,
          scanStatus: latestSnapshot.scanStatus,
          errorCode: latestSnapshot.errorCode,
          createdAt: latestSnapshot.createdAt
        }
      });
    }
  }

  for (const file of driveFiles) {
    if (!file.parentExternalId) {
      continue;
    }
    const parentNodeId = driveNodeByExternalId.get(file.parentExternalId);
    if (parentNodeId) {
      addEdge(edges, {
        id: `drive-parent:${file.parentExternalId}->${file.externalId}`,
        from: parentNodeId,
        to: graphId("google_drive_file", file.id),
        label: "contains Drive child",
        confidence: "provider_hierarchy",
        sourceModel: "GoogleDriveFile",
        sourceField: "parentExternalId",
        evidence: evidence("GoogleDriveFile", file.id, "parentExternalId", file.parentExternalId)
      });
    }
  }

  for (const mapping of externalMappings) {
    const id = graphId("external_container_mapping", mapping.id);
    addNode(nodes, layers, "sources", {
      id,
      type: "external_container_mapping",
      label: mapping.name ?? mapping.externalId,
      summary: `${mapping.provider} ${mapping.entityType}`,
      metadata: { provider: mapping.provider, entityType: mapping.entityType, externalId: mapping.externalId }
    });
    for (const [targetType, targetId, sourceField] of [
      ["operating_area", mapping.areaId, "areaId"],
      ["operating_folder", mapping.folderId, "folderId"],
      ["operating_table", mapping.tableId, "tableId"]
    ] as const) {
      if (targetId) {
        addEdge(edges, {
          id: `mapping:${mapping.id}->${targetType}:${targetId}`,
          from: id,
          to: graphId(targetType, targetId),
          label: `assigned to ${targetType.replace(/_/g, " ")}`,
          confidence: "direct",
          sourceModel: "ExternalContainerMapping",
          sourceField,
          actionHint: actionHint("Assign provider scope", "PATCH", `/v1/operating-model/external-mappings/${mapping.id}/scope`),
          evidence: evidence("ExternalContainerMapping", mapping.id, sourceField, targetId)
        });
      }
    }
  }

  for (const location of storageLocations) {
    addNode(nodes, layers, "sources", {
      id: graphId("storage_location", location.id),
      type: "storage_location",
      label: location.name,
      summary: location.provider,
      metadata: { locator: location.locator }
    });
  }

  for (const root of knowledgeRoots) {
    addNode(nodes, layers, "knowledge", {
      id: graphId("knowledge_root", root.id),
      type: "knowledge_root",
      label: root.name,
      summary: root.provider,
      metadata: { locator: root.locator }
    });
  }

  if (goals.length === 0 && (areaTableSlugs.has("goals") || matchesAreaText(area, "strategy"))) {
    gaps.push({
      id: `gap:area:${area.id}:goals`,
      severity: "warning",
      layer: "goals",
      nodeId: areaNodeId,
      title: "No goals scoped to this area",
      detail: `${area.name} has no goal records visible through the current backend contract.`,
      actionHint: actionHint("Create goal", "POST", "/v1/goals"),
      evidence: evidence("OperatingArea", area.id, "key", area.key)
    });
  }
  if (processes.length === 0 && pipelines.length === 0 && (areaTableSlugs.has("processes") || areaTableSlugs.has("pipelines"))) {
    gaps.push({
      id: `gap:area:${area.id}:workflows`,
      severity: "warning",
      layer: "workflows",
      nodeId: areaNodeId,
      title: "No workflow definitions scoped to this area",
      detail: `${area.name} has no process or pipeline definitions available in this graph.`,
      evidence: evidence("OperatingArea", area.id, "tables", [...areaTableSlugs])
    });
  }
  if (driveFiles.length === 0 && knowledgeItems.length === 0 && knowledgeRoots.length === 0) {
    gaps.push({
      id: `gap:area:${area.id}:knowledge`,
      severity: "info",
      layer: "knowledge",
      nodeId: areaNodeId,
      title: "No knowledge evidence scoped to this area",
      detail: `${area.name} has no Drive files, knowledge roots, or knowledge items attached yet.`,
      evidence: evidence("OperatingArea", area.id, "knowledge", 0)
    });
  }
  for (const goal of goals) {
    const hasExecution = allTasks.some((task) => task.goalId === goal.id)
      || targets.some((target) => target.goalId === goal.id && allTasks.some((task) => task.targetId === target.id));
    if (!hasExecution) {
      gaps.push({
        id: `gap:goal:${goal.id}:execution`,
        severity: "info",
        layer: "tasks",
        nodeId: graphId("goal", goal.id),
        title: "Goal has no execution task",
        detail: `${goal.title} is not connected to a task yet.`,
        actionHint: actionHint("Create task", "POST", "/v1/tasks"),
        evidence: evidence("Goal", goal.id, "tasks", 0)
      });
    }
  }

  reviewItems.push(...gaps.filter((gap) => gap.severity !== "info"));

  const unsupportedFamilies = [
    {
      family: "generic_editable_edges",
      reason: "The project has no approved broad edge editor for arbitrary business entities.",
      nextAction: "Use explicit model relations or command-shaped link contracts after AOG-BE-001 is proven."
    }
  ];

  res.json({
    data: {
      area: {
        id: area.id,
        key: area.key,
        canonicalKey: canonicalRequestKey,
        resolvedKey,
        name: area.name,
        description: area.description,
        position: area.position
      },
      summary: {
        goals: goals.length,
        targets: targets.length,
        metrics: metrics.length,
        workflows: processes.length + pipelines.length,
        tasks: allTasks.length,
        knowledge: knowledgeItems.length + driveFiles.length + knowledgeRoots.length,
        sources: area.tables.length + externalMappings.length + storageLocations.length,
        gaps: gaps.length,
        nodes: nodes.size,
        edges: edges.length,
        limit
      },
      nodes: Array.from(nodes.values()),
      edges,
      layers,
      gaps,
      reviewItems,
      unsupportedFamilies
    }
  });
}));
