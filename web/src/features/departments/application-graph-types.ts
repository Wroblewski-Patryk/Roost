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

export type ApplicationGraphMode = "structure" | "progress" | "dependencies" | "agent-ready" | "productization";
