import test from "node:test";
import assert from "node:assert/strict";
import policy from "./lib/agent-runtime-redaction.cjs";
import { boundedRunnerLines, guardHostContent, hostTransport, readHostResponse } from "./lib/agent-host-redaction.mjs";
import { Readable } from "node:stream";
const known = "synthetic-runtime-value-987654321";
test("ordinary Basic titles survive while standalone, split and encoded Basic credentials are blocked", () => {
  for (const title of ["Basic architecture", "Basic application model", "Basic Authentication guide"]) {
    const value = { title, revision: "a".repeat(64) };
    assert.deepEqual(policy.sanitize(value, { mode: "required" }).value, value);
    assert.equal(policy.sanitize(value, { mode: "required" }).blocked, false);
  }
  const value = "Basic " + Buffer.from("fixture:synthetic-password").toString("base64");
  for (const payload of [{ text: value }, { parts: [value.slice(0, 15), value.slice(15)] },
    { text: encodeURIComponent(value) }, { text: Buffer.from(value).toString("base64") },
    { authorization: "Basic malformed" }]) {
    assert.equal(policy.sanitize(payload, { mode: "required" }).blocked, true);
  }
  for (const userLength of [6128, 6144, 6145]) {
    const credential = "Basic " + Buffer.from("u".repeat(userLength) + ":synthetic-password").toString("base64");
    assert.equal(policy.sanitize({ text: credential }, { mode: "required" }).blocked, true);
  }
  const boundary = Buffer.from("u".repeat(6142) + ":x").toString("base64");
  assert.equal(boundary.length, 8192);
  for (const token of [boundary, boundary + "A"]) {
    assert.equal(policy.sanitize({ text: "Basic " + token }, { mode: "required" }).blocked, true);
  }
  for (const encoding of ["hex", "base64"]) {
    const bytes = Buffer.concat([Buffer.from([0xff]), Buffer.from(value)]);
    assert.equal(policy.sanitize({ text: bytes.toString(encoding) }, { mode: "required" }).blocked, true);
  }
});
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

test("binary digests do not invent PII while encoded text and binary credentials remain protected", () => {
  const revision = "874f63412f8201fc6e4013372e7a02768b21f228fcc485c5ae29c79c8c6c16e7";
  assert.equal(policy.sanitize({ revision }, { mode: "required" }).blocked, false);
  assert.deepEqual(policy.sanitize({ revision }).value, { revision });
  for (const encoding of ["hex", "base64"]) {
    for (const value of ["person@example.test", "per\u0000son@example.test", "api_\u0000key=fictional-value", known]) {
      assert.equal(policy.sanitize({ text: Buffer.from(value).toString(encoding) }, { mode: "required", secrets: [known] }).blocked, true);
    }
    for (const value of [known, "api_\u0000key=fictional-value"]) {
      const bytes = Buffer.concat([Buffer.from([0xff]), Buffer.from(value)]);
      assert.equal(policy.sanitize({ text: bytes.toString(encoding) }, { mode: "required", secrets: [known] }).blocked, true);
    }
  }
});
const referencePacket = count => ({ records: Array.from({ length: count }, (_, index) => ({
  sourceDigest: "f".repeat(64), annotation: ` reference-${index}\n`,
})) });
test("bounded metadata retains more than 2048 references without a digest exemption", () => {
  const input = referencePacket(2500), start = performance.now();
  const result = policy.sanitize(input, { mode: "required" });
  assert.equal(result.blocked, false);
  assert.deepEqual(result.value, input);
  assert.ok(performance.now() - start < 2000, "complete reference scan remains bounded");
});
test("joined encoded credentials beyond 2048 tokens remain blocked regardless of field names", () => {
  const split = {
    leftDigest: Buffer.from(" ".repeat(30) + "gh").toString("hex"),
    rightDigest: Buffer.from("p_" + "A".repeat(16) + " ".repeat(14)).toString("hex"),
  };
  for (const input of [
    { summary: split },
    { ...referencePacket(2500), summary: split },
    { ...referencePacket(2500), executionContract: { extra: split } },
    { ...referencePacket(2500), one: "gh", two: "p_" + "A".repeat(16) },
  ]) {
    const result = policy.sanitize(input, { mode: "required" });
    assert.equal(result.blocked, true);
    assert.ok(result.findings.some(finding => finding.category === "split_sensitive"));
    assert.throws(() => guardHostContent(input, "required"), /agent_runtime_content_blocked/);
  }
});
test("the expanded decoding budget still fails closed without scanning a truncated prefix", () => {
  const input = { records: Array.from({ length: policy.LIMITS.decodedTokens + 1 }, () => "abcdefghijklmnop!\n") };
  const start = performance.now(), result = policy.sanitize(input, { mode: "required" });
  assert.equal(result.blocked, true);
  assert.ok(result.findings.some(finding => finding.category === "split_sensitive"));
  assert.ok(performance.now() - start < 2000, "oversized token scan remains bounded");
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
  assert.deepEqual(policy.knownRuntimeSecrets({ PWD: "/app", OLDPWD: "/", INTEGRATION_SECRET_KEY: known, API_KEY: known, DATABASE_URL: "postgresql://fixture:synthetic-password@localhost/test", NORMAL_ID: "safe-id" }).sort(), [known, "synthetic-password"].sort());
  assert.equal(policy.sanitize({ data: [] }, { secrets: policy.knownRuntimeSecrets({ PWD: "/app", OLDPWD: "/" }) }).blocked, false);
  assert.equal(policy.sanitize({ pwd: "synthetic-password" }).redacted, true);
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
test("bounded source files retain an explicit text MIME type in required provider evidence", () => {
  const file = { path: "scripts/check.mjs", mimeType: "text/plain", content: "export const safe = true;\n", sha256: "a".repeat(64) };
  assert.equal(guardHostContent({ repositoryInspection: { files: [file] } }, "required").blocked, false);
  assert.throws(() => guardHostContent({ repositoryInspection: { files: [{ ...file, mimeType: undefined }] } }, "required"),
    error => error.message === "agent_runtime_content_blocked"
      && error.details?.findings?.some(finding => finding.category === "unsupported_format")
      && !JSON.stringify(error.details).includes(file.content));
});
test("exact file digest references are metadata while malformed references and hidden content fail closed", () => {
  const reference = { file: "C:/fixture/release-policy.json", sha256: "f".repeat(64), bytes: 321 };
  for (const input of [{ files: { "release-policy.json": reference } }, { attachments: [reference] }]) {
    const result = guardHostContent(input, "required");
    assert.equal(result.blocked, false);
    assert.deepEqual(result.value, input);
  }
  const hidden = { ...reference };
  Object.defineProperty(hidden, "content", { value: "untyped attachment", enumerable: false });
  let getterCalled = false;
  const getter = { ...reference };
  Object.defineProperty(getter, "file", { get() { getterCalled = true; return reference.file; } });
  for (const invalid of [{ ...reference, bytes: "binary-content" }, { ...reference, bytes: -1 },
    { ...reference, bytes: 1.5 }, { ...reference, sha256: "invalid" }, { ...reference, file: "" },
    { ...reference, content: "untyped attachment" }, hidden, getter]) {
    assert.equal(policy.sanitize({ files: [invalid] }, { mode: "required" }).blocked, true);
  }
  assert.equal(getterCalled, false);
  for (const sensitive of [{ ...reference, file: known },
    { ...reference, sha256: Buffer.from("api_key=fictional-value".padEnd(32)).toString("hex") }]) {
    assert.equal(policy.sanitize({ files: [sensitive] }, { mode: "required", secrets: [known] }).blocked, true);
  }
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
