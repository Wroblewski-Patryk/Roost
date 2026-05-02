const baseUrl = process.env.COMPANYCORE_BASE_URL?.replace(/\/+$/, "");
const apiKey = process.env.COMPANYCORE_API_KEY;
const adapterName = process.env.COMPANYCORE_ADAPTER_NAME ?? "CompanyCore adapter smoke";
const source = process.env.COMPANYCORE_ADAPTER_SOURCE ?? "adapter-smoke";

if (!baseUrl || !apiKey) {
  console.error("Missing COMPANYCORE_BASE_URL or COMPANYCORE_API_KEY.");
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = typeof body?.error === "string"
      ? body.error
      : body?.error?.code ?? response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${error}`);
  }

  return body;
}

function assertCapability(connection, capability) {
  if (!connection.data.capabilities.includes(capability)) {
    throw new Error(`Missing capability from /v1/connection: ${capability}`);
  }
}

const timestamp = new Date().toISOString();
console.log(`CompanyCore adapter smoke starting for ${baseUrl}`);

const connection = await request("/v1/connection");
assertCapability(connection, "agents:write");
assertCapability(connection, "tasks:write");
assertCapability(connection, "interactions:write");
assertCapability(connection, "agent-logs:write");
assertCapability(connection, "events:read");
console.log(`Connected to workspace ${connection.data.workspace.name} (${connection.data.workspace.id})`);

const agent = await request("/v1/agents", {
  method: "POST",
  body: JSON.stringify({
    name: adapterName,
    role: "adapter_smoke",
    source
  })
});
console.log(`Created agent ${agent.data.id}`);

const taskList = await request("/v1/task-lists", {
  method: "POST",
  body: JSON.stringify({
    name: `${adapterName} task list`,
    source
  })
});
console.log(`Created task list ${taskList.data.id}`);

const task = await request("/v1/tasks", {
  method: "POST",
  body: JSON.stringify({
    taskListId: taskList.data.id,
    title: `${adapterName} task ${timestamp}`,
    description: "Created by the CompanyCore adapter smoke script.",
    source
  })
});
console.log(`Created task ${task.data.id}`);

const interaction = await request("/v1/interactions", {
  method: "POST",
  body: JSON.stringify({
    type: "adapter_smoke",
    summary: `${adapterName} verified CompanyCore CRM timeline writes.`,
    source
  })
});
console.log(`Created interaction ${interaction.data.id}`);

const log = await request("/v1/agent-logs", {
  method: "POST",
  body: JSON.stringify({
    agentId: agent.data.id,
    level: "info",
    message: `${adapterName} completed smoke flow`,
    metadata: {
      source,
      taskId: task.data.id,
      taskListId: taskList.data.id,
      interactionId: interaction.data.id
    }
  })
});
console.log(`Created agent log ${log.data.id}`);

const events = await request("/v1/events");
const eventTypes = new Set(events.data.map((event) => event.type));
for (const expected of ["agent_created", "task_list_created", "task_created", "interaction_created"]) {
  if (!eventTypes.has(expected)) {
    throw new Error(`Missing expected event in /v1/events response: ${expected}`);
  }
}

console.log("CompanyCore adapter smoke passed.");
