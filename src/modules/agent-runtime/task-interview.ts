import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { lockReadyTask } from "./task-execution-readiness";
import { reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { admitCapability,recordCapabilityUse } from "./task-capability-admission";
import { interviewPublish, interviewRespond } from "./task-interview-contract";
type Db=Prisma.TransactionClient;
const wire=(r:any)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=="request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));
async function state(db:Db,w:string,t:string,actor:ReviewActor){
 const task=await lockReadyTask(db,w,t);if(!task)return {error:"task_not_found"};
 const principal=await resolveReviewPrincipal(db,w,actor);if(!principal)return {error:"interview_forbidden"};
 const member=principal.kind==="user"?await db.workspaceMembership.findFirst({where:{workspaceId:w,userId:principal.id}}):null;
 if(principal.kind==="agent"&&!(await db.$queryRaw<any[]>`SELECT EXISTS(SELECT 1 FROM unnest(ARRAY['accountableManager','executor','verifier','releaser']) r WHERE task_handoff_principal(${t}::uuid,r)=jsonb_build_object('kind','agent','id',${principal.id}::text)) AS allowed`)[0].allowed)return {error:"interview_forbidden"};
 const source=(await db.$queryRaw<any[]>`SELECT task_interview_context(${t}::uuid) AS context,task_interview_source(${t}::uuid) AS version,task_interview_version(${t}::uuid) AS ledger`)[0];
 const cases=await db.$queryRaw<any[]>`SELECT c.*,task_interview_status(c.id) AS status,EXISTS(SELECT 1 FROM task_interview_cases WHERE supersedes_id=c.id) AS superseded FROM task_interview_cases c WHERE workspace_id=${w}::uuid AND task_id=${t}::uuid ORDER BY created_at DESC,id DESC LIMIT 101`;
 const entries=cases.length?await db.$queryRaw<any[]>`SELECT DISTINCT ON(case_id) * FROM task_interview_entries WHERE case_id=ANY(${cases.slice(0,100).map(c=>c.id)}::uuid[]) ORDER BY case_id,version DESC`:[];
 const expectedVersion=reviewDigest({source,head:cases.map(c=>c.id),entries:entries.map(e=>e.id),principal,role:member?.role});
 return {task,principal,member,source,cases,entries,expectedVersion};
}
export async function interviewView(db:Db,w:string,t:string,actor:ReviewActor,caseId?:string){
 const s=await state(db,w,t,actor);if("error" in s)return {error:s.error!};
 const appId=s.source.context?.application?.id;
 const sources=appId?await db.$queryRaw<any[]>`SELECT task_interview_record(id) AS ref FROM company_records WHERE workspace_id=${w}::uuid AND (application_id IS NULL OR application_id=${appId}::uuid) AND status<>'archived' ORDER BY id LIMIT 101`:[];
 const owners=await db.workspaceMembership.findMany({where:{workspaceId:w,role:"owner"},select:{userId:true}});
 const selected=s.cases.find(c=>c.id===caseId)??s.cases.find(c=>!c.superseded&&c.status!=="accepted")??s.cases.find(c=>!c.superseded);
 const history=selected?await db.$queryRaw<any[]>`SELECT * FROM task_interview_entries WHERE case_id=${selected.id}::uuid ORDER BY version DESC LIMIT 51`:[];
 const data={task:{id:t,title:s.task.title},expectedVersion:s.expectedVersion,context:s.source.context,contextVersion:s.source.version,
  canPrepare:!!s.source.context&&["todo","in_progress","blocked"].includes(s.task.status),principalId:s.principal.id,ownerIds:owners.map(o=>o.userId),
  sources:sources.slice(0,100).map(r=>r.ref),truncated:sources.length>100||s.cases.length>100,
  cases:s.cases.slice(0,100).map(c=>({...(c.id===selected?.id?wire(c):{id:c.id,taskId:c.task_id,status:c.status,version:c.version,superseded:c.superseded}),body:c.id===selected?.id?c.body:{topic:c.body.topic},current:c.source_version===s.source.version,canRespond:c.principal_id===s.principal.id&&s.member?.role==="owner"&&!c.superseded&&c.source_version===s.source.version,entries:c.id===selected?.id?history.slice(0,50).map(wire):[],historyTruncated:c.id===selected?.id&&history.length>50})),
  blocking:(await db.$queryRaw<any[]>`SELECT task_interview_pending(${t}::uuid) AS value`)[0].value};
 requireRuntimeContent(data,"interview.read",{workspaceId:w,taskId:t});return data;
}
export async function interviewCommand(db:Db,w:string,t:string,actor:ReviewActor,kind:"publish"|"respond",body:unknown){
 const input:any=(kind==="publish"?interviewPublish:interviewRespond).parse(body);
 requireRuntimeContent(input,"interview.command",{workspaceId:w,taskId:t});
 const s=await state(db,w,t,actor);if("error" in s)return {error:s.error!};
 if(s.principal.kind==="agent"&&kind!=="publish")return {error:"interview_forbidden"};
 const requestHash=reviewDigest({input,kind,t,principal:s.principal});
 const previous=kind==="publish"?(await db.$queryRaw<any[]>`SELECT * FROM task_interview_cases WHERE workspace_id=${w}::uuid AND request_id=${input.requestId}::uuid`)[0]:(await db.$queryRaw<any[]>`SELECT * FROM task_interview_entries WHERE workspace_id=${w}::uuid AND request_id=${input.requestId}::uuid`)[0];
 let grant:any=null;
 if(s.principal.kind==="agent"){
  const admission=await admitCapability(db,w,t,s.principal,"interview_prepare",input.grantId,previous?wire(previous):undefined);
  if("error" in admission)return {error:admission.error!};grant=admission.grant;
  if(reviewDigest(grant?.snapshot?.interview)!==reviewDigest({unknownKey:input.block.unknownKey,decisionClass:input.block.decisionClass,principalId:input.block.principalId}))return {error:"interview_grant_invalid"};
 }
 if(previous){if(previous.request_hash!==requestHash)return {error:"interview_key_conflict"};
  if(kind==="respond"&&(s.member?.role!=="owner"||previous.actor_user_id!==s.principal.id))return {error:"interview_forbidden"};
  const result={record:wire(previous),replayed:true};requireRuntimeContent(result,"interview.replay",{workspaceId:w,taskId:t});return result;}
 if(input.expectedVersion!==s.expectedVersion)return {error:"interview_stale"};
 const id=randomUUID();
 if(kind==="publish"){
  if(!s.source.context)return {error:"interview_scope_invalid"};
  if(input.grantId&&s.principal.kind!=="agent")return {error:"interview_grant_invalid"};
  const b=input.block,old=s.cases.find(c=>c.id===input.supersedesId);
  if(input.supersedesId&&(!old||s.member?.role!=="owner"||!input.revisionReason))return {error:"interview_revision_invalid"};
  if(!input.supersedesId&&s.cases.some(c=>c.unknown_key===b.unknownKey))return {error:"interview_duplicate"};
  requireRuntimeContent({context:s.source.context,block:b},"interview.source",{workspaceId:w,taskId:t});
  await db.$executeRaw`INSERT INTO task_interview_cases(id,workspace_id,task_id,application_id,version,supersedes_id,revision_reason,principal_id,unknown_key,decision_class,body,source_version,source_snapshot,actor_user_id,actor_agent_id,actor_credential_id,capability_grant_id,request_id,request_hash)
   VALUES(${id}::uuid,${w}::uuid,${t}::uuid,${s.source.context.application.id}::uuid,${(old?.version??0)+1},${input.supersedesId??null}::uuid,${input.revisionReason??null},${b.principalId}::uuid,${b.unknownKey},${b.decisionClass},${JSON.stringify(b)}::jsonb,${s.source.version},${JSON.stringify(s.source.context)}::jsonb,${s.principal.kind==="user"?s.principal.id:null}::uuid,${s.principal.kind==="agent"?s.principal.id:null}::uuid,${s.principal.credentialId}::uuid,${grant?.id??null}::uuid,${input.requestId}::uuid,${requestHash})`;
  await recordCapabilityUse(db,grant,input.requestId,"interview",id);
  await db.event.create({data:{workspaceId:w,taskId:t,type:"task_interview_attention",source:"roost",actorType:s.principal.kind,actorId:s.principal.id,resourceType:"task_interview",resourceId:id,payload:{caseId:id,principalId:b.principalId,decisionClass:b.decisionClass,status:"pending"}}});
 }else{
  const c=s.cases.find(c=>c.id===input.caseId);if(!c)return {error:"interview_not_found"};
  if(c.principal_id!==s.principal.id||s.member?.role!=="owner")return {error:"interview_forbidden"};
  if(c.superseded||c.source_version!==s.source.version)return {error:"interview_stale"};
  const b=c.body;let decisionId:string|null=null;
  if(input.action==="answer"){
   if(c.status==="proposed"||c.status==="accepted")return {error:"interview_transition_invalid"};
   if(input.answers.length!==b.questions.length||b.questions.some((q:any)=>input.answers.filter((a:any)=>a.field===q.field).length!==1))return {error:"interview_answers_invalid"};
   const proposal={workspaceId:w,projectId:s.task.projectId,title:b.topic,context:b.context,problem:b.missing,decision:JSON.stringify(input.answers),rationale:b.recommendation,
    alternatives:b.questions.map((q:any)=>({field:q.field,options:q.options})),consequences:b.consequences,outcome:JSON.stringify({scope:b.scope,dependencies:b.dependencies,deferralEffect:b.deferralEffect}),authorType:"user",authorId:s.principal.id,status:"proposed",source:"roost_interview",externalId:c.id};
   requireRuntimeContent(proposal,"interview.proposal",{workspaceId:w,taskId:t});
   decisionId=(await db.decision.create({data:proposal})).id;
  }
  await db.$executeRaw`INSERT INTO task_interview_entries(id,workspace_id,case_id,version,action,actor_user_id,body,decision_id,request_id,request_hash)
   VALUES(${id}::uuid,${w}::uuid,${c.id}::uuid,${(s.entries.find(e=>e.case_id===c.id)?.version??0)+1},${input.action},${s.principal.id}::uuid,${JSON.stringify({reason:input.reason,...(input.answers?{answers:input.answers}:{})})}::jsonb,${decisionId}::uuid,${input.requestId}::uuid,${requestHash})`;
  await db.event.create({data:{workspaceId:w,taskId:t,type:"task_interview_recorded",source:"roost",actorType:s.principal.kind,actorId:s.principal.id,resourceType:"task_interview",resourceId:c.id,payload:{caseId:c.id,entryId:id,action:input.action,decisionId}}});
 }
 const record=kind==="publish"?(await db.$queryRaw<any[]>`SELECT * FROM task_interview_cases WHERE id=${id}::uuid`)[0]:(await db.$queryRaw<any[]>`SELECT * FROM task_interview_entries WHERE id=${id}::uuid`)[0];
 return {record:wire(record),replayed:false};
}
