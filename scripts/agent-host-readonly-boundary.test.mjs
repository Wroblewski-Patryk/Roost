import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import { randomUUID } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { nativeFixture } from "./fixtures/hermes-native.mjs";
import { pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { collectReadOnlyRepositoryEvidence, qualifyHermesReadOnlyTools, consumeReadOnlyBoundary,
  authorizeReadOnlyResume, completeReadOnlyBoundary } from "./lib/agent-host-readonly-boundary.mjs";
import { prepareProviderInput, abandonProviderNativeBoundary, assertProviderStartup,
  assertProviderReadOnlyBoundary } from "./lib/agent-host-provider-input.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";

const windows = { skip: process.platform !== "win32", timeout: 60000 };
const blocked = reason => error => {
  assert.equal(error.message, "readonly_boundary_unproven");
  assert.equal(error.protocolAdmission, true);
  assert.deepEqual(error.details, { reason });
  assert.equal(JSON.stringify(error.details).includes("SYNTHETIC_PRIVATE"), false);
  return true;
};

async function fixture(t, scenario = "current") {
  const x = await nativeFixture(t, { prepare: false });
  for (const relative of ["toolsets.py", "model_tools.py", "cli.py", "agent/agent_init.py", "agent/coding_context.py", "hermes_cli/oneshot.py"]) {
    const file = path.join(x.install, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "# closed fixture source\n");
  }
  let tcpCalls = 0, dockerCalls = 0;
  const original = childProcess.execFileSync;
  const timeout = () => Object.assign(Error("SYNTHETIC_PRIVATE output and path"), { code: "ETIMEDOUT" });
  childProcess.execFileSync = (command, args, options) => {
    if (command === "powershell" && args?.at(-1)?.startsWith("Get-NetTCPConnection -State Listen")) {
      tcpCalls += 1;
      if (scenario === "tcp_timeout") throw timeout();
      return scenario === "process_changed" && tcpCalls > 1 ? "changed_fixture_listener\n" : "fixture_listener\n";
    }
    if (command === "docker" && args?.[0] === "ps") {
      dockerCalls += 1;
      if (scenario === "docker_timeout") throw timeout();
      // Simulate a responding observer beyond the former ten-second bound;
      // no real sleep or model call is needed to check the command deadline.
      if (scenario === "slow_docker" && options.timeout < 12000) throw timeout();
      return scenario === "docker_changed" && dockerCalls > 1 ? "changed_fixture_container\n" : "";
    }
    if (options?.cwd === x.install && command === "git") {
      if (args.includes("rev-parse")) {
        if (scenario === "source_pin_timeout") throw timeout();
        return scenario === "source_commit_changed" ? "b".repeat(40) : x.provider.commit;
      }
      if (scenario === "source_changed") throw Object.assign(Error("SYNTHETIC_PRIVATE git output"), { status: 1 });
      return "";
    }
    if (command === path.join(x.install, "venv", "Scripts", "python.exe")) {
      if (scenario === "qualification_timeout") throw timeout();
      if (scenario === "qualification_unavailable") throw Error("SYNTHETIC_PRIVATE Python output");
      if (scenario === "seal_repository_changed") fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "BASE\n");
      return scenario === "qualification_output" ? "SYNTHETIC_PRIVATE unexpected output" : "[[], []]\n";
    }
    const output = original(command, args, options);
    if (scenario === "repository_changed" && options?.cwd === x.repositoryPath && args?.includes("ls-files"))
      fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "BASE\n");
    return output;
  };
  syncBuiltinESMExports();
  return { ...x, collect: () => collectReadOnlyRepositoryEvidence({ repositoryPath: x.repositoryPath,
    expected: x.options.nativeBoundaryOptions.expected, paths: ["editable.txt"] }),
    restore() { childProcess.execFileSync = original; syncBuiltinESMExports(); } };
}

test("read-only collection returns bounded evidence from an unchanged physical repository", windows, async t => {
  const x = await fixture(t);
  try { const evidence = x.collect(); assert.equal(evidence.head, x.options.currentCommit); assert.equal(evidence.files[0].content, "base\n"); }
  finally { x.restore(); }
});

test("a slow responding Docker observer can prove an unchanged snapshot while a timeout remains denied", windows, async t => {
  const slow = await fixture(t, "slow_docker");
  try { assert.equal(slow.collect().files[0].content, "base\n"); }
  finally { slow.restore(); }
  const stalled = await fixture(t, "docker_timeout");
  try { assert.throws(stalled.collect, blocked("docker_observation_timeout")); }
  finally { stalled.restore(); }
});

for (const [scenario, reason] of Object.entries({ tcp_timeout: "tcp_observation_timeout", docker_timeout: "docker_observation_timeout",
  process_changed: "process_changed", docker_changed: "docker_changed", repository_changed: "repository_changed" })) {
  test(`collection preserves ${reason} instead of replacing it with unproven`, windows, async t => {
    const x = await fixture(t, scenario);
    try { assert.throws(x.collect, blocked(reason)); }
    finally { x.restore(); }
  });
}

for (const [scenario, reason] of Object.entries({ source_pin_timeout: "tool_source_pin_timeout", source_commit_changed: "tool_source_commit_changed",
  source_changed: "tool_source_changed", qualification_timeout: "tool_qualification_timeout",
  qualification_unavailable: "tool_qualification_unavailable", qualification_output: "tool_qualification_output_invalid" })) {
  test(`tool qualification reports ${reason} without raw command output`, windows, async t => {
    const x = await fixture(t, scenario);
    try { assert.throws(() => qualifyHermesReadOnlyTools(x.provider, x.options.startupEnvironment), blocked(reason)); }
    finally { x.restore(); }
  });
}

for (const [scenario, reason] of Object.entries({ qualification_timeout: "tool_qualification_timeout", seal_repository_changed: "repository_changed" })) {
  test(`opaque read-only sealing preserves nested ${reason}`, windows, async t => {
    const x = await fixture(t, scenario), c = x.f.packet.contract;
    c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["editable.txt"], runtime: { required: false, ports: [] }, inspectReadOnly: { kind: "auditor" } };
    c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
    x.f.packet.procedureComposition.fields.tools = ["repository_read"];
    pinReadyFixture(x.f);
    x.f.taskContext.readyAdmission.riskAdmission.commit = x.options.currentCommit;
    x.f.claimed.metadata.readyContextPin.riskAdmissionCommit = x.options.currentCommit;
    let envelope;
    try {
      const evidence = x.collect();
      assert.throws(() => { envelope = prepareProviderInput({ ...x.options, repositoryEvidence: evidence }); }, blocked(reason));
    } finally {
      if (envelope) abandonProviderNativeBoundary(envelope);
      x.restore();
    }
  });
}

function reviewedCandidate(x, mapped) {
  const baselineCommit = x.git("rev-parse", "HEAD");
  fs.writeFileSync(path.join(x.repositoryPath, "editable.txt"), "candidate\n");
  x.git("add", "editable.txt"); x.git("commit", "-m", "bounded reviewed candidate");
  const reviewedCommit = x.git("rev-parse", "HEAD"), originalPinId = randomUUID();
  x.options.currentCommit = reviewedCommit; x.options.nativeBoundaryOptions.expected.head = reviewedCommit;
  const review = { kind: "code-reviewer", verifiedTaskId: randomUUID(), verifiedExecutionId: randomUUID(),
    verifiedEvidenceDigest: "a".repeat(64), baselineCommit, reviewedCommit };
  const reviewMaterial = { task: { id: review.verifiedTaskId }, canReview: true, basisCurrent: mapped,
    approvalCommit: reviewedCommit, grantAccess: { review_decision: { status: "active" } },
    materialVersion: mapped ? "b".repeat(64) : review.verifiedEvidenceDigest,
    result: { taskId: review.verifiedTaskId, executionId: review.verifiedExecutionId,
      pin: { pinId: originalPinId, revision: "c".repeat(64) }, resultRevision: { commit: reviewedCommit },
      changedFiles: ["editable.txt"], verification: { codingTests: { passed: true },
        localCommit: { commit: reviewedCommit }, nativeReviewReceipt: { verdict: "verified_candidate" } } } };
  if (mapped) reviewMaterial.result.basisRevalidation = { id: randomUUID(), originalPinId,
    originalRevision: "c".repeat(64), originalMaterialVersion: review.verifiedEvidenceDigest,
    readyPinId: randomUUID(), readyRevision: "d".repeat(64), readyPinDigest: "e".repeat(64),
    commit: reviewedCommit, actorUserId: randomUUID(), createdAt: "2026-10-02T00:00:00.000" };
  const collect = () => collectReadOnlyRepositoryEvidence({ repositoryPath: x.repositoryPath,
    expected: x.options.nativeBoundaryOptions.expected, paths: ["editable.txt"], reviewMaterial, review });
  return { review, reviewMaterial, collect };
}
for (const mapped of [false, true]) test(`repository collector seals ${mapped ? "revalidated" : "ordinary"} review material with exact native diff`, windows, async t => {
  const x = await fixture(t);
  try {
    const candidate = reviewedCandidate(x, mapped), evidence = candidate.collect();
    assert.equal(evidence.reviewed.materialVersion, candidate.reviewMaterial.materialVersion);
    assert.ok(evidence.reviewed.diff.includes("+candidate"));
    if (mapped) {
      assert.equal(evidence.reviewed.basisCurrent, true);
      assert.equal(evidence.reviewed.originalMaterialVersion, candidate.review.verifiedEvidenceDigest);
      assert.deepEqual(evidence.reviewed.basisRevalidation, candidate.reviewMaterial.result.basisRevalidation);
      assert.equal(Object.isFrozen(evidence.reviewed.basisRevalidation), true);
    } else { assert.equal(evidence.reviewed.basisRevalidation, undefined); assert.equal(evidence.reviewed.originalMaterialVersion, undefined); }
  } finally { x.restore(); }
});
test("repository collector rejects a stale mapped basis before model input", windows, async t => {
  const x = await fixture(t);
  try {
    const candidate = reviewedCandidate(x, true); candidate.reviewMaterial.basisCurrent = false;
    assert.throws(candidate.collect, blocked("review_material_mismatch"));
  } finally { x.restore(); }
});
test("revalidated code-reviewer audit binds sealed current material after a real owned Windows Job", windows, async t => {
  const x = await fixture(t); let job;
  try {
    const candidate = reviewedCandidate(x, true), repositoryEvidence = candidate.collect(), c = x.f.packet.contract;
    c.nativeBoundary = { profile: "inspect-readonly", readPaths: ["editable.txt"], runtime: { required: false, ports: [] },
      inspectReadOnly: candidate.review };
    c.access = { ...c.access, tools: ["repository_read"], permissions: ["repository_read"], sandbox: "read-only" };
    x.f.packet.procedureComposition.fields.tools = ["repository_read"];
    pinReadyFixture(x.f);
    x.f.taskContext.readyAdmission.riskAdmission.commit = x.options.currentCommit;
    x.f.claimed.metadata.readyContextPin.riskAdmissionCommit = x.options.currentCommit;
    const envelope = prepareProviderInput({ ...x.options, repositoryEvidence });
    const checked = assertProviderStartup({ envelope, provider: x.provider, repositoryPath: x.repositoryPath,
      startupEnvironment: x.options.startupEnvironment });
    const receipt = assertProviderReadOnlyBoundary(envelope);
    const proof = consumeReadOnlyBoundary(receipt, { cwd: x.repositoryPath, environment: x.options.startupEnvironment,
      attempt: envelope.identity.executionId, budgetReceipt: checked.budgetReceipt });
    const launcher = await buildWindowsJobLauncher(x.root);
    job = await startWindowsJob(launcher, { executable: process.execPath, argv: ["-e", "process.exit(0)"], cwd: x.repositoryPath,
      environment: x.options.startupEnvironment, input: "", durationMs: 5000, attempt: envelope.identity.executionId,
      confirmResume: assignment => authorizeReadOnlyResume(proof, assignment, { kind: "owned_readonly_fixture" }) });
    const ownedTreeReceipt = await job.completion;
    const audit = completeReadOnlyBoundary(proof, { ownedTreeReceipt });
    assert.equal(audit.verdict, "verified");
    assert.equal(audit.verifiedEvidenceDigest, candidate.reviewMaterial.materialVersion);
    assert.notEqual(audit.verifiedEvidenceDigest, candidate.review.verifiedEvidenceDigest);
    assert.equal(audit.verifiedExecutionId, candidate.review.verifiedExecutionId);
    assert.equal(audit.reviewedCommit, candidate.review.reviewedCommit);
    assert.equal(audit.diffDigest, repositoryEvidence.reviewed.diffDigest);
  } finally {
    if (job) { job.stop(); await job.completion.catch(() => {}); }
    x.restore();
  }
});
