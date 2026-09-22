// Opt-in diagnostic helpers. Never imported by Worker/provider startup.
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

export const identityVersion = "roost-hermes-backend-identity-v1";
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const distribution = z.object({ path: z.string().regex(/^venv\/Lib\/site-packages\/hermes_agent-\d+\.\d+\.\d+\.dist-info$/), version }).strict();
const measured = z.object({
  schemaVersion: z.literal(identityVersion), result: z.literal("measured"),
  mechanism: z.literal("isolated_no_site_source_import"), pythonVersion: version,
  interpreter: z.literal("venv/Scripts/python.exe"), moduleOrigin: z.literal("hermes_cli/__init__.py"),
  moduleVersion: z.literal("0.21.2"), metadataVersion: z.literal("0.21.2"),
  distributions: z.array(distribution).min(1).max(4), entrypoint: z.literal("hermes_cli.main:main"),
  mainImported: z.literal(false), siteHooksExecuted: z.literal(false), protocolQualified: z.literal(false),
}).strict();
const blocked = z.object({ schemaVersion: z.literal(identityVersion), result: z.literal("blocked"), reason: z.literal("identity_probe_failed_closed") }).strict();
export function sanitizeIdentity(text) {
  try {
    if (Buffer.byteLength(text) > 8192) throw Error();
    return z.union([measured, blocked]).parse(JSON.parse(text));
  } catch { throw Error("identity_result_invalid"); }
}

export function diagnosticEnvironment(directory, inherited = process.env) {
  const system = Object.entries(inherited).find(([k]) => k.toUpperCase() === "SYSTEMROOT")?.[1];
  if (!system) throw Error("system_root_missing");
  return { SystemRoot: system, WINDIR: system, HOME: directory, USERPROFILE: directory,
    LOCALAPPDATA: directory, APPDATA: directory, TEMP: directory, TMP: directory,
    HERMES_HOME: directory, HERMES_DISABLE_LAZY_INSTALLS: "1", PYTHONDONTWRITEBYTECODE: "1",
    PYTHONNOUSERSITE: "1", PYTHONUTF8: "1" };
}

const targets = ["hermes_cli/__init__.py", "hermes_cli/main.py", "pyproject.toml", "venv/pyvenv.cfg",
  "venv/Scripts/python.exe", "venv/Scripts/hermes.exe", "apps/desktop/release/win-unpacked/Hermes.exe",
  "apps/desktop/release/win-unpacked/resources/app.asar",
  "apps/desktop/release/win-unpacked/resources/app.asar.unpacked/dist/electron-main.mjs"];
for (const v of ["0.21.2", "0.21.3"]) {
  for (const f of ["METADATA", "entry_points.txt", "direct_url.json", "RECORD", "INSTALLER"])
    targets.push(`venv/Lib/site-packages/hermes_agent-${v}.dist-info/${f}`);
}
export async function physical(file, requireExact = true) {
  for (let current = file;; current = path.dirname(current)) {
    if ((await fs.lstat(current)).isSymbolicLink()) throw Error("identity_link_denied");
    if (current === path.dirname(current)) break;
  }
  const canonical = await fs.realpath(file);
  if (requireExact && canonical.toLowerCase() !== path.resolve(file).toLowerCase()) throw Error("identity_path_changed");
  return canonical;
}
export async function fingerprint(file) {
  try {
    const before = await fs.lstat(file, { bigint: true });
    if (!before.isFile() || before.size > 536870912n) throw Error("identity_file_invalid");
    // Windows package redirection can differ for individual descendants. Keep
    // the actual identity in the snapshot; the launch preflight separately
    // requires exact canonical bindings for every managed execution input.
    const canonical = await physical(file, false), hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    const after = await fs.lstat(file, { bigint: true });
    const stamp = s => [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs].map(String).join(":");
    if (stamp(before) !== stamp(after)) throw Error("identity_file_changed");
    return { state: "EXISTS", canonical, fileId: `${before.dev}:${before.ino}`,
      bytes: Number(before.size), stamp: stamp(before), sha256: hash.digest("hex") };
  } catch (error) { if (error.code === "ENOENT") return { state: "MISSING" }; throw error; }
}
export async function snapshotViews(roots) {
  const result = [];
  for (const [view, root] of Object.entries(roots)) {
    await physical(root);
    const names = new Set(view === "pythonBase" ? ["python.exe", "python313.dll", "python3.dll"] : targets);
    if (view !== "pythonBase") {
      const site = path.join(root, "venv/Lib/site-packages");
      for (const n of await fs.readdir(site)) {
        if (/\.pth$|^__editable__.*hermes.*\.py$/.test(n)) names.add(`venv/Lib/site-packages/${n}`);
      }
    }
    if (names.size > 64) throw Error("identity_inventory_limit");
    for (const name of [...names].sort()) result.push({ view, name, ...await fingerprint(path.join(root, name)) });
  }
  return result;
}
export function compareSnapshots(before, after) {
  const key = x => `${x.view}/${x.name}`, a = new Map(before.map(x => [key(x), x])), b = new Map(after.map(x => [key(x), x]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().map(k => {
    const left = a.get(k), right = b.get(k), existsBefore = left?.state === "EXISTS", existsAfter = right?.state === "EXISTS";
    return { view: (left ?? right).view, file: (left ?? right).name,
      state: !existsBefore ? (existsAfter ? "CHANGED" : "MISSING_BEFORE") : !existsAfter ? "MISSING_AFTER"
        : ["canonical", "fileId", "bytes", "stamp", "sha256"].every(p => left[p] === right[p]) ? "SAME" : "CHANGED" };
  });
}
export function publicIdentities(rows) {
  // Labels/relative names only. Canonical machine paths never leave this helper.
  return rows.map(({ view, name, state, fileId, bytes, sha256 }) => ({ view, file: name, state, ...(state === "EXISTS" ? { fileId, bytes, sha256 } : {}) }));
}

export const sharingCriteria = ["physicalIdentity", "effectiveImport", "protocol", "exactBackendEnforced", "updatesAndFallbackDenied", "profileIsolation", "cleanEnvironment"];
export function sharingDecision(evidence) {
  const missing = sharingCriteria.filter(k => evidence[k] !== true);
  return { runtimeDecision: missing.length ? "separate_existing_runtimes" : "shared_runtime_candidate",
    missing, launchAuthorized: false };
}
