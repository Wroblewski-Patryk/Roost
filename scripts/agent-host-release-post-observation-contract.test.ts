import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {releaseIntentError,releaseOutcomeError} from '../src/modules/agent-runtime/governed-release-contract';
const require=createRequire(import.meta.url);
const contract=require('./lib/agent-host-release-contract.cjs');
const {fixture:composeFixture,hash,git,image}=require('./fixtures/release-compose-contract.cjs');

function fixture(){
 const f=composeFixture(),scope={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',
  candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,controllerDigest:hash('9'),
  fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),
   memoryId:-172934,markerDigest:hash('7'),summaryDigest:hash('8')},baselineSequenceDigest:hash('6'),
  budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:hash('4'),
   ingressSettingsDigest:hash('5'),observationSeconds:30,
   cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:hash('3')}]}};
 f.m.postObservation=scope;f.release.manifest_digest=contract.releaseDigest(f.m);
 function intent(operation:string,parameters:any=undefined){return {requestId:randomUUID(),operation,
  manifestDigest:f.release.manifest_digest,commit:f.s.commit,baseCommit:f.s.baseCommit,expectedVersion:hash('f'),
  observed:{commit:f.s.commit,baseCommit:f.s.commit,baseTree:f.s.candidateTree,manifestDigest:f.release.manifest_digest},
  parameters:parameters??{postObservationDigest:contract.releaseDigest(scope)}};}
 function op(operation:string){return {id:randomUUID(),operation,intent:intent(operation),createdAt:'2026-10-04T12:03:00.000Z'};}
 function binding(rollback=false){return {postObservationDigest:contract.releaseDigest(scope),fixtureDigest:contract.releaseDigest(scope.fixture),
  controllerDigest:scope.controllerDigest,targetId:f.target.targetId,commit:rollback?f.s.baseCommit:f.s.commit,tree:rollback?f.s.baseTree:f.s.candidateTree};}
 function proof(operation:string,rollback=false):any{
  if(operation==='smoke')return {...binding(),kind:'smoke',backendCommit:f.s.commit,frontendCommit:f.s.commit,
   emptyActivityCount:0,populatedActivityCount:1,renderedEventId:scope.fixture.eventId,renderedSummaryDigest:scope.fixture.summaryDigest,
   memoryId:scope.fixture.memoryId,emptyRenderDigest:hash('1'),populatedRenderDigest:hash('2'),negativePathStatus:401,
   schemaDigest:f.m.baseline.schemaDigest,nonOwnedDataDigest:f.m.baseline.dataDigest,sequenceDigest:scope.baselineSequenceDigest,
   fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,
   nativeChildrenClosed:true,providerRequests:0,externalActions:0};
  if(operation==='fixture_cleanup')return {...binding(),kind:'fixture_cleanup',schemaDigest:f.m.baseline.schemaDigest,
   dataDigest:f.m.baseline.dataDigest,sequenceDigest:scope.baselineSequenceDigest,fixtureAbsent:true,authAbsent:true,eventAbsent:true,
   databaseReadOnly:true,activeOtherSessions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true,
   providerRequests:0,externalActions:0};
  const services=f.evidence(rollback).composeTargets[0].runtime.services.map((r:any)=>r.role==='cadence'?{...r,state:'running'}:r);
  return {...binding(rollback),kind:'runtime_resume',backendCommit:rollback?f.s.baseCommit:f.s.commit,
   frontendCommit:rollback?f.s.baseCommit:f.s.commit,schemaDigest:f.m.baseline.schemaDigest,healthy:true,fixtureAbsent:true,
   nativeChildrenClosed:true,databaseSettingsDigest:scope.runtimeResume.databaseSettingsDigest,
   ingressSettingsDigest:scope.runtimeResume.ingressSettingsDigest,observationSeconds:30,services,cadences:structuredClone(scope.runtimeResume.cadences),
   cadenceEvidence:scope.runtimeResume.cadences.map((c:any)=>({name:c.name,behaviorDigest:c.behaviorDigest,completedTicks:1,
    executionState:'executed',behaviorVerified:true,summaryDigest:hash('6'),observedAt:'2026-10-04T12:03:05.000Z'}))};
 }
 function outcome(operation:string,rollback=false):any{return {requestId:randomUUID(),status:'succeeded',observationOnly:false,
  evidence:{observedAt:'2026-10-04T12:03:10.000Z',postObservation:proof(operation,rollback)}};}
 function journal(rollback=false):any[]{return [
  {operation:'merge',outcome:{status:'succeeded'}},
  {operation:rollback?'rollback':'deploy',intent:{parameters:{targetId:f.target.targetId}},outcome:{status:'succeeded',evidence:f.evidence(rollback)}},
  {operation:'observe',intent:{parameters:{mode:rollback?'rollback':'candidate'}},outcome:{status:'succeeded',evidence:f.evidence(rollback)}}
 ];}
 function completed(operation:string,rollback=false):any{return {...op(operation),outcome:outcome(operation,rollback)};}
 function cleanupEvidence(){return {observedAt:'2026-10-04T12:05:00.000Z',retentionVerified:true,repositoryArchived:false,localAbsent:false,
  repositoryUrl:f.m.repository.url,canonicalDir:f.m.repository.canonicalDir,targetId:f.target.targetId,applicationActive:true,
  localCommit:f.s.commit,localTree:f.s.candidateTree,remoteCommit:f.s.commit,remoteTree:f.s.candidateTree,
  protectedResourcesDigest:contract.releaseDigest(f.m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:[]};}
 return {...f,scope,intent,op,proof,outcome,journal,completed,cleanupEvidence};
}
function ready(f:any,op:string){const j=f.journal();if(op!=='smoke')j.push(f.completed('smoke'));if(op==='runtime_resume')j.push(f.completed('fixture_cleanup'));return j;}

test('legacy Compose parsing/digests, observation and retained cleanup are unchanged without opt-in',()=>{
 const f=fixture();delete f.m.postObservation;f.release.manifest_digest=contract.releaseDigest(f.m);
 assert.deepEqual(contract.manifestSchema.parse(f.m),f.m);
 assert.equal(contract.releaseDigest(contract.manifestSchema.parse(f.m)),f.release.manifest_digest);
 assert.equal(releaseIntentError(f.release,f.intent('cleanup',{resourceIds:[]}),f.journal()),null);
 assert.equal(releaseOutcomeError(f.release,{operation:'cleanup'},{status:'succeeded',observationOnly:true,evidence:f.cleanupEvidence()},f.journal()),null);
 for(const op of contract.postObservationOperations)assert.equal(releaseIntentError(f.release,f.intent(op),f.journal()),'release_post_observation_scope_required');
});
test('new source/controller/fixture are sealed independently without changing source artifact sets',()=>{
 const f=fixture(),legacy=composeFixture();assert.equal(contract.manifestSchema.safeParse(f.m).success,true);
 assert.equal(f.m.deployment.artifactSetDigest,legacy.m.deployment.artifactSetDigest);
 assert.notEqual(contract.releaseDigest(f.m),contract.releaseDigest(legacy.m));
 assert.notEqual(f.scope.controllerDigest,f.target.configuration.controllerPolicy.rendererDigest);
 const uuid=randomUUID(),input={requestId:uuid,taskId:uuid,applicationId:uuid,hostId:uuid,releaseExecutionId:uuid,
  releaserAgentId:uuid,releaserCredentialId:uuid,credentialVersion:1,reviewId:uuid,materialVersion:hash('1'),
  commit:f.s.commit,candidateTree:f.s.candidateTree,baseCommit:f.s.baseCommit,baseTree:f.s.baseTree,
  releaserRevision:'2026-10-04T12:00:00.000Z',expiresAt:'2026-10-04T12:30:00.000Z',manifest:f.m,manifestDigest:f.release.manifest_digest};
 assert.equal(contract.createReleaseSchema.safeParse(input).success,true);
 f.scope.candidateTree=git('f');assert.equal(contract.createReleaseSchema.safeParse(input).success,false);
});
for(const [name,change] of [
 ['provider calls',(f:any)=>{f.scope.budget.providerRequests=1;}],
 ['external actions',(f:any)=>{f.scope.budget.externalActions=1;}],
 ['positive memory ID',(f:any)=>{f.scope.fixture.memoryId=1;}],
 ['zero memory ID',(f:any)=>{f.scope.fixture.memoryId=0;}],
 ['duplicate UUID',(f:any)=>{f.scope.fixture.userId=f.scope.fixture.sessionId;}],
 ['raw fixture text',(f:any)=>{f.scope.fixture.summary='do not persist fixture content';}],
 ['credential',(f:any)=>{f.scope.fixture.cookie='secret-token';}],
 ['arbitrary SQL',(f:any)=>{f.scope.sql='DELETE FROM aion_memory';}],
 ['table reset',(f:any)=>{f.scope.resetTables=['aion_memory'];}],
 ['sequence reset',(f:any)=>{f.scope.resetSequences=true;}],
 ['missing resume consent',(f:any)=>{delete f.scope.runtimeResume.approved;}],
 ['unapproved cadence',(f:any)=>{f.scope.runtimeResume.cadences[0].name='unowned';}],
 ['duplicate cadence',(f:any)=>{f.scope.runtimeResume.cadences.push({...f.scope.runtimeResume.cadences[0]});}],
 ['candidate changed',(f:any)=>{f.scope.candidateCommit=git('f');}],
 ['running cadence before smoke',(f:any)=>{f.target.configuration.services.find((r:any)=>r.role==='cadence').expectedState='running';}]
] as const)test(`manifest denies ${name}`,()=>{const f=fixture();change(f);assert.equal(contract.manifestSchema.safeParse(f.m).success,false);});

test('smoke intent and outcome require complete successful candidate observation',()=>{
 const f=fixture(),op=f.op('smoke'),out=f.outcome('smoke');
 assert.equal(releaseIntentError(f.release,f.intent('smoke'),f.journal()),null);
 assert.equal(releaseOutcomeError(f.release,op,out,f.journal()),null);
 for(const j of [[],f.journal().slice(0,2),f.journal(true)]){
  assert.ok(releaseIntentError(f.release,f.intent('smoke'),j));assert.ok(releaseOutcomeError(f.release,op,out,j));
 }
 const j=f.journal();j[2].outcome.evidence.observationSeconds=119;
 assert.equal(releaseIntentError(f.release,f.intent('smoke'),j),'release_post_observation_before_verification');
 j[2].outcome.evidence=f.evidence();j[2].outcome.evidence.deploymentIds[0].deploymentId='unaccepted';
 assert.equal(releaseIntentError(f.release,f.intent('smoke'),j),'release_post_observation_before_verification');
});
test('scope digest is required and arbitrary parameters or effects in final cleanup are forbidden',()=>{
 const f=fixture();assert.equal(contract.intentSchema.safeParse(f.intent('smoke')).success,true);
 assert.equal(contract.intentSchema.safeParse(f.intent('smoke',{})).success,false);
 assert.equal(contract.intentSchema.safeParse(f.intent('smoke',{postObservationDigest:contract.releaseDigest(f.scope),sql:'DELETE'})).success,false);
 assert.equal(releaseIntentError(f.release,f.intent('smoke',{postObservationDigest:hash('f')}),f.journal()),'release_post_observation_scope_changed');
 assert.equal(releaseIntentError(f.release,f.intent('cleanup',{resourceIds:[]}),f.journal()),'release_post_observation_pending');
 assert.equal(releaseOutcomeError(f.release,{operation:'cleanup'},{status:'succeeded',observationOnly:true,evidence:f.cleanupEvidence()},f.journal()),'release_post_observation_pending');
 const j=[...ready(f,'runtime_resume'),f.completed('runtime_resume')];
 assert.equal(releaseIntentError(f.release,f.intent('cleanup',{resourceIds:[]}),j),null);
 assert.equal(releaseOutcomeError(f.release,{operation:'cleanup'},{status:'succeeded',observationOnly:true,evidence:f.cleanupEvidence()},j),null);
});

for(const [name,change] of [
 ['backend SHA',(p:any)=>{p.backendCommit=git('f');}],['frontend SHA',(p:any)=>{p.frontendCommit=git('f');}],
 ['tree',(p:any)=>{p.tree=git('f');}],['fixture digest',(p:any)=>{p.fixtureDigest=hash('f');}],
 ['fixed controller',(p:any)=>{p.controllerDigest=hash('f');}],['fixture memory',(p:any)=>{p.memoryId=-1;}],
 ['event identity',(p:any)=>{p.renderedEventId=randomUUID();}],['summary binding',(p:any)=>{p.renderedSummaryDigest=hash('f');}],
 ['invented empty activity',(p:any)=>{p.emptyActivityCount=1;}],['missing populated item',(p:any)=>{p.populatedActivityCount=0;}],
 ['auth bypass',(p:any)=>{p.negativePathStatus=200;}],['schema drift',(p:any)=>{p.schemaDigest=hash('f');}],
 ['nonowned row change',(p:any)=>{p.nonOwnedDataDigest=hash('f');}],['sequence advanced',(p:any)=>{p.sequenceDigest=hash('f');}],
 ['provider call',(p:any)=>{p.providerRequests=1;}],['extra auth identity',(p:any)=>{p.fixtureRows.authUsers=2;}],
 ['missing child closure',(p:any)=>{p.nativeChildrenClosed=false;}],['ingress open',(p:any)=>{p.ingressBlocked=false;}],
 ['cadence executing',(p:any)=>{p.cadencesHeld=false;}],['raw payload',(p:any)=>{p.body='data';}]
] as const)test(`smoke refuses ${name}`,()=>{const f=fixture(),out=f.outcome('smoke');change(out.evidence.postObservation);assert.ok(releaseOutcomeError(f.release,f.op('smoke'),out,f.journal()));});

test('fixture cleanup is an explicit reversible effect and must precede resume',()=>{
 const f=fixture();assert.equal(releaseIntentError(f.release,f.intent('fixture_cleanup'),f.journal()),'release_fixture_cleanup_without_smoke');
 assert.equal(releaseOutcomeError(f.release,f.op('fixture_cleanup'),f.outcome('fixture_cleanup'),f.journal()),'release_fixture_cleanup_without_smoke');
 const j=ready(f,'fixture_cleanup');assert.equal(releaseIntentError(f.release,f.intent('fixture_cleanup'),j),null);
 assert.equal(releaseOutcomeError(f.release,f.op('fixture_cleanup'),f.outcome('fixture_cleanup'),j),null);
 assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),'release_fixture_cleanup_pending');
 assert.equal(releaseOutcomeError(f.release,f.op('runtime_resume'),f.outcome('runtime_resume'),j),'release_fixture_cleanup_pending');
});
for(const [name,change] of [
 ['schema',(p:any)=>{p.schemaDigest=hash('f');}],['nonowned data',(p:any)=>{p.dataDigest=hash('f');}],
 ['sequence',(p:any)=>{p.sequenceDigest=hash('f');}],['remaining fixture',(p:any)=>{p.fixtureAbsent=false;}],
 ['remaining auth',(p:any)=>{p.authAbsent=false;}],['remaining event',(p:any)=>{p.eventAbsent=false;}],
 ['missing fence',(p:any)=>{p.databaseReadOnly=false;}],['active backend session',(p:any)=>{p.activeOtherSessions=1;}],
 ['sequence reset acknowledged',(p:any)=>{p.sequencesUnchanged=false;}],['reset claim',(p:any)=>{p.reset=true;}]
] as const)test(`cleanup refuses ${name}`,()=>{const f=fixture(),out=f.outcome('fixture_cleanup');change(out.evidence.postObservation);assert.ok(releaseOutcomeError(f.release,f.op('fixture_cleanup'),out,ready(f,'fixture_cleanup')));});

test('failed smoke is attributed independently and cannot skip fixture cleanup or resume the candidate',()=>{
 const f=fixture(),failed=f.op('smoke');const out:any={requestId:randomUUID(),status:'failed',observationOnly:false,
  evidence:{observedAt:'2026-10-04T12:03:10.000Z',postObservation:{...f.proof('smoke')}}};
 out.evidence.postObservation={...Object.fromEntries(['postObservationDigest','fixtureDigest','controllerDigest','targetId','commit','tree'].map(k=>[k,out.evidence.postObservation[k]])),
  kind:'failure',phase:'smoke',failureCode:'populated_render_failed',ownedEffects:'present',nativeChildrenClosed:true};
 assert.equal(releaseOutcomeError(f.release,failed,out,f.journal()),null);
 failed.outcome=out;const j=[...f.journal(),failed];
 const rollback=f.intent('rollback_config',{commit:f.s.baseCommit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest});
 assert.equal(releaseIntentError(f.release,rollback,j),'release_fixture_cleanup_pending');
 j.push(f.completed('fixture_cleanup'));assert.equal(releaseIntentError(f.release,rollback,j),null);
 assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),'release_post_observation_smoke_pending');
 const rollbackJournal=f.journal(true).slice(1);j.push(...rollbackJournal);
 assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),null);
 assert.equal(releaseOutcomeError(f.release,f.op('runtime_resume'),f.outcome('runtime_resume',true),j),null);
});
test('initial deployment rollback needs no invented smoke or cleanup; only the verified baseline can resume',()=>{
 const f=fixture(),j=f.journal(true);assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),null);
 assert.equal(releaseOutcomeError(f.release,f.op('runtime_resume'),f.outcome('runtime_resume',true),j),null);
 assert.ok(releaseOutcomeError(f.release,f.op('runtime_resume'),f.outcome('runtime_resume'),j));
});
test('resume proves every retained container/image/mount plus explicit accepted behavior and a bounded healthy period',()=>{
 const f=fixture(),j=ready(f,'runtime_resume');assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),null);
 assert.equal(releaseOutcomeError(f.release,f.op('runtime_resume'),f.outcome('runtime_resume'),j),null);
 for(const change of [
  (p:any)=>{p.services[0].imageDigest=image('e');},(p:any)=>{p.services[0].containerId=hash('e');},
  (p:any)=>{p.services[3].mountDigest=hash('f');},(p:any)=>{p.services.pop();},
  (p:any)=>{p.services[1]={...p.services[0]};},(p:any)=>{p.services[2].state='paused';},
  (p:any)=>{p.services[2].imageDigest=image('e');},(p:any)=>{p.cadences[0].behaviorDigest=hash('e');},
  (p:any)=>{p.databaseSettingsDigest=hash('e');},(p:any)=>{p.ingressSettingsDigest=hash('e');},
  (p:any)=>{p.observationSeconds=29;},(p:any)=>{p.fixtureAbsent=false;},(p:any)=>{p.frontendCommit=git('f');}
 ]){const out=f.outcome('runtime_resume');change(out.evidence.postObservation);assert.ok(releaseOutcomeError(f.release,f.op('runtime_resume'),out,j));}
});
test('completed resume forbids pre-resume fingerprint operations and failure never satisfies terminal cleanup',()=>{
 const f=fixture(),j=[...ready(f,'runtime_resume'),f.completed('runtime_resume')];
 assert.equal(releaseIntentError(f.release,f.intent('observe',{mode:'candidate'}),j),'release_runtime_resume_recovery_required');
 assert.equal(releaseIntentError(f.release,f.intent('smoke'),j),'release_runtime_resume_recovery_required');
 const failed=structuredClone(j);failed.at(-1).outcome.status='failed';
 assert.equal(releaseIntentError(f.release,f.intent('cleanup',{resourceIds:[]}),failed),'release_post_observation_pending');
});
test('journal-native snake case outcomes qualify; an in-flight current operation may only be reconciled, never blindly repeated',()=>{
 const f=fixture(),j=ready(f,'runtime_resume').map((x:any)=>x.operation==='smoke'||x.operation==='fixture_cleanup'?{
  ...x,outcome:{request_id:x.outcome.requestId,status:'reconciled',reconciled_status:'succeeded',observation_only:true,evidence:x.outcome.evidence}}:x);
 const op=f.op('runtime_resume');j.push({...op,outcome:null});
 assert.equal(releaseIntentError(f.release,f.intent('runtime_resume'),j),'release_operation_unresolved');
 const out=f.outcome('runtime_resume');out.status='reconciled';out.reconciledStatus='succeeded';out.observationOnly=true;
 assert.equal(releaseOutcomeError(f.release,op,out,j),null);
 out.reconciledStatus='absent';assert.ok(releaseOutcomeError(f.release,op,out,j));
});
test('typed uncertainty contains no fabricated proof; observation-only direct effects or proof on unrelated ops are denied',()=>{
 const f=fixture(),op=f.op('smoke'),uncertain={requestId:randomUUID(),status:'uncertain',observationOnly:false,evidence:{observedAt:'2026-10-04T12:03:10.000Z'}};
 assert.equal(releaseOutcomeError(f.release,op,uncertain,f.journal()),null);
 const out=f.outcome('smoke');out.observationOnly=true;assert.ok(releaseOutcomeError(f.release,op,out,f.journal()));
 assert.equal(releaseOutcomeError(f.release,{operation:'observe'},f.outcome('smoke'),f.journal()),'release_evidence_scope_invalid');
 out.observationOnly=false;out.evidence.dataDigest=f.m.baseline.dataDigest;assert.ok(releaseOutcomeError(f.release,op,out,f.journal()));
});
test('migration is additive operation check only, retains legacy values and contains no data/sequence reset',()=>{
 const sql=readFileSync(new URL('../prisma/migrations/20261004151000_release_post_observation_fixture/migration.sql',import.meta.url),'utf8');
 for(const op of contract.operations)assert.ok(sql.includes(`'${op}'`));
 assert.equal((sql.match(/ALTER TABLE governed_release_operations/g)??[]).length,2);
 assert.ok(!/\b(DELETE|TRUNCATE|UPDATE|DROP TABLE|SETVAL|RESTART IDENTITY)\b/i.test(sql));
});
