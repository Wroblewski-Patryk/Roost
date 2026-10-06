import type { Prisma } from "@prisma/client";
import { resolve } from "node:path";
import { z } from "zod";
import {
  qualifyCompatibleRecoveryProof,
  type CompatibleRecoveryProofSnapshot,
  type QualifiedCompatibleRecoveryProof
} from "./compatible-recovery-proof";

// Read-only adapter, invoked within the caller's transaction. Nothing executes
// on import. sourceView/scopeView/previous are trusted normal DB results; model
// JSON, private signatures and caller-supplied lookup flags are not facts here.
export type CompatibleRecoveryReadStore = Pick<Prisma.TransactionClient,
  "workspace" | "workspaceMembership" | "applicationEvidence" | "agentExecution">;
const shared = require(resolve(__dirname, "../../../scripts/lib/agent-host-release-contract.cjs"));
const uuid = z.string().uuid();
type Row = Record<string, any>;
const errorCode = "release_compatible_recovery_build_provenance_unproven";
const check = (value: unknown) => { if (!value) throw new Error(errorCode); };
const read = (value: Row, key: string) => value?.[key] ?? value?.[key.replace(/[A-Z]/g, c => "_" + c.toLowerCase())];

export async function loadCompatibleRecoveryProof(
  tx: CompatibleRecoveryReadStore,
  workspaceId: string,
  input: Row,
  issuerUserId: string,
  sourceView: Row,
  scopeView: Row,
  previous: Row,
  now: Date
): Promise<{ error: typeof errorCode } | {
  proof: QualifiedCompatibleRecoveryProof; snapshot: CompatibleRecoveryProofSnapshot;
  build: Row; compatibility: Row;
}> {
  try {
    // The service strips its separately compared server-owned proof snapshot.
    // This adapter never strips a request proof/authority field for the caller.
    check(uuid.safeParse(workspaceId).success && uuid.safeParse(issuerUserId).success
      && uuid.safeParse(input.applicationId).success && /^[a-f0-9]{40}$/.test(input.commit ?? "")
      && !Object.hasOwn(input, "compatibleRecoveryProof") && now instanceof Date && Number.isFinite(now.getTime()));
    const recovery = shared.compatibleArtifactRecoverySchema.parse(input.compatibleArtifactRecovery),
      prior = recovery.prior, previousRelease = previous?.release;
    check(previousRelease?.id === prior.releaseId && read(previousRelease, "workspaceId") === workspaceId
      && previous.expectedVersion === prior.expectedVersion
      && previousRelease.snapshot?.applicationId === input.applicationId && previousRelease.snapshot.hostId === input.hostId);
    const closures = previous.failedClosures?.filter((c: Row) => c.id === prior.closureId);
    check(Array.isArray(closures) && closures.length === 1);
    const closure = closures[0], closedAt = read(closure, "createdAt");
    check(read(closure, "releaseId") === prior.releaseId && read(closure, "closureDigest") === prior.closureDigest
      && closedAt !== undefined && Number.isFinite(new Date(closedAt).getTime()));

    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, ownerUserId: true } });
    check(workspace?.id === workspaceId && workspace.ownerUserId === issuerUserId);
    const membership = await tx.workspaceMembership.findFirst({
      where: { workspaceId, userId: issuerUserId, role: "owner" },
      select: { workspaceId: true, userId: true, role: true }
    });
    check(membership?.workspaceId === workspaceId && membership.userId === issuerUserId && membership.role === "owner");
    const records = await tx.applicationEvidence.findMany({
      where: { workspaceId, applicationId: input.applicationId, type: "test", source: "human", verificationStatus: "verified",
        reference: { startsWith: `roost-compatible-native-build:${input.commit}:` },
        metadata: { path: ["build", "evidenceDigest"], equals: recovery.replacement.buildReceiptDigest } },
      orderBy: { createdAt: "desc" }, take: 2,
      select: { id: true, workspaceId: true, applicationId: true, type: true, source: true, reference: true,
        observedAt: true, createdAt: true, updatedAt: true, verifiedAt: true, verifiedByType: true, verifiedById: true,
        verificationStatus: true, metadata: true }
    });
    check(records.length === 1);
    const record = records[0], metadata = record.metadata as Row;
    check(record.workspaceId === workspaceId && record.applicationId === input.applicationId
      && metadata && !Array.isArray(metadata) && uuid.safeParse(metadata.nativeAttemptId).success);
    // The actual query happens before branding. This UUID denotes a root-owned
    // Job run; it must not be an AgentExecution from this workspace.
    const execution = await tx.agentExecution.findFirst({
      where: { id: metadata.nativeAttemptId, workspaceId }, select: { id: true }
    });
    check(execution === null || execution?.id === metadata.nativeAttemptId);
    const result = qualifyCompatibleRecoveryProof({
      workspaceId, input, issuerUserId, primaryOwnerUserId: workspace!.ownerUserId!,
      records, sourceView, scopeView, previousClosureCreatedAt: closedAt,
      nativeAttemptAgentExecutionId: execution?.id ?? null, now
    });
    if ("error" in result) return result;
    return { ...result, build: shared.compatibleRecoveryBuildSchema.parse(metadata.build),
      compatibility: shared.compatibleRecoveryCompatibilitySchema.parse(metadata.compatibility) };
  } catch { return { error: errorCode }; }
}
