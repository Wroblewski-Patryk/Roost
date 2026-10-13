import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { informationFailureCode, markModelRequest, markNativeLaunchIntent } from './lib/agent-host-company-information-worker.mjs';

test('a model request creates one flushed, private, non-overwriting marker', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-model-marker-'));
  const executionId = '00000000-0000-4000-8000-000000000001';
  try {
    markModelRequest(directory, executionId);
    const marker = path.join(directory, `information-${executionId}.model-requested`);
    assert.deepEqual(JSON.parse(await readFile(marker, 'utf8')),
      { executionId, modelRequestForwarded: true });
    assert.throws(() => markModelRequest(directory, executionId), { code: 'EEXIST' });
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('native launch intent is durable, separate from a provider request, and create-only', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-native-intent-'));
  const executionId = '00000000-0000-4000-8000-000000000001';
  try {
    markNativeLaunchIntent(directory, executionId);
    const marker = path.join(directory, `information-${executionId}.native-launch-intent`);
    assert.deepEqual(JSON.parse(await readFile(marker, 'utf8')),
      { executionId, nativeLaunchIntent: true });
    assert.throws(() => markNativeLaunchIntent(directory, executionId), { code: 'EEXIST' });
    await assert.rejects(readFile(path.join(directory, `information-${executionId}.model-requested`)), { code: 'ENOENT' });
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('a safe pre-launch refusal survives conservative lease-loss classification', () => {
  const error = Object.assign(Error('company_information_runtime_blocked'), { leaseLost: true, protocolAdmission: true,
    details: { reason: 'signed_binding_changed' } });
  assert.equal(informationFailureCode(error, { preLaunchReason: 'signed_binding_changed' }), 'signed_binding_changed');
  assert.equal(informationFailureCode(error, { preLaunchReason: null }), 'information_lease_lost');
  assert.equal(informationFailureCode({ details: { reason: 'private CANARY' } }, { code: 'information_failure_unclassified' }),
    'information_attempt_stopped');
});
