import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {partialImageAttributionFixture} from './governed-release-compose-partial-image-attribution.test';
import {releaseOutcomeError,releaseIntentError,releaseFailedClosureError} from '../modules/agent-runtime/governed-release-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs')),
 compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
// Synthetic exact unchanged failed candidate. No external/native proof.
export function partialRollbackAbsenceFixture(){const f:any=partialImageAttributionFixture(),m=f.m,t=f.target;
 const candidateOperation={id:f.op.id,operation:'deploy',createdAt:f.op.createdAt,intent:structuredClone(f.op.intent)},candidateEvidence=structuredClone(f.evidence);
 const configIntent={...structuredClone(f.op.intent),requestId:randomUUID(),operation:'rollback_config',parameters:{commit:m.rollback.commit,
  artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest}};
 const configuration={id:randomUUID(),operation:'rollback_config',createdAt:'2026-10-04T12:03:20.000Z',intent:configIntent,
  outcome:{status:'succeeded',evidence:{deployedCommit:m.rollback.commit,artifactSetDigest:m.rollback.artifactSetDigest,
   configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest,observedAt:'2026-10-04T12:03:21.000Z'}}};
 const rollback={id:randomUUID(),operation:'rollback',createdAt:'2026-10-04T12:04:00.000Z',intent:{...configIntent,requestId:randomUUID(),operation:'rollback',
  parameters:{...configIntent.parameters,targetId:t.targetId}},outcome:{status:'uncertain',evidence:{observedAt:'2026-10-04T12:04:01.000Z'}}};
 const r=structuredClone(f.r);delete r.partial;r.kind='queue_absent_partial';r.phase='rollback';r.queue=null;r.operationId=rollback.id;r.since=rollback.createdAt;
 r.requestedCommit=m.rollback.commit;r.requestedTree=f.s.baseTree;r.configuration=structuredClone(t.rollbackConfiguration);
 r.deploymentId='r'+shared.releaseDigest([f.snapshot.releaseId,rollback.id,t.targetId,'rollback']).slice(0,23);
 r.partialRollbackAbsence={schemaVersion:'roost-compose-partial-rollback-absence-v1',candidateOperation,candidateEvidence,
  candidateEvidenceDigest:shared.releaseDigest(candidateEvidence),images:structuredClone(f.r.partial.images),databaseReadOnly:true,
  activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,protectedRollbackImages:structuredClone(f.r.partial.protectedRollbackImages),
  presentRollbackImageDigests:structuredClone(f.r.partial.presentRollbackImageDigests),publicHealth:{healthy:false,healthDigest:'1'.repeat(64)},retryOrdinal:1};
 const evidence={composeRecovery:r,deploymentIds:[],configDigest:m.rollback.configDigest,schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,
  healthDigest:'1'.repeat(64),healthy:false,observedAt:'2026-10-04T12:04:03.000Z',currentServiceSetDigest:compose.composeRuntimeSetDigest(r.services),absenceVerified:true};
 const candidate={...structuredClone(f.op),outcome:{status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:candidateEvidence}};
 const journal=[{id:randomUUID(),operation:'merge',outcome:{status:'succeeded'}},candidate,configuration,rollback];
 return {...f,r,evidence,rollback,candidate,configuration,journal};
}
function persisted(f:any){f.rollback.outcome={status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence};return f;}
test('rollback queue absence proves only unchanged failed candidate while preserving uncertainty history',()=>{
 const f=partialRollbackAbsenceFixture();assert(shared.composePartialRollbackAbsenceSchema.safeParse(f.r.partialRollbackAbsence).success);
 assert(shared.outcomeSchema.safeParse({requestId:randomUUID(),status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence}).success);
 assert.equal(shared.composeRecoveryEvidenceError(f.snapshot,f.evidence,f.rollback),null);
 assert.equal(shared.composePartialRollbackAbsenceJournalError(f.snapshot,f.rollback,f.evidence,f.journal),null);
 assert.equal(releaseOutcomeError(f.release,f.rollback,{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence},f.journal),null);
 assert.equal(shared.composePartialRollbackRetryValid(f.snapshot,f.journal),false);
 assert.equal(f.rollback.outcome.status,'uncertain');assert.equal(f.evidence.healthy,false);
 for(const k of ['deployedCommit','deployedTree','deployedSetDigest','artifactSetDigest'])assert.equal(f.evidence[k],undefined);
});
test('exact persisted absence authorizes one new approved rollback intent and no other first continuation',()=>{
 const f=persisted(partialRollbackAbsenceFixture());assert(shared.composePartialRollbackRetryValid(f.snapshot,f.journal));
 const intent={...structuredClone(f.rollback.intent),requestId:randomUUID()};assert.equal(releaseIntentError(f.release,intent,f.journal),null);
 for(const operation of ['rollback_config','deploy','deploy_config','push','pr','review','merge','observe','cleanup'])
  assert.notEqual(releaseIntentError(f.release,{...intent,operation},f.journal),null);
 const changed={...intent,parameters:{...intent.parameters,commit:f.s.commit}};assert.notEqual(releaseIntentError(f.release,changed,f.journal),null);
});
test('one appended retry exhausts permission, preserves normal recovery progression and never exempts a second absence',()=>{
 const f=persisted(partialRollbackAbsenceFixture()),retry:any={id:randomUUID(),operation:'rollback',createdAt:'2026-10-04T12:04:04.000Z',
  intent:{...structuredClone(f.rollback.intent),requestId:randomUUID()},outcome:{status:'succeeded',evidence:{}}};
 f.journal.push(retry);assert.equal(shared.composePartialRollbackRetryValid(f.snapshot,f.journal),false);
 assert.notEqual(releaseIntentError(f.release,{...retry.intent,requestId:randomUUID()},f.journal),null);
 const observation={...retry.intent,requestId:randomUUID(),operation:'observe',parameters:{mode:'rollback'}};
 assert.equal(releaseIntentError(f.release,observation,f.journal),null);
 retry.outcome={status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence};
 assert.notEqual(releaseIntentError(f.release,observation,f.journal),null);
});
const changes:Record<string,(f:any)=>void>={
 fakeSuccess:f=>f.evidence.healthy=true,fakeDeployedCommit:f=>f.evidence.deployedCommit=f.s.baseCommit,
 fakeArtifact:f=>f.evidence.artifactSetDigest=f.m.rollback.artifactSetDigest,fakeRuntimeSuccess:f=>f.evidence.deployedSetDigest=f.evidence.currentServiceSetDigest,
 absenceMissing:f=>f.evidence.absenceVerified=false,deployPhase:f=>f.r.phase='candidate',deployOperation:f=>f.rollback.operation='deploy',
 wrongQueue:f=>f.r.deploymentId='otherqueue',queuePresent:f=>f.r.queue=structuredClone(f.candidate.outcome.evidence.composeRecovery.queue),
 runningApp:f=>f.r.services.find((r:any)=>r.role==='app').state='running',changedContainer:f=>f.r.services[0].containerId='0'.repeat(64),
 changedImage:f=>f.r.partialRollbackAbsence.images[0].buildRevision=f.s.commit,changedMount:f=>f.r.services[0].mountDigest='0'.repeat(64),
 changedDB:f=>f.r.services.find((r:any)=>r.role==='database').imageDigest='sha256:'+'0'.repeat(64),
 changedData:f=>f.evidence.dataDigest='0'.repeat(64),changedSchema:f=>f.evidence.schemaDigest='0'.repeat(64),
 wrongConfig:f=>f.r.configuration=structuredClone(f.target.configuration),writableDB:f=>f.r.partialRollbackAbsence.databaseReadOnly=false,
 otherSessions:f=>f.r.partialRollbackAbsence.activeOtherSessions=1,openTransaction:f=>f.r.partialRollbackAbsence.ownedTransactions=1,
 unknownServices:f=>f.r.partialRollbackAbsence.projectServiceSetComplete=false,protectedMissing:f=>f.r.partialRollbackAbsence.presentRollbackImageDigests.pop(),
 healthyPublic:f=>f.r.partialRollbackAbsence.publicHealth.healthy=true,healthMismatch:f=>f.r.partialRollbackAbsence.publicHealth.healthDigest='0'.repeat(64),
 secondOrdinal:f=>f.r.partialRollbackAbsence.retryOrdinal=2,wrongFailureDigest:f=>f.r.partialRollbackAbsence.candidateEvidenceDigest='0'.repeat(64),
 wrongFailureId:f=>f.r.partialRollbackAbsence.candidateOperation.id=randomUUID(),unknownProofField:f=>f.r.partialRollbackAbsence.successfulRollback=true,
 candidateKind:f=>f.r.kind='queue_absent',candidateSourceClaim:f=>f.r.partialRollbackAbsence.sourceVerified=true,
 candidateNotSaved:f=>f.candidate.outcome.status='uncertain',candidateAcceptedWrong:f=>f.candidate.outcome.reconciledStatus='succeeded',
 configNotApplied:f=>f.configuration.outcome.status='uncertain',configChanged:f=>f.configuration.outcome.evidence.configDigest='0'.repeat(64),
 configIntentChanged:f=>f.configuration.intent.parameters.commit=f.s.commit,configLate:f=>f.configuration.outcome.evidence.observedAt='2026-10-04T12:04:05.000Z',
 currentNotUncertain:f=>f.rollback.outcome.status='succeeded',foreignHistory:f=>f.journal.splice(2,0,{id:randomUUID(),operation:'deploy',outcome:{status:'succeeded'}}),
 oldAbsence:f=>f.journal.unshift({id:randomUUID(),operation:'rollback',outcome:{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence}}),
};
for(const [name,change]of Object.entries(changes))test('partial rollback absence refuses '+name,()=>{
 const f=partialRollbackAbsenceFixture();change(f);assert.notEqual(shared.composePartialRollbackAbsenceJournalError(f.snapshot,f.rollback,f.evidence,f.journal),null);
 assert.notEqual(releaseOutcomeError(f.release,f.rollback,{status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:f.evidence},f.journal),null);
 assert.equal(shared.composePartialRollbackRetryValid(f.snapshot,f.journal),false);
});
test('self-consistent forged copy cannot replace authoritative persisted candidate evidence',()=>{
 const f=partialRollbackAbsenceFixture(),p=f.r.partialRollbackAbsence;p.candidateEvidence=structuredClone(p.candidateEvidence);
 p.candidateEvidence.composeRecovery.services[0].containerId='0'.repeat(64);f.r.services=structuredClone(p.candidateEvidence.composeRecovery.services);
 f.evidence.currentServiceSetDigest=compose.composeRuntimeSetDigest(f.r.services);p.candidateEvidence.currentServiceSetDigest=f.evidence.currentServiceSetDigest;
 p.candidateEvidenceDigest=shared.releaseDigest(p.candidateEvidence);
 assert.equal(shared.composePartialRollbackAbsenceEvidenceError(f.snapshot,f.evidence,f.rollback),null);
 assert.notEqual(shared.composePartialRollbackAbsenceJournalError(f.snapshot,f.rollback,f.evidence,f.journal),null);
});
test('absence may not masquerade as failed/succeeded rollback or standalone completed recovery closure',()=>{
 const f=partialRollbackAbsenceFixture();for(const o of [{status:'failed'},{status:'succeeded'},
  {status:'reconciled',reconciledStatus:'failed',observationOnly:true},{status:'reconciled',reconciledStatus:'succeeded',observationOnly:true},
  {status:'reconciled',reconciledStatus:'absent',observationOnly:false}])assert.notEqual(releaseOutcomeError(f.release,f.rollback,{...o,evidence:f.evidence},f.journal),null);
 const state={release:f.release,journal:persisted(f).journal,status:'active',expectedVersion:'0'.repeat(64)};
 assert.notEqual(releaseFailedClosureError(state,{failedOperationId:f.rollback.id,expectedVersion:state.expectedVersion,consentDigest:'1'.repeat(64),evidence:f.evidence}),null);
});
