// Classify an existing initial task branch only. This observation grants no
// dispatch authority and never restores the consumed predecessor attempt.
import path from "node:path";
import { nativeArtifactSnapshot, readDurableNativeReview } from "./agent-host-native-review.mjs";
import { captureNativeFootprint, nativeDigest } from "./agent-host-native-footprint.mjs";
import { qualifyNativeReconciliation } from "./agent-host-native-reconciliation.mjs";
import { recoveryError } from "./agent-host-recovery.mjs";

const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value ?? "");
const deny = () => { throw recoveryError("repository_mismatch"); };

// firstWrite is the current authenticated requestFirstWriteAdmission result.
// The live packet/risk/Ready/provider/lease checks remain with the caller.
export async function observeUnchangedTaskBranch({ api, claimed, firstWrite, stateDirectory, repositoryPath, expected }) {
  try {
    const previousId = claimed?.metadata?.predecessorExecutionId;
    if (!uuid(previousId) || previousId === claimed.id || claimed.attempt !== 1 || claimed.checkpoint?.stage !== "claimed"
        || !uuid(claimed.leaseToken)
        || !uuid(claimed.agentHostId) || !/^[a-f0-9]{40}$/.test(expected?.head ?? "")
        || expected.branch !== `codex/task-${claimed.taskId}`
        || firstWrite?.schemaVersion !== "roost-first-write-admission-v1"
        || firstWrite.executionId !== claimed.id || ["workspaceId", "taskId", "applicationId"].some(k => firstWrite[k] !== claimed[k])
        || firstWrite.branch !== expected.branch || firstWrite.baselineCommit !== expected.head
        || firstWrite.operations?.localCommit !== true || firstWrite.continuation || firstWrite.existingCommitVerification
        || !uuid(firstWrite.decisionId) || !Number.isFinite(Date.parse(firstWrite.issuedAt))
        || !Number.isFinite(Date.parse(firstWrite.expiresAt))
        || Date.parse(firstWrite.issuedAt) > Date.now() || Date.parse(firstWrite.expiresAt) <= Date.now()) deny();
    // The Worker cannot read arbitrary executions. The server selects only
    // this lease's recorded predecessor; no predecessor id is supplied here.
    const previous = await api(`/v1/agent-runtime/executions/${claimed.id}/actions/prior-coding-refusal`, {
      method: "POST", body: JSON.stringify({ leaseToken: claimed.leaseToken })
    });
    if (previous?.id !== previousId || previous.status !== "failed" || previous.attempt !== 1
        || ["workspaceId", "taskId", "applicationId", "agentHostId"].some(k => previous[k] !== claimed[k])
        || previous.leaseToken !== null || previous.leaseExpiresAt !== null || previous.contextInvalidatedAt !== null
        || !Number.isFinite(Date.parse(previous.completedAt)) || Date.parse(previous.completedAt) > Date.now()
        || previous.finalResponse !== null || !Array.isArray(previous.changedFiles) || previous.changedFiles.length
        || previous.metadata?.resultRevision != null || previous.errorState?.code !== "agent_native_review_blocked"
        || previous.metadata?.executionContract?.nativeBoundary?.profile !== "coding-local"
        || previous.metadata.executionContract.singleTask?.branch !== expected.branch
        || previous.metadata?.readyContextPin?.riskAdmissionCommit !== expected.head
        || previous.checkpoint?.headCommit !== expected.head || previous.checkpoint.branch !== expected.branch) deny();
    const directory = path.join(stateDirectory, `native-review-${previousId}`);
    const review = readDurableNativeReview(directory), p = review.payload, b = p.binding;
    if (b?.identity?.executionId !== previousId || b.identity.attempt !== 1
        || ["workspaceId", "taskId", "applicationId"].some(k => b.identity[k] !== claimed[k])
        || b.fixture || p.stage !== "final" || p.verification?.status !== "REFUSED"
        || p.verification.reason !== "coding_tests_unproven" || p.public?.verdict !== "verification_blocked"
        || !Array.isArray(p.privateChanges) || p.privateChanges.length
        || b.preFootprintDigest !== p.postFootprintDigest
        || previous.errorState.details?.nativeReviewReceiptDigest !== review.digest
        || nativeDigest(previous.errorState.details?.nativeReviewReceipt) !== nativeDigest(p.public)
        || b.ready !== previous.metadata.readyContextPin.revision) deny();
    // A complete signed reconciliation is mandatory. It rechecks the genuine
    // ready/resume/closed Job chain and the unchanged canonical workspace.
    const qualification = qualifyNativeReconciliation(directory, undefined, { root: repositoryPath, expected });
    if (qualification.completed !== true || qualification.eligible !== false || qualification.reviewDigest !== review.digest) deny();
    // Complete reconciliation releases fences only; the old dispatch remains
    // spent. Check the retained artifact even on the completed journal path.
    const spent = nativeArtifactSnapshot(path.join(stateDirectory, b.spent.name));
    if (spent.identity !== b.spent.identity || spent.digest !== b.spent.digest
        || spent.record.state !== "dispatch_reserved" || spent.record.attemptDigest !== b.spent.record.attemptDigest) deny();
    const footprint = captureNativeFootprint(repositoryPath, expected);
    if (footprint.dirty.length || footprint.rootIdentity !== b.rootIdentity || footprint.digest !== p.postFootprintDigest
        || readDurableNativeReview(directory).digest !== review.digest) deny();
    return Object.freeze({ predecessorExecutionId: previousId, reviewDigest: review.digest, workspaceDigest: footprint.digest });
  } catch { deny(); }
}
