import { clarificationGrantChoices } from "./task-clarification";
import { handoffGrantChoices } from "./task-handoff";
import type { Prisma } from "@prisma/client";
import { suspensionBlocks, suspensionList } from "./capability-suspension";
import { riskAdmission } from "./task-risk";
import { riskLevelAdmission } from "./task-risk-admission";
import { reviewState } from "./task-review";
import { capabilityWindow, issueCapabilitySchema, revokeCapabilitySchema } from "./task-capability-contract";
import { grantOperations, grantScope, grantState } from "./task-capability-admission";
import { reviewDigest, wire } from "./task-review-contract";
type Db = Prisma.TransactionClient;
async function administer(db: Db, workspaceId: string, userId?: string) {
  return userId ? db.workspaceMembership.findFirst({ where: { workspaceId, userId, role: { in: ["owner", "admin"] } } }) : null;
}
async function safeGrant(db: Db, g: any) {
  return { ...g, status: (await grantState(db, g.id)).status };
}
async function reviewChoices(db: Db, workspaceId: string, s: any) {
  if ("error" in await riskAdmission(db,s.task.id)) return [];
  if (!s.current || s.roleIssues.length || !["todo", "in_progress"].includes(s.task.status) || s.execution.cancelRequestedAt) return [];
  const options = [];
  for (const operation of grantOperations) {
    if ((await riskLevelAdmission(db,s.task.id,operation)).error) continue;
    if (operation === "review_decision" ? Boolean(s.decision) : s.decision?.decision !== "reject" || Boolean(s.decision.action)) continue;
    const role = operation === "review_decision" ? s.authorities.verifier : s.authorities.accountableManager;
    if (role?.principal?.kind !== "agent") continue;
    const key = await db.apiKey.findFirst({ where: { workspaceId, boundAgentId: role.id, active: true, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!key) continue;
    if (await suspensionBlocks(db, workspaceId, s.task.id, s.execution.applicationId, operation, role.id, key.id)) continue;
    options.push({ operation, agentId: role.id, agentLabel: operation === "review_decision" ? s.labels.verifier : s.labels.manager, credentialId: key.id, credentialPrefix: key.keyPrefix,
      credentialVersion: key.credentialVersion, credentialExpiresAt: key.expiresAt, role });
  }
  return [...options, ...await handoffGrantChoices(db,workspaceId,s.task.id,s.principal?.kind==="user"?s.principal.id:"")];
}
async function decisionChoices(db: Db, workspaceId: string, s: any) {
  if (s.principal?.kind !== "user" || (await riskLevelAdmission(db,s.task.id,"decision_supersede")).error) return [];
  const rows=await db.$queryRaw<any[]>`SELECT p.id,p.decision_id,d.title,p.authority,k.id AS credential_id,k.key_prefix,k.credential_version,k.expires_at,f.name,a.application_id
    FROM decision_impact_previews p JOIN decisions d ON d.id=p.decision_id
    JOIN workforce_entities f ON f.id=(p.authority->'principal'->>'id')::uuid
    JOIN api_keys k ON k.bound_agent_id=f.id AND k.workspace_id=p.workspace_id AND k.active AND k.revoked_at IS NULL AND k.expires_at>now()
    JOIN task_admission_scopes a ON a.task_id=${s.task.id}::uuid AND a.version=(SELECT max(version) FROM task_admission_scopes WHERE task_id=a.task_id)
    WHERE p.workspace_id=${workspaceId}::uuid AND p.authority->>'status'='delegated' AND p.authority->'principal'->>'kind'='agent' AND decision_state(p.decision_id)='pending'
    AND p.impact->'taskIds' @> jsonb_build_array(${s.task.id}::uuid) AND p.version=(SELECT max(version) FROM decision_impact_previews WHERE decision_id=p.decision_id)
    ORDER BY p.id,k.id LIMIT 101`;
  const result=[];
  for(const row of rows){
    const decision={decisionId:row.decision_id,previewId:row.id};
    if(!await grantScope(db,s.task.id,row.credential_id,s.principal.id,undefined,undefined,decision)||await suspensionBlocks(db,workspaceId,s.task.id,row.application_id,"decision_supersede",row.authority.principal.id,row.credential_id))continue;
    result.push({operation:"decision_supersede",decision,decisionLabel:row.title,agentId:row.authority.principal.id,agentLabel:row.name,credentialId:row.credential_id,credentialPrefix:row.key_prefix,credentialVersion:row.credential_version,credentialExpiresAt:row.expires_at,mandateExpiresAt:row.authority.mandate.endsAt,applicationId:row.application_id});
  }
  return result;
}
async function choices(db:Db,workspaceId:string,s:any):Promise<any[]>{return [...await reviewChoices(db,workspaceId,s),...await clarificationGrantChoices(db,workspaceId,s.task.id),...await decisionChoices(db,workspaceId,s)];}
export async function taskCapabilityView(db: Db, workspaceId: string, taskId: string, userId?: string, cursor?: string) {
  const s = await reviewState(db, workspaceId, taskId, userId);
  if ("error" in s) return { error: s.error! };
  const canAdminister = Boolean(await administer(db, workspaceId, userId));
  if (!canAdminister) return { error: "capability_admin_required" };
  if (cursor && !await db.taskCapabilityGrant.findFirst({ where: { id: cursor, workspaceId, taskId } })) return { error: "capability_cursor_invalid" };
  const rows = await db.taskCapabilityGrant.findMany({ where: { workspaceId, taskId }, include: { usage: true, revocation: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const options = await choices(db, workspaceId, s);
  const available = [];
  for (const option of options) if (await grantScope(db, taskId, option.credentialId, userId!,option.clarification,option.interview,option.decision)) available.push(option);
  const applicationId=s.execution?.applicationId??available[0]?.applicationId??null;
  const application=applicationId?await db.application.findUnique({where:{id:applicationId},select:{name:true}}):null;
  return { task: { id: taskId, title: s.task.title }, applicationLabel: application?.name ?? null, applicationId, optionsTruncated:options.length>=500, expectedVersion: s.expectedVersion, canAdminister, options: available,
    ...await suspensionList(db, workspaceId, taskId), grants: await Promise.all(rows.slice(0, 50).map(g => safeGrant(db, g))), nextCursor: rows.length > 50 ? rows[49]!.id : null };
}
export async function issueTaskCapability(db: Db, workspaceId: string, taskId: string, userId: string, body: unknown) {
  const input = issueCapabilitySchema.parse(body), s = await reviewState(db, workspaceId, taskId, userId);
  if ("error" in s) return { error: s.error! };
  if (!await administer(db, workspaceId, userId)) return { error: "capability_admin_required" };
  const requestHash = reviewDigest({ input, taskId, userId });
  const prior = await db.taskCapabilityGrant.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
  if (prior) return prior.requestHash === requestHash ? { grant: await safeGrant(db, prior), replayed: true } : { error: "capability_request_conflict" };
  if (input.expectedVersion !== s.expectedVersion) return { error: "capability_scope_stale" };
  let option = (await choices(db, workspaceId, s)).find(o => o.operation === input.operation && o.credentialId === input.credentialId && reviewDigest(o.decision??null) === reviewDigest(input.decision??null) && reviewDigest(o.handoff??null) === reviewDigest(input.handoff??null) && reviewDigest(o.clarification??null)===reviewDigest(input.clarification??null) && (!o.clarification||o.contextVersion===input.clarificationContextVersion));
  if(input.operation==="interview_prepare"&&input.interview){
   const key=await db.apiKey.findFirst({where:{id:input.credentialId,workspaceId,active:true,revokedAt:null,expiresAt:{gt:new Date()}}});
   const app=(await db.$queryRaw<any[]>`SELECT task_interview_context(${taskId}::uuid) AS value`)[0].value;
   if(key&&app&&await grantScope(db,taskId,key.id,userId,undefined,input.interview)&&!(await riskLevelAdmission(db,taskId,"interview_prepare")).error)
    option={operation:input.operation,interview:input.interview,agentId:key.boundAgentId,credentialId:key.id,credentialVersion:key.credentialVersion,credentialExpiresAt:key.expiresAt,credentialPrefix:key.keyPrefix,applicationId:app.application.id,agentLabel:"Task agent"};
  }

  if (!option) return { error: "capability_role_or_credential_invalid" };
  const scopeHash = await grantScope(db, taskId, option.credentialId, userId,option.clarification,option.interview,option.decision);
  if (!scopeHash) return { error: "capability_application_invalid" };
  const risk = await riskAdmission(db,taskId);
  if ("error" in risk) return {error:risk.error!};
  const validFrom = new Date(input.validFrom), validUntil = new Date(input.validUntil);
  if (!capabilityWindow(validFrom, validUntil, option.credentialExpiresAt!)) return { error: "capability_window_invalid" };
  if (option.mandateExpiresAt && validUntil > new Date(option.mandateExpiresAt)) return { error: "capability_window_invalid" };
  const issuer = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const application = await db.application.findUniqueOrThrow({ where: { id: (option.applicationId??s.execution?.applicationId)! }, select: { name: true } });
  const grant = await db.taskCapabilityGrant.create({ data: { workspaceId, taskId, applicationId: (option.applicationId??s.execution?.applicationId)!, executionId: option.clarification||option.interview||option.decision?null:s.execution!.id, agentId: option.agentId,
    credentialId: option.credentialId, credentialVersion: option.credentialVersion, operation: input.operation, validFrom, validUntil, issuerUserId: userId,
    reason: input.reason, requestId: input.requestId, requestHash, scopeHash, snapshot: wire({ decision:option.decision,interview:option.interview, clarification:option.clarification, clarificationContextVersion:option.contextVersion, handoff:option.handoff, handoffSourceVersion:option.handoffSourceVersion, agentLabel: option.agentLabel, issuerLabel: issuer.name ?? "Workspace administrator", applicationLabel: application.name,
      taskLabel: s.task.title, credentialPrefix: option.credentialPrefix, role: option.role, materialVersion: s.materialVersion, riskAssessmentId:risk.id }) } });
  await db.event.create({ data: { workspaceId, taskId, type: "task_capability.issued", source: "roost", actorType: "user", actorId: userId, resourceType: "task_capability_grant", resourceId: grant.id,
    payload: { grantId: grant.id, agentId: grant.agentId, credentialId: grant.credentialId, operation: grant.operation, applicationId: grant.applicationId } } });
  return { grant: await safeGrant(db, grant), replayed: false };
}
export async function revokeTaskCapability(db: Db, workspaceId: string, taskId: string, grantId: string, userId: string, body: unknown) {
  const input = revokeCapabilitySchema.parse(body), s = await reviewState(db, workspaceId, taskId, userId);
  if ("error" in s) return { error: s.error! };
  if (!await administer(db, workspaceId, userId)) return { error: "capability_admin_required" };
  const grant = await db.taskCapabilityGrant.findFirst({ where: { id: grantId, taskId, workspaceId }, include: { revocation: true } });
  if (!grant) return { error: "capability_not_found" };
  const requestHash = reviewDigest({ input, grantId, userId, taskId });
  const prior = await db.taskCapabilityRevocation.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
  if (prior) return prior.requestHash === requestHash ? { grant: await safeGrant(db, grant), replayed: true } : { error: "capability_request_conflict" };
  if (grant.revocation) return { error: "capability_already_revoked" };
  await db.taskCapabilityRevocation.create({ data: { workspaceId, grantId, requestId: input.requestId, requestHash, actorUserId: userId, reason: input.reason } });
  await db.event.create({ data: { workspaceId, taskId, type: "task_capability.revoked", source: "roost", actorType: "user", actorId: userId, resourceType: "task_capability_grant", resourceId: grant.id, payload: { grantId, reason: input.reason } } });
  return { grant: await safeGrant(db, grant), replayed: false };
}
