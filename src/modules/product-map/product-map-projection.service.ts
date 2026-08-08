import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import {
  canonicalLifecycleStages,
  lifecycleEntryCriteria,
  lifecycleExitCriteria,
  lifecycleOperatingContractSource,
  lifecyclePrimaryOutput,
  lifecycleProcedureId,
  lifecycleProcedureTitle,
  lifecycleProcedureVersion,
  lifecyclePurpose,
  lifecycleRoostSource,
  lifecycleScope,
  lifecycleStageKeySchema,
  lifecycleStepExpectedOutputSchema,
  lifecycleStepValidationRuleSchema,
  lifecycleTrigger
} from "../company-os/lifecycle-procedure-definition";

type ProjectionDb = Prisma.TransactionClient | typeof prisma;

export const productMapTransportVersion = "product-map-projection-transport/v1";
export const productMapSchemaVersion = "2.0";
const replayWindowMs = 10 * 60 * 1000;
const futureSkewMs = 120 * 1000;
const freshnessTtlMs = 15 * 60 * 1000;
const lastKnownGoodWindowMs = 24 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
export const projectionAuditRetentionDays = 365;
export const projectionReceiptRetentionDays = 30;
export const projectionQuarantineRetentionDays = 90;

const nonBlank = (max: number) => z.string().min(1).max(max).refine((value) => value.trim().length > 0);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const gitShaSchema = z.string().regex(/^[a-f0-9]{40}$/).nullable();
const stableIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const issueIdentifierSchema = z.string().regex(/^LUC-[1-9][0-9]*$/);
const uuidSchema = z.string().uuid();
const documentKeySchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

const issueEvidenceSchema = z.object({
  kind: z.literal("issue"),
  issueIdentifier: issueIdentifierSchema,
  label: nonBlank(120)
}).strict();
const commentEvidenceSchema = z.object({
  kind: z.literal("comment"),
  issueIdentifier: issueIdentifierSchema,
  commentId: uuidSchema,
  label: nonBlank(120)
}).strict();
const documentEvidenceSchema = z.object({
  kind: z.literal("document"),
  issueIdentifier: issueIdentifierSchema,
  documentKey: documentKeySchema,
  label: nonBlank(120)
}).strict();
const attachmentEvidenceSchema = z.object({
  kind: z.literal("attachment"),
  issueIdentifier: issueIdentifierSchema,
  objectId: uuidSchema,
  label: nonBlank(120)
}).strict();
const workProductEvidenceSchema = z.object({
  kind: z.literal("work_product"),
  issueIdentifier: issueIdentifierSchema,
  objectId: uuidSchema,
  label: nonBlank(120)
}).strict();
export const paperclipEvidenceRefSchema = z.union([
  issueEvidenceSchema,
  commentEvidenceSchema,
  documentEvidenceSchema,
  attachmentEvidenceSchema,
  workProductEvidenceSchema
]);
export type PaperclipEvidenceRef = z.infer<typeof paperclipEvidenceRefSchema>;

export const lifecycleGateResultSchema = z.object({
  stageKey: lifecycleStageKeySchema,
  status: z.enum(["verified", "not_applicable", "blocked", "stale", "failed"]),
  summary: nonBlank(500),
  ownerRole: nonBlank(120),
  verifiedAt: isoDateTimeSchema.nullable(),
  evidenceRefs: z.array(paperclipEvidenceRefSchema).max(10)
}).strict().superRefine((gate, ctx) => {
  if (gate.status === "verified" && (!gate.verifiedAt || gate.evidenceRefs.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "verified_gate_requires_evidence" });
  }
  if (gate.status !== "verified" && gate.verifiedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "non_verified_gate_cannot_have_verified_time" });
  }
});

const lifecycleSourceSchema = z.object({
  repository: z.literal(lifecycleOperatingContractSource.repository),
  path: z.literal(lifecycleOperatingContractSource.path),
  documentVersion: z.literal(lifecycleOperatingContractSource.documentVersion),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/)
}).strict();

export const lifecycleExecutionProjectionSchema = z.object({
  procedureId: z.literal(lifecycleProcedureId),
  procedureVersion: z.literal(lifecycleProcedureVersion),
  executionAuthority: z.literal("paperclip"),
  observedAt: isoDateTimeSchema,
  verifiedAt: isoDateTimeSchema.nullable(),
  freshness: z.enum(["current", "stale", "unavailable"]),
  gateResults: z.array(lifecycleGateResultSchema).length(canonicalLifecycleStages.length),
  evidenceRefs: z.array(paperclipEvidenceRefSchema).max(50),
  supersession: z.object({
    status: z.enum(["active", "superseded"]),
    supersedesVersion: nonBlank(40).nullable(),
    supersededByVersion: nonBlank(40).nullable()
  }).strict(),
  source: lifecycleSourceSchema
}).strict().superRefine((projection, ctx) => {
  for (const [index, stage] of canonicalLifecycleStages.entries()) {
    if (projection.gateResults[index]?.stageKey !== stage.stageKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gateResults", index, "stageKey"],
        message: "gate_results_must_match_canonical_order"
      });
    }
  }
  const uniqueKeys = new Set(projection.gateResults.map((gate) => gate.stageKey));
  if (uniqueKeys.size !== canonicalLifecycleStages.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gateResults"], message: "gate_results_must_be_unique" });
  }
  if (projection.supersession.status === "active" && projection.supersession.supersededByVersion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["supersession"], message: "active_procedure_cannot_be_superseded" });
  }
  if (projection.supersession.status === "superseded" && !projection.supersession.supersededByVersion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["supersession"], message: "superseded_procedure_requires_successor" });
  }
});

const issueStatusCountsSchema = z.object({
  backlog: z.number().int().nonnegative(),
  todo: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative()
}).strict();

export const productMapOfferingSchema = z.object({
  offeringId: stableIdSchema,
  paperclipProjectName: nonBlank(120),
  lifecycleStage: nonBlank(120),
  conflictState: z.enum(["none", "project_mapping_conflict", "owner_surface_unavailable"]),
  sourceControl: z.object({
    branch: nonBlank(120).nullable(),
    sourceSha: gitShaSchema,
    deployedSha: gitShaSchema,
    versionAlignment: z.enum(["aligned", "different", "unknown"])
  }).strict(),
  readiness: z.object({
    status: z.enum(["GO", "NO-GO", "UNKNOWN"]),
    evidenceState: z.enum(["complete", "missing", "unknown"]),
    zeroGapButNoGo: z.boolean(),
    totalGaps: z.number().int().nonnegative(),
    nextGate: nonBlank(500).nullable()
  }).strict(),
  aggregates: z.object({
    issues: z.object({
      total: z.number().int().nonnegative(),
      byStatus: issueStatusCountsSchema
    }).strict()
  }).strict()
}).strict().superRefine((item, ctx) => {
  const statusTotal = Object.values(item.aggregates.issues.byStatus).reduce((sum, count) => sum + count, 0);
  if (statusTotal !== item.aggregates.issues.total) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aggregates", "issues"], message: "issue_status_count_mismatch" });
  }
  if (item.sourceControl.versionAlignment === "aligned"
    && (!item.sourceControl.sourceSha || item.sourceControl.sourceSha !== item.sourceControl.deployedSha)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceControl"], message: "aligned_sha_mismatch" });
  }
});

export const productMapProjectionPacketSchema = z.object({
  schemaVersion: z.literal(productMapSchemaVersion),
  observedAt: isoDateTimeSchema,
  sourceState: z.enum(["available", "unavailable", "timed_out"]),
  stale: z.boolean(),
  conflictState: z.enum(["none", "source_unavailable", "project_mapping_conflict", "owner_surface_unavailable"]),
  lifecycleProcedure: lifecycleExecutionProjectionSchema,
  items: z.array(productMapOfferingSchema).max(50)
}).strict().superRefine((packet, ctx) => {
  if (packet.observedAt !== packet.lifecycleProcedure.observedAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["observedAt"], message: "observed_at_mismatch" });
  }
  if (packet.stale !== (packet.lifecycleProcedure.freshness !== "current")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stale"], message: "freshness_stale_mismatch" });
  }
  if (packet.sourceState !== "available" && packet.conflictState !== "source_unavailable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conflictState"], message: "source_state_conflict_mismatch" });
  }
  if (packet.sourceState === "available" && packet.conflictState === "source_unavailable") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conflictState"], message: "available_source_cannot_be_unavailable" });
  }
  const offeringIds = packet.items.map((item) => item.offeringId);
  if (new Set(offeringIds).size !== offeringIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "duplicate_offering_id" });
  }
  const totalEvidence = packet.lifecycleProcedure.evidenceRefs.length
    + packet.lifecycleProcedure.gateResults.reduce((sum, gate) => sum + gate.evidenceRefs.length, 0);
  if (totalEvidence > 150) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lifecycleProcedure"], message: "evidence_limit_exceeded" });
  }
  const allGatesGreen = packet.lifecycleProcedure.gateResults.every((gate) => (
    gate.status === "verified" || gate.status === "not_applicable"
  ));
  for (const [index, item] of packet.items.entries()) {
    if (item.readiness.status !== "GO") continue;
    const invalidGo = !allGatesGreen
      || packet.stale
      || packet.sourceState !== "available"
      || packet.conflictState !== "none"
      || packet.lifecycleProcedure.supersession.status !== "active"
      || item.conflictState !== "none"
      || item.sourceControl.versionAlignment === "different"
      || item.readiness.evidenceState !== "complete"
      || item.readiness.zeroGapButNoGo;
    if (invalidGo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "readiness", "status"], message: "go_requires_all_gates" });
    }
  }
});
export type ProductMapProjectionPacket = z.infer<typeof productMapProjectionPacketSchema>;

const envelopeSchema = z.object({
  transportVersion: z.literal(productMapTransportVersion),
  schemaVersion: z.literal(productMapSchemaVersion),
  companyId: nonBlank(200),
  sourceSnapshotId: stableIdSchema,
  observedAt: isoDateTimeSchema,
  publishedAt: isoDateTimeSchema,
  packetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  packet: productMapProjectionPacketSchema
}).strict();

export type ProductMapEnvelope = z.infer<typeof envelopeSchema>;

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function packetDigest(packet: unknown) {
  return createHash("sha256").update(canonicalize(packet)).digest("hex");
}

export function expectedIdempotencyKey(envelope: Pick<ProductMapEnvelope, "companyId" | "sourceSnapshotId" | "packetDigest"> & { schemaVersion: string }) {
  return createHash("sha256")
    .update(`${envelope.companyId}:${envelope.schemaVersion}:${envelope.sourceSnapshotId}:${envelope.packetDigest}`)
    .digest("hex");
}

export function parseProductMapProjectionPacket(value: unknown): ProductMapProjectionPacket | null {
  const parsed = productMapProjectionPacketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseProjectionEnvelope(value: unknown, now = new Date()): ProductMapEnvelope | null {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) return null;
  const envelope = parsed.data;
  if (envelope.observedAt !== envelope.packet.observedAt) return null;
  const observedAt = new Date(envelope.observedAt);
  const publishedAt = new Date(envelope.publishedAt);
  if (observedAt.getTime() > now.getTime() + futureSkewMs || publishedAt.getTime() > now.getTime() + futureSkewMs) return null;
  if (publishedAt.getTime() < now.getTime() - replayWindowMs) return null;
  if (packetDigest(envelope.packet) !== envelope.packetDigest) return null;
  if (expectedIdempotencyKey(envelope) !== envelope.idempotencyKey) return null;
  return envelope;
}

export type ProjectionAcceptance = {
  status: "accepted" | "duplicate" | "quarantined" | "rejected";
  sourceSnapshotId: string;
  packetDigest: string;
  receivedAt: Date;
};

export async function acceptProjection(workspaceId: string, envelope: ProductMapEnvelope, db: ProjectionDb = prisma): Promise<ProjectionAcceptance> {
  const now = new Date();
  const auditCorrelation = randomUUID();
  const observedAt = new Date(envelope.observedAt);
  const receiptWhere = {
    workspaceId_companyId_schemaVersion_sourceSnapshotId_packetDigest: {
      workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion,
      sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest
    }
  };

  const existingReceipt = await db.productMapProjectionReceipt.findUnique({ where: receiptWhere });
  if (existingReceipt) {
    return { status: "duplicate", sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest, receivedAt: existingReceipt.receivedAt };
  }

  const state = await db.productMapProjectionState.findUnique({ where: { workspaceId } });
  const conflictingSnapshot = await db.productMapProjectionSnapshot.findFirst({
    where: { workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, observedAt, packetDigest: { not: envelope.packetDigest } }
  });
  const isOutOfOrder = !!state?.activeObservedAt && observedAt < state.activeObservedAt;
  if (conflictingSnapshot || isOutOfOrder) {
    await db.productMapProjectionQuarantine.create({
      data: { workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, observedAt, packetDigest: envelope.packetDigest, reason: conflictingSnapshot ? "projection_conflict" : "projection_out_of_order", auditCorrelation }
    });
    return { status: conflictingSnapshot ? "quarantined" : "rejected", sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest, receivedAt: now };
  }

  const persist = async (tx: ProjectionDb) => {
    const snapshot = await tx.productMapProjectionSnapshot.upsert({
      where: { workspaceId_companyId_schemaVersion_sourceSnapshotId_packetDigest: receiptWhere.workspaceId_companyId_schemaVersion_sourceSnapshotId_packetDigest },
      create: { workspaceId, companyId: envelope.companyId, transportVersion: envelope.transportVersion, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, observedAt, packetDigest: envelope.packetDigest, packet: envelope.packet as Prisma.InputJsonValue, auditCorrelation },
      update: {}
    });
    const receipt = await tx.productMapProjectionReceipt.upsert({
      where: receiptWhere,
      create: { workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest },
      update: {}
    });
    await tx.productMapProjectionState.upsert({
      where: { workspaceId },
      create: { workspaceId, activeSnapshotId: snapshot.id, activeObservedAt: observedAt },
      update: { activeSnapshotId: snapshot.id, activeObservedAt: observedAt }
    });
    return { status: "accepted" as const, sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest, receivedAt: receipt.receivedAt };
  };
  return db === prisma ? prisma.$transaction(persist) : persist(db);
}

/**
 * Atomically consumes one token from a six-per-minute token bucket with a
 * burst capacity of three. The row lives in PostgreSQL, so every app instance
 * observes the same admission decision.
 */
export async function consumeProjectionAdmission(apiKeyId: string, workspaceId: string, db: ProjectionDb = prisma) {
  const rows = await db.$queryRaw<Array<{ tokens: number }>>`
    INSERT INTO "product_map_projection_admissions"
      ("api_key_id", "workspace_id", "tokens", "last_refilled_at", "last_seen_at")
    VALUES (${apiKeyId}::uuid, ${workspaceId}::uuid, 2, NOW(), NOW())
    ON CONFLICT ("api_key_id", "workspace_id") DO UPDATE
    SET "tokens" = LEAST(
          3::numeric,
          "product_map_projection_admissions"."tokens" +
          EXTRACT(EPOCH FROM (NOW() - "product_map_projection_admissions"."last_refilled_at")) / 10
        ) - 1,
        "last_refilled_at" = NOW(),
        "last_seen_at" = NOW()
    WHERE LEAST(
          3::numeric,
          "product_map_projection_admissions"."tokens" +
          EXTRACT(EPOCH FROM (NOW() - "product_map_projection_admissions"."last_refilled_at")) / 10
        ) >= 1
    RETURNING "tokens"
  `;
  return rows.length === 1;
}

/** Acquires an xact-scoped workspace lock, released automatically on commit/rollback. */
export async function tryAcquireProjectionWorkspaceLock(workspaceId: string, db: ProjectionDb) {
  const rows = await db.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_xact_lock(hashtext('product-map-projection'), hashtext(${workspaceId})) AS "locked"
  `;
  return rows[0]?.locked === true;
}

type PublicLifecycleStatus = "active" | "review" | "superseded" | "archived";
type LifecycleConflict = {
  code:
    | "unsupported_schema"
    | "definition_missing"
    | "definition_version_mismatch"
    | "definition_shape_mismatch"
    | "source_unavailable"
    | "source_deployed_sha_mismatch"
    | "projection_conflict"
    | "projection_out_of_order"
    | "superseded";
  summary: string;
};

/**
 * Only a same-snapshot/different-digest quarantine invalidates the active
 * last-known-good projection. An older replay is rejected and audited, but it
 * never became active state and therefore cannot make that state conflicting.
 */
export function quarantineInvalidatesActiveProjection(reason: string | null | undefined) {
  return reason === "projection_conflict";
}

function publicLifecycleStatus(status: string): PublicLifecycleStatus | null {
  if (status === "active") return "active";
  if (status === "draft") return "review";
  if (status === "deprecated") return "superseded";
  if (status === "archived") return "archived";
  return null;
}

function evidenceKey(ref: PaperclipEvidenceRef) {
  if (ref.kind === "comment") return `${ref.kind}:${ref.issueIdentifier}:${ref.commentId}`;
  if (ref.kind === "document") return `${ref.kind}:${ref.issueIdentifier}:${ref.documentKey}`;
  if (ref.kind === "attachment" || ref.kind === "work_product") return `${ref.kind}:${ref.issueIdentifier}:${ref.objectId}`;
  return `${ref.kind}:${ref.issueIdentifier}`;
}

function evidenceHref(ref: PaperclipEvidenceRef) {
  const base = `/LUC/issues/${ref.issueIdentifier}`;
  if (ref.kind === "comment") return `${base}#comment-${ref.commentId}`;
  if (ref.kind === "document") return `${base}#document-${ref.documentKey}`;
  if (ref.kind === "attachment") return `${base}#attachment-${ref.objectId}`;
  if (ref.kind === "work_product") return `${base}#work-product-${ref.objectId}`;
  return base;
}

async function loadLifecycleDefinition(workspaceId: string) {
  const procedure = await prisma.procedure.findUnique({
    where: {
      workspaceId_name_version: {
        workspaceId,
        name: lifecycleProcedureId,
        version: 1
      }
    },
    include: {
      ownerRole: { select: { id: true, name: true } },
      qualityStandard: { select: { id: true } },
      steps: { orderBy: { stepOrder: "asc" } }
    }
  });
  if (!procedure) return { kind: "missing" as const };

  const lifecycleStatus = publicLifecycleStatus(procedure.status);
  const shapeMatches = !!procedure.ownerRole
    && !!procedure.processId
    && !!procedure.qualityStandard
    && lifecycleStatus !== null
    && procedure.purpose === lifecyclePurpose
    && procedure.scope === lifecycleScope
    && procedure.expectedResult === lifecyclePrimaryOutput
    && procedure.steps.length === canonicalLifecycleStages.length;
  if (!shapeMatches) return { kind: "invalid" as const };

  const participatingRoles = new Set<string>([procedure.ownerRole!.name]);
  const stages = [];
  for (const [index, expectedStage] of canonicalLifecycleStages.entries()) {
    const step = procedure.steps[index];
    const expectedOutput = lifecycleStepExpectedOutputSchema.safeParse(step?.expectedOutput);
    const validationRule = lifecycleStepValidationRuleSchema.safeParse(step?.validationRule);
    if (!step
      || step.stepOrder !== index + 1
      || step.stepType !== "manual"
      || !expectedOutput.success
      || !validationRule.success
      || expectedOutput.data.stageKey !== expectedStage.stageKey
      || expectedOutput.data.requiredOutput !== expectedStage.requiredOutput
      || validationRule.data.stageKey !== expectedStage.stageKey
      || validationRule.data.exitGate !== expectedStage.exitGate) {
      return { kind: "invalid" as const };
    }
    validationRule.data.accountableSourceOwners.forEach((owner) => participatingRoles.add(owner));
    stages.push({
      stageKey: expectedStage.stageKey,
      order: index + 1,
      title: expectedStage.title,
      accountableSourceOwner: expectedStage.accountableSourceOwner,
      requiredOutput: expectedOutput.data.requiredOutput,
      exitGate: validationRule.data.exitGate,
      rollbackInstruction: step.rollbackInstruction
    });
  }

  const versions = await prisma.procedure.findMany({
    where: { workspaceId, familyId: procedure.familyId },
    orderBy: { version: "asc" },
    select: { version: true, status: true }
  });
  const newerVersion = versions.find((version) => version.version > procedure.version && version.status === "active");
  const olderVersion = [...versions].reverse().find((version) => version.version < procedure.version);
  return {
    kind: "valid" as const,
    procedure,
    lifecycleStatus,
    stages,
    participatingRoles: [...participatingRoles],
    supersession: {
      status: newerVersion || lifecycleStatus === "superseded" ? "superseded" as const : "active" as const,
      supersedesVersion: olderVersion ? `${olderVersion.version}.0` : null,
      supersededByVersion: newerVersion ? `${newerVersion.version}.0` : null,
      nextReviewAt: null
    }
  };
}

function conflict(code: LifecycleConflict["code"], summary: string): LifecycleConflict {
  return { code, summary };
}

export async function readProjection(workspaceId: string, now = new Date()) {
  const checkedAt = now.toISOString();
  const definition = await loadLifecycleDefinition(workspaceId);
  if (definition.kind === "missing") {
    return { status: "unavailable" as const, packet: null, procedure: null, observedAt: null, freshness: {
      checkedAt, observedAt: null, ageMs: null, lagMs: null, ttlMs: freshnessTtlMs,
      lastKnownGoodWindowMs, status: "unavailable" as const
    } };
  }
  if (definition.kind === "invalid") {
    return { status: "unavailable" as const, packet: null, procedure: null, observedAt: null, freshness: {
      checkedAt, observedAt: null, ageMs: null, lagMs: null, ttlMs: freshnessTtlMs,
      lastKnownGoodWindowMs, status: "unavailable" as const
    } };
  }

  const state = await prisma.productMapProjectionState.findUnique({ where: { workspaceId } });
  const snapshot = state?.activeSnapshotId
    ? await prisma.productMapProjectionSnapshot.findFirst({
      where: { id: state.activeSnapshotId, workspaceId }
    })
    : null;
  const storedPacket = snapshot
    && snapshot.schemaVersion === productMapSchemaVersion
    && snapshot.auditCorrelation
    ? parseProductMapProjectionPacket(snapshot.packet)
    : null;
  const age = snapshot ? now.getTime() - snapshot.observedAt.getTime() : null;
  const latestQuarantine = snapshot
    ? await prisma.productMapProjectionQuarantine.findFirst({
      where: { workspaceId, receivedAt: { gt: snapshot.receivedAt } },
      orderBy: { receivedAt: "desc" },
      select: { reason: true }
    })
    : null;

  const conflicts: LifecycleConflict[] = [];
  let status: "current" | "stale" | "conflict" | "source_only" | "unavailable";
  let packet: ProductMapProjectionPacket | null = storedPacket;
  if (!state?.activeSnapshotId) {
    status = "source_only";
  } else if (!snapshot || !storedPacket) {
    status = "unavailable";
    packet = null;
    conflicts.push(conflict("unsupported_schema", "The active Product Map snapshot does not satisfy the supported closed schema."));
  } else if (age === null || age > lastKnownGoodWindowMs) {
    status = "unavailable";
    packet = null;
    conflicts.push(conflict("source_unavailable", "The last known good execution projection has expired."));
  } else {
    if (quarantineInvalidatesActiveProjection(latestQuarantine?.reason)) {
      conflicts.push(conflict("projection_conflict", "A conflicting projection is retained for audit and cannot replace the last known good state."));
    }
    if (storedPacket.sourceState !== "available" || storedPacket.conflictState === "source_unavailable") {
      conflicts.push(conflict("source_unavailable", "The Paperclip execution projection source is unavailable."));
    }
    if (storedPacket.conflictState === "project_mapping_conflict" || storedPacket.conflictState === "owner_surface_unavailable") {
      conflicts.push(conflict("projection_conflict", "The Product Map projection contains an unresolved mapping or owner-surface conflict."));
    }
    if (storedPacket.items.some((item) => item.sourceControl.versionAlignment === "different")) {
      conflicts.push(conflict("source_deployed_sha_mismatch", "At least one offering source SHA differs from its deployed SHA."));
    }
    if (storedPacket.lifecycleProcedure.supersession.status === "superseded" || definition.supersession.status === "superseded") {
      conflicts.push(conflict("superseded", "The lifecycle procedure or its execution projection is superseded."));
    }
    if (definition.lifecycleStatus !== "active") {
      conflicts.push(conflict("superseded", "The local lifecycle procedure definition is not active."));
    }
    if (conflicts.length > 0) status = "conflict";
    else if (age > freshnessTtlMs || storedPacket.stale || storedPacket.lifecycleProcedure.freshness !== "current") status = "stale";
    else status = "current";
  }

  const processId = definition.procedure.processId!;
  const [decisions, metrics] = await Promise.all([
    prisma.decisionLog.findMany({
      where: { workspaceId, processId },
      orderBy: { decidedAt: "desc" },
      take: 50,
      select: { id: true, context: true, chosenOption: true, decidedAt: true, reviewDate: true }
    }),
    prisma.metric.findMany({
      where: { workspaceId, processId },
      orderBy: { name: "asc" },
      take: 50,
      select: {
        id: true, name: true, category: true, measurementType: true, unit: true,
        targetValue: true, currentValue: true, status: true
      }
    })
  ]);
  const evidenceRefs = packet
    ? [...packet.lifecycleProcedure.evidenceRefs, ...packet.lifecycleProcedure.gateResults.flatMap((gate) => gate.evidenceRefs)]
    : [];
  const uniqueEvidence = [...new Map(evidenceRefs.map((ref) => [evidenceKey(ref), ref])).values()];
  const lifecycleFreshness = status === "current"
    ? "current"
    : status === "stale" || status === "conflict"
      ? "stale"
      : "unavailable";
  const procedure = {
    identity: {
      procedureId: lifecycleProcedureId,
      procedureVersion: lifecycleProcedureVersion,
      familyId: definition.procedure.familyId,
      lifecycleStatus: definition.lifecycleStatus,
      title: lifecycleProcedureTitle
    },
    definition: {
      accountableOwner: {
        roleId: definition.procedure.ownerRole!.id,
        roleName: definition.procedure.ownerRole!.name
      },
      participatingRoles: definition.participatingRoles,
      purpose: definition.procedure.purpose,
      scope: definition.procedure.scope!,
      trigger: lifecycleTrigger,
      entryCriteria: lifecycleEntryCriteria,
      primaryOutput: definition.procedure.expectedResult!,
      exitCriteria: lifecycleExitCriteria,
      stages: definition.stages
    },
    provenance: {
      definitionAuthority: "roost" as const,
      executionAuthority: "paperclip" as const,
      roostSource: lifecycleRoostSource,
      operatingContractSource: packet?.lifecycleProcedure.source ?? lifecycleOperatingContractSource,
      observedAt: packet?.lifecycleProcedure.observedAt ?? null,
      verifiedAt: packet?.lifecycleProcedure.verifiedAt ?? null,
      freshness: lifecycleFreshness
    },
    gates: packet?.lifecycleProcedure.gateResults ?? [],
    conflicts,
    supersession: definition.supersession,
    relations: {
      offerings: packet?.items.map((item) => ({
        offeringId: item.offeringId,
        name: item.paperclipProjectName,
        lifecycleStage: item.lifecycleStage,
        readiness: item.readiness.status
      })) ?? [],
      releases: packet?.items.map((item) => ({
        offeringId: item.offeringId,
        sourceSha: item.sourceControl.sourceSha,
        deployedSha: item.sourceControl.deployedSha,
        versionAlignment: item.sourceControl.versionAlignment,
        readiness: item.readiness.status
      })) ?? [],
      decisions: decisions.map((decision) => ({
        id: decision.id,
        context: decision.context,
        chosenOption: decision.chosenOption,
        decidedAt: decision.decidedAt.toISOString(),
        reviewAt: decision.reviewDate?.toISOString() ?? null
      })),
      kpis: metrics.map((metric) => ({
        id: metric.id,
        name: metric.name,
        category: metric.category,
        measurementType: metric.measurementType,
        unit: metric.unit,
        targetValue: metric.targetValue,
        currentValue: metric.currentValue,
        status: metric.status
      })),
      evidence: uniqueEvidence.map((ref) => ({ ...ref, href: evidenceHref(ref) }))
    },
    audit: snapshot?.auditCorrelation ? {
      correlationId: snapshot.auditCorrelation,
      sourceSnapshotId: snapshot.sourceSnapshotId,
      packetDigestPrefix: snapshot.packetDigest.slice(0, 12),
      receivedAt: snapshot.receivedAt.toISOString()
    } : null,
    authority: {
      readOnly: true as const,
      executionSystem: "paperclip" as const,
      definitionSystem: "roost" as const,
      canMutatePaperclip: false as const,
      canPromoteReadiness: false as const
    }
  };

  const freshnessObservedAt = packet?.observedAt ?? snapshot?.observedAt.toISOString() ?? null;
  const freshnessAgeMs = freshnessObservedAt ? Math.max(0, now.getTime() - new Date(freshnessObservedAt).getTime()) : null;

  return {
    status,
    packet,
    procedure,
    observedAt: freshnessObservedAt,
    freshness: {
      checkedAt,
      observedAt: freshnessObservedAt,
      ageMs: freshnessAgeMs,
      lagMs: freshnessAgeMs,
      ttlMs: freshnessTtlMs,
      lastKnownGoodWindowMs,
      status: lifecycleFreshness
    }
  };
}

/**
 * Computes retention boundaries for the projection persistence surfaces.
 *
 * Snapshots carry the accepted packet and audit correlation, so they remain
 * available for a full year. Idempotency receipts are operational records and
 * quarantined ingress is intentionally retained for 90 days.
 */
export function projectionRetentionCutoffs(now = new Date()) {
  return {
    auditBefore: new Date(now.getTime() - projectionAuditRetentionDays * dayMs),
    receiptBefore: new Date(now.getTime() - projectionReceiptRetentionDays * dayMs),
    quarantineBefore: new Date(now.getTime() - projectionQuarantineRetentionDays * dayMs)
  };
}

/** Bounded maintenance hook for the existing application scheduler. */
export async function cleanupExpiredProjectionRecords(now = new Date(), batchSize = 100) {
  const { auditBefore, receiptBefore, quarantineBefore } = projectionRetentionCutoffs(now);
  const activeStates = await prisma.productMapProjectionState.findMany({
    where: { activeSnapshotId: { not: null } }, select: { activeSnapshotId: true }
  });
  const activeSnapshotIds = activeStates.flatMap((state) => state.activeSnapshotId ? [state.activeSnapshotId] : []);
  const snapshotIds = await prisma.productMapProjectionSnapshot.findMany({
    where: { receivedAt: { lt: auditBefore }, id: { notIn: activeSnapshotIds } }, select: { id: true }, take: batchSize
  });
  const receiptIds = await prisma.productMapProjectionReceipt.findMany({
    where: { receivedAt: { lt: receiptBefore } }, select: { id: true }, take: batchSize
  });
  const quarantineIds = await prisma.productMapProjectionQuarantine.findMany({
    where: { receivedAt: { lt: quarantineBefore } }, select: { id: true }, take: batchSize
  });
  const admissionIds = await prisma.productMapProjectionAdmission.findMany({
    where: { lastSeenAt: { lt: receiptBefore } },
    select: { apiKeyId: true, workspaceId: true }, take: batchSize
  });
  const [snapshots, receipts, quarantines, admissions] = await prisma.$transaction([
    prisma.productMapProjectionSnapshot.deleteMany({ where: { id: { in: snapshotIds.map((row) => row.id) } } }),
    prisma.productMapProjectionReceipt.deleteMany({ where: { id: { in: receiptIds.map((row) => row.id) } } }),
    prisma.productMapProjectionQuarantine.deleteMany({ where: { id: { in: quarantineIds.map((row) => row.id) } } }),
    prisma.productMapProjectionAdmission.deleteMany({ where: { OR: admissionIds.map((row) => ({ apiKeyId: row.apiKeyId, workspaceId: row.workspaceId })) } })
  ]);
  return { snapshots: snapshots.count, receipts: receipts.count, quarantines: quarantines.count, admissions: admissions.count };
}
