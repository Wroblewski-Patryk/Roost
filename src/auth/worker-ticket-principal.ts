import { createHash } from "node:crypto";
import { z } from "zod";

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
    || !Array.isArray(record.scopes) || !record.scopes.includes("agent-runtime:claim")) return null;
  const parsed = workerTicketIdentitySchema.safeParse({ credentialId: record.id, workspaceId: record.workspaceId,
    credentialFingerprint: workerTicketFingerprint(record.keyHash), credentialVersion: record.credentialVersion,
    hostId: record.workerHostId, installationId: record.workerInstallationId, bindingEpoch: record.workerBindingEpoch });
  return parsed.success ? parsed.data : null;
}
