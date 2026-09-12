import test from "node:test";
import assert from "node:assert/strict";
import { validPacketFixture, pinReadyFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, consumeProviderInput, providerInputTransport, providerInputSchema } from "./lib/agent-host-provider-input.mjs";
import { codexExecutionArgs } from "./lib/agent-host-model-policy.mjs";
import { createExecutionLease } from "./lib/agent-host-execution-lease.mjs";
import { createExecutionDuration } from "./lib/agent-host-execution-duration.mjs";
import { createObservedOutputBudget } from "./lib/agent-host-output-budget.mjs";
const options = f => ({ fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
  currentCommit: "a".repeat(40), assertAuthority() {}, secrets: ["synthetic-worker-private-key"] });
const prepare = f => prepareProviderInput(options(f));
function checkpoint(f, envelope) { f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context }; }

test("same canonical input for both providers, stable seal, exact model and no bootstrap tools", () => {
  const f = validPacketFixture(), envelope = prepare(f);
  assert.ok(providerInputSchema.safeParse(envelope).success);
  const direct = providerInputTransport("direct_codex", envelope), hermes = providerInputTransport("hermes_codex", envelope);
  assert.deepEqual(direct, hermes); assert.deepEqual(direct.startupTools, []);
  assert.equal(envelope.contract.objective.outcome, f.packet.contract.objective.outcome);
  assert.deepEqual(envelope.contract.acceptance, f.packet.contract.acceptance);
  assert.equal(JSON.stringify(envelope).includes(f.claimed.leaseToken), false);
  assert.equal(JSON.stringify(envelope).includes("synthetic-worker-private-key"), false);
  assert.equal(JSON.stringify(envelope).includes("roost_get_execution_packet"), false);
  for (const entry of Object.values(envelope.evidence)) { assert.equal(entry.trust, "untrusted_evidence"); assert.ok(entry.provenance); }
  f.taskContext.generatedAt = "2030-01-01T00:00:00Z"; f.applicationContext.generatedAt = "2030-01-02T00:00:00Z";
  assert.equal(prepare(f).seal, envelope.seal);
  checkpoint(f, envelope); const result = consumeProviderInput(envelope, options(f));
  assert.deepEqual(result, direct);
  const args = codexExecutionArgs(result.modelSelection, "workspace-write");
  assert.equal(args[args.indexOf("--model") + 1], "gpt-5.6-sol"); assert.ok(args.includes('model_reasoning_effort="medium"'));
  assert.throws(() => consumeProviderInput(envelope, options(f)), /agent_provider_input_blocked/);
});

for (const [name, change] of Object.entries({
  missingObjective: f => delete f.packet.contract.objective,
  missingReady: f => delete f.taskContext.readyAdmission,
  staleSource: f => { f.packet.sources[0].description = "Changed"; sealPacket(f.packet); },
  staleDecision: f => f.taskContext.decisions.push({ id: f.claimed.taskId }),
  oldModel: f => { f.packet.contract.modelSelection.model = "gpt-5.5"; pinReadyFixture(f); },
  missingEffort: f => { delete f.packet.contract.modelSelection.reasoningEffort; pinReadyFixture(f); },
  extraModelField: f => { f.packet.contract.modelSelection.provider = "other"; pinReadyFixture(f); },
  extraSource: f => { f.applicationContext.extraSource = { text: "unapproved" }; pinReadyFixture(f); },
  unrelatedPacketSource: f => { f.packet.sources.push({ ...f.packet.sources[0], id: f.claimed.id }); pinReadyFixture(f); },
  secret: f => { f.packet.contract.objective.outcome = "synthetic-worker-private-key"; pinReadyFixture(f); },
  credential: f => { f.applicationContext.application.password = "synthetic-sensitive-value"; pinReadyFixture(f); },
  privatePath: f => { f.packet.contract.scope.allowed = ["C:\\Private\\fixture"]; pinReadyFixture(f); },
  excessiveContext: f => { f.applicationContext.application.description = "x".repeat(131072); pinReadyFixture(f); },
  wrongExecution: f => { f.claimed.id = f.claimed.taskId; },
  wrongAttempt: f => { f.claimed.attempt = 2; },
  expiredRisk: f => { f.taskContext.readyAdmission.riskAdmission.expiresAt = "2000-01-01T00:00:00Z"; },
  revokedRole: f => { f.taskContext.task.assignedWorkforceEntity.authorityScope = []; },
  badComposition: f => { f.packet.procedureComposition.status = "conflicting"; pinReadyFixture(f); }
})) test(`initial admission fails closed: ${name}`, () => {
  const f = validPacketFixture(); change(f);
  assert.throws(() => prepare(f), error => {
    assert.equal(JSON.stringify({ message: error.message, details: error.details }).includes("synthetic-sensitive-value"), false);
    assert.equal(JSON.stringify({ message: error.message, details: error.details }).includes("C:\\Private"), false);
    return true;
  });
});

for (const field of ["id", "workspaceId", "taskId", "applicationId", "attempt"]) test(`spawn rejects scope substitution: ${field}`, () => {
  const f = validPacketFixture(), envelope = prepare(f); checkpoint(f, envelope);
  f.claimed[field] = field === "attempt" ? 2 : "00000000-0000-4000-8000-000000000999";
  assert.throws(() => consumeProviderInput(envelope, options(f)));
});
for (const field of ["contract", "identity", "evidence", "revisions", "seal", "startupTools"]) test(`provider cannot replace or mutate envelope: ${field}`, () => {
  const f = validPacketFixture(), envelope = prepare(f); checkpoint(f, envelope);
  assert.throws(() => { envelope[field] = {}; }, TypeError);
  assert.throws(() => { envelope.contract.modelSelection.reasoningEffort = "low"; }, TypeError);
  const replacement = structuredClone(envelope); replacement[field] = {};
  assert.throws(() => providerInputTransport("hermes_codex", replacement), /agent_provider_input_blocked/);
  assert.throws(() => consumeProviderInput(replacement, options(f)), /agent_provider_input_blocked/);
});
test("untrusted boundary errors are redacted and failed consumption is burned", () => {
  const f = validPacketFixture(), envelope = prepare(f); checkpoint(f, envelope);
  let spawns = 0;
  assert.throws(() => { consumeProviderInput(envelope, { ...options(f), assertAuthority() { throw Error("synthetic-sensitive-value"); } }); spawns++; }, error => error.message === "agent_provider_input_blocked");
  assert.equal(spawns, 0); assert.throws(() => consumeProviderInput(envelope, options(f)), /agent_provider_input_blocked/);
});
test("existing lease, duration and output guards reject changed authority before consumption", async () => {
  for (const gate of ["lease", "duration", "output"]) {
    const f = validPacketFixture(); let now = 0;
    const lease = createExecutionLease({ renew: async () => ({ leaseExpiresAt: new Date(Date.now() + 90000).toISOString() }), onLost() {}, now: () => gate === "duration" ? 0 : now, setTimer: () => 0, clearTimer() {} });
    await lease.refresh();
    const duration = createExecutionDuration({ startedAt: f.claimed.startedAt, maxDurationSeconds: 600, onExpired() {}, now: () => now, setTimer: () => 0, clearTimer() {} });
    const budget = createObservedOutputBudget({ maxOutputTokens: 4000, onStopped() {} });
    const admission = { ...options(f), assertAuthority() { lease.assertValid(); duration.assertWithinBudget(); budget.assertWithinBudget(); } };
    const envelope = prepareProviderInput(admission); checkpoint(f, envelope);
    if (gate === "lease") now = 90000;
    if (gate === "duration") now = 600000;
    if (gate === "output") assert.throws(() => budget.observeUsage({ output_tokens: 4000 }));
    assert.throws(() => consumeProviderInput(envelope, admission));
    lease.stop(); duration.stop();
  }
});
for (const field of ["model", "reasoningEffort", "access", "source"]) test(`provider cannot substitute newly sealed material at spawn: ${field}`, () => {
  const f = validPacketFixture(), envelope = prepare(f); checkpoint(f, envelope);
  if (field === "model") f.packet.contract.modelSelection.model = "gpt-6-astra";
  if (field === "reasoningEffort") f.packet.contract.modelSelection.reasoningEffort = "high";
  if (field === "access") f.packet.contract.access.restrictions.push("new restriction");
  if (field === "source") f.packet.sources[0].description = "Provider-selected evidence";
  pinReadyFixture(f);
  assert.throws(() => consumeProviderInput(envelope, options(f)));
});
test("changed Ready-approved material cannot silently refresh the active envelope", () => {
  const f = validPacketFixture(), envelope = prepare(f); checkpoint(f, envelope);
  f.packet.contract.objective.outcome = "Different approved outcome"; pinReadyFixture(f);
  assert.throws(() => consumeProviderInput(envelope, options(f)));
  assert.equal(envelope.contract.objective.outcome, "Repair the synthetic fixture");
});
