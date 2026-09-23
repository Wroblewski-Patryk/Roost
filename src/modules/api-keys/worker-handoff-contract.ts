import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { workerCredentialCommand } from "./worker-credential-contract";

export const handoffPolicy = Object.freeze({ requestTtlMs: 120000, ackTtlMs: 60000, maxBadAttempts: 5, maxPolls: 30,
  pollIntervalMs: 1000, requestsPerMinute: 3, maximumCredentialTtlMs: 30 * 86400000 });
export const handoffHttpsPaths = Object.freeze({ request:"/v1/api-keys/worker-credentials/handoff/request",
  poll:"/v1/worker-credential-handoff/poll", ack:"/v1/worker-credential-handoff/ack", status:"/v1/worker-credential-handoff/status" });
export type HandoffHttpsAction = keyof typeof handoffHttpsPaths;
const id = z.string().uuid(), digest = z.string().regex(/^[a-f0-9]{64}$/);
export const exactHttpsOrigin = z.string().min(9).max(512).refine(value => {
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash
    && u.pathname === "/" && /^https:\/\/[a-z0-9.\-\[\]:]+$/.test(value) && !value.endsWith("/"); }
  catch { return false; }
}, "Exact HTTPS origin required");
export const handoffRequest = z.object({ requestId: id, workspaceId: id, installationId: id, hostId: id,
  hostFingerprint: digest, deviceSecretHash: digest, challengeHash: digest, origin: exactHttpsOrigin,
  certificateFingerprint: digest, replacesRequestId: id.nullable() }).strict();
export const handoffApproval = z.object({ requestId: id, userCode: z.string().regex(/^[A-F0-9]{8}$/),
  command: workerCredentialCommand }).strict();
const secret = z.instanceof(Buffer).refine(b => b.length >= 32 && b.length <= 128, "Bounded device proof required");
export const handoffDeviceProof = z.object({ requestId: id, workspaceId: id, installationId: id, hostId: id,
  hostFingerprint: digest, deviceSecret: secret, challenge: secret }).strict();
export const handoffAck = handoffDeviceProof.extend({ credentialId: id, credentialFingerprint: digest,
  responseDigest: digest, ackProof: digest }).strict();
export type HandoffRequest = z.infer<typeof handoffRequest>;
export type HandoffDeviceProof = z.infer<typeof handoffDeviceProof>;
export const handoffHash = (domain: "device" | "challenge" | "code", value: Buffer | string) => createHash("sha256").update(`roost-worker-handoff-v1:${domain}:`).update(value).digest("hex");
export const handoffCode = (requestId: string) => handoffHash("code", requestId).slice(0, 8).toUpperCase();
export function equalHandoffDigest(a: string, b: string) {
  return /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
// The Worker computes keyHash locally from the received credential. Its public
// fingerprint cannot substitute for this possession proof; raw key never enters ack.
export const handoffAckProof = (keyHash: string, requestId: string, responseDigest: string) =>
  createHmac("sha256", keyHash).update(`roost-worker-handoff-v1:ack:${requestId}:${responseDigest}`).digest("hex");
export type SyntheticHandoffTransport = { qualification: "synthetic_memory_only"; requestedOrigin: string; connectedOrigin: string;
  certificateFingerprint: string; tlsValidated: boolean; redirected: boolean; proxyOrigin: string | null };
