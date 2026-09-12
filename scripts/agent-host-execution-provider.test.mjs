import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, writeFile, readFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectExecutionProvider, registry } from "./lib/agent-host-execution-provider.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";
import { runObserver } from "./lib/agent-host-observer.mjs";

const hermes = registry.providers.find(provider => provider.kind === "hermes_codex");
const configured = () => ({ kind: "hermes_codex", enabled: true, officialSource: hermes.officialSource,
  version: hermes.version, commit: hermes.commit, executablePath: "C:\\Fictional\\uninstalled\\hermes.exe", policy: structuredClone(registry.hermesPolicy) });

test("legacy and explicit direct provider preserve admission independent of Hermes", async () => {
  for (const config of [{}, { executionProvider: { kind: "direct_codex" } }]) {
    const report = await inspectExecutionProvider(config);
    assert.equal(report.kind, "direct_codex"); assert.equal(report.executionSupported, true);
    assert.equal(contract.providerAdmissionReason(report), null); assert.deepEqual(report.blockers, []);
    assert.equal(report.installedVersion, null);
  }
});
for (const [label, mutate, reason] of [
  ["disabled by default", c => delete c.enabled, "hermes_disabled"],
  ["wrong identity", c => c.officialSource = "https://example.invalid/fork", "hermes_identity_invalid"],
  ["wrong pin", c => c.commit = "latest", "hermes_pin_invalid"],
  ["relative executable", c => c.executablePath = "hermes.exe", "hermes_executable_invalid"],
  ["UNC executable", c => c.executablePath = "\\\\server\\hermes.exe", "hermes_executable_invalid"],
  ["shell executable", c => c.executablePath = "C:\\Fictional\\install.ps1", "hermes_executable_invalid"],
  ["traversal", c => c.executablePath = "C:\\Fictional\\..\\hermes.exe", "hermes_executable_invalid"],
  ["parallel MCP", c => c.policy.supportsParallelToolCalls = true, "hermes_mcp_policy_invalid"],
  ["wildcard tools", c => c.policy.minimumTools = ["companycore_*"], "hermes_mcp_policy_invalid"],
  ["mutating MCP", c => c.policy.minimumTools.push("companycore_post_tasks"), "hermes_mcp_policy_invalid"],
  ["sampling", c => c.policy.sampling = true, "hermes_mcp_policy_invalid"],
  ["inherited credential", c => c.policy.credentialOwner = "provider", "hermes_authority_policy_invalid"],
  ["database", c => c.policy.database = "postgres", "hermes_authority_policy_invalid"],
  ["filesystem", c => c.policy.filesystem = "arbitrary", "hermes_authority_policy_invalid"],
  ...["memory", "kanban", "schedule", "delegation", "session"].map(key => [key, c => c.policy[`${key}Authority`] = "provider", "hermes_authority_policy_invalid"]),
  ["unbounded server", c => c.mcpServers = { other: {} }, "hermes_authority_policy_invalid"]
]) test(`Hermes configuration rejects ${label}`, async () => {
  const config = configured(); mutate(config);
  const report = await inspectExecutionProvider({ executionProvider: config }, { platform: "win32" });
  assert.ok(report.blockers.includes(reason)); assert.ok(report.blockers.includes("hermes_compatibility_unproven"));
  assert.equal(report.executionSupported, false);
});

test("correct declarations and spoofed readiness cannot prove compatibility", async () => {
  const report = await inspectExecutionProvider({ executionProvider: configured() }, { platform: "linux" });
  assert.ok(report.blockers.includes("hermes_windows_required"));
  assert.equal(report.executionSupported, false);
  const forged = contract.projectProvider({ kind: "hermes_codex", ready: true, compatibility: "confirmed", installedVersion: "secret", blockers: [], executablePath: "private" });
  assert.equal(forged.compatibility, "unproven"); assert.equal(forged.installedVersion, null);
  assert.deepEqual(forged.blockers, ["hermes_compatibility_unproven"]);
  assert.equal(JSON.stringify(forged).includes("private"), false);
  for (const value of [null, "direct_codex", {}, { kind: "secret" }]) assert.equal(contract.providerAdmissionReason(value), "execution_provider_unknown");
});

test("Hermes explicit executable existence is inspected without starting it", { skip: process.platform !== "win32" }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-provider-")), executable = path.join(directory, "synthetic.exe");
  try {
    await writeFile(executable, "not an executable; inspection only");
    const config = configured(); config.executablePath = executable;
    const report = await inspectExecutionProvider({ executionProvider: config });
    assert.deepEqual(report.blockers, ["hermes_attestation_missing", "hermes_compatibility_unproven"]);
    await unlink(executable);
    assert.ok((await inspectExecutionProvider({ executionProvider: config })).blockers.includes("hermes_executable_missing"));
  } finally { await rmdir(directory); }
});

for (const kind of ["hermes_codex", "unknown"]) test(`${kind} cannot recover, lock, claim or spawn even if API claims compatibility`, { timeout: 12000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-provider-")), configPath = path.join(directory, "config.json");
  const requests = [], bodies = []; let heartbeats = 0, child;
  const server = createServer(async (req, res) => {
    let body = ""; for await (const chunk of req) body += chunk;
    requests.push(req.url); bodies.push(body);
    res.setHeader("Content-Type", "application/json");
    if (req.url.endsWith("heartbeat") && ++heartbeats === 2) { res.writeHead(401); res.end('{"error":"fixture_finished"}'); return; }
    res.end(JSON.stringify({ data: compatibleHostFixture() }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await writeFile(configPath, JSON.stringify({ executionMode: "supervised", repositories: {}, executionProvider: { ...configured(), kind, executablePath: "PRIVATE_PATH_SENTINEL", secret: "PRIVATE_SECRET_SENTINEL" } }));
    const script = `import cp from 'node:child_process';import{syncBuiltinESMExports}from'node:module';cp.spawn=()=>{console.log('FORBIDDEN_SPAWN');throw Error('spawn_forbidden')};syncBuiltinESMExports();const{runHost}=await import('./scripts/roost-codex-agent-host.mjs');await runHost({acquireLock:()=>{console.log('FORBIDDEN_LOCK');throw Error('lock_forbidden')}});`;
    child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "SYNTHETIC_WORKER_KEY", ROOST_AGENT_HOST_CONFIG: configPath }, stdio: ["ignore", "pipe", "pipe"] });
    let output = ""; child.stdout.on("data", c => output += c); child.stderr.on("data", c => output += c);
    await once(child, "close");
    assert.equal(heartbeats, 2);
    assert.ok(requests.every(url => /\/hosts\//.test(url)));
    for (const value of ["FORBIDDEN", "PRIVATE_PATH_SENTINEL", "PRIVATE_SECRET_SENTINEL", "SYNTHETIC_WORKER_KEY"]) assert.equal((output + bodies.join("")).includes(value), false);
  } finally {
    if (child?.exitCode === null) child.kill();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await unlink(configPath); await rmdir(directory);
  }
});

test("Hermes absence leaves observer online without claims or incidents", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-provider-observe-"));
  const example = JSON.parse(await readFile(new URL("../config/roost-agent-host.example.json", import.meta.url), "utf8"));
  let count = 0; const bodies = [];
  try {
    await runObserver({ config: { ...example, executionMode: "observe", executionProvider: { kind: "hermes_codex" } }, stateDirectory: directory,
      acquireLock: async () => async () => {}, interval: 1, stopped: () => count >= 2,
      api: async (route, options) => { assert.match(route, /\/hosts\//); bodies.push(JSON.parse(options.body)); count++; return { ...compatibleHostFixture(), runtime: { ...compatibleHostFixture().runtime, executionEnabled: false } }; } });
    assert.equal(count, 2); assert.ok(bodies.every(body => body.metadata.executionProvider.blockers.includes("hermes_compatibility_unproven")));
    assert.ok(bodies.every(body => !JSON.stringify(body).includes(example.workspaceRoot)));
    const saved = JSON.parse(await readFile(path.join(directory, "status.json"), "utf8"));
    assert.deepEqual(saved.executionUnavailableReasons, ["observer_mode", "runtime_disabled"]);
  } finally { await unlink(path.join(directory, "status.json")); await rmdir(directory); }
});

test("configuration checker never echoes malformed input or private paths", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "roost-provider-check-"));
  const config = path.join(directory, "PRIVATE_PATH_SENTINEL.json");
  try {
    await writeFile(config, '{"secret":"PRIVATE_SECRET_SENTINEL", broken');
    const child = spawn(process.execPath, ["scripts/validate-roost-execution-provider.mjs", config], {
      windowsHide: true, env: { ...process.env, ROOST_AGENT_HOST_CONFIG: "" }, stdio: ["ignore", "pipe", "pipe"]
    });
    let output = ""; child.stdout.on("data", c => output += c); child.stderr.on("data", c => output += c);
    await once(child, "close");
    assert.equal(child.exitCode, 1); assert.equal(output.trim(), "execution_provider_config_unreadable");
  } finally { await unlink(config); await rmdir(directory); }
});
