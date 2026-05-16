import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DataTable as SharedDataTable,
  LocalNotice as SharedLocalNotice,
  MetricCard as SharedMetricCard,
  Shell as SharedShell,
  archiveCompanyOsWorkflowVersion as sharedArchiveCompanyOsWorkflowVersion,
  assignExternalMappingScope as sharedAssignExternalMappingScope,
  assignGoogleDriveFileScope as sharedAssignGoogleDriveFileScope,
  archiveCompanyOsStandard as sharedArchiveCompanyOsStandard,
  activateCompanyOsWorkflowDraft as sharedActivateCompanyOsWorkflowDraft,
  blockCompanyOsStage as sharedBlockCompanyOsStage,
  companyAreas as sharedCompanyAreas,
  completeCompanyOsStage as sharedCompleteCompanyOsStage,
  createCompanyOsWorkflowRollbackDraft as sharedCreateCompanyOsWorkflowRollbackDraft,
  createCompanyOsWorkflowDraft as sharedCreateCompanyOsWorkflowDraft,
  connectionMetrics as sharedConnectionMetrics,
  createCompanyOsStandard as sharedCreateCompanyOsStandard,
  createOperatingArea as sharedCreateOperatingArea,
  decideCompanyOsApproval as sharedDecideCompanyOsApproval,
  deleteOperatingArea as sharedDeleteOperatingArea,
  evaluateCompanyOsAutomationRules as sharedEvaluateCompanyOsAutomationRules,
  integrationStatus as sharedIntegrationStatus,
  loadAreaOperatingGraph as sharedLoadAreaOperatingGraph,
  loadCompanyOsWorkflowDrafts as sharedLoadCompanyOsWorkflowDrafts,
  loadTableRecordSnapshot as sharedLoadTableRecordSnapshot,
  ownerToken as sharedOwnerToken,
  previewCompanyOsWorkflowDraftImpact as sharedPreviewCompanyOsWorkflowDraftImpact,
  redirectToOwnerLogin as sharedRedirectToOwnerLogin,
  requestCompanyOsApproval as sharedRequestCompanyOsApproval,
  startCompanyOsStage as sharedStartCompanyOsStage,
  updateCompanyOsStandard as sharedUpdateCompanyOsStandard,
  useAreasWorkbenchState as useSharedAreasWorkbenchState,
  useAgentToolSurfaceState as useSharedAgentToolSurfaceState,
  validateCompanyOsStage as sharedValidateCompanyOsStage,
  tableRecordApiPath as sharedTableRecordApiPath,
  useDashboardState as useSharedDashboardState,
  useCompanyOsAgentContextState as useSharedCompanyOsAgentContextState,
  useCompanyOsCollectionState as useSharedCompanyOsCollectionState,
  useCompanyOsRecordDetailState as useSharedCompanyOsRecordDetailState,
  useCompanyOsWorkbenchState as useSharedCompanyOsWorkbenchState,
  useIntegrationWorkbenchState as useSharedIntegrationWorkbenchState,
  useTasksWorkbenchState as useSharedTasksWorkbenchState
} from "./react-route-kit";
import type {
  CompanyOsAgentContext,
  CompanyOsAgentContextState,
  CompanyOsCollectionName,
  CompanyOsCollectionState,
  CompanyOsData,
  CompanyOsAutomationEvaluation,
  CompanyOsWorkflowDraft,
  CompanyOsWorkflowDraftActivationInput,
  CompanyOsWorkflowArchiveInput,
  CompanyOsWorkflowDraftInput,
  CompanyOsWorkflowImpactPreview,
  CompanyOsWorkflowRollbackDraftInput,
  WorkflowDefinitionRootType,
  CompanyOsStandardInput,
  CompanyOsStandardUpdateInput,
  CompanyOsRecord,
  CompanyOsRecordDetailState,
  CompanyOsWorkbenchState,
  ConnectionData,
  AgentToolSurfaceState,
  AreaOperatingGraph,
  AreasWorkbenchState,
  DashboardState,
  ExternalContainerMapping,
  GoogleDriveFileRecord,
  IntegrationState,
  IntegrationWorkbenchState,
  McpManifest,
  McpTool,
  NoticeTone,
  OperatingArea,
  TableRecordSnapshot,
  TableColumn,
  TaskRecord,
  TasksWorkbenchState
} from "./react-route-kit";
import { canonicalPostAuthPath, routeMatches, type AppRouteMeta } from "./app-route-registry";
import "./styles.css";

type AttentionItem = {
  title: string;
  detail: string;
  href: string;
  action: string;
  icon: string;
  tone: "warning" | "success" | "info";
};

type ModuleLink = {
  title: string;
  detail: string;
  href: string;
  icon: string;
};

type OperatingPreviewRow = {
  id: string;
  area: string;
  ownership: string;
  tables: number;
  source: string;
  action: {
    label: string;
    href: string;
  };
};

type TaskFilterState = {
  search: string;
  status: string;
  source: string;
  list: string;
};

type IntegrationGroup = {
  id: string;
  title: string;
  detail: string;
  status: string;
  metric: string;
  icon: string;
  tone: "success" | "warning" | "info";
  primary: {
    label: string;
    href: string;
  };
  secondary: {
    label: string;
    href: string;
  };
};

type IntegrationAreaRow = {
  id: string;
  area: string;
  ownership: string;
  tables: number;
  sources: string;
  companycoreTables: number;
  clickupTables: number;
  action: {
    label: string;
    href: string;
  };
};

type IntegrationFilterState = {
  search: string;
  type: string;
};

type AreaFilterState = {
  search: string;
  type: string;
};

type AreaWorkbenchRow = {
  id: string;
  name: string;
  key: string;
  ownership: string;
  tables: number;
  companycoreTables: number;
  providerTables: number;
  providerMappings: number;
  driveFolders: number;
  driveFiles: number;
  sources: string;
  action: {
    label: string;
    href: string;
  };
};

type AreaMappingSignal = {
  id: string;
  title: string;
  detail: string;
  metric: string;
  icon: string;
  tone: NoticeTone;
  primary: {
    label: string;
    href: string;
  };
  secondary?: {
    label: string;
    href: string;
  };
};

type AreaReviewItem = {
  id: string;
  kind: "provider" | "drive";
  title: string;
  detail: string;
  badge: string;
};

type AreaAssignmentNotice = {
  tone: NoticeTone;
  title: string;
  detail: string;
};

type AreaDetailContext = {
  tables: NonNullable<OperatingArea["tables"]>;
  tableRecordsCount: number;
  tableRecordRows: Array<{
    apiSlug: string;
    tableName: string;
    href: string;
    record: Record<string, unknown>;
  }>;
  recordPreviews: Array<{
    tableName: string;
    title: string;
    detail: string;
  }>;
  driveItems: GoogleDriveFileRecord[];
  providerMappings: ExternalContainerMapping[];
  globalReviewDebt: number;
  operatingGraph?: AreaOperatingGraph | null;
  operatingGraphStatus?: "idle" | "loading" | "ready" | "error";
};

type IntakeItem = {
  id: string;
  family: string;
  status: string;
  title: string;
  source: string;
  sourceAgent?: string | null;
  sourceModel: string;
  sourceId: string;
  risk: "low" | "medium" | "high" | "critical";
  suggestedDepartment: string;
  confidence: "direct" | "inferred" | "needs_review";
  createdAt: string;
  updatedAt: string;
  summary?: string | null;
  evidence: Array<{ label: string; href: string }>;
  allowedActions: string[];
  blockedActions: Array<{ action: string; reason: string }>;
  metadata: Record<string, unknown>;
};

type IntakeSummary = {
  total: number;
  byFamily: Record<string, number>;
  byStatus: Record<string, number>;
  byRisk: Record<string, number>;
  byDepartment: Record<string, number>;
};

type IntakeData = {
  workspaceId: string;
  summary: IntakeSummary;
  items: IntakeItem[];
};

type FinanceContextData = {
  summary: {
    candidatePricingModels: number;
    activePricingModels: number;
    needsOwnerDecision: number;
    openCommercialExceptions: number;
    invoiceReadinessBlocked: number;
    highRiskItems: number;
  };
  pricingModels: Array<{
    id: string;
    name: string;
    market: string;
    currency: string;
    setupFee: number | null;
    recurringFee: number | null;
    hourlyValue: number | null;
    status: string;
    riskFlags: string[];
    ownerDecisionNeeded: boolean;
  }>;
  hourlyValueAssumptions: Array<{
    id: string;
    roleOrUnit: string;
    valuePerHour: number;
    costPerHour: number | null;
    currency: string;
    status: string;
    riskFlags: string[];
  }>;
  commercialExceptions: Array<{
    id: string;
    exceptionType: string;
    status: string;
    clientName: string | null;
    grossValue: number | null;
    discountPercent: number | null;
    finalValue: number | null;
    currency: string | null;
    riskFlags: string[];
  }>;
  invoiceReadiness: Array<{
    id: string;
    readinessStatus: string;
    missingEvidence: string[];
    blockedActions: Array<{ action: string; reason: string }>;
  }>;
  sourceConflicts: Array<{
    type: string;
    status: string;
    message: string;
  }>;
  agentPacket: {
    mode: string;
    requiredOwnerDecisions: string[];
    blockedActions: Array<{ action: string; reason: string }>;
  };
};

type IntakeRouteProposal = {
  proposal: {
    id: string;
    sourceModel: string;
    sourceId: string;
    targetDepartmentKey: string;
    classification: string;
    status: string;
    riskLevel: string;
    createdAt: string;
  };
  effects: {
    sourceMutated: boolean;
    agentEventAcknowledged: boolean;
    providerStateMutated: boolean;
    taskDraftCreated: boolean;
    ownerDecisionRequested: boolean;
    auditRecorded: boolean;
    idempotentReplay: boolean;
  };
  evidence: {
    decisionId: string;
    taskId: string | null;
    auditLogId: string | null;
    idempotencyKey: string;
  };
  blockedActions: Array<{ action: string; reason: string }>;
};

type AreaDetailLane = {
  id: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  icon: string;
  href: string;
  tone: "blue" | "green" | "amber" | "red";
};

type AreaCapabilityBoardItem = {
  title: string;
  detail: string;
  meta?: string;
  href?: string;
};

type AreaCapabilityBoardSection = {
  title: string;
  icon: string;
  empty: string;
  items: AreaCapabilityBoardItem[];
};

type AreaCapabilityBoardData = {
  note: string;
  sections: AreaCapabilityBoardSection[];
  actions: Array<{
    label: string;
    href: string;
    tone: "primary" | "secondary";
  }>;
};

type AreaLayerInsight = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  count: number;
  tone: "blue" | "green" | "amber" | "red";
  tableSlugs: string[];
};

type AreaKnowledgeTreeNode = {
  id: string;
  name: string;
  detail: string;
  href?: string | null;
  isFolder: boolean;
  children: AreaKnowledgeTreeNode[];
};

type CompanyOsDrilldown = {
  id: CompanyOsCollectionName;
  label: string;
  detail: string;
  icon: string;
  countGroup: "definitions" | "runtime" | "governance";
  countKey: string;
};

type StageLifecycleDraft = {
  pipelineRunId: string;
  pipelineStageId: string;
  startApprovalId: string;
  stageRunId: string;
  blockReason: string;
  blockApprovalId: string;
  criterionId: string;
  validationStatus: "passed" | "failed" | "waived";
  evidenceNote: string;
  completeApprovalId: string;
  outputSummary: string;
};

type AutomationEvaluationDraft = {
  eventId: string;
  mode: "dry_run" | "execute";
  ruleIds: string;
  idempotencyKey: string;
  reason: string;
};

type CommandPreviewItem = {
  label: string;
  value: string;
};

type CommandPreview = {
  title: string;
  eyebrow: string;
  tone: NoticeTone;
  items: CommandPreviewItem[];
  expectedResult: string;
  recovery: string;
};

type AgentCommandQueueItem = {
  id: string;
  title: string;
  detail: string;
  nextAction: string;
  badge: string;
  tone: NoticeTone;
  icon: string;
};

type StandardDefinitionDraft = {
  name: string;
  category: string;
  description: string;
  validationMethod: string;
  ownerRoleId: string;
  checklistId: string;
  status: "draft" | "active" | "paused" | "archived" | "retired" | "deprecated";
};

type AgentToolFamily = {
  id: string;
  label: string;
  detail: string;
  tools: McpTool[];
};

type CorrelationTimelineItem = {
  id: string;
  kind: "event" | "audit";
  title: string;
  detail: string;
  timestamp: string;
  actor: string;
  resource: string;
  tone: NoticeTone;
  evidence?: Record<string, unknown> | null;
};

type CorrelationOption = {
  id: string;
  label: string;
  count: number;
  latestAt: string;
};

type OperatingGraphNode = {
  id: string;
  title: string;
  detail: string;
  group: "resource" | "policy" | "risk" | "automation" | "run";
  badge: string;
  relation: string;
  tone: NoticeTone;
};

const modules: ModuleLink[] = [
  {
    title: "Operating areas",
    detail: "Browse the company structure, departments, and table ownership.",
    href: "/react-areas",
    icon: "ph-tree-structure"
  },
  {
    title: "Relationships",
    detail: "Review provider and Drive relationships that need owner context.",
    href: "/relationships",
    icon: "ph-git-branch"
  },
  {
    title: "Tasks & adapters",
    detail: "Inspect execution records, ClickUp sync state, and task ownership.",
    href: "/react-tasks",
    icon: "ph-list-checks"
  },
  {
    title: "Company OS",
    detail: "Inspect process, pipeline, approval, audit, governance, and automation signals.",
    href: "/react-company-os",
    icon: "ph-circles-three-plus"
  },
  {
    title: "Agent tools",
    detail: "Inspect the MCP tool surface, risk levels, capabilities, and supervised commands.",
    href: "/react-agent-tools",
    icon: "ph-robot"
  },
  {
    title: "Integration map",
    detail: "Review provider readiness and implemented data groups.",
    href: "/react-integrations",
    icon: "ph-map-trifold"
  }
];

const companyOsDrilldowns: CompanyOsDrilldown[] = [
  {
    id: "pipelines",
    label: "Pipelines",
    detail: "Workflow definitions, stages, owners, and process links.",
    icon: "ph-flow-arrow",
    countGroup: "definitions",
    countKey: "pipelines"
  },
  {
    id: "approvals",
    label: "Approvals",
    detail: "Pending and historical approval requests for risky actions.",
    icon: "ph-stamp",
    countGroup: "runtime",
    countKey: "approvals"
  },
  {
    id: "audit-logs",
    label: "Audit logs",
    detail: "Action evidence across humans, agents, integrations, and tools.",
    icon: "ph-clipboard-text",
    countGroup: "runtime",
    countKey: "auditLogs"
  },
  {
    id: "risks",
    label: "Risks",
    detail: "Known process, integration, automation, and agent risks.",
    icon: "ph-warning-octagon",
    countGroup: "governance",
    countKey: "risks"
  },
  {
    id: "tool-adapters",
    label: "Adapters",
    detail: "Provider-neutral integration adapters and declared capabilities.",
    icon: "ph-plugs-connected",
    countGroup: "definitions",
    countKey: "toolAdapters"
  }
];

function useDashboardState(): [DashboardState, () => void] {
  return useSharedDashboardState();
}

function useTasksWorkbenchState(): [TasksWorkbenchState, () => void] {
  return useSharedTasksWorkbenchState();
}

function useIntegrationWorkbenchState(): [IntegrationWorkbenchState, () => void] {
  return useSharedIntegrationWorkbenchState();
}

function useAreasWorkbenchState(): [AreasWorkbenchState, () => void] {
  return useSharedAreasWorkbenchState();
}

function useAgentToolSurfaceState(): [AgentToolSurfaceState, () => void] {
  return useSharedAgentToolSurfaceState();
}

function useCompanyOsWorkbenchState(): [CompanyOsWorkbenchState, () => void] {
  return useSharedCompanyOsWorkbenchState();
}

function useCompanyOsCollectionState(collection: CompanyOsCollectionName): [CompanyOsCollectionState, () => void] {
  return useSharedCompanyOsCollectionState(collection);
}

function useCompanyOsRecordDetailState(
  collection: CompanyOsCollectionName,
  recordId: string
): [CompanyOsRecordDetailState, () => void] {
  return useSharedCompanyOsRecordDetailState(collection, recordId);
}

function useCompanyOsAgentContextState(): [CompanyOsAgentContextState, () => void] {
  return useSharedCompanyOsAgentContextState();
}

function ownerToken() {
  return sharedOwnerToken();
}

async function loadAreaOperatingGraph(areaKey: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedLoadAreaOperatingGraph(token, areaKey);
}

async function loadGlobalIntake(query = "limit=80") {
  return ownerApi<IntakeData>(`/v1/intake?${query}`);
}

async function loadFinanceContext(query = "limit=80") {
  return ownerApi<FinanceContextData>(`/v1/finance/context?${query}`);
}

async function proposeIntakeRoute(item: IntakeItem, targetDepartmentKey: string) {
  return ownerApi<IntakeRouteProposal>("/v1/intake/actions/propose-route", {
    method: "POST",
    body: JSON.stringify({
      sourceModel: item.sourceModel,
      sourceId: item.sourceId,
      targetDepartmentKey,
      classification: item.status === "needs_owner_decision" ? "needs_owner_decision" : "route_to_department",
      reason: `Owner review from 00 Main: ${item.title}`,
      proposedNextAction: `Review and route this intake item to ${targetDepartmentKey}.`,
      riskLevel: item.risk,
      requestOwnerDecision: item.risk === "high" || item.risk === "critical" || item.status === "needs_owner_decision",
      createTaskDraft: item.risk === "high" || item.risk === "critical",
      idempotencyKey: `web-${item.sourceModel}-${item.sourceId}-${targetDepartmentKey}`
    })
  });
}

async function loadTableRecordSnapshot(connection: ConnectionData) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedLoadTableRecordSnapshot(token, connection);
}

async function requestCompanyOsApproval(input: Parameters<typeof sharedRequestCompanyOsApproval>[1]) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedRequestCompanyOsApproval(token, input);
}

async function decideCompanyOsApproval(
  approvalId: string,
  input: Parameters<typeof sharedDecideCompanyOsApproval>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedDecideCompanyOsApproval(token, approvalId, input);
}

async function startCompanyOsStage(
  pipelineRunId: string,
  input: Parameters<typeof sharedStartCompanyOsStage>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedStartCompanyOsStage(token, pipelineRunId, input);
}

async function blockCompanyOsStage(
  stageRunId: string,
  input: Parameters<typeof sharedBlockCompanyOsStage>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedBlockCompanyOsStage(token, stageRunId, input);
}

async function validateCompanyOsStage(
  stageRunId: string,
  input: Parameters<typeof sharedValidateCompanyOsStage>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedValidateCompanyOsStage(token, stageRunId, input);
}

async function completeCompanyOsStage(
  stageRunId: string,
  input: Parameters<typeof sharedCompleteCompanyOsStage>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedCompleteCompanyOsStage(token, stageRunId, input);
}

async function evaluateCompanyOsAutomationRules(
  eventId: string,
  input: Parameters<typeof sharedEvaluateCompanyOsAutomationRules>[2]
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedEvaluateCompanyOsAutomationRules(token, eventId, input);
}

async function createCompanyOsStandard(input: CompanyOsStandardInput) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedCreateCompanyOsStandard(token, input);
}

async function updateCompanyOsStandard(
  standardId: string,
  input: CompanyOsStandardUpdateInput
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedUpdateCompanyOsStandard(token, standardId, input);
}

async function archiveCompanyOsStandard(standardId: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedArchiveCompanyOsStandard(token, standardId);
}

async function createCompanyOsWorkflowDraft(input: CompanyOsWorkflowDraftInput) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedCreateCompanyOsWorkflowDraft(token, input);
}

async function loadCompanyOsWorkflowDrafts(rootObjectType: WorkflowDefinitionRootType) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedLoadCompanyOsWorkflowDrafts(token, {
    rootObjectType,
    status: "draft",
    limit: 8
  });
}

async function previewCompanyOsWorkflowDraftImpact(draftId: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedPreviewCompanyOsWorkflowDraftImpact(token, draftId);
}

async function activateCompanyOsWorkflowDraft(
  draftId: string,
  input: CompanyOsWorkflowDraftActivationInput = {}
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedActivateCompanyOsWorkflowDraft(token, draftId, input);
}

async function archiveCompanyOsWorkflowVersion(
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string,
  input: CompanyOsWorkflowArchiveInput
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedArchiveCompanyOsWorkflowVersion(token, rootObjectType, rootObjectId, input);
}

async function createCompanyOsWorkflowRollbackDraft(
  rootObjectType: WorkflowDefinitionRootType,
  rootObjectId: string,
  input: CompanyOsWorkflowRollbackDraftInput
) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedCreateCompanyOsWorkflowRollbackDraft(token, rootObjectType, rootObjectId, input);
}

async function assignProviderMappingScope(mappingId: string, areaId: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedAssignExternalMappingScope(token, mappingId, areaId);
}

async function assignDriveFileScope(fileId: string, areaId: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedAssignGoogleDriveFileScope(token, fileId, areaId);
}

async function createReactOperatingArea(input: { name: string; description?: string }) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedCreateOperatingArea(token, input);
}

async function deleteReactOperatingArea(areaId: string, reassignToAreaId: string) {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }
  return sharedDeleteOperatingArea(token, areaId, reassignToAreaId);
}

function integrationStatus(integration: IntegrationState, label: string) {
  return sharedIntegrationStatus(integration, label);
}

function connectionMetrics(connection: ConnectionData) {
  return sharedConnectionMetrics(connection);
}

function companyAreas(connection: ConnectionData) {
  return sharedCompanyAreas(connection);
}

function attentionItems(connection: ConnectionData): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (!connection.integrations.clickup.configured) {
    items.push({
      title: "Connect ClickUp",
      detail: "Task Lists and ClickUp-sourced tasks need a saved connection before execution work is useful.",
      href: "/settings",
      action: "Open ClickUp",
      icon: "ph-plugs",
      tone: "warning"
    });
  }

  if (!connection.integrations.googleDrive.configured) {
    items.push({
      title: "Connect Google Drive",
      detail: "Drive folders and files can be mapped to company areas after OAuth and import.",
      href: "/settings/drive",
      action: "Open Drive",
      icon: "ph-cloud",
      tone: "warning"
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Workspace foundation looks ready",
      detail: "Core provider connections are available. Continue by reviewing operating areas and table ownership.",
      href: "/areas",
      action: "Open areas",
      icon: "ph-check-circle",
      tone: "success"
    });
  }

  items.push({
    title: "React migration lane",
    detail: "This surface is now using shared React primitives, Tailwind tokens, and the CompanyCore DaisyUI theme.",
    href: "/react-dashboard",
    action: "Stay here",
    icon: "ph-squares-four",
    tone: "info"
  });

  return items.slice(0, 4);
}

function operatingPreviewRows(connection: ConnectionData): OperatingPreviewRow[] {
  return companyAreas(connection)
    .slice(0, 6)
    .map((area) => {
      const tables = area.tables || [];
      const source = [...new Set(tables.map((table) => table.source || "companycore"))].join(", ") || "companycore";
      return {
        id: area.id,
        area: area.name,
        ownership: area.key,
        tables: tables.length,
        source,
        action: {
          label: "Open area",
          href: `/areas`
        }
      };
    });
}

function normalizedTaskSource(task: TaskRecord) {
  return task.source || "companycore";
}

function normalizedTaskList(task: TaskRecord) {
  return task.taskList?.name || "No list";
}

function isOpenTask(task: TaskRecord) {
  const status = String(task.status || "todo").toLowerCase();
  return !["archived", "closed", "complete", "completed", "done"].includes(status);
}

function isDueSoon(task: TaskRecord) {
  if (!task.dueDate || !isOpenTask(task)) {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const now = new Date();
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  return dueDate.getTime() <= now.getTime() + sevenDays;
}

function formatTaskDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function uniqueTaskOptions(tasks: TaskRecord[], getValue: (task: TaskRecord) => string) {
  return [...new Set(tasks.map(getValue).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function taskMetrics(tasks: TaskRecord[]) {
  const openTasks = tasks.filter(isOpenTask);
  const clickUpTasks = tasks.filter((task) => normalizedTaskSource(task) === "clickup");
  const dueSoonTasks = tasks.filter(isDueSoon);
  const listCount = uniqueTaskOptions(tasks, normalizedTaskList).filter((list) => list !== "No list").length;

  return {
    total: tasks.length,
    open: openTasks.length,
    clickUp: clickUpTasks.length,
    dueSoon: dueSoonTasks.length,
    lists: listCount
  };
}

function filteredTasks(tasks: TaskRecord[], filters: TaskFilterState) {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    const source = normalizedTaskSource(task);
    const list = normalizedTaskList(task);
    const status = task.status || "todo";
    const haystack = [
      task.title,
      status,
      task.priority || "",
      source,
      list,
      formatTaskDate(task.dueDate)
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query))
      && (!filters.status || status === filters.status)
      && (!filters.source || source === filters.source)
      && (!filters.list || list === filters.list);
  });
}

function providerReadiness(connection: ConnectionData) {
  const clickupReady = connection.integrations.clickup.configured && connection.integrations.clickup.active;
  const driveReady = connection.integrations.googleDrive.oauthClientConfigured && connection.integrations.googleDrive.oauthTokenConfigured;

  if (clickupReady && driveReady) {
    return {
      title: "Core integrations ready",
      detail: "ClickUp and Google Drive are configured enough for operating-area review and agent-safe API inspection.",
      tone: "success" as NoticeTone,
      action: { label: "Open areas", href: "/areas" }
    };
  }

  if (!connection.integrations.clickup.configured) {
    return {
      title: "Connect ClickUp next",
      detail: "Task and workflow visibility needs a saved ClickUp connection before the integration map is complete.",
      tone: "warning" as NoticeTone,
      action: { label: "Open ClickUp setup", href: "/settings" }
    };
  }

  if (!driveReady) {
    return {
      title: "Complete Google Drive next",
      detail: "Drive folders need OAuth client and token readiness before imported files can be mapped to company areas.",
      tone: "warning" as NoticeTone,
      action: { label: "Open Drive setup", href: "/settings/drive" }
    };
  }

  return {
    title: "Review integration ownership",
    detail: "Provider setup exists. Continue by checking area coverage, API capability exposure, and relationship cleanup.",
    tone: "info" as NoticeTone,
    action: { label: "Open current map", href: "/settings/integrations" }
  };
}

function integrationGroups(connection: ConnectionData): IntegrationGroup[] {
  const metrics = connectionMetrics(connection);
  const clickup = connection.integrations.clickup;
  const drive = connection.integrations.googleDrive;
  const apiRoutes = connection.capabilities.length;
  const areas = companyAreas(connection).length;

  return [
    {
      id: "clickup",
      title: "ClickUp tasks",
      detail: "Task Lists, execution records, and provider task ownership.",
      status: integrationStatus(clickup, "ClickUp"),
      metric: `${metrics.selectedLists} selected list${metrics.selectedLists === 1 ? "" : "s"}`,
      icon: "ph-plugs-connected",
      tone: clickup.configured ? "success" : "warning",
      primary: { label: "Setup ClickUp", href: "/settings" },
      secondary: { label: "Review tasks", href: "/react-tasks" }
    },
    {
      id: "drive",
      title: "Google Drive files",
      detail: "OAuth-backed folders and files mapped into company ownership.",
      status: drive.oauthTokenConfigured ? "Drive consent ready" : drive.oauthClientConfigured ? "Drive client saved" : "Drive not connected",
      metric: `${metrics.selectedDriveFolders} selected folder${metrics.selectedDriveFolders === 1 ? "" : "s"}`,
      icon: "ph-cloud",
      tone: drive.oauthTokenConfigured ? "success" : "warning",
      primary: { label: "Setup Drive", href: "/settings/drive" },
      secondary: { label: "Review areas", href: "/areas" }
    },
    {
      id: "api",
      title: "Agent-safe API",
      detail: "Discoverable capabilities for service clients and AI-assisted workflows.",
      status: `${apiRoutes} capabilities`,
      metric: "Bearer and service-key access",
      icon: "ph-key",
      tone: "info",
      primary: { label: "API settings", href: "/settings/api" },
      secondary: { label: "Current map", href: "/settings/integrations" }
    },
    {
      id: "model",
      title: "Operating model",
      detail: "Company areas and tables that explain where records belong.",
      status: `${areas} operating areas`,
      metric: `${metrics.tables} mapped table${metrics.tables === 1 ? "" : "s"}`,
      icon: "ph-tree-structure",
      tone: "success",
      primary: { label: "Open areas", href: "/areas" },
      secondary: { label: "Relationships", href: "/relationships" }
    }
  ];
}

function integrationAreaRows(connection: ConnectionData): IntegrationAreaRow[] {
  return companyAreas(connection)
    .map((area) => {
      const tables = area.tables || [];
      const sources = [...new Set(tables.map((table) => table.source || "companycore"))];
      return {
        id: area.id,
        area: area.name,
        ownership: area.key,
        tables: tables.length,
        sources: sources.join(", ") || "companycore",
        companycoreTables: tables.filter((table) => (table.source || "companycore") === "companycore").length,
        clickupTables: tables.filter((table) => table.source === "clickup").length,
        action: {
          label: "Open area",
          href: "/areas"
        }
      };
    });
}

function filteredIntegrationAreaRows(rows: IntegrationAreaRow[], filters: IntegrationFilterState) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const haystack = [
      row.area,
      row.ownership,
      row.sources,
      `${row.tables}`,
      `${row.companycoreTables}`,
      `${row.clickupTables}`
    ].join(" ").toLowerCase();
    const typeMatch = filters.type === "tables"
      ? row.tables > 0
      : filters.type === "clickup"
        ? row.clickupTables > 0
        : filters.type === "companycore"
          ? row.companycoreTables > 0
          : true;

    return (!query || haystack.includes(query)) && typeMatch;
  });
}

function areaWorkbenchRows(
  connection: ConnectionData,
  externalMappings: ExternalContainerMapping[],
  googleDriveFiles: GoogleDriveFileRecord[]
): AreaWorkbenchRow[] {
  return companyAreas(connection)
    .map((area) => {
      const tables = area.tables || [];
      const sources = [...new Set(tables.map((table) => table.source || "companycore"))];
      const providerTables = tables.filter((table) => (table.source || "companycore") !== "companycore").length;
      const providerMappings = externalMappings.filter((mapping) => mapping.areaId === area.id).length;
      const driveItems = googleDriveFiles.filter((file) => !file.trashed && file.operatingAreaId === area.id);
      const driveFolders = driveItems.filter((file) => file.isFolder).length;
      const driveFiles = driveItems.length - driveFolders;

      return {
        id: area.id,
        name: area.name,
        key: area.key,
        ownership: area.isSystem ? "System fallback" : "Company function",
        tables: tables.length,
        companycoreTables: tables.length - providerTables,
        providerTables,
        providerMappings,
        driveFolders,
        driveFiles,
        sources: sources.join(", ") || "No tables",
        action: {
          label: "Open current view",
          href: "/areas"
        }
      };
    });
}

function filteredAreaRows(rows: AreaWorkbenchRow[], filters: AreaFilterState) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const typeMatch = filters.type === "system"
      ? row.ownership === "System fallback"
      : filters.type === "company"
        ? row.ownership === "Company function"
        : filters.type === "provider"
          ? row.providerMappings > 0
          : filters.type === "drive"
            ? row.driveFolders + row.driveFiles > 0
          : filters.type === "empty"
            ? row.tables === 0
            : true;
    const haystack = [
      row.name,
      row.key,
      row.ownership,
      row.sources,
      `${row.tables}`,
      `${row.companycoreTables}`,
      `${row.providerTables}`,
      `${row.providerMappings}`,
      `${row.driveFolders}`,
      `${row.driveFiles}`
    ].join(" ").toLowerCase();

    return typeMatch && (!query || haystack.includes(query));
  });
}

function areaReadiness(rows: AreaWorkbenchRow[]) {
  const emptyRows = rows.filter((row) => row.tables === 0).length;
  const providerRows = rows.filter((row) => row.providerTables > 0).length;

  if (emptyRows > 0) {
    return {
      tone: "warning" as NoticeTone,
      title: "Some areas need table coverage",
      detail: `${emptyRows} operating area${emptyRows === 1 ? "" : "s"} currently have no mapped tables. Review whether they are intentionally empty or need a data path.`,
      action: { label: "Open current areas", href: "/areas" }
    };
  }

  if (providerRows > 0) {
    return {
      tone: "info" as NoticeTone,
      title: "Provider ownership is visible",
      detail: `${providerRows} operating area${providerRows === 1 ? "" : "s"} include provider-owned tables or mappings that agents can inspect before acting.`,
      action: { label: "Review relationships", href: "/relationships" }
    };
  }

  return {
    tone: "success" as NoticeTone,
    title: "Operating model is mapped",
    detail: "Every visible operating area has a CompanyCore table path and can be inspected by owner-console or MCP-driven workflows.",
    action: { label: "Open Company OS", href: "/react-company-os" }
  };
}

function areaMappingSignals(
  connection: ConnectionData,
  rows: AreaWorkbenchRow[],
  externalMappings: ExternalContainerMapping[],
  googleDriveFiles: GoogleDriveFileRecord[]
): AreaMappingSignal[] {
  const metrics = connectionMetrics(connection);
  const providerAreas = rows.filter((row) => row.providerTables > 0).length;
  const mappedProviderMappings = externalMappings.filter((mapping) => Boolean(mapping.areaId)).length;
  const unmappedProviderMappings = externalMappings.length - mappedProviderMappings;
  const activeDriveFiles = googleDriveFiles.filter((file) => !file.trashed);
  const mappedDriveItems = activeDriveFiles.filter((file) => Boolean(file.operatingAreaId)).length;
  const unmappedDriveItems = activeDriveFiles.length - mappedDriveItems;
  const driveFolders = activeDriveFiles.filter((file) => file.isFolder).length;
  const selectedDriveFolders = metrics.selectedDriveFolders;
  const selectedClickUpLists = metrics.selectedLists;
  const canMapProviders = connection.capabilities.includes("operating-model:mappings:write")
    || connection.capabilities.includes("*")
    || connection.capabilities.includes("companycore:*");
  const canMapDrive = connection.capabilities.includes("google-drive:files:scope:write")
    || connection.capabilities.includes("*")
    || connection.capabilities.includes("companycore:*");

  return [
    {
      id: "provider-scope",
      title: "Provider scope mapping",
      detail: canMapProviders
        ? `${unmappedProviderMappings} provider container${unmappedProviderMappings === 1 ? "" : "s"} still need area review in the current relationship workflow.`
        : "This session can inspect provider ownership but cannot write provider scope mappings.",
      metric: `${mappedProviderMappings}/${externalMappings.length} mapped`,
      icon: "ph-plugs-connected",
      tone: unmappedProviderMappings === 0 && canMapProviders ? "success" : "warning",
      primary: { label: "Open relationships", href: "/relationships" },
      secondary: { label: "Current areas", href: "/areas" }
    },
    {
      id: "drive-scope",
      title: "Drive folder scope",
      detail: activeDriveFiles.length > 0
        ? `${unmappedDriveItems} imported Drive item${unmappedDriveItems === 1 ? "" : "s"} still need an operating area before agents rely on them.`
        : "Drive import is empty; connect or import folders before expecting file ownership signals.",
      metric: `${mappedDriveItems}/${activeDriveFiles.length} assigned`,
      icon: "ph-cloud",
      tone: activeDriveFiles.length > 0 && unmappedDriveItems === 0 && canMapDrive ? "success" : "warning",
      primary: { label: "Open Drive", href: "/settings/drive" },
      secondary: { label: "Review relationships", href: "/relationships" }
    },
    {
      id: "clickup-scope",
      title: "ClickUp execution scope",
      detail: selectedClickUpLists > 0
        ? "Selected ClickUp lists can feed task and execution views while area ownership remains operator-correctable."
        : "Select ClickUp lists before treating task coverage as complete.",
      metric: `${selectedClickUpLists} selected list${selectedClickUpLists === 1 ? "" : "s"}`,
      icon: "ph-list-checks",
      tone: selectedClickUpLists > 0 ? "success" : "warning",
      primary: { label: "Open ClickUp", href: "/settings" },
      secondary: { label: "React tasks", href: "/react-tasks" }
    },
    {
      id: "relationship-review",
      title: "Relationship review queue",
      detail: providerAreas > 0 || driveFolders > 0
        ? "Provider mappings and Drive folders now load from their real relationship contracts."
        : "Relationship review is quiet until imported provider or Drive records exist.",
      metric: `${unmappedProviderMappings + unmappedDriveItems} open review`,
      icon: "ph-git-branch",
      tone: unmappedProviderMappings + unmappedDriveItems > 0 ? "warning" : "success",
      primary: { label: "Review queue", href: "/relationships" },
      secondary: { label: "Drive setup", href: "/settings/drive" }
    }
  ];
}

function Shell({
  children,
  connection,
  appLabel = "React dashboard"
}: {
  children: React.ReactNode;
  connection?: ConnectionData;
  appLabel?: string;
}) {
  return <SharedShell connection={connection} appLabel={appLabel}>{children}</SharedShell>;
}

function StatePanel({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      icon: "ph-sign-in",
      className: "alert alert-warning",
      title: "Owner session required",
      detail: "Sign in through the current console to load the React dashboard with live workspace data.",
      action: "Sign in",
      href: "/auth/login"
    },
    loading: {
      icon: "ph-arrows-clockwise",
      className: "alert alert-info",
      title: "Loading company signals",
      detail: "CompanyCore is reading the owner session, integration state, operating areas, and API capability map.",
      action: "",
      href: ""
    },
    error: {
      icon: "ph-warning-circle",
      className: "alert alert-error",
      title: "Dashboard could not load",
      detail: state.status === "error" ? state.message : "",
      action: "Retry",
      href: ""
    }
  }[state.status];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pt-8">
      <div className={content.className} role="status">
        <i className={`ph-bold ${content.icon} text-xl`} aria-hidden="true"></i>
        <div>
          <strong>{content.title}</strong>
          <p className="text-sm">{content.detail}</p>
        </div>
        {content.href ? (
          <a className="btn btn-sm" href={content.href}>{content.action}</a>
        ) : content.action ? (
          <button className="btn btn-sm" type="button" onClick={onRetry}>{content.action}</button>
        ) : null}
      </div>
    </section>
  );
}

function LocalNotice({
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
  return <SharedLocalNotice tone={tone} title={title} detail={detail} action={action} />;
}

function DataTable<Row extends { id: string }>({
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
  return <SharedDataTable columns={columns} rows={rows} emptyTitle={emptyTitle} emptyDetail={emptyDetail} />;
}

function CommandPanel({ connection }: { connection: ConnectionData }) {
  const metrics = connectionMetrics(connection);
  const missingClickUp = !connection.integrations.clickup.configured;
  const missingDrive = !connection.integrations.googleDrive.configured;
  const priorityTitle = missingClickUp
    ? "Connect ClickUp"
    : missingDrive
      ? "Connect Google Drive"
      : "Review operating map";
  const priorityDetail = missingClickUp
    ? "ClickUp is the next blocker for task and execution visibility."
    : missingDrive
      ? "Google Drive is the next blocker for file and folder ownership."
      : "Core integrations are ready. Continue by reviewing company structure and table ownership.";
  const priorityHref = missingClickUp ? "/settings" : missingDrive ? "/settings/drive" : "/areas";

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="flex items-start gap-3">
          <span className="dashboard-icon text-primary">
            <i className="ph-bold ph-compass" aria-hidden="true"></i>
          </span>
          <div>
            <p className="eyebrow">Operational cockpit</p>
            <h1 className="text-3xl font-black leading-tight">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
              Start here to see the current priority, what is blocked, and which company-management lane needs the next click.
            </p>
          </div>
        </div>

        <div className="rounded-company border border-primary/30 bg-primary/10 p-5">
          <p className="eyebrow">Current priority</p>
          <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-black">{priorityTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-company-muted">{priorityDetail}</p>
            </div>
            <a className="btn btn-primary" href={priorityHref}>{priorityTitle}</a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="ph-buildings" label="Workspace" value={connection.workspace.name} detail="Owner context" />
          <MetricCard icon="ph-plugs-connected" label="ClickUp" value={integrationStatus(connection.integrations.clickup, "ClickUp")} detail={`${metrics.selectedLists} selected list${metrics.selectedLists === 1 ? "" : "s"}`} />
          <MetricCard icon="ph-cloud" label="Google Drive" value={integrationStatus(connection.integrations.googleDrive, "Drive")} detail={`${metrics.selectedDriveFolders} selected folder${metrics.selectedDriveFolders === 1 ? "" : "s"}`} />
          <MetricCard icon="ph-database" label="Data model" value={`${metrics.areas} areas`} detail={`${metrics.tables} tables, ${connection.capabilities.length} capabilities`} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return <SharedMetricCard icon={icon} label={label} value={value} detail={detail} />;
}

function AttentionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <aside className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-start gap-3">
          <span className="dashboard-icon text-warning">
            <i className="ph-bold ph-warning-circle" aria-hidden="true"></i>
          </span>
          <div>
            <p className="eyebrow">Action queue</p>
            <h2 className="text-xl font-black">What needs attention</h2>
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((item) => (
            <article className="rounded-company border border-base-300 bg-base-200/45 p-4" key={item.title}>
              <div className="flex items-start gap-3">
                <span className={`dashboard-icon dashboard-icon-sm ${item.tone === "success" ? "text-success" : item.tone === "info" ? "text-info" : "text-warning"}`}>
                  <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <strong className="block leading-tight">{item.title}</strong>
                  <p className="mt-1 text-sm leading-6 text-company-muted">{item.detail}</p>
                  <a className="btn btn-ghost btn-sm mt-3" href={item.href}>{item.action}</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ModuleLauncher() {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <p className="eyebrow">Operate</p>
          <h2 className="text-xl font-black">Company map shortcuts</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <a className="rounded-company border border-base-300 bg-base-200/45 p-4 no-underline transition hover:border-primary hover:bg-primary/5" href={module.href} key={module.title}>
              <span className="dashboard-icon dashboard-icon-sm text-primary">
                <i className={`ph-bold ${module.icon}`} aria-hidden="true"></i>
              </span>
              <strong className="mt-3 block">{module.title}</strong>
              <span className="mt-2 block text-sm leading-6 text-company-muted">{module.detail}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkbenchPreview({ connection }: { connection: ConnectionData }) {
  const rows = operatingPreviewRows(connection);
  const columns: Array<TableColumn<OperatingPreviewRow>> = [
    {
      key: "area",
      header: "Operating area",
      cell: (row) => (
        <div>
          <strong className="block">{row.area}</strong>
          <span className="text-xs text-company-muted">{row.ownership}</span>
        </div>
      )
    },
    {
      key: "tables",
      header: "Tables",
      className: "text-right",
      cell: (row) => <span className="font-black">{row.tables}</span>
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => <span className="badge badge-outline">{row.source}</span>
    },
    {
      key: "action",
      header: "Next action",
      cell: (row) => <a className="btn btn-ghost btn-xs" href={row.action.href}>{row.action.label}</a>
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Workbench primitive</p>
            <h2 className="text-xl font-black">Operating model table preview</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              This is the React/DaisyUI table primitive that will carry dense workbench migrations:
              clear ownership, comparable rows, local empty state, and action placement inside the table surface.
            </p>
          </div>
          <LocalNotice
            tone="success"
            title="Reusable primitive live"
            detail="This table is fed by `/v1/connection` operating-area data, not static mock rows."
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No operating areas available"
          emptyDetail="CompanyCore could not find non-system operating areas in the owner connection response."
        />
      </div>
    </section>
  );
}

function MigrationTable() {
  type MigrationRow = {
    id: string;
    name: string;
    role: string;
    status: "Ready" | "Next";
  };
  const rows: MigrationRow[] = [
    { id: "command", name: "Command panel", role: "React component", status: "Ready" },
    { id: "attention", name: "Attention rows", role: "DaisyUI themed cards", status: "Ready" },
    { id: "module", name: "Module launcher", role: "Reusable shortcut grid", status: "Ready" },
    { id: "table", name: "Dense workbench table", role: "Reusable table primitive", status: "Ready" },
    { id: "notification", name: "Local notification", role: "Reusable action feedback primitive", status: "Ready" },
    { id: "workbench", name: "Workbench route migration", role: "Next migration slice", status: "Next" }
  ];
  const columns: Array<TableColumn<MigrationRow>> = [
    {
      key: "name",
      header: "Primitive",
      cell: (row) => <span className="font-black">{row.name}</span>
    },
    {
      key: "role",
      header: "Migration role",
      cell: (row) => row.role
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span className={row.status === "Ready" ? "badge badge-success" : "badge badge-warning"}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <p className="eyebrow">Migration ledger</p>
          <h2 className="text-xl font-black">React primitive readiness</h2>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No migration primitives"
          emptyDetail="Add at least one primitive before migrating workbench routes."
        />
      </div>
    </section>
  );
}

type AreaStatus = "ready" | "review" | "blocked" | "empty";

type CanonicalArea = {
  key: string;
  label: string;
  shortLabel: string;
  lens: string;
  icon: string;
  backendAliases?: string[];
};

type AreaViewState = CanonicalArea & {
  backendArea?: OperatingArea;
  tableCount: number;
  status: AreaStatus;
  statusLabel: string;
  detail: string;
  href: string;
};

type AreaCapability = {
  id: string;
  label: string;
  icon: string;
  href: string;
};

type DepartmentSubsystem = {
  name: string;
  purpose: string;
  layer: "strategy" | "demand" | "delivery" | "support" | "control" | "learning" | "infrastructure";
};

type DepartmentSystemConfig = {
  systemName: string;
  valueRole: string;
  ownerQuestion: string;
  agentHandoff: string;
  firstSafeAction: string;
  blockedActions: string[];
  subsystems: DepartmentSubsystem[];
};

type LayerKey = "goals" | "workflows" | "tasks" | "knowledge" | "sources";

const canonicalAreas: CanonicalArea[] = [
  { key: "00-ogolny", label: "00 Ogolny", shortLabel: "00", lens: "Workspace", icon: "ph-compass", backendAliases: ["main-general", "00 general", "00 glowny"] },
  { key: "01-strategia", label: "01 Strategia", shortLabel: "01", lens: "Govern", icon: "ph-target", backendAliases: ["strategy-governance", "strategy", "governance", "goals", "targets"] },
  { key: "02-produkt", label: "02 Produkt", shortLabel: "02", lens: "Build", icon: "ph-cube", backendAliases: ["02 product", "product"] },
  { key: "03-sprzedaz", label: "03 Sprzedaz", shortLabel: "03", lens: "Sell", icon: "ph-handshake", backendAliases: ["sales-crm", "03 sales", "sales", "deals", "clients"] },
  { key: "04-operacje", label: "04 Operacje", shortLabel: "04", lens: "Deliver", icon: "ph-gear-six", backendAliases: ["operations-administration", "04 operations", "operations", "procedures"] },
  { key: "05-relacje", label: "05 Relacje", shortLabel: "05", lens: "Relationships", icon: "ph-git-branch", backendAliases: ["05 relations", "relations", "stakeholders", "clients"] },
  { key: "06-kadry", label: "06 Kadry", shortLabel: "06", lens: "People", icon: "ph-users-three", backendAliases: ["people-roles", "06 people", "people", "roles"] },
  { key: "07-finanse", label: "07 Finanse", shortLabel: "07", lens: "Control", icon: "ph-chart-line-up", backendAliases: ["finance-billing", "07 finances", "finance", "billing"] },
  { key: "08-zasoby", label: "08 Zasoby", shortLabel: "08", lens: "Support", icon: "ph-archive", backendAliases: ["assets-storage", "08 resources", "resources", "artifacts"] },
  { key: "09-technologia", label: "09 Technologia", shortLabel: "09", lens: "Automate", icon: "ph-cpu", backendAliases: ["ai-agents-observability", "09 technology", "technology", "agents", "audit"] },
  { key: "10-prawo", label: "10 Prawo", shortLabel: "10", lens: "Guard", icon: "ph-scales", backendAliases: ["knowledge-decisions", "10 law", "law", "policies", "standards"] },
  { key: "11-innowacje", label: "11 Innowacje", shortLabel: "11", lens: "Learn", icon: "ph-sparkle", backendAliases: ["marketing-growth", "11 innovations", "innovations", "growth"] },
  { key: "12-zarzadzanie", label: "12 Zarzadzanie", shortLabel: "12", lens: "Manage", icon: "ph-crown", backendAliases: ["ai-agents-observability", "12 management", "management", "observability"] }
];

const areaCapabilities: AreaCapability[] = [
  { id: "overview", label: "Overview", icon: "ph-gauge", href: "/areas" },
  { id: "goals", label: "Goals", icon: "ph-target", href: "/data/targets" },
  { id: "workflows", label: "Workflows", icon: "ph-flow-arrow", href: "/react-company-os" },
  { id: "tasks", label: "Tasks", icon: "ph-list-checks", href: "/react-tasks" },
  { id: "knowledge", label: "Knowledge", icon: "ph-books", href: "/settings/drive" },
  { id: "resources", label: "Resources", icon: "ph-database", href: "/areas" },
  { id: "decisions", label: "Decisions", icon: "ph-seal-check", href: "/react-company-os" },
  { id: "ai", label: "AI", icon: "ph-robot", href: "/react-agent-tools" }
];

const departmentSystemRegistry: Record<string, DepartmentSystemConfig> = {
  "00-ogolny": {
    systemName: "Company Orchestration System",
    valueRole: "Receives every unclassified signal and turns it into a safe department path.",
    ownerQuestion: "What needs owner attention, routing, or a decision before the company acts?",
    agentHandoff: "Agents may surface evidence and propose routes; execution stays inside approved department commands.",
    firstSafeAction: "Review intake and create a route proposal.",
    blockedActions: ["auto-acknowledge agent output", "provider retry", "approval decision", "invoice or discount write"],
    subsystems: [
      { name: "Global intake", purpose: "Owner ideas, provider signals, Paperclip output, risks, and feedback.", layer: "control" },
      { name: "Routing desk", purpose: "Classification, department proposal, owner decision request, and handoff evidence.", layer: "delivery" },
      { name: "Company health", purpose: "Cross-department blockers, stale evidence, pending approvals, and system readiness.", layer: "strategy" }
    ]
  },
  "01-strategia": {
    systemName: "Strategy Management System",
    valueRole: "Keeps company direction, priorities, KPIs, decisions, and portfolio choices coherent.",
    ownerQuestion: "Which goal, risk, or decision should steer the next company move?",
    agentHandoff: "Agents can summarize goals, risks, and decision gaps, then propose planning tasks.",
    firstSafeAction: "Create or review a strategic planning task.",
    blockedActions: ["change company strategy autonomously", "close goals without evidence", "hide strategic risks"],
    subsystems: [
      { name: "Goals and targets", purpose: "Strategic outcomes, KPIs, target states, and operating priorities.", layer: "strategy" },
      { name: "Roadmap and portfolio", purpose: "Sequencing of initiatives, commitments, and opportunity tradeoffs.", layer: "strategy" },
      { name: "Decision and risk memory", purpose: "Durable rationale, assumptions, risk review, and strategy evidence.", layer: "control" }
    ]
  },
  "02-produkt": {
    systemName: "Product And Delivery Management System",
    valueRole: "Turns promises into scoped products, services, plans, acceptance, and delivery evidence.",
    ownerQuestion: "What value is promised, being built, blocked, tested, or ready for acceptance?",
    agentHandoff: "Agents can prepare specs, task drafts, acceptance evidence, and delivery gap proposals.",
    firstSafeAction: "Review backlog or delivery evidence and create a scoped task.",
    blockedActions: ["change client scope without approval", "mark acceptance without proof", "ship unverified work"],
    subsystems: [
      { name: "Offer and catalog", purpose: "Services, products, packages, deliverables, and promise boundaries.", layer: "demand" },
      { name: "Delivery planning", purpose: "Backlog, milestones, execution plans, task breakdown, and dependencies.", layer: "delivery" },
      { name: "Acceptance evidence", purpose: "Tests, review artifacts, client acceptance, and delivery closure.", layer: "control" }
    ]
  },
  "03-sprzedaz": {
    systemName: "Sales Management System",
    valueRole: "Finds, qualifies, discovers, offers, follows up, and converts valuable work.",
    ownerQuestion: "Which lead, discovery, offer, price, or follow-up needs action now?",
    agentHandoff: "Agents can research leads, draft discovery notes, prepare offers, and flag commercial exceptions.",
    firstSafeAction: "Create a follow-up, discovery, or offer-prep task.",
    blockedActions: ["quote autonomously", "apply discount autonomously", "send binding offers without owner approval"],
    subsystems: [
      { name: "Lead and opportunity pipeline", purpose: "Prospects, qualification, current client work, and sales stages.", layer: "demand" },
      { name: "Discovery and offer", purpose: "Needs, scope, proposal drafts, price context, and next commercial action.", layer: "demand" },
      { name: "Discount context", purpose: "Commercial exceptions such as 100 percent discounts with owner review.", layer: "control" }
    ]
  },
  "04-operacje": {
    systemName: "Operations Management System",
    valueRole: "Keeps routines, procedures, dependencies, controls, and delivery rhythm executable.",
    ownerQuestion: "Which procedure, dependency, routine, or approval is blocking smooth operations?",
    agentHandoff: "Agents can inspect procedures and propose improvement tasks; operational writes remain command-gated.",
    firstSafeAction: "Review procedure/dependency evidence and create an operations improvement task.",
    blockedActions: ["bypass approvals", "change SOPs without evidence", "treat unowned work as operations by default"],
    subsystems: [
      { name: "Planning and routines", purpose: "Recurring operations, business functions, schedules, and operating rhythm.", layer: "delivery" },
      { name: "SOPs and procedures", purpose: "Procedures, steps, dependencies, controls, and quality gates.", layer: "control" },
      { name: "Improvement queue", purpose: "Operational defects, retros, fixes, and standards updates.", layer: "learning" }
    ]
  },
  "05-relacje": {
    systemName: "Relationship Management System",
    valueRole: "Maintains clients, stakeholders, support, success signals, referrals, and archived learning.",
    ownerQuestion: "Which client, stakeholder, follow-up, support item, or archive insight needs attention?",
    agentHandoff: "Agents can prepare relationship summaries, follow-up drafts, archive insights, and support tasks.",
    firstSafeAction: "Review relationship health and create a follow-up task.",
    blockedActions: ["message clients autonomously", "delete archive evidence", "treat support as sales without context"],
    subsystems: [
      { name: "Active clients", purpose: "Current clients, stakeholders, interactions, health, and support.", layer: "support" },
      { name: "Archived clients", purpose: "Historical client work, old outcomes, lessons, and process improvement evidence.", layer: "learning" },
      { name: "Success and referrals", purpose: "Feedback, satisfaction, retention, referrals, and expansion opportunities.", layer: "support" }
    ]
  },
  "06-kadry": {
    systemName: "People/Agents And Role Management System",
    valueRole: "Maps humans and AI agents to roles, responsibilities, capacity, authority, and escalation.",
    ownerQuestion: "Who or which agent owns this work, has capacity, and can escalate safely?",
    agentHandoff: "Paperclip can use the roster to plan staffing proposals but cannot create authority for itself.",
    firstSafeAction: "Review role/capacity gaps and create a staffing or agent-setup task.",
    blockedActions: ["grant permissions autonomously", "create unsupervised agents", "treat PAEI as permission"],
    subsystems: [
      { name: "Human and agent roster", purpose: "People, AI units, statuses, responsibilities, and ownership.", layer: "support" },
      { name: "Capacity and escalation", purpose: "Availability, workload, escalation paths, and decision ownership.", layer: "control" },
      { name: "Authority and permissions", purpose: "Capabilities, scopes, service keys, approvals, and least privilege.", layer: "infrastructure" }
    ]
  },
  "07-finanse": {
    systemName: "Finance And Billing Management System",
    valueRole: "Connects delivered value to prices, labor value, discounts, invoices, payments, and margin.",
    ownerQuestion: "Which work needs price context, discount review, invoice readiness, or payment follow-up?",
    agentHandoff: "Agents may surface pricing conflicts and draft estimates; commercial writes need owner approval.",
    firstSafeAction: "Review price/discount context and create a finance follow-up task.",
    blockedActions: ["invoice autonomously", "choose pricing policy autonomously", "apply discounts without approval"],
    subsystems: [
      { name: "Price list and hourly value", purpose: "Service models, labor value, cost assumptions, and margin context.", layer: "control" },
      { name: "Discount and exceptions", purpose: "100 percent discounts, owner approvals, and commercial rationale.", layer: "control" },
      { name: "Invoice and payment readiness", purpose: "Delivered value, invoice draft state, receivables, and closure.", layer: "delivery" }
    ]
  },
  "08-zasoby": {
    systemName: "Assets And Resource Management System",
    valueRole: "Keeps files, folders, prompts, repos, resources, tools, and knowledge sources addressable.",
    ownerQuestion: "Which resource is missing, stale, unscoped, or needed for delivery?",
    agentHandoff: "Agents can read scoped resources and propose cleanup; provider writes stay in guarded routes.",
    firstSafeAction: "Review unassigned or stale resources and create a cleanup task.",
    blockedActions: ["delete provider files", "move provider folders without scope approval", "trust stale evidence blindly"],
    subsystems: [
      { name: "Files and folders", purpose: "Drive roots, imported files, scope ownership, and freshness.", layer: "infrastructure" },
      { name: "Reusable resources", purpose: "Prompts, templates, assets, repositories, and tool references.", layer: "support" },
      { name: "Source freshness", purpose: "Stale, unmapped, untrusted, and missing evidence review.", layer: "control" }
    ]
  },
  "09-technologia": {
    systemName: "Technology And AI Infrastructure Management System",
    valueRole: "Runs integrations, MCP, API keys, deployment health, observability, and AI infrastructure.",
    ownerQuestion: "Which integration, key, MCP tool, agent capability, or runtime signal needs action?",
    agentHandoff: "Agents can inspect manifest and health; tool access is capability-scoped and supervised.",
    firstSafeAction: "Review integration/MCP health and create a technical follow-up task.",
    blockedActions: ["expose secrets", "expand service-key scope without review", "let agents bypass HTTP/MCP"],
    subsystems: [
      { name: "MCP and API access", purpose: "Tool catalog, service keys, scopes, manifests, and supervision.", layer: "infrastructure" },
      { name: "Integration health", purpose: "Provider settings, webhooks, sync status, retry queues, and readiness.", layer: "infrastructure" },
      { name: "Runtime observability", purpose: "Health, audit, logs, deploy metadata, and incident signals.", layer: "control" }
    ]
  },
  "10-prawo": {
    systemName: "Legal, Standards, And Decision Management System",
    valueRole: "Keeps standards, policies, controls, risks, decisions, and compliance boundaries visible.",
    ownerQuestion: "Which rule, decision, risk, standard, or approval boundary applies here?",
    agentHandoff: "Agents can cite standards and propose policy updates; legal/compliance changes require owner review.",
    firstSafeAction: "Review applicable standard/risk and create a governance task.",
    blockedActions: ["make legal commitments autonomously", "archive standards without audit", "ignore active risk controls"],
    subsystems: [
      { name: "Policies and standards", purpose: "Operating rules, standards, templates, and governance expectations.", layer: "control" },
      { name: "Risks and controls", purpose: "Risk register, controls, mitigations, compliance evidence, and blockers.", layer: "control" },
      { name: "Decision memory", purpose: "Decision logs, rationale, approvals, and future review triggers.", layer: "learning" }
    ]
  },
  "11-innowacje": {
    systemName: "Innovation And Growth Management System",
    valueRole: "Turns experiments, feedback, market signals, and retros into better offers and systems.",
    ownerQuestion: "Which idea, feedback signal, experiment, or improvement should be tested next?",
    agentHandoff: "Agents can cluster feedback and propose experiments; changes still enter the company task loop.",
    firstSafeAction: "Create an experiment or improvement proposal task.",
    blockedActions: ["launch paid ads without approval", "change offers from one signal", "skip feedback evidence"],
    subsystems: [
      { name: "Feedback loop", purpose: "Post-delivery surveys, retros, client notes, and learning signals.", layer: "learning" },
      { name: "Experiments", purpose: "Hypotheses, tests, outcomes, and growth opportunities.", layer: "learning" },
      { name: "Improvement pipeline", purpose: "Standards, processes, offers, and system updates derived from evidence.", layer: "delivery" }
    ]
  },
  "12-zarzadzanie": {
    systemName: "Executive Management System",
    valueRole: "Gives the owner cross-department command, approvals, escalation, and portfolio control.",
    ownerQuestion: "Which department, approval, blocker, portfolio item, or agent autonomy decision needs the owner?",
    agentHandoff: "Agents can prepare briefs and escalation proposals; owner authority remains explicit.",
    firstSafeAction: "Review cross-department health and decide the next priority.",
    blockedActions: ["approve on behalf of owner", "hide department blockers", "expand autonomy without evidence"],
    subsystems: [
      { name: "Owner command", purpose: "Top priorities, decisions, blockers, approvals, and escalation.", layer: "strategy" },
      { name: "Portfolio health", purpose: "Department readiness, stale data, risk, delivery, and finance signals.", layer: "control" },
      { name: "Agent autonomy review", purpose: "What agents can read, propose, execute, or must escalate.", layer: "infrastructure" }
    ]
  }
};

function departmentSystemConfig(areaKey: string) {
  return departmentSystemRegistry[areaKey] ?? departmentSystemRegistry["00-ogolny"];
}

function normalizeAreaMatcherValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function areaKeyCandidates(area: OperatingArea) {
  return [
    area.key,
    area.name,
    area.description || "",
    ...(area.tables || []).flatMap((table) => [table.name, table.apiSlug, table.source || ""])
  ].map((value) => normalizeAreaMatcherValue(value));
}

function findBackendArea(connection: ConnectionData, canonical: CanonicalArea) {
  const canonicalNumber = canonical.shortLabel;
  const canonicalKey = normalizeAreaMatcherValue(canonical.key);
  const canonicalName = normalizeAreaMatcherValue(canonical.label.replace(/^\d+\s+/, ""));
  const aliasCandidates = [canonical.key, canonical.label, ...(canonical.backendAliases || [])]
    .map((alias) => normalizeAreaMatcherValue(alias));

  const scoredAreas = connection.operatingModel.areas
    .map((area) => {
      const candidates = areaKeyCandidates(area);
      const score = candidates.reduce((total, candidate) => {
        const exactAlias = aliasCandidates.some((alias) => candidate === alias || candidate.includes(alias));
        const canonicalMatch = candidate.includes(canonicalKey) || candidate.includes(canonicalName);
        const numberedTableMatch = candidate.startsWith(`${canonicalNumber} `) || candidate.includes(` ${canonicalNumber} `);
        return total + (exactAlias ? 12 : 0) + (canonicalMatch ? 8 : 0) + (numberedTableMatch ? 5 : 0);
      }, 0);
      return { area, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scoredAreas[0]?.area;
}

function areaStatus(area?: OperatingArea): AreaStatus {
  if (!area) {
    return "empty";
  }
  const tables = area.tables?.length || 0;
  if (tables === 0) {
    return "review";
  }
  return "ready";
}

function areaStatusLabel(status: AreaStatus) {
  return {
    ready: "Ready",
    review: "Review",
    blocked: "Blocked",
    empty: "Empty"
  }[status];
}

function buildAreaViewState(connection: ConnectionData): AreaViewState[] {
  return canonicalAreas.map((canonical) => {
    const backendArea = findBackendArea(connection, canonical);
    const status = areaStatus(backendArea);
    const tableCount = backendArea?.tables?.length || 0;
    const detail = backendArea?.description
      || (status === "empty"
        ? "Area exists in the V1 operating map, but no backend area match is visible yet."
        : `${tableCount} linked table${tableCount === 1 ? "" : "s"} in the current workspace.`);

    return {
      ...canonical,
      backendArea,
      tableCount,
      status,
      statusLabel: areaStatusLabel(status),
      detail,
      href: `/areas?area=${canonical.key}`
    };
  });
}

function areaStatusClass(status: AreaStatus) {
  return {
    ready: "is-ready",
    review: "is-review",
    blocked: "is-blocked",
    empty: "is-empty"
  }[status];
}

function areaToneClass(status: AreaStatus) {
  return {
    ready: "text-success",
    review: "text-warning",
    blocked: "text-error",
    empty: "text-company-muted"
  }[status];
}

function areaHref(area: AreaViewState, capabilityId = "overview") {
  return `${area.href}&view=${capabilityId}`;
}

function ownershipCoverage(areas: AreaViewState[]) {
  const available = areas.filter((area) => area.status !== "empty").length;
  return Math.round((available / areas.length) * 100);
}

function reviewCount(areas: AreaViewState[]) {
  return areas.filter((area) => area.status === "review").length;
}

function DashboardStatePanel({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  if (state.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return (
    <main className="atlas-shell atlas-shell-signed-out" data-theme="companycore">
      <section className="atlas-state-panel">
        <span className="atlas-brand-mark">CC</span>
        <StatePanel state={state} onRetry={onRetry} />
      </section>
    </main>
  );
}

function OwnerLoginRedirect() {
  useEffect(() => {
    sharedRedirectToOwnerLogin();
  }, []);

  return (
    <main className="atlas-shell atlas-shell-signed-out" data-theme="companycore">
      <section className="atlas-state-panel" aria-live="polite">
        <span className="atlas-brand-mark">CC</span>
        <div className="alert alert-info" role="status">
          <i className="ph-bold ph-arrows-clockwise text-xl" aria-hidden="true"></i>
          <div>
            <strong>Opening sign in</strong>
            <p className="text-sm">CompanyCore is preparing your owner session.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AreaSidebar({
  areas,
  selectedArea,
  activeCapability,
  ownerLabel,
  ownerDetail,
  onSelectArea,
  onSelectCapability
}: {
  areas: AreaViewState[];
  selectedArea: AreaViewState;
  activeCapability: string;
  ownerLabel: string;
  ownerDetail: string;
  onSelectArea: (key: string) => void;
  onSelectCapability: (capability: string) => void;
}) {
  return (
    <aside className="area-sidebar" aria-label="LuckySparrow company areas">
      <a className="area-sidebar-brand" href="/dashboard">
        <span className="atlas-brand-mark">
          <i className="ph-bold ph-cube" aria-hidden="true"></i>
        </span>
        <span>
          <strong>LuckySparrow</strong>
          <small>Company Atlas</small>
        </span>
      </a>

      <nav className="area-sidebar-nav" aria-label="Dzialy">
        <a className="area-atlas-link is-active" href="/dashboard">
          <i className="ph-bold ph-map-trifold" aria-hidden="true"></i>
          <span>Company Atlas</span>
        </a>
        <p className="area-sidebar-kicker">Dzialy</p>
        {areas.map((area) => {
          const selected = area.key === selectedArea.key;
          return (
            <section className="area-sidebar-section" key={area.key}>
              <button
                className={`area-sidebar-row ${selected ? "is-selected" : ""}`}
                type="button"
                onClick={() => onSelectArea(area.key)}
                aria-expanded={selected}
              >
                <span className={`area-status-dot ${areaStatusClass(area.status)}`} aria-hidden="true"></span>
                <span className="area-sidebar-label">{area.label}</span>
                <span className="area-sidebar-count">{area.tableCount}</span>
              </button>
              {selected ? (
                <div className="area-sidebar-subnav" aria-label={`${area.label} views`}>
                  {areaCapabilities.map((capability) => (
                    <button
                      className={activeCapability === capability.id ? "is-active" : ""}
                      type="button"
                      key={capability.id}
                      onClick={() => onSelectCapability(capability.id)}
                    >
                      {capability.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => onSelectCapability("add-view")}>+ Add view</button>
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>

      <footer className="area-sidebar-footer">
        <a className="area-sidebar-system" href="/settings/account">
          <i className="ph-bold ph-sliders-horizontal" aria-hidden="true"></i>
          <span>Workspace settings</span>
        </a>
        <a className="area-sidebar-user" href="/settings/account">
          <span className="area-sidebar-avatar">
            <i className="ph-bold ph-user" aria-hidden="true"></i>
          </span>
          <span>
            <strong>{ownerLabel}</strong>
            <small>{ownerDetail}</small>
          </span>
          <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
        </a>
      </footer>
    </aside>
  );
}

function MobileAppBar({ workspaceName }: { workspaceName: string }) {
  return (
    <header className="mobile-atlas-appbar">
      <a className="mobile-icon-link" href="/dashboard" aria-label="Open atlas">
        <i className="ph-bold ph-list" aria-hidden="true"></i>
      </a>
      <div className="mobile-appbar-title">
        <strong>LuckySparrow</strong>
        <span>{workspaceName}</span>
      </div>
      <a className="mobile-icon-link" href="/settings/api" aria-label="Search and agent access">
        <i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
      </a>
      <a className="mobile-shield-link" href="/settings/api" aria-label="Agent guardrails">
        <i className="ph-bold ph-shield-check" aria-hidden="true"></i>
        <span className="area-status-dot is-ready" aria-hidden="true"></span>
      </a>
    </header>
  );
}

function DashboardHeader({
  connection,
  areas,
  selectedArea
}: {
  connection: ConnectionData;
  areas: AreaViewState[];
  selectedArea: AreaViewState;
}) {
  const coverage = ownershipCoverage(areas);
  const decisions = reviewCount(areas);
  return (
    <header className="atlas-header">
      <div>
        <p>LuckySparrow / Company Atlas</p>
        <h1>{selectedArea.label}</h1>
      </div>
      <label className="atlas-search">
        <i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
        <input type="search" placeholder="Search area, process, resource..." aria-label="Search area, process, resource" />
      </label>
      <div className="atlas-status-cluster" aria-label="Workspace status">
        <span>{areas.length} areas</span>
        <span>{coverage}% ownership</span>
        <span>{decisions} decisions</span>
      </div>
      <a className="atlas-icon-button" href="/settings/account" aria-label="Workspace settings">
        <i className="ph-bold ph-faders-horizontal" aria-hidden="true"></i>
      </a>
      <span className="atlas-header-workspace">{connection.workspace.name}</span>
    </header>
  );
}

function MobileAreaSelector({
  areas,
  selectedArea,
  onSelectArea
}: {
  areas: AreaViewState[];
  selectedArea: AreaViewState;
  onSelectArea: (key: string) => void;
}) {
  return (
    <section className="mobile-area-strip" aria-label="Dzialy">
      <div className="mobile-area-strip-heading">
        <h2>Dzialy</h2>
        <a href="/dashboard">
          <i className="ph-bold ph-map-trifold" aria-hidden="true"></i>
          Map
        </a>
      </div>
      <nav className="mobile-area-selector" aria-label="Dzialy">
        {areas.map((area) => (
          <button
            className={area.key === selectedArea.key ? "is-selected" : ""}
            type="button"
            key={area.key}
            onClick={() => onSelectArea(area.key)}
          >
            <span className={`area-status-dot ${areaStatusClass(area.status)}`} aria-hidden="true"></span>
            {area.label}
          </button>
        ))}
      </nav>
    </section>
  );
}

function MobileCompanySummary({
  areas,
  connection
}: {
  areas: AreaViewState[];
  connection: ConnectionData;
}) {
  const coverage = ownershipCoverage(areas);
  const decisions = reviewCount(areas);
  return (
    <section className="mobile-company-summary" aria-label="Company Atlas summary">
      <div className="mobile-summary-heading">
        <div>
          <h1>Company Atlas</h1>
          <p>Area-first company control</p>
        </div>
        <a href="/areas">Open priority <i className="ph-bold ph-caret-right" aria-hidden="true"></i></a>
      </div>
      <div className="mobile-summary-metrics">
        <span>
          <i className="ph-bold ph-squares-four" aria-hidden="true"></i>
          <strong>{areas.length}</strong>
          <small>areas</small>
        </span>
        <span>
          <i className="ph-bold ph-shield-check" aria-hidden="true"></i>
          <strong>{coverage}%</strong>
          <small>ownership</small>
        </span>
        <span>
          <i className="ph-bold ph-clock" aria-hidden="true"></i>
          <strong>{decisions}</strong>
          <small>decisions</small>
        </span>
        <span>
          <i className="ph-bold ph-robot" aria-hidden="true"></i>
          <strong>AI</strong>
          <small>{connection.mcpManifest ? "guarded" : "review"}</small>
        </span>
      </div>
    </section>
  );
}

function AtlasNode({
  area,
  selected,
  index,
  onSelectArea
}: {
  area: AreaViewState;
  selected: boolean;
  index: number;
  onSelectArea: (key: string) => void;
}) {
  const style = { "--node-index": index } as React.CSSProperties;
  return (
    <button
      className={`atlas-node ${selected ? "is-selected" : ""} ${areaStatusClass(area.status)}`}
      style={style}
      type="button"
      onClick={() => onSelectArea(area.key)}
      aria-label={`Select ${area.label}`}
    >
      <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
      <em className={`area-status-dot ${areaStatusClass(area.status)}`} aria-hidden="true"></em>
      <span>{area.shortLabel}</span>
      <small>{area.label.replace(/^\d+\s+/, "")}</small>
    </button>
  );
}

function CompanyAtlasBoard({
  areas,
  selectedArea,
  onSelectArea
}: {
  areas: AreaViewState[];
  selectedArea: AreaViewState;
  onSelectArea: (key: string) => void;
}) {
  const orbitAreas = areas.filter((area) => area.key !== "00-ogolny");
  const general = areas.find((area) => area.key === "00-ogolny") || areas[0];
  return (
    <section className="atlas-board" aria-label="Company operating atlas">
      <div className="atlas-board-topline">
        <div>
          <p className="atlas-kicker">APQC lens</p>
          <h2>Company operating system</h2>
          <h2 className="atlas-mobile-heading">Company overview</h2>
        </div>
        <div className="atlas-mobile-crumbs" aria-hidden="true">
          <span>Overview</span>
          <i className="ph-bold ph-arrow-right"></i>
          <strong>Area</strong>
          <i className="ph-bold ph-arrow-right"></i>
          <span>Capability</span>
        </div>
        <div className="atlas-lens-row" aria-label="Process lens">
          {["All", "Govern", "Build", "Sell", "Deliver", "Learn", "Automate"].map((lens) => (
            <button className={lens === selectedArea.lens || lens === "All" ? "is-active" : ""} type="button" key={lens}>{lens}</button>
          ))}
        </div>
      </div>
      <div className="atlas-orbit">
        <span className="atlas-ring atlas-ring-one" aria-hidden="true"></span>
        <span className="atlas-ring atlas-ring-two" aria-hidden="true"></span>
        <span className="atlas-connector vertical" aria-hidden="true"></span>
        <span className="atlas-connector horizontal" aria-hidden="true"></span>
        <button className={`atlas-core ${general.key === selectedArea.key ? "is-selected" : ""}`} type="button" onClick={() => onSelectArea(general.key)}>
          <i className={`ph-bold ${general.icon}`} aria-hidden="true"></i>
          <strong>{general.label}</strong>
          <span>{general.statusLabel}</span>
        </button>
        {orbitAreas.map((area, index) => (
          <AtlasNode
            area={area}
            index={index}
            key={area.key}
            selected={area.key === selectedArea.key}
            onSelectArea={onSelectArea}
          />
        ))}
      </div>
      <div className="atlas-legend" aria-label="Atlas legend">
        <span><i className="area-status-dot is-ready"></i> Ready</span>
        <span><i className="area-status-dot is-review"></i> Review</span>
        <span><i className="area-status-dot is-empty"></i> Empty accepted</span>
      </div>
    </section>
  );
}

function CapabilityTabs({
  activeCapability,
  onSelectCapability
}: {
  activeCapability: string;
  onSelectCapability: (capability: string) => void;
}) {
  return (
    <nav className="area-capability-tabs" aria-label="Area capabilities">
      {areaCapabilities.map((capability) => (
        <button
          className={activeCapability === capability.id ? "is-active" : ""}
          type="button"
          key={capability.id}
          onClick={() => onSelectCapability(capability.id)}
          aria-current={activeCapability === capability.id ? "page" : undefined}
        >
          <i className={`ph-bold ${capability.icon}`} aria-hidden="true"></i>
          {capability.label}
        </button>
      ))}
    </nav>
  );
}

const areaCapabilityTableGroups: Record<string, string[]> = {
  goals: ["goals", "targets", "metrics", "standards"],
  workflows: [
    "business-functions",
    "processes",
    "pipelines",
    "pipeline-stages",
    "procedures",
    "procedure-steps",
    "checklist-templates",
    "checklist-items",
    "dependencies",
    "automation-rules",
    "triggers"
  ],
  tasks: ["tasks", "projects", "pipeline-runs", "stage-runs", "acceptance-criteria"],
  knowledge: ["knowledge-items", "notes", "artifacts"],
  resources: ["resources", "tool-adapters", "integration-capabilities", "company-roles", "stakeholders", "clients"],
  decisions: ["decision-logs", "approvals", "risks", "controls", "policies", "audit-logs"],
  ai: ["tool-adapters", "integration-capabilities", "automation-rules", "audit-logs"]
};

function areaCapabilitySlugs(capabilityId: string) {
  return areaCapabilityTableGroups[capabilityId] || [];
}

function tableBelongsToCapability(table: NonNullable<OperatingArea["tables"]>[number], capabilityId: string) {
  const slugs = areaCapabilitySlugs(capabilityId);
  return slugs.length === 0 || slugs.includes(table.apiSlug);
}

function areaCapabilityTables(context: AreaDetailContext, capabilityId: string) {
  return context.tables.filter((table) => tableBelongsToCapability(table, capabilityId));
}

function areaCapabilityRecords(context: AreaDetailContext, capabilityId: string, limit = 6) {
  const slugs = new Set(areaCapabilitySlugs(capabilityId));
  return context.tableRecordRows
    .filter((row) => slugs.size === 0 || slugs.has(row.apiSlug))
    .slice(0, limit)
    .map((row) => ({
      title: compactRecordTitle(row.record),
      detail: `${row.tableName} - ${compactRecordDetail(row.record)}`,
      meta: row.apiSlug,
      href: row.href
    }));
}

function areaCapabilityTableItems(context: AreaDetailContext, capabilityId: string, limit = 6) {
  return areaCapabilityTables(context, capabilityId).slice(0, limit).map((table) => ({
    title: table.name,
    detail: `${table.tableName || table.apiSlug} - ${sharedTableRecordApiPath(table.apiSlug)}`,
    meta: `${context.tableRecordRows.filter((row) => row.apiSlug === table.apiSlug).length} records`,
    href: `/data/${table.apiSlug}`
  }));
}

function areaCapabilityProviderItems(context: AreaDetailContext, limit = 5) {
  return context.providerMappings.slice(0, limit).map((mapping) => ({
    title: mapping.name || mapping.externalId,
    detail: `${mapping.provider} - ${mapping.entityType}`,
    meta: mapping.tableId ? "table scope" : "area scope",
    href: "/relationships"
  }));
}

function areaCapabilityDriveItems(context: AreaDetailContext, limit = 5) {
  return context.driveItems.slice(0, limit).map((file) => ({
    title: file.name,
    detail: file.isFolder ? "Google Drive folder" : file.mimeType,
    meta: file.syncStatus || file.scanStatus || "scoped",
    href: file.webViewLink || "/settings/drive"
  }));
}

function intakeCount(summary: IntakeSummary | undefined, key: keyof IntakeSummary, value: string) {
  const bucket = summary?.[key];
  if (!bucket || typeof bucket === "number") {
    return 0;
  }
  return bucket[value] ?? 0;
}

function intakeRiskClass(risk: IntakeItem["risk"]) {
  return {
    low: "is-low",
    medium: "is-medium",
    high: "is-high",
    critical: "is-critical"
  }[risk];
}

function formatIntakeLabel(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

const intakeDepartmentRouteMap: Record<string, string> = {
  "00-main": "00-ogolny",
  "00-general": "00-ogolny",
  "00-ogolny": "00-ogolny",
  "01-strategy": "01-strategia",
  "01-strategia": "01-strategia",
  "02-product-delivery": "02-produkt",
  "02-product": "02-produkt",
  "02-produkt": "02-produkt",
  "03-sales": "03-sprzedaz",
  "03-sprzedaz": "03-sprzedaz",
  "04-operations": "04-operacje",
  "04-operacje": "04-operacje",
  "05-client-relations": "05-relacje",
  "05-relations": "05-relacje",
  "05-relacje": "05-relacje",
  "06-people-agents-roles": "06-kadry",
  "06-people": "06-kadry",
  "06-kadry": "06-kadry",
  "07-finance": "07-finanse",
  "07-finanse": "07-finanse",
  "08-assets-knowledge": "08-zasoby",
  "08-resources": "08-zasoby",
  "08-zasoby": "08-zasoby",
  "09-technology-automation": "09-technologia",
  "09-technology": "09-technologia",
  "09-technologia": "09-technologia",
  "10-governance-risk-legal": "10-prawo",
  "10-legal": "10-prawo",
  "10-prawo": "10-prawo",
  "11-innovation-improvement": "11-innowacje",
  "11-innovation": "11-innowacje",
  "11-innowacje": "11-innowacje",
  "12-management": "12-zarzadzanie",
  "12-zarzadzanie": "12-zarzadzanie"
};

function normalizeIntakeDepartmentKey(value: string) {
  return intakeDepartmentRouteMap[value] || "00-ogolny";
}

function MainIntakeSystemPanel({
  intake,
  status,
  connection,
  onRefresh,
  onSelectCapability
}: {
  intake: IntakeData | null;
  status: "idle" | "loading" | "ready" | "error";
  connection: ConnectionData;
  onRefresh: () => void;
  onSelectCapability: (capability: string) => void;
}) {
  const [proposalState, setProposalState] = useState<{
    itemId: string | null;
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ itemId: null, status: "idle", message: "" });
  const items = intake?.items ?? [];
  const ownerDecisions = items.filter((item) => item.status === "needs_owner_decision").slice(0, 5);
  const unassignedResources = items.filter((item) => item.family === "unassigned_resource").slice(0, 5);
  const blockedItems = items.filter((item) => item.status === "blocked" || item.risk === "critical" || item.risk === "high").slice(0, 5);
  const paperclipItems = items.filter((item) => item.sourceAgent === "paperclip" || item.source.toLowerCase().includes("agent")).slice(0, 5);
  const intakeToolVisible = Boolean(connection.mcpManifest?.tools?.some((tool) => tool.capability === "intake:read"));
  const metrics = [
    { label: "Total", value: intake?.summary.total ?? 0, icon: "ph-tray" },
    { label: "Decision", value: intakeCount(intake?.summary, "byStatus", "needs_owner_decision"), icon: "ph-seal-warning" },
    { label: "Blocked", value: intakeCount(intake?.summary, "byStatus", "blocked"), icon: "ph-warning-octagon" },
    { label: "Resources", value: intakeCount(intake?.summary, "byFamily", "unassigned_resource"), icon: "ph-folder-open" },
    { label: "High risk", value: (intakeCount(intake?.summary, "byRisk", "high") + intakeCount(intake?.summary, "byRisk", "critical")), icon: "ph-shield-warning" }
  ];

  return (
    <section className="main-intake-system-panel" id="main-intake-system" aria-label="00 Main global intake system">
      <div className="operations-system-header">
        <div>
          <p className="atlas-kicker">00 Main Management System</p>
          <h2>Global intake, routing, owner decisions</h2>
          <p>
            This is the read-only owner queue for background agent output, provider signals,
            unassigned resources, approvals, risks, feedback, and improvement candidates before
            work is routed into a department system.
          </p>
        </div>
        <a className="atlas-primary-action" href="/react-agent-tools">
          <i className="ph-bold ph-robot" aria-hidden="true"></i>
          Agent tools
        </a>
      </div>

      <div className="main-intake-status-row">
        <span className={`main-intake-status is-${status}`}>
          <i className="ph-bold ph-pulse" aria-hidden="true"></i>
          {status === "loading" ? "Loading intake" : status === "error" ? "Intake unavailable" : "Read-only intake"}
        </span>
        <span className={intakeToolVisible ? "main-intake-status is-ready" : "main-intake-status is-idle"}>
          <i className="ph-bold ph-plugs-connected" aria-hidden="true"></i>
          {intakeToolVisible ? "MCP intake tool visible" : "MCP intake scope review"}
        </span>
      </div>

      <div className="operations-system-metrics" aria-label="Global intake metrics">
        {metrics.map((metric) => (
          <span key={metric.label}>
            <i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </span>
        ))}
      </div>

      <div className="main-intake-filter-row" aria-label="Intake quick filters">
        <a href="/v1/intake?sourceAgent=paperclip">Paperclip</a>
        <a href="/v1/intake?status=needs_owner_decision">Owner decisions</a>
        <a href="/v1/intake?family=unassigned_resource">Unassigned resources</a>
        <a href="/v1/intake?risk=critical">Critical risk</a>
      </div>

      <div className="operations-system-grid">
        <MainIntakeSection
          title="Owner decisions"
          icon="ph-seal-warning"
          empty={status === "loading" ? "Reading owner decision queue." : "No owner decision intake items are visible."}
          items={ownerDecisions}
          proposalState={proposalState}
          onProposeRoute={handleProposeRoute}
        />
        <MainIntakeSection
          title="Paperclip and agents"
          icon="ph-robot"
          empty={status === "loading" ? "Reading agent output." : "No Paperclip or agent output is waiting in intake."}
          items={paperclipItems}
          proposalState={proposalState}
          onProposeRoute={handleProposeRoute}
        />
        <MainIntakeSection
          title="Resources to classify"
          icon="ph-folder-open"
          empty={status === "loading" ? "Reading unassigned resources." : "No unassigned Drive/provider resources are visible."}
          items={unassignedResources}
          proposalState={proposalState}
          onProposeRoute={handleProposeRoute}
        />
        <MainIntakeSection
          title="Risk and blockers"
          icon="ph-shield-warning"
          empty={status === "loading" ? "Reading risks and blockers." : "No high-risk intake items are visible."}
          items={blockedItems}
          proposalState={proposalState}
          onProposeRoute={handleProposeRoute}
        />
        <article className="operations-agent-packet main-intake-agent-packet">
          <div>
            <i className="ph-bold ph-flow-arrow" aria-hidden="true"></i>
            <h3>Routing packet</h3>
            <span>read-only</span>
          </div>
          <p>
            The next safe layer is classification and routing proposals. Acknowledge, retry,
            approve, invoice, discount, or delete actions stay outside this panel until they are
            implemented as explicit CompanyCore commands.
          </p>
          <div>
            <button type="button" onClick={() => onSelectCapability("tasks")}>Tasks</button>
            <button type="button" onClick={() => onSelectCapability("decisions")}>Decisions</button>
            <a href="/react-company-os">Approvals</a>
          </div>
        </article>
      </div>
    </section>
  );

  async function handleProposeRoute(item: IntakeItem) {
    const targetDepartmentKey = normalizeIntakeDepartmentKey(item.suggestedDepartment);
    setProposalState({ itemId: item.id, status: "loading", message: `Proposing route to ${formatIntakeLabel(targetDepartmentKey)}.` });
    try {
      const result = await proposeIntakeRoute(item, targetDepartmentKey);
      setProposalState({
        itemId: item.id,
        status: "success",
        message: result.effects.idempotentReplay
          ? "Route proposal already exists."
          : `Route proposal created for ${formatIntakeLabel(targetDepartmentKey)}.`
      });
      onRefresh();
    } catch (error) {
      setProposalState({
        itemId: item.id,
        status: "error",
        message: apiErrorMessage(error)
      });
    }
  }
}

function MainIntakeSection({
  title,
  icon,
  empty,
  items,
  proposalState,
  onProposeRoute
}: {
  title: string;
  icon: string;
  empty: string;
  items: IntakeItem[];
  proposalState: { itemId: string | null; status: "idle" | "loading" | "success" | "error"; message: string };
  onProposeRoute: (item: IntakeItem) => void;
}) {
  return (
    <article className="operations-system-section main-intake-section">
      <div>
        <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <div className="operations-system-list main-intake-list">
          {items.map((item) => (
            <span key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.summary || `${formatIntakeLabel(item.family)} from ${item.sourceModel}`}</small>
              <em className={intakeRiskClass(item.risk)}>
                {formatIntakeLabel(item.risk)} / {formatIntakeLabel(item.suggestedDepartment)}
              </em>
              {item.blockedActions.length > 0 ? (
                <small>{item.blockedActions[0]?.reason}</small>
              ) : null}
              {item.allowedActions.includes("route_to_department") ? (
                <button
                  type="button"
                  className="main-intake-proposal-action"
                  disabled={proposalState.status === "loading" && proposalState.itemId === item.id}
                  onClick={() => onProposeRoute(item)}
                >
                  <i className="ph-bold ph-signpost" aria-hidden="true"></i>
                  {proposalState.status === "loading" && proposalState.itemId === item.id ? "Proposing" : "Propose route"}
                </button>
              ) : null}
              {proposalState.itemId === item.id && proposalState.message ? (
                <small className={`main-intake-proposal-status is-${proposalState.status}`}>{proposalState.message}</small>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function moneyValue(value: number | null, currency: string | null) {
  if (value == null) {
    return "Source needed";
  }
  return `${value.toLocaleString("en-US")} ${currency || ""}`.trim();
}

function FinanceManagementBoard({
  finance,
  status,
  onSelectCapability
}: {
  finance: FinanceContextData | null;
  status: "idle" | "loading" | "ready" | "error";
  onSelectCapability: (capability: string) => void;
}) {
  const summary = finance?.summary;
  const pricingModels = finance?.pricingModels ?? [];
  const hourlyAssumptions = finance?.hourlyValueAssumptions ?? [];
  const exceptions = finance?.commercialExceptions ?? [];
  const invoiceBlockers = (finance?.invoiceReadiness ?? []).filter((item) => item.readinessStatus === "blocked").slice(0, 4);
  const conflicts = finance?.sourceConflicts ?? [];
  const blockedActions = finance?.agentPacket.blockedActions ?? [];
  const metrics = [
    { label: "Candidates", value: summary?.candidatePricingModels ?? 0, icon: "ph-tag" },
    { label: "Owner decisions", value: summary?.needsOwnerDecision ?? 0, icon: "ph-seal-warning" },
    { label: "Exceptions", value: summary?.openCommercialExceptions ?? 0, icon: "ph-percent" },
    { label: "Invoice blockers", value: summary?.invoiceReadinessBlocked ?? 0, icon: "ph-file-lock" },
    { label: "High risk", value: summary?.highRiskItems ?? 0, icon: "ph-shield-warning" }
  ];

  return (
    <section className="finance-management-board" id="finance-management-board" aria-label="07 Finance management board">
      <div className="operations-system-header">
        <div>
          <p className="atlas-kicker">07 Finance And Billing Management System</p>
          <h2>Pricing, value, exceptions, invoice readiness</h2>
          <p>
            Read-only finance context for owner decisions and Paperclip analysis.
            Active pricing, quotes, discounts, invoices, and payments stay blocked.
          </p>
        </div>
        <a className="atlas-primary-action" href="/v1/finance/context">
          <i className="ph-bold ph-database" aria-hidden="true"></i>
          API packet
        </a>
      </div>

      <div className="main-intake-status-row">
        <span className={`main-intake-status is-${status}`}>
          <i className="ph-bold ph-pulse" aria-hidden="true"></i>
          {status === "loading" ? "Loading finance" : status === "error" ? "Finance unavailable" : "Read-only finance"}
        </span>
        <span className="main-intake-status is-ready">
          <i className="ph-bold ph-lock-key" aria-hidden="true"></i>
          No money writes
        </span>
      </div>

      <div className="operations-system-metrics" aria-label="Finance metrics">
        {metrics.map((metric) => (
          <span key={metric.label}>
            <i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </span>
        ))}
      </div>

      <div className="finance-board-grid">
        <article className="finance-board-panel">
          <div className="area-layer-panel-title">
            <i className="ph-bold ph-tag" aria-hidden="true"></i>
            <h3>Price policy candidates</h3>
            <span>{pricingModels.length}</span>
          </div>
          <div className="finance-board-list">
            {pricingModels.length === 0 ? (
              <p>No pricing model source is visible for the current filter.</p>
            ) : pricingModels.slice(0, 4).map((model) => (
              <span key={model.id}>
                <strong>{model.name}</strong>
                <small>{model.market} / {model.status.replace(/_/g, " ")}</small>
                <em>
                  {model.setupFee ? `${moneyValue(model.setupFee, model.currency)} setup + ` : ""}
                  {model.recurringFee ? `${moneyValue(model.recurringFee, model.currency)}/mo` : "Archive/context"}
                </em>
              </span>
            ))}
          </div>
        </article>

        <article className="finance-board-panel">
          <div className="area-layer-panel-title">
            <i className="ph-bold ph-clock" aria-hidden="true"></i>
            <h3>Hourly value</h3>
            <span>{hourlyAssumptions.length}</span>
          </div>
          <div className="finance-board-list">
            {hourlyAssumptions.map((assumption) => (
              <span key={assumption.id}>
                <strong>{moneyValue(assumption.valuePerHour, assumption.currency)} / hour</strong>
                <small>{assumption.roleOrUnit}</small>
                <em>{assumption.status.replace(/_/g, " ")}</em>
              </span>
            ))}
          </div>
        </article>

        <article className="finance-board-panel">
          <div className="area-layer-panel-title">
            <i className="ph-bold ph-percent" aria-hidden="true"></i>
            <h3>Commercial exceptions</h3>
            <span>{exceptions.length}</span>
          </div>
          <div className="finance-board-list">
            {exceptions.length === 0 ? (
              <p>No discount or pro-bono exception is visible yet.</p>
            ) : exceptions.slice(0, 4).map((exception) => (
              <span key={exception.id}>
                <strong>{exception.discountPercent ?? "?"}% {exception.exceptionType.replace(/_/g, " ")}</strong>
                <small>{exception.clientName || "Client source needed"} / {exception.status.replace(/_/g, " ")}</small>
                <em>{moneyValue(exception.finalValue, exception.currency)}</em>
              </span>
            ))}
          </div>
        </article>

        <article className="finance-board-panel">
          <div className="area-layer-panel-title">
            <i className="ph-bold ph-file-lock" aria-hidden="true"></i>
            <h3>Invoice blockers</h3>
            <span>{invoiceBlockers.length}</span>
          </div>
          <div className="finance-board-list">
            {invoiceBlockers.length === 0 ? (
              <p>No invoice-ready work exists yet; provider commands remain blocked.</p>
            ) : invoiceBlockers.map((blocker) => (
              <span key={blocker.id}>
                <strong>{blocker.readinessStatus.replace(/_/g, " ")}</strong>
                <small>{blocker.missingEvidence.slice(0, 3).join(", ") || "owner review"}</small>
                <em>blocked</em>
              </span>
            ))}
          </div>
        </article>
      </div>

      <div className="finance-decision-strip">
        <article>
          <strong>Source conflicts</strong>
          {conflicts.length === 0 ? <span>No conflict visible.</span> : conflicts.slice(0, 3).map((conflict) => (
            <span key={`${conflict.type}-${conflict.message}`}>{conflict.message}</span>
          ))}
        </article>
        <article>
          <strong>Blocked actions</strong>
          {blockedActions.slice(0, 5).map((action) => (
            <span key={action.action}>{action.action.replace(/_/g, " ")}</span>
          ))}
        </article>
        <article>
          <strong>Next owner views</strong>
          <button type="button" onClick={() => onSelectCapability("decisions")}>Decisions</button>
          <button type="button" onClick={() => onSelectCapability("tasks")}>Tasks</button>
        </article>
      </div>
    </section>
  );
}

const operationsSystemSlugs = [
  "business-functions",
  "procedures",
  "procedure-steps",
  "approvals",
  "dependencies"
];

function operationSystemRows(context: AreaDetailContext, slugs: string[], limit = 5): AreaCapabilityBoardItem[] {
  const wanted = new Set(slugs);
  return context.tableRecordRows
    .filter((row) => wanted.has(row.apiSlug))
    .slice(0, limit)
    .map((row) => ({
      title: compactRecordTitle(row.record),
      detail: `${row.tableName} - ${compactRecordDetail(row.record)}`,
      meta: row.apiSlug,
      href: row.href
    }));
}

function operationSystemTables(context: AreaDetailContext, slugs: string[]) {
  const wanted = new Set(slugs);
  return context.tables.filter((table) => wanted.has(table.apiSlug));
}

function OperationsManagementSystemPanel({
  area,
  context,
  connection,
  onSelectCapability
}: {
  area: AreaViewState;
  context: AreaDetailContext;
  connection: ConnectionData;
  onSelectCapability: (capability: string) => void;
}) {
  if (area.key !== "04-operacje") {
    return null;
  }

  const procedures = operationSystemRows(context, ["procedures"], 4);
  const procedureSteps = operationSystemRows(context, ["procedure-steps"], 4);
  const approvals = operationSystemRows(context, ["approvals"], 4);
  const dependencies = operationSystemRows(context, ["dependencies"], 4);
  const businessFunctions = operationSystemRows(context, ["business-functions"], 4);
  const operationTables = operationSystemTables(context, operationsSystemSlugs);
  const commandItems = [
    {
      label: "Plan",
      title: "Planning authority",
      detail: businessFunctions.length > 0
        ? "Business functions are visible, so planning can start from owned operating areas."
        : "Add or import business functions before treating operations planning as complete.",
      metric: `${businessFunctions.length}`,
      icon: "ph-map-trifold",
      view: "workflows"
    },
    {
      label: "Run",
      title: "Routines and SOPs",
      detail: procedures.length > 0
        ? "Procedures are available as the operating rhythm for repeatable work."
        : "No procedures are loaded yet; recurring work should stay review-only.",
      metric: `${procedures.length}`,
      icon: "ph-list-checks",
      view: "workflows"
    },
    {
      label: "Control",
      title: "Approvals and dependencies",
      detail: approvals.length + dependencies.length > 0
        ? "Risky work can be inspected through approvals and dependency evidence."
        : "Approval and dependency records are empty in this department context.",
      metric: `${approvals.length + dependencies.length}`,
      icon: "ph-shield-check",
      view: "decisions"
    },
    {
      label: "Delegate",
      title: "Agent-safe packet",
      detail: connection.mcpManifest
        ? "Paperclip can read the operating context; writes still require command routes and approvals."
        : "Keep AI handoff read-only until MCP manifest context is available.",
      metric: connection.mcpManifest ? "Guarded" : "Review",
      icon: "ph-robot",
      view: "ai"
    }
  ];

  const metricItems = [
    { label: "Ops tables", value: `${operationTables.length}`, icon: "ph-database" },
    { label: "Procedures", value: `${procedures.length}`, icon: "ph-clipboard-text" },
    { label: "Steps", value: `${procedureSteps.length}`, icon: "ph-stairs" },
    { label: "Approvals", value: `${approvals.length}`, icon: "ph-seal-check" },
    { label: "Deps", value: `${dependencies.length}`, icon: "ph-git-merge" }
  ];

  return (
    <section className="operations-system-panel" id="operations-system" aria-label="04 Operations management system">
      <div className="operations-system-header">
        <div>
          <p className="atlas-kicker">04 Operations Management System</p>
          <h2>Planning, routines, controls, dependencies</h2>
          <p>
            Operacje is the owner surface for keeping the company plan executable:
            procedures, recurring routines, approvals, dependencies, and evidence
            stay together before the owner or an agent acts.
          </p>
        </div>
        <a className="atlas-primary-action" href="/react-company-os">
          Open Company OS
          <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
        </a>
      </div>

      <div className="operations-command-grid">
        {commandItems.map((item) => (
          <button
            type="button"
            className="operations-command-card"
            onClick={() => onSelectCapability(item.view)}
            key={item.label}
          >
            <span>
              <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
              <em>{item.label}</em>
            </span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <small>{item.metric}</small>
          </button>
        ))}
      </div>

      <div className="operations-system-metrics" aria-label="Operations system metrics">
        {metricItems.map((metric) => (
          <span key={metric.label}>
            <i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </span>
        ))}
      </div>

      <div className="operations-system-grid">
        <OperationsSystemSection
          title="Planning board"
          icon="ph-calendar-check"
          empty="No business functions, procedure plans, or dependencies are loaded for operations planning yet."
          items={[...businessFunctions, ...dependencies, ...procedures].slice(0, 6)}
        />
        <OperationsSystemSection
          title="Routine library"
          icon="ph-clipboard-text"
          empty="No procedures or procedure steps are loaded yet."
          items={[...procedures, ...procedureSteps].slice(0, 6)}
        />
        <OperationsSystemSection
          title="Controls and approvals"
          icon="ph-shield-warning"
          empty="No approvals or dependencies are visible for this department."
          items={[...approvals, ...dependencies].slice(0, 6)}
        />
        <article className="operations-agent-packet">
          <div>
            <i className="ph-bold ph-robot" aria-hidden="true"></i>
            <h3>Paperclip packet</h3>
            <span>{connection.mcpManifest ? "read-safe" : "manifest review"}</span>
          </div>
          <p>
            Agent context should include purpose, active plan, procedures,
            dependencies, approval needs, evidence sources, and allowed MCP tools.
            Risky operations stay behind CompanyCore commands and owner approval.
          </p>
          <div>
            <a href="/react-agent-tools">Agent tools</a>
            <a href="/settings/api">API scope</a>
            <a href="/react-company-os">Approvals</a>
          </div>
        </article>
      </div>
    </section>
  );
}

function OperationsSystemSection({
  title,
  icon,
  empty,
  items
}: {
  title: string;
  icon: string;
  empty: string;
  items: AreaCapabilityBoardItem[];
}) {
  return (
    <article className="operations-system-section">
      <div>
        <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <div className="operations-system-list">
          {items.map((item, index) => {
            const content = (
              <>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
                {item.meta ? <em>{item.meta}</em> : null}
              </>
            );
            return item.href ? (
              <a href={item.href} key={`${title}-${index}`}>{content}</a>
            ) : (
              <span key={`${title}-${index}`}>{content}</span>
            );
          })}
        </div>
      )}
    </article>
  );
}

function areaCapabilityMcpItems(connection: ConnectionData, capabilityId: string, limit = 6) {
  const tools = connection.mcpManifest?.tools || [];
  const filtered = capabilityId === "ai"
    ? tools
    : tools.filter((tool) => tool.capability.includes(capabilityId) || tool.path.includes(capabilityId));
  return filtered.slice(0, limit).map((tool) => ({
    title: tool.title || tool.name,
    detail: `${tool.method} ${tool.path}`,
    meta: tool.requiresApproval ? "approval" : tool.riskLevel,
    href: "/react-agent-tools"
  }));
}

function areaLayerInsights(context: AreaDetailContext): AreaLayerInsight[] {
  const graphCounts = context.operatingGraph?.summary;
  const layerDefinitions: Array<Omit<AreaLayerInsight, "count">> = [
    {
      id: "goals",
      label: "Goals + targets",
      detail: "Strategic intent, target values, success metrics, and standards visible for this department.",
      icon: "ph-target",
      tone: "green",
      tableSlugs: areaCapabilitySlugs("goals")
    },
    {
      id: "workflows",
      label: "Workflows",
      detail: "Processes, pipelines, procedures, dependencies, runs, and automation rhythm.",
      icon: "ph-flow-arrow",
      tone: "blue",
      tableSlugs: areaCapabilitySlugs("workflows")
    },
    {
      id: "tasks",
      label: "Tasks",
      detail: "Execution pressure from task records, task lists, pipeline runs, and acceptance criteria.",
      icon: "ph-list-checks",
      tone: "amber",
      tableSlugs: areaCapabilitySlugs("tasks")
    },
    {
      id: "knowledge",
      label: "Knowledge",
      detail: "Drive folders, docs, sheets, notes, artifacts, and proof sources connected to this area.",
      icon: "ph-books",
      tone: "green",
      tableSlugs: areaCapabilitySlugs("knowledge")
    },
    {
      id: "sources",
      label: "Sources",
      detail: "Backend tables, provider containers, and synced files that explain where the view comes from.",
      icon: "ph-plugs-connected",
      tone: "blue",
      tableSlugs: []
    }
  ];

  return layerDefinitions.map((layer) => {
    if (graphCounts) {
      const graphCount = {
        goals: graphCounts.goals + graphCounts.targets + graphCounts.metrics,
        workflows: graphCounts.workflows,
        tasks: graphCounts.tasks,
        knowledge: graphCounts.knowledge,
        sources: graphCounts.sources
      }[layer.id as LayerKey];
      return { ...layer, count: graphCount };
    }
    const tableCount = layer.tableSlugs.length === 0
      ? context.tables.length
      : context.tables.filter((table) => layer.tableSlugs.includes(table.apiSlug)).length;
    const recordCount = layer.tableSlugs.length === 0
      ? context.tableRecordRows.length + context.providerMappings.length + context.driveItems.length
      : context.tableRecordRows.filter((row) => layer.tableSlugs.includes(row.apiSlug)).length;
    const count = layer.id === "knowledge"
      ? recordCount + context.driveItems.length
      : layer.id === "sources"
        ? recordCount
        : recordCount || tableCount;
    return { ...layer, count };
  });
}

function tableSourceLabel(table: NonNullable<OperatingArea["tables"]>[number]) {
  if (table.source === "clickup") {
    return "ClickUp";
  }
  return table.source || "CompanyCore";
}

function tableRecordCount(context: AreaDetailContext, apiSlug: string) {
  return context.tableRecordRows.filter((row) => row.apiSlug === apiSlug).length;
}

function layerTables(context: AreaDetailContext, layerId: string) {
  if (layerId === "sources") {
    return context.tables;
  }
  return areaCapabilityTables(context, layerId);
}

function buildKnowledgeTree(driveItems: GoogleDriveFileRecord[], limit = 28): AreaKnowledgeTreeNode[] {
  const visibleItems = driveItems.slice(0, limit);
  const nodes = new Map<string, AreaKnowledgeTreeNode>();

  visibleItems.forEach((file) => {
    nodes.set(file.externalId, {
      id: file.externalId,
      name: file.name,
      detail: file.isFolder ? "Folder" : file.mimeType.split("/").pop() || file.mimeType,
      href: file.webViewLink,
      isFolder: file.isFolder,
      children: []
    });
  });

  const roots: AreaKnowledgeTreeNode[] = [];
  visibleItems.forEach((file) => {
    const node = nodes.get(file.externalId);
    if (!node) {
      return;
    }
    const parent = file.parentExternalId ? nodes.get(file.parentExternalId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (items: AreaKnowledgeTreeNode[]) => {
    items.sort((left, right) => Number(right.isFolder) - Number(left.isFolder) || left.name.localeCompare(right.name));
    items.forEach((item) => sortTree(item.children));
  };
  sortTree(roots);

  return roots;
}

function areaCapabilityBoardData(
  area: AreaViewState,
  capabilityId: string,
  context: AreaDetailContext,
  connection: ConnectionData
): AreaCapabilityBoardData {
  const records = areaCapabilityRecords(context, capabilityId);
  const tables = areaCapabilityTableItems(context, capabilityId);
  const providers = areaCapabilityProviderItems(context);
  const drive = areaCapabilityDriveItems(context);
  const mcp = areaCapabilityMcpItems(connection, capabilityId);

  if (capabilityId === "goals") {
    return {
      note: "Goals groups targets, success signals, and strategic records scoped to this department.",
      sections: [
        { title: "Goal records", icon: "ph-target", empty: "No goal or target records are scoped to this department yet.", items: records },
        { title: "Goal tables", icon: "ph-database", empty: "No goals or targets table is linked to this department.", items: tables },
        { title: "Proof", icon: "ph-books", empty: "No Drive proof is scoped to this department.", items: drive }
      ],
      actions: [
        { label: "Open targets", href: "/data/targets", tone: "primary" },
        { label: "Review evidence", href: "/relationships", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "workflows") {
    return {
      note: "Workflows shows the operating rhythm: processes, pipelines, procedures, runs, dependencies, and automation evidence.",
      sections: [
        { title: "Workflow records", icon: "ph-flow-arrow", empty: "No workflow records are scoped to this department yet.", items: records },
        { title: "Workflow tables", icon: "ph-database", empty: "No workflow tables are linked to this department.", items: tables },
        { title: "Providers", icon: "ph-plugs-connected", empty: "No provider containers are scoped to this department.", items: providers }
      ],
      actions: [
        { label: "Open Company OS", href: "/react-company-os", tone: "primary" },
        { label: "Open pipeline", href: "/pipeline", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "tasks") {
    return {
      note: "Tasks keeps execution pressure tied to area ownership and provider readiness.",
      sections: [
        { title: "Task records", icon: "ph-list-checks", empty: "No task or execution records are scoped to this department yet.", items: records },
        { title: "Task sources", icon: "ph-plugs-connected", empty: "No task provider container is scoped to this department.", items: providers },
        { title: "Execution tables", icon: "ph-database", empty: "No task-related tables are linked to this department.", items: tables }
      ],
      actions: [
        { label: "Open tasks", href: "/tasks-adapter", tone: "primary" },
        { label: "Open workbench", href: "/react-tasks", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "knowledge") {
    return {
      note: "Knowledge shows the trusted Drive and Company OS proof that can support human and AI decisions.",
      sections: [
        { title: "Drive knowledge", icon: "ph-cloud", empty: "No imported Drive items are scoped to this department.", items: drive },
        { title: "Knowledge records", icon: "ph-books", empty: "No knowledge records are scoped to this department yet.", items: records },
        { title: "Knowledge tables", icon: "ph-database", empty: "No knowledge tables are linked to this department.", items: tables }
      ],
      actions: [
        { label: "Open Drive", href: "/settings/drive", tone: "primary" },
        { label: "Review scope", href: "/relationships", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "resources") {
    return {
      note: "Resources collects the people, systems, tables, providers, and ownership hooks attached to this department.",
      sections: [
        { title: "Area tables", icon: "ph-database", empty: "No resource tables are linked to this department yet.", items: context.tables.slice(0, 6).map((table) => ({ title: table.name, detail: `${table.apiSlug} - ${sharedTableRecordApiPath(table.apiSlug)}`, meta: table.source || "workspace", href: `/data/${table.apiSlug}` })) },
        { title: "Providers", icon: "ph-plugs-connected", empty: "No provider containers are scoped to this department.", items: providers },
        { title: "Drive scope", icon: "ph-cloud", empty: "No Drive resources are scoped to this department.", items: drive }
      ],
      actions: [
        { label: "Open resources", href: area.href, tone: "primary" },
        { label: "Review relationships", href: "/relationships", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "decisions") {
    return {
      note: "Decisions combines logs, approvals, risks, controls, policies, and audit evidence before action.",
      sections: [
        { title: "Decision records", icon: "ph-seal-check", empty: "No decision or governance records are scoped to this department yet.", items: records },
        { title: "Governance tables", icon: "ph-scales", empty: "No decision tables are linked to this department.", items: tables },
        { title: "Proof", icon: "ph-books", empty: "No proof files are scoped to this department.", items: drive }
      ],
      actions: [
        { label: "Open decisions", href: "/react-company-os", tone: "primary" },
        { label: "Review risks", href: "/data/risks", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "ai") {
    return {
      note: "AI handoff stays useful only when tools, knowledge, ownership, and approval boundaries are visible together.",
      sections: [
        { title: "Agent tools", icon: "ph-robot", empty: "No MCP tools are visible for this session.", items: mcp },
        { title: "Knowledge scope", icon: "ph-books", empty: "No Drive knowledge is scoped to this department.", items: drive },
        { title: "Guardrails", icon: "ph-shield-check", empty: "No AI guardrails are visible from the MCP manifest.", items: (connection.mcpManifest?.guardrails || []).slice(0, 5).map((guardrail) => ({ title: guardrail, detail: "MCP manifest guardrail", meta: "policy", href: "/react-agent-tools" })) }
      ],
      actions: [
        { label: "Open agent tools", href: "/react-agent-tools", tone: "primary" },
        { label: "Open API access", href: "/settings/api", tone: "secondary" }
      ]
    };
  }

  if (capabilityId === "add-view") {
    return {
      note: "Custom area views should become real only after backend view configuration exists.",
      sections: [
        { title: "Reusable views", icon: "ph-squares-four", empty: "No custom views are stored yet.", items: areaCapabilities.map((capability) => ({ title: capability.label, detail: `Existing V1 tab for ${area.label}`, meta: capability.id, href: areaHref(area, capability.id) })) },
        { title: "Required contract", icon: "ph-database", empty: "No view configuration storage exists yet.", items: [{ title: "View config", detail: "Needs backend persistence before creation is enabled.", meta: "planned", href: "/react-company-os" }] },
        { title: "Proof", icon: "ph-books", empty: "No proof required for planned custom views.", items: [] }
      ],
      actions: [
        { label: "Review plan", href: "/react-company-os", tone: "primary" },
        { label: "Back to overview", href: areaHref(area, "overview"), tone: "secondary" }
      ]
    };
  }

  return {
    note: "Overview connects the department health, records, providers, knowledge, and AI readiness in one scan.",
    sections: [
      { title: "Recent records", icon: "ph-stack", empty: "No records are loaded for this department yet.", items: areaCapabilityRecords(context, "overview") },
      { title: "Linked evidence", icon: "ph-books", empty: "No evidence is scoped to this department yet.", items: [...drive, ...providers].slice(0, 6) },
      { title: "Area tables", icon: "ph-database", empty: "No tables are linked to this department yet.", items: areaCapabilityTableItems(context, "overview") }
    ],
    actions: [
      { label: "Open area", href: areaHref(area, "overview"), tone: "primary" },
      { label: "Review relationships", href: "/relationships", tone: "secondary" }
    ]
  };
}

function capabilityContent(
  area: AreaViewState,
  capabilityId: string,
  connection: ConnectionData,
  context?: AreaDetailContext
) {
  const clickUpReady = connection.integrations.clickup.configured;
  const driveReady = connection.integrations.googleDrive.configured;
  const tables = area.backendArea?.tables || [];
  const relevantTables = context ? areaCapabilityTables(context, capabilityId) : tables;
  const relevantRecords = context ? areaCapabilityRecords(context, capabilityId, 99).length : 0;
  const capability = areaCapabilities.find((item) => item.id === capabilityId);

  if (capabilityId === "ai") {
    return {
      title: "AI handoff readiness",
      detail: connection.mcpManifest
        ? "MCP context is visible to the owner. Use supervised command surfaces for risky actions."
        : "Agent handoff should stay read-only until MCP manifest and API key scope are reviewed.",
      primary: { label: "Open agent tools", href: "/react-agent-tools" },
      metrics: [
        ["Capabilities", `${connection.capabilities.length}`],
        ["MCP", connection.mcpManifest ? "Visible" : "Review"],
        ["Tools", `${connection.mcpManifest?.tools.length || 0}`]
      ]
    };
  }

  if (capabilityId === "knowledge") {
    return {
      title: "Knowledge and proof",
      detail: driveReady
        ? "Google Drive is configured. Area knowledge can be reviewed from Drive mappings and imported files."
        : "Connect or refresh Drive before treating knowledge coverage as complete.",
      primary: { label: "Open Drive", href: "/settings/drive" },
      metrics: [
        ["Drive", driveReady ? "Active" : "Review"],
        ["Files", `${context?.driveItems.length || 0}`],
        ["Records", `${relevantRecords}`]
      ]
    };
  }

  if (capabilityId === "tasks") {
    return {
      title: "Execution pressure",
      detail: clickUpReady
        ? "ClickUp is configured. Task pressure can be inspected from the task workbench."
        : "Task visibility is limited until ClickUp lists are selected.",
      primary: { label: "Open tasks", href: "/react-tasks" },
      metrics: [
        ["ClickUp", clickUpReady ? "Active" : "Review"],
        ["Lists", `${connectionMetrics(connection).selectedLists}`],
        ["Records", `${relevantRecords}`]
      ]
    };
  }

  if (capabilityId === "workflows" || capabilityId === "decisions" || capabilityId === "goals") {
    return {
      title: capabilityId === "goals" ? "Goals and success signals" : capabilityId === "decisions" ? "Decisions and governance" : "Workflows and operating rhythm",
      detail: "Use Company OS records for process, approval, risk, audit, and workflow evidence. This dashboard keeps the area context first, then links into the deeper workbench.",
      primary: { label: capabilityId === "goals" ? "Open targets" : "Open Company OS", href: capabilityId === "goals" ? "/data/targets" : "/react-company-os" },
      metrics: [
        ["Area", area.lens],
        ["Tables", `${relevantTables.length}`],
        ["Records", `${relevantRecords}`]
      ]
    };
  }

  if (capabilityId === "resources") {
    return {
      title: "Resources and ownership",
      detail: tables.length > 0
        ? `${area.label} has ${tables.length} linked resource table${tables.length === 1 ? "" : "s"} in the operating model.`
        : "No linked resource tables are visible for this area yet. Keep this as an accepted empty state until real ownership is added.",
      primary: { label: "Open area resources", href: area.href },
      metrics: [
        ["Tables", `${tables.length}`],
        ["Backend", area.backendArea ? "Matched" : "Missing"],
        ["MECE", area.status === "ready" ? "Clear" : "Review"]
      ]
    };
  }

  if (capabilityId === "add-view") {
    return {
      title: "Area view configuration",
      detail: "Custom views should be added only after a backend view-config contract exists. For now this surface records the intended area-scoped entry point.",
      primary: { label: "Review plan", href: "/react-company-os" },
      metrics: [
        ["Mode", "Planned"],
        ["Scope", area.shortLabel],
        ["Storage", "Not created"]
      ]
    };
  }

  return {
    title: capability?.label || "Overview",
    detail: area.detail,
    primary: { label: "Open area", href: areaHref(area, capabilityId) },
    metrics: [
      ["Status", area.statusLabel],
      ["Tables", `${tables.length}`],
      ["Lens", area.lens]
    ]
  };
}

function AreaOverviewPanel({
  area,
  activeCapability,
  connection,
  onSelectCapability
}: {
  area: AreaViewState;
  activeCapability: string;
  connection: ConnectionData;
  onSelectCapability: (capability: string) => void;
}) {
  const content = capabilityContent(area, activeCapability, connection);
  const areaSignalMetrics = [
    { label: "Goals", value: area.shortLabel === "01" ? "4" : String(Math.max(1, area.tableCount)), icon: "ph-target", tone: "blue" },
    { label: "Workflows", value: area.shortLabel === "01" ? "3" : String(Math.max(1, Math.min(4, area.tableCount))), icon: "ph-share-network", tone: "green" },
    { label: "Tasks", value: area.shortLabel === "01" ? "12" : String(Math.max(2, area.tableCount * 2)), icon: "ph-list-bullets", tone: "orange" },
    { label: "Knowledge", value: area.shortLabel === "01" ? "8" : String(Math.max(1, area.tableCount)), icon: "ph-book-open", tone: "violet" }
  ];
  const overviewSelected = activeCapability === "overview";
  return (
    <section className="area-overview-panel">
      <div className="area-panel-title">
        <span className={`area-panel-icon ${areaToneClass(area.status)}`}>
          <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
        </span>
        <div>
          <p className="atlas-kicker">{area.lens} area</p>
          <h2>{area.label}</h2>
          <small>{area.shortLabel === "01" ? "Goals, governance, planning" : area.detail}</small>
        </div>
      </div>
      <CapabilityTabs activeCapability={activeCapability} onSelectCapability={onSelectCapability} />
      {overviewSelected ? (
        <>
          <article className="area-health-card">
            <i className="ph-bold ph-shield-check" aria-hidden="true"></i>
            <span>
              <strong>{area.label.replace(/^\d+\s+/, "")} is healthy.</strong>
              <small>{reviewCount(buildAreaViewState(connection))} decisions need review.</small>
            </span>
          </article>
          <div className="area-signals">
            <h3>Area signals</h3>
            <div>
              {areaSignalMetrics.map((metric) => (
                <span className={`area-signal area-signal-${metric.tone}`} key={metric.label}>
                  <i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i>
                  <strong>{metric.value}</strong>
                  <small>{metric.label}</small>
                </span>
              ))}
            </div>
          </div>
          <article className="area-agent-card">
            <i className="ph-bold ph-robot" aria-hidden="true"></i>
            <span>
              <strong>Jarvis read-only ready</strong>
              <small>Context is trusted for read access.</small>
            </span>
            <em>Ready</em>
          </article>
          <div className="area-main-actions">
            <a className="atlas-primary-action" href="/react-company-os">
              Review strategy decisions
              <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
            </a>
            <a className="atlas-link-action" href={area.href}>Open area detail <i className="ph-bold ph-arrow-right" aria-hidden="true"></i></a>
          </div>
        </>
      ) : (
        <article className="area-capability-card">
          <div>
            <p className="atlas-kicker">{activeCapability.replace("-", " ")}</p>
            <h3>{content.title}</h3>
            <p>{content.detail}</p>
          </div>
          <div className="area-capability-metrics">
            {content.metrics.map(([label, value]) => (
              <span key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </span>
            ))}
          </div>
          <div className="area-capability-actions">
            <a className="atlas-primary-action" href={content.primary.href}>{content.primary.label}</a>
            <a className="atlas-secondary-action" href="/relationships">Review links</a>
          </div>
        </article>
      )}
      <div className="mece-note">
        <i className="ph-bold ph-shield-check" aria-hidden="true"></i>
        <span>MECE accountability: one accountable owner per goal, workflow, and AI action.</span>
      </div>
    </section>
  );
}

function DecisionRail({
  connection,
  areas,
  selectedArea
}: {
  connection: ConnectionData;
  areas: AreaViewState[];
  selectedArea: AreaViewState;
}) {
  const missingClickUp = !connection.integrations.clickup.configured;
  const missingDrive = !connection.integrations.googleDrive.configured;
  const reviewAreas = reviewCount(areas);
  const items = [
    {
      title: "Company priority",
      detail: "3 unassigned resources in 00 Ogolny.",
      href: selectedArea.href,
      icon: "ph-folder",
      meta: "Open",
      tone: "review"
    },
    {
      title: "Strategy decision",
      detail: "Quarterly goal review needs your decision.",
      href: "/react-company-os",
      icon: "ph-shield-warning",
      meta: `${reviewAreas} open`,
      tone: "warning"
    },
    {
      title: "AI handoff",
      detail: missingDrive ? "Paperclip waiting for scoped key." : "Jarvis can summarize strategy context.",
      href: "/react-agent-tools",
      icon: "ph-sparkle",
      meta: connection.mcpManifest ? "Ready" : "Waiting",
      tone: connection.mcpManifest ? "ready" : "warning"
    },
    {
      title: "Proof",
      detail: missingClickUp ? "Task workbench needs ClickUp lists." : "Drive sync healthy 8m ago.",
      href: missingClickUp ? "/settings/api" : "/settings/drive",
      icon: "ph-shield-check",
      meta: "Open",
      tone: "ready"
    }
  ];

  return (
    <aside className="decision-rail" aria-label="Today priorities">
      <div>
        <h2>Today</h2>
      </div>
      <div className="decision-list">
        {items.map((item) => (
          <a className={`decision-item decision-item-${item.tone}`} href={item.href} key={item.title}>
            <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
              <em>{item.meta}</em>
            </span>
          </a>
        ))}
      </div>
      <div className="decision-proof">
        <span>Sources</span>
        <strong>/v1/connection</strong>
        <strong>Operating model</strong>
        <strong>MCP scope</strong>
      </div>
    </aside>
  );
}

function ProgressivePath({ activeCapability }: { activeCapability: string }) {
  const steps = [
    { id: "overview", label: "Overview", detail: "See the whole", icon: "ph-globe-hemisphere-west" },
    { id: "area", label: "Area", detail: "Focus the company", icon: "ph-buildings" },
    { id: "capability", label: "Capability", detail: "Choose what matters", icon: "ph-squares-four" },
    { id: "record", label: "Record", detail: "Open the right record", icon: "ph-clipboard-text" },
    { id: "evidence", label: "Evidence", detail: "Verify with proof", icon: "ph-shield-check" },
    { id: "ai", label: "AI action", detail: "Delegate or execute", icon: "ph-robot" }
  ];
  return (
    <nav className="progressive-path" aria-label="Progressive path">
      {steps.map((step, index) => (
        <span className={index <= 2 || activeCapability === "ai" ? "is-active" : ""} key={step.id}>
          <i className={`ph-bold ${step.icon}`} aria-hidden="true"></i>
          <strong>{step.label}</strong>
          <small>{step.detail}</small>
        </span>
      ))}
    </nav>
  );
}

function MobileBottomNav({
  activeCapability,
  onSelectCapability
}: {
  activeCapability: string;
  onSelectCapability: (capability: string) => void;
}) {
  const items = [
    { id: "overview", label: "Atlas", icon: "ph-map-trifold" },
    { id: "resources", label: "Area", icon: "ph-buildings" },
    { id: "tasks", label: "Tasks", icon: "ph-list-checks" },
    { id: "knowledge", label: "Knowledge", icon: "ph-books" },
    { id: "ai", label: "AI", icon: "ph-robot" }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile dashboard navigation">
      {items.map((item) => (
        <button
          className={activeCapability === item.id ? "is-active" : ""}
          type="button"
          key={item.id}
          onClick={() => onSelectCapability(item.id)}
        >
          <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AreaFirstDashboard({ connection }: { connection: ConnectionData }) {
  const areas = useMemo(() => buildAreaViewState(connection), [connection]);
  const initialArea = areas.find((area) => area.key === "01-strategia") || areas[0];
  const [selectedAreaKey, setSelectedAreaKey] = useState(initialArea.key);
  const [activeCapability, setActiveCapability] = useState("overview");
  const selectedArea = areas.find((area) => area.key === selectedAreaKey) || initialArea;
  const ownerLabel = connection.user?.name || connection.user?.email || "Owner";
  const ownerDetail = connection.user?.email ? "Owner" : connection.workspace.name;

  return (
    <main className="atlas-shell" data-theme="companycore">
      <AreaSidebar
        areas={areas}
        selectedArea={selectedArea}
        activeCapability={activeCapability}
        ownerLabel={ownerLabel}
        ownerDetail={ownerDetail}
        onSelectArea={setSelectedAreaKey}
        onSelectCapability={setActiveCapability}
      />
      <section className="atlas-workspace">
        <MobileAppBar workspaceName={connection.workspace.name} />
        <MobileCompanySummary areas={areas} connection={connection} />
        <DashboardHeader connection={connection} areas={areas} selectedArea={selectedArea} />
        <MobileAreaSelector areas={areas} selectedArea={selectedArea} onSelectArea={setSelectedAreaKey} />
        <section className="atlas-content-grid">
          <CompanyAtlasBoard areas={areas} selectedArea={selectedArea} onSelectArea={setSelectedAreaKey} />
          <AreaOverviewPanel
            area={selectedArea}
            activeCapability={activeCapability}
            connection={connection}
            onSelectCapability={setActiveCapability}
          />
          <DecisionRail connection={connection} areas={areas} selectedArea={selectedArea} />
        </section>
        <ProgressivePath activeCapability={activeCapability} />
      </section>
      <MobileBottomNav activeCapability={activeCapability} onSelectCapability={setActiveCapability} />
    </main>
  );
}

function TasksStatePanel({ state, onRetry }: { state: TasksWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load the React task workbench with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading tasks",
      detail: "CompanyCore is reading the owner session, workspace context, and task records.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Task workbench could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="React tasks">
      <section className="area-route mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

type TasksDeliveryBundle = {
  connection: ConnectionData;
  tasks: TaskRecord[];
  companyOs: CompanyOsData | null;
  mcpManifest: McpManifest | null;
};

const taskStatusOptions = ["todo", "in_progress", "blocked", "done", "archived"];

function taskStatusBadgeClass(status?: string | null) {
  const normalized = String(status || "todo").toLowerCase();
  if (normalized === "done") {
    return "badge badge-success";
  }
  if (normalized === "blocked") {
    return "badge badge-error";
  }
  if (normalized === "in_progress") {
    return "badge badge-primary";
  }
  if (normalized === "archived") {
    return "badge badge-neutral";
  }
  return "badge badge-outline";
}

function taskPriorityBadgeClass(priority?: string | null) {
  const normalized = String(priority || "").toLowerCase();
  if (["urgent", "critical", "high"].includes(normalized)) {
    return "badge badge-error";
  }
  if (["medium", "normal"].includes(normalized)) {
    return "badge badge-warning";
  }
  if (normalized) {
    return "badge badge-success";
  }
  return "badge badge-ghost";
}

function taskPressureRows(tasks: TaskRecord[]) {
  return [...tasks]
    .filter(isOpenTask)
    .sort((left, right) => {
      const priorityRank = (value?: string | null) => {
        const normalized = String(value || "").toLowerCase();
        if (["urgent", "critical"].includes(normalized)) return 0;
        if (normalized === "high") return 1;
        if (normalized === "medium") return 2;
        return 3;
      };
      const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return priorityRank(left.priority) - priorityRank(right.priority) || leftDue - rightDue;
    });
}

function taskAreaCoverage(connection: ConnectionData) {
  return companyAreas(connection).map((area) => {
    const tables = area.tables || [];
    const taskTables = tables.filter((table) => ["tasks", "task-lists", "pipeline-stages"].includes(table.apiSlug));
    const providerTables = taskTables.filter((table) => table.source && table.source !== "companycore").length;
    return {
      id: area.id,
      key: area.key,
      name: area.name,
      taskTables: taskTables.length,
      providerTables,
      totalTables: tables.length,
      status: taskTables.length > 0 ? "Ready" : "Review"
    };
  });
}

function taskHandoffSummary(tasks: TaskRecord[], companyOs: CompanyOsData | null, mcpManifest: McpManifest | null) {
  const taskTools = (mcpManifest?.tools || []).filter((tool) => tool.path.includes("/tasks") || tool.capability.includes("task"));
  const supervisedTools = taskTools.filter((tool) => tool.requiresApproval);
  return {
    visibleTasks: tasks.length,
    openTasks: tasks.filter(isOpenTask).length,
    taskTools: taskTools.length,
    supervisedTools: supervisedTools.length,
    approvals: companyOs?.attention.pendingApprovals?.length || 0,
    blockedRuntime: (companyOs?.attention.blockedPipelineRuns?.length || 0) + (companyOs?.attention.failedStageRuns?.length || 0)
  };
}

function TaskFilters({
  filters,
  onChange,
  tasks
}: {
  filters: TaskFilterState;
  onChange: (nextFilters: TaskFilterState) => void;
  tasks: TaskRecord[];
}) {
  const statusOptions = uniqueTaskOptions(tasks, (task) => task.status || "todo");
  const sourceOptions = uniqueTaskOptions(tasks, normalizedTaskSource);
  const listOptions = uniqueTaskOptions(tasks, normalizedTaskList);

  return (
    <section className="rounded-company border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
        <label className="form-control">
          <span className="label py-1">
            <span className="label-text text-xs font-black uppercase text-company-muted">Search tasks</span>
          </span>
          <input
            className="input input-bordered input-sm"
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Title, status, priority, list..."
          />
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="label-text text-xs font-black uppercase text-company-muted">Status</span>
          </span>
          <select
            className="select select-bordered select-sm"
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value })}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option value={status} key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="label-text text-xs font-black uppercase text-company-muted">Source</span>
          </span>
          <select
            className="select select-bordered select-sm"
            value={filters.source}
            onChange={(event) => onChange({ ...filters, source: event.target.value })}
          >
            <option value="">All sources</option>
            {sourceOptions.map((source) => (
              <option value={source} key={source}>{source}</option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label py-1">
            <span className="label-text text-xs font-black uppercase text-company-muted">Task list</span>
          </span>
          <select
            className="select select-bordered select-sm"
            value={filters.list}
            onChange={(event) => onChange({ ...filters, list: event.target.value })}
          >
            <option value="">All lists</option>
            {listOptions.map((list) => (
              <option value={list} key={list}>{list}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function TasksTable({
  tasks,
  busyTaskId,
  onStatusChange
}: {
  tasks: TaskRecord[];
  busyTaskId: string | null;
  onStatusChange: (task: TaskRecord, status: string) => void;
}) {
  const columns: Array<TableColumn<TaskRecord>> = [
    {
      key: "title",
      header: "Task",
      cell: (task) => (
        <div className="max-w-[22rem]">
          <strong className="block break-words">{task.title}</strong>
          <span className="text-xs text-company-muted">{task.externalId ? `External ${task.externalId}` : "CompanyCore record"}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (task) => <span className={taskStatusBadgeClass(task.status)}>{task.status || "todo"}</span>
    },
    {
      key: "priority",
      header: "Priority",
      cell: (task) => <span className={taskPriorityBadgeClass(task.priority)}>{task.priority || "No priority"}</span>
    },
    {
      key: "list",
      header: "List",
      cell: (task) => normalizedTaskList(task)
    },
    {
      key: "source",
      header: "Source",
      cell: (task) => (
        <span className={normalizedTaskSource(task) === "clickup" ? "badge badge-primary" : "badge badge-neutral"}>
          {normalizedTaskSource(task)}
        </span>
      )
    },
    {
      key: "due",
      header: "Due",
      cell: (task) => formatTaskDate(task.dueDate)
    },
    {
      key: "move",
      header: "Move",
      cell: (task) => (
        <select
          className="select select-bordered select-xs min-w-28"
          value={task.status || "todo"}
          disabled={busyTaskId === task.id}
          onChange={(event) => onStatusChange(task, event.target.value)}
          aria-label={`Change status for ${task.title}`}
        >
          {taskStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
        </select>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={tasks}
      emptyTitle="No tasks match these filters"
      emptyDetail="Adjust the search or filters, or open the typed task editor to create a CompanyCore task."
    />
  );
}

function TasksWorkbench({
  connection,
  tasks,
  companyOs,
  mcpManifest,
  notice,
  onNotice,
  onReload
}: TasksDeliveryBundle & {
  notice: { tone: NoticeTone; title: string; detail: string } | null;
  onNotice: (notice: { tone: NoticeTone; title: string; detail: string } | null) => void;
  onReload: () => void;
}) {
  const [filters, setFilters] = useState<TaskFilterState>({
    search: "",
    status: "",
    source: "",
    list: ""
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const metrics = useMemo(() => taskMetrics(tasks), [tasks]);
  const visibleTasks = useMemo(() => filteredTasks(tasks, filters), [tasks, filters]);
  const pressureTasks = useMemo(() => taskPressureRows(tasks), [tasks]);
  const coverageRows = useMemo(() => taskAreaCoverage(connection), [connection]);
  const handoff = useMemo(() => taskHandoffSummary(tasks, companyOs, mcpManifest), [tasks, companyOs, mcpManifest]);
  const blockedTasks = tasks.filter((task) => String(task.status || "").toLowerCase() === "blocked");
  const doneTasks = tasks.filter((task) => String(task.status || "").toLowerCase() === "done");

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    const priority = String(form.get("priority") || "").trim();
    const dueDate = String(form.get("dueDate") || "").trim();
    if (!title) {
      onNotice({ tone: "error", title: "Task not created", detail: "Task title is required." });
      return;
    }

    setBusyAction("create");
    onNotice(null);
    try {
      await ownerApi<TaskRecord>("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          status: "todo",
          source: "companycore",
          ...(priority ? { priority } : {}),
          ...(dueDate ? { dueDate } : {})
        })
      });
      formElement.reset();
      onNotice({ tone: "success", title: "Task created", detail: "The task is now in the delivery queue and available to agent context." });
      onReload();
    } catch (error) {
      onNotice({ tone: "error", title: "Task not created", detail: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function changeTaskStatus(task: TaskRecord, status: string) {
    if (status === task.status) {
      return;
    }

    setBusyAction(task.id);
    onNotice(null);
    try {
      await ownerApi<TaskRecord>(`/v1/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      onNotice({ tone: "success", title: "Task moved", detail: `${task.title} is now ${status}.` });
      onReload();
    } catch (error) {
      onNotice({ tone: "error", title: "Task was not moved", detail: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Shell connection={connection} appLabel="Tasks & delivery">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-6">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Company delivery</p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">Tasks & delivery</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              Supervise execution pressure, move work forward, and keep Paperclip/Jarvis aligned with the task context they can safely read.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary" href="#create-task">
              <i className="ph-bold ph-plus" aria-hidden="true"></i>
              Create task
            </a>
            <a className="btn btn-outline" href="/operations">Operations cockpit</a>
          </div>
        </header>

        {notice ? <LocalNotice tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon="ph-pulse" label="Workspace health" value={blockedTasks.length > 0 ? "Review" : "Good"} detail={`${blockedTasks.length} blocked`} />
          <MetricCard icon="ph-list-checks" label="Open tasks" value={`${metrics.open}`} detail={`${metrics.total} total records`} />
          <MetricCard icon="ph-calendar-check" label="Due soon" value={`${metrics.dueSoon}`} detail="Open within 7 days" />
          <MetricCard icon="ph-warning-circle" label="Blocked tasks" value={`${blockedTasks.length}`} detail={`${doneTasks.length} done`} />
          <MetricCard icon="ph-robot" label="AI handoff" value={`${handoff.taskTools}`} detail={`${handoff.supervisedTools} supervised tools`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr] xl:items-start">
          <section className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Execution pressure</p>
                <h2 className="text-xl font-black">Top of the queue</h2>
              </div>
              <span className="badge badge-outline">{pressureTasks.length} open</span>
            </div>
            <div className="grid gap-2">
              {pressureTasks.slice(0, 6).map((task) => (
                <div className="grid gap-3 rounded-company border border-base-300 p-3 sm:grid-cols-[1fr_auto] sm:items-center" key={task.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{task.title}</strong>
                      <span className={taskPriorityBadgeClass(task.priority)}>{task.priority || "No priority"}</span>
                    </div>
                    <p className="mt-1 text-xs text-company-muted">{normalizedTaskList(task)} - due {formatTaskDate(task.dueDate)}</p>
                  </div>
                  <select
                    className="select select-bordered select-sm"
                    value={task.status || "todo"}
                    disabled={busyAction === task.id}
                    onChange={(event) => void changeTaskStatus(task, event.target.value)}
                    aria-label={`Change status for ${task.title}`}
                  >
                    {taskStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
                  </select>
                </div>
              ))}
              {pressureTasks.length === 0 ? (
                <p className="text-sm text-company-muted">No open tasks are visible. Create the next task below or review completed work.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4">
              <p className="eyebrow">Department ownership</p>
              <h2 className="text-xl font-black">Task coverage by area</h2>
            </div>
            <div className="grid gap-2">
              {coverageRows.slice(0, 7).map((row) => (
                <div className="grid gap-2 border-b border-base-200 py-2 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center" key={row.id}>
                  <div>
                    <strong className="text-sm">{row.name}</strong>
                    <p className="text-xs text-company-muted">{row.taskTables} delivery tables / {row.totalTables} total tables</p>
                  </div>
                  <span className={row.status === "Ready" ? "badge badge-success" : "badge badge-outline"}>{row.status}</span>
                </div>
              ))}
            </div>
            <LocalNotice
              tone="info"
              title="Area relation boundary"
              detail="This view uses current task/list records plus department table coverage. Direct task-to-area ownership should be added only through an approved backend contract."
              action={{ label: "Open areas", href: "/areas?view=tasks" }}
            />
          </section>

          <section className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4">
              <p className="eyebrow">AI handoff</p>
              <h2 className="text-xl font-black">Paperclip and Jarvis</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-company bg-base-200/60 p-3">
                <span className="block text-2xl font-black">{handoff.visibleTasks}</span>
                <span className="text-xs text-company-muted">Readable tasks</span>
              </div>
              <div className="rounded-company bg-base-200/60 p-3">
                <span className="block text-2xl font-black">{handoff.approvals}</span>
                <span className="text-xs text-company-muted">Approvals</span>
              </div>
              <div className="rounded-company bg-base-200/60 p-3">
                <span className="block text-2xl font-black">{handoff.blockedRuntime}</span>
                <span className="text-xs text-company-muted">Runtime blocks</span>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <LocalNotice
                tone={handoff.supervisedTools > 0 ? "warning" : "success"}
                title="Safe task context"
                detail={`${handoff.taskTools} task-related MCP tools are visible. ${handoff.supervisedTools} require owner supervision before action.`}
                action={{ label: "Review agent tools", href: "/react-agent-tools" }}
              />
              {blockedTasks.slice(0, 3).map((task) => (
                <div className="rounded-company border border-base-300 p-3" key={task.id}>
                  <strong className="text-sm">{task.title}</strong>
                  <p className="text-xs text-company-muted">Blocked task for owner review - {normalizedTaskSource(task)}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <section className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">All tasks</p>
                <h2 className="text-xl font-black">Delivery records</h2>
                <p className="mt-1 text-sm text-company-muted">{visibleTasks.length} of {metrics.total} tasks visible after filters.</p>
              </div>
              <a className="btn btn-outline btn-sm" href="/data/tasks">Open typed editor</a>
            </div>
            <TaskFilters filters={filters} onChange={setFilters} tasks={tasks} />
            <div className="mt-4">
              <TasksTable tasks={visibleTasks.slice(0, 80)} busyTaskId={busyAction} onStatusChange={(task, status) => void changeTaskStatus(task, status)} />
            </div>
          </section>

          <aside id="create-task" className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-4">
              <p className="eyebrow">Create task</p>
              <h2 className="text-xl font-black">Next delivery item</h2>
            </div>
            <form className="grid gap-3" onSubmit={createTask}>
              <label className="form-control">
                <span className="label py-1"><span className="label-text text-xs font-black uppercase text-company-muted">Title</span></span>
                <input className="input input-bordered input-sm" name="title" placeholder="e.g. Prepare onboarding plan" required />
              </label>
              <label className="form-control">
                <span className="label py-1"><span className="label-text text-xs font-black uppercase text-company-muted">Priority</span></span>
                <select className="select select-bordered select-sm" name="priority" defaultValue="medium">
                  <option value="">No priority</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="form-control">
                <span className="label py-1"><span className="label-text text-xs font-black uppercase text-company-muted">Due date</span></span>
                <input className="input input-bordered input-sm" name="dueDate" type="date" />
              </label>
              <button className="btn btn-primary btn-sm" type="submit" disabled={busyAction === "create"}>
                {busyAction === "create" ? "Creating..." : "Create task"}
              </button>
              <p className="text-xs leading-5 text-company-muted">Created tasks stay in CompanyCore. ClickUp write-back is used only when an existing ClickUp task list contract is selected.</p>
            </form>
          </aside>
        </section>
      </section>
    </Shell>
  );
}

function IntegrationStatePanel({ state, onRetry }: { state: IntegrationWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load the React integration map with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading integration map",
      detail: "CompanyCore is reading provider readiness, capability exposure, and operating-area ownership.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Integration map could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="React integrations">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function IntegrationGroupCard({ group }: { group: IntegrationGroup }) {
  const toneClass = group.tone === "success"
    ? "text-success"
    : group.tone === "warning"
      ? "text-warning"
      : "text-info";

  return (
    <article className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="flex items-start gap-3">
        <span className={`dashboard-icon dashboard-icon-sm ${toneClass}`}>
          <i className={`ph-bold ${group.icon}`} aria-hidden="true"></i>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="leading-tight">{group.title}</strong>
            <span className={group.tone === "success" ? "badge badge-success" : group.tone === "warning" ? "badge badge-warning" : "badge badge-info"}>
              {group.status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-company-muted">{group.detail}</p>
          <p className="mt-2 text-xs font-bold uppercase text-company-muted">{group.metric}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" href={group.primary.href}>{group.primary.label}</a>
            <a className="btn btn-ghost btn-sm" href={group.secondary.href}>{group.secondary.label}</a>
          </div>
        </div>
      </div>
    </article>
  );
}

function IntegrationFilters({
  filters,
  onChange
}: {
  filters: IntegrationFilterState;
  onChange: (nextFilters: IntegrationFilterState) => void;
}) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Search operating areas</span>
            </span>
            <input
              className="input input-bordered"
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Area, ownership key, source..."
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Coverage</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.type}
              onChange={(event) => onChange({ ...filters, type: event.target.value })}
            >
              <option value="">All coverage</option>
              <option value="tables">Has tables</option>
              <option value="companycore">CompanyCore tables</option>
              <option value="clickup">ClickUp tables</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function IntegrationAreaTable({ rows }: { rows: IntegrationAreaRow[] }) {
  const columns: Array<TableColumn<IntegrationAreaRow>> = [
    {
      key: "area",
      header: "Operating area",
      cell: (row) => (
        <div>
          <strong className="block">{row.area}</strong>
          <span className="text-xs text-company-muted">{row.ownership}</span>
        </div>
      )
    },
    {
      key: "tables",
      header: "Tables",
      className: "text-right",
      cell: (row) => <span className="font-black">{row.tables}</span>
    },
    {
      key: "companycore",
      header: "CompanyCore",
      className: "text-right",
      cell: (row) => row.companycoreTables
    },
    {
      key: "clickup",
      header: "ClickUp",
      className: "text-right",
      cell: (row) => row.clickupTables
    },
    {
      key: "sources",
      header: "Sources",
      cell: (row) => <span className="badge badge-outline">{row.sources}</span>
    },
    {
      key: "action",
      header: "Next action",
      cell: (row) => <a className="btn btn-ghost btn-xs" href={row.action.href}>{row.action.label}</a>
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle="No operating-area coverage matches"
      emptyDetail="Adjust the search or coverage filter to inspect the current integration map."
    />
  );
}

function IntegrationWorkbench({ connection }: { connection: ConnectionData }) {
  const [filters, setFilters] = useState<IntegrationFilterState>({
    search: "",
    type: ""
  });
  const readiness = useMemo(() => providerReadiness(connection), [connection]);
  const groups = useMemo(() => integrationGroups(connection), [connection]);
  const rows = useMemo(() => integrationAreaRows(connection), [connection]);
  const visibleRows = useMemo(() => filteredIntegrationAreaRows(rows, filters), [rows, filters]);
  const metrics = connectionMetrics(connection);
  const connectedGroups = groups.filter((group) => group.tone === "success").length;

  return (
    <Shell connection={connection}>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-map-trifold" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">React workbench</p>
                  <h1 className="text-3xl font-black leading-tight">Integration map</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
                    See provider readiness, agent-safe API exposure, and which company areas have integration-owned data paths.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/settings/integrations">Current integration map</a>
                <a className="btn btn-ghost" href="/settings/api">API settings</a>
              </div>
            </div>

            <LocalNotice
              tone={readiness.tone}
              title={readiness.title}
              detail={readiness.detail}
              action={readiness.action}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-squares-four" label="Groups" value={`${groups.length}`} detail={`${connectedGroups} ready signals`} />
              <MetricCard icon="ph-tree-structure" label="Areas" value={`${metrics.areas}`} detail="Including system fallback" />
              <MetricCard icon="ph-database" label="Tables" value={`${metrics.tables}`} detail="Mapped table paths" />
              <MetricCard icon="ph-key" label="Capabilities" value={`${connection.capabilities.length}`} detail="Agent-discoverable API" />
              <MetricCard icon="ph-cloud-arrow-up" label="Drive folders" value={`${metrics.selectedDriveFolders}`} detail="Selected import scope" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <IntegrationGroupCard group={group} key={group.id} />
          ))}
        </section>

        <IntegrationFilters filters={filters} onChange={setFilters} />

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Coverage table</p>
                <h2 className="text-xl font-black">Operating-area integration coverage</h2>
              </div>
              <span className="badge badge-outline">{visibleRows.length} visible</span>
            </div>
            <IntegrationAreaTable rows={visibleRows} />
          </div>
        </section>
      </section>
    </Shell>
  );
}

function AreasStatePanel({ state, onRetry }: { state: AreasWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load operating areas with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading operating areas",
      detail: "CompanyCore is reading departments, mapped tables, provider ownership, and agent-visible capability context.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Operating areas could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="React areas">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function AreaFilters({
  filters,
  onChange
}: {
  filters: AreaFilterState;
  onChange: (nextFilters: AreaFilterState) => void;
}) {
  return (
    <section className="card area-section-anchor border border-base-300 bg-base-100 shadow-sm" id="area-filters">
      <div className="card-body gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Search areas</span>
            </span>
            <input
              className="input input-bordered"
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Department, key, source..."
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Area type</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.type}
              onChange={(event) => onChange({ ...filters, type: event.target.value })}
            >
              <option value="">All areas</option>
              <option value="company">Company functions</option>
              <option value="system">System fallback</option>
              <option value="provider">Provider mappings</option>
              <option value="drive">Drive ownership</option>
              <option value="empty">No table coverage</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function AreasTable({ rows }: { rows: AreaWorkbenchRow[] }) {
  const columns: Array<TableColumn<AreaWorkbenchRow>> = [
    {
      key: "area",
      header: "Operating area",
      cell: (row) => (
        <div>
          <strong className="block">{row.name}</strong>
          <span className="text-xs text-company-muted">{row.key}</span>
        </div>
      )
    },
    {
      key: "ownership",
      header: "Ownership",
      cell: (row) => <span className="badge badge-outline">{row.ownership}</span>
    },
    {
      key: "tables",
      header: "Tables",
      className: "text-right",
      cell: (row) => <span className="font-black">{row.tables}</span>
    },
    {
      key: "provider",
      header: "Provider",
      className: "text-right",
      cell: (row) => row.providerMappings
    },
    {
      key: "drive",
      header: "Drive",
      className: "text-right",
      cell: (row) => row.driveFolders + row.driveFiles
    },
    {
      key: "sources",
      header: "Sources",
      cell: (row) => <span className="badge badge-outline">{row.sources}</span>
    },
    {
      key: "action",
      header: "Next action",
      cell: (row) => <a className="btn btn-ghost btn-xs" href={row.action.href}>{row.action.label}</a>
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle="No operating areas match"
      emptyDetail="Adjust the search or filter to inspect the company operating map."
    />
  );
}

function AreaCoverageCards({ rows }: { rows: AreaWorkbenchRow[] }) {
  const topRows = [...rows]
    .sort((left, right) => (
      (right.tables + right.providerMappings + right.driveFolders + right.driveFiles)
      - (left.tables + left.providerMappings + left.driveFolders + left.driveFiles)
    ))
    .slice(0, 4);

  return (
    <section className="card area-section-anchor border border-base-300 bg-base-100 shadow-sm" id="area-coverage">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Coverage highlights</p>
            <h2 className="text-xl font-black">Strongest mapped areas</h2>
            <p className="mt-1 text-sm leading-6 text-company-muted">
              Start with these areas when you want to understand the richest data, Drive, and provider coverage.
            </p>
          </div>
          <a className="btn btn-ghost btn-sm" href="#area-table">Review all rows</a>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {topRows.map((row) => (
            <article className="rounded-company border border-base-300 bg-base-200/45 p-4" key={row.id}>
              <div className="flex items-start gap-3">
                <span className="dashboard-icon dashboard-icon-sm text-primary">
                  <i className="ph-bold ph-buildings" aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="break-words">{row.name}</strong>
                    <span className="badge badge-outline">{row.tables} tables</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-company-muted">{row.key}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="badge badge-primary">{row.companycoreTables} CompanyCore</span>
                    <span className="badge badge-secondary">{row.providerMappings} provider</span>
                    <span className="badge badge-accent">{row.driveFolders + row.driveFiles} Drive</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AreaCommandSummary({
  rows,
  visibleRows,
  externalMappings,
  googleDriveFiles
}: {
  rows: AreaWorkbenchRow[];
  visibleRows: AreaWorkbenchRow[];
  externalMappings: ExternalContainerMapping[];
  googleDriveFiles: GoogleDriveFileRecord[];
}) {
  const providerReview = externalMappings.filter((mapping) => !mapping.areaId).length;
  const driveReview = googleDriveFiles.filter((file) => !file.trashed && !file.operatingAreaId).length;
  const emptyAreas = rows.filter((row) => row.tables === 0 && row.providerMappings === 0 && row.driveFolders + row.driveFiles === 0).length;
  const coveredAreas = Math.max(rows.length - emptyAreas, 0);
  const reviewTotal = providerReview + driveReview;
  const priorityTitle = reviewTotal > 0
    ? "Assign missing ownership"
    : emptyAreas > 0
      ? "Review empty areas"
      : "Area map is ready";
  const priorityDetail = reviewTotal > 0
    ? "Provider and Drive resources need an operating area before AI workflows can rely on them."
    : emptyAreas > 0
      ? "Some operating areas have no mapped resources yet. Confirm whether they are future scope or missing imports."
      : "Every loaded resource has operating-area context. Continue by checking selected-area details or table coverage.";
  const cards = [
    {
      id: "provider-review",
      label: "Provider review",
      value: `${providerReview}`,
      detail: "mappings without area",
      href: "#area-review-queues",
      icon: "ph-plugs-connected"
    },
    {
      id: "drive-review",
      label: "Drive review",
      value: `${driveReview}`,
      detail: "items without area",
      href: "#area-review-queues",
      icon: "ph-cloud"
    },
    {
      id: "covered-areas",
      label: "Covered areas",
      value: `${coveredAreas}/${rows.length}`,
      detail: "with mapped resources",
      href: "#area-coverage",
      icon: "ph-map-trifold"
    },
    {
      id: "visible-rows",
      label: "Visible table",
      value: `${visibleRows.length}`,
      detail: "rows after filters",
      href: "#area-table",
      icon: "ph-funnel"
    }
  ];

  return (
    <section className="area-command-summary rounded-company border border-primary/25 bg-primary/10 p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] xl:items-center">
        <div className="min-w-0">
          <p className="eyebrow">Area command</p>
          <h2 className="mt-1 text-2xl font-black leading-tight">{priorityTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-company-muted">{priorityDetail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" href="#area-review-queues">Resolve review</a>
            <a className="btn btn-ghost btn-sm" href="#selected-area-context">Inspect selected area</a>
          </div>
        </div>
        <div className="area-command-grid">
          {cards.map((card) => (
            <a className="area-command-card" href={card.href} key={card.id}>
              <span className="dashboard-icon dashboard-icon-sm text-primary">
                <i className={`ph-bold ${card.icon}`} aria-hidden="true"></i>
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase text-company-muted">{card.label}</span>
                <span className="block text-xl font-black leading-tight">{card.value}</span>
                <span className="block text-xs leading-5 text-company-muted">{card.detail}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function AreaMappingSignalCards({ signals }: { signals: AreaMappingSignal[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {signals.map((signal) => {
        const toneClass = signal.tone === "success"
          ? "text-success"
          : signal.tone === "warning"
            ? "text-warning"
            : signal.tone === "error"
              ? "text-error"
              : "text-info";

        return (
          <article className="rounded-company border border-base-300 bg-base-100 p-4 shadow-sm" key={signal.id}>
            <div className="flex items-start gap-3">
              <span className={`dashboard-icon dashboard-icon-sm ${toneClass}`}>
                <i className={`ph-bold ${signal.icon}`} aria-hidden="true"></i>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="leading-tight">{signal.title}</strong>
                  <span className="badge badge-outline">{signal.metric}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-company-muted">{signal.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a className="btn btn-primary btn-sm" href={signal.primary.href}>{signal.primary.label}</a>
                  {signal.secondary ? (
                    <a className="btn btn-ghost btn-sm" href={signal.secondary.href}>{signal.secondary.label}</a>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function areaReviewQueues(
  externalMappings: ExternalContainerMapping[],
  googleDriveFiles: GoogleDriveFileRecord[]
) {
  const providerItems: AreaReviewItem[] = externalMappings
    .filter((mapping) => !mapping.areaId)
    .slice(0, 6)
    .map((mapping) => ({
      id: mapping.id,
      kind: "provider" as const,
      title: mapping.name || mapping.externalId,
      detail: `${mapping.provider} ${mapping.entityType}`,
      badge: "Provider"
    }));
  const driveItems: AreaReviewItem[] = googleDriveFiles
    .filter((file) => !file.trashed && !file.operatingAreaId)
    .slice(0, 6)
    .map((file) => ({
      id: file.id,
      kind: "drive" as const,
      title: file.name,
      detail: file.isFolder ? "Google Drive folder" : file.mimeType,
      badge: file.isFolder ? "Folder" : "File"
    }));

  return { providerItems, driveItems };
}

function AreaReviewQueue({
  title,
  detail,
  items,
  emptyTitle,
  emptyDetail,
  areas,
  pendingAssignment,
  onAssign
}: {
  title: string;
  detail: string;
  items: AreaReviewItem[];
  emptyTitle: string;
  emptyDetail: string;
  areas: Array<{ id: string; name: string; key: string }>;
  pendingAssignment: string;
  onAssign: (item: AreaReviewItem, areaId: string) => void;
}) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Relationship queue</p>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-company-muted">{detail}</p>
          </div>
          <span className="badge badge-outline">{items.length} visible</span>
        </div>
        {items.length === 0 ? (
          <LocalNotice tone="success" title={emptyTitle} detail={emptyDetail} />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article className="rounded-company border border-base-300 bg-base-200/45 p-3" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block break-words text-sm">{item.title}</strong>
                    <p className="mt-1 text-xs leading-5 text-company-muted">{item.detail}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="badge badge-outline">{item.badge}</span>
                    <select
                      aria-label={`Assign ${item.title} to operating area`}
                      className="select select-bordered select-xs max-w-52"
                      disabled={Boolean(pendingAssignment)}
                      value=""
                      onChange={(event) => onAssign(item, event.target.value)}
                    >
                      <option value="">Assign area</option>
                      {areas.map((area) => (
                        <option value={area.id} key={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AreaRelationshipQueues({
  externalMappings,
  googleDriveFiles,
  areas,
  pendingAssignment,
  onAssign
}: {
  externalMappings: ExternalContainerMapping[];
  googleDriveFiles: GoogleDriveFileRecord[];
  areas: Array<{ id: string; name: string; key: string }>;
  pendingAssignment: string;
  onAssign: (item: AreaReviewItem, areaId: string) => void;
}) {
  const queues = useMemo(() => areaReviewQueues(externalMappings, googleDriveFiles), [externalMappings, googleDriveFiles]);

  return (
    <section className="area-section-anchor grid gap-4 xl:grid-cols-2" id="area-review-queues">
      <AreaReviewQueue
        title="Provider mappings needing area"
        detail="ClickUp or provider containers without an operating area should be reviewed before agents depend on them."
        items={queues.providerItems}
        emptyTitle="Provider mappings are assigned"
        emptyDetail="Every loaded provider container has an operating-area relationship or no provider containers are imported yet."
        areas={areas}
        pendingAssignment={pendingAssignment}
        onAssign={onAssign}
      />
      <AreaReviewQueue
        title="Drive items needing area"
        detail="Imported Drive files and folders without area scope should be assigned before knowledge workflows rely on them."
        items={queues.driveItems}
        emptyTitle="Drive ownership is assigned"
        emptyDetail="Every imported, non-trashed Drive item has an operating-area relationship or Drive import is empty."
        areas={areas}
        pendingAssignment={pendingAssignment}
        onAssign={onAssign}
      />
    </section>
  );
}

function routeAreaQuery() {
  if (typeof window === "undefined") {
    return { area: "", view: "overview" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    area: params.get("area") || "",
    view: params.get("view") || "overview"
  };
}

function resolveInitialAreaKey(areas: AreaViewState[]) {
  const query = routeAreaQuery().area;
  return areas.some((area) => area.key === query)
    ? query
    : areas.find((area) => area.key === "01-strategia")?.key || areas[0]?.key || "";
}

function resolveInitialCapability() {
  const query = routeAreaQuery().view;
  return areaCapabilities.some((capability) => capability.id === query) || query === "add-view"
    ? query
    : "overview";
}

function updateAreaRoute(areaKey: string, capabilityId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", `/areas?area=${areaKey}&view=${capabilityId}`);
}

function areaDetailContext(
  area: AreaViewState,
  externalMappings: ExternalContainerMapping[],
  googleDriveFiles: GoogleDriveFileRecord[],
  tableRecords: TableRecordSnapshot,
  operatingGraph?: AreaOperatingGraph | null,
  operatingGraphStatus: AreaDetailContext["operatingGraphStatus"] = "idle"
): AreaDetailContext {
  const tables = area.backendArea?.tables || [];
  const tableIds = new Set(tables.map((table) => table.id));
  const tableRecordRows = tables.flatMap((table) => (tableRecords[table.apiSlug] || []).map((record) => ({
    apiSlug: table.apiSlug,
    tableName: table.name,
    href: `/data/${table.apiSlug}`,
    record
  })));
  const driveItems = googleDriveFiles
    .filter((file) => !file.trashed && (
      file.operatingAreaId === area.backendArea?.id
      || Boolean(file.operatingTableId && tableIds.has(file.operatingTableId))
    ))
    .slice(0, 8);
  const providerMappings = externalMappings
    .filter((mapping) => (
      mapping.areaId === area.backendArea?.id
      || Boolean(mapping.tableId && tableIds.has(mapping.tableId))
    ))
    .slice(0, 8);
  const recordPreviews = tables
    .flatMap((table) => (tableRecords[table.apiSlug] || []).slice(0, 2).map((record) => ({
      tableName: table.name,
      title: compactRecordTitle(record),
      detail: compactRecordDetail(record)
    })))
    .slice(0, 6);
  const tableRecordsCount = tables.reduce((sum, table) => sum + (tableRecords[table.apiSlug]?.length || 0), 0);
  const globalReviewDebt = externalMappings.filter((mapping) => !mapping.areaId).length
    + googleDriveFiles.filter((file) => !file.trashed && !file.operatingAreaId).length;

  return {
    tables,
    tableRecordsCount,
    tableRecordRows,
    recordPreviews,
    driveItems,
    providerMappings,
    globalReviewDebt,
    operatingGraph,
    operatingGraphStatus
  };
}

function areaDetailLanes(
  area: AreaViewState,
  context: AreaDetailContext,
  connection: ConnectionData
): AreaDetailLane[] {
  const clickUpReady = connection.integrations.clickup.configured;
  const driveReady = connection.integrations.googleDrive.configured;

  return [
    {
      id: "observe",
      label: "Observe",
      title: "Operating health",
      detail: area.status === "ready"
        ? "This department has mapped backend context and can be inspected by owner and AI workflows."
        : "This department needs ownership or resource review before it becomes reliable operating context.",
      metric: area.statusLabel,
      icon: "ph-pulse",
      href: area.href,
      tone: area.status === "ready" ? "green" : "amber"
    },
    {
      id: "decide",
      label: "Decide",
      title: "Owner decisions",
      detail: context.globalReviewDebt > 0
        ? "Unassigned provider or Drive resources still need a MECE owner before delegation."
        : "No global ownership debt is visible from the loaded area context.",
      metric: `${context.globalReviewDebt}`,
      icon: "ph-seal-warning",
      href: "#area-detail-decisions",
      tone: context.globalReviewDebt > 0 ? "amber" : "green"
    },
    {
      id: "execute",
      label: "Execute",
      title: "Tasks and workflows",
      detail: clickUpReady
        ? "Task and workflow pressure can be reviewed from the task workbench and Company OS cockpit."
        : "Task pressure stays limited until ClickUp lists are connected to this workspace.",
      metric: clickUpReady ? "Ready" : "Review",
      icon: "ph-list-checks",
      href: "/tasks-adapter",
      tone: clickUpReady ? "blue" : "amber"
    },
    {
      id: "delegate",
      label: "Delegate",
      title: "AI handoff",
      detail: connection.mcpManifest && driveReady
        ? "Jarvis and Paperclip can use read-safe context; risky commands still need owner approval."
        : "AI handoff should stay read-only until MCP and knowledge scope are reviewed.",
      metric: connection.mcpManifest ? "Guarded" : "Waiting",
      icon: "ph-robot",
      href: "/react-agent-tools",
      tone: connection.mcpManifest ? "green" : "amber"
    }
  ];
}

function AreaDetailHero({
  area,
  context,
  connection
}: {
  area: AreaViewState;
  context: AreaDetailContext;
  connection: ConnectionData;
}) {
  const departmentConfig = departmentSystemConfig(area.key);
  const metrics = [
    { label: "Tables", value: `${context.tables.length}`, icon: "ph-database" },
    { label: "Records", value: `${context.tableRecordsCount}`, icon: "ph-stack" },
    { label: "Drive", value: `${context.driveItems.length}`, icon: "ph-cloud" },
    { label: "Provider", value: `${context.providerMappings.length}`, icon: "ph-plugs-connected" }
  ];

  return (
    <section className="area-detail-hero">
      <div className="area-detail-hero-copy">
        <p className="atlas-kicker">
          {connection.workspace.name} / {departmentConfig.systemName}
        </p>
        <h1>{area.label}</h1>
        <p>{departmentConfig.valueRole}</p>
        <p className="department-owner-question">{departmentConfig.ownerQuestion}</p>
        <div className="area-detail-actions">
          <a className="atlas-primary-action" href={area.key === "04-operacje" ? "#operations-system" : "#department-subsystems"}>
            Review system
            <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
          </a>
          <a className="atlas-secondary-action" href="/dashboard">Back to atlas</a>
        </div>
      </div>
      <div className="area-detail-sigil" aria-label={`${area.label} status`}>
        <span className={`area-detail-sigil-ring ${areaStatusClass(area.status)}`} aria-hidden="true"></span>
        <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
        <strong>{area.shortLabel}</strong>
        <small>{area.statusLabel}</small>
      </div>
      <div className="area-detail-metrics" aria-label="Area metrics">
        {metrics.map((metric) => (
          <span key={metric.label}>
            <i className={`ph-bold ${metric.icon}`} aria-hidden="true"></i>
            <strong>{metric.value}</strong>
            <small>{metric.label}</small>
          </span>
        ))}
      </div>
    </section>
  );
}

function DepartmentSubsystemRegistry({
  area,
  connection
}: {
  area: AreaViewState;
  connection: ConnectionData;
}) {
  const config = departmentSystemConfig(area.key);
  const mcpReady = Boolean(connection.mcpManifest?.tools?.length);

  return (
    <section className="department-subsystem-registry" id="department-subsystems" aria-label={`${area.label} subsystem registry`}>
      <div className="area-detail-section-heading">
        <p className="atlas-kicker">Department system</p>
        <h2>{config.systemName}</h2>
        <span>{config.subsystems.length} subsystems</span>
      </div>
      <div className="department-system-brief">
        <article>
          <i className="ph-bold ph-compass-tool" aria-hidden="true"></i>
          <span>
            <strong>First safe action</strong>
            <small>{config.firstSafeAction}</small>
          </span>
        </article>
        <article>
          <i className="ph-bold ph-robot" aria-hidden="true"></i>
          <span>
            <strong>{mcpReady ? "Agent handoff ready" : "Agent handoff review"}</strong>
            <small>{config.agentHandoff}</small>
          </span>
        </article>
      </div>
      <div className="department-subsystem-grid">
        {config.subsystems.map((subsystem) => (
          <article className={`department-subsystem-card is-${subsystem.layer}`} key={subsystem.name}>
            <span>{subsystem.layer}</span>
            <strong>{subsystem.name}</strong>
            <p>{subsystem.purpose}</p>
          </article>
        ))}
      </div>
      <div className="department-blocked-actions" aria-label="Blocked department actions">
        <strong>Blocked until explicit command contract</strong>
        <div>
          {config.blockedActions.map((action) => (
            <span key={action}>
              <i className="ph-bold ph-lock-key" aria-hidden="true"></i>
              {action}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function AreaOperatingBoard({ lanes }: { lanes: AreaDetailLane[] }) {
  return (
    <section className="area-operating-board" aria-label="Area operating board">
      <div className="area-detail-section-heading">
        <p className="atlas-kicker">Operating board</p>
        <h2>Observe, decide, execute, delegate</h2>
      </div>
      <div className="area-operating-lanes">
        {lanes.map((lane) => (
          <a className={`area-operating-lane area-lane-${lane.tone}`} href={lane.href} key={lane.id}>
            <span>
              <i className={`ph-bold ${lane.icon}`} aria-hidden="true"></i>
              <em>{lane.label}</em>
            </span>
            <strong>{lane.title}</strong>
            <p>{lane.detail}</p>
            <small>{lane.metric}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function AreaCapabilityRail({
  activeCapability,
  onSelectCapability
}: {
  activeCapability: string;
  onSelectCapability: (capability: string) => void;
}) {
  return (
    <section className="area-detail-capability-rail" aria-label="Area capability views">
      {areaCapabilities.map((capability) => (
        <button
          className={activeCapability === capability.id ? "is-active" : ""}
          type="button"
          key={capability.id}
          onClick={() => onSelectCapability(capability.id)}
        >
          <i className={`ph-bold ${capability.icon}`} aria-hidden="true"></i>
          <span>{capability.label}</span>
        </button>
      ))}
      <button
        className={activeCapability === "add-view" ? "is-active" : ""}
        type="button"
        onClick={() => onSelectCapability("add-view")}
        aria-current={activeCapability === "add-view" ? "page" : undefined}
      >
        <i className="ph-bold ph-plus-circle" aria-hidden="true"></i>
        <span>Add view</span>
      </button>
    </section>
  );
}

function AreaCapabilityFocus({
  area,
  activeCapability,
  context,
  connection,
  onSelectCapability
}: {
  area: AreaViewState;
  activeCapability: string;
  context: AreaDetailContext;
  connection: ConnectionData;
  onSelectCapability: (capability: string) => void;
}) {
  const content = capabilityContent(area, activeCapability, connection, context);
  const board = areaCapabilityBoardData(area, activeCapability, context, connection);

  return (
    <section className="area-capability-focus">
      <div className="area-detail-section-heading">
        <p className="atlas-kicker">Selected view</p>
        <h2>{content.title}</h2>
        <span>{activeCapability}</span>
      </div>
      <p>{content.detail}</p>
      <div className="area-capability-focus-metrics">
        {content.metrics.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        ))}
        <span>
          <small>Records</small>
          <strong>{context.tableRecordsCount}</strong>
        </span>
      </div>
      <AreaOperatingMap
        activeCapability={activeCapability}
        context={context}
        onSelectCapability={onSelectCapability}
      />
      <AreaLayerWorkbench activeCapability={activeCapability} context={context} />
      <AreaCapabilityBoard board={board} />
    </section>
  );
}

function AreaOperatingMap({
  activeCapability,
  context,
  onSelectCapability
}: {
  activeCapability: string;
  context: AreaDetailContext;
  onSelectCapability: (capability: string) => void;
}) {
  const insights = areaLayerInsights(context);
  const graphSummary = context.operatingGraph?.summary;
  const graphBadge = context.operatingGraphStatus === "ready" && graphSummary
    ? `${graphSummary.nodes} nodes / ${graphSummary.edges} edges`
    : context.operatingGraphStatus === "loading"
      ? "Loading graph"
      : `${context.tables.length} tables`;

  return (
    <section className="area-operating-map" aria-label="Area operating map">
      <div className="area-operating-map-header">
        <div>
          <p className="atlas-kicker">Operating graph</p>
          <h3>Goals to workflows to tasks to knowledge to sources</h3>
        </div>
        <span>{graphBadge}</span>
      </div>
      <div className="area-operating-map-track">
        {insights.map((insight, index) => (
          <button
            className={`area-operating-node area-node-${insight.tone} ${activeCapability === insight.id ? "is-active" : ""}`}
            type="button"
            onClick={() => onSelectCapability(insight.id)}
            key={insight.id}
            aria-current={activeCapability === insight.id ? "step" : undefined}
          >
            <i className={`ph-bold ${insight.icon}`} aria-hidden="true"></i>
            <span>
              <strong>{insight.label}</strong>
              <small>{insight.detail}</small>
            </span>
            <em>{insight.count}</em>
            {index < insights.length - 1 ? <b aria-hidden="true"></b> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function AreaLayerWorkbench({
  activeCapability,
  context
}: {
  activeCapability: string;
  context: AreaDetailContext;
}) {
  const tables = layerTables(context, activeCapability);
  const knowledgeTree = buildKnowledgeTree(context.driveItems);
  const activeLayer = areaLayerInsights(context).find((layer) => layer.id === activeCapability);

  return (
    <section className="area-layer-workbench" aria-label="Area layer workbench">
      <div className="area-layer-summary">
        <div>
          <p className="atlas-kicker">Layer context</p>
          <h3>{activeLayer?.label || "Overview"} as a working layer</h3>
          <p>{activeLayer?.detail || "The overview connects all department layers into one scan."}</p>
        </div>
        <div className="area-layer-counters">
          <span><small>Tables</small><strong>{tables.length}</strong></span>
          <span><small>Records</small><strong>{activeCapability === "sources" ? context.tableRecordsCount : areaCapabilityRecords(context, activeCapability, 99).length}</strong></span>
          <span><small>Drive</small><strong>{context.driveItems.length}</strong></span>
        </div>
      </div>
      <div className="area-layer-grid">
        <AreaDataLayerPanel context={context} tables={tables} />
        <AreaKnowledgeTreePanel tree={knowledgeTree} driveItems={context.driveItems} />
      </div>
    </section>
  );
}

function AreaDataLayerPanel({
  context,
  tables
}: {
  context: AreaDetailContext;
  tables: NonNullable<OperatingArea["tables"]>;
}) {
  return (
    <article className="area-data-layer-panel">
      <div className="area-layer-panel-title">
        <i className="ph-bold ph-database" aria-hidden="true"></i>
        <h3>Tables and records</h3>
        <span>{tables.length}</span>
      </div>
      {tables.length === 0 ? (
        <p className="area-layer-empty">No backend table is connected to this layer yet.</p>
      ) : (
        <div className="area-data-layer-list">
          {tables.slice(0, 8).map((table) => (
            <a href={`/data/${table.apiSlug}`} key={table.id}>
              <span>
                <strong>{table.name}</strong>
                <small>{tableSourceLabel(table)} / {sharedTableRecordApiPath(table.apiSlug)}</small>
              </span>
              <em>{tableRecordCount(context, table.apiSlug)} records</em>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function AreaKnowledgeTreePanel({
  tree,
  driveItems
}: {
  tree: AreaKnowledgeTreeNode[];
  driveItems: GoogleDriveFileRecord[];
}) {
  return (
    <article className="area-knowledge-tree-panel">
      <div className="area-layer-panel-title">
        <i className="ph-bold ph-folder-open" aria-hidden="true"></i>
        <h3>Knowledge tree</h3>
        <span>{driveItems.length}</span>
      </div>
      {tree.length === 0 ? (
        <p className="area-layer-empty">No Drive files are synced to this department yet.</p>
      ) : (
        <div className="area-knowledge-tree">
          {tree.map((node) => <AreaKnowledgeTreeItem node={node} key={node.id} depth={0} />)}
        </div>
      )}
    </article>
  );
}

function AreaKnowledgeTreeItem({ node, depth }: { node: AreaKnowledgeTreeNode; depth: number }) {
  const content = (
    <>
      <i className={`ph-bold ${node.isFolder ? "ph-folder" : "ph-file-text"}`} aria-hidden="true"></i>
      <span>
        <strong>{node.name}</strong>
        <small>{node.detail}</small>
      </span>
    </>
  );

  return (
    <div className="area-knowledge-tree-item" style={{ "--tree-depth": depth } as React.CSSProperties}>
      {node.href ? <a href={node.href} target="_blank" rel="noreferrer">{content}</a> : <span>{content}</span>}
      {node.children.length > 0 ? (
        <div className="area-knowledge-tree-children">
          {node.children.map((child) => <AreaKnowledgeTreeItem node={child} key={child.id} depth={depth + 1} />)}
        </div>
      ) : null}
    </div>
  );
}

function AreaCapabilityBoard({ board }: { board: AreaCapabilityBoardData }) {
  return (
    <div className="area-capability-board">
      <p>{board.note}</p>
      <div className="area-capability-board-grid">
        {board.sections.map((section) => (
          <article className="area-capability-board-section" key={section.title}>
            <div className="area-capability-board-title">
              <i className={`ph-bold ${section.icon}`} aria-hidden="true"></i>
              <h3>{section.title}</h3>
              <span>{section.items.length}</span>
            </div>
            {section.items.length === 0 ? (
              <p className="area-capability-board-empty">{section.empty}</p>
            ) : (
              <div className="area-capability-board-list">
                {section.items.map((item, index) => {
                  const content = (
                    <>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                      {item.meta ? <em>{item.meta}</em> : null}
                    </>
                  );
                  return item.href ? (
                    <a href={item.href} key={`${section.title}-${index}`}>
                      {content}
                    </a>
                  ) : (
                    <span key={`${section.title}-${index}`}>{content}</span>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="area-capability-board-actions">
        {board.actions.map((action) => (
          <a
            className={action.tone === "primary" ? "atlas-primary-action" : "atlas-secondary-action"}
            href={action.href}
            key={action.label}
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function AreaEvidenceGrid({
  context
}: {
  context: AreaDetailContext;
}) {
  const tableItems = context.tables.slice(0, 4);
  const driveItems = context.driveItems.slice(0, 4);
  const providerItems = context.providerMappings.slice(0, 4);
  const previewItems = context.recordPreviews.slice(0, 4);

  return (
    <section className="area-evidence-grid" aria-label="Area evidence">
      <AreaEvidencePanel
        title="Tables"
        icon="ph-database"
        empty="No tables are linked to this department yet."
        items={tableItems.map((table) => ({
          title: table.name,
          detail: `${table.tableName || table.apiSlug} - ${sharedTableRecordApiPath(table.apiSlug)}`
        }))}
      />
      <AreaEvidencePanel
        title="Records"
        icon="ph-stack"
        empty="No record previews are loaded for this department."
        items={previewItems.map((item) => ({
          title: item.title,
          detail: `${item.tableName} - ${item.detail}`
        }))}
      />
      <AreaEvidencePanel
        title="Knowledge"
        icon="ph-books"
        empty="No imported Drive items are scoped to this department."
        items={driveItems.map((file) => ({
          title: file.name,
          detail: file.isFolder ? "Google Drive folder" : file.mimeType
        }))}
      />
      <AreaEvidencePanel
        title="Providers"
        icon="ph-plugs-connected"
        empty="No provider containers are scoped to this department."
        items={providerItems.map((mapping) => ({
          title: mapping.name || mapping.externalId,
          detail: `${mapping.provider} - ${mapping.entityType}`
        }))}
      />
    </section>
  );
}

function AreaEvidencePanel({
  title,
  icon,
  empty,
  items
}: {
  title: string;
  icon: string;
  empty: string;
  items: Array<{ title: string; detail: string }>;
}) {
  return (
    <article className="area-evidence-panel">
      <div className="area-evidence-title">
        <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="area-evidence-empty">{empty}</p>
      ) : (
        <div className="area-evidence-list">
          {items.map((item, index) => (
            <span key={`${title}-${index}`}>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function AreaDecisionRail({
  area,
  context,
  connection
}: {
  area: AreaViewState;
  context: AreaDetailContext;
  connection: ConnectionData;
}) {
  const items = [
    {
      title: "Ownership",
      detail: context.globalReviewDebt > 0
        ? `${context.globalReviewDebt} resources need a clear owner.`
        : "No unassigned resource debt in loaded context.",
      href: "#area-detail-decisions",
      icon: "ph-shield-warning"
    },
    {
      title: "Knowledge",
      detail: connection.integrations.googleDrive.configured
        ? `${context.driveItems.length} Drive items scoped here.`
        : "Google Drive needs setup before knowledge is trusted.",
      href: "/settings/drive",
      icon: "ph-cloud"
    },
    {
      title: "AI",
      detail: connection.mcpManifest
        ? "Read-safe context is visible to agents."
        : "Review MCP manifest and agent access.",
      href: "/react-agent-tools",
      icon: "ph-robot"
    }
  ];

  return (
    <aside className="area-detail-rail" id="area-detail-decisions" aria-label="Area decisions">
      <div>
        <p className="atlas-kicker">Today in {area.shortLabel}</p>
        <h2>Decision rail</h2>
      </div>
      <div className="area-detail-decision-list">
        {items.map((item) => (
          <a href={item.href} key={item.title}>
            <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
          </a>
        ))}
      </div>
      <div className="area-detail-proof">
        <span>Proof sources</span>
        <strong>/v1/connection</strong>
        <strong>Drive scope</strong>
        <strong>Provider mappings</strong>
      </div>
    </aside>
  );
}

function DepartmentImprovementLoop({
  area,
  context,
  connection,
  activeCapability
}: {
  area: AreaViewState;
  context: AreaDetailContext;
  connection: ConnectionData;
  activeCapability: string;
}) {
  const improvementItems = areaCapabilityRecords(context, "decisions", 4);
  const taskItems = areaCapabilityRecords(context, "tasks", 4);
  const knowledgeReady = context.driveItems.length > 0;
  const agentReady = Boolean(connection.mcpManifest);
  const signals = [
    {
      label: "Evidence",
      value: `${context.tableRecordsCount}`,
      detail: context.tableRecordsCount > 0 ? "records can feed review" : "no records loaded",
      icon: "ph-stack"
    },
    {
      label: "Knowledge",
      value: `${context.driveItems.length}`,
      detail: knowledgeReady ? "Drive evidence is scoped" : "Drive scope needs data",
      icon: "ph-folder-open"
    },
    {
      label: "AI",
      value: agentReady ? "ready" : "review",
      detail: agentReady ? "MCP context available" : "agent packet needs manifest",
      icon: "ph-robot"
    }
  ];
  const queue = [...improvementItems, ...taskItems].slice(0, 5);

  return (
    <section className="department-improvement-loop" aria-label={`${area.label} improvement loop`}>
      <div className="area-detail-section-heading">
        <p className="atlas-kicker">Improvement loop</p>
        <h2>Feedback, defects, standards, next work</h2>
        <span>{activeCapability}</span>
      </div>
      <div className="department-improvement-grid">
        <article className="department-improvement-brief">
          <p>
            Every department system should turn delivery evidence into better
            standards, safer agent packets, and the next focused task. This
            shared loop keeps improvement visible even while department-specific
            subsystems grow.
          </p>
          <div>
            {signals.map((signal) => (
              <span key={signal.label}>
                <i className={`ph-bold ${signal.icon}`} aria-hidden="true"></i>
                <strong>{signal.value}</strong>
                <small>{signal.label} / {signal.detail}</small>
              </span>
            ))}
          </div>
        </article>
        <article className="department-improvement-queue">
          <div className="area-layer-panel-title">
            <i className="ph-bold ph-arrows-clockwise" aria-hidden="true"></i>
            <h3>Next learning queue</h3>
            <span>{queue.length}</span>
          </div>
          {queue.length === 0 ? (
            <p className="area-layer-empty">No task, decision, risk, or approval evidence is ready for improvement review yet.</p>
          ) : (
            <div className="area-data-layer-list">
              {queue.map((item, index) => (
                <a href={item.href || "/tasks-adapter"} key={`${item.title}-${index}`}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <em>{item.meta || "review"}</em>
                </a>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function DepartmentDataBackbone({
  context
}: {
  context: AreaDetailContext;
}) {
  const graph = context.operatingGraph;
  const graphReady = context.operatingGraphStatus === "ready" && Boolean(graph);
  const graphSummary = graph?.summary;
  const graphSignal = context.operatingGraphStatus === "loading"
    ? "Loading graph"
    : graphReady
      ? "Operating graph live"
      : context.operatingGraphStatus === "error"
        ? "Graph fallback"
        : "Graph pending";
  const signals = [
    {
      label: "Graph nodes",
      value: `${graphSummary?.nodes ?? 0}`,
      detail: graphReady ? `${graphSummary?.edges ?? 0} edges` : graphSignal,
      icon: "ph-graph"
    },
    {
      label: "Tables",
      value: `${context.tables.length}`,
      detail: `${context.tableRecordsCount} records`,
      icon: "ph-database"
    },
    {
      label: "Knowledge",
      value: `${graphSummary?.knowledge ?? context.driveItems.length}`,
      detail: `${context.driveItems.length} Drive items`,
      icon: "ph-cloud"
    },
    {
      label: "Review gaps",
      value: `${graphSummary?.gaps ?? context.globalReviewDebt}`,
      detail: graphReady ? `${graph?.reviewItems.length ?? 0} review items` : `${context.globalReviewDebt} ownership debts`,
      icon: "ph-warning-diamond"
    }
  ];
  const gaps = graph?.gaps.slice(0, 3) ?? [];

  return (
    <section className="department-data-backbone" aria-label="Department data backbone">
      <div className="area-detail-section-heading">
        <p className="atlas-kicker">Data backbone</p>
        <h2>Graph, tables, sources, review gaps</h2>
        <span>{graphSignal}</span>
      </div>
      <div className="department-backbone-grid">
        {signals.map((signal) => (
          <article key={signal.label}>
            <i className={`ph-bold ${signal.icon}`} aria-hidden="true"></i>
            <span>
              <strong>{signal.value}</strong>
              <small>{signal.label}</small>
            </span>
            <em>{signal.detail}</em>
          </article>
        ))}
      </div>
      <div className="department-backbone-gaps">
        {gaps.length > 0 ? gaps.map((gap) => (
          <a href="#area-detail-decisions" className={`is-${gap.severity}`} key={gap.id}>
            <span>
              <strong>{gap.title}</strong>
              <small>{gap.detail}</small>
            </span>
            <em>{gap.layer}</em>
          </a>
        )) : (
          <p>
            {graphReady
              ? "No operating graph gaps are visible for this department."
              : "Using local table, provider, and Drive fallback until the area operating graph is available."}
          </p>
        )}
      </div>
    </section>
  );
}

function DepartmentManagementShell({
  selectedArea,
  activeCapability,
  context,
  connection,
  lanes,
  showOperatingBoard,
  specialPanel,
  onSelectCapability
}: {
  selectedArea: AreaViewState;
  activeCapability: string;
  context: AreaDetailContext;
  connection: ConnectionData;
  lanes: AreaDetailLane[];
  showOperatingBoard: boolean;
  specialPanel?: React.ReactNode;
  onSelectCapability: (capability: string) => void;
}) {
  return (
    <section className="department-management-shell" aria-label={`${selectedArea.label} department management shell`}>
      <AreaDetailHero area={selectedArea} context={context} connection={connection} />
      {specialPanel}
      <DepartmentSubsystemRegistry area={selectedArea} connection={connection} />
      <DepartmentDataBackbone context={context} />
      <AreaCapabilityRail activeCapability={activeCapability} onSelectCapability={onSelectCapability} />
      {showOperatingBoard ? <AreaOperatingBoard lanes={lanes} /> : null}
      <AreaCapabilityFocus
        area={selectedArea}
        activeCapability={activeCapability}
        context={context}
        connection={connection}
        onSelectCapability={onSelectCapability}
      />
      <DepartmentImprovementLoop
        area={selectedArea}
        context={context}
        connection={connection}
        activeCapability={activeCapability}
      />
      <AreaEvidenceGrid context={context} />
    </section>
  );
}

function AreaDetailView({
  connection,
  externalMappings,
  googleDriveFiles,
  tableRecords
}: {
  connection: ConnectionData;
  externalMappings: ExternalContainerMapping[];
  googleDriveFiles: GoogleDriveFileRecord[];
  tableRecords: TableRecordSnapshot;
}) {
  const areas = useMemo(() => buildAreaViewState(connection), [connection]);
  const initialAreaKey = resolveInitialAreaKey(areas);
  const [selectedAreaKey, setSelectedAreaKey] = useState(initialAreaKey);
  const [activeCapability, setActiveCapability] = useState(resolveInitialCapability);
  const [operatingGraphState, setOperatingGraphState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    graph: AreaOperatingGraph | null;
  }>({ status: "idle", graph: null });
  const [intakeState, setIntakeState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    data: IntakeData | null;
  }>({ status: "idle", data: null });
  const [financeState, setFinanceState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    data: FinanceContextData | null;
  }>({ status: "idle", data: null });
  const selectedArea = areas.find((area) => area.key === selectedAreaKey) || areas[0];
  const ownerLabel = connection.user?.name || connection.user?.email || "Owner";
  const ownerDetail = connection.user?.email ? "Owner" : connection.workspace.name;

  useEffect(() => {
    let cancelled = false;
    setOperatingGraphState({ status: "loading", graph: null });
    loadAreaOperatingGraph(selectedArea.key)
      .then((graph) => {
        if (!cancelled) {
          setOperatingGraphState({ status: "ready", graph });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOperatingGraphState({ status: "error", graph: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArea.key]);

  useEffect(() => {
    if (selectedArea.key !== "00-ogolny") {
      setIntakeState({ status: "idle", data: null });
      return;
    }

    let cancelled = false;
    setIntakeState({ status: "loading", data: null });
    loadGlobalIntake()
      .then((data) => {
        if (!cancelled) {
          setIntakeState({ status: "ready", data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIntakeState({ status: "error", data: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArea.key]);

  useEffect(() => {
    if (selectedArea.key !== "07-finanse") {
      setFinanceState({ status: "idle", data: null });
      return;
    }

    let cancelled = false;
    setFinanceState({ status: "loading", data: null });
    loadFinanceContext()
      .then((data) => {
        if (!cancelled) {
          setFinanceState({ status: "ready", data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFinanceState({ status: "error", data: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArea.key]);

  const context = useMemo(
    () => areaDetailContext(
      selectedArea,
      externalMappings,
      googleDriveFiles,
      tableRecords,
      operatingGraphState.graph,
      operatingGraphState.status
    ),
    [selectedArea, externalMappings, googleDriveFiles, tableRecords, operatingGraphState.graph, operatingGraphState.status]
  );
  const lanes = useMemo(() => areaDetailLanes(selectedArea, context, connection), [selectedArea, context, connection]);
  const isOperationsSystem = selectedArea.key === "04-operacje";
  const isMainSystem = selectedArea.key === "00-ogolny";
  const isFinanceSystem = selectedArea.key === "07-finanse";
  const departmentSpecialPanel = isMainSystem ? (
    <MainIntakeSystemPanel
      intake={intakeState.data}
      status={intakeState.status}
      connection={connection}
      onRefresh={reloadIntake}
      onSelectCapability={selectCapability}
    />
  ) : isOperationsSystem ? (
    <OperationsManagementSystemPanel
      area={selectedArea}
      context={context}
      connection={connection}
      onSelectCapability={selectCapability}
    />
  ) : isFinanceSystem ? (
    <FinanceManagementBoard
      finance={financeState.data}
      status={financeState.status}
      onSelectCapability={selectCapability}
    />
  ) : null;

  function selectArea(key: string) {
    setSelectedAreaKey(key);
    updateAreaRoute(key, activeCapability);
  }

  function selectCapability(capability: string) {
    setActiveCapability(capability);
    updateAreaRoute(selectedArea.key, capability);
  }

  function reloadIntake() {
    if (selectedArea.key !== "00-ogolny") {
      return;
    }
    setIntakeState({ status: "loading", data: intakeState.data });
    loadGlobalIntake()
      .then((data) => setIntakeState({ status: "ready", data }))
      .catch(() => setIntakeState({ status: "error", data: intakeState.data }));
  }

  return (
    <main className="atlas-shell area-detail-shell" data-theme="companycore">
      <AreaSidebar
        areas={areas}
        selectedArea={selectedArea}
        activeCapability={activeCapability}
        ownerLabel={ownerLabel}
        ownerDetail={ownerDetail}
        onSelectArea={selectArea}
        onSelectCapability={selectCapability}
      />
      <section className="atlas-workspace area-detail-workspace">
        <MobileAppBar workspaceName={connection.workspace.name} />
        <DashboardHeader connection={connection} areas={areas} selectedArea={selectedArea} />
        <MobileAreaSelector areas={areas} selectedArea={selectedArea} onSelectArea={selectArea} />
        <section className="area-detail-layout">
          <div className="area-detail-main">
            <DepartmentManagementShell
              selectedArea={selectedArea}
              activeCapability={activeCapability}
              context={context}
              connection={connection}
              lanes={lanes}
              showOperatingBoard={!isOperationsSystem && !isMainSystem && !isFinanceSystem}
              specialPanel={departmentSpecialPanel}
              onSelectCapability={selectCapability}
            />
          </div>
          <AreaDecisionRail area={selectedArea} context={context} connection={connection} />
        </section>
      </section>
    </main>
  );
}

function compactRecordTitle(record: Record<string, unknown>) {
  const value = record.name
    || record.title
    || record.email
    || record.status
    || record.id;
  return String(value || "Record");
}

function compactRecordDetail(record: Record<string, unknown>) {
  const parts = [
    record.status,
    record.source,
    record.priority,
    record.type,
    record.createdAt
  ].filter(Boolean).map(String);
  return parts.join(" - ") || "Workspace record";
}

function AreaSelectedContext({
  areas,
  selectedAreaId,
  externalMappings,
  googleDriveFiles,
  tableRecords,
  reassignmentAreas,
  pendingAssignment,
  onAssign,
  onSelectArea
}: {
  areas: OperatingArea[];
  selectedAreaId: string;
  externalMappings: ExternalContainerMapping[];
  googleDriveFiles: GoogleDriveFileRecord[];
  tableRecords: TableRecordSnapshot;
  reassignmentAreas: Array<{ id: string; name: string; key: string }>;
  pendingAssignment: string;
  onAssign: (item: AreaReviewItem, areaId: string) => void;
  onSelectArea: (areaId: string) => void;
}) {
  const area = areas.find((item) => item.id === selectedAreaId) || areas[0];

  if (!area) {
    return (
      <LocalNotice
        tone="warning"
        title="No selected area context"
        detail="CompanyCore could not find an operating area to inspect."
      />
    );
  }

  const tables = area.tables || [];
  const tableIds = new Set(tables.map((table) => table.id));
  const driveItems = googleDriveFiles
    .filter((file) => !file.trashed && (
      file.operatingAreaId === area.id
      || Boolean(file.operatingTableId && tableIds.has(file.operatingTableId))
    ))
    .slice(0, 6);
  const mappings = externalMappings
    .filter((mapping) => (
      mapping.areaId === area.id
      || Boolean(mapping.tableId && tableIds.has(mapping.tableId))
    ))
    .slice(0, 6);
  const previews = tables
    .flatMap((table) => (tableRecords[table.apiSlug] || []).slice(0, 3).map((record) => ({ table, record })))
    .slice(0, 8);
  const recordCount = tables.reduce((sum, table) => sum + (tableRecords[table.apiSlug]?.length || 0), 0);

  return (
    <section className="card area-context-card area-section-anchor border border-base-300 bg-base-100 shadow-sm" id="selected-area-context">
      <div className="card-body gap-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_minmax(16rem,22rem)] lg:items-start">
          <div>
            <p className="eyebrow">Selected context</p>
            <h2 className="text-xl font-black">{area.name}</h2>
            <p className="mt-1 text-sm leading-6 text-company-muted">{area.description || area.key}</p>
          </div>
          <label className="form-control">
            <span className="label-text">Inspect area</span>
            <select
              aria-label="Inspect operating area"
              className="select select-bordered"
              onChange={(event) => onSelectArea(event.target.value)}
              value={area.id}
            >
              {areas.map((option) => (
                <option value={option.id} key={option.id}>{option.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="ph-database" label="Tables" value={`${tables.length}`} detail="Mapped tables" />
          <MetricCard icon="ph-stack" label="Records" value={`${recordCount}`} detail="Loaded previews" />
          <MetricCard icon="ph-cloud" label="Drive" value={`${driveItems.length}`} detail="Assigned items" />
          <MetricCard icon="ph-plugs-connected" label="Provider" value={`${mappings.length}`} detail="Assigned mappings" />
        </div>

        <div className="area-context-panels grid gap-4 xl:grid-cols-2">
          <section className="rounded-company border border-base-300 bg-base-200/45 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">Tables and records</h3>
              <span className="badge badge-outline">{previews.length} previews</span>
            </div>
            {tables.length === 0 ? (
              <p className="text-sm text-company-muted">No CompanyCore tables are mapped to this area yet.</p>
            ) : (
              <div className="grid gap-3">
                {tables.map((table) => (
                  <div className="rounded-company border border-base-300 bg-base-100 p-3" key={table.id}>
                    <strong className="block text-sm">{table.name}</strong>
                    <span className="text-xs text-company-muted">{table.tableName || table.apiSlug} - {sharedTableRecordApiPath(table.apiSlug)} - {tableRecords[table.apiSlug]?.length || 0} records</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-company border border-base-300 bg-base-200/45 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">Record previews</h3>
              <span className="badge badge-outline">{recordCount} loaded</span>
            </div>
            {previews.length === 0 ? (
              <p className="text-sm text-company-muted">No records are loaded for this area's mapped tables yet.</p>
            ) : (
              <div className="grid gap-3">
                {previews.map(({ table, record }, index) => (
                  <div className="rounded-company border border-base-300 bg-base-100 p-3" key={`${table.id}-${index}`}>
                    <strong className="block break-words text-sm">{compactRecordTitle(record)}</strong>
                    <span className="text-xs text-company-muted">{table.name} - {compactRecordDetail(record)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-company border border-base-300 bg-base-200/45 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">Assigned Drive items</h3>
              <span className="badge badge-outline">{driveItems.length} visible</span>
            </div>
            {driveItems.length === 0 ? (
              <p className="text-sm text-company-muted">No imported Drive items are assigned to this area yet.</p>
            ) : (
              <div className="grid gap-3">
                {driveItems.map((file) => (
                  <div className="rounded-company border border-base-300 bg-base-100 p-3" key={file.id}>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div className="min-w-0">
                        <strong className="block break-words text-sm">{file.name}</strong>
                        <span className="text-xs text-company-muted">{file.isFolder ? "Folder" : file.mimeType} - {file.scanStatus || "not scanned"}</span>
                      </div>
                      <select
                        aria-label={`Reassign ${file.name} to operating area`}
                        className="select select-bordered select-xs max-w-52"
                        disabled={Boolean(pendingAssignment)}
                        onChange={(event) => onAssign({
                          id: file.id,
                          kind: "drive",
                          title: file.name,
                          detail: file.isFolder ? "Google Drive folder" : file.mimeType,
                          badge: file.isFolder ? "Folder" : "File"
                        }, event.target.value)}
                        value={file.operatingAreaId || area.id}
                      >
                        {reassignmentAreas.map((option) => (
                          <option value={option.id} key={option.id}>{option.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-company border border-base-300 bg-base-200/45 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">Assigned provider mappings</h3>
              <span className="badge badge-outline">{mappings.length} visible</span>
            </div>
            {mappings.length === 0 ? (
              <p className="text-sm text-company-muted">No provider containers are assigned to this area yet.</p>
            ) : (
              <div className="grid gap-3">
                {mappings.map((mapping) => (
                  <div className="rounded-company border border-base-300 bg-base-100 p-3" key={mapping.id}>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div className="min-w-0">
                        <strong className="block break-words text-sm">{mapping.name || mapping.externalId}</strong>
                        <span className="text-xs text-company-muted">{mapping.provider} - {mapping.entityType}</span>
                      </div>
                      <select
                        aria-label={`Reassign ${mapping.name || mapping.externalId} to operating area`}
                        className="select select-bordered select-xs max-w-52"
                        disabled={Boolean(pendingAssignment)}
                        onChange={(event) => onAssign({
                          id: mapping.id,
                          kind: "provider",
                          title: mapping.name || mapping.externalId,
                          detail: `${mapping.provider} ${mapping.entityType}`,
                          badge: "Provider"
                        }, event.target.value)}
                        value={mapping.areaId || area.id}
                      >
                        {reassignmentAreas.map((option) => (
                          <option value={option.id} key={option.id}>{option.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function defaultReactReassignArea(areas: OperatingArea[], currentArea: OperatingArea) {
  return areas.find((area) => area.key === "main-general" && area.id !== currentArea.id)
    || areas.find((area) => area.isSystem && area.id !== currentArea.id)
    || areas.find((area) => area.id !== currentArea.id)
    || null;
}

function AreaLifecyclePanel({
  areas,
  pendingLifecycle,
  onCreate,
  onDelete
}: {
  areas: OperatingArea[];
  pendingLifecycle: string;
  onCreate: (input: { name: string; description?: string }) => void;
  onDelete: (area: OperatingArea, reassignToArea: OperatingArea) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const userAreas = areas.filter((area) => !area.isSystem);
  const isCreating = pendingLifecycle === "create";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      return;
    }
    onCreate({
      name: nextName,
      description: description.trim() || undefined
    });
    setName("");
    setDescription("");
  }

  return (
    <section className="card area-section-anchor border border-base-300 bg-base-100 shadow-sm" id="area-lifecycle">
      <div className="card-body gap-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Area lifecycle</p>
            <h2 className="text-xl font-black">User-created operating areas</h2>
          </div>
          <span className="badge badge-outline">{userAreas.length} editable</span>
        </div>

        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" onSubmit={handleSubmit}>
          <label className="form-control min-w-0">
            <span className="label-text">Name</span>
            <input
              className="input input-bordered"
              disabled={Boolean(pendingLifecycle)}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="New area"
              value={name}
            />
          </label>
          <label className="form-control min-w-0">
            <span className="label-text">Description</span>
            <input
              className="input input-bordered"
              disabled={Boolean(pendingLifecycle)}
              maxLength={160}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Owner workflow scope"
              value={description}
            />
          </label>
          <button className="btn btn-primary" disabled={isCreating || !name.trim()} type="submit">
            {isCreating ? "Creating..." : "Create area"}
          </button>
        </form>

        {userAreas.length === 0 ? (
          <LocalNotice
            tone="info"
            title="No user-created areas yet"
            detail="System areas stay protected; new company functions created here can later be mapped to provider and Drive resources."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {userAreas.map((area) => {
              const reassignArea = defaultReactReassignArea(areas, area);
              const pendingDelete = pendingLifecycle === `delete-${area.id}`;

              return (
                <article className="rounded-company border border-base-300 bg-base-200/45 p-3" key={area.id}>
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="min-w-0">
                      <strong className="block break-words text-sm">{area.name}</strong>
                      <p className="mt-1 text-xs leading-5 text-company-muted">{area.description || area.key}</p>
                    </div>
                    <button
                      className="btn btn-error btn-xs"
                      disabled={Boolean(pendingLifecycle) || !reassignArea}
                      onClick={() => reassignArea && onDelete(area, reassignArea)}
                      type="button"
                    >
                      {pendingDelete ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  {reassignArea ? (
                    <p className="mt-3 text-xs leading-5 text-company-muted">Reassigns linked content to {reassignArea.name}.</p>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-error">No reassignment target is available.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AreasWorkbench({
  connection,
  externalMappings,
  googleDriveFiles,
  tableRecords,
  onReload
}: {
  connection: ConnectionData;
  externalMappings: ExternalContainerMapping[];
  googleDriveFiles: GoogleDriveFileRecord[];
  tableRecords: TableRecordSnapshot;
  onReload: () => void;
}) {
  const [filters, setFilters] = useState<AreaFilterState>({
    search: "",
    type: ""
  });
  const [assignmentNotice, setAssignmentNotice] = useState<AreaAssignmentNotice | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState("");
  const [pendingLifecycle, setPendingLifecycle] = useState("");
  const selectableAreas = companyAreas(connection);
  const [selectedAreaId, setSelectedAreaId] = useState(() => selectableAreas[0]?.id || "");
  const rows = useMemo(
    () => areaWorkbenchRows(connection, externalMappings, googleDriveFiles),
    [connection, externalMappings, googleDriveFiles]
  );
  const visibleRows = useMemo(() => filteredAreaRows(rows, filters), [rows, filters]);
  const readiness = useMemo(() => areaReadiness(rows), [rows]);
  const mappingSignals = useMemo(
    () => areaMappingSignals(connection, rows, externalMappings, googleDriveFiles),
    [connection, rows, externalMappings, googleDriveFiles]
  );
  const metrics = connectionMetrics(connection);
  const systemAreas = rows.filter((row) => row.ownership === "System fallback").length;
  const providerMappings = externalMappings.filter((mapping) => Boolean(mapping.areaId)).length;
  const activeDriveItems = googleDriveFiles.filter((file) => !file.trashed);
  const areaOptions = useMemo(() => companyAreas(connection).map((area) => ({
    id: area.id,
    name: area.name,
    key: area.key
  })), [connection]);
  const operatingAreas = connection.operatingModel.areas;
  const selectedContextAreaId = selectableAreas.some((area) => area.id === selectedAreaId)
    ? selectedAreaId
    : selectableAreas[0]?.id || "";
  const requestedAreaKey = routeAreaQuery().area;
  const hasAreaDetailRequest = canonicalAreas.some((area) => area.key === requestedAreaKey);

  if (hasAreaDetailRequest) {
    return (
      <AreaDetailView
        connection={connection}
        externalMappings={externalMappings}
        googleDriveFiles={googleDriveFiles}
        tableRecords={tableRecords}
      />
    );
  }

  async function handleScopeAssignment(item: AreaReviewItem, areaId: string) {
    if (!areaId) {
      return;
    }

    setPendingAssignment(`${item.kind}-${item.id}`);
    setAssignmentNotice(null);

    try {
      if (item.kind === "provider") {
        await assignProviderMappingScope(item.id, areaId);
      } else {
        await assignDriveFileScope(item.id, areaId);
      }
      setAssignmentNotice({
        tone: "success",
        title: "Operating area assigned",
        detail: `${item.title} was assigned and the React areas workbench is refreshing.`
      });
      window.setTimeout(onReload, 600);
    } catch {
      setAssignmentNotice({
        tone: "error",
        title: "Assignment could not be saved",
        detail: "CompanyCore could not update the operating-area scope. Check your owner session and try again."
      });
    } finally {
      setPendingAssignment("");
    }
  }

  async function handleCreateArea(input: { name: string; description?: string }) {
    setPendingLifecycle("create");
    setAssignmentNotice(null);

    try {
      const area = await createReactOperatingArea(input);
      setAssignmentNotice({
        tone: "success",
        title: "Operating area created",
        detail: `${area.name} was added and the React areas workbench is refreshing.`
      });
      window.setTimeout(onReload, 600);
    } catch {
      setAssignmentNotice({
        tone: "error",
        title: "Operating area could not be created",
        detail: "CompanyCore could not create the area. Check your owner session and try again."
      });
    } finally {
      setPendingLifecycle("");
    }
  }

  async function handleDeleteArea(area: OperatingArea, reassignToArea: OperatingArea) {
    setPendingLifecycle(`delete-${area.id}`);
    setAssignmentNotice(null);

    try {
      await deleteReactOperatingArea(area.id, reassignToArea.id);
      setAssignmentNotice({
        tone: "success",
        title: "Operating area deleted",
        detail: `${area.name} was removed and linked content was reassigned to ${reassignToArea.name}.`
      });
      window.setTimeout(onReload, 600);
    } catch {
      setAssignmentNotice({
        tone: "error",
        title: "Operating area could not be deleted",
        detail: "CompanyCore could not delete the area or reassign its linked content. Check the owner session and try again."
      });
    } finally {
      setPendingLifecycle("");
    }
  }

  return (
    <Shell connection={connection} appLabel="React areas">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-tree-structure" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">React workbench</p>
                  <h1 className="text-3xl font-black leading-tight">Operating areas</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
                    Inspect LuckySparrow departments, table coverage, provider mappings, and Drive ownership from agent-safe API contracts.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/areas">Current areas</a>
                <a className="btn btn-ghost" href="/react-company-os">Company OS</a>
              </div>
            </div>

            <AreaCommandSummary
              rows={rows}
              visibleRows={visibleRows}
              externalMappings={externalMappings}
              googleDriveFiles={googleDriveFiles}
            />
            <LocalNotice
              tone={readiness.tone}
              title={readiness.title}
              detail={readiness.detail}
              action={readiness.action}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-buildings" label="Areas" value={`${metrics.areas}`} detail={`${systemAreas} system fallback`} />
              <MetricCard icon="ph-database" label="Tables" value={`${metrics.tables}`} detail="Mapped data paths" />
              <MetricCard icon="ph-plugs-connected" label="Provider mappings" value={`${providerMappings}`} detail={`${externalMappings.length} loaded`} />
              <MetricCard icon="ph-key" label="Capabilities" value={`${connection.capabilities.length}`} detail="Agent-visible routes" />
              <MetricCard icon="ph-cloud" label="Drive items" value={`${activeDriveItems.length}`} detail={`${metrics.selectedDriveFolders} selected folders`} />
            </div>
          </div>
        </section>

        <AreaFilters filters={filters} onChange={setFilters} />
        <AreaMappingSignalCards signals={mappingSignals} />
        {assignmentNotice ? (
          <LocalNotice
            tone={assignmentNotice.tone}
            title={assignmentNotice.title}
            detail={assignmentNotice.detail}
          />
        ) : null}
        <AreaRelationshipQueues
          externalMappings={externalMappings}
          googleDriveFiles={googleDriveFiles}
          areas={areaOptions}
          pendingAssignment={pendingAssignment}
          onAssign={handleScopeAssignment}
        />
        <AreaSelectedContext
          areas={selectableAreas}
          selectedAreaId={selectedContextAreaId}
          externalMappings={externalMappings}
          googleDriveFiles={googleDriveFiles}
          tableRecords={tableRecords}
          reassignmentAreas={areaOptions}
          pendingAssignment={pendingAssignment}
          onAssign={handleScopeAssignment}
          onSelectArea={setSelectedAreaId}
        />
        <AreaLifecyclePanel
          areas={operatingAreas}
          pendingLifecycle={pendingLifecycle}
          onCreate={handleCreateArea}
          onDelete={handleDeleteArea}
        />
        <AreaCoverageCards rows={rows} />

        <section className="card area-section-anchor border border-base-300 bg-base-100 shadow-sm" id="area-table">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Area table</p>
                <h2 className="text-xl font-black">Department and table coverage</h2>
              </div>
              <span className="badge badge-outline">{visibleRows.length} visible</span>
            </div>
            <AreasTable rows={visibleRows} />
          </div>
        </section>
      </section>
    </Shell>
  );
}

function sumCountGroup(group?: Record<string, number>) {
  return Object.values(group || {}).reduce((sum, value) => sum + value, 0);
}

function recordTitle(record: CompanyOsRecord) {
  return record.name
    || record.title
    || record.pipeline?.name
    || record.requestedForAction
    || record.action
    || record.eventType
    || record.capabilityKey
    || record.provider
    || record.type
    || record.id;
}

function recordDetail(record: CompanyOsRecord) {
  const parts = [
    record.status,
    record.riskLevel ? `risk ${record.riskLevel}` : "",
    record.healthStatus ? `health ${record.healthStatus}` : "",
    record.connectionStatus ? `connection ${record.connectionStatus}` : "",
    record.currentStage?.name ? `stage ${record.currentStage.name}` : "",
    record.approverRole?.name ? `approver ${record.approverRole.name}` : "",
    record.process?.name ? `process ${record.process.name}` : "",
    record.defaultOwnerRole?.name ? `owner ${record.defaultOwnerRole.name}` : "",
    record.ownerRole?.name ? `owner ${record.ownerRole.name}` : "",
    record.actorType ? `actor ${record.actorType}` : "",
    record.requestedByType ? `requested by ${record.requestedByType}` : "",
    record.correlationId ? `correlation ${record.correlationId}` : ""
  ].filter(Boolean);
  return parts.join(" - ") || "Company OS evidence record";
}

function recordSupportingText(record: CompanyOsRecord) {
  return record.purpose
    || record.description
    || record.category
    || record.text
    || record.criteria
    || record.statement
    || (record.capabilities ? `${record.capabilities.length} declared capability${record.capabilities.length === 1 ? "" : "ies"}` : "")
    || (record.controls ? `${record.controls.length} linked control${record.controls.length === 1 ? "" : "s"}` : "")
    || record.id;
}

function taskDetail(task: TaskRecord) {
  return [
    task.status,
    task.priority ? `priority ${task.priority}` : "",
    task.taskList?.name ? `list ${task.taskList.name}` : "",
    task.source ? `source ${task.source}` : "",
    task.dueDate ? `due ${formatTaskDate(task.dueDate)}` : ""
  ].filter(Boolean).join(" - ") || "No task context available";
}

function agentCommandQueue(context: CompanyOsAgentContext): AgentCommandQueueItem[] {
  const pendingApprovals = context.approvals
    .filter((approval) => approval.status === "pending")
    .slice(0, 4)
    .map((approval): AgentCommandQueueItem => ({
      id: `approval-${approval.id}`,
      title: recordTitle(approval),
      detail: recordDetail(approval),
      nextAction: "Owner decision required before high-risk agent action.",
      badge: approval.riskLevel || "pending",
      tone: approval.riskLevel === "critical" || approval.riskLevel === "high" ? "warning" : "info",
      icon: "ph-stamp"
    }));

  const blockedRuns = context.stageRuns
    .filter((run) => ["blocked", "failed"].includes(String(run.status)))
    .slice(0, 4)
    .map((run): AgentCommandQueueItem => ({
      id: `stage-${run.id}`,
      title: recordTitle(run),
      detail: recordDetail(run),
      nextAction: "Resolve the blocked stage before assigning more automation.",
      badge: run.status || "blocked",
      tone: "warning",
      icon: "ph-warning-diamond"
    }));

  const activeAutomation = context.automationRules
    .filter((rule) => rule.status === "active")
    .slice(0, 3)
    .map((rule): AgentCommandQueueItem => ({
      id: `automation-${rule.id}`,
      title: recordTitle(rule),
      detail: recordSupportingText(rule),
      nextAction: "Dry run against a recent event before supervised execution.",
      badge: "dry run first",
      tone: "info",
      icon: "ph-lightning"
    }));

  const approvalPolicies = context.policies
    .filter((policy) => policy.enforcementMode === "block" || policy.enforcementMode === "require_approval")
    .slice(0, 3)
    .map((policy): AgentCommandQueueItem => ({
      id: `policy-${policy.id}`,
      title: recordTitle(policy),
      detail: recordSupportingText(policy),
      nextAction: "Keep agent command scope inside this guardrail.",
      badge: policy.enforcementMode || "policy",
      tone: "success",
      icon: "ph-shield-check"
    }));

  return [
    ...pendingApprovals,
    ...blockedRuns,
    ...activeAutomation,
    ...approvalPolicies
  ].slice(0, 8);
}

function collectionCount(companyOs: CompanyOsData, drilldown: CompanyOsDrilldown) {
  return companyOs.counts[drilldown.countGroup]?.[drilldown.countKey] || 0;
}

function jsonPreview(value: unknown) {
  const serialized = JSON.stringify(value, null, 2);
  return serialized.length > 1800 ? `${serialized.slice(0, 1800)}\n... truncated` : serialized;
}

function recordDetailRows(record: CompanyOsRecord) {
  return [
    ["Status", record.status],
    ["Risk", record.riskLevel],
    ["Health", record.healthStatus],
    ["Connection", record.connectionStatus],
    ["Provider", record.provider],
    ["Type", record.type],
    ["Process", record.process?.name],
    ["Pipeline run", record.pipelineRunId],
    ["Stage run", record.stageRunId],
    ["Pipeline stage", record.pipelineStageId],
    ["Stage", record.currentStage?.name],
    ["Owner", record.ownerRole?.name || record.defaultOwnerRole?.name],
    ["Approver", record.approverRole?.name],
    ["Actor", record.actorType],
    ["Requested by", record.requestedByType],
    ["Correlation", record.correlationId],
    ["Resource", [record.resourceType, record.resourceId].filter(Boolean).join(" / ")],
    ["Date", formatTaskDate(record.createdAt || record.startedAt || record.timestamp)]
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;
}

function stageActionMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const messages: Record<string, string> = {
    active_stage_run_exists: "Another stage is already active for this pipeline run.",
    approval_required: "This stage needs an approved approval reference first.",
    approval_not_approved: "The selected approval is not approved.",
    approval_scope_mismatch: "The selected approval is linked to a different run or stage.",
    acceptance_criteria_incomplete: "Required acceptance criteria must pass or be waived before completion.",
    invalid_stage_transition: "CompanyCore refused this stage transition because of the current status.",
    invalid_pipeline_transition: "CompanyCore refused this pipeline transition because of the current status.",
    pipeline_run_not_found: "The selected pipeline run is no longer available.",
    pipeline_stage_not_found: "The selected stage is no longer available.",
    stage_run_not_found: "The selected stage run is no longer available."
  };

  return messages[error.message] || fallback;
}

function attentionCount(companyOs: CompanyOsData) {
  return Object.values(companyOs.attention).reduce((sum, records) => sum + records.length, 0);
}

function companyOsReadiness(companyOs: CompanyOsData) {
  const pendingApprovals = companyOs.attention.pendingApprovals.length;
  const blockedRuns = companyOs.attention.blockedPipelineRuns.length + companyOs.attention.failedStageRuns.length;
  const highRisks = companyOs.attention.highRisks.length;
  const unhealthyAdapters = companyOs.attention.unhealthyAdapters.length;

  if (blockedRuns > 0) {
    return {
      tone: "error" as NoticeTone,
      title: "Execution needs attention",
      detail: `${blockedRuns} pipeline or stage run${blockedRuns === 1 ? "" : "s"} are blocked or failed. Review runtime evidence before starting more automation.`,
      action: { label: "Open pipeline", href: "/pipeline" }
    };
  }

  if (pendingApprovals > 0 || highRisks > 0 || unhealthyAdapters > 0) {
    return {
      tone: "warning" as NoticeTone,
      title: "Governance queue is active",
      detail: `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"}, ${highRisks} high-risk item${highRisks === 1 ? "" : "s"}, and ${unhealthyAdapters} adapter health signal${unhealthyAdapters === 1 ? "" : "s"} need review.`,
      action: { label: "API settings", href: "/settings/api" }
    };
  }

  return {
    tone: "success" as NoticeTone,
    title: "Company OS foundation is readable",
    detail: "Processes, pipelines, runtime evidence, and governance records are available through the scoped Company OS API.",
    action: { label: "Review integrations", href: "/react-integrations" }
  };
}

function AgentAuthorityBridge({
  eyebrow,
  title,
  detail,
  cards,
  primary,
  secondary
}: {
  eyebrow: string;
  title: string;
  detail: string;
  cards: Array<{ label: string; value: string; detail: string; tone?: "safe" | "review" | "blocked" | "neutral" }>;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  const toneClass = {
    safe: "border-success/25 bg-success/10",
    review: "border-warning/30 bg-warning/10",
    blocked: "border-error/25 bg-error/10",
    neutral: "border-base-300 bg-base-200/50"
  };

  return (
    <section className="rounded-company border border-primary/20 bg-primary/5 p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary btn-sm" href={primary.href}>{primary.label}</a>
          <a className="btn btn-ghost btn-sm" href={secondary.href}>{secondary.label}</a>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article className={`rounded-company border p-3 ${toneClass[card.tone || "neutral"]}`} key={`${card.label}-${card.value}`}>
            <strong className="block text-lg leading-tight">{card.value}</strong>
            <span className="mt-1 block text-xs font-black uppercase text-company-ink">{card.label}</span>
            <p className="mt-1 text-xs leading-5 text-company-muted">{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompanyOsStatePanel({ state, onRetry }: { state: CompanyOsWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load the Company OS cockpit with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading Company OS cockpit",
      detail: "CompanyCore is reading process definitions, runtime evidence, governance queues, and recent audit activity.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Company OS cockpit could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="Company OS">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function CompanyOsAttentionList({ title, records, emptyLabel }: { title: string; records: CompanyOsRecord[]; emptyLabel: string }) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Attention</p>
            <h2 className="text-xl font-black">{title}</h2>
          </div>
          <span className="badge badge-outline">{records.length}</span>
        </div>
        {records.length === 0 ? (
          <LocalNotice tone="success" title={emptyLabel} detail="No matching Company OS records are currently queued." />
        ) : (
          <div className="grid gap-3">
            {records.slice(0, 5).map((record) => (
              <article className="rounded-company border border-base-300 bg-base-200/45 p-4" key={record.id}>
                <strong className="block break-words">{recordTitle(record)}</strong>
                <p className="mt-1 text-sm leading-6 text-company-muted">{recordDetail(record)}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AgentContextList({
  title,
  records,
  emptyLabel
}: {
  title: string;
  records: Array<{ id: string; title: string; detail: string; badge?: string | null }>;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-black">{title}</h3>
        <span className="badge badge-outline">{records.length}</span>
      </div>
      {records.length === 0 ? (
        <p className="text-sm leading-6 text-company-muted">{emptyLabel}</p>
      ) : (
        <div className="grid gap-3">
          {records.slice(0, 4).map((record) => (
            <article className="min-w-0 rounded-company border border-base-300 bg-base-100 p-3" key={record.id}>
              <div className="flex items-start justify-between gap-2">
                <strong className="min-w-0 break-words text-sm leading-5">{record.title}</strong>
                {record.badge ? <span className="badge badge-sm badge-outline shrink-0">{record.badge}</span> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-company-muted">{record.detail}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCommandQueue({ items }: { items: AgentCommandQueueItem[] }) {
  if (items.length === 0) {
    return (
      <LocalNotice
        tone="success"
        title="No agent command queue pressure"
        detail="CompanyCore has no pending approval, blocked stage, or active automation item that needs owner triage right now."
      />
    );
  }

  return (
    <section className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="eyebrow">Agent command queue</p>
          <h3 className="text-base font-black">Owner-gated next actions</h3>
          <p className="mt-1 text-xs leading-5 text-company-muted">
            Ranked from approvals, blocked execution, automation candidates, and policy guardrails already loaded from Company OS.
          </p>
        </div>
        <span className="badge badge-outline">{items.length} queued</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <article className="rounded-company border border-base-300 bg-base-100 p-3" key={item.id}>
            <div className="flex items-start gap-3">
              <span className={`dashboard-icon ${item.tone === "warning" ? "text-warning" : item.tone === "success" ? "text-success" : "text-info"}`}>
                <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="break-words text-sm">{item.title}</strong>
                  <span className="badge badge-outline">{item.badge}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-company-muted">{item.detail}</p>
                <p className="mt-2 text-xs font-black leading-5 text-base-content">{item.nextAction}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommandPreviewCard({ preview }: { preview: CommandPreview }) {
  return (
    <article className={`rounded-company border p-4 ${nodeToneClass(preview.tone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{preview.eyebrow}</p>
          <h3 className="text-sm font-black">{preview.title}</h3>
        </div>
        <span className="badge badge-outline">Command readiness preview</span>
      </div>
      <dl className="mt-3 grid gap-2">
        {preview.items.map((item) => (
          <div className="grid gap-1 rounded-lg bg-base-100/70 p-2 sm:grid-cols-[8rem_1fr]" key={item.label}>
            <dt className="text-xs font-black uppercase text-company-muted">{item.label}</dt>
            <dd className="break-words text-sm font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase text-company-muted">Expected result</p>
          <p className="mt-1 text-sm leading-6 text-company-muted">{preview.expectedResult}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-company-muted">Recovery guidance</p>
          <p className="mt-1 text-sm leading-6 text-company-muted">{preview.recovery}</p>
        </div>
      </div>
    </article>
  );
}

function emptyStandardDraft(): StandardDefinitionDraft {
  return {
    name: "",
    category: "operations",
    description: "",
    validationMethod: "",
    ownerRoleId: "",
    checklistId: "",
    status: "active"
  };
}

function standardDraftFromRecord(record: CompanyOsRecord): StandardDefinitionDraft {
  return {
    name: record.name || "",
    category: record.category || "operations",
    description: record.description || "",
    validationMethod: record.validationMethod || "",
    ownerRoleId: record.ownerRoleId || "",
    checklistId: record.checklistId || "",
    status: (record.status as StandardDefinitionDraft["status"]) || "active"
  };
}

function standardInputFromDraft(draft: StandardDefinitionDraft): CompanyOsStandardInput {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim() || null,
    validationMethod: draft.validationMethod.trim() || null,
    ownerRoleId: draft.ownerRoleId || null,
    checklistId: draft.checklistId || null,
    status: draft.status
  };
}

function standardActionMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const messages: Record<string, string> = {
    forbidden: "This key or session does not have company-os:definition:write.",
    invalid_token: "Sign in again before editing Company OS standards.",
    owner_role_not_found: "The selected owner role is not visible in this workspace.",
    checklist_not_found: "The selected checklist is not visible in this workspace.",
    standard_version_conflict: "A standard with this name and version already exists.",
    validation_error: "Check the required standard fields and try again.",
    not_found: "The selected standard is no longer visible in this workspace."
  };

  return messages[error.message] || fallback;
}

const workflowRootCollections: Record<WorkflowDefinitionRootType, CompanyOsCollectionName> = {
  process: "processes",
  pipeline: "pipelines",
  procedure: "procedures"
};

function workflowDraftErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const messages: Record<string, string> = {
    forbidden: "This session does not have the workflow definition capability required for that action.",
    invalid_token: "Sign in again before operating workflow definitions.",
    validation_error: "Check the selected workflow root and draft reason before trying again.",
    workflow_root_not_found: "The selected workflow definition is no longer visible in this workspace.",
    workflow_definition_approval_required: "This activation needs an approved approval ID before it can continue.",
    workflow_definition_draft_not_activatable: "This draft is no longer in an activatable state.",
    stale_workflow_definition_draft: "The active workflow definition changed after this draft was created.",
    workflow_definition_activation_conflict: "CompanyCore could not activate this draft because the target version already exists."
  };

  return messages[error.message] || fallback;
}

function workflowChangeSetFromRecord(rootType: WorkflowDefinitionRootType, record: CompanyOsRecord): Record<string, unknown> {
  if (rootType === "process") {
    return {
      description: record.description || null,
      ownerRoleId: record.ownerRoleId || null,
      department: "department" in record ? (record as { department?: string | null }).department || null : null,
      category: record.category || null,
      maturityLevel: "reviewed"
    };
  }

  if (rootType === "pipeline") {
    return {
      processId: record.processId || null,
      purpose: record.purpose || "Workflow purpose reviewed from the Company OS cockpit.",
      triggerType: "manual",
      defaultOwnerRoleId: "defaultOwnerRoleId" in record ? (record as { defaultOwnerRoleId?: string | null }).defaultOwnerRoleId || null : null,
      isAutomatable: Boolean((record as { isAutomatable?: boolean | null }).isAutomatable),
      riskLevel: record.riskLevel || "medium"
    };
  }

  return {
    processId: record.processId || null,
    purpose: record.purpose || "Procedure purpose reviewed from the Company OS cockpit.",
    scope: "scope" in record ? (record as { scope?: string | null }).scope || null : null,
    ownerRoleId: record.ownerRoleId || null,
    expectedResult: "expectedResult" in record ? (record as { expectedResult?: string | null }).expectedResult || null : null
  };
}

function workflowPreviewSummary(preview: CompanyOsWorkflowImpactPreview | null | undefined) {
  if (!preview) {
    return "Preview not generated yet.";
  }

  const countParts = Object.entries(preview.counts || {})
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key, value]) => `${key}: ${value}`);

  if (countParts.length === 0) {
    return preview.approvalRequired ? "Approval required before activation." : "No active runtime impact detected.";
  }

  return countParts.join(" / ");
}

function CompanyOsWorkflowDraftPanel({
  connection,
  onChanged
}: {
  connection: ConnectionData;
  onChanged: () => void;
}) {
  const [rootType, setRootType] = useState<WorkflowDefinitionRootType>("pipeline");
  const [processesState, reloadProcesses] = useCompanyOsCollectionState("processes");
  const [pipelinesState, reloadPipelines] = useCompanyOsCollectionState("pipelines");
  const [proceduresState, reloadProcedures] = useCompanyOsCollectionState("procedures");
  const [selectedRootId, setSelectedRootId] = useState("");
  const [selectedRecoveryRootId, setSelectedRecoveryRootId] = useState("");
  const [reason, setReason] = useState("Owner reviewed this workflow definition from the web cockpit.");
  const [recoveryReason, setRecoveryReason] = useState("Owner reviewed this recovery action from the web cockpit.");
  const [approvalId, setApprovalId] = useState("");
  const [draft, setDraft] = useState<CompanyOsWorkflowDraft | null>(null);
  const [draftHistory, setDraftHistory] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    records: CompanyOsWorkflowDraft[];
    message?: string;
  }>({ status: "idle", records: [] });
  const [preview, setPreview] = useState<CompanyOsWorkflowImpactPreview | null>(null);
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const canWriteWorkflow = connection.capabilities.includes("company-os:workflow-definition:write");
  const canActivateWorkflow = connection.capabilities.includes("company-os:workflow-definition:activate");
  const canRequestApproval = connection.capabilities.includes("company-os:approval:request");
  const canDecideApproval = connection.capabilities.includes("company-os:approval:decide");
  const rootStates = {
    process: processesState,
    pipeline: pipelinesState,
    procedure: proceduresState
  };
  const currentState = rootStates[rootType];
  const roots = currentState.status === "ready" ? currentState.records : [];
  const selectedRoot = roots.find((record) => record.id === selectedRootId) || roots[0] || null;
  const recoveryCandidates = roots.filter((record) => record.status && record.status !== "active");
  const selectedRecoveryRoot = recoveryCandidates.find((record) => record.id === selectedRecoveryRootId)
    || recoveryCandidates[0]
    || null;
  const previewNeedsApproval = Boolean(preview?.approvalRequired);
  const activationBlockedByApproval = previewNeedsApproval && !approvalId.trim();

  function reloadCurrentRoots() {
    if (rootType === "process") {
      reloadProcesses();
    }
    if (rootType === "pipeline") {
      reloadPipelines();
    }
    if (rootType === "procedure") {
      reloadProcedures();
    }
  }

  function refreshDraftHistory(nextRootType = rootType) {
    if (!canWriteWorkflow) {
      setDraftHistory({ status: "idle", records: [] });
      return;
    }

    setDraftHistory((current) => ({ ...current, status: "loading" }));
    loadCompanyOsWorkflowDrafts(nextRootType)
      .then((records) => {
        setDraftHistory({ status: "ready", records });
      })
      .catch((error) => {
        setDraftHistory({
          status: "error",
          records: [],
          message: workflowDraftErrorMessage(error, "CompanyCore could not load workflow drafts.")
        });
      });
  }

  useEffect(() => {
    refreshDraftHistory(rootType);
  }, [rootType, canWriteWorkflow]);

  function handleRootTypeChange(nextRootType: WorkflowDefinitionRootType) {
    setRootType(nextRootType);
    setSelectedRootId("");
    setSelectedRecoveryRootId("");
    setDraft(null);
    setPreview(null);
    setApprovalId("");
    setNotice(null);
  }

  async function handleArchiveHistoricalVersion() {
    if (!selectedRecoveryRoot || !canActivateWorkflow || !recoveryReason.trim()) {
      return;
    }

    setPendingAction("archive-version");
    setNotice(null);

    try {
      const archived = await archiveCompanyOsWorkflowVersion(rootType, selectedRecoveryRoot.id, {
        reason: recoveryReason,
        idempotencyKey: `web-archive-${rootType}-${selectedRecoveryRoot.id}-${Date.now()}`,
        sourceChannel: "web"
      });
      setNotice({
        tone: "success",
        title: "Historical version archived",
        detail: `${selectedRecoveryRoot.name || selectedRecoveryRoot.id} is now ${archived.status || "archived"} with audit evidence ${archived.auditLogId || "recorded"}.`
      });
      setSelectedRecoveryRootId("");
      reloadCurrentRoots();
      onChanged();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Archive failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not archive this historical workflow version.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleCreateRollbackDraft() {
    if (!selectedRecoveryRoot || !canWriteWorkflow || !recoveryReason.trim()) {
      return;
    }

    setPendingAction("rollback-draft");
    setNotice(null);

    try {
      const rollbackDraft = await createCompanyOsWorkflowRollbackDraft(rootType, selectedRecoveryRoot.id, {
        reason: recoveryReason,
        riskLevel: selectedRecoveryRoot.riskLevel === "critical" || selectedRecoveryRoot.riskLevel === "high" ? selectedRecoveryRoot.riskLevel : "medium",
        idempotencyKey: `web-rollback-${rootType}-${selectedRecoveryRoot.id}-${Date.now()}`,
        sourceChannel: "web"
      });
      setDraft(rollbackDraft);
      setPreview(rollbackDraft.impactPreview || null);
      setSelectedRootId(rollbackDraft.rootObjectId || "");
      setApprovalId("");
      setNotice({
        tone: rollbackDraft.impactPreview?.approvalRequired ? "warning" : "success",
        title: "Rollback draft created",
        detail: `${rollbackDraft.name || "Rollback draft"} is ready for the same preview and activation path as a normal workflow draft.`
      });
      refreshDraftHistory();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Rollback draft failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not create a rollback draft from this workflow version.")
      });
    } finally {
      setPendingAction("");
    }
  }

  function resumeDraft(record: CompanyOsWorkflowDraft) {
    setDraft(record);
    setPreview(record.impactPreview || null);
    setSelectedRootId(record.rootObjectId || "");
    setApprovalId("");
    setNotice({
      tone: "info",
      title: "Workflow draft resumed",
      detail: `${record.name || "Draft"} is loaded with its last saved preview state.`
    });
  }

  async function handleCreateDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoot || !canWriteWorkflow) {
      return;
    }

    setPendingAction("create");
    setNotice(null);
    setPreview(null);

    try {
      const created = await createCompanyOsWorkflowDraft({
        rootObjectType: rootType,
        rootObjectId: selectedRoot.id,
        name: `${selectedRoot.name || selectedRoot.title || rootType} web draft`,
        reason,
        riskLevel: selectedRoot.riskLevel === "critical" || selectedRoot.riskLevel === "high" ? selectedRoot.riskLevel : "medium",
        changeSet: workflowChangeSetFromRecord(rootType, selectedRoot),
        idempotencyKey: `web-${rootType}-${selectedRoot.id}-${Date.now()}`,
        sourceChannel: "web"
      });
      setDraft(created);
      setNotice({
        tone: "success",
        title: "Workflow draft created",
        detail: `${created.name || "Draft"} is ready for impact preview.`
      });
      refreshDraftHistory();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Workflow draft could not be created",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not create the workflow draft.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handlePreviewDraft() {
    if (!draft || !canWriteWorkflow) {
      return;
    }

    setPendingAction("preview");
    setNotice(null);

    try {
      const previewed = await previewCompanyOsWorkflowDraftImpact(draft.id);
      setDraft(previewed);
      setPreview(previewed.impactPreview || null);
      setNotice({
        tone: previewed.impactPreview?.approvalRequired ? "warning" : "success",
        title: previewed.impactPreview?.approvalRequired ? "Approval required" : "Impact preview ready",
        detail: workflowPreviewSummary(previewed.impactPreview)
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Impact preview failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not preview this workflow draft.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleRequestApproval() {
    if (!draft || !canRequestApproval) {
      return;
    }

    setPendingAction("approval");
    setNotice(null);

    try {
      const approval = await requestCompanyOsApproval({
        requestedByType: "user",
        requestedForAction: "workflow_definition_draft.activate",
        resourceType: "workflow_definition_draft",
        resourceId: draft.id,
        riskLevel: "high",
        inputPayload: {
          reason,
          rootObjectType: rootType,
          rootObjectId: selectedRoot?.id || draft.rootObjectId || null
        }
      });
      setApprovalId(approval.id);
      setNotice({
        tone: "success",
        title: "Approval requested",
        detail: `Approval ${approval.id} is ready for owner decision before activation.`
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Approval request failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not request approval for this draft.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleApproveRequestedApproval() {
    if (!approvalId.trim() || !canDecideApproval) {
      return;
    }

    setPendingAction("approval-decision");
    setNotice(null);

    try {
      await decideCompanyOsApproval(approvalId.trim(), {
        decision: "approved",
        decisionReason: "Approved from the workflow recovery command panel."
      });
      setNotice({
        tone: "success",
        title: "Approval approved",
        detail: `Approval ${approvalId.trim()} is approved and ready for workflow activation.`
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Approval decision failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not approve this workflow activation request.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleActivateDraft() {
    if (!draft || !canActivateWorkflow || activationBlockedByApproval) {
      return;
    }

    setPendingAction("activate");
    setNotice(null);

    try {
      const activated = await activateCompanyOsWorkflowDraft(draft.id, {
        approvalId: approvalId.trim() || undefined,
        sourceChannel: "web"
      });
      setDraft(activated);
      setNotice({
        tone: "success",
        title: "Workflow draft activated",
        detail: `${activated.name || "Draft"} activated with audit evidence ${activated.auditLogId || "recorded"}.`
      });
      refreshDraftHistory();
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Activation failed",
        detail: workflowDraftErrorMessage(error, "CompanyCore could not activate this workflow draft.")
      });
    } finally {
      setPendingAction("");
    }
  }

  const rootColumns: Array<TableColumn<CompanyOsRecord>> = [
    {
      key: "name",
      header: "Workflow",
      cell: (record) => (
        <button className="link text-left font-black" type="button" onClick={() => setSelectedRootId(record.id)}>
          {record.name || record.title || record.id}
        </button>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (record) => <span className="badge badge-ghost">{record.status || "active"}</span>
    },
    {
      key: "version",
      header: "Version",
      cell: (record) => `v${record.version || 1}`
    },
    {
      key: "owner",
      header: "Owner",
      cell: (record) => record.ownerRole?.name || record.defaultOwnerRole?.name || "Unassigned"
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Workflow command surface</p>
            <h2 className="text-xl font-black">Draft, preview, activate</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              Operate versioned workflow definitions through the same draft and approval contract exposed to MCP agents.
            </p>
          </div>
          <div className="join">
            {(["process", "pipeline", "procedure"] as WorkflowDefinitionRootType[]).map((type) => (
              <button
                className={`btn join-item btn-sm ${rootType === type ? "btn-primary" : "btn-ghost"}`}
                key={type}
                onClick={() => handleRootTypeChange(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {!canWriteWorkflow ? (
          <LocalNotice
            tone="warning"
            title="Workflow write capability missing"
            detail="This session can read workflow definitions, but draft and preview commands need company-os:workflow-definition:write."
          />
        ) : (
          <LocalNotice
            tone="info"
            title="Guarded versioning"
            detail="This surface creates a draft first, previews runtime impact, and only activates through the supervised workflow-definition command."
          />
        )}

        {notice ? <LocalNotice tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            {currentState.status === "loading" ? (
              <LocalNotice tone="info" title="Loading workflow definitions" detail={`CompanyCore is reading ${workflowRootCollections[rootType]}.`} />
            ) : null}
            {currentState.status === "error" ? (
              <LocalNotice tone="error" title="Workflow definitions could not load" detail={currentState.message} />
            ) : null}
            {currentState.status === "signed-out" ? (
              <LocalNotice tone="warning" title="Owner session required" detail="Sign in again to read workflow definitions." />
            ) : null}
            {currentState.status === "ready" ? (
              <DataTable
                columns={rootColumns}
                rows={roots}
                emptyTitle="No workflow definitions found"
                emptyDetail={`Create a ${rootType} before running the workflow draft command surface.`}
              />
            ) : null}
          </div>

          <form className="grid gap-3 rounded-company border border-base-300 bg-base-200/45 p-4" onSubmit={handleCreateDraft}>
            <div>
              <p className="eyebrow">Selected {rootType}</p>
              <h3 className="text-base font-black">{selectedRoot?.name || selectedRoot?.title || "No definition selected"}</h3>
              <p className="mt-1 text-xs text-company-muted">
                {selectedRoot ? `Current version v${selectedRoot.version || 1}` : "Choose a workflow definition from the table."}
              </p>
            </div>

            <label className="form-control min-w-0">
              <span className="label-text">Workflow definition</span>
              <select
                className="select select-bordered"
                aria-label="Workflow definition"
                disabled={!canWriteWorkflow || Boolean(pendingAction) || roots.length === 0}
                onChange={(event) => {
                  setSelectedRootId(event.target.value);
                  setDraft(null);
                  setPreview(null);
                  setApprovalId("");
                }}
                value={selectedRoot?.id || ""}
              >
                {roots.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.name || record.title || record.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Draft reason</span>
              <textarea
                className="textarea textarea-bordered min-h-24"
                disabled={!canWriteWorkflow || Boolean(pendingAction)}
                maxLength={2000}
                aria-label="Workflow draft reason"
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            </label>

            <button
              className="btn btn-primary"
              disabled={!canWriteWorkflow || Boolean(pendingAction) || !selectedRoot || !reason.trim()}
              type="submit"
            >
              <i className="ph-bold ph-git-branch" aria-hidden="true"></i>
              {pendingAction === "create" ? "Creating" : "Create draft"}
            </button>

            <div className="divider my-1"></div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Draft</span>
                <span className="badge badge-outline">{draft?.status || "none"}</span>
              </div>
              <p className="text-company-muted">{draft ? draft.name || draft.id : "No draft created in this session."}</p>
              <p className="text-company-muted">{workflowPreviewSummary(preview)}</p>
              {preview?.approvalReasons?.length ? (
                <ul className="grid gap-1 text-xs text-company-muted">
                  {preview.approvalReasons.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="rounded-company border border-base-300 bg-base-100 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-black">Recent drafts</span>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={!canWriteWorkflow || draftHistory.status === "loading"}
                  onClick={() => refreshDraftHistory()}
                  type="button"
                >
                  Refresh
                </button>
              </div>
              {draftHistory.status === "loading" ? (
                <p className="text-xs text-company-muted">Loading workflow drafts.</p>
              ) : null}
              {draftHistory.status === "error" ? (
                <p className="text-xs text-error">{draftHistory.message}</p>
              ) : null}
              {draftHistory.status === "ready" && draftHistory.records.length === 0 ? (
                <p className="text-xs text-company-muted">No saved drafts for this workflow type.</p>
              ) : null}
              {draftHistory.records.length > 0 ? (
                <div className="grid gap-2">
                  {draftHistory.records.map((record) => (
                    <button
                      className="rounded-company border border-base-300 p-2 text-left text-xs hover:border-primary"
                      key={record.id}
                      onClick={() => resumeDraft(record)}
                      type="button"
                    >
                      <span className="block font-black">{record.name || record.id}</span>
                      <span className="text-company-muted">
                        {record.status || "draft"} / v{record.targetVersion || record.baseVersion || 1}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-company border border-base-300 bg-base-100 p-3">
              <div className="mb-3">
                <p className="text-sm font-black">Recovery controls</p>
                <p className="mt-1 text-xs text-company-muted">
                  Archive inactive history or create a rollback draft without bypassing preview and activation.
                </p>
              </div>

              {recoveryCandidates.length === 0 ? (
                <p className="text-xs text-company-muted">No inactive historical versions for this workflow type.</p>
              ) : (
                <div className="grid gap-3">
                  <label className="form-control min-w-0">
                    <span className="label-text">Historical version</span>
                    <select
                      className="select select-bordered select-sm"
                      disabled={Boolean(pendingAction)}
                      onChange={(event) => setSelectedRecoveryRootId(event.target.value)}
                      value={selectedRecoveryRoot?.id || ""}
                    >
                      {recoveryCandidates.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.name || record.title || record.id} / {record.status} / v{record.version || 1}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control min-w-0">
                    <span className="label-text">Recovery reason</span>
                    <textarea
                      className="textarea textarea-bordered min-h-20 text-sm"
                      disabled={Boolean(pendingAction)}
                      maxLength={2000}
                      aria-label="Workflow recovery reason"
                      onChange={(event) => setRecoveryReason(event.target.value)}
                      value={recoveryReason}
                    />
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={!selectedRecoveryRoot || selectedRecoveryRoot.status === "archived" || !canActivateWorkflow || Boolean(pendingAction) || !recoveryReason.trim()}
                      onClick={handleArchiveHistoricalVersion}
                      type="button"
                    >
                      <i className="ph-bold ph-archive" aria-hidden="true"></i>
                      {pendingAction === "archive-version" ? "Archiving" : "Archive"}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={!selectedRecoveryRoot || !canWriteWorkflow || Boolean(pendingAction) || !recoveryReason.trim()}
                      onClick={handleCreateRollbackDraft}
                      type="button"
                    >
                      <i className="ph-bold ph-arrow-counter-clockwise" aria-hidden="true"></i>
                      {pendingAction === "rollback-draft" ? "Creating" : "Rollback draft"}
                    </button>
                  </div>

                  {selectedRecoveryRoot ? (
                    <p className="text-xs text-company-muted">
                      Selected recovery source: {selectedRecoveryRoot.status || "inactive"} version v{selectedRecoveryRoot.version || 1}.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <button
              className="btn btn-ghost"
              disabled={!draft || !canWriteWorkflow || Boolean(pendingAction)}
              onClick={handlePreviewDraft}
              type="button"
            >
              <i className="ph-bold ph-magnifying-glass" aria-hidden="true"></i>
              {pendingAction === "preview" ? "Previewing" : "Preview impact"}
            </button>

            <button
              className="btn btn-ghost"
              disabled={!draft || !previewNeedsApproval || !canRequestApproval || Boolean(pendingAction)}
              onClick={handleRequestApproval}
              type="button"
            >
              <i className="ph-bold ph-seal-check" aria-hidden="true"></i>
              {pendingAction === "approval" ? "Requesting" : "Request approval"}
            </button>

            <button
              className="btn btn-ghost"
              disabled={!draft || !previewNeedsApproval || !approvalId.trim() || !canDecideApproval || Boolean(pendingAction)}
              onClick={handleApproveRequestedApproval}
              type="button"
            >
              <i className="ph-bold ph-check-circle" aria-hidden="true"></i>
              {pendingAction === "approval-decision" ? "Approving" : "Approve requested approval"}
            </button>

            <label className="form-control min-w-0">
              <span className="label-text">Approved approval ID</span>
              <input
                className="input input-bordered"
                disabled={!draft || Boolean(pendingAction)}
                aria-label="Approved approval ID"
                onChange={(event) => setApprovalId(event.target.value)}
                placeholder={previewNeedsApproval ? "Required after approval decision" : "Optional"}
                value={approvalId}
              />
            </label>

            <button
              className="btn btn-secondary"
              disabled={!draft || !canActivateWorkflow || Boolean(pendingAction) || activationBlockedByApproval}
              onClick={handleActivateDraft}
              type="button"
            >
              <i className="ph-bold ph-rocket-launch" aria-hidden="true"></i>
              {pendingAction === "activate" ? "Activating" : "Activate draft"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function CompanyOsStandardsEditor({
  connection,
  onChanged
}: {
  connection: ConnectionData;
  onChanged: () => void;
}) {
  const [standardsState, reloadStandards] = useCompanyOsCollectionState("standards");
  const [rolesState, reloadRoles] = useCompanyOsCollectionState("company-roles");
  const [checklistsState, reloadChecklists] = useCompanyOsCollectionState("checklist-templates");
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [draft, setDraft] = useState<StandardDefinitionDraft>(() => emptyStandardDraft());
  const [pendingAction, setPendingAction] = useState("");
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const canWriteDefinitions = connection.capabilities.includes("company-os:definition:write");
  const standards = standardsState.status === "ready" ? standardsState.records : [];
  const roles = rolesState.status === "ready" ? rolesState.records : [];
  const checklists = checklistsState.status === "ready" ? checklistsState.records : [];
  const selectedStandard = standards.find((standard) => standard.id === selectedStandardId) || null;
  const activeStandards = standards.filter((standard) => standard.status !== "archived").length;
  const archivedStandards = standards.filter((standard) => standard.status === "archived").length;

  function refreshEditor(options: { includeWorkbench?: boolean } = {}) {
    reloadStandards();
    reloadRoles();
    reloadChecklists();
    if (options.includeWorkbench) {
      onChanged();
    }
  }

  function resetDraft() {
    setSelectedStandardId("");
    setDraft(emptyStandardDraft());
  }

  function selectStandard(record: CompanyOsRecord) {
    setSelectedStandardId(record.id);
    setDraft(standardDraftFromRecord(record));
    setNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.category.trim() || !canWriteDefinitions) {
      return;
    }

    setPendingAction(selectedStandard ? `update-${selectedStandard.id}` : "create");
    setNotice(null);

    try {
      const input = standardInputFromDraft(draft);
      const saved = selectedStandard
        ? await updateCompanyOsStandard(selectedStandard.id, input)
        : await createCompanyOsStandard(input);
      setSelectedStandardId(saved.id);
      setDraft(standardDraftFromRecord(saved));
      setNotice({
        tone: "success",
        title: selectedStandard ? "Standard updated" : "Standard created",
        detail: `${saved.name || "Standard"} saved with audit evidence ${saved.auditLogId || "recorded"}.`
      });
      window.setTimeout(refreshEditor, 500);
    } catch (error) {
      setNotice({
        tone: "error",
        title: selectedStandard ? "Standard could not be updated" : "Standard could not be created",
        detail: standardActionMessage(error, "CompanyCore could not save this standard. Check the fields and try again.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleArchive(record: CompanyOsRecord) {
    if (!canWriteDefinitions || record.status === "archived") {
      return;
    }

    setPendingAction(`archive-${record.id}`);
    setNotice(null);

    try {
      const archived = await archiveCompanyOsStandard(record.id);
      if (selectedStandardId === record.id) {
        setDraft(standardDraftFromRecord(archived));
      }
      setNotice({
        tone: "success",
        title: "Standard archived",
        detail: `${archived.name || "Standard"} is archived without deleting linked Company OS evidence.`
      });
      window.setTimeout(refreshEditor, 500);
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Standard could not be archived",
        detail: standardActionMessage(error, "CompanyCore could not archive this standard. Check your session and try again.")
      });
    } finally {
      setPendingAction("");
    }
  }

  const columns: Array<TableColumn<CompanyOsRecord>> = [
    {
      key: "standard",
      header: "Standard",
      cell: (record) => (
        <button
          className="link text-left font-black"
          onClick={() => selectStandard(record)}
          type="button"
        >
          {record.name || record.id}
        </button>
      )
    },
    {
      key: "category",
      header: "Category",
      cell: (record) => <span className="badge badge-outline">{record.category || "general"}</span>
    },
    {
      key: "status",
      header: "Status",
      cell: (record) => <span className="badge badge-ghost">{record.status || "active"}</span>
    },
    {
      key: "owner",
      header: "Owner",
      cell: (record) => record.ownerRole?.name || "Unassigned"
    },
    {
      key: "action",
      header: "Action",
      cell: (record) => (
        <button
          className="btn btn-ghost btn-xs"
          disabled={!canWriteDefinitions || record.status === "archived" || pendingAction === `archive-${record.id}`}
          onClick={() => handleArchive(record)}
          type="button"
        >
          <i className="ph-bold ph-archive" aria-hidden="true"></i>
          {pendingAction === `archive-${record.id}` ? "Archiving" : "Archive"}
        </button>
      )
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Definition editor</p>
            <h2 className="text-xl font-black">Standards</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              Create, update, and archive low-risk Company OS standards through the audited Class A backend contract.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-outline">{activeStandards} active</span>
            <span className="badge badge-outline">{archivedStandards} archived</span>
          </div>
        </div>

        {!canWriteDefinitions ? (
          <LocalNotice
            tone="warning"
            title="Definition write capability missing"
            detail="This session can read Company OS records, but standards editing needs company-os:definition:write."
          />
        ) : (
          <LocalNotice
            tone="info"
            title="Audited Class A editor"
            detail="This panel edits only standards. Workflow, governance, automation, approvals, events, and audit logs remain outside this write surface."
          />
        )}

        {notice ? <LocalNotice tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            {standardsState.status === "loading" ? (
              <LocalNotice tone="info" title="Loading standards" detail="CompanyCore is reading standard definitions." />
            ) : null}
            {standardsState.status === "error" ? (
              <LocalNotice tone="error" title="Standards could not load" detail={standardsState.message} />
            ) : null}
            {standardsState.status === "signed-out" ? (
              <LocalNotice tone="warning" title="Owner session required" detail="Sign in again to read Company OS standards." />
            ) : null}
            {standardsState.status === "ready" ? (
              <DataTable
                columns={columns}
                rows={standards}
                emptyTitle="No standards found"
                emptyDetail="Create the first low-risk standard before adding a broader definition editor."
              />
            ) : null}
          </div>

          <form className="grid gap-3 rounded-company border border-base-300 bg-base-200/45 p-4" onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{selectedStandard ? "Edit standard" : "New standard"}</p>
                <h3 className="text-base font-black">{selectedStandard ? selectedStandard.name : "Standard details"}</h3>
              </div>
              {selectedStandard ? (
                <button className="btn btn-ghost btn-xs" onClick={resetDraft} type="button">
                  <i className="ph-bold ph-plus" aria-hidden="true"></i>
                  New
                </button>
              ) : null}
            </div>

            <label className="form-control min-w-0">
              <span className="label-text">Standard name</span>
              <input
                className="input input-bordered"
                disabled={!canWriteDefinitions || Boolean(pendingAction)}
                maxLength={200}
                aria-label="Standard name"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Company OS execution standard"
                value={draft.name}
              />
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Category</span>
              <input
                className="input input-bordered"
                disabled={!canWriteDefinitions || Boolean(pendingAction)}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                placeholder="operations"
                value={draft.category}
              />
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Status</span>
              <select
                className="select select-bordered"
                disabled={!canWriteDefinitions || Boolean(pendingAction)}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as StandardDefinitionDraft["status"] })}
                value={draft.status}
              >
                {["draft", "active", "paused", "archived", "retired", "deprecated"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Owner role</span>
              <select
                className="select select-bordered"
                disabled={!canWriteDefinitions || Boolean(pendingAction) || rolesState.status !== "ready"}
                onChange={(event) => setDraft({ ...draft, ownerRoleId: event.target.value })}
                value={draft.ownerRoleId}
              >
                <option value="">Unassigned</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name || role.id}</option>
                ))}
              </select>
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Checklist</span>
              <select
                className="select select-bordered"
                disabled={!canWriteDefinitions || Boolean(pendingAction) || checklistsState.status !== "ready"}
                onChange={(event) => setDraft({ ...draft, checklistId: event.target.value })}
                value={draft.checklistId}
              >
                <option value="">No checklist</option>
                {checklists.map((checklist) => (
                  <option key={checklist.id} value={checklist.id}>{checklist.name || checklist.id}</option>
                ))}
              </select>
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Description</span>
              <textarea
                className="textarea textarea-bordered min-h-24"
                disabled={!canWriteDefinitions || Boolean(pendingAction)}
                maxLength={2000}
                aria-label="Standard description"
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="What this standard governs"
                value={draft.description}
              />
            </label>

            <label className="form-control min-w-0">
              <span className="label-text">Validation method</span>
              <textarea
                className="textarea textarea-bordered min-h-24"
                disabled={!canWriteDefinitions || Boolean(pendingAction)}
                maxLength={2000}
                aria-label="Standard validation method"
                onChange={(event) => setDraft({ ...draft, validationMethod: event.target.value })}
                placeholder="Evidence expected before the standard is satisfied"
                value={draft.validationMethod}
              />
            </label>

            <button
              className="btn btn-primary"
              disabled={!canWriteDefinitions || Boolean(pendingAction) || !draft.name.trim() || !draft.category.trim()}
              type="submit"
            >
              <i className="ph-bold ph-floppy-disk" aria-hidden="true"></i>
              {pendingAction ? "Saving" : selectedStandard ? "Save standard" : "Create standard"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function CompanyOsAgentContextPanel({ onChanged }: { onChanged: () => void }) {
  const [contextState, reload] = useCompanyOsAgentContextState();
  const [actionState, setActionState] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [approvalDraft, setApprovalDraft] = useState({
    requestedForAction: "agent.proposed_action",
    resourceType: "company_os_action",
    riskLevel: "medium" as "low" | "medium" | "high" | "critical",
    reason: ""
  });
  const [stageDraft, setStageDraft] = useState<StageLifecycleDraft>({
    pipelineRunId: "",
    pipelineStageId: "",
    startApprovalId: "",
    stageRunId: "",
    blockReason: "Waiting for owner review.",
    blockApprovalId: "",
    criterionId: "",
    validationStatus: "passed",
    evidenceNote: "Verified from the Company OS cockpit.",
    completeApprovalId: "",
    outputSummary: "Stage completed from the Company OS cockpit."
  });
  const [automationDraft, setAutomationDraft] = useState<AutomationEvaluationDraft>({
    eventId: "",
    mode: "dry_run",
    ruleIds: "",
    idempotencyKey: "",
    reason: "Owner evaluated automation rules from the Company OS cockpit."
  });
  const [automationResult, setAutomationResult] = useState<CompanyOsAutomationEvaluation | null>(null);

  function refreshAgentContext() {
    reload();
    onChanged();
  }

  async function handleRequestApproval(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("request");
    setActionState(null);

    try {
      const approval = await requestCompanyOsApproval({
        requestedByType: "user",
        requestedForAction: approvalDraft.requestedForAction,
        resourceType: approvalDraft.resourceType,
        riskLevel: approvalDraft.riskLevel,
        inputPayload: {
          reason: approvalDraft.reason || "Owner requested approval from the Company OS cockpit."
        }
      });
      setActionState({
        tone: "success",
        title: "Approval requested",
        detail: `Approval ${approval.id} is now pending and has audit/event evidence.`
      });
      setApprovalDraft((current) => ({ ...current, reason: "" }));
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Approval request failed",
        detail: error instanceof Error ? error.message : "CompanyCore could not create the approval request."
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleDecision(approval: CompanyOsRecord, decision: "approved" | "rejected") {
    setPendingAction(`${decision}-${approval.id}`);
    setActionState(null);

    try {
      await decideCompanyOsApproval(approval.id, {
        decision,
        decisionReason: decision === "approved"
          ? "Approved from the Company OS cockpit."
          : "Rejected from the Company OS cockpit."
      });
      setActionState({
        tone: decision === "approved" ? "success" : "warning",
        title: decision === "approved" ? "Approval approved" : "Approval rejected",
        detail: `${recordTitle(approval)} was ${decision}. Event and audit evidence were recorded.`
      });
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Approval decision failed",
        detail: error instanceof Error ? error.message : "CompanyCore could not decide the approval."
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleStartStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextState.status !== "ready") {
      return;
    }

    const selectedPipelineRunId = stageDraft.pipelineRunId || contextState.context.pipelineRuns[0]?.id || "";
    const selectedPipelineStageId = stageDraft.pipelineStageId || contextState.context.pipelineStages[0]?.id || "";
    if (!selectedPipelineRunId || !selectedPipelineStageId) {
      setActionState({
        tone: "warning",
        title: "Stage start needs a run and stage",
        detail: "Create or select a pipeline run and pipeline stage before starting stage execution."
      });
      return;
    }

    setPendingAction("stage-start");
    setActionState(null);
    try {
      const stageRun = await startCompanyOsStage(selectedPipelineRunId, {
        pipelineStageId: selectedPipelineStageId,
        approvalId: stageDraft.startApprovalId || undefined,
        inputPayload: {
          source: "company_os_cockpit"
        }
      });
      setStageDraft((current) => ({ ...current, stageRunId: stageRun.id }));
      setActionState({
        tone: "success",
        title: "Stage started",
        detail: `${recordTitle(stageRun)} is running. Event and audit evidence were recorded.`
      });
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Stage start failed",
        detail: stageActionMessage(error, "CompanyCore could not start the selected stage.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleBlockStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextState.status !== "ready") {
      return;
    }

    const selectedStageRunId = stageDraft.stageRunId || contextState.context.stageRuns[0]?.id || "";
    if (!selectedStageRunId) {
      setActionState({
        tone: "warning",
        title: "Block needs a stage run",
        detail: "Select a stage run before blocking execution."
      });
      return;
    }

    setPendingAction("stage-block");
    setActionState(null);
    try {
      const stageRun = await blockCompanyOsStage(selectedStageRunId, {
        reason: stageDraft.blockReason,
        approvalId: stageDraft.blockApprovalId || undefined,
        errorState: {
          reason: stageDraft.blockReason,
          source: "company_os_cockpit"
        }
      });
      setActionState({
        tone: "warning",
        title: "Stage blocked",
        detail: `${recordTitle(stageRun)} is blocked. The parent run and audit trail were updated.`
      });
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Stage block failed",
        detail: stageActionMessage(error, "CompanyCore could not block the selected stage run.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleValidateStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextState.status !== "ready") {
      return;
    }

    const selectedStageRunId = stageDraft.stageRunId || contextState.context.stageRuns[0]?.id || "";
    if (!selectedStageRunId) {
      setActionState({
        tone: "warning",
        title: "Validation needs a stage run",
        detail: "Select a stage run before recording validation evidence."
      });
      return;
    }

    setPendingAction("stage-validate");
    setActionState(null);
    try {
      const acceptanceCriteria = stageDraft.criterionId
        ? [{
          id: stageDraft.criterionId,
          validationStatus: stageDraft.validationStatus,
          evidence: {
            note: stageDraft.evidenceNote,
            source: "company_os_cockpit"
          }
        }]
        : [];
      const stageRun = await validateCompanyOsStage(selectedStageRunId, {
        validationStatus: stageDraft.validationStatus,
        validationResult: {
          summary: stageDraft.evidenceNote,
          source: "company_os_cockpit"
        },
        acceptanceCriteria
      });
      setActionState({
        tone: stageDraft.validationStatus === "failed" ? "warning" : "success",
        title: "Stage validation recorded",
        detail: `${recordTitle(stageRun)} now has validation evidence.`
      });
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Stage validation failed",
        detail: stageActionMessage(error, "CompanyCore could not validate the selected stage run.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleCompleteStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextState.status !== "ready") {
      return;
    }

    const selectedStageRunId = stageDraft.stageRunId || contextState.context.stageRuns[0]?.id || "";
    if (!selectedStageRunId) {
      setActionState({
        tone: "warning",
        title: "Completion needs a stage run",
        detail: "Select a stage run before completing execution."
      });
      return;
    }

    setPendingAction("stage-complete");
    setActionState(null);
    try {
      const stageRun = await completeCompanyOsStage(selectedStageRunId, {
        approvalId: stageDraft.completeApprovalId || undefined,
        outputPayload: {
          summary: stageDraft.outputSummary,
          source: "company_os_cockpit"
        },
        validationResult: {
          summary: stageDraft.outputSummary,
          source: "company_os_cockpit"
        }
      });
      setActionState({
        tone: "success",
        title: "Stage completed",
        detail: `${recordTitle(stageRun)} is complete. Event and audit evidence were recorded.`
      });
      refreshAgentContext();
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Stage completion failed",
        detail: stageActionMessage(error, "CompanyCore could not complete the selected stage run.")
      });
    } finally {
      setPendingAction("");
    }
  }

  async function handleEvaluateAutomation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contextState.status !== "ready") {
      return;
    }

    const selectedEventId = automationDraft.eventId || contextState.context.events[0]?.id || "";
    if (!selectedEventId) {
      setActionState({
        tone: "warning",
        title: "Automation needs an event",
        detail: "Select a recent Company OS event before evaluating automation rules."
      });
      return;
    }

    setPendingAction(`automation-${automationDraft.mode}`);
    setActionState(null);
    setAutomationResult(null);
    try {
      const ruleIds = automationDraft.ruleIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const result = await evaluateCompanyOsAutomationRules(selectedEventId, {
        mode: automationDraft.mode,
        ruleIds: ruleIds.length > 0 ? ruleIds : undefined,
        idempotencyKey: automationDraft.idempotencyKey || undefined,
        context: {
          reason: automationDraft.reason,
          source: "company_os_cockpit"
        }
      });
      setAutomationResult(result);
      setActionState({
        tone: automationDraft.mode === "execute" ? "success" : "info",
        title: automationDraft.mode === "execute" ? "Automation evaluated and executed" : "Automation dry run complete",
        detail: `${result.matchedRuleIds.length} rule${result.matchedRuleIds.length === 1 ? "" : "s"} matched, ${result.proposals.length} proposal${result.proposals.length === 1 ? "" : "s"} returned, ${result.executed.length} action${result.executed.length === 1 ? "" : "s"} executed.`
      });
    } catch (error) {
      setActionState({
        tone: "error",
        title: "Automation evaluation failed",
        detail: stageActionMessage(error, "CompanyCore could not evaluate automation rules for the selected event.")
      });
    } finally {
      setPendingAction("");
    }
  }

  if (contextState.status === "signed-out") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice tone="warning" title="Agent context requires owner session" detail="Sign in again to load the agent operating context." />
        </div>
      </section>
    );
  }

  if (contextState.status === "loading") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice tone="info" title="Loading agent context" detail="CompanyCore is reading tasks, pipelines, procedures, tools, policies, acceptance criteria, and approvals." />
        </div>
      </section>
    );
  }

  if (contextState.status === "error") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <LocalNotice tone="error" title="Agent context could not load" detail={contextState.message} />
          <button className="btn btn-primary btn-sm w-fit" type="button" onClick={reload}>Retry agent context</button>
        </div>
      </section>
    );
  }

  const context: CompanyOsAgentContext = contextState.context;
  const pendingApprovals = context.approvals.filter((approval) => approval.status === "pending");
  const approvedApprovals = context.approvals.filter((approval) => approval.status === "approved");
  const pendingApprovalCount = pendingApprovals.length;
  const riskyPolicyCount = context.policies.filter((policy) => policy.enforcementMode === "block" || policy.enforcementMode === "require_approval").length;
  const activeAutomationRules = context.automationRules.filter((rule) => rule.status === "active");
  const commandQueue = agentCommandQueue(context);
  const selectedPipelineRun = context.pipelineRuns.find((run) => run.id === stageDraft.pipelineRunId) || context.pipelineRuns[0];
  const selectedPipelineStage = context.pipelineStages.find((stage) => stage.id === stageDraft.pipelineStageId) || context.pipelineStages[0];
  const selectedStageRunId = stageDraft.stageRunId || context.stageRuns[0]?.id || "";
  const selectedStageRun = context.stageRuns.find((run) => run.id === selectedStageRunId);
  const selectedStageRunCriteria = context.acceptanceCriteria.filter((criterion) => (
    !selectedStageRunId
    || criterion.stageRunId === selectedStageRunId
    || criterion.targetId === selectedStageRunId
  ));
  const selectedEvent = context.events.find((companyEvent) => companyEvent.id === automationDraft.eventId) || context.events[0];
  const selectedRuleIds = automationDraft.ruleIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedAutomationRules = selectedRuleIds.length > 0
    ? context.automationRules.filter((rule) => selectedRuleIds.includes(rule.id))
    : activeAutomationRules;
  const approvalPreview: CommandPreview = {
    eyebrow: "Approval impact preview",
    title: "Approval request and decision context",
    tone: approvalDraft.riskLevel === "critical" || approvalDraft.riskLevel === "high" ? "warning" : "info",
    items: [
      { label: "Action", value: approvalDraft.requestedForAction || "No action selected" },
      { label: "Resource", value: approvalDraft.resourceType || "No resource type selected" },
      { label: "Risk", value: approvalDraft.riskLevel },
      { label: "Pending", value: `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"}` }
    ],
    expectedResult: "Requesting approval creates a pending approval and records event/audit evidence. Approve or reject uses the audited decision route.",
    recovery: "If the request is wrong, reject it from Pending decisions and create a corrected approval with a clearer action, resource, and reason."
  };
  const stagePreview: CommandPreview = {
    eyebrow: "Stage command preview",
    title: "Lifecycle prerequisites and expected effect",
    tone: selectedStageRun?.status === "blocked" || selectedStageRun?.status === "failed" ? "warning" : "info",
    items: [
      { label: "Pipeline run", value: selectedPipelineRun ? recordTitle(selectedPipelineRun) : "No pipeline run loaded" },
      { label: "Stage", value: selectedPipelineStage ? recordTitle(selectedPipelineStage) : "No pipeline stage loaded" },
      { label: "Stage run", value: selectedStageRun ? `${recordTitle(selectedStageRun)} (${selectedStageRun.status || "unknown"})` : "No stage run selected" },
      { label: "Criteria", value: `${selectedStageRunCriteria.length} loaded for selected stage run` }
    ],
    expectedResult: "Start creates or reuses a stage run, block records error state, validate stores acceptance evidence, and complete closes only when backend transition gates pass.",
    recovery: "If a command returns invalid transition or missing criteria, validate required acceptance evidence, use an approved approval reference, or block the stage with a clear reason."
  };
  const automationPreview: CommandPreview = {
    eyebrow: "Proposal effect preview",
    title: "Automation dry-run and execution context",
    tone: automationDraft.mode === "execute" ? "warning" : "info",
    items: [
      { label: "Event", value: selectedEvent ? recordTitle(selectedEvent) : "No event loaded" },
      { label: "Mode", value: automationDraft.mode },
      { label: "Rules", value: selectedRuleIds.length > 0 ? `${selectedRuleIds.length} selected by ID` : `${selectedAutomationRules.length} active rules considered` },
      { label: "Idempotency", value: automationDraft.idempotencyKey || "No key entered" }
    ],
    expectedResult: automationDraft.mode === "execute"
      ? "Execute evaluates matching rules, performs supported actions through command services, and records proposal plus audit evidence."
      : "Dry run evaluates matching rules and returns proposed actions without executing lifecycle or approval side effects.",
    recovery: "Use dry_run first for uncertain events. For execute, provide a stable idempotency key so repeated owner actions do not duplicate work."
  };

  const tasks = context.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    detail: taskDetail(task),
    badge: task.status || task.priority
  }));
  const pipelines = context.pipelines.map((record) => ({
    id: record.id,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    badge: record.status
  }));
  const procedures = context.procedures.map((record) => ({
    id: record.id,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    badge: record.status
  }));
  const tools = context.toolAdapters.map((record) => ({
    id: record.id,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    badge: record.healthStatus || record.connectionStatus
  }));
  const policies = context.policies.map((record) => ({
    id: record.id,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    badge: record.enforcementMode || record.severity
  }));
  const acceptanceCriteria = context.acceptanceCriteria.map((record) => ({
    id: record.id,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    badge: record.validationStatus || record.status
  }));

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Agent context</p>
            <h2 className="text-xl font-black">What an agent can safely see next</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-company-muted">
              Operating packet for MCP-style agents: current work, workflow definitions, procedures, tools, guardrails, acceptance checks, approvals, and audited stage actions.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={reload}>Refresh context</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="ph-list-checks" label="Tasks visible" value={`${context.tasks.length}`} detail="Current work queue exposed through API" />
          <MetricCard icon="ph-flow-arrow" label="Pipelines" value={`${context.pipelines.length}`} detail="Workflow definitions available" />
          <MetricCard icon="ph-shield-warning" label="Guardrails" value={`${riskyPolicyCount}`} detail="Blocking or approval policies" />
          <MetricCard icon="ph-stamp" label="Pending approvals" value={`${pendingApprovalCount}`} detail="Human review pressure" />
          <MetricCard icon="ph-lightning" label="Automation rules" value={`${activeAutomationRules.length}`} detail="Active event-driven rules" />
        </div>

        <AgentCommandQueue items={commandQueue} />

        <div className="grid gap-3 xl:grid-cols-3">
          <CommandPreviewCard preview={approvalPreview} />
          <CommandPreviewCard preview={stagePreview} />
          <CommandPreviewCard preview={automationPreview} />
        </div>

        <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="eyebrow">Stage lifecycle</p>
              <h3 className="text-base font-black">Execution controls</h3>
            </div>
            <span className="badge badge-outline">{context.stageRuns.length} stage runs</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-4">
            <form className="grid gap-3 rounded-company border border-base-300 bg-base-100 p-3" onSubmit={handleStartStage}>
              <h4 className="text-sm font-black">Start</h4>
              <label className="form-control">
                <span className="label-text text-xs font-black">Pipeline run</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.pipelineRunId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, pipelineRunId: event.target.value }))}
                >
                  <option value="">Latest run</option>
                  {context.pipelineRuns.map((run) => (
                    <option value={run.id} key={run.id}>{recordTitle(run)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Stage</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.pipelineStageId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, pipelineStageId: event.target.value }))}
                >
                  <option value="">First available stage</option>
                  {context.pipelineStages.map((stage) => (
                    <option value={stage.id} key={stage.id}>{recordTitle(stage)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Approval</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.startApprovalId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, startApprovalId: event.target.value }))}
                >
                  <option value="">No approval reference</option>
                  {approvedApprovals.map((approval) => (
                    <option value={approval.id} key={approval.id}>{recordTitle(approval)}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary btn-sm" type="submit" disabled={Boolean(pendingAction)}>
                {pendingAction === "stage-start" ? "Starting" : "Start stage"}
              </button>
            </form>

            <form className="grid gap-3 rounded-company border border-base-300 bg-base-100 p-3" onSubmit={handleBlockStage}>
              <h4 className="text-sm font-black">Block</h4>
              <label className="form-control">
                <span className="label-text text-xs font-black">Stage run</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.stageRunId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, stageRunId: event.target.value }))}
                >
                  <option value="">Latest stage run</option>
                  {context.stageRuns.map((run) => (
                    <option value={run.id} key={run.id}>{recordTitle(run)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Reason</span>
                <textarea
                  className="textarea textarea-bordered min-h-20"
                  aria-label="Stage block reason"
                  value={stageDraft.blockReason}
                  onChange={(event) => setStageDraft((current) => ({ ...current, blockReason: event.target.value }))}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Approval</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.blockApprovalId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, blockApprovalId: event.target.value }))}
                >
                  <option value="">No approval reference</option>
                  {approvedApprovals.map((approval) => (
                    <option value={approval.id} key={approval.id}>{recordTitle(approval)}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-warning btn-sm" type="submit" disabled={Boolean(pendingAction)}>
                {pendingAction === "stage-block" ? "Blocking" : "Block stage"}
              </button>
            </form>

            <form className="grid gap-3 rounded-company border border-base-300 bg-base-100 p-3" onSubmit={handleValidateStage}>
              <h4 className="text-sm font-black">Validate</h4>
              <label className="form-control">
                <span className="label-text text-xs font-black">Stage run</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.stageRunId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, stageRunId: event.target.value }))}
                >
                  <option value="">Latest stage run</option>
                  {context.stageRuns.map((run) => (
                    <option value={run.id} key={run.id}>{recordTitle(run)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Criterion</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.criterionId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, criterionId: event.target.value }))}
                >
                  <option value="">Stage validation only</option>
                  {selectedStageRunCriteria.map((criterion) => (
                    <option value={criterion.id} key={criterion.id}>{recordTitle(criterion)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Status</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.validationStatus}
                  onChange={(event) => setStageDraft((current) => ({
                    ...current,
                    validationStatus: event.target.value as "passed" | "failed" | "waived"
                  }))}
                >
                  <option value="passed">passed</option>
                  <option value="failed">failed</option>
                  <option value="waived">waived</option>
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Evidence</span>
                <textarea
                  className="textarea textarea-bordered min-h-20"
                  aria-label="Stage validation evidence"
                  value={stageDraft.evidenceNote}
                  onChange={(event) => setStageDraft((current) => ({ ...current, evidenceNote: event.target.value }))}
                />
              </label>
              <button className="btn btn-success btn-sm" type="submit" disabled={Boolean(pendingAction)}>
                {pendingAction === "stage-validate" ? "Validating" : "Validate stage"}
              </button>
            </form>

            <form className="grid gap-3 rounded-company border border-base-300 bg-base-100 p-3" onSubmit={handleCompleteStage}>
              <h4 className="text-sm font-black">Complete</h4>
              <label className="form-control">
                <span className="label-text text-xs font-black">Stage run</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.stageRunId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, stageRunId: event.target.value }))}
                >
                  <option value="">Latest stage run</option>
                  {context.stageRuns.map((run) => (
                    <option value={run.id} key={run.id}>{recordTitle(run)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Approval</span>
                <select
                  className="select select-bordered select-sm"
                  value={stageDraft.completeApprovalId}
                  onChange={(event) => setStageDraft((current) => ({ ...current, completeApprovalId: event.target.value }))}
                >
                  <option value="">No approval reference</option>
                  {approvedApprovals.map((approval) => (
                    <option value={approval.id} key={approval.id}>{recordTitle(approval)}</option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Output</span>
                <textarea
                  className="textarea textarea-bordered min-h-20"
                  aria-label="Stage completion summary"
                  value={stageDraft.outputSummary}
                  onChange={(event) => setStageDraft((current) => ({ ...current, outputSummary: event.target.value }))}
                />
              </label>
              <button className="btn btn-primary btn-sm" type="submit" disabled={Boolean(pendingAction)}>
                {pendingAction === "stage-complete" ? "Completing" : "Complete stage"}
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="eyebrow">Automation evaluator</p>
              <h3 className="text-base font-black">Evaluate event-driven rules</h3>
              <p className="mt-1 text-xs leading-5 text-company-muted">
                Run the audited automation evaluator against a recent Company OS event. Dry run returns proposals; execute records event and audit evidence through the backend command route.
              </p>
            </div>
            <span className="badge badge-outline">{context.events.length} events</span>
          </div>
          <form className="grid gap-3 xl:grid-cols-[1.2fr_0.7fr_1fr_1fr_auto]" onSubmit={handleEvaluateAutomation}>
            <label className="form-control">
              <span className="label-text text-xs font-black">Source event</span>
              <select
                className="select select-bordered select-sm"
                value={automationDraft.eventId}
                onChange={(event) => setAutomationDraft((current) => ({ ...current, eventId: event.target.value }))}
              >
                <option value="">Latest event</option>
                {context.events.map((companyEvent) => (
                  <option value={companyEvent.id} key={companyEvent.id}>{recordTitle(companyEvent)}</option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="label-text text-xs font-black">Mode</span>
              <select
                className="select select-bordered select-sm"
                value={automationDraft.mode}
                onChange={(event) => setAutomationDraft((current) => ({
                  ...current,
                  mode: event.target.value as "dry_run" | "execute"
                }))}
              >
                <option value="dry_run">dry_run</option>
                <option value="execute">execute</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label-text text-xs font-black">Rule IDs</span>
              <input
                className="input input-bordered input-sm"
                aria-label="Automation rule IDs"
                placeholder="Optional, comma-separated"
                value={automationDraft.ruleIds}
                onChange={(event) => setAutomationDraft((current) => ({ ...current, ruleIds: event.target.value }))}
              />
            </label>
            <label className="form-control">
              <span className="label-text text-xs font-black">Idempotency key</span>
              <input
                className="input input-bordered input-sm"
                aria-label="Automation idempotency key"
                placeholder="Optional for execute"
                value={automationDraft.idempotencyKey}
                onChange={(event) => setAutomationDraft((current) => ({ ...current, idempotencyKey: event.target.value }))}
              />
            </label>
            <button className="btn btn-primary btn-sm self-end" type="submit" disabled={Boolean(pendingAction)}>
              {pendingAction.startsWith("automation-") ? "Evaluating" : "Evaluate"}
            </button>
            <label className="form-control xl:col-span-5">
              <span className="label-text text-xs font-black">Context reason</span>
              <textarea
                className="textarea textarea-bordered min-h-20"
                aria-label="Automation evaluation reason"
                value={automationDraft.reason}
                onChange={(event) => setAutomationDraft((current) => ({ ...current, reason: event.target.value }))}
              />
            </label>
          </form>
          {automationResult ? (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <MetricCard icon="ph-funnel" label="Matched" value={`${automationResult.matchedRuleIds.length}`} detail="Rule matches" />
                <MetricCard icon="ph-lightning" label="Proposals" value={`${automationResult.proposals.length}`} detail="Actions proposed" />
                <MetricCard icon="ph-play-circle" label="Executed" value={`${automationResult.executed.length}`} detail="Actions executed" />
                <MetricCard icon="ph-archive" label="Audit logs" value={`${automationResult.auditLogIds.length}`} detail="Evidence records" />
              </div>
              <div className="rounded-lg border border-base-300 bg-base-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow">Proposal effect preview</p>
                    <h4 className="text-sm font-black">Returned automation actions</h4>
                  </div>
                  <span className="badge badge-outline">{automationResult.mode}</span>
                </div>
                {automationResult.proposals.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {automationResult.proposals.slice(0, 4).map((proposal) => (
                      <article className="rounded-lg border border-base-300 bg-base-200/40 p-3" key={`${proposal.ruleId}-${proposal.actionKind}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <strong className="text-sm">{proposal.ruleName}</strong>
                          <span className="badge badge-outline">{proposal.actionKind}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-company-muted">
                          Risk {proposal.riskLevel}; {proposal.requiresApproval ? "requires approval before autonomous execution" : "can execute within current command policy"}.
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-company-muted">No automation proposals were returned for the selected event and rule filter.</p>
                )}
                {automationResult.auditLogIds.length > 0 || automationResult.emittedEventIds.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-company-muted">
                    Evidence target: {automationResult.auditLogIds.length} audit log{automationResult.auditLogIds.length === 1 ? "" : "s"} and {automationResult.emittedEventIds.length} emitted event{automationResult.emittedEventIds.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {automationResult?.skipped.length ? (
            <p className="mt-3 text-xs leading-5 text-company-muted">
              {automationResult.skipped.length} automation action{automationResult.skipped.length === 1 ? "" : "s"} skipped or already processed.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <AgentContextList title="Tasks" records={tasks} emptyLabel="No tasks are currently visible to the agent context." />
          <AgentContextList title="Active pipelines" records={pipelines} emptyLabel="No pipelines are currently available." />
          <AgentContextList title="Procedures" records={procedures} emptyLabel="No procedures are currently available." />
          <AgentContextList title="Tools" records={tools} emptyLabel="No tool adapters are currently available." />
          <AgentContextList title="Policies" records={policies} emptyLabel="No policies are currently available." />
          <AgentContextList title="Acceptance criteria" records={acceptanceCriteria} emptyLabel="No acceptance criteria are currently available." />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <form className="rounded-company border border-base-300 bg-base-200/45 p-4" onSubmit={handleRequestApproval}>
            <div className="mb-4">
              <p className="eyebrow">Approval impact preview</p>
              <h3 className="text-sm font-black">Request approval</h3>
              <p className="mt-1 text-xs leading-5 text-company-muted">
                Create a pending approval through the lifecycle command route. The backend records event and audit evidence.
              </p>
            </div>
            <div className="grid gap-3">
              <label className="form-control">
                <span className="label-text text-xs font-black">Action</span>
                <input
                  className="input input-bordered input-sm"
                  required
                  aria-label="Approval requested action"
                  value={approvalDraft.requestedForAction}
                  onChange={(event) => setApprovalDraft((current) => ({ ...current, requestedForAction: event.target.value }))}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Resource type</span>
                <input
                  className="input input-bordered input-sm"
                  required
                  aria-label="Approval resource type"
                  value={approvalDraft.resourceType}
                  onChange={(event) => setApprovalDraft((current) => ({ ...current, resourceType: event.target.value }))}
                />
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Risk</span>
                <select
                  className="select select-bordered select-sm"
                  value={approvalDraft.riskLevel}
                  onChange={(event) => setApprovalDraft((current) => ({
                    ...current,
                    riskLevel: event.target.value as "low" | "medium" | "high" | "critical"
                  }))}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="form-control">
                <span className="label-text text-xs font-black">Reason</span>
              <textarea
                className="textarea textarea-bordered min-h-24"
                aria-label="Approval request reason"
                value={approvalDraft.reason}
                onChange={(event) => setApprovalDraft((current) => ({ ...current, reason: event.target.value }))}
              />
              </label>
              <button className="btn btn-primary btn-sm w-fit" type="submit" disabled={pendingAction === "request"}>
                {pendingAction === "request" ? "Requesting" : "Request approval"}
              </button>
            </div>
          </form>

          <div className="rounded-company border border-base-300 bg-base-200/45 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">Pending decisions</h3>
                <p className="mt-1 text-xs leading-5 text-company-muted">
                  Decide pending approvals through the audited decision route.
                </p>
              </div>
              <span className="badge badge-outline">{pendingApprovals.length}</span>
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm leading-6 text-company-muted">No pending approvals are currently awaiting owner decision.</p>
            ) : (
              <div className="grid gap-3">
                {pendingApprovals.slice(0, 4).map((approval) => (
                  <article className="rounded-company border border-base-300 bg-base-100 p-3" key={approval.id}>
                    <strong className="block break-words text-sm">{recordTitle(approval)}</strong>
                    <p className="mt-1 text-xs leading-5 text-company-muted">{recordDetail(approval)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="btn btn-success btn-xs"
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={() => handleDecision(approval, "approved")}
                      >
                        {pendingAction === `approved-${approval.id}` ? "Approving" : "Approve"}
                      </button>
                      <button
                        className="btn btn-warning btn-xs"
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={() => handleDecision(approval, "rejected")}
                      >
                        {pendingAction === `rejected-${approval.id}` ? "Rejecting" : "Reject"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {actionState ? (
          <LocalNotice tone={actionState.tone} title={actionState.title} detail={actionState.detail} />
        ) : null}

        {pendingApprovalCount > 0 ? (
          <LocalNotice
            tone="warning"
            title="Approval review is required"
            detail={`${pendingApprovalCount} pending approval${pendingApprovalCount === 1 ? "" : "s"} should be resolved before an agent performs high-risk actions.`}
          />
        ) : (
          <LocalNotice
            tone="success"
            title="No pending approval pressure"
            detail="The current agent packet has no pending approval queue, and write actions still use explicit lifecycle routes."
          />
        )}
      </div>
    </section>
  );
}

function CompanyOsRecentEvents({ events }: { events: CompanyOsRecord[] }) {
  const columns: Array<TableColumn<CompanyOsRecord>> = [
    {
      key: "event",
      header: "Event",
      cell: (event) => (
        <div>
          <strong className="block break-words">{recordTitle(event)}</strong>
          <span className="text-xs text-company-muted">{event.type || event.eventType || "event"}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (event) => event.status || "-"
    },
    {
      key: "created",
      header: "Created",
      cell: (event) => formatTaskDate(event.createdAt || event.timestamp)
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={events}
      emptyTitle="No recent Company OS events"
      emptyDetail="Events will appear here after pipelines, approvals, integrations, or agents produce activity."
    />
  );
}

function recordTime(record: CompanyOsRecord) {
  return record.createdAt || record.startedAt || record.completedAt || record.timestamp || "";
}

function correlationOptions(companyOs: CompanyOsData): CorrelationOption[] {
  const grouped = new Map<string, { count: number; latestAt: string; label: string }>();
  const evidence = [
    ...companyOs.recent.events,
    ...companyOs.recent.auditLogs
  ].filter((record) => Boolean(record.correlationId));

  for (const record of evidence) {
    const id = String(record.correlationId);
    const at = recordTime(record);
    const existing = grouped.get(id);
    grouped.set(id, {
      count: (existing?.count || 0) + 1,
      latestAt: !existing?.latestAt || at > existing.latestAt ? at : existing.latestAt,
      label: recordTitle(record)
    });
  }

  return [...grouped.entries()]
    .map(([id, value]) => ({
      id,
      label: value.label,
      count: value.count,
      latestAt: value.latestAt
    }))
    .sort((left, right) => right.latestAt.localeCompare(left.latestAt));
}

function timelineItems(companyOs: CompanyOsData, correlationId: string): CorrelationTimelineItem[] {
  const events = companyOs.recent.events
    .filter((record) => record.correlationId === correlationId)
    .map((record): CorrelationTimelineItem => ({
      id: `event-${record.id}`,
      kind: "event",
      title: recordTitle(record),
      detail: recordSupportingText(record),
      timestamp: recordTime(record),
      actor: record.actorType || "system",
      resource: [record.resourceType, record.resourceId].filter(Boolean).join(" / ") || "event",
      tone: "info",
      evidence: record.inputPayload || record.outputPayload || null
    }));
  const auditLogs = companyOs.recent.auditLogs
    .filter((record) => record.correlationId === correlationId)
    .map((record): CorrelationTimelineItem => ({
      id: `audit-${record.id}`,
      kind: "audit",
      title: record.action || recordTitle(record),
      detail: recordDetail(record),
      timestamp: recordTime(record),
      actor: record.actorType || "system",
      resource: [record.resourceType, record.resourceId].filter(Boolean).join(" / ") || "audit log",
      tone: record.approvalId ? "warning" : "success",
      evidence: record.outputPayload || record.inputPayload || null
    }));

  return [...events, ...auditLogs].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

function CompanyOsCorrelationTimeline({ companyOs }: { companyOs: CompanyOsData }) {
  const options = useMemo(() => correlationOptions(companyOs), [companyOs]);
  const [selectedCorrelationId, setSelectedCorrelationId] = useState("");
  const activeCorrelationId = options.some((option) => option.id === selectedCorrelationId)
    ? selectedCorrelationId
    : options[0]?.id || "";
  const items = useMemo(
    () => activeCorrelationId ? timelineItems(companyOs, activeCorrelationId) : [],
    [companyOs, activeCorrelationId]
  );
  const eventCount = items.filter((item) => item.kind === "event").length;
  const auditCount = items.filter((item) => item.kind === "audit").length;
  const latest = options.find((option) => option.id === activeCorrelationId)?.latestAt || "";

  if (options.length === 0) {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice
            tone="info"
            title="No correlation timeline yet"
            detail="Recent Company OS events and audit logs do not include a shared correlation ID in the current snapshot."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Correlation timeline</p>
            <h2 className="text-xl font-black">One evidence chain</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-company-muted">
              Select a correlation ID to see the related events and audit records in execution order.
            </p>
          </div>
          <select
            className="select select-bordered max-w-full"
            value={activeCorrelationId}
            onChange={(event) => setSelectedCorrelationId(event.target.value)}
            aria-label="Select Company OS correlation ID"
          >
            {options.map((option) => (
              <option value={option.id} key={option.id}>
                {option.id} ({option.count})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard icon="ph-git-branch" label="Evidence" value={`${items.length}`} detail="Events plus audit logs" />
          <MetricCard icon="ph-bell-ringing" label="Events" value={`${eventCount}`} detail="Observable stream records" />
          <MetricCard icon="ph-clipboard-text" label="Audit logs" value={`${auditCount}`} detail={latest ? `Latest ${formatTaskDate(latest)}` : "Durable evidence"} />
        </div>

        <div className="grid gap-3">
          {items.map((item, index) => (
            <article className="rounded-company border border-base-300 bg-base-200/45 p-4" key={item.id}>
              <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-start">
                <span className={`dashboard-icon ${item.tone === "warning" ? "text-warning" : item.tone === "success" ? "text-success" : "text-info"}`}>
                  <i className={`ph-bold ${item.kind === "audit" ? "ph-clipboard-text" : "ph-bell-ringing"}`} aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-outline">#{index + 1}</span>
                    <span className="badge badge-outline">{item.kind}</span>
                    <span className="badge badge-outline">{item.actor}</span>
                  </div>
                  <h3 className="mt-2 break-words text-base font-black">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-company-muted">{item.detail}</p>
                  <p className="mt-2 break-words text-xs font-bold text-base-content">{item.resource}</p>
                </div>
                <span className="text-xs font-bold text-company-muted">{formatTaskDate(item.timestamp)}</span>
              </div>
              {item.evidence ? (
                <details className="mt-3 rounded-company border border-base-300 bg-base-100">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-black">Evidence payload</summary>
                  <pre className="max-h-72 overflow-auto border-t border-base-300 bg-neutral p-3 text-xs leading-5 text-neutral-content">{jsonPreview(item.evidence)}</pre>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompanyOsRecordDetailPanel({
  collection,
  recordId,
  onClear
}: {
  collection: CompanyOsCollectionName;
  recordId: string;
  onClear: () => void;
}) {
  const [detailState, reload] = useCompanyOsRecordDetailState(collection, recordId);

  if (detailState.status === "idle") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice
            tone="info"
            title="Select a Company OS record"
            detail="Choose a row from the active collection to inspect its owner, status, relationships, and raw API evidence."
          />
        </div>
      </section>
    );
  }

  if (detailState.status === "signed-out") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice tone="warning" title="Owner session required" detail="Sign in again to inspect Company OS record details." />
        </div>
      </section>
    );
  }

  if (detailState.status === "loading") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <LocalNotice tone="info" title="Loading record detail" detail={`CompanyCore is reading the selected ${collection} record.`} />
        </div>
      </section>
    );
  }

  if (detailState.status === "error") {
    return (
      <section className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <LocalNotice tone="error" title="Record detail could not load" detail={detailState.message} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" type="button" onClick={reload}>Retry detail</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClear}>Clear selection</button>
          </div>
        </div>
      </section>
    );
  }

  const record = detailState.record;
  const rows = recordDetailRows(record);

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Selected record</p>
            <h2 className="break-words text-xl font-black">{recordTitle(record)}</h2>
            <p className="mt-1 text-sm leading-6 text-company-muted">{recordDetail(record)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-outline">{collection}</span>
            <button className="btn btn-ghost btn-sm" type="button" onClick={reload}>Refresh detail</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClear}>Clear</button>
          </div>
        </div>

        {rows.length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(([label, value]) => (
              <div className="rounded-company border border-base-300 bg-base-200/45 p-3" key={label}>
                <dt className="text-xs font-black uppercase tracking-wide text-company-muted">{label}</dt>
                <dd className="mt-1 break-words text-sm font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <details className="rounded-company border border-base-300 bg-base-200/45">
          <summary className="cursor-pointer px-4 py-3 text-sm font-black">Raw API evidence</summary>
          <pre className="max-h-96 overflow-auto border-t border-base-300 bg-neutral p-4 text-xs leading-5 text-neutral-content">{jsonPreview(record)}</pre>
        </details>
      </div>
    </section>
  );
}

function CompanyOsCollectionDrilldown({
  activeCollection,
  companyOs,
  onSelect,
  onSelectRecord,
  selectedRecordId
}: {
  activeCollection: CompanyOsCollectionName;
  companyOs: CompanyOsData;
  onSelect: (collection: CompanyOsCollectionName) => void;
  onSelectRecord: (recordId: string) => void;
  selectedRecordId: string;
}) {
  const [collectionState, reload] = useCompanyOsCollectionState(activeCollection);
  const activeDrilldown = companyOsDrilldowns.find((item) => item.id === activeCollection) || companyOsDrilldowns[0]!;
  const records = collectionState.status === "ready" ? collectionState.records : [];
  const columns: Array<TableColumn<CompanyOsRecord>> = [
    {
      key: "name",
      header: activeDrilldown.label,
      cell: (record) => (
        <div className="max-w-[26rem]">
          <strong className="block break-words">{recordTitle(record)}</strong>
          <span className="text-xs leading-5 text-company-muted">{recordSupportingText(record)}</span>
        </div>
      )
    },
    {
      key: "state",
      header: "State",
      cell: (record) => (
        <span className={record.status === "active" || record.status === "approved" ? "badge badge-success" : "badge badge-outline"}>
          {record.status || record.healthStatus || record.connectionStatus || record.riskLevel || "-"}
        </span>
      )
    },
    {
      key: "detail",
      header: "Context",
      cell: (record) => recordDetail(record)
    },
    {
      key: "updated",
      header: "Date",
      cell: (record) => formatTaskDate(record.createdAt || record.startedAt || record.timestamp)
    },
    {
      key: "action",
      header: "Detail",
      cell: (record) => (
        <button
          className={record.id === selectedRecordId ? "btn btn-primary btn-xs" : "btn btn-outline btn-xs"}
          type="button"
          aria-label={`${record.id === selectedRecordId ? "Selected" : "Open"} ${recordTitle(record)}`}
          onClick={() => onSelectRecord(record.id)}
        >
          {record.id === selectedRecordId ? "Selected" : "Open"}
        </button>
      )
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Collection drill-down</p>
            <h2 className="text-xl font-black">Company OS records</h2>
            <p className="mt-1 text-sm leading-6 text-company-muted">
              Read-only collection previews from `/v1/company-os/:collection`. Write workflows stay closed until lifecycle routes and approvals are explicit.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={reload}>Refresh collection</button>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          {companyOsDrilldowns.map((drilldown) => {
            const selected = drilldown.id === activeCollection;
            return (
              <button
                className={selected ? "btn btn-primary h-auto justify-start p-3 text-left" : "btn btn-outline h-auto justify-start p-3 text-left"}
                key={drilldown.id}
                type="button"
                onClick={() => onSelect(drilldown.id)}
              >
                <span className="flex min-w-0 items-start gap-2">
                  <i className={`ph-bold ${drilldown.icon} mt-0.5 text-lg`} aria-hidden="true"></i>
                  <span className="min-w-0">
                    <span className="block font-black">{drilldown.label}</span>
                    <span className="block text-xs opacity-80">{collectionCount(companyOs, drilldown)} records</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {collectionState.status === "loading" ? (
          <LocalNotice tone="info" title={`Loading ${activeDrilldown.label.toLowerCase()}`} detail={activeDrilldown.detail} />
        ) : collectionState.status === "error" ? (
          <LocalNotice tone="error" title={`${activeDrilldown.label} could not load`} detail={collectionState.message} />
        ) : collectionState.status === "signed-out" ? (
          <LocalNotice tone="warning" title="Owner session required" detail="Sign in again to load Company OS collection records." />
        ) : (
          <DataTable
            columns={columns}
            rows={records}
            emptyTitle={`No ${activeDrilldown.label.toLowerCase()} found`}
            emptyDetail={activeDrilldown.detail}
          />
        )}
      </div>
    </section>
  );
}

function graphRelation(record: CompanyOsRecord) {
  const relations = [
    record.relatedProcess?.name ? `process: ${record.relatedProcess.name}` : "",
    record.process?.name ? `process: ${record.process.name}` : "",
    record.pipeline?.name ? `pipeline: ${record.pipeline.name}` : "",
    record.currentStage?.name ? `stage: ${record.currentStage.name}` : "",
    record.externalProvider ? `provider: ${record.externalProvider}` : "",
    record.resourceType ? `resource: ${record.resourceType}` : "",
    record.correlationId ? `correlation: ${record.correlationId}` : ""
  ].filter(Boolean);
  return relations[0] || "workspace";
}

function graphNodes(context: CompanyOsAgentContext): OperatingGraphNode[] {
  const resources = context.resources.slice(0, 4).map((record): OperatingGraphNode => ({
    id: `resource-${record.id}`,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    group: "resource",
    badge: record.externalProvider || record.type || "resource",
    relation: graphRelation(record),
    tone: record.externalProvider ? "info" : "success"
  }));

  const policies = context.policies.slice(0, 3).map((record): OperatingGraphNode => ({
    id: `policy-${record.id}`,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    group: "policy",
    badge: record.enforcementMode || record.ruleType || "policy",
    relation: graphRelation(record),
    tone: record.enforcementMode === "block" || record.enforcementMode === "require_approval" ? "warning" : "info"
  }));

  const risks = context.risks.slice(0, 3).map((record): OperatingGraphNode => ({
    id: `risk-${record.id}`,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    group: "risk",
    badge: record.riskLevel || "risk",
    relation: graphRelation(record),
    tone: record.riskLevel === "critical" || record.riskLevel === "high" ? "error" : "warning"
  }));

  const automation = context.automationRules.slice(0, 3).map((record): OperatingGraphNode => ({
    id: `automation-${record.id}`,
    title: recordTitle(record),
    detail: recordSupportingText(record),
    group: "automation",
    badge: record.status || "automation",
    relation: graphRelation(record),
    tone: record.status === "active" ? "success" : "info"
  }));

  const runs = [...context.pipelineRuns, ...context.stageRuns].slice(0, 5).map((record): OperatingGraphNode => ({
    id: `run-${record.id}`,
    title: recordTitle(record),
    detail: recordDetail(record),
    group: "run",
    badge: record.status || "runtime",
    relation: graphRelation(record),
    tone: record.status === "failed" || record.status === "blocked" ? "error" : "info"
  }));

  return [...resources, ...policies, ...risks, ...automation, ...runs].slice(0, 14);
}

function nodeToneClass(tone: NoticeTone) {
  switch (tone) {
    case "success":
      return "border-success/30 bg-success/5";
    case "warning":
      return "border-warning/30 bg-warning/10";
    case "error":
      return "border-error/30 bg-error/10";
    default:
      return "border-info/25 bg-info/5";
  }
}

function CompanyOsOperatingGraphDetail({ connection }: { connection: ConnectionData }) {
  const [contextState, reload] = useCompanyOsAgentContextState();
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const areas = companyAreas(connection);
  const selectedArea = areas.find((area) => area.id === selectedAreaId) || areas[0];
  const selectedTables = selectedArea?.tables || [];
  const providerTables = selectedTables.filter((table) => (table.source || "companycore") !== "companycore");
  const tableColumns: Array<TableColumn<NonNullable<OperatingArea["tables"]>[number]>> = [
    {
      key: "name",
      header: "Table",
      cell: (table) => (
        <div>
          <strong className="block">{table.name}</strong>
          <span className="text-xs text-company-muted">{table.tableName || table.id}</span>
        </div>
      )
    },
    {
      key: "source",
      header: "Source",
      cell: (table) => <span className="badge badge-outline">{table.source || "companycore"}</span>
    },
    {
      key: "api",
      header: "API",
      cell: (table) => <code className="text-xs">{sharedTableRecordApiPath(table.apiSlug)}</code>
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Operating graph</p>
            <h2 className="text-xl font-black">Operating graph detail</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-company-muted">
              Area, table, provider, Company OS resource, guardrail, automation, and run context from existing read contracts.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={reload}>Refresh graph</button>
        </div>

        {contextState.status === "loading" ? (
          <LocalNotice tone="info" title="Loading operating graph" detail="CompanyCore is reading Company OS graph records for the current owner session." />
        ) : contextState.status === "error" ? (
          <LocalNotice tone="error" title="Operating graph could not load" detail={contextState.message} />
        ) : contextState.status === "signed-out" ? (
          <LocalNotice tone="warning" title="Owner session required" detail="Sign in again to load Company OS graph context." />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard icon="ph-tree-structure" label="Areas" value={`${areas.length}`} detail="Visible company areas" />
              <MetricCard icon="ph-table" label="Area tables" value={`${selectedTables.length}`} detail={selectedArea?.name || "Selected area"} />
              <MetricCard icon="ph-plugs-connected" label="Provider tables" value={`${providerTables.length}`} detail="External data paths" />
              <MetricCard icon="ph-archive" label="Resources" value={`${contextState.context.resources.length}`} detail="Company OS resources" />
              <MetricCard icon="ph-shield-warning" label="Guardrails" value={`${contextState.context.policies.length + contextState.context.risks.length}`} detail="Policies and risks" />
              <MetricCard icon="ph-pulse" label="Runs" value={`${contextState.context.pipelineRuns.length + contextState.context.stageRuns.length}`} detail="Recent runtime nodes" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-base-300 bg-base-200/30 p-4">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="eyebrow">Selected area</p>
                    <h3 className="text-base font-black">{selectedArea?.name || "No operating area"}</h3>
                  </div>
                  <label className="form-control min-w-64">
                    <span className="label-text text-xs font-black">Inspect area</span>
                    <select
                      aria-label="Inspect graph operating area"
                      className="select select-bordered select-sm"
                      value={selectedArea?.id || ""}
                      onChange={(event) => setSelectedAreaId(event.target.value)}
                    >
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <DataTable
                  columns={tableColumns}
                  rows={selectedTables}
                  emptyTitle="No tables linked to this area"
                  emptyDetail="This operating area has no table relationship in the current connection response."
                />
              </div>

              <div className="rounded-lg border border-base-300 bg-base-200/30 p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Company OS links</p>
                    <h3 className="text-base font-black">Known graph nodes</h3>
                  </div>
                  <span className="badge badge-outline">{graphNodes(contextState.context).length} visible</span>
                </div>
                <div className="grid gap-3">
                  {graphNodes(contextState.context).length > 0 ? graphNodes(contextState.context).map((node) => (
                    <article key={node.id} className={`rounded-lg border p-3 ${nodeToneClass(node.tone)}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-company-muted">{node.group}</p>
                          <h4 className="font-black">{node.title}</h4>
                        </div>
                        <span className="badge badge-outline">{node.badge}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-company-muted">{node.detail}</p>
                      <p className="mt-2 text-xs font-bold text-company-muted">{node.relation}</p>
                    </article>
                  )) : (
                    <LocalNotice tone="info" title="No graph nodes found" detail="The current Company OS collections have no resource, policy, risk, automation, or run records in the loaded sample." />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CompanyOsWorkbench({
  connection,
  companyOs,
  onReload
}: {
  connection: ConnectionData;
  companyOs: CompanyOsData;
  onReload: () => void;
}) {
  const [activeCollection, setActiveCollection] = useState<CompanyOsCollectionName>("pipelines");
  const [selectedRecord, setSelectedRecord] = useState<{ collection: CompanyOsCollectionName; id: string } | null>(null);
  const readiness = useMemo(() => companyOsReadiness(companyOs), [companyOs]);
  const definitions = sumCountGroup(companyOs.counts.definitions);
  const runtime = sumCountGroup(companyOs.counts.runtime);
  const governance = sumCountGroup(companyOs.counts.governance);
  const totalAttention = attentionCount(companyOs);
  const pendingApprovals = companyOs.attention.pendingApprovals.length;
  const blockedExecution = companyOs.attention.blockedPipelineRuns.length + companyOs.attention.failedStageRuns.length;
  const highRisks = companyOs.attention.highRisks.length;
  const activeRecent = [
    ...companyOs.recent.pipelineRuns,
    ...companyOs.recent.approvals,
    ...companyOs.recent.auditLogs,
    ...companyOs.recent.events
  ].slice(0, 12);
  const selectedRecordId = selectedRecord?.collection === activeCollection ? selectedRecord.id : "";

  function handleCollectionSelect(collection: CompanyOsCollectionName) {
    setActiveCollection(collection);
    setSelectedRecord(null);
  }

  return (
    <Shell connection={connection} appLabel="Company OS">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-circles-three-plus" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">Company OS cockpit</p>
                  <h1 className="text-3xl font-black leading-tight">Autonomous company control plane</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
                    Inspect process definitions, pipeline runtime evidence, governance queues, adapter health, and recent audit activity from the scoped Company OS API.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/settings/api">Agent keys</a>
                <a className="btn btn-ghost" href="/react-integrations">Integrations</a>
              </div>
            </div>

            <LocalNotice
              tone={readiness.tone}
              title={readiness.title}
              detail={readiness.detail}
              action={readiness.action}
            />

            <AgentAuthorityBridge
              eyebrow="Agent supervision bridge"
              title="Company OS commands stay approval-first"
              detail="This cockpit is the owner-facing view of the same command authority agents must respect: approvals, blocked runtime evidence, high-risk guardrails, and MCP manifest review before supervised action."
              primary={{ label: "Open MCP tools", href: "/react-agent-tools" }}
              secondary={{ label: "Agent keys", href: "/settings/api" }}
              cards={[
                { label: "Pending approvals", value: `${pendingApprovals}`, detail: "Human decisions required before risky commands proceed.", tone: pendingApprovals > 0 ? "review" : "safe" },
                { label: "Blocked runtime", value: `${blockedExecution}`, detail: "Failed or blocked runs should be resolved before more automation.", tone: blockedExecution > 0 ? "blocked" : "safe" },
                { label: "High risks", value: `${highRisks}`, detail: "Risk records and policies shape supervised agent behavior.", tone: highRisks > 0 ? "review" : "safe" },
                { label: "MCP handoff", value: "Manifest", detail: "Agent tools expose route, capability, risk, and approval metadata.", tone: "neutral" }
              ]}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-flow-arrow" label="Definitions" value={`${definitions}`} detail="Processes, pipelines, SOPs, roles, adapters" />
              <MetricCard icon="ph-pulse" label="Runtime" value={`${runtime}`} detail="Runs, approvals, audit logs, events" />
              <MetricCard icon="ph-shield-check" label="Governance" value={`${governance}`} detail="Policies, risks, controls, knowledge" />
              <MetricCard icon="ph-warning-circle" label="Attention" value={`${totalAttention}`} detail="Blocked, pending, risky, or unhealthy" />
              <MetricCard icon="ph-database" label="Collections" value={`${companyOs.collections.length}`} detail="Readable Company OS collections" />
            </div>
          </div>
        </section>

        <CompanyOsAgentContextPanel onChanged={onReload} />

        <CompanyOsCollectionDrilldown
          activeCollection={activeCollection}
          companyOs={companyOs}
          onSelect={handleCollectionSelect}
          onSelectRecord={(recordId) => setSelectedRecord({ collection: activeCollection, id: recordId })}
          selectedRecordId={selectedRecordId}
        />

        <CompanyOsRecordDetailPanel
          collection={selectedRecord?.collection || activeCollection}
          recordId={selectedRecord?.id || ""}
          onClear={() => setSelectedRecord(null)}
        />

        <CompanyOsCorrelationTimeline companyOs={companyOs} />

        <CompanyOsOperatingGraphDetail connection={connection} />

        <CompanyOsWorkflowDraftPanel connection={connection} onChanged={onReload} />

        <CompanyOsStandardsEditor connection={connection} onChanged={onReload} />

        <section className="grid gap-4 xl:grid-cols-2">
          <CompanyOsAttentionList
            title="Pending approvals"
            records={companyOs.attention.pendingApprovals}
            emptyLabel="No pending approvals"
          />
          <CompanyOsAttentionList
            title="Blocked execution"
            records={[...companyOs.attention.blockedPipelineRuns, ...companyOs.attention.failedStageRuns]}
            emptyLabel="No blocked execution"
          />
          <CompanyOsAttentionList
            title="High risks"
            records={companyOs.attention.highRisks}
            emptyLabel="No active high risks"
          />
          <CompanyOsAttentionList
            title="Adapter health"
            records={companyOs.attention.unhealthyAdapters}
            emptyLabel="No unhealthy adapters"
          />
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Recent evidence</p>
                <h2 className="text-xl font-black">Runs, approvals, audit logs, and events</h2>
              </div>
              <span className="badge badge-outline">{activeRecent.length} visible</span>
            </div>
            <CompanyOsRecentEvents events={activeRecent} />
          </div>
        </section>
      </section>
    </Shell>
  );
}

function routeFamily(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[1] || "root";
}

function familyLabel(family: string) {
  return family
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskTone(riskLevel: McpTool["riskLevel"]): NoticeTone {
  if (riskLevel === "destructive") {
    return "error";
  }
  if (riskLevel === "write") {
    return "warning";
  }
  return "info";
}

function toolFamilies(manifest: McpManifest): AgentToolFamily[] {
  const grouped = new Map<string, McpTool[]>();
  for (const tool of manifest.tools) {
    const family = routeFamily(tool.path);
    grouped.set(family, [...(grouped.get(family) || []), tool]);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([family, tools]) => ({
      id: family,
      label: familyLabel(family),
      detail: `${tools.length} MCP tool${tools.length === 1 ? "" : "s"} exposed through /v1/${family}.`,
      tools: tools.sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method))
    }));
}

function AgentToolSurfaceStatePanel({ state, onRetry }: { state: AgentToolSurfaceState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as const,
      title: "Owner session required",
      detail: "Sign in through the current console to inspect the MCP tools visible to agents.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as const,
      title: "Loading agent tool surface",
      detail: "CompanyCore is reading the owner connection and MCP manifest.",
      action: undefined
    },
    error: {
      tone: "error" as const,
      title: "Agent tools could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="Agent tools">
      <section className="mx-auto w-full max-w-7xl px-5 py-8">
        <LocalNotice tone={content.tone} title={content.title} detail={content.detail} action={content.action} />
        {state.status === "error" ? (
          <button className="btn btn-primary mt-4" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function AgentToolFamilyCard({ family }: { family: AgentToolFamily }) {
  const reads = family.tools.filter((tool) => tool.riskLevel === "read").length;
  const writes = family.tools.filter((tool) => tool.riskLevel === "write").length;
  const destructive = family.tools.filter((tool) => tool.riskLevel === "destructive").length;
  const supervised = family.tools.filter((tool) => tool.requiresApproval).length;

  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Route family</p>
            <h3 className="text-xl font-black">{family.label}</h3>
            <p className="mt-1 text-sm leading-6 text-company-muted">{family.detail}</p>
          </div>
          <span className="badge badge-outline">{supervised} supervised</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <MetricCard icon="ph-eye" label="Read" value={`${reads}`} detail="Inspection tools" />
          <MetricCard icon="ph-pencil-simple" label="Write" value={`${writes}`} detail="Mutation tools" />
          <MetricCard icon="ph-trash" label="Destructive" value={`${destructive}`} detail="Delete/archive tools" />
          <MetricCard icon="ph-shield-warning" label="Approval" value={`${supervised}`} detail="Requires supervision" />
        </div>
      </div>
    </article>
  );
}

function AgentToolTable({ tools }: { tools: McpTool[] }) {
  const rows = tools.map((tool) => ({ ...tool, id: tool.name }));
  const columns: Array<TableColumn<McpTool & { id: string }>> = [
    {
      key: "tool",
      header: "Tool",
      cell: (tool) => (
        <div className="min-w-64">
          <strong className="block break-words">{tool.name}</strong>
          <p className="mt-1 text-xs leading-5 text-company-muted">{tool.description}</p>
        </div>
      )
    },
    {
      key: "route",
      header: "Route",
      cell: (tool) => (
        <div className="min-w-52">
          <span className="badge badge-outline">{tool.method}</span>
          <code className="mt-2 block break-all text-xs">{tool.path}</code>
        </div>
      )
    },
    {
      key: "capability",
      header: "Capability",
      cell: (tool) => <code className="break-all text-xs">{tool.capability}</code>
    },
    {
      key: "risk",
      header: "Risk",
      cell: (tool) => (
        <div className="flex flex-col gap-2">
          <span className={`badge ${riskTone(tool.riskLevel) === "error" ? "badge-error" : riskTone(tool.riskLevel) === "warning" ? "badge-warning" : "badge-info"}`}>
            {tool.riskLevel}
          </span>
          {tool.requiresApproval ? (
            <span className="badge badge-warning">requires approval</span>
          ) : (
            <span className="badge badge-outline">direct tool</span>
          )}
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle="No MCP tools available"
      emptyDetail="This owner session has no manifest tools for the selected capability scope."
    />
  );
}

function AgentToolSurfaceWorkbench({ connection, manifest }: { connection: ConnectionData; manifest: McpManifest }) {
  const [activeFamily, setActiveFamily] = useState("all");
  const families = useMemo(() => toolFamilies(manifest), [manifest]);
  const selectedFamily = families.find((family) => family.id === activeFamily);
  const visibleTools = selectedFamily?.tools || manifest.tools;
  const reads = manifest.tools.filter((tool) => tool.riskLevel === "read").length;
  const writes = manifest.tools.filter((tool) => tool.riskLevel === "write").length;
  const destructive = manifest.tools.filter((tool) => tool.riskLevel === "destructive").length;
  const requiresApproval = manifest.tools.filter((tool) => tool.requiresApproval).length;
  const companyOsRisky = manifest.tools.filter((tool) => tool.path.includes("/company-os") && tool.requiresApproval).length;

  return (
    <Shell connection={connection} appLabel="Agent tools">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-robot" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">Agent tool surface</p>
                  <h1 className="text-3xl font-black leading-tight">MCP tools visible to agents</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
                    Inspect the same manifest an MCP bridge gives to agents: routes, capabilities, risk levels, approval gates, and guardrails.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/settings/api">Create agent key</a>
                <a className="btn btn-ghost" href="/react-company-os">Company OS</a>
              </div>
            </div>

            <LocalNotice
              tone={requiresApproval > 0 ? "warning" : "success"}
              title="Owner can inspect agent authority before handing out keys"
              detail={`${manifest.tools.length} tools are visible in this session. ${requiresApproval} require explicit approval or supervised operation, including ${companyOsRisky} Company OS command tools.`}
            />

            <AgentAuthorityBridge
              eyebrow="Agent authority bridge"
              title="MCP tools mirror Company OS supervision"
              detail="Use this bridge before handing an API key to an agent: it connects visible MCP routes, supervised commands, Company OS risk, and destructive authority to the owner approval model."
              primary={{ label: "Company OS", href: "/react-company-os" }}
              secondary={{ label: "API settings", href: "/settings/api" }}
              cards={[
                { label: "Visible tools", value: `${manifest.tools.length}`, detail: "Manifest tools available to this owner session.", tone: manifest.tools.length > 0 ? "safe" : "blocked" },
                { label: "Supervised", value: `${requiresApproval}`, detail: "Tools that require approval or supervised operation.", tone: requiresApproval > 0 ? "review" : "safe" },
                { label: "Company OS risk", value: `${companyOsRisky}`, detail: "Risky Company OS command tools in the MCP surface.", tone: companyOsRisky > 0 ? "review" : "safe" },
                { label: "Destructive", value: `${destructive}`, detail: "Delete or archive authority must stay least-privilege.", tone: destructive > 0 ? "blocked" : "safe" }
              ]}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-list-checks" label="Tools" value={`${manifest.tools.length}`} detail={`${families.length} route families`} />
              <MetricCard icon="ph-eye" label="Read" value={`${reads}`} detail="Safe inspection tools" />
              <MetricCard icon="ph-pencil-simple" label="Write" value={`${writes}`} detail="Mutation-capable tools" />
              <MetricCard icon="ph-trash" label="Destructive" value={`${destructive}`} detail="Delete/archive routes" />
              <MetricCard icon="ph-shield-warning" label="Supervised" value={`${requiresApproval}`} detail="Requires approval metadata" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {families.slice(0, 4).map((family) => (
            <AgentToolFamilyCard family={family} key={family.id} />
          ))}
        </section>

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Tool catalog</p>
                <h2 className="text-xl font-black">Capability-scoped manifest</h2>
                <p className="mt-1 text-sm leading-6 text-company-muted">
                  Select a route family to see the exact tool names, HTTP routes, capabilities, and supervision flags agents receive.
                </p>
              </div>
              <select
                className="select select-bordered"
                value={activeFamily}
                onChange={(event) => setActiveFamily(event.target.value)}
                aria-label="Filter MCP tools by route family"
              >
                <option value="all">All route families</option>
                {families.map((family) => (
                  <option value={family.id} key={family.id}>{family.label}</option>
                ))}
              </select>
            </div>
            <AgentToolTable tools={visibleTools} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-3">
              <p className="eyebrow">Manifest guardrails</p>
              <h2 className="text-xl font-black">Rules agents must follow</h2>
              <ul className="grid gap-2 text-sm leading-6 text-company-muted">
                {manifest.guardrails.map((guardrail) => (
                  <li className="rounded-company border border-base-300 bg-base-200/45 p-3" key={guardrail}>{guardrail}</li>
                ))}
              </ul>
            </div>
          </article>
          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-3">
              <p className="eyebrow">Current session</p>
              <h2 className="text-xl font-black">Auth and transport</h2>
              <div className="grid gap-3 text-sm">
                <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
                  <span className="label-text-alt text-company-muted">Scope mode</span>
                  <strong className="block">{connection.scopeMode || "unknown"}</strong>
                </div>
                <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
                  <span className="label-text-alt text-company-muted">Auth header</span>
                  <strong className="block break-words">{manifest.auth.header}</strong>
                </div>
                <div className="rounded-company border border-base-300 bg-base-200/45 p-3">
                  <span className="label-text-alt text-company-muted">Backend access</span>
                  <strong className="block break-words">{manifest.transport.backendAccess}</strong>
                </div>
              </div>
            </div>
          </article>
        </section>
      </section>
    </Shell>
  );
}

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix?: string | null;
  scopes?: unknown;
  active: boolean;
  createdAt?: string;
  lastUsedAt?: string | null;
};

type AgentKeyProfile = {
  id: string;
  label: string;
  description?: string;
  riskLevel?: string;
  scopes: string[];
};

type RelationshipGraph = {
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  reviewItems?: Array<Record<string, unknown>>;
  unsupportedFamilies?: Array<Record<string, unknown>>;
};

type PipelineBundle = {
  clients: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
  interactions: Array<Record<string, unknown>>;
};

type ClientRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  source?: string | null;
  createdAt?: string;
};

type AgentRecord = {
  id: string;
  name: string;
  role?: string | null;
  status?: string | null;
  source?: string | null;
  createdAt?: string;
};

type AgentEventRecord = {
  id: string;
  type?: string | null;
  deliveryStatus?: string | null;
  source?: string | null;
  createdAt?: string;
  payload?: Record<string, unknown> | null;
};

type OperationsBundle = {
  connection: ConnectionData;
  clients: ClientRecord[];
  tasks: TaskRecord[];
  driveFiles: GoogleDriveFileRecord[];
  agents: AgentRecord[];
  agentEvents: AgentEventRecord[];
  companyOs: CompanyOsData | null;
  tableRecords: TableRecordSnapshot;
};

type SettingsIntegrationId = "clickup" | "google_drive";
type IntegrationPaneId = "setup" | "mapping" | "sync";

type IntegrationSettingRecord = {
  id: string;
  provider: SettingsIntegrationId;
  config?: Record<string, unknown>;
  active: boolean;
  secretConfigured?: boolean;
  oauthClientConfigured?: boolean;
  oauthTokenConfigured?: boolean;
};

type ClickUpDiscoveryResult = {
  workspaces?: Array<{ id: string; name: string }>;
  selectedWorkspace?: { id: string; name: string } | null;
  spaces?: Array<{
    id: string;
    name: string;
    folders?: Array<{ id: string; name: string; lists?: Array<{ id: string; name: string }> }>;
    lists?: Array<{ id: string; name: string }>;
  }>;
};

type PrivateLoadState<T> =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "request_failed";
}

async function ownerApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = ownerToken();
  if (!token) {
    throw new Error("invalid_token");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({})) as { data?: T; error?: string };

  if (!response.ok || !("data" in body)) {
    throw new Error(body.error || "request_failed");
  }

  return body.data as T;
}

function usePrivateLoader<T>(loader: () => Promise<T>, deps: React.DependencyList = []): [PrivateLoadState<T>, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<PrivateLoadState<T>>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    if (!ownerToken()) {
      setState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    loader()
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = apiErrorMessage(error);
          if (["invalid_token", "invalid_auth_token", "missing_api_key", "invalid_api_key"].includes(message)) {
            window.sessionStorage.removeItem("companycoreOwnerToken");
            setState({ status: "signed-out" });
            return;
          }
          setState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, ...deps]);

  return [state, () => setReloadKey((value) => value + 1)];
}

function PrivateStateGate<T>({
  state,
  title,
  detail,
  onRetry,
  children
}: {
  state: PrivateLoadState<T>;
  title: string;
  detail: string;
  onRetry: () => void;
  children: (data: T) => React.ReactNode;
}) {
  if (state.status === "ready") {
    return <>{children(state.data)}</>;
  }

  if (state.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return (
    <Shell appLabel={title}>
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-8">
        <LocalNotice
          tone={state.status === "error" ? "error" : "info"}
          title={state.status === "error" ? `${title} could not load` : title}
          detail={state.status === "error" ? `${detail} (${state.message})` : detail}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function PublicLayout({
  children,
  active = "home"
}: {
  children: React.ReactNode;
  active?: "home" | "login" | "register";
}) {
  return (
    <main className="public-shell" data-theme="companycore">
      <header className="public-header">
        <div className="public-header-inner">
          <a className="public-brand" href="/">
            <span className="public-brand-mark">
              <i className="ph-bold ph-cube" aria-hidden="true"></i>
            </span>
            <span>
              <strong>CompanyCore</strong>
              <small>LuckySparrow operating system</small>
            </span>
          </a>
          <nav className="public-nav" aria-label="Public navigation">
            <a className={active === "home" ? "is-active" : ""} href="/">Home</a>
            <a className={active === "login" ? "is-active" : ""} href="/auth/login">Sign in</a>
            <a className={active === "register" ? "is-active primary" : "primary"} href="/auth/register">Create account</a>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}

function PublicHomeRoute() {
  return (
    <PublicLayout active="home">
      <section className="public-home">
        <div className="public-home-copy">
          <p className="public-kicker">CompanyCore V1</p>
          <h1>One calm operating room for your company.</h1>
          <p>
            CompanyCore connects departments, work, knowledge, providers,
            decisions, and AI handoff into a single owner-readable system.
          </p>
          <div className="public-home-actions">
            <a className="atlas-primary-action" href="/auth/login">Open owner workspace</a>
            <a className="atlas-secondary-action" href="/auth/register">Create workspace</a>
          </div>
        </div>

        <div className="public-home-preview" aria-label="CompanyCore operating preview">
          <div className="public-preview-topline">
            <span>LuckySparrow</span>
            <strong>Company Atlas</strong>
            <em>Ready</em>
          </div>
          <div className="public-preview-map">
            {canonicalAreas.slice(0, 13).map((area, index) => (
              <span style={{ "--node-index": index } as React.CSSProperties} key={area.key}>
                <i className={`ph-bold ${area.icon}`} aria-hidden="true"></i>
                <strong>{area.shortLabel}</strong>
              </span>
            ))}
            <div>
              <i className="ph-bold ph-map-trifold" aria-hidden="true"></i>
              <strong>Atlas</strong>
              <small>12 areas + 00</small>
            </div>
          </div>
          <div className="public-preview-rail">
            {[
              ["Strategy", "Goals, workflows, decisions"],
              ["Knowledge", "Drive proof and records"],
              ["AI handoff", "Guarded agent context"]
            ].map(([title, detail]) => (
              <span key={title}>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function AuthRoute({ mode }: { mode: "login" | "register" }) {
  const [status, setStatus] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ownerToken()) {
      window.location.replace(canonicalPostAuthPath());
    }
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = mode === "login"
      ? {
          email: String(form.get("email") || ""),
          password: String(form.get("password") || "")
        }
      : {
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
          workspaceName: String(form.get("workspaceName") || "")
        };

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json() as { data?: { token: string }; error?: string };
      if (!response.ok || !body.data?.token) {
        throw new Error(body.error || "auth_failed");
      }
      window.sessionStorage.setItem("companycoreOwnerToken", body.data.token);
      const pending = canonicalPostAuthPath(window.sessionStorage.getItem("companycorePendingPrivatePath"));
      window.sessionStorage.removeItem("companycorePendingPrivatePath");
      window.location.replace(pending);
    } catch (error) {
      setStatus({
        tone: "error",
        message: apiErrorMessage(error) === "invalid_credentials"
          ? "Email or password is incorrect."
          : "CompanyCore could not complete authentication."
      });
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <PublicLayout active={isLogin ? "login" : "register"}>
      <section className="public-auth">
        <aside className="public-auth-context">
          <p className="public-kicker">{isLogin ? "Owner access" : "Workspace bootstrap"}</p>
          <h1>{isLogin ? "Return to your company operating room." : "Create the company control plane."}</h1>
          <p>
            Sign in to review departments, evidence, decisions, and guarded AI
            handoff. Registration creates the first owner workspace.
          </p>
          <div className="public-auth-signals">
            {[
              ["Company Atlas", "All 00-12 areas"],
              ["Area detail", "Goals, tasks, knowledge"],
              ["AI guardrails", "MCP and owner approval"],
              ["Evidence", "Tables, Drive, providers"]
            ].map(([title, detail]) => (
              <span key={title}>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            ))}
          </div>
        </aside>

        <form className="public-auth-card" onSubmit={submit}>
          <div className="public-auth-card-inner">
            <div>
              <p className="public-kicker">{isLogin ? "Private workspace" : "New workspace"}</p>
              <h2>{isLogin ? "Sign in" : "Create account"}</h2>
            </div>
            {!isLogin ? (
              <label className="public-field">
                <span>Name</span>
                <input name="name" type="text" autoComplete="name" />
              </label>
            ) : null}
            <label className="public-field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="public-field">
              <span>Password</span>
              <input name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? undefined : 12} required />
            </label>
            {!isLogin ? (
              <label className="public-field">
                <span>Workspace name</span>
                <input name="workspaceName" type="text" required />
              </label>
            ) : null}
            <button className="public-submit" type="submit" disabled={busy}>{busy ? "Working..." : isLogin ? "Sign in" : "Create workspace"}</button>
            {status ? <LocalNotice tone={status.tone} title="Authentication" detail={status.message} /> : null}
            <p className="public-auth-switch">
              {isLogin ? "No account yet?" : "Already have an account?"}{" "}
              <a href={isLogin ? "/auth/register" : "/auth/login"}>{isLogin ? "Create one" : "Sign in"}</a>
            </p>
          </div>
        </form>
      </section>
    </PublicLayout>
  );
}

function OperationsCockpitRoute() {
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [state, reload] = usePrivateLoader(async () => {
    const connection = await ownerApi<ConnectionData>("/v1/connection");
    const [clients, tasks, driveFiles, agents, agentEvents, companyOs, tableRecords] = await Promise.all([
      ownerApi<ClientRecord[]>("/v1/clients").catch(() => []),
      ownerApi<TaskRecord[]>("/v1/tasks").catch(() => []),
      ownerApi<GoogleDriveFileRecord[]>("/v1/google-drive/files").catch(() => []),
      ownerApi<AgentRecord[]>("/v1/agents").catch(() => []),
      ownerApi<AgentEventRecord[]>("/v1/agent-events").catch(() => []),
      ownerApi<CompanyOsData>("/v1/company-os").catch(() => null),
      loadTableRecordSnapshot(connection).catch(() => ({}))
    ]);
    return { connection, clients, tasks, driveFiles, agents, agentEvents, companyOs, tableRecords } satisfies OperationsBundle;
  });

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    const companyName = String(form.get("companyName") || "").trim();
    const email = String(form.get("email") || "").trim();
    if (!name) {
      setNotice({ tone: "error", title: "Client not created", detail: "Client name is required." });
      return;
    }
    setBusyAction("client");
    setNotice(null);
    try {
      await ownerApi<ClientRecord>("/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          ...(companyName ? { companyName } : {}),
          ...(email ? { email } : {}),
          status: "active",
          source: "companycore"
        })
      });
      formElement.reset();
      setNotice({ tone: "success", title: "Client created", detail: "The client is now visible in CRM and relationship context." });
      reload();
    } catch (error) {
      setNotice({ tone: "error", title: "Client not created", detail: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    const priority = String(form.get("priority") || "").trim();
    if (!title) {
      setNotice({ tone: "error", title: "Task not created", detail: "Task title is required." });
      return;
    }
    setBusyAction("task");
    setNotice(null);
    try {
      await ownerApi<TaskRecord>("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          ...(priority ? { priority } : {}),
          status: "todo",
          source: "companycore"
        })
      });
      formElement.reset();
      setNotice({ tone: "success", title: "Task created", detail: "The task is now available for delivery review and agent context." });
      reload();
    } catch (error) {
      setNotice({ tone: "error", title: "Task not created", detail: apiErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <PrivateStateGate state={state} title="Operations cockpit" detail="CompanyCore is loading clients, tasks, files, tables, and agent context." onRetry={reload}>
      {(data) => (
        <OperationsCockpit
          data={data}
          notice={notice}
          busyAction={busyAction}
          onCreateClient={createClient}
          onCreateTask={createTask}
        />
      )}
    </PrivateStateGate>
  );
}

function recordStatus(record: { status?: string | null }) {
  return String(record.status || "active").toLowerCase();
}

function activeClientCount(clients: ClientRecord[]) {
  return clients.filter((client) => !["archived", "lost", "inactive"].includes(recordStatus(client))).length;
}

function areaFileCount(files: GoogleDriveFileRecord[], areaId?: string) {
  return areaId ? files.filter((file) => file.operatingAreaId === areaId).length : 0;
}

function areaRecordCount(area: AreaViewState, tableRecords: TableRecordSnapshot) {
  return (area.backendArea?.tables || []).reduce((total, table) => total + (tableRecords[table.apiSlug]?.length || 0), 0);
}

function fileIcon(file: GoogleDriveFileRecord) {
  if (file.isFolder) {
    return "ph-folder";
  }
  if (file.mimeType.includes("spreadsheet")) {
    return "ph-file-xls";
  }
  if (file.mimeType.includes("document")) {
    return "ph-file-doc";
  }
  return "ph-file";
}

function OperationsCockpit({
  data,
  notice,
  busyAction,
  onCreateClient,
  onCreateTask
}: {
  data: OperationsBundle;
  notice: { tone: NoticeTone; title: string; detail: string } | null;
  busyAction: string | null;
  onCreateClient: (event: React.FormEvent<HTMLFormElement>) => void;
  onCreateTask: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { connection, clients, tasks, driveFiles, agents, agentEvents, companyOs, tableRecords } = data;
  const areas = useMemo(() => buildAreaViewState(connection), [connection]);
  const [selectedAreaKey, setSelectedAreaKey] = useState(() => areas[1]?.key || areas[0]?.key || "01-strategia");
  const selectedArea = areas.find((area) => area.key === selectedAreaKey) || areas[0];
  const selectedBackendArea = selectedArea?.backendArea;
  const selectedTables = selectedBackendArea?.tables || [];
  const selectedFiles = driveFiles.filter((file) => file.operatingAreaId === selectedBackendArea?.id);
  const selectedFolders = selectedFiles.filter((file) => file.isFolder);
  const selectedRecords = areaRecordCount(selectedArea, tableRecords);
  const taskStats = taskMetrics(tasks);
  const openTasks = tasks.filter(isOpenTask);
  const dueSoonTasks = tasks.filter(isDueSoon);
  const unscopedFiles = driveFiles.filter((file) => !file.operatingAreaId && !file.trashed);
  const activeAgents = agents.filter((agent) => recordStatus(agent) === "active");
  const mcpTools = connection.mcpManifest?.tools || [];
  const readTools = mcpTools.filter((tool) => tool.riskLevel === "read").length;
  const supervisedTools = mcpTools.filter((tool) => tool.requiresApproval).length;
  const pendingApprovals = companyOs?.attentionQueues?.pendingApprovals?.length || 0;
  const blockedRuns = (companyOs?.attentionQueues?.blockedPipelineRuns?.length || 0) + (companyOs?.attentionQueues?.failedStageRuns?.length || 0);
  const directionItems = [
    ...dueSoonTasks.slice(0, 2).map((task) => ({
      title: task.title,
      detail: `Due ${formatTaskDate(task.dueDate)} - ${task.status || "todo"}`,
      href: "/tasks-adapter",
      tone: "warning" as const
    })),
    ...(unscopedFiles.length ? [{
      title: `${unscopedFiles.length} Drive files need department scope`,
      detail: "Assign files so agents can reason from the right department.",
      href: "/settings/drive",
      tone: "info" as const
    }] : []),
    ...(pendingApprovals ? [{
      title: `${pendingApprovals} Company OS approvals waiting`,
      detail: "Review before agent or workflow action continues.",
      href: "/react-company-os",
      tone: "warning" as const
    }] : [])
  ].slice(0, 5);

  return (
    <Shell connection={connection} appLabel="Operations cockpit">
      <section className="mx-auto grid w-full max-w-[92rem] gap-5 px-4 py-6 sm:px-5">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Company operations</p>
            <h1 className="text-3xl font-black sm:text-4xl">Operations cockpit</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              One V1 supervision view for clients, delivery, department evidence, and AI handoff. Create the next client or task here, then let the detailed workbenches carry the deeper workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <a className="btn btn-primary" href="#new-task"><i className="ph-bold ph-plus" aria-hidden="true"></i> New task</a>
            <a className="btn btn-outline" href="#new-client"><i className="ph-bold ph-user-plus" aria-hidden="true"></i> New client</a>
            <a className="btn btn-ghost" href="/react-company-os">Agent console</a>
          </div>
        </section>

        {notice ? <LocalNotice tone={notice.tone} title={notice.title} detail={notice.detail} /> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="ph-users" label="Clients" value={`${clients.length}`} detail={`${activeClientCount(clients)} active relationship records`} />
          <MetricCard icon="ph-list-checks" label="Tasks" value={`${tasks.length}`} detail={`${taskStats.open} open, ${taskStats.dueSoon} due soon`} />
          <MetricCard icon="ph-folder-open" label="Files and tables" value={`${driveFiles.length}/${connectionMetrics(connection).tables}`} detail={`${unscopedFiles.length} files still need department scope`} />
          <MetricCard icon="ph-robot" label="AI handoff" value={`${activeAgents.length}`} detail={`${readTools} read tools, ${supervisedTools} supervised tools`} />
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Clients / CRM</p>
                  <h2 className="text-xl font-black">Relationship queue</h2>
                </div>
                <a className="link text-sm font-bold" href="/pipeline">View CRM</a>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{activeClientCount(clients)}</strong>Active</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{clients.filter((client) => recordStatus(client) === "archived").length}</strong>Archived</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{clients.filter((client) => client.source && client.source !== "companycore").length}</strong>Provider</span>
              </div>
              <div className="grid gap-2">
                {clients.slice(0, 5).map((client) => (
                  <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={client.id}>
                    <strong className="block break-words text-sm">{client.companyName || client.name}</strong>
                    <span className="text-xs text-company-muted">{client.name}{client.status ? ` - ${client.status}` : ""}</span>
                  </div>
                ))}
                {clients.length === 0 ? <p className="text-sm text-company-muted">No clients yet. Add the first account below.</p> : null}
              </div>
              <form id="new-client" className="grid gap-2 border-t border-base-300 pt-3" onSubmit={onCreateClient}>
                <input className="input input-bordered input-sm" name="name" placeholder="Client contact name" required />
                <input className="input input-bordered input-sm" name="companyName" placeholder="Company name" />
                <input className="input input-bordered input-sm" name="email" type="email" placeholder="Email" />
                <button className="btn btn-primary btn-sm" type="submit" disabled={busyAction === "client"}>{busyAction === "client" ? "Creating..." : "Create client"}</button>
              </form>
            </div>
          </article>

          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Tasks / delivery</p>
                  <h2 className="text-xl font-black">Execution pressure</h2>
                </div>
                <a className="link text-sm font-bold" href="/tasks-adapter">View tasks</a>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{taskStats.open}</strong>Open</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{taskStats.dueSoon}</strong>Due soon</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{taskStats.clickUp}</strong>ClickUp</span>
              </div>
              <div className="grid gap-2">
                {openTasks.slice(0, 5).map((task) => (
                  <div className="rounded-company border border-base-300 bg-base-200/40 p-3" key={task.id}>
                    <div className="flex items-start justify-between gap-2">
                      <strong className="break-words text-sm">{task.title}</strong>
                      <span className="badge badge-outline badge-sm">{task.status || "todo"}</span>
                    </div>
                    <span className="text-xs text-company-muted">{normalizedTaskList(task)} - due {formatTaskDate(task.dueDate)}</span>
                  </div>
                ))}
                {openTasks.length === 0 ? <p className="text-sm text-company-muted">No open tasks are visible.</p> : null}
              </div>
              <form id="new-task" className="grid gap-2 border-t border-base-300 pt-3" onSubmit={onCreateTask}>
                <input className="input input-bordered input-sm" name="title" placeholder="Task title" required />
                <select className="select select-bordered select-sm" name="priority" defaultValue="">
                  <option value="">No priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button className="btn btn-primary btn-sm" type="submit" disabled={busyAction === "task"}>{busyAction === "task" ? "Creating..." : "Create task"}</button>
              </form>
            </div>
          </article>

          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Department files and tables</p>
                  <h2 className="text-xl font-black">Evidence lens</h2>
                </div>
                <a className="link text-sm font-bold" href={areaHref(selectedArea, "knowledge")}>Open area</a>
              </div>
              <select className="select select-bordered select-sm" value={selectedArea.key} onChange={(event) => setSelectedAreaKey(event.target.value)} aria-label="Select department for operations cockpit">
                {areas.map((area) => <option value={area.key} key={area.key}>{area.label}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{selectedTables.length}</strong>Tables</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{selectedRecords}</strong>Records</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{selectedFiles.length}</strong>Files</span>
              </div>
              <div className="grid gap-2">
                {selectedFiles.slice(0, 5).map((file) => (
                  <div className="flex items-start gap-3 rounded-company border border-base-300 bg-base-200/40 p-3" key={file.id}>
                    <i className={`ph-bold ${fileIcon(file)} mt-0.5 text-lg text-company-blue`} aria-hidden="true"></i>
                    <span className="min-w-0">
                      <strong className="block break-words text-sm">{file.name}</strong>
                      <small className="text-company-muted">{file.isFolder ? "Folder" : file.mimeType.split(".").at(-1) || "File"}{file.modifiedTime ? ` - ${formatTaskDate(file.modifiedTime)}` : ""}</small>
                    </span>
                  </div>
                ))}
                {selectedFiles.length === 0 ? <p className="text-sm text-company-muted">No Drive files are scoped to this department yet.</p> : null}
              </div>
              <div className="grid gap-2 border-t border-base-300 pt-3">
                {selectedTables.slice(0, 4).map((table) => (
                  <div className="flex items-center justify-between gap-2 text-sm" key={table.id}>
                    <span className="break-words">{table.name}</span>
                    <span className="badge badge-outline badge-sm">{tableRecords[table.apiSlug]?.length || 0}</span>
                  </div>
                ))}
                <a className="btn btn-outline btn-sm" href="/data">Open tables</a>
              </div>
            </div>
          </article>

          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">AI agent handoff</p>
                  <h2 className="text-xl font-black">Paperclip and Jarvis</h2>
                </div>
                <a className="link text-sm font-bold" href="/react-agent-tools">MCP</a>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{activeAgents.length}</strong>Ready</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{agentEvents.length}</strong>Events</span>
                <span className="rounded-company bg-base-200 p-2"><strong className="block text-base">{pendingApprovals + blockedRuns}</strong>Needs review</span>
              </div>
              <div className="rounded-company border border-success/30 bg-success/10 p-3 text-sm">
                <strong className="block">Safe read context</strong>
                <span className="text-company-muted">{readTools} read tools are visible. {supervisedTools} tools require owner supervision.</span>
              </div>
              <div className="grid gap-2">
                {agents.slice(0, 5).map((agent) => (
                  <div className="flex items-center justify-between gap-2 rounded-company border border-base-300 bg-base-200/40 p-3 text-sm" key={agent.id}>
                    <span className="min-w-0">
                      <strong className="block break-words">{agent.name}</strong>
                      <small className="text-company-muted">{agent.role || agent.source || "Agent"}</small>
                    </span>
                    <span className="badge badge-outline badge-sm">{agent.status || "active"}</span>
                  </div>
                ))}
                {agents.length === 0 ? <p className="text-sm text-company-muted">No agent records yet. API keys and MCP are ready paths for external agents.</p> : null}
              </div>
              <a className="btn btn-outline btn-sm" href="/react-company-os">Open agent console</a>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Departments</p>
                  <h2 className="text-xl font-black">Coverage by area</h2>
                </div>
                <a className="link text-sm font-bold" href="/areas">View all</a>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Tables</th>
                      <th>Records</th>
                      <th>Files</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map((area) => (
                      <tr key={area.key}>
                        <td><a className="font-bold" href={areaHref(area)}>{area.label}</a></td>
                        <td>{area.tableCount}</td>
                        <td>{areaRecordCount(area, tableRecords)}</td>
                        <td>{areaFileCount(driveFiles, area.backendArea?.id)}</td>
                        <td><span className="badge badge-outline badge-sm">{area.statusLabel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>

          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <p className="eyebrow">What needs direction</p>
              <h2 className="text-xl font-black">Owner queue</h2>
              <div className="grid gap-2">
                {directionItems.map((item) => (
                  <a className="rounded-company border border-base-300 bg-base-200/40 p-3 text-sm" href={item.href} key={`${item.title}-${item.href}`}>
                    <strong className="block break-words">{item.title}</strong>
                    <span className="text-company-muted">{item.detail}</span>
                  </a>
                ))}
                {directionItems.length === 0 ? <p className="text-sm text-company-muted">No urgent owner direction is visible from this cockpit.</p> : null}
              </div>
            </div>
          </article>

          <article className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body gap-4">
              <p className="eyebrow">Agent status</p>
              <h2 className="text-xl font-black">Background work readiness</h2>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-company bg-base-200 p-3"><span>Company OS approvals</span><strong>{pendingApprovals}</strong></div>
                <div className="flex items-center justify-between rounded-company bg-base-200 p-3"><span>Blocked runtime</span><strong>{blockedRuns}</strong></div>
                <div className="flex items-center justify-between rounded-company bg-base-200 p-3"><span>Unscoped Drive files</span><strong>{unscopedFiles.length}</strong></div>
                <div className="flex items-center justify-between rounded-company bg-base-200 p-3"><span>Folders in selected area</span><strong>{selectedFolders.length}</strong></div>
              </div>
              <a className="btn btn-primary btn-sm" href="/react-agent-tools">Review agent tools</a>
            </div>
          </article>
        </section>
      </section>
    </Shell>
  );
}

function AccountSettingsRoute() {
  const [state, reload] = usePrivateLoader(async () => ownerApi<ConnectionData>("/v1/connection"));
  return (
    <PrivateStateGate state={state} title="Account" detail="CompanyCore is loading owner and workspace context." onRetry={reload}>
      {(connection) => (
        <Shell connection={connection} appLabel="Account">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <p className="eyebrow">Workspace owner</p>
                <h1 className="text-3xl font-black">{connection.workspace.name}</h1>
                <p className="text-sm leading-6 text-company-muted">{connection.user?.email || "Owner email unavailable"}</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon="ph-buildings" label="Areas" value={`${companyAreas(connection).length}`} detail="LuckySparrow operating areas" />
                  <MetricCard icon="ph-database" label="Tables" value={`${connectionMetrics(connection).tables}`} detail="Backend-backed data surfaces" />
                  <MetricCard icon="ph-plugs-connected" label="ClickUp" value={connection.integrations.clickup.active ? "Active" : "Setup"} detail="Task provider bridge" />
                  <MetricCard icon="ph-cloud" label="Drive" value={connection.integrations.googleDrive.active ? "Active" : "Setup"} detail="Knowledge and file bridge" />
                </div>
              </div>
            </section>
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

function DataRoute() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const activeSlug = pathParts[1] || "";
  const [state, reload] = usePrivateLoader(async () => {
    const connection = await ownerApi<ConnectionData>("/v1/connection");
    const tables = connection.operatingModel.areas.flatMap((area) => area.tables || []);
    const selected = tables.find((table) => table.apiSlug === activeSlug) || tables[0];
    const records = selected
      ? await ownerApi<Array<Record<string, unknown>>>(sharedTableRecordApiPath(selected.apiSlug)).catch(() => [])
      : [];
    return { connection, tables, selected, records };
  }, [activeSlug]);

  return (
    <PrivateStateGate state={state} title="Company data" detail="CompanyCore is loading database modules." onRetry={reload}>
      {({ connection, tables, selected, records }) => (
        <Shell connection={connection} appLabel="Company data">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <p className="eyebrow">Data operations</p>
                    <h1 className="text-3xl font-black">{selected?.name || "Company tables"}</h1>
                    <p className="text-sm leading-6 text-company-muted">Browse backend-backed records by operating area without the legacy vanilla shell.</p>
                  </div>
                  <span className="badge badge-outline">{records.length} records</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tables.map((table) => (
                    <a className={`btn btn-sm flex-none ${table.apiSlug === selected?.apiSlug ? "btn-primary" : "btn-outline"}`} href={`/data/${table.apiSlug}`} key={table.id}>{table.name}</a>
                  ))}
                </div>
              </div>
            </section>
            <GenericRecordTable records={records} emptyTitle="No records yet" emptyDetail="This table has no records available for the current workspace." />
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

function GenericRecordTable({ records, emptyTitle, emptyDetail }: { records: Array<Record<string, unknown>>; emptyTitle: string; emptyDetail: string }) {
  const keys = useMemo(() => {
    const preferred = ["id", "name", "title", "status", "source", "createdAt", "updatedAt"];
    const discovered = [...new Set(records.flatMap((record) => Object.keys(record)))];
    return [...preferred.filter((key) => discovered.includes(key)), ...discovered.filter((key) => !preferred.includes(key))].slice(0, 6);
  }, [records]);
  const rows = records.map((record, index) => ({ ...record, id: String(record.id || index) }));

  return (
    <DataTable
      rows={rows}
      emptyTitle={emptyTitle}
      emptyDetail={emptyDetail}
      columns={keys.map((key) => ({
        key,
        header: key,
        cell: (row) => <span className="break-words text-sm">{formatUnknown(row[key])}</span>
      }))}
    />
  );
}

function formatUnknown(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function RelationshipsRoute() {
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, graph] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<RelationshipGraph>("/v1/relationships/graph")
    ]);
    return { connection, graph };
  });

  return (
    <PrivateStateGate state={state} title="Relationship review" detail="CompanyCore is loading the relationship graph." onRetry={reload}>
      {({ connection, graph }) => (
        <Shell connection={connection} appLabel="Relationship review">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <p className="eyebrow">Operating graph</p>
                <h1 className="text-3xl font-black">Relationships that agents can trust</h1>
                <p className="text-sm leading-6 text-company-muted">Direct, provider-derived, route-inferred, and review-needed links stay visible before AI relies on them.</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <MetricCard icon="ph-dots-three-circle" label="Nodes" value={`${graph.nodes?.length || 0}`} detail="Known graph entities" />
                  <MetricCard icon="ph-git-branch" label="Edges" value={`${graph.edges?.length || 0}`} detail="Readable relationships" />
                  <MetricCard icon="ph-warning-circle" label="Review" value={`${graph.reviewItems?.length || 0}`} detail="Needs owner context" />
                  <MetricCard icon="ph-prohibit" label="Unsupported" value={`${graph.unsupportedFamilies?.length || 0}`} detail="Not inferred as facts" />
                </div>
              </div>
            </section>
            <GenericRecordTable records={graph.reviewItems || []} emptyTitle="No review items" emptyDetail="No relationship review items are currently reported." />
            <GenericRecordTable records={graph.edges || []} emptyTitle="No graph edges" emptyDetail="No relationship edges are available yet." />
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

function PipelineRoute() {
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, clients, stages, deals, interactions] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<Array<Record<string, unknown>>>("/v1/clients").catch(() => []),
      ownerApi<Array<Record<string, unknown>>>("/v1/pipeline-stages").catch(() => []),
      ownerApi<Array<Record<string, unknown>>>("/v1/deals").catch(() => []),
      ownerApi<Array<Record<string, unknown>>>("/v1/interactions").catch(() => [])
    ]);
    return { connection, bundle: { clients, stages, deals, interactions } as PipelineBundle };
  });

  return (
    <PrivateStateGate state={state} title="Pipeline / CRM" detail="CompanyCore is loading CRM and workflow records." onRetry={reload}>
      {({ connection, bundle }) => {
        const feed = [...bundle.deals, ...bundle.clients, ...bundle.interactions, ...bundle.stages];
        return (
          <Shell connection={connection} appLabel="Pipeline / CRM">
            <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
              <section className="card border border-base-300 bg-base-100 shadow-sm">
                <div className="card-body gap-4">
                  <p className="eyebrow">Commercial operating lane</p>
                  <h1 className="text-3xl font-black">Pipeline, clients, deals, and touchpoints</h1>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <MetricCard icon="ph-users" label="Clients" value={`${bundle.clients.length}`} detail="Relationship accounts" />
                    <MetricCard icon="ph-flow-arrow" label="Stages" value={`${bundle.stages.length}`} detail="Reusable pipeline stages" />
                    <MetricCard icon="ph-handshake" label="Deals" value={`${bundle.deals.length}`} detail="Commercial opportunities" />
                    <MetricCard icon="ph-chat-circle" label="Interactions" value={`${bundle.interactions.length}`} detail="Relationship touchpoints" />
                  </div>
                </div>
              </section>
              <GenericRecordTable records={feed} emptyTitle="No pipeline records" emptyDetail="No CRM or pipeline records are available yet." />
            </section>
          </Shell>
        );
      }}
    </PrivateStateGate>
  );
}

type SettingsTabId = "connections" | "agents" | "mcp";

const settingsTabs: Array<{ id: SettingsTabId; label: string }> = [
  { id: "connections", label: "Integrations" },
  { id: "agents", label: "Agent keys" },
  { id: "mcp", label: "MCP" }
];

const settingsIntegrations: Array<{
  id: SettingsIntegrationId;
  label: string;
  purpose: string;
  providerName: "clickup" | "googleDrive";
}> = [
  {
    id: "clickup",
    label: "ClickUp",
    purpose: "Tasks, spaces, folders, lists, webhooks, and task sync.",
    providerName: "clickup"
  },
  {
    id: "google_drive",
    label: "Google Drive",
    purpose: "Knowledge files, folder scope, OAuth, and Drive change sync.",
    providerName: "googleDrive"
  }
];

function initialSettingsTab(): SettingsTabId {
  const path = window.location.pathname;
  if (path.includes("/settings/api")) {
    return "agents";
  }
  if (path.includes("/react-agent-tools")) {
    return "mcp";
  }
  if (path.includes("/settings/drive") || path.includes("/settings/integrations")) {
    return "connections";
  }
  return "connections";
}

function listFromForm(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToInput(config: Record<string, unknown> | undefined, key: string) {
  const value = config?.[key];
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").join(", ") : "";
}

function stringFromConfig(config: Record<string, unknown> | undefined, key: string, fallback = "") {
  const value = config?.[key];
  return typeof value === "string" ? value : fallback;
}

function UnifiedSettingsRoute() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => initialSettingsTab());
  const [activeIntegration, setActiveIntegration] = useState<SettingsIntegrationId>(() => (
    window.location.pathname.includes("/settings/drive") ? "google_drive" : "clickup"
  ));
  const [integrationPane, setIntegrationPane] = useState<IntegrationPaneId>("setup");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [integrationAction, setIntegrationAction] = useState<SettingsIntegrationId | null>(null);
  const [syncAction, setSyncAction] = useState<string | null>(null);
  const [clickUpDiscovery, setClickUpDiscovery] = useState<ClickUpDiscoveryResult | null>(null);
  const [driveFolders, setDriveFolders] = useState<GoogleDriveFolderOption[] | null>(null);
  const [driveFolderAreaDraft, setDriveFolderAreaDraft] = useState<Record<string, string>>({});
  const [settingsNotice, setSettingsNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, keys, profiles, clickupSetting, driveSetting, externalMappings, driveFiles] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<ApiKeyRecord[]>("/v1/api-keys").catch(() => []),
      ownerApi<AgentKeyProfile[]>("/v1/api-keys/profiles").catch(() => []),
      ownerApi<IntegrationSettingRecord>("/v1/integration-settings/clickup").catch(() => null),
      ownerApi<IntegrationSettingRecord>("/v1/integration-settings/google_drive").catch(() => null),
      ownerApi<ExternalContainerMapping[]>("/v1/operating-model/external-mappings").catch(() => []),
      ownerApi<GoogleDriveFileRecord[]>("/v1/google-drive/files").catch(() => [])
    ]);
    return { connection, keys, profiles, externalMappings, driveFiles, integrationSettings: { clickup: clickupSetting, google_drive: driveSetting } };
  });

  async function toggleIntegrationActive(provider: SettingsIntegrationId, nextActive: boolean) {
    const label = settingsIntegrations.find((integration) => integration.id === provider)?.label || provider;
    setIntegrationAction(provider);
    setSettingsNotice(null);
    try {
      await ownerApi(`/v1/integration-settings/${provider}`, {
        method: "PUT",
        body: JSON.stringify({ active: nextActive })
      });
      setSettingsNotice({
        tone: "success",
        title: nextActive ? `${label} enabled` : `${label} disabled`,
        detail: nextActive
          ? "CompanyCore can use this connector again during sync and connector actions."
          : "Existing imported data stays available, but new sync and connector actions stop using this integration."
      });
      reload();
    } catch (error) {
      setSettingsNotice({
        tone: "error",
        title: `${label} was not updated`,
        detail: apiErrorMessage(error)
      });
    } finally {
      setIntegrationAction(null);
    }
  }

  async function discoverClickUpStructure() {
    const teamId = stringFromConfig(state.status === "ready" ? (state.data.integrationSettings.clickup?.config || state.data.connection.integrations.clickup.config || {}) : {}, "teamId");
    setSyncAction("clickup-discover");
    setSettingsNotice(null);
    try {
      const result = await ownerApi<ClickUpDiscoveryResult>("/v1/integration-settings/clickup/discover", {
        method: "POST",
        body: JSON.stringify({ useStoredToken: true, ...(teamId ? { teamId } : {}) })
      });
      setClickUpDiscovery(result);
      setSettingsNotice({ tone: "success", title: "ClickUp structure discovered", detail: "CompanyCore refreshed ClickUp workspace, space, folder, and list mappings." });
      reload();
    } catch (error) {
      setSettingsNotice({ tone: "error", title: "ClickUp discovery failed", detail: apiErrorMessage(error) });
    } finally {
      setSyncAction(null);
    }
  }

  async function discoverDriveFolders() {
    setSyncAction("drive-discover");
    setSettingsNotice(null);
    try {
      const folders = await ownerApi<GoogleDriveFolderOption[]>("/v1/integration-settings/google_drive/folders/discover");
      setDriveFolders(folders);
      if (state.status === "ready") {
        const config = state.data.integrationSettings.google_drive?.config || state.data.connection.integrations.googleDrive.config || {};
        const mappings = Array.isArray(config.operatingScopeMappings) ? config.operatingScopeMappings : [];
        setDriveFolderAreaDraft(Object.fromEntries(mappings
          .filter((mapping): mapping is { folderId: string; operatingAreaId: string } => (
            Boolean(mapping)
            && typeof mapping === "object"
            && "folderId" in mapping
            && "operatingAreaId" in mapping
            && typeof mapping.folderId === "string"
            && typeof mapping.operatingAreaId === "string"
          ))
          .map((mapping) => [mapping.folderId, mapping.operatingAreaId])));
      }
      setSettingsNotice({ tone: "success", title: "Drive folders discovered", detail: `${folders.length} folders are available for scope selection.` });
    } catch (error) {
      setSettingsNotice({ tone: "error", title: "Drive folder discovery failed", detail: apiErrorMessage(error) });
    } finally {
      setSyncAction(null);
    }
  }

  async function runIntegrationSync(action: "clickup-maintenance" | "clickup-sync" | "drive-import" | "drive-reconcile") {
    setSyncAction(action);
    setSettingsNotice(null);
    try {
      if (action === "clickup-maintenance") {
        await ownerApi("/v1/integration-settings/clickup/maintenance/run", { method: "POST", body: JSON.stringify({}) });
      } else if (action === "clickup-sync") {
        await ownerApi("/v1/tasks/sync/clickup/native", { method: "POST", body: JSON.stringify({}) });
      } else if (action === "drive-import") {
        const config = state.status === "ready" ? (state.data.integrationSettings.google_drive?.config || state.data.connection.integrations.googleDrive.config || {}) : {};
        await ownerApi("/v1/integration-settings/google_drive/import", {
          method: "POST",
          body: JSON.stringify({
            folderIds: Array.isArray(config.selectedFolderIds) ? config.selectedFolderIds : undefined,
            importMode: stringFromConfig(config, "importMode", "merge")
          })
        });
      } else {
        await ownerApi("/v1/integration-settings/google_drive/changes/reconcile", { method: "POST", body: JSON.stringify({}) });
      }
      setSettingsNotice({ tone: "success", title: "Integration action finished", detail: "CompanyCore completed the requested provider action." });
      reload();
    } catch (error) {
      setSettingsNotice({ tone: "error", title: "Integration action failed", detail: apiErrorMessage(error) });
    } finally {
      setSyncAction(null);
    }
  }

  async function assignMappingArea(mappingId: string, areaId: string) {
    if (!areaId) {
      return;
    }
    setSyncAction(`mapping-${mappingId}`);
    setSettingsNotice(null);
    try {
      await ownerApi(`/v1/operating-model/external-mappings/${mappingId}/scope`, {
        method: "PATCH",
        body: JSON.stringify({ areaId, applyToChildren: true })
      });
      setSettingsNotice({ tone: "success", title: "Mapping saved", detail: "Provider element is now scoped to the selected CompanyCore area." });
      reload();
    } catch (error) {
      setSettingsNotice({ tone: "error", title: "Mapping failed", detail: apiErrorMessage(error) });
    } finally {
      setSyncAction(null);
    }
  }

  async function saveDriveFolderMappings(folders: GoogleDriveFolderOption[], config: Record<string, unknown>, active: boolean) {
    const operatingScopeMappings = Object.entries(driveFolderAreaDraft)
      .filter(([, areaId]) => Boolean(areaId))
      .map(([folderId, operatingAreaId]) => ({ folderId, operatingAreaId }));
    const selectedFolderIds = [...new Set([
      ...folders.filter((folder) => folder.selected).map((folder) => folder.id),
      ...operatingScopeMappings.map((mapping) => mapping.folderId)
    ])];

    setSyncAction("drive-mapping-save");
    setSettingsNotice(null);
    try {
      await ownerApi("/v1/integration-settings/google_drive", {
        method: "PUT",
        body: JSON.stringify({
          active,
          config: {
            rootFolderIds: selectedFolderIds,
            selectedFolderIds,
            sharedDriveIds: Array.isArray(config.sharedDriveIds) ? config.sharedDriveIds : [],
            syncMode: stringFromConfig(config, "syncMode", "pull"),
            importMode: stringFromConfig(config, "importMode", "merge"),
            ...(stringFromConfig(config, "changesPageToken") ? { changesPageToken: stringFromConfig(config, "changesPageToken") } : {}),
            operatingScopeMappings
          }
        })
      });
      setSettingsNotice({ tone: "success", title: "Drive mapping saved", detail: `${operatingScopeMappings.length} folder mapping${operatingScopeMappings.length === 1 ? "" : "s"} will be applied during import.` });
      reload();
    } catch (error) {
      setSettingsNotice({ tone: "error", title: "Drive mapping was not saved", detail: apiErrorMessage(error) });
    } finally {
      setSyncAction(null);
    }
  }

  async function saveIntegration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const provider = String(form.get("provider") || activeIntegration) as SettingsIntegrationId;
    const active = form.get("active") === "on";
    const syncMode = String(form.get("syncMode") || "pull") as "pull" | "two_way";
    const importMode = String(form.get("importMode") || "merge");

    if (provider === "clickup") {
      const token = String(form.get("token") || "").trim();
      const teamId = String(form.get("teamId") || "").trim();
      await ownerApi("/v1/integration-settings/clickup", {
        method: "PUT",
        body: JSON.stringify({
          ...(token ? { token } : {}),
          active,
          config: {
            ...(teamId ? { teamId } : {}),
            spaceIds: listFromForm(form.get("spaceIds")),
            folderIds: listFromForm(form.get("folderIds")),
            listIds: listFromForm(form.get("listIds")),
            syncMode,
            importMode
          }
        })
      });
      setSettingsNotice({ tone: "success", title: "ClickUp saved", detail: "Credentials and sync preferences were saved for this workspace." });
    } else {
      const clientId = String(form.get("clientId") || "").trim();
      const clientSecret = String(form.get("clientSecret") || "").trim();
      const changesPageToken = String(form.get("changesPageToken") || "").trim();
      await ownerApi("/v1/integration-settings/google_drive", {
        method: "PUT",
        body: JSON.stringify({
          ...(clientId ? {
            oauthClient: {
              clientId,
              ...(clientSecret ? { clientSecret } : {})
            }
          } : {}),
          active,
          config: {
            rootFolderIds: listFromForm(form.get("rootFolderIds")),
            sharedDriveIds: listFromForm(form.get("sharedDriveIds")),
            selectedFolderIds: listFromForm(form.get("selectedFolderIds")),
            syncMode,
            importMode,
            ...(changesPageToken ? { changesPageToken } : {})
          }
        })
      });
      setSettingsNotice({ tone: "success", title: "Google Drive saved", detail: "OAuth client and sync preferences were saved for this workspace." });
    }
    reload();
  }

  async function createAgentKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profileId = String(form.get("profileId") || "");
    const agentName = String(form.get("agentName") || "Agent");
    const result = await ownerApi<ApiKeyRecord & { key?: string }>("/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: `${agentName} CompanyCore key`, profileId })
    });
    setCreatedKey(result.key || null);
    setSettingsNotice({
      tone: "success",
      title: `${agentName} key created`,
      detail: "Copy the key once, then store it in the agent runtime secret configuration."
    });
    reload();
  }

  return (
    <PrivateStateGate state={state} title="Settings" detail="CompanyCore is loading simple workspace settings." onRetry={reload}>
      {({ connection, keys, profiles, integrationSettings, externalMappings, driveFiles }) => {
        const clickup = connection.integrations.clickup;
        const drive = connection.integrations.googleDrive;
        const activeKeys = keys.filter((key) => key.active);
        const readerProfile = profiles.find((profile) => profile.id.includes("reader")) || profiles[0];
        const selectedMeta = settingsIntegrations.find((integration) => integration.id === activeIntegration) || settingsIntegrations[0];
        const selectedState = connection.integrations[selectedMeta.providerName];
        const selectedSetting = integrationSettings[activeIntegration] || null;
        const selectedConfig = selectedSetting?.config || selectedState.config || {};
        const driveScopeMappings = Array.isArray(selectedConfig.operatingScopeMappings) ? selectedConfig.operatingScopeMappings : [];
        const areas = connection.operatingModel.areas || [];
        const providerMappings = externalMappings.filter((mapping) => mapping.provider === activeIntegration);
        const visibleDriveFolders = driveFolders || driveFiles.filter((file) => file.isFolder).map((file) => ({
          id: file.externalId,
          name: file.name,
          path: file.name,
          parentId: file.parentExternalId || null,
          depth: 0,
          selected: (Array.isArray(selectedConfig.selectedFolderIds) ? selectedConfig.selectedFolderIds : []).includes(file.externalId),
          selectedAncestor: false,
          selectedDescendantCount: 0,
          imported: true,
          directImportedItemCount: 0,
          childCount: 0,
          descendantCount: 0
        } as GoogleDriveFolderOption));

        return (
          <Shell connection={connection} appLabel="Settings">
            <section className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-8">
              <section className="grid gap-2">
                <p className="eyebrow">Settings</p>
                <h1 className="text-3xl font-black leading-tight">Integration settings</h1>
                <p className="text-sm leading-6 text-company-muted">Choose a connector, save its credentials, and set the small sync policy that the backend already supports.</p>
              </section>

              <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
                {settingsTabs.map((tab) => (
                  <button
                    className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    key={tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {settingsNotice ? <LocalNotice tone={settingsNotice.tone} title={settingsNotice.title} detail={settingsNotice.detail} /> : null}

              {activeTab === "connections" ? (
                <section className="grid gap-4 lg:grid-cols-[18rem_1fr] lg:items-start">
                  <aside className="grid gap-2">
                    {settingsIntegrations.map((integration) => {
                      const providerState = connection.integrations[integration.providerName];
                      const providerSetting = integrationSettings[integration.id];
                      const configured = providerState.configured || providerState.oauthClientConfigured || Boolean(providerSetting?.secretConfigured);
                      const active = Boolean(providerSetting?.active ?? providerState.active);
                      return (
                        <article
                          className={`rounded-company border bg-base-100 transition ${activeIntegration === integration.id ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50"}`}
                          key={integration.id}
                        >
                          <button
                            className="block w-full p-4 text-left"
                            type="button"
                            onClick={() => setActiveIntegration(integration.id)}
                          >
                            <span className="block text-sm font-black">{integration.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-company-muted">{integration.purpose}</span>
                            <span className="mt-3 block text-xs font-bold text-company-muted">{configured ? "Configured" : "Needs credentials"}</span>
                          </button>
                          <label className="flex items-center justify-between gap-3 border-t border-base-300 px-4 py-3 text-xs font-bold">
                            <span>{active ? "Active" : "Disabled"}</span>
                            <input
                              className="toggle toggle-primary toggle-sm"
                              type="checkbox"
                              checked={active}
                              disabled={integrationAction === integration.id || !configured}
                              onChange={(event) => void toggleIntegrationActive(integration.id, event.target.checked)}
                              aria-label={`${active ? "Disable" : "Enable"} ${integration.label}`}
                            />
                          </label>
                        </article>
                      );
                    })}
                  </aside>

                  <form className="rounded-company border border-base-300 bg-base-100 p-5 shadow-sm" onSubmit={saveIntegration} key={activeIntegration}>
                    <input type="hidden" name="provider" value={activeIntegration} />
                    <div className="grid gap-5">
                      <div className="grid gap-1">
                        <h2 className="text-2xl font-black">{selectedMeta.label}</h2>
                        <p className="text-sm leading-6 text-company-muted">{selectedMeta.purpose}</p>
                      </div>

                      <nav className="flex flex-wrap gap-2" aria-label={`${selectedMeta.label} integration sections`}>
                        {[
                          ["setup", "Setup"],
                          ["mapping", "Mapping"],
                          ["sync", "Sync"]
                        ].map(([id, label]) => (
                          <button
                            className={`btn btn-xs ${integrationPane === id ? "btn-primary" : "btn-outline"}`}
                            type="button"
                            onClick={() => setIntegrationPane(id as IntegrationPaneId)}
                            key={id}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>

                      {integrationPane === "setup" ? (
                        <>
                      <label className="flex items-center justify-between gap-3 rounded-company border border-base-300 bg-base-200/40 px-4 py-3 text-sm font-bold">
                        <span>Integration active</span>
                        <input className="toggle toggle-primary" name="active" type="checkbox" defaultChecked={selectedSetting?.active ?? selectedState.active ?? true} />
                      </label>

                      {activeIntegration === "clickup" ? (
                        <div className="grid gap-4">
                          <label className="form-control">
                            <span className="label-text font-bold">API token</span>
                            <input className="input input-bordered" name="token" type="password" autoComplete="off" placeholder={clickup.configured ? "Leave empty to keep saved token" : "pk_..."} required={!clickup.configured} />
                          </label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="form-control">
                              <span className="label-text font-bold">Workspace / team ID</span>
                              <input className="input input-bordered" name="teamId" defaultValue={stringFromConfig(selectedConfig, "teamId")} placeholder="ClickUp team ID" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">List IDs</span>
                              <input className="input input-bordered" name="listIds" defaultValue={listToInput(selectedConfig, "listIds")} placeholder="Comma-separated list IDs" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Space IDs</span>
                              <input className="input input-bordered" name="spaceIds" defaultValue={listToInput(selectedConfig, "spaceIds")} placeholder="Optional, comma-separated" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Folder IDs</span>
                              <input className="input input-bordered" name="folderIds" defaultValue={listToInput(selectedConfig, "folderIds")} placeholder="Optional, comma-separated" />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="form-control">
                              <span className="label-text font-bold">Client ID</span>
                              <input className="input input-bordered" name="clientId" autoComplete="off" placeholder={drive.oauthClientConfigured ? "Leave empty to keep saved client" : "Google OAuth client ID"} required={!drive.oauthClientConfigured} />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Client secret</span>
                              <input className="input input-bordered" name="clientSecret" type="password" autoComplete="off" placeholder="Google OAuth client secret" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Root folder IDs</span>
                              <input className="input input-bordered" name="rootFolderIds" defaultValue={listToInput(selectedConfig, "rootFolderIds")} placeholder="Comma-separated folder IDs" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Selected folder IDs</span>
                              <input className="input input-bordered" name="selectedFolderIds" defaultValue={listToInput(selectedConfig, "selectedFolderIds")} placeholder="Comma-separated folder IDs" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Shared drive IDs</span>
                              <input className="input input-bordered" name="sharedDriveIds" defaultValue={listToInput(selectedConfig, "sharedDriveIds")} placeholder="Optional, comma-separated" />
                            </label>
                            <label className="form-control">
                              <span className="label-text font-bold">Changes page token</span>
                              <input className="input input-bordered" name="changesPageToken" defaultValue={stringFromConfig(selectedConfig, "changesPageToken")} placeholder="Optional Drive page token" />
                            </label>
                          </div>
                        </div>
                      )}

                      <section className="grid gap-3 border-t border-base-300 pt-4">
                        <h3 className="text-base font-black">Sync policy</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="form-control">
                            <span className="label-text font-bold">Sync mode</span>
                            <select className="select select-bordered" name="syncMode" defaultValue={stringFromConfig(selectedConfig, "syncMode", "pull")}>
                              <option value="pull">Pull into CompanyCore</option>
                              <option value="two_way">Two-way</option>
                            </select>
                          </label>
                          <label className="form-control">
                            <span className="label-text font-bold">Import mode</span>
                            <select className="select select-bordered" name="importMode" defaultValue={stringFromConfig(selectedConfig, "importMode", "merge")}>
                              <option value="merge">Merge</option>
                              <option value="skip_existing">Skip existing</option>
                              {activeIntegration === "clickup" ? <option value="replace_selected_lists">Replace selected lists</option> : null}
                              {activeIntegration === "google_drive" ? <option value="replace_selected_folders">Replace selected folders</option> : null}
                              <option value="inspect_only">Inspect only</option>
                            </select>
                          </label>
                        </div>
                        <p className="text-xs leading-5 text-company-muted">This saves the policy only. Running import, reconcile, mapping, and review stays in the dedicated integration work views.</p>
                      </section>

                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-primary" type="submit">Save {selectedMeta.label}</button>
                      </div>
                        </>
                      ) : null}

                      {integrationPane === "mapping" ? (
                        <section className="grid gap-4">
                          <LocalNotice
                            tone="info"
                            title="Map before sync"
                            detail={activeIntegration === "clickup"
                              ? "Discover ClickUp first, then map spaces, folders, and lists to CompanyCore areas before running sync."
                              : "Discover Drive folders, save selected folder scope, then map imported folders/files to CompanyCore areas in the area workbench."}
                          />
                          <div className="flex flex-wrap gap-2">
                            {activeIntegration === "clickup" ? (
                              <button className="btn btn-outline" type="button" onClick={() => void discoverClickUpStructure()} disabled={syncAction === "clickup-discover" || !selectedState.active}>
                                {syncAction === "clickup-discover" ? "Discovering..." : "Discover ClickUp structure"}
                              </button>
                            ) : (
                              <button className="btn btn-outline" type="button" onClick={() => void discoverDriveFolders()} disabled={syncAction === "drive-discover" || !selectedState.active}>
                                {syncAction === "drive-discover" ? "Discovering..." : "Discover Drive folders"}
                              </button>
                            )}
                          </div>
                          {activeIntegration === "clickup" ? (
                            <div className="grid gap-2">
                              {providerMappings.length > 0 ? providerMappings.slice(0, 16).map((mapping) => (
                                <div className="grid gap-3 rounded-company border border-base-300 p-3 sm:grid-cols-[1fr_14rem]" key={mapping.id}>
                                  <div>
                                    <p className="text-sm font-black">{mapping.name || mapping.externalId}</p>
                                    <p className="text-xs text-company-muted">{mapping.entityType} · {mapping.externalId}</p>
                                  </div>
                                  <select
                                    className="select select-bordered select-sm"
                                    defaultValue={mapping.areaId || ""}
                                    onChange={(event) => void assignMappingArea(mapping.id, event.target.value)}
                                    disabled={syncAction === `mapping-${mapping.id}`}
                                  >
                                    <option value="">Choose area</option>
                                    {areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
                                  </select>
                                </div>
                              )) : <p className="text-sm text-company-muted">No ClickUp mappings yet. Run discovery after saving the token and team ID.</p>}
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {visibleDriveFolders.length > 0 ? visibleDriveFolders.slice(0, 16).map((folder) => (
                                <div className="grid gap-3 rounded-company border border-base-300 p-3 sm:grid-cols-[1fr_14rem]" key={folder.id}>
                                  <div>
                                    <span className="block text-sm font-black">{folder.name}</span>
                                    <span className="block text-xs text-company-muted">{folder.path}</span>
                                  </div>
                                  <select
                                    className="select select-bordered select-sm"
                                    value={driveFolderAreaDraft[folder.id] ?? (driveScopeMappings.find((mapping) => (
                                      mapping
                                      && typeof mapping === "object"
                                      && !Array.isArray(mapping)
                                      && (mapping as Record<string, unknown>).folderId === folder.id
                                    )) as Record<string, unknown> | undefined)?.operatingAreaId as string | undefined ?? ""}
                                    onChange={(event) => setDriveFolderAreaDraft((current) => ({ ...current, [folder.id]: event.target.value }))}
                                  >
                                    <option value="">Choose area</option>
                                    {areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
                                  </select>
                                </div>
                              )) : <p className="text-sm text-company-muted">No Drive folders loaded yet. Run discovery after OAuth setup.</p>}
                              <div className="flex flex-wrap gap-2">
                                <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveDriveFolderMappings(visibleDriveFolders, selectedConfig, Boolean(selectedSetting?.active ?? selectedState.active))} disabled={syncAction === "drive-mapping-save" || visibleDriveFolders.length === 0}>
                                  {syncAction === "drive-mapping-save" ? "Saving..." : "Save Drive mapping"}
                                </button>
                              </div>
                              <p className="text-xs text-company-muted">Saved folder mappings are stored in Google Drive integration config and applied during import to CompanyCore records.</p>
                            </div>
                          )}
                        </section>
                      ) : null}

                      {integrationPane === "sync" ? (
                        <section className="grid gap-4">
                          <LocalNotice
                            tone={selectedState.active ? "info" : "warning"}
                            title={selectedState.active ? "Sync uses saved mapping" : `${selectedMeta.label} is disabled`}
                            detail={selectedState.active
                              ? "Run sync only after credentials, provider scope, and mapping are ready."
                              : "Existing CompanyCore data remains available, but provider sync/actions are blocked until the integration is active."}
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            {activeIntegration === "clickup" ? (
                              <>
                                <button className="btn btn-outline" type="button" onClick={() => void runIntegrationSync("clickup-maintenance")} disabled={!selectedState.active || syncAction !== null}>
                                  {syncAction === "clickup-maintenance" ? "Running..." : "Run webhook maintenance"}
                                </button>
                                <button className="btn btn-primary" type="button" onClick={() => void runIntegrationSync("clickup-sync")} disabled={!selectedState.active || syncAction !== null}>
                                  {syncAction === "clickup-sync" ? "Syncing..." : "Sync ClickUp tasks"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-outline" type="button" onClick={() => void runIntegrationSync("drive-reconcile")} disabled={!selectedState.active || syncAction !== null}>
                                  {syncAction === "drive-reconcile" ? "Reconciling..." : "Reconcile Drive changes"}
                                </button>
                                <button className="btn btn-primary" type="button" onClick={() => void runIntegrationSync("drive-import")} disabled={!selectedState.active || syncAction !== null}>
                                  {syncAction === "drive-import" ? "Importing..." : "Import selected folders"}
                                </button>
                              </>
                            )}
                          </div>
                          <p className="text-xs leading-5 text-company-muted">Two-way behavior is limited by backend support and provider permissions. CompanyCore keeps working from its own database when integrations are disabled.</p>
                        </section>
                      ) : null}
                    </div>
                  </form>
                </section>
              ) : null}

              {activeTab === "agents" ? (
                <section className="grid gap-4">
                  <form className="rounded-company border border-base-300 bg-base-100 p-4 shadow-sm" onSubmit={createAgentKey}>
                    <div className="grid gap-3">
                      <h2 className="text-xl font-black">Create API key</h2>
                      <label className="form-control">
                        <span className="label-text font-bold">Agent</span>
                        <select className="select select-bordered" name="agentName" defaultValue="Jarvis">
                          <option value="Jarvis">Jarvis</option>
                          <option value="Paperclip">Paperclip</option>
                          <option value="External app">External app</option>
                        </select>
                      </label>
                      <label className="form-control">
                        <span className="label-text font-bold">Access profile</span>
                        <select className="select select-bordered" name="profileId" defaultValue={readerProfile?.id || ""}>
                          {profiles.map((profile) => (
                            <option value={profile.id} key={profile.id}>{profile.label}</option>
                          ))}
                        </select>
                      </label>
                      <button className="btn btn-primary" type="submit" disabled={profiles.length === 0}>Create agent key</button>
                      {createdKey ? <LocalNotice tone="warning" title="Copy once" detail={createdKey} /> : null}
                    </div>
                  </form>
                  <section className="rounded-company border border-base-300 bg-base-100 p-4 shadow-sm">
                    <h2 className="text-xl font-black">Existing keys</h2>
                    <div className="mt-3 grid gap-2 text-sm">
                      {activeKeys.length > 0 ? activeKeys.map((key) => (
                        <div className="rounded-company border border-base-300 p-3" key={key.id}>
                          {key.name}
                        </div>
                      )) : <p className="text-company-muted">No active keys.</p>}
                    </div>
                  </section>
                </section>
              ) : null}

              {activeTab === "mcp" ? (
                <section className="rounded-company border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="grid gap-3">
                    <h2 className="text-xl font-black">MCP</h2>
                    <label className="form-control">
                      <span className="label-text font-bold">Manifest URL</span>
                      <input className="input input-bordered" value="/v1/mcp/manifest" readOnly />
                    </label>
                    <label className="form-control">
                      <span className="label-text font-bold">Local server command</span>
                      <input className="input input-bordered" value="npm run mcp:server" readOnly />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <a className="btn btn-primary" href="/settings/api">Create API key</a>
                      <a className="btn btn-outline" href="/react-company-os">Open Company OS</a>
                    </div>
                  </div>
                </section>
              ) : null}
            </section>
          </Shell>
        );
      }}
    </PrivateStateGate>
  );
}

function ApiSettingsRoute() {
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, keys, profiles, manifest] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<ApiKeyRecord[]>("/v1/api-keys"),
      ownerApi<AgentKeyProfile[]>("/v1/api-keys/profiles"),
      ownerApi<McpManifest>("/v1/mcp/manifest")
    ]);
    return { connection, keys, profiles, manifest };
  });

  async function createKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const profileId = String(form.get("profileId") || "");
    const name = String(form.get("name") || "Agent service key");
    const result = await ownerApi<ApiKeyRecord & { key?: string }>("/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, profileId })
    });
    setCreatedKey(result.key || null);
    reload();
  }

  return (
    <PrivateStateGate state={state} title="Agent access" detail="CompanyCore is loading API keys and MCP capability context." onRetry={reload}>
      {({ connection, keys, profiles, manifest }) => (
        <Shell connection={connection} appLabel="Agent access">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <p className="eyebrow">Agent service keys</p>
                <h1 className="text-3xl font-black">Least-privilege access for Jarvis and Paperclip</h1>
                <div className="grid gap-3 sm:grid-cols-4">
                  <MetricCard icon="ph-key" label="Keys" value={`${keys.length}`} detail="Workspace service keys" />
                  <MetricCard icon="ph-check-circle" label="Active" value={`${keys.filter((key) => key.active).length}`} detail="Currently usable keys" />
                  <MetricCard icon="ph-robot" label="MCP tools" value={`${manifest.tools.length}`} detail="Visible tool manifest" />
                  <MetricCard icon="ph-shield-warning" label="Supervised" value={`${manifest.tools.filter((tool) => tool.requiresApproval).length}`} detail="Approval-aware tools" />
                </div>
              </div>
            </section>
            <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <form className="card border border-base-300 bg-base-100 shadow-sm" onSubmit={createKey}>
                <div className="card-body gap-4">
                  <h2 className="text-xl font-black">Create scoped key</h2>
                  <label className="form-control">
                    <span className="label-text font-bold">Key name</span>
                    <input className="input input-bordered" name="name" placeholder="Jarvis operator" required />
                  </label>
                  <label className="form-control">
                    <span className="label-text font-bold">Profile</span>
                    <select className="select select-bordered" name="profileId" defaultValue={profiles[0]?.id || ""}>
                      {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.label}</option>)}
                    </select>
                  </label>
                  <button className="btn btn-primary" type="submit">Create key</button>
                  {createdKey ? <LocalNotice tone="warning" title="Copy once" detail={createdKey} /> : null}
                </div>
              </form>
              <GenericRecordTable records={keys as unknown as Array<Record<string, unknown>>} emptyTitle="No service keys" emptyDetail="Create a scoped key when an agent needs access." />
            </section>
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

type GoogleDriveFolderOption = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  parents?: string[];
  depth: number;
  selected: boolean;
  selectedAncestor: boolean;
  selectedDescendantCount: number;
  imported: boolean;
  directImportedItemCount: number;
  childCount: number;
  descendantCount: number;
  webViewLink?: string;
  modifiedTime?: string;
};

function DriveSettingsRoute() {
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, files, folders] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<GoogleDriveFileRecord[]>("/v1/google-drive/files").catch(() => []),
      ownerApi<GoogleDriveFolderOption[]>("/v1/integration-settings/google_drive/folders/discover").catch(() => [])
    ]);
    return { connection, files, folders };
  });
  const [folderSearch, setFolderSearch] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [driveNotice, setDriveNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const [driveAction, setDriveAction] = useState<"save" | "import" | "reconcile" | null>(null);

  const folders = state.status === "ready" ? state.data.folders : [];
  const files = state.status === "ready" ? state.data.files : [];
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);

  useEffect(() => {
    if (state.status === "ready") {
      setSelectedFolderIds(new Set(state.data.folders.filter((folder) => folder.selected).map((folder) => folder.id)));
    }
  }, [state]);

  function folderHasSelectedAncestor(folder: GoogleDriveFolderOption, selectedIds = selectedFolderIds) {
    const visited = new Set<string>();
    let parentId = folder.parentId;
    while (parentId && !visited.has(parentId)) {
      if (selectedIds.has(parentId)) {
        return true;
      }
      visited.add(parentId);
      parentId = folderById.get(parentId)?.parentId ?? null;
    }
    return false;
  }

  const visibleFolders = useMemo(() => {
    const query = folderSearch.trim().toLowerCase();
    return folders.filter((folder) => {
      const selected = selectedFolderIds.has(folder.id);
      const includedByAncestor = folderHasSelectedAncestor(folder);
      const matchesQuery = !query || folder.path.toLowerCase().includes(query) || folder.name.toLowerCase().includes(query);
      const matchesScope = !showSelectedOnly || selected || includedByAncestor;
      return matchesQuery && matchesScope;
    });
  }, [folders, folderSearch, showSelectedOnly, selectedFolderIds, folderById]);

  const includedFolderCount = useMemo(() => (
    folders.filter((folder) => selectedFolderIds.has(folder.id) || folderHasSelectedAncestor(folder)).length
  ), [folders, selectedFolderIds, folderById]);

  const selectedFolders = useMemo(() => (
    folders.filter((folder) => selectedFolderIds.has(folder.id))
  ), [folders, selectedFolderIds]);

  function toggleFolder(folderId: string) {
    setSelectedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  async function saveDriveFolders() {
    const folderIds = Array.from(selectedFolderIds);
    setDriveAction("save");
    setDriveNotice(null);
    try {
      await ownerApi("/v1/integration-settings/google_drive", {
        method: "PUT",
        body: JSON.stringify({
          active: true,
          config: {
            selectedFolderIds: folderIds,
            rootFolderIds: folderIds,
            importMode: "merge"
          }
        })
      });
      setDriveNotice({ tone: "success", title: "Drive scope saved", detail: `${folderIds.length} root folder${folderIds.length === 1 ? "" : "s"} selected for import.` });
      reload();
    } catch (error) {
      setDriveNotice({ tone: "error", title: "Drive scope was not saved", detail: apiErrorMessage(error) });
    } finally {
      setDriveAction(null);
    }
  }

  async function runDriveAction(action: "import" | "reconcile") {
    const folderIds = Array.from(selectedFolderIds);
    setDriveAction(action);
    setDriveNotice(null);
    try {
      if (action === "import") {
        await ownerApi("/v1/integration-settings/google_drive/import", {
          method: "POST",
          body: JSON.stringify({
            importMode: "merge",
            folderIds: folderIds.length > 0 ? folderIds : undefined
          })
        });
      } else {
        await ownerApi("/v1/integration-settings/google_drive/changes/reconcile", { method: "POST", body: JSON.stringify({}) });
      }
      setDriveNotice({
        tone: "success",
        title: action === "import" ? "Drive import finished" : "Drive reconcile finished",
        detail: action === "import" ? `${folderIds.length} selected root folder${folderIds.length === 1 ? "" : "s"} processed.` : "CompanyCore checked Drive changes for the active token."
      });
      reload();
    } catch (error) {
      setDriveNotice({
        tone: "error",
        title: action === "import" ? "Drive import failed" : "Drive reconcile failed",
        detail: apiErrorMessage(error)
      });
    } finally {
      setDriveAction(null);
    }
  }

  return (
    <PrivateStateGate state={state} title="Google Drive" detail="CompanyCore is loading Drive integration status and imported files." onRetry={reload}>
      {({ connection }) => (
        <Shell connection={connection} appLabel="Google Drive">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <p className="eyebrow">Knowledge bridge</p>
                    <h1 className="text-3xl font-black">Google Drive files mapped to company areas</h1>
                    <p className="text-sm leading-6 text-company-muted">OAuth setup remains backend-backed; this React surface shows readiness, imported files, and safe sync actions.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-outline" type="button" onClick={() => void saveDriveFolders()} disabled={driveAction !== null}>
                      {driveAction === "save" ? "Saving..." : "Save scope"}
                    </button>
                    <button className="btn btn-outline" type="button" onClick={() => void runDriveAction("import")} disabled={driveAction !== null || selectedFolderIds.size === 0}>
                      {driveAction === "import" ? "Importing..." : "Import selected"}
                    </button>
                    <button className="btn btn-primary" type="button" onClick={() => void runDriveAction("reconcile")} disabled={driveAction !== null}>Reconcile</button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <MetricCard icon="ph-cloud" label="Status" value={connection.integrations.googleDrive.active ? "Active" : "Setup"} detail="Google Drive connection" />
                  <MetricCard icon="ph-tree-structure" label="Scope" value={`${selectedFolderIds.size}`} detail={`${includedFolderCount} folders included`} />
                  <MetricCard icon="ph-folder" label="Folders" value={`${files.filter((file) => file.isFolder).length}`} detail="Imported folders" />
                  <MetricCard icon="ph-file" label="Files" value={`${files.filter((file) => !file.isFolder).length}`} detail="Imported files" />
                </div>
                {driveNotice ? <LocalNotice tone={driveNotice.tone} title={driveNotice.title} detail={driveNotice.detail} /> : null}
              </div>
            </section>
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <label className="form-control">
                    <span className="label-text font-bold">Folder search</span>
                    <input
                      className="input input-bordered"
                      value={folderSearch}
                      onChange={(event) => setFolderSearch(event.target.value)}
                      placeholder="Search folder path"
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded border border-base-300 px-3 py-3 text-sm font-bold">
                    <input
                      className="checkbox checkbox-sm"
                      type="checkbox"
                      checked={showSelectedOnly}
                      onChange={(event) => setShowSelectedOnly(event.target.checked)}
                    />
                    Selected scope
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard icon="ph-check-square" label="Selected roots" value={`${selectedFolders.length}`} detail={selectedFolders.slice(0, 2).map((folder) => folder.name).join(", ") || "No root selected"} />
                  <MetricCard icon="ph-folder-notch-open" label="Visible folders" value={`${visibleFolders.length}`} detail={`${folders.length} discovered from Drive`} />
                  <MetricCard icon="ph-database" label="Imported items" value={`${files.length}`} detail={`${files.filter((file) => file.operatingAreaId).length} mapped to areas`} />
                </div>
                <div className="overflow-hidden rounded border border-base-300">
                  {visibleFolders.length === 0 ? (
                    <div className="p-4">
                      <LocalNotice tone="warning" title="No folders matched" detail="Change the search or reload Drive after OAuth is connected." />
                    </div>
                  ) : (
                    <div className="max-h-[34rem] overflow-auto divide-y divide-base-300">
                      {visibleFolders.map((folder) => {
                        const selected = selectedFolderIds.has(folder.id);
                        const includedByAncestor = !selected && folderHasSelectedAncestor(folder);
                        return (
                          <div className="grid gap-3 p-3 lg:grid-cols-[1fr_auto] lg:items-center" key={folder.id}>
                            <label className="flex min-w-0 items-start gap-3" style={{ paddingLeft: `${Math.min(folder.depth, 8) * 1.1}rem` }}>
                              <input
                                className="checkbox checkbox-sm mt-1 flex-none"
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFolder(folder.id)}
                              />
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-black">{folder.name}</span>
                                  {selected ? <span className="badge badge-primary">root</span> : null}
                                  {includedByAncestor ? <span className="badge badge-ghost">included</span> : null}
                                  {folder.imported ? <span className="badge badge-success">imported</span> : null}
                                </span>
                                <span className="block truncate text-xs text-company-muted">{folder.path}</span>
                              </span>
                            </label>
                            <div className="flex flex-wrap justify-start gap-2 text-xs text-company-muted lg:justify-end">
                              <span className="badge badge-outline">{folder.childCount} child</span>
                              <span className="badge badge-outline">{folder.descendantCount} nested</span>
                              <span className="badge badge-outline">{folder.directImportedItemCount} imported</span>
                              {folder.webViewLink ? <a className="btn btn-ghost btn-xs" href={folder.webViewLink} target="_blank" rel="noreferrer">Open</a> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
            <GenericRecordTable records={files as unknown as Array<Record<string, unknown>>} emptyTitle="No Drive files" emptyDetail="Connect Google Drive and import folders to populate this workbench." />
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

function ClickUpSettingsRoute() {
  const [state, reload] = usePrivateLoader(async () => ownerApi<ConnectionData>("/v1/connection"));
  return (
    <PrivateStateGate state={state} title="ClickUp bridge" detail="CompanyCore is loading ClickUp readiness." onRetry={reload}>
      {(connection) => (
        <Shell connection={connection} appLabel="ClickUp bridge">
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
            <section className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <p className="eyebrow">Task provider</p>
                <h1 className="text-3xl font-black">ClickUp bridge</h1>
                <p className="text-sm leading-6 text-company-muted">The legacy token/list form has been retired from vanilla. This React surface keeps provider status visible while the next React slice adds the full guided connector form.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard icon="ph-plugs" label="Configured" value={connection.integrations.clickup.configured ? "Yes" : "No"} detail="Token saved in CompanyCore" />
                  <MetricCard icon="ph-power" label="Active" value={connection.integrations.clickup.active ? "Yes" : "No"} detail="Sync enabled flag" />
                  <MetricCard icon="ph-list-checks" label="Lists" value={`${connection.integrations.clickup.config?.listIds?.length || 0}`} detail="Selected ClickUp Lists" />
                </div>
                <LocalNotice tone="info" title="Next React slice" detail="ClickUp discovery and list selection will be rebuilt as React components against the existing /v1/integration-settings/clickup routes." />
              </div>
            </section>
          </section>
        </Shell>
      )}
    </PrivateStateGate>
  );
}

function ReadyDashboard({ connection }: { connection: ConnectionData }) {
  return <AreaFirstDashboard connection={connection} />;
}

function ReactDashboardApp() {
  const [dashboardState, reload] = useDashboardState();

  if (dashboardState.status === "ready") {
    return <ReadyDashboard connection={dashboardState.connection} />;
  }

  return <DashboardStatePanel state={dashboardState} onRetry={reload} />;
}

function ReactTasksApp() {
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; detail: string } | null>(null);
  const [state, reload] = usePrivateLoader(async () => {
    const [connection, tasks, companyOs, mcpManifest] = await Promise.all([
      ownerApi<ConnectionData>("/v1/connection"),
      ownerApi<TaskRecord[]>("/v1/tasks"),
      ownerApi<CompanyOsData>("/v1/company-os").catch(() => null),
      ownerApi<McpManifest>("/v1/mcp/manifest").catch(() => null)
    ]);
    return { connection, tasks, companyOs, mcpManifest } satisfies TasksDeliveryBundle;
  });

  return (
    <PrivateStateGate state={state} title="Tasks & delivery" detail="CompanyCore is loading task records, Company OS context, and AI handoff readiness." onRetry={reload}>
      {(data) => <TasksWorkbench {...data} notice={notice} onNotice={setNotice} onReload={reload} />}
    </PrivateStateGate>
  );
}

function ReactIntegrationsApp() {
  const [integrationState, reload] = useIntegrationWorkbenchState();

  if (integrationState.status === "ready") {
    return <IntegrationWorkbench connection={integrationState.connection} />;
  }

  if (integrationState.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return <IntegrationStatePanel state={integrationState} onRetry={reload} />;
}

function ReactAreasApp() {
  const [areasState, reload] = useAreasWorkbenchState();

  if (areasState.status === "ready") {
    return (
      <AreasWorkbench
        connection={areasState.connection}
        externalMappings={areasState.externalMappings}
        googleDriveFiles={areasState.googleDriveFiles}
        tableRecords={areasState.tableRecords}
        onReload={reload}
      />
    );
  }

  if (areasState.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return <AreasStatePanel state={areasState} onRetry={reload} />;
}

function ReactCompanyOsApp() {
  const [companyOsState, reload] = useCompanyOsWorkbenchState();

  if (companyOsState.status === "ready") {
    return <CompanyOsWorkbench connection={companyOsState.connection} companyOs={companyOsState.companyOs} onReload={reload} />;
  }

  if (companyOsState.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return <CompanyOsStatePanel state={companyOsState} onRetry={reload} />;
}

function ReactAgentToolsApp() {
  const [surfaceState, reload] = useAgentToolSurfaceState();

  if (surfaceState.status === "ready") {
    return <AgentToolSurfaceWorkbench connection={surfaceState.connection} manifest={surfaceState.manifest} />;
  }

  if (surfaceState.status === "signed-out") {
    return <OwnerLoginRedirect />;
  }

  return <AgentToolSurfaceStatePanel state={surfaceState} onRetry={reload} />;
}

type AppRouteComponent = {
  meta: Pick<AppRouteMeta, "id" | "href" | "title" | "aliases" | "match">;
  component: React.ComponentType;
};

const appRouteComponents: AppRouteComponent[] = [
  {
    meta: { id: "home", href: "/", title: "CompanyCore" },
    component: PublicHomeRoute
  },
  {
    meta: { id: "login", href: "/auth/login", title: "Sign in" },
    component: () => <AuthRoute mode="login" />
  },
  {
    meta: { id: "register", href: "/auth/register", title: "Create account" },
    component: () => <AuthRoute mode="register" />
  },
  {
    meta: { id: "operations", href: "/operations", title: "Operations Cockpit" },
    component: OperationsCockpitRoute
  },
  {
    meta: { id: "areas", href: "/areas", title: "Areas", aliases: ["/react-areas"] },
    component: ReactAreasApp
  },
  {
    meta: { id: "relationships", href: "/relationships", title: "Relationships" },
    component: RelationshipsRoute
  },
  {
    meta: { id: "data", href: "/data", title: "Data", match: "prefix" },
    component: DataRoute
  },
  {
    meta: { id: "tasks", href: "/tasks-adapter", title: "Tasks", aliases: ["/react-tasks"] },
    component: ReactTasksApp
  },
  {
    meta: { id: "pipeline", href: "/pipeline", title: "Pipeline" },
    component: PipelineRoute
  },
  {
    meta: { id: "account", href: "/settings/account", title: "Account" },
    component: AccountSettingsRoute
  },
  {
    meta: { id: "integration-health", href: "/settings/integrations", title: "Integrations", aliases: ["/react-integrations"] },
    component: UnifiedSettingsRoute
  },
  {
    meta: { id: "drive", href: "/settings/drive", title: "Google Drive" },
    component: UnifiedSettingsRoute
  },
  {
    meta: { id: "agent-access", href: "/settings/api", title: "Agent Access" },
    component: UnifiedSettingsRoute
  },
  {
    meta: { id: "settings", href: "/settings", title: "Settings" },
    component: UnifiedSettingsRoute
  },
  {
    meta: { id: "company-os", href: "/react-company-os", title: "Company OS" },
    component: ReactCompanyOsApp
  },
  {
    meta: { id: "agent-tools", href: "/react-agent-tools", title: "Agent Tools" },
    component: UnifiedSettingsRoute
  },
  {
    meta: { id: "dashboard", href: "/dashboard", title: "Company Atlas", aliases: ["/react-dashboard"] },
    component: ReactDashboardApp
  }
];

function ReactApp() {
  const pathname = window.location.pathname;
  const route = appRouteComponents.find((candidate) => routeMatches(candidate.meta, pathname)) || appRouteComponents[appRouteComponents.length - 1];
  const RouteComponent = route.component;

  document.title = `CompanyCore ${route.meta.title}`;
  return <RouteComponent />;
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ReactApp />
    </React.StrictMode>
  );
}
