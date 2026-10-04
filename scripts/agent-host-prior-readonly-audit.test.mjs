import test from "node:test";
import assert from "node:assert/strict";
import { verifiedPriorReadOnlyAudit } from "./lib/agent-host-prior-readonly-audit.mjs";

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const expected = () => ({
  claimed: { id: id(1), taskId: id(2), workspaceId: id(3), applicationId: id(4), agentHostId: id(5) },
  contract: { assignment: { agentId: id(6) }, nativeBoundary: { profile: "inspect-readonly",
    readPaths: ["scripts/guard.mjs", "scripts/guard.test.mjs"], inspectReadOnly: {
      kind: "verifier", verifiedExecutionId: id(7), verifiedEvidenceDigest: "a".repeat(64) } } },
  repositoryEvidence: { tree: "b".repeat(64), head: "c".repeat(40), branch: "codex/task" }
});
function prior(scope = expected()) {
  return { id: id(7), taskId: id(8), workspaceId: scope.claimed.workspaceId,
    applicationId: scope.claimed.applicationId, agentHostId: scope.claimed.agentHostId,
    status: "completed", completedAt: "2026-09-27T14:08:23.057Z", contextInvalidatedAt: null,
    errorState: null, changedFiles: [], finalResponse: "The resolver accepts parent traversal.",
    metadata: { executionContract: { assignment: { agentId: id(9) }, nativeBoundary: {
      profile: "inspect-readonly", inspectReadOnly: { kind: "auditor" },
      readPaths: [...scope.contract.nativeBoundary.readPaths] },
      access: { tools: ["repository_read"], permissions: ["repository_read"] } },
      resultRevision: { schemaVersion: "roost-result-revision-v1", executionId: id(7),
        hostId: scope.claimed.agentHostId, commit: scope.repositoryEvidence.head,
        branch: scope.repositoryEvidence.branch, workingTree: "clean" } },
    verification: { readOnlyAudit: { schemaVersion: "roost-readonly-audit-v1", verdict: "verified",
      evidenceDigest: "a".repeat(64), digest: "d".repeat(64), preTree: scope.repositoryEvidence.tree,
      postTree: scope.repositoryEvidence.tree, gitState: "unchanged", processState: "unchanged",
      dockerState: "unchanged", nativeTools: [] } } };
}

test("the verifier receives the exact completed, independent auditor receipt as bounded evidence", () => {
  const scope = expected(), evidence = verifiedPriorReadOnlyAudit(prior(scope), scope);
  assert.equal(evidence.executionId, scope.contract.nativeBoundary.inspectReadOnly.verifiedExecutionId);
  assert.equal(evidence.receipt.evidenceDigest, scope.contract.nativeBoundary.inspectReadOnly.verifiedEvidenceDigest);
  assert.equal(evidence.commit, scope.repositoryEvidence.head);
  assert.match(evidence.finalResponse, /parent traversal/);
  assert.match(evidence.digest, /^[a-f0-9]{64}$/);
  assert.equal(evidence.receipt.gitState, "unchanged");
  assert.equal(evidence.receipt.processState, "unchanged");
  assert.equal(evidence.receipt.dockerState, "unchanged");
  assert.deepEqual(evidence.receipt.nativeTools, []);
  assert.equal(evidence.receipt.comparisonScope, "same_repository_and_per_execution_state");
});

test('verifier must retain the exact bounded fragment selection from its qualified auditor', () => {
  const scope = expected(); scope.contract.nativeBoundary.readFragments = [{ path: 'docs/accepted.md', startLine: 20, endLine: 25 }];
  const candidate = prior(scope);
  candidate.metadata.executionContract.nativeBoundary.readFragments = structuredClone(scope.contract.nativeBoundary.readFragments);
  assert.equal(verifiedPriorReadOnlyAudit(candidate, scope).executionId, candidate.id);
  candidate.metadata.executionContract.nativeBoundary.readFragments[0].endLine = 26;
  assert.throws(() => verifiedPriorReadOnlyAudit(candidate, scope), /prior_readonly_audit_invalid/);
});

for (const [label, alter] of Object.entries({
  unfinished: p => { p.status = "running"; },
  otherHost: p => { p.agentHostId = id(99); },
  sameActor: (p, s) => { p.metadata.executionContract.assignment.agentId = s.contract.assignment.agentId; },
  wrongReceipt: p => { p.verification.readOnlyAudit.evidenceDigest = "f".repeat(64); },
  changedTree: p => { p.verification.readOnlyAudit.postTree = "f".repeat(64); },
  changedProcesses: p => { p.verification.readOnlyAudit.processState = "changed"; },
  changedDocker: p => { p.verification.readOnlyAudit.dockerState = "changed"; },
  changedGit: p => { p.verification.readOnlyAudit.gitState = "changed"; },
  nativeTools: p => { p.verification.readOnlyAudit.nativeTools = ["terminal"]; },
  changedFiles: p => { p.changedFiles = ["scripts/guard.mjs"]; },
  wrongFiles: p => { p.metadata.executionContract.nativeBoundary.readPaths = ["other.mjs"]; },
  wrongCommit: p => { p.metadata.resultRevision.commit = "f".repeat(40); },
  oversizedOutput: p => { p.finalResponse = "x".repeat(10001); }
})) test(`prior auditor authority fails closed: ${label}`, () => {
  const scope = expected(), candidate = prior(scope); alter(candidate, scope);
  assert.throws(() => verifiedPriorReadOnlyAudit(candidate, scope), /prior_readonly_audit_invalid/);
});
