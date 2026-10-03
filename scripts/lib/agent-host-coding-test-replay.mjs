import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareCodingTests, runCodingTests } from './agent-host-coding-tests.mjs';
import { nativeDigest, nativeRelative, physicalIdentity } from './agent-host-native-footprint.mjs';
import { normalizeGitRemote } from './agent-host-workspace-guard.mjs';
import { isWindowsJobCleanupReceipt, startWindowsJob, temporaryWindowsJobLauncher } from './agent-host-windows-job.mjs';

// Fixed verification of a retained candidate. The managed coding caller must
// authenticate its continuation; this module grants no readonly model tools.
// No checkout, restore, clone, commit or application source write.
const proofs = new WeakMap();
const receipts = new WeakMap();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw Object.assign(new Error('coding_test_replay_unproven'), { retryable: false }); };
const inside = (root, value) => { const r = path.relative(root, value); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
const env = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA)$/i.test(key)));
function git(root, args, binary = false) {
  return execFileSync('git', ['--no-replace-objects', '--literal-pathspecs', '-c', 'core.fsmonitor=false',
    '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=' + (process.platform === 'win32' ? 'NUL' : '/dev/null'), ...args], {
    cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024,
    env: { ...env(), GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' },
    ...(binary ? {} : { encoding: 'utf8' }), stdio: ['ignore', 'pipe', 'pipe'] });
}
function bytes(file, max = 4 * 1024 * 1024, dependency = false) {
  if (dependency) physicalIdentity(path.dirname(file)); else physicalIdentity(file, false);
  const a = lstatSync(file, { bigint: true });
  if (!a.isFile() || a.isSymbolicLink() || a.nlink < 1n || !dependency && a.nlink !== 1n
    || a.size > BigInt(max) || !same(realpathSync.native(file), file)) fail();
  const value = readFileSync(file), b = lstatSync(file, { bigint: true });
  if (BigInt(value.length) !== a.size || a.ino !== b.ino || a.dev !== b.dev || a.mtimeNs !== b.mtimeNs || a.nlink !== b.nlink) fail();
  return { value, digest: sha(value), identity: nativeDigest([file, String(a.dev), String(a.ino), String(a.nlink)]) };
}
const text = value => new TextDecoder('utf8', { fatal: true }).decode(value).replace(/\r\n/g, '\n');
export function isCodingTestReplayReceipt(value, expectedCandidate) {
  try {
    const proof = receipts.get(value);
    if (!proof || proof.candidate !== expectedCandidate || (value.candidateCommit ?? value.regressionReplay?.candidateCommit) !== expectedCandidate
      || performance.now() - proof.at < 0 || performance.now() - proof.at > 300000) return false;
    const { digest, ...body } = value;
    return digest === proof.digest && nativeDigest(body) === digest;
  } catch { return false; }
}
export function bindCodingTestReplayVerification(replay) {
  if (!isCodingTestReplayReceipt(replay, replay?.candidateCommit)) fail();
  const { green, digest: _digest, ...regressionReplay } = replay;
  const body = { ...green, regressionReplay };
  delete body.digest;
  const value = Object.freeze({ ...body, digest: nativeDigest(body) });
  receipts.set(value, { candidate: replay.candidateCommit, digest: value.digest, at: performance.now() });
  return value;
}
function trackedPin(root, relative, binary = false) {
  nativeRelative(relative);
  const filename = path.join(root, relative), pin = bytes(filename), committed = git(root, ['show', `HEAD:${relative}`], true);
  if (binary ? !pin.value.equals(committed) : text(pin.value) !== text(committed)) fail();
  return { filename, relative, digest: pin.digest, identity: pin.identity };
}
function snapshot(root) {
  const head = git(root, ['rev-parse', 'HEAD']).trim(), branch = git(root, ['symbolic-ref', '--short', 'HEAD']).trim();
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status) fail();
  return { head, branch, statusDigest: sha(status) };
}

// A nonzero process exit is insufficient: require a real failed assertion in
// the exact test, no skipped tests or suite/load errors, and meaningful counts.
export function classifyCodingReplayReport(report, exitCode, expectedFailure) {
  try {
    const c = [report.numTotalTests, report.numPassedTests, report.numFailedTests, report.numPendingTests];
    if (exitCode !== 1 || report.success !== false || !c.every(n => Number.isSafeInteger(n) && n >= 0)
      || c[0] < 1 || c[2] !== 1 || c[3] !== 0 || c[1] + c[2] !== c[0]
      || report.numRuntimeErrorTestSuites !== undefined && report.numRuntimeErrorTestSuites !== 0
      || !Array.isArray(report.testResults) || !report.testResults.length) fail();
    const assertions = report.testResults.flatMap(suite => {
      if (!Array.isArray(suite.assertionResults) || !suite.assertionResults.length
        || !['passed', 'failed'].includes(suite.status)
        || (suite.status === 'failed') !== suite.assertionResults.some(a => a.status === 'failed')) fail();
      return suite.assertionResults;
    });
    if (assertions.length !== c[0] || assertions.some(a => !['passed', 'failed'].includes(a.status))) fail();
    const failures = assertions.filter(a => a.status === 'failed');
    const failure = failures[0], messages = failure?.failureMessages;
    if (failures.length !== 1 || failure.fullName !== expectedFailure.fullName || !Array.isArray(messages)
      || messages.length !== 1 || typeof messages[0] !== 'string' || messages[0].length > 16384
      || !messages[0].includes('AssertionError:') || expectedFailure.messageIncludes.some(s => !messages[0].includes(s))) fail();
    return { totalTests: c[0], passedTests: c[1], failedTests: c[2], pendingTests: c[3],
      failedTestName: failure.fullName, assertionFailureDigest: sha(messages[0]) };
  } catch { fail(); }
}

export function prepareCodingTestReplay(options) {
  try {
    const { repositoryPath: root, candidateCommit, baselineCommit, branch, projectionPaths, assetPaths = [],
      manifestPath, originUrl, acceptanceTests, temporaryParent, expectedFailure } = options;
    if (!/^[a-f0-9]{40}$/.test(candidateCommit) || !/^[a-f0-9]{40}$/.test(baselineCommit)
      || typeof branch !== 'string' || !branch.startsWith('codex/') || !Array.isArray(projectionPaths)
      || projectionPaths.length < 1 || projectionPaths.length > 4 || new Set(projectionPaths).size !== projectionPaths.length
      || !Array.isArray(assetPaths) || assetPaths.length > 8 || new Set(assetPaths).size !== assetPaths.length
      || !expectedFailure || typeof expectedFailure.fullName !== 'string' || !expectedFailure.fullName.trim()
      || expectedFailure.fullName.length > 1000 || !Array.isArray(expectedFailure.messageIncludes)
      || expectedFailure.messageIncludes.length < 2 || expectedFailure.messageIncludes.length > 8
      || expectedFailure.messageIncludes.some(s => typeof s !== 'string' || !s.trim() || s.length > 1000)) fail();
    physicalIdentity(root); physicalIdentity(path.join(root, '.git')); physicalIdentity(temporaryParent);
    if (inside(root, temporaryParent) || same(root, temporaryParent)) fail();
    if (!same(path.resolve(git(root, ['rev-parse', '--show-toplevel']).trim()), root)
      || !same(path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).trim()), path.join(root, '.git'))
      || normalizeGitRemote(git(root, ['remote', 'get-url', 'origin']).trim()) !== normalizeGitRemote(originUrl)) fail();
    const initial = snapshot(root);
    if (initial.head !== candidateCommit || initial.branch !== branch
      || git(root, ['rev-list', '--parents', '-n', '1', candidateCommit]).trim() !== `${candidateCommit} ${baselineCommit}`) fail();
    const manifestBytes = bytes(manifestPath, 16384), manifest = JSON.parse(manifestBytes.value);
    if (!Array.isArray(manifest.commands) || manifest.commands.length !== 1 || manifest.commands[0].kind !== 'workspace_vitest') fail();
    const command = manifest.commands[0], testRelative = `${command.workspace}/${command.relativePath}`;
    const candidateProof = prepareCodingTests({ manifestPath, repositoryPath: root, originUrl, acceptanceTests, writePaths: [testRelative] });
    const pins = [trackedPin(root, 'package.json'), trackedPin(root, 'pnpm-lock.yaml'),
      trackedPin(root, `${command.workspace}/package.json`), trackedPin(root, testRelative)];
    const workspace = path.join(root, command.workspace);
    const names = ['vitest', 'vite'].flatMap(n => ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map(ext => `${n}.config.${ext}`));
    const configs = names.filter(n => existsSync(path.join(workspace, n)));
    // More than one config makes precedence ambiguous; reject instead of guessing.
    if (configs.length > 1) fail();
    for (const n of configs) pins.push(trackedPin(root, `${command.workspace}/${n}`));
    for (const n of ['tsconfig.json', 'vitest.setup.ts', 'vitest.setup.js', 'vitest.setup.mjs'])
      if (existsSync(path.join(workspace, n))) pins.push(trackedPin(root, `${command.workspace}/${n}`));
    const projections = projectionPaths.map(relative => {
      nativeRelative(relative);
      if (!relative.startsWith(`${command.workspace}/src/`) || !/\.(?:[cm]?[jt]s|[jt]sx)$/.test(relative)
        || /(?:\.test\.|\.spec\.|\.config\.)/.test(relative) || relative === testRelative) fail();
      const pin = trackedPin(root, relative); pins.push(pin);
      const baseline = git(root, ['show', `${baselineCommit}:${relative}`], true), source = text(baseline);
      if (!source.trim() || source.includes('\0') || baseline.length > 131072 || text(bytes(pin.filename).value) === source) fail();
      return { relativePath: relative, filename: pin.filename, baselineSource: source,
        baselineBlobDigest: sha(baseline), projectedSourceDigest: sha(source), candidateDigest: pin.digest };
    });
    for (const relative of assetPaths) {
      if (projectionPaths.includes(relative) || relative === testRelative) fail();
      const pin = trackedPin(root, relative, true);
      if (sha(git(root, ['show', `${baselineCommit}:${relative}`], true)) !== pin.digest) fail();
      pins.push(pin);
    }
    const installedRoot = realpathSync.native(path.join(workspace, 'node_modules', 'vitest'));
    const cli = path.join(installedRoot, 'vitest.mjs');
    for (const filename of [process.execPath, cli, path.join(installedRoot, 'package.json')]) {
      const p = bytes(filename, 128 * 1024 * 1024, true); pins.push({ filename, digest: p.digest, identity: p.identity, dependency: true });
    }
    const proof = Object.freeze({});
    proofs.set(proof, { root, candidateCommit, baselineCommit, branch, initial, temporaryParent, command, workspace, configs, names,
      cli, installedRoot, pins, projections, testRelative, assetPaths: [...assetPaths], manifestPath,
      manifestDigest: manifestBytes.digest, candidateProof, expectedFailure: structuredClone(expectedFailure), used: false });
    return proof;
  } catch { fail(); }
}
function assertPinned(p, assertAuthority) {
  if (typeof assertAuthority !== 'function' || assertAuthority()?.then) fail();
  if (JSON.stringify(snapshot(p.root)) !== JSON.stringify(p.initial) || bytes(p.manifestPath, 16384).digest !== p.manifestDigest
    || realpathSync.native(path.join(p.workspace, 'node_modules', 'vitest')) !== p.installedRoot
    || JSON.stringify(p.names.filter(n => existsSync(path.join(p.workspace, n)))) !== JSON.stringify(p.configs)) fail();
  for (const pin of p.pins) {
    const actual = bytes(pin.filename, 128 * 1024 * 1024, pin.dependency);
    if (actual.identity !== pin.identity || actual.digest !== pin.digest) fail();
  }
}
function configSource(p, directory, witnessPath) {
  const entries = p.projections.map(x => ({ filename: x.filename.replaceAll('\\', '/'), source: x.baselineSource,
    relativePath: x.relativePath, sourceDigest: x.projectedSourceDigest }));
  // Vite bundles this wrapper and the original tracked config in our private
  // directory. load returns Git bytes in memory; canonical module stays intact.
  return `${p.configs.length ? `import original from ${JSON.stringify(path.join(p.workspace, p.configs[0]).replaceAll('\\', '/'))};` : 'const original = {};'}
import { writeFileSync } from 'node:fs';
const entries = ${JSON.stringify(entries)}, observed = new Map();
export default async function(env) {
 const base = typeof original === 'function' ? await original(env) : await original;
 if (!base || typeof base !== 'object' || Array.isArray(base)) throw Error('replay_config_invalid');
 const plugin = { name: 'roost-pinned-baseline-replay', enforce: 'pre', load(id) {
  const canonical = id.split('?')[0].replaceAll('\\\\', '/');
  const entry = entries.find(x => x.filename.toLowerCase() === canonical.toLowerCase());
  if (!entry) return null;
  if (id.includes('?')) throw Error('replay_projection_query_denied');
  observed.set(entry.relativePath, {relativePath: entry.relativePath, sourceDigest: entry.sourceDigest});
  writeFileSync(${JSON.stringify(witnessPath)}, JSON.stringify([...observed.values()]));
  return entry.source;
 }};
 return {...base, root: ${JSON.stringify(p.workspace)}, cacheDir: ${JSON.stringify(path.join(directory, 'vite-cache'))},
  plugins: [plugin, ...(base.plugins || [])], test: {...(base.test || {}), cache: false}};
}
`;
}
function cleanupDirectory(directory, parent) {
  if (!same(path.dirname(directory), parent) || !path.basename(directory).startsWith('roost-test-replay-')) fail();
  physicalIdentity(directory); let count = 0;
  function check(current) {
    for (const name of readdirSync(current)) {
      const target = path.join(current, name), stat = lstatSync(target);
      if (++count > 1024 || !inside(directory, target) || stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) fail();
      if (stat.isDirectory()) check(target);
    }
  }
  check(directory); rmSync(directory, { recursive: true, force: false });
  if (existsSync(directory)) fail();
}
export async function runCodingTestReplay(proof, { workspaceSeal, remainingMs, assertAuthority }) {
  let directory, p;
  try {
    p = proofs.get(proof);
    if (!p || p.used || !/^[a-f0-9]{64}$/.test(workspaceSeal) || typeof remainingMs !== 'function') fail();
    p.used = true; assertPinned(p, assertAuthority);
    directory = mkdtempSync(path.join(p.temporaryParent, 'roost-test-replay-'));
    const config = path.join(directory, 'baseline.config.mjs'), witness = path.join(directory, 'projection-witness.json');
    writeFileSync(config, configSource(p, directory, witness), { flag: 'wx' });
    const configPin = bytes(config), output = createHash('sha256'), chunks = []; let outputBytes = 0;
    const native = await temporaryWindowsJobLauncher(async artifact => {
      assertPinned(p, assertAuthority);
      const duration = remainingMs(); if (!Number.isFinite(duration) || duration < 1) fail();
      const handle = await startWindowsJob(artifact, { executable: process.execPath,
        argv: [p.cli, 'run', p.command.relativePath, '--config', config, '--maxWorkers=1', '--fileParallelism=false',
          '--pool=forks', '--passWithNoTests=false', '--reporter=json'], cwd: p.workspace, input: '',
        environment: { ...env(), GIT_TERMINAL_PROMPT: '0', npm_config_ignore_scripts: 'true', npm_config_audit: 'false',
          npm_config_fund: 'false', npm_config_update_notifier: 'false' }, attempt: randomUUID(), durationMs: Math.floor(Math.min(duration, 120000)),
        onData: (channel, chunk) => { if (assertAuthority()?.then) fail(); outputBytes += chunk.length;
          if (outputBytes > 131072) fail(); output.update(chunk); if (channel === 'stdout') chunks.push(chunk); } });
      let problem;
      const timer = setInterval(() => { try { assertPinned(p, assertAuthority); } catch (e) { problem = e; handle.stop('lease_lost'); } }, 2000);
      try { const result = await handle.completion; if (problem) throw problem; return result; }
      finally { clearInterval(timer); }
    });
    if (!isWindowsJobCleanupReceipt(native) || !native.cleanup || !native.jobClosed || native.activeProcesses !== 0
      || native.terminationReason !== 'root_exit' || native.resumed !== true) fail();
    assertPinned(p, assertAuthority);
    if (bytes(config).identity !== configPin.identity || bytes(config).digest !== configPin.digest) fail();
    const observed = JSON.parse(bytes(witness, 16384).value);
    const expected = p.projections.map(x => ({ relativePath: x.relativePath, sourceDigest: x.projectedSourceDigest }));
    const sorted = rows => [...rows].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    if (!Array.isArray(observed) || JSON.stringify(sorted(observed)) !== JSON.stringify(sorted(expected))) fail();
    const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const counts = classifyCodingReplayReport(report, native.rootExit, p.expectedFailure);
    const red = { phase: 'baseline_projection', exitCode: native.rootExit, outputDigest: output.digest('hex'), outputBytes,
      testCounts: counts, jobDigest: nativeDigest(native), projectionWitnessDigest: nativeDigest(sorted(observed)),
      cleanup: { jobClosed: true, activeProcesses: 0 } };
    cleanupDirectory(directory, p.temporaryParent); directory = undefined;
    assertPinned(p, assertAuthority);
    const green = await runCodingTests(p.candidateProof, { phase: 'candidate', workspaceSeal, remainingMs, assertAuthority });
    assertPinned(p, assertAuthority);
    if (!green.passed || green.tests.length !== 1 || green.tests[0].testCounts?.pendingTests !== 0
      || green.tests[0].testCounts?.failedTests !== 0 || green.tests[0].testCounts?.totalTests !== counts.totalTests) fail();
    const result = { schemaVersion: 'roost-native-coding-test-replay-v1', claim: 'fresh_baseline_projection_and_unchanged_candidate',
      candidateCommit: p.candidateCommit, baselineCommit: p.baselineCommit, branch: p.branch,
      manifestDigest: p.manifestDigest, workspaceSeal, testRelativePath: p.testRelative,
      testDigest: p.pins.find(x => x.relative === p.testRelative).digest,
      modules: p.projections.map(({ relativePath, baselineBlobDigest, projectedSourceDigest, candidateDigest }) =>
        ({ relativePath, baselineBlobDigest, projectedSourceDigest, candidateDigest })),
      assetPins: p.assetPaths.map(relative => ({ relativePath: relative, digest: p.pins.find(x => x.relative === relative).digest })),
      pinnedInputsDigest: nativeDigest(p.pins.map(({ filename, digest, identity }) => ({ filename, digest, identity }))),
      red, green, repositoryUnchanged: true, temporaryConfigurationRemoved: true, completedAt: new Date().toISOString() };
    const value = Object.freeze({ ...result, digest: nativeDigest(result) });
    receipts.set(value, { candidate: p.candidateCommit, digest: value.digest, at: performance.now() });
    return value;
  } catch { fail(); }
  finally { if (directory && p) cleanupDirectory(directory, p.temporaryParent); }
}
