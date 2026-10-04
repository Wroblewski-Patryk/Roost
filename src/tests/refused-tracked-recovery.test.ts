import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { admitRefusedTrackedRecovery, refusedTrackedRecoveryStatus, recordRefusedTrackedRecoveryResult } from "../modules/agent-runtime/refused-tracked-recovery";
import { workerClaimAllowed, workerCredentialRoute, workerTicketPrincipal } from "../auth/worker-ticket-principal";
import { capabilityForRequest } from "../auth/capabilities";

const hash=(x:any)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const canonical=(x:any):any=>Array.isArray(x)?x.map(canonical):x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const bytes=(x:any)=>Buffer.from(JSON.stringify(canonical(x))+"\n");
function fixture(){
  const now=new Date("2026-10-04T04:00:00Z"),workspaceId=randomUUID(),ownerUserId=randomUUID(),installationId=randomUUID(),taskId=randomUUID(),hostId=randomUUID();
  const {publicKey,privateKey}=generateKeyPairSync("ed25519"),paths=["web/src/view.tsx","web/src/rows.ts"],writePaths=[...paths,"web/scripts/rows.test.ts"],baseline="a".repeat(40),taskBranch=`codex/task-${taskId}`;
  const contract={nativeBoundary:{profile:"coding-local",writePaths},singleTask:{branch:taskBranch}};
  const e:any={id:randomUUID(),workspaceId,taskId,applicationId:randomUUID(),agentHostId:hostId,attempt:1,status:"failed",completedAt:new Date(now.getTime()-1000),leaseToken:null,leaseExpiresAt:null,contextInvalidatedAt:null,cancelRequestedAt:null,finalResponse:null,summary:null,changedFiles:[],verification:{},checkpoint:{stage:"spawn_intent",headCommit:baseline,branch:taskBranch},metadata:{executionContract:contract,readyContextPin:{riskAdmissionCommit:baseline}},errorState:{code:"agent_native_review_blocked",retryable:false,details:{nativeReviewReceiptDigest:"b".repeat(64),nativeReviewReceipt:{version:"roost-native-review-public-v2",policy:"roost-root-scoped-coding-v2",verdict:"verification_blocked",verification:"REFUSED",installation:"PASS",scopeReviewRequired:false,refusalCode:null,reviewRequired:true,releaseAllowed:false,violations:[],bindingDigest:"c".repeat(64),jobDigest:"d".repeat(64),preFootprintDigest:"e".repeat(64),postFootprintDigest:"f".repeat(64),categoryCounts:{content:2,protected:0},changedPathIds:["1".repeat(64),"2".repeat(64)]}}}};
  const approval:any={decisionId:randomUUID(),baselineCommit:baseline,branch:taskBranch,operations:{localCommit:true}};
  const credential:any={id:randomUUID(),workspaceId,active:true,revokedAt:null,boundAgentId:null,key:null,keyHash:"synthetic-hash",credentialVersion:1,workerHostId:hostId,workerInstallationId:installationId,workerBindingEpoch:1,expiresAt:new Date(now.getTime()+600000),scopes:["agent-runtime:claim"]};
  const auth:any={authType:"user",workspaceId,userId:ownerUserId},worker:any={authType:"api_key",workspaceId,apiKeyId:credential.id,workerTicketIdentity:workerTicketPrincipal(credential,now)};
  const key:any={installationId,publicKeyDigest:createHash("sha256").update(publicKey.export({format:"der",type:"spki"})).digest("hex")};
  const state:any={ownerUserId,member:true,ready:true,approval,hostActive:true},writes:any[]=[],locks:any[]=[];
  const db:any={
    $queryRaw:async(...q:any[])=>{locks.push(q);return[];},
    agentExecution:{findFirst:async({where}:any)=>Object.entries(where).every(([k,v])=>e[k]===v)?e:null,update:async({data}:any)=>{writes.push(structuredClone(data));Object.assign(e,data);return e;}},
    workspace:{findUnique:async()=>({ownerUserId:state.ownerUserId})},workspaceMembership:{findFirst:async()=>state.member?{role:"owner"}:null},
    trustedProviderTicketKey:{findUnique:async()=>key},apiKey:{findUnique:async()=>credential},agentHost:{findFirst:async()=>state.hostActive?{id:hostId,workspaceId,status:"active"}:null}
  };
  const checks:any={ready:async()=>state.ready?{pin:{contract}}:{error:"changed"},firstWrite:async()=>state.approval,worker:workerClaimAllowed};
  const scope={schemaVersion:"roost-refused-tracked-rollback-v1",operation:"restore_task_changes",executionId:e.id,workspaceId,taskId,applicationId:e.applicationId,attempt:1,reviewDigest:e.errorState.details.nativeReviewReceiptDigest,rootIdentity:"3".repeat(64),baselineCommit:baseline,taskBranchDigest:hash(taskBranch),baseBranchDigest:hash("main"),originDigest:hash("https://example.invalid/operator/app.git"),writeScopeDigest:hash([...writePaths].sort()),changedScopeDigest:"4".repeat(64)};
  const input:any={requestId:randomUUID(),installationId,scope,paths,taskBranch,baseBranch:"main",origin:"https://example.invalid/operator/app.git"};
  const signer={publicKey:publicKey.export({format:"pem",type:"spki"}).toString(),sign:(b:Buffer)=>sign(null,b,privateKey)};
  const admit=(raw:unknown=input,a:any=auth,t=now)=>admitRefusedTrackedRecovery(db,a,e.id,raw,signer,t,checks);
  const status=(a:any=auth,t=now)=>refusedTrackedRecoveryStatus(db,a,e.id,{requestId:input.requestId},t,checks);
  const receipt:any={schemaVersion:"roost-refused-tracked-rollback-v1",completed:true,replay:false,executionId:e.id,reviewDigest:scope.reviewDigest,journalDigest:"5".repeat(64),restoredFileCount:2,archivedFileCount:2,baselineCommit:baseline,cleanBaseBranch:true,taskBranchRemoved:true,writerLeaseRetained:true,releaseAllowed:false,executionAuthorized:false,modelsInvoked:false,remoteEffects:false};
  const record=(r:any=receipt,a:any=worker)=>recordRefusedTrackedRecoveryResult(db,a,e.id,{requestId:input.requestId,receipt:r},now,checks);
  return{now,auth,worker,state,credential,e,key,scope,input,receipt,publicKey,writes,locks,admit,status,record};
}
test("owner grant signs only exact local recovery, persists once and leaves failed native evidence immutable",async()=>{
  const f=fixture(),original=structuredClone(f.e.errorState),r:any=await f.admit();assert.ok(r.data);
  assert.equal(verify(null,bytes(r.data.signed.payload),f.publicKey,Buffer.from(r.data.signed.signature,"hex")),true);
  assert.equal(r.data.signed.payload.expiresAt,"2026-10-04T04:05:00.000Z");assert.deepEqual(r.data.signed.payload.scope,f.scope);
  assert.equal(f.writes.length,1);assert.equal((await f.admit() as any).data.replay,true);assert.equal(f.writes.length,1);
  assert.deepEqual(f.e.errorState,original);assert.equal(f.e.status,"failed");assert.equal(f.e.finalResponse,null);assert.equal(f.e.metadata.resultRevision,undefined);
  assert.equal((await f.status(f.worker) as any).data.active,true);assert.equal(f.writes.length,1);
});
const denials:Record<string,(f:ReturnType<typeof fixture>)=>void>={
  "foreign owner":f=>{f.auth.userId=randomUUID();},"nonowner membership":f=>{f.state.member=false;},"worker admission":f=>{Object.assign(f.auth,f.worker);},
  "running attempt":f=>{f.e.status="running";},"attempt2":f=>{f.e.attempt=2;},"lease retained":f=>{f.e.leaseToken=randomUUID();},"scope review":f=>{f.e.errorState.details.nativeReviewReceipt.scopeReviewRequired=true;},
  "unchanged footprint":f=>{f.e.errorState.details.nativeReviewReceipt.postFootprintDigest=f.e.errorState.details.nativeReviewReceipt.preFootprintDigest;},"protected change":f=>{f.e.errorState.details.nativeReviewReceipt.categoryCounts.protected=1;},
  "native violation":f=>{f.e.errorState.details.nativeReviewReceipt.violations=["outside_scope"];},"accepted candidate":f=>{f.e.metadata.resultRevision={};},
  "foreign scope":f=>{f.input.scope.executionId=randomUUID();},"changed review":f=>{f.input.scope.reviewDigest="9".repeat(64);},"wrong baseline":f=>{f.input.scope.baselineCommit="9".repeat(40);},
  "wrong paths digest":f=>{f.input.scope.writeScopeDigest="9".repeat(64);},"unapproved path":f=>{f.input.paths[0]="web/src/other.ts";},"duplicate paths":f=>{f.input.paths[1]=f.input.paths[0];},
  "wrong task branch":f=>{f.input.taskBranch="codex/other";},"wrong base digest":f=>{f.input.baseBranch="other";},"foreign installation":f=>{f.input.installationId=randomUUID();},"changed signing key":f=>{f.key.publicKeyDigest="9".repeat(64);},
  "Ready invalidated":f=>{f.state.ready=false;},"firstwrite revoked":f=>{f.state.approval=null;},"wrong firstwrite baseline":f=>{f.state.approval.baselineCommit="9".repeat(40);},"continuation authority":f=>{f.state.approval.continuation={};},"no local commit authority":f=>{f.state.approval.operations.localCommit=false;}
};
for(const[name,change]of Object.entries(denials))test(`recovery admission denies ${name} without persistence`,async()=>{const f=fixture();change(f);assert.ok("error"in await f.admit());assert.equal(f.writes.length,0);});
test("request conflicts, unknown fields, invalid paths and extra candidate powers are refused",async()=>{
  for(const origin of ["not-a-url","ssh://example.invalid/app.git","http://example.invalid/app.git","https://user@example.invalid/app.git","https://example.invalid/app.git?token=synthetic","https://example.invalid/app.git#extra"]){const f=fixture();assert.ok("error"in await f.admit({...f.input,origin}));assert.equal(f.writes.length,0);}
  for(const extra of [{releaseAllowed:true},{scope:{...fixture().scope,identity:{}}},{paths:["../outside"]},{paths:[".git/config"]}]){const f=fixture();assert.ok("error"in await f.admit({...f.input,...extra}));assert.equal(f.writes.length,0);}
  const f=fixture();await f.admit();const original=structuredClone(f.e.metadata);f.input.scope.changedScopeDigest="9".repeat(64);assert.equal((await f.admit() as any).error,"refused_tracked_recovery_request_conflict");assert.deepEqual(f.e.metadata,original);
});
test("status checks actual current Worker credentials and owner/firstwrite basis, including expiry",async()=>{
  for(const change of [(f:any)=>{f.credential.revokedAt=f.now;},(f:any)=>{f.credential.credentialVersion++;},(f:any)=>{f.credential.workerBindingEpoch++;},(f:any)=>{f.key.installationId=randomUUID();},(f:any)=>{f.e.agentHostId=randomUUID();},(f:any)=>{f.state.ownerUserId=randomUUID();},(f:any)=>{f.state.approval=null;},(f:any)=>{f.state.ready=false;}]){const f=fixture();await f.admit();change(f);assert.ok("error"in await f.status(f.worker));assert.equal(f.writes.length,1);}
  const f=fixture();await f.admit();assert.ok("error"in await f.status(f.worker,new Date(f.now.getTime()+300000)));assert.equal(f.writes.length,1);
});
test("recovery completion appends one exact receipt; replays preserve original and cannot accept candidate",async()=>{
  const f=fixture();await f.admit();const result:any=await f.record();assert.equal(result.data.recorded,true);assert.equal(f.writes.length,2);
  const historical=structuredClone(f.e);assert.equal((await f.record({...f.receipt,replay:true}) as any).data.replay,true);assert.deepEqual(f.e,historical);
  assert.equal((await f.status(f.worker) as any).data.receipt.journalDigest,f.receipt.journalDigest);
  assert.equal((await f.record({...f.receipt,journalDigest:"9".repeat(64)}) as any).error,"refused_tracked_recovery_result_conflict");assert.deepEqual(f.e,historical);
  assert.equal(f.e.status,"failed");assert.equal(f.e.finalResponse,null);assert.equal(f.e.metadata.resultRevision,undefined);
});
test("incomplete/mismatched/effectful receipts are never persisted",async()=>{
  for(const change of [{completed:false},{executionId:randomUUID()},{reviewDigest:"9".repeat(64)},{restoredFileCount:1},{archivedFileCount:1},{baselineCommit:"9".repeat(40)},{modelsInvoked:true},{remoteEffects:true},{writerLeaseRetained:false},{executionAuthorized:true},{releaseAllowed:true},{extra:"unknown"}]){const f=fixture();await f.admit();assert.ok("error"in await f.record({...f.receipt,...change}));assert.equal(f.writes.length,1);}
});
test("Worker allowlist permits only POST status/result, never owner grant or arbitrary history",()=>{
  const root=`/v1/agent-runtime/executions/${randomUUID()}/actions/`;
  for(const action of ["refused-tracked-recovery-status","refused-tracked-recovery-result"]){assert.equal(workerCredentialRoute("POST",root+action),true);assert.equal(workerCredentialRoute("GET",root+action),false);assert.equal(capabilityForRequest({method:"POST",path:root+action} as any),"agent-runtime:claim");}
  assert.equal(workerCredentialRoute("POST",root+"refused-tracked-recovery-admission"),false);
  assert.equal(capabilityForRequest({method:"POST",path:root+"refused-tracked-recovery-admission"} as any),"agent-runtime:write");
  assert.equal(capabilityForRequest({method:"POST",path:root+"prior-coding-refusal"} as any),"agent-runtime:claim");
  assert.equal(workerCredentialRoute("GET",root.replace(/\/actions\/$/,"")),false);
});
