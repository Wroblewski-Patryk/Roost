import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { lockReadyTask } from "./task-execution-readiness";
import { reviewDigest } from "./task-review-contract";
import { admitCapability, recordCapabilityUse } from "./task-capability-admission";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { suspensionBlocks } from "./capability-suspension";
import { riskLevelAdmission } from "./task-risk-admission";
import { clarificationSend, clarificationReply, clarificationRead, clarificationCommandText } from "./task-clarification-contract";
type Db=Prisma.TransactionClient;
const same=(a:any,b:any)=>Boolean(a&&b&&a.kind===b.kind&&a.id===b.id);
const participant=(p:any)=>({taskId:p.taskId,role:p.role});
const wire=(r:any)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=="request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));
async function context(db:Db,t:string,other=t){return (await db.$queryRaw<any[]>`SELECT task_clarification_link(${t}::uuid,${other}::uuid) AS source,task_clarification_version(${t}::uuid,${other}::uuid) AS version`)[0];}
async function roles(db:Db,t:string){const c=(await db.$queryRaw<any[]>`SELECT task_clarification_context(${t}::uuid) AS value`)[0].value;return c?Object.entries(c.roles).map(([role,principal])=>({taskId:t,role,principal})):[];}
async function threadVersion(db:Db,h:any){const seq=(await db.$queryRaw<any[]>`SELECT COALESCE(max(version),0)::int AS version FROM task_clarification_entries WHERE thread_id=${h.id}::uuid`)[0].version;return reviewDigest({id:h.id,version:seq,context:(await context(db,h.task_id,h.related_task_id)).version});}
async function allowed(db:Db,workspaceId:string,h:any,op:string,principal:any){
 if(!h.context?.task?.writable||!h.context?.relatedTask?.writable)return false;
 for(const t of new Set<string>([h.task_id,h.related_task_id]))if((await riskLevelAdmission(db,t,op)).error||await suspensionBlocks(db,workspaceId,t,h.context.task.applicationId,op,principal?.kind==="agent"?principal.id:null,principal?.credentialId))return false;
 return true;
}
async function initial(db:Db,workspaceId:string,t:string,actor:ReviewActor){
 const task=await lockReadyTask(db,workspaceId,t);if(!task)return {error:"task_not_found"};
 const principal=await resolveReviewPrincipal(db,workspaceId,actor);
 const admin=principal?.kind==="user"&&Boolean(await db.workspaceMembership.findFirst({where:{workspaceId,userId:principal.id,role:{in:["owner","admin"]}}}));
 return {task,principal,admin};
}
export async function clarificationView(db:Db,workspaceId:string,t:string,actor:ReviewActor,query:{relatedTaskId?:string;threadId?:string;before?:number}={}) {
 const s=await initial(db,workspaceId,t,actor);if("error" in s)return {error:s.error!};
 const related=await db.dependency.findMany({where:{workspaceId,status:"active",dependencyType:{in:["depends_on","blocks","requires","review_correction"]},fromEntityType:"task",toEntityType:"task",OR:[{fromEntityId:t},{toEntityId:t}]},orderBy:{id:"asc"},take:101});
 const relatedIds=[...new Set([t,...related.slice(0,100).map(d=>d.fromEntityId===t?d.toEntityId!:d.fromEntityId!)])];
 const choices:any[]=[];for(const id of relatedIds)if((await context(db,t,id)).source)choices.push(...await roles(db,id));
 const own=choices.filter(p=>same(p.principal,s.principal));
 if(!s.admin&&!own.length)return {error:"clarification_forbidden"};
 const source=await context(db,t,query.relatedTaskId??t);
 const rows=await db.$queryRaw<any[]>`SELECT h.* FROM task_clarification_threads h WHERE workspace_id=${workspaceId}::uuid AND (task_id=${t}::uuid OR related_task_id=${t}::uuid) ORDER BY created_at DESC,id DESC LIMIT 100`;
 const visible=rows.filter(h=>s.admin||same(h.sender.principal,s.principal)||same(h.recipient.principal,s.principal));
 const selected=query.threadId?visible.find(h=>h.id===query.threadId):visible[0];
 if(query.threadId&&!selected)return {error:"clarification_not_found"};
 let detail:any=null;
 if(selected){
  const entries=await db.$queryRaw<any[]>`SELECT * FROM task_clarification_entries WHERE thread_id=${selected.id}::uuid AND version<${query.before??501} ORDER BY version DESC LIMIT 51`;
  const now=await context(db,selected.task_id,selected.related_task_id),current=now.version===selected.context_version;
  const canReply=current&&[selected.sender,selected.recipient].some(p=>same(p.principal,s.principal))&&await allowed(db,workspaceId,selected,"clarification_reply",s.principal);
  detail={...wire(selected),current,expectedVersion:await threadVersion(db,selected),canReply,entries:entries.slice(0,50).map(wire),nextBefore:entries.length>50?entries[49].version:null};
 }
 const summaryTaskIds=selected?[selected.task_id,selected.related_task_id]:[t,query.relatedTaskId??t];
 const refs:any[]=[];for(const id of new Set<string>(summaryTaskIds))if(id===t||relatedIds.includes(id)&&(await context(db,t,id)).source)refs.push(...(await db.$queryRaw<any[]>`SELECT task_clarification_refs(${id}::uuid) AS refs`)[0].refs);
 const grants=s.principal?.kind==="agent"?await db.$queryRaw<any[]>`SELECT id,task_id,operation,snapshot->'clarification' AS binding,task_capability_status(g) AS status FROM task_capability_grants g WHERE workspace_id=${workspaceId}::uuid AND agent_id=${s.principal.id}::uuid AND credential_id=${s.principal.credentialId}::uuid AND operation IN ('clarification_send','clarification_reply') AND task_id=ANY(${relatedIds}::uuid[]) ORDER BY created_at DESC LIMIT 100`:[];
 const result={task:{id:t,title:s.task.title},source:source.source,contextVersion:source.version,expectedVersion:reviewDigest({context:source.version,latest:rows[0]?.id??null}),
  senderChoices:own,recipientChoices:choices.filter(p=>!same(p.principal,s.principal)),relatedTaskIds:relatedIds,catalogTruncated:related.length>100,
  threads:visible.map(h=>({id:h.id,taskId:h.task_id,relatedTaskId:h.related_task_id,sender:h.sender,recipient:h.recipient,createdAt:h.created_at})),selected:detail,
  canManageGrants:s.admin,grants,summary:{trust:"authoritative_receipts",references:refs,executionAvailable:refs.some(r=>r.kind==="execution"),limits:{handoffs:20,reviews:20,evidence:20}},
  canSend:Boolean(source.source&&own.length&&await allowed(db,workspaceId,{task_id:t,related_task_id:query.relatedTaskId??t,context:source.source},"clarification_send",s.principal))};
 requireRuntimeContent(result,"clarification.read",{workspaceId,taskId:t});return result;
}
export async function clarificationCommand(db:Db,workspaceId:string,t:string,actor:ReviewActor,action:"send"|"reply"|"read",body:unknown){
 const input:any=(action==="send"?clarificationSend:action==="reply"?clarificationReply:clarificationRead).parse(body);
 requireRuntimeContent(input,"clarification.command",{workspaceId,taskId:t});
 if(input.content&&clarificationCommandText(input.content))return {error:"clarification_command_forbidden"};
 const s=await initial(db,workspaceId,t,actor);if("error" in s)return {error:s.error!};const principal=s.principal;if(!principal)return {error:"clarification_forbidden"};
 const requestHash=reviewDigest({input,t,principal,action});
 const prior=(await db.$queryRaw<any[]>`SELECT * FROM task_clarification_entries WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
 if(prior&&prior.request_hash!==requestHash)return {error:"clarification_key_conflict"};
 let h:any,author:any,receiver:any,target:any=null;
 if(action==="send"){
  if(![input.sender.taskId,input.recipient.taskId].includes(t))return {error:"clarification_scope_invalid"};
  const other=input.sender.taskId===t?input.recipient.taskId:input.sender.taskId,c=await context(db,t,other);
  if(!c.source)return {error:"clarification_scope_invalid"};
  author=(await roles(db,input.sender.taskId)).find(p=>p.role===input.sender.role);receiver=(await roles(db,input.recipient.taskId)).find(p=>p.role===input.recipient.role);
  if(!same(author?.principal,principal)||!receiver||same(receiver.principal,principal))return {error:"clarification_forbidden"};
  h={id:prior?.thread_id??randomUUID(),task_id:t,related_task_id:other,context:c.source,context_version:c.version,sender:author,recipient:receiver};
  if(input.contextVersion!==c.version)return {error:"clarification_stale"};
  if(!prior){const v=await clarificationView(db,workspaceId,t,actor,{relatedTaskId:other});if("error" in v)return {error:v.error!};if(input.expectedVersion!==v.expectedVersion)return {error:"clarification_stale"};}
 }else{
  h=(await db.$queryRaw<any[]>`SELECT * FROM task_clarification_threads WHERE id=${input.threadId}::uuid AND task_id=${t}::uuid AND workspace_id=${workspaceId}::uuid FOR UPDATE`)[0];
  if(!h)return {error:"clarification_not_found"};
  author=[h.sender,h.recipient].find(p=>same(p.principal,principal));receiver=author===h.sender?h.recipient:h.sender;
  if(!author)return {error:"clarification_forbidden"};
  target=(await db.$queryRaw<any[]>`SELECT * FROM task_clarification_entries WHERE id=${input.entryId}::uuid AND thread_id=${h.id}::uuid AND kind='message'`)[0];
  const correcting=action==="reply"&&input.supersedes===target?.id&&same(target?.author?.principal,principal);
  if(!target||target.version!==input.entryVersion||!correcting&&!same(target.recipient.principal,principal))return {error:"clarification_scope_invalid"};
  if(h.context_version!==(await context(db,h.task_id,h.related_task_id)).version||input.contextVersion!==h.context_version)return {error:"clarification_stale"};
  if(!prior&&input.expectedVersion!==await threadVersion(db,h))return {error:"clarification_stale"};
 }
 const operation=action==="send"?"clarification_send":"clarification_reply";
 if(!await allowed(db,workspaceId,h,operation,principal))return {error:"risk_admission_required"};
 const binding={sender:participant(author),recipient:participant(receiver),threadId:action==="send"?null:h.id,entryId:target?.id??null,action};
 const capability=await admitCapability(db,workspaceId,t,principal,operation,input.grantId,prior?wire(prior):undefined);if("error" in capability)return {error:capability.error!};
 if(capability.grant&&reviewDigest((capability.grant.snapshot as any).clarification)!==reviewDigest(binding))return {error:"capability_grant_scope_mismatch"};
 if(prior){const result={entry:wire(prior),replayed:true};requireRuntimeContent(result,"clarification.replay",{workspaceId,taskId:t});return result;}
 if(action==="read"&&(await db.$queryRaw<any[]>`SELECT id FROM task_clarification_entries WHERE thread_id=${h.id}::uuid AND reply_to=${target.id}::uuid AND kind='read' AND author=${JSON.stringify(author)}::jsonb LIMIT 1`).length)return {error:"clarification_already_read"};
 if(input.supersedes&&(await db.$queryRaw<any[]>`SELECT id FROM task_clarification_entries WHERE supersedes=${input.supersedes}::uuid LIMIT 1`).length)return {error:"clarification_already_corrected"};
 const resolved=(await db.$queryRaw<any[]>`SELECT task_clarification_resolve_refs(${h.task_id}::uuid,${h.related_task_id}::uuid,${JSON.stringify(input.content?.references??[])}::jsonb) AS refs`)[0].refs;
 if(!resolved)return {error:"clarification_reference_invalid"};
 requireRuntimeContent({context:h.context,references:resolved},"clarification.source",{workspaceId,taskId:t});
 if(action==="send")await db.$executeRaw`INSERT INTO task_clarification_threads(id,workspace_id,task_id,related_task_id,sender,recipient,context_version,context) VALUES(${h.id}::uuid,${workspaceId}::uuid,${t}::uuid,${h.related_task_id}::uuid,${JSON.stringify(author)}::jsonb,${JSON.stringify(receiver)}::jsonb,${h.context_version},${JSON.stringify(h.context)}::jsonb)`;
 const id=randomUUID();
 await db.$executeRaw`INSERT INTO task_clarification_entries(id,workspace_id,task_id,thread_id,version,kind,reply_to,supersedes,author,recipient,context_version,content,verified_refs,actor_user_id,actor_agent_id,actor_credential_id,actor_credential_prefix,capability_grant_id,request_id,request_hash)
 VALUES(${id}::uuid,${workspaceId}::uuid,${t}::uuid,${h.id}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_clarification_entries WHERE thread_id=${h.id}::uuid),${action==="read"?"read":"message"},${target?.id??null}::uuid,${input.supersedes??null}::uuid,${JSON.stringify(author)}::jsonb,${JSON.stringify(receiver)}::jsonb,${h.context_version},${JSON.stringify(input.content??{})}::jsonb,${JSON.stringify(resolved)}::jsonb,${principal.kind==="user"?principal.id:null}::uuid,${principal.kind==="agent"?principal.id:null}::uuid,${principal.credentialId}::uuid,${principal.credentialPrefix},${capability.grant?.id??null}::uuid,${input.requestId}::uuid,${requestHash})`;
 await recordCapabilityUse(db,capability.grant,input.requestId,"clarification",id);
 await db.event.create({data:{workspaceId,taskId:t,type:input.content?.material?"task_clarification_attention":"task_clarification_recorded",source:"roost",actorType:principal.kind,actorId:principal.id,resourceType:"task_clarification",resourceId:id,payload:{entryId:id,threadId:h.id,operation,contextVersion:h.context_version,requiresFormalReview:Boolean(input.content?.material)}}});
 return {entry:wire((await db.$queryRaw<any[]>`SELECT * FROM task_clarification_entries WHERE id=${id}::uuid`)[0]),replayed:false};
}
export async function clarificationGrantChoices(db:Db,workspaceId:string,t:string){
 // An operation with no passed procedure evidence cannot be admitted. Keep
 // existing review/grant catalogs cheap when clarification is not configured.
 if(!await db.taskAdmissionEvidence.findFirst({where:{workspaceId,taskId:t,operation:{in:["clarification_send","clarification_reply"]},gate:"procedure",verdict:"passed"},select:{id:true}}))return [];
 const related=await db.dependency.findMany({where:{workspaceId,status:"active",dependencyType:{in:["depends_on","blocks","requires","review_correction"]},fromEntityType:"task",toEntityType:"task",OR:[{fromEntityId:t},{toEntityId:t}]},take:100});
 const ids=[...new Set([t,...related.map(d=>d.fromEntityId===t?d.toEntityId!:d.fromEntityId!)])],options:any[]=[];
 const participants:any[]=[];for(const id of ids)if((await context(db,t,id)).source)participants.push(...await roles(db,id));
 const threads=await db.$queryRaw<any[]>`SELECT * FROM task_clarification_threads WHERE task_id=${t}::uuid AND workspace_id=${workspaceId}::uuid ORDER BY created_at DESC LIMIT 100`;
 for(const author of participants.filter(p=>p.principal.kind==="agent")){
  const key=await db.apiKey.findFirst({where:{workspaceId,boundAgentId:author.principal.id,active:true,revokedAt:null,expiresAt:{gt:new Date()}}});if(!key)continue;
  const bindings:any[]=participants.filter(p=>!same(p.principal,author.principal)&&[author.taskId,p.taskId].includes(t)).map(p=>({sender:participant(author),recipient:participant(p),threadId:null,entryId:null,action:"send"}));
  for(const h of threads){const receiver=[h.sender,h.recipient].find(p=>!same(p.principal,author.principal));if(!receiver||![h.sender,h.recipient].some(p=>reviewDigest(p)===reviewDigest(author)))continue;
   const entries=await db.$queryRaw<any[]>`SELECT * FROM task_clarification_entries WHERE thread_id=${h.id}::uuid AND kind='message' ORDER BY version DESC LIMIT 50`;
   for(const e of entries)for(const action of ["reply","read"])if(same(e.recipient.principal,author.principal)||action==="reply"&&same(e.author.principal,author.principal))bindings.push({sender:participant(author),recipient:participant(receiver),threadId:h.id,entryId:e.id,action});
  }
  for(const binding of bindings){
   const other=binding.sender.taskId===t?binding.recipient.taskId:binding.sender.taskId,c=await context(db,t,other),operation=binding.action==="send"?"clarification_send":"clarification_reply";
   if(!c.source||!await allowed(db,workspaceId,{task_id:t,related_task_id:other,context:c.source},operation,{kind:"agent",id:key.boundAgentId,credentialId:key.id}))continue;
   if(options.length>=500)return options;
   options.push({operation,agentId:key.boundAgentId,agentLabel:author.role,credentialId:key.id,credentialPrefix:key.keyPrefix,credentialVersion:key.credentialVersion,credentialExpiresAt:key.expiresAt,role:author,clarification:binding,applicationId:c.source.task.applicationId,contextVersion:c.version});
  }
 }
 return options.slice(0,500);
}
