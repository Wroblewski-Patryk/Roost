import test from 'node:test';
import assert from 'node:assert/strict';
import { coolifyGitSetDeploymentId, createCoolifyGitSetGateway, createFixedCoolifyGitSetSshTransport }
  from './lib/agent-host-release-coolify-git-set-gateway.mjs';

const releaseId = '12345678-1234-1234-1234-123456789abc', operationId = 'operation-1';
const commit = 'a'.repeat(40), tree = 'b'.repeat(40), baseCommit = 'c'.repeat(40), baseTree = 'd'.repeat(40);
const configDigest = '1'.repeat(64), schemaDigest = '2'.repeat(64), dataDigest = '3'.repeat(64);
const imageDigest = `sha256:${'4'.repeat(64)}`, since = '2026-10-02T00:00:00.000Z';
const sourcePins = { queueHelper: '5'.repeat(64), deploymentJob: '6'.repeat(64) };
const targetId = 'testweb';
function setup(changes = {}) {
  const target = { targetId, name: 'test-web', dockerfile: '/apps/web/Dockerfile', configDigest,
    baseline: { commit: baseCommit, tree: baseTree, imageDigest, configDigest } };
  const manifest = { purpose: 'application_release', cleanup: { archiveRepository: false },
    deployment: { provider: 'coolify_git_set', targets: [target], schemaDigest }, baseline: { dataDigest } };
  const calls = []; let queue = null;
  const state = { targetId, buildPack: 'dockerfile', dockerfile: target.dockerfile, configDigest, schemaDigest,
    gitCommit: commit, autoDeploy: false };
  const transport = { async run(action, payload) { calls.push({ action, payload });
    if (action === 'dispatch') queue = { targetId, deploymentId: payload.deploymentId, commit: payload.commit,
      status: 'queued', createdAt: since }; return { queue }; } };
  const callbacks = {
    inspectTarget: async () => ({ ...state }),
    inspectRuntime: async () => ({ targetId, commit, tree, imageDigest, configDigest, schemaDigest, healthy: true,
      deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }) }),
    inspectRemote: async () => ({ mainCommit: commit }),
    configureTarget: async ({ commit: nextCommit }) => { state.gitCommit = nextCommit; },
    safety: async () => ({ activeTrading: 0, openOrders: 0, openPositions: 0, schemaDigest, dataDigest }),
    checkServices: async () => ({ healthy: true, healthDigest: '7'.repeat(64), dataDigest }),
    inspectBackup: async () => ({ digest: '8'.repeat(64), bytes: 100, capturedAt: since,
      restoreVerifiedAt: since, restoreDigest: '8'.repeat(64) })
  };
  const gateway = createCoolifyGitSetGateway({ manifest, binding: { commit, candidateTree: tree }, releaseId,
    sourcePins, transport, ...callbacks, ...changes });
  return { gateway, manifest, state, calls, transport, callbacks, setQueue: row => { queue = row; } };
}

test('deterministic queue identity binds release, operation, target and mode', () => {
  const input = { releaseId, operationId, targetId };
  assert.match(coolifyGitSetDeploymentId(input), /^r[a-f0-9]{23}$/);
  assert.equal(coolifyGitSetDeploymentId(input), coolifyGitSetDeploymentId(input));
  for (const next of [{ ...input, operationId: 'operation-2' }, { ...input, targetId: 'api' },
    { ...input, rollback: true }, { ...input, releaseId: '87654321-1234-1234-1234-123456789abc' }])
    assert.notEqual(coolifyGitSetDeploymentId(input), coolifyGitSetDeploymentId(next));
  assert.throws(() => coolifyGitSetDeploymentId({ ...input, operationId: "bad'; code" }), /identity_invalid/);
});

test('health authority accepts reordered sealed keys and rejects changed basis', async () => {
  const f = setup();
  const reordered = { baseline: f.manifest.baseline, deployment: f.manifest.deployment,
    cleanup: f.manifest.cleanup, purpose: f.manifest.purpose };
  assert.equal((await f.gateway.checkServices(reordered)).healthy, true);
  await assert.rejects(f.gateway.checkServices({ ...reordered, baseline: { dataDigest: '9'.repeat(64) } }), /manifest_changed/);
});

test('dispatch reads exact absence, queues normal operation and reads durable receipt', async () => {
  const f = setup(); const result = await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.deepEqual(f.calls.map(call => call.action), ['read', 'dispatch', 'read']);
  assert.equal(result.deploymentId, coolifyGitSetDeploymentId({ releaseId, operationId, targetId }));
  await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 1);
});

test('lost dispatch reply remains uncertain and exact readback avoids duplicate mutation', async () => {
  const f = setup(), run = f.transport.run;
  f.transport.run = async (...args) => { const receipt = await run(...args); if (args[0] === 'dispatch') throw Error('Bearer private'); return receipt; };
  await assert.rejects(f.gateway.deployTarget(targetId, commit, { since, operationId }), error =>
    error.uncertain === true && error.message === 'release_git_set_gateway_dispatch_result_uncertain');
  const proof = await f.gateway.listDeployments(targetId, { since, operationId });
  assert.equal(proof.deployments.length, 1); assert.equal(proof.absenceVerified, false);
  await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 1);
});

test('changed remote, auto deployment, config and live activity block dispatch', async () => {
  for (const kind of ['remote', 'auto', 'config', 'live']) {
    const f = setup(kind === 'remote' ? { inspectRemote: async () => ({ mainCommit: baseCommit }) }
      : kind === 'live' ? { safety: async () => ({ activeTrading: 1, openOrders: 0, openPositions: 0, schemaDigest, dataDigest }) } : {});
    if (kind === 'auto') f.state.autoDeploy = true;
    if (kind === 'config') f.state.configDigest = '9'.repeat(64);
    await assert.rejects(f.gateway.deployTarget(targetId, commit, { since, operationId }));
    assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 0);
  }
});

test('config callback receives only allowed pin and immutable scope; changes fail closed', async () => {
  const calls = [], f = setup({ configureTarget: async value => { calls.push(value); } });
  await f.gateway.configure(targetId, configDigest, 'candidate');
  assert.deepEqual(calls, [{ targetId, expectedConfigDigest: configDigest, commit, mode: 'candidate' }]);
  f.state.dockerfile = '/other/Dockerfile';
  await assert.rejects(f.gateway.configure(targetId, configDigest, 'candidate'), /target_state_unproven/);
  assert.equal(calls.length, 1);
});

test('rollback preserves the target-specific baseline SHA rather than repository main', async () => {
  const f = setup(); await f.gateway.configure(targetId, configDigest, 'rollback');
  assert.equal(f.state.gitCommit, baseCommit);
  const receipt = await f.gateway.deployTarget(targetId, baseCommit, { since, operationId, rollback: true });
  assert.equal(receipt.commit, baseCommit); assert.equal(f.calls.find(call => call.action === 'dispatch').payload.rollback, true);
});

test('wrong queue identity, old timestamp or source commit cannot prove reconciliation', async () => {
  for (const change of [{ deploymentId: 'r' + '9'.repeat(23) }, { targetId: 'another' }, { commit: baseCommit },
    { createdAt: '2026-10-01T00:00:00.000Z' }]) {
    const f = setup(); f.setQueue({ targetId, deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }),
      commit, status: 'finished', createdAt: since, ...change });
    await assert.rejects(f.gateway.listDeployments(targetId, { since, operationId }), /queue_identity_changed/);
  }
});

test('unscoped target, absent correlation and runtime metadata extras are refused', async () => {
  const f = setup({ inspectRuntime: async () => ({ targetId, commit, tree, imageDigest, configDigest, schemaDigest,
    healthy: true, deploymentId: operationId, environment: { ACCESS_TOKEN: 'private' } }) });
  await assert.rejects(f.gateway.inspectRuntime(targetId), /runtime_unproven/);
  await assert.rejects(f.gateway.inspectTarget('unowned'), /target_outside_scope/);
  await assert.rejects(f.gateway.deployTarget(targetId, commit, { since }), /identity_invalid/);
});

function sshFixture(reply) {
  const calls = []; return { calls, transport: createFixedCoolifyGitSetSshTransport({ sshBinary: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
    sshHost: 'installation-vps', runOwned: async descriptor => { calls.push(descriptor); return reply; } }) };
}
const transportPayload = () => ({ targetId, dockerfile: '/apps/web/Dockerfile',
  deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }), commit, rollback: false, sourcePins });

test('fixed SSH descriptor streams bounded PHP data on stdin with pinned host verification', async () => {
  const f = sshFixture({ stdout: '{"ok":true,"queue":null}', exitCode: 0, stderr: 'ignored private text' });
  assert.deepEqual(await f.transport.run('read', transportPayload()), { queue: null });
  const call = f.calls[0]; assert.equal(call.args.at(-1), 'docker exec -i coolify php');
  assert.ok(call.args.includes('StrictHostKeyChecking=yes')); assert.equal(call.write, false);
  assert.match(call.stdin, /queue_application_deployment\(application:/);
  assert.match(call.stdin, /Cache::lock/); assert.match(call.stdin, /hash_file/);
  assert.doesNotMatch(call.stdin, /ApplicationDeploymentQueue::create|DB::insert|INSERT INTO/);
  assert.equal(call.maxOutputBytes, 8192);
});

test('transport rejects injected path and unexpected output without exposing values', async () => {
  const f = sshFixture({ stdout: '{"ok":true,"queue":null,"token":"private"}', exitCode: 0 });
  await assert.rejects(f.transport.run('read', { ...transportPayload(), dockerfile: '/apps/../private' }), /transport_input_invalid/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.transport.run('dispatch', transportPayload()), error => error.uncertain === true
    && error.message === 'release_git_set_gateway_response_unproven' && !error.message.includes('private'));
  assert.throws(() => createFixedCoolifyGitSetSshTransport({ sshBinary: 'ssh', sshHost: 'host;cat', runOwned: () => {} }), /transport_config_invalid/);
});

test('transport neither retries uncertain result nor persists raw error output', async () => {
  const f = sshFixture({ stdout: 'private failure log', exitCode: 1, stderr: 'secret' });
  await assert.rejects(f.transport.run('dispatch', transportPayload()), error => error.uncertain === true
    && error.message === 'release_git_set_gateway_response_invalid');
  assert.equal(f.calls.length, 1);
});

test('reader exceptions are sanitized and caller manifest mutation cannot widen target scope', async () => {
  const f = setup({ inspectRemote: async () => { throw Error('Bearer private-token'); } });
  await assert.rejects(f.gateway.inspectRemote(), error => error.message === 'release_git_set_gateway_remote_unproven');
  f.manifest.deployment.targets.push({ targetId: 'another' });
  await assert.rejects(f.gateway.inspectTarget('another'), /target_outside_scope/);
});
