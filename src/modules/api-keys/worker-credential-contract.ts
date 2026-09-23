import { z } from "zod";

const id = z.string().uuid(), digest = z.string().regex(/^[a-f0-9]{64}$/);
export const workerHandoffBinding = z.object({ requestId: id, requestDigest: digest, hostFingerprint: digest,
  origin: z.string().min(9).max(512), certificateFingerprint: digest, replacesRequestId: id.nullable() }).strict();
export const workerCredentialIntent = z.object({
  schemaVersion: z.literal("worker-credential-lifecycle-v1"), action: z.enum(["enroll", "rotate", "revoke"]),
  workspaceId: id, installationId: id, hostId: id,
  expectedCredentialId: id.nullable(), expectedVersion: z.number().int().nonnegative(), expectedEpoch: z.number().int().nonnegative(),
  expectedFingerprint: digest.nullable(), expiresAt: z.string().datetime().nullable(), validUntil: z.string().datetime(),
  handoff: workerHandoffBinding.optional()
}).strict().superRefine((v, c) => {
  if (v.expectedCredentialId === null ? v.expectedVersion !== 0 || v.expectedEpoch !== 0 || v.expectedFingerprint !== null
    : v.expectedVersion < 1 || v.expectedEpoch < 1 || v.expectedFingerprint === null)
    c.addIssue({ code: "custom", message: "Exact generation precondition required" });
  if (v.action !== "enroll" && !v.expectedCredentialId || (v.action === "revoke") !== (v.expiresAt === null))
    c.addIssue({ code: "custom", message: "Invalid lifecycle transition" });
});
export const workerCredentialCommand = z.object({ requestId: id, decisionId: id, decisionRevision: z.number().int().positive(),
  explicitAcceptance: z.literal(true), intent: workerCredentialIntent }).strict();
export type WorkerCredentialIntent = z.infer<typeof workerCredentialIntent>;
export type WorkerCredentialCommand = z.infer<typeof workerCredentialCommand>;
export const workerCredentialScopes = ["agent-runtime:claim"];
