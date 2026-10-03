import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { nativeDigest, nativeRelative } from "./agent-host-native-footprint.mjs";
import { isCodingTestReplayReceipt } from "./agent-host-coding-test-replay.mjs";

const h = bytes => createHash("sha256").update(bytes).digest("hex");
const fail = () => { throw Object.assign(new Error("local_commit_unproven"), { protocolAdmission: true, retryable: false,
  publicMessage: "Exact local commit could not be verified; preserve the writer lease and reconcile the checkout." }); };
function git(root, args, maxBuffer = 1024 * 1024) {
  return execFileSync("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=NUL",
    "-c", "user.name=Roost Worker", "-c", "user.email=worker@invalid.local", "-c", "commit.gpgsign=false", ...args], {
    cwd: root, shell: false, windowsHide: true, timeout: 30000, maxBuffer,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_TERMINAL_PROMPT: "0" }, encoding: "buffer" });
}
const output = (root, args) => git(root, args).toString("utf8").trim();
const status = root => git(root, ["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]).toString("utf8")
  .split("\0").filter(Boolean).map(row => {
    if (row.length < 4 || row[2] !== " ") fail();
    return { code: row.slice(0, 2), file: nativeRelative(row.slice(3)) };
  });

// An evidence-only correction may retest the exact preceding native commit.
// It never creates an empty commit or rewrites the original coding receipt.
// The signed admission authenticates the rejected result and manager return;
// the in-memory replay receipt prevents a serialized 'passed' claim from being
// promoted into native test proof.
export function verifyExistingLocalCommit({ repositoryPath, writerLock, executionId, taskId,
  baselineCommit, branch, writePaths, firstWrite, nativeReviewReceipt,
  nativeReviewReceiptDigest, candidateTests, workspaceEvidence, assertAuthority }) {
  try {
    const continuation = firstWrite?.continuation, verification=firstWrite?.existingCommitVerification;
    const authority=verification??continuation;
    const validVerification=verification && !continuation && firstWrite.operation==="verify_existing_local_commit"
      && firstWrite.operations?.localCommit===false && /^[0-9a-f-]{36}$/.test(verification.releaseId??"")
      && /^[0-9a-f-]{36}$/.test(verification.closureId??"") && /^[a-f0-9]{64}$/.test(verification.consentDigest??"")
      && /^[a-f0-9]{64}$/.test(verification.closureDigest??"");
    if (!(verification?validVerification:firstWrite?.operations?.localCommit===true&&firstWrite.operation===undefined) || firstWrite.baselineCommit !== baselineCommit
        || firstWrite.branch !== branch || !Number.isFinite(Date.parse(firstWrite.expiresAt))
        || Date.parse(firstWrite.expiresAt) <= Date.now() || !firstWrite.decisionId
        || !authority || authority.previousCommit !== baselineCommit
        || !/^[0-9a-f-]{36}$/.test(authority.previousExecutionId ?? "")
        || !verification && !/^[0-9a-f-]{36}$/.test(continuation.reviewId ?? "")
        || authority.previousExecutionId === executionId
        || !isCodingTestReplayReceipt(candidateTests, baselineCommit)
        || nativeReviewReceipt?.verdict !== "verified_candidate"
        || !/^[a-f0-9]{64}$/.test(nativeReviewReceiptDigest ?? "")
        || workspaceEvidence?.head !== baselineCommit || workspaceEvidence.branch !== branch
        || workspaceEvidence.status?.length !== 0 || workspaceEvidence.manifest?.length !== 0
        || !Array.isArray(writePaths) || !writePaths.length) fail();
    assertWriterLock(writerLock); assertAuthority();
    if (output(repositoryPath, ["rev-parse", "HEAD"]) !== baselineCommit
        || output(repositoryPath, ["symbolic-ref", "--short", "HEAD"]) !== branch
        || status(repositoryPath).length) fail();
    const parent = output(repositoryPath, ["rev-parse", "HEAD^1"]);
    if (candidateTests.regressionReplay?.baselineCommit !== parent
        || output(repositoryPath, ["rev-list", "--parents", "-n", "1", "HEAD"]) !== `${baselineCommit} ${parent}`) fail();
    const paths = git(repositoryPath, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"])
      .toString("utf8").split("\0").filter(Boolean).sort();
    if (!paths.length || JSON.stringify(paths) !== JSON.stringify([...writePaths].map(nativeRelative).sort())) fail();
    const tree = output(repositoryPath, ["rev-parse", "HEAD^{tree}"]);
    assertWriterLock(writerLock); assertAuthority();
    const body = { schemaVersion: "roost-local-commit-verification-v1", operation: "verify_existing_local_commit",
      executionId, taskId, decisionId: firstWrite.decisionId, commit: baselineCommit,
      baselineCommit: parent, verificationBaselineCommit: baselineCommit, branch, tree, paths,
      previousExecutionId: authority.previousExecutionId,
      ...(verification?{existingCommitVerification:verification}:{rejectionReviewId:continuation.reviewId}),
      workspaceEvidenceDigest: workspaceEvidence.seal, nativeReviewReceiptDigest, testDigest: candidateTests.digest,
      commitCreated: false, remotePush: false, deployment: false };
    return Object.freeze({ ...body, digest: nativeDigest(body) });
  } catch { fail(); }
}
export function finalizeLocalCommit({ repositoryPath, writerLock, executionId, taskId, baselineCommit, branch,
  writePaths, firstWrite, nativeReviewReceipt, nativeReviewReceiptDigest, candidateTests, workspaceEvidence,
  assertAuthority }) {
  try {
    if (!firstWrite?.operations?.localCommit || firstWrite.baselineCommit !== baselineCommit || firstWrite.branch !== branch
        || !Number.isFinite(Date.parse(firstWrite.expiresAt)) || Date.parse(firstWrite.expiresAt) <= Date.now()
        || !firstWrite.decisionId || nativeReviewReceipt?.verdict !== "verified_candidate"
        || !/^[a-f0-9]{64}$/.test(nativeReviewReceiptDigest ?? "") || !candidateTests?.passed
        || workspaceEvidence?.head !== baselineCommit || workspaceEvidence.branch !== branch
        || !Array.isArray(writePaths) || !writePaths.length) fail();
    assertWriterLock(writerLock); assertAuthority();
    if (output(repositoryPath, ["rev-parse", "HEAD"]) !== baselineCommit
        || output(repositoryPath, ["symbolic-ref", "--short", "HEAD"]) !== branch) fail();
    const rows = status(repositoryPath), paths = [...new Set(rows.map(row => row.file))].sort();
    if (!paths.length || rows.length !== paths.length || paths.some(file => !writePaths.some(scope =>
      file === scope || file.startsWith(scope + "/")))) fail();
    const evidenced = new Map(workspaceEvidence.manifest?.map(row => [row.path, row]) ?? []);
    if (evidenced.size !== paths.length || paths.some(file => !evidenced.has(file))) fail();
    for (const file of paths) {
      const row = evidenced.get(file), target = path.join(repositoryPath, file);
      if (row.working) {
        const stat = lstatSync(target);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || h(readFileSync(target)) !== row.working.sha256) fail();
      } else if (!rows.find(item => item.file === file)?.code.includes("D")) fail();
    }
    if (JSON.stringify(workspaceEvidence.status) !== JSON.stringify(rows.map(row => `${row.code} ${row.file}`))) fail();
    // Stage individual observed files only; never hand Git a directory.
    git(repositoryPath, ["add", "--", ...paths]);
    const staged = git(repositoryPath, ["diff", "--cached", "--name-only", "-z", "--no-renames"]).toString("utf8")
      .split("\0").filter(Boolean).sort();
    if (JSON.stringify(staged) !== JSON.stringify(paths)) fail();
    assertWriterLock(writerLock); assertAuthority();
    if (Date.parse(firstWrite.expiresAt) <= Date.now()) fail();
    git(repositoryPath, ["commit", "--no-verify", "-m", `Gate 2 task ${taskId}`], 262144);
    const commit = output(repositoryPath, ["rev-parse", "HEAD"]);
    if (!/^[a-f0-9]{40}$/.test(commit) || output(repositoryPath, ["rev-parse", "HEAD^1"]) !== baselineCommit
        || output(repositoryPath, ["symbolic-ref", "--short", "HEAD"]) !== branch || status(repositoryPath).length) fail();
    const committed = git(repositoryPath, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", commit]).toString("utf8")
      .split("\0").filter(Boolean).sort();
    if (JSON.stringify(committed) !== JSON.stringify(paths)) fail();
    for (const file of paths) {
      const row = evidenced.get(file);
      if (row.working && h(git(repositoryPath, ["cat-file", "blob", `${commit}:${file}`], 8 * 1024 * 1024)) !== row.working.sha256) fail();
    }
    const tree = output(repositoryPath, ["rev-parse", `${commit}^{tree}`]);
    const body = { schemaVersion: "roost-local-commit-v1", operation: "local_commit", executionId, taskId,
      decisionId: firstWrite.decisionId, baselineCommit, commit, branch, tree, paths,
      workspaceEvidenceDigest: workspaceEvidence.seal, nativeReviewReceiptDigest, testDigest: candidateTests.digest,
      remotePush: false, deployment: false };
    return Object.freeze({ ...body, digest: nativeDigest(body) });
  } catch { fail(); }
}
