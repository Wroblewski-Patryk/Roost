import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {require as tsRequire} from 'tsx/cjs/api';
import contract from './lib/agent-host-release-contract.cjs';
import {fixture as composeFixture,hash,git,image} from './fixtures/release-compose-contract.cjs';
import {nextReleaseOperation,runReleaseStep} from './lib/agent-host-release-broker.mjs';
const {releaseIntentError,releaseOutcomeError}=tsRequire('../src/modules/agent-runtime/governed-release-contract.ts',import.meta.url);

function fixture(start='smoke'){
 const f=composeFixture(),at=new Date().toISOString();
 const p={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,
  controllerDigest:hash('9'),fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),
   memoryId:-123470,markerDigest:hash('7'),summaryDigest:hash('8')},baselineSequenceDigest:hash('6'),budget:{providerRequests:0,externalActions:0},
  runtimeResume:{approved:true,databaseSettingsDigest:hash('4'),ingressSettingsDigest:hash('5'),observationSeconds:30,
   cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:hash('3')}]}};
 f.m.postObservation=p;
 const s={...f.s,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
  releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('1'),
  releaserRevision:at,expiresAt:new Date(Date.now()+60000).toISOString(),manifestDigest:contract.releaseDigest(f.m)};
 const state={release:{id:randomUUID(),snapshot:s,manifestDigest:s.manifestDigest,manifest_digest:s.manifestDigest},journal:[],status:'active',expectedVersion:hash('2')};
 const calls=[];
 const nativeEvidence=rollback=>({...f.evidence(rollback),observedAt:new Date(Date.now()-1000).toISOString()});
 const done=(operation,evidence={})=>({id:randomUUID(),operation,createdAt:at,intent:{parameters:{}},
  outcome:{requestId:randomUUID(),status:'succeeded',observationOnly:operation==='observe',evidence}});
 const pre=['push','pr','review','merge','deploy_config','deploy','observe'];
 for(const operation of pre.slice(0,start==='smoke'?pre.length:pre.indexOf(start))){
  const row=done(operation,['deploy','observe'].includes(operation)?nativeEvidence(false):{});
  if(operation==='deploy')row.intent.parameters.targetId=f.target.targetId;
  if(operation==='observe')row.intent.parameters.mode='candidate';state.journal.push(row);
 }
 function binding(rollback=false){return {postObservationDigest:contract.releaseDigest(p),fixtureDigest:contract.releaseDigest(p.fixture),controllerDigest:p.controllerDigest,
  targetId:f.target.targetId,commit:rollback?s.baseCommit:s.commit,tree:rollback?s.baseTree:s.candidateTree};}
 function phaseResult(operation,rollback=false){
  let proof;
  if(operation==='smoke')proof={...binding(),kind:'smoke',backendCommit:s.commit,frontendCommit:s.commit,emptyActivityCount:0,populatedActivityCount:1,
   renderedEventId:p.fixture.eventId,renderedSummaryDigest:p.fixture.summaryDigest,memoryId:p.fixture.memoryId,emptyRenderDigest:hash('1'),populatedRenderDigest:hash('2'),
   negativePathStatus:401,schemaDigest:f.m.baseline.schemaDigest,nonOwnedDataDigest:f.m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,
   fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,nativeChildrenClosed:true,
   providerRequests:0,externalActions:0};
  else if(operation==='fixture_cleanup')proof={...binding(),kind:'fixture_cleanup',schemaDigest:f.m.baseline.schemaDigest,dataDigest:f.m.baseline.dataDigest,
   sequenceDigest:p.baselineSequenceDigest,fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,activeOtherSessions:0,
   nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true,providerRequests:0,externalActions:0};
  else proof={...binding(rollback),kind:'runtime_resume',backendCommit:rollback?s.baseCommit:s.commit,frontendCommit:rollback?s.baseCommit:s.commit,
   schemaDigest:f.m.baseline.schemaDigest,healthy:true,fixtureAbsent:true,nativeChildrenClosed:true,
   databaseSettingsDigest:p.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:p.runtimeResume.ingressSettingsDigest,observationSeconds:30,
   services:nativeEvidence(rollback).composeTargets[0].runtime.services.map(r=>r.role==='cadence'?{...r,state:'running'}:r),cadences:structuredClone(p.runtimeResume.cadences),
   cadenceEvidence:p.runtimeResume.cadences.map(c=>({name:c.name,behaviorDigest:c.behaviorDigest,completedTicks:1,
    executionState:'executed',behaviorVerified:true,summaryDigest:hash('6'),observedAt:new Date().toISOString()}))};
  return {status:'succeeded',evidence:{postObservation:proof}};
 }
 const failure=(operation,rollback=false)=>({status:'failed',evidence:{postObservation:{...binding(rollback),kind:'failure',phase:operation,
  failureCode:operation==='smoke'?'populated_render_failed':operation==='fixture_cleanup'?'data_parity_failed':'runtime_resume_failed',
  ownedEffects:'present',nativeChildrenClosed:true}}});
 const config=rollback=>({commit:rollback?s.baseCommit:s.commit,artifactSetDigest:rollback?f.m.rollback.artifactSetDigest:f.m.deployment.artifactSetDigest,
  configDigest:rollback?f.m.rollback.configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest});
 const args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},assertWriter:async()=>calls.push('writer'),
  onChildrenClosed:async()=>calls.push('closed'),inspectCheckout:async()=>{calls.push('checkout');return {commit:s.commit,tree:s.candidateTree};},
  github:{inspect:async()=>({remoteBase:s.commit,remoteTree:s.candidateTree})},
  coolify:{inspect:async()=>calls.push('baseline'),configureCandidate:async()=>config(false),configureRollback:async()=>config(true),
   deploy:async()=>({state:'finished',deploymentIds:nativeEvidence(false).deploymentIds}),
   rollback:async()=>({state:'finished',deploymentIds:nativeEvidence(true).deploymentIds}),
   waitForDeployment:async(_m,_s,o)=>({state:'finished',deploymentIds:nativeEvidence(o.rollback).deploymentIds}),
   health:async(_m,_s,o)=>nativeEvidence(o.rollback),observe:async(_m,_s,o)=>nativeEvidence(o.rollback)},
  resources:{inspectCapacity:async()=>calls.push('capacity'),postObservation:async(m,b,o)=>{
    calls.push({kind:'post',manifest:m,binding:b,options:o});
    assert.equal(o.state.journal.at(-1).id,o.operationId);assert.equal(o.state.journal.at(-1).outcome,null);
    return phaseResult(o.operation,o.state.journal.some(j=>j.operation==='rollback'&&j.outcome?.status==='succeeded'));
   },reconcilePostObservation:async(m,b,o)=>{calls.push({kind:'reconcile_post',manifest:m,binding:b,options:o});
    return phaseResult(o.operation,o.state.journal.some(j=>j.operation==='rollback'&&j.outcome?.status==='succeeded'));},
   verifyRetention:async()=>({applicationActive:true,targetId:f.target.targetId,protectedResourcesDigest:contract.releaseDigest(f.m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:[]})},
  api:async(route,{body})=>{
   calls.push({kind:'api',route,body});assert.equal(calls.at(-2),'closed');
   if(route.endsWith('/operations')){
    assert.equal(releaseIntentError(state.release,body,state.journal),null);
    const operation={id:randomUUID(),operation:body.operation,intent:body,createdAt:new Date().toISOString(),outcome:null};
    state.journal.push(operation);return {...state,operation,replayed:false};
   }
   const operation=state.journal.find(j=>route.includes(j.id));
   assert.equal(releaseOutcomeError(state.release,operation,body,state.journal),null);
   operation.outcome=body;return state;
  }};
 return {...f,s,p,state,args,calls,done,phaseResult,failure,nativeEvidence};
}
function postOperation(f,operation,result){return {...f.done(operation),intent:{parameters:{postObservationDigest:contract.releaseDigest(f.p)}},
 outcome:{requestId:randomUUID(),status:result.status,observationOnly:false,evidence:{...result.evidence,observedAt:new Date().toISOString()}}};}

test('candidate observe reaches separate durable smoke, fixture cleanup, runtime resume and retained cleanup',async()=>{
 const f=fixture();assert.equal(nextReleaseOperation(f.state),'smoke');
 for(let i=0;i<4;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.slice(-4).map(j=>j.operation),['smoke','fixture_cleanup','runtime_resume','cleanup']);
 assert.equal(nextReleaseOperation(f.state),null);
 for(const j of f.state.journal.slice(-4,-1)){
  assert.deepEqual(j.intent.parameters,{postObservationDigest:contract.releaseDigest(f.p)});
  assert.equal(j.outcome.observationOnly,false);assert.equal(j.outcome.evidence.postObservation.kind,j.operation);
  assert.equal(typeof j.outcome.evidence.observedAt,'string');
  const call=f.calls.find(c=>c.kind==='post'&&c.options.operationId===j.id);
  assert.deepEqual(Object.keys(call.options).sort(),['operation','operationId','state']);
  assert.equal(call.binding.releaseId,f.state.release.id);
 }
 assert.equal(f.state.journal.at(-1).outcome.observationOnly,true);
 assert.equal(f.calls.filter(c=>c.kind==='post').length,3);
});
test('failed smoke cleans only the fixture before attributed rollback, rollback observation and baseline runtime resume',async()=>{
 const f=fixture();f.args.resources.postObservation=async(_m,_b,o)=>{
  f.calls.push({kind:'post',options:o});return o.operation==='smoke'?f.failure('smoke'):
   f.phaseResult(o.operation,o.state.journal.some(j=>j.operation==='rollback'&&j.outcome?.status==='succeeded'));
 };
 for(let i=0;i<7;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.slice(-7).map(j=>j.operation),['smoke','fixture_cleanup','rollback_config','rollback','observe','runtime_resume','cleanup']);
 assert.equal(f.state.journal.at(-3).intent.parameters.mode,'rollback');
 assert.equal(f.state.journal.at(-2).outcome.evidence.postObservation.backendCommit,f.s.baseCommit);
 assert.equal(nextReleaseOperation(f.state),null);
});
test('initial deployment failure recovers the exact baseline without inventing smoke or fixture effects',async()=>{
 const f=fixture('deploy');f.args.coolify.health=async(_m,_s,o)=>{
  const e=f.nativeEvidence(o.rollback);if(!o.rollback){e.healthy=false;e.composeTargets[0].runtime.services[0].health='unhealthy';}return e;
 };
 for(let i=0;i<6;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.slice(-6).map(j=>j.operation),['deploy','rollback_config','rollback','observe','runtime_resume','cleanup']);
 assert.equal(f.calls.filter(c=>c.kind==='post').length,1);assert.equal(f.calls.find(c=>c.kind==='post').options.operation,'runtime_resume');
 assert.equal(nextReleaseOperation(f.state),null);
});
for(const operation of ['fixture_cleanup','runtime_resume'])test(`attributed ${operation} failure requests diagnosis without repeating or terminal cleanup`,async()=>{
 const f=fixture();await runReleaseStep(f.args);if(operation==='runtime_resume')await runReleaseStep(f.args);
 f.args.resources.postObservation=async()=>f.failure(operation);
 await runReleaseStep(f.args);const before=f.state.journal.length;
 assert.throws(()=>nextReleaseOperation(f.state),/release_post_observation_diagnosis_required/);
 await assert.rejects(runReleaseStep(f.args),/release_post_observation_diagnosis_required/);
 assert.equal(f.state.journal.length,before);assert.equal(f.state.journal.at(-1).operation,operation);
});
for(const operation of ['smoke','fixture_cleanup','runtime_resume'])test(`lost ${operation} response invokes only read-only reconciliation with the same durable operation`,async()=>{
 const f=fixture();if(operation!=='smoke')await runReleaseStep(f.args);if(operation==='runtime_resume')await runReleaseStep(f.args);
 let effectCalls=0;f.args.resources.postObservation=async()=>{effectCalls++;throw Error('private transport details must not enter journal');};
 const result=await runReleaseStep(f.args),pending=f.state.journal.at(-1);assert.equal(result.reconciliationRequired,true);
 assert.equal(pending.outcome.status,'uncertain');assert.deepEqual(Object.keys(pending.outcome.evidence),['observedAt']);
 assert.equal(nextReleaseOperation(f.state),'reconcile');await runReleaseStep(f.args);
 assert.equal(effectCalls,1);assert.equal(pending.outcome.status,'reconciled');assert.equal(pending.outcome.reconciledStatus,'succeeded');
 const reconcile=f.calls.find(c=>c.kind==='reconcile_post');assert.equal(reconcile.options.operationId,pending.id);
 assert.equal(reconcile.options.operation,operation);assert.equal(pending.outcome.observationOnly,true);
 assert.equal(JSON.stringify(f.state.journal).includes('private transport details'),false);
});
test('reconciled smoke failure retains the fact then selects fixture cleanup rather than rerunning smoke',async()=>{
 const f=fixture();f.args.resources.postObservation=async()=>{throw Error('uncertain');};await runReleaseStep(f.args);
 f.args.resources.reconcilePostObservation=async()=>f.failure('smoke');await runReleaseStep(f.args);
 assert.equal(f.state.journal.at(-1).outcome.reconciledStatus,'failed');assert.equal(nextReleaseOperation(f.state),'fixture_cleanup');
});
test('pending authorization with no outcome is reconciled without executing the effect',async()=>{
 const f=fixture(),op={...f.done('smoke'),intent:{parameters:{postObservationDigest:contract.releaseDigest(f.p)}},outcome:null};f.state.journal.push(op);
 await runReleaseStep(f.args);assert.equal(f.calls.some(c=>c.kind==='post'),false);assert.equal(f.calls.filter(c=>c.kind==='reconcile_post').length,1);
 assert.equal(op.outcome.reconciledStatus,'succeeded');
});
for(const [name,change] of [
 ['wrong candidate',r=>{r.evidence.postObservation.backendCommit=git('f');}],
 ['wrong fixture',r=>{r.evidence.postObservation.fixtureDigest=hash('f');}],
 ['schema drift',r=>{r.evidence.postObservation.schemaDigest=hash('f');}],
 ['nonowned data change',r=>{r.evidence.postObservation.nonOwnedDataDigest=hash('f');}],
 ['sequence change',r=>{r.evidence.postObservation.sequenceDigest=hash('f');}],
 ['raw body',r=>{r.evidence.body='private payload';}],
 ['executable callback',r=>{r.command='do not execute';}],
 ['false success',r=>{r.status='succeeded';r.evidence.postObservation.kind='failure';}],
 ['absent claim',r=>{r.status='absent';}]
])test(`unqualified ${name} after effect becomes uncertainty and cannot progress`,async()=>{
 const f=fixture();f.args.resources.postObservation=async()=>{const r=f.phaseResult('smoke');change(r);return r;};
 const result=await runReleaseStep(f.args);assert.equal(result.reconciliationRequired,true);
 assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');assert.equal(nextReleaseOperation(f.state),'reconcile');
 assert.equal(JSON.stringify(f.state.journal).includes('private payload'),false);
});
test('unqualified reconciliation remains pending with no new effect or outcome and no fabricated absence',async()=>{
 const f=fixture();f.args.resources.postObservation=async()=>{throw Error('uncertain');};await runReleaseStep(f.args);
 const pending=f.state.journal.at(-1),outcomesBefore=f.calls.filter(c=>c.kind==='api'&&c.route.endsWith('/outcome')).length;
 for(const result of [{status:'absent',evidence:{}},f.phaseResult('smoke')]){
  if(result.evidence.postObservation)result.evidence.postObservation.fixtureDigest=hash('f');
  f.args.resources.reconcilePostObservation=async()=>result;
  await assert.rejects(runReleaseStep(f.args),/release_post_observation_result_unproven|release_post_observation_identity_mismatch/);
 }
 assert.equal(pending.outcome.status,'uncertain');assert.equal(f.calls.filter(c=>c.kind==='api'&&c.route.endsWith('/outcome')).length,outcomesBefore);
});
test('missing installed hooks block before authorizing or executing synthetic writes',async()=>{
 const f=fixture();delete f.args.resources.postObservation;
 await assert.rejects(runReleaseStep(f.args),/release_post_observation_gateway_required/);
 assert.equal(f.calls.some(c=>c.kind==='api'),false);
 f.state.journal.push({...f.done('smoke'),intent:{parameters:{postObservationDigest:contract.releaseDigest(f.p)}},outcome:null});
 delete f.args.resources.reconcilePostObservation;await assert.rejects(runReleaseStep(f.args),/release_post_observation_reconciliation_gateway_required/);
 assert.equal(f.calls.some(c=>c.kind==='api'),false);
});
test('accepted-looking historical phase proof cannot skip its observation, own cleanup or resume',()=>{
 const f=fixture();f.state.journal.push(postOperation(f,'smoke',f.phaseResult('smoke')));
 assert.equal(nextReleaseOperation(f.state),'fixture_cleanup');
 f.state.journal.push(postOperation(f,'runtime_resume',f.phaseResult('runtime_resume')));
 assert.throws(()=>nextReleaseOperation(f.state),/release_fixture_cleanup_pending/);
 const g=fixture();g.state.journal=g.state.journal.filter(j=>j.operation!=='observe');g.state.journal.push(postOperation(g,'smoke',g.phaseResult('smoke')));
 assert.throws(()=>nextReleaseOperation(g.state),/release_post_observation_before_verification/);
});
test('legacy optional-absent broker selects retained cleanup and never requires the new hooks',async()=>{
 const f=fixture();delete f.m.postObservation;f.s.manifestDigest=contract.releaseDigest(f.m);
 f.state.release.manifestDigest=f.s.manifestDigest;f.state.release.manifest_digest=f.s.manifestDigest;
 delete f.args.resources.postObservation;delete f.args.resources.reconcilePostObservation;
 assert.equal(nextReleaseOperation(f.state),'cleanup');await runReleaseStep(f.args);
 assert.equal(f.state.journal.at(-1).operation,'cleanup');assert.equal(nextReleaseOperation(f.state),null);
});
