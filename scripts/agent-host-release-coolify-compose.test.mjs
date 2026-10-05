import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fixtureModule from './fixtures/release-compose-contract.cjs';
import { createCoolifyComposeAdapter } from './lib/agent-host-release-coolify-compose.mjs';
import {releaseEffectDiagnostic} from './lib/agent-host-release-broker.mjs';
import contract from './lib/agent-host-release-contract.cjs';
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

function configAbsence(f){f.o.since='2026-10-04T12:01:00.000Z';const e=f.recoveryEvidence(f.s,f.o,'queue_absent'),r=e.composeRecovery;delete e.composeRecovery;
 return {...e,configDigest:f.m.baseline.configDigest,composeConfigAbsence:{schemaVersion:'roost-compose-config-absence-v1',releaseId:f.s.releaseId,operationId:f.o.operationId,since:f.o.since,
 targetId:f.target.targetId,requestedCommit:f.s.commit,requestedTree:f.s.candidateTree,configuration:structuredClone(f.target.baseline.configuration),baselineCommit:f.s.baseCommit,baselineTree:f.s.baseTree,
 migrationSchemaVerified:true,controlPlaneQuiescent:true,noCandidateQueue:true,baselineServices:r.baselineServices,services:r.services}};}
test('configuration absence requires complete qualified legacy proof instead of unchanged pin alone',async()=>{const f=setup(),e=configAbsence(f);f.gateway.inspectConfiguration=async()=>f.target.baseline.configuration;
 f.gateway.inspectConfigurationAbsence=async()=>{f.calls.push('absence_read');return e;};const r=await f.adapter.reconcileConfiguration(f.m,f.s,f.o);
 assert.equal(r.state,'absent');assert.equal(r.evidence,e);assert.deepEqual(f.calls,['absence_read']);assert.equal(contract.composeConfigAbsenceEvidenceError({...f.s,manifest:f.m},e,{id:f.o.operationId,createdAt:f.o.since,operation:'deploy_config'}),null);});
for(const key of ['absenceVerified','healthy','configDigest'])test(`adapter refuses malformed config absence ${key}`,async()=>{const f=setup(),e=configAbsence(f);f.gateway.inspectConfiguration=async()=>f.target.baseline.configuration;
 e[key]=key==='configDigest'?'0'.repeat(64):false;f.gateway.inspectConfigurationAbsence=async()=>e;await assert.rejects(f.adapter.reconcileConfiguration(f.m,f.s,f.o),/configuration_absence_unproven/);assert.equal(f.calls.includes('configure'),false);});
test('absence collector cannot be used for rollback configuration',async()=>{const f=setup();f.gateway.inspectConfiguration=async()=>f.target.baseline.configuration;f.gateway.inspectConfigurationAbsence=async()=>{throw Error('must_not_collect');};assert.equal((await f.adapter.reconcileConfiguration(f.m,f.s,{...f.o,rollback:true})).state,'uncertain');});
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

for(const rollback of[false,true])test('configuration mutation preserves bounded native cause for safe broker diagnostic ('+rollback+')',async()=>{const f=setup(),leaf=Error('release_child_native_exit_failed'),ssh=Error('release_compose_installation_ssh_unavailable',{cause:leaf}),original=Error('release_compose_installation_response_unproven',{cause:ssh});let effects=0;f.gateway.configure=async()=>{effects++;throw original;};await assert.rejects(f.adapter[rollback?'configureRollback':'configureCandidate'](f.m,f.s),e=>{assert.equal(e.cause,original);assert.equal(e.message,'release_coolify_compose_configuration_mutation_uncertain');assert.equal(e.uncertain,true);assert.equal(e.retryable,false);assert.equal(releaseEffectDiagnostic(e),'release_child_native_exit_failed');return true;});assert.equal(effects,1);});
for(const code of[401,403,422,500])test('configuration mutation forwards only fixed Coolify HTTP diagnostic '+code,async()=>{const f=setup(),original=Object.assign(Error('release_coolify_response_unproven'),{httpStatus:code});f.gateway.configure=async()=>{throw original;};await assert.rejects(f.adapter.configureCandidate(f.m,f.s),e=>{assert.equal(e.cause,original);assert.equal(e.transportDiagnostic,'response_unproven_http_'+code);assert.equal(releaseEffectDiagnostic(e),e.transportDiagnostic);return true;});});
test('nested fixed transport diagnostic survives configure without logging native error body',async()=>{const f=setup(),leaf=Object.assign(Error('arbitrary sensitive underlying detail'),{transportDiagnostic:'response_invalid_http_502'});f.gateway.configure=async()=>{throw Error('opaque native wrapper',{cause:leaf});};await assert.rejects(f.adapter.configureCandidate(f.m,f.s),e=>{assert.equal(e.transportDiagnostic,'response_invalid_http_502');assert.equal(releaseEffectDiagnostic(e),'response_invalid_http_502');assert.ok(!JSON.stringify(e).includes('sensitive'));assert.ok(!e.message.includes('sensitive'));return true;});});
for(const value of['token-value-sensitive','response_unproven_http_700','response_invalid_http_422 token-sensitive'])test('unrecognized transport strings remain private cause only: '+value.split(' ')[0],async()=>{const f=setup(),original=Object.assign(Error('raw sensitive message'),{transportDiagnostic:value});f.gateway.configure=async()=>{throw original;};await assert.rejects(f.adapter.configureCandidate(f.m,f.s),e=>{assert.equal(e.transportDiagnostic,undefined);assert.equal(e.cause,original);assert.equal(releaseEffectDiagnostic(e),'release_coolify_compose_configuration_mutation_uncertain');assert.ok(!JSON.stringify(e).includes('sensitive'));return true;});});
test('configuration readback failure retains uncertainty and fixed diagnostic without a repeated mutation',async()=>{const f=setup();let effects=0;f.gateway.configure=async()=>{effects++;};f.gateway.inspectConfiguration=async()=>({...f.target.configuration,gitCommit:f.s.baseCommit});await assert.rejects(f.adapter.configureCandidate(f.m,f.s),e=>e.uncertain===true&&e.cause.message==='release_coolify_compose_configuration_result_unproven');assert.equal(effects,1);});
test('dispatch preserves native cause and never retries transport failure',async()=>{const f=setup(),original=Error('release_child_ssh_connection_closed');let effects=0;f.gateway.deployTarget=async()=>{effects++;throw original;};await assert.rejects(f.adapter.deploy(f.m,f.s,f.o),e=>e.uncertain===true&&e.cause===original&&releaseEffectDiagnostic(e)==='release_child_ssh_connection_closed');assert.equal(effects,1);});

test('non-Error thrown values retain cause without breaking finite diagnostic handling',async()=>{for(const original of['sensitive arbitrary text',{message:42},null]){const f=setup();f.gateway.configure=async()=>{throw original;};await assert.rejects(f.adapter.configureCandidate(f.m,f.s),e=>e.uncertain===true&&e.cause===original&&e.transportDiagnostic===undefined&&releaseEffectDiagnostic(e)==='release_coolify_compose_configuration_mutation_uncertain');}});
