import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";

async function fixture(t) {
  const directory = await mkdtemp(path.join(process.cwd(), "scripts", ".writer-lock-test-"));
  t.after(async () => {
    await unlink(path.join(directory, writerLockFilename)).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await rmdir(directory);
  });
  return directory;
}

test("simultaneous hosts can acquire only one writer slot", async (t) => {
  const directory = await fixture(t);
  const attempts = await Promise.allSettled([acquireWriterLock(directory), acquireWriterLock(directory)]);
  assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
  assert.match(attempts.find((attempt) => attempt.status === "rejected").reason.message, /agent_host_writer_locked/);
  await attempts.find((attempt) => attempt.status === "fulfilled").value.release();
  const next = await acquireWriterLock(directory);
  await next.release();
});

test("an independent process cannot take the active writer slot", async (t) => {
  const directory = await fixture(t);
  const lock = await acquireWriterLock(directory);
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; try { await acquireWriterLock(${JSON.stringify(directory)}); process.exitCode = 1; } catch (error) { process.exitCode = error.message === 'agent_host_writer_locked' ? 0 : 2; }`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  const [code] = await once(child, "close");
  assert.equal(code, 0);
  await lock.release();
});

test("a dead owner is not automatically reclaimed", async (t) => {
  const directory = await fixture(t);
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; await acquireWriterLock(${JSON.stringify(directory)}); process.exit(0);`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  await assert.rejects(acquireWriterLock(directory), /agent_host_writer_locked/);
});

test("a terminal pre-spawn attempt releases only its exact dead-owner lock", { skip: process.platform !== "win32" }, async t => {
  const directory = await fixture(t);
  const candidate = { id: "00000000-0000-4000-8000-000000000001", workspaceId: "00000000-0000-4000-8000-000000000002",
    taskId: "00000000-0000-4000-8000-000000000003", applicationId: "00000000-0000-4000-8000-000000000004",
    agentHostId: "00000000-0000-4000-8000-000000000005", status: "failed", attempt: 1, checkpointVersion: 1,
    leaseExpiresAt: null, completedAt: new Date().toISOString(), checkpoint: { schemaVersion: "roost-recovery-v1", stage: "claimed",
      sessionId: null, packetRevision: null, workspaceDigest: null } };
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; const lock=await acquireWriterLock(${JSON.stringify(directory)}); await lock.checkpoint({...${JSON.stringify(candidate)},checkpoint:{...${JSON.stringify(candidate.checkpoint)},sessionId:lock.sessionId}});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  const saved = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8"));
  candidate.checkpoint.sessionId = saved.checkpoint.sessionId;
  await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate, checkpointVersion: 2 }] }), /agent_host_writer_locked/);
  const next = await acquireWriterLock(directory, { terminalCandidates: [candidate] });
  await next.release();
});

test("terminal managed evidence rejection reclaims only the proven pre-model spawn intent", { skip: process.platform !== "win32" }, async t => {
  const directory = await fixture(t);
  const candidate = { id: "00000000-0000-4000-8000-000000000011", workspaceId: "00000000-0000-4000-8000-000000000012",
    taskId: "00000000-0000-4000-8000-000000000013", applicationId: "00000000-0000-4000-8000-000000000014",
    agentHostId: "00000000-0000-4000-8000-000000000015", status: "failed", attempt: 1, checkpointVersion: 3,
    leaseExpiresAt: null, completedAt: new Date().toISOString(), codexThreadId: null, finalResponse: null, changedFiles: [],
    errorState: { code: "managed_admission_blocked", details: { phase: "backend_evidence_request", reason: "roost_http_409", status: 409 } },
    checkpoint: { schemaVersion: "roost-recovery-v1", stage: "spawn_intent", sessionId: null,
      packetRevision: "revision", workspaceDigest: "digest", contextRevision: "context" } };
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; const lock=await acquireWriterLock(${JSON.stringify(directory)}); await lock.checkpoint({...${JSON.stringify(candidate)},checkpoint:{...${JSON.stringify(candidate.checkpoint)},sessionId:lock.sessionId}});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  candidate.checkpoint.sessionId = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8")).checkpoint.sessionId;
  await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate,
    errorState: { ...candidate.errorState, details: { ...candidate.errorState.details, phase: "decision_request" } } }] }), /agent_host_writer_locked/);
  await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate, changedFiles: ["src/app.ts"] }] }), /agent_host_writer_locked/);
  const next = await acquireWriterLock(directory, { terminalCandidates: [candidate] });
  await next.release();
  const another = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(another, "close"))[0], 0);
  candidate.checkpoint.sessionId = JSON.parse(await readFile(path.join(directory, writerLockFilename), "utf8")).checkpoint.sessionId;
  const persisted = { ...candidate, errorState: { code: "managed_admission_blocked", details: { phase: "backend_evidence_persist" } } };
  const recovered = await acquireWriterLock(directory, { terminalCandidates: [persisted] });
  await recovered.release();
});

for (const priorCode of ["code_reviewer_unproven", "managed_admission_blocked"]) test(`failed read-only ${priorCode} needs an exact terminal reconciliation receipt before lock release`, { skip: process.platform !== "win32" }, async t => {
  const directory = await fixture(t);
  const candidate = { id: "00000000-0000-4000-8000-000000000021", workspaceId: "00000000-0000-4000-8000-000000000022",
    taskId: "00000000-0000-4000-8000-000000000023", applicationId: "00000000-0000-4000-8000-000000000024",
    agentHostId: "00000000-0000-4000-8000-000000000025", status: "failed", attempt: 1, checkpointVersion: 3,
    leaseExpiresAt: null, completedAt: new Date().toISOString(), codexThreadId: null, finalResponse: null, changedFiles: [],
    checkpoint: { schemaVersion: "roost-recovery-v1", stage: "spawn_intent", sessionId: null,
      packetRevision: "revision", workspaceDigest: "digest", contextRevision: "context" } };
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; const lock=await acquireWriterLock(${JSON.stringify(directory)}); await lock.checkpoint({...${JSON.stringify(candidate)},checkpoint:{...${JSON.stringify(candidate.checkpoint)},sessionId:lock.sessionId}});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  const bytes = await readFile(path.join(directory, writerLockFilename));
  candidate.checkpoint.sessionId = JSON.parse(bytes).checkpoint.sessionId;
  const details = { priorCode, checkpointStage: "spawn_intent",
    checkpointSessionId: candidate.checkpoint.sessionId, writerLockDigest: createHash("sha256").update(bytes).digest("hex"),
    nativeProcessesAbsent: true, pilotBaselineUnchanged: true };
  candidate.errorState = { code: "agent_readonly_terminal_reconciled", details };
  for (const patch of [{ writerLockDigest: "0".repeat(64) }, { priorCode: "unknown_failure" },
    { checkpointSessionId: "different-session" }, { checkpointStage: "prepared" },
    { nativeProcessesAbsent: false }, { pilotBaselineUnchanged: false }])
    await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate,
      errorState: { ...candidate.errorState, details: { ...details, ...patch } } }] }), /agent_host_writer_locked/);
  for (const patch of [{ checkpointVersion: 4 }, { status: "running" }, { changedFiles: ["release.json"] },
    { finalResponse: "unaccepted model result" }, { codexThreadId: "model-session" }])
    await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate, ...patch }] }), /agent_host_writer_locked/);
  // The original managed failure alone lacks a native process/baseline receipt.
  await assert.rejects(acquireWriterLock(directory, { terminalCandidates: [{ ...candidate,
    errorState: { code: priorCode, details: {} } }] }), /agent_host_writer_locked/);
  const next = await acquireWriterLock(directory, { terminalCandidates: [candidate] });
  await next.release();
});

test("release does not delete a lock whose ownership changed", async (t) => {
  const directory = await fixture(t);
  const lock = await acquireWriterLock(directory);
  const lockPath = path.join(directory, writerLockFilename);
  await writeFile(lockPath, JSON.stringify({ ownerNonce: "different-owner" }));
  await assert.rejects(lock.release(), /agent_host_writer_lock_owner_changed/);
  assert.equal(JSON.parse(await readFile(lockPath, "utf8")).ownerNonce, "different-owner");
});

test("an empty lock left by a crashed acquisition still blocks another writer", async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, writerLockFilename), "");
  await assert.rejects(acquireWriterLock(directory), /agent_host_writer_locked/);
});
