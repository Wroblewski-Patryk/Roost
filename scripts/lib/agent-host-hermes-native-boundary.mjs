import path from "node:path";
import { readdirSync, lstatSync } from "node:fs";
import { z } from "zod";
import { nativeToolPolicy, nativeRiskReference, assertCodingAuthority, nativeBoundaryError, codingAuthorities } from "./agent-host-native-authority.mjs";
import { captureNativeFootprint, compareNativeFootprint, physicalIdentity, nativeRelative, nativeDigest,
  inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./agent-host-native-footprint.mjs";
import { acquireApplicationLease, assertApplicationLease, releaseApplicationLease } from "./agent-host-application-lease.mjs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { isHermesStartupReceipt, hermesStartupNativeRootMatches } from "./agent-host-hermes-startup.mjs";
import { assertHermesBudgetReceipt, hermesBudgetReceiptMatches } from "./agent-host-hermes-budget.mjs";
import { isWindowsJobReceipt } from "./agent-host-windows-job.mjs";
import { createNativeReview, captureNativeReview, completeNativeReview, assertNativeReviewCleanupRecord, recordNativeReviewCleanup, nativeReviewLocation } from "./agent-host-native-review.mjs";

export const nativeToolBlocker = "hermes_native_tools_isolation_unproven";
const proofs = new WeakMap(), receipts = new WeakMap();
const completed = new WeakMap();
const frozen = v => { if (v && typeof v === "object") { Object.values(v).forEach(frozen); Object.freeze(v); } return v; };
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const nativeToolReceiptSchema = z.object({
  schemaVersion: z.literal("roost-hermes-native-boundary-receipt-v1"), policyVersion: z.literal(nativeToolPolicy),
  ownerRiskReference: z.literal(nativeRiskReference), ownerAttestationDigest: hash,
  authorityProfile: z.literal("coding-local"), authorities: z.tuple([z.literal("repository_read"), z.literal("repository_write"), z.literal("local_test")]),
  toolsets: z.tuple([z.literal("file"), z.literal("terminal")]), attemptId: z.string().uuid(), inputSeal: hash, readyRevision: hash,
  canonicalRootDigest: hash, repositoryIdentityDigest: hash, oneWriterReference: hash, applicationLeaseReference: hash,
  startupReceiptDigest: hash, budgetReceiptDigest: hash, preFootprintDigest: hash, postFootprintDigest: hash.nullable(),
  changedPathDigests: z.array(hash).max(8192), preExistingDirtyCount: z.number().int().min(0).max(128),
  tempRootDigests: z.array(hash).max(8), cleanupDigest: hash.nullable(), jobReceiptDigest: hash.nullable(),
  coverage: z.literal("bounded_root_metadata_git_dirty_bytes_dependencies_partial"),
  processCoverage: z.enum(["declared_listening_ports_only", "not_observed"]),
  outsideRootAndTransientEffects: z.literal("not_proven_accepted_residual_risk"),
  classification: z.enum(["policy_checked", "review_required", "boundary_violation", "policy_blocked"]),
  scopeReviewRequired: z.boolean().default(false),
  categoryCounts: z.object({ content: z.number().int().nonnegative(), protected: z.number().int().nonnegative() }).strict().default({ content: 0, protected: 0 }),
  footprintPolicy: z.literal("roost-root-scoped-coding-v2").default("roost-root-scoped-coding-v2"),
  violations: z.array(z.enum(["repository_metadata_or_identity_drift", "preexisting_dirty_changed", "protected_path_changed", "unexpected_changed_path", "footprint_unavailable", "application_instance_or_lease_changed", "cleanup_unproven", "owned_job_unproven"])),
  releaseAllowed: z.literal(false), reviewRequired: z.literal(true), digest: hash
}).strict();
function siblings(root) {
  const parent = path.dirname(root); physicalIdentity(parent);
  const names = readdirSync(parent).sort();
  if (names.length > 256) throw nativeBoundaryError("native_inventory_limit");
  return nativeDigest(names.map(n => { const s = lstatSync(path.join(parent, n), { bigint: true }); return [n, String(s.ino), s.isSymbolicLink()]; }));
}
function assertAutoPrunedCachesEmpty(provider) {
  const home = path.dirname(provider.profile.profilePath);
  try { lstatSync(path.join(home, "cache")); physicalIdentity(path.join(home, "cache")); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  for (const name of ["terminal", "blocked-scripts"]) {
    const dir = path.join(home, "cache", name);
    try {
      lstatSync(dir); physicalIdentity(dir);
      if (readdirSync(dir).length) throw nativeBoundaryError("native_unowned_cache_present");
    } catch (e) { if (e.code !== "ENOENT") throw e; }
  }
}
export function sealNativeToolBoundary({ envelope, provider, repositoryPath, expected, writerLock, startupReceipt, budgetReceipt,
  applicationObserver, ownedTemps = [] }) {
  const scope = assertCodingAuthority(envelope);
  scope.writePaths.forEach(nativeRelative);
  if (provider.profile.nativeToolsRisk?.decisionReference !== nativeRiskReference || provider.profile.nativeToolsRisk?.policyVersion !== nativeToolPolicy)
    throw nativeBoundaryError("native_risk_acceptance_required");
  if (!hermesStartupNativeRootMatches(startupReceipt, envelope, repositoryPath)
      || !hermesBudgetReceiptMatches(budgetReceipt, envelope, startupReceipt)) throw nativeBoundaryError("native_startup_unproven");
  assertHermesBudgetReceipt(budgetReceipt);
  const writer = assertWriterLock(writerLock);
  const repositories = envelope.evidence.application.value.application.repositories;
  const primary = repositories.filter(r => r.isPrimary);
  const origin = primary.length === 1 ? primary[0].url : repositories.length === 1 ? repositories[0].url : null;
  if (!expected || expected.head !== envelope.evidence.risk.value.commit || expected.branch !== envelope.contract.singleTask.branch
      || expected.origin !== origin || scope.writePaths.length !== new Set(scope.writePaths).size || ownedTemps.length > 8) throw nativeBoundaryError();
  assertAutoPrunedCachesEmpty(provider);
  const before = captureNativeFootprint(repositoryPath, expected);
  if (before.digest !== captureNativeFootprint(repositoryPath, expected).digest) throw nativeBoundaryError("native_footprint_changed");
  const tempRoots = ownedTemps.map(t => inspectNativeOwnedTemp(t, envelope.identity.executionId));
  if (tempRoots.some(t => t.root === repositoryPath || t.root.startsWith(repositoryPath + path.sep))) throw nativeBoundaryError("native_temp_scope_invalid");
  const siblingDigest = siblings(repositoryPath);
  const app = acquireApplicationLease({ writerLock, applicationId: envelope.identity.applicationId, attempt: envelope.identity.executionId,
    runtime: scope.runtime, observer: applicationObserver });
  const proof = Object.freeze({});
  proofs.set(proof, { envelope, provider, repositoryPath, expected: structuredClone(expected), writerLock, app, before, scope,
    startupReceipt, budgetReceipt, writer, tempRoots, ownedTemps: [...ownedTemps], siblingDigest, done: false, began: false });
  return proof;
}
function body(saved, classification, extras = {}) {
  const lease = extras.lease ?? assertApplicationLease(saved.app);
  return { schemaVersion: "roost-hermes-native-boundary-receipt-v1", policyVersion: nativeToolPolicy, ownerRiskReference: nativeRiskReference,
    ownerAttestationDigest: saved.startupReceipt.authAttestationDigest, authorityProfile: "coding-local", authorities: [...codingAuthorities],
    toolsets: ["file", "terminal"], attemptId: saved.envelope.identity.executionId, inputSeal: saved.envelope.seal, readyRevision: saved.envelope.revisions.ready,
    canonicalRootDigest: saved.before.rootIdentity, repositoryIdentityDigest: saved.before.gitIdentity,
    oneWriterReference: nativeDigest(saved.writer.reference), applicationLeaseReference: lease.reference,
    startupReceiptDigest: saved.startupReceipt.digest, budgetReceiptDigest: saved.budgetReceipt.digest, preFootprintDigest: saved.before.digest,
    postFootprintDigest: null, changedPathDigests: [], preExistingDirtyCount: saved.before.dirty.length,
    tempRootDigests: saved.tempRoots.map(t => t.identity), cleanupDigest: null, jobReceiptDigest: null,
    coverage: saved.before.coverage, processCoverage: lease.processCoverage, outsideRootAndTransientEffects: "not_proven_accepted_residual_risk",
    classification, violations: [], scopeReviewRequired: false, categoryCounts: { content: 0, protected: 0 }, footprintPolicy: "roost-root-scoped-coding-v2",
    releaseAllowed: false, reviewRequired: true };
}
export function assertNativeToolBoundary(proof, envelope) {
  const saved = proofs.get(proof);
  if (!saved || saved.envelope !== envelope || saved.done || saved.began) throw nativeBoundaryError("native_boundary_proof_unavailable");
  assertCodingAuthority(envelope); assertWriterLock(saved.writerLock);
  if (!isHermesStartupReceipt(saved.startupReceipt, envelope)) throw nativeBoundaryError("native_startup_unproven");
  assertHermesBudgetReceipt(saved.budgetReceipt); assertAutoPrunedCachesEmpty(saved.provider);
  if (saved.siblingDigest !== siblings(saved.repositoryPath) || captureNativeFootprint(saved.repositoryPath, saved.expected).digest !== saved.before.digest) throw nativeBoundaryError("native_footprint_changed");
  saved.ownedTemps.forEach((t, i) => { if (inspectNativeOwnedTemp(t, envelope.identity.executionId).digest !== saved.tempRoots[i].digest) throw nativeBoundaryError("native_temp_changed"); });
  const payload = body(saved, "policy_checked");
  const receipt = frozen(nativeToolReceiptSchema.parse({ ...payload, digest: nativeDigest(payload) }));
  receipts.set(receipt, { proof, envelope }); saved.lastReceipt = receipt;
  return receipt;
}
export function nativeToolBlockers(blockers, receipt, envelope) {
  const saved = receipts.get(receipt);
  if (!saved || saved.envelope !== envelope) return [...blockers];
  try { const checked = assertNativeToolBoundary(saved.proof, envelope); if (checked.digest !== receipt.digest) return [...blockers];
    return blockers.filter(code => code !== nativeToolBlocker); } catch { return [...blockers]; }
}
export function consumeNativeToolBoundary(receipt, processOptions) {
  const saved = receipts.get(receipt);
  if (!saved) throw nativeBoundaryError("native_boundary_proof_unavailable");
  assertNativeToolBoundary(saved.proof, saved.envelope);
  const proof = proofs.get(saved.proof);
  if (processOptions.cwd !== proof.repositoryPath || processOptions.environment.HERMES_WRITE_SAFE_ROOT !== proof.repositoryPath
      || processOptions.environment.HERMES_SAFE_MODE !== "1" || processOptions.attempt !== saved.envelope.identity.executionId
      || !hermesBudgetReceiptMatches(processOptions.budgetReceipt, saved.envelope)
      || processOptions.budgetReceipt.digest !== proof.budgetReceipt.digest)
    throw nativeBoundaryError("native_process_scope_changed");
  proof.review = createNativeReview({ writerLock: proof.writerLock, applicationLease: proof.app, envelope: proof.envelope,
    rootIdentity: proof.before.rootIdentity, preFootprintDigest: proof.before.digest, spentPath: proof.spentPath,
    assertWorkspaceStable() {
      if (!proof.postDigest || captureNativeFootprint(proof.repositoryPath, proof.expected).digest !== proof.postDigest
          || siblings(proof.repositoryPath) !== proof.siblingDigest) throw nativeBoundaryError("native_post_verification_footprint_changed");
      assertApplicationLease(proof.app);
    } });
  proof.began = true;
  return saved.proof;
}
export function completeNativeToolBoundary(proof, { ownedTreeReceipt, error } = {}) {
  const saved = proofs.get(proof);
  if (!saved || saved.done || !saved.began) throw nativeBoundaryError("native_boundary_proof_unavailable");
  saved.done = true;
  const last = saved.lastReceipt, violations = []; let post = null, comparison = null, captureFailure = null;
  try {
    post = captureNativeFootprint(saved.repositoryPath, saved.expected);
    const compared = comparison = compareNativeFootprint(saved.before, post, saved.scope.writePaths);
    violations.push(...compared.violations);
    if (siblings(saved.repositoryPath) !== saved.siblingDigest) violations.push("unexpected_changed_path");
  } catch (error) { captureFailure = error.message; violations.push("footprint_unavailable"); }
  try { assertApplicationLease(saved.app); } catch { violations.push("application_instance_or_lease_changed"); }
  try { assertAutoPrunedCachesEmpty(saved.provider); } catch { violations.push("cleanup_unproven"); }
  const job = isWindowsJobReceipt(ownedTreeReceipt) && ownedTreeReceipt.attempt === saved.envelope.identity.executionId ? ownedTreeReceipt : null;
  if (!job) violations.push("owned_job_unproven");
  // Persist BEFORE independent verification; no fixture/temp/lease is released
  // at process exit. Only the terminal review capability can permit cleanup.
  const review = captureNativeReview(saved.review, { ownedTreeReceipt: job, comparison, postFootprintDigest: post?.digest ?? null, violations, captureFailure });
  saved.postDigest = post?.digest ?? null;
  const payload = { ...body(saved, "review_required", { lease: { reference: last.applicationLeaseReference, processCoverage: last.processCoverage } }),
    postFootprintDigest: post?.digest ?? null, changedPathDigests: review.changedPathIds, cleanupDigest: null,
    scopeReviewRequired: review.scopeReviewRequired, categoryCounts: review.categoryCounts, footprintPolicy: "roost-root-scoped-coding-v2",
    jobReceiptDigest: job ? nativeDigest(job) : null, violations: [...new Set(violations)],
    classification: violations.length ? "boundary_violation" : error || job?.terminationReason !== "root_exit" || job?.rootExit !== 0 ? "policy_blocked" : "review_required" };
  const result = frozen(nativeToolReceiptSchema.parse({ ...payload, digest: nativeDigest(payload) }));
  completed.set(result, saved); return result;
}
export function bindNativeSpentRecord(receipt, spentPath) {
  const r = receipts.get(receipt), saved = r && proofs.get(r.proof);
  if (!saved || saved.began || saved.done || saved.spentPath) throw nativeBoundaryError("native_boundary_proof_unavailable");
  saved.spentPath = spentPath;
}
export async function verifyCompletedNativeBoundary(receipt, options) {
  const saved = completed.get(receipt); if (!saved) throw nativeBoundaryError("native_boundary_proof_unavailable");
  return completeNativeReview(saved.review, options);
}
export function completedNativeReviewLocation(receipt) {
  const saved = completed.get(receipt); if (!saved) throw nativeBoundaryError("native_boundary_proof_unavailable");
  return nativeReviewLocation(saved.review);
}
export function releaseReviewedNativeBoundary(receipt, capability) {
  const saved = completed.get(receipt); if (!saved) throw nativeBoundaryError("native_boundary_proof_unavailable");
  // The controller checked the capability immediately before fixture cleanup.
  // Recording cleanup below checks the signed review again without reading a
  // workspace that has already been removed.
  assertNativeReviewCleanupRecord(capability, saved.envelope.identity.executionId);
  for (const temp of saved.ownedTemps) cleanupNativeOwnedTemp(temp, saved.envelope.identity.executionId);
  recordNativeReviewCleanup(capability, saved.envelope.identity.executionId);
  releaseApplicationLease(saved.app);
}
export function abandonNativeToolBoundary(proof) {
  const saved = proofs.get(proof);
  if (!saved || saved.began || saved.done) throw nativeBoundaryError("native_boundary_reconciliation_required");
  releaseApplicationLease(saved.app); saved.done = true;
}
