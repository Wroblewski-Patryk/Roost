import { strict as assert } from "assert";
import type { AddressInfo } from "net";
import test, { after, before } from "node:test";
import { createApp } from "../app";
import { prisma } from "../db/prisma";

const realFetch = globalThis.fetch.bind(globalThis);
let baseUrl = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

async function resetDatabase() {
  await prisma.event.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.note.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.client.deleteMany();
  await prisma.task.deleteMany();
  await prisma.target.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.project.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.integrationSetting.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

async function request(path: string, init: RequestInit = {}) {
  const response = await realFetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) as unknown : null
  };
}

async function registerOwner(email: string, workspaceName: string) {
  const response = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: "very-strong-password",
      name: "Test Owner",
      workspaceName
    })
  });

  assert.equal(response.status, 201);
  const body = response.body as {
    data: {
      token: string;
      workspace: { id: string };
    };
  };
  return body.data;
}

before(async () => {
  await resetDatabase();
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await prisma.$disconnect();
});

test("CompanyCore v1 protected API flow", async () => {
  const health = await request("/health");
  assert.equal(health.status, 200);
  const v1Health = await request("/v1/health");
  assert.equal(v1Health.status, 200);

  const missingAuth = await request("/projects");
  assert.equal(missingAuth.status, 401);
  assert.equal((missingAuth.body as { error: string }).error, "missing_api_key");

  const ownerA = await registerOwner("owner-a@example.com", "Workspace A");
  const ownerB = await registerOwner("owner-b@example.com", "Workspace B");
  const authA = { Authorization: `Bearer ${ownerA.token}` };
  const authB = { Authorization: `Bearer ${ownerB.token}` };

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "owner-a@example.com",
      password: "very-strong-password"
    })
  });
  assert.equal(login.status, 200);

  const createdKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Jarvan adapter",
      scopes: ["adapter:jarvan"]
    })
  });
  assert.equal(createdKey.status, 201);
  const createdKeyBody = createdKey.body as {
    data: { id: string; key: string; keyPrefix: string };
  };
  assert.ok(createdKeyBody.data.key.startsWith("cc_v1_"));
  assert.ok(createdKeyBody.data.keyPrefix);

  const serviceKey = createdKeyBody.data.key;

  const listedKeys = await request("/v1/api-keys", { headers: authA });
  assert.equal(listedKeys.status, 200);
  const listedKey = (listedKeys.body as { data: Array<{ id: string; key?: string; keyPrefix: string }> }).data[0];
  assert.equal(listedKey.id, createdKeyBody.data.id);
  assert.equal(listedKey.key, undefined);
  assert.equal(listedKey.keyPrefix, createdKeyBody.data.keyPrefix);

  const invalidKey = await request("/projects", {
    headers: { "X-API-Key": "wrong-key" }
  });
  assert.equal(invalidKey.status, 403);
  assert.equal((invalidKey.body as { error: string }).error, "invalid_api_key");

  const serviceProject = await request("/projects", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      name: "Service project"
    })
  });
  assert.equal(serviceProject.status, 201);

  const connection = await request("/v1/connection", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(connection.status, 200);
  const connectionBody = connection.body as {
    data: {
      service: string;
      apiVersion: string;
      status: string;
      auth: { type: string; workspaceId: string; apiKeyId?: string };
      workspace: { id: string; name: string };
      capabilities: string[];
      adapterManifest: {
        basePath: string;
        auth: { serviceHeader: string };
        routes: {
          tasks: Array<{ method: string; path: string; capability: string }>;
          agents: Array<{ method: string; path: string; capability: string }>;
          agentLogs: Array<{ method: string; path: string; capability: string }>;
          interactions: Array<{ method: string; path: string; capability: string }>;
          integrationSettings: Array<{ method: string; path: string; capability: string }>;
        };
        writeRules: string[];
      };
      integrations: { clickup: { configured: boolean; active: boolean; config: unknown } };
    };
  };
  assert.equal(connectionBody.data.service, "companycore");
  assert.equal(connectionBody.data.apiVersion, "v1");
  assert.equal(connectionBody.data.status, "ok");
  assert.equal(connectionBody.data.auth.type, "api_key");
  assert.equal(connectionBody.data.auth.workspaceId, ownerA.workspace.id);
  assert.equal(connectionBody.data.workspace.id, ownerA.workspace.id);
  assert.ok(connectionBody.data.capabilities.includes("connection:read"));
  assert.ok(connectionBody.data.capabilities.includes("tasks:write"));
  assert.equal(connectionBody.data.adapterManifest.basePath, "/v1");
  assert.equal(connectionBody.data.adapterManifest.auth.serviceHeader, "X-API-Key");
  assert.ok(connectionBody.data.adapterManifest.routes.tasks.some((route) => (
    route.method === "POST"
    && route.path === "/v1/tasks"
    && route.capability === "tasks:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.agentLogs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/agent-logs"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.agents.some((route) => (
    route.method === "POST"
    && route.path === "/v1/agents"
    && route.capability === "agents:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.interactions.some((route) => (
    route.method === "POST"
    && route.path === "/v1/interactions"
    && route.capability === "interactions:write"
  )));
  assert.equal(connectionBody.data.adapterManifest.routes.integrationSettings[0].path, "/v1/integration-settings/clickup");
  assert.ok(connectionBody.data.adapterManifest.writeRules.includes("Do not send workspaceId in write payloads."));
  assert.equal(connectionBody.data.integrations.clickup.configured, false);

  const projectListB = await request("/v1/projects", { headers: authB });
  assert.equal(projectListB.status, 200);
  assert.equal((projectListB.body as { data: unknown[] }).data.length, 0);

  const projectAId = (serviceProject.body as { data: { id: string } }).data.id;

  const foreignGoal = await request("/v1/goals", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      projectId: projectAId,
      title: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignGoal.status, 404);

  const serviceCannotCreateKeys = await request("/v1/api-keys", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      name: "Nested adapter key"
    })
  });
  assert.equal(serviceCannotCreateKeys.status, 403);

  const task = await request("/tasks", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      title: "Workspace A task"
    })
  });
  assert.equal(task.status, 201);
  const taskId = (task.body as { data: { id: string } }).data.id;

  const updatedTask = await request(`/tasks/${taskId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "in_progress"
    })
  });
  assert.equal(updatedTask.status, 200);

  const taskListA = await request("/tasks", { headers: authA });
  const taskListB = await request("/v1/tasks", { headers: authB });
  assert.equal(taskListA.status, 200);
  assert.equal(taskListB.status, 200);
  assert.equal((taskListA.body as { data: unknown[] }).data.length, 1);
  assert.equal((taskListB.body as { data: unknown[] }).data.length, 0);

  const client = await request("/v1/clients", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Workspace A client",
      email: "client-a@example.com"
    })
  });
  assert.equal(client.status, 201);
  const clientId = (client.body as { data: { id: string } }).data.id;

  const deal = await request("/v1/deals", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      clientId,
      title: "Workspace A deal",
      value: 1200
    })
  });
  assert.equal(deal.status, 201);

  const interaction = await request("/v1/interactions", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      clientId,
      type: "email",
      summary: "Paperclip captured a reply from the lead",
      source: "paperclip"
    })
  });
  assert.equal(interaction.status, 201);

  const foreignInteraction = await request("/v1/interactions", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      clientId,
      type: "email",
      summary: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignInteraction.status, 404);

  const note = await request("/v1/notes", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      projectId: projectAId,
      clientId,
      content: "Workspace A scoped note"
    })
  });
  assert.equal(note.status, 201);

  const foreignNote = await request("/v1/notes", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      projectId: projectAId,
      content: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignNote.status, 404);

  const clientsB = await request("/v1/clients", { headers: authB });
  const dealsB = await request("/v1/deals", { headers: authB });
  const interactionsB = await request("/v1/interactions", { headers: authB });
  const notesB = await request("/v1/notes", { headers: authB });
  assert.equal(clientsB.status, 200);
  assert.equal(dealsB.status, 200);
  assert.equal(interactionsB.status, 200);
  assert.equal(notesB.status, 200);
  assert.equal((clientsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((dealsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((interactionsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((notesB.body as { data: unknown[] }).data.length, 0);

  const decision = await request("/v1/decisions", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      title: "Use CompanyCore as source of truth",
      rationale: "Agents need durable operational memory",
      outcome: "approved"
    })
  });
  assert.equal(decision.status, 201);

  const agent = await request("/v1/agents", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Jarvis",
      role: "operations_agent",
      source: "jarvis"
    })
  });
  assert.equal(agent.status, 201);
  const agentId = (agent.body as { data: { id: string } }).data.id;

  const agentLog = await request("/v1/agent-logs", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      agentId,
      level: "info",
      message: "Jarvis inspected CompanyCore memory",
      metadata: { source: "test" }
    })
  });
  assert.equal(agentLog.status, 201);

  const foreignAgentLog = await request("/v1/agent-logs", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      agentId,
      message: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignAgentLog.status, 404);

  const decisionsB = await request("/v1/decisions", { headers: authB });
  const agentsB = await request("/v1/agents", { headers: authB });
  const agentLogsB = await request("/v1/agent-logs", { headers: authB });
  assert.equal(decisionsB.status, 200);
  assert.equal(agentsB.status, 200);
  assert.equal(agentLogsB.status, 200);
  assert.equal((decisionsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((agentsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((agentLogsB.body as { data: unknown[] }).data.length, 0);

  const settings = await request("/integration-settings/clickup", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({
      token: "clickup-token",
      config: {
        teamId: "team-1",
        listIds: ["list-1"],
        syncMode: "pull"
      }
    })
  });
  assert.equal(settings.status, 200);
  assert.equal((settings.body as { data: { secretConfigured: boolean; token?: string } }).data.secretConfigured, true);
  assert.equal((settings.body as { data: { token?: string } }).data.token, undefined);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    tasks: [
      {
        id: "clickup-task-1",
        name: "Imported ClickUp task",
        markdown_description: "Imported from ClickUp",
        status: { status: "in progress", type: "custom" },
        priority: { priority: "high" },
        due_date: "1893456000000",
        list: { id: "list-1" }
      }
    ],
    last_page: true
  }), { status: 200 })) as typeof fetch;

  try {
    const sync = await request("/tasks/sync/clickup/native", {
      method: "POST",
      headers: authA
    });
    assert.equal(sync.status, 200);
    assert.equal((sync.body as { data: { itemCount: number; createdCount: number } }).data.itemCount, 1);
    assert.equal((sync.body as { data: { itemCount: number; createdCount: number } }).data.createdCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const events = await request("/events", { headers: authA });
  const eventsB = await request("/events", { headers: authB });
  assert.equal(events.status, 200);
  assert.equal(eventsB.status, 200);
  assert.equal((eventsB.body as { data: unknown[] }).data.length, 0);
  const eventTypes = (events.body as { data: Array<{ type: string }> }).data.map((event) => event.type);
  assert.ok(eventTypes.includes("task_created"));
  assert.ok(eventTypes.includes("interaction_created"));
  assert.ok(eventTypes.includes("decision_created"));
  assert.ok(eventTypes.includes("agent_created"));
  assert.ok(eventTypes.includes("task_synced_from_clickup"));
  assert.ok(eventTypes.includes("sync_succeeded"));
});
