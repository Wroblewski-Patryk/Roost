import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { apiCompatibility, protocol } from "./lib/agent-host-protocol.mjs";
import { compatibleHostFixture } from "./fixtures/host-protocol.mjs";

const cases = [
  ["compatible", () => {}, null],
  ["API rejects recovery after admission", h => h.rejectRecovery = true, null],
  ["missing contract", h => delete h.runtime.protocol, "api_protocol_missing"],
  ["missing version", h => delete h.runtime.protocol.version, "api_protocol_missing"],
  ["old protocol", h => h.runtime.protocol.version = 0, "api_protocol_mismatch"],
  ["future protocol", h => h.runtime.protocol.version = 2, "api_protocol_mismatch"],
  ["unknown protocol", h => h.runtime.protocol.version = "1", "api_protocol_mismatch"],
  ["missing API capability", h => h.runtime.protocol.apiCapabilities.pop(), "api_capabilities_missing"],
  ["missing required capability list", h => delete h.runtime.protocol.requiredHostCapabilities, "api_contract_invalid"],
  ["weakened requirements", h => h.runtime.protocol.requiredHostCapabilities.pop(), "api_contract_invalid"],
  ["unknown required host capability", h => h.runtime.protocol.requiredHostCapabilities.push("future_feature"), "host_capabilities_missing"],
  ["server mismatch", h => h.runtime.compatibility.compatible = false, "host_admission_rejected"],
  ["missing server acknowledgement", h => delete h.runtime.compatibility, "host_admission_rejected"],
  ["runtime disabled", h => h.runtime.executionEnabled = false, "runtime_disabled"],
  ["runtime unknown", h => delete h.runtime.executionEnabled, "runtime_state_missing"]
];

for (const [label, mutate, expected] of cases) {
  test(`host admission: ${label}`, () => {
    const host = compatibleHostFixture(); mutate(host);
    assert.equal(apiCompatibility(host.runtime), expected);
  });
  test(`process admission before recovery, lock and spawn: ${label}`, { timeout: 10000 }, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "roost-protocol-"));
    const config = path.join(directory, "config.json");
    const host = compatibleHostFixture(); mutate(host);
    const requests = []; let heartbeats = 0, child;
    const server = createServer(async (req, res) => {
      for await (const _ of req) { /* drain synthetic request */ }
      requests.push(req.url);
      assert.equal(req.headers["x-roost-host-protocol"], String(protocol.version));
      res.setHeader("Content-Type", "application/json");
      if (host.rejectRecovery && req.url.includes("/recovery?")) { res.writeHead(409); res.end('{"error":"agent_host_protocol_blocked"}'); return; }
      if (req.url.endsWith("/heartbeat") && ++heartbeats === 2) { res.writeHead(401); res.end('{"error":"fixture_finished"}'); return; }
      res.end(JSON.stringify({ data: req.url.includes("/recovery?") ? { executions: [], executionEnabled: true } : host }));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      await writeFile(config, JSON.stringify({ repositories: {}, pollIntervalMs: 2000 }));
      const script = `import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';cp.spawn=()=>{console.log('FORBIDDEN_SPAWN');throw Error('spawn_forbidden')};syncBuiltinESMExports();const {runHost}=await import('./scripts/roost-codex-agent-host.mjs');await runHost({acquireLock:()=>{console.log('LOCK_REACHED');throw Error('fixture_finished')}});`;
      child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, env: { ...process.env, ROOST_BASE_URL: `http://127.0.0.1:${server.address().port}`, ROOST_AGENT_API_KEY: "synthetic-only", ROOST_AGENT_HOST_CONFIG: config }, stdio: ["ignore", "pipe", "pipe"] });
      let output = "", errors = ""; child.stdout.on("data", c => output += c); child.stderr.on("data", c => errors += c);
      await once(child, "close");
      assert.equal(output.includes("FORBIDDEN_SPAWN"), false);
      assert.equal(output.includes("LOCK_REACHED"), expected === null && !host.rejectRecovery);
      assert.equal(requests.filter(r => r.includes("/recovery?")).length, expected === null ? 1 : 0);
      assert.equal(requests.some(r => /claim|recover$/.test(r)), false);
      if (expected) { assert.ok(heartbeats >= 2, "blocked process remains in heartbeat loop"); assert.ok(errors.includes(expected)); }
      if (host.rejectRecovery) { assert.ok(heartbeats >= 2); assert.ok(errors.includes("execution_reconciliation_required")); }
    } finally {
      if (child && child.exitCode === null) child.kill();
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      await unlink(config); await rmdir(directory);
    }
  });
}
