import { strict as assert } from "node:assert";
import test from "node:test";
import { canonicalLifecycleStages, lifecycleOperatingContractSource } from "../modules/company-os/lifecycle-procedure-definition";
import {
  expectedIdempotencyKey,
  packetDigest,
  packetWideLifecycleConflicts,
  parseProductMapProjectionPacket,
  parseProjectionEnvelope,
  projectionAuditRetentionDays,
  projectionQuarantineRetentionDays,
  projectionReceiptRetentionDays,
  projectionRetentionCutoffs,
  productMapSchemaVersion,
  productMapTransportVersion,
  quarantineInvalidatesActiveProjection
} from "../modules/product-map/product-map-projection.service";

const observedAt = "2026-07-28T10:00:00.000Z";

function validPacket() {
  return {
    schemaVersion: productMapSchemaVersion,
    observedAt,
    sourceState: "available",
    stale: false,
    conflictState: "none",
    lifecycleProcedure: {
      procedureId: "PROC-SH-APPLICATION-LIFECYCLE",
      procedureVersion: "1.0",
      executionAuthority: "agent_runtime",
      observedAt,
      verifiedAt: observedAt,
      freshness: "current",
      gateResults: canonicalLifecycleStages.map((stage) => ({
        stageKey: stage.stageKey,
        status: "verified",
        summary: `${stage.title} verified.`,
        ownerRole: stage.accountableSourceOwner,
        verifiedAt: observedAt,
        evidenceRefs: [{ kind: "issue", issueIdentifier: "LUC-2193", label: `${stage.title} evidence` }]
      })),
      evidenceRefs: [{ kind: "issue", issueIdentifier: "LUC-2193", label: "Lifecycle evidence" }],
      supersession: { status: "active", supersedesVersion: null, supersededByVersion: null },
      source: lifecycleOperatingContractSource
    },
    items: [{
      offeringId: "roost",
      executionProjectName: "Roost",
      lifecycleStage: "implementation",
      conflictState: "none",
      sourceControl: {
        branch: "main",
        sourceSha: "a".repeat(40),
        deployedSha: "a".repeat(40),
        versionAlignment: "aligned"
      },
      readiness: {
        status: "GO",
        evidenceState: "complete",
        zeroGapButNoGo: false,
        totalGaps: 0,
        nextGate: null
      },
      aggregates: {
        issues: {
          total: 1,
          byStatus: { backlog: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 1, cancelled: 0 }
        }
      }
    }]
  };
}

function envelope(packet: ReturnType<typeof validPacket>, overrides: Record<string, unknown> = {}) {
  const digest = packetDigest(packet);
  const base = {
    transportVersion: productMapTransportVersion,
    schemaVersion: productMapSchemaVersion,
    companyId: "codex-company",
    sourceSnapshotId: "snapshot-1",
    observedAt: packet.observedAt,
    publishedAt: "2026-07-28T10:01:00.000Z",
    packetDigest: digest,
    packet
  };
  return { ...base, idempotencyKey: expectedIdempotencyKey(base), ...overrides };
}

test("strict schema 2.0 packet and envelope accept the exact canonical lifecycle", () => {
  const packet = validPacket();
  assert.ok(parseProductMapProjectionPacket(packet));
  assert.ok(parseProjectionEnvelope(envelope(packet), new Date("2026-07-28T10:02:00.000Z")));
  assert.equal(packet.lifecycleProcedure.gateResults.length, 18);
});

test("projection digest is canonical while tampering, replay, and timestamp mismatch fail closed", () => {
  const packet = validPacket();
  const reordered = { ...packet, items: packet.items.map((item) => ({ ...item })) };
  assert.equal(packetDigest(packet), packetDigest(reordered));
  const valid = envelope(packet);
  assert.equal(parseProjectionEnvelope({ ...valid, packetDigest: "f".repeat(64) }, new Date("2026-07-28T10:02:00.000Z")), null);
  assert.equal(parseProjectionEnvelope({ ...valid, idempotencyKey: "0".repeat(64) }, new Date("2026-07-28T10:02:00.000Z")), null);
  assert.equal(parseProjectionEnvelope(valid, new Date("2026-07-28T10:12:00.001Z")), null);
  assert.equal(parseProjectionEnvelope({ ...valid, observedAt: "2026-07-28T09:59:59.000Z" }, new Date("2026-07-28T10:02:00.000Z")), null);
});

test("unknown, private, legacy, malformed gate, and unsafe evidence fields are rejected", () => {
  const cases: unknown[] = [
    { ...validPacket(), prompt: "private" },
    { ...validPacket(), schemaVersion: "1.0" },
    {
      ...validPacket(),
      lifecycleProcedure: { ...validPacket().lifecycleProcedure, transcript: "private" }
    },
    {
      ...validPacket(),
      lifecycleProcedure: {
        ...validPacket().lifecycleProcedure,
        gateResults: validPacket().lifecycleProcedure.gateResults.map((gate, index) => (
          index === 0 ? { ...gate, issueBody: "private" } : gate
        ))
      }
    },
    {
      ...validPacket(),
      lifecycleProcedure: {
        ...validPacket().lifecycleProcedure,
        evidenceRefs: [{ kind: "issue", issueIdentifier: "LUC-2193", label: "Evidence", href: "https://example.com" }]
      }
    },
    {
      ...validPacket(),
      lifecycleProcedure: {
        ...validPacket().lifecycleProcedure,
        evidenceRefs: [{ kind: "issue", issueIdentifier: "PAP-1", label: "Foreign evidence" }]
      }
    }
  ];
  for (const candidate of cases) assert.equal(parseProductMapProjectionPacket(candidate), null);
});

test("gate completeness, ordering, evidence, freshness, and stricter GO invariants are enforced", () => {
  const packet = validPacket();
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    lifecycleProcedure: { ...packet.lifecycleProcedure, gateResults: packet.lifecycleProcedure.gateResults.slice(1) }
  }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    lifecycleProcedure: {
      ...packet.lifecycleProcedure,
      gateResults: [packet.lifecycleProcedure.gateResults[1], packet.lifecycleProcedure.gateResults[0], ...packet.lifecycleProcedure.gateResults.slice(2)]
    }
  }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    lifecycleProcedure: {
      ...packet.lifecycleProcedure,
      gateResults: packet.lifecycleProcedure.gateResults.map((gate, index) => (
        index === 0 ? { ...gate, evidenceRefs: [], verifiedAt: null } : gate
      ))
    }
  }), null);
  assert.equal(parseProductMapProjectionPacket({ ...packet, stale: true }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    lifecycleProcedure: {
      ...packet.lifecycleProcedure,
      gateResults: packet.lifecycleProcedure.gateResults.map((gate, index) => (
        index === 0 ? { ...gate, status: "blocked", verifiedAt: null } : gate
      ))
    }
  }), null);
});

test("offering bounds, status totals, identifiers, SHA format, and duplicate IDs are enforced", () => {
  const packet = validPacket();
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    items: [{ ...packet.items[0], offeringId: "unsafe id" }]
  }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    items: [{ ...packet.items[0], sourceControl: { ...packet.items[0].sourceControl, sourceSha: "ABC" } }]
  }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    items: [{ ...packet.items[0], aggregates: { issues: { ...packet.items[0].aggregates.issues, total: 2 } } }]
  }), null);
  assert.equal(parseProductMapProjectionPacket({ ...packet, items: [packet.items[0], packet.items[0]] }), null);
  assert.equal(parseProductMapProjectionPacket({
    ...packet,
    items: Array.from({ length: 51 }, (_, index) => ({ ...packet.items[0], offeringId: `roost-${index}` }))
  }), null);
});

test("projection retention keeps audit packets for one year while expiring operational records sooner", () => {
  const now = new Date("2026-07-28T12:00:00.000Z");
  const cutoffs = projectionRetentionCutoffs(now);
  assert.equal(projectionAuditRetentionDays, 365);
  assert.equal(projectionReceiptRetentionDays, 30);
  assert.equal(projectionQuarantineRetentionDays, 90);
  assert.equal(cutoffs.auditBefore.toISOString(), "2025-07-28T12:00:00.000Z");
  assert.equal(cutoffs.receiptBefore.toISOString(), "2026-06-28T12:00:00.000Z");
  assert.equal(cutoffs.quarantineBefore.toISOString(), "2026-04-29T12:00:00.000Z");
});

test("an out-of-order replay stays audited without poisoning the active last-known-good projection", () => {
  assert.equal(quarantineInvalidatesActiveProjection("projection_out_of_order"), false);
  assert.equal(quarantineInvalidatesActiveProjection("projection_conflict"), true);
  assert.equal(quarantineInvalidatesActiveProjection(null), false);
});

test("one offering version mismatch stays item-scoped and does not poison unrelated offerings", () => {
  const packet = parseProductMapProjectionPacket({
    ...validPacket(),
    items: [{
      ...validPacket().items[0],
      sourceControl: {
        ...validPacket().items[0].sourceControl,
        deployedSha: "b".repeat(40),
        versionAlignment: "different",
      },
      readiness: {
        ...validPacket().items[0].readiness,
        status: "NO-GO",
        nextGate: "Deploy the exact source SHA.",
      },
    }],
  });
  assert.ok(packet);
  assert.deepEqual(packetWideLifecycleConflicts(packet), []);
});
