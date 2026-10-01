import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { syntheticHostWorkspace } from "./fixtures/host-workspace.mjs";
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";

const workspaceRoot = process.platform === "win32" ? await syntheticHostWorkspace() : undefined;
test("Worker failed-review routing retains exact Writer/application fence and does not claim another task", {
  skip: process.platform !== "win32", timeout: 30000
}, async t => {
  const temp = await fs.realpath(os.tmpdir()), root = await fs.realpath(await fs.mkdtemp(path.join(temp, "roost-managed-failure-")));
  const f = validPacketFixture(), configPath = path.join(root, "config.json"), state = path.join(root, "state");
  await fs.mkdir(state);
  await fs.writeFile(configPath, JSON.stringify({ workspaceRoot, repositories: { demoapp: {
    directory: "DemoApp", originUrl: "https://github.com/example-org/DemoApp.git" } } }));
  let claims = 0, active;
  const failures = [];
  const server = createServer(async (req, res) => {
    let bytes = ""; for await (const chunk of req) bytes += chunk;
    const input = bytes ? JSON.parse(bytes) : {};
    const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status === 200 ? { data } : { error: data })); };
    if (req.url.endsWith("/register") || req.url.includes("/hosts/") && req.url.endsWith("/heartbeat")) return send(compatibleHostFixture());
    if (req.url.startsWith("/v1/agent-runtime/recovery?")) return send({ executionEnabled: true, executions: [] });
    if (req.url.endsWith("/claim")) {
      claims++;
      if (claims > 1) return send("unexpected_second_claim", 401);
      active = { ...f.claimed, leaseExpiresAt: new Date(Date.now() + 90000).toISOString(), checkpointVersion: 1,
        checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId,
          packetRevision: null, workspaceDigest: null } };
      return send(active);
    }
    if (req.url.includes("company-intelligence")) return send(f.taskContext);
    if (req.url.includes("product-engineering")) return send(f.applicationContext);
    if (req.url.endsWith("/heartbeat")) return send({ leaseExpiresAt: active.leaseExpiresAt });
    if (req.url.endsWith("/checkpoint")) {
      active.checkpoint = input.checkpoint; active.checkpointVersion++;
      return send({ checkpoint: active.checkpoint, checkpointVersion: active.checkpointVersion });
    }
    if (req.url.endsWith("/fail")) { failures.push(input); return send({}); }
    return send({});
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, "close"); }
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    const resolved = await fs.realpath(root), relative = path.relative(temp, resolved);
    assert.equal(resolved, root); assert.ok(!relative.startsWith("..") && !path.isAbsolute(relative));
    assert.ok(path.basename(resolved).startsWith("roost-managed-failure-"));
    await fs.rm(resolved, { recursive: true, force: false });
  });
  // Inject the observed error at the existing checkpoint hook, with an actual
  // application fence. This checks host routing; the signed-review/Job test is
  // separate and never replaced by this fault injection.
  const script = `await import('./scripts/fixtures/register-host-fixture-launch.mjs');
    const {runHost}=await import('./scripts/roost-codex-agent-host.mjs');
    const {acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');
    const {acquireApplicationLease,applicationRecoveryEvidence}=await import('./scripts/lib/agent-host-application-lease.mjs');
    const fs=await import('node:fs');let writer;
    await runHost({providerAdmissionForTest:()=>null,readTaskCommit:async()=>"a".repeat(40),
      createOutputBudget:(await import('./scripts/lib/agent-host-output-budget.mjs')).createObservedOutputBudget,
      readTaskBranch:async()=>${JSON.stringify(f.packet.contract.singleTask.branch)},
      acquireLock:async options=>(writer=await acquireWriterLock(${JSON.stringify(state)},options)),
      onCheckpoint:async(stage,execution)=>{if(stage==='prepared'){
        const app=acquireApplicationLease({writerLock:writer,applicationId:execution.applicationId,
          attempt:execution.id,runtime:{required:false,ports:[]}});
        const lease=applicationRecoveryEvidence(app);
        fs.writeFileSync(${JSON.stringify(path.join(root, "captured.json"))},JSON.stringify({
          writer:fs.readFileSync(${JSON.stringify(path.join(state, writerLockFilename))},'utf8'),lease}));
        throw Object.assign(Error('agent_native_review_blocked'),{retryable:false});}}});`;
  child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-failed-review-key", ROOST_AGENT_HOST_CONFIG: configPath } });
  let stderr = ""; child.stderr.on("data", bytes => { stderr += bytes; }); child.stdout.resume();
  const [exit] = await once(child, "close");
  assert.equal(exit, 0, stderr);
  assert.equal(claims, 1); assert.equal(failures.length, 1);
  assert.equal(failures[0].code, "agent_native_review_blocked");
  const captured = JSON.parse(await fs.readFile(path.join(root, "captured.json"), "utf8"));
  assert.equal(await fs.readFile(path.join(state, writerLockFilename), "utf8"), captured.writer);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(state, captured.lease.name), "utf8")), captured.lease.record);
  await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
});
