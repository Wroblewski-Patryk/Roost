import { strict as assert } from "node:assert";
import test from "node:test";
import {
  expectedIdempotencyKey,
  packetDigest,
  parseProjectionEnvelope,
  productMapSchemaVersion,
  productMapTransportVersion
} from "../modules/product-map/product-map-projection.service";

function envelope(packet: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const packetDigestValue = packetDigest(packet);
  const base = {
    transportVersion: productMapTransportVersion,
    schemaVersion: productMapSchemaVersion,
    companyId: "paperclip-company",
    sourceSnapshotId: "snapshot-1",
    observedAt: "2026-07-28T10:00:00.000Z",
    publishedAt: "2026-07-28T10:01:00.000Z",
    packetDigest: packetDigestValue,
    packet
  };
  return { ...base, idempotencyKey: expectedIdempotencyKey(base), ...overrides };
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
