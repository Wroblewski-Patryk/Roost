import assert from 'node:assert/strict';
import { executionContractSchema } from './agent-host-execution-packet.mjs';
import { managedBackendSelectionSchema } from './agent-host-model-policy.mjs';

const managedAttemptPolicySchema = managedBackendSelectionSchema.innerType().options[0].shape.attemptPolicy;

// A checked structural descriptor for PostgreSQL's conservative risk classifier.
// Unknown validators fail generation instead of exempting unproved changes.
export function riskSchemaDescriptor(schema) {
  const d = schema._def, k = d.typeName.replace('Zod', '').toLowerCase();
  if (k === 'object') {
    assert.equal(d.unknownKeys, 'strict');
    return { k, shape: Object.fromEntries(Object.entries(schema.shape).map(([name, value]) => [name, riskSchemaDescriptor(value)])) };
  }
  if (['optional', 'nullable', 'default'].includes(k)) return { k, inner: riskSchemaDescriptor(d.innerType) };
  if (k === 'array') return { k, inner: riskSchemaDescriptor(d.type), ...(d.minLength ? { min: d.minLength.value } : {}), ...(d.maxLength ? { max: d.maxLength.value } : {}) };
  if (k === 'tuple') { assert.equal(d.items.length, 0); return { k, items: [] }; }
  if (['union', 'discriminatedunion'].includes(k)) return { k: 'union', options: d.options.map(riskSchemaDescriptor) };
  if (k === 'literal') return { k, value: d.value };
  if (k === 'enum') return { k, values: d.values };
  if (k === 'boolean') return { k };
  if (k === 'string' || k === 'number') return { k, checks: d.checks.map(check => {
    if (check.kind === 'regex') { assert.equal(check.regex.flags, ''); return { kind: check.kind, pattern: check.regex.source }; }
    assert.ok(['trim', 'min', 'max', 'uuid', 'int', 'finite'].includes(check.kind)); return check;
  }) };
  if (k === 'effects') {
    assert.equal(d.effect.type, 'refinement');
    // These specific schema instances own the reviewed cross-field rules.
    // An arbitrary refinement over the same union/object is not equivalent.
    if (schema === managedBackendSelectionSchema || schema === managedAttemptPolicySchema)
      return { k: 'refinement', rule: schema === managedBackendSelectionSchema ? 'managedBackendBudget' : 'managedTurnBudget',
        inner: riskSchemaDescriptor(d.schema) };
    assert.equal(d.schema._def.typeName, 'ZodObject', `Unmirrored refinement ${d.schema._def.typeName}`);
    const keys = Object.keys(d.schema.shape).sort().join(',');
    const rule = keys === 'items,noneReason' ? 'optionalSet' : keys === 'model,reasoningEffort' ? 'codexModel'
      : keys === 'model,modelDigest,modelFamily,provider,reasoningEffort' ? 'localModel'
      : keys === 'endLine,path,startLine' ? 'readFragment'
      : keys === 'inspectReadOnly,profile,readFragments,readPaths,runtime' ? 'readSelections' : null;
    assert.ok(rule, `Unmirrored refinement ${keys}`);
    return { k: 'refinement', rule, inner: riskSchemaDescriptor(d.schema) };
  }
  throw new Error(`Unmirrored schema ${k}`);
}
export function readonlyRiskSchema() {
  const option = executionContractSchema.shape.nativeBoundary.unwrap().options.find(option => {
    const base = option._def.typeName === 'ZodEffects' ? option._def.schema : option;
    return base.shape.profile.value === 'inspect-readonly';
  });
  assert.ok(option);
  // Select the read-only boundary before describing the contract. Mutating
  // release adapters carry their own refinements and can never qualify as
  // read-only; visiting those alternatives would require irrelevant SQL rules.
  // All other contract fields and the selected boundary still fail closed on
  // an unknown validator, and the descriptor remains pinned to applied SQL.
  return riskSchemaDescriptor(executionContractSchema.extend({ nativeBoundary: option }));
}
