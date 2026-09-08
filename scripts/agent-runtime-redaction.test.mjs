import test from "node:test";
import assert from "node:assert/strict";
import policy from "./lib/agent-runtime-redaction.cjs";
import { boundedRunnerLines, hostTransport, readHostResponse } from "./lib/agent-host-redaction.mjs";
import { Readable } from "node:stream";
const known = "synthetic-runtime-value-987654321";
test("one recursive policy removes values and never reports dynamic keys or matches", () => {
  for (const payload of [
    { nested: [{ apiKey: "fictional-key-material" }] }, { token: "fictional-token-value" }, { secretKey: "fictional-key-value" }, { headers: { authorization: "Bearer synthetic-long-token", cookie: "session=fictional" } },
    { output: "-----BEGIN RSA PRIVATE KEY-----\nfictional\n-----END RSA PRIVATE KEY-----" },
    { email: "person@example.test", phoneNumber: "+00 000 000", personalName: "Fictional Person" },
    { [known]: "arbitrary field key" }, { text: known }, { parts: [known.slice(0, 10), known.slice(10)] },
    { text: encodeURIComponent("password=fictional-value") }, { text: Buffer.from("api_key=fictional-value").toString("base64") },
    { text: Buffer.from(known).toString("hex") }, { text: "api_\\u006bey=fictional-value" },
    { text: "sk-proj-" + "f".repeat(32) }, { text: "secret=fictional-value" },
    { "api%5Fkey": "fictional-value" }, { text: "api\u0000_key=fictional-value" },
  ]) {
    const result = policy.sanitize(payload, { secrets: [known] });
    assert.equal(result.redacted, true, JSON.stringify(payload));
    assert.ok(!JSON.stringify(result).includes(known));
    assert.ok(!JSON.stringify(result.value).includes("fictional-value"));
    assert.ok(!JSON.stringify(result.findings).includes("fictional"));
    assert.equal(policy.sanitize(payload, { secrets: [known], mode: "required" }).blocked, true);
  }
});
test("technical IDs and declared harmless fields retain exact semantics", () => {
  const input = { taskId: "00000000-0000-4000-8000-000000000001", credentialId: "00000000-0000-4000-8000-000000000002", checkpoint: { packetRevision: "a".repeat(64), sessionId: "00000000-0000-4000-8000-000000000003" }, maxOutputTokens: 1000, key: "parser-contract", name: "Parser agent", command: "npm test -- parser" };
  assert.deepEqual(policy.sanitize(input).value, input); assert.equal(policy.sanitize(input).redacted, false);
  assert.equal(policy.sanitize({ reviewerUser: { name: "Fictional Person", id: input.taskId } }).value.reviewerUser.name, policy.MARKER);
});
test("binary, unsupported attachments, getters, cycles and resource limits fail closed", () => {
  const cyclic = {}; cyclic.self = cyclic;
  let deep = {}; for (let i = 0; i < 50; i++) deep = { deep };
  let invoked = false; const getter = { get secret() { invoked = true; return known; } };
  for (const input of [cyclic, deep, getter, Buffer.from(known), { mimeType: "application/pdf", content: known }, { output: "a".repeat(140000) }, new Map([["a", known]])]) {
    const result = policy.sanitize(input); assert.equal(result.blocked, true); assert.ok(!JSON.stringify(result).includes(known));
  }
  assert.equal(invoked, false);
});
test("split JSON and encoded values are bounded and stable on repeated sanitization", () => {
  const input = { one: "api_", two: "key=synthetic-", three: "sensitive-value" };
  const r = policy.sanitize(input); assert.equal(r.blocked, true); assert.ok(!JSON.stringify(r.value).includes("sensitive-value"));
  assert.deepEqual(policy.sanitize(r.value).value, r.value);
  const start = performance.now(); const hostile = { text: "a".repeat(120000) + "!" }; policy.sanitize(hostile, { secrets: [known] }); assert.ok(performance.now() - start < 1000);
});
test("known environment values stay in memory and overflow does not silently omit them", () => {
  assert.deepEqual(policy.knownRuntimeSecrets({ API_KEY: known, DATABASE_URL: "postgresql://fixture:synthetic-password@localhost/test", NORMAL_ID: "safe-id" }).sort(), [known, "synthetic-password"].sort());
  assert.equal(policy.sanitize("normal", { secrets: Array(129).fill(known) }).blocked, true);
});
test("resanitized required input, nested encodings and interleaved stream fragments stay blocked", () => {
  for (const value of [policy.MARKER, { redacted: true, policy: policy.POLICY }]) assert.equal(policy.sanitize(value, { mode: "required" }).blocked, true);
  let encoded = "password=synthetic-sensitive"; for (let i = 0; i < 3; i++) encoded = Buffer.from(encoded).toString("base64");
  assert.equal(policy.sanitize({ text: encoded }).redacted, true);
  assert.equal(policy.sanitize([{ type: "progress", text: "api_" }, { type: "progress", text: "key=synthetic-sensitive" }]).blocked, true);
  const lease = "00000000-0000-4000-8000-000000000001", taskId = "00000000-0000-4000-8000-000000000002";
  assert.deepEqual(policy.sanitize({ taskId }, { secrets: [lease] }).value, { taskId });
});
test("host transport preserves only root authentication and bounds UTF-8 streams without a fallback", async () => {
  const leaseToken = "00000000-0000-4000-8000-000000000019";
  const result = hostTransport(JSON.stringify({ leaseToken, payload: { secret: known } }));
  assert.equal(JSON.parse(result.body).leaseToken, leaseToken); assert.equal(result.redacted, true); assert.ok(!result.body.includes(known));
  assert.throws(() => hostTransport("not json"), /agent_runtime_content_blocked/);
  const bytes = Buffer.from('Żółw\n{"text":"fixture"}'); const lines = [];
  for await (const line of boundedRunnerLines(Readable.from([...bytes].map(b => Buffer.from([b]))))) lines.push(line);
  assert.deepEqual(lines, ["Żółw", '{"text":"fixture"}']);
  await assert.rejects(async () => { for await (const _ of boundedRunnerLines(Readable.from([Buffer.alloc(140000, 65)]))) {} }, /agent_runtime_content_blocked/);
  await assert.rejects(readHostResponse(new Response("a".repeat(600000))), /agent_runtime_content_blocked/);
  assert.deepEqual(await readHostResponse(new Response('{"data":{"id":"fixture"}}')), { data: { id: "fixture" } });
});
