import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {configAbsenceFixture} from './governed-release-compose-config-absence.test';
import {releaseDigest,releasePublishedGitBasis,releaseFailedClosureError} from '../modules/agent-runtime/governed-release-contract';
import {closeFailedRelease} from '../modules/agent-runtime/governed-release';
import {wire} from '../modules/agent-runtime/task-review-contract';
const shared=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const baseline=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-baseline-revalidation.cjs'));
const hash=(c:string)=>c.repeat(64);
function setup(){
 const previous=configAbsenceFixture();previous.closed();
 const snapshot:any={...previous.input,...releasePublishedGitBasis(previous.state,previous.input)},releaseId=randomUUID(),now=Date.now();
 const original=structuredClone(previous.e),since=new Date(now-900000).toISOString();
 original.observedAt=new Date(now-600000).toISOString();Object.assign(original.composeConfigAbsence,{releaseId,operationId:randomUUID(),since});
 const operation:any={id:original.composeConfigAbsence.operationId,operation:'deploy_config',sequence:1,createdAt:since,intent:{parameters:{commit:snapshot.commit}},
  outcome:{id:randomUUID(),status:'reconciled',reconciled_status:'absent',observation_only:true,evidence:original}};
 const release:any={id:releaseId,snapshot,manifest_digest:snapshot.manifestDigest,workspace_id:randomUUID(),application_id:snapshot.applicationId,task_id:snapshot.taskId,
  host_id:snapshot.hostId,issuer_user_id:randomUUID(),expires_at:new Date(now+3600000)};
 const state:any={release,journal:[operation],revocations:[],renewals:[],failedClosures:[]};state.expectedVersion=releaseDigest(wire({release,journal:state.journal,revocations:[],renewals:[]}));
 const input:any={requestId:randomUUID(),expectedVersion:state.expectedVersion,failedOperationId:operation.id,consentDigest:hash('a'),evidence:structuredClone(original),
  nativeClosure:{...previous.body.nativeClosure,releaseId,operationId:operation.id,agentHostId:snapshot.hostId,evidenceDigest:releaseDigest(original),observedAt:new Date(now-500).toISOString()}};
 const b:any={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',...shared.releaseBaselineRevalidationBindings(snapshot),
  receiptDigest:hash('d'),observedAt:new Date(now-1000).toISOString(),actualReadTimes:Object.fromEntries(baseline.readKeys.map((k:string)=>[k,new Date(now-1000).toISOString()])),
  actualReadDigests:Object.fromEntries(baseline.readKeys.map((k:string)=>[k,hash('e')])),...Object.fromEntries(baseline.requiredParity.map((k:string)=>[k,true])),
  ...Object.fromEntries(baseline.zeroCounts.map((k:string)=>[k,0])),activeApplicationReleaseCount:1};
 b.revalidationDigest=shared.releaseBaselineRevalidationDigest(b);input.absenceRevalidation={releaseId,evidenceDigest:releaseDigest(original),baseline:b};
 const writes:any[]=[];const db:any={workspaceMembership:{findFirst:async()=>({role:'owner'})},
  event:{create:async()=>({})},evidenceRecord:{create:async()=>({})},
  $queryRaw:async(p:TemplateStringsArray)=>{const q=p.join('?');if(q.includes('pg_advisory_xact_lock'))return[];if(q.includes('FROM governed_releases'))return[release];
   if(q.includes('FROM governed_release_operations'))return state.journal;if(q.includes('FROM governed_release_revocations')||q.includes('FROM governed_release_renewals')||q.includes('FROM governed_release_failed_closures'))return[];throw Error('unexpected read');},
  $executeRaw:async(p:TemplateStringsArray,...values:any[])=>{writes.push({query:p.join('?'),values});return 1;}};
 const auth:any={authType:'user',workspaceId:release.workspace_id,userId:release.issuer_user_id,workspaceRole:'owner',authenticatedAt:Math.floor(now/1000)};
 return{snapshot:{...snapshot,releaseId},state,input,original,db,auth,writes,now};
}
function seal(f:any){f.input.absenceRevalidation.baseline.revalidationDigest=shared.releaseBaselineRevalidationDigest(f.input.absenceRevalidation.baseline);}
test('old exact absence plus fresh nine-read revalidation and new native closure keeps the immutable evidence',async()=>{
 const f=setup(),before=structuredClone(f.input.evidence);assert.equal(shared.closeFailedReleaseSchema.safeParse(f.input).success,true);
 assert.equal(shared.releaseConfigAbsenceRevalidationBindingError(f.snapshot,f.input),null);
 assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),null);assert.equal(releaseFailedClosureError(f.state,f.input),null);
 const result:any=await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input);assert.equal(result.error,undefined);assert.ok(result.closureId);
 assert.equal(f.writes.length,2);const retained=JSON.parse(f.writes[0].values.find((v:any)=>typeof v==='string'&&v.startsWith('{')));
 assert.deepEqual(retained.evidence,before);assert.equal(retained.failedEvidenceDigest,releaseDigest(before));assert.deepEqual(f.state.journal[0].outcome.evidence,before);
 assert.equal(retained.absenceRevalidation.baseline.activeApplicationReleaseCount,1);
});
test('old absence without full revalidation retains the existing stale rejection and makes no writes',async()=>{
 const f=setup();delete f.input.absenceRevalidation;assert.equal(releaseFailedClosureError(f.state,f.input),null);
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input),{error:'release_outcome_evidence_stale'});assert.equal(f.writes.length,0);
});
test('fresh original evidence retains legacy closure behavior without optional revalidation',async()=>{
 const f=setup();delete f.input.absenceRevalidation;f.input.evidence.observedAt=new Date(f.now-1000).toISOString();f.state.journal[0].outcome.evidence=structuredClone(f.input.evidence);
 f.input.nativeClosure.evidenceDigest=releaseDigest(f.input.evidence);f.input.expectedVersion=releaseDigest(wire({release:f.state.release,journal:f.state.journal,revocations:[],renewals:[]}));
 const result:any=await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input);assert.equal(result.error,undefined);assert.equal(f.writes.length,2);
});
test('revalidation rejects stale or future component clocks, even with a fresh wrapper and recomputed seal',async()=>{
 for(const offset of [-300001,1])for(const k of baseline.readKeys){const f=setup();f.input.absenceRevalidation.baseline.actualReadTimes[k]=new Date(f.now+offset).toISOString();seal(f);
  assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),offset<0?'release_prerequisite_stale':'release_config_absence_revalidation_invalid');}
 const f=setup();f.input.absenceRevalidation.baseline.actualReadTimes.inventory=new Date(f.now-600000).toISOString();seal(f);
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input),{error:'release_prerequisite_stale'});assert.equal(f.writes.length,0);
});
test('timestamp-only proof, missing read, zero-or-multiple active releases and unknown fields are refused',()=>{
 for(const change of [(f:any)=>f.input.absenceRevalidation.baseline={observedAt:new Date(f.now).toISOString()},
  (f:any)=>delete f.input.absenceRevalidation.baseline.actualReadTimes.health,(f:any)=>delete f.input.absenceRevalidation.baseline.actualReadDigests.queue,
  (f:any)=>f.input.absenceRevalidation.baseline.activeApplicationReleaseCount=0,(f:any)=>f.input.absenceRevalidation.baseline.activeApplicationReleaseCount=2,
  (f:any)=>f.input.absenceRevalidation.waiver=true]){const f=setup();change(f);assert.equal(shared.closeFailedReleaseSchema.safeParse(f.input).success,false);assert.ok(shared.releaseConfigAbsenceRevalidationBindingError(f.snapshot,f.input));}
});
test('wrong release, original evidence hash, immutable baseline, images or unsafe state cannot requalify absence',()=>{
 for(const change of [(f:any)=>f.input.absenceRevalidation.releaseId=randomUUID(),(f:any)=>f.input.absenceRevalidation.evidenceDigest=hash('f'),
  (f:any)=>f.input.absenceRevalidation.baseline.baseline.dataDigest=hash('f'),(f:any)=>f.input.absenceRevalidation.baseline.targetBaselineDigest=hash('f'),
  (f:any)=>f.input.absenceRevalidation.baseline.candidateQueueCount=1,(f:any)=>f.input.absenceRevalidation.baseline.databaseReadOnly=false,
  (f:any)=>f.input.absenceRevalidation.baseline.writerLockAbsent=false]){const f=setup();change(f);seal(f);assert.ok(shared.releaseConfigAbsenceRevalidationBindingError(f.snapshot,f.input));}
 const f=setup();delete f.snapshot.publishedGitBasis;assert.ok(shared.releaseConfigAbsenceRevalidationBindingError(f.snapshot,f.input));
});
test('new native attestation must follow the new actual read and stay within five minutes',async()=>{
 for(const offset of [-1001,-300001,120001]){const f=setup();f.input.nativeClosure.observedAt=new Date(f.now+offset).toISOString();
  assert.equal(shared.releaseConfigAbsenceRevalidationError(f.snapshot,f.input,f.now),'release_native_closure_stale');
  const result:any=await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input);assert.equal(result.error,'release_native_closure_stale');assert.equal(f.writes.length,0);
 }
});
test('invalid optional revalidation is rejected even when original evidence is fresh',async()=>{
 const f=setup();f.input.evidence.observedAt=new Date(f.now-1000).toISOString();f.state.journal[0].outcome.evidence=structuredClone(f.input.evidence);f.input.nativeClosure.evidenceDigest=releaseDigest(f.input.evidence);
 f.input.expectedVersion=releaseDigest(wire({release:f.state.release,journal:f.state.journal,revocations:[],renewals:[]}));
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input),{error:'release_config_absence_revalidation_invalid'});assert.equal(f.writes.length,0);
});
test('a later component read cannot hide behind an earlier aggregate time or native closure',async()=>{
 const f=setup();f.input.absenceRevalidation.baseline.actualReadTimes.maintenance=new Date(f.now-200).toISOString();seal(f);
 assert.equal(shared.releaseConfigAbsenceRevalidationBindingError(f.snapshot,f.input),'release_config_absence_revalidation_invalid');
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input),{error:'release_config_absence_revalidation_invalid'});assert.equal(f.writes.length,0);
});
test('stale owner authentication cannot acquire closure authority from fresh read evidence',async()=>{
 const f=setup();f.auth.authenticatedAt=Math.floor((f.now-301000)/1000);
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,f.state.release.id,f.auth,f.input),{error:'release_fresh_owner_required'});assert.equal(f.writes.length,0);
});
