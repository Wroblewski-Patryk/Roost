import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { physicalIdentity, nativeDigest, nativeRelative } from "./agent-host-native-footprint.mjs";
import { normalizeGitRemote } from "./agent-host-workspace-guard.mjs";
import { startWindowsJob, temporaryWindowsJobLauncher, isWindowsJobCleanupReceipt } from "./agent-host-windows-job.mjs";

const h = value => createHash("sha256").update(value).digest("hex");
const commandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("npm_script"), script: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,79}$/),
    expectedCommand: z.string().min(1).max(1000), acceptanceTest: z.string().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal("node_test"), relativePath: z.string().min(1).max(512),
    acceptanceTest: z.string().min(1).max(2000) }).strict()
]);
const manifestSchema = z.object({ schemaVersion: z.literal("roost-gate2-test-manifest-v1"), repositoryOrigin: z.string().min(1).max(1024),
  commands: z.array(commandSchema).min(1).max(8) }).strict();
const proofs = new WeakMap();
const fail = () => { throw Object.assign(new Error("coding_tests_unproven"), { protocolAdmission: true, retryable: false,
  publicMessage: "Configured coding tests are missing, changed or failed; the candidate cannot be finalized." }); };
function fileBytes(file, max) {
  physicalIdentity(file, false);
  const first = lstatSync(file, { bigint: true });
  if (!first.isFile() || first.isSymbolicLink() || first.nlink !== 1n || first.size > BigInt(max)) fail();
  const bytes = readFileSync(file), second = lstatSync(file, { bigint: true });
  if (BigInt(bytes.length) !== first.size || second.ino !== first.ino || second.mtimeNs !== first.mtimeNs) fail();
  return bytes;
}
function nodeTestFile(root, relative) {
  nativeRelative(relative);
  if (!relative.startsWith("scripts/") || !relative.endsWith(".test.mjs")) fail();
  const file = path.join(root, relative);
  if (!file.startsWith(root + path.sep)) fail();
  physicalIdentity(file, false);
  const tracked = execFileSync("git", ["--literal-pathspecs", "ls-files", "--error-unmatch", "--", relative], {
    cwd: root, windowsHide: true, shell: false, timeout: 10000, maxBuffer: 4096, encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1" } }).trim();
  if (tracked !== relative) fail();
  return file;
}
export function prepareCodingTests({ manifestPath, repositoryPath, originUrl, acceptanceTests }) {
  try {
    if (!path.isAbsolute(manifestPath) || manifestPath.startsWith(repositoryPath + path.sep)) fail();
    const bytes = fileBytes(manifestPath, 16384), manifest = manifestSchema.parse(JSON.parse(bytes));
    if (normalizeGitRemote(manifest.repositoryOrigin) !== normalizeGitRemote(originUrl)) fail();
    if (manifest.commands.length !== acceptanceTests.length
        || new Set(manifest.commands.map(x => x.acceptanceTest)).size !== manifest.commands.length
        || acceptanceTests.some(test => !manifest.commands.some(x => x.acceptanceTest === test))) fail();
    const packagePath = path.join(repositoryPath, "package.json"), packageBytes = fileBytes(packagePath, 128 * 1024);
    const pkg = JSON.parse(packageBytes);
    if (manifest.commands.some(x => x.kind === "npm_script" && pkg.scripts?.[x.script] !== x.expectedCommand)) fail();
    for (const command of manifest.commands) if (command.kind === "node_test") nodeTestFile(repositoryPath, command.relativePath);
    const npm = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    const npmIdentity = physicalIdentity(npm, false), npmDigest = h(fileBytes(npm, 4 * 1024 * 1024));
    const proof = Object.freeze({});
    proofs.set(proof, { manifestPath, manifestDigest: h(bytes), packagePath, packageDigest: h(packageBytes),
      repositoryPath, commands: manifest.commands, npm, npmIdentity, npmDigest, runs: 0 });
    return proof;
  } catch { fail(); }
}
function assertProof(proof) {
  const p = proofs.get(proof);
  if (!p || p.runs >= 1 || h(fileBytes(p.manifestPath, 16384)) !== p.manifestDigest
      || h(fileBytes(p.packagePath, 128 * 1024)) !== p.packageDigest
      || physicalIdentity(p.npm, false) !== p.npmIdentity || h(fileBytes(p.npm, 4 * 1024 * 1024)) !== p.npmDigest) fail();
  return p;
}
async function runOne(p, command, remainingMs, assertAuthority) {
  try {
    assertAuthority();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA)$/i.test(key)));
    Object.assign(env, { npm_config_ignore_scripts: "true", npm_config_audit: "false", npm_config_fund: "false",
      npm_config_update_notifier: "false", GIT_TERMINAL_PROMPT: "0" });
    let bytes = 0; const output = createHash("sha256");
    const receipt = await temporaryWindowsJobLauncher(async artifact => {
      if (command.kind === "node_test") nodeTestFile(p.repositoryPath, command.relativePath);
      const handle = await startWindowsJob(artifact, { executable: process.execPath,
        argv: command.kind === "npm_script" ? [p.npm, "--ignore-scripts", "run", command.script]
          : ["--test", "--", command.relativePath], cwd: p.repositoryPath,
        environment: env, input: "", attempt: randomUUID(), durationMs: Math.max(1, Math.min(remainingMs(), 120000)),
        onData: (_channel, chunk) => { bytes += chunk.length; if (bytes > 131072) throw Error("output_limit"); output.update(chunk); assertAuthority(); } });
      return handle.completion;
    });
    if (!isWindowsJobCleanupReceipt(receipt) || !receipt.cleanup || !receipt.jobClosed || receipt.activeProcesses !== 0
        || receipt.terminationReason !== "root_exit" || !Number.isInteger(receipt.rootExit)) fail();
    assertAuthority();
    return { kind: command.kind, ...(command.kind === "npm_script" ? { script: command.script } : { relativePath: command.relativePath }),
      acceptanceTest: command.acceptanceTest, exitCode: receipt.rootExit,
      outputDigest: output.digest("hex"), outputBytes: bytes, jobDigest: nativeDigest(receipt) };
  } catch { fail(); }
}
export async function runCodingTests(proof, { phase, workspaceSeal, remainingMs, assertAuthority }) {
  try {
    const p = assertProof(proof);
    if (phase !== "candidate" || p.runs !== 0 || !/^[a-f0-9]{64}$/.test(workspaceSeal)) fail();
    const results = [];
    for (const command of p.commands) results.push(await runOne(p, command, remainingMs, assertAuthority));
    p.runs += 1;
    return Object.freeze({ schemaVersion: "roost-coding-tests-v1", phase, manifestDigest: p.manifestDigest,
      packageDigest: p.packageDigest, workspaceSeal, tests: results,
      passed: results.every(x => x.exitCode === 0), digest: nativeDigest([phase, p.manifestDigest, p.packageDigest, workspaceSeal, results]) });
  } catch { fail(); }
}
