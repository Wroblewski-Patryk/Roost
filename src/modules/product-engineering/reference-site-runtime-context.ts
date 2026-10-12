import { Prisma } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { companySourceEligible, companySourceReviews } from "../agent-runtime/company-source-trust";
import { taskSourceScope } from "../agent-runtime/task-source-trust";
import { referenceSiteChecklistItemVersion, referenceSiteChecklistScope } from "./reference-site-checklist-contract";
import { configuredReferenceSiteUrl, referenceSiteMetadata } from "./reference-site-contract";
import { referenceSitePackageDigest } from "./reference-site-package";

type Db = Prisma.TransactionClient;
type Receipt = { id: string; task_id: string; procedure_id: string };
type Finding = { id: string; reference_site_id: string; body: any; finding_digest: string };
type Review = { id: string; task_id: string; site_id: string; finding_id: string; version_id: string;
  verdict: string; finding_digest: string; source_review_id: string; record_revision: Date;
  site_metadata_digest: string; package_digest: string };

// This is a server-side projection for the one assigned task. It is deliberately
// separate from generic Procedure admission and never grants a Worker tool.
export async function referenceSiteChecklistForExecution(watched: Db, raw: Db, workspaceId: string,
  taskId: string, agentId: string, procedureId: string, version: string) {
  if (!await taskSourceScope(watched, workspaceId, taskId, agentId)) return null;
  const procedure = await watched.procedure.findFirst({ where: { id: procedureId, workspaceId,
    scope: referenceSiteChecklistScope, status: "active" }, include: { steps: { orderBy: { stepOrder: "asc" } } } });
  if (!procedure || String(procedure.version) !== version || procedure.steps.length < 1 || procedure.steps.length > 2) return null;
  const receipt = (await raw.$queryRaw<Receipt[]>`SELECT id,task_id,procedure_id
    FROM reference_site_checklist_decisions WHERE workspace_id=${workspaceId}::uuid
      AND procedure_id=${procedureId}::uuid AND task_id=${taskId}::uuid`)[0];
  if (!receipt) return null;
  const siteIds = procedure.steps.map(step => (step.validationRule as any)?.source?.siteId);
  if (siteIds.some(id => typeof id !== "string")) return null;
  const sites = await watched.companyRecord.findMany({ where: { workspaceId, id: { in: siteIds },
    recordType: "reference_site", applicationId: null, projectId: null, clientId: null,
    status: { in: ["active", "approved"] } } });
  const reviews = await companySourceReviews(watched, workspaceId, taskId, siteIds);
  const items = [];
  for (const step of procedure.steps) {
    const rule = step.validationRule as any, link = rule?.source;
    if (rule?.schemaVersion !== referenceSiteChecklistItemVersion || rule?.status !== "approved" ||
      link?.taskId !== taskId || typeof link.siteId !== "string" || typeof link.findingId !== "string") return null;
    const site = sites.find(row => row.id === link.siteId), siteReview = reviews.get(link.siteId);
    if (!site || !companySourceEligible(site, siteReview, taskId, null) || siteReview!.id !== link.sourceReviewId ||
      site.updatedAt.toISOString() !== link.recordRevision) return null;
    const metadata = referenceSiteMetadata.safeParse(site.metadata);
    if (!metadata.success || !configuredReferenceSiteUrl(metadata.data.referenceUrl) ||
      metadata.data.package.source.publishedUrl !== metadata.data.referenceUrl ||
      referenceSitePackageDigest(metadata.data.package) !== link.packageDigest) return null;
    const metadataDigest = (await raw.$queryRaw<Array<{ digest: string }>>`
      SELECT encode(sha256(convert_to(metadata::text,'UTF8')),'hex') AS digest
      FROM company_records WHERE id=${site.id}::uuid AND workspace_id=${workspaceId}::uuid`)[0];
    if (!metadataDigest || metadataDigest.digest !== link.metadataDigest) return null;
    const finding = (await raw.$queryRaw<Finding[]>`SELECT v.id,v.reference_site_id,v.body,
      encode(sha256(convert_to(v.body::text,'UTF8')),'hex') AS finding_digest
      FROM finding_versions v WHERE v.observation_id=${link.findingId}::uuid
        AND v.workspace_id=${workspaceId}::uuid AND v.reference_site_id=${site.id}::uuid
      ORDER BY v.version DESC LIMIT 1`)[0];
    const review = (await raw.$queryRaw<Review[]>`SELECT id,task_id,site_id,finding_id,version_id,
      verdict,finding_digest,source_review_id,record_revision,site_metadata_digest,package_digest
      FROM reference_site_finding_reviews WHERE workspace_id=${workspaceId}::uuid
        AND finding_id=${link.findingId}::uuid`)[0];
    const observation = metadata.data.package.observations.find(value => value.id === link.observationId);
    if (!finding || finding.id !== link.findingVersionId || finding.finding_digest !== link.findingDigest ||
      finding.body?.taskId !== taskId || finding.body?.siteId !== site.id ||
      finding.body?.sourceReviewId !== siteReview!.id || finding.body?.source?.contentDigest !== link.packageDigest ||
      finding.body?.source?.recordRevision !== link.recordRevision ||
      finding.body?.observationId !== link.observationId || !observation ||
      observation.category !== finding.body.category ||
      !isDeepStrictEqual(observation.evidence, finding.body.evidence) ||
      !review || review.id !== link.reviewId || review.task_id !== taskId || review.site_id !== site.id ||
      review.finding_id !== link.findingId || review.version_id !== finding.id || review.verdict !== "confirmed" ||
      review.finding_digest !== finding.finding_digest || review.source_review_id !== siteReview!.id ||
      review.record_revision.getTime() !== site.updatedAt.getTime() ||
      review.site_metadata_digest !== metadataDigest.digest || review.package_digest !== link.packageDigest) return null;
    items.push({ id: step.id, order: step.stepOrder, itemId: rule.itemId,
      instruction: step.instruction, applicability: rule.applicability,
      acceptanceCriterion: rule.acceptanceCriterion,
      expectedInput: (step.expectedInput as any)?.description,
      expectedOutput: (step.expectedOutput as any)?.description,
      rollback: step.rollbackInstruction,
      source: { taskId, siteId: site.id, findingId: link.findingId,
        findingVersionId: finding.id, findingDigest: finding.finding_digest,
        reviewId: review.id, sourceReviewId: siteReview!.id,
        packageDigest: link.packageDigest, metadataDigest: metadataDigest.digest,
        recordRevision: site.updatedAt.toISOString(), observationId: observation.id,
        providerVersion: metadata.data.providerVersion,
        versionId: metadata.data.package.source.versionId,
        publishedUrl: metadata.data.package.source.publishedUrl },
      finding: { observed: finding.body.observed, interpretation: finding.body.interpretation,
        uncertainty: finding.body.uncertainty, applicability: finding.body.applicability },
      observation: { id: observation.id, category: observation.category, route: observation.route,
        language: observation.language, text: observation.text, evidence: observation.evidence } });
  }
  return { schemaVersion: "roost-reference-site-execution-context-v1", workspaceId, taskId, agentId,
    procedure: { id: procedure.id, familyId: procedure.familyId, version: procedure.version,
      decisionId: receipt.id }, items };
}
