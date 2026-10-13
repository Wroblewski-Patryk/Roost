import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { informationFailureDiagnostic, writeInformationFailureDiagnostic } from './lib/agent-host-information-diagnostics.mjs';

const executionId = '00000000-0000-4000-8000-000000000001';

test('only fixed observer, Job, Hermes and Worker codes enter a diagnostic', () => {
  assert.deepEqual([...
    [{ message: 'ollama_observer_upstream_failed', details: { reason: 'ollama_observer_upstream_failed' }, protocolAdmission: true },
      { message: 'windows_job_output_rejected', providerFailure: true },
      { message: 'hermes_quiet_process_failed', providerFailure: true },
      { message: 'hermes_quiet_process_failed', providerFailure: true,
        details: { observerReason: 'ollama_observer_upstream_failed' } },
      { message: 'hermes_stop_recovery_unproven', leaseLost: true,
        details: { observerReason: 'ollama_observer_upstream_failed' } },
      { message: 'information_context_changed' },
      { message: 'company_information_runtime_blocked', details: { reason: 'owned_tree_unproven' } },
      { message: 'provider echoed private prompt: CANARY', details: { reason: 'CANARY' } }]
      .map(error => {
        const { origin, code } = informationFailureDiagnostic(error);
        return [origin, code];
      })], [
    ['observer', 'ollama_observer_upstream_failed'], ['windows_job', 'windows_job_output_rejected'],
    ['hermes', 'hermes_quiet_process_failed'], ['observer', 'ollama_observer_upstream_failed'],
    ['windows_job', 'hermes_stop_recovery_unproven'],
    ['worker', 'information_context_changed'],
    ['runtime', 'owned_tree_unproven'], ['worker', 'information_failure_unclassified']
  ]);
  const nested = informationFailureDiagnostic({ message: 'hermes_stop_recovery_unproven', leaseLost: true,
    details: { observerReason: 'ollama_observer_upstream_failed' } });
  assert.equal(nested.observerCode, 'ollama_observer_upstream_failed');
  assert.equal(nested.nativeCleanupProven, false);
  const preLaunch = informationFailureDiagnostic({ message: 'company_information_runtime_blocked', leaseLost: true,
    protocolAdmission: true, details: { reason: 'signed_binding_changed' } });
  assert.equal(preLaunch.code, 'native_cleanup_unproven');
  assert.equal(preLaunch.preLaunchReason, 'signed_binding_changed');
  assert.equal(informationFailureDiagnostic({ message: 'company_information_runtime_blocked', leaseLost: true,
    protocolAdmission: true, details: { reason: 'signed_binding_changed' } }, { nativeLaunchIntentPresent: true }).preLaunchReason, null);
  assert.equal(informationFailureDiagnostic({ message: 'company_information_runtime_blocked', leaseLost: true,
    protocolAdmission: true, details: { reason: 'CANARY' } }).preLaunchReason, null);
});

test('private failure checkpoint records only bounded metadata and never overwrites', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-information-diagnostic-'));
  try {
    await writeFile(path.join(directory, `information-${executionId}.model-requested`), '');
    const error = Object.assign(new Error('provider echoed private prompt: CANARY'), {
      providerFailure: true, details: { reason: 'CANARY', providerText: 'CANARY' } });
    const record = writeInformationFailureDiagnostic(directory, executionId, error, false);
    assert.equal(record.code, 'information_failure_unclassified');
    assert.equal(record.modelRequestMarkerPresent, true);
    assert.equal(record.nativeCleanupProven, false);
    const file = path.join(directory, `information-${executionId}.failure.json`);
    const bytes = await readFile(file, 'utf8');
    assert.deepEqual(JSON.parse(bytes), record);
    assert.equal(bytes.includes('CANARY'), false);
    assert.throws(() => writeInformationFailureDiagnostic(directory, executionId, error, true), { code: 'EEXIST' });
    assert.equal(await readFile(file, 'utf8'), bytes);
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('diagnostic rejects path-like execution IDs before creating a file', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'roost-information-diagnostic-'));
  try {
    assert.throws(() => writeInformationFailureDiagnostic(directory, '../outside', Error('irrelevant'), false),
      /information_diagnostic_execution_invalid/);
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});
