import test from 'node:test';
import assert from 'node:assert/strict';
import { createDockerfileStateGateway, dockerfileConfigurationDigest, dockerfileConfigurationFields }
  from './lib/agent-host-release-dockerfile-state.mjs';

const targetId = 'testweb', commit = 'a'.repeat(40), tree = 'b'.repeat(40), schemaDigest = '1'.repeat(64);
const configDigest = '2'.repeat(64), containerId = '3'.repeat(64), imageDigest = `sha256:${'4'.repeat(64)}`;
const createdAt = '2026-10-02T12:00:01.000Z', deploymentId = 'r' + '5'.repeat(23);
const sourcePins = { queueHelper: '6'.repeat(64), deploymentJob: '7'.repeat(64) };
function fixture(changes = {}) {
  const calls = [], snapshot = { targetId, applicationId: '4', buildPack: 'dockerfile', dockerfile: '/apps/web/Dockerfile',
    configDigest, schemaDigest, gitCommit: commit, autoDeploy: false, topologyDigest: '8'.repeat(64) };
  const container = { id: containerId, imageId: imageDigest, imageRef: `${targetId}:${commit}`, createdAt,
    applicationId: '4', deploymentId: null, running: true, health: null };
  const image = { imageId: imageDigest, createdAt: '2026-10-02T12:00:00.000Z', repoDigests: [] };
  const queue = { targetId, deploymentId, commit, status: 'finished', createdAt: '2026-10-02T11:59:59.000Z',
    finishedAt: '2026-10-02T12:00:02.000Z' };
  const transport = async descriptor => { calls.push(descriptor); const result = descriptor.operation === 'dockerfile_configuration' ? snapshot
    : descriptor.operation === 'dockerfile_container' ? container : descriptor.operation === 'dockerfile_image' ? image : null;
    return result ? JSON.stringify(result) : `${containerId}\n`; };
  const gateway = createDockerfileStateGateway({ targets: [{ targetId, dockerfile: '/apps/web/Dockerfile' }], schemaDigest,
    sourcePins, transport, expectedDeploymentId: async () => deploymentId, readDeployment: async () => queue,
    treeForCommit: async actual => { assert.equal(actual, commit); return tree; }, ...changes });
  return { gateway, calls, snapshot, container, image, queue };
}

test('Dockerfile digest includes topology/env/storage but excludes runtime SHA pin', () => {
  const snapshot = { configuration: Object.fromEntries(dockerfileConfigurationFields.map(field => [field, null])),
    environmentHash: '9'.repeat(64), storageHash: 'a'.repeat(64), topology: { applicationId: '4', projectId: '1',
      environmentId: '2', destinationId: '3', destinationType: 'StandaloneDocker', serverId: '0' } };
  snapshot.configuration.build_pack = 'dockerfile'; snapshot.configuration.dockerfile_location = '/apps/web/Dockerfile';
  assert.match(dockerfileConfigurationDigest(snapshot), /^[a-f0-9]{64}$/);
  for (const next of [{ ...snapshot, environmentHash: 'b'.repeat(64) }, { ...snapshot, storageHash: 'c'.repeat(64) },
    { ...snapshot, topology: { ...snapshot.topology, serverId: '9' } }])
    assert.notEqual(dockerfileConfigurationDigest(next), dockerfileConfigurationDigest(snapshot));
  assert.equal(dockerfileConfigurationFields.includes('git_commit_sha'), false);
  assert.throws(() => dockerfileConfigurationDigest({ ...snapshot, configuration: { ...snapshot.configuration, git_commit_sha: commit } }), /configuration_invalid/);
});

test('fixed PHP hashes secret contents remotely and exports only scoped digest metadata', async () => {
  const f = fixture(); assert.deepEqual(await f.gateway.inspectTarget(targetId), { targetId, buildPack: 'dockerfile',
    dockerfile: '/apps/web/Dockerfile', configDigest, schemaDigest, gitCommit: commit, autoDeploy: false });
  const call = f.calls[0]; assert.equal(call.command, 'docker exec -i coolify php'); assert.equal(call.write, false);
  assert.match(call.stdin, /environment_variables_preview/); assert.match(call.stdin, /persistentStorages/);
  assert.match(call.stdin, /contentDigest/); assert.match(call.stdin, /'configDigest'=>hashed\(\$snapshot\)/);
  assert.match(call.stdin, /hash_file/); assert.doesNotMatch(call.stdin.slice(call.stdin.indexOf('echo encoded')), /'configuration'=>|\$env|\$files/);
});

test('actual image ID/tag/finished queue/container timing and pinned Git tree prove runtime identity', async () => {
  const f = fixture(); assert.deepEqual(await f.gateway.inspectRuntime(targetId), { targetId, commit, tree,
    imageDigest, configDigest, schemaDigest, healthy: true, deploymentId });
  assert.equal(f.calls.filter(row => row.operation === 'dockerfile_configuration').length, 2);
  assert.ok(f.calls.every(row => row.write === false && row.maxOutputBytes === 16384));
  assert.ok(f.calls.filter(row => row.operation.startsWith('dockerfile_') && row.operation !== 'dockerfile_configuration')
    .every(row => !row.command.includes('.Config.Env')));
});

test('a mutable tag or env build-info cannot compensate for missing queue provenance', async () => {
  const f = fixture({ expectedDeploymentId: async () => undefined });
  await assert.rejects(f.gateway.inspectRuntime(targetId), /queue_or_tree_unproven/);
});

test('wrong queue SHA, unfinished queue, wrong container time and changed image fail closed', async () => {
  for (const kind of ['sha', 'pending', 'time', 'image', 'tag', 'label']) {
    const f = fixture();
    if (kind === 'sha') f.queue.commit = 'd'.repeat(40);
    if (kind === 'pending') f.queue.status = 'in_progress';
    if (kind === 'time') f.queue.createdAt = '2026-10-02T12:00:03.000Z';
    if (kind === 'image') f.image.imageId = `sha256:${'e'.repeat(64)}`;
    if (kind === 'tag') f.container.imageRef = `another:${commit}`;
    if (kind === 'label') f.container.deploymentId = 'another';
    await assert.rejects(f.gateway.inspectRuntime(targetId));
  }
});

test('container conflicts, unsafe paths, metadata secrets and raw error output are refused', async () => {
  const f = fixture(); f.snapshot.secret = 'private';
  await assert.rejects(f.gateway.inspectTarget(targetId), /configuration_unproven/);
  await assert.rejects(f.gateway.inspectTarget('unowned'), /target_outside_scope/);
  const g = fixture({ transport: async () => { throw Error('Bearer private'); } });
  await assert.rejects(g.gateway.inspectTarget(targetId), error => error.message === 'release_dockerfile_state_transport_unproven');
  assert.throws(() => createDockerfileStateGateway({ targets: [{ targetId, dockerfile: '/apps/../private' }],
    schemaDigest, sourcePins, transport: () => {}, expectedDeploymentId: () => {}, readDeployment: () => {}, treeForCommit: () => {} }), /gateway_config_invalid/);
});

test('concurrent effective config change cannot be accepted as current runtime', async () => {
  const f = fixture(), read = f.gateway.snapshot;
  let configurationCalls = 0;
  const g = fixture({ transport: async descriptor => {
    if (descriptor.operation === 'dockerfile_configuration') { configurationCalls++;
      const row = await read(targetId); return JSON.stringify({ ...row, configDigest: configurationCalls > 1 ? 'f'.repeat(64) : row.configDigest }); }
    if (descriptor.operation === 'dockerfile_container') return JSON.stringify(f.container);
    if (descriptor.operation === 'dockerfile_image') return JSON.stringify(f.image);
    return `${containerId}\n`;
  } });
  await assert.rejects(g.gateway.inspectRuntime(targetId), /configuration_changed_during_inspection/);
});
