import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {releaseDigest,releaseFailedClosureError,releaseHasPublishedGitBasis,releasePublishedGitBasis,
 releaseComposeRecoveryEvidenceError,closeFailedReleaseSchema} from '../modules/agent-runtime/governed-release-contract';
import {closeFailedRelease} from '../modules/agent-runtime/governed-release';
import {wire} from '../modules/agent-runtime/task-review-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const reads=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-baseline-revalidation.cjs'));
const compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
const {fixture,hash}=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));

function setup(inherited=true) {
 const f=fixture(),now=Date.now(),releaseId=randomUUID(),s:any={...f.s,manifest:f.m,requestId:randomUUID(),
  taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
  releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),
  materialVersion:hash('8'),releaserRevision:new Date(now-180000).toISOString(),expiresAt:new Date(now+3600000).toISOString(),
  manifestDigest:releaseDigest(f.m)};
 if(inherited) {
  s.baselineRestart={releaseId:randomUUID(),expectedVersion:hash('1'),closureId:randomUUID(),consentDigest:hash('2')};
  s.publishedGitBasis={schemaVersion:'roost-release-published-git-v1',basisKind:'compose_config_absence',
   releaseId:s.baselineRestart.releaseId,expectedVersion:s.baselineRestart.expectedVersion,closureId:s.baselineRestart.closureId,
   closureDigest:hash('3'),composeEvidenceDigest:hash('4'),pushOperationId:randomUUID(),prOperationId:randomUUID(),
   reviewOperationId:randomUUID(),mergeOperationId:randomUUID(),baselineDeploymentIds:[]};
  assert.equal(releaseHasPublishedGitBasis(s),true);
 }
 const r:any={id:releaseId,snapshot:s,manifest_digest:s.manifestDigest,workspace_id:randomUUID(),application_id:s.applicationId,
  task_id:s.taskId,host_id:s.hostId,issuer_user_id:randomUUID(),expires_at:new Date(now+3600000)};
 const journal:any[]=[];
 if(!inherited)for(const [index,operation]of ['push','pr','review','merge'].entries()) {
  const observedAt=new Date(now-150000+index*1000).toISOString();
  journal.push({id:randomUUID(),sequence:index+1,operation,createdAt:observedAt,intent:{},outcome:{id:randomUUID(),status:'succeeded',
   evidence:{observedAt,remoteCommit:s.commit,remoteTree:s.candidateTree,...(operation==='push'?{}:{pullRequestNumber:2,prHeadCommit:s.commit}),
    ...(operation==='review'?{reviewApproved:true}:{}),...(operation==='merge'?{prMerged:true,mergedCommit:s.commit}:{})}}});
 }
 for(const [index,operation]of ['deploy_config','deploy','rollback_config','rollback'].entries()) {
  const rollback=operation.startsWith('rollback'),expected=rollback?f.m.rollback:f.m.deployment;
  const createdAt=new Date(now-120000+index*15000).toISOString(),id=randomUUID();
  const intent={requestId:randomUUID(),operation,manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,
   expectedVersion:hash('9'),observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},
   parameters:{commit:rollback?s.baseCommit:s.commit,artifactSetDigest:expected.artifactSetDigest,configDigest:expected.configDigest,
    schemaDigest:expected.schemaDigest,...(operation.endsWith('_config')?{}:{targetId:f.target.targetId})}};
  let outcome:any;
  if(operation.endsWith('_config'))outcome={id:randomUUID(),status:'succeeded',observation_only:false,evidence:{
   observedAt:new Date(Date.parse(createdAt)+5000).toISOString(),deployedCommit:rollback?s.baseCommit:s.commit,
   artifactSetDigest:expected.artifactSetDigest,configDigest:expected.configDigest,schemaDigest:expected.schemaDigest}};
  else {
   const evidence=f.recoveryEvidence({...s,releaseId},{operationId:id,since:createdAt,rollback},'queue_absent');
   // The historical migrator is absent. No closure read creates a container.
   evidence.composeRecovery.baselineServices=evidence.composeRecovery.baselineServices.filter((row:any)=>row.role!=='migration');
   evidence.composeRecovery.services=evidence.composeRecovery.services.filter((row:any)=>row.role!=='migration');
   const proof=compose.qualifyComposeRetainedBaseline({configuration:f.target.baseline.configuration,images:f.target.baseline.images,
    services:evidence.composeRecovery.services,baselineServices:evidence.composeRecovery.baselineServices});
   evidence.deployedSetDigest=releaseDigest([{targetId:f.target.targetId,runtimeSetDigest:proof.runtimeSetDigest}]);
   evidence.observedAt=new Date(Date.parse(createdAt)+10000).toISOString();
   outcome={id:randomUUID(),status:'reconciled',reconciled_status:'failed',observation_only:true,evidence};
  }
  journal.push({id,sequence:journal.length+1,operation,createdAt,intent,outcome});
 }
 const state:any={release:r,journal,revocations:[],renewals:[],failedClosures:[]};
 state.expectedVersion=releaseDigest(wire({release:r,journal,revocations:[],renewals:[]}));
 const candidate=journal.at(-3),rollback=journal.at(-1),e=structuredClone(rollback.outcome.evidence);
 const input:any={requestId:randomUUID(),expectedVersion:state.expectedVersion,failedOperationId:rollback.id,consentDigest:hash('a'),evidence:e,
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId,operationId:rollback.id,agentHostId:s.hostId,
   evidenceDigest:releaseDigest(e),checkpointDigest:hash('b'),controllerPid:1234,registeredChildCount:10,
   allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:new Date(now-500).toISOString()}};
 const snapshot={...s,releaseId},baseline:any={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',
  ...shared.releaseComposeQueueAbsenceRevalidationBindings(snapshot),receiptDigest:hash('c'),observedAt:new Date(now-1000).toISOString(),
  actualReadTimes:Object.fromEntries(reads.readKeys.map((key:string)=>[key,new Date(now-1000).toISOString()])),
  actualReadDigests:Object.fromEntries(reads.readKeys.map((key:string)=>[key,hash('d')])),
  ...Object.fromEntries(reads.requiredParity.map((key:string)=>[key,true])),...Object.fromEntries(reads.zeroCounts.map((key:string)=>[key,0])),
  activeApplicationReleaseCount:1};
 input.absenceRevalidation={schemaVersion:'roost-compose-queue-absence-closure-revalidation-v1',releaseId,
  candidateOutcomeId:candidate.outcome.id,candidateEvidence:structuredClone(candidate.outcome.evidence),rollbackOutcomeId:rollback.outcome.id,
  rollbackEvidenceDigest:releaseDigest(e),nativeClosureDigest:releaseDigest(input.nativeClosure),configuration:structuredClone(f.target.rollbackConfiguration),
  services:structuredClone(e.composeRecovery.services),queues:[candidate,rollback].map(op=>({operationId:op.id,targetId:f.target.targetId,
   deploymentId:op.outcome.evidence.composeRecovery.deploymentId,queue:null})),baseline};
 const result={...f,s,now,snapshot,state,input,candidate,rollback};seal(result);return result;
}
function seal(f:any) {
 const a=f.input.absenceRevalidation;if(!a)return;
 a.baseline.revalidationDigest=shared.releaseBaselineRevalidationDigest(a.baseline);
 a.nativeClosureDigest=releaseDigest(f.input.nativeClosure??null);
 a.revalidationDigest=shared.releaseComposeQueueAbsenceRevalidationDigest(a);
}
function apiFixture(f:any) {
 const writes:any[]=[];
 const db:any={workspaceMembership:{findFirst:async()=>({role:'owner'})},event:{create:async()=>({})},evidenceRecord:{create:async()=>({})},
  $queryRaw:async(p:TemplateStringsArray)=>{const query=p.join('?');
   if(query.includes('pg_advisory_xact_lock'))return[];
   if(query.includes('FROM governed_releases'))return[f.state.release];
   if(query.includes('FROM governed_release_operations'))return f.state.journal;
   if(query.includes('FROM governed_release_revocations')||query.includes('FROM governed_release_renewals')||query.includes('FROM governed_release_failed_closures'))return[];
   throw Error('unexpected synthetic database read');},
  $executeRaw:async(p:TemplateStringsArray,...values:any[])=>{writes.push({query:p.join('?'),values});return 1;}};
 const auth:any={authType:'user',workspaceId:f.state.release.workspace_id,userId:f.state.release.issuer_user_id,workspaceRole:'owner',authenticatedAt:Math.floor(f.now/1000)};
 return{db,auth,writes};
}

for(const inherited of [false,true])test(`two absent queues close FAILED with ${inherited?'inherited Git':'the original validated Git prefix'} and actual rollback configuration`,async()=>{
 const f=setup(inherited),before=structuredClone(f.state),api=apiFixture(f);
 assert.equal(closeFailedReleaseSchema.safeParse(f.input).success,true);
 assert.equal(releaseComposeRecoveryEvidenceError(f.snapshot,f.candidate.outcome.evidence,f.candidate),null);
 assert.equal(releaseComposeRecoveryEvidenceError(f.snapshot,f.rollback.outcome.evidence,f.rollback),null);
 assert.equal(shared.releaseComposeQueueAbsenceRevalidationBindingError(f.snapshot,f.input),null);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),null);
 assert.equal(releaseFailedClosureError(f.state,f.input),null);
 assert.notEqual(f.input.evidence.configDigest,f.m.baseline.configDigest);
 assert.equal(f.input.evidence.configDigest,f.m.rollback.configDigest);
 assert.equal(f.input.absenceRevalidation.configuration.controllerPolicy.phase,'rollback');
 assert.equal(f.input.absenceRevalidation.services.some((row:any)=>row.role==='migration'),false);
 const result:any=await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input);
 assert.equal(result.error,undefined);assert.ok(result.closureId);assert.equal(api.writes.length,2);
 const receipt=JSON.parse(api.writes[0].values.find((value:any)=>typeof value==='string'&&value.startsWith('{')));
 assert.deepEqual(receipt.evidence,before.journal.at(-1).outcome.evidence);
 assert.deepEqual(receipt.absenceRevalidation.candidateEvidence,before.journal.at(-3).outcome.evidence);
 assert.equal(receipt.failedOutcomeId,f.rollback.outcome.id);assert.equal(receipt.failedEvidenceDigest,releaseDigest(f.rollback.outcome.evidence));
 assert(api.writes[1].values.some((value:any)=>typeof value==='string'&&value.startsWith('Closed FAILED;')));
 assert.deepEqual(f.state,before);
});

test('exact history, outcome identities, current version and admitted Git remain mandatory',()=>{
 const mutations=[(f:any)=>f.state.journal.pop(),(f:any)=>f.state.journal.push({...f.rollback,id:randomUUID(),operation:'cleanup'}),
  (f:any)=>f.state.journal[0].outcome.status='uncertain',(f:any)=>f.candidate.outcome.reconciled_status='succeeded',
  (f:any)=>f.rollback.outcome.reconciled_status='absent',(f:any)=>f.rollback.outcome.observation_only=false,
  (f:any)=>f.state.journal[0].outcome.observation_only=true,(f:any)=>f.state.journal[2].outcome.observation_only=true,
  (f:any)=>f.input.failedOperationId=f.candidate.id,(f:any)=>f.input.absenceRevalidation.candidateOutcomeId=randomUUID(),
  (f:any)=>f.input.absenceRevalidation.rollbackOutcomeId=randomUUID(),(f:any)=>f.candidate.id=f.rollback.id,
  (f:any)=>f.candidate.intent.parameters.commit=f.s.baseCommit,(f:any)=>f.state.journal[2].intent.parameters.configDigest=hash('e'),
  (f:any)=>f.input.expectedVersion=hash('e'),(f:any)=>f.state.revocations=[{id:randomUUID()}],
  (f:any)=>delete f.s.publishedGitBasis,(f:any)=>f.s.publishedGitBasis.closureId=randomUUID(),
  (f:any)=>f.s.predecessor={},(f:any)=>f.s.successorBasis={},(f:any)=>delete f.input.absenceRevalidation];
 for(const mutate of mutations){const f=setup();mutate(f);seal(f);assert.ok(releaseFailedClosureError(f.state,f.input));}
 const f=setup(false);f.state.journal[2].outcome.evidence.reviewApproved=false;
 assert.equal(releaseFailedClosureError(f.state,f.input),'release_restart_git_unproven');
});

test('failed or present queue, borrowed operation and altered immutable evidence cannot stand in for either absence',()=>{
 const mutations=[(f:any)=>f.input.absenceRevalidation.candidateEvidence.composeRecovery.kind='queue_failed',
  (f:any)=>f.input.evidence.composeRecovery.kind='queue_failed',(f:any)=>f.input.absenceRevalidation.queues[0].queue={status:'queued'},
  (f:any)=>f.input.absenceRevalidation.queues[1].deploymentId='otherqueue',
  (f:any)=>f.input.absenceRevalidation.queues[0].operationId=f.rollback.id,(f:any)=>f.input.absenceRevalidation.queues.reverse(),
  (f:any)=>f.input.absenceRevalidation.candidateEvidence.composeRecovery.releaseId=randomUUID(),
  (f:any)=>f.input.absenceRevalidation.candidateEvidence.composeRecovery.requestedCommit=f.s.baseCommit,
  (f:any)=>f.input.absenceRevalidation.candidateEvidence.observedAt=new Date(f.now-200000).toISOString(),
  (f:any)=>f.input.evidence.composeRecovery.operationId=f.candidate.id,(f:any)=>f.input.evidence.dataDigest=hash('e'),
  (f:any)=>f.input.absenceRevalidation.rollbackEvidenceDigest=hash('e')];
 for(const mutate of mutations){const f=setup();mutate(f);seal(f);assert.ok(releaseFailedClosureError(f.state,f.input));}
});

test('fresh actual configuration must be the sealed rollback controller while services remain the original retained baseline',()=>{
 const mutations=[(f:any)=>f.input.absenceRevalidation.configuration=structuredClone(f.target.baseline.configuration),
  (f:any)=>f.input.absenceRevalidation.configuration=structuredClone(f.target.configuration),
  (f:any)=>f.input.absenceRevalidation.configuration.environmentDigest=hash('e'),
  (f:any)=>f.input.absenceRevalidation.configuration.controllerPolicy.rendererDigest=hash('e'),
  (f:any)=>f.input.absenceRevalidation.services[0].containerId=hash('e'),(f:any)=>f.input.absenceRevalidation.services[0].imageDigest='sha256:'+hash('e'),
  (f:any)=>f.input.absenceRevalidation.services[0].mountDigest=hash('e'),(f:any)=>f.input.absenceRevalidation.services[0].health='unhealthy',
  (f:any)=>f.input.absenceRevalidation.services.pop(),(f:any)=>f.input.absenceRevalidation.baseline.baseline.dataDigest=hash('e'),
  (f:any)=>f.input.absenceRevalidation.baseline.targetBaselineDigest=hash('e'),(f:any)=>f.input.absenceRevalidation.baseline.protectedResourcesDigest=hash('e'),
  (f:any)=>f.input.absenceRevalidation.baseline.rollbackDigest=hash('e'),(f:any)=>f.input.absenceRevalidation.baseline.activeQueueCount=1,
  (f:any)=>f.input.absenceRevalidation.baseline.candidateQueueCount=1,(f:any)=>f.input.absenceRevalidation.baseline.databaseReadOnly=false];
 for(const mutate of mutations){const f=setup();mutate(f);seal(f);assert.ok(shared.releaseComposeQueueAbsenceRevalidationBindingError(f.snapshot,f.input));}
});

test('fresh nine-read receipt is strict and cannot restamp missing reads, historical evidence or native closure',async()=>{
 for(const key of reads.readKeys)for(const change of ['missing','old','future','later-than-wrapper']) {
  const f=setup(),b=f.input.absenceRevalidation.baseline;
  if(change==='missing')delete b.actualReadDigests[key];
  else b.actualReadTimes[key]=new Date(f.now+(change==='old'?-300001:change==='future'?1:-200)).toISOString();
  seal(f);assert.ok(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now));
 }
 const mutations=[(f:any)=>f.input.absenceRevalidation.waiver=true,(f:any)=>f.input.absenceRevalidation.baseline.activeApplicationReleaseCount=0,
  (f:any)=>f.input.absenceRevalidation.baseline.activeApplicationReleaseCount=2,(f:any)=>delete f.input.nativeClosure,
  (f:any)=>f.input.nativeClosure.writerAbsent=false,(f:any)=>f.input.nativeClosure.allChildrenClosed=false,
  (f:any)=>f.input.nativeClosure.nativeProcessesAbsent=false,(f:any)=>f.input.nativeClosure.registeredChildCount=0,
  (f:any)=>f.input.nativeClosure.agentHostId=randomUUID(),(f:any)=>f.input.nativeClosure.operationId=f.candidate.id,
  (f:any)=>f.input.nativeClosure.evidenceDigest=hash('e')];
 for(const mutate of mutations){const f=setup();mutate(f);seal(f);assert.ok(releaseFailedClosureError(f.state,f.input));}
 const f=setup(),api=apiFixture(f);f.input.absenceRevalidation.baseline.actualReadTimes.inventory=new Date(f.now-300001).toISOString();seal(f);
 assert.deepEqual(await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input),{error:'release_prerequisite_stale'});
 assert.equal(api.writes.length,0);
});

test('old immutable queue observations require a complete fresh read and newer native closure rather than replaced timestamps',async()=>{
 const f=setup(),api=apiFixture(f);
 // Keep the entire original operation chronology while making its proofs old.
 for(const [index,op]of f.state.journal.slice(-4).entries()) {
  op.createdAt=new Date(f.now-900000+index*100000).toISOString();
  op.outcome.evidence.observedAt=new Date(Date.parse(op.createdAt)+10000).toISOString();
  if(op.outcome.evidence.composeRecovery)op.outcome.evidence.composeRecovery.since=op.createdAt;
 }
 f.input.evidence=structuredClone(f.rollback.outcome.evidence);
 f.input.absenceRevalidation.candidateEvidence=structuredClone(f.candidate.outcome.evidence);
 f.input.nativeClosure.evidenceDigest=releaseDigest(f.input.evidence);f.input.absenceRevalidation.rollbackEvidenceDigest=releaseDigest(f.input.evidence);
 f.state.expectedVersion=f.input.expectedVersion=releaseDigest(wire({release:f.state.release,journal:f.state.journal,revocations:[],renewals:[]}));seal(f);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),null);
 const result:any=await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input);
 assert.equal(result.error,undefined);assert.equal(api.writes.length,2);
 assert.deepEqual(f.input.evidence,f.rollback.outcome.evidence);
});

test('native closure follows every read and retains the existing five-minute and future-time bounds',async()=>{
 for(const offset of [-1001,-300001,120001]) {
  const f=setup(),api=apiFixture(f);f.input.nativeClosure.observedAt=new Date(f.now+offset).toISOString();seal(f);
  assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),'release_native_closure_stale');
  const result:any=await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input);
  assert.equal(result.error,'release_native_closure_stale');assert.equal(api.writes.length,0);
 }
});

test('normal service retains fresh owner and issuer authority with zero writes on rejection',async()=>{
 for(const kind of ['old-auth','wrong-issuer']) {
  const f=setup(),api=apiFixture(f);
  if(kind==='old-auth')api.auth.authenticatedAt=Math.floor((f.now-301000)/1000);else api.auth.userId=randomUUID();
  const result:any=await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input);
  assert.equal(result.error,kind==='old-auth'?'release_fresh_owner_required':'release_issuer_required');assert.equal(api.writes.length,0);
 }
});

test('normal service keeps request idempotency and refuses conflicting closure bytes without new writes',async()=>{
 for(const conflict of [false,true]) {
  const f=setup(),api=apiFixture(f),read=api.db.$queryRaw,closureId=randomUUID();
  api.db.$queryRaw=async(p:TemplateStringsArray,...values:any[])=>p.join('?').includes('request_id')
   ?[{id:closureId,request_hash:conflict?hash('f'):releaseDigest({input:f.input,id:f.state.release.id,userId:api.auth.userId})}]
   :read(p,...values);
  const result:any=await closeFailedRelease(api.db,api.auth.workspaceId,f.state.release.id,api.auth,f.input);
  if(conflict)assert.deepEqual(result,{error:'release_request_conflict'});
  else {assert.equal(result.closureId,closureId);assert.equal(result.replayed,true);}
  assert.equal(api.writes.length,0);
 }
});

test('queue absence closure does not silently acquire the old config-absence restart admission',()=>{
 const f=setup(),closureId=randomUUID(),revocationId=randomUUID(),receipt={...structuredClone(f.input),releaseId:f.state.release.id,
  failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:releaseDigest(f.rollback.outcome.evidence)};
 f.state.failedClosures=[{id:closureId,consent_digest:f.input.consentDigest,closure_digest:releaseDigest(receipt),revocation_id:revocationId,snapshot:receipt}];
 f.state.revocations=[{id:revocationId}];
 const next={...structuredClone(f.s),releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),
  baselineRestart:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion,closureId,consentDigest:f.input.consentDigest}};
 assert.equal(releasePublishedGitBasis(f.state,next).error,'release_restart_closure_unproven');
});
