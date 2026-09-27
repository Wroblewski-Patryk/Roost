import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { captureNativeFootprint, nativeDigest, nativeRelative } from "./agent-host-native-footprint.mjs";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { acquireApplicationLease, assertApplicationLease, releaseApplicationLease } from "./agent-host-application-lease.mjs";
import { isHermesStartupReceipt } from "./agent-host-hermes-startup.mjs";
import { assertHermesBudgetReceipt, hermesBudgetReceiptMatches } from "./agent-host-hermes-budget.mjs";
import { isWindowsJobCleanupReceipt } from "./agent-host-windows-job.mjs";
import { guardHostContent } from "./agent-host-redaction.mjs";

const sealed = new WeakMap(), receipts = new WeakMap();
const hex = value => createHash("sha256").update(value).digest("hex");
const fail = (reason = "unproven") => { throw Object.assign(new Error("readonly_boundary_unproven"), { protocolAdmission: true,
  retryable: false, details: { reason }, publicMessage: "Read-only inspection changed or cannot be proven; reconcile before another attempt." }); };
const frozen = value => { if (value && typeof value === "object") { Object.values(value).forEach(frozen); Object.freeze(value); } return value; };
const git = (root, args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...args], {
  cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 65536,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" }, encoding: "utf8" }).trim();
const hermesSources = ["toolsets.py", "model_tools.py", "cli.py", "agent/agent_init.py", "agent/coding_context.py", "hermes_cli/oneshot.py"];
function hermesToolSource(provider) {
  const root = path.dirname(path.dirname(path.dirname(provider.executablePath)));
  if (git(root, ["rev-parse", "HEAD"]) !== provider.commit) fail();
  execFileSync("git", ["diff", "--quiet", "HEAD", "--", ...hermesSources], {
    cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 4096 });
  return { root, sourceDigest: nativeDigest(hermesSources.map(relative => {
    const file = path.join(root, relative), stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 256 * 1024) fail();
    return [relative, hex(readFileSync(file))];
  })) };
}
export function qualifyHermesReadOnlyTools(provider, environment) {
  try {
    const { root, sourceDigest } = hermesToolSource(provider);
    const script = `import sys,json;sys.path.insert(0,${JSON.stringify(root)});from toolsets import resolve_multiple_toolsets;from model_tools import get_tool_definitions;print(json.dumps([resolve_multiple_toolsets(['bot_room']),get_tool_definitions(enabled_toolsets=['bot_room'],quiet_mode=True)]))`;
    const output = execFileSync(path.join(root, "venv", "Scripts", "python.exe"), ["-I", "-B", "-c", script], {
      cwd: root, env: environment, windowsHide: true, shell: false, timeout: 30000, maxBuffer: 4096, encoding: "utf8" });
    if (output.trim() !== "[[], []]") fail();
    return Object.freeze({ sourceDigest, nativeTools: [] });
  } catch { fail(); }
}

function state(root, expected) {
  const footprint = captureNativeFootprint(root, expected);
  // These are observations, not commands exposed to Hermes. A missing observer
  // cannot be reported as unchanged.
  const listening = process.platform === "win32"
    ? execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
      "Get-NetTCPConnection -State Listen | Sort-Object LocalAddress,LocalPort,OwningProcess | ForEach-Object { '{0}|{1}|{2}' -f $_.LocalAddress,$_.LocalPort,$_.OwningProcess }"],
      { windowsHide: true, timeout: 10000, maxBuffer: 262144, encoding: "utf8" }) : "non_windows_test";
  const docker = execFileSync("docker", ["ps", "--no-trunc", "--format", "{{.ID}}|{{.Image}}|{{.Status}}|{{.Ports}}"],
    { windowsHide: true, shell: false, timeout: 10000, maxBuffer: 262144, encoding: "utf8" });
  return { footprint, processDigest: hex(listening), dockerDigest: hex(docker) };
}

export function collectReadOnlyRepositoryEvidence({ repositoryPath, expected, paths, secrets = [], reviewMaterial = null, review = null }) {
  try {
    if (!Array.isArray(paths) || !paths.length || paths.length > 32 || new Set(paths).size !== paths.length) fail();
    const root = realpathSync.native(repositoryPath), pre = state(root, expected);
    if (pre.footprint.dirty.length) fail();
    const files = []; let total = 0;
    for (const relative of paths) {
      nativeRelative(relative);
      const file = path.join(root, relative), stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 32768 || realpathSync.native(file) !== file) fail();
      if (git(root, ["ls-files", "--error-unmatch", "--", relative]) !== relative) fail();
      const bytes = readFileSync(file);
      if (bytes.length !== stat.size || (total += bytes.length) > 65536) fail();
      const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const inspected = guardHostContent({ relative, content }, "required", secrets);
      if (inspected.redacted || inspected.blocked || inspected.value?.content !== content
          || inspected.value?.relative !== relative) fail();
      files.push({ path: relative, mimeType: "text/plain", content: inspected.value.content, sha256: hex(bytes) });
    }
    const post = state(root, expected);
    if (nativeDigest(pre) !== nativeDigest(post)) fail();
    let reviewed = null;
    if (review) {
      if (!reviewMaterial || review.reviewedCommit !== expected.head
          || reviewMaterial.materialVersion !== review.verifiedEvidenceDigest
          || reviewMaterial.result?.executionId !== review.verifiedExecutionId
          || reviewMaterial.result?.resultRevision?.commit !== review.reviewedCommit
          || reviewMaterial.result?.verification?.localCommit?.commit !== review.reviewedCommit
          || !reviewMaterial.result?.verification?.codingTests?.passed
          || git(root, ["rev-parse", `${review.reviewedCommit}^1`]) !== review.baselineCommit) fail();
      const diff = git(root, ["diff", "--binary", "--no-ext-diff", "--no-textconv",
        review.baselineCommit, review.reviewedCommit, "--"]);
      if (!diff || Buffer.byteLength(diff) > 32768) fail();
      const safe = guardHostContent({ diff }, "required", secrets);
      if (safe.redacted || safe.value?.diff !== diff) fail();
      reviewed = { verifiedTaskId: review.verifiedTaskId, verifiedExecutionId: review.verifiedExecutionId,
        materialVersion: reviewMaterial.materialVersion, baselineCommit: review.baselineCommit,
        reviewedCommit: review.reviewedCommit, changedFiles: reviewMaterial.result.changedFiles,
        codingTests: reviewMaterial.result.verification.codingTests,
        localCommit: reviewMaterial.result.verification.localCommit,
        nativeReview: reviewMaterial.result.verification.nativeReviewReceipt,
        diff, diffDigest: hex(diff) };
      const checked = guardHostContent(reviewed, "required", secrets);
      if (checked.redacted || nativeDigest(checked.value) !== nativeDigest(reviewed)) fail();
    }
    const evidence = { schemaVersion: "roost-readonly-repository-evidence-v1", head: expected.head,
      branch: expected.branch, files, tree: pre.footprint.digest, processDigest: pre.processDigest, dockerDigest: pre.dockerDigest,
      ...(reviewed ? { reviewed } : {}) };
    return frozen({ ...evidence, digest: nativeDigest(evidence) });
  } catch { fail(); }
}

export function sealReadOnlyBoundary({ envelope, provider, repositoryPath, expected, writerLock, startupReceipt, budgetReceipt,
  repositoryEvidence, startupEnvironment }) {
  try {
    if (envelope.contract.nativeBoundary?.profile !== "inspect-readonly" || envelope.contract.access.sandbox !== "read-only"
        || startupReceipt.toolsets.length !== 1 || startupReceipt.toolsets[0] !== "bot_room" || startupReceipt.expandedTools.length
        || startupReceipt.categories.length !== 1 || startupReceipt.categories[0] !== "repository_read"
        || !isHermesStartupReceipt(startupReceipt, envelope) || !hermesBudgetReceiptMatches(budgetReceipt, envelope, startupReceipt)) fail();
    assertHermesBudgetReceipt(budgetReceipt); assertWriterLock(writerLock);
    const tools = qualifyHermesReadOnlyTools(provider, startupEnvironment);
    if (repositoryEvidence?.head !== expected.head || repositoryEvidence.branch !== expected.branch
        || repositoryEvidence.tree !== state(repositoryPath, expected).footprint.digest) fail();
    const app = acquireApplicationLease({ writerLock, applicationId: envelope.identity.applicationId,
      attempt: envelope.identity.executionId, runtime: envelope.contract.nativeBoundary.runtime });
    const proof = Object.freeze({});
    sealed.set(proof, { envelope, provider, repositoryPath, expected: structuredClone(expected), writerLock,
      startupReceipt, budgetReceipt, repositoryEvidence, app, tools, consumed: false, complete: false });
    return proof;
  } catch { fail(); }
}

export function assertReadOnlyBoundary(proof, envelope) {
  try {
    const saved = sealed.get(proof);
    if (!saved || saved.envelope !== envelope || saved.consumed || saved.complete) fail("proof_invalid");
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app); assertHermesBudgetReceipt(saved.budgetReceipt);
    if (!isHermesStartupReceipt(saved.startupReceipt, envelope)
        || saved.startupReceipt.expandedTools.length || saved.startupReceipt.toolsets.join() !== "bot_room") fail("startup_changed");
    if (hermesToolSource(saved.provider).sourceDigest !== saved.tools.sourceDigest) fail("tool_source_changed");
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree) fail("repository_changed");
    if (now.processDigest !== saved.repositoryEvidence.processDigest) fail("process_changed");
    if (now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail("docker_changed");
    const body = { schemaVersion: "roost-hermes-readonly-boundary-v1", attemptId: envelope.identity.executionId,
      inputSeal: envelope.seal, preFootprintDigest: now.footprint.digest, canonicalRootDigest: now.footprint.rootIdentity,
      repositoryIdentityDigest: now.footprint.gitIdentity, oneWriterReference: nativeDigest(assertWriterLock(saved.writerLock).reference),
      applicationLeaseReference: assertApplicationLease(saved.app).reference,
      startupReceiptDigest: saved.startupReceipt.digest, budgetReceiptDigest: saved.budgetReceipt.digest,
      repositoryEvidenceDigest: saved.repositoryEvidence.digest, toolSourceDigest: saved.tools.sourceDigest,
      toolsets: ["bot_room"], nativeTools: [], readPaths: [...envelope.contract.nativeBoundary.readPaths] };
    const receipt = frozen({ ...body, digest: nativeDigest(body) });
    receipts.set(receipt, proof); return receipt;
  } catch (error) { if (error.message === "readonly_boundary_unproven" && error.protocolAdmission) throw error; fail("assertion_unavailable"); }
}

export function consumeReadOnlyBoundary(receipt, { cwd, environment, attempt, budgetReceipt }) {
  try {
    const proof = receipts.get(receipt), saved = sealed.get(proof);
    if (!saved || saved.consumed || saved.complete || cwd !== saved.repositoryPath
        || environment.HERMES_SAFE_MODE !== "1" || attempt !== saved.envelope.identity.executionId
        || budgetReceipt !== saved.budgetReceipt) fail("binding_changed");
    if (assertReadOnlyBoundary(proof, saved.envelope).digest !== receipt.digest) fail("receipt_changed");
    saved.consumed = true; return proof;
  } catch (error) { if (error.message === "readonly_boundary_unproven" && error.protocolAdmission) throw error; fail("consumption_unavailable"); }
}

export function authorizeReadOnlyResume(proof, assignment, runtime) {
  try {
    const saved = sealed.get(proof);
    if (!saved?.consumed || saved.complete || saved.resumeAuthorized || !assignment || !runtime) fail();
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app);
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    saved.resumeAuthorized = true;
    return nativeDigest([saved.envelope.seal, saved.startupReceipt.digest, saved.budgetReceipt.digest,
      saved.repositoryEvidence.digest, assignment, runtime]);
  } catch { fail(); }
}

export function completeReadOnlyBoundary(proof, { ownedTreeReceipt, error } = {}) {
  try {
    const saved = sealed.get(proof);
    if (!saved || !saved.consumed || !saved.resumeAuthorized || saved.complete || error || !isWindowsJobCleanupReceipt(ownedTreeReceipt)
        || ownedTreeReceipt.attempt !== saved.envelope.identity.executionId || ownedTreeReceipt.activeProcesses !== 0
        || !ownedTreeReceipt.cleanup || !ownedTreeReceipt.jobClosed
        || ownedTreeReceipt.rootExit !== 0 || ownedTreeReceipt.terminationReason !== "root_exit") fail();
    saved.complete = true;
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    assertApplicationLease(saved.app);
    releaseApplicationLease(saved.app);
    const review = saved.envelope.contract.nativeBoundary.inspectReadOnly;
    const body = { schemaVersion: "roost-readonly-audit-v1", verdict: "verified", evidenceDigest: saved.repositoryEvidence.digest,
      preTree: saved.repositoryEvidence.tree, postTree: now.footprint.digest, processState: "unchanged", dockerState: "unchanged",
      gitState: "unchanged", nativeTools: [], processCoverage: "listening_tcp_plus_owned_job_zero_processes",
      dockerCoverage: "running_container_list", ...(review.kind === "verifier" || review.kind === "code-reviewer"
        ? { verifiedExecutionId: review.verifiedExecutionId, verifiedEvidenceDigest: review.verifiedEvidenceDigest } : {}),
      ...(review.kind === "code-reviewer" ? { verifiedTaskId: review.verifiedTaskId, reviewedCommit: review.reviewedCommit,
        baselineCommit: review.baselineCommit, diffDigest: saved.repositoryEvidence.reviewed.diffDigest } : {}) };
    return frozen({ ...body, digest: nativeDigest(body) });
  } catch { fail(); }
}

export function abortReadOnlyBoundary(proof, ownedTreeReceipt = null) {
  try {
    const saved = sealed.get(proof);
    if (!saved || saved.complete || saved.consumed && (!isWindowsJobCleanupReceipt(ownedTreeReceipt)
        || ownedTreeReceipt.attempt !== saved.envelope.identity.executionId || ownedTreeReceipt.activeProcesses !== 0)) fail();
    assertWriterLock(saved.writerLock); assertApplicationLease(saved.app);
    const now = state(saved.repositoryPath, saved.expected);
    if (now.footprint.digest !== saved.repositoryEvidence.tree || now.processDigest !== saved.repositoryEvidence.processDigest
        || now.dockerDigest !== saved.repositoryEvidence.dockerDigest) fail();
    releaseApplicationLease(saved.app); saved.complete = true;
  } catch { fail(); }
}
