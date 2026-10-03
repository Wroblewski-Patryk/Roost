import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { materializeReleaseGitObjects } from './lib/agent-host-release-git-materialization.mjs';

const gitNull = process.platform === 'win32' ? 'NUL' : os.devNull;
const env = () => ({ PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
  TEMP: process.env.TEMP, TMP: process.env.TMP, GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: gitNull, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
function git(cwd, args, { limit = 32768, input, environment = env() } = {}) {
  const result = spawnSync('git', ['--no-replace-objects', '-c', 'core.hooksPath=' + gitNull,
    '-c', 'core.fsmonitor=false', '-C', cwd, ...args],
  { env: environment, windowsHide: true, timeout: 15000, maxBuffer: limit, input });
  if (result.error || result.status !== 0) throw Error('fixture_git_failed');
  assert.ok(result.stdout.length <= limit);
  return result.stdout;
}
async function snapshot(directory) {
  const rows = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else rows.push([path.relative(directory, file), createHash('sha256').update(await readFile(file)).digest('hex')]);
    }
  }
  await walk(directory);
  return rows.sort((a, b) => a[0].localeCompare(b[0]));
}
async function fixture(t, { packed = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'roost-git-materialization-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'canonical repository with spaces'), target = path.join(root, 'isolated bare with spaces');
  await mkdir(source); await mkdir(target);
  git(source, ['init', '--template=', '--initial-branch=main', '.']);
  await writeFile(path.join(source, 'large.bin'), randomBytes(262144));
  git(source, ['add', 'large.bin']);
  git(source, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'native materialization fixture']);
  const commit = git(source, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const tree = git(source, ['rev-parse', 'HEAD^{tree}']).toString('utf8').trim();
  const blob = git(source, ['rev-parse', 'HEAD:large.bin']).toString('utf8').trim();
  if (packed) git(source, ['repack', '-ad']);
  return { root, source, target, commit, tree, blob };
}

test('native isolated Git reads a packed exact commit without streaming a pack or inheriting config', async t => {
  const f = await fixture(t, { packed: true });
  // The former pack/stdout approach cannot fit inside the real native limit.
  const pack = git(f.source, ['pack-objects', '--stdout', '--revs'], { input: `${f.commit}\n`, limit: 1_000_000 });
  assert.ok(pack.length > 131072);
  git(f.source, ['config', 'credential.helper', '!echo forbidden-helper']);
  git(f.source, ['config', 'http.https://github.com/.extraHeader', 'forbidden-canonical-header']);
  const hostileTemplate = path.join(f.root, 'hostile template');
  await mkdir(hostileTemplate);
  await writeFile(path.join(hostileTemplate, 'unexpected-template'), 'must not be copied');
  const hostileGlobal = path.join(f.root, 'hostile global config');
  await writeFile(hostileGlobal, `[init]\n\ttemplateDir = "${hostileTemplate.replaceAll('\\', '/')}"\n[credential]\n\thelper = forbidden-global-helper\n`);
  const before = await snapshot(f.source), calls = [];
  const run = async (cwd, args, options) => {
    calls.push({ cwd, args, limit: options.limit });
    // Simulate inherited hostile global setting; the owned executor overrides
    // it exactly as the installed executor must do.
    const inherited = { ...env(), GIT_CONFIG_GLOBAL: hostileGlobal };
    return git(cwd, args, { ...options, environment: { ...inherited, GIT_CONFIG_GLOBAL: gitNull } });
  };
  assert.deepEqual(await materializeReleaseGitObjects({ canonicalDir: f.source, directory: f.target,
    commit: f.commit, candidateTree: f.tree, run }), { commit: f.commit, tree: f.tree, ready: true });
  assert.deepEqual(await snapshot(f.source), before);
  assert.ok(calls.every(c => c.limit === 32768));
  assert.ok(calls.every(c => !c.args.includes('pack-objects') && !c.args.includes('index-pack') && !c.args.includes('push')));
  assert.equal(git(f.target, ['cat-file', '-s', f.blob]).toString('utf8').trim(), '262144');
  const bytes = git(f.target, ['cat-file', 'blob', f.blob], { limit: 300000 });
  assert.deepEqual(bytes, await readFile(path.join(f.source, 'large.bin')));
  const config = git(f.target, ['config', '--local', '--list']).toString('utf8');
  assert.equal(config.includes('forbidden'), false);
  assert.deepEqual((await readdir(f.target)).sort(), ['HEAD', 'config', 'objects', 'refs']);
  const alternate = await readFile(path.join(f.target, 'objects', 'info', 'alternates'), 'utf8');
  assert.equal(alternate, JSON.stringify(path.join(f.source, '.git', 'objects').replaceAll('\\', '/')) + '\n');
});

test('native connectivity refuses a missing reachable blob and incorrect exact tree', async t => {
  const f = await fixture(t);
  const run = async (cwd, args, options) => git(cwd, args, options);
  await assert.rejects(materializeReleaseGitObjects({ canonicalDir: f.source, directory: f.target,
    commit: f.commit, candidateTree: 'a'.repeat(40), run }), /materialization_unproven/);
  const secondTarget = path.join(f.root, 'missing blob target'); await mkdir(secondTarget);
  await rm(path.join(f.source, '.git', 'objects', f.blob.slice(0, 2), f.blob.slice(2)));
  await assert.rejects(materializeReleaseGitObjects({ canonicalDir: f.source, directory: secondTarget,
    commit: f.commit, candidateTree: f.tree, run }), /fixture_git_failed/);
});

test('refuses alternate chains, occupied destinations and source-contained destinations before init', async t => {
  const f = await fixture(t), calls = [];
  const run = async (...args) => { calls.push(args); return git(...args); };
  const options = { canonicalDir: f.source, directory: f.target, commit: f.commit, candidateTree: f.tree, run };
  await writeFile(path.join(f.target, 'occupied'), 'retained');
  await assert.rejects(materializeReleaseGitObjects(options), /materialization_unproven/);
  await rm(path.join(f.target, 'occupied'));
  await assert.rejects(materializeReleaseGitObjects({ ...options, directory: f.source }), /materialization_unproven/);
  const nested = path.join(f.source, 'nested'); await mkdir(nested);
  await assert.rejects(materializeReleaseGitObjects({ ...options, directory: nested }), /materialization_unproven/);
  await writeFile(path.join(f.source, '.git', 'objects', 'info', 'alternates'), '/unapproved\n');
  await assert.rejects(materializeReleaseGitObjects(options), /materialization_unproven/);
  assert.equal(calls.length, 0);
});

test('refuses symbolic canonical and destination identities', async t => {
  const f = await fixture(t), calls = [];
  const run = async (...args) => { calls.push(args); return git(...args); };
  const sourceLink = path.join(f.root, 'source link'), targetLink = path.join(f.root, 'target link');
  await symlink(f.source, sourceLink, process.platform === 'win32' ? 'junction' : 'dir');
  await symlink(f.target, targetLink, process.platform === 'win32' ? 'junction' : 'dir');
  for (const pair of [{ canonicalDir: sourceLink, directory: f.target }, { canonicalDir: f.source, directory: targetLink }]) {
    await assert.rejects(materializeReleaseGitObjects({ ...pair, commit: f.commit, candidateTree: f.tree, run }), /materialization_unproven/);
  }
  assert.equal(calls.length, 0);
});
