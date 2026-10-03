import { createHash, randomUUID, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, realpathSync, lstatSync, openSync, closeSync, writeSync, fsyncSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import contract from "./agent-host-release-contract.cjs";
import { writerRecoveryEvidence, persistReleaseWriterCheckpoint, clearWriterReleaseRecoveryRestriction } from "./agent-host-writer-lock.mjs";
import { currentNativeProcessIdentity, observeWindowsProcessIdentity, observeReleasePreflightQuiescence } from "./agent-host-process-identity.mjs";
import { assertWindowsJobCapability, isWindowsJobCleanupReceipt, windowsJobSourceDigest } from "./agent-host-windows-job.mjs";

const contexts = new WeakMap(), tokens = new WeakMap(), candidates = new WeakMap();
const fail = () => { throw Object.assign(Error("release_writer_recovery_unproven"), { retryable: false, releaseBlocked: true }); };
const check = condition => { if (!condition) fail(); };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const uuid = z.string().uuid(), hex = z.string().regex(/^[a-f0-9]{64}$/);
const processSchema = z.object({ pid: z.number().int().positive(), creationTime: z.string().regex(/^\d{16,20}$/),
  executablePathDigest: hex, executableDigest: hex }).strict();
const bindingSchema = z.object({ releaseId: uuid, grantDigest: hex, hostId: uuid, releaserAgentId: uuid,
  journalPrefixDigest: hex, journalCount: z.number().int().nonnegative().max(100),
  operationId: uuid.nullable(), operationRequestId: uuid.nullable(), intentDigest: hex.nullable(), operationCreatedAt: z.string().datetime().nullable() }).strict();
const assignedSchema = z.object({ job: uuid, root: processSchema, launcher: processSchema, assignedBeforeResume: z.literal(true),
  killOnClose: z.literal(true), breakaway: z.literal(false) }).strict();
const childSchema = z.object({ attemptId: uuid, executableDigest: hex, executablePathDigest: hex, launcherDigest: hex, sourceDigest: hex,
  state: z.enum(["reserved", "assigned", "closed"]), assignment: assignedSchema.nullable(), resumeDigest: hex.nullable(),
  receiptDigest: hex.nullable(), receipt: z.object({ resumed: z.boolean(), cleanup: z.literal(true), activeProcesses: z.literal(0),
    jobClosed: z.literal(true), killOnClose: z.literal(true), breakaway: z.literal(false), assignedBeforeResume: z.literal(true),
    rootPid: z.number().int().positive(), rootCreationTime: z.string().regex(/^\d{16,20}$/),
    launcherPid: z.number().int().positive(), launcherCreationTime: z.string().regex(/^\d{16,20}$/),
    job: uuid, attempt: uuid, resumeReceipt: hex.nullable(), launcherSha256: hex, sourceSha256: hex, executableDigest: hex }).strict().nullable() }).strict();
const checkpointSchema = z.object({ schemaVersion: z.literal("roost-release-writer-recovery-v1"), sessionId: uuid, ownerProcess: processSchema,
  integrityKey: z.object({ name: z.string().regex(/^release-writer-integrity-[a-f0-9-]{36}\.key$/), identity: z.string().regex(/^[0-9]+:[0-9]+$/), digest: hex }).strict(), signature: hex,
  contextNonce: uuid, binding: bindingSchema, phase: z.enum(["broker_open", "all_local_children_closed"]),
  priorJobReceiptDigests: z.array(hex).max(8), registeredChildCount: z.number().int().nonnegative().max(1000000),
  closedHistory: z.object({ count: z.number().int().nonnegative().max(1000000), digest: hex }).strict(),
  children: z.array(childSchema).max(12) }).strict();
const same = (a, b) => contract.releaseDigest(a) === contract.releaseDigest(b);
export function releaseOwnerInstanceAbsent(owner, current) {
  const expected = processSchema.parse(owner);
  if (current === null) return true;
  const observed = processSchema.parse(current);
  check(observed.pid === expected.pid);
  // Windows reuses PIDs. A different native creation time proves that the
  // sealed owner instance has exited; the unrelated replacement stays intact.
  return observed.creationTime !== expected.creationTime;
}
function grant(state, client) {
  check(state?.release && Array.isArray(state.journal) && state.journal.length <= 100 && !state.truncated);
  const { readinessDigest, configurationDigest, successorBasis, publishedGitBasis, ...raw } = state.release.snapshot ?? {};
  const snapshot = contract.createReleaseSchema.parse(raw);
  if (snapshot.predecessor || successorBasis) {
    check(snapshot.predecessor?.releaseId !== state.release.id && contract.releaseHasSuccessor({ ...snapshot, successorBasis }));
    snapshot.successorBasis = successorBasis;
  }
  if (snapshot.baselineRestart || publishedGitBasis) {
    check(snapshot.baselineRestart?.releaseId !== state.release.id
      && contract.releaseHasPublishedGitBasis({ ...snapshot, publishedGitBasis }));
    snapshot.publishedGitBasis = publishedGitBasis;
  }
  hex.parse(readinessDigest); hex.parse(configurationDigest); uuid.parse(state.release.id);
  check(snapshot.hostId === client.hostId && snapshot.releaserAgentId === client.agentId
    && snapshot.manifestDigest === state.release.manifestDigest && contract.releaseDigest(snapshot.manifest) === snapshot.manifestDigest);
  return { releaseId: state.release.id, grantDigest: contract.releaseDigest({ releaseId: state.release.id, snapshot: { ...snapshot, readinessDigest, configurationDigest } }),
    hostId: snapshot.hostId, releaserAgentId: snapshot.releaserAgentId };
}
function operationBinding(operation) {
  if (!operation) return { operationId: null, operationRequestId: null, intentDigest: null, operationCreatedAt: null };
  uuid.parse(operation.id); const intent = contract.intentSchema.parse(operation.intent); z.string().datetime().parse(operation.createdAt);
  check(intent.operation === operation.operation);
  return { operationId: operation.id, operationRequestId: intent.requestId, intentDigest: contract.releaseDigest(intent), operationCreatedAt: operation.createdAt };
}
function journalBindings(state) {
  return state.journal.map(operationBinding);
}
function boundJournal(state) { const journal = journalBindings(state); return { journalPrefixDigest: contract.releaseDigest(journal), journalCount: journal.length }; }
function integrityKey(directory, checkpoint) {
  const filename = path.join(directory, checkpoint.integrityKey.name), stat = lstatSync(filename, { bigint: true });
  check(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n && stat.size === 32n
    && `${stat.dev}:${stat.ino}` === checkpoint.integrityKey.identity && realpathSync.native(filename).toLowerCase() === filename.toLowerCase());
  const key = readFileSync(filename); check(sha(key) === checkpoint.integrityKey.digest); return key;
}
function signed(checkpoint, key) { const { signature, ...payload } = checkpoint; return createHmac("sha256", key).update(contract.releaseDigest(payload)).digest("hex"); }
function persist(saved) {
  const writer = writerRecoveryEvidence(saved.writerLock), key = integrityKey(writer.directory, saved.checkpoint);
  try {
    if (saved.lastSignature) { const disk = JSON.parse(readFileSync(path.join(writer.directory, writer.name))).releaseCheckpoint;
      check(disk?.contextNonce === saved.checkpoint.contextNonce && disk.signature === saved.lastSignature); verifyIntegrity(writer.directory, checkpointSchema.parse(disk)); }
    saved.checkpoint.signature = signed(saved.checkpoint, key); checkpointSchema.parse(saved.checkpoint);
    const digest = persistReleaseWriterCheckpoint(saved.writerLock, saved.checkpoint); saved.lastSignature = saved.checkpoint.signature; return digest;
  }
  finally { key.fill(0); }
}
function verifyIntegrity(directory, checkpoint) {
  const key = integrityKey(directory, checkpoint);
  try { check(timingSafeEqual(Buffer.from(checkpoint.signature, "hex"), Buffer.from(signed(checkpoint, key), "hex"))); }
  finally { key.fill(0); }
}
function active(context) {
  const saved = contexts.get(context); check(saved); const writer = writerRecoveryEvidence(saved.writerLock);
  const disk = JSON.parse(readFileSync(path.join(writer.directory, writer.name))).releaseCheckpoint;
  check(disk?.contextNonce === saved.checkpoint.contextNonce && disk.signature === saved.lastSignature);
  verifyIntegrity(writer.directory, checkpointSchema.parse(disk)); return saved;
}

export function beginReleaseWriterCheckpoint({ writerLock, state, client, priorJobReceipts = [] }) {
  check(process.platform === "win32" && Array.isArray(priorJobReceipts) && priorJobReceipts.length <= 8);
  const writer = writerRecoveryEvidence(writerLock), bytes = readFileSync(path.join(writer.directory, writer.name), "utf8"), raw = JSON.parse(bytes);
  // A fresh uncheckpointed Writer has never admitted a model child. For a
  // managed Writer, only actual in-process terminal Job qualification counts.
  check(!raw.checkpoint || priorJobReceipts.length > 0);
  check(priorJobReceipts.every(receipt => isWindowsJobCleanupReceipt(receipt)));
  if (raw.releaseCheckpoint) { const previous = checkpointSchema.parse(raw.releaseCheckpoint);
    verifyIntegrity(writer.directory, previous);
    check(previous.phase === "all_local_children_closed" && previous.children.every(c => c.state === "closed")); }
  const contextNonce = randomUUID(), keyName = `release-writer-integrity-${contextNonce}.key`, keyPath = path.join(writer.directory, keyName), key = randomBytes(32);
  const fd = openSync(keyPath, "wx", 0o600);
  try { writeSync(fd, key); fsyncSync(fd); } finally { closeSync(fd); }
  const keyStat = lstatSync(keyPath, { bigint: true }), keyRecord = { name: keyName, identity: `${keyStat.dev}:${keyStat.ino}`, digest: sha(key) }; key.fill(0);
  const checkpoint = checkpointSchema.parse({ schemaVersion: "roost-release-writer-recovery-v1", sessionId: writerLock.sessionId,
    integrityKey: keyRecord, signature: "0".repeat(64), ownerProcess: currentNativeProcessIdentity(), contextNonce, binding: { ...grant(state, client), ...boundJournal(state), ...operationBinding(null) },
    phase: "broker_open", priorJobReceiptDigests: priorJobReceipts.map(r => sha(JSON.stringify(r))), registeredChildCount: 0,
    closedHistory: { count: 0, digest: sha("roost-release-closed-history-v1") }, children: [] });
  check(same(checkpoint.ownerProcess, raw.ownerProcess));
  const context = Object.freeze({ contextNonce: checkpoint.contextNonce }); const saved = { writerLock, checkpoint };
  contexts.set(context, saved); persist(saved); return context;
}
export function checkpointReleaseOperation(context, state, operation, client) {
  const saved = active(context), next = grant(state, client);
  check(["releaseId", "grantDigest", "hostId", "releaserAgentId"].every(key => next[key] === saved.checkpoint.binding[key]));
  check(saved.checkpoint.children.every(c => c.state === "closed"));
  if (operation) check(state.journal.some(entry => same(operationBinding(entry), operationBinding(operation))));
  saved.checkpoint.binding = bindingSchema.parse({ ...next, ...boundJournal(state), ...operationBinding(operation) }); saved.checkpoint.phase = "broker_open"; persist(saved);
}
export function reserveReleaseChild(context, { artifact, executable }) {
  const saved = active(context), capability = assertWindowsJobCapability(artifact);
  const child = childSchema.parse({ attemptId: randomUUID(), executableDigest: sha(readFileSync(executable)),
    executablePathDigest: sha(realpathSync.native(executable).toLowerCase()),
    launcherDigest: capability.launcherDigest, sourceDigest: capability.sourceDigest, state: "reserved", assignment: null,
    resumeDigest: null, receiptDigest: null, receipt: null });
  saved.checkpoint.phase = "broker_open"; saved.checkpoint.registeredChildCount++; saved.checkpoint.children.push(child); persist(saved);
  const token = Object.freeze({ attemptId: child.attemptId }); tokens.set(token, { context, child }); return token;
}
// Called synchronously from startWindowsJob v2 confirmResume, before any code
// resumes. A crash/torn record here can never look like a closed child.
export function bindReleaseChild(token, event) {
  const proof = tokens.get(token); check(proof); const saved = active(proof.context), child = proof.child;
  check(child.state === "reserved" && event.version === "roost-windows-job-v2" && event.attempt === child.attemptId
    && event.assignedBeforeResume && event.killOnClose && event.breakaway === false
    && event.executableDigest === child.executableDigest && event.launcherSha256 === child.launcherDigest && event.sourceSha256 === child.sourceDigest);
  // A suspended root has not initialized its loader, so Get-Process.Path is
  // unavailable. The qualified launcher creates this exact executable suspended
  // and supplies native GetProcessTimes; its final genuine receipt joins it.
  const root = processSchema.parse({ pid: event.rootPid, creationTime: event.rootCreationTime,
    executablePathDigest: child.executablePathDigest, executableDigest: child.executableDigest });
  const launcher = observeWindowsProcessIdentity(event.launcherPid);
  check(launcher && launcher.creationTime === event.launcherCreationTime && launcher.executableDigest === child.launcherDigest);
  child.assignment = assignedSchema.parse({ job: event.job, root, launcher, assignedBeforeResume: true, killOnClose: true, breakaway: false });
  child.state = "assigned";
  // The resume token authenticates precisely this durable assignment projection.
  child.resumeDigest = contract.releaseDigest({ contextNonce: saved.checkpoint.contextNonce, sessionId: saved.checkpoint.sessionId,
    binding: saved.checkpoint.binding, child: { ...child, resumeDigest: null } }); persist(saved); return child.resumeDigest;
}
export function recordReleaseChildReceipt(token, receipt) {
  const proof = tokens.get(token); check(proof); const saved = active(proof.context), child = proof.child;
  check(child.state === "assigned" && isWindowsJobCleanupReceipt(receipt) && receipt.attempt === child.attemptId
    && receipt.job === child.assignment.job && receipt.launcherSha256 === child.launcherDigest && receipt.sourceSha256 === child.sourceDigest
    && receipt.executableDigest === child.executableDigest && receipt.rootPid === child.assignment.root.pid
    && receipt.rootCreationTime === child.assignment.root.creationTime && receipt.launcherPid === child.assignment.launcher.pid
    && receipt.launcherCreationTime === child.assignment.launcher.creationTime && (!receipt.resumed || receipt.resumeReceipt === child.resumeDigest));
  check(observeWindowsProcessIdentity(receipt.rootPid) === null && observeWindowsProcessIdentity(receipt.launcherPid) === null);
  const projected = Object.fromEntries(Object.keys(childSchema.shape.receipt.unwrap().shape).map(key => [key, receipt[key] ?? null]));
  child.receipt = childSchema.shape.receipt.parse(projected); child.receiptDigest = contract.releaseDigest(projected); child.state = "closed";
  compactClosedChildren(saved.checkpoint); persist(saved);
}
function compactClosedChildren(checkpoint) {
  // Only this qualified receipt path compacts. Reserved/assigned entries never
  // disappear. HMAC preserves the entire chain's count+digest without keeping an
  // unbounded JSON ledger or mistaking reused historical PIDs for old children.
  const closed = checkpoint.children.filter(c => c.state === "closed");
  const remove = closed.slice(0, Math.max(0, closed.length - 4));
  for (const child of remove) {
    checkpoint.closedHistory = { count: checkpoint.closedHistory.count + 1,
      digest: contract.releaseDigest({ prior: checkpoint.closedHistory, closedChildDigest: contract.releaseDigest(child) }) };
    checkpoint.children.splice(checkpoint.children.indexOf(child), 1);
  }
}
function assertClosed(checkpoint) {
  check(checkpoint.registeredChildCount === checkpoint.closedHistory.count + checkpoint.children.length
    && new Set(checkpoint.children.map(c => c.attemptId)).size === checkpoint.children.length);
  check(checkpoint.children.every(child => child.state === "closed" && child.assignment && child.receipt && child.receiptDigest
    && contract.releaseDigest(child.receipt) === child.receiptDigest && child.receipt.attempt === child.attemptId
    && child.receipt.job === child.assignment.job && child.receipt.executableDigest === child.executableDigest
    && child.receipt.launcherSha256 === child.launcherDigest && child.receipt.sourceSha256 === child.sourceDigest
    && child.receipt.rootPid === child.assignment.root.pid && child.receipt.rootCreationTime === child.assignment.root.creationTime
    && child.receipt.launcherPid === child.assignment.launcher.pid && child.receipt.launcherCreationTime === child.assignment.launcher.creationTime
    && (!child.receipt.resumed || child.receipt.resumeReceipt === child.resumeDigest)));
  for (const child of checkpoint.children) for (const identity of [child.assignment.root, child.assignment.launcher]) {
    const current = observeWindowsProcessIdentity(identity.pid); check(current === null || current.creationTime !== identity.creationTime);
  }
}
export function sealReleaseWriterCheckpoint(context) {
  const saved = active(context); assertClosed(saved.checkpoint); saved.checkpoint.phase = "all_local_children_closed";
  return { checkpointDigest: persist(saved), contextNonce: saved.checkpoint.contextNonce, nativeProcessesAbsent: true };
}
export function releaseRecoveryCandidate(state, client) {
  const candidate = Object.freeze({ ...grant(state, client), ...boundJournal(state) });
  const journal = state.journal.map(entry => ({ binding: operationBinding(entry), outcome: entry.outcome }));
  check(new Set(journal.map(j => j.binding.operationId)).size === journal.length);
  candidates.set(candidate, { journal, at: performance.now() }); return candidate;
}
export function qualifyReleaseWriterReclaim(raw, candidate, directory) {
  const checked = candidates.get(candidate); check(checked && performance.now() - checked.at >= 0 && performance.now() - checked.at < 30000);
  const checkpoint = checkpointSchema.parse(raw.releaseCheckpoint);
  verifyIntegrity(directory, checkpoint);
  check(raw.ownerNonce === checkpoint.sessionId && same(raw.ownerProcess, checkpoint.ownerProcess) && raw.ownerPid === checkpoint.ownerProcess.pid
    && ["releaseId", "grantDigest", "hostId", "releaserAgentId"].every(key => checkpoint.binding[key] === candidate[key]));
  check(checked.journal.length >= checkpoint.binding.journalCount
    && contract.releaseDigest(checked.journal.slice(0, checkpoint.binding.journalCount).map(entry => entry.binding)) === checkpoint.binding.journalPrefixDigest);
  if (checkpoint.binding.operationId !== null) check(checked.journal.some(entry => same(entry.binding, operationBindingFromCheckpoint(checkpoint.binding))));
  check(releaseOwnerInstanceAbsent(checkpoint.ownerProcess, observeWindowsProcessIdentity(raw.ownerPid)));
  let quiescence;
  if (checkpoint.phase === "all_local_children_closed") assertClosed(checkpoint);
  else {
    // Legacy reservations do not pin v2: never claim that code did not run,
    // invent a terminal receipt or admit an assigned child missing its receipt.
    // Only an initial SSH preflight with no external operation intent can use
    // the inspected launcher's native handle/containment invariant plus actual
    // OS absence. The broker must recognize Git and every baseline again before
    // its first new intent. Preserve the original signed record separately.
    const pinnedSource = "921e0e322aa3f3d1ad64af44b338cc2a623dde8ec2ca3893645a3e2d24d50f1a";
    const child = checkpoint.children.at(-1);
    const ssh = path.join(process.env.SystemRoot, "System32", "OpenSSH", "ssh.exe");
    check(checkpoint.phase === "broker_open" && checkpoint.binding.journalCount === 0 && checked.journal.length === 0
      && checkpoint.binding.operationId === null && checkpoint.binding.operationRequestId === null
      && checkpoint.binding.intentDigest === null && checkpoint.binding.operationCreatedAt === null && child?.state === "reserved"
      && child.assignment === null && child.resumeDigest === null && child.receipt === null && child.receiptDigest === null
      && child.sourceDigest === pinnedSource && windowsJobSourceDigest() === pinnedSource
      && child.executableDigest === sha(readFileSync(ssh)) && child.executablePathDigest === sha(realpathSync.native(ssh).toLowerCase()));
    const closed = { ...checkpoint, registeredChildCount: checkpoint.registeredChildCount - 1, children: checkpoint.children.slice(0, -1) };
    assertClosed(closed);
    quiescence = { kind: "legacy_reserved_resources_absent", originalCheckpointDigest: contract.releaseDigest(checkpoint),
      reservedAttemptId: child.attemptId, ...observeReleasePreflightQuiescence(), terminalReceipt: false, executionProven: false };
    check(performance.now() - checked.at < 30000);
  }
  return Object.freeze({ reconciliationOnly: true, releaseId: candidate.releaseId, grantDigest: candidate.grantDigest,
    priorContextNonce: checkpoint.contextNonce, operationId: checkpoint.binding.operationId,
    journalPrefixDigest: checkpoint.binding.journalPrefixDigest, journalCount: checkpoint.binding.journalCount,
    ...(quiescence ? { preflightQuiescence: Object.freeze(quiescence) } : {}) });
}
function operationBindingFromCheckpoint(binding) { return Object.fromEntries(["operationId", "operationRequestId", "intentDigest", "operationCreatedAt"].map(key => [key, binding[key]])); }
export function clearReleaseWriterRecovery(writerLock, state, client) {
  const restriction = writerLock.releaseRecovery; check(restriction?.reconciliationOnly);
  const candidate = releaseRecoveryCandidate(state, client); check(candidate.releaseId === restriction.releaseId && candidate.grantDigest === restriction.grantDigest);
  const journal = candidates.get(candidate).journal;
  check(journal.length >= restriction.journalCount && contract.releaseDigest(journal.slice(0, restriction.journalCount).map(entry => entry.binding)) === restriction.journalPrefixDigest);
  check(state.journal.every(entry => entry.outcome && entry.outcome.status !== "uncertain" && (entry.outcome.status !== "reconciled" || ["succeeded", "failed", "absent"].includes(entry.outcome.reconciledStatus))));
  clearWriterReleaseRecoveryRestriction(writerLock);
}
