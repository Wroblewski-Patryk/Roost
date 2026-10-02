import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { createReleaseBackupGateway, encryptReleaseBackup, decryptReleaseBackup, generateOneTimeRecoveryCode,
  acknowledgeRecoveryCode } from "./lib/agent-host-release-backup.mjs";
import { buildReleaseFingerprintCommand, releaseFingerprintSql, releaseFingerprintDeadlines }
  from './lib/agent-host-release-fingerprint.mjs';

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

test('shared fingerprint retains historical SQL bytes and remote deadlines end before client deadline', () => {
  assert.equal(sha(releaseFingerprintSql), 'c793e0c55e221787cb92a8c631347051bbf38e9241ccddf3ab86454caf74a48f');
  for (const timeoutMs of [1000, 10000, 30000, 300000, 1800000]) {
    const deadlines = releaseFingerprintDeadlines(timeoutMs);
    assert(deadlines.statementMs > 0 && deadlines.lockMs <= deadlines.statementMs);
    assert(deadlines.statementMs < deadlines.remoteMs);
    assert(deadlines.remoteMs + deadlines.cleanupMs < timeoutMs);
    const command = buildReleaseFingerprintCommand({ container: containerId, user: 'fixture', database: 'fixture' }, timeoutMs);
    assert.match(command, /^docker exec -i '[a-f0-9]{64}' bash -e -o pipefail -c /);
    assert.match(command, /set -m; fingerprint_owner=\$BASHPID/);
    assert.match(command, /kill -TERM -- -"\$fingerprint_child"/);
    assert.match(command, /kill -KILL -- "\$fingerprint_leaf"/);
    assert.doesNotMatch(command, /kill -KILL -- -/);
    assert.match(command, /bash -e -o pipefail -c/);
    assert.match(command, /--lock-wait-timeout=/);
    assert.match(command, /export PGOPTIONS=/);
    assert.match(command, /wait "\$fingerprint_timer"/);
    assert.doesNotMatch(command, /\btimeout -s|setsid/);
  }
  for (const invalid of [999, 1800001, 300000.5, '300000'])
    assert.throws(() => releaseFingerprintDeadlines(invalid));
});

test('backup uses its existing timeout for shared fingerprints; timeout retains previous verified copy', async () => {
  const f = fixture(), previous = Buffer.from('previous verified copy');
  try {
    const latest = path.join(f.cfg.laptopFolder, 'roost-latest-verified.enc'); writeFileSync(latest, previous);
    const requests = [];
    const transport = async request => { requests.push(request); throw Error('synthetic timeout'); };
    await assert.rejects(createReleaseBackupGateway(f.cfg, { transport }).backupAndVerify(), /operation_fingerprint_unproven/);
    assert.equal(requests.length, 1); assert.equal(requests[0].operation, 'fingerprint');
    assert.equal(requests[0].timeoutMs, f.cfg.timeoutMs);
    assert.equal(requests[0].command, buildReleaseFingerprintCommand(f.cfg.source, f.cfg.timeoutMs));
    assert.deepEqual(readFileSync(latest), previous);
    assert.deepEqual(readdirSync(f.cfg.laptopFolder), ['roost-latest-verified.enc']);
  } finally { f.cleanup(); }
});

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
  const docker = (args, input) => {
    try { return execFileSync("docker", ["exec", ...(input ? ["-i"] : []), nativeContainer, ...args],
      { windowsHide: true, input, maxBuffer: 8 * 1024 * 1024, timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }); }
    catch (error) {
      const diagnostic = error.stderr?.subarray(0, 4096).toString() ?? '';
      const reason = /not a child of this shell/.test(diagnostic) ? 'wait_unproven'
        : error.code === 'ENOBUFS' ? 'output_bound_exceeded' : error.status === 124 ? 'deadline' : 'command_unproven';
      throw Object.assign(Error(`owned_local_postgres_fixture_${reason}`), {
        status: error.status, nativeCode: ['ENOBUFS', 'ETIMEDOUT'].includes(error.code) ? error.code : 'native_exit',
        nativeSignal: ['SIGTERM', 'SIGKILL'].includes(error.signal) ? error.signal : null,
        stdoutBytes: error.stdout?.length ?? 0, stderrBytes: error.stderr?.length ?? 0,
        nonchildWait: /not a child of this shell/.test(diagnostic),
        stdout: error.stdout?.subarray(0, 65536) ?? Buffer.alloc(0) });
    }
  };
  const sql = (db, text) => docker(["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "companycore", "-d", db], Buffer.from(text));
  const cfg = { ...f.cfg, source: { sshHost: "fixture", container: nativeContainer, user: "companycore", database: source },
    restore: { sshHost: "fixture", container: nativeContainer, user: "companycore", database: "postgres" }, timeoutMs: 30000 };
  const transport = async req => {
    calls.push(req.operation); assert.equal(req.endpoint.container, nativeContainer);
    if (req.operation === "fingerprint") {
      assert(/^roost_(?:backup_fixture_[a-f0-9]{24}|restore_[a-f0-9]{32})$/.test(req.endpoint.database));
      // Execute the actual fixed normalization pipeline on existing PostgreSQL,
      // rather than claiming a fake fingerprint is native restore evidence.
      assert.equal(req.command, buildReleaseFingerprintCommand(req.endpoint, req.timeoutMs));
      const prefix = `docker exec -i '${nativeContainer}' `; assert(req.command.startsWith(prefix));
      // Strip only docker exec because this local transport already enters the
      // exact container. Execute the actual timeout/server-deadline program.
      try { return docker(["bash", "-e", "-o", "pipefail", "-c", req.command.slice(prefix.length)]); }
      catch (error) { process.stderr.write(`owned fixture fingerprint failed: status=${error.status ?? 'unknown'}\n`); throw error; }
    }
    if (req.operation === "dump") return docker(["pg_dump", "--format=custom", "--no-owner", "--no-acl", "--serializable-deferrable", "-U", "companycore", "-d", source]);
    if (req.operation === "restore") return docker(["pg_restore", "--exit-on-error", "--no-owner", "--no-acl", "-U", "companycore", "-d", req.endpoint.database], req.stdin);
    return sql("postgres", req.stdin.toString("utf8"));
  };
  const sourceMarker = `roost-release-fingerprint-fixture:${source}:${randomUUID()}`;
  const sourceIdentityQuery = `SELECT oid::text||':'||coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${source}';`;
  const sourceIdentity = sql("postgres", `CREATE DATABASE "${source}" TEMPLATE template0; COMMENT ON DATABASE "${source}" IS '${sourceMarker}'; ${sourceIdentityQuery}`).toString().trim();
  assert(new RegExp(`^[0-9]+:${sourceMarker}$`).test(sourceIdentity));
  try {
    const serverStartedAt = sql('postgres', 'SELECT pg_postmaster_start_time()::text;').toString().trim();
    const serverProcesses = () => sql('postgres', `SELECT backend_type,pid FROM pg_stat_activity WHERE backend_type IN ('checkpointer','background writer','walwriter','autovacuum launcher','logical replication launcher') ORDER BY backend_type;`).toString().trim();
    const serverPids = serverProcesses(); assert(serverPids);
    sql(source, `CREATE TABLE sample(id bigserial PRIMARY KEY, body text NOT NULL, nested jsonb); INSERT INTO sample(body,nested) VALUES ('synthetic α','{"array":[1,2]}'),('quote '' and newline' || chr(10) || 'row','{"null":null}'); CREATE INDEX sample_body_idx ON sample(body); CREATE SEQUENCE not_called_yet; SELECT setval('not_called_yet',42,false); CREATE SCHEMA business; CREATE TABLE business.empty_table(body text); CREATE TABLE duplicate_rows(body text); INSERT INTO duplicate_rows VALUES ('α'),('β'),('α'); CREATE TABLE partitions(id int) PARTITION BY RANGE(id); CREATE TABLE partition_one PARTITION OF partitions FOR VALUES FROM (0) TO (100); INSERT INTO partitions VALUES (42); CREATE MATERIALIZED VIEW materialized_rows AS SELECT body FROM duplicate_rows;`);
    const fingerprint = () => transport({ operation: 'fingerprint', endpoint: cfg.source, timeoutMs: cfg.timeoutMs,
      command: buildReleaseFingerprintCommand(cfg.source, cfg.timeoutMs) });
    const before = await fingerprint();
    // Same rows in another insertion order keep the exact historical digest.
    sql(source, `DELETE FROM duplicate_rows; INSERT INTO duplicate_rows VALUES ('α'),('α'),('β');`);
    assert.deepEqual(await fingerprint(), before);
    sql(source, `INSERT INTO duplicate_rows VALUES ('α');`);
    assert.notDeepEqual(await fingerprint(), before);
    sql(source, `DELETE FROM duplicate_rows WHERE ctid=(SELECT ctid FROM duplicate_rows WHERE body='α' LIMIT 1);`);
    assert.deepEqual(await fingerprint(), before);
    sql(source, `SELECT setval('not_called_yet',42,true);`);
    assert.notDeepEqual(await fingerprint(), before);
    sql(source, `SELECT setval('not_called_yet',42,false);`);
    assert.deepEqual(await fingerprint(), before);
    // Exercise the actual in-container supervisor on a stalled synthetic
    // child. Only this test transport adds the delay; operational SQL is fixed.
    const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const unquote = token => { assert(token.startsWith("'") && token.endsWith("'")); return token.slice(1, -1).replaceAll("'\\''", "'"); };
    for (const delay of ['sleep 20', "(trap '' TERM; exec sleep 20)"]) {
      const bounded = buildReleaseFingerprintCommand(cfg.source, 1000);
      const containerPrefix = `docker exec -i '${nativeContainer}' `;
      const outerPrefix = `${containerPrefix}bash -e -o pipefail -c `;
      assert(bounded.startsWith(outerPrefix));
      let supervisor = unquote(bounded.slice(outerPrefix.length));
      const start = supervisor.indexOf('bash -e -o pipefail -c ') + 'bash -e -o pipefail -c '.length;
      const end = supervisor.indexOf(' & fingerprint_child=$!;', start); assert(end > start);
      const program = unquote(supervisor.slice(start, end));
      const stalledProgram = program.replace('pg_dump --schema-only',
        `echo FINGERPRINT_CHILD_PID=$BASHPID; ${delay} & echo FINGERPRINT_SLEEP_PID=$!; wait; pg_dump --schema-only`);
      supervisor = supervisor.slice(0, start) + shellQuote(stalledProgram) + supervisor.slice(end);
      const stalled = `bash -e -o pipefail -c ${shellQuote(supervisor)}`;
      let timeoutFailure;
      try { docker(['bash', '-e', '-o', 'pipefail', '-c', stalled]); }
      catch (error) { timeoutFailure = error; }
      assert(timeoutFailure, 'stalled fingerprint must fail within its remote deadline');
      if (timeoutFailure.status !== 124) process.stderr.write(JSON.stringify({ fixture: 'fingerprint_deadline',
        delay: delay === 'sleep 20' ? 'term' : 'ignored_term_leaf', code: timeoutFailure.nativeCode,
        signal: timeoutFailure.nativeSignal, status: timeoutFailure.status,
        stdoutBytes: timeoutFailure.stdoutBytes, stderrBytes: timeoutFailure.stderrBytes,
        nonchildWait: timeoutFailure.nonchildWait }) + '\n');
      assert.equal(timeoutFailure.status, 124);
      const pids = [...timeoutFailure.stdout.toString().matchAll(/FINGERPRINT_(?:CHILD|SLEEP)_PID=([0-9]+)/g)].map(row => row[1]);
      assert.equal(pids.length, 2);
      for (const pid of pids) {
        const state = docker(['bash', '-c', `if test -r /proc/${pid}/stat; then cut -d ' ' -f3 /proc/${pid}/stat; fi`]).toString().trim();
        assert(state === '' || state === 'Z', 'owned stalled child must no longer be running');
      }
      assert.equal(sql('postgres', 'SELECT pg_postmaster_start_time()::text;').toString().trim(), serverStartedAt);
      assert.equal(serverProcesses(), serverPids);
      assert.equal(sql('postgres', `SELECT count(*) FROM pg_stat_activity WHERE datname='${source}';`).toString().trim(), '0');
    }
    assert.deepEqual(await fingerprint(), before);
    const result = await createReleaseBackupGateway(cfg, { transport }).backupAndVerify(); assert(result.restoreVerified && result.latestVerifiedCopy);
    assert.equal(before.toString().trim().split(/\r?\n/)[0].slice(0, 64), result.schemaDigest);
    assert.equal(before.toString().trim().split(/\r?\n/)[1].slice(0, 64), result.dataDigest);
    const encrypted = readFileSync(path.join(cfg.laptopFolder, "roost-latest-verified.enc")); const decoded = decryptReleaseBackup(encrypted, f.key, cfg.installationId);
    assert.equal(sha(decoded.archive), result.archiveDigest); assert.equal(decoded.metadata.schemaDigest, result.schemaDigest);
    assert(!encrypted.includes(Buffer.from("synthetic α"))); decoded.archive.fill(0);
    assert.equal(sql("postgres", `SELECT count(*) FROM pg_database WHERE datname LIKE 'roost_restore_%' AND shobj_description(oid,'pg_database') LIKE 'roost-isolated-restore:${cfg.installationId}:%';`).toString().trim(), "0");
    assert(calls.includes("restore_drop")); assert.equal(sql(source, "SELECT count(*) FROM sample;").toString().trim(), "2");
    assert.equal(sql('postgres', 'SELECT pg_postmaster_start_time()::text;').toString().trim(), serverStartedAt);
    assert.equal(serverProcesses(), serverPids);
  } finally {
    assert(/^roost_backup_fixture_[a-f0-9]{24}$/.test(source));
    // Give already-closing synthetic connections a bounded opportunity to exit;
    // never terminate a session or force a database drop during test cleanup.
    const until = Date.now() + 2000;
    while (sql('postgres', `SELECT count(*) FROM pg_stat_activity WHERE datname='${source}';`).toString().trim() !== '0' && Date.now() < until)
      await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(sql('postgres', sourceIdentityQuery).toString().trim(), sourceIdentity);
    sql("postgres", `DROP DATABASE "${source}";`);
    assert.equal(sql("postgres", `SELECT count(*) FROM pg_database WHERE datname='${source}';`).toString().trim(), "0"); f.cleanup();
  }
});
