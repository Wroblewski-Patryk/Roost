import test from "node:test";
import assert from "node:assert/strict";
import { safeExecutionDiagnostic, leaseRecoveryReason } from "./lib/agent-host-recovery-diagnostics.mjs";

test("lost completion response identifies terminal transport without exposing its proof", () => {
  const error = Object.assign(new Error("agent_terminal_completion_uncertain"), {
    terminalCompletionUncertain: true, details: { leaseToken: "private", ciphertext: "private" }
  });
  assert.deepEqual(safeExecutionDiagnostic({ error, executionPhase: "terminal_completion", nativeTermination: "root_exit" }), {
    phase: "terminal_completion", code: "agent_terminal_completion_uncertain", detail: "other", leaseCode: "none", nativeTermination: "root_exit"
  });
});

test("consumed read-only proof without Job cleanup is uncertainty, never a lease expiry", () => {
  // Mirrors quiet's post-consumption launch error followed by failing abort:
  // leaseLost is deliberately retained to forbid restart/ordinary fail reporting.
  const error = Object.assign(new Error("hermes_startup_receipt_expired"), {
    protocolAdmission: true, leaseLost: true, boundaryViolation: true
  });
  assert.equal(leaseRecoveryReason(error), "process_may_be_running");
  assert.deepEqual(safeExecutionDiagnostic({ error, executionPhase: "native_execution" }), {
    phase: "native_execution", code: "hermes_startup_receipt_expired", detail: "other", leaseCode: "none"
  });
  assert.equal(error.leaseLost, true);
});

test("only the two explicit expiry errors report lease_expired", () => {
  for (const message of ["agent_execution_lease_expired", "agent_recovery_lease_expired"])
    assert.equal(leaseRecoveryReason(new Error(message)), "lease_expired");
  for (const message of ["agent_execution_lease_rejected", "agent_execution_cancel_requested", "hermes_stop_recovery_unproven", "readonly_boundary_unproven"])
    assert.equal(leaseRecoveryReason(Object.assign(new Error(message), { leaseLost: true })), "process_may_be_running");
  assert.equal(leaseRecoveryReason(new Error("ordinary_failure")), undefined);
  assert.equal(leaseRecoveryReason({ message: "agent_execution_lease_expired_suffix", leaseLost: "true" }), undefined);
});

test("prelaunch context and installation phases preserve closed lease diagnostics", () => {
  for (const phase of ["launch_context", "installation_attestation", "managed_source"]) {
    const diagnostic = safeExecutionDiagnostic({ executionPhase: phase, error: new Error("agent_execution_lease_expired") });
    assert.equal(diagnostic.phase, phase); assert.equal(diagnostic.code, "agent_execution_lease_expired");
  }
});

test("known managed boundary diagnostic retains only protocol fields", () => {
  const error = Object.assign(new Error("managed_admission_blocked"), { details: {
    phase: "consume_native_boundary", reason: "readonly_boundary_unproven", boundaryReason: "docker_observation_timeout",
    path: "C:\\private", argv: ["secret"], signature: "private", raw: { token: "private" }, status: 409
  } });
  assert.deepEqual(safeExecutionDiagnostic({ error, executionPhase: "provider_launch" }), {
    phase: "provider_launch", code: "managed_admission_blocked", detail: "readonly_boundary_unproven", leaseCode: "none",
    managedPhase: "consume_native_boundary", boundaryReason: "docker_observation_timeout"
  });
});

test("credentials and invented protocol-shaped codes never become diagnostic strings", () => {
  for (const secret of ["cc_v1_private_credential", "agent_private_secret", "hermes_private_secret", "readonly_private_secret",
    "roost_http_private_secret", "windows_job_private_secret", "execution_packet_private_secret", "owner@example.invalid", "C:\\private\\token", "secret\nvalue", "x".repeat(1000)]) {
    const error = { message: secret, details: { reason: secret, phase: secret, boundaryReason: secret }, stack: secret, token: secret };
    const result = safeExecutionDiagnostic({ error, executionPhase: secret, leaseFailure: error });
    assert.deepEqual(result, { phase: "other", code: "other", detail: "other", leaseCode: "other" });
    assert.ok(!JSON.stringify(result).includes(secret));
  }
});

test("expiry metadata admits only bounded finite integer fields", () => {
  const expiry = Object.assign(new Error("agent_execution_lease_expired"), { details: {
    confirmationCount: 2, lastRequestElapsedMs: 173000, lastConfirmedRemainingMs: 65000,
    currentMonotonicRemainingMs: -42, startedAt: "private", token: "private", nested: { raw: "private" }
  } });
  const result = safeExecutionDiagnostic({ error: expiry, executionPhase: "post_admission", leaseFailure: expiry });
  assert.deepEqual(result.leaseDiagnostics, { confirmationCount: 2, lastRequestElapsedMs: 173000,
    lastConfirmedRemainingMs: 65000, currentMonotonicRemainingMs: -42 });
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.leaseDiagnostics));
  for (const invalid of [NaN, Infinity, -Infinity, "123", 0.5, 1_000_001, null, { valueOf() { throw Error("secret"); } }]) {
    expiry.details = { confirmationCount: invalid };
    assert.equal(safeExecutionDiagnostic({ leaseFailure: expiry }).leaseDiagnostics, undefined);
  }
  expiry.details = { lastRequestElapsedMs: -1, lastConfirmedRemainingMs: 180001, currentMonotonicRemainingMs: -180001 };
  assert.equal(safeExecutionDiagnostic({ leaseFailure: expiry }).leaseDiagnostics, undefined);
  assert.equal(safeExecutionDiagnostic({ error: expiry }).leaseDiagnostics, undefined);
});

test("accessors and coercion cannot reveal raw errors or change recovery classification", () => {
  let reads = 0;
  const hostile = Object.defineProperties({}, Object.fromEntries(["message", "details", "leaseLost"].map(key => [key,
    { get() { reads++; throw Error("private"); } }])));
  assert.deepEqual(safeExecutionDiagnostic({ error: hostile, leaseFailure: hostile }), {
    phase: "other", code: "other", detail: "other", leaseCode: "other"
  });
  assert.equal(leaseRecoveryReason(hostile), undefined); assert.equal(reads, 0);
  assert.deepEqual(safeExecutionDiagnostic(), { phase: "other", code: "other", detail: "other", leaseCode: "none" });
});

test("native termination is an explicit closed caller field, never inferred from untrusted receipt JSON", () => {
  const error = { details: { ownedTreeReceipt: { terminationReason: "startup_timeout", cleanup: true } } };
  assert.equal(safeExecutionDiagnostic({ error }).nativeTermination, undefined);
  assert.equal(safeExecutionDiagnostic({ error, nativeTermination: "startup_timeout" }).nativeTermination, "startup_timeout");
  assert.equal(safeExecutionDiagnostic({ error, nativeTermination: "cc_v1_private_credential" }).nativeTermination, undefined);
});
