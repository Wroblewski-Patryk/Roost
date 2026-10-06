import test from "node:test";
import assert from "node:assert/strict";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput, consumeProviderInput, providerInputTransport, providerInputSchema, measureProviderInput } from "./lib/agent-host-provider-input.mjs";
import { restoreApplicationSharedRecords } from "./lib/agent-host-application-shared-records.mjs";
import { executionContextRevision } from "./lib/agent-host-execution-context.mjs";
const options = f => ({ fresh: { taskContext: f.taskContext, applicationContext: f.applicationContext }, claimed: f.claimed,
  currentCommit: "a".repeat(40), assertAuthority() {}, secrets: ["synthetic-worker-private-key"] });
function fixture() {
  const f = validPacketFixture(), domain = { id: "00000000-0000-4000-8000-000000000080", name: "Synthetic domain", description: "Complete domain requirements. ".repeat(150) },
    dimension = { id: "00000000-0000-4000-8000-000000000081", name: "Synthetic dimension", description: "Complete readiness requirements. ".repeat(150) };
  f.applicationContext.targetCapabilities = Array.from({ length: 24 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(200 + i).padStart(12, "0")}`,
    applicability: "required", targetState: "verified", definition: { id: `00000000-0000-4000-8000-${String(300 + i).padStart(12, "0")}`,
      domainId: domain.id, readinessDimensionId: dimension.id, domain: structuredClone(domain), readinessDimension: structuredClone(dimension), description: "Preserve this distinct capability.", procedures: [] } }));
  f.applicationContext.gaps = [{ id: f.applicationContext.targetCapabilities[0].id, severity: "critical", observedState: "missing", blocked: true }];
  pinReadyFixture(f); return f;
}
test("complete capability records fit unchanged cap through exact shared references; all other evidence remains", () => {
  const f = fixture(), before = structuredClone(f); assert.ok(Buffer.byteLength(JSON.stringify(f.applicationContext)) > 131072);
  const measurement = measureProviderInput(options(f)), envelope = prepareProviderInput(options(f)), app = envelope.evidence.application.value;
  assert.equal(measurement.withinLimit, true);
  assert.equal(measurement.maximumBytes, 131072);
  assert.equal(measurement.inputBytes, Buffer.byteLength(providerInputTransport("direct_codex", envelope).input));
  assert.deepEqual(restoreApplicationSharedRecords(app).targetCapabilities, f.applicationContext.targetCapabilities);
  assert.deepEqual(app.gaps, f.applicationContext.gaps);
  assert.deepEqual(envelope.evidence.sources.value, f.packet.sources);
  assert.equal(envelope.revisions.context, executionContextRevision(f.taskContext, f.applicationContext));
  assert.deepEqual(f, before);
  assert.throws(() => providerInputTransport("direct_codex", measurement), /agent_provider_input_blocked/);
  f.claimed.checkpoint = { stage: "spawn_intent", packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  f.applicationContext.targetCapabilities[23].definition.domain.description += " A changed authoritative record.";
  pinReadyFixture(f);
  assert.throws(() => consumeProviderInput(envelope, options(f)), /agent_provider_input_blocked/);
});
test("shared-record envelope validation refuses mutated records and out-of-range references", () => {
  const e = prepareProviderInput(options(fixture()));
  for (const mutate of [
    x => { x.evidence.application.value.applicationSharedRecords.domain[0].value.description += " changed"; },
    x => { x.evidence.application.value.targetCapabilities[0].definition.domain.sharedRecord = 99; },
    x => { x.evidence.application.value.applicationSharedRecords.originalDigest = "f".repeat(64); }
  ]) {
    const changed = structuredClone(e); mutate(changed); const parsed = providerInputSchema.safeParse(changed);
    assert.equal(parsed.success, false);
    assert.ok(parsed.error.issues.some(x => x.message === "application_shared_records_invalid"));
  }
});
test("original full-context redaction runs before shared references", () => {
  const f = fixture(); f.applicationContext.targetCapabilities[0].definition.domain.description = "synthetic-worker-private-key";
  pinReadyFixture(f); assert.throws(() => prepareProviderInput(options(f)), /agent_runtime_content_blocked/);
});
function relatedFixture() {
  const f = fixture(); f.applicationContext.targetCapabilities.forEach((t, i) => { t.definition.key = 'capability-key-' + i; t.definition.name = 'Capability ' + i; });
  f.applicationContext.observedCapabilities = f.applicationContext.targetCapabilities.map(t => ({ id: t.id,
    definitionKey: t.definition.key, observedState: 'missing', observedSummary: 'Unproved', evidence: [] }));
  f.applicationContext.gaps = f.applicationContext.targetCapabilities.map(t => ({ id: t.id, capabilityDefinitionId: t.definition.id,
    key: t.definition.key, name: t.definition.name, domain: structuredClone(t.definition.domain), applicability: t.applicability,
    targetState: t.targetState, observedState: 'missing', blocked: true, blockedBy: ['Unproved'], severity: 'critical', unknown: { retained: true } }));
  const description = 'Complete identical context text remains authoritative evidence. '.repeat(30);
  f.applicationContext.companyRecords = [{ id: 'document-first', description, state: 'active' },
    { id: 'document-second', description, state: 'unverified' }]; pinReadyFixture(f); return f;
}
test("provider input uses typed lossless v2 relations and description references without changing full context revision", () => {
  const f = relatedFixture(), original = structuredClone(f.applicationContext), envelope = prepareProviderInput(options(f)), app = envelope.evidence.application.value;
  assert.equal(app.applicationSharedRecords.schemaVersion, 'roost-application-shared-records-v2');
  assert.equal(app.applicationSharedRecords.capabilityRelations.gapRecords, 24);
  assert.equal(app.applicationSharedRecords.capabilityRelations.observedRecords, 24);
  assert.equal(app.applicationSharedRecords.companyDescription.length, 1);
  assert.deepEqual(restoreApplicationSharedRecords(app), original); assert.equal(envelope.revisions.context, executionContextRevision(f.taskContext, f.applicationContext));
  assert.equal(measureProviderInput(options(f)).inputBytes, Buffer.byteLength(providerInputTransport('direct_codex', envelope).input));
  for (const mutate of [x => x.gaps[0].sharedCapability = 9, x => x.observedCapabilities[0].observedState = 'invented',
    x => x.companyRecords[0].description.sharedDescription = 8, x => x.applicationSharedRecords.companyDescription[0].value += 'changed']) {
    const changed = structuredClone(envelope); mutate(changed.evidence.application.value);
    assert.equal(providerInputSchema.safeParse(changed).success, false);
  }
  f.claimed.checkpoint = { stage: 'spawn_intent', packetRevision: envelope.revisions.packet, contextRevision: envelope.revisions.context };
  assert.equal(JSON.parse(consumeProviderInput(envelope, options(f)).input).evidence.application.value.applicationSharedRecords.schemaVersion,
    'roost-application-shared-records-v2');
});
test("shared description format never conceals original secrets before projection", () => {
  const f = relatedFixture(); f.applicationContext.companyRecords.forEach(r => r.description = 'synthetic-worker-private-key');
  pinReadyFixture(f); assert.throws(() => prepareProviderInput(options(f)), /agent_runtime_content_blocked/);
});
