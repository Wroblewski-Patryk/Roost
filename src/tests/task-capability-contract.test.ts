import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { capabilityWindow, issueCapabilitySchema, capabilityReason } from "../modules/agent-runtime/task-capability-contract";

test("capabilities reject broader scopes and credential-shaped reasons", () => {
  const input = { requestId: randomUUID(), expectedVersion: "a".repeat(64), credentialId: randomUUID(), operation: "review_decision", validFrom: "2026-09-08T10:00:00Z", validUntil: "2026-09-08T10:30:00Z", reason: "Verify parser correction" };
  assert.ok(issueCapabilitySchema.safeParse(input).success);
  for (const extra of [{ operation: "*" }, { credentialId: "*" }, { taskId: "*" }, { applicationId: randomUUID() }, { agentId: randomUUID() }, { operations: ["review_decision", "return_to_executor"] }]) assert.equal(issueCapabilitySchema.safeParse({ ...input, ...extra }).success, false);
  for (const reason of ["Bearer synthetic-token", "api_key=synthetic", "cc_v1_" + "x".repeat(32), "-----BEGIN RSA PRIVATE KEY-----"]) assert.equal(capabilityReason.safeParse(reason).success, false);
});
test("capabilities are bounded by time and credential expiry", () => {
  const now = new Date("2026-09-08T10:00:00Z"), minute = (n: number) => new Date(+now + n * 60000);
  assert.ok(capabilityWindow(now, minute(30), minute(60), now));
  assert.ok(capabilityWindow(minute(10), minute(30), minute(60), now));
  for (const [from, until, expiry] of [[minute(-2), minute(30), minute(60)], [now, minute(61), minute(120)], [now, now, minute(60)], [now, minute(30), minute(29)]]) assert.equal(capabilityWindow(from!, until!, expiry!, now), false);
});
