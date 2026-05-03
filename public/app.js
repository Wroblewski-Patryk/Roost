const privateRoutes = new Set(["/dashboard", "/settings", "/settings/api"]);
const publicRoutes = new Set(["/", "/auth/login", "/auth/register"]);

const state = {
  ownerToken: sessionStorage.getItem("companycoreOwnerToken") || "",
  workspace: null,
  user: null,
  capabilities: [],
  clickup: {
    configured: false,
    active: false,
    config: {},
    workspaces: [],
    selectedWorkspace: null,
    spaces: [],
    selectedListIds: new Set()
  },
  tasks: []
};

const API_ORIGIN = window.location.hostname === "companycore.luckysparrow.ch"
  ? "https://api.companycore.luckysparrow.ch"
  : window.location.origin;

const views = [...document.querySelectorAll("[data-view]")];
const privateControls = [...document.querySelectorAll("[data-private]")];
const publicControls = [...document.querySelectorAll("[data-public]")];
const links = [...document.querySelectorAll("[data-link]")];
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const logoutButton = document.querySelector("#logoutButton");
const clickupPanel = document.querySelector("#clickupPanel");
const checkTokenButton = document.querySelector("#checkTokenButton");
const refreshButton = document.querySelector("#refreshButton");
const saveButton = document.querySelector("#saveButton");
const syncButton = document.querySelector("#syncButton");
const refreshTasksButton = document.querySelector("#refreshTasksButton");
const loadListsButton = document.querySelector("#loadListsButton");
const selectAllListsButton = document.querySelector("#selectAllListsButton");
const clearListsButton = document.querySelector("#clearListsButton");
const workspaceSelect = document.querySelector("#workspaceSelect");
const connectionStatus = document.querySelector("#connectionStatus");
const workspaceLabel = document.querySelector("#workspaceLabel");
const clickupWorkspaceLabel = document.querySelector("#clickupWorkspaceLabel");
const workspaceNameLabel = document.querySelector("#workspaceNameLabel");
const clickupStatusLabel = document.querySelector("#clickupStatusLabel");
const clickupStatusHint = document.querySelector("#clickupStatusHint");
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
  privateControls.forEach((element) => {
    element.hidden = !isSignedIn();
  });
  publicControls.forEach((element) => {
    element.hidden = isSignedIn();
  });
}

function navigate(path, { replace = false } = {}) {
  const nextPath = normalizedPath(path);
  if (replace) {
    window.history.replaceState({}, "", nextPath);
  } else {
    window.history.pushState({}, "", nextPath);
  }
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

  document.body.dataset.route = path;
  renderConnectionState();
  setClickUpEnabled(isSignedIn());
}

function setBusy(isBusy) {
  document.querySelectorAll("button, input, select").forEach((control) => {
    control.disabled = isBusy;
  });
  links.forEach((link) => {
    link.setAttribute("aria-disabled", String(isBusy));
  });
  setClickUpEnabled(isSignedIn() && !isBusy);
  refreshTasksButton.disabled = !isSignedIn() || isBusy;
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

function renderTasks() {
  tasksTableBody.innerHTML = "";
  const tasks = state.tasks;

  if (tasks.length === 0) {
    tasksSummary.textContent = "No tasks found in this workspace yet.";
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No tasks found yet.</td>';
    tasksTableBody.append(row);
    return;
  }

  const clickUpCount = tasks.filter((task) => task.source === "clickup").length;
  tasksSummary.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"} loaded, including ${clickUpCount} from ClickUp.`;

  for (const task of tasks.slice(0, 50)) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${task.title}</td>
      <td>${task.status}</td>
      <td>${task.priority || "-"}</td>
      <td>${task.taskList?.name || "-"}</td>
      <td>${task.source || "companycore"}</td>
      <td>${formatDate(task.dueDate)}</td>
    `;
    tasksTableBody.append(row);
  }
}

async function loadTasks() {
  if (!isSignedIn()) {
    state.tasks = [];
    renderTasks();
    return;
  }

  const response = await api("/v1/tasks");
  state.tasks = response.data || [];
  renderTasks();
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
  state.capabilities = connection.data.capabilities || [];
  state.clickup.configured = connection.data.integrations.clickup.configured;
  state.clickup.active = Boolean(connection.data.integrations.clickup.active);
  state.clickup.config = connection.data.integrations.clickup.config || {};
  fields.active.checked = connection.data.integrations.clickup.active ?? !state.clickup.configured;
  fields.importMode.value = state.clickup.config.importMode || "merge";
  state.clickup.selectedListIds = new Set(state.clickup.config.listIds || []);

  if (state.clickup.configured) {
    showResult("ClickUp settings are saved. Open Settings to refresh the saved structure.");
  }

  renderConnectionState();
  renderTree();
  setClickUpEnabled(true);
}

async function loadConnection() {
  const connection = await api("/v1/connection");
  setConnected(connection);
  await loadTasks();
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

async function saveSettings() {
  const config = selectedConfig();
  if (!config.teamId || config.listIds.length === 0) {
    throw new Error("Select a ClickUp Workspace and at least one List.");
  }

  const payload = {
    config,
    active: fields.active.checked
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
  state.clickup.active = fields.active.checked;
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
    navigate(url.pathname);
  });
});

window.addEventListener("popstate", renderRoute);

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
  state.tasks = [];
  renderTasks();
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
    await saveSettings();
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
}
