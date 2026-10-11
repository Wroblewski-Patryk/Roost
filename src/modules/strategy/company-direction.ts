import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

type Db = Prisma.TransactionClient;
type SubjectType = "task" | "decision";

export class DirectionError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

const fail = (status: number, code: string): never => { throw new DirectionError(status, code); };
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function currentCompanyDirection(db: Db, workspaceId: string) {
  const head = await db.companyDirectionHead.findUnique({ where: { workspaceId } });
  if (!head?.currentVersionId) return null;
  return db.companyDirectionVersion.findFirst({ where: { id: head.currentVersionId, workspaceId, status: "adopted" },
    select: { id: true, workspaceId: true, version: true, text: true, provenance: true, adoptedAt: true, adoptedByUserId: true } });
}

export async function ownerDirectionView(workspaceId: string) {
  return prisma.$transaction(async db => {
    const [current, versions, comparisons] = await Promise.all([
      currentCompanyDirection(db, workspaceId),
      db.companyDirectionVersion.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.companyDirectionComparison.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 50 })
    ]);
    const taskIds = comparisons.filter(item => item.subjectType === "task").map(item => item.subjectId);
    const decisionIds = comparisons.filter(item => item.subjectType === "decision").map(item => item.subjectId);
    const [tasks, decisions, previews] = await Promise.all([
      db.task.findMany({ where: { workspaceId, id: { in: taskIds } }, select: { id: true, updatedAt: true, status: true } }),
      db.decision.findMany({ where: { workspaceId, id: { in: decisionIds } }, select: { id: true, updatedAt: true, status: true } }),
      decisionIds.length ? db.$queryRaw<Array<{ decision_id: string; id: string }>>`
        SELECT DISTINCT ON (decision_id) decision_id, id FROM decision_impact_previews
        WHERE workspace_id=${workspaceId}::uuid AND decision_id IN (${Prisma.join(decisionIds.map(id => Prisma.sql`${id}::uuid`))})
        ORDER BY decision_id, version DESC` : Promise.resolve([])
    ]);
    const subjectRows = new Map([...tasks, ...decisions].map(row => [row.id, row]));
    const previewIds = new Map(previews.map(row => [row.decision_id, row.id]));
    return { current, versions, comparisons: comparisons.map(item => {
      const row = subjectRows.get(item.subjectId);
      const currentEvidence = current?.id === item.directionVersionId && !!row && row.status !== "archived"
        && row.updatedAt.getTime() === item.subjectRevision.getTime()
        && (item.subjectType !== "decision" || (item.subjectGovernancePreviewId ?? null) === (previewIds.get(item.subjectId) ?? null));
      return { ...item, currentEvidence, staleReason: currentEvidence ? null : "direction_or_subject_changed" };
    }) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

async function impactSnapshot(db: Db, workspaceId: string, draftId: string, currentId: string | null) {
  const [goals, projects, tasks, procedures, decisions] = await Promise.all([
    db.goal.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.project.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, name: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.task.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.procedure.findMany({ where: { workspaceId, status: "active" }, select: { id: true, name: true, updatedAt: true }, orderBy: { id: "asc" } }),
    db.decision.findMany({ where: { workspaceId, status: { not: "archived" } }, select: { id: true, title: true, updatedAt: true }, orderBy: { id: "asc" } })
  ]);
  const groups = { goals, projects, tasks, procedures, decisions };
  const counts: Record<string, number> = {}, examples: Record<string, Array<{ id: string; title: string }>> = {};
  for (const [name, rows] of Object.entries(groups)) {
    counts[name] = rows.length;
    examples[name] = rows.slice(0, 5).map(row => ({ id: row.id, title: "title" in row ? row.title : row.name }));
  }
  return {
    draftId, expectedCurrentId: currentId, counts, examples,
    consequences: ["review_linked_goals", "review_linked_projects", "review_open_tasks", "review_active_procedures", "review_decisions", "decision_acceptance_requires_comparison", "revalidate_agent_ready"],
    impactDigest: sha({ draftId, currentId, groups: Object.fromEntries(Object.entries(groups).map(([name, rows]) => [name,
      rows.map(row => [row.id, row.updatedAt.toISOString()])])) })
  };
}

export async function createDirectionDraft(workspaceId: string, userId: string, text: string, provenance: string) {
  const owner = await prisma.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
  if (!owner) fail(403, "direction_owner_required");
  return prisma.companyDirectionVersion.create({ data: { workspaceId, createdByUserId: userId, text, provenance, status: "draft" } });
}

export async function previewDirectionDraft(workspaceId: string, userId: string, draftId: string) {
  return prisma.$transaction(async db => {
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
    if (!owner) fail(403, "direction_owner_required");
    const draft = await db.companyDirectionVersion.findFirst({ where: { id: draftId, workspaceId, status: "draft" } });
    if (!draft) fail(404, "direction_draft_not_found");
    const current = await currentCompanyDirection(db, workspaceId);
    const impact = await impactSnapshot(db, workspaceId, draftId, current?.id ?? null);
    const preview = await db.companyDirectionImpactPreview.create({ data: { workspaceId, draftId,
      expectedCurrentId: impact.expectedCurrentId, impactDigest: impact.impactDigest, ownerUserId: userId,
      expiresAt: new Date(Date.now() + 15 * 60_000) } });
    return { ...impact, previewId: preview.id, expiresAt: preview.expiresAt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function adoptDirectionDraft(workspaceId: string, userId: string, draftId: string, previewId: string, expectedCurrentId: string | null, impactDigest: string) {
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid AND owner_user_id=${userId}::uuid FOR UPDATE`;
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
    if (!owner) fail(403, "direction_owner_required");
    const draft = await db.companyDirectionVersion.findFirst({ where: { id: draftId, workspaceId, status: "draft" } });
    if (!draft) fail(409, "direction_draft_stale");
    const head = await db.companyDirectionHead.findUnique({ where: { workspaceId } });
    const currentId = head?.currentVersionId ?? null;
    if (currentId !== expectedCurrentId) fail(409, "direction_current_changed");
    const receipt = await db.companyDirectionImpactPreview.findFirst({ where: { id: previewId, workspaceId, draftId,
      expectedCurrentId, impactDigest, ownerUserId: userId, consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!receipt) throw new DirectionError(409, "direction_preview_required");
    const impact = await impactSnapshot(db, workspaceId, draftId, currentId);
    if (impact.impactDigest !== impactDigest) fail(409, "direction_impact_changed");
    await db.companyDirectionImpactPreview.update({ where: { id: receipt.id }, data: { consumedAt: new Date() } });
    const now = new Date();
    if (currentId) await db.companyDirectionVersion.update({ where: { id: currentId }, data: { status: "superseded" } });
    const adopted = await db.companyDirectionVersion.update({ where: { id: draftId }, data: {
      version: head?.nextVersion ?? 1, status: "adopted", previousVersionId: currentId,
      impactDigest, adoptedByUserId: userId, adoptedAt: now
    } });
    await db.companyDirectionHead.upsert({ where: { workspaceId }, create: { workspaceId, currentVersionId: draftId, nextVersion: 2 },
      update: { currentVersionId: draftId, nextVersion: { increment: 1 } } });
    await db.event.create({ data: { workspaceId, type: "company_direction_adopted", source: "roost", resourceType: "company_direction", resourceId: draftId,
      payload: { version: adopted.version, previousVersionId: currentId, impactDigest, counts: impact.counts, adoptedByUserId: userId } } });
    return adopted;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
}

async function subject(db: Db, workspaceId: string, type: SubjectType, id: string) {
  if (type === "task") {
    const row = await db.task.findFirst({ where: { id, workspaceId, status: { not: "archived" } }, select: { id: true, title: true, updatedAt: true } });
    return row;
  }
  return db.decision.findFirst({ where: { id, workspaceId, status: { not: "archived" } }, select: { id: true, title: true, updatedAt: true } });
}

async function governancePreviewId(db: Db, workspaceId: string, decisionId: string) {
  const rows = await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM decision_impact_previews
    WHERE workspace_id=${workspaceId}::uuid AND decision_id=${decisionId}::uuid ORDER BY version DESC LIMIT 1`;
  return rows[0]?.id ?? null;
}

export async function createDirectionComparison(workspaceId: string, userId: string, input: {
  subjectType: SubjectType; subjectId: string; outcome: string; evidence: string; assessment: "aligned" | "conflict";
}) {
  return prisma.$transaction(async db => {
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
    if (!owner) fail(403, "direction_owner_required");
    const current = await currentCompanyDirection(db, workspaceId);
    if (!current) throw new DirectionError(409, "direction_adoption_required");
    const row = await subject(db, workspaceId, input.subjectType, input.subjectId);
    if (!row) throw new DirectionError(404, "direction_subject_not_found");
    const subjectGovernancePreviewId = input.subjectType === "decision" ? await governancePreviewId(db, workspaceId, input.subjectId) : null;
    return db.companyDirectionComparison.create({ data: { workspaceId, directionVersionId: current.id,
      subjectType: input.subjectType, subjectId: input.subjectId, subjectRevision: row.updatedAt,
      subjectGovernancePreviewId, subjectTitle: row.title,
      outcome: input.outcome, evidence: input.evidence, assessment: input.assessment, createdByUserId: userId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resolveDirectionComparison(workspaceId: string, userId: string, comparisonId: string,
  input: { action: "confirm_aligned" | "accept_exception" | "reject_exception"; rationale: string }) {
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM workspaces WHERE id=${workspaceId}::uuid AND owner_user_id=${userId}::uuid FOR UPDATE`;
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: userId }, select: { id: true } });
    if (!owner) fail(403, "direction_owner_required");
    const comparison = await db.companyDirectionComparison.findFirst({ where: { id: comparisonId, workspaceId } });
    if (!comparison) throw new DirectionError(404, "direction_comparison_not_found");
    if (comparison.status !== "proposed") fail(409, "direction_comparison_decided");
    const current = await currentCompanyDirection(db, workspaceId);
    if (current?.id !== comparison.directionVersionId) fail(409, "direction_version_changed");
    const row = await subject(db, workspaceId, comparison.subjectType as SubjectType, comparison.subjectId);
    if (!row || row.updatedAt.getTime() !== comparison.subjectRevision.getTime()) fail(409, "direction_subject_changed");
    if (comparison.subjectType === "decision" &&
      await governancePreviewId(db, workspaceId, comparison.subjectId) !== comparison.subjectGovernancePreviewId)
      fail(409, "direction_impact_changed");
    if (comparison.assessment === "aligned" && input.action !== "confirm_aligned" ||
      comparison.assessment === "conflict" && input.action === "confirm_aligned") fail(400, "direction_resolution_mismatch");
    const status = input.action === "confirm_aligned" ? "aligned" : input.action === "accept_exception" ? "exception_accepted" : "exception_rejected";
    const decided = await db.companyDirectionComparison.update({ where: { id: comparison.id }, data: { status,
      exceptionRationale: input.rationale, decidedByUserId: userId, decidedAt: new Date() } });
    await db.event.create({ data: { workspaceId, type: "company_direction_comparison_resolved", source: "roost", resourceType: "company_direction_comparison", resourceId: comparison.id,
      payload: { directionVersionId: comparison.directionVersionId, subjectType: comparison.subjectType, subjectId: comparison.subjectId,
        assessment: comparison.assessment, status, decidedByUserId: userId } } });
    return decided;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// Every governed decision acceptance after a purpose is adopted must carry a
// current, owner-resolved comparison. Legacy workspaces with no adopted purpose
// retain their existing governance path.
export async function directionDecisionAcceptanceError(db: Db, workspaceId: string, decisionId: string, previewId: string) {
  const current = await currentCompanyDirection(db, workspaceId);
  if (!current) return null;
  const row = await db.decision.findFirst({ where: { id: decisionId, workspaceId }, select: { updatedAt: true } });
  if (!row) return "direction_subject_not_found";
  const comparisons = await db.companyDirectionComparison.findMany({ where: { workspaceId, directionVersionId: current.id,
    subjectType: "decision", subjectId: decisionId, subjectGovernancePreviewId: previewId,
    subjectRevision: row.updatedAt, OR: [{ assessment: "aligned", status: "aligned" }, { assessment: "conflict", status: "exception_accepted" }] },
    select: { id: true }, take: 1 });
  return comparisons.length ? null : "direction_comparison_required";
}
