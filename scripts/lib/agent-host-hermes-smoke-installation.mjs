// Read data only: never import Python, execute a provider command, or inspect
// credential contents. The historical unsigned installation manifest is input
// evidence; exact registry/source hashes and a fresh complete inventory bind it.
import path from "node:path";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
import contract from "./agent-host-provider-contract.cjs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const proofs = new WeakMap();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const denied = code => { throw Object.assign(new Error(code), { protocolAdmission: true, retryable: false }); };
export const hermesSmokeModelSources = Object.freeze({
  "hermes_cli/codex_models.py": "573cb2fa5550652433c17c493523d895506ea1979837d310db01daf396d0ac04",
  "hermes_cli/model_normalize.py": "ffdfe2e7f6418c5ace0107716e85097fc7ace3cddb199e72e35f5ee117571f71",
  "agent/reasoning_effort.py": "a7865ac3a805efd5b1444f57b0a397df3f17ccf1c927964d2eff17589fa0c79a",
  "agent/transports/codex.py": "1b4d48515c0ddac7db53b3446e69da92dcdc773a5e59dd80b2bec17d49c65103"
});
const credentialName = rel => /(^|\/)(?:\.env|\.op\.env|auth\.json|credentials?(?:\.json|\.yaml|\.yml)?|cookies?(?:\.json|\.sqlite|\.txt)?|\.codex)(?:\/|$)/i.test(rel);
function readJson(file, cap) {
  physicalIdentity(file, false);
  if (lstatSync(file).size > cap) denied("hermes_smoke_manifest_invalid");
  const bytes = readFileSync(file); return { value: JSON.parse(bytes), bytes };
}
function inventory(root, relative = "", result = []) {
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() || credentialName(rel)) denied("hermes_smoke_inventory_unsafe");
    if (entry.isDirectory()) inventory(root, rel, result);
    else if (entry.isFile()) result.push(rel); else denied("hermes_smoke_inventory_unsafe");
    if (result.length > 60000) denied("hermes_smoke_inventory_limit");
  }
  return result;
}
async function hashFile(file, signal) {
  const digest = createHash("sha256");
  for await (const bytes of createReadStream(file, { signal })) digest.update(bytes);
  return digest.digest("hex");
}
function installationFile(file) {
  physicalIdentity(path.dirname(file));
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync.native(file).toLowerCase() !== file.toLowerCase()) denied("hermes_smoke_integrity_changed");
  // Package-manager hardlinks are permitted by the existing B3 installation
  // manifest contract; hash their bytes, never reinterpret them as workspace files.
}
export async function verifyHermesSmokeInstallation({ attestationPath, manifestPath }) {
  try {
    const record = readJson(attestationPath, 262144).value, { value: manifest, bytes } = readJson(manifestPath, 12 * 1024 * 1024);
    if (sha(bytes) !== record.manifestSha256 || record.manifestPath !== manifestPath
        || manifest.schemaVersion !== 1 || manifest.version !== pin.version || manifest.commit !== pin.commit
        || manifest.source !== pin.officialSource || manifest.release !== pin.release || manifest.signature !== "unsigned"
        || manifest.roots?.length !== 2) denied("hermes_smoke_manifest_invalid");
    const [checkout, python] = manifest.roots;
    if (checkout.kind !== "checkout" || python.kind !== "pythonBase"
        || manifest.executable !== path.join(checkout.path, "venv", "Scripts", "hermes.exe")) denied("hermes_smoke_layout_invalid");
    const timeout = AbortSignal.timeout(60000); let count = 0;
    for (const root of manifest.roots) {
      physicalIdentity(root.path);
      const names = inventory(root.path).sort(), expected = new Map(root.files.map(f => [f.path, f.sha256]));
      if (!names.length || names.length !== root.files.length || names.length !== expected.size
          || names.some(n => !/^[a-f0-9]{64}$/.test(expected.get(n) ?? ""))) denied("hermes_smoke_inventory_changed");
      for (let i = 0; i < names.length; i += 16) {
        timeout.throwIfAborted();
        await Promise.all(names.slice(i, i + 16).map(async name => {
          const file = path.join(root.path, name); installationFile(file);
          if (await hashFile(file, timeout) !== expected.get(name)) denied("hermes_smoke_integrity_changed");
          count++;
        }));
      }
      if (JSON.stringify(inventory(root.path).sort()) !== JSON.stringify(names)) denied("hermes_smoke_inventory_changed");
    }
    const sources = { ...pin.sourceHashes, ...hermesSmokeModelSources };
    for (const [file, hash] of Object.entries(sources)) {
      if (checkout.files.find(row => row.path === file)?.sha256 !== hash
          || sha(readFileSync(path.join(checkout.path, file))) !== hash) denied("hermes_smoke_source_changed");
    }
    if (readFileSync(path.join(checkout.path, ".git", "HEAD"), "utf8").trim() !== pin.commit
        || !/^__version__ = "0\.21\.2"\s*$/m.test(readFileSync(path.join(checkout.path, "hermes_cli", "__init__.py"), "utf8"))) denied("hermes_smoke_version_changed");
    const cfg = readFileSync(path.join(checkout.path, "venv", "pyvenv.cfg"), "utf8");
    if (!/^include-system-site-packages = false\s*$/m.test(cfg)
        || !cfg.split(/\r?\n/).some(l => l.toLowerCase() === `home = ${python.path}`.toLowerCase())) denied("hermes_smoke_python_changed");
    const executable = manifest.executable, launcher = readFileSync(executable);
    const bindings = [...launcher.toString("latin1").matchAll(/#!([^\r\n]+)/g)];
    if (bindings.length !== 1 || bindings[0][1].replace(/^"|"$/g, "").toLowerCase() !== path.join(checkout.path, "venv", "Scripts", "python.exe").toLowerCase()) denied("hermes_smoke_launcher_changed");
    const receipt = Object.freeze({ schemaVersion: "roost-hermes-smoke-installation-v1", version: pin.version, commit: pin.commit,
      signature: "unsigned", inventoryFiles: count, manifestDigest: sha(bytes), executableDigest: sha(launcher),
      model: "gpt-5.6-sol", reasoning: "medium", modelAlias: false, reasoningClamped: false });
    proofs.set(receipt, { executable, checkout: checkout.path, identity: physicalIdentity(executable, false), sources,
      at: Date.now(), monotonic: performance.now() });
    return receipt;
  } catch (e) {
    denied(e.protocolAdmission ? e.message : "hermes_smoke_installation_unverified");
  }
}
export function assertHermesSmokeInstallation(receipt, executable) {
  const saved = proofs.get(receipt);
  if (!saved || saved.executable !== executable || performance.now() < saved.monotonic || performance.now() - saved.monotonic >= 60000
      || Date.now() < saved.at || Date.now() - saved.at >= 60000) denied("hermes_smoke_installation_unverified");
  if (physicalIdentity(executable, false) !== saved.identity || realpathSync.native(executable) !== executable
      || sha(readFileSync(executable)) !== receipt.executableDigest) denied("hermes_smoke_integrity_changed");
  for (const [file, digest] of Object.entries(saved.sources))
    if (sha(readFileSync(path.join(saved.checkout, file))) !== digest) denied("hermes_smoke_source_changed");
  return receipt;
}
