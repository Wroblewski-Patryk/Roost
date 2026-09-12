import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { networkInterfaces } from "node:os";
import { connect } from "node:net";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { executionContextRevision } from "./lib/agent-host-execution-context.mjs";
import { brokerFixture, initialize, request, call, canary } from "./fixtures/mcp-broker.mjs";
import { brokerContract, hermesBrokerChildEnvironment } from "./lib/agent-host-mcp-broker.mjs";
import providerContract from "./lib/agent-host-provider-contract.cjs";

async function rejected(f, message, options) {
  const response = await request(f, message, options).catch(() => null);
  if (response) {
    assert.notEqual(response.status, 200);
    const body = await response.text();
    for (const secret of [canary, f.bootstrap.mcp_servers.roost.headers.Authorization, "SENSITIVE_SENTINEL"]) assert.equal(body.includes(secret), false);
  }
  await f.broker.closed;
  assert.equal(f.broker.status().active, false);
}
test("exact synthetic flow returns pinned projections and expires the single sequence", async () => {
  assert.deepEqual(providerContract.registry.hermesPolicy.minimumTools, brokerContract.tools);
  assert.equal(providerContract.registry.brokerContract.version, brokerContract.version);
  const f = await brokerFixture();
  try {
    assert.equal(new URL(f.broker.endpoint).hostname, "127.0.0.1");
    assert.deepEqual(Object.keys(f.bootstrap.mcp_servers), ["roost"]);
    const tools = await initialize(f);
    assert.deepEqual(tools.map(t => t.name), brokerContract.tools);
    assert.ok(tools.every(t => t.annotations.readOnlyHint && !t.inputSchema.additionalProperties));
    const rediscovery = await request(f, { jsonrpc: "2.0", id: 8, method: "tools/list" });
    assert.deepEqual((await rediscovery.json()).result.tools, tools);
    const first = await request(f, call(f)), packet = JSON.parse((await first.json()).result.content[0].text);
    assert.deepEqual(packet, f.packet);
    const second = await request(f, call(f, 1, 4)), application = JSON.parse((await second.json()).result.content[0].text);
    assert.deepEqual(application, f.applicationContext);
    await f.broker.closed; assert.equal(f.broker.status().reason, "broker_sequence_complete");
    assert.equal(f.reads.length, 6); assert.ok(f.reads.every(r => r.method === "GET" && r.cache === "no-store"));
    const publicOutput = JSON.stringify({ packet, application, tools, status: f.broker.status() });
    for (const secret of [canary, f.claimed.leaseToken, f.bootstrap.mcp_servers.roost.headers.Authorization]) assert.equal(publicOutput.includes(secret), false);
    await assert.rejects(request(f, call(f, 1, 9)));
  } finally { await f.close(); }
});
for (const [name, change] of [
  ["observer", f => { f.input.config.executionMode = "observe"; }],
  ["runtime disabled", f => { f.input.runtime.executionEnabled = false; }],
  ["protocol mismatch", f => { f.input.runtime.protocol.version = 99; }],
  ["lease expired", f => { f.input.lease = { remainingMs: 0 }; }],
  ["duration expired", f => { f.input.duration = { remainingMs: 0 }; }],
  ["output budget unavailable", f => { f.input.outputBudget.assertWithinBudget = () => { throw Error(canary); }; }],
  ["writer/path boundary", f => { f.input.assertTaskBoundary = () => { throw Error(canary); }; }],
  ["wrong checkpoint", f => { f.claimed.checkpoint.contextRevision = "f".repeat(64); }],
  ["Ready invalidated", f => { f.taskContext.readyAdmission.status = "invalidated"; }],
  ["provider unproven", f => { delete f.dependencies.providerAdmission; }],
  ["attestation absent", f => { f.dependencies.inspectProvider = async () => ({ kind: "hermes_codex" }); }],
  ["stale attestation", f => { f.dependencies.inspectProvider = async () => ({ kind: "hermes_codex", installation: { status: "verified", checkedAt: "2000-01-01" } }); }],
  ["context canary", f => { f.taskContext.task.description = canary; }]
]) test(`no listener/bootstrap before ${name} gate passes`, async () => {
  await assert.rejects(brokerFixture(change), e => e.message === "broker_admission_blocked" && !JSON.stringify(e).includes(canary));
});
for (const [name, mutate, options] of [
  ["missing token", null, { headers: { Authorization: "" } }],
  ["wrong token", null, { headers: { Authorization: `Bearer ${"a".repeat(43)}` } }],
  ["wrong method", null, { method: "GET" }],
  ["wrong content type", null, { headers: { "Content-Type": "text/plain" } }],
  ["browser origin", null, { headers: { Origin: "https://example.invalid" } }],
  ["DNS rebinding host", null, { headers: { Host: "example.invalid" } }],
  ["wrong protocol", null, { headers: { "MCP-Protocol-Version": "1900-01-01" } }],
  ["URL input", m => { m.params.arguments.url = "http://example.invalid/SENSITIVE_SENTINEL"; }],
  ["path input", m => { m.params.arguments.path = "../SENSITIVE_SENTINEL"; }],
  ["SQL input", m => { m.params.arguments.sql = "DELETE FROM tasks"; }],
  ["write tool", m => { m.params.name = "companycore_post_tasks"; }],
  ["terminal", m => { m.params.name = "terminal"; }],
  ["prompts", m => { m.method = "prompts/list"; }],
  ["resources", m => { m.method = "resources/read"; }],
  ["sampling", m => { m.method = "sampling/createMessage"; }],
  ["extra schema field", m => { m.SENSITIVE_SENTINEL = canary; }],
  ["reflective request id", m => { m.id = canary; }],
  ["replayed request id", m => { m.id = 2; }],
  ["out of order tool", m => { m.params.name = brokerContract.tools[1]; }],
  ...["executionId", "workspaceId", "taskId", "applicationId"].map(key => [key, m => { m.params.arguments[key] = "ffffffff-ffff-4fff-8fff-ffffffffffff"; }]),
  ["attempt", m => { m.params.arguments.attempt = 2; }],
  ["packet revision", m => { m.params.arguments.packetRevision = "f".repeat(64); }],
  ["context revision", m => { m.params.arguments.contextRevision = "f".repeat(64); }],
  ["oversized request", m => { m.params.arguments.extra = "x".repeat(brokerContract.maxRequestBytes); }]
]) test(`broker denies ${name} and revokes the attempt`, async () => {
  const f = await brokerFixture();
  try { await initialize(f); const m = call(f); mutate?.(m); const count = f.reads.length; await rejected(f, m, options); assert.equal(f.reads.length, count); }
  finally { await f.close(); }
});
test("a completed tool cannot be replayed; discovery has a fixed budget", async () => {
  for (const kind of ["tool", "list"]) {
    const f = await brokerFixture();
    try {
      await initialize(f);
      if (kind === "tool") { await (await request(f, call(f))).arrayBuffer(); await rejected(f, call(f, 0, 4)); }
      else { await (await request(f, { jsonrpc: "2.0", id: 4, method: "tools/list" })).arrayBuffer(); await rejected(f, { jsonrpc: "2.0", id: 5, method: "tools/list" }); }
    } finally { await f.close(); }
  }
});
test("parallel calls revoke the broker and discard the first pending response", async () => {
  const f = await brokerFixture(); let release;
  try {
    await initialize(f);
    f.input.api = () => new Promise(resolve => { release = resolve; });
    const pending = request(f, call(f)).catch(() => null);
    while (!release) await new Promise(resolve => setTimeout(resolve, 5));
    await rejected(f, call(f, 1, 4)); release(f.taskContext);
    const response = await pending; if (response) assert.notEqual(response.status, 200);
  } finally { await f.close(); }
});
for (const name of ["lease loss", "cancel", "context invalidation", "worker stop"]) test(`${name} revokes before another read`, async () => {
  const f = await brokerFixture();
  try {
    await initialize(f);
    if (name === "lease loss") f.lease.reject({ status: 403 });
    else if (name === "worker stop") await f.broker.stop();
    else f.abort.abort();
    await f.broker.closed; await assert.rejects(request(f, call(f))); assert.equal(f.reads.length, 2);
  } finally { await f.close(); }
});
test("changed canonical context and upstream secrets never reach the client", async () => {
  for (const value of ["changed context", canary]) {
    const f = await brokerFixture();
    try { await initialize(f); f.taskContext.task.description = value; await rejected(f, call(f)); }
    finally { await f.close(); }
  }
});
test("redaction stops task canaries before deriving the application API query", async () => {
  const f = await brokerFixture();
  try {
    await initialize(f); const count = f.reads.length;
    f.taskContext.task.title = canary;
    await rejected(f, call(f)); assert.equal(f.reads.length, count + 1);
  } finally { await f.close(); }
});
test("TTL expires while idle and pending upstream calls have a separate deadline", async () => {
  let offset = 0;
  const f = await brokerFixture(f => { f.dependencies.now = () => performance.now() + offset; });
  try { await initialize(f); offset = 31000; await rejected(f, call(f)); }
  finally { await f.close(); }
  const pending = await brokerFixture();
  try { await initialize(pending); pending.input.api = () => new Promise(() => {}); await rejected(pending, call(pending)); }
  finally { await pending.close(); }
});
test("bootstrap is delivered once through stdin; child env and argv cannot inherit Worker secrets", async () => {
  const env = hermesBrokerChildEnvironment({ SystemRoot: "C:\\Windows", ROOST_AGENT_API_KEY: canary, OPENAI_API_KEY: canary,
    PATH: canary, USERPROFILE: canary, PYTHONPATH: canary, HERMES_CONFIG: canary, NODE_OPTIONS: canary });
  assert.equal(JSON.stringify(env).includes(canary), false);
  const f = await brokerFixture();
  try {
    const serialized = JSON.stringify(f.broker); assert.equal(serialized.includes(canary), false);
    assert.equal(serialized.includes(f.bootstrap.mcp_servers.roost.headers.Authorization), false);
    assert.throws(() => f.broker.deliverClientBootstrap(new Writable({ write(_c, _e, done) { done(); } })), /broker_bootstrap_failed/);
    await f.broker.closed;
  } finally { await f.close(); }
});
test("Worker process crash drops the port and restart cannot reuse the prior capability", async () => {
  const script = `import{brokerFixture}from'./scripts/fixtures/mcp-broker.mjs';const f=await brokerFixture();process.send({endpoint:f.broker.endpoint,bootstrap:f.bootstrap});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, env: hermesBrokerChildEnvironment(), stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let output = ""; child.stdout.on("data", b => output += b); child.stderr.on("data", b => output += b);
  try {
    const [old] = await once(child, "message"); child.kill(); await once(child, "close");
    await assert.rejects(fetch(old.endpoint, { signal: AbortSignal.timeout(1000) }));
    const f = await brokerFixture();
    try { await initialize(f); await rejected(f, call(f), { headers: { Authorization: old.bootstrap.mcp_servers.roost.headers.Authorization } }); }
    finally { await f.close(); }
    assert.equal(output, "");
  } finally { if (child.exitCode === null) child.kill(); }
});
test("loopback listener rejects connections through external interfaces", async t => {
  const address = Object.values(networkInterfaces()).flat().find(a => a.family === "IPv4" && !a.internal)?.address;
  if (!address) return t.skip("No external IPv4 interface on this test host");
  const f = await brokerFixture();
  try {
    await new Promise((resolve, reject) => {
      const socket = connect({ host: address, port: Number(new URL(f.broker.endpoint).port) });
      socket.setTimeout(500, () => { socket.destroy(); resolve(); });
      socket.once("error", () => resolve()); socket.once("connect", () => { socket.destroy(); reject(Error("external_listener_exposed")); });
    });
  } finally { await f.close(); }
});
test("idle broker closes before the shorter lease or duration deadline", async () => {
  for (const key of ["lease", "duration"]) {
    const f = await brokerFixture(f => { Object.defineProperty(f.input[key], "remainingMs", { get: () => 5200 }); });
    try {
      assert.ok(Date.parse(f.bootstrap.expiresAt) - Date.now() < 201);
      await f.broker.closed; assert.equal(f.broker.status().reason, "broker_expired");
      await assert.rejects(request(f, call(f)));
    } finally { await f.close(); }
  }
});
test("oversized approved response is blocked rather than truncated", async () => {
  const f = await brokerFixture(f => {
    f.applicationContext.syntheticEvidence = { text: '"'.repeat(40000) };
    pinReadyFixture(f);
    f.input.contextRevision = executionContextRevision(f.taskContext, f.applicationContext);
    f.input.packetRevision = f.packet.revision;
    f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: f.packet.revision, contextRevision: f.input.contextRevision };
  });
  try { await initialize(f); await (await request(f, call(f))).arrayBuffer(); await rejected(f, call(f, 1, 4)); }
  finally { await f.close(); }
});
test("fake Hermes process receives only memory bootstrap and performs the complete MCP flow", async () => {
  const f = await brokerFixture();
  const script = `let text='';for await(const b of process.stdin)text+=b;const c=JSON.parse(text),s=c.mcp_servers.roost;const q=async m=>{const r=await fetch(s.url,{method:'POST',headers:{...s.headers,Accept:'application/json, text/event-stream','Content-Type':'application/json','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify(m)});if(![200,202].includes(r.status))throw Error('fixture_failed');return r.status===202?null:r.json()};await q({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'fake-hermes',version:'1'}}});await q({jsonrpc:'2.0',method:'notifications/initialized'});await q({jsonrpc:'2.0',id:2,method:'tools/list'});for(let i=0;i<2;i++)await q({jsonrpc:'2.0',id:3+i,method:'tools/call',params:{name:s.tools[i],arguments:c.scope}});console.log(JSON.stringify({complete:true,workerKeyPresent:!!process.env.ROOST_AGENT_API_KEY,capabilityInEnv:JSON.stringify(process.env).includes(s.headers.Authorization.slice(7)),capabilityInArgv:JSON.stringify(process.argv).includes(s.headers.Authorization.slice(7))}));`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true,
    env: hermesBrokerChildEnvironment({ ...process.env, ROOST_AGENT_API_KEY: canary, OPENAI_API_KEY: canary }), stdio: ["pipe", "pipe", "pipe"] });
  let output = "", errors = ""; child.stdout.on("data", b => output += b); child.stderr.on("data", b => errors += b);
  try {
    assert.equal(JSON.stringify(child.spawnargs).includes(canary), false);
    child.stdin.end(JSON.stringify(f.bootstrap)); await once(child, "close");
    assert.equal(child.exitCode, 0); assert.equal(errors, "");
    assert.deepEqual(JSON.parse(output), { complete: true, workerKeyPresent: false, capabilityInEnv: false, capabilityInArgv: false });
    await f.broker.closed;
  } finally { if (child.exitCode === null) child.kill(); await f.close(); }
});
