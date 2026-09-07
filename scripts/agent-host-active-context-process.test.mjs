import assert from "node:assert/strict";
import test from "node:test";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";

for (const scenario of ["unrelated", "beforeCheckpoint", "afterCheckpoint", "heartbeat", "duplicateSignal", "lateComplete", "ackLost"]) {
  test(`active context process stop: ${scenario}`, { skip: process.platform !== "win32", timeout: 20000 }, async () => {
    const f = validPacketFixture(); pinReadyFixture(f);
    const directory = await mkdtemp(path.join(os.tmpdir(), "roost-active-context-"));
    const configPath = path.join(directory, "config.json"), requests = [], processes = [], pids = [];
    let active, fenced = false, workerReady = false, acknowledged = false, unsafeAck = false, totalStops = 0;
    const longWorker = !["unrelated", "lateComplete"].includes(scenario);
    const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
    const invalidate = () => { fenced = true; active.contextInvalidatedAt = new Date().toISOString(); };
    const server = createServer(async (req, res) => {
      let body = ""; for await (const chunk of req) body += chunk;
      const input = body ? JSON.parse(body) : {}; requests.push({ url: req.url, input });
      const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(status === 200 ? { data } : { error: data })); };
      if (req.url.endsWith("/register") || req.url === "/v1/agent-runtime/hosts/host/heartbeat") return send(compatibleHostFixture());
      if (req.url.includes("/recovery?")) return send({ executionEnabled: true, executions: active && fenced ? [active] : [] });
      if (req.url.endsWith("/claim")) {
        if (active) return send("fixture_finished", 401);
        active = { ...f.claimed, startedAt: new Date().toISOString(), leaseExpiresAt: new Date(Date.now() + 90000).toISOString(), checkpointVersion: 1,
          checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId, packetRevision: null, workspaceDigest: null } };
        return send(active);
      }
      if (req.url.includes("company-intelligence")) return send(f.taskContext);
      if (req.url.includes("product-engineering")) return send(f.applicationContext);
      if (req.url.endsWith("/heartbeat")) return fenced ? send("agent_execution_context_invalidated", 409) : send({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() });
      if (req.url.endsWith("/checkpoint")) {
        if (input.checkpoint.stage === "running" && longWorker) {
          for (let attempt = 0; !workerReady && attempt < 200; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
          if (["beforeCheckpoint", "duplicateSignal"].includes(scenario)) {
            invalidate();
            if (scenario === "duplicateSignal") await new Promise(resolve => setTimeout(resolve, 100));
            return send("agent_execution_context_invalidated", 409);
          }
        }
        if (fenced) return send("agent_execution_context_invalidated", 409);
        active.checkpoint = input.checkpoint; active.checkpointVersion = input.expectedVersion + 1;
        if (input.checkpoint.stage === "running" && longWorker) invalidate();
        return send({ checkpoint: active.checkpoint, checkpointVersion: active.checkpointVersion });
      }
      if (req.url.endsWith("/complete") && scenario === "lateComplete") { invalidate(); return send("agent_execution_context_invalidated", 409); }
      if (req.url.endsWith("/context-stopped")) {
        unsafeAck ||= pids.some(alive);
        if (scenario === "ackLost") return send("fixture_unavailable", 503);
        acknowledged = true;
        return send({ stopped: true, checkpoint: active.checkpoint, checkpointVersion: active.checkpointVersion, contextStoppedAt: new Date().toISOString() });
      }
      return send({});
    });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    async function run() {
      const fake = `const cp=require('node:child_process');process.stdin.resume();process.stdin.on('end',()=>{${longWorker ? "const child=cp.spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});console.error('DESCENDANT:'+child.pid);setInterval(()=>{},1000);" : ""}${scenario !== "heartbeat" ? "setTimeout(()=>console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Synthetic runner boundary'}})),200);" : ""}});`;
      // Accelerate only the periodic host heartbeat in the quiet/duplicate fixtures.
      const timers = ["heartbeat", "duplicateSignal"].includes(scenario) ? "const timer=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>timer(fn,ms===20000?30:ms,...args);" : "";
      const launch = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';${timers}const original=cp.spawn;cp.spawn=(command,args,options)=>{if(command==='active-context-fixture'){const child=original(process.execPath,['-e',${JSON.stringify(fake)}],options);console.log('WORKER:'+child.pid);child.stderr.on('data',data=>process.stdout.write(data));return child;}if(command==='taskkill.exe')console.log('TREE_STOP');return original(command,args,options);};syncBuiltinESMExports();const{runHost}=await import('./scripts/roost-codex-agent-host.mjs');const{acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');const{createObservedOutputBudget}=await import('./scripts/lib/agent-host-output-budget.mjs');await runHost({createOutputBudget:createObservedOutputBudget,acquireLock:options=>acquireWriterLock(${JSON.stringify(directory)},options)});`;
      const child = spawn(process.execPath, ["--input-type=module", "-e", launch], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-context-stop-key", ROOST_AGENT_HOST_CONFIG: configPath } });
      processes.push(child); let stdout = "", stderr = "";
      child.stdout.on("data", data => {
        stdout += data;
        for (const match of stdout.matchAll(/(?:WORKER|DESCENDANT):(\d+)/g)) if (!pids.includes(Number(match[1]))) pids.push(Number(match[1]));
        workerReady ||= stdout.includes("DESCENDANT:");
      });
      child.stderr.on("data", data => { stderr += data; });
      const [code] = await once(child, "close"); totalStops += (stdout.match(/TREE_STOP/g) ?? []).length;
      return { code, stdout, stderr };
    }
    try {
      await writeFile(configPath, JSON.stringify({ workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje", codexCommand: "active-context-fixture",
        repositories: { soar: { directory: "Soar", originUrl: "https://github.com/Wroblewski-Patryk/Soar.git" } } }));
      const result = await run(); assert.equal(result.code, 0, result.stderr);
      assert.equal(totalStops, longWorker ? 1 : 0, "one termination for a live tree, none after natural exit");
      assert.equal(unsafeAck, false, "stop must be confirmed before acknowledgement");
      for (const pid of pids) assert.equal(alive(pid), false);
      if (scenario === "unrelated") {
        assert.equal(requests.filter(r => r.url.endsWith("/complete")).length, 1);
        assert.equal(acknowledged, false);
        await assert.rejects(readFile(path.join(directory, writerLockFilename)), { code: "ENOENT" });
      } else {
        assert.equal(requests.filter(r => r.url.endsWith("/claim")).length, 1);
        assert.equal(requests.filter(r => r.url.endsWith("/complete")).length, scenario === "lateComplete" ? 1 : 0);
        assert.equal(requests.filter(r => r.url.endsWith("/fail")).length, 0);
        assert.equal(requests.filter(r => r.url.endsWith("/context-stopped")).length, 1);
        assert.equal(acknowledged, scenario !== "ackLost");
        const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
        assert.equal(lock.checkpoint.stage, active.checkpoint.stage);
        assert.equal(lock.checkpoint.checkpointVersion, active.checkpointVersion);
        assert.equal(lock.checkpoint.executionId, active.id);
        if (["beforeCheckpoint", "duplicateSignal"].includes(scenario)) assert.equal(active.checkpoint.stage, "spawn_intent");
        if (scenario === "ackLost") assert.match(result.stderr, /Context stop acknowledgement could not be confirmed/);
        const again = await run(); assert.equal(again.code, 1); assert.equal(totalStops, longWorker ? 1 : 0);
        assert.equal(again.stdout.includes("WORKER:"), false);
        assert.equal(requests.filter(r => r.url.endsWith("/claim")).length, 1);
        assert.equal(requests.filter(r => r.url.endsWith("/recover")).length, 0);
        assert.ok(requests.some(r => r.url.endsWith("/recovery-blocked") && r.input.reason === "context_changed"));
      }
    } finally {
      for (const child of processes) if (child.exitCode === null && child.signalCode === null) await terminateWindowsProcessTree(child);
      for (const pid of pids) if (alive(pid)) await new Promise(resolve => execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => resolve()));
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      for (const file of [configPath, path.join(directory, writerLockFilename)]) await unlink(file).catch(error => { if (error.code !== "ENOENT") throw error; });
      await rmdir(directory);
    }
  });
}
