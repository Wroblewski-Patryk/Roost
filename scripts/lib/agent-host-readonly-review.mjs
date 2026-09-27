import path from "node:path";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const fail = () => { throw Object.assign(new Error("agent_readonly_review_blocked"), { retryable: false,
  publicMessage: "The read-only native result could not be independently verified." }); };

async function readmeDigest(repositoryPath) {
  const file = path.join(repositoryPath, "README.md");
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 1024 * 1024
        || (await realpath(file)).toLowerCase() !== file.toLowerCase()) fail();
    const bytes = await readFile(file);
    if (bytes.length !== stat.size) fail();
    return sha(bytes);
  } catch { fail(); }
}
const clean = evidence => Array.isArray(evidence?.status) && evidence.status.length === 0
  && Array.isArray(evidence.patches) && evidence.patches.length === 2
  && evidence.patches.every(p => (p.kind === "index" || p.kind === "worktree") && p.bytes === 0 && p.sha256 === sha(""))
  && evidence.patches[0].kind !== evidence.patches[1].kind;

// Gate 1's narrowly accepted read-only task has an explicit, executable test.
// Other coding tasks require their own test/review path before completion.
export async function captureReadOnlyReviewBaseline({ repositoryPath, contract, workspaceEvidence }) {
  if (contract?.nativeBoundary?.profile !== "coding-local"
      || contract.nativeBoundary.writePaths?.length !== 0
      || JSON.stringify(contract.acceptance?.tests) !== JSON.stringify(["Verify README.md exists and is readable"])
      || !clean(workspaceEvidence)
      || !/^[a-f0-9]{40}$/.test(workspaceEvidence.head ?? "")) fail();
  return Object.freeze({ head: workspaceEvidence.head, branch: workspaceEvidence.branch,
    workspaceSeal: workspaceEvidence.seal, readmeDigest: await readmeDigest(repositoryPath) });
}

export async function verifyReadOnlyReview({ repositoryPath, baseline, workspaceEvidence }) {
  if (!baseline || workspaceEvidence?.head !== baseline.head || workspaceEvidence.branch !== baseline.branch
      || workspaceEvidence.baselineSeal !== baseline.workspaceSeal || !clean(workspaceEvidence)
      || await readmeDigest(repositoryPath) !== baseline.readmeDigest) fail();
  return Object.freeze({ before: { exit: 0 }, after: { exit: 0, passed: true },
    testUnchanged: true, baselineCommitUnchanged: true, minimalChange: true, diffDigest: sha("") });
}
