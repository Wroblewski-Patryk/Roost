import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createReleaseSchema,releaseManifestSchema,releaseDigest,releaseFailedClosureError,releaseHasPublishedGitBasis,
 releasePublishedGitBasis,releaseIntentError,releaseWindowError,releaseApprovalError} from '../modules/agent-runtime/governed-release-contract';
import {createRelease} from '../modules/agent-runtime/governed-release';
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

function adoptionSetup(inherited=true,renewBackup=true) {
 const f=setup(inherited);assert.equal(releaseFailedClosureError(f.state,f.input),null);
 const closureId=randomUUID(),revocationId=randomUUID(),receipt=wire({...structuredClone(f.input),releaseId:f.state.release.id,
  applicationId:f.s.applicationId,hostId:f.s.hostId,issuerUserId:f.state.release.issuer_user_id,
  failedOutcomeId:f.rollback.outcome.id,failedEvidenceDigest:releaseDigest(f.rollback.outcome.evidence)});
 const closure={id:closureId,consent_digest:f.input.consentDigest,closure_digest:releaseDigest(receipt),revocation_id:revocationId,snapshot:receipt};
 f.state.failedClosures=[closure];f.state.revocations=[{id:revocationId}];
 f.state.expectedVersion=releaseDigest(wire({release:f.state.release,journal:f.state.journal,revocations:f.state.revocations,renewals:[]}));
 const input:any={...structuredClone(f.s),requestId:randomUUID(),releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),
  expiresAt:new Date(f.now+1800000).toISOString(),baselineRestart:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion,
   closureId,consentDigest:closure.consent_digest}};
 delete input.publishedGitBasis;
 const renderer=hash('0'),backup=renewBackup?{digest:hash('e'),restoreDigest:hash('e'),bytes:20,
  capturedAt:new Date(f.now-10000).toISOString(),restoreVerifiedAt:new Date(f.now-5000).toISOString()}:f.m.backup;
 input.manifest=shared.releaseComposeQueueAbsenceAdoptionManifest(f.s,renderer,new Date(f.now).toISOString(),backup);
 assert(input.manifest,'the exact deterministic recipe must satisfy the unmodified manifest refinement');
 input.baselineAdoption={schemaVersion:'roost-compose-queue-absence-baseline-adoption-v1',releaseId:f.state.release.id,closureId,
  closureDigest:closure.closure_digest,failedOperationId:f.rollback.id,failedOutcomeId:f.rollback.outcome.id,
  failedEvidenceDigest:receipt.failedEvidenceDigest,targetId:f.target.targetId,previousManifestDigest:f.s.manifestDigest,
  previousRendererDigest:f.target.baseline.controllerInvariants.rendererDigest,newRendererDigest:renderer,
  previousRollbackConfigurationDigest:f.target.rollbackConfigDigest,retainedServicesDigest:releaseDigest(receipt.evidence.composeRecovery.services)};
 reseal(input,f.now);return{...f,closure,receipt,next:input,renderer};
}
function reseal(input:any,now:number) {
 const m=input.manifest,t=m.deployment.targets[0];
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);
 t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);t.sourceDigest=t.configuration.sourceDigest;
 t.baseline.sourceDigest=t.baseline.configuration.sourceDigest;
 m.deployment.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.configDigest}]);
 m.rollback.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.rollbackConfigDigest}]);
 m.baseline.configDigest=releaseDigest([{targetId:t.targetId,configDigest:t.baseline.configDigest}]);
 m.deployment.artifactSetDigest=shared.sourceArtifactDigest(m,input);m.rollback.artifactSetDigest=shared.sourceArtifactDigest(m,input,true);
 m.baseline.artifactSetDigest=shared.sourceArtifactDigest(m,input,'baseline');input.manifestDigest=releaseDigest(m);
 input.baselineRevalidation={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',
  ...shared.releaseBaselineRevalidationBindings(input),receiptDigest:hash('d'),observedAt:new Date(now).toISOString(),
  actualReadTimes:Object.fromEntries(reads.readKeys.map((key:string)=>[key,new Date(now).toISOString()])),
  actualReadDigests:Object.fromEntries(reads.readKeys.map((key:string)=>[key,hash('e')])),
  ...Object.fromEntries(reads.requiredParity.map((key:string)=>[key,true])),...Object.fromEntries(reads.zeroCounts.map((key:string)=>[key,0]))};
 input.baselineRevalidation.revalidationDigest=shared.releaseBaselineRevalidationDigest(input.baselineRevalidation);
}
function acceptedSnapshot(f:any) {
 const result=releasePublishedGitBasis(f.state,f.next);assert.equal(result.error,undefined);return{...f.next,...result};
}

for(const inherited of [false,true])test(`exact adoption carries ${inherited?'previously inherited':'original'} published Git and preserves closed history`,()=>{
 const f=adoptionSetup(inherited),before=structuredClone(f.state),snapshot=acceptedSnapshot(f);
 assert.equal(createReleaseSchema.safeParse(f.next).success,true);assert.equal(releaseHasPublishedGitBasis(snapshot),true);
 const b=snapshot.publishedGitBasis,git=inherited?f.s.publishedGitBasis:Object.fromEntries(
  ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'].map((key,index)=>[key,f.state.journal[index].id]));
 for(const key of ['pushOperationId','prOperationId','reviewOperationId','mergeOperationId'])assert.equal(b[key],git[key]);
 assert.equal(b.basisKind,'compose_queue_absence');assert.deepEqual(b.baselineDeploymentIds,[]);
 assert.equal(b.closureId,f.closure.id);assert.equal(b.closureDigest,f.closure.closure_digest);
 assert.equal(b.composeEvidenceDigest,f.receipt.failedEvidenceDigest);assert.equal(b.baselineAdoptionDigest,releaseDigest(f.next.baselineAdoption));
 assert.deepEqual(f.state,before);assert.notEqual(f.next.releaseExecutionId,f.s.releaseExecutionId);assert.notEqual(f.next.releaserCredentialId,f.s.releaserCredentialId);
 assert.equal(releaseWindowError(f.next,new Date(f.now+3600000),new Date(f.now)),null);
});

test('only the contextual baseline label and explicit renderer pin change; commands and physical baseline remain exact',()=>{
 const f=adoptionSetup(),previous=f.m,t=f.next.manifest.deployment.targets[0],old=f.target;
 assert.equal(t.baseline.configuration.controllerPolicy.phase,'baseline');assert.equal(t.rollbackConfiguration.controllerPolicy.phase,'rollback');
 for(const [current,prior]of [[t.baseline.configuration,old.rollbackConfiguration],[t.rollbackConfiguration,old.rollbackConfiguration],[t.configuration,old.configuration]]) {
  const expected=structuredClone(prior);expected.sourcePins.controllerRenderer=f.renderer;expected.controllerPolicy.rendererDigest=f.renderer;
  if(current===t.baseline.configuration)expected.controllerPolicy.phase='baseline';
  assert.deepEqual(current,expected);
  for(const key of ['artifactDigest','buildCommandDigest','startCommandDigest','settingsInvariantDigest','runtimeInvariantDigest'])
   assert.equal(current.controllerPolicy[key],prior.controllerPolicy[key]);
 }
 assert.deepEqual(t.baseline.images,old.baseline.images);assert.equal(t.baseline.commit,old.baseline.commit);assert.equal(t.baseline.tree,old.baseline.tree);
 for(const key of ['commit','schemaDigest','dataDigest','healthDigest'])assert.equal(f.next.manifest.baseline[key],previous.baseline[key]);
 for(const phase of ['baseline','deployment','rollback'])assert.notEqual(f.next.manifest[phase].artifactSetDigest,previous[phase].artifactSetDigest);
 assert.equal(f.next.manifest.baseline.artifactSetDigest,shared.sourceArtifactDigest(f.next.manifest,f.next,'baseline'));
 assert.equal(f.next.manifest.deployment.artifactSetDigest,shared.sourceArtifactDigest(f.next.manifest,f.next));
 assert.equal(f.next.manifest.rollback.artifactSetDigest,shared.sourceArtifactDigest(f.next.manifest,f.next,true));
 assert.deepEqual(f.next.manifest.cleanup,previous.cleanup);assert.deepEqual(f.next.manifest.postObservation,previous.postObservation);
 assert.equal(shared.releaseComposeRestartManifestMatches(previous,f.next.manifest),false);
});

test('renderer requalification cannot carry structurally valid drift even after fresh resealing',()=>{
 const mutations=[
  (m:any)=>m.deployment.targets[0].configuration.environmentDigest=hash('a'),
  (m:any)=>m.deployment.targets[0].configuration.sourceDigest=hash('b'),
  (m:any)=>m.deployment.targets[0].configuration.controllerPolicy.buildCommandDigest=hash('c'),
  (m:any)=>m.deployment.targets[0].rollbackConfiguration.controllerPolicy.startCommandDigest=hash('0'),
  (m:any)=>m.deployment.targets[0].baseline.configuration.controllerPolicy.artifactDigest=hash('c'),
  (m:any)=>m.deployment.targets[0].configuration.sourcePins.queueHelper=hash('c'),
  (m:any)=>m.deployment.targets[0].configuration.services.find((row:any)=>row.role==='cadence').expectedState='running',
  (m:any)=>m.observation.seconds++,
  (m:any)=>{m.repository.canonicalDir='C:\\Other';m.cleanup.canonicalDir='C:\\Other';},
  (m:any)=>m.deployment.targets[0].configuration.topology.destinationId='another',
  (m:any)=>m.baseline.dataDigest=hash('c'),
  (m:any)=>{const t=m.deployment.targets[0];t.baseline.images[0].imageDigest='sha256:'+hash('c');m.cleanup.protectedResourceIds.push(t.baseline.images[0].imageDigest);},
  (m:any)=>m.cleanup.ownedResourceIds.push('foreign'),
  (m:any)=>m.cleanup.protectedResourceIds.push(hash('c'))
 ];
 for(const mutate of mutations) {
  const f=adoptionSetup();mutate(f.next.manifest);reseal(f.next,f.now);
  assert.equal(releaseManifestSchema.safeParse(f.next.manifest).success,true,'negative fixture must pass ordinary manifest refinement');
  assert.equal(shared.releaseComposeQueueAbsenceAdoptionManifestMatches(f.s,f.next.manifest,f.next.baselineAdoption),false);
  assert.equal(releasePublishedGitBasis(f.state,f.next).error,'release_restart_baseline_changed');
 }
});

test('explicit adoption binds the authentic closure, both renderer identities and old rollback digest',()=>{
 const mutations=[(f:any)=>f.next.baselineAdoption.releaseId=randomUUID(),(f:any)=>f.next.baselineAdoption.closureId=randomUUID(),
  (f:any)=>f.next.baselineAdoption.closureDigest=hash('a'),(f:any)=>f.next.baselineAdoption.failedOperationId=randomUUID(),
  (f:any)=>f.next.baselineAdoption.failedOutcomeId=randomUUID(),(f:any)=>f.next.baselineAdoption.failedEvidenceDigest=hash('a'),
  (f:any)=>f.next.baselineAdoption.previousManifestDigest=hash('a'),(f:any)=>f.next.baselineAdoption.previousRendererDigest=hash('a'),
  (f:any)=>f.next.baselineAdoption.previousRollbackConfigurationDigest=hash('a'),(f:any)=>f.next.baselineAdoption.retainedServicesDigest=hash('a'),
  (f:any)=>f.next.baselineAdoption.targetId='foreign',(f:any)=>f.next.baselineAdoption.newRendererDigest=f.target.baseline.controllerInvariants.rendererDigest,
  (f:any)=>f.next.baselineAdoption.command='untrusted',
  (f:any)=>f.closure.closure_digest=hash('a'),(f:any)=>f.closure.snapshot.failedOutcomeId=randomUUID(),
  (f:any)=>{f.closure.snapshot.issuerUserId=randomUUID();f.closure.closure_digest=releaseDigest(f.closure.snapshot);},
  (f:any)=>{f.closure.snapshot.hostId=randomUUID();f.closure.closure_digest=releaseDigest(f.closure.snapshot);},
  (f:any)=>{f.closure.snapshot.applicationId=randomUUID();f.closure.closure_digest=releaseDigest(f.closure.snapshot);},
  (f:any)=>f.state.revocations=[],(f:any)=>f.next.baselineRestart.expectedVersion=hash('a'),
  (f:any)=>delete f.next.baselineAdoption];
 for(const mutate of mutations){const f=adoptionSetup();mutate(f);assert.ok(releasePublishedGitBasis(f.state,f.next).error);}
});

test('exact source, application scope, credential and execution replacement remain mandatory',()=>{
 const mutations=[(f:any)=>f.next.releaseExecutionId=f.s.releaseExecutionId,(f:any)=>f.next.releaserCredentialId=f.s.releaserCredentialId,
  (f:any)=>f.next.commit='f'.repeat(40),(f:any)=>f.next.candidateTree='f'.repeat(40),(f:any)=>f.next.baseCommit='f'.repeat(40),
  (f:any)=>f.next.baseTree='f'.repeat(40),(f:any)=>f.next.applicationId=randomUUID(),(f:any)=>f.next.taskId=randomUUID(),
  (f:any)=>f.next.hostId=randomUUID(),(f:any)=>f.next.releaserAgentId=randomUUID(),
  (f:any)=>f.next.materialVersion=hash('a'),(f:any)=>f.next.predecessor={},(f:any)=>f.next.successorBasis={}];
 for(const mutate of mutations){const f=adoptionSetup();mutate(f);assert.ok(releasePublishedGitBasis(f.state,f.next).error);}
});

test('the new basis prevents every repeated Git effect and detects altered adoption binding',()=>{
 const f=adoptionSetup(),s=acceptedSnapshot(f),r={snapshot:s,manifest_digest:s.manifestDigest};
 const intent:any={commit:s.commit,baseCommit:s.baseCommit,manifestDigest:s.manifestDigest,
  observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},
  parameters:{commit:s.commit,artifactSetDigest:s.manifest.deployment.artifactSetDigest,configDigest:s.manifest.deployment.configDigest,schemaDigest:s.manifest.deployment.schemaDigest}};
 assert.equal(releaseIntentError(r,{...intent,operation:'deploy_config'},[]),null);
 for(const operation of ['push','pr','review','merge'])assert.equal(releaseIntentError(r,{...intent,operation},[]),'release_successor_git_effect_forbidden');
 for(const mutate of [(x:any)=>x.publishedGitBasis.baselineAdoptionDigest=hash('a'),(x:any)=>x.publishedGitBasis.composeEvidenceDigest=hash('a'),
  (x:any)=>x.publishedGitBasis.baselineDeploymentIds=[{targetId:'composeapp',deploymentId:'invented'}],
  (x:any)=>x.publishedGitBasis.basisKind='compose_config_absence',(x:any)=>delete x.baselineAdoption]) {
  const altered=structuredClone(s);mutate(altered);assert.equal(releaseHasPublishedGitBasis(altered),false);
 }
});

test('fresh complete baseline reads remain mandatory, cannot be restamped and cannot extend the grant or backup window',()=>{
 const f=adoptionSetup();delete f.next.baselineRevalidation;
 assert.equal(createReleaseSchema.safeParse(f.next).success,false);assert.ok(releasePublishedGitBasis(f.state,f.next).error);
 assert.equal(releaseWindowError(f.next,new Date(f.now+3600000),new Date(f.now)),'release_baseline_adoption_unproven');
 for(const key of reads.readKeys)for(const kind of ['missing','old','future']) {
  const x=adoptionSetup(),b=x.next.baselineRevalidation;
  if(kind==='missing')delete b.actualReadDigests[key];else b.actualReadTimes[key]=new Date(x.now+(kind==='old'?-300001:1)).toISOString();
  b.revalidationDigest=shared.releaseBaselineRevalidationDigest(b);
  if(kind==='missing')assert.equal(createReleaseSchema.safeParse(x.next).success,false);
  else assert.equal(releaseWindowError(x.next,new Date(x.now+3600000),new Date(x.now)),'release_prerequisite_stale');
 }
 const x=adoptionSetup();x.next.expiresAt=new Date(x.now+3600001).toISOString();
 assert.equal(releaseWindowError(x.next,new Date(x.now+7200000),new Date(x.now)),'release_window_invalid');
 const old=adoptionSetup(false,false);old.next.manifest.backup.capturedAt=old.next.manifest.backup.restoreVerifiedAt=new Date(old.now-86400001).toISOString();
 reseal(old.next,old.now);assert.equal(releaseWindowError(old.next,new Date(old.now+3600000),new Date(old.now)),'release_prerequisite_stale');
});

test('backup renewal follows the existing exact archive rule and never permits a timestamp-only renewal',()=>{
 const f=adoptionSetup(false,false);assert.equal(releasePublishedGitBasis(f.state,f.next).error,undefined);
 const stamped=structuredClone(f.m.backup);stamped.capturedAt=new Date(f.now-10000).toISOString();stamped.restoreVerifiedAt=new Date(f.now-5000).toISOString();
 assert.equal(shared.releaseComposeQueueAbsenceAdoptionManifest(f.s,f.renderer,new Date(f.now).toISOString(),stamped),null);
 const wrong=adoptionSetup();wrong.next.manifest.backup.restoreDigest=hash('a');
 assert.equal(shared.releaseComposeQueueAbsenceAdoptionManifestMatches(wrong.s,wrong.next.manifest,wrong.next.baselineAdoption),false);
});

test('normal create service requires fresh owner authentication before adoption grants and performs zero writes on denial',async()=>{
 const f=adoptionSetup();let writes=0;
 const db:any={workspaceMembership:{findFirst:async()=>({role:'owner'})},$executeRaw:async()=>{writes++;assert.fail('stale owner cannot write');},
  $queryRaw:async()=>assert.fail('stale owner cannot enter grant assembly')};
 const auth:any={authType:'user',workspaceId:f.state.release.workspace_id,userId:f.state.release.issuer_user_id,workspaceRole:'owner',
  authenticatedAt:Math.floor((f.now-301000)/1000)};
 assert.deepEqual(await createRelease(db,auth.workspaceId,auth,f.next),{error:'release_fresh_owner_required'});assert.equal(writes,0);
});

test('published Git never substitutes for current exact independent approval',()=>{
 const f=adoptionSetup(),verifier=randomUUID(),executor=randomUUID(),review:any={current:true,roleIssues:[],materialVersion:f.next.materialVersion,
  approvalCommit:f.next.commit,execution:{applicationId:f.next.applicationId},decision:{id:f.next.reviewId,decision:'approve',
   materialVersion:f.next.materialVersion,evidence:{reviewedCommit:f.next.commit},verifierId:verifier},
  authorities:{releaser:{principal:{kind:'agent',id:f.next.releaserAgentId}}},contract:{assignment:{agentId:executor},
   taskRoles:{releaser:{revision:f.next.releaserRevision}}}};
 assert.equal(releaseApprovalError(review,f.next),null);
 for(const mutate of [(r:any)=>r.current=false,(r:any)=>r.decision.decision='reject',(r:any)=>r.decision.evidence.reviewedCommit='f'.repeat(40),
  (r:any)=>r.decision.verifierId=executor,(r:any)=>r.materialVersion=hash('a')]) {
  const changed=structuredClone(review);mutate(changed);assert.ok(releaseApprovalError(changed,f.next));
 }
});
