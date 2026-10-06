import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createReleaseSchema,closeFailedReleaseSchema,releaseManifestSchema,releaseDigest,releaseFailedClosureError,releaseHasPublishedGitBasis,
 releasePublishedGitBasis,releaseIntentError,releaseWindowError,releaseApprovalError} from '../modules/agent-runtime/governed-release-contract';
import {createRelease} from '../modules/agent-runtime/governed-release';
import {wire} from '../modules/agent-runtime/task-review-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const reads=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-baseline-revalidation.cjs'));
const compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
const {fixture,hash}=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));

export function retainedBaselineFixture(inherited=false) {
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
   const evidence=f.recoveryEvidence({...s,releaseId},{operationId:id,since:createdAt,rollback},'queue_failed');
   // The historical migrator is absent. No closure read creates a container.
   evidence.composeRecovery.baselineServices=evidence.composeRecovery.baselineServices.filter((row:any)=>row.role!=='migration');
   evidence.composeRecovery.services=evidence.composeRecovery.services.filter((row:any)=>row.role!=='migration');
   const proof=compose.qualifyComposeRetainedBaseline({configuration:f.target.baseline.configuration,images:f.target.baseline.images,
    services:evidence.composeRecovery.services,baselineServices:evidence.composeRecovery.baselineServices});
   evidence.deployedSetDigest=releaseDigest([{targetId:f.target.targetId,runtimeSetDigest:proof.runtimeSetDigest}]);
   evidence.observedAt=new Date(Date.parse(createdAt)+10000).toISOString();
   outcome={id:randomUUID(),status:'failed',observation_only:false,evidence};
  }
  journal.push({id,sequence:journal.length+1,operation,createdAt,intent,outcome});
 }
 if(!inherited){journal[3].outcome.status='reconciled';journal[3].outcome.reconciled_status='succeeded';journal[3].outcome.observation_only=true;}
 const state:any={release:r,journal,revocations:[],renewals:[],failedClosures:[]};
 state.expectedVersion=releaseDigest(wire({release:r,journal,revocations:[],renewals:[]}));
 const candidate=journal.at(-3),rollback=journal.at(-1),e=structuredClone(rollback.outcome.evidence);
 const input:any={requestId:randomUUID(),expectedVersion:state.expectedVersion,failedOperationId:rollback.id,consentDigest:hash('a'),evidence:e,
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId,operationId:rollback.id,agentHostId:s.hostId,
   evidenceDigest:releaseDigest(e),checkpointDigest:hash('b'),controllerPid:1234,registeredChildCount:10,
   allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:new Date(now-500).toISOString()}};
 const snapshot={...s,releaseId},baseline:any={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',
  ...shared.releaseComposeRetainedBaselineRevalidationBindings(snapshot),receiptDigest:hash('c'),observedAt:new Date(now-1000).toISOString(),
  actualReadTimes:Object.fromEntries(reads.readKeys.map((key:string)=>[key,new Date(now-1000).toISOString()])),
  actualReadDigests:Object.fromEntries(reads.readKeys.map((key:string)=>[key,hash('d')])),
  ...Object.fromEntries(reads.requiredParity.map((key:string)=>[key,true])),...Object.fromEntries(reads.zeroCounts.map((key:string)=>[key,0])),
  activeApplicationReleaseCount:1,noCandidateQueue:false,candidateQueueCount:1};
 input.absenceRevalidation={schemaVersion:'roost-compose-retained-baseline-closure-revalidation-v1',releaseId,
  candidateOutcomeId:candidate.outcome.id,candidateEvidence:structuredClone(candidate.outcome.evidence),rollbackOutcomeId:rollback.outcome.id,
  rollbackEvidenceDigest:releaseDigest(e),nativeClosureDigest:releaseDigest(input.nativeClosure),configuration:structuredClone(f.target.rollbackConfiguration),
  services:structuredClone(e.composeRecovery.services),queues:[candidate,rollback].map(op=>({operationId:op.id,targetId:f.target.targetId,
   deploymentId:op.outcome.evidence.composeRecovery.deploymentId,queue:structuredClone(op.outcome.evidence.composeRecovery.queue)})),baseline};
 const result={...f,s,now,snapshot,state,input,candidate,rollback};seal(result);return result;
}
function seal(f:any) {
 const a=f.input.absenceRevalidation;if(!a)return;
 a.baseline.revalidationDigest=shared.releaseBaselineRevalidationDigest(a.baseline);
 a.nativeClosureDigest=releaseDigest(f.input.nativeClosure??null);
 a.revalidationDigest=shared.releaseComposeRetainedBaselineRevalidationDigest(a);
}

function adoptionSetup(inherited=false,renewBackup=true) {
 const f=retainedBaselineFixture(inherited);assert.equal(releaseFailedClosureError(f.state,f.input),null);
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
  input.baselineAdoption={schemaVersion:'roost-compose-retained-baseline-adoption-v1',releaseId:f.state.release.id,closureId,
  closureDigest:closure.closure_digest,failedOperationId:f.rollback.id,failedOutcomeId:f.rollback.outcome.id,
  failedEvidenceDigest:receipt.failedEvidenceDigest,targetId:f.target.targetId,previousManifestDigest:f.s.manifestDigest,
  previousRendererDigest:f.target.baseline.controllerInvariants.rendererDigest,newRendererDigest:renderer,
  previousRollbackConfigurationDigest:f.target.rollbackConfigDigest,retainedServicesDigest:releaseDigest(receipt.evidence.composeRecovery.services),
 candidateControllerPolicy:{...structuredClone(f.target.configuration.controllerPolicy),rendererDigest:renderer,startCommandDigest:hash('1')},
 rollbackControllerPolicy:{...structuredClone(f.target.rollbackConfiguration.controllerPolicy),rendererDigest:renderer,startCommandDigest:hash('2')},
 candidateSettingsDigest:hash('3'),candidateRuntimePolicyDigest:hash('4'),rollbackSettingsDigest:hash('5'),rollbackRuntimePolicyDigest:hash('6')};
 input.manifest=shared.releaseComposeRetainedBaselineAdoptionManifest(f.s,input.baselineAdoption,new Date(f.now).toISOString(),backup);
 assert(input.manifest);input.reviewId=randomUUID();input.materialVersion=hash('7');
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

// Synthetic contract cases are not production recovery evidence.
test('two exact terminal failed queues retain the original baseline and close only FAILED',()=>{
 for(const inherited of [false,true]){const f=retainedBaselineFixture(inherited),before=structuredClone(f.state);
 assert(closeFailedReleaseSchema.safeParse(f.input).success);
 assert.equal(releaseFailedClosureError(f.state,f.input),null);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),null);
 assert.deepEqual(f.state,before);assert.equal(f.input.evidence.composeRecovery.kind,'queue_failed');
 assert.equal(f.input.evidence.absenceVerified,undefined);}
});
test('retained closure rejects absent, unfinished, cancelled, substituted, or unhealthy queue/runtime evidence',()=>{
 const changes=[(f:any)=>f.input.evidence.composeRecovery.kind='queue_absent',
 (f:any)=>f.input.absenceRevalidation.queues[0].queue=null,
 (f:any)=>f.input.absenceRevalidation.queues[0].queue.finishedAt=null,
 (f:any)=>f.input.absenceRevalidation.queues[0].queue.status='cancelled-by-user',
 (f:any)=>f.input.absenceRevalidation.queues[0].queue.deploymentId='borrowed',
 (f:any)=>f.input.absenceRevalidation.services[0].containerId=hash('e'),
 (f:any)=>f.input.absenceRevalidation.services[0].mountDigest=hash('e'),
 (f:any)=>f.input.absenceRevalidation.services[0].health='unhealthy',
 (f:any)=>f.input.nativeClosure.writerAbsent=false,
 (f:any)=>f.input.absenceRevalidation.configuration.environmentDigest=hash('e'),
 (f:any)=>f.state.journal[3].outcome.reconciled_status='absent',
 (f:any)=>f.state.journal[5].outcome.status='uncertain'];
 for(const change of changes){const f=retainedBaselineFixture();change(f);seal(f);assert.ok(releaseFailedClosureError(f.state,f.input));}
});
test('closure keeps five-minute clocks and original outcome identity',()=>{
 for(const key of reads.readKeys){const f=retainedBaselineFixture();f.input.absenceRevalidation.baseline.actualReadTimes[key]=new Date(f.now-300001).toISOString();seal(f);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),'release_prerequisite_stale');}
 const f=retainedBaselineFixture();f.input.absenceRevalidation.candidateOutcomeId=randomUUID();seal(f);assert.ok(releaseFailedClosureError(f.state,f.input));
});
test('retained closure records its one real candidate queue and rejects absence or extra candidates',()=>{
 for(const [noCandidateQueue,candidateQueueCount]of [[true,0],[false,0],[false,2],[true,1]]){
  const f=retainedBaselineFixture();Object.assign(f.input.absenceRevalidation.baseline,{noCandidateQueue,candidateQueueCount});seal(f);
  assert.ok(releaseFailedClosureError(f.state,f.input));
 }
 const f=retainedBaselineFixture();assert.equal(f.input.absenceRevalidation.baseline.noCandidateQueue,false);
 assert.equal(f.input.absenceRevalidation.baseline.candidateQueueCount,1);assert.equal(releaseFailedClosureError(f.state,f.input),null);
});
test('repaired controller successor inherits exact published Git without asserting successful rollback',()=>{
 const f=adoptionSetup(),result=releasePublishedGitBasis(f.state,f.next);
 assert.equal(result.error,undefined);assert.equal(result.publishedGitBasis.basisKind,'compose_retained_baseline');
 assert.equal(result.publishedGitBasis.mergeOperationId,f.state.journal[3].id);
 assert.equal(releaseHasPublishedGitBasis({...f.next,...result}),true);
 assert(createReleaseSchema.safeParse(f.next).success);
 assert.equal(f.receipt.evidence.composeRecovery.kind,'queue_failed');
 assert.deepEqual(f.next.manifest.deployment.targets[0].baseline.images,f.target.baseline.images);
 assert.equal(f.next.manifest.baseline.dataDigest,f.m.baseline.dataDigest);
 const target=f.next.manifest.deployment.targets[0];
 assert.equal(target.baseline.configuration.controllerPolicy.startCommandDigest,f.target.rollbackConfiguration.controllerPolicy.startCommandDigest);
 assert.equal(target.baseline.configuration.settingsDigest,f.target.rollbackConfiguration.settingsDigest);
 assert.notEqual(target.rollbackConfiguration.controllerPolicy.startCommandDigest,target.baseline.configuration.controllerPolicy.startCommandDigest);
});
test('successor requires new material review, execution and credential',()=>{
 for(const key of ['reviewId','materialVersion','releaseExecutionId','releaserCredentialId']){
 const f=adoptionSetup();f.next[key]=f.s[key];assert.equal(releasePublishedGitBasis(f.state,f.next).error,'release_restart_binding_changed');}
});
test('controller-only recipe cannot alter app source, data, mounts, roles, thresholds or activity effects',()=>{
 const changes=[(f:any)=>f.next.commit='f'.repeat(40),(f:any)=>f.next.manifest.baseline.dataDigest=hash('a'),
 (f:any)=>f.next.manifest.deployment.targets[0].configuration.sourceDigest=hash('a'),
 (f:any)=>f.next.manifest.deployment.targets[0].configuration.composeDigest=hash('a'),
 (f:any)=>f.next.manifest.deployment.targets[0].configuration.environmentDigest=hash('a'),
 (f:any)=>f.next.manifest.deployment.targets[0].configuration.services[0].mountDigest=hash('a'),
 (f:any)=>f.next.manifest.observation.seconds++,
 (f:any)=>f.next.baselineAdoption.retainedServicesDigest=hash('a'),
 (f:any)=>f.next.baselineAdoption.candidateControllerPolicy.settingsInvariantDigest=hash('a')];
 for(const change of changes){const f=adoptionSetup();change(f);reseal(f.next,f.now);assert.ok(releasePublishedGitBasis(f.state,f.next).error);}
});
test('retained queue closure cannot masquerade as the historical queue-absence adoption',()=>{
 const f=adoptionSetup();f.next.baselineAdoption.schemaVersion='roost-compose-queue-absence-baseline-adoption-v1';
 assert.equal(releasePublishedGitBasis(f.state,f.next).error,'release_restart_closure_unproven');
});
