import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { z } from "zod";
import { apiCompatibility } from "./agent-host-protocol.mjs";
import { inspectExecutionProvider, providerAdmissionReason } from "./agent-host-execution-provider.mjs";
import { fetchExecutionContext, assertFreshExecutionContext } from "./agent-host-execution-context.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";
import ready from "./agent-host-ready-context.cjs";

export const brokerContract = Object.freeze({ version: "roost-worker-mcp-broker-v1", protocolVersion: "2025-11-25",
  tools: Object.freeze(["roost_get_execution_packet", "roost_get_application_context"]),
  maxRequestBytes: 16384, maxResponseBytes: 131072, maxMessages: 6, maxToolCalls: 2,
  maxLists: 2, concurrency: 1, ttlMs: 30000, requestTimeoutMs: 3000, stopMarginMs: 5000 });
const fail = code => { throw new Error(code); };
const digest = text => createHash("sha256").update(text).digest();
const uuid = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const scopeSchema = z.object({ executionId: uuid, workspaceId: uuid, taskId: uuid, applicationId: uuid,
  attempt: z.number().int().min(1).max(5), packetRevision: hash, contextRevision: hash }).strict();
const rpcSchema = z.object({ jsonrpc: z.literal("2.0"), id: z.number().int().min(1).max(1000).optional(),
  method: z.string().min(1).max(64), params: z.unknown().optional() }).strict();
const initializeSchema = z.object({ protocolVersion: z.literal(brokerContract.protocolVersion),
  capabilities: z.object({}).strict(), clientInfo: z.object({ name: z.string().min(1).max(80), version: z.string().min(1).max(40) }).strict() }).strict();
const empty = value => z.object({}).strict().safeParse(value ?? {}).success;

export function hermesBrokerChildEnvironment(source = process.env) {
  const env = {};
  for (const key of ["SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT"]) {
    const entry = Object.entries(source).find(([name]) => name.toUpperCase() === key);
    if (entry) env[key] = entry[1];
  }
  return { ...env, PATH: path.win32.join(env.SYSTEMROOT || "C:\\Windows", "System32"),
    PYTHONNOUSERSITE: "1", PYTHONSAFEPATH: "1", PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" };
}

// The injected API is the existing Worker-owned closure, never a client-selected
// URL or a subprocess. No host entrypoint invokes this factory in this stage.
// Dependency overrides are synthetic-test seams, not config/env activation switches.
export async function startWorkerMcpBroker(input, { inspectProvider = inspectExecutionProvider,
  providerAdmission = providerAdmissionReason, now = () => performance.now(), wallNow = Date.now } = {}) {
  let server, deadlineTimer, signalListener, active = false, reason = "broker_not_started";
  const sockets = new Set(), controller = new AbortController();
  let token, tokenHash, delivered = false, phase = "initialize", messages = 0, lists = 0, calls = 0, busy = false;
  const requestIds = new Set();
  let closedResolve;
  const closed = new Promise(resolve => { closedResolve = resolve; });
  const signals = input.signal;
  const stop = (code = "broker_stopped", preserve) => {
    if (!active) return closed;
    active = false; reason = code; token = null; tokenHash = null;
    clearTimeout(deadlineTimer); signals.removeEventListener("abort", signalListener);
    controller.abort();
    server.close(() => closedResolve());
    for (const socket of sockets) if (socket !== preserve) socket.destroy();
    if (preserve) { const timer = setTimeout(() => preserve.destroy(), 100); timer.unref(); }
    return closed;
  };
  let scope, expiresAt, deadline;
  const assertAuthority = () => {
    if (signals.aborted || controller.signal.aborted) fail("broker_authority_lost");
    if (now() >= deadline || wallNow() >= expiresAt) fail("broker_expired");
    if (input.config.executionMode !== "supervised" || apiCompatibility(input.runtime, input.capabilities)) fail("broker_admission_blocked");
    input.lease.assertValid(); input.duration.assertWithinBudget(); input.outputBudget.assertWithinBudget();
    input.assertTaskBoundary(); // Existing branch/path/writer/context-stop guards, owned by Worker.
  };
  const bounded = async operation => {
    controller.signal.throwIfAborted();
    let timer, aborted;
    try {
      return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
        aborted = () => reject(new Error("broker_authority_lost"));
        controller.signal.addEventListener("abort", aborted, { once: true });
        timer = setTimeout(() => reject(new Error("broker_request_timeout")), brokerContract.requestTimeoutMs);
      })]);
    } finally { clearTimeout(timer); if (aborted) controller.signal.removeEventListener("abort", aborted); }
  };
  const refresh = async () => {
    assertAuthority();
    const fresh = await bounded(() => fetchExecutionContext(input.api, claimed, { signal: controller.signal, secrets: input.secrets }));
    assertAuthority();
    guardHostContent(fresh, "required", [...input.secrets, claimed.leaseToken, token].filter(Boolean));
    assertFreshExecutionContext(scope.contextRevision, fresh, claimed);
    ready.assertReadyContext(fresh.taskContext, fresh.applicationContext, claimed);
    if (fresh.taskContext.executionPacket.revision !== scope.packetRevision) fail("broker_context_changed");
    return fresh;
  };
  let claimed;
  try {
    if (input.config?.executionMode !== "supervised" || apiCompatibility(input.runtime, input.capabilities)
      || !(signals instanceof AbortSignal) || signals.aborted || typeof input.api !== "function"
      || typeof input.assertTaskBoundary !== "function" || !Array.isArray(input.secrets) || input.secrets.length < 1
      || input.secrets.some(secret => typeof secret !== "string" || secret.length < 8 || secret.length > 8192)) fail("broker_admission_blocked");
    claimed = structuredClone(input.claimed);
    scope = scopeSchema.parse({ executionId: claimed.id, workspaceId: claimed.workspaceId, taskId: claimed.taskId,
      applicationId: claimed.applicationId, attempt: claimed.attempt, packetRevision: input.packetRevision, contextRevision: input.contextRevision });
    if (claimed.checkpoint?.stage !== "spawn_intent" || claimed.checkpoint.packetRevision !== scope.packetRevision
      || claimed.checkpoint.contextRevision !== scope.contextRevision) fail("broker_admission_blocked");
    const remaining = Math.min(brokerContract.ttlMs, input.lease.remainingMs - brokerContract.stopMarginMs,
      input.duration.remainingMs - brokerContract.stopMarginMs);
    if (!Number.isFinite(remaining) || remaining <= 0) fail("broker_expired");
    expiresAt = wallNow() + remaining; deadline = now() + remaining;
    assertAuthority();
    const provider = await bounded(() => inspectProvider(input.config, { freshAttestation: true }));
    assertAuthority();
    if (provider.kind !== "hermes_codex" || providerAdmission(provider) || provider.installation?.status !== "verified"
      || !Number.isFinite(Date.parse(provider.installation.checkedAt))
      || wallNow() - Date.parse(provider.installation.checkedAt) > 15000 || Date.parse(provider.installation.checkedAt) > wallNow()) fail("broker_provider_blocked");
    await refresh(); // All gates and current context pass before a port/token exists.
    assertAuthority();
    token = randomBytes(32).toString("base64url"); tokenHash = digest(token);
    let host;
    const tools = brokerContract.tools.map(name => ({ name, description: name === brokerContract.tools[0]
      ? "Read this attempt's validated execution packet." : "Read this attempt's Ready-approved application context.",
      inputSchema: { type: "object", properties: Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, { type: typeof v === "number" ? "integer" : "string", const: v }])),
        required: Object.keys(scope), additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } }));
    server = createServer({ maxHeaderSize: 8192 }, async (req, res) => {
      let ownsBusy = false, requestTimer;
      const reject = (status = 400) => {
        if (!res.destroyed && !res.writableEnded) {
          res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", Connection: "close" });
          res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "broker_request_rejected" } }));
        }
        void stop("broker_request_rejected", req.socket);
      };
      try {
        if (!active) return reject(403);
        if (req.socket.remoteAddress !== "127.0.0.1" || req.headers.host !== host || req.headers.origin !== undefined
          || req.url !== "/mcp" || req.httpVersion !== "1.1") return reject(403);
        const auth = req.headers.authorization;
        if (typeof auth !== "string" || !/^Bearer [A-Za-z0-9_-]{43}$/.test(auth) || !timingSafeEqual(digest(auth.slice(7)), tokenHash)) return reject(401);
        if (req.method !== "POST") return reject(405); // No SSE, resume, DELETE, OPTIONS or generic proxy.
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] ?? "")
          || !["application/json", "text/event-stream"].every(type => (req.headers.accept ?? "").split(",").map(s => s.trim()).includes(type))) return reject(415);
        if (busy) return reject(409);
        busy = true; ownsBusy = true;
        if (++messages > brokerContract.maxMessages) return reject(429);
        requestTimer = setTimeout(() => reject(408), brokerContract.requestTimeoutMs);
        let bytes = 0; const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > brokerContract.maxRequestBytes) return reject(413);
          chunks.push(chunk);
        }
        assertAuthority();
        const raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
        const rpc = rpcSchema.parse(JSON.parse(raw));
        if (rpc.id !== undefined) {
          if (requestIds.has(rpc.id)) return reject(409);
          requestIds.add(rpc.id);
        }
        if (phase !== "initialize" && req.headers["mcp-protocol-version"] !== brokerContract.protocolVersion) return reject(400);
        if (phase === "initialize" && req.headers["mcp-protocol-version"] !== undefined && req.headers["mcp-protocol-version"] !== brokerContract.protocolVersion) return reject(400);
        let result;
        if (phase === "initialize" && rpc.method === "initialize" && rpc.id !== undefined) {
          initializeSchema.parse(rpc.params); phase = "initialized";
          result = { protocolVersion: brokerContract.protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "roost-worker-broker", version: "1" } };
        } else if (phase === "initialized" && rpc.method === "notifications/initialized" && rpc.id === undefined && empty(rpc.params)) {
          phase = "tools"; res.writeHead(202, { "Cache-Control": "no-store" }); res.end(); return;
        } else if (phase === "tools" && rpc.method === "tools/list" && rpc.id !== undefined && empty(rpc.params) && ++lists <= brokerContract.maxLists) result = { tools };
        else if (phase === "tools" && rpc.method === "tools/call" && rpc.id !== undefined && lists > 0) {
          const args = z.object({ name: z.enum(brokerContract.tools), arguments: scopeSchema }).strict().parse(rpc.params);
          if (calls >= brokerContract.maxToolCalls || args.name !== brokerContract.tools[calls]
            || Object.keys(scope).some(key => args.arguments[key] !== scope[key])) return reject(403);
          const fresh = await refresh();
          const data = calls++ === 0 ? fresh.taskContext.executionPacket : fresh.applicationContext;
          // Existing compiler + Ready seal + native redaction; never raw claim/lease/config.
          result = { content: [{ type: "text", text: JSON.stringify(data) }], isError: false };
        } else return reject(400);
        const body = JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result });
        if (Buffer.byteLength(body) > brokerContract.maxResponseBytes) return reject(413);
        assertAuthority();
        res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(body);
        if (calls === brokerContract.maxToolCalls) void stop("broker_sequence_complete", req.socket);
      } catch { reject(); }
      finally { clearTimeout(requestTimer); if (ownsBusy) busy = false; }
    });
    server.headersTimeout = brokerContract.requestTimeoutMs;
    server.requestTimeout = brokerContract.requestTimeoutMs;
    server.keepAliveTimeout = 1000;
    server.maxConnections = 2;
    server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
    server.on("clientError", (_error, socket) => { socket.destroy(); void stop("broker_request_rejected"); });
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, resolve); });
    host = `127.0.0.1:${server.address().port}`; active = true; reason = null;
    signalListener = () => { void stop("broker_authority_lost"); };
    signals.addEventListener("abort", signalListener, { once: true });
    deadlineTimer = setTimeout(() => { void stop("broker_expired"); }, Math.max(1, deadline - now()));
    assertAuthority();
    const endpoint = `http://${host}/mcp`;
    return Object.freeze({ endpoint, closed, stop: () => stop(),
      status: () => ({ active, reason, calls, contractVersion: brokerContract.version }),
      // Memory -> inherited stdin only. No argv, env secret, file, persistence or model launcher.
      // This is a future adapter input, not a claim that native Hermes accepts this format.
      deliverClientBootstrap(stream) {
        try {
          assertAuthority(); if (!active || delivered) fail("broker_bootstrap_reused"); delivered = true;
          const bootstrap = { schemaVersion: brokerContract.version, scope, expiresAt: new Date(expiresAt).toISOString(),
            mcp_servers: { roost: { url: endpoint, headers: { Authorization: `Bearer ${token}` }, tools: [...brokerContract.tools] } },
            restrictions: { parallelToolCalls: false, prompts: false, resources: false, sampling: false, nativeTools: [], persistentState: false } };
          stream.on("error", () => { void stop("broker_bootstrap_failed"); });
          stream.end(JSON.stringify(bootstrap));
        } catch { void stop("broker_bootstrap_failed"); fail("broker_bootstrap_failed"); }
      }
    });
  } catch {
    if (active) await stop("broker_admission_blocked");
    else { controller.abort(); server?.close(); for (const socket of sockets) socket.destroy(); }
    fail("broker_admission_blocked");
  }
}
