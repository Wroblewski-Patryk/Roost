import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "../../auth/api-key.middleware";
import { resolveReviewPrincipal } from "../../auth/agent-principal";
import { prisma } from "../../db/prisma";
import { companySourceEligible } from "../agent-runtime/company-source-trust";
import { taskSourceScope } from "../agent-runtime/task-source-trust";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { referenceSiteScope } from "./reference-site-finding-service";
import { referenceSitePackageDigest } from "./reference-site-package";
import {
  referenceSiteChecklistAcceptSchema, referenceSiteChecklistDigest, referenceSiteChecklistItemVersion,
  referenceSiteChecklistPreviewSchema, referenceSiteChecklistScope, referenceSiteFindingReviewSchema
} from "./reference-site-checklist-contract";

type Db = Prisma.TransactionClient;
type FindingRow = { id: string; observation_id: string; workspace_id: string; reference_site_id: string;
  actor_kind: string; actor_id: string; body: any; finding_digest: string; created_at: Date };
type ReviewRow = { id: string; workspace_id: string; task_id: string; site_id: string; finding_id: string;
  version_id: string; reviewer_user_id: string; verdict: string; rationale: string; evidence: string;
  finding_digest: string; source_review_id: string; record_revision: Date; site_metadata_digest: string;
  package_digest: string; request_id: string; request_hash: string; created_at: Date };
type DecisionRow = { id: string; workspace_id: string; task_id: string; procedure_id: string;
  owner_user_id: string; source_digest: string; preview_digest: string; request_id: string;
  request_hash: string; created_at: Date };

async function ownerId(db: Db, workspaceId: string, auth: AuthContext) {
  const principal = await resolveReviewPrincipal(db, workspaceId, auth);
  if (!principal || principal.kind !== "user" || auth.taskScopeId) return null;
  const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: principal.id }, select: { id: true } });
  const member = await db.workspaceMembership.findFirst({ where: { workspaceId, userId: principal.id, role: "owner" }, select: { userId: true } });
  return owner && member ? principal.id : null;
}

async function finding(db: Db, workspaceId: string, taskId: string, findingId: string, auth: AuthContext) {
  const row = (await db.$queryRaw<FindingRow[]>`SELECT v.id,v.observation_id,v.workspace_id,v.reference_site_id,
    v.actor_kind,v.actor_id,v.body,v.created_at,
    encode(sha256(convert_to(v.body::text,'UTF8')),'hex') AS finding_digest
    FROM finding_versions v WHERE v.observation_id=${findingId}::uuid
      AND v.workspace_id=${workspaceId}::uuid AND v.reference_site_id IS NOT NULL
    ORDER BY v.version DESC LIMIT 1`)[0];
  if (!row || row.body?.taskId !== taskId || row.body?.schemaVersion !== "roost-reference-site-finding-v1")
    return { error: "reference_site_finding_not_found" } as const;
  const current = await referenceSiteScope(db, workspaceId, taskId, row.reference_site_id, auth);
  if ("error" in current) return { error: current.error ?? "reference_site_forbidden" } as const;
  if (!current.review || !companySourceEligible(current.site, current.review, taskId, null) ||
      current.review.id !== row.body.sourceReviewId ||
      current.site.updatedAt.toISOString() !== row.body.source?.recordRevision ||
      referenceSitePackageDigest(current.metadata.package) !== row.body.source?.contentDigest ||
      row.body.source?.sourceReviewId !== current.review.id ||
      row.body.siteId !== row.reference_site_id ||
      !current.metadata.package.observations.some(item => item.id === row.body.observationId &&
        item.category === row.body.category && isDeepStrictEqual(item.evidence, row.body.evidence)))
    return { error: "reference_site_source_changed" } as const;
  const metadata = (await db.$queryRaw<Array<{ digest: string }>>`
    SELECT encode(sha256(convert_to(metadata::text,'UTF8')),'hex') AS digest
    FROM company_records WHERE id=${current.site.id}::uuid AND workspace_id=${workspaceId}::uuid`)[0];
  return { row, current, metadataDigest: metadata.digest };
}

async function reviewFor(db: Db, workspaceId: string, findingId: string) {
  return (await db.$queryRaw<ReviewRow[]>`SELECT * FROM reference_site_finding_reviews
    WHERE workspace_id=${workspaceId}::uuid AND finding_id=${findingId}::uuid`)[0] ?? null;
}

export async function reviewReferenceSiteFinding(workspaceId: string, taskId: string, siteId: string,
  findingId: string, auth: AuthContext, raw: unknown) {
  const input = referenceSiteFindingReviewSchema.parse(raw);
  requireRuntimeContent(input, "reference_site.finding.review", { workspaceId, taskId });
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    const reviewerId = await ownerId(db, workspaceId, auth);
    if (!reviewerId) return { error: "reference_site_review_forbidden" } as const;
    const hash = referenceSiteChecklistDigest({ workspaceId, taskId, siteId, findingId, reviewerId, input });
    const priorRequest = (await db.$queryRaw<ReviewRow[]>`SELECT * FROM reference_site_finding_reviews
      WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
    if (priorRequest) return priorRequest.request_hash === hash && priorRequest.finding_id === findingId
      ? { review: priorRequest, replayed: true } : { error: "reference_site_review_request_conflict" } as const;
    const candidate = await finding(db, workspaceId, taskId, findingId, auth);
    if (!candidate.row || !candidate.current || !candidate.metadataDigest) return candidate;
    if (candidate.row.reference_site_id !== siteId || candidate.row.actor_kind !== "agent" ||
        candidate.row.actor_id === reviewerId) return { error: "reference_site_review_forbidden" } as const;
    if (candidate.row.finding_digest !== input.expectedFindingDigest)
      return { error: "reference_site_finding_changed" } as const;
    if (await reviewFor(db, workspaceId, findingId)) return { error: "reference_site_already_reviewed" } as const;
    const id = randomUUID();
    await db.$executeRaw`INSERT INTO reference_site_finding_reviews
      (id,workspace_id,task_id,site_id,finding_id,version_id,reviewer_user_id,verdict,rationale,evidence,
       finding_digest,source_review_id,record_revision,site_metadata_digest,package_digest,request_id,request_hash)
      VALUES (${id}::uuid,${workspaceId}::uuid,${taskId}::uuid,${siteId}::uuid,${findingId}::uuid,
        ${candidate.row.id}::uuid,${reviewerId}::uuid,${input.verdict},${input.rationale},${input.evidence},
        ${candidate.row.finding_digest},${candidate.current.review!.id}::uuid,${candidate.current.site.updatedAt},
        ${candidate.metadataDigest},${candidate.row.body.source.contentDigest},${input.requestId}::uuid,${hash})`;
    await db.event.create({ data: { workspaceId, taskId, type: "reference_site_finding_reviewed", source: "roost",
      actorType: "user", actorId: reviewerId, resourceType: "capability_observation", resourceId: findingId,
      payload: { reviewId: id, verdict: input.verdict, siteId, findingDigest: candidate.row.finding_digest } } });
    return { review: (await reviewFor(db, workspaceId, findingId))!, replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

type ItemInput = ReturnType<typeof referenceSiteChecklistPreviewSchema.parse>["items"][number];
type PreparedItem = ItemInput & { source: { taskId: string; siteId: string; findingId: string;
  findingVersionId: string; findingDigest: string; reviewId: string; sourceReviewId: string;
  packageDigest: string; metadataDigest: string; recordRevision: string; observationId: string;
  evidenceScopes: string[] } };
async function preparedItems(db: Db, workspaceId: string, taskId: string, auth: AuthContext,
  items: ItemInput[]): Promise<{ items: PreparedItem[] } | { error: string }> {
  if (!await taskSourceScope(db, workspaceId, taskId)) return { error: "reference_site_checklist_forbidden" } as const;
  const prepared: PreparedItem[] = [];
  for (const item of items) {
    const row = (await db.$queryRaw<Array<{ reference_site_id: string }>>`
      SELECT reference_site_id FROM finding_versions WHERE observation_id=${item.findingId}::uuid
        AND workspace_id=${workspaceId}::uuid AND reference_site_id IS NOT NULL LIMIT 1`)[0];
    if (!row) return { error: "reference_site_finding_not_found" } as const;
    const candidate = await finding(db, workspaceId, taskId, item.findingId, auth);
    if (!candidate.row || !candidate.current || !candidate.metadataDigest)
      return { error: candidate.error ?? "reference_site_finding_not_found" };
    const review = await reviewFor(db, workspaceId, item.findingId);
    if (!review || review.verdict !== "confirmed" || review.version_id !== candidate.row.id ||
        review.finding_digest !== candidate.row.finding_digest ||
        review.site_id !== candidate.row.reference_site_id || review.task_id !== taskId ||
        review.source_review_id !== candidate.current.review?.id ||
        review.record_revision.getTime() !== candidate.current.site.updatedAt.getTime() ||
        review.site_metadata_digest !== candidate.metadataDigest ||
        review.package_digest !== candidate.row.body.source.contentDigest)
      return { error: "reference_site_independent_review_required" } as const;
    prepared.push({ ...item, source: { taskId, siteId: candidate.row.reference_site_id,
      findingId: item.findingId, findingVersionId: candidate.row.id, findingDigest: candidate.row.finding_digest,
      reviewId: review.id, sourceReviewId: review.source_review_id,
      packageDigest: review.package_digest, metadataDigest: review.site_metadata_digest,
      recordRevision: candidate.current.site.updatedAt.toISOString(),
      observationId: candidate.row.body.observationId,
      evidenceScopes: (candidate.row.body.evidence as Array<{ scope: string }>).map(value => value.scope) } });
  }
  return { items: prepared };
}

export async function previewReferenceSiteChecklist(workspaceId: string, taskId: string, auth: AuthContext, raw: unknown) {
  const input = referenceSiteChecklistPreviewSchema.parse(raw);
  requireRuntimeContent(input, "reference_site.checklist.preview", { workspaceId, taskId });
  return prisma.$transaction(async db => {
    const owner = await ownerId(db, workspaceId, auth);
    if (!owner) return { error: "reference_site_checklist_forbidden" } as const;
    const prepared = await preparedItems(db, workspaceId, taskId, auth, input.items);
    if ("error" in prepared) return prepared;
    const preview = { schemaVersion: "roost-reference-site-checklist-preview-v1", taskId,
      ownerUserId: owner, name: "Website evidence checklist", items: prepared.items };
    return { preview, digest: referenceSiteChecklistDigest(preview) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function acceptReferenceSiteChecklist(workspaceId: string, taskId: string, auth: AuthContext, raw: unknown) {
  const input = referenceSiteChecklistAcceptSchema.parse(raw);
  requireRuntimeContent(input, "reference_site.checklist.accept", { workspaceId, taskId });
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;
    const owner = await ownerId(db, workspaceId, auth);
    if (!owner) return { error: "reference_site_checklist_forbidden" } as const;
    const hash = referenceSiteChecklistDigest({ workspaceId, taskId, owner, input });
    const prior = (await db.$queryRaw<DecisionRow[]>`SELECT * FROM reference_site_checklist_decisions
      WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid`)[0];
    if (prior) return prior.request_hash === hash && prior.task_id === taskId
      ? { decision: prior, replayed: true } : { error: "reference_site_checklist_request_conflict" } as const;
    const prepared = await preparedItems(db, workspaceId, taskId, auth, input.items);
    if ("error" in prepared) return prepared;
    const preview = { schemaVersion: "roost-reference-site-checklist-preview-v1", taskId,
      ownerUserId: owner, name: "Website evidence checklist", items: prepared.items };
    const previewDigest = referenceSiteChecklistDigest(preview);
    if (previewDigest !== input.expectedDigest) return { error: "reference_site_checklist_preview_stale" } as const;
    const priorActive = await db.procedure.findFirst({ where: { workspaceId, scope: referenceSiteChecklistScope, status: "active" } });
    const familyId = priorActive?.familyId ?? randomUUID();
    const latest = await db.procedure.aggregate({ where: { workspaceId, familyId }, _max: { version: true } });
    const procedure = await db.procedure.create({ data: {
      workspaceId, familyId, version: (latest._max.version ?? 0) + 1, status: "draft",
      name: "Website evidence checklist", purpose: "Verify applicable website evidence before supervised use.",
      scope: referenceSiteChecklistScope, expectedResult: "Each applicable item has independently reviewable acceptance evidence.",
      requiredTools: [], requiredPermissions: [], steps: { create: prepared.items.map((item, index) => ({
        stepOrder: index + 1, instruction: item.instruction, stepType: "manual",
        expectedInput: { description: item.expectedInput }, expectedOutput: { description: item.expectedOutput },
        validationRule: { schemaVersion: referenceSiteChecklistItemVersion, itemId: item.itemId,
          applicability: item.applicability, acceptanceCriterion: item.acceptanceCriterion,
          status: "approved", ownerUserId: owner, source: item.source },
        rollbackInstruction: item.rollback
      })) }
    } });
    const source = (await db.$queryRaw<Array<{ digest: string }>>`
      SELECT procedure_contract_source(${procedure.id}::uuid) AS digest`)[0];
    const decisionId = randomUUID();
    await db.$executeRaw`INSERT INTO reference_site_checklist_decisions
      (id,workspace_id,task_id,procedure_id,owner_user_id,source_digest,preview_digest,request_id,request_hash)
      VALUES (${decisionId}::uuid,${workspaceId}::uuid,${taskId}::uuid,${procedure.id}::uuid,
        ${owner}::uuid,${source.digest},${previewDigest},${input.requestId}::uuid,${hash})`;
    if (priorActive) await db.procedure.update({ where: { id: priorActive.id }, data: { status: "retired" } });
    await db.procedure.update({ where: { id: procedure.id }, data: { status: "active" } });
    await db.event.create({ data: { workspaceId, taskId, type: "reference_site_checklist_accepted", source: "roost",
      actorType: "user", actorId: owner, resourceType: "Procedure", resourceId: procedure.id,
      payload: { decisionId, familyId, version: procedure.version, previewDigest,
        rollbackProcedureId: priorActive?.id ?? null } } });
    return { decision: (await db.$queryRaw<DecisionRow[]>`SELECT * FROM reference_site_checklist_decisions
      WHERE id=${decisionId}::uuid`)[0], procedureId: procedure.id, version: procedure.version, replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function referenceSiteChecklistRead(workspaceId: string, taskId: string, auth: AuthContext) {
  return prisma.$transaction(async db => {
    const principal = await resolveReviewPrincipal(db, workspaceId, auth);
    if (!principal || !await taskSourceScope(db, workspaceId, taskId,
      principal.kind === "agent" ? principal.id : undefined))
      return { error: "reference_site_checklist_forbidden" } as const;
    if (principal.kind === "user" && !await ownerId(db, workspaceId, auth))
      return { error: "reference_site_checklist_forbidden" } as const;
    const active = await db.procedure.findFirst({ where: { workspaceId, scope: referenceSiteChecklistScope, status: "active" },
      include: { steps: { orderBy: { stepOrder: "asc" } } } });
    if (!active) return { status: "none", procedure: null };
    const decision = (await db.$queryRaw<DecisionRow[]>`SELECT * FROM reference_site_checklist_decisions
      WHERE procedure_id=${active.id}::uuid AND workspace_id=${workspaceId}::uuid`)[0];
    if (!decision) return { error: "reference_site_checklist_invalid" } as const;
    const checks = await Promise.all(active.steps.map(async step => {
      const rule = step.validationRule as any;
      const source = rule?.source;
      if (!source || source.taskId !== taskId) return false;
      const candidate = await finding(db, workspaceId, taskId, source.findingId, auth);
      const review = await reviewFor(db, workspaceId, source.findingId);
      return Boolean(candidate.row && candidate.current && candidate.row.finding_digest === source.findingDigest &&
        candidate.metadataDigest === source.metadataDigest && candidate.current.review?.id === source.sourceReviewId &&
        review?.id === source.reviewId && review.verdict === "confirmed" &&
        review.version_id === source.findingVersionId && review.finding_digest === source.findingDigest &&
        review.site_metadata_digest === source.metadataDigest && review.task_id === taskId);
    }));
    const current = checks.every(Boolean);
    if (principal.kind === "agent" && !current) return { status: "stale", procedure: null };
    const result = { status: current ? "active" : "stale", procedure: { id: active.id, familyId: active.familyId,
      name: active.name, version: active.version, decisionId: decision.id,
      items: active.steps.map(step => ({ id: step.id, order: step.stepOrder, instruction: step.instruction,
        expectedInput: step.expectedInput, expectedOutput: step.expectedOutput,
        validationRule: step.validationRule, rollbackInstruction: step.rollbackInstruction })) } };
    requireRuntimeContent(result, "reference_site.checklist.read", { workspaceId, taskId });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
