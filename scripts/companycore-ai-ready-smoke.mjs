#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const bridgeSmokePath = resolve(scriptDir, "companycore-mcp-smoke.mjs");
const baseUrl = (process.env.COMPANYCORE_BASE_URL ?? "http://localhost:3102").replace(/\/+$/, "");
const timeoutMs = Number(process.env.COMPANYCORE_AI_READY_SMOKE_TIMEOUT_MS ?? 30000);
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function fail(message) {
  process.stderr.write(`[companycore-ai-ready-smoke] ${message}\n`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function printHelp() {
  process.stdout.write(`CompanyCore AI-ready smoke

Required:
  A running CompanyCore API server and migrated database.

Optional:
  COMPANYCORE_BASE_URL                       API base URL. Default: http://localhost:3102
  COMPANYCORE_AI_READY_SMOKE_TIMEOUT_MS      Per MCP bridge smoke timeout. Default: 30000

Example:
  COMPANYCORE_BASE_URL=http://127.0.0.1:3102 npm run ai-ready:smoke
`);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

async function expectOk(path, init, context) {
  const response = await request(path, init);
  assert(
    response.ok,
    `${context} failed with HTTP ${response.status}: ${JSON.stringify(response.body)}`
  );
  return response.body?.data;
}

async function createProfileKey(ownerToken, profileId, name) {
  const data = await expectOk(
    "/v1/api-keys",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ name, profileId })
    },
    `create ${profileId} key`
  );

  assert(typeof data?.key === "string" && data.key.startsWith("cc_v1_"), `${profileId} did not return a raw API key.`);
  assert(data.profile?.id === profileId, `${profileId} response did not echo the selected profile.`);
  return data;
}

function runMcpSmoke(apiKey, options = {}) {
  const env = {
    ...process.env,
    COMPANYCORE_BASE_URL: baseUrl,
    COMPANYCORE_API_KEY: apiKey,
    COMPANYCORE_MCP_SMOKE_TOOL: options.toolName ?? "companycore_get_company_os",
    COMPANYCORE_MCP_SMOKE_ARGUMENTS: JSON.stringify(options.arguments ?? {}),
    COMPANYCORE_MCP_SMOKE_EXPECT_ERROR: options.expectError ? "true" : "false",
    COMPANYCORE_MCP_SMOKE_TIMEOUT_MS: String(timeoutMs)
  };

  if (options.commandMode) {
    env.COMPANYCORE_MCP_COMMAND_MODE = options.commandMode;
  }
  if (options.expectedErrorCode) {
    env.COMPANYCORE_MCP_SMOKE_EXPECT_ERROR_CODE = options.expectedErrorCode;
  }
  if (options.expectedStatus !== undefined) {
    env.COMPANYCORE_MCP_SMOKE_EXPECT_STATUS = String(options.expectedStatus);
  }
  if (options.expectedResponseError) {
    env.COMPANYCORE_MCP_SMOKE_EXPECT_RESPONSE_ERROR = options.expectedResponseError;
  }

  const child = spawn(process.execPath, [bridgeSmokePath], {
    cwd: repoRoot,
    env,
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

  return new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`MCP smoke failed for ${env.COMPANYCORE_MCP_SMOKE_TOOL}.\nstdout:\n${stdout}\nstderr:\n${stderr}`));
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`MCP smoke returned invalid JSON: ${error instanceof Error ? error.message : "parse failed"}\nstdout:\n${stdout}`));
      }
    });
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const health = await request("/health");
  assert(health.ok, `Health check failed at ${baseUrl}/health with HTTP ${health.status}.`);

  const registration = await expectOk(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        email: `ai-ready-${runId}@example.test`,
        password: `CompanyCore-${runId}-Passphrase`,
        name: "AI Ready Smoke Owner",
        workspaceName: `AI Ready Smoke ${runId}`
      })
    },
    "owner registration"
  );

  const ownerToken = registration?.token;
  assert(typeof ownerToken === "string" && ownerToken.length > 0, "Owner registration did not return a bearer token.");

  const profiles = await expectOk(
    "/v1/api-keys/profiles",
    { headers: { Authorization: `Bearer ${ownerToken}` } },
    "profile list"
  );
  assert(Array.isArray(profiles), "Profile list did not return an array.");
  assert(profiles.some((profile) => profile.id === "mcp_company_os_reader"), "Missing mcp_company_os_reader profile.");
  assert(profiles.some((profile) => profile.id === "mcp_operator"), "Missing mcp_operator profile.");

  const readerKey = await createProfileKey(ownerToken, "mcp_company_os_reader", `AI-ready reader ${runId}`);
  const operatorKey = await createProfileKey(ownerToken, "mcp_operator", `AI-ready operator ${runId}`);

  assert(readerKey.scopes.includes("mcp:read"), "Reader key is missing mcp:read.");
  assert(readerKey.scopes.includes("relationships:read"), "Reader key is missing relationships:read.");
  assert(!readerKey.scopes.includes("company-os:stage-run:write"), "Reader key unexpectedly includes stage-run write scope.");
  assert(operatorKey.scopes.includes("company-os:stage-run:write"), "Operator key is missing stage-run write scope.");

  const readerHeaders = { "X-API-Key": readerKey.key };
  const manifest = await expectOk(
    "/v1/mcp/manifest",
    { headers: readerHeaders },
    "reader manifest"
  );
  assert(manifest?.service === "companycore", "Manifest service mismatch.");
  assert(Array.isArray(manifest.tools), "Manifest did not return tools.");
  assert(manifest.tools.some((tool) => tool.name === "companycore_get_relationships_graph" && tool.path === "/v1/relationships/graph"), "Manifest is missing relationship graph tool.");
  assert(!manifest.tools.some((tool) => tool.capability === "company-os:stage-run:write"), "Reader manifest exposes stage-run write tools.");

  const relationshipGraphResponse = await expectOk(
    "/v1/relationships/graph?limit=50",
    { headers: readerHeaders },
    "relationship graph read"
  );
  const graph = relationshipGraphResponse?.graph;
  const graphSummary = relationshipGraphResponse?.summary;
  assert(Array.isArray(graph?.nodes), "Relationship graph did not return graph.nodes.");
  assert(Array.isArray(graph?.edges), "Relationship graph did not return graph.edges.");
  assert(Array.isArray(graph?.reviewItems), "Relationship graph did not return graph.reviewItems.");
  assert(Array.isArray(graph?.unsupportedFamilies), "Relationship graph did not return graph.unsupportedFamilies.");
  assert(graphSummary && typeof graphSummary.nodes === "number", "Relationship graph did not return summary counts.");

  const graphBridgeSmoke = await runMcpSmoke(readerKey.key, {
    toolName: "companycore_get_relationships_graph",
    arguments: { query: { limit: 50 } }
  });
  assert(graphBridgeSmoke.ok === true, "MCP relationship graph smoke did not pass.");
  assert(graphBridgeSmoke.calledTool === "companycore_get_relationships_graph", "MCP graph smoke called the wrong tool.");

  const guardedCommandSmoke = await runMcpSmoke(operatorKey.key, {
    toolName: "companycore_post_company_os_stage_runs_by_id_actions_complete",
    expectError: true,
    expectedErrorCode: "mcp_tool_requires_supervision"
  });
  assert(guardedCommandSmoke.ok === true, "MCP guarded command smoke did not pass.");
  assert(guardedCommandSmoke.callError === "mcp_tool_requires_supervision", "Guarded command did not fail closed with mcp_tool_requires_supervision.");

  process.stdout.write(JSON.stringify({
    ok: true,
    baseUrl,
    workspaceId: registration.workspace?.id,
    readerProfile: readerKey.profile?.id,
    operatorProfile: operatorKey.profile?.id,
    manifestToolCount: manifest.tools.length,
    relationshipGraph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      reviewItems: graph.reviewItems.length,
      unsupportedFamilies: graph.unsupportedFamilies.length,
      summaryNodes: graphSummary.nodes,
      summaryEdges: graphSummary.edges
    },
    mcpBridge: {
      graphTool: graphBridgeSmoke.calledTool,
      graphStatus: graphBridgeSmoke.callStatus,
      guardedTool: guardedCommandSmoke.calledTool,
      guardedError: guardedCommandSmoke.callError
    }
  }, null, 2));
  process.stdout.write("\n");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
