import { createHash, randomUUID } from "node:crypto";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, type AgentExecution } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { loadTaskAgentContext } from "../company-intelligence/task-agent-context";
import { loadApplicationAgentContext } from "../product-engineering/application-agent-context";
import { watchReadySources } from "./ready-source-watch";
import { reviewAdmissionError } from "./task-review-admission";
import { suspensionBlocks } from "./capability-suspension";
import { riskAdmission, riskContextVersion } from "./task-risk";
import { admissionVersion, riskLevelAdmission } from "./task-risk-admission";
import { composeProcedure, compositionVersion } from "./procedure-composition";
import { admissionOperations } from "./task-risk-admission-contract";

const { readyContextRevision, readyContextQuery } = require("../../../scripts/lib/agent-host-ready-context.cjs") as {
  readyContextRevision: (task: any, application: any, input: any) => string;
  readyContextQuery: (task: any, prompt: unknown) => string;
};
// Preserve native ESM loading in this CommonJS build. The specifier is a fixed
// repository module, never request data; the host and API use one validator.
const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ validateExecutionPacket: (...args: any[]) => unknown; executionContractSchema: { shape: any; safeParse: (value: unknown) => { success: boolean; data?: any } }; executionEditorContractSchema: { safeParse: (value: unknown) => { success: boolean; data?: any } } }>;
const validation = loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-execution-packet.mjs")).href);
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(wire(value)))).digest("hex");

export async function submissionVersion(db: Prisma.TransactionClient, workspaceId: string, taskId: string, applicationId?: string | null, loaded?: any) {
  const context = loaded ?? await loadTaskAgentContext(workspaceId, taskId, null, db);
  if (!context) return null;
  const application = applicationId ? await loadApplicationAgentContext(workspaceId, applicationId, true, readyContextQuery(context.task, null), db) : {};
  const revision = readyContextRevision({ ...wire(context), executionPacket: { contract: null, sources: [] } }, wire(application ?? {}), {});
  return digest({ revision, applicationId: applicationId ?? null, updatedAt: context.task.updatedAt, readiness: context.task.executionReadiness, riskVersion:await riskContextVersion(db,taskId), admissionVersion:await admissionVersion(db,taskId),compositionVersion:await compositionVersion(db,taskId) });
}
export async function readyTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | { error: string }> {
  try { return await prisma.$transaction(work, { isolationLevel: "Serializable", maxWait: 5000, timeout: 20000 }); }
  catch (error) {
    const nativeDiagnostic = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010" ? String(error.meta?.message ?? "") : error instanceof Prisma.PrismaClientUnknownRequestError ? error.message : "";
    const suspensionError = nativeDiagnostic.match(/\bnative_(?:suspension_[a-z_]+|capability_suspended)\b/)?.[0];
    if (suspensionError) return {error:suspensionError};
    const riskError = nativeDiagnostic.match(/\btask_risk_[a-z_]+\b/)?.[0];
    if (riskError) return {error:riskError};
    const admissionError = nativeDiagnostic.match(/\brisk_admission_[a-z_]+\b/)?.[0];
    if (admissionError) return {error:admissionError};
    const interviewError=nativeDiagnostic.match(/\binterview_(?:history_immutable|scope_invalid|content_invalid|forbidden|grant_required|revision_invalid|evidence_invalid|stale|transition_invalid|proposal_required|ready_required|decision_immutable|receipt_required)\b/)?.[0];if(interviewError)return {error:interviewError};
    const compositionError=nativeDiagnostic.match(/\bprocedure_composition_[a-z_]+\b/)?.[0];
    if(compositionError)return {error:compositionError};
    if (error instanceof Prisma.PrismaClientKnownRequestError && (["P2034", "P2028"].includes(error.code) ||
      error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)))) return { error: "task_ready_context_conflict" };
    throw error;
  }
}

export async function lockReadyTask(db: Prisma.TransactionClient, workspaceId: string, taskId: string) {
  const locked = await db.$executeRaw`UPDATE ready_source_fence SET revision = revision + 1 WHERE id = 1`;
  if (locked !== 1) throw new Error("ready_source_fence_missing");
  await db.$queryRaw`SELECT id FROM tasks WHERE id = ${taskId}::uuid AND workspace_id = ${workspaceId}::uuid FOR UPDATE`;
  return db.task.findFirst({ where: { id: taskId, workspaceId } });
}

async function resolved(db: Prisma.TransactionClient, workspaceId: string, taskId: string, input: Record<string, any>, execution?: AgentExecution, submission?: import("./task-role-context").RoleSubmission) {
  const composition=await composeProcedure(db,taskId,"runtime_execute",!!submission);
  const watched = watchReadySources(db);
  db = watched.db;
  const application = await db.application.findFirst({ where: { id: input.applicationId, workspaceId, slug: { not: "roost" } }, include: { repositories: true } });
  if (!application) throw new Error("application_not_found");
  // A validation envelope has no execution record and cannot claim or run work.
  const envelope = execution ?? { id: taskId, taskId, workspaceId, applicationId: application.id, attempt: 1, metadata: { executionContract: input.contract }, prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null } as unknown as AgentExecution;
  const taskContext = wire(await loadTaskAgentContext(workspaceId, taskId, envelope, db, submission));
  if (!taskContext) throw new Error("task_not_found");
  taskContext.executionPacket.procedureComposition=composition;
  const {revision:_packetRevision,...packetBody}=taskContext.executionPacket;
  taskContext.executionPacket.revision=createHash("sha256").update(JSON.stringify(packetBody)).digest("hex");
  const applicationContext = wire(await loadApplicationAgentContext(workspaceId, application.id, true, readyContextQuery(taskContext.task, input.prompt), db));
  requireRuntimeContent({ input, taskContext, applicationContext }, "model.ready_context", { workspaceId, taskId, executionId: execution?.id });
  const claimed = { ...envelope, attempt: Math.max(1, envelope.attempt), application };
  (await validation).validateExecutionPacket(taskContext.executionPacket, claimed, taskContext, applicationContext, {allowUncomposed:!!submission});
  return { taskContext, applicationContext, watched, revision: readyContextRevision(taskContext, applicationContext, execution ?? input) };
}

export async function submitReady(db: Prisma.TransactionClient, workspaceId: string, taskId: string, input: Record<string, any>, actor: { requestedByType: string; requestedById: string | null }) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" };
  if (actor.requestedByType !== "user" || !actor.requestedById || !await db.workspaceMembership.findFirst({ where: { workspaceId, userId: actor.requestedById, role: { in: ["owner", "admin", "member"] } } })) return { error: "forbidden" };
  if (await suspensionBlocks(db,workspaceId,taskId,input.applicationId,"runtime_execute",task.assignedWorkforceEntityId)) return {error:"native_capability_suspended"};
  const reviewError = await reviewAdmissionError(db, workspaceId, taskId, input.contract);
  if (reviewError) return { error: reviewError };
  if (!/^[a-f0-9]{64}$/.test(input.expectedVersion ?? "") || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.requestId ?? "")) return { error: "task_submission_precondition_required" };
  const requestHash = digest({ ...input, ...actor });
  const receipts = await db.$queryRaw<Array<{ request_hash: string; result: any }>>`SELECT request_hash, result FROM task_execution_submissions WHERE task_id = ${taskId}::uuid AND request_id = ${input.requestId}::uuid`;
  if (receipts[0]) {
    if (receipts[0].request_hash !== requestHash) return { error: "task_submission_key_conflict" };
    if (receipts[0].result.readiness?.status === "ready") {
      const current = await inspectReady(db, workspaceId, taskId);
      if (current.readiness.status !== "ready" || object(current.readiness).pinId !== receipts[0].result.readiness.pinId) return { error: "task_submission_superseded", readiness: current.readiness };
    }
    return receipts[0].result;
  }
  if (await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } })) return { error: "task_agent_execution_active" };
  if (input.expectedVersion !== await submissionVersion(db, workspaceId, taskId, input.applicationId)) return { error: "task_submission_version_conflict" };
  async function receipt(result: any, pin?: any) {
    const encodedPin = pin ? JSON.stringify(pin) : null, encodedResult = JSON.stringify(result);
    await db.$executeRaw`INSERT INTO task_execution_submissions (task_id, request_id, actor_id, request_hash, pin_digest, result)
      VALUES (${taskId}::uuid, ${input.requestId}::uuid, ${actor.requestedById}::uuid, ${requestHash},
        CASE WHEN ${encodedPin}::text IS NULL THEN NULL ELSE encode(sha256(convert_to((${encodedPin}::jsonb)::text, 'UTF8')), 'hex') END, ${encodedResult}::jsonb)`;
    return result;
  }
  let context;
  try { context = await resolved(db, workspaceId, taskId, input, undefined, { authorId: actor.requestedById, requestId: input.requestId }); }
  catch (error) {
    if (error instanceof Error && error.message === "agent_runtime_content_blocked") throw error;
    const issues = object(error).details?.issues ?? [];
    const status = issues.length > 0 && issues.every((issue: any) => /^(contract|taskContext)\.decisions(\.|$)/.test(issue.field)) ? "needs_decision" : "needs_context";
    const previous = object(task.executionReadiness);
    await db.task.update({ where: { id: taskId }, data: { executionReadiness: { ...previous, status, reason: "submission_incomplete", issues } } });
    const result = { error: "task_execution_contract_invalid", issues, readiness: { status, reason: "submission_incomplete", issues } };
    await receipt(result);
    await db.event.create({ data: { workspaceId, taskId, type: "task_execution_submission_rejected", source: "roost", resourceType: "task", resourceId: taskId, payload: { requestId: input.requestId, status, issues, ...actor } } });
    return result;
  }
  await context.watched.persist(taskId);
  const risk = await riskAdmission(db, taskId, input);
  if ("error" in risk) {
    const readiness = {status:"needs_context",reason:risk.error};
    await db.task.update({where:{id:taskId},data:{executionReadiness:{...object(task.executionReadiness),...readiness}}});
    return receipt({error:risk.error,readiness});
  }
  const admission = await riskLevelAdmission(db,taskId);
  const composition=await composeProcedure(db,taskId,"runtime_execute",true);
  if(!composition.seal || (task.executionReadiness as any)?.status==="ready" && (task.executionReadiness as any)?.procedureComposition?.seal && (task.executionReadiness as any).procedureComposition.seal!==composition.seal) {
    const readiness={status:"needs_context",reason:"procedure_composition_required",issues:[...composition.missing,...composition.conflicts].map((code:string)=>({field:"procedureComposition",code}))};
    await db.task.update({where:{id:taskId},data:{executionReadiness:{...object(task.executionReadiness),...readiness}}});
    return receipt({error:"procedure_composition_required",readiness});
  }
  if (admission.error) {
    const readiness={status:"needs_decision",reason:admission.error};
    await db.task.update({where:{id:taskId},data:{executionReadiness:{...object(task.executionReadiness),...readiness}}});
    return receipt({error:admission.error,readiness});
  }
  const procedureCompositionSet=Object.fromEntries(await Promise.all(admissionOperations.map(async op=>[op,await composeProcedure(db,taskId,op,true)])));
  const interviewVersion=(await db.$queryRaw<any[]>`SELECT task_interview_version(${taskId}::uuid) AS value`)[0].value;
  const pin = { interviewVersion, schemaVersion: "roost-ready-context-v1", sourceWatchVersion: "1", submissionId: input.requestId, status: "ready", pinId: randomUUID(), revision: context.revision,
    riskAssessmentId: risk.id,
    riskAdmissionSeal: admission.seal, riskAdmissionCommit: admission.commit,
    procedureComposition: composition, procedureCompositionSet,
    applicationId: input.applicationId, contract: input.contract, roleProvenance: context.taskContext.executionPacket.roleAuthorities.provenance, prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null,
    validatedAt: new Date().toISOString(), validation: { validator: "execution-packet-v1", revision: context.revision }, ...actor };
  const result = { readiness: { status: "ready", pinId: pin.pinId, revision: pin.revision, validationRevision: pin.validation.revision } };
  await receipt(result, pin);
  await db.task.update({ where: { id: task.id }, data: { executionReadiness: pin, executionRoleProvenance: pin.roleProvenance } });
  await db.event.create({ data: { workspaceId, taskId, type: "task_execution_ready", source: "roost", resourceType: "task", resourceId: taskId,
    payload: { pinId: pin.pinId, revision: pin.revision, validation: pin.validation, validatedAt: pin.validatedAt, singleTask: input.contract.singleTask, taskRoles: input.contract.taskRoles, roleProvenance: pin.roleProvenance, outcome: input.contract.objective.outcome, ...actor } } });
  return result;
}

export async function inspectReady(db: Prisma.TransactionClient, workspaceId: string, taskId: string, execution?: AgentExecution) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found", readiness: { status: "not_ready" } };
  const pin = object(task.executionReadiness);
  const interview=(await db.$queryRaw<any[]>`SELECT task_interview_pending(${taskId}::uuid) AS pending,task_interview_version(${taskId}::uuid) AS version,EXISTS(SELECT 1 FROM task_interview_cases c WHERE c.body->'dependencies' @> jsonb_build_array(jsonb_build_object('taskId',${taskId}::text))) AS present`)[0];
  if(interview.pending||interview.present&&pin.interviewVersion!==interview.version)return {error:"interview_ready_required",readiness:{status:interview.pending?"needs_decision":"needs_revalidation",reason:"material_unknown",interviewVersion:interview.version}};
  if (execution?.contextInvalidatedAt) return {error:"agent_execution_context_invalidated",readiness:{status:"needs_revalidation",reason:"context_changed"}};
  if (pin.applicationId && await suspensionBlocks(db,workspaceId,taskId,pin.applicationId,"runtime_execute",task.assignedWorkforceEntityId,null,execution?.agentHostId)) return {error:"native_capability_suspended",readiness:{status:"needs_decision",reason:"native_capability_suspended"}};
  const reviewError = await reviewAdmissionError(db, workspaceId, taskId, pin.contract);
  if (reviewError) return { error: reviewError, readiness: { status: "needs_decision", reason: reviewError } };
  if (["draft", "needs_context", "needs_decision"].includes(pin.status)) return { error: "task_ready_pin_required", readiness: { status: pin.status, reason: pin.reason ?? "ready_pin_required", issues: pin.issues ?? [] } };
  const proof = { pinId: pin.pinId, revision: pin.revision, validationRevision: pin.validation?.revision };
  if (pin.schemaVersion !== "roost-ready-context-v1" || !pin.pinId || !/^[a-f0-9]{64}$/.test(pin.revision) || pin.validation?.validator !== "execution-packet-v1" || pin.validation?.revision !== pin.revision) {
    return { error: "task_ready_pin_required", readiness: { status: "not_ready", reason: "ready_pin_required" } };
  }
  let reason = pin.status !== "ready" ? (["context_changed", "context_invalid", "source_watch_required", "submission_required", "single_task_scope_required", "task_roles_required", "risk_context_changed", "risk_admission_changed", "procedure_composition_changed"].includes(pin.reason) ? pin.reason : "revalidation_required") : !pin.submissionId ? "submission_required" : pin.sourceWatchVersion !== "1" ? "source_watch_required" : null;
  let context;
  if (!reason) {
    const risk = await riskAdmission(db,taskId,pin);
    if ("error" in risk || risk.id !== pin.riskAssessmentId) reason = "risk_context_changed";
  }
  const admission = await riskLevelAdmission(db,taskId);
  const composition=await composeProcedure(db,taskId);
  if(!reason && (!composition.seal || composition.seal!==pin.procedureComposition?.seal))reason="procedure_composition_changed";
  if (!reason && (admission.error || admission.seal !== pin.riskAdmissionSeal)) reason = "risk_admission_changed";
  if (!reason) {
    try {
      context = await resolved(db, workspaceId, taskId, pin, execution);
      if (context.revision !== pin.revision) reason = "context_changed";
    } catch { reason = "context_invalid"; }
  }
  if (!reason && execution) {
    const bound = object(object(execution.metadata).readyContextPin);
    if (bound.pinId !== pin.pinId || bound.revision !== pin.revision || execution.applicationId !== pin.applicationId) reason = "execution_pin_mismatch";
  }
  if (reason) {
    if (pin.status === "ready" && reason !== "execution_pin_mismatch") {
      await db.task.update({ where: { id: taskId }, data: { executionReadiness: { ...pin, status: "needs_revalidation", reason, invalidatedAt: new Date().toISOString() } } });
      await db.event.create({ data: { workspaceId, taskId, type: "task_execution_ready_invalidated", source: "roost", resourceType: "task", resourceId: taskId, payload: { ...proof, reason } } });
    }
    return { error: "task_ready_revalidation_required", readiness: { status: "needs_revalidation", reason, changedSources: pin.changedSources ?? [], ...proof } };
  }
  const readiness = { status: "ready", ...proof, compositionSeal:composition.seal, riskAdmission: {policy:admission.policy,seal:admission.seal,commit:admission.commit,expiresAt:admission.expiresAt} };
  return { readiness, pin, taskContext: { ...context!.taskContext, readyAdmission: readiness }, applicationContext: context!.applicationContext };
}

// Human editor projection: labels and revision references, never resolved source
// bodies, agent metadata, credentials or client-authorable acceptance evidence.
export async function readyEditorData(db: Prisma.TransactionClient, workspaceId: string, taskId: string, applicationId?: string, userId?: string) {
  const context = await loadTaskAgentContext(workspaceId, taskId, null, db);
  if (!context) return null;
  const task = context.task, pin = object(task.executionReadiness);
  const applications = await db.application.findMany({ where: { workspaceId, slug: { not: "roost" }, projects: { some: { projectId: task.projectId ?? "00000000-0000-0000-0000-000000000000" } } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const selected = applicationId ?? (applications.some(app => app.id === pin.applicationId) ? pin.applicationId : applications.length === 1 ? applications[0]!.id : null);
  if (selected && !applications.some(app => app.id === selected)) return { error: "application_not_found" };
  const records = await db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ applicationId: null }, ...(selected ? [{ applicationId: selected }] : [])] }, select: { id: true, title: true, applicationId: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 501 });
  const accepted = (await validation).executionEditorContractSchema.safeParse(pin.contract);
  const modelSchema = (await validation).executionContractSchema.shape.modelSelection;
  const modelShape = modelSchema.innerType().shape;
  const author = pin.requestedByType === "user" && typeof pin.requestedById === "string" ? await db.workspaceMembership.findFirst({ where: { workspaceId, userId: pin.requestedById }, select: { user: { select: { name: true } } } }) : null;
  const active = await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } });
  const [projects, goals, agents, managers, components, members, roleWorkers] = await Promise.all([
    db.project.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    db.goal.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 500 }),
    db.workforceEntity.findMany({ where: { workspaceId, status: "active", type: "agent" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    db.workforceEntity.findMany({ where: { workspaceId, status: "active" }, select: { id: true, name: true, updatedAt: true }, orderBy: { name: "asc" }, take: 500 }),
    db.applicationArchitectureComponent.findMany({ where: { applicationId: selected ?? "00000000-0000-0000-0000-000000000000", application: { workspaceId }, status: "active" }, select: { id: true, name: true, updatedAt: true }, orderBy: { name: "asc" }, take: 500 }),
    db.workspaceMembership.findMany({ where: { workspaceId }, select: { userId: true, role: true, updatedAt: true, user: { select: { name: true } } } }),
    db.workforceEntity.findMany({ where: { workspaceId, status: "active" }, select: { id: true, name: true, type: true, role: true, source: true, externalId: true, authorityScope: true, skillIndex: true, updatedAt: true }, orderBy: { name: "asc" }, take: 501 })
  ]);
  const agent = task.assignedWorkforceEntity;
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  const provenance = object(task.executionRoleProvenance), requesterId = provenance.requesterUserId ?? userId;
  const requester = members.find(item => item.userId === requesterId);
  const roleCatalog = roleWorkers.slice(0, 500).map(item => {
    const membership = item.type === "human" && item.source === "user" ? members.find(m => m.userId === item.externalId) : null;
    return { id: item.id, label: item.name, revision: item.updatedAt.toISOString(), type: item.type, role: item.role, competencies: strings(item.skillIndex),
      mandates: strings(item.authorityScope).filter(value => ["task_accountability", "task_verification", "release_authorization"].includes(value)),
      principalKey: item.type === "agent" && item.source !== "user" ? `agent:${item.id}` : membership ? `user:${membership.userId}` : null,
      eligible: Boolean(item.role?.trim() && (item.type === "agent" && item.source !== "user" || membership && ["owner", "admin", "member"].includes(membership.role))) };
  });
  return {
    roleCatalog, roleCatalogTruncated: roleWorkers.length > 500,
    requester: requester ? { id: requester.userId, label: requester.user.name ?? "—", revision: requester.updatedAt.toISOString() } : null,
    roleOrigin: { established: Boolean(provenance.requesterUserId), submissionId: provenance.originatingSubmissionId ?? null },
    excludedRolePrincipals: [...new Set([...(Array.isArray(provenance.authors) ? provenance.authors.map((p: any) => `${p.kind}:${p.id}`) : []), ...(userId ? [`user:${userId}`] : []), ...(agent ? [`agent:${agent.id}`] : [])])],
    submissionVersion: await submissionVersion(db, workspaceId, taskId, selected, context),
    taskIdentity: { contractId: `roost-task:${taskId}`, branch: `codex/task-${taskId}` },
    managers: managers.map(item => ({ id: item.id, label: item.name, revision: item.updatedAt.toISOString() })),
    components: components.map(item => ({ id: item.id, label: item.name, revision: item.updatedAt.toISOString() })),
    task: { id: task.id, title: task.title, status: task.status, project: task.project ? { id: task.project.id, name: task.project.name } : null, goal: task.goal ? { id: task.goal.id, title: task.goal.title } : null },
    agent: agent ? { id: agent.id, name: agent.name, role: agent.role, eligible: agent.type === "agent" && agent.status === "active", competencies: strings(agent.skillIndex), tools: strings(agent.toolIndex).filter(item => ["repository_read", "repository_write", "local_test"].includes(item)), permissions: strings(agent.authorityScope).filter(item => ["repository_read", "repository_write", "local_test"].includes(item)) } : null,
    applications, projects, goals, agents, applicationId: selected, activeExecution: active > 0, catalogTruncated: records.length > 500,
    models: modelShape.model.options.map((id: string) => ({ id, efforts: modelShape.reasoningEffort.options.filter((reasoningEffort: string) => modelSchema.safeParse({ model: id, reasoningEffort }).success) })),
    sources: records.slice(0, 500).map(item => ({ id: item.id, label: item.title, revision: item.updatedAt.toISOString(), applicationId: item.applicationId })),
    procedures: context.procedures.map(item => ({ id: item.id, label: item.name, revision: String(item.version), eligible: item.status === "active" })),
    dependencies: context.dependencies.map(item => ({ id: item.id, label: item.dependencyType, revision: item.updatedAt.toISOString(), eligible: item.status !== "blocked" })),
    decisions: context.decisions.map(item => ({ id: item.id, label: item.title, revision: item.updatedAt.toISOString(), eligible: item.status === "approved" })),
    accepted: accepted.success ? { contract: accepted.data, applicationId: pin.applicationId, prompt: pin.prompt, baseBranch: pin.baseBranch } : null,
    acceptance: typeof pin.validatedAt === "string" && Number.isFinite(Date.parse(pin.validatedAt)) ? { validatedAt: new Date(pin.validatedAt).toISOString(), authorName: author?.user.name ?? null, authorType: pin.requestedByType === "user" ? "user" : "agent" } : null
  };
}
