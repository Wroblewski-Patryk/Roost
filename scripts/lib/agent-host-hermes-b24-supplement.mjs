// Fixed B21 read-only verifier plus separately authorized evidence publication.
// No CLI/API, provider execution, cleanup, activation or recovery grant.
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, lstatSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { nativeDigest, physicalIdentity, captureNativeFootprint, nativeFootprintPolicy } from "./agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot, readDurableNativeReview } from "./agent-host-native-review.mjs";
import { observeWindowsProcessIdentity } from "./agent-host-process-identity.mjs";
import { verifyHermesSplitInventory, assertHermesSplitFreshness } from "./agent-host-hermes-installation-split.mjs";
import { bridgeRecoveryIdentity, legacyInputIdentityVersion, recoveryIdentityFields } from "./agent-host-recovery-identity.mjs";
import { beginRecoverySupplement, captureRecoveryVerification, finalizeRecoverySupplement,
  recoverySupplementLocation, readRecoverySupplement, projectRecoverySupplement, recoveryObservationSchema } from "./agent-host-recovery-supplement.mjs";
import { hermesStartupPolicy, hermesStartupEnvironment } from "./agent-host-hermes-startup.mjs";
import { windowsEnvironmentPolicy } from "./agent-host-windows-environment.mjs";
import contract from "./agent-host-provider-contract.cjs";

const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const scope = "one_real_hermes_coding_smoke_b21_only", observations = new WeakMap(), invoked = new Set();
const sha = b => createHash("sha256").update(b).digest("hex"), hash = /^[a-f0-9]{64}$/;
const fail = code => { throw Error(code); };
const initial = "function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n";
const fixed = initial.replace("a - b", "a + b");
const testBytes = "const test = require('node:test');\nconst assert = require('node:assert/strict');\nconst { add } = require('./add.cjs');\ntest('addition', () => {\n  assert.equal(add(2, 3), 5);\n  assert.equal(add(-4, 7), 3);\n  assert.equal(add(0, 9), 9);\n});\n";
const artifact = item => ({ identityDigest: nativeDigest(item.identity), digest: item.digest });
function fileProof(file, max = 12 * 1024 * 1024) {
  const identity = physicalIdentity(file, false), before = lstatSync(file, { bigint: true });
  if (before.size > BigInt(max)) fail("native_b24_file_limit");
  const bytes = readFileSync(file), after = lstatSync(file, { bigint: true });
  if (before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs)
    fail("native_b24_file_changed");
  return { identityDigest: identity, digest: sha(bytes), bytes };
}
function installation(options, original) {
  const a = fileProof(options.attestationPath, 262144), m = fileProof(options.manifestPath), record = JSON.parse(a.bytes), manifest = JSON.parse(m.bytes);
  if (record.manifestPath !== options.manifestPath || m.digest !== record.manifestSha256 || m.digest !== original.manifestDigest
      || manifest.schemaVersion !== 2 || manifest.commit !== pin.commit || manifest.version !== pin.version
      || manifest.source !== pin.officialSource || path.dirname(record.generatedReceiptPath) !== path.dirname(options.attestationPath))
    fail("native_b24_installation_binding_invalid");
  const g = fileProof(record.generatedReceiptPath), generated = JSON.parse(g.bytes);
  if (g.digest !== record.generatedReceiptSha256) fail("native_b24_installation_binding_invalid");
  const proof = verifyHermesSplitInventory(manifest, m.bytes, generated, record);
  if (nativeDigest(proof) !== nativeDigest(original.split) || sha(readFileSync(manifest.executable)) !== original.executableDigest)
    fail("native_b24_installation_changed");
  const refs = [a, m, g].map(({ identityDigest, digest }) => ({ identityDigest, digest }));
  const digest = nativeDigest([refs, proof, manifest.roots.map(r => physicalIdentity(r.path))]);
  return { proof, digest, manifestDigest: m.digest, generatedReceiptDigest: g.digest,
    immutableFiles: proof.immutableFiles, generatedFiles: proof.generatedFiles,
    physicalFilesDigest() {
      // B25 additionally freezes every current runtime file ID across controller
      // restarts. B24's historical counts/content/root digest is not backfilled.
      assertHermesSplitFreshness(proof);
      const rows = manifest.roots.flatMap((root, index) => [...root.files, ...generated.roots[index].files]
        .map(entry => {
          const stat = lstatSync(path.join(root.path, entry.path), { bigint: true });
          return [root.kind, nativeDigest(entry.path), ...[stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, stat.birthtimeNs, stat.mode, stat.nlink].map(String)];
        }));
      assertHermesSplitFreshness(proof); return nativeDigest(rows);
    },
    assertFresh() {
      assertHermesSplitFreshness(proof);
      const current = [options.attestationPath, options.manifestPath, record.generatedReceiptPath].map(f => {
        const { identityDigest, digest } = fileProof(f); return { identityDigest, digest };
      });
      if (nativeDigest(current) !== nativeDigest(refs)) fail("native_b24_installation_changed");
    } };
}
function fixtureInventory(root) {
  const rows = []; let total = 0;
  function walk(directory, relative = "", depth = 0) {
    if (depth > 24) fail("native_b24_fixture_limit");
    for (const name of readdirSync(directory).sort()) {
      if (rows.length >= 8192) fail("native_b24_fixture_limit");
      const rel = relative ? relative + "/" + name : name, file = path.join(directory, name), s = lstatSync(file, { bigint: true });
      if (s.isSymbolicLink() || !s.isDirectory() && (!s.isFile() || s.nlink !== 1n)) fail("native_b24_fixture_unsafe");
      const row = { pathDigest: nativeDigest(rel), identity: physicalIdentity(file, s.isDirectory()), kind: s.isDirectory() ? "directory" : "file" };
      if (s.isDirectory()) { rows.push(row); walk(file, rel, depth + 1); }
      else {
        total += Number(s.size); if (total > 32 * 1024 * 1024) fail("native_b24_fixture_limit");
        rows.push({ ...row, bytes: String(s.size), time: String(s.mtimeNs), digest: fileProof(file).digest });
      }
    }
  }
  walk(root); return nativeDigest(rows);
}
function processMissing(p) {
  const missing = [], b = p.binding, j = p.job, owner = b.writer.record.ownerProcess;
  if (!owner || owner.pid !== b.writer.record.ownerPid || !hash.test(owner.executableDigest ?? "") || !hash.test(owner.executablePathDigest ?? ""))
    missing.push("native_recovery_owner_identity_missing");
  if (!j || j.attempt !== b.identity.executionId || !/^[a-f0-9-]{36}$/.test(j.job ?? "") || j.cleanup !== true || j.activeProcesses !== 0
      || j.jobClosed !== true || j.assignedBeforeResume !== true || j.resumed !== true || j.killOnClose !== true || j.breakaway !== false
      || ![j.executableDigest, j.launcherSha256, j.sourceSha256].every(v => hash.test(v ?? "")) || nativeDigest(j) !== p.public.jobDigest)
    missing.push("native_recovery_job_chain_missing");
  for (const [label, old] of [["owner", owner], ["root", { pid: j?.rootPid, creationTime: j?.rootCreationTime }],
    ["launcher", { pid: j?.launcherPid, creationTime: j?.launcherCreationTime }]]) {
    if (!old || !Number.isSafeInteger(old.pid) || old.pid < 1 || !/^\d{16,20}$/.test(old.creationTime ?? "")) { missing.push("native_recovery_" + label + "_identity_missing"); continue; }
    try { const now = observeWindowsProcessIdentity(old.pid); if (now) missing.push(now.creationTime === old.creationTime ? "native_recovery_process_alive" : "native_recovery_pid_reused"); }
    catch { missing.push("native_recovery_process_observation_unavailable"); }
  }
  return [...new Set(missing)];
}
function snapshot(s) {
  if (existsSync(path.join(s.state, "agent-host-recovery.lock"))) fail("native_b24_recovery_barrier_present");
  s.installation.assertFresh();
  const r = readDurableNativeReview(s.options.reviewDirectory), p = r.payload, b = p.binding;
  if (r.digest !== s.review.digest || r.identity !== s.review.identity || r.directoryIdentity !== s.review.directoryIdentity || r.keyIdentity !== s.review.keyIdentity)
    fail("native_b24_original_review_changed");
  const controls = [b.writer, b.lease, b.spent].map(old => {
    if (!/^[a-zA-Z0-9_.-]+$/.test(old.name)) fail("native_b24_artifact_invalid");
    const now = nativeArtifactSnapshot(path.join(s.state, old.name));
    if (now.identity !== old.identity || now.digest !== old.digest) fail("native_b24_original_artifact_changed");
    return artifact(now);
  });
  const reportNow = fileProof(s.options.reportPath);
  if (reportNow.digest !== s.reportProof.digest || reportNow.identityDigest !== s.reportProof.identityDigest) fail("native_b24_report_changed");
  if (physicalIdentity(s.repository) !== b.rootIdentity) fail("native_b24_root_changed");
  const current = captureNativeFootprint(s.repository, s.expected);
  if (current.digest !== p.postFootprintDigest) fail("native_b24_footprint_changed");
  const names = readdirSync(s.root).sort();
  if (nativeDigest(names) !== nativeDigest([".roost-attempt-owner", ".roost-smoke-scope", "repository", "roost-job.exe"])) fail("native_b24_fixture_scope_changed");
  const marker = fileProof(path.join(s.root, ".roost-attempt-owner"), 64), scopeMarker = fileProof(path.join(s.root, ".roost-smoke-scope"), 1024);
  if (!hash.test(marker.bytes.toString("utf8"))) fail("native_b24_fixture_marker_invalid");
  const sc = JSON.parse(scopeMarker.bytes);
  if (nativeDigest(sc) !== nativeDigest({ schemaVersion: 1, scope, attemptDigest: sha(b.identity.executionId) })
      || fileProof(path.join(s.root, "roost-job.exe")).digest !== p.job.launcherSha256) fail("native_b24_fixture_scope_changed");
  const before = recoveryObservationSchema.parse({ originalArtifactsDigest: nativeDigest([controls,
    { identityDigest: s.reportProof.identityDigest, digest: s.reportProof.digest }]),
    repositoryIdentity: current.rootIdentity, footprintDigest: current.digest,
    fixtureRootIdentity: physicalIdentity(s.root), fixtureParentIdentity: physicalIdentity(path.dirname(s.root)),
    markerIdentity: marker.identityDigest, markerDigest: marker.digest, scopeMarkerIdentity: scopeMarker.identityDigest, scopeMarkerDigest: scopeMarker.digest,
    fixtureInventoryDigest: fixtureInventory(s.root), installationSnapshotDigest: s.installation.digest,
    manifestDigest: s.installation.manifestDigest, generatedReceiptDigest: s.installation.generatedReceiptDigest,
    immutableFiles: s.installation.immutableFiles, generatedFiles: s.installation.generatedFiles, protectedChanges: 0,
    extraEntries: p.privateChanges.filter(c => !c.expected).length, originalFixtureOwnershipPresent: !!p.fixtureOwnership,
    boundaryCoverage: "bounded_root_and_fixture_only" });
  if (s.before && nativeDigest(before) !== nativeDigest(s.before)) fail("native_b24_observation_drift");
  return before;
}
export function inspectPreservedB21Recovery(options) {
  const reportProof = fileProof(options.reportPath), report = JSON.parse(reportProof.bytes), review = readDurableNativeReview(options.reviewDirectory), p = review.payload, b = p.binding;
  if (report.scope !== scope || report.authorizationSpent !== true || report.nativeReviewReceiptDigest !== review.digest
      || p.policy !== nativeFootprintPolicy || p.stage !== "final" || p.public.verdict !== "acceptance_failed" || p.verification?.status !== "REFUSED"
      || p.verification.reason !== "smoke_unexpected_diff" || p.public.violations.length || p.public.categoryCounts.protected !== 0
      || p.installation.status !== "PASS" || p.installation.manifestDigest !== report.installation.manifestDigest
      || b.spent?.name !== "hermes-b21-smoke-consumed.json" || b.spent.record.scope !== scope || b.spent.record.state !== "dispatch_reserved"
      || b.identity.attempt !== 1 || nativeDigest(b) !== p.public.bindingDigest
      || b.writer.name !== "agent-host-writer.lock" || b.lease.name !== "application-" + nativeDigest(b.identity.applicationId) + ".lease"
      || b.lease.record.attempt !== b.identity.executionId || b.lease.record.writer !== b.writer.record.ownerNonce
      || b.lease.record.application !== nativeDigest(b.identity.applicationId)) fail("native_b24_original_binding_invalid");
  const identityBridge = bridgeRecoveryIdentity(b.identity, b.spent.record.attemptDigest, legacyInputIdentityVersion);
  const state = path.dirname(options.reviewDirectory), root = report.cleanupRequiredAt, repository = path.join(root, "repository");
  if (physicalIdentity(repository) !== b.rootIdentity || existsSync(path.join(state, "agent-host-recovery.lock"))) fail("native_b24_root_or_barrier_invalid");
  const environment = hermesStartupEnvironment({ profilePath: path.join(root, "synthetic-unused-profile.json") }, process.env, repository);
  // Git/Node get no provider-specific inputs, hooks or NODE_OPTIONS.
  const env = Object.fromEntries(Object.entries(environment).filter(([k]) => ["SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP"].includes(k)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_NO_REPLACE_OBJECTS: "1" });
  const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args],
    { cwd: repository, env, windowsHide: true, encoding: "utf8", timeout: 10000, maxBuffer: 65536, stdio: ["ignore", "pipe", "pipe"] });
  const expected = { head: git("rev-parse", "HEAD").trim(), branch: git("symbolic-ref", "--short", "HEAD").trim(), origin: git("remote", "get-url", "origin").trim() };
  const s = { options, reportProof, report, review, state, root, repository, expected, env, git,
    installation: installation(options.installation, report.installation), at: Date.now() };
  s.before = snapshot(s);
  const extra = p.privateChanges.filter(c => !c.expected), repair = p.privateChanges.filter(c => c.expected);
  if (s.before.extraEntries !== 8 || p.privateChanges.length !== 9 || p.privateChanges.some(c => c.category !== "content")
      || p.public.scopeReviewRequired !== true || extra.some(c => c.change !== "added" || c.before !== null)
      || extra.filter(c => c.after?.kind === "directory").length !== 5 || extra.filter(c => c.after?.kind === "file").length !== 3
      || repair.length !== 1 || repair[0].path !== "add.cjs" || repair[0].change !== "modified") fail("native_b24_scope_changed");
  const binding = { originalReview: artifact(review), originalReviewDirectory: review.directoryIdentity, originalKeyIdentity: review.keyIdentity,
    originalPayloadDigest: nativeDigest(p), originalBindingDigest: nativeDigest(b), identityBridge,
    tupleFieldDigests: Object.fromEntries(recoveryIdentityFields.map(k => [k, nativeDigest(b.identity[k])])),
    ready: b.ready, repositoryIdentity: b.rootIdentity, preFootprintDigest: b.preFootprintDigest, postFootprintDigest: p.postFootprintDigest,
    jobDigest: p.public.jobDigest, writer: artifact(b.writer), lease: artifact(b.lease), spent: artifact(b.spent),
    originalInstallationDigest: nativeDigest(p.installation), originalOutcome: "acceptance_failed", originalVerification: "REFUSED", authorization: "spent",
    laterPolicy: { startup: hermesStartupPolicy, windows: windowsEnvironmentPolicy } };
  s.binding = binding; const handle = Object.freeze({}); observations.set(handle, s); return handle;
}
export function qualifySupplementedB21Recovery(handle, directory) {
  const s = observations.get(handle), missing = [];
  if (!s) return { eligible: false, deletionAuthorized: false, missingEvidence: ["native_b24_observation_unproven"] };
  try {
    const current = snapshot(s), record = readRecoverySupplement(directory), p = record.payload;
    if (p.stage !== "finalized" || nativeDigest(p.binding) !== nativeDigest(s.binding) || nativeDigest(p.after) !== nativeDigest(current))
      fail("native_b24_supplement_binding_invalid");
    missing.push(...processMissing(s.review.payload));
    const original = s.review.payload.fixtureOwnership;
    const expectedOwnership = { version: "roost-native-fixture-ownership-v1", repositoryIdentity: current.repositoryIdentity,
      fixtureRootIdentity: current.fixtureRootIdentity, fixtureParentIdentity: current.fixtureParentIdentity,
      markerIdentity: current.markerIdentity, markerDigest: current.markerDigest, scopeMarkerIdentity: current.scopeMarkerIdentity,
      scopeMarkerDigest: current.scopeMarkerDigest };
    if (!original || nativeDigest(original) !== nativeDigest(expectedOwnership)) missing.push("native_recovery_original_fixture_ownership_missing");
    return { eligible: !missing.length, evidenceComplete: !missing.length, deletionAuthorized: false, executionAuthorized: false,
      ownerApprovalRequired: true, missingEvidence: [...new Set(missing)], supplementDigest: record.digest, originalOutcome: "acceptance_failed" };
  } catch (e) { return { eligible: false, deletionAuthorized: false, executionAuthorized: false,
    missingEvidence: [/^native_[a-z0-9_]+$/.test(e.message) ? e.message : "native_b24_evidence_unproven"] }; }
}
// Read-only evidence for a separately owner-approved B25 legacy adoption.
// This does not repair the original missing ownership proof or mint a capability.
export function readPreservedB21AdoptionEvidence(handle, directory) {
  const s = observations.get(handle); if (!s) fail("native_b25_observation_unproven");
  const q = qualifySupplementedB21Recovery(handle, directory);
  if (q.eligible || nativeDigest(q.missingEvidence) !== nativeDigest(["native_recovery_original_fixture_ownership_missing"])
      || s.before.originalFixtureOwnershipPresent) fail(q.missingEvidence.find(reason => reason !== "native_recovery_original_fixture_ownership_missing") ?? "native_b25_legacy_gap_not_exclusive");
  const supplement = readRecoverySupplement(directory), p = supplement.payload;
  const paths = { state: s.state, fixture: s.root, repository: s.repository,
    marker: path.join(s.root, ".roost-attempt-owner"), scopeMarker: path.join(s.root, ".roost-smoke-scope"),
    originalReview: s.options.reviewDirectory, originalReport: s.options.reportPath,
    manifest: s.options.installation.manifestPath, installation: s.options.installation.attestationPath, supplement: directory };
  const pathDigests = Object.fromEntries(Object.entries(paths).map(([key, file]) => {
    if (realpathSync.native(file) !== file) fail("native_b25_canonical_path_required");
    return [key, nativeDigest(file)];
  }));
  const nodeDigest = sha(readFileSync(process.execPath));
  if (nodeDigest !== p.verification.nodeExecutableDigest) fail("native_b25_verifier_runtime_changed");
  return structuredClone({ binding: s.binding, observation: s.before, pathDigests,
    supplement: { digest: supplement.digest, directoryIdentity: supplement.directoryIdentity, keyIdentity: supplement.keyIdentity,
      eventsDigest: nativeDigest(supplement.events.map(e => [e.digest, e.identity])), verificationDigest: nativeDigest(p.verification) },
    runtime: { providerExecutableDigest: s.report.installation.executableDigest, nodeExecutableDigest: nodeDigest,
      nodeExecutableIdentity: physicalIdentity(process.execPath, false), installationFilesIdentityDigest: s.installation.physicalFilesDigest(),
      approvedPinDigest: nativeDigest([pin.officialSource, pin.version, pin.commit]) },
    processChainDigest: nativeDigest([s.review.payload.binding.writer.record.ownerProcess, s.review.payload.job]),
    processObservation: "original_processes_absent" });
}
// B26 continuation checks deliberately omit only the resources its separately
// signed deletion journal accounts for. This read-only helper grants no authority.
export function inspectB21RetainedEvidence(options, frozen) {
  const reportProof = fileProof(options.reportPath), report = JSON.parse(reportProof.bytes);
  const installed = installation(options.installation, report.installation);
  const assertRetained = ({ leaseAbsent = false, writerAbsent = false } = {}) => {
    const r = readDurableNativeReview(options.reviewDirectory), p = r.payload, b = p.binding;
    if (nativeDigest(artifact(r)) !== nativeDigest(frozen.binding.originalReview)
        || r.directoryIdentity !== frozen.binding.originalReviewDirectory || r.keyIdentity !== frozen.binding.originalKeyIdentity
        || nativeDigest(p) !== frozen.binding.originalPayloadDigest || nativeDigest(b) !== frozen.binding.originalBindingDigest)
      fail("native_b26_original_evidence_changed");
    const controls = [b.writer, b.lease, b.spent].map((old, index) => {
      if (!/^[a-zA-Z0-9_.-]+$/.test(old.name) || [".", ".."].includes(old.name)) fail("native_b26_artifact_invalid");
      const file = path.join(path.dirname(options.reviewDirectory), old.name);
      const absent = index === 0 ? writerAbsent : index === 1 ? leaseAbsent : false;
      let exists = true; try { lstatSync(file); } catch (e) { if (e.code !== "ENOENT") throw e; exists = false; }
      if (absent ? exists : !exists) fail("native_b26_control_presence_changed");
      if (exists) { const now = nativeArtifactSnapshot(file); if (now.identity !== old.identity || now.digest !== old.digest) fail("native_b26_control_changed"); }
      return artifact(old);
    });
    const nowReport = fileProof(options.reportPath);
    if (nativeDigest([controls, { identityDigest: nowReport.identityDigest, digest: nowReport.digest }]) !== frozen.observation.originalArtifactsDigest)
      fail("native_b26_report_changed");
    const paths = { state: path.dirname(options.reviewDirectory), fixture: report.cleanupRequiredAt, repository: path.join(report.cleanupRequiredAt, "repository"),
      marker: path.join(report.cleanupRequiredAt, ".roost-attempt-owner"), scopeMarker: path.join(report.cleanupRequiredAt, ".roost-smoke-scope"),
      originalReview: options.reviewDirectory, originalReport: options.reportPath, manifest: options.installation.manifestPath,
      installation: options.installation.attestationPath, supplement: options.supplementDirectory };
    if (nativeDigest(Object.fromEntries(Object.entries(paths).map(([k, file]) => [k, nativeDigest(file)]))) !== nativeDigest(frozen.pathDigests)) fail("native_b26_path_changed");
    installed.assertFresh();
    if (installed.digest !== frozen.observation.installationSnapshotDigest || installed.physicalFilesDigest() !== frozen.runtime.installationFilesIdentityDigest
        || report.installation.executableDigest !== frozen.runtime.providerExecutableDigest
        || sha(readFileSync(process.execPath)) !== frozen.runtime.nodeExecutableDigest || physicalIdentity(process.execPath, false) !== frozen.runtime.nodeExecutableIdentity
        || nativeDigest([pin.officialSource, pin.version, pin.commit]) !== frozen.runtime.approvedPinDigest) fail("native_b26_runtime_changed");
    const missing = processMissing(p); if (missing.length) fail(missing[0]);
    return { root: report.cleanupRequiredAt, binding: b };
  };
  return Object.freeze({ assertRetained });
}
export function createB21RecoverySupplement(options) {
  if (typeof options.assertOwnerAuthority !== "function") fail("native_supplement_owner_authority_required");
  options.assertOwnerAuthority();
  const handle = inspectPreservedB21Recovery(options), s = observations.get(handle);
  if (invoked.has(s.review.digest)) fail("native_supplement_replay_denied"); invoked.add(s.review.digest);
  const processGaps = processMissing(s.review.payload); if (processGaps.length) fail(processGaps[0]);
  const assertUnchanged = () => snapshot(s);
  const journal = beginRecoverySupplement({ state: s.state, binding: s.binding, before: s.before,
    assertOwnerAuthority: options.assertOwnerAuthority, assertUnchanged });
  if (s.git("show", "HEAD:add.cjs") !== initial || s.git("show", "HEAD:add.test.cjs") !== testBytes
      || s.git("rev-list", "--count", "HEAD").trim() !== "1" || s.report.baseline?.exit !== 1
      || readFileSync(path.join(s.repository, "add.cjs"), "utf8") !== fixed
      || readFileSync(path.join(s.repository, "add.test.cjs"), "utf8") !== testBytes) fail("native_b24_expected_fix_unproven");
  assertUnchanged(); options.assertOwnerAuthority();
  const result = spawnSync(process.execPath, ["--test", "add.test.cjs"], { cwd: s.repository, env: s.env, windowsHide: true,
    timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0 || !/# pass 1\b/.test(result.stdout ?? "") || !/# fail 0\b/.test(result.stdout ?? "")) fail("native_b24_independent_test_failed");
  assertUnchanged();
  const verification = { status: "later_independent_test_passed", laterObservedAt: new Date().toISOString(), expectedFixVerified: true,
    baselineCommitUnchanged: true, testUnchanged: true, nodeExit: 0, testsPassed: 1, testsFailed: 0,
    testDigest: sha(testBytes), implementationDigest: sha(fixed), baselineCommitDigest: nativeDigest(s.expected.head),
    diffDigest: sha(s.git("diff", "--no-ext-diff", "--no-textconv", "--", "add.cjs")), outputDigest: sha(result.stdout),
    nodeExecutableDigest: sha(readFileSync(process.execPath)), extraEntriesUnacceptable: true, attribution: "unknown",
    unknownAttributionCount: 8, originalVerificationUnchanged: true, taskCompletionAllowed: false };
  captureRecoveryVerification(journal, verification);
  const postInstallation = installation(options.installation, s.report.installation);
  if (postInstallation.digest !== s.installation.digest) fail("native_b24_installation_changed");
  const after = snapshot(s), final = finalizeRecoverySupplement(journal, after);
  const directory = recoverySupplementLocation(journal);
  return { projection: projectRecoverySupplement(final), eligibility: qualifySupplementedB21Recovery(handle, directory),
    readback: nativeDigest(after), originalArtifactsUnchanged: true };
}
