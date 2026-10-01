import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { createReleaseBackupGateway, encryptReleaseBackup, decryptReleaseBackup, generateOneTimeRecoveryCode,
  acknowledgeRecoveryCode } from "./lib/agent-host-release-backup.mjs";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const containerId = "a".repeat(64);
const d = "b".repeat(64), data = "c".repeat(64);
const archiveBytes = Buffer.from("PGDMP synthetic fixture only; no credentials");
const fingerprints = Buffer.from(`${d}  -\n${data}  -\n`);
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "roost-backup-fixture-"));
  const repo = path.join(root, "repository"), backup = path.join(root, "backups"), privateDir = path.join(root, "private");
  for (const dir of [repo, backup, privateDir]) mkdirSync(dir);
  const cfg = { installationId: randomUUID(), repositoryRoot: repo, laptopFolder: backup,
    restoreKeyFile: path.join(privateDir, "restore.key"), recoveryAcknowledgmentFile: path.join(privateDir, "recovery-ack.json"),
    source: { sshHost: "fixture", container: containerId, user: "fixture", database: "source_fixture" },
    restore: { sshHost: "fixture", container: containerId, user: "fixture", database: "postgres" }, maxDumpBytes: 1024 * 1024, timeoutMs: 10000 };
  const key = randomBytes(32); writeFileSync(cfg.restoreKeyFile, key);
  const secret = generateOneTimeRecoveryCode({ installationId: cfg.installationId, repositoryRoot: repo, receiptFile: cfg.recoveryAcknowledgmentFile });
  const acknowledgment = acknowledgeRecoveryCode({ installationId: cfg.installationId, repositoryRoot: repo,
    receiptFile: cfg.recoveryAcknowledgmentFile, ...secret, storedOffDevice: true });
  const cleanup = () => { assert(path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("roost-backup-fixture-")); rmSync(root, { recursive: true }); key.fill(0); };
  return { root, cfg, key, secret, acknowledgment, cleanup };
}
function syntheticTransport({ failRestore = false, wrongFingerprint = false, changedSource = false, ambiguousCreate = false,
  changedOwnership = false, activeRestoreSession = false } = {}) {
  let database = null, marker = null, oid = null, fingerprintsRead = 0; const calls = [];
  const transport = async request => {
    calls.push(request.operation); const text = request.stdin?.toString() ?? "";
    switch (request.operation) {
      case "fingerprint": fingerprintsRead++; return Buffer.from(wrongFingerprint && database !== null && request.endpoint.database === database
        || changedSource && fingerprintsRead === 2 ? `${d}  -\n${"e".repeat(64)}  -\n` : fingerprints);
      case "dump": return Buffer.from(archiveBytes);
      case "restore_inspect": return Buffer.from(database === null ? "" : `${oid}${text.includes("shobj_description") ? `:${marker}` : ""}\n`);
      case "restore_create": {
        database = /CREATE DATABASE "([^"]+)"/.exec(text)[1]; marker = /IS '([^']+)'/.exec(text)[1]; oid = "987";
        if (ambiguousCreate) throw Error("transport lost after create");
        return Buffer.from(`${oid}:${marker}\n`);
      }
      case "restore": if (changedOwnership) marker = "unrelated-owner"; if (failRestore) throw Error("synthetic restore failure"); return Buffer.alloc(0);
      case "restore_sessions": return Buffer.from(activeRestoreSession ? "1\n" : "0\n");
      case "restore_drop": assert(text.includes(`DROP DATABASE "${database}"`) && /^roost_restore_[a-f0-9]{32}$/.test(database)); database = null; return Buffer.alloc(0);
      default: throw Error("unexpected operation");
    }
  };
  return { transport, calls, database: () => database };
}

test("AES GCM archive authenticates payload and exact installation; plaintext is absent from encrypted copy", () => {
  const key = randomBytes(32), installationId = randomUUID(), now = new Date().toISOString();
  const encrypted = encryptReleaseBackup(archiveBytes, key, { installationId, backupId: randomUUID(), createdAt: now,
    database: "fixture", schemaDigest: d, dataDigest: data, restoreVerifiedAt: now });
  assert(!encrypted.includes(archiveBytes));
  const restored = decryptReleaseBackup(encrypted, key, installationId); assert.deepEqual(restored.archive, archiveBytes);
  assert.equal(restored.metadata.archiveDigest, sha(archiveBytes));
  for (const position of [encrypted.length - 19, encrypted.length - 1]) {
    const corrupt = Buffer.from(encrypted); corrupt[position] ^= 1;
    assert.throws(() => decryptReleaseBackup(corrupt, key, installationId), /authentication_failed/);
  }
  assert.throws(() => decryptReleaseBackup(encrypted, randomBytes(32), installationId), /authentication_failed/);
  assert.throws(() => decryptReleaseBackup(encrypted, key, randomUUID()), /installation_mismatch/);
});

test("recovery code is generated once, stored only as a salted hash and requires exact off-device acknowledgment", () => {
  const f = fixture();
  try {
    const receipt = readFileSync(f.cfg.recoveryAcknowledgmentFile, "utf8"); assert(!receipt.includes(f.secret.code));
    const parsed = JSON.parse(receipt); assert.equal(parsed.storedOffDevice, true); assert(parsed.acknowledgedAt); assert.equal(f.acknowledgment.acknowledgmentDigest, sha(receipt));
    assert.throws(() => generateOneTimeRecoveryCode({ installationId: f.cfg.installationId, repositoryRoot: f.cfg.repositoryRoot, receiptFile: f.cfg.recoveryAcknowledgmentFile }), /already_generated/);
    assert.throws(() => acknowledgeRecoveryCode({ installationId: f.cfg.installationId, repositoryRoot: f.cfg.repositoryRoot,
      receiptFile: f.cfg.recoveryAcknowledgmentFile, ...f.secret, storedOffDevice: true }), /already_recorded/);
    const second = path.join(path.dirname(f.cfg.recoveryAcknowledgmentFile), "pending-ack.json");
    const code = generateOneTimeRecoveryCode({ installationId: f.cfg.installationId, repositoryRoot: f.cfg.repositoryRoot, receiptFile: second });
    assert.throws(() => acknowledgeRecoveryCode({ installationId: f.cfg.installationId, repositoryRoot: f.cfg.repositoryRoot, receiptFile: second, ...code, storedOffDevice: false }), /ack_invalid/);
    assert.throws(() => acknowledgeRecoveryCode({ installationId: f.cfg.installationId, repositoryRoot: f.cfg.repositoryRoot, receiptFile: second,
      challengeId: code.challengeId, code: "x".repeat(43), storedOffDevice: true }), /code_invalid/);
    assert.equal(JSON.parse(readFileSync(second)).acknowledgedAt, null);
  } finally { f.cleanup(); }
});

test("successful backup promotes only authenticated verified copy after exact owned restore is absent", async () => {
  const f = fixture(), sim = syntheticTransport();
  try {
    const result = await createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify();
    assert.equal(result.restoreDatabaseAbsent, true); assert.equal(result.latestVerifiedCopy, true); assert.equal(sim.database(), null);
    assert(sim.calls.indexOf("restore_drop") < sim.calls.lastIndexOf("restore_inspect"));
    const files = readdirSync(f.cfg.laptopFolder); assert.deepEqual(files, ["roost-latest-verified.enc"]);
    const encrypted = readFileSync(path.join(f.cfg.laptopFolder, files[0])); assert.equal(result.encryptedDigest, sha(encrypted));
    assert.deepEqual(decryptReleaseBackup(encrypted, f.key, f.cfg.installationId).archive, archiveBytes);
    assert(!JSON.stringify(result).includes(f.secret.code));
    const gateway=createReleaseBackupGateway(f.cfg,{transport:sim.transport});
    assert.equal(gateway.verifyPrerequisites(result).digest,result.archiveDigest);
    assert.throws(()=>gateway.verifyPrerequisites({...result,restoreVerified:false}),/prerequisite_receipt_invalid/);
    assert.throws(()=>gateway.verifyPrerequisites({...result,archiveDigest:'9'.repeat(64)}),/prerequisite_receipt_invalid/);
    const tampered=Buffer.from(encrypted);tampered[tampered.length-20]^=1;writeFileSync(path.join(f.cfg.laptopFolder,files[0]),tampered);
    assert.throws(()=>gateway.verifyPrerequisites(result),/latest_readback_mismatch/);
  } finally { f.cleanup(); }
});

test("restore failure/mismatch and moving source retain previous latest and clean only qualified owned DB", async () => {
  for (const options of [{ failRestore: true }, { wrongFingerprint: true }, { changedSource: true }]) {
    const f = fixture(), sim = syntheticTransport(options), previous = Buffer.from("previous latest remains byte-exact");
    try {
      const latest = path.join(f.cfg.laptopFolder, "roost-latest-verified.enc"); writeFileSync(latest, previous);
      await assert.rejects(createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify(), /release_backup_/);
      assert.deepEqual(readFileSync(latest), previous); assert.equal(sim.database(), null);
      assert.deepEqual(readdirSync(f.cfg.laptopFolder), ["roost-latest-verified.enc"]);
      if (options.changedSource) assert(!sim.calls.includes("restore_create")); else assert(sim.calls.includes("restore_drop"));
    } finally { f.cleanup(); }
  }
});

test("ambiguous create preserves uncertain owned resources and lock instead of guessing or retrying", async () => {
  const f = fixture(), sim = syntheticTransport({ ambiguousCreate: true });
  try {
    await assert.rejects(createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify(), /operation_restore_create_unproven/);
    assert.equal(sim.calls.filter(x => x === "restore_create").length, 1); assert(!sim.calls.includes("restore_drop"));
    // An uncertain create is recorded as an unresolved attempt, not silently
    // treated as safely cleaned or allowed to run another backup.
    assert(sim.database()); assert(existsSync(path.join(f.cfg.laptopFolder, ".roost-backup.lock")));
    const inspect = await createReleaseBackupGateway(f.cfg, { transport: sim.transport }).inspectInterruptedBackup();
    assert(inspect.unresolvedAttempt && inspect.ownershipVerified && !inspect.restoreAbsent);
    await assert.rejects(createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify(), /backup_already_active_or_unreconciled/);
    assert.equal(sim.calls.filter(x => x === "restore_create").length, 1);
  } finally { f.cleanup(); }
});

test("keys inside backup/repository, mutable service names and unacknowledged recovery fail before DB calls", async () => {
  const f = fixture(), sim = syntheticTransport();
  try {
    for (const overrides of [{ restoreKeyFile: path.join(f.cfg.laptopFolder, "key") }, { laptopFolder: f.cfg.repositoryRoot },
      { source: { ...f.cfg.source, container: "postgres" } }, { restore: { ...f.cfg.source } }]) {
      assert.throws(() => createReleaseBackupGateway({ ...f.cfg, ...overrides }, { transport: sim.transport }));
    }
    const receipt = JSON.parse(readFileSync(f.cfg.recoveryAcknowledgmentFile)); receipt.storedOffDevice = false; receipt.acknowledgedAt = null;
    writeFileSync(f.cfg.recoveryAcknowledgmentFile, JSON.stringify(receipt));
    await assert.rejects(createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify(), /recovery_ack_required/);
    assert.deepEqual(sim.calls, []);
  } finally { f.cleanup(); }
});

test("changed restore ownership or active sessions preserves DB and fence; changed key denies before source dump", async () => {
  for (const options of [{ changedOwnership: true }, { activeRestoreSession: true }]) {
    const f = fixture(), sim = syntheticTransport(options);
    try {
      await assert.rejects(createReleaseBackupGateway(f.cfg, { transport: sim.transport }).backupAndVerify(), /release_backup_restore_/);
      assert(!sim.calls.includes("restore_drop")); assert(sim.database());
      assert(!existsSync(path.join(f.cfg.laptopFolder, "roost-latest-verified.enc")));
      assert(existsSync(path.join(f.cfg.laptopFolder, ".roost-backup.lock")));
      const inspected = await createReleaseBackupGateway(f.cfg, { transport: sim.transport }).inspectInterruptedBackup();
      assert.equal(inspected.ownershipUnproven, !!options.changedOwnership);
    } finally { f.cleanup(); }
  }
  const f = fixture(), sim = syntheticTransport();
  try {
    const gateway = createReleaseBackupGateway(f.cfg, { transport: sim.transport }); writeFileSync(f.cfg.restoreKeyFile, randomBytes(32));
    await assert.rejects(gateway.backupAndVerify(), /private_file_changed/); assert.deepEqual(sim.calls, []);
  } finally { f.cleanup(); }
});

test("real local PostgreSQL synthetic custom archive restores exact schema/data, encrypted copy decrypts, DBs absent", async t => {
  let nativeContainer;
  try { nativeContainer = execFileSync("docker", ["compose", "ps", "--status", "running", "-q", "postgres"], { windowsHide: true, encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { t.skip("Existing local Docker PostgreSQL unavailable; no service started"); return; }
  if (!/^[a-f0-9]{64}$/.test(nativeContainer)) { t.skip("Existing local Docker PostgreSQL unavailable; no service started"); return; }
  const source = `roost_backup_fixture_${randomBytes(12).toString("hex")}`, f = fixture(), calls = [];
  const docker = (args, input) => execFileSync("docker", ["exec", ...(input ? ["-i"] : []), nativeContainer, ...args],
    { windowsHide: true, input, maxBuffer: 8 * 1024 * 1024, timeout: 30000, stdio: ["pipe", "pipe", "ignore"] });
  const sql = (db, text) => docker(["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", db], Buffer.from(text));
  const cfg = { ...f.cfg, source: { sshHost: "fixture", container: nativeContainer, user: "companycore", database: source },
    restore: { sshHost: "fixture", container: nativeContainer, user: "companycore", database: "postgres" } };
  const transport = async req => {
    calls.push(req.operation); assert.equal(req.endpoint.container, nativeContainer);
    if (req.operation === "fingerprint") {
      assert(/^roost_(?:backup_fixture_[a-f0-9]{24}|restore_[a-f0-9]{32})$/.test(req.endpoint.database));
      // Execute the actual fixed normalization pipeline on existing PostgreSQL,
      // rather than claiming a fake fingerprint is native restore evidence.
      const common = `--no-owner --no-acl --quote-all-identifiers -U companycore -d ${req.endpoint.database}`;
      const suffix = " | sed -e '/^\\\\restrict /d' -e '/^\\\\unrestrict /d' | sha256sum";
      // Extract only the fixed gateway program's quoted psql input. No dispatch
      // or test-supplied SQL is compiled into this operational fingerprint.
      const quoted = req.command.replace(/^bash -o pipefail -c '/, "").slice(0, -1).replaceAll("'\\''", "'");
      const rowPart = quoted.slice(quoted.indexOf("printf %s "));
      const prefix = `docker exec -i '${nativeContainer}' psql '-X' '-qAt' '-v' 'ON_ERROR_STOP=1' '-U' 'companycore' '-d' '${req.endpoint.database}'`;
      assert(rowPart.includes(prefix)); const rows = rowPart.replace(prefix, `psql -X -qAt -v ON_ERROR_STOP=1 -U companycore -d ${req.endpoint.database}`);
      return docker(["bash", "-o", "pipefail", "-c", `pg_dump --schema-only ${common}${suffix}; ${rows}`]);
    }
    if (req.operation === "dump") return docker(["pg_dump", "--format=custom", "--no-owner", "--no-acl", "--serializable-deferrable", "-U", "companycore", "-d", source]);
    if (req.operation === "restore") return docker(["pg_restore", "--exit-on-error", "--no-owner", "--no-acl", "-U", "companycore", "-d", req.endpoint.database], req.stdin);
    return sql("postgres", req.stdin.toString("utf8"));
  };
  sql("postgres", `CREATE DATABASE "${source}" TEMPLATE template0;`);
  try {
    sql(source, `CREATE TABLE sample(id bigserial PRIMARY KEY, body text NOT NULL, nested jsonb); INSERT INTO sample(body,nested) VALUES ('synthetic α','{"array":[1,2]}'),('quote '' and newline' || chr(10) || 'row','{"null":null}'); CREATE INDEX sample_body_idx ON sample(body); CREATE SEQUENCE not_called_yet; SELECT setval('not_called_yet',42,false);`);
    const result = await createReleaseBackupGateway(cfg, { transport }).backupAndVerify(); assert(result.restoreVerified && result.latestVerifiedCopy);
    const encrypted = readFileSync(path.join(cfg.laptopFolder, "roost-latest-verified.enc")); const decoded = decryptReleaseBackup(encrypted, f.key, cfg.installationId);
    assert.equal(sha(decoded.archive), result.archiveDigest); assert.equal(decoded.metadata.schemaDigest, result.schemaDigest);
    assert(!encrypted.includes(Buffer.from("synthetic α"))); decoded.archive.fill(0);
    assert.equal(sql("postgres", `SELECT count(*) FROM pg_database WHERE datname LIKE 'roost_restore_%' AND shobj_description(oid,'pg_database') LIKE 'roost-isolated-restore:${cfg.installationId}:%';`).toString().trim(), "0");
    assert(calls.includes("restore_drop")); assert.equal(sql(source, "SELECT count(*) FROM sample;").toString().trim(), "2");
  } finally {
    assert(/^roost_backup_fixture_[a-f0-9]{24}$/.test(source)); sql("postgres", `DROP DATABASE "${source}";`);
    assert.equal(sql("postgres", `SELECT count(*) FROM pg_database WHERE datname='${source}';`).toString().trim(), "0"); f.cleanup();
  }
});
