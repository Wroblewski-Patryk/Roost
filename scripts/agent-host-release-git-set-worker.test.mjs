import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createInstalledGitSetRelease, installedGitSetReleaseSchema, parseGitSetSafetyCounts, gitSetTradingSafetySql, releaseServiceResponseHealthy }
  from './lib/agent-host-release-git-set-worker.mjs';
import contract from './lib/agent-host-release-contract.cjs';
import { governedReleaseWorkerSchema, assertReleaseWorkerAdapter } from './lib/agent-host-release-worker.mjs';
import { releaseClientSchema } from './lib/agent-host-release-client.mjs';

const commit = 'a'.repeat(40), candidateTree = 'b'.repeat(40), baseCommit = 'c'.repeat(40), baseTree = 'd'.repeat(40);
const configDigest = '1'.repeat(64), schemaDigest = '2'.repeat(64), dataDigest = '3'.repeat(64), imageDigest = `sha256:${'4'.repeat(64)}`;
const targetId = 'fixture-web', oldDeploymentId = 'old-deployment', at = '2026-10-02T00:00:00.000Z';
const zeroCounts = { activeBots: 0, runningSessions: 0, liveOpenOrders: 0, liveOpenPositions: 0,
  unknownOpenOrders: 0, unknownOpenPositions: 0, allOpenOrders: 0, allOpenPositions: 0, pendingDedupes: 0 };

function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'roost-git-set-source-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const workspaceRoot = path.join(directory, 'workspace'), canonicalDir = path.join(workspaceRoot, 'pilot');
  mkdirSync(path.join(canonicalDir, '.git'), { recursive: true });
  const applicationId = randomUUID(), ownershipFile = path.join(directory, 'ownership.json'), repositoryUrl = 'https://github.com/example/pilot';
  const target = { targetId, name: 'web', dockerfile: '/apps/web/Dockerfile', configDigest,
    baseline: { commit: baseCommit, tree: baseTree, imageDigest, configDigest } };
  const aggregate = contract.releaseDigest([{ targetId, configDigest }]);
  const backup = { digest: '5'.repeat(64), bytes: 100, capturedAt: at, restoreVerifiedAt: at, restoreDigest: '5'.repeat(64) };
  const services = [{ name: 'web', healthUrl: 'https://pilot.example.test/health', expectedStatus: 200 }];
  const manifest = { schemaVersion: 'roost-release-manifest-v2', purpose: 'application_release',
    repository: { url: repositoryUrl, defaultBranch: 'main', candidateBranch: 'codex/release', canonicalDir },
    deployment: { provider: 'coolify_git_set', targetId, controllerUrl: 'https://controller.example.test', url: 'https://pilot.example.test',
      artifactSetDigest: '', configDigest: aggregate, schemaDigest, publicOrigins: ['https://pilot.example.test'], targets: [target] },
    services, baseline: { commit: baseCommit, artifactSetDigest: '', configDigest: aggregate, schemaDigest, healthDigest:
      contract.releaseDigest(services.map(service => ({ ...service, healthy: true }))), dataDigest, observedAt: at },
    observation: { seconds: 1, intervalSeconds: 1, maxFailures: 0 }, backup, rollback: { commit: baseCommit,
      artifactSetDigest: '', configDigest: aggregate, schemaDigest, compatibleSchemaDigests: [schemaDigest] },
    cleanup: { repositoryUrl, canonicalDir, coolifyTargetId: targetId, archiveRepository: false,
      ownedResourceIds: [], protectedResourceIds: [targetId, imageDigest] } };
  const binding = { applicationId, commit, candidateTree, baseCommit, baseTree, manifest };
  manifest.deployment.artifactSetDigest = contract.gitSetArtifactDigest(manifest, binding);
  manifest.baseline.artifactSetDigest = manifest.rollback.artifactSetDigest = contract.gitSetArtifactDigest(manifest, binding, true);
  writeFileSync(ownershipFile, JSON.stringify({ schemaVersion: 'roost-application-release-ownership-v1', applicationId,
    canonicalDir, repositoryUrl, targetIds: [targetId], protectedResourceIds: manifest.cleanup.protectedResourceIds, ownedResourceIds: [] }));
  const settings = { sshHost: 'fixture-vps', workspaceRoot, ownershipFile, sourcePins: { queueHelper: '6'.repeat(64), deploymentJob: '7'.repeat(64) },
    baselineDeployments: [{ targetId, deploymentId: oldDeploymentId }], source: { sshHost: 'fixture-vps', container: '8'.repeat(64), user: 'appuser', database: 'appdb' },
    capacity: { minDiskBytes: 100, minMemoryBytes: 100, maxLoad1: 10 }, coolify: { origin: 'https://controller.example.test' }, health: {} };
  const state = { release: { id: randomUUID(), snapshot: binding }, journal: [] };
  const calls = [], controls = { counts: { ...zeroCounts }, pin: baseCommit, failSql: false, dataDigest };
  const dependencies = { nativeProcess: async (kind, options) => {
    calls.push({ kind, options });
    if (kind === 'git') return Buffer.from((options.argv.at(-1).startsWith(baseCommit) ? baseTree : candidateTree) + '\n');
    const command = options.argv.at(-1), input = options.input;
    if (command === 'bash -s' && input.includes('set -m; fingerprint_owner=')) {
      if (controls.fingerprintError) throw Error('synthetic fingerprint timeout');
      return controls.fingerprintOutput ?? Buffer.from(`${schemaDigest}  -\n${controls.dataDigest}  -\n`);
    }
    if (command.includes(' psql ')) { if (controls.failSql) throw Error('private DSN');
      return controls.readSafety ? controls.readSafety(input) : Buffer.from(JSON.stringify(controls.counts)); }
    if (command.startsWith('set -eu;')) return Buffer.from('{"diskBytes":1000,"memoryBytes":1000,"load1":0.1}');
    if (input.includes('configurationFields')) return Buffer.from(JSON.stringify({ targetId, applicationId: '4', buildPack: 'dockerfile',
      dockerfile: target.dockerfile, configDigest, schemaDigest, gitCommit: controls.pin, autoDeploy: false, topologyDigest: '9'.repeat(64) }));
    if (input.includes('activeDeployments')) return Buffer.from('{"activeDeployments":0}');
    if (input.includes('finishedAt')) return Buffer.from(JSON.stringify({ targetId, deploymentId: oldDeploymentId,
      commit: baseCommit, status: 'finished', createdAt: '2026-10-02T00:00:00.000Z', finishedAt: '2026-10-02T00:00:02.000Z' }));
    if (command.startsWith('docker container ls')) return Buffer.from('e'.repeat(64));
    if (command.startsWith('docker container inspect')) return Buffer.from(JSON.stringify({ id: 'e'.repeat(64), imageId: imageDigest,
      imageRef: `${targetId}:${baseCommit}`, createdAt: '2026-10-02T00:00:01.000Z', applicationId: '4', deploymentId: null, running: true, health: null }));
    if (command.startsWith('docker image inspect')) return Buffer.from(JSON.stringify({ imageId: imageDigest, createdAt: at, repoDigests: [] }));
    throw Error('unhandled fixed source test command');
  }, coolifyJson: async request => { calls.push({ request }); if (request.method === 'PATCH') controls.pin = request.body.git_commit_sha; return { uuid: targetId }; },
    healthProbe: async () => true };
  const install = () => createInstalledGitSetRelease({ settings, state, backup, github: { inspect: async () => ({ remoteBase: commit }) },
    coolifyCredential: 'fixture-credential-private', }, dependencies);
  return { install, settings, state, manifest, backup, controls, calls, ownershipFile, canonicalDir };
}

function installPreimage(f) {
  const snapshot = { observedAt: at, sourcePins: f.settings.sourcePins, schemaDigest,
    targets: [{ targetId, dockerfile: '/apps/web/Dockerfile' }], baselineDeployments: structuredClone(f.settings.baselineDeployments),
    rows: [{ configuration: { targetId, applicationId: '4', buildPack: 'dockerfile', dockerfile: '/apps/web/Dockerfile',
      configDigest, schemaDigest, gitCommit: '9'.repeat(40), autoDeploy: false, topologyDigest: '9'.repeat(64) },
    runtime: { targetId, commit: baseCommit, tree: baseTree, imageDigest, configDigest, schemaDigest, healthy: true, deploymentId: oldDeploymentId } }] };
  const file = path.join(path.dirname(f.ownershipFile), 'preimage.json'), bytes = Buffer.from(JSON.stringify(snapshot));
  writeFileSync(file, bytes); f.settings.configurationPreimage = { file, sha256: createHash('sha256').update(bytes).digest('hex') };
  f.controls.pin = snapshot.rows[0].configuration.gitCommit;
  const options = { operationId: 'configuration-one', since: '2026-10-02T01:00:00.000Z' };
  f.state.journal.push({ id: options.operationId, createdAt: options.since, operation: 'deploy_config' });
  return { snapshot, options, file };
}

test('installed original preimage reconciles pin distinct from baseline runtime through normal read-only adapter', async t => {
  const f = fixture(t), p = installPreimage(f), installed = f.install();
  const result = await installed.coolify.reconcileConfiguration(f.manifest, f.state.release.snapshot, p.options);
  assert.equal(result.state, 'absent'); assert.equal(result.evidence.absenceVerified, true);
  assert.equal(result.evidence.deployedTargets[0].commit, baseCommit);
  assert.equal(f.controls.pin, '9'.repeat(40)); assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
  assert.deepEqual(installedGitSetReleaseSchema.parse(f.settings), f.settings);
});
test('private original capture drift, changed configured pin and operation mismatch fail closed without PATCH', async t => {
  for (const mode of ['bytes', 'pin', 'intent', 'time', 'inside', 'unprotected']) {
    const f = fixture(t), p = installPreimage(f);
    if (mode === 'bytes') writeFileSync(p.file, JSON.stringify({ ...p.snapshot, observedAt: p.options.since }));
    if (mode === 'pin') f.controls.pin = '8'.repeat(40);
    if (mode === 'intent') p.options.operationId = 'different-operation';
    if (mode === 'time') p.options.since = at;
    if (mode === 'inside') f.settings.configurationPreimage.file = path.join(f.canonicalDir, 'preimage.json');
    if (mode === 'unprotected') { p.snapshot.targets.push({ targetId: 'unprotected', dockerfile: '/apps/api/Dockerfile' });
      p.snapshot.baselineDeployments.push({ targetId: 'unprotected', deploymentId: 'other-queue' });
      p.snapshot.rows.push({ configuration: { ...p.snapshot.rows[0].configuration, targetId: 'unprotected' },
        runtime: { ...p.snapshot.rows[0].runtime, targetId: 'unprotected', deploymentId: 'other-queue' } });
      const bytes = Buffer.from(JSON.stringify(p.snapshot)); writeFileSync(p.file, bytes); f.settings.configurationPreimage.sha256 = createHash('sha256').update(bytes).digest('hex'); }
    await assert.rejects(f.install().coolify.reconcileConfiguration(f.manifest, f.state.release.snapshot, p.options), /release_/);
    assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
  }
});

test('installation rejects scripts, callbacks, mismatched SSH endpoint and duplicate targets', t => {
  const f = fixture(t); assert.ok(installedGitSetReleaseSchema.safeParse(f.settings).success);
  for (const change of [{ script: 'code' }, { source: { ...f.settings.source, sshHost: 'other-vps' } },
    { baselineDeployments: [f.settings.baselineDeployments[0], f.settings.baselineDeployments[0]] }])
    assert.equal(installedGitSetReleaseSchema.safeParse({ ...f.settings, ...change }).success, false);
});

test('sealed JSON health rejects a failure payload despite HTTP 200 and ignores volatile timestamps', () => {
  const bytes = value => Buffer.from(JSON.stringify(value));
  assert.equal(releaseServiceResponseHealthy(bytes({ status: 'ok', timestamp: 'first' }), 'ok'), true);
  assert.equal(releaseServiceResponseHealthy(bytes({ status: 'ready', timestamp: 'second' }), 'ready'), true);
  for (const value of [{ status: 'failed' }, { status: 'starting' }, { healthy: true }, [], null])
    assert.equal(releaseServiceResponseHealthy(bytes(value), 'ok'), false);
  assert.equal(releaseServiceResponseHealthy(Buffer.from('not JSON'), 'ready'), false);
  assert.equal(releaseServiceResponseHealthy(Buffer.alloc(65537), 'ok'), false);
  assert.equal(releaseServiceResponseHealthy(bytes({ status: 'ok' }), 'unsealed'), false);
});

test('fixed global LIVE and orphan predicates distinguish paper while conservatively blocking restarts', () => {
  assert.match(gitSetTradingSafetySql, /READ ONLY/); assert.match(gitSetTradingSafetySql, /w\.mode='LIVE'/);
  assert.match(gitSetTradingSafetySql, /d\."botId" IS NULL/); assert.match(gitSetTradingSafetySql, /b\.id IS NOT NULL OR w\.id IS NOT NULL/);
  assert.doesNotMatch(gitSetTradingSafetySql, /UPDATE |DELETE |INSERT |ALTER |TRUNCATE /);
  assert.equal(parseGitSetSafetyCounts(JSON.stringify({ ...zeroCounts, activeBots: 1, runningSessions: 1,
    pendingDedupes: 5, liveOpenOrders: 5, allOpenOrders: 5, allOpenPositions: 23 })).activeTrading, 7);
  assert.throws(() => parseGitSetSafetyCounts('{}'), /safety_unavailable/);
  assert.throws(() => parseGitSetSafetyCounts(JSON.stringify({ ...zeroCounts, liveOpenOrders: 1 })), /safety_unavailable/);
});

test('source gateway allows known PAPER records but preserves totals and the full data fingerprint', async t => {
  const f = fixture(t); f.controls.counts = { ...zeroCounts, allOpenOrders: 3, allOpenPositions: 24 };
  const installed = f.install();
  assert.deepEqual(await installed.safety(), { activeTrading: 0, openOrders: 0, openPositions: 0, schemaDigest, dataDigest });
  const audit = await installed.safetyDiagnostic();
  assert.equal(audit.allOpenOrders, 3); assert.equal(audit.allOpenPositions, 24);
  await installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot);
  assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 1);
  assert.ok(f.calls.some(row => row.options?.input?.includes('pg_dump')));
  f.calls.length = 0; f.controls.dataDigest = 'f'.repeat(64);
  await assert.rejects(installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot), /data_or_schema_changed/);
  assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
});

test('fingerprint deadline is installation-only, bounded and preserves historical settings round-trip', async t => {
  const f = fixture(t);
  assert.deepEqual(installedGitSetReleaseSchema.parse(f.settings), f.settings);
  for (const timeoutMs of [undefined, 30000, 120000, 300000]) {
    if (timeoutMs === undefined) delete f.settings.fingerprintTimeoutMs;
    else f.settings.fingerprintTimeoutMs = timeoutMs;
    f.calls.length = 0;
    await f.install().safety();
    const fingerprints = f.calls.filter(row => row.options?.input?.includes('set -m; fingerprint_owner='));
    assert.equal(fingerprints.length, 1);
    assert.equal(fingerprints[0].options.durationMs, timeoutMs ?? 300000);
    assert.equal(f.calls.find(row => row.options?.input === gitSetTradingSafetySql).options.durationMs, 15000);
    assert.equal(fingerprints[0].options.argv.at(-1), 'bash -s');
    assert.ok(fingerprints[0].options.input.length > 8192);
    assert.ok(Buffer.byteLength(fingerprints[0].options.input) <= 131072);
    assert.match(fingerprints[0].options.input, /docker exec -i .* bash -e -o pipefail -c/);
    assert.match(fingerprints[0].options.input, /statement_timeout=/);
    assert.match(fingerprints[0].options.input, /lock_timeout=/);
  }
  for (const timeoutMs of [0, 29999, 300001, 1800000, 30000.5, '300000'])
    assert.equal(installedGitSetReleaseSchema.safeParse({ ...f.settings, fingerprintTimeoutMs: timeoutMs }).success, false);
});

test('failed, incomplete or changed fingerprints block configuration and final health evidence', async t => {
  for (const control of [{ fingerprintError: true }, { fingerprintOutput: Buffer.from(`${schemaDigest}  -\n`) },
    { fingerprintOutput: Buffer.from(`${schemaDigest}  -\nnot-a-digest\n`) }, { dataDigest: 'f'.repeat(64) }]) {
    const f = fixture(t); Object.assign(f.controls, control); const installed = f.install();
    await assert.rejects(installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot));
    assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
    await assert.rejects(installed.coolify.health(f.manifest, f.state.release.snapshot, { rollback: true }));
    await assert.rejects(installed.coolify.observe(f.manifest, f.state.release.snapshot, { rollback: true }));
    assert.equal(f.calls.filter(row => row.options?.argv?.at(-1)?.includes('deployTarget')).length, 0);
  }
});

test('source gateway still blocks each LIVE, unknown or restart predicate before fingerprint and effects', async t => {
  for (const counts of [{ activeBots: 1 }, { runningSessions: 1 }, { pendingDedupes: 1 },
    { liveOpenOrders: 1, allOpenOrders: 1 }, { liveOpenPositions: 1, allOpenPositions: 1 },
    { unknownOpenOrders: 1, allOpenOrders: 1 }, { unknownOpenPositions: 1, allOpenPositions: 1 }]) {
    const f = fixture(t); f.controls.counts = { ...zeroCounts, ...counts };
    const installed = f.install();
    await assert.rejects(installed.safety(), /activity_present/);
    await assert.rejects(installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot), /safety_unproven/);
    assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
    assert.equal(f.calls.filter(row => row.options?.input?.includes('pg_dump')).length, 0);
  }
});

// Explicit opt-in executes the production query on PostgreSQL with synthetic
// CTE relations in a READ ONLY transaction. No table, schema or data is written.
// The installed gateway still receives its exact fixed query; transport alone
// supplies the CTE fixture and runs it against the local test service.
test('read-only PostgreSQL gateway fixture classifies LIVE, explicit PAPER and unknown associations',
  { skip: process.env.ROOST_TEST_POSTGRES_SAFETY !== '1' }, async t => {
    const f = fixture(t), installed = f.install();
    const bots = [{ id: 'paper-bot', mode: 'PAPER', isActive: false }, { id: 'live-bot', mode: 'LIVE', isActive: false },
      { id: 'unknown-bot', mode: 'UNRECOGNIZED', isActive: false }, { id: 'null-bot', mode: null, isActive: false }];
    const wallets = [{ id: 'paper-wallet', mode: 'PAPER' }, { id: 'live-wallet', mode: 'LIVE' },
      { id: 'unknown-wallet', mode: 'UNRECOGNIZED' }, { id: 'null-wallet', mode: null }];
    let records, dedupes = [], sessions = [];
    f.controls.readSafety = input => {
      assert.equal(input, gitSetTradingSafetySql);
      const relation = (name, values, columns) => `"${name}" AS (SELECT * FROM jsonb_to_recordset('${JSON.stringify(values)}'::jsonb) AS fixture(${columns}))`;
      const cte = [relation('Bot', bots, 'id text, mode text, "isActive" boolean'),
        relation('Wallet', wallets, 'id text, mode text'),
        relation('Order', records.map(row => ({ status: 'OPEN', ...row })), '"botId" text, "walletId" text, origin text, status text'),
        relation('Position', records.map(row => ({ status: 'OPEN', ...row })), '"botId" text, "walletId" text, origin text, status text'),
        relation('RuntimeExecutionDedupe', dedupes, '"botId" text, status text'),
        relation('BotRuntimeSession', sessions, 'mode text, status text')].join(',\n');
      return execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
        '-U', 'companycore', '-d', 'companycore'], { input: input.replace('\nSELECT ', `\nWITH ${cte}\nSELECT `), timeout: 15000 });
    };
    const cases = [
      ['PAPER bot', { botId: 'paper-bot', walletId: null, origin: 'BOT' }, 'paper'],
      ['PAPER wallet', { botId: null, walletId: 'paper-wallet', origin: 'USER' }, 'paper'],
      ['both PAPER', { botId: 'paper-bot', walletId: 'paper-wallet', origin: 'BOT' }, 'paper'],
      ['LIVE bot', { botId: 'live-bot', walletId: null, origin: 'BOT' }, 'live'],
      ['LIVE wallet', { botId: null, walletId: 'live-wallet', origin: 'USER' }, 'live'],
      ['conflicting modes', { botId: 'paper-bot', walletId: 'live-wallet', origin: 'BOT' }, 'live'],
      ['orphan exchange', { botId: null, walletId: null, origin: 'EXCHANGE_SYNC' }, 'live'],
      ['PAPER exchange origin', { botId: 'paper-bot', walletId: 'paper-wallet', origin: 'EXCHANGE_SYNC' }, 'live'],
      ['orphan BOT', { botId: null, walletId: null, origin: 'BOT' }, 'unknown'],
      ['orphan MANUAL', { botId: null, walletId: null, origin: 'MANUAL' }, 'unknown'],
      ['orphan USER', { botId: null, walletId: null, origin: 'USER' }, 'unknown'],
      ['null origin orphan', { botId: null, walletId: null, origin: null }, 'unknown'],
      ['dangling bot with PAPER wallet', { botId: 'missing', walletId: 'paper-wallet', origin: 'BOT' }, 'unknown'],
      ['PAPER bot with dangling wallet', { botId: 'paper-bot', walletId: 'missing', origin: 'BOT' }, 'unknown'],
      ['unknown bot mode', { botId: 'unknown-bot', walletId: null, origin: 'BOT' }, 'unknown'],
      ['unknown wallet mode', { botId: null, walletId: 'unknown-wallet', origin: 'USER' }, 'unknown'],
      ['null bot mode with PAPER wallet', { botId: 'null-bot', walletId: 'paper-wallet', origin: 'BOT' }, 'unknown'],
      ['PAPER bot with null wallet mode', { botId: 'paper-bot', walletId: 'null-wallet', origin: 'BOT' }, 'unknown']
    ];
    for (const [label, record, classification] of cases) {
      records = [record]; f.calls.length = 0;
      const counts = await installed.safetyDiagnostic();
      assert.equal(counts.available, true, label);
      assert.equal(counts.allOpenOrders, 1, label); assert.equal(counts.allOpenPositions, 1, label);
      assert.equal(counts.liveOpenOrders, Number(classification === 'live'), label);
      assert.equal(counts.liveOpenPositions, Number(classification === 'live'), label);
      assert.equal(counts.unknownOpenOrders, Number(classification === 'unknown'), label);
      assert.equal(counts.unknownOpenPositions, Number(classification === 'unknown'), label);
      if (classification === 'paper') {
        assert.equal((await installed.safety()).openPositions, 0, label);
        await installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot);
        assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 1, label);
      } else {
        await assert.rejects(installed.safety(), /activity_present/, label);
        await assert.rejects(installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot), /safety_unproven/, label);
        assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0, label);
        assert.equal(f.calls.filter(row => row.options?.input?.includes('pg_dump')).length, 0, label);
      }
    }
    records = [];
    for (const botId of ['paper-bot', 'live-bot', null, 'missing', 'unknown-bot', 'null-bot']) {
      dedupes = [{ botId, status: 'PENDING' }];
      const counts = await installed.safetyDiagnostic();
      assert.equal(counts.pendingDedupes, Number(botId !== 'paper-bot'), `pending dedupe ${botId}`);
      if (botId !== 'paper-bot') await assert.rejects(installed.safety(), /activity_present/);
    }
    dedupes = []; bots[1].isActive = true; sessions = [{ mode: 'LIVE', status: 'RUNNING' }];
    const counts = await installed.safetyDiagnostic(); assert.equal(counts.activeBots, 1); assert.equal(counts.runningSessions, 1);
    await assert.rejects(installed.safety(), /activity_present/);
  });

test('nonquiescent safety blocks configuration before PATCH without zero fallback', async t => {
  const f = fixture(t); f.controls.counts = { ...zeroCounts, activeBots: 1, runningSessions: 1, liveOpenOrders: 5,
    allOpenOrders: 5, pendingDedupes: 5, allOpenPositions: 23 };
  const installed = f.install(); const proof = await installed.safetyDiagnostic();
  assert.equal(proof.activeTrading, 7); assert.equal(proof.allOpenPositions, 23);
  await assert.rejects(installed.safety(), /activity_present/);
  await assert.rejects(installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot), /safety_unproven/);
  assert.equal(f.calls.filter(row => row.request?.method === 'PATCH').length, 0);
  assert.equal(f.calls.filter(row => row.options?.input?.includes('pg_dump')).length, 0);
  f.controls.failSql = true;
  assert.deepEqual(await installed.safetyDiagnostic(), { available: false, reason: 'release_trading_safety_unproven' });
  await assert.rejects(installed.safety(), /ssh_unavailable/);
});

test('quiescent configuration changes only exact commit pin through normal HTTPS API', async t => {
  const f = fixture(t), installed = f.install();
  await installed.coolify.configureCandidate(f.manifest, f.state.release.snapshot);
  const requests = f.calls.filter(row => row.request?.method === 'PATCH'); assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].request.body, { git_commit_sha: commit });
  assert.equal(requests[0].request.url, `https://controller.example.test/api/v1/applications/${targetId}`);
  assert.ok(f.calls.filter(row => row.kind === 'ssh').every(row => row.options.argv.includes('StrictHostKeyChecking=yes')));
  const pg = f.calls.find(row => row.options?.input === gitSetTradingSafetySql);
  assert.ok(pg.options.argv.at(-1).includes(f.settings.source.container)); assert.ok(!pg.options.argv.join(' ').includes('password'));
});

test('permanent retention checks real clone/ledger/application and never removes or archives', async t => {
  const f = fixture(t), installed = f.install(); await installed.assertClone();
  const result = await installed.resources.verifyRetention(f.manifest);
  assert.equal(result.applicationActive, true); assert.equal(result.absenceVerified, true); assert.deepEqual(result.resourceIds, []);
  assert.equal(result.protectedResourcesDigest, contract.releaseDigest(f.manifest.cleanup.protectedResourceIds));
  assert.throws(() => installed.resources.cleanupLocal(), /deletion_prohibited/);
  assert.throws(() => installed.resources.cleanupCoolifyApplication(), /deletion_prohibited/);
  writeFileSync(f.ownershipFile, '{}'); await assert.rejects(installed.assertClone(), /clone_or_ownership_changed/);
});

test('resources require capacity and reject disposable ownership and escaped controller', async t => {
  const f = fixture(t), installed = f.install(); assert.equal((await installed.resources.inspectCapacity(f.manifest)).available, true);
  f.manifest.cleanup.ownedResourceIds = ['temp']; assert.throws(f.install, /binding_invalid|manifest_invalid/);
  f.manifest.cleanup.ownedResourceIds = []; f.settings.coolify.origin = 'https://another.example.test';
  assert.throws(f.install, /target_binding_changed/);
});

function legacyWorkerSettings(){return {
 client:{hostId:randomUUID(),agentId:randomUUID(),credentialTarget:'Roost/Gate3/releaser',certificateFingerprint:'e'.repeat(64)},
 githubCredentialTarget:'Roost/Gate3/github',coolifyCredentialTarget:'Roost/Gate3/coolify',
 coolify:{origin:'https://controller.example.test/',targetId:'fixture-web',candidateConfig:{},rollbackConfig:{}},
 resources:{sshHost:'fixture-vps',workspaceRoot:'C:\\Fixture\\workspace',ownershipFile:'C:\\Private\\ownership.json'},
 prerequisites:{configurationFile:'C:\\Private\\backup.json',evidenceFile:'C:\\Private\\verified.json'}
};}

test('historical untagged Gate3 worker settings round-trip unchanged with image cleanup',()=>{
 const settings=legacyWorkerSettings();
 settings.imageCleanup={ownershipFile:'C:\\Private\\images.json',credentialTarget:'Roost/Gate3/registry',provenanceCacheDirectory:'C:\\Private\\cache',allowTemporaryPackageRemoval:true};
 assert.deepEqual(governedReleaseWorkerSchema.parse(settings),settings);
 assert.deepEqual(releaseClientSchema.parse(settings.client),settings.client);
 assert.equal(assertReleaseWorkerAdapter(settings,{schemaVersion:'roost-release-manifest-v1',deployment:{provider:'coolify'}}),false);
});

test('explicit Gate4 git-set worker config is strict, accepts scoped keys and refuses mixed legacy data',t=>{
 const f=fixture(t),legacy=legacyWorkerSettings();
 const settings={adapter:'coolify_git_set',client:{...legacy.client,credentialTarget:'Roost/Gate4/releaser'},
  githubCredentialTarget:'Roost/Gate4/github',coolifyCredentialTarget:'Roost/Gate4/coolify',gitSet:f.settings,prerequisites:legacy.prerequisites};
 assert.deepEqual(governedReleaseWorkerSchema.parse(settings),settings);
 assert.deepEqual(releaseClientSchema.parse(settings.client),settings.client);
 assert.equal(assertReleaseWorkerAdapter(settings,f.manifest),true);
 for(const mutation of [{coolify:legacy.coolify},{resources:legacy.resources},{imageCleanup:{}},{adapter:undefined},
  {gitSet:{...f.settings,script:'arbitrary code'}}])assert.equal(governedReleaseWorkerSchema.safeParse({...settings,...mutation}).success,false);
 for(const prefix of ['Roost/Gate5/','Roost/Gate2/','Custom/','Roost/Gate4/../']){
  assert.equal(governedReleaseWorkerSchema.safeParse({...settings,githubCredentialTarget:prefix+'github'}).success,false);
  assert.equal(governedReleaseWorkerSchema.safeParse({...settings,client:{...settings.client,credentialTarget:prefix+'releaser'}}).success,false);
 }
});

test('worker rejects adapter/purpose mismatch before invoking the installed factory',t=>{
 const f=fixture(t),legacy=legacyWorkerSettings(),set={adapter:'coolify_git_set'};
 const certification={schemaVersion:'roost-release-manifest-v1',deployment:{provider:'coolify'}};
 assert.throws(()=>assertReleaseWorkerAdapter(set,certification),/adapter_mismatch/);
 assert.throws(()=>assertReleaseWorkerAdapter(legacy,f.manifest),/adapter_mismatch/);
 assert.throws(()=>assertReleaseWorkerAdapter(set,{...f.manifest,purpose:'temporary_certification'}),/adapter_mismatch/);
 assert.throws(()=>assertReleaseWorkerAdapter(set,{...f.manifest,cleanup:{...f.manifest.cleanup,archiveRepository:true}}),/adapter_mismatch/);
 assert.throws(()=>assertReleaseWorkerAdapter(set,{...f.manifest,deployment:{...f.manifest.deployment,provider:'coolify'}}),/adapter_mismatch/);
 assert.throws(()=>assertReleaseWorkerAdapter(legacy,{...certification,schemaVersion:'roost-release-manifest-v2'}),/adapter_mismatch/);
});
