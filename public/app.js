const privateRoutes = new Set(["/dashboard", "/areas", "/relationships", "/tasks-adapter", "/pipeline", "/settings", "/settings/account", "/settings/integrations", "/settings/drive", "/settings/api"]);
const publicRoutes = new Set(["/", "/auth/login", "/auth/register"]);

const state = {
  ownerToken: sessionStorage.getItem("companycoreOwnerToken") || "",
  workspace: null,
  user: null,
  capabilities: [],
  mobileMenuOpen: false,
  clickup: {
    configured: false,
    active: false,
    config: {},
    workspaces: [],
    selectedWorkspace: null,
    spaces: [],
    selectedListIds: new Set()
  },
  googleDrive: {
    configured: false,
    active: false,
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
  }
};

const COMPANY_AREAS = [
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
const workspaceLabel = document.querySelector("#workspaceLabel");
const routeTitle = document.querySelector("#routeTitle");
const workspaceEyebrow = document.querySelector("#workspaceEyebrow");
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
const operatingAreasNav = document.querySelector("#operatingAreasNav");
const areaTitle = document.querySelector("#areaTitle");
const areaDescription = document.querySelector("#areaDescription");
const areaStats = document.querySelector("#areaStats");
const areaTables = document.querySelector("#areaTables");
const areaFiles = document.querySelector("#areaFiles");
const areaMappings = document.querySelector("#areaMappings");
const areaRecords = document.querySelector("#areaRecords");
const dataCounters = document.querySelector("#dataCounters");
const attentionSummary = document.querySelector("#attentionSummary");
const attentionList = document.querySelector("#attentionList");
const nextActionText = document.querySelector("#nextActionText");
const moduleAreasMeta = document.querySelector("#moduleAreasMeta");
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
const relationshipQueue = document.querySelector("#relationshipQueue");
const relationshipProviderList = document.querySelector("#relationshipProviderList");
const relationshipDriveList = document.querySelector("#relationshipDriveList");
const listTree = document.querySelector("#listTree");
const listToolbar = document.querySelector("#listToolbar");
const listSummary = document.querySelector("#listSummary");
const resultPanel = document.querySelector("#resultPanel");
const resultMessage = document.querySelector("#resultMessage");
const metrics = document.querySelector("#metrics");
const taskStats = document.querySelector("#taskStats");
const tasksSummary = document.querySelector("#tasksSummary");
const tasksTableBody = document.querySelector("#tasksTableBody");
const integrationSummary = document.querySelector("#integrationSummary");
const integrationGroups = document.querySelector("#integrationGroups");
const integrationAreaMatrix = document.querySelector("#integrationAreaMatrix");
const googleDrivePanel = document.querySelector("#googleDrivePanel");
const googleDriveWorkspaceLabel = document.querySelector("#googleDriveWorkspaceLabel");
const googleDriveAuthUrlButton = document.querySelector("#googleDriveAuthUrlButton");
const googleDriveAuthLink = document.querySelector("#googleDriveAuthLink");
const googleDriveExchangeButton = document.querySelector("#googleDriveExchangeButton");
const googleDriveImportButton = document.querySelector("#googleDriveImportButton");
const googleDriveReconcileButton = document.querySelector("#googleDriveReconcileButton");
const refreshDriveFilesButton = document.querySelector("#refreshDriveFilesButton");
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
  googleDriveRedirectUri: document.querySelector("#googleDriveRedirectUri"),
  googleDriveFolderIds: document.querySelector("#googleDriveFolderIds"),
  googleDriveCode: document.querySelector("#googleDriveCode"),
  googleDriveImportMode: document.querySelector("#googleDriveImportMode")
};

const routeLabels = {
  "/dashboard": "Dashboard",
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

function normalizedPath(pathname = window.location.pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function isSignedIn() {
  return Boolean(state.ownerToken);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.ownerToken}`
  };
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
  if (!publicRoutes.has(path) && !privateRoutes.has(path)) {
    path = isSignedIn() ? "/dashboard" : "/";
    window.history.replaceState({}, "", path);
  }

  if (privateRoutes.has(path) && !isSignedIn()) {
    window.history.replaceState({}, "", "/auth/login");
    path = "/auth/login";
    showResult("Sign in to continue.", "error");
  }

  if ((path === "/auth/login" || path === "/auth/register") && isSignedIn()) {
    window.history.replaceState({}, "", "/dashboard");
    path = "/dashboard";
  }

  views.forEach((view) => {
    view.hidden = view.dataset.view !== path;
  });

  navLinks.forEach((link) => {
    const target = link.dataset.nav;
    link.classList.toggle("active", target === path);
  });
  if (routeTitle) {
    routeTitle.textContent = routeLabels[path] || "CompanyCore";
  }
  if (workspaceEyebrow) {
    workspaceEyebrow.textContent = state.workspace
      ? `${state.workspace.name} workspace`
      : "Private workspace";
  }
  document.body.dataset.route = path;
  renderConnectionState();
  setClickUpEnabled(isSignedIn());
  setGoogleDriveEnabled(isSignedIn());
}

function setBusy(isBusy) {
  document.querySelectorAll("button, input, select").forEach((control) => {
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
  clickupPanel.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = !isEnabled;
  });
  workspaceSelect.disabled = !isEnabled || state.clickup.workspaces.length === 0;
  loadListsButton.disabled = !isEnabled || !workspaceSelect.value;
  refreshButton.disabled = !isEnabled || !state.clickup.configured;
  const loadedListCount = allLists().length;
  selectAllListsButton.disabled = !isEnabled || loadedListCount === 0;
  clearListsButton.disabled = !isEnabled || state.clickup.selectedListIds.size === 0;
  const canSave = isEnabled && state.clickup.selectedListIds.size > 0 && Boolean(workspaceSelect.value);
  saveButton.disabled = !canSave;
  syncButton.disabled = !canSave;
}

function setGoogleDriveEnabled(isEnabled) {
  googleDrivePanel.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = !isEnabled;
  });
  fields.googleDriveRedirectUri.disabled = true;
  googleDriveAuthLink.hidden = !googleDriveAuthLink.href || googleDriveAuthLink.getAttribute("href") === "#";
  googleDriveImportButton.disabled = !isEnabled || !state.googleDrive.configured;
  googleDriveReconcileButton.disabled = !isEnabled || !state.googleDrive.configured;
  refreshDriveFilesButton.disabled = !isEnabled;
}

function showResult(message, tone = "success", sync = null) {
  resultPanel.hidden = false;
  resultMessage.textContent = message;
  resultMessage.className = tone === "error" ? "is-error" : "is-success";
  metrics.innerHTML = "";

  if (!sync) {
    return;
  }

  const items = [
    ["Items", sync.itemCount],
    ["Created", sync.createdCount],
    ["Updated", sync.updatedCount],
    ["Skipped", sync.skippedCount],
    ["Deleted", sync.deletedCount],
    ["Would create", sync.wouldCreateCount],
    ["Would update", sync.wouldUpdateCount]
  ];

  for (const [label, value] of items) {
    const item = document.createElement("div");
    item.innerHTML = `<dt>${label}</dt><dd>${value ?? 0}</dd>`;
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

  nextActionText.textContent = nextActionCopy(items, signals);
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

function renderRelationshipCenter() {
  relationshipQueue.innerHTML = "";
  relationshipProviderList.innerHTML = "";
  relationshipDriveList.innerHTML = "";

  const mappings = state.operatingModel.externalMappings || [];
  const driveFolders = state.googleDrive.files.filter((file) => file.isFolder);
  const unmappedMappings = mappings.filter((mapping) => !mappingAreaId(mapping));
  const unassignedFolders = driveFolders.filter((file) => !file.operatingAreaId);
  const queueCount = unmappedMappings.length + unassignedFolders.length;

  relationshipSummary.textContent = isSignedIn()
    ? `${mappings.length} provider mapping${mappings.length === 1 ? "" : "s"} and ${driveFolders.length} Drive folder${driveFolders.length === 1 ? "" : "s"} loaded. ${queueCount} relationship${queueCount === 1 ? "" : "s"} need review.`
    : "Sign in to load relationship data.";

  const queueItems = [
    ...unmappedMappings.map((mapping) => ({ type: "mapping", item: mapping })),
    ...unassignedFolders.map((file) => ({ type: "drive", item: file }))
  ];

  if (queueItems.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = isSignedIn()
      ? "No unmapped provider or Drive relationships need review."
      : "Sign in to load relationship review items.";
    relationshipQueue.append(empty);
  } else {
    for (const queueItem of queueItems.slice(0, 12)) {
      relationshipQueue.append(relationshipQueueRow(queueItem));
    }
  }

  renderCompactList(relationshipProviderList, mappings.slice(0, 80), (mapping) => `
    <strong>${escapeHtml(mapping.name || mapping.externalId || mapping.id)}</strong>
    <span>${escapeHtml(providerLabel(mapping.provider))} · ${escapeHtml(mapping.entityType)} · ${escapeHtml(areaNameById(mappingAreaId(mapping)))}</span>
    ${mapping.provider === "clickup" && ["space", "folder", "list"].includes(mapping.entityType) ? scopeEditorHtml({
      id: mapping.id,
      selectedAreaId: mappingAreaId(mapping) || state.operatingModel.areas[0]?.id,
      type: "mapping",
      label: "Assign area"
    }) : ""}
  `, "No provider mappings loaded yet.");

  renderCompactList(relationshipDriveList, driveFolders.slice(0, 80), (file) => `
    <strong>${escapeHtml(file.name)}</strong>
    <span>Google Drive · Folder · ${escapeHtml(areaNameById(file.operatingAreaId))}</span>
    ${scopeEditorHtml({
      id: file.id,
      selectedAreaId: file.operatingAreaId || state.operatingModel.areas[0]?.id,
      type: "drive",
      label: "Assign area"
    })}
  `, state.googleDrive.configured ? "No imported Drive folders loaded yet." : "Google Drive is not connected yet.");
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
      status: state.googleDrive.configured ? state.googleDrive.active ? "Active" : "Saved, inactive" : "Not connected",
      metric: `${state.googleDrive.files.length} Drive item${state.googleDrive.files.length === 1 ? "" : "s"}`,
      detail: `${driveFolders} imported folder${driveFolders === 1 ? "" : "s"} available for area mapping.`,
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

function renderIntegrationAreaMatrix() {
  const areas = sortedOperatingAreas();

  if (areas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = isSignedIn()
      ? "Refresh the workspace connection to load the operating-area matrix."
      : "Sign in to load the operating-area matrix.";
    integrationAreaMatrix.append(empty);
    return;
  }

  for (const area of areas) {
    const providerMappings = state.operatingModel.externalMappings.filter((mapping) => mapping.operatingAreaId === area.id);
    const driveFiles = state.googleDrive.files.filter((file) => file.operatingAreaId === area.id);
    const tableRecords = (area.tables || []).reduce((sum, table) => sum + countForTable(table), 0);
    const row = document.createElement("article");
    row.className = "integration-area-row";
    row.append(
      integrationAreaLabel(area),
      integrationAreaMetric("Tables", area.tables?.length || 0),
      integrationAreaMetric("Records", tableRecords),
      integrationAreaMetric("Mappings", providerMappings.length),
      integrationAreaMetric("Drive", driveFiles.length)
    );
    integrationAreaMatrix.append(row);
  }
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
  `;

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

  if (files.length === 0) {
    googleDriveFilesSummary.textContent = state.googleDrive.configured
      ? "No Drive files imported yet."
      : "Google Drive is not connected yet.";
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5">No Drive files loaded yet.</td>';
    googleDriveFilesBody.append(row);
    renderIntegrationTaxonomy();
    renderRelationshipCenter();
    return;
  }

  const folderCount = files.filter((file) => file.isFolder).length;
  googleDriveFilesSummary.textContent = `${files.length} Drive item${files.length === 1 ? "" : "s"} loaded, including ${folderCount} folder${folderCount === 1 ? "" : "s"}.`;
  const areasById = new Map(state.operatingModel.areas.map((area) => [area.id, area]));

  for (const file of files.slice(0, 80)) {
    const row = document.createElement("tr");
    const area = areasById.get(file.operatingAreaId);
    row.innerHTML = `
      <td>${escapeHtml(file.name)}</td>
      <td>${file.isFolder ? "Folder" : escapeHtml(file.mimeType)}</td>
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
    `;
    googleDriveFilesBody.append(row);
  }
  renderIntegrationTaxonomy();
  renderRelationshipCenter();
  bindScopeEditors();
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
    forbidden: "This action requires the owner login."
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

  if (state.googleDrive.configured) {
    googleDriveStatusLabel.textContent = state.googleDrive.active ? "Active" : "Saved, inactive";
    googleDriveStatusHint.textContent = `${state.googleDrive.files.length} Drive item${state.googleDrive.files.length === 1 ? "" : "s"} imported.`;
    googleDriveWorkspaceLabel.textContent = connected
      ? `${state.workspace.name} workspace · Google Drive ${state.googleDrive.active ? "active" : "inactive"}`
      : "Sign in to load Google Drive settings.";
  } else {
    googleDriveStatusLabel.textContent = "Not configured";
    googleDriveStatusHint.textContent = "Connect Google Drive to import folders and files.";
    googleDriveWorkspaceLabel.textContent = connected
      ? `${state.workspace.name} workspace · Google Drive not configured`
      : "Sign in to load Google Drive settings.";
  }

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
}

function setConnected(connection) {
  state.workspace = connection.data.workspace;
  state.user = connection.data.user || state.user;
  state.capabilities = connection.data.capabilities || [];
  state.clickup.configured = connection.data.integrations.clickup.configured;
  state.clickup.active = Boolean(connection.data.integrations.clickup.active);
  state.clickup.config = connection.data.integrations.clickup.config || {};
  state.googleDrive.configured = connection.data.integrations.googleDrive.configured;
  state.googleDrive.active = Boolean(connection.data.integrations.googleDrive.active);
  state.googleDrive.config = connection.data.integrations.googleDrive.config || {};
  fields.active.checked = connection.data.integrations.clickup.active ?? !state.clickup.configured;
  fields.importMode.value = state.clickup.config.importMode || "merge";
  fields.googleDriveActive.checked = connection.data.integrations.googleDrive.active ?? !state.googleDrive.configured;
  fields.googleDriveImportMode.value = state.googleDrive.config.importMode || "merge";
  fields.googleDriveFolderIds.value = (state.googleDrive.config.selectedFolderIds || state.googleDrive.config.rootFolderIds || []).join(", ");
  fields.googleDriveRedirectUri.value = `${window.location.origin}/settings/drive`;
  state.clickup.selectedListIds = new Set(state.clickup.config.listIds || []);
  state.operatingModel.areas = connection.data.operatingModel.areas || [];

  if (state.clickup.configured) {
    showResult("ClickUp settings are saved. Open Settings to refresh the saved structure.");
  }

  renderConnectionState();
  renderGoogleDriveFiles();
  renderOperatingMap();
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
    loadTasks()
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

function renderTree() {
  listTree.innerHTML = "";
  const spaces = state.clickup.spaces;
  const loadedLists = allLists();
  listToolbar.hidden = loadedLists.length === 0;

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

  for (const space of spaces) {
    const section = document.createElement("section");
    section.className = "tree-section";

    const heading = document.createElement("h4");
    heading.textContent = space.name;
    section.append(heading);

    appendListGroup(section, "Folderless Lists", space.lists || []);

    for (const folder of space.folders || []) {
      appendListGroup(section, folder.name, folder.lists || []);
    }

    listTree.append(section);
  }

  if (loadedLists.length > 0) {
    updateListSummary();
  }
  setClickUpEnabled(isSignedIn());
}

function appendListGroup(parent, title, lists) {
  if (lists.length === 0) {
    return;
  }

  const group = document.createElement("div");
  group.className = "tree-group";
  const heading = document.createElement("p");
  heading.textContent = title;
  group.append(heading);

  for (const list of lists) {
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
      updateListSummary();
      setClickUpEnabled(isSignedIn());
    });
    group.append(item);
  }

  parent.append(group);
}

function updateListSummary() {
  const count = state.clickup.selectedListIds.size;
  const loadedCount = allLists().length;
  listToolbar.hidden = loadedCount === 0;

  if (loadedCount === 0) {
    listSummary.textContent = "No ClickUp Lists loaded yet.";
    return;
  }

  listSummary.textContent = count === 0
    ? `${loadedCount} List${loadedCount === 1 ? "" : "s"} loaded. Select at least one List to sync.`
    : `${count} of ${loadedCount} List${loadedCount === 1 ? "" : "s"} selected for sync.`;
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

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("companycoreOwnerToken");
  state.ownerToken = "";
  state.workspace = null;
  state.user = null;
  state.capabilities = [];
  state.clickup.configured = false;
  state.clickup.active = false;
  state.clickup.config = {};
  state.clickup.workspaces = [];
  state.clickup.spaces = [];
  state.clickup.selectedListIds = new Set();
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
  state.tasks = [];
  state.pipelineFilters.search = "";
  state.pipelineFilters.type = "";
  state.pipelineFilters.status = "";
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
    renderTree();
    return;
  }

  state.clickup.spaces = [];
  state.clickup.selectedListIds = new Set();
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
