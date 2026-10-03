import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { successorFixture } from "./governed-release-successor.test";
import { closeFailedRelease,authorizeReleaseReconciliation,releaseOutcome,releaseIntent,releaseView } from "../modules/agent-runtime/governed-release";
import { createReleaseSchema,releaseDigest,releaseFailedClosureError,releasePublishedGitBasis,releaseHasPublishedGitBasis,releaseIntentError,releaseSuccessorBasis,releaseRestartProtectedResourceIds } from "../modules/agent-runtime/governed-release-contract";
import { wire } from "../modules/agent-runtime/task-review-contract";

export function baselineRestartFixture() {
 const f=successorFixture(true),state=f.state,r=state.release,s=r.snapshot;
 const failed=state.journal.find((j:any)=>j.outcome.reconciled_status==="failed");
 state.journal=state.journal.slice(0,state.journal.indexOf(failed)+1);
 for(const j of state.journal){j.created_at=new Date();j.request_hash=`fixture-${j.sequence}`;j.outcome.id=randomUUID();}
 r.application_id=s.applicationId;r.host_id=s.hostId;r.task_id=s.taskId;r.releaser_agent_id=s.releaserAgentId;r.releaser_credential_id=s.releaserCredentialId;r.credential_version=1;r.expires_at=new Date(Date.now()-60000);
 state.expectedVersion=releaseDigest(wire({release:r,journal:state.journal,revocations:[],renewals:[]}));
 const evidence:any=f.evidence(true);const actual=failed.outcome.evidence.deployedTargets[0];
 Object.assign(evidence.deployedTargets.find((t:any)=>t.targetId===actual.targetId),{imageDigest:actual.imageDigest,deploymentId:actual.deploymentId});
 evidence.deploymentIds=evidence.deployedTargets.map((t:any)=>({targetId:t.targetId,deploymentId:t.deploymentId}));
 evidence.deployedSetDigest=releaseDigest(evidence.deployedTargets.map(({healthy,deploymentId,...row}:any)=>row));
 const body={requestId:randomUUID(),expectedVersion:state.expectedVersion,failedOperationId:failed.id,consentDigest:"a".repeat(64),evidence};
 const closureId=randomUUID(),revocationId=randomUUID();
 const receipt=wire({...body,releaseId:r.id,applicationId:r.application_id,hostId:r.host_id,issuerUserId:r.issuer_user_id,
  ownerAuthenticatedAt:new Date(),failedOutcomeId:failed.outcome.id,failedEvidenceDigest:releaseDigest(failed.outcome.evidence)});
 const closure={id:closureId,release_id:r.id,revocation_id:revocationId,consent_digest:body.consentDigest,closure_digest:releaseDigest(receipt),snapshot:receipt};
 const input=structuredClone(s);input.requestId=randomUUID();input.reviewId=randomUUID();input.materialVersion="b".repeat(64);input.releaseExecutionId=randomUUID();
 for(const t of input.manifest.deployment.targets)t.baseline.imageDigest=evidence.deployedTargets.find((row:any)=>row.targetId===t.targetId).imageDigest;
 input.manifest.cleanup.protectedResourceIds=releaseRestartProtectedResourceIds(s.manifest,evidence)!;
 input.manifestDigest=releaseDigest(input.manifest);
 const closed=()=>{state.failedClosures=[closure];state.revocations=[{id:revocationId,release_id:r.id,reason:`Closed FAILED; owner baseline receipt ${closureId}`}];state.expectedVersion=releaseDigest(wire({release:r,journal:state.journal,revocations:state.revocations,renewals:[]}));input.baselineRestart={releaseId:r.id,expectedVersion:state.expectedVersion,closureId,consentDigest:body.consentDigest};return state;};
 return {state,input,body,failed,closure,closed};
}
test("owner adopted actual image closes FAILED without fabricating successful old recovery",()=>{
 const f=baselineRestartFixture();assert.equal(releaseFailedClosureError(f.state,f.body),null);
 const before=structuredClone(f.state.release);f.closed();const basis=releasePublishedGitBasis(f.state,f.input);
 assert.ok(basis.publishedGitBasis,JSON.stringify(basis));assert.deepEqual(f.state.release,before);
 assert.equal(releaseHasPublishedGitBasis({...f.input,...basis}),true);assert.equal(createReleaseSchema.safeParse(f.input).success,true);
 assert.equal(createReleaseSchema.safeParse({...f.input,...basis}).success,false);
 assert.equal(createReleaseSchema.safeParse({...f.input,predecessor:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion}}).success,false);
 assert.equal(releaseSuccessorBasis(f.state,{...f.input,predecessor:{releaseId:f.state.release.id,expectedVersion:f.state.expectedVersion}}).error,"release_predecessor_binding_changed");
 const s={...f.input,...basis},intent:any={operation:"deploy_config",commit:s.commit,baseCommit:s.baseCommit,manifestDigest:s.manifestDigest,
  observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},parameters:{commit:s.commit,artifactSetDigest:s.manifest.deployment.artifactSetDigest,configDigest:s.manifest.deployment.configDigest,schemaDigest:s.manifest.deployment.schemaDigest}};
 assert.equal(releaseIntentError({snapshot:s,manifest_digest:s.manifestDigest},intent,[]),null);
 for(const operation of ["push","pr","review","merge"])assert.equal(releaseIntentError({snapshot:s,manifest_digest:s.manifestDigest},{...intent,operation},[]),"release_successor_git_effect_forbidden");
});
test("restart protection preserves the original footprint and appends only attested images in target order",()=>{
 const f=baselineRestartFixture(),m=f.state.release.snapshot.manifest,original=structuredClone(m.cleanup.protectedResourceIds);
 const images=m.deployment.targets.map((t:any)=>f.body.evidence.deployedTargets.find((r:any)=>r.targetId===t.targetId).imageDigest);
 assert.deepEqual(f.input.manifest.cleanup.protectedResourceIds,[...original,...images]);
 const reversed={...f.body.evidence,deployedTargets:f.body.evidence.deployedTargets.slice().reverse()};
 assert.deepEqual(releaseRestartProtectedResourceIds(m,reversed),[...original,...images]);
 const already=structuredClone(m);already.cleanup.protectedResourceIds.push(images[1]);
 assert.deepEqual(releaseRestartProtectedResourceIds(already,reversed),[...original,images[1],images[0]]);
 const duplicate={...f.body.evidence,deployedTargets:[f.body.evidence.deployedTargets[0],f.body.evidence.deployedTargets[0]]};
 assert.equal(releaseRestartProtectedResourceIds(m,duplicate),null);
 for(const mutate of [(ids:string[])=>ids.pop(),(ids:string[])=>ids.shift(),(ids:string[])=>ids.reverse(),
  (ids:string[])=>ids.push(`sha256:${"f".repeat(64)}`),(ids:string[])=>ids.push(ids.at(-1)!),
  (ids:string[])=>{[ids[ids.length-1],ids[ids.length-2]]=[ids[ids.length-2],ids[ids.length-1]];}]){
  const g=baselineRestartFixture();g.closed();mutate(g.input.manifest.cleanup.protectedResourceIds);
  assert.equal(releasePublishedGitBasis(g.state,g.input).error,"release_restart_binding_changed");
 }
 f.closed();f.input.manifest.cleanup.ownedResourceIds=["foreign"];
 assert.equal(releasePublishedGitBasis(f.state,f.input).error,"release_restart_binding_changed");
 assert.deepEqual(m.cleanup.protectedResourceIds,original);
});
test("closure refuses unknown history, forged failure, unhealthy, changed source/config/schema/data or foreign queues",()=>{
 const mutations=[(f:any)=>f.state.journal[0].outcome=null,(f:any)=>f.failed.outcome.reconciled_status="uncertain",(f:any)=>f.body.expectedVersion="0".repeat(64),
  (f:any)=>f.body.evidence.healthy=false,(f:any)=>delete f.body.evidence.observationSeconds,(f:any)=>f.body.evidence.deployedTargets[0].commit="0".repeat(40),
  (f:any)=>f.body.evidence.deployedTargets[0].tree="0".repeat(40),(f:any)=>f.body.evidence.configDigest="0".repeat(64),(f:any)=>f.body.evidence.schemaDigest="0".repeat(64),
  (f:any)=>f.body.evidence.dataDigest="0".repeat(64),(f:any)=>f.body.evidence.repositoryArchived=true,(f:any)=>f.body.evidence.localAbsent=true,
  (f:any)=>{f.body.evidence.deployedTargets[0].deploymentId="foreign";f.body.evidence.deploymentIds[0].deploymentId="foreign";},
  (f:any)=>f.body.evidence.deployedTargets[0].imageDigest=f.state.release.snapshot.manifest.deployment.targets[0].baseline.imageDigest];
 for(const mutate of mutations){const f=baselineRestartFixture();mutate(f);assert.ok(releaseFailedClosureError(f.state,f.body));}
});
test("restart requires immutable closure, exact publication and accepted baseline; new review remains separate",()=>{
 for(const mutate of [(f:any)=>f.input.baselineRestart.expectedVersion="0".repeat(64),(f:any)=>f.input.baselineRestart.consentDigest="0".repeat(64),
  (f:any)=>f.state.failedClosures=[],(f:any)=>f.state.revocations=[],(f:any)=>f.closure.snapshot.evidence.healthy=false,
  (f:any)=>f.input.manifest.deployment.targets[0].baseline.imageDigest=`sha256:${"f".repeat(64)}`,
  (f:any)=>f.input.commit="0".repeat(40),(f:any)=>f.input.baseCommit=f.input.commit,
  (f:any)=>f.input.reviewId=f.state.release.snapshot.reviewId,(f:any)=>f.input.releaseExecutionId=f.state.release.snapshot.releaseExecutionId,
  (f:any)=>f.state.journal.find((j:any)=>j.operation==="merge").outcome.evidence.mergedCommit="0".repeat(40)]) {
  const f=baselineRestartFixture();f.closed();mutate(f);assert.ok(releasePublishedGitBasis(f.state,f.input).error);
 }
});
function apiFixture(pending=false) {
 const f=baselineRestartFixture(),r=f.state.release,auth:any={authType:"user",workspaceId:r.workspace_id,userId:r.issuer_user_id,workspaceRole:"owner",authenticatedAt:Math.floor(Date.now()/1000)},newKey=randomUUID();
 if(pending)f.failed.outcome={status:"uncertain",id:randomUUID(),evidence:{}};
 f.state.expectedVersion=releaseDigest(wire({release:r,journal:f.state.journal,revocations:[],renewals:[]}));f.body.expectedVersion=f.state.expectedVersion;
 const mappings:any[]=[],closures:any[]=[],writes:string[]=[],db:any={workspaceMembership:{findFirst:async()=>({role:"owner"})},
  apiKey:{findFirst:async()=>({id:newKey,workspaceId:r.workspace_id,boundAgentId:r.releaser_agent_id,active:true,expiresAt:new Date(Date.now()+3600000),credentialVersion:1,
   scopes:["agent-runtime:write","agent-runtime:release"],boundAgent:{id:r.releaser_agent_id,workspaceId:r.workspace_id,type:"agent",source:"system",status:"active"}})},
  event:{create:async()=>{}},evidenceRecord:{create:async()=>{}},
  $queryRaw:async(parts:TemplateStringsArray,...values:any[])=>{const sql=parts.join("?");if(sql.includes("pg_advisory_xact_lock")||sql.includes("FOR UPDATE"))return [];
   if(sql.includes("FROM governed_releases"))return [r];if(sql.includes("FROM governed_release_operations"))return f.state.journal;
   if(sql.includes("FROM governed_release_revocations"))return f.state.revocations;if(sql.includes("FROM governed_release_renewals"))return [];
   if(sql.includes("FROM governed_release_failed_closures"))return sql.includes("request_id")?[]:closures;
   if(sql.includes("FROM governed_release_reconciliation_authorizations"))return sql.includes("request_id")?[]:mappings;
   if(sql.includes("FROM governed_release_outcomes"))return [];
   throw Error(`Unexpected read ${sql}`);},
  $executeRaw:async(parts:TemplateStringsArray,...v:any[])=>{const sql=parts.join("?");writes.push(sql);
   if(sql.includes("INSERT INTO governed_release_reconciliation_authorizations"))mappings.push({id:v[0],release_id:v[1],credential_id:v[6],credential_version:v[7],operation_ids:JSON.parse(v[11]),snapshot:JSON.parse(v[13])});
   else if(sql.includes("INSERT INTO governed_release_failed_closures"))closures.push({id:v[0],snapshot:JSON.parse(v[11])});
   else if(sql.includes("INSERT INTO governed_release_revocations"))f.state.revocations.push({id:v[0],reason:v[4]});return 1;}};
 return {...f,auth,newKey,db,mappings,writes};
}
test("API owner closure requires fresh auth and writes receipt plus revocation, never old grant or journal",async()=>{
 const f=apiFixture();const before=structuredClone(f.state.release);
 assert.deepEqual(await closeFailedRelease(f.db,f.auth.workspaceId,before.id,{...f.auth,authenticatedAt:f.auth.authenticatedAt-301},f.body),{error:"release_fresh_owner_required"});assert.equal(f.writes.length,0);
 const result:any=await closeFailedRelease(f.db,f.auth.workspaceId,before.id,f.auth,f.body);assert.equal(result.status,"failed");assert.equal(f.writes.length,2);assert.deepEqual(f.state.release,before);
});
test("normal new key may only read and reconcile owner mapped old pending ops; never old effects",async()=>{
 const f=apiFixture(true),r=f.state.release,body={requestId:randomUUID(),expectedVersion:f.state.expectedVersion,credentialId:f.newKey,credentialVersion:1,operationIds:[f.failed.id],expiresAt:new Date(Date.now()+1800000).toISOString()};
 const before=structuredClone(r);const authorization:any=await authorizeReleaseReconciliation(f.db,f.auth.workspaceId,r.id,f.auth,body);assert.ok(authorization.authorizationId);assert.deepEqual(r,before);
 const worker:any={authType:"api_key",workspaceId:f.auth.workspaceId,agentId:r.releaser_agent_id,apiKeyId:f.newKey,credentialVersion:1,scopes:["agent-runtime:write","agent-runtime:release"]};
 assert.equal((await releaseView(f.db,f.auth.workspaceId,r.id,worker) as any).status,"expired");
 const request:any={requestId:randomUUID(),operation:"observe",manifestDigest:r.manifest_digest,commit:r.snapshot.commit,baseCommit:r.snapshot.baseCommit,expectedVersion:f.state.expectedVersion,
  observed:{commit:r.snapshot.commit,baseCommit:r.snapshot.commit,baseTree:r.snapshot.candidateTree,manifestDigest:r.manifest_digest},parameters:{mode:"rollback"}};
 assert.deepEqual(await releaseIntent(f.db,f.auth.workspaceId,r.id,worker,request),{error:"release_principal_invalid"});
 const other=f.state.journal[0],outcome={requestId:randomUUID(),status:"reconciled",reconciledStatus:"succeeded",observationOnly:true,evidence:other.outcome.evidence};
 assert.deepEqual(await releaseOutcome(f.db,f.auth.workspaceId,r.id,other.id,worker,outcome),{error:"release_reconciliation_forbidden"});
 assert.deepEqual(await releaseOutcome(f.db,f.auth.workspaceId,r.id,f.failed.id,worker,{...outcome,status:"failed",reconciledStatus:undefined}),{error:"release_reconciliation_forbidden"});
 // Reuse the original scoped diagnosis rather than any forged success.
 const diagnosis:any={...f.body.evidence,healthy:false,failureKind:"rollback_image_mismatch",deployedTargets:[{...f.body.evidence.deployedTargets[0]}],deploymentIds:[f.body.evidence.deploymentIds[0]]};
 diagnosis.deployedSetDigest=releaseDigest(diagnosis.deployedTargets.map(({healthy,deploymentId,...row}:any)=>row));
 const resolved:any=await releaseOutcome(f.db,f.auth.workspaceId,r.id,f.failed.id,worker,{requestId:randomUUID(),status:"reconciled",reconciledStatus:"failed",observationOnly:true,evidence:diagnosis});
 assert.equal(resolved.error,undefined);assert.equal(f.writes.filter(s=>s.includes("governed_release_outcomes")).length,1);assert.deepEqual(r,before);
});
