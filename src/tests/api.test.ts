import { strict as assert } from "assert";
import type { AddressInfo } from "net";
import test, { after, before } from "node:test";
import { createApp } from "../app";
import { prisma } from "../db/prisma";
import { signClickUpWebhookBody, verifyClickUpWebhookSignature } from "../integrations/clickup/webhook-signature";

const realFetch = globalThis.fetch.bind(globalThis);
let baseUrl = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

async function resetDatabase() {
  await prisma.event.deleteMany();
  await prisma.providerEventInbox.deleteMany();
  await prisma.agentEventOutbox.deleteMany();
  await prisma.externalWebhookRegistration.deleteMany();
  await prisma.automationDefinition.deleteMany();
  await prisma.knowledgeRoot.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.externalFieldMapping.deleteMany();
  await prisma.externalContainerMapping.deleteMany();
  await prisma.operatingTable.deleteMany();
  await prisma.operatingFolder.deleteMany();
  await prisma.operatingArea.deleteMany();
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

  const webhookBody = JSON.stringify({
    webhook_id: "clickup-webhook-1",
    event: "taskStatusUpdated",
    task_id: "clickup-task-1"
  });
  const webhookSignature = signClickUpWebhookBody("official-clickup-style-secret", webhookBody);
  assert.equal(verifyClickUpWebhookSignature({
    secret: "official-clickup-style-secret",
    rawBody: webhookBody,
    signature: webhookSignature
  }), true);
  assert.equal(verifyClickUpWebhookSignature({
    secret: "official-clickup-style-secret",
    rawBody: webhookBody,
    signature: "bad-signature"
  }), false);

  const missingWebhookSignature = await request("/v1/webhooks/clickup", {
    method: "POST",
    body: webhookBody
  });
  assert.equal(missingWebhookSignature.status, 401);
  assert.equal((missingWebhookSignature.body as { error: string }).error, "missing_signature");

  const unregisteredWebhook = await request("/v1/webhooks/clickup", {
    method: "POST",
    headers: { "X-Signature": webhookSignature },
    body: webhookBody
  });
  assert.equal(unregisteredWebhook.status, 404);
  assert.equal((unregisteredWebhook.body as { error: string }).error, "webhook_not_registered");

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
      operatingModel: {
        hierarchy: string;
        areas: Array<{
          key: string;
          tables: Array<{ tableName: string; apiSlug: string; source: string; externalId: string | null }>;
        }>;
        systemTables: string[];
      };
      capabilities: string[];
      adapterManifest: {
        basePath: string;
        auth: { serviceHeader: string };
        routes: {
          tasks: Array<{ method: string; path: string; capability: string }>;
          operatingModel: Array<{ method: string; path: string; capability: string }>;
          taskLists: Array<{ method: string; path: string; capability: string }>;
          pipelineStages: Array<{ method: string; path: string; capability: string }>;
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
  assert.equal(
    connectionBody.data.operatingModel.hierarchy,
    "workspace -> operating_area -> operating_folder -> operating_table -> record"
  );
  assert.equal(connectionBody.data.operatingModel.areas.length, 12);
  const strategyArea = connectionBody.data.operatingModel.areas.find((area) => area.key === "strategy-governance");
  assert.ok(strategyArea);
  assert.ok(strategyArea.tables.some((table) => table.apiSlug === "goals" && table.tableName === "goals"));
  assert.ok(strategyArea.tables.some((table) => table.apiSlug === "targets" && table.tableName === "targets"));
  assert.ok(connectionBody.data.operatingModel.systemTables.includes("users"));
  assert.ok(connectionBody.data.capabilities.includes("connection:read"));
  assert.ok(connectionBody.data.capabilities.includes("operating-model:read"));
  assert.ok(connectionBody.data.capabilities.includes("tasks:write"));
  assert.equal(connectionBody.data.adapterManifest.basePath, "/v1");
  assert.equal(connectionBody.data.adapterManifest.auth.serviceHeader, "X-API-Key");
  assert.ok(connectionBody.data.adapterManifest.routes.operatingModel.some((route) => (
    route.method === "GET"
    && route.path === "/v1/operating-model"
    && route.capability === "operating-model:read"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.tasks.some((route) => (
    route.method === "POST"
    && route.path === "/v1/tasks"
    && route.capability === "tasks:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.taskLists.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/task-lists/:id"
    && route.capability === "task-lists:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.pipelineStages.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/pipeline-stages/:id"
    && route.capability === "pipeline-stages:write"
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

  const taskList = await request("/v1/task-lists", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      projectId: projectAId,
      name: "Paperclip intake"
    })
  });
  assert.equal(taskList.status, 201);
  const taskListId = (taskList.body as { data: { id: string } }).data.id;

  const updatedTaskList = await request(`/v1/task-lists/${taskListId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      description: "Lead capture tasks"
    })
  });
  assert.equal(updatedTaskList.status, 200);

  const foreignTaskList = await request("/v1/task-lists", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      projectId: projectAId,
      name: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignTaskList.status, 404);

  const taskListsB = await request("/v1/task-lists", { headers: authB });
  assert.equal(taskListsB.status, 200);
  assert.equal((taskListsB.body as { data: unknown[] }).data.length, 0);

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

  const operatingModel = await request("/v1/operating-model", { headers: authA });
  assert.equal(operatingModel.status, 200);
  const operatingModelBody = operatingModel.body as {
    data: {
      areas: Array<{ key: string; tables: Array<{ apiSlug: string }> }>;
    };
  };
  assert.equal(operatingModelBody.data.areas.length, 12);
  assert.ok(operatingModelBody.data.areas.some((area) => (
    area.key === "strategy-governance"
    && area.tables.some((table) => table.apiSlug === "goals")
    && area.tables.some((table) => table.apiSlug === "targets")
  )));

  const goalsTable = await prisma.operatingTable.findUniqueOrThrow({
    where: {
      workspaceId_apiSlug: {
        workspaceId: ownerA.workspace.id,
        apiSlug: "goals"
      }
    }
  });

  const knowledgeRoot = await request("/v1/operating-model/knowledge-roots", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      tableId: goalsTable.id,
      provider: "obsidian",
      name: "Goals vault",
      locator: {
        path: "CompanyCore/Strategy/Goals"
      }
    })
  });
  assert.equal(knowledgeRoot.status, 201);

  const storageLocation = await request("/v1/operating-model/storage-locations", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      tableId: goalsTable.id,
      provider: "google_drive",
      name: "Goals folder",
      locator: {
        folderId: "drive-folder-goals"
      }
    })
  });
  assert.equal(storageLocation.status, 201);

  const automationDefinition = await request("/v1/operating-model/automation-definitions", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      tableId: goalsTable.id,
      provider: "clickup",
      triggerType: "scheduled_pull",
      name: "Goals table scheduled pull",
      config: {
        cadence: "manual"
      }
    })
  });
  assert.equal(automationDefinition.status, 201);

  const foreignStorageLocation = await request("/v1/operating-model/storage-locations", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      tableId: goalsTable.id,
      provider: "google_drive",
      name: "Foreign goals folder",
      locator: {
        folderId: "foreign"
      }
    })
  });
  assert.equal(foreignStorageLocation.status, 404);

  const task = await request("/tasks", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      taskListId,
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

  const pipelineStage = await request("/v1/pipeline-stages", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Qualified",
      position: 10
    })
  });
  assert.equal(pipelineStage.status, 201);
  const pipelineStageId = (pipelineStage.body as { data: { id: string } }).data.id;

  const updatedPipelineStage = await request(`/v1/pipeline-stages/${pipelineStageId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      position: 20
    })
  });
  assert.equal(updatedPipelineStage.status, 200);

  const deal = await request("/v1/deals", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      clientId,
      pipelineStageId,
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
  const pipelineStagesB = await request("/v1/pipeline-stages", { headers: authB });
  const dealsB = await request("/v1/deals", { headers: authB });
  const interactionsB = await request("/v1/interactions", { headers: authB });
  const notesB = await request("/v1/notes", { headers: authB });
  assert.equal(clientsB.status, 200);
  assert.equal(pipelineStagesB.status, 200);
  assert.equal(dealsB.status, 200);
  assert.equal(interactionsB.status, 200);
  assert.equal(notesB.status, 200);
  assert.equal((clientsB.body as { data: unknown[] }).data.length, 0);
  assert.equal((pipelineStagesB.body as { data: unknown[] }).data.length, 0);
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
        syncMode: "pull",
        importMode: "merge"
      }
    })
  });
  assert.equal(settings.status, 200);
  assert.equal((settings.body as { data: { secretConfigured: boolean; token?: string } }).data.secretConfigured, true);
  assert.equal((settings.body as { data: { token?: string } }).data.token, undefined);

  const updatedSettingsWithoutToken = await request("/integration-settings/clickup", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({
      config: {
        teamId: "team-1",
        listIds: ["list-1", "list-folderless"],
        syncMode: "pull",
        importMode: "inspect_only"
      },
      active: true
    })
  });
  assert.equal(updatedSettingsWithoutToken.status, 200);
  assert.equal(
    (updatedSettingsWithoutToken.body as { data: { secretConfigured: boolean; config: { listIds: string[]; importMode: string } } }).data.secretConfigured,
    true
  );
  assert.deepEqual(
    (updatedSettingsWithoutToken.body as { data: { config: { listIds: string[] } } }).data.config.listIds,
    ["list-1", "list-folderless"]
  );
  assert.equal(
    (updatedSettingsWithoutToken.body as { data: { config: { importMode: string } } }).data.config.importMode,
    "inspect_only"
  );

  const originalFetchBeforeWebhooks = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/team/team-1/webhook" && !init?.method) {
      return new Response(JSON.stringify({ webhooks: [] }), { status: 200 });
    }

    if (url.pathname === "/api/v2/team/team-1/webhook" && init?.method === "POST") {
      const body = JSON.parse(String(init.body ?? "{}")) as { list_id?: string };
      const listId = body.list_id ?? "workspace";
      return new Response(JSON.stringify({
        webhook: {
          id: `webhook-${listId}`,
          endpoint: body,
          events: ["taskStatusUpdated", "taskUpdated"],
          list_id: listId,
          secret: `secret-${listId}`,
          health: { status: "active" }
        }
      }), { status: 200 });
    }

    if (url.pathname === "/api/v2/webhook/webhook-list-folderless" && init?.method === "DELETE") {
      return new Response("", { status: 200 });
    }

    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const reconciledWebhooks = await request("/v1/integration-settings/clickup/webhooks/reconcile", {
      method: "POST",
      headers: authA
    });
    assert.equal(reconciledWebhooks.status, 200);
    const reconciledBody = reconciledWebhooks.body as {
      data: { createdCount: number; existingCount: number; registrations: Array<{ externalId: string; scopeExternalId: string }> };
    };
    assert.equal(reconciledBody.data.createdCount, 2);
    assert.equal(reconciledBody.data.existingCount, 0);
    assert.ok(reconciledBody.data.registrations.some((registration) => registration.externalId === "webhook-list-1"));

    const listedWebhooks = await request("/v1/integration-settings/clickup/webhooks", { headers: authA });
    assert.equal(listedWebhooks.status, 200);
    const listedWebhookRows = (listedWebhooks.body as {
      data: Array<{ id: string; externalId: string; scopeExternalId: string }>;
    }).data;
    assert.equal(listedWebhookRows.length, 2);
    const folderlessWebhook = listedWebhookRows.find((registration) => registration.scopeExternalId === "list-folderless");
    assert.ok(folderlessWebhook);

    const deletedWebhook = await request(`/v1/integration-settings/clickup/webhooks/${folderlessWebhook.id}`, {
      method: "DELETE",
      headers: authA
    });
    assert.equal(deletedWebhook.status, 200);

    const listedWebhooksAfterDelete = await request("/v1/integration-settings/clickup/webhooks", { headers: authA });
    assert.equal(listedWebhooksAfterDelete.status, 200);
    assert.equal((listedWebhooksAfterDelete.body as { data: unknown[] }).data.length, 1);
  } finally {
    globalThis.fetch = originalFetchBeforeWebhooks;
  }

  const originalFetchBeforeDiscovery = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ err: "Unauthorized" }), { status: 401 })) as typeof fetch;

  try {
    const invalidDiscovery = await request("/v1/integration-settings/clickup/discover", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        token: "invalid-clickup-token"
      })
    });
    assert.equal(invalidDiscovery.status, 401);
    assert.equal((invalidDiscovery.body as { error: string }).error, "integration_invalid_token");
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  globalThis.fetch = (async () => new Response(JSON.stringify({ err: "Rate limited" }), { status: 429 })) as typeof fetch;

  try {
    const rateLimitedDiscovery = await request("/v1/integration-settings/clickup/discover", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        token: "rate-limited-clickup-token"
      })
    });
    assert.equal(rateLimitedDiscovery.status, 429);
    assert.equal((rateLimitedDiscovery.body as { error: string }).error, "integration_rate_limited");
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const mockClickUpDiscoveryFetch = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const path = url.pathname;

    if (path === "/api/v2/team") {
      return new Response(JSON.stringify({
        teams: [
          { id: "team-1", name: "LuckySparrow" },
          { id: "team-2", name: "Archive" }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/team/team-1/space") {
      return new Response(JSON.stringify({
        spaces: [
          { id: "space-1", name: "Operations" }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/space/space-1/list") {
      return new Response(JSON.stringify({
        lists: [
          { id: "list-folderless", name: "Inbox" }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/space/space-1/folder") {
      return new Response(JSON.stringify({
        folders: [
          { id: "folder-1", name: "Company" }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/folder/folder-1/list") {
      return new Response(JSON.stringify({
        lists: [
          { id: "list-1", name: "Jarvis" }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/team/team-1/field") {
      return new Response(JSON.stringify({
        fields: [
          { id: "field-workspace", name: "Company Area", type: "drop_down", type_config: {} }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/team/team-1/view") {
      return new Response(JSON.stringify({
        views: [
          { id: "view-workspace", name: "Everything", type: "list", parent: { id: "team-1", type: 7 } }
        ],
        required_views: {}
      }), { status: 200 });
    }

    if (path === "/api/v2/space/space-1/field") {
      return new Response(JSON.stringify({
        fields: [
          { id: "field-space", name: "Space Field", type: "short_text", type_config: {} }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/folder/folder-1/field") {
      return new Response(JSON.stringify({
        fields: [
          { id: "field-folder", name: "Folder Field", type: "checkbox", type_config: {} }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/list/list-folderless/field") {
      return new Response(JSON.stringify({ fields: [] }), { status: 200 });
    }

    if (path === "/api/v2/list/list-folderless/view") {
      return new Response(JSON.stringify({ views: [], required_views: null }), { status: 200 });
    }

    if (path === "/api/v2/list/list-1/field") {
      return new Response(JSON.stringify({
        fields: [
          {
            id: "field-priority",
            name: "Business Priority",
            type: "drop_down",
            type_config: {
              options: [{ id: "urgent", name: "Urgent" }]
            }
          }
        ]
      }), { status: 200 });
    }

    if (path === "/api/v2/list/list-1/view") {
      return new Response(JSON.stringify({
        views: [
          { id: "view-list-1", name: "Jarvis Board", type: "board", parent: { id: "list-1", type: 6 } }
        ],
        required_views: false
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  };

  globalThis.fetch = mockClickUpDiscoveryFetch as typeof fetch;

  try {
    const discovery = await request("/v1/integration-settings/clickup/discover", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        token: "clickup-token",
        teamId: "team-1"
      })
    });
    assert.equal(discovery.status, 200);
    const discoveryBody = discovery.body as {
      data: {
        workspaces: Array<{ id: string; name: string }>;
        selectedWorkspace: { id: string; name: string } | null;
        spaces: Array<{
          id: string;
          name: string;
          lists: Array<{ id: string; name: string }>;
          folders: Array<{
            id: string;
            name: string;
            lists: Array<{ id: string; name: string }>;
          }>;
        }>;
      };
    };
    assert.equal(discoveryBody.data.workspaces.length, 2);
    assert.equal(discoveryBody.data.selectedWorkspace?.id, "team-1");
    assert.equal(discoveryBody.data.spaces[0].lists[0].id, "list-folderless");
    assert.equal(discoveryBody.data.spaces[0].folders[0].lists[0].id, "list-1");

    const mappedList = await prisma.operatingTable.findUnique({
      where: {
        workspaceId_source_externalId: {
          workspaceId: ownerA.workspace.id,
          source: "clickup",
          externalId: "list-1"
        }
      },
      include: {
        area: true,
        folder: true
      }
    });
    assert.equal(mappedList?.name, "Jarvis");
    assert.equal(mappedList?.folder?.name, "Company");
    assert.equal(mappedList?.area.key, "ai-agents-observability");

    const mappedField = await prisma.externalFieldMapping.findUnique({
      where: {
        workspaceId_provider_externalId: {
          workspaceId: ownerA.workspace.id,
          provider: "clickup",
          externalId: "field-priority"
        }
      }
    });
    assert.equal(mappedField?.name, "Business Priority");
    assert.equal(mappedField?.tableId, mappedList?.id);

    const mappedView = await prisma.externalContainerMapping.findUnique({
      where: {
        workspaceId_provider_entityType_externalId: {
          workspaceId: ownerA.workspace.id,
          provider: "clickup",
          entityType: "view",
          externalId: "view-list-1"
        }
      }
    });
    assert.equal(mappedView?.name, "Jarvis Board");
    assert.equal(mappedView?.tableId, mappedList?.id);

    const storedDiscovery = await request("/v1/integration-settings/clickup/discover", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        useStoredToken: true,
        teamId: "team-1"
      })
    });
    assert.equal(storedDiscovery.status, 200);
    assert.equal((storedDiscovery.body as typeof discoveryBody).data.spaces[0].folders[0].lists[0].name, "Jarvis");
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const liveWebhookBody = JSON.stringify({
    webhook_id: "webhook-list-1",
    event: "taskStatusUpdated",
    task_id: "clickup-task-live",
    history_items: [
      {
        id: "history-status-1",
        field: "status",
        date: "1777777777000",
        parent_id: "list-1",
        before: { status: "to do" },
        after: { status: "in progress" },
        user: { id: 123, username: "ClickUp User" }
      }
    ]
  });
  const liveWebhookSignature = signClickUpWebhookBody("secret-list-1", liveWebhookBody);
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/task/clickup-task-live") {
      return new Response(JSON.stringify({
        id: "clickup-task-live",
        name: "Live webhook task",
        markdown_description: "Updated from ClickUp webhook",
        status: { status: "in progress", type: "custom" },
        priority: { priority: "urgent" },
        due_date: "1893456000000",
        list: { id: "list-1" }
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const liveWebhook = await request("/v1/webhooks/clickup", {
      method: "POST",
      headers: { "X-Signature": liveWebhookSignature },
      body: liveWebhookBody
    });
    assert.equal(liveWebhook.status, 202);
    assert.equal((liveWebhook.body as { data: { status: string } }).data.status, "accepted");
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const liveTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-live"
      }
    },
    include: { taskList: true }
  });
  assert.equal(liveTask?.title, "Live webhook task");
  assert.equal(liveTask?.status, "in_progress");
  assert.equal(liveTask?.priority, "urgent");
  assert.equal(liveTask?.taskList?.externalId, "list-1");

  const agentEvents = await request("/v1/agent-events", { headers: authA });
  assert.equal(agentEvents.status, 200);
  const statusEvent = (agentEvents.body as { data: Array<{ id: string; eventType: string }> }).data.find((event) => (
    event.eventType === "task_status_updated_from_clickup"
  ));
  assert.ok(statusEvent);

  const ackedAgentEvent = await request(`/v1/agent-events/${statusEvent.id}/ack`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({})
  });
  assert.equal(ackedAgentEvent.status, 200);

  let writeBackPayload: unknown = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/task/clickup-task-live" && init?.method === "PUT") {
      writeBackPayload = JSON.parse(String(init.body ?? "{}"));
      return new Response(JSON.stringify({
        id: "clickup-task-live",
        name: "CompanyCore owned title"
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const writeBack = await request(`/v1/tasks/${liveTask!.id}`, {
      method: "PATCH",
      headers: authA,
      body: JSON.stringify({
        title: "CompanyCore owned title",
        priority: "high",
        status: "in_progress"
      })
    });
    assert.equal(writeBack.status, 200);
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }
  assert.deepEqual(writeBackPayload, {
    name: "CompanyCore owned title",
    status: "in progress",
    priority: 2
  });

  const serviceCannotDiscoverClickUp = await request("/v1/integration-settings/clickup/discover", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      useStoredToken: true
    })
  });
  assert.equal(serviceCannotDiscoverClickUp.status, 403);

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
      headers: authA,
      body: JSON.stringify({
        importMode: "merge"
      })
    });
    assert.equal(sync.status, 200);
    const syncBody = sync.body as {
      data: {
        importMode: string;
        itemCount: number;
        createdCount: number;
        updatedCount: number;
        deletedCount: number;
      };
    };
    assert.equal(syncBody.data.importMode, "merge");
    assert.equal(syncBody.data.itemCount, 1);
    assert.equal(syncBody.data.createdCount, 1);
    assert.equal(syncBody.data.updatedCount, 0);
    assert.equal(syncBody.data.deletedCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const events = await request("/events", { headers: authA });
  const listedTasksAfterImport = await request("/v1/tasks", { headers: authA });
  assert.equal(listedTasksAfterImport.status, 200);
  const listedImportedTask = (listedTasksAfterImport.body as {
    data: Array<{ externalId: string | null; taskList?: { name: string; externalId: string | null } | null }>;
  }).data.find((listedTask) => listedTask.externalId === "clickup-task-1");
  assert.equal(listedImportedTask?.taskList?.externalId, "list-1");
  assert.equal(listedImportedTask?.taskList?.name, "Jarvis");
  const importedTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-1"
      }
    },
    include: { taskList: true }
  });
  assert.equal(importedTask?.priority, "high");
  assert.equal(importedTask?.taskList?.externalId, "list-1");
  assert.equal(importedTask?.taskList?.name, "Jarvis");

  globalThis.fetch = (async () => new Response(JSON.stringify({
    tasks: [
      {
        id: "clickup-task-1",
        name: "Should not overwrite in skip mode",
        markdown_description: "Existing task should remain unchanged",
        status: { status: "complete", type: "closed" },
        priority: { priority: "urgent" },
        list: { id: "list-1" }
      },
      {
        id: "clickup-task-2",
        name: "Only new ClickUp task",
        markdown_description: "Created by skip_existing mode",
        status: { status: "to do", type: "open" },
        priority: { priority: "normal" },
        list: { id: "list-1" }
      }
    ],
    last_page: true
  }), { status: 200 })) as typeof fetch;

  try {
    const skipExistingSync = await request("/tasks/sync/clickup/native", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "skip_existing"
      })
    });
    assert.equal(skipExistingSync.status, 200);
    const skipExistingBody = skipExistingSync.body as {
      data: { importMode: string; itemCount: number; createdCount: number; updatedCount: number; skippedCount: number };
    };
    assert.equal(skipExistingBody.data.importMode, "skip_existing");
    assert.equal(skipExistingBody.data.itemCount, 2);
    assert.equal(skipExistingBody.data.createdCount, 1);
    assert.equal(skipExistingBody.data.updatedCount, 0);
    assert.equal(skipExistingBody.data.skippedCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const unchangedImportedTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-1"
      }
    }
  });
  assert.equal(unchangedImportedTask?.title, "Imported ClickUp task");
  assert.equal(unchangedImportedTask?.priority, "high");

  const secondImportedTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-2"
      }
    }
  });
  assert.equal(secondImportedTask?.title, "Only new ClickUp task");
  assert.equal(secondImportedTask?.priority, "normal");

  globalThis.fetch = (async () => new Response(JSON.stringify({
    tasks: [
      {
        id: "clickup-task-2",
        name: "Would update but inspect only",
        markdown_description: "No write should happen",
        status: { status: "complete", type: "closed" },
        priority: { priority: "urgent" },
        list: { id: "list-1" }
      },
      {
        id: "clickup-task-3",
        name: "Would create but inspect only",
        markdown_description: "No write should happen",
        status: { status: "to do", type: "open" },
        priority: { priority: "low" },
        list: { id: "list-1" }
      }
    ],
    last_page: true
  }), { status: 200 })) as typeof fetch;

  try {
    const inspectOnlySync = await request("/tasks/sync/clickup/native", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "inspect_only"
      })
    });
    assert.equal(inspectOnlySync.status, 200);
    const inspectOnlyBody = inspectOnlySync.body as {
      data: {
        importMode: string;
        itemCount: number;
        createdCount: number;
        updatedCount: number;
        skippedCount: number;
        deletedCount: number;
        wouldCreateCount: number;
        wouldUpdateCount: number;
      };
    };
    assert.equal(inspectOnlyBody.data.importMode, "inspect_only");
    assert.equal(inspectOnlyBody.data.itemCount, 2);
    assert.equal(inspectOnlyBody.data.createdCount, 0);
    assert.equal(inspectOnlyBody.data.updatedCount, 0);
    assert.equal(inspectOnlyBody.data.skippedCount, 2);
    assert.equal(inspectOnlyBody.data.deletedCount, 0);
    assert.equal(inspectOnlyBody.data.wouldCreateCount, 1);
    assert.equal(inspectOnlyBody.data.wouldUpdateCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const inspectedOnlyTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-3"
      }
    }
  });
  assert.equal(inspectedOnlyTask, null);

  globalThis.fetch = (async () => new Response(JSON.stringify({
    tasks: [
      {
        id: "clickup-task-1",
        name: "Fresh replacement ClickUp task",
        markdown_description: "Recreated by replace_selected_lists mode",
        status: { status: "to do", type: "open" },
        priority: { priority: "urgent" },
        list: { id: "list-1" }
      }
    ],
    last_page: true
  }), { status: 200 })) as typeof fetch;

  try {
    const replaceSync = await request("/tasks/sync/clickup/native", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "replace_selected_lists"
      })
    });
    assert.equal(replaceSync.status, 200);
    const replaceBody = replaceSync.body as {
      data: { importMode: string; itemCount: number; createdCount: number; updatedCount: number; deletedCount: number };
    };
    assert.equal(replaceBody.data.importMode, "replace_selected_lists");
    assert.equal(replaceBody.data.itemCount, 1);
    assert.equal(replaceBody.data.createdCount, 1);
    assert.equal(replaceBody.data.updatedCount, 0);
    assert.equal(replaceBody.data.deletedCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const replacedTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-1"
      }
    }
  });
  assert.equal(replacedTask?.title, "Fresh replacement ClickUp task");
  assert.equal(replacedTask?.priority, "urgent");

  const removedClickUpTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-2"
      }
    }
  });
  assert.equal(removedClickUpTask, null);

  const manualTaskAfterReplace = await prisma.task.findUnique({
    where: { id: taskId }
  });
  assert.equal(manualTaskAfterReplace?.title, "Workspace A task");

  let createdInClickUpPayload: unknown = null;
  let customFieldPayload: unknown = null;
  let archivePayload: unknown = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/list/list-1/task" && init?.method === "POST") {
      createdInClickUpPayload = JSON.parse(String(init.body ?? "{}"));
      return new Response(JSON.stringify({
        id: "clickup-task-created-from-companycore",
        name: "Created from CompanyCore"
      }), { status: 200 });
    }

    if (url.pathname === "/api/v2/task/clickup-task-created-from-companycore/field/field-priority" && init?.method === "POST") {
      customFieldPayload = JSON.parse(String(init.body ?? "{}"));
      return new Response(JSON.stringify({ value: "urgent" }), { status: 200 });
    }

    if (url.pathname === "/api/v2/task/clickup-task-created-from-companycore" && init?.method === "PUT") {
      archivePayload = JSON.parse(String(init.body ?? "{}"));
      return new Response(JSON.stringify({
        id: "clickup-task-created-from-companycore",
        name: "Created from CompanyCore"
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  let createdClickUpBackedTaskId = "";
  try {
    const clickUpBackedTask = await request("/v1/tasks", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        taskListId: replacedTask?.taskListId,
        title: "Created from CompanyCore",
        description: "This should be created in ClickUp first",
        priority: "urgent",
        status: "todo"
      })
    });
    assert.equal(clickUpBackedTask.status, 201);
    const clickUpBackedTaskBody = clickUpBackedTask.body as { data: { id: string; externalId: string; source: string } };
    createdClickUpBackedTaskId = clickUpBackedTaskBody.data.id;
    assert.equal(clickUpBackedTaskBody.data.externalId, "clickup-task-created-from-companycore");
    assert.equal(clickUpBackedTaskBody.data.source, "clickup");

    const customFieldUpdate = await request(`/v1/tasks/${createdClickUpBackedTaskId}/clickup/custom-fields/field-priority`, {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        value: "urgent"
      })
    });
    assert.equal(customFieldUpdate.status, 200);

    const archivedClickUpBackedTask = await request(`/v1/tasks/${createdClickUpBackedTaskId}`, {
      method: "DELETE",
      headers: authA
    });
    assert.equal(archivedClickUpBackedTask.status, 200);
    assert.equal((archivedClickUpBackedTask.body as { data: { status: string } }).data.status, "archived");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(createdInClickUpPayload, {
    name: "Created from CompanyCore",
    description: "This should be created in ClickUp first",
    status: "to do",
    priority: 1
  });
  assert.deepEqual(customFieldPayload, { value: "urgent" });
  assert.deepEqual(archivePayload, { archived: true });

  const eventsB = await request("/events", { headers: authB });
  assert.equal(events.status, 200);
  assert.equal(eventsB.status, 200);
  assert.equal((eventsB.body as { data: unknown[] }).data.length, 0);
  const eventTypes = (events.body as { data: Array<{ type: string }> }).data.map((event) => event.type);
  assert.ok(eventTypes.includes("task_created"));
  assert.ok(eventTypes.includes("task_list_created"));
  assert.ok(eventTypes.includes("task_list_updated"));
  assert.ok(eventTypes.includes("pipeline_stage_created"));
  assert.ok(eventTypes.includes("pipeline_stage_updated"));
  assert.ok(eventTypes.includes("interaction_created"));
  assert.ok(eventTypes.includes("decision_created"));
  assert.ok(eventTypes.includes("agent_created"));
  assert.ok(eventTypes.includes("task_synced_from_clickup"));
  assert.ok(eventTypes.includes("sync_succeeded"));
});
