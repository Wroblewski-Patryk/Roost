import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fixtureModule from './fixtures/release-compose-contract.cjs';
import { createCoolifyComposeAdapter } from './lib/agent-host-release-coolify-compose.mjs';
import { coolifyGitSetDeploymentId } from './lib/agent-host-release-coolify-git-set-gateway.mjs';

function setup() {
  const f = fixtureModule.fixture(), s = { ...f.s, releaseId: randomUUID() };
  const o = { operationId: randomUUID(), since: '2026-10-04T12:00:00.000Z', targetId: f.target.targetId };
  const calls = [], clock = { now: Date.parse('2026-10-04T12:02:05.000Z') }, state = { phase: 'candidate', queue: null };
  const deploymentId = rollback => coolifyGitSetDeploymentId({ releaseId: s.releaseId, operationId: o.operationId,
    targetId: f.target.targetId, rollback });
  const runtime = rollback => {
    const e = f.evidence(rollback), row = e.composeTargets[0], id = deploymentId(rollback);
    row.runtime.deploymentId = id; row.binding.deploymentId = id; row.binding.queue.deploymentId = id;
    for (const r of row.runtime.services) if (r.role !== 'database') r.deploymentId = id;
    for (const r of row.binding.images) r.deploymentId = id;
    return { ...row, healthy: true };
  };
  const gateway = {
    async inspectConfiguration() { return structuredClone(state.phase === 'rollback' ? f.target.rollbackConfiguration : f.target.configuration); },
    async inspectBaseline() { return { observed: true, commit: f.s.baseCommit, tree: f.s.baseTree,
      configDigest: f.target.baseline.configDigest, schemaDigest: f.m.baseline.schemaDigest,
      healthDigest: f.m.baseline.healthDigest, dataDigest: f.m.baseline.dataDigest, healthy: true,
      migrationSchemaVerified: true, images: f.target.baseline.images }; },
    async inspectRuntime(_id, options) { return runtime(options.rollback); },
    async readQueue() { calls.push('read'); return state.queue; },
    async configure(_id, phase) { calls.push('configure'); state.phase = phase; },
    async deployTarget(context) { calls.push('dispatch'); state.queue = { targetId: context.targetId,
      deploymentId: context.deploymentId, commit: context.rollback ? s.baseCommit : s.commit,
      createdAt: o.since, finishedAt: '2026-10-04T12:00:02.000Z', status: 'finished' }; },
    async safety() { return { quiescent: true, schemaDigest: f.m.deployment.schemaDigest, dataDigest: f.m.baseline.dataDigest }; },
    async checkServices() { return { healthy: true, healthDigest: f.m.baseline.healthDigest, dataDigest: f.m.baseline.dataDigest }; },
    async inspectBackup() { return f.m.backup; }
  };
  const adapter = createCoolifyComposeAdapter({ gateway, now: () => clock.now, sleep: async ms => { clock.now += ms; } });
  return { ...f, s, o, calls, clock, state, gateway, adapter, runtime, deploymentId };
}
test('legacy observed baseline is inspected without inventing a finished queue', async () => {
  const f = setup(); assert.equal((await f.adapter.inspect(f.m, f.s)).baselineCommit, f.s.baseCommit);
  assert.deepEqual(f.calls, []);
});
for (const field of ['quiescent', 'schemaDigest', 'dataDigest']) test(`release refuses changed safety ${field}`, async () => {
  const f = setup(), original = f.gateway.safety; f.gateway.safety = async () => ({ ...await original(), [field]: field === 'quiescent' ? false : '1'.repeat(64) });
  await assert.rejects(f.adapter.configureCandidate(f.m, f.s), /data_or_activity_changed/); assert.deepEqual(f.calls, []);
});
test('restore basis change prevents configuration', async () => {
  const f = setup(); f.gateway.inspectBackup = async () => ({ ...f.m.backup, restoreDigest: '1'.repeat(64) });
  await assert.rejects(f.adapter.configureCandidate(f.m, f.s), /backup_changed/); assert.deepEqual(f.calls, []);
});
test('exact candidate dispatch establishes one complete image set and queue', async () => {
  const f = setup(), result = await f.adapter.deploy(f.m, f.s, f.o);
  assert.equal(result.state, 'finished'); assert.equal(result.healthy, true);
  assert.equal(result.composeTargets[0].binding.deploymentId, f.deploymentId(false));
  assert.equal(f.calls.filter(c => c === 'dispatch').length, 1); assert.equal(result.imageDigest, undefined);
});
test('existing exact queue is read back without dispatching again', async () => {
  const f = setup(); await f.gateway.deployTarget({ ...f.o, deploymentId: f.deploymentId(false) }); f.calls.length = 0;
  assert.equal((await f.adapter.deploy(f.m, f.s, f.o)).state, 'finished'); assert.equal(f.calls.includes('dispatch'), false);
});
for (const reconcile of [false, true]) test(`finished queue settles starting health through bounded reads (${reconcile ? 'reconcile' : 'dispatch'})`, async () => {
  const f = setup(), started = f.clock.now;
  f.gateway.inspectRuntime = async (_id, o) => {
    const row = f.runtime(o.rollback);
    if (f.clock.now - started < 3000) {
      row.runtime.services.find(r => r.role === 'app').health = 'starting'; row.healthy = false;
    }
    return row;
  };
  if (reconcile) { await f.gateway.deployTarget({ ...f.o, deploymentId: f.deploymentId(false) }); f.calls.length = 0; }
  const result = await f.adapter[reconcile ? 'reconcileDeployment' : 'deploy'](f.m, f.s, f.o);
  assert.equal(result.state, 'finished'); assert.equal(result.healthy, true);
  assert.equal(f.clock.now - started, 3000);
  assert.equal(f.calls.filter(c => c === 'dispatch').length, reconcile ? 0 : 1);
});
test('starting health past the bounded settling window stays uncertain without repeating dispatch', async () => {
  const f = setup(), started = f.clock.now;
  f.gateway.inspectRuntime = async () => {
    const row = f.runtime(false); row.runtime.services.find(r => r.role === 'app').health = 'starting'; row.healthy = false; return row;
  };
  const result = await f.adapter.deploy(f.m, f.s, f.o);
  assert.equal(result.state, 'uncertain'); assert.equal(result.settling, true);
  assert.equal(result.healthy, undefined); assert.equal(result.dataDigest, undefined); assert.equal(result.healthDigest, undefined);
  assert.equal(f.clock.now - started, 60000);
  assert.equal(f.calls.filter(c => c === 'dispatch').length, 1);
});

test('starting is pending identity proof only; neither health nor fingerprint callbacks run', async () => {
  const f = setup(); f.gateway.inspectRuntime = async () => { const r = f.runtime(false); r.runtime.services.find(s => s.role === 'database').health = 'starting'; return r; };
  f.gateway.checkServices = async () => { throw Error('fingerprint_must_not_run'); };
  const result = await f.adapter.health(f.m, f.s); assert.equal(result.state, 'pending'); assert.equal(result.settling, true);
  assert.equal(result.healthy, undefined); assert.equal(result.dataDigest, undefined);
  assert.equal(result.composeTargets[0].runtime.services.find(s => s.role === 'database').health, 'starting');
});

for (const changed of ['source', 'mount', 'image', 'migration']) test(`starting never masks ${changed} identity failure`, async () => {
  const f = setup(); f.gateway.inspectRuntime = async () => {
    const row = f.runtime(false); row.runtime.services.find(s => s.role === 'database').health = 'starting';
    const app = row.runtime.services.find(s => s.role === 'app');
    if (changed === 'source') app.commit = '0'.repeat(40);
    if (changed === 'mount') app.mountDigest = '0'.repeat(64);
    if (changed === 'image') app.imageDigest = 'sha256:' + '0'.repeat(64);
    if (changed === 'migration') row.runtime.services.find(s => s.role === 'migration').exitCode = 1;
    return row;
  };
  f.gateway.checkServices = async () => { throw Error('fingerprint_must_not_run'); };
  await assert.rejects(f.adapter.health(f.m, f.s), /runtime_identity_unproven/);
});
test('uncertain dispatch response preserves the queue for read-only reconciliation', async () => {
  const f = setup(), dispatch = f.gateway.deployTarget;
  f.gateway.deployTarget = async c => { await dispatch(c); throw Error('connection_closed'); };
  await assert.rejects(f.adapter.deploy(f.m, f.s, f.o), e => e.uncertain === true);
  const calls = f.calls.filter(c => c === 'dispatch').length;
  assert.equal((await f.adapter.reconcileDeployment(f.m, f.s, f.o)).state, 'finished');
  assert.equal(f.calls.filter(c => c === 'dispatch').length, calls);
});
test('foreign queue cannot be reconciled or repeated', async () => {
  const f = setup(); f.state.queue = { targetId: f.o.targetId, deploymentId: 'foreign', commit: f.s.commit,
    status: 'finished', createdAt: f.o.since };
  await assert.rejects(f.adapter.deploy(f.m, f.s, f.o), /queue_identity_changed/); assert.equal(f.calls.includes('dispatch'), false);
});
test('HEAD is never accepted as final deployed source', async () => {
  const f = setup(); await f.gateway.deployTarget({ ...f.o, deploymentId: f.deploymentId(false) }); f.state.queue.commit = 'HEAD';
  await assert.rejects(f.adapter.reconcileDeployment(f.m, f.s, f.o), /queue_identity_changed/);
});
test('migration failure cannot be reported as an accepted deployment', async () => {
  const f = setup(); f.gateway.inspectRuntime = async () => { const r = f.runtime(false); r.runtime.services.find(s => s.role === 'migration').exitCode = 1; return r; };
  await assert.rejects(f.adapter.health(f.m, f.s), /runtime_identity_unproven/);
});
test('rollback proves every baseline built image without a single image summary', async () => {
  const f = setup(); await f.adapter.configureRollback(f.m, f.s);
  const result = await f.adapter.rollback(f.m, f.s, f.o); assert.equal(result.healthy, true);
  for (const image of f.target.baseline.images) assert.equal(result.composeTargets[0].runtime.services.find(s => s.name === image.name).imageDigest, image.imageDigest);
});
test('rebuilt rollback image is rejected', async () => {
  const f = setup(); f.state.phase = 'rollback'; f.gateway.inspectRuntime = async () => {
    const r = f.runtime(true), app = r.runtime.services.find(s => s.role === 'app'); app.imageDigest = 'sha256:' + 'e'.repeat(64);
    r.binding.images.find(i => i.name === app.name).imageDigest = app.imageDigest; return r;
  }; await assert.rejects(f.adapter.health(f.m, f.s, { rollback: true }), /runtime_identity_unproven/);
});
test('unhealthy fixed service probe is a failed observation with source retained', async () => {
  const f = setup(); f.gateway.checkServices = async () => ({ healthy: false, healthDigest: 'c'.repeat(64), dataDigest: f.m.baseline.dataDigest });
  const e = await f.adapter.observe(f.m, f.s); assert.equal(e.healthy, false); assert.equal(e.observationSeconds, 0);
  assert.equal(e.composeTargets[0].binding.commit, f.s.commit);
});
test('observation covers the entire declared window', async () => {
  const f = setup(), e = await f.adapter.observe(f.m, f.s); assert.equal(e.observationSeconds, f.m.observation.seconds); assert.equal(e.healthy, true);
});
test('configuration reconciliation never guesses absence from a different pin', async () => {
  const f = setup(); f.gateway.inspectConfiguration = async () => ({ ...f.target.configuration, gitCommit: f.s.baseCommit });
  assert.equal((await f.adapter.reconcileConfiguration(f.m, f.s)).state, 'uncertain'); assert.equal(f.calls.includes('configure'), false);
});
