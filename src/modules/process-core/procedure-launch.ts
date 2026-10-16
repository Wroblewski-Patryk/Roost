import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ActorType, OperatingStatus, Prisma, ProcedureStepType } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";

const uuid = z.string().uuid();
const inputsSchema = z.record(z.string().trim().min(1).max(5000)).refine(value => Object.keys(value).length <= 20);
export const launchPreviewSchema = z.object({ projectId: uuid, inputs: inputsSchema.default({}) }).strict();
export const launchCommandSchema = launchPreviewSchema.extend({ requestId: uuid, previewToken: z.string().min(10).max(8192) });
const stepOutcomeSchema = z.object({ requestId: uuid, decision: z.enum(["accept", "exception"]),
  evidence: z.object({ summary: z.string().trim().min(10).max(2000), references: z.array(z.string().trim().min(1).max(500)).max(10).default([]) }).strict(),
  reason: z.string().trim().min(10).max(1000).optional() }).strict()
  .refine(value => value.decision !== "exception" || Boolean(value.reason));
type Db = Prisma.TransactionClient;
type Input = z.infer<typeof launchPreviewSchema>;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonical(item)]));
  return value;
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

function signature(encoded: string) {
  return createHmac("sha256", env.authTokenSecret).update(`roost-procedure-launch-v1:${encoded}`).digest("base64url");
}

function tokenFor(workspaceId: string, userId: string, procedureId: string, projectId: string, hash: string) {
  const encoded = Buffer.from(JSON.stringify({ schema: "roost-procedure-launch-v1", workspaceId, userId,
    procedureId, projectId, digest: hash, issuedAt: Date.now() })).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

function readToken(token: string, workspaceId: string, userId: string, procedureId: string, projectId: string) {
  const [encoded, supplied, extra] = token.split(".");
  if (!encoded || !supplied || extra) return null;
  const expected = Buffer.from(signature(encoded));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (value.schema !== "roost-procedure-launch-v1" || value.workspaceId !== workspaceId ||
      value.userId !== userId || value.procedureId !== procedureId || value.projectId !== projectId ||
      typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) ||
      !Number.isSafeInteger(value.issuedAt) || value.issuedAt > Date.now() + 5000) return null;
    return value as { digest: string; issuedAt: number };
  } catch { return null; }
}

function object(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function terminalOwnerDecision(role: { type: string; permissions: Prisma.JsonValue } | null): boolean {
  const permissions = role?.permissions;
  if (role?.type !== "human" || !Array.isArray(permissions)) return false;
  return ["workspace:admin", "approval:decide"].every(permission => permissions.includes(permission));
}

async function material(db: Db, workspaceId: string, procedureId: string, input: Input) {
  const [procedure, project] = await Promise.all([
    db.procedure.findFirst({ where: { id: procedureId, workspaceId }, include: {
      ownerRole: { include: { escalationTarget: true } }, steps: { orderBy: { stepOrder: "asc" } }
    } }),
    db.project.findFirst({ where: { id: input.projectId, workspaceId } })
  ]);
  if (!procedure) return { error: "procedure_not_found" } as const;
  if (!project) return { error: "project_not_found" } as const;

  const [procedureScopes, projectDepartments] = await Promise.all([
    db.organizationalScope.findMany({ where: { workspaceId, entityType: "procedure", entityId: procedure.id },
      select: { scopeType: true, scopeEntityId: true }, orderBy: { id: "asc" } }),
    db.organizationalDepartmentRelation.findMany({ where: { workspaceId, entityType: "project", entityId: project.id,
      relationshipRole: { in: ["owner", "applicable"] } },
      select: { department: { select: { key: true } } } })
  ]);
  const applicability = procedureScopes.map(scope => ({ type: scope.scopeType, entityId: scope.scopeEntityId }));
  const projectDepartmentKeys = projectDepartments.map(relation => relation.department.key).sort();

  const blockers: string[] = [];
  if (procedure.status !== OperatingStatus.active) blockers.push("procedure_not_active");
  if (project.status !== "active") blockers.push("project_not_active");
  if (applicability.length !== 1) blockers.push("procedure_applicability_ambiguous");
  else if (!(applicability[0].type === "company" && !applicability[0].entityId) &&
    !(applicability[0].type === "project" && applicability[0].entityId === project.id) &&
    !(applicability[0].type === "department" && Boolean(applicability[0].entityId) && projectDepartmentKeys.includes(applicability[0].entityId!)))
    blockers.push("procedure_scope_mismatch");
  if (!procedure.scope?.trim()) blockers.push("procedure_scope_missing");
  if (!procedure.expectedResult?.trim()) blockers.push("procedure_result_missing");
  if (!procedure.ownerRole || procedure.ownerRole.type !== "human") blockers.push("human_owner_role_missing");
  const ownerDecidesFinally = terminalOwnerDecision(procedure.ownerRole);
  if (!procedure.ownerRole?.escalationTarget && !ownerDecidesFinally) blockers.push("escalation_role_missing");
  if (!procedure.steps.length) blockers.push("procedure_steps_missing");
  if (Array.isArray(procedure.requiredTools) && procedure.requiredTools.some(tool => tool !== "companycore")) blockers.push("external_tool_required");
  if (Array.isArray(procedure.requiredPermissions) && procedure.requiredPermissions.length) blockers.push("additional_permission_required");

  const expectedKeys = new Set<string>();
  for (const step of procedure.steps) {
    if (step.stepType !== ProcedureStepType.manual && step.stepType !== ProcedureStepType.human_review) blockers.push(`step_${step.stepOrder}_executor_unsupported`);
    if (step.requiredToolAdapterId) blockers.push(`step_${step.stepOrder}_external_adapter_required`);
    if (!step.instruction.trim()) blockers.push(`step_${step.stepOrder}_instruction_missing`);
    if (!Object.keys(object(step.expectedOutput)).length) blockers.push(`step_${step.stepOrder}_output_missing`);
    const validation = object(step.validationRule);
    if (typeof validation.success !== "string" || !validation.success.trim()) blockers.push(`step_${step.stepOrder}_success_missing`);
    if (!Number.isInteger(validation.maxAttempts) || Number(validation.maxAttempts) < 1 || Number(validation.maxAttempts) > 3)
      blockers.push(`step_${step.stepOrder}_retry_missing`);
    if (!step.rollbackInstruction?.trim()) blockers.push(`step_${step.stepOrder}_fallback_missing`);
    for (const key of Object.keys(object(step.expectedInput))) expectedKeys.add(key);
  }
  for (const key of expectedKeys) if (!input.inputs[key]?.trim()) blockers.push(`input_missing:${key}`);
  for (const key of Object.keys(input.inputs)) if (!expectedKeys.has(key)) blockers.push(`input_unexpected:${key}`);

  const existing = await db.procedureRun.findFirst({ where: { workspaceId, procedureFamilyId: procedure.familyId, projectId: project.id }, select: { id: true } });
  if (existing) blockers.push("already_launched_for_scope");
  const origin = await db.auditLog.findFirst({ where: { workspaceId, resourceType: "Procedure", resourceId: procedure.id,
    action: { in: ["procedure.create_draft", "procedure.propose_revision"] } }, select: { id: true } });
  if (!origin) blockers.push("procedure_origin_unverified");

  const snapshot = {
    procedure: { id: procedure.id, familyId: procedure.familyId, version: procedure.version, name: procedure.name,
      purpose: procedure.purpose, requiredTools: procedure.requiredTools, requiredPermissions: procedure.requiredPermissions,
      status: procedure.status, scope: procedure.scope, expectedResult: procedure.expectedResult,
      updatedAt: procedure.updatedAt.toISOString() },
    applicability, projectDepartmentKeys, originAuditId: origin?.id ?? null,
    project: { id: project.id, name: project.name, status: project.status, updatedAt: project.updatedAt.toISOString() },
    ownerRole: procedure.ownerRole ? { id: procedure.ownerRole.id, name: procedure.ownerRole.name,
      type: procedure.ownerRole.type, escalation: procedure.ownerRole.escalationTarget?.name ?? null,
      terminalOwnerDecision: ownerDecidesFinally,
      updatedAt: procedure.ownerRole.updatedAt.toISOString() } : null,
    inputs: canonical(input.inputs) as Record<string, string>,
    steps: procedure.steps.map(step => ({ id: step.id, order: step.stepOrder, instruction: step.instruction,
      executor: step.stepType, expectedInput: step.expectedInput, expectedOutput: step.expectedOutput,
      validationRule: step.validationRule, rollbackInstruction: step.rollbackInstruction,
      requiredToolAdapterId: step.requiredToolAdapterId, updatedAt: step.updatedAt.toISOString(),
      taskTitle: `${procedure.name} · ${step.stepOrder}. ${step.instruction}` }))
  };
  const uniqueBlockers = [...new Set(blockers)];
  return { snapshot, blockers: uniqueBlockers, hash: digest({ snapshot, blockers: uniqueBlockers }), procedure, project } as const;
}

export async function procedureLaunchPreview(workspaceId: string, userId: string, procedureId: string, raw: unknown) {
  const input = launchPreviewSchema.parse(raw);
  const [result, assignee] = await Promise.all([
    prisma.$transaction(db => material(db, workspaceId, procedureId, input)),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } })
  ]);
  if ("error" in result) return result;
  return { ...result.snapshot, blockers: result.blockers, digest: result.hash, taskAssigneeUserId: userId,
    taskAssigneeLabel: assignee?.name || assignee?.email || userId,
    previewToken: result.blockers.length ? null : tokenFor(workspaceId, userId, procedureId, input.projectId, result.hash),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    effects: { roostNativeTasks: result.snapshot.steps.length, externalWrites: 0, agentExecutions: 0 } };
}

export async function procedureRunView(workspaceId: string, runId: string) {
  const run = await prisma.procedureRun.findFirst({ where: { id: runId, workspaceId }, include: {
    steps: { orderBy: { stepOrder: "asc" }, include: { outcomes: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
      task: { select: { id: true, title: true, status: true,
      ownerUserId: true, source: true, externalId: true, reviewDecisions: { select: { id: true, decision: true, createdAt: true }, orderBy: { createdAt: "desc" } } } } } }
  } });
  if (!run) return { error: "procedure_run_not_found" } as const;
  const statuses = run.steps.map(step => step.task.status);
  const status = run.steps.some(step => step.outcomes[0]?.decision === "exception") ||
    statuses.some(value => value === "blocked" || value === "archived") ? "exception" :
    run.steps.every(step => step.task.status === "done" && step.outcomes[0]?.decision === "accept") ? "owner_accepted" :
    statuses.every(value => value === "done") ? "tasks_done_evidence_pending" :
    statuses.some(value => value === "in_progress") ? "in_progress" : "tasks_open";
  return { id: run.id, procedureId: run.procedureId, procedureFamilyId: run.procedureFamilyId,
    procedureVersion: run.procedureVersion, procedureName: run.procedureName, projectId: run.projectId,
    projectName: run.projectName, ownerRoleName: run.ownerRoleName, launchedByUserId: run.launchedByUserId,
    inputSnapshot: run.inputSnapshot, createdAt: run.createdAt, status,
    steps: run.steps.map(step => ({ id: step.id, order: step.stepOrder, instruction: step.instruction,
      executor: step.stepType, expectedOutput: step.expectedOutput, successRule: step.validationRule,
      fallback: step.rollbackInstruction, task: step.task,
      reviewHistory: step.task.reviewDecisions.map(review => ({ id: review.id, decision: review.decision, recordedAt: review.createdAt })),
      outputEvidence: step.task.status === "done" && step.outcomes[0]?.decision === "accept" ?
        [{ id: step.outcomes[0].id, evidence: step.outcomes[0].evidence, actorUserId: step.outcomes[0].actorUserId,
          recordedAt: step.outcomes[0].createdAt }] : [],
      outcomeHistory: step.outcomes.map(outcome => ({ id: outcome.id, decision: outcome.decision,
        evidence: outcome.evidence, reason: outcome.reason, actorUserId: outcome.actorUserId, recordedAt: outcome.createdAt })),
      exception: step.outcomes[0]?.decision === "exception" ? step.outcomes[0].reason :
        step.task.status === "blocked" ? "task_blocked" : step.task.status === "archived" ? "task_archived_without_accepted_output" : null })) };
}

export async function recordProcedureStepOutcome(workspaceId: string, userId: string, runId: string, stepId: string, raw: unknown) {
  const input = stepOutcomeSchema.parse(raw);
  const requestHash = digest({ runId, stepId, input });
  let result;
  try { result = await prisma.$transaction(async db => {
    const membership = await db.$queryRaw<Array<{ role: string }>>`
      SELECT role::text AS role FROM workspace_memberships
      WHERE workspace_id=${workspaceId}::uuid AND user_id=${userId}::uuid FOR SHARE`;
    if (membership.length !== 1 || membership[0].role !== "owner") return { error: "procedure_outcome_forbidden" } as const;
    const step = await db.procedureRunStep.findFirst({ where: { id: stepId, runId, run: { workspaceId } }, select: { id: true, taskId: true } });
    if (!step) return { error: "procedure_run_step_not_found" } as const;
    const prior = await db.procedureRunStepOutcome.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
    if (prior) return prior.runStepId === stepId && prior.requestHash === requestHash
      ? { outcomeId: prior.id, replayed: true } : { error: "procedure_outcome_request_conflict" } as const;
    const taskRows = await db.$queryRaw<Array<{ status: string }>>`
      SELECT status::text AS status FROM tasks WHERE id=${step.taskId}::uuid AND workspace_id=${workspaceId}::uuid FOR SHARE`;
    if (taskRows.length !== 1) return { error: "procedure_task_not_found" } as const;
    if (input.decision === "accept" && taskRows[0].status !== "done") return { error: "procedure_task_not_done" } as const;
    const created = await db.procedureRunStepOutcome.create({ data: { workspaceId, runStepId: stepId,
      requestId: input.requestId, requestHash, actorUserId: userId, decision: input.decision,
      evidence: input.evidence, reason: input.reason ?? null } });
    await db.auditLog.create({ data: { workspaceId, actorType: ActorType.user, actorId: userId,
      action: "procedure.run_step_outcome", resourceType: "ProcedureRunStep", resourceId: stepId,
      correlationId: runId, inputPayload: { requestId: input.requestId, decision: input.decision },
      outputPayload: { outcomeId: created.id } } });
    await db.event.create({ data: { workspaceId, actorType: ActorType.user, actorId: userId,
      type: "procedure_run_step_outcome_recorded", resourceType: "ProcedureRunStep", resourceId: stepId,
      taskId: step.taskId, correlationId: runId, payload: { outcomeId: created.id, decision: input.decision } } });
    return { outcomeId: created.id, replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2002", "P2034"].includes(error.code)) throw error;
    const prior = await prisma.procedureRunStepOutcome.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
    if (!prior) throw error;
    result = prior.runStepId === stepId && prior.requestHash === requestHash
      ? { outcomeId: prior.id, replayed: true } : { error: "procedure_outcome_request_conflict" } as const;
  }
  if ("error" in result) return result;
  return { ...result, run: await procedureRunView(workspaceId, runId) };
}

export async function listProcedureRuns(workspaceId: string, procedureId: string) {
  const rows = await prisma.procedureRun.findMany({ where: { workspaceId, procedureId },
    select: { id: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return Promise.all(rows.map(row => procedureRunView(workspaceId, row.id)));
}

export async function launchProcedure(workspaceId: string, userId: string, procedureId: string, raw: unknown) {
  const input = launchCommandSchema.parse(raw);
  const token = readToken(input.previewToken, workspaceId, userId, procedureId, input.projectId);
  if (!token) return { error: "procedure_launch_preview_invalid" } as const;
  const existing = await prisma.procedureRun.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
  if (existing) {
    if (existing.procedureId !== procedureId || existing.projectId !== input.projectId || existing.previewDigest !== token.digest ||
      digest(existing.inputSnapshot) !== digest(input.inputs)) return { error: "procedure_launch_request_conflict" } as const;
    return { run: await procedureRunView(workspaceId, existing.id), replayed: true };
  }
  if (Date.now() - token.issuedAt > 300000) return { error: "procedure_launch_preview_expired" } as const;

  try {
    const outcome = await prisma.$transaction(async db => {
      const membership = await db.$queryRaw<Array<{ role: string }>>`
        SELECT role::text AS role FROM workspace_memberships
        WHERE workspace_id=${workspaceId}::uuid AND user_id=${userId}::uuid FOR SHARE`;
      if (membership.length !== 1 || membership[0].role !== "owner") return { error: "procedure_launch_forbidden" } as const;
      const current = await material(db, workspaceId, procedureId, input);
      if ("error" in current) return current;
      if (current.hash !== token.digest) return { error: "procedure_launch_stale" } as const;
      if (current.blockers.length) return { error: "procedure_launch_blocked", blockers: current.blockers } as const;
      const run = await db.procedureRun.create({ data: { workspaceId, procedureId, projectId: input.projectId,
        requestId: input.requestId, launchedByUserId: userId, previewDigest: current.hash,
        procedureFamilyId: current.procedure.familyId, procedureVersion: current.procedure.version,
        procedureName: current.procedure.name, procedureUpdatedAt: current.procedure.updatedAt,
        projectName: current.project.name, ownerRoleName: current.procedure.ownerRole!.name,
        inputSnapshot: canonical(input.inputs) as Prisma.InputJsonValue } });
      for (const step of current.procedure.steps) {
        const task = await db.task.create({ data: { workspaceId, projectId: input.projectId, ownerUserId: userId,
          title: `${current.procedure.name} · ${step.stepOrder}. ${step.instruction}`,
          description: `Procedure run: ${run.id}\n${current.procedure.purpose}\n\nStep input fields: ${Object.keys(object(step.expectedInput)).join(", ") || "none"}. Values are in the owner-only run record.\nExpected result: ${current.procedure.expectedResult}\nStep output: ${JSON.stringify(step.expectedOutput)}`,
          status: "todo", source: "companycore", executionReadiness: { status: "draft" } } });
        await db.procedureRunStep.create({ data: { runId: run.id, procedureStepId: step.id,
          stepOrder: step.stepOrder, instruction: step.instruction, stepType: step.stepType,
          expectedInput: step.expectedInput as Prisma.InputJsonValue, expectedOutput: step.expectedOutput as Prisma.InputJsonValue,
          validationRule: step.validationRule as Prisma.InputJsonValue, rollbackInstruction: step.rollbackInstruction,
          taskId: task.id } });
        await db.event.create({ data: { workspaceId, type: "task_created", actorType: ActorType.user, actorId: userId,
          source: "companycore", resourceType: "Task", resourceId: task.id, projectId: input.projectId, taskId: task.id,
          correlationId: run.id, payload: { procedureRunId: run.id, procedureStepId: step.id } } });
      }
      await db.auditLog.create({ data: { workspaceId, actorType: ActorType.user, actorId: userId,
        action: "procedure.launch", resourceType: "ProcedureRun", resourceId: run.id, correlationId: run.id,
        inputPayload: { procedureId, projectId: input.projectId, requestId: input.requestId, previewDigest: current.hash },
        outputPayload: { taskCount: current.procedure.steps.length } } });
      await db.event.create({ data: { workspaceId, type: "procedure_launched", actorType: ActorType.user, actorId: userId,
        resourceType: "ProcedureRun", resourceId: run.id, projectId: input.projectId,
        correlationId: run.id, payload: { procedureId, version: current.procedure.version, taskCount: current.procedure.steps.length } } });
      return { runId: run.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!("runId" in outcome) || typeof outcome.runId !== "string") return outcome;
    return { run: await procedureRunView(workspaceId, outcome.runId), replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      const winner = await prisma.procedureRun.findUnique({ where: { workspaceId_requestId: { workspaceId, requestId: input.requestId } } });
      if (winner && winner.procedureId === procedureId && winner.projectId === input.projectId &&
        winner.previewDigest === token.digest && digest(winner.inputSnapshot) === digest(input.inputs))
        return { run: await procedureRunView(workspaceId, winner.id), replayed: true };
      return { error: "procedure_launch_conflict" } as const;
    }
    throw error;
  }
}
