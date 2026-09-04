import type {
  ApplicationStatus,
  CapabilityApplicability,
  CapabilityState,
  InnovationLifecycleStage,
  ProductLifecycleStage
} from "@prisma/client";

export type ApplicationGraphNodeType = "portfolio" | "application" | "requirement" | "domain" | "capability" | "feature" | "layer" | "implementation" | "procedure" | "procedure_step" | "project" | "task_list" | "task";
export type ApplicationGraphEdgeType = "hierarchy" | "dependency" | "blocks" | "relates_to";

export type ApplicationGraphNode = {
  id: string;
  entityId: string;
  type: ApplicationGraphNodeType;
  label: string;
  shortLabel: string;
  category: string;
  status: string;
  completeness: number;
  isRequired: boolean;
  isBlocked: boolean;
  hasEvidence: boolean;
  tags: string[];
  parentNodeId: string | null;
  childCount: number;
  path: string[];
  details: {
    description?: string | null;
    owner?: string | null;
    innovationStage?: string;
    productStage?: string;
    applicationStatus?: string;
    applicability?: string;
    targetState?: string;
    observedState?: string;
    lifecycleStatus?: string;
    atomType?: string;
    layer?: string;
    module?: string;
    riskLevel?: string;
    verificationStatus?: string;
    filePath?: string;
    externalId?: string;
    relationCount?: number;
    evidenceCount?: number;
    verifiedEvidenceCount?: number;
    missingEvidence?: boolean;
    blockerLabels?: string[];
    recommendations?: string[];
    relationType?: string;
    processName?: string | null;
    procedureVersion?: number;
    stepType?: string;
    stepOrder?: number;
    expectedResult?: string | null;
    dueDate?: string | null;
    priority?: string | null;
    links?: Array<{ label: string; href: string }>;
  };
};

export type ApplicationGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: ApplicationGraphEdgeType;
  required: boolean;
  label?: string | null;
};

export type ApplicationGraphPacket = {
  schemaVersion: "application-graph-v2";
  generatedAt: string;
  scope: "portfolio" | "application";
  rootNodeId: string;
  applicationId?: string;
  nodes: ApplicationGraphNode[];
  edges: ApplicationGraphEdge[];
  projection: {
    sourceOfTruth: "product-engineering";
    initialDepth: number;
    completeApplicationProjection: boolean;
    domainMappingVersion: "application-graph-domains-v1";
  };
};

type PortfolioApplication = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  owner?: string | null;
  innovationStage: InnovationLifecycleStage;
  productStage: ProductLifecycleStage;
  status: ApplicationStatus;
  readiness: { overall: number; blockers: unknown[] };
  capabilityCount: number;
  gapCount: number;
  evidenceCount: number;
  frontendUrl?: string | null;
  documentationUrl?: string | null;
};

type GraphFeature = {
  id: string;
  applicability: CapabilityApplicability;
  targetState: CapabilityState;
  observedState: CapabilityState;
  lifecycleStatus: string;
  notes?: string | null;
  featureDefinition: { id: string; key: string; name: string; description?: string | null };
  evidence: Array<{ verificationStatus: string }>;
};

type GraphCapability = {
  id: string;
  applicability: CapabilityApplicability;
  targetState: CapabilityState;
  observedState: CapabilityState;
  lifecycleStatus: string;
  targetDescription?: string | null;
  observedSummary?: string | null;
  owner?: string | null;
  capabilityDefinition: {
    id: string;
    key: string;
    name: string;
    description?: string | null;
    tags: string[];
    domain: { key: string; name: string };
    procedures?: GraphCapabilityProcedure[];
  };
  evidence: Array<{ verificationStatus: string }>;
  features: GraphFeature[];
  dependenciesFrom: Array<{
    id: string;
    required: boolean;
    notes?: string | null;
    toCapability: { id: string; observedState: CapabilityState; capabilityDefinition: { name: string } };
  }>;
};

type GraphProcedure = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  version: number;
  expectedResult?: string | null;
  process?: { name: string } | null;
  qualityStandard?: { name: string } | null;
  steps: Array<{ id: string; stepOrder: number; instruction: string; stepType: string }>;
};

type GraphCapabilityProcedure = {
  relationType: string;
  required: boolean;
  procedure: GraphProcedure;
};

type GraphApplicationProcedure = GraphCapabilityProcedure;

type GraphTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  dueDate?: Date | string | null;
};

type GraphProject = {
  relationType: string;
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    taskLists: Array<{ id: string; name: string; description?: string | null; status: string; tasks: GraphTask[] }>;
    tasks: GraphTask[];
  };
};

type GraphApplication = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  owner?: string | null;
  innovationStage: InnovationLifecycleStage;
  productStage: ProductLifecycleStage;
  status: ApplicationStatus;
  frontendUrl?: string | null;
  backendUrl?: string | null;
  documentationUrl?: string | null;
};

type GraphArchitectureComponent = {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  status: string;
  metadata: unknown;
};

type ImplementationMetadata = {
  sourceId?: string;
  sourceSystem?: string;
  atomType?: string;
  layer?: string;
  module?: string;
  feature?: string;
  parentSourceId?: string;
  completionPercent?: number;
  verificationStatus?: string;
  riskLevel?: string;
  filePath?: string;
  relations?: Array<{ targetSourceId?: string; type?: string; status?: string; description?: string }>;
};

const stateScore: Record<CapabilityState, number> = {
  unknown: 0,
  not_started: 0,
  missing: 0,
  partial: 50,
  complete: 90,
  verified: 100
};

const graphDomainMap: Record<string, { key: string; label: string; order: number }> = {
  "identity-access": { key: "backend", label: "Backend", order: 20 },
  experience: { key: "frontend", label: "Frontend", order: 10 },
  data: { key: "data", label: "Data", order: 40 },
  interfaces: { key: "api-integrations", label: "API / Integrations", order: 50 },
  "ai-agent": { key: "ai-mcp-agents", label: "AI / MCP / Agents", order: 60 },
  infrastructure: { key: "infrastructure", label: "Infrastructure", order: 80 },
  security: { key: "security", label: "Security", order: 70 },
  quality: { key: "quality", label: "Quality", order: 90 },
  operations: { key: "operations", label: "Operations", order: 100 },
  commercial: { key: "commercial", label: "Commercial", order: 110 },
  trading: { key: "domain", label: "Domain", order: 120 },
  "company-os": { key: "domain", label: "Domain", order: 120 }
};

export function graphDomainFor(domainKey: string, domainName: string) {
  return graphDomainMap[domainKey] ?? { key: `domain-${domainKey}`, label: domainName, order: 200 };
}

function nodeId(type: ApplicationGraphNodeType, entityId: string) {
  return `${type}:${entityId}`;
}

function clampPercent(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function average(values: number[]) {
  return values.length ? clampPercent(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function implementationMetadata(value: unknown): ImplementationMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ImplementationMetadata;
}

function implementationStatus(metadata: ImplementationMetadata, fallback: string) {
  return metadata.verificationStatus || fallback;
}

function linksFor(application: GraphApplication | PortfolioApplication) {
  return [
    application.frontendUrl ? { label: "Open application", href: application.frontendUrl } : null,
    "backendUrl" in application && application.backendUrl ? { label: "Open API", href: application.backendUrl } : null,
    application.documentationUrl ? { label: "Documentation", href: application.documentationUrl } : null
  ].filter((link): link is { label: string; href: string } => Boolean(link));
}

function graphLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function appendImplementationProjection(input: {
  applicationId: string;
  applicationNodeId: string;
  architecture: GraphArchitectureComponent[];
  featureNodeByKey: Map<string, ApplicationGraphNode>;
  nodes: ApplicationGraphNode[];
  edges: ApplicationGraphEdge[];
}) {
  if (!input.architecture.length) return;

  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const records = input.architecture.map((component) => ({ component, metadata: implementationMetadata(component.metadata) }));
  const recordBySourceId = new Map(records.map((record) => [record.metadata.sourceId || record.component.id, record]));
  const implementationNodeBySourceId = new Map<string, ApplicationGraphNode>();
  const layerNodeByKey = new Map<string, ApplicationGraphNode>();
  let implementationDomain: ApplicationGraphNode | null = null;

  const ensureImplementationDomain = () => {
    if (implementationDomain) return implementationDomain;
    const applicationNode = nodeById.get(input.applicationNodeId)!;
    const id = nodeId("domain", `${input.applicationId}:implementation`);
    implementationDomain = {
      id,
      entityId: "implementation",
      type: "domain",
      label: "Implementation",
      shortLabel: "Implementation",
      category: "System anatomy",
      status: "active",
      completeness: average(records.map(({ metadata }) => Number(metadata.completionPercent) || 0)),
      isRequired: true,
      isBlocked: false,
      hasEvidence: records.some(({ metadata }) => Boolean(metadata.filePath || metadata.verificationStatus?.includes("verified"))),
      tags: ["implementation", "architecture", "system-anatomy"],
      parentNodeId: applicationNode.id,
      childCount: 0,
      path: [...applicationNode.path, id],
      details: {
        description: "Implementation atoms that realize application capabilities across UI, API, runtime, data, tests and documentation."
      }
    };
    input.nodes.push(implementationDomain);
    nodeById.set(id, implementationDomain);
    input.edges.push({ id: `hierarchy:${applicationNode.id}:${id}`, source: applicationNode.id, target: id, type: "hierarchy", required: true });
    return implementationDomain;
  };

  const ensureLayer = (metadata: ImplementationMetadata) => {
    const featureNode = metadata.feature ? input.featureNodeByKey.get(metadata.feature) : undefined;
    const parent = featureNode || ensureImplementationDomain();
    const layer = metadata.layer || metadata.atomType || "other";
    const key = `${parent.id}:${layer}`;
    const existing = layerNodeByKey.get(key);
    if (existing) return existing;
    const id = nodeId("layer", `${input.applicationId}:${key}`);
    const related = records.filter((record) => {
      const relatedFeature = record.metadata.feature ? input.featureNodeByKey.get(record.metadata.feature) : undefined;
      return (relatedFeature || implementationDomain)?.id === parent.id && (record.metadata.layer || record.metadata.atomType || "other") === layer;
    });
    const completeness = average(related.map(({ metadata }) => Number(metadata.completionPercent) || 0));
    const layerNode: ApplicationGraphNode = {
      id,
      entityId: key,
      type: "layer",
      label: graphLabel(layer),
      shortLabel: graphLabel(layer),
      category: featureNode ? "Implementation layer" : "Architecture layer",
      status: completeness >= 90 ? "complete" : completeness > 0 ? "partial" : "unknown",
      completeness,
      isRequired: true,
      isBlocked: false,
      hasEvidence: related.some(({ metadata }) => Boolean(metadata.filePath || metadata.verificationStatus?.includes("verified"))),
      tags: [layer, metadata.feature || "architecture", "implementation-layer"],
      parentNodeId: parent.id,
      childCount: 0,
      path: [...parent.path, id],
      details: {
        description: featureNode
          ? `${graphLabel(layer)} atoms that realize ${featureNode.label}.`
          : `${graphLabel(layer)} implementation atoms recorded for this application.`
      }
    };
    input.nodes.push(layerNode);
    nodeById.set(id, layerNode);
    layerNodeByKey.set(key, layerNode);
    input.edges.push({ id: `hierarchy:${parent.id}:${id}`, source: parent.id, target: id, type: "hierarchy", required: true });
    return layerNode;
  };

  const visiting = new Set<string>();
  const ensureImplementationNode = (sourceId: string): ApplicationGraphNode | null => {
    const existing = implementationNodeBySourceId.get(sourceId);
    if (existing) return existing;
    const record = recordBySourceId.get(sourceId);
    if (!record) return null;
    const { component, metadata } = record;
    const layerNode = ensureLayer(metadata);
    let parent = layerNode;
    if (metadata.parentSourceId && metadata.parentSourceId !== sourceId && !visiting.has(metadata.parentSourceId)) {
      visiting.add(sourceId);
      const parentRecord = recordBySourceId.get(metadata.parentSourceId);
      if (parentRecord?.metadata.feature === metadata.feature) parent = ensureImplementationNode(metadata.parentSourceId) || layerNode;
      visiting.delete(sourceId);
    }
    const id = nodeId("implementation", component.id);
    const completeness = clampPercent(Number(metadata.completionPercent) || 0);
    const relationCount = metadata.relations?.length ?? 0;
    const atom: ApplicationGraphNode = {
      id,
      entityId: component.id,
      type: "implementation",
      label: component.name,
      shortLabel: component.name,
      category: graphLabel(metadata.atomType || component.type),
      status: implementationStatus(metadata, component.status),
      completeness,
      isRequired: true,
      isBlocked: false,
      hasEvidence: Boolean(metadata.filePath || metadata.verificationStatus?.includes("verified")),
      tags: [metadata.sourceId, metadata.sourceSystem, metadata.atomType, metadata.layer, metadata.module, metadata.feature].filter((tag): tag is string => Boolean(tag)),
      parentNodeId: parent.id,
      childCount: 0,
      path: [...parent.path, id],
      details: {
        description: component.description,
        atomType: metadata.atomType || component.type,
        layer: metadata.layer,
        module: metadata.module,
        riskLevel: metadata.riskLevel,
        verificationStatus: metadata.verificationStatus,
        filePath: metadata.filePath,
        externalId: metadata.sourceId,
        relationCount,
        missingEvidence: !metadata.filePath && !metadata.verificationStatus?.includes("verified"),
        recommendations: completeness < 90 ? ["Inspect this implementation atom and its dependency neighbourhood before treating the feature as complete."] : []
      }
    };
    input.nodes.push(atom);
    nodeById.set(id, atom);
    implementationNodeBySourceId.set(sourceId, atom);
    input.edges.push({ id: `hierarchy:${parent.id}:${id}`, source: parent.id, target: id, type: "hierarchy", required: true });
    return atom;
  };

  for (const sourceId of recordBySourceId.keys()) ensureImplementationNode(sourceId);

  for (const [sourceId, record] of recordBySourceId) {
    const source = implementationNodeBySourceId.get(sourceId);
    if (!source) continue;
    for (const [index, relation] of (record.metadata.relations ?? []).entries()) {
      if (!relation.targetSourceId) continue;
      const target = implementationNodeBySourceId.get(relation.targetSourceId);
      if (!target || target.id === source.id) continue;
      const dependency = ["depends_on", "calls", "reads", "writes", "reads_writes", "uses", "triggers"].includes(relation.type || "");
      input.edges.push({
        id: `${dependency ? "dependency" : "relates"}:${source.id}:${target.id}:${index}`,
        source: source.id,
        target: target.id,
        type: dependency ? "dependency" : "relates_to",
        required: dependency,
        label: relation.type ? graphLabel(relation.type) : relation.description
      });
    }
  }
}

function executionScore(status: string) {
  if (["done", "complete", "completed", "active", "verified"].includes(status)) return 100;
  if (["in_progress", "partial", "review"].includes(status)) return 50;
  if (["blocked", "paused"].includes(status)) return 25;
  return 0;
}

function appendExecutionProjection(input: {
  applicationId: string;
  applicationNodeId: string;
  procedures: GraphApplicationProcedure[];
  projects: GraphProject[];
  capabilityNodeByDefinitionId: Map<string, ApplicationGraphNode>;
  capabilityProcedures: Array<{ capabilityDefinitionId: string; link: GraphCapabilityProcedure }>;
  nodes: ApplicationGraphNode[];
  edges: ApplicationGraphEdge[];
}) {
  if (!input.procedures.length && !input.projects.length && !input.capabilityProcedures.length) return;
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const appNode = nodeById.get(input.applicationNodeId)!;

  const makeDomain = (key: string, label: string, description: string, scores: number[]) => {
    const id = nodeId("domain", `${input.applicationId}:${key}`);
    const node: ApplicationGraphNode = {
      id,
      entityId: key,
      type: "domain",
      label,
      shortLabel: label,
      category: "Execution",
      status: average(scores) >= 90 ? "complete" : scores.some((score) => score > 0) ? "in_progress" : "not_started",
      completeness: average(scores),
      isRequired: true,
      isBlocked: false,
      hasEvidence: scores.some((score) => score >= 100),
      tags: ["execution", key],
      parentNodeId: appNode.id,
      childCount: 0,
      path: [...appNode.path, id],
      details: { description }
    };
    input.nodes.push(node);
    nodeById.set(id, node);
    input.edges.push({ id: `hierarchy:${appNode.id}:${id}`, source: appNode.id, target: id, type: "hierarchy", required: true });
    return node;
  };

  const appendProcedure = (link: GraphCapabilityProcedure, parent: ApplicationGraphNode, context: string) => {
    const procedure = link.procedure;
    const id = nodeId("procedure", `${context}:${procedure.id}`);
    if (nodeById.has(id)) return;
    const completeness = procedure.status === "active" ? 100 : procedure.status === "draft" ? 50 : 0;
    const procedureNode: ApplicationGraphNode = {
      id,
      entityId: procedure.id,
      type: "procedure",
      label: procedure.name,
      shortLabel: procedure.name,
      category: "Procedure",
      status: procedure.status,
      completeness,
      isRequired: link.required,
      isBlocked: link.required && procedure.status !== "active",
      hasEvidence: Boolean(procedure.qualityStandard),
      tags: ["execution", "procedure", link.relationType, procedure.status],
      parentNodeId: parent.id,
      childCount: procedure.steps.length,
      path: [...parent.path, id],
      details: {
        description: procedure.purpose,
        relationType: link.relationType,
        processName: procedure.process?.name,
        procedureVersion: procedure.version,
        expectedResult: procedure.expectedResult,
        blockerLabels: link.required && procedure.status !== "active" ? ["Required procedure is not active"] : [],
        recommendations: link.required && procedure.status !== "active" ? ["Review and activate this procedure before relying on it for delivery."] : []
      }
    };
    input.nodes.push(procedureNode);
    nodeById.set(id, procedureNode);
    input.edges.push({ id: `hierarchy:${parent.id}:${id}`, source: parent.id, target: id, type: "hierarchy", required: link.required, label: link.relationType });
    for (const step of procedure.steps) {
      const stepId = nodeId("procedure_step", `${context}:${step.id}`);
      input.nodes.push({
        id: stepId,
        entityId: step.id,
        type: "procedure_step",
        label: step.instruction,
        shortLabel: `${step.stepOrder}. ${step.instruction}`,
        category: "Procedure step",
        status: procedure.status,
        completeness,
        isRequired: link.required,
        isBlocked: false,
        hasEvidence: false,
        tags: ["execution", "procedure-step", step.stepType],
        parentNodeId: id,
        childCount: 0,
        path: [...procedureNode.path, stepId],
        details: { description: step.instruction, stepType: step.stepType, stepOrder: step.stepOrder }
      });
      input.edges.push({ id: `hierarchy:${id}:${stepId}`, source: id, target: stepId, type: "hierarchy", required: link.required });
    }
  };

  if (input.procedures.length) {
    const operatingModel = makeDomain(
      "operating-model",
      "Operating model",
      "Application-specific procedures that govern how this product is designed, verified, released and improved.",
      input.procedures.map((link) => link.procedure.status === "active" ? 100 : link.procedure.status === "draft" ? 50 : 0)
    );
    for (const link of input.procedures) appendProcedure(link, operatingModel, `application:${input.applicationId}`);
  }

  for (const { capabilityDefinitionId, link } of input.capabilityProcedures) {
    const parent = input.capabilityNodeByDefinitionId.get(capabilityDefinitionId);
    if (parent) appendProcedure(link, parent, `capability:${parent.entityId}`);
  }

  if (input.projects.length) {
    const taskScores = input.projects.flatMap(({ project }) => [...project.tasks, ...project.taskLists.flatMap((list) => list.tasks)]).map((task) => executionScore(task.status));
    const delivery = makeDomain("delivery", "Delivery", "Projects and tasks that turn the application model into verified product increments.", taskScores);
    for (const link of input.projects) {
      const project = link.project;
      const projectTasks = [...project.tasks, ...project.taskLists.flatMap((list) => list.tasks)];
      const projectId = nodeId("project", project.id);
      const projectNode: ApplicationGraphNode = {
        id: projectId,
        entityId: project.id,
        type: "project",
        label: project.name,
        shortLabel: project.name,
        category: "Project",
        status: project.status,
        completeness: average(projectTasks.map((task) => executionScore(task.status))),
        isRequired: true,
        isBlocked: projectTasks.some((task) => task.status === "blocked"),
        hasEvidence: projectTasks.some((task) => task.status === "done"),
        tags: ["execution", "project", link.relationType],
        parentNodeId: delivery.id,
        childCount: project.taskLists.length + project.tasks.length,
        path: [...delivery.path, projectId],
        details: { description: project.description, relationType: link.relationType }
      };
      input.nodes.push(projectNode);
      input.edges.push({ id: `hierarchy:${delivery.id}:${projectId}`, source: delivery.id, target: projectId, type: "hierarchy", required: true, label: link.relationType });

      const appendTask = (task: GraphTask, parent: ApplicationGraphNode) => {
        const taskId = nodeId("task", task.id);
        input.nodes.push({
          id: taskId,
          entityId: task.id,
          type: "task",
          label: task.title,
          shortLabel: task.title,
          category: "Task",
          status: task.status,
          completeness: executionScore(task.status),
          isRequired: true,
          isBlocked: task.status === "blocked",
          hasEvidence: task.status === "done",
          tags: ["execution", "task", task.status, task.priority].filter((tag): tag is string => Boolean(tag)),
          parentNodeId: parent.id,
          childCount: 0,
          path: [...parent.path, taskId],
          details: { description: task.description, dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null, priority: task.priority }
        });
        input.edges.push({ id: `hierarchy:${parent.id}:${taskId}`, source: parent.id, target: taskId, type: "hierarchy", required: true });
      };

      for (const task of project.tasks) appendTask(task, projectNode);
      for (const list of project.taskLists) {
        const listId = nodeId("task_list", list.id);
        const listNode: ApplicationGraphNode = {
          id: listId,
          entityId: list.id,
          type: "task_list",
          label: list.name,
          shortLabel: list.name,
          category: "Task list",
          status: list.status,
          completeness: average(list.tasks.map((task) => executionScore(task.status))),
          isRequired: true,
          isBlocked: list.tasks.some((task) => task.status === "blocked"),
          hasEvidence: list.tasks.some((task) => task.status === "done"),
          tags: ["execution", "task-list"],
          parentNodeId: projectId,
          childCount: list.tasks.length,
          path: [...projectNode.path, listId],
          details: { description: list.description }
        };
        input.nodes.push(listNode);
        input.edges.push({ id: `hierarchy:${projectId}:${listId}`, source: projectId, target: listId, type: "hierarchy", required: true });
        for (const task of list.tasks) appendTask(task, listNode);
      }
    }
  }
}

export function buildPortfolioGraph(input: { workspace: { id: string; name: string }; applications: PortfolioApplication[] }): ApplicationGraphPacket {
  const rootId = nodeId("portfolio", input.workspace.id);
  const applicationNodes = input.applications.map<ApplicationGraphNode>((application) => {
    const id = nodeId("application", application.id);
    return {
      id,
      entityId: application.id,
      type: "application",
      label: application.name,
      shortLabel: application.name,
      category: "Application",
      status: application.status === "active" ? application.innovationStage : application.status,
      completeness: application.readiness.overall,
      isRequired: true,
      isBlocked: application.readiness.blockers.length > 0,
      hasEvidence: application.evidenceCount > 0,
      tags: [application.slug, application.innovationStage, application.productStage],
      parentNodeId: rootId,
      childCount: application.capabilityCount,
      path: [rootId, id],
      details: {
        description: application.description,
        owner: application.owner,
        innovationStage: application.innovationStage,
        productStage: application.productStage,
        applicationStatus: application.status,
        evidenceCount: application.evidenceCount,
        missingEvidence: application.evidenceCount === 0,
        blockerLabels: application.gapCount ? [`${application.gapCount} open capability gaps`] : [],
        recommendations: application.gapCount ? ["Open the application to inspect incomplete or blocked capabilities."] : [],
        links: linksFor(application)
      }
    };
  });

  const root: ApplicationGraphNode = {
    id: rootId,
    entityId: input.workspace.id,
    type: "portfolio",
    label: "Applications",
    shortLabel: "Applications",
    category: "Product Engineering",
    status: applicationNodes.some((node) => node.isBlocked) ? "attention" : "active",
    completeness: average(applicationNodes.map((node) => node.completeness)),
    isRequired: true,
    isBlocked: applicationNodes.some((node) => node.isBlocked),
    hasEvidence: applicationNodes.some((node) => node.hasEvidence),
    tags: ["portfolio", "product-engineering"],
    parentNodeId: null,
    childCount: applicationNodes.length,
    path: [rootId],
    details: {
      description: `Application portfolio for ${input.workspace.name}. This is a contextual projection, not a separate business entity.`,
      evidenceCount: applicationNodes.reduce((sum, node) => sum + (node.details.evidenceCount ?? 0), 0),
      recommendations: applicationNodes.length ? [] : ["Create the first application in Product Engineering."]
    }
  };

  return {
    schemaVersion: "application-graph-v2",
    generatedAt: new Date().toISOString(),
    scope: "portfolio",
    rootNodeId: rootId,
    nodes: [root, ...applicationNodes],
    edges: applicationNodes.map((node) => ({ id: `hierarchy:${rootId}:${node.id}`, source: rootId, target: node.id, type: "hierarchy", required: true })),
    projection: { sourceOfTruth: "product-engineering", initialDepth: 1, completeApplicationProjection: false, domainMappingVersion: "application-graph-domains-v1" }
  };
}

export function buildApplicationGraph(input: {
  workspace: { id: string; name: string };
  application: GraphApplication;
  capabilities: GraphCapability[];
  architecture?: GraphArchitectureComponent[];
  procedures?: GraphApplicationProcedure[];
  projects?: GraphProject[];
  records?: Array<{ id: string; recordType: string; key: string; title: string; description?: string | null; status: string; priority: string; functionalState: string; parentId?: string | null; implementationCoverage?: number | null; evidenceCount?: number }>;
  relationships?: Array<{ id: string; dependencyType: string; fromEntityType?: string | null; fromEntityId?: string | null; toEntityType?: string | null; toEntityId?: string | null }>;
  readiness: { overall: number; blockers: Array<{ capabilityId: string }> };
}): ApplicationGraphPacket {
  const portfolioId = nodeId("portfolio", input.workspace.id);
  const applicationId = nodeId("application", input.application.id);
  const blockedCapabilityIds = new Set(input.readiness.blockers.map((blocker) => blocker.capabilityId));
  const groups = new Map<string, { key: string; label: string; order: number; capabilities: GraphCapability[] }>();

  for (const capability of input.capabilities.filter((item) => item.applicability !== "not_applicable")) {
    const mapped = graphDomainFor(capability.capabilityDefinition.domain.key, capability.capabilityDefinition.domain.name);
    const group = groups.get(mapped.key) ?? { ...mapped, capabilities: [] };
    group.capabilities.push(capability);
    groups.set(mapped.key, group);
  }

  const portfolioNode: ApplicationGraphNode = {
    id: portfolioId,
    entityId: input.workspace.id,
    type: "portfolio",
    label: "Applications",
    shortLabel: "Applications",
    category: "Product Engineering",
    status: "active",
    completeness: input.readiness.overall,
    isRequired: true,
    isBlocked: input.readiness.blockers.length > 0,
    hasEvidence: input.capabilities.some((capability) => capability.evidence.length > 0),
    tags: ["portfolio", "product-engineering"],
    parentNodeId: null,
    childCount: 1,
    path: [portfolioId],
    details: { description: `Application portfolio for ${input.workspace.name}. This is a contextual projection, not a separate business entity.` }
  };

  const appNode: ApplicationGraphNode = {
    id: applicationId,
    entityId: input.application.id,
    type: "application",
    label: input.application.name,
    shortLabel: input.application.name,
    category: "Application",
    status: input.application.status === "active" ? input.application.innovationStage : input.application.status,
    completeness: input.readiness.overall,
    isRequired: true,
    isBlocked: input.readiness.blockers.length > 0,
    hasEvidence: input.capabilities.some((capability) => capability.evidence.length > 0),
    tags: [input.application.slug, input.application.innovationStage, input.application.productStage],
    parentNodeId: portfolioId,
    childCount: groups.size,
    path: [portfolioId, applicationId],
    details: {
      description: input.application.description,
      owner: input.application.owner,
      innovationStage: input.application.innovationStage,
      productStage: input.application.productStage,
      applicationStatus: input.application.status,
      evidenceCount: input.capabilities.reduce((sum, capability) => sum + capability.evidence.length, 0),
      missingEvidence: !input.capabilities.some((capability) => capability.evidence.length > 0),
      blockerLabels: input.readiness.blockers.length ? [`${input.readiness.blockers.length} blocked capabilities`] : [],
      recommendations: input.readiness.overall < 100 ? ["Resolve required gaps and attach verified evidence before productization."] : [],
      links: linksFor(input.application)
    }
  };

  const nodes: ApplicationGraphNode[] = [portfolioNode, appNode];
  const edges: ApplicationGraphEdge[] = [{ id: `hierarchy:${portfolioId}:${applicationId}`, source: portfolioId, target: applicationId, type: "hierarchy", required: true }];
  const featureNodeByKey = new Map<string, ApplicationGraphNode>();
  const capabilityNodeByDefinitionId = new Map<string, ApplicationGraphNode>();

  const records = input.records ?? [];
  const recordById = new Map(records.map((record) => [record.id, record]));
  const appendedRecordIds = new Set<string>();
  const appendingRecordIds = new Set<string>();
  const appendRecord = (record: (typeof records)[number]) => {
    if (appendedRecordIds.has(record.id)) return;
    const parentRecord = record.parentId ? recordById.get(record.parentId) : undefined;
    if (parentRecord && !appendingRecordIds.has(parentRecord.id)) {
      appendingRecordIds.add(record.id);
      appendRecord(parentRecord);
      appendingRecordIds.delete(record.id);
    }
    const recordId = nodeId("requirement", record.id);
    const parentId = parentRecord && appendedRecordIds.has(parentRecord.id) ? nodeId("requirement", parentRecord.id) : applicationId;
    const parentNode = nodes.find((node) => node.id === parentId) ?? appNode;
    const blocked = ["missing", "broken"].includes(record.functionalState) || record.status === "blocked";
    nodes.push({
      id: recordId, entityId: record.id, type: "requirement", label: record.title, shortLabel: record.title,
      category: record.recordType.replace(/_/g, " "), status: record.functionalState,
      completeness: record.implementationCoverage ?? (record.functionalState === "verified_working" ? 100 : record.functionalState === "implemented" ? 90 : record.functionalState === "partially_implemented" ? 50 : 0),
      isRequired: record.recordType === "requirement", isBlocked: blocked, hasEvidence: Boolean(record.evidenceCount), tags: [record.recordType, record.key, record.priority],
      parentNodeId: parentId, childCount: 0, path: [...parentNode.path, recordId],
      details: { description: record.description, evidenceCount: record.evidenceCount ?? 0, missingEvidence: record.recordType === "requirement" && !record.evidenceCount, recommendations: !record.evidenceCount ? ["Attach verified evidence before claiming implementation."] : [] }
    });
    edges.push({ id: `hierarchy:${parentId}:${recordId}`, source: parentId, target: recordId, type: "hierarchy", required: record.recordType === "requirement" });
    appendedRecordIds.add(record.id);
  };
  records.forEach(appendRecord);

  for (const group of Array.from(groups.values()).sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))) {
    const domainId = nodeId("domain", `${input.application.id}:${group.key}`);
    const capabilityScores = group.capabilities.map((capability) => stateScore[capability.observedState]);
    const blocked = group.capabilities.some((capability) => blockedCapabilityIds.has(capability.id));
    const domainNode: ApplicationGraphNode = {
      id: domainId,
      entityId: group.key,
      type: "domain",
      label: group.label,
      shortLabel: group.label,
      category: "Domain",
      status: blocked ? "blocked" : average(capabilityScores) >= 90 ? "complete" : average(capabilityScores) > 0 ? "partial" : "not_started",
      completeness: average(capabilityScores),
      isRequired: group.capabilities.some((capability) => capability.applicability === "required"),
      isBlocked: blocked,
      hasEvidence: group.capabilities.some((capability) => capability.evidence.length > 0),
      tags: Array.from(new Set(group.capabilities.flatMap((capability) => [capability.capabilityDefinition.domain.key, ...capability.capabilityDefinition.tags]))),
      parentNodeId: applicationId,
      childCount: group.capabilities.length,
      path: [portfolioId, applicationId, domainId],
      details: {
        description: `${group.capabilities.length} application capabilities projected from the Product Engineering catalog.`,
        evidenceCount: group.capabilities.reduce((sum, capability) => sum + capability.evidence.length, 0),
        missingEvidence: group.capabilities.some((capability) => capability.applicability === "required" && capability.evidence.length === 0),
        blockerLabels: group.capabilities.filter((capability) => blockedCapabilityIds.has(capability.id)).map((capability) => capability.capabilityDefinition.name),
        recommendations: blocked ? ["Open blocked capabilities and inspect their required dependency edges."] : []
      }
    };
    nodes.push(domainNode);
    edges.push({ id: `hierarchy:${applicationId}:${domainId}`, source: applicationId, target: domainId, type: "hierarchy", required: true });

    for (const capability of group.capabilities.sort((left, right) => {
      const requiredOrder = Number(right.applicability === "required") - Number(left.applicability === "required");
      return requiredOrder || left.capabilityDefinition.name.localeCompare(right.capabilityDefinition.name);
    })) {
      const capabilityId = nodeId("capability", capability.id);
      const blockerLabels = capability.dependenciesFrom
        .filter((dependency) => dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState))
        .map((dependency) => dependency.toCapability.capabilityDefinition.name);
      const evidenceCount = capability.evidence.length;
      const verifiedEvidenceCount = capability.evidence.filter((evidence) => evidence.verificationStatus === "verified").length;
      const capabilityNode: ApplicationGraphNode = {
        id: capabilityId,
        entityId: capability.id,
        type: "capability",
        label: capability.capabilityDefinition.name,
        shortLabel: capability.capabilityDefinition.name,
        category: capability.capabilityDefinition.domain.name,
        status: blockerLabels.length ? "blocked" : capability.observedState,
        completeness: stateScore[capability.observedState],
        isRequired: capability.applicability === "required",
        isBlocked: blockerLabels.length > 0,
        hasEvidence: evidenceCount > 0,
        tags: [capability.capabilityDefinition.key, capability.capabilityDefinition.domain.key, ...capability.capabilityDefinition.tags],
        parentNodeId: domainId,
        childCount: capability.features.filter((feature) => feature.applicability !== "not_applicable").length,
        path: [portfolioId, applicationId, domainId, capabilityId],
        details: {
          description: capability.observedSummary || capability.targetDescription || capability.capabilityDefinition.description,
          owner: capability.owner,
          applicability: capability.applicability,
          targetState: capability.targetState,
          observedState: capability.observedState,
          lifecycleStatus: capability.lifecycleStatus,
          evidenceCount,
          verifiedEvidenceCount,
          missingEvidence: capability.applicability === "required" && evidenceCount === 0,
          blockerLabels,
          recommendations: [
            ...(capability.observedState === "unknown" ? ["Record an explicit observation for the current implementation state."] : []),
            ...(capability.applicability === "required" && evidenceCount === 0 ? ["Attach evidence for this required capability."] : []),
            ...(blockerLabels.length ? ["Complete or waive the required dependencies shown in dependency mode."] : [])
          ]
        }
      };
      nodes.push(capabilityNode);
      capabilityNodeByDefinitionId.set(capability.capabilityDefinition.id, capabilityNode);
      edges.push({ id: `hierarchy:${domainId}:${capabilityId}`, source: domainId, target: capabilityId, type: "hierarchy", required: true });

      for (const feature of capability.features.filter((item) => item.applicability !== "not_applicable")) {
        const featureId = nodeId("feature", feature.id);
        const featureEvidenceCount = feature.evidence.length;
        const featureNode: ApplicationGraphNode = {
          id: featureId,
          entityId: feature.id,
          type: "feature",
          label: feature.featureDefinition.name,
          shortLabel: feature.featureDefinition.name,
          category: "Feature",
          status: feature.observedState,
          completeness: stateScore[feature.observedState],
          isRequired: feature.applicability === "required",
          isBlocked: false,
          hasEvidence: featureEvidenceCount > 0,
          tags: [feature.featureDefinition.key, capability.capabilityDefinition.key],
          parentNodeId: capabilityId,
          childCount: 0,
          path: [portfolioId, applicationId, domainId, capabilityId, featureId],
          details: {
            description: feature.notes || feature.featureDefinition.description,
            applicability: feature.applicability,
            targetState: feature.targetState,
            observedState: feature.observedState,
            lifecycleStatus: feature.lifecycleStatus,
            evidenceCount: featureEvidenceCount,
            verifiedEvidenceCount: feature.evidence.filter((evidence) => evidence.verificationStatus === "verified").length,
            missingEvidence: feature.applicability === "required" && featureEvidenceCount === 0,
            recommendations: feature.observedState === "unknown" ? ["Record an explicit feature observation."] : []
          }
        };
        nodes.push(featureNode);
        featureNodeByKey.set(feature.featureDefinition.key, featureNode);
        edges.push({ id: `hierarchy:${capabilityId}:${featureId}`, source: capabilityId, target: featureId, type: "hierarchy", required: true });
      }
    }
  }

  for (const capability of input.capabilities) {
    for (const dependency of capability.dependenciesFrom) {
      const source = nodeId("capability", capability.id);
      const target = nodeId("capability", dependency.toCapability.id);
      const blocking = dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState);
      edges.push({
        id: `${blocking ? "blocks" : "dependency"}:${dependency.id}`,
        source,
        target,
        type: blocking ? "blocks" : "dependency",
        required: dependency.required,
        label: dependency.notes
      });
    }
  }

  appendImplementationProjection({
    applicationId: input.application.id,
    applicationNodeId: applicationId,
    architecture: input.architecture ?? [],
    featureNodeByKey,
    nodes,
    edges
  });

  appendExecutionProjection({
    applicationId: input.application.id,
    applicationNodeId: applicationId,
    procedures: input.procedures ?? [],
    projects: input.projects ?? [],
    capabilityNodeByDefinitionId,
    capabilityProcedures: input.capabilities.flatMap((capability) => (capability.capabilityDefinition.procedures ?? []).map((link) => ({
      capabilityDefinitionId: capability.capabilityDefinition.id,
      link
    }))),
    nodes,
    edges
  });

  const normalizeEntityType = (value?: string | null) => value === "company_record" ? "requirement" : value;
  for (const relation of input.relationships ?? []) {
    const source = nodes.find((node) => node.entityId === relation.fromEntityId && node.type === normalizeEntityType(relation.fromEntityType));
    const target = nodes.find((node) => node.entityId === relation.toEntityId && node.type === normalizeEntityType(relation.toEntityType));
    if (!source || !target) continue;
    edges.push({ id: `company-relation:${relation.id}`, source: source.id, target: target.id, type: relation.dependencyType === "blocks" ? "blocks" : relation.dependencyType === "related_to" ? "relates_to" : "dependency", required: relation.dependencyType === "requires" || relation.dependencyType === "depends_on", label: relation.dependencyType.replace(/_/g, " ") });
  }

  const childCounts = new Map<string, number>();
  for (const node of nodes) {
    if (node.parentNodeId) childCounts.set(node.parentNodeId, (childCounts.get(node.parentNodeId) ?? 0) + 1);
  }
  for (const node of nodes) node.childCount = childCounts.get(node.id) ?? 0;

  return {
    schemaVersion: "application-graph-v2",
    generatedAt: new Date().toISOString(),
    scope: "application",
    rootNodeId: portfolioId,
    applicationId: input.application.id,
    nodes,
    edges,
    projection: { sourceOfTruth: "product-engineering", initialDepth: 2, completeApplicationProjection: true, domainMappingVersion: "application-graph-domains-v1" }
  };
}
