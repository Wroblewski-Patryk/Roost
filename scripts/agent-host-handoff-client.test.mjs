import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { productionOrigin, validateHandoffBinding, runHandoff } from './lib/agent-host-handoff-client.mjs';

const binding = Object.freeze({ schemaVersion: 'roost-worker-handoff-client-v1', origin: 'https://api.fictional-roost.net:443',
  hostSlug: 'example-worker', workspaceId: '00000000-0000-4000-8000-000000000001',
  installationId: '00000000-0000-4000-8000-000000000002', hostId: '00000000-0000-4000-8000-000000000003',
  hostFingerprint: 'a'.repeat(64), certificateFingerprint: 'b'.repeat(64) });
const key = 'cc_v1_' + 'A'.repeat(32);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((name) => [name, canonical(value[name])])) : value;
const review = (value) => hash(JSON.stringify(canonical(value)));
const status = (requestId, state, deliverySpent = false) => ({ requestId, state, deliverySpent,
  qualification: 'production_https_v1', transportQualified: true, realProvisioningQualified: true, launchAuthority: false });

function exchangeFixture({ badCredentialHost = false } = {}) {
  const calls = [];
  let request, requestDigest;
  const exchange = async (_binding, action, body) => {
    calls.push({ action, body });
    if (action === 'request') {
      request = body;
      assert.equal(body.origin, binding.origin);
      assert.equal(body.certificateFingerprint, binding.certificateFingerprint);
      assert.equal(body.replacesRequestId, null);
      assert.match(body.deviceSecretHash, /^[a-f0-9]{64}$/);
      assert.match(body.challengeHash, /^[a-f0-9]{64}$/);
      const expiresAt = new Date(Date.now() + 120000).toISOString();
      requestDigest = review({ ...body, expiresAt });
      const userCode = hash(`roost-worker-handoff-v1:code:${body.requestId}`).slice(0, 8).toUpperCase();
      return { ...status(body.requestId, 'requested'), userCode, expiresAt,
        binding: { requestId: body.requestId, requestDigest, hostFingerprint: body.hostFingerprint,
          origin: body.origin, certificateFingerprint: body.certificateFingerprint, replacesRequestId: null } };
    }
    assert.equal(body.requestId, request.requestId);
    assert.equal(hash(Buffer.concat([Buffer.from('roost-worker-handoff-v1:device:'), Buffer.from(body.deviceSecret, 'base64url')])), request.deviceSecretHash);
    assert.equal(hash(Buffer.concat([Buffer.from('roost-worker-handoff-v1:challenge:'), Buffer.from(body.challenge, 'base64url')])), request.challengeHash);
    if (action === 'poll') {
      const credential = { id: '00000000-0000-4000-8000-000000000004', workspaceId: binding.workspaceId,
        installationId: binding.installationId, hostId: badCredentialHost ? '00000000-0000-4000-8000-000000000099' : binding.hostId,
        version: 1, epoch: 1, fingerprint: 'c'.repeat(64), active: false, revokedAt: null,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), scopes: ['agent-runtime:claim'] };
      const ackDeadline = new Date(Date.now() + 60000).toISOString();
      const responseDigest = review({ requestId: body.requestId, requestDigest, credential, ackDeadline });
      return { ...status(body.requestId, 'awaiting_ack', true), credential, responseDigest, ackDeadline,
        key, ackProof: 'd'.repeat(64) };
    }
    if (action === 'ack') {
      assert.equal(body.credentialId, '00000000-0000-4000-8000-000000000004');
      assert.equal(body.credentialFingerprint, 'c'.repeat(64));
      assert.equal(body.ackProof, 'd'.repeat(64));
      return status(body.requestId, 'acknowledged', true);
    }
    throw new Error('unexpected_action');
  };
  return { exchange, calls };
}

test('owner binding must match the local host and exact production origin', () => {
  assert.equal(productionOrigin(binding.origin), true);
  assert.equal(productionOrigin('https://localhost:443'), false);
  assert.equal(productionOrigin('https://api.fictional-roost.net'), false);
  assert.deepEqual(validateHandoffBinding(binding, { baseUrl: 'https://api.fictional-roost.net', host: { slug: binding.hostSlug } }), binding);
  assert.throws(() => validateHandoffBinding(binding, { baseUrl: 'https://elsewhere.net', host: { slug: binding.hostSlug } }), /worker_handoff_host_config_mismatch/);
  assert.throws(() => validateHandoffBinding(binding, { baseUrl: 'https://api.fictional-roost.net', host: { slug: 'other' } }), /worker_handoff_host_config_mismatch/);
  assert.throws(() => validateHandoffBinding({ ...binding, certificateFingerprint: 'wrong' }, { baseUrl: 'https://api.fictional-roost.net', host: { slug: binding.hostSlug } }), /worker_handoff_binding_invalid/);
});

test('one-time credential is stored before ACK and no secret is reported', async () => {
  const fixture = exchangeFixture();
  const reports = [];
  let stored = false;
  const result = await runHandoff(binding, { exchange: fixture.exchange, pause: async () => {},
    storeCredential: async (delivered) => { assert.equal(delivered, key); stored = true; },
    report: (event) => { assert.equal(JSON.stringify(event).includes(key), false); reports.push(event); } });
  assert.equal(result.state, 'acknowledged');
  assert.equal(stored, true);
  assert.deepEqual(fixture.calls.map((call) => call.action), ['request', 'poll', 'ack']);
  assert.equal(reports.length, 2);
});

test('failed Credential Manager store never sends ACK or retries the one-time poll', async () => {
  const fixture = exchangeFixture();
  await assert.rejects(runHandoff(binding, { exchange: fixture.exchange, pause: async () => {},
    storeCredential: async () => { throw new Error('store_failed'); } }), /store_failed/);
  assert.deepEqual(fixture.calls.map((call) => call.action), ['request', 'poll']);
});

test('a delivery bound to another host is denied before storage', async () => {
  const fixture = exchangeFixture({ badCredentialHost: true });
  let stored = false;
  await assert.rejects(runHandoff(binding, { exchange: fixture.exchange, pause: async () => {},
    storeCredential: async () => { stored = true; } }), /worker_handoff_response_invalid/);
  assert.equal(stored, false);
  assert.deepEqual(fixture.calls.map((call) => call.action), ['request', 'poll']);
});

test('uncertain poll response is terminal and never retried', async () => {
  const fixture = exchangeFixture();
  const exchange = async (bound, action, body) => action === 'poll' ? Promise.reject(new Error('worker_handoff_delivery_unknown'))
    : fixture.exchange(bound, action, body);
  await assert.rejects(runHandoff(binding, { exchange, pause: async () => {}, storeCredential: async () => {} }), /worker_handoff_delivery_unknown/);
  assert.deepEqual(fixture.calls.map((call) => call.action), ['request']);
});

test('uncertain ACK after storage is terminal and cannot trigger another poll', async () => {
  const fixture = exchangeFixture();
  const exchange = async (bound, action, body) => action === 'ack' ? Promise.reject(new Error('network_lost'))
    : fixture.exchange(bound, action, body);
  let stores = 0;
  await assert.rejects(runHandoff(binding, { exchange, pause: async () => {}, storeCredential: async () => { stores++; } }),
    /worker_handoff_delivery_unknown/);
  assert.equal(stores, 1);
  assert.deepEqual(fixture.calls.map((call) => call.action), ['request', 'poll']);
});

test('synthetic qualification never reaches credential storage', async () => {
  const fixture = exchangeFixture();
  const exchange = async (bound, action, body) => {
    const result = await fixture.exchange(bound, action, body);
    return action === 'poll' ? { ...result, qualification: 'synthetic_memory_only' } : result;
  };
  let stored = false;
  await assert.rejects(runHandoff(binding, { exchange, pause: async () => {}, storeCredential: async () => { stored = true; } }),
    /worker_handoff_response_invalid/);
  assert.equal(stored, false);
});
