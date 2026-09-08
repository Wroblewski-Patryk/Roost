import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { lockReadyTask } from "./task-execution-readiness";
import { reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { admissionEvidenceSchema, admissionScopeSchema, admissionOperations } from "./task-risk-admission-contract";
type Db = Prisma.TransactionClient;

export async function admissionVersion(db: Db, taskId: string) {
  return (await db.$queryRaw<any[]>`SELECT encode(sha256(convert_to(COALESCE(task_admission_source(${taskId}::uuid),'missing')||task_risk_version(${taskId}::uuid)||
    COALESCE(task_risk_current(${taskId}::uuid)::text,'missing')||decision_pending_version(${taskId}::uuid)||COALESCE((SELECT jsonb_agg(id ORDER BY operation,gate,version)::text FROM task_admission_evidence WHERE task_id=${taskId}::uuid),'[]'),'UTF8')),'hex') AS version`)[0].version as string;
}
export async function riskLevelAdmission(db: Db, taskId: string, operation = "runtime_execute") {
  const result = (await db.$queryRaw<any[]>`SELECT task_admission_view(${taskId}::uuid,${operation}) AS value`)[0].value;
  return result.seal ? result : { ...result, error: "risk_admission_required" };
}
async function membership(db: Db, workspaceId: string, userId: string) {
  return db.workspaceMembership.findFirst({ where: { workspaceId, userId } });
}
export async function admissionView(db: Db, workspaceId: string, taskId: string, userId: string) {
  const task = await lockReadyTask(db,workspaceId,taskId);
  if (!task) return { error: "task_not_found" };
  const role = (await membership(db,workspaceId,userId))?.role;
  const scope = (await db.$queryRaw<any[]>`SELECT id,version,input,actor_user_id AS "authorId",application_id AS "applicationId",created_at AS "createdAt" FROM task_admission_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0] ?? null;
  const prepared = (await db.$queryRaw<any[]>`SELECT application_id AS id FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0];
  const procedures = prepared ? await db.procedure.findMany({where:{workspaceId,status:"active",applicationLinks:{some:{applicationId:prepared.id}}},select:{id:true,name:true,version:true,updatedAt:true},take:101,orderBy:{id:"asc"}}) : [];
  const records = await db.companyRecord.findMany({where:{workspaceId,status:{not:"archived"},OR:[{applicationId:null},...(prepared?[{applicationId:prepared.id}]:[])]},select:{id:true,title:true,applicationId:true,updatedAt:true},take:501,orderBy:{id:"asc"}});
  const operations = Object.fromEntries(await Promise.all(admissionOperations.map(async op=>[op,await riskLevelAdmission(db,taskId,op)])));
  const history = await db.$queryRaw<any[]>`SELECT id,operation,gate,version,verdict,actor_user_id AS "issuerId",created_at AS "createdAt" FROM task_admission_evidence WHERE task_id=${taskId}::uuid ORDER BY created_at DESC,id DESC LIMIT 21`;
  const independent = (await db.$queryRaw<any[]>`SELECT task_admission_independent(${taskId}::uuid,${userId}::uuid) AS allowed`)[0].allowed;
  return { task:{id:taskId,title:task.title},expectedVersion:await admissionVersion(db,taskId),scope,operations,
    permissions:{canWrite:["owner","admin","member"].includes(role??""),canApprove:role==="owner",independent},
    procedures:procedures.slice(0,100),records:records.slice(0,500).map(r=>({...r,revision:r.updatedAt.toISOString(),updatedAt:undefined})),
    catalogTruncated:procedures.length>100||records.length>500,history:history.slice(0,20),historyTruncated:history.length>20 };
}
export async function admissionCommand(db: Db, workspaceId: string, taskId: string, userId: string, kind: "scope"|"evidence", body: unknown) {
  const input = kind==="scope" ? admissionScopeSchema.parse(body) : admissionEvidenceSchema.parse(body);
  requireRuntimeContent(input,"risk_admission.command",{workspaceId,taskId});
  const task=await lockReadyTask(db,workspaceId,taskId);
  if (!task) return {error:"task_not_found"};
  if (!["owner","admin","member"].includes((await membership(db,workspaceId,userId))?.role??"")) return {error:"risk_admission_forbidden"};
  const hash=reviewDigest({input,kind,taskId,userId}), table=kind==="scope"?Prisma.sql`task_admission_scopes`:Prisma.sql`task_admission_evidence`;
  const prior=await db.$queryRaw<any[]>`SELECT request_hash FROM ${table} WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if(prior[0]) return prior[0].request_hash===hash?{...await admissionView(db,workspaceId,taskId,userId),replayed:true}:{error:"risk_admission_request_conflict"};
  if(input.expectedVersion!==await admissionVersion(db,taskId)) return {error:"risk_admission_stale"};
  const id=randomUUID();
  const {requestId,expectedVersion,...detail}=input;
  if(kind==="scope") {
    const s=admissionScopeSchema.parse(input);
    await db.$executeRaw`INSERT INTO task_admission_scopes(id,workspace_id,task_id,version,application_id,procedure_id,target_id,release_id,input,actor_user_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_admission_scopes WHERE task_id=${taskId}::uuid),
      (SELECT application_id FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1),${s.procedureId}::uuid,${s.targetId}::uuid,${s.releaseId}::uuid,${JSON.stringify(detail)}::jsonb,${userId}::uuid,${requestId}::uuid,${hash})`;
  } else {
    const e=admissionEvidenceSchema.parse(input);
    const record=await db.companyRecord.findFirst({where:{id:e.evidence.id,workspaceId},select:{description:true,businessPurpose:true,desiredState:true,expectedBehavior:true}});
    requireRuntimeContent(record,"risk_admission.evidence",{workspaceId,taskId,recordId:e.evidence.id});
    await db.$executeRaw`INSERT INTO task_admission_evidence(id,workspace_id,task_id,scope_id,operation,gate,version,source_version,dependency_version,evidence_id,evidence_revision,verdict,detail,actor_user_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT id FROM task_admission_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1),${e.operation},${e.gate},
      (SELECT COALESCE(max(version),0)+1 FROM task_admission_evidence WHERE task_id=${taskId}::uuid AND operation=${e.operation} AND gate=${e.gate}),
      task_admission_source(${taskId}::uuid),task_admission_dependencies(${taskId}::uuid,${e.operation},${e.gate}),${e.evidence.id}::uuid,${e.evidence.revision}::timestamptz,${e.verdict},${JSON.stringify(detail)}::jsonb,${userId}::uuid,${requestId}::uuid,${hash})`;
  }
  await db.event.create({data:{workspaceId,taskId,type:`task_risk_admission_${kind}`,source:"roost",actorType:"user",actorId:userId,resourceType:`task_admission_${kind}`,resourceId:id,payload:{id,policy:"roost-native-risk-admission-v1"}}});
  return admissionView(db,workspaceId,taskId,userId);
}
