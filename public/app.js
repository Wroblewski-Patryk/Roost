const privateRoutes = new Set(["/dashboard", "/data", "/areas", "/relationships", "/tasks-adapter", "/pipeline", "/settings", "/settings/account", "/settings/integrations", "/settings/drive", "/settings/api"]);
const publicRoutes = new Set(["/", "/auth/login", "/auth/register"]);
const pendingPrivatePathKey = "companycorePendingPrivatePath";
const apiRequestTimeoutMs = 20_000;

const state = {
  ownerToken: sessionStorage.getItem("companycoreOwnerToken") || "",
  workspace: null,
  workspaces: [],
  user: null,
  capabilities: [],
  adapterManifest: null,
  mcpManifest: null,
  apiKeys: [],
  agentKeyProfiles: [],
  lastRawApiKey: null,
  mobileMenuOpen: false,
  clickup: {
    configured: false,
    active: false,
    config: {},
    workspaces: [],
    selectedWorkspace: null,
    spaces: [],
    selectedListIds: new Set(),
    listFilters: {
      search: "",
      selection: ""
    }
  },
  googleDrive: {
    configured: false,
    active: false,
    oauthClientConfigured: false,
    oauthTokenConfigured: false,
    config: {},
    files: [],
    discoveredFolders: []
  },
  operatingModel: {
    areas: [],
    externalMappings: [],
    externalFields: [],
    storageLocations: [],
    knowledgeRoots: [],
    automationDefinitions: []
  },
  areaInventory: [],
  relationshipGraph: {
    status: "idle",
    nodes: [],
    edges: [],
    reviewItems: [],
    unsupportedFamilies: [],
    summary: null
  },
  databaseTables: new Map(),
  selectedAreaKey: "",
  areaFilters: {
    search: "",
    type: ""
  },
  tasks: [],
  taskFilters: {
    search: "",
    status: "",
    source: "",
    list: ""
  },
  pipelineFilters: {
    search: "",
    type: "",
    status: ""
  },
  integrationFilters: {
    search: "",
    type: ""
  },
  driveFilters: {
    search: "",
    kind: "",
    area: "",
    scan: ""
  },
  apiFilters: {
    search: "",
    method: ""
  },
  dataFilters: {
    search: "",
    group: ""
  },
  tableWorkbench: {
    search: "",
    source: "",
    selectedId: "",
    newDraft: false,
    drafts: {}
  },
  relationshipFilters: {
    search: "",
    source: ""
  }
};

const fallbackAgentKeyPresets = [
  {
    id: "read_only",
    label: "MCP Company OS reader",
    description: "MCP discovery plus read-only access for Company OS, core records, events, and Drive metadata.",
    scopes: [
      "connection:read",
      "mcp:read",
      "company-os:read",
      "operating-model:read",
      "projects:read",
      "goals:read",
      "targets:read",
      "task-lists:read",
      "tasks:read",
      "clients:read",
      "pipeline-stages:read",
      "deals:read",
      "interactions:read",
      "notes:read",
      "decisions:read",
      "google-drive:files:read",
      "events:read",
      "agent-events:read"
    ]
  },
  {
    id: "memory_writer",
    label: "MCP memory writer",
    description: "MCP access to read company context and write notes, decisions, and agent logs.",
    scopes: [
      "connection:read",
      "mcp:read",
      "company-os:read",
      "operating-model:read",
      "projects:read",
      "goals:read",
      "targets:read",
      "tasks:read",
      "clients:read",
      "notes:read",
      "notes:write",
      "decisions:read",
      "decisions:write",
      "agent-logs:read",
      "agent-logs:write",
      "agent-events:read",
      "agent-events:ack"
    ]
  },
  {
    id: "event_consumer",
    label: "MCP event worker",
    description: "Minimal MCP event inbox client that can read and acknowledge assigned work.",
    scopes: [
      "connection:read",
      "mcp:read",
      "company-os:read",
      "tasks:read",
      "agent-events:read",
      "agent-events:ack",
      "agent-logs:read",
      "agent-logs:write",
      "events:read"
    ]
  },
  {
    id: "operator",
    label: "MCP operator",
    description: "Broad MCP operational agent for controlled create/update workflows.",
    scopes: [
      "connection:read",
      "mcp:read",
      "company-os:read",
      "operating-model:read",
      "projects:read",
      "projects:write",
      "goals:read",
      "goals:write",
      "targets:read",
      "targets:write",
      "task-lists:read",
      "task-lists:write",
      "tasks:read",
      "tasks:write",
      "clients:read",
      "clients:write",
      "pipeline-stages:read",
      "pipeline-stages:write",
      "deals:read",
      "deals:write",
      "interactions:read",
      "interactions:write",
      "notes:read",
      "notes:write",
      "decisions:read",
      "decisions:write",
      "google-drive:files:read",
      "google-drive:files:write",
      "google-drive:files:scope:write",
      "google-drive:docs:write",
      "google-drive:sheets:write",
      "agent-logs:write",
      "agent-events:read",
      "agent-events:ack",
      "events:read"
    ]
  }
];

const COMPANY_AREAS = [
  { number: "00", label: "Główny", key: "main-general", description: "Default home for unclassified imported lists, folders, records, and shared company context." },
  { number: "01", label: "Strategia", key: "strategy-governance", description: "Goals, targets, decisions, and the strategic source of truth." },
  { number: "02", label: "Produkt", key: "projects-delivery", description: "Projects, delivery containers, product work, and shipped outcomes." },
  { number: "03", label: "Sprzedaż", key: "sales-crm", description: "Clients, deals, and sales interactions that can use shared pipelines." },
  { number: "04", label: "Operacje", key: "operations-administration", description: "Operational administration and unclassified execution structure." },
  { number: "05", label: "Relacje", key: "tasks-workflow", description: "Workflows, task lists, ClickUp Lists, and active execution records." },
  { number: "06", label: "Kadry", key: "people-roles", description: "People, roles, responsibilities, and future HR records." },
  { number: "07", label: "Finanse", key: "finance-billing", description: "Finance, billing, payments, and future financial tables." },
  { number: "08", label: "Zasoby", key: "assets-storage", description: "Google Drive folders, files, storage locations, and document assets." },
  { number: "09", label: "Technologia", key: "automations-integrations", description: "Integrations, webhooks, provider mappings, sync jobs, and automations." },
  { number: "10", label: "Prawo", key: "knowledge-decisions", description: "Knowledge roots, notes, decisions, policies, and durable written context." },
  { number: "11", label: "Innowacje", key: "marketing-growth", description: "Growth, experiments, campaigns, and future innovation records." },
  { number: "12", label: "Zarządzanie", key: "ai-agents-observability", description: "Jarvis, Paperclip, Aviary, agent events, logs, and observability." }
];

const COMPANY_AREA_ORDER = new Map(COMPANY_AREAS.map((area, index) => [area.key, index]));

const API_ORIGIN = window.location.hostname === "companycore.luckysparrow.ch"
  ? "https://api.companycore.luckysparrow.ch"
  : window.location.origin;

const views = [...document.querySelectorAll("[data-view]")];
const privateControls = [...document.querySelectorAll("[data-private]")];
const publicControls = [...document.querySelectorAll("[data-public]")];
const publicShell = document.querySelector("[data-public-shell]");
const links = [...document.querySelectorAll("[data-link]")];
const navLinks = [...document.querySelectorAll("[data-nav]")];
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginStatus = document.querySelector("#loginStatus");
const registerStatus = document.querySelector("#registerStatus");
const logoutButton = document.querySelector("#logoutButton");
const mobileMenuButton = document.querySelector("#mobileMenuButton");
const mobileSidebarBackdrop = document.querySelector("#mobileSidebarBackdrop");
const clickupPanel = document.querySelector("#clickupPanel");
const clickupContext = document.querySelector("#clickupContext");
const checkTokenButton = document.querySelector("#checkTokenButton");
const refreshButton = document.querySelector("#refreshButton");
const saveButton = document.querySelector("#saveButton");
const syncButton = document.querySelector("#syncButton");
const refreshTasksButton = document.querySelector("#refreshTasksButton");
const taskSearch = document.querySelector("#taskSearch");
const taskStatusFilter = document.querySelector("#taskStatusFilter");
const taskSourceFilter = document.querySelector("#taskSourceFilter");
const taskListFilter = document.querySelector("#taskListFilter");
const loadListsButton = document.querySelector("#loadListsButton");
const selectAllListsButton = document.querySelector("#selectAllListsButton");
const clearListsButton = document.querySelector("#clearListsButton");
const workspaceSelect = document.querySelector("#workspaceSelect");
const connectionStatus = document.querySelector("#connectionStatus");
const dashboardDecisionTitle = document.querySelector("#dashboardDecisionTitle");
const dashboardDecisionDetail = document.querySelector("#dashboardDecisionDetail");
const dashboardDecisionPrimary = document.querySelector("#dashboardDecisionPrimary");
const dashboardDecisionSecondary = document.querySelector("#dashboardDecisionSecondary");
const dashboardDecisionMetrics = document.querySelector("#dashboardDecisionMetrics");
const dashboardDecisionList = document.querySelector("#dashboardDecisionList");
const commandPriorityTitle = document.querySelector("#commandPriorityTitle");
const commandPriorityDetail = document.querySelector("#commandPriorityDetail");
const commandPrimaryAction = document.querySelector("#commandPrimaryAction");
const commandSecondaryAction = document.querySelector("#commandSecondaryAction");
const operationalSteps = document.querySelector("#operationalSteps");
const workspaceLabel = document.querySelector("#workspaceLabel");
const routeTitle = document.querySelector("#routeTitle");
const workspaceEyebrow = document.querySelector("#workspaceEyebrow");
const moduleSwitcher = document.querySelector("#moduleSwitcher");
const moduleSearch = document.querySelector("#moduleSearch");
const moduleResults = document.querySelector("#moduleResults");
const sidebarWorkspaceName = document.querySelector("#sidebarWorkspaceName");
const sidebarStatusDot = document.querySelector("#sidebarStatusDot");
const sidebarStatusText = document.querySelector("#sidebarStatusText");
const workspaceSwitcher = document.querySelector("#workspaceSwitcher");
const workspaceCreateToggle = document.querySelector("#workspaceCreateToggle");
const workspaceCreateForm = document.querySelector("#workspaceCreateForm");
const workspaceCreateName = document.querySelector("#workspaceCreateName");
const workspaceCreateCancel = document.querySelector("#workspaceCreateCancel");
const workspaceSwitchStatus = document.querySelector("#workspaceSwitchStatus");
const sidebarAreaList = document.querySelector("#sidebarAreaList");
const topbarHealthDot = document.querySelector("#topbarHealthDot");
const topbarHealthText = document.querySelector("#topbarHealthText");
const topbarWorkspaceText = document.querySelector("#topbarWorkspaceText");
const topbarAgentText = document.querySelector("#topbarAgentText");
const routeCommandStrip = document.querySelector("#routeCommandStrip");
const routeCommandFamily = document.querySelector("#routeCommandFamily");
const routeCommandTitle = document.querySelector("#routeCommandTitle");
const routeCommandMatter = document.querySelector("#routeCommandMatter");
const routeCommandBlocked = document.querySelector("#routeCommandBlocked");
const routeCommandDot = document.querySelector("#routeCommandDot");
const routeCommandActions = document.querySelector("#routeCommandActions");
const mobileQuickActions = document.querySelector("#mobileQuickActions");
const clickupWorkspaceLabel = document.querySelector("#clickupWorkspaceLabel");
const clickupActionStatus = document.querySelector("#clickupActionStatus");
const workspaceNameLabel = document.querySelector("#workspaceNameLabel");
const clickupStatusLabel = document.querySelector("#clickupStatusLabel");
const clickupStatusHint = document.querySelector("#clickupStatusHint");
const googleDriveStatusLabel = document.querySelector("#googleDriveStatusLabel");
const googleDriveStatusHint = document.querySelector("#googleDriveStatusHint");
const dashboardDataStatusLabel = document.querySelector("#dashboardDataStatusLabel");
const dashboardDataStatusHint = document.querySelector("#dashboardDataStatusHint");
const apiContext = document.querySelector("#apiContext");
const capabilitySummary = document.querySelector("#capabilitySummary");
const capabilityList = document.querySelector("#capabilityList");
const agentKeySummary = document.querySelector("#agentKeySummary");
const agentKeyForm = document.querySelector("#agentKeyForm");
const agentKeyName = document.querySelector("#agentKeyName");
const agentKeyPreset = document.querySelector("#agentKeyPreset");
const agentKeyScopes = document.querySelector("#agentKeyScopes");
const agentKeyPreview = document.querySelector("#agentKeyPreview");
const agentKeyCreateButton = document.querySelector("#agentKeyCreateButton");
const agentKeyResetButton = document.querySelector("#agentKeyResetButton");
const refreshAgentKeysButton = document.querySelector("#refreshAgentKeysButton");
const agentKeyStatus = document.querySelector("#agentKeyStatus");
const agentKeyOnce = document.querySelector("#agentKeyOnce");
const agentKeyRawValue = document.querySelector("#agentKeyRawValue");
const agentKeyCopyButton = document.querySelector("#agentKeyCopyButton");
const agentKeyDismissButton = document.querySelector("#agentKeyDismissButton");
const agentKeyList = document.querySelector("#agentKeyList");
const apiSearch = document.querySelector("#apiSearch");
const apiMethodFilter = document.querySelector("#apiMethodFilter");
const apiRouteSummary = document.querySelector("#apiRouteSummary");
const apiRouteList = document.querySelector("#apiRouteList");
const areaContext = document.querySelector("#areaContext");
const operatingAreasNav = document.querySelector("#operatingAreasNav");
const areaTitle = document.querySelector("#areaTitle");
const areaDescription = document.querySelector("#areaDescription");
const areaStats = document.querySelector("#areaStats");
const areaActions = document.querySelector("#areaActions");
const createAreaButton = document.querySelector("#createAreaButton");
const areaSearch = document.querySelector("#areaSearch");
const areaTypeFilter = document.querySelector("#areaTypeFilter");
const areaWorkbenchSummary = document.querySelector("#areaWorkbenchSummary");
const areaWorkbenchList = document.querySelector("#areaWorkbenchList");
const areaTables = document.querySelector("#areaTables");
const areaFiles = document.querySelector("#areaFiles");
const areaMappings = document.querySelector("#areaMappings");
const areaRecords = document.querySelector("#areaRecords");
const dataCounters = document.querySelector("#dataCounters");
const companyMapSummary = document.querySelector("#companyMapSummary");
const companyStatusStrip = document.querySelector("#companyStatusStrip");
const companyMapCanvas = document.querySelector("#companyMapCanvas");
const companyCommandBrief = document.querySelector("#companyCommandBrief");
const attentionSummary = document.querySelector("#attentionSummary");
const attentionList = document.querySelector("#attentionList");
const nextActionText = document.querySelector("#nextActionText");
const moduleAreasMeta = document.querySelector("#moduleAreasMeta");
const moduleDataMeta = document.querySelector("#moduleDataMeta");
const moduleRelationshipsMeta = document.querySelector("#moduleRelationshipsMeta");
const moduleTasksMeta = document.querySelector("#moduleTasksMeta");
const modulePipelineMeta = document.querySelector("#modulePipelineMeta");
const moduleDriveMeta = document.querySelector("#moduleDriveMeta");
const moduleClickUpMeta = document.querySelector("#moduleClickUpMeta");
const moduleIntegrationsMeta = document.querySelector("#moduleIntegrationsMeta");
const accountSummary = document.querySelector("#accountSummary");
const accountContext = document.querySelector("#accountContext");
const accountOwnerName = document.querySelector("#accountOwnerName");
const accountOwnerEmail = document.querySelector("#accountOwnerEmail");
const accountWorkspaceName = document.querySelector("#accountWorkspaceName");
const accountWorkspaceId = document.querySelector("#accountWorkspaceId");
const accountReadiness = document.querySelector("#accountReadiness");
const pipelineSummary = document.querySelector("#pipelineSummary");
const pipelineStats = document.querySelector("#pipelineStats");
const pipelineContext = document.querySelector("#pipelineContext");
const pipelineSearch = document.querySelector("#pipelineSearch");
const pipelineTypeFilter = document.querySelector("#pipelineTypeFilter");
const pipelineStatusFilter = document.querySelector("#pipelineStatusFilter");
const pipelineFeedSummary = document.querySelector("#pipelineFeedSummary");
const pipelineRecordFeed = document.querySelector("#pipelineRecordFeed");
const pipelineStagesList = document.querySelector("#pipelineStagesList");
const pipelineDealsList = document.querySelector("#pipelineDealsList");
const pipelineClientsList = document.querySelector("#pipelineClientsList");
const pipelineInteractionsList = document.querySelector("#pipelineInteractionsList");
const relationshipSummary = document.querySelector("#relationshipSummary");
const relationshipContext = document.querySelector("#relationshipContext");
const relationshipSearch = document.querySelector("#relationshipSearch");
const relationshipSourceFilter = document.querySelector("#relationshipSourceFilter");
const relationshipQueue = document.querySelector("#relationshipQueue");
const relationshipProviderList = document.querySelector("#relationshipProviderList");
const relationshipDriveList = document.querySelector("#relationshipDriveList");
const listTree = document.querySelector("#listTree");
const listToolbar = document.querySelector("#listToolbar");
const listSummary = document.querySelector("#listSummary");
const listFilterBar = document.querySelector("#listFilterBar");
const listSearch = document.querySelector("#listSearch");
const listSelectionFilter = document.querySelector("#listSelectionFilter");
const resultPanel = document.querySelector("#resultPanel");
const resultToneLabel = document.querySelector("#resultToneLabel");
const resultMessage = document.querySelector("#resultMessage");
const metrics = document.querySelector("#metrics");
const taskStats = document.querySelector("#taskStats");
const tasksSummary = document.querySelector("#tasksSummary");
const tasksTableBody = document.querySelector("#tasksTableBody");
const taskAdapterBrief = document.querySelector("#taskAdapterBrief");
const dataOperationsSummary = document.querySelector("#dataOperationsSummary");
const dataOperationsStats = document.querySelector("#dataOperationsStats");
const dataSearch = document.querySelector("#dataSearch");
const dataGroupFilter = document.querySelector("#dataGroupFilter");
const dataModuleList = document.querySelector("#dataModuleList");
const tableWorkbenchLabel = document.querySelector("#tableWorkbenchLabel");
const tableWorkbenchTitle = document.querySelector("#tableWorkbenchTitle");
const tableWorkbenchSummary = document.querySelector("#tableWorkbenchSummary");
const tableWorkbenchStats = document.querySelector("#tableWorkbenchStats");
const tableWorkbenchBrief = document.querySelector("#tableWorkbenchBrief");
const tableWorkbenchApiLink = document.querySelector("#tableWorkbenchApiLink");
const tableRecordsTitle = document.querySelector("#tableRecordsTitle");
const tableRecordsSummary = document.querySelector("#tableRecordsSummary");
const tableRecordSearch = document.querySelector("#tableRecordSearch");
const tableRecordSourceFilter = document.querySelector("#tableRecordSourceFilter");
const tableRecordList = document.querySelector("#tableRecordList");
const recordInspector = document.querySelector("#recordInspector");
const integrationSummary = document.querySelector("#integrationSummary");
const integrationContext = document.querySelector("#integrationContext");
const integrationGroups = document.querySelector("#integrationGroups");
const integrationMatrixSummary = document.querySelector("#integrationMatrixSummary");
const integrationSearch = document.querySelector("#integrationSearch");
const integrationTypeFilter = document.querySelector("#integrationTypeFilter");
const integrationAreaMatrix = document.querySelector("#integrationAreaMatrix");
const driveContext = document.querySelector("#driveContext");
const googleDrivePanel = document.querySelector("#googleDrivePanel");
const googleDriveWorkspaceLabel = document.querySelector("#googleDriveWorkspaceLabel");
const googleDriveActionStatus = document.querySelector("#googleDriveActionStatus");
const googleDriveClientStatus = document.querySelector("#googleDriveClientStatus");
const googleDriveAuthUrlButton = document.querySelector("#googleDriveAuthUrlButton");
const googleDriveAuthLink = document.querySelector("#googleDriveAuthLink");
const googleDriveSaveClientButton = document.querySelector("#googleDriveSaveClientButton");
const googleDriveExchangeButton = document.querySelector("#googleDriveExchangeButton");
const googleDriveDiscoverFoldersButton = document.querySelector("#googleDriveDiscoverFoldersButton");
const googleDriveSaveFoldersButton = document.querySelector("#googleDriveSaveFoldersButton");
const googleDriveImportButton = document.querySelector("#googleDriveImportButton");
const googleDriveReconcileButton = document.querySelector("#googleDriveReconcileButton");
const refreshDriveFilesButton = document.querySelector("#refreshDriveFilesButton");
const googleDriveFolderPicker = document.querySelector("#googleDriveFolderPicker");
const googleDriveFolderPickerSummary = document.querySelector("#googleDriveFolderPickerSummary");
const googleDriveFolderPickerStatus = document.querySelector("#googleDriveFolderPickerStatus");
const driveSearch = document.querySelector("#driveSearch");
const driveKindFilter = document.querySelector("#driveKindFilter");
const driveAreaFilter = document.querySelector("#driveAreaFilter");
const driveScanFilter = document.querySelector("#driveScanFilter");
const googleDriveFilesSummary = document.querySelector("#googleDriveFilesSummary");
const googleDriveFilesBody = document.querySelector("#googleDriveFilesBody");

const fields = {
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  workspaceName: document.querySelector("#workspaceName"),
  active: document.querySelector("#active"),
  token: document.querySelector("#token"),
  importMode: document.querySelector("#importMode"),
  googleDriveActive: document.querySelector("#googleDriveActive"),
  googleDriveClientId: document.querySelector("#googleDriveClientId"),
  googleDriveClientSecret: document.querySelector("#googleDriveClientSecret"),
  googleDriveRedirectUri: document.querySelector("#googleDriveRedirectUri"),
  googleDriveFolderIds: document.querySelector("#googleDriveFolderIds"),
  googleDriveCode: document.querySelector("#googleDriveCode"),
  googleDriveImportMode: document.querySelector("#googleDriveImportMode")
};

const routeLabels = {
  "/dashboard": "Company map",
  "/data": "Company data",
  "/areas": "Areas & resources",
  "/relationships": "Relationship review",
  "/tasks-adapter": "Tasks & delivery",
  "/pipeline": "Pipeline / CRM",
  "/settings/account": "Account",
  "/settings/integrations": "Integration health",
  "/settings": "ClickUp bridge",
  "/settings/drive": "Google Drive",
  "/settings/api": "Agent access",
  "/react-agent-tools": "MCP tools"
};

const moduleRoutes = [
  { path: "/dashboard", label: "Company map", group: "Command", keywords: "home overview summary next action attention map brief" },
  { path: "/areas", label: "Areas & resources", group: "Workbenches", keywords: "departments areas tables records mapping workspace resources" },
  { path: "/relationships", label: "Relationship review", group: "Workbenches", keywords: "review queue provider drive unmapped correction relations graph" },
  { path: "/data", label: "Company data", group: "Workbenches", keywords: "database records tables crud modules workbench" },
  { path: "/tasks-adapter", label: "Tasks & delivery", group: "Workbenches", keywords: "tasks clickup lists priority status due sync delivery" },
  { path: "/pipeline", label: "Pipeline / CRM", group: "Workbenches", keywords: "shared pipelines workflow stages clients deals interactions sales crm departments" },
  { path: "/settings/integrations", label: "Integration health", group: "Integrations & agents", keywords: "data map modules sources tables drive clickup api health" },
  { path: "/settings", label: "ClickUp bridge", group: "Integrations & agents", keywords: "clickup token workspace lists sync import" },
  { path: "/settings/drive", label: "Google Drive", group: "Integrations & agents", keywords: "drive folders files oauth import reconcile scan" },
  { path: "/settings/api", label: "Agent access", group: "Integrations & agents", keywords: "api routes manifest agents service keys capabilities safety" },
  { path: "/react-agent-tools", label: "MCP tools", group: "Integrations & agents", keywords: "mcp tools manifest capabilities agent authority approval risk", external: true },
  { path: "/settings/account", label: "Account", group: "Workspace", keywords: "owner workspace readiness login account" }
];

const routeCommandDefaults = {
  family: "CompanyCore",
  title: "Company command",
  matter: "Review the current workspace signal before moving into detailed work.",
  blocked: "No urgent blocker is selected for this route yet.",
  tone: "ready",
  actions: [
    { label: "Company map", href: "/dashboard", secondary: false },
    { label: "Integration health", href: "/settings/integrations", secondary: true }
  ]
};

const routeCommandMeta = {
  "/dashboard": {
    family: "Command",
    title: "Company map",
    matter: "Start from the workspace map, command brief, and attention queue before opening detailed workbenches.",
    blocked: "Review integrations, relationships, and data readiness when any signal is degraded.",
    tone: "ready",
    actions: [
      { label: "Open areas", href: "/areas" },
      { label: "Review relationships", href: "/relationships", secondary: true }
    ]
  },
  "/areas": {
    family: "Areas",
    title: "Areas & resources",
    matter: "Review operating-area ownership, resource coverage, provider mappings, and Drive assignments before routing work to people or agents.",
    blocked: "Unassigned provider mappings or Drive folders should be moved into the right area.",
    tone: "attention",
    actions: [
      { label: "Review mappings", href: "/areas#areaMappings" },
      { label: "Relationships", href: "/relationships", secondary: true }
    ]
  },
  "/data": {
    family: "Workbench",
    title: "Company data",
    matter: "Choose the table that owns the company record you need to inspect, edit, or expose to agents.",
    blocked: "Watch for modules without records, missing API coverage, or unclear ownership.",
    tone: "review",
    actions: [
      { label: "Agent access", href: "/settings/api" },
      { label: "Relationships", href: "/relationships", secondary: true }
    ]
  },
  "/data-table": {
    family: "Data table",
    title: "Record workbench",
    matter: "Inspect selected records, ownership, source, and API readiness before changing operational data.",
    blocked: "If writes are missing or unsafe, keep the action inside existing typed workbenches.",
    tone: "review",
    actions: [
      { label: "All data", href: "/data" },
      { label: "API routes", href: "/settings/api", secondary: true }
    ]
  },
  "/relationships": {
    family: "Relationships",
    title: "Relationship review",
    matter: "Confirm direct, provider-derived, inferred, and needs-review links before people or agents rely on context.",
    blocked: "Needs-review and unsupported links should be corrected or explicitly understood.",
    tone: "attention",
    actions: [
      { label: "Correct mapping", href: "/areas" },
      { label: "Integration health", href: "/settings/integrations", secondary: true }
    ]
  },
  "/tasks-adapter": {
    family: "Execution",
    title: "Tasks & delivery",
    matter: "Review synced tasks, list ownership, due work, and delivery status across CompanyCore and ClickUp.",
    blocked: "If tasks are missing or stale, refresh ClickUp and check selected Lists.",
    tone: "review",
    actions: [
      { label: "ClickUp bridge", href: "/settings" },
      { label: "Company data", href: "/data/tasks", secondary: true }
    ]
  },
  "/pipeline": {
    family: "Workflow",
    title: "Pipeline / CRM",
    matter: "Review shared pipeline stages, CRM records, deals, and interactions as one cross-department flow.",
    blocked: "If a stage or CRM record has no ownership, inspect the data workbench before relying on it.",
    tone: "review",
    actions: [
      { label: "Pipeline data", href: "/data/pipeline-stages" },
      { label: "Clients", href: "/data/clients", secondary: true }
    ]
  },
  "/settings/integrations": {
    family: "Integrations",
    title: "Integration health",
    matter: "Check provider readiness, relationship evidence, and MCP exposure before expanding automation or agent use.",
    blocked: "Disconnected providers or missing relationship graph evidence should be resolved before agent delegation.",
    tone: "attention",
    actions: [
      { label: "Agent access", href: "/settings/api" },
      { label: "Relationships", href: "/relationships", secondary: true }
    ]
  },
  "/settings": {
    family: "ClickUp",
    title: "ClickUp bridge",
    matter: "Connect, select, refresh, and sync ClickUp Lists so delivery work lands in the right company area.",
    blocked: "A missing token, workspace, or selected List blocks useful task synchronization.",
    tone: "attention",
    actions: [
      { label: "Tasks", href: "/tasks-adapter" },
      { label: "Integration health", href: "/settings/integrations", secondary: true }
    ]
  },
  "/settings/drive": {
    family: "Google Drive",
    title: "Drive resources",
    matter: "Connect Drive, import folders/files, and keep resources assigned to the right operating areas.",
    blocked: "Unimported, stale, or unassigned Drive items reduce relationship and knowledge quality.",
    tone: "review",
    actions: [
      { label: "Open areas", href: "/areas" },
      { label: "Relationships", href: "/relationships", secondary: true }
    ]
  },
  "/settings/api": {
    family: "Agents",
    title: "Agent access",
    matter: "Create scoped service keys only after reviewing workspace, risk profile, MCP tools, and supervision needs.",
    blocked: "Missing scopes, broad write access, or supervised tools require explicit owner review.",
    tone: "attention",
    actions: [
      { label: "MCP tools", href: "/react-agent-tools", external: true },
      { label: "Integration health", href: "/settings/integrations", secondary: true }
    ]
  },
  "/settings/account": {
    family: "Workspace",
    title: "Account & readiness",
    matter: "Review owner session, active workspace, and the readiness links that keep the console trustworthy.",
    blocked: "If a readiness item is incomplete, open its setup surface before delegating work.",
    tone: "ready",
    actions: [
      { label: "Integration health", href: "/settings/integrations" },
      { label: "Agent access", href: "/settings/api", secondary: true }
    ]
  }
};

const mobileQuickActionItems = [
  { label: "Map", href: "/dashboard", icon: "ph-map-trifold", match: (path) => path === "/dashboard" && window.location.hash !== "#dashboardDecisionBoard" },
  { label: "Brief", href: "/dashboard#dashboardDecisionBoard", icon: "ph-gauge", match: (path) => path === "/dashboard" && window.location.hash === "#dashboardDecisionBoard" },
  { label: "Data", href: "/data", icon: "ph-database", match: (path) => path === "/data" || isDataWorkbenchPath(path) },
  { label: "Tasks", href: "/tasks-adapter", icon: "ph-check-square", match: (path) => path === "/tasks-adapter" },
  { label: "Settings", href: "/settings/integrations", icon: "ph-sliders-horizontal", match: (path) => path.startsWith("/settings") || path === "/react-agent-tools" }
];

const dataModuleCatalog = [
  { slug: "projects", label: "Projects", group: "Strategy and delivery", href: "/data/projects", description: "Project containers for delivery work and roadmap context." },
  { slug: "goals", label: "Goals", group: "Strategy and delivery", href: "/data/goals", description: "Goal records connected to strategy, projects, and targets." },
  { slug: "targets", label: "Targets", group: "Strategy and delivery", href: "/data/targets", description: "Measurable target records for strategic follow-through." },
  { slug: "task-lists", label: "Task Lists", group: "Execution", href: "/data/task-lists", description: "Execution containers, including ClickUp-sourced Lists." },
  { slug: "tasks", label: "Tasks", group: "Execution", href: "/data/tasks", description: "CompanyCore and ClickUp task records with status and priority." },
  { slug: "clients", label: "Clients", group: "CRM", href: "/data/clients", description: "Client records for sales, delivery, and relationship context." },
  { slug: "pipeline-stages", label: "Pipeline Stages", group: "Workflow", href: "/data/pipeline-stages", description: "Shared pipeline stage records that can organize work across departments." },
  { slug: "deals", label: "Deals", group: "CRM", href: "/data/deals", description: "Deal records with status, value, source, and client context." },
  { slug: "interactions", label: "Interactions", group: "CRM", href: "/data/interactions", description: "Sales or client timeline interactions." },
  { slug: "notes", label: "Notes", group: "Knowledge", href: "/data/notes", description: "Operational notes linked to projects, tasks, clients, or deals." },
  { slug: "decisions", label: "Decisions", group: "Knowledge", href: "/data/decisions", description: "Durable decision records with rationale and outcome." },
  { slug: "agents", label: "Agents", group: "AI operations", href: "/data/agents", description: "Agent identities for Jarvis, Paperclip, Aviary, and future clients." },
  { slug: "agent-logs", label: "Agent Logs", group: "AI operations", href: "/data/agent-logs", description: "Agent log records for observability and training smoke." }
];

const implementedDataModuleSlugs = new Set(dataModuleCatalog.map((module) => module.slug));
const companyOsCollectionSlugs = new Set([
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

function tableRecordApiPath(apiSlug) {
  if (implementedDataModuleSlugs.has(apiSlug)) {
    return `/v1/${apiSlug}`;
  }
  if (companyOsCollectionSlugs.has(apiSlug)) {
    return `/v1/company-os/${apiSlug}`;
  }
  return null;
}

function normalizedPath(pathname = window.location.pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function currentRouteTarget() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function dataTableSlugFromPath(pathname = window.location.pathname) {
  const match = normalizedPath(pathname).match(/^\/data\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function isDataWorkbenchPath(path) {
  return Boolean(dataTableSlugFromPath(path));
}

function isSignedIn() {
  return Boolean(state.ownerToken);
}

function moduleMetric(path) {
  const signals = isSignedIn() ? dashboardSignals() : null;
  const areaCount = state.operatingModel.areas.length;
  const tableCount = state.operatingModel.areas.flatMap((area) => area.tables || []).length;
  const recordCount = totalDatabaseRecords();
  const clickUpLists = (state.clickup.config.listIds || []).length;
  const driveItems = state.googleDrive.files.length;
  const apiRoutes = apiRouteRows().length;

  switch (path) {
    case "/dashboard":
      return isSignedIn() ? "Live command center" : "Sign in required";
    case "/data":
      return `${tableCount} tables, ${recordCount} records`;
    case "/areas":
      return `${areaCount} areas, ${tableCount} tables`;
    case "/relationships":
      return `${(signals?.unmappedProviderMappings.length || 0) + (signals?.unassignedDriveFolders.length || 0)} items need review`;
    case "/tasks-adapter":
      return `${state.tasks.length} tasks, ${signals?.openTasks.length || 0} open`;
    case "/pipeline":
      return `${recordCountForSlugs(["pipeline-stages"])} shared stages, ${recordCountForSlugs(["clients", "deals", "interactions"])} CRM usage records`;
    case "/settings/account":
      return state.user?.email || "Owner workspace settings";
    case "/settings/integrations":
      return `${areaCount} areas mapped across integrations`;
    case "/settings":
      return state.clickup.configured
        ? `${clickUpLists} selected ClickUp Lists`
        : "ClickUp not connected";
    case "/settings/drive":
      return state.googleDrive.configured
        ? `${driveItems} Drive items imported`
        : "Google Drive not connected";
    case "/settings/api":
      return `${apiRoutes} implemented API routes`;
    case "/react-agent-tools":
      return `${Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0} MCP tools visible`;
    default:
      return "";
  }
}

function moduleSearchRows() {
  return moduleRoutes.map((route) => ({
    ...route,
    metric: moduleMetric(route.path),
    searchable: [route.label, route.group, route.keywords, moduleMetric(route.path)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  }));
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.ownerToken}`
  };
}

function closeModuleSwitcher({ clear = false } = {}) {
  moduleResults.hidden = true;
  moduleSearch.setAttribute("aria-expanded", "false");
  if (clear) {
    moduleSearch.value = "";
  }
}

function renderModuleSwitcher({ open = false } = {}) {
  if (!isSignedIn()) {
    closeModuleSwitcher({ clear: true });
    return;
  }

  const query = moduleSearch.value.trim().toLowerCase();
  const rows = moduleSearchRows().filter((row) => !query || row.searchable.includes(query));
  moduleResults.innerHTML = "";

  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "module-result-empty";
    empty.textContent = "No implemented module matches this search.";
    moduleResults.append(empty);
  } else {
    let currentGroup = "";
    const currentPath = normalizedPath();
    for (const row of rows) {
      if (row.group !== currentGroup) {
        currentGroup = row.group;
        const heading = document.createElement("p");
        heading.className = "module-result-group";
        heading.textContent = currentGroup;
        moduleResults.append(heading);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = `module-result${currentPath === row.path ? " active" : ""}`;
      button.dataset.path = row.path;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(currentPath === row.path));

      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = row.label;
      const meta = document.createElement("small");
      meta.textContent = row.metric;
      copy.append(title, meta);

      const route = document.createElement("kbd");
      route.textContent = row.path;
      button.append(copy, route);
      button.addEventListener("click", () => {
        moduleSearch.value = "";
        closeModuleSwitcher();
        if (row.external) {
          window.location.assign(row.path);
          return;
        }
        navigate(row.path);
      });
      moduleResults.append(button);
    }
  }

  moduleResults.hidden = !open;
  moduleSearch.setAttribute("aria-expanded", String(open));
}

function openFirstModuleResult() {
  const first = moduleSearchRows()
    .filter((row) => {
      const query = moduleSearch.value.trim().toLowerCase();
      return !query || row.searchable.includes(query);
    })
    .at(0);

  if (!first) {
    return;
  }

  moduleSearch.value = "";
  closeModuleSwitcher();
  if (first.external) {
    window.location.assign(first.path);
    return;
  }
  navigate(first.path);
}

function updateChrome() {
  const signedIn = isSignedIn();
  document.body.classList.toggle("is-signed-in", signedIn);
  document.body.classList.toggle("mobile-nav-open", state.mobileMenuOpen && signedIn);
  document.body.style.overflow = state.mobileMenuOpen && signedIn ? "hidden" : "";
  privateControls.forEach((element) => {
    element.hidden = !signedIn;
  });
  publicControls.forEach((element) => {
    element.hidden = signedIn;
  });
  if (publicShell) {
    publicShell.hidden = signedIn;
  }
  if (mobileMenuButton) {
    mobileMenuButton.setAttribute("aria-expanded", String(state.mobileMenuOpen && signedIn));
  }
  if (mobileSidebarBackdrop) {
    mobileSidebarBackdrop.hidden = !(state.mobileMenuOpen && signedIn);
  }
}

function navigate(path, { replace = false, hash = "" } = {}) {
  const nextPath = normalizedPath(path);
  const nextUrl = path.includes("?") || path.includes("#")
    ? path
    : `${nextPath}${hash}`;
  if (replace) {
    window.history.replaceState({}, "", nextUrl);
  } else {
    window.history.pushState({}, "", nextUrl);
  }
  state.mobileMenuOpen = false;
  closeModuleSwitcher({ clear: true });
  renderRoute();
  if (hash) {
    window.requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ block: "start" });
    });
  }
}

function routeCommandKey(path) {
  return isDataWorkbenchPath(path) ? "/data-table" : path;
}

function routeDecisionSignal(path, meta) {
  if (!isSignedIn()) {
    return {
      title: meta.title,
      matter: "Sign in to load the current workspace signal.",
      blocked: "Owner session is required before this route can guide work.",
      tone: "blocked"
    };
  }

  const signals = dashboardSignals();
  const relationshipReviews = signals.unmappedProviderMappings.length
    + signals.unassignedDriveFolders.length
    + state.relationshipGraph.reviewItems.length;
  const activeKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0;
  const route = routeCommandKey(path);
  const areaCount = state.operatingModel.areas.length;
  const tableCount = state.operatingModel.areas.flatMap((area) => area.tables || []).length;
  const driveFoldersToReview = signals.unassignedDriveFolders.length;
  const openTaskCount = signals.openTasks.length;
  const dueSoonCount = signals.dueSoonTasks.length;

  if (route === "/dashboard") {
    const items = dashboardAttentionItems(signals);
    return {
      title: items.length > 0 ? "Review the top company blocker" : "Workspace command brief is clear",
      matter: items[0]?.detail || `${areaCount} operating areas, ${state.tasks.length} tasks, and ${mcpTools} MCP tools are available from this workspace.`,
      blocked: items.length > 0 ? `${items.length} dashboard signal${items.length === 1 ? "" : "s"} need owner review.` : "No urgent dashboard blockers are visible.",
      tone: items.length > 0 ? "attention" : "ready"
    };
  }

  if (route === "/areas") {
    const resourceCount = state.areaInventory.reduce((total, area) => total + (area.resources || []).reduce((sum, resource) => sum + Number(resource.count || 0), 0), 0);
    return {
      title: relationshipReviews > 0 ? "Triage ownership and area scope" : "Area ownership looks ready",
      matter: `${areaCount} areas organize ${resourceCount} tracked resources across tables, providers, and Drive.`,
      blocked: relationshipReviews > 0 ? `${relationshipReviews} relationships or folders still need area review.` : "No area review debt is currently surfaced.",
      tone: relationshipReviews > 0 ? "attention" : "ready"
    };
  }

  if (route === "/relationships") {
    const edgeCount = Number(state.relationshipGraph.summary?.edges || state.relationshipGraph.edges.length || 0);
    return {
      title: relationshipReviews > 0 ? "Review relationship confidence" : "Relationship graph is ready to inspect",
      matter: `${edgeCount} graph edges are available across direct, provider, inferred, and review states.`,
      blocked: relationshipReviews > 0 ? `${relationshipReviews} links need review before agents should rely on them.` : "No relationship review queue is active.",
      tone: relationshipReviews > 0 ? "attention" : "ready"
    };
  }

  if (route === "/data" || route === "/data-table") {
    const recordCount = totalDatabaseRecords();
    return {
      title: recordCount > 0 ? "Inspect operational records" : "Create or import useful company records",
      matter: `${tableCount} tables expose ${recordCount} records through the current operating model.`,
      blocked: recordCount > 0 ? "Check ownership and provenance before making record changes." : "Empty tables are accepted only when the route explains the owner path.",
      tone: recordCount > 0 ? "review" : "attention"
    };
  }

  if (route === "/tasks-adapter") {
    return {
      title: dueSoonCount > 0 ? "Delivery pressure needs review" : "Task workbench is ready",
      matter: `${openTaskCount} open tasks, ${dueSoonCount} due soon, ${(state.clickup.config.listIds || []).length} ClickUp Lists selected.`,
      blocked: state.clickup.configured ? "Refresh ClickUp when task data looks stale or list coverage changes." : "ClickUp is not configured, so delivery sync is blocked.",
      tone: dueSoonCount > 0 || !state.clickup.configured ? "attention" : "ready"
    };
  }

  if (route === "/pipeline") {
    return {
      title: signals.pipelineRecords > 0 ? "Review cross-department flow" : "Pipeline data is still light",
      matter: `${signals.pipelineStageRecords} stages and ${signals.pipelineUsageRecords} CRM usage records are available.`,
      blocked: signals.pipelineRecords > 0 ? "Check ownership before relying on pipeline context." : "Pipeline remains useful only after real CRM records or stages exist.",
      tone: signals.pipelineRecords > 0 ? "review" : "attention"
    };
  }

  if (route === "/settings/integrations") {
    const readyCount = integrationReadinessItems().filter((item) => item.status === "ready").length;
    return {
      title: readyCount >= 3 ? "Integration foundation is mostly ready" : "Integration readiness needs setup",
      matter: `${readyCount}/4 readiness lanes are marked ready from provider, relationship, and agent state.`,
      blocked: readyCount >= 3 ? "Review degraded lanes before expanding automation." : "Disconnected or unproven lanes reduce agent usefulness.",
      tone: readyCount >= 3 ? "ready" : "attention"
    };
  }

  if (route === "/settings") {
    return {
      title: state.clickup.configured ? "ClickUp bridge is configured" : "Connect ClickUp before task sync",
      matter: `${(state.clickup.config.listIds || []).length} Lists selected; connection is ${state.clickup.active ? "active" : "inactive"}.`,
      blocked: state.clickup.configured ? "Refresh and sync after changing selected Lists." : "Missing ClickUp token or workspace blocks task import.",
      tone: state.clickup.configured && state.clickup.active ? "ready" : "attention"
    };
  }

  if (route === "/settings/drive") {
    return {
      title: state.googleDrive.oauthTokenConfigured ? "Drive resources are available" : "Connect Drive before importing resources",
      matter: `${state.googleDrive.files.length} Drive items imported; ${driveFoldersToReview} folders need area review.`,
      blocked: state.googleDrive.oauthTokenConfigured ? "Reconcile Drive when folder ownership or content quality changes." : "Missing Drive OAuth consent blocks file import.",
      tone: driveFoldersToReview > 0 || !state.googleDrive.oauthTokenConfigured ? "attention" : "ready"
    };
  }

  if (route === "/settings/api" || route === "/react-agent-tools") {
    return {
      title: scopedKeys > 0 ? "Agent access is ready to review" : "Scope agent access before handoff",
      matter: `${scopedKeys}/${activeKeys} active keys are scoped; ${mcpTools} MCP tools are visible to eligible agents.`,
      blocked: scopedKeys > 0 ? "Review supervised tools before giving an agent write authority." : "No scoped active key is ready for safe MCP use.",
      tone: scopedKeys > 0 ? "review" : "attention"
    };
  }

  return {
    title: meta.title,
    matter: meta.matter,
    blocked: meta.blocked,
    tone: meta.tone
  };
}

function routeCommandToneClass(tone) {
  if (tone === "blocked" || tone === "attention") {
    return "warn";
  }
  if (tone === "review") {
    return "ok";
  }
  return "ok";
}

function renderRouteCommandStrip(path) {
  if (!routeCommandStrip) {
    return;
  }
  const signedIn = isSignedIn();
  routeCommandStrip.hidden = !signedIn;
  if (!signedIn) {
    renderMobileQuickActions(path);
    return;
  }

  const meta = routeCommandMeta[routeCommandKey(path)] || routeCommandDefaults;
  const signal = routeDecisionSignal(path, meta);
  if (routeCommandFamily) {
    routeCommandFamily.textContent = meta.family;
  }
  if (routeCommandTitle) {
    routeCommandTitle.textContent = signal.title;
  }
  if (routeCommandMatter) {
    routeCommandMatter.textContent = signal.matter;
  }
  if (routeCommandBlocked) {
    routeCommandBlocked.textContent = signal.blocked;
  }
  if (routeCommandDot) {
    routeCommandDot.className = `dot ${routeCommandToneClass(signal.tone)}`;
  }
  routeCommandStrip.dataset.tone = signal.tone;
  if (routeCommandActions) {
    routeCommandActions.replaceChildren();
    for (const action of meta.actions || []) {
      const link = document.createElement("a");
      link.className = `button-link compact ${action.secondary ? "secondary" : ""}`.trim();
      link.href = action.href;
      link.textContent = action.label;
      if (!action.external) {
        link.dataset.link = "";
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const url = new URL(link.href);
          navigate(`${url.pathname}${url.search}`, { hash: url.hash });
        });
      }
      routeCommandActions.append(link);
    }
  }
  renderMobileQuickActions(path);
}

function renderMobileQuickActions(path = normalizedPath()) {
  if (!mobileQuickActions) {
    return;
  }
  const signedIn = isSignedIn();
  mobileQuickActions.hidden = !signedIn;
  mobileQuickActions.replaceChildren();
  if (!signedIn) {
    return;
  }

  for (const item of mobileQuickActionItems) {
    const link = document.createElement("a");
    const url = new URL(item.href, window.location.origin);
    const isActive = item.match(path);
    link.className = `mobile-quick-action${isActive ? " active" : ""}`;
    link.href = `${url.pathname}${url.search}${url.hash}`;
    link.dataset.link = "";
    link.setAttribute("aria-current", isActive ? "page" : "false");
    link.innerHTML = `
      <span class="ui-icon" aria-hidden="true"><i class="ph-bold ${item.icon}"></i></span>
      <span>${item.label}</span>
    `;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(`${url.pathname}${url.search}`, { hash: url.hash });
    });
    mobileQuickActions.append(link);
  }
}

function renderRoute() {
  updateChrome();

  let path = normalizedPath();
  const dataWorkbench = isDataWorkbenchPath(path);
  if (!publicRoutes.has(path) && !privateRoutes.has(path) && !dataWorkbench) {
    path = isSignedIn() ? "/dashboard" : "/";
    window.history.replaceState({}, "", path);
  }

  if ((privateRoutes.has(path) || dataWorkbench) && !isSignedIn()) {
    const target = currentRouteTarget();
    if (target !== "/auth/login" && target !== "/auth/register") {
      sessionStorage.setItem(pendingPrivatePathKey, target);
    }
    window.history.replaceState({}, "", "/auth/login");
    path = "/auth/login";
    showResult("Sign in to continue.", "error");
  }

  if ((path === "/auth/login" || path === "/auth/register") && isSignedIn()) {
    window.history.replaceState({}, "", "/dashboard");
    path = "/dashboard";
  }

  views.forEach((view) => {
    const activeView = dataWorkbench && path !== "/auth/login" ? "/data-table" : path;
    view.hidden = view.dataset.view !== activeView;
  });

  navLinks.forEach((link) => {
    const target = link.dataset.nav;
    link.classList.toggle("active", target === path || target === "/data" && isDataWorkbenchPath(path));
  });
  if (routeTitle) {
    routeTitle.textContent = isDataWorkbenchPath(path) ? "Data" : routeLabels[path] || "CompanyCore";
  }
  if (workspaceEyebrow) {
    workspaceEyebrow.textContent = isSignedIn() ? "Company command" : "Private workspace";
  }
  document.body.dataset.route = path;
  renderRouteCommandStrip(path);
  renderConnectionState();
  renderModuleSwitcher();
  setClickUpEnabled(isSignedIn());
  setGoogleDriveEnabled(isSignedIn());
  if (isDataWorkbenchPath(path)) {
    renderTableWorkbench();
  }
}

function setBusy(isBusy) {
  document.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = isBusy;
  });
  links.forEach((link) => {
    link.setAttribute("aria-disabled", String(isBusy));
  });
  setClickUpEnabled(isSignedIn() && !isBusy);
  setGoogleDriveEnabled(isSignedIn() && !isBusy);
  refreshTasksButton.disabled = !isSignedIn() || isBusy;
  refreshDriveFilesButton.disabled = !isSignedIn() || isBusy;
}

function setClickUpEnabled(isEnabled) {
  clickupPanel.setAttribute("aria-disabled", String(!isEnabled));
  clickupPanel.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = !isEnabled;
  });
  workspaceSelect.disabled = !isEnabled || state.clickup.workspaces.length === 0;
  loadListsButton.disabled = !isEnabled || !workspaceSelect.value;
  refreshButton.disabled = !isEnabled || !state.clickup.configured;
  const loadedListCount = allLists().length;
  listSearch.disabled = !isEnabled || loadedListCount === 0;
  listSelectionFilter.disabled = !isEnabled || loadedListCount === 0;
  selectAllListsButton.disabled = !isEnabled || loadedListCount === 0;
  clearListsButton.disabled = !isEnabled || state.clickup.selectedListIds.size === 0;
  const canSave = isEnabled && state.clickup.selectedListIds.size > 0 && Boolean(workspaceSelect.value);
  saveButton.disabled = !canSave;
  syncButton.disabled = !canSave;
}

function setGoogleDriveEnabled(isEnabled) {
  googleDrivePanel.setAttribute("aria-disabled", String(!isEnabled));
  googleDrivePanel.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = !isEnabled;
  });
  fields.googleDriveRedirectUri.disabled = true;
  googleDriveSaveClientButton.disabled = !isEnabled;
  googleDriveAuthUrlButton.disabled = !isEnabled;
  googleDriveExchangeButton.disabled = !isEnabled || !state.googleDrive.oauthClientConfigured;
  googleDriveAuthLink.hidden = !googleDriveAuthLink.href || googleDriveAuthLink.getAttribute("href") === "#";
  googleDriveDiscoverFoldersButton.disabled = !isEnabled || !state.googleDrive.oauthTokenConfigured;
  googleDriveSaveFoldersButton.disabled = !isEnabled || !state.googleDrive.oauthTokenConfigured;
  googleDriveImportButton.disabled = !isEnabled || !state.googleDrive.oauthTokenConfigured;
  googleDriveReconcileButton.disabled = !isEnabled || !state.googleDrive.oauthTokenConfigured;
  refreshDriveFilesButton.disabled = !isEnabled;
  driveSearch.disabled = !isEnabled;
  driveKindFilter.disabled = !isEnabled;
  driveAreaFilter.disabled = !isEnabled;
  driveScanFilter.disabled = !isEnabled;
}

function showResult(message, tone = "success", sync = null) {
  resultPanel.hidden = false;
  resultPanel.classList.toggle("is-error-result", tone === "error");
  resultPanel.classList.toggle("is-success-result", tone !== "error");
  resultToneLabel.textContent = tone === "error" ? "Needs attention" : "Success";
  resultMessage.textContent = message;
  resultMessage.className = tone === "error" ? "is-error" : "is-success";
  metrics.innerHTML = "";

  if (!sync) {
    metrics.classList.remove("detail-metrics");
    return;
  }

  metrics.classList.toggle("detail-metrics", !("itemCount" in sync || "createdCount" in sync));
  const items = "itemCount" in sync || "createdCount" in sync
    ? [
      ["Items", sync.itemCount],
      ["Created", sync.createdCount],
      ["Updated", sync.updatedCount],
      ["Skipped", sync.skippedCount],
      ["Deleted", sync.deletedCount],
      ["Would create", sync.wouldCreateCount],
      ["Would update", sync.wouldUpdateCount]
    ]
    : Object.entries(sync)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]);

  for (const [label, value] of items) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    if (label === "thumbnail") {
      const image = document.createElement("img");
      image.className = "preview-thumbnail";
      image.alt = "Drive thumbnail";
      image.src = String(value);
      detail.append(image);
    } else {
      detail.textContent = String(value ?? 0);
    }
    item.append(term, detail);
    metrics.append(item);
  }
}

function setLocalStatus(target, message = "", tone = "") {
  if (!target) {
    return;
  }
  target.textContent = message;
  target.classList.toggle("is-error", tone === "error");
  target.classList.toggle("is-success", tone === "success");
  target.classList.toggle("is-pending", tone === "pending");
}

function reportAction(target, message, tone = "success", sync = null) {
  setLocalStatus(target, message, tone);
  showResult(message, tone === "error" ? "error" : "success", sync);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseIdList(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function syncGoogleDriveCredentialPlaceholders() {
  fields.googleDriveClientId.placeholder = state.googleDrive.oauthClientConfigured
    ? "OAuth client ID saved; paste a new one to rotate"
    : "000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com";
  fields.googleDriveClientSecret.placeholder = state.googleDrive.oauthClientConfigured
    ? "Leave blank to keep the saved secret"
    : "Paste the OAuth client secret";
}

function selectedGoogleDriveFolderIds() {
  return [...document.querySelectorAll("[data-drive-folder-select]:checked")]
    .map((input) => input.value)
    .filter(Boolean);
}

function syncSelectedGoogleDriveFolderInput() {
  const checkedIds = selectedGoogleDriveFolderIds();
  if (checkedIds.length > 0 || state.googleDrive.discoveredFolders.length > 0) {
    fields.googleDriveFolderIds.value = checkedIds.join(", ");
  }
  renderGoogleDriveFolderPicker();
}

function renderGoogleDriveFolderPicker() {
  googleDriveFolderPicker.innerHTML = "";
  const selectedIds = new Set(parseIdList(fields.googleDriveFolderIds.value));
  const folders = state.googleDrive.discoveredFolders || [];
  const selectedCount = folders.filter((folder) => selectedIds.has(folder.id)).length;
  renderGoogleDriveContext();

  if (!state.googleDrive.oauthTokenConfigured) {
    googleDriveFolderPickerSummary.textContent = "Save the OAuth connection before CompanyCore can list Drive folders.";
    googleDriveFolderPickerStatus.textContent = "OAuth required";
    googleDriveFolderPicker.append(emptyNote("After Google consent succeeds, load folders here and select what should be imported."));
    return;
  }

  if (folders.length === 0) {
    googleDriveFolderPickerSummary.textContent = "Load folders from Google Drive, then select the roots CompanyCore should import.";
    googleDriveFolderPickerStatus.textContent = "No folders loaded";
    googleDriveFolderPicker.append(emptyNote("No Drive folders loaded yet."));
    return;
  }

  googleDriveFolderPickerSummary.textContent = `${selectedCount} of ${folders.length} discovered Drive folder${folders.length === 1 ? "" : "s"} selected for import.`;
  googleDriveFolderPickerStatus.textContent = selectedCount > 0 ? `${selectedCount} selected` : "Select folders";

  for (const folder of folders.slice(0, 150)) {
    const row = document.createElement("label");
    row.className = "drive-folder-option";
    row.innerHTML = `
      <input type="checkbox" value="${escapeHtml(folder.id)}" data-drive-folder-select ${selectedIds.has(folder.id) ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(folder.name)}</strong>
        <small>${escapeHtml([
    folder.driveId ? `Shared drive ${folder.driveId}` : "My Drive or shared with me",
    folder.modifiedTime ? `modified ${formatDate(folder.modifiedTime)}` : "",
    folder.id
  ].filter(Boolean).join(" - "))}</small>
      </span>
      ${folder.webViewLink ? `<a href="${escapeHtml(folder.webViewLink)}" target="_blank" rel="noreferrer">Open</a>` : ""}
    `;
    row.querySelector("[data-drive-folder-select]").addEventListener("change", syncSelectedGoogleDriveFolderInput);
    googleDriveFolderPicker.append(row);
  }
}

function renderGoogleDriveContext() {
  driveContext.innerHTML = "";
  driveContext.append(window.CompanyCoreGoogleDriveWorkbench.renderContextPanel({
    state,
    fields,
    helpers: {
      bindInlineNavigation,
      escapeHtml,
      isSignedIn,
      parseIdList
    }
  }));
}

function areaDefinitionFor(area) {
  return COMPANY_AREAS.find((item) => item.key === area?.key)
    || COMPANY_AREAS.find((item) => item.number === String(area?.position).padStart(2, "0"))
    || { number: String(area?.position || 0).padStart(2, "0"), label: area?.name || "Area", key: area?.key, description: area?.description || "" };
}

function areaLabel(area) {
  const definition = areaDefinitionFor(area);
  return `${definition.number}. ${definition.label}`;
}

function selectedArea() {
  return state.operatingModel.areas.find((area) => area.key === state.selectedAreaKey)
    || state.operatingModel.areas[0]
    || null;
}

function recordsForTable(table) {
  return state.databaseTables.get(table.apiSlug)?.records || [];
}

function countForTable(table) {
  return recordsForTable(table).length;
}

function providerLabel(provider) {
  if (provider === "google_drive") {
    return "Google Drive";
  }
  if (provider === "clickup") {
    return "ClickUp";
  }
  return provider || "CompanyCore";
}

function sortedOperatingAreas() {
  return [...state.operatingModel.areas].sort((left, right) => (
    (COMPANY_AREA_ORDER.get(left.key) ?? left.position ?? 99)
    - (COMPANY_AREA_ORDER.get(right.key) ?? right.position ?? 99)
  ));
}

function areaOptionsHtml(selectedAreaId) {
  return sortedOperatingAreas().map((area) => `
    <option value="${escapeHtml(area.id)}"${area.id === selectedAreaId ? " selected" : ""}>${escapeHtml(areaLabel(area))}</option>
  `).join("");
}

function scopeEditorHtml({ id, selectedAreaId, type, label = "Area" }) {
  if (state.operatingModel.areas.length === 0) {
    return "";
  }

  return `
    <label class="scope-editor">
      <span>${escapeHtml(label)}</span>
      <select data-${type}-scope="${escapeHtml(id)}" aria-label="${escapeHtml(label)}">
        ${areaOptionsHtml(selectedAreaId)}
      </select>
    </label>
  `;
}

function renderTasks() {
  tasksTableBody.innerHTML = "";
  taskStats.innerHTML = "";
  taskAdapterBrief.innerHTML = "";
  const tasks = state.tasks;
  syncTaskFilters();
  const clickUpCount = tasks.filter((task) => task.source === "clickup").length;
  const companyCoreCount = tasks.filter((task) => (task.source || "companycore") !== "clickup").length;
  const openTasks = tasks.filter((task) => !["closed", "complete", "completed", "done"].includes(String(task.status || "").toLowerCase())).length;
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dueSoon = tasks.filter((task) => {
    if (!task.dueDate) {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    return !Number.isNaN(dueDate.getTime()) && dueDate <= nextWeek;
  }).length;

  renderTaskStat("Total tasks", tasks.length);
  renderTaskStat("ClickUp", clickUpCount);
  renderTaskStat("Open", openTasks);
  renderTaskStat("Due soon", dueSoon);
  taskAdapterBrief.append(taskAdapterBriefElement({
    tasks,
    clickUpCount,
    companyCoreCount,
    openTasks,
    dueSoon
  }));

  if (tasks.length === 0) {
    tasksSummary.textContent = "No tasks found in this workspace yet.";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No tasks found yet.";
    row.append(cell);
    tasksTableBody.append(row);
    renderIntegrationTaxonomy();
    return;
  }

  const filteredTasks = filteredTaskRows();
  tasksSummary.textContent = `${filteredTasks.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"} shown, including ${clickUpCount} from ClickUp.`;

  if (filteredTasks.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No tasks match the current filters.";
    row.append(cell);
    tasksTableBody.append(row);
    renderIntegrationTaxonomy();
    return;
  }

  for (const task of filteredTasks.slice(0, 80)) {
    const row = document.createElement("tr");
    appendTaskCell(row, task.title);
    appendTaskCell(row, task.status);
    appendTaskCell(row, task.priority || "-");
    appendTaskCell(row, task.taskList?.name || "-");
    appendTaskCell(row, task.source || "companycore");
    appendTaskCell(row, formatDate(task.dueDate));
    tasksTableBody.append(row);
  }
  renderIntegrationTaxonomy();
}

function taskAdapterBriefElement({ tasks, clickUpCount, companyCoreCount, openTasks, dueSoon }) {
  const panel = document.createElement("article");
  panel.className = "adapter-context-card";
  const selectedLists = (state.clickup.config.listIds || []).length;
  const clickupStatus = state.clickup.configured
    ? state.clickup.active ? "ClickUp active" : "ClickUp saved, inactive"
    : "ClickUp not connected";
  const sourceLabel = clickUpCount > 0
    ? `${clickUpCount} ClickUp / ${companyCoreCount} local`
    : `${companyCoreCount} local records`;
  const healthLabel = tasks.length === 0
    ? "No task records loaded"
    : dueSoon > 0 ? `${dueSoon} due soon` : `${openTasks} open`;

  panel.innerHTML = `
    <div class="adapter-context-copy">
      <span class="summary-kicker">Adapter context</span>
      <div class="adapter-context-heading">
        <strong>Task intake and execution records</strong>
        <span class="workbench-index-status">${escapeHtml(clickupStatus)}</span>
      </div>
      <p>Use this view to verify imported ClickUp tasks beside CompanyCore-owned task records. Edit local task records in the typed Data workbench.</p>
      <div class="adapter-context-pills" aria-label="Task adapter operation context">
        <span>${escapeHtml(sourceLabel)}</span>
        <span>${selectedLists} selected ClickUp list${selectedLists === 1 ? "" : "s"}</span>
        <span>${escapeHtml(healthLabel)}</span>
        <span>${state.clickup.active ? "Sync enabled" : "Sync inactive"}</span>
      </div>
    </div>
    <div class="adapter-context-actions">
      <a class="button-link compact" href="/data/tasks" data-link>Open task editor</a>
      <a class="button-link secondary compact" href="/settings" data-link>Configure ClickUp</a>
    </div>
  `;
  bindInlineNavigation(panel);
  return panel;
}

function defaultReassignArea(currentArea) {
  return sortedOperatingAreas().find((area) => area.key === "main-general" && area.id !== currentArea?.id)
    || sortedOperatingAreas().find((area) => area.isSystem && area.id !== currentArea?.id)
    || sortedOperatingAreas().find((area) => area.id !== currentArea?.id)
    || null;
}

function syncTaskFilters() {
  syncTaskFilterSelect(taskStatusFilter, uniqueTaskValues((task) => task.status), "All statuses", state.taskFilters.status);
  syncTaskFilterSelect(taskSourceFilter, uniqueTaskValues((task) => task.source || "companycore"), "All sources", state.taskFilters.source);
  syncTaskFilterSelect(taskListFilter, uniqueTaskValues((task) => task.taskList?.name || "-"), "All lists", state.taskFilters.list);
  taskSearch.value = state.taskFilters.search;
}

function uniqueTaskValues(getValue) {
  return [...new Set(state.tasks.map(getValue).filter(Boolean).map(String))].sort((left, right) => left.localeCompare(right));
}

function syncTaskFilterSelect(select, values, placeholder, selectedValue) {
  const nextValue = values.includes(selectedValue) ? selectedValue : "";
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = placeholder;
  select.append(option);
  for (const value of values) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = value;
    select.append(item);
  }
  select.value = nextValue;
  state.taskFilters[taskFilterKey(select)] = nextValue;
}

function taskFilterKey(select) {
  if (select === taskStatusFilter) {
    return "status";
  }
  if (select === taskSourceFilter) {
    return "source";
  }
  return "list";
}

function filteredTaskRows() {
  const search = state.taskFilters.search.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const source = task.source || "companycore";
    const list = task.taskList?.name || "-";
    const haystack = [task.title, task.status, task.priority, list, source, formatDate(task.dueDate)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (!search || haystack.includes(search))
      && (!state.taskFilters.status || task.status === state.taskFilters.status)
      && (!state.taskFilters.source || source === state.taskFilters.source)
      && (!state.taskFilters.list || list === state.taskFilters.list);
  });
}

function renderTaskStat(label, value) {
  const card = document.createElement("article");
  card.className = "panel summary-card mini-card";
  const kicker = document.createElement("span");
  kicker.className = "summary-kicker";
  kicker.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  card.append(kicker, strong);
  taskStats.append(card);
}

function appendTaskCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "-";
  row.append(cell);
}

function dashboardSignals() {
  const openTasks = state.tasks.filter((task) => !["closed", "complete", "completed", "done"].includes(String(task.status || "").toLowerCase()));
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dueSoonTasks = openTasks.filter((task) => {
    if (!task.dueDate) {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    return !Number.isNaN(dueDate.getTime()) && dueDate <= nextWeek;
  });
  const unmappedProviderMappings = state.operatingModel.externalMappings.filter((mapping) => !mapping.areaId && !mapping.operatingAreaId);
  const unassignedDriveFolders = state.googleDrive.files.filter((file) => file.isFolder && !file.operatingAreaId);
  const pipelineStageRecords = recordCountForSlugs(["pipeline-stages"]);
  const pipelineUsageRecords = recordCountForSlugs(["clients", "deals", "interactions"]);
  const pipelineRecords = pipelineStageRecords + pipelineUsageRecords;

  return {
    openTasks,
    dueSoonTasks,
    unmappedProviderMappings,
    unassignedDriveFolders,
    pipelineRecords,
    pipelineStageRecords,
    pipelineUsageRecords
  };
}

function renderDashboardCommandCenter() {
  const signals = dashboardSignals();
  const areas = state.operatingModel.areas.length;
  const tables = state.operatingModel.areas.flatMap((area) => area.tables || []).length;
  const mappings = state.operatingModel.externalMappings.length;
  const clickUpLists = (state.clickup.config.listIds || []).length;
  const driveItems = state.googleDrive.files.length;
  const implementedGroups = 4;

  moduleAreasMeta.textContent = `${areas || 0} areas, ${tables || 0} tables, ${mappings || 0} provider mappings.`;
  moduleDataMeta.textContent = `${tables || 0} tables, ${totalDatabaseRecords()} records loaded, ${apiRouteRows().length} API routes available.`;
  moduleRelationshipsMeta.textContent = `${signals.unmappedProviderMappings.length + signals.unassignedDriveFolders.length} relationship${signals.unmappedProviderMappings.length + signals.unassignedDriveFolders.length === 1 ? "" : "s"} need review.`;
  moduleTasksMeta.textContent = `${state.tasks.length} tasks, ${signals.openTasks.length} open, ${signals.dueSoonTasks.length} due soon.`;
  modulePipelineMeta.textContent = `${signals.pipelineStageRecords} shared stages, ${signals.pipelineUsageRecords} CRM usage records from clients, deals, and interactions.`;
  moduleDriveMeta.textContent = state.googleDrive.configured
    ? `${driveItems} Drive items imported, ${signals.unassignedDriveFolders.length} folders need area review.`
    : "Google Drive is not connected yet.";
  moduleClickUpMeta.textContent = state.clickup.configured
    ? `${clickUpLists} selected ClickUp List${clickUpLists === 1 ? "" : "s"}, ${state.clickup.active ? "active" : "inactive"} connection.`
    : "ClickUp is not connected yet.";
  moduleIntegrationsMeta.textContent = `${implementedGroups} implemented groups: tasks, files, shared pipelines, API.`;

  const items = dashboardAttentionItems(signals);
  const visibleItems = items.slice(0, 3);
  attentionList.innerHTML = "";
  attentionSummary.textContent = isSignedIn()
    ? items.length === 0
      ? "Everything implemented in this console looks connected and mapped."
      : `${items.length} operational signal${items.length === 1 ? "" : "s"} need a quick look.`
    : "Sign in to load operational signals.";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = isSignedIn()
      ? "No urgent dashboard items. Review modules or keep improving operating-area mappings."
      : "Sign in to load dashboard attention items.";
    attentionList.append(empty);
  } else {
    for (const item of visibleItems) {
      attentionList.append(attentionItemElement(item));
    }
    if (items.length > visibleItems.length) {
      const remaining = document.createElement("p");
      remaining.className = "attention-overflow-note";
      remaining.textContent = `${items.length - visibleItems.length} more signal${items.length - visibleItems.length === 1 ? "" : "s"} are available after the top priority.`;
      attentionList.append(remaining);
    }
  }

  renderDashboardDecisionBoard(signals, items, { areas, tables, mappings, driveItems, clickUpLists });
  renderOperationalCockpit(signals, items, { areas, tables, mappings, pipelineRecords: signals.pipelineRecords });
  renderCompanyMapFrame(signals, items, { areas, tables, mappings, driveItems, clickUpLists });
  nextActionText.textContent = nextActionCopy(items, signals);
}

function renderDashboardDecisionBoard(signals, items, counts) {
  if (!dashboardDecisionTitle || !dashboardDecisionDetail || !dashboardDecisionMetrics || !dashboardDecisionList) {
    return;
  }

  const priority = dashboardPriority(items, signals);
  const graphSummary = state.relationshipGraph.summary || {};
  const reviewCount = signals.unmappedProviderMappings.length
    + signals.unassignedDriveFolders.length
    + state.relationshipGraph.reviewItems.length;
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0;
  const activeKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  const hasRelationshipTool = Array.isArray(state.mcpManifest?.tools)
    && state.mcpManifest.tools.some((tool) => tool.capability === "relationships:read");
  const agentTone = scopedKeys > 0 && hasRelationshipTool ? "ready" : activeKeys > 0 || mcpTools > 0 ? "attention" : "blocked";
  const agentValue = scopedKeys > 0 && hasRelationshipTool
    ? "Safe handoff ready"
    : mcpTools > 0
      ? "Review agent access"
      : "No MCP manifest";
  const integrationReady = integrationReadinessItems().filter((item) => item.status === "ready").length;
  const metricCards = [
    {
      label: "Blockers",
      value: `${items.length}`,
      detail: reviewCount > 0 ? `${reviewCount} mapping or graph reviews` : "No urgent review debt",
      href: items[0]?.href || "/relationships",
      tone: items.length > 0 ? "attention" : "ready"
    },
    {
      label: "Next action",
      value: priority.action,
      detail: priority.title,
      href: priority.href,
      tone: items.length > 0 ? "attention" : "ready"
    },
    {
      label: "AI readiness",
      value: agentValue,
      detail: `${scopedKeys}/${activeKeys} scoped keys, ${mcpTools} tools`,
      href: "/settings/api",
      tone: agentTone
    },
    {
      label: "Company context",
      value: `${counts.areas || 0} areas`,
      detail: `${counts.driveItems || 0} Drive items, ${state.tasks.length} tasks, ${Number(graphSummary.edges || 0)} edges`,
      href: "/areas",
      tone: counts.areas > 0 ? "ready" : "blocked"
    }
  ];

  dashboardDecisionTitle.textContent = priority.title;
  dashboardDecisionDetail.textContent = priority.detail;
  dashboardDecisionPrimary.href = priority.href;
  dashboardDecisionPrimary.textContent = priority.action;
  dashboardDecisionSecondary.href = priority.secondaryHref;
  dashboardDecisionSecondary.textContent = priority.secondaryAction;

  dashboardDecisionMetrics.innerHTML = metricCards.map((metric) => `
    <a class="dashboard-decision-metric is-${escapeHtml(metric.tone)}" href="${escapeHtml(metric.href)}" data-link>
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
      <small>${escapeHtml(metric.detail)}</small>
    </a>
  `).join("");
  bindInlineNavigation(dashboardDecisionMetrics);

  const topItems = items.slice(0, 3);
  dashboardDecisionList.innerHTML = topItems.length > 0
    ? topItems.map((item) => `
      <a class="dashboard-decision-item" href="${escapeHtml(item.href)}" data-link>
        <span class="ui-icon" aria-hidden="true"><i class="ph-bold ${escapeHtml(item.icon || "ph-warning-circle")}"></i></span>
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </span>
      </a>
    `).join("")
    : `
      <a class="dashboard-decision-item is-clear" href="/areas" data-link>
        <span class="ui-icon" aria-hidden="true"><i class="ph-bold ph-check-circle"></i></span>
        <span>
          <strong>${isSignedIn() ? "No urgent blockers" : "Owner session required"}</strong>
          <small>${isSignedIn() ? `${integrationReady}/4 readiness lanes are fully ready. Keep improving company context from areas.` : "Sign in to load current blockers and readiness."}</small>
        </span>
      </a>
    `;
  bindInlineNavigation(dashboardDecisionList);
}

function renderOperationalCockpit(signals, items, counts) {
  const priority = dashboardPriority(items, signals);
  commandPriorityTitle.textContent = priority.title;
  commandPriorityDetail.textContent = priority.detail;
  commandPrimaryAction.href = priority.href;
  commandPrimaryAction.textContent = priority.action;
  commandSecondaryAction.href = priority.secondaryHref;
  commandSecondaryAction.textContent = priority.secondaryAction;

  operationalSteps.innerHTML = "";
  const reviewCount = signals.unmappedProviderMappings.length + signals.unassignedDriveFolders.length;
  const steps = [
    {
      label: "Integrations",
      title: integrationReadinessTitle(),
      detail: integrationReadinessDetail(),
      icon: "ph-plugs-connected",
      href: "/settings/integrations",
      status: state.clickup.configured && state.googleDrive.oauthTokenConfigured ? "good" : state.clickup.configured || state.googleDrive.oauthClientConfigured ? "warn" : "blocked"
    },
    {
      label: "Relationships",
      title: reviewCount === 0 ? "Mapped" : `${reviewCount} to review`,
      detail: reviewCount === 0 ? "Provider and Drive relationships look assigned." : "Provider mappings or Drive folders still need an operating area.",
      icon: "ph-git-branch",
      href: "/relationships",
      status: reviewCount === 0 ? "good" : "warn"
    },
    {
      label: "Execution",
      title: `${signals.openTasks.length} open`,
      detail: signals.dueSoonTasks.length > 0
        ? `${signals.dueSoonTasks.length} due within seven days.`
        : "No urgent due-date pressure detected.",
      icon: "ph-list-checks",
      href: "/tasks-adapter",
      status: signals.dueSoonTasks.length > 0 ? "warn" : "good"
    },
    {
      label: "Data model",
      title: `${counts.areas} areas`,
      detail: `${counts.tables} tables, ${counts.mappings} provider mappings, ${counts.pipelineRecords} shared pipeline and usage records.`,
      icon: "ph-tree-structure",
      href: "/areas",
      status: counts.areas > 0 && counts.tables > 0 ? "good" : "warn"
    }
  ];

  for (const step of steps) {
    operationalSteps.append(operationalStepElement(step));
  }
}

function renderCompanyMapFrame(signals, items, counts) {
  if (!companyMapSummary || !companyStatusStrip || !companyMapCanvas || !companyCommandBrief) {
    return;
  }

  const graphSummary = state.relationshipGraph.summary || {};
  const graphEdges = Number(graphSummary.edges || state.relationshipGraph.edges.length || 0);
  const reviewCount = signals.unmappedProviderMappings.length
    + signals.unassignedDriveFolders.length
    + state.relationshipGraph.reviewItems.length;
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0;
  const priority = dashboardPriority(items, signals);
  const areas = state.operatingModel.areas.length > 0 ? state.operatingModel.areas : COMPANY_AREAS;
  const visibleAreas = areas.slice(0, 13);

  companyMapSummary.textContent = isSignedIn()
    ? `${counts.areas || visibleAreas.length} operating areas, ${counts.tables || 0} tables, ${counts.mappings || 0} provider mappings, ${counts.driveItems || 0} Drive items, and ${mcpTools} MCP tools are visible from this workspace.`
    : "Sign in to load the operating map across areas, relationships, integrations, and agent access.";

  const statusItems = [
    {
      label: "Workspace",
      value: state.workspace?.name || "Not loaded",
      tone: isSignedIn() && state.workspace ? "ready" : "blocked"
    },
    {
      label: "Integrations",
      value: integrationReadinessTitle(),
      tone: integrationReadinessItems().every((item) => item.status === "ready") ? "ready" : "attention"
    },
    {
      label: "Relations",
      value: reviewCount === 0 ? `${graphEdges} clean edges` : `${reviewCount} to review`,
      tone: reviewCount === 0 && state.relationshipGraph.status === "ready" ? "ready" : "attention"
    },
    {
      label: "MCP",
      value: mcpTools > 0 ? `${mcpTools} tools` : "No manifest",
      tone: mcpTools > 0 ? "ready" : "blocked"
    }
  ];

  companyStatusStrip.innerHTML = statusItems.map(companyStatusPillHtml).join("");

  companyMapCanvas.innerHTML = visibleAreas.map((area) => {
    const readiness = companyAreaReadiness(area, signals);
    return companyAreaCardHtml(area, readiness);
  }).join("");
  bindInlineNavigation(companyMapCanvas);

  const activeKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  companyCommandBrief.innerHTML = `
    <span class="summary-kicker">Command brief</span>
    <h3>${escapeHtml(priority.title)}</h3>
    <p>${escapeHtml(priority.detail)}</p>
    <dl class="company-brief-metrics">
      <div>
        <dt>Review queue</dt>
        <dd>${reviewCount}</dd>
      </div>
      <div>
        <dt>Open tasks</dt>
        <dd>${signals.openTasks.length}</dd>
      </div>
      <div>
        <dt>Scoped keys</dt>
        <dd>${scopedKeys}/${activeKeys}</dd>
      </div>
    </dl>
    <div class="actions company-brief-actions">
      <a class="button-link" href="${escapeHtml(priority.href)}" data-link>${escapeHtml(priority.action)}</a>
      <a class="button-link secondary" href="${escapeHtml(priority.secondaryHref)}" data-link>${escapeHtml(priority.secondaryAction)}</a>
    </div>
  `;
  bindInlineNavigation(companyCommandBrief);
}

function companyAreaReadiness(area, signals) {
  const areaId = area.id || area.key;
  const tables = area.tables || [];
  const mappings = state.operatingModel.externalMappings.filter((mapping) => mapping.areaId === areaId || mapping.operatingAreaId === areaId);
  const driveItems = state.googleDrive.files.filter((file) => file.operatingAreaId === areaId);
  const records = tables.reduce((sum, table) => sum + recordCountForSlugs([table.slug].filter(Boolean)), 0);

  if (!isSignedIn()) {
    return {
      tone: "blocked",
      label: "Locked",
      detail: "Sign in to load area coverage."
    };
  }

  if (area.key === "main-general" && (signals.unmappedProviderMappings.length > 0 || signals.unassignedDriveFolders.length > 0)) {
    return {
      tone: "attention",
      label: "Review hub",
      detail: `${signals.unmappedProviderMappings.length + signals.unassignedDriveFolders.length} imported relationship${signals.unmappedProviderMappings.length + signals.unassignedDriveFolders.length === 1 ? "" : "s"} need a home.`
    };
  }

  if (tables.length === 0 && mappings.length === 0 && driveItems.length === 0) {
    return {
      tone: "empty",
      label: "No resources",
      detail: "Ready for future tables, mappings, or files."
    };
  }

  if (tables.length > 0 && (mappings.length > 0 || driveItems.length > 0 || records > 0)) {
    return {
      tone: "ready",
      label: "Operational",
      detail: `${tables.length} table${tables.length === 1 ? "" : "s"}, ${mappings.length} mapping${mappings.length === 1 ? "" : "s"}, ${driveItems.length} Drive item${driveItems.length === 1 ? "" : "s"}.`
    };
  }

  return {
    tone: "attention",
    label: "Needs wiring",
    detail: `${tables.length} table${tables.length === 1 ? "" : "s"}, ${mappings.length} mapping${mappings.length === 1 ? "" : "s"}, ${driveItems.length} Drive item${driveItems.length === 1 ? "" : "s"}.`
  };
}

function companyStatusPillHtml(item) {
  return `
    <article class="company-status-pill is-${escapeHtml(item.tone)}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </article>
  `;
}

function companyAreaCardHtml(area, readiness) {
  const definition = areaDefinitionFor(area);
  const href = area.key ? `/areas?area=${encodeURIComponent(area.key)}` : "/areas";
  return `
    <a class="company-district-card is-${escapeHtml(readiness.tone)}" href="${href}" data-link>
      <span class="company-district-number">${escapeHtml(definition.number || "--")}</span>
      <span class="company-district-copy">
        <strong>${escapeHtml(definition.label || area.name || "Area")}</strong>
        <small>${escapeHtml(readiness.label)}</small>
        <span>${escapeHtml(readiness.detail)}</span>
      </span>
    </a>
  `;
}

function dashboardPriority(items, signals) {
  if (!isSignedIn()) {
    return {
      title: "Sign in to load the command center",
      detail: "Owner login is required before CompanyCore can rank integrations, relationships, tasks, and data health.",
      href: "/auth/login",
      action: "Sign in",
      secondaryHref: "/auth/register",
      secondaryAction: "Create workspace"
    };
  }

  if (items.length > 0) {
    return {
      title: items[0].title,
      detail: items[0].detail,
      href: items[0].href,
      action: items[0].action,
      secondaryHref: "/settings/integrations",
      secondaryAction: "Integration setup"
    };
  }

  if (signals.openTasks.length > 0) {
    return {
      title: "Review open execution",
      detail: `${signals.openTasks.length} task${signals.openTasks.length === 1 ? "" : "s"} are open. Use the task workbench before deeper structural cleanup.`,
      href: "/tasks-adapter",
      action: "Open tasks",
      secondaryHref: "/relationships",
      secondaryAction: "Review mappings"
    };
  }

  return {
    title: "Workspace looks ready",
    detail: "Core integrations and mappings look clean. Continue from operating areas or inspect the API routes agents can use.",
    href: "/areas",
    action: "Open areas",
    secondaryHref: "/settings/api",
    secondaryAction: "View API"
  };
}

function integrationReadinessTitle() {
  const items = integrationReadinessItems();
  const ready = items.filter((item) => item.status === "ready").length;
  return `${ready}/${items.length} ready`;
}

function integrationReadinessDetail() {
  if (!state.clickup.configured && !state.googleDrive.oauthClientConfigured) {
    return "ClickUp and Google Drive still need API setup.";
  }
  if (!state.googleDrive.oauthTokenConfigured && state.googleDrive.oauthClientConfigured) {
    return "Drive OAuth client is saved; consent and import are next.";
  }
  if (!state.clickup.configured) {
    return "Google Drive is ready; ClickUp still needs a token.";
  }
  if (!state.googleDrive.oauthTokenConfigured) {
    return "ClickUp is ready; Google Drive still needs consent/import.";
  }
  return "ClickUp and Google Drive are ready for operating work.";
}

function integrationReadinessItems() {
  const graphSummary = state.relationshipGraph.summary || {};
  const confidence = graphSummary.confidence || {};
  const graphEdges = Number(graphSummary.edges || state.relationshipGraph.edges.length || 0);
  const reviewCount = state.relationshipGraph.reviewItems.length || Number(confidence.needsReview || 0);
  const unsupportedCount = state.relationshipGraph.unsupportedFamilies.length || Number(confidence.unsupported || 0);
  const activeKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0;
  const hasRelationshipTool = Array.isArray(state.mcpManifest?.tools)
    && state.mcpManifest.tools.some((tool) => tool.capability === "relationships:read");

  return [
    {
      label: "ClickUp",
      status: state.clickup.configured && state.clickup.active ? "ready" : state.clickup.configured ? "attention" : "blocked",
      title: state.clickup.configured ? state.clickup.active ? "Token active" : "Saved, inactive" : "Token missing",
      detail: `${state.tasks.filter((task) => task.source === "clickup").length} synced task${state.tasks.filter((task) => task.source === "clickup").length === 1 ? "" : "s"}, ${(state.clickup.config.listIds || []).length} selected List${(state.clickup.config.listIds || []).length === 1 ? "" : "s"}.`,
      href: "/settings",
      action: "Configure"
    },
    {
      label: "Google Drive",
      status: state.googleDrive.oauthTokenConfigured && state.googleDrive.active ? "ready" : state.googleDrive.oauthClientConfigured ? "attention" : "blocked",
      title: state.googleDrive.oauthTokenConfigured ? state.googleDrive.active ? "OAuth active" : "Consent saved, inactive" : state.googleDrive.oauthClientConfigured ? "Consent required" : "OAuth client missing",
      detail: `${state.googleDrive.files.length} imported item${state.googleDrive.files.length === 1 ? "" : "s"}, ${state.googleDrive.files.filter((file) => file.isFolder).length} folder${state.googleDrive.files.filter((file) => file.isFolder).length === 1 ? "" : "s"} available for mapping.`,
      href: "/settings/drive",
      action: "Open Drive"
    },
    {
      label: "Relationship graph",
      status: state.relationshipGraph.status !== "ready" ? "attention" : reviewCount > 0 || unsupportedCount > 0 ? "attention" : "ready",
      title: state.relationshipGraph.status === "ready" ? `${graphEdges} edge${graphEdges === 1 ? "" : "s"}` : "Graph loading",
      detail: `${reviewCount} review item${reviewCount === 1 ? "" : "s"}, ${unsupportedCount} unsupported provider famil${unsupportedCount === 1 ? "y" : "ies"}.`,
      href: "/relationships",
      action: "Review"
    },
    {
      label: "MCP agents",
      status: scopedKeys > 0 && hasRelationshipTool ? "ready" : activeKeys > 0 || mcpTools > 0 ? "attention" : "blocked",
      title: `${scopedKeys} scoped active key${scopedKeys === 1 ? "" : "s"}`,
      detail: `${mcpTools} manifest tool${mcpTools === 1 ? "" : "s"} exposed; relationship graph ${hasRelationshipTool ? "is" : "is not"} available to MCP.`,
      href: "/settings/api",
      action: "Open API"
    }
  ];
}

function operationalStepElement(step) {
  const link = document.createElement("a");
  link.className = `operational-step is-${step.status}`;
  link.href = step.href;
  link.dataset.link = "";
  link.innerHTML = `
    <span class="ui-icon operational-step-icon" aria-hidden="true"><i class="ph-bold ${escapeHtml(step.icon || "ph-circle")}"></i></span>
    <span class="operational-step-copy">
      <span>${escapeHtml(step.label)}</span>
      <strong>${escapeHtml(step.title)}</strong>
      <small>${escapeHtml(step.detail)}</small>
    </span>
  `;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(step.href);
  });
  return link;
}

function dashboardAttentionItems(signals) {
  const items = [];

  if (!state.clickup.configured) {
    items.push({
      title: "Connect ClickUp",
      detail: "Task Lists and ClickUp-sourced tasks need a saved connection before the task module is useful.",
      icon: "ph-plugs",
      href: "/settings",
      action: "Open ClickUp"
    });
  }

  if (!state.googleDrive.configured) {
    items.push({
      title: "Connect Google Drive",
      detail: "Drive folders and files can be mapped to company areas after OAuth and import.",
      icon: "ph-cloud",
      href: "/settings/drive",
      action: "Open Drive"
    });
  }

  if (signals.unmappedProviderMappings.length > 0) {
    items.push({
      title: "Review provider mappings",
      detail: `${signals.unmappedProviderMappings.length} provider mapping${signals.unmappedProviderMappings.length === 1 ? "" : "s"} still need an operating area.`,
      icon: "ph-git-branch",
      href: "/relationships",
      action: "Correct areas"
    });
  }

  if (signals.unassignedDriveFolders.length > 0) {
    items.push({
      title: "Assign Drive folders",
      detail: `${signals.unassignedDriveFolders.length} Drive folder${signals.unassignedDriveFolders.length === 1 ? "" : "s"} can be assigned to the right company area.`,
      icon: "ph-folder",
      href: "/relationships",
      action: "Review folders"
    });
  }

  if (signals.dueSoonTasks.length > 0) {
    items.push({
      title: "Check due tasks",
      detail: `${signals.dueSoonTasks.length} open task${signals.dueSoonTasks.length === 1 ? "" : "s"} are due within seven days.`,
      icon: "ph-warning-circle",
      href: "/tasks-adapter",
      action: "Open tasks"
    });
  }

  if (signals.pipelineRecords === 0) {
    items.push({
      title: "Review shared pipelines",
      detail: "Shared stages and current CRM usage records are implemented, but no pipeline data is loaded yet.",
      icon: "ph-kanban",
      href: "/pipeline",
      action: "Open pipeline"
    });
  }

  return items.slice(0, 5);
}

function attentionItemElement(item) {
  const row = document.createElement("article");
  row.className = "attention-row";

  const icon = document.createElement("span");
  icon.className = "ui-icon attention-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<i class="ph-bold ${escapeHtml(item.icon || "ph-warning-circle")}"></i>`;

  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = item.title;
  const detail = document.createElement("span");
  detail.textContent = item.detail;
  copy.append(title, detail);

  const link = document.createElement("a");
  link.className = "button-link secondary compact";
  link.href = item.href;
  link.dataset.link = "";
  link.textContent = item.action;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(item.href);
  });

  row.append(icon, copy, link);
  return row;
}

function nextActionCopy(items, signals) {
  if (!isSignedIn()) {
    return "Sign in to load workspace data and recommended actions.";
  }
  if (items.length > 0) {
    return `${items[0].title}: ${items[0].detail}`;
  }
  if (signals.openTasks.length > 0) {
    return `Review ${signals.openTasks.length} open task${signals.openTasks.length === 1 ? "" : "s"} or continue improving operating-area relationships.`;
  }
  return "Open the integration map or operating areas to keep relationships clean as new data arrives.";
}

function renderAccountSettings() {
  const connected = isSignedIn() && state.workspace;
  const ownerName = state.user?.name || state.user?.email || "Owner";
  const ownerEmail = state.user?.email || "No email loaded.";
  const workspaceName = state.workspace?.name || "-";
  const workspaceId = state.workspace?.id ? `Workspace ID: ${state.workspace.id}` : "No workspace loaded.";

  accountSummary.textContent = connected
    ? `${workspaceName} account context is loaded for this owner session.`
    : "Sign in to load account context.";
  accountOwnerName.textContent = connected ? ownerName : "-";
  accountOwnerEmail.textContent = connected ? ownerEmail : "No owner loaded.";
  accountWorkspaceName.textContent = connected ? workspaceName : "-";
  accountWorkspaceId.textContent = workspaceId;

  accountContext.innerHTML = "";
  accountContext.append(accountContextElement({
    connected,
    ownerName,
    ownerEmail,
    workspaceName
  }));

  accountReadiness.innerHTML = "";
  const readiness = [
    ["Owner session", connected ? "Connected" : "Not connected", "/dashboard"],
    ["ClickUp", state.clickup.configured ? state.clickup.active ? "Active" : "Saved, inactive" : "Not connected", "/settings"],
    ["Google Drive", state.googleDrive.configured ? state.googleDrive.active ? "Active" : "Saved, inactive" : "Not connected", "/settings/drive"],
    ["API capabilities", `${state.capabilities.length} route${state.capabilities.length === 1 ? "" : "s"}`, "/settings/api"],
    ["Operating areas", `${state.operatingModel.areas.length} area${state.operatingModel.areas.length === 1 ? "" : "s"}`, "/areas"],
    ["Integrations", "Implemented taxonomy", "/settings/integrations"]
  ];

  for (const [label, status, href] of readiness) {
    const link = document.createElement("a");
    link.className = "account-readiness-item";
    link.href = href;
    link.dataset.link = "";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const span = document.createElement("span");
    span.textContent = status;
    link.append(strong, span);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(href);
    });
    accountReadiness.append(link);
  }
}

function accountContextElement({ connected, ownerName, ownerEmail, workspaceName }) {
  const activeKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  const ownerLabel = ownerEmail === "No email loaded." ? ownerName : `${ownerName} (${ownerEmail})`;
  const driveStatus = state.googleDrive.oauthTokenConfigured
    ? state.googleDrive.active ? "Drive active" : "Drive saved"
    : state.googleDrive.oauthClientConfigured ? "Consent needed" : "Drive not connected";
  const clickUpStatus = state.clickup.configured
    ? state.clickup.active ? "ClickUp active" : "ClickUp saved"
    : "ClickUp not connected";
  const panel = document.createElement("article");
  panel.className = "account-context-card";
  panel.innerHTML = `
    <div class="account-context-copy">
      <span class="summary-kicker">Workspace command profile</span>
      <div class="account-context-heading">
        <strong>${escapeHtml(connected ? workspaceName : "Owner workspace")}</strong>
        <span class="workbench-index-status">${escapeHtml(connected ? "Owner session active" : "Sign in required")}</span>
      </div>
      <p>${escapeHtml(connected ? `${ownerLabel} can review workspace readiness, integrations, and agent access from this account surface.` : "Sign in to load owner, workspace, integration, and agent access context.")}</p>
      <div class="account-context-pills" aria-label="Workspace account context">
        <span>${escapeHtml(clickUpStatus)}</span>
        <span>${escapeHtml(driveStatus)}</span>
        <span>${state.capabilities.length} API route${state.capabilities.length === 1 ? "" : "s"}</span>
        <span>${activeKeys} active key${activeKeys === 1 ? "" : "s"}</span>
        <span>${scopedKeys} scoped key${scopedKeys === 1 ? "" : "s"}</span>
        <span>${state.operatingModel.areas.length} area${state.operatingModel.areas.length === 1 ? "" : "s"}</span>
      </div>
    </div>
    <div class="account-context-actions">
      <a class="button-link compact" href="/settings/integrations" data-link>Integration map</a>
      <a class="button-link secondary compact" href="/settings/api" data-link>Agent API</a>
      <a class="button-link secondary compact" href="/areas" data-link>Operating areas</a>
    </div>
  `;
  bindInlineNavigation(panel);
  return panel;
}

const relationshipWorkbench = window.CompanyCoreRelationshipWorkbench.create({
  state,
  elements: {
    relationshipSummary,
    relationshipContext,
    relationshipSearch,
    relationshipSourceFilter,
    relationshipQueue,
    relationshipProviderList,
    relationshipDriveList
  },
  helpers: {
    areaLabel,
    bindInlineNavigation,
    escapeHtml,
    isSignedIn,
    providerLabel,
    renderCompactList,
    scopeEditorHtml
  }
});

function renderRelationshipCenter() {
  relationshipWorkbench.render();
}
function renderPipeline() {
  pipelineStats.innerHTML = "";
  pipelineContext.innerHTML = "";
  const clients = recordsForSlug("clients");
  const stages = recordsForSlug("pipeline-stages");
  const deals = recordsForSlug("deals");
  const interactions = recordsForSlug("interactions");
  const total = clients.length + stages.length + deals.length + interactions.length;
  const usageRecords = clients.length + deals.length + interactions.length;
  const records = pipelineRecords({ clients, stages, deals, interactions });
  syncPipelineFilters(records);
  const filteredRecords = filteredPipelineRecords(records);

  pipelineSummary.textContent = isSignedIn()
    ? `${filteredRecords.length} of ${total} shared pipeline and CRM usage record${total === 1 ? "" : "s"} shown from implemented CompanyCore tables.`
    : "Sign in to load pipeline data.";

  renderPipelineStat("Clients", clients.length);
  renderPipelineStat("Stages", stages.length);
  renderPipelineStat("Deals", deals.length);
  renderPipelineStat("Interactions", interactions.length);
  pipelineContext.append(pipelineContextElement({
    stagesCount: stages.length,
    usageRecords,
    total,
    filteredCount: filteredRecords.length
  }));
  renderPipelineFeed(records, filteredRecords);

  renderPipelineList(pipelineStagesList, stages, "No pipeline stages found yet.", (stage) => ({
    title: stage.name || stage.title || stage.id,
    meta: [stage.status, stage.source || "companycore"].filter(Boolean).join(" · ") || "companycore"
  }));
  renderPipelineList(pipelineDealsList, deals, "No deals found yet.", (deal) => ({
    title: deal.title || deal.name || deal.summary || deal.id,
    meta: [deal.status, deal.source || "companycore", formatDate(deal.updatedAt || deal.createdAt)].filter(Boolean).join(" · ")
  }));
  renderPipelineList(pipelineClientsList, clients, "No clients found yet.", (client) => ({
    title: client.name || client.email || client.id,
    meta: [client.email, client.status, client.source || "companycore"].filter(Boolean).join(" · ")
  }));
  renderPipelineList(pipelineInteractionsList, interactions, "No interactions found yet.", (interaction) => ({
    title: interaction.summary || interaction.title || interaction.type || interaction.id,
    meta: [interaction.channel || interaction.type, interaction.source || "companycore", formatDate(interaction.occurredAt || interaction.createdAt)].filter(Boolean).join(" · ")
  }));
}

function pipelineContextElement({ stagesCount, usageRecords, total, filteredCount }) {
  const panel = document.createElement("article");
  panel.className = "pipeline-context-card";
  const status = stagesCount > 0 ? "Workflow stages ready" : "Workflow API ready";
  const usageLabel = usageRecords === 1 ? "CRM usage record" : "CRM usage records";
  panel.innerHTML = `
    <div class="pipeline-context-copy">
      <span class="summary-kicker">Workflow context</span>
      <div class="pipeline-context-heading">
        <strong>Shared stages, current CRM usage</strong>
        <span class="workbench-index-status">${escapeHtml(status)}</span>
      </div>
      <p>Pipeline stages are reusable workflow infrastructure for any department. Clients, deals, and interactions are the current CRM records using that workflow model.</p>
      <div class="pipeline-context-pills" aria-label="Pipeline operation context">
        <span>${stagesCount} reusable stage${stagesCount === 1 ? "" : "s"}</span>
        <span>${usageRecords} ${escapeHtml(usageLabel)}</span>
        <span>${filteredCount} of ${total} visible</span>
        <span>4 implemented tables</span>
      </div>
    </div>
    <div class="pipeline-context-actions">
      <a class="button-link compact" href="/data/pipeline-stages" data-link>Open stages</a>
      <a class="button-link secondary compact" href="/data/clients" data-link>Open CRM records</a>
    </div>
  `;
  bindInlineNavigation(panel);
  return panel;
}

function recordsForSlug(slug) {
  return state.databaseTables.get(slug)?.records || [];
}

function pipelineRecords(groups) {
  return [
    ...groups.clients.map((record) => pipelineRecord("clients", "Client", record, {
      title: record.name || record.email || record.id,
      meta: [record.email, record.status, record.source || "companycore"].filter(Boolean).join(" - "),
      status: record.status
    })),
    ...groups.stages.map((record) => pipelineRecord("pipeline-stages", "Stage", record, {
      title: record.name || record.title || record.id,
      meta: [record.status, record.source || "companycore"].filter(Boolean).join(" - ") || "companycore",
      status: record.status
    })),
    ...groups.deals.map((record) => pipelineRecord("deals", "Deal", record, {
      title: record.title || record.name || record.summary || record.id,
      meta: [record.status, record.source || "companycore", formatDate(record.updatedAt || record.createdAt)].filter(Boolean).join(" - "),
      status: record.status
    })),
    ...groups.interactions.map((record) => pipelineRecord("interactions", "Interaction", record, {
      title: record.summary || record.title || record.type || record.id,
      meta: [record.channel || record.type, record.source || "companycore", formatDate(record.occurredAt || record.createdAt)].filter(Boolean).join(" - "),
      status: record.status || record.type || record.channel
    }))
  ];
}

function pipelineRecord(type, label, record, content) {
  const status = content.status ? String(content.status) : "";
  const source = record.source || "companycore";
  const updatedAt = formatDate(record.updatedAt || record.createdAt || record.occurredAt);
  const searchable = [
    label,
    content.title,
    content.meta,
    status,
    source,
    updatedAt,
    record.email,
    record.name,
    record.title,
    record.summary,
    record.channel,
    record.type
  ].filter(Boolean).join(" ").toLowerCase();

  return {
    type,
    label,
    title: content.title || record.id || "-",
    meta: content.meta || source,
    status,
    source,
    updatedAt,
    searchable
  };
}

function syncPipelineFilters(records) {
  pipelineSearch.value = state.pipelineFilters.search;
  pipelineTypeFilter.value = state.pipelineFilters.type;
  const statuses = [...new Set(records.map((record) => record.status).filter(Boolean).map(String))]
    .sort((left, right) => left.localeCompare(right));
  const nextStatus = statuses.includes(state.pipelineFilters.status) ? state.pipelineFilters.status : "";
  pipelineStatusFilter.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "All statuses";
  pipelineStatusFilter.append(placeholder);
  for (const status of statuses) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    pipelineStatusFilter.append(option);
  }
  pipelineStatusFilter.value = nextStatus;
  state.pipelineFilters.status = nextStatus;
}

function filteredPipelineRecords(records) {
  const search = state.pipelineFilters.search.trim().toLowerCase();
  return records.filter((record) => (!search || record.searchable.includes(search))
    && (!state.pipelineFilters.type || record.type === state.pipelineFilters.type)
    && (!state.pipelineFilters.status || record.status === state.pipelineFilters.status));
}

function renderPipelineFeed(records, filteredRecords) {
  pipelineRecordFeed.innerHTML = "";

  if (records.length === 0) {
    pipelineFeedSummary.textContent = "No shared pipeline or CRM usage records are loaded from the implemented tables yet.";
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Add or sync shared stages, clients, deals, or interactions to populate this feed.";
    pipelineRecordFeed.append(empty);
    return;
  }

  pipelineFeedSummary.textContent = `${filteredRecords.length} of ${records.length} pipeline record${records.length === 1 ? "" : "s"} match the current view.`;

  if (filteredRecords.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No pipeline records match the current filters.";
    pipelineRecordFeed.append(empty);
    return;
  }

  for (const item of filteredRecords.slice(0, 12)) {
    const row = document.createElement("div");
    row.className = "compact-row pipeline-record-row";
    const eyebrow = document.createElement("span");
    eyebrow.className = "record-type";
    eyebrow.textContent = item.label;
    const title = document.createElement("strong");
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.textContent = item.meta || item.source;
    row.append(eyebrow, title, meta);
    pipelineRecordFeed.append(row);
  }
}

function renderPipelineStat(label, value) {
  const card = document.createElement("article");
  card.className = "panel summary-card mini-card";
  const kicker = document.createElement("span");
  kicker.className = "summary-kicker";
  kicker.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  card.append(kicker, strong);
  pipelineStats.append(card);
}

function renderPipelineList(container, items, emptyText, getContent) {
  container.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  for (const item of items.slice(0, 8)) {
    const content = getContent(item);
    const row = document.createElement("div");
    row.className = "compact-row";
    const strong = document.createElement("strong");
    strong.textContent = content.title || item.id || "-";
    const span = document.createElement("span");
    span.textContent = content.meta || "companycore";
    row.append(strong, span);
    container.append(row);
  }
}

function renderIntegrationTaxonomy() {
  integrationContext.innerHTML = "";
  integrationGroups.innerHTML = "";
  integrationAreaMatrix.innerHTML = "";

  const clickUpTasks = state.tasks.filter((task) => task.source === "clickup").length;
  const driveFolders = state.googleDrive.files.filter((file) => file.isFolder).length;
  const pipelineRecords = recordCountForSlugs(["clients", "pipeline-stages", "deals", "interactions"]);
  const driveStatus = state.googleDrive.oauthTokenConfigured
    ? state.googleDrive.active ? "Active" : "Saved, inactive"
    : state.googleDrive.oauthClientConfigured ? "OAuth client saved" : "Not connected";
  const readinessItems = integrationReadinessItems();
  const relationshipSummary = state.relationshipGraph.summary || {};
  const relationshipConfidence = relationshipSummary.confidence || {};
  const relationshipEdges = Number(relationshipSummary.edges || state.relationshipGraph.edges.length || 0);
  const relationshipReviews = state.relationshipGraph.reviewItems.length || Number(relationshipConfidence.needsReview || 0);
  const unsupportedFamilies = state.relationshipGraph.unsupportedFamilies.length || Number(relationshipConfidence.unsupported || 0);
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools.length : 0;
  const activeApiKeys = state.apiKeys.filter((key) => key.active).length;
  const scopedApiKeys = state.apiKeys.filter((key) => key.active && Array.isArray(key.scopes) && key.scopes.length > 0).length;
  const readyChecks = readinessItems.filter((item) => item.status === "ready").length;
  const groups = [
    {
      type: "Tasks",
      name: "ClickUp task lists",
      status: state.clickup.configured ? state.clickup.active ? "Active" : "Saved, inactive" : "Not connected",
      metric: `${state.tasks.length} task${state.tasks.length === 1 ? "" : "s"}`,
      detail: `${clickUpTasks} from ClickUp, ${(state.clickup.config.listIds || []).length} selected List${(state.clickup.config.listIds || []).length === 1 ? "" : "s"}.`,
      primaryHref: "/tasks-adapter",
      primaryLabel: "Open tasks",
      secondaryHref: "/settings",
      secondaryLabel: "Configure"
    },
    {
      type: "Files",
      name: "Google Drive",
      status: driveStatus,
      metric: `${state.googleDrive.files.length} Drive item${state.googleDrive.files.length === 1 ? "" : "s"}`,
      detail: state.googleDrive.oauthTokenConfigured
        ? `${driveFolders} imported folder${driveFolders === 1 ? "" : "s"} available for area mapping.`
        : "Save OAuth client credentials, approve consent, then import selected folders.",
      primaryHref: "/settings/drive",
      primaryLabel: "Open Drive",
      secondaryHref: "/areas",
      secondaryLabel: "Map areas"
    },
    {
      type: "Graph",
      name: "Relationship graph",
      status: state.relationshipGraph.status === "ready"
        ? relationshipReviews > 0 || unsupportedFamilies > 0 ? "Needs review" : "Ready"
        : "Loading evidence",
      metric: `${relationshipEdges} graph edge${relationshipEdges === 1 ? "" : "s"}`,
      detail: `${relationshipReviews} review item${relationshipReviews === 1 ? "" : "s"} and ${unsupportedFamilies} unsupported provider famil${unsupportedFamilies === 1 ? "y" : "ies"} need owner attention before agents should trust inferred links.`,
      primaryHref: "/relationships",
      primaryLabel: "Open graph",
      secondaryHref: "/settings/api",
      secondaryLabel: "MCP access"
    },
    {
      type: "Pipelines",
      name: "Shared pipeline data",
      status: "Implemented API",
      metric: `${pipelineRecords} record${pipelineRecords === 1 ? "" : "s"}`,
      detail: "Pipeline stages are shared workflow infrastructure; CRM clients, deals, and interactions are current usage records.",
      primaryHref: "/pipeline",
      primaryLabel: "Open pipeline",
      secondaryHref: "/settings/api",
      secondaryLabel: "API routes"
    },
    {
      type: "API",
      name: "Agents and service clients",
      status: scopedApiKeys > 0 ? "Scoped access ready" : activeApiKeys > 0 ? "Active key needs scopes" : "No active agent key",
      metric: `${mcpTools} MCP tool${mcpTools === 1 ? "" : "s"}`,
      detail: `${activeApiKeys} active API key${activeApiKeys === 1 ? "" : "s"}; ${scopedApiKeys} scoped for least-privilege MCP usage across Jarvis, Paperclip, Aviary, and internal tools.`,
      primaryHref: "/settings/api",
      primaryLabel: "Open API",
      secondaryHref: "/dashboard",
      secondaryLabel: "Dashboard"
    }
  ];

  integrationSummary.textContent = isSignedIn()
    ? `${readyChecks}/${readinessItems.length} readiness checks are green across ${groups.length} integration, graph, data, and MCP groups.`
    : "Sign in to load integration data.";

  integrationContext.append(integrationContextElement({
    groupsCount: groups.length,
    readinessItems,
    readyChecks,
    clickUpTasks,
    driveFolders,
    pipelineRecords,
    driveStatus,
    integrationStatus: integrationReadinessTitle()
  }));

  for (const group of groups) {
    integrationGroups.append(integrationGroupCard(group));
  }

  integrationSearch.value = state.integrationFilters.search;
  integrationTypeFilter.value = state.integrationFilters.type;
  renderIntegrationAreaMatrix();
}

function integrationContextElement({ groupsCount, readinessItems, readyChecks, clickUpTasks, driveFolders, pipelineRecords, driveStatus, integrationStatus }) {
  const areas = sortedOperatingAreas();
  const apiRoutes = apiRouteRows().length;
  const panel = document.createElement("article");
  panel.className = "integration-context-card";
  panel.innerHTML = `
    <div class="integration-context-copy">
      <span class="summary-kicker">Integration command map</span>
      <div class="integration-context-heading">
        <strong>Integration readiness dashboard</strong>
        <span class="workbench-index-status">${escapeHtml(isSignedIn() ? integrationStatus : "Sign in required")}</span>
      </div>
      <p>Use this map to see which provider sources, relationship evidence, CompanyCore tables, and MCP-facing routes are ready for daily work.</p>
      <div class="integration-context-pills" aria-label="Integration operation context">
        <span>${readyChecks}/${readinessItems.length} ready</span>
        <span>${groupsCount} implemented group${groupsCount === 1 ? "" : "s"}</span>
        <span>${areas.length} area${areas.length === 1 ? "" : "s"}</span>
        <span>${clickUpTasks} ClickUp task${clickUpTasks === 1 ? "" : "s"}</span>
        <span>${driveFolders} Drive folder${driveFolders === 1 ? "" : "s"}</span>
        <span>${pipelineRecords} pipeline record${pipelineRecords === 1 ? "" : "s"}</span>
        <span>${apiRoutes} API route${apiRoutes === 1 ? "" : "s"}</span>
        <span>Drive: ${escapeHtml(driveStatus)}</span>
      </div>
      <div class="integration-readiness-grid" aria-label="Integration readiness checks">
        ${readinessItems.map((item) => integrationReadinessItemHtml(item)).join("")}
      </div>
    </div>
    <div class="integration-context-actions">
      <a class="button-link compact" href="/settings" data-link>ClickUp setup</a>
      <a class="button-link secondary compact" href="/settings/drive" data-link>Drive setup</a>
      <a class="button-link secondary compact" href="/relationships" data-link>Graph review</a>
      <a class="button-link secondary compact" href="/settings/api" data-link>Agent API</a>
    </div>
  `;
  bindInlineNavigation(panel);
  return panel;
}

function integrationReadinessItemHtml(item) {
  return `
    <a class="integration-readiness-item is-${escapeHtml(item.status)}" href="${escapeHtml(item.href)}" data-link>
      <span>
        <small>${escapeHtml(item.label)}</small>
        <strong>${escapeHtml(item.title)}</strong>
      </span>
      <em>${escapeHtml(item.detail)}</em>
      <b>${escapeHtml(item.action)}</b>
    </a>
  `;
}

function integrationGroupCard(group) {
  const article = document.createElement("article");
  article.className = "panel integration-card";

  const kicker = document.createElement("span");
  kicker.className = "summary-kicker";
  kicker.textContent = group.type;

  const title = document.createElement("strong");
  title.textContent = group.name;

  const status = document.createElement("p");
  status.className = "integration-status";
  status.textContent = group.status;

  const metric = document.createElement("p");
  metric.className = "integration-metric";
  metric.textContent = group.metric;

  const detail = document.createElement("p");
  detail.textContent = group.detail;

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    integrationLink(group.primaryHref, group.primaryLabel, ""),
    integrationLink(group.secondaryHref, group.secondaryLabel, "secondary")
  );

  article.append(kicker, title, status, metric, detail, actions);
  return article;
}

function integrationLink(href, label, variant) {
  const link = document.createElement("a");
  link.className = `button-link compact ${variant}`.trim();
  link.href = href;
  link.dataset.link = "";
  link.textContent = label;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(href);
  });
  return link;
}

function recordCountForSlugs(slugs) {
  return slugs.reduce((sum, slug) => sum + (state.databaseTables.get(slug)?.records.length || 0), 0);
}

function totalDatabaseRecords() {
  return [...state.databaseTables.values()].reduce((sum, item) => sum + item.records.length, 0);
}

function dataModuleRows() {
  const operatingTables = state.operatingModel.areas.flatMap((area) => (area.tables || []).map((table) => ({
    area,
    table
  })));
  const tableBySlug = new Map(operatingTables.map((item) => [item.table.apiSlug, item]));
  const apiRoutes = apiRouteRows();

  return dataModuleCatalog.map((module) => {
    const tableContext = tableBySlug.get(module.slug);
    const records = state.databaseTables.get(module.slug)?.records || [];
    const routes = apiRoutes.filter((route) => route.path === `/v1/${module.slug}` || route.path.startsWith(`/v1/${module.slug}/`));
    const sources = [...new Set(records.map((record) => record?.source || "companycore").filter(Boolean).map(String))];
    return {
      ...module,
      records,
      routes,
      sources,
      area: tableContext?.area || null,
      table: tableContext?.table || null,
      searchable: [
        module.label,
        module.group,
        module.description,
        tableContext?.area?.name,
        tableContext?.table?.tableName,
        ...sources,
        ...routes.map((route) => route.method)
      ].filter(Boolean).join(" ").toLowerCase()
    };
  });
}

function renderDataOperations() {
  dataOperationsStats.innerHTML = "";
  dataModuleList.innerHTML = "";
  const rows = dataModuleRows();
  syncDataFilters(rows);
  const filteredRows = filteredDataModuleRows(rows);
  const writableRows = rows.filter((row) => row.routes.some((route) => ["POST", "PATCH", "DELETE"].includes(route.method))).length;
  const routedRows = rows.filter((row) => row.routes.length > 0).length;

  dataOperationsSummary.textContent = isSignedIn()
    ? `${filteredRows.length} of ${rows.length} database module${rows.length === 1 ? "" : "s"} shown, ${totalDatabaseRecords()} total records loaded.`
    : "Sign in to load database modules.";

  [
    ["Modules", rows.length],
    ["Records", totalDatabaseRecords()],
    ["API-backed", routedRows],
    ["Writable", writableRows],
    ["Groups", new Set(rows.map((row) => row.group)).size],
    ["Drive files", state.googleDrive.files.length]
  ].forEach(([label, value]) => {
    dataOperationsStats.append(summaryStatCard(label, value));
  });

  if (!isSignedIn()) {
    dataModuleList.append(emptyNote("Sign in to review database modules."));
    return;
  }

  if (filteredRows.length === 0) {
    dataModuleList.append(emptyNote("No database modules match the current filters."));
    return;
  }

  for (const row of filteredRows) {
    dataModuleList.append(dataModuleRowElement(row));
  }
}

function syncDataFilters(rows) {
  dataSearch.value = state.dataFilters.search;
  const groups = [...new Set(rows.map((row) => row.group))].sort((left, right) => left.localeCompare(right));
  const nextGroup = groups.includes(state.dataFilters.group) ? state.dataFilters.group : "";
  dataGroupFilter.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "All groups";
  dataGroupFilter.append(option);
  for (const group of groups) {
    const item = document.createElement("option");
    item.value = group;
    item.textContent = group;
    dataGroupFilter.append(item);
  }
  dataGroupFilter.value = nextGroup;
  state.dataFilters.group = nextGroup;
}

function filteredDataModuleRows(rows) {
  const search = state.dataFilters.search.trim().toLowerCase();
  return rows.filter((row) => (!search || row.searchable.includes(search))
    && (!state.dataFilters.group || row.group === state.dataFilters.group));
}

function dataModuleRowElement(row) {
  const link = document.createElement("a");
  const typedEditorAvailable = hasTypedRecordEditor(row.slug);
  const readiness = tableAiReadiness(row, row.records, row.sources);
  const writableMethods = row.routes.filter((route) => ["POST", "PATCH", "DELETE"].includes(route.method));
  const routeStatus = row.routes.length > 0
    ? `${row.routes.length} API route${row.routes.length === 1 ? "" : "s"}`
    : "No API route";
  const writeStatus = writableMethods.length > 0
    ? `${writableMethods.length} write action${writableMethods.length === 1 ? "" : "s"}`
    : "Inspect only";
  const editorStatus = typedEditorAvailable ? "Typed editor" : "Read-only";
  link.className = `workbench-index-row ${typedEditorAvailable ? "is-editable" : "is-readonly"}`;
  link.href = row.href;
  link.dataset.link = "";
  const methods = row.routes.length > 0
    ? [...new Set(row.routes.map((route) => route.method))].join(", ")
    : "No route";
  link.innerHTML = `
    <div class="workbench-index-copy">
      <span class="summary-kicker">${escapeHtml(row.group)}</span>
      <div class="workbench-index-heading">
        <strong>${escapeHtml(row.label)}</strong>
        <span class="workbench-index-status">${escapeHtml(editorStatus)}</span>
      </div>
      <p>${escapeHtml(row.description)}</p>
      <div class="workbench-index-tags" aria-label="Module operation details">
        <span>${escapeHtml(routeStatus)}</span>
        <span>${escapeHtml(writeStatus)}</span>
        <span>${escapeHtml(row.area ? areaLabel(row.area) : "Unmapped area")}</span>
      </div>
      <div class="provenance-badges" aria-label="Module provenance and AI readiness">
        <span class="provenance-badge provenance-badge-source">${escapeHtml(readiness.sourceLabel)}</span>
        <span class="provenance-badge">${escapeHtml(readiness.evidence)}</span>
        <span class="ai-safety-badge ai-safety-${escapeHtml(readiness.tone)}">${escapeHtml(readiness.label)}</span>
      </div>
      <span class="provenance-detail">${escapeHtml(readiness.detail)}</span>
    </div>
    <div class="workbench-index-side">
      <div class="workbench-index-metrics">
        <span><strong>${row.records.length}</strong> records</span>
        <span><strong>${row.routes.length}</strong> routes</span>
        <span><strong>${row.sources.length}</strong> sources</span>
      </div>
      <div class="workbench-index-meta">
        <span>${escapeHtml(methods)}</span>
        <span>${escapeHtml(row.sources.length > 0 ? row.sources.join(", ") : "no source data")}</span>
      </div>
      <span class="workbench-index-action">Open table</span>
    </div>
  `;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(row.href);
  });
  return link;
}

function currentTableModule() {
  const slug = dataTableSlugFromPath();
  return dataModuleRows().find((row) => row.slug === slug) || null;
}

function renderTableWorkbench() {
  const module = currentTableModule();
  tableWorkbenchStats.innerHTML = "";
  tableWorkbenchBrief.innerHTML = "";
  tableRecordList.innerHTML = "";
  recordInspector.innerHTML = "";

  if (!module) {
    tableWorkbenchLabel.textContent = "Database table";
    tableWorkbenchTitle.textContent = "Unknown table";
    tableWorkbenchSummary.textContent = "This data module is not part of the current CompanyCore table catalog.";
    tableRecordsTitle.textContent = "Records";
    tableRecordsSummary.textContent = "Open the data index to choose an implemented module.";
    tableWorkbenchStats.append(summaryStatCard("Records", 0), summaryStatCard("Routes", 0), summaryStatCard("Fields", 0), summaryStatCard("Sources", 0));
    tableWorkbenchBrief.append(tableWorkbenchBriefElement(null, [], [], []));
    tableRecordList.append(tableWorkbenchEmptyState({
      title: "Unsupported table route",
      message: "This route does not match an implemented CompanyCore data module.",
      actionLabel: "Open data index",
      href: "/data"
    }));
    recordInspector.append(tableWorkbenchEmptyState({
      title: "Choose a supported module",
      message: "Open the Data index to inspect implemented tables, API coverage, and available editors.",
      actionLabel: "All data",
      href: "/data"
    }));
    return;
  }

  const records = module.records || [];
  const fields = tableFieldNames(records);
  const sources = tableSources(records);
  const filteredRecords = filteredTableRecords(module, records);
  const typedEditorAvailable = hasTypedRecordEditor(module.slug);
  const selected = typedEditorAvailable && state.tableWorkbench.newDraft
    ? null
    : filteredRecords.length === 0
      ? null
    : selectedTableRecord(filteredRecords, records);

  tableWorkbenchLabel.textContent = module.group;
  tableWorkbenchTitle.textContent = module.label;
  tableWorkbenchSummary.textContent = `${module.description} ${module.area ? `Mapped to ${areaLabel(module.area)}.` : "Not mapped to an operating area yet."}`;
  tableRecordsTitle.textContent = `${module.label} records`;
  tableRecordsSummary.textContent = `${filteredRecords.length} of ${records.length} record${records.length === 1 ? "" : "s"} shown.`;
  tableWorkbenchApiLink.href = `/settings/api`;

  [
    ["Records", records.length],
    ["Fields", fields.length],
    ["Routes", module.routes.length],
    ["Sources", sources.length || 1]
  ].forEach(([label, value]) => tableWorkbenchStats.append(summaryStatCard(label, value)));
  tableWorkbenchBrief.append(tableWorkbenchBriefElement(module, records, fields, sources));

  syncTableFilters(sources);

  if (!isSignedIn()) {
    tableRecordList.append(tableWorkbenchEmptyState({
      title: "Sign in to inspect records",
      message: "Owner access is required before CompanyCore can load workspace-scoped table records."
    }));
    renderRecordInspector(null, module, fields, { mode: "signed-out" });
    return;
  }

  if (filteredRecords.length === 0) {
    if (records.length === 0) {
      tableRecordList.append(tableWorkbenchEmptyState({
        title: "No records yet",
        message: typedEditorAvailable
          ? `Create the first ${module.label.toLowerCase()} record here, then agents can read it through the API.`
          : "This table has no imported or CompanyCore-owned records yet.",
        actionLabel: typedEditorAvailable ? "New draft" : "Review API",
        href: typedEditorAvailable ? "" : "/settings/api",
        onAction: typedEditorAvailable ? () => {
          state.tableWorkbench.newDraft = true;
          renderTableWorkbench();
        } : null
      }));
    } else {
      tableRecordList.append(tableWorkbenchEmptyState({
        title: "No records match",
        message: "Search or source filters are hiding the currently loaded records.",
        actionLabel: "Clear filters",
        onAction: clearTableWorkbenchFilters
      }));
    }
  } else {
    for (const record of filteredRecords) {
      tableRecordList.append(tableRecordRowElement(record, module, selected?.id));
    }
  }

  renderRecordInspector(selected, module, fields, {
    mode: filteredRecords.length === 0
      ? records.length === 0 ? "empty" : "filtered"
      : "select"
  });
}

function clearTableWorkbenchFilters() {
  state.tableWorkbench.search = "";
  state.tableWorkbench.source = "";
  tableRecordSearch.value = "";
  tableRecordSourceFilter.value = "";
  renderTableWorkbench();
}

function tableWorkbenchEmptyState({ title, message, actionLabel = "", href = "", onAction = null }) {
  const stateElement = document.createElement("article");
  stateElement.className = "table-empty-state";

  const copy = document.createElement("div");
  copy.className = "table-empty-copy";

  const kicker = document.createElement("span");
  kicker.className = "summary-kicker";
  kicker.textContent = "Workbench state";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = message;

  copy.append(kicker, heading, body);
  stateElement.append(copy);

  if (actionLabel && (href || onAction)) {
    const action = href ? document.createElement("a") : document.createElement("button");
    action.className = href ? "button-link secondary compact" : "compact";
    action.textContent = actionLabel;
    if (href) {
      action.href = href;
      action.dataset.link = "";
    } else {
      action.type = "button";
      action.addEventListener("click", onAction);
    }
    stateElement.append(action);
    bindInlineNavigation(stateElement);
  }

  return stateElement;
}

function tableWorkbenchBriefElement(module, records, fields, sources) {
  const panel = document.createElement("article");
  panel.className = "table-context-card";

  if (!module) {
    panel.innerHTML = `
      <div class="table-context-copy">
        <span class="summary-kicker">Table context</span>
        <strong>Choose a supported data module</strong>
        <p>Open the Data index to inspect implemented CompanyCore tables and their API coverage.</p>
      </div>
      <div class="table-context-actions">
        <a class="button-link secondary compact" href="/data" data-link>All data</a>
      </div>
    `;
    bindInlineNavigation(panel);
    return panel;
  }

  const typedEditorAvailable = hasTypedRecordEditor(module.slug);
  const methods = module.routes.length > 0
    ? [...new Set(module.routes.map((route) => route.method))].join(", ")
    : "No API route";
  const writeMethods = [...new Set(module.routes
    .filter((route) => ["POST", "PATCH", "DELETE"].includes(route.method))
    .map((route) => route.method))];
  const writeLabel = writeMethods.length > 0
    ? `${writeMethods.length} write method${writeMethods.length === 1 ? "" : "s"}`
    : "Inspect only";
  const sourceLabel = sources.length > 0 ? sources.join(", ") : "companycore";
  const readiness = tableAiReadiness(module, records, sources);
  const area = module.area ? areaLabel(module.area) : "Unmapped area";
  panel.classList.toggle("is-editable", typedEditorAvailable);
  panel.innerHTML = `
    <div class="table-context-copy">
      <span class="summary-kicker">Table context</span>
      <div class="table-context-heading">
        <strong>${escapeHtml(module.label)}</strong>
        <span class="workbench-index-status">${escapeHtml(typedEditorAvailable ? "Typed editor" : "Read-only")}</span>
      </div>
      <p>${escapeHtml(module.description)} ${escapeHtml(module.area ? `Mapped to ${area}.` : "Not mapped to an operating area yet.")}</p>
      <div class="table-context-pills" aria-label="Table operation context">
        <span>${escapeHtml(methods)}</span>
        <span>${escapeHtml(writeLabel)}</span>
        <span>${escapeHtml(sourceLabel)}</span>
        <span>${fields.length} visible fields</span>
      </div>
      <div class="provenance-badges" aria-label="Table provenance and AI readiness">
        <span class="provenance-badge provenance-badge-source">${escapeHtml(readiness.sourceLabel)}</span>
        <span class="provenance-badge">${escapeHtml(readiness.evidence)}</span>
        <span class="ai-safety-badge ai-safety-${escapeHtml(readiness.tone)}">${escapeHtml(readiness.label)}</span>
      </div>
      <span class="provenance-detail">${escapeHtml(readiness.detail)}</span>
    </div>
    <div class="table-context-actions">
      <span><strong>${records.length}</strong> records loaded</span>
      <span><strong>${module.routes.length}</strong> API routes</span>
      ${typedEditorAvailable ? '<button type="button" class="compact" data-table-action="new-draft">New draft</button>' : '<a class="button-link secondary compact" href="/settings/api" data-link>Review API</a>'}
    </div>
  `;

  panel.querySelector('[data-table-action="new-draft"]')?.addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    renderTableWorkbench();
  });
  bindInlineNavigation(panel);

  return panel;
}

function bindInlineNavigation(root) {
  root.querySelectorAll("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) {
        return;
      }
      event.preventDefault();
      navigate(`${url.pathname}${url.search}`, { hash: url.hash });
    });
  });
}

function tableFieldNames(records) {
  const preferred = ["title", "name", "status", "priority", "source", "createdAt", "updatedAt"];
  const discovered = [...new Set(records.flatMap((record) => Object.keys(record || {})))];
  return [
    ...preferred.filter((field) => discovered.includes(field)),
    ...discovered.filter((field) => !preferred.includes(field)).sort((left, right) => left.localeCompare(right))
  ];
}

function tableSources(records) {
  return [...new Set(records.map((record) => record?.source || "companycore").filter(Boolean).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function sourceDisplayName(source) {
  return {
    companycore: "CompanyCore",
    clickup: "ClickUp",
    google_drive: "Google Drive",
    drive: "Google Drive",
    api: "Owner API",
    manual: "Owner entry"
  }[String(source || "companycore")] || String(source || "companycore");
}

function recordProvenance(record, module = null) {
  const source = String(record?.source || "companycore");
  const sourceName = sourceDisplayName(source);
  const hasArea = Boolean(module?.area);
  const updated = formatDate(record?.updatedAt || record?.createdAt);
  if (source === "companycore" || source === "manual" || source === "api") {
    return {
      sourceLabel: sourceName,
      evidence: updated ? `Workspace-owned, updated ${updated}` : "Workspace-owned record",
      label: hasArea ? "AI-safe" : "Needs area",
      detail: hasArea
        ? "Safe for agents when the workspace and table scope are included."
        : "Connect this table to an operating area before agents treat it as complete context.",
      tone: hasArea ? "safe" : "review"
    };
  }
  if (source === "clickup") {
    return {
      sourceLabel: "ClickUp",
      evidence: updated ? `Synced from provider, updated ${updated}` : "Synced from provider",
      label: hasArea ? "AI-safe with source" : "Review area",
      detail: hasArea
        ? "Agents should keep the ClickUp source attached when using this record."
        : "Provider data needs an operating-area assignment before agent use.",
      tone: hasArea ? "safe" : "review"
    };
  }
  if (source === "google_drive" || source === "drive") {
    return {
      sourceLabel: "Google Drive",
      evidence: updated ? `Imported from Drive, updated ${updated}` : "Imported from Drive",
      label: hasArea ? "AI-safe with source" : "Review area",
      detail: hasArea
        ? "Agents should cite Drive provenance when using this record."
        : "Drive content needs operating-area confirmation before broad agent use.",
      tone: hasArea ? "safe" : "review"
    };
  }
  return {
    sourceLabel: sourceName,
    evidence: "External or imported record",
    label: "Review context",
    detail: "Confirm source and scope before agents use this record.",
    tone: "review"
  };
}

function tableAiReadiness(module, records, sources) {
  if (!module) {
    return {
      sourceLabel: "Unsupported route",
      evidence: "No table catalog match",
      label: "Not AI-safe",
      detail: "Choose a supported data module before agents use this context.",
      tone: "blocked"
    };
  }
  const hasRoutes = module.routes.length > 0;
  const hasArea = Boolean(module.area);
  const typedEditorAvailable = hasTypedRecordEditor(module.slug);
  const sourceNames = sources.length > 0 ? sources.map(sourceDisplayName).join(", ") : "CompanyCore";
  if (!hasRoutes) {
    return {
      sourceLabel: sourceNames,
      evidence: "No API route coverage",
      label: "Inspect only",
      detail: "Visible to owners, but not ready as a first-class AI/API context surface.",
      tone: "blocked"
    };
  }
  if (!hasArea) {
    return {
      sourceLabel: sourceNames,
      evidence: `${records.length} record${records.length === 1 ? "" : "s"}, area not mapped`,
      label: "Review area",
      detail: "Map this table to an operating area before broad AI use.",
      tone: "review"
    };
  }
  return {
    sourceLabel: sourceNames,
    evidence: `${records.length} record${records.length === 1 ? "" : "s"} / ${module.routes.length} route${module.routes.length === 1 ? "" : "s"}`,
    label: typedEditorAvailable ? "AI-safe editable" : "AI-safe read",
    detail: typedEditorAvailable
      ? "Agents can read this scoped table; owners can correct records in the typed editor."
      : "Agents can read this scoped table with source and API limits attached.",
    tone: "safe"
  };
}

function provenanceBadgesHtml(provenance) {
  return `
    <div class="provenance-badges" aria-label="Source and AI readiness">
      <span class="provenance-badge provenance-badge-source">${escapeHtml(provenance.sourceLabel)}</span>
      <span class="provenance-badge">${escapeHtml(provenance.evidence)}</span>
      <span class="ai-safety-badge ai-safety-${escapeHtml(provenance.tone)}">${escapeHtml(provenance.label)}</span>
    </div>
    <span class="provenance-detail">${escapeHtml(provenance.detail)}</span>
  `;
}

function recordTitle(record, module) {
  const contentPreview = record?.content || record?.body || record?.summary || record?.description;
  if (record?.title || record?.name || record?.subject || record?.key) {
    return record.title || record.name || record.subject || record.key;
  }
  if (contentPreview) {
    const text = String(contentPreview).replace(/\s+/g, " ").trim();
    return text.length > 84 ? `${text.slice(0, 84)}...` : text;
  }
  return record?.id || module.label;
}

function recordSubtitle(record) {
  const parts = [
    record?.status,
    record?.priority,
    sourceDisplayName(record?.source || "companycore"),
    formatDate(record?.updatedAt || record?.createdAt)
  ].filter(Boolean);
  return parts.join(" - ");
}

function recordSearchText(record, module) {
  return [
    module.label,
    module.slug,
    ...Object.values(record || {}).map((value) => typeof value === "object" ? JSON.stringify(value) : String(value))
  ].join(" ").toLowerCase();
}

function filteredTableRecords(module, records) {
  const search = state.tableWorkbench.search.trim().toLowerCase();
  return records.filter((record) => (!search || recordSearchText(record, module).includes(search))
    && (!state.tableWorkbench.source || String(record?.source || "companycore") === state.tableWorkbench.source));
}

function selectedTableRecord(filteredRecords, allRecords) {
  const selected = filteredRecords.find((record) => record.id === state.tableWorkbench.selectedId)
    || filteredRecords[0]
    || allRecords.find((record) => record.id === state.tableWorkbench.selectedId)
    || null;
  state.tableWorkbench.selectedId = selected?.id || "";
  return selected;
}

function syncTableFilters(sources) {
  tableRecordSearch.value = state.tableWorkbench.search;
  const nextSource = sources.includes(state.tableWorkbench.source) ? state.tableWorkbench.source : "";
  tableRecordSourceFilter.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "All sources";
  tableRecordSourceFilter.append(placeholder);
  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source;
    tableRecordSourceFilter.append(option);
  }
  tableRecordSourceFilter.value = nextSource;
  state.tableWorkbench.source = nextSource;
}

function tableRecordRowElement(record, module, selectedId) {
  const button = document.createElement("button");
  const provenance = recordProvenance(record, module);
  button.type = "button";
  button.className = `record-list-row ${record.id === selectedId ? "is-selected" : ""}`;
  button.innerHTML = `
    <span class="summary-kicker">${escapeHtml(sourceDisplayName(record?.source || "companycore"))}</span>
    <strong>${escapeHtml(recordTitle(record, module))}</strong>
    <small>${escapeHtml(recordSubtitle(record) || record.id || "No metadata")}</small>
    ${provenanceBadgesHtml(provenance)}
  `;
  button.addEventListener("click", () => {
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    renderTableWorkbench();
  });
  return button;
}

function renderRecordInspector(record, module, fields, options = {}) {
  recordInspector.innerHTML = "";
  if (!record) {
    if (options.mode === "signed-out") {
      recordInspector.append(tableWorkbenchEmptyState({
        title: "Inspector locked",
        message: "Sign in to inspect record fields and use table-specific editors."
      }));
      return;
    }
    if (options.mode === "filtered") {
      recordInspector.append(tableWorkbenchEmptyState({
        title: "Filters hide the inspector",
        message: "Clear filters to select a loaded record, or adjust the search to narrow the visible list.",
        actionLabel: "Clear filters",
        onAction: clearTableWorkbenchFilters
      }));
      return;
    }
    if (hasTypedRecordEditor(module?.slug) && isSignedIn()) {
      recordInspector.append(renderTypedRecordEditor(module.slug, null));
      return;
    }
    recordInspector.append(tableWorkbenchEmptyState({
      title: options.mode === "empty" ? "Ready for records" : "Select a record",
      message: options.mode === "empty"
        ? "Records created or imported for this table will appear in the list and open here for inspection."
        : "Choose a row from the record list to inspect fields, metadata, and raw JSON."
    }));
    return;
  }

  const header = document.createElement("div");
  const provenance = recordProvenance(record, module);
  header.className = "record-inspector-header";
  header.innerHTML = `
    <span class="summary-kicker">${escapeHtml(module.label)}</span>
    <strong>${escapeHtml(recordTitle(record, module))}</strong>
    <p>${escapeHtml(recordSubtitle(record) || "No status metadata")}</p>
    ${provenanceBadgesHtml(provenance)}
  `;

  const fieldList = document.createElement("dl");
  fieldList.className = "record-field-list";
  for (const field of fields.slice(0, 18)) {
    const value = record[field];
    const item = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = field;
    const detail = document.createElement("dd");
    detail.textContent = formatRecordValue(value);
    item.append(term, detail);
    fieldList.append(item);
  }

  const raw = document.createElement("details");
  raw.className = "record-json";
  raw.innerHTML = `
    <summary>Raw JSON</summary>
    <pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre>
  `;

  const sections = [header];
  if (hasTypedRecordEditor(module.slug)) {
    sections.push(renderTypedRecordEditor(module.slug, record));
  }
  sections.push(fieldList, raw);
  recordInspector.append(...sections);
}

function hasTypedRecordEditor(slug) {
  return ["notes", "projects", "clients", "task-lists", "tasks"].includes(slug);
}

function renderTypedRecordEditor(slug, record) {
  if (slug === "tasks") {
    return renderTaskEditor(record);
  }
  if (slug === "task-lists") {
    return renderTaskListEditor(record);
  }
  if (slug === "clients") {
    return renderClientEditor(record);
  }
  if (slug === "projects") {
    return renderProjectEditor(record);
  }
  return renderNoteEditor(record);
}

function typedEditorDraft(slug) {
  return state.tableWorkbench.drafts[slug] || {};
}

function updateTypedEditorDraft(slug, values) {
  state.tableWorkbench.drafts[slug] = {
    ...typedEditorDraft(slug),
    ...values
  };
}

function clearTypedEditorDraft(slug) {
  delete state.tableWorkbench.drafts[slug];
}

function renderNoteEditor(record) {
  const panel = document.createElement("section");
  panel.className = "record-editor";
  panel.innerHTML = `
    <div class="record-editor-heading">
      <div>
        <span class="summary-kicker">Typed editor</span>
        <h3>${record ? "Edit selected note" : "Create note"}</h3>
      </div>
      ${record ? `<span class="status-pill">${escapeHtml(record.status || "active")}</span>` : ""}
    </div>
    <label>
      Note content
      <textarea id="noteEditorContent" rows="7" autocomplete="off" placeholder="Write operational context that agents and operators should remember.">${escapeHtml(record?.content || "")}</textarea>
    </label>
    <div class="record-editor-actions">
      <button type="button" class="compact" data-note-action="create">Create note</button>
      <button type="button" class="secondary compact" data-note-action="save" ${record ? "" : "disabled"}>Save selected</button>
      <button type="button" class="secondary compact" data-note-action="new">New draft</button>
      <button type="button" class="danger compact" data-note-action="archive" ${record && record.status !== "archived" ? "" : "disabled"}>Archive selected</button>
    </div>
    <p class="form-note" id="noteEditorStatus">${record ? "Changes are saved into the Notes API and visible in this database index." : "Create a local CompanyCore note. Relationship fields can still be managed through the API."}</p>
  `;

  panel.querySelector('[data-note-action="create"]').addEventListener("click", () => createNoteFromEditor(panel));
  panel.querySelector('[data-note-action="save"]').addEventListener("click", () => saveSelectedNoteFromEditor(panel, record));
  panel.querySelector('[data-note-action="new"]').addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    renderTableWorkbench();
  });
  panel.querySelector('[data-note-action="archive"]').addEventListener("click", () => archiveSelectedNote(record));
  return panel;
}

function renderProjectEditor(record) {
  const panel = document.createElement("section");
  panel.className = "record-editor";
  const status = record?.status || "active";
  panel.innerHTML = `
    <div class="record-editor-heading">
      <div>
        <span class="summary-kicker">Typed editor</span>
        <h3>${record ? "Edit selected project" : "Create project"}</h3>
      </div>
      ${record ? `<span class="status-pill">${escapeHtml(status)}</span>` : ""}
    </div>
    <div class="record-editor-grid">
      <label>
        Project name
        <input id="projectEditorName" type="text" autocomplete="off" placeholder="Name the workstream..." value="${escapeHtml(record?.name || "")}" />
      </label>
      <label>
        Status
        <select id="projectEditorStatus">
          <option value="active" ${status === "active" ? "selected" : ""}>active</option>
          <option value="paused" ${status === "paused" ? "selected" : ""}>paused</option>
          <option value="done" ${status === "done" ? "selected" : ""}>done</option>
          <option value="archived" ${status === "archived" ? "selected" : ""}>archived</option>
        </select>
      </label>
    </div>
    <label>
      Description
      <textarea id="projectEditorDescription" rows="6" autocomplete="off" placeholder="Describe outcome, scope, and context for operators and agents.">${escapeHtml(record?.description || "")}</textarea>
    </label>
    <div class="record-editor-actions">
      <button type="button" class="compact" data-project-action="create">Create project</button>
      <button type="button" class="secondary compact" data-project-action="save" ${record ? "" : "disabled"}>Save selected</button>
      <button type="button" class="secondary compact" data-project-action="new">New draft</button>
      <button type="button" class="danger compact" data-project-action="archive" ${record && record.status !== "archived" ? "" : "disabled"}>Archive selected</button>
    </div>
    <p class="form-note" id="projectEditorStatusMessage">${record ? "Changes are saved into the Projects API and reflected in this database index." : "Create a local CompanyCore project as an operational workstream."}</p>
  `;

  panel.querySelector('[data-project-action="create"]').addEventListener("click", () => createProjectFromEditor(panel));
  panel.querySelector('[data-project-action="save"]').addEventListener("click", () => saveSelectedProjectFromEditor(panel, record));
  panel.querySelector('[data-project-action="new"]').addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    renderTableWorkbench();
  });
  panel.querySelector('[data-project-action="archive"]').addEventListener("click", () => archiveSelectedProject(record));
  return panel;
}

function renderClientEditor(record) {
  const panel = document.createElement("section");
  panel.className = "record-editor";
  const status = record?.status || "active";
  panel.innerHTML = `
    <div class="record-editor-heading">
      <div>
        <span class="summary-kicker">Typed editor</span>
        <h3>${record ? "Edit selected client" : "Create client"}</h3>
      </div>
      ${record ? `<span class="status-pill">${escapeHtml(status)}</span>` : ""}
    </div>
    <div class="record-editor-grid client-editor-grid">
      <label>
        Client name
        <input id="clientEditorName" type="text" autocomplete="off" placeholder="Jane Doe..." value="${escapeHtml(record?.name || "")}" />
      </label>
      <label>
        Status
        <select id="clientEditorStatus">
          <option value="active" ${status === "active" ? "selected" : ""}>active</option>
          <option value="lead" ${status === "lead" ? "selected" : ""}>lead</option>
          <option value="customer" ${status === "customer" ? "selected" : ""}>customer</option>
          <option value="paused" ${status === "paused" ? "selected" : ""}>paused</option>
          <option value="archived" ${status === "archived" ? "selected" : ""}>archived</option>
        </select>
      </label>
      <label>
        Company
        <input id="clientEditorCompany" type="text" autocomplete="off" placeholder="Company or organization..." value="${escapeHtml(record?.companyName || "")}" />
      </label>
      <label class="record-editor-span-2">
        Email
        <input id="clientEditorEmail" type="email" autocomplete="off" placeholder="name@example.com" value="${escapeHtml(record?.email || "")}" />
      </label>
      <label>
        Phone
        <input id="clientEditorPhone" type="tel" autocomplete="off" placeholder="+48..." value="${escapeHtml(record?.phone || "")}" />
      </label>
    </div>
    <div class="record-editor-actions">
      <button type="button" class="compact" data-client-action="create">Create client</button>
      <button type="button" class="secondary compact" data-client-action="save" ${record ? "" : "disabled"}>Save selected</button>
      <button type="button" class="secondary compact" data-client-action="new">New draft</button>
      <button type="button" class="danger compact" data-client-action="archive" ${record && record.status !== "archived" ? "" : "disabled"}>Archive selected</button>
    </div>
    <p class="form-note" id="clientEditorStatusMessage">${record ? "Changes are saved into the Clients API and reflected in this database index." : "Create a local CompanyCore CRM client for deals, notes, and interactions."}</p>
  `;

  panel.querySelector('[data-client-action="create"]').addEventListener("click", () => createClientFromEditor(panel));
  panel.querySelector('[data-client-action="save"]').addEventListener("click", () => saveSelectedClientFromEditor(panel, record));
  panel.querySelector('[data-client-action="new"]').addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    renderTableWorkbench();
  });
  panel.querySelector('[data-client-action="archive"]').addEventListener("click", () => archiveSelectedClient(record));
  return panel;
}

function renderTaskListEditor(record) {
  const panel = document.createElement("section");
  panel.className = "record-editor";
  const draft = record ? {} : typedEditorDraft("task-lists");
  const name = record?.name ?? draft.name ?? "";
  const description = record?.description ?? draft.description ?? "";
  const status = record?.status ?? draft.status ?? "active";
  const selectedProjectId = record?.projectId ?? draft.projectId ?? "";
  const projects = recordsForSlug("projects");
  const projectOptions = projects.map((project) => `
    <option value="${escapeHtml(project.id)}" ${selectedProjectId === project.id ? "selected" : ""}>${escapeHtml(recordTitle(project, { label: "Project" }))}</option>
  `).join("");
  panel.innerHTML = `
    <div class="record-editor-heading">
      <div>
        <span class="summary-kicker">Typed editor</span>
        <h3>${record ? "Edit selected task list" : "Create task list"}</h3>
      </div>
      ${record ? `<span class="status-pill">${escapeHtml(status)}</span>` : ""}
    </div>
    <div class="record-editor-grid">
      <label>
        List name
        <input id="taskListEditorName" type="text" autocomplete="off" placeholder="Delivery, intake, QA..." value="${escapeHtml(name)}" />
      </label>
      <label>
        Status
        <select id="taskListEditorStatus">
          <option value="active" ${status === "active" ? "selected" : ""}>active</option>
          <option value="paused" ${status === "paused" ? "selected" : ""}>paused</option>
          <option value="done" ${status === "done" ? "selected" : ""}>done</option>
          <option value="archived" ${status === "archived" ? "selected" : ""}>archived</option>
        </select>
      </label>
      <label class="record-editor-span-2">
        Project
        <select id="taskListEditorProject">
          <option value="" ${selectedProjectId ? "" : "selected"}>No project</option>
          ${projectOptions}
        </select>
      </label>
    </div>
    <label>
      Description
      <textarea id="taskListEditorDescription" rows="5" autocomplete="off" placeholder="Describe what belongs on this list.">${escapeHtml(description)}</textarea>
    </label>
    <div class="record-editor-actions">
      <button type="button" class="compact" data-task-list-action="create">Create list</button>
      <button type="button" class="secondary compact" data-task-list-action="save" ${record ? "" : "disabled"}>Save selected</button>
      <button type="button" class="secondary compact" data-task-list-action="new">New draft</button>
      <button type="button" class="danger compact" data-task-list-action="archive" ${record && record.status !== "archived" ? "" : "disabled"}>Archive selected</button>
    </div>
    <p class="form-note" id="taskListEditorStatusMessage">${record ? "Changes are saved into the Task Lists API and reflected in this database index." : "Create a local CompanyCore task list. Project linkage is optional."}</p>
  `;

  panel.querySelector('[data-task-list-action="create"]').addEventListener("click", () => createTaskListFromEditor(panel));
  panel.querySelector('[data-task-list-action="save"]').addEventListener("click", () => saveSelectedTaskListFromEditor(panel, record));
  panel.querySelector('[data-task-list-action="new"]').addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    clearTypedEditorDraft("task-lists");
    renderTableWorkbench();
  });
  panel.querySelector('[data-task-list-action="archive"]').addEventListener("click", () => archiveSelectedTaskList(record));
  if (!record) {
    panel.querySelector("#taskListEditorName")?.addEventListener("input", (event) => {
      updateTypedEditorDraft("task-lists", { name: event.target.value });
    });
    panel.querySelector("#taskListEditorDescription")?.addEventListener("input", (event) => {
      updateTypedEditorDraft("task-lists", { description: event.target.value });
    });
    panel.querySelector("#taskListEditorStatus")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("task-lists", { status: event.target.value });
    });
    panel.querySelector("#taskListEditorProject")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("task-lists", { projectId: event.target.value });
    });
  }
  return panel;
}

function renderTaskEditor(record) {
  const panel = document.createElement("section");
  panel.className = "record-editor";
  const draft = record ? {} : typedEditorDraft("tasks");
  const title = record?.title ?? draft.title ?? "";
  const description = record?.description ?? draft.description ?? "";
  const status = record?.status ?? draft.status ?? "todo";
  const priority = record?.priority ?? draft.priority ?? "";
  const dueDate = taskEditorDateValue(record?.dueDate ?? draft.dueDate ?? "");
  const selectedProjectId = record?.projectId ?? draft.projectId ?? "";
  const selectedTaskListId = record?.taskListId ?? draft.taskListId ?? "";
  const projects = recordsForSlug("projects");
  const taskLists = recordsForSlug("task-lists");
  const projectOptions = projects.map((project) => `
    <option value="${escapeHtml(project.id)}" ${selectedProjectId === project.id ? "selected" : ""}>${escapeHtml(recordTitle(project, { label: "Project" }))}</option>
  `).join("");
  const taskListOptions = taskLists.map((taskList) => `
    <option value="${escapeHtml(taskList.id)}" ${selectedTaskListId === taskList.id ? "selected" : ""}>${escapeHtml(recordTitle(taskList, { label: "Task list" }))}</option>
  `).join("");

  panel.innerHTML = `
    <div class="record-editor-heading">
      <div>
        <span class="summary-kicker">Typed editor</span>
        <h3>${record ? "Edit selected task" : "Create task"}</h3>
      </div>
      ${record ? `<span class="status-pill">${escapeHtml(status)}</span>` : ""}
    </div>
    <div class="record-editor-grid task-editor-grid">
      <label class="record-editor-span-2">
        Task title
        <input id="taskEditorTitle" type="text" autocomplete="off" placeholder="Describe the next concrete action..." value="${escapeHtml(title)}" />
      </label>
      <label>
        Status
        <select id="taskEditorStatus">
          <option value="todo" ${status === "todo" ? "selected" : ""}>todo</option>
          <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>in_progress</option>
          <option value="blocked" ${status === "blocked" ? "selected" : ""}>blocked</option>
          <option value="done" ${status === "done" ? "selected" : ""}>done</option>
          <option value="archived" ${status === "archived" ? "selected" : ""}>archived</option>
        </select>
      </label>
      <label>
        Priority
        <input id="taskEditorPriority" type="text" autocomplete="off" placeholder="normal, high, urgent..." value="${escapeHtml(priority)}" />
      </label>
      <label>
        Due date
        <input id="taskEditorDueDate" type="date" aria-label="Task due date" value="${escapeHtml(dueDate)}" />
      </label>
      <label>
        Project
        <select id="taskEditorProject">
          <option value="" ${selectedProjectId ? "" : "selected"}>No project</option>
          ${projectOptions}
        </select>
      </label>
      <label class="record-editor-span-2">
        Task list
        <select id="taskEditorTaskList">
          <option value="" ${selectedTaskListId ? "" : "selected"}>No task list</option>
          ${taskListOptions}
        </select>
      </label>
    </div>
    <label>
      Description
      <textarea id="taskEditorDescription" rows="5" autocomplete="off" placeholder="Add context, acceptance notes, or handoff detail.">${escapeHtml(description)}</textarea>
    </label>
    <div class="record-editor-actions">
      <button type="button" class="compact" data-task-action="create">Create task</button>
      <button type="button" class="secondary compact" data-task-action="save" ${record ? "" : "disabled"}>Save selected</button>
      <button type="button" class="secondary compact" data-task-action="new">New draft</button>
      <button type="button" class="danger compact" data-task-action="archive" ${record && record.status !== "archived" ? "" : "disabled"}>Archive selected</button>
    </div>
    <p class="form-note" id="taskEditorStatusMessage">${record ? "Changes are saved into the Tasks API and reflected in this database index." : "Create a local CompanyCore task. Project and task-list linkage are optional."}</p>
  `;

  panel.querySelector('[data-task-action="create"]').addEventListener("click", () => createTaskFromEditor(panel));
  panel.querySelector('[data-task-action="save"]').addEventListener("click", () => saveSelectedTaskFromEditor(panel, record));
  panel.querySelector('[data-task-action="new"]').addEventListener("click", () => {
    state.tableWorkbench.selectedId = "";
    state.tableWorkbench.newDraft = true;
    clearTypedEditorDraft("tasks");
    renderTableWorkbench();
  });
  panel.querySelector('[data-task-action="archive"]').addEventListener("click", () => archiveSelectedTask(record));
  if (!record) {
    panel.querySelector("#taskEditorTitle")?.addEventListener("input", (event) => {
      updateTypedEditorDraft("tasks", { title: event.target.value });
    });
    panel.querySelector("#taskEditorDescription")?.addEventListener("input", (event) => {
      updateTypedEditorDraft("tasks", { description: event.target.value });
    });
    panel.querySelector("#taskEditorStatus")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("tasks", { status: event.target.value });
    });
    panel.querySelector("#taskEditorPriority")?.addEventListener("input", (event) => {
      updateTypedEditorDraft("tasks", { priority: event.target.value });
    });
    panel.querySelector("#taskEditorDueDate")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("tasks", { dueDate: event.target.value });
    });
    panel.querySelector("#taskEditorProject")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("tasks", { projectId: event.target.value });
    });
    panel.querySelector("#taskEditorTaskList")?.addEventListener("change", (event) => {
      updateTypedEditorDraft("tasks", { taskListId: event.target.value });
    });
  }
  return panel;
}

function noteEditorContent(panel) {
  return panel.querySelector("#noteEditorContent")?.value.trim() || "";
}

function setNoteEditorStatus(panel, message, tone = "") {
  setRecordEditorStatus(panel, "#noteEditorStatus", message, tone);
}

function setProjectEditorStatus(panel, message, tone = "") {
  setRecordEditorStatus(panel, "#projectEditorStatusMessage", message, tone);
}

function setClientEditorStatus(panel, message, tone = "") {
  setRecordEditorStatus(panel, "#clientEditorStatusMessage", message, tone);
}

function setTaskListEditorStatus(panel, message, tone = "") {
  setRecordEditorStatus(panel, "#taskListEditorStatusMessage", message, tone);
}

function setTaskEditorStatus(panel, message, tone = "") {
  setRecordEditorStatus(panel, "#taskEditorStatusMessage", message, tone);
}

function setRecordEditorStatus(panel, selector, message, tone = "") {
  const status = panel.querySelector(selector);
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-success", tone === "success");
}

async function refreshTableRecords(slug) {
  const response = await api(`/v1/${slug}`);
  const records = response.data || [];
  state.databaseTables.set(slug, { records });
  if (slug === "tasks") {
    state.tasks = records;
    renderTasks();
  }
}

async function createNoteFromEditor(panel) {
  const content = noteEditorContent(panel);
  if (!content) {
    setNoteEditorStatus(panel, "Write note content before creating it.", "error");
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    state.tableWorkbench.selectedId = response.data?.id || "";
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("notes");
    renderTableWorkbench();
    showResult("Note created in the database.", "success");
  } catch (error) {
    setNoteEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveSelectedNoteFromEditor(panel, record) {
  if (!record?.id) {
    setNoteEditorStatus(panel, "Select a note before saving changes.", "error");
    return;
  }

  const content = noteEditorContent(panel);
  if (!content) {
    setNoteEditorStatus(panel, "Note content cannot be empty.", "error");
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/notes/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("notes");
    renderTableWorkbench();
    showResult("Note updated.", "success");
  } catch (error) {
    setNoteEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function archiveSelectedNote(record) {
  if (!record?.id) {
    return;
  }

  const confirmed = window.confirm("Archive this note? It will stay in the database with archived status.");
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/notes/${record.id}`, { method: "DELETE" });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("notes");
    renderTableWorkbench();
    showResult("Note archived.", "success");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function projectEditorPayload(panel) {
  const name = panel.querySelector("#projectEditorName")?.value.trim() || "";
  const description = panel.querySelector("#projectEditorDescription")?.value.trim() || "";
  const status = panel.querySelector("#projectEditorStatus")?.value || "active";
  return {
    name,
    description: description || undefined,
    status
  };
}

async function createProjectFromEditor(panel) {
  const payload = projectEditorPayload(panel);
  if (!payload.name) {
    setProjectEditorStatus(panel, "Name the project before creating it.", "error");
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = response.data?.id || "";
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("projects");
    renderTableWorkbench();
    showResult("Project created in the database.", "success");
  } catch (error) {
    setProjectEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveSelectedProjectFromEditor(panel, record) {
  if (!record?.id) {
    setProjectEditorStatus(panel, "Select a project before saving changes.", "error");
    return;
  }

  const payload = projectEditorPayload(panel);
  if (!payload.name) {
    setProjectEditorStatus(panel, "Project name cannot be empty.", "error");
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/projects/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("projects");
    renderTableWorkbench();
    showResult("Project updated.", "success");
  } catch (error) {
    setProjectEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function archiveSelectedProject(record) {
  if (!record?.id) {
    return;
  }

  const confirmed = window.confirm("Archive this project? Related records stay in the database.");
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/projects/${record.id}`, { method: "DELETE" });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("projects");
    renderTableWorkbench();
    showResult("Project archived.", "success");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function clientEditorPayload(panel) {
  const name = panel.querySelector("#clientEditorName")?.value.trim() || "";
  const companyName = panel.querySelector("#clientEditorCompany")?.value.trim() || "";
  const email = panel.querySelector("#clientEditorEmail")?.value.trim() || "";
  const phone = panel.querySelector("#clientEditorPhone")?.value.trim() || "";
  const status = panel.querySelector("#clientEditorStatus")?.value || "active";
  return {
    name,
    companyName: companyName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    status
  };
}

async function createClientFromEditor(panel) {
  const payload = clientEditorPayload(panel);
  if (!payload.name) {
    setClientEditorStatus(panel, "Name the client before creating it.", "error");
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = response.data?.id || "";
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("clients");
    renderTableWorkbench();
    showResult("Client created in the database.", "success");
  } catch (error) {
    setClientEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveSelectedClientFromEditor(panel, record) {
  if (!record?.id) {
    setClientEditorStatus(panel, "Select a client before saving changes.", "error");
    return;
  }

  const payload = clientEditorPayload(panel);
  if (!payload.name) {
    setClientEditorStatus(panel, "Client name cannot be empty.", "error");
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/clients/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("clients");
    renderTableWorkbench();
    showResult("Client updated.", "success");
  } catch (error) {
    setClientEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function archiveSelectedClient(record) {
  if (!record?.id) {
    return;
  }

  const confirmed = window.confirm("Archive this client? Related deals, notes, and interactions stay in the database.");
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/clients/${record.id}`, { method: "DELETE" });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("clients");
    renderTableWorkbench();
    showResult("Client archived.", "success");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function taskListEditorPayload(panel) {
  const name = panel.querySelector("#taskListEditorName")?.value.trim() || "";
  const description = panel.querySelector("#taskListEditorDescription")?.value.trim() || "";
  const status = panel.querySelector("#taskListEditorStatus")?.value || "active";
  const projectId = panel.querySelector("#taskListEditorProject")?.value || "";
  return {
    name,
    description: description || undefined,
    status,
    projectId: projectId || undefined
  };
}

async function createTaskListFromEditor(panel) {
  const payload = taskListEditorPayload(panel);
  if (!payload.name) {
    setTaskListEditorStatus(panel, "Name the task list before creating it.", "error");
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/task-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = response.data?.id || "";
    state.tableWorkbench.newDraft = false;
    clearTypedEditorDraft("task-lists");
    await refreshTableRecords("task-lists");
    renderTableWorkbench();
    showResult("Task list created in the database.", "success");
  } catch (error) {
    setTaskListEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveSelectedTaskListFromEditor(panel, record) {
  if (!record?.id) {
    setTaskListEditorStatus(panel, "Select a task list before saving changes.", "error");
    return;
  }

  const payload = taskListEditorPayload(panel);
  if (!payload.name) {
    setTaskListEditorStatus(panel, "Task list name cannot be empty.", "error");
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/task-lists/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("task-lists");
    renderTableWorkbench();
    showResult("Task list updated.", "success");
  } catch (error) {
    setTaskListEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function archiveSelectedTaskList(record) {
  if (!record?.id) {
    return;
  }

  const confirmed = window.confirm("Archive this task list? Related tasks stay in the database.");
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/task-lists/${record.id}`, { method: "DELETE" });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("task-lists");
    renderTableWorkbench();
    showResult("Task list archived.", "success");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function taskEditorDateValue(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function taskEditorPayload(panel) {
  const title = panel.querySelector("#taskEditorTitle")?.value.trim() || "";
  const description = panel.querySelector("#taskEditorDescription")?.value.trim() || "";
  const status = panel.querySelector("#taskEditorStatus")?.value || "todo";
  const priority = panel.querySelector("#taskEditorPriority")?.value.trim() || "";
  const dueDate = panel.querySelector("#taskEditorDueDate")?.value || "";
  const projectId = panel.querySelector("#taskEditorProject")?.value || "";
  const taskListId = panel.querySelector("#taskEditorTaskList")?.value || "";
  return {
    title,
    description: description || undefined,
    status,
    priority: priority || undefined,
    dueDate: dueDate || undefined,
    projectId: projectId || undefined,
    taskListId: taskListId || undefined
  };
}

async function createTaskFromEditor(panel) {
  const payload = taskEditorPayload(panel);
  if (!payload.title) {
    setTaskEditorStatus(panel, "Name the task before creating it.", "error");
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = response.data?.id || "";
    state.tableWorkbench.newDraft = false;
    clearTypedEditorDraft("tasks");
    await refreshTableRecords("tasks");
    renderTableWorkbench();
    showResult("Task created in the database.", "success");
  } catch (error) {
    setTaskEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function saveSelectedTaskFromEditor(panel, record) {
  if (!record?.id) {
    setTaskEditorStatus(panel, "Select a task before saving changes.", "error");
    return;
  }

  const payload = taskEditorPayload(panel);
  if (!payload.title) {
    setTaskEditorStatus(panel, "Task title cannot be empty.", "error");
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/tasks/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("tasks");
    renderTableWorkbench();
    showResult("Task updated.", "success");
  } catch (error) {
    setTaskEditorStatus(panel, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function archiveSelectedTask(record) {
  if (!record?.id) {
    return;
  }

  const confirmed = window.confirm("Archive this task? Linked project and task list stay in the database.");
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/tasks/${record.id}`, { method: "DELETE" });
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    await refreshTableRecords("tasks");
    renderTableWorkbench();
    showResult("Task archived.", "success");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function formatRecordValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (String(value).match(/^\d{4}-\d{2}-\d{2}T/)) {
    return formatDate(value);
  }
  return String(value);
}

function summaryStatCard(label, value) {
  const card = document.createElement("article");
  card.className = "panel summary-card mini-card";
  card.innerHTML = `
    <span class="summary-kicker">${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  `;
  return card;
}

function emptyNote(message) {
  const empty = document.createElement("p");
  empty.className = "empty-note";
  empty.textContent = message;
  return empty;
}

function renderIntegrationAreaMatrix() {
  const areas = sortedOperatingAreas();

  if (areas.length === 0) {
    integrationMatrixSummary.textContent = isSignedIn()
      ? "Refresh the workspace connection to load the operating-area matrix."
      : "Sign in to load the operating-area matrix.";
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = isSignedIn()
      ? "Refresh the workspace connection to load the operating-area matrix."
      : "Sign in to load the operating-area matrix.";
    integrationAreaMatrix.append(empty);
    return;
  }

  const rows = areas.map(integrationAreaRowData);
  const filteredRows = filteredIntegrationAreaRows(rows);
  integrationMatrixSummary.textContent = `${filteredRows.length} of ${rows.length} operating area${rows.length === 1 ? "" : "s"} match the current integration map.`;

  if (filteredRows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No operating-area rows match the current integration filters.";
    integrationAreaMatrix.append(empty);
    return;
  }

  for (const item of filteredRows) {
    const row = document.createElement("article");
    row.className = "integration-area-row";
    row.append(
      integrationAreaLabel(item.area),
      integrationAreaMetric("Tables", item.tables),
      integrationAreaMetric("Records", item.records),
      integrationAreaMetric("Mappings", item.mappings),
      integrationAreaMetric("Drive", item.drive)
    );
    integrationAreaMatrix.append(row);
  }
}

function integrationAreaRowData(area) {
  const tables = area.tables || [];
  const tableIds = new Set(tables.map((table) => table.id));
  const providerMappings = state.operatingModel.externalMappings.filter((mapping) => (
    mapping.areaId === area.id
    || mapping.operatingAreaId === area.id
    || mapping.tableId && tableIds.has(mapping.tableId)
  ));
  const driveFiles = state.googleDrive.files.filter((file) => (
    file.operatingAreaId === area.id
    || file.operatingTableId && tableIds.has(file.operatingTableId)
  ));
  const tableRecords = tables.reduce((sum, table) => sum + countForTable(table), 0);
  const definition = areaDefinitionFor(area);
  const searchable = [
    areaLabel(area),
    definition.description,
    area.description,
    ...tables.flatMap((table) => [table.name, table.tableName, table.apiSlug]),
    ...providerMappings.flatMap((mapping) => [mapping.name, mapping.externalId, mapping.provider, mapping.entityType]),
    ...driveFiles.flatMap((file) => [file.name, file.mimeType, file.scanStatus])
  ].filter(Boolean).join(" ").toLowerCase();

  return {
    area,
    tables: tables.length,
    records: tableRecords,
    mappings: providerMappings.length,
    drive: driveFiles.length,
    searchable
  };
}

function filteredIntegrationAreaRows(rows) {
  const search = state.integrationFilters.search.trim().toLowerCase();
  return rows.filter((row) => (!search || row.searchable.includes(search))
    && (!state.integrationFilters.type || row[integrationTypeMetricKey(state.integrationFilters.type)] > 0));
}

function integrationTypeMetricKey(type) {
  if (type === "tables") {
    return "tables";
  }
  if (type === "records") {
    return "records";
  }
  if (type === "mappings") {
    return "mappings";
  }
  return "drive";
}

function integrationAreaLabel(area) {
  const block = document.createElement("div");
  block.className = "integration-area-name";
  const strong = document.createElement("strong");
  strong.textContent = areaLabel(area);
  const span = document.createElement("span");
  span.textContent = areaDefinitionFor(area).description || area.description || "Company operating area.";
  block.append(strong, span);
  return block;
}

function integrationAreaMetric(label, value) {
  const block = document.createElement("div");
  block.className = "integration-area-metric";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  block.append(strong, span);
  return block;
}

function renderDataCounters() {
  dataCounters.innerHTML = "";
  const counters = [
    ["Areas", state.operatingModel.areas.length],
    ["Tables", state.operatingModel.areas.flatMap((area) => area.tables || []).length],
    ["Records", [...state.databaseTables.values()].reduce((sum, item) => sum + item.records.length, 0)],
    ["Drive files", state.googleDrive.files.length],
    ["Mappings", state.operatingModel.externalMappings.length],
    ["Automations", state.operatingModel.automationDefinitions.length]
  ];

  for (const [label, value] of counters) {
    const card = document.createElement("article");
    card.className = "panel summary-card mini-card";
    card.innerHTML = `
      <span class="summary-kicker">${escapeHtml(label)}</span>
      <strong>${value}</strong>
    `;
    dataCounters.append(card);
  }
  renderDashboardCommandCenter();
  renderAccountSettings();
  renderDataOperations();
}

function renderOperatingMap() {
  operatingAreasNav.innerHTML = "";
  areaContext.innerHTML = "";
  const areas = sortedOperatingAreas();

  if (areas.length === 0) {
    areaContext.append(areaContextElement({
      area: null,
      areas,
      tables: [],
      files: [],
      mappings: [],
      recordCount: 0
    }));
    areaTitle.textContent = "No operating model loaded";
    areaDescription.textContent = isSignedIn()
      ? "Refresh the workspace connection to load CompanyCore areas."
      : "Sign in to load the company operating model.";
    areaStats.innerHTML = "";
    areaActions.innerHTML = "";
    areaSearch.value = state.areaFilters.search;
    areaTypeFilter.value = state.areaFilters.type;
    areaWorkbenchSummary.textContent = "No operating area is available yet.";
    areaWorkbenchList.innerHTML = "";
    areaTables.innerHTML = "";
    areaFiles.innerHTML = "";
    areaMappings.innerHTML = "";
    areaRecords.innerHTML = "";
    renderDataCounters();
    renderPipeline();
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  const areaParam = new URLSearchParams(window.location.search).get("area");
  if (areaParam && areas.some((area) => area.key === areaParam)) {
    state.selectedAreaKey = areaParam;
  }

  if (!state.selectedAreaKey || !areas.some((area) => area.key === state.selectedAreaKey)) {
    state.selectedAreaKey = areas[0].key;
  }

  for (const area of areas) {
    const button = document.createElement("button");
    const definition = areaDefinitionFor(area);
    button.type = "button";
    button.className = `area-button${area.key === state.selectedAreaKey ? " is-active" : ""}`;
    button.innerHTML = `
      <span class="folder-icon" aria-hidden="true"></span>
      <span>${escapeHtml(definition.number)}. ${escapeHtml(definition.label)}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedAreaKey = area.key;
      renderOperatingMap();
    });
    operatingAreasNav.append(button);
  }

  const area = selectedArea();
  const definition = areaDefinitionFor(area);
  const tables = area.tables || [];
  const tableIds = new Set(tables.map((table) => table.id));
  const files = state.googleDrive.files.filter((file) => (
    file.operatingAreaId === area.id
    || file.operatingTableId && tableIds.has(file.operatingTableId)
    || definition.key === "assets-storage" && !file.operatingAreaId
  ));
  const mappings = state.operatingModel.externalMappings.filter((mapping) => (
    mapping.areaId === area.id
    || mapping.tableId && tableIds.has(mapping.tableId)
  ));
  const recordCount = tables.reduce((sum, table) => sum + countForTable(table), 0);
  areaContext.append(areaContextElement({ area, areas, tables, files, mappings, recordCount }));

  areaTitle.textContent = `${definition.number}. ${definition.label}`;
  areaDescription.textContent = definition.description || area.description || area.name;
  areaStats.innerHTML = `
    <span>${tables.length} tables</span>
    <span>${recordCount} records</span>
    <span>${files.length} Drive files</span>
    <span>${area.isSystem ? "System area" : "User-created"}</span>
  `;
  areaActions.innerHTML = "";
  if (area.isSystem) {
    const note = document.createElement("span");
    note.className = "area-action-note";
    note.textContent = area.key === "main-general"
      ? "Protected fallback area"
      : "Protected catalog area";
    areaActions.append(note);
  } else {
    const reassignArea = defaultReassignArea(area);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "compact danger";
    deleteButton.textContent = "Delete area";
    deleteButton.disabled = !reassignArea;
    deleteButton.addEventListener("click", () => deleteSelectedArea(area, reassignArea));
    areaActions.append(deleteButton);
  }

  renderCompactList(areaTables, tables, (table) => `
    <strong>${escapeHtml(table.name)}</strong>
    <span>${escapeHtml(table.tableName)} · /v1/${escapeHtml(table.apiSlug)} · ${countForTable(table)} records</span>
  `, "No CompanyCore tables mapped to this area yet.");

  renderCompactList(areaFiles, files.slice(0, 8), (file) => `
    <strong>${escapeHtml(file.name)}</strong>
    <span>${file.isFolder ? "Folder" : escapeHtml(file.mimeType)} · ${escapeHtml(file.scanStatus)} · ${formatDate(file.modifiedTime)}</span>
    ${file.isFolder ? scopeEditorHtml({
      id: file.id,
      selectedAreaId: file.operatingAreaId || area.id,
      type: "drive",
      label: "Assign folder"
    }) : ""}
  `, state.googleDrive.configured ? "No imported Drive files mapped here yet." : "Google Drive is not connected yet.");

  renderCompactList(areaMappings, mappings.slice(0, 8), (mapping) => `
    <strong>${escapeHtml(mapping.name || mapping.externalId)}</strong>
    <span>${escapeHtml(providerLabel(mapping.provider))} · ${escapeHtml(mapping.entityType)}</span>
    ${mapping.provider === "clickup" && ["space", "folder", "list"].includes(mapping.entityType) ? scopeEditorHtml({
      id: mapping.id,
      selectedAreaId: mapping.areaId || area.id,
      type: "mapping",
      label: "Assign mapping"
    }) : ""}
  `, "No external provider mappings in this area yet.");

  const previews = tables.flatMap((table) => recordsForTable(table).slice(0, 3).map((record) => ({ table, record }))).slice(0, 10);
  const workbenchItems = areaWorkbenchItems(area, definition, tables, files, mappings, previews);
  const filteredWorkbenchItems = filteredAreaWorkbenchItems(workbenchItems);
  areaSearch.value = state.areaFilters.search;
  areaTypeFilter.value = state.areaFilters.type;
  areaWorkbenchSummary.textContent = `${filteredWorkbenchItems.length} of ${workbenchItems.length} selected-area item${workbenchItems.length === 1 ? "" : "s"} match the current view.`;
  renderCompactList(areaWorkbenchList, filteredWorkbenchItems.slice(0, 16), (item) => item.html, workbenchItems.length === 0
    ? "No linked content is available for this operating area yet."
    : "No selected-area items match the current filters.");
  renderCompactList(areaRecords, previews, ({ table, record }) => `
    <strong>${escapeHtml(record.title || record.name || record.summary || record.email || record.id)}</strong>
    <span>${escapeHtml(table.name)} · ${escapeHtml(record.status || record.source || "companycore")}</span>
  `, "No records in this area's mapped tables yet.");

  renderDataCounters();
  renderPipeline();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
  bindScopeEditors();
}

function areaContextElement({ area, areas, tables, files, mappings, recordCount }) {
  const panel = document.createElement("article");
  panel.className = "area-context-card";
  const totalTables = areas.flatMap((item) => item.tables || []).length;
  const totalRecords = [...state.databaseTables.values()].reduce((sum, table) => sum + table.records.length, 0);
  const totalMappings = state.operatingModel.externalMappings.length;
  const totalDrive = state.googleDrive.files.length;
  const selectedSignals = tables.length + files.length + mappings.length + recordCount;
  const selectedLabel = area ? areaLabel(area) : "No selected area";
  const status = !isSignedIn()
    ? "Sign in required"
    : areas.length === 0 ? "No model loaded" : `${selectedLabel} selected`;
  panel.innerHTML = `
    <div class="area-context-copy">
      <span class="summary-kicker">Operating model context</span>
      <div class="area-context-heading">
        <strong>Company areas, tables, Drive files, and provider mappings</strong>
        <span class="workbench-index-status">${escapeHtml(status)}</span>
      </div>
      <p>Use this map as the source of truth for where imported structures, database tables, and agent-readable context belong across the company.</p>
      <div class="area-context-pills" aria-label="Operating area context">
        <span>${areas.length} area${areas.length === 1 ? "" : "s"}</span>
        <span>${totalTables} table${totalTables === 1 ? "" : "s"}</span>
        <span>${totalRecords} record${totalRecords === 1 ? "" : "s"}</span>
        <span>${totalMappings} provider mapping${totalMappings === 1 ? "" : "s"}</span>
        <span>${totalDrive} Drive item${totalDrive === 1 ? "" : "s"}</span>
        <span>${selectedSignals} selected-area signal${selectedSignals === 1 ? "" : "s"}</span>
      </div>
    </div>
    <div class="area-context-actions">
      <a class="button-link compact" href="/relationships" data-link>Review mappings</a>
      <a class="button-link secondary compact" href="/settings/integrations" data-link>Integration map</a>
    </div>
  `;
  bindInlineNavigation(panel);
  return panel;
}

function areaWorkbenchItems(area, definition, tables, files, mappings, previews) {
  return [
    ...tables.map((table) => areaWorkbenchItem("table", "Table", table.name, `${table.tableName} - /v1/${table.apiSlug} - ${countForTable(table)} records`, [
      definition.label,
      table.name,
      table.tableName,
      table.apiSlug
    ])),
    ...files.map((file) => {
      const meta = `${file.isFolder ? "Folder" : file.mimeType} - ${file.scanStatus || "unknown"} - ${formatDate(file.modifiedTime)}`;
      const editor = file.isFolder ? scopeEditorHtml({
        id: file.id,
        selectedAreaId: file.operatingAreaId || area.id,
        type: "drive",
        label: "Assign folder"
      }) : "";
      return areaWorkbenchItem("drive", "Drive", file.name, meta, [
        definition.label,
        file.name,
        file.mimeType,
        file.scanStatus
      ], editor);
    }),
    ...mappings.map((mapping) => {
      const editor = mapping.provider === "clickup" && ["space", "folder", "list"].includes(mapping.entityType) ? scopeEditorHtml({
        id: mapping.id,
        selectedAreaId: mapping.areaId || area.id,
        type: "mapping",
        label: "Assign mapping"
      }) : "";
      return areaWorkbenchItem("mapping", "Mapping", mapping.name || mapping.externalId, `${providerLabel(mapping.provider)} - ${mapping.entityType}`, [
        definition.label,
        mapping.name,
        mapping.externalId,
        mapping.provider,
        mapping.entityType
      ], editor);
    }),
    ...previews.map(({ table, record }) => areaWorkbenchItem("record", "Record", record.title || record.name || record.summary || record.email || record.id, `${table.name} - ${record.status || record.source || "companycore"}`, [
      definition.label,
      table.name,
      record.title,
      record.name,
      record.summary,
      record.email,
      record.status,
      record.source
    ]))
  ];
}

function areaWorkbenchItem(type, label, title, meta, searchableParts, editor = "") {
  const safeTitle = title || "-";
  const safeMeta = meta || "companycore";
  return {
    type,
    searchable: [label, safeTitle, safeMeta, ...searchableParts].filter(Boolean).join(" ").toLowerCase(),
    html: `
      <span class="record-type">${escapeHtml(label)}</span>
      <strong>${escapeHtml(safeTitle)}</strong>
      <span>${escapeHtml(safeMeta)}</span>
      ${editor}
    `
  };
}

function filteredAreaWorkbenchItems(items) {
  const search = state.areaFilters.search.trim().toLowerCase();
  return items.filter((item) => (!search || item.searchable.includes(search))
    && (!state.areaFilters.type || item.type === state.areaFilters.type));
}

function renderCompactList(container, items, renderItem, emptyText) {
  container.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "compact-row";
    row.innerHTML = renderItem(item);
    container.append(row);
  }
}

function renderGoogleDriveFiles() {
  googleDriveFilesBody.innerHTML = "";
  const files = state.googleDrive.files;
  const areasById = new Map(state.operatingModel.areas.map((area) => [area.id, area]));
  renderGoogleDriveContext();
  syncDriveFilters(files, areasById);

  if (files.length === 0) {
    googleDriveFilesSummary.textContent = state.googleDrive.configured
      ? "No Drive files imported yet."
      : "Google Drive is not connected yet.";
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No Drive files loaded yet.</td>';
    googleDriveFilesBody.append(row);
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  const folderCount = files.filter((file) => file.isFolder).length;
  const hierarchyRows = driveHierarchyRows(files);
  const filteredFiles = hierarchyRows.filter(({ file }) => driveFileMatchesFilters(file, areasById));
  googleDriveFilesSummary.textContent = `${filteredFiles.length} of ${files.length} Drive item${files.length === 1 ? "" : "s"} shown, including ${folderCount} folder${folderCount === 1 ? "" : "s"} imported.`;

  if (filteredFiles.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No imported Drive files match the current filters.</td>';
    googleDriveFilesBody.append(row);
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  for (const { file, depth } of filteredFiles.slice(0, 120)) {
    const row = document.createElement("tr");
    const area = areasById.get(file.operatingAreaId);
    const latestSnapshot = latestDriveSnapshot(file);
    const description = file.description || latestSnapshot?.summary || "";
    row.innerHTML = `
      <td>
        <div class="drive-name" style="--drive-depth:${depth}">
          <strong>${escapeHtml(file.name)}</strong>
          <small>${escapeHtml(description || "No description saved yet.")}</small>
        </div>
      </td>
      <td>${escapeHtml(driveKindLabel(file))}</td>
      <td>${file.isFolder
        ? scopeEditorHtml({
          id: file.id,
          selectedAreaId: file.operatingAreaId || state.operatingModel.areas[0]?.id,
          type: "drive",
          label: "Drive area"
        })
        : area ? escapeHtml(areaLabel(area)) : "-"}</td>
      <td>${escapeHtml(file.scanStatus)}</td>
      <td>${formatDate(file.modifiedTime)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="secondary compact" data-drive-preview="${escapeHtml(file.id)}">Preview</button>
          <button type="button" class="secondary compact" data-drive-description="${escapeHtml(file.id)}">Describe</button>
          ${file.webViewLink ? `<a class="button-link secondary compact" href="${escapeHtml(file.webViewLink)}" target="_blank" rel="noreferrer">Open</a>` : ""}
        </div>
      </td>
    `;
    googleDriveFilesBody.append(row);
  }
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
  bindScopeEditors();
  bindDriveFileActions();
}

function latestDriveSnapshot(file) {
  return Array.isArray(file.contentSnapshots) ? file.contentSnapshots[0] : null;
}

function driveKindLabel(file) {
  if (file.isFolder) {
    return "Folder";
  }
  if (file.mimeType === "application/vnd.google-apps.document") {
    return "Google Doc";
  }
  if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
    return "Google Sheet";
  }
  if (String(file.mimeType || "").startsWith("image/")) {
    return "Image";
  }
  if (String(file.name || "").toLowerCase().endsWith(".drawio") || String(file.mimeType || "").includes("jgraph")) {
    return "draw.io";
  }
  return file.mimeType || "File";
}

function driveHierarchyRows(files) {
  const byParent = new Map();
  const byExternalId = new Map(files.map((file) => [file.externalId, file]));
  for (const file of files) {
    const parentId = file.parentExternalId || "";
    const siblings = byParent.get(parentId) || [];
    siblings.push(file);
    byParent.set(parentId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => {
      if (left.isFolder !== right.isFolder) {
        return left.isFolder ? -1 : 1;
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }

  const roots = files.filter((file) => !file.parentExternalId || !byExternalId.has(file.parentExternalId));
  const rows = [];
  const visited = new Set();
  const visit = (file, depth) => {
    if (!file || visited.has(file.id)) {
      return;
    }
    visited.add(file.id);
    rows.push({ file, depth });
    for (const child of byParent.get(file.externalId) || []) {
      visit(child, depth + 1);
    }
  };
  for (const root of roots.sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))) {
    visit(root, 0);
  }
  for (const file of files) {
    visit(file, 0);
  }
  return rows;
}

function syncDriveFilters(files, areasById) {
  driveSearch.value = state.driveFilters.search;
  driveKindFilter.value = state.driveFilters.kind;

  const availableAreaIds = [...new Set(files.map((file) => file.operatingAreaId).filter(Boolean).map(String))];
  const nextArea = availableAreaIds.includes(state.driveFilters.area) ? state.driveFilters.area : "";
  driveAreaFilter.innerHTML = "";
  const areaPlaceholder = document.createElement("option");
  areaPlaceholder.value = "";
  areaPlaceholder.textContent = "All areas";
  driveAreaFilter.append(areaPlaceholder);
  for (const areaId of availableAreaIds.sort((left, right) => areaLabel(areasById.get(left) || { name: left }).localeCompare(areaLabel(areasById.get(right) || { name: right })))) {
    const option = document.createElement("option");
    option.value = areaId;
    option.textContent = areaLabel(areasById.get(areaId) || { name: areaId });
    driveAreaFilter.append(option);
  }
  driveAreaFilter.value = nextArea;
  state.driveFilters.area = nextArea;

  const scanStates = [...new Set(files.map((file) => file.scanStatus).filter(Boolean).map(String))]
    .sort((left, right) => left.localeCompare(right));
  const nextScan = scanStates.includes(state.driveFilters.scan) ? state.driveFilters.scan : "";
  driveScanFilter.innerHTML = "";
  const scanPlaceholder = document.createElement("option");
  scanPlaceholder.value = "";
  scanPlaceholder.textContent = "All scan states";
  driveScanFilter.append(scanPlaceholder);
  for (const scan of scanStates) {
    const option = document.createElement("option");
    option.value = scan;
    option.textContent = scan;
    driveScanFilter.append(option);
  }
  driveScanFilter.value = nextScan;
  state.driveFilters.scan = nextScan;
}

function driveFileMatchesFilters(file, areasById) {
  const search = state.driveFilters.search.trim().toLowerCase();
  const kind = file.isFolder ? "folder" : "file";
  const area = areasById.get(file.operatingAreaId);
  const latestSnapshot = latestDriveSnapshot(file);
  const haystack = [
    file.name,
    file.description,
    latestSnapshot?.summary,
    driveKindLabel(file),
    kind,
    file.mimeType,
    file.scanStatus,
    formatDate(file.modifiedTime),
    area ? areaLabel(area) : "Unassigned"
  ].filter(Boolean).join(" ").toLowerCase();

  return (!search || haystack.includes(search))
    && (!state.driveFilters.kind || kind === state.driveFilters.kind)
    && (!state.driveFilters.area || file.operatingAreaId === state.driveFilters.area)
    && (!state.driveFilters.scan || file.scanStatus === state.driveFilters.scan);
}

function bindScopeEditors() {
  document.querySelectorAll("[data-mapping-scope]").forEach((select) => {
    if (select.dataset.scopeBound === "true") {
      return;
    }
    select.dataset.scopeBound = "true";
    select.addEventListener("change", async (event) => {
      await updateExternalMappingScope(event.currentTarget.dataset.mappingScope, event.currentTarget.value);
    });
  });

  document.querySelectorAll("[data-drive-scope]").forEach((select) => {
    if (select.dataset.scopeBound === "true") {
      return;
    }
    select.dataset.scopeBound = "true";
    select.addEventListener("change", async (event) => {
      await updateGoogleDriveFileScope(event.currentTarget.dataset.driveScope, event.currentTarget.value);
    });
  });
}

async function loadTasks() {
  if (!isSignedIn()) {
    state.tasks = [];
    renderTasks();
    return;
  }

  const response = await api("/v1/tasks");
  state.tasks = response.data || [];
  state.databaseTables.set("tasks", { records: state.tasks });
  renderTasks();
  renderOperatingMap();
}

async function loadOperatingModel() {
  if (!isSignedIn()) {
    state.operatingModel = {
      areas: [],
      externalMappings: [],
      externalFields: [],
      storageLocations: [],
      knowledgeRoots: [],
      automationDefinitions: []
    };
    state.areaInventory = [];
    state.databaseTables = new Map();
    renderSidebarAreaList();
    renderOperatingMap();
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  const response = await api("/v1/operating-model");
  state.operatingModel = response.data || state.operatingModel;
  await loadDatabaseSnapshot();
  renderSidebarAreaList();
  renderOperatingMap();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
}

async function loadDatabaseSnapshot() {
  const tables = state.operatingModel.areas.flatMap((area) => area.tables || []);
  const next = new Map(state.databaseTables);

  await Promise.all(tables.map(async (table) => {
    const apiPath = tableRecordApiPath(table.apiSlug);
    if (!apiPath) {
      next.set(table.apiSlug, { records: [] });
      return;
    }
    try {
      const response = await api(apiPath);
      next.set(table.apiSlug, { records: response.data || [] });
    } catch {
      next.set(table.apiSlug, { records: [] });
    }
  }));

  state.databaseTables = next;
}

async function loadGoogleDriveFiles() {
  if (!isSignedIn()) {
    state.googleDrive.files = [];
    renderGoogleDriveFiles();
    renderOperatingMap();
    renderRelationshipCenter();
    return;
  }

  const response = await api("/v1/google-drive/files");
  state.googleDrive.files = response.data || [];
  renderGoogleDriveFiles();
  renderOperatingMap();
  renderRelationshipCenter();
}

async function loadRelationshipGraph() {
  if (!isSignedIn()) {
    state.relationshipGraph = {
      status: "signed-out",
      nodes: [],
      edges: [],
      reviewItems: [],
      unsupportedFamilies: [],
      summary: null
    };
    renderRelationshipCenter();
    return;
  }

  state.relationshipGraph.status = "loading";
  renderRelationshipCenter();
  try {
    const response = await api("/v1/relationships/graph");
    const graph = response.data?.graph || {};
    state.relationshipGraph = {
      status: "ready",
      nodes: graph.nodes || [],
      edges: graph.edges || [],
      reviewItems: graph.reviewItems || [],
      unsupportedFamilies: graph.unsupportedFamilies || [],
      summary: response.data?.summary || null
    };
  } catch (error) {
    state.relationshipGraph = {
      status: "error",
      nodes: [],
      edges: [],
      reviewItems: [],
      unsupportedFamilies: [],
      summary: null,
      message: friendlyError(error)
    };
  }
  renderRelationshipCenter();
}

async function updateExternalMappingScope(mappingId, areaId) {
  if (!mappingId || !areaId) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/operating-model/external-mappings/${mappingId}/scope`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaId, applyToChildren: true })
    });
    await loadOperatingModel();
    await loadRelationshipGraph();
    renderGoogleDriveFiles();
    showResult("Provider mapping moved to the selected company area.");
  } catch (error) {
    showResult(friendlyError(error), "error");
    await loadOperatingModel();
  } finally {
    setBusy(false);
  }
}

async function updateGoogleDriveFileScope(fileId, areaId) {
  if (!fileId || !areaId) {
    return;
  }

  setBusy(true);
  try {
    const response = await api(`/v1/google-drive/files/${fileId}/scope`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaId, applyToChildren: true })
    });
    await Promise.all([loadOperatingModel(), loadGoogleDriveFiles(), loadRelationshipGraph()]);
    showResult(`${response.data?.updatedCount || 1} Drive item${response.data?.updatedCount === 1 ? "" : "s"} moved to the selected company area.`);
  } catch (error) {
    showResult(friendlyError(error), "error");
    await loadGoogleDriveFiles();
  } finally {
    setBusy(false);
  }
}

async function previewGoogleDriveFile(fileId) {
  const file = state.googleDrive.files.find((item) => item.id === fileId);
  if (!file) {
    return;
  }

  setBusy(true);
  try {
    let snapshot = latestDriveSnapshot(file);
    if (!file.isFolder) {
      const response = await api(`/v1/google-drive/files/${fileId}/content`);
      snapshot = response.data;
      file.contentSnapshots = snapshot ? [snapshot] : [];
      file.scanStatus = snapshot?.scanStatus || file.scanStatus;
    }

    const preview = {
      name: file.name,
      kind: driveKindLabel(file),
      description: file.description || null,
      summary: snapshot?.summary || null,
      contentKind: snapshot?.contentKind || null,
      textPreview: snapshot?.extractedText ? String(snapshot.extractedText).slice(0, 1200) : null,
      thumbnail: file.thumbnailLink || null,
      webViewLink: file.webViewLink || null,
      mimeType: file.mimeType,
      parentExternalId: file.parentExternalId || null,
      scanStatus: snapshot?.scanStatus || file.scanStatus
    };
    renderGoogleDriveFiles();
    showResult("Drive preview loaded.", "success", preview);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function editGoogleDriveFileDescription(fileId) {
  const file = state.googleDrive.files.find((item) => item.id === fileId);
  if (!file) {
    return;
  }

  const nextDescription = window.prompt("Describe what this Drive item contains for agents and operators.", file.description || "");
  if (nextDescription === null) {
    return;
  }

  setBusy(true);
  try {
    const response = await api(`/v1/google-drive/files/${fileId}/description`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: nextDescription })
    });
    const index = state.googleDrive.files.findIndex((item) => item.id === fileId);
    if (index >= 0) {
      state.googleDrive.files[index] = response.data;
    }
    renderGoogleDriveFiles();
    renderOperatingMap();
    renderRelationshipCenter();
    showResult("Drive description saved.");
  } catch (error) {
    showResult(friendlyError(error), "error");
    await loadGoogleDriveFiles();
  } finally {
    setBusy(false);
  }
}

async function saveGoogleDriveOAuthClient() {
  const clientId = fields.googleDriveClientId.value.trim();
  const clientSecret = fields.googleDriveClientSecret.value.trim();

  if (!clientId) {
    throw new Error(state.googleDrive.oauthClientConfigured
      ? "Paste the OAuth client ID again when rotating Google credentials."
      : "Paste the Google OAuth client ID first.");
  }

  const selectedFolderIds = parseIdList(fields.googleDriveFolderIds.value);
  const response = await api("/v1/integration-settings/google_drive", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      oauthClient: {
        clientId,
        ...(clientSecret ? { clientSecret } : {})
      },
      active: fields.googleDriveActive.checked,
      config: {
        selectedFolderIds,
        rootFolderIds: selectedFolderIds,
        importMode: fields.googleDriveImportMode.value
      }
    })
  });

  state.googleDrive.configured = response.data.secretConfigured;
  state.googleDrive.oauthClientConfigured = Boolean(response.data.oauthClientConfigured);
  state.googleDrive.oauthTokenConfigured = Boolean(response.data.oauthTokenConfigured);
  state.googleDrive.active = Boolean(response.data.active);
  state.googleDrive.config = response.data.config || state.googleDrive.config;
  fields.googleDriveClientId.value = "";
  fields.googleDriveClientSecret.value = "";
  syncGoogleDriveCredentialPlaceholders();
  renderGoogleDriveFolderPicker();
  renderConnectionState();
  setGoogleDriveEnabled(isSignedIn());
}

async function discoverGoogleDriveFolders() {
  const response = await api("/v1/integration-settings/google_drive/folders/discover");
  state.googleDrive.discoveredFolders = response.data || [];
  renderGoogleDriveFolderPicker();
  return state.googleDrive.discoveredFolders;
}

async function saveGoogleDriveFolderSelection() {
  const selectedFolderIds = selectedGoogleDriveFolderIds();
  if (state.googleDrive.discoveredFolders.length > 0 && selectedFolderIds.length === 0) {
    throw new Error("Select at least one Drive folder before saving the import selection.");
  }
  const fallbackFolderIds = parseIdList(fields.googleDriveFolderIds.value);
  const folderIds = selectedFolderIds.length > 0 ? selectedFolderIds : fallbackFolderIds;
  if (folderIds.length === 0) {
    throw new Error("Select Drive folders or paste folder IDs before saving the import selection.");
  }

  const response = await api("/v1/integration-settings/google_drive", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      active: fields.googleDriveActive.checked,
      config: {
        ...state.googleDrive.config,
        selectedFolderIds: folderIds,
        rootFolderIds: folderIds,
        importMode: fields.googleDriveImportMode.value || "merge"
      }
    })
  });
  state.googleDrive.config = response.data.config || state.googleDrive.config;
  fields.googleDriveFolderIds.value = folderIds.join(", ");
  renderGoogleDriveFolderPicker();
  return folderIds;
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong.";
  if (error?.name === "AbortError") {
    return "The request timed out. Refresh and try again.";
  }
  const copy = {
    email_already_registered: "This email already has a CompanyCore account.",
    invalid_credentials: "Email or password is incorrect.",
    integration_invalid_token: "ClickUp rejected this token. Check that it belongs to your ClickUp account and has access to the Workspace.",
    integration_rate_limited: "ClickUp rate limit was reached. Wait a minute, then try again.",
    integration_secret_required: "Paste a ClickUp token first, or use a saved connection.",
    integration_not_configured: "ClickUp is not configured for this workspace yet.",
    integration_unavailable: "ClickUp did not respond successfully. Try again shortly.",
    sync_failed: "Select at least one Google Drive folder before importing.",
    google_drive_not_configured: "Google Drive is not configured for this workspace yet.",
    google_drive_oauth_required: "Google Drive needs an OAuth refresh token before it can import files.",
    validation_error: "Some fields are missing or invalid.",
    forbidden: "This action requires the owner login.",
    system_area_protected: "System operating areas are protected.",
    conflict: "This change conflicts with linked records. Reassign or clear dependencies first."
  };
  return copy[message] || message;
}

function parseApiError(body, fallback) {
  if (typeof body?.error === "string") {
    return body.error;
  }
  return body?.error?.message || body?.error?.code || fallback;
}

function isAuthSessionError(error) {
  const message = error?.message || "";
  return message === "invalid_token"
    || message === "unauthorized"
    || message.includes("401");
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? apiRequestTimeoutMs);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    signal: controller.signal,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  }).finally(() => window.clearTimeout(timeout));

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseApiError(body, `${response.status} ${response.statusText}`));
  }
  return body;
}

async function authRequest(path, payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), apiRequestTimeoutMs);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).finally(() => window.clearTimeout(timeout));
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseApiError(body, "Auth failed."));
  }
  return body;
}

function applyAuthPayload(payload) {
  state.ownerToken = payload.data.token;
  state.user = payload.data.user || state.user;
  state.workspace = payload.data.workspace;
  if (Array.isArray(payload.data.workspaces)) {
    state.workspaces = payload.data.workspaces;
  }
  sessionStorage.setItem("companycoreOwnerToken", state.ownerToken);
  renderWorkspaceSwitcher();
}

function workspaceOptionLabel(workspace) {
  const role = workspace.role ? ` · ${workspace.role}` : "";
  return `${workspace.name}${workspace.active ? " (active)" : role}`;
}

function renderWorkspaceSwitcher() {
  if (!workspaceSwitcher) {
    return;
  }

  workspaceSwitcher.innerHTML = "";
  const workspaces = state.workspaces.length > 0
    ? state.workspaces
    : state.workspace ? [{ ...state.workspace, active: true }] : [];

  if (workspaces.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sign in to load workspaces";
    workspaceSwitcher.append(option);
    workspaceSwitcher.disabled = true;
    return;
  }

  for (const workspace of workspaces) {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspaceOptionLabel(workspace);
    workspaceSwitcher.append(option);
  }

  workspaceSwitcher.value = state.workspace?.id || workspaces.find((workspace) => workspace.active)?.id || "";
  workspaceSwitcher.disabled = !isSignedIn();
}

function areaInventoryTotal(area) {
  const resources = area.resources || {};
  return Object.values(resources).reduce((sum, value) => sum + Number(value || 0), 0);
}

function renderSidebarAreaList() {
  if (!sidebarAreaList) {
    return;
  }

  sidebarAreaList.innerHTML = "";
  const inventory = state.areaInventory.length > 0
    ? state.areaInventory
    : state.operatingModel.areas.map((area) => ({
      ...area,
      resources: {
        folders: area.folders?.length || 0,
        tables: area.tables?.length || 0,
        externalMappings: 0,
        driveFiles: 0,
        storageLocations: 0,
        knowledgeRoots: 0,
        automationDefinitions: 0
      }
    }));

  if (!isSignedIn() || inventory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "form-note";
    empty.textContent = isSignedIn() ? "No operating areas loaded yet." : "Sign in to load areas.";
    sidebarAreaList.append(empty);
    return;
  }

  for (const area of inventory) {
    const totalResources = areaInventoryTotal(area);
    const details = document.createElement("details");
    details.className = area.key === state.selectedAreaKey ? "is-active" : "";
    details.open = state.selectedAreaKey === area.key;
    details.addEventListener("toggle", () => {
      if (details.open) {
        state.selectedAreaKey = area.key;
        details.classList.add("is-active");
        sidebarAreaList.querySelectorAll("details").forEach((item) => {
          if (item !== details) {
            item.open = false;
            item.classList.remove("is-active");
          }
        });
      } else if (state.selectedAreaKey === area.key) {
        details.classList.remove("is-active");
      }
    });
    const summary = document.createElement("summary");
    summary.setAttribute("aria-label", `${area.name}, ${totalResources} resources`);
    const title = document.createElement("span");
    title.textContent = area.name;
    const count = document.createElement("span");
    count.className = "sidebar-area-count";
    count.textContent = totalResources > 0 ? `${totalResources}` : "empty";
    summary.append(title, count);

    const links = document.createElement("div");
    links.className = "sidebar-area-links";
    const resources = [
      ["tables", "Tables", "/data"],
      ["driveFiles", "Drive", "/settings/drive"],
      ["externalMappings", "Mappings", "/relationships"],
      ["automationDefinitions", "Automations", "/settings/integrations"]
    ];

    for (const [key, label, path] of resources) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.path = path;
      button.dataset.areaKey = area.key;
      button.textContent = `${label} · ${area.resources?.[key] || 0}`;
      button.setAttribute("aria-label", `Open ${label.toLowerCase()} for ${area.name}`);
      button.addEventListener("click", () => {
        state.selectedAreaKey = area.key;
        navigate(path);
      });
      links.append(button);
    }

    details.append(summary, links);
    sidebarAreaList.append(details);
  }
}

async function loadWorkspaces() {
  if (!isSignedIn()) {
    state.workspaces = [];
    renderWorkspaceSwitcher();
    return;
  }

  const response = await api("/v1/workspaces");
  state.workspaces = response.data || [];
  renderWorkspaceSwitcher();
}

async function loadAreaInventory() {
  if (!isSignedIn()) {
    state.areaInventory = [];
    renderSidebarAreaList();
    return;
  }

  const response = await api("/v1/operating-model/area-inventory");
  state.areaInventory = response.data || [];
  renderSidebarAreaList();
}

function resetWorkspaceScopedState() {
  state.capabilities = [];
  state.adapterManifest = null;
  state.mcpManifest = null;
  state.apiKeys = [];
  state.agentKeyProfiles = [];
  state.lastRawApiKey = null;
  state.clickup.configured = false;
  state.clickup.active = false;
  state.clickup.config = {};
  state.clickup.workspaces = [];
  state.clickup.selectedWorkspace = null;
  state.clickup.spaces = [];
  state.clickup.selectedListIds = new Set();
  state.googleDrive.configured = false;
  state.googleDrive.active = false;
  state.googleDrive.oauthClientConfigured = false;
  state.googleDrive.oauthTokenConfigured = false;
  state.googleDrive.config = {};
  state.googleDrive.files = [];
  state.googleDrive.discoveredFolders = [];
  state.operatingModel = {
    areas: [],
    externalMappings: [],
    externalFields: [],
    storageLocations: [],
    knowledgeRoots: [],
    automationDefinitions: []
  };
  state.areaInventory = [];
  state.relationshipGraph = {
    status: "idle",
    nodes: [],
    edges: [],
    reviewItems: [],
    unsupportedFamilies: [],
    summary: null
  };
  state.databaseTables = new Map();
  state.selectedAreaKey = "";
  state.tasks = [];
}

async function activateWorkspaceFromPayload(payload) {
  applyAuthPayload(payload);
  resetWorkspaceScopedState();
  renderConnectionState();
  await loadConnection();
  renderRoute();
}

function renderConnectionState() {
  const connected = isSignedIn() && state.workspace;
  connectionStatus.innerHTML = connected
    ? '<span class="dot ok"></span><span>Connected</span>'
    : '<span class="dot muted"></span><span>Not connected</span>';
  if (sidebarStatusDot) {
    sidebarStatusDot.className = connected ? "dot ok" : "dot muted";
  }
  if (sidebarStatusText) {
    sidebarStatusText.textContent = connected ? "Workspace online" : "Not connected";
  }
  if (topbarHealthDot) {
    topbarHealthDot.className = connected ? "dot ok" : "dot muted";
  }
  if (topbarHealthText) {
    topbarHealthText.textContent = connected ? "Healthy" : "Offline";
  }
  if (topbarWorkspaceText) {
    topbarWorkspaceText.textContent = connected ? state.workspace.name : "No workspace";
  }
  if (topbarAgentText) {
    const tools = state.mcpManifest?.tools?.length || 0;
    const keys = state.apiKeys?.filter((key) => key.active).length || 0;
    topbarAgentText.textContent = connected
      ? `${tools} MCP tools · ${keys} active keys`
      : "Agents not loaded";
  }
  if (sidebarWorkspaceName) {
    sidebarWorkspaceName.textContent = connected ? state.workspace.name : "Workspace";
  }
  renderWorkspaceSwitcher();
  renderSidebarAreaList();
  if (workspaceEyebrow) {
    workspaceEyebrow.textContent = connected ? "Company command" : "Private workspace";
  }
  renderRouteCommandStrip(normalizedPath());

  workspaceLabel.textContent = connected
    ? `${state.workspace.name} workspace`
    : "Sign in to load workspace status.";
  clickupWorkspaceLabel.textContent = connected
    ? `${state.workspace.name} workspace`
    : "Sign in to load workspace settings.";
  workspaceNameLabel.textContent = connected ? state.workspace.name : "-";
  dashboardDataStatusLabel.textContent = connected
    ? `${state.operatingModel.areas.length} areas`
    : "-";
  dashboardDataStatusHint.textContent = connected
    ? `${state.operatingModel.areas.flatMap((area) => area.tables || []).length} tables and ${totalDatabaseRecords()} records loaded.`
    : "Sign in to load workspace data.";

  if (state.clickup.configured) {
    clickupStatusLabel.textContent = state.clickup.active ? "Active" : "Saved, inactive";
    clickupStatusHint.textContent = `${(state.clickup.config.listIds || []).length} ClickUp Lists selected.`;
  } else {
    clickupStatusLabel.textContent = "Not configured";
    clickupStatusHint.textContent = "Connect ClickUp in settings.";
  }

  if (state.googleDrive.oauthTokenConfigured) {
    googleDriveStatusLabel.textContent = state.googleDrive.active ? "Active" : "Saved, inactive";
    googleDriveStatusHint.textContent = `${state.googleDrive.files.length} Drive item${state.googleDrive.files.length === 1 ? "" : "s"} imported.`;
    googleDriveWorkspaceLabel.textContent = connected
      ? `${state.workspace.name} workspace · Google Drive ${state.googleDrive.active ? "active" : "inactive"}`
      : "Sign in to load Google Drive settings.";
  } else if (state.googleDrive.oauthClientConfigured) {
    googleDriveStatusLabel.textContent = "OAuth client saved";
    googleDriveStatusHint.textContent = "Create the OAuth URL, approve consent, then import folders.";
    googleDriveWorkspaceLabel.textContent = connected
      ? `${state.workspace.name} workspace - Google OAuth client saved`
      : "Sign in to load Google Drive settings.";
  } else {
    googleDriveStatusLabel.textContent = "Not configured";
    googleDriveStatusHint.textContent = "Connect Google Drive to import folders and files.";
    googleDriveWorkspaceLabel.textContent = connected
      ? `${state.workspace.name} workspace · Google Drive not configured`
      : "Sign in to load Google Drive settings.";
  }

  googleDriveClientStatus.textContent = state.googleDrive.oauthClientConfigured
    ? "OAuth client saved. Paste a new client ID and secret only when rotating credentials."
    : "OAuth client not saved yet.";

  renderClickUpSetupContext();
  renderApiSecurityContext();

  if (state.capabilities.length > 0) {
    capabilitySummary.textContent = `${state.capabilities.length} capabilities available for this workspace.`;
    capabilityList.innerHTML = "";
    for (const capability of state.capabilities) {
      const item = document.createElement("span");
      item.textContent = capability;
      capabilityList.append(item);
    }
  } else {
    capabilitySummary.textContent = connected
      ? "No capabilities returned by the connection endpoint."
      : "Sign in to load available API capabilities.";
    capabilityList.innerHTML = "";
  }

  renderApiWorkbench();
}

function renderClickUpSetupContext() {
  clickupContext.innerHTML = "";
  const signedIn = isSignedIn();
  const selectedLists = state.clickup.selectedListIds.size;
  const savedLists = (state.clickup.config.listIds || []).length;
  const loadedLists = allLists().length;
  const clickUpTasks = state.tasks.filter((task) => task.source === "clickup").length;
  const status = state.clickup.configured
    ? state.clickup.active ? "ClickUp active" : "ClickUp saved, inactive"
    : "ClickUp not connected";
  const workspaceStatus = workspaceSelect.value
    ? "Workspace selected"
    : state.clickup.config.teamId ? "Saved workspace" : "Workspace not selected";
  const tokenStatus = state.clickup.configured ? "Saved token available" : "Token required";
  const panel = document.createElement("article");
  panel.className = "clickup-context-card";
  panel.innerHTML = `
    <div class="clickup-context-copy">
      <span class="summary-kicker">ClickUp adapter command</span>
      <div class="clickup-context-heading">
        <strong>${escapeHtml(signedIn && state.workspace ? state.workspace.name : "Workspace ClickUp setup")}</strong>
        <span class="workbench-index-status">${escapeHtml(signedIn ? status : "Sign in required")}</span>
      </div>
      <p>Use this adapter surface to verify a ClickUp token, choose the Workspace, select Lists, and sync external execution records into CompanyCore.</p>
      <div class="clickup-context-pills" aria-label="ClickUp setup context">
        <span>${escapeHtml(tokenStatus)}</span>
        <span>${escapeHtml(workspaceStatus)}</span>
        <span>${selectedLists} selected List${selectedLists === 1 ? "" : "s"}</span>
        <span>${savedLists} saved List${savedLists === 1 ? "" : "s"}</span>
        <span>${loadedLists} loaded List${loadedLists === 1 ? "" : "s"}</span>
        <span>${clickUpTasks} ClickUp task${clickUpTasks === 1 ? "" : "s"}</span>
        <span>${escapeHtml(fields.importMode.value || "merge")} mode</span>
      </div>
    </div>
    <div class="clickup-context-actions">
      <a class="button-link compact" href="/settings#clickupPanel" data-link>Setup form</a>
      <a class="button-link secondary compact" href="/tasks-adapter" data-link>Review tasks</a>
      <a class="button-link secondary compact" href="/settings/integrations" data-link>Integration map</a>
    </div>
  `;
  bindInlineNavigation(panel);
  clickupContext.append(panel);
}

function renderApiSecurityContext() {
  apiContext.innerHTML = "";
  const signedIn = isSignedIn();
  const routes = apiRouteRows();
  const activeKeys = state.apiKeys.filter((key) => key.active);
  const inactiveKeys = state.apiKeys.length - activeKeys.length;
  const scopedKeys = activeKeys.filter((key) => Array.isArray(key.scopes) && key.scopes.length > 0);
  const mcpTools = Array.isArray(state.mcpManifest?.tools) ? state.mcpManifest.tools : [];
  const supervisedTools = mcpTools.filter((tool) => tool.requiresApproval || tool.riskLevel === "destructive");
  const writeRoutes = routes.filter((route) => ["POST", "PATCH", "PUT", "DELETE"].includes(route.method)).length;
  const broadKeys = activeKeys.filter((key) => !Array.isArray(key.scopes) || key.scopes.length === 0).length;
  const readTools = mcpTools.filter((tool) => tool.riskLevel === "read").length;
  const writeTools = mcpTools.filter((tool) => tool.riskLevel === "write").length;
  const destructiveTools = mcpTools.filter((tool) => tool.riskLevel === "destructive").length;
  const profileCount = Array.isArray(state.agentKeyProfiles) ? state.agentKeyProfiles.length : 0;
  const health = !signedIn
    ? "Sign in required"
    : broadKeys > 0 ? "Broad key review"
      : activeKeys.length > 0 ? "Agent access ready" : "No active keys";
  const priorityTitle = !signedIn
    ? "Sign in before creating agent access"
    : broadKeys > 0
      ? "Review broad service keys"
      : activeKeys.length === 0
        ? "Create the first scoped agent key"
        : supervisedTools.length > 0
          ? "Confirm supervised tool exposure"
          : "Scoped agent access is ready";
  const priorityDetail = !signedIn
    ? "Owner authentication is required before CompanyCore can show workspace-scoped key, capability, and MCP tool impact."
    : broadKeys > 0
      ? "At least one active key has broad compatibility scope. Prefer a profile-backed scoped key before handing access to an agent."
      : activeKeys.length === 0
        ? "Use a backend-managed preset, inspect the MCP impact preview, then create and copy the key once."
        : supervisedTools.length > 0
          ? "Some visible MCP tools require approval or destructive/write supervision. Check the preview before rotating or adding keys."
          : "Active keys are scoped. Keep reviewing route exposure when adding new agents, tools, or integrations.";
  const commandCards = [
    {
      label: "Active keys",
      value: `${activeKeys.length}`,
      detail: `${scopedKeys.length} scoped, ${broadKeys} broad`,
      href: "#agentKeyList",
      tone: broadKeys > 0 ? "attention" : activeKeys.length > 0 ? "ready" : "blocked"
    },
    {
      label: "MCP tools",
      value: `${mcpTools.length}`,
      detail: `${readTools} read, ${writeTools + destructiveTools} write/destructive`,
      href: "#api-routes-panel",
      tone: mcpTools.length > 0 ? "ready" : "blocked"
    },
    {
      label: "Supervised",
      value: `${supervisedTools.length}`,
      detail: "approval or destructive risk",
      href: "#agentKeyPreview",
      tone: supervisedTools.length > 0 ? "attention" : "ready"
    },
    {
      label: "Presets",
      value: `${profileCount || fallbackAgentKeyPresets.length}`,
      detail: "least-privilege templates",
      href: "#agentKeyForm",
      tone: profileCount > 0 ? "ready" : "attention"
    }
  ];

  const panel = document.createElement("article");
  panel.className = "api-context-card";
  panel.innerHTML = `
    <div class="api-context-copy">
      <span class="summary-kicker">Agent API command center</span>
      <div class="api-context-heading">
        <strong>${escapeHtml(signedIn && state.workspace ? state.workspace.name : "Workspace")} agent access</strong>
        <span class="workbench-index-status">${escapeHtml(health)}</span>
      </div>
      <p>Create scoped service keys, inspect route capabilities, and preview MCP tool exposure before handing a key to another app.</p>
      <div class="api-command-summary">
        <div>
          <span class="summary-kicker">Agent access command</span>
          <strong>${escapeHtml(priorityTitle)}</strong>
          <p>${escapeHtml(priorityDetail)}</p>
        </div>
        <div class="api-command-grid" aria-label="Agent access safety summary">
          ${commandCards.map((card) => `
            <a class="api-command-card is-${card.tone}" href="${card.href}">
              <small>${escapeHtml(card.label)}</small>
              <strong>${escapeHtml(card.value)}</strong>
              <span>${escapeHtml(card.detail)}</span>
            </a>
          `).join("")}
        </div>
      </div>
      <div class="api-context-pills" aria-label="API operation context">
        <span>${escapeHtml(signedIn && state.workspace ? state.workspace.name : "No workspace")}</span>
        <span>${activeKeys.length} active key${activeKeys.length === 1 ? "" : "s"}</span>
        <span>${inactiveKeys} inactive key${inactiveKeys === 1 ? "" : "s"}</span>
        <span>${scopedKeys.length} scoped key${scopedKeys.length === 1 ? "" : "s"}</span>
        <span>${state.capabilities.length} capabilit${state.capabilities.length === 1 ? "y" : "ies"}</span>
        <span>${mcpTools.length} MCP tool${mcpTools.length === 1 ? "" : "s"}</span>
        <span>${supervisedTools.length} supervised tool${supervisedTools.length === 1 ? "" : "s"}</span>
        <span>${routes.length} route${routes.length === 1 ? "" : "s"}</span>
        <span>${writeRoutes} write route${writeRoutes === 1 ? "" : "s"}</span>
      </div>
    </div>
    <div class="api-context-actions">
      <a class="button-link compact" href="#agentKeyForm">Create key</a>
      <a class="button-link secondary compact" href="#agentKeyList">Review keys</a>
      <a class="button-link secondary compact" href="#api-routes-panel">Route exposure</a>
      <a class="button-link secondary compact" href="/settings/integrations" data-link>Integration map</a>
    </div>
  `;
  bindInlineNavigation(panel);
  apiContext.append(panel);
}

async function createOperatingArea() {
  const name = window.prompt("New operating area name");
  if (!name?.trim()) {
    return;
  }

  setBusy(true);
  try {
    const response = await api("/v1/operating-model/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    state.selectedAreaKey = response.data?.key || state.selectedAreaKey;
    await loadOperatingModel();
    showResult("Operating area created.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function deleteSelectedArea(area, reassignArea) {
  if (!area || area.isSystem || !reassignArea) {
    return;
  }

  const confirmed = window.confirm(`Delete "${areaLabel(area)}" and move linked content to "${areaLabel(reassignArea)}"?`);
  if (!confirmed) {
    return;
  }

  setBusy(true);
  try {
    await api(`/v1/operating-model/areas/${area.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassignToAreaId: reassignArea.id })
    });
    state.selectedAreaKey = reassignArea.key;
    await Promise.all([loadOperatingModel(), loadGoogleDriveFiles()]);
    showResult("Operating area deleted and linked content reassigned.");
  } catch (error) {
    showResult(friendlyError(error), "error");
    await loadOperatingModel();
  } finally {
    setBusy(false);
  }
}

function renderApiWorkbench() {
  apiRouteList.innerHTML = "";
  const routes = apiRouteRows();
  syncApiFilters(routes);
  const filteredRoutes = filteredApiRouteRows(routes);

  if (!isSignedIn()) {
    apiRouteSummary.textContent = "Sign in to load the adapter route manifest.";
    renderApiRouteEmpty("Sign in to review implemented API routes.");
    return;
  }

  if (routes.length === 0) {
    apiRouteSummary.textContent = "No adapter route manifest is available for this workspace yet.";
    renderApiRouteEmpty("The connection endpoint did not return adapter routes.");
    return;
  }

  apiRouteSummary.textContent = `${filteredRoutes.length} of ${routes.length} implemented API route${routes.length === 1 ? "" : "s"} match the current view.`;

  if (filteredRoutes.length === 0) {
    renderApiRouteEmpty("No API routes match the current filters.");
    return;
  }

  for (const route of filteredRoutes) {
    const row = document.createElement("div");
    row.className = "compact-row api-route-row";
    const method = document.createElement("span");
    method.className = "record-type";
    method.textContent = route.method;
    const title = document.createElement("strong");
    title.textContent = route.path;
    const meta = document.createElement("span");
    meta.textContent = `${route.group} - ${route.capability || "capability not specified"}`;
    row.append(method, title, meta);
    apiRouteList.append(row);
  }
}

function profileToAgentKeyPreset(profile) {
  const riskLabel = profile.riskLevel ? ` Risk: ${profile.riskLevel}.` : "";
  const recommendedFor = Array.isArray(profile.recommendedFor) && profile.recommendedFor.length > 0
    ? ` Recommended for: ${profile.recommendedFor.join(", ")}.`
    : "";
  return {
    id: profile.id,
    label: profile.label,
    description: `${profile.description || "Backend-managed MCP agent key profile."}${riskLabel}${recommendedFor}`,
    scopes: Array.isArray(profile.scopes) ? profile.scopes : []
  };
}

function selectedAgentKeyProfile() {
  const selectedId = agentKeyPreset.value;
  return Array.isArray(state.agentKeyProfiles)
    ? state.agentKeyProfiles.find((profile) => profile.id === selectedId) || null
    : null;
}

function currentAgentKeyPresets() {
  const backendProfiles = Array.isArray(state.agentKeyProfiles)
    ? state.agentKeyProfiles.map(profileToAgentKeyPreset)
    : [];
  return backendProfiles.length > 0 ? backendProfiles : fallbackAgentKeyPresets;
}

function selectedAgentKeyProfileId() {
  const selectedId = agentKeyPreset.value;
  return state.agentKeyProfiles.some((profile) => profile.id === selectedId) ? selectedId : "";
}

function scopesMatch(left, right) {
  const normalize = (items) => [...new Set(items || [])].sort();
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((scope, index) => scope === normalizedRight[index]);
}

function setupAgentKeyPresets() {
  const presets = currentAgentKeyPresets();
  agentKeyPreset.innerHTML = "";
  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    agentKeyPreset.append(option);
  }
  applyAgentKeyPreset(presets[0]?.id || "");
}

function applyAgentKeyPreset(presetId) {
  const presets = currentAgentKeyPresets();
  const preset = presets.find((item) => item.id === presetId) || presets[0];
  if (!preset) {
    return;
  }
  agentKeyPreset.value = preset.id;
  if (!agentKeyName.value.trim()) {
    agentKeyName.value = preset.label;
  }
  agentKeyScopes.value = preset.scopes.join("\n");
  setAgentKeyStatus(preset.description);
  renderAgentKeyPreview();
}

function parseScopesInput(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function riskForScopes(scopes, profile) {
  if (profile?.riskLevel) {
    return profile.riskLevel;
  }
  const highRiskMarkers = [
    ":write",
    ":activate",
    ":execute",
    ":retry",
    ":import",
    ":reconcile",
    "approval:decide"
  ];
  if (scopes.some((scope) => highRiskMarkers.some((marker) => scope.includes(marker)))) {
    return "high";
  }
  if (scopes.some((scope) => scope.endsWith(":write") || scope.endsWith(":ack"))) {
    return "medium";
  }
  return "low";
}

function toolsForScopes(scopes) {
  const selected = new Set(scopes);
  return Array.isArray(state.mcpManifest?.tools)
    ? state.mcpManifest.tools.filter((tool) => selected.has(tool.capability))
    : [];
}

function routeFamiliesForTools(tools) {
  const families = tools.map((tool) => {
    const parts = String(tool.path || "").split("/").filter(Boolean);
    return parts[1] || parts[0] || "root";
  });
  return [...new Set(families)].sort((left, right) => left.localeCompare(right));
}

function renderAgentKeyPreview() {
  if (!agentKeyPreview) {
    return;
  }

  const signedIn = isSignedIn();
  const scopes = parseScopesInput(agentKeyScopes.value);
  const profile = selectedAgentKeyProfile();
  const tools = toolsForScopes(scopes);
  const readTools = tools.filter((tool) => tool.riskLevel === "read").length;
  const writeTools = tools.filter((tool) => tool.riskLevel === "write").length;
  const destructiveTools = tools.filter((tool) => tool.riskLevel === "destructive").length;
  const supervisedTools = tools.filter((tool) => tool.requiresApproval).length;
  const missingMcpScopes = ["connection:read", "mcp:read"].filter((scope) => !scopes.includes(scope));
  const risk = riskForScopes(scopes, profile);
  const families = routeFamiliesForTools(tools).slice(0, 5);
  const relationshipReady = scopes.includes("relationships:read");
  const workspaceName = signedIn && state.workspace ? state.workspace.name : "Sign in required";

  agentKeyPreview.className = `agent-key-preview is-${risk}`;
  agentKeyPreview.innerHTML = `
    <div class="agent-key-preview-head">
      <span class="summary-kicker">Key preview</span>
      <strong>${escapeHtml(workspaceName)}</strong>
      <span class="workbench-index-status">Risk: ${escapeHtml(risk)}</span>
    </div>
    <p>${escapeHtml(profile?.description || "Custom scoped key. Keep scopes narrow and verify the MCP tool impact before creating it.")}</p>
    <div class="agent-key-preview-grid" aria-label="Selected key impact">
      <span><strong>${scopes.length}</strong> scope${scopes.length === 1 ? "" : "s"}</span>
      <span><strong>${tools.length}</strong> MCP tool${tools.length === 1 ? "" : "s"}</span>
      <span><strong>${readTools}</strong> read</span>
      <span><strong>${writeTools + destructiveTools}</strong> write/destructive</span>
      <span><strong>${supervisedTools}</strong> supervised</span>
      <span><strong>${relationshipReady ? "yes" : "no"}</strong> graph read</span>
    </div>
    <div class="agent-key-preview-notes">
      ${missingMcpScopes.length > 0 ? `<span class="is-warning">Missing MCP base scope${missingMcpScopes.length === 1 ? "" : "s"}: ${escapeHtml(missingMcpScopes.join(", "))}</span>` : "<span>MCP base scopes included.</span>"}
      ${families.length > 0 ? `<span>Tool families: ${escapeHtml(families.join(", "))}${routeFamiliesForTools(tools).length > families.length ? ", ..." : ""}</span>` : "<span>No MCP tools match the selected scopes yet.</span>"}
      ${profile?.recommendedFor?.length ? `<span>Recommended for: ${escapeHtml(profile.recommendedFor.join(", "))}</span>` : ""}
    </div>
  `;
}

function renderAgentKeys() {
  agentKeyList.innerHTML = "";
  const signedIn = isSignedIn();
  const activeCount = state.apiKeys.filter((key) => key.active).length;
  const inactiveCount = state.apiKeys.length - activeCount;

  agentKeySummary.textContent = signedIn
    ? `${activeCount} active service key${activeCount === 1 ? "" : "s"} and ${inactiveCount} inactive key${inactiveCount === 1 ? "" : "s"} in this workspace.`
    : "Sign in to manage scoped keys for Jarvis, Paperclip, Aviary, and internal agents.";
  renderApiSecurityContext();
  renderAgentKeyPreview();

  agentKeyForm.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !signedIn;
  });
  refreshAgentKeysButton.disabled = !signedIn;

  if (state.lastRawApiKey) {
    agentKeyOnce.hidden = false;
    agentKeyRawValue.textContent = state.lastRawApiKey;
  } else {
    agentKeyOnce.hidden = true;
    agentKeyRawValue.textContent = "";
  }

  if (!signedIn) {
    agentKeyList.append(emptyNote("Sign in to review service keys."));
    return;
  }

  if (state.apiKeys.length === 0) {
    agentKeyList.append(emptyNote("No service keys yet. Create a scoped key from a preset above."));
    return;
  }

  for (const key of state.apiKeys) {
    agentKeyList.append(agentKeyRowElement(key));
  }
}

function agentKeyRowElement(key) {
  const row = document.createElement("article");
  row.className = `agent-key-row ${key.active ? "is-active" : "is-inactive"}`;
  const scopes = Array.isArray(key.scopes) ? key.scopes : [];
  const scopePreview = scopes.length > 0 ? scopes.slice(0, 8).join(", ") : "broad compatibility";
  row.innerHTML = `
    <div class="agent-key-main">
      <span class="summary-kicker">${key.active ? "Active" : "Inactive"}</span>
      <strong>${escapeHtml(key.name)}</strong>
      <p>Prefix ${escapeHtml(key.keyPrefix || "-")} - ${scopes.length} scope${scopes.length === 1 ? "" : "s"} - last used ${escapeHtml(formatDate(key.lastUsedAt))}</p>
    </div>
    <div class="agent-key-scopes">${escapeHtml(scopePreview)}${scopes.length > 8 ? `, +${scopes.length - 8} more` : ""}</div>
    <div class="row-actions agent-key-actions"></div>
  `;

  const actions = row.querySelector(".agent-key-actions");
  if (key.active) {
    const rotateButton = document.createElement("button");
    rotateButton.type = "button";
    rotateButton.className = "secondary compact";
    rotateButton.textContent = "Rotate";
    rotateButton.setAttribute("aria-label", `Rotate service key ${key.name}`);
    rotateButton.addEventListener("click", () => rotateAgentKey(key));
    const deactivateButton = document.createElement("button");
    deactivateButton.type = "button";
    deactivateButton.className = "secondary compact danger-action";
    deactivateButton.textContent = "Deactivate";
    deactivateButton.setAttribute("aria-label", `Deactivate service key ${key.name}`);
    deactivateButton.addEventListener("click", () => deactivateAgentKey(key));
    actions.append(rotateButton, deactivateButton);
  } else {
    const inactiveNote = document.createElement("span");
    inactiveNote.className = "agent-key-note";
    inactiveNote.textContent = "Inactive - disabled";
    actions.append(inactiveNote);
  }
  return row;
}

async function loadApiKeys() {
  if (!isSignedIn()) {
    state.apiKeys = [];
    renderAgentKeys();
    return;
  }

  const response = await api("/v1/api-keys");
  state.apiKeys = response.data || [];
  renderAgentKeys();
}

async function loadAgentKeyProfiles() {
  if (!isSignedIn()) {
    state.agentKeyProfiles = [];
    setupAgentKeyPresets();
    return;
  }

  try {
    const response = await api("/v1/api-keys/profiles");
    state.agentKeyProfiles = response.data || [];
  } catch (error) {
    state.agentKeyProfiles = [];
    setAgentKeyStatus(`Using local fallback presets. ${friendlyError(error)}`, "error");
  }
  setupAgentKeyPresets();
}

async function createAgentKey({ name, scopes, profileId }) {
  const payload = { name };
  if (profileId) {
    payload.profileId = profileId;
  }
  if (Array.isArray(scopes) && scopes.length > 0) {
    payload.scopes = scopes;
  }

  const response = await api("/v1/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  state.lastRawApiKey = response.data.key;
  await loadApiKeys();
  return response.data;
}

async function deactivateAgentKey(key) {
  const confirmed = window.confirm(`Deactivate "${key.name}"? Existing agents using this key will stop authenticating.`);
  if (!confirmed) {
    return;
  }
  setBusy(true);
  try {
    await api(`/v1/api-keys/${key.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false })
    });
    state.lastRawApiKey = null;
    await loadApiKeys();
    setAgentKeyStatus("Service key deactivated.", "success");
  } catch (error) {
    setAgentKeyStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function rotateAgentKey(key) {
  const confirmed = window.confirm(`Rotate "${key.name}"? CompanyCore will create a replacement key with the same scopes and deactivate the current key.`);
  if (!confirmed) {
    return;
  }
  setBusy(true);
  try {
    const replacementName = `${key.name} replacement`;
    await createAgentKey({
      name: replacementName,
      scopes: Array.isArray(key.scopes) ? key.scopes : []
    });
    await api(`/v1/api-keys/${key.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false })
    });
    await loadApiKeys();
    setAgentKeyStatus("Replacement key created. Copy the raw key before leaving this screen.", "success");
  } catch (error) {
    setAgentKeyStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

function setAgentKeyStatus(message, tone = "") {
  agentKeyStatus.textContent = message;
  agentKeyStatus.classList.toggle("is-error", tone === "error");
  agentKeyStatus.classList.toggle("is-success", tone === "success");
}

function renderApiRouteEmpty(message) {
  const empty = document.createElement("p");
  empty.className = "empty-note";
  empty.textContent = message;
  apiRouteList.append(empty);
}

function apiRouteRows() {
  const routes = state.adapterManifest?.routes || {};
  return Object.entries(routes).flatMap(([group, items]) => (items || []).map((route) => {
    const method = route.method || "GET";
    const path = route.path || "-";
    const capability = route.capability || "";
    return {
      group,
      method,
      path,
      capability,
      searchable: [group, method, path, capability].filter(Boolean).join(" ").toLowerCase()
    };
  }));
}

function syncApiFilters(routes) {
  apiSearch.value = state.apiFilters.search;
  const methods = [...new Set(routes.map((route) => route.method).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const nextMethod = methods.includes(state.apiFilters.method) ? state.apiFilters.method : "";
  apiMethodFilter.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "All methods";
  apiMethodFilter.append(placeholder);
  for (const method of methods) {
    const option = document.createElement("option");
    option.value = method;
    option.textContent = method;
    apiMethodFilter.append(option);
  }
  apiMethodFilter.value = nextMethod;
  state.apiFilters.method = nextMethod;
}

function filteredApiRouteRows(routes) {
  const search = state.apiFilters.search.trim().toLowerCase();
  return routes.filter((route) => (!search || route.searchable.includes(search))
    && (!state.apiFilters.method || route.method === state.apiFilters.method));
}

function setConnected(connection) {
  state.workspace = connection.data.workspace;
  state.user = connection.data.user || state.user;
  state.capabilities = connection.data.capabilities || [];
  state.adapterManifest = connection.data.adapterManifest || null;
  state.mcpManifest = connection.data.mcpManifest || null;
  state.clickup.configured = connection.data.integrations.clickup.configured;
  state.clickup.active = Boolean(connection.data.integrations.clickup.active);
  state.clickup.config = connection.data.integrations.clickup.config || {};
  state.googleDrive.configured = connection.data.integrations.googleDrive.configured;
  state.googleDrive.active = Boolean(connection.data.integrations.googleDrive.active);
  state.googleDrive.oauthClientConfigured = Boolean(connection.data.integrations.googleDrive.oauthClientConfigured);
  state.googleDrive.oauthTokenConfigured = Boolean(connection.data.integrations.googleDrive.oauthTokenConfigured);
  state.googleDrive.config = connection.data.integrations.googleDrive.config || {};
  fields.active.checked = connection.data.integrations.clickup.active ?? !state.clickup.configured;
  fields.importMode.value = state.clickup.config.importMode || "merge";
  fields.googleDriveActive.checked = connection.data.integrations.googleDrive.active ?? !state.googleDrive.configured;
  fields.googleDriveImportMode.value = state.googleDrive.config.importMode || "merge";
  fields.googleDriveFolderIds.value = (state.googleDrive.config.selectedFolderIds || state.googleDrive.config.rootFolderIds || []).join(", ");
  fields.googleDriveRedirectUri.value = `${window.location.origin}/settings/drive`;
  fields.googleDriveClientId.value = "";
  fields.googleDriveClientSecret.value = "";
  syncGoogleDriveCredentialPlaceholders();
  renderGoogleDriveFolderPicker();
  state.clickup.selectedListIds = new Set(state.clickup.config.listIds || []);
  state.operatingModel.areas = connection.data.operatingModel.areas || [];

  if (state.clickup.configured) {
    showResult("ClickUp settings are saved. Open Settings to refresh the saved structure.");
  }

  renderConnectionState();
  renderAgentKeys();
  renderGoogleDriveFiles();
  renderOperatingMap();
  renderDataOperations();
  renderTree();
  setClickUpEnabled(true);
  setGoogleDriveEnabled(true);
}

async function loadConnection() {
  const connection = await api("/v1/connection");
  setConnected(connection);
  const results = await Promise.allSettled([
    loadWorkspaces(),
    loadAreaInventory(),
    loadOperatingModel(),
    loadGoogleDriveFiles(),
    loadRelationshipGraph(),
    loadTasks(),
    loadAgentKeyProfiles(),
    loadApiKeys()
  ]);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    showResult(`${failed.length} startup read${failed.length === 1 ? "" : "s"} could not load. Core owner session is active.`, "error");
  }
}

async function completeGoogleDriveOAuthFromCurrentUrl() {
  if (normalizedPath() !== "/settings/drive") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) {
    reportAction(googleDriveActionStatus, `Google consent failed: ${error}`, "error");
    window.history.replaceState({}, "", "/settings/drive");
    return true;
  }

  const code = params.get("code");
  if (!code) {
    return false;
  }

  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Saving Google Drive OAuth callback...", "pending");
  try {
    const folderIds = parseIdList(fields.googleDriveFolderIds.value);
    await api("/v1/integration-settings/google_drive/oauth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirectUri: `${window.location.origin}/settings/drive`,
        active: fields.googleDriveActive.checked,
        config: {
          selectedFolderIds: folderIds,
          rootFolderIds: folderIds,
          importMode: fields.googleDriveImportMode.value || "merge",
          syncMode: "two_way"
        }
      })
    });
    window.history.replaceState({}, "", "/settings/drive");
    await loadConnection();
    await discoverGoogleDriveFolders();
    reportAction(googleDriveActionStatus, "Google Drive OAuth connection saved. Select folders, save selection, then import.", "success");
    return true;
  } catch (callbackError) {
    reportAction(googleDriveActionStatus, friendlyError(callbackError), "error");
    return false;
  } finally {
    setBusy(false);
  }
}

async function openPostAuthTarget(defaultPath = "/dashboard") {
  const pendingPath = sessionStorage.getItem(pendingPrivatePathKey);
  sessionStorage.removeItem(pendingPrivatePathKey);
  const target = pendingPath && pendingPath.startsWith("/") ? pendingPath : defaultPath;
  navigate(target, { replace: true });
  await completeGoogleDriveOAuthFromCurrentUrl();
}

function renderWorkspaces(workspaces, selectedId = "") {
  state.clickup.workspaces = workspaces;
  workspaceSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = workspaces.length > 0 ? "Choose a ClickUp Workspace" : "No Workspaces found";
  workspaceSelect.append(placeholder);

  for (const workspace of workspaces) {
    const option = document.createElement("option");
    option.value = workspace.id;
    option.textContent = workspace.name;
    workspaceSelect.append(option);
  }

  const nextSelectedId = selectedId || state.clickup.config.teamId || "";
  if (nextSelectedId && workspaces.some((workspace) => workspace.id === nextSelectedId)) {
    workspaceSelect.value = nextSelectedId;
  }

  setClickUpEnabled(isSignedIn());
}

async function discoverClickUp({ includeStructure = false, useStoredToken = false } = {}) {
  const token = fields.token.value.trim();
  const teamId = includeStructure ? workspaceSelect.value : undefined;

  if (!token && !useStoredToken) {
    throw new Error("integration_secret_required");
  }

  const response = await api("/v1/integration-settings/clickup/discover", {
    method: "POST",
    body: JSON.stringify({
      token: token || undefined,
      teamId: teamId || undefined,
      useStoredToken
    })
  });

  renderWorkspaces(response.data.workspaces || [], response.data.selectedWorkspace?.id || teamId || "");

  if (includeStructure) {
    state.clickup.selectedWorkspace = response.data.selectedWorkspace;
    state.clickup.spaces = response.data.spaces || [];
    renderTree();
  }

  return response.data;
}

function allLists() {
  const lists = [];

  for (const space of state.clickup.spaces) {
    for (const list of space.lists || []) {
      lists.push({ ...list, spaceId: space.id, spaceName: space.name, folderId: null, folderName: null });
    }
    for (const folder of space.folders || []) {
      for (const list of folder.lists || []) {
        lists.push({ ...list, spaceId: space.id, spaceName: space.name, folderId: folder.id, folderName: folder.name });
      }
    }
  }

  return lists;
}

function resetListFilters() {
  state.clickup.listFilters.search = "";
  state.clickup.listFilters.selection = "";
  listSearch.value = "";
  listSelectionFilter.value = "";
}

function listMatchesFilters(list) {
  const search = state.clickup.listFilters.search.trim().toLowerCase();
  const selection = state.clickup.listFilters.selection;
  const isSelected = state.clickup.selectedListIds.has(list.id);

  if (selection === "selected" && !isSelected) {
    return false;
  }

  if (selection === "unselected" && isSelected) {
    return false;
  }

  if (!search) {
    return true;
  }

  return [list.name, list.spaceName, list.folderName]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(search));
}

function filteredListCount() {
  return allLists().filter(listMatchesFilters).length;
}

function listWithContext(list, space, folder = null) {
  return {
    ...list,
    spaceId: space.id,
    spaceName: space.name,
    folderId: folder?.id || null,
    folderName: folder?.name || null
  };
}

function renderTree() {
  listTree.innerHTML = "";
  const spaces = state.clickup.spaces;
  const loadedLists = allLists();
  listToolbar.hidden = loadedLists.length === 0;
  listFilterBar.hidden = loadedLists.length === 0;
  listSearch.value = state.clickup.listFilters.search;
  listSelectionFilter.value = state.clickup.listFilters.selection;

  if (spaces.length === 0) {
    listSummary.textContent = state.clickup.configured
      ? "Refresh the saved structure to review ClickUp Lists."
      : "Choose a ClickUp Workspace to load Lists.";
    setClickUpEnabled(isSignedIn());
    return;
  }

  if (loadedLists.length === 0) {
    listSummary.textContent = "This ClickUp Workspace loaded, but no Lists were returned for the token. Check whether the selected Workspace has Spaces/Lists available to this user.";
  }

  let renderedSections = 0;
  for (const space of spaces) {
    const section = document.createElement("section");
    section.className = "tree-section";

    const heading = document.createElement("h4");
    heading.textContent = space.name;
    section.append(heading);

    appendListGroup(section, "Folderless Lists", (space.lists || []).map((list) => listWithContext(list, space)));

    for (const folder of space.folders || []) {
      appendListGroup(section, folder.name, (folder.lists || []).map((list) => listWithContext(list, space, folder)));
    }

    if (section.querySelector(".tree-group")) {
      listTree.append(section);
      renderedSections += 1;
    }
  }

  if (loadedLists.length > 0 && renderedSections === 0) {
    const empty = document.createElement("p");
    empty.className = "tree-empty-note";
    empty.textContent = "No ClickUp Lists match the current filters.";
    listTree.append(empty);
  }

  if (loadedLists.length > 0) {
    updateListSummary();
  }
  setClickUpEnabled(isSignedIn());
}

function appendListGroup(parent, title, lists) {
  const visibleLists = lists.filter(listMatchesFilters);

  if (visibleLists.length === 0) {
    return;
  }

  const group = document.createElement("div");
  group.className = "tree-group";
  const heading = document.createElement("p");
  heading.textContent = title;
  group.append(heading);

  for (const list of visibleLists) {
    const item = document.createElement("label");
    item.className = "check-row";
    item.innerHTML = `
      <input type="checkbox" value="${list.id}">
      <span>${list.name}</span>
    `;
    const checkbox = item.querySelector("input");
    checkbox.checked = state.clickup.selectedListIds.has(list.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.clickup.selectedListIds.add(list.id);
      } else {
        state.clickup.selectedListIds.delete(list.id);
      }
      renderTree();
      setClickUpEnabled(isSignedIn());
    });
    group.append(item);
  }

  parent.append(group);
}

function updateListSummary() {
  const count = state.clickup.selectedListIds.size;
  const loadedCount = allLists().length;
  const visibleCount = filteredListCount();
  listToolbar.hidden = loadedCount === 0;
  listFilterBar.hidden = loadedCount === 0;

  if (loadedCount === 0) {
    listSummary.textContent = "No ClickUp Lists loaded yet.";
    return;
  }

  const listLabel = loadedCount === 1 ? "List" : "Lists";
  const visibility = `${visibleCount} of ${loadedCount} ${listLabel} shown.`;
  listSummary.textContent = count === 0
    ? `${visibility} Select at least one List to sync.`
    : `${visibility} ${count} selected for sync.`;
}

function selectAllLoadedLists() {
  for (const list of allLists()) {
    state.clickup.selectedListIds.add(list.id);
  }
  renderTree();
}

function clearSelectedLists() {
  state.clickup.selectedListIds.clear();
  renderTree();
}

async function loadSelectedWorkspaceLists() {
  if (!workspaceSelect.value) {
    throw new Error("Choose a ClickUp Workspace first.");
  }

  await discoverClickUp({
    includeStructure: true,
    useStoredToken: !fields.token.value.trim()
  });
}

function selectedConfig() {
  const selectedLists = allLists().filter((list) => state.clickup.selectedListIds.has(list.id));
  return {
    teamId: workspaceSelect.value,
    spaceIds: [...new Set(selectedLists.map((list) => list.spaceId))],
    folderIds: [...new Set(selectedLists.map((list) => list.folderId).filter(Boolean))],
    listIds: selectedLists.map((list) => list.id),
    syncMode: "pull",
    importMode: fields.importMode.value || "merge"
  };
}

async function saveSettings({ forceActive = false } = {}) {
  const config = selectedConfig();
  if (!config.teamId || config.listIds.length === 0) {
    throw new Error("Select a ClickUp Workspace and at least one List.");
  }

  if (forceActive) {
    fields.active.checked = true;
  }

  const payload = {
    config,
    active: forceActive ? true : fields.active.checked
  };

  const rawToken = fields.token.value.trim();
  if (rawToken) {
    payload.token = rawToken;
  }

  await api("/v1/integration-settings/clickup", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  fields.token.value = "";
  state.clickup.configured = true;
  state.clickup.active = payload.active;
  state.clickup.config = config;
}

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      return;
    }
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) {
      return;
    }
    event.preventDefault();
    navigate(url.pathname, { hash: url.hash });
  });
});

window.addEventListener("popstate", renderRoute);

if (mobileMenuButton) {
  mobileMenuButton.addEventListener("click", () => {
    state.mobileMenuOpen = !state.mobileMenuOpen;
    updateChrome();
  });
}

if (mobileSidebarBackdrop) {
  mobileSidebarBackdrop.addEventListener("click", () => {
    state.mobileMenuOpen = false;
    updateChrome();
    mobileMenuButton?.focus();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (state.mobileMenuOpen) {
    event.preventDefault();
    state.mobileMenuOpen = false;
    updateChrome();
    mobileMenuButton?.focus();
    return;
  }

  if (workspaceCreateForm && !workspaceCreateForm.hidden) {
    event.preventDefault();
    workspaceCreateForm.hidden = true;
    workspaceCreateName.value = "";
    setLocalStatus(workspaceSwitchStatus);
    workspaceCreateToggle?.focus();
  }
});

if (workspaceCreateToggle && workspaceCreateForm && workspaceCreateName) {
  workspaceCreateToggle.addEventListener("click", () => {
    workspaceCreateForm.hidden = !workspaceCreateForm.hidden;
    if (!workspaceCreateForm.hidden) {
      workspaceCreateName.focus();
    }
  });
}

if (workspaceCreateCancel && workspaceCreateForm && workspaceCreateName) {
  workspaceCreateCancel.addEventListener("click", () => {
    workspaceCreateForm.hidden = true;
    workspaceCreateName.value = "";
    setLocalStatus(workspaceSwitchStatus);
  });
}

if (workspaceSwitcher) {
  workspaceSwitcher.addEventListener("change", async () => {
    const workspaceId = workspaceSwitcher.value;
    if (!workspaceId || workspaceId === state.workspace?.id) {
      return;
    }

    setBusy(true);
    setLocalStatus(workspaceSwitchStatus, "Switching workspace...", "pending");
    try {
      const response = await api(`/v1/workspaces/${workspaceId}/actions/select`, {
        method: "POST"
      });
      await activateWorkspaceFromPayload(response);
      reportAction(workspaceSwitchStatus, "Workspace switched.", "success");
    } catch (error) {
      renderWorkspaceSwitcher();
      reportAction(workspaceSwitchStatus, friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  });
}

if (workspaceCreateForm && workspaceCreateName) {
  workspaceCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = workspaceCreateName.value.trim();
    if (!name) {
      reportAction(workspaceSwitchStatus, "Name the workspace before creating it.", "error");
      return;
    }

    setBusy(true);
    setLocalStatus(workspaceSwitchStatus, "Creating workspace...", "pending");
    try {
      const response = await api("/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      workspaceCreateName.value = "";
      workspaceCreateForm.hidden = true;
      await activateWorkspaceFromPayload(response);
      reportAction(workspaceSwitchStatus, "Workspace created and selected.", "success");
    } catch (error) {
      reportAction(workspaceSwitchStatus, friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  });
}

function bindDriveFileActions() {
  document.querySelectorAll("[data-drive-preview]").forEach((button) => {
    if (button.dataset.previewBound === "true") {
      return;
    }
    button.dataset.previewBound = "true";
    button.addEventListener("click", async (event) => {
      await previewGoogleDriveFile(event.currentTarget.dataset.drivePreview);
    });
  });

  document.querySelectorAll("[data-drive-description]").forEach((button) => {
    if (button.dataset.descriptionBound === "true") {
      return;
    }
    button.dataset.descriptionBound = "true";
    button.addEventListener("click", async (event) => {
      await editGoogleDriveFileDescription(event.currentTarget.dataset.driveDescription);
    });
  });
}

if (createAreaButton) {
  createAreaButton.addEventListener("click", createOperatingArea);
}

moduleSearch.addEventListener("focus", () => {
  renderModuleSwitcher({ open: true });
});

moduleSearch.addEventListener("input", () => {
  renderModuleSwitcher({ open: true });
});

relationshipSearch.addEventListener("input", () => {
  state.relationshipFilters.search = relationshipSearch.value;
  renderRelationshipCenter();
});

relationshipSourceFilter.addEventListener("change", () => {
  state.relationshipFilters.source = relationshipSourceFilter.value;
  renderRelationshipCenter();
});

moduleSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    openFirstModuleResult();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeModuleSwitcher();
    moduleSearch.blur();
  }
});

document.addEventListener("click", (event) => {
  if (!moduleSwitcher.contains(event.target)) {
    closeModuleSwitcher();
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("companycoreOwnerToken");
  state.ownerToken = "";
  state.workspace = null;
  state.workspaces = [];
  state.user = null;
  state.capabilities = [];
  state.adapterManifest = null;
  state.mcpManifest = null;
  state.apiKeys = [];
  state.agentKeyProfiles = [];
  state.lastRawApiKey = null;
  state.clickup.configured = false;
  state.clickup.active = false;
  state.clickup.config = {};
  state.clickup.workspaces = [];
  state.clickup.spaces = [];
  state.clickup.selectedListIds = new Set();
  resetListFilters();
  state.googleDrive.configured = false;
  state.googleDrive.active = false;
  state.googleDrive.oauthClientConfigured = false;
  state.googleDrive.oauthTokenConfigured = false;
  state.googleDrive.config = {};
  state.googleDrive.files = [];
  state.operatingModel = {
    areas: [],
    externalMappings: [],
    externalFields: [],
    storageLocations: [],
    knowledgeRoots: [],
    automationDefinitions: []
  };
  state.areaInventory = [];
  state.relationshipGraph = {
    status: "signed-out",
    nodes: [],
    edges: [],
    reviewItems: [],
    unsupportedFamilies: [],
    summary: null
  };
  state.databaseTables = new Map();
  state.selectedAreaKey = "";
  state.areaFilters.search = "";
  state.areaFilters.type = "";
  state.tasks = [];
  state.pipelineFilters.search = "";
  state.pipelineFilters.type = "";
  state.pipelineFilters.status = "";
  state.integrationFilters.search = "";
  state.integrationFilters.type = "";
  state.relationshipFilters.search = "";
  state.relationshipFilters.source = "";
  state.driveFilters.search = "";
  state.driveFilters.kind = "";
  state.driveFilters.area = "";
  state.driveFilters.scan = "";
  state.apiFilters.search = "";
  state.apiFilters.method = "";
  state.tableWorkbench.search = "";
  state.tableWorkbench.source = "";
  state.tableWorkbench.selectedId = "";
  state.tableWorkbench.newDraft = false;
  setupAgentKeyPresets();
  renderAgentKeys();
  renderTasks();
  renderGoogleDriveFiles();
  renderWorkspaceSwitcher();
  renderSidebarAreaList();
  renderOperatingMap();
  renderPipeline();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
  resultPanel.hidden = true;
  navigate("/auth/login", { replace: true });
});

refreshTasksButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await loadTasks();
    showResult("Tasks refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

taskSearch.addEventListener("input", () => {
  state.taskFilters.search = taskSearch.value;
  renderTasks();
});

taskStatusFilter.addEventListener("change", () => {
  state.taskFilters.status = taskStatusFilter.value;
  renderTasks();
});

taskSourceFilter.addEventListener("change", () => {
  state.taskFilters.source = taskSourceFilter.value;
  renderTasks();
});

taskListFilter.addEventListener("change", () => {
  state.taskFilters.list = taskListFilter.value;
  renderTasks();
});

pipelineSearch.addEventListener("input", () => {
  state.pipelineFilters.search = pipelineSearch.value;
  renderPipeline();
});

pipelineTypeFilter.addEventListener("change", () => {
  state.pipelineFilters.type = pipelineTypeFilter.value;
  renderPipeline();
});

pipelineStatusFilter.addEventListener("change", () => {
  state.pipelineFilters.status = pipelineStatusFilter.value;
  renderPipeline();
});

areaSearch.addEventListener("input", () => {
  state.areaFilters.search = areaSearch.value;
  renderOperatingMap();
});

areaTypeFilter.addEventListener("change", () => {
  state.areaFilters.type = areaTypeFilter.value;
  renderOperatingMap();
});

integrationSearch.addEventListener("input", () => {
  state.integrationFilters.search = integrationSearch.value;
  renderIntegrationTaxonomy();
});

integrationTypeFilter.addEventListener("change", () => {
  state.integrationFilters.type = integrationTypeFilter.value;
  renderIntegrationTaxonomy();
});

driveSearch.addEventListener("input", () => {
  state.driveFilters.search = driveSearch.value;
  renderGoogleDriveFiles();
});

driveKindFilter.addEventListener("change", () => {
  state.driveFilters.kind = driveKindFilter.value;
  renderGoogleDriveFiles();
});

driveAreaFilter.addEventListener("change", () => {
  state.driveFilters.area = driveAreaFilter.value;
  renderGoogleDriveFiles();
});

driveScanFilter.addEventListener("change", () => {
  state.driveFilters.scan = driveScanFilter.value;
  renderGoogleDriveFiles();
});

apiSearch.addEventListener("input", () => {
  state.apiFilters.search = apiSearch.value;
  renderApiWorkbench();
});

apiMethodFilter.addEventListener("change", () => {
  state.apiFilters.method = apiMethodFilter.value;
  renderApiWorkbench();
});

agentKeyPreset.addEventListener("change", () => {
  applyAgentKeyPreset(agentKeyPreset.value);
});

agentKeyScopes.addEventListener("input", () => {
  renderAgentKeyPreview();
});

agentKeyResetButton.addEventListener("click", () => {
  agentKeyName.value = "";
  applyAgentKeyPreset(agentKeyPreset.value);
});

refreshAgentKeysButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    state.lastRawApiKey = null;
    await loadAgentKeyProfiles();
    await loadApiKeys();
    setAgentKeyStatus("Service keys refreshed.");
  } catch (error) {
    setAgentKeyStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

agentKeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = agentKeyName.value.trim();
  const scopes = parseScopesInput(agentKeyScopes.value);
  if (!name) {
    setAgentKeyStatus("Name the service key before creating it.", "error");
    return;
  }
  if (scopes.length === 0) {
    setAgentKeyStatus("Choose at least one scope for a least-privilege key.", "error");
    return;
  }

  setBusy(true);
  try {
    const preset = currentAgentKeyPresets().find((item) => item.id === agentKeyPreset.value);
    const profileId = selectedAgentKeyProfileId();
    const useProfileScopes = profileId && scopesMatch(scopes, preset?.scopes || []);
    await createAgentKey({
      name,
      profileId: useProfileScopes ? profileId : undefined,
      scopes: useProfileScopes ? undefined : scopes
    });
    agentKeyName.value = "";
    applyAgentKeyPreset(agentKeyPreset.value);
    setAgentKeyStatus("Scoped service key created. Copy the raw key before leaving this screen.", "success");
  } catch (error) {
    setAgentKeyStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

agentKeyCopyButton.addEventListener("click", async () => {
  if (!state.lastRawApiKey) {
    return;
  }
  try {
    await navigator.clipboard.writeText(state.lastRawApiKey);
    setAgentKeyStatus("Raw key copied.", "success");
  } catch {
    setAgentKeyStatus("Copy failed. Select the raw key text manually before hiding it.", "error");
  }
});

agentKeyDismissButton.addEventListener("click", () => {
  state.lastRawApiKey = null;
  renderAgentKeys();
  setAgentKeyStatus("Raw key hidden. It cannot be shown again.", "success");
});

dataSearch.addEventListener("input", () => {
  state.dataFilters.search = dataSearch.value;
  renderDataOperations();
});

dataGroupFilter.addEventListener("change", () => {
  state.dataFilters.group = dataGroupFilter.value;
  renderDataOperations();
});

tableRecordSearch.addEventListener("input", () => {
  state.tableWorkbench.search = tableRecordSearch.value;
  renderTableWorkbench();
});

tableRecordSourceFilter.addEventListener("change", () => {
  state.tableWorkbench.source = tableRecordSourceFilter.value;
  renderTableWorkbench();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  setLocalStatus(loginStatus, "Checking owner access...", "pending");

  try {
    const response = await authRequest("/auth/login", {
      email: fields.email.value,
      password: fields.password.value
    });

    applyAuthPayload(response);
    await loadConnection();
    reportAction(loginStatus, "Signed in. Opening dashboard.", "success");
    await openPostAuthTarget("/dashboard");
  } catch (error) {
    reportAction(loginStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  setLocalStatus(registerStatus, "Creating owner workspace...", "pending");

  try {
    const response = await authRequest("/auth/register", {
      email: fields.registerEmail.value,
      password: fields.registerPassword.value,
      name: fields.registerName.value || undefined,
      workspaceName: fields.workspaceName.value
    });

    applyAuthPayload(response);
    await loadConnection();
    reportAction(registerStatus, "Workspace created. Opening dashboard.", "success");
    await openPostAuthTarget("/dashboard");
  } catch (error) {
    reportAction(registerStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

checkTokenButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(clickupActionStatus, "Checking ClickUp token...", "pending");
  try {
    await discoverClickUp();
    reportAction(clickupActionStatus, "Token checked. Choose the ClickUp Workspace to connect.");
  } catch (error) {
    reportAction(clickupActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

loadListsButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(clickupActionStatus, "Loading ClickUp Lists for the selected Workspace...", "pending");
  try {
    await loadSelectedWorkspaceLists();
    const count = allLists().length;
    reportAction(clickupActionStatus, count > 0
      ? `Workspace loaded. ${count} ClickUp List${count === 1 ? "" : "s"} available.`
      : "Workspace loaded, but ClickUp returned no Lists for this token.", count > 0 ? "success" : "error");
  } catch (error) {
    reportAction(clickupActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

selectAllListsButton.addEventListener("click", () => {
  selectAllLoadedLists();
});

clearListsButton.addEventListener("click", () => {
  clearSelectedLists();
});

listSearch.addEventListener("input", () => {
  state.clickup.listFilters.search = listSearch.value;
  renderTree();
});

listSelectionFilter.addEventListener("change", () => {
  state.clickup.listFilters.selection = listSelectionFilter.value;
  renderTree();
});

fields.active.addEventListener("change", () => {
  setClickUpEnabled(isSignedIn());
});

refreshButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(clickupActionStatus, "Checking saved ClickUp token...", "pending");
  try {
    await discoverClickUp({ useStoredToken: true });
    reportAction(clickupActionStatus, "Saved ClickUp token checked. Choose a Workspace to refresh Lists.");
  } catch (error) {
    reportAction(clickupActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

workspaceSelect.addEventListener("change", async () => {
  if (!workspaceSelect.value) {
    state.clickup.spaces = [];
    state.clickup.selectedListIds = new Set();
    resetListFilters();
    renderTree();
    return;
  }

  state.clickup.spaces = [];
  state.clickup.selectedListIds = new Set();
  resetListFilters();
  renderTree();
  reportAction(clickupActionStatus, "Workspace selected. Click Load Lists to fetch ClickUp Lists.");
});

saveButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(clickupActionStatus, "Saving ClickUp connection...", "pending");
  try {
    await saveSettings();
    await loadConnection();
    reportAction(clickupActionStatus, "ClickUp connection saved.");
  } catch (error) {
    reportAction(clickupActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

syncButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(clickupActionStatus, "Saving ClickUp connection and starting sync...", "pending");

  try {
    await saveSettings({ forceActive: true });
    const sync = await api("/v1/tasks/sync/clickup/native", {
      method: "POST",
      body: JSON.stringify({
        importMode: fields.importMode.value || "merge"
      })
    });
    await loadConnection();
    await loadTasks();
    reportAction(clickupActionStatus, "ClickUp connection saved and sync completed.", "success", sync.data);
  } catch (error) {
    reportAction(clickupActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

fields.googleDriveActive.addEventListener("change", () => {
  setGoogleDriveEnabled(isSignedIn());
});

googleDriveSaveClientButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Saving Google Drive OAuth client...", "pending");
  try {
    await saveGoogleDriveOAuthClient();
    reportAction(googleDriveActionStatus, "Google Drive OAuth client saved. Create the OAuth URL next.");
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveAuthUrlButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Creating Google consent URL...", "pending");
  try {
    const response = await api("/v1/integration-settings/google_drive/oauth/authorize-url", {
      method: "POST",
      body: JSON.stringify({
        redirectUri: fields.googleDriveRedirectUri.value,
        state: state.workspace?.id || "companycore"
      })
    });
    googleDriveAuthLink.href = response.data.authorizationUrl;
    googleDriveAuthLink.hidden = false;
    reportAction(googleDriveActionStatus, "Google Drive OAuth URL created. Open Google consent, then paste the authorization code here.");
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveExchangeButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Saving Google Drive OAuth connection...", "pending");
  try {
    const code = fields.googleDriveCode.value.trim();
    if (!code) {
      throw new Error("Paste the Google authorization code first.");
    }
    const folderIds = parseIdList(fields.googleDriveFolderIds.value);
    await api("/v1/integration-settings/google_drive/oauth/exchange", {
      method: "POST",
      body: JSON.stringify({
        code,
        redirectUri: fields.googleDriveRedirectUri.value,
        active: fields.googleDriveActive.checked,
        config: {
          selectedFolderIds: folderIds,
          rootFolderIds: folderIds,
          importMode: fields.googleDriveImportMode.value || "merge",
          syncMode: "two_way"
        }
      })
    });
    fields.googleDriveCode.value = "";
    await loadConnection();
    await discoverGoogleDriveFolders();
    reportAction(googleDriveActionStatus, "Google Drive OAuth connection saved. Select folders, save selection, then import.");
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveDiscoverFoldersButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Loading Google Drive folders...", "pending");
  try {
    const folders = await discoverGoogleDriveFolders();
    reportAction(googleDriveActionStatus, `${folders.length} Google Drive folder${folders.length === 1 ? "" : "s"} loaded. Select folders to import.`);
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveSaveFoldersButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Saving selected Google Drive folders...", "pending");
  try {
    const folderIds = await saveGoogleDriveFolderSelection();
    reportAction(googleDriveActionStatus, `${folderIds.length} Drive folder${folderIds.length === 1 ? "" : "s"} saved for import.`);
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveImportButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Importing selected Google Drive folders...", "pending");
  try {
    const selectedFolderIds = selectedGoogleDriveFolderIds();
    const folderIds = selectedFolderIds.length > 0 ? selectedFolderIds : parseIdList(fields.googleDriveFolderIds.value);
    const result = await api("/v1/integration-settings/google_drive/import", {
      method: "POST",
      body: JSON.stringify({
        folderIds: folderIds.length > 0 ? folderIds : undefined,
        importMode: fields.googleDriveImportMode.value || "merge"
      })
    });
    await loadConnection();
    reportAction(googleDriveActionStatus, "Google Drive import finished.", "success", result.data);
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveReconcileButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Reconciling Google Drive changes...", "pending");
  try {
    const result = await api("/v1/integration-settings/google_drive/changes/reconcile", {
      method: "POST",
      body: JSON.stringify({})
    });
    await loadConnection();
    reportAction(googleDriveActionStatus, "Google Drive changes reconciled.", "success", result.data);
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshDriveFilesButton.addEventListener("click", async () => {
  setBusy(true);
  setLocalStatus(googleDriveActionStatus, "Refreshing imported Google Drive files...", "pending");
  try {
    await loadGoogleDriveFiles();
    reportAction(googleDriveActionStatus, "Google Drive files refreshed.");
  } catch (error) {
    reportAction(googleDriveActionStatus, friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

setupAgentKeyPresets();
renderRoute();

if (state.ownerToken) {
  loadConnection().then(() => {
    renderRoute();
    return completeGoogleDriveOAuthFromCurrentUrl();
  }).catch((error) => {
    if (isAuthSessionError(error)) {
      sessionStorage.removeItem("companycoreOwnerToken");
      state.ownerToken = "";
      state.agentKeyProfiles = [];
      setupAgentKeyPresets();
      setClickUpEnabled(false);
      setGoogleDriveEnabled(false);
      showResult("Sign in again to refresh your workspace session.", "error");
    } else {
      showResult("Workspace data could not refresh. The current screen stayed available; try refreshing in a moment.", "error");
    }
    renderRoute();
  });
} else {
  setClickUpEnabled(false);
  setGoogleDriveEnabled(false);
  renderWorkspaceSwitcher();
  renderSidebarAreaList();
  renderOperatingMap();
  renderGoogleDriveFiles();
  renderPipeline();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
}
