import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { lockReadyTask } from "./task-execution-readiness";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { reviewDigest } from "./task-review-contract";
import { compositionExceptionSchema, compositionSelectionSchema, publishContractSchema, withdrawContractSchema } from "./procedure-composition-contract";
import { admissionOperations } from "./task-risk-admission-contract";
type Db = Prisma.TransactionClient;
export async function composeProcedure(db:Db, taskId:string, operation="runtime_execute", fresh=false) {
 return (await db.$queryRaw<any[]>`SELECT task_composition(${taskId}::uuid,${operation},${!fresh}) AS value`)[0].value;
}
export async function compositionVersion(db:Db,taskId:string) {
 return reviewDigest(await Promise.all(admissionOperations.map(op=>composeProcedure(db,taskId,op,true))));
}
export async function compositionView(db:Db,workspaceId:string,taskId:string,userId:string) {
 const task=await lockReadyTask(db,workspaceId,taskId); if(!task)return {error:"task_not_found"};
 const membership=await db.workspaceMembership.findFirst({where:{workspaceId,userId}});
 const selections=await db.$queryRaw<any[]>`SELECT DISTINCT ON(operation) operation,base_procedure_id AS "baseProcedureId",extension_procedure_id AS "extensionProcedureId",rationale FROM task_composition_selections WHERE task_id=${taskId}::uuid ORDER BY operation,version DESC`;
 const operations=Object.fromEntries(await Promise.all(admissionOperations.map(async op=>[op,await composeProcedure(db,taskId,op,true)])));
 const procedures=await db.procedure.findMany({where:{workspaceId,status:"active"},select:{id:true,name:true,version:true},take:101,orderBy:{name:"asc"}});
 const independent=(await db.$queryRaw<any[]>`SELECT task_admission_independent(${taskId}::uuid,${userId}::uuid) AS value`)[0].value;
 const active=await db.agentExecution.count({where:{workspaceId,taskId,status:{in:["queued","claimed","running","waiting_for_approval"]}}});
 const result={task:{id:task.id,title:task.title},expectedVersion:await compositionVersion(db,taskId),selections,operations,procedures:procedures.slice(0,100),catalogTruncated:procedures.length>100,
  pinned:(task.executionReadiness as any)?.procedureComposition??null,permissions:{canWrite:!active&&["owner","admin","member"].includes(membership?.role??""),canApprove:!active&&independent&&membership?.role==="owner"}};
 requireRuntimeContent(result,"procedure_composition.view",{workspaceId,taskId});return result;
}
export async function compositionCommand(db:Db,workspaceId:string,taskId:string,userId:string,kind:"selection"|"exception",body:unknown) {
 const input=kind==="selection"?compositionSelectionSchema.parse(body):compositionExceptionSchema.parse(body);
 requireRuntimeContent(input,"procedure_composition.command",{workspaceId,taskId});
 if(!await lockReadyTask(db,workspaceId,taskId))return {error:"task_not_found"};
 const member=await db.workspaceMembership.findFirst({where:{workspaceId,userId}});
 if(!["owner","admin","member"].includes(member?.role??""))return {error:"procedure_composition_forbidden"};
 const table=kind==="selection"?Prisma.sql`task_composition_selections`:Prisma.sql`task_composition_exceptions`;
 const hash=reviewDigest({input,taskId,userId,kind});
 const prior=await db.$queryRaw<any[]>`SELECT request_hash FROM ${table} WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
 if(prior[0])return prior[0].request_hash===hash?{...await compositionView(db,workspaceId,taskId,userId),replayed:true}:{error:"procedure_composition_request_conflict"};
 if(await compositionVersion(db,taskId)!==input.expectedVersion)return {error:"procedure_composition_stale"};
 const id=randomUUID();
 if(kind==="selection") {
  const s=compositionSelectionSchema.parse(input);
  await db.$executeRaw`INSERT INTO task_composition_selections(id,workspace_id,task_id,operation,version,scope_id,base_procedure_id,extension_procedure_id,rationale,actor_user_id,request_id,request_hash)
   VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,${s.operation},(SELECT COALESCE(max(version),0)+1 FROM task_composition_selections WHERE task_id=${taskId}::uuid AND operation=${s.operation}),
   (SELECT id FROM task_admission_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1),${s.baseProcedureId}::uuid,${s.extensionProcedureId}::uuid,${s.rationale},${userId}::uuid,${s.requestId}::uuid,${hash})`;
 } else {
  const e=compositionExceptionSchema.parse(input);
  await db.$executeRaw`INSERT INTO task_composition_exceptions(id,workspace_id,task_id,operation,version,selection_id,missing,anchor,rationale,actor_user_id,request_id,request_hash)
   VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,${e.operation},(SELECT COALESCE(max(version),0)+1 FROM task_composition_exceptions WHERE task_id=${taskId}::uuid AND operation=${e.operation} AND missing=${e.missing}),
   (SELECT id FROM task_composition_selections WHERE task_id=${taskId}::uuid AND operation=${e.operation} ORDER BY version DESC LIMIT 1),${e.missing},task_composition(${taskId}::uuid,${e.operation},false,false)->>'anchor',${e.rationale},${userId}::uuid,${e.requestId}::uuid,${hash})`;
 }
 await db.event.create({data:{workspaceId,taskId,type:`task_composition_${kind}`,source:"roost",actorType:"user",actorId:userId,resourceType:"task_composition",resourceId:id,payload:{id,operation:input.operation}}});
 return compositionView(db,workspaceId,taskId,userId);
}
export async function procedureContractsView(db:Db,workspaceId:string,procedureId:string,userId:string) {
 const p=await db.procedure.findFirst({where:{id:procedureId,workspaceId},select:{id:true,name:true,version:true,status:true}}); if(!p)return {error:"procedure_not_found"};
 const versions=await db.$queryRaw<any[]>`SELECT v.id,v.version,v.body,v.rationale,v.source_version AS "sourceVersion",v.actor_user_id AS "issuerId",v.created_at AS "createdAt",procedure_contract_valid(v) AS valid FROM procedure_contract_versions v WHERE procedure_id=${procedureId}::uuid ORDER BY version DESC LIMIT 51`;
 const source=(await db.$queryRaw<any[]>`SELECT procedure_contract_source(${procedureId}::uuid) AS value`)[0].value;
 const membership=await db.workspaceMembership.findFirst({where:{workspaceId,userId}});
 const expectedVersion=reviewDigest({source,versions});
 const [applications,procedures]=await Promise.all([
  db.application.findMany({where:{workspaceId},select:{id:true,name:true,architecture:{where:{status:"active"},select:{id:true,name:true}}},take:100,orderBy:{name:"asc"}}),
  db.procedure.findMany({where:{workspaceId,status:"active",id:{not:procedureId}},select:{id:true,name:true},take:100,orderBy:{name:"asc"}})
 ]);
 const result={procedure:p,expectedVersion,versions:versions.slice(0,50),historyTruncated:versions.length>50,applications,procedures,permissions:{canPublish:membership?.role==="owner"&&p.status==="active",canWithdraw:membership?.role==="owner"}};
 requireRuntimeContent(result,"procedure_contract.view",{workspaceId});return result;
}
export async function procedureContractCommand(db:Db,workspaceId:string,procedureId:string,userId:string,kind:"publish"|"withdraw",body:unknown) {
 const input=kind==="publish"?publishContractSchema.parse(body):withdrawContractSchema.parse(body);
 requireRuntimeContent(input,"procedure_contract.command",{workspaceId});
 await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
 const view=await procedureContractsView(db,workspaceId,procedureId,userId);if("error" in view)return view;
 if(!view.permissions.canWithdraw)return {error:"procedure_composition_forbidden"};
 const table=kind==="publish"?Prisma.sql`procedure_contract_versions`:Prisma.sql`procedure_contract_withdrawals`;
 const hash=reviewDigest({input,procedureId,userId,kind});
 const prior=await db.$queryRaw<any[]>`SELECT request_hash FROM ${table} WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
 if(prior[0])return prior[0].request_hash===hash?{...view,replayed:true}:{error:"procedure_composition_request_conflict"};
 if(input.expectedVersion!==view.expectedVersion)return {error:"procedure_composition_stale"};
 const id=randomUUID();
 if(kind==="publish") {
  const p=publishContractSchema.parse(input);
  await db.$executeRaw`INSERT INTO procedure_contract_versions(id,workspace_id,procedure_id,version,source_version,body,rationale,actor_user_id,request_id,request_hash)
   VALUES(${id}::uuid,${workspaceId}::uuid,${procedureId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM procedure_contract_versions WHERE procedure_id=${procedureId}::uuid),procedure_contract_source(${procedureId}::uuid),${JSON.stringify(p.contract)}::jsonb,${p.rationale},${userId}::uuid,${p.requestId}::uuid,${hash})`;
 } else {
  const w=withdrawContractSchema.parse(input);
  if(!await db.$queryRaw<any[]>`SELECT id FROM procedure_contract_versions WHERE id=${w.versionId}::uuid AND procedure_id=${procedureId}::uuid`.then(x=>x.length))return {error:"procedure_composition_version_not_found"};
  await db.$executeRaw`INSERT INTO procedure_contract_withdrawals(id,workspace_id,version_id,rationale,actor_user_id,request_id,request_hash) VALUES(${id}::uuid,${workspaceId}::uuid,${w.versionId}::uuid,${w.rationale},${userId}::uuid,${w.requestId}::uuid,${hash})`;
 }
 await db.event.create({data:{workspaceId,type:`procedure_contract_${kind}`,source:"roost",actorType:"user",actorId:userId,resourceType:"procedure_contract",resourceId:id,payload:{id,procedureId}}});
 return procedureContractsView(db,workspaceId,procedureId,userId);
}
