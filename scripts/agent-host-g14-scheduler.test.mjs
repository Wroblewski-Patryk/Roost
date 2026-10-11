import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createExecutionLease } from "./lib/agent-host-execution-lease.mjs";
import { observeSchedulerResources } from "./lib/agent-host-scheduler-resources.mjs";
import { confirmPreemptionStopped, recoverPreemptionStopped, retireConfirmedPreemptionIntent } from "./lib/agent-host-preemption.mjs";
import { acquireWriterLock, preemptionIntentFilename, writerLockFilename, writerRecoveryEvidence } from "./lib/agent-host-writer-lock.mjs";
import { buildWindowsJobLauncher, isWindowsJobCleanupReceipt, startWindowsJob } from "./lib/agent-host-windows-job.mjs";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("resource observation measures the selected state volume and rejects unknown facts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "roost-g14-resources-"));
  try {
    const observed = await observeSchedulerResources(root);
    assert.equal(observed.schemaVersion, "roost-host-resources-v1");
    assert.match(observed.observedAt, /^\d{4}-\d\d-\d\dT/);
    for (const field of ["freeMemoryBytes", "totalMemoryBytes", "freeDiskBytes", "totalDiskBytes", "cpuLogicalCount"])
      assert.ok(Number.isSafeInteger(observed[field]) && observed[field] >= 0);
    assert.equal(JSON.stringify(observed).includes(root), false);
    await assert.rejects(observeSchedulerResources(root, { filesystem: async () => ({ bavail: 4n, blocks: 3n, bsize: 1n }) }),
      /agent_host_resources_unavailable/);
    await assert.rejects(observeSchedulerResources(path.join(root, "missing")), { code: "ENOENT" });
  } finally { await rm(root, { recursive: true, force: false }); }
});

test("lost live ACK response is recovered after a Worker process restart without replaying the stop", {
  skip: process.platform !== "win32", timeout: 60000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "roost-g14-restart-"));
  const state = path.join(root, "state"), id = randomUUID();
  const fixture = path.join(root, "fixture.exe");
  const source = fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url));
  let firstRequest, ack, liveRequests = 0, commits = 0, replayRequests = 0, child;
  const server = createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (req.url !== `/v1/agent-runtime/executions/${id}/actions/preemption-stopped`) {
      res.writeHead(404); res.end(); return;
    }
    if (body.replayOnly === true) {
      replayRequests += 1;
      const replay = { ...body }; delete replay.replayOnly;
      assert.deepEqual(replay, firstRequest);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: ack }));
      return;
    }
    liveRequests += 1;
    if (!firstRequest) {
      const durableBytes = await readFile(path.join(state, preemptionIntentFilename), "utf8");
      const intent = JSON.parse(durableBytes);
      assert.equal(intent.requestBody, undefined);
      assert.equal(intent.execution.leaseToken, undefined);
      assert.ok(typeof intent.protectedRequest === "string" && intent.protectedRequest.length > 0);
      assert.ok(!durableBytes.includes(body.leaseToken), "durable intent cannot expose the lease token");
      firstRequest = body; commits += 1;
      ack = { stopped: true, checkpointVersion: body.expectedVersion + 1,
        checkpoint: intent.execution.checkpoint };
    } else assert.deepEqual(body, firstRequest);
    // Server committed the stop, but every live response is lost. The restarted
    // Worker may only read the already-stopped row with replayOnly.
    req.socket.destroy();
  });
  let lock;
  try {
    await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      ["/nologo", "/target:exe", "/platform:x64", `/out:${fixture}`, source], { windowsHide: true, timeout: 30000 });
    server.listen(0, "127.0.0.1"); await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    child = spawn(process.execPath, [fileURLToPath(new URL("./fixtures/preemption-loss-controller.mjs", import.meta.url)),
      root, fixture, baseUrl, id], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", bytes => { stdout += bytes; });
    child.stderr.on("data", bytes => { stderr += bytes; });
    const [code] = await once(child, "close"); child = null;
    assert.equal(code, 0, stderr);
    assert.match(stdout, /lost-response-retained/);
    assert.equal(commits, 1); assert.equal(liveRequests, 3);
    await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
    await assert.rejects(recoverPreemptionStopped(state, async (_route, options) => {
      assert.equal(JSON.parse(options.body).replayOnly, true);
      throw Object.assign(new Error("requested_not_stopped"), { status: 409 });
    }), /requested_not_stopped/);
    await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
    const api = async (route, options) => {
      const response = await fetch(baseUrl + route, { method: options.method, body: options.body,
        headers: { "Content-Type": "application/json" } });
      if (!response.ok) throw Object.assign(new Error("replay_refused"), { status: response.status });
      return (await response.json()).data;
    };
    assert.equal(await recoverPreemptionStopped(state, api), true);
    assert.equal(replayRequests, 1); assert.equal(commits, 1);
    await assert.rejects(readFile(path.join(state, writerLockFilename)), { code: "ENOENT" });
    await assert.rejects(readFile(path.join(state, preemptionIntentFilename)), { code: "ENOENT" });
    lock = await acquireWriterLock(state);
  } finally {
    if (child) { child.kill(); await once(child, "close"); }
    await lock?.release();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: false });
  }
});

test("exact heartbeat preemption stops lease once and cannot be revived", async () => {
  let stopped = 0;
  let renew = async () => ({ leaseExpiresAt: new Date(Date.now() + 90_000).toISOString() });
  const lease = createExecutionLease({ renew: () => renew(), onLost: () => { stopped += 1; },
    setTimer: () => 1, clearTimer: () => {} });
  await lease.refresh();
  renew = async () => { throw { status: 409, body: { error: "agent_execution_preemption_requested" } }; };
  await lease.refresh();
  assert.equal(lease.failure.message, "agent_execution_preemption_requested");
  assert.equal(lease.failure.preemptionRequested, true);
  assert.equal(stopped, 1);
  await lease.refresh();
  assert.equal(stopped, 1);
  lease.stop();
});

test("native Job closure precedes exact ACK and local Writer checkpoint", { skip: process.platform !== "win32", timeout: 60000 }, async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "roost-g14-native-"));
  const state = path.join(root, "state");
  let lock, handle;
  try {
    const fixture = path.join(root, "fixture.exe");
    const source = fileURLToPath(new URL("./fixtures/windows-job-tree.cs", import.meta.url));
    await promisify(execFile)(path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
      ["/nologo", "/target:exe", "/platform:x64", `/out:${fixture}`, source], { windowsHide: true, timeout: 30000 });
    const artifact = await buildWindowsJobLauncher(root);
    const execution = { id: randomUUID(), leaseToken: randomUUID(), workspaceId: randomUUID(),
      applicationId: randomUUID(), taskId: randomUUID(), attempt: 1, checkpointVersion: 1,
      checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed", packetRevision: null, workspaceDigest: null } };
    lock = await acquireWriterLock(state);
    execution.checkpoint.sessionId = lock.sessionId;
    await lock.checkpoint(execution);
    let output = "", assigned;
    handle = await startWindowsJob(artifact, { executable: fixture, argv: ["tree"], cwd: root,
      environment: { SystemRoot: process.env.SystemRoot }, input: "", attempt: execution.id, durationMs: 10000,
      onAssigned: value => { assigned = value; }, onData: (channel, bytes) => { if (channel === "stdout") output += bytes.toString("utf8"); } });
    for (let n = 0; n < 100 && (output.match(/PID:/g) || []).length < 3; n += 1) await delay(20);
    assert.ok((output.match(/PID:/g) || []).length >= 3, "the owned process tree started");
    handle.stop("lease_lost");
    const receipt = await handle.completion;
    assert.equal(receipt.terminationReason, "lease_lost");
    assert.ok(isWindowsJobCleanupReceipt(receipt));
    assert.equal(receipt.rootPid, assigned.rootPid);
    const pids = [...output.matchAll(/PID:(\d+)/g)].map(match => Number(match[1]));
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    let calls = 0;
    const api = async (route, options) => {
      calls += 1;
      assert.equal(route, `/v1/agent-runtime/executions/${execution.id}/actions/preemption-stopped`);
      const body = JSON.parse(options.body);
      assert.equal(body.expectedVersion, 1);
      assert.equal(body.writerLockDigest, writerRecoveryEvidence(lock).digest);
      assert.deepEqual(body.stop, { schemaVersion: "roost-preemption-stop-v1", kind: "windows_job",
        attempt: execution.id, jobClosed: true, activeProcesses: 0, cleanup: true, terminationReason: "lease_lost" });
      assert.equal(body.leaseToken, execution.leaseToken);
      return { stopped: true, checkpointVersion: 2, checkpoint: execution.checkpoint };
    };
    await confirmPreemptionStopped({ execution, writerLock: lock, ownedTreeReceipt: receipt, api });
    assert.equal(calls, 1);
    const saved = JSON.parse(await readFile(path.join(state, writerLockFilename), "utf8"));
    assert.equal(saved.checkpoint.checkpointVersion, 2);
    assert.equal(saved.checkpoint.stage, "claimed");
    await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
    await lock.release(); lock = null;
    await retireConfirmedPreemptionIntent(state);

    // A new lock in this isolated state proves release is possible only after
    // the acknowledged checkpoint. An unconfirmed ACK retains ownership.
    lock = await acquireWriterLock(state);
    execution.checkpoint.sessionId = lock.sessionId;
    await lock.checkpoint(execution);
    await assert.rejects(confirmPreemptionStopped({ execution, writerLock: lock, ownedTreeReceipt: receipt,
      api: async () => { throw new Error("ack_unavailable"); } }), /ack_unavailable/);
    await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
    await assert.rejects(confirmPreemptionStopped({ execution, writerLock: lock,
      ownedTreeReceipt: { ...receipt }, api: async () => { throw new Error("forged_receipt_accepted"); } }),
    /agent_preemption_stop_unproven/);
    await assert.rejects(acquireWriterLock(state), /agent_host_writer_locked/);
  } finally {
    handle?.stop(); await handle?.completion.catch(() => {});
    await lock?.release();
    await rm(root, { recursive: true, force: false });
  }
});
