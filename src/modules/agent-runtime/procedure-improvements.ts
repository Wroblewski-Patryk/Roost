import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AuthContext } from "../../auth/api-key.middleware";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { organizationalContextsForEntities, replaceOrganizationalContext } from "../organizational-context/organizational-context.service";
import { requireRuntimeContent } from "./runtime-redaction-policy";
import { reviewDigest, object } from "./task-review-contract";
import { reviewState } from "./task-review";
import { suspensionBlocks } from "./capability-suspension";

type Db = Prisma.TransactionClient;
const id = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const evidenceText = z.string().trim().min(3).max(2000);
export const improvementProposalSchema = z.object({
  requestId: id, executionId: id, materialVersion: digest, compositionSeal: digest,
  contractVersionId: id, sourceStepId: id, stepKey: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  observation: evidenceText, proposedInstruction: evidenceText,
  applicability: evidenceText, rollback: evidenceText
}).strict();
export const improvementDecisionSchema = z.object({
  requestId: id, expectedVersion: digest, decision: z.enum(["accept", "reject"]),
  diagnosis: evidenceText, applicability: evidenceText, rollback: evidenceText
}).strict();

type ProposalRow = {
  id: string; workspace_id: string; task_id: string; execution_id: string;
  material_version: string; composition_seal: string; procedure_id: string;
  contract_version_id: string; source_step_id: string; step_key: string;
  step_snapshot: any; observation: string; proposed_instruction: string;
  applicability: string; rollback: string; actor_kind: "user" | "agent";
  actor_id: string; actor_credential_id: string | null; request_id: string;
  request_hash: string; created_at: Date;
};
type DecisionRow = { id: string; proposal_id: string; decision: "accept" | "reject";
  diagnosis: string; applicability: string; rollback: string; reviewer_user_id: string;
  draft_procedure_id: string | null; request_id: string; request_hash: string; created_at: Date };
const version = (proposal: ProposalRow) => reviewDigest({
  id: proposal.id, requestHash: proposal.request_hash, materialVersion: proposal.material_version,
  compositionSeal: proposal.composition_seal, step: proposal.step_snapshot
});
const visible = (proposal: ProposalRow, decision: DecisionRow | null) => ({
  id: proposal.id, taskId: proposal.task_id, executionId: proposal.execution_id,
  materialVersion: proposal.material_version, compositionSeal: proposal.composition_seal,
  procedureId: proposal.procedure_id, contractVersionId: proposal.contract_version_id,
  sourceStepId: proposal.source_step_id, stepKey: proposal.step_key, step: proposal.step_snapshot,
  observation: proposal.observation, proposedInstruction: proposal.proposed_instruction,
  applicability: proposal.applicability, rollback: proposal.rollback,
  author: { kind: proposal.actor_kind, id: proposal.actor_id },
  expectedVersion: version(proposal), createdAt: proposal.created_at,
  decision: decision ? { id: decision.id, decision: decision.decision, diagnosis: decision.diagnosis,
    applicability: decision.applicability, rollback: decision.rollback,
    reviewerUserId: decision.reviewer_user_id, draftProcedureId: decision.draft_procedure_id,
    createdAt: decision.created_at } : null
});

async function proposalById(db: Db, workspaceId: string, taskId: string, proposalId: string) {
  return (await db.$queryRaw<ProposalRow[]>`SELECT * FROM procedure_improvement_proposals
    WHERE id=${proposalId}::uuid AND workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid`)[0] ?? null;
}
async function decisionFor(db: Db, proposalId: string) {
  return (await db.$queryRaw<DecisionRow[]>`SELECT * FROM procedure_improvement_decisions WHERE proposal_id=${proposalId}::uuid`)[0] ?? null;
}
async function primaryOwner(db: Db, workspaceId: string, userId: string) {
  const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
  return Boolean(owner && await db.workspaceMembership.findFirst({ where: { workspaceId, userId, role: "owner" }, select: { userId: true } }));
}

export async function improvementView(db: Db, workspaceId: string, taskId: string, auth: AuthContext) {
  const s = await reviewState(db, workspaceId, taskId, auth);
  if (s.error) return { error: s.error } as const;
  const principal = s.principal;
  if (!principal || auth.taskScopeId && auth.taskScopeId !== taskId) return { error: "procedure_improvement_forbidden" } as const;
  const canPropose = Boolean(s.execution?.applicationId && s.execution.status === "completed"
    && (s.current || s.manageCurrent) && s.decision
    && s.roleMatches(s.authorities.executor) && s.task.assignedWorkforceEntityId === s.authorities.executor?.id
    && !await suspensionBlocks(db, workspaceId, taskId, s.execution.applicationId,
      "procedure_improvement_propose", principal.kind === "agent" ? principal.id : null, principal.credentialId));
  const canDecide = principal.kind === "user" && await primaryOwner(db, workspaceId, principal.id);
  if (!canPropose && !canDecide) return { error: "procedure_improvement_forbidden" } as const;
  const rows = await db.$queryRaw<ProposalRow[]>`SELECT * FROM procedure_improvement_proposals
    WHERE workspace_id=${workspaceId}::uuid AND task_id=${taskId}::uuid
    ORDER BY created_at DESC,id DESC LIMIT 51`;
  const ids = rows.slice(0, 50).map(row => row.id);
  const decisions = ids.length ? await db.$queryRaw<DecisionRow[]>`SELECT * FROM procedure_improvement_decisions WHERE proposal_id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})` : [];
  const byProposal = new Map(decisions.map(decision => [decision.proposal_id, decision]));
  return { taskId, canPropose, canDecide, materialVersion: s.materialVersion,
    executionId: s.execution?.id ?? null,
    composition: canPropose ? object(object(s.execution?.metadata).readyContextPin).procedureCompositionSnapshot ?? null : null,
    proposals: rows.slice(0, 50).map(row => visible(row, byProposal.get(row.id) ?? null)),
    truncated: rows.length > 50 };
}

export async function proposeImprovement(db: Db, workspaceId: string, taskId: string, auth: AuthContext, body: unknown) {
  const input = improvementProposalSchema.parse(body);
  requireRuntimeContent(input, "procedure_improvement.proposal", { workspaceId, taskId });
  const s = await reviewState(db, workspaceId, taskId, auth);
  if (s.error) return { error: s.error } as const;
  const principal = s.principal;
  if (!principal || auth.taskScopeId && auth.taskScopeId !== taskId
    || !s.execution?.applicationId || s.execution.status !== "completed"
    || !s.roleMatches(s.authorities.executor)
    || s.task.assignedWorkforceEntityId !== s.authorities.executor?.id)
    return { error: "procedure_improvement_forbidden" } as const;
  const requestHash = reviewDigest({ taskId, input, principal });
  const prior = (await db.$queryRaw<ProposalRow[]>`SELECT * FROM procedure_improvement_proposals
    WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
  if (prior) return prior.task_id === taskId && prior.request_hash === requestHash && prior.actor_kind === principal.kind && prior.actor_id === principal.id
    ? { proposal: visible(prior, await decisionFor(db, prior.id)), replayed: true }
    : { error: "procedure_improvement_key_conflict" } as const;
  if (await suspensionBlocks(db, workspaceId, taskId, s.execution.applicationId,
    "procedure_improvement_propose", principal.kind === "agent" ? principal.id : null, principal.credentialId))
    return { error: "native_capability_suspended" } as const;
  if ((!s.current && !s.manageCurrent) || !s.decision || input.executionId !== s.execution.id
    || input.materialVersion !== s.materialVersion) return { error: "procedure_improvement_stale" } as const;
  const pin = object(object(s.execution.metadata).readyContextPin);
  const composition = object(pin.procedureCompositionSnapshot);
  const step = Array.isArray(composition.steps) ? composition.steps.find((item: any) => item.key === input.stepKey
    && item.versionId === input.contractVersionId && item.sourceStepId === input.sourceStepId) : null;
  if (!step || composition.seal !== input.compositionSeal || pin.compositionSeal !== composition.seal
    || object(s.result?.pin).pinId !== pin.pinId || object(s.result?.pin).revision !== pin.revision
    || step.control === undefined)
    return { error: "procedure_improvement_pin_invalid" } as const;
  const contract = (await db.$queryRaw<Array<{ procedure_id: string; workspace_id: string; valid: boolean }>>`
    SELECT procedure_id,workspace_id,procedure_contract_valid(v) AS valid
    FROM procedure_contract_versions v WHERE id=${input.contractVersionId}::uuid`)[0];
  if (!contract || contract.workspace_id !== workspaceId) return { error: "procedure_improvement_version_not_found" } as const;
  if (!contract.valid) return { error: "procedure_improvement_source_changed" } as const;
  const sourceStep = await db.procedureStep.findFirst({ where: { id: input.sourceStepId, procedureId: contract.procedure_id, procedure: { workspaceId } }, select: { id: true } });
  if (!sourceStep) return { error: "procedure_improvement_step_not_found" } as const;
  const idValue = randomUUID();
  await db.$executeRaw`INSERT INTO procedure_improvement_proposals
    (id,workspace_id,task_id,execution_id,material_version,composition_seal,procedure_id,contract_version_id,source_step_id,step_key,step_snapshot,observation,proposed_instruction,applicability,rollback,actor_kind,actor_id,actor_credential_id,request_id,request_hash)
    VALUES (${idValue}::uuid,${workspaceId}::uuid,${taskId}::uuid,${input.executionId}::uuid,
      ${input.materialVersion},${input.compositionSeal},${contract.procedure_id}::uuid,
      ${input.contractVersionId}::uuid,${input.sourceStepId}::uuid,${input.stepKey},${JSON.stringify(step)}::jsonb,
      ${input.observation},${input.proposedInstruction},${input.applicability},${input.rollback},
      ${principal.kind},${principal.id}::uuid,${principal.kind === "agent" ? principal.credentialId : null}::uuid,
      ${input.requestId}::uuid,${requestHash})`;
  await db.event.create({ data: { workspaceId, taskId, type: "procedure_improvement_proposed", source: "roost",
    actorType: principal.kind, actorId: principal.id, resourceType: "procedure_improvement", resourceId: idValue,
    payload: { executionId: input.executionId, materialVersion: input.materialVersion,
      contractVersionId: input.contractVersionId, stepKey: input.stepKey } } });
  return { proposal: visible((await proposalById(db, workspaceId, taskId, idValue))!, null), replayed: false };
}

export async function decideImprovement(db: Db, workspaceId: string, taskId: string, proposalId: string, auth: AuthContext, body: unknown) {
  const input = improvementDecisionSchema.parse(body);
  requireRuntimeContent(input, "procedure_improvement.decision", { workspaceId, taskId });
  const principal = await resolveReviewPrincipal(db, workspaceId, auth);
  if (!principal || principal.kind !== "user" || auth.taskScopeId
    || !await primaryOwner(db, workspaceId, principal.id)) return { error: "procedure_improvement_forbidden" } as const;
  const proposal = await proposalById(db, workspaceId, taskId, proposalId);
  if (!proposal) return { error: "procedure_improvement_not_found" } as const;
  if (proposal.actor_kind === principal.kind && proposal.actor_id === principal.id)
    return { error: "procedure_improvement_self_review" } as const;
  const requestHash = reviewDigest({ taskId, proposalId, input, reviewerUserId: principal.id });
  const prior = await decisionFor(db, proposalId);
  if (prior) return prior.request_id === input.requestId && prior.request_hash === requestHash
    ? { proposal: visible(proposal, prior), replayed: true }
    : { error: "procedure_improvement_already_decided" } as const;
  if (version(proposal) !== input.expectedVersion) return { error: "procedure_improvement_stale" } as const;
  const s = await reviewState(db, workspaceId, taskId, auth);
  if (s.error) return { error: s.error } as const;
  const pin = object(object(s.execution?.metadata).readyContextPin);
  if ((!s.current && !s.manageCurrent) || !s.decision || s.execution?.id !== proposal.execution_id
    || s.materialVersion !== proposal.material_version || pin.compositionSeal !== proposal.composition_seal)
    return { error: "procedure_improvement_stale" } as const;
  let draftId: string | null = null;
  if (input.decision === "accept") {
    await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    const contract = (await db.$queryRaw<Array<{ valid: boolean }>>`
      SELECT procedure_contract_valid(v) AS valid FROM procedure_contract_versions v
      WHERE id=${proposal.contract_version_id}::uuid AND workspace_id=${workspaceId}::uuid
        AND procedure_id=${proposal.procedure_id}::uuid AND v.body->>'stepControlVersion'='1'`)[0];
    if (!contract?.valid) return { error: "procedure_improvement_source_changed" } as const;
    const source = await db.procedure.findFirst({ where: { id: proposal.procedure_id, workspaceId, status: "active" },
      include: { steps: { orderBy: { stepOrder: "asc" } } } });
    if (!source || !source.steps.some(step => step.id === proposal.source_step_id
      && step.instruction === object(proposal.step_snapshot).instruction)) return { error: "procedure_improvement_source_changed" } as const;
    const draftExists = await db.procedure.findFirst({ where: { workspaceId, familyId: source.familyId, status: "draft" }, select: { id: true } });
    if (draftExists) return { error: "procedure_improvement_draft_exists" } as const;
    const latest = await db.procedure.aggregate({ where: { workspaceId, familyId: source.familyId }, _max: { version: true } });
    const draft = await db.procedure.create({ data: {
      workspaceId, familyId: source.familyId, version: (latest._max.version ?? source.version) + 1,
      status: "draft", name: source.name, purpose: source.purpose, scope: source.scope,
      processId: source.processId, ownerRoleId: source.ownerRoleId, expectedResult: source.expectedResult,
      requiredTools: source.requiredTools as Prisma.InputJsonValue,
      requiredPermissions: source.requiredPermissions as Prisma.InputJsonValue,
      qualityStandardId: source.qualityStandardId,
      steps: { create: source.steps.map(step => ({ stepOrder: step.stepOrder,
        instruction: step.id === proposal.source_step_id ? proposal.proposed_instruction : step.instruction,
        stepType: step.stepType, requiredToolAdapterId: step.requiredToolAdapterId,
        expectedInput: step.expectedInput as Prisma.InputJsonValue,
        expectedOutput: step.expectedOutput as Prisma.InputJsonValue,
        validationRule: step.validationRule as Prisma.InputJsonValue,
        rollbackInstruction: step.rollbackInstruction })) }
    } });
    const context = (await organizationalContextsForEntities(workspaceId, "procedure", [source.id], db)).get(source.id);
    if (context) await replaceOrganizationalContext(db, workspaceId, "procedure", draft.id, {
      ownerDepartmentKey: context.ownerDepartment?.key ?? null,
      relatedDepartmentKeys: context.relatedDepartments.map(item => item.key),
      applicableDepartmentKeys: context.applicableDepartments.map(item => item.key),
      scopes: context.scopes
    });
    draftId = draft.id;
  }
  const decisionId = randomUUID();
  await db.$executeRaw`INSERT INTO procedure_improvement_decisions
    (id,workspace_id,proposal_id,decision,diagnosis,applicability,rollback,reviewer_user_id,draft_procedure_id,request_id,request_hash)
    VALUES (${decisionId}::uuid,${workspaceId}::uuid,${proposalId}::uuid,${input.decision},
      ${input.diagnosis},${input.applicability},${input.rollback},${principal.id}::uuid,
      ${draftId}::uuid,${input.requestId}::uuid,${requestHash})`;
  await db.event.create({ data: { workspaceId, taskId, type: "procedure_improvement_decided", source: "roost",
    actorType: "user", actorId: principal.id, resourceType: "procedure_improvement", resourceId: proposalId,
    payload: { decisionId, decision: input.decision, draftProcedureId: draftId, executionId: proposal.execution_id,
      materialVersion: proposal.material_version, sourceProcedureId: proposal.procedure_id,
      rollbackProcedureId: proposal.procedure_id } } });
  return { proposal: visible(proposal, (await decisionFor(db, proposalId))!), replayed: false };
}
