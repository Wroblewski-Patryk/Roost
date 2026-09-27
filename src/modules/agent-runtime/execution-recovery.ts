import { z } from "zod";

export const recoveryStage = z.enum(["claimed", "branch_intent", "branch_ready", "prepared", "spawn_intent", "running", "effect_possible"]);
export const recoveryCheckpoint = z.object({
  schemaVersion: z.literal("roost-recovery-v1"), stage: recoveryStage,
  sessionId: z.string().uuid(), packetRevision: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  workspaceDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  branch: z.string().min(1).max(240).optional(), headCommit: z.string().regex(/^[a-f0-9]{40}$/).optional(),
  // Optional for reading/reporting legacy state. New transitions and prepared
  // recovery require the pin; absence never silently upgrades old evidence.
  contextRevision: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional()
}).strict().refine((value) => value.stage === "claimed"
  ? value.packetRevision === null && value.workspaceDigest === null && value.contextRevision == null && value.branch === undefined && value.headCommit === undefined
  : Boolean(value.packetRevision && value.workspaceDigest && (value.stage === "branch_intent" || value.stage === "branch_ready"
    ? value.branch && value.headCommit
    : ((value.branch === undefined && value.headCommit === undefined) || (value.branch && value.headCommit)))), "Incomplete checkpoint identity");
export const recoveryReasons = z.enum(["lease_expired", "checkpoint_missing", "checkpoint_mismatch", "process_may_be_running", "effect_may_have_occurred", "writer_locked", "packet_changed", "workspace_changed", "context_changed", "repository_mismatch", "sandbox_invalid", "packet_invalid", "multiple_executions", "runtime_disabled", "recovery_conflict", "context_unavailable", "local_state_invalid"]);
export type RecoveryReason = z.infer<typeof recoveryReasons>;
export function recoveryMessage(reason: RecoveryReason, stage: string) {
  return `Execution recovery stopped at ${stage}: ${reason}. No work was restarted; reconcile the previous execution.`;
}
export function nextCheckpointStage(current: string, next: string, codingLocal = false) {
  const transitions: Record<string, string> = codingLocal
    ? { claimed: "branch_intent", branch_intent: "branch_ready", branch_ready: "prepared", prepared: "spawn_intent", spawn_intent: "running", running: "effect_possible" }
    : { claimed: "prepared", prepared: "spawn_intent", spawn_intent: "running", running: "effect_possible" };
  return transitions[current] === next;
}
