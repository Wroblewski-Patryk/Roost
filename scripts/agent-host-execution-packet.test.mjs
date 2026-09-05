import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";

const validate = (f) => validateExecutionPacket(f.packet, f.claimed, f.taskContext, f.applicationContext);
test("a complete packet passes without changing its contents", () => {
  const f = validPacketFixture(); const before = JSON.stringify(f);
  assert.equal(validate(f), f.packet); assert.equal(JSON.stringify(f), before);
});

for (const category of ["version", "objective", "scope", "assignment", "context", "procedures", "skills", "access", "dependencies", "decisions", "budgets", "acceptance", "recovery"]) {
  test(`missing ${category} is rejected with a safe field diagnostic`, () => {
    const f = validPacketFixture(); delete f.packet.contract[category]; sealPacket(f.packet);
    assert.throws(() => validate(f), (error) => error.message === "execution_packet_invalid" && error.retryable === false && error.details.issues.some((issue) => issue.field === `contract.${category}` && issue.reason === "missing"));
  });
}

const contradictions = {
  identity: (f) => { f.packet.identity.taskId = f.claimed.id; },
  workspace: (f) => { f.applicationContext.application.workspaceId = f.claimed.id; },
  project: (f) => { f.applicationContext.operatingModel.projects = []; },
  repository: (f) => { f.applicationContext.application = { ...f.claimed.application, repositories: [{ url: "https://github.com/example/wrong.git" }] }; },
  goal: (f) => { f.packet.contract.objective.goalId = f.claimed.id; },
  role: (f) => { f.packet.contract.assignment.role = "sales"; },
  competencies: (f) => { f.packet.contract.assignment.competencies = ["missing"]; },
  inactiveAgent: (f) => { f.taskContext.task.assignedWorkforceEntity.status = "paused"; },
  tools: (f) => { f.taskContext.task.assignedWorkforceEntity.toolIndex = []; },
  permissions: (f) => { f.taskContext.task.assignedWorkforceEntity.authorityScope = []; },
  sandbox: (f) => { f.packet.contract.access.sandbox = "danger-full-access"; },
  externalWrites: (f) => { f.packet.contract.access.externalWrites = true; },
  scope: (f) => { f.packet.contract.scope.forbidden = f.packet.contract.scope.allowed; },
  rollback: (f) => { f.packet.contract.recovery.rollback.mode = "not_applicable"; },
  attempts: (f) => { f.claimed.attempt = 2; },
  budgets: (f) => { f.packet.contract.budgets.maxDurationSeconds = -1; },
  taskRevision: (f) => { f.taskContext.task.updatedAt = "changed"; },
  missingSource: (f) => { f.packet.sources = []; },
  emptySource: (f) => { f.packet.sources[0].description = null; },
  sourceRevision: (f) => { f.packet.sources[0].revision = "changed"; },
  foreignSource: (f) => { f.packet.sources[2].applicationId = f.claimed.id; },
  missingProcedure: (f) => { f.applicationContext.operatingModel.applicationProcedures = [{ procedureId: f.claimed.id }]; },
  missingDependency: (f) => { f.taskContext.dependencies = [{ id: f.claimed.id }]; },
  missingDependencyContext: (f) => { delete f.taskContext.dependencies; },
  unapprovedDecision: (f) => { f.taskContext.decisions = [{ id: f.claimed.id, workspaceId: f.claimed.workspaceId, updatedAt: "v1", status: "draft" }]; f.packet.contract.decisions = { items: [{ id: f.claimed.id, revision: "v1" }], noneReason: null }; },
  omittedDecision: (f) => { f.taskContext.decisions = [{ id: f.claimed.id, status: "approved" }]; },
  unversionedSkill: (f) => { f.packet.contract.skills = { items: [{ name: "javascript", version: "1" }], noneReason: null }; },
  ambiguousNone: (f) => { f.packet.contract.procedures.noneReason = null; },
  schema: (f) => { f.packet.schemaVersion = "future"; }
};
for (const [name, mutate] of Object.entries(contradictions)) test(`rejects inconsistent ${name}`, () => {
  const f = validPacketFixture(); mutate(f); sealPacket(f.packet); assert.throws(() => validate(f), /execution_packet_invalid/);
});

test("packet content mutation invalidates its revision", () => {
  const f = validPacketFixture(); f.packet.contract.objective.outcome = "Changed after preparation";
  assert.throws(() => validate(f), (error) => error.details.issues.some((issue) => issue.field === "revision"));
});
for (const field of ["identity", "taskRevision", "schemaVersion", "contract.context.company", "contract.context.product", "contract.context.technical", "contract.acceptance.tests", "contract.acceptance.evidence", "contract.recovery.escalation"]) test(`rejects missing ${field}`, () => {
  const f = validPacketFixture(), parts = field.split(".");
  const target = parts.slice(0, -1).reduce((value, key) => value[key], f.packet);
  delete target[parts.at(-1)]; sealPacket(f.packet); assert.throws(() => validate(f), /execution_packet_invalid/);
});
test("versioned procedures, skills, reviewed dependencies and approved decisions pass", () => {
  const f = validPacketFixture(), id = f.claimed.id, workspaceId = f.claimed.workspaceId;
  f.packet.contract.procedures = { items: [{ id, revision: "2" }], noneReason: null };
  f.taskContext.procedures = [{ id, workspaceId, version: 2, status: "active" }];
  f.applicationContext.operatingModel.applicationProcedures = [{ procedureId: id }];
  f.packet.contract.skills = { items: [{ name: "testing", version: "1" }], noneReason: null };
  f.taskContext.task.assignedWorkforceEntity.skillIndex.push("testing@1");
  f.packet.contract.dependencies = { items: [{ id, revision: "v1", resolution: "satisfied", evidence: "Verified local fixture" }], noneReason: null };
  f.taskContext.dependencies = [{ id, workspaceId, updatedAt: "v1", status: "resolved" }];
  f.packet.contract.decisions = { items: [{ id, revision: "v1" }], noneReason: null };
  f.taskContext.decisions = [{ id, workspaceId, updatedAt: "v1", status: "approved" }];
  sealPacket(f.packet); assert.equal(validate(f), f.packet);
  f.taskContext.dependencies[0].status = "blocked";
  assert.throws(() => validate(f), (error) => error.details.issues.some((issue) => issue.field === "contract.dependencies" && issue.reason === "blocked"));
});
test("diagnostics never echo values, unknown keys, source contents or lease secrets", () => {
  const f = validPacketFixture(); const secret = "SYNTHETIC_SECRET_DO_NOT_ECHO";
  f.packet.contract.access.tools = [secret]; f.packet.contract[secret] = secret;
  f.packet.sources[0].description = secret; f.packet.identity.workspaceId = secret; f.claimed.leaseToken = secret;
  sealPacket(f.packet);
  assert.throws(() => validate(f), (error) => {
    assert.equal(JSON.stringify({ message: error.publicMessage, details: error.details, stack: error.stack }).includes(secret), false);
    return error.details.issues.length > 0;
  });
});

for (const valid of [false, true]) test(`real host ${valid ? "executes a valid packet with the existing completion flow" : "reports an invalid packet before any execution subprocess"}`, { skip: process.platform !== "win32", timeout: 20000 }, async () => {
  const f = validPacketFixture();
  if (!valid) { delete f.packet.contract.acceptance; sealPacket(f.packet); }
  const requests = []; let finished = false;
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    requests.push({ url: req.url, body: body ? JSON.parse(body) : null });
    res.setHeader("Content-Type", "application/json");
    if (req.url.endsWith("/claim") && finished) { res.writeHead(401); res.end('{"error":"test_finished"}'); return; }
    let data = {};
    if (req.url.startsWith("/v1/agent-runtime/recovery?")) data = { executions: [], executionEnabled: true };
    if (req.url.endsWith("/register")) data = { id: "host", name: "fixture" };
    if (req.url.endsWith("/claim")) data = { ...f.claimed, checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: JSON.parse(body).sessionId, packetRevision: null, workspaceDigest: null } };
    if (req.url.endsWith("/checkpoint")) { const input = JSON.parse(body); data = { checkpoint: input.checkpoint, checkpointVersion: input.expectedVersion + 1 }; }
    if (req.url.includes("company-intelligence")) data = f.taskContext;
    if (req.url.includes("product-engineering")) data = f.applicationContext;
    if (req.url.endsWith("/heartbeat")) data = { leaseExpiresAt: new Date(Date.now() + 90000).toISOString() };
    if (/actions\/(fail|complete)$/.test(req.url)) finished = true;
    res.end(JSON.stringify({ data }));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const directory = await mkdtemp(path.join(process.cwd(), "scripts", ".packet-test-"));
  const configPath = path.join(directory, "config.json"); let host;
  try {
    await writeFile(configPath, JSON.stringify({ workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje", codexCommand: "packet-test-codex", repositories: { roost: { directory: "Roost", originUrl: "https://github.com/Wroblewski-Patryk/Roost.git" } } }));
    const fakeCodex = `let input=''; process.stdin.on('data', c=>input+=c); process.stdin.on('end',()=>{ if(!input.includes('roost-execution-packet-v1')) process.exit(2); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Synthetic packet execution complete'}})); });`;
    const script = `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; const original=cp.spawn; cp.spawn=(command,args,options)=>{ process.stdout.write('SPAWN:'+command+'\\n'); return command==='packet-test-codex' ? original(process.execPath,['-e',${JSON.stringify(fakeCodex)}],options) : original(command,args,options); }; syncBuiltinESMExports(); const {runHost}=await import('./scripts/roost-codex-agent-host.mjs'); const {acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs'); await runHost({acquireLock:()=>acquireWriterLock(${JSON.stringify(directory)})});`;
    host = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-only", ROOST_AGENT_HOST_CONFIG: configPath } });
    let output = "", errors = ""; host.stdout.on("data", (chunk) => { output += chunk; }); host.stderr.on("data", (chunk) => { errors += chunk; });
    assert.equal((await once(host, "close"))[0], 0, errors);
    const afterClaim = output.slice(output.indexOf("Claimed "));
    assert.equal(afterClaim.includes("SPAWN:"), valid);
    const terminal = requests.find((request) => /actions\/(fail|complete)$/.test(request.url));
    assert.ok(terminal);
    assert.ok(requests.findIndex((request) => request.url.endsWith("/heartbeat")) < requests.indexOf(terminal));
    if (valid) { assert.ok(terminal.url.endsWith("/complete")); assert.equal(terminal.body.summary, "Synthetic packet execution complete"); }
    else { assert.equal(terminal.body.code, "execution_packet_invalid"); assert.equal(terminal.body.retryable, false); assert.ok(terminal.body.details.issues.some((issue) => issue.field === "contract.acceptance")); assert.equal(requests.some((request) => request.url.endsWith("/events")), false); }
  } finally {
    if (host && host.exitCode === null && host.signalCode === null) await terminateWindowsProcessTree(host);
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    for (const file of [configPath, path.join(directory, writerLockFilename)]) await unlink(file).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  }
});
