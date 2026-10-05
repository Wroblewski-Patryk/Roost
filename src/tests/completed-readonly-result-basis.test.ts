import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {completedResultBasisEligibility} from "../modules/agent-runtime/completed-result-basis";

function auditor() {
 const id=randomUUID(),taskId=randomUUID(),hostId=randomUUID(),applicationId=randomUUID(),hash="a".repeat(64);
 const actorId=randomUUID();
 const contract={singleTask:{branch:`codex/task-${taskId}`},nativeBoundary:{profile:"inspect-readonly",inspectReadOnly:{kind:"auditor"},runtime:{required:false,ports:[]}},
  assignment:{agentId:actorId},taskRoles:{executor:{id:actorId}},
  access:{sandbox:"read-only",externalWrites:false,tools:["repository_read"],permissions:["repository_read"]},
  modelSelection:{schemaVersion:"roost-managed-hermes-backend-v1",backend:"codex_responses"}};
 const execution:any={id,taskId,agentHostId:hostId,applicationId,attempt:1,checkpointVersion:2,status:"completed",
  completedAt:new Date("2026-10-01T12:05:00Z"),prompt:"Inspect exact source and preserve missing runtime evidence",baseBranch:"main",changedFiles:[],
  summary:"CHANGES_REQUIRED: deployment, observation and independent acceptance remain pending.",finalResponse:"CHANGES_REQUIRED",
  metadata:{executionContract:contract,readyContextPin:{pinId:randomUUID(),revision:hash,riskAdmissionCommit:"b".repeat(40)},resultRevisionReviewVersion:"1",
   resultRevision:{schemaVersion:"roost-result-revision-v1",id:randomUUID(),commit:"c".repeat(40),branch:contract.singleTask.branch,
    workingTree:"clean",executionId:id,attempt:1,hostId,checkpointVersion:2,observedAt:"2026-10-01T12:05:00Z"}},
  verification:{managedAdmission:{qualification:"signed_native_v1",evidenceDigest:hash,jobSourceDigest:hash},
   ownedTreeReceipt:{version:"roost-windows-job-v2",attempt:id,sourceSha256:hash,cleanup:true,jobClosed:true,rootExit:0,activeProcesses:0,assignedBeforeResume:true,resumed:true,killOnClose:true,breakaway:false},
   readOnlyAudit:{schemaVersion:"roost-readonly-audit-v1",verdict:"verified",evidenceDigest:hash,preTree:hash,postTree:hash,
    gitState:"unchanged",processState:"unchanged",dockerState:"unchanged",nativeTools:[]}}};
 const pin:any={status:"ready",pinId:randomUUID(),revision:"d".repeat(64),validatedAt:"2026-10-01T12:10:00Z",applicationId,
  contract:structuredClone(contract),prompt:execution.prompt,baseBranch:"main",riskAdmissionCommit:"b".repeat(40)};
 return{execution,pin};
}
test("unchanged signed readonly audit can bind fresh Ready without tests, semantic promotion or native mutation",()=>{
 const {execution,pin}=auditor(),before=structuredClone(execution);
 assert.equal(completedResultBasisEligibility(execution,pin),null);assert.deepEqual(execution,before);
 assert.equal(execution.verification.codingTests,undefined);assert.match(execution.summary,/CHANGES_REQUIRED/);
});
for(const[name,change] of Object.entries<(e:any,p:any)=>void>({
 unsigned:e=>e.verification.managedAdmission.qualification="unsigned",
 wrongJobVersion:e=>e.verification.ownedTreeReceipt.version="roost-windows-job-v1",
 nonIsoDate:e=>e.metadata.resultRevision.observedAt="October 1, 2026",
 sourceMismatch:e=>e.verification.ownedTreeReceipt.sourceSha256="f".repeat(64),
 activeChild:e=>e.verification.ownedTreeReceipt.activeProcesses=1,
 openJob:e=>e.verification.ownedTreeReceipt.jobClosed=false,
 failedRoot:e=>e.verification.ownedTreeReceipt.rootExit=1,
 beforeAssignment:e=>e.verification.ownedTreeReceipt.assignedBeforeResume=false,
 breakaway:e=>e.verification.ownedTreeReceipt.breakaway=true,
 tools:e=>e.verification.readOnlyAudit.nativeTools=["terminal"],
 changedTree:e=>e.verification.readOnlyAudit.postTree="f".repeat(64),
 changedProcess:e=>e.verification.readOnlyAudit.processState="changed",
 changedDocker:e=>e.verification.readOnlyAudit.dockerState="changed",
 changedGit:e=>e.verification.readOnlyAudit.gitState="changed",
 writes:e=>e.metadata.executionContract.access.externalWrites=true,
 extraPermission:e=>e.metadata.executionContract.access.permissions.push("repository_write"),
 runtime:e=>e.metadata.executionContract.nativeBoundary.runtime.required=true,
 port:e=>e.metadata.executionContract.nativeBoundary.runtime.ports=[8000],
 wrongExecutor:e=>e.metadata.executionContract.taskRoles.executor.id=randomUUID(),
 codeReviewer:e=>e.metadata.executionContract.nativeBoundary.inspectReadOnly.kind="code-reviewer",
 changedFile:e=>e.changedFiles=["app.ts"],
 lease:e=>e.leaseToken="still-owned",
 invalidated:e=>e.contextInvalidatedAt=new Date(),
 nativeNegative:e=>e.verification.outcome="boundary_violation",
 nativeError:e=>e.errorState={code:"execution_failed"},
 changedPrompt:(_e,p)=>p.prompt="Perform a deployment",
 changedScope:(_e,p)=>p.contract.access.tools.push("terminal"),
 changedCommit:(_e,p)=>p.riskAdmissionCommit="f".repeat(40),
 samePin:(e,p)=>p.pinId=e.metadata.readyContextPin.pinId
}))test(`readonly revalidation refuses ${name}`,()=>{const{execution,pin}=auditor();change(execution,pin);assert.notEqual(completedResultBasisEligibility(execution,pin),null);});
