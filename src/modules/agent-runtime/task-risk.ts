import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { lockReadyTask } from "./task-execution-readiness";
import { watchReadySources } from "./ready-source-watch";
import { loadTaskAgentContext } from "../company-intelligence/task-agent-context";
import { loadApplicationAgentContext } from "../product-engineering/application-agent-context";
import { reviewDigest } from "./task-review-contract";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { computeRisk, riskAlgorithm, riskAssessmentSchema, riskScopeSchema } from "./task-risk-contract";
type Db = Prisma.TransactionClient;
const object = (v: any): any => v && typeof v === "object" && !Array.isArray(v) ? v : {};
export const riskInputHash = (input: any) => reviewDigest({ applicationId: input.applicationId, contract: input.contract, prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null });
async function canAssess(db: Db, workspaceId: string, userId?: string) {
  return Boolean(userId && await db.workspaceMembership.findFirst({ where: { workspaceId, userId, role: { in: ["owner", "admin", "member"] } } }));
}
async function sourceState(db: Db, taskId: string) {
  const state=(await db.$queryRaw<any[]>`SELECT task_risk_sources(${taskId}::uuid) AS sources,task_risk_version(${taskId}::uuid) AS "sourceVersion",task_risk_current(${taskId}::uuid) AS current,
    (SELECT id FROM task_risk_assessments WHERE sources @> ${JSON.stringify([{taskId}])}::jsonb ORDER BY sequence DESC LIMIT 1) AS head`)[0]!;
  return {...state,version:reviewDigest({sourceVersion:state.sourceVersion,head:state.head})};
}
export async function riskContextVersion(db: Db, taskId: string) { return (await sourceState(db,taskId)).version; }
export async function riskAdmission(db: Db, taskId: string, input?: any) {
  const s = await sourceState(db, taskId);
  if (!s.current) return { error: "task_risk_assessment_required" };
  if (input) {
    const rows = await db.$queryRaw<any[]>`SELECT input_hash FROM task_risk_scopes WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`;
    if (rows[0]?.input_hash !== riskInputHash(input)) return { error: "task_risk_scope_stale" };
  }
  return { id: s.current as string };
}
export async function taskRiskView(db: Db, workspaceId: string, taskId: string, userId?: string) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" };
  const state = await sourceState(db, taskId), ids = state.sources.map((s: any) => s.taskId);
  const members = await db.$queryRaw<any[]>`SELECT t.id,t.title,t.goal_id AS "goalId",s.id AS "scopeId",s.input,s.application_id AS "applicationId",s.component_id AS "componentId",s.release_set_id AS "releaseSetId",s.version
    FROM tasks t LEFT JOIN LATERAL(SELECT * FROM task_risk_scopes WHERE task_id=t.id ORDER BY version DESC LIMIT 1)s ON true
    WHERE t.workspace_id=${workspaceId}::uuid AND t.id IN (${Prisma.join(ids.map((id: string) => Prisma.sql`${id}::uuid`))}) ORDER BY t.id`;
  const history = await db.$queryRaw<any[]>`SELECT id,task_id AS "taskId",version,source_version AS "sourceVersion",entries,result,joint_rationale AS "jointRationale",actor_user_id AS "assessorId",created_at AS "createdAt"
    FROM task_risk_assessments WHERE workspace_id=${workspaceId}::uuid AND sources @> ${JSON.stringify([{taskId}])}::jsonb ORDER BY sequence DESC LIMIT 21`;
  const records = await db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ applicationId: null }, { applicationId: { in: members.map((m: any) => m.applicationId).filter(Boolean) } }] }, select: { id: true, title: true, updatedAt: true, applicationId: true }, take: 501, orderBy: { id: "asc" } });
  const blockers = [...(members.length > 50 ? ["group_limit"] : []), ...(members.some(m => !m.scopeId) ? ["scope_missing"] : []), ...(!state.current ? ["assessment_missing_or_stale"] : [])];
  return { task: { id: taskId, title: task.title }, algorithm: riskAlgorithm, expectedVersion: state.version, currentId: state.current,
    canAssess: await canAssess(db, workspaceId, userId), blockers, members: members.map(m => ({ ...m, input: undefined,
      relatedBy: [...new Set(members.filter(other=>other.id!==m.id).flatMap(other=>[
        ...(m.applicationId&&m.applicationId===other.applicationId&&m.componentId&&m.componentId===other.componentId?["component"]:[]),
        ...(m.applicationId&&m.applicationId===other.applicationId&&m.goalId&&m.goalId===other.goalId?["objective"]:[]),
        ...(m.applicationId&&m.applicationId===other.applicationId&&m.releaseSetId&&m.releaseSetId===other.releaseSetId?["release_set"]:[]),
        ...(state.sources.find((s:any)=>s.taskId===m.id)?.lineage.some((id:string)=>state.sources.find((s:any)=>s.taskId===other.id)?.lineage.includes(id))?["lineage"]:[])]))],
      objective: object(object(m.input).contract).objective?.outcome ?? null, scope: m.id === taskId ? m.input : undefined })),
    history: history.slice(0,20), historyTruncated: history.length > 20, evidence: records.slice(0,500).map(r => ({ id: r.id, label: r.title, revision: r.updatedAt.toISOString(), applicationId: r.applicationId })), evidenceTruncated: records.length > 500 };
}
export async function prepareRiskScope(db: Db, workspaceId: string, taskId: string, userId: string, body: unknown) {
  const input = riskScopeSchema.parse(body);
  requireRuntimeContent(input, "task_risk.scope", { workspaceId, taskId });
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" };
  if (!await canAssess(db, workspaceId, userId)) return { error: "task_risk_forbidden" };
  const hash = reviewDigest({ input, taskId, userId });
  const prior = await db.$queryRaw<any[]>`SELECT id,request_hash FROM task_risk_scopes WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if (prior[0]) return prior[0].request_hash === hash ? { ...await taskRiskView(db,workspaceId,taskId,userId), replayed:true } : { error:"task_risk_request_conflict" };
  if ((await sourceState(db,taskId)).version !== input.expectedVersion) return { error:"task_risk_stale" };
  const c = object(input.contract), componentId = object(object(c.singleTask).component).id;
  if (!/^[a-f0-9-]{36}$/i.test(componentId ?? "") || object(c.objective).goalId !== task.goalId || object(c.singleTask).applicationId !== input.applicationId) return { error:"task_risk_scope_invalid" };
  const component = await db.applicationArchitectureComponent.findFirst({ where: { id: componentId, applicationId: input.applicationId, status: "active" } });
  if (!component || component.updatedAt.toISOString() !== object(c.singleTask).component.revision) return { error:"task_risk_scope_invalid" };
  if (input.releaseSet && !await db.companyRecord.findFirst({ where: { id: input.releaseSet.id, workspaceId, applicationId: input.applicationId, status: { not:"archived" }, updatedAt:new Date(input.releaseSet.revision) } })) return { error:"task_risk_evidence_stale" };
  const watched = watchReadySources(db);
  const envelope = { id:taskId, taskId, workspaceId, applicationId:input.applicationId, attempt:1, metadata:{executionContract:input.contract}, prompt:input.prompt??null, baseBranch:input.baseBranch??null } as any;
  const context = await loadTaskAgentContext(workspaceId,taskId,envelope,watched.db,{authorId:userId,requestId:input.requestId});
  const application = await loadApplicationAgentContext(workspaceId,input.applicationId,true,task.title,watched.db);
  requireRuntimeContent({context,application},"task_risk.context",{workspaceId,taskId});
  await db.$executeRaw`INSERT INTO task_risk_heads(task_id) VALUES(${taskId}::uuid) ON CONFLICT DO NOTHING`;
  await watched.persist(taskId,true);
  const stored = { applicationId:input.applicationId, contract:input.contract,prompt:input.prompt??null,baseBranch:input.baseBranch??null,releaseSet:input.releaseSet };
  await db.$executeRaw`INSERT INTO task_risk_scopes(id,workspace_id,task_id,version,application_id,component_id,release_set_id,input,input_hash,actor_user_id,request_id,request_hash)
    VALUES(${randomUUID()}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_risk_scopes WHERE task_id=${taskId}::uuid),${input.applicationId}::uuid,${componentId}::uuid,${input.releaseSet?.id??null}::uuid,${JSON.stringify(stored)}::jsonb,${riskInputHash(input)},${userId}::uuid,${input.requestId}::uuid,${hash})`;
  await audit(db,workspaceId,taskId,userId,"scope_prepared",input.requestId);
  return taskRiskView(db,workspaceId,taskId,userId);
}
export async function recordRiskAssessment(db: Db, workspaceId: string, taskId: string, userId: string, body: unknown) {
  const input = riskAssessmentSchema.parse(body);
  requireRuntimeContent(input,"task_risk.assessment",{workspaceId,taskId});
  const task = await lockReadyTask(db,workspaceId,taskId);
  if (!task) return {error:"task_not_found"};
  if (!await canAssess(db,workspaceId,userId)) return {error:"task_risk_forbidden"};
  const hash=reviewDigest({input,taskId,userId}), prior=await db.$queryRaw<any[]>`SELECT id,request_hash FROM task_risk_assessments WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`;
  if (prior[0]) return prior[0].request_hash===hash ? {...await taskRiskView(db,workspaceId,taskId,userId),replayed:true} : {error:"task_risk_request_conflict"};
  const state=await sourceState(db,taskId);
  if (state.version!==input.expectedVersion) return {error:"task_risk_stale"};
  if (state.sources.length>50 || state.sources.some((s:any)=>!s.scopeId) || input.entries.length!==state.sources.length || new Set(input.entries.map(e=>e.taskId)).size!==input.entries.length || input.entries.some(e=>!state.sources.some((s:any)=>s.taskId===e.taskId))) return {error:"task_risk_group_incomplete"};
  for (const entry of input.entries) {
    const source=state.sources.find((s:any)=>s.taskId===entry.taskId);
    const references=[...new Map([...Object.values(entry.dimensions).flatMap(d=>d.evidence),...entry.uncertainty.evidence].map(r=>[`${r.id}:${r.revision}`,r])).values()];
    for (const ref of references) {
      const record=await db.companyRecord.findFirst({where:{id:ref.id,workspaceId,status:{not:"archived"},OR:[{applicationId:null},{applicationId:source.applicationId}]},select:{updatedAt:true,description:true,businessPurpose:true,desiredState:true,expectedBehavior:true}});
      if (!record || record.updatedAt.toISOString()!==ref.revision) return {error:"task_risk_evidence_stale"};
      if (![record.description,record.businessPurpose,record.desiredState,record.expectedBehavior].some(s=>s?.trim())) return {error:"task_risk_evidence_unverifiable"};
      requireRuntimeContent(record,"task_risk.evidence",{workspaceId,taskId:entry.taskId,recordId:ref.id});
    }
    const predicate=JSON.stringify({op:"in",column:"id",values:references.map(r=>r.id)});
    await db.$executeRaw`INSERT INTO task_risk_source_watches(task_id,source_table,predicate) VALUES(${entry.taskId}::uuid,'risk_evidence',${predicate}::jsonb)
      ON CONFLICT(task_id,source_table) DO UPDATE SET predicate=EXCLUDED.predicate`;
  }
  const result=computeRisk(input.entries), id=randomUUID();
  await db.$executeRaw`INSERT INTO task_risk_assessments(id,workspace_id,task_id,version,source_version,sources,entries,result,joint_rationale,algorithm,actor_user_id,request_id,request_hash)
    VALUES(${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,(SELECT COALESCE(max(version),0)+1 FROM task_risk_assessments WHERE task_id=${taskId}::uuid),${state.sourceVersion},${JSON.stringify(state.sources)}::jsonb,${JSON.stringify(input.entries)}::jsonb,${JSON.stringify(result)}::jsonb,${input.jointRationale},${riskAlgorithm},${userId}::uuid,${input.requestId}::uuid,${hash})`;
  await audit(db,workspaceId,taskId,userId,"assessed",id);
  return taskRiskView(db,workspaceId,taskId,userId);
}
async function audit(db: Db, workspaceId: string, taskId: string, userId: string, action: string, id: string) {
  await db.event.create({data:{workspaceId,taskId,type:`task_execution_risk_${action}`,source:"roost",actorType:"user",actorId:userId,resourceType:"task_risk_assessment",resourceId:id,payload:{algorithm:riskAlgorithm,action,id}}});
}
