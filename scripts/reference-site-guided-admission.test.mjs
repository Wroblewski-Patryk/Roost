import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { canonicalGuidedAttemptDirectory, reserveGuidedAttempt, recordGuidedOutcome } from './lib/reference-site-guided-admission.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const taskId = '11111111-1111-4111-8111-111111111111';
const options = directory => ({ directory, repositoryRoot: root, taskId,
  bundleDigest: 'a'.repeat(64), inputSeal: 'b'.repeat(64) });

test('one durable task slot refuses sequential and concurrent re-admission after a source change', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roost-g24c-admission-'));
  try {
    const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () =>
      Promise.resolve().then(() => reserveGuidedAttempt(options(directory)))));
    assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(item => item.status === 'rejected' && /already_spent/.test(item.reason.message)).length, 4);
    const slot = outcomes.find(item => item.status === 'fulfilled').value;
    const disk = JSON.parse(await readFile(slot.path, 'utf8'));
    assert.equal(disk.inputSeal, 'b'.repeat(64));
    assert.equal(disk.model, 'gpt-5.6-sol');
    assert.equal(disk.maxTurns, 1);
    assert.deepEqual(disk.tools, []);
    assert.throws(() => reserveGuidedAttempt({ ...options(directory), bundleDigest: 'c'.repeat(64) }), /already_spent/);
    const receipt = recordGuidedOutcome(slot, { status: 'candidate_result',
      outputDigest: 'd'.repeat(64), processReceiptDigest: 'e'.repeat(64) });
    assert.equal(receipt.taskId, taskId);
    assert.equal(JSON.parse(await readFile(slot.outcomePath, 'utf8')).outputDigest, 'd'.repeat(64));
    assert.throws(() => recordGuidedOutcome(slot, { status: 'failed', reason: 'restarted' }), /already_spent/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('slot rejects repository storage and malformed bindings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roost-g24c-admission-'));
  try {
    assert.throws(() => reserveGuidedAttempt({ ...options(directory), inputSeal: 'bad' }), /binding_invalid/);
    assert.throws(() => reserveGuidedAttempt({ ...options(directory), directory: root }), /directory_invalid/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('case aliases of one UUID share the durable task slot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'roost-g24c-admission-case-'));
  try {
    const lower = 'a1111111-b222-4333-8444-c55555555555';
    reserveGuidedAttempt({ ...options(directory), taskId: lower });
    assert.throws(() => reserveGuidedAttempt({ ...options(directory), taskId: lower.toUpperCase() }), /already_spent/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('session USERPROFILE cannot redirect the canonical Windows attempt fence', { skip: process.platform !== 'win32' }, () => {
  const expected = canonicalGuidedAttemptDirectory();
  assert.ok(expected.toLowerCase().startsWith(userInfo().homedir.toLowerCase()));
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { canonicalGuidedAttemptDirectory } from './scripts/lib/reference-site-guided-admission.mjs'; process.stdout.write(canonicalGuidedAttemptDirectory())"],
  { cwd: root, encoding: 'utf8', env: { ...process.env, USERPROFILE: join(tmpdir(), 'roost-alt-home') } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected);
});
