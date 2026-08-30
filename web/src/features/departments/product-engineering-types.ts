export type Readiness = {
  overall: number;
  dimensions: Array<{
    key: string;
    name: string;
    score: number;
    components: {
      capabilityState: number;
      definitionOfDoneDimensions: number;
      verifiedEvidenceCoverage: number;
    };
  }>;
  blockers: Array<{ capabilityId: string; blockedByCapabilityId: string; reason: string }>;
};

export type ProductApplication = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  problemStatement?: string | null;
  targetUsers?: string | null;
  valueProposition?: string | null;
  applicationType: string;
  owner?: string | null;
  innovationStage: string;
  productStage: string;
  status: string;
  businessModel?: string | null;
  targetPlatforms: string[];
  frontendUrl?: string | null;
  backendUrl?: string | null;
  documentationUrl?: string | null;
  metadata?: Record<string, unknown>;
  updatedAt: string;
  readiness?: Readiness;
  gapSummary?: { total: number; blockers: number };
  offerings?: ProductOffering[];
  repositories?: Array<{ id: string; name: string; url: string; defaultBranch?: string | null; purpose?: string | null; isPrimary: boolean }>;
  architecture?: Array<{ id: string; type: string; name: string; description?: string; technologyDefinition?: TechnologyDefinition }>;
  technologies?: Array<{ id: string; purpose?: string; version?: string; technologyDefinition: TechnologyDefinition }>;
  interfaces?: Array<{ id: string; type: string; key: string; name: string; reference?: string; requiresApproval: boolean; auditRequired: boolean }>;
  procedures?: ApplicationProcedureLink[];
  projects?: ApplicationProjectLink[];
};

export type ProcedureSummary = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  version: number;
  expectedResult?: string | null;
  process?: { id: string; name: string } | null;
  steps: Array<{ id: string; stepOrder: number; instruction: string; stepType: string }>;
};

export type ApplicationProcedureLink = { relationType: string; required: boolean; procedure: ProcedureSummary };

export type ProjectSummary = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  taskLists?: Array<{ id: string; name: string; status: string; tasks: Array<{ id: string; title: string; status: string }> }>;
  tasks?: Array<{ id: string; title: string; status: string }>;
};

export type ApplicationProjectLink = { relationType: string; project: ProjectSummary };

export type CapabilityDefinition = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  universal: boolean;
  defaultApplicability: string;
  domain: { id: string; key: string; name: string };
  readinessDimension?: { id: string; key: string; name: string } | null;
  features?: Array<{ id: string; key: string; name: string }>;
  procedures?: Array<{ relationType: string; required: boolean; procedure: ProcedureSummary }>;
};

export type ApplicationCapability = {
  id: string;
  applicability: string;
  priority: number;
  targetState: string;
  observedState: string;
  lifecycleStatus: string;
  implementationStrategy: string;
  targetDescription?: string | null;
  observedSummary?: string | null;
  capabilityDefinition: CapabilityDefinition;
  dimensions: Array<{ id: string; key: string; name: string; applicability: string; targetState: string; observedState: string }>;
  evidence: Array<{ id: string; type: string; reference: string; verificationStatus: string; observedAt: string }>;
  dependenciesFrom: Array<{ id: string; required: boolean; toCapability: { id: string; observedState: string } }>;
  interfaces: Array<{ id: string; type: string; name: string }>;
};

export type ProductGap = {
  id: string;
  key: string;
  name: string;
  applicability: string;
  targetState: string;
  observedState: string;
  priority: number;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  blocked: boolean;
  severity: string;
  domain: { key: string; name: string };
  blockedBy: Array<{ id: string; observedState: string }>;
};

export type TechnologyDefinition = { id: string; key: string; name: string; category: string };

export type ProductEngineeringCatalog = {
  domains: Array<{ id: string; key: string; name: string; description?: string; capabilities: CapabilityDefinition[] }>;
  dimensions: Array<{ id: string; key: string; name: string; weight: number }>;
  packs: Array<{ id: string; key: string; name: string; description?: string; items: Array<{ id: string; capabilityDefinition: CapabilityDefinition }> }>;
  blueprints: Array<{ id: string; key: string; name: string; description?: string; capabilities: Array<{ id: string; capabilityDefinition: CapabilityDefinition }> }>;
  technologies: TechnologyDefinition[];
};

export type ProductOffering = {
  id: string;
  key: string;
  name: string;
  type: string;
  description?: string | null;
  valueProposition?: string | null;
  customerSegment?: string | null;
  businessModel?: string | null;
  lifecycleStage: string;
  commercialStatus: string;
  salesReadiness: string;
  supportReadiness: string;
  application?: ProductApplication | null;
};
