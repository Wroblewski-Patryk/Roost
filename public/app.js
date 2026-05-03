const privateRoutes = new Set([
  "/dashboard",
  "/areas",
  "/tasks",
  "/pipeline",
  "/settings",
  "/settings/api"
]);
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
    config: {}
  },
  operatingModel: null,
  tasks: [],
  taskLists: [],
  clickupEvents: [],
  events: [],
  agentEvents: [],
  clickupWebhooks: [],
  googleDriveWebhooks: [],
  pipelineStages: [],
  deals: [],
  clients: []
};

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
const loadListsButton = document.querySelector("#loadListsButton");
const selectAllListsButton = document.querySelector("#selectAllListsButton");
const clearListsButton = document.querySelector("#clearListsButton");
const workspaceSelect = document.querySelector("#workspaceSelect");

const refreshTasksButton = document.querySelector("#refreshTasksButton");
const refreshAreasButton = document.querySelector("#refreshAreasButton");
const refreshTaskModuleButton = document.querySelector("#refreshTaskModuleButton");
const refreshPipelineButton = document.querySelector("#refreshPipelineButton");
const retryClickUpEventsButton = document.querySelector("#retryClickUpEventsButton");
const refreshGoogleDriveButton = document.querySelector("#refreshGoogleDriveButton");
const syncGoogleDriveButton = document.querySelector("#syncGoogleDriveButton");
const taskSourceFilter = document.querySelector("#taskSourceFilter");
const taskStatusFilter = document.querySelector("#taskStatusFilter");

const routeTitle = document.querySelector("#routeTitle");
const workspaceEyebrow = document.querySelector("#workspaceEyebrow");
const sidebarWorkspaceName = document.querySelector("#sidebarWorkspaceName");
const sidebarStatusDot = document.querySelector("#sidebarStatusDot");
const sidebarStatusText = document.querySelector("#sidebarStatusText");

const workspaceLabel = document.querySelector("#workspaceLabel");
const clickupWorkspaceLabel = document.querySelector("#clickupWorkspaceLabel");
const workspaceNameLabel = document.querySelector("#workspaceNameLabel");
const integrationHealthLabel = document.querySelector("#integrationHealthLabel");
const integrationHealthHint = document.querySelector("#integrationHealthHint");
const operatingModelLabel = document.querySelector("#operatingModelLabel");
const operatingModelHint = document.querySelector("#operatingModelHint");
const taskFlowLabel = document.querySelector("#taskFlowLabel");
const taskFlowHint = document.querySelector("#taskFlowHint");
const settingsWorkspaceName = document.querySelector("#settingsWorkspaceName");
const settingsAccountHint = document.querySelector("#settingsAccountHint");
const providerHealthSummary = document.querySelector("#providerHealthSummary");
const providerHealthList = document.querySelector("#providerHealthList");
const signalSummary = document.querySelector("#signalSummary");
const signalPanel = document.querySelector("#signalPanel");
const webhookSummary = document.querySelector("#webhookSummary");
const webhookPanel = document.querySelector("#webhookPanel");
const googleDriveSummary = document.querySelector("#googleDriveSummary");

const capabilitySummary = document.querySelector("#capabilitySummary");
const capabilityList = document.querySelector("#capabilityList");
const listTree = document.querySelector("#listTree");
const listToolbar = document.querySelector("#listToolbar");
const listSummary = document.querySelector("#listSummary");
const resultPanel = document.querySelector("#resultPanel");
const resultMessage = document.querySelector("#resultMessage");
const metrics = document.querySelector("#metrics");

const tasksSummary = document.querySelector("#tasksSummary");
const tasksTableBody = document.querySelector("#tasksTableBody");
const taskModuleSummary = document.querySelector("#taskModuleSummary");
const taskModuleTableBody = document.querySelector("#taskModuleTableBody");
const taskListSummary = document.querySelector("#taskListSummary");
const taskListPanel = document.querySelector("#taskListPanel");
const clickupEventSummary = document.querySelector("#clickupEventSummary");
const clickupEventPanel = document.querySelector("#clickupEventPanel");

const areasSummary = document.querySelector("#areasSummary");
const areaGrid = document.querySelector("#areaGrid");
const mappingHealthSummary = document.querySelector("#mappingHealthSummary");
const mappingTableBody = document.querySelector("#mappingTableBody");
const pipelineSummary = document.querySelector("#pipelineSummary");
const pipelineBoard = document.querySelector("#pipelineBoard");

const fields = {
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  workspaceName: document.querySelector("#workspaceName"),
  active: document.querySelector("#active"),
  token: document.querySelector("#token"),
  importMode: document.querySelector("#importMode")
};

const routeLabels = {
  "/dashboard": "Dashboard",
  "/areas": "Operating Areas",
  "/tasks": "Tasks & Adapters",
  "/pipeline": "Pipeline",
  "/settings": "Settings",
  "/settings/api": "API"
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

function text(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function appendText(parent, tagName, value, className) {
  const element = document.createElement(tagName);
  element.textContent = value;
  if (className) {
    element.className = className;
  }
  parent.append(element);
  return element;
}

function createStatusPill(label, tone = "neutral") {
  const pill = document.createElement("span");
  pill.className = `status-pill ${tone}`;
  pill.textContent = label;
  return pill;
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
}

function navigate(path, { replace = false } = {}) {
  const nextPath = normalizedPath(path);
  if (replace) {
    window.history.replaceState({}, "", nextPath);
  } else {
    window.history.pushState({}, "", nextPath);
  }
  state.mobileMenuOpen = false;
  renderRoute();
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
    link.classList.toggle("active", target === path || (path.startsWith("/settings") && target === "/settings"));
  });

  routeTitle.textContent = routeLabels[path] || "CompanyCore";
  workspaceEyebrow.textContent = state.workspace
    ? `${state.workspace.name} workspace`
    : "Private workspace";
  document.body.dataset.route = path;
  setClickUpEnabled(isSignedIn());
  renderAll();
}

function setBusy(isBusy) {
  document.querySelectorAll("button, input, select").forEach((control) => {
    control.disabled = isBusy;
  });
  links.forEach((link) => {
    link.setAttribute("aria-disabled", String(isBusy));
  });
  setClickUpEnabled(isSignedIn() && !isBusy);
}

function setClickUpEnabled(isEnabled) {
  if (!clickupPanel) {
    return;
  }

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
    appendText(item, "dt", label);
    appendText(item, "dd", value ?? 0);
    metrics.append(item);
  }
}

function formatDate(value, withTime = false) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(value));
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong.";
  const copy = {
    email_already_registered: "This email already has a CompanyCore account.",
    invalid_credentials: "Email or password is incorrect.",
    integration_invalid_token: "ClickUp rejected this token. Check that it belongs to your ClickUp account and has access to the Workspace.",
    integration_rate_limited: "ClickUp rate limit was reached. Wait a minute, then try again.",
    integration_secret_required: "Paste the provider token first, or use a saved connection.",
    integration_not_configured: "This integration is not configured for this workspace yet.",
    integration_unavailable: "The provider did not respond successfully. Try again shortly.",
    validation_error: "Some fields are missing or invalid.",
    forbidden: "This action requires the owner login.",
    missing_api_key: "Sign in to continue.",
    not_found: "The requested workspace resource was not found."
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

async function maybeApi(path, fallback = null) {
  try {
    return await api(path);
  } catch (error) {
    if (error.message === "integration_not_configured" || error.message === "not_found") {
      return fallback;
    }
    throw error;
  }
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

function setConnected(connection) {
  state.workspace = connection.data.workspace;
  state.capabilities = connection.data.capabilities || [];
  state.clickup.configured = connection.data.integrations.clickup.configured;
  state.clickup.active = Boolean(connection.data.integrations.clickup.active);
  state.clickup.config = connection.data.integrations.clickup.config || {};
  fields.active.checked = connection.data.integrations.clickup.active ?? !state.clickup.configured;
  fields.importMode.value = state.clickup.config.importMode || "merge";
  state.clickup.selectedListIds = new Set(state.clickup.config.listIds || []);
}

async function loadConnection() {
  const connection = await api("/v1/connection");
  setConnected(connection);
  await loadWorkspaceData();
  renderAll();
}

async function loadWorkspaceData() {
  if (!isSignedIn()) {
    return;
  }

  const [
    tasks,
    taskLists,
    operatingModel,
    clickupEvents,
    events,
    agentEvents,
    clickupWebhooks,
    googleDriveWebhooks,
    pipelineStages,
    deals,
    clients,
    googleDrive
  ] = await Promise.all([
    maybeApi("/v1/tasks", { data: [] }),
    maybeApi("/v1/task-lists", { data: [] }),
    maybeApi("/v1/operating-model", { data: null }),
    maybeApi("/v1/integration-settings/clickup/events", { data: [] }),
    maybeApi("/v1/events", { data: [] }),
    maybeApi("/v1/agent-events", { data: [] }),
    maybeApi("/v1/integration-settings/clickup/webhooks", { data: [] }),
    maybeApi("/v1/integration-settings/google-drive/webhooks", { data: [] }),
    maybeApi("/v1/pipeline-stages", { data: [] }),
    maybeApi("/v1/deals", { data: [] }),
    maybeApi("/v1/clients", { data: [] }),
    maybeApi("/v1/integration-settings/google_drive", null)
  ]);

  state.tasks = tasks?.data || [];
  state.taskLists = taskLists?.data || [];
  state.operatingModel = operatingModel?.data || null;
  state.clickupEvents = clickupEvents?.data || [];
  state.events = events?.data || [];
  state.agentEvents = agentEvents?.data || [];
  state.clickupWebhooks = clickupWebhooks?.data || [];
  state.googleDriveWebhooks = googleDriveWebhooks?.data || [];
  state.pipelineStages = pipelineStages?.data || [];
  state.deals = deals?.data || [];
  state.clients = clients?.data || [];

  if (googleDrive?.data) {
    state.googleDrive.configured = true;
    state.googleDrive.active = Boolean(googleDrive.data.active);
    state.googleDrive.config = googleDrive.data.config || {};
  } else {
    state.googleDrive.configured = false;
    state.googleDrive.active = false;
    state.googleDrive.config = {};
  }
}

function renderAll() {
  renderConnectionState();
  renderProviderHealth();
  renderOperationalSignals();
  renderWebhookCoverage();
  renderTasks();
  renderAreas();
  renderTaskModule();
  renderPipeline();
  renderCapabilities();
  renderTree();
}

function renderConnectionState() {
  const connected = isSignedIn() && state.workspace;
  sidebarStatusDot.className = connected ? "dot ok" : "dot muted";
  sidebarStatusText.textContent = connected ? "Connected" : "Not connected";
  sidebarWorkspaceName.textContent = connected ? state.workspace.name : "Workspace";

  workspaceLabel.textContent = connected
    ? "Active owner session and workspace context."
    : "Sign in to load workspace status.";
  clickupWorkspaceLabel.textContent = connected
    ? `${state.workspace.name} workspace`
    : "Sign in to load workspace settings.";
  workspaceNameLabel.textContent = connected ? state.workspace.name : "-";
  settingsWorkspaceName.textContent = connected ? state.workspace.name : "-";
  settingsAccountHint.textContent = connected
    ? "Owner account is using the protected browser session."
    : "Sign in to manage settings.";

  const activeProviders = [
    state.clickup.active ? "ClickUp" : null,
    state.googleDrive.active ? "Google Drive" : null
  ].filter(Boolean);
  const configuredProviders = [
    state.clickup.configured ? "ClickUp" : null,
    state.googleDrive.configured ? "Google Drive" : null
  ].filter(Boolean);

  integrationHealthLabel.textContent = activeProviders.length > 0
    ? `${activeProviders.length} active`
    : configuredProviders.length > 0
      ? `${configuredProviders.length} configured`
      : "Not configured";
  integrationHealthHint.textContent = configuredProviders.length > 0
    ? `${configuredProviders.join(", ")} connected to the workspace.`
    : "Connect providers in Settings.";

  const failedProviderEvents = state.clickupEvents.filter((event) => event.processingStatus === "failed").length;
  if (failedProviderEvents > 0) {
    integrationHealthLabel.textContent = `${failedProviderEvents} failed events`;
    integrationHealthHint.textContent = "Open Tasks & Adapters to retry failed ClickUp events.";
  }

  const areas = state.operatingModel?.areas || [];
  const mappings = state.operatingModel?.externalMappings || [];
  operatingModelLabel.textContent = areas.length > 0 ? `${areas.length} areas` : "-";
  operatingModelHint.textContent = areas.length > 0
    ? `${mappings.length} provider mappings tracked.`
    : "Operating model will load after sign-in.";

  const clickUpCount = state.tasks.filter((task) => task.source === "clickup").length;
  taskFlowLabel.textContent = state.tasks.length > 0 ? `${state.tasks.length} tasks` : "-";
  taskFlowHint.textContent = state.tasks.length > 0
    ? `${clickUpCount} imported from ClickUp.`
    : "No task records loaded yet.";

  googleDriveSummary.textContent = state.googleDrive.configured
    ? `${state.googleDrive.active ? "Active" : "Saved, inactive"} Google Drive notes bridge.`
    : "Google Drive is not configured for this workspace yet.";
}

function renderOperationalSignals() {
  signalPanel.innerHTML = "";
  const signals = [
    ...state.events.slice(0, 5).map((event) => ({
      title: event.type || "System event",
      detail: `${event.source || "companycore"} - ${formatDate(event.createdAt, true)}`,
      status: "Event"
    })),
    ...state.agentEvents.slice(0, 5).map((event) => ({
      title: event.eventType || "Agent event",
      detail: `${event.deliveryStatus || "pending"} - ${formatDate(event.createdAt, true)}`,
      status: event.deliveryStatus || "pending"
    }))
  ].sort((a, b) => String(b.detail).localeCompare(String(a.detail))).slice(0, 8);

  signalSummary.textContent = signals.length > 0
    ? `${state.events.length} system events and ${state.agentEvents.length} agent events loaded.`
    : isSignedIn()
      ? "No recent operational signals found."
      : "Sign in to load operational signals.";

  for (const signal of signals) {
    const item = document.createElement("div");
    item.className = "stack-item";
    appendText(item, "strong", signal.title);
    appendText(item, "span", signal.detail);
    item.append(createStatusPill(signal.status, signal.status === "delivered" ? "ok" : signal.status === "failed" ? "danger" : "neutral"));
    signalPanel.append(item);
  }

  if (signals.length === 0) {
    appendText(signalPanel, "p", "No operational signals loaded.", "empty-copy");
  }
}

function renderWebhookCoverage() {
  webhookPanel.innerHTML = "";
  const providers = [
    { name: "ClickUp", registrations: state.clickupWebhooks },
    { name: "Google Drive", registrations: state.googleDriveWebhooks }
  ];
  const total = providers.reduce((sum, provider) => sum + provider.registrations.length, 0);

  webhookSummary.textContent = total > 0
    ? `${total} provider webhook registrations tracked.`
    : "No provider webhooks registered yet.";

  for (const provider of providers) {
    const active = provider.registrations.filter((registration) => registration.status === "active").length;
    const item = document.createElement("div");
    item.className = "health-row";
    const copy = document.createElement("div");
    appendText(copy, "strong", provider.name);
    appendText(copy, "span", `${active} active of ${provider.registrations.length} registrations`);
    item.append(copy);
    item.append(createStatusPill(active > 0 ? "Listening" : "No listener", active > 0 ? "ok" : "neutral"));
    webhookPanel.append(item);
  }
}

function renderProviderHealth() {
  providerHealthList.innerHTML = "";
  const providers = [
    {
      name: "ClickUp",
      dataType: "Tasks",
      configured: state.clickup.configured,
      active: state.clickup.active,
      hint: state.clickup.configured
        ? `${(state.clickup.config.listIds || []).length} Lists selected.`
        : "Connect Lists in Settings."
    },
    {
      name: "Google Drive",
      dataType: "Knowledge and storage",
      configured: state.googleDrive.configured,
      active: state.googleDrive.active,
      hint: state.googleDrive.configured
        ? text(state.googleDrive.config.rootFolderId, "Folder configured")
        : "Configure a Drive root folder through the integration API."
    }
  ];

  providerHealthSummary.textContent = providers.some((provider) => provider.configured)
    ? "Configured providers and their current workspace state."
    : "No providers are configured yet.";

  for (const provider of providers) {
    const item = document.createElement("div");
    item.className = "health-row";
    const copy = document.createElement("div");
    appendText(copy, "strong", provider.name);
    appendText(copy, "span", `${provider.dataType} - ${provider.hint}`);
    item.append(copy);
    item.append(createStatusPill(provider.active ? "Active" : provider.configured ? "Saved" : "Not configured", provider.active ? "ok" : provider.configured ? "warn" : "neutral"));
    providerHealthList.append(item);
  }
}

function renderCapabilities() {
  if (state.capabilities.length > 0) {
    capabilitySummary.textContent = `${state.capabilities.length} capabilities available for this workspace.`;
    capabilityList.innerHTML = "";
    for (const capability of state.capabilities) {
      appendText(capabilityList, "span", capability);
    }
  } else {
    capabilitySummary.textContent = isSignedIn()
      ? "No capabilities returned by the connection endpoint."
      : "Sign in to load available API capabilities.";
    capabilityList.innerHTML = "";
  }
}

function renderTaskRows(target, tasks, emptyCopy, limit = 50, updatedColumn = false) {
  target.innerHTML = "";

  if (tasks.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = emptyCopy;
    row.append(cell);
    target.append(row);
    return;
  }

  for (const task of tasks.slice(0, limit)) {
    const row = document.createElement("tr");
    [
      task.title,
      task.status,
      task.priority || "-",
      task.taskList?.name || "-",
      task.source || "companycore",
      updatedColumn ? formatDate(task.updatedAt, true) : formatDate(task.dueDate)
    ].forEach((value) => appendText(row, "td", value));
    target.append(row);
  }
}

function renderTasks() {
  const tasks = state.tasks;

  if (tasks.length === 0) {
    tasksSummary.textContent = isSignedIn()
      ? "No tasks found in this workspace yet."
      : "Sign in to load tasks.";
    renderTaskRows(tasksTableBody, [], "No tasks found yet.");
    return;
  }

  const clickUpCount = tasks.filter((task) => task.source === "clickup").length;
  tasksSummary.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"} loaded, including ${clickUpCount} from ClickUp.`;
  renderTaskRows(tasksTableBody, tasks, "No tasks found yet.", 12);
}

function renderAreas() {
  areaGrid.innerHTML = "";
  mappingTableBody.innerHTML = "";
  const model = state.operatingModel;
  const areas = model?.areas || [];
  const mappings = model?.externalMappings || [];
  const tables = areas.flatMap((area) => area.tables || []);
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const tableById = new Map(tables.map((table) => [table.id, table]));

  if (areas.length === 0) {
    areasSummary.textContent = isSignedIn()
      ? "No operating areas loaded yet."
      : "Sign in to load the operating model.";
    mappingHealthSummary.textContent = "No provider mappings loaded yet.";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No mappings loaded yet.";
    row.append(cell);
    mappingTableBody.append(row);
    return;
  }

  areasSummary.textContent = `${areas.length} operating areas, ${tables.length} operating tables, ${mappings.length} provider mappings.`;

  for (const area of areas) {
    const areaMappings = mappings.filter((mapping) => mapping.areaId === area.id);
    const card = document.createElement("article");
    card.className = "area-card";
    appendText(card, "span", String(area.position).padStart(2, "0"), "area-index");
    appendText(card, "strong", area.name);
    appendText(card, "p", `${(area.tables || []).length} tables, ${(area.folders || []).length} folders, ${areaMappings.length} mappings`);
    areaGrid.append(card);
  }

  if (mappings.length === 0) {
    mappingHealthSummary.textContent = "No external provider mappings are stored yet.";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No provider mappings found.";
    row.append(cell);
    mappingTableBody.append(row);
    return;
  }

  const unmapped = mappings.filter((mapping) => !mapping.areaId && !mapping.tableId).length;
  mappingHealthSummary.textContent = unmapped > 0
    ? `${unmapped} mapping${unmapped === 1 ? "" : "s"} need area or table review.`
    : "All loaded mappings have an area or table scope.";

  for (const mapping of mappings.slice(0, 80)) {
    const row = document.createElement("tr");
    [
      mapping.provider,
      mapping.entityType,
      mapping.name || mapping.externalId,
      areaById.get(mapping.areaId)?.name || "Needs review",
      tableById.get(mapping.tableId)?.name || "-"
    ].forEach((value) => appendText(row, "td", value));
    if (!mapping.areaId && !mapping.tableId) {
      row.className = "needs-review";
    }
    mappingTableBody.append(row);
  }
}

function filteredTasks() {
  const source = taskSourceFilter.value;
  const status = taskStatusFilter.value;
  return state.tasks.filter((task) => {
    if (source && (task.source || "companycore") !== source) {
      return false;
    }
    if (status && task.status !== status) {
      return false;
    }
    return true;
  });
}

function renderTaskModule() {
  const tasks = filteredTasks();
  taskModuleSummary.textContent = state.tasks.length > 0
    ? `${tasks.length} of ${state.tasks.length} tasks visible with current filters.`
    : isSignedIn()
      ? "No task records found yet."
      : "Sign in to load task records.";
  renderTaskRows(taskModuleTableBody, tasks, "No tasks match the current filters.", 100, true);

  taskListPanel.innerHTML = "";
  taskListSummary.textContent = state.taskLists.length > 0
    ? `${state.taskLists.length} task lists loaded.`
    : "No task lists found yet.";
  for (const list of state.taskLists.slice(0, 12)) {
    const count = state.tasks.filter((task) => task.taskListId === list.id).length;
    const item = document.createElement("div");
    item.className = "stack-item";
    appendText(item, "strong", list.name);
    appendText(item, "span", `${count} tasks - ${list.source || "companycore"}`);
    taskListPanel.append(item);
  }
  if (state.taskLists.length === 0) {
    appendText(taskListPanel, "p", "No task lists loaded.", "empty-copy");
  }

  clickupEventPanel.innerHTML = "";
  const failed = state.clickupEvents.filter((event) => event.processingStatus === "failed").length;
  clickupEventSummary.textContent = state.clickupEvents.length > 0
    ? `${state.clickupEvents.length} provider events loaded, ${failed} failed.`
    : "No ClickUp provider events loaded.";
  retryClickUpEventsButton.disabled = !isSignedIn() || failed === 0;

  for (const event of state.clickupEvents.slice(0, 8)) {
    const item = document.createElement("div");
    item.className = "stack-item";
    appendText(item, "strong", event.eventName || "ClickUp event");
    appendText(item, "span", `${event.processingStatus} - ${formatDate(event.receivedAt, true)}`);
    item.append(createStatusPill(event.processingStatus, event.processingStatus === "processed" ? "ok" : event.processingStatus === "failed" ? "danger" : "warn"));
    clickupEventPanel.append(item);
  }
  if (state.clickupEvents.length === 0) {
    appendText(clickupEventPanel, "p", "No provider events loaded.", "empty-copy");
  }
}

function renderPipeline() {
  pipelineBoard.innerHTML = "";
  const stages = state.pipelineStages.length > 0
    ? state.pipelineStages
    : [{ id: "unassigned", name: "Unassigned", position: 999 }];
  const clientById = new Map(state.clients.map((client) => [client.id, client]));

  pipelineSummary.textContent = `${state.deals.length} deal${state.deals.length === 1 ? "" : "s"} across ${state.pipelineStages.length} configured stage${state.pipelineStages.length === 1 ? "" : "s"}.`;

  for (const stage of stages) {
    const column = document.createElement("article");
    column.className = "pipeline-column";
    const stageDeals = state.deals.filter((deal) => {
      if (stage.id === "unassigned") {
        return !deal.pipelineStageId;
      }
      return deal.pipelineStageId === stage.id;
    });
    appendText(column, "h3", stage.name);
    appendText(column, "p", `${stageDeals.length} deal${stageDeals.length === 1 ? "" : "s"}`);

    for (const deal of stageDeals.slice(0, 8)) {
      const card = document.createElement("div");
      card.className = "deal-card";
      appendText(card, "strong", deal.title);
      appendText(card, "span", `${clientById.get(deal.clientId)?.name || "No client"} - ${deal.value || 0} ${deal.currency || "PLN"}`);
      card.append(createStatusPill(deal.status || "open", deal.status === "won" ? "ok" : deal.status === "lost" ? "danger" : "neutral"));
      column.append(card);
    }

    if (stageDeals.length === 0) {
      appendText(column, "span", "No deals in this stage.", "empty-copy");
    }
    pipelineBoard.append(column);
  }
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
    listSummary.textContent = "This ClickUp Workspace loaded, but no Lists were returned for the token.";
  }

  for (const space of spaces) {
    const section = document.createElement("section");
    section.className = "tree-section";
    appendText(section, "h4", space.name);
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
  appendText(group, "p", title);

  for (const list of lists) {
    const item = document.createElement("label");
    item.className = "check-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = list.id;
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
    item.append(checkbox);
    appendText(item, "span", list.name);
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

function resetPrivateState() {
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
  state.operatingModel = null;
  state.tasks = [];
  state.taskLists = [];
  state.clickupEvents = [];
  state.events = [];
  state.agentEvents = [];
  state.clickupWebhooks = [];
  state.googleDriveWebhooks = [];
  state.pipelineStages = [];
  state.deals = [];
  state.clients = [];
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
    navigate(url.pathname);
  });
});

window.addEventListener("popstate", renderRoute);

mobileMenuButton.addEventListener("click", () => {
  state.mobileMenuOpen = !state.mobileMenuOpen;
  mobileMenuButton.setAttribute("aria-expanded", String(state.mobileMenuOpen));
  updateChrome();
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("companycoreOwnerToken");
  resetPrivateState();
  resultPanel.hidden = true;
  navigate("/auth/login", { replace: true });
});

refreshTasksButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const response = await api("/v1/tasks");
    state.tasks = response.data || [];
    renderAll();
    showResult("Tasks refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshAreasButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const response = await api("/v1/operating-model");
    state.operatingModel = response.data;
    renderAll();
    showResult("Operating model refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshTaskModuleButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    await loadWorkspaceData();
    renderAll();
    showResult("Task module refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshPipelineButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const [stages, deals, clients] = await Promise.all([
      api("/v1/pipeline-stages"),
      api("/v1/deals"),
      api("/v1/clients")
    ]);
    state.pipelineStages = stages.data || [];
    state.deals = deals.data || [];
    state.clients = clients.data || [];
    renderAll();
    showResult("Pipeline refreshed.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

retryClickUpEventsButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const result = await api("/v1/integration-settings/clickup/events/retry-failed", {
      method: "POST",
      body: JSON.stringify({ limit: 25 })
    });
    const events = await api("/v1/integration-settings/clickup/events");
    state.clickupEvents = events.data || [];
    renderAll();
    showResult("Failed ClickUp events retried.", "success", result.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

refreshGoogleDriveButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const response = await maybeApi("/v1/integration-settings/google_drive", null);
    state.googleDrive.configured = Boolean(response?.data);
    state.googleDrive.active = Boolean(response?.data?.active);
    state.googleDrive.config = response?.data?.config || {};
    renderAll();
    showResult(state.googleDrive.configured ? "Google Drive status loaded." : "Google Drive is not configured.", state.googleDrive.configured ? "success" : "error");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

syncGoogleDriveButton.addEventListener("click", async () => {
  setBusy(true);
  try {
    const response = await api("/v1/integration-settings/google-drive/sync/notes", {
      method: "POST",
      body: JSON.stringify({})
    });
    showResult("Google Drive notes sync completed.", "success", response.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

taskSourceFilter.addEventListener("change", renderTaskModule);
taskStatusFilter.addEventListener("change", renderTaskModule);

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
    showResult("Signed in. Dashboard loaded.");
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
    showResult("Workspace created. Dashboard loaded.");
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

selectAllListsButton.addEventListener("click", selectAllLoadedLists);
clearListsButton.addEventListener("click", clearSelectedLists);

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

workspaceSelect.addEventListener("change", () => {
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
    showResult("ClickUp connection saved and sync completed.", "success", sync.data);
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
    resetPrivateState();
    setClickUpEnabled(false);
    renderRoute();
  });
} else {
  setClickUpEnabled(false);
}
