const privateRoutes = new Set(["/dashboard", "/data", "/areas", "/relationships", "/tasks-adapter", "/pipeline", "/settings", "/settings/account", "/settings/integrations", "/settings/drive", "/settings/api"]);
const publicRoutes = new Set(["/", "/auth/login", "/auth/register"]);

const state = {
  ownerToken: sessionStorage.getItem("companycoreOwnerToken") || "",
  workspace: null,
  user: null,
  capabilities: [],
  adapterManifest: null,
  apiKeys: [],
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
    files: []
  },
  operatingModel: {
    areas: [],
    externalMappings: [],
    externalFields: [],
    storageLocations: [],
    knowledgeRoots: [],
    automationDefinitions: []
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
    newDraft: false
  },
  relationshipFilters: {
    search: "",
    source: ""
  }
};

const agentKeyPresets = [
  {
    id: "read_only",
    label: "Read-only agent",
    description: "Discovery plus read access for core records and Drive metadata.",
    scopes: [
      "connection:read",
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
      "google-drive:read",
      "agent-events:read"
    ]
  },
  {
    id: "memory_writer",
    label: "Memory writer",
    description: "Read company context and write notes, decisions, and agent logs.",
    scopes: [
      "connection:read",
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
    label: "Event consumer",
    description: "Minimal event inbox client that can read and acknowledge assigned work.",
    scopes: [
      "connection:read",
      "agent-events:read",
      "agent-events:ack",
      "agent-logs:write"
    ]
  },
  {
    id: "operator",
    label: "Operator",
    description: "Broad operational agent for controlled create/update workflows.",
    scopes: [
      "connection:read",
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
      "google-drive:read",
      "google-drive:write",
      "agent-logs:write",
      "agent-events:read",
      "agent-events:ack"
    ]
  }
];

const COMPANY_AREAS = [
  { number: "00", label: "Główny", key: "main-general", description: "Default home for unclassified imported lists, folders, records, and shared company context." },
  { number: "01", label: "Strategia", key: "strategy-governance", description: "Goals, targets, decisions, and the strategic source of truth." },
  { number: "02", label: "Produkt", key: "projects-delivery", description: "Projects, delivery containers, product work, and shipped outcomes." },
  { number: "03", label: "Sprzedaż", key: "sales-crm", description: "Clients, pipeline stages, deals, and sales interactions." },
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
const logoutButton = document.querySelector("#logoutButton");
const mobileMenuButton = document.querySelector("#mobileMenuButton");
const clickupPanel = document.querySelector("#clickupPanel");
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
const clickupWorkspaceLabel = document.querySelector("#clickupWorkspaceLabel");
const workspaceNameLabel = document.querySelector("#workspaceNameLabel");
const clickupStatusLabel = document.querySelector("#clickupStatusLabel");
const clickupStatusHint = document.querySelector("#clickupStatusHint");
const googleDriveStatusLabel = document.querySelector("#googleDriveStatusLabel");
const googleDriveStatusHint = document.querySelector("#googleDriveStatusHint");
const capabilitySummary = document.querySelector("#capabilitySummary");
const capabilityList = document.querySelector("#capabilityList");
const agentKeySummary = document.querySelector("#agentKeySummary");
const agentKeyForm = document.querySelector("#agentKeyForm");
const agentKeyName = document.querySelector("#agentKeyName");
const agentKeyPreset = document.querySelector("#agentKeyPreset");
const agentKeyScopes = document.querySelector("#agentKeyScopes");
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
const accountOwnerName = document.querySelector("#accountOwnerName");
const accountOwnerEmail = document.querySelector("#accountOwnerEmail");
const accountWorkspaceName = document.querySelector("#accountWorkspaceName");
const accountWorkspaceId = document.querySelector("#accountWorkspaceId");
const accountReadiness = document.querySelector("#accountReadiness");
const pipelineSummary = document.querySelector("#pipelineSummary");
const pipelineStats = document.querySelector("#pipelineStats");
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
const resultMessage = document.querySelector("#resultMessage");
const metrics = document.querySelector("#metrics");
const taskStats = document.querySelector("#taskStats");
const tasksSummary = document.querySelector("#tasksSummary");
const tasksTableBody = document.querySelector("#tasksTableBody");
const dataOperationsSummary = document.querySelector("#dataOperationsSummary");
const dataOperationsStats = document.querySelector("#dataOperationsStats");
const dataSearch = document.querySelector("#dataSearch");
const dataGroupFilter = document.querySelector("#dataGroupFilter");
const dataModuleList = document.querySelector("#dataModuleList");
const tableWorkbenchLabel = document.querySelector("#tableWorkbenchLabel");
const tableWorkbenchTitle = document.querySelector("#tableWorkbenchTitle");
const tableWorkbenchSummary = document.querySelector("#tableWorkbenchSummary");
const tableWorkbenchStats = document.querySelector("#tableWorkbenchStats");
const tableWorkbenchApiLink = document.querySelector("#tableWorkbenchApiLink");
const tableRecordsTitle = document.querySelector("#tableRecordsTitle");
const tableRecordsSummary = document.querySelector("#tableRecordsSummary");
const tableRecordSearch = document.querySelector("#tableRecordSearch");
const tableRecordSourceFilter = document.querySelector("#tableRecordSourceFilter");
const tableRecordList = document.querySelector("#tableRecordList");
const recordInspector = document.querySelector("#recordInspector");
const integrationSummary = document.querySelector("#integrationSummary");
const integrationGroups = document.querySelector("#integrationGroups");
const integrationMatrixSummary = document.querySelector("#integrationMatrixSummary");
const integrationSearch = document.querySelector("#integrationSearch");
const integrationTypeFilter = document.querySelector("#integrationTypeFilter");
const integrationAreaMatrix = document.querySelector("#integrationAreaMatrix");
const googleDrivePanel = document.querySelector("#googleDrivePanel");
const googleDriveWorkspaceLabel = document.querySelector("#googleDriveWorkspaceLabel");
const googleDriveClientStatus = document.querySelector("#googleDriveClientStatus");
const googleDriveAuthUrlButton = document.querySelector("#googleDriveAuthUrlButton");
const googleDriveAuthLink = document.querySelector("#googleDriveAuthLink");
const googleDriveSaveClientButton = document.querySelector("#googleDriveSaveClientButton");
const googleDriveExchangeButton = document.querySelector("#googleDriveExchangeButton");
const googleDriveImportButton = document.querySelector("#googleDriveImportButton");
const googleDriveReconcileButton = document.querySelector("#googleDriveReconcileButton");
const refreshDriveFilesButton = document.querySelector("#refreshDriveFilesButton");
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
  "/dashboard": "Dashboard",
  "/data": "Data",
  "/areas": "Operating areas",
  "/relationships": "Relationships",
  "/tasks-adapter": "Tasks & adapters",
  "/pipeline": "Pipeline",
  "/settings/account": "Account",
  "/settings/integrations": "Integrations",
  "/settings": "ClickUp adapter",
  "/settings/drive": "Google Drive",
  "/settings/api": "API settings"
};

const moduleRoutes = [
  { path: "/dashboard", label: "Dashboard", group: "Command center", keywords: "home overview summary next action attention" },
  { path: "/data", label: "Data", group: "Database operations", keywords: "database records tables crud modules workbench" },
  { path: "/areas", label: "Operating areas", group: "Operating model", keywords: "departments areas tables records mapping workspace" },
  { path: "/relationships", label: "Relationships", group: "Operating model", keywords: "review queue provider drive unmapped correction relations" },
  { path: "/tasks-adapter", label: "Tasks & adapters", group: "Adapters", keywords: "tasks clickup lists priority status due sync" },
  { path: "/pipeline", label: "Pipeline", group: "CRM", keywords: "clients deals stages interactions sales crm" },
  { path: "/settings/account", label: "Account", group: "Settings", keywords: "owner workspace readiness login account" },
  { path: "/settings/integrations", label: "Integrations", group: "Settings", keywords: "data map modules sources tables drive clickup api" },
  { path: "/settings", label: "ClickUp adapter", group: "Settings", keywords: "clickup token workspace lists sync import" },
  { path: "/settings/drive", label: "Google Drive", group: "Settings", keywords: "drive folders files oauth import reconcile scan" },
  { path: "/settings/api", label: "API settings", group: "Settings", keywords: "api routes manifest agents service keys capabilities" }
];

const dataModuleCatalog = [
  { slug: "projects", label: "Projects", group: "Strategy and delivery", href: "/data/projects", description: "Project containers for delivery work and roadmap context." },
  { slug: "goals", label: "Goals", group: "Strategy and delivery", href: "/data/goals", description: "Goal records connected to strategy, projects, and targets." },
  { slug: "targets", label: "Targets", group: "Strategy and delivery", href: "/data/targets", description: "Measurable target records for strategic follow-through." },
  { slug: "task-lists", label: "Task Lists", group: "Execution", href: "/data/task-lists", description: "Execution containers, including ClickUp-sourced Lists." },
  { slug: "tasks", label: "Tasks", group: "Execution", href: "/data/tasks", description: "CompanyCore and ClickUp task records with status and priority." },
  { slug: "clients", label: "Clients", group: "CRM", href: "/data/clients", description: "Client records for sales, delivery, and relationship context." },
  { slug: "pipeline-stages", label: "Pipeline Stages", group: "CRM", href: "/data/pipeline-stages", description: "Pipeline stage records used to organize sales flow." },
  { slug: "deals", label: "Deals", group: "CRM", href: "/data/deals", description: "Deal records with status, value, source, and client context." },
  { slug: "interactions", label: "Interactions", group: "CRM", href: "/data/interactions", description: "Sales or client timeline interactions." },
  { slug: "notes", label: "Notes", group: "Knowledge", href: "/data/notes", description: "Operational notes linked to projects, tasks, clients, or deals." },
  { slug: "decisions", label: "Decisions", group: "Knowledge", href: "/data/decisions", description: "Durable decision records with rationale and outcome." },
  { slug: "agents", label: "Agents", group: "AI operations", href: "/data/agents", description: "Agent identities for Jarvis, Paperclip, Aviary, and future clients." },
  { slug: "agent-logs", label: "Agent Logs", group: "AI operations", href: "/data/agent-logs", description: "Agent log records for observability and training smoke." }
];

function normalizedPath(pathname = window.location.pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
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
      return `${recordCountForSlugs(["clients", "pipeline-stages", "deals", "interactions"])} CRM records`;
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
    for (const row of rows) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-result";
      button.dataset.path = row.path;
      button.setAttribute("role", "option");

      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = row.label;
      const meta = document.createElement("small");
      meta.textContent = `${row.group} - ${row.metric}`;
      copy.append(title, meta);

      const route = document.createElement("kbd");
      route.textContent = row.path;
      button.append(copy, route);
      button.addEventListener("click", () => {
        moduleSearch.value = "";
        closeModuleSwitcher();
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
  navigate(first.path);
}

function updateChrome() {
  const signedIn = isSignedIn();
  document.body.classList.toggle("is-signed-in", signedIn);
  document.body.classList.toggle("mobile-nav-open", state.mobileMenuOpen && signedIn);
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
}

function navigate(path, { replace = false, hash = "" } = {}) {
  const nextPath = normalizedPath(path);
  const nextUrl = `${nextPath}${hash}`;
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

function renderRoute() {
  updateChrome();

  let path = normalizedPath();
  const dataWorkbench = isDataWorkbenchPath(path);
  if (!publicRoutes.has(path) && !privateRoutes.has(path) && !dataWorkbench) {
    path = isSignedIn() ? "/dashboard" : "/";
    window.history.replaceState({}, "", path);
  }

  if ((privateRoutes.has(path) || dataWorkbench) && !isSignedIn()) {
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
    workspaceEyebrow.textContent = state.workspace
      ? `${state.workspace.name} workspace`
      : "Private workspace";
  }
  document.body.dataset.route = path;
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
  const tasks = state.tasks;
  syncTaskFilters();
  const clickUpCount = tasks.filter((task) => task.source === "clickup").length;
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
  const pipelineRecords = recordCountForSlugs(["clients", "pipeline-stages", "deals", "interactions"]);

  return {
    openTasks,
    dueSoonTasks,
    unmappedProviderMappings,
    unassignedDriveFolders,
    pipelineRecords
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
  modulePipelineMeta.textContent = `${signals.pipelineRecords} CRM/pipeline records across clients, stages, deals, and interactions.`;
  moduleDriveMeta.textContent = state.googleDrive.configured
    ? `${driveItems} Drive items imported, ${signals.unassignedDriveFolders.length} folders need area review.`
    : "Google Drive is not connected yet.";
  moduleClickUpMeta.textContent = state.clickup.configured
    ? `${clickUpLists} selected ClickUp List${clickUpLists === 1 ? "" : "s"}, ${state.clickup.active ? "active" : "inactive"} connection.`
    : "ClickUp is not connected yet.";
  moduleIntegrationsMeta.textContent = `${implementedGroups} implemented groups: tasks, files, pipeline, API.`;

  const items = dashboardAttentionItems(signals);
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
    for (const item of items) {
      attentionList.append(attentionItemElement(item));
    }
  }

  renderOperationalCockpit(signals, items, { areas, tables, mappings, pipelineRecords: signals.pipelineRecords });
  nextActionText.textContent = nextActionCopy(items, signals);
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
      href: "/settings/integrations",
      status: state.clickup.configured && state.googleDrive.oauthTokenConfigured ? "good" : state.clickup.configured || state.googleDrive.oauthClientConfigured ? "warn" : "blocked"
    },
    {
      label: "Relationships",
      title: reviewCount === 0 ? "Mapped" : `${reviewCount} to review`,
      detail: reviewCount === 0 ? "Provider and Drive relationships look assigned." : "Provider mappings or Drive folders still need an operating area.",
      href: "/relationships",
      status: reviewCount === 0 ? "good" : "warn"
    },
    {
      label: "Execution",
      title: `${signals.openTasks.length} open`,
      detail: signals.dueSoonTasks.length > 0
        ? `${signals.dueSoonTasks.length} due within seven days.`
        : "No urgent due-date pressure detected.",
      href: "/tasks-adapter",
      status: signals.dueSoonTasks.length > 0 ? "warn" : "good"
    },
    {
      label: "Data model",
      title: `${counts.areas} areas`,
      detail: `${counts.tables} tables, ${counts.mappings} provider mappings, ${counts.pipelineRecords} pipeline records.`,
      href: "/areas",
      status: counts.areas > 0 && counts.tables > 0 ? "good" : "warn"
    }
  ];

  for (const step of steps) {
    operationalSteps.append(operationalStepElement(step));
  }
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
  const connected = [
    state.clickup.configured,
    state.googleDrive.oauthTokenConfigured
  ].filter(Boolean).length;
  return `${connected}/2 connected`;
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

function operationalStepElement(step) {
  const link = document.createElement("a");
  link.className = `operational-step is-${step.status}`;
  link.href = step.href;
  link.dataset.link = "";
  link.innerHTML = `
    <span>${escapeHtml(step.label)}</span>
    <strong>${escapeHtml(step.title)}</strong>
    <small>${escapeHtml(step.detail)}</small>
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
      href: "/settings",
      action: "Open ClickUp"
    });
  }

  if (!state.googleDrive.configured) {
    items.push({
      title: "Connect Google Drive",
      detail: "Drive folders and files can be mapped to company areas after OAuth and import.",
      href: "/settings/drive",
      action: "Open Drive"
    });
  }

  if (signals.unmappedProviderMappings.length > 0) {
    items.push({
      title: "Review provider mappings",
      detail: `${signals.unmappedProviderMappings.length} provider mapping${signals.unmappedProviderMappings.length === 1 ? "" : "s"} still need an operating area.`,
      href: "/relationships",
      action: "Correct areas"
    });
  }

  if (signals.unassignedDriveFolders.length > 0) {
    items.push({
      title: "Assign Drive folders",
      detail: `${signals.unassignedDriveFolders.length} Drive folder${signals.unassignedDriveFolders.length === 1 ? "" : "s"} can be assigned to the right company area.`,
      href: "/relationships",
      action: "Review folders"
    });
  }

  if (signals.dueSoonTasks.length > 0) {
    items.push({
      title: "Check due tasks",
      detail: `${signals.dueSoonTasks.length} open task${signals.dueSoonTasks.length === 1 ? "" : "s"} are due within seven days.`,
      href: "/tasks-adapter",
      action: "Open tasks"
    });
  }

  if (signals.pipelineRecords === 0) {
    items.push({
      title: "Review pipeline data",
      detail: "Clients, stages, deals, and interactions are implemented, but no pipeline records are loaded yet.",
      href: "/pipeline",
      action: "Open pipeline"
    });
  }

  return items.slice(0, 5);
}

function attentionItemElement(item) {
  const row = document.createElement("article");
  row.className = "attention-row";

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

  row.append(copy, link);
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

function mappingAreaId(mapping) {
  return mapping.areaId || mapping.operatingAreaId || "";
}

function areaNameById(areaId) {
  const area = state.operatingModel.areas.find((item) => item.id === areaId);
  return area ? areaLabel(area) : "Unassigned";
}

function relationshipRows(mappings, driveFolders) {
  return [
    ...mappings.map((mapping) => ({
      type: "mapping",
      source: "provider",
      sourceLabel: providerLabel(mapping.provider),
      title: mapping.name || mapping.externalId || mapping.id,
      provider: mapping.provider,
      entityType: mapping.entityType,
      areaId: mappingAreaId(mapping),
      needsReview: !mappingAreaId(mapping),
      item: mapping
    })),
    ...driveFolders.map((file) => ({
      type: "drive",
      source: "drive",
      sourceLabel: "Google Drive",
      title: file.name,
      provider: "google_drive",
      entityType: "folder",
      areaId: file.operatingAreaId || "",
      needsReview: !file.operatingAreaId,
      item: file
    }))
  ];
}

function relationshipMatchesFilters(row) {
  const search = state.relationshipFilters.search.trim().toLowerCase();
  const source = state.relationshipFilters.source;

  if (source === "review" && !row.needsReview) {
    return false;
  }
  if (source === "provider" && row.source !== "provider") {
    return false;
  }
  if (source === "drive" && row.source !== "drive") {
    return false;
  }

  const searchable = [
    row.title,
    row.provider,
    row.entityType,
    row.sourceLabel,
    areaNameById(row.areaId)
  ].filter(Boolean).join(" ").toLowerCase();

  return !search || searchable.includes(search);
}

function renderRelationshipCenter() {
  relationshipQueue.innerHTML = "";
  relationshipProviderList.innerHTML = "";
  relationshipDriveList.innerHTML = "";

  const mappings = state.operatingModel.externalMappings || [];
  const driveFolders = state.googleDrive.files.filter((file) => file.isFolder);
  const rows = relationshipRows(mappings, driveFolders);
  const filteredRows = rows.filter(relationshipMatchesFilters);
  const queueRows = filteredRows.filter((row) => row.needsReview);
  const queueCount = rows.filter((row) => row.needsReview).length;
  relationshipSearch.value = state.relationshipFilters.search;
  relationshipSourceFilter.value = state.relationshipFilters.source;

  relationshipSummary.textContent = isSignedIn()
    ? `${filteredRows.length} of ${rows.length} relationship${rows.length === 1 ? "" : "s"} shown. ${queueCount} need review.`
    : "Sign in to load relationship data.";

  if (queueRows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    if (!isSignedIn()) {
      empty.textContent = "Sign in to load relationship review items.";
    } else if (filteredRows.length === 0) {
      empty.textContent = "No relationships match the current filters.";
    } else {
      empty.textContent = "No filtered relationships need review.";
    }
    relationshipQueue.append(empty);
  } else {
    for (const row of queueRows.slice(0, 12)) {
      relationshipQueue.append(relationshipQueueRow({ type: row.type, item: row.item }));
    }
  }

  const filteredMappings = filteredRows.filter((row) => row.type === "mapping").map((row) => row.item);
  const filteredDriveFolders = filteredRows.filter((row) => row.type === "drive").map((row) => row.item);

  renderCompactList(relationshipProviderList, filteredMappings.slice(0, 80), (mapping) => `
    <strong>${escapeHtml(mapping.name || mapping.externalId || mapping.id)}</strong>
    <span>${escapeHtml(providerLabel(mapping.provider))} · ${escapeHtml(mapping.entityType)} · ${escapeHtml(areaNameById(mappingAreaId(mapping)))}</span>
    ${mapping.provider === "clickup" && ["space", "folder", "list"].includes(mapping.entityType) ? scopeEditorHtml({
      id: mapping.id,
      selectedAreaId: mappingAreaId(mapping) || state.operatingModel.areas[0]?.id,
      type: "mapping",
      label: "Assign area"
    }) : ""}
  `, state.relationshipFilters.source === "drive" ? "Provider mappings are hidden by the current filter." : "No provider mappings match the current filters.");

  renderCompactList(relationshipDriveList, filteredDriveFolders.slice(0, 80), (file) => `
    <strong>${escapeHtml(file.name)}</strong>
    <span>Google Drive · Folder · ${escapeHtml(areaNameById(file.operatingAreaId))}</span>
    ${scopeEditorHtml({
      id: file.id,
      selectedAreaId: file.operatingAreaId || state.operatingModel.areas[0]?.id,
      type: "drive",
      label: "Assign area"
    })}
  `, state.relationshipFilters.source === "provider" ? "Drive folders are hidden by the current filter." : state.googleDrive.configured ? "No Drive folders match the current filters." : "Google Drive is not connected yet.");
}

function relationshipQueueRow(queueItem) {
  const row = document.createElement("article");
  row.className = "relationship-row";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  const editor = document.createElement("div");
  editor.className = "relationship-editor";

  if (queueItem.type === "mapping") {
    const mapping = queueItem.item;
    title.textContent = mapping.name || mapping.externalId || mapping.id;
    detail.textContent = `${providerLabel(mapping.provider)} · ${mapping.entityType}`;
    editor.innerHTML = scopeEditorHtml({
      id: mapping.id,
      selectedAreaId: state.operatingModel.areas[0]?.id,
      type: "mapping",
      label: "Assign area"
    });
  } else {
    const file = queueItem.item;
    title.textContent = file.name;
    detail.textContent = "Google Drive · Folder";
    editor.innerHTML = scopeEditorHtml({
      id: file.id,
      selectedAreaId: state.operatingModel.areas[0]?.id,
      type: "drive",
      label: "Assign area"
    });
  }

  copy.append(title, detail);
  row.append(copy, editor);
  return row;
}

function renderPipeline() {
  pipelineStats.innerHTML = "";
  const clients = recordsForSlug("clients");
  const stages = recordsForSlug("pipeline-stages");
  const deals = recordsForSlug("deals");
  const interactions = recordsForSlug("interactions");
  const total = clients.length + stages.length + deals.length + interactions.length;
  const records = pipelineRecords({ clients, stages, deals, interactions });
  syncPipelineFilters(records);
  const filteredRecords = filteredPipelineRecords(records);

  pipelineSummary.textContent = isSignedIn()
    ? `${filteredRecords.length} of ${total} CRM/pipeline record${total === 1 ? "" : "s"} shown from implemented CompanyCore tables.`
    : "Sign in to load pipeline data.";

  renderPipelineStat("Clients", clients.length);
  renderPipelineStat("Stages", stages.length);
  renderPipelineStat("Deals", deals.length);
  renderPipelineStat("Interactions", interactions.length);
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
    pipelineFeedSummary.textContent = "No CRM records are loaded from the implemented pipeline tables yet.";
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Add or sync clients, stages, deals, or interactions to populate this feed.";
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
  integrationGroups.innerHTML = "";
  integrationAreaMatrix.innerHTML = "";

  const clickUpTasks = state.tasks.filter((task) => task.source === "clickup").length;
  const driveFolders = state.googleDrive.files.filter((file) => file.isFolder).length;
  const pipelineRecords = recordCountForSlugs(["clients", "pipeline-stages", "deals", "interactions"]);
  const driveStatus = state.googleDrive.oauthTokenConfigured
    ? state.googleDrive.active ? "Active" : "Saved, inactive"
    : state.googleDrive.oauthClientConfigured ? "OAuth client saved" : "Not connected";
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
      type: "Pipelines",
      name: "CRM and pipeline data",
      status: "Implemented API",
      metric: `${pipelineRecords} record${pipelineRecords === 1 ? "" : "s"}`,
      detail: "Clients, pipeline stages, deals, and interactions are available through CompanyCore tables.",
      primaryHref: "/pipeline",
      primaryLabel: "Open pipeline",
      secondaryHref: "/settings/api",
      secondaryLabel: "API routes"
    },
    {
      type: "API",
      name: "Agents and service clients",
      status: "Implemented API",
      metric: `${state.capabilities.length} route${state.capabilities.length === 1 ? "" : "s"}`,
      detail: "Jarvis, Paperclip, Aviary, and internal tools can use the protected CompanyCore API surface.",
      primaryHref: "/settings/api",
      primaryLabel: "Open API",
      secondaryHref: "/dashboard",
      secondaryLabel: "Dashboard"
    }
  ];

  integrationSummary.textContent = isSignedIn()
    ? `${groups.length} implemented integration/data groups are available in this workspace.`
    : "Sign in to load integration data.";

  for (const group of groups) {
    integrationGroups.append(integrationGroupCard(group));
  }

  integrationSearch.value = state.integrationFilters.search;
  integrationTypeFilter.value = state.integrationFilters.type;
  renderIntegrationAreaMatrix();
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
  link.className = "workbench-index-row";
  link.href = row.href;
  link.dataset.link = "";
  const methods = row.routes.length > 0
    ? [...new Set(row.routes.map((route) => route.method))].join(", ")
    : "No route";
  link.innerHTML = `
    <div>
      <span class="summary-kicker">${escapeHtml(row.group)}</span>
      <strong>${escapeHtml(row.label)}</strong>
      <p>${escapeHtml(row.description)}</p>
    </div>
    <div class="workbench-index-metrics">
      <span><strong>${row.records.length}</strong> records</span>
      <span><strong>${row.routes.length}</strong> routes</span>
      <span><strong>${escapeHtml(row.area ? areaLabel(row.area) : "Unmapped")}</strong> area</span>
    </div>
    <div class="workbench-index-meta">
      <span>${escapeHtml(methods)}</span>
      <span>${escapeHtml(row.sources.length > 0 ? row.sources.join(", ") : "no source data")}</span>
    </div>
    <span class="workbench-index-action">Open table</span>
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
  tableRecordList.innerHTML = "";
  recordInspector.innerHTML = "";

  if (!module) {
    tableWorkbenchLabel.textContent = "Database table";
    tableWorkbenchTitle.textContent = "Unknown table";
    tableWorkbenchSummary.textContent = "This data module is not part of the current CompanyCore table catalog.";
    tableRecordsTitle.textContent = "Records";
    tableRecordsSummary.textContent = "Open the data index to choose an implemented module.";
    tableWorkbenchStats.append(summaryStatCard("Records", 0), summaryStatCard("Routes", 0), summaryStatCard("Fields", 0), summaryStatCard("Sources", 0));
    tableRecordList.append(emptyNote("No table module matches this route."));
    recordInspector.append(emptyNote("Choose a supported data module from the Data index."));
    return;
  }

  const records = module.records || [];
  const fields = tableFieldNames(records);
  const sources = tableSources(records);
  const filteredRecords = filteredTableRecords(module, records);
  const selected = module.slug === "notes" && state.tableWorkbench.newDraft
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

  syncTableFilters(sources);

  if (!isSignedIn()) {
    tableRecordList.append(emptyNote("Sign in to inspect table records."));
    renderRecordInspector(null, module, fields);
    return;
  }

  if (filteredRecords.length === 0) {
    tableRecordList.append(emptyNote(records.length === 0
      ? "This table has no records yet."
      : "No records match the current filters."));
  } else {
    for (const record of filteredRecords) {
      tableRecordList.append(tableRecordRowElement(record, module, selected?.id));
    }
  }

  renderRecordInspector(selected, module, fields);
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
    record?.source || "companycore",
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
  button.type = "button";
  button.className = `record-list-row ${record.id === selectedId ? "is-selected" : ""}`;
  button.innerHTML = `
    <span class="summary-kicker">${escapeHtml(record?.source || "companycore")}</span>
    <strong>${escapeHtml(recordTitle(record, module))}</strong>
    <small>${escapeHtml(recordSubtitle(record) || record.id || "No metadata")}</small>
  `;
  button.addEventListener("click", () => {
    state.tableWorkbench.selectedId = record.id;
    state.tableWorkbench.newDraft = false;
    renderTableWorkbench();
  });
  return button;
}

function renderRecordInspector(record, module, fields) {
  recordInspector.innerHTML = "";
  if (!record) {
    if (module?.slug === "notes" && isSignedIn()) {
      recordInspector.append(renderNoteEditor(null));
      return;
    }
    recordInspector.append(emptyNote("Select a record to inspect its fields."));
    return;
  }

  const header = document.createElement("div");
  header.className = "record-inspector-header";
  header.innerHTML = `
    <span class="summary-kicker">${escapeHtml(module.label)}</span>
    <strong>${escapeHtml(recordTitle(record, module))}</strong>
    <p>${escapeHtml(recordSubtitle(record) || "No status metadata")}</p>
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
  if (module.slug === "notes") {
    sections.push(renderNoteEditor(record));
  }
  sections.push(fieldList, raw);
  recordInspector.append(...sections);
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

function noteEditorContent(panel) {
  return panel.querySelector("#noteEditorContent")?.value.trim() || "";
}

function setNoteEditorStatus(panel, message, tone = "") {
  const status = panel.querySelector("#noteEditorStatus");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-success", tone === "success");
}

async function refreshTableRecords(slug) {
  const response = await api(`/v1/${slug}`);
  state.databaseTables.set(slug, { records: response.data || [] });
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
  const areas = sortedOperatingAreas();

  if (areas.length === 0) {
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
    state.databaseTables = new Map();
    renderOperatingMap();
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  const response = await api("/v1/operating-model");
  state.operatingModel = response.data || state.operatingModel;
  await loadDatabaseSnapshot();
  renderOperatingMap();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
}

async function loadDatabaseSnapshot() {
  const tables = state.operatingModel.areas.flatMap((area) => area.tables || []);
  const next = new Map(state.databaseTables);

  await Promise.all(tables.map(async (table) => {
    try {
      const response = await api(`/v1/${table.apiSlug}`);
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
    await Promise.all([loadOperatingModel(), loadGoogleDriveFiles()]);
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
  renderConnectionState();
  setGoogleDriveEnabled(isSignedIn());
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong.";
  const copy = {
    email_already_registered: "This email already has a CompanyCore account.",
    invalid_credentials: "Email or password is incorrect.",
    integration_invalid_token: "ClickUp rejected this token. Check that it belongs to your ClickUp account and has access to the Workspace.",
    integration_rate_limited: "ClickUp rate limit was reached. Wait a minute, then try again.",
    integration_secret_required: "Paste a ClickUp token first, or use a saved connection.",
    integration_not_configured: "ClickUp is not configured for this workspace yet.",
    integration_unavailable: "ClickUp did not respond successfully. Try again shortly.",
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

async function api(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseApiError(body, `${response.status} ${response.statusText}`));
  }
  return body;
}

async function authRequest(path, payload) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseApiError(body, "Auth failed."));
  }
  return body;
}

function applyAuthPayload(payload) {
  state.ownerToken = payload.data.token;
  state.user = payload.data.user;
  state.workspace = payload.data.workspace;
  sessionStorage.setItem("companycoreOwnerToken", state.ownerToken);
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
    sidebarStatusText.textContent = connected ? "Connected" : "Not connected";
  }
  if (sidebarWorkspaceName) {
    sidebarWorkspaceName.textContent = connected ? state.workspace.name : "Workspace";
  }
  if (workspaceEyebrow) {
    workspaceEyebrow.textContent = connected ? `${state.workspace.name} workspace` : "Private workspace";
  }

  workspaceLabel.textContent = connected
    ? `${state.workspace.name} workspace`
    : "Sign in to load workspace status.";
  clickupWorkspaceLabel.textContent = connected
    ? `${state.workspace.name} workspace`
    : "Sign in to load workspace settings.";
  workspaceNameLabel.textContent = connected ? state.workspace.name : "-";

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

function setupAgentKeyPresets() {
  agentKeyPreset.innerHTML = "";
  for (const preset of agentKeyPresets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    agentKeyPreset.append(option);
  }
  applyAgentKeyPreset(agentKeyPresets[0]?.id || "");
}

function applyAgentKeyPreset(presetId) {
  const preset = agentKeyPresets.find((item) => item.id === presetId) || agentKeyPresets[0];
  if (!preset) {
    return;
  }
  agentKeyPreset.value = preset.id;
  if (!agentKeyName.value.trim()) {
    agentKeyName.value = preset.label;
  }
  agentKeyScopes.value = preset.scopes.join("\n");
  setAgentKeyStatus(preset.description);
}

function parseScopesInput(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function renderAgentKeys() {
  agentKeyList.innerHTML = "";
  const signedIn = isSignedIn();
  const activeCount = state.apiKeys.filter((key) => key.active).length;
  const inactiveCount = state.apiKeys.length - activeCount;

  agentKeySummary.textContent = signedIn
    ? `${activeCount} active service key${activeCount === 1 ? "" : "s"} and ${inactiveCount} inactive key${inactiveCount === 1 ? "" : "s"} in this workspace.`
    : "Sign in to manage scoped keys for Jarvis, Paperclip, Aviary, and internal agents.";

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
    rotateButton.addEventListener("click", () => rotateAgentKey(key));
    const deactivateButton = document.createElement("button");
    deactivateButton.type = "button";
    deactivateButton.className = "secondary compact danger-action";
    deactivateButton.textContent = "Deactivate";
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

async function createAgentKey({ name, scopes }) {
  const response = await api("/v1/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, scopes })
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
  await Promise.all([
    loadOperatingModel(),
    loadGoogleDriveFiles(),
    loadTasks(),
    loadApiKeys()
  ]);
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
  state.user = null;
  state.capabilities = [];
  state.adapterManifest = null;
  state.apiKeys = [];
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
  renderAgentKeys();
  renderTasks();
  renderGoogleDriveFiles();
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

agentKeyResetButton.addEventListener("click", () => {
  agentKeyName.value = "";
  applyAgentKeyPreset(agentKeyPreset.value);
});

refreshAgentKeysButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    state.lastRawApiKey = null;
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
    await createAgentKey({ name, scopes });
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

  try {
    const response = await authRequest("/auth/login", {
      email: fields.email.value,
      password: fields.password.value
    });

    applyAuthPayload(response);
    await loadConnection();
    showResult("Signed in. Open Settings to connect ClickUp.");
    navigate("/dashboard", { replace: true });
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);

  try {
    const response = await authRequest("/auth/register", {
      email: fields.registerEmail.value,
      password: fields.registerPassword.value,
      name: fields.registerName.value || undefined,
      workspaceName: fields.workspaceName.value
    });

    applyAuthPayload(response);
    await loadConnection();
    showResult("Workspace created. Open Settings to connect ClickUp.");
    navigate("/dashboard", { replace: true });
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

checkTokenButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await discoverClickUp();
    showResult("Token checked. Choose the ClickUp Workspace to connect.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

loadListsButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await loadSelectedWorkspaceLists();
    const count = allLists().length;
    showResult(count > 0
      ? `Workspace loaded. ${count} ClickUp List${count === 1 ? "" : "s"} available.`
      : "Workspace loaded, but ClickUp returned no Lists for this token.", count > 0 ? "success" : "error");
  } catch (error) {
    showResult(friendlyError(error), "error");
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
  try {
    await discoverClickUp({ useStoredToken: true });
    showResult("Saved ClickUp token checked. Choose a Workspace to refresh Lists.");
  } catch (error) {
    showResult(friendlyError(error), "error");
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
  showResult("Workspace selected. Click Load Lists to fetch ClickUp Lists.");
});

saveButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await saveSettings();
    await loadConnection();
    showResult("ClickUp connection saved.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

syncButton.addEventListener("click", async () => {
  setBusy(true);

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
    showResult("ClickUp connection saved and sync completed.", "success", sync.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

fields.googleDriveActive.addEventListener("change", () => {
  setGoogleDriveEnabled(isSignedIn());
});

googleDriveSaveClientButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await saveGoogleDriveOAuthClient();
    showResult("Google Drive OAuth client saved. Create the OAuth URL next.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveAuthUrlButton.addEventListener("click", async () => {
  setBusy(true);
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
    showResult("Google Drive OAuth URL created. Open Google consent, then paste the authorization code here.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveExchangeButton.addEventListener("click", async () => {
  setBusy(true);
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
    showResult("Google Drive OAuth connection saved. Import folders to fill CompanyCore with Drive metadata.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveImportButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const folderIds = parseIdList(fields.googleDriveFolderIds.value);
    const result = await api("/v1/integration-settings/google_drive/import", {
      method: "POST",
      body: JSON.stringify({
        folderIds: folderIds.length > 0 ? folderIds : undefined,
        importMode: fields.googleDriveImportMode.value || "merge"
      })
    });
    await loadConnection();
    showResult("Google Drive import finished.", "success", result.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

googleDriveReconcileButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const result = await api("/v1/integration-settings/google_drive/changes/reconcile", {
      method: "POST",
      body: JSON.stringify({})
    });
    await loadConnection();
    showResult("Google Drive changes reconciled.", "success", result.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshDriveFilesButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await loadGoogleDriveFiles();
    showResult("Google Drive files refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

setupAgentKeyPresets();
renderRoute();

if (state.ownerToken) {
  loadConnection().then(() => {
    renderRoute();
  }).catch(() => {
    sessionStorage.removeItem("companycoreOwnerToken");
    state.ownerToken = "";
    setClickUpEnabled(false);
    renderRoute();
  });
} else {
  setClickUpEnabled(false);
  setGoogleDriveEnabled(false);
  renderOperatingMap();
  renderGoogleDriveFiles();
  renderPipeline();
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
}
