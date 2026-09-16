import path from "node:path";
import { watch, readFileSync, lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
const sha = b => createHash("sha256").update(b).digest("hex");
const violation = () => Object.assign(new Error("hermes_smoke_installation_boundary_violation"), {
  boundaryViolation: true, protocolAdmission: true, retryable: false });
export function hermesGeneratedEventAllowed(name, files, directories, kind) {
  if (typeof name !== "string" || name.includes(":") || name.split("/").some(n => !n || n === "." || n === "..")) return false;
  if (directories.has(name)) return true;
  if (name === ".bytecode-fingerprint") return kind === "checkout";
  if (name === "__pycache__" || name.endsWith("/__pycache__")) {
    const prefix = name.slice(0, -"__pycache__".length);
    return [...files].some(f => f.startsWith(prefix) && !f.slice(prefix.length).includes("/") && f.endsWith(".py"));
  }
  const match = /^(?:(.*)\/)?__pycache__\/([^/]+)\.cpython-313(?:\.opt-[12])?\.pyc(?:\.\d+)?$/.exec(name);
  return Boolean(match && files.has(`${match[1] ? match[1] + "/" : ""}${match[2]}.py`));
}
// A fail-closed activity alarm, not a claim of kernel isolation or perfect
// transient observation. Full SHA/RECORD/generated-body checks remain required
// after the genuine Job has ended. Never inspect auth/session files.
export function watchHermesInstallation({ installation, writer }) {
  assertWriterLock(writer);
  physicalIdentity(installation.attestationPath, false); physicalIdentity(installation.manifestPath, false);
  const record = JSON.parse(readFileSync(installation.attestationPath)), bytes = readFileSync(installation.manifestPath), manifest = JSON.parse(bytes);
  if (sha(bytes) !== record.manifestSha256 || manifest.schemaVersion !== 2) throw violation();
  const watchers = [], roots = []; let changed = false, closed = false;
  try {
    for (const root of manifest.roots) {
      const identity = physicalIdentity(root.path), files = new Set(root.files.map(f => f.path)), directories = new Set();
      for (const file of files) for (let dir = path.posix.dirname(file); dir !== "."; dir = path.posix.dirname(dir)) directories.add(dir);
      roots.push({ path: root.path, identity });
      const watcher = watch(root.path, { recursive: true }, (_event, filename) => {
        const name = typeof filename === "string" ? filename.replaceAll("\\", "/") : null;
        if (!hermesGeneratedEventAllowed(name, files, directories, root.kind)) changed = true;
      });
      watcher.on("error", () => { changed = true; }); watchers.push(watcher);
    }
  } catch { watchers.forEach(w => w.close()); throw violation(); }
  return Object.freeze({
    assertUnchanged() {
      assertWriterLock(writer);
      if (closed || changed || roots.some(r => physicalIdentity(r.path) !== r.identity || !lstatSync(r.path).isDirectory())) throw violation();
    },
    close() { if (!closed) { watchers.forEach(w => w.close()); closed = true; } return { observedViolation: changed, coverage: "filesystem_notifications_plus_full_post_run_inventory" }; }
  });
}
