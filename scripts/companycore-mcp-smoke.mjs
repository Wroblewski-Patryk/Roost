#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bridgePath = resolve(scriptDir, "companycore-mcp-server.mjs");
const baseUrl = (process.env.COMPANYCORE_BASE_URL ?? "http://localhost:3102").replace(/\/+$/, "");
const apiKey = process.env.COMPANYCORE_API_KEY;
const smokeToolName = process.env.COMPANYCORE_MCP_SMOKE_TOOL ?? "companycore_get_company_os";
const smokeToolArguments = parseJsonEnv("COMPANYCORE_MCP_SMOKE_ARGUMENTS", {});
const expectError = process.env.COMPANYCORE_MCP_SMOKE_EXPECT_ERROR === "true";
const expectedErrorCode = process.env.COMPANYCORE_MCP_SMOKE_EXPECT_ERROR_CODE;
const expectedStatus = process.env.COMPANYCORE_MCP_SMOKE_EXPECT_STATUS
  ? Number(process.env.COMPANYCORE_MCP_SMOKE_EXPECT_STATUS)
  : undefined;
const expectedResponseError = process.env.COMPANYCORE_MCP_SMOKE_EXPECT_RESPONSE_ERROR;
const timeoutMs = Number(process.env.COMPANYCORE_MCP_SMOKE_TIMEOUT_MS ?? 20000);

function parseJsonEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${name} must be valid JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function printHelp() {
  process.stdout.write(`CompanyCore MCP bridge smoke

Required:
  COMPANYCORE_API_KEY              Workspace-scoped service key.

Optional:
  COMPANYCORE_BASE_URL             CompanyCore API base URL. Default: http://localhost:3102
  COMPANYCORE_MCP_SMOKE_TOOL       Safe tool to call. Default: companycore_get_company_os
  COMPANYCORE_MCP_SMOKE_ARGUMENTS  JSON object passed to tools/call. Default: {}
  COMPANYCORE_MCP_SMOKE_EXPECT_ERROR
                                  Set true when the smoke should pass on isError=true.
  COMPANYCORE_MCP_SMOKE_EXPECT_ERROR_CODE
                                  Optional structuredContent.error value expected when EXPECT_ERROR=true.
  COMPANYCORE_MCP_SMOKE_EXPECT_STATUS
                                  Optional structuredContent.status value expected from the API call.
  COMPANYCORE_MCP_SMOKE_EXPECT_RESPONSE_ERROR
                                  Optional structuredContent.body.error value expected from the API call.
  COMPANYCORE_MCP_SMOKE_TIMEOUT_MS Timeout in milliseconds. Default: 20000

Example:
  COMPANYCORE_BASE_URL=http://localhost:3102 \\
  COMPANYCORE_API_KEY=cc_v1_example \\
  npm run mcp:smoke
`);
}

function fail(message) {
  process.stderr.write(`[companycore-mcp-smoke] ${message}\n`);
  process.exit(1);
}

if (process.argv.includes("--help")) {
  printHelp();
  process.exit(0);
}

if (!apiKey) {
  fail("COMPANYCORE_API_KEY is required.");
}

function parseJsonLines(buffer) {
  return buffer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function request(id, method, params = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id,
    method,
    params
  });
}

const child = spawn(process.execPath, [bridgePath], {
  cwd: resolve(scriptDir, ".."),
  env: {
    ...process.env,
    COMPANYCORE_BASE_URL: baseUrl,
    COMPANYCORE_API_KEY: apiKey
  },
  stdio: ["pipe", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
const timer = setTimeout(() => {
  child.kill("SIGTERM");
  fail(`Timed out after ${timeoutMs}ms. Bridge stderr:\n${stderr}`);
}, timeoutMs);

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

child.on("error", (error) => {
  clearTimeout(timer);
  fail(error.message);
});

child.stdin.write(`${request(1, "initialize", {
  protocolVersion: "2025-11-25",
  capabilities: {},
  clientInfo: {
    name: "companycore-mcp-smoke",
    version: "0.1.0"
  }
})}\n`);
child.stdin.write(`${request(2, "tools/list")}\n`);
child.stdin.write(`${request(3, "tools/call", {
  name: smokeToolName,
  arguments: smokeToolArguments
})}\n`);
child.stdin.end();

child.on("close", (code) => {
  clearTimeout(timer);

  if (code !== 0) {
    fail(`Bridge exited with code ${code}. Bridge stderr:\n${stderr}`);
  }

  let messages;
  try {
    messages = parseJsonLines(stdout);
  } catch (error) {
    fail(`Bridge stdout was not valid newline-delimited JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }

  const byId = new Map(messages.map((message) => [message.id, message]));
  const initialize = byId.get(1);
  const toolList = byId.get(2);
  const toolCall = byId.get(3);

  if (initialize?.error) {
    fail(`initialize failed: ${initialize.error.message}`);
  }
  if (!initialize?.result?.capabilities?.tools) {
    fail("initialize did not advertise tools capability.");
  }

  if (toolList?.error) {
    fail(`tools/list failed: ${toolList.error.message}`);
  }
  const tools = toolList?.result?.tools;
  if (!Array.isArray(tools) || tools.length === 0) {
    fail("tools/list returned no tools.");
  }
  if (!tools.some((tool) => tool.name === smokeToolName)) {
    fail(`tools/list did not expose ${smokeToolName}.`);
  }

  if (toolCall?.error) {
    fail(`tools/call failed: ${toolCall.error.message}`);
  }
  if (expectError) {
    if (toolCall?.result?.isError !== true) {
      fail(`tools/call did not return expected isError=true for ${smokeToolName}.`);
    }
    if (expectedErrorCode && toolCall?.result?.structuredContent?.error !== expectedErrorCode) {
      fail(`tools/call did not return expected error ${expectedErrorCode} for ${smokeToolName}.`);
    }
  } else if (toolCall?.result?.isError) {
    fail(`tools/call returned isError=true for ${smokeToolName}.`);
  }
  if (expectedStatus !== undefined && toolCall?.result?.structuredContent?.status !== expectedStatus) {
    fail(`tools/call did not return expected HTTP status ${expectedStatus} for ${smokeToolName}.`);
  }
  if (
    expectedResponseError
    && toolCall?.result?.structuredContent?.body?.error !== expectedResponseError
  ) {
    fail(`tools/call did not return expected response error ${expectedResponseError} for ${smokeToolName}.`);
  }
  if (!expectError && toolCall?.result?.structuredContent?.ok !== true) {
    fail(`tools/call did not return a successful CompanyCore HTTP response for ${smokeToolName}.`);
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    baseUrl,
    toolCount: tools.length,
    calledTool: smokeToolName,
    callStatus: toolCall.result.structuredContent.status,
    callError: toolCall.result.structuredContent.error,
    responseError: toolCall.result.structuredContent.body?.error
  }, null, 2));
  process.stdout.write("\n");
});
