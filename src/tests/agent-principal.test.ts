import test from "node:test";
import assert from "node:assert/strict";
import { agentPrincipalRoute } from "../auth/agent-principal";
import { ordinaryApiKeyReadAllowed } from "../auth/company-source-read-boundary";
import { proofEligibleAction } from "../auth/owner-action-proof";
import { createAgentCredentialSchema, changeAgentCredentialSchema } from "../modules/api-keys/agent-credential.service";
test("bound credentials admit only known review reads and commands including compatibility aliases", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const prefix of ["", "/v1"]) {
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/actions/review`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/actions/review-return`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/proposals`));
    assert.equal(agentPrincipalRoute("GET", `${prefix}/agent-runtime/task-proposals`), false);
    assert.equal(agentPrincipalRoute("POST", `${prefix}/agent-runtime/task-proposals/${id}/actions/accept`), false);
    assert.equal(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/proposal-mandates`), false);
    assert.ok(agentPrincipalRoute("GET", `${prefix}/agent-runtime/tasks/${id}/review`));
    assert.ok(agentPrincipalRoute("GET", `${prefix}/agent-runtime/releases/${id}`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/releases/${id}/operations`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/releases/${id}/operations/${id}/outcome`));
    assert.equal(agentPrincipalRoute("POST", `${prefix}/agent-runtime/releases`), false);
    assert.equal(agentPrincipalRoute("POST", `${prefix}/agent-runtime/releases/${id}/actions/revoke`), false);
    assert.ok(agentPrincipalRoute("GET", `${prefix}/decisions/${id}/governance`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/decisions/${id}/governance/actions`));
    assert.equal(agentPrincipalRoute("POST", `${prefix}/decisions/${id}/governance/withdrawals`), false);
    for (const route of ["/decisions/mandates", "/decisions/governance/proposals", "/decisions/deferrals", "/decisions/reopening-events"]) assert.equal(agentPrincipalRoute("POST",prefix+route),false);
    assert.equal(agentPrincipalRoute("GET",prefix+"/decisions/mandates"),false);
    for (const route of ["/api-keys", "/agent-runtime/executions", `/tasks/${id}`, "/workforce", "/mcp", `/agent-runtime/tasks/${id}/actions/submit-for-execution`]) assert.equal(agentPrincipalRoute("POST", prefix + route), false);
  }
});
test("proposal creation is limited to a bound credential and owner commands stay human-only", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(ordinaryApiKeyReadAllowed("POST", `/v1/agent-runtime/tasks/${id}/proposals`, true), true);
  assert.equal(ordinaryApiKeyReadAllowed("POST", `/v1/agent-runtime/tasks/${id}/proposals`, false), false);
  for (const route of [
    "/v1/agent-runtime/task-proposal-mandate-candidates",
    `/v1/agent-runtime/tasks/${id}/proposal-mandates`,
    `/v1/agent-runtime/task-proposals/${id}/actions/accept`,
    `/v1/agent-runtime/task-proposals/${id}/actions/reject`
  ]) {
    assert.equal(ordinaryApiKeyReadAllowed("GET", route, true), false);
    assert.equal(ordinaryApiKeyReadAllowed("POST", route, true), false);
  }
  assert.equal(proofEligibleAction("POST", `/v1/agent-runtime/tasks/${id}/proposal-mandates`), true);
  assert.equal(proofEligibleAction("POST", `/v1/agent-runtime/tasks/${id}/proposal-mandates/${id}/actions/revoke`), true);
  assert.equal(proofEligibleAction("POST", `/v1/agent-runtime/tasks/${id}/proposals`), false);
  assert.equal(proofEligibleAction("POST", `/v1/decisions/${id}/governance/withdrawals`), true);
  assert.equal(proofEligibleAction("POST", `/v1/decisions/${id}/governance/expired-credential-withdrawals`), true);
  assert.equal(ordinaryApiKeyReadAllowed("POST", `/v1/decisions/${id}/governance/withdrawals`, true), false);
  assert.equal(ordinaryApiKeyReadAllowed("POST", `/v1/decisions/${id}/governance/expired-credential-withdrawals`, true), false);
});
test("credential commands reject authority supplied by callers and require explicit expiry/version", () => {
  const input = { requestId: "00000000-0000-4000-8000-000000000001", agentId: "00000000-0000-4000-8000-000000000002", name: "Fixture verifier", expiresAt: "2026-12-01T00:00:00.000Z" };
  assert.ok(createAgentCredentialSchema.safeParse(input).success);
  for (const field of ["ownerId", "actorId", "workspaceId", "scopes", "profileId"]) assert.equal(createAgentCredentialSchema.safeParse({ ...input, [field]: "forged" }).success, false);
  assert.equal(changeAgentCredentialSchema.safeParse({ requestId: input.requestId }).success, false);
});
test("G24a package and Finding routes require a bound agent before task and review checks", () => {
  const task = "00000000-0000-4000-8000-000000000001";
  const site = "00000000-0000-4000-8000-000000000002";
  const base = `/v1/product-engineering/tasks/${task}/reference-sites`;
  for (const route of [base, `${base}/${site}/package`, `${base}/${site}/findings`]) {
    assert.equal(agentPrincipalRoute("GET", route), true);
    assert.equal(ordinaryApiKeyReadAllowed("GET", route, true), true);
    assert.equal(ordinaryApiKeyReadAllowed("GET", route, false), false);
  }
  assert.equal(agentPrincipalRoute("POST", `${base}/${site}/findings`), true);
  assert.equal(ordinaryApiKeyReadAllowed("POST", `${base}/${site}/findings`, true), true);
  assert.equal(ordinaryApiKeyReadAllowed("POST", `${base}/${site}/findings`, false), false);
  assert.equal(agentPrincipalRoute("POST", `${base}/${site}/package`), false);
});
