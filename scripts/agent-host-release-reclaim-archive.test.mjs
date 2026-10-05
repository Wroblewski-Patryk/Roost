import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, linkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { releaseStateFixture } from './fixtures/release-state.mjs';
import { acquireWriterLock, writerLockFilename, recoveryLockFilename } from './lib/agent-host-writer-lock.mjs';
import { releaseRecoveryCandidate, qualifyReleaseWriterReclaim, clearReleaseWriterRecovery } from './lib/agent-host-release-writer-recovery.mjs';

const native = { skip: process.platform !== 'win32', timeout: 30000 };

function sealedWriter(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'roost-reclaim-archive-test-'));
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert(path.basename(directory).startsWith('roost-reclaim-archive-test-'));
    rmSync(directory, { recursive: true });
  });
  const state = releaseStateFixture(directory), s = state.release.snapshot;
  state.journal = [{ id: randomUUID(), operation: 'push', createdAt: new Date().toISOString(), outcome: null,
    intent: { requestId: randomUUID(), operation: 'push', manifestDigest: s.manifestDigest, commit: s.commit,
      baseCommit: s.baseCommit, expectedVersion: state.expectedVersion,
      observed: { commit: s.commit, baseCommit: s.baseCommit, baseTree: s.baseTree, manifestDigest: s.manifestDigest },
      parameters: { branch: s.manifest.repository.candidateBranch } } }];
  const client = { hostId: s.hostId, agentId: s.releaserAgentId };
  const moduleUrl = name => pathToFileURL(path.join(process.cwd(), 'scripts', 'lib', name)).href;
  // This synthetic owner uses the actual checkpoint signing path, has no child
  // processes or external effects, then exits while retaining its sealed lock.
  const source = `
import {acquireWriterLock} from ${JSON.stringify(moduleUrl('agent-host-writer-lock.mjs'))};
import {beginReleaseWriterCheckpoint,checkpointReleaseOperation,sealReleaseWriterCheckpoint} from ${JSON.stringify(moduleUrl('agent-host-release-writer-recovery.mjs'))};
const state=${JSON.stringify(state)},client=${JSON.stringify(client)};
const writerLock=await acquireWriterLock(${JSON.stringify(directory)});
const context=beginReleaseWriterCheckpoint({writerLock,state,client});
checkpointReleaseOperation(context,state,state.journal[0],client);
sealReleaseWriterCheckpoint(context);
`;
  execFileSync(process.execPath, ['--input-type=module', '-e', source], { windowsHide: true, timeout: 20000, stdio: 'pipe' });
  const lockPath = path.join(directory, writerLockFilename), bytes = readFileSync(lockPath), originalWriter = JSON.parse(bytes);
  const recovery = qualifyReleaseWriterReclaim(originalWriter, releaseRecoveryCandidate(state, client), directory);
  const archivePath = path.join(directory, `release-writer-reclaimed-${recovery.priorContextNonce}.json`);
  assert.equal(originalWriter.releaseCheckpoint.phase, 'all_local_children_closed');
  assert.equal(recovery.preflightQuiescence, undefined);
  return { directory, state, client, lockPath, bytes, originalWriter, recovery, archivePath,
    archiveBytes: JSON.stringify({ originalWriter, recovery }) + '\n' };
}

test('ordinary sealed release reclaim archives original signed Writer before replacement and retains it after recovery clears', native, async t => {
  const f = sealedWriter(t);
  const writer = await acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) });
  const preserved = readFileSync(f.archivePath, 'utf8'), archive = JSON.parse(preserved);
  assert.equal(preserved, f.archiveBytes);
  assert.deepEqual(archive.originalWriter, f.originalWriter);
  assert.deepEqual(archive.recovery, writer.releaseRecovery);
  assert.equal(archive.originalWriter.releaseCheckpoint.signature, f.originalWriter.releaseCheckpoint.signature);
  assert.equal(archive.recovery.operationId, f.state.journal[0].id);
  const replacement = JSON.parse(readFileSync(f.lockPath));
  assert.notEqual(replacement.ownerNonce, f.originalWriter.ownerNonce);
  assert.equal(replacement.releaseCheckpoint, undefined);
  await assert.rejects(writer.release(), /reconciliation_pending/);
  f.state.journal[0].outcome = { status: 'reconciled', reconciledStatus: 'absent' };
  clearReleaseWriterRecovery(writer, f.state, f.client);
  await writer.release();
  assert.equal(existsSync(f.lockPath), false);
  assert.equal(readFileSync(f.archivePath, 'utf8'), preserved);
});

test('ordinary sealed reclaim reuses the exact prior archive after interruption without replacing its bytes', native, async t => {
  const f = sealedWriter(t);
  writeFileSync(f.archivePath, f.archiveBytes, { flag: 'wx', mode: 0o600 });
  const writer = await acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) });
  assert.equal(readFileSync(f.archivePath, 'utf8'), f.archiveBytes);
  f.state.journal[0].outcome = { status: 'reconciled', reconciledStatus: 'absent' };
  clearReleaseWriterRecovery(writer, f.state, f.client);
  await writer.release();
});

for (const changed of ['writer', 'recovery', 'hard_link']) test(`ordinary sealed reclaim retains original lock when existing archive has changed ${changed}`, native, async t => {
  const f = sealedWriter(t), archive = JSON.parse(f.archiveBytes);
  if (changed === 'writer') archive.originalWriter.releaseCheckpoint.signature = '0'.repeat(64);
  if (changed === 'recovery') archive.recovery.operationId = randomUUID();
  const archiveBytes = JSON.stringify(archive) + '\n';
  writeFileSync(f.archivePath, archiveBytes, { flag: 'wx', mode: 0o600 });
  if (changed === 'hard_link') linkSync(f.archivePath, path.join(f.directory, 'linked-archive.json'));
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  assert.deepEqual(readFileSync(f.lockPath), f.bytes);
  assert.equal(readFileSync(f.archivePath, 'utf8'), archiveBytes);
  assert.equal(existsSync(path.join(f.directory, recoveryLockFilename)), false);
});

test('existing recovery barrier blocks sealed reclaim before archive creation or Writer retirement', native, async t => {
  const f = sealedWriter(t), gatePath = path.join(f.directory, recoveryLockFilename);
  writeFileSync(gatePath, 'synthetic recovery barrier', { flag: 'wx', mode: 0o600 });
  await assert.rejects(acquireWriterLock(f.directory, { releaseRecoveryCandidate: releaseRecoveryCandidate(f.state, f.client) }), /writer_locked/);
  assert.deepEqual(readFileSync(f.lockPath), f.bytes);
  assert.equal(existsSync(f.archivePath), false);
  assert.equal(readFileSync(gatePath, 'utf8'), 'synthetic recovery barrier');
});
