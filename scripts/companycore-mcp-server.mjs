#!/usr/bin/env node

import readline from "node:readline";

const baseUrl = (process.env.COMPANYCORE_BASE_URL ?? "http://localhost:3102").replace(/\/+$/, "");
const apiKey = process.env.COMPANYCORE_API_KEY;
const manifestPath = process.env.COMPANYCORE_MCP_MANIFEST_PATH ?? "/v1/mcp/manifest";
const requestTimeoutMs = Number(process.env.COMPANYCORE_MCP_TIMEOUT_MS ?? 30000);
const commandMode = process.env.COMPANYCORE_MCP_COMMAND_MODE ?? "read_only";

let cachedManifest = null;

function stderr(message) {
  process.stderr.write(`[companycore-mcp] ${message}\n`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function response(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function errorResponse(id, code, message, data) {
  send({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

function requireApiKey() {
  if (!apiKey) {
    throw new Error("COMPANYCORE_API_KEY is required for the CompanyCore MCP bridge.");
  }
}

async function fetchJson(path, init = {}) {
  requireApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
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
  } finally {
    clearTimeout(timeout);
  }
}

async function loadManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }

  const result = await fetchJson(manifestPath);
  if (!result.ok) {
    throw new Error(`CompanyCore MCP manifest failed with HTTP ${result.status}.`);
  }

  cachedManifest = result.body?.data;
  if (!cachedManifest || !Array.isArray(cachedManifest.tools)) {
    throw new Error("CompanyCore MCP manifest response did not contain data.tools.");
  }

  return cachedManifest;
}

function publicTool(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: tool.riskLevel === "read",
      destructiveHint: tool.riskLevel === "destructive",
      openWorldHint: true
    }
  };
}

function replacePathParameters(path, args) {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, key) => {
    const value = args[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(value);
  });
}

function addQuery(path, query) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    return path;
  }

  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return `${url.pathname}${url.search}`;
}

function summarizeBody(body) {
  const json = JSON.stringify(body, null, 2);
  if (json.length <= 4000) {
    return json;
  }
  return `${json.slice(0, 4000)}\n... truncated by CompanyCore MCP bridge`;
}

async function callTool(name, args) {
  const manifest = await loadManifest();
  const tool = manifest.tools.find((candidate) => candidate.name === name);
  if (!tool) {
    const available = manifest.tools.map((candidate) => candidate.name).sort();
    const error = new Error(`Unknown tool: ${name}`);
    error.data = { available };
    throw error;
  }

  if (tool.requiresApproval === true && commandMode !== "supervised_operator") {
    const structuredContent = {
      ok: false,
      error: "mcp_tool_requires_supervision",
      toolName: tool.name,
      path: tool.path,
      method: tool.method,
      capability: tool.capability,
      requiresApproval: true,
      commandMode,
      recovery: "Run this bridge in supervised_operator mode with an intentionally scoped key, or request approval through the appropriate Company OS workflow before attempting the command."
    };

    return {
      content: [
        {
          type: "text",
          text: "CompanyCore MCP blocked this tool because it requires supervised execution."
        }
      ],
      structuredContent,
      isError: true
    };
  }

  const toolArgs = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  const pathWithParams = replacePathParameters(tool.path, toolArgs);
  const path = addQuery(pathWithParams, toolArgs.query);
  const method = tool.method.toUpperCase();
  const init = {
    method
  };

  if (method !== "GET") {
    init.body = JSON.stringify(toolArgs.body ?? {});
  }

  const result = await fetchJson(path, init);
  const structuredContent = {
    status: result.status,
    ok: result.ok,
    path,
    method,
    capability: tool.capability,
    body: result.body
  };

  return {
    content: [
      {
        type: "text",
        text: result.ok
          ? summarizeBody(result.body)
          : `CompanyCore API returned HTTP ${result.status}: ${summarizeBody(result.body)}`
      }
    ],
    structuredContent,
    isError: !result.ok
  };
}

async function handleRequest(message) {
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    if ("id" in message) {
      errorResponse(message.id, -32600, "Invalid JSON-RPC request.");
    }
    return;
  }

  if (!("id" in message)) {
    return;
  }

  try {
    switch (message.method) {
      case "initialize":
        response(message.id, {
          protocolVersion: message.params?.protocolVersion ?? "2025-11-25",
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: "companycore-mcp",
            version: "0.1.0"
          }
        });
        break;
      case "ping":
        response(message.id, {});
        break;
      case "tools/list": {
        const manifest = await loadManifest();
        response(message.id, {
          tools: manifest.tools.map(publicTool)
        });
        break;
      }
      case "tools/call": {
        const name = message.params?.name;
        if (typeof name !== "string") {
          errorResponse(message.id, -32602, "tools/call requires params.name.");
          break;
        }
        response(message.id, await callTool(name, message.params?.arguments ?? {}));
        break;
      }
      default:
        errorResponse(message.id, -32601, `Unsupported MCP method: ${message.method}`);
        break;
    }
  } catch (error) {
    errorResponse(
      message.id,
      error?.message?.startsWith("Unknown tool:") ? -32602 : -32000,
      error instanceof Error ? error.message : "CompanyCore MCP bridge failed.",
      error?.data
    );
  }
}

if (process.argv.includes("--print-config")) {
  process.stdout.write(JSON.stringify({
    baseUrl,
    manifestPath,
    apiKeyConfigured: Boolean(apiKey),
    requestTimeoutMs,
    commandMode
  }, null, 2));
  process.stdout.write("\n");
  process.exit(0);
}

stderr(`Starting stdio bridge for ${baseUrl}${manifestPath}`);

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    errorResponse(null, -32700, "Invalid JSON.");
    return;
  }

  if (Array.isArray(message)) {
    for (const item of message) {
      void handleRequest(item);
    }
    return;
  }

  void handleRequest(message);
});

rl.on("close", () => {
  stderr("stdin closed");
});
