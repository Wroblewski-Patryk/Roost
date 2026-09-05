import { strict as assert } from "node:assert";
import test from "node:test";
import path from "node:path";
import { assertDirectWorkspaceChild, normalizeGitRemote, repositoryForExecution, validateHostExecutionPolicy, validateRepositoryMappings } from "./lib/agent-host-workspace-guard.mjs";

const root = path.resolve("C:\\Personal\\Projekty\\Aplikacje");

test("execution policy only permits the supervised workspace sandbox", () => {
  assert.equal(validateHostExecutionPolicy({}).sandbox, "workspace-write");
  assert.equal(validateHostExecutionPolicy({ sandbox: "workspace-write" }).sandbox, "workspace-write");
  for (const sandbox of ["danger-full-access", "read-only", "", " workspace-write", {}, ["workspace-write"]]) {
    assert.throws(() => validateHostExecutionPolicy({ sandbox }), /agent_host_sandbox_not_approved/);
  }
});

test("a role, plan or instruction claiming elevated authority cannot override host policy", () => {
  for (const extra of [{ role: "owner" }, { plan: "owner approved full access" }, { authority: { sandboxOverride: true } }]) {
    assert.throws(() => validateHostExecutionPolicy({ ...extra, sandbox: "danger-full-access" }), /agent_host_sandbox_not_approved/);
  }
});

test("workspace guard accepts only a direct application child", () => {
  assert.equal(assertDirectWorkspaceChild(root, path.join(root, "Roost")), path.join(root, "Roost"));
  assert.throws(() => assertDirectWorkspaceChild(root, root), /repository_path_outside_workspace/);
  assert.throws(() => assertDirectWorkspaceChild(root, path.join(root, "..", "Elsewhere")), /repository_path_outside_workspace/);
  assert.throws(() => assertDirectWorkspaceChild(root, path.join(root, "Roost", "nested")), /repository_path_outside_workspace/);
});

test("GitHub HTTPS and SSH origin spellings normalize to the same repository", () => {
  assert.equal(normalizeGitRemote("https://github.com/Wroblewski-Patryk/Roost.git"), normalizeGitRemote("git@github.com:Wroblewski-Patryk/Roost.git"));
});

const entry = (name) => ({ directory: name, originUrl: `https://github.com/example/${name}.git` });

test("another application and Roost use the same configuration contract", () => {
  const config = validateRepositoryMappings({ roost: entry("Roost"), second: entry("SecondApplication") });
  assert.deepEqual(Object.keys(config), ["roost", "second"]);
  for (const [slug, repository] of Object.entries(config)) {
    repository.path = path.join(root, repository.directory);
    const result = repositoryForExecution({ repositories: config }, { applicationId: slug, application: { id: slug, slug, repositories: [{ url: repository.originUrl }] } });
    assert.equal(result.path, path.join(root, repository.directory));
  }
});

test("two slugs cannot alias the same Windows directory", () => {
  assert.throws(() => validateRepositoryMappings({ first: entry("App"), second: { ...entry("Other"), directory: "app" } }), /repository_directory_ambiguous/);
});

test("two directories cannot create duplicate clones of the same origin", () => {
  assert.throws(() => validateRepositoryMappings({ first: entry("App"), second: { ...entry("Other"), originUrl: "https://github.com/EXAMPLE/app" } }), /repository_origin_ambiguous/);
});

test("malformed allowlists and path traversal fail closed", () => {
  for (const invalid of [null, [], "invalid"]) assert.throws(() => validateRepositoryMappings(invalid), /repository_allowlist_invalid/);
  assert.throws(() => validateRepositoryMappings({}), /repository_allowlist_empty/);
  assert.throws(() => validateRepositoryMappings({ app: { ...entry("App"), directory: "../App" } }), /repository_directory_invalid/);
  assert.throws(() => validateRepositoryMappings({ app: [] }), /repository_config_invalid/);
});

function executionFixture() {
  return {
    config: { repositories: { app: { ...entry("App"), path: path.join(root, "App") } } },
    execution: { applicationId: "app-id", application: { id: "app-id", slug: "app", repositories: [{ url: "https://github.com/example/App.git", isPrimary: true }] } }
  };
}

test("a claimed slug cannot redirect an application into another repository", () => {
  const { config, execution } = executionFixture();
  execution.application.repositories[0].url = "https://github.com/example/Other.git";
  assert.throws(() => repositoryForExecution(config, execution), /execution_repository_mismatch/);
});

test("application identity and explicit mapping are required", () => {
  const { config, execution } = executionFixture();
  assert.throws(() => repositoryForExecution(config, { ...execution, applicationId: "another-id" }), /execution_application_mismatch/);
  execution.application.slug = "unknown";
  assert.throws(() => repositoryForExecution(config, execution), /repository_mapping_missing/);
});

test("multiple repositories require exactly one primary", () => {
  const { config, execution } = executionFixture();
  execution.application.repositories.push({ url: "https://github.com/example/Other.git", isPrimary: true });
  assert.throws(() => repositoryForExecution(config, execution), /execution_repository_ambiguous/);
  execution.application.repositories.forEach((repository) => { repository.isPrimary = false; });
  assert.throws(() => repositoryForExecution(config, execution), /execution_repository_ambiguous/);
  execution.application.repositories[0].isPrimary = true;
  assert.equal(repositoryForExecution(config, execution), config.repositories.app);
  execution.application.repositories = [];
  assert.throws(() => repositoryForExecution(config, execution), /execution_repository_ambiguous/);
});

test("equivalent SSH remote identity is accepted without changing configuration", () => {
  const { config, execution } = executionFixture();
  execution.application.repositories[0].url = "git@github.com:example/App.git";
  assert.equal(repositoryForExecution(config, execution), config.repositories.app);
});
