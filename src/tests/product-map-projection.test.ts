import { strict as assert } from "node:assert";
import test from "node:test";
import {
  expectedIdempotencyKey,
  packetDigest,
  parseProjectionEnvelope,
  projectionAuditRetentionDays,
  projectionQuarantineRetentionDays,
  projectionReceiptRetentionDays,
  projectionRetentionCutoffs,
  productMapSchemaVersion,
  productMapTransportVersion
} from "../modules/product-map/product-map-projection.service";

function envelope(packet: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const { packetSchemaVersion, ...envelopeOverrides } = overrides;
  const schemaVersion = typeof envelopeOverrides.schemaVersion === "string"
    ? envelopeOverrides.schemaVersion
    : productMapSchemaVersion;
  const projectionPacket = {
    ...packet,
    schemaVersion: typeof packetSchemaVersion === "string" ? packetSchemaVersion : schemaVersion
  };
  const packetDigestValue = packetDigest(projectionPacket);
  const base = {
    transportVersion: productMapTransportVersion,
    schemaVersion,
    companyId: "paperclip-company",
    sourceSnapshotId: "snapshot-1",
    observedAt: "2026-07-28T10:00:00.000Z",
    publishedAt: "2026-07-28T10:01:00.000Z",
    packetDigest: packetDigestValue,
    packet: projectionPacket
  };
  return { ...base, idempotencyKey: expectedIdempotencyKey(base), ...envelopeOverrides };
}

test("projection digest is canonical and envelope verifies its packet", () => {
  const first = { status: "GO", nested: { b: 2, a: 1 } };
  const second = { nested: { a: 1, b: 2 }, status: "GO" };
  assert.equal(packetDigest(first), packetDigest(second));
  assert.ok(parseProjectionEnvelope(envelope(first), new Date("2026-07-28T10:02:00.000Z")));
});

test("projection envelope rejects tampered digest, idempotency key, and replayed timestamps", () => {
  const valid = envelope({ state: "current" });
  assert.equal(parseProjectionEnvelope({ ...valid, packetDigest: "f".repeat(64) }, new Date("2026-07-28T10:02:00.000Z")), null);
  assert.equal(parseProjectionEnvelope({ ...valid, idempotencyKey: "wrong" }, new Date("2026-07-28T10:02:00.000Z")), null);
  assert.equal(parseProjectionEnvelope(valid, new Date("2026-07-28T10:12:00.001Z")), null);
});

test("projection envelope accepts schema 1.0 only when its packet matches", () => {
  const now = new Date("2026-07-28T10:02:00.000Z");
  assert.ok(parseProjectionEnvelope(envelope({ state: "current" }), now));
  assert.equal(parseProjectionEnvelope(envelope({ state: "legacy" }, { schemaVersion: "product-map/v1" }), now), null);
  assert.equal(parseProjectionEnvelope(envelope({ state: "mismatch" }, { packetSchemaVersion: "product-map/v1" }), now), null);
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
