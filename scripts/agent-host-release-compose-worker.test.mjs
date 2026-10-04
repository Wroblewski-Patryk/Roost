import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, linkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fixtureModule from './fixtures/release-compose-contract.cjs';
import contract from './lib/agent-host-release-contract.cjs';
import { createInstalledComposeRelease, installedComposeReleaseSchema, qualifyActivityRuntimeEvidence } from './lib/agent-host-release-compose-worker.mjs';
import { composeConfigurationDigest } from './lib/agent-host-release-compose-state.mjs';
import { composeControllerPolicyRecord, composeMountDigest, renderComposePhaseCommands } from './lib/agent-host-release-compose-controller.mjs';
import { coolifyGitSetDeploymentId } from './lib/agent-host-release-coolify-git-set-gateway.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rendererFile = fileURLToPath(new URL('./lib/agent-host-release-compose-controller.mjs', import.meta.url));

function activityBasis(){
 const f=fixtureModule.fixture();f.s.releaseId=randomUUID();const proof=f.evidence(false);
 const current={release:{id:f.s.releaseId},journal:[{operation:'observe',intent:{parameters:{mode:'candidate'}},outcome:{status:'succeeded',evidence:proof}},
  {operation:'runtime_resume'}]};
 return {f,current,evidence:structuredClone(proof.composeTargets[0])};
}
test('fresh queue evidence permits restored cadence state only with accepted immutable source and runtime pins',()=>{
 const {f,current,evidence}=activityBasis();evidence.runtime.services.find(r=>r.role==='cadence').state='running';
 const r=qualifyActivityRuntimeEvidence(f.s,current,evidence);assert.equal(r.commit,f.s.commit);assert.equal(r.tree,f.s.candidateTree);
 assert.equal(r.services.find(r=>r.role==='cadence').state,'running');
});
for(const [name,mutate]of [
 ['container replacement',v=>v.evidence.runtime.services[0].containerId=fixtureModule.hash('a')],
 ['image replacement',v=>v.evidence.runtime.services[0].imageDigest=fixtureModule.image('a')],
 ['mount replacement',v=>v.evidence.runtime.services[0].mountDigest=fixtureModule.hash('a')],
 ['queue still building',v=>v.evidence.binding.queue.status='in_progress'],
 ['changed configuration',v=>v.evidence.configuration.environmentDigest=fixtureModule.hash('a')],
 ['wrong release',v=>v.current.release.id=randomUUID()],
 ['missing accepted observation',v=>v.current.journal.shift()],
 ['incomplete observation',v=>v.current.journal[0].outcome.evidence.observationSeconds=1],
 ['non-post operation',v=>v.current.journal.at(-1).operation='deploy']
])test(`post-resume identity qualification refuses ${name}`,()=>{
 const v=activityBasis();mutate(v);assert.throws(()=>qualifyActivityRuntimeEvidence(v.f.s,v.current,v.evidence),/release_compose_installation_activity_/);
});

// These fixtures use actual independent files and directories. Only transports
// and inspector observations are substituted; identity checks remain physical.
function setup(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'roost-compose-installed-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), checkout = path.join(workspace, 'app'), privateDir = path.join(root, 'private');
  mkdirSync(path.join(checkout, '.git'), { recursive: true }); mkdirSync(privateDir);
  const f = fixtureModule.fixture(), { m, s, target } = f;
  m.repository.canonicalDir = checkout; m.cleanup.canonicalDir = checkout;
  s.applicationId = randomUUID(); s.releaseId = randomUUID();
  const renderer = hash(readFileSync(rendererFile)), pins = {
    queueHelper: fixtureModule.hash('1'), deploymentJob: fixtureModule.hash('2'), applicationModel: fixtureModule.hash('3'),
    composeParser: fixtureModule.hash('4'), dockerHelper: fixtureModule.hash('5'), applicationsController: fixtureModule.hash('6'), controllerRenderer: renderer
  };
  const mountDigest = composeMountDigest([]);
  const policies = {}, phaseFiles = {};
  for (const config of [target.configuration, target.rollbackConfiguration, target.baseline.configuration]) {
    config.sourcePins.controllerRenderer = renderer;
    for (const service of config.services) service.mountDigest = mountDigest;
  }
  target.baseline.controllerInvariants.rendererDigest = renderer;
  target.baseline.configDigest = composeConfigurationDigest(target.baseline.configuration);
  for (const phase of ['candidate', 'rollback']) {
    const config = phase === 'candidate' ? target.configuration : target.rollbackConfiguration;
    const artifact = Buffer.from(JSON.stringify({ services: Object.fromEntries(config.services.map(service => [service.name,
      service.source === 'image' ? { image: 'postgres:15' } : phase === 'candidate' ? { build: { context: '.' } }
        : { image: target.baseline.images.find(r => r.name === service.name).imageDigest }])) }));
    const policy = {
      schemaVersion: 'roost-compose-phase-policy-v1', releaseId: s.releaseId, policyId: randomUUID(), targetId: target.targetId, phase,
      commit: phase === 'candidate' ? s.commit : s.baseCommit, tree: phase === 'candidate' ? s.candidateTree : s.baseTree,
      composePath: target.composePath, baseDirectory: '/', rawCompose: false, preserveRepository: false, useBuildServer: false,
      originalConfigDigest: target.baseline.configDigest, phaseConfigDigest: fixtureModule.hash('0'), artifactDigest: hash(artifact),
      ...target.baseline.controllerInvariants, sourcePins: pins,
      services: config.services.map(service => ({ name: service.name, role: service.role, source: service.source, mountDigest,
        imageDigest: service.source === 'image' ? service.imageDigest : target.baseline.images.find(r => r.name === service.name).imageDigest,
        imageRef: service.source === 'image' ? 'postgres:15' : target.baseline.images.find(r => r.name === service.name).imageDigest }))
    };
    config.controllerPolicy = composeControllerPolicyRecord(policy);
    const digest = composeConfigurationDigest(config);
    policy.phaseConfigDigest = digest; target[phase === 'candidate' ? 'configDigest' : 'rollbackConfigDigest'] = digest;
    policies[phase] = policy;
    const artifactFile = path.join(privateDir, `${phase}-artifact.json`), policyFile = path.join(privateDir, `${phase}-policy.json`);
    writeFileSync(artifactFile, artifact); writeFileSync(policyFile, JSON.stringify(policy));
    phaseFiles[phase] = { policy: { file: policyFile, sha256: hash(readFileSync(policyFile)) }, artifact: { file: artifactFile, sha256: hash(artifact) } };
  }
  m.deployment.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.configDigest }]);
  m.baseline.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.baseline.configDigest }]);
  m.rollback.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.rollbackConfigDigest }]);
  m.cleanup.protectedResourceIds = [target.targetId, ...target.baseline.images.map(r => r.imageDigest), mountDigest, fixtureModule.image('e')];
  m.deployment.artifactSetDigest = contract.sourceArtifactDigest(m, s);
  m.baseline.artifactSetDigest = contract.sourceArtifactDigest(m, s, 'baseline');
  m.rollback.artifactSetDigest = contract.sourceArtifactDigest(m, s, true);
  m.baseline.healthDigest = contract.releaseDigest(m.services.map(service => ({ ...service, healthy: true })));
  const baseline = { observed: true, migrationSchemaVerified: true, commit: s.baseCommit, tree: s.baseTree,
    configDigest: target.baseline.configDigest, schemaDigest: m.baseline.schemaDigest, healthDigest: m.baseline.healthDigest,
    dataDigest: m.baseline.dataDigest, healthy: true, images: target.baseline.images,
    services: f.evidence('baseline').composeTargets[0].runtime.services };
  const ownership = { schemaVersion: 'roost-application-release-ownership-v1', applicationId: s.applicationId,
    canonicalDir: checkout, repositoryUrl: m.repository.url, targetIds: [target.targetId], protectedResourceIds: m.cleanup.protectedResourceIds, ownedResourceIds: [] };
  const ownerFile = path.join(privateDir, 'ownership.json'), baselineFile = path.join(privateDir, 'baseline.json');
  writeFileSync(ownerFile, JSON.stringify(ownership)); writeFileSync(baselineFile, JSON.stringify(baseline));
  const settings = { sshHost: 'fixture-host', sshAddressFamily: 'ipv4', workspaceRoot: workspace, ownershipFile: ownerFile,
    baselineObservation: { file: baselineFile, sha256: hash(readFileSync(baselineFile)) }, phases: phaseFiles, sourcePins: pins,
    source: { sshHost: 'fixture-host', container: baseline.services.find(r => r.role === 'database').containerId, user: 'appuser', database: 'appdb' }, fingerprintTimeoutMs: 30000,
    capacity: { minDiskBytes: 1000, minMemoryBytes: 1000, maxLoad1: 2 }, coolify: { origin: 'https://controller.example.test' },
    health: { frontendMetaName: 'application-revision', requireReleaseReadiness: true, requireReflectionReadiness: true } };
  const state = { release: { id: s.releaseId, snapshot: s }, status: 'active', journal: [] };
  const calls = [], clock = { now: Date.now() }, live = { phase: 'baseline', queue: null, capacity: { diskBytes: 10000, memoryBytes: 10000, load1: 0.5 },
    cadenceState: 'paused', cadenceExit: 0, cadenceHealth: null, fence: true, otherSessions: 0, healthy: true, versionVerified: true, remote: s.commit, mounts: [],
    databaseContainer: settings.source.container, databaseImage: fixtureModule.image('e'), databaseMount: mountDigest, databaseHealth: 'healthy', appHealth: 'healthy', migrationExit: 0,
    controllerObserved: { settingsInvariantDigest: target.baseline.controllerInvariants.settingsInvariantDigest,
      runtimeInvariantDigest: target.baseline.controllerInvariants.runtimeInvariantDigest } };
  let inspectorOptions;
  const phaseConfig = () => live.phase === 'baseline' ? target.baseline.configuration : live.phase === 'rollback' ? target.rollbackConfiguration : target.configuration;
  const runtimeEvidence = queue => {
    const row = f.evidence(queue.commit === s.baseCommit).composeTargets[0];
    row.runtime.deploymentId = queue.deploymentId; row.binding.deploymentId = queue.deploymentId; row.binding.queue = queue;
    Object.assign(row.runtime.services.find(r => r.role === 'database'), { containerId: live.databaseContainer, imageDigest: live.databaseImage, mountDigest: live.databaseMount, health: live.databaseHealth });
    row.runtime.services.find(r => r.role === 'app').health = live.appHealth;
    row.runtime.services.find(r => r.role === 'migration').exitCode = live.migrationExit;
    for (const service of row.runtime.services) if (service.role !== 'database') {
      service.deploymentId = queue.deploymentId; service.createdAt = new Date(Date.parse(queue.createdAt) + 500).toISOString();
    }
    for (const image of row.binding.images) image.deploymentId = queue.deploymentId;
    return row;
  };
  const deps = {
    now: () => clock.now, sleep: async ms => { clock.now += ms; calls.push({ kind: 'wait', ms }); live.afterSleep?.(); },
    readReleaseState: async () => state,
    createHealthProbe: ({ publicUrl, health }) => async args => {
      calls.push({ kind: 'health', publicUrl, health, ...args });
      return { healthy: live.healthy, versionVerified: live.versionVerified, healthDigest: m.baseline.healthDigest,
        observations: ['backend', 'frontend'].map(surface => ({ surface, healthy: live.healthy, versionVerified: live.versionVerified, reason: 'verified' })) };
    },
    coolifyJson: async args => {
      calls.push({ kind: 'https', ...args });
      if (args.method === 'PATCH') live.phase = args.body.git_commit_sha === s.commit ? 'candidate' : 'rollback';
      return { uuid: target.targetId, git_commit_sha: phaseConfig().gitCommit };
    },
    createInspector: options => { inspectorOptions = options; return {
      inspectConfiguration: async () => structuredClone(phaseConfig()),
      inspectLegacyBaseline: async () => ({ configuration: structuredClone(phaseConfig()), controllerObserved: live.controllerObserved,
        services: baseline.services.filter(r=>!live.missingMigration||r.role!=='migration').map(r => ({ ...r, ...(r.role === 'app' ? {imageDigest:live.appImage??r.imageDigest,health:live.appHealth}
          : r.role === 'cadence' ? { state: live.cadenceState, exitCode: live.cadenceExit, health: live.cadenceHealth }
          : r.role === 'database' ? { containerId: live.databaseContainer, imageDigest: live.databaseImage, mountDigest: live.databaseMount, health: live.databaseHealth } : {}) })) }),
      readEvidence: async queue => runtimeEvidence(queue), readRuntime: async queue => runtimeEvidence(queue).runtime,
      readBuildImages: async queue => runtimeEvidence(queue).binding.images
    }; },
    nativeProcess: async (binary, options) => {
      calls.push({ kind: 'native', binary, ...options });
      if (binary === 'git') return options.argv.includes('show') ? Buffer.from('fixed-compose-source') : Buffer.from(`${s.candidateTree}\n`);
      const command = options.argv.at(-1);
      if (command.includes('psql')) return JSON.stringify({ readOnlyFence: live.fence, activeOtherSessions: live.otherSessions });
      if (command === 'bash -s') { live.afterFingerprint?.(); return `${m.baseline.schemaDigest}  -\n${m.baseline.dataDigest}  -\n`; }
      if (command.startsWith('docker image inspect')) return command.endsWith("'postgres:15'") ? fixtureModule.image('e') : command.match(/sha256:[a-f0-9]{64}/)?.[0];
      if (command.startsWith('docker container inspect')) return JSON.stringify(live.mounts);
      if (command !== 'docker exec -i coolify php') return JSON.stringify(live.capacity);
      const encoded = options.input.match(/base64_decode\('([^']+)'/)[1], payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      if (payload.operation) {
        calls.push({ kind: 'queue', payload });
        if (payload.operation === 'dispatch') live.queue = { targetId: payload.targetId, deploymentId: payload.deploymentId, commit: payload.commit,
          status: 'finished', createdAt: state.journal.at(-1).createdAt, finishedAt: new Date().toISOString() };
        return JSON.stringify({ ok: true, queue: live.queue });
      }
      if (payload.name) return '{"staged":true}';
      return JSON.stringify({activeDeployments:live.activeDeployments??0});
    }
  };
  const input = { settings, state, backup: structuredClone(m.backup), github: { inspect: async () => ({ remoteBase: live.remote }) }, coolifyCredential: 'fixture-access' };
  const install = overrides => createInstalledComposeRelease(input, { ...deps, ...overrides });
  const operation = rollback => ({ operationId: randomUUID(), since: new Date(Date.now() - 5000).toISOString(), targetId: target.targetId, rollback });
  const queueFor = options => ({ targetId: target.targetId, deploymentId: coolifyGitSetDeploymentId({ releaseId: s.releaseId, operationId: options.operationId,
    targetId: target.targetId, rollback: options.rollback }), commit: options.rollback ? s.baseCommit : s.commit,
    status: 'finished', createdAt: options.since, finishedAt: new Date(Date.now() - 1000).toISOString() });
  const intentFor = options => { state.journal = [{ id: options.operationId, createdAt: options.since, operation: options.rollback ? 'rollback' : 'deploy',
    intent: { parameters: { targetId: target.targetId } } }]; };
  const configIntent = rollback => { const basis = rollback ? m.rollback : m.deployment; state.journal = [{ id: randomUUID(), createdAt: new Date().toISOString(),
    operation: rollback ? 'rollback_config' : 'deploy_config', intent: { parameters: { commit: rollback ? s.baseCommit : s.commit,
      artifactSetDigest: basis.artifactSetDigest, configDigest: basis.configDigest, schemaDigest: basis.schemaDigest } } }]; };
  configIntent(false);
  const rewritePolicy = (phase, mutate) => { mutate(policies[phase]); writeFileSync(phaseFiles[phase].policy.file, JSON.stringify(policies[phase])); phaseFiles[phase].policy.sha256 = hash(readFileSync(phaseFiles[phase].policy.file)); };
  const sealBaseline = () => { writeFileSync(baselineFile, JSON.stringify(baseline)); settings.baselineObservation.sha256 = hash(readFileSync(baselineFile)); };
  return { ...f, root, workspace, checkout, privateDir, settings, state, input, deps, live, calls, clock, baseline, ownership, policies,
    install, operation, queueFor, intentFor, configIntent, rewritePolicy, sealBaseline, inspectorOptions: () => inspectorOptions };
}

test('installation seals physical checkout and every private file; complete baseline remains retention-only', async t => {
  const f = setup(t), installed = f.install();
  assert.deepEqual(await installed.assertClone(), { canonicalDir: f.checkout, present: true });
  assert.equal((await installed.coolify.inspect(f.m, f.s)).baselineCommit, f.s.baseCommit);
  assert.equal((await installed.resources.verifyRetention()).absenceVerified, true);
  assert.equal(f.calls.some(r => r.kind === 'queue' || r.method === 'PATCH'), false);
  assert.equal(Object.isFrozen(installed.resources), true);
});

for (const field of ['callback', 'configurationSelector', 'shell', 'modulePath']) test(`settings refuse caller-selected ${field}`, t => {
  const f = setup(t); f.settings[field] = field === 'callback' ? () => {} : 'untrusted';
  assert.equal(installedComposeReleaseSchema.safeParse(f.settings).success, false);
  assert.throws(() => f.install()); assert.equal(f.calls.length, 0);
});

for (const change of ['renderer', 'ssh_scope', 'controller_origin', 'ownership', 'phase', 'commit', 'source_pin', 'artifact']) test(`installation refuses changed ${change}`, t => {
  const f = setup(t);
  if (change === 'renderer') f.settings.sourcePins.controllerRenderer = fixtureModule.hash('0');
  if (change === 'ssh_scope') f.settings.source.sshHost = 'another-host';
  if (change === 'controller_origin') f.settings.coolify.origin = 'https://other.example.test';
  if (change === 'ownership') writeFileSync(f.settings.ownershipFile, JSON.stringify({ ...f.ownership, applicationId: randomUUID() }));
  if (change === 'phase') f.rewritePolicy('candidate', p => { p.phase = 'rollback'; });
  if (change === 'commit') f.rewritePolicy('candidate', p => { p.commit = fixtureModule.git('0'); });
  if (change === 'source_pin') f.rewritePolicy('candidate', p => { p.sourcePins.applicationModel = fixtureModule.hash('0'); });
  if (change === 'artifact') writeFileSync(f.settings.phases.candidate.artifact.file, '{}');
  assert.throws(() => f.install()); assert.equal(f.calls.length, 0);
});

test('private policy cannot be loaded from the application workspace', t => {
  const f = setup(t), file = path.join(f.checkout, 'policy.json');
  writeFileSync(file, readFileSync(f.settings.phases.candidate.policy.file)); f.settings.phases.candidate.policy.file = file;
  assert.throws(() => f.install(), /private_path_invalid/); assert.equal(f.calls.length, 0);
});

test('hard-linked private files are refused before any transport', t => {
  const f = setup(t); linkSync(f.settings.ownershipFile, path.join(f.privateDir, 'ownership-copy.json'));
  assert.throws(() => f.install(), /native_root_invalid/); assert.equal(f.calls.length, 0);
});

for (const change of ['bytes', 'file_identity', 'git_identity', 'manifest']) test(`assertClone refuses ${change} drift before SSH`, async t => {
  const f = setup(t), installed = f.install();
  if (change === 'bytes') writeFileSync(f.settings.phases.rollback.artifact.file, '{}');
  if (change === 'file_identity') { const file = f.settings.ownershipFile; renameSync(file, `${file}.old`); writeFileSync(file, readFileSync(`${file}.old`)); }
  if (change === 'git_identity') { renameSync(path.join(f.checkout, '.git'), path.join(f.checkout, '.git-old')); mkdirSync(path.join(f.checkout, '.git')); }
  if (change === 'manifest') await assert.rejects(installed.assertClone({ ...f.m, services: [] }), /clone_changed/);
  else await assert.rejects(installed.resources.inspectCapacity(), /private_file_changed|clone_changed/);
  assert.equal(f.calls.length, 0);
});

test('physical SSH execution requires the owned process capability', async t => {
  const f = setup(t), installed = f.install({ nativeProcess: undefined });
  await assert.rejects(installed.resources.inspectCapacity(), /owned_process_scope_required/); assert.equal(f.calls.length, 0);
});

test('SSH uses sealed host, mandatory host-key checking, bounded output and IPv4', async t => {
  const f = setup(t), installed = f.install();
  assert.equal((await installed.resources.inspectCapacity()).available, true);
  const calls = f.calls.filter(r => r.kind === 'native'); assert.equal(calls.length, 2);
  for (const row of calls) {
    assert.equal(row.binary, 'ssh'); assert.deepEqual(row.argv.slice(0, -1), ['-4', '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', 'fixture-host']);
    assert.ok(row.durationMs <= 25000); assert.ok(row.maxBytes <= 32768);
  }
});

test('oversized or failed SSH replies cannot prove capacity', async t => {
  const f = setup(t);
  await assert.rejects(f.install({ nativeProcess: async () => 'x'.repeat(32769) }).resources.inspectCapacity(), /response_size_invalid/);
  await assert.rejects(f.install({ nativeProcess: async () => { throw Error('connection_closed'); } }).resources.inspectCapacity(), /ssh_unavailable/);
});

for (const change of ['fence', 'active_session', 'cadence', 'backup', 'capacity']) test(`installed checks block ${change} without configuration writes`, async t => {
  const f = setup(t), installed = f.install();
  if (change === 'fence') f.live.fence = false;
  if (change === 'active_session') f.live.otherSessions = 1;
  if (change === 'cadence') f.live.cadenceState = 'running';
  if (change === 'backup') f.input.backup.restoreDigest = fixtureModule.hash('0');
  if (change === 'capacity') f.live.capacity.diskBytes = 0;
  await assert.rejects(change === 'capacity' ? installed.resources.inspectCapacity() : installed.coolify.configureCandidate(f.m, f.s),
    /maintenance_unproven|cadence_activity_present|backup_changed|capacity_unproven/);
  assert.equal(f.calls.some(r => r.kind === 'https' && r.method === 'PATCH' || r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

test('configuration crosses only sealed baseline, candidate and rollback phases', async t => {
  const f = setup(t), installed = f.install();
  assert.equal((await installed.coolify.configureCandidate(f.m, f.s)).deployedCommit, f.s.commit);
  f.configIntent(true);
  assert.equal((await installed.coolify.configureRollback(f.m, f.s)).deployedCommit, f.s.baseCommit);
  const writes = f.calls.filter(r => r.kind === 'https' && r.method === 'PATCH'); assert.equal(writes.length, 2);
  for (const [index, phase] of ['candidate', 'rollback'].entries()) {
    const commands = renderComposePhaseCommands(f.policies[phase]);
    assert.equal(writes[index].url, 'https://controller.example.test/api/v1/applications/composeapp');
    assert.deepEqual(writes[index].body, { git_commit_sha: f.policies[phase].commit,
      docker_compose_custom_build_command: commands.build, docker_compose_custom_start_command: commands.start });
  }
});

test('changed remote candidate blocks artifact staging and configuration PATCH', async t => {
  const f = setup(t), installed = f.install(); f.live.remote = fixtureModule.git('0');
  await assert.rejects(installed.coolify.configureCandidate(f.m, f.s), /configuration_mutation_uncertain/);
  assert.equal(f.calls.some(r => r.method === 'PATCH' || r.kind === 'native' && r.input.includes('"staged":true')), false);
});

for (const rollback of [false, true]) test(`exact ${rollback ? 'rollback' : 'candidate'} queue is read and qualified without repeated dispatch`, async t => {
  const f = setup(t), installed = f.install(), options = f.operation(rollback); f.live.phase = rollback ? 'rollback' : 'candidate'; f.live.queue = f.queueFor(options);
  const result = await installed.coolify.reconcileDeployment(f.m, f.s, options);
  assert.equal(result.state, 'finished'); assert.equal(result.healthy, true);
  assert.equal(result.deployedCommit, rollback ? f.s.baseCommit : f.s.commit);
  assert.equal(result.imageDigest, undefined); assert.equal(result.composeTargets[0].runtime.services.length, 4);
  const reads = f.calls.filter(r => r.kind === 'queue'); assert.equal(reads.length, 2);
  for (const row of reads) { assert.equal(row.payload.operation, 'read'); assert.equal(row.payload.targetId, 'composeapp'); assert.equal(row.payload.deploymentId, f.live.queue.deploymentId); assert.equal(row.payload.rollback, rollback); }
  assert.equal(f.calls.some(r => r.method === 'PATCH'), false);
});

for (const field of ['deploymentId', 'targetId', 'commit', 'createdAt', 'finished_HEAD']) test(`foreign or uncertain queue ${field} is refused without retry`, async t => {
  const f = setup(t), installed = f.install(), options = f.operation(false); f.live.phase = 'candidate'; f.live.queue = f.queueFor(options);
  if (field === 'finished_HEAD') f.live.queue.commit = 'HEAD';
  else f.live.queue[field] = field === 'commit' ? fixtureModule.git('0') : field === 'createdAt' ? '2020-01-01T00:00:00.000Z' : 'foreign';
  await assert.rejects(installed.coolify.reconcileDeployment(f.m, f.s, options), /queue_identity_changed/);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch' || r.method === 'PATCH'), false);
});

test('absence is read-only proof, never a deployment success', async t => {
  const f = setup(t), options=f.operation(false);f.intentFor(options);f.live.phase='candidate';
  const result = await f.install().coolify.reconcileDeployment(f.m, f.s, options);
  assert.equal(result.state,'absent');assert.equal(result.evidence.absenceVerified,true);assert.equal(result.evidence.composeRecovery.queue,null);
  assert.equal(result.evidence.composeTargets,undefined);assert.deepEqual(result.evidence.deploymentIds,[]);
  assert.equal(result.evidence.deployedCommit,f.s.baseCommit);assert.equal(result.evidence.healthy,true);
  assert.equal(f.calls.filter(r => r.kind === 'queue').length, 3);
  assert.equal(f.calls.some(r=>r.method==='PATCH'||r.kind==='queue'&&r.payload.operation==='dispatch'),false);
});

for(const status of ['failed','cancelled-by-user'])for(const commit of ['exact','HEAD'])test(`installed ${status}/${commit} attributes unchanged retained baseline without candidate receipt`,async t=>{
 const f=setup(t),o=f.operation(false);f.intentFor(o);f.live.phase='candidate';f.live.queue={...f.queueFor(o),status,commit:commit==='HEAD'?'HEAD':f.s.commit};
 const result=await f.install().coolify.reconcileDeployment(f.m,f.s,o);
 assert.equal(result.state,'failed');assert.equal(result.evidence.composeRecovery.queue.status,status);assert.equal(result.evidence.composeRecovery.kind,'queue_failed');
 assert.equal(result.evidence.deployedCommit,f.s.baseCommit);assert.equal(result.evidence.healthy,true);assert.equal(result.evidence.composeTargets,undefined);
 assert.equal(f.calls.some(r=>r.method==='PATCH'||r.kind==='queue'&&r.payload.operation==='dispatch'),false);
});
test('historical missing migration stays an observation; its verified schema does not invent a completed container',async t=>{
 const f=setup(t),o=f.operation(false);f.baseline.services=f.baseline.services.filter(r=>r.role!=='migration');f.sealBaseline();f.intentFor(o);f.live.phase='candidate';
 const result=await f.install().coolify.reconcileDeployment(f.m,f.s,o);
 assert.equal(result.evidence.composeRecovery.services.some(r=>r.role==='migration'),false);
 assert.equal(result.evidence.composeRecovery.migrationSchemaVerified,true);assert.equal(result.evidence.composeTargets,undefined);
});
for(const [name,mutate] of [
 ['partial candidate',f=>{f.live.appImage=fixtureModule.image('f');}],
 ['database recreation',f=>{f.live.databaseContainer=fixtureModule.hash('0');}],
 ['unhealthy prior app',f=>{f.live.appHealth='unhealthy';}],
 ['active control plane',f=>{f.live.activeDeployments=1;}],
 ['wrong source preimage',f=>{f.live.phase='baseline';}],
 ['lost migration',f=>{f.live.missingMigration=true;}],
 ['queue appears during inspection',f=>{f.live.afterFingerprint=()=>{f.live.queue=f.queueFor(f.recoveryOptions);};}]
])test(`recovery refuses ${name} without dispatch or config mutation`,async t=>{
 const f=setup(t),o=f.operation(false);f.recoveryOptions=o;f.intentFor(o);f.live.phase='candidate';mutate(f);
 await assert.rejects(f.install().coolify.reconcileDeployment(f.m,f.s,o));
 assert.equal(f.calls.some(r=>r.method==='PATCH'||r.kind==='queue'&&r.payload.operation==='dispatch'),false);
});

test('missing current write intent cannot dispatch a new deployment', async t => {
  const f = setup(t), installed = f.install(); f.live.phase = 'candidate';
  await assert.rejects(installed.coolify.deploy(f.m, f.s, f.operation(false)), /dispatch_uncertain/);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

for (const rollback of [false, true]) test(`new ${rollback ? 'rollback' : 'candidate'} dispatch carries exact sealed phase capability and all service images`, async t => {
  const f = setup(t), installed = f.install(), options = f.operation(rollback);
  f.live.phase = rollback ? 'rollback' : 'candidate'; f.intentFor(options);
  const result = await (rollback ? installed.coolify.rollback(f.m, f.s, options) : installed.coolify.deploy(f.m, f.s, options));
  assert.equal(result.state, 'finished'); assert.equal(result.healthy, true);
  const dispatched = f.calls.filter(r => r.kind === 'queue' && r.payload.operation === 'dispatch'); assert.equal(dispatched.length, 1);
  const row = dispatched[0].payload, policy = f.policies[rollback ? 'rollback' : 'candidate'];
  assert.equal(row.deploymentId, f.queueFor(options).deploymentId); assert.equal(row.commit, policy.commit);
  assert.deepEqual(row.phaseCapability.services, policy.services); assert.deepEqual(row.phaseCapability.sourcePins, f.settings.sourcePins);
  assert.equal(row.phaseCapability.phase, policy.phase); assert.equal(row.phaseCapability.artifactDigest, policy.artifactDigest);
  assert.equal(row.phaseCapability.rendererDigest, hash(readFileSync(rendererFile)));
});

for (const change of ['release', 'status', 'operation', 'since', 'target', 'outcome', 'controller_invariant', 'mount']) test(`new dispatch refuses changed ${change} before queue write`, async t => {
  const f = setup(t), installed = f.install(), options = f.operation(false); f.live.phase = 'candidate'; f.intentFor(options);
  if (change === 'release') f.deps.readReleaseState = async () => ({ ...f.state, release: { ...f.state.release, id: randomUUID() } });
  if (change === 'status') f.state.status = 'released';
  if (change === 'operation') f.state.journal[0].operation = 'rollback';
  if (change === 'since') f.state.journal[0].createdAt = '2020-01-01T00:00:00.000Z';
  if (change === 'target') f.state.journal[0].intent.parameters.targetId = 'foreign';
  if (change === 'outcome') f.state.journal[0].outcome = { state: 'uncertain' };
  if (change === 'controller_invariant') f.live.controllerObserved.runtimeInvariantDigest = fixtureModule.hash('0');
  if (change === 'mount') f.live.mounts = [{ Type: 'bind', Source: '/changed', Destination: '/data', Mode: 'rw', RW: true, Propagation: 'rprivate' }];
  const target = change === 'release' ? f.install() : installed;
  await assert.rejects(target.coolify.deploy(f.m, f.s, options), /dispatch_uncertain/);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

test('inspector receives fixed declarations and only scoped immutable Git readers', async t => {
  const f = setup(t); f.install(); const options = f.inspectorOptions();
  assert.deepEqual(options.targets, [{ targetId: f.target.targetId, composePath: f.target.composePath, repositoryUrl: f.m.repository.url,
    branch: 'main', services: f.target.configuration.services.map(({ name, role, source, expectedState }) => ({ name, role, source, expectedState })) }]);
  await assert.rejects(options.sourceForCommit(f.s.commit, '/other.yml'), /git_scope_invalid/);
  await assert.rejects(options.treeForCommit('HEAD'), /git_scope_invalid/); assert.equal(f.calls.length, 0);
  assert.equal(await options.sourceForCommit(f.s.commit, f.target.composePath), hash('fixed-compose-source'));
  const git = f.calls.find(r => r.binary === 'git'); assert.ok(git.argv.includes('--no-replace-objects'));
  assert.equal(git.environment.GIT_CONFIG_NOSYSTEM, '1'); assert.equal(git.environment.GIT_OPTIONAL_LOCKS, '0');
  assert.ok(git.argv.includes('core.fsmonitor=false')); assert.ok(git.argv.includes('core.hooksPath=NUL') || git.argv.includes('core.hooksPath=/dev/null'));
});

test('permanent application, checkout and protected resources expose no deletion capability', t => {
  const f = setup(t), installed = f.install();
  assert.throws(() => installed.resources.cleanupLocal(), /permanent_repository_deletion_prohibited/);
  assert.throws(() => installed.resources.cleanupCoolifyApplication(), /permanent_application_deletion_prohibited/);
  assert.throws(() => installed.resources.ownedResource(), /disposable_resources_unsupported/);
  assert.equal(f.calls.length, 0);
});

for (const field of ['commit', 'tree', 'schemaDigest', 'configDigest', 'dataDigest', 'healthDigest', 'migrationSchemaVerified', 'images', 'services']) test(`sealed baseline refuses unsupported ${field}`, t => {
  const f = setup(t);
  f.baseline[field] = field === 'migrationSchemaVerified' ? false : ['images', 'services'].includes(field) ? [] : fixtureModule.hash('0');
  f.sealBaseline(); assert.throws(() => f.install(), /baseline_observation_unproven/); assert.equal(f.calls.length, 0);
});

test('sealed source must identify the observed baseline database exactly', t => {
  const f = setup(t); f.settings.source.container = fixtureModule.hash('0');
  assert.throws(() => f.install(), /database_source_binding_changed/); assert.equal(f.calls.length, 0);
});

for (const field of ['image', 'mount', 'container']) test(`database ${field} drift cannot use configured-source fallback`, async t => {
  const f = setup(t), installed = f.install();
  if (field === 'image') f.live.databaseImage = fixtureModule.image('0');
  if (field === 'mount') f.live.databaseMount = fixtureModule.hash('0');
  if (field === 'container') f.live.databaseContainer = fixtureModule.hash('0');
  await assert.rejects(installed.safety(), /database_runtime_changed|database_recreation_unproven/);
  assert.equal(f.calls.some(r => r.kind === 'native' && (r.argv.at(-1) === 'bash -s' || r.argv.at(-1).includes('psql'))), false);
});

test('recreated database is measured only after exact finished queue evidence for every service', async t => {
  const f = setup(t), installed = f.install(), options = f.operation(false);
  f.live.phase = 'candidate'; f.live.databaseContainer = fixtureModule.hash('a'); f.live.queue = f.queueFor(options);
  const result = await installed.coolify.reconcileDeployment(f.m, f.s, options); assert.equal(result.state, 'finished');
  assert.equal(result.composeTargets[0].runtime.services.find(r => r.role === 'database').containerId, f.live.databaseContainer);
  const fingerprint = f.calls.filter(r => r.kind === 'native' && r.argv.at(-1) === 'bash -s'); assert.equal(fingerprint.length, 1);
  assert.ok(fingerprint[0].input.includes(f.live.databaseContainer)); assert.equal(fingerprint[0].input.includes(f.settings.source.container), false);
  assert.equal((await installed.safety()).quiescent, true);
  assert.ok(f.calls.findLast(r => r.kind === 'native' && r.argv.at(-1).includes('psql')).argv.at(-1).includes(f.live.databaseContainer));
});

test('a pending queue cannot attest a replacement database', async t => {
  const f = setup(t), options = f.operation(false); f.intentFor(options); f.live.phase = 'candidate'; f.live.databaseContainer = fixtureModule.hash('a');
  f.live.queue = { ...f.queueFor(options), status: 'in_progress', finishedAt: null }; const installed = f.install();
  await assert.rejects(installed.safety(), /database_recreation_unproven/);
  assert.equal(f.calls.some(r => r.kind === 'native' && r.argv.at(-1) === 'bash -s'), false);
});

test('database identity is observed again after the fingerprint and drift is refused', async t => {
  const f = setup(t), installed = f.install(); f.live.afterFingerprint = () => { f.live.databaseMount = fixtureModule.hash('0'); };
  await assert.rejects(installed.safety(), /database_runtime_changed/);
  assert.equal(f.calls.filter(r => r.kind === 'native' && r.argv.at(-1) === 'bash -s').length, 1);
});

test('created cadence is inert only with exit zero and no health result', async t => {
  const f = setup(t), installed = f.install(); f.live.cadenceState = 'created';
  assert.equal((await installed.safety()).quiescent, true);
  f.live.cadenceExit = 1; await assert.rejects(installed.safety(), /cadence_activity_present/);
  f.live.cadenceExit = 0; f.live.cadenceHealth = 'healthy'; await assert.rejects(installed.safety(), /cadence_activity_present/);
});

for (const field of ['operation', 'commit', 'artifactSetDigest', 'configDigest', 'schemaDigest', 'outcome', 'earlier_unresolved', 'earlier_uncertain']) test(`configuration refuses changed durable intent ${field} before staging`, async t => {
  const f = setup(t), installed = f.install(), last = f.state.journal[0];
  if (field === 'operation') last.operation = 'rollback_config';
  else if (field === 'outcome') last.outcome = { status: 'uncertain' };
  else if (field.startsWith('earlier_')) f.state.journal.unshift({ id: randomUUID(), ...(field === 'earlier_uncertain' ? { outcome: { status: 'uncertain' } } : {}) });
  else last.intent.parameters[field] = fixtureModule.hash('0');
  await assert.rejects(installed.coolify.configureCandidate(f.m, f.s), /configuration_mutation_uncertain/);
  assert.equal(f.calls.some(r => r.method === 'PATCH' || r.kind === 'native' && r.input?.includes('"staged":true')), false);
});

test('dispatch also refuses an earlier unresolved durable intent', async t => {
  const f = setup(t), installed = f.install(), options = f.operation(false); f.live.phase = 'candidate'; f.intentFor(options);
  f.state.journal.unshift({ id: randomUUID(), operation: 'deploy_config', outcome: { status: 'uncertain' } });
  await assert.rejects(installed.coolify.deploy(f.m, f.s, options), /dispatch_uncertain/);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

test('configuration verifies the same unresolved intent again after artifact staging', async t => {
  const f = setup(t), native = f.deps.nativeProcess;
  const installed = f.install({ nativeProcess: async (binary, options) => {
    const result = await native(binary, options);
    if (result === '{"staged":true}') f.state.journal[0].outcome = { status: 'uncertain' };
    return result;
  } });
  await assert.rejects(installed.coolify.configureCandidate(f.m, f.s), /configuration_mutation_uncertain/);
  assert.equal(f.calls.some(r => r.method === 'PATCH'), false);
});

test('health binds baseline/candidate/rollback to the exact SHA and both public surfaces', async t => {
  const f = setup(t), installed = f.install(); await installed.coolify.inspect(f.m, f.s);
  const candidate = f.operation(false); f.live.phase = 'candidate'; f.live.queue = f.queueFor(candidate);
  await installed.coolify.reconcileDeployment(f.m, f.s, candidate);
  const rollback = f.operation(true); f.live.phase = 'rollback'; f.live.queue = f.queueFor(rollback);
  await installed.coolify.reconcileDeployment(f.m, f.s, rollback);
  assert.deepEqual(f.calls.filter(r => r.kind === 'health').map(r => r.expectedCommit), [f.s.baseCommit, f.s.commit, f.s.baseCommit]);
  for (const row of f.calls.filter(r => r.kind === 'health')) { assert.equal(row.publicUrl, f.m.deployment.url); assert.equal(row.health.requireReleaseReadiness, true); }
  f.live.versionVerified = false;
  await assert.rejects(installed.coolify.health(f.m, f.s, { rollback: true }), /version_health_unproven/);
});

for (const recreated of [false, true]) test(`installed ${recreated ? 'recreated' : 'baseline'} DB starting settles before any fingerprint`, async t => {
  const f = setup(t), options = f.operation(false), installed = f.install(), started = f.clock.now;
  f.live.phase = 'candidate'; f.live.queue = f.queueFor(options); f.live.databaseHealth = 'starting'; f.live.appHealth = 'starting';
  if (recreated) f.live.databaseContainer = fixtureModule.hash('a');
  f.live.afterSleep = () => {
    assert.equal(f.calls.some(r => r.kind === 'health' || r.kind === 'native' && r.argv.at(-1) === 'bash -s'), false);
    if (f.clock.now - started >= 2000) { f.live.databaseHealth = 'healthy'; f.live.appHealth = 'healthy'; }
  };
  const result = await installed.coolify.reconcileDeployment(f.m, f.s, options);
  assert.equal(result.state, 'finished'); assert.equal(result.healthy, true); assert.equal(f.clock.now - started, 2000);
  assert.equal(f.calls.filter(r => r.kind === 'native' && r.argv.at(-1) === 'bash -s').length, 1);
  assert.equal(f.calls.filter(r => r.kind === 'health').length, 1);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

test('installed DB still starting after 60 seconds leaves pending identity without data evidence or redispatch', async t => {
  const f = setup(t), options = f.operation(false), installed = f.install(), started = f.clock.now;
  f.live.phase = 'candidate'; f.live.queue = f.queueFor(options); f.live.databaseContainer = fixtureModule.hash('a'); f.live.databaseHealth = 'starting';
  const result = await installed.coolify.reconcileDeployment(f.m, f.s, options);
  assert.equal(result.state, 'uncertain'); assert.equal(result.settling, true); assert.equal(f.clock.now - started, 60000);
  assert.equal(result.dataDigest, undefined); assert.equal(result.healthDigest, undefined); assert.equal(result.healthy, undefined);
  assert.equal(f.calls.some(r => r.kind === 'health' || r.kind === 'native' && r.argv.at(-1) === 'bash -s'), false);
  assert.equal(f.calls.some(r => r.kind === 'queue' && r.payload.operation === 'dispatch'), false);
});

test('installed starting cannot hide wrong DB mount or unfinished migration', async t => {
  for (const failure of ['mount', 'migration']) {
    const f = setup(t), options = f.operation(false), installed = f.install(); f.live.phase = 'candidate'; f.live.queue = f.queueFor(options);
    f.live.databaseHealth = 'starting';
    if (failure === 'mount') f.live.databaseMount = fixtureModule.hash('0');
    else f.live.migrationExit = 1;
    await assert.rejects(installed.coolify.reconcileDeployment(f.m, f.s, options), /runtime_identity_unproven/);
    assert.equal(f.calls.some(r => r.kind === 'health' || r.kind === 'native' && r.argv.at(-1) === 'bash -s'), false);
  }
});
