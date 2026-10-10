import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AgentExecution, Prisma } from "@prisma/client";
import { loadCompanyInformationContext } from "../company-intelligence/task-agent-context";
import { watchReadySources } from "./ready-source-watch";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { companyRuntimeClass, isInformationRuntime, informationApproval } from "./company-information-runtime";
import { riskAdmission } from "./task-risk";
import { riskLevelAdmission } from "./task-risk-admission";

export const companyInformationClass = "roost-company-information-v1";
export const isCompanyInformation = (contract: any) => [companyInformationClass, companyRuntimeClass].includes(contract?.executionClass);
const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
const validation = loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-execution-packet.mjs")).href);
const { readyContextRevision } = require("../../../scripts/lib/agent-host-ready-context.cjs");
const wire = (v: any) => JSON.parse(JSON.stringify(v));

// G6a admits preparation and queue storage only. This is deliberately not a
// model admission, risk-assessment receipt, release grant or provider bypass.
async function resolve(db: Prisma.TransactionClient, workspaceId: string, taskId: string, input: any, execution?: AgentExecution, author?: { authorId: string; requestId: string }) {
  if (input.applicationId !== null || input.baseBranch != null) throw new Error("company_information_scope_invalid");
  const watched = watchReadySources(db);
  const envelope = execution ?? { id: taskId, workspaceId, taskId, applicationId: null, attempt: 1, prompt: input.prompt ?? null, baseBranch: null,
    metadata: { executionContract: input.contract } } as unknown as AgentExecution;
  const taskContext: any = wire(await loadCompanyInformationContext(workspaceId, taskId, envelope, watched.db, author));
  if (!taskContext) throw new Error("task_not_found");
  const runtime = isInformationRuntime(input.contract);
  const approval = runtime ? await informationApproval(db, workspaceId, taskId, input.contract.modelSelection) : null;
  if (runtime && !approval) throw Error("runtime_authority_required");
  taskContext.executionPacket.procedureComposition = { algorithm: runtime ? companyRuntimeClass : "roost-company-information-preparation-v1", preparationOnly: !runtime, modelExecutionQualified: runtime, ...(approval ? { runtimeApproval: approval } : {}) };
  const { revision: _revision, ...body } = taskContext.executionPacket;
  taskContext.executionPacket.revision = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  requireRuntimeContent({ input, taskContext }, "model.company_preparation", { workspaceId, taskId });
  (await validation).validateExecutionPacket(taskContext.executionPacket, { ...envelope, application: null }, taskContext, {});
  return { watched, taskContext, revision: readyContextRevision(taskContext, {}, execution ?? input) };
}

export async function submitCompanyPreparation(db: Prisma.TransactionClient, workspaceId: string, task: any, input: any, actor: { requestedByType: string; requestedById: string | null }, receipt: (result: any, pin?: any) => Promise<any>) {
  const runtime = isInformationRuntime(input.contract);
  const approval = runtime ? await informationApproval(db, workspaceId, task.id, input.contract.modelSelection) : null;
  if (runtime && (!approval || approval.ownerUserId !== actor.requestedById)) return { error: "runtime_authority_required" };
  let context;
  try { context = await resolve(db, workspaceId, task.id, input, undefined, { authorId: actor.requestedById!, requestId: input.requestId }); }
  catch (error: any) {
    if (error?.message === "agent_runtime_content_blocked") throw error;
    const issues = error?.details?.issues ?? [{ field: "contract", reason: "invalid" }];
    const readiness = { status: "needs_context", reason: "submission_incomplete", issues };
    await db.task.update({ where: { id: task.id }, data: { executionReadiness: readiness } });
    await db.event.create({ data: { workspaceId, taskId: task.id, type: "task_execution_submission_rejected", source: "roost", resourceType: "task", resourceId: task.id, payload: { requestId: input.requestId, ...readiness, ...actor } } });
    return receipt({ error: "task_execution_contract_invalid", issues, readiness });
  }
  await context.watched.persist(task.id);
  const risk = runtime ? await riskAdmission(db, task.id, input) : null;
  if (risk && "error" in risk) return { error: risk.error };
  const admission = runtime ? await riskLevelAdmission(db, task.id, "runtime_execute") : null;
  if (admission?.error) return { error: admission.error };
  const pin = { schemaVersion: "roost-ready-context-v1", sourceWatchVersion: "1", submissionId: input.requestId, status: "ready", pinId: randomUUID(),
    revision: context.revision, preparationOnly: !runtime, modelExecutionQualified: runtime, ...(approval ? { runtimeApproval: approval } : {}),
    ...(runtime ? { riskAssessmentId: risk!.id, riskAdmissionSeal: admission!.seal, riskAdmissionCommit: null } : {}),
    applicationId: null, contract: input.contract, prompt: input.prompt ?? null, baseBranch: null,
    roleProvenance: context.taskContext.executionPacket.roleAuthorities.provenance,
    interviewVersion: (await db.$queryRaw<any[]>`SELECT task_interview_version(${task.id}::uuid) AS value`)[0].value,
    validatedAt: new Date().toISOString(), validation: { validator: "company-information-packet-v1", revision: context.revision }, ...actor };
  const result = { readiness: { status: "ready", pinId: pin.pinId, revision: pin.revision, validationRevision: pin.revision, preparationOnly: !runtime, modelExecutionQualified: runtime } };
  await receipt(result, pin);
  await db.task.update({ where: { id: task.id }, data: { executionReadiness: pin, executionRoleProvenance: pin.roleProvenance } });
  await db.event.create({ data: { workspaceId, taskId: task.id, type: "task_execution_ready", source: "roost", resourceType: "task", resourceId: task.id,
    payload: { pinId: pin.pinId, revision: pin.revision, executionClass: companyInformationClass, preparationOnly: true, ...actor } } });
  return result;
}

export async function inspectCompanyPreparation(db: Prisma.TransactionClient, workspaceId: string, task: any, execution?: AgentExecution, readOnly = false) {
  const pin = task.executionReadiness;
  const runtime = isInformationRuntime(pin.contract);
  let context, reason: string | null = null;
  if (pin.status !== "ready" || !pin.submissionId || !pin.pinId || pin.sourceWatchVersion !== "1" || pin.preparationOnly !== !runtime || pin.modelExecutionQualified !== runtime || pin.validation?.validator !== "company-information-packet-v1" || pin.validation?.revision !== pin.revision) reason = "preparation_required";
  if (!reason) {
    try { context = await resolve(db, workspaceId, task.id, pin, execution); if (context.revision !== pin.revision) reason = "context_changed"; }
    catch { reason = "context_invalid"; }
  }
  if (!reason && runtime) {
    const risk = await riskAdmission(db, task.id, pin);
    const admission = await riskLevelAdmission(db, task.id, "runtime_execute");
    if ("error" in risk || risk.id !== pin.riskAssessmentId || admission.error || admission.seal !== pin.riskAdmissionSeal) reason = "risk_admission_changed";
  }
  if (!reason && execution) {
    const bound: any = (execution.metadata as any)?.readyContextPin;
    if (execution.applicationId !== null || execution.baseBranch !== null || bound?.pinId !== pin.pinId || bound?.revision !== pin.revision || bound?.preparationOnly !== !runtime || bound?.modelExecutionQualified !== runtime || runtime && (bound?.runtimeDecisionId !== pin.runtimeApproval?.decisionId || bound?.runtimeDecisionVersion !== pin.runtimeApproval?.decisionVersion)) reason = "execution_pin_mismatch";
  }
  if (reason) {
    if (!readOnly && pin.status === "ready") await db.task.update({ where: { id: task.id }, data: { executionReadiness: { ...pin, status: "needs_revalidation", reason } } });
    return { error: "task_ready_revalidation_required", readiness: { status: "needs_revalidation", reason, preparationOnly: true, modelExecutionQualified: false } };
  }
  const readiness = { status: "ready", pinId: pin.pinId, revision: pin.revision, validationRevision: pin.revision, preparationOnly: !runtime, modelExecutionQualified: runtime };
  return { readiness, pin, taskContext: { ...context!.taskContext, readyAdmission: readiness }, applicationContext: {} };
}
