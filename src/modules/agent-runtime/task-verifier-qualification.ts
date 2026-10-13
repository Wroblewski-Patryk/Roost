import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { referenceSiteChecklistForExecution } from "../product-engineering/reference-site-runtime-context";

type Db = Prisma.TransactionClient;
const id = z.string().uuid();
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("qualify"), requestId: id, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    verifierId: id, contract: z.record(z.string(), z.unknown()), evidence: z.string().trim().min(20).max(2000), rationale: z.string().trim().min(20).max(2000) }).strict(),
  z.object({ action: z.literal("revoke"), requestId: id, expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    rationale: z.string().trim().min(20).max(2000) }).strict()
]);
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function verifierQualificationView(db: Db, workspaceId: string, taskId: string, userId: string) {
  const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
  const membership = await db.workspaceMembership.findFirst({ where: { workspaceId, userId, role: "owner" }, select: { id: true } });
  if (!owner || !membership) return { error: "verifier_qualification_forbidden" };
  const task = await db.task.findFirst({ where: { id: taskId, workspaceId },
    select: { id: true, title: true, status: true, assignedWorkforceEntityId: true,
      assignedWorkforceEntity: { select: { name: true, updatedAt: true, status: true, type: true } } } });
  if (!task) return { error: "task_not_found" };
  const decision = (await db.$queryRaw<Array<{ id: string; procedureId: string; version: number; status: string;
    sourceDigest: string; reviewIds: string[] | null }>>`
    SELECT d.id,p.id AS "procedureId",p.version,p.status::text AS status,
      d.source_digest AS "sourceDigest",
      (SELECT array_agg((s.validation_rule->'source'->>'reviewId')::uuid ORDER BY s.step_order)
        FROM procedure_steps s WHERE s.procedure_id=p.id) AS "reviewIds"
    FROM reference_site_checklist_decisions d JOIN procedures p ON p.id=d.procedure_id
    WHERE d.workspace_id=${workspaceId}::uuid AND d.task_id=${taskId}::uuid
    ORDER BY d.created_at DESC,d.id DESC LIMIT 1`)[0] ?? null;
  const checklistCurrent = Boolean(decision && task.assignedWorkforceEntityId &&
    await referenceSiteChecklistForExecution(db,db,workspaceId,taskId,task.assignedWorkforceEntityId,
      decision.procedureId,String(decision.version)));
  const candidates = await db.$queryRaw<Array<{ id: string; name: string; revision: Date }>>`
    SELECT e.id,e.name,e.updated_at AS revision FROM workforce_entities e
    WHERE e.workspace_id=${workspaceId}::uuid AND e.type='agent' AND e.status='active'
      AND e.skill_index @> '["application audit"]'::jsonb
      AND e.authority_scope @> '["task_verification"]'::jsonb
      AND e.id IS DISTINCT FROM ${task.assignedWorkforceEntityId}::uuid
    ORDER BY e.id LIMIT 50`;
  const latest = (await db.$queryRaw<Array<{ id: string; version: number; action: string; verifierId: string;
    evidence: string; rationale: string; validUntil: Date; createdAt: Date }>>`
    SELECT id,version,action,verifier_id AS "verifierId",evidence,rationale,valid_until AS "validUntil",created_at AS "createdAt"
    FROM task_verifier_qualifications WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid
    ORDER BY version DESC LIMIT 1`)[0] ?? null;
  const current = latest?.action === "qualify" ? (await db.$queryRaw<Array<{ value: unknown }>>`
    SELECT task_verifier_qualification_current(${taskId}::uuid,${latest.verifierId}::uuid) AS value`)[0]?.value ?? null : null;
  const candidateRows = candidates.map(row => ({ id: row.id, name: row.name, revision: row.revision.toISOString(), competency: "application audit" }));
  const checklist = decision && { id: decision.procedureId, version: decision.version,
    decisionId: decision.id, sourceDigest: decision.sourceDigest, reviewIds: decision.reviewIds ?? [], current: checklistCurrent };
  return { task: { id: task.id, title: task.title },
    executor: task.assignedWorkforceEntity && { id: task.assignedWorkforceEntityId,
      name: task.assignedWorkforceEntity.name, revision: task.assignedWorkforceEntity.updatedAt.toISOString() },
    checklist, candidates: candidateRows,
    latest: latest && { ...latest, validUntil: latest.validUntil.toISOString(), createdAt: latest.createdAt.toISOString() },
    current, canQualify: checklistCurrent && task.assignedWorkforceEntity?.type === "agent"
      && task.assignedWorkforceEntity.status === "active" && ["todo","in_progress"].includes(task.status)
      && candidateRows.length > 0,
    expectedVersion: hash({ taskId, assignedId: task.assignedWorkforceEntityId,
      assignedRevision: task.assignedWorkforceEntity?.updatedAt.toISOString() ?? null,
      taskStatus: task.status, checklist, candidates: candidateRows, latest }) };
}

export async function verifierQualificationCommand(db: Db, workspaceId: string, taskId: string,
  userId: string, body: unknown) {
  const input = command.parse(body);
  const prior = (await db.$queryRaw<Array<{ id: string; requestHash: string }>>`
    SELECT id,request_hash AS "requestHash" FROM task_verifier_qualifications
    WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
  const requestHash = hash({ workspaceId, taskId, userId, input });
  if (prior) return prior.requestHash === requestHash
    ? { ...await verifierQualificationView(db,workspaceId,taskId,userId), replayed: true }
    : { error: "verifier_qualification_request_conflict" };
  const view = await verifierQualificationView(db,workspaceId,taskId,userId);
  if ("error" in view) return view;
  if (input.expectedVersion !== view.expectedVersion) return { error: "verifier_qualification_stale" };
  if (input.action === "qualify" && (!view.canQualify || !view.checklist ||
    !view.candidates.some(candidate => candidate.id === input.verifierId))) return { error: "verifier_qualification_invalid" };
  if (input.action === "qualify" && (JSON.stringify(input.contract).length > 65536 ||
    input.contract.executionClass !== "roost-company-information-runtime-v1" ||
    (input.contract.singleTask as any)?.contractId !== `roost-task:${taskId}` ||
    (input.contract.assignment as any)?.agentId !== view.executor?.id ||
    (input.contract.taskRoles as any)?.executor?.id !== view.executor?.id ||
    (input.contract.taskRoles as any)?.executor?.revision !== view.executor?.revision ||
    (input.contract.taskRoles as any)?.verifier?.id !== input.verifierId ||
    (input.contract.taskRoles as any)?.verifier?.revision !== view.candidates.find(c => c.id === input.verifierId)?.revision ||
    (input.contract.procedures as any)?.items?.length !== 1 ||
    (input.contract.procedures as any).items[0]?.id !== view.checklist.id ||
    (input.contract.procedures as any).items[0]?.revision !== String(view.checklist.version)))
    return { error: "verifier_qualification_contract_invalid" };
  if (input.action === "revoke" && (!view.latest || view.latest.action !== "qualify"))
    return { error: "verifier_qualification_revoke_invalid" };
  const candidate = input.action === "qualify"
    ? view.candidates.find(item => item.id === input.verifierId)! : null;
  const executor = await db.task.findUniqueOrThrow({ where: { id: taskId },
    select: { assignedWorkforceEntityId: true, assignedWorkforceEntity: { select: { updatedAt: true } } } });
  const row = input.action === "qualify" ? {
    executorId: executor.assignedWorkforceEntityId!, executorRevision: executor.assignedWorkforceEntity!.updatedAt,
    verifierId: candidate!.id, verifierRevision: new Date(candidate!.revision),
    checklistDecisionId: view.checklist!.decisionId, procedureId: view.checklist!.id,
    procedureVersion: view.checklist!.version, reviewIds: view.checklist!.reviewIds,
    contractSnapshot: input.contract,
    evidence: input.evidence,
    validUntil: new Date(Date.now()+12*60*60*1000)
  } : (await db.$queryRaw<Array<{ executorId: string; executorRevision: Date; verifierId: string;
    verifierRevision: Date; checklistDecisionId: string; procedureId: string; procedureVersion: number;
    reviewIds: string[]; contractSnapshot: unknown; evidence: string; validUntil: Date }>>`
    SELECT executor_id AS "executorId",executor_revision AS "executorRevision",verifier_id AS "verifierId",
      verifier_revision AS "verifierRevision",checklist_decision_id AS "checklistDecisionId",
      procedure_id AS "procedureId",procedure_version AS "procedureVersion",review_ids AS "reviewIds",contract_snapshot AS "contractSnapshot",
      evidence,valid_until AS "validUntil" FROM task_verifier_qualifications
    WHERE task_id=${taskId}::uuid ORDER BY version DESC LIMIT 1`)[0];
  const recordId = randomUUID();
  await db.$executeRaw`INSERT INTO task_verifier_qualifications
    (id,workspace_id,task_id,version,action,executor_id,executor_revision,verifier_id,verifier_revision,
      competency,checklist_decision_id,procedure_id,procedure_version,review_ids,contract_snapshot,evidence,rationale,
      owner_user_id,valid_until,request_id,request_hash)
    VALUES(${recordId}::uuid,${workspaceId}::uuid,${taskId}::uuid,
      (SELECT COALESCE(max(version),0)+1 FROM task_verifier_qualifications WHERE task_id=${taskId}::uuid),
      ${input.action},${row.executorId}::uuid,${row.executorRevision},${row.verifierId}::uuid,
      ${row.verifierRevision},'application audit',${row.checklistDecisionId}::uuid,
      ${row.procedureId}::uuid,${row.procedureVersion},${row.reviewIds}::uuid[],${JSON.stringify(row.contractSnapshot)}::jsonb,${row.evidence},${input.rationale},
      ${userId}::uuid,${row.validUntil},${input.requestId}::uuid,${requestHash})`;
  await db.event.create({ data: { workspaceId, taskId, type: "task_verifier_qualification",
    source: "roost", actorType: "user", actorId: userId, resourceType: "task_verifier_qualification",
    resourceId: recordId, payload: { action: input.action, verifierId: row.verifierId,
      checklistDecisionId: row.checklistDecisionId } } });
  return verifierQualificationView(db,workspaceId,taskId,userId);
}
