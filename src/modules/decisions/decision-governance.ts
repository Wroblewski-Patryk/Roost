import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { reviewDigest } from "../agent-runtime/task-review-contract";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { interviewCommand,interviewView } from "../agent-runtime/task-interview";
import { decisionAction,decisionDeferral,decisionProposal,decisionWithdrawal,reopeningEvent } from "./decision-governance-contract";
import { authorityState,decisionAuthority,mandateView } from "./decision-authority";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { admitCapability,recordCapabilityUse,grantState } from "../agent-runtime/task-capability-admission";
import { admissionCommand,admissionVersion } from "../agent-runtime/task-risk-admission";
import { validateApplicationTakeoverBaseline } from "../product-engineering/application-takeover-validation";
import { directionDecisionAcceptanceError } from "../strategy/company-direction";
type Db=Prisma.TransactionClient;
export function decisionTaskStateProjection(row:{id:string;title:string;executionReadiness:unknown}){
 const readiness=row.executionReadiness;
 const status=readiness&&typeof readiness==="object"&&!Array.isArray(readiness)&&"status" in readiness&&typeof readiness.status==="string"?readiness.status:null;
 return {id:row.id,title:row.title,executionReadiness:{status}};
}
const wire=(r:any)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=="request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));
async function state(db:Db,w:string,actor:ReviewActor|null,id?:string,readOnly=false){
 if(id&&!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))return {error:"decision_not_found"};
 if(!readOnly)await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
 const u=typeof actor==="string"?actor:actor?.userId??null;
 const principal=await resolveReviewPrincipal(db,w,actor??undefined,readOnly);
 const role=u?(await db.workspaceMembership.findFirst({where:{workspaceId:w,userId:u}}))?.role:null;
 const ownerUserId=(await db.workspace.findUnique({where:{id:w},select:{ownerUserId:true}}))?.ownerUserId;
 const revisions=await db.$queryRaw<any[]>`SELECT r.*,decision_state(r.decision_id) AS state FROM decision_revisions r WHERE workspace_id=${w}::uuid ORDER BY created_at DESC LIMIT 201`;
 const selected=id?(await db.$queryRaw<any[]>`SELECT r.*,decision_state(r.decision_id) AS state FROM decision_revisions r WHERE workspace_id=${w}::uuid AND decision_id=${id}::uuid`)[0]:undefined;
 if(id&&!selected)return {error:"decision_not_found"};
 const withdrawal=selected?(await db.$queryRaw<any[]>`SELECT id,decision_id,predecessor_id,owner_user_id,reason,request_id,withdrawn_at FROM decision_withdrawals WHERE workspace_id=${w}::uuid AND decision_id=${id}::uuid`)[0]??null:null;
 const previews=selected?await db.$queryRaw<any[]>`SELECT * FROM decision_impact_previews WHERE decision_id=${id}::uuid ORDER BY version DESC LIMIT 51`:[];
 const acceptance=selected?(await db.$queryRaw<any[]>`SELECT * FROM decision_acceptances WHERE decision_id=${id}::uuid`)[0]:null;
 const deferrals=await db.$queryRaw<any[]>`SELECT f.*,e.id AS event_id,e.event_type,e.created_at AS reopened_at FROM decision_deferrals f LEFT JOIN decision_reopening_events e ON e.deferral_id=f.id WHERE f.workspace_id=${w}::uuid ORDER BY f.created_at DESC LIMIT 201`;
 const references=await Promise.all(deferrals.map(async f=>{
  const k=f.condition.type==='resource_available'?'resource':f.condition.type==='configuration_changed'?'company_record':null;
  const record=k?(await db.$queryRaw<any[]>`SELECT decision_node(${w}::uuid,${k},${f.condition.referenceId}::uuid) AS value`)[0].value:null;
  return {id:f.id,revision:record?reviewDigest(record):null,sqlRevision:record?(await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(decision_node(${w}::uuid,${k!},${f.condition.referenceId}::uuid)::text,'UTF8')),'hex') AS value`)[0].value:null};
 }));
 const impact=selected?(await db.$queryRaw<any[]>`SELECT decision_current_impact(${w}::uuid,${JSON.stringify(selected.body.scope)}::jsonb) AS value`)[0].value:null;
 const authority=selected?await decisionAuthority(db,w,selected.body,impact,readOnly?await authorityState(db,w,true):undefined):null;
 const expectedVersion=reviewDigest({u,role,principal,ownerUserId,authority,revisions:revisions.map(r=>[r.decision_id,r.state]),previews:previews.map(p=>p.id),acceptance:acceptance?.id,withdrawal:withdrawal?.id,deferrals:deferrals.map(f=>[f.id,f.event_id]),references,impact});
 return {u,principal,role,ownerUserId,authority,revisions,selected,previews,acceptance,withdrawal,deferrals,references,impact,expectedVersion};
}
export async function decisionGovernanceView(db:Db,w:string,actor:ReviewActor|null,id?:string,options:{versionOnly?:boolean}={}){
 const s=await state(db,w,actor,id,true);if("error" in s)return s;const u=s.u;
 if(typeof actor!=="string"&&actor?.authType==="api_key"&&s.principal?.kind!=="agent")return {error:"decision_forbidden"};
 if(s.principal?.kind==="agent"){
  // Issuing an exact decision_supersede grant is the owner's admission of
  // this immutable pending proposal for this credential and impacted task.
  // Every impacted task needs its own current grant before any proposal text
  // is returned. Never reuse the owner catalog/history/impact projection.
  const taskIds:string[]=s.impact?.taskIds??[];
  const preview=s.previews[0];
  if(!id||!s.selected||!preview||!taskIds.length||taskIds.length>200||new Set(taskIds).size!==taskIds.length)
   return {error:"decision_forbidden"};
  const grants=await db.$queryRaw<Array<{id:string;task_id:string}>>`SELECT id,task_id FROM task_capability_grants g
    WHERE workspace_id=${w}::uuid AND agent_id=${s.principal.id}::uuid AND credential_id=${s.principal.credentialId}::uuid
      AND operation='decision_supersede' AND snapshot->'decision'=jsonb_build_object('decisionId',${id}::uuid,'previewId',${preview.id}::uuid)
      AND task_capability_status(g)='active'`;
  const byTask=new Map(grants.map(g=>[g.task_id,g.id]));
  if(taskIds.some(taskId=>!byTask.has(taskId)))return {error:"decision_forbidden"};
  const body=s.selected.body;
  const data={expectedVersion:s.expectedVersion,canAccept:s.selected.state==="pending"&&!!s.authority&&"principal" in s.authority
    &&s.authority.principal?.kind==="agent"&&s.authority.principal.id===s.principal.id,
   selected:{decisionId:id,state:s.selected.state,body:{title:body.title,context:body.context,
    decision:body.decision,rationale:body.rationale,consequences:body.consequences,scopeReason:body.scopeReason}},
   previews:[{id:preview.id,version:preview.version}],grantIds:taskIds.map(taskId=>({taskId,grantId:byTask.get(taskId)})),
   current:!!s.impact&&reviewDigest(s.impact)===reviewDigest(preview.impact)
    &&(!preview.authority||reviewDigest(s.authority)===reviewDigest(preview.authority))};
  requireRuntimeContent(data,"decision.agent-read",{workspaceId:w});return data;
 }
 if(options.versionOnly){
  const data={expectedVersion:s.expectedVersion,canWrite:s.role==="owner"&&u===s.ownerUserId,
   canAccept:s.selected?.state==="pending"&&!!s.principal&&"principal" in (s.authority??{})&&(s.authority as any).principal?.kind===s.principal.kind&&(s.authority as any).principal?.id===s.principal.id,
   selected:s.selected?{decisionId:s.selected.decision_id,state:s.selected.state}:null,
   previews:s.previews.slice(0,1).map(p=>({id:p.id,version:p.version})),acceptance:s.acceptance?{id:s.acceptance.id}:null,impact:s.impact,
   current:!!s.impact&&!!s.previews[0]&&reviewDigest(s.impact)===reviewDigest(s.previews[0].impact)&&(!s.previews[0].authority||reviewDigest(s.authority)===reviewDigest(s.previews[0].authority))};
  requireRuntimeContent(data,"decision.read",{workspaceId:w});return data;
 }
 const authorityCatalog=await mandateView(db,w,actor??undefined,true);
 const catalog=id?[]:await db.task.findMany({where:{workspaceId:w},select:{id:true,title:true},orderBy:{id:"asc"},take:101});
 const resourceCatalog=id?[]:await db.resource.findMany({where:{workspaceId:w},select:{id:true,name:true},orderBy:{id:"asc"},take:101});
 const configurationCatalog=id?[]:await db.companyRecord.findMany({where:{workspaceId:w,recordType:"configuration",status:{not:"archived"}},select:{id:true,title:true},orderBy:{id:"asc"},take:101});
 const ancestors:any[]=[];let cursor=s.selected?.supersedes_id;
 for(let i=0;cursor&&i<50;i++){
  const d=await db.decision.findFirst({where:{id:cursor,workspaceId:w},select:{id:true,title:true,decision:true,supersedesId:true,status:true}});if(!d)break;ancestors.push(d);cursor=d.supersedesId;
 }
 const supersededBy=id?await db.$queryRaw<Array<{id:string;title:string;status:string;governanceState:string}>>`SELECT d.id,d.title,d.status,decision_state(d.id) AS "governanceState" FROM decisions d WHERE d.workspace_id=${w}::uuid AND d.supersedes_id=${id}::uuid ORDER BY d.created_at,d.id LIMIT 51`:[];
 const taskIds:string[]=s.impact?.taskIds??[];
 const taskStates=taskIds.length?(await db.task.findMany({where:{workspaceId:w,id:{in:taskIds}},select:{id:true,title:true,executionReadiness:true}})).map(decisionTaskStateProjection):[];
 const gates=await Promise.all(taskIds.map(async t=>({taskId:t,...(await db.$queryRaw<any[]>`SELECT task_admission_view(${t}::uuid,'decision_supersede') AS value`)[0].value})));
 const canWrite=s.role==="owner"&&u===s.ownerUserId;
 const canWithdraw=canWrite&&s.selected?.state==="pending"&&!s.acceptance&&!!s.selected?.supersedes_id&&s.selected?.body?.managedRuntimeApproval?.executionClass==="roost-company-information-runtime-v1"&&s.selected?.body?.managedRuntimeApproval?.applicationId===null;
  const data={expectedVersion:s.expectedVersion,authorityCatalog:authorityCatalog?{workforce:authorityCatalog.workforce,departments:authorityCatalog.departments,entityCatalog:authorityCatalog.entityCatalog}:null,canWrite,canWithdraw,authority:s.authority,canAccept:s.selected?.state==="pending"&&!!s.principal&&"principal" in (s.authority??{})&&(s.authority as any).principal?.kind===s.principal.kind&&(s.authority as any).principal?.id===s.principal.id,selected:s.selected?wire(s.selected):null,
  revisions:s.revisions.slice(0,200).map(r=>({id:r.decision_id,title:r.body.title,state:r.state,version:r.version,supersedesId:r.supersedes_id})),
  previews:s.previews.slice(0,50).map(wire),acceptance:s.acceptance?wire(s.acceptance):null,withdrawal:s.withdrawal?wire(s.withdrawal):null,impact:s.impact,ancestors,supersededBy,gates,
  current:!!s.impact&&!!s.previews[0]&&reviewDigest(s.impact)===reviewDigest(s.previews[0].impact)&&(!s.previews[0].authority||reviewDigest(s.authority)===reviewDigest(s.previews[0].authority)),taskStates,
  deferrals:s.deferrals.slice(0,200).map(f=>({...wire(f),referenceRevision:s.references.find(r=>r.id===f.id)?.sqlRevision})),
  catalog:catalog.slice(0,100).map(t=>({type:"task",...t})),resourceCatalog:resourceCatalog.slice(0,100),configurationCatalog:configurationCatalog.slice(0,100),truncated:s.revisions.length>200||s.previews.length>50||s.deferrals.length>200||catalog.length>100||resourceCatalog.length>100||configurationCatalog.length>100||!!cursor};
 requireRuntimeContent(data,"decision.read",{workspaceId:w});return data;
}
async function event(db:Db,w:string,u:string,type:string,id:string,payload:any,actorType:"user"|"agent"="user"){
 await db.event.create({data:{workspaceId:w,type,source:"roost",actorType,actorId:u,resourceType:"decision",resourceId:id,payload}});
}
type ProcedureAdmission={taskId:string;evidenceId:string};
async function acceptanceProcedureEvidence(db:Db,w:string,u:string,input:any,impact:any,preview:any):Promise<{error:string}|{records:ProcedureAdmission[]}>{
 // Check the same current preview used by the native acceptance guard before
 // recording evidence. No caller-provided task list can narrow its impact.
 if(preview?.id!==input.previewId||reviewDigest(impact)!==reviewDigest(preview.impact))return {error:"decision_stale"};
 const tasks:unknown=impact?.taskIds;
 if(!Array.isArray(tasks)||!tasks.length||new Set(tasks).size!==tasks.length||tasks.some(t=>typeof t!=="string"||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(t)))return {error:"decision_scope_invalid"};
 if(tasks.length>200)return {error:"decision_impact_too_large"};
 // Normal admission commands may return a rejected precondition rather than
 // throw. Roll back all earlier gates in that case; SQL exceptions still roll
 // back the enclosing normal Serializable route transaction.
 await db.$executeRaw`SAVEPOINT decision_acceptance_evidence`;
 const records:ProcedureAdmission[]=[];
 for(const taskId of tasks){
  // Construct the internal CAS after the normal command's single fence and
  // authority invalidation. Its common version check and SQL guards remain.
  const admitted=await admissionCommand(db,w,taskId,u,"evidence",undefined,{compact:true,bodyAfterLock:async()=>({
   ...input.procedureEvidence,requestId:randomUUID(),expectedVersion:await admissionVersion(db,taskId),operation:"decision_supersede",gate:"procedure"
  })});
  if(("error" in admitted&&typeof admitted.error==="string")||!("evidenceId" in admitted)||typeof admitted.evidenceId!=="string"){
   await db.$executeRaw`ROLLBACK TO SAVEPOINT decision_acceptance_evidence`;
   await db.$executeRaw`RELEASE SAVEPOINT decision_acceptance_evidence`;
   return {error:"error" in admitted&&typeof admitted.error==="string"?admitted.error:"risk_admission_receipt_required"};
  }
  records.push({taskId,evidenceId:admitted.evidenceId});
 }
 return {records};
}
export async function decisionGovernanceCommand(db:Db,w:string,actor:ReviewActor|null,kind:"proposal"|"action"|"defer"|"reopen",body:unknown,id?:string){
 const input:any=(kind==="proposal"?decisionProposal:kind==="action"?decisionAction:kind==="defer"?decisionDeferral:reopeningEvent).parse(body);
 requireRuntimeContent(input,"decision.command",{workspaceId:w});
 const s=await state(db,w,actor,kind==="action"?id:undefined);if("error" in s)return s;const u=s.u,principal=s.principal;
 const acceptance=kind==="action"&&input.action==="accept";
 if(!principal)return {error:"decision_forbidden"};
 if(input.procedureEvidence&&(!acceptance||principal.kind!=="user"))return {error:"decision_forbidden"};
 if(acceptance){if(!(s.authority&&"principal" in s.authority&&s.authority.principal?.kind===principal.kind&&s.authority.principal.id===principal.id))return {error:"decision_forbidden"};}
 else if(!u||s.role!=="owner"||u!==s.ownerUserId)return {error:"decision_forbidden"};
 const hash=reviewDigest({input,kind,id:id??null,u,...(principal.kind==="agent"?{principal}:{})});
 const table=kind==="proposal"?Prisma.sql`decision_revisions`:kind==="defer"?Prisma.sql`decision_deferrals`:kind==="reopen"?Prisma.sql`decision_reopening_events`:input.action==="accept"?Prisma.sql`decision_acceptances`:Prisma.sql`decision_impact_previews`;
 const prior=(await db.$queryRaw<any[]>`SELECT * FROM ${table} WHERE workspace_id=${w}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior){if(prior.request_hash!==hash)return {error:"decision_request_conflict"};
  if(acceptance&&principal.kind==="agent")for(const item of prior.capability_grants??[]){
   const grant=await db.taskCapabilityGrant.findFirst({where:{id:item.grantId,workspaceId:w,taskId:item.taskId,agentId:principal.id,credentialId:principal.credentialId},include:{usage:true}});
   if(!grant||(await grantState(db,grant.id)).base!=="active"||grant.usage?.governedDecisionAcceptanceId!==prior.id)return {error:"decision_grant_replay_stale"};
  }
  const result={record:principal.kind==="agent"?{id:prior.id}:{...wire(prior),...(kind==="proposal"?{id:prior.decision_id}:{})},replayed:true};requireRuntimeContent(result,"decision.replay",{workspaceId:w});return result;}
 if(input.expectedVersion!==s.expectedVersion)return {error:"decision_stale"};
 if(kind==="proposal"&&input.supersedesId&&(await db.$queryRaw<any[]>`SELECT 1 FROM decision_revisions r WHERE r.workspace_id=${w}::uuid AND r.supersedes_id=${input.supersedesId}::uuid AND NOT EXISTS(SELECT 1 FROM decision_withdrawals x WHERE x.decision_id=r.decision_id)`).length)return {error:"decision_successor_exists"};
 const rid=kind==='proposal'&&input.decisionId?input.decisionId:randomUUID();
 if(kind==="proposal"){
  const {requestId,decisionId,expectedVersion,...b}=input;
  if(b.applicationBaseline){const validation=await validateApplicationTakeoverBaseline(db,w,b.applicationBaseline);if(validation.error)return validation;}
  const predecessor=b.supersedesId?(await db.$queryRaw<any[]>`SELECT to_jsonb(d) AS value FROM decisions d WHERE id=${b.supersedesId}::uuid AND workspace_id=${w}::uuid`)[0]?.value:null;
  requireRuntimeContent(predecessor,"decision.predecessor",{workspaceId:w});
  const created=await db.decision.create({data:{id:rid,workspaceId:w,title:b.title,context:b.context,decision:b.decision,rationale:b.rationale,consequences:b.consequences,status:"proposed",source:"roost_decision",authorType:"user",authorId:u,supersedesId:b.supersedesId}});
  await db.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,supersedes_id,version,body,predecessor,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${b.supersedesId}::uuid,COALESCE((SELECT version FROM decision_revisions WHERE decision_id=${b.supersedesId}::uuid),0)+1,${JSON.stringify(b)}::jsonb,${predecessor?JSON.stringify(predecessor):null}::jsonb,${u}::uuid,${requestId}::uuid,${hash})`;
  const impact=(await db.$queryRaw<any[]>`SELECT decision_impact(${w}::uuid,${JSON.stringify(b.scope)}::jsonb) AS value`)[0].value;
  const authority=await decisionAuthority(db,w,b,impact);
  requireRuntimeContent(impact,"decision.impact",{workspaceId:w});
  await db.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,authority,actor_user_id,request_id,request_hash) VALUES(${randomUUID()}::uuid,${rid}::uuid,${w}::uuid,1,${JSON.stringify(impact)}::jsonb,${JSON.stringify(authority)}::jsonb,${u}::uuid,${randomUUID()}::uuid,${hash})`;
  await event(db,w,u!,"decision_governance_attention",rid,{decisionId:rid,state:"pending"});
  return {record:created,replayed:false};
 }
 if(kind==="action"){
  if(!s.selected)return {error:"decision_not_found"};
  if(s.selected.state!=="pending")return {error:"decision_transition_invalid"};
  const procedureAdmissions:ProcedureAdmission[]=[];
  requireRuntimeContent({proposal:s.selected,impact:s.impact},"decision.acceptance",{workspaceId:w});
  if(input.action==="review_impact"){
   await db.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,authority,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${id}::uuid,${w}::uuid,${(s.previews[0]?.version??0)+1},${JSON.stringify(s.impact)}::jsonb,${JSON.stringify(s.authority)}::jsonb,${u}::uuid,${input.requestId}::uuid,${hash})`;
  }else{
   if(!input.previewId)return {error:"decision_preview_required"};
   if(input.previewId!==s.previews[0]?.id)return {error:"decision_stale"};
   const directionError=await directionDecisionAcceptanceError(db,w,id!,input.previewId);
   if(directionError)return {error:directionError};
   if(s.selected.body.applicationBaseline){const validation=await validateApplicationTakeoverBaseline(db,w,s.selected.body.applicationBaseline);if(validation.error)return validation;}
   if(s.previews[0]?.authority&&reviewDigest(s.previews[0].authority)!==reviewDigest(s.authority))return {error:"decision_authority_stale"};
   const grants:any[]=[];
   if(principal.kind==="agent"){
    if(!input.grantIds||input.grantIds.length!==s.impact.taskIds.length)return {error:"decision_authority_grant_required"};
    for(const taskId of s.impact.taskIds){const binding=input.grantIds.find((g:any)=>g.taskId===taskId);const admitted=await admitCapability(db,w,taskId,principal,"decision_supersede",binding?.grantId);if("error" in admitted)return admitted;grants.push(admitted.grant);}
   }else if(input.grantIds)return {error:"decision_authority_grant_invalid"};
   if(input.procedureEvidence){
    const evidence=await acceptanceProcedureEvidence(db,w,u!,input,s.impact,s.previews[0]);
    if("error" in evidence)return evidence;
    procedureAdmissions.push(...evidence.records);
   }
   await db.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,authority,actor_user_id,actor_agent_id,actor_credential_id,capability_grants,request_id,request_hash) VALUES(${rid}::uuid,${id}::uuid,${w}::uuid,${input.previewId}::uuid,${JSON.stringify(s.authority)}::jsonb,${u}::uuid,${principal.kind==="agent"?principal.id:null}::uuid,${principal.credentialId}::uuid,${JSON.stringify(input.grantIds??[])}::jsonb,${input.requestId}::uuid,${hash})`;
   if(input.procedureEvidence)await db.$executeRaw`RELEASE SAVEPOINT decision_acceptance_evidence`;
   for(const grant of grants)await recordCapabilityUse(db,grant,randomUUID(),"governedDecision",rid);
  }
  await event(db,w,principal.id,"decision_governance_recorded",id!,{decisionId:id,action:input.action,recordId:rid,...(input.procedureEvidence?{procedureAdmissions}:{})},principal.kind);
 }else if(kind==="defer"){
  let scope:any,entryId:string|null=null;
  if(input.targetType==="decision")scope=s.revisions.find(r=>r.decision_id===input.targetId)?.body.scope;
  else {
   const c=(await db.$queryRaw<any[]>`SELECT * FROM task_interview_cases WHERE id=${input.targetId}::uuid AND workspace_id=${w}::uuid`)[0];if(!c)return {error:"decision_not_found"};
   const v=await interviewView(db,w,c.task_id,u!);if("error" in v)return v;
   const result=await interviewCommand(db,w,c.task_id,u!,"respond",{requestId:randomUUID(),expectedVersion:v.expectedVersion,caseId:c.id,action:"defer",reason:input.explanation});if("error" in result)return result;
   entryId=result.record.id as string;scope=[{type:"task",id:c.task_id}];
  }
  if(!scope)return {error:"decision_not_found"};
  const referenceType=input.condition.type==="resource_available"?"resource":input.condition.type==="configuration_changed"?"company_record":null;
  const baseline=referenceType?(await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(decision_node(${w}::uuid,${referenceType},${input.condition.referenceId}::uuid)::text,'UTF8')),'hex') AS value`)[0].value:null;
  await db.$executeRaw`INSERT INTO decision_deferrals(id,workspace_id,target_type,target_id,version,reason,explanation,condition,baseline,scope,interview_entry_id,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${input.targetType},${input.targetId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM decision_deferrals WHERE target_type=${input.targetType} AND target_id=${input.targetId}::uuid),${input.reason},${input.explanation},${JSON.stringify(input.condition)}::jsonb,${baseline},${JSON.stringify(scope)}::jsonb,${entryId}::uuid,${u}::uuid,${input.requestId}::uuid,${hash})`;
  await event(db,w,u!,"decision_governance_recorded",input.targetId,{action:"defer",deferralId:rid,targetType:input.targetType});
 }else{
  const f=s.deferrals.find(f=>f.id===input.deferralId);if(!f)return {error:"decision_not_found"};
  if(f.condition.type!==input.type)return {error:"decision_event_invalid"};
  if(f.event_id)return {record:{id:f.event_id},replayed:true};
  await db.$executeRaw`INSERT INTO decision_reopening_events(id,workspace_id,deferral_id,event_type,reference_revision,explanation,actor_user_id,request_id,request_hash) VALUES(${rid}::uuid,${w}::uuid,${input.deferralId}::uuid,${input.type},${input.referenceRevision??null},${input.explanation},${u}::uuid,${input.requestId}::uuid,${hash})`;
  await event(db,w,u!,"decision_governance_attention",f.target_id,{action:"reopened",deferralId:f.id,eventId:rid,targetType:f.target_type});
 }
 return {record:{id:rid},replayed:false};
}

export async function decisionGovernanceWithdrawal(db:Db,w:string,actor:ReviewActor|null,id:string,body:unknown){
 const input=decisionWithdrawal.parse(body);
 requireRuntimeContent(input,"decision.command",{workspaceId:w});
 const s=await state(db,w,actor,id);if("error" in s)return s;
 const u=s.u;
 // This is a reserved owner correction. API keys, including keys linked to the
 // owner's user account, cannot act as that human owner.
 if(typeof actor!=="string"&&actor?.authType==="api_key"||!u||s.role!=="owner"||u!==s.ownerUserId||s.principal?.kind!=="user")return {error:"decision_withdrawal_forbidden"};
 if(!s.selected)return {error:"decision_not_found"};
 const previous=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM decision_withdrawals WHERE workspace_id=${w}::uuid AND request_id=${input.requestId}::uuid`;
 if(!previous.length&&input.expectedVersion!==s.expectedVersion)return {error:"decision_withdrawal_stale"};
 const records=await db.$queryRaw<Array<{id:string;decision_id:string;request_id:string;withdrawn_at:Date}>>`
   SELECT * FROM decision_withdraw_pending_v1(${w}::uuid,${id}::uuid,${s.selected.request_hash},${u}::uuid,${input.requestId}::uuid,${input.reason})`;
 const record=records[0];
 if(!record)return {error:"decision_withdrawal_stale"};
 if(!previous.length)await event(db,w,u,"decision_governance_withdrawn",id,{decisionId:id,withdrawalId:record.id,predecessorId:s.selected.supersedes_id});
 const result={record:wire(record),replayed:previous.length>0};
 requireRuntimeContent(result,"decision.replay",{workspaceId:w});
 return result;
}
