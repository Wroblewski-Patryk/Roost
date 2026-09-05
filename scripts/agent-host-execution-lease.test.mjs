import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import { writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import test from "node:test";
import { createExecutionLease, terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";

function harness() {
  let time = 0;
  let nextTimer = 0;
  const timers = new Map();
  const losses = [];
  let renew = async () => ({ leaseExpiresAt: new Date(1_800_000_000_000 + time + 90_000).toISOString() });
  const lease = createExecutionLease({
    renew: () => renew(), onLost: (error) => losses.push(error.message), now: () => time,
    wallNow: () => 1_800_000_000_000 + time,
    setTimer: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: time + delay }); return id; },
    clearTimer: (id) => timers.delete(id)
  });
  return { lease, losses, timers,
    setRenew(callback) { renew = callback; },
    setTime(value) { time = value; },
    expire() { time = 85_000; for (const [id, timer] of [...timers]) if (timer.at === time) { timers.delete(id); timer.callback(); } }
  };
}

test("initial renewal failure prevents execution", async () => {
  const h = harness();
  h.setRenew(async () => { throw new Error("offline"); });
  await h.lease.refresh();
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
  assert.deepEqual(h.losses, ["agent_execution_lease_expired"]);
  assert.equal(h.timers.size, 0);
});

for (const status of [401, 403, 404, 409]) {
  test(`HTTP ${status} revokes execution authority immediately`, async () => {
    const h = harness();
    await h.lease.refresh();
    h.setRenew(async () => { throw Object.assign(new Error("denied"), { status }); });
    await h.lease.refresh();
    assert.throws(() => h.lease.assertValid(), /lease_rejected/);
    assert.equal(h.losses.length, 1);
    assert.equal(h.timers.size, 0);
  });
}

test("cancellation stays distinguishable from lease loss for acknowledgement", async () => {
  const h = harness();
  await h.lease.refresh();
  h.setRenew(async () => { throw { status: 409, body: { error: "agent_execution_cancel_requested" } }; });
  await h.lease.refresh();
  assert.equal(h.lease.failure.message, "agent_execution_cancel_requested");
  assert.throws(() => h.lease.assertValid(), /cancel_requested/);
});

test("network/server failure does not extend the last confirmed deadline", async () => {
  const h = harness();
  await h.lease.refresh();
  h.setTime(20_000);
  h.setRenew(async () => { throw { status: 503 }; });
  await h.lease.refresh();
  h.lease.assertValid();
  h.expire();
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
  assert.equal(h.losses.length, 1);
});

test("a hanging renewal cannot disable the independent expiry timer", async () => {
  const h = harness();
  await h.lease.refresh();
  let resolve;
  h.setRenew(() => new Promise((done) => { resolve = done; }));
  const pending = h.lease.refresh();
  h.expire();
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
  resolve({ leaseExpiresAt: new Date(1_800_000_000_000 + 180_000).toISOString() });
  await pending;
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
  assert.equal(h.timers.size, 0);
  assert.equal(h.losses.length, 1);
});

test("late renewal cannot revive authority even before the timer callback runs", async () => {
  const h = harness();
  await h.lease.refresh();
  h.setTime(86_000);
  await h.lease.refresh();
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
});

test("successful renewal moves the deadline and disposal clears all timers", async () => {
  const h = harness();
  await h.lease.refresh();
  h.setTime(20_000);
  await h.lease.refresh();
  h.setTime(86_000);
  h.lease.assertValid();
  h.lease.stop();
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.losses, []);
});

test("malformed expiry cannot grant execution authority", async () => {
  const h = harness();
  h.setRenew(async () => ({ leaseExpiresAt: "invalid" }));
  await h.lease.refresh();
  assert.throws(() => h.lease.assertValid(), /lease_invalid/);
});

test("rejection from event reporting revokes authority without waiting for heartbeat", async () => {
  const h = harness();
  await h.lease.refresh();
  h.lease.reject({ status: 409, body: { error: "agent_execution_lease_invalid" } });
  assert.throws(() => h.lease.assertValid(), /lease_rejected/);
});

for (const sandboxBlocked of [false, true]) {
test(sandboxBlocked ? "the real host rejects unrestricted sandbox before registering or claiming work" : "the real host stops before spawn and never completes or reclaims after initial rejection", { skip: process.platform !== "win32", timeout: 15_000 }, async () => {
  const routes = [];
  const server = createServer((req, res) => {
    routes.push(req.url);
    res.setHeader("Content-Type", "application/json");
    if (req.url.endsWith("/heartbeat")) { res.writeHead(409); res.end(JSON.stringify({ error: "agent_execution_lease_invalid" })); return; }
    const data = req.url.endsWith("/register") ? { id: "host", name: "test" }
      : req.url.endsWith("/claim") ? { id: "execution", taskId: "task", applicationId: "app", leaseToken: "test-only", task: { title: "test" }, application: { id: "app", name: "Roost", slug: "roost", repositories: [{ url: "https://github.com/Wroblewski-Patryk/Roost.git", isPrimary: true }] } }
      : {};
    res.end(JSON.stringify({ data }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const directory = await mkdtemp(path.join(process.cwd(), "scripts", ".lease-test-"));
  const configPath = path.join(directory, "config.json");
  let host;
  try {
    await writeFile(configPath, JSON.stringify({ workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje", sandbox: sandboxBlocked ? "danger-full-access" : "workspace-write", codexCommand: "must-never-spawn.exe", repositories: { roost: { directory: "Roost", originUrl: "https://github.com/Wroblewski-Patryk/Roost.git" } } }));
    const startHost = `import { runHost } from './scripts/roost-codex-agent-host.mjs'; import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; await runHost({ acquireLock: () => acquireWriterLock(${JSON.stringify(directory)}) });`;
    host = spawn(process.execPath, ["--input-type=module", "-e", startHost], { windowsHide: true,
      env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "test-only", ROOST_AGENT_HOST_CONFIG: configPath },
      stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    host.stderr.on("data", (chunk) => { stderr += chunk; });
    const [code] = await once(host, "close");
    assert.equal(code, sandboxBlocked ? 1 : 0);
    assert.match(stderr, sandboxBlocked ? /agent_host_sandbox_not_approved/ : /agent_execution_lease_rejected/);
    assert.equal(routes.filter((route) => route.endsWith("/claim")).length, sandboxBlocked ? 0 : 1);
    if (sandboxBlocked) assert.deepEqual(routes, []);
    assert.equal(routes.some((route) => /events|actions/.test(route)), false);
    if (!sandboxBlocked) {
      const lock = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
      assert.equal(lock.ownerPid, host.pid, "lease loss retains the writer slot until reconciliation");
    }
  } finally {
    if (host && host.exitCode === null && host.signalCode === null) await terminateWindowsProcessTree(host);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await unlink(configPath).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await unlink(path.join(directory, writerLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  }
});
}

test("clock skew cannot extend a renewal beyond the API lease duration", async () => {
  const h = harness();
  h.setRenew(async () => ({ leaseExpiresAt: new Date(1_800_000_000_000 + 900_000).toISOString() }));
  await h.lease.refresh();
  h.expire();
  assert.throws(() => h.lease.assertValid(), /lease_expired/);
});

test("Windows termination stops both the worker process and its child", { skip: process.platform !== "win32", timeout: 10_000 }, async () => {
  const worker = spawn(process.execPath, ["-e", `
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', windowsHide: true });
    child.once('spawn', () => console.log(child.pid));
    setInterval(() => {}, 1000);
  `], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  let childPid;
  try {
    const closed = once(worker, "close");
    const [data] = await once(worker.stdout, "data");
    childPid = Number(String(data).trim());
    assert.ok(childPid > 0);
    await terminateWindowsProcessTree(worker);
    await closed;
    assert.throws(() => process.kill(childPid, 0), { code: "ESRCH" });
  } finally {
    if (worker.exitCode === null && worker.signalCode === null) await terminateWindowsProcessTree(worker);
    if (childPid) { try { process.kill(childPid); } catch (error) { if (error.code !== "ESRCH") throw error; } }
  }
});
