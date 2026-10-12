import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";
import { startOllamaObserver, localMemoryFloorMet } from "./lib/agent-host-ollama-observer.mjs";

const MODEL = "gpt-oss:20b";
const DIGEST = `sha256:${"a".repeat(64)}`;
const OTHER_DIGEST = `sha256:${"b".repeat(64)}`;
const CANARY = "private prompt and response must never appear in a receipt";

test("resource floor rejects insufficient free memory without claiming full fit", () => {
  assert.equal(localMemoryFloorMet(1024 ** 3, 13_000_000_000), false);
  assert.equal(localMemoryFloorMet(4 * 1024 ** 3, 13_000_000_000), true);
  assert.equal(localMemoryFloorMet(Number.NaN, 13_000_000_000), false);
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function stop(server) {
  return new Promise(resolve => server.close(resolve));
}

async function fixture(t, options = {}) {
  let tagDigest = DIGEST;
  let loadedDigest = DIGEST;
  let calls = 0, receivedBodies = 0;
  const server = http.createServer((request, response) => {
    if (request.url === "/api/tags") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ models: [{ name: MODEL, model: MODEL, digest: tagDigest, size: 13_000_000_000 }] }));
      return;
    }
    if (request.url === "/api/ps") {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ models: [{ name: MODEL, model: MODEL, digest: loadedDigest, size: 13_000_000_000 }] }));
      return;
    }
    if (request.url !== "/v1/chat/completions" || request.method !== "POST") {
      response.writeHead(404).end();
      return;
    }
    calls += 1;
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      receivedBodies += 1;
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (options.hang) return;
      response.setHeader("Content-Type", options.sse ? "text/event-stream" : "application/json");
      const result = { model: options.responseModel === undefined ? MODEL : options.responseModel,
        choices: [{ message: { content: CANARY } }],
        usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 } };
      if (options.omitResponseModel) delete result.model;
      if (options.largeResponse) {
        response.end(JSON.stringify({ ...result, padding: "x".repeat(1024 * 1024 + 100) }));
      } else if (options.sse) {
        response.end(`data: ${JSON.stringify(result)}\n\ndata: [DONE]\n\n`);
      } else {
        response.end(JSON.stringify({ ...result, seen: body.messages?.[0]?.content }));
      }
    });
  });
  const port = await listen(server);
  t.after(async () => stop(server));
  return { port, get calls() { return calls; }, get receivedBodies() { return receivedBodies; }, setTagDigest(value) { tagDigest = value; },
    setLoadedDigest(value) { loadedDigest = value; } };
}

async function observer(t, fake, options = {}) {
  const instance = await startOllamaObserver({ model: MODEL, digest: DIGEST,
    timeoutMs: options.timeoutMs ?? 2000, assertAuthority: options.assertAuthority,
    assertConnectedUpstreamIdentity: options.assertConnectedUpstreamIdentity ?? (() => true),
    onModelRequest: options.onModelRequest,
    testFreeMemoryBytes: 8 * 1024 ** 3, testPorts: { upstream: fake.port, observer: 0 } });
  t.after(async () => instance.close());
  return instance;
}

async function send(instance, payload, options = {}) {
  const url = new URL(`${instance.baseUrl}/chat/completions`);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return new Promise(resolve => {
    const request = http.request({ hostname: "127.0.0.1", port: Number(url.port),
      path: options.path ?? url.pathname, method: options.method ?? "POST",
      headers: { Host: options.host ?? url.host, "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body) }, timeout: 3000 }, response => {
      response.resume();
      response.on("end", () => resolve({ status: response.statusCode }));
      response.on("error", () => resolve({ status: "closed" }));
    });
    request.on("error", () => resolve({ status: "closed" }));
    request.on("timeout", () => { request.destroy(); resolve({ status: "timeout" }); });
    request.end(body);
  });
}

const requestBody = { model: MODEL, messages: [{ role: "user", content: CANARY }] };

test.before(() => { process.env.ROOST_OLLAMA_OBSERVER_TEST = "1"; });
test.after(() => { delete process.env.ROOST_OLLAMA_OBSERVER_TEST; });

test("one exact JSON request yields a metadata-only receipt", async t => {
  const fake = await fixture(t);
  const instance = await observer(t, fake);
  assert.deepEqual(instance.preflight, { model: MODEL, digest: DIGEST, sizeBytes: 13_000_000_000,
    loadedAtStart: true, loadedDigestAtStart: DIGEST });
  assert.equal((await send(instance, requestBody)).status, 200);
  const receipt = await instance.finish();
  assert.equal(fake.calls, 1);
  assert.equal(receipt.responseModel, MODEL);
  assert.equal(receipt.digest, DIGEST);
  assert.equal(receipt.requestCount, 1);
  assert.deepEqual(receipt.usage, { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 });
  assert.equal(JSON.stringify(receipt).includes(CANARY), false);
});

test("one exact SSE request verifies response model and usage", async t => {
  const fake = await fixture(t, { sse: true });
  const instance = await observer(t, fake);
  assert.equal((await send(instance, requestBody)).status, 200);
  assert.equal((await instance.finish()).responseModel, MODEL);
});

test("connected socket owner refusal prevents prompt body transfer", async t => {
  const fake = await fixture(t);
  const instance = await observer(t, fake, { assertConnectedUpstreamIdentity: () => {
    throw Error("wrong socket owner");
  } });
  await send(instance, requestBody);
  await assert.rejects(instance.finish());
  assert.equal(fake.receivedBodies, 0);
});

test("durable model-call marker precedes body and a marker failure blocks forwarding", async t => {
  const fake = await fixture(t);
  let markers = 0;
  const instance = await observer(t, fake, { onModelRequest: () => { markers += 1; throw Error("journal unavailable"); } });
  await send(instance, requestBody);
  await assert.rejects(instance.finish());
  assert.equal(markers, 1);
  assert.equal(fake.receivedBodies, 0);
});

test("Hermes metadata probes do not consume or bypass the one model request", async t => {
  const fake = await fixture(t);
  const instance = await observer(t, fake);
  const base = new URL(instance.baseUrl);
  const probe = (method, route, body) => new Promise((resolve, reject) => {
    const request = http.request({ hostname: "127.0.0.1", port: Number(base.port), method, path: route,
      headers: { Host: base.host, ...(body ? { "Content-Type": "application/json" } : {}) } }, response => {
      response.resume(); response.on("end", () => resolve(response.statusCode));
    });
    request.on("error", reject); request.end(body ? JSON.stringify(body) : undefined);
  });
  assert.equal(await probe("GET", "/v1/models"), 200);
  assert.equal(await probe("GET", "/v1/models/gpt-oss:20b"), 200);
  assert.equal(await probe("GET", "/v1/props"), 404);
  assert.equal(await probe("POST", "/api/show", { name: MODEL }), 404);
  assert.equal((await send(instance, requestBody)).status, 200);
  assert.equal((await instance.finish()).requestCount, 1);
  assert.equal(fake.receivedBodies, 1);
});

test("request model, path, host and second request are denied", async t => {
  for (const variant of [
    { body: { ...requestBody, model: "other:latest" } },
    { body: requestBody, path: "/v1/other" },
    { body: requestBody, host: "other.invalid:11435" },
  ]) {
    const fake = await fixture(t);
    const instance = await observer(t, fake);
    await send(instance, variant.body, variant);
    await assert.rejects(instance.finish());
    assert.equal(fake.calls, 0);
  }
  const fake = await fixture(t);
  const instance = await observer(t, fake);
  assert.equal((await send(instance, requestBody)).status, 200);
  await send(instance, requestBody);
  await assert.rejects(instance.finish());
  assert.equal(fake.calls, 1);
});

test("digest race before forwarding and loaded digest race during response stop acceptance", async t => {
  const fake = await fixture(t);
  const instance = await observer(t, fake);
  fake.setTagDigest(OTHER_DIGEST);
  await send(instance, requestBody);
  await assert.rejects(instance.finish());
  assert.equal(fake.calls, 0);

  const fake2 = await fixture(t);
  const instance2 = await observer(t, fake2);
  fake2.setLoadedDigest(OTHER_DIGEST);
  await send(instance2, requestBody);
  await assert.rejects(instance2.finish());
});

test("oversized request and response fail closed", async t => {
  const fake = await fixture(t);
  const instance = await observer(t, fake);
  await send(instance, JSON.stringify({ ...requestBody, padding: "x".repeat(256 * 1024) }));
  await assert.rejects(instance.finish());
  assert.equal(fake.calls, 0);

  const fake2 = await fixture(t, { largeResponse: true });
  const instance2 = await observer(t, fake2);
  await send(instance2, requestBody);
  await assert.rejects(instance2.finish());
});

test("unexpected response model and absent upstream response fail closed", async t => {
  const fake = await fixture(t, { responseModel: "other:latest" });
  const instance = await observer(t, fake);
  await send(instance, requestBody);
  await assert.rejects(instance.finish());
  assert.equal(instance.failureCode(), "ollama_observer_response_model_mismatch");

  const fake2 = await fixture(t, { hang: true });
  const instance2 = await observer(t, fake2, { timeoutMs: 150 });
  await send(instance2, requestBody);
  await assert.rejects(instance2.finish());
});

test("missing response model and no request fail closed", async t => {
  const fake = await fixture(t, { omitResponseModel: true });
  const instance = await observer(t, fake);
  await send(instance, requestBody);
  await assert.rejects(instance.finish());

  const fake2 = await fixture(t);
  const instance2 = await observer(t, fake2);
  await assert.rejects(instance2.finish());
  assert.equal(fake2.calls, 0);
});
