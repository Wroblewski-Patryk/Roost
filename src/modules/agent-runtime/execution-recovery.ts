import { z } from "zod";

export const recoveryStage = z.enum(["claimed", "prepared", "spawn_intent", "running", "effect_possible"]);
export const recoveryCheckpoint = z.object({
  schemaVersion: z.literal("roost-recovery-v1"), stage: recoveryStage,
  sessionId: z.string().uuid(), packetRevision: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  workspaceDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable()
}).strict().refine((value) => value.stage === "claimed" ? value.packetRevision === null && value.workspaceDigest === null : Boolean(value.packetRevision && value.workspaceDigest));
export const recoveryReasons = z.enum(["lease_expired", "checkpoint_missing", "checkpoint_mismatch", "process_may_be_running", "effect_may_have_occurred", "writer_locked", "packet_changed", "workspace_changed", "repository_mismatch", "sandbox_invalid", "packet_invalid", "multiple_executions", "runtime_disabled", "recovery_conflict", "context_unavailable", "local_state_invalid"]);
export type RecoveryReason = z.infer<typeof recoveryReasons>;
export function recoveryMessage(reason: RecoveryReason, stage: string) {
  return `Execution recovery stopped at ${stage}: ${reason}. No work was restarted; reconcile the previous execution.`;
}
export function nextCheckpointStage(current: string, next: string) {
  return ({ claimed: "prepared", prepared: "spawn_intent", spawn_intent: "running", running: "effect_possible" } as Record<string, string>)[current] === next;
}
