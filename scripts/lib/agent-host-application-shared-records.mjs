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
export const applicationSharedRecordsSchema = z.object({ schemaVersion: z.literal('roost-application-shared-records-v1'),
  originalDigest: hash, domain: z.array(entrySchema), readinessDimension: z.array(entrySchema) }).strict();
function slots(application) {
  if (!Array.isArray(application?.targetCapabilities)) return [];
  return application.targetCapabilities.filter(row => plain(row?.definition)).flatMap(row =>
    fields.filter(field => Object.hasOwn(row.definition, field)).map(field => ({ definition: row.definition, field })));
}
function detachRows(application) { if (Array.isArray(application?.targetCapabilities)) application.targetCapabilities = application.targetCapabilities.map(clone); }
const reference = value => plain(value) && Object.hasOwn(value, 'sharedRecord');
const supported = value => plain(value) && id.safeParse(value.id).success && jsonSafe(value);

// References are local table indexes, never discovery or authority. The table
// binds every full record by canonical digest and the reconstructed full input.
export function restoreApplicationSharedRecords(application) {
  const output = clone(application); detachRows(output); const positions = slots(output), hasTable = plain(output) && Object.hasOwn(output, tableKey);
  if (!hasTable) { if (positions.some(({ definition, field }) => reference(definition[field]))) invalid(); return output; }
  const parsed = applicationSharedRecordsSchema.safeParse(output[tableKey]); if (!parsed.success) invalid();
  const table = parsed.data, use = {}, identities = {};
  for (const field of fields) {
    use[field] = table[field].map(() => 0); identities[field] = new Set();
    for (const item of table[field]) {
      if (!supported(item.value) || digest(item.value) !== item.digest || identities[field].has(item.value.id)) invalid();
      identities[field].add(item.value.id);
    }
  }
  for (const { definition, field } of positions) {
    const value = definition[field];
    if (!reference(value)) { if (plain(value) && identities[field].has(value.id)) invalid(); continue; }
    const ref = applicationSharedRecordReferenceSchema.safeParse(value); if (!ref.success) invalid();
    const entry = table[field][ref.data.sharedRecord];
    if (!entry || definition[field + 'Id'] !== entry.value.id) invalid();
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
  if (slots(output).some(({ definition, field }) => reference(definition[field]))) invalid();
  // Unsupported non-JSON contexts retain all their original inline data.
  if (!plain(output) || !jsonSafe(output)) return output;
  const groups = Object.fromEntries(fields.map(field => [field, new Map()]));
  for (const { definition, field } of slots(output)) {
    const value = definition[field]; if (!plain(value) || !id.safeParse(value.id).success) continue;
    const group = groups[field].get(value.id) ?? { positions: [], value, digest: null, conflict: false };
    const eligible = supported(value) && definition[field + 'Id'] === value.id;
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
  return output;
}
