import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { reviewState } from "./task-review";
import { inspectReady } from "./task-execution-readiness";
import { effectiveCompletedResult } from "./completed-result-basis";
import { nativeBoundaryResultBlocked, object, wire } from "./task-review-contract";
import { suspensionBlocks } from "./capability-suspension";
import { freshWorkerOwner } from "../api-keys/worker-credential.service";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { createReleaseSchema, releaseIntentSchema, releaseOutcomeSchema, releaseDigest, releaseApprovalError, releaseWindowError, releaseIntentError, releaseOutcomeError, effectiveOutcome, releaseCandidateNativeError, renewReleaseSchema, releaseRenewalWindowError, releaseRenewalStateError, releasePurposeMatches, releaseIsGitSet } from "./governed-release-contract";
type Db=Prisma.TransactionClient;
// A completed result does not preserve authority after its task basis changes.
// Reuse the current readiness validator, including admission expiry, without
// replacing the completed execution's pin or mutating its source task.
export async function releaseExecutionBasisCurrent(db:Db,workspaceId:string,execution:any) {
 if(!execution)return false;
 const current=await inspectReady(db,workspaceId,execution.taskId,execution,true);
 if("error" in current&&object(current.readiness).reason==="execution_pin_mismatch") {
  const effective=await effectiveCompletedResult(db,workspaceId,execution);
  if(effective===execution)return false;
  const revalidated=await inspectReady(db,workspaceId,execution.taskId,effective,true);
  return !("error" in revalidated)&&revalidated.readiness.status==="ready";
 }
 return !("error" in current)&&current.readiness.status==="ready";
}
const camel=(row:any)=>Object.fromEntries(Object.entries(row).filter(([k])=>k!=="request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_:string,c:string)=>c.toUpperCase()),v]));
async function owner(db:Db,workspaceId:string,auth:AuthContext) {
 return auth.authType==="user"&&auth.userId&&await db.workspaceMembership.findFirst({where:{workspaceId,userId:auth.userId,role:"owner"}});
}
async function configuration(db:Db,workspaceId:string,input:any) {
 const application=await db.application.findFirst({where:{id:input.applicationId,workspaceId},include:{repositories:{orderBy:{id:"asc"}}}});
 const host=await db.agentHost.findFirst({where:{id:input.hostId,workspaceId,status:{not:"disabled"}}});
 if(!application||!host||application.status!=="active")return null;
 const primary=application.repositories.filter(r=>r.isPrimary),m=input.manifest,metadata=object(application.metadata);
 if(!releasePurposeMatches(metadata,m)||primary.length!==1||primary[0].url!==m.repository.url||primary[0].defaultBranch!==m.repository.defaultBranch
  ||metadata.localDirectory!==m.repository.canonicalDir||metadata.deploymentUrl!==m.deployment.url
  ||!Array.isArray(host.applicationSlugs)||!host.applicationSlugs.includes(application.slug))return null;
 if(releaseIsGitSet(m)) {
  if(!Array.isArray(metadata.releaseTargets)||!Array.isArray(metadata.releasePublicOrigins)
   ||releaseDigest(metadata.releaseTargets)!==releaseDigest(m.deployment.targets.map((t:any)=>({targetId:t.targetId,dockerfile:t.dockerfile})))
   ||releaseDigest(metadata.releasePublicOrigins)!==releaseDigest(m.deployment.publicOrigins))return null;
 }
 return releaseDigest({application:{id:application.id,slug:application.slug,status:application.status,metadata:application.metadata,updatedAt:application.updatedAt.toISOString(),repositories:application.repositories.map(r=>({...r,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString()}))},host:{id:host.id,slug:host.slug,platform:host.platform,applicationSlugs:host.applicationSlugs}});
}
async function readiness(db:Db,workspaceId:string,input:any) {
 const execution=await db.agentExecution.findFirst({where:{id:input.releaseExecutionId,workspaceId,applicationId:input.applicationId,agentHostId:input.hostId,status:"completed"}});
 if(!execution||execution.contextInvalidatedAt)return null;
 if(!await releaseExecutionBasisCurrent(db,workspaceId,execution))return null;
 const metadata=object(execution.metadata),contract=object(metadata.executionContract),revision=object(metadata.resultRevision);
 if(contract.nativeBoundary?.profile!=="inspect-readonly"||contract.assignment?.agentId!==input.releaserAgentId
  ||metadata.resultRevisionReviewVersion!=="1"||revision.schemaVersion!=="roost-result-revision-v1"||revision.branch!==contract.singleTask?.branch
  ||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(revision.id??"")||!Number.isFinite(Date.parse(revision.observedAt??""))
  ||revision.commit!==input.commit||revision.workingTree!=="clean"||revision.executionId!==execution.id
  ||revision.hostId!==input.hostId||revision.attempt!==execution.attempt||revision.checkpointVersion!==execution.checkpointVersion
  ||nativeBoundaryResultBlocked(execution.verification,contract)||!Array.isArray(execution.changedFiles)||execution.changedFiles.length
  ||contract.modelSelection?.schemaVersion!=="roost-managed-hermes-backend-v1"||contract.modelSelection?.backend!=="codex_responses"
  ||object(execution.verification).ownedTreeReceipt?.cleanup!==true||object(execution.verification).ownedTreeReceipt?.activeProcesses!==0
  ||object(execution.verification).ownedTreeReceipt?.attempt!==execution.id
  ||object(execution.verification).managedAdmission?.qualification!=="signed_native_v1"
  ||!/^[a-f0-9]{64}$/.test(object(execution.verification).managedAdmission?.evidenceDigest??"")
  ||!/^[a-f0-9]{64}$/.test(object(execution.verification).managedAdmission?.jobSourceDigest??""))return null;
 return (await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') AS digest FROM agent_executions e WHERE id=${execution.id}::uuid`)[0].digest as string;
}
async function credential(db:Db,workspaceId:string,input:any) {
 const key=await db.apiKey.findFirst({where:{id:input.releaserCredentialId,workspaceId,boundAgentId:input.releaserAgentId,active:true,revokedAt:null,credentialVersion:input.credentialVersion,expiresAt:{gt:new Date()}},include:{boundAgent:true}});
 const agent=key?.boundAgent;
 if(!key?.expiresAt||!agent||agent.status!=="active"||agent.type!=="agent"||agent.source==="user"||agent.updatedAt.toISOString()!==input.releaserRevision
  ||!Array.isArray(key.scopes)||!key.scopes.includes("agent-runtime:release")
  ||!Array.isArray(agent.skillIndex)||!agent.skillIndex.includes("governed release")
  ||!Array.isArray(agent.authorityScope)||!agent.authorityScope.includes("release_authorization")
  ||!["remote_push","deployment"].every(t=>Array.isArray(agent.toolIndex)&&agent.toolIndex.includes(t)))return null;
 return key;
}
async function appLock(db:Db,applicationId:string) {await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${applicationId},0))::text`;}
async function load(db:Db,workspaceId:string,id:string) {
 const release=(await db.$queryRaw<any[]>`SELECT * FROM governed_releases WHERE workspace_id=${workspaceId}::uuid AND id=${id}::uuid`)[0];
 if(!release)return null;
 const journal=await db.$queryRaw<any[]>`SELECT o.*, (SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1) AS outcome FROM governed_release_operations o WHERE o.release_id=${id}::uuid ORDER BY o.sequence`;
 const revocations=await db.$queryRaw<any[]>`SELECT * FROM governed_release_revocations WHERE release_id=${id}::uuid ORDER BY created_at,id`;
 const renewals=await db.$queryRaw<any[]>`SELECT * FROM governed_release_renewals WHERE release_id=${id}::uuid ORDER BY sequence`;
 const effectiveExpiresAt=renewals.at(-1)?.expires_at??release.expires_at;
 return {release,journal,revocations,renewals,effectiveExpiresAt,expectedVersion:releaseDigest(wire({release,journal,revocations,renewals}))};
}
async function mayRead(db:Db,workspaceId:string,state:any,auth:AuthContext) {
 if(await owner(db,workspaceId,auth))return true;
 const p=await resolveReviewPrincipal(db,workspaceId,auth),r=state.release;
 return p?.kind==="agent"&&p.id===r.releaser_agent_id&&p.credentialId===r.releaser_credential_id&&auth.credentialVersion===r.credential_version;
}
function publicState(state:any) {
 const {release,journal,revocations,renewals,effectiveExpiresAt,expectedVersion}=state;
 const completed=journal.some((j:any)=>j.operation==="cleanup"&&effectiveOutcome(j.outcome)==="succeeded");
 return {release:camel(release),journal:journal.map((j:any)=>({...camel(j),outcome:j.outcome?camel(j.outcome):null})),revocations:revocations.map(camel),renewals:renewals.map(camel),effectiveExpiresAt,expectedVersion,
  status:completed?"completed":revocations.length?"revoked":new Date(effectiveExpiresAt)<=new Date()?"expired":journal.some((j:any)=>!effectiveOutcome(j.outcome)||effectiveOutcome(j.outcome)==="uncertain")?"reconciliation_required":"active"};
}
export async function releaseView(db:Db,workspaceId:string,id:string,auth:AuthContext) {
 const state=await load(db,workspaceId,id);
 if(!state)return {error:"release_not_found"};
 if(!await mayRead(db,workspaceId,state,auth))return {error:"release_forbidden"};
 return publicState(state);
}
export async function listReleases(db:Db,workspaceId:string,auth:AuthContext,hostId?:string) {
 const isOwner=await owner(db,workspaceId,auth),p=isOwner?null:await resolveReviewPrincipal(db,workspaceId,auth);
 if(!isOwner&&(p?.kind!=="agent"||!hostId||!auth.scopes?.includes("agent-runtime:release")))return {error:"release_forbidden"};
 const rows=isOwner?await db.$queryRaw<any[]>`SELECT id FROM governed_releases WHERE workspace_id=${workspaceId}::uuid ORDER BY created_at DESC,id DESC LIMIT 51`:
  await db.$queryRaw<any[]>`SELECT r.id FROM governed_releases r WHERE r.workspace_id=${workspaceId}::uuid AND r.host_id=${hostId}::uuid AND r.releaser_agent_id=${p!.id}::uuid AND r.releaser_credential_id=${p!.credentialId}::uuid AND r.credential_version=${auth.credentialVersion} AND ((governed_release_effective_expiry(r.id)>now() AND NOT EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id) AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes x ON x.operation_id=o.id WHERE o.release_id=r.id AND o.operation='cleanup' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded'))) OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id AND COALESCE((SELECT x.status FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain'))) ORDER BY r.created_at,r.id LIMIT 51`;
 return {releases:await Promise.all(rows.slice(0,50).map(r=>releaseView(db,workspaceId,r.id,auth))),truncated:rows.length>50};
}
async function supplemental(db:Db,workspaceId:string,release:any,event:string,details:any,auth:AuthContext) {
 await db.event.create({data:{workspaceId,taskId:release.task_id,type:`governed_release.${event}`,source:"roost",actorType:auth.authType==="user"?"user":"agent",actorId:auth.userId??auth.agentId,resourceType:"governed_release",resourceId:release.id,payload:wire(details)}});
 await db.evidenceRecord.create({data:{workspaceId,entityType:"task",entityId:release.task_id,type:"deployment",source:"system",reference:`Governed release ${release.id}: ${event}`,description:"Authoritative identities and outcome are retained in the append-only release journal.",metadata:wire({releaseId:release.id,commit:release.snapshot.commit,event,...details})}});
}
export async function createRelease(db:Db,workspaceId:string,auth:AuthContext,body:unknown) {
 const input=createReleaseSchema.parse(body);requireRuntimeContent(input,"release.create",{workspaceId,taskId:input.taskId});
 if(!await owner(db,workspaceId,auth)||!freshWorkerOwner(auth,new Date()))return {error:"release_fresh_owner_required"};
 const hash=releaseDigest({input,userId:auth.userId}),prior=(await db.$queryRaw<any[]>`SELECT * FROM governed_releases WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior)return prior.request_hash===hash?{...await releaseView(db,workspaceId,prior.id,auth),replayed:true}:{error:"release_request_conflict"};
 await appLock(db,input.applicationId);
 const lockedPrior=(await db.$queryRaw<any[]>`SELECT * FROM governed_releases WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(lockedPrior)return lockedPrior.request_hash===hash?{...await releaseView(db,workspaceId,lockedPrior.id,auth),replayed:true}:{error:"release_request_conflict"};
 const s=await reviewState(db,workspaceId,input.taskId,auth),approvalError=releaseApprovalError(s,input);
 if(approvalError)return {error:approvalError};
 if((s as any).execution.agentHostId!==input.hostId)return {error:"release_host_invalid"};
 if(!await releaseExecutionBasisCurrent(db,workspaceId,(s as any).execution))return {error:"release_source_basis_changed"};
 const nativeError=releaseCandidateNativeError((s as any).execution,(s as any).contract);if(nativeError)return {error:nativeError};
 const key=await credential(db,workspaceId,input);if(!key)return {error:"release_credential_invalid"};
 const windowError=releaseWindowError(input,key.expiresAt!);if(windowError)return {error:windowError};
 if(releaseDigest(input.manifest)!==input.manifestDigest||input.baseCommit!==input.manifest.baseline.commit)return {error:"release_manifest_mismatch"};
 const config=await configuration(db,workspaceId,input);if(!config)return {error:"release_configuration_invalid"};
 const readinessDigest=await readiness(db,workspaceId,input);if(!readinessDigest)return {error:"release_readiness_unproven"};
 if(await suspensionBlocks(db,workspaceId,input.taskId,input.applicationId,"runtime_execute",input.releaserAgentId,input.releaserCredentialId,input.hostId))return {error:"native_capability_suspended"};
 const active=await db.$queryRaw<any[]>`SELECT r.id FROM governed_releases r WHERE r.application_id=${input.applicationId}::uuid AND ((NOT EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id) AND NOT EXISTS(SELECT 1 FROM governed_release_operations o JOIN governed_release_outcomes x ON x.operation_id=o.id WHERE o.release_id=r.id AND o.operation='cleanup' AND (x.status='succeeded' OR x.status='reconciled' AND x.reconciled_status='succeeded'))) OR EXISTS(SELECT 1 FROM governed_release_operations o WHERE o.release_id=r.id AND COALESCE((SELECT x.status FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1),'unresolved') IN ('unresolved','uncertain')))`;
 if(active.length)return {error:"release_application_busy"};
 const id=randomUUID(),snapshot=wire({...input,readinessDigest,configurationDigest:config});
 await db.$executeRaw`INSERT INTO governed_releases(id,workspace_id,task_id,application_id,host_id,release_execution_id,review_id,releaser_agent_id,releaser_credential_id,credential_version,issuer_user_id,expires_at,manifest_digest,configuration_digest,snapshot,request_id,request_hash)
 VALUES(${id}::uuid,${workspaceId}::uuid,${input.taskId}::uuid,${input.applicationId}::uuid,${input.hostId}::uuid,${input.releaseExecutionId}::uuid,${input.reviewId}::uuid,${input.releaserAgentId}::uuid,${input.releaserCredentialId}::uuid,${input.credentialVersion},${auth.userId}::uuid,${new Date(input.expiresAt)},${input.manifestDigest},${config},${JSON.stringify(snapshot)}::jsonb,${input.requestId}::uuid,${hash})`;
 const state=await load(db,workspaceId,id);await supplemental(db,workspaceId,state!.release,"authorized",{reviewId:input.reviewId,releaseExecutionId:input.releaseExecutionId,manifestDigest:input.manifestDigest},auth);
 return {...publicState(state),replayed:false};
}
async function liveError(db:Db,workspaceId:string,state:any,auth:AuthContext) {
 const r=state.release,s=r.snapshot,p=await resolveReviewPrincipal(db,workspaceId,auth);
 if(p?.kind!=="agent"||p.id!==r.releaser_agent_id||p.credentialId!==r.releaser_credential_id||auth.credentialVersion!==r.credential_version)return "release_principal_invalid";
 if(state.revocations.length||new Date(state.effectiveExpiresAt)<=new Date())return "release_authority_inactive";
 return currentBasisError(db,workspaceId,state,auth);
}
async function currentBasisError(db:Db,workspaceId:string,state:any,auth:AuthContext) {
 const r=state.release,s=r.snapshot;
 if(!await credential(db,workspaceId,s))return "release_credential_invalid";
 const review=await reviewState(db,workspaceId,r.task_id,auth),reviewError=releaseApprovalError(review,s);if(reviewError)return reviewError;
 if(!await releaseExecutionBasisCurrent(db,workspaceId,(review as any).execution))return "release_source_basis_changed";
 const nativeError=releaseCandidateNativeError((review as any).execution,(review as any).contract);if(nativeError)return nativeError;
 if(await configuration(db,workspaceId,s)!==r.configuration_digest)return "release_configuration_changed";
 if(await readiness(db,workspaceId,s)!==s.readinessDigest)return "release_readiness_changed";
 if(await suspensionBlocks(db,workspaceId,r.task_id,r.application_id,"runtime_execute",r.releaser_agent_id,r.releaser_credential_id,r.host_id))return "native_capability_suspended";
 return null;
}
export async function renewRelease(db:Db,workspaceId:string,id:string,auth:AuthContext,body:unknown) {
 const input=renewReleaseSchema.parse(body);requireRuntimeContent(input,"release.renew",{workspaceId});
 if(!await owner(db,workspaceId,auth)||!freshWorkerOwner(auth,new Date()))return {error:"release_fresh_owner_required"};
 let state=await load(db,workspaceId,id);if(!state)return {error:"release_not_found"};
 await appLock(db,state.release.application_id);state=(await load(db,workspaceId,id))!;
 const error=releaseRenewalStateError(state,auth.userId);if(error)return {error};
 const hash=releaseDigest({input,id,userId:auth.userId}),prior=(await db.$queryRaw<any[]>`SELECT * FROM governed_release_renewals WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior)return prior.release_id===id&&prior.request_hash===hash?{...publicState(state),replayed:true}:{error:"release_request_conflict"};
 if(input.expectedVersion!==state.expectedVersion)return {error:"release_version_stale"};
 const key=await credential(db,workspaceId,state.release.snapshot);if(!key)return {error:"release_credential_invalid"};
 const windowError=releaseRenewalWindowError(input,new Date(state.effectiveExpiresAt),key.expiresAt!,state.release.snapshot.manifest);if(windowError)return {error:windowError};
 const basisError=await currentBasisError(db,workspaceId,state,auth);if(basisError)return {error:basisError};
 await db.$executeRaw`INSERT INTO governed_release_renewals(id,release_id,workspace_id,sequence,issuer_user_id,owner_authenticated_at,previous_expires_at,expires_at,expected_version,request_id,request_hash)
 VALUES(${randomUUID()}::uuid,${id}::uuid,${workspaceId}::uuid,${state.renewals.length+1},${auth.userId}::uuid,${new Date(auth.authenticatedAt!*1000)},${new Date(state.effectiveExpiresAt)},${new Date(input.expiresAt)},${input.expectedVersion},${input.requestId}::uuid,${hash})`;
 await supplemental(db,workspaceId,state.release,"renewed",{previousExpiresAt:state.effectiveExpiresAt,expiresAt:input.expiresAt},auth);
 return {...publicState((await load(db,workspaceId,id))!),replayed:false};
}
export async function releaseIntent(db:Db,workspaceId:string,id:string,auth:AuthContext,body:unknown) {
 const input=releaseIntentSchema.parse(body);requireRuntimeContent(input,"release.intent",{workspaceId});
 let state=await load(db,workspaceId,id);if(!state)return {error:"release_not_found"};await appLock(db,state.release.application_id);state=(await load(db,workspaceId,id))!;
 const principalError=await liveError(db,workspaceId,state,auth);if(principalError)return {error:principalError};
 const hash=releaseDigest({input,credentialId:auth.apiKeyId}),prior=(await db.$queryRaw<any[]>`SELECT * FROM governed_release_operations WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior)return prior.release_id===id&&prior.request_hash===hash?{...publicState(state),operation:camel(prior),replayed:true}:{error:"release_request_conflict"};
 if(input.expectedVersion!==state.expectedVersion)return {error:"release_version_stale"};
 const error=releaseIntentError(state.release,input,state.journal);if(error)return {error};
 const operationId=randomUUID(),sequence=state.journal.length+1;
 await db.$executeRaw`INSERT INTO governed_release_operations(id,release_id,workspace_id,application_id,sequence,operation,intent,request_id,request_hash)
 VALUES(${operationId}::uuid,${id}::uuid,${workspaceId}::uuid,${state.release.application_id}::uuid,${sequence},${input.operation},${JSON.stringify(input)}::jsonb,${input.requestId}::uuid,${hash})`;
 await supplemental(db,workspaceId,state.release,"intent",{operationId,operation:input.operation,sequence},auth);
 const next=(await load(db,workspaceId,id))!;return {...publicState(next),operation:camel(next.journal.at(-1)),replayed:false};
}
export async function releaseOutcome(db:Db,workspaceId:string,id:string,operationId:string,auth:AuthContext,body:unknown) {
 const input=releaseOutcomeSchema.parse(body);requireRuntimeContent(input,"release.outcome",{workspaceId});
 let state=await load(db,workspaceId,id);if(!state)return {error:"release_not_found"};await appLock(db,state.release.application_id);state=(await load(db,workspaceId,id))!;
 const operation=state.journal.find((j:any)=>j.id===operationId);if(!operation)return {error:"release_operation_not_found"};
 const observed=Date.parse(input.evidence.observedAt),now=Date.now();
 if(observed>now+60000||now-observed>300000)return {error:"release_outcome_evidence_stale"};
 const isOwner=await owner(db,workspaceId,auth);if(!await mayRead(db,workspaceId,state,auth))return {error:"release_forbidden"};
 if(isOwner&&input.status!=="reconciled")return {error:"release_agent_required"};
 if(input.status!=="reconciled") {const error=await liveError(db,workspaceId,state,auth);if(error)return {error};}
 const hash=releaseDigest({input,operationId,actorId:auth.userId??auth.apiKeyId}),prior=(await db.$queryRaw<any[]>`SELECT * FROM governed_release_outcomes WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior)return prior.operation_id===operationId&&prior.request_hash===hash?{...publicState(state),replayed:true}:{error:"release_request_conflict"};
 if(operation.outcome&&!(operation.outcome.status==="uncertain"&&input.status==="reconciled"))return {error:"release_outcome_already_terminal"};
 if(input.status==="reconciled"&&!input.observationOnly)return {error:"release_reconciliation_effect_forbidden"};
 const error=releaseOutcomeError(state.release,operation,input,state.journal);if(error)return {error};
 await db.$executeRaw`INSERT INTO governed_release_outcomes(id,release_id,operation_id,workspace_id,status,reconciled_status,observation_only,evidence,request_id,request_hash)
 VALUES(${randomUUID()}::uuid,${id}::uuid,${operationId}::uuid,${workspaceId}::uuid,${input.status},${input.reconciledStatus??null},${input.observationOnly},${JSON.stringify(input.evidence)}::jsonb,${input.requestId}::uuid,${hash})`;
 await supplemental(db,workspaceId,state.release,"outcome",{operationId,status:input.status,reconciledStatus:input.reconciledStatus??null,evidence:input.evidence},auth);
 return {...publicState((await load(db,workspaceId,id))!),replayed:false};
}
export async function revokeRelease(db:Db,workspaceId:string,id:string,auth:AuthContext,body:{requestId:string;reason:string}) {
 if(!await owner(db,workspaceId,auth))return {error:"release_owner_required"};
 requireRuntimeContent(body,"release.revoke",{workspaceId});let state=await load(db,workspaceId,id);if(!state)return {error:"release_not_found"};await appLock(db,state.release.application_id);state=(await load(db,workspaceId,id))!;
 if(state.revocations.length&&state.revocations[0].request_id!==body.requestId)return {error:"release_already_revoked"};
 const hash=releaseDigest({body,id,userId:auth.userId}),prior=(await db.$queryRaw<any[]>`SELECT * FROM governed_release_revocations WHERE workspace_id=${workspaceId}::uuid AND request_id=${body.requestId}::uuid`)[0];
 if(prior)return prior.release_id===id&&prior.request_hash===hash?{...publicState((await load(db,workspaceId,id))!),replayed:true}:{error:"release_request_conflict"};
 await db.$executeRaw`INSERT INTO governed_release_revocations(id,release_id,workspace_id,issuer_user_id,reason,request_id,request_hash) VALUES(${randomUUID()}::uuid,${id}::uuid,${workspaceId}::uuid,${auth.userId}::uuid,${body.reason},${body.requestId}::uuid,${hash})`;
 await supplemental(db,workspaceId,state.release,"revoked",{reason:body.reason},auth);return {...publicState((await load(db,workspaceId,id))!),replayed:false};
}
