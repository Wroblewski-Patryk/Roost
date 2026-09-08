import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { ReviewActor } from "../../auth/agent-principal";
import { reviewState } from "./task-review";
import { object, reviewDigest } from "./task-review-contract";
import { createHandoffSchema, decideHandoffSchema, handoffRoles, handoffOperations } from "./task-handoff-contract";
import { admitCapability, recordCapabilityUse } from "./task-capability-admission";
import { riskLevelAdmission } from "./task-risk-admission";
import { suspensionBlocks } from "./capability-suspension";
import { requireRuntimeContent, inspectRuntime } from "./runtime-redaction-policy";

type Db = Prisma.TransactionClient;
const same = (a: any, b: any) => Boolean(a && b && a.kind === b.kind && a.id === b.id);
const view = (r: any) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "request_hash").map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));

export async function handoffState(db: Db, workspaceId: string, taskId: string, actor: ReviewActor) {
  const s = await reviewState(db, workspaceId, taskId, actor);
  if ("error" in s) return { error:s.error! };
  const row = (await db.$queryRaw<any[]>`SELECT task_handoff_source(${taskId}::uuid) AS source, task_handoff_source_version(${taskId}::uuid) AS version`)[0];
  const history = await db.$queryRaw<any[]>`SELECT h.*,task_handoff_current(h) AS current,to_jsonb(d) AS decision FROM task_handoffs h LEFT JOIN task_handoff_decisions d ON d.handoff_id=h.id WHERE h.workspace_id=${workspaceId}::uuid AND h.task_id=${taskId}::uuid ORDER BY h.version DESC LIMIT 51`;
  const source = row.source;
  const roles = handoffRoles.map(role => ({ role, principal: role === "requester" ? s.authorities.requester && {kind:"user",id:s.authorities.requester.userId} : s.authorities[role]?.principal, reference:s.contract.taskRoles?.[role] })).filter(r=>r.principal);
  const workers=await db.workforceEntity.findMany({where:{workspaceId,id:{in:roles.filter(r=>r.role!=="requester").map(r=>r.reference.id)}},select:{id:true,name:true}});
  const requester=s.authorities.requester?await db.user.findUnique({where:{id:s.authorities.requester.userId},select:{name:true}}):null;
  const labeledRoles=roles.map(r=>({...r,label:inspectRuntime(r.role==="requester"?requester?.name:workers.find(w=>w.id===r.reference.id)?.name,"handoff.catalog_label","diagnostic",{workspaceId,taskId}).value??r.principal!.id}));
  if(inspectRuntime(labeledRoles.map(r=>r.label),"handoff.catalog_labels","diagnostic",{workspaceId,taskId}).redacted)for(const r of labeledRoles)r.label="[REDACTED]";
  const current = Boolean(s.current && !s.roleIssues.length && source);
  const expectedVersion = reviewDigest({ review:s.expectedVersion, source:row.version, latest:history[0] ?? null });
  return { ...s, source, sourceVersion:row.version as string|null, current, roles:labeledRoles, history, expectedVersion };
}

async function allowed(db:Db,s:any,workspaceId:string,operation:string) {
  return s.current && !(await riskLevelAdmission(db,s.task.id,operation)).error && !await suspensionBlocks(db,workspaceId,s.task.id,s.execution.applicationId,operation,s.principal?.kind==="agent"?s.principal.id:null,s.principal?.credentialId);
}

export async function taskHandoffView(db:Db,workspaceId:string,taskId:string,actor:ReviewActor,cursor?:string) {
  const s=await handoffState(db,workspaceId,taskId,actor);
  if("error" in s)return {error:s.error!};
  let history=s.history;
  if(cursor) {
    const anchor=(await db.$queryRaw<any[]>`SELECT version FROM task_handoffs WHERE id=${cursor}::uuid AND workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid`)[0];
    if(!anchor)return {error:"task_handoff_cursor_invalid"};
    history=await db.$queryRaw<any[]>`SELECT h.*,task_handoff_current(h) AS current,to_jsonb(d) AS decision FROM task_handoffs h LEFT JOIN task_handoff_decisions d ON d.handoff_id=h.id WHERE h.workspace_id=${workspaceId}::uuid AND h.task_id=${taskId}::uuid AND h.version<${anchor.version} ORDER BY h.version DESC LIMIT 51`;
  }
  const grants=s.principal?.kind==="agent"?await db.$queryRaw<any[]>`SELECT id,operation,snapshot->'handoff' AS binding,task_capability_status(g) AS status FROM task_capability_grants g WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid AND agent_id=${s.principal.id}::uuid AND credential_id=${s.principal.credentialId}::uuid AND operation IN ('handoff_create','handoff_accept','handoff_reject') ORDER BY created_at DESC LIMIT 100`:null;
  const grantFor=(op:string,id?:string)=>grants?.find(g=>g.status==="active"&&g.operation===op&&(!id||g.binding?.handoffId===id));
  const senderRoles=s.roles.filter(r=>same(r.principal,s.principal));
  const operations=Object.fromEntries(await Promise.all(handoffOperations.map(async op=>[op,Boolean(await allowed(db,s,workspaceId,op))])));
  const missing:string[]=[];
  if(!s.execution)missing.push("result");
  else {
    if(!object(s.execution.checkpoint).packetRevision||s.execution.checkpointVersion<2)missing.push("packet");
    if(!Object.keys(object(s.execution.verification)).length)missing.push("tests");
    if(s.roleIssues.length)missing.push("roles");
    if(!s.current)missing.push("current_source");
  }
  const result={task:{id:taskId,title:s.task.title},expectedVersion:s.expectedVersion,sourceVersion:s.sourceVersion,source:s.source,
    senderRoles,canManageGrants:Boolean(s.principal?.kind==="user"&&await db.workspaceMembership.findFirst({where:{workspaceId,userId:s.principal.id,role:{in:["owner","admin"]}}})),grantAccess:grants,recipients:s.roles.filter(r=>!same(r.principal,s.principal)),operations,
    missing,
    canCreate:Boolean(s.principal && senderRoles.length && operations.handoff_create && (!grants||grantFor("handoff_create"))),
    history:history.slice(0,50).map(h=>({...view(h),decision:h.decision?view(h.decision):null,
      canAccept:Boolean(h.current && !h.decision && same(h.recipient,s.principal) && operations.handoff_accept && (!grants||grantFor("handoff_accept",h.id))),
      canReject:Boolean(h.current && !h.decision && same(h.recipient,s.principal) && operations.handoff_reject && (!grants||grantFor("handoff_reject",h.id)))})),nextCursor:history.length>50?history[49].id:null};
  requireRuntimeContent(result,"handoff.read",{workspaceId,taskId});
  return result;
}

export async function handoffCommand(db:Db,workspaceId:string,taskId:string,actor:ReviewActor,kind:"create"|"decision",body:unknown) {
  const input=kind==="create"?createHandoffSchema.parse(body):decideHandoffSchema.parse(body);
  requireRuntimeContent(input,"handoff.command",{workspaceId,taskId});
  const s=await handoffState(db,workspaceId,taskId,actor);
  if("error" in s)return {error:s.error!};
  const principal=s.principal;
  if(!principal)return {error:"task_handoff_forbidden"};
  const table=kind==="create"?Prisma.sql`task_handoffs`:Prisma.sql`task_handoff_decisions`;
  const requestHash=reviewDigest({input,taskId,principal,kind});
  const prior=(await db.$queryRaw<any[]>`SELECT * FROM ${table} WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
  if(prior && prior.request_hash!==requestHash)return {error:"task_handoff_key_conflict"};
  if(!s.current)return {error:"task_handoff_stale"};
  let role:string,operation:string,h:any=null;
  if(kind==="create") {
    const c=createHandoffSchema.parse(input);role=c.senderRole;operation="handoff_create";
    if(c.sourceVersion!==s.sourceVersion)return {error:"task_handoff_stale"};
    if(!same(s.roles.find(r=>r.role===role)?.principal,principal) || !same(s.roles.find(r=>r.role===c.recipientRole)?.principal,c.recipient) || same(principal,c.recipient))return {error:"task_handoff_forbidden"};
    if(c.supersedes) {
      h=(await db.$queryRaw<any[]>`SELECT h.*,d.decision FROM task_handoffs h JOIN task_handoff_decisions d ON d.handoff_id=h.id WHERE h.id=${c.supersedes}::uuid AND h.workspace_id=${workspaceId}::uuid AND h.task_id=${taskId}::uuid`)[0];
      if(!h || h.decision!=="reject" || !same(h.sender,principal) || !same(h.recipient,c.recipient) || h.sender_role!==role || h.recipient_role!==c.recipientRole)return {error:"task_handoff_supersedes_invalid"};
      if(!prior && (await db.$queryRaw<any[]>`SELECT id FROM task_handoffs WHERE supersedes=${c.supersedes}::uuid`).length)return {error:"task_handoff_already_superseded"};
    }
  } else {
    const d=decideHandoffSchema.parse(input);operation=`handoff_${d.decision}`;
    h=(await db.$queryRaw<any[]>`SELECT h.*,task_handoff_current(h) AS current FROM task_handoffs h WHERE h.id=${d.handoffId}::uuid AND h.workspace_id=${workspaceId}::uuid AND h.task_id=${taskId}::uuid FOR UPDATE`)[0];
    if(!h)return {error:"task_handoff_not_found"};
    role=h.recipient_role;
    if(!same(h.recipient,principal) || !same(s.roles.find(r=>r.role===role)?.principal,principal))return {error:"task_handoff_forbidden"};
    if(!h.current || h.version!==d.handoffVersion)return {error:"task_handoff_stale"};
    if(!prior && (await db.$queryRaw<any[]>`SELECT id FROM task_handoff_decisions WHERE handoff_id=${h.id}::uuid`).length)return {error:"task_handoff_already_decided"};
  }
  if(!await allowed(db,s,workspaceId,operation))return {error:"risk_admission_required"};
  const capability=await admitCapability(db,workspaceId,taskId,principal,operation,input.grantId,prior?view(prior):undefined);
  if("error" in capability)return {error:capability.error!};
  if(capability.grant) {
    const binding=object(capability.grant.snapshot).handoff;
    if(binding?.role!==role || kind==="decision" && binding?.handoffId!==h.id || kind==="create" && (binding?.recipientRole!==(input as any).recipientRole || !same(binding?.recipient,(input as any).recipient)))return {error:"capability_grant_scope_mismatch"};
  }
  if(prior) {const result={record:view(prior),replayed:true};requireRuntimeContent(result,"handoff.replay",{workspaceId,taskId});return result;}
  if(input.expectedVersion!==s.expectedVersion)return {error:"task_handoff_stale"};
  requireRuntimeContent(s.source,"handoff.source",{workspaceId,taskId});
  const id=randomUUID(),userId=principal.kind==="user"?principal.id:null,agentId=principal.kind==="agent"?principal.id:null;
  if(kind==="create") {
    const c=createHandoffSchema.parse(input);
    await db.$executeRaw`INSERT INTO task_handoffs(id,workspace_id,task_id,application_id,execution_id,version,supersedes,source_version,source,content,sender_role,recipient_role,sender,recipient,actor_user_id,actor_agent_id,actor_credential_id,actor_credential_prefix,capability_grant_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,${s.execution!.applicationId}::uuid,${s.execution!.id}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_handoffs WHERE task_id=${taskId}::uuid),${c.supersedes}::uuid,${s.sourceVersion},${JSON.stringify(s.source)}::jsonb,${JSON.stringify(c.content)}::jsonb,${c.senderRole},${c.recipientRole},${JSON.stringify({kind:principal.kind,id:principal.id})}::jsonb,${JSON.stringify(c.recipient)}::jsonb,${userId}::uuid,${agentId}::uuid,${principal.credentialId}::uuid,${principal.credentialPrefix},${capability.grant?.id??null}::uuid,${input.requestId}::uuid,${requestHash})`;
  } else {
    const d=decideHandoffSchema.parse(input),detail=d.decision==="reject"?{code:d.code,reason:d.reason,sections:d.sections}:{};
    await db.$executeRaw`INSERT INTO task_handoff_decisions(id,workspace_id,task_id,handoff_id,handoff_version,decision,detail,actor_user_id,actor_agent_id,actor_credential_id,actor_credential_prefix,capability_grant_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,${d.handoffId}::uuid,${d.handoffVersion},${d.decision},${JSON.stringify(detail)}::jsonb,${userId}::uuid,${agentId}::uuid,${principal.credentialId}::uuid,${principal.credentialPrefix},${capability.grant?.id??null}::uuid,${input.requestId}::uuid,${requestHash})`;
  }
  await recordCapabilityUse(db,capability.grant,input.requestId,kind==="create"?"handoff":"handoffDecision",id);
  await db.event.create({data:{workspaceId,taskId,type:`task_${operation}`,source:"roost",actorType:principal.kind,actorId:principal.id,resourceType:"task_handoff",resourceId:id,payload:{id,operation,sourceVersion:s.sourceVersion}}});
  return {record:view((await db.$queryRaw<any[]>`SELECT * FROM ${table} WHERE id=${id}::uuid`)[0]),replayed:false};
}

// The administrator selects an exact role and recipient/version. A grant has
// the same lifetime, principal, risk and suspension checks as native review.
export async function handoffGrantChoices(db:Db,workspaceId:string,taskId:string,userId:string) {
  const s=await handoffState(db,workspaceId,taskId,userId);
  if("error" in s || !s.current)return [];
  const options:any[]=[];
  for(const role of s.roles.filter(r=>r.principal?.kind==="agent")) {
    const keys=await db.apiKey.findMany({where:{workspaceId,boundAgentId:role.principal!.id,active:true,revokedAt:null,expiresAt:{gt:new Date()}},take:100});
    for(const key of keys)for(const operation of handoffOperations) {
      if((await riskLevelAdmission(db,taskId,operation)).error || await suspensionBlocks(db,workspaceId,taskId,s.execution!.applicationId,operation,role.principal!.id,key.id))continue;
      const bindings=operation==="handoff_create"?s.roles.filter(r=>!same(r.principal,role.principal)).map(r=>({role:role.role,recipientRole:r.role,recipient:r.principal})):
        s.history.filter(h=>h.current&&!h.decision&&h.recipient_role===role.role&&same(h.recipient,role.principal)).map(h=>({role:role.role,handoffId:h.id}));
      for(const handoff of bindings)options.push({operation,agentId:role.principal!.id,agentLabel:role.role,credentialId:key.id,credentialPrefix:key.keyPrefix,credentialVersion:key.credentialVersion,credentialExpiresAt:key.expiresAt,role:role.reference,handoff,handoffSourceVersion:s.sourceVersion});
    }
  }
  return options;
}
