import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOllamaIdentity } from './lib/agent-host-ollama-identity.mjs';

const pin = { schemaVersion: 'roost-ollama-runtime-identity-v1', model: 'gpt-oss:20b',
  executablePathDigest: 'a'.repeat(64), executableDigest: 'b'.repeat(64), signerThumbprint: 'c'.repeat(40) };
const observed = { pid: 1234, startedAt: '133400000000000000', executablePathDigest: pin.executablePathDigest,
  executableDigest: pin.executableDigest, signerThumbprint: pin.signerThumbprint };

test('pinned Ollama executable and one stable listener are required', () => {
  assert.equal(assertOllamaIdentity(pin, observed), true);
  assert.equal(assertOllamaIdentity(pin, observed, observed), true);
  for (const changed of [
    { ...observed, pid: 1235 }, { ...observed, startedAt: '133400000000000001' },
    { ...observed, executablePathDigest: 'd'.repeat(64) },
    { ...observed, executableDigest: 'd'.repeat(64) },
    { ...observed, signerThumbprint: 'd'.repeat(40) }
  ]) assert.throws(() => assertOllamaIdentity(pin, changed, observed), /ollama_identity_denied/);
  assert.throws(() => assertOllamaIdentity({ ...pin, model: 'other' }, observed), /ollama_identity_denied/);
});
