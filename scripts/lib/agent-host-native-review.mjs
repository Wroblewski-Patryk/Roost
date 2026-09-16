// Private, bounded review journal. Public projections never contain repo names,
// host paths, source bytes, prompts or shell output. No execution capability.
import path from "node:path";
import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, lstatSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { assertWriterLock, writerRecoveryEvidence } from "./agent-host-writer-lock.mjs";
import { applicationRecoveryEvidence } from "./agent-host-application-lease.mjs";
import { nativeDigest, nativeRelative, nativeFootprintPolicy, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { isWindowsJobReceipt } from "./agent-host-windows-job.mjs";
const sessions = new WeakMap(), completions = new WeakMap();
const hash = value => createHash("sha256").update(value).digest("hex");
const encode = value => Buffer.from(JSON.stringify(value) + "\n");
const refuse = code => { throw Error(code); };
const reason = error => /^[a-z][a-z0-9_]{2,100}$/.test(error?.message ?? "") ? error.message : "native_verification_refused";
const freeze = v => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
export function nativeArtifactSnapshot(file) {
  physicalIdentity(file, false); const before = lstatSync(file, { bigint: true });
  if (before.size > 4n * 1024n * 1024n) refuse("native_review_record_limit");
  const bytes = readFileSync(file), after = lstatSync(file, { bigint: true });
  if (before.ino !== after.ino || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || before.size !== after.size) refuse("native_review_record_changed");
  return { name: path.basename(file), identity: `${after.dev}:${after.ino}`, digest: hash(bytes), record: JSON.parse(bytes) };
}
function atomic(file, bytes) {
  if (bytes.length > 4 * 1024 * 1024) refuse("native_review_record_limit");
  const pending = file + ".next"; const fd = openSync(pending, "wx", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  try { renameSync(pending, file); } catch (e) { unlinkSync(pending); throw e; }
  if (!readFileSync(file).equals(bytes)) refuse("native_review_readback_failed");
}
function guard(s) {
  assertWriterLock(s.writerLock);
  if (physicalIdentity(s.directory) !== s.directoryIdentity || physicalIdentity(path.dirname(s.directory)) !== s.stateIdentity
      || physicalIdentity(path.join(s.directory, "integrity.key"), false) !== s.keyIdentity
      || !readFileSync(path.join(s.directory, "integrity.key")).equals(s.key)) refuse("native_review_identity_changed");
}
function session(handle) {
  const s = sessions.get(handle); if (!s) refuse("native_review_unproven"); guard(s);
  return s;
}
function persist(s) {
  guard(s);
  const payload = structuredClone(s.payload), signature = createHmac("sha256", s.key).update(encode(payload)).digest("hex");
  atomic(path.join(s.directory, "review.json"), encode({ payload, signature }));
  s.digest = nativeArtifactSnapshot(path.join(s.directory, "review.json")).digest;
}
export function createNativeReview({ writerLock, applicationLease, envelope, rootIdentity, preFootprintDigest, spentPath, assertWorkspaceStable = () => {} }) {
  const writer = writerRecoveryEvidence(writerLock), stateIdentity = physicalIdentity(writer.directory);
  const lease = applicationRecoveryEvidence(applicationLease), directory = path.join(writer.directory, `native-review-${envelope.identity.executionId}`);
  mkdirSync(directory); const key = randomBytes(32); writeFileSync(path.join(directory, "integrity.key"), key, { flag: "wx", mode: 0o600 });
  const { directory: unused, ...writerArtifact } = writer;
  let spent = null;
  if (spentPath) {
    if (path.dirname(spentPath) !== writer.directory) refuse("native_review_spent_scope");
    spent = nativeArtifactSnapshot(spentPath);
    if (spent.record.attemptDigest !== nativeDigest(envelope.identity)) refuse("native_review_spent_mismatch");
    spent.record = { state: spent.record.state, attemptDigest: spent.record.attemptDigest,
      scope: /^[a-z][a-z0-9_]{1,100}$/.test(spent.record.scope ?? "") ? spent.record.scope : null };
  }
  const keyIdentity = physicalIdentity(path.join(directory, "integrity.key"), false);
  const s = { writerLock, directory, key, keyIdentity, stateIdentity, assertWorkspaceStable, directoryIdentity: physicalIdentity(directory), job: null,
    payload: { version: "roost-native-review-v2", policy: nativeFootprintPolicy, stage: "prepared",
      integrityKeyIdentity: keyIdentity,
      binding: { identity: Object.fromEntries(["executionId", "workspaceId", "taskId", "applicationId", "attempt"].map(k => [k, envelope.identity[k]])), ready: envelope.revisions.ready, rootIdentity, preFootprintDigest,
        writer: writerArtifact, lease, spent }, privateChanges: [], public: null, verification: null, installation: null, job: null } };
  persist(s); const handle = Object.freeze({}); sessions.set(handle, s); return handle;
}
function privateChanges(comparison) {
  if ((comparison?.changes?.length ?? 0) > 8192) refuse("native_review_record_limit");
  const digest = v => /^[a-f0-9]{64}$/.test(v ?? "") ? v : null;
  const decimal = v => typeof v === "string" && /^\d{1,30}$/.test(v) ? v : null;
  const metadata = v => v ? { kind: v.kind === "file" ? "file" : "directory", identity: /^\d{1,30}:\d{1,30}$/.test(v.identity ?? "") ? v.identity : null,
    bytes: decimal(v.bytes), time: decimal(v.time), digest: digest(v.digest) } : null;
  return (comparison?.changes ?? []).map(({ path: relative, ...row }) => {
    // A filename can itself contain PII. Withhold suspicious/unbounded labels;
    // its category and scoped identifier remain sufficient for public evidence.
    let safe = null;
    if (relative && /^[a-zA-Z0-9_./-]{1,512}$/.test(relative) && !/\d{7,}/.test(relative)) { try { safe = nativeRelative(relative); } catch { /* protected */ } }
    return { path: safe, pathDigest: digest(row.pathDigest), category: row.category === "protected" ? "protected" : "content",
      change: ["added", "deleted", "modified"].includes(row.change) ? row.change : "modified", expected: row.expected === true,
      gitStatusBefore: /^[ MADRCU?!]{2}$/.test(row.gitStatusBefore ?? "") ? row.gitStatusBefore : null,
      gitStatusAfter: /^[ MADRCU?!]{2}$/.test(row.gitStatusAfter ?? "") ? row.gitStatusAfter : null,
      before: metadata(row.before), after: metadata(row.after) };
  });
}
export function captureNativeReview(handle, { ownedTreeReceipt, comparison, postFootprintDigest, violations, captureFailure = null }) {
  const s = session(handle); if (s.payload.stage !== "prepared") refuse("native_review_phase_invalid");
  const validJob = isWindowsJobReceipt(ownedTreeReceipt) && ownedTreeReceipt.attempt === s.payload.binding.identity.executionId;
  s.job = validJob ? ownedTreeReceipt : null;
  s.payload.job = validJob ? structuredClone(ownedTreeReceipt) : null;
  s.payload.privateChanges = privateChanges(comparison);
  s.payload.postFootprintDigest = postFootprintDigest;
  s.payload.public = { version: "roost-native-review-public-v2", policy: nativeFootprintPolicy,
    bindingDigest: nativeDigest(s.payload.binding), preFootprintDigest: s.payload.binding.preFootprintDigest, postFootprintDigest,
    jobDigest: validJob ? nativeDigest(ownedTreeReceipt) : null,
    changedPathIds: (comparison?.changedDigests ?? []).map(id => createHmac("sha256", s.key).update(id).digest("hex")),
    categoryCounts: comparison?.categoryCounts ?? { content: 0, protected: 0 },
    scopeReviewRequired: comparison?.scopeReviewRequired ?? false,
    refusalCode: captureFailure ? reason({ message: captureFailure }) : null,
    violations: [...new Set([...violations, ...(!validJob ? ["owned_job_unproven"] : [])])],
    verdict: "candidate_result", reviewRequired: true, releaseAllowed: false };
  s.payload.stage = "captured"; persist(s); return freeze(structuredClone(s.payload.public));
}
export async function completeNativeReview(handle, { verify, installation = () => ({ status: "PASS", applicable: false }) }) {
  const s = session(handle); if (s.payload.stage !== "captured") refuse("native_review_phase_invalid");
  // The captured snapshot is read back BEFORE independent code is allowed to run.
  if (nativeArtifactSnapshot(path.join(s.directory, "review.json")).digest !== s.digest) refuse("native_review_record_changed");
  try {
    const v = await verify();
    s.assertWorkspaceStable();
    s.payload.verification = { status: v?.after && typeof v.after.passed === "boolean" && v.testUnchanged === true && v.baselineCommitUnchanged === true ? (v.after.passed && v.minimalChange !== false ? "PASS" : "FAIL") : "REFUSED",
      reason: v?.after ? null : "native_verification_result_invalid", beforeExit: Number.isInteger(v?.before?.exit) ? v.before.exit : null,
      afterExit: Number.isInteger(v?.after?.exit) ? v.after.exit : null,
      testUnchanged: v?.testUnchanged === true, baselineCommitUnchanged: v?.baselineCommitUnchanged === true,
      diffDigest: /^[a-f0-9]{64}$/.test(v?.diffDigest ?? "") ? v.diffDigest : null };
    if (s.payload.verification.status === "REFUSED") s.payload.verification.reason = "native_verification_result_invalid";
  } catch (e) { s.payload.verification = { status: "REFUSED", reason: reason(e) }; }
  s.payload.stage = "verified"; persist(s);
  try {
    const value = await installation();
    s.assertWorkspaceStable();
    s.payload.installation = { status: value?.status === "PASS" ? "PASS" : "BLOCKED",
      manifestDigest: /^[a-f0-9]{64}$/.test(value?.manifestDigest ?? "") ? value.manifestDigest : null };
  } catch (e) { s.payload.installation = { status: "BLOCKED", reason: reason(e) }; }
  const p = s.payload.public, v = s.payload.verification;
  p.verdict = p.violations.length ? "boundary_violation" : !s.job || s.job.rootExit !== 0 || s.job.terminationReason !== "root_exit" ? "process_failed"
    : s.payload.installation.status !== "PASS" || v.status === "REFUSED" ? "verification_blocked"
      : p.scopeReviewRequired || v.status !== "PASS" ? "acceptance_failed" : "verified_candidate";
  p.verification = v.status; p.installation = s.payload.installation.status;
  s.payload.stage = "final"; persist(s);
  const capability = Object.freeze({});
  completions.set(capability, { handle, attempt: s.payload.binding.identity.executionId,
    allowed: !!s.job && !p.violations.length && v.status !== "REFUSED" && s.payload.installation.status === "PASS", used: false });
  return { capability, publicReceipt: freeze(structuredClone(p)), verification: freeze(structuredClone(v)), receiptDigest: s.digest };
}
export function assertNativeReviewCleanup(capability, attempt) {
  return checkCleanup(capability, attempt, true);
}
export function assertNativeReviewCleanupRecord(capability, attempt) {
  return checkCleanup(capability, attempt, false);
}
function checkCleanup(capability, attempt, checkWorkspace) {
  const proof = completions.get(capability);
  if (!proof || !proof.allowed || proof.used || proof.attempt !== attempt) refuse("native_review_cleanup_denied");
  const s = session(proof.handle);
  if (s.payload.stage !== "final" || nativeArtifactSnapshot(path.join(s.directory, "review.json")).digest !== s.digest) refuse("native_review_record_changed");
  if (checkWorkspace) s.assertWorkspaceStable();
  return true;
}
export function recordNativeReviewCleanup(capability, attempt) {
  checkCleanup(capability, attempt, false); const proof = completions.get(capability), s = session(proof.handle);
  s.payload.stage = "cleaned"; s.payload.leaseWriterReleaseIntent = true; persist(s); proof.used = true;
}
export function nativeReviewLocation(handle) { return session(handle).directory; }
// Used only by a separately owner-authorized reconciler, never launch admission.
export function readDurableNativeReview(directory) {
  physicalIdentity(directory); const keyIdentity = physicalIdentity(path.join(directory, "integrity.key"), false);
  const key = readFileSync(path.join(directory, "integrity.key"));
  if (key.length !== 32) refuse("native_review_integrity_unproven");
  const item = nativeArtifactSnapshot(path.join(directory, "review.json")), { payload, signature } = item.record;
  if (payload?.version !== "roost-native-review-v2" || payload.integrityKeyIdentity !== keyIdentity || !/^[a-f0-9]{64}$/.test(signature ?? "")
      || !timingSafeEqual(Buffer.from(signature, "hex"), createHmac("sha256", key).update(encode(payload)).digest())) refuse("native_review_integrity_unproven");
  return { payload, digest: item.digest, identity: item.identity, keyIdentity, directoryIdentity: physicalIdentity(directory) };
}
