import { z } from 'zod';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { physicalIdentity } from './agent-host-native-footprint.mjs';
import { runReleaseNativeProcess, hasReleaseProcessScope, minimalReleaseEnvironment } from './agent-host-release-process.mjs';
import { coolifyHttpsJson } from './agent-host-release-coolify.mjs';
import { createDockerfileStateGateway } from './agent-host-release-dockerfile-state.mjs';
import { createCoolifyGitSetGateway, createFixedCoolifyGitSetSshTransport, coolifyGitSetDeploymentId } from './agent-host-release-coolify-git-set-gateway.mjs';
import { createCoolifyGitSetAdapter } from './agent-host-release-coolify-git-set.mjs';
import contract from './agent-host-release-contract.cjs';
import { buildReleaseFingerprintCommand, releaseFingerprintDefaultTimeoutMs, releaseFingerprintTimeoutSchema } from './agent-host-release-fingerprint.mjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/;
const ident = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/), hex = z.string().regex(hash);
const alias = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);
const filepath = z.string().min(3).max(1000).refine(value => path.isAbsolute(value) && path.normalize(value) === value);
const pgident = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,62}$/);
const protectedId = z.string().min(1).max(1000).refine(value => !/[\x00-\x1f]|Bearer\s+|(?:token|password|secret)\s*[:=]/i.test(value));
const origin = z.string().url().refine(value => { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && u.pathname === '/'; });
export const installedGitSetReleaseSchema = z.object({ sshHost: alias, workspaceRoot: filepath, ownershipFile: filepath,
  sourcePins: z.object({ queueHelper: hex, deploymentJob: hex }).strict(),
  baselineDeployments: z.array(z.object({ targetId: ident, deploymentId: ident }).strict()).min(1).max(6),
  source: z.object({ sshHost: alias, container: hex, user: pgident, database: pgident }).strict(),
  fingerprintTimeoutMs: releaseFingerprintTimeoutSchema.min(30000).max(300000).optional(),
  capacity: z.object({ minDiskBytes: z.number().int().positive(), minMemoryBytes: z.number().int().positive(), maxLoad1: z.number().positive().max(100) }).strict(),
  coolify: z.object({ origin, certificateSha256: hex.optional() }).strict(),
  health: z.object({ certificateSha256: hex.optional() }).strict()
}).strict().superRefine((value, ctx) => {
  if (value.source.sshHost !== value.sshHost || new Set(value.baselineDeployments.map(row => row.targetId)).size !== value.baselineDeployments.length)
    ctx.addIssue({ code: 'custom', message: 'installation_scope_invalid' });
});
export const permanentReleaseOwnershipSchema = z.object({ schemaVersion: z.literal('roost-application-release-ownership-v1'),
  applicationId: z.string().uuid(), canonicalDir: filepath, repositoryUrl: z.string().url(), targetIds: z.array(ident).min(1).max(6),
  protectedResourceIds: z.array(protectedId).min(1).max(100), ownedResourceIds: z.array(ident).max(0)
}).strict();
const fail = (reason, cause) => { throw Object.assign(Error(`release_git_set_installation_${reason}`, cause ? { cause } : undefined), { retryable: false, releaseBlocked: true }); };
const check = (condition, reason) => { if (!condition) fail(reason); };
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => fields.includes(key));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const inside = (parent, child) => { const relative = path.relative(parent, child); return relative && !relative.startsWith('..') && !path.isAbsolute(relative); };

// Fixed read-only, installation-wide predicates. Unknown mode associations are
// treated conservatively. Only explicit, fully resolved PAPER associations may
// remain open; totals are retained separately for audit, never projected as LIVE.
export const gitSetTradingSafetySql = `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object('activeBots',(SELECT count(*) FROM "Bot" WHERE "isActive"=true AND mode='LIVE'),
'runningSessions',(SELECT count(*) FROM "BotRuntimeSession" WHERE status='RUNNING' AND mode='LIVE'),
'liveOpenOrders',(SELECT count(*) FROM "Order" o LEFT JOIN "Bot" b ON b.id=o."botId" LEFT JOIN "Wallet" w ON w.id=o."walletId" WHERE o.status IN ('PENDING','OPEN','PARTIALLY_FILLED') AND (b.mode='LIVE' OR w.mode='LIVE' OR o.origin='EXCHANGE_SYNC')),
'liveOpenPositions',(SELECT count(*) FROM "Position" p LEFT JOIN "Bot" b ON b.id=p."botId" LEFT JOIN "Wallet" w ON w.id=p."walletId" WHERE p.status='OPEN' AND (b.mode='LIVE' OR w.mode='LIVE' OR p.origin='EXCHANGE_SYNC')),
'unknownOpenOrders',(SELECT count(*) FROM "Order" o LEFT JOIN "Bot" b ON b.id=o."botId" LEFT JOIN "Wallet" w ON w.id=o."walletId" WHERE o.status IN ('PENDING','OPEN','PARTIALLY_FILLED') AND NOT COALESCE(b.mode='LIVE' OR w.mode='LIVE' OR o.origin='EXCHANGE_SYNC',false) AND NOT COALESCE((b.id IS NOT NULL OR w.id IS NOT NULL) AND (o."botId" IS NULL OR (b.id IS NOT NULL AND b.mode='PAPER')) AND (o."walletId" IS NULL OR (w.id IS NOT NULL AND w.mode='PAPER')),false)),
'unknownOpenPositions',(SELECT count(*) FROM "Position" p LEFT JOIN "Bot" b ON b.id=p."botId" LEFT JOIN "Wallet" w ON w.id=p."walletId" WHERE p.status='OPEN' AND NOT COALESCE(b.mode='LIVE' OR w.mode='LIVE' OR p.origin='EXCHANGE_SYNC',false) AND NOT COALESCE((b.id IS NOT NULL OR w.id IS NOT NULL) AND (p."botId" IS NULL OR (b.id IS NOT NULL AND b.mode='PAPER')) AND (p."walletId" IS NULL OR (w.id IS NOT NULL AND w.mode='PAPER')),false)),
'allOpenOrders',(SELECT count(*) FROM "Order" WHERE status IN ('PENDING','OPEN','PARTIALLY_FILLED')),
'allOpenPositions',(SELECT count(*) FROM "Position" WHERE status='OPEN'),
'pendingDedupes',(SELECT count(*) FROM "RuntimeExecutionDedupe" d LEFT JOIN "Bot" b ON b.id=d."botId" WHERE d.status='PENDING' AND (d."botId" IS NULL OR b.id IS NULL OR b.mode IS DISTINCT FROM 'PAPER')))::text;
COMMIT;`;
function psql(source) { return `docker exec -i ${quote(source.container)} psql -X -qAt -v ON_ERROR_STOP=1 -U ${quote(source.user)} -d ${quote(source.database)}`; }
export function parseGitSetSafetyCounts(output) {
  let row; try { row = JSON.parse(output.trim()); } catch { fail('safety_unavailable'); }
  const fields = ['activeBots', 'runningSessions', 'liveOpenOrders', 'liveOpenPositions', 'unknownOpenOrders', 'unknownOpenPositions', 'allOpenOrders', 'allOpenPositions', 'pendingDedupes'];
  check(row && Object.keys(row).length === fields.length && fields.every(key => Number.isSafeInteger(row[key]) && row[key] >= 0), 'safety_unavailable');
  check(row.liveOpenOrders + row.unknownOpenOrders <= row.allOpenOrders && row.liveOpenPositions + row.unknownOpenPositions <= row.allOpenPositions, 'safety_unavailable');
  return { available: true, ...row, activeTrading: row.activeBots + row.runningSessions + row.pendingDedupes + row.unknownOpenOrders + row.unknownOpenPositions };
}

const phpBootstrap = `require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();`;
const queueReadPhp = String.raw`
error_reporting(0);ini_set('display_errors','0');try{
$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();
$q=App\Models\ApplicationDeploymentQueue::where('deployment_uuid',$p['deploymentId'])->where('application_id',$a->id)->firstOrFail();
if($q->status!=='finished')throw new Exception('unfinished');
echo json_encode(['targetId'=>$a->uuid,'deploymentId'=>$q->deployment_uuid,'commit'=>$q->commit,'status'=>$q->status,
'createdAt'=>$q->created_at->toISOString(),'finishedAt'=>$q->updated_at->toISOString()],JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo '{"unproven":true}';exit(1);}`;
const capacityCommand = "set -eu; dockerRoot=$(docker info --format '{{.DockerRootDir}}'); case \"$dockerRoot\" in /*) ;; *) exit 1 ;; esac; disk=$(df -PB1 -- \"$dockerRoot\" | awk 'NR==2{print $4}'); memory=$(awk '/^MemAvailable:/{printf \"%.0f\",$2*1024}' /proc/meminfo); load=$(cut -d ' ' -f1 /proc/loadavg); printf '{\"diskBytes\":%s,\"memoryBytes\":%s,\"load1\":%s}' \"$disk\" \"$memory\" \"$load\"";
const activeQueuePhp = `echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()],JSON_THROW_ON_ERROR);`;

export function releaseServiceResponseHealthy(body, expectedJsonStatus) {
  if (!Buffer.isBuffer(body) || body.length > 65536) return false;
  if (expectedJsonStatus === undefined) return true;
  if (!['ok', 'ready'].includes(expectedJsonStatus)) return false;
  try { const value = JSON.parse(body.toString('utf8')); return !!value && !Array.isArray(value)
    && typeof value === 'object' && value.status === expectedJsonStatus; } catch { return false; }
}
async function probeHealth(url, expectedStatus, certificateSha256, expectedJsonStatus) {
  // A sealed payload predicate distinguishes application failure from HTTP 200.
  // Bodies stay transient; timestamps and readiness detail are never evidence.
  return new Promise(resolve => {
    const u = new URL(url); let done = false; const finish = healthy => { if (!done) { done = true; resolve(healthy); } };
    const request = https.request(u, { method: 'GET', agent: false, timeout: 10000, rejectUnauthorized: true, minVersion: 'TLSv1.2',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-store', 'Accept-Encoding': 'identity' } }, response => {
      let bytes = 0; const chunks = [];
      if (certificateSha256 && sha256(response.socket.getPeerCertificate().raw ?? Buffer.alloc(0)) !== certificateSha256) { response.destroy(); finish(false); return; }
      if (response.statusCode !== expectedStatus || response.headers.location || response.headers['content-encoding']) { response.destroy(); finish(false); return; }
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 65536) { response.destroy(); finish(false); } else chunks.push(chunk); });
      response.on('end', () => finish(releaseServiceResponseHealthy(Buffer.concat(chunks), expectedJsonStatus))); response.on('error', () => finish(false));
    });
    request.on('error', () => finish(false)); request.on('timeout', () => { request.destroy(); finish(false); }); request.end();
  });
}

/** Fixed per-installation wiring; dependency overrides are source-test inputs,
 * never settings/module/script choices from an execution or model packet. */
export function createInstalledGitSetRelease({ settings, state, backup, github, coolifyCredential }, dependencies = {}) {
  const cfg = installedGitSetReleaseSchema.parse(settings), s = structuredClone(state?.release?.snapshot);
  let m; try { m = contract.manifestSchema.parse(s?.manifest); } catch { fail('manifest_invalid'); }
  check(contract.isGitSetManifest(m) && m.cleanup.ownedResourceIds.length === 0 && github && typeof github.inspect === 'function'
    && typeof coolifyCredential === 'string' && coolifyCredential.length >= 8, 'binding_invalid');
  check(new URL(m.deployment.controllerUrl).origin === new URL(cfg.coolify.origin).origin
    && cfg.baselineDeployments.length === m.deployment.targets.length && cfg.baselineDeployments.every(row => m.deployment.targets.some(t => t.targetId === row.targetId)), 'target_binding_changed');
  const native = dependencies.nativeProcess ?? runReleaseNativeProcess, identity = dependencies.identity ?? physicalIdentity;
  const readFile = dependencies.readFile ?? readFileSync, coolifyJson = dependencies.coolifyJson ?? coolifyHttpsJson;
  const healthProbe = dependencies.healthProbe ?? probeHealth;
  const workspaceIdentity = identity(cfg.workspaceRoot), canonicalIdentity = identity(m.repository.canonicalDir);
  const gitIdentity = identity(path.join(m.repository.canonicalDir, '.git')), ledgerIdentity = identity(cfg.ownershipFile, false);
  check(inside(cfg.workspaceRoot, m.repository.canonicalDir) && !inside(cfg.workspaceRoot, cfg.ownershipFile), 'ownership_path_invalid');
  const ledgerBytes = readFile(cfg.ownershipFile); check(ledgerBytes.length <= 32768, 'ownership_invalid');
  const ledgerDigest = sha256(ledgerBytes); let ownership;
  try { ownership = permanentReleaseOwnershipSchema.parse(JSON.parse(ledgerBytes.toString('utf8').replace(/^\uFEFF/, ''))); }
  catch { fail('ownership_invalid'); }
  check(ownership.applicationId === s.applicationId && ownership.canonicalDir === m.repository.canonicalDir && ownership.repositoryUrl === m.repository.url
    && contract.releaseDigest(ownership.targetIds.slice().sort()) === contract.releaseDigest(m.deployment.targets.map(t => t.targetId).sort())
    && contract.releaseDigest(ownership.protectedResourceIds) === contract.releaseDigest(m.cleanup.protectedResourceIds)
    && ownership.targetIds.every(id => ownership.protectedResourceIds.includes(id)), 'ownership_binding_changed');
  const assertClone = async (manifest = m) => {
    check(contract.releaseDigest(manifest) === contract.releaseDigest(m) && identity(cfg.workspaceRoot) === workspaceIdentity
      && identity(m.repository.canonicalDir) === canonicalIdentity && identity(path.join(m.repository.canonicalDir, '.git')) === gitIdentity
      && identity(cfg.ownershipFile, false) === ledgerIdentity && sha256(readFile(cfg.ownershipFile)) === ledgerDigest, 'clone_or_ownership_changed');
    return { canonicalDir: m.repository.canonicalDir, present: true };
  };
  const ssh = async ({ command, stdin = '', timeoutMs = 15000, maxOutputBytes = 16384 }) => {
    await assertClone(); if (!dependencies.nativeProcess) check(hasReleaseProcessScope(), 'owned_process_scope_required');
    let output; try { output = await native('ssh', { argv: ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', cfg.sshHost, command],
      cwd: os.tmpdir(), input: stdin, durationMs: timeoutMs, maxBytes: maxOutputBytes }); } catch (error) { fail('ssh_unavailable', error); }
    await assertClone(); check((typeof output === 'string' || Buffer.isBuffer(output)) && Buffer.byteLength(output) <= maxOutputBytes, 'response_size_invalid'); return output.toString('utf8');
  };
  const phpRead = async (program, payload = {}) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const output = await ssh({ command: 'docker exec -i coolify php', stdin: `<?php\n$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);\n${phpBootstrap}\n${program}` });
    try { return JSON.parse(output); } catch { fail('response_invalid'); }
  };
  const fingerprint = async () => {
    const timeoutMs = cfg.fingerprintTimeoutMs ?? releaseFingerprintDefaultTimeoutMs;
    const output = await ssh({ command: buildReleaseFingerprintCommand(cfg.source, timeoutMs), timeoutMs });
    const rows = output.trim().split(/\r?\n/); check(rows.length === 2 && rows.every(row => /^[a-f0-9]{64}\s+-\s*$/.test(row)), 'fingerprint_unavailable');
    return { schemaDigest: rows[0].slice(0, 64), dataDigest: rows[1].slice(0, 64) };
  };
  const safety = async () => {
    const counts = parseGitSetSafetyCounts(await ssh({ command: psql(cfg.source), stdin: gitSetTradingSafetySql }));
    // Reject actual activity before scanning a potentially large live database.
    // The release needs a stable basis; fingerprints cannot make activity safe.
    check(counts.activeTrading === 0 && counts.liveOpenOrders === 0 && counts.liveOpenPositions === 0, 'activity_present');
    const basis = await fingerprint(); return { activeTrading: counts.activeTrading, openOrders: counts.liveOpenOrders,
      openPositions: counts.liveOpenPositions, ...basis };
  };
  const liveQueue = new Map();
  for (const row of state.journal ?? []) if (['deploy', 'rollback'].includes(row.operation) && row.intent?.parameters?.targetId) {
    const targetId = row.intent.parameters.targetId;
    liveQueue.set(targetId, coolifyGitSetDeploymentId({ releaseId: state.release.id, operationId: row.id, targetId, rollback: row.operation === 'rollback' }));
  }
  const baseline = new Map(cfg.baselineDeployments.map(row => [row.targetId, row.deploymentId]));
  const stateGateway = createDockerfileStateGateway({ targets: m.deployment.targets, schemaDigest: m.deployment.schemaDigest, sourcePins: cfg.sourcePins,
    transport: ssh, expectedDeploymentId: async targetId => liveQueue.get(targetId) ?? baseline.get(targetId),
    readDeployment: payload => phpRead(queueReadPhp, payload), treeForCommit: async commit => {
      check(sha.test(commit), 'source_commit_invalid'); await assertClone();
      const output = await native('git', { argv: ['--no-replace-objects', '-c', `core.hooksPath=${process.platform === 'win32' ? 'NUL' : '/dev/null'}`,
        '-c', 'core.fsmonitor=false', '-C', m.repository.canonicalDir, 'rev-parse', `${commit}^{tree}`], cwd: m.repository.canonicalDir,
        environment: { ...minimalReleaseEnvironment(), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' }, durationMs: 10000, maxBytes: 4096 });
      const tree = output.toString('utf8').trim(); check(sha.test(tree), 'source_tree_unproven'); return tree;
    } });
  // The owned process runner resolves the SSH executable inside its prepared
  // scope. The transport descriptor's placeholder absolute path is never run.
  const queueTransport = createFixedCoolifyGitSetSshTransport({ sshBinary: process.platform === 'win32' ? 'C:\\Windows\\System32\\OpenSSH\\ssh.exe' : '/usr/bin/ssh', sshHost: cfg.sshHost,
    runOwned: async descriptor => ({ stdout: await ssh({ command: descriptor.args.at(-1), stdin: descriptor.stdin,
      timeoutMs: descriptor.timeoutMs, maxOutputBytes: descriptor.maxOutputBytes }), exitCode: 0 }) });
  const rawGateway = createCoolifyGitSetGateway({ manifest: m, binding: s, releaseId: state.release.id, sourcePins: cfg.sourcePins, transport: queueTransport,
    inspectTarget: stateGateway.inspectTarget, inspectRuntime: stateGateway.inspectRuntime, safety,
    inspectRemote: async () => { const row = await github.inspect(m, { allowArchived: false }); return { mainCommit: row.remoteBase }; },
    configureTarget: async ({ targetId, commit }) => { await coolifyJson({ url: `${new URL(cfg.coolify.origin).origin}/api/v1/applications/${targetId}`,
      method: 'PATCH', token: coolifyCredential, certificateSha256: cfg.coolify.certificateSha256, body: { git_commit_sha: commit } }); },
    checkServices: async manifest => {
      const observations = []; let healthy = true;
      for (const service of manifest.services) { const ok = await healthProbe(service.healthUrl, service.expectedStatus, cfg.health.certificateSha256, service.expectedJsonStatus); healthy &&= ok;
        observations.push({ name: service.name, healthUrl: service.healthUrl, expectedStatus: service.expectedStatus,
          ...(service.expectedJsonStatus === undefined ? {} : { expectedJsonStatus: service.expectedJsonStatus }), healthy: ok }); }
      const basis = await fingerprint(); return { healthy, healthDigest: contract.releaseDigest(observations), dataDigest: basis.dataDigest };
    }, inspectBackup: async () => { check(backup && ['digest', 'bytes', 'capturedAt', 'restoreVerifiedAt', 'restoreDigest'].every(key => backup[key] === m.backup[key]), 'backup_changed');
      return Object.fromEntries(['digest', 'bytes', 'capturedAt', 'restoreVerifiedAt', 'restoreDigest'].map(key => [key, backup[key]])); }
  });
  const adapter = createCoolifyGitSetAdapter({ gateway: rawGateway });
  const remember = options => { if (!options?.targetId) return; check(m.deployment.targets.some(t => t.targetId === options.targetId), 'target_changed');
    liveQueue.set(options.targetId, coolifyGitSetDeploymentId({ releaseId: state.release.id, operationId: options.operationId,
      targetId: options.targetId, rollback: options.rollback === true })); };
  const coolify = {};
  for (const method of Object.keys(adapter)) coolify[method] = async (manifest, binding, options) => {
    check(contract.releaseDigest(manifest) === contract.releaseDigest(m) && binding?.commit === s.commit
      && binding?.candidateTree === s.candidateTree && binding?.baseCommit === s.baseCommit && binding?.baseTree === s.baseTree, 'adapter_binding_changed');
    if (['deploy', 'rollback', 'waitForDeployment', 'reconcileDeployment'].includes(method))
      remember({ ...options, rollback: method === 'rollback' || options?.rollback === true });
    return adapter[method](m, binding, options);
  };
  const resources = Object.freeze({ assertClone,
    async inspectCapacity(manifest) {
      await assertClone(manifest); let capacity; try { capacity = JSON.parse(await ssh({ command: capacityCommand })); } catch { fail('capacity_unavailable'); }
      const queue = await phpRead(activeQueuePhp);
      check(exact(capacity, ['diskBytes', 'memoryBytes', 'load1']) && exact(queue, ['activeDeployments'])
        && Number.isSafeInteger(capacity.diskBytes) && capacity.diskBytes >= cfg.capacity.minDiskBytes
        && Number.isSafeInteger(capacity.memoryBytes) && capacity.memoryBytes >= cfg.capacity.minMemoryBytes
        && Number.isFinite(capacity.load1) && capacity.load1 <= cfg.capacity.maxLoad1 && queue.activeDeployments === 0, 'capacity_unavailable');
      return { available: true, ...capacity, activeDeployments: 0 };
    },
    async verifyRetention(manifest) {
      await assertClone(manifest); check(manifest.cleanup.ownedResourceIds.length === 0, 'disposable_resources_unsupported');
      for (const row of manifest.deployment.targets) { await stateGateway.inspectTarget(row.targetId);
        const application = await coolifyJson({ url: `${new URL(cfg.coolify.origin).origin}/api/v1/applications/${row.targetId}`,
          method: 'GET', token: coolifyCredential, certificateSha256: cfg.coolify.certificateSha256 });
        check(application && application.uuid === row.targetId, 'retained_application_unproven'); }
      return { applicationActive: true, targetId: manifest.deployment.targetId,
        protectedResourcesDigest: contract.releaseDigest(ownership.protectedResourceIds), absenceVerified: true, resourceIds: [] };
    }, ownedResource() { fail('disposable_resources_unsupported'); }, removeResource() { fail('disposable_resources_unsupported'); },
    cleanupLocal() { fail('permanent_repository_deletion_prohibited'); }, cleanupCoolifyApplication() { fail('permanent_application_deletion_prohibited'); }
  });
  return Object.freeze({ coolify: Object.freeze(coolify), resources, assertClone, safety,
    async safetyDiagnostic() { try { return parseGitSetSafetyCounts(await ssh({ command: psql(cfg.source), stdin: gitSetTradingSafetySql })); }
      catch { return { available: false, reason: 'release_trading_safety_unproven' }; } }
  });
}
