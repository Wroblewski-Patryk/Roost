import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import { existsSync, lstatSync, realpathSync, readFileSync, openSync, writeSync, fsyncSync, closeSync, renameSync, unlinkSync } from "node:fs";
import { z } from "zod";

const fail = reason => { throw Error(`release_backup_${reason}`); };
const check = (value, reason) => { if (!value) fail(reason); };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const id = /^[a-zA-Z][a-zA-Z0-9_]{0,62}$/;
const alias = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;
const container = /^[a-f0-9]{64}$/; // An immutable Docker ID, never a replaceable service name.
const hex = /^[a-f0-9]{64}$/;
const inside = (parent, child) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const endpointSchema = z.object({ sshHost: z.string().regex(alias), container: z.string().regex(container),
  user: z.string().regex(id), database: z.string().regex(id) }).strict();
const configSchema = z.object({ installationId: z.string().uuid(), repositoryRoot: z.string(), laptopFolder: z.string(),
  restoreKeyFile: z.string(), recoveryAcknowledgmentFile: z.string(), source: endpointSchema, restore: endpointSchema,
  maxDumpBytes: z.number().int().min(1024).max(1024 * 1024 * 1024).default(256 * 1024 * 1024),
  timeoutMs: z.number().int().min(1000).max(30 * 60 * 1000).default(5 * 60 * 1000) }).strict();
const magic = Buffer.from("ROOSTBK1");
const envelopeSchema = z.object({ format: z.literal("roost-encrypted-backup-v1"), installationId: z.string().uuid(),
  backupId: z.string().uuid(), createdAt: z.string().datetime(), database: z.string().regex(id), archiveDigest: z.string().regex(hex),
  archiveBytes: z.number().int().positive(), schemaDigest: z.string().regex(hex), dataDigest: z.string().regex(hex),
  restoreVerifiedAt: z.string().datetime(), nonce: z.string().regex(/^[a-f0-9]{24}$/) }).strict();

// No caller-supplied script is accepted. Credentials stay in the existing
// container configuration; pg_dump/psql never receive a password in argv.
async function sshTransport({ endpoint, command, stdin = Buffer.alloc(0), maxBytes, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn("ssh", ["-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", endpoint.sshHost, command],
      { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "ignore"] });
    const chunks = []; let size = 0, stopped = false;
    const timer = setTimeout(() => { stopped = true; child.kill(); }, timeoutMs);
    child.stdout.on("data", bytes => { size += bytes.length; if (size > maxBytes) { stopped = true; child.kill(); } else chunks.push(bytes); });
    child.stdin.on("error", () => {});
    child.once("error", () => { clearTimeout(timer); reject(Error("release_backup_transport_unproven")); });
    child.once("close", code => { clearTimeout(timer); code === 0 && !stopped ? resolve(Buffer.concat(chunks)) : reject(Error("release_backup_transport_unproven")); });
    child.stdin.end(stdin);
  });
}

function assertPath(value, { directory = false, repositoryRoot, forbiddenFolder } = {}) {
  check(path.isAbsolute(repositoryRoot) && path.normalize(repositoryRoot) === repositoryRoot, "repository_path_invalid");
  check(path.isAbsolute(value) && path.normalize(value) === value, "path_invalid");
  check(!inside(repositoryRoot, value) && (!forbiddenFolder || !inside(forbiddenFolder, value)), "private_path_required");
  // Every ancestor must be a real directory; reparse points and symlinks cannot
  // redirect private material into a checkout or another backup destination.
  let current = directory || !existsSync(value) ? value : path.dirname(value);
  if (!existsSync(current)) current = path.dirname(current);
  for (;;) {
    const stat = lstatSync(current);
    check(stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(current).toLowerCase() === current.toLowerCase(), "path_redirected");
    const next = path.dirname(current); if (next === current) break; current = next;
  }
  if (existsSync(value) && !directory) { const stat = lstatSync(value); check(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, "private_file_invalid"); }
}

function durableNew(filename, bytes) {
  let fd;
  try { fd = openSync(filename, "wx", 0o600); let offset = 0; while (offset < bytes.length) offset += writeSync(fd, bytes, offset); fsyncSync(fd); }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function createReleaseRestoreKey({ repositoryRoot, keyFile }) {
  assertPath(keyFile, { repositoryRoot });
  if (!existsSync(keyFile)) {
    const key = randomBytes(32);
    try { durableNew(keyFile, key); } finally { key.fill(0); }
  }
  assertPath(keyFile, { repositoryRoot });
  const key = readFileSync(keyFile);
  try { check(key.length === 32, "restore_key_invalid"); } finally { key.fill(0); }
  return { keyReady: true };
}

export function encryptReleaseBackup(archive, key, metadata) {
  check(Buffer.isBuffer(archive) && archive.length > 0 && Buffer.isBuffer(key) && key.length === 32, "encryption_input_invalid");
  const nonce = randomBytes(12);
  const header = envelopeSchema.parse({ ...metadata, format: "roost-encrypted-backup-v1", nonce: nonce.toString("hex"),
    archiveDigest: sha(archive), archiveBytes: archive.length });
  const encoded = Buffer.from(JSON.stringify(header)); const length = Buffer.alloc(4); length.writeUInt32BE(encoded.length);
  const aad = Buffer.concat([magic, length, encoded]);
  const cipher = createCipheriv("aes-256-gcm", key, nonce); cipher.setAAD(aad);
  return Buffer.concat([aad, cipher.update(archive), cipher.final(), cipher.getAuthTag()]);
}

export function decryptReleaseBackup(encrypted, key, installationId) {
  check(Buffer.isBuffer(encrypted) && encrypted.length > 28 && encrypted.subarray(0, 8).equals(magic)
    && Buffer.isBuffer(key) && key.length === 32, "envelope_invalid");
  const length = encrypted.readUInt32BE(8); check(length > 0 && length < 4096 && 12 + length + 16 < encrypted.length, "envelope_invalid");
  let header; try { header = envelopeSchema.parse(JSON.parse(encrypted.subarray(12, 12 + length))); } catch { fail("envelope_invalid"); }
  check(header.installationId === installationId, "installation_mismatch");
  let archive;
  try { const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.nonce, "hex"));
    decipher.setAAD(encrypted.subarray(0, 12 + length)); decipher.setAuthTag(encrypted.subarray(-16));
    archive = Buffer.concat([decipher.update(encrypted.subarray(12 + length, -16)), decipher.final()]);
  } catch { fail("authentication_failed"); }
  check(archive.length === header.archiveBytes && sha(archive) === header.archiveDigest, "archive_digest_mismatch");
  return { archive, metadata: header };
}

const receiptSchema = z.object({ format: z.literal("roost-recovery-ack-v1"), installationId: z.string().uuid(),
  challengeId: z.string().uuid(), salt: z.string().regex(hex), codeHash: z.string().regex(hex),
  createdAt: z.string().datetime(), acknowledgedAt: z.string().datetime().nullable(), storedOffDevice: z.boolean() }).strict();
const codeHash = (salt, code) => sha(Buffer.from(`${salt}\n${code}`, "utf8"));

// Call from a private owner setup surface only. The returned code is a secret,
// displayed once; never serialize the return value into Roost/tool artifacts.
export function generateOneTimeRecoveryCode({ installationId, repositoryRoot, receiptFile }) {
  z.string().uuid().parse(installationId); assertPath(receiptFile, { repositoryRoot });
  check(!existsSync(receiptFile), "recovery_code_already_generated");
  const code = randomBytes(32).toString("base64url");
  const receipt = receiptSchema.parse({ format: "roost-recovery-ack-v1", installationId, challengeId: randomUUID(), salt: randomBytes(32).toString("hex"),
    codeHash: "0".repeat(64), createdAt: new Date().toISOString(), acknowledgedAt: null, storedOffDevice: false });
  receipt.codeHash = codeHash(receipt.salt, code); durableNew(receiptFile, Buffer.from(JSON.stringify(receipt)));
  return { code, challengeId: receipt.challengeId }; // Code is never written to disk.
}

export function acknowledgeRecoveryCode({ installationId, repositoryRoot, receiptFile, challengeId, code, storedOffDevice }) {
  assertPath(receiptFile, { repositoryRoot }); const receipt = receiptSchema.parse(JSON.parse(readFileSync(receiptFile)));
  check(receipt.installationId === installationId && receipt.challengeId === challengeId && storedOffDevice === true
    && typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code), "recovery_ack_invalid");
  check(timingSafeEqual(Buffer.from(receipt.codeHash, "hex"), Buffer.from(codeHash(receipt.salt, code), "hex")), "recovery_code_invalid");
  check(receipt.acknowledgedAt === null, "recovery_ack_already_recorded");
  const bytes = Buffer.from(JSON.stringify({ ...receipt, acknowledgedAt: new Date().toISOString(), storedOffDevice: true }));
  const pending = `${receiptFile}.${randomUUID()}.pending`; durableNew(pending, bytes); renameSync(pending, receiptFile);
  return { installationId, challengeId, storedOffDevice: true, acknowledgmentDigest: sha(bytes) };
}

const pgArgs = (e, database) => ["-U", e.user, "-d", database];
function dockerCommand(e, program, args, input = false) { return `docker exec ${input ? "-i " : ""}${quote(e.container)} ${program} ${args.map(quote).join(" ")}`; }
function fingerprintCommand(e, database) {
  // Schema statement order/whole literal values participate. Row JSON hashes
  // preserve multiline field pairing while allowing different insertion order.
  const suffix = " | sed -e '/^\\\\restrict /d' -e '/^\\\\unrestrict /d' | sha256sum";
  const common = ["--no-owner", "--no-acl", "--quote-all-identifiers", ...pgArgs(e, database)];
  const rows = `printf %s ${quote(restoreFingerprintSql)} | ${dockerCommand(e, "psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", ...pgArgs(e, database)], true)} | LC_ALL=C sort | sha256sum`;
  return `bash -o pipefail -c ${quote(`${dockerCommand(e, "pg_dump", ["--schema-only", ...common])}${suffix}; ${rows}`)}`;
}

// This is a fixed read-only program, not SQL from a dispatch packet. Dynamic
// table names are quoted by PostgreSQL's format(%I); raw rows never leave PG.
const restoreFingerprintSql = `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT format('SELECT jsonb_build_object(''schema'',%L,''table'',%L,''count'',count(*),''digest'',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex''),'''' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'')),''''),''UTF8'')),''hex''))::text FROM %I.%I t;', n.nspname,c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p','m') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname,c.relname
\\gexec
SELECT format('SELECT jsonb_build_object(''schema'',%L,''sequence'',%L,''lastValue'',last_value,''isCalled'',is_called)::text FROM %I.%I;',n.nspname,c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname
\\gexec
COMMIT;
`;

export function createReleaseBackupGateway(privateConfig, { transport = sshTransport } = {}) {
  const cfg = configSchema.parse(privateConfig); check(typeof transport === "function", "transport_invalid");
  assertPath(cfg.laptopFolder, { directory: true, repositoryRoot: cfg.repositoryRoot });
  assertPath(cfg.restoreKeyFile, { repositoryRoot: cfg.repositoryRoot, forbiddenFolder: cfg.laptopFolder });
  assertPath(cfg.recoveryAcknowledgmentFile, { repositoryRoot: cfg.repositoryRoot, forbiddenFolder: cfg.laptopFolder });
  check(cfg.source.database !== cfg.restore.database || cfg.source.container !== cfg.restore.container || cfg.source.sshHost !== cfg.restore.sshHost,
    "restore_maintenance_matches_source");
  const folderIdentity = lstatSync(cfg.laptopFolder, { bigint: true });
  const privateIdentity = filename => { const stat = lstatSync(filename, { bigint: true }); return { dev: stat.dev, ino: stat.ino, hash: sha(readFileSync(filename)) }; };
  const keyIdentity = privateIdentity(cfg.restoreKeyFile), receiptIdentity = privateIdentity(cfg.recoveryAcknowledgmentFile);
  const assertPrivateFiles = () => {
    for (const [filename, identity] of [[cfg.restoreKeyFile, keyIdentity], [cfg.recoveryAcknowledgmentFile, receiptIdentity]]) {
      assertPath(filename, { repositoryRoot: cfg.repositoryRoot, forbiddenFolder: cfg.laptopFolder });
      const current = privateIdentity(filename); check(current.dev === identity.dev && current.ino === identity.ino && current.hash === identity.hash, "private_file_changed");
    }
  };
  const assertFolder = () => { assertPath(cfg.laptopFolder, { directory: true, repositoryRoot: cfg.repositoryRoot }); const now = lstatSync(cfg.laptopFolder, { bigint: true });
    check(now.dev === folderIdentity.dev && now.ino === folderIdentity.ino, "backup_folder_changed"); };
  const run = async (operation, endpoint, command, stdin, maxBytes = 65536) => {
    try { const bytes = await transport({ operation, endpoint: { ...endpoint }, command, stdin, maxBytes, timeoutMs: cfg.timeoutMs });
      check(Buffer.isBuffer(bytes) && bytes.length <= maxBytes, "transport_output_invalid"); return bytes;
    } catch { fail(`operation_${operation}_unproven`); }
  };
  const sql = (operation, database, input) => run(operation, cfg.restore, dockerCommand(cfg.restore, "psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", ...pgArgs(cfg.restore, database)], true), Buffer.from(input));
  const fingerprint = async (endpoint, database) => {
    const output = (await run("fingerprint", { ...endpoint, database }, fingerprintCommand(endpoint, database))).toString("utf8").trim().split(/\r?\n/);
    check(output.length === 2 && output.every(line => /^[a-f0-9]{64}\s+-\s*$/.test(line)), "fingerprint_invalid");
    return { schemaDigest: output[0].slice(0, 64), dataDigest: output[1].slice(0, 64) };
  };
  async function backupAndVerify() {
    assertFolder(); assertPrivateFiles();
    const receipt = receiptSchema.parse(JSON.parse(readFileSync(cfg.recoveryAcknowledgmentFile)));
    check(receipt.installationId === cfg.installationId && receipt.storedOffDevice && receipt.acknowledgedAt, "recovery_ack_required");
    const key = readFileSync(cfg.restoreKeyFile); check(key.length === 32, "key_invalid");
    const restoreDatabase = `roost_restore_${randomBytes(16).toString("hex")}`;
    const marker = `roost-isolated-restore:${cfg.installationId}:${randomUUID()}`;
    let archive, restored, encrypted; let ownedOid = null; let pending = null, pendingIdentity = null, uncertainCreate = false, uncertainSync = false;
    const lockFile = path.join(cfg.laptopFolder, ".roost-backup.lock");
    const lockBytes = Buffer.from(JSON.stringify({ format: "roost-backup-attempt-v1", installationId: cfg.installationId, attemptId: randomUUID(),
      configurationDigest: sha(JSON.stringify(cfg)), restoreDatabase, ownershipMarker: marker, startedAt: new Date().toISOString() }));
    try { durableNew(lockFile, lockBytes); } catch { key.fill(0); fail("backup_already_active_or_unreconciled"); }
    try {
      const before = await fingerprint(cfg.source, cfg.source.database);
      const capturedAt = new Date().toISOString();
      archive = await run("dump", cfg.source, dockerCommand(cfg.source, "pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--serializable-deferrable", ...pgArgs(cfg.source, cfg.source.database)]), undefined, cfg.maxDumpBytes);
      check(archive.subarray(0, 5).toString("ascii") === "PGDMP", "archive_invalid");
      const after = await fingerprint(cfg.source, cfg.source.database);
      check(JSON.stringify(before) === JSON.stringify(after), "source_changed_during_backup");
      const identityQuery = `SELECT oid::text || ':' || coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${restoreDatabase}';`;
      check((await sql("restore_inspect", cfg.restore.database, identityQuery)).toString().trim() === "", "restore_database_collision");
      uncertainCreate = true;
      const created = (await sql("restore_create", cfg.restore.database, `CREATE DATABASE "${restoreDatabase}" TEMPLATE template0;\nCOMMENT ON DATABASE "${restoreDatabase}" IS '${marker}';\n${identityQuery}`)).toString().trim();
      check(new RegExp(`^[0-9]+:${marker}$`).test(created), "restore_ownership_unproven"); ownedOid = created.split(":")[0]; uncertainCreate = false;
      await run("restore", { ...cfg.restore, database: restoreDatabase }, dockerCommand(cfg.restore, "pg_restore", ["--exit-on-error", "--no-owner", "--no-acl", ...pgArgs(cfg.restore, restoreDatabase)], true), archive);
      restored = await fingerprint(cfg.restore, restoreDatabase);
      check(JSON.stringify(before) === JSON.stringify(restored), "restore_content_mismatch");
      const metadata = { installationId: cfg.installationId, backupId: randomUUID(), createdAt: capturedAt, database: cfg.source.database,
        ...restored, restoreVerifiedAt: new Date().toISOString() };
      encrypted = encryptReleaseBackup(archive, key, metadata);
      const checkCopy = decryptReleaseBackup(encrypted, key, cfg.installationId); checkCopy.archive.fill(0);
      assertFolder(); assertPrivateFiles(); const latest = path.join(cfg.laptopFolder, "roost-latest-verified.enc");
      assertPath(latest, { repositoryRoot: cfg.repositoryRoot });
      pending = path.join(cfg.laptopFolder, `.roost-${metadata.backupId}.pending`);
      try { durableNew(pending, encrypted); pendingIdentity = privateIdentity(pending); } catch { uncertainSync = true; throw Error("release_backup_sync_unproven"); }
      const durableCopy = readFileSync(pending); check(sha(durableCopy) === sha(encrypted), "sync_readback_mismatch");
      const decoded = decryptReleaseBackup(durableCopy, key, cfg.installationId); decoded.archive.fill(0);
      // A verified copy becomes latest only after the owned restore DB is gone.
      const identity = (await sql("restore_inspect", cfg.restore.database, identityQuery)).toString().trim();
      check(identity === `${ownedOid}:${marker}`, "restore_identity_changed");
      check((await sql("restore_sessions", cfg.restore.database, `SELECT count(*) FROM pg_stat_activity WHERE datname='${restoreDatabase}';`)).toString().trim() === "0", "restore_sessions_active");
      await sql("restore_drop", cfg.restore.database, `DROP DATABASE "${restoreDatabase}";`);
      check((await sql("restore_inspect", cfg.restore.database, identityQuery)).toString().trim() === "", "restore_cleanup_unproven"); ownedOid = null;
      assertFolder(); assertPath(latest, { repositoryRoot: cfg.repositoryRoot }); renameSync(pending, latest); pending = null;
      check(sha(readFileSync(latest)) === sha(encrypted), "latest_readback_mismatch");
      return { installationId: cfg.installationId, backupId: metadata.backupId, archiveDigest: sha(archive), encryptedDigest: sha(encrypted),
        archiveBytes: archive.length, encryptedBytes: encrypted.length, ...restored, restoreVerified: true, restoreDatabaseAbsent: true,
        latestVerifiedCopy: true, verifiedAt: metadata.restoreVerifiedAt, recoveryAcknowledgmentDigest: sha(readFileSync(cfg.recoveryAcknowledgmentFile)) };
    } finally {
      key.fill(0); archive?.fill(0);
      if (ownedOid !== null) {
        // Fail closed on unknown ownership or active sessions. Never terminate a
        // session, drop a production DB, or guess after an uncertain create.
        const identity = (await sql("restore_inspect", cfg.restore.database, `SELECT oid::text || ':' || coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${restoreDatabase}';`)).toString().trim();
        check(identity === `${ownedOid}:${marker}`, "restore_cleanup_identity_changed");
        check((await sql("restore_sessions", cfg.restore.database, `SELECT count(*) FROM pg_stat_activity WHERE datname='${restoreDatabase}';`)).toString().trim() === "0", "restore_cleanup_sessions_active");
        await sql("restore_drop", cfg.restore.database, `DROP DATABASE "${restoreDatabase}";`);
        check((await sql("restore_inspect", cfg.restore.database, `SELECT oid FROM pg_database WHERE datname='${restoreDatabase}';`)).toString().trim() === "", "restore_cleanup_unproven");
      }
      if (pending !== null && pendingIdentity !== null) {
        assertFolder(); check(path.dirname(pending) === cfg.laptopFolder, "pending_path_invalid");
        assertPath(pending, { repositoryRoot: cfg.repositoryRoot }); const current = privateIdentity(pending);
        check(current.dev === pendingIdentity.dev && current.ino === pendingIdentity.ino && current.hash === pendingIdentity.hash, "pending_changed"); unlinkSync(pending);
      }
      if (!uncertainCreate && !uncertainSync) { assertFolder(); assertPath(lockFile, { repositoryRoot: cfg.repositoryRoot }); check(sha(readFileSync(lockFile)) === sha(lockBytes), "backup_lock_changed"); unlinkSync(lockFile); }
    }
  }
  async function inspectInterruptedBackup() {
    assertFolder(); assertPrivateFiles(); const lockFile = path.join(cfg.laptopFolder, ".roost-backup.lock");
    if (!existsSync(lockFile)) return { unresolvedAttempt: false };
    assertPath(lockFile, { repositoryRoot: cfg.repositoryRoot });
    const attempt = z.object({ format: z.literal("roost-backup-attempt-v1"), installationId: z.string().uuid(), attemptId: z.string().uuid(),
      configurationDigest: z.string().regex(hex), restoreDatabase: z.string().regex(/^roost_restore_[a-f0-9]{32}$/),
      ownershipMarker: z.string().regex(/^roost-isolated-restore:[a-f0-9-]{36}:[a-f0-9-]{36}$/), startedAt: z.string().datetime() }).strict().parse(JSON.parse(readFileSync(lockFile)));
    check(attempt.installationId === cfg.installationId && attempt.configurationDigest === sha(JSON.stringify(cfg))
      && attempt.ownershipMarker.startsWith(`roost-isolated-restore:${cfg.installationId}:`), "attempt_binding_mismatch");
    const state = (await sql("restore_inspect", cfg.restore.database, `SELECT oid::text || ':' || coalesce(shobj_description(oid,'pg_database'),'') FROM pg_database WHERE datname='${attempt.restoreDatabase}';`)).toString().trim();
    const provenOwned = new RegExp(`^[0-9]+:${attempt.ownershipMarker}$`).test(state);
    return { unresolvedAttempt: true, attemptId: attempt.attemptId, restoreDatabase: attempt.restoreDatabase,
      restoreAbsent: state === "", ownershipVerified: provenOwned, ownershipUnproven: state !== "" && !provenOwned };
  }
  function verifyPrerequisites(evidence) {
    assertFolder(); assertPrivateFiles();
    const ack=receiptSchema.parse(JSON.parse(readFileSync(cfg.recoveryAcknowledgmentFile)));
    check(ack.installationId===cfg.installationId&&ack.storedOffDevice&&ack.acknowledgedAt,"recovery_ack_required");
    check(evidence?.installationId===cfg.installationId&&evidence.restoreVerified===true&&evidence.restoreDatabaseAbsent===true
      &&evidence.latestVerifiedCopy===true&&evidence.recoveryAcknowledgmentDigest===sha(readFileSync(cfg.recoveryAcknowledgmentFile)),"prerequisite_receipt_invalid");
    check(!existsSync(path.join(cfg.laptopFolder,'.roost-backup.lock')),"backup_unreconciled");
    const latest=path.join(cfg.laptopFolder,'roost-latest-verified.enc');assertPath(latest,{repositoryRoot:cfg.repositoryRoot});
    check(lstatSync(latest).size<=cfg.maxDumpBytes+8192,"envelope_invalid");
    const encrypted=readFileSync(latest),key=readFileSync(cfg.restoreKeyFile);let decoded;
    try{
      check(encrypted.length===evidence.encryptedBytes&&sha(encrypted)===evidence.encryptedDigest,"latest_readback_mismatch");
      decoded=decryptReleaseBackup(encrypted,key,cfg.installationId);
      const m=decoded.metadata;
      check(m.backupId===evidence.backupId&&m.database===cfg.source.database&&m.archiveDigest===evidence.archiveDigest
        &&m.archiveBytes===evidence.archiveBytes&&m.schemaDigest===evidence.schemaDigest&&m.dataDigest===evidence.dataDigest
        &&m.restoreVerifiedAt===evidence.verifiedAt,"prerequisite_receipt_invalid");
      return {installationId:cfg.installationId,digest:m.archiveDigest,bytes:m.archiveBytes,restoreDigest:m.archiveDigest,
        capturedAt:m.createdAt,restoreVerifiedAt:m.restoreVerifiedAt};
    }finally{key.fill(0);decoded?.archive.fill(0);}
  }
  return Object.freeze({ backupAndVerify, inspectInterruptedBackup, verifyPrerequisites });
}
