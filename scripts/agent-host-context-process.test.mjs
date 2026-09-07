import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validPacketFixture, sealPacket, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";

for (const scenario of ["branchBeforePreparation", "branchBeforeSpawn", "unchanged", "readyMissing", "readyLegacy", "readyChanged", "readyApiPrepare", "readyApiFinal", "taskChanged", "goalChanged", "applicationChanged", "sourceChanged", "accessRevoked", "lateTaskChange", "taskUnavailable", "applicationUnavailable", "authorityRejected", "reportUnavailable", "protocolChanged", "protocolUnavailable"]) {
  test(`real host fresh-context admission: ${scenario}`, { skip: process.platform !== "win32", timeout: 20000 }, async () => {
    const f = validPacketFixture(); f.taskContext.task.title = "Authoritative fixture title";
    pinReadyFixture(f);
    const readyFailure = scenario.startsWith("ready") && scenario !== "readyApiFinal";
    if (scenario === "readyMissing") delete f.taskContext.readyAdmission;
    if (scenario === "readyLegacy") delete f.claimed.metadata.readyContextPin;
    if (scenario === "readyChanged") f.taskContext.task.description = "Changed since Ready before claim";
    const directory = await mkdtemp(path.join(os.tmpdir(), "roost-context-"));
    const configPath = path.join(directory, "config.json"), requests = [];
    let host, taskReads = 0, appReads = 0, finished = false, active, output = "", errors = "";
    const server = createServer(async (req, res) => {
      let body = ""; for await (const chunk of req) body += chunk;
      const input = body ? JSON.parse(body) : {};
      requests.push({ url: req.url, input });
      const send = (data, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(status === 200 ? { data } : { error: data })); };
      if (req.url === "/v1/agent-runtime/hosts/host/heartbeat") {
        if (scenario.startsWith("protocol") && finished) return send("fixture_finished", 401);
        const admission = compatibleHostFixture();
        if (active?.checkpoint.stage === "spawn_intent") {
          if (scenario === "protocolChanged") admission.runtime.protocol.version = 2;
          if (scenario === "protocolUnavailable") return send("SYNTHETIC_SECRET_TRANSPORT", 503);
        }
        return send(admission);
      }
      if (req.url.startsWith("/v1/agent-runtime/recovery?")) return send({ executions: [], executionEnabled: true });
      if (req.url.endsWith("/register")) return send(compatibleHostFixture());
      if (req.url.endsWith("/claim")) {
        if (finished) return send("fixture_finished", 401);
        active = { ...f.claimed, checkpointVersion: 1, checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", sessionId: input.sessionId, packetRevision: null, workspaceDigest: null } };
        return send(active);
      }
      if (req.url.includes("company-intelligence")) {
        taskReads++;
        if (taskReads === 2 && scenario === "readyApiFinal") return send("task_ready_revalidation_required", 409);
        if (taskReads === 2 && ["taskUnavailable", "authorityRejected"].includes(scenario)) return send("SYNTHETIC_SECRET_TRANSPORT", scenario === "authorityRejected" ? 403 : 503);
        return send({ ...f.taskContext, generatedAt: taskReads === 1 ? "2026-09-06T00:00:00Z" : "2026-09-06T00:00:01Z" });
      }
      if (req.url.includes("product-engineering")) {
        appReads++;
        if (appReads === 2 && scenario === "applicationUnavailable") return send("SYNTHETIC_SECRET_TRANSPORT", 503);
        return send({ ...f.applicationContext, generatedAt: appReads === 1 ? "2026-09-06T00:00:00Z" : "2026-09-06T00:00:01Z" });
      }
      if (req.url.endsWith("/heartbeat")) return send({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() });
      if (req.url.endsWith("/checkpoint")) {
        if (scenario === "readyApiPrepare" && input.checkpoint.stage === "prepared") return send("task_ready_revalidation_required", 409);
        active.checkpoint = input.checkpoint; active.checkpointVersion++;
        if (input.checkpoint.stage === "prepared") {
          if (["taskChanged", "reportUnavailable"].includes(scenario)) f.taskContext.task.description = "Changed task after prepare";
          if (scenario === "goalChanged") f.taskContext.task.goal.description = "Changed goal after prepare";
          if (scenario === "applicationChanged") f.applicationContext.application.description = "Changed app after prepare";
          if (scenario === "sourceChanged") { f.packet.sources[0].description = "Changed source after prepare"; sealPacket(f.packet); }
          if (scenario === "accessRevoked") f.taskContext.task.assignedWorkforceEntity.authorityScope = [];
        }
        return send({ checkpoint: input.checkpoint, checkpointVersion: active.checkpointVersion });
      }
      if (req.url.endsWith("/events") && input.type === "runner_started" && scenario === "lateTaskChange") f.taskContext.task.description = "Changed after last pre-spawn event";
      if (/\/actions\/(complete|fail)$/.test(req.url)) {
        if (scenario === "reportUnavailable") return send("SYNTHETIC_SECRET_TRANSPORT", 503);
        finished = true;
      }
      return send({});
    });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    try {
      await writeFile(configPath, JSON.stringify({ workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje", codexCommand: "context-test-codex", repositories: { soar: { directory: "Soar", originUrl: "https://github.com/Wroblewski-Patryk/Soar.git" } } }));
      const fake = `let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{if(!input.includes('2026-09-06T00:00:01Z')||!input.includes('Task: Authoritative fixture title'))process.exit(7);console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Fresh context confirmed'}}));});`;
      const launch = `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';const original=cp.spawn;cp.spawn=(command,args,options)=>{if(command!=='context-test-codex')return original(command,args,options);process.stdout.write('MODEL_SPAWN\\n');return original(process.execPath,['-e',${JSON.stringify(fake)}],options);};syncBuiltinESMExports();const {runHost}=await import('./scripts/roost-codex-agent-host.mjs');const {acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');await runHost({readTaskBranch:(()=>{let checks=0;return async()=>++checks===({branchBeforePreparation:1,branchBeforeSpawn:2}[${JSON.stringify(scenario)}])?"main":${JSON.stringify(f.packet.contract.singleTask.branch)};})(),createOutputBudget: (await import('./scripts/lib/agent-host-output-budget.mjs')).createObservedOutputBudget, acquireLock:()=>acquireWriterLock(${JSON.stringify(directory)})});`;
      host = spawn(process.execPath, ["--input-type=module", "-e", launch], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-context-key", ROOST_AGENT_HOST_CONFIG: configPath } });
      host.stdout.on("data", (c) => { output += c; }); host.stderr.on("data", (c) => { errors += c; });
      assert.equal((await once(host, "close"))[0], scenario.startsWith("protocol") ? 1 : 0, errors);
      if (scenario.startsWith("branch")) {
        assert.equal(output.includes("MODEL_SPAWN"), false);
        assert.equal(taskReads, 1); assert.equal(requests.filter(r => r.url.endsWith("/claim")).length, 1);
        assert.equal(requests.find(r => r.url.endsWith("/fail")).input.code, "agent_task_branch_mismatch");
        const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
        assert.equal(lock.checkpoint.stage, scenario === "branchBeforePreparation" ? "claimed" : "spawn_intent");
        return;
      }
      assert.equal(taskReads, scenario.startsWith("protocol") || readyFailure ? 1 : 2);
      const started = requests.findIndex((r) => r.input.type === "runner_started");
      if (!scenario.startsWith("protocol") && !readyFailure) assert.ok(requests.findLastIndex((r) => r.url.includes("company-intelligence")) > started);
      assert.equal(output.includes("MODEL_SPAWN"), scenario === "unchanged");
      const complete = requests.find((r) => r.url.endsWith("/complete")), failure = requests.find((r) => r.url.endsWith("/fail"));
      if (scenario === "unchanged") {
        assert.equal(complete.input.summary, "Fresh context confirmed"); assert.equal(failure, undefined);
      } else {
        assert.equal(complete, undefined);
        assert.equal(requests.filter((r) => r.url.endsWith("/claim")).length, 1);
        const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
        assert.equal(lock.checkpoint.stage, scenario === "readyApiPrepare" ? "prepared" : readyFailure ? "claimed" : "spawn_intent");
        if (!readyFailure) {
          assert.match(lock.checkpoint.contextRevision, /^[a-f0-9]{64}$/);
          assert.equal(lock.checkpoint.contextRevision, requests.find((r) => r.input.checkpoint?.stage === "prepared").input.checkpoint.contextRevision);
        }
        if (readyFailure || scenario === "readyApiFinal") {
          if (readyFailure) assert.equal(started, -1);
          if (readyFailure && scenario !== "readyApiPrepare") assert.equal(requests.some(r => r.input.checkpoint?.stage === "prepared"), false);
          assert.equal(failure.input.code, "agent_ready_context_revalidation_required"); assert.equal(failure.input.retryable, false);
        }
        else if (scenario.startsWith("protocol")) { assert.equal(failure.input.code, "agent_host_protocol_blocked"); assert.equal(failure.input.retryable, false); }
        else if (scenario === "authorityRejected") { assert.equal(failure, undefined); assert.ok(requests.some((r) => r.url.endsWith("/recovery-blocked"))); }
        else {
          const reason = scenario.endsWith("Unavailable") && scenario !== "reportUnavailable" ? "unavailable" : scenario === "accessRevoked" ? "invalid" : "changed";
          assert.equal(failure.input.code, `agent_execution_context_${reason}`); assert.equal(failure.input.retryable, false);
        }
      }
      assert.equal(errors.includes("SYNTHETIC_SECRET"), false);
      if (scenario === "reportUnavailable") assert.match(errors, /Could not confirm the failure report/);
    } finally {
      if (host && host.exitCode === null && host.signalCode === null) await terminateWindowsProcessTree(host);
      server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
      for (const file of [configPath, path.join(directory, writerLockFilename)]) await unlink(file).catch((e) => { if (e.code !== "ENOENT") throw e; });
      await rmdir(directory);
    }
  });
}
