import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { composeMountDigest, qualifyComposePhaseArtifact, composeControllerPolicyRecord }
  from './lib/agent-host-release-compose-controller.mjs';
import { composeConfigurationDigest } from './lib/agent-host-release-compose-state.mjs';
import { createFixedComposeQueueTransport, createComposeReleaseGateway, composeQueueOperationPhp,
  composeRollbackDocumentDigest, createImmutableComposeRollback } from './lib/agent-host-release-compose-gateway.mjs';

const hash = c => c.repeat(64), sha = c => c.repeat(40), image = c => `sha256:${hash(c)}`;
const releaseId = '12345678-1234-1234-1234-123456789abc', operationId = 'operation1';
const commit = sha('a'), tree = sha('b'), baselineCommit = sha('c'), baselineTree = sha('d');
const sourcePins = { queueHelper: hash('1'), deploymentJob: hash('2'), applicationModel: hash('3'), composeParser: hash('4') };
const since = '2026-10-04T12:00:00.000Z';
function payload() { return { targetId: 'fixtureapp', composePath: '/docker-compose.yml', repositoryPath: 'fixture/private',
  branch: 'main', deploymentId: `r${'5'.repeat(23)}`, commit, rollback: false, sourcePins }; }
function queue(p = payload(), status = 'queued') { return { targetId: p.targetId, deploymentId: p.deploymentId,
  commit: p.commit, status, createdAt: since, finishedAt: status === 'finished' ? '2026-10-04T12:00:02.000Z' : null }; }
function transportFixture(result = { stdout: '{"ok":true,"queue":null}', exitCode: 0 }) {
  const calls = [];
  const transport = createFixedComposeQueueTransport({ sshBinary: '/usr/bin/ssh', sshHost: 'fixture-vps',
    runOwned: async descriptor => { calls.push(descriptor); return result; } });
  return { transport, calls };
}
function fixture(changes = {}) {
  let savedQueue = null;
  const calls = [], services = [
    { name: 'app', role: 'app', source: 'built', expectedState: 'running', mountDigest: hash('6') },
    { name: 'migrate', role: 'migration', source: 'built', expectedState: 'completed', mountDigest: hash('7') },
    { name: 'db', role: 'database', source: 'image', expectedState: 'running', mountDigest: hash('8'), imageDigest: image('9') }
  ];
  const configuration = { targetId: 'fixtureapp', buildPack: 'dockercompose', composePath: '/docker-compose.yml',
    repositoryUrl: 'https://github.com/fixture/private', branch: 'main', gitCommit: commit, autoDeploy: false,
    sourcePins: { queueHelper: sourcePins.queueHelper, deploymentJob: sourcePins.deploymentJob },
    sourceDigest: hash('a'), composeDigest: hash('b'), environmentDigest: hash('c'), storageDigest: hash('d'),
    settingsDigest: hash('e'), runtimePolicyDigest: hash('f'), topology: { applicationId: '1', projectId: '2', environmentId: '3',
      destinationId: '4', destinationType: 'StandaloneDocker', serverId: '5' }, services };
  const expected = { configuration: structuredClone(configuration), configDigest: composeConfigurationDigest(configuration) };
  const transport = { async run(operation, p) { calls.push({ operation, p });
    if (operation === 'dispatch') savedQueue = queue(p);
    return { queue: savedQueue }; } };
  const callbacks = { readConfiguration: async () => structuredClone(configuration),
    readRuntime: async q => ({ targetId: q.targetId, deploymentId: q.deploymentId,
      services: services.map((s, index) => ({ name: s.name, role: s.role, containerId: hash(String(index + 1)),
        imageDigest: s.source === 'image' ? s.imageDigest : image('f'), mountDigest: s.mountDigest,
        state: s.role === 'migration' ? 'exited' : 'running', health: s.role === 'migration' ? null : 'healthy', exitCode: 0,
        createdAt: s.source === 'image' ? '2026-10-01T00:00:00.000Z' : '2026-10-04T12:00:01.000Z',
        ...(s.source === 'built' ? { commit, tree, deploymentId: q.deploymentId } : {}) })) }),
    readBuildImages: async q => services.filter(s => s.source === 'built').map(s => ({ name: s.name, imageDigest: image('f'),
      commit, tree, deploymentId: q.deploymentId })),
    configureTarget: async p => { calls.push({ operation: 'configure', p }); configuration.gitCommit = p.commit; },
    inspectRemote: async () => ({ mainCommit: commit }), assertSafety: async () => {} };
  const gateway = createComposeReleaseGateway({ releaseId, expected, binding: { commit, tree, baselineCommit, baselineTree },
    sourcePins, repositoryPath: 'fixture/private', transport, ...callbacks, ...changes });
  return { gateway, configuration, calls, transport, callbacks, setQueue: q => { savedQueue = q; } };
}

test('fixed descriptor streams typed payload with pinned SSH and bounded output; input cannot select code', async () => {
  const f = transportFixture(); await f.transport.run('read', payload());
  const descriptor = f.calls[0]; assert.equal(descriptor.args.at(-1), 'docker exec -i coolify php');
  assert.equal(descriptor.write, false); assert.equal(descriptor.timeoutMs, 25000);
  assert(descriptor.args.includes('BatchMode=yes')); assert(descriptor.args.includes('StrictHostKeyChecking=yes'));
  assert(descriptor.stdin.includes(composeQueueOperationPhp));
  for (const change of [{ code: 'private' }, { composePath: '/a/../private.yml' }, { repositoryPath: 'x;private/y' },
    { sourcePins: { ...sourcePins, arbitrary: hash('9') } }])
    await assert.rejects(f.transport.run('read', { ...payload(), ...change }), /transport_input_invalid/);
  assert.equal(f.calls.length, 1);
});

test('fixed transport preserves uncertainty without retaining credential-bearing errors', async () => {
  const f = createFixedComposeQueueTransport({ sshBinary: '/usr/bin/ssh', sshHost: 'fixture',
    runOwned: async () => { throw Error('Bearer private'); } });
  await assert.rejects(f.run('dispatch', await qualifiedTransportPayload()), e => e.uncertain && e.message === 'release_compose_gateway_transport_unproven'
    && !JSON.stringify(e).includes('private'));
  await assert.rejects(f.run('read', payload()), e => !e.uncertain);
});

test('fixed transport cannot dispatch unqualified rollback or accept malformed queue proof', async () => {
  const f = transportFixture(); await assert.rejects(f.transport.run('dispatch', { ...payload(), rollback: true }), /exact_rollback_transport_unavailable/);
  assert.equal(f.calls.length, 0);
  for (const stdout of ['not json', '{"ok":true,"queue":null,"secret":"private"}', '{"ok":false}',
    JSON.stringify({ ok: true, queue: { ...queue(), finishedAt: undefined } })])
    await assert.rejects(transportFixture({ stdout, exitCode: 0 }).transport.run('dispatch', await qualifiedTransportPayload()), e => e.uncertain);
});

test('normal dispatch records deterministic identity and replay only reads existing queue', async () => {
  const f = fixture(), options = { operationId, since };
  const first = await f.gateway.deploy(options); assert.match(first.deploymentId, /^r[a-f0-9]{23}$/);
  assert.deepEqual(f.calls.map(c => c.operation), ['read', 'dispatch', 'read']);
  await f.gateway.deploy(options); assert.equal(f.calls.filter(c => c.operation === 'dispatch').length, 1);
});

test('lost reply reconciles exact existing queue using reads and never blindly dispatches', async () => {
  const f = fixture(), run = f.transport.run;
  f.transport.run = async (...args) => { const result = await run(...args); if (args[0] === 'dispatch') throw Error('private'); return result; };
  await assert.rejects(f.gateway.deploy({ operationId, since }), e => e.uncertain);
  const result = await f.gateway.reconcileDeployment({ operationId, since }); assert.equal(result.state, 'pending');
  await f.gateway.deploy({ operationId, since }); assert.equal(f.calls.filter(c => c.operation === 'dispatch').length, 1);
});

test('absent historical queue remains absence, never invented native runtime provenance', async () => {
  const f = fixture(); const options = { operationId, since };
  assert.deepEqual(await f.gateway.reconcileDeployment(options), { state: 'absent', absenceVerified: true });
  await assert.rejects(f.gateway.inspectRuntime(options), /runtime_queue_unproven/);
  assert.equal(f.calls.some(c => c.operation === 'dispatch'), false);
});

test('finished queue qualifies actual complete source-image runtime through pure state component', async () => {
  const f = fixture(), first = await f.gateway.deploy({ operationId, since }); f.setQueue({ ...first, status: 'finished', finishedAt: '2026-10-04T12:00:02.000Z' });
  const result = await f.gateway.reconcileDeployment({ operationId, since });
  assert.equal(result.state, 'finished'); assert.equal(result.proof.healthy, true); assert.equal(result.proof.services.length, 3);
});

test('configure is restricted to exact pin; read-only reconciliation does not invent original preimage', async () => {
  const f = fixture(); await f.gateway.configure('rollback');
  assert.equal(f.configuration.gitCommit, baselineCommit);
  assert.deepEqual(f.calls.find(c => c.operation === 'configure').p, { targetId: 'fixtureapp', expectedConfigDigest: composeConfigurationDigest(f.configuration),
    desiredConfigDigest: composeConfigurationDigest(f.configuration), commit: baselineCommit, mode: 'rollback' });
  assert.equal((await f.gateway.reconcileConfiguration('candidate')).state, 'uncertain');
  assert.equal((await f.gateway.reconcileConfiguration('rollback')).state, 'applied');
  await assert.rejects(f.gateway.deploy({ operationId, since, rollback: true }), /exact_rollback_transport_unavailable/);
});

test('changed config, unsafe activity or remote source blocks candidate effect', async () => {
  for (const reason of ['config', 'safety', 'remote']) {
    const f = fixture(reason === 'safety' ? { assertSafety: async () => { throw Error('activity'); } }
      : reason === 'remote' ? { inspectRemote: async () => ({ mainCommit: baselineCommit }) } : {});
    if (reason === 'config') f.configuration.composeDigest = hash('9');
    await assert.rejects(f.gateway.deploy({ operationId, since }));
    assert.equal(f.calls.some(c => c.operation === 'dispatch'), false);
  }
});

test('sealed rollback transform changes only build/image and preserves DB/env/commands/dependencies/storage', () => {
  const document = { services: { app: { build: { context: '.', dockerfile: 'Dockerfile' }, command: ['serve'], environment: { FEATURE: 'on' }, depends_on: ['db'] },
    migrate: { build: '.', restart: 'no', command: ['migrate'] }, db: { image: 'pgvector/pgvector:pg15', volumes: ['data:/var/lib/postgresql/data'] } }, volumes: { data: {} } };
  const before = structuredClone(document), original = composeRollbackDocumentDigest(document);
  const transformed = createImmutableComposeRollback({ document, sourceDocumentDigest: original,
    images: [{ name: 'app', imageDigest: image('a') }, { name: 'migrate', imageDigest: image('b') }] });
  assert.deepEqual(document, before); assert.equal(transformed.dispatchQualified, false);
  assert.deepEqual(transformed.document.services.db, document.services.db);
  assert.deepEqual(transformed.document.services.app.command, document.services.app.command);
  assert.deepEqual(transformed.document.services.app.environment, document.services.app.environment);
  assert.deepEqual(transformed.document.services.app.depends_on, document.services.app.depends_on);
  assert.equal(Object.hasOwn(transformed.document.services.app, 'build'), false);
  assert.equal(transformed.document.services.app.image, image('a'));
  assert.notEqual(transformed.rollbackDocumentDigest, original);
  for (const images of [[{ name: 'app', imageDigest: image('a') }], [{ name: 'app', imageDigest: image('a') }, { name: 'db', imageDigest: image('b') }],
    [{ name: 'app', imageDigest: image('a') }, { name: 'app', imageDigest: image('b') }]])
    assert.throws(() => createImmutableComposeRollback({ document, sourceDocumentDigest: original, images }), /rollback_service_set_changed/);
  assert.throws(() => createImmutableComposeRollback({ document, sourceDocumentDigest: hash('f'), images: [] }), /rollback_source_changed/);
});

function qualifiedRollbackFixture(changeCapability = value => value) {
  const f = fixture(), document = { services: { app: { image: image('a'), command: ['serve'] },
    migrate: { image: image('b'), command: ['migrate'] }, db: { image: 'pgvector/pgvector:pg15' } } };
  const artifactBytes = Buffer.from(JSON.stringify(document));
  const phaseServices = f.configuration.services.map((service, i) => ({ name: service.name, role: service.role, source: service.source,
    imageDigest: service.source === 'image' ? service.imageDigest : image(i === 0 ? 'a' : 'b'),
    imageRef: service.source === 'image' ? 'pgvector/pgvector:pg15' : `fixtureapp_${service.name}:${baselineCommit}`,
    mountDigest: composeMountDigest([]) }));
  const rollbackPolicy = { schemaVersion: 'roost-compose-phase-policy-v1', releaseId,
    policyId: '22345678-1234-1234-1234-123456789abc', targetId: 'fixtureapp', phase: 'rollback',
    commit: baselineCommit, tree: baselineTree, composePath: f.configuration.composePath, baseDirectory: '/',
    rawCompose: false, preserveRepository: false, useBuildServer: false, originalConfigDigest: composeConfigurationDigest(f.configuration),
    phaseConfigDigest: hash('0'), artifactDigest: createHash('sha256').update(artifactBytes).digest('hex'),
    rendererDigest: hash('f'), settingsInvariantDigest: hash('d'), runtimeInvariantDigest: hash('e'), services: phaseServices,
    sourcePins: { ...sourcePins, dockerHelper: hash('5'), applicationsController: hash('6'), controllerRenderer: hash('f') } };
  const rollbackConfiguration = { ...structuredClone(f.configuration), gitCommit: baselineCommit,
    sourcePins: { ...f.configuration.sourcePins, controllerRenderer: hash('f') },
    composeDigest: hash('3'), sourceDigest: hash('4'), controllerPolicy: composeControllerPolicyRecord(rollbackPolicy) };
  const rollbackExpected = { configuration: rollbackConfiguration, configDigest: composeConfigurationDigest(rollbackConfiguration) };
  rollbackPolicy.phaseConfigDigest = rollbackExpected.configDigest;
  const prepareRollbackPhase = async () => changeCapability(qualifyComposePhaseArtifact({ policy: rollbackPolicy, artifactBytes,
    configurationDigest: rollbackExpected.configDigest, sourcePins: rollbackPolicy.sourcePins,
    rendererDigest: rollbackPolicy.rendererDigest, settingsInvariantDigest: rollbackPolicy.settingsInvariantDigest,
    runtimeInvariantDigest: rollbackPolicy.runtimeInvariantDigest,
    services: phaseServices.map(row => ({ name: row.name, imageDigest: row.imageDigest, mounts: [] })),
    imageIdentities: [...phaseServices.map(row => ({ imageRef: row.imageDigest, imageDigest: row.imageDigest })),
      { imageRef: 'pgvector/pgvector:pg15', imageDigest: image('9') }] }));
  const gateway = createComposeReleaseGateway({ releaseId,
    expected: { configuration: structuredClone(f.configuration), configDigest: composeConfigurationDigest(f.configuration) },
    rollbackExpected, rollbackPolicy, binding: { commit, tree, baselineCommit, baselineTree }, sourcePins,
    repositoryPath: 'fixture/private', transport: f.transport, ...f.callbacks, prepareRollbackPhase,
    configureTarget: async p => { f.calls.push({ operation: 'configure', p }); Object.assign(f.configuration, rollbackConfiguration); } });
  return { ...f, gateway, rollbackExpected, rollbackPolicy, prepareRollbackPhase };
}

async function qualifiedTransportPayload() {
  const phaseCapability = await qualifiedRollbackFixture().prepareRollbackPhase();
  return { ...payload(), commit: baselineCommit, rollback: true, phaseCapability };
}

test('qualified rollback uses distinct sealed phase config and exact capability through normal deterministic queue', async () => {
  const f = qualifiedRollbackFixture(); await f.gateway.configure('rollback');
  assert.equal((await f.gateway.inspectTarget({ rollback: true })).controllerPolicy.phase, 'rollback');
  await assert.rejects(f.gateway.inspectTarget(), /configuration_changed/);
  const options = { operationId, since, rollback: true }, row = await f.gateway.deploy(options);
  assert.equal(row.commit, baselineCommit);
  const dispatch = f.calls.find(c => c.operation === 'dispatch'); assert.equal(dispatch.p.rollback, true);
  assert.equal(dispatch.p.phaseCapability.policyId, f.rollbackPolicy.policyId);
  assert.equal(dispatch.p.phaseCapability.phaseConfigDigest, f.rollbackExpected.configDigest);
  await f.gateway.deploy(options); assert.equal(f.calls.filter(c => c.operation === 'dispatch').length, 1);
});

test('altered sealed rollback capability cannot dispatch any effect', async () => {
  for (const key of ['policyId', 'policyDigest', 'artifactDigest', 'buildCommandDigest', 'rendererDigest', 'settingsInvariantDigest', 'runtimeInvariantDigest']) {
    const f = qualifiedRollbackFixture(cap => ({ ...cap, [key]: key === 'policyId' ? releaseId : hash('0') }));
    await f.gateway.configure('rollback'); await assert.rejects(f.gateway.deploy({ operationId, since, rollback: true }), /phase_capability_invalid/);
    assert.equal(f.calls.some(c => c.operation === 'dispatch'), false);
  }
});

const php = process.env.ROOST_TEST_PHP_BINARY ?? 'php';
let phpAvailable = false; try { execFileSync(php, ['-v'], { stdio: 'ignore', timeout: 5000 }); phpAvailable = true; } catch {}
test('production fixed PHP queue function executes against stubs and refuses scope/pins/activity/rollback', { skip: !phpAvailable }, () => {
  const program = String.raw`<?php
${composeQueueOperationPhp}
$p=json_decode(base64_decode('__PAYLOAD__'),true);$controls=json_decode(base64_decode('__CONTROLS__'),true);$calls=[];$queue=null;
$a=(object)['uuid'=>$p['targetId'],'build_pack'=>'dockercompose','docker_compose_location'=>$p['composePath'],
'git_repository'=>$p['repositoryPath'],'git_branch'=>$p['branch'],'git_commit_sha'=>$p['commit'],'settings'=>(object)['is_auto_deploy_enabled'=>false]];
if(isset($controls['target']))$a->uuid='other';if(isset($controls['auto']))$a->settings->is_auto_deploy_enabled=true;
if(isset($controls['pin']))$a->git_commit_sha=str_repeat('0',40);
$read=function($uuid)use(&$queue,$controls){if(isset($controls['wrongQueue']))return ['targetId'=>'other','deploymentId'=>$uuid,'commit'=>str_repeat('0',40)];return $queue;};
$sources=function($path)use($p,$controls){if(isset($controls['source']))return str_repeat('0',64);$key=str_contains($path,'ApplicationDeploymentJob')?'deploymentJob':(str_contains($path,'Models/Application')?'applicationModel':(str_contains($path,'parsers.php')?'composeParser':'queueHelper'));return $p['sourcePins'][$key];};
$dispatch=function($application,$value)use(&$queue,&$calls){$calls[]='dispatch';$queue=['targetId'=>$application->uuid,'deploymentId'=>$value['deploymentId'],'commit'=>$value['commit']];};
$validate=fn($application,$cap)=>!isset($controls['phase']);
try{$q=roost_compose_queue($a,$p,$sources,$read,$dispatch,fn()=>isset($controls['active']),$validate);
if(isset($controls['replay']))$q=roost_compose_queue($a,$p,$sources,$read,$dispatch,fn()=>true,$validate);
echo json_encode(['ok'=>true,'queue'=>$q,'calls'=>$calls]);}catch(Throwable $e){echo json_encode(['ok'=>false,'reason'=>$e->getMessage(),'calls'=>$calls]);}
`;
  const run = (controls = {}, input = { ...payload(), operation: 'dispatch', phaseCapability: { phase: 'candidate' } }) => JSON.parse(execFileSync(php, [], {
    input: program.replace('__PAYLOAD__', Buffer.from(JSON.stringify(input)).toString('base64'))
      .replace('__CONTROLS__', Buffer.from(JSON.stringify(controls)).toString('base64')), encoding: 'utf8', timeout: 5000 }));
  assert.deepEqual(run({ replay: true }).calls, ['dispatch']); assert.equal(run().ok, true);
  for (const controls of [{ target: true }, { auto: true }, { pin: true }, { source: true }, { active: true }, { wrongQueue: true }, { phase: true }]) {
    const result = run(controls); assert.equal(result.ok, false); assert.deepEqual(result.calls, []);
  }
  const rollback = run({}, { ...payload(), rollback: true, operation: 'dispatch' });
  assert.equal(rollback.reason, 'exact_rollback_transport_unavailable'); assert.deepEqual(rollback.calls, []);
  const read = run({ active: true }, { ...payload(), operation: 'read' }); assert.equal(read.ok, true); assert.equal(read.queue, null);
});
