import { strict as assert } from "node:assert";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyRecovery, assertRecoverySnapshot } from "./lib/agent-host-recovery.mjs";
import { recoveryLockFilename, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";

for (const [stage, expected] of [["claimed", "restart_same_attempt"], ["prepared", "resume_from_checkpoint"], ["spawn_intent", "process_may_be_running"], ["running", "process_may_be_running"], ["effect_possible", "effect_may_have_occurred"]]) test(`classifies ${stage}`, () => {
  const execution = { leaseExpiresAt: new Date(Date.now() + 90000).toISOString(), checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage, packetRevision: stage === "claimed" ? null : "a".repeat(64), workspaceDigest: stage === "claimed" ? null : "b".repeat(64) } };
  if (stage === "claimed" || stage === "prepared") assert.equal(classifyRecovery(execution, true), expected);
  else assert.throws(() => classifyRecovery(execution, true), (error) => error.recoveryReason === expected);
  execution.leaseExpiresAt = new Date(0).toISOString();
  assert.throws(() => classifyRecovery(execution, true), (error) => error.recoveryReason === "lease_expired");
});
test("changed packet/workspace and a disabled runtime stop recovery", () => {
  assert.throws(() => classifyRecovery({}, false), (error) => error.recoveryReason === "runtime_disabled");
  assert.throws(() => assertRecoverySnapshot({ stage: "prepared", packetRevision: "old" }, "new", "same"), (error) => error.recoveryReason === "packet_changed");
  assert.throws(() => assertRecoverySnapshot({ stage: "prepared", packetRevision: "same", workspaceDigest: "old" }, "same", "new"), (error) => error.recoveryReason === "workspace_changed");
});

async function harness(t, stopStage) {
  const f = validPacketFixture();
  let active = null, finished = false, claimCount = 0, recoverCount = 0;
  const reports = [], modes = [], childPids = [];
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-recovery-test-"));
  const configPath = path.join(directory, "config.json");
  const config = { workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje", codexCommand: "recovery-test-codex", repositories: { roost: { directory: "Roost", originUrl: "https://github.com/Wroblewski-Patryk/Roost.git" } } };
  await writeFile(configPath, JSON.stringify(config));
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : {};
    const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(status === 200 ? { data } : { error: data })); };
    if (req.url.startsWith("/v1/agent-runtime/recovery?")) return send({ executionEnabled: true, executions: active && !finished ? [active] : [] });
    if (req.url.endsWith("/register")) return send({ id: "host", name: "fixture" });
    if (req.url.endsWith("/claim")) {
      if (finished || active) return send("fixture_finished", 401);
      claimCount++;
      active = { ...f.claimed, leaseExpiresAt: new Date(Date.now() + 90000).toISOString(), checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId, packetRevision: null, workspaceDigest: null } };
      return send(active);
    }
    if (req.url.includes("company-intelligence")) return send(f.taskContext);
    if (req.url.includes("product-engineering")) return send(f.applicationContext);
    if (req.url.endsWith("/heartbeat")) return send({ leaseExpiresAt: active.leaseExpiresAt });
    if (req.url.endsWith("/checkpoint")) {
      if (active.checkpointVersion !== input.expectedVersion) return send("agent_checkpoint_conflict", 409);
      active.checkpoint = input.checkpoint; active.checkpointVersion++;
      return send({ checkpoint: active.checkpoint, checkpointVersion: active.checkpointVersion });
    }
    if (req.url.endsWith("/recover")) {
      if (active.checkpointVersion !== input.expectedVersion) return send("agent_recovery_conflict", 409);
      recoverCount++; modes.push(active.checkpoint.stage);
      active = { ...active, checkpointVersion: active.checkpointVersion + 1, checkpoint: { ...active.checkpoint, sessionId: input.sessionId }, leaseToken: "00000000-0000-4000-8000-000000000099" };
      return send(active);
    }
    if (req.url.endsWith("/recovery-blocked")) { reports.push(input); return send({}); }
    if (req.url.endsWith("/complete")) { assert.equal(input.leaseToken, active.leaseToken); finished = true; return send({}); }
    if (req.url.endsWith("/fail")) { reports.push(input); finished = true; return send({}); }
    return send({});
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const processes = [];
  t.after(async () => {
    for (const child of processes) if (child.exitCode === null && child.signalCode === null) child.kill();
    for (const pid of childPids) await new Promise((resolve) => execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => resolve()));
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
    for (const filename of [configPath, path.join(directory, writerLockFilename), path.join(directory, recoveryLockFilename)]) await unlink(filename).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  });
  async function run(stop) {
    const fake = `process.stdin.resume(); process.stdin.on('end',()=>{console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'synthetic command',status:'completed',exit_code:0}}));console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Recovered fixture complete'}}));});`;
    const script = `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; const original=cp.spawn; cp.spawn=(command,args,options)=>{if(command!=='recovery-test-codex')return original(command,args,options); const child=original(process.execPath,['-e',${JSON.stringify(fake)}],options); process.stdout.write('FAKE_PID:'+child.pid+'\\n');return child;};syncBuiltinESMExports();const {runHost}=await import('./scripts/roost-codex-agent-host.mjs');const {acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');await runHost({acquireLock:(options)=>acquireWriterLock(${JSON.stringify(directory)},options),onCheckpoint:async(stage)=>{if(stage===${JSON.stringify(stop || "never")})process.exit(73);}});`;
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-recovery-key", ROOST_AGENT_HOST_CONFIG: configPath } });
    processes.push(child); let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
    const [code] = await once(child, "close");
    const pids = [...stdout.matchAll(/FAKE_PID:(\d+)/g)].map((match) => Number(match[1])); childPids.push(...pids);
    return { code, spawned: pids.length, stderr };
  }
  const first = await run(stopStage);
  assert.equal(first.code, 73, first.stderr);
  const local = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
  assert.equal(local.checkpoint.stage, stopStage);
  assert.equal(JSON.stringify(local).includes(f.claimed.leaseToken), false);
  assert.equal(JSON.stringify(local).includes("synthetic-recovery-key"), false);
  return { f, config, configPath, directory, first, run, reports, modes, get active() { return active; }, get claimCount() { return claimCount; }, get recoverCount() { return recoverCount; }, get finished() { return finished; } };
}

for (const stage of ["claimed", "prepared"]) test(`process restart resumes the same execution/attempt from ${stage} exactly once`, { skip: process.platform !== "win32", timeout: 20000 }, async (t) => {
  const h = await harness(t, stage), identity = h.active.id, attempt = h.active.attempt;
  const results = await Promise.all([h.run(), h.run()]);
  assert.equal(results.filter((result) => result.code === 0).length, 1, JSON.stringify(results));
  assert.equal(results.reduce((count, result) => count + result.spawned, 0), 1);
  assert.equal(h.first.spawned, 0); assert.equal(h.claimCount, 1); assert.equal(h.recoverCount, 1);
  assert.equal(h.active.id, identity); assert.equal(h.active.attempt, attempt); assert.equal(h.finished, true);
  assert.deepEqual(h.modes, [stage]);
});
for (const stage of ["spawn_intent", "running", "effect_possible"]) test(`restart never replays ${stage}`, { skip: process.platform !== "win32", timeout: 15000 }, async (t) => {
  const h = await harness(t, stage); const restarted = await h.run();
  assert.equal(restarted.code, 1); assert.equal(restarted.spawned, 0); assert.equal(h.recoverCount, 0); assert.equal(h.finished, false);
  assert.equal(h.reports.at(-1).reason, stage === "effect_possible" ? "effect_may_have_occurred" : "process_may_be_running");
});
for (const reason of ["lease_expired", "packet_changed", "repository_mismatch", "sandbox_invalid", "writer_locked"]) test(`restart stops on ${reason}`, { skip: process.platform !== "win32", timeout: 15000 }, async (t) => {
  const h = await harness(t, "prepared");
  if (reason === "lease_expired") h.active.leaseExpiresAt = new Date(0).toISOString();
  if (reason === "packet_changed") { h.f.packet.contract.version = "2"; sealPacket(h.f.packet); }
  if (reason === "repository_mismatch") { h.config.repositories.roost.originUrl = "https://github.com/example/other.git"; await writeFile(h.configPath, JSON.stringify(h.config)); }
  if (reason === "sandbox_invalid") { h.config.sandbox = "danger-full-access"; await writeFile(h.configPath, JSON.stringify(h.config)); }
  if (reason === "writer_locked") { const lockPath = path.join(h.directory, writerLockFilename); const record = JSON.parse(await readFile(lockPath, "utf8")); record.ownerPid = process.pid; await writeFile(lockPath, JSON.stringify(record)); }
  const restarted = await h.run(); assert.equal(restarted.code, 1); assert.equal(restarted.spawned, 0); assert.equal(h.finished, false);
  assert.equal(h.reports.at(-1).reason, reason);
});
