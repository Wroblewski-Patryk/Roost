import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync,
  rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { verifyExistingLocalCommit } from './lib/agent-host-local-commit.mjs';
import { acquireWriterLock, writerLockFilename } from './lib/agent-host-writer-lock.mjs';
import { prepareCodingTestReplay, runCodingTestReplay, bindCodingTestReplayVerification } from './lib/agent-host-coding-test-replay.mjs';

const hash = 'a'.repeat(64), originUrl = 'https://example.invalid/existing-commit.git';
const branch = 'codex/existing-commit-fixture', modulePath = 'apps/web/src/value.ts', testPath = 'apps/web/src/value.test.ts';
function firstWrite(candidate) {
  return { operations: { localCommit: true }, baselineCommit: candidate, branch,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), decisionId: randomUUID(),
    continuation: { previousCommit: candidate, previousExecutionId: randomUUID(), reviewId: randomUUID() } };
}
function base(candidate) {
  return { executionId: randomUUID(), taskId: randomUUID(), baselineCommit: candidate, branch,
    writePaths: [modulePath, testPath], firstWrite: firstWrite(candidate), nativeReviewReceipt: { verdict: 'verified_candidate' },
    nativeReviewReceiptDigest: hash, workspaceEvidence: { head: candidate, branch, status: [], manifest: [], seal: hash },
    assertAuthority: () => {} };
}
test('serialized or invented passed tests cannot authorize verification, even with plausible continuation', () => {
  const candidate = 'b'.repeat(40), options = base(candidate);
  const fake = { schemaVersion: 'roost-coding-tests-v1', passed: true, digest: hash,
    regressionReplay: { candidateCommit: candidate, baselineCommit: 'c'.repeat(40), red: { exitCode: 1 }, repositoryUnchanged: true } };
  for (const candidateTests of [fake, JSON.parse(JSON.stringify(fake)), Object.freeze(fake), { passed: true }, null])
    assert.throws(() => verifyExistingLocalCommit({ ...options, candidateTests }), /local_commit_unproven/);
});

function git(root, ...args) {
  return execFileSync('git', ['-c', 'core.hooksPath=' + (process.platform === 'win32' ? 'NUL' : '/dev/null'),
    '-c', 'commit.gpgsign=false', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], {
    cwd: root, shell: false, windowsHide: true, timeout: 20000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' } }).trim();
}
async function fixture(t, installedSource) {
  const parent = realpathSync.native(os.tmpdir()), directory = mkdtempSync(path.join(parent, 'roost-existing-commit-test-'));
  const links = []; let writer;
  t.after(async () => {
    if (writer) await writer.release();
    assert.equal(realpathSync.native(directory), directory); assert.equal(path.dirname(directory), parent);
    assert.ok(path.basename(directory).startsWith('roost-existing-commit-test-'));
    for (const link of links) { const relative = path.relative(directory, link);
      assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
      assert.equal(lstatSync(link).isSymbolicLink(), true); unlinkSync(link); }
    rmSync(directory, { recursive: true, force: false });
  });
  const root = path.join(directory, 'repository'), workspace = path.join(root, 'apps', 'web');
  const installed = path.join(workspace, 'node_modules', 'vitest'); mkdirSync(path.join(workspace, 'src'), { recursive: true });
  mkdirSync(installed, { recursive: true });
  const pkg = JSON.parse(readFileSync(path.join(installedSource, 'package.json')));
  assert.equal(pkg.name, 'vitest'); cpSync(installedSource, installed, { recursive: true, dereference: true });
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    const from = realpathSync.native(path.join(path.dirname(installedSource), name)), to = path.join(workspace, 'node_modules', name);
    mkdirSync(path.dirname(to), { recursive: true }); symlinkSync(from, to, 'junction'); links.push(to);
  }
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'existing-commit-fixture-root', private: true }));
  writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'web', devDependencies: { vitest: `^${pkg.version}` } }));
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\n\nimporters:\n\n  apps/web:\n    devDependencies:\n      vitest:\n        specifier: ^${pkg.version}\n        version: ${pkg.version}\n`);
  writeFileSync(path.join(workspace, 'vitest.config.mjs'), 'export default {};\n');
  writeFileSync(path.join(root, modulePath), 'export default () => 512;\n');
  git(root, 'init', '-b', branch); git(root, 'remote', 'add', 'origin', originUrl);
  git(root, 'add', '--', '.'); git(root, 'commit', '-m', 'Baseline fixture');
  const parentCommit = git(root, 'rev-parse', 'HEAD');
  writeFileSync(path.join(root, modulePath), 'export default () => 1000;\n');
  writeFileSync(path.join(root, testPath), "import value from './value'; import { it, expect } from 'vitest'; it('exact dimension',()=>expect(value()).toBe(1000));\n");
  git(root, 'add', '--', '.'); git(root, 'commit', '-m', 'Candidate fixture');
  const candidate = git(root, 'rev-parse', 'HEAD'), manifestPath = path.join(directory, 'test-manifest.json');
  const acceptanceTest = 'pnpm --filter web exec vitest run src/value.test.ts';
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 'roost-gate2-test-manifest-v1', repositoryOrigin: originUrl,
    commands: [{ kind: 'workspace_vitest', workspace: 'apps/web', packageName: 'web', version: pkg.version,
      relativePath: 'src/value.test.ts', acceptanceTest }] }));
  const proof = prepareCodingTestReplay({ repositoryPath: root, candidateCommit: candidate, baselineCommit: parentCommit,
    branch, projectionPaths: [modulePath], manifestPath, originUrl, acceptanceTests: [acceptanceTest], temporaryParent: directory,
    expectedFailure: { fullName: 'exact dimension', messageIncludes: ['512', '1000'] } });
  const replay = await runCodingTestReplay(proof, { workspaceSeal: hash, remainingMs: () => 120000, assertAuthority: () => {} });
  const tests = bindCodingTestReplayVerification(replay);
  const state = path.join(directory, 'state'); writer = await acquireWriterLock(state);
  return { directory, root, state, candidate, parentCommit, tests, writer, options: { ...base(candidate), repositoryPath: root,
    writerLock: writer, candidateTests: tests } };
}

const nativeRoot = process.env.ROOST_TEST_VITEST_ROOT;
test('real replay authorizes only exact unchanged existing commit under live writer and upstream continuation authority',
  { skip: process.platform !== 'win32' || !nativeRoot, timeout: 180000 }, async t => {
    const f = await fixture(t, realpathSync.native(nativeRoot)), approved = structuredClone(f.options.firstWrite);
    const call = changes => {
      const options = { ...f.options, ...changes };
      // Signature verification and UUID binding occur in the caller's signed
      // admission boundary. This callback models that boundary honestly; the
      // finalizer itself never claims to cryptographically verify a signature.
      options.assertAuthority = changes?.assertAuthority ?? (() => assert.deepEqual(options.firstWrite, approved));
      return verifyExistingLocalCommit(options);
    };
    const unchanged = () => {
      assert.equal(git(f.root, 'rev-parse', 'HEAD'), f.candidate);
      assert.equal(git(f.root, 'symbolic-ref', '--short', 'HEAD'), branch);
      assert.equal(git(f.root, 'status', '--porcelain'), '');
    };
    await t.test('positive proof preserves commit and creates no new commit/push/deploy', () => {
      const before = git(f.root, 'rev-list', '--count', 'HEAD'), result = call({});
      assert.equal(result.schemaVersion, 'roost-local-commit-verification-v1');
      assert.equal(result.operation, 'verify_existing_local_commit'); assert.equal(result.commit, f.candidate);
      assert.equal(result.baselineCommit, f.parentCommit); assert.equal(result.verificationBaselineCommit, f.candidate);
      assert.equal(result.previousExecutionId, approved.continuation.previousExecutionId);
      assert.equal(result.rejectionReviewId, approved.continuation.reviewId);
      assert.equal(result.commitCreated, false); assert.equal(result.remotePush, false); assert.equal(result.deployment, false);
      assert.deepEqual(result.paths, [modulePath, testPath].sort()); assert.match(result.digest, /^[a-f0-9]{64}$/);
      assert.equal(git(f.root, 'rev-list', '--count', 'HEAD'), before); unchanged();
    });
    await t.test('serialized genuine replay and forged writer capability are refused', () => {
      assert.throws(() => call({ candidateTests: JSON.parse(JSON.stringify(f.tests)) }), /local_commit_unproven/);
      assert.throws(() => call({ writerLock: Object.freeze({}) }), /local_commit_unproven/); unchanged();
    });
    await t.test('owner-adopted baseline verifies same commit with no creation authority or invented rejection', () => {
      const fw={...approved,operations:{localCommit:false},operation:'verify_existing_local_commit',
        existingCommitVerification:{releaseId:randomUUID(),closureId:randomUUID(),consentDigest:hash,closureDigest:hash,
          previousExecutionId:approved.continuation.previousExecutionId,previousCommit:f.candidate}};
      delete fw.continuation;
      const run=value=>verifyExistingLocalCommit({...f.options,firstWrite:value,assertAuthority:()=>assert.deepEqual(value,fw)});
      const before=git(f.root,'rev-list','--count','HEAD'), result=run(fw);
      assert.equal(result.commitCreated,false);assert.equal(result.rejectionReviewId,undefined);
      assert.deepEqual(result.existingCommitVerification,fw.existingCommitVerification);
      assert.equal(git(f.root,'rev-list','--count','HEAD'),before);unchanged();
      for(const mutate of [v=>v.operations.localCommit=true,v=>delete v.operation,
        v=>v.continuation=approved.continuation,v=>delete v.existingCommitVerification.closureDigest,
        v=>v.existingCommitVerification.previousCommit=f.parentCommit,
        v=>v.existingCommitVerification.previousExecutionId=f.options.executionId]){
        const bad=structuredClone(fw);mutate(bad);assert.throws(()=>run(bad),/local_commit_unproven/);unchanged();
      }
    });
    await t.test('missing/expired/unauthorized continuation and exact execution/review changes are refused', () => {
      const mutations = [fw => delete fw.continuation, fw => fw.operations.localCommit = false,
        fw => fw.expiresAt = new Date(Date.now() - 1000).toISOString(), fw => fw.continuation.previousCommit = f.parentCommit,
        fw => fw.continuation.previousExecutionId = f.options.executionId, fw => fw.continuation.previousExecutionId = 'invalid',
        fw => fw.continuation.reviewId = 'invalid', fw => fw.continuation.previousExecutionId = randomUUID(),
        fw => fw.continuation.reviewId = randomUUID()];
      for (const mutate of mutations) { const firstWrite = structuredClone(approved); mutate(firstWrite);
        assert.throws(() => call({ firstWrite }), /local_commit_unproven/); }
      assert.throws(() => call({ assertAuthority: () => { throw Error('signed_admission_absent'); } }), /local_commit_unproven/);
      unchanged();
    });
    await t.test('wrong baseline/branch/review/evidence and broadened or incomplete write paths are refused', () => {
      for (const change of [{ baselineCommit: f.parentCommit }, { branch: 'codex/unapproved' },
        { nativeReviewReceipt: { verdict: 'rejected' } }, { nativeReviewReceiptDigest: 'not-a-digest' },
        { workspaceEvidence: { ...f.options.workspaceEvidence, head: f.parentCommit } },
        { workspaceEvidence: { ...f.options.workspaceEvidence, branch: 'codex/other' } },
        { workspaceEvidence: { ...f.options.workspaceEvidence, status: [' M src/other.ts'] } },
        { workspaceEvidence: { ...f.options.workspaceEvidence, manifest: [{ path: modulePath }] } },
        { writePaths: [modulePath] }, { writePaths: [modulePath, testPath, 'apps/web/src/extra.ts'] },
        { writePaths: [] }, { writePaths: [modulePath, '../escape'] }])
        assert.throws(() => call(change), /local_commit_unproven/);
      unchanged();
    });
    await t.test('actual tracked/untracked/index and branch drift fail without repairing user work', () => {
      const filename = path.join(f.root, modulePath), original = readFileSync(filename);
      writeFileSync(filename, 'export default () => 2000;\n');
      assert.throws(() => call({}), /local_commit_unproven/); assert.match(readFileSync(filename, 'utf8'), /2000/);
      writeFileSync(filename, original);
      const extra = path.join(f.root, 'untracked-evidence.txt'); writeFileSync(extra, 'retained fixture change');
      assert.throws(() => call({}), /local_commit_unproven/); assert.equal(readFileSync(extra, 'utf8'), 'retained fixture change'); unlinkSync(extra);
      const blob = git(f.root, 'rev-parse', `${f.parentCommit}:${modulePath}`);
      git(f.root, 'update-index', '--cacheinfo', '100644', blob, modulePath);
      assert.throws(() => call({}), /local_commit_unproven/); assert.notEqual(git(f.root, 'status', '--porcelain'), '');
      git(f.root, 'update-index', '--cacheinfo', '100644', git(f.root, 'rev-parse', `${f.candidate}:${modulePath}`), modulePath);
      git(f.root, 'branch', '-m', 'codex/changed-fixture');
      assert.throws(() => call({}), /local_commit_unproven/); assert.equal(git(f.root, 'symbolic-ref', '--short', 'HEAD'), 'codex/changed-fixture');
      git(f.root, 'branch', '-m', branch); unchanged();
    });
    await t.test('changed HEAD cannot be passed off as retained candidate', () => {
      git(f.root, 'commit', '--allow-empty', '-m', 'Unapproved extra fixture commit');
      const changed = git(f.root, 'rev-parse', 'HEAD'); assert.notEqual(changed, f.candidate);
      assert.throws(() => call({}), /local_commit_unproven/);
      assert.equal(git(f.root, 'rev-parse', 'HEAD'), changed);
    });
    assert.ok(readdirSync(f.directory).every(name => !name.startsWith('roost-test-replay-')));
    await f.writer.release(); assert.equal(existsSync(path.join(f.state, writerLockFilename)), false);
  });
