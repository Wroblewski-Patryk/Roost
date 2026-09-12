import { strict as assert } from "node:assert";
import test from "node:test";
import { findingBody, findingClasses, findingFingerprint, findingRoute, findingTransition } from "../modules/product-engineering/finding-contract";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const body = findingBody.parse({ title: "Parser observation", classification: "defect", language: "en", taskId: id(1), componentId: id(2), departmentKey: "09-technologia", requesterId: id(3), recipientId: id(4), scope: "One parser component", excluded: "Other components remain unchanged", observed: "Empty input throws", expected: "Empty input returns validation", reproducibility: { status: "reproduced", steps: ["Call parser with empty input"], limitations: "Local synthetic evidence" }, sources: [{ type: "task", id: id(1), revision: "version-one" }], evidence: [{ type: "company_record", id: id(5), revision: "version-one" }], environment: { key: "fixture-local", build: "build-one", applicationRevision: "app-one", componentRevision: "component-one", contextRevision: "a".repeat(64) }, impact: "The parser rejects valid empty input", knownRisk: "low", requiredCompetencies: ["javascript"], decisionNeed: "none", procedureId: id(6) });
test("all five classes have bounded typed provenance", () => {
  for (const classification of findingClasses) assert.equal(findingBody.parse({ ...body, classification }).classification, classification);
  assert.equal(findingBody.safeParse({ ...body, classification: "generic_issue" }).success, false);
  assert.equal(findingBody.safeParse({ ...body, observed: "x".repeat(2001) }).success, false);
  assert.equal(findingBody.safeParse({ ...body, arbitraryLog: "unbounded" }).success, false);
});
test("exact identity normalizes behavior without crossing application, component or environment", () => {
  const fingerprint = findingFingerprint(id(10), body);
  assert.equal(findingFingerprint(id(10), { ...body, observed: "  EMPTY\nINPUT throws ", expected: "Empty input  returns validation" }), fingerprint);
  for (const changed of [{ ...body, componentId: id(20) }, { ...body, environment: { ...body.environment, build: "build-two" } }, { ...body, expected: "Empty input silently succeeds" }]) assert.notEqual(findingFingerprint(id(10), changed), fingerprint);
  assert.notEqual(findingFingerprint(id(11), body), fingerprint);
});
test("lifecycle cannot skip deduplication, independent verification or triage", () => {
  assert.equal(findingTransition("observed", "confirmed"), null);
  assert.equal(findingTransition("deduplication_pending", "queue_triage"), null);
  assert.equal(findingTransition("verification_pending", "convert_task"), null);
  assert.equal(findingTransition("rejected", "convert_task"), null);
  assert.equal(findingTransition("inconclusive", "convert_decision"), null);
  assert.equal(findingTransition("observed", "queue_deduplication"), "deduplication_pending");
  assert.equal(findingTransition("verification_pending", "confirmed"), "verified");
  assert.equal(findingTransition("triage_pending", "defer"), "deferred");
  assert.equal(findingTransition("deferred", "reopen"), "triage_pending");
});
test("material unknown and reserved impact cannot become an executable task", () => {
  assert.equal(findingRoute(body), "task");
  assert.equal(findingRoute({ ...body, knownRisk: "critical" }), "decision");
  for (const decisionNeed of ["product_direction", "money", "legal", "critical_risk", "mandate_change"] as const) assert.equal(findingRoute({ ...body, decisionNeed }), "decision");
  assert.equal(findingRoute({ ...body, classification: "missing_assumption" }), "interview");
  assert.equal(findingRoute({ ...body, decisionNeed: "material_unknown" }), "interview");
});
