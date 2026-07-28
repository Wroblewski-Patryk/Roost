import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma";

export const productMapTransportVersion = "product-map-projection-transport/v1";
export const productMapSchemaVersion = "product-map/v1";
const replayWindowMs = 10 * 60 * 1000;
const futureSkewMs = 120 * 1000;
const freshnessTtlMs = 15 * 60 * 1000;
const lastKnownGoodWindowMs = 24 * 60 * 60 * 1000;

const envelopeSchema = z.object({
  transportVersion: z.literal(productMapTransportVersion),
  schemaVersion: z.literal(productMapSchemaVersion),
  companyId: z.string().min(1).max(200),
  sourceSnapshotId: z.string().min(1).max(200),
  observedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }),
  packetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().min(1).max(300),
  packet: z.record(z.unknown()).refine((packet) => Object.keys(packet).length > 0)
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

export function parseProjectionEnvelope(value: unknown, now = new Date()): ProductMapEnvelope | null {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success) return null;
  const envelope = parsed.data;
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

export async function acceptProjection(workspaceId: string, envelope: ProductMapEnvelope, auditCorrelation?: string): Promise<ProjectionAcceptance> {
  const now = new Date();
  const observedAt = new Date(envelope.observedAt);
  const receiptWhere = {
    workspaceId_companyId_schemaVersion_sourceSnapshotId_packetDigest: {
      workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion,
      sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest
    }
  };

  const existingReceipt = await prisma.productMapProjectionReceipt.findUnique({ where: receiptWhere });
  if (existingReceipt) {
    return { status: "duplicate", sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest, receivedAt: existingReceipt.receivedAt };
  }

  const state = await prisma.productMapProjectionState.findUnique({ where: { workspaceId } });
  const conflictingSnapshot = await prisma.productMapProjectionSnapshot.findFirst({
    where: { workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, observedAt, packetDigest: { not: envelope.packetDigest } }
  });
  const isOutOfOrder = !!state?.activeObservedAt && observedAt < state.activeObservedAt;
  if (conflictingSnapshot || isOutOfOrder) {
    await prisma.productMapProjectionQuarantine.create({
      data: { workspaceId, companyId: envelope.companyId, schemaVersion: envelope.schemaVersion, sourceSnapshotId: envelope.sourceSnapshotId, observedAt, packetDigest: envelope.packetDigest, reason: conflictingSnapshot ? "projection_conflict" : "projection_out_of_order", auditCorrelation }
    });
    return { status: conflictingSnapshot ? "quarantined" : "rejected", sourceSnapshotId: envelope.sourceSnapshotId, packetDigest: envelope.packetDigest, receivedAt: now };
  }

  return prisma.$transaction(async (tx) => {
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
  });
}

export async function readProjection(workspaceId: string, now = new Date()) {
  const state = await prisma.productMapProjectionState.findUnique({ where: { workspaceId } });
  if (!state?.activeSnapshotId || !state.activeObservedAt) return { status: "empty" as const, packet: null, observedAt: null };
  const snapshot = await prisma.productMapProjectionSnapshot.findUnique({ where: { id: state.activeSnapshotId } });
  if (!snapshot) return { status: "unavailable" as const, packet: null, observedAt: state.activeObservedAt };
  const age = now.getTime() - snapshot.observedAt.getTime();
  const latestQuarantine = await prisma.productMapProjectionQuarantine.findFirst({
    where: { workspaceId, receivedAt: { gt: snapshot.receivedAt } },
    orderBy: { receivedAt: "desc" },
    select: { reason: true }
  });
  const status = latestQuarantine ? "conflict" : age <= freshnessTtlMs ? "current" : age <= lastKnownGoodWindowMs ? "stale" : "unavailable";
  return { status, packet: status === "unavailable" ? null : snapshot.packet, observedAt: snapshot.observedAt };
}

/** Bounded maintenance hook for the existing application scheduler. */
export async function cleanupExpiredProjectionRecords(now = new Date(), batchSize = 100) {
  const acceptedBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const quarantineBefore = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const activeStates = await prisma.productMapProjectionState.findMany({
    where: { activeSnapshotId: { not: null } }, select: { activeSnapshotId: true }
  });
  const activeSnapshotIds = activeStates.flatMap((state) => state.activeSnapshotId ? [state.activeSnapshotId] : []);
  const snapshotIds = await prisma.productMapProjectionSnapshot.findMany({
    where: { receivedAt: { lt: acceptedBefore }, id: { notIn: activeSnapshotIds } }, select: { id: true }, take: batchSize
  });
  const receiptIds = await prisma.productMapProjectionReceipt.findMany({
    where: { receivedAt: { lt: acceptedBefore } }, select: { id: true }, take: batchSize
  });
  const quarantineIds = await prisma.productMapProjectionQuarantine.findMany({
    where: { receivedAt: { lt: quarantineBefore } }, select: { id: true }, take: batchSize
  });
  const [snapshots, receipts, quarantines] = await prisma.$transaction([
    prisma.productMapProjectionSnapshot.deleteMany({ where: { id: { in: snapshotIds.map((row) => row.id) } } }),
    prisma.productMapProjectionReceipt.deleteMany({ where: { id: { in: receiptIds.map((row) => row.id) } } }),
    prisma.productMapProjectionQuarantine.deleteMany({ where: { id: { in: quarantineIds.map((row) => row.id) } } })
  ]);
  return { snapshots: snapshots.count, receipts: receipts.count, quarantines: quarantines.count };
}
