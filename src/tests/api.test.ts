import { strict as assert } from "assert";
import type { Prisma } from "@prisma/client";
import { spawn } from "node:child_process";
import type { AddressInfo } from "net";
import test, { after, before } from "node:test";
import { createApp } from "../app";
import { prisma } from "../db/prisma";
import { signClickUpWebhookBody, verifyClickUpWebhookSignature } from "../integrations/clickup/webhook-signature";
import { getGoogleDriveSettingsForWorkspace } from "../integrations/integration-settings.service";
import { createEvent } from "../modules/events/event.service";
import { classifyOperatingAreaKey } from "../operating-model/catalog";

const realFetch = globalThis.fetch.bind(globalThis);
let baseUrl = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

type TestHttpResponse = {
  status: number;
  body: unknown;
};

type RegisteredOwner = {
  token: string;
  workspace: { id: string };
};

function assertSafeTestDatabase() {
  if (process.env.COMPANYCORE_ALLOW_DESTRUCTIVE_TEST_DB === "1") {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, "DATABASE_URL is required for destructive API tests.");
  const parsed = new URL(databaseUrl);
  const safeHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  const databaseName = parsed.pathname.replace(/^\/+/, "");
  assert.ok(
    safeHosts.has(parsed.hostname) && /^companycore(_|-)?test/i.test(databaseName),
    "Refusing to run destructive API tests against a non-local or non-test DATABASE_URL."
  );
}

async function resetDatabase() {
  assertSafeTestDatabase();
  await prisma.event.deleteMany();
  await prisma.knowledgeLink.deleteMany();
  await prisma.googleDriveContentSnapshot.deleteMany();
  await prisma.googleDriveFile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.trigger.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.knowledgeItem.deleteMany();
  await prisma.control.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.businessFunction.deleteMany();
  await prisma.acceptanceCriterion.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.stageRun.deleteMany();
  await prisma.pipelineRunTaskLink.deleteMany();
  await prisma.pipelineRun.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.integrationCapability.deleteMany();
  await prisma.procedureStep.deleteMany();
  await prisma.resource.deleteMany();
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
  await prisma.workforceEntity.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.note.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.standard.deleteMany();
  await prisma.$executeRawUnsafe('DELETE FROM "workflow_definition_drafts"');
  await prisma.pipeline.deleteMany();
  await prisma.process.deleteMany();
  await prisma.toolAdapter.deleteMany();
  await prisma.companyRole.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.client.deleteMany();
  await prisma.task.deleteMany();
  await prisma.target.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.taskList.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.integrationSetting.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

async function request(path: string, init: RequestInit = {}): Promise<TestHttpResponse> {
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

async function registerOwner(email: string, workspaceName: string): Promise<RegisteredOwner> {
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

async function runMcpBridgeSmoke(apiKey: string, options: {
  toolName?: string;
  arguments?: Record<string, unknown>;
  commandMode?: "read_only" | "supervised_operator";
  expectError?: boolean;
  expectedErrorCode?: string;
  expectedStatus?: number;
  expectedResponseError?: string;
} = {}) {
  const {
    arguments: toolArguments,
    commandMode,
    expectError,
    expectedErrorCode,
    expectedStatus,
    expectedResponseError
  } = options;
  const toolName = options.toolName ?? "companycore_get_company_os";
  const smokeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    COMPANYCORE_BASE_URL: baseUrl,
    COMPANYCORE_API_KEY: apiKey,
    COMPANYCORE_MCP_SMOKE_TOOL: toolName,
    COMPANYCORE_MCP_SMOKE_ARGUMENTS: JSON.stringify(toolArguments ?? {}),
    COMPANYCORE_MCP_SMOKE_EXPECT_ERROR: expectError ? "true" : "false"
  };
  if (commandMode) {
    smokeEnv.COMPANYCORE_MCP_COMMAND_MODE = commandMode;
  }
  if (expectedErrorCode) {
    smokeEnv.COMPANYCORE_MCP_SMOKE_EXPECT_ERROR_CODE = expectedErrorCode;
  }
  if (expectedStatus) {
    smokeEnv.COMPANYCORE_MCP_SMOKE_EXPECT_STATUS = String(expectedStatus);
  }
  if (expectedResponseError) {
    smokeEnv.COMPANYCORE_MCP_SMOKE_EXPECT_RESPONSE_ERROR = expectedResponseError;
  }

  const child = spawn(process.execPath, ["scripts/companycore-mcp-smoke.mjs"], {
    cwd: process.cwd(),
    env: smokeEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  assert.equal(exitCode, 0, `MCP smoke failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  const summary = JSON.parse(stdout) as {
    ok: boolean;
    calledTool: string;
    callStatus: number;
    callError?: string;
    responseError?: string;
    toolCount: number;
  };
  assert.equal(summary.ok, true);
  assert.equal(summary.calledTool, toolName);
  if (expectError) {
    if (expectedErrorCode) {
      assert.equal(summary.callError, expectedErrorCode);
    }
    if (expectedStatus) {
      assert.equal(summary.callStatus, expectedStatus);
    }
    if (expectedResponseError) {
      assert.equal(summary.responseError, expectedResponseError);
    }
  } else {
    assert.equal(summary.callStatus, 200);
  }
  assert.ok(summary.toolCount > 0);
}

async function runNodeScript(script: string, envOverrides: NodeJS.ProcessEnv = {}) {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...envOverrides
  };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete childEnv[key];
    }
  }

  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  return { exitCode, stdout, stderr };
}

test("production environment validation fails closed when required secrets are missing", async () => {
  const result = await runNodeScript(`
    try {
      await import("./dist/config/env.js");
      console.error("expected production env import to fail");
      process.exit(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      if (!message.includes("AUTH_TOKEN_SECRET")) {
        process.exit(1);
      }
    }
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: undefined,
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: "production-api-key-hash-secret-for-tests"
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /Missing required production environment variable: AUTH_TOKEN_SECRET/);
});

test("production environment validation rejects committed development secret placeholders", async () => {
  const result = await runNodeScript(`
    try {
      await import("./dist/config/env.js");
      console.error("expected production env import to reject placeholder secret");
      process.exit(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(message);
      if (!message.includes("Unsafe production environment variable value: AUTH_TOKEN_SECRET")) {
        process.exit(1);
      }
    }
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: "dev-companycore-auth-secret-change-me",
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: "production-api-key-hash-secret-for-tests"
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  assert.match(result.stdout, /Unsafe production environment variable value: AUTH_TOKEN_SECRET/);
});

test("production environment validation keeps API key hash fallback compatible", async () => {
  const result = await runNodeScript(`
    const { env } = await import("./dist/config/env.js");
    console.log(JSON.stringify({
      apiKeyHashSecret: env.apiKeyHashSecret,
      authTokenSecret: env.authTokenSecret
    }));
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: "production-auth-token-secret-for-tests",
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: undefined
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const summary = JSON.parse(result.stdout) as {
    apiKeyHashSecret: string;
    authTokenSecret: string;
  };
  assert.equal(summary.apiKeyHashSecret, "production-auth-token-secret-for-tests");
  assert.equal(summary.authTokenSecret, "production-auth-token-secret-for-tests");
});

test("production health reports safe Coolify build metadata", async () => {
  const result = await runNodeScript(`
    const { createApp } = await import("./dist/app.js");
    const server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const response = await fetch("http://127.0.0.1:" + port + "/health");
    const body = await response.json();
    server.close();
    console.log(JSON.stringify(body.build));
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: "production-auth-token-secret-for-tests",
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: "production-api-key-hash-secret-for-tests",
    COMPANYCORE_BUILD_COMMIT: undefined,
    COMPANYCORE_BUILD_IMAGE: undefined,
    SOURCE_COMMIT: "coolify-source-commit-for-tests",
    COOLIFY_CONTAINER_NAME: "backend-companycore-coolify-for-tests"
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const build = JSON.parse(result.stdout) as {
    commit: string;
    image: string;
  };
  assert.equal(build.commit, "coolify-source-commit-for-tests");
  assert.equal(build.image, "backend-companycore-coolify-for-tests");
});

test("production CORS allows approved origins and rejects unknown browser origins", async () => {
  const result = await runNodeScript(`
    const { createApp } = await import("./dist/app.js");
    const server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const baseUrl = "http://127.0.0.1:" + port;
    const headers = {
      "Access-Control-Request-Method": "GET"
    };
    const allowed = await fetch(baseUrl + "/health", {
      method: "OPTIONS",
      headers: {
        ...headers,
        Origin: "https://companycore.luckysparrow.ch"
      }
    });
    const denied = await fetch(baseUrl + "/health", {
      method: "OPTIONS",
      headers: {
        ...headers,
        Origin: "https://unknown-origin.example"
      }
    });
    console.log(JSON.stringify({
      allowedStatus: allowed.status,
      allowedOrigin: allowed.headers.get("access-control-allow-origin"),
      deniedStatus: denied.status,
      deniedOrigin: denied.headers.get("access-control-allow-origin")
    }));
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: "production-auth-token-secret-for-tests",
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: "production-api-key-hash-secret-for-tests",
    COMPANYCORE_ALLOWED_ORIGINS: "https://companycore.luckysparrow.ch"
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const summary = JSON.parse(result.stdout) as {
    allowedStatus: number;
    allowedOrigin: string | null;
    deniedStatus: number;
    deniedOrigin: string | null;
  };
  assert.equal(summary.allowedStatus, 204);
  assert.equal(summary.allowedOrigin, "https://companycore.luckysparrow.ch");
  assert.equal(summary.deniedStatus, 403);
  assert.equal(summary.deniedOrigin, null);
});

test("production defaults recognize Roost web and API domains", async () => {
  const result = await runNodeScript(`
    const http = await import("node:http");
    const { createApp } = await import("./dist/app.js");
    const server = createApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    function request(options) {
      return new Promise((resolve, reject) => {
        const req = http.request({ hostname: "127.0.0.1", port, ...options }, (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => body += chunk);
          res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on("error", reject);
        req.end();
      });
    }
    const headers = {
      "Access-Control-Request-Method": "GET"
    };
    const roostCors = await request({
      method: "OPTIONS",
      path: "/health",
      headers: {
        ...headers,
        Origin: "https://roost.luckysparrow.ch"
      }
    });
    const apiRoot = await request({
      method: "GET",
      path: "/",
      headers: {
        Host: "api.roost.luckysparrow.ch"
      }
    });
    const apiRootBody = JSON.parse(apiRoot.body);
    console.log(JSON.stringify({
      roostCorsStatus: roostCors.status,
      roostCorsOrigin: roostCors.headers["access-control-allow-origin"],
      apiRootStatus: apiRoot.status,
      apiRootData: apiRootBody.data
    }));
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  `, {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://companycore:companycore@localhost:5432/companycore?schema=public",
    AUTH_TOKEN_SECRET: "production-auth-token-secret-for-tests",
    INTEGRATION_SECRET_KEY: "production-integration-secret-for-tests",
    API_KEY_HASH_SECRET: "production-api-key-hash-secret-for-tests",
    COMPANYCORE_ALLOWED_ORIGINS: undefined,
    COMPANYCORE_API_HOSTS: undefined
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const summary = JSON.parse(result.stdout) as {
    roostCorsStatus: number;
    roostCorsOrigin: string | null;
    apiRootStatus: number;
    apiRootData: { service: string; web: string; api: string };
  };
  assert.equal(summary.roostCorsStatus, 204);
  assert.equal(summary.roostCorsOrigin, "https://roost.luckysparrow.ch");
  assert.equal(summary.apiRootStatus, 200);
  assert.equal(summary.apiRootData.service, "companycore");
  assert.equal(summary.apiRootData.web, "https://roost.luckysparrow.ch");
  assert.equal(summary.apiRootData.api, "https://api.roost.luckysparrow.ch");
});

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

  const initialWorkforce = await request("/v1/workforce", { headers: authA });
  assert.equal(initialWorkforce.status, 200);
  const initialWorkforceBody = initialWorkforce.body as { data: { summary: { humans: number }; entities: Array<{ id: string; source?: string }> } };
  assert.equal(initialWorkforceBody.data.summary.humans, 1);

  const workforceAgent = await request("/v1/workforce", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      type: "agent",
      status: "active",
      name: "Paperclip Operations Agent",
      department: "06-kadry",
      role: "Operations runtime worker",
      personalityProfile: "analytical",
      runtimeMode: "semi_autonomous",
      model: "gpt-5.4",
      paperclipAgentId: "paperclip-ops",
      synchronizationEnabled: true,
      hierarchyLevel: "department_director",
      bigFiveProfile: {
        openness: 0.8,
        conscientiousness: 1,
        extraversion: 0.6,
        agreeableness: 0.8,
        neuroticism: 0.4
      },
      skillIndex: ["APQC Process Map", "MECE Responsibility Design"],
      knowledgeIndex: ["04 Operations resources", "Company resources"],
      toolIndex: ["Agent Events", "Operations work items"],
      authorityScope: ["department_lead", "reports_to_aia"]
    })
  });
  assert.equal(workforceAgent.status, 201);
  const workforceAgentBody = workforceAgent.body as {
    data: {
      id: string;
      generatedFiles: Record<string, string>;
      syncStatus: string;
      skillIndex: string[];
      bigFiveProfile: { openness: number };
    };
  };
  assert.ok(workforceAgentBody.data.generatedFiles["agent.md"].includes("Paperclip Operations Agent"));
  assert.ok(workforceAgentBody.data.generatedFiles["agent.md"].includes("APQC Process Map"));
  assert.ok(workforceAgentBody.data.generatedFiles["personality.md"].includes("openness: 0.80"));
  assert.ok(workforceAgentBody.data.generatedFiles["environment.md"].includes("00 General"));
  assert.deepEqual(workforceAgentBody.data.skillIndex, ["APQC Process Map", "MECE Responsibility Design"]);
  assert.equal(workforceAgentBody.data.bigFiveProfile.openness, 0.8);
  assert.equal(workforceAgentBody.data.syncStatus, "not_synced");

  const workforceSync = await request(`/v1/workforce/${workforceAgentBody.data.id}/actions/sync`, {
    method: "POST",
    headers: authA
  });
  assert.equal(workforceSync.status, 200);
  const workforceSyncBody = workforceSync.body as { data: { entity: { syncStatus: string }; outboxId: string } };
  assert.equal(workforceSyncBody.data.entity.syncStatus, "queued");
  assert.ok(workforceSyncBody.data.outboxId);

  const userBackedWorkforce = initialWorkforceBody.data.entities.find((entity) => entity.source === "user");
  assert.ok(userBackedWorkforce);
  const blockedOwnerDelete = await request(`/v1/workforce/${userBackedWorkforce.id}/actions/delete`, {
    method: "POST",
    headers: authA
  });
  assert.equal(blockedOwnerDelete.status, 409);
  assert.equal((blockedOwnerDelete.body as { error: string }).error, "cannot_delete_user_backed_workforce_entity");

  const workforceDelete = await request(`/v1/workforce/${workforceAgentBody.data.id}/actions/delete`, {
    method: "POST",
    headers: authA
  });
  assert.equal(workforceDelete.status, 200);
  assert.equal((workforceDelete.body as { data: { deleted: boolean } }).data.deleted, true);

  const deletedWorkforceRead = await request(`/v1/workforce/${workforceAgentBody.data.id}`, { headers: authA });
  assert.equal(deletedWorkforceRead.status, 404);

  const workforceB = await request("/v1/workforce", { headers: authB });
  assert.equal(workforceB.status, 200);
  assert.equal((workforceB.body as { data: { summary: { agents: number } } }).data.summary.agents, 0);

  const unauthenticatedIntake = await request("/v1/intake");
  assert.equal(unauthenticatedIntake.status, 401);
  const unauthenticatedCommercialExceptions = await request("/v1/commercial-exceptions");
  assert.equal(unauthenticatedCommercialExceptions.status, 401);

  const paperclipIntakeEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      eventType: "paperclip_pricing_discount_proposal",
      targetAgent: "paperclip",
      payload: {
        client: "Trial client",
        proposedDiscount: "100%",
        requestedAction: "route_to_sales_and_finance"
      }
    }
  });
  const jarvisIntakeEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      eventType: "jarvis_internal_note",
      targetAgent: "jarvis",
      payload: { note: "Not for Paperclip filtered intake." }
    }
  });
  const foreignIntakeEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerB.workspace.id,
      eventType: "foreign_workspace_signal",
      targetAgent: "paperclip",
      payload: { leak: false }
    }
  });
  const failedProviderIntake = await prisma.providerEventInbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      externalWebhookId: "intake-webhook-1",
      eventName: "taskStatusUpdated",
      externalTaskId: "clickup-intake-task-1",
      idempotencyKey: "intake-provider-failed-1",
      payloadHash: "intake-provider-failed-hash-1",
      payload: { status: "blocked", task: "Client delivery blocked" },
      processingStatus: "failed",
      retryCount: 2,
      lastErrorCode: "missing_scope_mapping"
    }
  });
  const unassignedDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      externalId: "intake-drive-file-1",
      name: "Client pricing notes",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.google.com/intake-drive-file-1"
    }
  });
  const unassignedContainer = await prisma.externalContainerMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      entityType: "folder",
      externalId: "intake-clickup-folder-1",
      name: "Operations Intake Folder"
    }
  });
  const unassignedField = await prisma.externalFieldMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      externalId: "intake-clickup-field-1",
      name: "Discount Approval",
      fieldType: "drop_down"
    }
  });
  const pendingIntakeApproval = await prisma.approval.create({
    data: {
      workspaceId: ownerA.workspace.id,
      requestedByType: "agent",
      requestedById: "paperclip",
      requestedForAction: "invoice.discount.apply",
      resourceType: "deal",
      riskLevel: "high"
    }
  });
  const highIntakeRisk = await prisma.risk.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Intake test critical payment risk",
      description: "Payment and invoice workflow needs owner review.",
      category: "finance",
      riskLevel: "critical"
    }
  });

  const globalIntake = await request("/v1/intake?limit=50", { headers: authA });
  assert.equal(globalIntake.status, 200);
  const globalIntakeBody = globalIntake.body as {
    data: {
      summary: { total: number; byFamily: Record<string, number>; byRisk: Record<string, number>; byDepartment: Record<string, number> };
      items: Array<{
        id: string;
        family: string;
        status: string;
        sourceModel: string;
        sourceId: string;
        sourceAgent?: string | null;
        risk: string;
        suggestedDepartment: string;
        allowedActions: string[];
        blockedActions: Array<{ action: string; reason: string }>;
      }>;
    };
  };
  assert.ok(globalIntakeBody.data.summary.total >= 7);
  assert.ok(globalIntakeBody.data.summary.byFamily.agent_output >= 1);
  assert.ok(globalIntakeBody.data.summary.byRisk.critical >= 1);
  assert.ok(globalIntakeBody.data.summary.byDepartment["07-finanse"] >= 1);
  assert.ok(globalIntakeBody.data.summary.byDepartment["00-ogolny"] >= 1);
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "AgentEventOutbox"
    && item.sourceId === paperclipIntakeEvent.id
    && item.family === "agent_output"
    && item.suggestedDepartment === "07-finanse"
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "ProviderEventInbox"
    && item.sourceId === failedProviderIntake.id
    && item.status === "blocked"
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "GoogleDriveFile"
    && item.sourceId === unassignedDriveFile.id
    && item.allowedActions.includes("assign_scope")
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "ExternalContainerMapping"
    && item.sourceId === unassignedContainer.id
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "ExternalFieldMapping"
    && item.sourceId === unassignedField.id
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "Approval"
    && item.sourceId === pendingIntakeApproval.id
    && item.blockedActions.some((action) => action.action === "execute_requested_action")
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "Risk"
    && item.sourceId === highIntakeRisk.id
    && item.risk === "critical"
    && item.suggestedDepartment === "07-finanse"
  )));
  assert.ok(globalIntakeBody.data.items.some((item) => (
    item.sourceModel === "AgentEventOutbox"
    && item.sourceId === jarvisIntakeEvent.id
    && item.suggestedDepartment === "00-ogolny"
  )));
  assert.ok(!globalIntakeBody.data.items.some((item) => item.sourceId === foreignIntakeEvent.id));

  const paperclipFilteredIntake = await request("/v1/intake?sourceAgent=paperclip&limit=20", { headers: authA });
  assert.equal(paperclipFilteredIntake.status, 200);
  const paperclipFilteredIntakeBody = paperclipFilteredIntake.body as {
    data: { items: Array<{ sourceId: string; sourceAgent?: string | null }> };
  };
  assert.ok(paperclipFilteredIntakeBody.data.items.some((item) => item.sourceId === paperclipIntakeEvent.id));
  assert.ok(!paperclipFilteredIntakeBody.data.items.some((item) => item.sourceId === jarvisIntakeEvent.id));

  const pendingPaperclipEventAfterIntake = await prisma.agentEventOutbox.findUniqueOrThrow({
    where: { id: paperclipIntakeEvent.id }
  });
  assert.equal(pendingPaperclipEventAfterIntake.deliveryStatus, "pending");

  const mcpManifestWithIntake = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(mcpManifestWithIntake.status, 200);
  const mcpManifestWithIntakeBody = mcpManifestWithIntake.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(mcpManifestWithIntakeBody.data.tools.some((tool) => (
    tool.name === "companycore_get_intake"
    && tool.path === "/v1/intake"
    && tool.capability === "intake:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(mcpManifestWithIntakeBody.data.tools.some((tool) => (
    tool.name === "companycore_get_intake_route_proposals"
    && tool.path === "/v1/intake/route-proposals"
    && tool.capability === "intake:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(mcpManifestWithIntakeBody.data.tools.some((tool) => (
    tool.name === "companycore_post_intake_actions_propose_route"
    && tool.path === "/v1/intake/actions/propose-route"
    && tool.capability === "intake:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));

  const routeProposal = await request("/v1/intake/actions/propose-route", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      sourceModel: "AgentEventOutbox",
      sourceId: paperclipIntakeEvent.id,
      targetDepartmentKey: "03-sprzedaz",
      classification: "route_to_department",
      reason: "Paperclip proposal should be reviewed by Sales before any commercial action.",
      proposedNextAction: "Review the discount context and decide whether a Sales follow-up task is needed.",
      riskLevel: "medium",
      requestOwnerDecision: true,
      createTaskDraft: true,
      idempotencyKey: "paperclip-discount-route-test"
    })
  });
  assert.equal(routeProposal.status, 201);
  const routeProposalBody = routeProposal.body as {
    data: {
      proposal: {
        id: string;
        sourceModel: string;
        sourceId: string;
        targetDepartmentKey: string;
        classification: string;
        status: string;
      };
      effects: {
        sourceMutated: boolean;
        agentEventAcknowledged: boolean;
        providerStateMutated: boolean;
        taskDraftCreated: boolean;
        ownerDecisionRequested: boolean;
        auditRecorded: boolean;
        idempotentReplay: boolean;
      };
      evidence: { decisionId: string; taskId: string | null; auditLogId: string | null };
      blockedActions: Array<{ action: string; reason: string }>;
    };
  };
  assert.equal(routeProposalBody.data.proposal.sourceModel, "AgentEventOutbox");
  assert.equal(routeProposalBody.data.proposal.sourceId, paperclipIntakeEvent.id);
  assert.equal(routeProposalBody.data.proposal.targetDepartmentKey, "03-sprzedaz");
  assert.equal(routeProposalBody.data.proposal.status, "proposed");
  assert.equal(routeProposalBody.data.effects.sourceMutated, false);
  assert.equal(routeProposalBody.data.effects.agentEventAcknowledged, false);
  assert.equal(routeProposalBody.data.effects.providerStateMutated, false);
  assert.equal(routeProposalBody.data.effects.taskDraftCreated, true);
  assert.equal(routeProposalBody.data.effects.ownerDecisionRequested, true);
  assert.equal(routeProposalBody.data.effects.auditRecorded, true);
  assert.equal(routeProposalBody.data.effects.idempotentReplay, false);
  assert.ok(routeProposalBody.data.evidence.taskId);
  assert.ok(routeProposalBody.data.evidence.auditLogId);
  assert.ok(routeProposalBody.data.blockedActions.some((action) => action.action === "commercial_or_legal_action"));

  const proposalDecision = await prisma.decision.findFirstOrThrow({
    where: {
      id: routeProposalBody.data.evidence.decisionId,
      workspaceId: ownerA.workspace.id,
      source: "companycore_intake"
    }
  });
  assert.equal(proposalDecision.status, "proposed");

  const proposalAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: routeProposalBody.data.evidence.auditLogId! }
  });
  assert.equal(proposalAudit.action, "intake.route_proposed");
  assert.equal(proposalAudit.resourceType, "intake_route_proposal");

  const proposalEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "intake.route_proposed",
      resourceId: proposalDecision.id
    }
  });
  assert.equal(proposalEvent.source, "companycore_intake");

  const pendingPaperclipEventAfterProposal = await prisma.agentEventOutbox.findUniqueOrThrow({
    where: { id: paperclipIntakeEvent.id }
  });
  assert.equal(pendingPaperclipEventAfterProposal.deliveryStatus, "pending");

  const repeatedRouteProposal = await request("/v1/intake/actions/propose-route", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      sourceModel: "AgentEventOutbox",
      sourceId: paperclipIntakeEvent.id,
      targetDepartmentKey: "03-sprzedaz",
      classification: "route_to_department",
      reason: "Paperclip proposal should be reviewed by Sales before any commercial action.",
      proposedNextAction: "Review the discount context and decide whether a Sales follow-up task is needed.",
      riskLevel: "medium",
      requestOwnerDecision: true,
      createTaskDraft: true,
      idempotencyKey: "paperclip-discount-route-test"
    })
  });
  assert.equal(repeatedRouteProposal.status, 200);
  const repeatedRouteProposalBody = repeatedRouteProposal.body as {
    data: {
      proposal: { id: string };
      effects: { idempotentReplay: boolean };
      evidence: { taskId: string | null; auditLogId: string | null };
    };
  };
  assert.equal(repeatedRouteProposalBody.data.proposal.id, routeProposalBody.data.proposal.id);
  assert.equal(repeatedRouteProposalBody.data.effects.idempotentReplay, true);
  assert.equal(repeatedRouteProposalBody.data.evidence.taskId, routeProposalBody.data.evidence.taskId);

  const routeProposalReadback = await request("/v1/intake/route-proposals?targetDepartmentKey=03-sprzedaz&limit=20", {
    headers: authA
  });
  assert.equal(routeProposalReadback.status, 200);
  const routeProposalReadbackBody = routeProposalReadback.body as {
    data: {
      summary: {
        total: number;
        withTaskDraft: number;
        withAuditEvidence: number;
        withEventEvidence: number;
        byTargetDepartment: Record<string, number>;
      };
      proposals: Array<{
        proposal: {
          id: string;
          sourceModel: string;
          sourceId: string;
          targetDepartmentKey: string;
          lifecycleState: string;
          riskLevel: string;
          ownerDecisionRequested: boolean;
        };
        effects: {
          sourceMutated: boolean;
          agentEventAcknowledged: boolean;
          providerStateMutated: boolean;
          taskDraftCreated: boolean;
          auditRecorded: boolean;
          eventRecorded: boolean;
        };
        evidence: {
          decisionId: string;
          taskId: string | null;
          auditLogId: string | null;
          eventId: string | null;
          correlationId: string | null;
        };
        blockedActions: Array<{ action: string; reason: string }>;
      }>;
      agentPacket: {
        mode: string;
        blockedActions: Array<{ action: string }>;
      };
    };
  };
  const readbackProposal = routeProposalReadbackBody.data.proposals.find((proposal) => proposal.proposal.id === proposalDecision.id);
  assert.ok(readbackProposal);
  assert.equal(readbackProposal.proposal.sourceModel, "AgentEventOutbox");
  assert.equal(readbackProposal.proposal.sourceId, paperclipIntakeEvent.id);
  assert.equal(readbackProposal.proposal.targetDepartmentKey, "03-sprzedaz");
  assert.equal(readbackProposal.proposal.lifecycleState, "task_draft_created");
  assert.equal(readbackProposal.proposal.riskLevel, "medium");
  assert.equal(readbackProposal.proposal.ownerDecisionRequested, true);
  assert.equal(readbackProposal.effects.sourceMutated, false);
  assert.equal(readbackProposal.effects.agentEventAcknowledged, false);
  assert.equal(readbackProposal.effects.providerStateMutated, false);
  assert.equal(readbackProposal.effects.taskDraftCreated, true);
  assert.equal(readbackProposal.effects.auditRecorded, true);
  assert.equal(readbackProposal.effects.eventRecorded, true);
  assert.equal(readbackProposal.evidence.taskId, routeProposalBody.data.evidence.taskId);
  assert.equal(readbackProposal.evidence.auditLogId, routeProposalBody.data.evidence.auditLogId);
  assert.ok(readbackProposal.evidence.eventId);
  assert.ok(readbackProposal.evidence.correlationId);
  assert.ok(routeProposalReadbackBody.data.summary.total >= 1);
  assert.ok(routeProposalReadbackBody.data.summary.withTaskDraft >= 1);
  assert.ok(routeProposalReadbackBody.data.summary.withAuditEvidence >= 1);
  assert.ok(routeProposalReadbackBody.data.summary.withEventEvidence >= 1);
  assert.ok(routeProposalReadbackBody.data.summary.byTargetDepartment["03-sprzedaz"] >= 1);
  assert.equal(routeProposalReadbackBody.data.agentPacket.mode, "read_only");
  assert.ok(routeProposalReadbackBody.data.agentPacket.blockedActions.some((action) => action.action === "provider_write"));
  assert.ok(readbackProposal.blockedActions.some((action) => action.action === "approval_decision"));

  const foreignRouteProposal = await request("/v1/intake/actions/propose-route", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      sourceModel: "AgentEventOutbox",
      sourceId: foreignIntakeEvent.id,
      targetDepartmentKey: "04-operacje",
      classification: "route_to_department",
      reason: "Cross-workspace source should not be routable.",
      idempotencyKey: "foreign-source-route-test"
    })
  });
  assert.equal(foreignRouteProposal.status, 404);
  assert.equal((foreignRouteProposal.body as { error: string }).error, "intake_source_not_found");

  const invalidDepartmentProposal = await request("/v1/intake/actions/propose-route", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      sourceModel: "AgentEventOutbox",
      sourceId: paperclipIntakeEvent.id,
      targetDepartmentKey: "07-finance",
      classification: "route_to_department",
      reason: "Non-canonical department keys should be rejected.",
      idempotencyKey: "invalid-department-route-test"
    })
  });
  assert.equal(invalidDepartmentProposal.status, 400);

  await prisma.event.deleteMany({ where: { resourceId: proposalDecision.id } });
  await prisma.auditLog.deleteMany({ where: { resourceId: proposalDecision.id } });
  if (routeProposalBody.data.evidence.taskId) {
    await prisma.task.delete({ where: { id: routeProposalBody.data.evidence.taskId } });
  }
  await prisma.decision.delete({ where: { id: proposalDecision.id } });
  await prisma.risk.delete({ where: { id: highIntakeRisk.id } });
  await prisma.approval.delete({ where: { id: pendingIntakeApproval.id } });
  await prisma.externalFieldMapping.delete({ where: { id: unassignedField.id } });
  await prisma.externalContainerMapping.delete({ where: { id: unassignedContainer.id } });
  await prisma.googleDriveFile.delete({ where: { id: unassignedDriveFile.id } });
  await prisma.providerEventInbox.delete({ where: { id: failedProviderIntake.id } });
  await prisma.agentEventOutbox.deleteMany({
    where: { id: { in: [paperclipIntakeEvent.id, jarvisIntakeEvent.id, foreignIntakeEvent.id] } }
  });

  const commercialClient = await prisma.client.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Current discount client",
      email: "discount-client@example.com",
      status: "active",
      source: "companycore_test"
    }
  });
  const commercialDeal = await prisma.deal.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: commercialClient.id,
      title: "Current client service work",
      value: "1200.00",
      currency: "PLN",
      source: "companycore_test"
    }
  });
  const commercialApproval = await prisma.approval.create({
    data: {
      workspaceId: ownerA.workspace.id,
      requestedByType: "agent",
      requestedById: "paperclip",
      requestedForAction: "invoice.discount.apply 100% portfolio trial discount",
      resourceType: "deal",
      resourceId: commercialDeal.id,
      riskLevel: "high",
      decisionReason: "Portfolio trial for current client; owner review required before invoice."
    }
  });
  const commercialNote = await prisma.note.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: commercialClient.id,
      dealId: commercialDeal.id,
      content: "Apply 100% discount as portfolio trial evidence after delivery feedback loop.",
      source: "companycore_test"
    }
  });
  const missingSourceTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "100% discount candidate without client",
      description: "Free service request needs source, gross value, and owner decision.",
      source: "companycore_test"
    }
  });
  const commercialAgentEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      eventType: "paperclip_commercial_exception_candidate",
      targetAgent: "paperclip",
      payload: {
        clientName: "Current discount client",
        proposedDiscount: "100%",
        requestedAction: "discount_review"
      }
    }
  });
  const foreignCommercialNote = await prisma.note.create({
    data: {
      workspaceId: ownerB.workspace.id,
      content: "Foreign workspace 100% discount note must not leak.",
      source: "companycore_test"
    }
  });

  const commercialCountsBefore = {
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    agentEvents: await prisma.agentEventOutbox.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const commercialExceptions = await request("/v1/commercial-exceptions?limit=50", { headers: authA });
  assert.equal(commercialExceptions.status, 200);
  const commercialExceptionsBody = commercialExceptions.body as {
    data: {
      summary: {
        total: number;
        hundredPercentDiscounts: number;
        invoiceReadinessBlocked: number;
      };
      exceptions: Array<{
        sourceFamily: string;
        sourceId: string;
        status: string;
        clientId: string | null;
        dealId: string | null;
        grossValue: number | null;
        discountPercent: number | null;
        discountValue: number | null;
        finalValue: number | null;
        risk: string;
        riskFlags: string[];
        invoiceReadiness: string;
        allowedActions: string[];
        blockedActions: Array<{ action: string; reason: string }>;
      }>;
      agentPacket: {
        mode: string;
        blockedActions: Array<{ action: string; reason: string }>;
      };
    };
  };
  assert.ok(commercialExceptionsBody.data.summary.total >= 4);
  assert.ok(commercialExceptionsBody.data.summary.hundredPercentDiscounts >= 3);
  assert.ok(commercialExceptionsBody.data.summary.invoiceReadinessBlocked >= 1);
  const noteException = commercialExceptionsBody.data.exceptions.find((item) => item.sourceId === commercialNote.id);
  assert.ok(noteException);
  assert.equal(noteException.clientId, commercialClient.id);
  assert.equal(noteException.dealId, commercialDeal.id);
  assert.equal(noteException.grossValue, 1200);
  assert.equal(noteException.discountPercent, 100);
  assert.equal(noteException.discountValue, 1200);
  assert.equal(noteException.finalValue, 0);
  assert.equal(noteException.status, "needs_owner_decision");
  assert.ok(noteException.riskFlags.includes("missing_owner_approval"));
  assert.ok(noteException.blockedActions.some((action) => action.action === "send_invoice"));
  const approvalException = commercialExceptionsBody.data.exceptions.find((item) => item.sourceId === commercialApproval.id);
  assert.ok(approvalException);
  assert.equal(approvalException.sourceFamily, "approval");
  assert.equal(approvalException.dealId, commercialDeal.id);
  assert.equal(approvalException.discountPercent, 100);
  assert.ok(["needs_source", "needs_owner_decision"].includes(approvalException.status));
  const taskException = commercialExceptionsBody.data.exceptions.find((item) => item.sourceId === missingSourceTask.id);
  assert.ok(taskException);
  assert.equal(taskException.status, "needs_source");
  assert.ok(taskException.riskFlags.includes("missing_client"));
  assert.ok(taskException.riskFlags.includes("missing_gross_value"));
  assert.ok(commercialExceptionsBody.data.exceptions.some((item) => item.sourceId === commercialAgentEvent.id));
  assert.ok(!commercialExceptionsBody.data.exceptions.some((item) => item.sourceId === foreignCommercialNote.id));
  assert.equal(commercialExceptionsBody.data.agentPacket.mode, "read_only");
  assert.ok(commercialExceptionsBody.data.agentPacket.blockedActions.some((action) => action.action === "apply_discount"));

  const commercialClientFilter = await request(`/v1/commercial-exceptions?clientId=${commercialClient.id}`, { headers: authA });
  assert.equal(commercialClientFilter.status, 200);
  const commercialClientFilterBody = commercialClientFilter.body as {
    data: { exceptions: Array<{ clientId: string | null; sourceId: string }> };
  };
  assert.ok(commercialClientFilterBody.data.exceptions.length >= 1);
  assert.ok(commercialClientFilterBody.data.exceptions.every((item) => item.clientId === commercialClient.id));

  const commercialCountsAfter = {
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    agentEvents: await prisma.agentEventOutbox.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(commercialCountsAfter, commercialCountsBefore);
  const commercialApprovalAfterRead = await prisma.approval.findUniqueOrThrow({ where: { id: commercialApproval.id } });
  assert.equal(commercialApprovalAfterRead.status, "pending");

  const foreignCommercialExceptions = await request("/v1/commercial-exceptions?limit=50", { headers: authB });
  assert.equal(foreignCommercialExceptions.status, 200);
  const foreignCommercialExceptionsBody = foreignCommercialExceptions.body as {
    data: { exceptions: Array<{ sourceId: string }> };
  };
  assert.ok(!foreignCommercialExceptionsBody.data.exceptions.some((item) => item.sourceId === commercialNote.id));

  const commercialMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(commercialMcpManifest.status, 200);
  const commercialMcpManifestBody = commercialMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(commercialMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_commercial_exceptions"
    && tool.path === "/v1/commercial-exceptions"
    && tool.capability === "commercial-exceptions:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  const unauthenticatedFinanceContext = await request("/v1/finance/context");
  assert.equal(unauthenticatedFinanceContext.status, 401);
  const financeContext = await request("/v1/finance/context?market=CH&limit=50", { headers: authA });
  assert.equal(financeContext.status, 200);
  const financeContextBody = financeContext.body as {
    data: {
      summary: {
        candidatePricingModels: number;
        activePricingModels: number;
        needsOwnerDecision: number;
        openCommercialExceptions: number;
        invoiceReadinessBlocked: number;
      };
      pricingModels: Array<{
        id: string;
        name: string;
        market: string;
        currency: string;
        recurringFee: number | null;
        setupFee: number | null;
        status: string;
        ownerDecisionNeeded: boolean;
        riskFlags: string[];
      }>;
      hourlyValueAssumptions: Array<{ valuePerHour: number; status: string; riskFlags: string[] }>;
      commercialExceptions: Array<{ sourceId: string; discountPercent: number | null; finalValue: number | null }>;
      invoiceReadiness: Array<{ readinessStatus: string; blockedActions: Array<{ action: string }> }>;
      sourceConflicts: Array<{ type: string; status: string }>;
      agentPacket: { mode: string; blockedActions: Array<{ action: string }> };
    };
  };
  assert.ok(financeContextBody.data.summary.candidatePricingModels >= 1);
  assert.equal(financeContextBody.data.summary.activePricingModels, 0);
  assert.ok(financeContextBody.data.summary.needsOwnerDecision >= 2);
  assert.ok(financeContextBody.data.summary.openCommercialExceptions >= 1);
  assert.ok(financeContextBody.data.summary.invoiceReadinessBlocked >= 1);
  assert.ok(financeContextBody.data.pricingModels.some((model) => (
    model.id === "pricing:src-money-001:start-499-chf"
    && model.currency === "CHF"
    && model.recurringFee === 499
    && model.status === "needs_owner_decision"
  )));
  assert.ok(financeContextBody.data.pricingModels.some((model) => (
    model.id === "pricing:src-money-002:hybrid-1500-150-chf"
    && model.setupFee === 1500
    && model.recurringFee === 150
  )));
  assert.ok(financeContextBody.data.hourlyValueAssumptions.some((assumption) => (
    assumption.valuePerHour === 150
    && assumption.status === "needs_owner_decision"
    && assumption.riskFlags.includes("people_agents_capacity_missing")
  )));
  assert.ok(financeContextBody.data.commercialExceptions.some((item) => (
    item.sourceId === commercialNote.id
    && item.discountPercent === 100
    && item.finalValue === 0
  )));
  assert.ok(financeContextBody.data.invoiceReadiness.some((item) => (
    item.readinessStatus === "blocked"
    && item.blockedActions.some((action) => action.action === "send_invoice")
  )));
  assert.ok(financeContextBody.data.sourceConflicts.some((conflict) => (
    conflict.type === "pricing_policy_conflict"
    && conflict.status === "needs_owner_decision"
  )));
  assert.equal(financeContextBody.data.agentPacket.mode, "read_only");
  assert.ok(financeContextBody.data.agentPacket.blockedActions.some((action) => action.action === "set_active_price_policy"));

  const financeCountsAfter = {
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    deals: await prisma.deal.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    agentEvents: await prisma.agentEventOutbox.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(financeCountsAfter, {
    ...commercialCountsAfter,
    deals: 1
  });
  const foreignFinanceContext = await request("/v1/finance/context?limit=50", { headers: authB });
  assert.equal(foreignFinanceContext.status, 200);
  const foreignFinanceContextBody = foreignFinanceContext.body as {
    data: { commercialExceptions: Array<{ sourceId: string }> };
  };
  assert.ok(!foreignFinanceContextBody.data.commercialExceptions.some((item) => item.sourceId === commercialNote.id));

  const financeMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(financeMcpManifest.status, 200);
  const financeMcpManifestBody = financeMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(financeMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_finance_context"
    && tool.path === "/v1/finance/context"
    && tool.capability === "finance:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  const salesStage = await prisma.pipelineStage.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Discovery",
      position: 30,
      source: "companycore_test"
    }
  });
  await prisma.deal.update({
    where: { id: commercialDeal.id },
    data: { pipelineStageId: salesStage.id }
  });
  const salesInteraction = await prisma.interaction.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: commercialClient.id,
      type: "sales_follow_up",
      summary: "Follow up with current discount client about offer context.",
      source: "companycore_test"
    }
  });
  const salesTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Sales follow-up for current client",
      description: "Review offer, discount, pricing and next sales action.",
      status: "todo",
      priority: "high",
      source: "companycore_test"
    }
  });
  const salesArea = await prisma.operatingArea.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, key: "sales-crm" }
  });
  const salesDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "sales-drive-file",
      name: "Sales offer source document",
      description: "Offer, proposal, and client sales source.",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.example/sales",
      operatingAreaId: salesArea.id,
      syncStatus: "synced",
      scanStatus: "completed"
    }
  });
  const foreignSalesClient = await prisma.client.create({
    data: {
      workspaceId: ownerB.workspace.id,
      name: "Foreign sales client",
      source: "companycore_test"
    }
  });

  const unauthenticatedSalesContext = await request("/v1/sales/context");
  assert.equal(unauthenticatedSalesContext.status, 401);
  const salesCountsBefore = {
    clients: await prisma.client.count({ where: { workspaceId: ownerA.workspace.id } }),
    deals: await prisma.deal.count({ where: { workspaceId: ownerA.workspace.id } }),
    interactions: await prisma.interaction.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const salesContext = await request(`/v1/sales/context?clientId=${commercialClient.id}&limit=50`, { headers: authA });
  assert.equal(salesContext.status, 200);
  const salesContextBody = salesContext.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: {
        clients: number;
        openDeals: number;
        followUpTasks: number;
        commercialExceptions: number;
        hundredPercentDiscounts: number;
        currentClientWork: number;
        salesDriveFiles: number;
      };
      clients: Array<{ id: string; deals: Array<{ id: string; pipelineStageName: string | null }>; lastInteraction: { id: string } | null }>;
      deals: Array<{ id: string; commercialExceptionCount: number; pipelineStageName: string | null }>;
      pipelineStages: Array<{ id: string; name: string; dealCount: number }>;
      interactions: Array<{ id: string; clientName: string | null }>;
      followUpTasks: Array<{ id: string; title: string }>;
      commercialExceptions: Array<{ sourceId: string; discountPercent: number | null; finalValue: number | null }>;
      currentClientWork: Array<{ dealId: string; hundredPercentDiscount: boolean; riskFlags: string[] }>;
      salesDriveFiles: Array<{ id: string; operatingAreaKey: string | null }>;
      financeHandoff: { sourceConflicts: Array<{ type: string }>; requiredOwnerDecisions: string[] };
      agentPacket: { mode: string; safeActions: string[]; blockedActions: Array<{ action: string }> };
    };
  };
  assert.equal(salesContextBody.data.department.canonicalKey, "03-sprzedaz");
  assert.equal(salesContextBody.data.department.backendAreaKey, "sales-crm");
  assert.ok(salesContextBody.data.summary.clients >= 1);
  assert.ok(salesContextBody.data.summary.openDeals >= 1);
  assert.ok(salesContextBody.data.summary.followUpTasks >= 1);
  assert.ok(salesContextBody.data.summary.commercialExceptions >= 1);
  assert.ok(salesContextBody.data.summary.hundredPercentDiscounts >= 1);
  assert.ok(salesContextBody.data.summary.currentClientWork >= 1);
  assert.ok(salesContextBody.data.summary.salesDriveFiles >= 1);
  assert.ok(salesContextBody.data.clients.some((client) => (
    client.id === commercialClient.id
    && client.deals.some((deal) => deal.id === commercialDeal.id && deal.pipelineStageName === "Discovery")
    && client.lastInteraction?.id === salesInteraction.id
  )));
  assert.ok(salesContextBody.data.deals.some((deal) => (
    deal.id === commercialDeal.id
    && deal.commercialExceptionCount >= 1
    && deal.pipelineStageName === "Discovery"
  )));
  assert.ok(salesContextBody.data.pipelineStages.some((stage) => stage.id === salesStage.id && stage.dealCount >= 1));
  assert.ok(salesContextBody.data.interactions.some((interaction) => interaction.id === salesInteraction.id));
  assert.ok(salesContextBody.data.followUpTasks.some((task) => task.id === salesTask.id));
  assert.ok(salesContextBody.data.commercialExceptions.some((item) => (
    item.sourceId === commercialNote.id
    && item.discountPercent === 100
    && item.finalValue === 0
  )));
  assert.ok(salesContextBody.data.currentClientWork.some((work) => (
    work.dealId === commercialDeal.id
    && work.hundredPercentDiscount
    && work.riskFlags.includes("hundred_percent_discount_requires_owner_review")
  )));
  assert.ok(salesContextBody.data.salesDriveFiles.some((file) => (
    file.id === salesDriveFile.id
    && file.operatingAreaKey === "sales-crm"
  )));
  assert.ok(salesContextBody.data.financeHandoff.requiredOwnerDecisions.some((decision) => decision.includes("pricing policy")));
  assert.equal(salesContextBody.data.agentPacket.mode, "read_only");
  assert.ok(salesContextBody.data.agentPacket.safeActions.includes("read_sales_context"));
  assert.ok(salesContextBody.data.agentPacket.blockedActions.some((action) => action.action === "quote_final_terms"));
  assert.ok(salesContextBody.data.agentPacket.blockedActions.some((action) => action.action === "send_outreach"));
  const salesCountsAfter = {
    clients: await prisma.client.count({ where: { workspaceId: ownerA.workspace.id } }),
    deals: await prisma.deal.count({ where: { workspaceId: ownerA.workspace.id } }),
    interactions: await prisma.interaction.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(salesCountsAfter, salesCountsBefore);
  const foreignSalesContext = await request("/v1/sales/context?limit=50", { headers: authB });
  assert.equal(foreignSalesContext.status, 200);
  const foreignSalesContextBody = foreignSalesContext.body as {
    data: { clients: Array<{ id: string }>; deals: Array<{ id: string }> };
  };
  assert.ok(foreignSalesContextBody.data.clients.some((client) => client.id === foreignSalesClient.id));
  assert.ok(!foreignSalesContextBody.data.clients.some((client) => client.id === commercialClient.id));
  assert.ok(!foreignSalesContextBody.data.deals.some((deal) => deal.id === commercialDeal.id));
  const salesMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(salesMcpManifest.status, 200);
  const salesMcpManifestBody = salesMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(salesMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_sales_context"
    && tool.path === "/v1/sales/context"
    && tool.capability === "sales:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  await prisma.googleDriveFile.delete({ where: { id: salesDriveFile.id } });
  await prisma.interaction.delete({ where: { id: salesInteraction.id } });
  await prisma.task.delete({ where: { id: salesTask.id } });
  await prisma.deal.update({
    where: { id: commercialDeal.id },
    data: { pipelineStageId: null }
  });
  await prisma.pipelineStage.delete({ where: { id: salesStage.id } });
  await prisma.client.delete({ where: { id: foreignSalesClient.id } });

  await prisma.agentEventOutbox.delete({ where: { id: commercialAgentEvent.id } });
  await prisma.task.delete({ where: { id: missingSourceTask.id } });
  await prisma.approval.delete({ where: { id: commercialApproval.id } });
  await prisma.note.deleteMany({ where: { id: { in: [commercialNote.id, foreignCommercialNote.id] } } });
  await prisma.deal.delete({ where: { id: commercialDeal.id } });
  await prisma.client.delete({ where: { id: commercialClient.id } });

  const operationsProcedure = await prisma.procedure.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operations weekly planning",
      purpose: "Plan weekly operations, dependencies, approvals, and handoffs.",
      status: "active",
      requiredTools: ["companycore"],
      requiredPermissions: ["company-os:read"],
      expectedResult: "Owner has an approved operations plan."
    }
  });
  const operationsStep = await prisma.procedureStep.create({
    data: {
      procedureId: operationsProcedure.id,
      stepOrder: 1,
      instruction: "Review blocked dependencies and pending approvals.",
      stepType: "manual"
    }
  });
  const operationsBusinessFunction = await prisma.businessFunction.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operations planning and control",
      category: "operations",
      description: "Keeps routines, dependencies, and handoffs under control.",
      status: "active"
    }
  });
  const operationsProject = await prisma.project.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operations execution project",
      description: "Work item project context for Operations.",
      status: "active"
    }
  });
  const operationsTaskList = await prisma.taskList.create({
    data: {
      workspaceId: ownerA.workspace.id,
      projectId: operationsProject.id,
      name: "Operations backlog",
      status: "active"
    }
  });
  const workspaceAForOperations = await prisma.workspace.findUniqueOrThrow({
    where: { id: ownerA.workspace.id }
  });
  const operationsResource = await prisma.resource.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "system",
      name: "Operations calendar",
      relatedProjectId: operationsProject.id
    }
  });
  const operationsDependency = await prisma.dependency.create({
    data: {
      workspaceId: ownerA.workspace.id,
      dependencyType: "routine_blocker",
      fromResourceId: operationsResource.id,
      toEntityType: "procedure",
      toEntityId: operationsProcedure.id,
      status: "blocked",
      metadata: { blocker: "Owner needs to confirm cadence." }
    }
  });
  const operationsApproval = await prisma.approval.create({
    data: {
      workspaceId: ownerA.workspace.id,
      requestedByType: "agent",
      requestedById: "paperclip",
      requestedForAction: "operations.weekly_plan.approve",
      resourceType: "procedure",
      resourceId: operationsProcedure.id,
      riskLevel: "medium"
    }
  });
  const operationsTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      projectId: operationsProject.id,
      taskListId: operationsTaskList.id,
      title: "Operations procedure review",
      description: "Review SOP, dependency, and approval context.",
      status: "in_progress",
      priority: "high",
      dueDate: new Date("2026-05-19T00:00:00.000Z"),
      startDate: new Date("2026-05-18T00:00:00.000Z"),
      estimatedEndDate: new Date("2026-05-20T00:00:00.000Z"),
      estimatedDurationMinutes: 90,
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=1",
      ownerUserId: workspaceAForOperations.ownerUserId,
      assignedWorkforceEntityId: userBackedWorkforce.id,
      reviewerUserId: workspaceAForOperations.ownerUserId
    }
  });
  const operationsTaskDependency = await prisma.dependency.create({
    data: {
      workspaceId: ownerA.workspace.id,
      dependencyType: "task_blocker",
      fromEntityType: "task",
      fromEntityId: operationsTask.id,
      toEntityType: "procedure",
      toEntityId: operationsProcedure.id,
      status: "blocked",
      metadata: { blocker: "Procedure review is waiting on owner confirmation." }
    }
  });
  const operationsTaskNote = await prisma.note.create({
    data: {
      workspaceId: ownerA.workspace.id,
      taskId: operationsTask.id,
      projectId: operationsProject.id,
      content: "Operations work item needs procedure evidence before execution.",
      status: "active"
    }
  });
  const operationsTaskEvent = await prisma.event.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "operations.task.reviewed",
      source: "companycore",
      taskId: operationsTask.id,
      resourceType: "task",
      resourceId: operationsTask.id,
      correlationId: "operations-work-item-proof-001"
    }
  });
  const operationsPipeline = await prisma.pipeline.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operations execution pipeline",
      purpose: "Move operational work through review and execution.",
      status: "active"
    }
  });
  const operationsPipelineStage = await prisma.pipelineStage.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: operationsPipeline.id,
      procedureId: operationsProcedure.id,
      name: "Review",
      status: "active",
      position: 1
    }
  });
  const operationsPipelineRun = await prisma.pipelineRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: operationsPipeline.id,
      currentStageId: operationsPipelineStage.id,
      initiatedByType: "user",
      status: "running",
      linkedTaskIds: [operationsTask.id],
      linkedProjectId: operationsProject.id,
      correlationId: "operations-work-item-proof-001"
    }
  });
  const operationsStageRun = await prisma.stageRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineRunId: operationsPipelineRun.id,
      pipelineStageId: operationsPipelineStage.id,
      status: "running",
      approvalStatus: "pending"
    }
  });
  const operationsAgent = await prisma.agent.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operations reviewer",
      role: "operations-review"
    }
  });
  const operationsAgentLog = await prisma.agentLog.create({
    data: {
      workspaceId: ownerA.workspace.id,
      agentId: operationsAgent.id,
      level: "info",
      message: "Reviewed operations task evidence.",
      metadata: { taskId: operationsTask.id }
    }
  });
  const existingOperationsArea = await prisma.operatingArea.findFirst({
    where: { workspaceId: ownerA.workspace.id, key: "operations-administration" }
  });
  const operationsArea = existingOperationsArea ?? await prisma.operatingArea.create({
    data: {
      workspaceId: ownerA.workspace.id,
      key: "operations-administration",
      name: "Operations Administration",
      description: "Operations area for work item evidence.",
      position: 4,
      isSystem: true
    }
  });
  const createdOperationsArea = !existingOperationsArea;
  const operationsDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: operationsArea.id,
      provider: "google_drive",
      externalId: "operations-work-item-proof-drive-file",
      name: "Operations SOP",
      description: "Procedure evidence for operations work items.",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.example/operations-sop",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const foreignOperationsProcedure = await prisma.procedure.create({
    data: {
      workspaceId: ownerB.workspace.id,
      name: "Foreign operations procedure",
      purpose: "Must not leak into workspace A operations context.",
      status: "active"
    }
  });

  const unauthenticatedOperationsContext = await request("/v1/operations/context");
  assert.equal(unauthenticatedOperationsContext.status, 401);
  const operationsCountsBefore = {
    procedures: await prisma.procedure.count({ where: { workspaceId: ownerA.workspace.id } }),
    procedureSteps: await prisma.procedureStep.count({ where: { procedure: { workspaceId: ownerA.workspace.id } } }),
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    dependencies: await prisma.dependency.count({ where: { workspaceId: ownerA.workspace.id } }),
    businessFunctions: await prisma.businessFunction.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const operationsContext = await request("/v1/operations/context", { headers: authA });
  assert.equal(operationsContext.status, 200);
  const operationsContextBody = operationsContext.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: {
        procedures: number;
        activeProcedures: number;
        procedureSteps: number;
        pendingApprovals: number;
        blockedDependencies: number;
        activeBusinessFunctions: number;
        operationalTasks: number;
      };
      procedures: Array<{ id: string; steps: Array<{ id: string; instruction: string }> }>;
      approvals: Array<{ id: string; requestedForAction: string; status: string }>;
      dependencies: Array<{ id: string; status: string; type: string }>;
      businessFunctions: Array<{ id: string; name: string }>;
      tasks: Array<{ id: string; title: string }>;
      agentPacket: { mode: string; allowedActions: string[]; blockedActions: Array<{ action: string }> };
    };
  };
  assert.equal(operationsContextBody.data.department.canonicalKey, "04-operacje");
  assert.equal(operationsContextBody.data.department.backendAreaKey, "operations-administration");
  assert.ok(operationsContextBody.data.summary.procedures >= 1);
  assert.ok(operationsContextBody.data.summary.activeProcedures >= 1);
  assert.ok(operationsContextBody.data.summary.procedureSteps >= 1);
  assert.ok(operationsContextBody.data.summary.pendingApprovals >= 1);
  assert.ok(operationsContextBody.data.summary.blockedDependencies >= 1);
  assert.ok(operationsContextBody.data.summary.activeBusinessFunctions >= 1);
  assert.ok(operationsContextBody.data.summary.operationalTasks >= 1);
  assert.ok(operationsContextBody.data.procedures.some((procedure) => (
    procedure.id === operationsProcedure.id
    && procedure.steps.some((step) => step.id === operationsStep.id)
  )));
  assert.ok(operationsContextBody.data.approvals.some((approval) => approval.id === operationsApproval.id));
  assert.ok(operationsContextBody.data.dependencies.some((dependency) => dependency.id === operationsDependency.id));
  assert.ok(operationsContextBody.data.businessFunctions.some((businessFunction) => businessFunction.id === operationsBusinessFunction.id));
  assert.ok(operationsContextBody.data.tasks.some((task) => task.id === operationsTask.id));
  assert.equal(operationsContextBody.data.agentPacket.mode, "read_only");
  assert.ok(operationsContextBody.data.agentPacket.allowedActions.includes("read_operations_context"));
  assert.ok(operationsContextBody.data.agentPacket.blockedActions.some((action) => action.action === "create_or_change_procedure"));
  const operationsCountsAfter = {
    procedures: await prisma.procedure.count({ where: { workspaceId: ownerA.workspace.id } }),
    procedureSteps: await prisma.procedureStep.count({ where: { procedure: { workspaceId: ownerA.workspace.id } } }),
    approvals: await prisma.approval.count({ where: { workspaceId: ownerA.workspace.id } }),
    dependencies: await prisma.dependency.count({ where: { workspaceId: ownerA.workspace.id } }),
    businessFunctions: await prisma.businessFunction.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(operationsCountsAfter, operationsCountsBefore);
  const foreignOperationsContext = await request("/v1/operations/context", { headers: authB });
  assert.equal(foreignOperationsContext.status, 200);
  const foreignOperationsContextBody = foreignOperationsContext.body as {
    data: { procedures: Array<{ id: string }> };
  };
  assert.ok(foreignOperationsContextBody.data.procedures.some((procedure) => procedure.id === foreignOperationsProcedure.id));
  assert.ok(!foreignOperationsContextBody.data.procedures.some((procedure) => procedure.id === operationsProcedure.id));
  const operationsMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(operationsMcpManifest.status, 200);
  const operationsMcpManifestBody = operationsMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(operationsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_operations_context"
    && tool.path === "/v1/operations/context"
    && tool.capability === "operations:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(operationsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_operations_work_items"
    && tool.path === "/v1/operations/work-items"
    && tool.capability === "operations:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(operationsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_post_operations_work_items"
    && tool.path === "/v1/operations/work-items"
    && tool.capability === "operations:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));
  assert.ok(operationsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_dashboard_command"
    && tool.path === "/v1/dashboard/command"
    && tool.capability === "dashboard:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  const dashboardCommand = await request("/v1/dashboard/command", { headers: authA });
  assert.equal(dashboardCommand.status, 200);
  const dashboardCommandBody = dashboardCommand.body as {
    data: {
      summary: { openTasks: number; pendingApprovals: number; workforceEntities: number; driveFiles: number };
      departmentSignals: Array<{ key: string; health: string; count: number; href: string }>;
      priorityItems: Array<{ id: string; title: string; source: string }>;
      nextActions: Array<{ key: string; label: string; count: number }>;
      blockedActions: Array<{ action: string; reason: string }>;
      agentPacket: { mode: string; blockedActions: string[] };
    };
  };
  assert.ok(dashboardCommandBody.data.summary.openTasks >= 1);
  assert.ok(dashboardCommandBody.data.summary.pendingApprovals >= 1);
  assert.ok(dashboardCommandBody.data.summary.workforceEntities >= 1);
  assert.ok(dashboardCommandBody.data.summary.driveFiles >= 1);
  assert.ok(dashboardCommandBody.data.departmentSignals.some((signal) => (
    signal.key === "04-operacje"
    && signal.href === "/areas?area=04-operacje&view=tasks"
  )));
  assert.ok(Array.isArray(dashboardCommandBody.data.priorityItems));
  assert.ok(dashboardCommandBody.data.nextActions.some((action) => action.key === "review_approvals"));
  assert.ok(dashboardCommandBody.data.blockedActions.some((action) => action.action === "assign_human_or_agent_from_dashboard"));
  assert.equal(dashboardCommandBody.data.agentPacket.mode, "read_only_command_center");

  const operationsWorkItemCountsBefore = {
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    dependencies: await prisma.dependency.count({ where: { workspaceId: ownerA.workspace.id } }),
    pipelineRuns: await prisma.pipelineRun.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } }),
    agentLogs: await prisma.agentLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    googleDriveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const operationsWorkItems = await request("/v1/operations/work-items?limit=50", { headers: authA });
  assert.equal(operationsWorkItems.status, 200);
  const operationsWorkItemsBody = operationsWorkItems.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: {
        total: number;
        open: number;
        blocked: number;
        withPipelineRunEvidence: number;
        withDependencyEvidence: number;
        withNotes: number;
        withEvents: number;
      };
      operationsKnowledge: {
        area: { id: string; key: string } | null;
        driveFiles: Array<{ id: string; name: string; syncStatus: string; scanStatus: string }>;
      };
      operatingAreas: Array<{ id: string; key: string; name: string }>;
      departments: Array<{ key: string; backendAreaKey: string; operatingArea?: { id: string; key: string } | null }>;
      taskLists: Array<{ id: string; name: string; source: string | null; taskCount: number; areaAssignment?: { department?: { key: string } | null; area?: { id: string; key: string } | null } | null }>;
      assignmentOptions: {
        users: Array<{ id: string; name: string | null; email: string }>;
        workforceEntities: Array<{ id: string; name: string; type: string }>;
      };
      statuses: Array<{ key: string; label: string }>;
      workItems: Array<{
        task: {
          id: string;
          status: string;
          normalizedStatus: string;
          dueDate: string | null;
          startDate: string | null;
          estimatedEndDate: string | null;
          completedAt: string | null;
          estimatedDurationMinutes: number | null;
          recurrenceRule: string | null;
        };
        responsibility: {
          status: string;
          ownerUserId: string | null;
          assignedWorkforceEntityId: string | null;
          reviewerUserId: string | null;
          assignedWorkforceEntity: { id: string; name: string } | null;
          evidence: Array<{ id: string; agentName: string | null }>;
        };
        hierarchy: { project: { id: string; name: string } | null; taskList: { id: string; name: string } | null };
        operationalContext: { pipelineRuns: Array<{ id: string; currentStage: { procedure: { id: string } | null } | null; stageRuns: Array<{ id: string }> }> };
        readiness: { blocked: boolean; dependencyCount: number; riskLevel: string; missingFields: string[] };
        evidence: {
          notes: Array<{ id: string; content: string }>;
          events: Array<{ id: string; correlationId: string | null }>;
          dependencies: Array<{ id: string; status: string }>;
          projectResources: Array<{ id: string; name: string }>;
        };
      }>;
      agentPacket: {
        mode: string;
        allowedReadActions: string[];
        availableWriteCommands: string[];
        requiredCapabilities: Record<string, string>;
        blockedActions: Array<{ action: string }>;
      };
    };
  };
  assert.equal(operationsWorkItemsBody.data.department.canonicalKey, "04-operacje");
  assert.equal(operationsWorkItemsBody.data.department.backendAreaKey, "operations-administration");
  assert.ok(operationsWorkItemsBody.data.summary.total >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.open >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.blocked >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.withPipelineRunEvidence >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.withDependencyEvidence >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.withNotes >= 1);
  assert.ok(operationsWorkItemsBody.data.summary.withEvents >= 1);
  assert.ok(operationsWorkItemsBody.data.operationsKnowledge.driveFiles.some((file) => (
    file.id === operationsDriveFile.id
    && file.syncStatus === "synced"
    && file.scanStatus === "scanned"
  )));
  assert.ok(operationsWorkItemsBody.data.operatingAreas.some((area) => area.id === operationsArea.id));
  assert.ok(operationsWorkItemsBody.data.departments.some((department) => (
    department.key === "04-operacje"
    && department.backendAreaKey === "operations-administration"
    && department.operatingArea?.id === operationsArea.id
  )));
  assert.ok(operationsWorkItemsBody.data.taskLists.some((list) => (
    list.id === operationsTaskList.id
    && list.name === "Operations backlog"
    && list.taskCount >= 1
  )));
  assert.ok(operationsWorkItemsBody.data.taskLists.some((list) => list.id === "unassigned"));
  assert.ok(operationsWorkItemsBody.data.assignmentOptions.users.some((user) => user.id === workspaceAForOperations.ownerUserId));
  assert.ok(operationsWorkItemsBody.data.assignmentOptions.workforceEntities.some((entity) => entity.id === userBackedWorkforce.id));
  assert.deepEqual(
    operationsWorkItemsBody.data.statuses.map((status) => status.key),
    ["todo", "in_progress", "blocked", "done", "archived"]
  );
  assert.ok(!operationsWorkItemsBody.data.statuses.some((status) => status.key === "backlog"));
  const operationsWorkItem = operationsWorkItemsBody.data.workItems.find((item) => item.task.id === operationsTask.id);
  assert.ok(operationsWorkItem);
  assert.equal(operationsWorkItem.task.status, "in_progress");
  assert.equal(operationsWorkItem.task.normalizedStatus, "in_progress");
  assert.equal(operationsWorkItem.task.dueDate, "2026-05-19T00:00:00.000Z");
  assert.equal(operationsWorkItem.task.startDate, "2026-05-18T00:00:00.000Z");
  assert.equal(operationsWorkItem.task.estimatedEndDate, "2026-05-20T00:00:00.000Z");
  assert.equal(operationsWorkItem.task.estimatedDurationMinutes, 90);
  assert.equal(operationsWorkItem.task.recurrenceRule, "FREQ=WEEKLY;INTERVAL=1");
  assert.equal(operationsWorkItem.responsibility.status, "modeled");
  assert.equal(operationsWorkItem.responsibility.ownerUserId, workspaceAForOperations.ownerUserId);
  assert.equal(operationsWorkItem.responsibility.assignedWorkforceEntityId, userBackedWorkforce.id);
  assert.equal(operationsWorkItem.responsibility.reviewerUserId, workspaceAForOperations.ownerUserId);
  assert.equal(operationsWorkItem.responsibility.assignedWorkforceEntity?.id, userBackedWorkforce.id);
  assert.ok(operationsWorkItem.responsibility.evidence.some((log) => log.id === operationsAgentLog.id));
  assert.equal(operationsWorkItem.hierarchy.project?.id, operationsProject.id);
  assert.equal(operationsWorkItem.hierarchy.taskList?.id, operationsTaskList.id);
  assert.ok(operationsWorkItem.operationalContext.pipelineRuns.some((run) => (
    run.id === operationsPipelineRun.id
    && run.currentStage?.procedure?.id === operationsProcedure.id
    && run.stageRuns.some((stageRun) => stageRun.id === operationsStageRun.id)
  )));
  assert.equal(operationsWorkItem.readiness.blocked, true);
  assert.equal(operationsWorkItem.readiness.dependencyCount, 1);
  assert.equal(operationsWorkItem.readiness.riskLevel, "high");
  assert.ok(!operationsWorkItem.readiness.missingFields.includes("owner_user_id"));
  assert.ok(!operationsWorkItem.readiness.missingFields.includes("assigned_workforce_entity_id"));
  assert.ok(!operationsWorkItem.readiness.missingFields.includes("reviewer_user_id"));
  assert.ok(!operationsWorkItem.readiness.missingFields.includes("estimated_duration_minutes"));
  assert.ok(operationsWorkItem.evidence.dependencies.some((dependency) => dependency.id === operationsTaskDependency.id));
  assert.ok(operationsWorkItem.evidence.notes.some((note) => note.id === operationsTaskNote.id));
  assert.ok(operationsWorkItem.evidence.events.some((event) => event.id === operationsTaskEvent.id));
  assert.ok(operationsWorkItem.evidence.projectResources.some((resource) => resource.id === operationsResource.id));
  assert.equal(operationsWorkItemsBody.data.agentPacket.mode, "read_with_domain_commands");
  assert.ok(operationsWorkItemsBody.data.agentPacket.allowedReadActions.includes("read_operations_work_items"));
  assert.ok(operationsWorkItemsBody.data.agentPacket.availableWriteCommands.includes("assign_owner_reviewer_or_workforce_entity"));
  assert.ok(operationsWorkItemsBody.data.agentPacket.availableWriteCommands.includes("schedule_work_item"));
  assert.equal(operationsWorkItemsBody.data.agentPacket.requiredCapabilities.assign_owner_reviewer_or_workforce_entity, "operations:write");
  assert.equal(operationsWorkItemsBody.data.agentPacket.requiredCapabilities.schedule_work_item, "operations:write");
  const operationsWorkItemCountsAfter = {
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    dependencies: await prisma.dependency.count({ where: { workspaceId: ownerA.workspace.id } }),
    pipelineRuns: await prisma.pipelineRun.count({ where: { workspaceId: ownerA.workspace.id } }),
    notes: await prisma.note.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } }),
    agentLogs: await prisma.agentLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    googleDriveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(operationsWorkItemCountsAfter, operationsWorkItemCountsBefore);

  const createdOperationsWorkItem = await request("/v1/operations/work-items", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      title: "Operations command-created task",
      description: "Created through the Operations work item adapter.",
      status: "todo",
      priority: "normal",
      dueDate: "2026-05-21T00:00:00.000Z",
      startDate: "2026-05-20T00:00:00.000Z",
      estimatedEndDate: "2026-05-22T00:00:00.000Z",
      estimatedDurationMinutes: 45,
      recurrenceRule: "FREQ=DAILY;INTERVAL=1",
      projectId: operationsProject.id,
      taskListId: operationsTaskList.id,
      ownerUserId: workspaceAForOperations.ownerUserId,
      assignedWorkforceEntityId: userBackedWorkforce.id,
      reviewerUserId: workspaceAForOperations.ownerUserId
    })
  });
  assert.equal(createdOperationsWorkItem.status, 201);
  const createdOperationsWorkItemBody = createdOperationsWorkItem.body as {
    data: {
      id: string;
      title: string;
      source: string | null;
      taskListId: string | null;
      projectId: string | null;
      startDate: string | null;
      estimatedEndDate: string | null;
      estimatedDurationMinutes: number | null;
      recurrenceRule: string | null;
      ownerUserId: string | null;
      assignedWorkforceEntityId: string | null;
      reviewerUserId: string | null;
    };
  };
  assert.equal(createdOperationsWorkItemBody.data.title, "Operations command-created task");
  assert.equal(createdOperationsWorkItemBody.data.source, "companycore");
  assert.equal(createdOperationsWorkItemBody.data.taskListId, operationsTaskList.id);
  assert.equal(createdOperationsWorkItemBody.data.projectId, operationsProject.id);
  assert.equal(createdOperationsWorkItemBody.data.startDate, "2026-05-20T00:00:00.000Z");
  assert.equal(createdOperationsWorkItemBody.data.estimatedEndDate, "2026-05-22T00:00:00.000Z");
  assert.equal(createdOperationsWorkItemBody.data.estimatedDurationMinutes, 45);
  assert.equal(createdOperationsWorkItemBody.data.recurrenceRule, "FREQ=DAILY;INTERVAL=1");
  assert.equal(createdOperationsWorkItemBody.data.ownerUserId, workspaceAForOperations.ownerUserId);
  assert.equal(createdOperationsWorkItemBody.data.assignedWorkforceEntityId, userBackedWorkforce.id);
  assert.equal(createdOperationsWorkItemBody.data.reviewerUserId, workspaceAForOperations.ownerUserId);
  const operationsWorkItemCreatedEvent = await prisma.event.findFirst({
    where: {
      workspaceId: ownerA.workspace.id,
      taskId: createdOperationsWorkItemBody.data.id,
      type: "operations_work_item_created"
    }
  });
  assert.ok(operationsWorkItemCreatedEvent);
  const foreignOperationsCreate = await request("/v1/operations/work-items", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      title: "Foreign workspace cannot use A task list",
      taskListId: operationsTaskList.id
    })
  });
  assert.equal(foreignOperationsCreate.status, 404);
  await prisma.event.deleteMany({ where: { taskId: createdOperationsWorkItemBody.data.id } });
  await prisma.task.delete({ where: { id: createdOperationsWorkItemBody.data.id } });

  const foreignOperationsWorkItems = await request("/v1/operations/work-items?limit=50", { headers: authB });
  assert.equal(foreignOperationsWorkItems.status, 200);
  const foreignOperationsWorkItemsBody = foreignOperationsWorkItems.body as {
    data: { workItems: Array<{ task: { id: string } }> };
  };
  assert.ok(!foreignOperationsWorkItemsBody.data.workItems.some((item) => item.task.id === operationsTask.id));

  const filteredOperationsWorkItems = await request(`/v1/operations/work-items?taskListId=${operationsTaskList.id}`, { headers: authA });
  assert.equal(filteredOperationsWorkItems.status, 200);
  const filteredOperationsWorkItemsBody = filteredOperationsWorkItems.body as {
    data: { workItems: Array<{ task: { id: string } }> };
  };
  assert.ok(filteredOperationsWorkItemsBody.data.workItems.some((item) => item.task.id === operationsTask.id));

  const patchedOperationsWorkItem = await request(`/v1/operations/work-items/${operationsTask.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      title: "Operations procedure review updated",
      description: "Updated through the Operations work item adapter.",
      status: "done",
      priority: "critical",
      dueDate: "2026-05-20T00:00:00.000Z",
      startDate: "2026-05-20T00:00:00.000Z",
      estimatedEndDate: "2026-05-21T00:00:00.000Z",
      estimatedDurationMinutes: 120,
      recurrenceRule: "FREQ=MONTHLY;INTERVAL=1",
      ownerUserId: workspaceAForOperations.ownerUserId,
      assignedWorkforceEntityId: userBackedWorkforce.id,
      reviewerUserId: workspaceAForOperations.ownerUserId,
      taskListId: operationsTaskList.id
    })
  });
  assert.equal(patchedOperationsWorkItem.status, 200);
  const patchedOperationsWorkItemBody = patchedOperationsWorkItem.body as {
    data: {
      id: string;
      title: string;
      status: string;
      priority: string | null;
      dueDate: string | null;
      startDate: string | null;
      estimatedEndDate: string | null;
      estimatedDurationMinutes: number | null;
      recurrenceRule: string | null;
      ownerUserId: string | null;
      assignedWorkforceEntityId: string | null;
      reviewerUserId: string | null;
    };
  };
  assert.equal(patchedOperationsWorkItemBody.data.id, operationsTask.id);
  assert.equal(patchedOperationsWorkItemBody.data.title, "Operations procedure review updated");
  assert.equal(patchedOperationsWorkItemBody.data.status, "done");
  assert.equal(patchedOperationsWorkItemBody.data.priority, "critical");
  assert.equal(patchedOperationsWorkItemBody.data.dueDate, "2026-05-20T00:00:00.000Z");
  assert.equal(patchedOperationsWorkItemBody.data.startDate, "2026-05-20T00:00:00.000Z");
  assert.equal(patchedOperationsWorkItemBody.data.estimatedEndDate, "2026-05-21T00:00:00.000Z");
  assert.equal(patchedOperationsWorkItemBody.data.estimatedDurationMinutes, 120);
  assert.equal(patchedOperationsWorkItemBody.data.recurrenceRule, "FREQ=MONTHLY;INTERVAL=1");
  assert.equal(patchedOperationsWorkItemBody.data.ownerUserId, workspaceAForOperations.ownerUserId);
  assert.equal(patchedOperationsWorkItemBody.data.assignedWorkforceEntityId, userBackedWorkforce.id);
  assert.equal(patchedOperationsWorkItemBody.data.reviewerUserId, workspaceAForOperations.ownerUserId);
  const updatedOperationsTask = await prisma.task.findUniqueOrThrow({ where: { id: operationsTask.id } });
  assert.equal(updatedOperationsTask.title, "Operations procedure review updated");
  assert.equal(updatedOperationsTask.status, "done");
  assert.equal(updatedOperationsTask.startDate?.toISOString(), "2026-05-20T00:00:00.000Z");
  assert.equal(updatedOperationsTask.estimatedEndDate?.toISOString(), "2026-05-21T00:00:00.000Z");
  assert.equal(updatedOperationsTask.estimatedDurationMinutes, 120);
  assert.equal(updatedOperationsTask.recurrenceRule, "FREQ=MONTHLY;INTERVAL=1");
  assert.equal(updatedOperationsTask.ownerUserId, workspaceAForOperations.ownerUserId);
  assert.equal(updatedOperationsTask.assignedWorkforceEntityId, userBackedWorkforce.id);
  assert.equal(updatedOperationsTask.reviewerUserId, workspaceAForOperations.ownerUserId);
  const operationsWorkItemUpdatedEvent = await prisma.event.findFirst({
    where: {
      workspaceId: ownerA.workspace.id,
      taskId: operationsTask.id,
      type: "operations_work_item_updated"
    }
  });
  assert.ok(operationsWorkItemUpdatedEvent);
  await prisma.event.delete({ where: { id: operationsWorkItemUpdatedEvent.id } });

  const patchedOperationsTaskList = await request(`/v1/operations/task-lists/${operationsTaskList.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      name: "Operations execution list",
      description: "Mapped from Operations UI.",
      status: "active",
      departmentKey: "04-operacje"
    })
  });
  assert.equal(patchedOperationsTaskList.status, 200);
  const patchedOperationsTaskListBody = patchedOperationsTaskList.body as {
    data: { id: string; name: string; areaAssignment?: { department?: { key: string } | null; area?: { id: string } | null } | null };
  };
  assert.equal(patchedOperationsTaskListBody.data.id, operationsTaskList.id);
  assert.equal(patchedOperationsTaskListBody.data.name, "Operations execution list");
  assert.equal(patchedOperationsTaskListBody.data.areaAssignment?.department?.key, "04-operacje");
  assert.equal(patchedOperationsTaskListBody.data.areaAssignment?.area?.id, operationsArea.id);
  const operationsTaskListMapping = await prisma.externalContainerMapping.findFirst({
    where: {
      workspaceId: ownerA.workspace.id,
      provider: "companycore",
      entityType: "task_list",
      externalId: operationsTaskList.id,
      areaId: operationsArea.id
    }
  });
  assert.ok(operationsTaskListMapping);
  assert.equal((operationsTaskListMapping.raw as { manualDepartmentKey?: string } | null)?.manualDepartmentKey, "04-operacje");
  const operationsTaskListUpdatedEvent = await prisma.event.findFirst({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "operations_task_list_updated"
    }
  });
  assert.ok(operationsTaskListUpdatedEvent);
  await prisma.event.delete({ where: { id: operationsTaskListUpdatedEvent.id } });

  const foreignPatchOperationsTaskList = await request(`/v1/operations/task-lists/${operationsTaskList.id}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({ name: "Must not cross workspaces" })
  });
  assert.equal(foreignPatchOperationsTaskList.status, 404);

  const foreignPatchOperationsWorkItem = await request(`/v1/operations/work-items/${operationsTask.id}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({ title: "Must not cross workspaces" })
  });
  assert.equal(foreignPatchOperationsWorkItem.status, 404);

  await prisma.googleDriveFile.delete({ where: { id: operationsDriveFile.id } });
  if (createdOperationsArea) {
    await prisma.operatingArea.delete({ where: { id: operationsArea.id } });
  }
  await prisma.stageRun.delete({ where: { id: operationsStageRun.id } });
  await prisma.pipelineRun.delete({ where: { id: operationsPipelineRun.id } });
  await prisma.pipelineStage.delete({ where: { id: operationsPipelineStage.id } });
  await prisma.pipeline.delete({ where: { id: operationsPipeline.id } });
  await prisma.agentLog.delete({ where: { id: operationsAgentLog.id } });
  await prisma.agent.delete({ where: { id: operationsAgent.id } });
  await prisma.event.delete({ where: { id: operationsTaskEvent.id } });
  await prisma.note.delete({ where: { id: operationsTaskNote.id } });
  await prisma.dependency.delete({ where: { id: operationsTaskDependency.id } });
  await prisma.task.delete({ where: { id: operationsTask.id } });
  await prisma.approval.delete({ where: { id: operationsApproval.id } });
  await prisma.dependency.delete({ where: { id: operationsDependency.id } });
  await prisma.resource.delete({ where: { id: operationsResource.id } });
  await prisma.externalContainerMapping.deleteMany({
    where: { workspaceId: ownerA.workspace.id, provider: "companycore", entityType: "task_list", externalId: operationsTaskList.id }
  });
  await prisma.taskList.delete({ where: { id: operationsTaskList.id } });
  await prisma.project.delete({ where: { id: operationsProject.id } });
  await prisma.businessFunction.delete({ where: { id: operationsBusinessFunction.id } });
  await prisma.procedure.deleteMany({ where: { id: { in: [operationsProcedure.id, foreignOperationsProcedure.id] } } });

  const existingAssetsArea = await prisma.operatingArea.findFirst({
    where: { workspaceId: ownerA.workspace.id, key: "assets-storage" }
  });
  const assetsContextArea = existingAssetsArea ?? await prisma.operatingArea.create({
    data: {
      workspaceId: ownerA.workspace.id,
      key: "assets-storage",
      name: "Assets Storage",
      description: "Assets and resources area.",
      position: 8,
      isSystem: true
    }
  });
  const createdAssetsArea = !existingAssetsArea;
  const assetsFolder = await prisma.operatingFolder.create({
    data: {
      workspaceId: ownerA.workspace.id,
      areaId: assetsContextArea.id,
      key: "assets-proof-folder",
      name: "Assets Proof Folder",
      description: "Folder used by Assets context proof."
    }
  });
  const assetsKnowledgeRoot = await prisma.knowledgeRoot.create({
    data: {
      workspaceId: ownerA.workspace.id,
      areaId: assetsContextArea.id,
      folderId: assetsFolder.id,
      provider: "google_drive",
      name: "Assets knowledge root",
      locator: { externalId: "assets-root" }
    }
  });
  const assetsDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      operatingFolderId: assetsFolder.id,
      knowledgeRootId: assetsKnowledgeRoot.id,
      provider: "google_drive",
      externalId: "assets-context-proof-drive-file",
      name: "Company architecture.md",
      description: "Architecture knowledge used by agents through CompanyCore.",
      mimeType: "text/markdown",
      webViewLink: "https://drive.example/company-architecture",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const assetsRootFolder = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-root-folder",
      name: "Assets Root Folder",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      webViewLink: "https://drive.example/assets-root-folder",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const assetsChildFolder = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-child-folder",
      parentExternalId: "assets-context-root-folder",
      name: "Assets Child Folder",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const assetsNestedFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-nested-file",
      parentExternalId: "assets-context-child-folder",
      name: "Nested asset note.txt",
      mimeType: "text/plain",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const assetsDriveSnapshot = await prisma.googleDriveContentSnapshot.create({
    data: {
      workspaceId: ownerA.workspace.id,
      googleDriveFileId: assetsDriveFile.id,
      sourceRevisionId: "assets-context-proof-revision",
      contentKind: "markdown",
      extractedText: "CompanyCore is the company operating system.",
      summary: "Architecture source of truth for CompanyCore.",
      scanStatus: "completed"
    }
  });
  const assetsProject = await prisma.project.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Assets readiness project",
      status: "active"
    }
  });
  const assetsResource = await prisma.resource.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "architecture_doc",
      name: "CompanyCore architecture document",
      url: "https://docs.example/companycore-architecture",
      accessLevel: "workspace",
      relatedProjectId: assetsProject.id,
      metadata: {
        summary: "Architecture document ready for external AI context.",
        tags: ["architecture", "companycore"],
        extractedEntities: ["CompanyCore"]
      }
    }
  });
  const assetsArtifact = await prisma.artifact.create({
    data: {
      workspaceId: ownerA.workspace.id,
      resourceId: assetsResource.id,
      artifactType: "document",
      name: "Architecture artifact",
      status: "active"
    }
  });
  const assetsClient = await prisma.client.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Assets Client",
      status: "active"
    }
  });
  const assetsAgent = await prisma.agent.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Assets reader",
      role: "knowledge"
    }
  });
  const assetsKnowledgeItem = await prisma.knowledgeItem.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Assets knowledge note",
      itemType: "knowledge_note",
      summary: "Knowledge item linked to project, client, and agent.",
      sourceProvider: "companycore",
      sourceExternalId: "assets-context-proof-knowledge",
      url: "https://docs.example/assets-knowledge",
      projectId: assetsProject.id,
      clientId: assetsClient.id,
      agentId: assetsAgent.id,
      status: "active"
    }
  });
  const existingForeignAssetsArea = await prisma.operatingArea.findFirst({
    where: { workspaceId: ownerB.workspace.id, key: "assets-storage" }
  });
  const foreignAssetsArea = existingForeignAssetsArea ?? await prisma.operatingArea.create({
    data: {
      workspaceId: ownerB.workspace.id,
      key: "assets-storage",
      name: "Foreign Assets Storage",
      position: 8,
      isSystem: true
    }
  });
  const createdForeignAssetsArea = !existingForeignAssetsArea;
  const foreignAssetsDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerB.workspace.id,
      operatingAreaId: foreignAssetsArea.id,
      provider: "google_drive",
      externalId: "foreign-assets-context-proof-drive-file",
      name: "Foreign assets file",
      mimeType: "text/plain",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const unauthenticatedAssetsContext = await request("/v1/assets/context");
  assert.equal(unauthenticatedAssetsContext.status, 401);
  const assetsCountsBefore = {
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    snapshots: await prisma.googleDriveContentSnapshot.count({ where: { workspaceId: ownerA.workspace.id } }),
    resources: await prisma.resource.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeItems: await prisma.knowledgeItem.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeRoots: await prisma.knowledgeRoot.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const assetsContext = await request("/v1/assets/context?areaKey=assets-storage&limit=50", { headers: authA });
  assert.equal(assetsContext.status, 200);
  const assetsRefreshContext = await request("/v1/assets/context?areaKey=assets-storage&limit=50&refresh=1", { headers: authA });
  assert.equal(assetsRefreshContext.status, 200);
  const assetsContextBody = assetsContext.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: {
        totalItems: number;
        driveFiles: number;
        contentSnapshots: number;
        resources: number;
        knowledgeItems: number;
        knowledgeRoots: number;
        aiReadyItems: number;
        needsCleanup: number;
        readiness: Record<string, number>;
        byType: Record<string, number>;
      };
      folders: Array<{ id: string; name: string; parentExternalId?: string | null }>;
      knowledgeRoots: Array<{ id: string; name: string; area: { key: string } | null }>;
      knowledgeItems: Array<{ id: string; title: string; relations: { project: { id: string } | null; client: { id: string } | null; agent: { id: string } | null } }>;
      resources: Array<{
        id: string;
        sourceModel: string;
        sourceId: string;
        name: string;
        resourceType: string;
        aiCompatibility: {
          readiness: string;
          summary: string | null;
          aiContextReady: boolean;
          contentSnapshot: { id: string; hasExtractedText: boolean; hasSummary: boolean; previewText?: string | null; textLength?: number; isTextTruncated?: boolean } | null;
        };
        relations: { projects: Array<{ id: string }>; operatingArea?: { id: string; key: string } | null };
        artifacts?: Array<{ id: string; name: string }>;
        source?: { externalId?: string | null; parentExternalId?: string | null; isFolder?: boolean };
      }>;
      agentPacket: { mode: string; allowedActions: string[]; blockedActions: Array<{ action: string }> };
    };
  };
  assert.equal(assetsContextBody.data.department.canonicalKey, "08-zasoby");
  assert.equal(assetsContextBody.data.department.backendAreaKey, "assets-storage");
  assert.ok(assetsContextBody.data.summary.totalItems >= 2);
  assert.ok(assetsContextBody.data.summary.driveFiles >= 1);
  assert.ok(assetsContextBody.data.summary.contentSnapshots >= 1);
  assert.ok(assetsContextBody.data.summary.resources >= 1);
  assert.ok(assetsContextBody.data.summary.knowledgeItems >= 1);
  assert.ok(assetsContextBody.data.summary.knowledgeRoots >= 1);
  assert.ok(assetsContextBody.data.summary.aiReadyItems >= 2);
  assert.ok(assetsContextBody.data.summary.readiness.ai_context_ready >= 2);
  assert.ok(assetsContextBody.data.summary.byType.markdown >= 1);
  assert.ok(assetsContextBody.data.summary.byType.architecture_doc >= 1);
  assert.ok(assetsContextBody.data.knowledgeRoots.some((root) => root.id === assetsKnowledgeRoot.id && root.area?.key === "assets-storage"));
  assert.ok(assetsContextBody.data.knowledgeItems.some((item) => (
    item.id === assetsKnowledgeItem.id
    && item.relations.project?.id === assetsProject.id
    && item.relations.client?.id === assetsClient.id
    && item.relations.agent?.id === assetsAgent.id
  )));
  const driveAssetItem = assetsContextBody.data.resources.find((item) => item.sourceId === assetsDriveFile.id);
  assert.ok(driveAssetItem);
  assert.equal(driveAssetItem.sourceModel, "GoogleDriveFile");
  assert.equal(driveAssetItem.resourceType, "markdown");
  assert.equal(driveAssetItem.aiCompatibility.readiness, "ai_context_ready");
  assert.equal(driveAssetItem.aiCompatibility.contentSnapshot?.id, assetsDriveSnapshot.id);
  assert.equal(driveAssetItem.aiCompatibility.contentSnapshot?.hasExtractedText, true);
  assert.equal(driveAssetItem.aiCompatibility.contentSnapshot?.previewText, "CompanyCore is the company operating system.");
  assert.equal(driveAssetItem.aiCompatibility.contentSnapshot?.textLength, "CompanyCore is the company operating system.".length);
  assert.equal(driveAssetItem.aiCompatibility.contentSnapshot?.isTextTruncated, false);
  assert.equal(driveAssetItem.relations.operatingArea?.key, "assets-storage");
  assert.ok(assetsContextBody.data.folders.some((folder) => (
    folder.id === assetsChildFolder.id
    && folder.parentExternalId === assetsRootFolder.externalId
  )));
  const limitedAssetsContext = await request("/v1/assets/context?areaKey=assets-storage&limit=1", { headers: authA });
  assert.equal(limitedAssetsContext.status, 200);
  const limitedAssetsContextBody = limitedAssetsContext.body as {
    data: {
      folders: Array<{ id: string }>;
      resources: Array<{ sourceModel: string; source?: { isFolder?: boolean } }>;
    };
  };
  assert.ok(limitedAssetsContextBody.data.folders.length >= 1);
  assert.ok(limitedAssetsContextBody.data.resources.some((item) => (
    item.sourceModel === "GoogleDriveFile"
    && item.source?.isFolder === false
  )));
  const nestedAssetItem = assetsContextBody.data.resources.find((item) => item.sourceId === assetsNestedFile.id);
  assert.ok(nestedAssetItem);
  assert.equal(nestedAssetItem.source?.parentExternalId, assetsChildFolder.externalId);
  const resourceAssetItem = assetsContextBody.data.resources.find((item) => item.sourceId === assetsResource.id);
  assert.ok(resourceAssetItem);
  assert.equal(resourceAssetItem.sourceModel, "Resource");
  assert.equal(resourceAssetItem.resourceType, "architecture_doc");
  assert.equal(resourceAssetItem.aiCompatibility.aiContextReady, true);
  assert.ok(resourceAssetItem.relations.projects.some((project) => project.id === assetsProject.id));
  assert.ok(resourceAssetItem.artifacts?.some((artifact) => artifact.id === assetsArtifact.id));
  assert.equal(assetsContextBody.data.agentPacket.mode, "read_only");
  assert.ok(assetsContextBody.data.agentPacket.allowedActions.includes("read_assets_context"));
  assert.ok(assetsContextBody.data.agentPacket.blockedActions.some((action) => action.action === "delete_move_or_share_provider_file"));
  const assetsCountsAfter = {
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    snapshots: await prisma.googleDriveContentSnapshot.count({ where: { workspaceId: ownerA.workspace.id } }),
    resources: await prisma.resource.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeItems: await prisma.knowledgeItem.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeRoots: await prisma.knowledgeRoot.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(assetsCountsAfter, assetsCountsBefore);
  const foreignAssetsContext = await request("/v1/assets/context?limit=50", { headers: authB });
  assert.equal(foreignAssetsContext.status, 200);
  const foreignAssetsContextBody = foreignAssetsContext.body as {
    data: { resources: Array<{ sourceId: string }> };
  };
  assert.ok(foreignAssetsContextBody.data.resources.some((item) => item.sourceId === foreignAssetsDriveFile.id));
  assert.ok(!foreignAssetsContextBody.data.resources.some((item) => item.sourceId === assetsDriveFile.id));
  const assetsMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(assetsMcpManifest.status, 200);
  const assetsMcpManifestBody = assetsMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(assetsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_assets_context"
    && tool.path === "/v1/assets/context"
    && tool.capability === "assets:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(assetsMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_patch_assets_folders_by_id"
    && tool.path === "/v1/assets/folders/:id"
    && tool.capability === "assets:write"
    && tool.riskLevel === "write"
  )));

  const childDepartmentPatch = await request(`/v1/assets/folders/${assetsChildFolder.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ departmentKey: "04-operacje" })
  });
  assert.equal(childDepartmentPatch.status, 409);

  const existingRelationsArea = await prisma.operatingArea.findFirst({
    where: { workspaceId: ownerA.workspace.id, key: "sales-crm" }
  });
  const relationsArea = existingRelationsArea ?? await prisma.operatingArea.create({
    data: {
      workspaceId: ownerA.workspace.id,
      key: "sales-crm",
      name: "Sales CRM",
      position: 3,
      isSystem: true
    }
  });
  const createdRelationsArea = !existingRelationsArea;
  const orphanDriveFolder = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-orphan-folder",
      parentExternalId: "drive-parent-outside-import",
      name: "Client Relations Source",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const orphanDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-orphan-child-file",
      parentExternalId: orphanDriveFolder.externalId,
      name: "Client relation note.txt",
      mimeType: "text/plain",
      syncStatus: "synced",
      scanStatus: "scanned"
    }
  });
  const orphanFolderPatch = await request(`/v1/assets/folders/${orphanDriveFolder.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ departmentKey: "05-relacje" })
  });
  assert.equal(orphanFolderPatch.status, 200);
  assert.equal((orphanFolderPatch.body as { data: { department: null | { key: string; canonicalKey?: string } } }).data.department?.key, "sales-crm");
  assert.equal((orphanFolderPatch.body as { data: { department: null | { canonicalKey?: string } } }).data.department?.canonicalKey, "05-relacje");
  const orphanContext = await request("/v1/assets/context?areaKey=all&limit=200", { headers: authA });
  assert.equal(orphanContext.status, 200);
  const orphanContextBody = orphanContext.body as {
    data: {
      resources: Array<{ sourceId: string; organization?: { department?: string | null; departmentCanonical?: string | null } }>;
    };
  };
  assert.ok(orphanContextBody.data.resources.some((item) => (
    item.sourceId === orphanDriveFolder.id
    && item.organization?.department === "sales-crm"
    && item.organization?.departmentCanonical === "05-relacje"
  )));
  assert.ok(orphanContextBody.data.resources.some((item) => (
    item.sourceId === orphanDriveFile.id
    && item.organization?.department === "sales-crm"
    && item.organization?.departmentCanonical === "05-relacje"
  )));

  const cycleFolderPatch = await request(`/v1/assets/folders/${assetsRootFolder.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ parentExternalId: assetsChildFolder.externalId })
  });
  assert.equal(cycleFolderPatch.status, 409);

  const rootFolderPatch = await request(`/v1/assets/folders/${assetsRootFolder.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ name: "Assets Source Folder", departmentKey: null })
  });
  assert.equal(rootFolderPatch.status, 200);
  assert.equal((rootFolderPatch.body as { data: { name: string; department: null | { key: string }; updatedCount: number } }).data.name, "Assets Source Folder");
  assert.equal((rootFolderPatch.body as { data: { department: null | { key: string } } }).data.department, null);
  assert.ok((rootFolderPatch.body as { data: { updatedCount: number } }).data.updatedCount >= 3);
  const scopedAfterRootPatch = await prisma.googleDriveFile.findMany({
    where: {
      id: { in: [assetsRootFolder.id, assetsChildFolder.id, assetsNestedFile.id] }
    },
    select: {
      id: true,
      operatingAreaId: true
    }
  });
  assert.ok(scopedAfterRootPatch.every((item) => item.operatingAreaId === null));

  const childRootPatch = await request(`/v1/assets/folders/${assetsChildFolder.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ name: "Assets Child Source", parentExternalId: null, departmentKey: "08-zasoby" })
  });
  assert.equal(childRootPatch.status, 200);
  assert.equal((childRootPatch.body as { data: { parentExternalId: string | null; department: { key: string } | null } }).data.parentExternalId, null);
  assert.equal((childRootPatch.body as { data: { parentExternalId: string | null; department: { key: string } | null } }).data.department?.key, "assets-storage");
  const childAfterRootPatch = await prisma.googleDriveFile.findFirstOrThrow({ where: { id: assetsChildFolder.id } });
  const nestedAfterRootPatch = await prisma.googleDriveFile.findFirstOrThrow({ where: { id: assetsNestedFile.id } });
  assert.equal(childAfterRootPatch.parentExternalId, null);
  assert.equal(childAfterRootPatch.operatingAreaId, assetsContextArea.id);
  assert.equal(nestedAfterRootPatch.operatingAreaId, assetsContextArea.id);

  await prisma.googleDriveFile.delete({ where: { id: orphanDriveFile.id } });
  await prisma.googleDriveFile.delete({ where: { id: orphanDriveFolder.id } });
  if (createdRelationsArea) {
    await prisma.operatingArea.delete({ where: { id: relationsArea.id } });
  }
  await prisma.googleDriveFile.delete({ where: { id: foreignAssetsDriveFile.id } });
  if (createdForeignAssetsArea) {
    await prisma.operatingArea.delete({ where: { id: foreignAssetsArea.id } });
  }
  await prisma.knowledgeItem.delete({ where: { id: assetsKnowledgeItem.id } });
  await prisma.agent.delete({ where: { id: assetsAgent.id } });
  await prisma.client.delete({ where: { id: assetsClient.id } });
  await prisma.artifact.delete({ where: { id: assetsArtifact.id } });
  await prisma.resource.delete({ where: { id: assetsResource.id } });
  await prisma.project.delete({ where: { id: assetsProject.id } });
  await prisma.googleDriveContentSnapshot.delete({ where: { id: assetsDriveSnapshot.id } });
  await prisma.googleDriveFile.delete({ where: { id: assetsNestedFile.id } });
  await prisma.googleDriveFile.delete({ where: { id: assetsChildFolder.id } });
  await prisma.googleDriveFile.delete({ where: { id: assetsRootFolder.id } });
  await prisma.googleDriveFile.delete({ where: { id: assetsDriveFile.id } });
  await prisma.knowledgeRoot.delete({ where: { id: assetsKnowledgeRoot.id } });
  await prisma.operatingFolder.delete({ where: { id: assetsFolder.id } });
  if (createdAssetsArea) {
    await prisma.operatingArea.delete({ where: { id: assetsContextArea.id } });
  }

  const strategyContextArea = await prisma.operatingArea.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, key: "strategy-governance" }
  });
  const strategyGoal = await prisma.goal.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Strategy growth priority",
      description: "Define the owner strategy and priority portfolio.",
      status: "active"
    }
  });
  const strategyTarget = await prisma.target.create({
    data: {
      workspaceId: ownerA.workspace.id,
      goalId: strategyGoal.id,
      title: "Strategy KPI target",
      description: "Measure the strategy outcome.",
      metric: "qualified opportunities",
      targetValue: 10,
      currentValue: 2,
      status: "active"
    }
  });
  const strategyTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      goalId: strategyGoal.id,
      targetId: strategyTarget.id,
      title: "Strategy roadmap review",
      description: "Review goals, KPI targets, risks, and decisions.",
      status: "todo",
      priority: "high"
    }
  });
  const strategyMetric = await prisma.metric.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Strategy KPI velocity",
      category: "strategy",
      measurementType: "count",
      unit: "items",
      targetValue: 10,
      currentValue: 2,
      status: "active"
    }
  });
  const strategyRisk = await prisma.risk.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Strategy focus drift",
      description: "Too many priorities can slow execution.",
      category: "strategy",
      riskLevel: "high",
      likelihood: "medium",
      impact: "high",
      status: "active"
    }
  });
  const strategyControl = await prisma.control.create({
    data: {
      workspaceId: ownerA.workspace.id,
      riskId: strategyRisk.id,
      name: "Strategy weekly review control",
      controlType: "review",
      verificationMethod: "Owner review notes",
      status: "active"
    }
  });
  const strategyDecisionLog = await prisma.decisionLog.create({
    data: {
      workspaceId: ownerA.workspace.id,
      context: "Strategy market focus",
      optionsConsidered: ["broad services", "focused AI operations"],
      chosenOption: "focused AI operations",
      reason: "Better positioning and delivery leverage.",
      decidedByType: "user",
      consequences: "Prioritize CompanyCore and Paperclip integration work."
    }
  });
  const strategyDecision = await prisma.decision.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Strategy offer positioning",
      rationale: "Keep offer focused around autonomous company operations.",
      outcome: "approved",
      status: "active"
    }
  });
  const strategyKnowledgeItem = await prisma.knowledgeItem.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Strategy brief",
      itemType: "strategy_note",
      summary: "Owner strategy, goals, and constraints for Paperclip planning.",
      sourceProvider: "test",
      sourceExternalId: "strategy-brief"
    }
  });
  const strategyDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "strategy-drive-file",
      name: "Strategy roadmap document",
      description: "Strategy planning source document.",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://drive.example/strategy",
      operatingAreaId: strategyContextArea.id,
      syncStatus: "synced",
      scanStatus: "completed"
    }
  });
  const foreignStrategyGoal = await prisma.goal.create({
    data: {
      workspaceId: ownerB.workspace.id,
      title: "Foreign strategy goal",
      description: "Must not leak into workspace A strategy context.",
      status: "active"
    }
  });

  const unauthenticatedStrategyContext = await request("/v1/strategy/context");
  assert.equal(unauthenticatedStrategyContext.status, 401);
  const strategyCountsBefore = {
    goals: await prisma.goal.count({ where: { workspaceId: ownerA.workspace.id } }),
    targets: await prisma.target.count({ where: { workspaceId: ownerA.workspace.id } }),
    metrics: await prisma.metric.count({ where: { workspaceId: ownerA.workspace.id } }),
    risks: await prisma.risk.count({ where: { workspaceId: ownerA.workspace.id } }),
    controls: await prisma.control.count({ where: { workspaceId: ownerA.workspace.id } }),
    decisionLogs: await prisma.decisionLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    decisions: await prisma.decision.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeItems: await prisma.knowledgeItem.count({ where: { workspaceId: ownerA.workspace.id } }),
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const strategyContext = await request("/v1/strategy/context", { headers: authA });
  assert.equal(strategyContext.status, 200);
  const strategyContextBody = strategyContext.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: {
        goals: number;
        activeGoals: number;
        targets: number;
        activeTargets: number;
        activeMetrics: number;
        activeRisks: number;
        decisionLogs: number;
        activeDecisions: number;
        strategicTasks: number;
        strategyKnowledgeItems: number;
        strategyDriveFiles: number;
      };
      goals: Array<{ id: string; targets: Array<{ id: string }>; tasks: Array<{ id: string }> }>;
      metrics: Array<{ id: string; name: string }>;
      risks: Array<{ id: string; controls: Array<{ id: string }> }>;
      decisionLogs: Array<{ id: string; chosenOption: string }>;
      decisions: Array<{ id: string; title: string }>;
      knowledgeItems: Array<{ id: string; title: string }>;
      driveFiles: Array<{ id: string; operatingAreaKey: string | null }>;
      tasks: Array<{ id: string; title: string }>;
      agentPacket: { mode: string; allowedActions: string[]; blockedActions: Array<{ action: string }> };
    };
  };
  assert.equal(strategyContextBody.data.department.canonicalKey, "01-strategia");
  assert.equal(strategyContextBody.data.department.backendAreaKey, "strategy-governance");
  assert.ok(strategyContextBody.data.summary.goals >= 1);
  assert.ok(strategyContextBody.data.summary.activeGoals >= 1);
  assert.ok(strategyContextBody.data.summary.targets >= 1);
  assert.ok(strategyContextBody.data.summary.activeTargets >= 1);
  assert.ok(strategyContextBody.data.summary.activeMetrics >= 1);
  assert.ok(strategyContextBody.data.summary.activeRisks >= 1);
  assert.ok(strategyContextBody.data.summary.decisionLogs >= 1);
  assert.ok(strategyContextBody.data.summary.activeDecisions >= 1);
  assert.ok(strategyContextBody.data.summary.strategicTasks >= 1);
  assert.ok(strategyContextBody.data.summary.strategyKnowledgeItems >= 1);
  assert.ok(strategyContextBody.data.summary.strategyDriveFiles >= 1);
  assert.ok(strategyContextBody.data.goals.some((goal) => (
    goal.id === strategyGoal.id
    && goal.targets.some((target) => target.id === strategyTarget.id)
    && goal.tasks.some((task) => task.id === strategyTask.id)
  )));
  assert.ok(strategyContextBody.data.metrics.some((metric) => metric.id === strategyMetric.id));
  assert.ok(strategyContextBody.data.risks.some((risk) => (
    risk.id === strategyRisk.id
    && risk.controls.some((control) => control.id === strategyControl.id)
  )));
  assert.ok(strategyContextBody.data.decisionLogs.some((decisionLog) => decisionLog.id === strategyDecisionLog.id));
  assert.ok(strategyContextBody.data.decisions.some((decision) => decision.id === strategyDecision.id));
  assert.ok(strategyContextBody.data.knowledgeItems.some((item) => item.id === strategyKnowledgeItem.id));
  assert.ok(strategyContextBody.data.driveFiles.some((file) => (
    file.id === strategyDriveFile.id
    && file.operatingAreaKey === "strategy-governance"
  )));
  assert.ok(strategyContextBody.data.tasks.some((task) => task.id === strategyTask.id));
  assert.equal(strategyContextBody.data.agentPacket.mode, "read_only");
  assert.ok(strategyContextBody.data.agentPacket.allowedActions.includes("read_strategy_context"));
  assert.ok(strategyContextBody.data.agentPacket.blockedActions.some((action) => action.action === "create_or_change_strategy"));
  const strategyCountsAfter = {
    goals: await prisma.goal.count({ where: { workspaceId: ownerA.workspace.id } }),
    targets: await prisma.target.count({ where: { workspaceId: ownerA.workspace.id } }),
    metrics: await prisma.metric.count({ where: { workspaceId: ownerA.workspace.id } }),
    risks: await prisma.risk.count({ where: { workspaceId: ownerA.workspace.id } }),
    controls: await prisma.control.count({ where: { workspaceId: ownerA.workspace.id } }),
    decisionLogs: await prisma.decisionLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    decisions: await prisma.decision.count({ where: { workspaceId: ownerA.workspace.id } }),
    knowledgeItems: await prisma.knowledgeItem.count({ where: { workspaceId: ownerA.workspace.id } }),
    driveFiles: await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }),
    tasks: await prisma.task.count({ where: { workspaceId: ownerA.workspace.id } }),
    auditLogs: await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }),
    events: await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  assert.deepEqual(strategyCountsAfter, strategyCountsBefore);
  const foreignStrategyContext = await request("/v1/strategy/context", { headers: authB });
  assert.equal(foreignStrategyContext.status, 200);
  const foreignStrategyContextBody = foreignStrategyContext.body as {
    data: { goals: Array<{ id: string }> };
  };
  assert.ok(foreignStrategyContextBody.data.goals.some((goal) => goal.id === foreignStrategyGoal.id));
  assert.ok(!foreignStrategyContextBody.data.goals.some((goal) => goal.id === strategyGoal.id));
  const strategyMcpManifest = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(strategyMcpManifest.status, 200);
  const strategyMcpManifestBody = strategyMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(strategyMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_strategy_context"
    && tool.path === "/v1/strategy/context"
    && tool.capability === "strategy:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  await prisma.googleDriveFile.delete({ where: { id: strategyDriveFile.id } });
  await prisma.knowledgeItem.delete({ where: { id: strategyKnowledgeItem.id } });
  await prisma.decision.delete({ where: { id: strategyDecision.id } });
  await prisma.decisionLog.delete({ where: { id: strategyDecisionLog.id } });
  await prisma.control.delete({ where: { id: strategyControl.id } });
  await prisma.risk.delete({ where: { id: strategyRisk.id } });
  await prisma.metric.delete({ where: { id: strategyMetric.id } });
  await prisma.task.delete({ where: { id: strategyTask.id } });
  await prisma.target.delete({ where: { id: strategyTarget.id } });
  await prisma.goal.deleteMany({ where: { id: { in: [strategyGoal.id, foreignStrategyGoal.id] } } });

  const ownerAWorkspacesInitial = await request("/v1/workspaces", { headers: authA });
  assert.equal(ownerAWorkspacesInitial.status, 200);
  const ownerAWorkspacesInitialBody = ownerAWorkspacesInitial.body as {
    data: Array<{ id: string; name: string; role: string; active: boolean }>;
  };
  assert.equal(ownerAWorkspacesInitialBody.data.length, 1);
  assert.equal(ownerAWorkspacesInitialBody.data[0]?.id, ownerA.workspace.id);
  assert.equal(ownerAWorkspacesInitialBody.data[0]?.active, true);

  const secondWorkspace = await request("/v1/workspaces", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ name: "Workspace A2" })
  });
  assert.equal(secondWorkspace.status, 201);
  const secondWorkspaceBody = secondWorkspace.body as {
    data: { token: string; workspace: { id: string; name: string } };
  };
  assert.equal(secondWorkspaceBody.data.workspace.name, "Workspace A2");
  assert.notEqual(secondWorkspaceBody.data.workspace.id, ownerA.workspace.id);

  const ownerAWorkspacesAfterCreate = await request("/v1/workspaces", { headers: authA });
  assert.equal(ownerAWorkspacesAfterCreate.status, 200);
  const ownerAWorkspacesAfterCreateBody = ownerAWorkspacesAfterCreate.body as {
    data: Array<{ id: string; name: string; active: boolean }>;
  };
  assert.equal(ownerAWorkspacesAfterCreateBody.data.length, 2);
  assert.ok(ownerAWorkspacesAfterCreateBody.data.some((workspace) => workspace.id === secondWorkspaceBody.data.workspace.id));
  assert.equal(ownerAWorkspacesAfterCreateBody.data.find((workspace) => workspace.id === ownerA.workspace.id)?.active, true);

  const ownerAMe = await request("/auth/me", { headers: authA });
  assert.equal(ownerAMe.status, 200);
  const ownerAMeBody = ownerAMe.body as {
    data: { workspaceId: string; workspaces: Array<{ id: string; active: boolean }> };
  };
  assert.equal(ownerAMeBody.data.workspaceId, ownerA.workspace.id);
  assert.equal(ownerAMeBody.data.workspaces.length, 2);

  const selectedWorkspace = await request(`/v1/workspaces/${secondWorkspaceBody.data.workspace.id}/actions/select`, {
    method: "POST",
    headers: authA
  });
  assert.equal(selectedWorkspace.status, 200);
  const selectedWorkspaceBody = selectedWorkspace.body as {
    data: { token: string; workspace: { id: string }; role: string };
  };
  assert.ok(selectedWorkspaceBody.data.token);
  assert.equal(selectedWorkspaceBody.data.workspace.id, secondWorkspaceBody.data.workspace.id);
  assert.equal(selectedWorkspaceBody.data.role, "owner");

  const selectedWorkspaceAuth = { Authorization: `Bearer ${selectedWorkspaceBody.data.token}` };
  const selectedWorkspaceConnection = await request("/v1/connection", { headers: selectedWorkspaceAuth });
  assert.equal(selectedWorkspaceConnection.status, 200);
  const selectedWorkspaceConnectionBody = selectedWorkspaceConnection.body as {
    data: { auth: { workspaceId: string }; operatingModel: { areas: unknown[] } };
  };
  assert.equal(selectedWorkspaceConnectionBody.data.auth.workspaceId, secondWorkspaceBody.data.workspace.id);
  assert.equal(selectedWorkspaceConnectionBody.data.operatingModel.areas.length, 13);

  const selectedWorkspaceInventory = await request("/v1/operating-model/area-inventory", {
    headers: selectedWorkspaceAuth
  });
  assert.equal(selectedWorkspaceInventory.status, 200);
  const selectedWorkspaceInventoryBody = selectedWorkspaceInventory.body as {
    data: Array<{
      key: string;
      resources: { tables: number; folders: number; driveFiles: number; externalMappings: number };
      tables: Array<{ apiSlug: string }>;
    }>;
  };
  assert.equal(selectedWorkspaceInventoryBody.data.length, 13);
  assert.ok(selectedWorkspaceInventoryBody.data.some((area) => area.key === "main-general"));
  assert.ok(selectedWorkspaceInventoryBody.data.reduce((sum, area) => sum + area.resources.tables, 0) > 0);

  const graphArea = await prisma.operatingArea.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      tables: { some: {} }
    },
    include: { tables: { orderBy: { apiSlug: "asc" }, take: 1 } }
  });
  const graphTable = graphArea.tables[0]!;
  const assignedMapping = await prisma.externalContainerMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      entityType: "list",
      externalId: "rel-graph-list-assigned",
      name: "Relationship Graph Assigned List",
      areaId: graphArea.id,
      tableId: graphTable.id
    }
  });
  const unassignedMapping = await prisma.externalContainerMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      entityType: "folder",
      externalId: "rel-graph-folder-unassigned",
      name: "Relationship Graph Unassigned Folder"
    }
  });
  const mappedField = await prisma.externalFieldMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      externalId: "rel-graph-field-status",
      name: "Status",
      tableId: graphTable.id,
      nativeField: "status"
    }
  });
  const driveRoot = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "rel-graph-drive-root",
      name: "Relationship Graph Drive Root",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      operatingAreaId: graphArea.id
    }
  });
  const driveChild = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "rel-graph-drive-child",
      name: "Relationship Graph Drive Child",
      mimeType: "application/vnd.google-apps.document",
      parentExternalId: driveRoot.externalId
    }
  });
  const graphStorageLocation = await prisma.storageLocation.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      name: "Relationship Graph Storage",
      locator: { externalId: driveRoot.externalId },
      areaId: graphArea.id
    }
  });
  const graphKnowledgeRoot = await prisma.knowledgeRoot.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      name: "Relationship Graph Knowledge",
      locator: { externalId: driveRoot.externalId },
      areaId: graphArea.id
    }
  });
  const graphAutomationDefinition = await prisma.automationDefinition.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "companycore",
      triggerType: "relationship_review",
      name: "Relationship Graph Automation",
      areaId: graphArea.id
    }
  });

  const relationshipGraph = await request("/v1/relationships/graph?limit=50", { headers: authA });
  assert.equal(relationshipGraph.status, 200);
  const relationshipGraphBody = relationshipGraph.body as {
    data: {
      workspace: { id: string };
      graph: {
        nodes: Array<{ id: string; type: string; label: string }>;
        edges: Array<{ from: string; to: string; confidence: string; sourceModel: string; sourceField: string }>;
        reviewItems: Array<{ id: string; nodeId: string; type: string; actionHint?: { path: string } }>;
        unsupportedFamilies: Array<{ family: string }>;
      };
      summary: { confidence: { direct: number; providerHierarchy: number; routeInferred: number; needsReview: number; unsupported: number } };
    };
  };
  assert.equal(relationshipGraphBody.data.workspace.id, ownerA.workspace.id);
  assert.ok(relationshipGraphBody.data.graph.nodes.some((node) => node.id === `external_container_mapping:${assignedMapping.id}`));
  assert.ok(relationshipGraphBody.data.graph.nodes.some((node) => node.id === `external_field_mapping:${mappedField.id}`));
  assert.ok(relationshipGraphBody.data.graph.edges.some((edge) => (
    edge.from === `external_container_mapping:${assignedMapping.id}`
    && edge.to === `operating_area:${graphArea.id}`
    && edge.confidence === "direct"
    && edge.sourceModel === "ExternalContainerMapping"
    && edge.sourceField === "areaId"
  )));
  assert.ok(relationshipGraphBody.data.graph.edges.some((edge) => (
    edge.from === `google_drive_file:${driveRoot.id}`
    && edge.to === `google_drive_file:${driveChild.id}`
    && edge.confidence === "provider_hierarchy"
  )));
  assert.ok(relationshipGraphBody.data.graph.edges.some((edge) => edge.confidence === "route_inferred"));
  assert.ok(relationshipGraphBody.data.graph.reviewItems.some((item) => (
    item.nodeId === `external_container_mapping:${unassignedMapping.id}`
    && item.type === "unassigned_provider_container"
    && item.actionHint?.path === `/v1/operating-model/external-mappings/${unassignedMapping.id}/scope`
  )));
  assert.ok(relationshipGraphBody.data.graph.reviewItems.some((item) => item.nodeId === `google_drive_file:${driveChild.id}`));
  assert.ok(relationshipGraphBody.data.graph.unsupportedFamilies.some((family) => family.family === "custom_cross_domain_edges"));
  assert.ok(relationshipGraphBody.data.summary.confidence.direct > 0);
  assert.ok(relationshipGraphBody.data.summary.confidence.providerHierarchy > 0);
  assert.ok(relationshipGraphBody.data.summary.confidence.routeInferred > 0);
  assert.ok(relationshipGraphBody.data.summary.confidence.needsReview >= 2);
  assert.ok(relationshipGraphBody.data.summary.confidence.unsupported > 0);

  const relationshipsContextArea = await prisma.operatingArea.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, key: "relationships-client-success" }
  });
  const relationshipsClient = await prisma.client.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Relationship Context Client",
      companyName: "Relationship Context Co",
      email: "context-client@example.com",
      status: "active"
    }
  });
  const relationshipsInteraction = await prisma.interaction.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: relationshipsClient.id,
      type: "support_follow_up",
      summary: "Relationship context support follow-up required."
    }
  });
  const relationshipsStakeholder = await prisma.stakeholder.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: relationshipsClient.id,
      name: "Relationship Context Stakeholder",
      type: "client_contact",
      role: "Head of Success",
      email: "stakeholder@example.com",
      status: "active"
    }
  });
  const relationshipsDeal = await prisma.deal.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: relationshipsClient.id,
      title: "Relationship Context Renewal",
      status: "open"
    }
  });
  const relationshipsNote = await prisma.note.create({
    data: {
      workspaceId: ownerA.workspace.id,
      clientId: relationshipsClient.id,
      content: "Client relationship and retention context note."
    }
  });
  const relationshipsDecision = await prisma.decision.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Relationship retention policy",
      rationale: "Improve client success and long-term retention.",
      status: "active"
    }
  });
  const relationshipsTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Relationship follow-up with client",
      description: "Client support and relationship continuity check.",
      status: "todo"
    }
  });
  const relationshipsDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "rel-context-drive-doc",
      name: "Client relationship health report",
      mimeType: "application/vnd.google-apps.document",
      operatingAreaId: relationshipsContextArea.id
    }
  });

  const unauthenticatedRelationshipsContext = await request("/v1/relationships/context");
  assert.equal(unauthenticatedRelationshipsContext.status, 401);
  const relationshipsContext = await request("/v1/relationships/context", { headers: authA });
  assert.equal(relationshipsContext.status, 200);
  const relationshipsContextBody = relationshipsContext.body as {
    data: {
      department: { canonicalKey: string; backendAreaKey: string };
      summary: { clients: number; activeClients: number; relationshipTasks: number; relationshipDriveFiles: number };
      clients: Array<{ id: string; interactions: Array<{ id: string }>; stakeholders: Array<{ id: string }> }>;
      interactions: Array<{ id: string; client: { id: string } | null }>;
      stakeholders: Array<{ id: string; client: { id: string } | null }>;
      deals: Array<{ id: string; client: { id: string } | null }>;
      notes: Array<{ id: string; client: { id: string } | null }>;
      decisions: Array<{ id: string }>;
      tasks: Array<{ id: string }>;
      driveFiles: Array<{ id: string; operatingAreaKey: string | null }>;
      agentPacket: { mode: string; allowedActions: string[]; blockedActions: Array<{ action: string }> };
    };
  };
  assert.equal(relationshipsContextBody.data.department.canonicalKey, "05-relacje");
  assert.equal(relationshipsContextBody.data.department.backendAreaKey, "relationships-client-success");
  assert.ok(relationshipsContextBody.data.summary.clients >= 1);
  assert.ok(relationshipsContextBody.data.summary.activeClients >= 1);
  assert.ok(relationshipsContextBody.data.summary.relationshipTasks >= 1);
  assert.ok(relationshipsContextBody.data.summary.relationshipDriveFiles >= 1);
  assert.ok(relationshipsContextBody.data.clients.some((client) => (
    client.id === relationshipsClient.id
    && client.interactions.some((interaction) => interaction.id === relationshipsInteraction.id)
    && client.stakeholders.some((stakeholder) => stakeholder.id === relationshipsStakeholder.id)
  )));
  assert.ok(relationshipsContextBody.data.interactions.some((interaction) => (
    interaction.id === relationshipsInteraction.id
    && interaction.client?.id === relationshipsClient.id
  )));
  assert.ok(relationshipsContextBody.data.stakeholders.some((stakeholder) => (
    stakeholder.id === relationshipsStakeholder.id
    && stakeholder.client?.id === relationshipsClient.id
  )));
  assert.ok(relationshipsContextBody.data.deals.some((deal) => (
    deal.id === relationshipsDeal.id
    && deal.client?.id === relationshipsClient.id
  )));
  assert.ok(relationshipsContextBody.data.notes.some((note) => (
    note.id === relationshipsNote.id
    && note.client?.id === relationshipsClient.id
  )));
  assert.ok(relationshipsContextBody.data.decisions.some((decision) => decision.id === relationshipsDecision.id));
  assert.ok(relationshipsContextBody.data.tasks.some((task) => task.id === relationshipsTask.id));
  assert.ok(relationshipsContextBody.data.driveFiles.some((file) => (
    file.id === relationshipsDriveFile.id
    && file.operatingAreaKey === "relationships-client-success"
  )));
  assert.equal(relationshipsContextBody.data.agentPacket.mode, "read_only");
  assert.ok(relationshipsContextBody.data.agentPacket.allowedActions.includes("read_relationships_context"));
  assert.ok(relationshipsContextBody.data.agentPacket.blockedActions.some((action) => action.action === "send_outreach_or_commitment"));

  const graphStrategyArea = await prisma.operatingArea.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, key: "strategy-governance" },
    include: { tables: true }
  });
  const graphGoal = await prisma.goal.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Operating graph revenue clarity",
      description: "Prove that strategy goals connect into execution evidence."
    }
  });
  const graphLonelyGoal = await prisma.goal.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Operating graph target gap"
    }
  });
  const graphTarget = await prisma.target.create({
    data: {
      workspaceId: ownerA.workspace.id,
      goalId: graphGoal.id,
      title: "Revenue signal has a measurable target",
      metric: "Operating graph target metric",
      targetValue: 100,
      currentValue: 25
    }
  });
  const graphTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      goalId: graphGoal.id,
      targetId: graphTarget.id,
      title: "Connect target to execution task"
    }
  });
  const graphProcess = await prisma.process.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Operating graph strategy process",
      description: "Process used by area operating graph tests.",
      department: "Strategy and governance",
      category: "strategy",
      status: "active"
    }
  });
  const graphPipeline = await prisma.pipeline.create({
    data: {
      workspaceId: ownerA.workspace.id,
      processId: graphProcess.id,
      name: "Operating graph strategy pipeline",
      purpose: "Move a strategic target through execution evidence.",
      status: "active"
    }
  });
  await prisma.goal.update({
    where: { id: graphGoal.id },
    data: { processId: graphProcess.id }
  });
  await prisma.target.update({
    where: { id: graphTarget.id },
    data: { pipelineId: graphPipeline.id }
  });
  const graphMetric = await prisma.metric.create({
    data: {
      workspaceId: ownerA.workspace.id,
      processId: graphProcess.id,
      pipelineId: graphPipeline.id,
      name: "Operating graph target metric",
      category: "strategy",
      measurementType: "number",
      unit: "items",
      targetValue: 100,
      currentValue: 25,
      status: "active"
    }
  });
  const graphPipelineRun = await prisma.pipelineRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: graphPipeline.id,
      initiatedByType: "user",
      status: "running",
      linkedTaskIds: [graphTask.id],
      correlationId: "operating-graph-api-test"
    }
  });
  await prisma.pipelineRunTaskLink.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineRunId: graphPipelineRun.id,
      taskId: graphTask.id,
      linkType: "execution_evidence",
      source: "companycore"
    }
  });
  const graphKnowledgeItem = await prisma.knowledgeItem.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Operating graph strategy note",
      itemType: "note",
      summary: "Knowledge linked to the strategy process and pipeline.",
      processId: graphProcess.id,
      pipelineId: graphPipeline.id,
      status: "active"
    }
  });
  await prisma.knowledgeLink.create({
    data: {
      workspaceId: ownerA.workspace.id,
      knowledgeItemId: graphKnowledgeItem.id,
      targetType: "goal",
      targetId: graphGoal.id,
      linkType: "evidence",
      confidence: "owner_assigned"
    }
  });
  const graphAreaDriveFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "operating-graph-strategy-doc",
      name: "Operating Graph Strategy Doc",
      mimeType: "application/vnd.google-apps.document",
      operatingAreaId: graphStrategyArea.id,
      webViewLink: "https://drive.example/operating-graph"
    }
  });
  const graphAreaDriveSnapshot = await prisma.googleDriveContentSnapshot.create({
    data: {
      workspaceId: ownerA.workspace.id,
      googleDriveFileId: graphAreaDriveFile.id,
      sourceRevisionId: "operating-graph-rev-1",
      contentKind: "google_doc",
      summary: "Strategy document summary for the area operating graph.",
      extractedText: "Strategy document content."
    }
  });
  const graphAreaMapping = await prisma.externalContainerMapping.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      entityType: "list",
      externalId: "operating-graph-strategy-list",
      name: "Operating Graph Strategy List",
      areaId: graphStrategyArea.id,
      tableId: graphStrategyArea.tables.find((table) => table.apiSlug === "goals")?.id
    }
  });

  const areaGraph = await request("/v1/operating-graph/areas/01-strategia?limit=100", { headers: authA });
  assert.equal(areaGraph.status, 200);
  const areaGraphBody = areaGraph.body as {
    data: {
      area: { id: string; key: string; canonicalKey: string; resolvedKey: string };
      summary: { goals: number; targets: number; metrics: number; workflows: number; tasks: number; knowledge: number; sources: number; gaps: number };
      nodes: Array<{ id: string; type: string; label: string; metadata?: Record<string, unknown> }>;
      edges: Array<{ from: string; to: string; confidence: string; sourceModel: string; sourceField: string; evidence: unknown[] }>;
      layers: { goals: string[]; workflows: string[]; tasks: string[]; knowledge: string[]; sources: string[] };
      gaps: Array<{ id: string; layer: string; title: string; evidence: unknown[] }>;
      reviewItems: Array<{ id: string }>;
      unsupportedFamilies: Array<{ family: string }>;
    };
  };
  assert.equal(areaGraphBody.data.area.id, graphStrategyArea.id);
  assert.equal(areaGraphBody.data.area.key, "strategy-governance");
  assert.equal(areaGraphBody.data.area.canonicalKey, "01-strategia");
  assert.equal(areaGraphBody.data.area.resolvedKey, "strategy-governance");
  assert.ok(areaGraphBody.data.summary.goals >= 2);
  assert.ok(areaGraphBody.data.summary.targets >= 1);
  assert.ok(areaGraphBody.data.summary.metrics >= 1);
  assert.ok(areaGraphBody.data.summary.workflows >= 2);
  assert.ok(areaGraphBody.data.summary.tasks >= 1);
  assert.ok(areaGraphBody.data.summary.knowledge >= 2);
  assert.ok(areaGraphBody.data.summary.sources >= 1);
  assert.ok(areaGraphBody.data.summary.gaps >= 1);
  assert.ok(areaGraphBody.data.nodes.some((node) => node.id === `goal:${graphGoal.id}`));
  assert.ok(areaGraphBody.data.nodes.some((node) => node.id === `google_drive_file:${graphAreaDriveFile.id}` && node.metadata?.latestSnapshot));
  assert.ok(areaGraphBody.data.edges.some((edge) => (
    edge.from === `goal:${graphGoal.id}`
    && edge.to === `target:${graphTarget.id}`
    && edge.confidence === "direct"
    && edge.sourceModel === "Target"
    && edge.sourceField === "goalId"
    && edge.evidence.length > 0
  )));
  assert.ok(areaGraphBody.data.edges.some((edge) => (
    edge.from === `goal:${graphGoal.id}`
    && edge.to === `process:${graphProcess.id}`
    && edge.sourceModel === "Goal"
    && edge.sourceField === "processId"
  )));
  assert.ok(areaGraphBody.data.edges.some((edge) => (
    edge.from === `pipeline:${graphPipeline.id}`
    && edge.to === `target:${graphTarget.id}`
    && edge.sourceModel === "Target"
    && edge.sourceField === "pipelineId"
  )));
  assert.ok(areaGraphBody.data.edges.some((edge) => (
    edge.from === `pipeline_run:${graphPipelineRun.id}`
    && edge.to === `task:${graphTask.id}`
    && edge.confidence === "direct"
    && edge.sourceModel === "PipelineRunTaskLink"
    && edge.sourceField === "pipelineRunId/taskId"
  )));
  assert.ok(areaGraphBody.data.edges.some((edge) => (
    edge.from === `knowledge_item:${graphKnowledgeItem.id}`
    && edge.to === `goal:${graphGoal.id}`
    && edge.sourceModel === "KnowledgeLink"
    && edge.sourceField === "targetType/targetId"
  )));
  assert.ok(areaGraphBody.data.edges.some((edge) => edge.confidence === "content_inferred"));
  assert.ok(areaGraphBody.data.layers.goals.includes(`goal:${graphGoal.id}`));
  assert.ok(areaGraphBody.data.layers.workflows.includes(`process:${graphProcess.id}`));
  assert.ok(areaGraphBody.data.layers.tasks.includes(`task:${graphTask.id}`));
  assert.ok(areaGraphBody.data.layers.knowledge.includes(`knowledge_item:${graphKnowledgeItem.id}`));
  assert.ok(areaGraphBody.data.gaps.some((gap) => gap.id === `gap:goal:${graphLonelyGoal.id}:target`));
  assert.ok(areaGraphBody.data.reviewItems.some((item) => item.id === `gap:goal:${graphLonelyGoal.id}:target`));
  assert.ok(!areaGraphBody.data.unsupportedFamilies.some((family) => family.family === "target_metric_fk"));
  assert.ok(!areaGraphBody.data.unsupportedFamilies.some((family) => family.family === "knowledge_goal_task_links"));

  const salesAreaGraph = await request("/v1/operating-graph/areas/03-sprzedaz?limit=20", { headers: authA });
  assert.equal(salesAreaGraph.status, 200);
  const salesAreaGraphBody = salesAreaGraph.body as { data: { area: { key: string; canonicalKey: string; resolvedKey: string; position: number } } };
  assert.equal(salesAreaGraphBody.data.area.key, "sales-crm");
  assert.equal(salesAreaGraphBody.data.area.canonicalKey, "03-sprzedaz");
  assert.equal(salesAreaGraphBody.data.area.resolvedKey, "sales-crm");
  assert.notEqual(salesAreaGraphBody.data.area.position, 3);

  const financeAreaGraph = await request("/v1/operating-graph/areas/07-finanse?limit=20", { headers: authA });
  assert.equal(financeAreaGraph.status, 200);
  const financeAreaGraphBody = financeAreaGraph.body as { data: { area: { key: string; canonicalKey: string; resolvedKey: string; position: number } } };
  assert.equal(financeAreaGraphBody.data.area.key, "finance-billing");
  assert.equal(financeAreaGraphBody.data.area.canonicalKey, "07-finanse");
  assert.equal(financeAreaGraphBody.data.area.resolvedKey, "finance-billing");
  assert.notEqual(financeAreaGraphBody.data.area.position, 7);

  const foreignAreaGraph = await request("/v1/operating-graph/areas/01-strategia?limit=100", { headers: selectedWorkspaceAuth });
  assert.equal(foreignAreaGraph.status, 200);
  const foreignAreaGraphBody = foreignAreaGraph.body as { data: { nodes: Array<{ id: string }> } };
  assert.ok(!foreignAreaGraphBody.data.nodes.some((node) => node.id === `goal:${graphGoal.id}`));

  const missingAreaGraph = await request("/v1/operating-graph/areas/not-a-real-area", { headers: authA });
  assert.equal(missingAreaGraph.status, 404);

  const mcpManifestWithOperatingGraph = await request("/v1/mcp/manifest", { headers: authA });
  assert.equal(mcpManifestWithOperatingGraph.status, 200);
  const mcpManifestWithOperatingGraphBody = mcpManifestWithOperatingGraph.body as {
    data: { tools: Array<{ path: string; capability: string; riskLevel: string; requiresApproval: boolean }> };
  };
  assert.ok(mcpManifestWithOperatingGraphBody.data.tools.some((tool) => (
    tool.path === "/v1/operating-graph/areas/:areaKey"
    && tool.capability === "operating-graph:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));

  await prisma.googleDriveContentSnapshot.delete({ where: { id: graphAreaDriveSnapshot.id } });
  await prisma.googleDriveFile.delete({ where: { id: graphAreaDriveFile.id } });
  await prisma.externalContainerMapping.delete({ where: { id: graphAreaMapping.id } });
  await prisma.knowledgeItem.delete({ where: { id: graphKnowledgeItem.id } });
  await prisma.pipelineRun.delete({ where: { id: graphPipelineRun.id } });
  await prisma.metric.delete({ where: { id: graphMetric.id } });
  await prisma.pipeline.delete({ where: { id: graphPipeline.id } });
  await prisma.process.delete({ where: { id: graphProcess.id } });
  await prisma.task.delete({ where: { id: graphTask.id } });
  await prisma.target.delete({ where: { id: graphTarget.id } });
  await prisma.goal.deleteMany({ where: { id: { in: [graphGoal.id, graphLonelyGoal.id] } } });

  await prisma.googleDriveFile.deleteMany({
    where: { id: { in: [driveRoot.id, driveChild.id] } }
  });
  await prisma.automationDefinition.delete({ where: { id: graphAutomationDefinition.id } });
  await prisma.knowledgeRoot.delete({ where: { id: graphKnowledgeRoot.id } });
  await prisma.storageLocation.delete({ where: { id: graphStorageLocation.id } });
  await prisma.externalFieldMapping.delete({ where: { id: mappedField.id } });
  await prisma.externalContainerMapping.deleteMany({
    where: { id: { in: [assignedMapping.id, unassignedMapping.id] } }
  });

  const foreignWorkspaceSelect = await request(`/v1/workspaces/${secondWorkspaceBody.data.workspace.id}/actions/select`, {
    method: "POST",
    headers: authB
  });
  assert.equal(foreignWorkspaceSelect.status, 404);
  assert.equal((foreignWorkspaceSelect.body as { error: string }).error, "not_found");

  const humanOwnerRole = await prisma.companyRole.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Human Owner",
      type: "human",
      responsibilities: ["approve high-risk work"],
      permissions: ["approval:decide"],
      allowedTools: ["companycore"]
    }
  });
  const pmAgentRole = await prisma.companyRole.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Project Manager Agent",
      type: "agent",
      escalationTargetId: humanOwnerRole.id,
      responsibilities: ["coordinate pipelines"],
      permissions: ["pipeline:read", "task:write"],
      allowedTools: ["companycore", "clickup"],
      defaultPolicies: ["high-risk actions require approval"]
    }
  });
  const clickUpAdapter = await prisma.toolAdapter.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      name: "ClickUp",
      authType: "api_key",
      connectionStatus: "configured",
      healthStatus: "unknown",
      ownerRoleId: pmAgentRole.id
    }
  });
  await prisma.integrationCapability.create({
    data: {
      workspaceId: ownerA.workspace.id,
      toolAdapterId: clickUpAdapter.id,
      capabilityKey: "create_task",
      requiredPermissions: ["clickup:create_task"],
      riskLevel: "medium",
      auditRequired: true
    }
  });
  const onboardingProcess = await prisma.process.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Client onboarding",
      ownerRoleId: pmAgentRole.id,
      department: "Customer Success",
      status: "active",
      maturityLevel: "defined"
    }
  });
  const onboardingPipeline = await prisma.pipeline.create({
    data: {
      workspaceId: ownerA.workspace.id,
      processId: onboardingProcess.id,
      name: "Client Onboarding Pipeline",
      purpose: "Move a client from lead to delivery kickoff.",
      triggerType: "manual",
      defaultOwnerRoleId: pmAgentRole.id,
      status: "active",
      isAutomatable: true,
      riskLevel: "medium"
    }
  });
  const onboardingProcedure = await prisma.procedure.create({
    data: {
      workspaceId: ownerA.workspace.id,
      processId: onboardingProcess.id,
      name: "Client Onboarding SOP",
      purpose: "Run client onboarding with evidence and approval gates.",
      ownerRoleId: pmAgentRole.id,
      status: "active",
      requiredTools: ["companycore", "clickup"],
      requiredPermissions: ["client:write", "task:write"]
    }
  });
  const kickoffStage = await prisma.pipelineStage.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: onboardingPipeline.id,
      name: "Kickoff",
      position: 1,
      assignedRoleId: pmAgentRole.id,
      procedureId: onboardingProcedure.id,
      requiredTools: ["companycore", "clickup"],
      requiredApprovals: ["Human Owner"],
      status: "active"
    }
  });
  await prisma.procedureStep.create({
    data: {
      procedureId: onboardingProcedure.id,
      stepOrder: 1,
      instruction: "Prepare kickoff plan and create follow-up tasks.",
      stepType: "integration_call",
      requiredToolAdapterId: clickUpAdapter.id,
      validationRule: { evidenceRequired: true }
    }
  });
  const onboardingResource = await prisma.resource.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "pipeline",
      externalProvider: "companycore",
      externalId: "client-onboarding-pipeline",
      name: "Client onboarding pipeline resource",
      ownerRoleId: pmAgentRole.id,
      relatedProcessId: onboardingProcess.id
    }
  });
  const hydratedPipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: onboardingPipeline.id },
    include: {
      process: true,
      defaultOwnerRole: true,
      stages: {
        include: {
          assignedRole: true,
          procedure: {
            include: { steps: true }
          }
        }
      }
    }
  });
  assert.equal(hydratedPipeline.process?.name, "Client onboarding");
  assert.equal(hydratedPipeline.defaultOwnerRole?.name, "Project Manager Agent");
  assert.equal(hydratedPipeline.stages[0]?.id, kickoffStage.id);
  assert.equal(hydratedPipeline.stages[0]?.procedure?.steps[0]?.stepType, "integration_call");
  const clickUpCapabilities = await prisma.integrationCapability.findMany({
    where: { toolAdapterId: clickUpAdapter.id }
  });
  assert.equal(clickUpCapabilities[0]?.capabilityKey, "create_task");
  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: onboardingPipeline.id,
      initiatedByType: "agent",
      initiatedById: pmAgentRole.id,
      status: "running",
      currentStageId: kickoffStage.id,
      inputPayload: { client: "Acme" },
      linkedClientId: null,
      linkedProjectId: null,
      correlationId: "ccos-test-onboarding-run"
    }
  });
  const stageRun = await prisma.stageRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineRunId: pipelineRun.id,
      pipelineStageId: kickoffStage.id,
      assignedActorType: "agent",
      assignedActorId: pmAgentRole.id,
      status: "running",
      approvalStatus: "pending",
      inputPayload: { kickoff: true },
      logs: [{ level: "info", message: "Stage started" }]
    }
  });
  const approval = await prisma.approval.create({
    data: {
      workspaceId: ownerA.workspace.id,
      requestedByType: "agent",
      requestedById: pmAgentRole.id,
      requestedForAction: "send_kickoff_plan_to_client",
      resourceType: "stage_run",
      resourceId: stageRun.id,
      riskLevel: "high",
      approverRoleId: humanOwnerRole.id,
      status: "pending",
      pipelineRunId: pipelineRun.id,
      stageRunId: stageRun.id
    }
  });
  const checklistTemplate = await prisma.checklistTemplate.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Pipeline run completion checklist",
      targetType: "pipeline_run",
      status: "active",
      items: {
        create: [
          {
            workspaceId: ownerA.workspace.id,
            itemOrder: 1,
            text: "Output payload records the result.",
            required: true
          }
        ]
      }
    },
    include: { items: true }
  });
  const acceptanceCriterion = await prisma.acceptanceCriterion.create({
    data: {
      workspaceId: ownerA.workspace.id,
      checklistItemId: checklistTemplate.items[0]!.id,
      targetType: "stage_run",
      targetId: stageRun.id,
      text: "Kickoff stage has validation evidence.",
      required: true,
      validationStatus: "pending",
      pipelineRunId: pipelineRun.id,
      stageRunId: stageRun.id,
      evidence: { source: "test" }
    }
  });
  const auditLog = await prisma.auditLog.create({
    data: {
      workspaceId: ownerA.workspace.id,
      actorType: "agent",
      actorId: pmAgentRole.id,
      action: "approval_requested",
      resourceType: "approval",
      resourceId: approval.id,
      toolAdapterId: clickUpAdapter.id,
      inputPayload: { action: "send_kickoff_plan_to_client" },
      outputPayload: { status: "pending" },
      approvalId: approval.id,
      pipelineRunId: pipelineRun.id,
      stageRunId: stageRun.id,
      correlationId: pipelineRun.correlationId
    }
  });
  await createEvent({
    type: "approval_requested",
    workspaceId: ownerA.workspace.id,
    source: "companycore",
    actorType: "agent",
    actorId: pmAgentRole.id,
    resourceType: "approval",
    resourceId: approval.id,
    correlationId: pipelineRun.correlationId,
    payload: { auditLogId: auditLog.id }
  });
  const hydratedRun = await prisma.pipelineRun.findUniqueOrThrow({
    where: { id: pipelineRun.id },
    include: {
      stageRuns: {
        include: {
          approvals: true,
          auditLogs: true,
          acceptanceCriteria: true
        }
      },
      approvals: true,
      auditLogs: true
    }
  });
  assert.equal(hydratedRun.stageRuns[0]?.approvals[0]?.id, approval.id);
  assert.equal(hydratedRun.stageRuns[0]?.auditLogs[0]?.id, auditLog.id);
  assert.equal(hydratedRun.stageRuns[0]?.acceptanceCriteria[0]?.id, acceptanceCriterion.id);
  assert.equal(hydratedRun.approvals[0]?.status, "pending");
  assert.equal(hydratedRun.auditLogs[0]?.correlationId, "ccos-test-onboarding-run");
  const correlatedEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "approval_requested",
      correlationId: pipelineRun.correlationId
    }
  });
  assert.equal(correlatedEvent.resourceType, "approval");
  const businessFunction = await prisma.businessFunction.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Customer Success",
      category: "delivery",
      description: "Owns client onboarding and post-sale continuity.",
      accountableRoleId: pmAgentRole.id,
      status: "active"
    }
  });
  const policy = await prisma.policy.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Client-facing agent messages require approval",
      description: "Agents can draft client-facing communication but need approval before sending.",
      appliesTo: "agent",
      ruleType: "external_communication",
      severity: "high",
      enforcementMode: "require_approval",
      escalationRoleId: humanOwnerRole.id,
      processId: onboardingProcess.id,
      procedureId: onboardingProcedure.id,
      status: "active"
    }
  });
  const metric = await prisma.metric.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Client onboarding cycle time",
      category: "delivery",
      measurementType: "duration",
      unit: "hours",
      targetValue: 48,
      currentValue: 12,
      ownerRoleId: pmAgentRole.id,
      processId: onboardingProcess.id,
      pipelineId: onboardingPipeline.id,
      calculation: { from: "pipeline_runs.started_at", to: "pipeline_runs.completed_at" }
    }
  });
  const risk = await prisma.risk.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Kickoff sent without approval",
      description: "An agent may send a client-facing kickoff plan before human review.",
      category: "client_communication",
      riskLevel: "high",
      likelihood: "medium",
      impact: "high",
      processId: onboardingProcess.id,
      pipelineId: onboardingPipeline.id
    }
  });
  const control = await prisma.control.create({
    data: {
      workspaceId: ownerA.workspace.id,
      riskId: risk.id,
      name: "Require approval before external kickoff message",
      description: "Approval must exist before the client-facing message leaves CompanyCore.",
      controlType: "approval_gate",
      ownerRoleId: humanOwnerRole.id,
      verificationMethod: "approval.status must be approved"
    }
  });
  const knowledgeItem = await prisma.knowledgeItem.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Client onboarding SOP reference",
      itemType: "procedure",
      summary: "Knowledge item linked to the onboarding process and pipeline.",
      sourceProvider: "companycore",
      sourceExternalId: "client-onboarding-sop-reference",
      processId: onboardingProcess.id,
      pipelineId: onboardingPipeline.id
    }
  });
  const decisionLog = await prisma.decisionLog.create({
    data: {
      workspaceId: ownerA.workspace.id,
      context: "Client-facing agent communication policy",
      optionsConsidered: ["allow autonomous send", "require approval", "block all client messages"],
      chosenOption: "require approval",
      reason: "Client-facing messages are high-context and reputationally sensitive.",
      decidedByType: "user",
      decidedById: humanOwnerRole.id,
      processId: onboardingProcess.id,
      pipelineId: onboardingPipeline.id,
      consequences: "Agents can draft but must request approval.",
      reviewDate: new Date("2026-06-01T00:00:00.000Z")
    }
  });
  const automationRule = await prisma.automationRule.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Escalate blocked onboarding stage",
      description: "Escalate when a stage run is blocked.",
      pipelineId: onboardingPipeline.id,
      condition: { stageRunStatus: "blocked" },
      action: { createApproval: true, notifyRole: "Human Owner" },
      status: "active",
      triggers: {
        create: [
          {
            workspaceId: ownerA.workspace.id,
            sourceType: "system_event",
            eventType: "stage_blocked",
            status: "active"
          }
        ]
      }
    },
    include: { triggers: true }
  });
  const artifact = await prisma.artifact.create({
    data: {
      workspaceId: ownerA.workspace.id,
      artifactType: "report",
      name: "Onboarding kickoff report",
      resourceId: onboardingResource.id,
      metadata: { pipelineRunId: pipelineRun.id }
    }
  });
  const dependency = await prisma.dependency.create({
    data: {
      workspaceId: ownerA.workspace.id,
      dependencyType: "resource_to_artifact",
      fromResourceId: onboardingResource.id,
      toEntityType: "artifact",
      toEntityId: artifact.id,
      status: "active"
    }
  });
  const stakeholder = await prisma.stakeholder.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Acme Project Sponsor",
      type: "client",
      role: "sponsor",
      metadata: { pipelineRunId: pipelineRun.id }
    }
  });
  const hydratedRisk = await prisma.risk.findUniqueOrThrow({
    where: { id: risk.id },
    include: { controls: true, pipeline: true, process: true }
  });
  assert.equal(hydratedRisk.controls[0]?.id, control.id);
  assert.equal(hydratedRisk.pipeline?.id, onboardingPipeline.id);
  assert.equal(policy.enforcementMode, "require_approval");
  assert.equal(metric.targetValue, 48);
  assert.equal(knowledgeItem.processId, onboardingProcess.id);
  assert.equal(decisionLog.chosenOption, "require approval");
  assert.equal(automationRule.triggers[0]?.eventType, "stage_blocked");
  assert.equal(dependency.toEntityId, artifact.id);
  assert.equal(businessFunction.accountableRoleId, pmAgentRole.id);
  assert.equal(stakeholder.type, "client");

  const companyOsSnapshot = await request("/v1/company-os", { headers: authA });
  assert.equal(companyOsSnapshot.status, 200);
  const companyOsSnapshotBody = companyOsSnapshot.body as {
    data: {
      service: string;
      counts: {
        definitions: { processes: number; pipelines: number; procedures: number; toolAdapters: number };
        runtime: { pipelineRuns: number; stageRuns: number; approvals: number; auditLogs: number; events: number };
        governance: { policies: number; risks: number; controls: number; automationRules: number; businessFunctions: number };
      };
      attention: {
        pendingApprovals: Array<{ id: string }>;
        highRisks: Array<{ id: string }>;
      };
      recent: {
        pipelineRuns: Array<{ id: string }>;
        auditLogs: Array<{ id: string }>;
        events: Array<{ id: string }>;
      };
      collections: string[];
    };
  };
  assert.equal(companyOsSnapshotBody.data.service, "company-os");
  assert.equal(companyOsSnapshotBody.data.counts.definitions.processes, 1);
  assert.equal(companyOsSnapshotBody.data.counts.definitions.pipelines, 1);
  assert.equal(companyOsSnapshotBody.data.counts.definitions.procedures, 1);
  assert.equal(companyOsSnapshotBody.data.counts.definitions.toolAdapters, 1);
  assert.equal(companyOsSnapshotBody.data.counts.runtime.pipelineRuns, 1);
  assert.equal(companyOsSnapshotBody.data.counts.runtime.stageRuns, 1);
  assert.equal(companyOsSnapshotBody.data.counts.runtime.approvals, 1);
  assert.equal(companyOsSnapshotBody.data.counts.runtime.auditLogs, 1);
  assert.ok(companyOsSnapshotBody.data.counts.runtime.events >= 1);
  assert.equal(companyOsSnapshotBody.data.counts.governance.policies, 1);
  assert.equal(companyOsSnapshotBody.data.counts.governance.risks, 1);
  assert.equal(companyOsSnapshotBody.data.counts.governance.controls, 1);
  assert.equal(companyOsSnapshotBody.data.counts.governance.automationRules, 1);
  assert.equal(companyOsSnapshotBody.data.counts.governance.businessFunctions, 1);
  assert.equal(companyOsSnapshotBody.data.attention.pendingApprovals[0]?.id, approval.id);
  assert.equal(companyOsSnapshotBody.data.attention.highRisks[0]?.id, risk.id);
  assert.equal(companyOsSnapshotBody.data.recent.pipelineRuns[0]?.id, pipelineRun.id);
  assert.equal(companyOsSnapshotBody.data.recent.auditLogs[0]?.id, auditLog.id);
  assert.ok(companyOsSnapshotBody.data.recent.events.some((event) => event.id === correlatedEvent.id));
  assert.ok(companyOsSnapshotBody.data.collections.includes("pipelines"));
  assert.ok(companyOsSnapshotBody.data.collections.includes("automation-rules"));

  const listedCompanyOsPipelines = await request("/v1/company-os/pipelines?limit=1", { headers: authA });
  assert.equal(listedCompanyOsPipelines.status, 200);
  const listedCompanyOsPipelinesBody = listedCompanyOsPipelines.body as {
    data: Array<{ id: string; stages: Array<{ id: string }> }>;
  };
  assert.equal(listedCompanyOsPipelinesBody.data[0]?.id, onboardingPipeline.id);
  assert.equal(listedCompanyOsPipelinesBody.data[0]?.stages[0]?.id, kickoffStage.id);

  const readCompanyOsApproval = await request(`/v1/company-os/approvals/${approval.id}`, { headers: authA });
  assert.equal(readCompanyOsApproval.status, 200);
  assert.equal((readCompanyOsApproval.body as { data: { id: string; auditLogs: Array<{ id: string }> } }).data.auditLogs[0]?.id, auditLog.id);

  const lifecycleApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      requestedByType: "agent",
      requestedById: pmAgentRole.id,
      requestedForAction: "drive.file.update",
      resourceType: "stage_run",
      resourceId: stageRun.id,
      riskLevel: "high",
      approverRoleId: humanOwnerRole.id,
      pipelineRunId: pipelineRun.id,
      stageRunId: stageRun.id,
      inputPayload: {
        reason: "Agent needs permission to update a client-facing document."
      }
    })
  });
  assert.equal(lifecycleApprovalRequest.status, 201);
  const lifecycleApprovalRequestBody = lifecycleApprovalRequest.body as {
    data: { id: string; status: string; correlationId: string; auditLogId: string };
  };
  assert.equal(lifecycleApprovalRequestBody.data.status, "pending");
  assert.ok(lifecycleApprovalRequestBody.data.correlationId);
  assert.ok(lifecycleApprovalRequestBody.data.auditLogId);
  const lifecycleRequestAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: lifecycleApprovalRequestBody.data.auditLogId }
  });
  assert.equal(lifecycleRequestAudit.action, "approval.requested");
  assert.equal(lifecycleRequestAudit.correlationId, lifecycleApprovalRequestBody.data.correlationId);
  const lifecycleRequestEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "approval_requested",
      resourceId: lifecycleApprovalRequestBody.data.id,
      correlationId: lifecycleApprovalRequestBody.data.correlationId
    }
  });
  assert.equal(lifecycleRequestEvent.resourceType, "approval");

  const lifecycleApprovalDecision = await request(`/v1/company-os/approvals/${lifecycleApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Scope and rollback plan are acceptable."
    })
  });
  assert.equal(lifecycleApprovalDecision.status, 200);
  const lifecycleApprovalDecisionBody = lifecycleApprovalDecision.body as {
    data: { id: string; status: string; decisionReason: string; approverUserId: string | null; correlationId: string; auditLogId: string };
  };
  assert.equal(lifecycleApprovalDecisionBody.data.status, "approved");
  assert.equal(lifecycleApprovalDecisionBody.data.decisionReason, "Scope and rollback plan are acceptable.");
  const ownerAWorkspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: ownerA.workspace.id }
  });
  assert.equal(lifecycleApprovalDecisionBody.data.approverUserId, ownerAWorkspace.ownerUserId);
  const decidedApproval = await prisma.approval.findUniqueOrThrow({
    where: { id: lifecycleApprovalRequestBody.data.id }
  });
  assert.equal(decidedApproval.status, "approved");
  assert.equal(decidedApproval.approverUserId, ownerAWorkspace.ownerUserId);
  const lifecycleDecisionAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: lifecycleApprovalDecisionBody.data.auditLogId }
  });
  assert.equal(lifecycleDecisionAudit.action, "approval.decided");
  assert.equal(lifecycleDecisionAudit.correlationId, lifecycleApprovalDecisionBody.data.correlationId);
  const lifecycleDecisionEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "approval_approved",
      resourceId: lifecycleApprovalRequestBody.data.id,
      correlationId: lifecycleApprovalDecisionBody.data.correlationId
    }
  });
  assert.equal(lifecycleDecisionEvent.resourceType, "approval");

  const repeatedApprovalDecision = await request(`/v1/company-os/approvals/${lifecycleApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      decision: "rejected",
      decisionReason: "Trying to overwrite the decision."
    })
  });
  assert.equal(repeatedApprovalDecision.status, 409);
  assert.equal((repeatedApprovalDecision.body as { error: string }).error, "approval_already_decided");

  const crossWorkspaceApprovalDecision = await request(`/v1/company-os/approvals/${lifecycleApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Workspace B should not see this approval."
    })
  });
  assert.equal(crossWorkspaceApprovalDecision.status, 404);

  const pipelineRunTaskLink = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/task-links`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      taskId: operationsTask.id,
      linkType: "execution_evidence",
      source: "companycore"
    })
  });
  assert.equal(pipelineRunTaskLink.status, 201);
  const pipelineRunTaskLinkBody = pipelineRunTaskLink.body as {
    data: { id: string; taskId: string; pipelineRunId: string; linkType: string; correlationId: string; auditLogId: string };
  };
  assert.equal(pipelineRunTaskLinkBody.data.taskId, operationsTask.id);
  assert.equal(pipelineRunTaskLinkBody.data.pipelineRunId, pipelineRun.id);
  assert.equal(pipelineRunTaskLinkBody.data.linkType, "execution_evidence");
  const pipelineRunTaskLinkAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: pipelineRunTaskLinkBody.data.auditLogId }
  });
  assert.equal(pipelineRunTaskLinkAudit.action, "pipeline_run.task_linked");
  const pipelineRunTaskLinkEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "pipeline_run_task_linked",
      resourceId: pipelineRunTaskLinkBody.data.id,
      correlationId: pipelineRunTaskLinkBody.data.correlationId
    }
  });
  assert.equal(pipelineRunTaskLinkEvent.resourceType, "pipeline_run_task_link");
  const deniedPipelineRunTaskLink = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/task-links`, {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      taskId: operationsTask.id,
      linkType: "execution_evidence",
      source: "companycore"
    })
  });
  assert.equal(deniedPipelineRunTaskLink.status, 404);
  const linkedKnowledgeItem = await prisma.knowledgeItem.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Lifecycle link note",
      itemType: "note",
      summary: "Lifecycle evidence link test."
    }
  });
  const knowledgeLinkCreate = await request("/v1/company-os/knowledge-links", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      knowledgeItemId: linkedKnowledgeItem.id,
      targetType: "task",
      targetId: operationsTask.id,
      linkType: "evidence",
      confidence: "owner_assigned"
    })
  });
  assert.equal(knowledgeLinkCreate.status, 201);
  const knowledgeLinkCreateBody = knowledgeLinkCreate.body as {
    data: { id: string; targetType: string; targetId: string; correlationId: string; auditLogId: string };
  };
  assert.equal(knowledgeLinkCreateBody.data.targetType, "task");
  assert.equal(knowledgeLinkCreateBody.data.targetId, operationsTask.id);
  const knowledgeLinkAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: knowledgeLinkCreateBody.data.auditLogId }
  });
  assert.equal(knowledgeLinkAudit.action, "knowledge_link.created");
  const knowledgeLinkEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "knowledge_link_created",
      resourceId: knowledgeLinkCreateBody.data.id,
      correlationId: knowledgeLinkCreateBody.data.correlationId
    }
  });
  assert.equal(knowledgeLinkEvent.resourceType, "knowledge_link");
  const deniedKnowledgeLinkCreate = await request("/v1/company-os/knowledge-links", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      knowledgeItemId: linkedKnowledgeItem.id,
      targetType: "task",
      targetId: operationsTask.id,
      linkType: "evidence"
    })
  });
  assert.equal(deniedKnowledgeLinkCreate.status, 404);

  const startedStageRun = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/actions/start-stage`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      pipelineStageId: kickoffStage.id,
      assignedActorType: "agent",
      assignedActorId: pmAgentRole.id,
      inputPayload: {
        source: "integration-test"
      },
      approvalId: lifecycleApprovalRequestBody.data.id
    })
  });
  assert.equal(startedStageRun.status, 200);
  const startedStageRunBody = startedStageRun.body as {
    data: { id: string; status: string; approvalStatus: string; correlationId: string; auditLogId: string };
  };
  assert.equal(startedStageRunBody.data.id, stageRun.id);
  assert.equal(startedStageRunBody.data.status, "running");
  assert.equal(startedStageRunBody.data.approvalStatus, "approved");
  const stageStartedAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: startedStageRunBody.data.auditLogId }
  });
  assert.equal(stageStartedAudit.action, "stage_run.started");
  const stageStartedEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "stage_started",
      resourceId: stageRun.id,
      correlationId: startedStageRunBody.data.correlationId
    }
  });
  assert.equal(stageStartedEvent.resourceType, "stage_run");

  const blockedStageRun = await request(`/v1/company-os/stage-runs/${stageRun.id}/actions/block`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Waiting for document update verification.",
      approvalId: lifecycleApprovalRequestBody.data.id,
      errorState: {
        blocker: "document_verification"
      }
    })
  });
  assert.equal(blockedStageRun.status, 200);
  const blockedStageRunBody = blockedStageRun.body as {
    data: { id: string; status: string; correlationId: string; auditLogId: string };
  };
  assert.equal(blockedStageRunBody.data.status, "blocked");
  const blockedPipelineRun = await prisma.pipelineRun.findUniqueOrThrow({
    where: { id: pipelineRun.id }
  });
  assert.equal(blockedPipelineRun.status, "blocked");
  const stageBlockedAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: blockedStageRunBody.data.auditLogId }
  });
  assert.equal(stageBlockedAudit.action, "stage_run.blocked");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "stage_blocked",
      resourceId: stageRun.id,
      correlationId: blockedStageRunBody.data.correlationId
    }
  });

  const incompleteStageCompletion = await request(`/v1/company-os/stage-runs/${stageRun.id}/actions/complete`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      outputPayload: {
        result: "not-ready"
      },
      approvalId: lifecycleApprovalRequestBody.data.id
    })
  });
  assert.equal(incompleteStageCompletion.status, 409);
  assert.equal((incompleteStageCompletion.body as { error: string }).error, "acceptance_criteria_incomplete");

  const validatedStageRun = await request(`/v1/company-os/stage-runs/${stageRun.id}/actions/validate`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      validationStatus: "passed",
      validationResult: {
        checkedBy: "api-test"
      },
      acceptanceCriteria: [
        {
          id: acceptanceCriterion.id,
          validationStatus: "passed",
          evidence: {
            note: "Kickoff plan verified."
          }
        }
      ]
    })
  });
  assert.equal(validatedStageRun.status, 200);
  const validatedStageRunBody = validatedStageRun.body as {
    data: { id: string; validationResult: { status: string }; correlationId: string; auditLogId: string };
  };
  assert.equal(validatedStageRunBody.data.validationResult.status, "passed");
  const updatedAcceptanceCriterion = await prisma.acceptanceCriterion.findUniqueOrThrow({
    where: { id: acceptanceCriterion.id }
  });
  assert.equal(updatedAcceptanceCriterion.validationStatus, "passed");
  assert.equal(updatedAcceptanceCriterion.verifiedByType, "user");
  const stageValidatedAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: validatedStageRunBody.data.auditLogId }
  });
  assert.equal(stageValidatedAudit.action, "stage_run.validated");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "stage_validated",
      resourceId: stageRun.id,
      correlationId: validatedStageRunBody.data.correlationId
    }
  });

  const completedStageRun = await request(`/v1/company-os/stage-runs/${stageRun.id}/actions/complete`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      outputPayload: {
        result: "kickoff-ready"
      },
      validationResult: {
        acceptance: "all-required-passed"
      },
      approvalId: lifecycleApprovalRequestBody.data.id
    })
  });
  assert.equal(completedStageRun.status, 200);
  const completedStageRunBody = completedStageRun.body as {
    data: { id: string; status: string; outputPayload: { result: string }; correlationId: string; auditLogId: string };
  };
  assert.equal(completedStageRunBody.data.status, "completed");
  assert.equal(completedStageRunBody.data.outputPayload.result, "kickoff-ready");
  const stageCompletedAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: completedStageRunBody.data.auditLogId }
  });
  assert.equal(stageCompletedAudit.action, "stage_run.completed");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "stage_completed",
      resourceId: stageRun.id,
      correlationId: completedStageRunBody.data.correlationId
    }
  });

  const repeatedStageCompletion = await request(`/v1/company-os/stage-runs/${stageRun.id}/actions/complete`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      outputPayload: {
        result: "repeat"
      },
      approvalId: lifecycleApprovalRequestBody.data.id
    })
  });
  assert.equal(repeatedStageCompletion.status, 409);
  assert.equal((repeatedStageCompletion.body as { error: string }).error, "invalid_stage_transition");

  const automationSourceEvent = await prisma.event.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "stage_completed",
      source: "companycore",
      actorType: "user",
      actorId: ownerAWorkspace.ownerUserId,
      resourceType: "stage_run",
      resourceId: stageRun.id,
      correlationId: completedStageRunBody.data.correlationId,
      payload: {
        stageRunId: stageRun.id,
        pipelineRunId: pipelineRun.id,
        status: "completed"
      }
    }
  });
  const emitAutomationRule = await prisma.automationRule.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Emit documentation follow-up after completed stage",
      pipelineId: onboardingPipeline.id,
      condition: { eventType: "stage_completed", payloadPath: "status", equals: "completed" },
      action: { type: "emit_event", eventType: "documentation_followup_needed", payload: { source: "automation-test" } },
      status: "active",
      triggers: {
        create: [{
          workspaceId: ownerA.workspace.id,
          sourceType: "system_event",
          eventType: "stage_completed",
          status: "active"
        }]
      }
    }
  });
  const approvalAutomationRule = await prisma.automationRule.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Request owner approval after completed stage",
      pipelineId: onboardingPipeline.id,
      condition: { eventType: "stage_completed" },
      action: {
        type: "request_approval",
        requestedForAction: "stage.completed.followup",
        riskLevel: "high",
        approverRoleId: humanOwnerRole.id
      },
      status: "active",
      triggers: {
        create: [{
          workspaceId: ownerA.workspace.id,
          sourceType: "system_event",
          eventType: "stage_completed",
          status: "active"
        }]
      }
    }
  });
  const automationDryRun = await request(`/v1/company-os/events/${automationSourceEvent.id}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      mode: "dry_run",
      ruleIds: [emitAutomationRule.id, approvalAutomationRule.id]
    })
  });
  assert.equal(automationDryRun.status, 200);
  const automationDryRunBody = automationDryRun.body as {
    data: {
      matchedRuleIds: string[];
      proposals: Array<{ ruleId: string; actionKind: string; requiresApproval: boolean }>;
      executed: unknown[];
    };
  };
  assert.deepEqual(new Set(automationDryRunBody.data.matchedRuleIds), new Set([emitAutomationRule.id, approvalAutomationRule.id]));
  assert.equal(automationDryRunBody.data.proposals.length, 2);
  assert.equal(automationDryRunBody.data.executed.length, 0);
  assert.ok(automationDryRunBody.data.proposals.some((proposal) => (
    proposal.ruleId === emitAutomationRule.id
    && proposal.actionKind === "emit_event"
    && proposal.requiresApproval === false
  )));
  assert.ok(automationDryRunBody.data.proposals.some((proposal) => (
    proposal.ruleId === approvalAutomationRule.id
    && proposal.actionKind === "request_approval"
    && proposal.requiresApproval === true
  )));

  const automationExecute = await request(`/v1/company-os/events/${automationSourceEvent.id}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      mode: "execute",
      ruleIds: [emitAutomationRule.id, approvalAutomationRule.id],
      idempotencyKey: "stage-completed-followup"
    })
  });
  assert.equal(automationExecute.status, 200);
  const automationExecuteBody = automationExecute.body as {
    data: {
      executed: Array<{ ruleId: string; actionKind: string; eventId?: string; approvalId?: string }>;
      skipped: unknown[];
      emittedEventIds: string[];
      auditLogIds: string[];
    };
  };
  assert.equal(automationExecuteBody.data.executed.length, 2);
  assert.ok(automationExecuteBody.data.emittedEventIds.length >= 5);
  assert.ok(automationExecuteBody.data.auditLogIds.length >= 5);
  const automationApproval = automationExecuteBody.data.executed.find((execution) => execution.actionKind === "request_approval");
  assert.ok(automationApproval?.approvalId);
  const createdAutomationApproval = await prisma.approval.findUniqueOrThrow({
    where: { id: automationApproval.approvalId }
  });
  assert.equal(createdAutomationApproval.status, "pending");
  assert.equal(createdAutomationApproval.resourceType, "stage_run");
  assert.equal(createdAutomationApproval.resourceId, stageRun.id);
  const emittedAutomationEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "documentation_followup_needed",
      resourceType: "stage_run",
      resourceId: stageRun.id
    }
  });
  assert.equal(emittedAutomationEvent.correlationId, (automationExecute.body as { data: { correlationId: string } }).data.correlationId);

  const repeatedAutomationExecute = await request(`/v1/company-os/events/${automationSourceEvent.id}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      mode: "execute",
      ruleIds: [emitAutomationRule.id, approvalAutomationRule.id],
      idempotencyKey: "stage-completed-followup"
    })
  });
  assert.equal(repeatedAutomationExecute.status, 200);
  const repeatedAutomationExecuteBody = repeatedAutomationExecute.body as {
    data: { executed: unknown[]; skipped: Array<{ reason: string }> };
  };
  assert.equal(repeatedAutomationExecuteBody.data.executed.length, 0);
  assert.equal(repeatedAutomationExecuteBody.data.skipped.filter((skip) => skip.reason === "already_processed").length, 2);

  const automationLifecyclePipelineRun = await prisma.pipelineRun.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: onboardingPipeline.id,
      initiatedByType: "system",
      initiatedById: "automation-test",
      status: "pending",
      inputPayload: { source: "automation-lifecycle-test" },
      correlationId: "automation-lifecycle-test"
    }
  });
  const automationLifecycleStage = await prisma.pipelineStage.create({
    data: {
      workspaceId: ownerA.workspace.id,
      pipelineId: onboardingPipeline.id,
      name: "Automation lifecycle test",
      position: 2,
      assignedRoleId: pmAgentRole.id,
      procedureId: onboardingProcedure.id,
      requiredTools: ["companycore"],
      requiredApprovals: [],
      status: "active"
    }
  });
  const automationLifecycleSourceEvent = await prisma.event.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "automation_lifecycle_test",
      source: "companycore",
      actorType: "system",
      actorId: "automation-test",
      resourceType: "pipeline_run",
      resourceId: automationLifecyclePipelineRun.id,
      correlationId: "automation-lifecycle-test",
      payload: {
        pipelineRunId: automationLifecyclePipelineRun.id,
        status: "ready"
      }
    }
  });
  const startLifecycleRule = await prisma.automationRule.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Start stage from automation proposal",
      pipelineId: onboardingPipeline.id,
      condition: { eventType: "automation_lifecycle_test", resourceId: automationLifecyclePipelineRun.id },
      action: {
        type: "start_stage",
        pipelineRunId: automationLifecyclePipelineRun.id,
        pipelineStageId: automationLifecycleStage.id,
        assignedActorType: "agent",
        assignedActorId: pmAgentRole.id,
        inputPayload: { source: "automation" }
      },
      status: "active",
      triggers: {
        create: [{
          workspaceId: ownerA.workspace.id,
          sourceType: "system_event",
          eventType: "automation_lifecycle_test",
          status: "active"
        }]
      }
    }
  });
  const invalidLifecycleRule = await prisma.automationRule.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Reject invalid completed stage proposal",
      pipelineId: onboardingPipeline.id,
      condition: { eventType: "automation_lifecycle_test", resourceId: automationLifecyclePipelineRun.id },
      action: {
        type: "complete_stage",
        stageRunId: stageRun.id,
        outputPayload: { result: "should-not-repeat" }
      },
      status: "active",
      triggers: {
        create: [{
          workspaceId: ownerA.workspace.id,
          sourceType: "system_event",
          eventType: "automation_lifecycle_test",
          status: "active"
        }]
      }
    }
  });
  const automationLifecycleExecute = await request(`/v1/company-os/events/${automationLifecycleSourceEvent.id}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      mode: "execute",
      ruleIds: [startLifecycleRule.id, invalidLifecycleRule.id],
      idempotencyKey: "automation-lifecycle-actions"
    })
  });
  assert.equal(automationLifecycleExecute.status, 200);
  const automationLifecycleExecuteBody = automationLifecycleExecute.body as {
    data: {
      executed: Array<{ ruleId: string; actionKind: string; stageRunId?: string; commandAuditLogId?: string }>;
      skipped: Array<{ ruleId: string; actionKind: string; reason: string }>;
      auditLogIds: string[];
    };
  };
  const startedLifecycleExecution = automationLifecycleExecuteBody.data.executed.find((execution) => execution.actionKind === "start_stage");
  assert.ok(startedLifecycleExecution);
  assert.equal(startedLifecycleExecution.ruleId, startLifecycleRule.id);
  assert.ok(startedLifecycleExecution.stageRunId);
  assert.ok(startedLifecycleExecution.commandAuditLogId);
  const automationStartedStageRun = await prisma.stageRun.findUniqueOrThrow({
    where: { id: startedLifecycleExecution.stageRunId }
  });
  assert.equal(automationStartedStageRun.status, "running");
  assert.equal(automationStartedStageRun.pipelineRunId, automationLifecyclePipelineRun.id);
  const rejectedLifecycleExecution = automationLifecycleExecuteBody.data.skipped.find((skip) => skip.actionKind === "complete_stage");
  assert.ok(rejectedLifecycleExecution);
  assert.equal(rejectedLifecycleExecution.ruleId, invalidLifecycleRule.id);
  assert.equal(rejectedLifecycleExecution.reason, "invalid_stage_transition");
  await prisma.auditLog.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      action: "automation_rule.failed",
      resourceId: automationLifecycleSourceEvent.id,
      errorState: { path: ["reason"], equals: "invalid_stage_transition" }
    }
  });

  const invalidCompanyOsCollection = await request("/v1/company-os/users", { headers: authA });
  assert.equal(invalidCompanyOsCollection.status, 400);

  const createdStandard = await request("/v1/company-os/standards", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "UX evidence standard",
      category: "ux",
      description: "Every user-facing Company OS surface needs evidence-backed recovery states.",
      checklistId: checklistTemplate.id,
      validationMethod: "Browser proof, accessibility pass, and task evidence.",
      ownerRoleId: humanOwnerRole.id
    })
  });
  assert.equal(createdStandard.status, 201);
  const createdStandardBody = createdStandard.body as {
    data: {
      id: string;
      name: string;
      category: string;
      status: string;
      version: number;
      correlationId: string;
      auditLogId: string;
    };
  };
  assert.equal(createdStandardBody.data.name, "UX evidence standard");
  assert.equal(createdStandardBody.data.category, "ux");
  assert.equal(createdStandardBody.data.status, "active");
  assert.equal(createdStandardBody.data.version, 1);
  assert.ok(createdStandardBody.data.correlationId);
  const createdStandardAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: createdStandardBody.data.auditLogId }
  });
  assert.equal(createdStandardAudit.action, "standard.created");
  assert.equal(createdStandardAudit.resourceType, "standard");
  const createdStandardEvent = await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "standard_created",
      resourceId: createdStandardBody.data.id,
      correlationId: createdStandardBody.data.correlationId
    }
  });
  assert.equal(createdStandardEvent.resourceType, "standard");

  const readCreatedStandard = await request(`/v1/company-os/standards/${createdStandardBody.data.id}`, { headers: authA });
  assert.equal(readCreatedStandard.status, 200);
  assert.equal((readCreatedStandard.body as { data: { id: string; ownerRoleId: string | null } }).data.ownerRoleId, humanOwnerRole.id);

  const updatedStandard = await request(`/v1/company-os/standards/${createdStandardBody.data.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      description: "Updated standard copy for the agent workbench.",
      status: "paused"
    })
  });
  assert.equal(updatedStandard.status, 200);
  const updatedStandardBody = updatedStandard.body as {
    data: { id: string; status: string; description: string; auditLogId: string; correlationId: string };
  };
  assert.equal(updatedStandardBody.data.status, "paused");
  assert.equal(updatedStandardBody.data.description, "Updated standard copy for the agent workbench.");
  const updatedStandardAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: updatedStandardBody.data.auditLogId }
  });
  assert.equal(updatedStandardAudit.action, "standard.updated");

  const crossWorkspaceStandardUpdate = await request(`/v1/company-os/standards/${createdStandardBody.data.id}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({
      description: "Workspace B must not mutate workspace A standards."
    })
  });
  assert.equal(crossWorkspaceStandardUpdate.status, 404);

  const archivedStandard = await request(`/v1/company-os/standards/${createdStandardBody.data.id}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedStandard.status, 200);
  const archivedStandardBody = archivedStandard.body as {
    data: { id: string; status: string; archived: boolean; auditLogId: string };
  };
  assert.equal(archivedStandardBody.data.status, "archived");
  assert.equal(archivedStandardBody.data.archived, true);
  const archivedStandardAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: archivedStandardBody.data.auditLogId }
  });
  assert.equal(archivedStandardAudit.action, "standard.archived");

  const createdWorkflowDraft = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      rootObjectType: "pipeline",
      rootObjectId: onboardingPipeline.id,
      name: "Client Onboarding Pipeline v2",
      reason: "Add evidence preview before changing active workflow definitions.",
      riskLevel: "high",
      changeSet: {
        purpose: "Move a client from lead to delivery kickoff with stronger evidence.",
        stages: [{ clientId: "stage-kickoff", name: "Kickoff", position: 1 }]
      },
      idempotencyKey: "workflow-draft-proof-001",
      sourceChannel: "api-test"
    })
  });
  assert.equal(createdWorkflowDraft.status, 201);
  const createdWorkflowDraftBody = createdWorkflowDraft.body as {
    data: {
      id: string;
      rootObjectType: string;
      rootObjectId: string;
      status: string;
      riskLevel: string;
      baseVersion: number;
      targetVersion: number;
      auditLogId: string;
      correlationId: string;
    };
  };
  assert.equal(createdWorkflowDraftBody.data.rootObjectType, "pipeline");
  assert.equal(createdWorkflowDraftBody.data.rootObjectId, onboardingPipeline.id);
  assert.equal(createdWorkflowDraftBody.data.status, "draft");
  assert.equal(createdWorkflowDraftBody.data.riskLevel, "high");
  assert.equal(createdWorkflowDraftBody.data.baseVersion, 1);
  assert.equal(createdWorkflowDraftBody.data.targetVersion, 2);
  const createdWorkflowDraftAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: createdWorkflowDraftBody.data.auditLogId }
  });
  assert.equal(createdWorkflowDraftAudit.action, "workflow_definition_draft.created");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "workflow_definition_draft_created",
      resourceId: createdWorkflowDraftBody.data.id,
      correlationId: createdWorkflowDraftBody.data.correlationId
    }
  });

  const repeatedWorkflowDraft = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      rootObjectType: "pipeline",
      rootObjectId: onboardingPipeline.id,
      name: "Client Onboarding Pipeline v2 duplicate request",
      idempotencyKey: "workflow-draft-proof-001"
    })
  });
  assert.equal(repeatedWorkflowDraft.status, 200);
  assert.equal((repeatedWorkflowDraft.body as { data: { id: string } }).data.id, createdWorkflowDraftBody.data.id);

  const listedWorkflowDrafts = await request("/v1/company-os/workflow-definitions/drafts?rootObjectType=pipeline&status=draft", {
    headers: authA
  });
  assert.equal(listedWorkflowDrafts.status, 200);
  const listedWorkflowDraftsBody = listedWorkflowDrafts.body as {
    data: Array<{ id: string; rootObjectType: string; status: string }>;
  };
  assert.ok(listedWorkflowDraftsBody.data.some((draft) => (
    draft.id === createdWorkflowDraftBody.data.id
    && draft.rootObjectType === "pipeline"
    && draft.status === "draft"
  )));

  const readWorkflowDraft = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}`, {
    headers: authA
  });
  assert.equal(readWorkflowDraft.status, 200);
  assert.equal((readWorkflowDraft.body as { data: { id: string } }).data.id, createdWorkflowDraftBody.data.id);

  const crossWorkspaceWorkflowDraftRead = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}`, {
    headers: authB
  });
  assert.equal(crossWorkspaceWorkflowDraftRead.status, 404);

  const crossWorkspaceWorkflowDraftList = await request("/v1/company-os/workflow-definitions/drafts?rootObjectType=pipeline", {
    headers: authB
  });
  assert.equal(crossWorkspaceWorkflowDraftList.status, 200);
  assert.deepEqual((crossWorkspaceWorkflowDraftList.body as { data: unknown[] }).data, []);

  const updatedWorkflowDraft = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      reason: "Preview active runtime and automation impact before activation.",
      riskLevel: "medium"
    })
  });
  assert.equal(updatedWorkflowDraft.status, 200);
  const updatedWorkflowDraftBody = updatedWorkflowDraft.body as {
    data: { id: string; riskLevel: string; auditLogId: string };
  };
  assert.equal(updatedWorkflowDraftBody.data.riskLevel, "medium");
  const updatedWorkflowDraftAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: updatedWorkflowDraftBody.data.auditLogId }
  });
  assert.equal(updatedWorkflowDraftAudit.action, "workflow_definition_draft.updated");

  const workflowDraftImpact = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}/actions/preview-impact`, {
    method: "POST",
    headers: authA
  });
  assert.equal(workflowDraftImpact.status, 200);
  const workflowDraftImpactBody = workflowDraftImpact.body as {
    data: {
      id: string;
      impactPreview: {
        counts: { stages: number; pipelineRuns: number; activePipelineRuns: number; automationRules: number };
        approvalRequired: boolean;
        approvalReasons: string[];
      };
      auditLogId: string;
      correlationId: string;
    };
  };
  assert.equal(workflowDraftImpactBody.data.impactPreview.counts.stages, 2);
  assert.equal(workflowDraftImpactBody.data.impactPreview.counts.pipelineRuns, 2);
  assert.equal(workflowDraftImpactBody.data.impactPreview.counts.activePipelineRuns, 2);
  assert.ok(workflowDraftImpactBody.data.impactPreview.approvalRequired);
  assert.ok(workflowDraftImpactBody.data.impactPreview.approvalReasons.includes("pipeline definition is active"));
  assert.ok(workflowDraftImpactBody.data.impactPreview.approvalReasons.includes("pipeline has active runtime work"));
  const workflowDraftImpactAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: workflowDraftImpactBody.data.auditLogId }
  });
  assert.equal(workflowDraftImpactAudit.action, "workflow_definition_draft.previewed");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "workflow_definition_draft_previewed",
      resourceId: workflowDraftImpactBody.data.id,
      correlationId: workflowDraftImpactBody.data.correlationId
    }
  });

  const pipelineActivationWithoutApproval = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA
  });
  assert.equal(pipelineActivationWithoutApproval.status, 409);
  assert.equal((pipelineActivationWithoutApproval.body as { error: string }).error, "workflow_definition_approval_required");

  const pipelineActivationApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      requestedByType: "user",
      requestedById: ownerAWorkspace.ownerUserId,
      requestedForAction: "workflow_definition_draft.activate",
      resourceType: "workflow_definition_draft",
      resourceId: createdWorkflowDraftBody.data.id,
      riskLevel: "medium",
      inputPayload: {
        rootObjectType: "pipeline",
        rootObjectId: onboardingPipeline.id
      }
    })
  });
  assert.equal(pipelineActivationApprovalRequest.status, 201);
  const pipelineActivationApprovalRequestBody = pipelineActivationApprovalRequest.body as {
    data: { id: string };
  };
  const pipelineActivationApprovalDecision = await request(`/v1/company-os/approvals/${pipelineActivationApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Pipeline version activation has previewed active runtime impact."
    })
  });
  assert.equal(pipelineActivationApprovalDecision.status, 200);
  const activatedPipelineDraft = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      approvalId: pipelineActivationApprovalRequestBody.data.id,
      sourceChannel: "api-test"
    })
  });
  assert.equal(activatedPipelineDraft.status, 200);
  const activatedPipelineDraftBody = activatedPipelineDraft.body as {
    data: { activatedRootObjectId: string; previousRootObjectId: string; newVersion: number; auditLogId: string };
  };
  assert.equal(activatedPipelineDraftBody.data.previousRootObjectId, onboardingPipeline.id);
  assert.notEqual(activatedPipelineDraftBody.data.activatedRootObjectId, onboardingPipeline.id);
  assert.equal(activatedPipelineDraftBody.data.newVersion, 2);
  const deprecatedPipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: onboardingPipeline.id }
  });
  assert.equal(deprecatedPipeline.status, "deprecated");
  const activatedPipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: activatedPipelineDraftBody.data.activatedRootObjectId },
    include: { stages: true }
  });
  assert.equal(activatedPipeline.status, "active");
  assert.equal(activatedPipeline.version, 2);
  assert.equal(activatedPipeline.familyId, deprecatedPipeline.familyId);
  assert.ok(activatedPipeline.stages.length >= 1);
  const activatedPipelineAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: activatedPipelineDraftBody.data.auditLogId }
  });
  assert.equal(activatedPipelineAudit.action, "workflow_definition_draft.activated");

  const blockedActivePipelineArchive = await request(`/v1/company-os/workflow-definitions/pipeline/${activatedPipelineDraftBody.data.activatedRootObjectId}/actions/archive`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Active versions require a migration or replacement plan before archive."
    })
  });
  assert.equal(blockedActivePipelineArchive.status, 409);
  assert.equal((blockedActivePipelineArchive.body as { error: string }).error, "workflow_archive_active_version_blocked");

  const blockedRuntimePipelineArchive = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/archive`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Old versions with active runtime work still require migration before archive.",
      idempotencyKey: "archive-deprecated-pipeline-v1-blocked",
      sourceChannel: "api-test"
    })
  });
  assert.equal(blockedRuntimePipelineArchive.status, 409);
  assert.equal((blockedRuntimePipelineArchive.body as { error: string }).error, "workflow_archive_active_runtime_dependency");

  const disposableHistoricalPipeline = await prisma.pipeline.create({
    data: {
      workspaceId: ownerA.workspace.id,
      processId: onboardingProcess.id,
      name: "Disposable historical pipeline",
      purpose: "Historical version archive proof.",
      status: "deprecated",
      version: 1,
      riskLevel: "medium"
    }
  });

  const archivedHistoricalPipeline = await request(`/v1/company-os/workflow-definitions/pipeline/${disposableHistoricalPipeline.id}/actions/archive`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Archive deprecated disposable version after evidence exists.",
      idempotencyKey: "archive-deprecated-pipeline-v1",
      sourceChannel: "api-test"
    })
  });
  assert.equal(archivedHistoricalPipeline.status, 200);
  const archivedHistoricalPipelineBody = archivedHistoricalPipeline.body as {
    data: {
      rootObjectType: string;
      rootObjectId: string;
      status: string;
      archived: boolean;
      auditLogId: string;
      correlationId: string;
    };
  };
  assert.equal(archivedHistoricalPipelineBody.data.rootObjectType, "pipeline");
  assert.equal(archivedHistoricalPipelineBody.data.rootObjectId, disposableHistoricalPipeline.id);
  assert.equal(archivedHistoricalPipelineBody.data.status, "archived");
  assert.equal(archivedHistoricalPipelineBody.data.archived, true);
  const archivedPipeline = await prisma.pipeline.findUniqueOrThrow({
    where: { id: disposableHistoricalPipeline.id }
  });
  assert.equal(archivedPipeline.status, "archived");
  const archivedHistoricalPipelineAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: archivedHistoricalPipelineBody.data.auditLogId }
  });
  assert.equal(archivedHistoricalPipelineAudit.action, "workflow_definition_version.archived");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "workflow_definition_version_archived",
      resourceId: disposableHistoricalPipeline.id,
      correlationId: archivedHistoricalPipelineBody.data.correlationId
    }
  });

  const repeatedHistoricalPipelineArchive = await request(`/v1/company-os/workflow-definitions/pipeline/${disposableHistoricalPipeline.id}/actions/archive`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Archive deprecated disposable version after evidence exists.",
      idempotencyKey: "archive-deprecated-pipeline-v1",
      sourceChannel: "api-test"
    })
  });
  assert.equal(repeatedHistoricalPipelineArchive.status, 200);
  const repeatedHistoricalPipelineArchiveBody = repeatedHistoricalPipelineArchive.body as {
    data: { rootObjectId: string; idempotentReplay: boolean; auditLogId: string };
  };
  assert.equal(repeatedHistoricalPipelineArchiveBody.data.rootObjectId, disposableHistoricalPipeline.id);
  assert.equal(repeatedHistoricalPipelineArchiveBody.data.idempotentReplay, true);
  assert.equal(repeatedHistoricalPipelineArchiveBody.data.auditLogId, archivedHistoricalPipelineBody.data.auditLogId);

  const blockedActiveRollbackDraft = await request(`/v1/company-os/workflow-definitions/pipeline/${activatedPipelineDraftBody.data.activatedRootObjectId}/actions/create-rollback-draft`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Active versions cannot be rollback sources."
    })
  });
  assert.equal(blockedActiveRollbackDraft.status, 409);
  assert.equal((blockedActiveRollbackDraft.body as { error: string }).error, "workflow_rollback_source_active");

  const rollbackDraftFromRenamedHistoricalPipeline = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/create-rollback-draft`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Prepare rollback to renamed pipeline v1 through normal draft activation.",
      riskLevel: "medium",
      idempotencyKey: "rollback-draft-renamed-pipeline-v1",
      sourceChannel: "api-test"
    })
  });
  assert.equal(rollbackDraftFromRenamedHistoricalPipeline.status, 201);
  const rollbackDraftFromRenamedHistoricalPipelineBody = rollbackDraftFromRenamedHistoricalPipeline.body as {
    data: {
      rootObjectType: string;
      rootObjectId: string;
      status: string;
      baseVersion: number;
      targetVersion: number;
      changeSet: { kind: string; rollbackSourceRootObjectId: string; rollbackSourceVersion: number };
      rollbackSource: { rootObjectId: string; version: number; status: string };
    };
  };
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.rootObjectType, "pipeline");
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.rootObjectId, activatedPipelineDraftBody.data.activatedRootObjectId);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.status, "draft");
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.baseVersion, 2);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.targetVersion, 3);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.changeSet.kind, "rollback_to_version");
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.changeSet.rollbackSourceRootObjectId, onboardingPipeline.id);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.changeSet.rollbackSourceVersion, 1);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.rollbackSource.rootObjectId, onboardingPipeline.id);
  assert.equal(rollbackDraftFromRenamedHistoricalPipelineBody.data.rollbackSource.version, 1);

  const processWorkflowDraft = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      rootObjectType: "process",
      rootObjectId: onboardingProcess.id,
      name: "Client onboarding",
      reason: "Activate a process version after pipeline versioning is available.",
      riskLevel: "medium",
      changeSet: {
        description: "Versioned client onboarding process with explicit activation evidence.",
        maturityLevel: "managed",
        relatedPolicies: ["Client-facing agent messages require approval"],
        relatedMetrics: ["Client onboarding cycle time"]
      },
      idempotencyKey: "process-draft-activation-proof-001",
      sourceChannel: "api-test"
    })
  });
  assert.equal(processWorkflowDraft.status, 201);
  const processWorkflowDraftBody = processWorkflowDraft.body as {
    data: { id: string; rootObjectId: string; baseVersion: number; targetVersion: number };
  };
  assert.equal(processWorkflowDraftBody.data.rootObjectId, onboardingProcess.id);
  assert.equal(processWorkflowDraftBody.data.baseVersion, 1);
  assert.equal(processWorkflowDraftBody.data.targetVersion, 2);

  const processWorkflowPreview = await request(`/v1/company-os/workflow-definitions/drafts/${processWorkflowDraftBody.data.id}/actions/preview-impact`, {
    method: "POST",
    headers: authA
  });
  assert.equal(processWorkflowPreview.status, 200);
  const processWorkflowPreviewBody = processWorkflowPreview.body as {
    data: { impactPreview: { counts: { pipelines: number; procedures: number; pipelineRuns: number }; approvalRequired: boolean } };
  };
  assert.ok(processWorkflowPreviewBody.data.impactPreview.counts.pipelines >= 1);
  assert.ok(processWorkflowPreviewBody.data.impactPreview.counts.procedures >= 1);
  assert.ok(processWorkflowPreviewBody.data.impactPreview.counts.pipelineRuns >= 1);
  assert.equal(processWorkflowPreviewBody.data.impactPreview.approvalRequired, true);

  const processActivationApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      requestedByType: "user",
      requestedById: ownerAWorkspace.ownerUserId,
      requestedForAction: "workflow_definition_draft.activate",
      resourceType: "workflow_definition_draft",
      resourceId: processWorkflowDraftBody.data.id,
      riskLevel: "medium",
      inputPayload: {
        rootObjectType: "process",
        rootObjectId: onboardingProcess.id
      }
    })
  });
  assert.equal(processActivationApprovalRequest.status, 201);
  const processActivationApprovalRequestBody = processActivationApprovalRequest.body as {
    data: { id: string };
  };
  const processActivationApprovalDecision = await request(`/v1/company-os/approvals/${processActivationApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Process activation has a versioning migration and impact preview."
    })
  });
  assert.equal(processActivationApprovalDecision.status, 200);
  const activatedProcessDraft = await request(`/v1/company-os/workflow-definitions/drafts/${processWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      approvalId: processActivationApprovalRequestBody.data.id,
      sourceChannel: "api-test"
    })
  });
  assert.equal(activatedProcessDraft.status, 200);
  const activatedProcessDraftBody = activatedProcessDraft.body as {
    data: { activatedRootObjectId: string; previousRootObjectId: string; newVersion: number; auditLogId: string };
  };
  assert.equal(activatedProcessDraftBody.data.previousRootObjectId, onboardingProcess.id);
  assert.notEqual(activatedProcessDraftBody.data.activatedRootObjectId, onboardingProcess.id);
  assert.equal(activatedProcessDraftBody.data.newVersion, 2);
  const deprecatedProcess = await prisma.process.findUniqueOrThrow({
    where: { id: onboardingProcess.id }
  });
  assert.equal(deprecatedProcess.status, "deprecated");
  const activatedProcess = await prisma.process.findUniqueOrThrow({
    where: { id: activatedProcessDraftBody.data.activatedRootObjectId }
  });
  assert.equal(activatedProcess.status, "active");
  assert.equal(activatedProcess.version, 2);
  const activatedProcessAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: activatedProcessDraftBody.data.auditLogId }
  });
  assert.equal(activatedProcessAudit.action, "workflow_definition_draft.activated");

  const rollbackDraftFromHistoricalProcess = await request(`/v1/company-os/workflow-definitions/process/${onboardingProcess.id}/actions/create-rollback-draft`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Prepare rollback to process v1 through normal draft activation.",
      riskLevel: "medium",
      idempotencyKey: "rollback-draft-process-v1",
      sourceChannel: "api-test"
    })
  });
  assert.equal(rollbackDraftFromHistoricalProcess.status, 201);
  const rollbackDraftFromHistoricalProcessBody = rollbackDraftFromHistoricalProcess.body as {
    data: {
      id: string;
      rootObjectType: string;
      rootObjectId: string;
      status: string;
      baseVersion: number;
      targetVersion: number;
      changeSet: { kind: string; rollbackSourceRootObjectId: string; rollbackSourceVersion: number };
      impactPreview: { approvalRequired: boolean };
      rollbackSource: { rootObjectId: string; version: number; status: string };
      auditLogId: string;
      correlationId: string;
    };
  };
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.rootObjectType, "process");
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.rootObjectId, activatedProcessDraftBody.data.activatedRootObjectId);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.status, "draft");
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.baseVersion, 2);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.targetVersion, 3);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.changeSet.kind, "rollback_to_version");
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.changeSet.rollbackSourceRootObjectId, onboardingProcess.id);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.changeSet.rollbackSourceVersion, 1);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.rollbackSource.rootObjectId, onboardingProcess.id);
  assert.equal(rollbackDraftFromHistoricalProcessBody.data.rollbackSource.version, 1);
  assert.ok(rollbackDraftFromHistoricalProcessBody.data.impactPreview.approvalRequired);
  const rollbackDraftAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: rollbackDraftFromHistoricalProcessBody.data.auditLogId }
  });
  assert.equal(rollbackDraftAudit.action, "workflow_definition_rollback_draft.created");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "workflow_definition_rollback_draft_created",
      resourceId: rollbackDraftFromHistoricalProcessBody.data.id,
      correlationId: rollbackDraftFromHistoricalProcessBody.data.correlationId
    }
  });

  const repeatedRollbackDraftFromHistoricalProcess = await request(`/v1/company-os/workflow-definitions/process/${onboardingProcess.id}/actions/create-rollback-draft`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      reason: "Prepare rollback to process v1 through normal draft activation.",
      riskLevel: "medium",
      idempotencyKey: "rollback-draft-process-v1",
      sourceChannel: "api-test"
    })
  });
  assert.equal(repeatedRollbackDraftFromHistoricalProcess.status, 200);
  assert.equal(
    (repeatedRollbackDraftFromHistoricalProcess.body as { data: { id: string } }).data.id,
    rollbackDraftFromHistoricalProcessBody.data.id
  );

  const procedureWorkflowDraft = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      rootObjectType: "procedure",
      rootObjectId: onboardingProcedure.id,
      name: "Client Onboarding SOP",
      reason: "Activate a versioned procedure draft with copied runtime-safe evidence.",
      riskLevel: "medium",
      changeSet: {
        purpose: "Run client onboarding with stronger evidence and rollback notes.",
        expectedResult: "Kickoff is ready with review evidence.",
        requiredTools: ["companycore", "clickup"],
        requiredPermissions: ["client:write", "task:write"],
        steps: [
          {
            stepOrder: 1,
            instruction: "Prepare kickoff plan and create follow-up tasks.",
            stepType: "integration_call",
            requiredToolAdapterId: clickUpAdapter.id,
            validationRule: { evidenceRequired: true }
          },
          {
            stepOrder: 2,
            instruction: "Attach approval and rollback evidence to the client record.",
            stepType: "human_review",
            validationRule: { approvalRequired: true }
          }
        ]
      },
      idempotencyKey: "procedure-draft-activation-proof-001",
      sourceChannel: "api-test"
    })
  });
  assert.equal(procedureWorkflowDraft.status, 201);
  const procedureWorkflowDraftBody = procedureWorkflowDraft.body as {
    data: { id: string; rootObjectId: string; baseVersion: number; targetVersion: number };
  };
  assert.equal(procedureWorkflowDraftBody.data.rootObjectId, onboardingProcedure.id);
  assert.equal(procedureWorkflowDraftBody.data.baseVersion, 1);
  assert.equal(procedureWorkflowDraftBody.data.targetVersion, 2);

  const procedureWorkflowPreview = await request(`/v1/company-os/workflow-definitions/drafts/${procedureWorkflowDraftBody.data.id}/actions/preview-impact`, {
    method: "POST",
    headers: authA
  });
  assert.equal(procedureWorkflowPreview.status, 200);
  const procedureWorkflowPreviewBody = procedureWorkflowPreview.body as {
    data: { impactPreview: { counts: { stages: number; stageRuns: number }; approvalRequired: boolean } };
  };
  assert.ok(procedureWorkflowPreviewBody.data.impactPreview.counts.stages >= 1);
  assert.ok(procedureWorkflowPreviewBody.data.impactPreview.counts.stageRuns >= 1);
  assert.equal(procedureWorkflowPreviewBody.data.impactPreview.approvalRequired, true);

  const procedureActivationWithoutApproval = await request(`/v1/company-os/workflow-definitions/drafts/${procedureWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA
  });
  assert.equal(procedureActivationWithoutApproval.status, 409);
  assert.equal((procedureActivationWithoutApproval.body as { error: string }).error, "workflow_definition_approval_required");

  const procedureActivationApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      requestedByType: "user",
      requestedById: ownerAWorkspace.ownerUserId,
      requestedForAction: "workflow_definition_draft.activate",
      resourceType: "workflow_definition_draft",
      resourceId: procedureWorkflowDraftBody.data.id,
      riskLevel: "medium",
      inputPayload: {
        rootObjectType: "procedure",
        rootObjectId: onboardingProcedure.id
      }
    })
  });
  assert.equal(procedureActivationApprovalRequest.status, 201);
  const procedureActivationApprovalRequestBody = procedureActivationApprovalRequest.body as {
    data: { id: string };
  };

  const procedureActivationApprovalDecision = await request(`/v1/company-os/approvals/${procedureActivationApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Procedure version activation has a preview and rollback candidate."
    })
  });
  assert.equal(procedureActivationApprovalDecision.status, 200);

  const activatedProcedureDraft = await request(`/v1/company-os/workflow-definitions/drafts/${procedureWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      approvalId: procedureActivationApprovalRequestBody.data.id,
      sourceChannel: "api-test"
    })
  });
  assert.equal(activatedProcedureDraft.status, 200);
  const activatedProcedureDraftBody = activatedProcedureDraft.body as {
    data: {
      status: string;
      activatedRootObjectId: string;
      previousRootObjectId: string;
      previousVersion: number;
      newVersion: number;
      approvalId: string;
      auditLogId: string;
      correlationId: string;
    };
  };
  assert.equal(activatedProcedureDraftBody.data.status, "active");
  assert.equal(activatedProcedureDraftBody.data.previousRootObjectId, onboardingProcedure.id);
  assert.notEqual(activatedProcedureDraftBody.data.activatedRootObjectId, onboardingProcedure.id);
  assert.equal(activatedProcedureDraftBody.data.previousVersion, 1);
  assert.equal(activatedProcedureDraftBody.data.newVersion, 2);
  assert.equal(activatedProcedureDraftBody.data.approvalId, procedureActivationApprovalRequestBody.data.id);
  const deprecatedProcedure = await prisma.procedure.findUniqueOrThrow({
    where: { id: onboardingProcedure.id }
  });
  assert.equal(deprecatedProcedure.status, "deprecated");
  const activatedProcedure = await prisma.procedure.findUniqueOrThrow({
    where: { id: activatedProcedureDraftBody.data.activatedRootObjectId },
    include: { steps: true }
  });
  assert.equal(activatedProcedure.status, "active");
  assert.equal(activatedProcedure.version, 2);
  assert.equal(activatedProcedure.steps.length, 2);
  const activatedProcedureAudit = await prisma.auditLog.findUniqueOrThrow({
    where: { id: activatedProcedureDraftBody.data.auditLogId }
  });
  assert.equal(activatedProcedureAudit.action, "workflow_definition_draft.activated");
  await prisma.event.findFirstOrThrow({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "workflow_definition_draft_activated",
      resourceId: procedureWorkflowDraftBody.data.id,
      correlationId: activatedProcedureDraftBody.data.correlationId
    }
  });

  const repeatedProcedureActivation = await request(`/v1/company-os/workflow-definitions/drafts/${procedureWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      approvalId: procedureActivationApprovalRequestBody.data.id
    })
  });
  assert.equal(repeatedProcedureActivation.status, 409);
  assert.equal((repeatedProcedureActivation.body as { error: string }).error, "workflow_definition_draft_not_activatable");

  const crossWorkspaceWorkflowDraftUpdate = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({
      reason: "Workspace B must not mutate workspace A workflow drafts."
    })
  });
  assert.equal(crossWorkspaceWorkflowDraftUpdate.status, 404);

  const missingWorkflowRootDraft = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      rootObjectType: "pipeline",
      rootObjectId: ownerB.workspace.id,
      name: "Foreign workflow draft"
    })
  });
  assert.equal(missingWorkflowRootDraft.status, 404);
  assert.equal((missingWorkflowRootDraft.body as { error: string }).error, "workflow_root_not_found");

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "owner-a@example.com",
      password: "very-strong-password"
    })
  });
  assert.equal(login.status, 200);

  const unscopedKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Unscoped adapter"
    })
  });
  assert.equal(unscopedKey.status, 400);
  assert.equal((unscopedKey.body as { error: string; errorDetails?: { code: string } }).error, "api_key_scope_required");
  assert.equal((unscopedKey.body as { errorDetails?: { code: string } }).errorDetails?.code, "api_key_scope_required");

  const createdKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Jarvan adapter",
      scopes: ["adapter:jarvan"],
      fullAccessConfirmed: true
    })
  });
  assert.equal(createdKey.status, 201);
  const createdKeyBody = createdKey.body as {
    data: { id: string; key: string; keyPrefix: string };
  };
  assert.ok(createdKeyBody.data.key.startsWith("cc_v1_"));
  assert.ok(createdKeyBody.data.keyPrefix);

  const serviceKey = createdKeyBody.data.key;

  const deniedBroadAdapterKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Adapter without full access confirmation",
      scopes: ["adapter:jarvan"]
    })
  });
  assert.equal(deniedBroadAdapterKey.status, 400);
  assert.equal((deniedBroadAdapterKey.body as { error: string }).error, "api_key_full_access_confirmation_required");

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

  const agentKeyProfiles = await request("/v1/api-keys/profiles", { headers: authA });
  assert.equal(agentKeyProfiles.status, 200);
  const agentKeyProfilesBody = agentKeyProfiles.body as {
    data: Array<{ id: string; scopes: string[]; riskLevel: string; recommendedFor: string[] }>;
  };
  const companyOsReaderProfile = agentKeyProfilesBody.data.find((profile) => profile.id === "mcp_company_os_reader");
  assert.ok(companyOsReaderProfile);
  assert.equal(companyOsReaderProfile.riskLevel, "low");
  assert.ok(companyOsReaderProfile.scopes.includes("mcp:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("company-os:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("commercial-exceptions:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("finance:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("relationships:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("sales:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("operations:read"));
  assert.ok(companyOsReaderProfile.scopes.includes("strategy:read"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:definition:write"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:workflow-definition:write"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:workflow-definition:activate"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:approval:request"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:approval:decide"));
  assert.ok(companyOsReaderProfile.recommendedFor.includes("CEO Agent"));
  const mcpOperatorProfile = agentKeyProfilesBody.data.find((profile) => profile.id === "mcp_operator");
  assert.ok(mcpOperatorProfile);
  assert.ok(mcpOperatorProfile.scopes.includes("company-os:automation:execute"));

  const createdProfileKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "MCP Company OS reader",
      profileId: "mcp_company_os_reader"
    })
  });
  assert.equal(createdProfileKey.status, 201);
  const createdProfileKeyBody = createdProfileKey.body as {
    data: { key: string; profile: { id: string }; scopes: string[] };
  };
  assert.equal(createdProfileKeyBody.data.profile.id, "mcp_company_os_reader");
  assert.ok(createdProfileKeyBody.data.scopes.includes("mcp:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("company-os:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("commercial-exceptions:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("finance:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("relationships:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("sales:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("operations:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("strategy:read"));
  assert.ok(!createdProfileKeyBody.data.scopes.includes("company-os:definition:write"));
  assert.ok(!createdProfileKeyBody.data.scopes.includes("company-os:workflow-definition:write"));
  assert.ok(!createdProfileKeyBody.data.scopes.includes("company-os:workflow-definition:activate"));
  assert.ok(!createdProfileKeyBody.data.scopes.includes("company-os:approval:request"));
  assert.ok(!createdProfileKeyBody.data.scopes.includes("company-os:approval:decide"));
  const profileKeyAuth = { "X-API-Key": createdProfileKeyBody.data.key };
  const profileMcpManifest = await request("/v1/mcp/manifest", { headers: profileKeyAuth });
  assert.equal(profileMcpManifest.status, 200);
  const profileMcpManifestBody = profileMcpManifest.body as {
    data: { tools: Array<{ path: string; capability: string }> };
  };
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => tool.path === "/v1/company-os"));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/relationships/graph"
    && tool.capability === "relationships:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/relationships/context"
    && tool.capability === "relationships:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/commercial-exceptions"
    && tool.capability === "commercial-exceptions:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/finance/context"
    && tool.capability === "finance:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/sales/context"
    && tool.capability === "sales:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/operations/context"
    && tool.capability === "operations:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/strategy/context"
    && tool.capability === "strategy:read"
  )));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:definition:write"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:workflow-definition:write"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:workflow-definition:activate"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:approval:request"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:approval:decide"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:pipeline-run:write"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:stage-run:write"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "company-os:automation:execute"));
  assert.ok(!profileMcpManifestBody.data.tools.some((tool) => tool.capability === "notes:write"));
  const deniedProfileApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      requestedByType: "agent",
      requestedForAction: "drive.file.update",
      resourceType: "stage_run",
      riskLevel: "high"
    })
  });
  assert.equal(deniedProfileApprovalRequest.status, 403);
  assert.equal((deniedProfileApprovalRequest.body as { error: string }).error, "forbidden");
  const deniedProfileStandardCreate = await request("/v1/company-os/standards", {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      name: "Read-only profile standard",
      category: "governance"
    })
  });
  assert.equal(deniedProfileStandardCreate.status, 403);
  assert.equal((deniedProfileStandardCreate.body as { error: string }).error, "forbidden");
  const deniedProfileWorkflowDraftCreate = await request("/v1/company-os/workflow-definitions/drafts", {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      rootObjectType: "pipeline",
      rootObjectId: onboardingPipeline.id,
      name: "Read-only profile workflow draft"
    })
  });
  assert.equal(deniedProfileWorkflowDraftCreate.status, 403);
  assert.equal((deniedProfileWorkflowDraftCreate.body as { error: string }).error, "forbidden");
  const deniedProfileWorkflowDraftList = await request("/v1/company-os/workflow-definitions/drafts", {
    headers: profileKeyAuth
  });
  assert.equal(deniedProfileWorkflowDraftList.status, 403);
  assert.equal((deniedProfileWorkflowDraftList.body as { error: string }).error, "forbidden");
  const deniedProfileWorkflowArchive = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/archive`, {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      reason: "Read-only profile must not archive workflow definitions."
    })
  });
  assert.equal(deniedProfileWorkflowArchive.status, 403);
  assert.equal((deniedProfileWorkflowArchive.body as { error: string }).error, "forbidden");
  const deniedProfileRollbackDraft = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/create-rollback-draft`, {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      reason: "Read-only profile must not create rollback drafts."
    })
  });
  assert.equal(deniedProfileRollbackDraft.status, 403);
  assert.equal((deniedProfileRollbackDraft.body as { error: string }).error, "forbidden");
  const deniedProfileApprovalDecision = await request(`/v1/company-os/approvals/${lifecycleApprovalRequestBody.data.id}/decision`, {
    method: "POST",
    headers: profileKeyAuth,
    body: JSON.stringify({
      decision: "approved",
      decisionReason: "Read-only profile must not decide approvals."
    })
  });
  assert.equal(deniedProfileApprovalDecision.status, 403);
  assert.equal((deniedProfileApprovalDecision.body as { error: string }).error, "forbidden");
  await runMcpBridgeSmoke(createdProfileKeyBody.data.key);

  const createdOperatorProfileKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "MCP supervised operator",
      profileId: "mcp_operator"
    })
  });
  assert.equal(createdOperatorProfileKey.status, 201);
  const createdOperatorProfileKeyBody = createdOperatorProfileKey.body as {
    data: { key: string; profile: { id: string }; scopes: string[] };
  };
  assert.equal(createdOperatorProfileKeyBody.data.profile.id, "mcp_operator");
  assert.ok(createdOperatorProfileKeyBody.data.scopes.includes("operations:write"));
  assert.ok(createdOperatorProfileKeyBody.data.scopes.includes("company-os:stage-run:write"));
  assert.ok(createdOperatorProfileKeyBody.data.scopes.includes("company-os:workflow-definition:write"));
  assert.ok(createdOperatorProfileKeyBody.data.scopes.includes("company-os:workflow-definition:activate"));
  const operatorProfileMcpManifest = await request("/v1/mcp/manifest", { headers: { "X-API-Key": createdOperatorProfileKeyBody.data.key } });
  assert.equal(operatorProfileMcpManifest.status, 200);
  const operatorProfileMcpManifestBody = operatorProfileMcpManifest.body as {
    data: { tools: Array<{ name: string; path: string; capability: string }> };
  };
  assert.ok(operatorProfileMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_post_operations_work_items"
    && tool.path === "/v1/operations/work-items"
    && tool.capability === "operations:write"
  )));
  await runMcpBridgeSmoke(createdOperatorProfileKeyBody.data.key, {
    toolName: "companycore_post_company_os_stage_runs_by_id_actions_complete",
    expectError: true,
    expectedErrorCode: "mcp_tool_requires_supervision"
  });
  await runMcpBridgeSmoke(createdOperatorProfileKeyBody.data.key, {
    toolName: "companycore_post_company_os_stage_runs_by_id_actions_complete",
    commandMode: "supervised_operator",
    arguments: {
      id: stageRun.id,
      body: {
        outputPayload: {
          result: "supervised-repeat"
        },
        approvalId: lifecycleApprovalRequestBody.data.id
      }
    },
    expectError: true,
    expectedStatus: 409,
    expectedResponseError: "invalid_stage_transition"
  });

  const invalidProfileKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Bad MCP profile",
      profileId: "missing_profile"
    })
  });
  assert.equal(invalidProfileKey.status, 400);
  assert.equal((invalidProfileKey.body as { error: string }).error, "invalid_api_key_profile");

  const createdScopedKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Read-only notes agent",
      scopes: ["connection:read", "company-os:read", "mcp:read", "notes:read", "agent-events:read"]
    })
  });
  assert.equal(createdScopedKey.status, 201);
  const scopedServiceKey = (createdScopedKey.body as {
    data: { key: string };
  }).data.key;
  const scopedAuth = { "X-API-Key": scopedServiceKey };

  const scopedConnection = await request("/v1/connection", {
    headers: scopedAuth
  });
  assert.equal(scopedConnection.status, 200);
  const scopedConnectionBody = scopedConnection.body as {
    data: {
      scopeMode: string;
      capabilities: string[];
      mcpManifest: {
        tools: Array<{ name: string; path: string; capability: string; riskLevel: string }>;
      };
    };
  };
  assert.equal(scopedConnectionBody.data.scopeMode, "scoped");
  assert.ok(scopedConnectionBody.data.capabilities.includes("company-os:read"));
  assert.ok(scopedConnectionBody.data.capabilities.includes("mcp:read"));
  assert.ok(scopedConnectionBody.data.capabilities.includes("notes:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("company-os:definition:write"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("company-os:workflow-definition:write"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("company-os:workflow-definition:activate"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("commercial-exceptions:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("finance:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("sales:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("operations:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("strategy:read"));
  assert.ok(!scopedConnectionBody.data.capabilities.includes("notes:write"));
  assert.ok(scopedConnectionBody.data.mcpManifest.tools.some((tool) => (
    tool.path === "/v1/company-os"
    && tool.capability === "company-os:read"
    && tool.riskLevel === "read"
  )));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "notes:write"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "company-os:definition:write"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "company-os:workflow-definition:write"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "company-os:workflow-definition:activate"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "commercial-exceptions:read"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "finance:read"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "sales:read"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "operations:read"));
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "strategy:read"));

  const scopedMcpManifest = await request("/v1/mcp/manifest", {
    headers: scopedAuth
  });
  assert.equal(scopedMcpManifest.status, 200);
  const scopedMcpManifestBody = scopedMcpManifest.body as {
    data: {
      auth: { workspaceScoped: boolean; capabilityScoped: boolean };
      tools: Array<{ name: string; path: string; capability: string; requiresApproval: boolean }>;
    };
  };
  assert.equal(scopedMcpManifestBody.data.auth.workspaceScoped, true);
  assert.equal(scopedMcpManifestBody.data.auth.capabilityScoped, true);
  assert.ok(scopedMcpManifestBody.data.tools.some((tool) => (
    tool.name === "companycore_get_company_os"
    && tool.path === "/v1/company-os"
    && tool.capability === "company-os:read"
    && tool.requiresApproval === false
  )));
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "commercial-exceptions:read"));
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "finance:read"));
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "sales:read"));
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "operations:read"));
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "strategy:read"));

  const deniedScopedCommercialExceptions = await request("/v1/commercial-exceptions", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedCommercialExceptions.status, 403);
  assert.equal((deniedScopedCommercialExceptions.body as { error: string }).error, "forbidden");
  const deniedScopedFinanceContext = await request("/v1/finance/context", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedFinanceContext.status, 403);
  assert.equal((deniedScopedFinanceContext.body as { error: string }).error, "forbidden");
  const deniedScopedSalesContext = await request("/v1/sales/context", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedSalesContext.status, 403);
  assert.equal((deniedScopedSalesContext.body as { error: string }).error, "forbidden");
  const deniedScopedOperationsContext = await request("/v1/operations/context", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedOperationsContext.status, 403);
  assert.equal((deniedScopedOperationsContext.body as { error: string }).error, "forbidden");
  const deniedScopedStrategyContext = await request("/v1/strategy/context", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedStrategyContext.status, 403);
  assert.equal((deniedScopedStrategyContext.body as { error: string }).error, "forbidden");

  const scopedReadCompanyOs = await request("/v1/company-os/approvals", {
    headers: scopedAuth
  });
  assert.equal(scopedReadCompanyOs.status, 200);

  const deniedScopedApprovalRequest = await request("/v1/company-os/approvals/request", {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({
      requestedByType: "agent",
      requestedForAction: "drive.file.update",
      resourceType: "stage_run",
      riskLevel: "high"
    })
  });
  assert.equal(deniedScopedApprovalRequest.status, 403);
  assert.equal((deniedScopedApprovalRequest.body as { error: string }).error, "forbidden");
  const deniedScopedStandardArchive = await request(`/v1/company-os/standards/${createdStandardBody.data.id}`, {
    method: "DELETE",
    headers: scopedAuth
  });
  assert.equal(deniedScopedStandardArchive.status, 403);
  assert.equal((deniedScopedStandardArchive.body as { error: string }).error, "forbidden");
  const deniedScopedWorkflowDraftPreview = await request(`/v1/company-os/workflow-definitions/drafts/${createdWorkflowDraftBody.data.id}/actions/preview-impact`, {
    method: "POST",
    headers: scopedAuth
  });
  assert.equal(deniedScopedWorkflowDraftPreview.status, 403);
  assert.equal((deniedScopedWorkflowDraftPreview.body as { error: string }).error, "forbidden");
  const deniedScopedWorkflowDraftList = await request("/v1/company-os/workflow-definitions/drafts", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedWorkflowDraftList.status, 403);
  assert.equal((deniedScopedWorkflowDraftList.body as { error: string }).error, "forbidden");
  const deniedScopedWorkflowDraftActivation = await request(`/v1/company-os/workflow-definitions/drafts/${procedureWorkflowDraftBody.data.id}/actions/activate`, {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({
      approvalId: procedureActivationApprovalRequestBody.data.id
    })
  });
  assert.equal(deniedScopedWorkflowDraftActivation.status, 403);
  assert.equal((deniedScopedWorkflowDraftActivation.body as { error: string }).error, "forbidden");
  const deniedScopedWorkflowArchive = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/archive`, {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({
      reason: "Scoped read-only key must not archive workflow definitions."
    })
  });
  assert.equal(deniedScopedWorkflowArchive.status, 403);
  assert.equal((deniedScopedWorkflowArchive.body as { error: string }).error, "forbidden");
  const deniedScopedRollbackDraft = await request(`/v1/company-os/workflow-definitions/pipeline/${onboardingPipeline.id}/actions/create-rollback-draft`, {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({
      reason: "Scoped read-only key must not create rollback drafts."
    })
  });
  assert.equal(deniedScopedRollbackDraft.status, 403);
  assert.equal((deniedScopedRollbackDraft.body as { error: string }).error, "forbidden");

  const deniedScopedStageStart = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/actions/start-stage`, {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({
      pipelineStageId: kickoffStage.id
    })
  });
  assert.equal(deniedScopedStageStart.status, 403);
  assert.equal((deniedScopedStageStart.body as { error: string }).error, "forbidden");

  const deniedScopedAutomationEvaluation = await request(`/v1/company-os/events/${automationSourceEvent.id}/actions/evaluate-automation-rules`, {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({ mode: "dry_run" })
  });
  assert.equal(deniedScopedAutomationEvaluation.status, 403);
  assert.equal((deniedScopedAutomationEvaluation.body as { error: string }).error, "forbidden");

  const scopedReadNotes = await request("/v1/notes", {
    headers: scopedAuth
  });
  assert.equal(scopedReadNotes.status, 200);

  const deniedScopedNoteWrite = await request("/v1/notes", {
    method: "POST",
    headers: scopedAuth,
    body: JSON.stringify({ content: "Scoped key should not write this." })
  });
  assert.equal(deniedScopedNoteWrite.status, 403);
  assert.equal((deniedScopedNoteWrite.body as { error: string }).error, "forbidden");

  const deniedScopedAgentEventAck = await request("/v1/agent-events/00000000-0000-4000-8000-000000000001/ack", {
    method: "POST",
    headers: scopedAuth
  });
  assert.equal(deniedScopedAgentEventAck.status, 403);
  assert.equal((deniedScopedAgentEventAck.body as { error: string }).error, "forbidden");

  const ownerBearerNoteWrite = await request("/v1/notes", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ content: "Owner bearer writes are not API-key scoped." })
  });
  assert.equal(ownerBearerNoteWrite.status, 201);

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
          id: string;
          key: string;
          isSystem: boolean;
          tables: Array<{ tableName: string; apiSlug: string; source: string; externalId: string | null }>;
        }>;
        systemTables: string[];
      };
      capabilities: string[];
      adapterManifest: {
        basePath: string;
        schemaVersion: string;
        auth: { serviceHeader: string };
        routes: {
          projects: Array<{ method: string; path: string; capability: string }>;
          companyOs: Array<{ method: string; path: string; capability: string }>;
          mcp: Array<{ method: string; path: string; capability: string }>;
          goals: Array<{ method: string; path: string; capability: string }>;
          targets: Array<{ method: string; path: string; capability: string }>;
          tasks: Array<{ method: string; path: string; capability: string }>;
          operatingModel: Array<{ method: string; path: string; capability: string }>;
          taskLists: Array<{ method: string; path: string; capability: string }>;
          clients: Array<{ method: string; path: string; capability: string }>;
          pipelineStages: Array<{ method: string; path: string; capability: string }>;
          deals: Array<{ method: string; path: string; capability: string }>;
          agents: Array<{ method: string; path: string; capability: string }>;
          agentLogs: Array<{ method: string; path: string; capability: string }>;
          agentEvents: Array<{ method: string; path: string; capability: string }>;
          interactions: Array<{ method: string; path: string; capability: string }>;
          notes: Array<{ method: string; path: string; capability: string }>;
          decisions: Array<{ method: string; path: string; capability: string }>;
          integrationSettings: Array<{ method: string; path: string; capability: string }>;
          googleDrive: Array<{ method: string; path: string; capability: string }>;
        };
        schemas: {
          note: { create: { required: string[]; optional: string[] } };
          agentLog: { create: { required: string[]; optional: string[] } };
        };
        errors: Record<string, string>;
        writeRules: string[];
      };
      mcpManifest: {
        service: string;
        tools: Array<{ name: string; path: string; capability: string; riskLevel: string; requiresApproval: boolean }>;
      };
      integrations: {
        clickup: { configured: boolean; active: boolean; config: unknown };
        googleDrive: { configured: boolean; active: boolean; config: unknown };
      };
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
  assert.equal(connectionBody.data.operatingModel.areas.length, 13);
  assert.equal(connectionBody.data.operatingModel.areas[0]?.key, "main-general");
  assert.equal(connectionBody.data.operatingModel.areas[0]?.isSystem, true);
  const strategyArea = connectionBody.data.operatingModel.areas.find((area) => area.key === "strategy-governance");
  assert.ok(strategyArea);
  assert.ok(strategyArea.tables.some((table) => table.apiSlug === "goals" && table.tableName === "goals"));
  assert.ok(strategyArea.tables.some((table) => table.apiSlug === "targets" && table.tableName === "targets"));
  assert.ok(connectionBody.data.operatingModel.systemTables.includes("users"));
  assert.ok(connectionBody.data.capabilities.includes("connection:read"));
  assert.ok(connectionBody.data.capabilities.includes("company-os:read"));
  assert.ok(connectionBody.data.capabilities.includes("company-os:definition:write"));
  assert.ok(connectionBody.data.capabilities.includes("company-os:workflow-definition:write"));
  assert.ok(connectionBody.data.capabilities.includes("company-os:workflow-definition:activate"));
  assert.ok(connectionBody.data.capabilities.includes("mcp:read"));
  assert.ok(connectionBody.data.capabilities.includes("operating-model:read"));
  assert.ok(connectionBody.data.capabilities.includes("operating-model:mappings:write"));
  assert.ok(connectionBody.data.capabilities.includes("google-drive:files:scope:write"));
  assert.ok(connectionBody.data.capabilities.includes("tasks:write"));
  assert.equal(connectionBody.data.adapterManifest.basePath, "/v1");
  assert.equal(connectionBody.data.adapterManifest.schemaVersion, "2026-05-06");
  assert.equal(connectionBody.data.adapterManifest.auth.serviceHeader, "X-API-Key");
  assert.ok(connectionBody.data.adapterManifest.schemas.note.create.required.includes("content"));
  assert.ok(connectionBody.data.adapterManifest.schemas.agentLog.create.required.includes("message"));
  assert.ok(connectionBody.data.adapterManifest.errors["403"].includes("lacks permission"));
  assert.ok(connectionBody.data.adapterManifest.routes.operatingModel.some((route) => (
    route.method === "GET"
    && route.path === "/v1/operating-model"
    && route.capability === "operating-model:read"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.operatingModel.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/operating-model/external-mappings/:id/scope"
    && route.capability === "operating-model:mappings:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.operatingModel.some((route) => (
    route.method === "DELETE"
    && route.path === "/v1/operating-model/areas/:id"
    && route.capability === "operating-model:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.googleDrive.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/google-drive/files/:id/scope"
    && route.capability === "google-drive:files:scope:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.googleDrive.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/google-drive/files/:id/description"
    && route.capability === "google-drive:files:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.googleDrive.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/google-drive/files/:id/text-content"
    && route.capability === "google-drive:files:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "GET"
    && route.path === "/v1/company-os/:collection/:id"
    && route.capability === "company-os:read"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/standards"
    && route.capability === "company-os:definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "DELETE"
    && route.path === "/v1/company-os/standards/:id"
    && route.capability === "company-os:definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "GET"
    && route.path === "/v1/company-os/workflow-definitions/drafts"
    && route.capability === "company-os:workflow-definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "GET"
    && route.path === "/v1/company-os/workflow-definitions/drafts/:id"
    && route.capability === "company-os:workflow-definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/workflow-definitions/drafts"
    && route.capability === "company-os:workflow-definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact"
    && route.capability === "company-os:workflow-definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/workflow-definitions/drafts/:id/actions/activate"
    && route.capability === "company-os:workflow-definition:activate"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive"
    && route.capability === "company-os:workflow-definition:activate"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft"
    && route.capability === "company-os:workflow-definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/pipeline-runs/:id/actions/start-stage"
    && route.capability === "company-os:pipeline-run:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/pipeline-runs/:id/task-links"
    && route.capability === "company-os:pipeline-run:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/knowledge-links"
    && route.capability === "company-os:definition:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/stage-runs/:id/actions/complete"
    && route.capability === "company-os:stage-run:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.companyOs.some((route) => (
    route.method === "POST"
    && route.path === "/v1/company-os/events/:id/actions/evaluate-automation-rules"
    && route.capability === "company-os:automation:execute"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.mcp.some((route) => (
    route.method === "GET"
    && route.path === "/v1/mcp/manifest"
    && route.capability === "mcp:read"
  )));
  assert.equal(connectionBody.data.mcpManifest.service, "companycore");
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_get_mcp_manifest"
    && tool.path === "/v1/mcp/manifest"
    && tool.capability === "mcp:read"
    && tool.riskLevel === "read"
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_standards"
    && tool.path === "/v1/company-os/standards"
    && tool.capability === "company-os:definition:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_delete_company_os_standards_by_id"
    && tool.path === "/v1/company-os/standards/:id"
    && tool.capability === "company-os:definition:write"
    && tool.riskLevel === "destructive"
    && tool.requiresApproval === true
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_get_company_os_workflow_definitions_drafts"
    && tool.path === "/v1/company-os/workflow-definitions/drafts"
    && tool.capability === "company-os:workflow-definition:write"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_workflow_definitions_drafts"
    && tool.path === "/v1/company-os/workflow-definitions/drafts"
    && tool.capability === "company-os:workflow-definition:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_workflow_definitions_drafts_by_id_actions_preview_impact"
    && tool.path === "/v1/company-os/workflow-definitions/drafts/:id/actions/preview-impact"
    && tool.capability === "company-os:workflow-definition:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_workflow_definitions_drafts_by_id_actions_activate"
    && tool.path === "/v1/company-os/workflow-definitions/drafts/:id/actions/activate"
    && tool.capability === "company-os:workflow-definition:activate"
    && tool.riskLevel === "write"
    && tool.requiresApproval === true
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_workflow_definitions_by_rootObjectType_by_rootObjectId_actions_archive"
    && tool.path === "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/archive"
    && tool.capability === "company-os:workflow-definition:activate"
    && tool.riskLevel === "write"
    && tool.requiresApproval === true
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_workflow_definitions_by_rootObjectType_by_rootObjectId_actions_create_rollback_draft"
    && tool.path === "/v1/company-os/workflow-definitions/:rootObjectType/:rootObjectId/actions/create-rollback-draft"
    && tool.capability === "company-os:workflow-definition:write"
    && tool.riskLevel === "write"
    && tool.requiresApproval === false
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_stage_runs_by_id_actions_complete"
    && tool.path === "/v1/company-os/stage-runs/:id/actions/complete"
    && tool.capability === "company-os:stage-run:write"
    && tool.requiresApproval === true
  )));
  assert.ok(connectionBody.data.mcpManifest.tools.some((tool) => (
    tool.name === "companycore_post_company_os_events_by_id_actions_evaluate_automation_rules"
    && tool.path === "/v1/company-os/events/:id/actions/evaluate-automation-rules"
    && tool.capability === "company-os:automation:execute"
    && tool.requiresApproval === true
  )));
  const assetsArea = await prisma.operatingArea.findUnique({
    where: {
      workspaceId_key: {
        workspaceId: ownerA.workspace.id,
        key: "assets-storage"
      }
    }
  });
  assert.ok(assetsArea);
  const financeArea = await prisma.operatingArea.findUnique({
    where: {
      workspaceId_key: {
        workspaceId: ownerA.workspace.id,
        key: "finance-billing"
      }
    }
  });
  assert.ok(financeArea);
  const driveStorageLocation = await prisma.storageLocation.create({
    data: {
      workspaceId: ownerA.workspace.id,
      areaId: assetsArea.id,
      provider: "google_drive",
      name: "Drive root",
      locator: { folderId: "drive-folder-root" }
    }
  });
  const driveRootFolder = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      externalId: "drive-folder-root",
      name: "Drive root folder",
      mimeType: "application/vnd.google-apps.folder",
      isFolder: true,
      storageLocationId: driveStorageLocation.id,
      operatingAreaId: assetsArea.id,
      rawMetadata: { source: "test-import" },
      syncStatus: "synced"
    }
  });
  const firstDriveFile = await prisma.googleDriveFile.upsert({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-file-1"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      externalId: "drive-file-1",
      name: "Original Drive file",
      mimeType: "application/vnd.google-apps.document",
      parentExternalId: "drive-folder-root",
      webViewLink: "https://docs.google.com/document/d/drive-file-1",
      headRevisionId: "rev-1",
      storageLocationId: driveStorageLocation.id,
      rawMetadata: { source: "test-import" },
      syncStatus: "synced"
    },
    update: {
      name: "Original Drive file"
    }
  });
  const updatedDriveFile = await prisma.googleDriveFile.upsert({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-file-1"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      externalId: "drive-file-1",
      name: "Duplicate should not be created",
      mimeType: "application/vnd.google-apps.document"
    },
    update: {
      name: "Updated Drive file",
      headRevisionId: "rev-2"
    }
  });
  assert.equal(updatedDriveFile.id, firstDriveFile.id);
  assert.equal(updatedDriveFile.name, "Updated Drive file");
  const driveFileCount = await prisma.googleDriveFile.count({
    where: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      externalId: "drive-file-1"
    }
  });
  assert.equal(driveFileCount, 1);

  await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerB.workspace.id,
      externalId: "drive-file-1",
      name: "Workspace B Drive file",
      mimeType: "application/vnd.google-apps.document"
    }
  });
  const allWorkspaceCopies = await prisma.googleDriveFile.count({
    where: {
      provider: "google_drive",
      externalId: "drive-file-1"
    }
  });
  assert.equal(allWorkspaceCopies, 2);

  const firstSnapshot = await prisma.googleDriveContentSnapshot.upsert({
    where: {
      googleDriveFileId_sourceRevisionId: {
        googleDriveFileId: firstDriveFile.id,
        sourceRevisionId: "rev-2"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      googleDriveFileId: firstDriveFile.id,
      sourceRevisionId: "rev-2",
      contentKind: "google_doc",
      extractedText: "Original extracted document text",
      summary: "Original summary",
      metadata: { extractor: "test" }
    },
    update: {
      summary: "Original summary"
    }
  });
  const updatedSnapshot = await prisma.googleDriveContentSnapshot.upsert({
    where: {
      googleDriveFileId_sourceRevisionId: {
        googleDriveFileId: firstDriveFile.id,
        sourceRevisionId: "rev-2"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      googleDriveFileId: firstDriveFile.id,
      sourceRevisionId: "rev-2",
      contentKind: "google_doc",
      summary: "Duplicate should not be created"
    },
    update: {
      summary: "Refreshed summary"
    }
  });
  assert.equal(updatedSnapshot.id, firstSnapshot.id);
  assert.equal(updatedSnapshot.summary, "Refreshed summary");
  const snapshotCount = await prisma.googleDriveContentSnapshot.count({
    where: {
      googleDriveFileId: firstDriveFile.id,
      sourceRevisionId: "rev-2"
    }
  });
  assert.equal(snapshotCount, 1);

  await prisma.integrationSetting.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      secretCiphertext: "test-ciphertext",
      config: {}
    },
    update: {
      config: {}
    }
  });
  const driveScopeUpdate = await request(`/v1/google-drive/files/${driveRootFolder.id}/scope`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ areaId: financeArea.id })
  });
  assert.equal(driveScopeUpdate.status, 200);
  assert.equal((driveScopeUpdate.body as { data: { updatedCount: number } }).data.updatedCount, 2);
  const scopedDriveRoot = await prisma.googleDriveFile.findUnique({ where: { id: driveRootFolder.id } });
  const scopedDriveChild = await prisma.googleDriveFile.findUnique({ where: { id: firstDriveFile.id } });
  assert.equal(scopedDriveRoot?.operatingAreaId, financeArea.id);
  assert.equal(scopedDriveChild?.operatingAreaId, financeArea.id);
  const driveDescriptionUpdate = await request(`/v1/google-drive/files/${driveRootFolder.id}/description`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({ description: "Owner note: contract draft with onboarding context." })
  });
  assert.equal(driveDescriptionUpdate.status, 200);
  assert.equal(
    (driveDescriptionUpdate.body as { data: { description: string } }).data.description,
    "Owner note: contract draft with onboarding context."
  );
  const scopedDriveDescriptionDenied = await request(`/v1/google-drive/files/${driveRootFolder.id}/description`, {
    method: "PATCH",
    headers: scopedAuth,
    body: JSON.stringify({ description: "read-only key cannot write Drive descriptions" })
  });
  assert.equal(scopedDriveDescriptionDenied.status, 403);
  const crossWorkspaceDriveDescription = await request(`/v1/google-drive/files/${driveRootFolder.id}/description`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({ description: "Workspace B cannot edit Workspace A files" })
  });
  assert.equal(crossWorkspaceDriveDescription.status, 404);
  const scopedDriveSettings = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    }
  });
  const scopedDriveConfig = scopedDriveSettings?.config as { operatingScopeMappings?: Array<{ folderId: string; operatingAreaId: string }> };
  assert.ok(scopedDriveConfig.operatingScopeMappings?.some((mapping) => (
    mapping.folderId === "drive-folder-root"
    && mapping.operatingAreaId === financeArea.id
  )));

  assert.ok(connectionBody.data.adapterManifest.routes.tasks.some((route) => (
    route.method === "POST"
    && route.path === "/v1/tasks"
    && route.capability === "tasks:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.projects.some((route) => (
    route.method === "GET"
    && route.path === "/v1/projects/:id"
    && route.capability === "projects:read"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.goals.some((route) => (
    route.method === "PATCH"
    && route.path === "/v1/goals/:id"
    && route.capability === "goals:write"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.projects.some((route) => (
    route.method === "DELETE"
    && route.path === "/v1/projects/:id"
    && route.capability === "projects:write"
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
  assert.ok(connectionBody.data.adapterManifest.routes.agentLogs.some((route) => (
    route.method === "GET"
    && route.path === "/v1/agent-logs/:id"
    && route.capability === "agent-logs:read"
  )));
  assert.ok(connectionBody.data.adapterManifest.routes.agentEvents.some((route) => (
    route.method === "POST"
    && route.path === "/v1/agent-events/:id/ack"
    && route.capability === "agent-events:ack"
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
  assert.equal(connectionBody.data.integrations.googleDrive.configured, false);

  const projectListB = await request("/v1/projects", { headers: authB });
  assert.equal(projectListB.status, 200);
  assert.equal((projectListB.body as { data: unknown[] }).data.length, 0);

  const projectAId = (serviceProject.body as { data: { id: string } }).data.id;
  const workflowProcess = await request("/v1/company-os/processes", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Agent-readable execution process",
      description: "Process for goal/workflow bridge assertions.",
      department: "Strategy",
      category: "execution",
      status: "active"
    })
  });
  assert.equal(workflowProcess.status, 201);
  const processIdA = (workflowProcess.body as { data: { id: string } }).data.id;
  const workflowPipeline = await request("/v1/company-os/pipelines", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Agent-readable execution pipeline",
      purpose: "Pipeline for target/workflow bridge assertions.",
      processId: processIdA,
      status: "active"
    })
  });
  assert.equal(workflowPipeline.status, 201);
  const pipelineAId = (workflowPipeline.body as { data: { id: string } }).data.id;

  const readProject = await request(`/v1/projects/${projectAId}`, { headers: authA });
  assert.equal(readProject.status, 200);
  assert.equal((readProject.body as { data: { id: string; name: string } }).data.name, "Service project");

  const updatedProject = await request(`/v1/projects/${projectAId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      description: "Updated through agent CRUD"
    })
  });
  assert.equal(updatedProject.status, 200);
  assert.equal((updatedProject.body as { data: { description: string } }).data.description, "Updated through agent CRUD");

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

  const readTaskList = await request(`/v1/task-lists/${taskListId}`, { headers: authA });
  assert.equal(readTaskList.status, 200);
  assert.equal((readTaskList.body as { data: { id: string } }).data.id, taskListId);

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

  const goal = await request("/v1/goals", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      projectId: projectAId,
      processId: processIdA,
      title: "Agent-readable goal"
    })
  });
  assert.equal(goal.status, 201);
  const goalId = (goal.body as { data: { id: string } }).data.id;

  const readGoal = await request(`/v1/goals/${goalId}`, { headers: authA });
  assert.equal(readGoal.status, 200);
  assert.equal((readGoal.body as { data: { title: string } }).data.title, "Agent-readable goal");
  assert.equal((readGoal.body as { data: { processId: string } }).data.processId, processIdA);

  const updatedGoal = await request(`/v1/goals/${goalId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "active-reviewed"
    })
  });
  assert.equal(updatedGoal.status, 200);
  const targetMetric = await prisma.metric.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Target metric relation proof",
      category: "strategy",
      measurementType: "count",
      status: "active"
    }
  });

  const target = await request("/v1/targets", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      goalId,
      pipelineId: pipelineAId,
      metricId: targetMetric.id,
      title: "Agent-readable target",
      metric: "records",
      targetValue: 3
    })
  });
  assert.equal(target.status, 201);
  const targetId = (target.body as { data: { id: string } }).data.id;

  const readTarget = await request(`/v1/targets/${targetId}`, { headers: authA });
  assert.equal(readTarget.status, 200);
  assert.equal((readTarget.body as { data: { pipelineId: string } }).data.pipelineId, pipelineAId);
  assert.equal((readTarget.body as { data: { metricId: string; metricRef: { id: string } } }).data.metricId, targetMetric.id);
  assert.equal((readTarget.body as { data: { metricRef: { id: string } } }).data.metricRef.id, targetMetric.id);
  const updatedTarget = await request(`/v1/targets/${targetId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      currentValue: 1
    })
  });
  assert.equal(updatedTarget.status, 200);

  const foreignTargetUpdate = await request(`/v1/targets/${targetId}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({
      currentValue: 2
    })
  });
  assert.equal(foreignTargetUpdate.status, 404);

  const serviceCannotCreateKeys = await request("/v1/api-keys", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      name: "Nested adapter key"
    })
  });
  assert.equal(serviceCannotCreateKeys.status, 403);

  await prisma.operatingArea.delete({
    where: {
      workspaceId_key: {
        workspaceId: ownerA.workspace.id,
        key: "main-general"
      }
    }
  });

  const operatingModel = await request("/v1/operating-model", { headers: authA });
  assert.equal(operatingModel.status, 200);
  const operatingModelBody = operatingModel.body as {
    data: {
      areas: Array<{ id: string; key: string; isSystem: boolean; tables: Array<{ apiSlug: string }> }>;
    };
  };
  assert.equal(operatingModelBody.data.areas.length, 13);
  assert.equal(operatingModelBody.data.areas[0]?.key, "main-general");
  assert.equal(operatingModelBody.data.areas[0]?.isSystem, true);
  assert.ok(operatingModelBody.data.areas.some((area) => (
    area.key === "strategy-governance"
    && area.tables.some((table) => table.apiSlug === "goals")
    && area.tables.some((table) => table.apiSlug === "targets")
  )));

  const protectedAreaDelete = await request(`/v1/operating-model/areas/${operatingModelBody.data.areas[0]?.id}`, {
    method: "DELETE",
    headers: authA,
    body: JSON.stringify({
      reassignToAreaId: strategyArea.id
    })
  });
  assert.equal(protectedAreaDelete.status, 403);

  const customArea = await request("/v1/operating-model/areas", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Agent scratch area",
      description: "Temporary user-created area"
    })
  });
  assert.equal(customArea.status, 201);
  const customAreaBody = customArea.body as { data: { id: string; key: string; isSystem: boolean } };
  assert.equal(customAreaBody.data.isSystem, false);

  const updatedCustomArea = await request(`/v1/operating-model/areas/${customAreaBody.data.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      name: "Agent reviewed scratch area"
    })
  });
  assert.equal(updatedCustomArea.status, 200);

  const goalsTable = await prisma.operatingTable.findUniqueOrThrow({
    where: {
      workspaceId_apiSlug: {
        workspaceId: ownerA.workspace.id,
        apiSlug: "goals"
      }
    }
  });

  const agentFolder = await request("/v1/operating-model/folders", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      areaId: goalsTable.areaId,
      name: "Agent memory"
    })
  });
  assert.equal(agentFolder.status, 201);
  const agentFolderId = (agentFolder.body as { data: { id: string } }).data.id;

  const readAgentFolder = await request(`/v1/operating-model/folders/${agentFolderId}`, { headers: authA });
  assert.equal(readAgentFolder.status, 200);

  const updatedAgentFolder = await request(`/v1/operating-model/folders/${agentFolderId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      description: "Agent-readable operating folder"
    })
  });
  assert.equal(updatedAgentFolder.status, 200);

  const deletedAgentFolder = await request(`/v1/operating-model/folders/${agentFolderId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(deletedAgentFolder.status, 200);

  const customAreaFolder = await request("/v1/operating-model/folders", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      areaId: customAreaBody.data.id,
      name: "Scratch folder"
    })
  });
  assert.equal(customAreaFolder.status, 201);
  const customAreaFolderId = (customAreaFolder.body as { data: { id: string } }).data.id;

  const deletedCustomArea = await request(`/v1/operating-model/areas/${customAreaBody.data.id}`, {
    method: "DELETE",
    headers: authA,
    body: JSON.stringify({
      reassignToAreaId: goalsTable.areaId
    })
  });
  assert.equal(deletedCustomArea.status, 200);
  const reassignedFolder = await prisma.operatingFolder.findUniqueOrThrow({
    where: { id: customAreaFolderId }
  });
  assert.equal(reassignedFolder.areaId, goalsTable.areaId);
  const removedCustomArea = await prisma.operatingArea.findUnique({
    where: { id: customAreaBody.data.id }
  });
  assert.equal(removedCustomArea, null);

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
  const knowledgeRootId = (knowledgeRoot.body as { data: { id: string } }).data.id;

  const readKnowledgeRoot = await request(`/v1/operating-model/knowledge-roots/${knowledgeRootId}`, { headers: authA });
  assert.equal(readKnowledgeRoot.status, 200);

  const updatedKnowledgeRoot = await request(`/v1/operating-model/knowledge-roots/${knowledgeRootId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      name: "Reviewed goals vault"
    })
  });
  assert.equal(updatedKnowledgeRoot.status, 200);

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
  const storageLocationId = (storageLocation.body as { data: { id: string } }).data.id;

  const readStorageLocation = await request(`/v1/operating-model/storage-locations/${storageLocationId}`, { headers: authA });
  assert.equal(readStorageLocation.status, 200);

  const updatedStorageLocation = await request(`/v1/operating-model/storage-locations/${storageLocationId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      name: "Reviewed goals folder"
    })
  });
  assert.equal(updatedStorageLocation.status, 200);

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
  const automationDefinitionId = (automationDefinition.body as { data: { id: string } }).data.id;

  const readAutomationDefinition = await request(`/v1/operating-model/automation-definitions/${automationDefinitionId}`, { headers: authA });
  assert.equal(readAutomationDefinition.status, 200);

  const updatedAutomationDefinition = await request(`/v1/operating-model/automation-definitions/${automationDefinitionId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      enabled: false
    })
  });
  assert.equal(updatedAutomationDefinition.status, 200);

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

  const foreignAutomationUpdate = await request(`/v1/operating-model/automation-definitions/${automationDefinitionId}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({
      enabled: true
    })
  });
  assert.equal(foreignAutomationUpdate.status, 404);

  const deletedAutomationDefinition = await request(`/v1/operating-model/automation-definitions/${automationDefinitionId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(deletedAutomationDefinition.status, 200);

  const deletedStorageLocation = await request(`/v1/operating-model/storage-locations/${storageLocationId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(deletedStorageLocation.status, 200);

  const deletedKnowledgeRoot = await request(`/v1/operating-model/knowledge-roots/${knowledgeRootId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(deletedKnowledgeRoot.status, 200);

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

  const readTask = await request(`/v1/tasks/${taskId}`, { headers: authA });
  assert.equal(readTask.status, 200);
  assert.equal((readTask.body as { data: { id: string } }).data.id, taskId);

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

  const readClient = await request(`/v1/clients/${clientId}`, { headers: authA });
  assert.equal(readClient.status, 200);
  assert.equal((readClient.body as { data: { email: string } }).data.email, "client-a@example.com");

  const updatedClient = await request(`/v1/clients/${clientId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "qualified"
    })
  });
  assert.equal(updatedClient.status, 200);

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

  const readPipelineStage = await request(`/v1/pipeline-stages/${pipelineStageId}`, { headers: authA });
  assert.equal(readPipelineStage.status, 200);

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
  const dealId = (deal.body as { data: { id: string } }).data.id;

  const readDeal = await request(`/v1/deals/${dealId}`, { headers: authA });
  assert.equal(readDeal.status, 200);

  const updatedDeal = await request(`/v1/deals/${dealId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "won"
    })
  });
  assert.equal(updatedDeal.status, 200);

  const foreignDealUpdate = await request(`/v1/deals/${dealId}`, {
    method: "PATCH",
    headers: authB,
    body: JSON.stringify({
      title: "Should not update another workspace deal"
    })
  });
  assert.equal(foreignDealUpdate.status, 404);

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
  const interactionId = (interaction.body as { data: { id: string } }).data.id;

  const readInteraction = await request(`/v1/interactions/${interactionId}`, { headers: authA });
  assert.equal(readInteraction.status, 200);

  const updatedInteraction = await request(`/v1/interactions/${interactionId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      summary: "Paperclip captured and enriched a reply"
    })
  });
  assert.equal(updatedInteraction.status, 200);

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
  const noteId = (note.body as { data: { id: string } }).data.id;

  const readNote = await request(`/v1/notes/${noteId}`, { headers: authA });
  assert.equal(readNote.status, 200);

  const updatedNote = await request(`/v1/notes/${noteId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      content: "Workspace A scoped note updated by agent API"
    })
  });
  assert.equal(updatedNote.status, 200);

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
  const decisionId = (decision.body as { data: { id: string } }).data.id;

  const readDecision = await request(`/v1/decisions/${decisionId}`, { headers: authA });
  assert.equal(readDecision.status, 200);

  const updatedDecision = await request(`/v1/decisions/${decisionId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      outcome: "approved-reviewed"
    })
  });
  assert.equal(updatedDecision.status, 200);

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

  const readAgent = await request(`/v1/agents/${agentId}`, { headers: authA });
  assert.equal(readAgent.status, 200);

  const updatedAgent = await request(`/v1/agents/${agentId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "paused"
    })
  });
  assert.equal(updatedAgent.status, 200);

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
  const agentLogId = (agentLog.body as { data: { id: string } }).data.id;

  const readAgentLog = await request(`/v1/agent-logs/${agentLogId}`, { headers: authA });
  assert.equal(readAgentLog.status, 200);

  const foreignAgentLog = await request("/v1/agent-logs", {
    method: "POST",
    headers: authB,
    body: JSON.stringify({
      agentId,
      message: "Should not attach to another workspace"
    })
  });
  assert.equal(foreignAgentLog.status, 404);

  const archivedInteraction = await request(`/v1/interactions/${interactionId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedInteraction.status, 200);
  assert.equal((archivedInteraction.body as { data: { status: string } }).data.status, "archived");

  const archivedNote = await request(`/v1/notes/${noteId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedNote.status, 200);
  assert.equal((archivedNote.body as { data: { status: string } }).data.status, "archived");

  const archivedDecision = await request(`/v1/decisions/${decisionId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedDecision.status, 200);
  assert.equal((archivedDecision.body as { data: { status: string } }).data.status, "archived");

  const retiredAgent = await request(`/v1/agents/${agentId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(retiredAgent.status, 200);
  assert.equal((retiredAgent.body as { data: { status: string } }).data.status, "retired");

  const archivedDeal = await request(`/v1/deals/${dealId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedDeal.status, 200);
  assert.equal((archivedDeal.body as { data: { status: string } }).data.status, "archived");

  const archivedClient = await request(`/v1/clients/${clientId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedClient.status, 200);
  assert.equal((archivedClient.body as { data: { status: string } }).data.status, "archived");

  const archivedPipelineStage = await request(`/v1/pipeline-stages/${pipelineStageId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedPipelineStage.status, 200);
  assert.equal((archivedPipelineStage.body as { data: { status: string } }).data.status, "archived");

  const archivedTaskList = await request(`/v1/task-lists/${taskListId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedTaskList.status, 200);
  assert.equal((archivedTaskList.body as { data: { status: string } }).data.status, "archived");

  const archivedTarget = await request(`/v1/targets/${targetId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedTarget.status, 200);
  assert.equal((archivedTarget.body as { data: { status: string } }).data.status, "archived");

  const archivedGoal = await request(`/v1/goals/${goalId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedGoal.status, 200);
  assert.equal((archivedGoal.body as { data: { status: string } }).data.status, "archived");

  const archivedProject = await request(`/v1/projects/${projectAId}`, {
    method: "DELETE",
    headers: authA
  });
  assert.equal(archivedProject.status, 200);
  assert.equal((archivedProject.body as { data: { status: string } }).data.status, "archived");

  const foreignProjectArchive = await request(`/v1/projects/${projectAId}`, {
    method: "DELETE",
    headers: authB
  });
  assert.equal(foreignProjectArchive.status, 404);

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

  const googleDriveSettings = await request("/integration-settings/google_drive", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({
      oauthClient: {
        clientId: "workspace-google-client-id",
        clientSecret: "workspace-google-client-secret"
      },
      oauth: {
        refreshToken: "google-refresh-token",
        accessToken: "google-access-token",
        expiresAt: "2099-05-03T12:00:00.000Z",
        scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets"
      },
      config: {
        rootFolderIds: ["drive-folder-root"],
        selectedFolderIds: ["drive-folder-root"],
        sharedDriveIds: ["shared-drive-1"],
        syncMode: "two_way",
        importMode: "merge",
        changesPageToken: "changes-token-1"
      }
    })
  });
  assert.equal(googleDriveSettings.status, 200);
  const googleDriveSettingsBody = googleDriveSettings.body as {
    data: {
      provider: string;
      config: { rootFolderIds: string[]; syncMode: string; importMode: string };
      secretConfigured: boolean;
      oauthClientConfigured: boolean;
      oauthTokenConfigured: boolean;
      oauth?: unknown;
      token?: unknown;
    };
  };
  assert.equal(googleDriveSettingsBody.data.provider, "google_drive");
  assert.equal(googleDriveSettingsBody.data.secretConfigured, true);
  assert.equal(googleDriveSettingsBody.data.oauthClientConfigured, true);
  assert.equal(googleDriveSettingsBody.data.oauthTokenConfigured, true);
  assert.deepEqual(googleDriveSettingsBody.data.config.rootFolderIds, ["drive-folder-root"]);
  assert.equal(googleDriveSettingsBody.data.config.syncMode, "two_way");
  assert.equal(googleDriveSettingsBody.data.config.importMode, "merge");
  assert.equal(googleDriveSettingsBody.data.oauth, undefined);
  assert.equal(googleDriveSettingsBody.data.token, undefined);

  const loadedGoogleDriveSettings = await getGoogleDriveSettingsForWorkspace(ownerA.workspace.id);
  assert.equal(loadedGoogleDriveSettings?.oauth.clientId, "workspace-google-client-id");
  assert.equal(loadedGoogleDriveSettings?.oauth.clientSecret, "workspace-google-client-secret");
  assert.equal(loadedGoogleDriveSettings?.oauth.refreshToken, "google-refresh-token");
  assert.equal(loadedGoogleDriveSettings?.oauth.accessToken, "google-access-token");
  assert.equal(loadedGoogleDriveSettings?.config.rootFolderIds?.[0], "drive-folder-root");

  const googleDriveAuthorizeUrl = await request("/v1/integration-settings/google_drive/oauth/authorize-url", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      redirectUri: "https://companycore.luckysparrow.ch/settings/google-drive/callback",
      state: "workspace-a-google-drive",
      loginHint: "owner-a@example.com"
    })
  });
  assert.equal(googleDriveAuthorizeUrl.status, 200);
  const authorizationUrl = new URL((googleDriveAuthorizeUrl.body as { data: { authorizationUrl: string } }).data.authorizationUrl);
  assert.equal(authorizationUrl.origin, "https://accounts.google.com");
  assert.equal(authorizationUrl.searchParams.get("client_id"), "workspace-google-client-id");
  assert.equal(authorizationUrl.searchParams.get("access_type"), "offline");
  assert.equal(authorizationUrl.searchParams.get("include_granted_scopes"), "true");
  assert.ok(authorizationUrl.searchParams.get("scope")?.includes("https://www.googleapis.com/auth/drive.file"));

  const serviceCannotCreateGoogleDriveAuthUrl = await request("/v1/integration-settings/google_drive/oauth/authorize-url", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      redirectUri: "https://companycore.luckysparrow.ch/settings/google-drive/callback"
    })
  });
  assert.equal(serviceCannotCreateGoogleDriveAuthUrl.status, 403);

  await prisma.integrationSetting.update({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    },
    data: {
      secretCiphertext: "invalid-google-drive-oauth-ciphertext"
    }
  });

  const reconnectAuthorizeUrl = await request("/v1/integration-settings/google_drive/oauth/authorize-url", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      redirectUri: "https://companycore.luckysparrow.ch/settings/drive",
      state: "repair-google-drive-oauth"
    })
  });
  assert.equal(reconnectAuthorizeUrl.status, 200);
  const reconnectUrl = new URL((reconnectAuthorizeUrl.body as { data: { authorizationUrl: string } }).data.authorizationUrl);
  assert.equal(reconnectUrl.searchParams.get("client_id"), "dev-google-oauth-client-id");

  const originalFetchBeforeGoogleDriveReconnect = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://oauth2.googleapis.com");
    return new Response(JSON.stringify({
      access_token: "reconnected-google-access-token",
      refresh_token: "reconnected-google-refresh-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets"
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const reconnectExchange = await request("/v1/integration-settings/google_drive/oauth/exchange", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        code: "repair-google-drive-code",
        redirectUri: "https://companycore.luckysparrow.ch/settings/drive",
        active: true,
        config: {
          rootFolderIds: ["drive-folder-root"],
          selectedFolderIds: ["drive-folder-root"],
          sharedDriveIds: ["shared-drive-1"],
          syncMode: "two_way",
          importMode: "merge",
          changesPageToken: "changes-token-1"
        }
      })
    });
    assert.equal(reconnectExchange.status, 200);
    assert.equal((reconnectExchange.body as { data: { oauthTokenConfigured: boolean } }).data.oauthTokenConfigured, true);
    const repairedGoogleDriveSettings = await getGoogleDriveSettingsForWorkspace(ownerA.workspace.id);
    assert.equal(repairedGoogleDriveSettings?.oauth.clientId, "dev-google-oauth-client-id");
    assert.equal(repairedGoogleDriveSettings?.oauth.clientSecret, "dev-google-oauth-client-secret");
    assert.equal(repairedGoogleDriveSettings?.oauth.refreshToken, "reconnected-google-refresh-token");
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveReconnect;
  }

  const originalFetchBeforeGoogleDriveImport = globalThis.fetch;
  let googleDriveListCallCount = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.origin === "https://docs.googleapis.com") {
      assert.ok(url.pathname === "/v1/documents/drive-doc-1" || url.pathname === "/v1/documents/drive-nested-doc-1");
      const documentId = url.pathname.split("/").at(-1);
      return new Response(JSON.stringify({
        body: {
          content: [{
            paragraph: {
              elements: [{
                textRun: {
                  content: `${documentId} imported content for search.\n`
                }
              }]
            }
          }]
        }
      }), { status: 200 });
    }

    if (url.origin === "https://sheets.googleapis.com") {
      assert.equal(url.pathname, "/v4/spreadsheets/drive-sheet-1/values/A1%3AZ100");
      return new Response(JSON.stringify({
        range: "A1:Z100",
        values: [["Metric", "Value"], ["Imported sheet", "indexed"]]
      }), { status: 200 });
    }

    assert.equal(url.origin, "https://www.googleapis.com");
    assert.ok(url.pathname === "/drive/v3/files" || url.pathname === "/drive/v3/files/drive-folder-root");
    assert.equal(url.searchParams.get("supportsAllDrives"), "true");

    if (url.pathname === "/drive/v3/files/drive-folder-root") {
      return new Response(JSON.stringify({
        id: "drive-folder-root",
        name: "Drive root folder",
        mimeType: "application/vnd.google-apps.folder",
        description: "Root folder description from Drive",
        headRevisionId: "folder-rev-1",
        modifiedTime: "2026-05-03T09:55:00.000Z"
      }), { status: 200 });
    }

    assert.equal(url.searchParams.get("spaces"), "drive");
    googleDriveListCallCount += 1;
    const query = url.searchParams.get("q") || "";
    const files = query.includes("'drive-nested-folder' in parents")
      ? [
        {
          id: "drive-nested-doc-1",
          name: "Nested Drive doc",
          mimeType: "application/vnd.google-apps.document",
          parents: ["drive-nested-folder"],
          webViewLink: "https://docs.google.com/document/d/drive-nested-doc-1",
          headRevisionId: "nested-rev-1",
          modifiedTime: "2026-05-03T10:10:00.000Z"
        }
      ]
      : [
        {
          id: "drive-doc-1",
          name: googleDriveListCallCount > 1 ? "Imported Drive doc updated" : "Imported Drive doc",
          mimeType: "application/vnd.google-apps.document",
          parents: ["drive-folder-root"],
          webViewLink: "https://docs.google.com/document/d/drive-doc-1",
          headRevisionId: `rev-${googleDriveListCallCount}`,
          modifiedTime: "2026-05-03T10:00:00.000Z"
        },
        {
          id: "drive-sheet-1",
          name: "Imported Drive sheet",
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: ["drive-folder-root"],
          webViewLink: "https://docs.google.com/spreadsheets/d/drive-sheet-1",
          headRevisionId: "sheet-rev-1",
          modifiedTime: "2026-05-03T10:05:00.000Z"
        },
        {
          id: "drive-nested-folder",
          name: "Nested Drive folder",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["drive-folder-root"],
          headRevisionId: "nested-folder-rev-1",
          modifiedTime: "2026-05-03T10:06:00.000Z"
        }
      ];
    return new Response(JSON.stringify({ files }), { status: 200 });
  }) as typeof fetch;

  try {
    const discoveredDriveFolders = await request("/v1/integration-settings/google_drive/folders/discover", {
      headers: authA
    });
    assert.equal(discoveredDriveFolders.status, 200);
    const discoveredDriveFoldersBody = discoveredDriveFolders.body as {
      data: Array<{ id: string; name: string; parentId: string | null; path: string; depth: number; selected: boolean; childCount: number; descendantCount: number }>;
    };
    const discoveredNestedFolder = discoveredDriveFoldersBody.data.find((folder) => folder.id === "drive-nested-folder");
    assert.ok(discoveredNestedFolder);
    assert.equal(discoveredNestedFolder.name, "Nested Drive folder");
    assert.equal(discoveredNestedFolder.parentId, "drive-folder-root");
    assert.equal(discoveredNestedFolder.path, "Nested Drive folder");
    assert.equal(discoveredNestedFolder.depth, 0);
    assert.equal(discoveredNestedFolder.childCount, 0);
    assert.equal(discoveredNestedFolder.descendantCount, 0);
    assert.equal(discoveredDriveFoldersBody.data.some((folder) => folder.id === "drive-doc-1"), false);

    const inspectDriveImport = await request("/v1/integration-settings/google_drive/import", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "inspect_only"
      })
    });
    assert.equal(inspectDriveImport.status, 200);
    const inspectDriveImportBody = inspectDriveImport.body as {
      data: {
        itemCount: number;
        createdCount: number;
        skippedCount: number;
        wouldCreateCount: number;
        contentRefreshedCount: number;
        contentSkippedCount: number;
      };
    };
    assert.equal(inspectDriveImportBody.data.itemCount, 5);
    assert.equal(inspectDriveImportBody.data.createdCount, 0);
    assert.equal(inspectDriveImportBody.data.skippedCount, 5);
    assert.equal(inspectDriveImportBody.data.wouldCreateCount, 4);
    assert.equal(inspectDriveImportBody.data.contentRefreshedCount, 0);
    assert.equal(inspectDriveImportBody.data.contentSkippedCount, 5);
    assert.equal(await prisma.googleDriveFile.count({ where: { workspaceId: ownerA.workspace.id } }), 2);

    const mergeDriveImport = await request("/v1/integration-settings/google_drive/import", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "merge"
      })
    });
    assert.equal(mergeDriveImport.status, 200);
    const mergeDriveImportBody = mergeDriveImport.body as {
      data: {
        itemCount: number;
        createdCount: number;
        updatedCount: number;
        skippedCount: number;
        contentRefreshedCount: number;
        contentSkippedCount: number;
      };
    };
    assert.equal(mergeDriveImportBody.data.itemCount, 5);
    assert.equal(mergeDriveImportBody.data.createdCount, 4);
    assert.equal(mergeDriveImportBody.data.updatedCount, 1);
    assert.equal(mergeDriveImportBody.data.skippedCount, 0);
    assert.equal(mergeDriveImportBody.data.contentRefreshedCount, 3);
    assert.equal(mergeDriveImportBody.data.contentSkippedCount, 2);

    const repeatDriveImport = await request("/v1/integration-settings/google_drive/import", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "merge"
      })
    });
    assert.equal(repeatDriveImport.status, 200);
    const repeatDriveImportBody = repeatDriveImport.body as {
      data: {
        createdCount: number;
        updatedCount: number;
        wouldUpdateCount: number;
        contentRefreshedCount: number;
        contentSkippedCount: number;
      };
    };
    assert.equal(repeatDriveImportBody.data.createdCount, 0);
    assert.equal(repeatDriveImportBody.data.updatedCount, 5);
    assert.equal(repeatDriveImportBody.data.wouldUpdateCount, 5);
    assert.equal(repeatDriveImportBody.data.contentRefreshedCount, 3);
    assert.equal(repeatDriveImportBody.data.contentSkippedCount, 2);
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveImport;
  }

  const importedDriveDoc = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-doc-1"
      }
    }
  });
  assert.equal(importedDriveDoc?.name, "Imported Drive doc updated");
  assert.equal(importedDriveDoc?.parentExternalId, "drive-folder-root");
  assert.equal(importedDriveDoc?.syncStatus, "synced");
  const importedNestedDriveDoc = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-nested-doc-1"
      }
    }
  });
  assert.equal(importedNestedDriveDoc?.parentExternalId, "drive-nested-folder");
  const importedDriveSheet = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-sheet-1"
      }
    }
  });
  assert.ok(importedDriveDoc?.id);
  assert.ok(importedDriveSheet?.id);
  assert.ok(importedNestedDriveDoc?.id);
  const importedContentSnapshots = await prisma.googleDriveContentSnapshot.findMany({
    where: {
      workspaceId: ownerA.workspace.id,
      googleDriveFileId: {
        in: [importedDriveDoc.id, importedDriveSheet.id, importedNestedDriveDoc.id]
      }
    }
  });
  assert.equal(new Set(importedContentSnapshots.map((snapshot) => snapshot.googleDriveFileId)).size, 3);
  assert.ok(importedContentSnapshots.some((snapshot) => snapshot.extractedText?.includes("drive-doc-1 imported content for search")));
  assert.ok(importedContentSnapshots.some((snapshot) => snapshot.extractedText?.includes("Imported sheet | indexed")));
  const importedDriveRoot = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-folder-root"
      }
    }
  });
  assert.equal(importedDriveRoot?.description, "Owner note: contract draft with onboarding context.");
  const googleDriveEvents = await prisma.event.findMany({
    where: {
      workspaceId: ownerA.workspace.id,
      type: "google_drive_import_succeeded"
    }
  });
  assert.ok(googleDriveEvents.length >= 1);

  const originalFetchBeforeGoogleDriveContent = globalThis.fetch;
  const googleDriveCalls: Array<{ path: string; method: string; body?: unknown }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    googleDriveCalls.push({
      path: url.pathname,
      method: init?.method ?? "GET",
      body: init?.body ? (() => {
        try {
          return JSON.parse(String(init.body));
        } catch {
          return String(init.body);
        }
      })() : undefined
    });

    if (url.pathname === "/drive/v3/files" && init?.method === "POST") {
      const body = init?.body ? JSON.parse(String(init.body)) as { mimeType?: string } : {};
      if (body.mimeType === "application/vnd.google-apps.spreadsheet") {
        return new Response(JSON.stringify({
          id: "created-sheet-1",
          name: "Jarvis sheet",
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: ["drive-folder-root"],
          headRevisionId: "sheet-created-rev-1",
          webViewLink: "https://docs.google.com/spreadsheets/d/created-sheet-1"
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        id: "created-doc-1",
        name: "Jarvis doc",
        mimeType: "application/vnd.google-apps.document",
        parents: ["drive-folder-root"],
        headRevisionId: "doc-created-rev-1",
        webViewLink: "https://docs.google.com/document/d/created-doc-1"
      }), { status: 200 });
    }

    if (url.pathname === "/docs.googleapis.com/never") {
      return new Response("{}", { status: 404 });
    }

    if (url.pathname === "/v1/documents/created-doc-1:batchUpdate") {
      return new Response(JSON.stringify({ documentId: "created-doc-1" }), { status: 200 });
    }

    if (url.pathname === "/drive/v3/files/created-doc-1") {
      return new Response(JSON.stringify({
        id: "created-doc-1",
        name: "Jarvis doc",
        mimeType: "application/vnd.google-apps.document",
        parents: ["drive-folder-root"],
        headRevisionId: "doc-created-rev-2",
        webViewLink: "https://docs.google.com/document/d/created-doc-1"
      }), { status: 200 });
    }

    if (url.pathname === "/v1/documents/created-doc-1") {
      return new Response(JSON.stringify({
        body: {
          content: [{
            paragraph: {
              elements: [{
                textRun: {
                  content: "Jarvis can read this Google Doc.\n"
                }
              }]
            }
          }]
        }
      }), { status: 200 });
    }

    if (url.pathname === "/v1/documents/drive-doc-1") {
      return new Response(JSON.stringify({
        body: {
          content: [{
            paragraph: {
              elements: [{
                textRun: {
                  content: "Imported document refreshed for search.\n"
                }
              }]
            }
          }]
        }
      }), { status: 200 });
    }

    if (url.pathname === "/drive/v3/files/created-sheet-1") {
      return new Response(JSON.stringify({
        id: "created-sheet-1",
        name: "Jarvis sheet",
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: ["drive-folder-root"],
        headRevisionId: "sheet-created-rev-1",
        webViewLink: "https://docs.google.com/spreadsheets/d/created-sheet-1"
      }), { status: 200 });
    }

    if (url.pathname === "/v4/spreadsheets/created-sheet-1/values/A1%3AZ100" && init?.method === "PUT") {
      return new Response(JSON.stringify({ updatedRange: "A1:B2" }), { status: 200 });
    }

    if (url.pathname === "/v4/spreadsheets/created-sheet-1/values/A1%3AZ100") {
      return new Response(JSON.stringify({
        range: "A1:Z100",
        values: [["Name", "Value"], ["Jarvis", "ready"]]
      }), { status: 200 });
    }

    if (url.pathname === "/v4/spreadsheets/created-sheet-1/values/A1%3AB2") {
      return new Response(JSON.stringify({
        range: "A1:B2",
        values: [["Name", "Value"], ["Jarvis", "updated"]]
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "not mocked", path: url.pathname }), { status: 404 });
  }) as typeof fetch;

  let createdDocId = "";
  let createdSheetId = "";
  try {
    const createdDoc = await request("/v1/google-drive/docs", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        name: "Jarvis doc",
        parentId: "drive-folder-root",
        initialText: "Jarvis can read this Google Doc.\n"
      })
    });
    assert.equal(createdDoc.status, 201);
    const createdDocBody = createdDoc.body as { data: { file: { id: string; externalId: string }; snapshot: { summary: string } } };
    createdDocId = createdDocBody.data.file.id;
    assert.equal(createdDocBody.data.file.externalId, "created-doc-1");
    assert.ok(createdDocBody.data.snapshot.summary.includes("Jarvis can read"));

    const refreshedImportedDoc = await request(`/v1/google-drive/files/${importedDriveDoc?.id}/content`, {
      headers: authA
    });
    assert.equal(refreshedImportedDoc.status, 200);
    assert.ok((refreshedImportedDoc.body as { data: { extractedText: string } }).data.extractedText.includes("refreshed for search"));

    const updatedDoc = await request(`/v1/google-drive/docs/${createdDocId}`, {
      method: "PATCH",
      headers: authA,
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: "Updated " } }]
      })
    });
    assert.equal(updatedDoc.status, 200);

    const createdSheet = await request("/v1/google-drive/sheets", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        title: "Jarvis sheet",
        parentId: "drive-folder-root",
        range: "A1:Z100",
        values: [["Name", "Value"], ["Jarvis", "ready"]]
      })
    });
    assert.equal(createdSheet.status, 201);
    const createdSheetBody = createdSheet.body as { data: { file: { id: string; externalId: string }; snapshot: { extractedText: string } } };
    createdSheetId = createdSheetBody.data.file.id;
    assert.equal(createdSheetBody.data.file.externalId, "created-sheet-1");
    assert.ok(createdSheetBody.data.snapshot.extractedText.includes("Jarvis | ready"));

    const updatedSheet = await request(`/v1/google-drive/sheets/${createdSheetId}/values`, {
      method: "PUT",
      headers: authA,
      body: JSON.stringify({
        range: "A1:B2",
        values: [["Name", "Value"], ["Jarvis", "updated"]]
      })
    });
    assert.equal(updatedSheet.status, 200);
    assert.ok((updatedSheet.body as { data: { snapshot: { extractedText: string } } }).data.snapshot.extractedText.includes("Jarvis | updated"));
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveContent;
  }

  assert.ok(googleDriveCalls.some((call) => call.path === "/v1/documents/created-doc-1:batchUpdate" && call.method === "POST"));
  assert.ok(googleDriveCalls.some((call) => (
    call.path === "/drive/v3/files"
    && call.method === "POST"
    && (call.body as { mimeType?: string; parents?: string[] }).mimeType === "application/vnd.google-apps.spreadsheet"
    && (call.body as { parents?: string[] }).parents?.[0] === "drive-folder-root"
  )));
  assert.ok(googleDriveCalls.some((call) => call.path === "/v4/spreadsheets/created-sheet-1/values/A1%3AZ100" && call.method === "PUT"));
  const contentSnapshotCount = await prisma.googleDriveContentSnapshot.count({
    where: { workspaceId: ownerA.workspace.id }
  });
  assert.ok(contentSnapshotCount >= 3);

  const listedDriveFiles = await request("/v1/google-drive/files", { headers: authA });
  assert.equal(listedDriveFiles.status, 200);
  assert.ok((listedDriveFiles.body as { data: Array<{ externalId: string; contentSnapshots: unknown[] }> }).data.some((file) => (
    file.externalId === "created-doc-1" && file.contentSnapshots.length === 1
  )));

  const originalFetchBeforeGoogleDriveChanges = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));

    if (url.pathname === "/drive/v3/changes") {
      assert.equal(url.searchParams.get("pageToken"), "changes-token-1");
      return new Response(JSON.stringify({
        changes: [
          {
            fileId: "drive-doc-1",
            file: {
              id: "drive-doc-1",
              name: "Imported Drive doc changed externally",
              mimeType: "application/vnd.google-apps.document",
              parents: ["drive-folder-root"],
              headRevisionId: "drive-doc-rev-change",
              webViewLink: "https://docs.google.com/document/d/drive-doc-1"
            }
          },
          {
            fileId: "drive-sheet-1",
            removed: true
          }
        ],
        newStartPageToken: "changes-token-2"
      }), { status: 200 });
    }

    if (url.pathname === "/v1/documents/drive-doc-1") {
      return new Response(JSON.stringify({
        body: {
          content: [{
            paragraph: {
              elements: [{
                textRun: {
                  content: "External Drive change refreshed into CompanyCore.\n"
                }
              }]
            }
          }]
        }
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "not mocked", path: url.pathname }), { status: 404 });
  }) as typeof fetch;

  try {
    const reconciledDriveChanges = await request("/v1/integration-settings/google_drive/changes/reconcile", {
      method: "POST",
      headers: authA
    });
    assert.equal(reconciledDriveChanges.status, 200);
    const reconciledDriveChangesBody = reconciledDriveChanges.body as {
      data: { processedCount: number; refreshedCount: number; removedCount: number; newStartPageToken: string };
    };
    assert.equal(reconciledDriveChangesBody.data.processedCount, 2);
    assert.equal(reconciledDriveChangesBody.data.refreshedCount, 1);
    assert.equal(reconciledDriveChangesBody.data.removedCount, 1);
    assert.equal(reconciledDriveChangesBody.data.newStartPageToken, "changes-token-2");
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveChanges;
  }

  const changedDriveDoc = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-doc-1"
      }
    }
  });
  assert.equal(changedDriveDoc?.name, "Imported Drive doc changed externally");
  assert.equal(changedDriveDoc?.headRevisionId, "drive-doc-rev-change");

  const removedDriveSheet = await prisma.googleDriveFile.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive",
        externalId: "drive-sheet-1"
      }
    }
  });
  assert.equal(removedDriveSheet?.trashed, true);
  assert.equal(removedDriveSheet?.syncStatus, "removed");

  const updatedGoogleDriveSetting = await prisma.integrationSetting.findUniqueOrThrow({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    }
  });
  assert.equal((updatedGoogleDriveSetting.config as { changesPageToken?: string }).changesPageToken, "changes-token-2");
  const driveInboxCount = await prisma.providerEventInbox.count({
    where: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive"
    }
  });
  assert.equal(driveInboxCount, 2);
  const driveAgentEvents = await prisma.agentEventOutbox.findMany({
    where: {
      workspaceId: ownerA.workspace.id,
      eventType: { in: ["google_drive_file_changed", "google_drive_file_removed"] }
    }
  });
  assert.equal(driveAgentEvents.length, 2);
  const pendingAgentEvents = await request("/v1/agent-events?targetAgent=paperclip", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(pendingAgentEvents.status, 200);
  assert.ok((pendingAgentEvents.body as { data: Array<{ id: string }> }).data.length >= 2);
  const acknowledgedAgentEvent = await request(`/v1/agent-events/${driveAgentEvents[0]!.id}/ack`, {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({ targetAgent: "paperclip" })
  });
  assert.equal(acknowledgedAgentEvent.status, 200);
  assert.equal((acknowledgedAgentEvent.body as { data: { deliveryStatus: string } }).data.deliveryStatus, "delivered");
  const deliveredAgentEvent = await prisma.agentEventOutbox.findUniqueOrThrow({
    where: { id: driveAgentEvents[0]!.id }
  });
  assert.equal(deliveredAgentEvent.deliveryStatus, "delivered");
  assert.ok(deliveredAgentEvent.deliveredAt);

  const settingBeforeBaseline = await prisma.integrationSetting.findUniqueOrThrow({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    }
  });
  const configBeforeBaseline = settingBeforeBaseline.config as Record<string, unknown>;
  const { changesPageToken: _changesPageToken, ...configWithoutChangesToken } = configBeforeBaseline;
  await prisma.integrationSetting.update({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    },
    data: {
      config: configWithoutChangesToken as Prisma.InputJsonObject
    }
  });

  const originalFetchBeforeGoogleDriveBaseline = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));

    if (url.pathname === "/drive/v3/changes/startPageToken") {
      return new Response(JSON.stringify({
        startPageToken: "changes-baseline-token"
      }), { status: 200 });
    }

    if (url.pathname === "/drive/v3/changes") {
      throw new Error("changes.list must not run while initializing the baseline token");
    }

    return new Response(JSON.stringify({ error: "not mocked", path: url.pathname }), { status: 404 });
  }) as typeof fetch;

  try {
    const initializedDriveChangesBaseline = await request("/v1/integration-settings/google_drive/changes/reconcile", {
      method: "POST",
      headers: authA
    });
    assert.equal(initializedDriveChangesBaseline.status, 200);
    const initializedDriveChangesBaselineBody = initializedDriveChangesBaseline.body as {
      data: { processedCount: number; baselineInitialized: boolean; newStartPageToken: string };
    };
    assert.equal(initializedDriveChangesBaselineBody.data.processedCount, 0);
    assert.equal(initializedDriveChangesBaselineBody.data.baselineInitialized, true);
    assert.equal(initializedDriveChangesBaselineBody.data.newStartPageToken, "changes-baseline-token");
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveBaseline;
  }

  const baselineGoogleDriveSetting = await prisma.integrationSetting.findUniqueOrThrow({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    }
  });
  assert.equal((baselineGoogleDriveSetting.config as { changesPageToken?: string }).changesPageToken, "changes-baseline-token");

  const expiredGoogleDriveSettings = await request("/integration-settings/google_drive", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({
      oauth: {
        refreshToken: "google-refresh-token",
        accessToken: "expired-google-access-token",
        expiresAt: "2000-01-01T00:00:00.000Z"
      },
      config: {
        rootFolderIds: ["drive-folder-root"],
        selectedFolderIds: ["drive-folder-root"],
        importMode: "inspect_only",
        changesPageToken: "changes-token-2"
      }
    })
  });
  assert.equal(expiredGoogleDriveSettings.status, 200);

  const originalFetchBeforeGoogleDriveRefresh = globalThis.fetch;
  let oauthRefreshCalled = false;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));

    if (url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token") {
      oauthRefreshCalled = true;
      const body = new URLSearchParams(String(init?.body ?? ""));
      assert.equal(body.get("client_id"), "dev-google-oauth-client-id");
      assert.equal(body.get("client_secret"), "dev-google-oauth-client-secret");
      assert.equal(body.get("grant_type"), "refresh_token");
      assert.equal(body.get("refresh_token"), "google-refresh-token");
      return new Response(JSON.stringify({
        access_token: "refreshed-google-access-token",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/drive.file",
        token_type: "Bearer"
      }), { status: 200 });
    }

    if (url.pathname === "/drive/v3/files") {
      assert.equal(init?.headers ? (init.headers as Record<string, string>).Authorization : undefined, "Bearer refreshed-google-access-token");
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    }

    if (url.pathname === "/drive/v3/files/drive-folder-root") {
      assert.equal(init?.headers ? (init.headers as Record<string, string>).Authorization : undefined, "Bearer refreshed-google-access-token");
      return new Response(JSON.stringify({
        id: "drive-folder-root",
        name: "Drive root folder",
        mimeType: "application/vnd.google-apps.folder"
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "not mocked", path: url.pathname }), { status: 404 });
  }) as typeof fetch;

  try {
    const importWithRefresh = await request("/v1/integration-settings/google_drive/import", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "inspect_only"
      })
    });
    assert.equal(importWithRefresh.status, 200);
    assert.equal((importWithRefresh.body as { data: { itemCount: number } }).data.itemCount, 1);
  } finally {
    globalThis.fetch = originalFetchBeforeGoogleDriveRefresh;
  }
  assert.equal(oauthRefreshCalled, true);
  const refreshedGoogleDriveSettings = await getGoogleDriveSettingsForWorkspace(ownerA.workspace.id);
  assert.equal(refreshedGoogleDriveSettings?.oauth.accessToken, "refreshed-google-access-token");

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
    assert.equal(classifyOperatingAreaKey("Unsorted Inbox"), "main-general");
    assert.equal(classifyOperatingAreaKey("Operations"), "operations-administration");

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

    const mappedListContainer = await prisma.externalContainerMapping.findUnique({
      where: {
        workspaceId_provider_entityType_externalId: {
          workspaceId: ownerA.workspace.id,
          provider: "clickup",
          entityType: "list",
          externalId: "list-1"
        }
      }
    });
    assert.ok(mappedListContainer);
    const listScopeUpdate = await request(`/v1/operating-model/external-mappings/${mappedListContainer.id}/scope`, {
      method: "PATCH",
      headers: authA,
      body: JSON.stringify({ areaId: financeArea.id })
    });
    assert.equal(listScopeUpdate.status, 200);
    const scopedListContainer = await prisma.externalContainerMapping.findUnique({
      where: {
        workspaceId_provider_entityType_externalId: {
          workspaceId: ownerA.workspace.id,
          provider: "clickup",
          entityType: "list",
          externalId: "list-1"
        }
      }
    });
    const scopedListTable = await prisma.operatingTable.findUnique({
      where: {
        workspaceId_source_externalId: {
          workspaceId: ownerA.workspace.id,
          source: "clickup",
          externalId: "list-1"
        }
      }
    });
    assert.equal(scopedListContainer?.areaId, financeArea.id);
    assert.equal((scopedListContainer?.raw as { manualAreaId?: string } | null)?.manualAreaId, financeArea.id);
    assert.equal(scopedListTable?.areaId, financeArea.id);
    assert.equal((scopedListTable?.syncPolicy as { manualAreaId?: string } | null)?.manualAreaId, financeArea.id);

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

  const commentWebhookBody = JSON.stringify({
    webhook_id: "webhook-list-1",
    event: "taskCommentPosted",
    task_id: "clickup-task-live",
    history_items: [
      {
        id: "history-comment-1",
        field: "comment",
        date: "1777777778000",
        parent_id: "list-1",
        user: { id: 123, username: "ClickUp User" },
        comment: {
          id: "clickup-comment-1",
          date: "1777777778000",
          parent: "clickup-task-live",
          comment: [
            { text: "Comment from ClickUp for Jarvis context" }
          ],
          user: { id: 123, username: "ClickUp User" }
        }
      }
    ]
  });
  const commentWebhookSignature = signClickUpWebhookBody("secret-list-1", commentWebhookBody);
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
    const commentWebhook = await request("/v1/webhooks/clickup", {
      method: "POST",
      headers: { "X-Signature": commentWebhookSignature },
      body: commentWebhookBody
    });
    assert.equal(commentWebhook.status, 202);
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const clickUpCommentNote = await prisma.note.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-comment-1"
      }
    }
  });
  assert.equal(clickUpCommentNote?.taskId, liveTask?.id);
  assert.equal(clickUpCommentNote?.content, "Comment from ClickUp for Jarvis context");

  const agentEvents = await request("/v1/agent-events", { headers: authA });
  assert.equal(agentEvents.status, 200);
  const listedAgentEvents = (agentEvents.body as { data: Array<{ id: string; eventType: string }> }).data;
  const statusEvent = listedAgentEvents.find((event) => (
    event.eventType === "task_status_updated_from_clickup"
  ));
  assert.ok(statusEvent);
  assert.ok(listedAgentEvents.some((event) => event.eventType === "task_comment_posted_from_clickup"));

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

  let createCommentPayload: unknown = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/task/clickup-task-live/comment" && init?.method === "POST") {
      createCommentPayload = JSON.parse(String(init.body ?? "{}"));
      return new Response(JSON.stringify({
        id: "clickup-comment-created-from-companycore"
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const outboundNote = await request("/v1/notes", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        taskId: liveTask!.id,
        content: "CompanyCore comment for ClickUp"
      })
    });
    assert.equal(outboundNote.status, 201);
    const outboundNoteBody = outboundNote.body as { data: { externalId: string; source: string } };
    assert.equal(outboundNoteBody.data.externalId, "clickup-comment-created-from-companycore");
    assert.equal(outboundNoteBody.data.source, "clickup");
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }
  assert.deepEqual(createCommentPayload, {
    comment_text: "CompanyCore comment for ClickUp",
    notify_all: false
  });

  const webhookRegistration = await prisma.externalWebhookRegistration.findUniqueOrThrow({
    where: {
      workspaceId_provider_externalId: {
        workspaceId: ownerA.workspace.id,
        provider: "clickup",
        externalId: "webhook-list-1"
      }
    }
  });
  const failedInbox = await prisma.providerEventInbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      provider: "clickup",
      webhookRegistrationId: webhookRegistration.id,
      externalWebhookId: "webhook-list-1",
      eventName: "taskUpdated",
      externalTaskId: "clickup-task-retry",
      idempotencyKey: "webhook-list-1:history-retry-1",
      payloadHash: "retry-hash",
      payload: {
        webhook_id: "webhook-list-1",
        event: "taskUpdated",
        task_id: "clickup-task-retry"
      },
      signatureVerified: true,
      processingStatus: "failed",
      retryCount: 1,
      lastErrorCode: "integration_unavailable"
    }
  });

  const failedProviderEvents = await request("/v1/integration-settings/clickup/events?status=failed", {
    headers: authA
  });
  assert.equal(failedProviderEvents.status, 200);
  assert.ok((failedProviderEvents.body as { data: Array<{ id: string; lastErrorCode: string }> }).data.some((event) => (
    event.id === failedInbox.id && event.lastErrorCode === "integration_unavailable"
  )));

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/task/clickup-task-retry") {
      return new Response(JSON.stringify({
        id: "clickup-task-retry",
        name: "Retried provider event task",
        markdown_description: "Recovered from failed inbox replay",
        status: { status: "to do", type: "open" },
        priority: { priority: "normal" },
        list: { id: "list-1" }
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const retriedProviderEvents = await request("/v1/integration-settings/clickup/events/retry-failed", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        eventIds: [failedInbox.id]
      })
    });
    assert.equal(retriedProviderEvents.status, 200);
    const retryBody = retriedProviderEvents.body as {
      data: { attemptedCount: number; processedCount: number; failedCount: number };
    };
    assert.equal(retryBody.data.attemptedCount, 1);
    assert.equal(retryBody.data.processedCount, 1);
    assert.equal(retryBody.data.failedCount, 0);
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const retriedInbox = await prisma.providerEventInbox.findUniqueOrThrow({
    where: { id: failedInbox.id }
  });
  assert.equal(retriedInbox.processingStatus, "processed");
  assert.equal(retriedInbox.lastErrorCode, null);
  const retriedTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-retry"
      }
    }
  });
  assert.equal(retriedTask?.title, "Retried provider event task");

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/team/team-1/webhook" && !init?.method) {
      return new Response(JSON.stringify({
        webhooks: [
          {
            id: "webhook-list-1",
            events: ["taskStatusUpdated", "taskUpdated"],
            list_id: "list-1",
            health: { status: "active" }
          }
        ]
      }), { status: 200 });
    }

    if (url.pathname === "/api/v2/team/team-1/webhook" && init?.method === "POST") {
      const body = JSON.parse(String(init.body ?? "{}")) as { list_id?: string };
      const listId = body.list_id ?? "workspace";
      return new Response(JSON.stringify({
        webhook: {
          id: `webhook-maintenance-${listId}`,
          events: ["taskStatusUpdated", "taskUpdated"],
          list_id: listId,
          secret: `maintenance-secret-${listId}`,
          health: { status: "active" }
        }
      }), { status: 200 });
    }

    if (url.pathname === "/api/v2/team/team-1/task") {
      return new Response(JSON.stringify({
        tasks: [
          {
            id: "clickup-task-maintenance",
            name: "Maintenance fallback task",
            markdown_description: "Recovered by maintenance pull fallback",
            status: { status: "in progress", type: "custom" },
            priority: { priority: "high" },
            list: { id: "list-1" }
          }
        ],
        last_page: true
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ err: "Not found" }), { status: 404 });
  }) as typeof fetch;

  try {
    const maintenanceRun = await request("/v1/integration-settings/clickup/maintenance/run", {
      method: "POST",
      headers: { "X-API-Key": serviceKey },
      body: JSON.stringify({
        importMode: "merge"
      })
    });
    assert.equal(maintenanceRun.status, 200);
    const maintenanceBody = maintenanceRun.body as {
      data: {
        webhookReconcile: { createdCount: number; existingCount: number };
        retry: { attemptedCount: number };
        sync: { itemCount: number; createdCount: number };
        inboxHealth: { failedAfter: number };
      };
    };
    assert.equal(maintenanceBody.data.webhookReconcile.createdCount, 1);
    assert.equal(maintenanceBody.data.webhookReconcile.existingCount, 1);
    assert.equal(maintenanceBody.data.retry.attemptedCount, 0);
    assert.equal(maintenanceBody.data.sync.itemCount, 1);
    assert.equal(maintenanceBody.data.sync.createdCount, 1);
    assert.equal(maintenanceBody.data.inboxHealth.failedAfter, 0);
  } finally {
    globalThis.fetch = originalFetchBeforeDiscovery;
  }

  const maintenanceTask = await prisma.task.findUnique({
    where: {
      workspaceId_source_externalId: {
        workspaceId: ownerA.workspace.id,
        source: "clickup",
        externalId: "clickup-task-maintenance"
      }
    }
  });
  assert.equal(maintenanceTask?.title, "Maintenance fallback task");

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

    const secondSync = await request("/tasks/sync/clickup/native", {
      method: "POST",
      headers: authA,
      body: JSON.stringify({
        importMode: "merge"
      })
    });
    assert.equal(secondSync.status, 200);
    const secondSyncBody = secondSync.body as {
      data: {
        itemCount: number;
        createdCount: number;
        updatedCount: number;
        skippedCount: number;
      };
    };
    assert.equal(secondSyncBody.data.itemCount, 1);
    assert.equal(secondSyncBody.data.createdCount, 0);
    assert.equal(secondSyncBody.data.updatedCount, 0);
    assert.equal(secondSyncBody.data.skippedCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const clickUpSyncEvents = await prisma.event.findMany({
    where: {
      workspaceId: ownerA.workspace.id,
      source: "clickup",
      type: "task_synced_from_clickup",
      payload: {
        path: ["externalId"],
        equals: "clickup-task-1"
      }
    }
  });
  assert.equal(clickUpSyncEvents.length, 1);

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
    assert.equal(replaceBody.data.deletedCount, 5);
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
  const eventsBData = (eventsB.body as { data: Array<{ workspaceId: string }> }).data;
  assert.ok(eventsBData.every((event) => event.workspaceId === ownerB.workspace.id));
  assert.ok(eventsBData.every((event) => event.workspaceId !== ownerA.workspace.id));
  const eventTypes = (events.body as { data: Array<{ type: string }> }).data.map((event) => event.type);
  assert.ok(eventTypes.includes("task_created"));
  assert.ok(eventTypes.includes("task_list_created"));
  assert.ok(eventTypes.includes("task_list_updated"));
  assert.ok(eventTypes.includes("pipeline_stage_created"));
  assert.ok(eventTypes.includes("pipeline_stage_updated"));
  assert.ok(eventTypes.includes("interaction_created"));
  assert.ok(eventTypes.includes("decision_created"));
  assert.ok(eventTypes.includes("agent_created"));
  assert.ok(eventTypes.includes("workforce_entity_created"));
  assert.ok(eventTypes.includes("workforce_entity_sync_requested"));
  assert.ok(eventTypes.includes("task_synced_from_clickup"));
  assert.ok(eventTypes.includes("sync_succeeded"));
});
