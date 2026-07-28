import assert from "node:assert/strict";
import test from "node:test";
import { isNegativeItem, itemTone, projectionMessage, projectionTone, type ProductMapProjectionItem } from "./product-map-projection";

const item = (overrides: Partial<ProductMapProjectionItem> = {}): ProductMapProjectionItem => ({
  offeringId: "roost",
  paperclipProjectName: "Roost",
  lifecycleStage: "implementation",
  conflictState: "none",
  sourceControl: { branch: "main", sourceSha: "a", deployedSha: "b", versionAlignment: "different" },
  readiness: { status: "GO", evidenceState: "complete", zeroGapButNoGo: false, totalGaps: 0, nextGate: null },
  aggregates: { issues: { total: 0, byStatus: {} } },
  ...overrides
});

test("NO-GO and zero-gap-but-no-go never receive a healthy presentation", () => {
  assert.equal(isNegativeItem(item({ readiness: { status: "NO-GO", evidenceState: "complete", zeroGapButNoGo: false, totalGaps: 0, nextGate: "approval" } })), true);
  assert.equal(itemTone(item({ readiness: { status: "GO", evidenceState: "complete", zeroGapButNoGo: true, totalGaps: 0, nextGate: "approval" } })), "badge-error");
});

test("read-model states keep stale, quarantined, out-of-order, empty, and unavailable states explicit", () => {
  assert.equal(projectionTone("stale", null), "warning");
  assert.equal(projectionTone("quarantined", null), "warning");
  assert.equal(projectionTone("out_of_order", null), "warning");
  assert.match(projectionMessage("quarantined", null).detail, /cannot promote readiness/);
  assert.match(projectionMessage("out_of_order", null).title, /Out-of-order/);
  assert.match(projectionMessage("empty", null).title, /No Product Map projection/);
  assert.match(projectionMessage("unavailable", null).detail, /Retry/);
});

test("an accepted packet conflict remains distinct from a quarantined transport update and cannot read as ready", () => {
  const conflictingPacket = { ...item(), conflictState: "project_mapping_conflict" as const };
  const projection = {
    observedAt: "2026-07-28T10:00:00.000Z",
    sourceState: "available" as const,
    stale: false,
    conflictState: conflictingPacket.conflictState,
    items: [conflictingPacket]
  };
  assert.equal(projectionTone("current", projection), "error");
  assert.match(projectionMessage("current", projection).detail, /cannot promote readiness/);
  assert.match(projectionMessage("quarantined", projection).detail, /retained for audit/);
});
