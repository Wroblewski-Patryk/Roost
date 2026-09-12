import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, readdir, unlink, rmdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inspectExecutionProvider } from "./lib/agent-host-execution-provider.mjs";
import { versionProbeEnvironment } from "./lib/agent-host-hermes-attestation.mjs";
import { terminateWindowsProcessTree } from "./lib/agent-host-execution-lease.mjs";
import { prepareProviderInput, consumeProviderInput, providerInputTransport } from "./lib/agent-host-provider-input.mjs";
import { validPacketFixture } from "./fixtures/execution-packet.mjs";

// Explicit local diagnostic, excluded from ordinary suites. This variable only
// selects a private installation receipt; no task/config field enables a runner.
const configPath = process.env.ROOST_HERMES_BOUNDARY_CONFIG;
test("pinned upstream public client lacks the required capture and tree fences", {
  skip: !configPath || process.platform !== "win32", timeout: 150000
}, async () => {
  const privateConfig = JSON.parse(await readFile(configPath, "utf8"));
  const config = { executionProvider: privateConfig.executionProvider };
  assert.equal(config.executionProvider.enabled, false);
  const expectedBlockers = ["hermes_disabled", "hermes_compatibility_unproven", "hermes_native_tools_isolation_unproven",
    "hermes_output_cost_budget_unproven", "hermes_stop_recovery_unproven"].sort();
  async function freshAttestation() {
    const report = await inspectExecutionProvider(config, { freshAttestation: true });
    assert.equal(report.installation.status, "verified", "fresh installation attestation required");
    assert.deepEqual(report.blockers.sort(), expectedBlockers);
    assert.equal(report.executionSupported, false);
  }
  await freshAttestation();
  const fixture = validPacketFixture();
  const authority = { fresh: { taskContext: fixture.taskContext, applicationContext: fixture.applicationContext },
    claimed: fixture.claimed, currentCommit: "a".repeat(40), assertAuthority() {} };
  const envelope = prepareProviderInput(authority);
  const direct = providerInputTransport("direct_codex", envelope);
  assert.deepEqual(providerInputTransport("hermes_codex", envelope), direct);
  fixture.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  const checkout = path.dirname(path.dirname(path.dirname(config.executionProvider.executablePath)));
  const python = path.join(checkout, "venv", "Scripts", "python.exe");
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), "roost-hermes-boundary-")));
  const home = path.join(directory, "home");
  const source = name => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
  let child;
  try {
    await mkdir(home);
    await writeFile(path.join(directory, "app-server"), await readFile(source("hermes-fake-app-server.py")));
    const env = { ...versionProbeEnvironment(home), USERPROFILE: home, HOME: home, APPDATA: home,
      LOCALAPPDATA: home, TEMP: home, TMP: home, CODEX_HOME: home, RUST_LOG: "off" };
    // Do not accept the heartbeat cache even for this offline experiment.
    await freshAttestation();
    const transport = consumeProviderInput(envelope, authority);
    const result = await new Promise((resolve, reject) => {
      let output = "", bytes = 0, failure, stopping;
      child = spawn(python, ["-I", "-B", source("hermes-transport-boundary.py"), checkout], {
        cwd: directory, env, shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"]
      });
      const fail = () => {
        if (stopping) return;
        failure = Error("hermes_boundary_fixture_failed");
        stopping = terminateWindowsProcessTree(child).catch(() => { failure = Error("hermes_boundary_cleanup_unconfirmed"); });
      };
      const timer = setTimeout(fail, 18000);
      child.stdout.on("data", chunk => { bytes += chunk.length; if (bytes > 32768) fail(); else output += chunk; });
      child.stderr.on("data", fail);
      child.stdin.on("error", fail);
      child.once("error", () => { clearTimeout(timer); reject(Error("hermes_boundary_fixture_start_failed")); });
      child.once("close", async code => {
        clearTimeout(timer);
        await stopping;
        if (failure || code !== 0) {
          try { const diagnostic = JSON.parse(output); if (["import", "spawn", "initialize", "thread", "turn", "probe", "capture", "tree", "wire"].includes(diagnostic.stage)) console.log(`offline fixture stage: ${diagnostic.stage}`);
          } catch { /* discard untrusted output */ }
          reject(failure ?? Error("hermes_boundary_fixture_failed"));
        }
        else { try { resolve(JSON.parse(output)); } catch { reject(Error("hermes_boundary_fixture_result_invalid")); } }
      });
      child.stdin.end(JSON.stringify(transport));
    });
    assert.throws(() => consumeProviderInput(envelope, authority), /agent_provider_input_blocked/);
    assert.equal(result.notificationPayloadBytesAccepted, 32769);
    assert.equal(result.stderrBytesRetained, 32769);
    assert.equal(result.descendantSurvivedClientClose, true);
    assert.equal(result.descendantExitConfirmed, true);
    assert.equal(result.liveInference, false);
    assert.equal(result.wire.turnStarts, 1);
    assert.equal(result.wire.dynamicTools, 0);
    assert.equal(result.wire.forbiddenInheritedVariables, 0);
    assert.equal(result.wire.seal, envelope.seal);
    assert.deepEqual(result.wire.modelSelection, direct.modelSelection);
    assert.equal(result.wire.inputSha256, createHash("sha256").update(direct.input).digest("hex"));
    console.log(JSON.stringify(result));
  } finally {
    if (child && child.exitCode === null) await terminateWindowsProcessTree(child);
    // Normal scoped fixture cleanup. Never visit an existing private PoC folder.
    async function clean(root) {
      for (const entry of await readdir(root, { withFileTypes: true })) {
        const target = path.join(root, entry.name);
        assert.equal(entry.isSymbolicLink(), false);
        if (entry.isDirectory()) await clean(target); else await unlink(target);
      }
      await rmdir(root);
    }
    await clean(directory);
  }
});
