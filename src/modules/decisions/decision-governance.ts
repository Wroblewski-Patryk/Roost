import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { interviewCommand,interviewView } from "../agent-runtime/task-interview";
import { decisionAction,decisionDeferral,decisionProposal,reopeningEvent } from "./decision-governance-contract";
type Db=Prisma.TransactionClient;
const wire=(r:any)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=="request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));
async function state(db:Db,w:string,u:string|null,id?:string){
 if(id&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))return {error:"decision_not_found"};
 await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
 const role=u?(await db.workspaceMembership.findFirst({where:{workspaceId:w,userId:u}}))?.role:null;
 const revisions=await db.$queryRaw<any[]>`SELECT r.*,decision_state(r.decision_id) AS state FROM decision_revisions r WHERE workspace_id=${w}::uuid ORDER BY created_at DESC LIMIT 201`;
 const selected=id?(await db.$queryRaw<any[]>`SELECT r.*,decision_state(r.decision_id) AS state FROM decision_revisions r WHERE workspace_id=${w}::uuid AND decision_id=${id}::uuid`)[0]:undefined;
 if(id&&!selected)return {error:"decision_not_found"};
 const previews=selected?await db.$queryRaw<any[]>`SELECT * FROM decision_impact_previews WHERE decision_id=${id}::uuid ORDER BY version DESC LIMIT 51`:[];
 const acceptance=selected?(await db.$queryRaw<any[]>`SELECT * FROM decision_acceptances WHERE decision_id=${id}::uuid`)[0]:null;
 const deferrals=await db.$queryRaw<any[]>`SELECT f.*,e.id AS event_id,e.event_type,e.created_at AS reopened_at FROM decision_deferrals f LEFT JOIN decision_reopening_events e ON e.deferral_id=f.id WHERE f.workspace_id=${w}::uuid ORDER BY f.created_at DESC LIMIT 201`;
 const references=await Promise.all(deferrals.map(async f=>{
  const k=f.condition.type==='resource_available'?'resource':f.condition.type==='configuration_changed'?'company_record':null;
  const record=k?(await db.$queryRaw<any[]>`SELECT decision_node(${w}::uuid,${k},${f.condition.referenceId}::uuid) AS value`)[0].value:null;
  return {id:f.id,revision:record?reviewDigest(record):null,sqlRevision:record?(await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(decision_node(${w}::uuid,${k!},${f.condition.referenceId}::uuid)::text,'UTF8')),'hex') AS value`)[0].value:null};
 }));
 const impact=selected?(await db.$queryRaw<any[]>`SELECT decision_current_impact(${w}::uuid,${JSON.stringify(selected.body.scope)}::jsonb) AS value`)[0].value:null;
 const expectedVersion=reviewDigest({u,role,revisions:revisions.map(r=>[r.decision_id,r.state]),previews:previews.map(p=>p.id),acceptance:acceptance?.id,deferrals:deferrals.map(f=>[f.id,f.event_id]),references,impact});
 return {role,revisions,selected,previews,acceptance,deferrals,references,impact,expectedVersion};
}
export async function decisionGovernanceView(db:Db,w:string,u:string|null,id?:string){
 const s=await state(db,w,u,id);if("error" in s)return s;
 const catalog=id?[]:await db.task.findMany({where:{workspaceId:w},select:{id:true,title:true},orderBy:{id:"asc"},take:101});
 const resourceCatalog=id?[]:await db.resource.findMany({where:{workspaceId:w},select:{id:true,name:true},orderBy:{id:"asc"},take:101});
 const configurationCatalog=id?[]:await db.companyRecord.findMany({where:{workspaceId:w,recordType:"configuration",status:{not:"archived"}},select:{id:true,title:true},orderBy:{id:"asc"},take:101});
 const ancestors:any[]=[];let cursor=s.selected?.supersedes_id;
 for(let i=0;cursor&&i<50;i++){
  const d=await db.decision.findFirst({where:{id:cursor,workspaceId:w},select:{id:true,title:true,decision:true,supersedesId:true,status:true}});if(!d)break;ancestors.push(d);cursor=d.supersedesId;
 }
 const supersededBy=id?await db.decision.findMany({where:{workspaceId:w,supersedesId:id},select:{id:true,title:true,status:true},take:51}):[];
 const taskIds:string[]=s.impact?.taskIds??[];
 const taskStates=taskIds.length?await db.task.findMany({where:{workspaceId:w,id:{in:taskIds}},select:{id:true,title:true,executionReadiness:true}}):[];
 const gates=await Promise.all(taskIds.map(async t=>({taskId:t,...(await db.$queryRaw<any[]>`SELECT task_admission_view(${t}::uuid,'decision_supersede') AS value`)[0].value})));
 const data={expectedVersion:s.expectedVersion,canWrite:s.role==="owner",selected:s.selected?wire(s.selected):null,
  revisions:s.revisions.slice(0,200).map(r=>({id:r.decision_id,title:r.body.title,state:r.state,version:r.version,supersedesId:r.supersedes_id})),
  previews:s.previews.slice(0,50).map(wire),acceptance:s.acceptance?wire(s.acceptance):null,impact:s.impact,ancestors,supersededBy,gates,
  current:!!s.impact&&!!s.previews[0]&&reviewDigest(s.impact)===reviewDigest(s.previews[0].impact),taskStates,
  deferrals:s.deferrals.slice(0,200).map(f=>({...wire(f),referenceRevision:s.references.find(r=>r.id===f.id)?.sqlRevision})),
  catalog:catalog.slice(0,100).map(t=>({type:"task",...t})),resourceCatalog:resourceCatalog.slice(0,100),configurationCatalog:configurationCatalog.slice(0,100),truncated:s.revisions.length>200||s.previews.length>50||s.deferrals.length>200||catalog.length>100||resourceCatalog.length>100||configurationCatalog.length>100||!!cursor};
 requireRuntimeContent(data,"decision.read",{workspaceId:w});return data;
}
async function event(db:Db,w:string,u:string,type:string,id:string,payload:any){
 await db.event.create({data:{workspaceId:w,type,source:"roost",actorType:"user",actorId:u,resourceType:"decision",resourceId:id,payload}});
}
export async function decisionGovernanceCommand(db:Db,w:string,u:string|null,kind:"proposal"|"action"|"defer"|"reopen",body:unknown,id?:string){
 const input:any=(kind==="proposal"?decisionProposal:kind==="action"?decisionAction:kind==="defer"?decisionDeferral:reopeningEvent).parse(body);
 requireRuntimeContent(input,"decision.command",{workspaceId:w});
 const s=await state(db,w,u,kind==="action"?id:undefined);if("error" in s)return s;
 if(!u||s.role!=="owner")return {error:"decision_forbidden"};
 const hash=reviewDigest({input,kind,id:id??null,u});
 const table=kind==="proposal"?Prisma.sql`decision_revisions`:kind==="defer"?Prisma.sql`decision_deferrals`:kind==="reopen"?Prisma.sql`decision_reopening_events`:input.action==="accept"?Prisma.sql`decision_acceptances`:Prisma.sql`decision_impact_previews`;
 const prior=(await db.$queryRaw<any[]>`SELECT * FROM ${table} WHERE workspace_id=${w}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior){if(prior.request_hash!==hash)return {error:"decision_request_conflict"};const result={record:{...wire(prior),...(kind==="proposal"?{id:prior.decision_id}:{})},replayed:true};requireRuntimeContent(result,"decision.replay",{workspaceId:w});return result;}
 if(input.expectedVersion!==s.expectedVersion)return {error:"decision_stale"};
 if(kind==="proposal"&&input.supersedesId&&(await db.$queryRaw<any[]>`SELECT 1 FROM decision_revisions WHERE workspace_id=${w}::uuid AND supersedes_id=${input.supersedesId}::uuid`).length)return {error:"decision_successor_exists"};
 const rid=randomUUID();
 if(kind==="proposal"){
  const {requestId,expectedVersion,...b}=input;
  const predecessor=b.supersedesId?(await db.$queryRaw<any[]>`SELECT to_jsonb(d) AS value FROM decisions d WHERE id=${b.supersedesId}::uuid AND workspace_id=${w}::uuid`)[0]?.value:null;
  requireRuntimeContent(predecessor,"decision.predecessor",{workspaceId:w});
  const created=await db.decision.create({data:{id:rid,workspaceId:w,title:b.title,context:b.context,decision:b.decision,rationale:b.rationale,consequences:b.consequences,status:"proposed",source:"roost_decision",authorType:"user",authorId:u,supersedesId:b.supersedesId}});
  await db.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,supersedes_id,version,body,predecessor,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${b.supersedesId}::uuid,COALESCE((SELECT version FROM decision_revisions WHERE decision_id=${b.supersedesId}::uuid),0)+1,${JSON.stringify(b)}::jsonb,${predecessor?JSON.stringify(predecessor):null}::jsonb,${u}::uuid,${requestId}::uuid,${hash})`;
  const impact=(await db.$queryRaw<any[]>`SELECT decision_impact(${w}::uuid,${JSON.stringify(b.scope)}::jsonb) AS value`)[0].value;
  requireRuntimeContent(impact,"decision.impact",{workspaceId:w});
  await db.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${randomUUID()}::uuid,${rid}::uuid,${w}::uuid,1,${JSON.stringify(impact)}::jsonb,${u}::uuid,${randomUUID()}::uuid,${hash})`;
  await event(db,w,u,"decision_governance_attention",rid,{decisionId:rid,state:"pending"});
  return {record:created,replayed:false};
 }
 if(kind==="action"){
  if(!s.selected)return {error:"decision_not_found"};
  requireRuntimeContent({proposal:s.selected,impact:s.impact},"decision.acceptance",{workspaceId:w});
  if(input.action==="review_impact"){
   await db.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${id}::uuid,${w}::uuid,${(s.previews[0]?.version??0)+1},${JSON.stringify(s.impact)}::jsonb,${u}::uuid,${input.requestId}::uuid,${hash})`;
  }else{
   if(!input.previewId)return {error:"decision_preview_required"};
   await db.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${id}::uuid,${w}::uuid,${input.previewId}::uuid,${u}::uuid,${input.requestId}::uuid,${hash})`;
  }
  await event(db,w,u,"decision_governance_recorded",id!,{decisionId:id,action:input.action,recordId:rid});
 }else if(kind==="defer"){
  let scope:any,entryId:string|null=null;
  if(input.targetType==="decision")scope=s.revisions.find(r=>r.decision_id===input.targetId)?.body.scope;
  else {
   const c=(await db.$queryRaw<any[]>`SELECT * FROM task_interview_cases WHERE id=${input.targetId}::uuid AND workspace_id=${w}::uuid`)[0];if(!c)return {error:"decision_not_found"};
   const v=await interviewView(db,w,c.task_id,u);if("error" in v)return v;
   const result=await interviewCommand(db,w,c.task_id,u,"respond",{requestId:randomUUID(),expectedVersion:v.expectedVersion,caseId:c.id,action:"defer",reason:input.explanation});if("error" in result)return result;
   entryId=result.record.id as string;scope=[{type:"task",id:c.task_id}];
  }
  if(!scope)return {error:"decision_not_found"};
  const referenceType=input.condition.type==="resource_available"?"resource":input.condition.type==="configuration_changed"?"company_record":null;
  const baseline=referenceType?(await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(decision_node(${w}::uuid,${referenceType},${input.condition.referenceId}::uuid)::text,'UTF8')),'hex') AS value`)[0].value:null;
  await db.$executeRaw`INSERT INTO decision_deferrals(id,workspace_id,target_type,target_id,version,reason,explanation,condition,baseline,scope,interview_entry_id,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${input.targetType},${input.targetId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM decision_deferrals WHERE target_type=${input.targetType} AND target_id=${input.targetId}::uuid),${input.reason},${input.explanation},${JSON.stringify(input.condition)}::jsonb,${baseline},${JSON.stringify(scope)}::jsonb,${entryId}::uuid,${u}::uuid,${input.requestId}::uuid,${hash})`;
  await event(db,w,u,"decision_governance_recorded",input.targetId,{action:"defer",deferralId:rid,targetType:input.targetType});
 }else{
  const f=s.deferrals.find(f=>f.id===input.deferralId);if(!f)return {error:"decision_not_found"};
  if(f.condition.type!==input.type)return {error:"decision_event_invalid"};
  if(f.event_id)return {record:{id:f.event_id},replayed:true};
  await db.$executeRaw`INSERT INTO decision_reopening_events(id,workspace_id,deferral_id,event_type,reference_revision,explanation,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${input.deferralId}::uuid,${input.type},${input.referenceRevision??null},${input.explanation},${u}::uuid,${input.requestId}::uuid,${hash})`;
  await event(db,w,u,"decision_governance_attention",f.target_id,{action:"reopened",deferralId:f.id,eventId:rid,targetType:f.target_type});
 }
 return {record:{id:rid},replayed:false};
}
