import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRelease,releaseOutcome } from "../modules/agent-runtime/governed-release";
import { createReleaseSchema, releaseDigest, releaseGitSetArtifactDigest, releaseHasSuccessor,
 releaseIntentError, releaseSuccessorBasis,releaseOutcomeError,releaseRollbackImageFailureValid } from "../modules/agent-runtime/governed-release-contract";

const hash=(v:string)=>v.repeat(64),git=(v:string)=>v.repeat(40),image=(v:string)=>`sha256:${hash(v)}`;
export function successorFixture(recoveredImageFailure=false) {
 const at=new Date().toISOString(),s:any={requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
  releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,
  reviewId:randomUUID(),materialVersion:hash("a"),commit:git("a"),candidateTree:git("b"),baseCommit:git("c"),baseTree:git("d"),
  releaserRevision:at,expiresAt:new Date(Date.now()+1800000).toISOString()};
 const targets=["api","web"].map((targetId,index)=>({targetId,name:targetId,dockerfile:`/apps/${targetId}/Dockerfile`,
  configDigest:hash(String(index+1)),baseline:{commit:git(index?"e":"c"),tree:git(index?"f":"d"),imageDigest:image(index?"3":"4"),configDigest:hash(String(index+1))}}));
 const configDigest=releaseDigest(targets.map(t=>({targetId:t.targetId,configDigest:t.configDigest}))),schemaDigest=hash("5");
 const prior={commit:s.baseCommit,artifactSetDigest:"",configDigest,schemaDigest};
 const m:any={schemaVersion:"roost-release-manifest-v2",purpose:"application_release",
  repository:{url:"https://github.com/example/pilot",defaultBranch:"main",canonicalDir:"C:\\Fixture\\Pilot",candidateBranch:"codex/pilot"},
  deployment:{provider:"coolify_git_set",targetId:"api",controllerUrl:"https://controller.example.test",url:"https://pilot.example.test",
   publicOrigins:["https://pilot.example.test"],targets,artifactSetDigest:"",configDigest,schemaDigest},
  services:[{name:"api",healthUrl:"https://pilot.example.test/health",expectedStatus:200}],
  baseline:{...prior,healthDigest:hash("6"),dataDigest:hash("7"),observedAt:at},rollback:{...prior,compatibleSchemaDigests:[schemaDigest]},
  observation:{seconds:120,intervalSeconds:5,maxFailures:0},backup:{digest:hash("8"),restoreDigest:hash("8"),bytes:10,capturedAt:at,restoreVerifiedAt:at},
  cleanup:{repositoryUrl:"https://github.com/example/pilot",canonicalDir:"C:\\Fixture\\Pilot",coolifyTargetId:"api",archiveRepository:false,ownedResourceIds:[],protectedResourceIds:["api","web"]}};
 s.manifest=m;m.deployment.artifactSetDigest=releaseGitSetArtifactDigest(m,s);
 m.baseline.artifactSetDigest=m.rollback.artifactSetDigest=releaseGitSetArtifactDigest(m,s,true);s.manifestDigest=releaseDigest(m);
 const evidence=(rollback=false,targetId?:string)=>{
  const rows=targets.filter(t=>!targetId||t.targetId===targetId).map(t=>({targetId:t.targetId,commit:rollback?t.baseline.commit:s.commit,
   tree:rollback?t.baseline.tree:s.candidateTree,imageDigest:rollback?t.baseline.imageDigest:image("9"),configDigest:t.configDigest,schemaDigest,
   healthy:true,deploymentId:`${rollback?"rollback":"candidate"}-${t.targetId}`}));
  return {observedAt:at,deployedCommit:rollback?m.rollback.commit:s.commit,deployedTree:rollback?s.baseTree:s.candidateTree,
   artifactSetDigest:rollback?m.rollback.artifactSetDigest:m.deployment.artifactSetDigest,configDigest,schemaDigest,
   deployedTargets:rows,deploymentIds:rows.map(r=>({targetId:r.targetId,deploymentId:r.deploymentId})),
   deployedSetDigest:releaseDigest(rows.map(({healthy,deploymentId,...r})=>r)),healthy:true,healthDigest:hash("6"),dataDigest:hash("7"),observationSeconds:120};
 };
 const journal:any[]=[],add=(operation:string,parameters:any,e:any,status="succeeded",observationOnly=false)=>{
  const row={id:randomUUID(),operation,sequence:journal.length+1,intent:{parameters},outcome:{status,observation_only:observationOnly,evidence:e}};journal.push(row);return row;
 };
 const remote={observedAt:at,remoteCommit:s.commit,remoteTree:s.candidateTree},pr={...remote,pullRequestNumber:7,prHeadCommit:s.commit};
 add("push",{branch:m.repository.candidateBranch},remote);add("pr",{},pr);add("review",{pullRequestNumber:7},{...pr,reviewApproved:true});
 add("merge",{pullRequestNumber:7},{...pr,prMerged:true,mergedCommit:s.commit});
 add("deploy_config",{},{observedAt:at,deployedCommit:s.commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest,schemaDigest});
 for(const target of targets)add("deploy",{targetId:target.targetId},evidence(false,target.targetId));
 add("observe",{mode:"candidate"},{...evidence(),healthy:false},"failed",true);
 add("rollback_config",{},{observedAt:at,deployedCommit:s.baseCommit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest,schemaDigest});
 if(recoveredImageFailure) {
  const actual:any=evidence(true,"api");actual.healthy=false;actual.failureKind="rollback_image_mismatch";actual.deployedTargets[0].imageDigest=image("0");
  actual.deployedTargets[0].deploymentId="rebuilt-api";actual.deploymentIds[0].deploymentId="rebuilt-api";
  actual.deployedSetDigest=releaseDigest(actual.deployedTargets.map(({healthy,deploymentId,...r}:any)=>r));
  const failed=add("rollback",{targetId:"api"},actual,"reconciled",true);(failed.outcome as any).reconciled_status="failed";
 }
 for(const target of targets)add("rollback",{targetId:target.targetId},evidence(true,target.targetId));
 add("observe",{mode:"rollback"},evidence(true),"succeeded",true);
 add("cleanup",{resourceIds:[]},{observedAt:at,retentionVerified:true,repositoryArchived:false,localAbsent:false,repositoryUrl:m.repository.url,
  canonicalDir:m.repository.canonicalDir,targetId:m.deployment.targetId,applicationActive:true,localCommit:s.commit,localTree:s.candidateTree,
  remoteCommit:s.commit,remoteTree:s.candidateTree,protectedResourcesDigest:releaseDigest(m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:[]},"succeeded",true);
 const release:any={id:randomUUID(),workspace_id:randomUUID(),issuer_user_id:randomUUID(),snapshot:s,manifest_digest:s.manifestDigest},state:any={release,journal,revocations:[],renewals:[]};
 state.expectedVersion=releaseDigest(state);
 const input=structuredClone({...s,requestId:randomUUID(),predecessor:{releaseId:release.id,expectedVersion:state.expectedVersion}});
 return {state,input,evidence};
}

test("same accepted commit after full retained rollback derives references without fabricating Git operations",()=>{
 const f=successorFixture(),before=structuredClone(f.state),result=releaseSuccessorBasis(f.state,f.input);
 assert.ok(result.successorBasis,JSON.stringify(result));assert.deepEqual(f.state,before);
 assert.equal(result.successorBasis.mergeOperationId,f.state.journal.find((j:any)=>j.operation==="merge").id);
 assert.deepEqual(result.successorBasis.rollbackDeploymentIds,f.evidence(true).deploymentIds);
 assert.equal(releaseHasSuccessor({...f.input,...result}),true);
 assert.equal(createReleaseSchema.safeParse(f.input).success,true);
 assert.equal(createReleaseSchema.safeParse({...f.input,...result}).success,false,"the owner cannot supply the server-derived basis");
});
test("successor preserves actual parent and remote candidate while prohibiting another Git effect",()=>{
 const f=successorFixture(),result=releaseSuccessorBasis(f.state,f.input),snapshot={...f.input,...result},release={snapshot,manifest_digest:f.input.manifestDigest};
 const input:any={operation:"deploy_config",commit:snapshot.commit,baseCommit:snapshot.baseCommit,manifestDigest:snapshot.manifestDigest,
  observed:{commit:snapshot.commit,baseCommit:snapshot.commit,baseTree:snapshot.candidateTree,manifestDigest:snapshot.manifestDigest},
  parameters:{commit:snapshot.commit,artifactSetDigest:snapshot.manifest.deployment.artifactSetDigest,configDigest:snapshot.manifest.deployment.configDigest,schemaDigest:snapshot.manifest.deployment.schemaDigest}};
 assert.notEqual(snapshot.baseCommit,snapshot.commit);assert.equal(releaseIntentError(release,input,[]),null);
 assert.equal(releaseIntentError(release,{...input,observed:{...input.observed,baseCommit:snapshot.baseCommit,baseTree:snapshot.baseTree}},[]),"release_base_changed");
 for(const operation of ["push","pr","review","merge"])assert.equal(releaseIntentError(release,{...input,operation},[]),"release_successor_git_effect_forbidden");
 assert.equal(releaseIntentError({...release,snapshot:{...snapshot,successorBasis:{...result.successorBasis,releaseId:randomUUID()}}},input,[]),"release_successor_basis_invalid");
 assert.equal(releaseIntentError({...release,snapshot:f.input},input,[]),"release_successor_basis_invalid");
});
test("predecessor candidate, approval, application and protected baseline changes fail closed",()=>{
 for(const key of ["taskId","applicationId","hostId","reviewId","materialVersion","commit","candidateTree","baseCommit","baseTree","releaserAgentId"]) {
  const f=successorFixture();f.input[key]="changed";assert.equal(releaseSuccessorBasis(f.state,f.input).error,"release_predecessor_binding_changed",key);
 }
 for(const mutate of [(m:any)=>m.cleanup.protectedResourceIds.push("foreign"),(m:any)=>m.baseline.dataDigest=hash("0"),
  (m:any)=>m.deployment.targets[0].baseline.imageDigest=image("0"),(m:any)=>m.deployment.configDigest=hash("0"),
  (m:any)=>m.deployment.schemaDigest=hash("0"),(m:any)=>m.observation.maxFailures=1,(m:any)=>m.repository.candidateBranch="codex/other"]) {
  const f=successorFixture();mutate(f.input.manifest);assert.equal(releaseSuccessorBasis(f.state,f.input).error,"release_predecessor_binding_changed");
 }
 const f=successorFixture();f.input.manifest.baseline.observedAt=new Date().toISOString();f.input.manifest.baseline.healthDigest=hash("0");
 f.input.manifest.backup={...f.input.manifest.backup,digest:hash("0"),restoreDigest:hash("0")};assert.ok(releaseSuccessorBasis(f.state,f.input).successorBasis);
});
test("unresolved, revoked, incomplete, forged or unhealthy recovery cannot admit a successor",()=>{
 assert.equal(releaseSuccessorBasis(null,successorFixture().input).error,"release_predecessor_not_found");
 const stale=successorFixture();stale.input.predecessor.expectedVersion=hash("0");assert.equal(releaseSuccessorBasis(stale.state,stale.input).error,"release_predecessor_version_stale");
 const unresolved=successorFixture();unresolved.state.journal[0].outcome.status="uncertain";assert.equal(releaseSuccessorBasis(unresolved.state,unresolved.input).error,"release_predecessor_unresolved");
 const revoked=successorFixture();revoked.state.revocations.push({});assert.equal(releaseSuccessorBasis(revoked.state,revoked.input).error,"release_predecessor_binding_changed");
 for(const operation of ["push","pr","review","merge","rollback_config","rollback","cleanup"]) {
  const f=successorFixture();f.state.journal=f.state.journal.filter((j:any)=>j.operation!==operation);assert.equal(releaseSuccessorBasis(f.state,f.input).error,"release_predecessor_recovery_unproven",operation);
 }
 for(const mutate of [(j:any[])=>j.find(j=>j.operation==="merge").outcome.evidence.mergedCommit=git("0"),
  (j:any[])=>j.find(j=>j.operation==="observe"&&j.intent.parameters.mode==="candidate").outcome.evidence.dataDigest=hash("0"),
  (j:any[])=>j.find(j=>j.operation==="rollback").outcome.evidence.deployedTargets[0].imageDigest=image("0"),
  (j:any[])=>j.find(j=>j.operation==="observe"&&j.intent.parameters.mode==="rollback").outcome.evidence.observationSeconds=119,
  (j:any[])=>j.find(j=>j.operation==="observe"&&j.intent.parameters.mode==="rollback").outcome.evidence.deploymentIds[0].deploymentId="foreign",
  (j:any[])=>j.find(j=>j.operation==="cleanup").outcome.evidence.retentionVerified=false]) {
  const f=successorFixture();mutate(f.state.journal);assert.equal(releaseSuccessorBasis(f.state,f.input).error,"release_predecessor_recovery_unproven");
 }
});
test("new successor still requires fresh owner authentication before database reads",async()=>{
 const f=successorFixture(),db:any={workspaceMembership:{findFirst:async()=>({role:"owner"})},$queryRaw:async()=>{throw Error("stale authentication must not read");}};
 for(const auth of [{authType:"agent",agentId:randomUUID()},{authType:"user",userId:randomUUID(),workspaceRole:"owner",authenticatedAt:Math.floor(Date.now()/1000)-301}])
  assert.deepEqual(await createRelease(db,f.state.release.workspace_id,auth as any,f.input),{error:"release_fresh_owner_required"});
});
test("create checks exact predecessor under the application lock and refuses stale lineage before writing",async()=>{
 const f=successorFixture(),calls:string[]=[],auth:any={authType:"user",userId:f.state.release.issuer_user_id,workspaceRole:"owner",workspaceId:f.state.release.workspace_id,authenticatedAt:Math.floor(Date.now()/1000)};
 const db:any={workspaceMembership:{findFirst:async()=>({role:"owner"})},$executeRaw:async()=>{throw Error("stale predecessor must never write");},
  $queryRaw:async(parts:TemplateStringsArray)=>{
   const sql=parts.join("?");calls.push(sql);
   if(sql.includes("pg_advisory_xact_lock"))return [];
   if(sql.includes("FROM governed_releases"))return sql.includes("request_id")?[]:[f.state.release];
   if(sql.includes("FROM governed_release_operations"))return f.state.journal;
   if(sql.includes("FROM governed_release_revocations")||sql.includes("FROM governed_release_renewals"))return [];
   throw Error("unexpected read after stale predecessor");
  }};
 f.input.predecessor.expectedVersion=hash("0");
 assert.deepEqual(await createRelease(db,auth.workspaceId,auth,f.input),{error:"release_predecessor_version_stale"});
 assert.ok(calls.findIndex(s=>s.includes("pg_advisory_xact_lock"))<calls.findIndex(s=>s.includes("FROM governed_releases")&&!s.includes("request_id")));
});
test("diagnosed rollback image mismatch is attributed failure only and requires later exact target recovery",()=>{
 const f=successorFixture(true),failed=f.state.journal.find((j:any)=>j.outcome.reconciled_status==="failed"),e=failed.outcome.evidence;
 assert.equal(releaseRollbackImageFailureValid(f.state.release.snapshot,e,"api"),true);
 assert.equal(releaseOutcomeError(f.state.release,failed,{status:"reconciled",reconciledStatus:"failed",observationOnly:true,evidence:e},f.state.journal),null);
 assert.equal(releaseOutcomeError(f.state.release,failed,{status:"succeeded",evidence:e},f.state.journal),"release_failure_marker_invalid");
 assert.ok(releaseSuccessorBasis(f.state,f.input).successorBasis);
 for(const mutate of [(e:any)=>delete e.failureKind,(e:any)=>e.failureKind="other",(e:any)=>e.healthy=true,
  (e:any)=>e.deployedTargets[0].commit=git("0"),(e:any)=>e.deployedTargets[0].tree=git("0"),
  (e:any)=>e.configDigest=hash("0"),(e:any)=>e.schemaDigest=hash("0"),(e:any)=>e.dataDigest=hash("0"),
  (e:any)=>e.deployedSetDigest=hash("0"),(e:any)=>e.deploymentIds[0].deploymentId="foreign",
  (e:any)=>e.deployedTargets[0].imageDigest=f.input.manifest.deployment.targets[0].baseline.imageDigest]) {
  const invalid=structuredClone(e);mutate(invalid);assert.equal(releaseRollbackImageFailureValid(f.input,invalid,"api"),false);
  assert.equal(releaseOutcomeError(f.state.release,failed,{status:"failed",evidence:invalid}),"release_failure_not_attributed");
 }
 const missing=successorFixture(true);missing.state.journal=missing.state.journal.filter((j:any)=>!(j.operation==="rollback"&&j.intent.parameters.targetId==="api"&&j.outcome.status==="succeeded"));
 assert.equal(releaseSuccessorBasis(missing.state,missing.input).error,"release_predecessor_recovery_unproven");
 const ordinary=successorFixture();const rollback=ordinary.state.journal.find((j:any)=>j.operation==="rollback");
 const changed=structuredClone(rollback.outcome.evidence);changed.deployedTargets[0].imageDigest=image("0");
 changed.deployedSetDigest=releaseDigest(changed.deployedTargets.map(({healthy,deploymentId,...r}:any)=>r));
 assert.equal(releaseOutcomeError(ordinary.state.release,rollback,{status:"succeeded",evidence:changed}),"release_deployment_unproven");
});
test("typed rollback failure cannot bypass retention in the shared validator, contract or active outcome service",async()=>{
 for(const flag of ["repositoryArchived","localAbsent"])for(const status of ["failed","reconciled"]) {
  const f=successorFixture(true),operation=f.state.journal.find((j:any)=>j.outcome.reconciled_status==="failed"),evidence={...operation.outcome.evidence,[flag]:true};
  const input={requestId:randomUUID(),status,...(status==="reconciled"?{reconciledStatus:"failed"}:{}),observationOnly:status==="reconciled",evidence};
  assert.equal(releaseRollbackImageFailureValid(f.input,evidence,"api"),false,`${flag}/${status}`);
  assert.equal(releaseOutcomeError(f.state.release,operation,input,f.state.journal),"release_retention_policy_violation");
  operation.outcome.evidence=evidence;assert.equal(releaseSuccessorBasis(f.state,f.input).error,"release_predecessor_recovery_unproven");
  if(status!=="reconciled")continue;
  operation.outcome={status:"uncertain"};let writes=0;
  const db:any={workspaceMembership:{findFirst:async()=>({role:"owner"})},$executeRaw:async()=>{writes++;throw Error("retention refusal must not append an outcome");},
   $queryRaw:async(parts:TemplateStringsArray)=>{
    const sql=parts.join("?");
    if(sql.includes("pg_advisory_xact_lock"))return [];
    if(sql.includes("FROM governed_releases"))return [f.state.release];
    if(sql.includes("FROM governed_release_operations"))return f.state.journal;
    if(sql.includes("FROM governed_release_revocations")||sql.includes("FROM governed_release_renewals")||sql.includes("FROM governed_release_outcomes"))return [];
    throw Error("unexpected retention service read");
   }};
  const auth:any={authType:"user",workspaceId:f.state.release.workspace_id,userId:f.state.release.issuer_user_id,workspaceRole:"owner"};
  assert.deepEqual(await releaseOutcome(db,auth.workspaceId,f.state.release.id,operation.id,auth,input),{error:"release_retention_policy_violation"});
  assert.equal(writes,0);
 }
});
