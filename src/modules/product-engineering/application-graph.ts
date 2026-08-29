import type {
  ApplicationStatus,
  CapabilityApplicability,
  CapabilityState,
  InnovationLifecycleStage,
  ProductLifecycleStage
} from "@prisma/client";

export type ApplicationGraphNodeType = "company" | "application" | "domain" | "capability" | "feature";
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
    evidenceCount?: number;
    verifiedEvidenceCount?: number;
    missingEvidence?: boolean;
    blockerLabels?: string[];
    recommendations?: string[];
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
  schemaVersion: "application-graph-v1";
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

function linksFor(application: GraphApplication | PortfolioApplication) {
  return [
    application.frontendUrl ? { label: "Open application", href: application.frontendUrl } : null,
    "backendUrl" in application && application.backendUrl ? { label: "Open API", href: application.backendUrl } : null,
    application.documentationUrl ? { label: "Documentation", href: application.documentationUrl } : null
  ].filter((link): link is { label: string; href: string } => Boolean(link));
}

export function buildPortfolioGraph(input: { workspace: { id: string; name: string }; applications: PortfolioApplication[] }): ApplicationGraphPacket {
  const rootId = nodeId("company", input.workspace.id);
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
    type: "company",
    label: input.workspace.name,
    shortLabel: input.workspace.name,
    category: "Company",
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
      description: "Application portfolio owned by the current Roost workspace.",
      evidenceCount: applicationNodes.reduce((sum, node) => sum + (node.details.evidenceCount ?? 0), 0),
      recommendations: applicationNodes.length ? [] : ["Create the first application in Product Engineering."]
    }
  };

  return {
    schemaVersion: "application-graph-v1",
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
  readiness: { overall: number; blockers: Array<{ capabilityId: string }> };
}): ApplicationGraphPacket {
  const companyId = nodeId("company", input.workspace.id);
  const applicationId = nodeId("application", input.application.id);
  const blockedCapabilityIds = new Set(input.readiness.blockers.map((blocker) => blocker.capabilityId));
  const groups = new Map<string, { key: string; label: string; order: number; capabilities: GraphCapability[] }>();

  for (const capability of input.capabilities.filter((item) => item.applicability !== "not_applicable")) {
    const mapped = graphDomainFor(capability.capabilityDefinition.domain.key, capability.capabilityDefinition.domain.name);
    const group = groups.get(mapped.key) ?? { ...mapped, capabilities: [] };
    group.capabilities.push(capability);
    groups.set(mapped.key, group);
  }

  const companyNode: ApplicationGraphNode = {
    id: companyId,
    entityId: input.workspace.id,
    type: "company",
    label: input.workspace.name,
    shortLabel: input.workspace.name,
    category: "Company",
    status: "active",
    completeness: input.readiness.overall,
    isRequired: true,
    isBlocked: input.readiness.blockers.length > 0,
    hasEvidence: input.capabilities.some((capability) => capability.evidence.length > 0),
    tags: ["portfolio", "product-engineering"],
    parentNodeId: null,
    childCount: 1,
    path: [companyId],
    details: { description: "Application portfolio owned by the current Roost workspace." }
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
    parentNodeId: companyId,
    childCount: groups.size,
    path: [companyId, applicationId],
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

  const nodes: ApplicationGraphNode[] = [companyNode, appNode];
  const edges: ApplicationGraphEdge[] = [{ id: `hierarchy:${companyId}:${applicationId}`, source: companyId, target: applicationId, type: "hierarchy", required: true }];

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
      path: [companyId, applicationId, domainId],
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
      nodes.push({
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
        path: [companyId, applicationId, domainId, capabilityId],
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
      });
      edges.push({ id: `hierarchy:${domainId}:${capabilityId}`, source: domainId, target: capabilityId, type: "hierarchy", required: true });

      for (const feature of capability.features.filter((item) => item.applicability !== "not_applicable")) {
        const featureId = nodeId("feature", feature.id);
        const featureEvidenceCount = feature.evidence.length;
        nodes.push({
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
          path: [companyId, applicationId, domainId, capabilityId, featureId],
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
        });
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

  return {
    schemaVersion: "application-graph-v1",
    generatedAt: new Date().toISOString(),
    scope: "application",
    rootNodeId: companyId,
    applicationId: input.application.id,
    nodes,
    edges,
    projection: { sourceOfTruth: "product-engineering", initialDepth: 2, completeApplicationProjection: true, domainMappingVersion: "application-graph-domains-v1" }
  };
}
