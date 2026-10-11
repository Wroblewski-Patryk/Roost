import { createHash } from "node:crypto";

export const proofLifetimeSeconds = 90;

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// Only routes whose human commands may require recent password verification
// can receive a proof. It never changes the ordinary bearer token.
export function proofEligibleAction(method: string, path: string) {
  if (method !== "POST" || path.includes("?") || path.includes("#")) return false;
  return path === "/v1/api-keys/agent-credentials"
    || /^\/v1\/strategy\/direction\/drafts\/[0-9a-f-]{36}\/adopt$/.test(path)
    || /^\/v1\/goal-mandates\/goals\/[0-9a-f-]{36}\/drafts\/[0-9a-f-]{36}\/adopt$/.test(path)
    || /^\/v1\/strategy\/direction\/comparisons\/[0-9a-f-]{36}\/actions\/resolve$/.test(path)
    || /^\/v1\/api-keys\/[0-9a-f-]{36}\/actions\/(?:rotate|revoke)$/.test(path)
    || /^\/v1\/api-keys\/worker-credentials\/(?:enroll|rotate|revoke)$/.test(path)
    || path === "/v1/api-keys/worker-credentials/handoff/approve"
    || /^\/v1\/agent-runtime\/owner-tickets\/(?:issue|consume|status|revoke|rotate)$/.test(path)
    || path === "/v1/agent-runtime/bootstrap/installation"
    || path === "/v1/agent-runtime/bootstrap/lifecycle"
    || path === "/v1/agent-runtime/bootstrap/v3/owner-auth"
    || path === "/v1/agent-runtime/releases"
    || /^\/v1\/agent-runtime\/releases\/[0-9a-f-]{36}\/actions\/(?:renew|close-failed|authorize-reconciliation)$/.test(path)
    || /^\/v1\/agent-runtime\/tasks\/[0-9a-f-]{36}\/proposal-mandates(?:\/[0-9a-f-]{36}\/actions\/revoke)?$/.test(path)
    || /^\/v1\/google-drive\/tasks\/[0-9a-f-]{36}\/docs\/[0-9a-f-]{36}\/governed\/mandate$/.test(path)
    || /^\/v1\/agent-runtime\/executions\/[0-9a-f-]{36}\/actions\/request-critical-preemption$/.test(path);
}
