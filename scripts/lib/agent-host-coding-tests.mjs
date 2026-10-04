import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from "node:fs";
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
    acceptanceTest: z.string().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal("node_typescript_test"), relativePath: z.string().min(1).max(512),
    sourcePaths: z.array(z.string().min(1).max(512)).min(1).max(8),
    acceptanceTest: z.string().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal("node_typescript_render_test"), relativePath: z.string().min(1).max(512),
    sourcePaths: z.array(z.string().min(1).max(512)).min(1).max(8),
    dependencyRoot: z.string().min(1).max(1024),
    versions: z.object({ react: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
      reactDom: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/), typescript: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/) }).strict(),
    acceptanceTest: z.string().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal("workspace_vitest"), workspace: z.string().min(1).max(200),
    packageName: z.string().regex(/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]{0,79}$/),
    version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/), relativePath: z.string().min(1).max(300),
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
// pnpm's readonly installed packages normally share hardlinks with its store.
// The resolved file stays inside the sealed installation tree; aliases gain no
// write authority, and identity/link-count/content are rechecked before launch.
function dependencyIdentity(file) {
  physicalIdentity(path.dirname(file));
  const stat = lstatSync(file, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink < 1n || realpathSync.native(file) !== file) fail();
  return nativeDigest([file, String(stat.dev), String(stat.ino), String(stat.nlink)]);
}
function dependencyBytes(file, max) {
  const identity = dependencyIdentity(file), first = lstatSync(file, { bigint: true });
  if (first.size > BigInt(max)) fail();
  const bytes = readFileSync(file), second = lstatSync(file, { bigint: true });
  if (BigInt(bytes.length) !== first.size || second.mtimeNs !== first.mtimeNs || dependencyIdentity(file) !== identity) fail();
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
function trackedUnchanged(root, relative) {
  nativeRelative(relative);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP)$/i.test(key)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_TERMINAL_PROMPT: "0" });
  const args = ["--no-replace-objects", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=" + (process.platform === "win32" ? "NUL" : "/dev/null")];
  const bytes = fileBytes(path.join(root, relative), 4 * 1024 * 1024);
  const baseline = execFileSync("git", [...args, "show", `HEAD:${relative}`], { cwd: root, env,
    shell: false, windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
  // Git for Windows may materialize tracked text as CRLF; pin the actual bytes
  // below while checking that the checkout differs only by line endings.
  const text = value => new TextDecoder("utf-8", { fatal: true }).decode(value).replace(/\r\n/g, "\n");
  if (h(text(bytes)) !== h(text(baseline))) fail();
  return { filename: path.join(root, relative), digest: h(bytes), identity: physicalIdentity(path.join(root, relative), false) };
}
const inside = (root, value) => { const relative = path.relative(root, value); return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative); };
function workspaceTestFile(p, command, required = true) {
  const relative = `${command.workspace}/${command.relativePath}`;
  if (!p.writePaths.includes(relative)) fail();
  const file = path.join(p.repositoryPath, relative);
  if (!existsSync(file)) { if (required) fail(); return; }
  const bytes = fileBytes(file, 128 * 1024);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!text.trim() || /\x00/.test(text)) fail();
  return file;
}
function prepareWorkspaceVitest(root, command, writePaths) {
  nativeRelative(command.workspace); nativeRelative(command.relativePath);
  if (!/^apps\/[a-z0-9][a-z0-9_-]{0,79}$/.test(command.workspace)
      || !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.test\.(?:[cm]?[jt]s|[jt]sx)$/.test(command.relativePath)
      || command.acceptanceTest !== `pnpm --filter ${command.packageName} exec vitest run ${command.relativePath}`) fail();
  const directory = path.join(root, command.workspace), workspaceIdentity = physicalIdentity(directory);
  const workspacePackage = trackedUnchanged(root, `${command.workspace}/package.json`), lock = trackedUnchanged(root, "pnpm-lock.yaml");
  const pkg = JSON.parse(fileBytes(workspacePackage.filename, 128 * 1024));
  const specifier = pkg.devDependencies?.vitest ?? pkg.dependencies?.vitest;
  if (pkg.name !== command.packageName || typeof specifier !== "string" || !new RegExp(`^[~^]?${command.version.replaceAll(".", "\\.")}$`).test(specifier)) fail();
  // Deliberately support the inspected pnpm v9 importer shape, not arbitrary YAML
  // tags/aliases or another package manager's mutable dependency resolution.
  const lockText = new TextDecoder("utf-8", { fatal: true }).decode(fileBytes(lock.filename, 4 * 1024 * 1024));
  if (!/^lockfileVersion: ['"]?9\.0['"]?\r?$/m.test(lockText)) fail();
  const marker = `  ${command.workspace}:`, importerLines = lockText.split(/\r?\n/);
  const start = importerLines.indexOf(marker); if (start < 0 || importerLines.lastIndexOf(marker) !== start) fail();
  let end = start + 1; while (end < importerLines.length && (importerLines[end] === "" || importerLines[end].startsWith("    "))) end++;
  const importer = importerLines.slice(start + 1, end).join("\n");
  const dependency = importer.match(/^      vitest:\n        specifier: ([^\n]+)\n        version: ([^\n]+)$/m);
  if (!dependency || dependency[1] !== specifier || dependency[2].split("(")[0] !== command.version) fail();
  const installedRoot = realpathSync.native(path.join(directory, "node_modules", "vitest"));
  if (!inside(path.join(root, "node_modules"), installedRoot)
      && !inside(path.join(directory, "node_modules"), installedRoot)) fail();
  const installedPackage = path.join(installedRoot, "package.json"), installedBytes = dependencyBytes(installedPackage, 128 * 1024);
  const installed = JSON.parse(installedBytes);
  if (installed.name !== "vitest" || installed.version !== command.version || !["./vitest.mjs", "vitest.mjs"].includes(installed.bin?.vitest)) fail();
  const cli = path.join(installedRoot, "vitest.mjs"), cliBytes = dependencyBytes(cli, 4 * 1024 * 1024);
  if (/\x00/.test(new TextDecoder("utf-8", { fatal: true }).decode(cliBytes))) fail();
  const pinned = [workspacePackage, lock, { filename: installedPackage, identity: dependencyIdentity(installedPackage), digest: h(installedBytes), dependency: true },
    { filename: cli, identity: dependencyIdentity(cli), digest: h(cliBytes), dependency: true }];
  const configurationNames = ["vitest", "vite"].flatMap(name => ["ts", "mts", "cts", "js", "mjs", "cjs"].map(extension => `${name}.config.${extension}`));
  const configurations = configurationNames.filter(name => existsSync(path.join(directory, name)));
  for (const name of configurations) pinned.push(trackedUnchanged(root, `${command.workspace}/${name}`));
  const state = { repositoryPath: root, writePaths }; workspaceTestFile(state, command, false);
  return { command, directory, workspaceIdentity, installedRoot, cli, pinned, configurationNames, configurations };
}
function typescriptFile(root, relative, required = true) {
  nativeRelative(relative);
  const filename = path.join(root, relative);
  if (!inside(root, filename)) fail();
  // A missing exact test is allowed only before launch, in an existing physical
  // directory. No newly generated config, alternate executable or glob is used.
  physicalIdentity(path.dirname(filename));
  if (!existsSync(filename)) { if (required) fail(); return; }
  const bytes = fileBytes(filename, 128 * 1024), text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!text.trim() || text.includes("\0")) fail();
  return { filename, identity: physicalIdentity(filename, false), digest: h(bytes) };
}
function optionalPackage(root, directory) {
  const filename = path.join(directory, "package.json");
  if (!inside(root, filename)) fail();
  return existsSync(filename) ? { filename, identity: physicalIdentity(filename, false), digest: h(fileBytes(filename, 128 * 1024)) }
    : { filename, absent: true };
}
function prepareNodeTypescript(root, command, writePaths) {
  nativeRelative(command.relativePath);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.test\.ts$/.test(command.relativePath)
      || !writePaths.includes(command.relativePath)
      || command.acceptanceTest !== `node --experimental-strip-types --test -- ${command.relativePath}`
      || new Set(command.sourcePaths).size !== command.sourcePaths.length) fail();
  const sources = command.sourcePaths.map(relative => {
    nativeRelative(relative);
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.ts$/.test(relative) || /\.(?:test|spec)\.ts$/.test(relative)) fail();
    const pin = trackedUnchanged(root, relative);
    typescriptFile(root, relative);
    return { ...pin, relative, writable: writePaths.includes(relative) };
  });
  typescriptFile(root, command.relativePath, false);
  const directories = new Set([root]);
  for (const relative of [...command.sourcePaths, command.relativePath]) {
    for (let directory = path.dirname(path.join(root, relative)); directory !== root; directory = path.dirname(directory)) {
      if (!inside(root, directory)) fail();
      directories.add(directory);
    }
  }
  return { command, sources, packages: [...directories].map(directory => optionalPackage(root, directory)) };
}
// A private, minimal npm toolkit is provisioned outside the application before
// admission. This runner never installs it or selects an executable from it.
// Complete inventory limits admit TypeScript (~23 MiB, largest file ~9 MiB)
// without permitting an unbounded dependency/configuration tree.
const renderLimits = Object.freeze({ entries: 4096, depth: 16, fileBytes: 16 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 });
function renderInventory(root) {
  const rows = []; let totalBytes = 0;
  function walk(filename, relative, depth) {
    if (depth > renderLimits.depth || rows.length >= renderLimits.entries) fail();
    const stat = lstatSync(filename, { bigint: true });
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) fail();
    const row = { relative, identity: physicalIdentity(filename, stat.isDirectory()), time: String(stat.mtimeNs) };
    if (stat.isFile()) {
      if (stat.nlink !== 1n || stat.size > BigInt(renderLimits.fileBytes)) fail();
      totalBytes += Number(stat.size); if (totalBytes > renderLimits.totalBytes) fail();
      row.bytes = Number(stat.size); row.digest = h(fileBytes(filename, renderLimits.fileBytes));
    }
    rows.push(row);
    if (stat.isDirectory()) {
      const names = readdirSync(filename).sort();
      if (names.length + rows.length > renderLimits.entries) fail();
      for (const name of names) {
        const rel = relative ? `${relative}/${name}` : name;
        if (/[\\:\x00-\x1f]/.test(name) || name === "." || name === "..") fail();
        // The validated lock is flat. A nested dependency/configuration tree
        // could otherwise change bare-import resolution inside a package.
        if (name === "node_modules" && relative) fail();
        const child = path.join(filename, name); if (!inside(root, child)) fail();
        walk(child, rel, depth + 1);
      }
    }
  }
  walk(root, "", 0);
  return { digest: nativeDigest(rows), fileCount: rows.filter(row => row.digest).length, totalBytes };
}
function prepareRenderToolkit(repository, command) {
  const root = command.dependencyRoot;
  if (!path.isAbsolute(root) || path.normalize(root) !== root || root.toLowerCase() === repository.toLowerCase()
      || inside(repository, root) || inside(root, repository)) fail();
  const identity = physicalIdentity(root), inventory = renderInventory(root);
  if (JSON.stringify(readdirSync(root).sort()) !== JSON.stringify(["node_modules", "package-lock.json", "package.json"])) fail();
  const pkg = JSON.parse(fileBytes(path.join(root, "package.json"), 128 * 1024));
  const lock = JSON.parse(fileBytes(path.join(root, "package-lock.json"), 1024 * 1024));
  const declared = { react: command.versions.react, "react-dom": command.versions.reactDom, typescript: command.versions.typescript };
  const sorted = value => Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (!pkg.private || pkg.scripts && Object.keys(pkg.scripts).length || pkg.devDependencies && Object.keys(pkg.devDependencies).length
      || pkg.optionalDependencies && Object.keys(pkg.optionalDependencies).length
      || JSON.stringify(sorted(pkg.dependencies)) !== JSON.stringify(sorted(declared))
      || lock.lockfileVersion !== 3 || !lock.packages || JSON.stringify(sorted(lock.packages[""]?.dependencies)) !== JSON.stringify(sorted(declared))) fail();
  const packages = new Map();
  for (const [relative, entry] of Object.entries(lock.packages)) {
    if (!relative) continue;
    if (!/^node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(relative) || entry.link
        || typeof entry.version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(entry.version)) fail();
    const name = relative.slice("node_modules/".length), installed = JSON.parse(fileBytes(path.join(root, relative, "package.json"), 128 * 1024));
    if (installed.name !== name || installed.version !== entry.version
        || JSON.stringify(sorted(installed.dependencies)) !== JSON.stringify(sorted(entry.dependencies))
        || Object.keys(installed.optionalDependencies ?? {}).length) fail();
    packages.set(name, entry);
  }
  const visited = new Set(), pending = Object.keys(declared);
  while (pending.length) {
    const name = pending.pop(); if (visited.has(name)) continue;
    const entry = packages.get(name); if (!entry || declared[name] && entry.version !== declared[name]) fail();
    visited.add(name); pending.push(...Object.keys(entry.dependencies ?? {}));
  }
  if (visited.size !== packages.size || packages.size > 32) fail();
  const modules = path.join(root, "node_modules"), allowed = new Set([".package-lock.json", ...[...packages.keys()].map(name => name.split("/")[0])]);
  for (const name of readdirSync(modules)) if (!allowed.has(name)) fail();
  for (const name of allowed) if (name.startsWith("@")) {
    const scope = path.join(modules, name);
    const expected = [...packages.keys()].filter(key => key.startsWith(name + "/")).map(key => key.slice(name.length + 1)).sort();
    if (JSON.stringify(readdirSync(scope).sort()) !== JSON.stringify(expected)) fail();
  }
  const installedLock = path.join(modules, ".package-lock.json");
  if (existsSync(installedLock)) {
    const hidden = JSON.parse(fileBytes(installedLock, 1024 * 1024));
    if (hidden.lockfileVersion !== 3 || JSON.stringify(Object.keys(hidden.packages ?? {}).sort()) !== JSON.stringify([...packages.keys()].map(name => `node_modules/${name}`).sort())
        || [...packages].some(([name, entry]) => hidden.packages[`node_modules/${name}`].version !== entry.version)) fail();
  }
  if (renderInventory(root).digest !== inventory.digest) fail();
  return { root, identity, ...inventory, versions: command.versions };
}
function assertRenderToolkit(toolkit) {
  if (physicalIdentity(toolkit.root) !== toolkit.identity || renderInventory(toolkit.root).digest !== toolkit.digest) fail();
}
function renderSourceFile(root, relative) {
  nativeRelative(relative); const filename = path.join(root, relative);
  if (!inside(root, filename)) fail();
  // App composition sources can exceed the original 128 KiB formatter cap.
  const bytes = fileBytes(filename, 1024 * 1024), text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!text.trim() || text.includes("\0")) fail();
  return { filename, identity: physicalIdentity(filename, false), digest: h(bytes) };
}
function prepareNodeRender(root, command, writePaths) {
  nativeRelative(command.relativePath);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.test\.ts$/.test(command.relativePath)
      || !writePaths.includes(command.relativePath)
      || command.acceptanceTest !== `node --experimental-strip-types --test -- ${command.relativePath}`
      || new Set(command.sourcePaths).size !== command.sourcePaths.length) fail();
  const sources = command.sourcePaths.map(relative => {
    nativeRelative(relative);
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*\.tsx?$/.test(relative) || /\.(?:test|spec)\.tsx?$/.test(relative)) fail();
    const pin = trackedUnchanged(root, relative); renderSourceFile(root, relative);
    return { ...pin, relative, writable: writePaths.includes(relative) };
  });
  typescriptFile(root, command.relativePath, false);
  const directories = new Set([root]);
  for (const relative of [...command.sourcePaths, command.relativePath]) {
    for (let directory = path.dirname(path.join(root, relative)); directory !== root; directory = path.dirname(directory)) {
      if (!inside(root, directory)) fail(); directories.add(directory);
    }
  }
  return { command, sources, packages: [...directories].map(directory => optionalPackage(root, directory)), toolkit: prepareRenderToolkit(root, command) };
}
function assertPin(pin) {
  if (pin.absent) { if (existsSync(pin.filename)) fail(); }
  else if (physicalIdentity(pin.filename, false) !== pin.identity || h(fileBytes(pin.filename, 4 * 1024 * 1024)) !== pin.digest) fail();
}
function assertTypescriptScope(p) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP)$/i.test(key)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1", GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null", GIT_TERMINAL_PROMPT: "0" });
  const status = execFileSync("git", ["--no-replace-objects", "--literal-pathspecs", "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false",
    "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"],
    { cwd: p.repositoryPath, env, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 65536, encoding: "utf8" });
  const rows = status.split("\0").filter(Boolean);
  if (rows.length > 128 || rows.some(row => row.length < 4 || row[2] !== " " || !p.writePaths.includes(nativeRelative(row.slice(3))))) fail();
}
function typescriptCandidate(p, item) {
  assertProof(p.proof); assertTypescriptScope(p);
  return [...item.sources.map(source => item.toolkit ? renderSourceFile(p.repositoryPath, source.relative) : typescriptFile(p.repositoryPath, source.relative)),
    typescriptFile(p.repositoryPath, item.command.relativePath)];
}
function nodeTapCounts(chunks, exitCode, relativePath) {
  const output = Buffer.concat(chunks).toString("utf8"), counts = {};
  // Node22 reports an empty test file as a passing file-wrapper subtest. That
  // is process/load evidence, not a registered acceptance assertion.
  const subtests = [...output.matchAll(/^# Subtest: (.+)\r?$/gm)].map(match => match[1].trim().replace(/\\+/g, "/"));
  if (!subtests.length || subtests.some(name => name === relativePath || name.endsWith("/" + relativePath))) fail();
  for (const key of ["tests", "pass", "fail", "cancelled", "skipped", "todo"]) {
    const values = [...output.matchAll(new RegExp(`^# ${key} (\\d+)\\r?$`, "gm"))];
    if (values.length !== 1) fail();
    counts[key] = Number(values[0][1]);
  }
  if (!Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0) || counts.tests < 1
      || counts.pass + counts.fail !== counts.tests || counts.cancelled || counts.skipped || counts.todo
      || exitCode === 0 && (counts.pass !== counts.tests || counts.fail !== 0)) fail();
  return { totalTests: counts.tests, passedTests: counts.pass, failedTests: counts.fail, pendingTests: 0 };
}
export function prepareCodingTests({ manifestPath, repositoryPath, originUrl, acceptanceTests, writePaths = [] }) {
  try {
    if (!path.isAbsolute(manifestPath) || inside(repositoryPath, manifestPath)) fail();
    const bytes = fileBytes(manifestPath, 16384), manifest = manifestSchema.parse(JSON.parse(bytes));
    if (normalizeGitRemote(manifest.repositoryOrigin) !== normalizeGitRemote(originUrl)) fail();
    if (manifest.commands.length !== acceptanceTests.length
        || new Set(manifest.commands.map(x => x.acceptanceTest)).size !== manifest.commands.length
        || acceptanceTests.some(test => !manifest.commands.some(x => x.acceptanceTest === test))) fail();
    const typescriptCommands = manifest.commands.filter(command => ["node_typescript_test", "node_typescript_render_test"].includes(command.kind));
    const packagePath = path.join(repositoryPath, "package.json");
    const packageBytes = manifest.commands.every(command => ["node_typescript_test", "node_typescript_render_test"].includes(command.kind)) && !existsSync(packagePath)
      ? undefined : fileBytes(packagePath, 128 * 1024);
    const pkg = packageBytes ? JSON.parse(packageBytes) : {};
    if (manifest.commands.some(x => x.kind === "npm_script" && pkg.scripts?.[x.script] !== x.expectedCommand)) fail();
    for (const command of manifest.commands) if (command.kind === "node_test") nodeTestFile(repositoryPath, command.relativePath);
    const workspaceCommands = manifest.commands.filter(command => command.kind === "workspace_vitest");
    if (workspaceCommands.length || typescriptCommands.length) { physicalIdentity(repositoryPath);
      if (!Array.isArray(writePaths) || new Set(writePaths).size !== writePaths.length) fail(); for (const relative of writePaths) nativeRelative(relative); }
    if (workspaceCommands.length) trackedUnchanged(repositoryPath, "package.json");
    const workspaces = workspaceCommands.map(command => prepareWorkspaceVitest(repositoryPath, command, writePaths));
    const typescript = typescriptCommands.map(command => command.kind === "node_typescript_render_test"
      ? prepareNodeRender(repositoryPath, command, writePaths) : prepareNodeTypescript(repositoryPath, command, writePaths));
    if (typescript.length && (!/^v22\./.test(process.version) || !process.allowedNodeEnvironmentFlags.has("--experimental-strip-types"))) fail();
    const npm = manifest.commands.some(command => ["npm_script", "node_test"].includes(command.kind))
      ? path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js") : undefined;
    const npmIdentity = npm ? physicalIdentity(npm, false) : undefined, npmDigest = npm ? h(fileBytes(npm, 4 * 1024 * 1024)) : undefined;
    const proof = Object.freeze({});
    proofs.set(proof, { manifestPath, manifestDigest: h(bytes), packagePath, packageAbsent: !packageBytes, packageDigest: packageBytes ? h(packageBytes) : nativeDigest(null),
      repositoryPath, commands: manifest.commands, npm, npmIdentity, npmDigest, runs: 0 });
    const saved = proofs.get(proof); Object.assign(saved, { proof, writePaths: [...writePaths], workspaces, typescript,
      ...(typescript.length ? { repositoryIdentity: physicalIdentity(repositoryPath) } : {}),
      ...(workspaceCommands.length || typescript.length ? { nodeExecutable: process.execPath, nodeVersion: process.version,
        nodeIdentity: dependencyIdentity(process.execPath), nodeDigest: h(dependencyBytes(process.execPath, 128 * 1024 * 1024)) } : {}) });
    return proof;
  } catch { fail(); }
}
function assertProof(proof) {
  const p = proofs.get(proof);
  if (!p || p.runs >= 1 || h(fileBytes(p.manifestPath, 16384)) !== p.manifestDigest
      || p.repositoryIdentity && physicalIdentity(p.repositoryPath) !== p.repositoryIdentity
      || (p.packageAbsent ? existsSync(p.packagePath) : h(fileBytes(p.packagePath, 128 * 1024)) !== p.packageDigest)
      || p.npm && (physicalIdentity(p.npm, false) !== p.npmIdentity || h(fileBytes(p.npm, 4 * 1024 * 1024)) !== p.npmDigest)) fail();
  if (p.workspaces.length || p.typescript.length) {
    if (process.execPath !== p.nodeExecutable || process.version !== p.nodeVersion
        || dependencyIdentity(p.nodeExecutable) !== p.nodeIdentity || h(dependencyBytes(p.nodeExecutable, 128 * 1024 * 1024)) !== p.nodeDigest) fail();
    for (const workspace of p.workspaces) {
      if (physicalIdentity(workspace.directory) !== workspace.workspaceIdentity) fail();
      if (realpathSync.native(path.join(workspace.directory, "node_modules", "vitest")) !== workspace.installedRoot
          || JSON.stringify(workspace.configurationNames.filter(name => existsSync(path.join(workspace.directory, name)))) !== JSON.stringify(workspace.configurations)) fail();
      for (const pin of workspace.pinned) if ((pin.dependency ? dependencyIdentity(pin.filename) : physicalIdentity(pin.filename, false)) !== pin.identity
          || h(pin.dependency ? dependencyBytes(pin.filename, 4 * 1024 * 1024) : fileBytes(pin.filename, 4 * 1024 * 1024)) !== pin.digest) fail();
    }
  }
  for (const item of p.typescript) {
    for (const pin of item.packages) assertPin(pin);
    for (const pin of item.sources) if (!pin.writable) assertPin(pin);
    if (item.toolkit) assertRenderToolkit(item.toolkit);
  }
  return p;
}
async function runOne(p, command, remainingMs, assertAuthority) {
  try {
    assertAuthority();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA)$/i.test(key)));
    Object.assign(env, { npm_config_ignore_scripts: "true", npm_config_audit: "false", npm_config_fund: "false",
      npm_config_update_notifier: "false", GIT_TERMINAL_PROMPT: "0" });
    let bytes = 0; const output = createHash("sha256"), reporterChunks = [];
    const typescript = ["node_typescript_test", "node_typescript_render_test"].includes(command.kind) ? p.typescript.find(item => item.command === command) : undefined;
    if (typescript?.toolkit) env.ROOST_TEST_DEPENDENCY_ROOT = typescript.toolkit.root;
    const candidate = typescript ? typescriptCandidate(p, typescript) : undefined;
    const receipt = await temporaryWindowsJobLauncher(async artifact => {
      if (command.kind === "node_test") nodeTestFile(p.repositoryPath, command.relativePath);
      const workspace = command.kind === "workspace_vitest" ? p.workspaces.find(item => item.command === command) : undefined;
      if (workspace) { assertProof(p.proof); workspaceTestFile(p, command); }
      if (typescript) { assertProof(p.proof); assertTypescriptScope(p); for (const pin of candidate) assertPin(pin); }
      const handle = await startWindowsJob(artifact, { executable: process.execPath,
        argv: command.kind === "npm_script" ? [p.npm, "--ignore-scripts", "run", command.script]
          : workspace ? [workspace.cli, "run", command.relativePath, "--maxWorkers=1", "--fileParallelism=false", "--pool=forks", "--passWithNoTests=false", "--reporter=json"]
          : [ ...(typescript ? ["--experimental-strip-types"] : []), "--test", "--", command.relativePath], cwd: workspace?.directory ?? p.repositoryPath,
        environment: env, input: "", attempt: randomUUID(), durationMs: Math.max(1, Math.min(remainingMs(), 120000)),
        onData: (channel, chunk) => { bytes += chunk.length; if (bytes > 131072) throw Error("output_limit"); output.update(chunk);
          if ((workspace || typescript) && channel === "stdout") reporterChunks.push(chunk); assertAuthority(); } });
      return handle.completion;
    });
    if (!isWindowsJobCleanupReceipt(receipt) || !receipt.cleanup || !receipt.jobClosed || receipt.activeProcesses !== 0
        || receipt.terminationReason !== "root_exit" || !Number.isInteger(receipt.rootExit)) fail();
    assertAuthority();
    if (typescript) { assertProof(p.proof); assertTypescriptScope(p); for (const pin of candidate) assertPin(pin); }
    let testCounts;
    if (typescript) testCounts = nodeTapCounts(reporterChunks, receipt.rootExit, command.relativePath);
    if (command.kind === "workspace_vitest") {
      let report; try { report = JSON.parse(Buffer.concat(reporterChunks).toString("utf8")); } catch { fail(); }
      const counts = [report.numTotalTests, report.numPassedTests, report.numFailedTests, report.numPendingTests];
      if (!counts.every(value => Number.isSafeInteger(value) && value >= 0) || counts[0] < 1
          || counts[1] + counts[2] + counts[3] !== counts[0]
          || receipt.rootExit === 0 && (counts[1] !== counts[0] || report.success !== true)) fail();
      testCounts = { totalTests: counts[0], passedTests: counts[1], failedTests: counts[2], pendingTests: counts[3] };
    }
    return { kind: command.kind, ...(command.kind === "npm_script" ? { script: command.script } : { relativePath: command.relativePath }),
      acceptanceTest: command.acceptanceTest, exitCode: receipt.rootExit,
      outputDigest: output.digest("hex"), outputBytes: bytes, jobDigest: nativeDigest(receipt), ...(testCounts ? { testCounts } : {}),
      ...(typescript ? { runtimeVersion: p.nodeVersion, runtimeDigest: p.nodeDigest,
        sourceDigests: typescript.sources.map((source, index) => ({ relativePath: source.relative, digest: candidate[index].digest })),
        testDigest: candidate.at(-1).digest,
        ...(typescript.toolkit ? { dependencyDigest: typescript.toolkit.digest, dependencyVersions: typescript.toolkit.versions,
          dependencyFileCount: typescript.toolkit.fileCount, dependencyBytes: typescript.toolkit.totalBytes } : {}) } : {}) };
  } catch { fail(); }
}
export async function runCodingTests(proof, { phase, workspaceSeal, remainingMs, assertAuthority }) {
  try {
    const p = assertProof(proof);
    if (phase !== "candidate" || p.runs !== 0 || !/^[a-f0-9]{64}$/.test(workspaceSeal)) fail();
    const results = [];
    for (const command of p.commands) results.push(await runOne(p, command, remainingMs, assertAuthority));
    assertProof(proof);
    p.runs += 1;
    return Object.freeze({ schemaVersion: "roost-coding-tests-v1", phase, manifestDigest: p.manifestDigest,
      packageDigest: p.packageDigest, workspaceSeal, tests: results,
      passed: results.every(x => x.exitCode === 0), digest: nativeDigest([phase, p.manifestDigest, p.packageDigest, workspaceSeal, results]) });
  } catch { fail(); }
}
