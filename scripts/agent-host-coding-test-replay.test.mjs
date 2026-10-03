import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareCodingTestReplay, runCodingTestReplay, classifyCodingReplayReport, isCodingTestReplayReceipt, bindCodingTestReplayVerification } from './lib/agent-host-coding-test-replay.mjs';

const originUrl = 'https://example.invalid/regression.git';
const relativePath = 'src/app/manifest.test.ts', modulePath = 'apps/web/src/app/manifest.ts';
const expectedFailure = { fullName: 'dimension regression exact dimensions', messageIncludes: ['1000', '512'] };
function git(root, ...args) {
  return execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args],
    { cwd: root, windowsHide: true, shell: false, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function fixture(t, actualVitest) {
  const parent = realpathSync.native(os.tmpdir()), container = mkdtempSync(path.join(parent, 'roost-replay-unit-'));
  const junctions = [];
  t.after(() => {
    assert.equal(realpathSync.native(container), container);
    assert.equal(path.dirname(container), parent);
    assert.ok(path.basename(container).startsWith('roost-replay-unit-'));
    for (const link of junctions) { assert.ok(path.relative(container, link) && !path.relative(container, link).startsWith('..'));
      assert.equal(lstatSync(link).isSymbolicLink(), true); unlinkSync(link); }
    rmSync(container, { recursive: true, force: false });
  });
  const root = path.join(container, 'repository'), workspace = path.join(root, 'apps', 'web');
  mkdirSync(path.join(workspace, 'src', 'app'), { recursive: true });
  const installed = path.join(workspace, 'node_modules', 'vitest'); mkdirSync(installed, { recursive: true });
  writeFileSync(path.join(installed, 'package.json'), JSON.stringify({ name: 'vitest', version: '4.1.5', bin: { vitest: './vitest.mjs' } }));
  writeFileSync(path.join(installed, 'vitest.mjs'), '// Preparation-only unit fixture; never executed.\n');
  if (actualVitest) {
    const pkg = JSON.parse(readFileSync(path.join(actualVitest, 'package.json')));
    assert.equal(pkg.name, 'vitest'); assert.equal(pkg.version, '4.1.5');
    cpSync(actualVitest, installed, { recursive: true, dereference: true });
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      const from = realpathSync.native(path.join(path.dirname(actualVitest), name)), to = path.join(workspace, 'node_modules', name);
      mkdirSync(path.dirname(to), { recursive: true }); symlinkSync(from, to, 'junction'); junctions.push(to);
    }
  }
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'replay-fixture-root', private: true }));
  writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({ name: 'web', devDependencies: { vitest: '^4.1.5' } }));
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n\nimporters:\n\n  apps/web:\n    devDependencies:\n      vitest:\n        specifier: ^4.1.5\n        version: 4.1.5\n");
  writeFileSync(path.join(root, modulePath), 'export default () => 512;\n');
  mkdirSync(path.join(workspace, 'public')); writeFileSync(path.join(workspace, 'public', 'logo.png'), Buffer.from([137, 80, 78, 71]));
  if (actualVitest) {
    writeFileSync(path.join(workspace, 'vitest.config.ts'),
      "import { defineConfig } from 'vitest/config'; import path from 'node:path'; export default defineConfig({resolve:{alias:{'@':path.resolve(__dirname,'src')}},test:{setupFiles:'./vitest.setup.ts'}});\n");
    writeFileSync(path.join(workspace, 'vitest.setup.ts'), 'export {};\n');
  } else writeFileSync(path.join(workspace, 'vitest.config.mjs'), 'export default {};\n');
  git(root, 'init', '-b', 'codex/replay-fixture'); git(root, 'remote', 'add', 'origin', originUrl);
  git(root, 'add', '--', '.'); git(root, 'commit', '-m', 'Baseline fixture');
  const baselineCommit = git(root, 'rev-parse', 'HEAD');
  writeFileSync(path.join(root, modulePath), 'export default () => 1000;\n');
  writeFileSync(path.join(workspace, relativePath), "import value from './manifest'; import { it, expect } from 'vitest'; it('dimensions',()=>expect(value()).toBe(1000));\n");
  git(root, 'add', '--', '.'); git(root, 'commit', '-m', 'Candidate fixture');
  const candidateCommit = git(root, 'rev-parse', 'HEAD'), manifestPath = path.join(container, 'tests.json');
  const acceptanceTest = `pnpm --filter web exec vitest run ${relativePath}`;
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 'roost-gate2-test-manifest-v1', repositoryOrigin: originUrl,
    commands: [{ kind: 'workspace_vitest', workspace: 'apps/web', packageName: 'web', version: '4.1.5', relativePath, acceptanceTest }] }));
  const options = { repositoryPath: root, candidateCommit, baselineCommit, branch: 'codex/replay-fixture',
    projectionPaths: [modulePath], assetPaths: ['apps/web/public/logo.png'], manifestPath, originUrl,
    acceptanceTests: [acceptanceTest], temporaryParent: container, expectedFailure };
  return { container, root, workspace, installed, options, prepare: () => prepareCodingTestReplay(options) };
}
const run = (proof, overrides = {}) => runCodingTestReplay(proof, { workspaceSeal: 'a'.repeat(64),
  remainingMs: () => 45000, assertAuthority: () => {}, ...overrides });
const report = () => ({ success: false, numTotalTests: 1, numPassedTests: 0, numFailedTests: 1, numPendingTests: 0,
  numRuntimeErrorTestSuites: 0, testResults: [{ status: 'failed', assertionResults: [{ status: 'failed',
    fullName: expectedFailure.fullName, failureMessages: ['AssertionError: expected 512 to be 1000'] }] }] });

test('preparation binds candidate, exact parent, tracked test, source and assets without application writes', t => {
  const f = fixture(t), before = git(f.root, 'status', '--porcelain');
  const original = readFileSync(path.join(f.root, modulePath)), proof = f.prepare();
  assert.deepEqual(Object.keys(proof), []); assert.ok(Object.isFrozen(proof));
  assert.equal(git(f.root, 'status', '--porcelain'), before);
  assert.deepEqual(readFileSync(path.join(f.root, modulePath)), original);
  assert.equal(git(f.root, 'rev-parse', 'HEAD'), f.options.candidateCommit);
});

test('wrong parent, commit, branch, origin and temporary application path fail closed', t => {
  const f = fixture(t);
  for (const changes of [{ baselineCommit: 'a'.repeat(40) }, { candidateCommit: 'a'.repeat(40) },
    { branch: 'codex/other' }, { originUrl: 'https://example.invalid/other.git' }, { temporaryParent: f.workspace },
    { temporaryParent: f.root }, { baselineCommit: f.options.candidateCommit }]) {
    assert.throws(() => prepareCodingTestReplay({ ...f.options, ...changes }), /coding_test_replay_unproven/);
  }
});

test('projection traversal, tests, configs, assets, missing and unchanged modules are rejected', t => {
  const f = fixture(t);
  for (const projectionPaths of [[], [modulePath, modulePath], ['../escape.ts'], ['apps/web/src/app/manifest.test.ts'],
    ['apps/web/vitest.config.mjs'], ['apps/web/public/logo.png'], ['apps/web/src/app/missing.ts'], ['apps/other/src/value.ts']])
    assert.throws(() => prepareCodingTestReplay({ ...f.options, projectionPaths }), /coding_test_replay_unproven/);
  writeFileSync(path.join(f.root, modulePath), 'export default () => 512;\n');
  git(f.root, 'add', '--', modulePath); git(f.root, 'commit', '--amend', '--no-edit');
  assert.throws(() => prepareCodingTestReplay({ ...f.options, candidateCommit: git(f.root, 'rev-parse', 'HEAD') }), /coding_test_replay_unproven/);
});

test('projection/test/asset/config/manifest/CLI drift blocks launch and never repairs user changes', async t => {
  for (const item of ['module', 'test', 'asset', 'config', 'manifest', 'cli', 'head']) {
    const f = fixture(t), proof = f.prepare();
    const changed = item === 'module' ? path.join(f.root, modulePath) : item === 'test' ? path.join(f.workspace, relativePath)
      : item === 'asset' ? path.join(f.workspace, 'public', 'logo.png') : item === 'config' ? path.join(f.workspace, 'vitest.config.mjs')
      : item === 'manifest' ? f.options.manifestPath : path.join(f.installed, 'vitest.mjs');
    if (item === 'head') git(f.root, 'commit', '--allow-empty', '-m', 'Different candidate');
    else writeFileSync(changed, 'changed during preparation');
    await assert.rejects(run(proof), /coding_test_replay_unproven/);
    if (item !== 'head') assert.equal(readFileSync(changed, 'utf8'), 'changed during preparation');
    assert.equal(existsSync(path.join(f.container, 'baseline.config.mjs')), false);
  }
});

test('ambiguity, dirty files, unsigned test changes and sparse assertion expectations are refused', t => {
  const f = fixture(t);
  for (const expectedFailure of [{ fullName: '', messageIncludes: ['512', '1000'] },
    { fullName: 'test', messageIncludes: [] }, { fullName: 'test', messageIncludes: ['512'] }])
    assert.throws(() => prepareCodingTestReplay({ ...f.options, expectedFailure }), /coding_test_replay_unproven/);
  writeFileSync(path.join(f.workspace, 'vite.config.mjs'), 'export default {};\n');
  git(f.root, 'add', '--', '.'); git(f.root, 'commit', '--amend', '--no-edit');
  assert.throws(() => prepareCodingTestReplay({ ...f.options, candidateCommit: git(f.root, 'rev-parse', 'HEAD') }), /coding_test_replay_unproven/);
});

test('only exact real assertion failure qualifies as RED; counts and digest have no raw output', () => {
  const counts = classifyCodingReplayReport(report(), 1, expectedFailure);
  assert.deepEqual({ ...counts, assertionFailureDigest: undefined }, { totalTests: 1, passedTests: 0,
    failedTests: 1, pendingTests: 0, failedTestName: expectedFailure.fullName, assertionFailureDigest: undefined });
  assert.equal(counts.assertionFailureDigest, createHash('sha256').update('AssertionError: expected 512 to be 1000').digest('hex'));
  assert.equal('output' in counts, false);
});

test('green/no tests/skips/timeouts/infrastructure errors/wrong assertion cannot masquerade as RED', () => {
  const changes = [r => r.success = true, r => r.numTotalTests = 0, r => r.numPendingTests = 1,
    r => r.numRuntimeErrorTestSuites = 1, r => r.testResults[0].assertionResults = [],
    r => r.testResults[0].assertionResults[0].status = 'pending',
    r => r.testResults[0].assertionResults[0].fullName = 'another test',
    r => r.testResults[0].assertionResults[0].failureMessages = ['Error: failed to import module'],
    r => r.testResults[0].assertionResults[0].failureMessages = ['AssertionError: expected 1 to be 2'],
    r => r.testResults.push({ status: 'failed', assertionResults: [{ status: 'passed', fullName: 'loaded suite' }] }),
    r => r.testResults.push({ status: 'failed', assertionResults: [] })];
  for (const change of changes) { const r = report(); change(r); assert.throws(() => classifyCodingReplayReport(r, 1, expectedFailure), /coding_test_replay_unproven/); }
  for (const exit of [0, 2, null, 124]) assert.throws(() => classifyCodingReplayReport(report(), exit, expectedFailure), /coding_test_replay_unproven/);
});

test('forged proof, invalid seal and expired authority fail before process or replay artifact creation', async t => {
  const f = fixture(t);
  await assert.rejects(run(Object.freeze({})), /coding_test_replay_unproven/);
  await assert.rejects(run(f.prepare(), { workspaceSeal: 'not-a-seal' }), /coding_test_replay_unproven/);
  await assert.rejects(run(f.prepare(), { assertAuthority: () => { throw Error('expired'); } }), /coding_test_replay_unproven/);
  await assert.rejects(run(f.prepare(), { assertAuthority: () => Promise.resolve() }), /coding_test_replay_unproven/);
  assert.equal(git(f.root, 'status', '--porcelain'), '');
  assert.equal(isCodingTestReplayReceipt({ candidateCommit: f.options.candidateCommit, repositoryUnchanged: true,
    temporaryConfigurationRemoved: true, digest: 'a'.repeat(64) }, f.options.candidateCommit), false);
  assert.throws(() => bindCodingTestReplayVerification({ candidateCommit: f.options.candidateCommit }), /coding_test_replay_unproven/);
});

const nativeRoot = process.env.ROOST_TEST_VITEST_ROOT;
test('native fixture runs exact projected RED and unchanged GREEN in closed Jobs and removes replay configuration',
  { skip: process.platform !== 'win32' || !nativeRoot, timeout: 180000 }, async t => {
    const f = fixture(t, realpathSync.native(nativeRoot));
    writeFileSync(path.join(f.workspace, relativePath),
      "import value from '@/app/manifest'; import { describe, it, expect } from 'vitest'; describe('dimension regression',()=>{it('exact dimensions',()=>{expect(value()).toBe(1000);expect(process.env.OPENAI_API_KEY).toBeUndefined();});});\n");
    git(f.root, 'add', '--', '.'); git(f.root, 'commit', '--amend', '--no-edit');
    f.options.candidateCommit = git(f.root, 'rev-parse', 'HEAD');
    const before = readFileSync(path.join(f.root, modulePath)), proof = f.prepare();
    const result = await run(proof, { remainingMs: () => 120000 });
    assert.equal(result.red.exitCode, 1); assert.equal(result.red.testCounts.failedTests, 1);
    assert.equal(result.green.passed, true); assert.equal(result.green.tests[0].testCounts.passedTests, 1);
    assert.equal(result.repositoryUnchanged, true); assert.equal(result.temporaryConfigurationRemoved, true);
    assert.equal(isCodingTestReplayReceipt(result, f.options.candidateCommit), true);
    assert.equal(isCodingTestReplayReceipt(JSON.parse(JSON.stringify(result)), f.options.candidateCommit), false);
    const bound = bindCodingTestReplayVerification(result);
    assert.equal(bound.schemaVersion, 'roost-coding-tests-v1'); assert.equal(bound.passed, true);
    assert.equal(bound.regressionReplay.baselineCommit, f.options.baselineCommit);
    assert.equal(isCodingTestReplayReceipt(bound, f.options.candidateCommit), true);
    assert.equal(isCodingTestReplayReceipt(bound, f.options.baselineCommit), false);
    assert.deepEqual(readFileSync(path.join(f.root, modulePath)), before);
    assert.equal(git(f.root, 'status', '--porcelain'), '');
    assert.equal(git(f.root, 'rev-parse', 'HEAD'), f.options.candidateCommit);
    assert.ok(readdirSync(f.container).every(name => !name.startsWith('roost-test-replay-')));
    await assert.rejects(run(proof), /coding_test_replay_unproven/);
    bound.tests[0].exitCode = 1;
    assert.equal(isCodingTestReplayReceipt(bound, f.options.candidateCommit), false);
  });
