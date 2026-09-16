// Explicit owner-authorized, Writer-held derived-cache reconciliation only.
// Never import/execute Hermes or reinterpret new package/source files as caches.
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, lstatSync, renameSync, unlinkSync, openSync, closeSync, fsyncSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertWriterLock } from "./agent-host-writer-lock.mjs";
import { physicalIdentity } from "./agent-host-native-footprint.mjs";
import { hermesGeneratedReceiptSchema, hermesImmutableRootsSchema, installationInventory, installationGeneratedPath, verifyHermesSplitInventory } from "./agent-host-hermes-installation-split.mjs";
import contract from "./agent-host-provider-contract.cjs";
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const sha = b => createHash("sha256").update(b).digest("hex"), json = v => Buffer.from(JSON.stringify(v, null, 2) + "\n");
const fail = code => { throw Object.assign(new Error(code), { protocolAdmission: true, retryable: false }); };
const compiler = `import sys,json,marshal,types,os\nitems=json.load(sys.stdin)\nfor item in items:\n data=open(item['cache'],'rb').read()\n code=marshal.loads(data[16:])\n assert isinstance(code,types.CodeType)\n allowed={os.path.normcase(os.path.abspath(item['source'])),os.path.normcase(os.path.abspath(item.get('canonicalSource',item['source'])))}\n assert os.path.normcase(os.path.abspath(code.co_filename)) in allowed\n expected=compile(open(item['source'],'rb').read(),code.co_filename,'exec',dont_inherit=True,optimize=item['optimize'])\n assert code==expected\n def names(c):\n  assert c.co_filename==code.co_filename\n  for sub in c.co_consts:\n   if isinstance(sub,types.CodeType): names(sub)\n names(code)\nprint(json.dumps({'verifiedBodies':len(items),'version':list(sys.version_info[:3])}))\n`;
export function verifyHermesGeneratedBodies(python, input, cwd, suppliedEnvironment) {
  const env = suppliedEnvironment ?? {};
  if (!suppliedEnvironment) for (const key of ["SYSTEMROOT", "WINDIR", "TEMP", "TMP"])
    for (const name of Object.keys(process.env).filter(n => n.toUpperCase() === key)) env[key] = process.env[name];
  let result;
  try { result = JSON.parse(execFileSync(python, ["-I", "-S", "-B", "-c", compiler], { cwd, env, input: JSON.stringify(input),
    windowsHide: true, timeout: 60000, maxBuffer: 8192, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] })); }
  catch { fail("hermes_generated_body_unproven"); }
  if (JSON.stringify(result.version) !== "[3,13,1]" || result.verifiedBodies !== input.length) fail("hermes_generated_interpreter_changed");
  return result;
}
function read(file, cap = 12 * 1024 * 1024) {
  physicalIdentity(file, false); if (lstatSync(file).size > cap) fail("hermes_generated_record_invalid");
  const bytes = readFileSync(file); return { bytes, value: JSON.parse(bytes) };
}
function durable(file, bytes, exclusive = false) {
  const fd = openSync(file, exclusive ? "wx" : "w", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
// Independent two-file publication seam, also used with synthetic receipts.
// The caller has already verified payloads; this never grants runtime authority.
export function publishHermesGeneratedReceipt({ writer, attestationPath, generatedPath, beforeAttestation, beforeGenerated,
  nextAttestation, nextGenerated, phase = () => {} }) {
  assertWriterLock(writer); physicalIdentity(attestationPath, false); physicalIdentity(generatedPath, false);
  if (path.dirname(attestationPath) !== path.dirname(generatedPath) || attestationPath === generatedPath
      || beforeAttestation.length > 262144 || nextAttestation.length > 262144
      || beforeGenerated.length > 12 * 1024 * 1024 || nextGenerated.length > 12 * 1024 * 1024) fail("hermes_generated_transaction_invalid");
  if (!readFileSync(attestationPath).equals(beforeAttestation) || !readFileSync(generatedPath).equals(beforeGenerated)) fail("hermes_generated_transaction_stale");
  const id = randomUUID(), journal = path.join(path.dirname(attestationPath), `roost-generated-transaction-${id}.json`);
  const backups = [journal + ".before-attestation", journal + ".before-generated"], pending = [generatedPath + `.next-${id}`, attestationPath + `.next-${id}`];
  const events = []; let changed = false;
  const log = event => { events.push(event); durable(journal, json({ schemaVersion: 1, id, events,
    oldAttestation: sha(beforeAttestation), oldGenerated: sha(beforeGenerated), newAttestation: sha(nextAttestation), newGenerated: sha(nextGenerated) }), events.length === 1); };
  try {
    durable(backups[0], beforeAttestation, true); durable(backups[1], beforeGenerated, true);
    log("prepared"); phase("prepared"); assertWriterLock(writer);
    durable(pending[0], nextGenerated, true); durable(pending[1], nextAttestation, true);
    if (!readFileSync(attestationPath).equals(beforeAttestation) || !readFileSync(generatedPath).equals(beforeGenerated)) fail("hermes_generated_transaction_stale");
    changed = true; renameSync(pending[0], generatedPath); log("generated_published"); phase("generated_published");
    assertWriterLock(writer); renameSync(pending[1], attestationPath); log("attestation_published"); phase("attestation_published");
    if (!readFileSync(generatedPath).equals(nextGenerated) || !readFileSync(attestationPath).equals(nextAttestation)) fail("hermes_generated_transaction_readback_failed");
    log("complete");
  } catch (error) {
    try {
      assertWriterLock(writer);
      if (changed) { durable(generatedPath, beforeGenerated); durable(attestationPath, beforeAttestation); }
      log("rolled_back");
    } catch { fail("hermes_generated_reconciliation_required"); }
    throw error;
  } finally {
    // Exact files created by this invocation only; never remove another journal.
    if (events.at(-1) === "complete" || events.at(-1) === "rolled_back")
      for (const file of [...backups, ...pending]) if (existsSync(file)) unlinkSync(file);
  }
  return { transactionDigest: sha(readFileSync(journal)), updated: true };
}
export function reconcileHermesGeneratedReceipt({ installation, writer, assertOwnerAuthority }) {
  if (typeof assertOwnerAuthority !== "function") fail("hermes_generated_owner_authority_required");
  assertOwnerAuthority(); assertWriterLock(writer);
  const attestation = read(installation.attestationPath, 262144), record = attestation.value;
  const manifestInput = read(installation.manifestPath), manifest = manifestInput.value;
  if (record.manifestPath !== installation.manifestPath || sha(manifestInput.bytes) !== record.manifestSha256
      || manifest.schemaVersion !== 2 || manifest.commit !== pin.commit || manifest.version !== pin.version
      || path.dirname(record.generatedReceiptPath) !== path.dirname(installation.attestationPath)) fail("hermes_generated_binding_invalid");
  const original = read(record.generatedReceiptPath), old = hermesGeneratedReceiptSchema.parse(original.value);
  if (sha(original.bytes) !== record.generatedReceiptSha256 || old.immutableDigest !== record.manifestSha256 || old.generation !== record.generation) fail("hermes_generated_binding_invalid");
  const roots = hermesImmutableRootsSchema.parse(manifest.roots), inputs = [], generatedRoots = [];
  let changed = 0, added = 0, removed = 0;
  for (const [index, root] of roots.entries()) {
    physicalIdentity(root.path);
    const immutable = new Map(root.files.map(f => [f.path, f])), previous = new Map(old.roots[index].files.map(f => [f.path, f])), files = [];
    for (const name of installationInventory(root.path).filter(installationGeneratedPath)) {
      const target = path.join(root.path, name), bytes = readFileSync(target);
      const match = /^(?:(.*)\/)?__pycache__\/([^/]+)\.cpython-313(?:\.opt-([12]))?\.pyc$/.exec(name);
      if (name !== ".bytecode-fingerprint" && !match) fail("hermes_generated_mapping_invalid");
      const source = name === ".bytecode-fingerprint" ? ".git/HEAD" : `${match[1] ? match[1] + "/" : ""}${match[2]}.py`;
      if (!immutable.has(source)) fail("hermes_generated_orphan_cache");
      const row = { path: name, sha256: sha(bytes), size: bytes.length, source, sourceSha256: immutable.get(source).sha256,
        kind: match ? "cpython-313" : "checkout-fingerprint" };
      files.push(row);
      if (JSON.stringify(previous.get(name)) !== JSON.stringify(row)) {
        if (previous.has(name)) changed++; else added++;
        if (match) inputs.push({ cache: target, source: path.join(root.path, source), optimize: Number(match[3] ?? 0) });
      }
      previous.delete(name);
    }
    removed += previous.size; generatedRoots.push({ kind: root.kind, files });
  }
  const proposed = { ...old, roots: generatedRoots };
  // Full immutable SHA pass BEFORE invoking the trusted isolated compiler. New
  // source/packages, missing files, orphan mappings and header drift all block.
  const verified = verifyHermesSplitInventory(manifest, manifestInput.bytes, proposed, record);
  if (!changed && !added && !removed) return { status: "PASS", updated: false, immutableFiles: verified.immutableFiles, generatedFiles: verified.generatedFiles, changed: 0, added: 0, removed: 0, verifiedBodies: 0 };
  const python = path.join(roots[1].path, "python.exe");
  if (sha(readFileSync(python)) !== old.interpreterDigest) fail("hermes_generated_interpreter_changed");
  const compilation = verifyHermesGeneratedBodies(python, inputs, roots[1].path);
  verifyHermesSplitInventory(manifest, manifestInput.bytes, proposed, record);
  assertOwnerAuthority(); assertWriterLock(writer);
  const nextGenerated = json(proposed), nextRecord = json({ ...record, generatedReceiptSha256: sha(nextGenerated) });
  const publication = publishHermesGeneratedReceipt({ writer, attestationPath: installation.attestationPath, generatedPath: record.generatedReceiptPath,
    beforeAttestation: attestation.bytes, beforeGenerated: original.bytes, nextAttestation: nextRecord, nextGenerated });
  if (!readFileSync(installation.manifestPath).equals(manifestInput.bytes)) fail("hermes_generated_immutable_changed");
  return { status: "PASS", ...publication, immutableFiles: verified.immutableFiles, generatedFiles: verified.generatedFiles,
    changed, added, removed, verifiedBodies: compilation.verifiedBodies };
}
