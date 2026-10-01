import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, writeFile, unlink, rmdir, lstat, link, mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { acquireWriterLock, writerLockFilename } from "./lib/agent-host-writer-lock.mjs";
import { nativeDigest } from "./lib/agent-host-native-footprint.mjs";

async function fixture(t, cleanupNames = []) {
  const directory = await mkdtemp(path.join(process.cwd(), "scripts", ".writer-lock-test-"));
  t.after(async () => {
    for (const name of cleanupNames) {
      const file = path.join(directory, name), stat = await lstat(file).catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (stat) await (stat.isDirectory() && !stat.isSymbolicLink() ? rmdir(file) : unlink(file));
    }
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

for (const priorCode of ["code_reviewer_unproven", "managed_admission_blocked", "readonly_boundary_unproven"]) test(`failed read-only ${priorCode} needs an exact terminal reconciliation receipt before lock release`, { skip: process.platform !== "win32" }, async t => {
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
    nativeProcessesAbsent: true, pilotBaselineUnchanged: true, applicationLease: { state: "released", absent: true } };
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

async function retainedReadonlyFixture(t, { reconciledSpawn = false, kind = "verifier", terminalPriorCode = "managed_admission_blocked" } = {}) {
  const candidate = { id: "00000000-0000-4000-8000-000000000031", workspaceId: "00000000-0000-4000-8000-000000000032",
    taskId: "00000000-0000-4000-8000-000000000033", applicationId: "00000000-0000-4000-8000-000000000034",
    agentHostId: "00000000-0000-4000-8000-000000000035", status: "failed", attempt: 1, checkpointVersion: 3,
    leaseExpiresAt: null, completedAt: new Date().toISOString(), codexThreadId: null, finalResponse: null, changedFiles: [],
    checkpoint: { schemaVersion: "roost-recovery-v1", stage: "spawn_intent", sessionId: null,
      packetRevision: "revision", workspaceDigest: "digest", contextRevision: "context" } };
  if (reconciledSpawn) {
    Object.assign(candidate, { leaseToken: null, contextInvalidatedAt: null, summary: null, verification: {},
      metadata: { executionContract: { nativeBoundary: { profile: "inspect-readonly", inspectReadOnly: { kind } },
        access: { sandbox: "read-only", tools: ["repository_read"], permissions: ["repository_read"] },
        singleTask: { branch: "main" } }, readyContextPin: { revision: "1".repeat(64), riskAdmissionCommit: "a".repeat(40) } } });
    Object.assign(candidate.checkpoint, { packetRevision: "2".repeat(64), workspaceDigest: "3".repeat(64), contextRevision: "4".repeat(64) });
  }
  const leaseName = `application-${nativeDigest(candidate.applicationId)}.lease`;
  const directory = await fixture(t, ["owned-test-lease-link", leaseName]);
  const script = `import { acquireWriterLock } from './scripts/lib/agent-host-writer-lock.mjs'; import { acquireApplicationLease } from './scripts/lib/agent-host-application-lease.mjs'; const lock=await acquireWriterLock(${JSON.stringify(directory)}); await lock.checkpoint({...${JSON.stringify(candidate)},checkpoint:{...${JSON.stringify(candidate.checkpoint)},sessionId:lock.sessionId}}); acquireApplicationLease({writerLock:lock,applicationId:${JSON.stringify(candidate.applicationId)},attempt:${JSON.stringify(candidate.id)},runtime:{required:false,ports:[]}});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], { windowsHide: true, stdio: "ignore" });
  assert.equal((await once(child, "close"))[0], 0);
  const lockPath = path.join(directory, writerLockFilename), leasePath = path.join(directory, leaseName);
  const writerBytes = await readFile(lockPath), leaseBytes = await readFile(leasePath);
  candidate.checkpoint.sessionId = JSON.parse(writerBytes).checkpoint.sessionId;
  candidate.errorState = { code: "agent_readonly_terminal_reconciled", details: {
    priorCode: terminalPriorCode, checkpointStage: "spawn_intent", checkpointSessionId: candidate.checkpoint.sessionId,
    writerLockDigest: createHash("sha256").update(writerBytes).digest("hex"), nativeProcessesAbsent: true, pilotBaselineUnchanged: true,
    applicationLease: { state: "retained", digest: createHash("sha256").update(leaseBytes).digest("hex") } } };
  if (reconciledSpawn) candidate.errorState = { code: "agent_readonly_spawn_reconciled", retryable: false, details: {
    schemaVersion: "roost-readonly-spawn-reconciliation-v1", checkpointStage: "spawn_intent",
    checkpointSessionId: candidate.checkpoint.sessionId, checkpointVersion: candidate.checkpointVersion,
    baselineCommit: "a".repeat(40), baselineBranch: "main", repositoryDigest: "5".repeat(64), attestationDigest: "6".repeat(64),
    writerLockDigest: createHash("sha256").update(writerBytes).digest("hex"), observedAt: candidate.completedAt,
    applicationLease: { state: "retained", digest: createHash("sha256").update(leaseBytes).digest("hex") } } };
  return { directory, candidate, lockPath, leasePath, writerBytes, leaseBytes, record: JSON.parse(leaseBytes) };
}

for (const terminalPriorCode of ["managed_admission_blocked", "readonly_boundary_unproven"]) test(`exact terminal read-only ${terminalPriorCode} receipt retires its retained application lease and original dead-owner Writer`, { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t, { terminalPriorCode });
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [f.candidate] });
  await assert.rejects(lstat(f.leasePath), { code: "ENOENT" });
  assert.notEqual(next.sessionId, f.candidate.checkpoint.sessionId);
  await next.release();
});

test("uncertain exact lease unlink resumes from retained receipt without adopting a new lease", { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t);
  await unlink(f.leasePath); // Owned fixture simulates crash between the two exact unlinks.
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [f.candidate] });
  await next.release();
});

test("terminal read-only lease cleanup rejects foreign bytes and identity, preserving the original Writer", { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t);
  const deny = async candidate => {
    await assert.rejects(acquireWriterLock(f.directory, { terminalCandidates: [candidate] }), /agent_host_writer_locked/);
    assert.deepEqual(await readFile(f.lockPath), f.writerBytes);
  };
  for (const patch of [{ version: 2 }, { nonce: "not-a-uuid" }, { attempt: "00000000-0000-4000-8000-000000000099" },
    { application: "0".repeat(64) }, { writer: "00000000-0000-4000-8000-000000000099" }, { foreign: true }]) {
    const bytes = Buffer.from(JSON.stringify({ ...f.record, ...patch }));
    await writeFile(f.leasePath, bytes);
    const candidate = { ...f.candidate, errorState: { ...f.candidate.errorState,
      details: { ...f.candidate.errorState.details, applicationLease: { state: "retained", digest: createHash("sha256").update(bytes).digest("hex") } } } };
    await deny(candidate); assert.deepEqual(await readFile(f.leasePath), bytes);
  }
  await writeFile(f.leasePath, f.leaseBytes);
  await deny({ ...f.candidate, errorState: { ...f.candidate.errorState,
    details: { ...f.candidate.errorState.details, applicationLease: { state: "retained", digest: "0".repeat(64) } } } });
  await deny({ ...f.candidate, errorState: { ...f.candidate.errorState,
    details: { ...f.candidate.errorState.details, applicationLease: { state: "released", absent: true } } } });
  await deny({ ...f.candidate, errorState: { ...f.candidate.errorState,
    details: { ...f.candidate.errorState.details, applicationLease: undefined } } });
  const hardlink = path.join(f.directory, "owned-test-lease-link");
  await link(f.leasePath, hardlink); await deny(f.candidate); await unlink(hardlink);
  await unlink(f.leasePath); await mkdir(f.leasePath); await deny(f.candidate); await rmdir(f.leasePath);
  await writeFile(f.leasePath, "{invalid"); await deny(f.candidate);
  for (const bytes of ["null", "[]", "42", '"foreign"']) {
    await writeFile(f.leasePath, bytes);
    await deny({ ...f.candidate, errorState: { ...f.candidate.errorState,
      details: { ...f.candidate.errorState.details, applicationLease: {
        state: "retained", digest: createHash("sha256").update(bytes).digest("hex") } } } });
  }
  await writeFile(f.leasePath, f.leaseBytes);
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [f.candidate] });
  await next.release();
});

test("generic pre-signature failure cannot retire a retained application lease", { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t);
  const generic = { ...f.candidate, errorState: { code: "managed_admission_blocked", details: { phase: "backend_evidence_persist" } } };
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [generic] });
  assert.deepEqual(await readFile(f.leasePath), f.leaseBytes);
  await next.release();
});

for (const kind of ["auditor", "verifier", "code-reviewer"]) test(`expired readonly ${kind} spawn receipt releases only its exact retained lease and dead-owner Writer`, { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t, { reconciledSpawn: true, kind });
  // The real nonterminal API receipt deliberately has no priorCode/process
  // fields: its request schema already required literal true observations.
  assert.equal(f.candidate.errorState.details.priorCode, undefined);
  assert.equal(f.candidate.errorState.details.nativeProcessesAbsent, undefined);
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [f.candidate] });
  await assert.rejects(lstat(f.leasePath), { code: "ENOENT" });
  await next.release();
});

test("readonly spawn receipt rejects missing authority, coding access, results and foreign lease without retiring either file", { skip: process.platform !== "win32" }, async t => {
  const f = await retainedReadonlyFixture(t, { reconciledSpawn: true });
  const deny = async candidate => {
    await assert.rejects(acquireWriterLock(f.directory, { terminalCandidates: [candidate] }), /agent_host_writer_locked/);
    assert.deepEqual(await readFile(f.lockPath), f.writerBytes);
    assert.deepEqual(await readFile(f.leasePath), f.leaseBytes);
  };
  for (const patch of [{ schemaVersion: "foreign" }, { checkpointSessionId: "foreign" }, { checkpointVersion: 4 },
    { writerLockDigest: "0".repeat(64) }, { repositoryDigest: undefined }, { attestationDigest: undefined },
    { baselineCommit: "b".repeat(40) }, { baselineBranch: "foreign" }, { observedAt: "unobserved" },
    { observedAt: new Date(Date.parse(f.candidate.completedAt) + 10_000).toISOString() },
    { applicationLease: { state: "released", absent: true } }, { applicationLease: { state: "retained", digest: "0".repeat(64) } }]) {
    const candidate = structuredClone(f.candidate); Object.assign(candidate.errorState.details, patch); await deny(candidate);
  }
  for (const mutate of [
    c => { c.metadata = undefined; }, c => { c.metadata.executionContract.nativeBoundary.profile = "coding-local"; },
    c => { c.metadata.executionContract.nativeBoundary.inspectReadOnly.kind = "unknown"; },
    c => { c.metadata.executionContract.access.sandbox = "workspace-write"; },
    c => { c.metadata.executionContract.access.tools.push("repository_write"); },
    c => { c.metadata.executionContract.access.permissions.push("deployment"); },
    c => { c.metadata.readyContextPin.revision = undefined; }, c => { c.metadata.resultRevision = { commit: "a".repeat(40) }; },
    c => { c.summary = "result"; }, c => { c.verification = { passed: true }; }, c => { c.changedFiles = ["release.json"]; },
    c => { c.finalResponse = "result"; }, c => { c.codexThreadId = "thread"; }, c => { c.leaseToken = "active-lease"; },
    c => { c.contextInvalidatedAt = new Date().toISOString(); }, c => { c.errorState.retryable = true; },
    c => { c.errorState.code = "agent_execution_recovery_blocked"; }
  ]) { const candidate = structuredClone(f.candidate); mutate(candidate); await deny(candidate); }
  const foreignBytes = Buffer.from(JSON.stringify({ ...f.record, writer: "00000000-0000-4000-8000-000000000099" }));
  await writeFile(f.leasePath, foreignBytes);
  const foreign = structuredClone(f.candidate);
  foreign.errorState.details.applicationLease.digest = createHash("sha256").update(foreignBytes).digest("hex");
  await assert.rejects(acquireWriterLock(f.directory, { terminalCandidates: [foreign] }), /agent_host_writer_locked/);
  assert.deepEqual(await readFile(f.lockPath), f.writerBytes); assert.deepEqual(await readFile(f.leasePath), foreignBytes);
  await writeFile(f.leasePath, f.leaseBytes);
  await unlink(f.leasePath); // Same exact receipt also reconciles uncertain prior lease unlink.
  const next = await acquireWriterLock(f.directory, { terminalCandidates: [f.candidate] });
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
