import { createHash } from "node:crypto";
import { z } from "zod";

const id = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/);
const commit = z.string().regex(/^[a-f0-9]{40}$/), integer = z.number().int().nonnegative();
const timestamp = z.string().min(19).max(40).refine(value => Number.isFinite(Date.parse(value)));
const branch = z.string().min(1).max(240);
const relative = z.string().min(1).max(300).refine(value => !value.startsWith("/") && !value.includes("\\")
  && !value.includes(":") && !/[\x00-\x1f]/.test(value) && value.split("/").every(part => part && part !== "." && part !== ".."));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const invalid = () => { throw Object.assign(new Error("code_reviewer_prior_audit_invalid"), {
  contextAdmission: true, retryable: false,
  publicMessage: "The pinned prior auditor evidence could not be verified. No model was started.",
  details: { reason: "code_reviewer_prior_audit_invalid" }
}); };

// This pins the original receipt, independently of any later Ready mapping.
export const codeReviewerPriorAuditReferenceSchema = z.object({ executionId: id, receiptDigest: hash }).strict();
const auditReceiptSchema = z.object({ schemaVersion: z.literal("roost-readonly-audit-v1"), verdict: z.literal("verified"),
  evidenceDigest: hash, preTree: hash, postTree: hash, processState: z.literal("unchanged"),
  dockerState: z.literal("unchanged"), gitState: z.literal("unchanged"), nativeTools: z.tuple([]),
  processCoverage: z.literal("listening_tcp_plus_owned_job_zero_processes"),
  dockerCoverage: z.literal("running_container_list"), digest: hash }).strict();
const managedSchema = z.object({ revision: z.number().int().positive(), decisionId: id,
  qualification: z.literal("signed_native_v1"), evidenceDigest: hash, jobSourceDigest: hash }).strict();
const ownedSchema = z.object({ version: z.literal("roost-windows-job-v2"), attempt: id, type: z.literal("receipt"),
  job: id, assignedBeforeResume: z.literal(true), killOnClose: z.literal(true), breakaway: z.literal(false),
  controllerInJob: z.boolean(), inheritedJob: z.boolean(), rootPid: z.number().int().positive(),
  rootCreationTime: z.string().regex(/^\d{16,20}$/), launcherPid: z.number().int().positive(),
  launcherCreationTime: z.string().regex(/^\d{16,20}$/), resumed: z.literal(true), rootExit: z.literal(0),
  activeProcesses: z.literal(0), jobClosed: z.literal(true), cleanup: z.literal(true), cleanupMs: integer,
  stdoutBytes: integer.positive(), stderrBytes: integer, terminationReason: z.literal("root_exit"),
  resumeReceipt: hash, executableDigest: hash, launcherSha256: hash, sourceSha256: hash }).strict();
const resultRevisionSchema = z.object({ schemaVersion: z.literal("roost-result-revision-v1"), id,
  executionId: id, hostId: id, attempt: z.number().int().positive(), checkpointVersion: z.number().int().positive(),
  observedAt: timestamp, branch, commit, workingTree: z.literal("clean") }).strict();
const referenceTuple = z.tuple([id, z.string().min(1).max(120)]);
const contextSchema = z.object({ company: z.array(referenceTuple).max(40), product: z.array(referenceTuple).max(40),
  technical: z.array(referenceTuple).max(40) }).strict();
const originalReadySchema = z.object({ pinId: id, revision: hash, compositionSeal: hash,
  riskAdmissionSeal: hash, riskAdmissionCommit: commit }).strict();
const sourceSelectionSchema = z.object({ contractDigest: hash, readPaths: z.array(relative).min(1).max(100),
  // Each tuple retains the original path, startLine and endLine without repeated keys.
  readFragments: z.array(z.tuple([relative, z.number().int().positive(), z.number().int().positive()])
    .refine(row => row[2] >= row[1])).max(100), context: contextSchema, originalReady: originalReadySchema }).strict();
const evidenceBodySchema = z.object({ schemaVersion: z.literal("roost-code-reviewer-prior-audit-v1"),
  identity: z.object({ executionId: id, taskId: id, workspaceId: id, applicationId: id, hostId: id, auditorAgentId: id }).strict(),
  completedAt: timestamp, finalResponse: z.string().min(1).max(10000),
  readOnlyAudit: auditReceiptSchema, managedAdmission: managedSchema, ownedTreeReceipt: ownedSchema,
  resultRevision: resultRevisionSchema, sourceSelection: sourceSelectionSchema,
  authority: z.literal(false) }).strict();

// Auditor receipt digests use the original boundary's ordered body, not a
// reserialized JSONB key order or a digest of a mutable review projection.
function originalReceiptDigest(receipt) {
  const body = Object.fromEntries(["schemaVersion", "verdict", "evidenceDigest", "preTree", "postTree",
    "processState", "dockerState", "gitState", "nativeTools", "processCoverage", "dockerCoverage"].map(key => [key, receipt[key]]));
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
function consistent(e) {
  const r = e.readOnlyAudit, result = e.resultRevision, i = e.identity, job = e.ownedTreeReceipt;
  return r.preTree === r.postTree && originalReceiptDigest(r) === r.digest
    && result.executionId === i.executionId && result.hostId === i.hostId && job.attempt === i.executionId
    && result.attempt > 0 && result.commit === e.sourceSelection.originalReady.riskAdmissionCommit
    && job.sourceSha256 === e.managedAdmission.jobSourceDigest
    && Date.parse(result.observedAt) <= Date.parse(e.completedAt)
    && Buffer.byteLength(e.finalResponse, "utf8") <= 10000 && e.finalResponse.trim().length > 0;
}
export const codeReviewerPriorAuditEvidenceSchema = evidenceBodySchema.extend({ digest: hash }).strict().superRefine((e, context) => {
  const { digest: seal, ...body } = e;
  if (!consistent(e) || seal !== digest(body) || Buffer.byteLength(JSON.stringify(e), "utf8") > 16384)
    context.addIssue({ code: z.ZodIssueCode.custom, message: "code_reviewer_prior_audit_invalid" });
});

export function verifiedCodeReviewerPriorAudit(prior, { claimed, contract, repositoryEvidence }) {
  try {
    const inspection = contract?.nativeBoundary?.inspectReadOnly;
    const reference = codeReviewerPriorAuditReferenceSchema.parse(inspection?.priorAudit);
    const previous = prior?.metadata?.executionContract, ready = prior?.metadata?.readyContextPin;
    const readOnlyAudit = auditReceiptSchema.parse(prior?.verification?.readOnlyAudit);
    const managedAdmission = managedSchema.parse(prior?.verification?.managedAdmission);
    const ownedTreeReceipt = ownedSchema.parse(prior?.verification?.ownedTreeReceipt);
    const resultRevision = resultRevisionSchema.parse(prior?.metadata?.resultRevision);
    const readonly = c => c?.nativeBoundary?.profile === "inspect-readonly" && c.access?.sandbox === "read-only"
      && c.access.externalWrites === false && same(c.access.tools, ["repository_read"])
      && same(c.access.permissions, ["repository_read"]) && c.nativeBoundary.runtime?.required === false
      && same(c.nativeBoundary.runtime.ports, []);
    if (inspection?.kind !== "code-reviewer" || !readonly(contract) || !readonly(previous)
      || !id.safeParse(claimed?.id).success || !id.safeParse(contract.assignment?.agentId).success
      || previous.nativeBoundary.inspectReadOnly?.kind !== "auditor"
      || previous.modelSelection?.schemaVersion !== "roost-managed-hermes-backend-v1"
      || previous.modelSelection.backend !== "codex_responses"
      || prior.id !== reference.executionId || prior.id === claimed.id || prior.status !== "completed"
      || prior.workspaceId !== claimed.workspaceId || prior.applicationId !== claimed.applicationId
      || prior.agentHostId !== claimed.agentHostId || prior.taskId === claimed.taskId
      || previous.assignment?.agentId === contract.assignment?.agentId
      || previous.assignment?.agentId !== previous.taskRoles?.executor?.id
      || !prior.completedAt || prior.contextInvalidatedAt !== null || prior.errorState !== null
      || prior.leaseToken !== null || prior.leaseExpiresAt !== null
      || !Array.isArray(prior.changedFiles) || prior.changedFiles.length !== 0
      || readOnlyAudit.digest !== reference.receiptDigest || readOnlyAudit.preTree !== repositoryEvidence?.tree
      || resultRevision.commit !== repositoryEvidence?.head || resultRevision.commit !== inspection.reviewedCommit
      || resultRevision.branch !== repositoryEvidence?.branch || resultRevision.branch !== previous.singleTask?.branch
      || resultRevision.branch !== contract.singleTask?.branch || resultRevision.attempt !== prior.attempt
      || resultRevision.checkpointVersion !== prior.checkpointVersion) invalid();
    const sourceSelection = { contractDigest: digest(previous), readPaths: previous.nativeBoundary.readPaths,
      readFragments: (previous.nativeBoundary.readFragments ?? []).map(row => [row.path, row.startLine, row.endLine]),
      context: Object.fromEntries(["company", "product", "technical"].map(key => [key,
        (previous.context?.[key] ?? []).map(row => [row.id, row.revision])])),
      originalReady: originalReadySchema.parse(ready) };
    const body = evidenceBodySchema.parse({ schemaVersion: "roost-code-reviewer-prior-audit-v1",
      identity: { executionId: prior.id, taskId: prior.taskId, workspaceId: prior.workspaceId,
        applicationId: prior.applicationId, hostId: prior.agentHostId, auditorAgentId: previous.assignment.agentId },
      completedAt: prior.completedAt, finalResponse: prior.finalResponse, readOnlyAudit, managedAdmission, ownedTreeReceipt,
      resultRevision, sourceSelection, authority: false });
    const evidence = codeReviewerPriorAuditEvidenceSchema.parse({ ...body, digest: digest(body) });
    // Freeze a detached copy; later callers cannot mutate the original API row
    // or silently change the evidence already admitted into the input envelope.
    const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
    return freeze(evidence);
  } catch { invalid(); }
}
