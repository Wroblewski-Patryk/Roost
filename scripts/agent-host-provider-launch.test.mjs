import test from "node:test";
import assert from "node:assert/strict";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch, prepareProviderLaunch, hermesContract } from "./lib/agent-host-provider-launch.mjs";
import { createHermesStreamGuard } from "./lib/agent-host-hermes-stream.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const provider = () => ({ kind: "hermes_codex", enabled: true, officialSource: pin.officialSource,
  version: pin.version, commit: pin.commit, executablePath: "C:\\Fictional\\Runtime\\hermes.exe",
  policy: structuredClone(contract.registry.hermesPolicy) });

test("quiet pin compatibility never removes config, single-turn or process ownership gates", () => {
  assert.equal(pin.supervisedQuietQualification.contractVersion, hermesContract.version);
  assert.equal(pin.supervisedQuietQualification.status, "public_argv_verified");
  for (const installation of [undefined, { status: "verified", version: pin.version,
    fingerprint: "a".repeat(12), signature: "unsigned", checkedAt: "2026-09-15T00:00:00.000Z" }]) {
    const report = contract.projectProvider({ kind: "hermes_codex", installation,
      compatibility: "confirmed", cliLaunchQualification: { status: "compatible" }, blockers: [] });
    assert.equal(report.blockers.includes("hermes_cli_pin_incompatible"), false);
    assert.ok(report.blockers.includes("hermes_single_turn_enforcement_unproven"));
    assert.ok(report.blockers.includes("hermes_stop_recovery_unproven"));
    assert.equal(report.executionSupported, false);
  }
});
function fixture(change = () => {}) {
  const f = validPacketFixture(); change(f); pinReadyFixture(f);
  const consumption = { fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext },
    claimed: f.claimed, currentCommit: "a".repeat(40), assertAuthority() {}, secrets: ["synthetic-private-value"] };
  const envelope = prepareProviderInput(consumption);
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  return { f, consumption, options: { provider: provider(), envelope, repositoryPath: "C:\\Fictional\\Applications\\Sample",
    codexCommand: "synthetic-codex", sandbox: "workspace-write", platform: "win32", secrets: consumption.secrets } };
}
test("documented Hermes projection carries one sealed stdin and exact model/effort, never a runnable plan", () => {
  const { options } = fixture(); const plan = projectProviderLaunch(options);
  assert.equal(plan.version, "roost-hermes-supervised-quiet-v1");
  assert.deepEqual(plan.candidateArgs, ["chat", "--oneshot", "--quiet", "--query-file", "-",
    "--provider", "openai-codex", "--model", "gpt-5.6-sol", "--reasoning", "medium"]);
  assert.equal(JSON.parse(plan.input).seal, options.envelope.seal);
  assert.equal(plan.requiredConfig.reasoningEffort, "medium");
  assert.equal(plan.requiredConfig.configReceipt, null);
  assert.equal(plan.command, null); assert.equal(plan.args, null);
  assert.equal(plan.shell, false); assert.equal(plan.limits.maxQueries, 1);
  assert.equal(plan.cwd, options.repositoryPath); assert.ok(Object.isFrozen(plan));
  assert.ok(plan.blockers.includes("hermes_public_launch_contract_unqualified"));
  const forged = projectProviderLaunch({ ...options, ownedTreeReceipt: { version: "roost-windows-job-v1",
    cleanup: true, activeProcesses: 0, assignedBeforeResume: true, killOnClose: true } });
  assert.ok(forged.blockers.includes("hermes_stop_recovery_unproven"));
  assert.throws(() => { plan.candidateArgs.push("--yolo"); }, TypeError);
});
for (const [name, change] of Object.entries({
  relative: o => o.provider.executablePath = "hermes.exe",
  traversal: o => o.provider.executablePath = "C:\\Fictional\\..\\hermes.exe",
  unc: o => o.provider.executablePath = "\\\\server\\hermes.exe",
  shell: o => o.provider.executablePath = "C:\\Fictional\\hermes.cmd",
  wrongPin: o => o.provider.commit = "a".repeat(40),
  wrongVersion: o => o.provider.version = "latest",
  wrongIdentity: o => o.provider.officialSource = "https://example.invalid",
  flags: o => o.provider.args = ["--yolo"],
  cwd: o => o.provider.cwd = "C:\\Fictional\\Other",
  invalidCwd: o => o.repositoryPath = "relative",
  mcp: o => o.provider.mcpServers = { extra: {} },
  tools: o => o.provider.policy.minimumTools.push("arbitrary_tool"),
  provider: o => o.provider.modelProvider = "auto",
  fallback: o => o.provider.fallbackModel = "other",
  model: o => o.provider.model = "other",
  effort: o => o.provider.reasoningEffort = "low",
  memory: o => o.provider.policy.memoryAuthority = "provider",
  delegation: o => o.provider.policy.delegationAuthority = "provider",
  secret: o => o.provider.apiKey = "synthetic-private-value",
  disabled: o => o.provider.enabled = false,
  platform: o => o.platform = "linux",
  sandbox: o => o.sandbox = "danger-full-access",
  forgedCapability: o => o.provider.executionSupported = true,
  forgedEnvelope: o => o.envelope = structuredClone(o.envelope)
})) test(`Hermes denies ${name} without reflecting private input`, () => {
  const { options } = fixture(); change(options);
  assert.throws(() => projectProviderLaunch(options), e => {
    assert.equal(JSON.stringify({ message: e.message, details: e.details }).includes("synthetic-private-value"), false);
    assert.equal(JSON.stringify(e).includes("Fictional"), false); return true;
  });
});
for (const change of [f => f.packet.contract.modelSelection.model = "unknown", f => f.packet.contract.modelSelection.reasoningEffort = "none"])
  test("invalid model/effort cannot enter sealed launch input", () => assert.throws(() => fixture(change)));
test("Hermes refuses retry-enabled attempts", () => {
  const { options } = fixture(f => f.packet.contract.budgets.maxAttempts = 2);
  assert.throws(() => projectProviderLaunch(options), /hermes_single_attempt_required/);
});
test("known prompt secrets and substituted sealed model/effort are denied", () => {
  assert.throws(() => fixture(f => f.claimed.prompt = "synthetic-private-value"));
  for (const field of ["model", "reasoningEffort"]) {
    const { f, options, consumption } = fixture();
    f.packet.contract.modelSelection[field] = field === "model" ? "gpt-6-astra" : "high";
    pinReadyFixture(f);
    assert.throws(() => prepareProviderLaunch(options, consumption), /agent_provider_input_blocked/);
  }
});
test("new public CLI remains denied even with synthetic outer admission; seal cannot be reused", () => {
  const { options, consumption } = fixture(); let launches = 0;
  assert.throws(() => { prepareProviderLaunch(options, consumption); launches++; }, /hermes_profile_ready_changed/);
  assert.throws(() => prepareProviderLaunch(options, consumption), /agent_provider_input_blocked/);
  assert.equal(launches, 0);
  const report = contract.projectProvider({ kind: "hermes_codex", ready: true });
  assert.equal(report.executionSupported, false);
  for (const blocker of hermesContract.blockers) assert.ok(report.blockers.includes(blocker));
});
test("direct dispatch preserves argv/stdin and consumes exactly once", () => {
  const { options, consumption } = fixture(); options.provider = undefined;
  const plan = prepareProviderLaunch(options, consumption);
  assert.equal(plan.command, "synthetic-codex");
  assert.deepEqual(plan.args, ["exec", "--ephemeral", "--json", "--sandbox", "workspace-write", "--model", "gpt-5.6-sol",
    "--config", 'model_provider="openai"', "--config", 'model_reasoning_effort="medium"', "-"]);
  assert.equal(JSON.parse(plan.input).seal, options.envelope.seal);
  assert.throws(() => prepareProviderLaunch(options, consumption), /agent_provider_input_blocked/);
});
test("cancellation and expiry at final authority read cannot yield a launch", () => {
  for (const flag of ["contextStop", "durationLimit"]) {
    const { options, consumption } = fixture();
    consumption.assertAuthority = () => { throw Object.assign(Error("authority_expired"), { [flag]: true }); };
    assert.throws(() => prepareProviderLaunch(options, consumption), /authority_expired/);
  }
});
const selection = { model: "gpt-5.6-sol", reasoningEffort: "medium" };
const init = { type: "system", subtype: "init", timestamp: 1, model: selection.model, session_id: "synthetic-session" };
const done = { type: "result", timestamp: 2, session_id: init.session_id, exit_code: 0, text: "Synthetic result",
  tokens: { input: 1, output: 2, total: 3, cache_read: 0, cache_write: 0 }, duration_ms: 1 };
const guard = extra => createHermesStreamGuard({ modelSelection: selection, maxDurationSeconds: 60, ...extra });
const emit = (g, e) => g.write("stdout", Buffer.from(JSON.stringify(e) + "\n"));
test("public stream schema accepts chunked one-result receipt without claiming process or cost enforcement", () => {
  const g = guard(); const bytes = Buffer.from(JSON.stringify(init) + "\n" + JSON.stringify(done) + "\n");
  for (const byte of bytes) g.write("stdout", Buffer.from([byte]));
  const result = g.finish(0);
  assert.equal(result.finalResponse, done.text); assert.equal(result.treeStopped, false);
  assert.equal(result.accounting, "reported_final_only");
  assert.throws(() => g.finish(0), /hermes_stream_closed/);
});
for (const [name, events, exit] of [
  ["second turn", [init, init], 0], ["second result", [init, done, done], 0],
  ["model rotation", [{ ...init, model: "other" }], 0],
  ["native tool", [init, { type: "tool_use", timestamp: 2, name: "terminal" }], 0],
  ["MCP tool", [init, { type: "tool_use", timestamp: 2, name: "roost_get_execution_packet" }], 0],
  ["missing result", [init], 0], ["result before init", [done], 0],
  ["wrong session", [init, { ...done, session_id: "other" }], 0],
  ["cancelled terminal", [init, { ...done, exit_code: 130 }], 130],
  ["mismatching exit", [init, done], 1], ["unknown event", [init, { type: "retry", timestamp: 2 }], 0]
]) test(`stream rejects ${name}`, () => {
  const g = guard(); assert.throws(() => { for (const e of events) emit(g, e); g.finish(exit); });
});
test("stream timeout, cancel, byte/line ceilings and malformed output fail closed", () => {
  let now = 0; const g = guard({ now: () => now }); emit(g, init); now = 60000;
  assert.throws(() => g.finish(0), /hermes_stream_timeout/);
  const controller = new AbortController(), cancelled = guard({ signal: controller.signal }); controller.abort();
  assert.throws(() => emit(cancelled, init), /hermes_stream_cancelled/);
  for (const [channel, bytes] of [["stdout", 131073], ["stderr", 32769], ["stdout", 16385]])
    assert.throws(() => guard().write(channel, Buffer.alloc(bytes, 65)), /hermes_stream_limit/);
  assert.throws(() => guard().write("stdout", Buffer.from("broken\n")), /hermes_stream_invalid/);
});
test("split secrets never produce a successful receipt", () => {
  const secret = "synthetic-private-value", g = guard({ secrets: [secret] }); emit(g, init);
  emit(g, { type: "text", timestamp: 2, text: secret.slice(0, 10) });
  emit(g, { type: "text", timestamp: 3, text: secret.slice(10) }); emit(g, done);
  assert.throws(() => g.finish(0), /hermes_stream_sensitive/);
});
test("event count is finite and an empty final answer is not success", () => {
  const g = guard(); emit(g, init);
  assert.throws(() => { for (let i = 0; i < 256; i++) emit(g, { type: "text", timestamp: 2, text: "a" }); }, /hermes_stream_limit/);
  const empty = guard(); emit(empty, init); emit(empty, { ...done, text: "" });
  assert.throws(() => empty.finish(0), /hermes_stream_failed/);
});
