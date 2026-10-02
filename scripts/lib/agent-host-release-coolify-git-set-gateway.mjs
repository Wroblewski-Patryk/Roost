import { createHash } from 'node:crypto';
import contract from './agent-host-release-contract.cjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const id = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const validId = value => typeof value === 'string' && id.test(value);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const statuses = ['queued', 'in_progress', 'finished', 'failed', 'cancelled-by-user'];
const deny = (reason, uncertain = false) => { throw Object.assign(new Error(`release_git_set_gateway_${reason}`), { uncertain, retryable: false }); };
const assert = (value, reason) => { if (!value) deny(reason); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => keys.includes(key));
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Stable across lost replies and process restarts; never use a fresh ID on retry. */
export function coolifyGitSetDeploymentId({ releaseId, operationId, targetId, rollback = false }) {
  assert(uuid.test(releaseId) && validId(operationId) && validId(targetId) && typeof rollback === 'boolean', 'identity_invalid');
  return `r${digest([releaseId, operationId, targetId, rollback ? 'rollback' : 'candidate']).slice(0, 23)}`;
}

// Only payload data changes. No shell command, PHP body, application path or
// executable supplied by a model can enter this program. Normal Coolify service
// queueing owns the mutation; this does not insert queue records directly.
const phpBody = String.raw`
error_reporting(0); ini_set('display_errors', '0');
try {
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (!is_array($p) || !in_array($p['operation'], ['read', 'dispatch'], true)) throw new Exception('input');
$application = App\Models\Application::where('uuid', $p['targetId'])->first();
if (!$application || $application->build_pack !== 'dockerfile' || $application->dockerfile_location !== $p['dockerfile']) throw new Exception('target');
if (hash_file('sha256', '/var/www/html/bootstrap/helpers/applications.php') !== $p['sourcePins']['queueHelper']
 || hash_file('sha256', '/var/www/html/app/Jobs/ApplicationDeploymentJob.php') !== $p['sourcePins']['deploymentJob']) throw new Exception('source');
$read = function () use ($application, $p) {
 $q = App\Models\ApplicationDeploymentQueue::where('deployment_uuid', $p['deploymentId'])->first();
 if (!$q) return null;
 if ((string) $q->application_id !== (string) $application->id) throw new Exception('identity');
 return ['targetId' => $application->uuid, 'deploymentId' => $q->deployment_uuid, 'commit' => $q->commit,
  'status' => $q->status, 'createdAt' => $q->created_at->toISOString()];
};
if ($p['operation'] === 'dispatch') {
 Illuminate\Support\Facades\Cache::lock('roost-release-'.$p['deploymentId'], 30)->block(3, function () use ($application, $p, $read) {
  $existing = $read();
  if ($existing !== null) {
   if ($existing['commit'] !== $p['commit']) throw new Exception('commit');
   return;
  }
  if ($application->settings->is_auto_deploy_enabled !== false || $application->git_commit_sha !== $p['commit']) throw new Exception('configuration');
  queue_application_deployment(application: $application, deployment_uuid: $p['deploymentId'], commit: $p['commit'],
   force_rebuild: false, is_api: true, rollback: $p['rollback']);
 });
}
echo json_encode(['ok' => true, 'queue' => $read()], JSON_THROW_ON_ERROR);
} catch (Throwable $e) { echo '{"ok":false}'; exit(1); }
`;

/**
 * runOwned must invoke this exact child descriptor under the Worker's owned-child
 * supervisor, with stdin streamed to the child. It must not run through a local
 * shell or print stdout/stderr. SSH uses the installation's pinned host key.
 */
export function createFixedCoolifyGitSetSshTransport({ runOwned, sshBinary, sshHost, containerName = 'coolify', timeoutMs = 15000 }) {
  assert(typeof runOwned === 'function' && typeof sshBinary === 'string'
    && /^(?:[A-Za-z]:[\\/][^\x00\r\n]+|\/[^\x00\r\n]+)$/.test(sshBinary)
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(sshHost)
    && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(containerName)
    && Number.isInteger(timeoutMs) && timeoutMs >= 1000 && timeoutMs <= 30000, 'transport_config_invalid');
  return Object.freeze({ async run(operation, payload) {
    assert(['read', 'dispatch'].includes(operation) && exact(payload,
      ['targetId', 'dockerfile', 'deploymentId', 'commit', 'rollback', 'sourcePins'])
      && validId(payload.targetId) && /^\/[A-Za-z0-9._/-]+$/.test(payload.dockerfile)
      && !payload.dockerfile.split('/').some(part => ['.', '..'].includes(part))
      && /^r[a-f0-9]{23}$/.test(payload.deploymentId) && sha.test(payload.commit)
      && typeof payload.rollback === 'boolean' && exact(payload.sourcePins, ['queueHelper', 'deploymentJob'])
      && hash.test(payload.sourcePins.queueHelper) && hash.test(payload.sourcePins.deploymentJob), 'transport_input_invalid');
    const encoded = Buffer.from(JSON.stringify({ ...payload, operation })).toString('base64');
    const stdin = `<?php\n$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);\n${phpBody}`;
    let result;
    try { result = await runOwned({ file: sshBinary, args: ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
      '-o', 'ConnectTimeout=10', sshHost, `docker exec -i ${containerName} php`], stdin, timeoutMs,
      maxOutputBytes: 8192, write: operation === 'dispatch' }); }
    catch { deny('transport_unproven', operation === 'dispatch'); }
    assert(result && typeof result.stdout === 'string' && Buffer.byteLength(result.stdout) <= 8192, 'response_invalid');
    let response; try { response = JSON.parse(result.stdout); } catch { deny('response_invalid', operation === 'dispatch'); }
    if (result.exitCode !== 0 || !exact(response, ['ok', 'queue']) || response.ok !== true
      || !(response.queue === null || validQueue(response.queue))) deny('response_unproven', operation === 'dispatch');
    return { queue: response.queue };
  } });
}

function validQueue(row) {
  return exact(row, ['targetId', 'deploymentId', 'commit', 'status', 'createdAt']) && validId(row.targetId)
    && /^r[a-f0-9]{23}$/.test(row.deploymentId) && (sha.test(row.commit) || row.commit === 'HEAD')
    && statuses.includes(row.status) && date(row.createdAt);
}

/**
 * All injected readers are fixed installation gateways, not model tools. The
 * caller verifies runtime container/image provenance and hashes the complete
 * effective config (including env/storage) without returning secret values.
 * configureTarget uses normal Coolify configuration APIs and may only pin
 * git_commit_sha; the sealed config digest intentionally excludes that pin.
 */
export function createCoolifyGitSetGateway({ manifest, binding, releaseId, sourcePins, transport,
  inspectTarget, inspectRuntime, inspectRemote, configureTarget, safety, checkServices, inspectBackup }) {
  assert(manifest?.deployment?.provider === 'coolify_git_set' && manifest.purpose === 'application_release'
    && manifest.cleanup?.archiveRepository === false && uuid.test(releaseId) && sha.test(binding?.commit)
    && sha.test(binding?.candidateTree) && Array.isArray(manifest.deployment.targets)
    && manifest.deployment.targets.length >= 1 && manifest.deployment.targets.length <= 6
    && new Set(manifest.deployment.targets.map(t => t.targetId)).size === manifest.deployment.targets.length
    && exact(sourcePins, ['queueHelper', 'deploymentJob']) && hash.test(sourcePins.queueHelper)
    && hash.test(sourcePins.deploymentJob) && typeof transport?.run === 'function'
    && [inspectTarget, inspectRuntime, inspectRemote, configureTarget, safety, checkServices, inspectBackup]
      .every(callback => typeof callback === 'function'), 'configuration_invalid');
  manifest = structuredClone(manifest); binding = structuredClone(binding); sourcePins = structuredClone(sourcePins);
  for (const row of manifest.deployment.targets) assert(validId(row.targetId)
    && typeof row.dockerfile === 'string' && /^\/[A-Za-z0-9._/-]+$/.test(row.dockerfile)
    && !row.dockerfile.split('/').some(part => ['.', '..'].includes(part)) && hash.test(row.configDigest)
    && sha.test(row.baseline?.commit) && sha.test(row.baseline?.tree) && image.test(row.baseline?.imageDigest)
    && row.baseline.configDigest === row.configDigest, 'target_configuration_invalid');
  const invoke = async (callback, args, reason) => {
    try { return await callback(...args); } catch { deny(reason); }
  };
  const targets = new Map(manifest.deployment.targets.map(target => [target.targetId, structuredClone(target)]));
  const target = targetId => { const result = targets.get(targetId); assert(result, 'target_outside_scope'); return result; };
  const version = (t, rollback) => rollback ? t.baseline : { commit: binding.commit, tree: binding.candidateTree };
  const remote = async () => {
    const row = await invoke(inspectRemote, [], 'remote_unproven'); assert(exact(row, ['mainCommit']) && sha.test(row.mainCommit), 'remote_unproven');
    return { mainCommit: row.mainCommit };
  };
  const state = async targetId => {
    const t = target(targetId), row = await invoke(inspectTarget, [targetId], 'target_state_unproven');
    assert(exact(row, ['targetId', 'buildPack', 'dockerfile', 'configDigest', 'schemaDigest', 'gitCommit', 'autoDeploy'])
      && row.targetId === targetId && row.buildPack === 'dockerfile' && row.dockerfile === t.dockerfile
      && row.configDigest === t.configDigest && row.schemaDigest === manifest.deployment.schemaDigest
      && sha.test(row.gitCommit) && row.autoDeploy === false, 'target_state_unproven');
    return structuredClone(row);
  };
  const safetyRead = async () => {
    const row = await invoke(safety, [], 'safety_unproven'); assert(exact(row, ['activeTrading', 'openOrders', 'openPositions', 'schemaDigest', 'dataDigest'])
      && [row.activeTrading, row.openOrders, row.openPositions].every(n => Number.isSafeInteger(n) && n >= 0)
      && hash.test(row.schemaDigest) && hash.test(row.dataDigest), 'safety_unproven'); return structuredClone(row);
  };
  const safe = async () => { const row = await safetyRead(); assert(row.activeTrading === 0 && row.openOrders === 0
    && row.openPositions === 0 && row.schemaDigest === manifest.deployment.schemaDigest
    && row.dataDigest === manifest.baseline.dataDigest, 'live_activity_or_data_changed'); };
  const payload = (t, operationId, rollback) => ({ targetId: t.targetId, dockerfile: t.dockerfile,
    deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId: t.targetId, rollback }),
    commit: version(t, rollback).commit, rollback, sourcePins });
  const readQueue = async (t, operationId, rollback, since) => {
    assert(date(since), 'operation_time_invalid'); const p = payload(t, operationId, rollback);
    const result = await invoke(transport.run.bind(transport), ['read', p], 'queue_unproven');
    assert(exact(result, ['queue']) && (result.queue === null || validQueue(result.queue)), 'queue_unproven');
    if (result.queue) assert(result.queue.targetId === t.targetId && result.queue.deploymentId === p.deploymentId
      && [p.commit, 'HEAD'].includes(result.queue.commit) && Date.parse(result.queue.createdAt) >= Date.parse(since), 'queue_identity_changed');
    return result.queue;
  };
  return Object.freeze({ inspectTarget: state, safety: safetyRead, inspectRemote: remote,
    async configure(targetId, expectedConfigDigest, mode) {
      assert(['candidate', 'rollback'].includes(mode), 'mode_invalid'); const t = target(targetId);
      assert(expectedConfigDigest === t.configDigest, 'configuration_changed'); await safe(); await state(targetId);
      const rollback = mode === 'rollback'; if (!rollback) assert((await remote()).mainCommit === binding.commit, 'remote_changed');
      try { await configureTarget({ targetId, expectedConfigDigest, commit: version(t, rollback).commit, mode }); }
      catch { deny('configuration_result_uncertain', true); }
      const after = await state(targetId); if (after.gitCommit !== version(t, rollback).commit) deny('configuration_result_uncertain', true);
      return { targetId, configDigest: after.configDigest };
    },
    async deployTarget(targetId, commit, { rollback = false, since, operationId } = {}) {
      const t = target(targetId); assert(typeof rollback === 'boolean' && commit === version(t, rollback).commit, 'commit_changed');
      const existing = await readQueue(t, operationId, rollback, since);
      if (existing) return { targetId, deploymentId: existing.deploymentId, commit: existing.commit };
      await safe(); const before = await state(targetId); assert(before.gitCommit === commit, 'configuration_pin_changed');
      if (!rollback) assert((await remote()).mainCommit === commit, 'remote_changed');
      try { await transport.run('dispatch', payload(t, operationId, rollback)); }
      catch { deny('dispatch_result_uncertain', true); }
      // A successful reply alone is not a durable queue receipt.
      const row = await readQueue(t, operationId, rollback, since); if (!row) deny('dispatch_result_uncertain', true);
      if (!rollback && (await remote()).mainCommit !== commit) deny('remote_changed_after_dispatch', true);
      return { targetId, deploymentId: row.deploymentId, commit: row.commit };
    },
    async listDeployments(targetId, { since, operationId, rollback = false } = {}) {
      const row = await readQueue(target(targetId), operationId, rollback, since);
      return { deployments: row ? [row] : [], absenceVerified: row === null };
    },
    async inspectRuntime(targetId) {
      target(targetId); const row = await invoke(inspectRuntime, [targetId], 'runtime_unproven');
      assert(exact(row, ['targetId', 'commit', 'tree', 'imageDigest', 'configDigest', 'schemaDigest', 'healthy', 'deploymentId'])
        && row.targetId === targetId && sha.test(row.commit) && sha.test(row.tree) && image.test(row.imageDigest)
        && hash.test(row.configDigest) && hash.test(row.schemaDigest) && typeof row.healthy === 'boolean'
        && validId(row.deploymentId), 'runtime_unproven'); return structuredClone(row);
    },
    async checkServices(input) {
      assert(input === manifest || contract.releaseDigest(input) === contract.releaseDigest(manifest), 'manifest_changed');
      const row = await invoke(checkServices, [structuredClone(manifest)], 'health_unproven'); assert(exact(row, ['healthy', 'healthDigest', 'dataDigest'])
        && typeof row.healthy === 'boolean' && hash.test(row.healthDigest) && hash.test(row.dataDigest), 'health_unproven'); return structuredClone(row);
    },
    async inspectBackup() {
      const row = await invoke(inspectBackup, [], 'backup_unproven'); assert(exact(row, ['digest', 'bytes', 'capturedAt', 'restoreVerifiedAt', 'restoreDigest'])
        && hash.test(row.digest) && Number.isSafeInteger(row.bytes) && row.bytes > 0 && date(row.capturedAt)
        && date(row.restoreVerifiedAt) && hash.test(row.restoreDigest), 'backup_unproven'); return structuredClone(row);
    }
  });
}
