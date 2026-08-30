import { strict as assert } from "node:assert";
import test from "node:test";
import path from "node:path";
import { assertDirectWorkspaceChild, normalizeGitRemote } from "./lib/agent-host-workspace-guard.mjs";

const root = path.resolve("C:\\Personal\\Projekty\\Aplikacje");

test("workspace guard accepts only a direct application child", () => {
  assert.equal(assertDirectWorkspaceChild(root, path.join(root, "Roost")), path.join(root, "Roost"));
  assert.throws(() => assertDirectWorkspaceChild(root, root), /repository_path_outside_workspace/);
  assert.throws(() => assertDirectWorkspaceChild(root, path.join(root, "..", "Elsewhere")), /repository_path_outside_workspace/);
  assert.throws(() => assertDirectWorkspaceChild(root, path.join(root, "Roost", "nested")), /repository_path_outside_workspace/);
});

test("GitHub HTTPS and SSH origin spellings normalize to the same repository", () => {
  assert.equal(normalizeGitRemote("https://github.com/Wroblewski-Patryk/Roost.git"), normalizeGitRemote("git@github.com:Wroblewski-Patryk/Roost.git"));
});
