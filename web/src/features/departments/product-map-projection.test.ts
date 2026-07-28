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

test("read-model states keep stale, conflict, empty, and unavailable failures explicit", () => {
  assert.equal(projectionTone("stale", null), "warning");
  assert.equal(projectionTone("conflict", null), "warning");
  assert.match(projectionMessage("empty", null).title, /No Product Map projection/);
  assert.match(projectionMessage("unavailable", null).detail, /Retry/);
});
