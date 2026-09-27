import assert from "node:assert/strict";
import test from "node:test";
import { nextCheckpointStage, recoveryCheckpoint } from "../modules/agent-runtime/execution-recovery";

const sessionId = "00000000-0000-4000-8000-000000000001";
const identity = {
  schemaVersion: "roost-recovery-v1" as const,
  sessionId,
  packetRevision: "a".repeat(64),
  workspaceDigest: "b".repeat(64),
  contextRevision: "c".repeat(64),
};

test("coding checkpoint requires exact branch and head identity from branch intent", () => {
  const branchIntent = { ...identity, stage: "branch_intent", branch: "codex/task", headCommit: "d".repeat(40) };
  assert.equal(recoveryCheckpoint.safeParse(branchIntent).success, true);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, headCommit: undefined }).success, false);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, headCommit: "short" }).success, false);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, branch: undefined }).success, false);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, stage: "branch_ready" }).success, true);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, stage: "prepared" }).success, true);
  assert.equal(recoveryCheckpoint.safeParse({ ...branchIntent, stage: "claimed", packetRevision: null, workspaceDigest: null, contextRevision: null }).success, false);
});

test("coding and legacy checkpoint stages have separate pre-spawn transitions", () => {
  assert.equal(nextCheckpointStage("claimed", "branch_intent", true), true);
  assert.equal(nextCheckpointStage("branch_intent", "branch_ready", true), true);
  assert.equal(nextCheckpointStage("branch_ready", "prepared", true), true);
  assert.equal(nextCheckpointStage("claimed", "prepared", true), false);
  assert.equal(nextCheckpointStage("claimed", "prepared", false), true);
  assert.equal(nextCheckpointStage("claimed", "branch_intent", false), false);
  assert.equal(nextCheckpointStage("prepared", "spawn_intent", true), true);
  assert.equal(nextCheckpointStage("spawn_intent", "branch_ready", true), false);
});
