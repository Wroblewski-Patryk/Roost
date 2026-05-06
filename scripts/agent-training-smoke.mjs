const baseUrl = process.env.COMPANYCORE_BASE_URL?.replace(/\/+$/, "");
const apiKey = process.env.COMPANYCORE_API_KEY;
const agentName = process.env.COMPANYCORE_AGENT_NAME ?? "CompanyCore training agent";
const source = process.env.COMPANYCORE_ADAPTER_SOURCE ?? "agent-training-smoke";

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
console.log(`CompanyCore agent training smoke starting for ${baseUrl}`);

const connection = await request("/v1/connection");
for (const capability of [
  "connection:read",
  "agents:write",
  "notes:read",
  "notes:write",
  "agent-logs:write"
]) {
  assertCapability(connection, capability);
}

if (!connection.data.adapterManifest?.schemas?.note?.create) {
  throw new Error("Missing note create schema metadata from /v1/connection.");
}

console.log(`Connected to workspace ${connection.data.workspace.name} (${connection.data.workspace.id})`);

const agent = await request("/v1/agents", {
  method: "POST",
  body: JSON.stringify({
    name: agentName,
    role: "memory_writer",
    source
  })
});
console.log(`Created agent ${agent.data.id}`);

const note = await request("/v1/notes", {
  method: "POST",
  body: JSON.stringify({
    content: `Training smoke durable memory ${timestamp}`,
    source
  })
});
console.log(`Created note ${note.data.id}`);

const readNote = await request(`/v1/notes/${note.data.id}`);
if (readNote.data.content !== note.data.content) {
  throw new Error("Read note content does not match created note.");
}

const updatedNote = await request(`/v1/notes/${note.data.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    content: `Training smoke durable memory updated ${timestamp}`,
    status: "active"
  })
});
if (!updatedNote.data.content.includes("updated")) {
  throw new Error("Updated note content was not persisted.");
}

const log = await request("/v1/agent-logs", {
  method: "POST",
  body: JSON.stringify({
    agentId: agent.data.id,
    level: "info",
    message: `${agentName} completed CompanyCore training smoke`,
    metadata: {
      source,
      noteId: note.data.id
    }
  })
});
console.log(`Created agent log ${log.data.id}`);

const archivedNote = await request(`/v1/notes/${note.data.id}`, {
  method: "DELETE"
});
if (archivedNote.data.status !== "archived") {
  throw new Error("Training note was not archived.");
}

console.log("CompanyCore agent training smoke passed.");
