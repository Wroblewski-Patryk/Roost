import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validPacketFixture,pinReadyFixture} from './fixtures/execution-packet.mjs';
import {prepareProviderInput,providerInputSchema,measureProviderInput} from './lib/agent-host-provider-input.mjs';
import {verifiedCodeReviewerPriorAudit} from './lib/agent-host-code-reviewer-prior-audit.mjs';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const h = n => String(n).repeat(64), head = "a".repeat(40);
function fixture() {
  const access = { sandbox: "read-only", externalWrites: false, tools: ["repository_read"], permissions: ["repository_read"] };
  const previous = { access, assignment: { agentId: uuid(6) }, taskRoles: { executor: { id: uuid(6) } },
    modelSelection: { schemaVersion: "roost-managed-hermes-backend-v1", backend: "codex_responses" },
    singleTask: { branch: "codex/task-example" }, context: { company: [{ id: uuid(7), revision: "v1" }], product: [], technical: [] },
    nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" },
      readPaths: ["docs/release.md"], readFragments: [{ path: "src/main.ts", startLine: 1, endLine: 3 }] } };
  const receipt = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: h(1),
    preTree: h(2), postTree: h(2), processState: "unchanged", dockerState: "unchanged", gitState: "unchanged",
    nativeTools: [], processCoverage: "listening_tcp_plus_owned_job_zero_processes", dockerCoverage: "running_container_list" };
  receipt.digest = createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
  const prior = { id: uuid(1), taskId: uuid(2), workspaceId: uuid(3), applicationId: uuid(4), agentHostId: uuid(5),
    status: "completed", attempt: 1, checkpointVersion: 3, completedAt: "2026-01-01T00:00:00.000Z",
    contextInvalidatedAt: null, errorState: null, leaseToken: null, leaseExpiresAt: null, changedFiles: [],
    finalResponse: "CHANGES_REQUIRED\n1. Required release evidence is missing.\n2. Independent verification remains outstanding.",
    metadata: { executionContract: previous, readyContextPin: { pinId: uuid(8), revision: h(3), compositionSeal: h(4),
      riskAdmissionSeal: h(5), riskAdmissionCommit: head }, resultRevision: { schemaVersion: "roost-result-revision-v1",
      id: uuid(9), executionId: uuid(1), hostId: uuid(5), attempt: 1, checkpointVersion: 3,
      observedAt: "2026-01-01T00:00:00.000Z", branch: "codex/task-example", commit: head, workingTree: "clean" } },
    verification: { readOnlyAudit: receipt, managedAdmission: { revision: 3, decisionId: uuid(10),
      qualification: "signed_native_v1", evidenceDigest: h(6), jobSourceDigest: h(7) },
      ownedTreeReceipt: { version: "roost-windows-job-v2", attempt: uuid(1), type: "receipt", job: uuid(11),
        assignedBeforeResume: true, killOnClose: true, breakaway: false, controllerInJob: true, inheritedJob: true,
        rootPid: 100, rootCreationTime: "123456789012345678", launcherPid: 101, launcherCreationTime: "123456789012345677",
        resumed: true, rootExit: 0, activeProcesses: 0, jobClosed: true, cleanup: true, cleanupMs: 0,
        stdoutBytes: 100, stderrBytes: 0, terminationReason: "root_exit", resumeReceipt: h(8), executableDigest: h(9),
        launcherSha256: "b".repeat(64), sourceSha256: h(7) } } };
  const claimed = { id: uuid(12), taskId: uuid(13), workspaceId: uuid(3), applicationId: uuid(4), agentHostId: uuid(5) };
  const contract = { access: structuredClone(access), assignment: { agentId: uuid(14) }, singleTask: { branch: "codex/task-example" },
    nativeBoundary: { profile: "inspect-readonly", runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "code-reviewer",
      reviewedCommit: head, priorAudit: { executionId: uuid(1), receiptDigest: receipt.digest } } } };
  return { prior, options: { claimed, contract, repositoryEvidence: { head, branch: "codex/task-example", tree: h(2) } } };
}
function inputOptions(){
  const f=validPacketFixture(),x=fixture(),c=f.packet.contract;
  c.nativeBoundary={...x.options.contract.nativeBoundary,readPaths:['release.json']};
  c.nativeBoundary.inspectReadOnly={...c.nativeBoundary.inspectReadOnly,
    verifiedTaskId:uuid(50),verifiedExecutionId:uuid(51),verifiedEvidenceDigest:h(8),baselineCommit:'b'.repeat(40)};
  c.access={...c.access,...x.options.contract.access};
  f.packet.procedureComposition.fields.tools=['repository_read'];
  x.prior.workspaceId=f.claimed.workspaceId;x.prior.applicationId=f.claimed.applicationId;x.prior.agentHostId=f.claimed.agentHostId;
  x.prior.taskId=uuid(52);x.prior.metadata.resultRevision.hostId=f.claimed.agentHostId;
  x.prior.metadata.readyContextPin.pinId=uuid(80);
  x.prior.metadata.executionContract.singleTask.branch=c.singleTask.branch;
  x.prior.metadata.resultRevision.branch=c.singleTask.branch;
  const repositoryEvidence={schemaVersion:'roost-readonly-repository-evidence-v1',head,branch:c.singleTask.branch,
    files:[{path:'release.json',mimeType:'text/plain',content:'{}',sha256:h(1)}],tree:h(2),processDigest:h(3),dockerDigest:h(4),digest:h(5)};
  pinReadyFixture(f);
  const audit=verifiedCodeReviewerPriorAudit(x.prior,{claimed:f.claimed,contract:c,repositoryEvidence});
  return {fresh:{taskContext:f.taskContext,applicationContext:f.applicationContext},claimed:f.claimed,
    currentCommit:head,assertAuthority(){},repositoryEvidence,codeReviewerPriorAudit:audit};
}
test('sealed review carries full original audit evidence and preserves literal negative findings without authority',()=>{
  const o=inputOptions(),input=prepareProviderInput(o),a=input.evidence.codeReviewerPriorAudit;
  assert.equal(a.provenance,'worker.verified_code_reviewer_prior_audit');assert.equal(a.trust,'untrusted_evidence');
  assert.equal(a.value.finalResponse,o.codeReviewerPriorAudit.finalResponse);assert.match(a.value.finalResponse,/CHANGES_REQUIRED/);
  assert.equal(a.value.authority,false);assert.ok(Object.isFrozen(a.value));
  assert.equal(measureProviderInput(o).withinLimit,true);
});
test('pinned audit cannot be missing, substituted or silently mutated in model context',()=>{
  const o=inputOptions();assert.throws(()=>prepareProviderInput({...o,codeReviewerPriorAudit:undefined}));
  const input=structuredClone(prepareProviderInput(o));
  for(const mutate of [x=>x.evidence.codeReviewerPriorAudit.value.finalResponse='READY',
    x=>x.contract.nativeBoundary.inspectReadOnly.priorAudit.receiptDigest=h(9),
    x=>x.evidence.codeReviewerPriorAudit.value.authority=true,
    x=>x.evidence.codeReviewerPriorAudit.value.ownedTreeReceipt.activeProcesses=1]){
    const changed=structuredClone(input);mutate(changed);assert.equal(providerInputSchema.safeParse(changed).success,false);
  }
});
test('optional evidence does not attach to unpinned or unrelated reviewer contract',()=>{
  const o=inputOptions();delete o.fresh.taskContext.executionPacket.contract.nativeBoundary.inspectReadOnly.priorAudit;
  assert.throws(()=>prepareProviderInput(o));
});
