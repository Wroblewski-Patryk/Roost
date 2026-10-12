import { createHash, randomUUID } from "node:crypto";
import { Prisma, type CompanyRecord } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { resolveReviewPrincipal, type ReviewActor } from "../../auth/agent-principal";
import { companySourceEligible, companySourceReviews } from "../agent-runtime/company-source-trust";
import { taskSourceScope } from "../agent-runtime/task-source-trust";
import { requireRuntimeContent } from "../agent-runtime/runtime-redaction-policy";
import { configuredReferenceSiteUrl, referenceSiteFindingInput, referenceSiteMetadata } from "./reference-site-contract";
import { referenceSitePackageDigest } from "./reference-site-package";

type Db = Prisma.TransactionClient;
type Principal = NonNullable<Awaited<ReturnType<typeof resolveReviewPrincipal>>>;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const content = (value: unknown) => JSON.stringify(value);

export async function referenceSiteScope(db: Db, workspaceId: string, taskId: string, siteId: string, actor: ReviewActor,
  allowOwnerPreview = false) {
  const principal = await resolveReviewPrincipal(db, workspaceId, actor);
  if (!principal) return { error: "reference_site_forbidden" } as const;
  if (principal.kind === "user") {
    const owner = await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: principal.id }, select: { id: true } });
    if (!owner) return { error: "reference_site_forbidden" } as const;
  }
  const task = await taskSourceScope(db, workspaceId, taskId, principal.kind === "agent" ? principal.id : undefined);
  if (!task) return { error: "reference_site_forbidden" } as const;
  const site = await db.companyRecord.findFirst({ where: { id: siteId, workspaceId, recordType: "reference_site",
    applicationId: null, projectId: null, clientId: null, status: { in: ["active", "approved"] } } });
  if (!site) return { error: "reference_site_not_found" } as const;
  const metadata = referenceSiteMetadata.safeParse(site.metadata);
  if (!metadata.success || !configuredReferenceSiteUrl(metadata.data.referenceUrl)) return { error: "reference_site_configuration_invalid" } as const;
  const reviews = await companySourceReviews(db, workspaceId, taskId, [siteId]);
  const review = reviews.get(siteId);
  if (!companySourceEligible(site, review, taskId, null) && !(allowOwnerPreview && principal.kind === "user"))
    return { error: "reference_site_approval_required" } as const;
  return { principal, task, site, metadata: metadata.data, review: review ?? null };
}

function sourceFor(site: CompanyRecord, metadata: ReturnType<typeof referenceSiteMetadata.parse>, reviewId: string | null) {
  return { url: metadata.referenceUrl, providerVersion: metadata.providerVersion,
    versionStatus: "provider_saved_version", version: metadata.package.source,
    recordRevision: site.updatedAt.toISOString(), sourceReviewId: reviewId,
    preparedAt: metadata.package.preparedAt, contentDigest: referenceSitePackageDigest(metadata.package) };
}

export async function referenceSiteList(workspaceId: string, taskId: string, actor: ReviewActor) {
  return prisma.$transaction(async db => {
    const principal = await resolveReviewPrincipal(db, workspaceId, actor);
    if (!principal) return { error: "reference_site_forbidden" };
    if (principal.kind === "user" && !await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: principal.id } }))
      return { error: "reference_site_forbidden" };
    if (!await taskSourceScope(db, workspaceId, taskId, principal.kind === "agent" ? principal.id : undefined))
      return { error: "reference_site_forbidden" };
    const sites = await db.companyRecord.findMany({ where: { workspaceId, recordType: "reference_site", status: { not: "archived" } },
      orderBy: { title: "asc" }, take: 3 });
    const reviews = await companySourceReviews(db, workspaceId, taskId, sites.map(site => site.id));
    const items = sites.flatMap(site => {
      const metadata = referenceSiteMetadata.safeParse(site.metadata);
      if (!metadata.success || !configuredReferenceSiteUrl(metadata.data.referenceUrl)) return [];
      const review = reviews.get(site.id);
      const approved = companySourceEligible(site, review, taskId, null);
      if (principal.kind === "agent" && !approved) return [];
      return [{ id: site.id, title: site.title, url: metadata.data.referenceUrl,
        providerVersion: metadata.data.providerVersion, recordRevision: site.updatedAt.toISOString(),
        packageDigest: referenceSitePackageDigest(metadata.data.package),
        versionNumber: metadata.data.package.source.versionNumber,
        commitSha: metadata.data.package.source.commitSha,
        observationCount: metadata.data.package.observations.length,
        approved, sourceReviewId: approved ? review!.id : null }];
    });
    requireRuntimeContent(items, "reference_site.list", { workspaceId });
    return { items, reviewEnvironment: process.env.NODE_ENV === "test" ? "isolated_test" : "production" };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function referenceSitePackageRead(workspaceId: string, taskId: string, siteId: string, actor: ReviewActor) {
  const current = await prisma.$transaction(db => referenceSiteScope(db, workspaceId, taskId, siteId, actor, true),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  if ("error" in current) return current;
  const value = { siteId, taskId, title: current.site.title, package: current.metadata.package,
    source: sourceFor(current.site, current.metadata, current.review?.id ?? null), status: "unverified" };
  requireRuntimeContent(value, "reference_site.package", { workspaceId });
  return value;
}

export async function referenceSiteCreateFinding(workspaceId: string, taskId: string, siteId: string,
  actor: ReviewActor, raw: unknown) {
  const input = referenceSiteFindingInput.parse(raw);
  const initial = await prisma.$transaction(db => referenceSiteScope(db, workspaceId, taskId, siteId, actor),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  if ("error" in initial) return initial;
  if (initial.principal.kind !== "agent") return { error: "reference_site_agent_required" };
  if (initial.site.updatedAt.toISOString() !== input.siteRevision || initial.review?.id !== input.sourceReviewId)
    return { error: "reference_site_source_changed" };
  const packageDigest = referenceSitePackageDigest(initial.metadata.package);
  if (packageDigest !== input.packageDigest)
    return { error: "reference_site_source_changed" };
  const observation = initial.metadata.package.observations.find(item => item.id === input.observationId);
  if (!observation || observation.category !== input.category)
    return { error: "reference_site_observation_missing" };
  if (!observation.text.includes(input.sourceExcerpt))
    return { error: "reference_site_excerpt_missing" };
  const body = { schemaVersion: "roost-reference-site-finding-v1", taskId, siteId,
    title: input.title, category: input.category, language: input.language, observed: input.observed,
    sourceExcerpt: input.sourceExcerpt, interpretation: input.interpretation,
    uncertainty: input.uncertainty, applicability: input.applicability,
    sourceReviewId: input.sourceReviewId, observationId: observation.id,
    sourceLanguage: observation.language, evidence: observation.evidence,
    source: sourceFor(initial.site, initial.metadata, initial.review!.id) };
  requireRuntimeContent(body, "reference_site.finding.create", { workspaceId });
  const fingerprint = sha(`roost-reference-site-finding-v1:${siteId}:${taskId}:${packageDigest}:${observation.id}:${input.observed}`);
  const requestHash = sha(content({ body, requestId: input.requestId, agentId: initial.principal.id }));
  try {
    return await prisma.$transaction(async db => {
      const current = await referenceSiteScope(db, workspaceId, taskId, siteId, actor);
      if ("error" in current || current.principal.kind !== "agent" ||
        current.site.updatedAt.getTime() !== initial.site.updatedAt.getTime() || current.review?.id !== initial.review?.id ||
        referenceSitePackageDigest(current.metadata.package) !== packageDigest)
        return { error: "reference_site_source_changed" };
      const prior = await db.$queryRaw<Array<{ observation_id: string; request_hash: string }>>`
        SELECT observation_id,request_hash FROM finding_versions WHERE workspace_id=${workspaceId}::uuid AND request_id=${input.requestId}::uuid LIMIT 1`;
      if (prior[0]) return prior[0].request_hash === requestHash ? { record: { id: prior[0].observation_id }, replayed: true }
        : { error: "reference_site_request_conflict" };
      const duplicate = await db.$queryRaw<Array<{ observation_id: string }>>`
        SELECT observation_id FROM finding_versions WHERE workspace_id=${workspaceId}::uuid
          AND reference_site_id=${siteId}::uuid AND fingerprint=${fingerprint} LIMIT 1`;
      if (duplicate[0]) return { error: "reference_site_duplicate", existingId: duplicate[0].observation_id };
      const observation = await db.capabilityObservation.create({ data: {
        referenceSiteId: siteId, observedState: "unknown", summary: input.title, source: "agent",
        observedByType: "agent", observedById: current.principal.id
      } });
      const versionId = randomUUID(), journalId = randomUUID();
      await db.$executeRaw`INSERT INTO finding_versions(id,observation_id,workspace_id,reference_site_id,version,body,fingerprint,
        actor_kind,actor_id,credential_id,request_id,request_hash) VALUES(${versionId}::uuid,${observation.id}::uuid,
        ${workspaceId}::uuid,${siteId}::uuid,1,${content(body)}::jsonb,${fingerprint},'agent',${current.principal.id}::uuid,
        ${current.principal.credentialId}::uuid,${input.requestId}::uuid,${requestHash})`;
      await db.$executeRaw`INSERT INTO finding_journal(id,observation_id,version_id,workspace_id,sequence,action,state,
        body,proof,actor_kind,actor_id,credential_id,request_id,request_hash) VALUES(${journalId}::uuid,
        ${observation.id}::uuid,${versionId}::uuid,${workspaceId}::uuid,1,'revision','observed',
        ${content({ reason: "initial_site_observation" })}::jsonb,'{}'::jsonb,'agent',${current.principal.id}::uuid,
        ${current.principal.credentialId}::uuid,${randomUUID()}::uuid,${requestHash})`;
      await db.event.create({ data: { workspaceId, taskId, type: "finding_attention", source: "roost",
        actorType: "agent", actorId: current.principal.id, resourceType: "capability_observation",
        resourceId: observation.id, payload: { findingId: observation.id, state: "observed", subject: "reference_site", siteId } } });
      return { record: { id: observation.id }, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { error: "reference_site_duplicate_or_conflict" };
    throw error;
  }
}

export async function referenceSiteFindings(workspaceId: string, taskId: string, siteId: string, actor: ReviewActor) {
  return prisma.$transaction(async db => {
    const principal = await resolveReviewPrincipal(db, workspaceId, actor);
    if (!principal) return { error: "reference_site_forbidden" };
    if (principal.kind === "user" && !await db.workspace.findFirst({ where: { id: workspaceId, ownerUserId: principal.id } }))
      return { error: "reference_site_forbidden" };
    if (!await taskSourceScope(db, workspaceId, taskId, principal.kind === "agent" ? principal.id : undefined))
      return { error: "reference_site_forbidden" };
    const current = await referenceSiteScope(db, workspaceId, taskId, siteId, actor, true);
    if (principal.kind === "agent" && "error" in current) return { error: "reference_site_forbidden" };
    const approved = !("error" in current) && companySourceEligible(current.site, current.review ?? undefined, taskId, null);
    const currentPackageDigest = "error" in current ? null : referenceSitePackageDigest(current.metadata.package);
    const rows = await db.$queryRaw<Array<{ id: string; body: unknown; created_at: Date; actor_id: string;
      finding_digest: string; review_id: string | null; verdict: string | null; reviewer_user_id: string | null;
      review_rationale: string | null; review_evidence: string | null; reviewed_at: Date | null }>>`
      SELECT v.observation_id AS id,v.body,v.created_at,v.actor_id,
        encode(sha256(convert_to(v.body::text,'UTF8')),'hex') AS finding_digest,
        r.id AS review_id,r.verdict,r.reviewer_user_id,r.rationale AS review_rationale,
        r.evidence AS review_evidence,r.created_at AS reviewed_at
      FROM finding_versions v LEFT JOIN reference_site_finding_reviews r ON r.version_id=v.id
      WHERE v.workspace_id=${workspaceId}::uuid AND v.reference_site_id=${siteId}::uuid
        AND v.body->>'taskId'=${taskId} ORDER BY v.created_at DESC,v.id DESC LIMIT 101`;
    const currentFinding = (row: typeof rows[number]) => {
      const body = row.body as { sourceReviewId?: string; source?: { recordRevision?: string; contentDigest?: string } };
      return approved && !("error" in current) && body.sourceReviewId === current.review?.id &&
        body.source?.recordRevision === current.site.updatedAt.toISOString() &&
        body.source?.contentDigest === currentPackageDigest;
    };
    const visible = rows.slice(0, 100).filter(row => principal.kind !== "agent" || currentFinding(row));
    const items = visible.map(row => ({ id: row.id, body: row.body, createdAt: row.created_at,
      state: "observed", verification: currentFinding(row) ? row.verdict ?? "unverified" : "stale", actorId: row.actor_id,
      findingDigest: row.finding_digest, review: row.review_id ? { id: row.review_id,
        verdict: row.verdict, reviewerUserId: row.reviewer_user_id, rationale: row.review_rationale,
        evidence: row.review_evidence, reviewedAt: row.reviewed_at } : null }));
    requireRuntimeContent(items, "reference_site.finding.list", { workspaceId });
    return { items, truncated: rows.length > 100 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
