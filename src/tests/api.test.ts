import { protocol } from "../modules/agent-runtime/host-protocol";
const hostProtocolHeaders = { "X-Roost-Host-Protocol": String(protocol.version), "X-Roost-Host-Capabilities": protocol.requiredHostCapabilities.join(",") };
const validHostMetadata = { runnerVersion: "roost-codex-agent-host-v1", protocolVersion: protocol.version, executionMode: "supervised" };
import { strict as assert } from "assert";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AddressInfo } from "net";
import test, { after, before } from "node:test";
import { createApp } from "../app";
import { prisma } from "../db/prisma";
import { signClickUpWebhookBody, verifyClickUpWebhookSignature } from "../integrations/clickup/webhook-signature";
import { getGoogleDriveSettingsForWorkspace } from "../integrations/integration-settings.service";
import { createEvent } from "../modules/events/event.service";
import { classifyOperatingAreaKey } from "../operating-model/catalog";
import { encryptSecret } from "../integrations/secrets";
import { runProductMapProjectionCleanupIfDue } from "../integrations/clickup/clickup.maintenance-scheduler";
import { consumeProjectionAdmission, expectedIdempotencyKey, packetDigest, productMapSchemaVersion, productMapTransportVersion, tryAcquireProjectionWorkspaceLock } from "../modules/product-map/product-map-projection.service";
import { canonicalLifecycleStages, lifecycleOperatingContractSource } from "../modules/company-os/lifecycle-procedure-definition";
import { calculateApplicationReadiness } from "../modules/product-engineering/readiness";
import { env } from "../config/env";

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

function productMapPacket(observedAt: string, offeringId = "roost") {
  return {
    schemaVersion: productMapSchemaVersion,
    observedAt,
    sourceState: "available" as const,
    stale: false,
    conflictState: "none" as const,
    lifecycleProcedure: {
      procedureId: "PROC-SH-APPLICATION-LIFECYCLE" as const,
      procedureVersion: "1.0" as const,
      executionAuthority: "agent_runtime" as const,
      observedAt,
      verifiedAt: observedAt,
      freshness: "current" as const,
      gateResults: canonicalLifecycleStages.map((stage) => ({
        stageKey: stage.stageKey,
        status: "verified" as const,
        summary: `${stage.title} verified.`,
        ownerRole: stage.accountableSourceOwner,
        verifiedAt: observedAt,
        evidenceRefs: [{ kind: "issue" as const, issueIdentifier: "ISSUE-123", label: `${stage.title} evidence` }]
      })),
      evidenceRefs: [{ kind: "issue" as const, issueIdentifier: "ISSUE-123", label: "Lifecycle evidence" }],
      supersession: { status: "active" as const, supersedesVersion: null, supersededByVersion: null },
      source: lifecycleOperatingContractSource
    },
    items: [{
      offeringId,
      executionProjectName: "Roost",
      lifecycleStage: "implementation",
      conflictState: "none" as const,
      sourceControl: {
        branch: "main",
        sourceSha: "a".repeat(40),
        deployedSha: "a".repeat(40),
        versionAlignment: "aligned" as const
      },
      readiness: {
        status: "GO" as const,
        evidenceState: "complete" as const,
        zeroGapButNoGo: false,
        totalGaps: 0,
        nextGate: null
      },
      aggregates: {
        issues: {
          total: 1,
          byStatus: { backlog: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 1, cancelled: 0 }
        }
      }
    }]
  };
}

async function withFixedDate<T>(fixedAt: Date, operation: () => Promise<T>) {
  const realDate = globalThis.Date;
  const fixedTime = fixedAt.getTime();
  globalThis.Date = new Proxy(realDate, {
    construct(target, argumentsList, newTarget) {
      return argumentsList.length === 0
        ? new realDate(fixedTime)
        : Reflect.construct(target, argumentsList, newTarget);
    }
  });
  try {
    return await operation();
  } finally {
    globalThis.Date = realDate;
  }
}

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
  await prisma.$executeRawUnsafe("TRUNCATE task_review_actions, task_review_decisions, agent_credential_operations, api_keys CASCADE");
  await prisma.agentExecutionEvent.deleteMany();
  await prisma.agentExecution.deleteMany();
  await prisma.agentHost.deleteMany();
  await prisma.applicationEvidence.deleteMany();
  await prisma.capabilityObservation.deleteMany();
  await prisma.applicationInterface.deleteMany();
  await prisma.applicationCapabilityDependency.deleteMany();
  await prisma.applicationCapabilityDimension.deleteMany();
  await prisma.applicationFeature.deleteMany();
  await prisma.applicationCapability.deleteMany();
  await prisma.applicationArchitectureComponent.deleteMany();
  await prisma.applicationTechnology.deleteMany();
  await prisma.applicationRepository.deleteMany();
  await prisma.applicationProject.deleteMany();
  await prisma.productOffering.deleteMany();
  await prisma.application.deleteMany();
  await prisma.applicationBlueprintCapability.deleteMany();
  await prisma.applicationBlueprint.deleteMany();
  await prisma.capabilityPackItem.deleteMany();
  await prisma.capabilityPack.deleteMany();
  await prisma.featureDefinition.deleteMany();
  await prisma.capabilityDefinition.deleteMany();
  await prisma.capabilityDomain.deleteMany();
  await prisma.readinessDimensionDefinition.deleteMany();
  await prisma.technologyDefinition.deleteMany();
  await prisma.productMapProjectionAdmission.deleteMany();
  await prisma.productMapProjectionQuarantine.deleteMany();
  await prisma.productMapProjectionReceipt.deleteMany();
  await prisma.productMapProjectionState.deleteMany();
  await prisma.productMapProjectionSnapshot.deleteMany();
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

test("native runtime redaction gates persistence, model input, legacy reads and safe incidents", async () => {
  const owner = await registerOwner("redaction-owner@example.test", "Synthetic redaction workspace"), workspaceId = owner.workspace.id;
  const auth = { Authorization: `Bearer ${owner.token}` };
  const task = await prisma.task.create({ data: { workspaceId, title: "Synthetic runtime task" } });
  const application = await prisma.application.create({ data: { workspaceId, name: "Synthetic redaction app", slug: "redaction-fixture" } });
  const riskProject=await prisma.project.create({data:{workspaceId,name:"Synthetic redaction context"}});
  await prisma.applicationProject.create({data:{applicationId:application.id,projectId:riskProject.id}});
  await prisma.task.update({where:{id:task.id},data:{projectId:riskProject.id}});
  await prepareReadyFixture(workspaceId,task.id,application.id,auth);
  const leaseToken = randomUUID();
  const execution = await prisma.agentExecution.create({ data: { workspaceId, taskId: task.id, applicationId: application.id, requestedByType: "user", status: "claimed", leaseToken, attempt: 1, metadata: await fixtureExecutionMetadata(task.id) } });
  const root = `/v1/agent-runtime/executions/${execution.id}`;
  const post = (url: string, body: any, headers: Record<string, string> = auth) => request(url, { method: "POST", headers, body: JSON.stringify(body) });
  const marker = "SYNTHETIC_private_runtime_9pT4jQ2vL7zR";
  const previousPwd = process.env.PWD; process.env.PWD = "/app";
  process.env.ROOST_REDACTION_TEST_SECRET = marker;
  try {
    const cases = [{ text: marker }, { headers: { cookie: "synthetic-session-value" } }, { email: "synthetic-person@example.test" }, { text: Buffer.from("api_key=synthetic-encoded-value").toString("base64") }];
    for (const payload of cases) {
      const response = await post(root + "/events", { leaseToken, type: "progress", message: "Synthetic progress", payload });
      assert.equal(response.status, 201, JSON.stringify(response.body));
      assert.equal(JSON.stringify(response.body).includes(marker), false);
      assert.ok(JSON.stringify(response.body).includes("[REDACTED]"));
    }
    const count = await prisma.companyRecord.count({ where: { workspaceId, source: "runtime_redaction_v1" } });
    const retries = await Promise.all(Array.from({ length: 4 }, () => post(root + "/events", { leaseToken, type: "progress", message: "Synthetic progress", payload: cases[0] })));
    assert.ok(retries.every(r => r.status === 201));
    assert.equal(await prisma.companyRecord.count({ where: { workspaceId, source: "runtime_redaction_v1" } }), count);
    // Fresh middleware/ALS state on every request reuses durable dedup identity.
    assert.equal((await post(root + "/events", { leaseToken, type: "progress", message: "Synthetic progress", payload: cases[0] })).status, 201);
    assert.equal(await prisma.companyRecord.count({ where: { workspaceId, source: "runtime_redaction_v1" } }), count);
    const host = await prisma.agentHost.create({ data: { workspaceId, name: "Synthetic redaction host", slug: "synthetic-redaction-host", platform: "fixture" } });
    const hostIncidentCount = await prisma.companyRecord.count({ where: { workspaceId, source: "runtime_redaction_v1" } });
    for (let retry = 0; retry < 3; retry++) assert.equal((await post(`/v1/agent-runtime/hosts/${host.id}/heartbeat`, { metadata: { secret: marker } })).status, 200);
    assert.equal(await prisma.companyRecord.count({ where: { workspaceId, source: "runtime_redaction_v1" } }), hostIncidentCount + 1);
    for (const [url, body] of [["/v1/agent-runtime/executions", { taskId: task.id, prompt: marker }], [root + "/checkpoint", { leaseToken, checkpoint: { secret: marker } }]] as const) {
      const blocked = await post(url, body); assert.equal(blocked.status, 409); assert.equal(JSON.stringify(blocked.body).includes(marker), false);
    }
    const unsupported = await request(root + "/events", { method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body: marker });
    assert.equal(unsupported.status, 409);
    const binary = await post(root + "/events", { leaseToken, type: "progress", payload: { mimeType: "application/pdf", content: marker } });
    assert.equal(binary.status, 409);
    await assert.rejects(prisma.agentExecution.update({ where: { id: execution.id }, data: { summary: marker } }), /agent_runtime_content_blocked/);
    await assert.rejects(prisma.agentExecution.update({ where: { id: execution.id }, data: { events: { create: { workspaceId, type: "progress", message: marker } } } }), /agent_runtime_content_blocked/);
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 1);
    assert.equal((await prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } })).checkpointVersion, 0);
    const project = await prisma.project.create({ data: { workspaceId, name: "Synthetic result project" } });
    await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
    const resultTask = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: "Synthetic result evidence" } });
    const fixture = await prepareReadyFixture(workspaceId, resultTask.id, application.id, auth);
    const resultLease = randomUUID();
    const resultExecution = await prisma.agentExecution.create({ data: { workspaceId, taskId: resultTask.id, applicationId: application.id, requestedByType: "user", status: "running", attempt: 1, leaseToken: resultLease, leaseExpiresAt: new Date(Date.now() + 90000), startedAt: new Date(), metadata: { executionContract: fixture.input.contract, readyContextPin: fixture.readiness } } });
    const completed = await post(`/v1/agent-runtime/executions/${resultExecution.id}/actions/complete`, { leaseToken: resultLease, summary: marker, finalResponse: marker, changedFiles: ["password=synthetic-path-value"], verification: { cookie: "synthetic-cookie-value" }, usage: {}, metadata: { email: "synthetic-result@example.test" } });
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    const savedResult = await prisma.agentExecution.findUniqueOrThrow({ where: { id: resultExecution.id } });
    assert.equal(savedResult.summary, "[REDACTED]"); assert.equal(savedResult.finalResponse, "[REDACTED]");
    assert.equal(JSON.stringify(savedResult).includes(marker), false);
    const evidence = await prisma.evidenceRecord.findMany({ where: { workspaceId, entityId: resultTask.id, source: "agent" } });
    assert.ok(evidence.length); assert.equal(JSON.stringify(evidence).includes(marker), false);
    // Synthetic local-only SQL fixture represents history written before this
    // gate. Read protection must not scan or rewrite the stored legacy row.
    const old = await prisma.agentExecutionEvent.create({ data: { workspaceId, executionId: execution.id, type: "legacy_fixture", message: "Before redaction" } });
    await prisma.$executeRaw`UPDATE agent_execution_events SET message = ${marker}, payload = ${JSON.stringify({ personalName: "Synthetic Person" })}::jsonb WHERE id = ${old.id}::uuid`;
    const projected = await request(root, { headers: auth });
    assert.equal(projected.status, 200); assert.equal(JSON.stringify(projected.body).includes(marker), false);
    assert.equal(JSON.stringify(projected.body).includes("Synthetic Person"), false);
    assert.equal((await prisma.agentExecutionEvent.findUniqueOrThrow({ where: { id: old.id } })).message, marker);
    await prisma.task.update({ where: { id: task.id }, data: { description: marker } });
    const model = await request(`/v1/company-intelligence/tasks/${task.id}/agent-context`, { headers: auth });
    assert.equal(model.status, 409); assert.equal(JSON.stringify(model.body).includes(marker), false);
    assert.equal((await post("/v1/agent-runtime/executions", { taskId: task.id, requestId: leaseToken, leaseToken, prompt: marker })).status, 409);
    const incidents = await prisma.companyRecord.findMany({ where: { workspaceId, source: "runtime_redaction_v1" } });
    assert.ok(incidents.length > count);
    for (const incident of incidents) {
      const metadata = incident.metadata as any;
      assert.match(metadata.fingerprint, /^[a-f0-9-]{36}$/); assert.ok(metadata.findings.length);
      assert.equal(JSON.stringify(metadata).includes(marker), false);
      assert.equal(JSON.stringify(metadata).includes(leaseToken), false);
      assert.equal(JSON.stringify(metadata).includes("synthetic-session-value"), false);
      assert.ok(metadata.findings.every((f: any) => Object.keys(f).sort().join() === "category,location"));
    }
    const registry = await request("/v1/company-records?recordType=technical_incident&departmentKey=09-technologia&includeCompanyWide=true", { headers: auth });
    assert.equal(registry.status, 200); assert.equal((registry.body as any).data.length, incidents.length);
    const immutable = await request(`/v1/company-records/${incidents[0]!.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ metadata: { secret: marker } }) });
    assert.equal(immutable.status, 409);
    await assert.rejects(prisma.companyRecord.createMany({ data: [{ workspaceId, recordType: "technical_incident", key: "forged-runtime-incident", title: "Synthetic forged incident", source: "runtime_redaction_v1", metadata: { secret: marker } }] }), /agent_runtime_content_blocked/);
    await assert.rejects(prisma.companyRecord.updateMany({ where: { workspaceId, source: "runtime_redaction_v1" }, data: { description: marker } }), /agent_runtime_content_blocked/);
    const logs: unknown[] = [], original = console.error; console.error = (...args) => { logs.push(args); };
    try { await request(`/v1/agent-runtime/executions/${marker}`, { headers: auth }); } finally { console.error = original; }
    assert.equal(JSON.stringify(logs).includes(marker), false);
  } finally { delete process.env.ROOST_REDACTION_TEST_SECRET; if (previousPwd === undefined) delete process.env.PWD; else process.env.PWD = previousPwd; }
});

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
    const baseUrl = "http://127.0.0.1:" + port;
    const health = await fetch(baseUrl + "/health");
    const ready = await fetch(baseUrl + "/ready");
    const buildInfo = await fetch(baseUrl + "/api/build-info");
    const body = await health.json();
    const readyBody = await ready.json();
    const buildInfoBody = await buildInfo.json();
    server.close();
    console.log(JSON.stringify({
      healthStatus: health.status,
      readyStatus: ready.status,
      buildInfoStatus: buildInfo.status,
      healthBuild: body.build,
      readyBuild: readyBody.build,
      buildInfoBuild: buildInfoBody.build
    }));
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
  const summary = JSON.parse(result.stdout) as {
    healthStatus: number;
    readyStatus: number;
    buildInfoStatus: number;
    healthBuild: { commit: string; image: string };
    readyBuild: { commit: string; image: string };
    buildInfoBuild: { commit: string; image: string };
  };
  assert.equal(summary.healthStatus, 200);
  assert.equal(summary.readyStatus, 200);
  assert.equal(summary.buildInfoStatus, 200);
  assert.deepEqual(summary.healthBuild, summary.readyBuild);
  assert.deepEqual(summary.healthBuild, summary.buildInfoBuild);
  assert.equal(summary.healthBuild.commit, "coolify-source-commit-for-tests");
  assert.equal(summary.healthBuild.image, "backend-companycore-coolify-for-tests");
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
        Origin: "https://roost.example.com"
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
    COMPANYCORE_ALLOWED_ORIGINS: "https://roost.example.com"
  });

  assert.equal(result.exitCode, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  const summary = JSON.parse(result.stdout) as {
    allowedStatus: number;
    allowedOrigin: string | null;
    deniedStatus: number;
    deniedOrigin: string | null;
  };
  assert.equal(summary.allowedStatus, 204);
  assert.equal(summary.allowedOrigin, "https://roost.example.com");
  assert.equal(summary.deniedStatus, 403);
  assert.equal(summary.deniedOrigin, null);
});

test("production recognizes installation-configured web and API domains", async () => {
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
        Origin: "https://roost.example.com"
      }
    });
    const apiRoot = await request({
      method: "GET",
      path: "/",
      headers: {
        Host: "api.roost.example.com"
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
    COMPANYCORE_PUBLIC_WEB_BASE_URL: "https://roost.example.com",
    COMPANYCORE_PUBLIC_API_BASE_URL: "https://api.roost.example.com",
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
  assert.equal(summary.roostCorsOrigin, "https://roost.example.com");
  assert.equal(summary.apiRootStatus, 200);
  assert.equal(summary.apiRootData.service, "companycore");
  assert.equal(summary.apiRootData.web, "https://roost.example.com");
  assert.equal(summary.apiRootData.api, "https://api.roost.example.com");
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

test("task archives stay out of current work and remain explicitly accessible", async () => {
  const owner = await registerOwner("archive-owner@example.test", "Archive scope");
  const other = await registerOwner("archive-other@example.test", "Other archive scope");
  const headers = { Authorization: `Bearer ${owner.token}` };
  const active = await prisma.task.create({ data: { workspaceId: owner.workspace.id, title: "Current invoice sales strategy operation", status: "todo" } });
  const archived = await prisma.task.create({ data: { workspaceId: owner.workspace.id, title: "Archived invoice sales strategy operation", status: "archived", source: "clickup", externalId: "deleted-archive-test" } });
  const foreign = await prisma.task.create({ data: { workspaceId: other.workspace.id, title: "Foreign archive", status: "archived" } });
  for (const [query, expected] of [["", [active.id]], ["?archive=exclude", [active.id]], ["?archive=only", [archived.id]], ["?archive=all", [active.id, archived.id]]] as const) {
    const result = await request(`/v1/tasks${query}`, { headers });
    assert.equal(result.status, 200);
    assert.deepEqual((result.body as any).data.map((row: any) => row.id).sort(), [...expected].sort());
    assert.equal(JSON.stringify(result.body).includes(foreign.id), false);
  }
  assert.equal((await request("/v1/tasks?archive=invalid", { headers })).status, 400);
  assert.equal((await request(`/v1/tasks/${archived.id}`, { headers })).status, 200);
  assert.equal((await request(`/v1/tasks/${foreign.id}`, { headers })).status, 404);
  for (const route of ["/v1/operations/work-items", "/v1/operations/context", "/v1/strategy/context", "/v1/finance/context", "/v1/sales/context", "/v1/relationships/context", "/v1/intake"]) {
    const result = await request(route, { headers });
    assert.equal(result.status, 200, route);
    assert.equal(JSON.stringify(result.body).includes(archived.id), false, route);
  }
  for (const [scope, expected] of [["exclude", [active.id]], ["only", [archived.id]], ["all", [active.id, archived.id]]] as const) {
    const board = await request(`/v1/operations/work-items?archive=${scope}`, { headers });
    assert.equal(board.status, 200);
    assert.deepEqual((board.body as any).data.workItems.map((row: any) => row.task.id).sort(), [...expected].sort());
  }
  const archiveWork = await request("/v1/operations/work-items?status=archived", { headers });
  assert.equal(archiveWork.status, 200);
  assert.ok(JSON.stringify(archiveWork.body).includes(archived.id));
  // An ordinary task archived through the public API disappears on the next read.
  assert.equal((await request(`/v1/tasks/${active.id}`, { method: "DELETE", headers })).status, 200);
  assert.deepEqual((await request("/v1/tasks", { headers })).body, { data: [] });
});

test("account and workspace settings profile contract exposes active owner workspace", async () => {
  const owner = await registerOwner("settings-profile-owner@example.com", "Settings Profile Workspace");
  const headers = { Authorization: `Bearer ${owner.token}` };

  const profile = await request("/v1/auth/me", { headers });
  assert.equal(profile.status, 200);
  const profileBody = profile.body as {
    data: {
      authType: string;
      userId: string;
      workspaceId: string;
      workspaces: Array<{
        id: string;
        name: string;
        logo: string | null;
        accentColor: string | null;
        role: string;
        active: boolean;
      }>;
    };
  };

  assert.equal(profileBody.data.authType, "user");
  assert.ok(profileBody.data.userId);
  assert.equal(profileBody.data.workspaceId, owner.workspace.id);
  assert.equal((profile.body as { data: { user: { email: string; name: string } } }).data.user.email, "settings-profile-owner@example.com");
  assert.equal((profile.body as { data: { user: { email: string; name: string } } }).data.user.name, "Test Owner");
  assert.equal(profileBody.data.workspaces.length, 1);
  assert.deepEqual(profileBody.data.workspaces[0], {
    id: owner.workspace.id,
    name: "Settings Profile Workspace",
    logo: null,
    accentColor: null,
    role: "owner",
    active: true
  });

  const legacyProfile = await request("/auth/me", { headers });
  assert.equal(legacyProfile.status, 200);
  const legacyProfileBody = legacyProfile.body as {
    data: {
      workspaceId: string;
      workspaces: Array<{ id: string; name: string; role: string; active: boolean }>;
    };
  };
  assert.equal(legacyProfileBody.data.workspaceId, profileBody.data.workspaceId);
  assert.deepEqual(legacyProfileBody.data.workspaces, profileBody.data.workspaces);
});

test("company operating graph keeps records canonical, contextual, evidenced, and agent-readable", async () => {
  const owner = await registerOwner("company-graph-owner@example.com", "Company Graph Workspace");
  const headers = { Authorization: `Bearer ${owner.token}`, "Content-Type": "application/json" };

  const departments = await request("/v1/departments", { headers });
  assert.equal(departments.status, 200);
  const departmentBody = departments.body as { data: { departments: Array<{ key: string }>; availableViews: Array<{ id: string; availableInDepartments: string[] }> } };
  assert.equal(departmentBody.data.departments.length, 13);
  assert.ok(departmentBody.data.availableViews.some((view) => view.id === "product.requirements" && view.availableInDepartments.includes("11-innowacje")));
  assert.ok(departmentBody.data.availableViews.some((view) => view.id === "assets.resources" && view.availableInDepartments.includes("09-technologia")));
  assert.ok(departmentBody.data.availableViews.some((view) => view.id === "management.risks" && view.availableInDepartments.includes("10-prawo")));

  const created = await request("/v1/company-records", {
    method: "POST", headers, body: JSON.stringify({
      recordType: "requirement", title: "Shared audit trail", businessPurpose: "Make execution verifiable",
      desiredState: "Every completion has verified evidence", expectedBehavior: "Agents refuse unsupported completion claims",
      acceptanceCriteria: ["Verified evidence is attached"], functionalState: "expected", implementationCoverage: 35,
      organizationalContext: { ownerDepartmentKey: "02-produkt", relatedDepartmentKeys: ["11-innowacje"], applicableDepartmentKeys: [], scopes: [{ type: "company" }] }
    })
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const record = (created.body as { data: { id: string; organizationalContext: { ownerDepartment: { key: string } } } }).data;
  assert.equal(record.organizationalContext.ownerDepartment.key, "02-produkt");

  const productRecords = await request("/v1/company-records?recordType=requirement&departmentKey=02-produkt", { headers });
  const innovationRecords = await request("/v1/company-records?recordType=requirement&departmentKey=11-innowacje", { headers });
  assert.ok((productRecords.body as { data: Array<{ id: string }> }).data.some((item) => item.id === record.id));
  assert.ok((innovationRecords.body as { data: Array<{ id: string }> }).data.some((item) => item.id === record.id));

  const second = await request("/v1/company-records", { method: "POST", headers, body: JSON.stringify({ recordType: "deliverable", title: "Evidence gate", organizationalContext: { ownerDepartmentKey: "09-technologia", relatedDepartmentKeys: [], applicableDepartmentKeys: [], scopes: [] } }) });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  const secondId = (second.body as { data: { id: string } }).data.id;
  const relation = await request("/v1/entity-relations", { method: "POST", headers, body: JSON.stringify({ dependencyType: "implements", from: { entityType: "company_record", entityId: secondId }, to: { entityType: "requirement", entityId: record.id } }) });
  assert.equal(relation.status, 201, JSON.stringify(relation.body));

  const evidence = await request("/v1/evidence", { method: "POST", headers, body: JSON.stringify({ entityType: "requirement", entityId: record.id, type: "test", source: "agent", reference: "api:test:company-operating-graph", confidence: 95 }) });
  assert.equal(evidence.status, 201, JSON.stringify(evidence.body));
  const evidenceId = (evidence.body as { data: { id: string } }).data.id;
  const verified = await request(`/v1/evidence/${evidenceId}/verification`, { method: "POST", headers, body: JSON.stringify({ status: "verified", verifiedByType: "system", verifiedById: "api-test" }) });
  assert.equal((verified.body as { data: { verificationStatus: string } }).data.verificationStatus, "verified");

  const createdTask = await request("/v1/tasks", { method: "POST", headers, body: JSON.stringify({ title: "Implement evidence gate", status: "todo", organizationalContext: { ownerDepartmentKey: "09-technologia", relatedDepartmentKeys: ["11-innowacje"], applicableDepartmentKeys: [], scopes: [] } }) });
  assert.equal(createdTask.status, 201, JSON.stringify(createdTask.body));
  const task = (createdTask.body as { data: { id: string } }).data;
  const companyWideFinanceTask = await request("/v1/tasks", { method: "POST", headers, body: JSON.stringify({ title: "Finance-wide company notice", status: "todo", organizationalContext: { ownerDepartmentKey: "07-finanse", relatedDepartmentKeys: [], applicableDepartmentKeys: [], scopes: [{ type: "company" }] } }) });
  assert.equal(companyWideFinanceTask.status, 201, JSON.stringify(companyWideFinanceTask.body));
  const companyWideFinanceTaskId = (companyWideFinanceTask.body as { data: { id: string } }).data.id;
  const technologyTasks = await request("/v1/tasks?departmentKey=09-technologia", { headers });
  const innovationTasks = await request("/v1/tasks?departmentKey=11-innowacje", { headers });
  assert.ok((technologyTasks.body as { data: Array<{ id: string }> }).data.some((item) => item.id === task.id));
  assert.ok((innovationTasks.body as { data: Array<{ id: string }> }).data.some((item) => item.id === task.id));

  const createdProject = await request("/v1/projects", { method: "POST", headers, body: JSON.stringify({ name: "Shared application project", organizationalContext: { ownerDepartmentKey: "11-innowacje", relatedDepartmentKeys: ["09-technologia"], applicableDepartmentKeys: [], scopes: [{ type: "company" }] } }) });
  assert.equal(createdProject.status, 201, JSON.stringify(createdProject.body));
  const projectId = (createdProject.body as { data: { id: string } }).data.id;
  const technologyProjects = await request("/v1/projects?departmentKey=09-technologia", { headers });
  assert.ok((technologyProjects.body as { data: Array<{ id: string }> }).data.some((item) => item.id === projectId));

  const createdTaskList = await request("/v1/task-lists", { method: "POST", headers, body: JSON.stringify({ name: "Shared engineering execution", projectId, organizationalContext: { ownerDepartmentKey: "09-technologia", relatedDepartmentKeys: ["11-innowacje"], applicableDepartmentKeys: [], scopes: [] } }) });
  assert.equal(createdTaskList.status, 201, JSON.stringify(createdTaskList.body));
  const taskListId = (createdTaskList.body as { data: { id: string } }).data.id;
  const innovationTaskLists = await request("/v1/task-lists?departmentKey=11-innowacje", { headers });
  assert.ok((innovationTaskLists.body as { data: Array<{ id: string }> }).data.some((item) => item.id === taskListId));
  const projectTaskResponse = await request("/v1/tasks", { method: "POST", headers, body: JSON.stringify({ title: "Verify the shared project workspace", status: "in_progress", projectId, taskListId, organizationalContext: { ownerDepartmentKey: "11-innowacje", relatedDepartmentKeys: ["09-technologia"], applicableDepartmentKeys: [], scopes: [] } }) });
  assert.equal(projectTaskResponse.status, 201, JSON.stringify(projectTaskResponse.body));
  const projectTaskId = (projectTaskResponse.body as { data: { id: string } }).data.id;
  const mappedOperationsArea = await prisma.operatingArea.findFirstOrThrow({ where: { workspaceId: owner.workspace.id, key: "operations-administration" } });
  const mappedClickUpList = await prisma.taskList.create({ data: { workspaceId: owner.workspace.id, name: "Mapped ClickUp operations", source: "clickup", externalId: "mapped-operations-list" } });
  await prisma.externalContainerMapping.create({ data: { workspaceId: owner.workspace.id, provider: "clickup", entityType: "list", externalId: "mapped-operations-list", name: "Mapped ClickUp operations", areaId: mappedOperationsArea.id, raw: { manualDepartmentKey: "04-operacje" } } });
  const mappedClickUpTask = await prisma.task.create({ data: { workspaceId: owner.workspace.id, taskListId: mappedClickUpList.id, title: "Imported mapped operation", status: "todo", source: "clickup", externalId: "mapped-operation-task" } });
  const mappedOperationsTasks = await request("/v1/tasks?departmentKey=04-operacje&includeCompanyWide=false", { headers });
  assert.ok((mappedOperationsTasks.body as { data: Array<{ id: string }> }).data.some((item) => item.id === mappedClickUpTask.id), "provider-mapped tasks must appear in their department context without duplicate manual assignment");

  const createdProcedure = await request("/v1/process-core/procedures", { method: "POST", headers, body: JSON.stringify({ name: "Shared production verification", purpose: "Verify releases before declaring completion", expectedResult: "Verified runtime evidence", steps: [{ instruction: "Run the approved verification suite", stepType: "manual" }], organizationalContext: { ownerDepartmentKey: "04-operacje", relatedDepartmentKeys: [], applicableDepartmentKeys: ["09-technologia", "11-innowacje"], scopes: [] } }) });
  assert.equal(createdProcedure.status, 201, JSON.stringify(createdProcedure.body));
  const procedureId = (createdProcedure.body as { data: { id: string } }).data.id;
  const technologyProcedures = await request("/v1/process-core/procedures?departmentKey=09-technologia", { headers });
  assert.ok((technologyProcedures.body as { data: Array<{ id: string }> }).data.some((item) => item.id === procedureId));

  const sharedContext = { ownerDepartmentKey: "09-technologia", relatedDepartmentKeys: ["11-innowacje"], applicableDepartmentKeys: ["04-operacje"], scopes: [{ type: "company" }] };
  const resourceResponse = await request("/v1/company-objects/resource", { method: "POST", headers, body: JSON.stringify({ name: "Shared runtime repository", type: "repository", url: "https://example.test/repository", accessLevel: "workspace", metadata: { environment: "production" }, organizationalContext: sharedContext }) });
  assert.equal(resourceResponse.status, 201, JSON.stringify(resourceResponse.body));
  const resourceId = (resourceResponse.body as { data: { id: string } }).data.id;
  const riskResponse = await request("/v1/company-objects/risk", { method: "POST", headers, body: JSON.stringify({ name: "Runtime drift", category: "technology", riskLevel: "high", likelihood: "possible", impact: "Incorrect production behaviour", organizationalContext: sharedContext }) });
  assert.equal(riskResponse.status, 201, JSON.stringify(riskResponse.body));
  const riskId = (riskResponse.body as { data: { id: string } }).data.id;
  const metricResponse = await request("/v1/company-objects/metric", { method: "POST", headers, body: JSON.stringify({ name: "Verified requirement coverage", category: "quality", measurementType: "percentage", unit: "%", currentValue: 35, targetValue: 100, organizationalContext: sharedContext }) });
  assert.equal(metricResponse.status, 201, JSON.stringify(metricResponse.body));
  const policyResponse = await request("/v1/company-objects/policy", { method: "POST", headers, body: JSON.stringify({ name: "Verified completion only", appliesTo: "company", ruleType: "evidence_guardrail", severity: "critical", enforcementMode: "require_approval", organizationalContext: sharedContext }) });
  assert.equal(policyResponse.status, 201, JSON.stringify(policyResponse.body));
  const policyId = (policyResponse.body as { data: { id: string } }).data.id;

  for (const [type, id] of [["resource", resourceId], ["risk", riskId], ["metric", (metricResponse.body as { data: { id: string } }).data.id], ["policy", policyId]]) {
    const contextual = await request(`/v1/company-objects/${type}?departmentKey=11-innowacje`, { headers });
    assert.ok((contextual.body as { data: Array<{ id: string }> }).data.some((item) => item.id === id), `${type} missing from related department`);
  }
  const updatedMetric = await request(`/v1/company-objects/metric/${(metricResponse.body as { data: { id: string } }).data.id}`, { method: "PATCH", headers, body: JSON.stringify({ currentValue: 61 }) });
  assert.equal((updatedMetric.body as { data: { currentValue: number } }).data.currentValue, 61);

  const riskRelation = await request("/v1/entity-relations", { method: "POST", headers, body: JSON.stringify({ dependencyType: "affects", from: { entityType: "risk", entityId: riskId }, to: { entityType: "resource", entityId: resourceId } }) });
  assert.equal(riskRelation.status, 201, JSON.stringify(riskRelation.body));
  const projectRiskRelation = await request("/v1/entity-relations", { method: "POST", headers, body: JSON.stringify({ dependencyType: "affects", from: { entityType: "risk", entityId: riskId }, to: { entityType: "project", entityId: projectId } }) });
  assert.equal(projectRiskRelation.status, 201, JSON.stringify(projectRiskRelation.body));
  const projectWorkspace = await request(`/v1/projects/${projectId}/workspace`, { headers });
  assert.equal(projectWorkspace.status, 200, JSON.stringify(projectWorkspace.body));
  const projectWorkspaceData = (projectWorkspace.body as { data: { schemaVersion: string; organizationalContext: { ownerDepartment: { key: string } }; delivery: { taskLists: Array<{ id: string }>; tasks: Array<{ id: string }> }; risks: Array<{ id: string }>; relations: Array<{ dependencyType: string }> } }).data;
  assert.equal(projectWorkspaceData.schemaVersion, "project-workspace-v1");
  assert.equal(projectWorkspaceData.organizationalContext.ownerDepartment.key, "11-innowacje");
  assert.ok(projectWorkspaceData.delivery.taskLists.some((item) => item.id === taskListId));
  assert.ok(projectWorkspaceData.delivery.tasks.some((item) => item.id === projectTaskId));
  assert.ok(projectWorkspaceData.risks.some((item) => item.id === riskId));
  assert.ok(projectWorkspaceData.relations.some((item) => item.dependencyType === "affects"));
  const resourceEntity = await request(`/v1/company-intelligence/entities/resource/${resourceId}`, { headers });
  assert.equal(resourceEntity.status, 200);
  assert.ok((resourceEntity.body as { data: { relations: Array<{ dependencyType: string }> } }).data.relations.some((item) => item.dependencyType === "affects"));
  const technologySearch = await request("/v1/company-intelligence/search?q=Shared%20runtime&departmentKey=09-technologia", { headers });
  assert.ok((technologySearch.body as { data: Array<{ id: string }> }).data.some((item) => item.id === resourceId));
  const financeSearch = await request("/v1/company-intelligence/search?q=Shared%20runtime&departmentKey=07-finanse", { headers });
  assert.ok((financeSearch.body as { data: Array<{ id: string }> }).data.some((item) => item.id === resourceId), "company-wide resource should remain visible in department-filtered search");
  const isolatedSearch = await request("/v1/company-intelligence/search?q=Evidence%20gate&departmentKey=07-finanse", { headers });
  assert.ok(!(isolatedSearch.body as { data: Array<{ id: string }> }).data.some((item) => item.id === secondId), "department-only record must not leak into unrelated search scope");

  const driveFile = await prisma.googleDriveFile.create({ data: { workspaceId: owner.workspace.id, externalId: "shared-architecture-file", name: "Shared Authentication Architecture", mimeType: "text/markdown", description: "Canonical architecture evidence" } });
  const fileContext = await request(`/v1/organizational-context/file/${driveFile.id}`, { method: "PATCH", headers, body: JSON.stringify({ ownerDepartmentKey: "09-technologia", relatedDepartmentKeys: ["11-innowacje"], applicableDepartmentKeys: [], scopes: [] }) });
  assert.equal(fileContext.status, 200, JSON.stringify(fileContext.body));
  const fileEntity = await request(`/v1/company-intelligence/entities/file/${driveFile.id}`, { headers });
  assert.equal(fileEntity.status, 200);
  const technologyFiles = await request("/v1/assets/context?areaKey=all&limit=50&departmentKey=09-technologia", { headers });
  assert.ok((technologyFiles.body as { data: { resources: Array<{ sourceId: string }> } }).data.resources.some((item) => item.sourceId === driveFile.id), "department-scoped Assets must include assigned files");
  const financeFile = await prisma.googleDriveFile.create({ data: { workspaceId: owner.workspace.id, externalId: "finance-company-file", name: "Finance Company Notice", mimeType: "text/markdown" } });
  await request(`/v1/organizational-context/file/${financeFile.id}`, { method: "PATCH", headers, body: JSON.stringify({ ownerDepartmentKey: "07-finanse", relatedDepartmentKeys: [], applicableDepartmentKeys: [], scopes: [{ type: "company" }] }) });
  const strictTechnologyFiles = await request("/v1/assets/context?areaKey=all&limit=50&departmentKey=09-technologia&includeCompanyWide=false", { headers });
  const strictTechnologyFileIds = (strictTechnologyFiles.body as { data: { resources: Array<{ sourceId: string }> } }).data.resources.map((item) => item.sourceId);
  assert.ok(strictTechnologyFileIds.includes(driveFile.id), "strict department Assets must retain directly assigned files");
  assert.ok(!strictTechnologyFileIds.includes(financeFile.id), "strict department Assets must exclude unrelated company-wide files");

  const technologyOperations = await request("/v1/operations/work-items?limit=50&departmentKey=09-technologia&includeCompanyWide=false", { headers });
  assert.equal(technologyOperations.status, 200, JSON.stringify(technologyOperations.body));
  const technologyWorkItemIds = (technologyOperations.body as { data: { workItems: Array<{ task: { id: string } }> } }).data.workItems.map((item) => item.task.id);
  assert.ok(technologyWorkItemIds.includes(task.id), "central Operations must retain the incoming department scope");
  assert.ok(!technologyWorkItemIds.includes(companyWideFinanceTaskId), "strict Operations scope must exclude unrelated company-wide tasks");

  const taskContext = await request(`/v1/company-intelligence/tasks/${task.id}/agent-context`, { headers });
  assert.equal(taskContext.status, 200);
  assert.equal((taskContext.body as { data: { schemaVersion: string; constraints: { sourceOfTruth: string } } }).data.schemaVersion, "task-agent-execution-context-v1");
  assert.equal((taskContext.body as { data: { constraints: { sourceOfTruth: string } } }).data.constraints.sourceOfTruth, "roost");
  assert.ok(Array.isArray((taskContext.body as { data: { risks: unknown[] } }).data.risks));
  assert.ok(Array.isArray((taskContext.body as { data: { incidents: unknown[] } }).data.incidents));
  assert.ok(Array.isArray((taskContext.body as { data: { escalationRules: { records: unknown[] } } }).data.escalationRules.records));

  const graph = await request("/v1/company-intelligence/graph", { headers });
  assert.equal(graph.status, 200);
  const graphBody = graph.body as { data: {
    schemaVersion: string;
    rootNodeId: string;
    nodes: Array<{ id: string; entityType: string }>;
    edges: Array<{ type: string; source: string; from: { entityId: string }; to: { entityId: string } }>;
    summary: { recordCount: number; contextualizedRecordCount: number; unassignedRecordCount: number; unrootedComponentCount: number; relationshipCoverage: number };
  } };
  assert.equal(graphBody.data.schemaVersion, "company-graph-v2");
  assert.ok(graphBody.data.nodes.some((node) => node.id === graphBody.data.rootNodeId && node.entityType === "workspace"));
  assert.equal(graphBody.data.nodes.filter((node) => node.entityType === "department").length, 13);
  assert.ok(graphBody.data.nodes.some((node) => node.id === record.id));
  assert.ok(graphBody.data.nodes.some((node) => node.id === resourceId));
  assert.ok(graphBody.data.nodes.some((node) => node.id === driveFile.id));
  assert.ok(graphBody.data.edges.some((edge) => edge.type === "implements"));
  assert.ok(graphBody.data.edges.some((edge) => edge.source === "structural" && edge.type === "owns" && edge.to.entityId === record.id));
  assert.ok(graphBody.data.edges.some((edge) => edge.source === "structural" && edge.type === "contains" && edge.to.entityId === taskListId));
  assert.ok(graphBody.data.edges.some((edge) => edge.source === "structural" && edge.type === "contains" && edge.from.entityId === taskListId && edge.to.entityId === projectTaskId));
  assert.ok(graphBody.data.edges.some((edge) => edge.source === "derived" && edge.type === "mapped_to" && edge.to.entityId === mappedClickUpList.id));
  assert.ok(graphBody.data.summary.recordCount >= graphBody.data.summary.contextualizedRecordCount);
  assert.ok(graphBody.data.summary.relationshipCoverage >= 0 && graphBody.data.summary.relationshipCoverage <= 100);
  const graphNeighbours = new Map<string, string[]>();
  graphBody.data.edges.forEach((edge) => {
    graphNeighbours.set(edge.from.entityId, [...(graphNeighbours.get(edge.from.entityId) ?? []), edge.to.entityId]);
    graphNeighbours.set(edge.to.entityId, [...(graphNeighbours.get(edge.to.entityId) ?? []), edge.from.entityId]);
  });
  const reachableGraphNodeIds = new Set<string>();
  const graphFrontier = [graphBody.data.rootNodeId];
  while (graphFrontier.length) {
    const current = graphFrontier.shift()!;
    if (reachableGraphNodeIds.has(current)) continue;
    reachableGraphNodeIds.add(current);
    graphFrontier.push(...(graphNeighbours.get(current) ?? []).filter((id) => !reachableGraphNodeIds.has(id)));
  }
  assert.ok(graphBody.data.nodes.every((node) => reachableGraphNodeIds.has(node.id)), "every whole-company graph node must be reachable from the workspace root");
  const health = await request("/v1/company-intelligence/health", { headers });
  assert.equal(health.status, 200);
  assert.ok(Number((health.body as { data: { score: number } }).data.score) >= 0);
});

test("owner can update account identity and password with current-password verification", async () => {
  const owner = await registerOwner("account-actions-owner@example.com", "Account Actions Workspace");
  const headers = { Authorization: `Bearer ${owner.token}` };

  const wrongEmailConfirmation = await request("/v1/auth/me", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ email: "account-actions-updated@example.com", currentPassword: "wrong-password" })
  });
  assert.equal(wrongEmailConfirmation.status, 400);
  assert.equal((wrongEmailConfirmation.body as { error: string }).error, "current_password_invalid");

  const updatedProfile = await request("/v1/auth/me", {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: "Updated Owner",
      avatar: "icon:ph-bird",
      email: "account-actions-updated@example.com",
      currentPassword: "very-strong-password"
    })
  });
  assert.equal(updatedProfile.status, 200);
  assert.equal((updatedProfile.body as { data: { name: string; email: string } }).data.name, "Updated Owner");
  assert.equal((updatedProfile.body as { data: { name: string; email: string; avatar: string } }).data.email, "account-actions-updated@example.com");
  assert.equal((updatedProfile.body as { data: { avatar: string } }).data.avatar, "icon:ph-bird");

  const workforceIdentity = await prisma.workforceEntity.findFirst({
    where: { workspaceId: owner.workspace.id, source: "user" }
  });
  assert.equal(workforceIdentity?.name, "Updated Owner");
  assert.equal(workforceIdentity?.avatar, "icon:ph-bird");

  const wrongPassword = await request("/v1/auth/password", {
    method: "POST",
    headers,
    body: JSON.stringify({ currentPassword: "wrong-password", newPassword: "another-strong-password" })
  });
  assert.equal(wrongPassword.status, 400);
  assert.equal((wrongPassword.body as { error: string }).error, "current_password_invalid");

  const changedPassword = await request("/v1/auth/password", {
    method: "POST",
    headers,
    body: JSON.stringify({ currentPassword: "very-strong-password", newPassword: "another-strong-password" })
  });
  assert.equal(changedPassword.status, 200);

  const oldLogin = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "account-actions-updated@example.com", password: "very-strong-password" })
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "account-actions-updated@example.com", password: "another-strong-password" })
  });
  assert.equal(newLogin.status, 200);
});

test("workspace owner can update scoped workspace identity", async () => {
  const owner = await registerOwner("workspace-identity-owner@example.com", "Workspace Identity");
  const outsider = await registerOwner("workspace-identity-outsider@example.com", "Other Workspace");
  const headers = { Authorization: `Bearer ${owner.token}` };

  const updated = await request(`/v1/workspaces/${owner.workspace.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name: "Example Company Studio", logo: "icon:ph-bird", accentColor: "#06B6D4" })
  });
  assert.equal(updated.status, 200);
  const updatedWorkspace = (updated.body as { data: { name: string; logo: string; accentColor: string } }).data;
  assert.equal(updatedWorkspace.name, "Example Company Studio");
  assert.equal(updatedWorkspace.logo, "icon:ph-bird");
  assert.equal(updatedWorkspace.accentColor, "#06B6D4");

  const profile = await request("/v1/auth/me", { headers });
  const workspace = (profile.body as { data: { workspaces: Array<{ name: string; logo: string; accentColor: string }> } }).data.workspaces[0];
  assert.equal(workspace.name, "Example Company Studio");
  assert.equal(workspace.logo, "icon:ph-bird");
  assert.equal(workspace.accentColor, "#06B6D4");

  const foreignUpdate = await request(`/v1/workspaces/${owner.workspace.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${outsider.token}` },
    body: JSON.stringify({ name: "Must not update" })
  });
  assert.equal(foreignUpdate.status, 404);
});

test("product engineering keeps definitions shared, observations explicit, and procedures versioned", async () => {
  const readinessInput = [
    {
      id: "required-capability",
      applicability: "required" as const,
      observedState: "partial" as const,
      dimensionKey: "engineering",
      dimensionName: "Engineering",
      dimensionWeight: 100,
      dimensions: [{ applicability: "required" as const, observedState: "complete" as const }],
      evidence: [{ verificationStatus: "verified" as const }],
      blockedBy: [{ id: "missing-dependency", observedState: "missing" as const, required: true }]
    },
    {
      id: "excluded-capability",
      applicability: "not_applicable" as const,
      observedState: "missing" as const,
      dimensionKey: "engineering",
      dimensionName: "Engineering",
      dimensionWeight: 100,
      dimensions: [],
      evidence: [],
      blockedBy: []
    }
  ];
  const deterministicReadiness = calculateApplicationReadiness(readinessInput);
  assert.deepEqual(deterministicReadiness, calculateApplicationReadiness(readinessInput));
  assert.equal(deterministicReadiness.dimensions[0]?.applicableCapabilities, 1);
  assert.equal(deterministicReadiness.blockers[0]?.blockedByCapabilityId, "missing-dependency");
  assert.ok(deterministicReadiness.overall > 0 && deterministicReadiness.overall < 100);

  const owner = await registerOwner("product-engineering-owner@example.com", "Product Engineering Workspace");
  const otherOwner = await registerOwner("product-engineering-other@example.com", "Other Product Workspace");
  const auth = { Authorization: `Bearer ${owner.token}` };

  const dimensionResponse = await request("/v1/product-engineering/readiness-dimensions", {
    method: "POST", headers: auth, body: JSON.stringify({ key: "security", name: "Security" })
  });
  assert.equal(dimensionResponse.status, 201);
  const dimensionId = (dimensionResponse.body as { data: { id: string } }).data.id;
  const domainResponse = await request("/v1/product-engineering/capability-domains", {
    method: "POST", headers: auth, body: JSON.stringify({ key: "identity", name: "Identity" })
  });
  assert.equal(domainResponse.status, 201);
  const domainId = (domainResponse.body as { data: { id: string } }).data.id;
  const definitionResponse = await request("/v1/product-engineering/capability-definitions", {
    method: "POST", headers: auth, body: JSON.stringify({ domainId, readinessDimensionId: dimensionId, key: "authentication", name: "Authentication", universal: true, defaultApplicability: "required" })
  });
  assert.equal(definitionResponse.status, 201);
  const definitionId = (definitionResponse.body as { data: { id: string } }).data.id;
  const featureDefinitionResponse = await request(`/v1/product-engineering/capability-definitions/${definitionId}/features`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ key: "email-password", name: "Email and password" })
  });
  assert.equal(featureDefinitionResponse.status, 201);
  const featureDefinitionId = (featureDefinitionResponse.body as { data: { id: string } }).data.id;

  async function createApplication(name: string, slug: string) {
    const response = await request("/v1/product-engineering/applications", { method: "POST", headers: auth, body: JSON.stringify({ name, slug, targetPlatforms: ["web", "api"] }) });
    assert.equal(response.status, 201);
    return (response.body as { data: { id: string } }).data.id;
  }
  const roostId = await createApplication("Roost Test", "roost-test");
  const soarId = await createApplication("DemoApp Test", "demoapp-test");
  const assignments: string[] = [];
  for (const applicationId of [roostId, soarId]) {
    const response = await request(`/v1/product-engineering/applications/${applicationId}/capabilities`, { method: "POST", headers: auth, body: JSON.stringify({ capabilityDefinitionId: definitionId, applicability: "required", targetState: "complete" }) });
    assert.equal(response.status, 201);
    assignments.push((response.body as { data: { id: string } }).data.id);
  }
  assert.notEqual(assignments[0], assignments[1]);
  assert.equal(await prisma.capabilityDefinition.count({ where: { id: definitionId } }), 1);

  const featureAssignment = await request(`/v1/product-engineering/applications/${roostId}/features`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      applicationCapabilityId: assignments[0],
      featureDefinitionId,
      applicability: "required",
      targetState: "complete"
    })
  });
  assert.equal(featureAssignment.status, 201);
  const invalidDependency = await request(`/v1/product-engineering/applications/${roostId}/dependencies`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ fromCapabilityId: assignments[0], toCapabilityId: assignments[1], required: true })
  });
  assert.equal(invalidDependency.status, 404, "dependencies may not cross application boundaries");

  const evidenceResponse = await request(`/v1/product-engineering/applications/${roostId}/evidence`, { method: "POST", headers: auth, body: JSON.stringify({ applicationCapabilityId: assignments[0], type: "test", reference: "tests/auth.e2e.spec.ts", source: "human" }) });
  assert.equal(evidenceResponse.status, 201);
  const evidenceId = (evidenceResponse.body as { data: { id: string } }).data.id;
  const verifyResponse = await request(`/v1/product-engineering/evidence/${evidenceId}/actions/verify`, { method: "POST", headers: auth, body: JSON.stringify({ status: "verified" }) });
  assert.equal(verifyResponse.status, 200);
  assert.equal((await prisma.applicationCapability.findUnique({ where: { id: assignments[0] } }))?.observedState, "unknown", "evidence verification must not silently promote observed state");

  const observationResponse = await request(`/v1/product-engineering/applications/${roostId}/observations`, { method: "POST", headers: auth, body: JSON.stringify({ applicationCapabilityId: assignments[0], observedState: "partial", summary: "Backend exists; MFA is missing.", source: "human" }) });
  assert.equal(observationResponse.status, 201);
  const readinessResponse = await request(`/v1/product-engineering/applications/${roostId}/readiness`, { headers: auth });
  assert.equal(readinessResponse.status, 200);
  const readiness = (readinessResponse.body as { data: { readiness: { overall: number; algorithm: { version: string } } } }).data.readiness;
  assert.equal(readiness.algorithm.version, "product-readiness-v1");
  assert.ok(readiness.overall > 0 && readiness.overall < 100);
  const portfolioGraphResponse = await request("/v1/product-engineering/graph", { headers: auth });
  assert.equal(portfolioGraphResponse.status, 200);
  const portfolioGraph = (portfolioGraphResponse.body as { data: { schemaVersion: string; nodes: Array<{ id: string; type: string; entityId: string; completeness: number; path: string[] }>; edges: Array<{ type: string }> } }).data;
  assert.equal(portfolioGraph.schemaVersion, "application-graph-v2");
  assert.equal(portfolioGraph.nodes.filter((node) => node.type === "portfolio").length, 1);
  assert.equal(portfolioGraph.nodes.find((node) => node.entityId === roostId)?.completeness, readiness.overall);
  assert.ok(portfolioGraph.edges.every((edge) => edge.type === "hierarchy"));
  const applicationGraphResponse = await request(`/v1/product-engineering/applications/${roostId}/graph`, { headers: auth });
  assert.equal(applicationGraphResponse.status, 200);
  const applicationGraph = (applicationGraphResponse.body as { data: { scope: string; nodes: Array<{ id: string; type: string; entityId: string; parentNodeId: string | null; path: string[]; details: { evidenceCount?: number } }>; edges: Array<{ type: string }> } }).data;
  assert.equal(applicationGraph.scope, "application");
  const graphCapability = applicationGraph.nodes.find((node) => node.entityId === assignments[0]);
  const graphFeature = applicationGraph.nodes.find((node) => node.entityId === (featureAssignment.body as { data: { id: string } }).data.id);
  assert.equal(graphCapability?.type, "capability");
  assert.equal(graphFeature?.parentNodeId, graphCapability?.id);
  assert.equal(graphFeature?.path.at(-1), graphFeature?.id);
  assert.equal(graphCapability?.details.evidenceCount, 1);
  const documentationPayload = {
    sourceSystem: "repository-docs-v1",
    sourceRoot: "C:/Workspaces/Roost",
    sourceRevision: "test-revision",
    records: [
      { sourceId: "file:docs/product/product.md", recordType: "architecture_document", title: "Product", description: "Canonical product truth.", filePath: "docs/product/product.md", headingPath: ["Product"] },
      { sourceId: "file:docs/product/product.md#goal", parentSourceId: "file:docs/product/product.md", recordType: "application_goal", title: "Goal", description: "Operate the company coherently.", filePath: "docs/product/product.md", headingPath: ["Product", "Goal"] }
    ],
    architecture: [
      { sourceId: "WEB", type: "frontend", name: "Owner console", atomType: "application", layer: "frontend", completionPercent: 75, verificationStatus: "documented", filePath: "web/src/app.tsx", relations: [{ targetSourceId: "API", type: "calls", status: "documented" }] },
      { sourceId: "API", parentSourceId: "WEB", type: "backend", name: "Roost API", atomType: "service", layer: "backend", completionPercent: 80, verificationStatus: "documented", filePath: "src/app.ts", relations: [] }
    ]
  };
  const documentationPreview = await request(`/v1/product-engineering/applications/${roostId}/actions/import-documentation-context`, { method: "POST", headers: auth, body: JSON.stringify({ ...documentationPayload, mode: "preview" }) });
  assert.equal(documentationPreview.status, 200);
  assert.equal((documentationPreview.body as { data: { createCount: number; recordCreateCount: number; architectureCreateCount: number; deleteCount: number } }).data.createCount, 4);
  assert.equal((documentationPreview.body as { data: { recordCreateCount: number } }).data.recordCreateCount, 2);
  assert.equal((documentationPreview.body as { data: { architectureCreateCount: number } }).data.architectureCreateCount, 2);
  assert.equal((documentationPreview.body as { data: { deleteCount: number } }).data.deleteCount, 0);
  assert.equal(await prisma.companyRecord.count({ where: { applicationId: roostId, source: "documentation-import" } }), 0, "preview must not write documentation records");
  assert.equal(await prisma.applicationArchitectureComponent.count({ where: { applicationId: roostId } }), 0, "preview must not write architecture components");
  const documentationApply = await request(`/v1/product-engineering/applications/${roostId}/actions/import-documentation-context`, { method: "POST", headers: auth, body: JSON.stringify({ ...documentationPayload, mode: "apply" }) });
  assert.equal(documentationApply.status, 200);
  const importedDocumentation = await prisma.companyRecord.findMany({ where: { applicationId: roostId, source: "documentation-import" }, orderBy: { title: "asc" } });
  assert.equal(importedDocumentation.length, 2);
  assert.equal(importedDocumentation.find((record) => record.recordType === "application_goal")?.parentId, importedDocumentation.find((record) => record.recordType === "architecture_document")?.id);
  const importedArchitecture = await prisma.applicationArchitectureComponent.findMany({ where: { applicationId: roostId, name: { in: ["Owner console", "Roost API"] } } });
  assert.equal(importedArchitecture.length, 2);
  assert.equal((importedArchitecture.find((component) => component.name === "Owner console")?.metadata as { relations?: unknown[] }).relations?.length, 1);
  const capabilityEntityContext = await request(`/v1/company-intelligence/entities/capability/${assignments[0]}`, { headers: auth });
  assert.equal(capabilityEntityContext.status, 200);
  const implementationEntityContext = await request(`/v1/company-intelligence/entities/implementation/${importedArchitecture[0]!.id}`, { headers: auth });
  assert.equal(implementationEntityContext.status, 200);
  const documentationSecondPreview = await request(`/v1/product-engineering/applications/${roostId}/actions/import-documentation-context`, { method: "POST", headers: auth, body: JSON.stringify({ ...documentationPayload, mode: "preview" }) });
  assert.equal((documentationSecondPreview.body as { data: { createCount: number; updateCount: number } }).data.createCount, 0);
  assert.equal((documentationSecondPreview.body as { data: { updateCount: number } }).data.updateCount, 4);
  const documentedGraphResponse = await request(`/v1/product-engineering/applications/${roostId}/graph`, { headers: auth });
  const documentedNodes = (documentedGraphResponse.body as { data: { nodes: Array<{ id: string; entityId: string; parentNodeId: string | null }> } }).data.nodes;
  const importedDocumentNode = documentedNodes.find((node) => node.entityId === importedDocumentation.find((record) => record.recordType === "architecture_document")?.id);
  const importedGoalNode = documentedNodes.find((node) => node.entityId === importedDocumentation.find((record) => record.recordType === "application_goal")?.id);
  assert.equal(importedGoalNode?.parentNodeId, importedDocumentNode?.id);
  const agentContextResponse = await request(`/v1/product-engineering/applications/${roostId}/agent-context`, { headers: auth });
  assert.equal(agentContextResponse.status, 200);
  assert.equal((agentContextResponse.body as { data: { authority: { declarationIsNotObservation: boolean } } }).data.authority.declarationIsNotObservation, true);
  const executionAgentContextResponse = await request(`/v1/product-engineering/applications/${roostId}/agent-context?profile=execution&query=operate%20company`, { headers: auth });
  assert.equal(executionAgentContextResponse.status, 200);
  const executionAgentContext = (executionAgentContextResponse.body as { data: { companyRecords: Array<{ metadata: { sourceKind: string } }>; documentationIndex: unknown[]; contextSelection: { profile: string; totalRecordCount: number; selectedRecordCount: number } } }).data;
  assert.equal(executionAgentContext.contextSelection.profile, "execution");
  assert.equal(executionAgentContext.contextSelection.totalRecordCount, 2);
  assert.equal(executionAgentContext.contextSelection.selectedRecordCount, 2);
  assert.equal(executionAgentContext.documentationIndex.length, 1);
  assert.ok(executionAgentContext.companyRecords.every((record) => record.metadata.sourceKind === "canonical_documentation"));
  const crossWorkspace = await request(`/v1/product-engineering/applications/${roostId}`, { headers: { Authorization: `Bearer ${otherOwner.token}` } });
  assert.equal(crossWorkspace.status, 404);

  const offeringResponse = await request("/v1/product-engineering/offerings", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      applicationId: roostId,
      key: "roost-test-product",
      name: "Roost Test Product",
      type: "product",
      lifecycleStage: "candidate"
    })
  });
  assert.equal(offeringResponse.status, 201);
  assert.equal(
    (offeringResponse.body as { data: { applicationId: string } }).data.applicationId,
    roostId,
    "productization must reference the application instead of copying it"
  );

  const procedureCreate = await request("/v1/process-core/procedures", { method: "POST", headers: auth, body: JSON.stringify({ name: "Release application", purpose: "Release a verified application safely.", expectedResult: "A verified release with rollback evidence.", steps: [{ instruction: "Run the release validation suite." }, { instruction: "Record deployment and rollback evidence." }] }) });
  assert.equal(procedureCreate.status, 201);
  const procedure = (procedureCreate.body as { data: { id: string; familyId: string; version: number; status: string } }).data;
  assert.equal(procedure.status, "draft");
  const activate = await request(`/v1/process-core/procedures/${procedure.id}/actions/activate`, { method: "POST", headers: auth, body: "{}" });
  assert.equal(activate.status, 200);
  const applicationProcedureLink = await request(`/v1/product-engineering/applications/${roostId}/procedures`, { method: "POST", headers: auth, body: JSON.stringify({ procedureId: procedure.id, relationType: "release", required: true }) });
  assert.equal(applicationProcedureLink.status, 201);
  const capabilityProcedureLink = await request(`/v1/product-engineering/capability-definitions/${definitionId}/procedures`, { method: "POST", headers: auth, body: JSON.stringify({ procedureId: procedure.id, relationType: "implementation", required: true }) });
  assert.equal(capabilityProcedureLink.status, 201);
  const deliveryProject = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "Roost delivery test", status: "active" } });
  const deliveryList = await prisma.taskList.create({ data: { workspaceId: owner.workspace.id, projectId: deliveryProject.id, name: "Release" } });
  const deliveryTask = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: deliveryProject.id, taskListId: deliveryList.id, title: "Verify release", status: "in_progress" } });
  const projectLink = await request(`/v1/product-engineering/applications/${roostId}/projects`, { method: "POST", headers: auth, body: JSON.stringify({ projectId: deliveryProject.id, relationType: "delivery" }) });
  assert.equal(projectLink.status, 201);
  const applicationRepository = await prisma.applicationRepository.create({ data: { applicationId: roostId, name: "Roost repository", url: "https://example.test/roost.git", isPrimary: true } });
  const applicationComponent = await prisma.applicationArchitectureComponent.create({ data: { applicationId: roostId, type: "backend", name: "Roost API", status: "active" } });
  const projectWorkspaceResponse = await request(`/v1/projects/${deliveryProject.id}/workspace`, { headers: auth });
  assert.equal(projectWorkspaceResponse.status, 200, JSON.stringify(projectWorkspaceResponse.body));
  const projectWorkspace = (projectWorkspaceResponse.body as { data: { product: { capabilities: Array<{ id: string }>; features: Array<{ id: string }>; architecture: Array<{ id: string }>; repositories: Array<{ id: string }> }; procedures: Array<{ id: string }>; evidence: Array<{ id: string }> } }).data;
  assert.ok(projectWorkspace.product.capabilities.some((item) => item.id === assignments[0]));
  assert.ok(projectWorkspace.product.features.some((item) => item.id === (featureAssignment.body as { data: { id: string } }).data.id));
  assert.ok(projectWorkspace.product.architecture.some((item) => item.id === applicationComponent.id));
  assert.ok(projectWorkspace.product.repositories.some((item) => item.id === applicationRepository.id));
  assert.ok(projectWorkspace.procedures.some((item) => item.id === procedure.id));
  assert.ok(projectWorkspace.evidence.some((item) => item.id === evidenceId));
  const executionGraphResponse = await request(`/v1/product-engineering/applications/${roostId}/graph`, { headers: auth });
  assert.equal(executionGraphResponse.status, 200);
  const executionNodes = (executionGraphResponse.body as { data: { nodes: Array<{ type: string; entityId: string }> } }).data.nodes;
  assert.equal(executionNodes.some((node) => node.type === "procedure" && node.entityId === procedure.id), true);
  assert.equal(executionNodes.some((node) => node.type === "project" && node.entityId === deliveryProject.id), true);
  assert.equal(executionNodes.some((node) => node.type === "task" && node.entityId === deliveryTask.id), true);
  const executionContextResponse = await request(`/v1/product-engineering/applications/${roostId}/agent-context`, { headers: auth });
  const executionContext = (executionContextResponse.body as { data: { schemaVersion: string; operatingModel: { applicationProcedures: unknown[]; capabilityProcedures: unknown[]; projects: unknown[] } } }).data;
  assert.equal(executionContext.schemaVersion, "application-agent-context-v2");
  assert.equal(executionContext.operatingModel.applicationProcedures.length, 1);
  assert.equal(executionContext.operatingModel.capabilityProcedures.length, 1);
  assert.equal(executionContext.operatingModel.projects.length, 1);
  const unlinkProject = await request(`/v1/product-engineering/applications/${roostId}/projects/${deliveryProject.id}`, { method: "DELETE", headers: auth });
  assert.equal(unlinkProject.status, 204);
  const unlinkApplicationProcedure = await request(`/v1/product-engineering/applications/${roostId}/procedures/${procedure.id}`, { method: "DELETE", headers: auth });
  assert.equal(unlinkApplicationProcedure.status, 204);
  const unlinkCapabilityProcedure = await request(`/v1/product-engineering/capability-definitions/${definitionId}/procedures/${procedure.id}`, { method: "DELETE", headers: auth });
  assert.equal(unlinkCapabilityProcedure.status, 204);
  const revision = await request(`/v1/process-core/procedures/${procedure.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ purpose: "Release safely with an improved AI-readable evidence packet." }) });
  assert.equal(revision.status, 200);
  const revisionBody = (revision.body as { data: { id: string; familyId: string; version: number; status: string } }).data;
  assert.notEqual(revisionBody.id, procedure.id);
  assert.equal(revisionBody.familyId, procedure.familyId);
  assert.equal(revisionBody.version, 2);
  assert.equal(revisionBody.status, "draft");
});

async function admissionFixtureResources(applicationId:string) {
 const app=await prisma.application.findUnique({where:{id:applicationId}}); if(!app)return null;
 let procedure=await prisma.procedure.findFirst({where:{workspaceId:app.workspaceId,name:`Synthetic native admission procedure ${applicationId}`,applicationLinks:{some:{applicationId}}}});
 if(!procedure){procedure=await prisma.procedure.create({data:{workspaceId:app.workspaceId,name:`Synthetic native admission procedure ${applicationId}`,purpose:"Verify one bounded fixture",status:"active"}});await prisma.procedureStep.create({data:{procedureId:procedure.id,stepOrder:1,instruction:"Run the isolated fixture verification and compare expected result"}});await prisma.applicationProcedure.create({data:{applicationId,procedureId:procedure.id}});}
 const email=`admission-verifier-${app.workspaceId}@example.test`;
 let verifier=await prisma.user.findUnique({where:{email}});
 if(!verifier){verifier=await prisma.user.create({data:{email,passwordHash:"synthetic-not-a-login"}});await prisma.workspaceMembership.create({data:{workspaceId:app.workspaceId,userId:verifier.id,role:"member"}});}
 let extension=await prisma.procedure.findFirst({where:{workspaceId:app.workspaceId,name:`Synthetic extension ${applicationId}`}});
 if(!extension)extension=await prisma.procedure.create({data:{workspaceId:app.workspaceId,name:`Synthetic extension ${applicationId}`,purpose:"Bound fixture application requirements",status:"active",steps:{create:{stepOrder:1,instruction:"Verify the exact fixture component"}}}});
 return {procedure,extension,verifier,workspaceId:app.workspaceId};
}
const admissionFixtureDetail=(gate:string)=>({
 procedure:{validation:"Synthetic procedure check",observedResult:"Expected fixture result observed"},
 extended_review:{security:"Scope checked independently",data:"No external data affected",reversibility:"Fixture reset is isolated",tests:"Synthetic checks passed",unresolvedFindings:[]},
 mandate:{decision:"Approve exact synthetic operation",allowedScope:"Exact fixture only",exclusions:"All external operations excluded"},
 backup:{artifact:{digest:"b".repeat(64),bytes:123,capturedAt:new Date(Date.now()-1000).toISOString(),reference:"synthetic-fixture-artifact"},validation:"Synthetic archive verified",observedResult:"Fixture archive readable"},
 restore_plan:{restoreProcedure:"Restore isolated synthetic fixture",validation:"Check isolated fixture rows",expectedResult:"Fixture row count matches",prerequisites:"Disposable isolated fixture available"},
 owner_approval:{decision:"approve_exact_operation",residualRisk:"Only isolated synthetic effects accepted"}
} as Record<string,any>)[gate];
const handoffFixtureInputs=new WeakSet<object>();
const fixtureAdmissionOperations=(input:any)=>["runtime_execute","review_decision","return_to_executor","create_specialist_task",...(handoffFixtureInputs.has(input)?["handoff_create","handoff_accept","handoff_reject"]:[])];
async function prepareAdmissionFixture(route:string,input:any,auth:Record<string,string>) {
 const resources=await admissionFixtureResources(input.applicationId);if(!resources)return;
 const taskId=route.split("/")[4]!;
 if(!(await prisma.$queryRaw<any[]>`SELECT task_risk_current(${taskId}::uuid) AS id`)[0]?.id)return;
 const get=async()=>((await request(route,{headers:auth})).body as any).data;
 let v=await get();if(!v?.permissions.canWrite)return;
 const post=(kind:string,body:any,headers:Record<string,string>=auth)=>request(`${route}/${kind}`,{method:"POST",headers,body:JSON.stringify(body)});
 if(!v.scope){
  const target=v.records.find((r:any)=>r.applicationId===input.applicationId);if(!target)return;
  const r=await post("scope",{requestId:randomUUID(),expectedVersion:v.expectedVersion,procedureId:resources.procedure.id,targetId:target.id,releaseId:target.id,taskType:"code_change",environment:"development",destructive:false,commit:"a".repeat(40),rationale:"Synthetic bounded admission scope"});
  assert.equal(r.status,200,JSON.stringify(r.body));v=(r.body as any).data;
 }
 const {createAuthToken}=await import("../auth/token"),workspace=await prisma.workspace.findUniqueOrThrow({where:{id:resources.workspaceId}});
 const independent={Authorization:`Bearer ${createAuthToken({workspaceId:resources.workspaceId,userId:resources.verifier.id})}`},owner={Authorization:`Bearer ${createAuthToken({workspaceId:resources.workspaceId,userId:workspace.ownerUserId})}`};
 const source=await prisma.companyRecord.findFirst({where:{id:input.contract?.context?.company?.[0]?.id,workspaceId:resources.workspaceId}});if(!source)return;
 await prepareCompositionFixture(taskId,input,resources,owner,auth,v.scope.input.taskType);
 v=await get();
 for(const operation of fixtureAdmissionOperations(input)){
  for(const required of v.operations[operation].gates){
   v=await get();if(v.operations[operation].gates.find((g:any)=>g.gate===required.gate)?.status==="present")continue;
   const r=await post("evidence",{requestId:randomUUID(),expectedVersion:v.expectedVersion,operation,gate:required.gate,verdict:"passed",evidence:{id:source.id,revision:source.updatedAt.toISOString()},rationale:"Synthetic exact scope proof",...admissionFixtureDetail(required.gate)},["extended_review","backup"].includes(required.gate)?independent:owner);
   assert.equal(r.status,200,JSON.stringify(r.body));v=(r.body as any).data;
  }
 }
}
async function prepareCompositionFixture(taskId:string,input:any,resources:any,owner:Record<string,string>,auth:Record<string,string>,taskType:string) {
 const root=`/v1/agent-runtime/tasks/${taskId}/procedure-composition`;
 for(const operation of fixtureAdmissionOperations(input)) {
  for(const kind of ["base","extension"]){
   const procedureId=kind==="base"?resources.procedure.id:resources.extension.id;
   const route=`/v1/process-core/procedures/${procedureId}/contracts`;
   const v=((await request(route,{headers:owner})).body as any).data;
   const body={kind,taskType,operation,applicationId:kind==="base"?null:input.applicationId,componentId:kind==="base"?null:input.contract.singleTask.component.id,
    baseProcedureId:kind==="base"?null:resources.procedure.id,inputs:["Synthetic exact input"],outputs:["Synthetic exact result"],evidence:["Synthetic observed evidence"],completion:["Synthetic checks passed"],
    roles:["requester","accountableManager","executor","verifier","releaser"],tools:input.contract.access.tools,
    steps:kind==="base"?[{key:"verify",instruction:"Verify the isolated fixture",role:"executor",tools:[],inputs:[],outputs:["Observed fixture result"],evidence:["Fixture test result"],requires:[]}]:[]};
   const prior=v.versions.find((x:any)=>x.body.operation===operation&&x.body.taskType===taskType);
   if(!prior?.valid || JSON.stringify(prior.body)!==JSON.stringify(body)) {
    const {reviewDigest}=await import("../modules/agent-runtime/task-review-contract");
    if(!prior?.valid || reviewDigest(prior.body)!==reviewDigest(body)) {
     const r=await request(route+"/publish",{method:"POST",headers:owner,body:JSON.stringify({requestId:randomUUID(),expectedVersion:v.expectedVersion,contract:body,rationale:"Publish synthetic fixture contract"})});assert.equal(r.status,200,JSON.stringify(r.body));
    }
   }
  }
 }
 for(const operation of fixtureAdmissionOperations(input)){
  const v=((await request(root,{headers:auth})).body as any).data;
  if(v.operations[operation].seal)continue;
  const r=await request(root+"/selection",{method:"POST",headers:auth,body:JSON.stringify({requestId:randomUUID(),expectedVersion:v.expectedVersion,operation,baseProcedureId:resources.procedure.id,extensionProcedureId:resources.extension.id,rationale:"Select exact synthetic contract"})});assert.equal(r.status,200,JSON.stringify(r.body));
 }
 await refreshCompositionRisk(taskId,auth);
}
async function refreshCompositionRisk(taskId:string,auth:Record<string,string>){
 const root=`/v1/agent-runtime/tasks/${taskId}/risk`,v=((await request(root,{headers:auth})).body as any).data;
 if(v.currentId)return;
 const r=await request(root+"/assessments",{method:"POST",headers:auth,body:JSON.stringify({requestId:randomUUID(),expectedVersion:v.expectedVersion,entries:v.history[0].entries,jointRationale:"Recheck exact synthetic procedure versions"})});assert.equal(r.status,200,JSON.stringify(r.body));
}
async function submissionInput(route: string, input: any, auth: Record<string, string>) {
  if (!route.endsWith("/actions/submit-for-execution")) return input;
  await prepareRiskFixture(route.replace("/actions/submit-for-execution", "/risk"),input,auth);
  const read = await request(`${route.replace("/actions/submit-for-execution", "/execution-readiness")}?editor=1&applicationId=${input.applicationId}`, { headers: auth });
  return { ...input, requestId: randomUUID(), expectedVersion: (read.body as any).data?.editor?.submissionVersion ?? "a".repeat(64) };
}
async function prepareRiskFixture(route: string,input:any,auth:Record<string,string>) {
  if(input.applicationId && input.contract) { const r=await admissionFixtureResources(input.applicationId); if(r && !input.contract.procedures?.items?.some((p:any)=>p.id===r.procedure.id)) input.contract.procedures={items:[...(input.contract.procedures?.items??[]),{id:r.procedure.id,revision:String(r.procedure.version)}],noneReason:null}; }
  const post=(url:string,body:any)=>request(url,{method:"POST",headers:auth,body:JSON.stringify(body)});
  let view=(await request(route,{headers:auth})).body as any;
  if (!view.data?.expectedVersion) return;
  const {riskInputHash}=await import("../modules/agent-runtime/task-risk");
  const priorScope=view.data.members.find((m:any)=>m.id===view.data.task.id)?.scope;
  if (view.data.currentId && priorScope && riskInputHash(priorScope)===riskInputHash(input)) { await prepareAdmissionFixture(route.replace(/\/risk$/,"/risk-admission"),input,auth); return; }
  const prepared=await post(`${route}/scope`,{...input,requestId:randomUUID(),expectedVersion:view.data.expectedVersion,releaseSet:null});
  if (prepared.status!==200) return; // Negative contract/principal fixtures still reach their original gate.
  view=prepared.body;
  if (view.data.members.some((m:any)=>!m.scopeId)) return;
  const evidence=view.data.evidence.find((e:any)=>e.id===input.contract?.context?.company?.[0]?.id)??view.data.evidence.find((e:any)=>e.applicationId===null);
  if (!evidence) return;
  const ref={id:evidence.id,revision:evidence.revision};
  const entries=view.data.members.map((m:any)=>({taskId:m.id,dimensions:Object.fromEntries(["money","data","security","availability","legal","reversibility","users"].map(d=>[d,{level:"low",rationale:"Synthetic bounded test impact",evidence:[ref]}])),uncertainty:{level:"none",reasons:"Synthetic controlled fixture",evidence:[ref]},contradictions:[]}));
  const assessed=await post(`${route}/assessments`,{requestId:randomUUID(),expectedVersion:view.data.expectedVersion,entries,jointRationale:"Synthetic joint fixture assessment"});
  assert.equal(assessed.status,200,JSON.stringify(assessed.body));
  await prepareAdmissionFixture(route.replace(/\/risk$/,"/risk-admission"),input,auth);
}

test("versioned procedure composition preserves exact contracts and fails closed",async t=>{
 const owner=await registerOwner("composition-owner@example.test","Composition fixture"),workspaceId=owner.workspace.id,auth={Authorization:`Bearer ${owner.token}`};
 const second=await prisma.user.create({data:{email:"composition-independent@example.test",passwordHash:"synthetic-not-a-login"}});
 await prisma.workspaceMembership.create({data:{workspaceId,userId:second.id,role:"owner"}});
 const viewer=await prisma.user.create({data:{email:"composition-viewer@example.test",passwordHash:"synthetic-not-a-login"}});
 await prisma.workspaceMembership.create({data:{workspaceId,userId:viewer.id,role:"viewer"}});
 const {createAuthToken}=await import("../auth/token"),independent={Authorization:`Bearer ${createAuthToken({workspaceId,userId:second.id})}`};
 const app=await prisma.application.create({data:{workspaceId,name:"Composition app",slug:"composition-fixture"}}),project=await prisma.project.create({data:{workspaceId,name:"Composition project"}});
 await prisma.applicationProject.create({data:{applicationId:app.id,projectId:project.id}});
 const task=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Compose exact procedure"}}),f=await prepareReadyFixture(workspaceId,task.id,app.id,auth,false);
 await prepareRiskFixture(`/v1/agent-runtime/tasks/${task.id}/risk`,f.input,auth);
 const resources=(await admissionFixtureResources(app.id))!,root=`/v1/agent-runtime/tasks/${task.id}`,route=root+"/procedure-composition";
 const get=async(headers=auth)=>((await request(route,{headers})).body as any).data;
 const post=(path:string,body:any,headers=auth)=>request(path,{method:"POST",headers,body:JSON.stringify(body)});
 const original=(await get()).operations.runtime_execute;
 const contractRoute=`/v1/process-core/procedures/${resources.extension.id}/contracts`;
 const contracts=async()=>((await request(contractRoute,{headers:auth})).body as any).data;
 const clean=(await contracts()).versions.find((v:any)=>v.body.operation==="runtime_execute").body;
 async function publish(body:any){const v=await contracts(),input={requestId:randomUUID(),expectedVersion:v.expectedVersion,contract:body,rationale:"Review a synthetic composition revision"};const r=await post(contractRoute+"/publish",input);assert.equal(r.status,200,JSON.stringify(r.body));return {r,input};}
 const selection=async(extensionProcedureId:string|null)=>post(route+"/selection",{requestId:randomUUID(),expectedVersion:(await get()).expectedVersion,operation:"runtime_execute",baseProcedureId:resources.procedure.id,extensionProcedureId,rationale:"Exact fixture selection"});
 await t.test("composition is deterministic, versioned and carries field provenance",async()=>{
  assert.equal(original.status,"composed");assert.equal(original.algorithm,"roost-procedure-composition-v1");assert.equal(original.fields.inputs[0].source,"base");assert.equal(original.fields.inputs[1].source,"extension");assert.deepEqual((await get()).operations.runtime_execute,original);
  assert.equal((await request(route)).status,401);assert.equal((await request(`/v1/agent-runtime/tasks/${randomUUID()}/procedure-composition`,{headers:auth})).status,404);
  const viewAuth={Authorization:`Bearer ${createAuthToken({workspaceId,userId:viewer.id})}`};assert.equal((await get(viewAuth)).permissions.canWrite,false);
  assert.equal((await post(route+"/selection",{},viewAuth)).status,403);assert.equal((await post(contractRoute+"/publish",{},viewAuth)).status,403);
  const foreign=await registerOwner("composition-foreign@example.test","Foreign fixture"),foreignAuth={Authorization:`Bearer ${foreign.token}`};
  assert.equal((await request(route,{headers:foreignAuth})).status,404);assert.equal((await request(contractRoute,{headers:foreignAuth})).status,404);
  await assert.rejects(prisma.$executeRaw`UPDATE procedure_contract_versions SET rationale='Overwrite history' WHERE id=${original.refs.base}::uuid`,/procedure_composition_history_immutable/);
  await assert.rejects(prisma.$executeRaw`DELETE FROM task_composition_selections WHERE task_id=${task.id}::uuid`,/procedure_composition_history_immutable/);
 });
 await t.test("publication replay and concurrency never overwrite a version",async()=>{
  const {input}=await publish({...clean,completion:["New exact fixture condition"]});
  const replay=await post(contractRoute+"/publish",input);assert.equal(replay.status,200);assert.equal((replay.body as any).data.replayed,true);
  assert.equal((await post(contractRoute+"/publish",{...input,rationale:"Changed request"})).status,409);
  const v=await contracts(),body={requestId:randomUUID(),expectedVersion:v.expectedVersion,contract:clean,rationale:"Concurrent exact fixture publication"};
  const responses=await Promise.all([post(contractRoute+"/publish",body),post(contractRoute+"/publish",{...body,requestId:randomUUID()})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 });
 await t.test("conflicts, tool widening and unresolved step dependencies block composition",async()=>{
  for(const body of [{...clean,tools:[...clean.tools,"release_all"]},{...clean,steps:[{key:"verify",instruction:"Conflicting replacement",role:"executor",tools:[],inputs:[],outputs:[],evidence:[],requires:[]}]},{...clean,steps:[{key:"extra",instruction:"Depends on absent step",role:"executor",tools:[],inputs:[],outputs:[],evidence:[],requires:["absent"]}]}]){
   await publish(body);const v=await get();assert.equal(v.operations.runtime_execute.status,"blocked");assert.ok(v.operations.runtime_execute.conflicts.length);
   assert.equal((await post(root+"/actions/submit-for-execution",{...f.input,requestId:randomUUID(),expectedVersion:"a".repeat(64)})).status,409);
  }
  await publish(clean);
 });
 await t.test("narrow exception requires independent owner, expires, and cannot waive risk",async()=>{
  assert.equal((await selection(null)).status,200);await refreshCompositionRisk(task.id,auth);let v=await get();assert.deepEqual(v.operations.runtime_execute.missing,["extension"]);
  const body={requestId:randomUUID(),expectedVersion:v.expectedVersion,operation:"runtime_execute",missing:"extension",decision:"approve_exact_missing_element",rationale:"Temporary absence of the exact application extension"};
  assert.equal((await post(route+"/exception",body)).status,409);
  assert.equal((await post(route+"/exception",{...body,missing:"risk"},independent)).status,400);
  const accepted=await post(route+"/exception",body,independent);assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  v=(accepted.body as any).data;assert.equal(v.operations.runtime_execute.status,"composed");assert.equal(v.operations.runtime_execute.exceptions.length,1);
  assert.equal((await post(route+"/exception",body,independent)).status,200);
  await prisma.$transaction(async tx=>{await tx.$executeRaw`ALTER TABLE task_composition_exceptions DISABLE TRIGGER composition_immutable`;await tx.$executeRaw`UPDATE task_composition_exceptions SET created_at=now()-interval '16 minutes' WHERE task_id=${task.id}::uuid`;await tx.$executeRaw`ALTER TABLE task_composition_exceptions ENABLE TRIGGER composition_immutable`;});
  assert.equal((await get()).operations.runtime_execute.status,"blocked");
  assert.equal((await selection(resources.extension.id)).status,200);await refreshCompositionRisk(task.id,auth);
 });
 await t.test("missing base exception preserves the prepared task tool ceiling",async()=>{
  const missingBase=await prisma.procedure.create({data:{workspaceId,name:"Synthetic unpublished base",purpose:"Exact missing contract fixture",status:"active"}});
  await publish({...clean,baseProcedureId:missingBase.id,tools:[...clean.tools,"release_all"]});
  const selected=await post(route+"/selection",{requestId:randomUUID(),expectedVersion:(await get()).expectedVersion,operation:"runtime_execute",baseProcedureId:missingBase.id,extensionProcedureId:resources.extension.id,rationale:"Select an explicitly missing base contract"});assert.equal(selected.status,200,JSON.stringify(selected.body));
  await refreshCompositionRisk(task.id,auth);const v=await get();assert.deepEqual(v.operations.runtime_execute.missing,["base"]);assert.deepEqual(v.operations.runtime_execute.conflicts,[]);
  const accepted=await post(route+"/exception",{requestId:randomUUID(),expectedVersion:v.expectedVersion,operation:"runtime_execute",missing:"base",decision:"approve_exact_missing_element",rationale:"Approve only the exact temporary absence of the base"},independent);assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  const composed=(accepted.body as any).data.operations.runtime_execute;assert.equal(composed.status,"composed");assert.equal(composed.fields.tools.includes("release_all"),false);assert.deepEqual([...composed.fields.tools].sort(),[...f.input.contract.access.tools].sort());assert.ok(composed.gates.includes("procedure"));assert.equal(composed.steps.length,0);
  await publish(clean);assert.equal((await selection(resources.extension.id)).status,200);await refreshCompositionRisk(task.id,auth);
 });
 await t.test("Ready and queued execution keep old versions across publication; withdrawal fences them",async()=>{
  await refreshCompositionRisk(task.id,auth);await prepareAdmissionFixture(root+"/risk-admission",f.input,auth);
  const editor=((await request(root+`/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth})).body as any).data.editor;
  const accepted=await post(root+"/actions/submit-for-execution",{...f.input,requestId:randomUUID(),expectedVersion:editor.submissionVersion});assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  const pin=(await prisma.task.findUniqueOrThrow({where:{id:task.id}})).executionReadiness as any;
  const previousEnabled=process.env.ROOST_CODEX_EXECUTION_ENABLED;let queued;
  try{process.env.ROOST_CODEX_EXECUTION_ENABLED="true";queued=await post("/v1/agent-runtime/executions",{taskId:task.id,applicationId:app.id});}finally{if(previousEnabled===undefined)delete process.env.ROOST_CODEX_EXECUTION_ENABLED;else process.env.ROOST_CODEX_EXECUTION_ENABLED=previousEnabled;}
  assert.equal(queued.status,201,JSON.stringify(queued.body));
  const execution=(queued.body as any).data;assert.equal(execution.metadata.readyContextPin.compositionSeal,pin.procedureComposition.seal);
  const leaseToken=randomUUID();await prisma.agentExecution.update({where:{id:execution.id},data:{status:"claimed",attempt:1,leaseToken,leaseExpiresAt:new Date(Date.now()+90000),startedAt:new Date()}});
  await publish({...clean,completion:["A later published condition"]});
  const {readyTransaction,inspectReady}=await import("../modules/agent-runtime/task-execution-readiness");
  const read=await readyTransaction(db=>inspectReady(db,workspaceId,task.id));assert.equal((read as any).readiness.status,"ready",JSON.stringify(read));
  assert.equal((read as any).taskContext.executionPacket.procedureComposition.seal,pin.procedureComposition.seal);
  assert.notEqual((await get()).operations.runtime_execute.seal,pin.procedureComposition.seal);
  assert.equal((await selection(null)).status,409);
  const freshClient=new PrismaClient();try {const reread=(await freshClient.$queryRaw<any[]>`SELECT task_composition(${task.id}::uuid,'runtime_execute') AS value`)[0].value;assert.equal(reread.seal,pin.procedureComposition.seal);}finally{await freshClient.$disconnect();}
  const v=await contracts();const withdrawn=await post(contractRoute+"/withdraw",{requestId:randomUUID(),expectedVersion:v.expectedVersion,versionId:pin.procedureComposition.refs.extension,rationale:"Exact pinned version withdrawn"});assert.equal(withdrawn.status,200,JSON.stringify(withdrawn.body));
  const stopped=await prisma.agentExecution.findUniqueOrThrow({where:{id:execution.id}});assert.ok(stopped.contextInvalidatedAt);assert.equal(stopped.status,"claimed");
  assert.equal((await post(`/v1/agent-runtime/executions/${execution.id}/actions/context-stopped`,{leaseToken})).status,200);
  assert.equal((await post(`/v1/agent-runtime/executions/${execution.id}/actions/cancel`,{})).status,200);
  await refreshCompositionRisk(task.id,auth);await prepareAdmissionFixture(root+"/risk-admission",f.input,auth);
  const nextEditor=((await request(root+`/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth})).body as any).data.editor;
  const next=await post(root+"/actions/submit-for-execution",{...f.input,requestId:randomUUID(),expectedVersion:nextEditor.submissionVersion});assert.equal(next.status,200,JSON.stringify(next.body));
  const nextPin=(await prisma.task.findUniqueOrThrow({where:{id:task.id}})).executionReadiness as any;
  assert.notEqual(nextPin.procedureComposition.refs.extension,pin.procedureComposition.refs.extension);
  assert.equal(nextPin.procedureComposition.refs.extension,(await get()).operations.runtime_execute.refs.extension);
  const source=await prisma.procedure.findUniqueOrThrow({where:{id:resources.extension.id}});
  await prisma.procedure.update({where:{id:source.id},data:{purpose:"Changed extension source fixture"}});
  assert.equal((await get()).operations.runtime_execute.status,"blocked");
  await prisma.procedure.update({where:{id:source.id},data:{purpose:source.purpose}});
  assert.equal((await get()).operations.runtime_execute.status,"blocked");
  assert.equal((await contracts()).versions.find((v:any)=>v.id===nextPin.procedureComposition.refs.extension).valid,false);
  assert.equal(((await prisma.task.findUniqueOrThrow({where:{id:task.id}})).executionReadiness as any).status,"needs_revalidation");
 });
 await t.test("unselected sensitive catalogue labels are masked without weakening contract validation",async()=>{
  const sentinel="Bearer synthetic-catalog-only-value";
  const unrelated=await prisma.application.create({data:{workspaceId,name:"Synthetic unrelated catalogue",slug:"unrelated-composition-catalog",architecture:{create:{type:"other",name:sentinel}}},include:{architecture:true}});
  const response=await request(contractRoute,{headers:auth});assert.equal(response.status,200,JSON.stringify(response.body));
  const v=(response.body as any).data;assert.equal(v.catalogRedacted,true);assert.equal(v.applications.find((a:any)=>a.id===unrelated.id).architecture[0].name,"[REDACTED]");assert.equal(JSON.stringify(response.body).includes(sentinel),false);
  assert.equal((await prisma.applicationArchitectureComponent.findUniqueOrThrow({where:{id:unrelated.architecture[0]!.id}})).name,sentinel);
  const denied=await post(contractRoute+"/publish",{requestId:randomUUID(),expectedVersion:v.expectedVersion,contract:{...clean,completion:[sentinel]},rationale:"Reject sensitive executable content"});assert.equal(denied.status,409);assert.equal((denied.body as any).error,"agent_runtime_content_blocked");
  assert.equal((await contracts()).versions.length,v.versions.length);
 });
});

test("native risk level admission binds independent evidence to exact operations",async t=>{
 const owner=await registerOwner("admission-owner@example.test","Admission fixture"),workspaceId=owner.workspace.id,auth={Authorization:`Bearer ${owner.token}`};
 const viewer=await prisma.user.create({data:{email:"admission-viewer@example.test",passwordHash:"synthetic-not-a-login"}});
 await prisma.workspaceMembership.create({data:{workspaceId,userId:viewer.id,role:"viewer"}});
 const app=await prisma.application.create({data:{workspaceId,name:"Admission fixture app",slug:"admission-fixture"}}),project=await prisma.project.create({data:{workspaceId,name:"Admission fixture project"}});
 await prisma.applicationProject.create({data:{applicationId:app.id,projectId:project.id}});
 const task=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Verify bounded admission"}}),f=await prepareReadyFixture(workspaceId,task.id,app.id,auth,false);
 const root=`/v1/agent-runtime/tasks/${task.id}`,route=root+"/risk-admission";
 await prepareRiskFixture(root+"/risk",f.input,auth);
 const get=async()=>((await request(route,{headers:auth})).body as any).data;
 const post=(kind:string,body:any,headers:Record<string,string>=auth)=>request(`${route}/${kind}`,{method:"POST",headers,body:JSON.stringify(body)});
 const proof={id:f.sources[0]!.id,revision:f.sources[0]!.updatedAt.toISOString()};
 async function classify(level:string){
  const risk=((await request(root+"/risk",{headers:auth})).body as any).data,entry=structuredClone(risk.history[0].entries[0]);
  for(const d of Object.values(entry.dimensions) as any[])d.level=level;
  const r=await request(root+"/risk/assessments",{method:"POST",headers:auth,body:JSON.stringify({requestId:randomUUID(),expectedVersion:risk.expectedVersion,entries:[entry],jointRationale:"Synthetic exact operation risk"})});assert.equal(r.status,200,JSON.stringify(r.body));
 }
 const evidenceBody=async(gate:string,extra:any={})=>({requestId:randomUUID(),expectedVersion:(await get()).expectedVersion,operation:"runtime_execute",gate,verdict:"passed",evidence:proof,rationale:"Synthetic independent verification",...admissionFixtureDetail(gate),...extra});
 for(const level of ["low","medium","high","critical"])await t.test(`${level} requires the server derived evidence and no prior level can bypass`,async()=>{
  await classify(level);
  let v=await get();assert.equal(v.operations.runtime_execute.status,"blocked");assert.equal(v.operations.runtime_execute.gates.length,({low:1,medium:1,high:3,critical:6} as any)[level]);
  assert.equal((await post("evidence",{...await evidenceBody("procedure"),requiredGates:[]})).status,400);
  await prepareAdmissionFixture(route,f.input,auth);v=await get();assert.equal(v.operations.runtime_execute.status,"admitted");
  assert.equal(v.operations.runtime_execute.gates.every((g:any)=>g.status==="present"),true);
 });
 await t.test("destructive production migration under computed low still needs all six gates",async()=>{
  await classify("low");const v=await get();
  const r=await post("scope",{...v.scope.input,requestId:randomUUID(),expectedVersion:v.expectedVersion,taskType:"migration",environment:"production",destructive:true});assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal((await get()).operations.runtime_execute.gates.length,6);
  // A different task type selects different procedure contracts, so the old
  // assessment must be renewed before attesting the new operation's evidence.
  assert.equal(((await request(root+"/risk",{headers:auth})).body as any).data.currentId,null);
  await classify("low");
  assert.equal((await post("evidence",await evidenceBody("owner_approval"))).status,409);
  assert.equal((await post("evidence",await evidenceBody("extended_review"))).status,409);
  assert.equal((await post("evidence",await evidenceBody("backup"))).status,409);
  await prepareAdmissionFixture(route,f.input,auth);assert.equal((await get()).operations.runtime_execute.status,"admitted");
 });
 await t.test("workspace scope, viewer, integration key and wrong reference fail closed",async()=>{
  assert.equal((await request(route)).status,401);
  const other=await registerOwner("admission-other@example.test","Other admission fixture");
  assert.equal((await request(route,{headers:{Authorization:`Bearer ${other.token}`}})).status,404);
  const resources=await admissionFixtureResources(app.id),{createAuthToken}=await import("../auth/token");
  const member={Authorization:`Bearer ${createAuthToken({workspaceId,userId:resources!.verifier.id})}`};
  const viewerAuth={Authorization:`Bearer ${createAuthToken({workspaceId,userId:viewer.id})}`};
  assert.equal((await request(route,{headers:viewerAuth})).status,200);
  assert.equal((await post("evidence",await evidenceBody("procedure"),viewerAuth)).status,403);
  assert.equal((await post("evidence",await evidenceBody("owner_approval"),member)).status,409);
  assert.equal((await post("evidence",await evidenceBody("extended_review",{unresolvedFindings:["Unresolved synthetic data loss"]}),member)).status,409);
  assert.equal((await post("evidence",await evidenceBody("backup",{artifact:{...admissionFixtureDetail("backup").artifact,capturedAt:new Date(Date.now()-7200000).toISOString()}}),member)).status,409);
  const current=await get();
  assert.equal((await post("scope",{...current.scope.input,releaseId:proof.id,requestId:randomUUID(),expectedVersion:current.expectedVersion})).status,409);
  assert.equal((await post("evidence",await evidenceBody("procedure",{evidence:{id:randomUUID(),revision:proof.revision}}))).status,409);
  const key=await request("/v1/api-keys",{method:"POST",headers:auth,body:JSON.stringify({name:"Denied admission integration",profileId:"mcp_codex_worker"})});
  assert.equal((await post("evidence",await evidenceBody("procedure"),{"X-API-Key":(key.body as any).data.key})).status,403);
 });
 await t.test("append only evidence, failed replacement, idempotency, concurrency and restart",async()=>{
  const body=await evidenceBody("procedure",{verdict:"failed"}),saved=await post("evidence",body);assert.equal(saved.status,200,JSON.stringify(saved.body));
  assert.equal((await get()).operations.runtime_execute.gates[0].status,"failed");
  assert.equal((await post("evidence",body)).status,200);
  assert.equal((await post("evidence",{...body,rationale:"Different request meaning"})).status,409);
  await assert.rejects(prisma.taskAdmissionEvidence.updateMany({where:{taskId:task.id},data:{verdict:"passed"}}),/risk_admission_history_immutable/);
  await assert.rejects(prisma.taskAdmissionScope.deleteMany({where:{taskId:task.id}}),/risk_admission_history_immutable/);
  const concurrent=await evidenceBody("procedure");const results=await Promise.all([post("evidence",concurrent),post("evidence",{...concurrent,requestId:randomUUID()})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
  const code="const{createApp}=require('./dist/app');const{prisma}=require('./dist/db/prisma');const p=JSON.parse(process.env.FIXTURE_REQUEST);const s=createApp().listen(0,'127.0.0.1',async()=>{const r=await fetch('http://127.0.0.1:'+s.address().port+p.path,{method:'POST',headers:{...p.auth,'Content-Type':'application/json'},body:JSON.stringify(p.body)});const b=await r.json();console.log(JSON.stringify({status:r.status,replayed:b.data?.replayed}));s.close();await prisma.$disconnect();});";
  const replay=await promisify(execFile)(process.execPath,["-e",code],{windowsHide:true,env:{...process.env,FIXTURE_REQUEST:JSON.stringify({path:route+"/evidence",auth,body})}});assert.deepEqual(JSON.parse(replay.stdout.trim()),{status:200,replayed:true});
  await prepareAdmissionFixture(route,f.input,auth);
 });
 await t.test("expired narrow owner approval and changed commit invalidate without fallback",async()=>{
  // Synthetic clock fixture only; ordinary history mutation was denied above.
  await prisma.$transaction(async tx=>{await tx.$executeRaw`ALTER TABLE task_admission_evidence DISABLE TRIGGER task_admission_immutable`;await tx.$executeRaw`UPDATE task_admission_evidence SET created_at=now()-interval '16 minutes' WHERE task_id=${task.id}::uuid AND gate='owner_approval'`;await tx.$executeRaw`ALTER TABLE task_admission_evidence ENABLE TRIGGER task_admission_immutable`;});
  assert.equal((await get()).operations.runtime_execute.gates.find((g:any)=>g.gate==="owner_approval").status,"stale");
  await prepareAdmissionFixture(route,f.input,auth);const before=await get();
  const changed=await post("scope",{...before.scope.input,commit:"c".repeat(40),requestId:randomUUID(),expectedVersion:before.expectedVersion});assert.equal(changed.status,200);
  assert.equal((await get()).operations.runtime_execute.status,"blocked");
  assert.equal((await post("scope",{...before.scope.input,requestId:randomUUID(),expectedVersion:before.expectedVersion})).status,409);
 });
 await t.test("procedure change and exact revert retain a monotonic invalidation",async()=>{
  await prepareAdmissionFixture(route,f.input,auth);const before=await get(),p=await prisma.procedure.findUniqueOrThrow({where:{id:before.scope.input.procedureId}});
  await prisma.procedure.update({where:{id:p.id},data:{purpose:"Changed synthetic procedure"}});
  assert.equal((await get()).operations.runtime_execute.status,"blocked");
  await prisma.procedure.update({where:{id:p.id},data:{purpose:p.purpose}});assert.equal((await get()).operations.runtime_execute.status,"blocked");
  await assert.rejects(prisma.agentExecution.create({data:{workspaceId,taskId:task.id,applicationId:app.id,requestedByType:"user",status:"queued"}}),/risk_admission_required|procedure_composition_required|procedure_composition_pin_invalid/);
 });
});

test("native risk assessments compute, bind and invalidate joint task scope",async t=>{
 const owner=await registerOwner("native-risk-owner@example.test","Native risk fixture"),workspaceId=owner.workspace.id,auth={Authorization:`Bearer ${owner.token}`};
 const app=await prisma.application.create({data:{workspaceId,name:"Synthetic risk app",slug:"risk-fixture"}}),project=await prisma.project.create({data:{workspaceId,name:"Synthetic risk project"}});
 await prisma.applicationProject.create({data:{applicationId:app.id,projectId:project.id}});
 const task=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Synthetic isolated risk objective"}});
 const f=await prepareReadyFixture(workspaceId,task.id,app.id,auth,false),route=`/v1/agent-runtime/tasks/${task.id}/risk`;
 const get=async(url=route)=>((await request(url,{headers:auth})).body as any).data;
 const post=(url:string,body:any,headers:Record<string,string>=auth)=>request(url,{method:"POST",headers,body:JSON.stringify(body)});
 const scope=async(url=route,input:any=f.input,releaseSet:any=null)=>post(`${url}/scope`,{...input,releaseSet,requestId:randomUUID(),expectedVersion:(await get(url)).expectedVersion});
 const ref={id:f.sources[0]!.id,revision:f.sources[0]!.updatedAt.toISOString()};
 const entry=(taskId=task.id)=>({taskId,dimensions:Object.fromEntries(["money","data","security","availability","legal","reversibility","users"].map(d=>[d,{level:"low",rationale:"Synthetic isolated impact with a verified boundary",evidence:[ref]}])),uncertainty:{level:"none",reasons:"Bounded fixture with known effects",evidence:[ref]},contradictions:[] as string[]});
 const command=async(entries:any[]=[entry()],extra:any={})=>({requestId:randomUUID(),expectedVersion:(await get()).expectedVersion,entries,jointRationale:"Joint impact checked across the canonical scope",...extra});
 await t.test("missing assessment fails Ready and cross-workspace requests are denied",async()=>{
  assert.equal((await get()).currentId,null);
  const r=await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth});
  const s=await post(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`,{...f.input,requestId:randomUUID(),expectedVersion:(r.body as any).data.editor.submissionVersion});
  assert.equal(s.status,409);assert.equal((s.body as any).error,"task_risk_assessment_required");
  assert.equal((await request(route)).status,401);
  await assert.rejects(prisma.agentExecution.create({data:{workspaceId,taskId:task.id,applicationId:app.id,requestedByType:"user",status:"queued"}}),/(task_risk_assessment_required|risk_admission_required|procedure_composition_pin_invalid|procedure_composition_required)/);
  const viewer=await prisma.user.create({data:{email:"risk-viewer@example.test",passwordHash:"synthetic-not-a-login"}});
  await prisma.workspaceMembership.create({data:{workspaceId,userId:viewer.id,role:"viewer"}});
  const {createAuthToken}=await import("../auth/token"),viewerAuth={Authorization:`Bearer ${createAuthToken({workspaceId,userId:viewer.id})}`};
  assert.equal((await request(route,{headers:viewerAuth})).status,200);
  assert.equal((await post(`${route}/scope`,{},viewerAuth)).status,403);
  const key=await post("/v1/api-keys",{name:"Risk denied integration",profileId:"mcp_codex_worker"});
  assert.equal((await post(`${route}/scope`,{}, {"X-API-Key":(key.body as any).data.key})).status,403);

  const other=await registerOwner("native-risk-other@example.test","Other risk workspace");
  assert.equal((await request(route,{headers:{Authorization:`Bearer ${other.token}`}})).status,404);
 });
 assert.equal((await scope()).status,200);
 for(const dimension of ["money","data","security","availability","legal","reversibility","users"])await t.test(`database computes maximum ${dimension}`,async()=>{
  const e=entry();e.dimensions[dimension]!.level="high";
  const r=await post(`${route}/assessments`,await command([e]));assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal((r.body as any).data.history[0].result.level,"high");assert.ok((r.body as any).data.currentId);
  const stored=await prisma.taskRiskAssessment.findUniqueOrThrow({where:{id:(r.body as any).data.currentId}});
  assert.equal((stored.sources as any)[0].applicationVersion,app.updatedAt.toISOString());
  assert.equal((stored.sources as any)[0].componentVersion,f.component.updatedAt.toISOString());
 });
 await t.test("missing dimensions and forged result fail; uncertainty and contradictions remain non-admitting",async()=>{
  const missing:any=entry();delete missing.dimensions.legal;
  assert.equal((await post(`${route}/assessments`,await command([missing]))).status,400);
  assert.equal((await post(`${route}/assessments`,await command([entry()],{level:"low"}))).status,400);
  const e=entry();e.uncertainty.level="bounded";
  let r=await post(`${route}/assessments`,await command([e]));assert.equal((r.body as any).data.history[0].result.level,"medium");
  e.uncertainty.level="unverifiable";r=await post(`${route}/assessments`,await command([e]));assert.equal((r.body as any).data.currentId,null);
  e.uncertainty.level="none";e.contradictions=["Synthetic conflicting impact evidence"];
  r=await post(`${route}/assessments`,await command([e]));assert.equal((r.body as any).data.currentId,null);
 });
 await t.test("append-only history, exact replay, stale writes and concurrent replacement",async()=>{
  const beforeVersion=((await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth})).body as any).data.editor.submissionVersion;
  const body=await command();const r=await post(`${route}/assessments`,body);assert.equal(r.status,200);
  const afterVersion=((await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth})).body as any).data.editor.submissionVersion;
  assert.notEqual(afterVersion,beforeVersion,"a new assessment permits a new explicit Submit after an earlier missing-risk receipt");
  const id=(r.body as any).data.currentId,count=await prisma.taskRiskAssessment.count({where:{workspaceId}});
  assert.equal((await post(`${route}/assessments`,body)).status,200);
  assert.equal(await prisma.taskRiskAssessment.count({where:{workspaceId}}),count);
  const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
  const code="const {createApp}=require('./dist/app');const server=createApp().listen(0,'127.0.0.1',async()=>{const x=JSON.parse(process.env.FIXTURE_REQUEST);const r=await fetch('http://127.0.0.1:'+server.address().port+x.path,{method:'POST',headers:{'Content-Type':'application/json',...x.auth},body:JSON.stringify(x.body)});const data=await r.json();console.log(JSON.stringify({status:r.status,currentId:data.data?.currentId}));server.close(()=>process.exit());});";
  const restarted=await promisify(execFile)(process.execPath,["-e",code],{windowsHide:true,env:{...process.env,FIXTURE_REQUEST:JSON.stringify({path:route+"/assessments",auth,body})}});
  assert.deepEqual(JSON.parse(restarted.stdout.trim()),{status:200,currentId:id});

  assert.equal((await post(`${route}/assessments`,{...body,jointRationale:"Changed retry input"})).status,409);
  assert.equal((await post(`${route}/assessments`,{...body,requestId:randomUUID()})).status,409);
  await assert.rejects(()=>prisma.taskRiskAssessment.update({where:{id},data:{jointRationale:"Overwrite attempt"}}));
  await assert.rejects(()=>prisma.taskRiskAssessment.delete({where:{id}}));
  const next=await command(),responses=await Promise.all([post(`${route}/assessments`,next),post(`${route}/assessments`,{...next,requestId:randomUUID()})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 });
 await t.test("accepted context binds assessment and evidence changes fence Ready durably",async()=>{
  await post(`${route}/assessments`,await command());
  await prepareAdmissionFixture(route.replace(/\/risk$/,"/risk-admission"),f.input,auth);
  const editor=((await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness?editor=1&applicationId=${app.id}`,{headers:auth})).body as any).data.editor;
  const accepted=await post(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`,{...f.input,requestId:randomUUID(),expectedVersion:editor.submissionVersion});
  assert.equal(accepted.status,200,JSON.stringify(accepted.body));
  const before=await prisma.task.findUniqueOrThrow({where:{id:task.id}});assert.ok((before.executionReadiness as any).riskAssessmentId);
  await prisma.companyRecord.update({where:{id:ref.id},data:{description:"Synthetic evidence changed"}});
  assert.equal((await get()).currentId,null);
  const changed=await prisma.task.findUniqueOrThrow({where:{id:task.id}});assert.equal((changed.executionReadiness as any).status,"needs_revalidation");
  assert.equal((await post(`${route}/assessments`,await command())).status,409);
  await prisma.companyRecord.update({where:{id:ref.id},data:{description:"Synthetic accepted context"}});
  assert.equal((await get()).currentId,null);
  ref.revision=(await prisma.companyRecord.findUniqueOrThrow({where:{id:ref.id}})).updatedAt.toISOString();
 });
 await t.test("contract edits outside the risk form invalidate assessment and exact revert does not restore it",async()=>{
  const assessed=await post(`${route}/assessments`,await command());assert.equal(assessed.status,200);assert.ok((await get()).currentId);
  const old=await prisma.task.findUniqueOrThrow({where:{id:task.id}});
  const changed=structuredClone(f.input.contract);changed.scope.allowed=["A changed synthetic scope"];
  await prisma.task.update({where:{id:task.id},data:{executionReadiness:{...(old.executionReadiness as any),status:"draft",contract:changed}}});
  assert.equal((await get()).currentId,null);
  await prisma.task.update({where:{id:task.id},data:{executionReadiness:{...(old.executionReadiness as any),status:"draft",contract:f.input.contract}}});
  assert.equal((await get()).currentId,null);
 });
 await t.test("component and explicit release grouping includes pending changes but excludes unrelated tasks",async()=>{
  const peer=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Synthetic peer task"}}),p=await prepareReadyFixture(workspaceId,peer.id,app.id,auth,false),peerRoute=`/v1/agent-runtime/tasks/${peer.id}/risk`;
  assert.equal((await get()).members.length,1);
  p.input.contract.singleTask.component=f.input.contract.singleTask.component;p.input.contract.singleTask.problems[0].componentId=f.component.id;
  assert.equal((await scope(peerRoute,p.input)).status,200);
  assert.equal((await get()).members.length,2);
  assert.equal((await post(`${route}/assessments`,await command())).status,409);
  const joint=await post(`${route}/assessments`,await command([entry(),entry(peer.id)]));assert.equal(joint.status,200,JSON.stringify(joint.body));
  assert.equal((joint.body as any).data.history[0].result.level,"medium");
  assert.equal((await get(peerRoute)).currentId,(joint.body as any).data.currentId);
  const release=await prisma.companyRecord.create({data:{workspaceId,applicationId:app.id,recordType:"requirement",key:`release-${randomUUID()}`,title:"Synthetic explicit release set",description:"Common fixture change set"}});
  const releaseRef={id:release.id,revision:release.updatedAt.toISOString()};
  p.input.contract.singleTask.component={id:p.component.id,revision:p.component.updatedAt.toISOString()};p.input.contract.singleTask.problems[0].componentId=p.component.id;
  assert.equal((await scope(peerRoute,p.input,releaseRef)).status,200);
  assert.equal((await get()).members.length,1);
  assert.equal((await scope(route,f.input,releaseRef)).status,200);
  assert.equal((await get()).members.length,2);
  const foreign=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Unrelated pending objective"}});
  assert.equal((await get()).members.some((m:any)=>m.id===foreign.id),false);
  await prisma.task.createMany({data:Array.from({length:50},(_,i)=>({workspaceId,projectId:project.id,goalId:f.goal.id,title:`Synthetic bounded group member ${i}`}))});
  const overflow=await get();assert.equal(overflow.members.length,51);assert.ok(overflow.blockers.includes("group_limit"));
  assert.equal((await post(`${route}/assessments`,await command([entry(),entry(peer.id)]))).status,409);

 });
});
async function prepareReadyFixture(workspaceId: string, taskId: string, applicationId: string, auth: Record<string, string>, accept = true) {
  const { validPacketFixture } = await new Function("specifier", "return import(specifier)")(pathToFileURL(path.resolve("scripts/fixtures/execution-packet.mjs")).href);
  const f = validPacketFixture();
  const admissionResources=await admissionFixtureResources(applicationId);
  if(admissionResources) f.packet.contract.procedures={items:[{id:admissionResources.procedure.id,revision:String(admissionResources.procedure.version)}],noneReason:null};
  const goal = await prisma.goal.create({ data: { workspaceId, title: "Synthetic accepted goal" } });
  const agent = await prisma.workforceEntity.create({ data: { workspaceId, name: "Synthetic engineer", slug: `fixture-${taskId}`, type: "agent", role: "engineer", skillIndex: ["javascript"], toolIndex: f.packet.contract.access.tools, authorityScope: f.packet.contract.access.permissions } });
  await prisma.task.update({ where: { id: taskId }, data: { goalId: goal.id, assignedWorkforceEntityId: agent.id } });
  if (!await prisma.applicationRepository.count({ where: { applicationId } })) await prisma.applicationRepository.create({ data: { applicationId, name: "Synthetic repository", url: "https://github.com/example/fixture.git", isPrimary: true } });
  const sources = [];
  for (const category of ["company", "product", "technical"]) {
    const source = await prisma.companyRecord.create({ data: { workspaceId, applicationId: category === "company" ? null : applicationId, recordType: "requirement", key: `${category}-${taskId}`, title: `Synthetic ${category}`, description: "Synthetic accepted context" } });
    sources.push(source);
    f.packet.contract.context[category] = [{ id: source.id, revision: source.updatedAt.toISOString() }];
  }
  f.packet.contract.objective.goalId = goal.id;
  f.packet.contract.assignment.agentId = agent.id;
  const manager = await prisma.workforceEntity.create({ data: { workspaceId, name: "Synthetic accountable manager", slug: `manager-${taskId}`, type: "agent", role: "manager", authorityScope: ["task_accountability"] } });
  const verifier = await prisma.workforceEntity.create({ data: { workspaceId, name: "Synthetic verifier", slug: `verifier-${taskId}`, type: "agent", role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
  const releaser = await prisma.workforceEntity.create({ data: { workspaceId, name: "Synthetic releaser", slug: `releaser-${taskId}`, type: "agent", role: "release manager", authorityScope: ["release_authorization"] } });
  const component = await prisma.applicationArchitectureComponent.create({ data: { applicationId, name: "Synthetic target component", type: "backend" } });
  f.packet.contract.singleTask = { ...f.packet.contract.singleTask, contractId: `roost-task:${taskId}`, branch: `codex/task-${taskId}`, applicationId,
    component: { id: component.id, revision: component.updatedAt.toISOString() }, accountableManager: { id: manager.id, revision: manager.updatedAt.toISOString() },
    problems: [{ ...f.packet.contract.singleTask.problems[0], componentId: component.id }] };
  const editor = (await request(`/v1/agent-runtime/tasks/${taskId}/execution-readiness?editor=1&applicationId=${applicationId}`, { headers: auth })).body as any;
  const ref = (item: { id: string; updatedAt: Date }) => ({ id: item.id, revision: item.updatedAt.toISOString() });
  f.packet.contract.taskRoles = { schemaVersion: "roost-task-roles-v1", requester: { id: editor.data.editor.requester.id, revision: editor.data.editor.requester.revision }, accountableManager: ref(manager), executor: ref(agent), verifier: ref(verifier), releaser: ref(releaser) };
  const input = { applicationId, contract: f.packet.contract };
  if (!accept) return { input, sources, goal, agent, manager, component, verifier, releaser, readiness: { revision: "", pinId: "" } };
  const route = `/v1/agent-runtime/tasks/${taskId}/actions/submit-for-execution`;
  const ready = await request(route, { method: "POST", headers: auth, body: JSON.stringify(await submissionInput(route, input, auth)) });
  assert.equal(ready.status, 200, JSON.stringify(ready.body));
  return { input, sources, goal, agent, manager, component, verifier, releaser, readiness: (await fixtureExecutionMetadata(taskId)).readyContextPin };
}

test("explicit task roles enforce identity, provenance and independent admission", async t => {
  const owner = await registerOwner("role-owner@example.test", "Role admission fixture"), workspaceId = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({ data: { workspaceId, name: "Role fixture app", slug: "role-fixture" } });
  const project = await prisma.project.create({ data: { workspaceId, name: "Role fixture project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: "Repair one fixture" } });
  const f = await prepareReadyFixture(workspaceId, task.id, application.id, auth, false);
  const route = `/v1/agent-runtime/tasks/${task.id}`, command = `${route}/actions/submit-for-execution`;
  const post = (url: string, body: any, headers: Record<string, string> = auth) => request(url, { method: "POST", headers, body: JSON.stringify(body) });
  const submit = async (contract = f.input.contract) => post(command, await submissionInput(command, { ...f.input, contract }, auth));
  const read = () => prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  const ref = (item: { id: string; updatedAt: Date }) => ({ id: item.id, revision: item.updatedAt.toISOString() });
  await t.test("legacy input stays editable, with no invented requester or Ready", async () => {
    const { taskRoles, ...legacy } = f.input.contract;
    assert.equal((await submit(legacy)).status, 409);
    assert.equal((await read()).executionRoleProvenance, null);
    assert.equal(((await read()).executionReadiness as any).status, "needs_context");
  });
  await t.test("acceptance records immutable origin, canonical roles and idempotent evidence", async () => {
    const input = await submissionInput(command, f.input, auth);
    assert.equal((await post(command, input)).status, 200);
    const accepted = await read(), provenance = accepted.executionRoleProvenance as any;
    assert.equal(provenance.requesterUserId, f.input.contract.taskRoles.requester.id);
    assert.equal(provenance.originatingSubmissionId, input.requestId);
    assert.ok(provenance.authors.some((p: any) => p.kind === "agent" && p.id === f.agent.id));
    assert.equal((await post(command, input)).status, 200);
    assert.deepEqual((await read()).executionReadiness, accepted.executionReadiness);
    const event = await prisma.event.findFirstOrThrow({ where: { taskId: task.id, type: "task_execution_ready" } });
    assert.deepEqual((event.payload as any).taskRoles, f.input.contract.taskRoles);
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { executionRoleProvenance: Prisma.DbNull } }), /task_role_provenance_immutable/);
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { executionRoleProvenance: { ...provenance, requesterUserId: f.agent.id } } }), /task_role_provenance_immutable/);
    const changed = structuredClone(accepted.executionReadiness) as any; changed.contract.taskRoles.verifier = changed.contract.taskRoles.executor;
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { executionReadiness: changed } }), /task_role_independence_required|task_submit_for_execution_required/);
  });
  for (const [name, mutate] of Object.entries({
    selfReview: (c: any) => { c.taskRoles.verifier = c.taskRoles.executor; },
    selfRelease: (c: any) => { c.taskRoles.releaser = c.taskRoles.executor; },
    missing: (c: any) => { delete c.taskRoles.verifier; },
    ambiguous: (c: any) => { c.taskRoles.releaser = [c.taskRoles.releaser]; },
    stale: (c: any) => { c.taskRoles.verifier.revision = "stale"; },
    requesterReplacement: (c: any) => { c.taskRoles.requester.id = f.agent.id; },
    executorMismatch: (c: any) => { c.taskRoles.executor = c.taskRoles.verifier; },
    managerMismatch: (c: any) => { c.taskRoles.accountableManager = c.taskRoles.releaser; }
  })) await t.test(`reject ${name} with Needs context`, async () => {
    const c = structuredClone(f.input.contract); mutate(c);
    const response = await submit(c); assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(((await read()).executionReadiness as any).status, "needs_context");
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 0);
  });
  await t.test("current profile, mandates, skills and workspace must resolve", async () => {
    const other = await registerOwner("role-foreign@example.test", "Foreign role fixture");
    const worker = await prisma.workforceEntity.create({ data: { workspaceId: other.workspace.id, name: "Foreign verifier", slug: "foreign-verifier", type: "agent", role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
    const foreign = structuredClone(f.input.contract); foreign.taskRoles.verifier = ref(worker); assert.equal((await submit(foreign)).status, 409);
    for (const data of [{ status: "inactive" as const }, { role: null }, { skillIndex: [] }, { authorityScope: [] }]) {
      const changed = await prisma.workforceEntity.update({ where: { id: f.verifier.id }, data });
      const c = structuredClone(f.input.contract); c.taskRoles.verifier = ref(changed); assert.equal((await submit(c)).status, 409);
      const restored = await prisma.workforceEntity.update({ where: { id: f.verifier.id }, data: { status: "active", role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
      f.input.contract.taskRoles.verifier = ref(restored);
    }
  });
  await t.test("human aliases cannot self-review; membership removal invalidates human review", async () => {
    const memberId = f.input.contract.taskRoles.requester.id;
    const ownProfile = await prisma.workforceEntity.findFirstOrThrow({ where: { workspaceId, source: "user", externalId: memberId } });
    const own = await prisma.workforceEntity.update({ where: { id: ownProfile.id }, data: { role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification", "release_authorization"] } });
    for (const name of ["verifier", "releaser"]) { const c = structuredClone(f.input.contract); c.taskRoles[name] = ref(own); assert.equal((await submit(c)).status, 409); }
    const member = await prisma.user.create({ data: { email: "independent-member@example.test", name: "Independent member", passwordHash: "synthetic-not-a-login" } });
    const membership = await prisma.workspaceMembership.create({ data: { workspaceId, userId: member.id, role: "member" } });
    const human = await prisma.workforceEntity.create({ data: { workspaceId, name: "Independent human", slug: "independent-human", type: "human", source: "user", externalId: member.id, role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
    const c = structuredClone(f.input.contract); c.taskRoles.verifier = ref(human); assert.equal((await submit(c)).status, 200);
    const reviewed = await submissionInput(command, { ...f.input, contract: c }, auth);
    await prisma.workspaceMembership.delete({ where: { id: membership.id } });
    assert.equal(((await read()).executionReadiness as any).status, "needs_revalidation");
    assert.equal((await post(command, reviewed)).status, 409);
    assert.equal((await submit(c)).status, 409);
  });
  await t.test("later author cannot be laundered into verifier and requester stays fixed", async () => {
    const user = await prisma.user.create({ data: { email: "later-author@example.test", name: "Later contract author", passwordHash: "synthetic-not-a-login" } });
    await prisma.workspaceMembership.create({ data: { workspaceId, userId: user.id, role: "member" } });
    const profile = await prisma.workforceEntity.create({ data: { workspaceId, name: "Later author profile", slug: "later-author", type: "human", source: "user", externalId: user.id, role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
    const { readyTransaction, submitReady, submissionVersion } = await import("../modules/agent-runtime/task-execution-readiness");
    await prepareRiskFixture(`/v1/agent-runtime/tasks/${task.id}/risk`,f.input,auth);
    const result = await readyTransaction(async tx => submitReady(tx, workspaceId, task.id, { ...f.input, requestId: randomUUID(), expectedVersion: await submissionVersion(tx, workspaceId, task.id, application.id) }, { requestedByType: "user", requestedById: user.id }));
    assert.equal("error" in result, false, JSON.stringify(result));
    const provenance = (await read()).executionRoleProvenance as any;
    assert.equal(provenance.requesterUserId, f.input.contract.taskRoles.requester.id);
    assert.ok(provenance.authors.some((p: any) => p.kind === "user" && p.id === user.id));
    const c = structuredClone(f.input.contract); c.taskRoles.verifier = ref(profile); assert.equal((await submit(c)).status, 409);
  });
  await t.test("ordinary assignment edits invalidate Ready and preserve role origin", async () => {
    assert.equal((await submit()).status, 200);
    const provenance = (await read()).executionRoleProvenance;
    await prisma.task.update({ where: { id: task.id }, data: { assignedWorkforceEntityId: f.verifier.id } });
    assert.equal(((await read()).executionReadiness as any).status, "needs_revalidation");
    assert.deepEqual((await read()).executionRoleProvenance, provenance);
    assert.equal((await submit()).status, 409);
    await prisma.task.update({ where: { id: task.id }, data: { assignedWorkforceEntityId: f.agent.id } });
  });
  await t.test("role changes after Ready block claim without creating an attempt", async () => {
    assert.equal((await submit()).status, 200);
    process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
    try {
      const queued = await post("/v1/agent-runtime/executions", { taskId: task.id, applicationId: application.id }); assert.equal(queued.status, 201, JSON.stringify(queued.body));
      const key = await post("/v1/api-keys", { name: "Role test host", profileId: "mcp_codex_worker" }); const worker = { "X-API-Key": (key.body as any).data.key, ...hostProtocolHeaders };
      await post("/v1/agent-runtime/hosts/register", { name: "Role host", slug: "role-host", platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities }, worker);
      await prisma.workforceEntity.update({ where: { id: f.releaser.id }, data: { status: "inactive" } });
      assert.equal(((await read()).executionReadiness as any).status, "needs_revalidation");
      assert.equal((await post("/v1/agent-runtime/executions/claim", { hostSlug: "role-host" }, worker)).status, 409);
      const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: (queued.body as any).data.id } }); assert.equal(execution.attempt, 0); assert.equal(execution.leaseToken, null);
    } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
  });
});

async function prepareHandoffResultFixture(execution:any,pin:any){
 await prisma.agentExecution.update({where:{id:execution.id},data:{checkpointVersion:5,checkpoint:{schemaVersion:"roost-recovery-v1",stage:"effect_possible",sessionId:randomUUID(),packetRevision:"b".repeat(64),workspaceDigest:"c".repeat(64),contextRevision:pin.revision},metadata:{...execution.metadata,resultRevision:{schemaVersion:"roost-result-revision-v1",id:randomUUID(),executionId:execution.id,attempt:execution.attempt,hostId:execution.agentHostId,checkpointVersion:5,observedAt:new Date().toISOString(),commit:"d".repeat(40),branch:pin.contract.singleTask.branch,workingTree:"dirty"}}}});
}
let reviewFixtureSequence=0;
  async function prepareReviewFixture(agentMode = false, autoGrants = true, handoff = false) {
    const suffix = `${Date.now()}-${reviewFixtureSequence++}`;
    const owner = await registerOwner(`review-${suffix}@example.test`, "Review fixture"), workspaceId = owner.workspace.id;
    const auth = { Authorization: `Bearer ${owner.token}` };
    const app = await prisma.application.create({ data: { workspaceId, name: "Review fixture app", slug: `review-${suffix}` } });
    const project = await prisma.project.create({ data: { workspaceId, name: "Review fixture project" } });
    await prisma.applicationProject.create({ data: { applicationId: app.id, projectId: project.id } });
    const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: "Repair fixture parser" } });
    const f = await prepareReadyFixture(workspaceId, task.id, app.id, auth, false);
    const manager = await prisma.workforceEntity.findFirstOrThrow({ where: { workspaceId, type: "human", source: "user", externalId: f.input.contract.taskRoles.requester.id } });
    const managerProfile = agentMode ? f.manager : await prisma.workforceEntity.update({ where: { id: manager.id }, data: { role: "accountable manager", authorityScope: ["task_accountability"] } });
    const user = await prisma.user.create({ data: { email: `verifier-${suffix}@example.test`, name: "Independent reviewer", passwordHash: "synthetic-not-a-login" } });
    await prisma.workspaceMembership.create({ data: { workspaceId, userId: user.id, role: "member" } });
    const verifier = agentMode ? f.verifier : await prisma.workforceEntity.create({ data: { workspaceId, name: "Independent reviewer", slug: `verifier-${suffix}`, type: "human", source: "user", externalId: user.id, role: "reviewer", skillIndex: ["javascript"], authorityScope: ["task_verification"] } });
    const { createAuthToken } = await import("../auth/token");
    let reviewerAuth: Record<string,string> = { Authorization: `Bearer ${createAuthToken({ userId: user.id, workspaceId })}` };
    const ref = (w: any) => ({ id: w.id, revision: w.updatedAt.toISOString() });
    f.input.contract.singleTask.accountableManager = ref(managerProfile); f.input.contract.taskRoles.accountableManager = ref(managerProfile); f.input.contract.taskRoles.verifier = ref(verifier);
    const issue = async (agentId: string, name = "Fixture credential") => {
      const body = { requestId: randomUUID(), agentId, name, expiresAt: new Date(Date.now()+86400000).toISOString() };
      const response = await request("/v1/api-keys/agent-credentials", { method: "POST", headers: auth, body: JSON.stringify(body) });
      assert.equal(response.status, 201, JSON.stringify(response.body));
      return { ...(response.body as any).data, body };
    };
    const verifierKey = agentMode ? await issue(verifier.id) : null;
    const managerKey = agentMode ? await issue(managerProfile.id) : null;
    if (agentMode) reviewerAuth = { "X-API-Key": verifierKey.key };
    const root = `/v1/agent-runtime/tasks/${task.id}`;
    const post = (url: string, body: any, headers: Record<string,string> = auth) => request(url, { method: "POST", headers, body: JSON.stringify(body) });
    const submitRoute = `${root}/actions/submit-for-execution`;
    if(handoff)handoffFixtureInputs.add(f.input);
    const accepted = await post(submitRoute, await submissionInput(submitRoute, f.input, auth)); assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    const pin = (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any;
    const execution = await prisma.agentExecution.create({ data: { workspaceId, taskId: task.id, applicationId: app.id, status: "completed", requestedByType: "user", requestedById: manager.externalId, attempt: 1, startedAt: new Date(Date.now()-1000), completedAt: new Date(), summary: "Parser result", finalResponse: "Changed empty-input handling", changedFiles: ["src/parser.ts"], verification: { command: "npm test -- parser", result: "fixture completed" }, metadata: { executionContract: f.input.contract, readyContextPin: { pinId: pin.pinId, revision: pin.revision, compositionSeal:pin.procedureComposition.seal, riskAdmissionSeal:pin.riskAdmissionSeal, riskAdmissionCommit:pin.riskAdmissionCommit } } } });
    if(handoff)await prepareHandoffResultFixture(execution,pin);
    const view = async (headers = reviewerAuth) => (await request(`${root}/review`, { headers })).body as any;
    const grants: Record<string,string> = {};
    const grant = async (operation = "review_decision", overrides: any = {}) => {
      const catalog = await request(root+"/capability-grants",{headers:auth}); assert.equal(catalog.status,200,JSON.stringify(catalog.body));
      const data=(catalog.body as any).data, option=data.options.find((o:any)=>o.operation===operation);
      const body={requestId:randomUUID(),expectedVersion:data.expectedVersion,credentialId:option?.credentialId,operation,validFrom:new Date().toISOString(),validUntil:new Date(Date.now()+1800000).toISOString(),reason:"Review this exact result",...overrides};
      const response=await post(root+"/capability-grants",body); return {response,body};
    };
    const grantFor = async (operation: string) => {
      if (!agentMode || !autoGrants) return {};
      if (!grants[operation]) { const r=await grant(operation);assert.equal(r.response.status,201,JSON.stringify(r.response.body));grants[operation]=(r.response.body as any).data.grant.id; }
      return {grantId:grants[operation]};
    };
    const rejection = async () => { const capability=await grantFor("review_decision"), s = (await view()).data; return {...capability, requestId: randomUUID(), expectedVersion: s.expectedVersion, executionId: execution.id, materialVersion: s.materialVersion, decision: "reject", summary: "Empty input throws", reproduction: ["Run the empty parser fixture"], expected: "A validation message", observed: "An exception is thrown", evidence: [{ kind: "test", reference: "npm test -- parser", result: "Empty input fails" }], correction: { scope: ["Handle empty parser input"], excluded: ["Do not change other parser behavior"], outcome: "Empty input returns a validation message", competencies: ["javascript"] } }; };
    const reject = async () => { const body = await rejection(); const r = await post(`${root}/actions/review`, body, reviewerAuth); assert.equal(r.status, 200, JSON.stringify(r.body)); return body; };
    const action = async (kind = "return_to_executor") => { const capability=await grantFor(kind), s = (await view(auth)).data; return {...capability, requestId: randomUUID(), expectedVersion: s.expectedVersion, reviewId: s.decision.id, action: kind, scope: ["Handle empty parser input"] }; };
    return { ...f, grant, issue, verifierKey, managerKey, auth, workspaceId, task, app, execution, root, post, view, rejection, reject, action, reviewerAuth, verifier, user, submitRoute };
  }

const handoffFixtureContent=()=>({outcome:{summary:"Parser fixture ready",currentState:"Completed synthetic implementation"},decisions:{explanation:"Inspect the current recorded mandates"},changes:{areas:["Parser input validation"]},tests:{assessment:"Synthetic parser test report recorded"},limits:{knownLimitations:"No production behavior evaluated",residualRisks:"External integration remains untested"},continuation:{reproduce:"Run the isolated parser fixture",continue:"Inspect the reported test and path",rollback:"Revert the isolated fixture change"},expectedAction:{kind:"inspect",instruction:"Confirm receipt of this exact parser result"}});
test("typed handoff binds source and recipient with immutable acceptance", async () => {
  const f=await prepareReviewFixture(false,false,true),root=f.root+"/handoffs";
  const read=async(headers:Record<string,string>=f.auth)=>{const r=await request(root,{headers});assert.equal(r.status,200,JSON.stringify(r.body));return (r.body as any).data;};
  const s=await read();assert.equal(s.canCreate,true,JSON.stringify(s));assert.ok(s.source.packetRevision);assert.equal(s.source.commit,"d".repeat(40));assert.equal(s.source.workingTree,"dirty");assert.notEqual(s.source.baseCommit,s.source.commit);assert.equal(s.source.resultRevision.executionId,f.execution.id);assert.ok(s.source.evidence[0].evidenceId);assert.equal(s.source.tests.kind,"execution_verification");assert.equal(s.source.tests.executionId,f.execution.id);assert.match(s.source.tests.revision,/^[a-f0-9]{64}$/);
  for(const [verification,state] of [[{commands:[]},"not_recorded"],[{commands:[{command:"npm test",status:"completed",exitCode:0}]},"reported"],[{commands:[{command:"npm test",status:"completed",exitCode:"0"}]},null],[{unstructured:"Tests passed"},null]] as const){
   const result=(await prisma.$queryRaw<any[]>`SELECT task_handoff_tests(jsonb_populate_record(NULL::agent_executions,jsonb_build_object('id',${f.execution.id}::text,'verification',${JSON.stringify(verification)}::jsonb))) AS value`)[0].value;
   assert.equal(result?.state??null,state);
  }
  const recipient=s.recipients.find((r:any)=>r.role==="verifier");
  const content=handoffFixtureContent();
  const body={requestId:randomUUID(),expectedVersion:s.expectedVersion,sourceVersion:s.sourceVersion,senderRole:"accountableManager",recipientRole:recipient.role,recipient:recipient.principal,supersedes:null,content};
  const before=await prisma.task.findUniqueOrThrow({where:{id:f.task.id}});
  const created=await f.post(root,body);assert.equal(created.status,201,JSON.stringify(created.body));const h=(created.body as any).data.record;
  assert.equal((await f.post(root,body)).status,200);
  const v=await read(f.reviewerAuth);assert.equal(v.history[0].canAccept,true);
  const decision={requestId:randomUUID(),expectedVersion:v.expectedVersion,handoffId:h.id,handoffVersion:h.version,decision:"accept"};
  assert.equal((await f.post(root+"/actions/accept",decision,f.auth)).status,403);
  const accepted=await f.post(root+"/actions/accept",decision,f.reviewerAuth);assert.equal(accepted.status,201,JSON.stringify(accepted.body));
  assert.equal((await f.post(root+"/actions/accept",decision,f.reviewerAuth)).status,200);
  assert.deepEqual(await prisma.task.findUniqueOrThrow({where:{id:f.task.id}}),before);
  assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
  await assert.rejects(prisma.$executeRaw`INSERT INTO task_handoffs SELECT (jsonb_populate_record(NULL::task_handoffs,to_jsonb(h)||jsonb_build_object('id',${randomUUID()}::text,'version',2,'request_id',${randomUUID()}::text,'source',h.source||jsonb_build_object('commit',repeat('f',40))))).* FROM task_handoffs h WHERE id=${h.id}::uuid`,/task_handoff_scope_invalid/);
  await assert.rejects(prisma.$executeRaw`UPDATE task_handoffs SET content='{}' WHERE id=${h.id}::uuid`,/task_handoff_immutable/);
  await assert.rejects(prisma.$executeRaw`DELETE FROM task_handoff_decisions WHERE handoff_id=${h.id}::uuid`,/task_handoff_immutable/);
  const completed=await prisma.agentExecution.findUniqueOrThrow({where:{id:f.execution.id}}),metadata=completed.metadata as any;
  for(const revision of [null,{...metadata.resultRevision,executionId:randomUUID()},{...metadata.resultRevision,attempt:2},{...metadata.resultRevision,checkpointVersion:4},{...metadata.resultRevision,branch:"main"},{...metadata.resultRevision,workingTree:"unknown"}]){
   await prisma.agentExecution.update({where:{id:completed.id},data:{metadata:{...metadata,resultRevision:revision}}});
   assert.equal((await prisma.$queryRaw<any[]>`SELECT task_handoff_source(${f.task.id}::uuid) AS source`)[0].source,null);
  }
  await prisma.agentExecution.update({where:{id:completed.id},data:{metadata}});
  const restored=await read();assert.ok(restored.source);assert.notEqual(restored.sourceVersion,s.sourceVersion);assert.equal(restored.history[0].current,false);assert.equal(restored.history[0].decision.decision,"accept");

});

async function prepareHandoffFixture(agentMode=false) {
 const f=await prepareReviewFixture(agentMode,false,true),root=f.root+"/handoffs",senderAuth:Record<string,string>=agentMode?{"X-API-Key":f.managerKey.key}:f.auth;
 const read=async(headers:Record<string,string>=senderAuth)=>{const r=await request(root,{headers});assert.equal(r.status,200,JSON.stringify(r.body));return (r.body as any).data;};
 const draft=async()=>{const s=await read(),recipient=s.recipients.find((r:any)=>r.role==="verifier");return {requestId:randomUUID(),expectedVersion:s.expectedVersion,sourceVersion:s.sourceVersion,senderRole:"accountableManager",recipientRole:"verifier",recipient:recipient.principal,supersedes:null as string|null,content:handoffFixtureContent()};};
 const grant=async(operation:string,handoffId?:string,overrides:Record<string,unknown>={})=>{
  const r=await request(f.root+"/capability-grants",{headers:f.auth});assert.equal(r.status,200,JSON.stringify(r.body));
  const v=(r.body as any).data,o=v.options.find((o:any)=>o.operation===operation&&(handoffId?o.handoff?.handoffId===handoffId:o.handoff?.role==="accountableManager"&&o.handoff?.recipientRole==="verifier"));assert.ok(o,JSON.stringify(v));
  const g=await f.post(f.root+"/capability-grants",{requestId:randomUUID(),expectedVersion:v.expectedVersion,credentialId:o.credentialId,operation,handoff:o.handoff,validFrom:new Date().toISOString(),validUntil:new Date(Date.now()+1800000).toISOString(),reason:"Exact synthetic handoff operation",...overrides});assert.equal(g.status,201,JSON.stringify(g.body));return (g.body as any).data.grant.id as string;
 };
 return {...f,root,senderAuth,read,draft,handoffGrant:grant};
}

test("typed handoff rejects incomplete references, isolates principals and versions rejected resubmissions", async()=>{
 const f=await prepareHandoffFixture(),input=await f.draft();
 for(const section of Object.keys(input.content)) {
  const body=structuredClone(input) as any;delete body.content[section];assert.equal((await f.post(f.root,body)).status,400,section);
 }
 for(const extra of [{commit:"f".repeat(40)},{tests:[{result:"passed"}]},{source:{...((await f.read()).source),commit:"f".repeat(40)}},{actorAgentId:f.verifier.id}])assert.equal((await f.post(f.root,{...input,...extra})).status,400);
 assert.equal((await f.post(f.root,{...input,sourceVersion:"f".repeat(64)})).status,409);
 assert.equal((await f.post(f.root,{...input,recipientRole:"requester",recipient:{kind:"user",id:f.input.contract.taskRoles.requester.id}})).status,403);
 const outsider=await registerOwner(`handoff-outsider-${randomUUID()}@example.test`,"Other fixture");
 assert.equal((await request(f.root,{headers:{Authorization:`Bearer ${outsider.token}`}})).status,404);
 assert.equal((await f.post(f.root,{...input,recipient:{kind:"user",id:(await prisma.workspace.findUniqueOrThrow({where:{id:outsider.workspace.id}})).ownerUserId}})).status,403);
 const unsafe={...input,content:{...input.content,continuation:{...input.content.continuation,continue:"password=synthetic-handoff-secret"}}};
 const blocked=await f.post(f.root,unsafe);assert.equal(blocked.status,409);assert.ok(!JSON.stringify(blocked.body).includes("synthetic-handoff-secret"));
 assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS count FROM task_handoffs WHERE task_id=${f.task.id}::uuid`)[0].count,0);
 const created=await f.post(f.root,input);assert.equal(created.status,201,JSON.stringify(created.body));const h=(created.body as any).data.record;
 const d={requestId:randomUUID(),expectedVersion:(await f.read(f.reviewerAuth)).expectedVersion,handoffId:h.id,handoffVersion:h.version,decision:"reject",code:"insufficient_evidence",reason:"Missing independent reproduction detail",sections:["tests","continuation"]};
 assert.equal((await f.post(f.root+"/actions/reject",{...d,sections:[]},f.reviewerAuth)).status,400);
 assert.equal((await f.post(f.root+"/actions/reject",{...d,handoffVersion:99},f.reviewerAuth)).status,409);
 assert.equal((await f.post(f.root+"/actions/reject",d,f.reviewerAuth)).status,201);
 assert.equal((await f.post(f.root+"/actions/reject",d,f.reviewerAuth)).status,200);
 assert.equal((await f.post(f.root+"/actions/reject",{...d,requestId:randomUUID()},f.reviewerAuth)).status,409);
 const next={...await f.draft(),supersedes:h.id};next.content.tests.assessment="Additional fixture reproduction documented";
 const race=await Promise.all([f.post(f.root,next),f.post(f.root,{...next,requestId:randomUUID()})]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
 const history=(await f.read()).history;assert.equal(history.length,2);assert.equal(history[0].supersedes,h.id);assert.equal(history[1].content.tests.assessment,input.content.tests.assessment);
 const receipt={requestId:randomUUID(),expectedVersion:(await f.read(f.reviewerAuth)).expectedVersion,handoffId:history[0].id,handoffVersion:history[0].version,decision:"accept"};
 const before=await prisma.agentExecution.findUniqueOrThrow({where:{id:f.execution.id}});
 await prisma.agentExecution.update({where:{id:f.execution.id},data:{verification:{result:"Changed synthetic report"}}});
 await prisma.agentExecution.update({where:{id:f.execution.id},data:{verification:before.verification!}});
 assert.equal((await f.read()).history[0].current,false);
 assert.equal((await f.post(f.root+"/actions/accept",receipt,f.reviewerAuth)).status,409);
 assert.equal((await f.post(f.root,input)).status,409);
});

test("typed handoff agent grants bind operation, recipient and durable one-use receipts",async()=>{
 const f=await prepareHandoffFixture(true),input=await f.draft();
 assert.equal((await f.post(f.root,input,f.senderAuth)).status,409);
 const createGrant=await f.handoffGrant("handoff_create"),body={...input,grantId:createGrant};
 const created=await f.post(f.root,body,f.senderAuth);assert.equal(created.status,201,JSON.stringify(created.body));const h=(created.body as any).data.record;
 assert.equal((await f.post(f.root,body,f.senderAuth)).status,200);
 assert.equal((await f.post(f.root,{...body,requestId:randomUUID()},f.senderAuth)).status,409);
 const usage=await prisma.taskCapabilityUse.findUniqueOrThrow({where:{grantId:createGrant}});assert.equal(usage.handoffId,h.id);assert.equal(usage.decisionId,null);assert.equal(usage.actionId,null);
 const unusedGrant=await f.handoffGrant("handoff_create");
 await assert.rejects(prisma.$executeRaw`INSERT INTO task_handoffs SELECT (jsonb_populate_record(NULL::task_handoffs,to_jsonb(h)||jsonb_build_object('id',${randomUUID()}::text,'version',2,'request_id',${randomUUID()}::text,'capability_grant_id',${unusedGrant}::text))).* FROM task_handoffs h WHERE id=${h.id}::uuid`,/capability_receipt_required/);
 assert.equal(await prisma.taskCapabilityUse.count({where:{grantId:unusedGrant}}),0);
 const read=await f.read(f.reviewerAuth);assert.equal(read.history[0].canAccept,false);
 const d={requestId:randomUUID(),expectedVersion:read.expectedVersion,handoffId:h.id,handoffVersion:h.version,decision:"accept"};
 assert.equal((await f.post(f.root+"/actions/accept",d,f.reviewerAuth)).status,409);
 const wrongGrant=await f.handoffGrant("handoff_reject",h.id);
 assert.equal((await f.post(f.root+"/actions/accept",{...d,grantId:wrongGrant},f.reviewerAuth)).status,409);
 const acceptGrant=await f.handoffGrant("handoff_accept",h.id),decision={...d,grantId:acceptGrant};
 const responses=await Promise.all([f.post(f.root+"/actions/accept",decision,f.reviewerAuth),f.post(f.root+"/actions/accept",decision,f.reviewerAuth)]);
 assert.equal(responses.filter(r=>r.status===201).length,1,JSON.stringify(responses));assert.ok(responses.every(r=>[200,201,409].includes(r.status)));
 assert.equal((await f.post(f.root+"/actions/accept",decision,f.reviewerAuth)).status,200);
 assert.equal((await prisma.taskCapabilityUse.findUniqueOrThrow({where:{grantId:acceptGrant}})).handoffDecisionId,(responses.find(r=>r.status===201)!.body as any).data.record.id);
 const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
 const code="const {createApp}=require('./dist/app');const server=createApp().listen(0,'127.0.0.1',async()=>{const x=JSON.parse(process.env.FIXTURE_REQUEST);const r=await fetch('http://127.0.0.1:'+server.address().port+x.path,{method:'POST',headers:{'Content-Type':'application/json',...x.auth},body:JSON.stringify(x.body)});const data=await r.json();console.log(JSON.stringify({status:r.status,replayed:data.data?.replayed}));server.close(()=>process.exit());});";
 const restarted=await promisify(execFile)(process.execPath,["-e",code],{windowsHide:true,timeout:15000,env:{...process.env,FIXTURE_REQUEST:JSON.stringify({path:f.root+"/actions/accept",auth:f.reviewerAuth,body:decision})}});
 assert.deepEqual(JSON.parse(restarted.stdout.trim()),{status:200,replayed:true});
 assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
 const incident=await prisma.companyRecord.create({data:{workspaceId:f.workspaceId,recordType:"technical_incident",key:"handoff-synthetic-suspension",title:"Synthetic handoff suspension"}});
 const suspended=await f.post("/v1/agent-runtime/capability-suspensions",{requestId:randomUUID(),incidentId:incident.id,taskId:f.task.id,applicationId:f.app.id,operation:"handoff_accept",agentId:f.verifier.id,credentialId:f.verifierKey.id,reason:"Synthetic exact operation suspension",scopeProof:"Exact receipt scope"});assert.equal(suspended.status,201,JSON.stringify(suspended.body));
 assert.equal((await f.post(f.root+"/actions/accept",decision,f.reviewerAuth)).status,409);
 assert.equal((await prisma.$queryRaw<any[]>`SELECT task_capability_base(g) AS status FROM task_capability_grants g WHERE id=${acceptGrant}::uuid`)[0].status,"suspended");
 for(const route of [f.submitRoute,"/v1/agent-runtime/executions","/v1/agent-runtime/hosts"]){const r=await f.post(route,{},f.reviewerAuth);assert.equal(r.status,403);}
});

test("typed handoff rechecks grant windows, exact recipient and current role authority",async()=>{
 const f=await prepareHandoffFixture(true),input=await f.draft();
 const pending=await f.handoffGrant("handoff_create",undefined,{validFrom:new Date(Date.now()+60000).toISOString()});
 assert.equal((await f.post(f.root,{...input,grantId:pending},f.senderAuth)).status,409);
 await assert.rejects(prisma.$executeRaw`UPDATE task_capability_grants SET valid_until=now()-interval '1 minute' WHERE id=${pending}::uuid`,/capability_history_immutable/);
 // Move only the disposable fixture's clock window; the production guard is
 // tested above and restored within this same isolated transaction.
 await prisma.$transaction(async db=>{
  await db.$executeRaw`ALTER TABLE task_capability_grants DISABLE TRIGGER task_capability_guard`;
  await db.$executeRaw`UPDATE task_capability_grants SET valid_from=now()-interval '2 minutes',valid_until=now()-interval '1 minute' WHERE id=${pending}::uuid`;
  await db.$executeRaw`ALTER TABLE task_capability_grants ENABLE TRIGGER task_capability_guard`;
 });
 assert.equal((await prisma.$queryRaw<any[]>`SELECT task_capability_base(g) AS status FROM task_capability_grants g WHERE id=${pending}::uuid`)[0].status,"expired");
 assert.equal((await f.post(f.root,{...input,grantId:pending},f.senderAuth)).status,409);
 const grantId=await f.handoffGrant("handoff_create"),other=(await f.read()).recipients.find((r:any)=>r.role==="releaser");
 assert.equal((await f.post(f.root,{...input,grantId,recipientRole:other.role,recipient:other.principal},f.senderAuth)).status,409);
 const created=await f.post(f.root,{...input,grantId},f.senderAuth);assert.equal(created.status,201,JSON.stringify(created.body));const h=(created.body as any).data.record;
 const acceptGrant=await f.handoffGrant("handoff_accept",h.id),d={requestId:randomUUID(),expectedVersion:(await f.read(f.reviewerAuth)).expectedVersion,handoffId:h.id,handoffVersion:h.version,decision:"accept",grantId:acceptGrant};
 await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{authorityScope:[]}});
 assert.equal((await f.read()).history[0].current,false);
 assert.equal((await f.post(f.root+"/actions/accept",d,f.reviewerAuth)).status,409);
 assert.equal(await prisma.taskCapabilityUse.count({where:{grantId:acceptGrant}}),0);
});

test("typed handoff requires its own admission while preserving older Ready source references",async()=>{
 const f=await prepareReviewFixture(),pin=(await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).executionReadiness as any;
 await prepareHandoffResultFixture(f.execution,pin);
 const compatible=(await prisma.$queryRaw<any[]>`SELECT task_risk_sources(${f.task.id}::uuid)=(SELECT jsonb_agg(source||jsonb_build_object('compositionRefs',(SELECT jsonb_object_agg(op,task_composition_refs((source->>'taskId')::uuid,op)) FROM unnest(ARRAY['runtime_execute','review_decision','return_to_executor','create_specialist_task']) op)) ORDER BY source->>'taskId') FROM jsonb_array_elements(task_risk_sources_before_composition(${f.task.id}::uuid)) source) AS same`)[0].same;
 assert.equal(compatible,true);
 const read=await request(f.root+"/handoffs",{headers:f.auth});assert.equal(read.status,200,JSON.stringify(read.body));const v=(read.body as any).data;
 assert.ok(v.source);assert.equal(v.canCreate,false);assert.deepEqual(v.operations,{handoff_create:false,handoff_accept:false,handoff_reject:false});
 const recipient=v.recipients.find((r:any)=>r.role==="verifier");
 const r=await f.post(f.root+"/handoffs",{requestId:randomUUID(),expectedVersion:v.expectedVersion,sourceVersion:v.sourceVersion,senderRole:"accountableManager",recipientRole:"verifier",recipient:recipient.principal,supersedes:null,content:handoffFixtureContent()});assert.equal(r.status,409);assert.equal((r.body as any).error,"risk_admission_required");
 assert.equal(((await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).executionReadiness as any).status,"ready");
});

test("native review records decisions and manager returns without implementation side effects", async t => {
  let sequence=0;
  const fixture=prepareReviewFixture;

  await t.test("serious incident suspension narrows authority and independently restores without reviving old grants", async () => {
    const f=await fixture(true,false), original=await f.grant(), grant=(original.response.body as any).data.grant;
    const incident=await prisma.companyRecord.create({data:{workspaceId:f.workspaceId,recordType:"technical_incident",key:"synthetic-serious",title:"Synthetic serious incident"}});
    const root="/v1/agent-runtime/capability-suspensions";
    const catalogRead=await request(root+"/catalog?taskId="+f.task.id,{headers:f.auth});assert.equal(catalogRead.status,200,JSON.stringify(catalogRead.body));
    const choices=(catalogRead.body as any).data.credentialChoices;assert.ok(Array.isArray(choices));assert.ok(choices.some((k:any)=>k.id===f.verifierKey.id));
    assert.equal(JSON.stringify(catalogRead.body).includes(f.verifierKey.key),false);
    assert.equal(await prisma.companyRecord.count({where:{workspaceId:f.workspaceId,source:"runtime_redaction_v1"}}),0);

    const input={requestId:randomUUID(),incidentId:incident.id,taskId:f.task.id,applicationId:f.app.id,operation:"review_decision",agentId:f.verifier.id,credentialId:f.verifierKey.id,reason:"Incorrect review authority detected",scopeProof:"Synthetic audit proves one reviewer credential on this task"};
    assert.equal((await f.post(root,input,f.reviewerAuth)).status,403);
    assert.equal((await f.post(root,{...input,operation:"*"})).status,400);
    const create=await f.post(root,input);assert.equal(create.status,201,JSON.stringify(create.body));
    const id=(create.body as any).data.suspension.id, route=root+"/"+id+"/actions";
    assert.equal((await f.post(root,input)).status,200);
    assert.equal((await f.post(root,{...input,reason:"Changed reason"})).status,409);
    const catalog=(await request(f.root+"/capability-grants",{headers:f.auth})).body as any;
    assert.equal(catalog.data.grants[0].status,"suspended");assert.equal(catalog.data.options.length,0);
    assert.equal((await f.post(f.root+"/capability-grants",{...original.body,requestId:randomUUID()})).status,409);
    assert.equal((await f.post(f.root+"/actions/review",{...await f.rejection(),grantId:grant.id},f.reviewerAuth)).status,409);
    const {suspensionBlocks}=await import("../modules/agent-runtime/capability-suspension");
    assert.equal(await suspensionBlocks(prisma,f.workspaceId,f.task.id,f.app.id,"return_to_executor",f.verifier.id,f.verifierKey.id),false);
    assert.equal(await suspensionBlocks(prisma,f.workspaceId,f.task.id,f.app.id,"review_decision",f.manager.id,f.managerKey.id),false);
    assert.equal(await suspensionBlocks(prisma,randomUUID(),f.task.id,f.app.id,"review_decision",f.verifier.id,f.verifierKey.id),false);
    const ownerUserId=(await prisma.workspace.findUniqueOrThrow({where:{id:f.workspaceId}})).ownerUserId;
    const {createAuthToken}=await import("../auth/token"), independent={Authorization:`Bearer ${createAuthToken({userId:f.user.id,workspaceId:f.workspaceId})}`};
    const evidence={requestId:randomUUID(),expectedVersion:1,action:"evidence",cause:"Incorrect decision condition",impact:"One synthetic review was affected",remediation:"Repaired the decision condition",regressionProof:"Fixture suite verifies rejection and unrelated scope",limitations:"Only native review surfaces verified",repairAuthorUserId:ownerUserId};
    assert.equal((await f.post(route,{...evidence,impact:""})).status,400);
    assert.equal((await f.post(route,{requestId:randomUUID(),expectedVersion:1,action:"restore",evidenceId:randomUUID(),reason:"Missing verification"})).status,409);
    const ev=await f.post(route,evidence);assert.equal(ev.status,200,JSON.stringify(ev.body));const evidenceId=(ev.body as any).data.history[0].id;
    const verify={requestId:randomUUID(),expectedVersion:2,action:"verify",evidenceId,assessment:"Independently reproduced failure and verified fix and limits"};
    assert.equal((await f.post(route,verify)).status,409);
    const checked=await f.post(route,verify,independent);assert.equal(checked.status,200,JSON.stringify(checked.body));
    const restore={requestId:randomUUID(),expectedVersion:3,action:"restore",evidenceId,reason:"Owner accepts independent proof for the exact scope"};
    assert.equal((await f.post(route,restore,independent)).status,403);
    assert.equal((await f.post(route,{...restore,expectedVersion:2})).status,409);
    const restored=await f.post(route,restore);assert.equal(restored.status,200,JSON.stringify(restored.body));assert.equal((restored.body as any).data.suspension.active,false);
    assert.equal((await f.post(route,restore)).status,200);
    assert.equal((await f.post(f.root+"/actions/review",{...await f.rejection(),grantId:grant.id},f.reviewerAuth)).status,409);
    const fresh=await f.grant();assert.equal(fresh.response.status,201,JSON.stringify(fresh.response.body));
    const reopened={requestId:randomUUID(),expectedVersion:4,action:"reopen",reason:"New evidence requires another independent assessment"};
    const race=await Promise.all([f.post(route,reopened),f.post(route,{...reopened,requestId:randomUUID()})]);assert.equal(race.filter(r=>r.status===200).length,1);
    assert.equal((await f.post(route,{...restore,requestId:randomUUID(),expectedVersion:5})).status,409);
    await assert.rejects(prisma.$executeRaw`UPDATE native_suspension_journal SET payload='{}' WHERE suspension_id=${id}::uuid`,/native_suspension_history_immutable/);
    const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
    const code="const {createApp}=require('./dist/app');const server=createApp().listen(0,'127.0.0.1',async()=>{const x=JSON.parse(process.env.FIXTURE_REQUEST);const r=await fetch('http://127.0.0.1:'+server.address().port+x.path,{headers:x.auth});const b=await r.json();console.log(JSON.stringify({status:r.status,active:b.data?.suspension?.active,version:b.data?.suspension?.version}));server.close(()=>process.exit());});";
    const restarted=await promisify(execFile)(process.execPath,["-e",code],{env:{...process.env,FIXTURE_REQUEST:JSON.stringify({path:root+"/"+id,auth:f.auth})},windowsHide:true});
    assert.deepEqual(JSON.parse(restarted.stdout.trim()),{status:200,active:true,version:5});
    const foreign=await fixture(true,false);assert.equal((await request(root+"/"+id,{headers:foreign.auth})).status,404);
    assert.equal((await foreign.post(root,{...input,requestId:randomUUID(),taskId:foreign.task.id,applicationId:foreign.app.id})).status,409);
    const before=(await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).description;
    const manual=await f.post(route,{requestId:randomUUID(),expectedVersion:5,action:"manual_intervention",reason:"Owner repaired external material; reread and replan"});assert.equal(manual.status,200,JSON.stringify(manual.body));
    const after=await prisma.task.findUniqueOrThrow({where:{id:f.task.id}});assert.equal(after.description,before);assert.equal((after.executionReadiness as any).status,"needs_revalidation");
    assert.equal(await prisma.taskCapabilityGrant.count({where:{taskId:f.task.id}}),2);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),0);
    assert.equal((await request(`/v1/company-records/${incident.id}`,{headers:f.auth})).status,200);
    assert.equal(((await request(`/v1/company-records/${incident.id}`,{headers:f.auth})).body as any).data.activeSuspensionCount,1);
  });
  await t.test("runtime suspension fences matching hosts, late completion and restart while preserving unrelated work",async()=>{
    const f=await fixture(), incident=await prisma.companyRecord.create({data:{workspaceId:f.workspaceId,recordType:"technical_incident",key:"runtime-stop",title:"Synthetic runtime incident"}});
    const host=await prisma.agentHost.create({data:{workspaceId:f.workspaceId,name:"Synthetic affected host",slug:"affected-host",platform:"fixture"}});
    const other=await prisma.agentHost.create({data:{workspaceId:f.workspaceId,name:"Synthetic other host",slug:"other-host",platform:"fixture"}});
    const running=await prisma.agentExecution.create({data:{workspaceId:f.workspaceId,taskId:f.task.id,applicationId:f.app.id,requestedByType:"user",status:"running",agentHostId:host.id,attempt:1,leaseToken:randomUUID(),leaseExpiresAt:new Date(Date.now()+60000),metadata:f.execution.metadata as any}});
    const input={requestId:randomUUID(),incidentId:incident.id,taskId:f.task.id,applicationId:f.app.id,operation:"runtime_execute",hostId:host.id,reason:"Host process violated the synthetic scope",scopeProof:"Only this host was observed in the fixture"};
    const r=await f.post("/v1/agent-runtime/capability-suspensions",input);assert.equal(r.status,201,JSON.stringify(r.body));
    assert.ok((await prisma.agentExecution.findUniqueOrThrow({where:{id:running.id}})).contextInvalidatedAt);
    assert.equal((await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).executionReadiness && ((await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).executionReadiness as any).status,"ready");
    assert.equal((await f.post(`/v1/agent-runtime/executions/${running.id}/heartbeat`,{leaseToken:running.leaseToken})).status,409);
    assert.equal((await f.post(`/v1/agent-runtime/executions/${running.id}/actions/complete`,{leaseToken:running.leaseToken,summary:"Late result"})).status,409);
    const {suspensionBlocks}=await import("../modules/agent-runtime/capability-suspension");
    assert.equal(await suspensionBlocks(prisma,f.workspaceId,f.task.id,f.app.id,"runtime_execute",null,null,other.id),false);
    await assert.rejects(prisma.agentExecution.create({data:{workspaceId:f.workspaceId,taskId:f.task.id,applicationId:f.app.id,requestedByType:"user",status:"claimed",agentHostId:host.id}}),/native_capability_suspended/);
    const pending=await prisma.agentExecution.create({data:{workspaceId:f.workspaceId,taskId:f.task.id,applicationId:f.app.id,requestedByType:"user",status:"queued",metadata:f.execution.metadata as any}});
    const broad=await f.post("/v1/agent-runtime/capability-suspensions",{...input,requestId:randomUUID(),hostId:undefined,broaderReason:"Owner verified the whole native operation for this exact task"});assert.equal(broad.status,201,JSON.stringify(broad.body));
    const queued=await prisma.agentExecution.findUniqueOrThrow({where:{id:pending.id}});assert.equal(queued.status,"cancelled");assert.ok(queued.contextInvalidatedAt);
    await assert.rejects(prisma.agentExecution.update({where:{id:pending.id},data:{status:"queued",contextInvalidatedAt:null}}),/agent_execution_context_invalidated|native_capability_suspended/);
    assert.equal((await prisma.agentExecution.findUniqueOrThrow({where:{id:pending.id}})).status,"cancelled");
  });
  await t.test("agent credential binds exact verifier and manager; decisions audit agent without owner attribution", async () => {
    const f = await fixture(true), rejection = await f.rejection();
    assert.equal((await f.view()).data.canReview, true);
    const discovery=(await request("/v1/connection",{headers:f.reviewerAuth})).body as any;
    assert.deepEqual(discovery.data.auth.principal,{kind:"agent",id:f.verifier.id});
    assert.equal(discovery.data.auth.userId,undefined);assert.equal(discovery.data.auth.credentialPrefix,f.verifierKey.keyPrefix);
    const managerAuth = { "X-API-Key": f.managerKey.key };
    assert.equal((await f.post(f.root+"/actions/review", rejection, managerAuth)).status, 403);
    assert.equal((await f.post(f.root+"/actions/review", rejection)).status, 403);
    for (const field of ["actorId","agentId","ownerId","actorUserId"]) assert.equal((await f.post(f.root+"/actions/review", { ...rejection, [field]: f.verifier.id }, f.reviewerAuth)).status, 400);
    const r = await f.post(f.root+"/actions/review", rejection, { ...f.reviewerAuth, "X-Agent-Id": f.manager.id, "X-Owner-Id": f.user.id });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const review = (r.body as any).data.decision;
    assert.equal(review.actorUserId, null); assert.equal(review.actorAgentId, f.verifier.id); assert.equal(review.actorCredentialId, f.verifierKey.id);
    const ev = await prisma.event.findFirstOrThrow({ where: { resourceId: review.id } });
    assert.equal(ev.actorType, "agent"); assert.equal(ev.actorId, f.verifier.id); assert.ok(!JSON.stringify(ev).includes(f.verifierKey.key));
    const action = await f.action();
    assert.equal((await f.post(f.root+"/actions/review-return", action, f.reviewerAuth)).status, 403);
    const acted = await f.post(f.root+"/actions/review-return", action, managerAuth); assert.equal(acted.status, 200, JSON.stringify(acted.body));
    assert.equal((acted.body as any).data.action.actorUserId, null); assert.equal((acted.body as any).data.action.actorAgentId, f.manager.id);
    const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
    const code = "const {createApp}=require('./dist/app');const server=createApp().listen(0,'127.0.0.1',async()=>{const x=JSON.parse(process.env.FIXTURE_REQUEST);const r=await fetch('http://127.0.0.1:'+server.address().port+x.path,{method:'POST',headers:{'Content-Type':'application/json',...x.auth},body:JSON.stringify(x.body)});const data=await r.json();console.log(JSON.stringify({status:r.status,replayed:data.data?.replayed}));server.close(()=>process.exit());});";
    const restarted=await promisify(execFile)(process.execPath,["-e",code],{env:{...process.env,FIXTURE_REQUEST:JSON.stringify({path:f.root+"/actions/review-return",auth:managerAuth,body:action})}});
    assert.deepEqual(JSON.parse(restarted.stdout.trim()),{status:200,replayed:true});
    const log = await prisma.taskReviewAction.findUniqueOrThrow({where:{id:(acted.body as any).data.action.id}});
    assert.equal(log.actorCredentialPrefix,f.managerKey.keyPrefix);
  });
  await t.test("task grants require explicit human issuance and exact bounded scope", async () => {
    const f=await fixture(true,false), input=await f.rejection();
    assert.equal((await f.view()).data.canReview,false);
    assert.equal((await f.post(f.root+"/actions/review",input,f.reviewerAuth)).status,409);
    const issued=await f.grant();assert.equal(issued.response.status,201,JSON.stringify(issued.response.body));
    const g=(issued.response.body as any).data.grant;
    assert.equal(g.agentId,f.verifier.id);assert.equal(g.applicationId,f.app.id);assert.equal(g.taskId,f.task.id);
    assert.equal((await f.post(f.root+"/capability-grants",issued.body)).status,200);
    assert.equal((await f.post(f.root+"/capability-grants",{...issued.body,reason:"Changed mandate"})).status,409);
    assert.equal((await f.post(f.root+"/capability-grants",issued.body,f.reviewerAuth)).status,403);
    assert.equal((await request(f.root+"/capability-grants",{headers:f.reviewerAuth})).status,403);
    const {createAuthToken}=await import("../auth/token");const member={Authorization:`Bearer ${createAuthToken({userId:f.user.id,workspaceId:f.workspaceId})}`};
    assert.equal((await f.post(f.root+"/capability-grants",issued.body,member)).status,403);
    for(const extra of [{operation:"*"},{taskId:"*"},{agentId:f.manager.id},{credentialId:"*"},{applicationId:f.app.id}]) assert.equal((await f.post(f.root+"/capability-grants",{...issued.body,requestId:randomUUID(),...extra})).status,400);
    assert.equal((await f.post(f.root+"/capability-grants",{...issued.body,requestId:randomUUID(),reason:f.verifierKey.key})).status,409);
    assert.equal((await f.grant("return_to_executor")).response.status,400);
    assert.equal((await f.grant("review_decision",{credentialId:f.managerKey.id})).response.status,409);
    assert.equal((await f.grant("review_decision",{validUntil:new Date(Date.now()+7200000).toISOString()})).response.status,409);
    const foreign=await fixture(true,false), other=await foreign.grant();
    assert.equal((await f.post(f.root+"/actions/review",{...input,grantId:(other.response.body as any).data.grant.id},f.reviewerAuth)).status,409);
    assert.equal((await foreign.post(foreign.root+"/capability-grants/"+g.id+"/actions/revoke",{requestId:randomUUID(),reason:"Not in this workspace"})).status,404);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),0);
    assert.ok(!JSON.stringify(issued.response.body).includes(f.verifierKey.key));
  });
  await t.test("task grants expire, wait for activation and revoke without changing history", async () => {
    for(const mode of ["pending","expired","revoked"]){
      const f=await fixture(true,false), input=await f.rejection();
      const r=await f.grant("review_decision",mode==="pending"?{validFrom:new Date(Date.now()+60000).toISOString()}:mode==="expired"?{validUntil:new Date(Date.now()+600).toISOString()}:{});
      assert.equal(r.response.status,201,JSON.stringify(r.response.body));const g=(r.response.body as any).data.grant;
      if(mode==="expired")await new Promise(resolve=>setTimeout(resolve,700));
      if(mode==="revoked"){
        const body={requestId:randomUUID(),reason:"Withdraw authorization"}, route=f.root+"/capability-grants/"+g.id+"/actions/revoke";
        assert.equal((await f.post(route,body)).status,200);assert.equal((await f.post(route,body)).status,200);
        assert.equal((await f.post(route,{...body,reason:"Different request"})).status,409);
        const rev=await prisma.taskCapabilityRevocation.findUniqueOrThrow({where:{grantId:g.id}});
        await assert.rejects(prisma.taskCapabilityRevocation.delete({where:{id:rev.id}}),/capability_history_immutable/);
      }
      const denied=await f.post(f.root+"/actions/review",{...input,grantId:g.id},f.reviewerAuth);assert.equal(denied.status,409,JSON.stringify(denied.body));
      const catalog=(await request(f.root+"/capability-grants",{headers:f.auth})).body as any;
      assert.equal(catalog.data.grants[0].status,mode);
      assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
      await assert.rejects(prisma.taskCapabilityGrant.update({where:{id:g.id},data:{validUntil:new Date(Date.now()+300000)}}),/capability_history_immutable/);
    }
  });
  await t.test("approval uses a grant once and activation, revocation races and stale replay remain bounded", async () => {
    const f=await fixture(true,false), reject=await f.rejection();
    const grant=await f.grant("review_decision",{validFrom:new Date(Date.now()+60000).toISOString()});assert.equal(grant.response.status,201);
    const g=(grant.response.body as any).data.grant;
    const {reproduction,expected,observed,correction,...evidence}=reject, body={...evidence,decision:"approve",grantId:g.id};
    assert.equal((await f.post(f.root+"/actions/review",body,f.reviewerAuth)).status,409);
    // Advance this isolated fixture's activation boundary explicitly; API latency
    // must not turn a pending-grant assertion into a race against a 500 ms timer.
    await assert.rejects(prisma.taskCapabilityGrant.update({where:{id:g.id},data:{validFrom:new Date()}}),/capability_history_immutable/);
    await prisma.$transaction(async tx=>{await tx.$executeRaw`ALTER TABLE task_capability_grants DISABLE TRIGGER task_capability_guard`;await tx.$executeRaw`UPDATE task_capability_grants SET valid_from=(clock_timestamp() AT TIME ZONE 'UTC')-interval '1 second' WHERE id=${g.id}::uuid`;await tx.$executeRaw`ALTER TABLE task_capability_grants ENABLE TRIGGER task_capability_guard`;});
    assert.equal((await f.post(f.root+"/actions/review",body,f.reviewerAuth)).status,200);
    assert.equal((await f.post(f.root+"/actions/review",body,f.reviewerAuth)).status,200);
    await prisma.task.update({where:{id:f.task.id},data:{description:"Later task context"}});
    assert.equal((await f.post(f.root+"/actions/review",body,f.reviewerAuth)).status,409);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),1);
    const race=await fixture(true), input=await race.rejection(), revoke={requestId:randomUUID(),reason:"Stop pending decision"}, route=race.root+"/capability-grants/"+input.grantId+"/actions/revoke";
    const results=await Promise.all([race.post(race.root+"/actions/review",input,race.reviewerAuth),race.post(route,revoke)]);
    assert.ok(results.every(r=>[200,409].includes(r.status)));assert.equal((await race.post(route,revoke)).status,200);
    assert.equal((await race.post(race.root+"/actions/review",input,race.reviewerAuth)).status,409);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:race.workspaceId}}),await prisma.taskReviewDecision.count({where:{taskId:race.task.id}}));
  });
  await t.test("context changes invalidate grants even when a task is reopened", async () => {
    for(const change of ["done","blocked","archived","scope","application","link","material","issuer","credential","role"]){
      const f=await fixture(true), input=await f.rejection();
      if(["done","blocked","archived"].includes(change)){
        await prisma.task.update({where:{id:f.task.id},data:{status:change as any}});
        assert.equal((await f.post(f.root+"/actions/review",input,f.reviewerAuth)).status,409);
        await prisma.task.update({where:{id:f.task.id},data:{status:"todo"}});
      } else if(change==="scope")await prisma.task.update({where:{id:f.task.id},data:{description:"Revised correction boundary"}});
      else if(change==="application")await prisma.application.update({where:{id:f.app.id},data:{description:"Revised application context"}});
      else if(change==="link")await prisma.applicationProject.deleteMany({where:{applicationId:f.app.id}});
      else if(change==="material")await prisma.agentExecution.update({where:{id:f.execution.id},data:{summary:"Changed material"}});
      else if(change==="issuer")await prisma.workspaceMembership.update({where:{workspaceId_userId:{workspaceId:f.workspaceId,userId:f.input.contract.taskRoles.requester.id}},data:{role:"member"}});
      else if(change==="credential")await f.post("/v1/api-keys/"+f.verifierKey.id+"/actions/rotate",{requestId:randomUUID(),expectedVersion:1,expiresAt:new Date(Date.now()+86400000).toISOString()});
      else await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{role:"Changed verification role"}});
      const response=await f.post(f.root+"/actions/review",input,f.reviewerAuth);assert.ok([403,409].includes(response.status),change+JSON.stringify(response.body));
      assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),0);
      assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
    }
  });
  await t.test("use receipts are atomic, immutable and required by direct database writes", async () => {
    const f=await fixture(true), input=await f.rejection(), view=(await f.view()).data;
    const direct:any={workspaceId:f.workspaceId,taskId:f.task.id,executionId:f.execution.id,requestId:randomUUID(),requestHash:"a".repeat(64),materialVersion:view.materialVersion,actorAgentId:f.verifier.id,actorCredentialId:f.verifierKey.id,actorCredentialPrefix:f.verifierKey.keyPrefix,verifierId:f.verifier.id,managerId:f.manager.id,decision:"reject",evidence:input,snapshot:{result:view.result}};
    await assert.rejects(prisma.taskReviewDecision.create({data:direct}),/capability_grant_required/);
    await assert.rejects(prisma.taskReviewDecision.create({data:{...direct,capabilityGrantId:input.grantId}}),/capability_receipt_required/);
    const {readyTransaction}=await import("../modules/agent-runtime/task-execution-readiness"),{recordTaskReview}=await import("../modules/agent-runtime/task-review");
    const auth={workspaceId:f.workspaceId,authType:"api_key" as const,agentId:f.verifier.id,apiKeyId:f.verifierKey.id,credentialVersion:1};
    await assert.rejects(readyTransaction(async tx=>{const result=await recordTaskReview(tx,f.workspaceId,f.task.id,auth,input);assert.ok(!("error" in result));throw new Error("fixture rollback");}),/fixture rollback/);
    assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),0);
    const {reviewTransaction}=await import("../modules/agent-runtime/task-capability-admission");
    const conflict=await reviewTransaction(async tx=>{const result=await recordTaskReview(tx,f.workspaceId,f.task.id,auth,input);assert.ok(!("error" in result));await tx.task.update({where:{id:f.task.id},data:{status:"done"}});});assert.deepEqual(conflict,{error:"capability_context_changed"});
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),0);assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
    assert.notEqual((await prisma.task.findUniqueOrThrow({where:{id:f.task.id}})).status,"done");
    const results=await Promise.all([f.post(f.root+"/actions/review",input,f.reviewerAuth),f.post(f.root+"/actions/review",input,f.reviewerAuth)]);
    assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,409].includes(r.status)));
    assert.equal((await f.post(f.root+"/actions/review",input,f.reviewerAuth)).status,200);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),1);
    const used=await prisma.taskCapabilityUse.findFirstOrThrow({where:{workspaceId:f.workspaceId}});
    await assert.rejects(prisma.taskCapabilityUse.delete({where:{id:used.id}}),/capability_history_immutable/);
    assert.equal((await f.post(f.root+"/actions/review",{...input,requestId:randomUUID()},f.reviewerAuth)).status,409);
    await f.post(f.root+"/capability-grants/"+input.grantId+"/actions/revoke",{requestId:randomUUID(),reason:"End replay authority"});
    assert.equal((await f.post(f.root+"/actions/review",input,f.reviewerAuth)).status,409);
  });
  await t.test("manager operation grants cannot substitute and specialist creation consumes one receipt", async () => {
    const f=await fixture(true);await f.reject();
    const returnBody=await f.action(), createBody=await f.action("create_specialist_task");
    const specialist=await prisma.workforceEntity.create({data:{workspaceId:f.workspaceId,name:"Grant specialist",slug:"grant-specialist",type:"agent",role:"developer",skillIndex:["javascript"]}});
    const body={...createBody,specialist:{id:specialist.id,revision:specialist.updatedAt.toISOString()}}, auth={"X-API-Key":f.managerKey.key};
    assert.equal((await f.post(f.root+"/actions/review-return",{...body,grantId:returnBody.grantId},auth)).status,409);
    const results=await Promise.all([f.post(f.root+"/actions/review-return",body,auth),f.post(f.root+"/actions/review-return",body,auth)]);
    assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,409].includes(r.status)));
    const accepted=results.find(r=>r.status===200)!; const replay=await f.post(f.root+"/actions/review-return",body,auth);assert.equal(replay.status,200,JSON.stringify(replay.body));
    assert.equal((accepted.body as any).data.action.childTaskId,(replay.body as any).data.action.childTaskId);
    assert.equal(await prisma.taskCapabilityUse.count({where:{workspaceId:f.workspaceId}}),2);
    assert.equal(await prisma.taskReviewAction.count({where:{taskId:f.task.id}}),1);
    const childId=(accepted.body as any).data.action.childTaskId;
    const risk=(await request(f.root+"/risk",{headers:f.auth})).body as any;
    assert.ok(risk.data.members.some((m:any)=>m.id===childId&&m.relatedBy.includes("lineage")));
    assert.equal(risk.data.currentId,null);

    const changed={...returnBody,requestId:randomUUID(),expectedVersion:(await f.view()).data.expectedVersion};
    assert.equal((await f.post(f.root+"/actions/review-return",changed,auth)).status,409);
  });

  await t.test("credential create retry, rotation, revoke and immutable audit survive restart without revealing old secrets", async () => {
    const f = await fixture(true), key=f.verifierKey, rejection=await f.rejection();
    const replay=await f.post("/v1/api-keys/agent-credentials",key.body);assert.equal(replay.status,200);assert.equal((replay.body as any).data.key,null);
    assert.equal((await f.post("/v1/api-keys/agent-credentials",{...key.body,name:"Changed input"})).status,409);
    const rotation={requestId:randomUUID(),expectedVersion:key.version,expiresAt:new Date(Date.now()+86400000).toISOString()};
    const result=await f.post("/v1/api-keys/"+key.id+"/actions/rotate",rotation);assert.equal(result.status,200,JSON.stringify(result.body));
    const next=(result.body as any).data;assert.notEqual(next.key,key.key);assert.equal(next.agentId,f.verifier.id);
    assert.equal((await request(f.root+"/review",{headers:f.reviewerAuth})).status,403);
    const auth={"X-API-Key":next.key};assert.equal((await request(f.root+"/review",{headers:auth})).status,200);
    const {execFile}=await import("node:child_process"),{promisify}=await import("node:util");
    const restartCode="const {agentCredentialCommand}=require('./dist/modules/api-keys/agent-credential.service');const {prisma}=require('./dist/db/prisma');(async()=>{const p=JSON.parse(process.env.FIXTURE_CREDENTIAL);const r=await agentCredentialCommand(p.workspaceId,p.actorUserId,'rotate',p.keyId,p.input);console.log(JSON.stringify({replayed:r.replayed,secretAbsent:r.key===null,id:r.id}));await prisma.$disconnect()})()";
    const fresh=await promisify(execFile)(process.execPath,["-e",restartCode],{env:{...process.env,FIXTURE_CREDENTIAL:JSON.stringify({workspaceId:f.workspaceId,actorUserId:f.input.contract.taskRoles.requester.id,keyId:key.id,input:rotation})}});
    assert.deepEqual(JSON.parse(fresh.stdout.trim()),{replayed:true,secretAbsent:true,id:next.id});
    const replayRotation=await f.post("/v1/api-keys/"+key.id+"/actions/rotate",rotation);assert.equal((replayRotation.body as any).data.id,next.id);assert.equal((replayRotation.body as any).data.key,null);
    assert.equal((await request("/v1/api-keys/"+key.id,{method:"PATCH",headers:f.auth,body:JSON.stringify({active:true})})).status,403);
    const revoke={requestId:randomUUID(),expectedVersion:next.version};assert.equal((await f.post("/v1/api-keys/"+next.id+"/actions/revoke",revoke)).status,200);
    assert.equal((await f.post(f.root+"/actions/review",rejection,auth)).status,403);
    assert.equal((await f.post("/v1/api-keys/"+next.id+"/actions/revoke",revoke)).status,200);
    const catalog=(await request("/v1/api-keys/agent-credentials",{headers:f.auth})).body;
    assert.ok(!JSON.stringify(catalog).includes(key.key));assert.ok(!JSON.stringify(catalog).includes(next.key));assert.ok(!JSON.stringify(catalog).includes("keyHash"));
    assert.ok((await prisma.apiKey.findUniqueOrThrow({where:{id:next.id}})).lastUsedAt);
    const audit=await prisma.agentCredentialOperation.findFirstOrThrow({where:{keyId:next.id,action:"rotate"}});
    await assert.rejects(prisma.agentCredentialOperation.delete({where:{id:audit.id}}),/credential_audit_append_only/);
    await assert.rejects(prisma.apiKey.update({where:{id:next.id},data:{active:true}}),/credential_agent_inactive|credential_revoked/);
    await assert.rejects(prisma.apiKey.delete({where:{id:next.id}}),/credential_history_retained/);
  });
  await t.test("inactive identities and identity rebindings revoke credentials without resurrecting their authority", async () => {
    for(const change of [{status:"inactive" as const},{runtimeExternalId:"replacement-runtime"},{source:"alternate-source"},{externalId:randomUUID()}]){
      const f=await fixture(true);
      await prisma.workforceEntity.update({where:{id:f.verifier.id},data:change});
      assert.equal((await request(f.root+"/review",{headers:f.reviewerAuth})).status,403);
      await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{status:"active"}});
      assert.equal((await request(f.root+"/review",{headers:f.reviewerAuth})).status,403);
      const key=await prisma.apiKey.findUniqueOrThrow({where:{id:f.verifierKey.id}});assert.equal(key.active,false);assert.ok(key.revokedAt);
      assert.equal(await prisma.event.count({where:{resourceId:key.id,type:"api_key.agent_invalidated"}}),1);
    }
  });
  await t.test("foreign agents, human aliases, legacy broad keys and privileged route spoofing fail closed", async () => {
    const f=await fixture(true),foreign=await fixture(true);
    assert.equal((await f.post("/v1/api-keys/agent-credentials",{...f.verifierKey.body,requestId:randomUUID(),agentId:foreign.verifier.id})).status,409);
    assert.equal((await f.post("/v1/api-keys/agent-credentials",{...f.verifierKey.body,requestId:randomUUID(),agentId:f.input.contract.taskRoles.requester.id})).status,409);
    assert.equal((await f.post(foreign.root+"/actions/review",await foreign.rejection(),f.reviewerAuth)).status,404);
    assert.equal((await f.post("/v1/api-keys/"+foreign.verifierKey.id+"/actions/revoke",{requestId:randomUUID(),expectedVersion:1})).status,404);
    const legacy=await f.post("/v1/api-keys",{name:"Legacy fixture",fullAccessConfirmed:true});
    assert.equal((await f.post(f.root+"/actions/review",await f.rejection(),{"X-API-Key":(legacy.body as any).data.key})).status,403);
    for(const route of ["/v1/api-keys","/v1/agent-runtime/executions",f.root+"/actions/submit-for-execution","/v1/notes"]) assert.equal((await f.post(route,{ownerId:f.user.id,actorId:f.verifier.id},f.reviewerAuth)).status,403);
    await assert.rejects(prisma.apiKey.update({where:{id:f.verifierKey.id},data:{boundAgentId:f.manager.id}}),/credential_binding_immutable/);
    await assert.rejects(prisma.workforceEntity.update({where:{id:f.verifier.id},data:{workspaceId:foreign.workspaceId}}),/credential_agent_identity_immutable/);
    const w=await prisma.workforceEntity.create({data:{workspaceId:f.workspaceId,type:"agent",name:"Key workspace fixture",slug:"key-workspace-fixture"}});
    await assert.rejects(prisma.apiKey.create({data:{workspaceId:foreign.workspaceId,boundAgentId:w.id,name:"Invalid foreign key",keyHash:"synthetic-digest",keyPrefix:"synthetic",expiresAt:new Date(Date.now()+86400000),scopes:f.verifierKey.scopes}}),/credential_workspace_mismatch/);
  });
  await t.test("credential expiry and role or mandate changes are checked on every command", async () => {
    const f=await fixture(true);
    // A pre-expired synthetic credential can exist in imported history but never authenticate.
    const worker=await prisma.workforceEntity.create({data:{workspaceId:f.workspaceId,type:"agent",name:"Expired fixture",slug:"expired-fixture"}});
    const {generateApiKey,hashApiKey,apiKeyPrefix}=await import("../auth/api-key");const raw=generateApiKey();
    await prisma.apiKey.create({data:{workspaceId:f.workspaceId,boundAgentId:worker.id,name:"Expired key",keyHash:hashApiKey(raw),keyPrefix:apiKeyPrefix(raw),expiresAt:new Date(Date.now()-1000),scopes:f.verifierKey.scopes}});
    assert.equal((await request(f.root+"/review",{headers:{"X-API-Key":raw}})).status,403);
    const rejection=await f.rejection();
    await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{authorityScope:[]}});
    const response=await f.post(f.root+"/actions/review",rejection,f.reviewerAuth);assert.ok([403,409].includes(response.status));
    assert.equal(await prisma.taskReviewDecision.count({where:{taskId:f.task.id}}),0);
  });
  await t.test("competing provisioning and rotations have at most one winner and no orphan active key", async () => {
    const f=await fixture(true);
    const worker=await prisma.workforceEntity.create({data:{workspaceId:f.workspaceId,type:"agent",name:"Race fixture",slug:"race-fixture"}});
    const input={...f.verifierKey.body,agentId:worker.id,requestId:randomUUID()};
    const created=await Promise.all([f.post("/v1/api-keys/agent-credentials",input),f.post("/v1/api-keys/agent-credentials",{...input,requestId:randomUUID()})]);
    assert.deepEqual(created.map(r=>r.status).sort(),[201,409]);
    const rotation={requestId:randomUUID(),expectedVersion:f.verifierKey.version,expiresAt:new Date(Date.now()+86400000).toISOString()};
    const rotated=await Promise.all([f.post("/v1/api-keys/"+f.verifierKey.id+"/actions/rotate",rotation),f.post("/v1/api-keys/"+f.verifierKey.id+"/actions/rotate",{...rotation,requestId:randomUUID()})]);
    assert.deepEqual(rotated.map(r=>r.status).sort(),[200,409]);
    assert.equal(await prisma.apiKey.count({where:{boundAgentId:f.verifier.id,active:true}}),1);
  });

  await t.test("revocation races fail closed and the database rejects a different credential principal", async () => {
    const f=await fixture(true), input=await f.rejection(), view=(await f.view()).data;
    await assert.rejects(prisma.taskReviewDecision.create({data:{workspaceId:f.workspaceId,taskId:f.task.id,executionId:f.execution.id,requestId:randomUUID(),requestHash:"a".repeat(64),materialVersion:view.materialVersion,actorAgentId:f.verifier.id,actorCredentialId:f.managerKey.id,actorCredentialPrefix:f.managerKey.keyPrefix,verifierId:f.verifier.id,managerId:f.manager.id,decision:"reject",evidence:input,snapshot:{result:view.result}}}),/task_review_role_required|capability_grant_required/);
    const results=await Promise.all([f.post(f.root+"/actions/review",input,f.reviewerAuth),f.post("/v1/api-keys/"+f.verifierKey.id+"/actions/revoke",{requestId:randomUUID(),expectedVersion:f.verifierKey.version})]);
    assert.ok([200,403,409].includes(results[0]!.status));assert.ok([200,409].includes(results[1]!.status));
    if(results[1]!.status===409)assert.equal((await f.post("/v1/api-keys/"+f.verifierKey.id+"/actions/revoke",{requestId:randomUUID(),expectedVersion:f.verifierKey.version})).status,200);
    assert.equal((await f.post(f.root+"/actions/review",input,f.reviewerAuth)).status,403);
    const {readyTransaction}=await import("../modules/agent-runtime/task-execution-readiness");
    const {recordTaskReview}=await import("../modules/agent-runtime/task-review");
    const staleAuth={workspaceId:f.workspaceId,authType:"api_key" as const,agentId:f.verifier.id,apiKeyId:f.verifierKey.id,credentialVersion:f.verifierKey.version};
    const stale=await readyTransaction(tx=>recordTaskReview(tx,f.workspaceId,f.task.id,staleAuth,input));
    assert.equal("error" in stale && stale.error,"task_review_forbidden");
  });
  await t.test("approve is immutable, idempotent and does not mark delivery or change assignment", async () => {
    const f = await fixture(), before = await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } });
    const { reproduction, expected, observed, correction, ...input } = await f.rejection(); const body = { ...input, decision: "approve" };
    const material = (await f.view()).data.result;
    await assert.rejects(prisma.taskReviewDecision.create({ data: { workspaceId: f.workspaceId, taskId: f.task.id, executionId: f.execution.id, requestId: randomUUID(), requestHash: "a".repeat(64), materialVersion: "0".repeat(64), actorUserId: f.user.id, verifierId: f.verifier.id, managerId: f.input.contract.taskRoles.accountableManager.id, decision: "approve", evidence: body, snapshot: { result: material } } }), /task_review_material_version_invalid/);
    const r = await f.post(`${f.root}/actions/review`, body, f.reviewerAuth); assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual((await f.post(`${f.root}/actions/review`, body, f.reviewerAuth)).body, { data: { ...(r.body as any).data, replayed: true } });
    const after = await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } }); assert.equal(after.status, before.status); assert.equal(after.assignedWorkforceEntityId, before.assignedWorkforceEntityId); assert.deepEqual(after.executionReadiness, before.executionReadiness);
    const id = (r.body as any).data.decision.id;
    await assert.rejects(prisma.taskReviewDecision.update({ where: { id }, data: { decision: "reject" } }), /task_review_append_only/);
    await assert.rejects(prisma.taskReviewDecision.delete({ where: { id } }), /task_review_append_only/);
    await assert.rejects(prisma.agentExecution.update({ where: { id: f.execution.id }, data: { summary: "Replacement result" } }), /task_review_result_immutable/);
    assert.equal((await f.view()).data.canManage, false);
  });
  await t.test("reject requires reproducible evidence and cannot carry implementation effects", async () => {
    const f = await fixture(), input:any = await f.rejection();
    for (const field of ["reproduction", "expected", "observed", "evidence", "correction"]) { const c = { ...input }; delete c[field]; assert.equal((await f.post(`${f.root}/actions/review`, c, f.reviewerAuth)).status, 400); }
    assert.equal((await f.post(`${f.root}/actions/review`, { ...input, branch: "main" }, f.reviewerAuth)).status, 400);
    assert.equal(await prisma.taskReviewDecision.count({ where: { taskId: f.task.id } }), 0);
  });
  await t.test("author, other member, service key and foreign workspace cannot review", async () => {
    const f = await fixture(), input = await f.rejection();
    assert.equal((await f.post(`${f.root}/actions/review`, input)).status, 403);
    const foreign = await registerOwner(`foreign-review-${sequence++}@example.test`, "Foreign review fixture");
    assert.equal((await f.post(`${f.root}/actions/review`, input, { Authorization: `Bearer ${foreign.token}` })).status, 404);
    const key = await f.post("/v1/api-keys", { name: "Review fixture service", profileId: "mcp_codex_worker" });
    assert.equal((await f.post(`${f.root}/actions/review`, input, { "X-API-Key": (key.body as any).data.key } as any)).status, 403);
    await prisma.workspaceMembership.update({ where: { workspaceId_userId: { workspaceId: f.workspaceId, userId: f.user.id } }, data: { role: "viewer" } });
    assert.equal((await f.post(`${f.root}/actions/review`, input, f.reviewerAuth)).status, 403);
  });
  await t.test("changed material and newer executions reject late review", async () => {
    const f = await fixture(), input = await f.rejection();
    await prisma.agentExecution.update({ where: { id: f.execution.id }, data: { summary: "Revised result" } });
    assert.equal((await f.post(`${f.root}/actions/review`, input, f.reviewerAuth)).status, 409);
    const fresh = await f.rejection();
    await prisma.agentExecution.create({ data: { workspaceId: f.workspaceId, taskId: f.task.id, applicationId: f.app.id, requestedByType: "user", status: "queued", metadata:await fixtureExecutionMetadata(f.task.id) } });
    assert.equal((await f.post(`${f.root}/actions/review`, fresh, f.reviewerAuth)).status, 409);
  });
  await t.test("a human author alias is rejected by both API and database review gates", async () => {
    const f = await fixture(), authorId = f.input.contract.taskRoles.requester.id;
    const own = await prisma.workforceEntity.findFirstOrThrow({ where: { workspaceId: f.workspaceId, source: "user", externalId: authorId } });
    const worker = await prisma.workforceEntity.update({ where: { id: own.id }, data: { role: "manager and reviewer", skillIndex: ["javascript"], authorityScope: ["task_accountability", "task_verification"] } });
    const contract = structuredClone(f.input.contract), ref = { id: worker.id, revision: worker.updatedAt.toISOString() };
    contract.taskRoles.verifier = ref; contract.taskRoles.accountableManager = ref; contract.singleTask.accountableManager = ref;
    await prisma.agentExecution.update({ where: { id: f.execution.id }, data: { metadata: { ...(f.execution.metadata as any), executionContract: contract } } });
    const input = await f.rejection(); assert.equal((await f.post(`${f.root}/actions/review`, input)).status, 403);
    const s = (await f.view()).data;
    await assert.rejects(prisma.taskReviewDecision.create({ data: { workspaceId: f.workspaceId, taskId: f.task.id, executionId: f.execution.id, requestId: randomUUID(), requestHash: "a".repeat(64), materialVersion: s.materialVersion, actorUserId: authorId, verifierId: worker.id, managerId: worker.id, decision: "reject", evidence: input, snapshot: { result: s.result } } }), /task_review_self_review|task_review_role_invalid|task_risk_assessment_required|risk_admission_required/);
  });
  await t.test("reject blocks Submit; manager return keeps identity, scope and full history", async () => {
    const f = await fixture(); await f.reject();
    assert.equal((await f.post(f.submitRoute, await submissionInput(f.submitRoute, f.input, f.auth))).status, 409);
    const body = await f.action();
    assert.equal((await f.post(`${f.root}/actions/review-return`, body, f.reviewerAuth)).status, 403);
    assert.equal((await f.post(`${f.root}/actions/review-return`, { ...body, scope: ["Add an unrelated feature"] })).status, 409);
    const response = await f.post(`${f.root}/actions/review-return`, body); assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal((await f.post(`${f.root}/actions/review-return`, body)).status, 200);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } }), pin = task.executionReadiness as any;
    assert.equal(task.assignedWorkforceEntityId, f.agent.id); assert.equal(pin.status, "draft"); assert.equal(pin.contract.singleTask.contractId, `roost-task:${task.id}`); assert.equal(pin.contract.singleTask.measurement.metric, "");
    assert.deepEqual(pin.contract.scope.allowed, body.scope); assert.equal((await f.view()).data.history.length, 1);
    const editor = (await request(`${f.root}/execution-readiness?editor=1`, { headers: f.auth })).body as any;
    assert.equal(editor.data.editor.accepted.contract.singleTask.measurement.metric, "");
    await assert.rejects(prisma.taskReviewAction.update({ where: { reviewId: body.reviewId }, data: { action: "create_specialist_task" } }), /task_review_append_only/);
    assert.equal((await f.post(f.submitRoute, await submissionInput(f.submitRoute, f.input, f.auth))).status, 409);
    const reviewedContract = structuredClone(pin.contract);
    reviewedContract.singleTask.measurement = { metric: "empty_input_failures", comparison: "eq", target: 0, unit: "failures", method: "Run the empty parser fixture" };
    const correctedInput = { applicationId: f.app.id, contract: reviewedContract };
    const corrected = await f.post(f.submitRoute, await submissionInput(f.submitRoute, correctedInput, f.auth));
    assert.equal(corrected.status, 200, JSON.stringify(corrected.body));
    assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: f.task.id } })).assignedWorkforceEntityId, f.agent.id);
  });
  await t.test("specialist disposition creates exactly one scoped dependent draft", async () => {
    const f = await fixture(); await f.reject();
    const specialist = await prisma.workforceEntity.create({ data: { workspaceId: f.workspaceId, name: "Parser specialist", slug: "parser-specialist", type: "agent", role: "developer", skillIndex: ["javascript"] } });
    const body = { ...await f.action("create_specialist_task"), specialist: { id: specialist.id, revision: specialist.updatedAt.toISOString() } };
    const r = await f.post(`${f.root}/actions/review-return`, body); assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await f.post(`${f.root}/actions/review-return`, body)).status, 200);
    const childId = (r.body as any).data.action.childTaskId, child = await prisma.task.findUniqueOrThrow({ where: { id: childId } }), pin = child.executionReadiness as any;
    assert.equal(child.assignedWorkforceEntityId, specialist.id); assert.equal(pin.status, "draft"); assert.equal(pin.contract.singleTask.branch, `codex/task-${childId}`); assert.equal(child.executionRoleProvenance, null);
    const childEditor = (await request(`/v1/agent-runtime/tasks/${childId}/execution-readiness?editor=1`, { headers: f.auth })).body as any;
    assert.equal(childEditor.data.editor.accepted.contract.taskRoles.executor.id, specialist.id);
    assert.equal(await prisma.dependency.count({ where: { fromEntityId: f.task.id, toEntityId: childId, dependencyType: "review_correction" } }), 1);
    assert.equal(await prisma.taskReviewAction.count({ where: { taskId: f.task.id } }), 1);
    const savedAction = await prisma.taskReviewAction.findUniqueOrThrow({ where: { reviewId: body.reviewId } });
    await assert.rejects(prisma.dependency.update({ where: { id: savedAction.dependencyId! }, data: { toEntityId: f.task.id } }), /task_review_dependency_immutable/);
    await assert.rejects(prisma.dependency.delete({ where: { id: savedAction.dependencyId! } }), /Foreign key constraint/);
    assert.equal((await f.post(f.submitRoute, await submissionInput(f.submitRoute, f.input, f.auth))).status, 409);
  });
  await t.test("manager must use a current competent independent specialist and a current review", async () => {
    const f = await fixture(); await f.reject();
    const unqualified = await prisma.workforceEntity.create({ data: { workspaceId: f.workspaceId, name: "Unqualified fixture", slug: "unqualified-fixture", type: "agent", role: "designer", skillIndex: ["illustration"] } });
    for (const worker of [f.agent, unqualified]) {
      const body = { ...await f.action("create_specialist_task"), specialist: { id: worker.id, revision: worker.updatedAt.toISOString() } };
      const r = await f.post(`${f.root}/actions/review-return`, body); assert.equal(r.status, 409); assert.equal((r.body as any).error, "task_review_specialist_invalid");
    }
    const stale = await f.action(); await prisma.task.update({ where: { id: f.task.id }, data: { title: "Reviewed task changed" } });
    assert.equal((await f.post(`${f.root}/actions/review-return`, stale)).status, 409);
    assert.equal(await prisma.taskReviewAction.count({ where: { taskId: f.task.id } }), 0);
  });
  await t.test("racing decisions and manager actions create one winner; restart replays durable receipts", async () => {
    const f = await fixture(), a = await f.rejection(), b = { ...a, requestId: randomUUID() };
    const responses = await Promise.all([f.post(`${f.root}/actions/review`, a, f.reviewerAuth), f.post(`${f.root}/actions/review`, b, f.reviewerAuth)]);
    assert.deepEqual(responses.map(r=>r.status).sort(), [200,409]);
    const action = await f.action(), alternative = { ...action, requestId: randomUUID() };
    const acted = await Promise.all([f.post(`${f.root}/actions/review-return`, action), f.post(`${f.root}/actions/review-return`, alternative)]);
    assert.deepEqual(acted.map(r=>r.status).sort(), [200,409]);
    const winner = acted[0].status === 200 ? action : alternative;
    const script = `const {createApp}=require('./dist/app');const {prisma}=require('./dist/db/prisma');const s=createApp().listen(0,'127.0.0.1',async()=>{try{const r=await fetch('http://127.0.0.1:'+s.address().port+process.env.FIXTURE_ROUTE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:process.env.FIXTURE_AUTH},body:process.env.FIXTURE_BODY});console.log(JSON.stringify({status:r.status,replayed:(await r.json()).data?.replayed}));}finally{s.closeAllConnections();s.close();await prisma.$disconnect();}});`;
    const child = spawn(process.execPath,["-e",script],{windowsHide:true,env:{...process.env,FIXTURE_ROUTE:`${f.root}/actions/review-return`,FIXTURE_AUTH:f.auth.Authorization,FIXTURE_BODY:JSON.stringify(winner)},stdio:["ignore","pipe","pipe"]});
    let output="";child.stdout.on("data",chunk=>output+=chunk); await new Promise<void>((resolve,reject)=>child.on("close",code=>code===0?resolve():reject(new Error("Restart fixture failed"))));
    assert.deepEqual(JSON.parse(output.trim()),{status:200,replayed:true});
  });
});

test("single-task scope requires one resolved target, manager, result and branch", async t => {
  const owner = await registerOwner("single-scope@example.com", "Single scope fixture");
  const workspaceId = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({ data: { workspaceId, name: "Single scope app", slug: "single-scope" } });
  const project = await prisma.project.create({ data: { workspaceId, name: "Single scope project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: "Repair one parser" } });
  const f = await prepareReadyFixture(workspaceId, task.id, application.id, auth, false);
  const route = `/v1/agent-runtime/tasks/${task.id}`, command = `${route}/actions/submit-for-execution`;
  const post = (url: string, body: any, headers: Record<string, string> = auth) => request(url, { method: "POST", headers, body: JSON.stringify(body) });
  const submit = async (input = f.input) => post(command, await submissionInput(command, input, auth));
  const pin = async () => (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any;
  let accepted: any;
  await t.test("missing scope and legacy contract remain editable but never Ready", async () => {
    const { singleTask, ...legacy } = f.input.contract;
    assert.equal((await submit({ ...f.input, contract: legacy })).status, 409);
    assert.equal((await pin()).status, "needs_context");
    await prisma.task.update({ where: { id: task.id }, data: { executionReadiness: { status: "needs_revalidation", reason: "single_task_scope_required", contract: legacy, applicationId: application.id } } });
    const editor = (await request(`${route}/execution-readiness?editor=1`, { headers: auth })).body as any;
    assert.equal(editor.data.status === "ready", false); assert.equal(editor.data.editor.accepted.contract.objective.outcome, legacy.objective.outcome);
    assert.equal(editor.data.editor.taskIdentity.branch, `codex/task-${task.id}`);
    assert.equal((await submit()).status, 200); accepted = await pin();
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { executionReadiness: { ...accepted, contract: legacy } } }), /task_single_scope_required|task_roles_required/);
  });
  for (const [name, mutate] of Object.entries({
    application: (c: any) => { c.singleTask.applicationId = project.id; },
    multipleComponents: (c: any) => { c.singleTask.component = [c.singleTask.component]; },
    multipleExecutors: (c: any) => { c.assignment.agentId = [f.agent.id, f.manager.id]; },
    multipleOutcomes: (c: any) => { c.objective.outcome = [c.objective.outcome, "Another result"]; },
    independentProblems: (c: any) => { c.singleTask.problems.push({ ...c.singleTask.problems[0], statement: "An unrelated defect", outcome: "A different outcome" }); },
    compoundIntent: (c: any) => { c.singleTask.problems[0].statement = "Napraw parser oraz dodaj płatności"; },
    invalidBranch: (c: any) => { c.singleTask.branch = "main"; },
    wrongIdentity: (c: any) => { c.singleTask.contractId = `roost-task:${project.id}`; },
    missingMetric: (c: any) => { c.singleTask.measurement.target = "successful"; },
    unsupportedException: (c: any) => { c.singleTask.problems.push({ ...c.singleTask.problems[0], statement: "Another parser symptom" }); }
  })) await t.test(`reject ${name} and retain Needs context`, async () => {
    const contract = structuredClone(f.input.contract); mutate(contract);
    const result = await submit({ ...f.input, contract }); assert.equal(result.status, 409, JSON.stringify(result.body));
    assert.equal((await pin()).status, "needs_context");
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 0);
  });
  await t.test("foreign or inactive manager and component cannot resolve", async () => {
    const outside = await registerOwner("scope-outsider@example.com", "Outside scope");
    const manager = await prisma.workforceEntity.create({ data: { workspaceId: outside.workspace.id, name: "Other manager", slug: "other-manager", type: "human" } });
    const otherApp = await prisma.application.create({ data: { workspaceId, name: "Other target", slug: "other-scope-target" } });
    const component = await prisma.applicationArchitectureComponent.create({ data: { applicationId: otherApp.id, name: "Other component", type: "backend" } });
    for (const singleTask of [
      { ...f.input.contract.singleTask, accountableManager: { id: manager.id, revision: manager.updatedAt.toISOString() } },
      { ...f.input.contract.singleTask, component: { id: component.id, revision: component.updatedAt.toISOString() } }
    ]) assert.equal((await submit({ ...f.input, contract: { ...f.input.contract, singleTask } })).status, 409);
    await prisma.workforceEntity.update({ where: { id: f.manager.id }, data: { status: "inactive" } });
    assert.equal((await submit()).status, 409);
    const current = await prisma.workforceEntity.update({ where: { id: f.manager.id }, data: { status: "active" } });
    f.input.contract.singleTask.accountableManager.revision = current.updatedAt.toISOString();
    f.input.contract.taskRoles.accountableManager.revision = current.updatedAt.toISOString();
  });
  await t.test("one evidence-backed inseparable cause stays visible and auditable", async () => {
    const contract = structuredClone(f.input.contract), scope = contract.singleTask;
    scope.problems[0].causalLink = "The parser removes the shared required input token";
    scope.problems.push({ ...scope.problems[0], statement: "Preview rejects the same valid input", causalLink: "Preview uses the same failing parser code path" });
    scope.commonCause = { mechanism: "One parser removes the shared required token", inseparability: "Both observations exercise the same parser; a partial change leaves this defect unresolved", evidence: { ...contract.context.technical[0] } };
    const input = { ...f.input, contract }, submitted = await submissionInput(command, input, auth);
    assert.equal((await post(command, submitted)).status, 200);
    const first = await pin(); assert.equal((await post(command, submitted)).status, 200); assert.equal((await pin()).pinId, first.pinId);
    const event = await prisma.event.findFirstOrThrow({ where: { taskId: task.id, type: "task_execution_ready", payload: { path: ["pinId"], equals: first.pinId } } });
    assert.deepEqual((event.payload as any).singleTask.commonCause, scope.commonCause);
    assert.equal(first.contract.singleTask.contractId, accepted.contract.singleTask.contractId);
    assert.equal(first.contract.singleTask.branch, accepted.contract.singleTask.branch);
    scope.commonCause.evidence.revision = "stale";
    assert.equal((await submit(input)).status, 409);
  });
  await t.test("manager or component revisions invalidate admission and reject late claim", async () => {
    process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
    try {
      assert.equal((await submit()).status, 200);
      await prisma.workforceEntity.update({ where: { id: f.manager.id }, data: { role: "delivery manager" } });
      assert.equal((await pin()).status, "needs_revalidation");
      assert.ok((await pin()).changedSources.some((item: any) => item.id === f.manager.id));
      assert.equal((await submit()).status, 409); // stale explicit manager reference
      f.input.contract.singleTask.accountableManager.revision = (await prisma.workforceEntity.findUniqueOrThrow({ where: { id: f.manager.id } })).updatedAt.toISOString();
      f.input.contract.taskRoles.accountableManager.revision = f.input.contract.singleTask.accountableManager.revision;
      assert.equal((await submit()).status, 200);
      const queued = await post("/v1/agent-runtime/executions", { taskId: task.id, applicationId: application.id }); assert.equal(queued.status, 201);
      const key = await post("/v1/api-keys", { name: "Scope worker", profileId: "mcp_codex_worker" });
      const worker = { "X-API-Key": (key.body as any).data.key, ...hostProtocolHeaders };
      await post("/v1/agent-runtime/hosts/register", { name: "Scope host", slug: "scope-host", platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities }, worker);
      await prisma.applicationArchitectureComponent.update({ where: { id: f.component.id }, data: { description: "Changed component boundary" } });
      assert.equal((await pin()).status, "needs_revalidation");
      const claim = await post("/v1/agent-runtime/executions/claim", { hostSlug: "scope-host" }, worker); assert.equal(claim.status, 409);
      const execution = await prisma.agentExecution.findUniqueOrThrow({ where: { id: (queued.body as any).data.id } });
      assert.equal(execution.leaseToken, null); assert.equal(execution.attempt, 0);
    } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
  });
});

test("Submit for execution is the sole durable and versioned Ready command", async t => {
  const owner = await registerOwner("submit-only@example.com", "Submit-only fixture");
  const workspaceId = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({ data: { workspaceId, name: "Submit application", slug: "submit-only" } });
  const project = await prisma.project.create({ data: { workspaceId, name: "Submit project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const created = await request("/v1/tasks", { method: "POST", headers: auth, body: JSON.stringify({ title: "Draft submission", projectId: project.id, status: "in_progress", executionReadiness: { status: "ready" } }) });
  assert.equal(created.status, 201);
  const taskId = (created.body as any).data.id, route = `/v1/agent-runtime/tasks/${taskId}/actions/submit-for-execution`;
  const f = await prepareReadyFixture(workspaceId, taskId, application.id, auth, false);
  const post = (url: string, body: any, headers: Record<string, string> = auth) => request(url, { method: "POST", headers, body: JSON.stringify(body) });
  const input = (body = f.input) => submissionInput(route, body, auth);
  const read = async () => (await prisma.task.findUniqueOrThrow({ where: { id: taskId } })).executionReadiness as any;
  const queue = () => post("/v1/agent-runtime/executions", { taskId, applicationId: application.id });
  const key = await post("/v1/api-keys", { name: "Synthetic worker", profileId: "mcp_codex_worker" });
  const worker = { "X-API-Key": (key.body as any).data.key, ...hostProtocolHeaders };
  const hostSlug = "submit-only-host";
  await post("/v1/agent-runtime/hosts/register", { name: "Submit fixture", slug: hostSlug, platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities }, worker);
  const claim = () => post("/v1/agent-runtime/executions/claim", { hostSlug }, worker);
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  let accepted: any, proof: any;
  try {
    await t.test("create, assign, import and free status edits stay Draft and cannot queue or claim", async () => {
      assert.equal((await read()).status, "draft");
      await request(`/v1/operations/work-items/${taskId}`, { method: "PATCH", headers: auth, body: JSON.stringify({ assignedWorkforceEntityId: f.agent.id, status: "todo" }) });
      await request(`/v1/tasks/${taskId}`, { method: "PATCH", headers: auth, body: JSON.stringify({ status: "in_progress", executionReadiness: { status: "ready" } }) });
      await prisma.task.update({ where: { id: taskId }, data: { source: "clickup", externalId: "synthetic-import" } });
      assert.equal((await read()).status, "draft"); assert.equal((await queue()).status, 409);
      assert.equal((await claim()).status, 204);
      const freeReady = await request(`/v1/tasks/${taskId}`, { method: "PATCH", headers: auth, body: JSON.stringify({ status: "ready" }) });
      assert.equal(freeReady.status, 400);
      assert.equal((await post(route, f.input)).status, 400); // old API without preconditions
      await assert.rejects(prisma.task.update({ where: { id: taskId }, data: { executionReadiness: { status: "ready", sourceWatchVersion: "1" } } }));
    });
    await t.test("incomplete submission persists Needs context, safe diagnostics and one receipt", async () => {
      const bad = await input({ ...f.input, contract: { unsupportedField: "SYNTHETIC_REJECTED_VALUE" } });
      const first = await post(route, bad), second = await post(route, bad);
      assert.equal(first.status, 409); assert.deepEqual((second.body as any).errorDetails.details, (first.body as any).errorDetails.details);
      assert.equal((await read()).status, "needs_context");
      assert.equal((await queue()).status, 409); assert.equal((await claim()).status, 204);
      const receipts = await prisma.$queryRaw<any[]>`SELECT result FROM task_execution_submissions WHERE task_id = ${taskId}::uuid`;
      assert.equal(receipts.length, 1); assert.equal(JSON.stringify(receipts).includes("SYNTHETIC_REJECTED_VALUE"), false);
      assert.equal(await prisma.event.count({ where: { taskId, type: "task_execution_submission_rejected" } }), 1);
    });
    await t.test("missing decision is durable and nonexecuting", async () => {
      const bad = await input({ ...f.input, contract: { ...f.input.contract, decisions: { items: [], noneReason: null } } });
      assert.equal((await post(route, bad)).status, 409); assert.equal((await read()).status, "needs_decision");
      assert.equal((await queue()).status, 409);
    });
    await t.test("task and source edits after review reject stale versions without accepting", async () => {
      let stale = await input();
      await prisma.goal.update({ where: { id: f.goal.id }, data: { description: "Changed after review" } });
      assert.equal(((await post(route, stale)).body as any).error, "task_submission_version_conflict");
      stale = await input();
      await prisma.task.update({ where: { id: taskId }, data: { title: "Revised task intent" } });
      assert.equal(((await post(route, stale)).body as any).error, "task_submission_version_conflict");
      assert.equal((await read()).status, "needs_decision");
    });
    await t.test("one explicit complete submission pins Ready; duplicate delivery does not duplicate evidence", async () => {
      accepted = await input();
      const first = await post(route, accepted), second = await post(route, accepted);
      assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(second.status, 200);
      assert.deepEqual(first.body, second.body); proof = await read();
      assert.equal(proof.submissionId, accepted.requestId);
      assert.equal(await prisma.event.count({ where: { taskId, type: "task_execution_ready" } }), 1);
      assert.equal(await prisma.agentExecution.count({ where: { taskId } }), 0);
      assert.equal(((await post(route, { ...accepted, prompt: "Changed payload" })).body as any).error, "task_submission_key_conflict");
    });
    await t.test("raw writes cannot forge, edit or restore admission using an old receipt", async () => {
      await assert.rejects(prisma.$executeRaw`DELETE FROM task_execution_submissions WHERE task_id = ${taskId}::uuid`);
      await assert.rejects(prisma.$executeRaw`UPDATE task_execution_submissions SET result = '{}'::jsonb WHERE task_id = ${taskId}::uuid`);
      await assert.rejects(prisma.task.update({ where: { id: taskId }, data: { executionReadiness: { ...proof, prompt: "Forged" } } }));
      await assert.rejects(prisma.task.create({ data: { workspaceId, title: "Forged import", executionReadiness: proof } }));
      await prisma.task.update({ where: { id: taskId }, data: { executionReadiness: { ...proof, status: "needs_context" } } });
      await assert.rejects(prisma.task.update({ where: { id: taskId }, data: { executionReadiness: proof } }));
      assert.equal(((await post(route, accepted)).body as any).error, "task_submission_superseded");
      assert.equal((await queue()).status, 409);
    });
    await t.test("concurrent submissions from one reviewed version grant only one new pin", async () => {
      const first = await input(), second = { ...first, requestId: randomUUID() };
      const responses = await Promise.all([post(route, first), post(route, second)]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
      accepted = responses[0]!.status === 200 ? first : second;
      const before = await read();
      const duplicate = await Promise.all([post(route, accepted), post(route, accepted)]);
      for (const response of duplicate) assert.ok([200, 409].includes(response.status));
      assert.equal((await post(route, accepted)).status, 200);
      assert.equal((await read()).pinId, before.pinId);
      assert.equal(await prisma.event.count({ where: { taskId, type: "task_execution_ready" } }), 2);
    });
    await t.test("a transaction rollback leaves no Ready, receipt, or acceptance event", async () => {
      const { submitReady, readyTransaction } = await import("../modules/agent-runtime/task-execution-readiness");
      const user = await prisma.user.findFirstOrThrow({ where: { email: "submit-only@example.com" } });
      const command = await input(), before = await read();
      await assert.rejects(readyTransaction(async tx => {
        const result = await submitReady(tx, workspaceId, taskId, command, { requestedByType: "user", requestedById: user.id });
        assert.equal(result.readiness?.status, "ready"); throw new Error("synthetic_rollback");
      }), /synthetic_rollback/);
      assert.deepEqual(await read(), before);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT request_id FROM task_execution_submissions WHERE task_id = ${taskId}::uuid AND request_id = ${command.requestId}::uuid`).length, 0);
      assert.equal(await prisma.event.count({ where: { taskId, type: "task_execution_ready" } }), 2);
    });
    await t.test("a fresh API process replays the durable receipt without granting a new pin", async () => {
      const script = `const {createApp}=require('./dist/app');const {prisma}=require('./dist/db/prisma');const server=createApp().listen(0,'127.0.0.1',async()=>{try{const r=await fetch('http://127.0.0.1:'+server.address().port+process.env.FIXTURE_ROUTE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:process.env.FIXTURE_AUTH},body:process.env.FIXTURE_BODY});const b=await r.json();console.log(JSON.stringify({status:r.status,pinId:b.data?.readiness?.pinId}));}finally{server.closeAllConnections();server.close();await prisma.$disconnect();}});`;
      const child = spawn(process.execPath, ["-e", script], { windowsHide: true, env: { ...process.env, FIXTURE_ROUTE: route, FIXTURE_AUTH: auth.Authorization, FIXTURE_BODY: JSON.stringify(accepted) }, stdio: ["ignore", "pipe", "pipe"] });
      let output = ""; child.stdout.on("data", chunk => { output += chunk; });
      const exit = await new Promise(resolve => child.on("exit", resolve)); assert.equal(exit, 0);
      const result = JSON.parse(output.trim().split(/\r?\n/).at(-1)!);
      assert.equal(result.status, 200); assert.equal(result.pinId, (await read()).pinId);
    });
    await t.test("current role is required for replay; only explicit queue can produce a claim", async () => {
      assert.equal((await post(route, accepted, worker)).status, 403);
      const user = await prisma.user.findFirstOrThrow({ where: { email: "submit-only@example.com" } });
      await prisma.workspaceMembership.update({ where: { workspaceId_userId: { workspaceId, userId: user.id } }, data: { role: "viewer" } });
      assert.equal((await post(route, accepted)).status, 403);
      await prisma.workspaceMembership.update({ where: { workspaceId_userId: { workspaceId, userId: user.id } }, data: { role: "owner" } });
      assert.equal((await claim()).status, 204);
      assert.equal((await queue()).status, 409); // reverting membership never restores acceptance
      f.input.contract.taskRoles.requester.revision = (await prisma.workspaceMembership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId, userId: user.id } } })).updatedAt.toISOString();
      assert.equal((await post(route, await input())).status, 200);
      assert.equal((await queue()).status, 201);
      assert.equal((await claim()).status, 200);
    });
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("Ready pins validation and rejects stale queue, preparation and recovery without replacing evidence", async () => {
  const owner = await registerOwner("ready-owner@example.com", "Ready Fixture");
  const outsider = await registerOwner("ready-outsider@example.com", "Ready Outsider");
  const auth = { Authorization: `Bearer ${owner.token}` };
  const key = await request("/v1/api-keys", { method: "POST", headers: auth, body: JSON.stringify({ name: "Ready worker", profileId: "mcp_codex_worker" }) });
  const workerAuth = { "X-API-Key": (key.body as { data: { key: string } }).data.key, ...hostProtocolHeaders };
  const application = await prisma.application.create({ data: { workspaceId: owner.workspace.id, name: "Ready fixture", slug: "ready-fixture" } });
  const project = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "Ready fixture" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Accepted task intent" } });
  const route = `/v1/agent-runtime/tasks/${task.id}`;
  const post = async (url: string, body: unknown, headers = auth as Record<string, string>) => request(url, { method: "POST", headers, body: JSON.stringify(await submissionInput(url, body, headers)) });
  const queue = (extra = {}) => post("/v1/agent-runtime/executions", { taskId: task.id, ...extra });
  const readiness = () => request(`${route}/execution-readiness`, { headers: auth });
  assert.deepEqual(task.executionReadiness, { status: "draft" });
  assert.equal((await readiness()).status, 200);
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  try {
    assert.equal((await queue()).status, 409);
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 0);
    // A legacy-looking proof must not be promoted to a valid acceptance.
    await prisma.task.update({ where: { id: task.id }, data: { executionReadiness: { status: "needs_revalidation", revision: "legacy" } } });
    assert.equal(((await queue()).body as { error: string }).error, "task_ready_pin_required");
    const f = await prepareReadyFixture(owner.workspace.id, task.id, application.id, auth);
    assert.equal((await post(`${route}/actions/submit-for-execution`, f.input, workerAuth)).status, 403);
    assert.match(f.readiness.revision, /^[a-f0-9]{64}$/);
    assert.equal(((await readiness()).body as { data: { status: string } }).data.status, "ready");
    assert.equal((await request(`${route}/execution-readiness`, { headers: { Authorization: `Bearer ${outsider.token}` } })).status, 404);
    const invalid = await post(`${route}/actions/submit-for-execution`, { ...f.input, contract: { unsupportedField: "SYNTHETIC_SECRET" } });
    assert.equal(invalid.status, 409); assert.equal(JSON.stringify(invalid.body).includes("SYNTHETIC_SECRET"), false);
    assert.equal(((await readiness()).body as any).data.status, "needs_context");
    assert.equal(((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any).pinId, f.readiness.pinId);
    assert.equal((await post(`${route}/actions/submit-for-execution`, f.input)).status, 200);
    await prisma.task.update({ where: { id: task.id }, data: { title: task.title } });
    assert.equal(((await readiness()).body as { data: { status: string } }).data.status, "ready");
    assert.equal(((await queue({ prompt: "Different owner instruction" })).body as { error: string }).error, "task_ready_contract_mismatch");
    await prisma.goal.update({ where: { id: f.goal.id }, data: { description: "Changed accepted outcome" } });
    assert.equal(((await queue()).body as { error: string }).error, "task_ready_revalidation_required");
    const invalidated = (await readiness()).body as { data: { status: string; revision: string } };
    assert.equal(invalidated.data.status, "needs_revalidation"); assert.equal(invalidated.data.revision, f.readiness.revision);
    assert.equal(await prisma.event.count({ where: { taskId: task.id, type: "task_execution_ready_invalidated" } }), 1);
    // Reverting the edit does not silently restore an invalidated acceptance.
    await prisma.goal.update({ where: { id: f.goal.id }, data: { description: null } });
    assert.equal(((await queue()).body as { error: string }).error, "task_ready_revalidation_required");
    assert.equal((await post(`${route}/actions/submit-for-execution`, f.input)).status, 200);
    const fresh = (await readiness()).body as { data: { pinId: string; revision: string } };
    assert.notEqual(fresh.data.pinId, f.readiness.pinId);
    const queues = await Promise.all([queue({ metadata: { readyContextPin: { pinId: "forged", revision: "forged" } } }), queue()]);
    assert.deepEqual(queues.map(r => r.status).sort(), [201, 409]);
    const queued = (queues.find(r => r.status === 201)!.body as { data: { id: string; metadata: { readyContextPin: { pinId: string } } } }).data;
    assert.equal(queued.metadata.readyContextPin.pinId, fresh.data.pinId);
    assert.equal((await post(`${route}/actions/submit-for-execution`, f.input)).status, 409);
    const hostSlug = "ready-fixture";
    assert.equal((await post("/v1/agent-runtime/hosts/register", { name: "Ready host", slug: hostSlug, platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities }, workerAuth)).status, 200);
    await prisma.task.update({ where: { id: task.id }, data: { description: "Changed between queue and claim" } });
    assert.equal(((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any).status, "needs_revalidation");
    assert.equal((await post("/v1/agent-runtime/executions/claim", { hostSlug }, workerAuth)).status, 409);
    const unclaimed = await prisma.agentExecution.findUniqueOrThrow({ where: { id: queued.id } });
    assert.equal(unclaimed.attempt, 0); assert.equal(unclaimed.leaseToken, null); assert.equal(unclaimed.status, "queued");
    assert.equal((await post(`/v1/agent-runtime/executions/${queued.id}/actions/cancel`, {})).status, 200);
    assert.equal((await post(`${route}/actions/submit-for-execution`, f.input)).status, 200);
    assert.equal((await queue()).status, 201);
    const sessionId = "00000000-0000-4000-8000-000000000077";
    const claim = await post("/v1/agent-runtime/executions/claim", { hostSlug, sessionId }, workerAuth);
    assert.equal(claim.status, 200, JSON.stringify(claim.body));
    const claimed = (claim.body as { data: { id: string; leaseToken: string } }).data;
    const checkpoint = { schemaVersion: "roost-recovery-v1", stage: "prepared", sessionId, packetRevision: "a".repeat(64), workspaceDigest: "b".repeat(64), contextRevision: "c".repeat(64) };
    await prisma.companyRecord.update({ where: { id: f.sources[0]!.id }, data: { description: "Changed after claim before preparation" } });
    const prepare = await post(`/v1/agent-runtime/executions/${claimed.id}/checkpoint`, { leaseToken: claimed.leaseToken, expectedVersion: 1, checkpoint }, workerAuth);
    assert.equal(prepare.status, 409); assert.equal((prepare.body as { error: string }).error, "agent_execution_context_invalidated");
    assert.equal((await post(`/v1/agent-runtime/executions/${claimed.id}/actions/recover`, { hostSlug, expectedVersion: 1, sessionId }, workerAuth)).status, 409);
    const unchanged = await prisma.agentExecution.findUniqueOrThrow({ where: { id: claimed.id } });
    assert.equal(unchanged.checkpointVersion, 1); assert.equal(unchanged.leaseToken, claimed.leaseToken); assert.equal(unchanged.attempt, 1);
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 2);
    const proofs = await prisma.event.findMany({ where: { taskId: task.id, type: "task_execution_ready" } });
    assert.equal(proofs.length, 4); assert.ok(proofs.some(e => (e.payload as { pinId: string }).pinId === f.readiness.pinId));
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("Ready source writes atomically invalidate accepted read scopes without a readiness read", async (t) => {
  const owner = await registerOwner("ready-source-write@example.com", "Ready source writes");
  const workspaceId = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({ data: { workspaceId, name: "Watched application", slug: "watched-application" } });
  const project = await prisma.project.create({ data: { workspaceId, name: "Watched project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const domain = await prisma.capabilityDomain.create({ data: { workspaceId, key: "watched-domain", name: "Watched domain" } });
  const definition = await prisma.capabilityDefinition.create({ data: { workspaceId, domainId: domain.id, key: "watched-capability", name: "Watched capability" } });
  await prisma.applicationCapability.create({ data: { applicationId: application.id, capabilityDefinitionId: definition.id, applicability: "recommended" } });
  const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: "Watched task" } });
  const f = await prepareReadyFixture(workspaceId, task.id, application.id, auth);
  const { readyTransaction, submitReady, inspectReady, lockReadyTask, submissionVersion } = await import("../modules/agent-runtime/task-execution-readiness");
  const actor = { requestedByType: "user", requestedById: (await prisma.user.findFirstOrThrow({ where: { email: "ready-source-write@example.com" } })).id };
  const pin = async () => (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any;
  const accept = async () => {
    f.input.contract.taskRoles.executor.revision = (await prisma.workforceEntity.findUniqueOrThrow({ where: { id: f.agent.id } })).updatedAt.toISOString();
    for (const category of ["company", "product", "technical"]) {
      const ref = f.input.contract.context[category][0];
      ref.revision = (await prisma.companyRecord.findUniqueOrThrow({ where: { id: ref.id } })).updatedAt.toISOString();
    }
    await prepareRiskFixture(`/v1/agent-runtime/tasks/${task.id}/risk`,f.input,auth);
    const result = await readyTransaction(async tx => submitReady(tx, workspaceId, task.id, { ...f.input, requestId: randomUUID(), expectedVersion: await submissionVersion(tx, workspaceId, task.id, application.id) }, actor));
    assert.equal("error" in result, false, JSON.stringify(result));
    return pin();
  };
  await t.test("unrelated source, application, task and foreign workspace keep acceptance", async () => {
    const otherApp = await prisma.application.create({ data: { workspaceId, name: "Unrelated", slug: "unrelated-watch" } });
    const other = await prisma.companyRecord.create({ data: { workspaceId, applicationId: otherApp.id, recordType: "requirement", key: "unrelated-watch", title: "Unrelated" } });
    await prisma.companyRecord.update({ where: { id: other.id }, data: { title: "Still unrelated" } });
    await prisma.task.create({ data: { workspaceId, title: "Unrelated task" } });
    const outside = await registerOwner("ready-write-outsider@example.com", "Outside watches");
    await prisma.policy.create({ data: { workspaceId: outside.workspace.id, name: "Outside policy", appliesTo: "task", ruleType: "guideline" } });
    assert.equal((await pin()).status, "ready");
    assert.equal((await pin()).pinId, f.readiness.pinId);
  });
  await t.test("rollback preserves Ready; raw SQL edit and exact revert commit one invalidation", async () => {
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.goal.update({ where: { id: f.goal.id }, data: { title: "Rolled back" } });
      assert.equal(((await tx.task.findUniqueOrThrow({ where: { id: task.id } })).executionReadiness as any).status, "needs_revalidation");
      throw new Error("synthetic rollback");
    }), /synthetic rollback/);
    assert.equal((await pin()).status, "ready");
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`UPDATE goals SET title = 'Temporary accepted-source change' WHERE id = ${f.goal.id}::uuid`;
      await tx.$executeRaw`UPDATE goals SET title = ${f.goal.title} WHERE id = ${f.goal.id}::uuid`;
    });
    const invalid = await pin();
    assert.equal(invalid.status, "needs_revalidation"); assert.equal(invalid.revision, f.readiness.revision);
    assert.equal(invalid.changedSources.length, 1); assert.equal(invalid.changedSources[0].id, f.goal.id);
    assert.equal(await prisma.event.count({ where: { taskId: task.id, type: "task_execution_ready_invalidated" } }), 1);
    const read = await request(`/v1/agent-runtime/tasks/${task.id}/execution-readiness`, { headers: auth });
    assert.deepEqual((read.body as any).data.changedSources, invalid.changedSources);
  });
  await t.test("a new API process retains the invalidation and cannot readmit the old pin", async () => {
    const code = `const {prisma}=require('./dist/db/prisma');const {inspectReady}=require('./dist/modules/agent-runtime/task-execution-readiness');prisma.$transaction(tx=>inspectReady(tx,${JSON.stringify(workspaceId)},${JSON.stringify(task.id)}),{isolationLevel:'Serializable'}).then(r=>{if(r.error!=='task_ready_revalidation_required')process.exitCode=1;else process.stdout.write('blocked');}).catch(()=>{process.exitCode=1}).finally(()=>prisma.$disconnect());`;
    const child = spawn(process.execPath, ["-e", code], { cwd: process.cwd(), env: process.env, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    let output = ""; child.stdout.on("data", chunk => { output += chunk.toString(); });
    const exit = await new Promise<number | null>((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
    assert.equal(exit, 0); assert.equal(output, "blocked");
    assert.equal(await prisma.event.count({ where: { taskId: task.id, type: "task_execution_ready_invalidated" } }), 1);
  });
  await t.test("deep nested relation inserts and accepted definition updates are watched", async () => {
    await accept();
    const feature = await prisma.featureDefinition.create({ data: { capabilityDefinitionId: definition.id, key: "watched-feature", name: "Nested feature" } });
    assert.equal((await pin()).status, "needs_revalidation");
    assert.equal((await pin()).changedSources[0].id, feature.id);
    await accept();
    await prisma.capabilityDomain.update({ where: { id: domain.id }, data: { name: "Changed domain" } });
    assert.equal((await pin()).status, "needs_revalidation");
    assert.equal((await pin()).changedSources[0].id, domain.id);
  });
  await t.test("new collection member and delete invalidate without polling", async () => {
    await accept();
    const repository = await prisma.applicationRepository.create({ data: { applicationId: application.id, name: "New relation", url: "https://github.com/example/secondary.git" } });
    assert.equal((await pin()).status, "needs_revalidation");
    assert.equal((await pin()).changedSources[0].operation, "insert");
    await accept();
    await prisma.applicationRepository.delete({ where: { id: repository.id } });
    assert.equal((await pin()).status, "needs_revalidation");
    assert.equal((await pin()).changedSources[0].operation, "delete");
    await accept();
    await prisma.organizationalScope.create({ data: { workspaceId, entityType: "task", entityId: task.id, scopeType: "company" } });
    assert.equal((await pin()).status, "needs_revalidation");
  });
  await t.test("multiple sources accumulate once and explicit reacceptance clears them", async () => {
    await accept();
    await prisma.$transaction(async tx => {
      await tx.companyRecord.update({ where: { id: f.sources[0]!.id }, data: { description: "Changed source" } });
      await tx.workforceEntity.update({ where: { id: f.agent.id }, data: { name: "Changed assignment source" } });
      await tx.companyRecord.update({ where: { id: f.sources[0]!.id }, data: { description: "Changed source" } });
    });
    assert.equal((await pin()).changedSources.length, 2);
    const fresh = await accept();
    assert.equal(fresh.status, "ready"); assert.equal(fresh.changedSources, undefined);
    await prisma.task.update({ where: { id: task.id }, data: { status: "in_progress" } });
    assert.equal((await pin()).status, "ready");
    await prisma.task.update({ where: { id: task.id }, data: { title: "Material task change" } });
    assert.equal((await pin()).status, "needs_revalidation");
  });
  await t.test("source write waiting behind acceptance invalidates the newly committed pin", async () => {
    await prepareRiskFixture(`/v1/agent-runtime/tasks/${task.id}/risk`,f.input,auth);
    let acquired!: () => void, release!: () => void;
    const locked = new Promise<void>(resolve => { acquired = resolve; });
    const released = new Promise<void>(resolve => { release = resolve; });
    const accepting = readyTransaction(async tx => {
      await lockReadyTask(tx, workspaceId, task.id); acquired(); await released;
      return submitReady(tx, workspaceId, task.id, { ...f.input, requestId: randomUUID(), expectedVersion: await submissionVersion(tx, workspaceId, task.id, application.id) }, actor);
    });
    await locked;
    const writing = prisma.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL application_name = 'roost_ready_source_race'`;
      return tx.goal.update({ where: { id: f.goal.id }, data: { description: "After acceptance" } });
    });
    try {
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const rows = await prisma.$queryRaw<Array<{ blocked: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name = 'roost_ready_source_race' AND wait_event_type = 'Lock') AS blocked`;
        if (rows[0]?.blocked) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(blocked, true, "source writer must be waiting on the acceptance fence");
    } finally { release(); }
    assert.equal("error" in await accepting, false);
    await writing;
    assert.equal((await pin()).status, "needs_revalidation");
    const admission = await readyTransaction(tx => inspectReady(tx, workspaceId, task.id));
    assert.equal((admission as any).error, "task_ready_revalidation_required");
  });
  await t.test("an older serializable snapshot cannot accept after a committed source write", async () => {
    let read!: () => void, release!: () => void;
    const readDone = new Promise<void>(resolve => { read = resolve; });
    const releaseRead = new Promise<void>(resolve => { release = resolve; });
    const accepting = readyTransaction(async tx => {
      await tx.goal.findUniqueOrThrow({ where: { id: f.goal.id } }); read(); await releaseRead;
      return submitReady(tx, workspaceId, task.id, { ...f.input, requestId: randomUUID(), expectedVersion: await submissionVersion(tx, workspaceId, task.id, application.id) }, actor);
    });
    await readDone;
    await prisma.goal.update({ where: { id: f.goal.id }, data: { description: "Before acceptance" } });
    release();
    assert.equal((await accepting as any).error, "task_ready_context_conflict");
    assert.equal((await pin()).status, "needs_revalidation");
    assert.equal((await accept()).status, "ready");
  });
  await t.test("older API cannot store an untracked Ready proof", async () => {
    const current = await pin();
    const { sourceWatchVersion, ...legacy } = current;
    await assert.rejects(prisma.task.update({ where: { id: task.id }, data: { executionReadiness: legacy } }));
    assert.equal((await pin()).pinId, current.pinId);
  });
  await t.test("acceptance refuses a missing source fence and preserves the prior pin", async () => {
    const previous = await pin();
    await assert.rejects(prisma.$transaction(async tx => {
      // Transactional DDL in the isolated fixture database; rejection rolls it back.
      await tx.$executeRaw`ALTER TABLE goals DISABLE TRIGGER ready_source_fence`;
      await submitReady(tx, workspaceId, task.id, { ...f.input, requestId: randomUUID(), expectedVersion: await submissionVersion(tx, workspaceId, task.id, application.id) }, actor);
    }), /ready_source_trigger_missing/);
    assert.equal((await pin()).pinId, previous.pinId);
  });
});

test("active context stop fences late reports, checkpoints, recovery and completion races", async (t) => {
  const owner = await registerOwner("active-context@example.com", "Active context fixture");
  const workspaceId = owner.workspace.id, auth = { Authorization: `Bearer ${owner.token}` };
  const key = await request("/v1/api-keys", { method: "POST", headers: auth, body: JSON.stringify({ name: "Context stop fixture", profileId: "mcp_codex_worker" }) });
  const worker = { "X-API-Key": (key.body as any).data.key, ...hostProtocolHeaders };
  const post = async (url: string, body: any, headers: Record<string, string> = worker) => request(url, { method: "POST", headers, body: JSON.stringify(await submissionInput(url, body, headers)) });
  let serial = 0;
  async function fixture(stage = "running") {
    const slug = `active-context-${++serial}`;
    const application = await prisma.application.create({ data: { workspaceId, name: slug, slug } });
    const project = await prisma.project.create({ data: { workspaceId, name: slug } });
    await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
    const task = await prisma.task.create({ data: { workspaceId, projectId: project.id, title: slug } });
    const f = await prepareReadyFixture(workspaceId, task.id, application.id, auth);
    await post("/v1/agent-runtime/hosts/register", { name: slug, slug, platform: "win32", applicationSlugs: [slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities });
    assert.equal((await post("/v1/agent-runtime/executions", { taskId: task.id }, auth)).status, 201);
    const claim = await post("/v1/agent-runtime/executions/claim", { hostSlug: slug });
    assert.equal(claim.status, 200, JSON.stringify(claim.body));
    let execution = (claim.body as any).data;
    const route = `/v1/agent-runtime/executions/${execution.id}`;
    for (const next of ["prepared", "spawn_intent", "running"]) {
      const checkpoint = { ...execution.checkpoint, stage: next, packetRevision: "a".repeat(64), workspaceDigest: "b".repeat(64), contextRevision: "c".repeat(64) };
      const saved = await post(`${route}/checkpoint`, { leaseToken: execution.leaseToken, expectedVersion: execution.checkpointVersion, checkpoint });
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      execution = { ...execution, ...(saved.body as any).data };
      if (stage === next) break;
    }
    return { ...f, task, application, route, execution, post: (suffix: string, extra = {}) => post(route + suffix, { leaseToken: execution.leaseToken, ...extra }),
      read: () => prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } }),
      change: () => prisma.goal.update({ where: { id: f.goal.id }, data: { description: "Accepted goal changed" } }) };
  }
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  try {
    await t.test("unrelated source keeps active work valid through completion", async () => {
      const f = await fixture();
      assert.equal((await f.post("/actions/context-stopped")).status, 409);
      await prisma.companyRecord.create({ data: { workspaceId, recordType: "requirement", key: "unrelated-active-context", title: "Outside accepted scope" } });
      assert.equal((await f.read()).contextInvalidatedAt, null);
      assert.equal((await f.post("/heartbeat")).status, 200);
      assert.equal((await f.post("/actions/complete", { summary: "Synthetic valid completion" })).status, 200);
      assert.equal((await f.read()).status, "completed");
    });
    for (const stage of ["prepared", "running"]) await t.test(`change after ${stage} permanently fences the attempt and keeps its checkpoint/lease`, async () => {
      const f = await fixture(stage), before = await f.read();
      await f.change(); await f.change();
      const invalid = await f.read();
      assert.ok(invalid.contextInvalidatedAt); assert.equal(invalid.contextStoppedAt, null);
      assert.deepEqual(invalid.checkpoint, before.checkpoint); assert.equal(invalid.checkpointVersion, before.checkpointVersion);
      assert.equal(invalid.leaseToken, before.leaseToken); assert.deepEqual(invalid.leaseExpiresAt, before.leaseExpiresAt);
      assert.equal((invalid.contextInvalidation as any).changedSources[0].id, f.goal.id);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: invalid.id, type: "context_stop_requested" } }), 1);
      for (const [suffix, data] of [["/heartbeat", {}], ["/actions/complete", { summary: "Late success" }], ["/checkpoint", { expectedVersion: before.checkpointVersion, checkpoint: { ...(before.checkpoint as any), stage: "effect_possible" } }], ["/actions/fail", { code: "late_failure", message: "Late failure", retryable: true }]] as const) {
        const response = await f.post(suffix, data);
        assert.equal(response.status, 409); assert.equal((response.body as any).error, "agent_execution_context_invalidated");
      }
      assert.equal((await post(`${f.route}/actions/recover`, { hostSlug: f.application.slug, expectedVersion: before.checkpointVersion, sessionId: "00000000-0000-4000-8000-000000000987" })).status, 409);
      const first = await f.post("/actions/context-stopped");
      await prisma.workforceEntity.update({ where: { id: f.agent.id }, data: { name: "Another accepted source changed after stop" } });
      const second = await f.post("/actions/context-stopped");
      assert.equal(first.status, 200); assert.deepEqual(second.body, first.body);
      const stopped = await f.read();
      assert.equal(stopped.status, "waiting_for_approval"); assert.ok(stopped.contextStoppedAt);
      assert.equal(stopped.leaseToken, before.leaseToken); assert.deepEqual(stopped.leaseExpiresAt, before.leaseExpiresAt);
      assert.equal((stopped.contextInvalidation as any).changedSources.length, 2);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: stopped.id, type: "context_sources_changed" } }), 1);
      assert.deepEqual(stopped.checkpoint, before.checkpoint); assert.equal(stopped.checkpointVersion, before.checkpointVersion); assert.equal(stopped.attempt, before.attempt);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: stopped.id, type: "context_stopped" } }), 1);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: stopped.id, type: "completed" } }), 0);
      assert.equal((await f.post("/heartbeat")).status, 409);
      await assert.rejects(prisma.agentExecution.update({ where: { id: stopped.id }, data: { status: "completed", leaseToken: null, completedAt: new Date() } }), /agent_execution_context_invalidated/);
      await assert.rejects(prisma.agentExecution.update({ where: { id: stopped.id }, data: { lastHeartbeatAt: new Date(), leaseExpiresAt: new Date(Date.now() + 90_000) } }), /agent_execution_context_invalidated/);
      await assert.rejects(prisma.agentExecution.update({ where: { id: stopped.id }, data: { checkpointVersion: { increment: 1 } } }), /agent_execution_context_invalidated/);
      assert.equal((await post(`${f.route}/actions/cancel`, {}, auth)).status, 200);
      assert.equal((await f.read()).status, "cancelled");
      assert.equal((await post(`${f.route}/actions/retry`, {}, auth)).status, 409);
      f.input.contract.taskRoles.executor.revision = (await prisma.workforceEntity.findUniqueOrThrow({ where: { id: f.agent.id } })).updatedAt.toISOString();
      const resubmitted = await post(`/v1/agent-runtime/tasks/${f.task.id}/actions/submit-for-execution`, f.input, auth);
      assert.equal(resubmitted.status, 200, JSON.stringify(resubmitted.body));
      const fresh = await post("/v1/agent-runtime/executions", { taskId: f.task.id }, auth);
      assert.equal(fresh.status, 201); assert.notEqual((fresh.body as any).data.id, stopped.id);
      assert.notEqual((fresh.body as any).data.metadata.readyContextPin.pinId, (stopped.metadata as any).readyContextPin.pinId);
      assert.equal((await f.post("/actions/complete", { summary: "Old token after new acceptance" })).status, 409);
    });
    await t.test("stop acknowledgment after lease expiry is allowed but cannot renew authority", async () => {
      const f = await fixture();
      await prisma.agentExecution.update({ where: { id: f.execution.id }, data: { leaseExpiresAt: new Date(0) } });
      await f.change();
      assert.equal((await f.post("/actions/context-stopped")).status, 200);
      assert.equal((await f.read()).leaseExpiresAt?.getTime(), 0);
      assert.equal((await f.post("/heartbeat")).status, 409);
    });
    for (const suffix of ["/checkpoint", "/actions/complete"]) await t.test(`source commit wins the race against ${suffix}`, async () => {
      const f = await fixture(), before = await f.read();
      let acquired!: () => void, release!: () => void;
      const acquiredSignal = new Promise<void>(resolve => { acquired = resolve; });
      const releaseSignal = new Promise<void>(resolve => { release = resolve; });
      const writing = prisma.$transaction(async tx => {
        await tx.goal.update({ where: { id: f.goal.id }, data: { description: "Concurrent source change" } });
        acquired(); await releaseSignal;
      });
      await acquiredSignal;
      const reporting = f.post(suffix, suffix === "/checkpoint" ? { expectedVersion: before.checkpointVersion, checkpoint: { ...(before.checkpoint as any), stage: "effect_possible" } } : { summary: "Racing success" });
      try {
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE '%ready_source_fence%') AS waiting`;
          if (rows[0]?.waiting) { waiting = true; break; }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        assert.equal(waiting, true);
      } finally { release(); }
      await writing;
      assert.equal((await reporting).status, 409);
      const after = await f.read();
      assert.ok(after.contextInvalidatedAt); assert.deepEqual(after.checkpoint, before.checkpoint); assert.equal(after.checkpointVersion, before.checkpointVersion);
      assert.equal(after.leaseToken, before.leaseToken); assert.equal(after.completedAt, null);
      assert.equal(await prisma.agentExecutionEvent.count({ where: { executionId: after.id, type: "completed" } }), 0);
    });
    await t.test("a committed completion is not retroactively turned into an active stop", async () => {
      const f = await fixture();
      assert.equal((await f.post("/actions/complete", { summary: "Completed before edit" })).status, 200);
      await f.change();
      const done = await f.read(); assert.equal(done.status, "completed"); assert.equal(done.contextInvalidatedAt, null);
    });
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("Ready workbench projects safe catalogs and requires a current human role for acceptance", async () => {
  const owner = await registerOwner("ready-editor@example.com", "Ready Editor Fixture");
  const ownerUser = await prisma.user.findFirstOrThrow({ where: { email: "ready-editor@example.com" } });
  const auth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({ data: { workspaceId: owner.workspace.id, name: "Editor application", slug: "editor-fixture" } });
  const project = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "Editor project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Prepare an accessible contract" } });
  const f = await prepareReadyFixture(owner.workspace.id, task.id, application.id, auth);
  const route = `/v1/agent-runtime/tasks/${task.id}`;
  const keyResponse = await request("/v1/api-keys", { method: "POST", headers: auth, body: JSON.stringify({ name: "Broad fixture key", scopes: ["*"], fullAccessConfirmed: true }) });
  assert.equal(keyResponse.status, 201);
  const key = (keyResponse.body as { data: { key: string } }).data.key;
  const broad = await request(`${route}/actions/submit-for-execution`, { method: "POST", headers: { "X-API-Key": key }, body: JSON.stringify(f.input) });
  assert.equal(broad.status, 403);
  await prisma.companyRecord.update({ where: { id: f.sources[0]!.id }, data: { metadata: { secret: "SYNTHETIC_SECRET_SOURCE" } } });
  await prisma.workforceEntity.update({ where: { id: f.agent.id }, data: { runtimeProfile: { secret: "SYNTHETIC_SECRET_AGENT" } } });
  for (const role of ["owner", "admin", "member", "viewer"] as const) {
    await prisma.workspaceMembership.update({ where: { workspaceId_userId: { workspaceId: owner.workspace.id, userId: ownerUser.id } }, data: { role } });
    const read = await request(`${route}/execution-readiness?editor=1`, { headers: auth });
    assert.equal(read.status, 200);
    const body = read.body as { data: { canSubmit: boolean; editor: { acceptance: { authorType: string }; sources: Array<Record<string, unknown>>; agent: Record<string, unknown>; applications: Array<{ id: string }>; models: Array<{ id: string; efforts: string[] }> } } };
    assert.equal(body.data.canSubmit, role !== "viewer");
    assert.equal(body.data.editor.applications[0]!.id, application.id);
    assert.equal(body.data.editor.acceptance.authorType, "user");
    assert.equal(body.data.editor.models.find(model => model.id === "gpt-5.6-luna")!.efforts.includes("ultra"), false);
    assert.equal(JSON.stringify(read.body).includes("SYNTHETIC_SECRET"), false);
    assert.equal("description" in body.data.editor.sources[0]!, false);
    assert.equal("runtimeProfile" in body.data.editor.agent, false);
    const updatedSource = await prisma.companyRecord.findUniqueOrThrow({ where: { id: f.sources[0]!.id } });
    f.input.contract.context.company[0].revision = updatedSource.updatedAt.toISOString();
    f.input.contract.taskRoles.requester.revision = (await prisma.workspaceMembership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId: owner.workspace.id, userId: ownerUser.id } } })).updatedAt.toISOString();
    f.input.contract.taskRoles.executor.revision = (await prisma.workforceEntity.findUniqueOrThrow({ where: { id: f.agent.id } })).updatedAt.toISOString();
    const submit = await request(`${route}/actions/submit-for-execution`, { method: "POST", headers: auth, body: JSON.stringify(await submissionInput(`${route}/actions/submit-for-execution`, f.input, auth)) });
    assert.equal(submit.status, role === "viewer" ? 403 : 409, JSON.stringify(submit.body));
  }
  await prisma.workspaceMembership.update({ where: { workspaceId_userId: { workspaceId: owner.workspace.id, userId: ownerUser.id } }, data: { role: "owner" } });
  const forged = await request(`${route}/actions/submit-for-execution`, { method: "POST", headers: auth, body: JSON.stringify({ ...f.input, pinId: "SYNTHETIC_SECRET_FORGED", revision: "a".repeat(64), validation: {} }) });
  assert.equal(forged.status, 400); assert.equal(JSON.stringify(forged.body).includes("SYNTHETIC_SECRET"), false);
  const outsider = await registerOwner("ready-editor-outsider@example.com", "Editor outsider");
  assert.equal((await request(`${route}/execution-readiness?editor=1`, { headers: { Authorization: `Bearer ${outsider.token}` } })).status, 404);
  assert.equal((await request(`${route}/execution-readiness?editor=1&applicationId=${outsider.workspace.id}`, { headers: auth })).status, 404);
  assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 0);
  // Internal readiness links must not attempt an empty ClickUp writeback.
  // This synthetic workspace has no provider configuration or credentials.
  await prisma.task.update({ where: { id: task.id }, data: { source: "clickup", externalId: "synthetic-ready-links" } });
  const links = await request(`/v1/operations/work-items/${task.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ projectId: project.id, goalId: f.input.contract.objective.goalId, assignedWorkforceEntityId: f.agent.id }) });
  assert.equal(links.status, 200, JSON.stringify(links.body));
  assert.equal(await prisma.event.count({ where: { taskId: task.id, type: "operations_work_item_writeback_failed" } }), 0);
});

test("accepted output budgets remain pinned and budget failures cannot retry or complete late", async () => {
  const owner = await registerOwner("output-budget@example.com", "Output Budget Fixture");
  const auth = { Authorization: `Bearer ${owner.token}`, ...hostProtocolHeaders };
  const application = await prisma.application.create({ data: { workspaceId: owner.workspace.id, name: "Output budget fixture", slug: "output-budget-fixture" } });
  const project = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "Output budget project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Bound a synthetic execution" } });
  const f = await prepareReadyFixture(owner.workspace.id, task.id, application.id, auth);
  const post = async (route: string, body: unknown) => request(route, { method: "POST", headers: auth, body: JSON.stringify(await submissionInput(route, body, auth)) });
  for (const maxOutputTokens of [undefined, 0, -1, 100001]) {
    const rejected = await post(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`, { ...f.input, contract: { ...f.input.contract, budgets: { ...f.input.contract.budgets, maxOutputTokens } } });
    assert.equal(rejected.status, 409);
  }
  assert.equal((await post(`/v1/agent-runtime/tasks/${task.id}/actions/submit-for-execution`, f.input)).status, 200);
  const registered = await post("/v1/agent-runtime/hosts/register", { name: "Output host", slug: "output-host", platform: "win32", applicationSlugs: [application.slug], capabilities: protocol.requiredHostCapabilities, metadata: { ...validHostMetadata, outputTokenBudgetEnforcement: "unavailable" } });
  assert.equal(registered.status, 200);
  assert.ok((registered.body as { data: { runtime: { executionUnavailableReasons: string[] } } }).data.runtime.executionUnavailableReasons.includes("output_token_limit_unsupported"));
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  try {
    for (const code of ["agent_execution_output_budget_invalid", "agent_execution_output_budget_exceeded", "agent_execution_output_budget_unsupported"]) {
      assert.equal((await post("/v1/agent-runtime/executions", { taskId: task.id, applicationId: application.id })).status, 201);
      const claim = await post("/v1/agent-runtime/executions/claim", { hostSlug: "output-host" });
      assert.equal(claim.status, 200, JSON.stringify(claim.body));
      const execution = (claim.body as { data: { id: string; leaseToken: string } }).data;
      assert.equal((await post(`/v1/agent-runtime/executions/${execution.id}/heartbeat`, { leaseToken: execution.leaseToken, metadata: { executionContract: { budgets: { maxOutputTokens: 99999 } } } })).status, 200);
      const stored = await prisma.agentExecution.findUniqueOrThrow({ where: { id: execution.id } });
      assert.equal((stored.metadata as { executionContract: { budgets: { maxOutputTokens: number } } }).executionContract.budgets.maxOutputTokens, f.input.contract.budgets.maxOutputTokens);
      const failed = await post(`/v1/agent-runtime/executions/${execution.id}/actions/fail`, { leaseToken: execution.leaseToken, code, message: "Synthetic budget diagnostic", retryable: true });
      assert.equal(failed.status, 200);
      assert.equal((failed.body as { data: { errorState: { retryable: boolean } } }).data.errorState.retryable, false);
      assert.equal((await post(`/v1/agent-runtime/executions/${execution.id}/actions/complete`, { leaseToken: execution.leaseToken, summary: "SYNTHETIC_SECRET_LATE_SUCCESS" })).status, 409);
      const retry = await post(`/v1/agent-runtime/executions/${execution.id}/actions/retry`, {});
      assert.equal(retry.status, 409); assert.equal((retry.body as { error: string }).error, "agent_execution_requires_correction");
    }
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("local Codex Agent Host claims scoped work and reports owner-visible evidence", async () => {
  delete process.env.ROOST_CODEX_EXECUTION_ENABLED;
  const owner = await registerOwner("codex-runtime-owner@example.com", "Codex Runtime Workspace");
  const outsider = await registerOwner("codex-runtime-outsider@example.com", "Other Runtime Workspace");
  const ownerAuth = { Authorization: `Bearer ${owner.token}` };
  const application = await prisma.application.create({
    data: { workspaceId: owner.workspace.id, name: "DemoApp Runtime Test", slug: "demoapp-runtime-test", targetPlatforms: ["web"] }
  });
  const project = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "DemoApp runtime delivery", status: "active" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id, relationType: "delivery" } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Implement the runtime slice", status: "todo" } });

  const keyResponse = await request("/v1/api-keys", {
    method: "POST",
    headers: ownerAuth,
    body: JSON.stringify({ name: "Windows Codex host", profileId: "mcp_codex_worker" })
  });
  assert.equal(keyResponse.status, 201);
  const workerKeyId = (keyResponse.body as { data: { id: string } }).data.id;
  const keyAudit = await prisma.event.findFirstOrThrow({ where: { type: "api_key.created", resourceId: workerKeyId } });
  assert.equal((keyAudit.payload as { profileId: string }).profileId, "mcp_codex_worker");
  assert.ok(!JSON.stringify(keyAudit).includes((keyResponse.body as { data: { key: string } }).data.key));
  const workerAuth = { "X-API-Key": (keyResponse.body as { data: { key: string } }).data.key, ...hostProtocolHeaders };

  const hostResponse = await request("/v1/agent-runtime/hosts/register", {
    method: "POST",
    headers: workerAuth,
    body: JSON.stringify({ name: "Test laptop", slug: "test-windows", platform: "win32-x64", capabilities: ["codex_exec_json"], applicationSlugs: [application.slug], metadata: {} })
  });
  assert.equal(hostResponse.status, 200);
  assert.equal((hostResponse.body as { data: { runtime: { compatibility: { reason: string } } } }).data.runtime.compatibility.reason, "host_protocol_missing");
  const originalHost = (hostResponse.body as { data: { id: string } }).data;
  const repeatHost = await request("/v1/agent-runtime/hosts/register", { method: "POST", headers: workerAuth, body: JSON.stringify({ name: "Test laptop", slug: "test-windows", platform: "win32-x64", capabilities: ["codex_exec_json"], applicationSlugs: [application.slug], metadata: { executionMode: "observe" } }) });
  assert.equal((repeatHost.body as { data: { id: string } }).data.id, originalHost.id);
  await prisma.agentHost.update({ where: { id: originalHost.id }, data: { lastSeenAt: new Date(Date.now() - 61_000) } });
  const staleReadiness = await request("/v1/agent-runtime/readiness", { headers: ownerAuth });
  assert.equal((staleReadiness.body as { data: { hosts: Array<{ id: string; status: string }> } }).data.hosts.find((host) => host.id === originalHost.id)?.status, "offline");

  const foundationReadiness = await request("/v1/agent-runtime/readiness", { headers: ownerAuth });
  assert.equal(foundationReadiness.status, 200);
  assert.equal((foundationReadiness.body as { data: { executionEnabled: boolean; mode: string } }).data.executionEnabled, false);
  assert.equal((foundationReadiness.body as { data: { executionEnabled: boolean; mode: string } }).data.mode, "foundation_only");
  const disabledQueue = await request("/v1/agent-runtime/executions", { method: "POST", headers: ownerAuth, body: JSON.stringify({ taskId: task.id }) });
  assert.equal(disabledQueue.status, 409);
  assert.equal((disabledQueue.body as { error: string }).error, "agent_execution_disabled");
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";

  await prepareReadyFixture(owner.workspace.id, task.id, application.id, ownerAuth);
  const queueResponse = await request("/v1/agent-runtime/executions", {
    method: "POST",
    headers: ownerAuth,
    body: JSON.stringify({ taskId: task.id })
  });
  assert.equal(queueResponse.status, 201);
  const queued = (queueResponse.body as { data: { id: string; applicationId: string; status: string } }).data;
  assert.equal(queued.applicationId, application.id);
  assert.equal(queued.status, "queued");

  const duplicateQueue = await request("/v1/agent-runtime/executions", { method: "POST", headers: ownerAuth, body: JSON.stringify({ taskId: task.id }) });
  assert.equal(duplicateQueue.status, 409);
  const outsiderRead = await request(`/v1/agent-runtime/executions/${queued.id}`, { headers: { Authorization: `Bearer ${outsider.token}` } });
  assert.equal(outsiderRead.status, 404);

  await prisma.agentHost.update({ where: { id: originalHost.id }, data: { metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities } });
  const claimResponse = await request("/v1/agent-runtime/executions/claim", {
    method: "POST",
    headers: workerAuth,
    body: JSON.stringify({ hostSlug: "test-windows" })
  });
  assert.equal(claimResponse.status, 200);
  const claimed = (claimResponse.body as { data: { id: string; leaseToken: string; status: string } }).data;
  assert.equal(claimed.id, queued.id);
  assert.equal(claimed.status, "claimed");
  assert.ok(claimed.leaseToken);
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status, "in_progress");
  const acceptedMetadata = (await prisma.agentExecution.findUniqueOrThrow({ where: { id: queued.id } })).metadata as { readyContextPin: unknown; executionContract: unknown };

  const heartbeat = await request(`/v1/agent-runtime/executions/${queued.id}/heartbeat`, {
    method: "POST", headers: workerAuth,
    body: JSON.stringify({ leaseToken: claimed.leaseToken, status: "running", codexThreadId: "thread-test", metadata: { readyContextPin: { pinId: "forged" }, executionContract: { version: "forged" }, runtimeObservation: "synthetic heartbeat" } })
  });
  assert.equal(heartbeat.status, 200);
  const heartbeatMetadata = (await prisma.agentExecution.findUniqueOrThrow({ where: { id: queued.id } })).metadata as { readyContextPin: unknown; executionContract: unknown };
  assert.deepEqual(heartbeatMetadata.readyContextPin, acceptedMetadata.readyContextPin);
  assert.deepEqual(heartbeatMetadata.executionContract, acceptedMetadata.executionContract);
  const progressEvent = await request(`/v1/agent-runtime/executions/${queued.id}/events`, {
    method: "POST", headers: workerAuth,
    body: JSON.stringify({ leaseToken: claimed.leaseToken, type: "file_change", message: "Updated src/app.ts", payload: { path: "src/app.ts" } })
  });
  assert.equal(progressEvent.status, 201);

  const resultRevision={commit:"d".repeat(40),branch:(acceptedMetadata as any).executionContract.singleTask.branch,workingTree:"dirty"};
  for(const revision of [{...resultRevision,branch:"main"},{...resultRevision,commit:"not-a-commit"},{...resultRevision,executionId:randomUUID()}]){
   const invalid=await request(`/v1/agent-runtime/executions/${queued.id}/actions/complete`,{method:"POST",headers:workerAuth,body:JSON.stringify({leaseToken:claimed.leaseToken,summary:"Invalid revision fixture",resultRevision:revision})});
   assert.equal(invalid.status,revision.branch==="main"?409:400);
  }
  const complete = await request(`/v1/agent-runtime/executions/${queued.id}/actions/complete`, {
    method: "POST", headers: workerAuth,
    body: JSON.stringify({ leaseToken: claimed.leaseToken, summary: "Implemented and verified.", finalResponse: "Ready for owner review.", codexThreadId: "thread-test", changedFiles: ["src/app.ts"], verification: { commands: [{ command: "npm run typecheck", exitCode: 0 }] }, usage: { input_tokens: 10 }, resultRevision, metadata: { repositoryPathLabel: "synthetic-fixture",resultRevision:{id:"spoofed",commit:"f".repeat(40)} } })
  });
  assert.equal(complete.status, 200);
  assert.equal((complete.body as { data: { status: string } }).data.status, "completed");
  assert.deepEqual((complete.body as { data: { metadata: { readyContextPin: unknown } } }).data.metadata.readyContextPin, acceptedMetadata.readyContextPin);
  const receipt=(complete.body as any).data.metadata.resultRevision;
  assert.equal(receipt.schemaVersion,"roost-result-revision-v1");assert.match(receipt.id,/^[a-f0-9-]{36}$/);assert.equal(receipt.executionId,queued.id);assert.equal(receipt.attempt,(complete.body as any).data.attempt);assert.equal(receipt.commit,resultRevision.commit);assert.equal(receipt.workingTree,"dirty");assert.equal(receipt.branch,resultRevision.branch);assert.equal(receipt.checkpointVersion,(complete.body as any).data.checkpointVersion);assert.equal(receipt.hostId,(complete.body as any).data.agentHostId);
  assert.equal(await prisma.evidenceRecord.count({ where: { workspaceId: owner.workspace.id, entityType: "task", entityId: task.id, metadata: { path: ["executionId"], equals: queued.id } } }), 1);

  const ownerRead = await request(`/v1/agent-runtime/executions/${queued.id}`, { headers: ownerAuth });
  assert.equal(ownerRead.status, 200);
  const ownerExecution = (ownerRead.body as { data: { status: string; changedFiles: string[]; events: Array<{ type: string }> } }).data;
  assert.equal(ownerExecution.status, "completed");
  assert.deepEqual(ownerExecution.changedFiles, ["src/app.ts"]);
  assert.ok(ownerExecution.events.some((event) => event.type === "completed"));

  const packetRoute = `/v1/company-intelligence/tasks/${task.id}/agent-context?executionId=${queued.id}`;
  assert.equal((await request(packetRoute)).status, 401);
  assert.equal((await request(packetRoute, { headers: { Authorization: `Bearer ${outsider.token}` } })).status, 404);
  assert.equal((await request(`/v1/company-intelligence/tasks/${task.id}/agent-context?executionId=invalid`, { headers: workerAuth })).status, 400);
  const packetRead = await request(packetRoute, { headers: workerAuth });
  assert.equal(packetRead.status, 200);
  const prepared = (packetRead.body as { data: { executionPacket: { schemaVersion: string; revision: string; identity: { executionId: string; workspaceId: string; taskId: string }; contract: unknown } } }).data.executionPacket;
  assert.equal(prepared.schemaVersion, "roost-execution-packet-v1");
  assert.equal(prepared.identity.executionId, queued.id);
  assert.equal(prepared.identity.taskId, task.id);
  assert.equal(prepared.identity.workspaceId, owner.workspace.id);
  assert.ok(prepared.contract, "queued intent comes from the explicitly validated Ready contract");
  assert.match(prepared.revision, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(prepared).includes(claimed.leaseToken), false);
  const source = await prisma.companyRecord.create({ data: { workspaceId: owner.workspace.id, recordType: "requirement", key: "packet-source", title: "Company source", description: "Synthetic company context", metadata: { secret: "synthetic-source-secret" } } });
  const foreignSource = await prisma.companyRecord.create({ data: { workspaceId: outsider.workspace.id, recordType: "requirement", key: "foreign-packet-source", title: "Foreign source", description: "must-not-leak" } });
  await prisma.agentExecution.update({ where: { id: queued.id }, data: { metadata: { executionContract: { version: "1", context: { company: [{ id: source.id, revision: source.updatedAt.toISOString() }], product: [{ id: foreignSource.id, revision: "1" }] } } } } });
  const sourcedRead = await request(packetRoute, { headers: workerAuth });
  const sourced = (sourcedRead.body as { data: { executionPacket: { revision: string; sources: Array<{ id: string; revision: string }> } } }).data.executionPacket;
  assert.notEqual(sourced.revision, prepared.revision);
  assert.deepEqual(sourced.sources.map((item) => item.id), [source.id]);
  assert.equal(sourced.sources[0]!.revision, source.updatedAt.toISOString());
  assert.equal(JSON.stringify(sourced).includes("synthetic-source-secret"), false);
  assert.equal(JSON.stringify(sourced).includes("must-not-leak"), false);

  const invalidTask = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Incomplete packet", status: "todo" } });
  assert.equal((await request(`/v1/company-intelligence/tasks/${invalidTask.id}/agent-context?executionId=${queued.id}`, { headers: workerAuth })).status, 404);
  const invalidQueue = await request("/v1/agent-runtime/executions", { method: "POST", headers: ownerAuth, body: JSON.stringify({ taskId: invalidTask.id }) });
  assert.equal(invalidQueue.status, 409);
  assert.equal((invalidQueue.body as { error: string }).error, "task_ready_pin_required");
  // Legacy history can still report a safe terminal failure; it cannot be claimed anew.
  const invalid = await historicalRiskExecution({ data: { workspaceId: owner.workspace.id, taskId: invalidTask.id, applicationId: application.id, requestedByType: "user", status: "claimed", agentHostId: originalHost.id, leaseToken: "00000000-0000-4000-8000-000000000081", leaseExpiresAt: new Date(Date.now() + 90000), attempt: 1 } });
  const diagnostic = { schemaVersion: "roost-execution-packet-diagnostics-v1", issues: [{ field: "contract.acceptance", reason: "missing" }] };
  const rejected = await request(`/v1/agent-runtime/executions/${invalid.id}/actions/fail`, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: invalid.leaseToken, code: "execution_packet_invalid", message: "Correct: contract.acceptance (missing).", retryable: false, details: diagnostic }) });
  assert.equal(rejected.status, 200);
  const visible = await request(`/v1/agent-runtime/executions/${invalid.id}`, { headers: ownerAuth });
  const visibleData = (visible.body as { data: { errorState: { code: string; retryable: boolean; details: unknown }; events: Array<{ message: string }> } }).data;
  assert.equal(visibleData.errorState.code, "execution_packet_invalid");
  assert.equal(visibleData.errorState.retryable, false);
  assert.deepEqual(visibleData.errorState.details, diagnostic);
  assert.ok(visibleData.events.some((event) => event.message.includes("contract.acceptance")));
  const rejectedRetry = await request(`/v1/agent-runtime/executions/${invalid.id}/actions/retry`, { method: "POST", headers: ownerAuth, body: "{}" });
  assert.equal(rejectedRetry.status, 409);
  assert.equal((rejectedRetry.body as { error: string }).error, "agent_execution_requires_correction");

  const retryCompleted = await request(`/v1/agent-runtime/executions/${queued.id}/actions/retry`, { method: "POST", headers: ownerAuth, body: "{}" });
  assert.equal(retryCompleted.status, 409, "completed work requires a new owner decision, not an automatic retry");

  const cancelledTask = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Cancel the runtime slice", status: "todo" } });
  await prepareReadyFixture(owner.workspace.id, cancelledTask.id, application.id, ownerAuth);
  const cancelQueue = await request("/v1/agent-runtime/executions", { method: "POST", headers: ownerAuth, body: JSON.stringify({ taskId: cancelledTask.id }) });
  assert.equal(cancelQueue.status, 201);
  const cancelExecutionId = (cancelQueue.body as { data: { id: string } }).data.id;
  const cancelClaim = await request("/v1/agent-runtime/executions/claim", { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug: "test-windows" }) });
  assert.equal(cancelClaim.status, 200);
  const cancelLeaseToken = (cancelClaim.body as { data: { leaseToken: string } }).data.leaseToken;
  const cancelRequest = await request(`/v1/agent-runtime/executions/${cancelExecutionId}/actions/cancel`, { method: "POST", headers: ownerAuth, body: "{}" });
  assert.equal(cancelRequest.status, 200);
  const cancelledHeartbeat = await request(`/v1/agent-runtime/executions/${cancelExecutionId}/heartbeat`, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: cancelLeaseToken, status: "running" }) });
  assert.equal(cancelledHeartbeat.status, 409);
  assert.equal((cancelledHeartbeat.body as { error: string }).error, "agent_execution_cancel_requested");
  const cancellationAck = await request(`/v1/agent-runtime/executions/${cancelExecutionId}/actions/cancelled`, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: cancelLeaseToken }) });
  assert.equal(cancellationAck.status, 200);
  const retryCancelled = await request(`/v1/agent-runtime/executions/${cancelExecutionId}/actions/retry`, { method: "POST", headers: ownerAuth, body: "{}" });
  assert.equal(retryCancelled.status, 201);
  assert.equal((retryCancelled.body as { data: { status: string } }).data.status, "queued");
  const revokedKey = await request(`/v1/api-keys/${workerKeyId}`, { method: "PATCH", headers: ownerAuth, body: JSON.stringify({ active: false }) });
  assert.equal(revokedKey.status, 200);
  const revokeAudit = await prisma.event.findFirstOrThrow({ where: { type: "api_key.revoked", resourceId: workerKeyId } });
  assert.deepEqual(revokeAudit.payload, { active: false });
  const revokedHeartbeat = await request(`/v1/agent-runtime/hosts/${originalHost.id}/heartbeat`, { method: "POST", headers: workerAuth, body: "{}" });
  assert.equal(revokedHeartbeat.status, 403);
  assert.equal((revokedHeartbeat.body as { error: string }).error, "invalid_api_key");
  delete process.env.ROOST_CODEX_EXECUTION_ENABLED;
});

test("owner-authorized host provisioning fixes scope, rejects duplicate credentials and audits revocation", async () => {
  const { provisionHostKey } = await import("../operations/provision-agent-host-key");
  const owner = await registerOwner("host-provisioning@example.com", "Host Provisioning");
  const input = { action: "create", workspaceId: owner.workspace.id, name: "Dedicated observer", ownerAuthorized: true };
  await assert.rejects(provisionHostKey({ ...input, ownerAuthorized: false }));
  await assert.rejects(provisionHostKey({ ...input, scopes: ["companycore:*"] }));
  const credential = await provisionHostKey(input);
  assert.ok("key" in credential);
  if (!("key" in credential)) throw new Error("credential_missing");
  assert.equal(credential.profileId, "mcp_codex_worker");
  await assert.rejects(provisionHostKey(input), /active_key_already_exists/);
  const record = await prisma.apiKey.findUniqueOrThrow({ where: { id: credential.id } });
  assert.equal(record.key, null);
  const event = await prisma.event.findFirstOrThrow({ where: { resourceId: record.id, type: "api_key.created" } });
  assert.equal(event.source, "owner_authorized_host_provisioning");
  assert.ok(!JSON.stringify(event).includes(credential.key));
  const workerAuth = { "X-API-Key": credential.key };
  assert.equal((await request("/v1/connection", { headers: workerAuth })).status, 200);
  assert.equal((await request("/v1/api-keys", { headers: workerAuth })).status, 403);
  await provisionHostKey({ ...input, action: "revoke", keyId: record.id });
  assert.equal((await request("/v1/connection", { headers: workerAuth })).status, 403);
  assert.ok(await prisma.event.findFirst({ where: { resourceId: record.id, type: "api_key.revoked" } }));
});

test("host protocol admission fails closed while incompatible hosts remain online", async () => {
  const owner = await registerOwner("protocol-owner@example.com", "Protocol Fixture");
  const auth = { Authorization: `Bearer ${owner.token}` };
  const headers = { ...auth, ...hostProtocolHeaders };
  const application = await prisma.application.create({ data: { workspaceId: owner.workspace.id, name: "Protocol fixture", slug: "protocol-fixture" } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, title: "Synthetic admission only" } });
  const declaration = { name: "Protocol host", slug: "protocol-fixture", platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities };
  const register = (value: unknown) => request("/v1/agent-runtime/hosts/register", { method: "POST", headers, body: JSON.stringify(value) });
  const response = await register(declaration);
  const host = (response.body as { data: { id: string } }).data;
  const pending = await historicalRiskExecution({ data: { workspaceId: owner.workspace.id, taskId: task.id, applicationId: application.id, agentHostId: host.id, requestedByType: "user", status: "claimed", attempt: 1, leaseToken: "00000000-0000-4000-8000-000000000001", leaseExpiresAt: new Date(Date.now() + 90000), checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: "00000000-0000-4000-8000-000000000001", packetRevision: null, workspaceDigest: null } } });
  const scenarios: Array<[string, unknown, Record<string, string>]> = [
    ["host_protocol_missing", { ...declaration, metadata: {} }, headers],
    ...[0, 2, "1", null].map(version => ["host_protocol_mismatch", { ...declaration, metadata: { ...validHostMetadata, protocolVersion: version } }, headers] as [string, unknown, Record<string, string>]),
    ["host_capabilities_missing", { ...declaration, capabilities: ["heartbeat"] }, headers],
    ["host_capabilities_missing", { ...declaration, capabilities: declaration.capabilities.filter(value => value !== "output_budget_fail_closed_v1") }, headers],
    ["host_capabilities_missing", { ...declaration, capabilities: undefined }, headers],
    ["observer_mode", { ...declaration, metadata: { ...validHostMetadata, executionMode: "observe" } }, headers],
    ["host_mode_missing", { ...declaration, metadata: { protocolVersion: 1 } }, headers],
    ["request_protocol_missing", declaration, auth],
    ["request_capabilities_missing", declaration, { ...headers, "X-Roost-Host-Capabilities": declaration.capabilities.filter(value => value !== "output_budget_fail_closed_v1").join(",") }],
    ["request_protocol_mismatch", declaration, { ...headers, "X-Roost-Host-Protocol": "2" }],
    ["request_capabilities_missing", declaration, { ...headers, "X-Roost-Host-Capabilities": "heartbeat" }]
  ];
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  try {
    for (const [reason, value, requestHeaders] of scenarios) {
      const registered = await register(value);
      assert.equal(registered.status, 200);
      assert.equal((registered.body as { data: { status: string } }).data.status, "online");
      assert.equal((await request(`/v1/agent-runtime/hosts/${host.id}/heartbeat`, { method: "POST", headers, body: "{}" })).status, 200);
      for (const [route, body] of [
        ["/v1/agent-runtime/executions/claim", { hostSlug: declaration.slug }],
        [`/v1/agent-runtime/recovery?hostSlug=${declaration.slug}`, null],
        [`/v1/agent-runtime/executions/${pending.id}/actions/recover`, { hostSlug: declaration.slug, sessionId: "00000000-0000-4000-8000-000000000002", expectedVersion: 1 }]
      ] as const) {
        const rejected = await request(route, { method: body ? "POST" : "GET", headers: requestHeaders, ...(body ? { body: JSON.stringify(body) } : {}) });
        assert.equal(rejected.status, 409, `${reason}: ${route}`);
        assert.equal((rejected.body as { errorDetails: { details: { reason: string } } }).errorDetails.details.reason, reason);
      }
      const unchanged = await prisma.agentExecution.findUniqueOrThrow({ where: { id: pending.id } });
      assert.equal(unchanged.attempt, 1); assert.equal(unchanged.checkpointVersion, 1); assert.equal(unchanged.leaseToken, pending.leaseToken);
    }
    await register(declaration);
    assert.equal((await request(`/v1/agent-runtime/recovery?hostSlug=${declaration.slug}`, { headers })).status, 200);
    const visible = await request("/v1/agent-runtime/hosts", { headers: auth });
    assert.equal((visible.body as { data: Array<{ runtime: { compatibility: { compatible: boolean } } }> }).data[0]!.runtime.compatibility.compatible, true);
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("execution recovery fences old leases and preserves an auditable same-attempt checkpoint", async () => {
  const owner = await registerOwner("recovery-owner@example.com", "Recovery Fixture");
  const outsider = await registerOwner("recovery-outsider@example.com", "Recovery Outsider");
  const ownerAuth = { Authorization: `Bearer ${owner.token}` };
  const outsiderAuth = { Authorization: `Bearer ${outsider.token}` };
  const key = await request("/v1/api-keys", { method: "POST", headers: ownerAuth, body: JSON.stringify({ name: "Recovery worker", profileId: "mcp_codex_worker" }) });
  const workerAuth = { "X-API-Key": (key.body as { data: { key: string } }).data.key, ...hostProtocolHeaders };
  const application = await prisma.application.create({ data: { workspaceId: owner.workspace.id, name: "Recovery Fixture", slug: "recovery-fixture", targetPlatforms: ["web"] } });
  const project = await prisma.project.create({ data: { workspaceId: owner.workspace.id, name: "Recovery Project" } });
  await prisma.applicationProject.create({ data: { applicationId: application.id, projectId: project.id, relationType: "delivery" } });
  const task = await prisma.task.create({ data: { workspaceId: owner.workspace.id, projectId: project.id, title: "Recover same execution" } });
  const hostSlug = "recovery-fixture";
  assert.equal((await request("/v1/agent-runtime/hosts/register", { method: "POST", headers: workerAuth, body: JSON.stringify({ name: "Recovery host", slug: hostSlug, platform: "win32", applicationSlugs: [application.slug], metadata: validHostMetadata, capabilities: protocol.requiredHostCapabilities }) })).status, 200);
  process.env.ROOST_CODEX_EXECUTION_ENABLED = "true";
  try {
    await prepareReadyFixture(owner.workspace.id, task.id, application.id, ownerAuth);
    await request("/v1/agent-runtime/executions", { method: "POST", headers: ownerAuth, body: JSON.stringify({ taskId: task.id }) });
    const sessionId = "00000000-0000-4000-8000-000000000001";
    const claim = await request("/v1/agent-runtime/executions/claim", { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, sessionId }) });
    const claimed = (claim.body as { data: { id: string; leaseToken: string; checkpointVersion: number; attempt: number } }).data;
    assert.equal(claim.status, 200); assert.equal(claimed.checkpointVersion, 1);
    const checkpoint = { schemaVersion: "roost-recovery-v1", stage: "prepared", sessionId, packetRevision: "a".repeat(64), workspaceDigest: "b".repeat(64), contextRevision: "c".repeat(64) };
    const checkpointRoute = `/v1/agent-runtime/executions/${claimed.id}/checkpoint`;
    const { contextRevision: _contextRevision, ...legacyCheckpoint } = checkpoint;
    const missingPin = await request(checkpointRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: claimed.leaseToken, expectedVersion: 1, checkpoint: legacyCheckpoint }) });
    assert.equal(missingPin.status, 409);
    assert.equal((missingPin.body as { error: string }).error, "agent_checkpoint_context_required");
    assert.equal((await request(checkpointRoute, { method: "POST", headers: outsiderAuth, body: JSON.stringify({ leaseToken: claimed.leaseToken, expectedVersion: 1, checkpoint }) })).status, 409);
    const saved = await request(checkpointRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: claimed.leaseToken, expectedVersion: 1, checkpoint }) });
    assert.equal(saved.status, 200);
    assert.equal((saved.body as { data: { checkpointVersion: number } }).data.checkpointVersion, 2);
    const inspectionRoute = `/v1/agent-runtime/recovery?hostSlug=${hostSlug}`;
    assert.equal((await request(inspectionRoute)).status, 401);
    const foreignInspection = await request(inspectionRoute, { headers: outsiderAuth });
    assert.equal(foreignInspection.status, 404);
    const inspection = await request(inspectionRoute, { headers: workerAuth });
    assert.equal(inspection.status, 200);
    assert.equal(JSON.stringify(inspection.body).includes(claimed.leaseToken), false);
    assert.equal((inspection.body as { data: { executions: Array<{ id: string }> } }).data.executions[0]!.id, claimed.id);
    const recoverRoute = `/v1/agent-runtime/executions/${claimed.id}/actions/recover`;
    await prisma.agentExecution.update({ where: { id: claimed.id }, data: { checkpoint: legacyCheckpoint } });
    const legacyRecovery = await request(recoverRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, expectedVersion: 2, sessionId: "00000000-0000-4000-8000-000000000009" }) });
    assert.equal(legacyRecovery.status, 409);
    assert.equal((legacyRecovery.body as { error: string }).error, "agent_recovery_ambiguous");
    await prisma.agentExecution.update({ where: { id: claimed.id }, data: { checkpoint } });
    const responses = await Promise.all([2, 3].map((n) => request(recoverRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, expectedVersion: 2, sessionId: `00000000-0000-4000-8000-00000000000${n}` }) })));
    assert.equal(responses.filter((result) => result.status === 200).length, 1);
    assert.equal(responses.filter((result) => result.status === 409).length, 1);
    const recovered = (responses.find((result) => result.status === 200)!.body as { data: { id: string; attempt: number; leaseToken: string; checkpointVersion: number; checkpoint: typeof checkpoint } }).data;
    assert.equal(recovered.id, claimed.id); assert.equal(recovered.attempt, claimed.attempt); assert.notEqual(recovered.leaseToken, claimed.leaseToken);
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 1);
    for (const action of ["heartbeat", "actions/complete", "actions/fail"]) {
      const stale = await request(`/v1/agent-runtime/executions/${claimed.id}/${action}`, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: claimed.leaseToken, ...(action.endsWith("complete") ? { summary: "Must not complete" } : action.endsWith("fail") ? { code: "stale", message: "Must not fail" } : {}) }) });
      assert.equal(stale.status, 409);
    }
    const spawnCheckpoint = { ...recovered.checkpoint, stage: "spawn_intent" };
    assert.equal(recovered.checkpoint.contextRevision, checkpoint.contextRevision);
    const changedPin = await request(checkpointRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: recovered.leaseToken, expectedVersion: recovered.checkpointVersion, checkpoint: { ...spawnCheckpoint, contextRevision: "d".repeat(64) } }) });
    assert.equal(changedPin.status, 409);
    assert.equal((changedPin.body as { error: string }).error, "agent_checkpoint_identity_changed");
    const leakedCheckpoint = await request(checkpointRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: recovered.leaseToken, expectedVersion: recovered.checkpointVersion, checkpoint: { ...spawnCheckpoint, secret: "synthetic-checkpoint-secret" } }) });
    assert.equal(leakedCheckpoint.status, 409);
    assert.equal(JSON.stringify(leakedCheckpoint.body).includes("synthetic-checkpoint-secret"), false);
    assert.equal((await request(checkpointRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: recovered.leaseToken, expectedVersion: recovered.checkpointVersion, checkpoint: spawnCheckpoint }) })).status, 200);
    assert.equal((await request(recoverRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, expectedVersion: 4, sessionId: "00000000-0000-4000-8000-000000000004" }) })).status, 409);
    const diagnosticRoute = `/v1/agent-runtime/executions/${claimed.id}/actions/recovery-blocked`;
    assert.equal((await request(diagnosticRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, reason: "process_may_be_running" }) })).status, 200);
    assert.equal((await request(diagnosticRoute, { method: "POST", headers: outsiderAuth, body: JSON.stringify({ hostSlug, reason: "process_may_be_running" }) })).status, 404);
    assert.equal((await request(diagnosticRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, reason: "synthetic-secret-reason" }) })).status, 400);
    const visible = await request(`/v1/agent-runtime/executions/${claimed.id}`, { headers: ownerAuth });
    const visibleData = (visible.body as { data: { status: string; errorState: { code: string }; events: Array<{ type: string; message: string }> } }).data;
    assert.notEqual(visibleData.status, "completed");
    assert.equal(visibleData.errorState.code, "agent_execution_recovery_blocked");
    assert.ok(visibleData.events.some((event) => event.type === "recovering" && event.message.includes("prepared")));
    assert.ok(visibleData.events.some((event) => event.type === "recovery_blocked" && event.message.includes("spawn_intent")));
    await prisma.agentExecution.update({ where: { id: claimed.id }, data: { checkpoint: recovered.checkpoint, checkpointVersion: 5, leaseExpiresAt: new Date(0) } });
    const expired = await request(recoverRoute, { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug, expectedVersion: 5, sessionId: "00000000-0000-4000-8000-000000000005" }) });
    assert.equal(expired.status, 409); assert.equal((expired.body as { error: string }).error, "agent_recovery_lease_expired");
    assert.equal((await request(`/v1/agent-runtime/executions/${claimed.id}/heartbeat`, { method: "POST", headers: workerAuth, body: JSON.stringify({ leaseToken: recovered.leaseToken }) })).status, 409);
    assert.equal((await request("/v1/agent-runtime/executions/claim", { method: "POST", headers: workerAuth, body: JSON.stringify({ hostSlug }) })).status, 409);
    assert.notEqual((await prisma.agentExecution.findUniqueOrThrow({ where: { id: claimed.id } })).status, "queued");
    assert.equal(await prisma.agentExecution.count({ where: { taskId: task.id } }), 1);
  } finally { delete process.env.ROOST_CODEX_EXECUTION_ENABLED; }
});

test("CompanyCore v1 protected API flow", async () => {
  const oauthCallback = await realFetch(`${baseUrl}/settings/drive?code=synthetic&state=synthetic`);
  assert.equal(oauthCallback.status, 200);
  assert.ok(oauthCallback.headers.get("content-type")?.includes("text/html"));
  for (const route of ["/privacy", "/terms"]) {
    const document = await realFetch(`${baseUrl}${route}`);
    assert.equal(document.status, 200);
    assert.ok(document.headers.get("content-type")?.includes("text/html"));
    const html = await document.text();
    assert.ok(html.includes("workspace administrator"));
    assert.equal(html.includes("_PENDING"), false);
  }
  const health = await request("/health");
  assert.equal(health.status, 200);
  const v1Health = await request("/v1/health");
  assert.equal(v1Health.status, 200);
  const ready = await request("/ready");
  assert.equal(ready.status, 200);
  const v1Ready = await request("/v1/ready");
  assert.equal(v1Ready.status, 200);
  const buildInfo = await request("/api/build-info");
  assert.equal(buildInfo.status, 200);

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

  const initialDepartments = await request("/v1/departments", { headers: authA });
  assert.equal(initialDepartments.status, 200);
  const initialDepartmentsBody = initialDepartments.body as {
    data: {
      departments: Array<{
        id: string;
        key: string;
        name: string;
        description: string | null;
        icon: string;
        position: number;
        isSystem: boolean;
        status: string;
        linkedViews: string[];
        href: string | null;
      }>;
      availableViews: Array<{ id: string; href: string | null; enabled: boolean }>;
    };
  };
  assert.equal(initialDepartmentsBody.data.departments.length, 13);
  assert.ok(initialDepartmentsBody.data.availableViews.some((view) => (
    view.id === "management.departments"
    && view.href === "/areas?area=12-zarzadzanie&view=departments"
    && view.enabled === true
  )));
  assert.ok(initialDepartmentsBody.data.availableViews.some((view) => (
    view.id === "product.overview"
    && view.href === "/areas?area=02-produkt&view=overview"
    && view.enabled === true
  )));
  assert.ok(initialDepartmentsBody.data.availableViews.some((view) => (
    view.id === "innovation.overview"
    && view.href === "/areas?area=11-innowacje&view=overview"
    && view.enabled === true
  )));
  assert.ok(initialDepartmentsBody.data.availableViews.some((view) => (
    view.id === "operations.procedures"
    && view.href === "/areas?area=04-operacje&view=procedures"
    && view.enabled === true
  )));
  const managementDepartment = initialDepartmentsBody.data.departments.find((department) => department.key === "12-zarzadzanie");
  assert.ok(managementDepartment);
  assert.equal(managementDepartment.name, "12 Management");
  assert.equal(managementDepartment.isSystem, true);
  assert.ok(managementDepartment.linkedViews.includes("management.departments"));
  assert.equal(managementDepartment.href, "/areas?area=12-zarzadzanie&view=overview");

  const createdDepartment = await request("/v1/departments", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "13 Marketing Lab",
      description: "Cross-functional launch workspace.",
      icon: "ph-megaphone",
      linkedViews: ["operations.tasks", "assets.files"]
    })
  });
  assert.equal(createdDepartment.status, 201);
  const createdDepartmentBody = createdDepartment.body as {
    data: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string;
      position: number;
      isSystem: boolean;
      status: string;
      linkedViews: string[];
      views: Array<{ id: string; href: string | null; enabled: boolean }>;
      href: string | null;
    };
  };
  assert.equal(createdDepartmentBody.data.key, "13-marketing-lab");
  assert.equal(createdDepartmentBody.data.name, "13 Marketing Lab");
  assert.equal(createdDepartmentBody.data.description, "Cross-functional launch workspace.");
  assert.equal(createdDepartmentBody.data.icon, "ph-megaphone");
  assert.equal(createdDepartmentBody.data.isSystem, false);
  assert.deepEqual(createdDepartmentBody.data.linkedViews, ["operations.tasks", "assets.files"]);
  assert.equal(createdDepartmentBody.data.href, "/areas?area=04-operacje&view=tasks");

  const updatedDepartment = await request(`/v1/departments/${createdDepartmentBody.data.id}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      name: "13 Growth Lab",
      description: "Launch and growth operating room.",
      icon: "ph-rocket-launch",
      position: 14,
      status: "archived",
      linkedViews: ["assets.files"]
    })
  });
  assert.equal(updatedDepartment.status, 200);
  const updatedDepartmentBody = updatedDepartment.body as {
    data: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string;
      position: number;
      status: string;
      linkedViews: string[];
      href: string | null;
    };
  };
  assert.equal(updatedDepartmentBody.data.id, createdDepartmentBody.data.id);
  assert.equal(updatedDepartmentBody.data.key, "13-marketing-lab");
  assert.equal(updatedDepartmentBody.data.name, "13 Growth Lab");
  assert.equal(updatedDepartmentBody.data.description, "Launch and growth operating room.");
  assert.equal(updatedDepartmentBody.data.icon, "ph-rocket-launch");
  assert.equal(updatedDepartmentBody.data.position, 14);
  assert.equal(updatedDepartmentBody.data.status, "archived");
  assert.deepEqual(updatedDepartmentBody.data.linkedViews, ["assets.files"]);
  assert.equal(updatedDepartmentBody.data.href, "/areas?area=08-zasoby&view=files");

  const invalidDepartmentView = await request("/v1/departments", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      name: "Invalid linked view",
      linkedViews: ["not.approved"]
    })
  });
  assert.equal(invalidDepartmentView.status, 400);
  assert.equal((invalidDepartmentView.body as { error: string }).error, "invalid_department_view");

  const workspaceBDepartments = await request("/v1/departments", { headers: authB });
  assert.equal(workspaceBDepartments.status, 200);
  const workspaceBDepartmentsBody = workspaceBDepartments.body as {
    data: { departments: Array<{ key: string; name: string }> };
  };
  assert.equal(workspaceBDepartmentsBody.data.departments.length, 13);
  assert.ok(!workspaceBDepartmentsBody.data.departments.some((department) => department.key === "13-marketing-lab"));

  await prisma.companyRole.createMany({ data: [
    { workspaceId: ownerA.workspace.id, name: "Operations Agent", type: "agent" },
    { workspaceId: ownerA.workspace.id, name: "Quality Agent", type: "agent" }
  ] });
  const initialWorkforce = await request("/v1/workforce", { headers: authA });
  assert.equal(initialWorkforce.status, 200);
  const initialWorkforceBody = initialWorkforce.body as {
    data: {
      summary: { humans: number };
      entities: Array<{ id: string; source?: string }>;
      dictionaries: { roles: Array<{ id: string; name: string; type: "human" | "agent" }> };
    };
  };
  assert.equal(initialWorkforceBody.data.summary.humans, 1);
  const agentRoleIds = initialWorkforceBody.data.dictionaries.roles.filter((role) => role.type === "agent").slice(0, 2).map((role) => role.id);
  assert.equal(agentRoleIds.length, 2);

  const workforceAgent = await request("/v1/workforce", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      type: "agent",
      status: "active",
      name: "Codex Operations Agent",
      departmentKeys: ["04-operacje", "06-kadry"],
      roleIds: agentRoleIds,
      personalityProfile: "analytical",
      runtimeMode: "semi_autonomous",
      model: "gpt-5.4",
      runtimeExternalId: "codex-ops",
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
      departmentKeys: string[];
      roleIds: string[];
      roles: Array<{ id: string; name: string }>;
    };
  };
  assert.ok(workforceAgentBody.data.generatedFiles["agent.md"].includes("Codex Operations Agent"));
  assert.ok(workforceAgentBody.data.generatedFiles["agent.md"].includes("APQC Process Map"));
  assert.ok(workforceAgentBody.data.generatedFiles["personality.md"].includes("openness: 0.80"));
  assert.ok(workforceAgentBody.data.generatedFiles["environment.md"].includes("00 General"));
  assert.deepEqual(workforceAgentBody.data.skillIndex, ["APQC Process Map", "MECE Responsibility Design"]);
  assert.equal(workforceAgentBody.data.bigFiveProfile.openness, 0.8);
  assert.equal(workforceAgentBody.data.syncStatus, "not_synced");
  assert.deepEqual(workforceAgentBody.data.departmentKeys, ["04-operacje", "06-kadry"]);
  assert.deepEqual(workforceAgentBody.data.roleIds, agentRoleIds);
  assert.deepEqual(workforceAgentBody.data.roles.map((role) => role.id), agentRoleIds);

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
  assert.equal((blockedOwnerDelete.body as { error: string }).error, "primary_owner_transfer_required");

  const removableUser = await prisma.user.create({
    data: { email: "removable-workforce-member@example.com", name: "Removable Member", passwordHash: "test-only-hash" }
  });
  await prisma.workspaceMembership.create({
    data: { workspaceId: ownerA.workspace.id, userId: removableUser.id, role: "member" }
  });
  const removableWorkforce = await prisma.workforceEntity.create({
    data: {
      workspaceId: ownerA.workspace.id,
      type: "human",
      name: "Removable Member",
      slug: "removable-member",
      department: "06-kadry",
      role: "Human member",
      source: "user",
      externalId: removableUser.id
    }
  });
  const removedHuman = await request(`/v1/workforce/${removableWorkforce.id}/actions/delete`, {
    method: "POST",
    headers: authA
  });
  assert.equal(removedHuman.status, 200);
  assert.equal((removedHuman.body as { data: { deleted: boolean; removedWorkspaceMembership: boolean } }).data.removedWorkspaceMembership, true);
  assert.equal(await prisma.workspaceMembership.count({ where: { workspaceId: ownerA.workspace.id, userId: removableUser.id } }), 0);
  assert.equal(await prisma.workforceEntity.count({ where: { id: removableWorkforce.id } }), 0);
  assert.ok(await prisma.user.findUnique({ where: { id: removableUser.id } }));
  await prisma.user.delete({ where: { id: removableUser.id } });

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

  const codexIntakeEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerA.workspace.id,
      eventType: "codex_pricing_discount_proposal",
      targetAgent: "codex",
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
      payload: { note: "Not for Codex filtered intake." }
    }
  });
  const foreignIntakeEvent = await prisma.agentEventOutbox.create({
    data: {
      workspaceId: ownerB.workspace.id,
      eventType: "foreign_workspace_signal",
      targetAgent: "codex",
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
      requestedById: "codex",
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
    && item.sourceId === codexIntakeEvent.id
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

  const codexFilteredIntake = await request("/v1/intake?sourceAgent=codex&limit=20", { headers: authA });
  assert.equal(codexFilteredIntake.status, 200);
  const codexFilteredIntakeBody = codexFilteredIntake.body as {
    data: { items: Array<{ sourceId: string; sourceAgent?: string | null }> };
  };
  assert.ok(codexFilteredIntakeBody.data.items.some((item) => item.sourceId === codexIntakeEvent.id));
  assert.ok(!codexFilteredIntakeBody.data.items.some((item) => item.sourceId === jarvisIntakeEvent.id));

  const pendingCodexEventAfterIntake = await prisma.agentEventOutbox.findUniqueOrThrow({
    where: { id: codexIntakeEvent.id }
  });
  assert.equal(pendingCodexEventAfterIntake.deliveryStatus, "pending");

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
      sourceId: codexIntakeEvent.id,
      targetDepartmentKey: "03-sprzedaz",
      classification: "route_to_department",
      reason: "Codex proposal should be reviewed by Sales before any commercial action.",
      proposedNextAction: "Review the discount context and decide whether a Sales follow-up task is needed.",
      riskLevel: "medium",
      requestOwnerDecision: true,
      createTaskDraft: true,
      idempotencyKey: "codex-discount-route-test"
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
  assert.equal(routeProposalBody.data.proposal.sourceId, codexIntakeEvent.id);
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

  const pendingCodexEventAfterProposal = await prisma.agentEventOutbox.findUniqueOrThrow({
    where: { id: codexIntakeEvent.id }
  });
  assert.equal(pendingCodexEventAfterProposal.deliveryStatus, "pending");

  const repeatedRouteProposal = await request("/v1/intake/actions/propose-route", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      sourceModel: "AgentEventOutbox",
      sourceId: codexIntakeEvent.id,
      targetDepartmentKey: "03-sprzedaz",
      classification: "route_to_department",
      reason: "Codex proposal should be reviewed by Sales before any commercial action.",
      proposedNextAction: "Review the discount context and decide whether a Sales follow-up task is needed.",
      riskLevel: "medium",
      requestOwnerDecision: true,
      createTaskDraft: true,
      idempotencyKey: "codex-discount-route-test"
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
  assert.equal(readbackProposal.proposal.sourceId, codexIntakeEvent.id);
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
      sourceId: codexIntakeEvent.id,
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
    where: { id: { in: [codexIntakeEvent.id, jarvisIntakeEvent.id, foreignIntakeEvent.id] } }
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
      requestedById: "codex",
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
      eventType: "codex_commercial_exception_candidate",
      targetAgent: "codex",
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
      requestedById: "codex",
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
  const assetsImageFile = await prisma.googleDriveFile.create({
    data: {
      workspaceId: ownerA.workspace.id,
      operatingAreaId: assetsContextArea.id,
      provider: "google_drive",
      externalId: "assets-context-preview-image",
      parentExternalId: "assets-context-child-folder",
      name: "Preview image.png",
      mimeType: "image/png",
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
  const unauthenticatedAssetPreview = await request(`/v1/assets/files/${assetsImageFile.id}/preview`);
  assert.equal(unauthenticatedAssetPreview.status, 401);
  const unsupportedAssetPreview = await request(`/v1/assets/files/${assetsDriveFile.id}/preview`, { headers: authA });
  assert.equal(unsupportedAssetPreview.status, 415);
  assert.equal((unsupportedAssetPreview.body as { error: string }).error, "unsupported_media_type");
  const foreignAssetPreview = await request(`/v1/assets/files/${assetsImageFile.id}/preview`, { headers: authB });
  assert.equal(foreignAssetPreview.status, 404);
  assert.equal((foreignAssetPreview.body as { error: string }).error, "not_found");
  const previousGoogleDriveSetting = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    }
  });
  const previewSetting = await prisma.integrationSetting.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: ownerA.workspace.id,
        provider: "google_drive"
      }
    },
    create: {
      workspaceId: ownerA.workspace.id,
      provider: "google_drive",
      secretCiphertext: encryptSecret(JSON.stringify({
        accessToken: "assets-preview-access-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }))
    },
    update: {
      secretCiphertext: encryptSecret(JSON.stringify({
        accessToken: "assets-preview-access-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }))
    }
  });
  const originalFetchBeforeAssetsPreview = globalThis.fetch;
  const previewMediaBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/drive/v3/files/assets-context-preview-image" && url.searchParams.get("alt") === "media") {
        return new Response(previewMediaBytes, {
          status: 200,
          headers: { "Content-Type": "image/png" }
        });
      }
      return new Response(JSON.stringify({ error: "not mocked", path: url.pathname }), { status: 404 });
    }) as typeof fetch;

    const assetPreview = await realFetch(`${baseUrl}/v1/assets/files/${assetsImageFile.id}/preview`, {
      headers: authA
    });
    assert.equal(assetPreview.status, 200);
    assert.equal(assetPreview.headers.get("content-type"), "image/png");
    assert.equal(assetPreview.headers.get("x-content-type-options"), "nosniff");
    assert.match(assetPreview.headers.get("cache-control") ?? "", /private/);
    assert.deepEqual(new Uint8Array(await assetPreview.arrayBuffer()), previewMediaBytes);
  } finally {
    globalThis.fetch = originalFetchBeforeAssetsPreview;
    if (previousGoogleDriveSetting) {
      await prisma.integrationSetting.update({
        where: { id: previewSetting.id },
        data: {
          secretCiphertext: previousGoogleDriveSetting.secretCiphertext,
          config: previousGoogleDriveSetting.config as Prisma.InputJsonValue,
          active: previousGoogleDriveSetting.active,
          lastValidatedAt: previousGoogleDriveSetting.lastValidatedAt
        }
      });
    } else {
      await prisma.integrationSetting.delete({ where: { id: previewSetting.id } });
    }
  }
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
  await prisma.googleDriveFile.delete({ where: { id: assetsImageFile.id } });
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
      consequences: "Prioritize CompanyCore and Codex integration work."
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
      summary: "Owner strategy, goals, and constraints for Codex planning.",
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

  const invitation = await request(`/v1/workspaces/${ownerA.workspace.id}/access/invitations`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ email: "workspace-member@example.com", role: "member" })
  });
  assert.equal(invitation.status, 201);
  const invitationBody = invitation.body as { data: { id: string; token: string; email: string; role: string } };
  assert.equal(invitationBody.data.email, "workspace-member@example.com");
  assert.equal(invitationBody.data.role, "member");
  assert.ok(invitationBody.data.token.length >= 40);
  const storedInvitation = await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: invitationBody.data.id } });
  assert.notEqual(storedInvitation.tokenHash, invitationBody.data.token);

  const invitationPreview = await request(`/v1/auth/invitations/${invitationBody.data.token}`);
  assert.equal(invitationPreview.status, 200);
  assert.equal((invitationPreview.body as { data: { accountExists: boolean; workspace: { id?: string; name: string } } }).data.accountExists, false);

  const acceptedInvitation = await request(`/v1/auth/invitations/${invitationBody.data.token}/accept`, {
    method: "POST",
    body: JSON.stringify({ name: "Workspace Member", password: "workspace-member-password" })
  });
  assert.equal(acceptedInvitation.status, 200);
  const acceptedInvitationBody = acceptedInvitation.body as { data: { token: string; user: { id: string }; role: string } };
  assert.equal(acceptedInvitationBody.data.role, "member");
  const memberAuth = { Authorization: `Bearer ${acceptedInvitationBody.data.token}` };
  assert.equal((await request("/v1/projects", { headers: memberAuth })).status, 200);
  assert.equal((await request("/v1/api-keys", { headers: memberAuth })).status, 403);
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/invitations`, {
    method: "POST", headers: memberAuth, body: JSON.stringify({ email: "denied@example.com", role: "viewer" })
  })).status, 403);

  const membersAfterAccept = await request(`/v1/workspaces/${ownerA.workspace.id}/access/members`, { headers: authA });
  assert.equal(membersAfterAccept.status, 200);
  assert.ok((membersAfterAccept.body as { data: Array<{ userId: string; role: string }> }).data.some((member) => (
    member.userId === acceptedInvitationBody.data.user.id && member.role === "member"
  )));
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/members/${acceptedInvitationBody.data.user.id}`, {
    method: "PATCH", headers: authA, body: JSON.stringify({ role: "viewer" })
  })).status, 200);
  assert.equal((await request("/v1/projects", {
    method: "POST", headers: memberAuth, body: JSON.stringify({ name: "Viewer cannot create" })
  })).status, 403);
  const ownerARecord = await prisma.workspace.findUniqueOrThrow({ where: { id: ownerA.workspace.id } });
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/members/${ownerARecord.ownerUserId}`, {
    method: "DELETE", headers: authA
  })).status, 409);
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/actions/transfer-ownership`, {
    method: "POST", headers: authA, body: JSON.stringify({ userId: acceptedInvitationBody.data.user.id })
  })).status, 200);
  assert.equal((await prisma.workspace.findUniqueOrThrow({ where: { id: ownerA.workspace.id } })).ownerUserId, acceptedInvitationBody.data.user.id);
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/actions/transfer-ownership`, {
    method: "POST", headers: memberAuth, body: JSON.stringify({ userId: ownerARecord.ownerUserId })
  })).status, 200);
  assert.equal((await prisma.workspace.findUniqueOrThrow({ where: { id: ownerA.workspace.id } })).ownerUserId, ownerARecord.ownerUserId);
  assert.equal((await request(`/v1/workspaces/${ownerA.workspace.id}/access/members/${acceptedInvitationBody.data.user.id}`, {
    method: "DELETE", headers: authA
  })).status, 204);
  assert.equal(await prisma.workforceEntity.count({
    where: { workspaceId: ownerA.workspace.id, source: "user", externalId: acceptedInvitationBody.data.user.id }
  }), 0);
  await prisma.user.delete({ where: { id: acceptedInvitationBody.data.user.id } });
  assert.ok(await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id, action: { startsWith: "workspace_" } } }) >= 3);
  await prisma.auditLog.deleteMany({ where: { workspaceId: ownerA.workspace.id, action: { startsWith: "workspace_" } } });

  const previousWorkspaceCreationEnabled = env.workspaceCreationEnabled;
  env.workspaceCreationEnabled = false;
  try {
    assert.equal((await request("/v1/workspaces", { method: "POST", headers: authA, body: JSON.stringify({ name: "Blocked workspace" }) })).status, 403);
    assert.equal((await request("/v1/auth/register", {
      method: "POST", body: JSON.stringify({ email: "blocked-register@example.com", password: "very-strong-password", workspaceName: "Blocked" })
    })).status, 403);
  } finally {
    env.workspaceCreationEnabled = previousWorkspaceCreationEnabled;
  }

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
    where: { workspaceId: ownerA.workspace.id, key: "sales-crm" }
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
  assert.equal(relationshipsContextBody.data.department.backendAreaKey, "sales-crm");
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
    && file.operatingAreaKey === "sales-crm"
  )));
  assert.equal(relationshipsContextBody.data.agentPacket.mode, "read_only");
  assert.ok(relationshipsContextBody.data.agentPacket.allowedActions.includes("read_relationships_context"));
  assert.ok(relationshipsContextBody.data.agentPacket.blockedActions.some((action) => action.action === "send_outreach_or_commitment"));
  await prisma.googleDriveFile.delete({ where: { id: relationshipsDriveFile.id } });
  await prisma.task.delete({ where: { id: relationshipsTask.id } });
  await prisma.decision.delete({ where: { id: relationshipsDecision.id } });
  await prisma.note.delete({ where: { id: relationshipsNote.id } });
  await prisma.deal.delete({ where: { id: relationshipsDeal.id } });
  await prisma.stakeholder.delete({ where: { id: relationshipsStakeholder.id } });
  await prisma.interaction.delete({ where: { id: relationshipsInteraction.id } });
  await prisma.client.delete({ where: { id: relationshipsClient.id } });

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

  const humanOwnerRole = await prisma.companyRole.findUnique({
    where: {
      workspaceId_name: {
        workspaceId: ownerA.workspace.id,
        name: "Human Owner"
      }
    }
  });
  assert.ok(humanOwnerRole);
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
  assert.equal(companyOsSnapshotBody.data.counts.definitions.processes, 2);
  assert.equal(companyOsSnapshotBody.data.counts.definitions.pipelines, 1);
  assert.equal(companyOsSnapshotBody.data.counts.definitions.procedures, 2);
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

  const processCoreKnowledgeItem = await prisma.knowledgeItem.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id }
  });
  const processCoreKnowledgeLink = await prisma.knowledgeLink.create({
    data: {
      workspaceId: ownerA.workspace.id,
      knowledgeItemId: processCoreKnowledgeItem.id,
      targetType: "stage_run",
      targetId: stageRun.id,
      linkType: "evidence",
      confidence: "owner_assigned"
    }
  });

  const unauthenticatedProcessCoreCoverage = await request("/v1/process-core/coverage");
  assert.equal(unauthenticatedProcessCoreCoverage.status, 401);
  const processCoreAuditLogCountBefore = await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } });
  const processCoreEventCountBefore = await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } });
  const processCoreCoverage = await request("/v1/process-core/coverage", { headers: authA });
  assert.equal(processCoreCoverage.status, 200);
  const processCoreCoverageBody = processCoreCoverage.body as {
    data: {
      service: string;
      packet: string;
      mode: string;
      counts: {
        workflowDefinitions: { processes: number; pipelines: number; pipelineStages: number; procedures: number; procedureSteps: number };
        workflowRuntime: { pipelineRuns: number; pipelineRunTaskLinks: number; stageRuns: number };
        governanceAndEvidence: { approvals: number; auditLogs: number; events: number; checklistTemplates: number; acceptanceCriteria: number };
        assetsAndKnowledge: { resources: number; artifacts: number; dependencies: number; knowledgeItems: number; knowledgeLinks: number; googleDriveFiles: number };
        workforce: { workforceEntities: number };
      };
      targetCoverage: Array<{ concept: string; status: string; unsupportedTargetFields: string[] }>;
      unsupportedConcepts: string[];
      apiExposure: { route: string; capability: string; methods: string[]; writableCapabilities: string[] };
      mcpExposure: { expectedToolName: string; riskLevel: string; requiresApproval: boolean };
    };
  };
  assert.equal(processCoreCoverageBody.data.service, "process-core");
  assert.equal(processCoreCoverageBody.data.packet, "coverage");
  assert.equal(processCoreCoverageBody.data.mode, "read_only");
  assert.equal(processCoreCoverageBody.data.counts.workflowDefinitions.processes, 2);
  assert.equal(processCoreCoverageBody.data.counts.workflowDefinitions.pipelines, 1);
  assert.equal(processCoreCoverageBody.data.counts.workflowDefinitions.pipelineStages, 1);
  assert.equal(processCoreCoverageBody.data.counts.workflowDefinitions.procedures, 2);
  assert.equal(processCoreCoverageBody.data.counts.workflowDefinitions.procedureSteps, 19);
  assert.equal(processCoreCoverageBody.data.counts.workflowRuntime.pipelineRuns, 1);
  assert.equal(processCoreCoverageBody.data.counts.workflowRuntime.pipelineRunTaskLinks, 0);
  assert.equal(processCoreCoverageBody.data.counts.workflowRuntime.stageRuns, 1);
  assert.equal(processCoreCoverageBody.data.counts.governanceAndEvidence.approvals, 1);
  assert.equal(processCoreCoverageBody.data.counts.governanceAndEvidence.checklistTemplates, 1);
  assert.equal(processCoreCoverageBody.data.counts.governanceAndEvidence.acceptanceCriteria, 1);
  assert.equal(processCoreCoverageBody.data.counts.assetsAndKnowledge.resources, 1);
  assert.equal(processCoreCoverageBody.data.counts.assetsAndKnowledge.artifacts, 1);
  assert.equal(processCoreCoverageBody.data.counts.assetsAndKnowledge.dependencies, 1);
  assert.equal(processCoreCoverageBody.data.counts.assetsAndKnowledge.knowledgeItems, 1);
  assert.ok(processCoreCoverageBody.data.counts.assetsAndKnowledge.knowledgeLinks >= 1);
  assert.ok(processCoreCoverageBody.data.counts.assetsAndKnowledge.googleDriveFiles >= 0);
  assert.equal(processCoreCoverageBody.data.apiExposure.route, "/v1/process-core/coverage");
  assert.equal(processCoreCoverageBody.data.apiExposure.capability, "process-core:read");
  assert.deepEqual(processCoreCoverageBody.data.apiExposure.methods, ["GET", "POST", "PATCH"]);
  assert.deepEqual(processCoreCoverageBody.data.apiExposure.writableCapabilities, [
    "process-core:write",
    "process-core:activate"
  ]);
  assert.equal(processCoreCoverageBody.data.mcpExposure.expectedToolName, "companycore_get_process_core_coverage");
  assert.equal(processCoreCoverageBody.data.mcpExposure.requiresApproval, false);
  assert.ok(processCoreCoverageBody.data.targetCoverage.some((row) => (
    row.concept === "PipelineTransition"
    && row.status === "missing"
    && row.unsupportedTargetFields.includes("transitionApprovalPolicy")
  )));
  assert.ok(processCoreCoverageBody.data.targetCoverage.some((row) => (
    row.concept === "WorkflowItem"
    && row.status === "partial"
    && row.unsupportedTargetFields.includes("entityType")
  )));
  assert.ok(processCoreCoverageBody.data.unsupportedConcepts.includes("PipelineTransition"));
  assert.ok(processCoreCoverageBody.data.unsupportedConcepts.includes("Blueprint"));
  assert.equal(await prisma.auditLog.count({ where: { workspaceId: ownerA.workspace.id } }), processCoreAuditLogCountBefore);
  assert.equal(await prisma.event.count({ where: { workspaceId: ownerA.workspace.id } }), processCoreEventCountBefore);
  await prisma.knowledgeLink.delete({ where: { id: processCoreKnowledgeLink.id } });
  const foreignProcessCoreCoverage = await request("/v1/process-core/coverage", { headers: authB });
  assert.equal(foreignProcessCoreCoverage.status, 200);
  const foreignProcessCoreCoverageBody = foreignProcessCoreCoverage.body as {
    data: { counts: { workflowDefinitions: { processes: number; pipelines: number }; assetsAndKnowledge: { resources: number } } };
  };
  assert.equal(foreignProcessCoreCoverageBody.data.counts.workflowDefinitions.processes, 1);
  assert.equal(foreignProcessCoreCoverageBody.data.counts.workflowDefinitions.pipelines, 0);
  assert.equal(foreignProcessCoreCoverageBody.data.counts.assetsAndKnowledge.resources, 0);

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

  const companyOsCommandTask = await prisma.task.create({
    data: {
      workspaceId: ownerA.workspace.id,
      title: "Company OS command fixture task",
      description: "Live task target for command-route link assertions.",
      status: "todo",
      priority: "medium"
    }
  });

  const pipelineRunTaskLink = await request(`/v1/company-os/pipeline-runs/${pipelineRun.id}/task-links`, {
    method: "POST",
    headers: authA,
    body: JSON.stringify({
      taskId: companyOsCommandTask.id,
      linkType: "execution_evidence",
      source: "companycore"
    })
  });
  assert.equal(pipelineRunTaskLink.status, 201);
  const pipelineRunTaskLinkBody = pipelineRunTaskLink.body as {
    data: { id: string; taskId: string; pipelineRunId: string; linkType: string; correlationId: string; auditLogId: string };
  };
  assert.equal(pipelineRunTaskLinkBody.data.taskId, companyOsCommandTask.id);
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
      taskId: companyOsCommandTask.id,
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
      targetId: companyOsCommandTask.id,
      linkType: "evidence",
      confidence: "owner_assigned"
    })
  });
  assert.equal(knowledgeLinkCreate.status, 201);
  const knowledgeLinkCreateBody = knowledgeLinkCreate.body as {
    data: { id: string; targetType: string; targetId: string; correlationId: string; auditLogId: string };
  };
  assert.equal(knowledgeLinkCreateBody.data.targetType, "task");
  assert.equal(knowledgeLinkCreateBody.data.targetId, companyOsCommandTask.id);
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
      targetId: companyOsCommandTask.id,
      linkType: "evidence"
    })
  });
  assert.equal(deniedKnowledgeLinkCreate.status, 404);
  await prisma.task.delete({ where: { id: companyOsCommandTask.id } });

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

  const invalidBearerMe = await request("/auth/me", {
    headers: { Authorization: "Bearer not-a-valid-owner-token" }
  });
  assert.equal(invalidBearerMe.status, 401);
  assert.equal((invalidBearerMe.body as { error: string }).error, "invalid_auth_token");

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

  const serviceCannotListKeys = await request("/v1/api-keys", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(serviceCannotListKeys.status, 403);
  assert.equal((serviceCannotListKeys.body as { error: string }).error, "forbidden");

  const serviceCannotListKeyProfiles = await request("/v1/api-keys/profiles", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(serviceCannotListKeyProfiles.status, 403);
  assert.equal((serviceCannotListKeyProfiles.body as { error: string }).error, "forbidden");

  const serviceCannotListWorkspaces = await request("/v1/workspaces", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(serviceCannotListWorkspaces.status, 403);
  assert.equal((serviceCannotListWorkspaces.body as { error: string }).error, "forbidden");

  const serviceCannotSelectWorkspace = await request(`/v1/workspaces/${secondWorkspaceBody.data.workspace.id}/actions/select`, {
    method: "POST",
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(serviceCannotSelectWorkspace.status, 403);
  assert.equal((serviceCannotSelectWorkspace.body as { error: string }).error, "forbidden");

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
  assert.ok(companyOsReaderProfile.scopes.includes("process-core:read"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:definition:write"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:workflow-definition:write"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:workflow-definition:activate"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:approval:request"));
  assert.ok(!companyOsReaderProfile.scopes.includes("company-os:approval:decide"));
  assert.ok(companyOsReaderProfile.recommendedFor.includes("CEO Agent"));
  const mcpOperatorProfile = agentKeyProfilesBody.data.find((profile) => profile.id === "mcp_operator");
  assert.ok(mcpOperatorProfile);
  assert.ok(mcpOperatorProfile.scopes.includes("company-os:automation:execute"));
  const procedureAuthorProfile = agentKeyProfilesBody.data.find((profile) => profile.id === "mcp_procedure_author");
  assert.ok(procedureAuthorProfile);
  assert.equal(procedureAuthorProfile.riskLevel, "medium");
  assert.ok(procedureAuthorProfile.scopes.includes("process-core:write"));
  assert.ok(procedureAuthorProfile.scopes.includes("product-engineering:read"));
  assert.ok(!procedureAuthorProfile.scopes.includes("process-core:activate"));
  assert.ok(!procedureAuthorProfile.scopes.includes("agent-runtime:write"));

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
  assert.ok(createdProfileKeyBody.data.scopes.includes("operating-graph:read"));
  assert.ok(createdProfileKeyBody.data.scopes.includes("process-core:read"));
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
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/operating-graph/areas/:areaKey"
    && tool.capability === "operating-graph:read"
  )));
  assert.ok(profileMcpManifestBody.data.tools.some((tool) => (
    tool.path === "/v1/process-core/coverage"
    && tool.capability === "process-core:read"
  )));
  const profileProcessCoreCoverage = await request("/v1/process-core/coverage", { headers: profileKeyAuth });
  assert.equal(profileProcessCoreCoverage.status, 200);
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
  assert.ok(!scopedConnectionBody.data.capabilities.includes("process-core:read"));
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
  assert.ok(!scopedConnectionBody.data.mcpManifest.tools.some((tool) => tool.capability === "process-core:read"));

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
  assert.ok(!scopedMcpManifestBody.data.tools.some((tool) => tool.capability === "process-core:read"));
  const deniedScopedProcessCoreCoverage = await request("/v1/process-core/coverage", {
    headers: scopedAuth
  });
  assert.equal(deniedScopedProcessCoreCoverage.status, 403);
  assert.equal((deniedScopedProcessCoreCoverage.body as { error: string }).error, "forbidden");

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
          processCore: Array<{ method: string; path: string; capability: string }>;
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
      agentAccess: {
        api: { baseUrl: string; authHeader: string; connectionPath: string; healthPath: string };
        mcp: { serverName: string; transport: string; bridgeWorkingDirectory: string; secretEnvironmentVariable: string };
        codex: { configPath: string; defaultToolsApprovalMode: string; verificationCommand: string };
        agentHost: { transport: string; workspaceRoot: string; configPath: string; runtimeCommand: string };
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
  assert.equal(connectionBody.data.agentAccess.api.authHeader, "X-API-Key");
  assert.equal(connectionBody.data.agentAccess.api.connectionPath, "/v1/connection");
  assert.equal(connectionBody.data.agentAccess.mcp.serverName, "roost");
  assert.equal(connectionBody.data.agentAccess.mcp.transport, "stdio");
  assert.equal(connectionBody.data.agentAccess.mcp.bridgeWorkingDirectory, "C:\\Workspaces\\Roost");
  assert.equal(connectionBody.data.agentAccess.mcp.secretEnvironmentVariable, "COMPANYCORE_API_KEY");
  assert.equal(connectionBody.data.agentAccess.codex.configPath, "~/.codex/config.toml");
  assert.equal(connectionBody.data.agentAccess.codex.defaultToolsApprovalMode, "writes");
  assert.equal(connectionBody.data.agentAccess.agentHost.transport, "outbound_https");
  assert.equal(connectionBody.data.agentAccess.agentHost.workspaceRoot, "C:\\Workspaces");
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
  assert.ok(connectionBody.data.adapterManifest.routes.processCore.some((route) => (
    route.method === "GET"
    && route.path === "/v1/process-core/coverage"
    && route.capability === "process-core:read"
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
    tool.name === "companycore_get_process_core_coverage"
    && tool.path === "/v1/process-core/coverage"
    && tool.capability === "process-core:read"
    && tool.riskLevel === "read"
    && tool.requiresApproval === false
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
  const workflowProcess = await prisma.process.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Agent-readable execution process",
      description: "Process for goal/workflow bridge assertions.",
      department: "Strategy",
      category: "execution",
      status: "active"
    }
  });
  const processIdA = workflowProcess.id;
  const workflowPipeline = await prisma.pipeline.create({
    data: {
      workspaceId: ownerA.workspace.id,
      name: "Agent-readable execution pipeline",
      purpose: "Pipeline for target/workflow bridge assertions.",
      processId: processIdA,
      status: "active"
    }
  });
  const pipelineAId = workflowPipeline.id;

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
      name: "Codex intake"
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
      title: "Agent-readable goal",
      businessPurpose: "Prove one Goal ID across departmental perspectives",
      priority: "high",
      organizationalContext: {
        ownerDepartmentKey: "09-technologia",
        relatedDepartmentKeys: ["11-innowacje"],
        applicableDepartmentKeys: [],
        scopes: [
          { type: "department", entityId: "09-technologia" },
          { type: "department", entityId: "11-innowacje" }
        ]
      }
    })
  });
  assert.equal(goal.status, 201, JSON.stringify(goal.body));
  const goalId = (goal.body as { data: { id: string } }).data.id;

  const readGoal = await request(`/v1/goals/${goalId}`, { headers: authA });
  assert.equal(readGoal.status, 200);
  assert.equal((readGoal.body as { data: { title: string } }).data.title, "Agent-readable goal");
  assert.equal((readGoal.body as { data: { processId: string } }).data.processId, processIdA);
  assert.equal((readGoal.body as { data: { organizationalContext: { ownerDepartment: { key: string } } } }).data.organizationalContext.ownerDepartment.key, "09-technologia");

  const technologyGoals = await request("/v1/goals?departmentKey=09-technologia", { headers: authA });
  const innovationGoals = await request("/v1/goals?departmentKey=11-innowacje", { headers: authA });
  const salesGoals = await request("/v1/goals?departmentKey=03-sprzedaz", { headers: authA });
  assert.equal(technologyGoals.status, 200);
  assert.equal(innovationGoals.status, 200);
  assert.equal(salesGoals.status, 200);
  assert.ok((technologyGoals.body as { data: Array<{ id: string }> }).data.some((item) => item.id === goalId));
  assert.ok((innovationGoals.body as { data: Array<{ id: string }> }).data.some((item) => item.id === goalId));
  assert.ok(!(salesGoals.body as { data: Array<{ id: string }> }).data.some((item) => item.id === goalId));

  const updatedGoal = await request(`/v1/goals/${goalId}`, {
    method: "PATCH",
    headers: authA,
    body: JSON.stringify({
      status: "active-reviewed",
      title: "Agent-readable goal updated once"
    })
  });
  assert.equal(updatedGoal.status, 200);
  const innovationGoalAfterUpdate = await request("/v1/goals?departmentKey=11-innowacje", { headers: authA });
  assert.equal((innovationGoalAfterUpdate.body as { data: Array<{ id: string; title: string }> }).data.find((item) => item.id === goalId)?.title, "Agent-readable goal updated once");
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
      summary: "Codex captured a reply from the lead",
      source: "codex"
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
      summary: "Codex captured and enriched a reply"
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
      context: "Operational records are fragmented across provider tools",
      problem: "Agents cannot distinguish declarations from observed truth",
      decision: "Roost remains the canonical source of truth",
      rationale: "Agents need durable operational memory",
      alternatives: ["Use provider state directly", "Keep agent-local memory"],
      consequences: "External tools synchronize through governed API and MCP boundaries",
      outcome: "approved",
      authorType: "human",
      authorId: "workspace-owner",
      organizationalContext: {
        ownerDepartmentKey: "01-strategia",
        relatedDepartmentKeys: ["09-technologia"],
        applicableDepartmentKeys: [],
        scopes: [{ type: "company" }]
      }
    })
  });
  assert.equal(decision.status, 201, JSON.stringify(decision.body));
  const decisionData = (decision.body as { data: { id: string; decision: string; alternatives: string[]; organizationalContext: { ownerDepartment: { key: string } } } }).data;
  const decisionId = decisionData.id;
  assert.equal(decisionData.decision, "Roost remains the canonical source of truth");
  assert.equal(decisionData.alternatives.length, 2);
  assert.equal(decisionData.organizationalContext.ownerDepartment.key, "01-strategia");

  const technologyDecisions = await request("/v1/decisions?departmentKey=09-technologia", { headers: authA });
  assert.ok((technologyDecisions.body as { data: Array<{ id: string }> }).data.some((item) => item.id === decisionId));

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
      redirectUri: "https://roost.example.com/settings/google-drive/callback",
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
  assert.ok(authorizationUrl.searchParams.get("scope")?.split(" ").includes("https://www.googleapis.com/auth/drive"));

  const serviceCannotCreateGoogleDriveAuthUrl = await request("/v1/integration-settings/google_drive/oauth/authorize-url", {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({
      redirectUri: "https://roost.example.com/settings/google-drive/callback"
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
      redirectUri: "https://roost.example.com/settings/drive",
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
        redirectUri: "https://roost.example.com/settings/drive",
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
      if (url.pathname === "/v4/spreadsheets/drive-sheet-1") return new Response(JSON.stringify({ sheets: [{ properties: { title: "Sheet1" } }] }), { status: 200 });
      assert.equal(decodeURIComponent(url.pathname), "/v4/spreadsheets/drive-sheet-1/values/'Sheet1'");
      return new Response(JSON.stringify({
        range: "A1:Z100",
        values: [["Metric", "Value"], ["Imported sheet", "indexed"]]
      }), { status: 200 });
    }

    if (url.pathname.startsWith("/drive/v3/files/") && !url.pathname.endsWith("/drive-folder-root")) return new Response(JSON.stringify({}), { status: 404 });
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
    assert.equal(repeatDriveImportBody.data.contentRefreshedCount, 1);
    assert.equal(repeatDriveImportBody.data.contentSkippedCount, 4);
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
  let createdSheetValues = [["Name", "Value"], ["Jarvis", "ready"]];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/drive/v3/files/drive-folder-root") return new Response(JSON.stringify({ id: "drive-folder-root", name: "Root", mimeType: "application/vnd.google-apps.folder" }), { status: 200 });
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
        revisionId: "docs-native-revision-1",
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

    if (url.pathname.startsWith("/v4/spreadsheets/created-sheet-1/values/") && init?.method === "PUT") {
      createdSheetValues = JSON.parse(String(init.body)).values;
      return new Response(JSON.stringify({ updatedRange: "A1:B2" }), { status: 200 });
    }

    if (url.pathname === "/v4/spreadsheets/created-sheet-1") return new Response(JSON.stringify({ sheets: [{ properties: { title: "Sheet1" } }] }), { status: 200 });
    if (decodeURIComponent(url.pathname) === "/v4/spreadsheets/created-sheet-1/values/'Sheet1'") {
      return new Response(JSON.stringify({ values: createdSheetValues }), { status: 200 });
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
    const createdDocBody = createdDoc.body as { data: { file: { id: string; externalId: string }; snapshot: { summary: string; sourceRevisionId: string } } };
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
        expectedRevision: createdDocBody.data.snapshot.sourceRevisionId,
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
    const createdSheetBody = createdSheet.body as { data: { file: { id: string; externalId: string }; snapshot: { extractedText: string; sourceRevisionId: string } } };
    createdSheetId = createdSheetBody.data.file.id;
    assert.equal(createdSheetBody.data.file.externalId, "created-sheet-1");
    assert.ok(createdSheetBody.data.snapshot.extractedText.includes("Jarvis | ready"));

    const updatedSheet = await request(`/v1/google-drive/sheets/${createdSheetId}/values`, {
      method: "PUT",
      headers: authA,
      body: JSON.stringify({
        expectedRevision: createdSheetBody.data.snapshot.sourceRevisionId,
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

    if (url.pathname === "/drive/v3/files/drive-folder-root") return new Response(JSON.stringify({ id: "drive-folder-root", name: "Root", mimeType: "application/vnd.google-apps.folder" }), { status: 200 });
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
  const pendingAgentEvents = await request("/v1/agent-events?targetAgent=codex", {
    headers: { "X-API-Key": serviceKey }
  });
  assert.equal(pendingAgentEvents.status, 200);
  assert.ok((pendingAgentEvents.body as { data: Array<{ id: string }> }).data.length >= 2);
  const acknowledgedAgentEvent = await request(`/v1/agent-events/${driveAgentEvents[0]!.id}/ack`, {
    method: "POST",
    headers: { "X-API-Key": serviceKey },
    body: JSON.stringify({ targetAgent: "codex" })
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

    if (url.pathname === "/drive/v3/files/drive-folder-root") return new Response(JSON.stringify({ id: "drive-folder-root", name: "Root", mimeType: "application/vnd.google-apps.folder" }), { status: 200 });
    if (url.pathname === "/drive/v3/files") return new Response(JSON.stringify({ files: [] }), { status: 200 });
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

  globalThis.fetch = (async () => new Response(JSON.stringify({ err: "Rate limited" }), { status: 429, headers: { "Retry-After": "0.001" } })) as typeof fetch;

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
          { id: "team-1", name: "Example Company" },
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
    const inboxId = (liveWebhook.body as { data: { inboxId: string } }).data.inboxId;
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus === "processed") break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus, "processed");
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
    const inboxId = (commentWebhook.body as { data: { inboxId: string } }).data.inboxId;
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus === "processed") break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal((await prisma.providerEventInbox.findUniqueOrThrow({ where: { id: inboxId } })).processingStatus, "processed");
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
    if (url.pathname === "/api/v2/task/clickup-task-live" && !init?.method) return new Response(JSON.stringify({ id: "clickup-task-live", name: "Task", status: { status: "in progress", type: "custom" }, list: { id: "list-1" } }), { status: 200 });
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
    archived: false,
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

    if (url.pathname === "/api/v2/webhook/webhook-list-1" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body));
      assert.ok(body.events.includes("taskMoved"));
      assert.equal(body.status, "active");
      return new Response(JSON.stringify({ webhook: { id: "webhook-list-1", health: { status: "active" } } }), { status: 200 });
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
  globalThis.fetch = (async (input: string | URL | Request) => {
    if (new URL(String(input)).pathname.includes("/task/")) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify({
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
  }), { status: 200 }); }) as typeof fetch;

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

  globalThis.fetch = (async (input: string | URL | Request) => {
    if (new URL(String(input)).pathname.includes("/task/")) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify({
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
  }), { status: 200 }); }) as typeof fetch;

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

  globalThis.fetch = (async (input: string | URL | Request) => {
    if (new URL(String(input)).pathname.includes("/task/")) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify({
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
  }), { status: 200 }); }) as typeof fetch;

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

  globalThis.fetch = (async (input: string | URL | Request) => {
    if (new URL(String(input)).pathname.includes("/task/")) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify({
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
  }), { status: 200 }); }) as typeof fetch;

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
    assert.equal(replaceBody.data.createdCount, 0);
    assert.equal(replaceBody.data.updatedCount, 1);
    assert.equal(replaceBody.data.deletedCount, 0);
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
  assert.ok(removedClickUpTask, "replacement preserves existing record identities");

  const manualTaskAfterReplace = await prisma.task.findUnique({
    where: { id: taskId }
  });
  assert.equal(manualTaskAfterReplace?.title, "Workspace A task");

  let createdInClickUpPayload: unknown = null;
  let customFieldPayload: unknown = null;
  let archivePayload: unknown = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v2/list/list-1" && !init?.method) return new Response(JSON.stringify({ id: "list-1", statuses: [{ status: "to do", type: "open" }] }), { status: 200 });
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
    archived: false,
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

  // Product Map ingress is intentionally outside normal API-key middleware so
  // that it can reject malformed raw bodies before JSON parsing. Bind the
  // workspace server-side and prove persistence, isolated reads, and the
  // shared durable burst limiter through the real HTTP route.
  const projectionSourceBinding = await request("/v1/product-map/projection/source", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({ companyId: "codex-company-a" })
  });
  assert.equal(projectionSourceBinding.status, 200);
  assert.deepEqual(projectionSourceBinding.body, { data: { companyId: "codex-company-a", state: "bound" } });
  const projectionSourceIdempotent = await request("/v1/product-map/projection/source", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({ companyId: "codex-company-a" })
  });
  assert.equal(projectionSourceIdempotent.status, 200);
  assert.deepEqual(projectionSourceIdempotent.body, { data: { companyId: "codex-company-a", state: "unchanged" } });
  const projectionSourceRemapDenied = await request("/v1/product-map/projection/source", {
    method: "PUT",
    headers: authA,
    body: JSON.stringify({ companyId: "codex-company-b" })
  });
  assert.equal(projectionSourceRemapDenied.status, 409);
  const productMapKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ name: "Product Map publisher", scopes: ["product-map:projection:ingest"] })
  });
  assert.equal(productMapKey.status, 201);
  const productMapKeyValue = (productMapKey.body as { data: { key: string } }).data.key;
  const broadProductMapKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ name: "Broad Product Map publisher", scopes: ["*"], fullAccessConfirmed: true })
  });
  assert.equal(broadProductMapKey.status, 201);
  const oversizedIngressBody = "x".repeat(256 * 1024 + 1);
  const preParseHeaders: Array<Record<string, string>> = [
    { "Content-Type": "application/json" },
    { "Content-Type": "application/json", "X-API-Key": "cc_v1_invalid_product_map_key" },
    { "Content-Type": "application/json", "X-API-Key": (broadProductMapKey.body as { data: { key: string } }).data.key }
  ];
  for (const headers of preParseHeaders) {
    const deniedBeforeRawBodyParsing = await request("/v1/product-map/projection/ingest", {
      method: "POST",
      headers,
      body: oversizedIngressBody
    });
    assert.equal(deniedBeforeRawBodyParsing.status, 403);
    assert.deepEqual(deniedBeforeRawBodyParsing.body, { error: "projection_ingress_denied" });
  }
  const sourceOnlyProjectionRead = await request("/v1/product-map/projection", { headers: authA });
  assert.equal(sourceOnlyProjectionRead.status, 200);
  assert.equal((sourceOnlyProjectionRead.body as { data: { status: string; packet: unknown; procedure: { identity: { procedureId: string; procedureVersion: string }; definition: { stages: unknown[] } } } }).data.status, "source_only");
  assert.equal((sourceOnlyProjectionRead.body as { data: { packet: unknown } }).data.packet, null);
  assert.equal((sourceOnlyProjectionRead.body as { data: { procedure: { identity: { procedureId: string; procedureVersion: string }; definition: { stages: unknown[] } } } }).data.procedure.identity.procedureId, "PROC-SH-APPLICATION-LIFECYCLE");
  assert.equal((sourceOnlyProjectionRead.body as { data: { procedure: { definition: { stages: unknown[] } } } }).data.procedure.definition.stages.length, 18);
  const unauthenticatedProjectionRead = await request("/v1/product-map/projection");
  assert.equal(unauthenticatedProjectionRead.status, 401);

  const productObservedAt = new Date().toISOString();
  const productPacket = productMapPacket(productObservedAt);
  const productDigest = packetDigest(productPacket);
  const productEnvelopeBase = {
    transportVersion: productMapTransportVersion,
    schemaVersion: productMapSchemaVersion,
    companyId: "codex-company-a",
    sourceSnapshotId: "portfolio-snapshot-a",
    observedAt: productObservedAt,
    publishedAt: new Date().toISOString(),
    packetDigest: productDigest,
    packet: productPacket
  };
  const productEnvelope = {
    ...productEnvelopeBase,
    idempotencyKey: expectedIdempotencyKey(productEnvelopeBase)
  };

  const privatePacket = { ...productPacket, prompt: "private-payload" };
  const privateEnvelopeBase = {
    ...productEnvelopeBase,
    sourceSnapshotId: "portfolio-snapshot-private",
    packetDigest: packetDigest(privatePacket),
    packet: privatePacket
  };
  const privateEnvelope = {
    ...privateEnvelopeBase,
    idempotencyKey: expectedIdempotencyKey(privateEnvelopeBase)
  };
  const persistenceBeforePrivateRejection = {
    snapshots: await prisma.productMapProjectionSnapshot.count({ where: { workspaceId: ownerA.workspace.id } }),
    receipts: await prisma.productMapProjectionReceipt.count({ where: { workspaceId: ownerA.workspace.id } }),
    quarantines: await prisma.productMapProjectionQuarantine.count({ where: { workspaceId: ownerA.workspace.id } }),
    states: await prisma.productMapProjectionState.count({ where: { workspaceId: ownerA.workspace.id } }),
    admissions: await prisma.productMapProjectionAdmission.count({ where: { workspaceId: ownerA.workspace.id } })
  };
  const privateProjectionDenied = await request("/v1/product-map/projection/ingest", {
    method: "POST",
    headers: { "X-API-Key": productMapKeyValue, "X-Request-ID": "attacker-controlled-correlation" },
    body: JSON.stringify(privateEnvelope)
  });
  assert.equal(privateProjectionDenied.status, 400);
  assert.deepEqual({
    snapshots: await prisma.productMapProjectionSnapshot.count({ where: { workspaceId: ownerA.workspace.id } }),
    receipts: await prisma.productMapProjectionReceipt.count({ where: { workspaceId: ownerA.workspace.id } }),
    quarantines: await prisma.productMapProjectionQuarantine.count({ where: { workspaceId: ownerA.workspace.id } }),
    states: await prisma.productMapProjectionState.count({ where: { workspaceId: ownerA.workspace.id } }),
    admissions: await prisma.productMapProjectionAdmission.count({ where: { workspaceId: ownerA.workspace.id } })
  }, persistenceBeforePrivateRejection);
  const correlationOverrideDenied = await request("/v1/product-map/projection/ingest", {
    method: "POST",
    headers: { "X-API-Key": productMapKeyValue },
    body: JSON.stringify({ ...productEnvelope, auditCorrelation: "attacker-controlled-correlation" })
  });
  assert.equal(correlationOverrideDenied.status, 400);
  assert.deepEqual({
    snapshots: await prisma.productMapProjectionSnapshot.count({ where: { workspaceId: ownerA.workspace.id } }),
    receipts: await prisma.productMapProjectionReceipt.count({ where: { workspaceId: ownerA.workspace.id } }),
    quarantines: await prisma.productMapProjectionQuarantine.count({ where: { workspaceId: ownerA.workspace.id } }),
    states: await prisma.productMapProjectionState.count({ where: { workspaceId: ownerA.workspace.id } })
  }, {
    snapshots: persistenceBeforePrivateRejection.snapshots,
    receipts: persistenceBeforePrivateRejection.receipts,
    quarantines: persistenceBeforePrivateRejection.quarantines,
    states: persistenceBeforePrivateRejection.states
  });

  const ingestProjection = () => request("/v1/product-map/projection/ingest", {
    method: "POST",
    headers: { "X-API-Key": productMapKeyValue },
    body: JSON.stringify(productEnvelope)
  });
  const acceptedProjection = await ingestProjection();
  assert.equal(acceptedProjection.status, 200);
  assert.equal((acceptedProjection.body as { data: { status: string } }).data.status, "accepted");
  const firstAcceptedSnapshot = await prisma.productMapProjectionSnapshot.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, sourceSnapshotId: productEnvelope.sourceSnapshotId }
  });
  assert.ok(firstAcceptedSnapshot.auditCorrelation);
  const projectionReadKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ name: "Product Map reader", scopes: ["product-map:projection:read"] })
  });
  const projectionReadKeyValue = (projectionReadKey.body as { data: { key: string } }).data.key;
  const projectionRead = await request("/v1/product-map/projection", {
    headers: { "X-API-Key": projectionReadKeyValue, "X-Request-ID": "attacker-controlled-correlation" }
  });
  assert.equal(projectionRead.status, 200);
  assert.deepEqual((projectionRead.body as { data: { packet: unknown } }).data.packet, productPacket);
  const projectionProcedure = (projectionRead.body as {
    data: {
      status: string;
      procedure: {
        identity: { procedureId: string; procedureVersion: string };
        gates: unknown[];
        audit: { correlationId: string; packetDigestPrefix: string };
        authority: { readOnly: boolean; canMutateAgentRuntime: boolean; canPromoteReadiness: boolean };
      };
    };
  }).data;
  assert.equal(projectionProcedure.status, "current");
  const projectionFreshness = (projectionRead.body as { data: { freshness: {
    checkedAt: string; observedAt: string; ageMs: number; lagMs: number;
    ttlMs: number; lastKnownGoodWindowMs: number; status: string;
  } } }).data.freshness;
  assert.equal(projectionFreshness.status, "current");
  assert.equal(projectionFreshness.observedAt, productObservedAt);
  assert.equal(projectionFreshness.ageMs, projectionFreshness.lagMs);
  assert.equal(projectionFreshness.ttlMs, 15 * 60 * 1000);
  assert.equal(projectionFreshness.lastKnownGoodWindowMs, 24 * 60 * 60 * 1000);
  assert.match(projectionFreshness.checkedAt, /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T/);
  const fixedProjectionReadAt = new Date("2030-01-02T00:00:00.000Z");
  const assertFixedProjectionFreshness = async (
    ageMs: number,
    expectedStatus: "current" | "stale" | "unavailable"
  ) => {
    const observedAt = new Date(fixedProjectionReadAt.getTime() - ageMs).toISOString();
    await prisma.productMapProjectionSnapshot.update({
      where: { id: firstAcceptedSnapshot.id },
      data: {
        observedAt: new Date(observedAt),
        packet: productMapPacket(observedAt) as Prisma.InputJsonValue
      }
    });
    const fixedProjectionRead = await withFixedDate(fixedProjectionReadAt, () => request("/v1/product-map/projection", {
      headers: { "X-API-Key": projectionReadKeyValue }
    }));
    assert.equal(fixedProjectionRead.status, 200);
    const fixedFreshness = (fixedProjectionRead.body as { data: {
      status: string;
      freshness: {
        checkedAt: string; observedAt: string | null; ageMs: number | null; lagMs: number | null;
        ttlMs: number; lastKnownGoodWindowMs: number; status: string;
      };
    } }).data;
    assert.equal(fixedFreshness.status, expectedStatus);
    assert.deepEqual(fixedFreshness.freshness, {
      checkedAt: fixedProjectionReadAt.toISOString(),
      observedAt,
      ageMs,
      lagMs: ageMs,
      ttlMs: 15 * 60 * 1000,
      lastKnownGoodWindowMs: 24 * 60 * 60 * 1000,
      status: expectedStatus
    });
  };
  await assertFixedProjectionFreshness(15 * 60 * 1000, "current");
  await assertFixedProjectionFreshness(15 * 60 * 1000 + 1, "stale");
  await assertFixedProjectionFreshness(24 * 60 * 60 * 1000, "stale");
  await assertFixedProjectionFreshness(24 * 60 * 60 * 1000 + 1, "unavailable");
  assert.equal(projectionProcedure.procedure.identity.procedureId, "PROC-SH-APPLICATION-LIFECYCLE");
  assert.equal(projectionProcedure.procedure.identity.procedureVersion, "1.0");
  assert.equal(projectionProcedure.procedure.gates.length, 18);
  assert.notEqual(projectionProcedure.procedure.audit.correlationId, "attacker-controlled-correlation");
  assert.equal(projectionProcedure.procedure.audit.correlationId, firstAcceptedSnapshot.auditCorrelation);
  assert.match(projectionProcedure.procedure.audit.correlationId, /^[0-9a-f-]{36}$/);
  assert.equal(projectionProcedure.procedure.audit.packetDigestPrefix, productDigest.slice(0, 12));
  assert.equal(projectionProcedure.procedure.authority.readOnly, true);
  assert.equal(projectionProcedure.procedure.authority.canMutateAgentRuntime, false);
  assert.equal(projectionProcedure.procedure.authority.canPromoteReadiness, false);
  const repeatedProjectionRead = await request("/v1/product-map/projection", {
    headers: { "X-API-Key": projectionReadKeyValue, "X-Request-ID": "different-request-correlation" }
  });
  assert.equal(repeatedProjectionRead.status, 200);
  assert.equal(
    (repeatedProjectionRead.body as { data: { procedure: { audit: { correlationId: string } } } }).data.procedure.audit.correlationId,
    projectionProcedure.procedure.audit.correlationId
  );
  const serializedProjectionRead = JSON.stringify(repeatedProjectionRead.body);
  assert.ok(!serializedProjectionRead.includes(productMapKeyValue));
  assert.ok(!serializedProjectionRead.includes("private-payload"));
  assert.ok(!serializedProjectionRead.includes("attacker-controlled-correlation"));

  const ingestOnlyRead = await request("/v1/product-map/projection", { headers: { "X-API-Key": productMapKeyValue } });
  assert.equal(ingestOnlyRead.status, 403);
  const broadProjectionRead = await request("/v1/product-map/projection", {
    headers: { "X-API-Key": (broadProductMapKey.body as { data: { key: string } }).data.key }
  });
  assert.equal(broadProjectionRead.status, 403);
  const crossWorkspaceProjectionRead = await request("/v1/product-map/projection", { headers: authB });
  assert.equal(crossWorkspaceProjectionRead.status, 200);
  assert.equal((crossWorkspaceProjectionRead.body as { data: { status: string; packet: unknown } }).data.status, "source_only");
  assert.equal((crossWorkspaceProjectionRead.body as { data: { packet: unknown } }).data.packet, null);

  const ownerASnapshot = await prisma.productMapProjectionSnapshot.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id },
    orderBy: { receivedAt: "desc" }
  });
  await prisma.productMapProjectionState.upsert({
    where: { workspaceId: ownerB.workspace.id },
    create: { workspaceId: ownerB.workspace.id, activeSnapshotId: ownerASnapshot.id, activeObservedAt: ownerASnapshot.observedAt },
    update: { activeSnapshotId: ownerASnapshot.id, activeObservedAt: ownerASnapshot.observedAt }
  });
  const poisonedPointerRead = await request("/v1/product-map/projection", { headers: authB });
  assert.equal(poisonedPointerRead.status, 200);
  assert.equal((poisonedPointerRead.body as { data: { status: string; packet: unknown } }).data.status, "unavailable");
  assert.equal((poisonedPointerRead.body as { data: { packet: unknown } }).data.packet, null);
  await prisma.productMapProjectionState.delete({ where: { workspaceId: ownerB.workspace.id } });

  // The following fixture uses the same disposable PostgreSQL database as the
  // API suite. It checks that a logical restore retains the active pointer,
  // then recreates the app and uses two HTTP listeners against the same DB to
  // prove that idempotency, the durable admission bucket, and advisory lock
  // remain database-owned rather than process-local.
  const durabilityKey = await request("/v1/api-keys", {
    method: "POST",
    headers: authA,
    body: JSON.stringify({ name: "Product Map durability publisher", scopes: ["product-map:projection:ingest"] })
  });
  assert.equal(durabilityKey.status, 201);
  const durabilityHeaders = { "X-API-Key": (durabilityKey.body as { data: { key: string } }).data.key };
  const durabilityObservedAt = new Date(Date.now() + 1_000).toISOString();
  const durabilityPacket = productMapPacket(durabilityObservedAt, "roost-durability");
  const durabilityEnvelopeBase = {
    ...productEnvelopeBase,
    sourceSnapshotId: "portfolio-snapshot-durability",
    observedAt: durabilityObservedAt,
    publishedAt: new Date().toISOString(),
    packetDigest: packetDigest(durabilityPacket),
    packet: durabilityPacket
  };
  const durabilityEnvelope = {
    ...durabilityEnvelopeBase,
    idempotencyKey: expectedIdempotencyKey(durabilityEnvelopeBase)
  };
  const durabilityAccepted = await request("/v1/product-map/projection/ingest", {
    method: "POST", headers: durabilityHeaders, body: JSON.stringify(durabilityEnvelope)
  });
  assert.equal(durabilityAccepted.status, 200);
  const durabilitySnapshot = await prisma.productMapProjectionSnapshot.findFirstOrThrow({
    where: { workspaceId: ownerA.workspace.id, sourceSnapshotId: durabilityEnvelope.sourceSnapshotId }
  });
  assert.ok(durabilitySnapshot.auditCorrelation);
  assert.notEqual(durabilitySnapshot.auditCorrelation, firstAcceptedSnapshot.auditCorrelation);
  const durabilityProjection = await request("/v1/product-map/projection", { headers: { "X-API-Key": projectionReadKeyValue } });
  assert.equal(durabilityProjection.status, 200);
  assert.equal(
    (durabilityProjection.body as { data: { procedure: { audit: { correlationId: string } } } }).data.procedure.audit.correlationId,
    durabilitySnapshot.auditCorrelation
  );

  const restoreSnapshot = await prisma.productMapProjectionSnapshot.findMany({
    where: { workspaceId: ownerA.workspace.id }, orderBy: { receivedAt: "asc" }
  });
  const restoreReceipts = await prisma.productMapProjectionReceipt.findMany({
    where: { workspaceId: ownerA.workspace.id }, orderBy: { receivedAt: "asc" }
  });
  const restoreState = await prisma.productMapProjectionState.findUnique({ where: { workspaceId: ownerA.workspace.id } });
  assert.ok(restoreState?.activeSnapshotId);
  await prisma.productMapProjectionState.deleteMany({ where: { workspaceId: ownerA.workspace.id } });
  await prisma.productMapProjectionReceipt.deleteMany({ where: { workspaceId: ownerA.workspace.id } });
  await prisma.productMapProjectionSnapshot.deleteMany({ where: { workspaceId: ownerA.workspace.id } });
  await prisma.$transaction([
    prisma.productMapProjectionSnapshot.createMany({
      data: restoreSnapshot.map(({ packet, ...snapshot }) => ({ ...snapshot, packet: packet as Prisma.InputJsonValue }))
    }),
    prisma.productMapProjectionReceipt.createMany({ data: restoreReceipts }),
    prisma.productMapProjectionState.create({ data: restoreState! })
  ]);
  const restoredProjection = await request("/v1/product-map/projection", { headers: { "X-API-Key": projectionReadKeyValue } });
  assert.equal(restoredProjection.status, 200);
  assert.deepEqual((restoredProjection.body as { data: { packet: unknown } }).data.packet, durabilityPacket);
  assert.equal(
    (restoredProjection.body as { data: { procedure: { audit: { correlationId: string } } } }).data.procedure.audit.correlationId,
    durabilitySnapshot.auditCorrelation
  );

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const restartedDuplicate = await request("/v1/product-map/projection/ingest", {
    method: "POST", headers: durabilityHeaders, body: JSON.stringify(durabilityEnvelope)
  });
  assert.equal(restartedDuplicate.status, 200);
  assert.equal((restartedDuplicate.body as { data: { status: string } }).data.status, "duplicate");

  const peerServer = createApp().listen(0);
  await new Promise<void>((resolve) => peerServer.once("listening", resolve));
  const peerBaseUrl = `http://127.0.0.1:${(peerServer.address() as AddressInfo).port}`;
  try {
    const independentAdmissionKey = await request("/v1/api-keys", {
      method: "POST", headers: authA,
      body: JSON.stringify({ name: "Independent instance publisher", scopes: ["product-map:projection:ingest"] })
    });
    assert.equal(independentAdmissionKey.status, 201);
    const independentAdmissionKeyData = independentAdmissionKey.body as { data: { id: string; key: string } };
    const durableAdmissionDecisions = await Promise.all(
      Array.from({ length: 4 }, () => consumeProjectionAdmission(independentAdmissionKeyData.data.id, ownerA.workspace.id))
    );
    assert.equal(durableAdmissionDecisions.filter(Boolean).length, 3);
    const independentRouteKey = await request("/v1/api-keys", {
      method: "POST", headers: authA,
      body: JSON.stringify({ name: "Independent instance HTTP publisher", scopes: ["product-map:projection:ingest"] })
    });
    assert.equal(independentRouteKey.status, 201);
    const independentHeaders = { "Content-Type": "application/json", "X-API-Key": (independentRouteKey.body as { data: { key: string } }).data.key };
    const independentRequest = (base: string) => realFetch(`${base}/v1/product-map/projection/ingest`, {
      method: "POST", headers: independentHeaders, body: JSON.stringify(durabilityEnvelope)
    });
    const admissionResponses = await Promise.all([
      independentRequest(baseUrl), independentRequest(peerBaseUrl), independentRequest(peerBaseUrl), independentRequest(baseUrl)
    ]);
    const admissionStatuses = await Promise.all(admissionResponses.map(async (response) => response.status));
    assert.ok(admissionStatuses.includes(200));
    assert.ok(admissionStatuses.includes(429));

    const lockKey = await request("/v1/api-keys", {
      method: "POST", headers: authA,
      body: JSON.stringify({ name: "Independent instance lock publisher", scopes: ["product-map:projection:ingest"] })
    });
    assert.equal(lockKey.status, 201);
    const lockHeaders = { "Content-Type": "application/json", "X-API-Key": (lockKey.body as { data: { key: string } }).data.key };
    await prisma.$transaction(async (tx) => {
      assert.equal(await tryAcquireProjectionWorkspaceLock(ownerA.workspace.id, tx), true);
      const lockedResponse = await realFetch(`${peerBaseUrl}/v1/product-map/projection/ingest`, {
        method: "POST", headers: lockHeaders, body: JSON.stringify(durabilityEnvelope)
      });
      assert.equal(lockedResponse.status, 429);
      assert.deepEqual(await lockedResponse.json(), { error: "projection_ingress_denied" });
    });
  } finally {
    await new Promise<void>((resolve, reject) => peerServer.close((error) => error ? reject(error) : resolve()));
  }
  assert.equal((await ingestProjection()).status, 200);
  assert.equal((await ingestProjection()).status, 200);
  const burstDenied = await ingestProjection();
  assert.equal(burstDenied.status, 429);
  assert.deepEqual(burstDenied.body, { error: "projection_ingress_denied" });
  const admissionsBeforeCleanup = await prisma.productMapProjectionAdmission.count();
  const scheduledProjectionCleanup = await runProductMapProjectionCleanupIfDue(Date.now() + 31 * 24 * 60 * 60 * 1000);
  assert.equal(scheduledProjectionCleanup.skipped, false);
  assert.equal(scheduledProjectionCleanup.admissions, admissionsBeforeCleanup);
  assert.equal(await prisma.productMapProjectionAdmission.count(), 0);

  const v1AliasRegister = await request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: "v1-auth-alias-owner@example.com",
      password: "very-strong-password",
      name: "V1 Auth Alias Owner",
      workspaceName: "V1 Auth Alias Workspace"
    })
  });
  assert.equal(v1AliasRegister.status, 201);
  const v1AliasRegisterBody = v1AliasRegister.body as {
    data: {
      token: string;
      user: { id: string; email: string; name: string };
      workspace: { id: string; name: string };
    };
  };
  assert.ok(v1AliasRegisterBody.data.token);
  assert.equal(v1AliasRegisterBody.data.user.email, "v1-auth-alias-owner@example.com");
  assert.equal(v1AliasRegisterBody.data.user.name, "V1 Auth Alias Owner");
  assert.equal(v1AliasRegisterBody.data.workspace.name, "V1 Auth Alias Workspace");

  const v1AliasLogin = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "v1-auth-alias-owner@example.com",
      password: "very-strong-password"
    })
  });
  assert.equal(v1AliasLogin.status, 200);
  const v1AliasLoginBody = v1AliasLogin.body as {
    data: {
      token: string;
      user: { id: string; email: string; name: string };
      workspace: { id: string; name: string };
    };
  };
  assert.ok(v1AliasLoginBody.data.token);
  assert.equal(v1AliasLoginBody.data.user.id, v1AliasRegisterBody.data.user.id);
  assert.equal(v1AliasLoginBody.data.user.email, v1AliasRegisterBody.data.user.email);
  assert.equal(v1AliasLoginBody.data.workspace.id, v1AliasRegisterBody.data.workspace.id);

  const v1AliasMe = await request("/v1/auth/me", {
    headers: { Authorization: `Bearer ${v1AliasLoginBody.data.token}` }
  });
  assert.equal(v1AliasMe.status, 200);
  const v1AliasMeBody = v1AliasMe.body as {
    data: { authType: string; userId: string; workspaceId: string; workspaces: Array<{ id: string; active: boolean }> };
  };
  assert.equal(v1AliasMeBody.data.authType, "user");
  assert.equal(v1AliasMeBody.data.userId, v1AliasRegisterBody.data.user.id);
  assert.equal(v1AliasMeBody.data.workspaceId, v1AliasRegisterBody.data.workspace.id);
  assert.ok(v1AliasMeBody.data.workspaces.some((workspace) => (
    workspace.id === v1AliasRegisterBody.data.workspace.id && workspace.active === true
  )));

  const v1AliasInvalidLogin = await request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "v1-auth-alias-owner@example.com",
      password: "wrong-password"
    })
  });
  assert.equal(v1AliasInvalidLogin.status, 401);
  assert.equal((v1AliasInvalidLogin.body as { error: string }).error, "invalid_credentials");

  const v1AliasInvalidBearerMe = await request("/v1/auth/me", {
    headers: { Authorization: "Bearer not-a-valid-owner-token" }
  });
  assert.equal(v1AliasInvalidBearerMe.status, 401);
  assert.equal((v1AliasInvalidBearerMe.body as { error: string }).error, "invalid_auth_token");
});

// Isolated test DB only: represent an attempt that predates RF-SEC-001. All
// subsequent requests run with every trigger enabled and cannot start new work.
async function historicalRiskExecution(args: Prisma.AgentExecutionCreateArgs) {
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`ALTER TABLE agent_executions DISABLE TRIGGER task_risk_admission_guard`;
    await tx.$executeRaw`ALTER TABLE agent_executions DISABLE TRIGGER task_admission_guard`;
    await tx.$executeRaw`ALTER TABLE agent_executions DISABLE TRIGGER zz_composition_guard`;
    const execution=await tx.agentExecution.create(args);
    await tx.$executeRaw`ALTER TABLE agent_executions ENABLE TRIGGER task_risk_admission_guard`;
    await tx.$executeRaw`ALTER TABLE agent_executions ENABLE TRIGGER task_admission_guard`;
    await tx.$executeRaw`ALTER TABLE agent_executions ENABLE TRIGGER zz_composition_guard`;
    return execution;
  });
}

async function fixtureExecutionMetadata(taskId:string) { const pin=(await prisma.task.findUniqueOrThrow({where:{id:taskId}})).executionReadiness as any;return {executionContract:pin.contract,readyContextPin:{pinId:pin.pinId,revision:pin.revision,riskAdmissionSeal:pin.riskAdmissionSeal,riskAdmissionCommit:pin.riskAdmissionCommit,compositionSeal:pin.procedureComposition?.seal}}; }
