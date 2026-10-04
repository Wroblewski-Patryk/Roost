import test from "node:test";
import assert from "node:assert/strict";
import { applicationBaseline, type ApplicationBaseline } from "../modules/product-engineering/application-takeover-contract";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
const baseline = (): ApplicationBaseline => ({
  schemaVersion: "roost-application-takeover-v1",
  applicationId: id("1"), auditTaskId: id("2"),
  canonicalRepository: "https://github.com/example/workshop-app.git",
  baselineCommit: "a".repeat(40),
  auditorExecutionId: id("3"), verifierExecutionId: id("4"),
  auditorEvidenceDigest: "b".repeat(64), verifierEvidenceDigest: "c".repeat(64),
  stage: "implementation",
  scopeDescription: "Recover the workshop application's accepted scheduling assumptions.",
  intendedUser: "Workshop coordinator", primaryProblem: "Booking overlaps obscure available capacity.",
  coreOutcome: "Coordinator sees one verified conflict in the booking schedule.",
  assumptions: [{ recordId: id("5"), revision: "d".repeat(64), decisionStatus: "accepted", implementationState: "implemented_incorrectly" }],
  limitations: ["This audit covers booking conflicts only."],
  productReady: false, saleReady: false
});

test("application-specific takeover preserves an accepted assumption's incorrect implementation", () => {
  assert.deepEqual(applicationBaseline.parse(baseline()), baseline());
});

test("a proposed assumption can be implemented without silently accepting its intent", () => {
  const input = baseline();
  input.assumptions[0] = { ...input.assumptions[0], decisionStatus: "proposed", implementationState: "implemented_correctly" };
  assert.equal(applicationBaseline.parse(input).assumptions[0].decisionStatus, "proposed");
  assert.equal(applicationBaseline.safeParse({ ...input, assumptions: [{ ...input.assumptions[0], implementationState: "proposed" }] }).success, false);
  assert.equal(applicationBaseline.safeParse({ ...input, assumptions: [{ ...input.assumptions[0], decisionStatus: "implemented_correctly" }] }).success, false);
});

test("independent execution IDs and unique canonical assumption IDs are required", () => {
  const input = baseline();
  assert.equal(applicationBaseline.safeParse({ ...input, verifierExecutionId: input.auditorExecutionId }).success, false);
  const executionId = "abcdef00-0000-4000-8000-000000000003";
  assert.equal(applicationBaseline.safeParse({ ...input, auditorExecutionId: executionId, verifierExecutionId: executionId.toUpperCase() }).success, false);
  assert.equal(applicationBaseline.safeParse({ ...input, assumptions: [input.assumptions[0], { ...input.assumptions[0], decisionStatus: "deferred" }] }).success, false);
  for (const field of ["applicationId", "auditTaskId", "auditorExecutionId", "verifierExecutionId"] as const) {
    assert.equal(applicationBaseline.safeParse({ ...input, [field]: "not-a-uuid" }).success, false);
  }
});

test("repository identity rejects credential-bearing and ambiguous transport URLs", () => {
  for (const canonicalRepository of [
    "http://github.com/example/app.git", "ssh://git@github.com/example/app.git",
    "https://token@github.com/example/app.git", "https://user:secret@github.com/example/app.git",
    "https://github.com/example/app.git?token=secret", "https://github.com/example/app.git?",
    "https://github.com/example/app.git#main", "https://github.com/example/app.git#",
    "https://github.com/", "https://github.com/example/a pp.git", `https://github.com/${"x".repeat(501)}`
  ]) assert.equal(applicationBaseline.safeParse({ ...baseline(), canonicalRepository }).success, false, canonicalRepository);
});

test("takeover cannot claim product readiness, sale readiness or authority", () => {
  for (const patch of [
    { productReady: true }, { saleReady: true }, { stage: "product_readiness" }, { stage: "sale_readiness" },
    { executionAuthority: true }, { writeAuthority: true }, { releaseAuthority: true }
  ]) assert.equal(applicationBaseline.safeParse({ ...baseline(), ...patch }).success, false);
});

test("baseline evidence is exact and payload remains bounded", () => {
  for (const patch of [
    { baselineCommit: "A".repeat(40) }, { baselineCommit: "a".repeat(39) },
    { auditorEvidenceDigest: "B".repeat(64) }, { verifierEvidenceDigest: "c".repeat(63) },
    { assumptions: [{ ...baseline().assumptions[0], revision: "not-a-digest" }] },
    { assumptions: Array.from({ length: 31 }, (_, index) => ({ ...baseline().assumptions[0], recordId: id(String(100 + index)) })) },
    { limitations: Array(21).fill("Scope limitation") }, { limitations: [""] },
    { intendedUser: "   " }, { primaryProblem: "x".repeat(2001) },
    { assumptions: [{ ...baseline().assumptions[0], approvedBy: id("7") }] }
  ]) assert.equal(applicationBaseline.safeParse({ ...baseline(), ...patch }).success, false);
});
