import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import {composeConfigurationDigest} from './lib/agent-host-release-compose-state.mjs';
import {fixture as composeFixture,hash,image} from './fixtures/release-compose-contract.cjs';
import {runReleaseStep} from './lib/agent-host-release-broker.mjs';
import {createActivityReleaseAdapter,installedActivitySettingsSchema,activityControllerDigest,
 activityFixturePublicValues,deriveActivitySessionToken} from './lib/agent-host-release-activity-adapter.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>JSON.stringify(Array.isArray(v)?v.map(v=>JSON.parse(canonical(v))):v&&typeof v==='object'?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])):v);
const instant=(delta=0)=>new Date(Date.now()+delta).toISOString();
function fixture(){
 const f=composeFixture(),calls=[];
 for(const config of [f.target.configuration,f.target.baseline.configuration,f.target.rollbackConfiguration]){
  config.services.find(r=>r.name==='maintenance').name='maintenance_cadence';
  config.services.push({...structuredClone(config.services.find(r=>r.role==='cadence')),name:'proactive_cadence',mountDigest:hash('5')});
 }
 f.target.baseline.images.find(r=>r.name==='maintenance').name='maintenance_cadence';
 f.target.baseline.images.push({name:'proactive_cadence',imageDigest:image('4')});
 f.target.configDigest=composeConfigurationDigest(f.target.configuration);
 f.target.baseline.configDigest=composeConfigurationDigest(f.target.baseline.configuration);
 f.target.rollbackConfigDigest=composeConfigurationDigest(f.target.rollbackConfiguration);
 for(const [key,digest] of [['deployment',f.target.configDigest],['baseline',f.target.baseline.configDigest],['rollback',f.target.rollbackConfigDigest]])
  f.m[key].configDigest=contract.releaseDigest([{targetId:f.target.targetId,configDigest:digest}]);
 f.m.deployment.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s);
 f.m.baseline.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s,'baseline');
 f.m.rollback.artifactSetDigest=contract.sourceArtifactDigest(f.m,f.s,true);
 f.m.cleanup.protectedResourceIds=[...new Set([f.target.targetId,...f.target.baseline.images.map(r=>r.imageDigest),
  ...f.target.configuration.services.map(r=>r.mountDigest),image('e')])];
 const settings={seedCredentialTarget:'Roost/fixture/seed',policy:{file:'C:\\Private\\policy.json',sha256:hash('a')},
  controller:{sha256:hash('b')},runtimeController:{sha256:hash('0')},ui:{sha256:hash('c')},runtimeSettings:{file:'C:\\Private\\runtime.json',sha256:hash('e')}};
 const fixtureId=randomUUID(),summary=`Roost controlled activity fixture ${fixtureId}`;
 const fixtureScope={fixtureId,userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),
  memoryId:-Number(1n+BigInt('0x'+fixtureId.replaceAll('-',''))%2000000000n),
  summaryDigest:sha(summary),markerDigest:sha(canonical({fixtureId,email:`roost-fixture-${fixtureId}@example.invalid`,
   displayName:`Roost controlled fixture ${fixtureId}`,ownership:'roost-activity-fixture-v1'}))};
 const p={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,
  controllerDigest:activityControllerDigest(settings),fixture:fixtureScope,baselineSequenceDigest:hash('6'),budget:{providerRequests:0,externalActions:0},
  runtimeResume:{approved:true,databaseSettingsDigest:hash('4'),ingressSettingsDigest:hash('5'),observationSeconds:1,
   cadences:['maintenance_cadence','proactive_cadence'].map((name,i)=>({name,behavior:'restore_existing_loop',behaviorDigest:hash(String(i+2))}))}};
 f.m.postObservation=p;assert.equal(contract.manifestSchema.safeParse(f.m).success,true);
 const s={...f.s,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
  releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('1'),
  releaserRevision:instant(),expiresAt:instant(60000),manifestDigest:contract.releaseDigest(f.m)};
 const state={release:{id:randomUUID(),snapshot:s,manifestDigest:s.manifestDigest},journal:[],status:'active'};
 const binding={releaseId:state.release.id,...s};
 const observed={...f.evidence(),observedAt:instant(-10000)};
 const done=(operation,evidence,parameters={})=>({id:randomUUID(),operation,createdAt:instant(-15000),intent:{parameters},
  outcome:{requestId:randomUUID(),status:'succeeded',observationOnly:operation==='observe',evidence}});
 state.journal.push(done('deploy',observed),done('observe',observed,{mode:'candidate'}));
 const pending=operation=>{const row={id:randomUUID(),operation,createdAt:instant(-5000),intent:{parameters:{postObservationDigest:contract.releaseDigest(p)}},outcome:null};
  state.journal.push(row);return row;};
 const native={state:'absent',readOnly:true,held:true,other:0,ingress:true};
 const rows=()=>structuredClone(observed.composeTargets[0].runtime.services);
 const seal={validated:true,policyDigest:settings.policy.sha256,runtimeSettingsDigest:settings.runtimeSettings.sha256,
  sourceDigests:{controller:settings.controller.sha256,runtimeController:settings.runtimeController.sha256,ui:settings.ui.sha256},
  policy:{schemaVersion:'roost-activity-installed-policy-v1',postObservationDigest:contract.releaseDigest(p),fixtureDigest:contract.releaseDigest(p.fixture),
   targetId:f.target.targetId,applicationId:s.applicationId,createdAt:instant(-30000),expiresAt:instant(60000),catalogDigest:hash('7'),controllerProgramDigest:hash('8')},
  runtimeSettings:{schemaVersion:'roost-activity-runtime-settings-v1',targetId:f.target.targetId,frontendMetaName:'fixture-revision',...p.runtimeResume}};
 delete seal.runtimeSettings.approved;delete seal.runtimeSettings.observationSeconds;
 const supplemental=()=>({nonOwnedDigest:f.m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,catalogDigest:seal.policy.catalogDigest,
  fullDataDigest:native.state==='absent'?f.m.baseline.dataDigest:hash('9')});
 const transport={
  validateScope:async()=>{calls.push('scope');return structuredClone(seal);},
  readRuntime:async({commit,tree})=>{calls.push('runtime');return {observedAt:instant(),targetId:f.target.targetId,commit,tree,backendCommit:commit,frontendCommit:commit,
   healthy:true,services:rows(),databaseReadOnly:native.readOnly,activeOtherSessions:native.other,ingressBlocked:native.ingress,cadencesHeld:native.held};},
  fullFingerprint:async()=>{calls.push('fingerprint');return {schemaDigest:f.m.baseline.schemaDigest,dataDigest:supplemental().fullDataDigest};},
  sequenceRead:async()=>{calls.push('sequence');return {sequenceDigest:p.baselineSequenceDigest};},
  fixture:async(operation,{policy,seed})=>{calls.push(operation);assert.equal(seed,hash('f'));assert.equal(policy.fixtureId,p.fixture.fixtureId);
   let effect=false;
   if(operation==='smoke_prepare_empty'){assert.equal(native.state,'absent');native.state='empty';effect=true;}
   if(operation==='smoke_populate'){assert.equal(native.state,'empty');native.state='populated';effect=true;}
   if(operation==='fixture_cleanup'){native.state='absent';effect=true;}
   const data=supplemental(),observations=rows().sort((a,b)=>a.name.localeCompare(b.name)).map(r=>({...policy.expectedRuntime.find(e=>e.name===r.name),
    status:r.state==='paused'?'running':r.state,paused:r.state==='paused',health:r.health}));
   return {schemaVersion:'roost-activity-fixture-observation-v1',operation,releaseId:binding.releaseId,operationId:policy.operationId,manifestDigest:s.manifestDigest,
    targetId:f.target.targetId,commit:policy.commit,tree:policy.tree,fixtureId:p.fixture.fixtureId,controllerProgramDigest:policy.controllerProgramDigest,
    runtimeDigest:sha(canonical(observations)),observedAt:instant(),expectedTreeBoundByParentObservation:true,providerCalls:0,cadenceStarted:false,fenceChanged:false,
    nativeJobQualified:false,ownedDatabaseSessionsClosed:true,observed:policy.baseline===null?
     {phase:'needs_baseline_seal',state:'absent',observed:data,effect:false,nativeJobQualified:false,releaseSchemaVerified:false}:
     {phase:'observed',state:native.state,effect,nonOwnedUnchanged:true,sequenceUnchanged:true,catalogUnchanged:true,fullDataParity:native.state==='absent',
      before:data,after:data,nativeJobQualified:false,releaseSchemaVerified:false,memoryId:p.fixture.memoryId,markerDigest:p.fixture.markerDigest,summaryDigest:p.fixture.summaryDigest}};
  },
  holdIngressAndOpenFixtureWindow:async()=>{calls.push('window');native.ingress=true;native.readOnly=false;return {ingressBlocked:true,cadencesHeld:true,databaseReadOnly:false,activeOtherSessions:0};},
  refenceFixtureWindow:async()=>{calls.push('refence');native.readOnly=true;return {ingressBlocked:true,cadencesHeld:true,databaseReadOnly:true,activeOtherSessions:0};},
  browse:async({phase,token})=>{calls.push('browse_'+phase);assert.equal(token,deriveActivitySessionToken(p.fixture,hash('f')));
   return {phase,activityCount:phase==='empty'?0:1,backendCommit:s.commit,frontendCommit:s.commit,renderedEventId:phase==='empty'?null:p.fixture.eventId,
    renderedSummaryDigest:phase==='empty'?null:p.fixture.summaryDigest,renderDigest:hash(phase==='empty'?'1':'2'),negativePathStatus:401,providerRequests:0,externalActions:0};},
  restoreRuntimeAndObserve:async()=>{calls.push('restore');return {backendCommit:s.commit,frontendCommit:s.commit,schemaDigest:f.m.baseline.schemaDigest,
   healthy:true,fixtureAbsent:true,databaseSettingsDigest:p.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:p.runtimeResume.ingressSettingsDigest,
   observationSeconds:1,services:rows().map(r=>r.role==='cadence'?{...r,state:'running'}:r),cadences:structuredClone(p.runtimeResume.cadences),
   startedAt:instant(-2000),observedAt:instant(),cadenceEvidence:p.runtimeResume.cadences.map(r=>({name:r.name,behaviorDigest:r.behaviorDigest,completedTicks:1,
    executionState:'executed',behaviorVerified:true,summaryDigest:hash('6'),observedAt:instant(-1000)}))};},
  assertClosed:async()=>{calls.push('closed');return {nativeChildrenClosed:true};}
 };
 const adapter=()=>createActivityReleaseAdapter({manifest:f.m,binding,settings,seed:hash('f'),readState:async()=>structuredClone(state),transport});
 const invoke=async(operation,reconcile=false)=>{const row=state.journal.at(-1);return adapter()[reconcile?'reconcilePostObservation':'postObservation'](f.m,binding,{operation,operationId:row.id,state});};
 const save=out=>{state.journal.at(-1).outcome={...out,requestId:randomUUID(),observationOnly:false,evidence:{...out.evidence,observedAt:instant()}};};
 return {...f,s,p,settings,state,binding,seal,native,calls,transport,adapter,pending,invoke,save,rows};
}

test('actual callback composition produces typed smoke, exact cleanup and observed cadence resume',async()=>{
 const f=fixture();
 for(const operation of ['smoke','fixture_cleanup','runtime_resume']){
  f.pending(operation);const out=await f.invoke(operation);
  assert.equal(out.status,'succeeded');assert.equal(out.evidence.postObservation.kind,operation);
  assert.equal(contract.postObservationOutcomeError(f.binding,f.state.journal.at(-1),{...out,requestId:randomUUID(),observationOnly:false,
   evidence:{...out.evidence,observedAt:instant()}},f.state.journal),null);f.save(out);
 }
 assert.equal(f.native.state,'absent');assert.equal(f.native.readOnly,true);
 assert.deepEqual(f.calls.filter(c=>['window','smoke_prepare_empty','browse_empty','smoke_populate','browse_populated','fixture_cleanup','refence','restore'].includes(c)),
  ['window','smoke_prepare_empty','browse_empty','smoke_populate','browse_populated','fixture_cleanup','refence','restore']);
 assert(!JSON.stringify(f.state).includes(deriveActivitySessionToken(f.p.fixture,hash('f'))));
});

test('session token is domain-bound ephemeral HMAC, markers and negative PK exact',()=>{
 const f=fixture(),v=activityFixturePublicValues(f.p.fixture);
 assert.equal(v.summaryDigest,f.p.fixture.summaryDigest);assert.equal(v.memoryId,f.p.fixture.memoryId);
 const expected='aion_sess_'+createHmac('sha256',Buffer.from(hash('f'),'hex'))
  .update(`roost-activity-fixture-v1/session/${f.p.fixture.fixtureId}/${f.p.fixture.sessionId}`).digest('base64url');
 assert.equal(deriveActivitySessionToken(f.p.fixture,hash('f')),expected);
 assert.notEqual(deriveActivitySessionToken({...f.p.fixture,sessionId:randomUUID()},hash('f')),expected);
 assert.throws(()=>deriveActivitySessionToken(f.p.fixture,'short'),/ephemeral_seed/);
 assert.throws(()=>activityFixturePublicValues({...f.p.fixture,memoryId:f.p.fixture.memoryId-1}),/fixture_marker_changed/);
 assert.throws(()=>activityFixturePublicValues({...f.p.fixture,summaryDigest:hash('0')}),/fixture_marker_changed/);
});

test('installation schema denies commands, arbitrary selectors and traversal',()=>{
 const f=fixture();for(const patch of [{module:'attacker'}, {fixtureScript:'x'},{seedCredentialTarget:'Other/seed'},
  {policy:{file:'C:\\Private\\..\\x',sha256:hash('a')}},{controller:{sha256:hash('b'),command:'x'}}])
  assert.equal(installedActivitySettingsSchema.safeParse({...f.settings,...patch}).success,false);
 f.transport.selectController=()=>{};assert.throws(f.adapter,/fixed_transport_required/);
});

for(const [name,change] of [
 ['changed installation policy',f=>f.seal.policyDigest=hash('0')],
 ['changed fixed controller',f=>f.seal.sourceDigests.controller=hash('0')],
 ['changed runtime controller',f=>f.seal.sourceDigests.runtimeController=hash('a')],
 ['changed UI source',f=>f.seal.sourceDigests.ui=hash('0')],
 ['changed restoration scope',f=>f.seal.runtimeSettings.databaseSettingsDigest=hash('0')],
 ['wrong application owner scope',f=>f.seal.policy.applicationId=randomUUID()],
 ['wrong runtime target',f=>{const old=f.transport.readRuntime;f.transport.readRuntime=async o=>({...await old(o),targetId:'other'});}],
 ['changed live image',f=>{const old=f.transport.readRuntime;f.transport.readRuntime=async o=>{const r=await old(o);r.services[0].imageDigest=image('0');return r;};}],
 ['changed live mount',f=>{const old=f.transport.readRuntime;f.transport.readRuntime=async o=>{const r=await old(o);r.services[3].mountDigest=hash('0');return r;};}],
 ['extra live service',f=>{const old=f.transport.readRuntime;f.transport.readRuntime=async o=>{const r=await old(o);r.services.push(r.services[0]);return r;};}],
 ['future live observation',f=>{const old=f.transport.readRuntime;f.transport.readRuntime=async o=>({...await old(o),observedAt:instant(120000)});}],
 ['foreign database session',f=>f.native.other=1],
 ['missing held cadences',f=>f.native.held=false],
 ['expired fixture scope',f=>{f.seal.policy.createdAt=instant(-60000);f.seal.policy.expiresAt=instant(-1000);}],
 ['changed release snapshot',f=>f.state.release.snapshot.baseCommit='e'.repeat(40)],
 ['earlier unresolved intent',f=>f.state.journal[0].outcome=null],
 ['missing qualified queue',f=>f.state.journal[0].outcome.evidence.deploymentIds=[]],
 ['wrong pending scope',f=>f.state.journal.at(-1).intent.parameters.postObservationDigest=hash('0')],
 ['expired release authority',f=>f.state.effectiveExpiresAt=instant(-1000)],
 ['wrong full schema',f=>f.transport.fullFingerprint=async()=>({schemaDigest:hash('0'),dataDigest:f.m.baseline.dataDigest})],
 ['wrong sequence',f=>f.transport.sequenceRead=async()=>({sequenceDigest:hash('0')})]
])test(`refuses ${name} before opening a fixture write window`,async()=>{
 const f=fixture();f.pending('smoke');change(f);await assert.rejects(f.invoke('smoke'),/precondition_unproven/);
 assert(!f.calls.includes('window'));assert.equal(f.native.state,'absent');
});

for(const [name,change] of [
 ['foreign fixture UUID',r=>r.fixtureId=randomUUID()],
 ['wrong operation receipt',r=>r.operationId=randomUUID()],
 ['unbound observed runtime',r=>r.runtimeDigest=hash('0')],
 ['unowned data drift',r=>{if(r.observed.phase==='observed')r.observed.after.nonOwnedDigest=hash('0');else r.observed.observed.nonOwnedDigest=hash('0');}],
 ['baseline-null data drift',r=>{if(r.observed.phase==='needs_baseline_seal')r.observed.observed.nonOwnedDigest=hash('0');}],
 ['invented native qualification',r=>r.nativeJobQualified=true]
])test(`rejects fixture callback ${name}`,async()=>{
 const f=fixture();f.pending('smoke');const old=f.transport.fixture;
 f.transport.fixture=async(...a)=>{const r=await old(...a);change(r);return r;};
 await assert.rejects(f.invoke('smoke'),/precondition_unproven/);assert(!f.calls.includes('window'));
});

test('reordered complete service set remains exact and accepted',async()=>{
 const f=fixture();f.pending('smoke');const old=f.transport.readRuntime;
 f.transport.readRuntime=async o=>{const r=await old(o);r.services.reverse();return r;};
 assert.equal((await f.invoke('smoke')).status,'succeeded');
});

test('lost browser result preserves owned partial fixture and readonly reconciliation never browses or replays writes',async()=>{
 const f=fixture();f.pending('smoke');f.transport.browse=async()=>{f.calls.push('browse_failed');throw Error('sensitive token should not propagate');};
 await assert.rejects(f.invoke('smoke'),e=>e.uncertain===true&&e.retryable===false&&e.message==='release_activity_effect_uncertain');
 assert.equal(f.native.state,'empty');f.state.journal.at(-1).outcome={status:'uncertain'};f.calls.length=0;
 const reconciled=await f.invoke('smoke',true);assert.equal(reconciled.status,'failed');
 assert.equal(reconciled.evidence.postObservation.ownedEffects,'present');
 assert(f.calls.every(c=>['scope','runtime','reconcile','fingerprint','sequence','closed'].includes(c)));
 assert.equal(f.native.state,'empty');f.save(reconciled);f.pending('fixture_cleanup');
 assert.equal((await f.invoke('fixture_cleanup')).status,'succeeded');assert.equal(f.native.state,'absent');
});

test('lost empty-state response cannot be relabeled successful UI smoke from fixture absence',async()=>{
 const f=fixture();f.pending('smoke');f.state.journal.at(-1).outcome={status:'uncertain'};
 const out=await f.invoke('smoke',true);assert.equal(out.status,'failed');assert.equal(out.evidence.postObservation.ownedEffects,'absent');
 assert(!f.calls.some(c=>c.startsWith('browse')||['window','refence','restore'].includes(c)));
});

test('cleanup uncertainty can settle only factual absent rows, full parity and a reread database fence',async()=>{
 const f=fixture();f.pending('smoke');f.save(await f.invoke('smoke'));f.pending('fixture_cleanup');
 const cleanup=await f.invoke('fixture_cleanup');assert.equal(cleanup.status,'succeeded');
 f.state.journal.at(-1).outcome={status:'uncertain'};f.calls.length=0;
 assert.equal((await f.invoke('fixture_cleanup',true)).status,'succeeded');
 assert(f.calls.every(c=>['scope','runtime','reconcile','fingerprint','sequence','closed'].includes(c)));
 f.native.readOnly=false;assert.equal((await f.invoke('fixture_cleanup',true)).status,'failed');
});

test('cleanup failure after exact deletion remains uncertain until refence, never claims absent as complete',async()=>{
 const f=fixture();f.pending('smoke');f.save(await f.invoke('smoke'));f.pending('fixture_cleanup');
 f.transport.refenceFixtureWindow=async()=>{f.calls.push('refence_failed');throw Error('transport lost');};
 await assert.rejects(f.invoke('fixture_cleanup'),e=>e.uncertain===true);assert.equal(f.native.state,'absent');
 assert.equal(f.native.readOnly,false);f.state.journal.at(-1).outcome={status:'uncertain'};
 assert.equal((await f.invoke('fixture_cleanup',true)).status,'failed');
});

test('runtime resume requires completed behavior ticks; uncertain resume neither restores twice nor invents observation',async()=>{
 const f=fixture();for(const op of ['smoke','fixture_cleanup']){f.pending(op);f.save(await f.invoke(op));}f.pending('runtime_resume');
 const old=f.transport.restoreRuntimeAndObserve;f.transport.restoreRuntimeAndObserve=async(...a)=>{const r=await old(...a);r.cadenceEvidence[0].completedTicks=0;return r;};
 await assert.rejects(f.invoke('runtime_resume'),e=>e.uncertain===true);f.state.journal.at(-1).outcome={status:'uncertain'};f.calls.length=0;
 const out=await f.invoke('runtime_resume',true);assert.equal(out.status,'failed');assert.equal(out.evidence.postObservation.ownedEffects,'unproven');
 assert.deepEqual(f.calls,['scope','runtime','closed']);
});

test('cannot skip cleanup or replay an already settled smoke',async()=>{
 const f=fixture();f.pending('smoke');f.save(await f.invoke('smoke'));f.pending('runtime_resume');
 await assert.rejects(f.invoke('runtime_resume'),/precondition_unproven/);assert(!f.calls.includes('restore'));
 f.state.journal.pop();await assert.rejects(f.invoke('smoke'),/precondition_unproven/);
});

for(const [name,mutate] of [
 ['foreign image',r=>r.services[0].imageDigest=image('0')],
 ['foreign mount',r=>r.services[0].mountDigest=hash('0')],
 ['foreign backend commit',r=>r.backendCommit='e'.repeat(40)],
 ['duplicate tick behavior',r=>r.cadenceEvidence[1]=r.cadenceEvidence[0]],
 ['wrong tick behavior',r=>r.cadenceEvidence[0].behaviorDigest=hash('0')],
 ['future native observation',r=>r.observedAt=instant(60000)],
 ['short native observation',r=>r.startedAt=instant()],
 ['changed restoration ingress',r=>r.ingressSettingsDigest=hash('0')]
])test(`resume refuses ${name} after effect as uncertainty`,async()=>{
 const f=fixture();for(const op of ['smoke','fixture_cleanup']){f.pending(op);f.save(await f.invoke(op));}f.pending('runtime_resume');
 const old=f.transport.restoreRuntimeAndObserve;f.transport.restoreRuntimeAndObserve=async(...a)=>{const r=await old(...a);mutate(r);return r;};
 await assert.rejects(f.invoke('runtime_resume'),e=>e.uncertain===true&&e.message==='release_activity_effect_uncertain');
});

test('native child closure is required even after successful browser evidence',async()=>{
 const f=fixture();f.pending('smoke');f.transport.assertClosed=async()=>({nativeChildrenClosed:false});
 await assert.rejects(f.invoke('smoke'),e=>e.uncertain===true);assert.equal(f.native.state,'populated');
});

test('broker uses exact durable operation with the installed adapter composition',async()=>{
 const f=fixture();
 const done=operation=>({id:randomUUID(),operation,createdAt:instant(-20000),intent:{parameters:{}},
  outcome:{requestId:randomUUID(),status:'succeeded',observationOnly:false,evidence:{}}});
 f.state.journal.unshift(...['push','pr','review','merge','deploy_config'].map(done));
 f.state.journal.find(j=>j.operation==='deploy').intent.parameters.targetId=f.target.targetId;
 f.state.expectedVersion=hash('2');
 // Server-only readiness metadata is not part of the immutable release grant.
 f.state.release.snapshot.readinessDigest=hash('a');f.state.release.snapshot.configurationDigest=hash('b');
 const adapter=f.adapter();
 const api=async(route,{body})=>{
  if(route.endsWith('/operations')){const op={id:randomUUID(),operation:body.operation,intent:body,createdAt:instant(-5000),outcome:null};
   f.state.journal.push(op);return {...f.state,operation:op,replayed:false};}
  const op=f.state.journal.find(j=>route.includes(j.id));
  assert.equal(contract.postObservationOutcomeError(f.binding,op,body,f.state.journal),null);op.outcome=body;return f.state;
 };
 await runReleaseStep({state:f.state,client:{hostId:f.s.hostId,agentId:f.s.releaserAgentId},api,
  assertWriter:async()=>{},onChildrenClosed:async()=>{},inspectCheckout:async()=>({commit:f.s.commit,tree:f.s.candidateTree}),
  github:{inspect:async()=>({remoteBase:f.s.commit,remoteTree:f.s.candidateTree})},coolify:{},resources:adapter});
 const op=f.state.journal.at(-1);assert.equal(op.operation,'smoke');assert.equal(op.outcome.status,'succeeded');
 assert.equal(op.outcome.evidence.postObservation.kind,'smoke');assert.equal(f.native.state,'populated');
});

test('qualified rollback resumes the exact retained baseline without fabricating candidate smoke',async()=>{
 const f=fixture(),base={...f.evidence(true),observedAt:instant(-10000)};
 Object.assign(f.state.journal[1].outcome.evidence,base);
 f.state.journal[0].operation='rollback';f.state.journal[1].intent.parameters.mode='rollback';
 f.pending('runtime_resume');const old=f.transport.restoreRuntimeAndObserve;
 f.transport.restoreRuntimeAndObserve=async(...a)=>({...await old(...a),backendCommit:f.s.baseCommit,frontendCommit:f.s.baseCommit});
 const out=await f.invoke('runtime_resume');assert.equal(out.status,'succeeded');
 assert.equal(out.evidence.postObservation.commit,f.s.baseCommit);assert.equal(out.evidence.postObservation.tree,f.s.baseTree);
 assert(!f.calls.some(c=>c.startsWith('browse')||c.startsWith('smoke_')));
});

for(const [name,change] of [
 ['wrong frontend SHA',r=>r.frontendCommit='e'.repeat(40)],
 ['wrong synthetic event',r=>{if(r.phase==='populated')r.renderedEventId=randomUUID();}],
 ['wrong rendered summary',r=>{if(r.phase==='populated')r.renderedSummaryDigest=hash('0');}],
 ['invented populated count',r=>{if(r.phase==='empty')r.activityCount=1;}],
 ['provider effect',r=>r.providerRequests=1]
])test(`actual browser callback refuses ${name} without hiding partial owned rows`,async()=>{
 const f=fixture();f.pending('smoke');const old=f.transport.browse;
 f.transport.browse=async(...a)=>{const r=await old(...a);change(r);return r;};
 await assert.rejects(f.invoke('smoke'),e=>e.uncertain===true);
 assert.notEqual(f.native.state,'absent');assert(!f.calls.includes('fixture_cleanup'));
});

test('readonly reconciliation sanitizes private transport errors and does not report absence',async()=>{
 const f=fixture();f.pending('smoke');f.state.journal.at(-1).outcome={status:'uncertain'};
 f.transport.fixture=async()=>{throw Error('private connection token must remain private');};
 await assert.rejects(f.invoke('smoke',true),e=>e.uncertain===true&&e.message==='release_activity_reconciliation_unproven'&&e.cause===undefined);
 assert(!f.calls.includes('window'));assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');
 assert.equal(f.calls.at(-1),'closed');
});

test('smoke holds initially public ingress before the first owned fixture write',async()=>{
 const f=fixture();f.native.ingress=false;f.pending('smoke');const outcome=await f.invoke('smoke');
 assert.equal(outcome.status,'succeeded');assert.equal(f.native.ingress,true);
 assert(f.calls.indexOf('window')<f.calls.indexOf('smoke_prepare_empty'));
});

test('unproved ingress after the window refuses before fixture writes and retains uncertainty',async()=>{
 const f=fixture();f.native.ingress=false;f.pending('smoke');
 f.transport.holdIngressAndOpenFixtureWindow=async()=>({ingressBlocked:false,cadencesHeld:true,databaseReadOnly:false,activeOtherSessions:0});
 await assert.rejects(f.invoke('smoke'),e=>e.uncertain===true);
 assert.equal(f.native.state,'absent');assert(!f.calls.includes('smoke_prepare_empty'));
});
