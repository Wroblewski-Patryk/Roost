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
test('only the two capability definition fields can project; all other duplicate records retain full data', () => {
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
