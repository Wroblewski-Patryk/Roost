import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectApplicationSharedRecords, assertApplicationSharedRecords, restoreApplicationSharedRecords,
  applicationSharedRecordReferenceSchema, applicationSharedRecordsSchema } from './lib/agent-host-application-shared-records.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function fixture() {
  const domain = { id: 'domain-services', workspaceId: 'fictional-workspace', key: 'services', name: 'Services',
    description: 'Full authoritative domain details '.repeat(8), position: 1, updatedAt: '2026-01-01T12:00:00.000Z', policy: { state: 'required', conditions: ['full context'] } };
  const dimension = { id: 'dimension-health', key: 'health', name: 'Health', weight: 100, position: 1,
    description: 'Full authoritative readiness dimension '.repeat(8), updatedAt: '2026-01-01T12:00:00.000Z' };
  return { schemaVersion: 'application-agent-context-v2', generatedAt: '2026-01-01T12:01:00.000Z', application: { id: 'fictional-app' },
    targetCapabilities: Array.from({ length: 8 }, (_, n) => ({ id: 'capability-' + n, applicability: 'required', targetState: 'healthy',
      definition: { id: 'definition-' + n, domainId: domain.id, readinessDimensionId: dimension.id, domain: structuredClone(domain),
        readinessDimension: structuredClone(dimension), name: 'Capability ' + n, features: [{ id: 'feature-' + n }], procedures: [] } })),
    observedCapabilities: [{ id: 'observed-1', state: 'unknown' }], blockers: ['Runtime proof pending'], gaps: [],
    operatingModel: { procedures: [] }, companyRecords: [{ id: 'document-1', content: 'Preserve every source detail' }],
    authority: { releaseGranted: false }, readiness: { accepted: false } };
}
test('exact duplicate projection preserves all records/ordering/attributes and original full context', () => {
  const input = fixture(), before = structuredClone(input), output = projectApplicationSharedRecords(input);
  assert.deepEqual(input, before); assert.equal(output.targetCapabilities.length, 8);
  assert.equal(output.applicationSharedRecords.domain.length, 1); assert.equal(output.applicationSharedRecords.readinessDimension.length, 1);
  assert.equal(output.applicationSharedRecords.originalDigest, digest(input));
  for (const row of output.targetCapabilities) {
    assert.deepEqual(row.definition.domain, { sharedRecord: 0 }); assert.deepEqual(row.definition.readinessDimension, { sharedRecord: 0 });
    assert.equal(row.definition.procedures.length, 0); assert.equal(row.definition.features.length, 1);
  }
  assert.equal(assertApplicationSharedRecords(output), true); assert.deepEqual(restoreApplicationSharedRecords(output), input);
  assert.deepEqual(projectApplicationSharedRecords(output), output);
  assert.ok(Buffer.byteLength(JSON.stringify(output)) < Buffer.byteLength(JSON.stringify(input)));
});
test('canonical equality shares reordered object keys without dropping unknown full record fields', () => {
  const input = fixture(), d = input.targetCapabilities[1].definition.domain;
  input.targetCapabilities[1].definition.domain = Object.fromEntries(Object.entries(d).reverse());
  const output = projectApplicationSharedRecords(input); assert.equal(output.applicationSharedRecords.domain.length, 1);
  assert.deepEqual(restoreApplicationSharedRecords(output), input);
});
test('same ID with any conflicting field is left inline for the whole group', () => {
  for (const kind of ['domain', 'readinessDimension']) {
    const input = fixture(); input.targetCapabilities[3].definition[kind].description += ' changed';
    const output = projectApplicationSharedRecords(input);
    assert.ok(output.targetCapabilities.every(row => row.definition[kind].sharedRecord === undefined));
    assert.equal(output.applicationSharedRecords[kind].length, 0); assert.deepEqual(restoreApplicationSharedRecords(output), input);
  }
});
test('unsupported/missing/conflicting IDs, null values and singletons remain inline', () => {
  const input = fixture(); input.targetCapabilities[0].definition.domain.id = 'unsupported whitespace';
  delete input.targetCapabilities[1].definition.readinessDimension.id;
  input.targetCapabilities[2].definition.domainId = 'different-id';
  input.targetCapabilities[3].definition.readinessDimension = null;
  const output = projectApplicationSharedRecords(input);
  assert.deepEqual(output.targetCapabilities[0].definition.domain, input.targetCapabilities[0].definition.domain);
  assert.deepEqual(output.targetCapabilities[1].definition.readinessDimension, input.targetCapabilities[1].definition.readinessDimension);
  assert.ok(output.targetCapabilities.every(row => row.definition.domain.sharedRecord === undefined));
  assert.deepEqual(restoreApplicationSharedRecords(output), input);
  const single = fixture(); single.targetCapabilities = single.targetCapabilities.slice(0, 1);
  assert.deepEqual(projectApplicationSharedRecords(single), single); assert.equal(projectApplicationSharedRecords(single).applicationSharedRecords, undefined);
});
test('only the declared target definition and gap domain fields can project; other records retain full data', () => {
  const input = fixture(); input.otherDomain = structuredClone(input.targetCapabilities[0].definition.domain);
  input.operatingModel.domain = structuredClone(input.otherDomain);
  const out = projectApplicationSharedRecords(input); assert.deepEqual(out.otherDomain, input.otherDomain);
  assert.deepEqual(out.operatingModel.domain, input.operatingModel.domain); assert.deepEqual(restoreApplicationSharedRecords(out), input);
});
test('identical IDs across different kinds remain distinct unambiguous local tables', () => {
  const input = fixture(); for (const row of input.targetCapabilities) { row.definition.readinessDimension.id = row.definition.domain.id; row.definition.readinessDimensionId = row.definition.domain.id; }
  const out = projectApplicationSharedRecords(input); assert.notDeepEqual(out.applicationSharedRecords.domain[0].value, out.applicationSharedRecords.readinessDimension[0].value);
  assert.deepEqual(restoreApplicationSharedRecords(out), input);
});
test('shared in-memory row identities are normalized as JSON rows, with no input mutation', () => {
  const input = fixture(); input.targetCapabilities = Array(4).fill(input.targetCapabilities[0]);
  const out = projectApplicationSharedRecords(input); assert.deepEqual(restoreApplicationSharedRecords(out), input);
  assert.equal(input.targetCapabilities[0].definition.domain.sharedRecord, undefined);
});
const bad = {
  missingTable: x => delete x.applicationSharedRecords,
  missingEntry: x => x.applicationSharedRecords.domain.splice(0, 1),
  badIndex: x => x.targetCapabilities[0].definition.domain.sharedRecord = 9,
  fractionalIndex: x => x.targetCapabilities[0].definition.domain.sharedRecord = 0.5,
  negativeIndex: x => x.targetCapabilities[0].definition.domain.sharedRecord = -1,
  supplement: x => x.targetCapabilities[0].definition.domain.supplement = { name: 'replacement' },
  extraReferenceID: x => x.targetCapabilities[0].definition.domain.id = 'replacement',
  mutatedRecord: x => x.applicationSharedRecords.domain[0].value.description += ' edited',
  recalculatedRecordDigest: x => { const row = x.applicationSharedRecords.domain[0]; row.value.description += ' edited'; row.digest = digest(row.value); },
  wrongDigest: x => x.applicationSharedRecords.domain[0].digest = 'f'.repeat(64),
  ambiguousID: x => x.applicationSharedRecords.domain.push(structuredClone(x.applicationSharedRecords.domain[0])),
  extraTableMetadata: x => x.applicationSharedRecords.supplement = {},
  sourceChanged: x => x.companyRecords[0].content += ' edited',
  targetDropped: x => x.targetCapabilities.pop(),
  siblingIDChanged: x => x.targetCapabilities[0].definition.domainId = 'wrong-domain',
  unknownVersion: x => x.applicationSharedRecords.schemaVersion = 'future-unqualified-v2',
  partialInlineSupplement: x => x.targetCapabilities[0].definition.domain = structuredClone(x.applicationSharedRecords.domain[0].value),
  noReferences: x => { for (const row of x.targetCapabilities) row.definition.domain = null; },
  missingSourceDigest: x => delete x.applicationSharedRecords.originalDigest,
  unknownEntryField: x => x.applicationSharedRecords.domain[0].authority = true
};
for (const [name, mutate] of Object.entries(bad)) test(`strict projection rejects ${name}`, () => {
  const x = projectApplicationSharedRecords(fixture()); mutate(x);
  assert.throws(() => assertApplicationSharedRecords(x), /^Error: agent_application_shared_records_invalid$/);
  assert.throws(() => restoreApplicationSharedRecords(x), /^Error: agent_application_shared_records_invalid$/);
});
test('typed schemas refuse supplements or informal references without discovering sources', () => {
  assert.equal(applicationSharedRecordReferenceSchema.safeParse({ sharedRecord: 0 }).success, true);
  for (const v of [{ sharedRecord: 0, supplement: {} }, { id: 'domain-services', digest: 'a'.repeat(64) }, { sharedRecord: '0' }]) assert.equal(applicationSharedRecordReferenceSchema.safeParse(v).success, false);
  assert.equal(applicationSharedRecordsSchema.safeParse(projectApplicationSharedRecords(fixture()).applicationSharedRecords).success, true);
});
test('unsupported complete contexts are unchanged and any orphan reference fails closed', () => {
  for (const value of [null, {}, { targetCapabilities: null }, { targetCapabilities: [{ definition: null }] }]) assert.deepEqual(projectApplicationSharedRecords(value), value);
  const x = fixture(); x.targetCapabilities[0].definition.domain = { sharedRecord: 0 };
  assert.throws(() => projectApplicationSharedRecords(x), /agent_application_shared_records_invalid/);
});

function gapFixture() {
  const input = fixture();
  input.gaps = input.targetCapabilities.map(row => ({ id: 'gap-' + row.id,
    capabilityDefinitionId: row.definition.id, domain: structuredClone(row.definition.domain),
    severity: 'required', blockedBy: [], observation: { state: 'unknown', evidence: ['preserved'] } }));
  return input;
}
test('explicit gap domains reuse the complete domain table through original target relations', () => {
  const input = gapFixture(), before = structuredClone(input), out = projectApplicationSharedRecords(input);
  assert.deepEqual(input, before); assert.equal(out.applicationSharedRecords.domain.length, 1);
  for (let i = 0; i < out.gaps.length; i++) {
    assert.deepEqual(out.gaps[i].domain, out.targetCapabilities[i].definition.domain);
    assert.equal(out.gaps[i].capabilityDefinitionId, input.gaps[i].capabilityDefinitionId);
    assert.deepEqual(out.gaps[i].observation, input.gaps[i].observation);
  }
  assert.deepEqual(restoreApplicationSharedRecords(out), input);
  assert.deepEqual(projectApplicationSharedRecords(out), out);
});
test('one target and its exact gap can share a previously singleton domain without sharing other fields', () => {
  const input = gapFixture(); input.targetCapabilities = input.targetCapabilities.slice(0, 1); input.gaps = input.gaps.slice(0, 1);
  const out = projectApplicationSharedRecords(input);
  assert.equal(out.applicationSharedRecords.domain.length, 1); assert.equal(out.applicationSharedRecords.readinessDimension.length, 0);
  assert.deepEqual(out.gaps[0].domain, { sharedRecord: 0 });
  assert.deepEqual(out.targetCapabilities[0].definition.readinessDimension, input.targetCapabilities[0].definition.readinessDimension);
  assert.deepEqual(restoreApplicationSharedRecords(out), input);
});
test('missing, ambiguous or mismatched gap target relations remain fully inline for the affected group', () => {
  for (const mutate of [x => delete x.gaps[0].capabilityDefinitionId,
    x => x.gaps[0].capabilityDefinitionId = 'unmatched-definition',
    x => x.gaps[0].domainId = 'mismatched-domain',
    x => x.targetCapabilities.push(structuredClone(x.targetCapabilities[0]))]) {
    const input = gapFixture(); mutate(input); const out = projectApplicationSharedRecords(input);
    assert.equal(out.applicationSharedRecords.domain.length, 0);
    assert.deepEqual(out.gaps.map(row => row.domain), input.gaps.map(row => row.domain));
    assert.deepEqual(restoreApplicationSharedRecords(out), input);
  }
});
test('a conflicting full gap domain cannot overwrite any record sharing that ID', () => {
  const input = gapFixture(); input.gaps[0].domain.policy.conditions.push('different full policy');
  const out = projectApplicationSharedRecords(input); assert.equal(out.applicationSharedRecords.domain.length, 0);
  assert.deepEqual(restoreApplicationSharedRecords(out), input);
});
test('gap references reject missing tables/entries, altered relations, extra fields and changed original context', () => {
  for (const mutate of [x => delete x.applicationSharedRecords,
    x => x.applicationSharedRecords.domain.pop(), x => delete x.gaps[0].domain,
    x => x.gaps[0].domain.sharedRecord = 99, x => x.gaps[0].domain.supplement = {},
    x => x.gaps[0].capabilityDefinitionId = 'unmatched-definition',
    x => x.gaps[0].domainId = 'wrong-domain', x => x.gaps[0].observation.state = 'invented',
    x => x.applicationSharedRecords.domain[0].value.policy.conditions.push('tampered')]) {
    const out = projectApplicationSharedRecords(gapFixture()); mutate(out);
    assert.throws(() => restoreApplicationSharedRecords(out), /agent_application_shared_records_invalid/);
  }
});
test('previous v1 target-only projections preserve their original full inline gap records', () => {
  const input = gapFixture(), targetOnly = structuredClone(input); targetOnly.gaps = [];
  const legacy = projectApplicationSharedRecords(targetOnly); legacy.gaps = structuredClone(input.gaps);
  legacy.applicationSharedRecords.originalDigest = digest(input);
  assert.deepEqual(restoreApplicationSharedRecords(legacy), input);
  assert.deepEqual(projectApplicationSharedRecords(legacy), legacy);
  legacy.gaps[0].domain.description += 'changed';
  assert.throws(() => restoreApplicationSharedRecords(legacy), /agent_application_shared_records_invalid/);
});
test('unknown gap shapes and unrelated duplicate fields remain complete inline evidence', () => {
  const input = gapFixture(); input.gaps.push(null, { domain: null }, { domain: { id: 'unsupported whitespace', extra: 'kept' } });
  input.gaps[0].otherDomain = structuredClone(input.gaps[0].domain);
  const out = projectApplicationSharedRecords(input); assert.deepEqual(out.gaps[0].otherDomain, input.gaps[0].otherDomain);
  assert.deepEqual(out.gaps.slice(-3), input.gaps.slice(-3)); assert.deepEqual(restoreApplicationSharedRecords(out), input);
  const orphan = { gaps: [{ domain: { sharedRecord: 0 } }] };
  assert.throws(() => projectApplicationSharedRecords(orphan), /agent_application_shared_records_invalid/);
});

function relationFixture() {
  const x = fixture();
  x.targetCapabilities.forEach((target, i) => { target.definition.key = 'definition-key-' + i; });
  x.observedCapabilities = x.targetCapabilities.map(target => ({ id: target.id, definitionKey: target.definition.key,
    observedState: 'missing', observedSummary: 'No deployed proof', evidence: [], unknownObservation: { retained: true } }));
  x.gaps = x.targetCapabilities.map(target => ({ id: target.id, capabilityDefinitionId: target.definition.id,
    key: target.definition.key, name: target.definition.name, domain: structuredClone(target.definition.domain),
    applicability: target.applicability, targetState: target.targetState, observedState: 'missing',
    severity: 'critical', blocked: true, blockedBy: ['Unproved runtime'], evidenceCount: 0, verifiedEvidenceCount: 0,
    unknownGap: { retainEveryAttribute: true } }));
  const description = 'Identical complete declared technical context, with no runtime approval. '.repeat(30);
  x.companyRecords.push({ id: 'document-2', description, title: 'First distinct record', status: 'active', extra: { preserve: 2 } },
    { id: 'document-3', description, title: 'Second distinct record', status: 'unverified', extra: { preserve: 3 } });
  return x;
}
test('v2 exact capability relations and descriptions restore every original field and known negative', () => {
  const x = relationFixture(), before = structuredClone(x), out = projectApplicationSharedRecords(x), table = out.applicationSharedRecords;
  assert.equal(table.schemaVersion, 'roost-application-shared-records-v2');
  assert.deepEqual(table.capabilityRelations, { schemaVersion: 'roost-capability-relations-v1', gapRecords: 8, observedRecords: 8 });
  assert.equal(table.companyDescription.length, 1); assert.deepEqual(out.companyRecords[1].description, { sharedDescription: 0 });
  for (let i = 0; i < 8; i++) { assert.equal(out.gaps[i].sharedCapability, i); assert.equal(out.observedCapabilities[i].sharedCapability, i);
    assert.equal(out.gaps[i].blocked, true); assert.equal(out.gaps[i].severity, 'critical'); assert.deepEqual(out.gaps[i].unknownGap, x.gaps[i].unknownGap);
    assert.deepEqual(out.observedCapabilities[i].unknownObservation, x.observedCapabilities[i].unknownObservation); }
  assert.deepEqual(restoreApplicationSharedRecords(out), x); assert.deepEqual(x, before);
  assert.deepEqual(projectApplicationSharedRecords(out), out);
  assert.equal(table.originalDigest, digest(x)); assert.ok(Buffer.byteLength(JSON.stringify(out)) < Buffer.byteLength(JSON.stringify(x)));
});
test('relation mismatch or ambiguous joins stay inline without changing distinct authoritative facts', () => {
  for (const mutate of [x => x.gaps[0].name += ' separate value', x => delete x.gaps[0].targetState,
    x => x.observedCapabilities[0].definitionKey = 'different-key', x => x.targetCapabilities.push(structuredClone(x.targetCapabilities[0])),
    x => x.observedCapabilities.push(structuredClone(x.observedCapabilities[0]))]) {
    const x = relationFixture(); mutate(x); const out = projectApplicationSharedRecords(x);
    assert.equal(out.gaps[0].sharedCapability, undefined); assert.deepEqual(restoreApplicationSharedRecords(out), x);
  }
});
test('unrelated unknown marker-like fields on full inline records remain intact', () => {
  const x = relationFixture(); x.gaps[0].sharedCapability = 'unrelated-original-data';
  x.observedCapabilities[0].sharedCapability = 'unrelated-original-data';
  const out = projectApplicationSharedRecords(x); assert.equal(out.gaps[0].id, x.gaps[0].id);
  assert.deepEqual(restoreApplicationSharedRecords(out), x);
});
test('description singleton, conflicting text and duplicate record IDs are not erased or supplemented', () => {
  for (const mutate of [x => x.companyRecords[2].description += ' distinct', x => x.companyRecords[2].id = x.companyRecords[1].id,
    x => x.companyRecords[2].description = null, x => x.companyRecords[2].description = { content: 'full unsupported description' }]) {
    const x = relationFixture(); mutate(x); const out = projectApplicationSharedRecords(x);
    assert.equal(out.applicationSharedRecords.companyDescription, undefined); assert.deepEqual(restoreApplicationSharedRecords(out), x);
  }
});
const badRelations = {
  noTable: x => delete x.applicationSharedRecords,
  wrongVersion: x => x.applicationSharedRecords.schemaVersion = 'roost-application-shared-records-v1',
  noRelation: x => delete x.applicationSharedRecords.capabilityRelations,
  wrongCount: x => x.applicationSharedRecords.capabilityRelations.gapRecords++,
  fractional: x => x.gaps[0].sharedCapability = 0.5,
  badIndex: x => x.gaps[0].sharedCapability = 99,
  supplementName: x => x.gaps[0].name = 'Override original',
  supplementID: x => x.gaps[0].id = 'Override original',
  supplementState: x => x.observedCapabilities[0].definitionKey = 'Override original',
  reusedTarget: x => x.gaps[1].sharedCapability = 0,
  alteredTarget: x => x.targetCapabilities[0].definition.key = 'changed-target-key',
  alteredObservation: x => x.observedCapabilities[0].observedState = 'invented-success',
  lostDistinctField: x => delete x.gaps[0].blocked,
  hiddenField: x => x.gaps[0].unknownGap.extra = 'Added hidden data',
  wrongDescriptionIndex: x => x.companyRecords[1].description.sharedDescription = 9,
  descriptionSupplement: x => x.companyRecords[1].description.supplement = 'Override original',
  missingDescriptionTable: x => delete x.applicationSharedRecords.companyDescription,
  alteredDescription: x => x.applicationSharedRecords.companyDescription[0].value += ' changed',
  rehashedDescription: x => { const e = x.applicationSharedRecords.companyDescription[0]; e.value += ' changed'; e.digest = digest(e.value); },
  duplicateDescription: x => x.applicationSharedRecords.companyDescription.push(structuredClone(x.applicationSharedRecords.companyDescription[0])),
  oneDescriptionUse: x => x.companyRecords[1].description = x.applicationSharedRecords.companyDescription[0].value,
  duplicateDescriptionUser: x => x.companyRecords[2].id = x.companyRecords[1].id,
  extraRelationMetadata: x => x.applicationSharedRecords.capabilityRelations.authority = true
};
for (const [name, mutate] of Object.entries(badRelations)) test(`v2 strict restoration rejects ${name}`, () => {
  const out = projectApplicationSharedRecords(relationFixture()); mutate(out);
  assert.throws(() => restoreApplicationSharedRecords(out), /agent_application_shared_records_invalid/);
});
test('old v1 inputs with all new inline relation data are still restored without a version rewrite', () => {
  const complete = relationFixture(), old = fixture(), legacy = projectApplicationSharedRecords(old);
  legacy.observedCapabilities = structuredClone(complete.observedCapabilities); legacy.gaps = structuredClone(complete.gaps);
  legacy.companyRecords = structuredClone(complete.companyRecords);
  legacy.targetCapabilities.forEach((t, i) => { t.definition.key = complete.targetCapabilities[i].definition.key; });
  legacy.applicationSharedRecords.originalDigest = digest(complete);
  assert.equal(legacy.applicationSharedRecords.schemaVersion, 'roost-application-shared-records-v1');
  assert.deepEqual(restoreApplicationSharedRecords(legacy), complete); assert.deepEqual(projectApplicationSharedRecords(legacy), legacy);
});
test('new relational and description references without their table cannot masquerade as plain evidence', () => {
  for (const x of [{ observedCapabilities: [{ sharedCapability: 0 }] }, { gaps: [{ sharedCapability: 0 }] },
    { companyRecords: [{ id: 'document', description: { sharedDescription: 0 } }] }]) {
    assert.throws(() => projectApplicationSharedRecords(x), /agent_application_shared_records_invalid/);
    assert.throws(() => restoreApplicationSharedRecords(x), /agent_application_shared_records_invalid/);
  }
});
