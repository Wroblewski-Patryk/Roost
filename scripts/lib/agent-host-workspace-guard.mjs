import { spawn } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export const approvedWindowsWorkspaceRoot = "C:\\Personal\\Projekty\\Aplikacje";

function comparablePath(value) {
  const normalized = path.resolve(value).replace(/[\\/]+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function assertDirectWorkspaceChild(workspaceRoot, candidatePath) {
  const root = path.resolve(workspaceRoot);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative) || relative.includes(path.sep)) {
    throw new Error(`repository_path_outside_workspace:${candidate}`);
  }
  return candidate;
}

export function normalizeGitRemote(value) {
  return String(value || "")
    .trim()
    .replace(/^git@github\.com:/i, "https://github.com/")
    .replace(/[\\/]+$/, "")
    .replace(/\.git$/i, "")
    .toLowerCase();
}

function git(repositoryPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", repositoryPath, ...args], { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`repository_git_validation_failed:${stderr.trim() || code}`)));
  });
}

function validateRepositoryConfig(slug, repository) {
  if (!repository || typeof repository !== "object" || Array.isArray(repository)) throw new Error(`repository_config_invalid:${slug}`);
  const directory = String(repository.directory || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(directory) || directory === "." || directory === "..") {
    throw new Error(`repository_directory_invalid:${slug}`);
  }
  const originUrl = String(repository.originUrl || "").trim();
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(originUrl)) {
    throw new Error(`repository_origin_invalid:${slug}`);
  }
  const deploymentUrl = String(repository.deploymentUrl || "").trim();
  if (deploymentUrl && !/^https:\/\//i.test(deploymentUrl)) throw new Error(`repository_deployment_url_invalid:${slug}`);
  return { ...repository, directory, originUrl, deploymentUrl: deploymentUrl || null, baseBranch: String(repository.baseBranch || "main") };
}

export function validateRepositoryMappings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("repository_allowlist_invalid");
  const entries = Object.entries(input);
  if (!entries.length) throw new Error("repository_allowlist_empty");
  const directories = new Set();
  const origins = new Set();
  return Object.fromEntries(entries.map(([slug, rawRepository]) => {
    if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(slug)) throw new Error(`repository_slug_invalid:${slug}`);
    const repository = validateRepositoryConfig(slug, rawRepository);
    // The approved host is Windows: differently cased names still identify one directory.
    const directory = repository.directory.toLowerCase();
    const origin = normalizeGitRemote(repository.originUrl);
    if (directories.has(directory)) throw new Error(`repository_directory_ambiguous:${slug}`);
    if (origins.has(origin)) throw new Error(`repository_origin_ambiguous:${slug}`);
    directories.add(directory);
    origins.add(origin);
    return [slug, repository];
  }));
}

export function repositoryForExecution(config, execution) {
  const application = execution?.application;
  if (!application?.id || application.id !== execution.applicationId) throw new Error("execution_application_mismatch");
  const repository = Object.hasOwn(config.repositories, application.slug) ? config.repositories[application.slug] : null;
  if (!repository?.path) throw new Error("repository_mapping_missing");
  const declared = Array.isArray(application.repositories) ? application.repositories : [];
  const primary = declared.filter((item) => item?.isPrimary === true);
  const selected = primary.length === 1 ? primary[0] : primary.length === 0 && declared.length === 1 ? declared[0] : null;
  if (!selected?.url || typeof selected.url !== "string") throw new Error("execution_repository_ambiguous");
  if (normalizeGitRemote(selected.url) !== normalizeGitRemote(repository.originUrl)) throw new Error("execution_repository_mismatch");
  return repository;
}

export async function validateAgentHostWorkspace(config) {
  if (process.platform !== "win32") throw new Error(`agent_host_platform_not_approved:${process.platform}`);
  const workspaceRoot = path.resolve(String(config.workspaceRoot || ""));
  if (comparablePath(workspaceRoot) !== comparablePath(approvedWindowsWorkspaceRoot)) {
    throw new Error(`workspace_root_not_approved:${workspaceRoot}`);
  }
  const rootStat = await lstat(workspaceRoot).catch(() => null);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`workspace_root_invalid:${workspaceRoot}`);
  const physicalRoot = await realpath(workspaceRoot);

  const entries = Object.entries(validateRepositoryMappings(config.repositories));
  const repositories = {};
  for (const [slug, repository] of entries) {
    const repositoryPath = assertDirectWorkspaceChild(workspaceRoot, path.join(workspaceRoot, repository.directory));
    const repositoryStat = await lstat(repositoryPath).catch(() => null);
    if (!repositoryStat?.isDirectory() || repositoryStat.isSymbolicLink()) throw new Error(`repository_directory_missing_or_linked:${slug}`);
    const physicalRepository = await realpath(repositoryPath);
    assertDirectWorkspaceChild(physicalRoot, physicalRepository);

    const gitRoot = await git(repositoryPath, ["rev-parse", "--show-toplevel"]);
    if (comparablePath(gitRoot) !== comparablePath(repositoryPath)) throw new Error(`repository_git_root_mismatch:${slug}`);
    const actualOrigin = await git(repositoryPath, ["remote", "get-url", "origin"]);
    if (normalizeGitRemote(actualOrigin) !== normalizeGitRemote(repository.originUrl)) throw new Error(`repository_origin_mismatch:${slug}`);

    repositories[slug] = { ...repository, path: repositoryPath };
  }

  return { ...config, workspaceRoot, repositories };
}
