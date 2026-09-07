import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, type AgentExecution } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { loadTaskAgentContext } from "../company-intelligence/task-agent-context";
import { loadApplicationAgentContext } from "../product-engineering/application-agent-context";
import { watchReadySources } from "./ready-source-watch";

const { readyContextRevision, readyContextQuery } = require("../../../scripts/lib/agent-host-ready-context.cjs") as {
  readyContextRevision: (task: any, application: any, input: any) => string;
  readyContextQuery: (task: any, prompt: unknown) => string;
};
// Preserve native ESM loading in this CommonJS build. The specifier is a fixed
// repository module, never request data; the host and API use one validator.
const loadESM = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ validateExecutionPacket: (...args: any[]) => unknown; executionContractSchema: { shape: any; safeParse: (value: unknown) => { success: boolean; data?: any } } }>;
const validation = loadESM(pathToFileURL(path.resolve(__dirname, "../../../scripts/lib/agent-host-execution-packet.mjs")).href);
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
export async function readyTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | { error: string }> {
  try { return await prisma.$transaction(work, { isolationLevel: "Serializable", maxWait: 5000, timeout: 20000 }); }
  catch (error) {
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

async function resolved(db: Prisma.TransactionClient, workspaceId: string, taskId: string, input: Record<string, any>, execution?: AgentExecution) {
  const watched = watchReadySources(db);
  db = watched.db;
  const application = await db.application.findFirst({ where: { id: input.applicationId, workspaceId, slug: { not: "roost" } }, include: { repositories: true } });
  if (!application) throw new Error("application_not_found");
  // A validation envelope has no execution record and cannot claim or run work.
  const envelope = execution ?? { id: taskId, taskId, workspaceId, applicationId: application.id, attempt: 1, metadata: { executionContract: input.contract }, prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null } as unknown as AgentExecution;
  const taskContext = wire(await loadTaskAgentContext(workspaceId, taskId, envelope, db));
  if (!taskContext) throw new Error("task_not_found");
  const applicationContext = wire(await loadApplicationAgentContext(workspaceId, application.id, true, readyContextQuery(taskContext.task, input.prompt), db));
  const claimed = { ...envelope, attempt: Math.max(1, envelope.attempt), application };
  (await validation).validateExecutionPacket(taskContext.executionPacket, claimed, taskContext, applicationContext);
  return { taskContext, applicationContext, watched, revision: readyContextRevision(taskContext, applicationContext, execution ?? input) };
}

export async function submitReady(db: Prisma.TransactionClient, workspaceId: string, taskId: string, input: Record<string, any>, actor: { requestedByType: string; requestedById: string | null }) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found" };
  if (await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } })) return { error: "task_agent_execution_active" };
  let context;
  try { context = await resolved(db, workspaceId, taskId, input); }
  catch (error) { return { error: "task_execution_contract_invalid", issues: object(error).details?.issues ?? [] }; }
  await context.watched.persist(taskId);
  const pin = { schemaVersion: "roost-ready-context-v1", sourceWatchVersion: "1", status: "ready", pinId: randomUUID(), revision: context.revision,
    applicationId: input.applicationId, contract: input.contract, prompt: input.prompt ?? null, baseBranch: input.baseBranch ?? null,
    validatedAt: new Date().toISOString(), validation: { validator: "execution-packet-v1", revision: context.revision }, ...actor };
  await db.task.update({ where: { id: task.id }, data: { executionReadiness: pin } });
  await db.event.create({ data: { workspaceId, taskId, type: "task_execution_ready", source: "roost", resourceType: "task", resourceId: taskId,
    payload: { pinId: pin.pinId, revision: pin.revision, validation: pin.validation, validatedAt: pin.validatedAt, ...actor } } });
  return { readiness: { status: "ready", pinId: pin.pinId, revision: pin.revision, validationRevision: pin.validation.revision } };
}

export async function inspectReady(db: Prisma.TransactionClient, workspaceId: string, taskId: string, execution?: AgentExecution) {
  const task = await lockReadyTask(db, workspaceId, taskId);
  if (!task) return { error: "task_not_found", readiness: { status: "not_ready" } };
  const pin = object(task.executionReadiness);
  const proof = { pinId: pin.pinId, revision: pin.revision, validationRevision: pin.validation?.revision };
  if (pin.schemaVersion !== "roost-ready-context-v1" || !pin.pinId || !/^[a-f0-9]{64}$/.test(pin.revision) || pin.validation?.validator !== "execution-packet-v1" || pin.validation?.revision !== pin.revision) {
    return { error: "task_ready_pin_required", readiness: { status: "not_ready", reason: "ready_pin_required" } };
  }
  let reason = pin.status !== "ready" ? (["context_changed", "context_invalid", "source_watch_required"].includes(pin.reason) ? pin.reason : "revalidation_required") : pin.sourceWatchVersion !== "1" ? "source_watch_required" : null;
  let context;
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
  const readiness = { status: "ready", ...proof };
  return { readiness, pin, taskContext: { ...context!.taskContext, readyAdmission: readiness }, applicationContext: context!.applicationContext };
}

// Human editor projection: labels and revision references, never resolved source
// bodies, agent metadata, credentials or client-authorable acceptance evidence.
export async function readyEditorData(db: Prisma.TransactionClient, workspaceId: string, taskId: string, applicationId?: string) {
  const context = await loadTaskAgentContext(workspaceId, taskId, null, db);
  if (!context) return null;
  const task = context.task, pin = object(task.executionReadiness);
  const applications = await db.application.findMany({ where: { workspaceId, slug: { not: "roost" }, projects: { some: { projectId: task.projectId ?? "00000000-0000-0000-0000-000000000000" } } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const selected = applicationId ?? (applications.some(app => app.id === pin.applicationId) ? pin.applicationId : applications.length === 1 ? applications[0]!.id : null);
  if (selected && !applications.some(app => app.id === selected)) return { error: "application_not_found" };
  const records = await db.companyRecord.findMany({ where: { workspaceId, status: { not: "archived" }, OR: [{ applicationId: null }, ...(selected ? [{ applicationId: selected }] : [])] }, select: { id: true, title: true, applicationId: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 501 });
  const accepted = (await validation).executionContractSchema.safeParse(pin.contract);
  const modelSchema = (await validation).executionContractSchema.shape.modelSelection;
  const modelShape = modelSchema.innerType().shape;
  const author = pin.requestedByType === "user" && typeof pin.requestedById === "string" ? await db.workspaceMembership.findFirst({ where: { workspaceId, userId: pin.requestedById }, select: { user: { select: { name: true } } } }) : null;
  const active = await db.agentExecution.count({ where: { workspaceId, taskId, status: { in: ["queued", "claimed", "running", "waiting_for_approval"] } } });
  const [projects, goals, agents] = await Promise.all([
    db.project.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    db.goal.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 500 }),
    db.workforceEntity.findMany({ where: { workspaceId, status: "active", type: "agent" }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 })
  ]);
  const agent = task.assignedWorkforceEntity;
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
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
