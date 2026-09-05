import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { acquireObserverLock, runObserver } from "./lib/agent-host-observer.mjs";

const example = JSON.parse(await readFile(new URL("../config/roost-agent-host.example.json", import.meta.url), "utf8"));
async function until(check) {
  for (let index = 0; index < 100; index++) { if (await check()) return; await delay(100); }
  throw new Error("condition_timeout");
}

test("observer CLI ignores enabled execution, duplicate starts, and recovers after process death", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-observer-"));
  const state = path.join(directory, ".roost", "agent-host");
  await mkdir(state, { recursive: true });
  const config = path.join(directory, "config.json");
  await writeFile(config, JSON.stringify({ ...example, executionMode: "observe", codexCommand: "must-never-be-started" }));
  const requests = [];
  const bodies = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push(req.url); bodies.push(JSON.parse(body));
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: { id: "stable-host", workspaceId: "workspace", lastSeenAt: new Date().toISOString(), runtime: { executionEnabled: true } } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const children = [];
  function start() {
    const child = spawn(process.execPath, ["scripts/roost-codex-agent-host.mjs"], { windowsHide: true, env: { ...process.env, USERPROFILE: directory, ROOST_AGENT_HOST_CONFIG: config, ROOST_AGENT_API_KEY: "test-key", ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}` }, stdio: "ignore" });
    children.push(child); return child;
  }
  try {
    const first = start();
    await until(() => requests.length >= 2);
    const duplicate = start();
    await until(() => duplicate.exitCode !== null);
    assert.notEqual(duplicate.exitCode, 0);
    assert.equal(requests.filter((url) => url.endsWith("/register")).length, 1);
    first.kill("SIGKILL");
    await until(() => first.exitCode !== null || first.signalCode !== null);
    const restarted = start();
    await until(() => requests.filter((url) => url.endsWith("/register")).length === 2);
    await writeFile(path.join(state, "stop.request"), "stop");
    await until(() => restarted.exitCode !== null);
    assert.equal(restarted.exitCode, 0);
    assert.ok(requests.every((url) => /^\/v1\/agent-runtime\/hosts\/(register|stable-host\/heartbeat)$/.test(url)));
    assert.ok(bodies.every((body) => body.capabilities.includes("observer") && !body.capabilities.includes("codex_exec_json")));
    const saved = JSON.parse(await readFile(path.join(state, "status.json"), "utf8"));
    assert.equal(saved.hostId, "stable-host");
    assert.equal(saved.status, "stopped");
    assert.deepEqual(saved.executionUnavailableReasons, ["observer_mode"]);
    assert.ok(!JSON.stringify(saved).includes("test-key"));
  } finally {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("observer rejects non-observer configuration before API access", async () => {
  await assert.rejects(runObserver({ config: { ...example, executionMode: "supervised" }, api: () => assert.fail("API forbidden") }), /observer_mode_required/);
});

test("observer authentication failure stops and saves only fixed diagnostics", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-observer-auth-"));
  let released = false;
  try {
    await runObserver({ config: { ...example, executionMode: "observe" }, stateDirectory: directory, acquireLock: async () => async () => { released = true; }, api: async () => { throw Object.assign(new Error("sensitive response test-secret"), { status: 401 }); } });
    assert.ok(released);
    assert.ok(!(await readFile(path.join(directory, "status.json"), "utf8")).includes("test-secret"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("exclusive observer lock is reusable after release", async () => {
  const release = await acquireObserverLock();
  await assert.rejects(acquireObserverLock(), /already_running/);
  await release();
  await (await acquireObserverLock())();
});
