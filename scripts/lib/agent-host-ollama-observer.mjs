import http from "node:http";
import os from "node:os";

const HOST = "127.0.0.1";
const OLLAMA_PORT = 11434;
const OBSERVER_PORT = 11435;
const REQUEST_LIMIT = 256 * 1024;
const RESPONSE_LIMIT = 1024 * 1024;
const META_LIMIT = 256 * 1024;
const HERMES_READ_PROBES = new Set(["/v1/models", "/v1/models/gpt-oss:20b", "/api/v1/models",
  "/api/tags", "/v1/props", "/props", "/version"]);
const MODEL = "gpt-oss:20b";
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const MIN_FREE_MEMORY = 2 * 1024 * 1024 * 1024;

function blocked(code) {
  return Object.assign(new Error(code), { protocolAdmission: true, retryable: false,
    publicMessage: "Local model observation failed; this attempt stopped without fallback.",
    details: { reason: code } });
}

function expectedDigest(value) {
  return typeof value === "string" && value.startsWith("sha256:") ? value : `sha256:${value}`;
}

function safeUsage(value) {
  if (!value || typeof value !== "object") return null;
  const keys = ["prompt_tokens", "completion_tokens", "total_tokens"];
  const result = {};
  for (const key of keys) {
    if (value[key] === undefined || value[key] === null) continue;
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) throw blocked("ollama_observer_usage_invalid");
    result[key] = value[key];
  }
  const reasoning = value.completion_tokens_details?.reasoning_tokens;
  if (reasoning !== undefined && reasoning !== null) {
    if (!Number.isSafeInteger(reasoning) || reasoning < 0) throw blocked("ollama_observer_usage_invalid");
    result.reasoning_tokens = reasoning;
  }
  return Object.keys(result).length ? result : null;
}

function responseMetadata(body, contentType, model) {
  let seenModel = null, usage = null, chunks = 0;
  const inspect = value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw blocked("ollama_observer_response_invalid");
    if (value.model !== undefined) {
      if (value.model !== model || seenModel && seenModel !== value.model) throw blocked("ollama_observer_response_model_mismatch");
      seenModel = value.model;
    }
    const observedUsage = safeUsage(value.usage);
    if (observedUsage) usage = observedUsage;
    chunks += 1;
  };
  if (/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    inspect(JSON.parse(body.toString("utf8")));
  } else if (/^text\/event-stream(?:\s*;|\s*$)/i.test(contentType)) {
    const lines = body.toString("utf8").split(/\r?\n/);
    let ended = false;
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") { ended = true; continue; }
      inspect(JSON.parse(data));
    }
    if (!ended || chunks === 0) throw blocked("ollama_observer_response_invalid");
  } else throw blocked("ollama_observer_response_type_invalid");
  if (seenModel !== model) throw blocked("ollama_observer_response_model_missing");
  return { model: seenModel, usage, chunks };
}

function readJson(port, route, assertActive, limit = META_LIMIT) {
  return new Promise((resolve, reject) => {
    try { assertActive(); } catch (error) { reject(error); return; }
    const request = http.request({ hostname: HOST, port, path: route, method: "GET", headers: { Host: `${HOST}:${port}`, Connection: "close" },
      timeout: 5000 }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(blocked("ollama_observer_probe_failed")); return; }
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > limit) { request.destroy(blocked("ollama_observer_probe_oversize")); return; }
        chunks.push(chunk);
      });
      response.on("end", () => {
        try { assertActive(); resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(blocked("ollama_observer_probe_invalid")); }
      });
      response.on("error", () => reject(blocked("ollama_observer_probe_failed")));
    });
    request.on("timeout", () => request.destroy(blocked("ollama_observer_probe_timeout")));
    request.on("error", () => reject(blocked("ollama_observer_probe_failed")));
    request.end();
  });
}

function modelEntry(payload, model) {
  if (!payload || !Array.isArray(payload.models)) throw blocked("ollama_observer_probe_invalid");
  const matches = payload.models.filter(entry => entry && (entry.name === model || entry.model === model));
  if (matches.length !== 1) throw blocked("ollama_observer_model_unavailable");
  return matches[0];
}

function optionalModelEntry(payload, model) {
  if (!payload || !Array.isArray(payload.models)) throw blocked("ollama_observer_probe_invalid");
  const matches = payload.models.filter(entry => entry && (entry.name === model || entry.model === model));
  if (matches.length > 1) throw blocked("ollama_observer_probe_invalid");
  return matches[0] ?? null;
}

function assertExactModel(entry, digest) {
  if (expectedDigest(entry.digest) !== digest || entry.remote_host || entry.remote_model)
    throw blocked("ollama_observer_digest_mismatch");
}

// This is a prelaunch floor, not a claim that the model fits in RAM or VRAM.
// Ollama remains the authority for loading and may refuse the only request.
export function localMemoryFloorMet(freeBytes, modelSizeBytes) {
  return Number.isSafeInteger(freeBytes) && Number.isSafeInteger(modelSizeBytes)
    && modelSizeBytes > 0 && freeBytes >= Math.max(MIN_FREE_MEMORY, Math.min(4 * 1024 ** 3, Math.ceil(modelSizeBytes / 4)));
}

// Test ports are intentionally unavailable to production callers. This
// switch only changes loopback ports; the observer never accepts another host.
function ports(testPorts) {
  if (testPorts === undefined) return { upstream: OLLAMA_PORT, observer: OBSERVER_PORT };
  if (process.env.ROOST_OLLAMA_OBSERVER_TEST !== "1" || !testPorts ||
      !Number.isInteger(testPorts.upstream) || testPorts.upstream < 1 || testPorts.upstream > 65535 ||
      !Number.isInteger(testPorts.observer) || testPorts.observer < 0 || testPorts.observer > 65535)
    throw blocked("ollama_observer_target_invalid");
  return testPorts;
}

export async function startOllamaObserver({ model, digest, assertAuthority, signal,
  timeoutMs = 600_000, testPorts, testFreeMemoryBytes, assertUpstreamIdentity, assertConnectedUpstreamIdentity,
  onModelRequest, testRequestMetadata } = {}) {
  const fixture = testPorts && process.env.ROOST_OLLAMA_OBSERVER_TEST === "1";
  if (model !== MODEL || !DIGEST.test(digest) || typeof assertAuthority !== "function" && !fixture ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000 || signal?.aborted)
    throw blocked("ollama_observer_selection_invalid");
  if ((typeof assertUpstreamIdentity !== "function" || typeof assertConnectedUpstreamIdentity !== "function") && !fixture)
    throw blocked("ollama_observer_process_identity_required");
  if (typeof onModelRequest !== "function" && !fixture) throw blocked("ollama_observer_durable_call_marker_required");
  const assertTaskAuthority = assertAuthority ?? (() => true);
  const assertUpstream = assertUpstreamIdentity ?? (() => true);
  const assertConnected = assertConnectedUpstreamIdentity ?? (() => true);
  const { upstream, observer } = ports(testPorts);
  if (testFreeMemoryBytes !== undefined && (!fixture || !Number.isSafeInteger(testFreeMemoryBytes) || testFreeMemoryBytes < 0))
    throw blocked("ollama_observer_test_memory_invalid");
  if (testRequestMetadata !== undefined && (!fixture || typeof testRequestMetadata !== "function"))
    throw blocked("ollama_observer_test_hook_invalid");
  const freeMemory = fixture && testFreeMemoryBytes !== undefined ? () => testFreeMemoryBytes : os.freemem;
  const startedAt = Date.now(), deadline = startedAt + timeoutMs;
  let failure = null, closed = false, requests = 0, metadataProbes = 0, completed = false, observedDuring = false;
  let response = null, requestPromise = null, finishPromise = null, duringProbe = null;
  const sockets = new Set();
  const upstreamCalls = new Set();
  const fail = code => { failure ??= blocked(code); return failure; };
  const assertActive = () => {
    if (failure) throw failure;
    if (closed || signal?.aborted || Date.now() >= deadline) throw fail("ollama_observer_inactive");
    try {
      const authority = assertTaskAuthority();
      if (authority === false || authority?.then) throw new Error("authority_invalid");
    } catch { throw fail("ollama_observer_authority_changed"); }
  };
  const tags = async () => { const entry = modelEntry(await readJson(upstream, "/api/tags", assertActive), model);
    assertExactModel(entry, digest);
    if (!Number.isSafeInteger(entry.size) || entry.size <= 0) throw fail("ollama_observer_model_size_invalid");
    return entry; };
  const ps = async () => { const entry = modelEntry(await readJson(upstream, "/api/ps", assertActive), model);
    assertExactModel(entry, digest); return entry; };
  const initialTag = await tags();
  assertUpstream();
  if (!localMemoryFloorMet(freeMemory(), initialTag.size)) throw fail("ollama_observer_memory_floor_unmet");
  const initialLoaded = optionalModelEntry(await readJson(upstream, "/api/ps", assertActive), model);
  if (initialLoaded) assertExactModel(initialLoaded, digest);
  const preflight = Object.freeze({ model, digest, sizeBytes: initialTag.size,
    loadedAtStart: Boolean(initialLoaded), loadedDigestAtStart: initialLoaded ? digest : null });

  const server = http.createServer((incoming, outgoing) => {
    try {
      testRequestMetadata?.({ method: incoming.method, path: incoming.url, host: incoming.headers.host });
      assertActive();
      if (incoming.headers.host !== `${HOST}:${server.address().port}`) throw fail("ollama_observer_request_denied");
      if (incoming.method === "GET" && HERMES_READ_PROBES.has(incoming.url)) {
        if (++metadataProbes > 32) throw fail("ollama_observer_metadata_limit");
        incoming.resume();
        const payload = incoming.url === "/v1/models" ? { object: "list", data: [{ id: model, object: "model", owned_by: "local" }] }
          : incoming.url === `/v1/models/${model}` ? { id: model, object: "model", owned_by: "local" } : null;
        outgoing.writeHead(payload ? 200 : 404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        outgoing.end(JSON.stringify(payload ?? { error: "metadata_unavailable" }));
        return;
      }
      if (incoming.method === "POST" && incoming.url === "/api/show") {
        if (++metadataProbes > 32 || Number(incoming.headers["content-length"]) > 4096) throw fail("ollama_observer_metadata_limit");
        const parts = []; let size = 0;
        incoming.on("data", part => { size += part.length; if (size > 4096) incoming.destroy(fail("ollama_observer_metadata_limit")); else parts.push(part); });
        incoming.on("end", () => {
          try {
            assertActive();
            const body = JSON.parse(Buffer.concat(parts).toString("utf8"));
            if (!body || typeof body !== "object" || Array.isArray(body)
              || !Object.keys(body).length || Object.keys(body).some(key => key !== "name" && key !== "model" || body[key] !== model))
              throw fail("ollama_observer_metadata_model_mismatch");
            outgoing.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
            outgoing.end('{"error":"metadata_unavailable"}');
          } catch { outgoing.destroy(fail("ollama_observer_metadata_model_mismatch")); }
        });
        return;
      }
      if (incoming.method !== "POST" || incoming.url !== "/v1/chat/completions" || requests !== 0) {
        throw fail("ollama_observer_request_denied");
      }
      requests += 1;
      const announced = Number(incoming.headers["content-length"]);
      if (Number.isFinite(announced) && announced > REQUEST_LIMIT) throw fail("ollama_observer_request_oversize");
      let size = 0;
      const pieces = [];
      incoming.on("data", chunk => {
        size += chunk.length;
        if (size > REQUEST_LIMIT) { fail("ollama_observer_request_oversize"); incoming.destroy(); return; }
        pieces.push(chunk);
      });
      incoming.on("end", () => {
        requestPromise = (async () => {
          assertActive();
          let body;
          try { body = JSON.parse(Buffer.concat(pieces).toString("utf8")); }
          catch { throw fail("ollama_observer_request_invalid"); }
          if (!body || typeof body !== "object" || Array.isArray(body) || body.model !== model)
            throw fail("ollama_observer_request_model_mismatch");
          await tags(); // Bind the current tag immediately before the only forwarded request.
          if (!localMemoryFloorMet(freeMemory(), initialTag.size)) throw fail("ollama_observer_memory_floor_unmet");
          assertUpstream();
          assertActive();
          const bytes = Buffer.from(JSON.stringify(body));
          if (bytes.length > REQUEST_LIMIT) throw fail("ollama_observer_request_oversize");
          const received = await new Promise((resolve, reject) => {
            let bodySent = false;
            const call = http.request({ hostname: HOST, port: upstream, path: "/v1/chat/completions", method: "POST",
              headers: { Host: `${HOST}:${upstream}`, "Content-Type": "application/json", "Content-Length": bytes.length,
                Accept: "application/json, text/event-stream", Connection: "close" }, timeout: Math.max(1, deadline - Date.now()) }, answer => {
              if (!bodySent || answer.statusCode !== 200) { answer.resume(); reject(fail("ollama_observer_upstream_failed")); return; }
              const contentType = String(answer.headers["content-type"] ?? "");
              outgoing.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
              let count = 0;
              const chunks = [];
              answer.on("data", chunk => {
                try { assertActive(); } catch (error) { call.destroy(error); return; }
                count += chunk.length;
                if (count > RESPONSE_LIMIT) { call.destroy(fail("ollama_observer_response_oversize")); return; }
                if (!duringProbe) {
                  duringProbe = ps().then(() => { assertUpstream(); observedDuring = true; });
                  void duringProbe.catch(() => {});
                }
                chunks.push(chunk);
                outgoing.write(chunk);
              });
              answer.on("end", () => {
                try {
                  assertActive();
                  if (!answer.complete) throw fail("ollama_observer_response_incomplete");
                  resolve(responseMetadata(Buffer.concat(chunks), contentType, model));
                }
                catch (error) { reject(fail(error?.protocolAdmission ? error.message : "ollama_observer_response_invalid")); }
              });
              answer.on("aborted", () => reject(fail("ollama_observer_response_incomplete")));
              answer.on("close", () => {
                if (!answer.complete) reject(fail("ollama_observer_response_incomplete"));
              });
              answer.on("error", () => reject(fail("ollama_observer_upstream_failed")));
            });
            upstreamCalls.add(call);
            call.on("close", () => upstreamCalls.delete(call));
            call.on("timeout", () => call.destroy(fail("ollama_observer_upstream_timeout")));
            call.on("error", () => reject(fail("ollama_observer_upstream_failed")));
            call.on("socket", socket => {
              const send = () => {
                try {
                  assertActive();
                  assertUpstream();
                  assertConnected(socket.localPort);
                  onModelRequest?.();
                  bodySent = true;
                  call.end(bytes);
                } catch (error) { call.destroy(error); reject(error); }
              };
              if (socket.connecting) socket.once("connect", send);
              else send();
            });
            // Headers can initiate the TCP connection; no prompt bytes leave
            // until the connected socket is attributed to the pinned process.
            call.flushHeaders();
          });
          if (!duringProbe) throw fail("ollama_observer_response_invalid");
          await duringProbe;
          response = received;
          completed = true;
          outgoing.end();
        })().catch(error => {
          failure ??= error?.protocolAdmission ? error : blocked("ollama_observer_request_failed");
          if (!outgoing.headersSent) outgoing.writeHead(502, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
          outgoing.destroy();
        });
      });
      incoming.on("error", () => { fail("ollama_observer_request_failed"); outgoing.destroy(); });
      incoming.on("aborted", () => { fail("ollama_observer_request_incomplete"); outgoing.destroy(); });
      outgoing.on("close", () => {
        if (!outgoing.writableFinished && !failure) fail("ollama_observer_response_incomplete");
      });
    } catch (error) {
      failure ??= error?.protocolAdmission ? error : blocked("ollama_observer_request_denied");
      outgoing.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      outgoing.end("denied");
    }
  });
  server.on("connection", socket => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
  server.on("clientError", (error, socket) => {
    testRequestMetadata?.({ clientError: error.code ?? "unknown" });
    // Hermes closes unused probe connections. A reset contains no HTTP
    // request to admit; active model requests have their own abort checks.
    if (error.code !== "ECONNRESET") fail("ollama_observer_request_denied");
    socket.destroy();
  });
  server.on("upgrade", (_, socket) => { fail("ollama_observer_request_denied"); socket.destroy(); });
  const abort = () => {
    fail("ollama_observer_inactive");
    for (const socket of sockets) socket.destroy();
    for (const call of upstreamCalls) call.destroy();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: HOST, port: observer, exclusive: true }, resolve);
    });
  } catch {
    signal?.removeEventListener("abort", abort);
    throw blocked("ollama_observer_bind_failed");
  }
  const expiry = setTimeout(abort, Math.max(1, deadline - Date.now()));
  expiry.unref();
  const boundPort = server.address().port;
  const close = async () => {
    if (closed) return;
    closed = true;
    clearTimeout(expiry);
    signal?.removeEventListener("abort", abort);
    for (const socket of sockets) socket.destroy();
    for (const call of upstreamCalls) call.destroy();
    await new Promise(resolve => server.close(resolve));
  };
  const finish = () => {
    finishPromise ??= (async () => {
      assertActive();
      if (requestPromise) await requestPromise;
      assertActive();
      if (requests !== 1 || !completed || !observedDuring || !response) throw fail("ollama_observer_incomplete");
      await ps();
      await tags();
      assertUpstream();
      assertActive();
      return Object.freeze({ schemaVersion: "roost-ollama-observation-v1", backend: "ollama_loopback", model,
        digest, endpoint: `http://${HOST}:${upstream}`, requestedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(), requestCount: requests, responseModel: response.model,
        responseChunks: response.chunks, usage: response.usage, tagDigestVerified: true,
        runningDigestVerified: true, preflight });
    })();
    return finishPromise;
  };
  return Object.freeze({ baseUrl: `http://${HOST}:${boundPort}/v1`, preflight, assertActive, finish, close,
    failureCode: () => failure?.message ?? null });
}
