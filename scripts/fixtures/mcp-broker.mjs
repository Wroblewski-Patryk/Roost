import { validPacketFixture } from "./execution-packet.mjs";
import { compatibleHostFixture } from "./host-protocol.mjs";
import { executionContextRevision } from "../lib/agent-host-execution-context.mjs";
import { createExecutionLease } from "../lib/agent-host-execution-lease.mjs";
import { createExecutionDuration } from "../lib/agent-host-execution-duration.mjs";
import { startWorkerMcpBroker, brokerContract } from "../lib/agent-host-mcp-broker.mjs";
import { Writable } from "node:stream";
import { request as httpRequest } from "node:http";

export const canary = "SYNTHETIC_ROOST_LONG_LIVED_KEY_CANARY_723819";
export async function brokerFixture(change = () => {}) {
  const f = validPacketFixture(), abort = new AbortController(), reads = [];
  const lease = createExecutionLease({ renew: async () => ({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() }), onLost: () => abort.abort() });
  await lease.refresh();
  const duration = createExecutionDuration({ startedAt: f.claimed.startedAt, maxDurationSeconds: 600, onExpired: () => abort.abort() });
  const contextRevision = executionContextRevision(f.taskContext, f.applicationContext);
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: f.packet.revision, contextRevision };
  const input = { config: { executionMode: "supervised", executionProvider: { kind: "hermes_codex" } },
    runtime: compatibleHostFixture().runtime, claimed: f.claimed, contextRevision, packetRevision: f.packet.revision,
    lease, duration, signal: abort.signal, secrets: [canary], outputBudget: { assertWithinBudget() {} }, assertTaskBoundary() {},
    api: async (route, options) => {
      reads.push({ route, cache: options.cache, method: options.method ?? "GET" });
      if (route === `/v1/company-intelligence/tasks/${f.claimed.taskId}/agent-context?executionId=${f.claimed.id}`) return f.taskContext;
      if (route === `/v1/product-engineering/applications/${f.claimed.applicationId}/agent-context?profile=execution`) return f.applicationContext;
      throw Error("unexpected_worker_api_route");
    } };
  const dependencies = { inspectProvider: async () => ({ kind: "hermes_codex", installation: { status: "verified", checkedAt: new Date().toISOString() } }), providerAdmission: () => null };
  const fixture = { ...f, input, dependencies, abort, reads, lease, duration, broker: null, bootstrap: null,
    async close() { await fixture.broker?.stop(); lease.stop(); duration.stop(); } };
  try {
    await change(fixture);
    fixture.broker = await startWorkerMcpBroker(input, dependencies);
    let bytes = "";
    fixture.broker.deliverClientBootstrap(new Writable({ write(chunk, _encoding, done) { bytes += chunk; done(); } }));
    fixture.bootstrap = JSON.parse(bytes);
    return fixture;
  } catch (e) { await fixture.close(); throw e; }
}
export function request(f, message, options = {}) {
  if (options.headers?.Host) return new Promise((resolve, reject) => {
    const req = httpRequest(f.broker.endpoint, { method: "POST", headers: { Authorization: f.bootstrap.mcp_servers.roost.headers.Authorization,
      Accept: "application/json, text/event-stream", "Content-Type": "application/json", "MCP-Protocol-Version": brokerContract.protocolVersion, ...options.headers } }, res => {
      let body = ""; res.on("data", b => body += b); res.on("end", () => resolve({ status: res.statusCode, text: async () => body }));
    }); req.on("error", reject); req.end(JSON.stringify(message));
  });
  return fetch(f.broker.endpoint, { method: "POST", ...options, signal: AbortSignal.timeout(5000),
    headers: { Authorization: f.bootstrap.mcp_servers.roost.headers.Authorization, Accept: "application/json, text/event-stream",
      "Content-Type": "application/json", "MCP-Protocol-Version": brokerContract.protocolVersion, ...options.headers },
    body: options.method && options.method !== "POST" ? undefined : JSON.stringify(message) });
}
export async function initialize(f) {
  const response = await request(f, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: brokerContract.protocolVersion, capabilities: {}, clientInfo: { name: "synthetic-client", version: "1" } } });
  if (response.status !== 200) throw Error("fixture_initialize_failed");
  await response.arrayBuffer();
  await request(f, { jsonrpc: "2.0", method: "notifications/initialized" });
  const tools = await request(f, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  if (tools.status !== 200) throw Error("fixture_discovery_failed");
  return (await tools.json()).result.tools;
}
export const call = (f, index = 0, id = 3) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name: brokerContract.tools[index], arguments: { ...f.bootstrap.scope } } });
