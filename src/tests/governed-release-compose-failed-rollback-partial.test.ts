import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {partialRollbackAbsenceFixture} from './governed-release-compose-partial-rollback-absence.test';
import {releaseOutcomeError,releaseIntentError,releaseFailedClosureError} from '../modules/agent-runtime/governed-release-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
export function failedRollbackPartialFixture(){const f:any=partialRollbackAbsenceFixture();
 f.rollback.outcome={id:randomUUID(),status:'reconciled',reconciledStatus:'absent',observationOnly:true,evidence:structuredClone(f.evidence)};
 const absenceOperation={id:f.rollback.id,operation:'rollback',createdAt:f.rollback.createdAt,intent:structuredClone(f.rollback.intent)},absenceEvidence=structuredClone(f.evidence);
 const retry={id:randomUUID(),operation:'rollback',createdAt:'2026-10-04T12:05:00.000Z',intent:{...structuredClone(f.rollback.intent),requestId:randomUUID()},
  outcome:{id:randomUUID(),status:'uncertain',evidence:{observedAt:'2026-10-04T12:05:01.000Z'}}};
 const r=structuredClone(f.r),p=r.partialRollbackAbsence;delete r.partialRollbackAbsence;
 r.kind='queue_failed_rollback_partial';r.operationId=retry.id;r.since=retry.createdAt;
 r.deploymentId='r'+shared.releaseDigest([f.snapshot.releaseId,retry.id,f.target.targetId,'rollback']).slice(0,23);
 r.queue={targetId:f.target.targetId,deploymentId:r.deploymentId,commit:f.m.rollback.commit,status:'failed',createdAt:'2026-10-04T12:05:01.000Z',finishedAt:'2026-10-04T12:05:02.000Z'};
 r.partialRollbackFailure={...p,schemaVersion:'roost-compose-failed-rollback-partial-v1',absenceOperation,absenceEvidence,absenceEvidenceDigest:shared.releaseDigest(absenceEvidence)};
 const evidence={...f.evidence,composeRecovery:r,deploymentIds:[{targetId:f.target.targetId,deploymentId:r.deploymentId}],observedAt:'2026-10-04T12:05:03.000Z'};delete evidence.absenceVerified;
 f.journal.push(retry);return {...f,retry,r,evidence};
}
function persisted(f:any){f.retry.outcome={id:randomUUID(),status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:structuredClone(f.evidence)};return f;}
export function failedRollbackPartialClosureFixture(){const f=persisted(failedRollbackPartialFixture()),currentEvidence=structuredClone(f.evidence);
 f.s.hostId=randomUUID();f.snapshot.hostId=f.s.hostId;f.release.snapshot.hostId=f.s.hostId;
 currentEvidence.observedAt='2026-10-04T12:06:00.000Z';currentEvidence.healthDigest='2'.repeat(64);currentEvidence.composeRecovery.partialRollbackFailure.publicHealth.healthDigest=currentEvidence.healthDigest;
 const nativeClosure={schemaVersion:'roost-release-owner-native-closure-v1',releaseId:f.release.id,operationId:f.retry.id,agentHostId:f.s.hostId,
  evidenceDigest:shared.releaseDigest(currentEvidence),checkpointDigest:'3'.repeat(64),controllerPid:100,registeredChildCount:59,allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:'2026-10-04T12:06:01.000Z'};
 const input={requestId:randomUUID(),expectedVersion:'4'.repeat(64),failedOperationId:f.retry.id,consentDigest:'5'.repeat(64),evidence:structuredClone(f.evidence),nativeClosure,
  absenceRevalidation:{schemaVersion:'roost-compose-failed-rollback-partial-closure-revalidation-v1',releaseId:f.release.id,failedOutcomeId:f.retry.outcome.id,
   failedEvidenceDigest:shared.releaseDigest(f.evidence),currentEvidence,nativeClosureDigest:shared.releaseDigest(nativeClosure),observedAt:currentEvidence.observedAt}};
 const state={release:f.release,journal:f.journal,revocations:[],expectedVersion:input.expectedVersion};return {...f,input,state};
}
test('sole failed rollback retry is an immutable observation, not completed recovery',()=>{const f=failedRollbackPartialFixture();
 assert(shared.outcomeSchema.safeParse({requestId:randomUUID(),status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:f.evidence}).success);
 assert.equal(shared.composeFailedRollbackPartialEvidenceError(f.snapshot,f.evidence,f.retry),null);
 assert.equal(shared.composeFailedRollbackPartialJournalError(f.snapshot,f.retry,f.evidence,f.journal),null);
 assert.equal(releaseOutcomeError(f.release,f.retry,{status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:f.evidence},f.journal),null);
 assert.equal(f.evidence.healthy,false);for(const k of ['deployedCommit','deployedTree','artifactSetDigest','deployedSetDigest'])assert.equal(f.evidence[k],undefined);
});
test('persisted terminal failure blocks every subsequent effect',()=>{const f=persisted(failedRollbackPartialFixture());
 for(const operation of shared.operations)assert.notEqual(releaseIntentError(f.release,{...f.retry.intent,requestId:randomUUID(),operation},f.journal),null);
});
const mutations:Record<string,(f:any)=>void>={
 healthy:f=>f.evidence.healthy=true,successSHA:f=>f.evidence.deployedCommit=f.s.baseCommit,successArtifacts:f=>f.evidence.artifactSetDigest=f.m.rollback.artifactSetDigest,
 absent:f=>f.evidence.absenceVerified=true,wrongQueue:f=>f.r.queue.deploymentId='wrong',headQueue:f=>f.r.queue.commit='HEAD',cancelled:f=>f.r.queue.status='cancelled-by-user',
 unfinished:f=>f.r.queue.finishedAt=null,queueBeforeIntent:f=>f.r.queue.createdAt='2026-10-04T12:04:59.999Z',queueFuture:f=>f.r.queue.finishedAt='2026-10-04T12:06:00.000Z',
 runningApp:f=>f.r.services.find((r:any)=>r.role==='app').state='running',newContainer:f=>f.r.services[0].containerId='0'.repeat(64),
 newImage:f=>f.r.partialRollbackFailure.images[0].imageDigest='sha256:'+'0'.repeat(64),writableDB:f=>f.r.partialRollbackFailure.databaseReadOnly=false,
 activeSession:f=>f.r.partialRollbackFailure.activeOtherSessions=1,transaction:f=>f.r.partialRollbackFailure.ownedTransactions=1,
 incomplete:f=>f.r.partialRollbackFailure.projectServiceSetComplete=false,missingRetained:f=>f.r.partialRollbackFailure.presentRollbackImageDigests.pop(),
 schema:f=>f.evidence.schemaDigest='0'.repeat(64),data:f=>f.evidence.dataDigest='0'.repeat(64),
 retryTwo:f=>f.r.partialRollbackFailure.retryOrdinal=2,wrongAbsence:f=>f.r.partialRollbackFailure.absenceEvidenceDigest='0'.repeat(64),
 unsavedAbsence:f=>f.rollback.outcome.status='uncertain',wrongAbsenceOutcome:f=>f.rollback.outcome.reconciledStatus='failed',
 insertedEffect:f=>f.journal.splice(f.journal.length-1,0,{id:randomUUID(),operation:'rollback_config',outcome:{status:'succeeded'}}),
 secondRetry:f=>f.journal.push({...f.retry,id:randomUUID()}),candidateRestamp:f=>f.r.partialRollbackFailure.candidateEvidence.observedAt='2026-10-04T12:04:00.000Z',
 wrongParameters:f=>f.retry.intent.parameters.commit=f.s.commit,wrongConfig:f=>f.r.configuration=structuredClone(f.target.configuration),
 unknownField:f=>f.r.partialRollbackFailure.successfulRollback=true
};
for(const [name,change] of Object.entries(mutations))test('failed rollback observation refuses '+name,()=>{const f=failedRollbackPartialFixture();change(f);
 assert.notEqual(shared.composeFailedRollbackPartialJournalError(f.snapshot,f.retry,f.evidence,f.journal),null);
 assert.notEqual(releaseOutcomeError(f.release,f.retry,{status:'reconciled',reconciledStatus:'failed',observationOnly:true,evidence:f.evidence},f.journal),null);
});
test('failed rollback cannot masquerade as success, absence or a non-observation failure',()=>{const f=failedRollbackPartialFixture();
 for(const input of [{status:'succeeded'},{status:'failed'},{status:'reconciled',reconciledStatus:'succeeded',observationOnly:true},
 {status:'reconciled',reconciledStatus:'absent',observationOnly:true},{status:'reconciled',reconciledStatus:'failed',observationOnly:false}])
 assert.notEqual(releaseOutcomeError(f.release,f.retry,{...input,evidence:f.evidence},f.journal),null);
});
test('fresh complete read and closed native tree allow FAILED retirement while preserving historical evidence',()=>{const f=failedRollbackPartialClosureFixture();
 assert(shared.closeFailedReleaseSchema.safeParse(f.input).success);assert.equal(releaseFailedClosureError(f.state,f.input),null);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,Date.parse('2026-10-04T12:06:02.000Z')),null);
 assert.equal(f.input.evidence.observedAt,'2026-10-04T12:05:03.000Z');assert.equal(f.input.evidence.healthy,false);
 assert.notEqual(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,Date.parse('2026-10-04T12:11:02.000Z')),null);
});
for(const name of ['failedOutcome','nativeDigest','nativeActive','currentData','currentImages','savedEvidence','staleVersion'])test('terminal closure refuses '+name,()=>{const f=failedRollbackPartialClosureFixture();
 if(name==='failedOutcome')f.input.absenceRevalidation.failedOutcomeId=randomUUID();if(name==='nativeDigest')f.input.absenceRevalidation.nativeClosureDigest='0'.repeat(64);
 if(name==='nativeActive')f.input.nativeClosure.allChildrenClosed=false;if(name==='currentData')f.input.absenceRevalidation.currentEvidence.dataDigest='0'.repeat(64);
 if(name==='currentImages')f.input.absenceRevalidation.currentEvidence.composeRecovery.partialRollbackFailure.images[0].imageDigest='sha256:'+'0'.repeat(64);
 if(name==='savedEvidence')f.input.evidence.observedAt='2026-10-04T12:05:04.000Z';if(name==='staleVersion')f.input.expectedVersion='0'.repeat(64);
 assert.notEqual(releaseFailedClosureError(f.state,f.input),null);
});
test('raw Prisma Dates preserve the complete terminal lineage',()=>{const f=failedRollbackPartialFixture();const raw=f.journal.map((row:any)=>{const r:any={...row};if(row.createdAt){r.created_at=new Date(row.createdAt);delete r.createdAt;}return r;});
 assert.equal(shared.composeFailedRollbackPartialJournalError(f.snapshot,raw.at(-1),f.evidence,raw),null);
});
