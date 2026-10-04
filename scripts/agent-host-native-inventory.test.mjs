// Synthetic source integration only: no application checkout or provider access.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, lstatSync, unlinkSync, realpathSync, existsSync } from "node:fs";
import { captureNativeFootprint, nativeMetadataEntryLimit, nativeRelative, physicalIdentity,
  createNativeOwnedRepositoryTemp, inspectNativeOwnedTemp, cleanupNativeOwnedTemp } from "./lib/agent-host-native-footprint.mjs";

test("metadata inventory retains >8192 entries and protected metadata, accepts 32768 and rejects overflow", t => {
  assert.equal(nativeMetadataEntryLimit, 32768);
  const attempt = randomUUID(), owner = createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()), attempt);
  const { root } = inspectNativeOwnedTemp(owner, attempt), repository = path.join(root, "repository");
  const rootIdentity = physicalIdentity(root), repositoryIdentity = physicalIdentity(repository), created = [], directories = new Map();
  const createFile = (relative, bytes) => {
    const file = path.resolve(repository, relative);
    assert.ok(file.startsWith(repository + path.sep));
    const directory = path.dirname(file);
    if (!directories.has(directory)) directories.set(directory, physicalIdentity(directory));
    writeFileSync(file, bytes, { flag: "wx" });
    const stat = lstatSync(file, { bigint: true });
    created.push({ file, identity: `${stat.dev}:${stat.ino}` });
  };
  t.after(() => {
    // The overflow cannot pass an inventory ownership check. Remove only files
    // created by this fixture, checking their exact root and physical identities;
    // then use the existing marked-root cleanup for the small Git remainder.
    assert.equal(physicalIdentity(root), rootIdentity);
    assert.equal(physicalIdentity(repository), repositoryIdentity);
    for (const [directory, identity] of directories) assert.equal(physicalIdentity(directory), identity);
    for (const { file, identity } of created) {
      assert.ok(file.startsWith(repository + path.sep));
      const stat = lstatSync(file, { bigint: true });
      assert.equal(`${stat.dev}:${stat.ino}`, identity);
      assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n);
      unlinkSync(file);
    }
    assert.equal(cleanupNativeOwnedTemp(owner, attempt).remaining, 0);
    assert.equal(existsSync(root), false);
  });
  const env = {};
  for (const key of Object.keys(process.env)) if (["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "TEMP", "TMP"].includes(key.toUpperCase())) env[key] = process.env[key];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" });
  const git = (...args) => execFileSync("git", ["--literal-pathspecs", "-c", "core.hooksPath=", "-c", "core.fsmonitor=false", "-c", "commit.gpgsign=false", ...args],
    { cwd: repository, env, windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init"); git("config", "user.name", "Synthetic fixture"); git("config", "user.email", "fixture@example.invalid");
  createFile(".gitignore", "historical-docs/\n.codex/\n");
  createFile("source.mjs", "export const synthetic = true;\n");
  git("add", "--", ".gitignore", "source.mjs"); git("commit", "-m", "Synthetic inventory baseline");
  git("branch", "-m", "codex/synthetic-inventory"); git("remote", "add", "origin", "https://example.invalid/InventoryFixture.git");
  mkdirSync(path.join(repository, "historical-docs")); mkdirSync(path.join(repository, ".codex"));
  createFile(".codex/auth.json", "synthetic protected bytes, never credentials\n");
  const expected = { head: git("rev-parse", "HEAD"), branch: "codex/synthetic-inventory", origin: "https://example.invalid/InventoryFixture.git" };
  const capture = () => captureNativeFootprint(repository, expected);
  const initialCount = capture().inventory.rows.length + 1; // root .git counts but is separately inventoried.
  let fileCount = 0;
  const fillTo = count => { while (initialCount + fileCount < count) createFile(`historical-docs/document-${String(fileCount++).padStart(5, "0")}.md`, "Synthetic historical documentation\n"); };
  fillTo(12800);
  let started = performance.now();
  const large = capture(), largeMs = Math.round(performance.now() - started);
  assert.equal(large.inventory.rows.length + 1, 12800);
  assert.deepEqual(large.inventory.skipped, []); assert.deepEqual(large.dirty, []);
  assert.ok(large.inventory.rows.some(row => row.path === "historical-docs/document-00000.md"));
  const protectedRow = large.inventory.rows.find(row => row.path === ".codex/auth.json");
  assert.equal(protectedRow.kind, "file"); assert.equal(protectedRow.digest, undefined); assert.equal(protectedRow.content, undefined);
  assert.throws(() => nativeRelative(".codex/auth.json"), /native_scope_invalid/);
  fillTo(nativeMetadataEntryLimit);
  started = performance.now();
  const bounded = capture(), boundaryMs = Math.round(performance.now() - started);
  assert.equal(bounded.inventory.rows.length + 1, nativeMetadataEntryLimit);
  assert.deepEqual(bounded.inventory.skipped, []); assert.deepEqual(bounded.dirty, []);
  fillTo(nativeMetadataEntryLimit + 1);
  assert.throws(capture, /native_inventory_limit/);
  t.diagnostic(JSON.stringify({ largeEntries: 12800, largeMs, boundaryEntries: nativeMetadataEntryLimit, boundaryMs, overflowEntries: nativeMetadataEntryLimit + 1, rejected: "native_inventory_limit" }));
});
