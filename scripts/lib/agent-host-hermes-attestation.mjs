import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath, readFile, readdir, writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { terminateWindowsProcessTree } from "./agent-host-execution-lease.mjs";
import contract from "./agent-host-provider-contract.cjs";

const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const sha = value => createHash("sha256").update(value).digest("hex");
const fail = code => { throw new Error(code); };
const cache = new Map();
let stopUncertain = false;
const CODES = ["hermes_attestation_invalid", "hermes_integrity_mismatch", "hermes_probe_unsafe", "hermes_version_failed", "hermes_version_mismatch", "hermes_version_timeout", "hermes_probe_stop_failed"];
export const normalizedWindowsPath = value => typeof value === "string" && /^[a-z]:\\/i.test(value)
  && path.win32.normalize(value) === value && !/[\x00-\x1f<>"|?*]/.test(value) && !value.slice(2).includes(":");

async function canonical(value, directory = false) {
  if (!normalizedWindowsPath(value)) fail("hermes_attestation_invalid");
  const stat = await lstat(value);
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())
    || (await realpath(value)).toLowerCase() !== value.toLowerCase()) fail("hermes_integrity_mismatch");
  return stat;
}
async function fileHash(file, signal) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file, { signal })) hash.update(chunk);
  return hash.digest("hex");
}
async function inventory(root, relative = "", result = []) {
  for (const item of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    if (item.isSymbolicLink()) fail("hermes_integrity_mismatch");
    if (item.isDirectory()) await inventory(root, name, result);
    else if (item.isFile()) result.push(name);
    else fail("hermes_integrity_mismatch");
    if (result.length > 60000) fail("hermes_attestation_invalid");
  }
  return result;
}

// Only operating-system plumbing reaches the diagnostic child. No inherited credentials,
// user profile, Python hooks, Roost config or provider/model settings.
export function versionProbeEnvironment(probeDirectory, source = process.env) {
  const env = {};
  for (const key of ["SYSTEMROOT", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT"]) {
    const entry = Object.entries(source).find(([name]) => name.toUpperCase() === key);
    if (entry) env[key] = entry[1];
  }
  env.PATH = path.win32.join(env.SYSTEMROOT || "C:\\Windows", "System32");
  return { ...env, HERMES_HOME: probeDirectory, PYTHONNOUSERSITE: "1", PYTHONSAFEPATH: "1",
    PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0",
    HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", ALL_PROXY: "http://127.0.0.1:9" };
}
async function readonlyProbe(directory) {
  await canonical(directory, true);
  if ((await readdir(directory)).length) fail("hermes_probe_unsafe");
  const sentinel = path.join(directory, `roost-write-check-${randomUUID()}`);
  try { await writeFile(sentinel, "", { flag: "wx" }); }
  catch (error) { if (["EACCES", "EPERM"].includes(error.code)) return; throw error; }
  await unlink(sentinel); // Only the just-created sentinel; never clear a profile.
  fail("hermes_probe_unsafe");
}

export async function runVersionProbe(executable, options, { spawnProcess = spawn, stop = terminateWindowsProcessTree, timeoutMs = 15000 } = {}) {
  return new Promise(resolve => {
    let output = "", size = 0, failure = null, settled = false, timer;
    const finish = code => { if (settled) return; settled = true; clearTimeout(timer); resolve({ code, output: code ? "" : output }); };
    let child;
    try { child = spawnProcess(executable, ["--version"], { ...options, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); }
    catch { finish("hermes_version_failed"); return; }
    const abort = async code => {
      if (failure || settled) return;
      failure = code;
      try { await stop(child); finish(code); }
      catch { finish("hermes_probe_stop_failed"); }
    };
    const data = chunk => {
      size += chunk.length;
      if (size > 32768) { void abort("hermes_version_failed"); return; }
      if (!failure) output += chunk.toString("utf8");
    };
    child.stdout.on("data", data); child.stderr.on("data", data);
    child.once("error", () => finish("hermes_version_failed"));
    child.once("close", code => { if (!failure) finish(code === 0 ? null : "hermes_version_failed"); });
    timer = setTimeout(() => { void abort("hermes_version_timeout"); }, timeoutMs);
  });
}

// Dependencies are code-only test seams, never selectable by private configuration.
export async function attestHermes(input, { runVersion = runVersionProbe, verifyProbe = readonlyProbe, now = Date.now, useCache = true, expectedPin = pin } = {}) {
  const pin = expectedPin;
  if (stopUncertain) return { blockers: ["hermes_probe_stop_failed"] };
  if (!input.attestation) return { blockers: ["hermes_attestation_missing"] };
  const attestation = input.attestation;
  let key;
  try {
    if (Object.keys(attestation).sort().join(",") !== "manifestPath,sha256" || !/^[a-f0-9]{64}$/.test(attestation.sha256)) fail("hermes_attestation_invalid");
    const stat = await canonical(attestation.manifestPath);
    if (stat.size > 12 * 1024 * 1024) fail("hermes_attestation_invalid");
    const bytes = await readFile(attestation.manifestPath);
    if (sha(bytes) !== attestation.sha256) fail("hermes_attestation_invalid");
    key = `${attestation.sha256}:${input.executablePath}`;
    const cached = cache.get(key);
    // Full disk verification is a startup/config-change snapshot, not heartbeat work.
    // Its timestamp stays unchanged. A restart or standalone checker obtains fresh proof.
    if (useCache && cached) return structuredClone(cached.result);
    const manifest = JSON.parse(bytes);
    if (manifest.schemaVersion !== 1 || manifest.source !== pin.officialSource || manifest.version !== pin.version
      || manifest.commit !== pin.commit || manifest.release !== pin.release || manifest.signature !== "unsigned"
      || manifest.executable !== input.executablePath || !Array.isArray(manifest.roots) || manifest.roots.length !== 2) fail("hermes_attestation_invalid");
    const [checkout, python] = manifest.roots;
    if (checkout.kind !== "checkout" || python.kind !== "pythonBase"
      || input.executablePath !== path.win32.join(checkout.path, "venv", "Scripts", "hermes.exe")) fail("hermes_attestation_invalid");
    const integrityDeadline = AbortSignal.timeout(60000);
    for (const root of manifest.roots) {
      await canonical(root.path, true);
      const names = (await inventory(root.path)).sort();
      if (!Array.isArray(root.files) || names.length !== root.files.length || names.length === 0) fail("hermes_integrity_mismatch");
      const ordered = [...root.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
      for (let i = 0; i < names.length; i++) {
        if (names[i] !== ordered[i].path || !/^[a-f0-9]{64}$/.test(ordered[i].sha256)) fail("hermes_integrity_mismatch");
      }
      // Bound concurrent disk reads and avoid loading the whole Python environment into memory.
      for (let start = 0; start < ordered.length; start += 16) {
        integrityDeadline.throwIfAborted();
        await Promise.all(ordered.slice(start, start + 16).map(async file => {
          const target = path.join(root.path, file.path);
          await canonical(target);
          if (await fileHash(target, integrityDeadline) !== file.sha256) fail("hermes_integrity_mismatch");
        }));
      }
    }
    for (const [name, hash] of Object.entries(pin.sourceHashes)) {
      if (checkout.files.find(file => file.path === name)?.sha256 !== hash) fail("hermes_integrity_mismatch");
    }
    if ((await readFile(path.join(checkout.path, ".git", "HEAD"), "utf8")).trim() !== pin.commit) fail("hermes_integrity_mismatch");
    const cfg = await readFile(path.join(checkout.path, "venv", "pyvenv.cfg"), "utf8");
    if (!/^include-system-site-packages = false\s*$/m.test(cfg)
      || !cfg.split(/\r?\n/).some(line => line.toLowerCase() === `home = ${python.path}`.toLowerCase())) fail("hermes_integrity_mismatch");
    const launcher = await readFile(input.executablePath);
    const binding = path.win32.join(checkout.path, "venv", "Scripts", "python.exe").toLowerCase();
    const bindings = [...launcher.toString("latin1").matchAll(/#!([^\r\n]+)/g)];
    if (bindings.length !== 1 || bindings[0][1].replace(/^"|"$/g, "").toLowerCase() !== binding) fail("hermes_integrity_mismatch");
    await verifyProbe(manifest.probeDirectory);
    const result = await runVersion(input.executablePath, { cwd: checkout.path, env: versionProbeEnvironment(manifest.probeDirectory) });
    if (result.code) {
      if (result.code === "hermes_probe_stop_failed") stopUncertain = true;
      fail(CODES.includes(result.code) ? result.code : "hermes_version_failed");
    }
    const versions = [...result.output.matchAll(/^Hermes Agent v(\d+\.\d+\.\d+) \([^\r\n]+\)\s*$/gm)];
    if (versions.length !== 1 || versions[0][1] !== pin.version) fail("hermes_version_mismatch");
    if ((await readdir(manifest.probeDirectory)).length) fail("hermes_probe_unsafe");
    const report = { blockers: [], installation: { status: "verified", version: pin.version,
      fingerprint: attestation.sha256.slice(0, 12), checkedAt: new Date(now()).toISOString(), signature: "unsigned" } };
    if (useCache) { cache.clear(); cache.set(key, { time: now(), result: report }); }
    return report;
  } catch (error) {
    const result = { blockers: [CODES.includes(error.message) ? error.message : "hermes_attestation_invalid"] };
    // A failed check is also a snapshot: do not create an automatic probe retry loop.
    if (key && useCache) { cache.clear(); cache.set(key, { result }); }
    return result;
  }
}
