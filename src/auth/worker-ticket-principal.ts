import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "./api-key.middleware";

const id = z.string().uuid(), digest = z.string().regex(/^[a-f0-9]{64}$/);
export const workerTicketIdentitySchema = z.object({
  credentialId: id, credentialFingerprint: digest, credentialVersion: z.number().int().positive(),
  bindingEpoch: z.number().int().positive(), workspaceId: id, hostId: id, installationId: id
}).strict();
export const workerTicketBindingSchema = workerTicketIdentitySchema.extend({
  leaseTokenDigest: digest, claimSessionId: id, expiresAt: z.string().datetime()
}).strict();
export const workerTicketProofSchema = z.object({ hostId: id, installationId: id, leaseToken: id }).strict();
export type WorkerTicketIdentity = z.infer<typeof workerTicketIdentitySchema>;
export type WorkerTicketBinding = z.infer<typeof workerTicketBindingSchema>;
export type WorkerTicketProof = z.infer<typeof workerTicketProofSchema>;
export const workerTicketFingerprint = (keyHash: string) => createHash("sha256").update("roost-worker-ticket-v1:" + keyHash).digest("hex");
export const workerClaimTokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");

// Derived exclusively from the already authenticated database credential. A
// profile label, scope list or host's self-reported metadata is never a binding.
export function workerTicketPrincipal(record: any, at = new Date()): WorkerTicketIdentity | null {
  if (!record.active || record.revokedAt || record.boundAgentId || record.key || !record.keyHash
    || !record.expiresAt || new Date(record.expiresAt) <= at
    || !Array.isArray(record.scopes) || record.scopes.length !== 1 || record.scopes[0] !== "agent-runtime:claim") return null;
  const parsed = workerTicketIdentitySchema.safeParse({ credentialId: record.id, workspaceId: record.workspaceId,
    credentialFingerprint: workerTicketFingerprint(record.keyHash), credentialVersion: record.credentialVersion,
    hostId: record.workerHostId, installationId: record.workerInstallationId, bindingEpoch: record.workerBindingEpoch });
  return parsed.success ? parsed.data : null;
}

// The shared capability also covers registration/recovery. This credential class
// authorizes exactly these three existing endpoints, never those other routes.
export function workerCredentialRoute(method: string, path: string) {
  return method === "POST" && /^\/v1\/agent-runtime\/(?:executions\/claim|owner-tickets\/(?:consume|status))$/.test(path.replace(/\/+$/, ""));
}
export async function workerClaimAllowed(db: Prisma.TransactionClient, auth: AuthContext, hostId: string, at = new Date()) {
  if (!auth.workerTicketIdentity || !auth.apiKeyId || auth.authType !== "api_key" || auth.agentId || auth.userId) return false;
  const key = await db.apiKey.findUnique({ where: { id: auth.apiKeyId } }), current = key && workerTicketPrincipal(key, at);
  const head = await db.trustedProviderTicketKey.findUnique({ where: { workspaceId: auth.workspaceId } });
  const host = await db.agentHost.findFirst({ where: { id: hostId, workspaceId: auth.workspaceId, status: { not: "disabled" } } });
  return !!current && !!host && current.hostId === hostId && current.workspaceId === auth.workspaceId && head?.installationId === current.installationId
    && Object.entries(current).every(([k, value]) => auth.workerTicketIdentity![k as keyof WorkerTicketIdentity] === value);
}
