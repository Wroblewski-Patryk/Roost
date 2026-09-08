import test from "node:test";
import assert from "node:assert/strict";
import { agentPrincipalRoute } from "../auth/agent-principal";
import { createAgentCredentialSchema, changeAgentCredentialSchema } from "../modules/api-keys/agent-credential.service";
test("bound credentials admit only known review reads and commands including compatibility aliases", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const prefix of ["", "/v1"]) {
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/actions/review`));
    assert.ok(agentPrincipalRoute("POST", `${prefix}/agent-runtime/tasks/${id}/actions/review-return`));
    assert.ok(agentPrincipalRoute("GET", `${prefix}/agent-runtime/tasks/${id}/review`));
    for (const route of ["/api-keys", "/agent-runtime/executions", `/tasks/${id}`, "/workforce", "/mcp", `/agent-runtime/tasks/${id}/actions/submit-for-execution`]) assert.equal(agentPrincipalRoute("POST", prefix + route), false);
  }
});
test("credential commands reject authority supplied by callers and require explicit expiry/version", () => {
  const input = { requestId: "00000000-0000-4000-8000-000000000001", agentId: "00000000-0000-4000-8000-000000000002", name: "Fixture verifier", expiresAt: "2026-12-01T00:00:00.000Z" };
  assert.ok(createAgentCredentialSchema.safeParse(input).success);
  for (const field of ["ownerId", "actorId", "workspaceId", "scopes", "profileId"]) assert.equal(createAgentCredentialSchema.safeParse({ ...input, [field]: "forged" }).success, false);
  assert.equal(changeAgentCredentialSchema.safeParse({ requestId: input.requestId }).success, false);
});
