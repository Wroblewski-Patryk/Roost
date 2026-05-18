export type LoadState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error?: string;
};

export type AuthPayload = {
  data?: {
    token: string;
    user: { email: string; name?: string | null };
    workspace: { name: string };
  };
  error?: string;
};

export type AuthMe = {
  authType: "user" | "api_key";
  userId?: string;
  workspaceId: string;
  workspaces?: WorkspaceSummary[];
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role?: string;
  active?: boolean;
  ownerUserId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RouteProposal = {
  id: string;
  title?: string;
  status?: string;
  targetDepartmentKey?: string;
  sourceType?: string;
  riskLevel?: string;
};

export type RouteProposalPacket = {
  summary?: Record<string, number>;
  proposals?: RouteProposal[];
  blockedActions?: string[];
};

export type OperationsWorkItem = {
  id: string;
  task: {
    id: string;
    title: string;
    description?: string | null;
    status?: string;
    normalizedStatus?: string;
    priority?: string;
    dueDate?: string | null;
    source?: string | null;
    externalId?: string | null;
    updatedAt?: string;
  };
  hierarchy?: {
    project?: { id: string; name: string; status?: string } | null;
    taskList?: { id: string; name: string; status?: string } | null;
  };
  readiness?: {
    blocked?: boolean;
    overdue?: boolean;
    dependencyCount?: number;
    riskLevel?: string;
    missingFields?: string[];
  };
  responsibility?: {
    status?: string;
    evidence?: Array<{ type?: string; status?: string; source?: string }>;
  };
  operationalContext?: {
    pipelineRuns?: Array<{ id: string; status?: string; source?: string }>;
  };
  evidence?: {
    dependencies?: Array<{ id: string; type?: string; status?: string }>;
    notes?: Array<{ id: string; content?: string; status?: string }>;
    events?: Array<{ id: string; type?: string; source?: string }>;
    projectResources?: Array<{ id: string; name?: string; type?: string }>;
  };
};

export type OperationsTaskList = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  source?: string | null;
  externalId?: string | null;
  taskCount?: number;
  project?: { id: string; name: string; status?: string } | null;
  areaAssignment?: {
    mappingId?: string;
    department?: OperationsDepartment | null;
    area?: OperationsArea | null;
  } | null;
};

export type OperationsStatusColumn = {
  key: string;
  label: string;
};

export type OperationsArea = {
  id: string;
  key: string;
  name: string;
  position?: number;
  isSystem?: boolean;
};

export type OperationsDepartment = {
  key: CoreAreaKey;
  backendAreaKey?: string;
  position?: number;
  operatingArea?: OperationsArea | null;
};

export type OperationsPacket = {
  summary?: Record<string, unknown>;
  operatingAreas?: OperationsArea[];
  departments?: OperationsDepartment[];
  taskLists?: OperationsTaskList[];
  statuses?: OperationsStatusColumn[];
  workItems?: OperationsWorkItem[];
  blockedActions?: Array<string | { action?: string; reason?: string }>;
  agentPacket?: {
    mode?: string;
    instructions?: string[];
    blockedActions?: Array<string | { action?: string; reason?: string }>;
  };
};

export type WorkforceEntity = {
  id: string;
  type: "human" | "agent";
  status: "active" | "inactive" | "paused" | "archived";
  name: string;
  slug: string;
  description?: string | null;
  avatar?: string | null;
  department?: string | null;
  role?: string | null;
  managerId?: string | null;
  manager?: { id: string; name: string; slug: string } | null;
  personalityProfile: "analytical" | "creative" | "executive" | "supportive" | "researcher" | "custom";
    model?: string | null;
    runtimeMode: "manual" | "semi_autonomous" | "autonomous";
    paperclipAgentId?: string | null;
    synchronizationEnabled: boolean;
    source?: string;
    externalId?: string | null;
    hierarchyLevel?: string | null;
    bigFiveProfile?: Record<string, number>;
    skillIndex?: string[];
    knowledgeIndex?: string[];
    toolIndex?: string[];
    authorityScope?: string[];
    paperclipProfile?: {
      url?: string;
      title?: string;
      runtimeStatus?: string;
      adapterType?: string;
      model?: string;
      scrapeDate?: string;
      toolCount?: number;
      knowledgeCount?: number;
      manager?: string | null;
      [key: string]: unknown;
    };
    syncStatus?: string;
  syncLog?: Array<{ at?: string; status?: string; message?: string; outboxId?: string }>;
  generatedFiles?: Record<string, string>;
  directReportCount?: number;
  readiness?: {
    score: number;
    total: number;
    status: string;
    riskLevel: string;
    missingFields: string[];
    nextAction: string;
    items: Array<{ key: string; label: string; done: boolean; detail: string }>;
  };
  authority?: {
    mode: string;
    riskLevel: string;
    recommendedProfiles: Array<{ id: string; label: string; riskLevel: string; description: string; scopes: string[] }>;
    visibleScopeSample: string[];
    supportedCapabilities: string[];
    blockedActions: Array<string | { action?: string; reason?: string }>;
  };
  work?: {
    assignmentModel: string;
    summary: { matched: number; active: number; blocked: number; overdue: number; taskLists: number };
    evidence: Array<{
      id: string;
      title: string;
      status: string;
      priority?: string;
      dueDate?: string | null;
      updatedAt?: string;
      project?: { id: string; name: string; status?: string } | null;
      taskList?: { id: string; name: string; status?: string } | null;
    }>;
    taskLists: Array<{ id: string; name: string; status?: string; count: number }>;
    gaps: Array<{ key: string; label: string; detail: string }>;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type WorkforcePacket = {
  summary?: Record<string, unknown>;
  entities?: WorkforceEntity[];
  dictionaries?: {
    types?: WorkforceEntity["type"][];
    statuses?: WorkforceEntity["status"][];
    runtimeModes?: WorkforceEntity["runtimeMode"][];
    personalityProfiles?: WorkforceEntity["personalityProfile"][];
    departments?: Array<{ key: string; backendAreaKey: string; position: number }>;
  };
  agentPacket?: {
    mode?: string;
    allowedActions?: string[];
    blockedActions?: Array<string | { action?: string; reason?: string }>;
  };
};

export type AssetResource = {
  id: string;
  sourceModel?: string;
  sourceId?: string;
  name: string;
  type?: string;
  resourceType?: string;
  status?: string;
  owner?: string | null;
  aiContextReady?: boolean;
  source?: {
    provider?: string | null;
    externalId?: string | null;
    parentExternalId?: string | null;
    webViewLink?: string | null;
    webContentLink?: string | null;
    thumbnailLink?: string | null;
    iconLink?: string | null;
    mimeType?: string | null;
    isFolder?: boolean;
  } | string | null;
  webViewLink?: string | null;
  organization?: {
    department?: string | null;
    departmentCanonical?: CoreAreaKey | null;
    folder?: string | null;
    table?: string | null;
    storageLocation?: string | null;
    knowledgeRoot?: string | null;
    visibility?: string | null;
    status?: string | null;
    tags?: string[];
  };
  aiCompatibility?: {
    readiness?: string;
    summary?: string | null;
    extractedEntities?: unknown[];
    aiContextReady?: boolean;
    contentSnapshot?: {
      id: string;
      contentKind?: string;
      scanStatus?: string;
      summary?: string | null;
      previewText?: string | null;
      textLength?: number;
      isTextTruncated?: boolean;
      structuredPreview?: unknown;
      hasExtractedText?: boolean;
      hasSummary?: boolean;
      createdAt?: string;
      updatedAt?: string;
    } | null;
  };
  relations?: {
    tasks?: Array<{ id: string; title?: string; status?: string }>;
    projects?: Array<{ id: string; name?: string; status?: string }>;
    pipelines?: Array<{ id: string; name?: string; status?: string }>;
    clients?: Array<{ id: string; name?: string; status?: string }>;
    agents?: Array<{ id: string; name?: string; status?: string }>;
    operatingArea?: { id: string; key: string; name: string } | null;
    process?: { id: string; name: string; status?: string } | null;
  };
  artifacts?: Array<{ id: string; type?: string; name?: string; status?: string }>;
  freshness?: {
    modifiedTime?: string | null;
    syncStatus?: string | null;
    scanStatus?: string | null;
    needsCleanup?: boolean;
  };
};

export type AssetsPacket = {
  department?: { canonicalKey?: string; backendAreaKey?: string; name?: string; purpose?: string };
  summary?: Record<string, unknown>;
  folders?: Array<{
    id: string;
    name: string;
    parentExternalId?: string | null;
    department?: string | null;
    syncStatus?: string | null;
    scanStatus?: string | null;
    webViewLink?: string | null;
  }>;
  knowledgeRoots?: Array<{ id: string; name: string; provider?: string | null }>;
  knowledgeItems?: Array<{ id: string; title: string; itemType?: string; status?: string }>;
  resources?: AssetResource[];
  blockedActions?: Array<string | { action?: string; reason?: string }>;
  agentPacket?: { mode?: string; instructions?: string[]; allowedActions?: string[]; blockedActions?: Array<string | { action?: string; reason?: string }> };
};

export type CoreAreaKey =
  | "00-ogolny"
  | "01-strategia"
  | "02-produkt"
  | "03-sprzedaz"
  | "04-operacje"
  | "05-relacje"
  | "06-kadry"
  | "07-finanse"
  | "08-zasoby"
  | "09-technologia"
  | "10-prawo"
  | "11-innowacje"
  | "12-zarzadzanie";

export type CoreArea = {
  key: CoreAreaKey;
  labelKey: string;
  eyebrowKey: string;
  href?: string;
  descriptionKey: string;
  icon: string;
  enabled?: boolean;
  views?: DepartmentView[];
};

export type DepartmentView = {
  key: string;
  labelKey: string;
  href?: string;
  icon?: string;
  enabled?: boolean;
};
