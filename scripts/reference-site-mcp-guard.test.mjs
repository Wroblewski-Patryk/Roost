import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const bridge = fileURLToPath(new URL("./companycore-mcp-server.mjs", import.meta.url));
const taskId = "11111111-1111-4111-8111-111111111111";
const siteIds = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
const observationIds = ["published-contact-intent", "published-projects-tab"];
const reviewIds = ["44444444-4444-4444-8444-444444444444", "55555555-5555-4555-8555-555555555555"];
const revision = "2026-10-12T12:00:00.000Z";
const packageDigests = ["a".repeat(64), "b".repeat(64)];
const sitesRoute = "/v1/product-engineering/tasks/:taskId/reference-sites";
const findingsRoute = `${sitesRoute}/:siteId/findings`;
const packageRoute = `${sitesRoute}/:siteId/package`;
const getSites = "companycore_get_product_engineering_tasks_by_taskId_reference_sites";
const getPackage = "companycore_get_product_engineering_tasks_by_taskId_reference_sites_by_siteId_package";
const getFindings = "companycore_get_product_engineering_tasks_by_taskId_reference_sites_by_siteId_findings";
const postFinding = "companycore_post_product_engineering_tasks_by_taskId_reference_sites_by_siteId_findings";

const tools = [
  { name: getSites, method: "GET", path: sitesRoute, riskLevel: "read", requiresApproval: false },
  { name: getPackage, method: "GET", path: packageRoute, riskLevel: "read", requiresApproval: false },
  { name: getFindings, method: "GET", path: findingsRoute, riskLevel: "read", requiresApproval: false },
  { name: postFinding, method: "POST", path: findingsRoute, riskLevel: "write", requiresApproval: false },
  { name: "companycore_post_other", method: "POST", path: "/v1/other", riskLevel: "write", requiresApproval: false }
].map(tool => ({ ...tool, title: tool.name, description: "Fixture", capability: "agent-runtime:write",
  inputSchema: { type: "object", properties: {}, required: [] } }));

function bodyFor(index, requestId) {
  return { requestId, packageDigest: packageDigests[index], observationId: observationIds[index],
    siteRevision: revision, sourceReviewId: reviewIds[index], title: `Fixture ${index}`,
    category: "journey", language: "pl", observed: "Fixture <script>alert(1)</script> observation", sourceExcerpt: "Fixture excerpt",
    interpretation: "Fixture interpretation", uncertainty: "Not confirmed live", applicability: "Fixture only" };
}

function stableRequestId(index) {
  const value = createHash("sha256").update(`roost-reference-site-mcp-guard-v1:${taskId}:${siteIds[index]}:${observationIds[index]}`).digest("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-5${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`;
}

class McpClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.buffer = "";
    this.responses = new Map();
    this.approvalOrigin = new Promise(resolve => {
      let buffer = "";
      child.stderr.on("data", chunk => {
        buffer += chunk.toString("utf8");
        const match = buffer.match(/Finding approval page: (http:\/\/127\.0\.0\.1:\d+)\//);
        if (match) resolve(match[1]);
      });
    });
    child.stdout.on("data", chunk => {
      this.buffer += chunk.toString("utf8");
      while (this.buffer.includes("\n")) {
        const index = this.buffer.indexOf("\n");
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        if (!line) continue;
        const message = JSON.parse(line);
        const resolve = this.responses.get(message.id);
        if (resolve) {
          this.responses.delete(message.id);
          resolve(message);
        }
      }
    });
  }

  request(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`MCP ${method} timed out`)), 4000);
      this.responses.set(id, message => { clearTimeout(timeout); resolve(message); });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  async pendingPage() {
    const origin = await this.approvalOrigin;
    for (let attempt = 0; attempt < 30; attempt++) {
      const page = await (await fetch(origin)).text();
      if (page.includes('name="nonce"')) return { origin, page };
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error("Expected exact approval page");
  }

  async answer(approval, decision, confirmation = null) {
    const nonce = approval.page.match(/name="nonce" value="([a-f0-9]+)"/)[1];
    const csrf = approval.page.match(/name="csrf" value="([a-f0-9]+)"/)[1];
    const digest = approval.page.match(/SHA-256: <code>([a-f0-9]{64})<\/code>/)[1];
    return fetch(`${approval.origin}/decision`, { method: "POST", headers: {
      "Content-Type": "application/x-www-form-urlencoded", Origin: approval.origin },
      body: new URLSearchParams({ nonce, csrf, confirmation: confirmation ?? digest.slice(-8), decision }) });
  }

  async close() {
    this.child.stdin.end();
    await new Promise(resolve => { if (this.child.exitCode !== null) resolve(); else this.child.once("exit", resolve); });
  }
}

async function fixture(t, handler = null) {
  const directory = await mkdtemp(join(tmpdir(), "roost-mcp-guard-"));
  const stateDirectory = join(directory, "state");
  await mkdir(stateDirectory);
  const configPath = join(directory, "guard.json");
  await writeFile(configPath, JSON.stringify({ schemaVersion: "roost-reference-site-mcp-guard-v1", taskId,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), stateDirectory,
    sites: siteIds.map((siteId, index) => ({ siteId, observationId: observationIds[index],
      siteRevision: revision, sourceReviewId: reviewIds[index], packageDigest: packageDigests[index] })) }));
  const writes = [];
  const server = createServer(async (request, response) => {
    if (request.url === "/v1/mcp/manifest") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: { tools } }));
      return;
    }
    if (request.method === "POST") {
      let text = "";
      for await (const chunk of request) text += chunk;
      writes.push({ path: request.url, text });
      if (handler?.(request, response, text)) return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ data: { id: "fixture" } }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const clients = [];
  function spawnClient() {
    const child = spawn(process.execPath, [bridge, "--require-finding-guard"], { cwd: root, stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, COMPANYCORE_BASE_URL: `http://127.0.0.1:${server.address().port}`,
        COMPANYCORE_API_KEY: "cc_fixture", COMPANYCORE_MCP_FINDING_GUARD_CONFIG: configPath } });
    const client = new McpClient(child);
    clients.push(client);
    return client;
  }
  const client = spawnClient();
  t.after(async () => {
    for (const item of clients) await item.close();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  return { client, spawnClient, writes, stateDirectory, apiOrigin: `http://127.0.0.1:${server.address().port}` };
}

function findingCall(index, body = bodyFor(index, `66666666-6666-4666-8666-66666666666${index}`)) {
  return { name: postFinding, arguments: { taskId, siteId: siteIds[index], body } };
}

test("guard exposes only task site tools, binds exact payload approval and spends each observation once", async t => {
  const { client, spawnClient, writes, stateDirectory, apiOrigin } = await fixture(t);
  const listed = await client.request("tools/list");
  assert.deepEqual(listed.result.tools.map(tool => tool.name), [getPackage, postFinding]);
  assert.match((await client.request("tools/call", { name: getSites, arguments: { taskId } })).error.message, /refused tool/);
  assert.match((await client.request("tools/call", { name: getFindings,
    arguments: { taskId, siteId: siteIds[0] } })).error.message, /refused tool/);

  const foreignTask = await client.request("tools/call", { ...findingCall(0), arguments: {
    ...findingCall(0).arguments, taskId: siteIds[0] } });
  assert.match(foreignTask.error.message, /foreign task/);
  const changed = findingCall(0, { ...bodyFor(0, "77777777-7777-4777-8777-777777777777"), packageDigest: "f".repeat(64) });
  assert.match((await client.request("tools/call", changed)).error.message, /changed or stale/);
  assert.match((await client.request("tools/call", { name: "companycore_post_other", arguments: {} })).error.message, /refused tool/);
  assert.equal(writes.length, 0);

  const declinedCall = client.request("tools/call", findingCall(0));
  const declined = await client.pendingPage();
  assert.ok(declined.page.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!declined.page.includes("<script>alert(1)</script>"));
  assert.equal((await client.answer(declined, "approve", "00000000")).status, 409);
  const csrfProbe = await fetch(`${declined.origin}/decision`, { method: "POST", headers: {
    "Content-Type": "application/x-www-form-urlencoded", Origin: "https://other.example" },
    body: new URLSearchParams({ decision: "approve" }) });
  assert.equal(csrfProbe.status, 403);
  assert.equal((await client.answer(declined, "deny")).status, 200);
  assert.match((await declinedCall).error.message, /denied or timed out/);
  assert.deepEqual(await readdir(stateDirectory), []);

  for (const index of [0, 1]) {
    const call = client.request("tools/call", findingCall(index));
    const approval = await client.pendingPage();
    const encoded = approval.page.match(/<pre>([\s\S]*?)<\/pre>/)[1];
    const shown = JSON.parse(encoded.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    assert.equal(shown.method, "POST");
    assert.equal(new URL(shown.url).pathname,
      `/v1/product-engineering/tasks/${taskId}/reference-sites/${siteIds[index]}/findings`);
    assert.equal(new URL(shown.url).origin, apiOrigin);
    assert.deepEqual(shown.body, { ...findingCall(index).arguments.body, requestId: stableRequestId(index) });
    const expectedDigest = createHash("sha256").update(JSON.stringify(shown)).digest("hex");
    assert.ok(approval.page.includes(expectedDigest));
    assert.equal((await client.answer(approval, "approve")).status, 200);
    assert.equal((await call).result.isError, false);
  }
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(write => JSON.parse(write.text)), [0, 1].map(index =>
    ({ ...findingCall(index).arguments.body, requestId: stableRequestId(index) })));
  assert.equal((await readdir(stateDirectory)).length, 2);
  assert.match((await client.request("tools/call", findingCall(0))).error.message, /slot already spent/);
  assert.equal(writes.length, 2);
  await client.close();
  const restarted = spawnClient();
  assert.match((await restarted.request("tools/call", findingCall(0))).error.message, /slot already spent/);
  assert.equal(writes.length, 2);
});

test("required-guard launcher refuses missing configuration", () => {
  const result = spawnSync(process.execPath, [bridge, "--require-finding-guard", "--print-config"], {
    cwd: root, encoding: "utf8", env: { ...process.env, COMPANYCORE_MCP_FINDING_GUARD_CONFIG: "" }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Finding guard is required/);
});

test("transport loss after reservation is uncertain and cannot replay", async t => {
  const { client, writes, stateDirectory } = await fixture(t, (_request, response) => {
    response.destroy();
    return true;
  });
  const call = client.request("tools/call", findingCall(0));
  assert.equal((await client.answer(await client.pendingPage(), "approve")).status, 200);
  const result = await call;
  assert.equal(result.result.structuredContent.error, "finding_post_outcome_uncertain");
  assert.equal(result.result.structuredContent.slotSpent, true);
  assert.equal(writes.length, 1);
  assert.equal((await readdir(stateDirectory)).length, 1);
  assert.match((await client.request("tools/call", findingCall(0))).error.message, /slot already spent/);
});

test("Finding redirect is not followed and the slot remains spent", async t => {
  const redirected = [];
  const destination = createServer(async (request, response) => {
    redirected.push(request.method);
    response.end("unexpected");
  });
  await new Promise(resolve => destination.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => destination.close(resolve)));
  const { client, writes, stateDirectory } = await fixture(t, (_request, response) => {
    response.writeHead(307, { Location: `http://127.0.0.1:${destination.address().port}/other` });
    response.end();
    return true;
  });
  const call = client.request("tools/call", findingCall(0));
  assert.equal((await client.answer(await client.pendingPage(), "approve")).status, 200);
  const result = await call;
  assert.equal(result.result.structuredContent.error, "finding_post_redirect_refused");
  assert.equal(result.result.structuredContent.slotSpent, true);
  assert.equal(writes.length, 1);
  assert.deepEqual(redirected, []);
  assert.equal((await readdir(stateDirectory)).length, 1);
  assert.match((await client.request("tools/call", findingCall(0))).error.message, /slot already spent/);
});
