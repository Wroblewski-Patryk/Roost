import { syntheticHostWorkspace } from "./fixtures/host-workspace.mjs";
const hostWorkspace = process.platform === "win32" ? await syntheticHostWorkspace() : undefined;
import assert from "node:assert/strict";
import test from "node:test";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import { validPacketFixture, sealPacket, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";

const scenarios = ["unsupported", "missing", "zero", "negative", "tooLarge", "beforeSpawn", "afterSpawn", "invalidUsage", "valid", "reportUnavailable", "recoverClaimed", "recoverPrepared"];
for (const scenario of scenarios) test(`output budget process containment: ${scenario}`, { skip: process.platform !== "win32", timeout: 20000 }, async () => {
  const f = validPacketFixture(); f.packet.contract.budgets.maxOutputTokens = 128;
  const invalid = ["missing", "zero", "negative", "tooLarge"].includes(scenario);
  if (scenario === "missing") delete f.packet.contract.budgets.maxOutputTokens;
  if (scenario === "zero") f.packet.contract.budgets.maxOutputTokens = 0;
  if (scenario === "negative") f.packet.contract.budgets.maxOutputTokens = -1;
  if (scenario === "tooLarge") f.packet.contract.budgets.maxOutputTokens = 100001;
  sealPacket(f.packet); pinReadyFixture(f);
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-output-budget-"));
  const configPath = path.join(directory, "config.json"), requests = [], processes = [], processIds = [];
  let active, finished = false, stopCalls = 0;
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : {};
    requests.push({ url: req.url, input });
    const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(status === 200 ? { data } : { error: data })); };
    if (req.url.endsWith("/register") || req.url === "/v1/agent-runtime/hosts/host/heartbeat") return send(compatibleHostFixture());
    if (req.url.includes("/recovery?")) return send({ executionEnabled: true, executions: active && !finished ? [active] : [] });
    if (req.url.endsWith("/claim")) {
      if (active) return send("fixture_finished", 401);
      active = { ...f.claimed, startedAt: new Date().toISOString(), leaseExpiresAt: new Date(Date.now() + 90000).toISOString(),
        checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId, packetRevision: null, workspaceDigest: null } };
      return send(active);
    }
    if (req.url.endsWith("/recover")) {
      active.checkpointVersion++; active.checkpoint.sessionId = input.sessionId;
      active.leaseToken = "00000000-0000-4000-8000-000000000099";
      return send(active);
    }
    if (req.url.includes("company-intelligence")) return send(f.taskContext);
    if (req.url.includes("product-engineering")) return send(f.applicationContext);
    if (req.url.endsWith("/heartbeat")) return send({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() });
    if (req.url.endsWith("/checkpoint")) {
      active.checkpoint = input.checkpoint; active.checkpointVersion = input.expectedVersion + 1;
      return send({ checkpoint: active.checkpoint, checkpointVersion: active.checkpointVersion });
    }
    if (req.url.endsWith("/fail") && scenario === "reportUnavailable") return send("fixture_unavailable", 503);
    if (/actions\/(fail|complete)$/.test(req.url)) finished = true;
    return send({});
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  async function run(stopStage) {
    const synthetic = stopStage === "prepared" || ["beforeSpawn", "afterSpawn", "invalidUsage", "valid", "reportUnavailable"].includes(scenario);
    const usage = scenario === "valid" ? { output_tokens: 40 } : scenario === "invalidUsage" ? { output_tokens: "SYNTHETIC_SECRET_USAGE" } : { output_tokens: 128 };
    const fake = `const cp=require('node:child_process');process.stdin.resume();process.stdin.on('end',()=>{${scenario !== "valid" ? "const child=cp.spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});console.error('DESCENDANT:'+child.pid);" : ""}setTimeout(()=>{console.log(JSON.stringify({type:'turn.completed',usage:${JSON.stringify(usage)}}));console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'SYNTHETIC_SECRET_LATE_SUCCESS'}}));},50);${scenario !== "valid" ? "setInterval(()=>{},1000);" : ""}});`;
    const factory = synthetic ? `createOutputBudget:options=>{const budget=createObservedOutputBudget(options);${scenario === "beforeSpawn" ? "budget.observeUsage({output_tokens:128});" : ""}return budget;},` : "";
    const script = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';const original=cp.spawn;cp.spawn=(command,args,options)=>{if(command==='output-budget-fixture'){const c=original(process.execPath,['-e',${JSON.stringify(fake)}],options);console.log('WORKER:'+c.pid);c.stderr.on('data',d=>process.stdout.write(d));return c;}if(command==='taskkill.exe')console.log('TREE_STOP');return original(command,args,options);};syncBuiltinESMExports();const{runHost}=await import('./scripts/roost-codex-agent-host.mjs');const{acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');const{createObservedOutputBudget}=await import('./scripts/lib/agent-host-output-budget.mjs');await runHost({readTaskCommit:async()=>"a".repeat(40),readTaskBranch:async()=>${JSON.stringify(f.packet.contract.singleTask.branch)},${factory}acquireLock:options=>acquireWriterLock(${JSON.stringify(directory)},options),onCheckpoint:stage=>{if(stage===${JSON.stringify(stopStage)})process.exit(73);}});`;
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-output-budget-key", ROOST_AGENT_HOST_CONFIG: configPath } });
    processes.push(child); let stdout = "", stderr = "";
    child.stdout.on("data", c => stdout += c); child.stderr.on("data", c => stderr += c);
    const [code] = await once(child, "close");
    stopCalls += (stdout.match(/TREE_STOP/g) ?? []).length;
    const pids = [...stdout.matchAll(/(?:WORKER|DESCENDANT):(\d+)/g)].map(m => Number(m[1])); processIds.push(...pids);
    return { code, stdout, stderr, pids };
  }
  try {
    // Deliberately bogus configuration cannot opt the production guard out.
    await writeFile(configPath, JSON.stringify({ workspaceRoot: hostWorkspace, codexCommand: "output-budget-fixture", allowUnbounded: true, outputTokenBudgetEnforcement: "supported",
      repositories: { demoapp: { directory: "DemoApp", originUrl: "https://github.com/example-org/DemoApp.git" } } }));
    const recovering = scenario.startsWith("recover");
    let identity, start, attempt;
    if (recovering) {
      const first = await run(scenario === "recoverClaimed" ? "claimed" : "prepared"); assert.equal(first.code, 73, first.stderr);
      assert.equal(first.pids.length, 0); identity = active.id; start = active.startedAt; attempt = active.attempt;
    }
    const result = await run();
    assert.equal(result.code, recovering ? 1 : 0, result.stderr);
    const complete = requests.filter(r => r.url.endsWith("/complete"));
    assert.equal(complete.length, scenario === "valid" ? 1 : 0);
    assert.equal(requests.filter(r => r.url.endsWith("/claim")).length, scenario === "valid" ? 2 : 1);
    if (scenario === "valid") {
      assert.equal(result.pids.length, 1); assert.equal(stopCalls, 0);
      await assert.rejects(readFile(path.join(directory, writerLockFilename)), { code: "ENOENT" });
    } else {
      const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
      assert.equal(lock.checkpoint.executionId, f.claimed.id);
      assert.equal(JSON.stringify(lock).includes("SYNTHETIC_SECRET"), false);
      const fail = requests.find(r => r.url.endsWith("/fail")); assert.ok(fail, result.stderr);
      const expected = invalid ? "execution_packet_invalid" : ["afterSpawn", "beforeSpawn", "reportUnavailable"].includes(scenario) ? "agent_execution_output_budget_exceeded"
        : scenario === "invalidUsage" ? "agent_execution_output_budget_invalid" : "agent_execution_output_budget_unsupported";
      assert.equal(fail.input.code, expected); assert.equal(fail.input.retryable, false);
      assert.equal(JSON.stringify(fail.input).includes("SYNTHETIC_SECRET"), false);
      const spawned = ["afterSpawn", "invalidUsage", "reportUnavailable"].includes(scenario);
      assert.equal(result.pids.length, spawned ? 2 : 0, result.stdout);
      assert.equal(stopCalls, spawned ? 1 : 0, "only one tree termination");
      for (const pid of result.pids) assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    }
    if (recovering) {
      assert.equal(active.id, identity); assert.equal(active.attempt, attempt); assert.equal(active.startedAt, start);
      assert.equal(requests.filter(r => r.url.endsWith("/recover")).length, 1);
      assert.equal(requests.find(r => r.url.endsWith("/fail")).input.leaseToken, active.leaseToken);
    }
    if (scenario === "reportUnavailable") {
      assert.match(result.stderr, /Could not confirm the failure report/);
      const again = await run(); assert.equal(again.pids.length, 0); assert.equal(again.code, 1);
      assert.equal(requests.filter(r => r.url.endsWith("/claim")).length, 1);
      assert.equal(requests.filter(r => r.url.endsWith("/recover")).length, 0);
      assert.ok(requests.some(r => r.url.endsWith("/recovery-blocked") && r.input.reason === "process_may_be_running"));
    }
  } finally {
    for (const child of processes) if (child.exitCode === null && child.signalCode === null) await terminateWindowsProcessTree(child);
    for (const pid of processIds) await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => resolve()));
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    for (const file of [configPath, path.join(directory, writerLockFilename)]) await unlink(file).catch(error => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  }
});
