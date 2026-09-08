import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { sendApiError } from "../../middleware/api-error";
import { requireWorkspaceRole } from "../../auth/workspace-access";
import { lockReadyTask, readyTransaction } from "./task-execution-readiness";
import { reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";
type Db = Prisma.TransactionClient;
const text = z.string().trim().min(3).max(2000), uuid = z.string().uuid();
export const suspensionOperations = ["review_decision", "return_to_executor", "create_specialist_task", "runtime_execute" , "handoff_create", "handoff_accept", "handoff_reject"] as const;
export const suspensionSchema = z.object({ requestId: uuid, incidentId: uuid, taskId: uuid, applicationId: uuid,
  operation: z.enum(suspensionOperations), agentId: uuid.optional(), credentialId: uuid.optional(), hostId: uuid.optional(), reason: text, scopeProof: text, broaderReason: text.optional() }).strict()
  .refine(v => Boolean(v.agentId || v.credentialId || v.hostId || v.broaderReason), "scope_required")
  .refine(v => !v.credentialId || Boolean(v.agentId), "principal_required")
  .refine(v => v.operation === "runtime_execute" ? !v.credentialId : !v.hostId, "unsupported_scope");
const commandBase = { requestId: uuid, expectedVersion: z.number().int().positive() };
export const suspensionCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...commandBase, action: z.literal("evidence"), cause: text, impact: text, remediation: text, regressionProof: text, limitations: text, repairAuthorUserId: uuid }).strict(),
  z.object({ ...commandBase, action: z.literal("verify"), evidenceId: uuid, assessment: text }).strict(),
  z.object({ ...commandBase, action: z.literal("restore"), evidenceId: uuid, reason: text }).strict(),
  z.object({ ...commandBase, action: z.enum(["reject", "reopen", "manual_intervention"]), reason: text }).strict(),
]);
const camel = (row: any) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "request_hash").map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]));
export async function suspensionBlocks(db: Db, workspaceId: string, taskId: string, applicationId: string, operation: string, agentId?: string | null, credentialId?: string | null, hostId?: string | null) {
  return (await db.$queryRaw<Array<{ blocked: boolean }>>`SELECT native_capability_blocked(${workspaceId}::uuid,${taskId}::uuid,${applicationId}::uuid,${operation},${agentId ?? null}::uuid,${credentialId ?? null}::uuid,${hostId ?? null}::uuid) AS blocked`)[0]!.blocked;
}
export async function suspensionList(db: Db, workspaceId: string, taskId?: string, incidentId?: string) {
  const rows = await db.$queryRaw<any[]>`SELECT s.*,native_suspension_active(s.id) AS active,COALESCE((SELECT max(version) FROM native_suspension_journal WHERE suspension_id=s.id),1) AS version
    FROM native_capability_suspensions s WHERE workspace_id=${workspaceId}::uuid AND (${taskId ?? null}::uuid IS NULL OR task_id=${taskId ?? null}::uuid)
    AND (${incidentId ?? null}::uuid IS NULL OR incident_id=${incidentId ?? null}::uuid) ORDER BY created_at DESC,id DESC LIMIT 51`;
  return { suspensions: rows.slice(0,50).map(camel), truncated: rows.length>50 };
}
async function suspensionView(db: Db, workspaceId: string, id: string, userId: string) {
  const rows = await db.$queryRaw<any[]>`SELECT s.*,native_suspension_active(s.id) AS active,COALESCE((SELECT max(version) FROM native_suspension_journal WHERE suspension_id=s.id),1) AS version FROM native_capability_suspensions s WHERE id=${id}::uuid AND workspace_id=${workspaceId}::uuid`;
  if (!rows[0]) return { error: "native_suspension_not_found" };
  const journal = await db.$queryRaw<any[]>`SELECT * FROM native_suspension_journal WHERE suspension_id=${id}::uuid ORDER BY version DESC LIMIT 101`;
  const membership = await db.workspaceMembership.findFirst({ where: { workspaceId, userId } });
  const members = await db.workspaceMembership.findMany({ where: { workspaceId, role: { in: ["owner","admin","member"] } }, select: { userId: true, user:{select:{name:true}} }, take: 501 });
  return { suspension: camel(rows[0]), history: journal.slice(0,100).map(camel), truncated: journal.length>100,
    currentUserId: userId, canEdit: ["owner","admin","member"].includes(membership?.role ?? ""), canDecide: membership?.role === "owner", members: members.slice(0,500).map(m=>({userId:m.userId,label:m.user.name??m.userId})), membersTruncated: members.length>500 };
}
async function createSuspension(db: Db, workspaceId: string, userId: string, body: unknown) {
  const input = suspensionSchema.parse(body);
  requireRuntimeContent(input, "suspension.create", { workspaceId, taskId: input.taskId });
  const task = await lockReadyTask(db, workspaceId, input.taskId);
  if (!task) return { error: "task_not_found" };
  const membership = await db.workspaceMembership.findFirst({ where: { workspaceId, userId } });
  if (!["owner","admin"].includes(membership?.role ?? "") || input.broaderReason && membership?.role !== "owner") return { error: "native_suspension_forbidden" };
  const hash = reviewDigest({ input, userId }), prior = await db.$queryRaw<any[]>`SELECT * FROM native_capability_suspensions WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if (prior[0]) return prior[0].request_hash === hash ? { ...await suspensionView(db,workspaceId,prior[0].id,userId), replayed:true } : { error:"native_suspension_request_conflict" };
  const id = randomUUID();
  await db.$executeRaw`INSERT INTO native_capability_suspensions(id,workspace_id,incident_id,task_id,application_id,operation,agent_id,credential_id,host_id,issuer_user_id,reason,scope_proof,broader_reason,request_id,request_hash)
    VALUES(${id}::uuid,${workspaceId}::uuid,${input.incidentId}::uuid,${input.taskId}::uuid,${input.applicationId}::uuid,${input.operation},${input.agentId ?? null}::uuid,${input.credentialId ?? null}::uuid,${input.hostId ?? null}::uuid,${userId}::uuid,${input.reason},${input.scopeProof},${input.broaderReason ?? null},${input.requestId}::uuid,${hash})`;
  await audit(db,workspaceId,input.taskId,id,userId,"suspended",1);
  return { ...await suspensionView(db,workspaceId,id,userId), replayed:false };
}
async function audit(db: Db, workspaceId: string, taskId: string, id: string, userId: string, action: string, version: number) {
  await db.event.create({ data: { workspaceId, taskId, type: `task_capability.${action}`, source: "roost", actorType:"user", actorId:userId, resourceType:"native_capability_suspension",resourceId:id,payload:{suspensionId:id,version,action} } });
}
async function commandSuspension(db: Db, workspaceId: string, id: string, userId: string, body: unknown) {
  const input = suspensionCommandSchema.parse(body) as any;
  requireRuntimeContent(input,"suspension.command",{workspaceId,recordId:id});
  await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
  const state = await suspensionView(db,workspaceId,id,userId);
  if ("error" in state) return state;
  if (!state.canEdit || ["restore","reopen","reject","manual_intervention"].includes(input.action) && !state.canDecide) return {error:"native_suspension_forbidden"};
  const hash=reviewDigest({input,id,userId}), prior=await db.$queryRaw<any[]>`SELECT * FROM native_suspension_journal WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if(prior[0]) return prior[0].request_hash===hash ? {...state,replayed:true} : {error:"native_suspension_request_conflict"};
  if(input.expectedVersion!==state.suspension.version) return {error:"native_suspension_stale"};
  const {requestId,expectedVersion,action,evidenceId,...payload}=input;
  await db.$executeRaw`INSERT INTO native_suspension_journal(id,workspace_id,suspension_id,version,action,actor_user_id,evidence_id,payload,request_id,request_hash)
    VALUES(${randomUUID()}::uuid,${workspaceId}::uuid,${id}::uuid,${expectedVersion+1},${action},${userId}::uuid,${evidenceId ?? null}::uuid,${JSON.stringify(payload)}::jsonb,${requestId}::uuid,${hash})`;
  await audit(db,workspaceId,state.suspension.taskId as string,id,userId,action,expectedVersion+1);
  return {...await suspensionView(db,workspaceId,id,userId),replayed:false};
}
export async function suspensionTransaction<T>(work: (db: Db)=>Promise<T>) {
  try { return await readyTransaction(work); } catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==="P2010") {
      const code=String(error.meta?.message ?? "").match(/\bnative_(?:suspension_[a-z_]+|capability_suspended)\b/)?.[0];
      if(code) return {error:code};
      if(error.meta?.code==="23503" || error.meta?.code==="23514") return {error:"native_suspension_scope_invalid"};
    }
    throw error;
  }
}
export const capabilitySuspensionRouter=Router();
capabilitySuspensionRouter.get("/",asyncHandler(async(req,res)=>{
  if(!requireWorkspaceRole(req,res,"viewer")) return;
  const query=z.object({taskId:uuid.optional(),incidentId:uuid.optional()}).strict().parse(req.query);
  const result=await readyTransaction(db=>suspensionList(db,req.auth!.workspaceId,query.taskId,query.incidentId));
  if("error" in result) return sendApiError(res,409,result.error);
  res.json({data:{...result,canCreate:["owner","admin"].includes(req.auth!.workspaceRole ?? "")}});
}));
capabilitySuspensionRouter.get("/catalog",asyncHandler(async(req,res)=>{
  if(!requireWorkspaceRole(req,res,"admin")) return;
  const {prisma}=await import("../../db/prisma");const workspaceId=req.auth!.workspaceId;
  const taskId=uuid.optional().parse(req.query.taskId);
  const tasks=await prisma.task.findMany({where:{workspaceId,...taskId?{id:taskId}:{},projectId:{not:null}},select:{id:true,title:true,projectId:true},take:201,orderBy:{updatedAt:"desc"}});
  const links=await prisma.applicationProject.findMany({where:{projectId:{in:tasks.slice(0,200).map(t=>t.projectId!)}},include:{application:{select:{id:true,name:true,workspaceId:true}}}});
  const agents=await prisma.workforceEntity.findMany({where:{workspaceId,type:"agent"},select:{id:true,name:true},take:201});
  const credentials=await prisma.apiKey.findMany({where:{workspaceId,boundAgentId:{not:null}},select:{id:true,boundAgentId:true,keyPrefix:true},take:201});
  const hosts=await prisma.agentHost.findMany({where:{workspaceId},select:{id:true,name:true},take:201});
  const incidents=await prisma.companyRecord.findMany({where:{workspaceId,recordType:"technical_incident"},select:{id:true,title:true},orderBy:{createdAt:"desc"},take:201});
  res.json({data:{tasks:tasks.slice(0,200).flatMap(t=>links.filter(l=>l.projectId===t.projectId&&l.application.workspaceId===workspaceId).map(l=>({id:t.id,title:t.title,applicationId:l.application.id,applicationLabel:l.application.name}))),agents:agents.slice(0,200),credentialChoices:credentials.slice(0,200),hosts:hosts.slice(0,200),incidents:incidents.slice(0,200),canBroaden:req.auth!.workspaceRole==="owner",truncated:[tasks,agents,credentials,hosts,incidents].some(x=>x.length>200)}});
}));
capabilitySuspensionRouter.get("/:id",asyncHandler(async(req,res)=>{
  if(!requireWorkspaceRole(req,res,"viewer")) return;
  const result=await readyTransaction(db=>suspensionView(db,req.auth!.workspaceId,uuid.parse(req.params.id),req.auth!.userId!));
  if("error" in result) return sendApiError(res,result.error==="native_suspension_not_found"?404:409,result.error!);
  res.json({data:result});
}));
capabilitySuspensionRouter.post("/",asyncHandler(async(req,res)=>{
  if(!requireWorkspaceRole(req,res,"admin")) return;
  const result=await suspensionTransaction(db=>createSuspension(db,req.auth!.workspaceId,req.auth!.userId!,req.body));
  if("error" in result) return sendApiError(res,result.error==="native_suspension_forbidden"?403:409,result.error!);
  res.status(result.replayed?200:201).json({data:result});
}));
capabilitySuspensionRouter.post("/:id/actions",asyncHandler(async(req,res)=>{
  if(!requireWorkspaceRole(req,res,"member")) return;
  const result=await suspensionTransaction(db=>commandSuspension(db,req.auth!.workspaceId,uuid.parse(req.params.id),req.auth!.userId!,req.body));
  if("error" in result) return sendApiError(res,result.error==="native_suspension_forbidden"?403:result.error==="native_suspension_not_found"?404:409,result.error!);
  res.json({data:result});
}));
