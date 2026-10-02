import { nativeDigest } from "./agent-host-native-footprint.mjs";

const hash = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function invalid() {
  throw Object.assign(new Error("prior_readonly_audit_invalid"), {
    contextAdmission: true, retryable: false,
    publicMessage: "The pinned prior read-only audit could not be verified. No model was started.",
    details: { reason: "prior_readonly_audit_invalid" }
  });
}

export function verifiedPriorReadOnlyAudit(prior, { claimed, contract, repositoryEvidence }) {
  const reference = contract?.nativeBoundary?.inspectReadOnly;
  const previous = prior?.metadata?.executionContract;
  const revision = prior?.metadata?.resultRevision;
  const receipt = prior?.verification?.readOnlyAudit;
  if (reference?.kind !== "verifier" || !hash.test(reference.verifiedEvidenceDigest ?? "")
      || prior?.id !== reference.verifiedExecutionId || prior?.status !== "completed"
      || prior?.workspaceId !== claimed.workspaceId || prior?.applicationId !== claimed.applicationId
      || prior?.agentHostId !== claimed.agentHostId || prior?.taskId === claimed.taskId
      || !prior.completedAt || prior.contextInvalidatedAt || prior.errorState
      || !Array.isArray(prior.changedFiles) || prior.changedFiles.length
      || previous?.nativeBoundary?.profile !== "inspect-readonly"
      || previous.nativeBoundary.inspectReadOnly?.kind !== "auditor"
      || !same(previous.nativeBoundary.readPaths, contract.nativeBoundary.readPaths)
      || !same(previous.access?.tools, ["repository_read"])
      || !same(previous.access?.permissions, ["repository_read"])
      || previous.assignment?.agentId === contract.assignment?.agentId
      || !previous.assignment?.agentId
      || receipt?.schemaVersion !== "roost-readonly-audit-v1" || receipt.verdict !== "verified"
      || receipt.evidenceDigest !== reference.verifiedEvidenceDigest
      || !hash.test(receipt.digest ?? "") || !hash.test(receipt.preTree ?? "")
      || receipt.preTree !== receipt.postTree || receipt.preTree !== repositoryEvidence?.tree
      || receipt.gitState !== "unchanged" || receipt.processState !== "unchanged"
      || receipt.dockerState !== "unchanged" || !same(receipt.nativeTools, [])
      || revision?.schemaVersion !== "roost-result-revision-v1"
      || revision.executionId !== prior.id || revision.hostId !== claimed.agentHostId
      || !commit.test(revision.commit ?? "") || revision.commit !== repositoryEvidence.head
      || revision.branch !== repositoryEvidence.branch || revision.workingTree !== "clean"
      || typeof prior.finalResponse !== "string" || !prior.finalResponse.trim()
      || Buffer.byteLength(prior.finalResponse, "utf8") > 10000) invalid();
  const evidence = {
    schemaVersion: "roost-prior-readonly-audit-v1", executionId: prior.id, taskId: prior.taskId,
    auditorAgentId: previous.assignment.agentId, completedAt: prior.completedAt,
    branch: revision.branch, commit: revision.commit,
    receipt: { evidenceDigest: receipt.evidenceDigest, digest: receipt.digest,
      preTree: receipt.preTree, postTree: receipt.postTree, verdict: receipt.verdict,
      gitState: receipt.gitState, processState: receipt.processState, dockerState: receipt.dockerState,
      nativeTools: [], comparisonScope: "same_repository_and_per_execution_state" },
    finalResponse: prior.finalResponse
  };
  return Object.freeze({ ...evidence, digest: nativeDigest(evidence) });
}
