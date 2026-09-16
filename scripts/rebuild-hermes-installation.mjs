// Explicit, file-verified maintenance. This command never starts/imports Hermes.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { acquireWriterLock, assertWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { hermesNativeProfileBinding, renderHermesNativeProfile, inspectHermesProfile } from "./lib/agent-host-hermes-profile.mjs";
import { rebindOwnerAttestation } from "./lib/agent-host-hermes-owner-auth.mjs";
import { installationInventory, installationGeneratedPath, verifyHermesSplitInventory } from "./lib/agent-host-hermes-installation-split.mjs";
import { verifyHermesDistributions } from "./lib/agent-host-hermes-distributions.mjs";
import { swapHermesEnvironment, rebuildDirectoryIdentity, removeOwnedRebuildTree } from "./lib/agent-host-hermes-rebuild-transaction.mjs";
import { verifyHermesSmokeInstallation, hermesSmokeModelSources } from "./lib/agent-host-hermes-smoke-installation.mjs";
import contract from "./lib/agent-host-provider-contract.cjs";
const sha = b => createHash("sha256").update(b).digest("hex"), json = v => Buffer.from(JSON.stringify(v, null, 2) + "\n");
const fail = code => { throw new Error(code); };
const pin = contract.registry.providers.find(p => p.kind === "hermes_codex");
const normalize = name => name.toLowerCase().replace(/[-_.]+/g, "-");
const pinnedTool = "c3f337907f233811954d96e0ecf2d46df094413250ebdcd10d40d9b5c48febd2";
const pinnedBuild = { "setuptools-83.0.0-py3-none-any.whl": "29b23c360f22f414dc7336bb39178cc7bcbf6021ed2733cde173f09dba19abb3",
  "wheel-0.48.0-py3-none-any.whl": "3217dcc807155e45db462d7ef2431f5ddda0d7273b700d05a67b271ceb1287ab" };
function metadataTree(root, ignore = new Set(), relative = "", rows = []) {
  for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    if (ignore.has(name)) continue;
    const stat = fs.lstatSync(path.join(root, name), { bigint: true });
    if (stat.isSymbolicLink() || rows.length >= 60000) fail("rebuild_private_metadata_unsafe");
    rows.push([name, String(stat.ino), String(stat.size), String(stat.mtimeNs)]);
    if (item.isDirectory()) metadataTree(root, ignore, name, rows);
  }
  return rows;
}
function processExclusion(checkout, self) {
  const quoted = checkout.replaceAll("'", "''");
  const ps = `$ErrorActionPreference='Stop'; $root='${quoted}'; $items=@(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne ${self} -and (($_.ExecutablePath -and $_.ExecutablePath.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) -or ($_.CommandLine -and $_.CommandLine.IndexOf($root,[StringComparison]::OrdinalIgnoreCase) -ge 0)) }); if($items.Count -ne 0){exit 7}`;
  try { execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")], { windowsHide: true, stdio: "pipe", timeout: 20000 }); }
  catch { fail("rebuild_process_exclusion_unproven"); }
}
function buildEnvironment(staging, temp) {
  const env = {};
  for (const key of ["SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "COMSPEC", "USERPROFILE", "APPDATA", "LOCALAPPDATA"])
    for (const name of Object.keys(process.env).filter(n => n.toUpperCase() === key)) env[key] = process.env[name];
  return { ...env, TEMP: temp, TMP: temp, UV_PROJECT_ENVIRONMENT: staging, UV_PYTHON_DOWNLOADS: "never",
    UV_KEYRING_PROVIDER: "disabled", UV_LINK_MODE: "copy", UV_COMPILE_BYTECODE: "0", PYTHONNOUSERSITE: "1",
    PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1", GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
}
function sourceInventory(manifest, checkout, staging) {
  const roots = [], generated = [], input = [];
  for (const root of manifest.roots) {
    const files = [], caches = [];
    const names = installationInventory(root.path).filter(n => root.kind !== "checkout" || (!n.startsWith("venv/") && !n.startsWith(path.basename(staging) + "/")));
    if (root.kind === "checkout") names.push(...installationInventory(staging).map(n => "venv/" + n));
    for (const name of names.sort()) {
      const physical = root.kind === "checkout" && name.startsWith("venv/") ? path.join(staging, name.slice(5)) : path.join(root.path, name);
      const bytes = fs.readFileSync(physical), row = { path: name, sha256: sha(bytes), size: bytes.length };
      if (!installationGeneratedPath(name)) { files.push(row); continue; }
      if (name === ".bytecode-fingerprint") {
        const source = ".git/HEAD"; caches.push({ ...row, source, sourceSha256: sha(fs.readFileSync(path.join(root.path, source))), kind: "checkout-fingerprint" }); continue;
      }
      const match = /^(?:(.*)\/)?__pycache__\/([^/]+)\.cpython-313(?:\.opt-([12]))?\.pyc$/.exec(name);
      if (!match) fail("rebuild_generated_mapping_invalid");
      const source = `${match[1] ? match[1] + "/" : ""}${match[2]}.py`;
      const physicalSource = root.kind === "checkout" && source.startsWith("venv/") ? path.join(staging, source.slice(5)) : path.join(root.path, source);
      const sourceSha256 = sha(fs.readFileSync(physicalSource));
      caches.push({ ...row, source, sourceSha256, kind: "cpython-313" });
      input.push({ cache: physical, source: physicalSource, canonicalSource: path.join(root.path, source), optimize: Number(match[3] ?? 0) });
    }
    roots.push({ kind: root.kind, path: root.path, files }); generated.push({ kind: root.kind, files: caches });
  }
  return { roots, generated, input };
}
// Isolated base interpreter, stdlib only. marshal decodes inert code objects;
// compile generates the reference in memory. No exec, eval or provider imports.
const bytecodeVerifier = `import sys,json,marshal,types,os\nitems=json.load(sys.stdin)\nfor item in items:\n data=open(item['cache'],'rb').read()\n code=marshal.loads(data[16:])\n assert isinstance(code,types.CodeType)\n allowed={os.path.normcase(os.path.abspath(item['source'])),os.path.normcase(os.path.abspath(item['canonicalSource']))}\n assert os.path.normcase(os.path.abspath(code.co_filename)) in allowed\n expected=compile(open(item['source'],'rb').read(),code.co_filename,'exec',dont_inherit=True,optimize=item['optimize'])\n assert code==expected\n def names(c):\n  assert c.co_filename==code.co_filename\n  for sub in c.co_consts:\n   if isinstance(sub,types.CodeType): names(sub)\n names(code)\nprint(json.dumps({'verifiedBodies':len(items),'version':list(sys.version_info[:3])}))\n`;

export async function rebuildHermesInstallation({ attestationPath, profileBindingPath, stateDirectory }) {
  if (process.platform !== "win32") fail("rebuild_windows_required");
  // Windows packaged-app filesystem redirection can give the caller an alias.
  // Resolve explicit inputs once; all later guards use their physical paths.
  attestationPath = fs.realpathSync.native(attestationPath);
  profileBindingPath = fs.realpathSync.native(profileBindingPath);
  stateDirectory = fs.realpathSync.native(stateDirectory);
  const base = fs.realpathSync.native(path.dirname(attestationPath)), record = JSON.parse(fs.readFileSync(attestationPath));
  const checkout = record.checkout, manifestPath = record.manifestPath, oldManifestBytes = fs.readFileSync(manifestPath), oldManifest = JSON.parse(oldManifestBytes);
  if (record.commit !== pin.commit || record.version !== pin.version || sha(oldManifestBytes) !== record.manifestSha256
      || oldManifest.schemaVersion !== 1 || record.uvSha256 !== pinnedTool || sha(fs.readFileSync(record.uvExecutable)) !== pinnedTool
      || record.pythonVersion !== "3.13.1" || record.uvVersion !== "0.11.8" || oldManifest.roots[0].path !== checkout) fail("rebuild_original_provenance_invalid");
  rebuildDirectoryIdentity(base); rebuildDirectoryIdentity(checkout);
  if (fs.readdirSync(checkout).some(n => n.startsWith("venv.b16-"))) fail("rebuild_prior_transaction_requires_reconciliation");
  const originalVenvIdentity = rebuildDirectoryIdentity(path.join(checkout, "venv"));
  const writer = await acquireWriterLock(stateDirectory), generation = randomUUID();
  const staging = path.join(checkout, `venv.b16-staging-${generation}`), rollback = staging.replace("venv.b16-staging-", "venv.b16-rollback-");
  const scratch = path.join(base, `roost-b16-build-${generation}`), journalPath = path.join(base, `roost-b16-transaction-${generation}.json`);
  let stagingIdentity, scratchIdentity, swapStarted = false, committed = false, retainWriter = false;
  const events = [], buildJournal = path.join(base, `roost-b16-build-journal-${generation}.json`);
  const notify = phase => {
    events.push(phase); if (events.length > 64) fail("rebuild_journal_limit");
    const fd = fs.openSync(buildJournal, events.length === 1 ? "wx" : "w", 0o600);
    try { fs.writeFileSync(fd, json({ schemaVersion: 1, generation, pin: pin.commit, events })); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    process.stdout.write(JSON.stringify({ phase }) + "\n");
  };
  const excludeProcesses = async () => { assertWriterLock(writer); if (fs.readdirSync(stateDirectory).some(n => n.endsWith(".lease"))) fail("rebuild_application_lease_present"); processExclusion(checkout, process.pid); };
  try {
    notify("preflight_started");
    await excludeProcesses();
    const free = fs.statfsSync(base); if (free.bavail * free.bsize < 1024 ** 3) fail("rebuild_disk_capacity_insufficient");
    for (const root of oldManifest.roots) for (const row of root.files) if (!installationGeneratedPath(row.path))
      if (sha(fs.readFileSync(path.join(root.path, row.path))) !== row.sha256) fail("rebuild_original_immutable_changed");
    if (fs.readFileSync(path.join(checkout, ".git/HEAD"), "utf8").trim() !== pin.commit) fail("rebuild_source_pin_changed");
    for (const [name, digest] of Object.entries({ ...pin.sourceHashes, ...hermesSmokeModelSources }))
      if (sha(fs.readFileSync(path.join(checkout, name))) !== digest) fail("rebuild_source_pin_changed");
    const oldBindingBytes = fs.readFileSync(profileBindingPath), oldBinding = JSON.parse(oldBindingBytes);
    inspectHermesProfile(oldBinding, checkout);
    const home = path.dirname(oldBinding.profilePath), untouched = metadataTree(home, new Set(["config.yaml", "owner-attestation.json", path.basename(profileBindingPath)]));
    const spent = ["hermes-b13-smoke-consumed.json", "hermes-b14-smoke-consumed.json"].map(n => ({ file: path.join(stateDirectory, n), bytes: fs.readFileSync(path.join(stateDirectory, n)) }));
    const dependenciesPath = path.join(base, "roost-installed-dependencies.json"), dependencies = JSON.parse(fs.readFileSync(dependenciesPath));
    if (dependencies.length !== 83) fail("rebuild_original_closure_invalid");
    const nextBinding = hermesNativeProfileBinding(oldBinding.profilePath), owner = rebindOwnerAttestation(oldBinding, nextBinding); nextBinding.ownerAttestation = owner.binding;
    const lock = fs.readFileSync(path.join(checkout, "uv.lock"), "utf8"), packages = lock.split("[[package]]").slice(1);
    for (const d of dependencies.filter(d => !["hermes-agent", "wheel"].includes(normalize(d.name)))) {
      const block = packages.find(p => new RegExp(`^name = "${normalize(d.name)}"$`, "m").test(p) && p.includes(`version = "${d.version}"`));
      if (!block || !block.includes('source = { registry = "https://pypi.org/simple" }')) fail("rebuild_lock_closure_unproven");
    }
    if (record.buildRequirements.length !== 2 || record.buildRequirements.some(r => pinnedBuild[r.filename] !== r.sha256 || !r.url.startsWith("https://files.pythonhosted.org/packages/"))) fail("rebuild_build_wheels_unpinned");
    fs.mkdirSync(scratch); scratchIdentity = rebuildDirectoryIdentity(scratch); const env = buildEnvironment(staging, scratch);
    const steps = [];
    function uv(step, args, networkAllowed = false) {
      notify(step); const baseArgs = [...args, "--no-config", "--no-python-downloads", "--no-progress"];
      for (const offline of networkAllowed ? [true, false] : [true]) {
        try {
          const output = execFileSync(record.uvExecutable, [...baseArgs, ...(offline ? ["--offline"] : [])], { cwd: checkout, env, windowsHide: true, timeout: 180000, maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
          steps.push({ step, exitCode: 0, offline, stdoutDigest: sha(output) }); return;
        } catch (error) {
          const message = error.stderr?.toString() ?? "";
          if (!(offline && networkAllowed && /offline|network connectivity is disabled|not found in the cache/i.test(message))) throw Object.assign(new Error("rebuild_pinned_build_failed"), { step, buildExit: error.status });
        }
      }
      fail("rebuild_pinned_artifact_unavailable");
    }
    notify("preflight_verified");
    uv("create_relocatable_staging", ["venv", "--no-project", "--relocatable", "--no-managed-python", "--python", record.pythonExecutable, staging]);
    stagingIdentity = rebuildDirectoryIdentity(staging);
    const requirements = path.join(scratch, "build-requirements.txt");
    fs.writeFileSync(requirements, record.buildRequirements.map(r => `${r.url} --hash=sha256:${r.sha256}`).join("\n") + "\n", { flag: "wx" });
    uv("install_exact_build_wheels", ["pip", "install", "--python", path.join(staging, "Scripts/python.exe"), "--no-deps", "--no-build", "--require-hashes", "--link-mode", "copy", "-r", requirements], true);
    // Keep only the two separately hash-pinned build wheels already installed
    // in this new empty environment. Exact 83-distribution readback below is
    // mandatory: --inexact is never used against the drifted old environment.
    uv("sync_frozen_core_mcp", ["sync", "--frozen", "--inexact", "--extra", "mcp", "--no-default-groups", "--no-build-isolation", "--no-managed-python", "--python", record.pythonExecutable, "--link-mode", "copy"], true);
    await excludeProcesses();
    const distributions = verifyHermesDistributions(staging, dependencies);
    const stagedFiles = installationInventory(staging);
    // Match import roots/dist-info, not the unrelated JMESPath syntax lexer
    // shipped inside the pinned Pygments distribution.
    if (stagedFiles.some(n => /^Lib\/site-packages\/(boto3|botocore|jmespath|s3transfer)([\/._-]|$)/i.test(n) || n === "Scripts/jp.py")) fail("rebuild_optional_aws_present");
    for (const n of stagedFiles.filter(n => n.startsWith("Lib/site-packages/") && !installationGeneratedPath(n)))
      if (!distributions.owned.has(n) && !["Lib/site-packages/_virtualenv.pth", "Lib/site-packages/_virtualenv.py"].includes(n)) fail("rebuild_package_payload_unowned");
    const inventory = sourceInventory(oldManifest, checkout, staging);
    // Every original non-venv immutable source/base file must remain exact, and
    // no new checkout/base source may be silently added to a fresh manifest.
    for (const [i, root] of inventory.roots.entries()) {
      const expected = new Map(oldManifest.roots[i].files.filter(f => !installationGeneratedPath(f.path) && !(i === 0 && f.path.startsWith("venv/"))).map(f => [f.path, f.sha256]));
      const current = root.files.filter(f => !(i === 0 && f.path.startsWith("venv/")));
      if (current.length !== expected.size || current.some(f => expected.get(f.path) !== f.sha256)) fail("rebuild_source_or_base_drift");
    }
    let pyResult;
    try { pyResult = JSON.parse(execFileSync(record.pythonExecutable, ["-I", "-S", "-B", "-c", bytecodeVerifier], { cwd: scratch, env, input: JSON.stringify(inventory.input), encoding: "utf8", windowsHide: true, timeout: 120000, maxBuffer: 8192, stdio: ["pipe", "pipe", "pipe"] })); }
    catch { fail("rebuild_generated_body_unproven"); }
    if (JSON.stringify(pyResult.version) !== "[3,13,1]" || pyResult.verifiedBodies !== inventory.input.length) fail("rebuild_generated_body_unproven");
    const cfg = fs.readFileSync(path.join(staging, "pyvenv.cfg"), "utf8"), exe = fs.readFileSync(path.join(staging, "Scripts/hermes.exe"));
    const bindings = [...exe.toString("latin1").matchAll(/#!([^\r\n]+)/g)];
    if (!/^relocatable = true\s*$/m.test(cfg) || bindings.length !== 1 || bindings[0][1].replace(/^"|"$/g, "").toLowerCase() !== "python.exe") fail("rebuild_relocatable_launcher_unqualified");
    const buildReportPath = path.join(base, "roost-b16-build-report.json"), generatedPath = path.join(base, "roost-worker-generated.json");
    const buildReport = json({ schemaVersion: 1, generation, policy: "roost-hermes-rebuild-v1", commit: pin.commit,
      frozen: true, selection: "core+mcp", lockDigest: sha(Buffer.from(lock)), toolDigest: pinnedTool,
      buildRequirements: record.buildRequirements, steps, distributions: distributions.distributions,
      recordRows: distributions.recordRows, hashedRows: distributions.hashedRows, generatedVerification: pyResult });
    const nextBindingBytes = json(nextBinding), manifest = { ...oldManifest, schemaVersion: 2, roots: inventory.roots,
      maintenance: { policy: "roost-hermes-rebuild-v1", lazyInstalls: "denied",
        packageTool: { path: record.uvExecutable, sha256: pinnedTool }, buildReport: { path: buildReportPath, sha256: sha(buildReport) },
        dependencies: { path: dependenciesPath, sha256: sha(fs.readFileSync(dependenciesPath)) }, profileBinding: { path: profileBindingPath, sha256: sha(nextBindingBytes) } } };
    const manifestBytes = json(manifest), generated = { schemaVersion: "roost-hermes-generated-v1", generation, immutableDigest: sha(manifestBytes),
      interpreterDigest: inventory.roots[1].files.find(f => f.path === "python.exe").sha256, compiler: "cpython-3.13.1-source-verified", roots: inventory.generated };
    const generatedBytes = json(generated), nextRecord = { ...record, generation, stage: "rebuild_verified_pilot_blocked", executablePresent: true,
      executableSha256: sha(exe), manifestSha256: sha(manifestBytes), generatedReceiptPath: generatedPath, generatedReceiptSha256: sha(generatedBytes) };
    const preserve = () => {
      if (JSON.stringify(metadataTree(home, new Set(["config.yaml", "owner-attestation.json", path.basename(profileBindingPath)]))) !== JSON.stringify(untouched)) fail("rebuild_private_state_changed");
      for (const item of spent) if (!fs.readFileSync(item.file).equals(item.bytes)) fail("rebuild_spent_record_changed");
    };
    const updates = [{ file: oldBinding.profilePath, bytes: Buffer.from(renderHermesNativeProfile()) }, { file: path.join(home, "owner-attestation.json"), bytes: Buffer.from(owner.bytes) },
      { file: profileBindingPath, bytes: nextBindingBytes }, { file: buildReportPath, bytes: buildReport }, { file: manifestPath, bytes: manifestBytes },
      { file: generatedPath, bytes: generatedBytes }, { file: attestationPath, bytes: json(nextRecord) }];
    // Staging hashes/RECORDs and compiler validation above precede any rename.
    notify("staging_verified"); preserve(); const oldVenvIdentity = rebuildDirectoryIdentity(path.join(checkout, "venv")); swapStarted = true;
    const result = await swapHermesEnvironment({ writer, checkout, staging, rollback, journalPath, updates, excludeProcesses,
      verifyStaging: async () => {
        preserve(); verifyHermesDistributions(staging, dependencies);
        const current = sourceInventory(oldManifest, checkout, staging);
        if (JSON.stringify(current.roots) !== JSON.stringify(inventory.roots) || JSON.stringify(current.generated) !== JSON.stringify(inventory.generated)) fail("rebuild_staging_changed");
      },
      verifyCanonical: async () => {
        // The rollback tree is a specifically owned transaction artifact, never
        // a general venv/temp exemption. Validate the canonical tree separately
        // before removing it, then run the full admission after cleanup below.
        verifyHermesSplitInventory(manifest, manifestBytes, generated, nextRecord, { writer, rollback, identity: oldVenvIdentity });
        verifyHermesDistributions(path.join(checkout, "venv"), dependencies); inspectHermesProfile(nextBinding, checkout); preserve();
      }, phase: notify });
    committed = true;
    preserve(); const receipt = await verifyHermesSmokeInstallation({ attestationPath, manifestPath });
    verifyHermesSplitInventory(manifest, manifestBytes, generated, nextRecord);
    notify("admission_verified");
    return { ...result, immutableFiles: receipt.split.immutableFiles, generatedFiles: receipt.split.generatedFiles,
      distributions: distributions.distributions.length, generatedBodiesVerified: pyResult.verifiedBodies,
      ownerIdentityAndExpiryPreserved: true, privateStatePreserved: true, spentRecordsPreserved: true, providerStarted: false };
  } catch (error) {
    if (committed) error.committed = true;
    if (error.message === "rebuild_rollback_requires_reconciliation") retainWriter = true;
    if (stagingIdentity && fs.existsSync(staging) && (!swapStarted || (!fs.existsSync(journalPath)
        && !fs.existsSync(rollback) && rebuildDirectoryIdentity(path.join(checkout, "venv")) === originalVenvIdentity)))
      removeOwnedRebuildTree(checkout, staging, stagingIdentity);
    notify("blocked");
    throw error;
  } finally {
    try {
      if (scratchIdentity && fs.existsSync(scratch)) {
        if (rebuildDirectoryIdentity(scratch) !== scratchIdentity || path.dirname(scratch) !== base || !/^roost-b16-build-[a-f0-9-]{36}$/.test(path.basename(scratch))) fail("rebuild_scratch_identity_changed");
        installationInventory(scratch); fs.rmSync(scratch, { recursive: true });
      }
    } finally { if (!retainWriter) await writer.release(); }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [attestationPath, profileBindingPath, stateDirectory] = process.argv.slice(2);
  if (!attestationPath || !profileBindingPath || !stateDirectory || process.argv.length !== 5) fail("rebuild_explicit_paths_required");
  try { process.stdout.write(JSON.stringify(await rebuildHermesInstallation({ attestationPath, profileBindingPath, stateDirectory })) + "\n"); }
  catch (error) { process.stderr.write(JSON.stringify({ status: "BLOCKED", reason: error.message, step: error.step, buildExit: error.buildExit, distribution: error.distribution, installedVersion: error.installedVersion, expectedVersion: error.expectedVersion, missing: error.missing, rolledBack: Boolean(error.rolledBack), committed: Boolean(error.committed), cause: error.cause?.message }) + "\n"); process.exitCode = 1; }
}
