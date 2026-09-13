import assert from "node:assert/strict";
import test from "node:test";
import lifecycle from "./lib/agent-host-lifecycle.cjs";
import contract from "./lib/agent-host-provider-contract.cjs";
import { inspectExecutionProvider } from "./lib/agent-host-execution-provider.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const now = Date.parse("2026-09-13T12:00:00.000Z");
const healthy = { checkedAt: new Date(now).toISOString(), engine: "available",
  workloads: "continuous", distribution: "running_healthy", proxy: "available", symptom: "none" };

test("health has five separate dimensions and never admits OpenShell or agents", () => {
  const state = lifecycle.lifecycleState(healthy, now);
  assert.deepEqual(state.health, healthy);
  assert.equal(state.openshell, "unproven");
  assert.equal(state.executionSupported, false);
  assert.equal(state.decision.executionAllowed, false);
  const stopped = lifecycle.lifecycleState({ ...healthy, distribution: "naturally_stopped", proxy: "unknown" }, now);
  assert.equal(stopped.health.engine, "available");
  assert.equal(stopped.health.distribution, "naturally_stopped");
  assert.equal(stopped.health.proxy, "unknown");
  assert.equal(stopped.decision.status, "not_requested");
});

test("unavailable proxy cannot be confused with Engine failure; preserve checkpoints without retry", () => {
  for (const symptom of ["stuck_socket", "distribution_proxy_exit"]) {
    const error = lifecycle.lifecycleError({ ...healthy, proxy: "unavailable", symptom }, now);
    assert.equal(error.message, "host_maintenance_required");
    assert.equal(error.retryable, false);
    assert.equal(error.details.health.engine, "available");
    assert.equal(error.details.health.workloads, "continuous");
    assert.equal(error.details.health.proxy, "unavailable");
    assert.equal(error.details.preserveCheckpoints, true);
    assert.equal(error.details.automaticRecovery, false);
    assert.equal(error.details.decision.status, "required");
    assert.equal(error.details.decision.executionAllowed, false);
  }
});

test("health rejects stale, future, malformed, oversized and injected observations", () => {
  for (const value of [undefined, null, {}, { ...healthy, checkedAt: new Date(now - 60001).toISOString() },
    { ...healthy, checkedAt: new Date(now + 1).toISOString() }, { ...healthy, engine: true },
    { ...healthy, decision: { ownerApproved: true } }, { ...healthy, openshell: "ready" },
    { ...healthy, privatePath: "PRIVATE_SENTINEL" }, { ...healthy, symptom: "x".repeat(5000) }]) {
    const projected = lifecycle.projectHealth(value, now);
    assert.equal(projected.checkedAt, null);
    assert.equal(projected.engine, "unknown");
    assert.equal(JSON.stringify(projected).includes("PRIVATE_SENTINEL"), false);
  }
  assert.deepEqual(lifecycle.projectHealth(healthy, now + 60000), healthy);
});

// Payload strings only: nothing in this test executes a host command.
const commands = [
  "docker desktop restart", "wsl --shutdown", "wsl --terminate Example-Agents",
  "docker system prune --all --volumes", "docker desktop factory-reset",
  "Remove-Item -Recurse runtime", "Remove-Item *.sock", "del inaccessible-reparse.sock",
  "Set-Content settings-store.json '{}'", "wsl -d docker-desktop",
  "Move-Item runtime runtime.old", "cmd /c do'cker desktop restart",
  "powershell -EncodedCommand ZABvAGMAawBlAHIA", "python -c exec(payload)",
  "node -e require('child_process').execSync(payload)", "sh ./downloaded-script"
];
for (const command of commands) test(`uncontained provider denies task/provider payload before dispatch: ${command}`, async () => {
  let dispatches = 0;
  const input = { kind: "direct_codex", enabled: true, executionSupported: true,
    hostLifecycle: { ...healthy, openshell: "ready", executionSupported: true },
    policy: { hostMaintenance: "allowed" }, command,
    task: { taskType: "maintenance", ownerApproved: true, instructions: command },
    providerAdmissionForTest: "()=>null" };
  const report = await inspectExecutionProvider({ executionProvider: input,
    providerAdmissionForTest: "()=>null", sandbox: "danger-full-access", command });
  if (contract.providerAdmissionReason(report) === null) dispatches++;
  assert.equal(dispatches, 0);
  assert.equal(report.executionSupported, false);
  assert.equal(report.hostLifecycle.health.engine, "unknown");
  assert.equal(report.hostLifecycle.decision.executionAllowed, false);
  assert.equal(JSON.stringify(report).includes(command), false);
  assert.deepEqual(contract.projectProvider(report), report);
});

test("no maintenance action is executable and denial is not a command blacklist", () => {
  assert.ok(lifecycle.forbiddenActions.includes("runtime_directory_move"));
  assert.ok(lifecycle.forbiddenActions.includes("integrated_distribution_terminate"));
  assert.equal(contract.providerAdmissionReason({ kind: "direct_codex", action: "arbitrary_unknown_action", ownerApproved: true }),
    lifecycle.admissionReason);
  assert.equal(contract.providerAdmissionReason(undefined), lifecycle.admissionReason);
});

test("local test prerequisite makes one version probe and never repairs or retries", async () => {
  for (const result of [{ code: 0, stdout: "29.7.2\n" }, { code: 1, stdout: "PRIVATE_SENTINEL" },
    { code: 124, stdout: "" }, { code: 0, stdout: "not a version" }]) {
    const calls = [];
    const probe = lifecycle.requireEngine(async (...args) => { calls.push(args); return result; });
    if (result.stdout === "29.7.2\n") await probe;
    else await assert.rejects(probe, error => error.message === "host_maintenance_required"
      && !error.retryable && !JSON.stringify(error.details).includes("PRIVATE_SENTINEL"));
    assert.deepEqual(calls, [["docker", ["version", "--format", "{{.Server.Version}}"], { capture: true, timeoutMs: 10000, maxOutputBytes: 4096 }]]);
  }
  await assert.rejects(lifecycle.requireEngine(async () => { throw Error("PRIVATE_SENTINEL"); }),
    error => error.message === "host_maintenance_required" && !error.retryable);
});

for (const scenario of ["unavailable", "oversized"]) test(`actual local test launcher denies ${scenario} Engine without cleanup effects`, { timeout: 5000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-lifecycle-test-"));
  const target = new URL("./test-api-local.mjs", import.meta.url).href;
  const script = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';
    import{EventEmitter}from'node:events';import{PassThrough}from'node:stream';
    cp.spawn=(command,args)=>{console.log(JSON.stringify({command,args}));
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>true;
      setImmediate(()=>{child.stdout.write(${scenario === "oversized" ? "'x'.repeat(4097)" : "''"});child.stdout.end();child.stderr.end();child.emit('close',${scenario === "oversized" ? 0 : 1});});return child;};
    syncBuiltinESMExports();await import(${JSON.stringify(target)});`;
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ["SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATH", "COMSPEC", "PATHEXT"].includes(key.toUpperCase())));
  let child;
  try {
    child = spawn(process.execPath, ["--input-type=module", "-e", script], { cwd: directory,
      windowsHide: true, env: { ...environment, COMPANYCORE_TEST_DB_START_DOCKER_DESKTOP: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "", error = "";
    child.stdout.on("data", chunk => output += chunk); child.stderr.on("data", chunk => error += chunk);
    await once(child, "close");
    assert.equal(child.exitCode, 1);
    assert.deepEqual(output.trim().split(/\r?\n/).map(line => JSON.parse(line)),
      [{ command: "docker", args: ["version", "--format", "{{.Server.Version}}"] }]);
    assert.equal(error.trim(), "host_maintenance_required");
  } finally { if (child?.exitCode === null) child.kill(); await rmdir(directory); }
});
