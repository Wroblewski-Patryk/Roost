import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { guardHostContent } from "./agent-host-redaction.mjs";
import { nativeRelative } from "./agent-host-native-footprint.mjs";

const limits = Object.freeze({ files: 128, fileBytes: 8 * 1024 * 1024, totalBytes: 32 * 1024 * 1024, gitBytes: 8 * 1024 * 1024 });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const fail = () => { throw Object.assign(new Error("hermes_workspace_evidence_blocked"), { retryable: false, providerFailure: true }); };
const decode = bytes => { try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail(); } };
const freeze = x => { if (x && typeof x === "object") { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
function git(cwd, args) {
  return new Promise((resolve, reject) => execFile("git", ["--literal-pathspecs", "-c", "core.fsmonitor=false", ...args], {
    cwd, shell: false, windowsHide: true, timeout: 10000, maxBuffer: limits.gitBytes,
    encoding: "buffer", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1" }
  }, (error, stdout) => error ? reject(Object.assign(new Error("hermes_workspace_evidence_blocked"), { retryable: false })) : resolve(stdout)));
}
function safeRelative(value) {
  if (!value || value.length > 512 || /[\x00-\x1f\x7f\\:]/.test(value) || path.posix.isAbsolute(value)
      || value.split("/").some(p => !p || [".", "..", ".git"].includes(p.toLowerCase()))) fail();
  try { return nativeRelative(value); } catch { fail(); }
}

async function snapshot(directory, expectedHead, expectedBranch, secrets) {
  const root = await realpath(directory);
  const head = decode(await git(root, ["rev-parse", "HEAD"])).trim();
  const branch = decode(await git(root, ["symbolic-ref", "--short", "HEAD"])).trim();
  if (!/^[a-f0-9]{40}$/.test(head) || head !== expectedHead || branch !== expectedBranch) fail();
  const status = decode(await git(root, ["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]));
  guardHostContent({ head, branch, status }, "required", secrets);
  const rows = status.split("\0").filter(Boolean);
  if (rows.length > limits.files) fail();
  const manifest = []; let total = 0;
  for (const row of rows) {
    if (row.length < 4 || row[2] !== " " || !/^[ MADRCU?!]{2}$/.test(row.slice(0, 2))) fail();
    const relative = safeRelative(row.slice(3)), filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) fail();
    let working = null;
    try {
      const stat = await lstat(filename, { bigint: true });
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size > limits.fileBytes
          || (await realpath(filename)) !== filename) fail();
      const handle = await open(filename, "r");
      try {
        const checked = await handle.stat({ bigint: true });
        // Windows path stat may report dev=0 while fstat has a volume id.
        // Keep exact 64-bit file identity and compare volume when available.
        if (checked.ino !== stat.ino || (stat.dev !== 0n && checked.dev !== stat.dev) || checked.size !== stat.size) fail();
        // Bounded read even if another process grows the file after stat.
        const size = Number(stat.size), bytes = Buffer.alloc(size + 1);
        let used = 0;
        while (used < bytes.length) { const read = await handle.read(bytes, used, bytes.length - used, used); if (!read.bytesRead) break; used += read.bytesRead; }
        if (used !== size || (total += used) > limits.totalBytes) fail();
        working = { bytes: used, sha256: hash(bytes.subarray(0, used)), mode: Number(stat.mode & 0o777n) };
      } finally { await handle.close(); }
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const entries = decode(await git(root, ["ls-files", "--stage", "-z", "--", relative])).split("\0").filter(Boolean);
    if (entries.length > 1) fail(); // No unresolved merge stages or gitlink traversal.
    let index = null;
    if (entries.length) {
      const match = /^(100644|100755) ([a-f0-9]{40}) 0\t(.+)$/.exec(entries[0]);
      if (!match || match[3] !== relative) fail();
      const bytes = await git(root, ["cat-file", "blob", `:${relative}`]);
      if (bytes.length > limits.fileBytes || (total += bytes.length) > limits.totalBytes) fail();
      index = { bytes: bytes.length, sha256: hash(bytes), mode: match[1] };
    }
    manifest.push({ path: relative, status: row.slice(0, 2), working, index });
  }
  manifest.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const patches = [];
  for (const cached of [false, true]) {
    const bytes = await git(root, ["diff", ...(cached ? ["--cached"] : []), "--binary", "--no-ext-diff", "--no-textconv", "--no-renames"]);
    if ((total += bytes.length) > limits.totalBytes) fail();
    patches.push({ kind: cached ? "index" : "worktree", bytes: bytes.length, sha256: hash(bytes) });
  }
  const payload = { head, branch, status, manifest, patches };
  guardHostContent(payload, "required", secrets);
  if (Buffer.byteLength(JSON.stringify(payload)) > 65536) fail();
  return payload;
}

// Private disk bytes never enter the returned evidence: only relative paths,
// sizes, modes and digests. Git-visible changes include staged and untracked
// files; ignored files/out-of-workspace effects require independent containment.
export async function collectWorkspaceEvidence({ repositoryPath, expectedHead, expectedBranch,
  inputSeal, baselineSeal = null, secrets = [] }) {
  try {
  if (!/^[a-f0-9]{64}$/.test(inputSeal) || (baselineSeal !== null && !/^[a-f0-9]{64}$/.test(baselineSeal))) fail();
  const first = await snapshot(repositoryPath, expectedHead, expectedBranch, secrets);
  const second = await snapshot(repositoryPath, expectedHead, expectedBranch, secrets);
  if (JSON.stringify(first) !== JSON.stringify(second)) fail();
  const payload = { version: "roost-workspace-evidence-v1", inputSeal, baselineSeal,
    ...second, reviewRequired: true, scope: "git_visible_uncommitted_bytes" };
  return freeze({ ...payload, seal: hash(JSON.stringify(payload)) });
  } catch { fail(); } // Filesystem/Git errors must not expose private paths or bytes.
}
