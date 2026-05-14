import React, { useEffect, useState } from "react";

export type IntegrationState = {
  configured: boolean;
  active: boolean;
  oauthClientConfigured?: boolean;
  oauthTokenConfigured?: boolean;
  config?: {
    listIds?: string[];
    selectedFolderIds?: string[];
    rootFolderIds?: string[];
  };
};

export type OperatingArea = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  tables?: Array<{
    id: string;
    tableName?: string;
    name: string;
    apiSlug: string;
    source?: string;
    externalId?: string | null;
  }>;
};

export type ConnectionData = {
  workspace: {
    id: string;
    name: string;
  };
  user?: {
    email?: string;
    name?: string;
  };
  operatingModel: {
    areas: OperatingArea[];
    systemTables: string[];
  };
  capabilities: string[];
  scopeMode?: "broad" | "scoped";
  mcpManifest?: McpManifest;
  integrations: {
    clickup: IntegrationState;
    googleDrive: IntegrationState;
  };
};

type ConnectionResponse = {
  data: ConnectionData;
};

export type McpTool = {
  name: string;
  title: string;
  description: string;
  method: string;
  path: string;
  capability: string;
  riskLevel: "read" | "write" | "destructive";
  requiresApproval: boolean;
  inputSchema: {
    type: "object";
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
  };
};

export type McpManifest = {
  schemaVersion: string;
  service: string;
  purpose: string;
  transport: {
    preferred: string;
    upstreamProtocol: string;
    backendAccess: string;
  };
  auth: {
    type: string;
    header: string;
    workspaceScoped: boolean;
    capabilityScoped: boolean;
  };
  guardrails: string[];
  tools: McpTool[];
};

type McpManifestResponse = {
  data: McpManifest;
};

export type DashboardState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData };

export type NoticeTone = "info" | "success" | "warning" | "error";

export type TableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  className?: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  source?: string | null;
  externalId?: string | null;
  taskList?: {
    id: string;
    name: string;
    externalId?: string | null;
    source?: string | null;
  } | null;
};

type TasksResponse = {
  data: TaskRecord[];
};

export type ExternalContainerMapping = {
  id: string;
  provider: string;
  entityType: string;
  externalId: string;
  name?: string | null;
  areaId?: string | null;
  folderId?: string | null;
  tableId?: string | null;
  raw?: Record<string, unknown> | null;
};

type ExternalMappingsResponse = {
  data: ExternalContainerMapping[];
};

export type GoogleDriveFileRecord = {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  description?: string | null;
  mimeType: string;
  parentExternalId?: string | null;
  isFolder: boolean;
  trashed: boolean;
  webViewLink?: string | null;
  operatingAreaId?: string | null;
  operatingFolderId?: string | null;
  operatingTableId?: string | null;
  syncStatus?: string | null;
  scanStatus?: string | null;
  modifiedTime?: string | null;
};

type GoogleDriveFilesResponse = {
  data: GoogleDriveFileRecord[];
};

export type TableRecordSnapshot = Record<string, Array<Record<string, unknown>>>;

type TableRecordsResponse = {
  data: Array<Record<string, unknown>>;
};

type ExternalMappingScopeResponse = {
  data: ExternalContainerMapping;
};

type GoogleDriveScopeResponse = {
  data: {
    updatedCount: number;
    files: GoogleDriveFileRecord[];
  };
};

type OperatingAreaResponse = {
  data: OperatingArea;
};

type DeleteOperatingAreaResponse = {
  data: {
    id: string;
    deleted: boolean;
    reassignedToAreaId: string;
  };
};

export type CompanyOsCounts = Record<string, Record<string, number>>;

export type CompanyOsCollectionName =
  | "processes"
  | "pipelines"
  | "pipeline-stages"
  | "procedures"
  | "procedure-steps"
  | "company-roles"
  | "resources"
  | "tool-adapters"
  | "integration-capabilities"
  | "standards"
  | "pipeline-runs"
  | "stage-runs"
  | "approvals"
  | "checklist-templates"
  | "checklist-items"
  | "acceptance-criteria"
  | "audit-logs"
  | "policies"
  | "metrics"
  | "risks"
  | "controls"
  | "knowledge-items"
  | "decision-logs"
  | "automation-rules"
  | "triggers"
  | "artifacts"
  | "dependencies"
  | "business-functions"
  | "stakeholders";

const companyOsCollectionNames = new Set<string>([
  "processes",
  "pipelines",
  "pipeline-stages",
  "procedures",
  "procedure-steps",
  "company-roles",
  "resources",
  "tool-adapters",
  "integration-capabilities",
  "standards",
  "pipeline-runs",
  "stage-runs",
  "approvals",
  "checklist-templates",
  "checklist-items",
  "acceptance-criteria",
  "audit-logs",
  "policies",
  "metrics",
  "risks",
  "controls",
  "knowledge-items",
  "decision-logs",
  "automation-rules",
  "triggers",
  "artifacts",
  "dependencies",
  "business-functions",
  "stakeholders"
]);

export function tableRecordApiPath(apiSlug: string) {
  return companyOsCollectionNames.has(apiSlug)
    ? `/v1/company-os/${apiSlug}`
    : `/v1/${apiSlug}`;
}

export type CompanyOsRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  type?: string | null;
  externalProvider?: string | null;
  externalId?: string | null;
  provider?: string | null;
  purpose?: string | null;
  description?: string | null;
  category?: string | null;
  checklistId?: string | null;
  validationMethod?: string | null;
  ownerRoleId?: string | null;
  version?: number | null;
  capabilityKey?: string | null;
  ruleType?: string | null;
  enforcementMode?: string | null;
  severity?: string | null;
  validationStatus?: string | null;
  criteria?: string | null;
  statement?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  healthStatus?: string | null;
  connectionStatus?: string | null;
  actorType?: string | null;
  requestedByType?: string | null;
  requestedForAction?: string | null;
  eventType?: string | null;
  action?: string | null;
  correlationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  approvalId?: string | null;
  auditLogId?: string | null;
  processId?: string | null;
  procedureId?: string | null;
  pipelineId?: string | null;
  pipelineRunId?: string | null;
  pipelineStageId?: string | null;
  stageRunId?: string | null;
  targetId?: string | null;
  text?: string | null;
  required?: boolean | null;
  validationResult?: Record<string, unknown> | null;
  inputPayload?: Record<string, unknown> | null;
  outputPayload?: Record<string, unknown> | null;
  approvalStatus?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  timestamp?: string | null;
  pipeline?: {
    name?: string | null;
  } | null;
  currentStage?: {
    name?: string | null;
  } | null;
  approverRole?: {
    name?: string | null;
  } | null;
  process?: {
    name?: string | null;
  } | null;
  relatedProcess?: {
    name?: string | null;
  } | null;
  relatedProject?: {
    name?: string | null;
  } | null;
  defaultOwnerRole?: {
    name?: string | null;
  } | null;
  ownerRole?: {
    name?: string | null;
  } | null;
  controls?: unknown[];
  capabilities?: unknown[];
};

export type CompanyOsData = {
  service: "company-os";
  workspaceId: string;
  counts: CompanyOsCounts;
  attention: {
    pendingApprovals: CompanyOsRecord[];
    blockedPipelineRuns: CompanyOsRecord[];
    failedStageRuns: CompanyOsRecord[];
    highRisks: CompanyOsRecord[];
    unhealthyAdapters: CompanyOsRecord[];
  };
  recent: {
    pipelineRuns: CompanyOsRecord[];
    approvals: CompanyOsRecord[];
    auditLogs: CompanyOsRecord[];
    events: CompanyOsRecord[];
  };
  collections: string[];
};

type CompanyOsResponse = {
  data: CompanyOsData;
};

type CompanyOsCollectionResponse = {
  data: CompanyOsRecord[];
};

type CompanyOsRecordResponse = {
  data: CompanyOsRecord;
};

type CompanyOsActionResponse = {
  data: CompanyOsRecord & {
    correlationId?: string;
    auditLogId?: string;
  };
};

export type WorkflowDefinitionRootType = "process" | "pipeline" | "procedure";

export type CompanyOsWorkflowDraftInput = {
  rootObjectType: WorkflowDefinitionRootType;
  rootObjectId: string;
  name: string;
  reason: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  changeSet: Record<string, unknown>;
  idempotencyKey?: string;
  sourceChannel?: string;
};

export type CompanyOsWorkflowDraftActivationInput = {
  approvalId?: string;
  sourceChannel?: string;
};

export type CompanyOsWorkflowArchiveInput = {
  reason: string;
  idempotencyKey?: string;
  sourceChannel?: string;
};

export type CompanyOsWorkflowRollbackDraftInput = {
  reason: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  idempotencyKey?: string;
  sourceChannel?: string;
};

export type CompanyOsWorkflowDraft = CompanyOsRecord & {
  rootObjectType?: WorkflowDefinitionRootType;
  rootObjectId?: string;
  baseVersion?: number;
  proposedVersion?: number;
  changeSet?: Record<string, unknown>;
  impactPreview?: CompanyOsWorkflowImpactPreview | null;
};

export type CompanyOsWorkflowImpactPreview = {
  approvalRequired: boolean;
  approvalReasons: string[];
  counts?: Record<string, number>;
  affectedRuntime?: Array<Record<string, unknown>>;
  rollbackCandidate?: Record<string, unknown> | null;
};

type CompanyOsWorkflowDraftResponse = {
  data: CompanyOsWorkflowDraft & {
    correlationId?: string;
    auditLogId?: string;
    impactPreview?: CompanyOsWorkflowImpactPreview | null;
    activatedRoot?: CompanyOsRecord;
    activatedRootObjectId?: string;
  };
};

type CompanyOsWorkflowDraftListResponse = {
  data: CompanyOsWorkflowDraft[];
};

type CompanyOsWorkflowArchiveResponse = {
  data: CompanyOsRecord & {
    rootObjectType?: WorkflowDefinitionRootType;
    rootObjectId?: string;
    archived?: boolean;
    activeRuntimeDependencies?: number;
    correlationId?: string;
    auditLogId?: string;
  };
};

export type CompanyOsStandardInput = {
  name: string;
  category: string;
  description?: string | null;
  checklistId?: string | null;
  validationMethod?: string | null;
  ownerRoleId?: string | null;
  status?: "draft" | "active" | "paused" | "archived" | "retired" | "deprecated";
};

export type CompanyOsStandardUpdateInput = Partial<CompanyOsStandardInput>;

export type CompanyOsAutomationEvaluationInput = {
  ruleIds?: string[];
  mode?: "dry_run" | "execute";
  idempotencyKey?: string;
  context?: Record<string, unknown>;
};

export type CompanyOsAutomationEvaluation = {
  mode: "dry_run" | "execute";
  sourceEventId: string;
  correlationId?: string;
  matchedRuleIds: string[];
  proposals: Array<{
    ruleId: string;
    ruleName: string;
    actionKind: string;
    requiresApproval: boolean;
    riskLevel: string;
  }>;
  skipped: Array<Record<string, unknown>>;
  executed: Array<Record<string, unknown>>;
  emittedEventIds: string[];
  auditLogIds: string[];
};

type CompanyOsAutomationEvaluationResponse = {
  data: CompanyOsAutomationEvaluation;
};

export type TasksWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData; tasks: TaskRecord[] };

export type IntegrationWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData };

export type AreasWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      connection: ConnectionData;
      externalMappings: ExternalContainerMapping[];
      googleDriveFiles: GoogleDriveFileRecord[];
      tableRecords: TableRecordSnapshot;
    };

export type CompanyOsWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData; companyOs: CompanyOsData };

export type CompanyOsCollectionState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: CompanyOsRecord[] };

export type CompanyOsRecordDetailState =
  | { status: "idle" }
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; record: CompanyOsRecord };

export type CompanyOsAgentContext = {
  tasks: TaskRecord[];
  pipelines: CompanyOsRecord[];
  procedures: CompanyOsRecord[];
  toolAdapters: CompanyOsRecord[];
  resources: CompanyOsRecord[];
  policies: CompanyOsRecord[];
  risks: CompanyOsRecord[];
  pipelineRuns: CompanyOsRecord[];
  pipelineStages: CompanyOsRecord[];
  stageRuns: CompanyOsRecord[];
  acceptanceCriteria: CompanyOsRecord[];
  approvals: CompanyOsRecord[];
  automationRules: CompanyOsRecord[];
  events: CompanyOsRecord[];
};

export type CompanyOsAgentContextState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; context: CompanyOsAgentContext };

export type AgentToolSurfaceState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData; manifest: McpManifest };

export type CompanyOsApprovalRequestInput = {
  requestedByType: "user" | "agent" | "system" | "integration";
  requestedById?: string;
  requestedForAction: string;
  resourceType: string;
  resourceId?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  inputPayload?: Record<string, unknown>;
};

export type CompanyOsApprovalDecisionInput = {
  decision: "approved" | "rejected";
  decisionReason: string;
};

export type CompanyOsStartStageInput = {
  pipelineStageId: string;
  assignedActorType?: "user" | "agent" | "system" | "integration";
  assignedActorId?: string;
  inputPayload?: Record<string, unknown>;
  approvalId?: string;
};

export type CompanyOsBlockStageInput = {
  reason: string;
  approvalId?: string;
  errorState?: Record<string, unknown>;
};

export type CompanyOsValidateStageInput = {
  validationStatus?: "not_started" | "pending" | "passed" | "failed" | "waived";
  validationResult?: Record<string, unknown>;
  acceptanceCriteria?: Array<{
    id: string;
    validationStatus: "not_started" | "pending" | "passed" | "failed" | "waived";
    evidence?: Record<string, unknown>;
  }>;
};

export type CompanyOsCompleteStageInput = {
  outputPayload?: Record<string, unknown>;
  validationResult?: Record<string, unknown>;
  approvalId?: string;
};

export function ownerToken() {
  return window.sessionStorage.getItem("companycoreOwnerToken");
}

export async function loadConnection(token: string): Promise<ConnectionData> {
  const response = await fetch("/v1/connection", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as ConnectionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "connection_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadMcpManifest(token: string): Promise<McpManifest> {
  const response = await fetch("/v1/mcp/manifest", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as McpManifestResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "mcp_manifest_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadTasks(token: string): Promise<TaskRecord[]> {
  const response = await fetch("/v1/tasks", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as TasksResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "tasks_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadExternalMappings(token: string): Promise<ExternalContainerMapping[]> {
  const response = await fetch("/v1/operating-model/external-mappings", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as ExternalMappingsResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "external_mappings_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadGoogleDriveFiles(token: string): Promise<GoogleDriveFileRecord[]> {
  const response = await fetch("/v1/google-drive/files", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as GoogleDriveFilesResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "google_drive_files_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadTableRecordSnapshot(
  token: string,
  connection: ConnectionData
): Promise<TableRecordSnapshot> {
  const tables = connection.operatingModel.areas.flatMap((area) => area.tables || []);
  const readableCapabilities = new Set(connection.capabilities);
  const uniqueTables = [...new Map(tables
    .filter((table) => readableCapabilities.has(`${table.apiSlug}:read`))
    .map((table) => [table.apiSlug, table])).values()];
  const entries = await Promise.all(uniqueTables.map(async (table) => {
    try {
      const response = await fetch(tableRecordApiPath(table.apiSlug), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const body = await response.json() as TableRecordsResponse | { error?: string };
      return [table.apiSlug, response.ok && "data" in body ? body.data : []] as const;
    } catch {
      return [table.apiSlug, []] as const;
    }
  }));

  return Object.fromEntries(entries);
}

export async function assignExternalMappingScope(
  token: string,
  mappingId: string,
  areaId: string
): Promise<ExternalContainerMapping> {
  const response = await fetch(`/v1/operating-model/external-mappings/${mappingId}/scope`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ areaId, applyToChildren: true })
  });
  const body = await response.json() as ExternalMappingScopeResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "external_mapping_scope_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function assignGoogleDriveFileScope(
  token: string,
  fileId: string,
  areaId: string
): Promise<GoogleDriveFileRecord[]> {
  const response = await fetch(`/v1/google-drive/files/${fileId}/scope`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ areaId, applyToChildren: true })
  });
  const body = await response.json() as GoogleDriveScopeResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "google_drive_scope_failed";
    throw new Error(message);
  }

  return body.data.files;
}

export async function createOperatingArea(
  token: string,
  input: { name: string; description?: string }
): Promise<OperatingArea> {
  const response = await fetch("/v1/operating-model/areas", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as OperatingAreaResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "operating_area_create_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function deleteOperatingArea(
  token: string,
  areaId: string,
  reassignToAreaId: string
): Promise<DeleteOperatingAreaResponse["data"]> {
  const response = await fetch(`/v1/operating-model/areas/${areaId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reassignToAreaId })
  });
  const body = await response.json() as DeleteOperatingAreaResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "operating_area_delete_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadCompanyOs(token: string): Promise<CompanyOsData> {
  const response = await fetch("/v1/company-os", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadCompanyOsCollection(
  token: string,
  collection: CompanyOsCollectionName,
  limit = 25
): Promise<CompanyOsRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/v1/company-os/${collection}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsCollectionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_collection_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadCompanyOsRecord(
  token: string,
  collection: CompanyOsCollectionName,
  id: string
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/${collection}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsRecordResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_record_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function createCompanyOsStandard(
  token: string,
  input: CompanyOsStandardInput
): Promise<CompanyOsRecord> {
  const response = await fetch("/v1/company-os/standards", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_standard_create_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function updateCompanyOsStandard(
  token: string,
  standardId: string,
  input: CompanyOsStandardUpdateInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/standards/${standardId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_standard_update_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function archiveCompanyOsStandard(
  token: string,
  standardId: string
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/standards/${standardId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_standard_archive_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function createCompanyOsWorkflowDraft(
  token: string,
  input: CompanyOsWorkflowDraftInput
): Promise<CompanyOsWorkflowDraft> {
  const response = await fetch("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsWorkflowDraftResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_draft_create_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function loadCompanyOsWorkflowDrafts(
  token: string,
  filters: {
    rootObjectType?: WorkflowDefinitionRootType;
    status?: "draft" | "active" | "paused" | "archived" | "retired" | "deprecated";
    limit?: number;
  } = {}
): Promise<CompanyOsWorkflowDraft[]> {
  const params = new URLSearchParams();
  if (filters.rootObjectType) {
    params.set("rootObjectType", filters.rootObjectType);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const response = await fetch(`/v1/company-os/workflow-definitions/drafts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsWorkflowDraftListResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_drafts_load_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function previewCompanyOsWorkflowDraftImpact(
  token: string,
  draftId: string
): Promise<CompanyOsWorkflowDraft> {
  const response = await fetch(`/v1/company-os/workflow-definitions/drafts/${draftId}/actions/preview-impact`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as CompanyOsWorkflowDraftResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_draft_preview_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function activateCompanyOsWorkflowDraft(
  token: string,
  draftId: string,
  input: CompanyOsWorkflowDraftActivationInput = {}
): Promise<CompanyOsWorkflowDraft> {
  const response = await fetch(`/v1/company-os/workflow-definitions/drafts/${draftId}/actions/activate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsWorkflowDraftResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_draft_activation_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function archiveCompanyOsWorkflowVersion(
  token: string,
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string,
  input: CompanyOsWorkflowArchiveInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/workflow-definitions/${rootObjectType}/${rootObjectId}/actions/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsWorkflowArchiveResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_archive_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function createCompanyOsWorkflowRollbackDraft(
  token: string,
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string,
  input: CompanyOsWorkflowRollbackDraftInput
): Promise<CompanyOsWorkflowDraft> {
  const response = await fetch(`/v1/company-os/workflow-definitions/${rootObjectType}/${rootObjectId}/actions/create-rollback-draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsWorkflowDraftResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_workflow_rollback_draft_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function requestCompanyOsApproval(
  token: string,
  input: CompanyOsApprovalRequestInput
): Promise<CompanyOsRecord> {
  const response = await fetch("/v1/company-os/approvals/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_approval_request_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function decideCompanyOsApproval(
  token: string,
  approvalId: string,
  input: CompanyOsApprovalDecisionInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/approvals/${approvalId}/decision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_approval_decision_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function startCompanyOsStage(
  token: string,
  pipelineRunId: string,
  input: CompanyOsStartStageInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/pipeline-runs/${pipelineRunId}/actions/start-stage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_stage_start_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function blockCompanyOsStage(
  token: string,
  stageRunId: string,
  input: CompanyOsBlockStageInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/stage-runs/${stageRunId}/actions/block`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_stage_block_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function validateCompanyOsStage(
  token: string,
  stageRunId: string,
  input: CompanyOsValidateStageInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/stage-runs/${stageRunId}/actions/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_stage_validate_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function completeCompanyOsStage(
  token: string,
  stageRunId: string,
  input: CompanyOsCompleteStageInput
): Promise<CompanyOsRecord> {
  const response = await fetch(`/v1/company-os/stage-runs/${stageRunId}/actions/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsActionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_stage_complete_failed";
    throw new Error(message);
  }

  return body.data;
}

export async function evaluateCompanyOsAutomationRules(
  token: string,
  eventId: string,
  input: CompanyOsAutomationEvaluationInput
): Promise<CompanyOsAutomationEvaluation> {
  const response = await fetch(`/v1/company-os/events/${eventId}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json() as CompanyOsAutomationEvaluationResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "company_os_automation_evaluation_failed";
    throw new Error(message);
  }

  return body.data;
}

export function useDashboardState(): [DashboardState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setDashboardState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setDashboardState({ status: "loading" });
    loadConnection(token)
      .then((connection) => {
        if (!cancelled) {
          setDashboardState({ status: "ready", connection });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setDashboardState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the company dashboard."
              : "CompanyCore could not load the owner dashboard. Try again or return to the current dashboard."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [dashboardState, () => setReloadKey((value) => value + 1)];
}

export function useTasksWorkbenchState(): [TasksWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [tasksState, setTasksState] = useState<TasksWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setTasksState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setTasksState({ status: "loading" });
    Promise.all([
      loadConnection(token),
      loadTasks(token)
    ])
      .then(([connection, tasks]) => {
        if (!cancelled) {
          setTasksState({ status: "ready", connection, tasks });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setTasksState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the task workbench."
              : "CompanyCore could not load task records. Try again or use the current task adapter."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [tasksState, () => setReloadKey((value) => value + 1)];
}

export function useIntegrationWorkbenchState(): [IntegrationWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [integrationState, setIntegrationState] = useState<IntegrationWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setIntegrationState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setIntegrationState({ status: "loading" });
    loadConnection(token)
      .then((connection) => {
        if (!cancelled) {
          setIntegrationState({ status: "ready", connection });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setIntegrationState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the integration map."
              : "CompanyCore could not load the integration map. Try again or use the current integration map."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [integrationState, () => setReloadKey((value) => value + 1)];
}

export function useAreasWorkbenchState(): [AreasWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [areasState, setAreasState] = useState<AreasWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setAreasState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setAreasState({ status: "loading" });
    loadConnection(token)
      .then(async (connection) => {
        const [externalMappings, googleDriveFiles, tableRecords] = await Promise.all([
          loadExternalMappings(token),
          loadGoogleDriveFiles(token),
          loadTableRecordSnapshot(token, connection)
        ]);

        return { connection, externalMappings, googleDriveFiles, tableRecords };
      })
      .then(({ connection, externalMappings, googleDriveFiles, tableRecords }) => {
        if (!cancelled) {
          setAreasState({ status: "ready", connection, externalMappings, googleDriveFiles, tableRecords });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setAreasState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load operating areas."
              : "CompanyCore could not load operating areas. Try again or use the current operating areas view."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [areasState, () => setReloadKey((value) => value + 1)];
}

export function useCompanyOsWorkbenchState(): [CompanyOsWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [companyOsState, setCompanyOsState] = useState<CompanyOsWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setCompanyOsState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setCompanyOsState({ status: "loading" });
    Promise.all([
      loadConnection(token),
      loadCompanyOs(token)
    ])
      .then(([connection, companyOs]) => {
        if (!cancelled) {
          setCompanyOsState({ status: "ready", connection, companyOs });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setCompanyOsState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the Company OS cockpit."
              : "CompanyCore could not load Company OS records. Try again or review the current dashboard."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [companyOsState, () => setReloadKey((value) => value + 1)];
}

export function useCompanyOsCollectionState(
  collection: CompanyOsCollectionName
): [CompanyOsCollectionState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [collectionState, setCollectionState] = useState<CompanyOsCollectionState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setCollectionState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setCollectionState({ status: "loading" });
    loadCompanyOsCollection(token, collection)
      .then((records) => {
        if (!cancelled) {
          setCollectionState({ status: "ready", records });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setCollectionState({
            status: "error",
            message: `CompanyCore could not load ${collection}. ${error.message}`
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [collection, reloadKey]);

  return [collectionState, () => setReloadKey((value) => value + 1)];
}

export function useCompanyOsRecordDetailState(
  collection: CompanyOsCollectionName,
  recordId: string
): [CompanyOsRecordDetailState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [recordState, setRecordState] = useState<CompanyOsRecordDetailState>(() => (
    recordId ? (ownerToken() ? { status: "loading" } : { status: "signed-out" }) : { status: "idle" }
  ));

  useEffect(() => {
    if (!recordId) {
      setRecordState({ status: "idle" });
      return;
    }

    const token = ownerToken();
    if (!token) {
      setRecordState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setRecordState({ status: "loading" });
    loadCompanyOsRecord(token, collection, recordId)
      .then((record) => {
        if (!cancelled) {
          setRecordState({ status: "ready", record });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setRecordState({
            status: "error",
            message: error.message === "not_found"
              ? "The selected Company OS record no longer exists."
              : `CompanyCore could not load the selected ${collection} record.`
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [collection, recordId, reloadKey]);

  return [recordState, () => setReloadKey((value) => value + 1)];
}

export function useCompanyOsAgentContextState(): [CompanyOsAgentContextState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [contextState, setContextState] = useState<CompanyOsAgentContextState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setContextState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setContextState({ status: "loading" });
    Promise.all([
      loadTasks(token),
      loadCompanyOsCollection(token, "pipelines", 8),
      loadCompanyOsCollection(token, "procedures", 8),
      loadCompanyOsCollection(token, "tool-adapters", 8),
      loadCompanyOsCollection(token, "resources", 10),
      loadCompanyOsCollection(token, "policies", 8),
      loadCompanyOsCollection(token, "risks", 8),
      loadCompanyOsCollection(token, "pipeline-runs", 8),
      loadCompanyOsCollection(token, "pipeline-stages", 20),
      loadCompanyOsCollection(token, "stage-runs", 8),
      loadCompanyOsCollection(token, "acceptance-criteria", 8),
      loadCompanyOsCollection(token, "approvals", 8),
      loadCompanyOsCollection(token, "automation-rules", 8),
      loadCompanyOs(token)
    ])
      .then(([tasks, pipelines, procedures, toolAdapters, resources, policies, risks, pipelineRuns, pipelineStages, stageRuns, acceptanceCriteria, approvals, automationRules, companyOs]) => {
        if (!cancelled) {
          setContextState({
            status: "ready",
            context: {
              tasks,
              pipelines,
              procedures,
              toolAdapters,
              resources,
              policies,
              risks,
              pipelineRuns,
              pipelineStages,
              stageRuns,
              acceptanceCriteria,
              approvals,
              automationRules,
              events: companyOs.recent.events
            }
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setContextState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load agent context."
              : "CompanyCore could not load the agent operating context."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [contextState, () => setReloadKey((value) => value + 1)];
}

export function useAgentToolSurfaceState(): [AgentToolSurfaceState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [surfaceState, setSurfaceState] = useState<AgentToolSurfaceState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setSurfaceState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setSurfaceState({ status: "loading" });
    Promise.all([
      loadConnection(token),
      loadMcpManifest(token)
    ])
      .then(([connection, manifest]) => {
        if (!cancelled) {
          setSurfaceState({ status: "ready", connection, manifest });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setSurfaceState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to inspect agent tools."
              : "CompanyCore could not load the MCP tool surface. Try again from the owner session."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [surfaceState, () => setReloadKey((value) => value + 1)];
}

export function integrationStatus(integration: IntegrationState, label: string) {
  if (integration.active) {
    return `${label} active`;
  }
  if (integration.configured) {
    return `${label} saved`;
  }
  return `${label} not connected`;
}

export function connectionMetrics(connection: ConnectionData) {
  const areas = connection.operatingModel.areas.length;
  const tables = connection.operatingModel.areas.reduce((sum, area) => sum + (area.tables?.length || 0), 0);
  const selectedLists = connection.integrations.clickup.config?.listIds?.length || 0;
  const selectedDriveFolders = [
    ...(connection.integrations.googleDrive.config?.selectedFolderIds || []),
    ...(connection.integrations.googleDrive.config?.rootFolderIds || [])
  ].length;

  return { areas, tables, selectedLists, selectedDriveFolders };
}

export function companyAreas(connection: ConnectionData) {
  return connection.operatingModel.areas.filter((area) => area.key !== "main-general");
}

const reactShellNav = [
  {
    label: "Command",
    links: [
      { href: "/dashboard", label: "Company map", icon: "ph-map-trifold" }
    ]
  },
  {
    label: "Workbenches",
    links: [
      { href: "/areas", label: "Areas & resources", icon: "ph-buildings" },
      { href: "/relationships", label: "Relationship review", icon: "ph-graph" },
      { href: "/data", label: "Company data", icon: "ph-database" },
      { href: "/tasks-adapter", label: "Tasks & delivery", icon: "ph-list-checks" },
      { href: "/pipeline", label: "Pipeline / CRM", icon: "ph-flow-arrow" }
    ]
  },
  {
    label: "Integrations & agents",
    links: [
      { href: "/settings/integrations", label: "Integration health", icon: "ph-plugs-connected" },
      { href: "/settings/drive", label: "Google Drive", icon: "ph-cloud" },
      { href: "/settings/api", label: "Agent access", icon: "ph-key" },
      { href: "/react-agent-tools", label: "MCP tools", icon: "ph-robot" }
    ]
  },
  {
    label: "Workspace",
    links: [
      { href: "/settings/account", label: "Account & readiness", icon: "ph-user-circle" }
    ]
  }
];

export function Shell({
  children,
  connection,
  appLabel = "React dashboard"
}: {
  children: React.ReactNode;
  connection?: ConnectionData;
  appLabel?: string;
}) {
  const metrics = connection ? connectionMetrics(connection) : null;
  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;
  const activeLabel = reactShellNav
    .flatMap((section) => section.links)
    .find((link) => link.href === currentPath)?.label || appLabel.replace(/^React\s+/i, "");
  const healthLabel = connection ? "Healthy workspace" : "Signed-out preview";
  const workspaceLabel = connection?.workspace.name || "No active workspace";
  const agentLabel = metrics ? `${metrics.areas} areas · ${metrics.tables} tables` : appLabel.replace(/^React\s+/i, "");

  return (
    <main className="min-h-screen overflow-x-hidden bg-base-200 text-base-content lg:grid lg:grid-cols-[304px_minmax(0,1fr)]" data-theme="companycore">
      <aside className="hidden min-h-screen border-r border-white/10 bg-neutral px-4 py-5 text-neutral-content lg:grid lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:gap-4">
        <a className="flex min-w-0 items-start gap-3 border-b border-white/10 pb-4 font-black no-underline text-neutral-content" href="/dashboard">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-company bg-primary text-sm text-primary-content">CC</span>
          <span className="min-w-0">
            CompanyCore
            <small className="block truncate text-xs font-black text-neutral-content/65">{workspaceLabel}</small>
          </span>
        </a>
        <section className="rounded-company border border-white/10 bg-white/[0.04] p-3" aria-label="Workspace status">
          <p className="mb-2 text-[0.68rem] font-black uppercase text-neutral-content/60">Active workspace</p>
          <strong className="block truncate text-sm">{workspaceLabel}</strong>
          <div className="mt-3 grid gap-2 text-xs font-black text-neutral-content/70">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{healthLabel}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{agentLabel}</span>
          </div>
        </section>
        <nav className="min-h-0 space-y-4 overflow-y-auto pr-1" aria-label="CompanyCore command navigation">
          {reactShellNav.map((section) => (
            <section className="grid gap-1.5" key={section.label} aria-label={section.label}>
              <p className="px-3 text-[0.68rem] font-black uppercase text-neutral-content/55">{section.label}</p>
              {section.links.map((link) => {
                const isActive = link.href === currentPath || (link.href === "/data" && currentPath.startsWith("/data/"));
                return (
                  <a
                    key={link.href}
                    className={`flex min-h-10 items-center gap-3 rounded-company border px-3 py-2 text-sm font-black no-underline ${isActive ? "border-primary/60 bg-primary/15 text-neutral-content shadow-[inset_3px_0_0_#2364d2]" : "border-transparent text-neutral-content/82 hover:border-primary/40 hover:bg-primary/10 hover:text-neutral-content"}`}
                    href={link.href}
                  >
                    <i className={`ph-bold ${link.icon} w-5 text-lg text-primary`} aria-hidden="true"></i>
                    <span className="min-w-0 truncate">{link.label}</span>
                  </a>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="rounded-company border border-white/10 bg-white/[0.04] p-3 text-xs font-black text-neutral-content/70">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connection ? "bg-success" : "bg-neutral-content/45"}`} aria-hidden="true"></span>
            {connection ? "Workspace online" : "Waiting for owner session"}
          </span>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur sm:px-5 lg:min-h-[72px]">
          <div className="mx-auto grid w-full max-w-7xl gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <a className="grid h-9 w-9 flex-none place-items-center rounded-company bg-neutral text-sm font-black text-neutral-content no-underline lg:hidden" href="/dashboard">CC</a>
              <div className="min-w-0">
                <p className="mb-1 text-[0.68rem] font-black uppercase text-company-muted">Company command</p>
                <h1 className="truncate text-xl font-black leading-tight">{activeLabel}</h1>
              </div>
            </div>
            <div className="hidden min-w-0 flex-wrap gap-2 text-xs font-black text-company-muted sm:flex" aria-label="React shell status">
              <span className="rounded-full border border-base-300 bg-base-200 px-3 py-1.5">{healthLabel}</span>
              <span className="max-w-[18rem] truncate rounded-full border border-base-300 bg-base-200 px-3 py-1.5">{workspaceLabel}</span>
              <span className="rounded-full border border-base-300 bg-base-200 px-3 py-1.5">{agentLabel}</span>
            </div>
            <nav className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="CompanyCore mobile command navigation">
              {reactShellNav.flatMap((section) => section.links).slice(0, 7).map((link) => (
                <a
                  key={link.href}
                  className={`btn btn-sm flex-none ${link.href === currentPath ? "btn-primary" : "btn-outline"}`}
                  href={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function LocalNotice({
  tone,
  title,
  detail,
  action
}: {
  tone: NoticeTone;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}) {
  const toneClass = {
    info: "border-info/30 bg-info/10",
    success: "border-success/30 bg-success/10",
    warning: "border-warning/40 bg-warning/20",
    error: "border-error/35 bg-error/10"
  }[tone];
  const icon = {
    info: "ph-info",
    success: "ph-check-circle",
    warning: "ph-warning-circle",
    error: "ph-warning-diamond"
  }[tone];

  return (
    <div className={`grid grid-cols-1 items-start gap-3 rounded-company border p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${toneClass}`} role="status">
      <i className={`ph-bold ${icon} mt-0.5 text-xl`} aria-hidden="true"></i>
      <div>
        <strong>{title}</strong>
        <p className="text-sm leading-6">{detail}</p>
      </div>
      {action ? (
        <a className="btn btn-sm" href={action.href}>{action.label}</a>
      ) : null}
    </div>
  );
}

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  emptyTitle,
  emptyDetail
}: {
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-company border border-dashed border-base-300 bg-base-200/45 p-5">
        <LocalNotice
          tone="info"
          title={emptyTitle}
          detail={emptyDetail}
        />
      </div>
    );
  }

  return (
    <div className="react-table-shell max-w-full overflow-x-auto rounded-company border border-base-300 bg-base-100">
      <table className="table table-zebra table-pin-rows min-w-[640px]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="flex items-start gap-3">
        <span className="dashboard-icon dashboard-icon-sm text-primary">
          <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <strong className="block break-words text-lg leading-tight">{value}</strong>
          <p className="mt-1 text-xs leading-5 text-company-muted">{detail}</p>
        </div>
      </div>
    </article>
  );
}
