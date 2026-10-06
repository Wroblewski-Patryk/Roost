// Synthetic supporting checks only: no model, API, native process or application effects.
import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {failedRollbackPartialClosureFixture} from './governed-release-compose-failed-rollback-partial.test';
import {releaseRecoveryOnlyAdmissionError,releaseRecoveryOnlyAuditError,releaseIntentError,releaseOutcomeError,releaseWindowError} from '../modules/agent-runtime/governed-release-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
const clone=structuredClone,H=(x:string)=>x.repeat(64),T='2026-10-04T12:06:07.000Z';
function fixture(){const f:any=failedRollbackPartialClosureFixture(),old=f.release.snapshot;
 Object.assign(old,{taskId:randomUUID(),applicationId:randomUUID(),hostId:f.s.hostId,releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),reviewId:randomUUID(),materialVersion:H('8'),manifestDigest:shared.releaseDigest(f.m)});
 const owner=randomUUID(),closureId=randomUUID(),revocationId=randomUUID();f.release.issuer_user_id=owner;
 const receipt={...clone(f.input),releaseId:f.release.id,applicationId:old.applicationId,hostId:old.hostId,issuerUserId:owner,
  failedOutcomeId:f.retry.outcome.id,failedEvidenceDigest:shared.releaseDigest(f.evidence)};
 const closure={id:closureId,release_id:f.release.id,failed_operation_id:f.retry.id,failed_outcome_id:f.retry.outcome.id,consent_digest:receipt.consentDigest,
  closure_digest:shared.releaseDigest(receipt),revocation_id:revocationId,snapshot:receipt,created_at:new Date('2026-10-04T12:06:02.000Z')};
 const state={...f.state,expectedVersion:H('9'),revocations:[{id:revocationId}],failedClosures:[closure]};
 const m=clone(f.m),target=m.deployment.targets[0],renderer=H('0');
 target.baseline.controllerInvariants.rendererDigest=renderer;
 for(const config of [target.configuration,target.rollbackConfiguration,target.baseline.configuration]){
  config.sourcePins.controllerRenderer=renderer;if(config.controllerPolicy)config.controllerPolicy.rendererDigest=renderer;
 }
 for(const config of [target.configuration,target.rollbackConfiguration]){config.controllerPolicy.artifactDigest=H('1');config.controllerPolicy.buildCommandDigest=H('2');config.controllerPolicy.startCommandDigest=H('3');config.settingsDigest=H('4');config.runtimePolicyDigest=H('5');}
 target.configDigest=compose.composeConfigurationDigest(target.configuration);target.rollbackConfigDigest=compose.composeConfigurationDigest(target.rollbackConfiguration);target.baseline.configDigest=compose.composeConfigurationDigest(target.baseline.configuration);
 for(const [section,d]of [['deployment',target.configDigest],['rollback',target.rollbackConfigDigest],['baseline',target.baseline.configDigest]])m[section].configDigest=shared.releaseDigest([{targetId:target.targetId,configDigest:d}]);
 for(const [section,mode]of [['deployment',false],['rollback',true],['baseline','baseline']] as const)m[section].artifactSetDigest=shared.sourceArtifactDigest(m,old,mode);
 const input:any={requestId:randomUUID(),...Object.fromEntries(['taskId','applicationId','hostId','releaserAgentId','reviewId','materialVersion','commit','candidateTree','baseCommit','baseTree'].map(k=>[k,old[k]])),
  releaseExecutionId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,releaserRevision:T,expiresAt:'2026-10-04T12:30:00.000Z',manifest:m,manifestDigest:shared.releaseDigest(m)};
 const recoveryOnly={schemaVersion:'roost-compose-recovery-only-v1',releaseId:f.release.id,expectedVersion:state.expectedVersion,closureId,closureDigest:closure.closure_digest,
  failedOperationId:f.retry.id,failedOutcomeId:f.retry.outcome.id,failedEvidenceDigest:shared.releaseDigest(f.evidence),previousManifestDigest:old.manifestDigest,
  currentEvidence:clone(receipt.absenceRevalidation.currentEvidence),nativeClosure:clone(receipt.nativeClosure),
  scopeAudit:{taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('a'),scopeDigest:H('b')}};
 input.recoveryOnly=recoveryOnly;recoveryOnly.scopeAudit.scopeDigest=shared.releaseRecoveryOnlyScopeDigest(input);
 const audit:any={current:true,roleIssues:[],materialVersion:H('a'),approvalCommit:input.commit,
  execution:{id:input.releaseExecutionId,taskId:recoveryOnly.scopeAudit.taskId,applicationId:input.applicationId,agentHostId:input.hostId,status:'completed',contextInvalidatedAt:null,completedAt:'2026-10-04T12:06:04.000Z',changedFiles:[],
   verification:{managedAdmission:{qualification:'signed_native_v1',evidenceDigest:H('1'),jobSourceDigest:H('2')},ownedTreeReceipt:{cleanup:true,activeProcesses:0,attempt:input.releaseExecutionId},
    readOnlyAudit:{schemaVersion:'roost-readonly-audit-v1',verdict:'verified',evidenceDigest:H('3'),preTree:H('4'),postTree:H('4'),processState:'unchanged',dockerState:'unchanged',gitState:'unchanged',nativeTools:[]}}},
  contract:{assignment:{agentId:input.releaserAgentId},nativeBoundary:{profile:'inspect-readonly'},modelSelection:{schemaVersion:'roost-managed-hermes-backend-v1',backend:'codex_responses'}},
  decision:{id:recoveryOnly.scopeAudit.reviewId,decision:'approve',materialVersion:H('a'),verifierId:randomUUID(),createdAt:'2026-10-04T12:06:05.000Z',evidence:{reviewedCommit:input.commit,evidence:[
   {kind:'artifact',verdict:'pass',reference:'roost-release-recovery-scope:'+recoveryOnly.scopeAudit.scopeDigest},{kind:'test',verdict:'pass',reference:'fixed source proof'}]}}};
 const sourceView={execution:{id:randomUUID()},contract:{assignment:{agentId:randomUUID()}}};
 const release={id:randomUUID(),snapshot:input,manifest_digest:input.manifestDigest};
 return {...f,state,closure,input,m,target,audit,sourceView,release};
}
function intent(f:any,operation:string,mode?:string){const p=['rollback','rollback_config'].includes(operation)?{commit:f.m.rollback.commit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest,...(operation==='rollback'?{targetId:f.target.targetId}:{})}:operation==='observe'?{mode}:{};
 return {requestId:randomUUID(),operation,manifestDigest:f.input.manifestDigest,commit:f.input.commit,baseCommit:f.input.baseCommit,expectedVersion:H('0'),observed:{commit:f.input.commit,baseCommit:f.input.commit,baseTree:f.input.candidateTree,manifestDigest:f.input.manifestDigest},parameters:p};}
test('fresh closed FAILED entry admits a new recovery scope with no healthy baseline adoption',()=>{const f=fixture();assert(shared.createReleaseSchema.safeParse(f.input).success);assert.equal(shared.releaseHasRecoveryOnly(f.input),true);
 assert.equal(shared.releaseRecoveryOnlyManifestMatches(f.release.snapshot.manifest,f.m),false); // identity is not a controller repair
 assert.equal(releaseRecoveryOnlyAdmissionError(f.state,f.input,new Date(T)),null);assert.equal(releaseRecoveryOnlyAuditError(f.audit,f.input,f.sourceView,f.state),null);
 assert.equal(f.input.recoveryOnly.currentEvidence.healthy,false);assert.equal(f.m.baseline.observedAt,f.state.release.snapshot.manifest.baseline.observedAt);
 assert.equal(releaseWindowError(f.input,new Date('2026-10-04T13:00:00.000Z'),new Date(T)),null);
 assert.equal(releaseIntentError(f.release,intent(f,'rollback_config'),[]),null);
});
for(const op of ['push','pr','review','merge','deploy_config','deploy','smoke','archive_repository','cleanup_local'])test('forward effect denied '+op,()=>{const f=fixture();assert.equal(releaseIntentError(f.release,intent(f,op),[]),'release_recovery_only_forward_forbidden');});
test('candidate observation and a second rollback/config attempt are denied',()=>{const f=fixture();assert.equal(releaseIntentError(f.release,intent(f,'observe','candidate'),[]),'release_recovery_only_forward_forbidden');
 for(const op of ['rollback_config','rollback'])assert.equal(releaseIntentError(f.release,intent(f,op),[{operation:op,outcome:{status:'failed'}}]),'release_recovery_only_retry_exhausted');});
for(const name of ['predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase'])test('exclusive recovery scope rejects '+name,()=>{const f=fixture();f.input[name]={};assert.equal(shared.createReleaseSchema.safeParse(f.input).success,false);});
const badAdmission:Record<string,(f:any)=>void>={version:f=>f.input.recoveryOnly.expectedVersion=H('a'),closure:f=>f.closure.id=randomUUID(),closureDigest:f=>f.input.recoveryOnly.closureDigest=H('a'),
 failedOutcome:f=>f.input.recoveryOnly.failedOutcomeId=randomUUID(),closureRevocation:f=>f.state.revocations=[],closureReceipt:f=>f.closure.snapshot.failedEvidenceDigest=H('a'),
 liveData:f=>f.input.recoveryOnly.currentEvidence.dataDigest=H('a'),liveContainer:f=>f.input.recoveryOnly.currentEvidence.composeRecovery.services[0].containerId=H('a'),
 liveConfig:f=>f.input.recoveryOnly.currentEvidence.composeRecovery.configuration.settingsDigest=H('a'),healthy:f=>f.input.recoveryOnly.currentEvidence.healthy=true,
 activeNative:f=>f.input.recoveryOnly.nativeClosure.writerAbsent=false,source:f=>f.input.commit='f'.repeat(40),reusedReadiness:f=>f.input.releaseExecutionId=f.state.release.snapshot.releaseExecutionId,
 schema:f=>f.m.baseline.schemaDigest=H('a'),dbImage:f=>f.target.rollbackConfiguration.services.find((x:any)=>x.role==='database').imageDigest='sha256:'+H('a'),
 protected:f=>f.m.cleanup.protectedResourceIds.pop(),newDomain:f=>f.m.deployment.url='https://wrong.example.test',cadencePolicy:f=>f.target.rollbackConfiguration.services.find((x:any)=>x.role==='cadence').expectedState='running'};
for(const [name,mutate]of Object.entries(badAdmission))test('admission rejects '+name,()=>{const f=fixture();mutate(f);assert.notEqual(releaseRecoveryOnlyAdmissionError(f.state,f.input,new Date(T)),null);});
test('freshness rejects stale current read and native closure',()=>{const f=fixture();assert.notEqual(releaseRecoveryOnlyAdmissionError(f.state,f.input,new Date('2026-10-04T12:12:00.000Z')),null);});
const badAudit:Record<string,(f:any)=>void>={missingArtifact:f=>f.audit.decision.evidence.evidence.shift(),wrongScope:f=>f.audit.decision.evidence.evidence[0].reference='roost-release-recovery-scope:'+H('1'),noTest:f=>f.audit.decision.evidence.evidence.pop(),
 stale:f=>f.audit.current=false,wrongCommit:f=>f.audit.decision.evidence.reviewedCommit='f'.repeat(40),wrongNative:f=>f.audit.execution.verification.managedAdmission.qualification='saved_json',
 writer:f=>f.audit.execution.verification.ownedTreeReceipt.activeProcesses=1,changedFiles:f=>f.audit.execution.changedFiles=['source.py'],
 coding:f=>f.audit.contract.nativeBoundary.profile='coding-local',releaserReviews:f=>f.audit.decision.verifierId=f.input.releaserAgentId,
 originalCoderReviews:f=>f.audit.decision.verifierId=f.sourceView.contract.assignment.agentId,
 inheritedAudit:f=>f.audit.execution.completedAt='2026-10-04T12:05:00.000Z',inheritedDecision:f=>f.audit.decision.createdAt='2026-10-04T12:05:00.000Z'};
for(const [name,mutate]of Object.entries(badAudit))test('exact independent scope audit rejects '+name,()=>{const f=fixture();mutate(f);assert.notEqual(releaseRecoveryOnlyAuditError(f.audit,f.input,f.sourceView,f.state),null);});

test('recovery configuration and rollback use only the new exact immutable baseline proof',()=>{const f=fixture(),cfg=intent(f,'rollback_config'),cfgOp={id:randomUUID(),operation:'rollback_config',intent:cfg,createdAt:T};
 const cfgEvidence={deployedCommit:f.m.rollback.commit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest};
 assert.equal(releaseOutcomeError(f.release,cfgOp,{status:'succeeded',evidence:cfgEvidence},[]),null);
 const journal=[{...cfgOp,outcome:{status:'succeeded',evidence:cfgEvidence}}],roll=intent(f,'rollback');
 assert.equal(releaseIntentError(f.release,roll,journal),null);
 const rollOp={id:randomUUID(),operation:'rollback',intent:roll,createdAt:'2026-10-04T12:00:00.000Z'};
 const e=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs')).fixture().evidence(true);
 const row=e.composeTargets[0];
 for(const declared of f.target.rollbackConfiguration.services.filter((x:any)=>!row.runtime.services.some((r:any)=>r.name===x.name))){
  const service:any={name:declared.name,role:declared.role,containerId:H('5'),imageDigest:f.target.baseline.images.find((x:any)=>x.name===declared.name).imageDigest,mountDigest:declared.mountDigest,
   state:'paused',health:null,exitCode:0,createdAt:'2026-10-04T12:00:01.000Z',commit:f.input.baseCommit,tree:f.input.baseTree,deploymentId:row.runtime.deploymentId};
  row.runtime.services.push(service);row.binding.images.push(Object.fromEntries(['name','imageDigest','commit','tree','deploymentId'].map(k=>[k,service[k]])));
 }
 e.deployedSetDigest=shared.releaseDigest([{targetId:f.target.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(row.runtime.services)}]);
 e.composeTargets[0].configuration=clone(f.target.rollbackConfiguration);e.artifactSetDigest=f.m.rollback.artifactSetDigest;e.configDigest=f.m.rollback.configDigest;
 assert.equal(releaseOutcomeError(f.release,rollOp,{status:'succeeded',evidence:e},journal),null);
 journal.push({...rollOp,outcome:{status:'succeeded',evidence:e}} as any);
 const observed=intent(f,'observe','rollback');assert.equal(releaseIntentError(f.release,observed,journal),null);
 const observedOp={id:randomUUID(),operation:'observe',intent:observed,createdAt:T};
 assert.equal(releaseOutcomeError(f.release,observedOp,{status:'succeeded',evidence:e},journal),null);
 for(const change of [(x:any)=>x.composeTargets[0].runtime.services[0].imageDigest='sha256:'+H('a'),(x:any)=>x.composeTargets[0].binding.queue.status='failed',
  (x:any)=>x.composeTargets[0].configuration=clone(f.state.release.snapshot.manifest.deployment.targets[0].rollbackConfiguration),(x:any)=>x.dataDigest=H('a')]){
  const bad=clone(e);change(bad);assert.notEqual(releaseOutcomeError(f.release,rollOp,{status:'succeeded',evidence:bad},journal.slice(0,1)),null);
 }
});

export {fixture as recoveryOnlyFixture};
