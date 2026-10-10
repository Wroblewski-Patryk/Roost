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
async function isPrimaryOwner(db: Db, workspaceId: string, userId: string) {
  return Boolean(await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } })
    && (await membership(db,workspaceId,userId))?.role === "owner");
}
export async function admissionView(db: Db, workspaceId: string, taskId: string, userId: string) {
  const task = await lockReadyTask(db,workspaceId,taskId);
  if (!task) return { error: "task_not_found" };
  const role = (await membership(db,workspaceId,userId))?.role;
  const scope = (await db.$queryRaw<any[]>`SELECT id,version,input,actor_user_id AS "authorId",application_id AS "applicationId",created_at AS "createdAt" FROM task_admission_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0] ?? null;
  const prepared = (await db.$queryRaw<any[]>`SELECT application_id AS id,scope_kind AS "scopeKind",input FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0];
  const company = prepared?.scopeKind === "company_information";
  const selected = prepared?.input?.contract;
  const procedures = prepared ? await db.procedure.findMany({where:{workspaceId,status:"active",...(company ? { id: { in: (selected?.procedures?.items ?? []).map((p:any)=>p.id) } } : { applicationLinks:{some:{applicationId:prepared.id}} })},select:{id:true,name:true,version:true,updatedAt:true},take:101,orderBy:{id:"asc"}}) : [];
  const records = await db.companyRecord.findMany({where:{workspaceId,status:{not:"archived"},...(company ? {applicationId:null,id:{in:(selected?.context?.company ?? []).map((r:any)=>r.id)}} : {OR:[{applicationId:null},...(prepared?[{applicationId:prepared.id}]:[])]})},select:{id:true,title:true,applicationId:true,updatedAt:true},take:501,orderBy:{id:"asc"}});
  const operations = Object.fromEntries(await Promise.all(admissionOperations.map(async op=>[op,await riskLevelAdmission(db,taskId,op)])));
  const history = await db.$queryRaw<any[]>`SELECT id,operation,gate,version,verdict,actor_user_id AS "issuerId",created_at AS "createdAt" FROM task_admission_evidence WHERE task_id=${taskId}::uuid ORDER BY created_at DESC,id DESC LIMIT 21`;
  const independent = (await db.$queryRaw<any[]>`SELECT task_admission_independent(${taskId}::uuid,${userId}::uuid) AS allowed`)[0].allowed;
  return { task:{id:taskId,title:task.title},scopeKind:company?"company_information":"application",expectedVersion:await admissionVersion(db,taskId),scope,operations,
    permissions:{canWrite:company ? await isPrimaryOwner(db,workspaceId,userId) : ["owner","admin","member"].includes(role??""),canApprove:company ? await isPrimaryOwner(db,workspaceId,userId) : role==="owner",independent},
    procedures:procedures.slice(0,100),records:records.slice(0,500).map(r=>({...r,revision:r.updatedAt.toISOString(),updatedAt:undefined})),
    catalogTruncated:procedures.length>100||records.length>500,history:history.slice(0,20),historyTruncated:history.length>20 };
}
export async function admissionCommand(db: Db, workspaceId: string, taskId: string, userId: string, kind: "scope"|"evidence", body: unknown, options: { compact?: boolean; bodyAfterLock?: () => Promise<unknown> } = {}) {
  // Only an internal atomic evidence writer can construct its explicit body
  // after this command's normal fence. Literal API bodies retain their CAS.
  const factory=options.bodyAfterLock;
  if(factory!==undefined&&(typeof factory!=="function"||kind!=="evidence"||options.compact!==true))throw new Error("risk_admission_internal_factory_invalid");
  const parse=(value:unknown)=>kind==="scope"?admissionScopeSchema.parse(value):admissionEvidenceSchema.parse(value);
  const prepared=factory?null:parse(body);
  if(prepared)requireRuntimeContent(prepared,"risk_admission.command",{workspaceId,taskId});
  const task=await lockReadyTask(db,workspaceId,taskId);
  if (!task) return {error:"task_not_found"};
  if (!["owner","admin","member"].includes((await membership(db,workspaceId,userId))?.role??"")) return {error:"risk_admission_forbidden"};
  const input=prepared??parse(await factory!());
  if(factory)requireRuntimeContent(input,"risk_admission.command",{workspaceId,taskId});
  const riskScope = (await db.$queryRaw<any[]>`SELECT application_id AS "applicationId",scope_kind AS "scopeKind",actor_user_id AS "authorId",input FROM task_risk_scopes
    WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0];
  const company = kind === "scope" ? "scopeKind" in input && input.scopeKind === "company_information" : riskScope?.scopeKind === "company_information";
  const activeScope = company && kind === "evidence" ? (await db.$queryRaw<any[]>`SELECT id,scope_kind AS "scopeKind",actor_user_id AS "authorId",input FROM task_admission_scopes
    WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0] : null;
  if (company && (!await isPrimaryOwner(db,workspaceId,userId) || riskScope?.scopeKind !== "company_information" || riskScope.authorId !== userId
    || kind === "evidence" && (activeScope?.scopeKind !== "company_information" || activeScope.authorId !== userId))) return {error:"risk_admission_forbidden"};
  if (kind === "scope" && !company && riskScope?.scopeKind === "company_information") return {error:"risk_admission_scope_invalid"};
  const hash=reviewDigest({input,kind,taskId,userId}), table=kind==="scope"?Prisma.sql`task_admission_scopes`:Prisma.sql`task_admission_evidence`;
  const prior=await db.$queryRaw<any[]>`SELECT id,request_hash FROM ${table} WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if(prior[0]) {
    if(prior[0].request_hash!==hash)return {error:"risk_admission_request_conflict"};
    if(options.compact&&kind==="evidence")return {evidenceId:prior[0].id,operation:admissionEvidenceSchema.parse(input).operation,replayed:true};
    return {...await admissionView(db,workspaceId,taskId,userId),replayed:true};
  }
  if(input.expectedVersion!==await admissionVersion(db,taskId)) return {error:"risk_admission_stale"};
  const id=randomUUID();
  const {requestId,expectedVersion,...detail}=input;
  if(kind==="scope") {
    const s=admissionScopeSchema.parse(input);
    if (company) {
      const procedure = await db.procedure.findFirst({ where: { id: s.procedureId, workspaceId, status: "active" }, select: { version: true } });
      if (!procedure || !riskScope.input?.contract?.procedures?.items?.some((r:any)=>r.id===s.procedureId && r.revision===String(procedure.version))) return {error:"risk_admission_scope_invalid"};
      await db.$executeRaw`INSERT INTO task_admission_scopes(id,workspace_id,task_id,version,scope_kind,application_id,procedure_id,target_id,release_id,input,actor_user_id,request_id,request_hash)
        VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_admission_scopes WHERE task_id=${taskId}::uuid),
          'company_information',NULL,${s.procedureId}::uuid,NULL,NULL,${JSON.stringify(detail)}::jsonb,${userId}::uuid,${requestId}::uuid,${hash})`;
    } else await db.$executeRaw`INSERT INTO task_admission_scopes(id,workspace_id,task_id,version,application_id,procedure_id,target_id,release_id,input,actor_user_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_admission_scopes WHERE task_id=${taskId}::uuid),
      (SELECT application_id FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1),${s.procedureId}::uuid,${s.targetId}::uuid,${s.releaseId}::uuid,${JSON.stringify(detail)}::jsonb,${userId}::uuid,${requestId}::uuid,${hash})`;
  } else {
    const e=admissionEvidenceSchema.parse(input);
    if (company && (e.gate !== "procedure" || !activeScope.input?.operations?.includes(e.operation)
      || !riskScope.input?.contract?.context?.company?.some((r:any)=>r.id===e.evidence.id && r.revision===e.evidence.revision))) return {error:"risk_admission_scope_invalid"};
    const record=await db.companyRecord.findFirst({where:{id:e.evidence.id,workspaceId},select:{description:true,businessPurpose:true,desiredState:true,expectedBehavior:true}});
    requireRuntimeContent(record,"risk_admission.evidence",{workspaceId,taskId,recordId:e.evidence.id});
    await db.$executeRaw`INSERT INTO task_admission_evidence(id,workspace_id,task_id,scope_id,operation,gate,version,source_version,dependency_version,evidence_id,evidence_revision,verdict,detail,actor_user_id,request_id,request_hash)
      VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT id FROM task_admission_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1),${e.operation},${e.gate},
      (SELECT COALESCE(max(version),0)+1 FROM task_admission_evidence WHERE task_id=${taskId}::uuid AND operation=${e.operation} AND gate=${e.gate}),
      task_admission_source(${taskId}::uuid),task_admission_dependencies(${taskId}::uuid,${e.operation},${e.gate}),${e.evidence.id}::uuid,${e.evidence.revision}::timestamptz,${e.verdict},${JSON.stringify(detail)}::jsonb,${userId}::uuid,${requestId}::uuid,${hash})`;
  }
  await db.event.create({data:{workspaceId,taskId,type:`task_risk_admission_${kind}`,source:"roost",actorType:"user",actorId:userId,resourceType:`task_admission_${kind}`,resourceId:id,payload:{id,policy:"roost-native-risk-admission-v1"}}});
  // This internal receipt makes no admission claim. Its atomic caller must use
  // the unchanged native acceptance guard for every affected task's seal.
  if (options.compact && kind === "evidence") return { evidenceId:id, operation:admissionEvidenceSchema.parse(input).operation };
  return admissionView(db,workspaceId,taskId,userId);
}
