import { resolve } from "node:path";
import { z } from "zod";

// Pure qualification of facts already loaded by the trusted DB adapter. Never
// pass request/model JSON as records/sourceView/scopeView/owner/lookup facts.
// The server verifies owner provenance; it does not inspect Windows/Linux or
// verify the private root HMAC. Actual Job/HMAC/OS capability precedes recording.
const shared = require(resolve(__dirname, "../../../scripts/lib/agent-host-release-contract.cjs"));
const hash = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().uuid();
const metadataSchema = z.object({
  schemaVersion: z.literal("roost-compatible-recovery-native-provenance-v1"),
  classification: z.literal("owner_verified_native_receipt"),
  nativeAttemptId: id,
  nativeAttemptKind: z.literal("root_owned_windows_job_run"),
  nativeAttemptIsAgentExecution: z.literal(false),
  sourceExecutionId: id,
  privateSignedRecordDigest: hash,
  jobReceiptDigest: hash,
  toolchainDigest: hash,
  sourceCASDigest: hash,
  publicPayloadDigest: hash,
  build: z.unknown(),
  compatibility: z.unknown()
}).strict();
type Row = Record<string, any>;
export type CompatibleRecoveryProofFacts = {
  workspaceId: string;
  input: Row;
  issuerUserId: string;
  primaryOwnerUserId: string;
  records: Row[];
  sourceView: Row;
  scopeView: Row;
  previousClosureCreatedAt: Date | string;
  // Result of the actual AgentExecution lookup for metadata.nativeAttemptId.
  // null is required; undefined/unperformed lookup is never evidence.
  nativeAttemptAgentExecutionId: string | null;
  now: Date;
};
export type CompatibleRecoveryProofSnapshot = {
  schemaVersion: "roost-compatible-recovery-proof-snapshot-v1";
  classification: "owner_verified_native_receipt";
  workspaceId: string; applicationId: string; issuerUserId: string;
  evidenceId: string; recordDigest: string; metadataDigest: string;
  requestDigest: string; manifestDigest: string; scopeDigest: string;
  publicPayloadDigest: string; buildReceiptDigest: string; compatibilityReceiptDigest: string;
  privateSignedRecordDigest: string; jobReceiptDigest: string; toolchainDigest: string; sourceCASDigest: string;
  nativeAttemptId: string; nativeAttemptIsAgentExecution: false;
  sourceExecutionId: string; sourceBasisDigest: string; scopeBasisDigest: string;
  serverOperatingSystemAttestation: false; serverPrivateSignatureVerification: false;
  releaseAuthority: false;
};
export type QualifiedCompatibleRecoveryProof = Readonly<CompatibleRecoveryProofSnapshot>;
type ProofState = { requestDigest: string; buildDigest: string; compatibilityDigest: string };
const qualified = new WeakMap<object, ProofState>();
const errorCode = "release_compatible_recovery_build_provenance_unproven";
// Prisma Dates must retain their ISO values in basis hashes, not become empty
// objects under a plain canonical Object.entries walk.
const digest = (value: unknown): string => shared.releaseDigest(JSON.parse(JSON.stringify(value ?? null)));
const same = (left: unknown, right: unknown) => digest(left ?? null) === digest(right ?? null);
const check = (condition: unknown) => { if (!condition) throw new Error(errorCode); };
const epoch = (value: unknown): number => value instanceof Date ? value.getTime()
  : typeof value === "string" ? Date.parse(value) : NaN;
const instant = (value: unknown): string => { const n = epoch(value); check(Number.isFinite(n)); return new Date(n).toISOString(); };
const publicPayload = (build: unknown, compatibility: unknown) => ({
  schemaVersion: "roost-compatible-recovery-public-payload-v1", build, compatibility
});
export const compatibleRecoveryPublicPayloadDigest = (build: unknown, compatibility: unknown) => digest(publicPayload(build, compatibility));

function wireInput(input: Row): Row {
  const copy = { ...input };
  // The normal stored snapshot adds only these known server/Worker fields.
  // Unknown capabilities remain present and are refused by the strict parser.
  for (const key of ["readinessDigest", "configurationDigest"]) {
    if (Object.hasOwn(copy, key)) { check(hash.safeParse(copy[key]).success); delete copy[key]; }
  }
  if (Object.hasOwn(copy, "releaseId")) { check(id.safeParse(copy.releaseId).success); delete copy.releaseId; }
  return shared.createReleaseSchema.parse(copy);
}
function basisDigest(view: Row): string {
  const e = view.execution;
  return digest({ current: view.current, roleIssues: view.roleIssues, materialVersion: view.materialVersion,
    approvalCommit: view.approvalCommit, decision: view.decision, contract: view.contract,
    basisRevalidation: view.result?.basisRevalidation ?? null,
    execution: { id: e.id, taskId: e.taskId, workspaceId: e.workspaceId, applicationId: e.applicationId,
      agentHostId: e.agentHostId, status: e.status, attempt: e.attempt, checkpointVersion: e.checkpointVersion,
      completedAt: instant(e.completedAt), changedFiles: e.changedFiles, verification: e.verification,
      finalResponse: e.finalResponse, summary: e.summary, promptDigest: digest(e.prompt),
      executionContract: e.metadata?.executionContract, resultRevision: e.metadata?.resultRevision,
      readyContextPin: e.metadata?.readyContextPin } });
}
function currentReview(view: Row, input: Row, readonly: boolean) {
  const e = view?.execution, d = view?.decision, c = view?.contract, r = input.compatibleArtifactRecovery;
  const v = e?.verification, n = v?.ownedTreeReceipt, m = v?.managedAdmission;
  check(view.current === true && Array.isArray(view.roleIssues) && view.roleIssues.length === 0
    && e && d && c && e.status === "completed" && !e.contextInvalidatedAt && !e.contextStoppedAt && !e.cancelRequestedAt && !e.errorState
    && e.leaseToken === null && e.leaseExpiresAt === null && e.applicationId === input.applicationId && e.agentHostId === input.hostId
    && d.decision === "approve" && view.approvalCommit === input.commit && d.evidence?.reviewedCommit === input.commit
    && d.materialVersion === view.materialVersion && id.safeParse(c.assignment?.agentId).success && id.safeParse(d.verifierId).success
    && d.verifierId !== c.assignment?.agentId && d.verifierId !== input.releaserAgentId
    && c.modelSelection?.schemaVersion === "roost-managed-hermes-backend-v1" && c.modelSelection.backend === "codex_responses"
    && m?.qualification === "signed_native_v1" && hash.safeParse(m.evidenceDigest).success
    && hash.safeParse(n?.sourceSha256).success && m.jobSourceDigest === n.sourceSha256
    && n.version === "roost-windows-job-v2" && n.attempt === e.id && n.rootExit === 0 && n.jobClosed === true
    && n.cleanup === true && n.activeProcesses === 0 && n.assignedBeforeResume === true && n.resumed === true
    && n.killOnClose === true && n.breakaway === false);
  if (readonly) {
    const a = v.readOnlyAudit;
    check(e.id === r.scopeAudit.executionId && e.id === input.releaseExecutionId && e.taskId === r.scopeAudit.taskId
      && d.id === r.scopeAudit.reviewId && view.materialVersion === r.scopeAudit.materialVersion
      && c.nativeBoundary?.profile === "inspect-readonly" && c.nativeBoundary.inspectReadOnly?.kind === "auditor"
      && c.assignment?.agentId === input.releaserAgentId && c.access?.sandbox === "read-only" && c.access.externalWrites === false
      && same(c.access.tools, ["repository_read"]) && same(c.access.permissions, ["repository_read"])
      && same(e.changedFiles, []) && a?.schemaVersion === "roost-readonly-audit-v1" && a.verdict === "verified"
      && hash.safeParse(a.evidenceDigest).success && hash.safeParse(a.preTree).success && a.preTree === a.postTree
      && ["gitState", "processState", "dockerState"].every(key => a[key] === "unchanged") && same(a.nativeTools, []));
  } else {
    check(e.taskId === input.taskId && d.id === input.reviewId && view.materialVersion === input.materialVersion
      && c.nativeBoundary?.profile === "coding-local" && c.assignment?.agentId !== input.releaserAgentId
      && e.metadata?.resultRevision?.commit === input.commit && e.metadata.resultRevision.workingTree === "clean");
  }
}
function artifactPassed(view: Row, reference: string) {
  check(Array.isArray(view.decision.evidence?.evidence)
    && view.decision.evidence.evidence.some((e: Row) => e.kind === "artifact" && e.verdict === "pass" && e.reference === reference));
}

export function qualifyCompatibleRecoveryProof(facts: CompatibleRecoveryProofFacts):
  { error: typeof errorCode } | { proof: QualifiedCompatibleRecoveryProof; snapshot: CompatibleRecoveryProofSnapshot } {
  try {
    check(id.safeParse(facts.workspaceId).success && id.safeParse(facts.issuerUserId).success
      && facts.issuerUserId === facts.primaryOwnerUserId && facts.now instanceof Date && Number.isFinite(facts.now.getTime())
      && facts.nativeAttemptAgentExecutionId === null && Array.isArray(facts.records) && facts.records.length === 1);
    const input = wireInput(facts.input), r = input.compatibleArtifactRecovery, record = facts.records[0];
    check(r && record.workspaceId === facts.workspaceId && record.applicationId === input.applicationId
      && id.safeParse(record.id).success && record.type === "test" && record.source === "human"
      && record.verificationStatus === "verified" && record.verifiedByType === "user"
      && record.verifiedById === facts.issuerUserId);
    const meta = metadataSchema.parse(record.metadata), build = shared.compatibleRecoveryBuildSchema.parse(meta.build),
      compatibility = shared.compatibleRecoveryCompatibilitySchema.parse(meta.compatibility);
    check(meta.nativeAttemptId === build.executionId && meta.nativeAttemptId === compatibility.buildExecutionId
      && meta.nativeAttemptId !== meta.sourceExecutionId && meta.nativeAttemptId !== r.scopeAudit.executionId
      && meta.sourceExecutionId === build.sourceExecutionId && meta.sourceExecutionId === compatibility.sourceExecutionId
      && meta.sourceExecutionId === facts.sourceView.execution?.id && meta.jobReceiptDigest === build.nativeReceiptDigest
      && meta.jobReceiptDigest === compatibility.nativeReceiptDigest
      && record.reference === `roost-compatible-native-build:${input.commit}:${meta.privateSignedRecordDigest}`
      && meta.publicPayloadDigest === compatibleRecoveryPublicPayloadDigest(build, compatibility));
    // These rehashes bind exact payloads; they are not a server verification of
    // the private HMAC or of any OS observation represented by those payloads.
    const withoutEvidence = (v: Row) => { const { evidenceDigest, ...body } = v; return body; };
    check(build.evidenceDigest === digest(withoutEvidence(build)) && compatibility.evidenceDigest === digest(withoutEvidence(compatibility))
      && r.replacement.buildReceiptDigest === build.evidenceDigest && r.replacement.compatibilityReceiptDigest === digest(compatibility)
      && ["commit", "tree", "artifactSetDigest", "configurationDigest", "images", "schemaDigest"].every(key => same(compatibility[key], r.replacement[key]))
      && build.commit === input.commit && build.tree === input.candidateTree && same(build.images, r.replacement.images)
      && build.artifactSetDigest === r.replacement.artifactSetDigest && build.configurationDigest === r.replacement.configurationDigest
      && compatibility.backupDigest === input.manifest.backup.digest && compatibility.schemaDigest === input.manifest.baseline.schemaDigest
      && compatibility.dataDigest === input.manifest.baseline.dataDigest && compatibility.sequenceDigest === input.manifest.postObservation.baselineSequenceDigest);
    currentReview(facts.sourceView, input, false); currentReview(facts.scopeView, input, true);
    check(facts.sourceView.execution.workspaceId === facts.workspaceId && facts.scopeView.execution.workspaceId === facts.workspaceId
      && facts.scopeView.execution.id !== facts.sourceView.execution.id && facts.scopeView.decision.id !== facts.sourceView.decision.id
      && facts.scopeView.decision.verifierId !== facts.sourceView.contract.assignment.agentId);
    const n = facts.now.getTime(), closed = epoch(facts.previousClosureCreatedAt), source = epoch(facts.sourceView.execution.completedAt),
      sourceApproved = epoch(facts.sourceView.decision.createdAt),
      built = epoch(build.observedAt), compatible = epoch(compatibility.observedAt), observed = epoch(record.observedAt),
      created = epoch(record.createdAt), verified = epoch(record.verifiedAt), updated = epoch(record.updatedAt),
      audited = epoch(facts.scopeView.execution.completedAt), approved = epoch(facts.scopeView.decision.createdAt);
    check([closed, source, sourceApproved, built, compatible, observed, created, verified, updated, audited, approved].every(t => Number.isFinite(t) && t <= n)
      && sourceApproved >= source && built >= source && built >= closed && compatible >= built && observed === compatible
      && created >= observed && verified >= created && updated >= verified && audited >= verified && approved >= audited
      && n - built <= 86400000 && n - compatible <= 86400000 && epoch(input.manifest.backup.restoreVerifiedAt) <= compatible);
    artifactPassed(facts.scopeView, `roost-release-compatible-artifact-scope:${r.scopeAudit.scopeDigest}`);
    artifactPassed(facts.scopeView, `roost-compatible-artifact-build:${build.evidenceDigest}`);
    artifactPassed(facts.scopeView, `roost-compatible-artifact-restore:${digest(compatibility)}`);
    const metadataDigest = digest(meta), recordDigest = digest({ id: record.id, workspaceId: record.workspaceId,
      applicationId: record.applicationId, type: record.type, source: record.source, reference: record.reference,
      observedAt: instant(record.observedAt), createdAt: instant(record.createdAt), updatedAt: instant(record.updatedAt),
      verifiedAt: instant(record.verifiedAt), verifiedByType: record.verifiedByType, verifiedById: record.verifiedById,
      verificationStatus: record.verificationStatus, metadataDigest });
    const snapshot: CompatibleRecoveryProofSnapshot = { schemaVersion: "roost-compatible-recovery-proof-snapshot-v1",
      classification: "owner_verified_native_receipt", workspaceId: facts.workspaceId, applicationId: input.applicationId,
      issuerUserId: facts.issuerUserId, evidenceId: record.id, recordDigest, metadataDigest, requestDigest: digest(input),
      manifestDigest: input.manifestDigest, scopeDigest: r.scopeAudit.scopeDigest, publicPayloadDigest: meta.publicPayloadDigest,
      buildReceiptDigest: build.evidenceDigest, compatibilityReceiptDigest: digest(compatibility),
      privateSignedRecordDigest: meta.privateSignedRecordDigest, jobReceiptDigest: meta.jobReceiptDigest,
      toolchainDigest: meta.toolchainDigest, sourceCASDigest: meta.sourceCASDigest, nativeAttemptId: meta.nativeAttemptId,
      nativeAttemptIsAgentExecution: false, sourceExecutionId: meta.sourceExecutionId,
      sourceBasisDigest: basisDigest(facts.sourceView), scopeBasisDigest: basisDigest(facts.scopeView),
      serverOperatingSystemAttestation: false, serverPrivateSignatureVerification: false, releaseAuthority: false };
    const proof = Object.freeze({ ...snapshot });
    qualified.set(proof, { requestDigest: snapshot.requestDigest, buildDigest: digest(build), compatibilityDigest: digest(compatibility) });
    return { proof, snapshot: Object.freeze(snapshot) };
  } catch { return { error: errorCode }; }
}

// Request-local only: DB facts must be reloaded and requalified for every later
// admission/effect. A JSON copy or ApplicationEvidence flag is never this brand.
export function compatibleRecoveryBuildProofCallback(proof: QualifiedCompatibleRecoveryProof) {
  const state = qualified.get(proof);
  return (build: unknown, compatibility: unknown, input: Row): null | typeof errorCode => {
    try {
      check(state && state.requestDigest === digest(wireInput(input)) && state.buildDigest === digest(build)
        && state.compatibilityDigest === digest(compatibility));
      return null;
    } catch { return errorCode; }
  };
}
export function compatibleRecoveryProofSnapshotMatches(snapshot: CompatibleRecoveryProofSnapshot, freshFacts: CompatibleRecoveryProofFacts): boolean {
  const fresh = qualifyCompatibleRecoveryProof(freshFacts);
  return !Object.hasOwn(fresh, "error") && same(snapshot, (fresh as { snapshot: CompatibleRecoveryProofSnapshot }).snapshot);
}
