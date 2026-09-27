import assert from "node:assert/strict";
import test from "node:test";
import { firstWriteGate } from "../modules/agent-runtime/managed-admission";
import { firstWriteApproval } from "../modules/decisions/decision-governance-contract";

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const taskId=id(1),applicationId=id(2),installationId=id(3),hostId=id(4);
const auditorExecutionId=id(5),verifierExecutionId=id(6),auditorTaskId=id(7),verifierTaskId=id(8);
const baselineCommit="a".repeat(40), auditorEvidenceDigest="b".repeat(64),verifierEvidenceDigest="c".repeat(64);
const branch=`codex/task-${taskId}`;
const approval={schemaVersion:"roost-first-write-approval-v1",taskId,applicationId,installationId,branch,baselineCommit,
 auditorExecutionId,verifierExecutionId,auditorEvidenceDigest,verifierEvidenceDigest,
 capabilities:["repository_read","repository_write","local_test"],operations:{localCommit:true},
 remotePush:false,deployment:false,financialWrites:false};
const receipt=(digest:string)=>({schemaVersion:"roost-readonly-audit-v1",verdict:"verified",evidenceDigest:digest,
 preTree:"d".repeat(64),postTree:"d".repeat(64),processState:"unchanged",dockerState:"unchanged",gitState:"unchanged",nativeTools:[]});
const canary=(id:string,taskId:string,agentId:string,kind:"auditor"|"verifier",digest:string,completedAt:string)=>({
 id,taskId,agentHostId:hostId,status:"completed",completedAt:new Date(completedAt),changedFiles:[],
 metadata:{executionContract:{nativeBoundary:{profile:"inspect-readonly",inspectReadOnly:{kind}},access:{tools:["repository_read"],permissions:["repository_read"]},assignment:{agentId}},resultRevision:{commit:baselineCommit,workingTree:"clean"}},
 verification:{readOnlyAudit:{...receipt(digest),...(kind==="verifier"?{verifiedExecutionId:auditorExecutionId,verifiedEvidenceDigest:auditorEvidenceDigest}:{})}}});
const canaries=[canary(auditorExecutionId,auditorTaskId,id(9),"auditor",auditorEvidenceDigest,"2026-09-27T09:00:00Z"),
 canary(verifierExecutionId,verifierTaskId,id(10),"verifier",verifierEvidenceDigest,"2026-09-27T09:30:00Z")];
const mock=(body:unknown,items:unknown[])=>({$queryRaw:async()=>[{id:id(11),at:new Date("2026-09-27T10:00:00Z"),body:{firstWriteApproval:body}}],agentExecution:{findMany:async()=>items}}) as any;
const run=(body:unknown,items:unknown[]=canaries)=>firstWriteGate(mock(body,items),id(12),installationId,
 {taskId,applicationId,agentHostId:hostId},{contract:{nativeBoundary:{profile:"coding-local"},singleTask:{branch}}},id(13));

test("first pilot write binds two completed independent unchanged native canaries and a local-only decision",async()=>{
 assert.equal(firstWriteApproval.safeParse(approval).success,true);
 assert.deepEqual(await run(approval),{decisionId:id(11),baselineCommit,branch,operations:{localCommit:true}});
 for(const bad of [{...approval,operations:{localCommit:false}},{...approval,remotePush:true},{...approval,deployment:true}])
   assert.equal(firstWriteApproval.safeParse(bad).success,false);
});
test("first pilot write refuses a changed canary, wrong reviewer link or late owner decision",async()=>{
 for(const items of [[{...canaries[0],changedFiles:["pilot.ts"]},canaries[1]],
   [canaries[0],{...canaries[1],verification:{readOnlyAudit:{...receipt(verifierEvidenceDigest),verifiedExecutionId:id(14),verifiedEvidenceDigest:auditorEvidenceDigest}}}],
   [canaries[0],{...canaries[1],completedAt:new Date("2026-09-27T11:00:00Z")}]] )
   await assert.rejects(run(approval,items),/managed_admission_denied/);
});
