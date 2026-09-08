import { syntheticHostWorkspace } from "./fixtures/host-workspace.mjs";
const hostWorkspace = process.platform === "win32" ? await syntheticHostWorkspace() : undefined;
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validPacketFixture, sealPacket, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";

for (const scenario of ["hungWorker", "lateSuccess", "expiredBeforeSpawn", "missingStart", "failureReportUnavailable", "stopUnconfirmed"]) {
  test(`real host duration enforcement: ${scenario}`, { skip: process.platform !== "win32", timeout: 15000 }, async () => {
    const f = validPacketFixture(); f.packet.contract.budgets.maxDurationSeconds = 60; sealPacket(f.packet);
    pinReadyFixture(f);
    const directory = await mkdtemp(path.join(os.tmpdir(), "roost-duration-"));
    const configPath = path.join(directory, "config.json"), requests = [];
    let host, output = "", errors = "";
    const server = createServer(async (req, res) => {
      let body = ""; for await (const chunk of req) body += chunk;
      const input = body ? JSON.parse(body) : null;
      requests.push({ url: req.url, input });
      res.setHeader("Content-Type", "application/json");
      let data = {};
      if (req.url.startsWith("/v1/agent-runtime/recovery?")) data = { executionEnabled: true, executions: [] };
      if (req.url === "/v1/agent-runtime/hosts/host/heartbeat") { res.end(JSON.stringify({ data: compatibleHostFixture() })); return; }
      if (req.url.endsWith("/register")) data = compatibleHostFixture();
      if (req.url.endsWith("/claim")) {
        if (requests.filter((r) => r.url.endsWith("/claim")).length > 1) { res.writeHead(401); res.end('{}'); return; }
        data = { ...f.claimed, startedAt: scenario === "missingStart" ? null : new Date(Date.now() - (scenario === "expiredBeforeSpawn" ? 60000 : 52000)).toISOString(),
          checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId, packetRevision: null, workspaceDigest: null } };
      }
      if (req.url.includes("company-intelligence")) data = f.taskContext;
      if (req.url.includes("product-engineering")) data = f.applicationContext;
      // Healthy renewable authority must not extend the independent time budget.
      if (req.url.endsWith("/heartbeat")) data = { leaseExpiresAt: new Date(Date.now() + 90000).toISOString() };
      if (req.url.endsWith("/checkpoint")) data = { checkpoint: input.checkpoint, checkpointVersion: input.expectedVersion + 1 };
      if (req.url.endsWith("/actions/fail") && scenario === "failureReportUnavailable") { res.writeHead(503); res.end('{}'); return; }
      res.end(JSON.stringify({ data }));
    });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    try {
      await writeFile(configPath, JSON.stringify({ workspaceRoot: hostWorkspace, codexCommand: "duration-test-codex",
        repositories: { demoapp: { directory: "DemoApp", originUrl: "https://github.com/example-org/DemoApp.git" } } }));
      const fake = `const cp=require('node:child_process');const child=cp.spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});console.error('DESCENDANT:'+child.pid);process.stdin.resume();${scenario === "lateSuccess" ? "console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Premature success'}}));" : ""}setInterval(()=>{},1000);`;
      const launch = `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';const original=cp.spawn;cp.spawn=(command,args,options)=>{if(command==='duration-test-codex'){const c=original(process.execPath,['-e',${JSON.stringify(fake)}],options);process.stdout.write('WORKER:'+c.pid+'\\n');c.stderr.on('data',d=>process.stdout.write(d));return c;}if(command==='taskkill.exe' && ${JSON.stringify(scenario)}==='stopUnconfirmed')return original(process.execPath,['-e','process.exit(1)'],options);return original(command,args,options);};syncBuiltinESMExports();const {runHost}=await import('./scripts/roost-codex-agent-host.mjs');const {acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');await runHost({readTaskBranch:async()=>${JSON.stringify(f.packet.contract.singleTask.branch)},createOutputBudget: (await import('./scripts/lib/agent-host-output-budget.mjs')).createObservedOutputBudget, acquireLock:()=>acquireWriterLock(${JSON.stringify(directory)})});`;
      host = spawn(process.execPath, ["--input-type=module", "-e", launch], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-duration-only", ROOST_AGENT_HOST_CONFIG: configPath } });
      host.stdout.on("data", (chunk) => { output += chunk; }); host.stderr.on("data", (chunk) => { errors += chunk; });
      assert.equal((await once(host, "close"))[0], 0, errors);
      assert.equal(requests.filter((r) => r.url.endsWith("/claim")).length, 1);
      assert.equal(requests.some((r) => r.url.endsWith("/complete")), false);
      const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
      assert.equal(lock.checkpoint.executionId, f.claimed.id);
      assert.equal(lock.ownerPid, host.pid);
      assert.equal(JSON.stringify(lock).includes("synthetic-duration-only"), false);
      const failed = requests.find((r) => r.url.endsWith("/actions/fail"));
      if (scenario === "stopUnconfirmed") {
        assert.equal(failed, undefined);
        assert.ok(requests.some((r) => r.url.endsWith("/recovery-blocked")));
        assert.equal(requests.find((r) => r.url.endsWith("/recovery-blocked")).input.reason, "process_may_be_running");
        assert.match(errors, /termination could not be confirmed/);
      } else {
        assert.equal(failed.input.code, scenario === "missingStart" ? "agent_execution_duration_context_invalid" : "agent_execution_duration_exceeded");
        assert.equal(failed.input.retryable, false);
      }
      const pids = [...output.matchAll(/(?:WORKER|DESCENDANT):(\d+)/g)].map((m) => Number(m[1]));
      if (["expiredBeforeSpawn", "missingStart"].includes(scenario)) assert.equal(pids.length, 0);
      else {
        assert.equal(pids.length, 2, output);
        if (scenario !== "stopUnconfirmed") for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
      }
      if (scenario === "failureReportUnavailable") assert.match(errors, /Could not confirm the failure report/);
    } finally {
      if (host && host.exitCode === null && host.signalCode === null) await terminateWindowsProcessTree(host);
      for (const match of output.matchAll(/(?:WORKER|DESCENDANT):(\d+)/g)) {
        await new Promise((resolve) => execFile("taskkill.exe", ["/PID", match[1], "/T", "/F"], { windowsHide: true, timeout: 5000 }, () => resolve()));
      }
      server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
      for (const file of [configPath, path.join(directory, writerLockFilename)]) await unlink(file).catch((error) => { if (error.code !== "ENOENT") throw error; });
      await rmdir(directory);
    }
  });
}
