import assert from 'node:assert/strict';
import test from 'node:test';
import {firstWriteGate,managedAdmissionInput} from '../modules/agent-runtime/managed-admission';
import {releaseDigest} from '../modules/agent-runtime/governed-release-contract';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const workspace=id(1),taskId=id(2),applicationId=id(3),host=id(4),installation=id(5),owner=id(6),priorId=id(7);
 const branch=`codex/task-${taskId}`,baseline='a'.repeat(40),commit='b'.repeat(40),tree='c'.repeat(40),hash='d'.repeat(64);
 const approval={schemaVersion:'roost-first-write-approval-v1',taskId,applicationId,installationId:installation,branch,baselineCommit:baseline,
  auditorExecutionId:id(8),verifierExecutionId:id(9),auditorEvidenceDigest:hash,verifierEvidenceDigest:'e'.repeat(64),
  capabilities:['repository_read','repository_write','local_test'],operations:{localCommit:true},remotePush:false,deployment:false,financialWrites:false};
 const canary=(eid:string,tid:string,agent:string,kind:string,evidenceDigest:string,at:string)=>({id:eid,taskId:tid,agentHostId:host,
  status:'completed',completedAt:new Date(at),changedFiles:[],metadata:{executionContract:{nativeBoundary:{profile:'inspect-readonly',inspectReadOnly:{kind}},
   access:{tools:['repository_read'],permissions:['repository_read']},assignment:{agentId:agent}},resultRevision:{commit:baseline,workingTree:'clean'}},
  verification:{readOnlyAudit:{schemaVersion:'roost-readonly-audit-v1',verdict:'verified',evidenceDigest,preTree:hash,postTree:hash,
   processState:'unchanged',dockerState:'unchanged',gitState:'unchanged',nativeTools:[],
   ...(kind==='verifier'?{verifiedExecutionId:id(8),verifiedEvidenceDigest:hash}:{})}}});
 const canaries=[canary(id(8),id(10),id(12),'auditor',hash,'2026-09-27T09:00:00Z'),
  canary(id(9),id(11),id(13),'verifier','e'.repeat(64),'2026-09-27T09:30:00Z')];
 const contract={nativeBoundary:{profile:'coding-local'},modelSelection:{schemaVersion:'roost-managed-hermes-backend-v1',backend:'codex_responses'}};
 const nativeToolReceipt={postFootprintDigest:hash,jobReceiptDigest:hash,footprintPolicy:'roost-root-scoped-coding-v2',scopeReviewRequired:false,
  policyVersion:'roost-hermes-native-audited-coding-v1',ownerRiskReference:'ADR-004-v7-native-tools',authorityProfile:'coding-local',
  authorities:['repository_read','repository_write','local_test'],toolsets:['file','terminal'],classification:'review_required',releaseAllowed:false,reviewRequired:true,violations:[]};
 const nativeReviewReceipt={version:'roost-native-review-public-v2',policy:'roost-root-scoped-coding-v2',verdict:'verified_candidate',verification:'PASS',installation:'PASS',
  reviewRequired:true,releaseAllowed:false,scopeReviewRequired:false,violations:[],postFootprintDigest:hash,jobDigest:hash};
 const previous={id:priorId,taskId,applicationId,agentHostId:host,status:'completed',completedAt:new Date(),contextInvalidatedAt:null,
  metadata:{executionContract:contract,resultRevision:{commit,branch,workingTree:'clean'}},verification:{
   managedAdmission:{qualification:'signed_native_v1',evidenceDigest:hash,jobSourceDigest:hash},ownedTreeReceipt:{cleanup:true,activeProcesses:0,attempt:priorId},
   nativeToolReceipt,nativeReviewReceipt,nativeReviewReceiptDigest:hash,
   localCommit:{commit,tree,branch,decisionId:id(14),taskId,executionId:priorId,baselineCommit:baseline}}};
 const review={id:id(15),decision:'approve',materialVersion:hash,evidence:{reviewedCommit:commit},execution:previous};
 const pointer={releaseId:id(16),closureId:id(17),consentDigest:hash,previousExecutionId:priorId,previousCommit:commit};
 const receipt={releaseId:pointer.releaseId,issuerUserId:owner,consentDigest:hash};
 const closure={id:pointer.releaseId,workspace_id:workspace,task_id:taskId,application_id:applicationId,host_id:host,issuer_user_id:owner,
  release_snapshot:{taskId,applicationId,hostId:host,commit,candidateTree:tree,baseCommit:baseline,reviewId:review.id,materialVersion:hash},
  closure_id:pointer.closureId,consent_digest:hash,closure_digest:releaseDigest(receipt),closure_snapshot:receipt,
  revocation_reason:`Closed FAILED; owner baseline receipt ${pointer.closureId}`,proven:true};
 const execution={id:id(18),taskId,applicationId,agentHostId:host};
 const pin={riskAdmissionCommit:commit,contract:{nativeBoundary:{profile:'coding-local',existingCommitVerification:structuredClone(pointer)},singleTask:{branch}}};
 const db:any={$queryRaw:async(parts:TemplateStringsArray)=>parts.join('').includes('FROM governed_releases')?[closure]:[{id:id(14),at:new Date('2026-09-27T10:00:00Z'),body:{firstWriteApproval:approval}}],
  agentExecution:{findMany:async()=>canaries},taskReviewDecision:{findFirst:async(args:any)=>{assert.equal(args.where.id,review.id);return review;}}};
 const run=(requested:any=pointer)=>firstWriteGate(db,workspace,installation,execution,pin,owner,requested);
 return {pointer,pin,closure,review,previous,execution,run,db,owner,workspace,installation,approval,baseline,commit,branch};
}
test('owner FAILED baseline lineage admits exact existing candidate verification without fabricated rejection or write authority',async()=>{
 const f=fixture();assert.equal(f.review.decision,'approve');
 const result:any=await f.run();assert.deepEqual(result,{decisionId:id(14),baselineCommit:f.commit,branch:f.branch,operations:{localCommit:false},
  operation:'verify_existing_local_commit',existingCommitVerification:{...f.pointer,closureDigest:f.closure.closure_digest}});
 assert.equal('continuation' in result,false);
});
test('restart admission requires the same explicit pointer in request and current server Ready contract',async()=>{
 const f=fixture();await assert.rejects(f.run({...f.pointer,closureId:id(20)}),/managed_admission_denied/);
 await assert.rejects(firstWriteGate(f.db,f.workspace,f.installation,f.execution,f.pin,f.owner),/managed_admission_denied/);
 const missing=structuredClone(f.pin);delete (missing.contract.nativeBoundary as any).existingCommitVerification;
 await assert.rejects(firstWriteGate(f.db,f.workspace,f.installation,f.execution,missing,f.owner,f.pointer),/managed_admission_denied/);
});
test('restart cannot forge closure, approval, candidate, parent, native proof, owner or scope',async()=>{
 const mutations=[(f:any)=>f.closure.proven=false,(f:any)=>f.closure.consent_digest='f'.repeat(64),
  (f:any)=>f.closure.closure_digest='f'.repeat(64),(f:any)=>f.closure.revocation_reason='unrelated revocation',
  (f:any)=>f.closure.closure_snapshot.issuerUserId=id(20),(f:any)=>f.closure.task_id=id(20),
  (f:any)=>f.closure.host_id=id(20),(f:any)=>f.closure.application_id=id(20),(f:any)=>f.closure.issuer_user_id=id(20),
  (f:any)=>f.closure.release_snapshot.commit=f.baseline,(f:any)=>f.closure.release_snapshot.baseCommit='f'.repeat(40),
  (f:any)=>f.review.decision='reject',(f:any)=>f.review.materialVersion='f'.repeat(64),
  (f:any)=>f.review.evidence.reviewedCommit=f.baseline,(f:any)=>f.previous.id=id(20),
  (f:any)=>f.previous.status='failed',(f:any)=>f.previous.contextInvalidatedAt=new Date(),
  (f:any)=>f.previous.metadata.resultRevision.workingTree='dirty',
  (f:any)=>f.previous.verification.localCommit.decisionId=id(20),(f:any)=>f.previous.verification.localCommit.tree='f'.repeat(40),
  (f:any)=>f.previous.verification.localCommit.baselineCommit='f'.repeat(40),
  (f:any)=>f.previous.verification.managedAdmission.qualification='mock',
  (f:any)=>f.previous.verification.nativeReviewReceipt.verdict='rejected',
  (f:any)=>f.pin.riskAdmissionCommit='f'.repeat(40),(f:any)=>f.execution.id=f.pointer.previousExecutionId];
 for(const mutate of mutations){const f=fixture();mutate(f);await assert.rejects(f.run(),/managed_admission_denied/);}
});
test('all three admission requests accept only strict restart pointer shape',()=>{
 const f=fixture(),base={schemaVersion:'roost-managed-admission-v1',phase:'first_write',leaseToken:id(21),executionId:f.execution.id,existingCommitVerification:f.pointer};
 const hash='d'.repeat(64),requests=[base,{...base,phase:'backend_evidence',source:{selection:{},context:{},runtime:{},installationIdentity:hash,
  profile:{identity:hash,digest:hash},availability:{backend:'installed',model:'selected_unverified',resources:'bounded_by_worker'},ownerAttestation:{}}},
  {...base,phase:'decision',provider:{},scope:{},installation:{id:f.installation,identity:hash,configurationIdentity:hash},evidenceDigest:hash}];
 for(const request of requests){
  assert.equal(managedAdmissionInput.safeParse(request).success,true);
  for(const pointer of [{...f.pointer,closureDigest:hash},{...f.pointer,continuation:{reviewId:id(15)}},
   {...f.pointer,previousCommit:'not-a-commit'}])assert.equal(managedAdmissionInput.safeParse({...request,existingCommitVerification:pointer}).success,false);
 }
});
