import { createHash } from 'node:crypto';
import { z } from 'zod';

const fields = ['domain', 'readinessDimension'];
const tableKey = 'applicationSharedRecords';
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const canonical = value => Array.isArray(value) ? value.map(canonical) : plain(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const invalid = () => { throw Error('agent_application_shared_records_invalid'); };
function jsonSafe(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) && !plain(value) || seen.has(value)) return false;
  seen.add(value); const valid = Object.values(value).every(item => jsonSafe(item, seen)); seen.delete(value); return valid;
}
function clone(value) { try { return structuredClone(value); } catch { return invalid(); } }
export const applicationSharedRecordReferenceSchema = z.object({ sharedRecord: z.number().int().min(0) }).strict();
const entrySchema = z.object({ digest: hash, value: z.record(z.unknown()) }).strict();
const v1Schema = z.object({ schemaVersion: z.literal('roost-application-shared-records-v1'),
  originalDigest: hash, domain: z.array(entrySchema), readinessDimension: z.array(entrySchema) }).strict();
export const applicationSharedDescriptionReferenceSchema = z.object({ sharedDescription: z.number().int().min(0) }).strict();
const capabilityRelationsSchema = z.object({ schemaVersion: z.literal('roost-capability-relations-v1'),
  gapRecords: z.number().int().min(0), observedRecords: z.number().int().min(0) }).strict();
const descriptionEntrySchema = z.object({ digest: hash, value: z.string().max(65536) }).strict();
const v2Schema = v1Schema.extend({ schemaVersion: z.literal('roost-application-shared-records-v2'),
  capabilityRelations: capabilityRelationsSchema.optional(), companyDescription: z.array(descriptionEntrySchema).optional() }).strict();
const valueEntrySchema = z.object({ value: z.record(z.unknown()) }).strict();
const descriptionValueEntrySchema = z.object({ value: z.string().max(65536) }).strict();
const v3Schema = v2Schema.extend({ schemaVersion: z.literal('roost-application-shared-records-v3'),
  valueDigestAlgorithm: z.literal('canonical-json-sha256'), sourceTableVersion: z.enum(['v1', 'v2']), domain: z.array(valueEntrySchema),
  readinessDimension: z.array(valueEntrySchema), companyDescription: z.array(descriptionValueEntrySchema).optional() }).strict();
export const applicationSharedRecordsSchema = z.discriminatedUnion('schemaVersion', [v1Schema, v2Schema, v3Schema]);

// Presentation only: every omitted digest is derived from its unchanged full
// value. The inverse restores the exact v1/v2 table before its original full-context
// digest and all pointer/duplicate/singleton checks are evaluated.
export function restoreApplicationSharedRecordValues(application, expectedOriginal) {
  if (!plain(application) || !jsonSafe(application)) invalid();
  const output = clone(application), table = output[tableKey];
  if (table?.schemaVersion === 'roost-application-shared-records-v3') {
    const parsed = v3Schema.safeParse(table); if (!parsed.success) invalid();
    const { valueDigestAlgorithm: ignored, sourceTableVersion, ...restored } = parsed.data;
    restored.schemaVersion = 'roost-application-shared-records-' + sourceTableVersion;
    for (const field of [...fields, 'companyDescription']) if (Object.hasOwn(restored, field))
      restored[field] = restored[field].map(({ value }) => ({ digest: digest(value), value }));
    output[tableKey] = restored;
  }
  // This runs the existing strict inverse, not a second authority mechanism.
  restoreApplicationSharedRecords(output);
  if (expectedOriginal !== undefined && (!plain(expectedOriginal) || !jsonSafe(expectedOriginal)
      || digest(output) !== digest(expectedOriginal))) invalid();
  return output;
}
export function projectApplicationSharedRecordValues(application, expectedOriginal) {
  if (expectedOriginal === undefined) invalid();
  const original = restoreApplicationSharedRecordValues(application, expectedOriginal);
  if (!['roost-application-shared-records-v1', 'roost-application-shared-records-v2'].includes(original[tableKey]?.schemaVersion)) return original;
  const output = clone(original), table = output[tableKey];
  table.sourceTableVersion = table.schemaVersion.endsWith('-v1') ? 'v1' : 'v2';
  table.schemaVersion = 'roost-application-shared-records-v3';
  table.valueDigestAlgorithm = 'canonical-json-sha256';
  for (const field of [...fields, 'companyDescription']) if (Object.hasOwn(table, field))
    table[field] = table[field].map(({ value }) => ({ value }));
  restoreApplicationSharedRecordValues(output, original);
  return output;
}
const capabilityFields = ['id', 'capabilityDefinitionId', 'key', 'name', 'domain', 'applicability', 'targetState', 'observedState'];
const capabilityReference = row => plain(row) && Object.hasOwn(row, 'sharedCapability') && !Object.hasOwn(row, 'id');
const descriptionReference = value => plain(value) && Object.hasOwn(value, 'sharedDescription');
const capabilityRows = application => [...(Array.isArray(application?.observedCapabilities) ? application.observedCapabilities : []),
  ...(Array.isArray(application?.gaps) ? application.gaps : [])];
function targetAt(application, index) {
  if (!Number.isSafeInteger(index) || index < 0 || !Array.isArray(application.targetCapabilities)) invalid();
  const target = application.targetCapabilities[index];
  if (!supported(target) || !supported(target.definition)
      || application.targetCapabilities.filter(row => row?.id === target.id).length !== 1) invalid();
  return target;
}
function gapValues(application, target) {
  const observed = Array.isArray(application.observedCapabilities)
    ? application.observedCapabilities.filter(row => supported(row) && row.id === target.id) : [];
  if (observed.length !== 1 || !Object.hasOwn(observed[0], 'observedState') || !Object.hasOwn(observed[0], 'definitionKey')
      || !Object.hasOwn(target.definition, 'key') || digest(observed[0].definitionKey) !== digest(target.definition.key)
      || !['key', 'name', 'domain'].every(key => Object.hasOwn(target.definition, key))
      || !['applicability', 'targetState'].every(key => Object.hasOwn(target, key))) invalid();
  return { id: target.id, capabilityDefinitionId: target.definition.id, key: target.definition.key,
    name: target.definition.name, domain: clone(target.definition.domain), applicability: target.applicability,
    targetState: target.targetState, observedState: clone(observed[0].observedState) };
}
function restoreRelations(application, table) {
  const counts = { gapRecords: 0, observedRecords: 0 }, relation = table.capabilityRelations;
  for (const [array, copied, count] of [['observedCapabilities', ['id', 'definitionKey'], 'observedRecords'],
    ['gaps', capabilityFields, 'gapRecords']]) {
    if (!Array.isArray(application[array])) continue;
    const targetsUsed = new Set();
    for (let i = 0; i < application[array].length; i++) {
      const row = application[array][i]; if (!capabilityReference(row)) continue;
      if (!relation || copied.some(key => Object.hasOwn(row, key)) || targetsUsed.has(row.sharedCapability)) invalid();
      const target = targetAt(application, row.sharedCapability);
      if (application[array].some(other => other !== row && other?.id === target.id)) invalid();
      const restored = array === 'gaps' ? gapValues(application, target) : { id: target.id, definitionKey: target.definition.key };
      if (array === 'observedCapabilities' && !Object.hasOwn(target.definition, 'key')) invalid();
      const { sharedCapability: ignored, ...distinct } = row;
      application[array][i] = { ...restored, ...distinct }; targetsUsed.add(row.sharedCapability); counts[count]++;
    }
  }
  if (relation && (relation.gapRecords !== counts.gapRecords || relation.observedRecords !== counts.observedRecords
      || counts.gapRecords + counts.observedRecords === 0)) invalid();
  const descriptions = table.companyDescription ?? [], uses = descriptions.map(() => new Set()), digests = new Set();
  for (const entry of descriptions) {
    if (digest(entry.value) !== entry.digest || digests.has(entry.digest)) invalid(); digests.add(entry.digest);
  }
  for (const row of Array.isArray(application.companyRecords) ? application.companyRecords : []) {
    if (!descriptionReference(row?.description)) continue;
    const parsed = applicationSharedDescriptionReferenceSchema.safeParse(row.description);
    if (!supported(row) || !parsed.success || application.companyRecords.filter(other => other?.id === row.id).length !== 1) invalid();
    const entry = descriptions[parsed.data.sharedDescription]; if (!entry) invalid();
    uses[parsed.data.sharedDescription].add(row.id); row.description = entry.value;
  }
  if (uses.some(ids => ids.size < 2) || !relation && !descriptions.length) invalid();
}
function projectRelations(application, table) {
  const candidate = clone(application), counts = { gapRecords: 0, observedRecords: 0 };
  if (Array.isArray(candidate.targetCapabilities)) {
    // Gaps use the original observed rows. Restore performs the inverse order.
    for (const [array, copied, count] of [['gaps', capabilityFields, 'gapRecords'],
      ['observedCapabilities', ['id', 'definitionKey'], 'observedRecords']]) {
      if (!Array.isArray(candidate[array])) continue;
      for (const row of candidate[array]) {
        if (!supported(row) || Object.hasOwn(row, 'sharedCapability')
            || candidate[array].filter(other => other?.id === row.id).length !== 1) continue;
        const matches = candidate.targetCapabilities.map((target, index) => ({ target, index })).filter(({ target }) => target?.id === row.id);
        if (matches.length !== 1) continue;
        try {
          const target = targetAt(candidate, matches[0].index);
          const source = array === 'gaps' ? gapValues(candidate, target) : { id: target.id, definitionKey: target.definition.key };
          if (copied.some(key => !Object.hasOwn(row, key) || !Object.hasOwn(source, key) || digest(row[key]) !== digest(source[key]))) continue;
          for (const key of copied) delete row[key]; row.sharedCapability = matches[0].index; counts[count]++;
        } catch { /* Unsupported or ambiguous relations retain full inline data. */ }
      }
    }
  }
  const descriptions = [], groups = new Map(), records = Array.isArray(candidate.companyRecords) ? candidate.companyRecords : [];
  for (const row of records) {
    if (!supported(row) || typeof row.description !== 'string' || row.description.length > 65536
        || records.filter(other => other?.id === row.id).length !== 1) continue;
    const key = digest(row.description), group = groups.get(key) ?? { value: row.description, rows: [], conflict: false };
    if (group.value !== row.description) group.conflict = true; group.rows.push(row); groups.set(key, group);
  }
  for (const [key, group] of groups) {
    if (group.conflict || group.rows.length < 2) continue;
    const index = descriptions.length; descriptions.push({ digest: key, value: group.value });
    for (const row of group.rows) row.description = { sharedDescription: index };
  }
  if (!counts.gapRecords && !counts.observedRecords && !descriptions.length) return application;
  const next = { ...table, schemaVersion: 'roost-application-shared-records-v2',
    ...(counts.gapRecords + counts.observedRecords ? { capabilityRelations: { schemaVersion: 'roost-capability-relations-v1', ...counts } } : {}),
    ...(descriptions.length ? { companyDescription: descriptions } : {}) };
  candidate[tableKey] = next;
  if (Buffer.byteLength(JSON.stringify(candidate)) >= Buffer.byteLength(JSON.stringify(application))) return application;
  assertApplicationSharedRecords(candidate); return candidate;
}
function slots(application) {
  const targets = Array.isArray(application?.targetCapabilities)
    ? application.targetCapabilities.filter(row => plain(row?.definition)) : [];
  const definitions = targets.flatMap(row => fields.filter(field => Object.hasOwn(row.definition, field))
    .map(field => ({ definition: row.definition, field, expectedId: row.definition[field + 'Id'], gap: false })));
  const gaps = Array.isArray(application?.gaps) ? application.gaps.filter(row => plain(row) && Object.hasOwn(row, 'domain')) : [];
  return [...definitions, ...gaps.map(row => {
    // Gap rows have capabilityDefinitionId rather than domainId. A reference
    // must resolve through exactly one original target definition relation.
    const matches = targets.filter(target => id.safeParse(row.capabilityDefinitionId).success
      && target.definition.id === row.capabilityDefinitionId);
    const domainId = matches.length === 1 ? matches[0].definition.domainId : undefined;
    const expectedId = id.safeParse(domainId).success && (!Object.hasOwn(row, 'domainId') || row.domainId === domainId)
      ? domainId : undefined;
    return { definition: row, field: 'domain', expectedId, gap: true };
  })];
}
function detachRows(application) {
  if (Array.isArray(application?.targetCapabilities)) application.targetCapabilities = application.targetCapabilities.map(clone);
  if (Array.isArray(application?.gaps)) application.gaps = application.gaps.map(clone);
  if (Array.isArray(application?.observedCapabilities)) application.observedCapabilities = application.observedCapabilities.map(clone);
}
const reference = value => plain(value) && Object.hasOwn(value, 'sharedRecord');
const supported = value => plain(value) && id.safeParse(value.id).success && jsonSafe(value);

// References are local table indexes, never discovery or authority. The table
// binds every full record by canonical digest and the reconstructed full input.
export function restoreApplicationSharedRecords(application) {
  if (application?.[tableKey]?.schemaVersion === 'roost-application-shared-records-v3')
    return restoreApplicationSharedRecords(restoreApplicationSharedRecordValues(application));
  const output = clone(application); detachRows(output); let positions = slots(output); const hasTable = plain(output) && Object.hasOwn(output, tableKey);
  if (!hasTable) { if (positions.some(({ definition, field }) => reference(definition[field])) || capabilityRows(output).some(capabilityReference)
    || output?.companyRecords?.some?.(row => descriptionReference(row?.description))) invalid(); return output; }
  const parsed = applicationSharedRecordsSchema.safeParse(output[tableKey]); if (!parsed.success) invalid();
  const table = parsed.data, use = {}, identities = {};
  if (table.schemaVersion === 'roost-application-shared-records-v2') { restoreRelations(output, table); positions = slots(output); }
  else if (capabilityRows(output).some(capabilityReference) || output?.companyRecords?.some?.(row => descriptionReference(row?.description))) invalid();
  for (const field of fields) {
    use[field] = table[field].map(() => 0); identities[field] = new Set();
    for (const item of table[field]) {
      if (!supported(item.value) || digest(item.value) !== item.digest || identities[field].has(item.value.id)) invalid();
      identities[field].add(item.value.id);
    }
  }
  for (const { definition, field, expectedId, gap } of positions) {
    const value = definition[field];
    // Earlier v1 inputs shared only target definitions. Their full inline gap
    // records remain valid, bound by the unchanged original full-context digest.
    if (!reference(value)) { if (!gap && plain(value) && identities[field].has(value.id)) invalid(); continue; }
    const ref = applicationSharedRecordReferenceSchema.safeParse(value); if (!ref.success) invalid();
    const entry = table[field][ref.data.sharedRecord];
    if (!entry || expectedId !== entry.value.id) invalid();
    use[field][ref.data.sharedRecord]++; definition[field] = clone(entry.value);
  }
  // Extra, singleton or partially shared entries cannot supplement evidence.
  if (fields.some(field => use[field].some(count => count < 2))) invalid();
  delete output[tableKey]; if (digest(output) !== table.originalDigest) invalid(); return output;
}
export function assertApplicationSharedRecords(application) { restoreApplicationSharedRecords(application); return true; }

export function projectApplicationSharedRecords(application) {
  const output = clone(application); detachRows(output);
  if (plain(output) && Object.hasOwn(output, tableKey)) { assertApplicationSharedRecords(output); return output; }
  if (slots(output).some(({ definition, field }) => reference(definition[field])) || capabilityRows(output).some(capabilityReference)
      || output?.companyRecords?.some?.(row => descriptionReference(row?.description))) invalid();
  // Unsupported non-JSON contexts retain all their original inline data.
  if (!plain(output) || !jsonSafe(output)) return output;
  const groups = Object.fromEntries(fields.map(field => [field, new Map()]));
  for (const { definition, field, expectedId } of slots(output)) {
    const value = definition[field]; if (!plain(value) || !id.safeParse(value.id).success) continue;
    const group = groups[field].get(value.id) ?? { positions: [], value, digest: null, conflict: false };
    const eligible = supported(value) && expectedId === value.id;
    const current = eligible ? digest(value) : null;
    if (!eligible || group.digest !== null && current !== group.digest) group.conflict = true;
    if (group.digest === null && eligible) group.digest = current;
    group.positions.push(definition); groups[field].set(value.id, group);
  }
  const table = { schemaVersion: 'roost-application-shared-records-v1', originalDigest: digest(output), domain: [], readinessDimension: [] };
  for (const field of fields) for (const group of groups[field].values()) {
    if (group.conflict || group.positions.length < 2 || group.digest === null) continue;
    const index = table[field].length; table[field].push({ digest: group.digest, value: clone(group.value) });
    for (const definition of group.positions) definition[field] = { sharedRecord: index };
  }
  if (fields.some(field => table[field].length > 0)) { output[tableKey] = table; assertApplicationSharedRecords(output); }
  return projectRelations(output, table);
}
