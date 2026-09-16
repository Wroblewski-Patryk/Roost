import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm, realpath, mkdir, rename, unlink, link } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { collectWorkspaceEvidence } from "./lib/agent-host-workspace-evidence.mjs";
const hash = b => createHash("sha256").update(b).digest("hex");
async function fixture(run) {
  const temp = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(temp, "roost-workspace-evidence-"));
  const git = (...args) => execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgsign=false", "-c", `core.hooksPath=${path.join(root, "empty-hooks")}`, ...args], { cwd: root, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    await mkdir(path.join(root, "empty-hooks")); git("init", "-b", "codex/synthetic");
    await writeFile(path.join(root, "tracked.txt"), "initial\n"); git("add", "tracked.txt"); git("commit", "-m", "synthetic base");
    const options = { repositoryPath: root, expectedHead: git("rev-parse", "HEAD"), expectedBranch: "codex/synthetic", inputSeal: "a".repeat(64) };
    await run({ root, git, options, collect: extra => collectWorkspaceEvidence({ ...options, ...extra }) });
  } finally {
    assert.equal(path.dirname(root), temp); assert.ok(path.basename(root).startsWith("roost-workspace-evidence-"));
    await rm(root, { recursive: true, force: true });
  }
}
test("seals exact staged, dirty and binary untracked bytes with baseline and input identity", () => fixture(async f => {
  const before = await f.collect();
  await writeFile(path.join(f.root, "tracked.txt"), "staged\n"); f.git("add", "tracked.txt");
  await writeFile(path.join(f.root, "tracked.txt"), "working\n");
  const binary = Buffer.from([0, 255, 17, 44]); await writeFile(path.join(f.root, "space name.bin"), binary);
  const evidence = await f.collect({ baselineSeal: before.seal });
  assert.equal(evidence.head, f.options.expectedHead); assert.equal(evidence.reviewRequired, true);
  assert.equal(evidence.baselineSeal, before.seal); assert.equal(evidence.inputSeal, f.options.inputSeal);
  const tracked = evidence.manifest.find(e => e.path === "tracked.txt");
  assert.equal(tracked.index.sha256, hash("staged\n")); assert.equal(tracked.working.sha256, hash("working\n"));
  assert.equal(evidence.manifest.find(e => e.path === "space name.bin").working.sha256, hash(binary));
  assert.equal(evidence.seal, (await f.collect({ baselineSeal: before.seal })).seal);
  await writeFile(path.join(f.root, "space name.bin"), Buffer.from([0, 255, 17, 45]));
  assert.notEqual(evidence.seal, (await f.collect({ baselineSeal: before.seal })).seal);
  assert.equal(JSON.stringify(evidence).includes(f.root), false);
  assert.equal(JSON.stringify(evidence).includes("working\\n"), false);
}));
test("rename and deletion are explicit; staging the same working bytes changes the seal", () => fixture(async f => {
  await rename(path.join(f.root, "tracked.txt"), path.join(f.root, "renamed.txt"));
  const e = await f.collect(); assert.equal(e.manifest.find(e => e.path === "tracked.txt").working, null);
  f.git("add", "-A"); const staged = await f.collect(); assert.notEqual(staged.seal, e.seal);
  await unlink(path.join(f.root, "renamed.txt")); assert.notEqual((await f.collect()).seal, staged.seal);
}));
test("commits, branch changes and oversize material fail closed", () => fixture(async f => {
  await assert.rejects(f.collect({ expectedHead: "b".repeat(40) }), /evidence_blocked/);
  await assert.rejects(f.collect({ expectedBranch: "main" }), /evidence_blocked/);
  await writeFile(path.join(f.root, "large.bin"), Buffer.alloc(8 * 1024 * 1024 + 1));
  await assert.rejects(f.collect(), /evidence_blocked/);
  await unlink(path.join(f.root, "large.bin"));
  await writeFile(path.join(f.root, "tracked.txt"), "committed by synthetic provider\n");
  f.git("add", "tracked.txt"); f.git("commit", "-m", "synthetic forbidden commit");
  await assert.rejects(f.collect(), /evidence_blocked/);
}));

test("credential-shaped dirty paths and filesystem errors disclose no private material", () => fixture(async f => {
  await writeFile(path.join(f.root, ".env.local"), "synthetic only\n");
  await assert.rejects(f.collect(), e => e.message === "hermes_workspace_evidence_blocked" && !e.message.includes(f.root));
  await assert.rejects(f.collect({ repositoryPath: path.join(f.root, "missing") }), e => e.message === "hermes_workspace_evidence_blocked");
}));

test("safe configuration templates are content while hardlinked files stay blocked", () => fixture(async f => {
  await writeFile(path.join(f.root, ".env.example"), "EXAMPLE=value\n");
  await writeFile(path.join(f.root, "credentials.json.template"), "{}\n");
  const evidence = await f.collect();
  assert.ok(evidence.manifest.some(row => row.path === ".env.example"));
  assert.ok(evidence.manifest.some(row => row.path === "credentials.json.template"));
  await link(path.join(f.root, "tracked.txt"), path.join(f.root, "linked.txt"));
  await assert.rejects(f.collect(), /evidence_blocked/);
}));
