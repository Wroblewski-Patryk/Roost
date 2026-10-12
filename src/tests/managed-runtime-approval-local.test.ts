import assert from "node:assert/strict";
import test from "node:test";
import { managedRuntimeApproval } from "../modules/decisions/decision-governance-contract";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = { schemaVersion: "roost-managed-runtime-approval-v1", taskId: id(1),
  installationId: id(2), selectionDigest: "a".repeat(64), riskClass: "low",
  mode: "trusted_provider_pilot", residualRiskAccepted: true,
  acknowledgement: "windows_account_authority_not_os_isolation" };

test("local runtime approval is admitted only for the exact company information class", () => {
  const local = { ...base, executionClass: "roost-company-information-runtime-v1",
    applicationId: null, backend: "ollama_loopback" };
  assert.equal(managedRuntimeApproval.safeParse(local).success, true);
  assert.equal(managedRuntimeApproval.safeParse({ ...local, applicationId: id(3) }).success, false);
  assert.equal(managedRuntimeApproval.safeParse({ ...local, executionClass: "application" }).success, false);
  assert.equal(managedRuntimeApproval.safeParse({ ...local, riskClass: "medium" }).success, false);
  assert.equal(managedRuntimeApproval.safeParse({ ...local, backend: "unknown" }).success, false);
  assert.equal(managedRuntimeApproval.safeParse({ ...base, applicationId: id(3), backend: "codex_responses" }).success, true);
});
