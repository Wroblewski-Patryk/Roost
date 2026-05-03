const state = {
  ownerToken: sessionStorage.getItem("companycoreOwnerToken") || "",
  workspace: null,
  clickup: {
    configured: false,
    config: {},
    workspaces: [],
    selectedWorkspace: null,
    spaces: [],
    selectedListIds: new Set()
  }
};

const loginForm = document.querySelector("#loginForm");
const clickupPanel = document.querySelector("#clickupPanel");
const checkTokenButton = document.querySelector("#checkTokenButton");
const refreshButton = document.querySelector("#refreshButton");
const saveButton = document.querySelector("#saveButton");
const syncButton = document.querySelector("#syncButton");
const workspaceSelect = document.querySelector("#workspaceSelect");
const connectionStatus = document.querySelector("#connectionStatus");
const workspaceLabel = document.querySelector("#workspaceLabel");
const listTree = document.querySelector("#listTree");
const listSummary = document.querySelector("#listSummary");
const resultPanel = document.querySelector("#resultPanel");
const resultMessage = document.querySelector("#resultMessage");
const metrics = document.querySelector("#metrics");

const fields = {
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  active: document.querySelector("#active"),
  token: document.querySelector("#token")
};

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.ownerToken}`
  };
}

function setBusy(isBusy) {
  document.querySelectorAll("button, input, select").forEach((control) => {
    control.disabled = isBusy;
  });
  setClickUpEnabled(Boolean(state.ownerToken) && !isBusy);
}

function setClickUpEnabled(isEnabled) {
  clickupPanel.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = !isEnabled;
  });
  workspaceSelect.disabled = !isEnabled || state.clickup.workspaces.length === 0;
  refreshButton.disabled = !isEnabled || !state.clickup.configured;
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
    ["Skipped", sync.skippedCount]
  ];

  for (const [label, value] of items) {
    const item = document.createElement("div");
    item.innerHTML = `<dt>${label}</dt><dd>${value ?? 0}</dd>`;
    metrics.append(item);
  }
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong.";
  const copy = {
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
  const response = await fetch(path, {
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

function setConnected(connection) {
  state.workspace = connection.data.workspace;
  state.clickup.configured = connection.data.integrations.clickup.configured;
  state.clickup.config = connection.data.integrations.clickup.config || {};
  connectionStatus.innerHTML = '<span class="dot ok"></span><span>Connected</span>';
  workspaceLabel.textContent = `${state.workspace.name} workspace`;
  clickupPanel.removeAttribute("aria-disabled");
  fields.active.checked = connection.data.integrations.clickup.active || !state.clickup.configured;
  state.clickup.selectedListIds = new Set(state.clickup.config.listIds || []);

  if (state.clickup.configured) {
    showResult("ClickUp settings are saved. Refresh the saved structure to change selected Lists.");
  }

  renderTree();
  setClickUpEnabled(true);
}

async function loadConnection() {
  const connection = await api("/v1/connection");
  setConnected(connection);
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

  setClickUpEnabled(Boolean(state.ownerToken));
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

  if (spaces.length === 0) {
    listSummary.textContent = state.clickup.configured
      ? "Refresh the saved structure to review ClickUp Lists."
      : "Choose a ClickUp Workspace to load Lists.";
    setClickUpEnabled(Boolean(state.ownerToken));
    return;
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

  updateListSummary();
  setClickUpEnabled(Boolean(state.ownerToken));
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
      setClickUpEnabled(Boolean(state.ownerToken));
    });
    group.append(item);
  }

  parent.append(group);
}

function updateListSummary() {
  const count = state.clickup.selectedListIds.size;
  listSummary.textContent = count === 0
    ? "Select at least one List to sync."
    : `${count} List${count === 1 ? "" : "s"} selected for sync.`;
}

function selectedConfig() {
  const selectedLists = allLists().filter((list) => state.clickup.selectedListIds.has(list.id));
  return {
    teamId: workspaceSelect.value,
    spaceIds: [...new Set(selectedLists.map((list) => list.spaceId))],
    folderIds: [...new Set(selectedLists.map((list) => list.folderId).filter(Boolean))],
    listIds: selectedLists.map((list) => list.id),
    syncMode: "pull"
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
  state.clickup.config = config;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fields.email.value,
        password: fields.password.value
      })
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(parseApiError(body, "Login failed."));
    }

    state.ownerToken = body.data.token;
    sessionStorage.setItem("companycoreOwnerToken", state.ownerToken);
    showResult("Signed in. Paste your ClickUp token or refresh the saved connection.");
    await loadConnection();
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

  setBusy(true);
  try {
    await discoverClickUp({
      includeStructure: true,
      useStoredToken: !fields.token.value.trim()
    });
    showResult("Workspace loaded. Select the Lists to sync.");
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
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
      body: "{}"
    });
    await loadConnection();
    showResult("ClickUp connection saved and sync completed.", "success", sync.data);
  } catch (error) {
    showResult(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
});

if (state.ownerToken) {
  loadConnection().catch(() => {
    sessionStorage.removeItem("companycoreOwnerToken");
    state.ownerToken = "";
    setClickUpEnabled(false);
  });
} else {
  setClickUpEnabled(false);
}
