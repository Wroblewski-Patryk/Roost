import test from 'node:test';
import assert from 'node:assert/strict';
import { composeConfigurationDigest, composeRuntimeSetDigest, qualifyComposeRuntime }
  from './lib/agent-host-release-compose-state.mjs';

const hash = character => character.repeat(64);
const sha = character => character.repeat(40);
const image = character => `sha256:${hash(character)}`;
function fixture({ paused = false } = {}) {
  const commit = sha('a'), tree = sha('b'), deploymentId = 'releasequeue';
  const services = [
    { name: 'app', role: 'app', source: 'built', expectedState: 'running', mountDigest: hash('1') },
    { name: 'migrate', role: 'migration', source: 'built', expectedState: 'completed', mountDigest: hash('2') },
    { name: 'maintenance', role: 'cadence', source: 'built', expectedState: paused ? 'paused' : 'running', mountDigest: hash('3') },
    { name: 'proactive', role: 'cadence', source: 'built', expectedState: paused ? 'paused' : 'running', mountDigest: hash('4') },
    { name: 'db', role: 'database', source: 'image', expectedState: 'running', mountDigest: hash('5'), imageDigest: image('e') }
  ];
  const configuration = { targetId: 'composeapp', buildPack: 'dockercompose', composePath: '/docker-compose.coolify.yml',
    repositoryUrl: 'https://github.com/fixture/private-app', branch: 'main', gitCommit: commit, autoDeploy: false,
    sourcePins: { queueHelper: hash('6'), deploymentJob: hash('7') }, sourceDigest: hash('8'), composeDigest: hash('9'),
    environmentDigest: hash('a'), storageDigest: hash('b'), settingsDigest: hash('c'), runtimePolicyDigest: hash('d'),
    topology: { applicationId: '4', projectId: '1', environmentId: '2', destinationId: '3', destinationType: 'StandaloneDocker', serverId: '0' },
    services };
  const runtime = { targetId: configuration.targetId, deploymentId,
    services: services.map((service, index) => ({ name: service.name, role: service.role, containerId: hash(String(index + 1)),
      imageDigest: service.source === 'built' ? image('f') : service.imageDigest, mountDigest: service.mountDigest,
      state: service.role === 'migration' ? 'exited' : service.role === 'cadence' && paused ? 'paused' : 'running',
      health: ['app', 'database'].includes(service.role) ? 'healthy' : null, exitCode: 0,
      createdAt: service.source === 'built' ? '2026-10-04T12:00:01.000Z' : '2026-10-01T12:00:00.000Z',
      ...(service.source === 'built' ? { commit, tree, deploymentId } : {}) })) };
  const binding = { commit, tree, deploymentId,
    queue: { targetId: configuration.targetId, deploymentId, commit, status: 'finished',
      createdAt: '2026-10-04T12:00:00.000Z', finishedAt: '2026-10-04T12:00:02.000Z' },
    images: services.filter(service => service.source === 'built').map(service => ({ name: service.name,
      imageDigest: image('f'), commit, tree, deploymentId })) };
  return { expected: { configuration: structuredClone(configuration), configDigest: composeConfigurationDigest(configuration) },
    configuration, runtime, binding };
}
const row = (fixture, name) => fixture.runtime.services.find(service => service.name === name);

test('qualified five-service runtime binds source images, finished queue and immutable DB without mutation', () => {
  const input = fixture(), before = structuredClone(input), proof = qualifyComposeRuntime(input);
  assert.deepEqual(input, before);
  assert.equal(proof.healthy, true);
  assert.equal(proof.commit, input.binding.commit);
  assert.equal(proof.runtimeSetDigest, composeRuntimeSetDigest(input.runtime.services));
  assert.equal(proof.services.length, 5);
  assert.equal(proof.services.find(service => service.name === 'migrate').exitCode, 0);
});

test('configuration digest canonicalizes service/key order, excludes only the authorized commit pin', () => {
  const f = fixture(), other = structuredClone(f.configuration);
  other.services.reverse(); other.gitCommit = sha('c');
  other.topology = Object.fromEntries(Object.entries(other.topology).reverse());
  assert.equal(composeConfigurationDigest(other), f.expected.configDigest);
  assert.throws(() => qualifyComposeRuntime({ ...f, configuration: other }), /source_pin_changed/);
});

for (const [label, change] of [
  ['compose path', c => { c.composePath = '/another.yml'; }],
  ['compose contents', c => { c.composeDigest = hash('f'); }],
  ['source compose blob', c => { c.sourceDigest = hash('f'); }],
  ['Coolify source pin', c => { c.sourcePins.deploymentJob = hash('f'); }],
  ['secret hash', c => { c.environmentDigest = hash('f'); }],
  ['storage hash', c => { c.storageDigest = hash('f'); }],
  ['runtime policy', c => { c.runtimePolicyDigest = hash('f'); }],
  ['settings', c => { c.settingsDigest = hash('f'); }],
  ['repository', c => { c.repositoryUrl = 'https://github.com/fixture/another'; }],
  ['branch', c => { c.branch = 'other'; }],
  ['topology', c => { c.topology.serverId = '9'; }]
]) test(`changed ${label} cannot qualify as accepted configuration`, () => {
  const f = fixture(); change(f.configuration);
  assert.throws(() => qualifyComposeRuntime(f), /configuration_changed/);
});

test('strict wire shape refuses secrets, unsafe paths, autodeploy and role substitutions', () => {
  for (const change of [
    c => { c.environment = { PASSWORD: 'private' }; },
    c => { c.composePath = '/a/../private.yml'; },
    c => { c.composePath = '/a//private.yml'; },
    c => { c.composePath = 'C:\\private.yml'; },
    c => { c.autoDeploy = true; },
    c => { c.buildPack = 'dockerfile'; },
    c => { c.services[0].role = 'database'; },
    c => { c.services[4].source = 'built'; },
    c => { c.services[0].expectedState = 'paused'; }
  ]) {
    const f = fixture(); change(f.configuration);
    assert.throws(() => qualifyComposeRuntime(f), error => error.message === 'release_compose_state_configuration_invalid'
      && !error.message.includes('private'));
  }
});

test('missing, duplicate, unexpected service or reused container fails closed', () => {
  for (const change of [
    f => { f.runtime.services.pop(); },
    f => { f.runtime.services[1] = structuredClone(f.runtime.services[0]); },
    f => { f.runtime.services[1].name = 'unexpected'; },
    f => { f.runtime.services[1].containerId = f.runtime.services[0].containerId; },
    f => { f.binding.images.pop(); },
    f => { f.binding.images[1] = structuredClone(f.binding.images[0]); },
    f => { f.binding.images[1].name = 'unexpected'; }
  ]) {
    const f = fixture(); change(f);
    assert.throws(() => qualifyComposeRuntime(f), /service_set_changed/);
  }
});

test('actual built image, source/tree, build attestation, queue label and time must all match', () => {
  for (const change of [
    f => { row(f, 'app').imageDigest = image('d'); },
    f => { row(f, 'maintenance').commit = sha('c'); },
    f => { row(f, 'proactive').tree = sha('c'); },
    f => { row(f, 'migrate').deploymentId = 'oldqueue'; },
    f => { row(f, 'app').createdAt = '2026-10-01T12:00:00.000Z'; },
    f => { row(f, 'app').createdAt = '2026-10-04T12:00:03.000Z'; },
    f => { f.binding.images[0].commit = sha('c'); },
    f => { f.binding.images[0].tree = sha('c'); },
    f => { f.binding.images[0].deploymentId = 'other'; }
  ]) {
    const f = fixture(); change(f);
    assert.throws(() => qualifyComposeRuntime(f), /service_source_changed/);
  }
});

test('immutable DB image and mount cannot be changed or given fictional source provenance', () => {
  for (const change of [
    f => { row(f, 'db').imageDigest = image('d'); },
    f => { row(f, 'db').commit = f.binding.commit; },
    f => { row(f, 'db').deploymentId = f.binding.deploymentId; }
  ]) {
    const f = fixture(); change(f);
    assert.throws(() => qualifyComposeRuntime(f), /database_identity_changed/);
  }
  const f = fixture(); row(f, 'db').mountDigest = hash('f');
  assert.throws(() => qualifyComposeRuntime(f), /service_binding_changed/);
});

test('one-shot migrator must be terminal, successful and without fictional health', () => {
  for (const change of [r => { r.exitCode = 1; }, r => { r.state = 'running'; }, r => { r.health = 'healthy'; }]) {
    const f = fixture(); change(row(f, 'migrate'));
    assert.throws(() => qualifyComposeRuntime(f), /migration_failed/);
  }
});

test('app and DB require running healthy state; HTTP/other services cannot compensate', () => {
  for (const name of ['app', 'db']) for (const change of [r => { r.health = null; },
    r => { r.health = 'unhealthy'; }, r => { r.state = 'exited'; }, r => { r.exitCode = 1; }]) {
    const f = fixture(); change(row(f, name));
    assert.throws(() => qualifyComposeRuntime(f), /service_health_unproven/);
  }
});

test('cadence state obeys declared running or paused posture, without treating crashes as pause', () => {
  assert.equal(qualifyComposeRuntime(fixture({ paused: true })).healthy, true);
  const stopped = fixture({ paused: true }); row(stopped, 'maintenance').state = 'exited';
  assert.equal(qualifyComposeRuntime(stopped).healthy, true);
  for (const paused of [false, true]) {
    const f = fixture({ paused }); row(f, 'maintenance').state = paused ? 'running' : 'paused';
    assert.throws(() => qualifyComposeRuntime(f), /cadence_state_changed/);
  }
  const crashed = fixture({ paused: true }); row(crashed, 'maintenance').state = 'exited'; row(crashed, 'maintenance').exitCode = 1;
  assert.throws(() => qualifyComposeRuntime(crashed), /cadence_state_changed/);
});

test('created cadence is parked only under declared paused posture with exit0 and no health', () => {
  const f = fixture({ paused: true }); row(f, 'maintenance').state = 'created'; row(f, 'maintenance').health = null;
  const proof = qualifyComposeRuntime(f); assert.equal(proof.healthy, true);
  assert.equal(proof.services.find(service => service.name === 'maintenance').state, 'created');
  for (const change of [r => { r.exitCode = 1; }, r => { r.health = 'healthy'; }, r => { r.health = 'starting'; }]) {
    const bad = structuredClone(f); change(row(bad, 'maintenance'));
    assert.throws(() => qualifyComposeRuntime(bad), /cadence_state_changed/);
  }
  const running = fixture(); row(running, 'maintenance').state = 'created'; row(running, 'maintenance').health = null;
  assert.throws(() => qualifyComposeRuntime(running), /cadence_state_changed/);
  for (const name of ['app', 'db', 'migrate']) {
    const bad = fixture(); row(bad, name).state = 'created'; row(bad, name).health = null;
    assert.throws(() => qualifyComposeRuntime(bad), /migration_failed|service_health_unproven/);
  }
});

test('runtime-set digest binds every service image/source/mount but excludes volatile observations', () => {
  const f = fixture(), before = composeRuntimeSetDigest(f.runtime.services), observations = structuredClone(f.runtime.services);
  observations.reverse(); observations[0].createdAt = '2026-10-03T00:00:00.000Z'; observations[0].containerId = hash('9');
  observations[0].health = 'unhealthy';
  assert.equal(composeRuntimeSetDigest(observations), before);
  for (const field of ['imageDigest', 'mountDigest', 'commit', 'tree']) {
    const services = structuredClone(f.runtime.services);
    services[0][field] = field === 'imageDigest' ? image('9') : field === 'mountDigest' ? hash('9') : sha('9');
    assert.notEqual(composeRuntimeSetDigest(services), before);
  }
});

test('finished exact queue and runtime identity are necessary even when source images match', () => {
  for (const change of [
    f => { f.binding.queue.status = 'in_progress'; },
    f => { f.binding.queue.commit = sha('c'); },
    f => { f.binding.queue.targetId = 'other'; },
    f => { f.binding.queue.deploymentId = 'other'; },
    f => { f.binding.queue.createdAt = '2026-10-04T12:00:03.000Z'; },
    f => { f.runtime.targetId = 'other'; },
    f => { f.runtime.deploymentId = 'other'; }
  ]) {
    const f = fixture(); change(f);
    assert.throws(() => qualifyComposeRuntime(f), /(?:binding_invalid|source_pin_changed)/);
  }
});
