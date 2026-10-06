import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {partialFixture} from './governed-release-compose-partial-recovery-contract.test';
import {releaseOutcomeError,releaseIntentError} from '../modules/agent-runtime/governed-release-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const compose=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
// Synthetic facts only. Unknown image revision is an actual observed field,
// never inferred image code provenance, deployed version or candidate health.
export function partialImageAttributionFixture(){const f:any=partialFixture(),p=f.r.partial;
 p.schemaVersion='roost-compose-failed-partial-runtime-v2';
 p.sourceAttribution='failed_queue_exact_reference_and_runtime_environment';p.candidateCodeProvenanceVerified=false;
 p.images=p.images.map((image:any)=>({...image,imageRef:`${f.target.targetId}_${image.name}:${f.s.commit}`,
  createdAt:'2026-10-04T12:03:01.500Z',buildRevision:'unknown',revisionLabel:null,treeLabel:null}));
 return f;
}
test('failed v2 preserves actual unknown revision with exact intended queue attribution and false code provenance',()=>{
 const f=partialImageAttributionFixture();assert(shared.composeFailedPartialV2Schema.safeParse(f.r.partial).success);
 assert(shared.composeFailedPartialSchema.safeParse(f.r.partial).success);assert(shared.composeRecoverySchema.safeParse(f.r).success);
 assert.equal(shared.composeFailedPartialEvidenceError(f.snapshot,f.evidence,f.op),null);
 for(const outcome of [{status:'failed',observationOnly:false},{status:'reconciled',reconciledStatus:'failed',observationOnly:true}])
  assert.equal(releaseOutcomeError(f.release,f.op,{...outcome,evidence:f.evidence}),null);
 assert(f.r.partial.images.every((i:any)=>i.buildRevision==='unknown'));assert.equal(f.r.partial.candidateCodeProvenanceVerified,false);
 assert.equal((f.evidence as any).deployedCommit,undefined);assert.equal((f.evidence as any).deployedSetDigest,undefined);
});
test('mixed real unknown and exact revisions allow null or exact labels without source certification',()=>{
 const f=partialImageAttributionFixture(),i=f.r.partial.images[1];i.buildRevision=f.s.commit;i.revisionLabel=f.s.commit;i.treeLabel=f.s.candidateTree;
 assert.equal(shared.composeFailedPartialEvidenceError(f.snapshot,f.evidence,f.op),null);
 assert.equal(f.r.partial.candidateCodeProvenanceVerified,false);
});
const changes:Record<string,(f:any)=>void>={
 allKnown:f=>f.r.partial.images.forEach((i:any)=>i.buildRevision=f.s.commit),unknownToNull:f=>f.r.partial.images[0].buildRevision=null,
 unknownToAbsent:f=>delete f.r.partial.images[0].buildRevision,unknownToEmpty:f=>f.r.partial.images[0].buildRevision='',
 wrongBuild:f=>f.r.partial.images[0].buildRevision=f.s.baseCommit,wrongRevisionLabel:f=>f.r.partial.images[0].revisionLabel=f.s.baseCommit,
 wrongTreeLabel:f=>f.r.partial.images[0].treeLabel=f.s.baseTree,missingRevisionLabel:f=>delete f.r.partial.images[0].revisionLabel,
 missingTreeLabel:f=>delete f.r.partial.images[0].treeLabel,objectRevisionLabel:f=>f.r.partial.images[0].revisionLabel={sha:f.s.commit},
 beforeQueue:f=>f.r.partial.images[0].createdAt='2026-10-04T12:03:00.900Z',afterQueue:f=>f.r.partial.images[0].createdAt='2026-10-04T12:03:06.000Z',
 afterContainer:f=>f.r.partial.images[0].createdAt='2026-10-04T12:03:02.100Z',missingCreation:f=>delete f.r.partial.images[0].createdAt,
 nullCreation:f=>f.r.partial.images[0].createdAt=null,badCreation:f=>f.r.partial.images[0].createdAt='not a date',
 wrongTargetTag:f=>f.r.partial.images[0].imageRef='foreign_'+f.r.partial.images[0].name+':'+f.s.commit,
 wrongServiceTag:f=>f.r.partial.images[0].imageRef=f.target.targetId+'_foreign:'+f.s.commit,
 wrongCommitTag:f=>f.r.partial.images[0].imageRef=f.target.targetId+'_'+f.r.partial.images[0].name+':'+f.s.baseCommit,
 headTag:f=>f.r.partial.images[0].imageRef=f.target.targetId+'_'+f.r.partial.images[0].name+':HEAD',
 missingTag:f=>delete f.r.partial.images[0].imageRef,codeProvenanceTrue:f=>f.r.partial.candidateCodeProvenanceVerified=true,
 missingProvenance:f=>delete f.r.partial.candidateCodeProvenanceVerified,missingAttribution:f=>delete f.r.partial.sourceAttribution,
 sourceCertified:f=>f.r.partial.sourceAttribution='verified_source',imageExtra:f=>f.r.partial.images[0].sourceVerified=true,
 partialExtra:f=>f.r.partial.sourceVerified=true,wrongImage:f=>f.r.partial.images[0].imageDigest='sha256:'+'0'.repeat(64),
 wrongQueue:f=>f.r.partial.images[0].deploymentId='otherqueue',wrongRuntime:f=>f.r.services.find((r:any)=>r.role==='app').commit=f.s.baseCommit,
 fakeHealth:f=>f.evidence.healthy=true,fakeVersion:f=>f.evidence.deployedCommit=f.s.commit,
 wrongData:f=>f.evidence.dataDigest='0'.repeat(64),wrongSchema:f=>f.evidence.schemaDigest='0'.repeat(64),
 openDatabase:f=>f.r.partial.databaseReadOnly=false,foreignSessions:f=>f.r.partial.activeOtherSessions=1,
 missingRollback:f=>f.r.partial.presentRollbackImageDigests.pop(),runningApp:f=>f.r.services.find((r:any)=>r.role==='app').state='running',
 passedMigration:f=>f.r.services.find((r:any)=>r.role==='migration').exitCode=0,queueFinished:f=>f.r.queue.status='finished',
};
for(const [name,change]of Object.entries(changes))test('v2 attribution refuses '+name,()=>{
 const f=partialImageAttributionFixture();change(f);try{f.evidence.currentServiceSetDigest=compose.composeRuntimeSetDigest(f.r.services);}catch{}
 assert.notEqual(shared.composeFailedPartialEvidenceError(f.snapshot,f.evidence,f.op),null);
 assert.notEqual(releaseOutcomeError(f.release,f.op,{status:'failed',observationOnly:false,evidence:f.evidence}),null);
});
test('v2 cannot promote success, absence, smoke or repeat candidate; only preapproved rollback remains',()=>{
 const f=partialImageAttributionFixture(),failure={...f.op,outcome:{status:'failed',evidence:f.evidence}},journal=[
  {id:randomUUID(),operation:'merge',outcome:{status:'succeeded'}},failure];
 for(const o of [{status:'succeeded'},{status:'reconciled',reconciledStatus:'succeeded',observationOnly:true},
  {status:'reconciled',reconciledStatus:'absent',observationOnly:true}])assert.notEqual(releaseOutcomeError(f.release,f.op,{...o,evidence:f.evidence}),null);
 for(const operation of ['deploy','deploy_config','push','pr','merge','smoke'])assert.equal(
  releaseIntentError(f.release,{...f.op.intent,requestId:randomUUID(),operation},journal),'release_compose_partial_failure_requires_rollback');
 assert.equal(releaseIntentError(f.release,{...f.op.intent,requestId:randomUUID(),operation:'rollback_config',parameters:{
  commit:f.m.rollback.commit,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest}},journal),null);
});
test('known v1 history remains valid and cannot acquire v2 unknown attribution fields',()=>{
 const f=partialFixture();assert(shared.composeFailedPartialV1Schema.safeParse(f.r.partial).success);
 assert.equal(shared.composeFailedPartialEvidenceError(f.snapshot,f.evidence,f.op),null);
 f.r.partial.images[0].buildRevision='unknown';assert.equal(shared.composeFailedPartialSchema.safeParse(f.r.partial).success,false);
 assert.notEqual(shared.composeFailedPartialEvidenceError(f.snapshot,f.evidence,f.op),null);
});
