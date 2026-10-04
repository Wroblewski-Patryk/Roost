import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { workerClaimAllowed, workerTicketIdentitySchema } from "../../auth/worker-ticket-principal";
import { firstWriteGate, type ManagedAdmissionSigner } from "./managed-admission";
import { inspectReady } from "./task-execution-readiness";
import { releaseDigest } from "./governed-release-contract";

const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),commit=z.string().regex(/^[a-f0-9]{40}$/);
const branch=z.string().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/);
export const refusedTrackedRecoveryScope=z.object({schemaVersion:z.literal("roost-refused-tracked-rollback-v1"),
  operation:z.literal("restore_task_changes"),executionId:id,workspaceId:id,taskId:id,applicationId:id,attempt:z.literal(1),
  reviewDigest:hash,rootIdentity:hash,baselineCommit:commit,taskBranchDigest:hash,baseBranchDigest:hash,
  originDigest:hash,writeScopeDigest:hash,changedScopeDigest:hash}).strict();
export const refusedTrackedRecoveryInput=z.object({requestId:id,installationId:id,scope:refusedTrackedRecoveryScope,
  paths:z.array(z.string().min(1).max(512)).min(1).max(8),taskBranch:branch,baseBranch:branch,
  origin:z.string().url().max(2048).refine(value=>{try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}})}).strict();
const statusInput=z.object({requestId:id}).strict();
export const refusedTrackedRecoveryResultInput=z.object({requestId:id,receipt:z.object({
  schemaVersion:z.literal("roost-refused-tracked-rollback-v1"),completed:z.literal(true),replay:z.boolean(),executionId:id,
  reviewDigest:hash,journalDigest:hash,restoredFileCount:z.number().int().min(1).max(8),archivedFileCount:z.number().int().min(1).max(8),baselineCommit:commit,
  cleanBaseBranch:z.literal(true),taskBranchRemoved:z.literal(true),writerLeaseRetained:z.literal(true),releaseAllowed:z.literal(false),executionAuthorized:z.literal(false),modelsInvoked:z.literal(false),remoteEffects:z.literal(false)
}).strict()}).strict();
const obj=(x:any):Record<string,any>=>x&&typeof x==="object"&&!Array.isArray(x)?x:{};
const digest=(x:any)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const canonical=(x:any):any=>Array.isArray(x)?x.map(canonical):x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const bytes=(x:any)=>Buffer.from(JSON.stringify(canonical(x))+"\n");
const error=(status:403|404|409,reason:string)=>({error:reason,status});
type Db=Prisma.TransactionClient;
type Checks={ready:typeof inspectReady;firstWrite:typeof firstWriteGate;worker:typeof workerClaimAllowed};
const checks:Checks={ready:inspectReady,firstWrite:firstWriteGate,worker:workerClaimAllowed};

async function recoveryBasis(db:Db,auth:AuthContext,executionId:string,now:Date,c:Checks){
  const e=await db.agentExecution.findFirst({where:{id:executionId,workspaceId:auth.workspaceId}});
  if(!e)return error(404,"agent_execution_not_found");
  const m=obj(e.metadata),contract=obj(m.executionContract),pin=obj(m.readyContextPin),boundary=obj(contract.nativeBoundary),checkpoint=obj(e.checkpoint),failure=obj(e.errorState),details=obj(failure.details),r=obj(details.nativeReviewReceipt);
  const paths=boundary.writePaths;
  if(e.status!=="failed"||e.attempt!==1||!e.completedAt||e.completedAt>now||e.leaseToken!==null||e.leaseExpiresAt!==null||e.contextInvalidatedAt!==null||e.cancelRequestedAt!==null||e.finalResponse!==null||e.summary!==null||!Array.isArray(e.changedFiles)||e.changedFiles.length||Object.keys(obj(e.verification)).length||m.resultRevision!=null
    ||checkpoint.stage!=="spawn_intent"||boundary.profile!=="coding-local"||boundary.continuation||boundary.existingCommitVerification||obj(contract.singleTask).branch!==`codex/task-${e.taskId}`
    ||failure.code!=="agent_native_review_blocked"||failure.retryable!==false||!hash.safeParse(details.nativeReviewReceiptDigest).success
    ||r.version!=="roost-native-review-public-v2"||r.policy!=="roost-root-scoped-coding-v2"||r.verdict!=="verification_blocked"||r.verification!=="REFUSED"||r.installation!=="PASS"||r.scopeReviewRequired!==false||r.refusalCode!==null||r.reviewRequired!==true||r.releaseAllowed!==false||!Array.isArray(r.violations)||r.violations.length
    ||!hash.safeParse(r.bindingDigest).success||!hash.safeParse(r.jobDigest).success||!hash.safeParse(r.preFootprintDigest).success||!hash.safeParse(r.postFootprintDigest).success||r.preFootprintDigest===r.postFootprintDigest
    ||!Number.isInteger(r.categoryCounts?.content)||r.categoryCounts.content<1||r.categoryCounts.content>8||r.categoryCounts.protected!==0||!Array.isArray(r.changedPathIds)||r.changedPathIds.length!==r.categoryCounts.content||r.changedPathIds.some((x:any)=>!hash.safeParse(x).success)||new Set(r.changedPathIds).size!==r.changedPathIds.length
    ||!Array.isArray(paths)||paths.length<1||paths.length>8||paths.some((x:any)=>typeof x!=="string")||new Set(paths).size!==paths.length
    ||!commit.safeParse(checkpoint.headCommit).success||checkpoint.headCommit!==pin.riskAdmissionCommit||checkpoint.branch!==contract.singleTask.branch)
    return error(409,"refused_tracked_recovery_native_unproven");
  const workspace=await db.workspace.findUnique({where:{id:auth.workspaceId},select:{ownerUserId:true}});
  if(!workspace||!await db.workspaceMembership.findFirst({where:{workspaceId:auth.workspaceId,userId:workspace.ownerUserId,role:"owner"}}))return error(403,"refused_tracked_recovery_owner_required");
  const ready=await c.ready(db,auth.workspaceId,e.taskId,e,true);
  if(ready.error||!ready.pin||releaseDigest(obj(ready.pin.contract).nativeBoundary)!==releaseDigest(boundary))return error(409,"refused_tracked_recovery_basis_changed");
  return {e,m,paths,r,details,checkpoint,workspace,pin:ready.pin};
}

// Owner preparation grants only this failed attempt's exact local restoration.
// It never signs a model launch, candidate acceptance or release capability.
export async function admitRefusedTrackedRecovery(db:Db,auth:AuthContext,executionId:string,raw:unknown,signer:ManagedAdmissionSigner,now=new Date(),c:Checks=checks){
  const parsed=refusedTrackedRecoveryInput.safeParse(raw);
  if(auth.authType!=="user"||!auth.userId||auth.agentId)return error(403,"refused_tracked_recovery_owner_required");
  if(!parsed.success||!id.safeParse(executionId).success||!Number.isFinite(now.getTime()))return error(409,"refused_tracked_recovery_invalid_request");
  await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${executionId}::uuid AND workspace_id=${auth.workspaceId}::uuid FOR UPDATE`;
  const s=await recoveryBasis(db,auth,executionId,now,c);if("error" in s)return s;
  if(s.workspace.ownerUserId!==auth.userId)return error(403,"refused_tracked_recovery_owner_required");
  const i=parsed.data,scope=i.scope;
  const key=await db.trustedProviderTicketKey.findUnique({where:{workspaceId:auth.workspaceId}});
  const pub=createPublicKey(signer.publicKey),keyDigest=createHash("sha256").update(pub.export({format:"der",type:"spki"})).digest("hex");
  if(pub.asymmetricKeyType!=="ed25519"||!key||key.installationId!==i.installationId||key.publicKeyDigest!==keyDigest)return error(409,"refused_tracked_recovery_installation_changed");
  if(scope.executionId!==s.e.id||["workspaceId","taskId","applicationId","attempt"].some(k=>(scope as any)[k] !== (s.e as any)[k])||scope.reviewDigest!==s.details.nativeReviewReceiptDigest||scope.baselineCommit!==s.checkpoint.headCommit||i.taskBranch!==s.checkpoint.branch||i.baseBranch===i.taskBranch||new Set(i.paths.map(p=>p.toLowerCase())).size!==i.paths.length||i.paths.length!==s.r.categoryCounts.content||i.paths.some(p=>!s.paths.includes(p)||p.startsWith("/")||p.includes("\\")||/[\x00-\x1f\x7f:]/.test(p)||p.split("/").some(x=>!x||x===".."||x==="."||x.toLowerCase()===".git"))
    ||scope.taskBranchDigest!==digest(i.taskBranch)||scope.baseBranchDigest!==digest(i.baseBranch)||scope.originDigest!==digest(i.origin)||scope.writeScopeDigest!==digest([...s.paths].sort()))return error(409,"refused_tracked_recovery_scope_changed");
  const approval=await c.firstWrite(db,auth.workspaceId,i.installationId,s.e,s.pin,auth.userId);
  if(!approval||approval.baselineCommit!==scope.baselineCommit||approval.branch!==i.taskBranch||obj(approval).continuation||obj(approval).existingCommitVerification||approval.operations.localCommit!==true)return error(409,"refused_tracked_recovery_first_write_changed");
  const history=Array.isArray(s.m.refusedTrackedRecoveries)?s.m.refusedTrackedRecoveries:[],inputDigest=releaseDigest(i),prior=history.find((x:any)=>x.requestId===i.requestId);
  if(prior)return prior.inputDigest===inputDigest?{data:{signed:prior.signed,replay:true}}:error(409,"refused_tracked_recovery_request_conflict");
  if(history.length>=8)return error(409,"refused_tracked_recovery_history_limit");
  const payload={schemaVersion:"roost-refused-tracked-recovery-admission-v1",operation:"restore_task_changes",requestId:i.requestId,installationId:i.installationId,firstWriteDecisionId:approval.decisionId,ownerUserId:auth.userId,scope,issuedAt:now.toISOString(),expiresAt:new Date(now.getTime()+300000).toISOString()};
  const signature=signer.sign(bytes(payload));if(signature.length!==64||!verify(null,bytes(payload),pub,signature))return error(409,"refused_tracked_recovery_signing_unproven");
  const signed={payload,signature:signature.toString("hex")};
  await db.agentExecution.update({where:{id:s.e.id},data:{metadata:{...s.m,refusedTrackedRecoveries:[...history,{requestId:i.requestId,inputDigest,signed,paths:i.paths,taskBranch:i.taskBranch,baseBranch:i.baseBranch,origin:i.origin}]} as Prisma.InputJsonValue}});
  return {data:{signed,replay:false}};
}

export async function refusedTrackedRecoveryStatus(db:Db,auth:AuthContext,executionId:string,raw:unknown,now=new Date(),c:Checks=checks){
  const input=statusInput.safeParse(raw);if(!input.success||!id.safeParse(executionId).success)return error(409,"refused_tracked_recovery_invalid_request");
  const identity=workerTicketIdentitySchema.safeParse(auth.workerTicketIdentity);
  if(auth.authType==="api_key"){
    if(!auth.apiKeyId||auth.agentId||auth.userId||!identity.success||identity.data.workspaceId!==auth.workspaceId||!await c.worker(db,auth,identity.data.hostId,now))return error(403,"worker_credential_forbidden");
  }else if(auth.authType!=="user"||!auth.userId||auth.agentId)return error(403,"refused_tracked_recovery_owner_required");
  const s=await recoveryBasis(db,auth,executionId,now,c);if("error" in s)return s;
  if(auth.authType==="user"?auth.userId!==s.workspace.ownerUserId:s.e.agentHostId!==identity.data!.hostId)return error(403,"refused_tracked_recovery_owner_required");
  const row=(Array.isArray(s.m.refusedTrackedRecoveries)?s.m.refusedTrackedRecoveries:[]).find((x:any)=>x.requestId===input.data.requestId),p=row?.signed?.payload;
  if(!p||p.ownerUserId!==s.workspace.ownerUserId||p.scope?.reviewDigest!==s.details.nativeReviewReceiptDigest||p.scope.baselineCommit!==s.checkpoint.headCommit||Date.parse(p.issuedAt)>now.getTime()||Date.parse(p.expiresAt)<=now.getTime()||auth.authType==="api_key"&&p.installationId!==identity.data!.installationId)return error(409,"refused_tracked_recovery_grant_inactive");
  const approval=await c.firstWrite(db,auth.workspaceId,p.installationId,s.e,s.pin,s.workspace.ownerUserId);
  if(!approval||approval.decisionId!==p.firstWriteDecisionId||approval.baselineCommit!==p.scope.baselineCommit||approval.branch!==s.checkpoint.branch)return error(409,"refused_tracked_recovery_first_write_changed");
  return {data:{active:true,signed:row.signed,...(row.receipt?{receipt:row.receipt}:{})}};
}

// Append recovery evidence only. The historical failed native result remains
// failed, with no accepted candidate, new dispatch or release authority.
export async function recordRefusedTrackedRecoveryResult(db:Db,auth:AuthContext,executionId:string,raw:unknown,now=new Date(),c:Checks=checks){
  const input=refusedTrackedRecoveryResultInput.safeParse(raw);if(!input.success)return error(409,"refused_tracked_recovery_invalid_result");
  await db.$queryRaw`SELECT id FROM agent_executions WHERE id=${executionId}::uuid AND workspace_id=${auth.workspaceId}::uuid FOR UPDATE`;
  const status=await refusedTrackedRecoveryStatus(db,auth,executionId,{requestId:input.data.requestId},now,c);if("error" in status)return status;
  const e=await db.agentExecution.findFirst({where:{id:executionId,workspaceId:auth.workspaceId}});if(!e)return error(404,"agent_execution_not_found");
  const m=obj(e.metadata),history=m.refusedTrackedRecoveries,row=history.find((x:any)=>x.requestId===input.data.requestId),r=input.data.receipt,p=status.data.signed.payload;
  if(r.executionId!==e.id||r.reviewDigest!==p.scope.reviewDigest||r.baselineCommit!==p.scope.baselineCommit||r.restoredFileCount!==row.paths.length||r.archivedFileCount!==row.paths.length)return error(409,"refused_tracked_recovery_result_changed");
  // replay reports differ only in whether the already complete local journal
  // was read. Its original durable completion evidence stays immutable.
  const normalized=(x:any)=>({...x,replay:false});
  if(row.receipt)return releaseDigest(normalized(row.receipt))===releaseDigest(normalized(r))?{data:{recorded:true,receipt:row.receipt,replay:true}}:error(409,"refused_tracked_recovery_result_conflict");
  await db.agentExecution.update({where:{id:e.id},data:{metadata:{...m,refusedTrackedRecoveries:history.map((x:any)=>x.requestId===input.data.requestId?{...x,receipt:r,recordedAt:now.toISOString()}:x)} as Prisma.InputJsonValue}});
  return {data:{recorded:true,receipt:r,replay:false}};
}
