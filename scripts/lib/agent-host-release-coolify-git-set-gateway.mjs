import { createHash } from 'node:crypto';
import contract from './agent-host-release-contract.cjs';
import { dockerfileConfigurationFields } from './agent-host-release-dockerfile-state.mjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const id = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const validId = value => typeof value === 'string' && id.test(value);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const statuses = ['queued', 'in_progress', 'finished', 'failed', 'cancelled-by-user'];
const deny = (reason, uncertain = false, cause) => { throw Object.assign(new Error(`release_git_set_gateway_${reason}`, cause ? { cause } : undefined), { uncertain, retryable: false }); };
const assert = (value, reason) => { if (!value) deny(reason); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every(key => keys.includes(key));
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Fixed installed capability. Exported for executing this same program against
// source-test doubles; no PHP or shell supplied by a model enters this function.
export const coolifyGitSetRollbackPreparationPhp = String.raw`
function roost_canonical($v){if(is_object($v))$v=get_object_vars($v);if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=roost_canonical($x);}return $v;}
function roost_encoded($v){return json_encode(roost_canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);}
function roost_hashed($v){return hash('sha256',roost_encoded($v));}
function roost_rows($v){usort($v,fn($a,$b)=>strcmp(roost_hashed($a),roost_hashed($b)));return $v;}
function roost_pick($v,$keys){$r=[];foreach($keys as $key)$r[$key]=$v[$key]??null;return $r;}
function roost_config_digest($a){$raw=$a->toArray();$settings=$a->settings->toArray();$configuration=[];
 $configurationFields=json_decode(base64_decode('${Buffer.from(JSON.stringify(dockerfileConfigurationFields)).toString('base64')}'),true,32,JSON_THROW_ON_ERROR);
 foreach($configurationFields as $key)$configuration[$key]=$raw[$key]??$settings[$key]??null;
 $env=[];foreach($a->environment_variables->merge($a->environment_variables_preview) as $item){$v=$item->toArray();$v['value']=$item->value;
  if(!is_string($v['key']??null)||!is_string($v['value']))throw new Exception('environment');$env[]=roost_pick($v,['key','value','is_build_time','is_runtime','is_preview','is_literal','is_multiline','is_shown_once']);}
 $persistent=[];foreach($a->persistentStorages as $item)$persistent[]=roost_pick($item->toArray(),['name','mount_path','host_path','is_readonly','resource_type']);
 $files=[];foreach($a->fileStorages as $item){if(!is_string($item->content))throw new Exception('storage');$x=roost_pick($item->toArray(),['fs_path','mount_path','is_directory','is_based_on_git','is_readonly']);$x['contentDigest']=roost_hashed($item->content);$files[]=$x;}
 $topology=['applicationId'=>(string)$a->id,'projectId'=>(string)$a->environment->project_id,'environmentId'=>(string)$a->environment_id,
  'destinationId'=>(string)$a->destination_id,'destinationType'=>$a->destination_type,'serverId'=>(string)$a->destination->server->id];
 return roost_hashed(['configuration'=>$configuration,'environmentHash'=>roost_hashed(roost_rows($env)),
  'storageHash'=>roost_hashed(['persistent'=>roost_rows($persistent),'files'=>roost_rows($files)]),'topology'=>$topology]);}
function roost_prepare_rollback($a,$p,$readSource,$run){
 $r=$p['rollbackImage'];
 if(!$p['rollback']||$readSource('/var/www/html/app/Models/Application.php')!==$r['applicationModel'])throw new Exception('source');
 if($a->build_pack!=='dockerfile'||$a->dockerfile||$a->docker_registry_image_name||$a->git_commit_sha!==$p['commit']
  ||$a->settings->is_auto_deploy_enabled!==false||$a->settings->is_build_server_enabled||$a->additional_servers->count()>0)throw new Exception('scope');
 if(App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->exists())throw new Exception('queue');
 $sealedConfig=fn()=>roost_config_digest($a);
 if($sealedConfig()!==$r['configDigest']||$a->isConfigurationChanged(false)!==false)throw new Exception('configuration');
 $alias=$a->uuid.':'.$p['commit'];
 $inspect=fn($ref)=>trim($run('docker image inspect --format '.escapeshellarg('{{.Id}}').' -- '.escapeshellarg($ref).' 2>/dev/null || true'));
 if($inspect($r['imageDigest'])!==$r['imageDigest'])throw new Exception('image');
 $current=$inspect($alias);
 if($current!==''&&$current!==$r['imageDigest']&&$current!==$r['previousImageDigest'])throw new Exception('alias');
 if($current!==$r['imageDigest'])$run('docker image tag -- '.escapeshellarg($r['imageDigest']).' '.escapeshellarg($alias));
 $a->refresh();
 if($inspect($alias)!==$r['imageDigest']||$sealedConfig()!==$r['configDigest']||$a->git_commit_sha!==$p['commit']
  ||$a->settings->is_auto_deploy_enabled!==false||$a->isConfigurationChanged(false)!==false
  ||App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->exists())throw new Exception('postcondition');
}
`;

export const coolifyGitSetBaselinePreservationPhp = String.raw`
function roost_preserve_baseline($a,$p,$readSource,$run){
 $r=$p['preserveImage'];
 if($readSource('/var/www/html/app/Models/Application.php')!==$r['applicationModel']
  ||$readSource('/var/www/html/app/Actions/Server/CleanupDocker.php')!==$r['cleanupAction'])throw new Exception('source');
 if($a->build_pack!=='dockerfile'||$a->dockerfile||$a->docker_registry_image_name||$a->git_commit_sha!==$p['commit']
  ||$a->settings->is_auto_deploy_enabled!==false||$a->settings->is_build_server_enabled||$a->additional_servers->count()>0
  ||roost_config_digest($a)!==$r['configDigest'])throw new Exception('configuration');
 if(App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->exists())throw new Exception('queue');
 $keep=$a->settings->docker_images_to_keep;
 if($a->destination->server->settings->disable_application_image_retention!==false||!is_int($keep)||$keep<3)throw new Exception('retention');
 $refs=trim($run('docker images --format '.escapeshellarg('{{.Repository}}:{{.Tag}}').' --filter '.escapeshellarg('reference='.$a->uuid.'*')));
 $rows=$refs===''?[]:explode("\n",$refs);$regular=[];
 foreach($rows as $ref){$ref=trim($ref);if(!preg_match('/^'.preg_quote($a->uuid,'/').'[A-Za-z0-9_-]*:[A-Za-z0-9_.-]+$/',$ref))throw new Exception('references');
  $tag=substr($ref,strrpos($ref,':')+1);if(!str_starts_with($tag,'pr-')&&!str_ends_with($tag,'-build'))$regular[$ref]=true;}
 if(count($regular)+2>$keep)throw new Exception('retention');
 $inspect=fn($ref)=>trim($run('docker image inspect --format '.escapeshellarg('{{.Id}}').' -- '.escapeshellarg($ref).' 2>/dev/null || true'));
 if($inspect($r['imageDigest'])!==$r['imageDigest'])throw new Exception('image');
 $alias=$a->uuid.':roost-baseline-'.$r['baselineCommit'];$current=$inspect($alias);
 if($current!==''&&$current!==$r['imageDigest'])throw new Exception('alias');
 // Rollback only verifies the alias created before candidate deployment.
 if($p['rollback']&&$current!==$r['imageDigest'])throw new Exception('preserved_alias');
 if(!$p['rollback']&&$current==='')$run('docker image tag -- '.escapeshellarg($r['imageDigest']).' '.escapeshellarg($alias));
 $a->refresh();
 if($inspect($alias)!==$r['imageDigest']||roost_config_digest($a)!==$r['configDigest']||$a->git_commit_sha!==$p['commit']
  ||$a->settings->is_auto_deploy_enabled!==false||$a->destination->server->settings->disable_application_image_retention!==false
  ||$a->settings->docker_images_to_keep!==$keep||App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->exists())throw new Exception('postcondition');
}
`;

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
${coolifyGitSetRollbackPreparationPhp}
${coolifyGitSetBaselinePreservationPhp}
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
  if (isset($p['preserveImage'])) roost_preserve_baseline($application,$p,
   fn($path)=>hash_file('sha256',$path),fn($command)=>instant_remote_process([$command],$application->destination->server,true));
  if (isset($p['rollbackImage'])) roost_prepare_rollback($application,$p,
   fn($path)=>hash_file('sha256',$path),fn($command)=>instant_remote_process([$command],$application->destination->server,true));
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
      ['targetId', 'dockerfile', 'deploymentId', 'commit', 'rollback', 'sourcePins', 'rollbackImage', 'preserveImage'])
      && validId(payload.targetId) && /^\/[A-Za-z0-9._/-]+$/.test(payload.dockerfile)
      && !payload.dockerfile.split('/').some(part => ['.', '..'].includes(part))
      && /^r[a-f0-9]{23}$/.test(payload.deploymentId) && sha.test(payload.commit)
      && typeof payload.rollback === 'boolean' && exact(payload.sourcePins, ['queueHelper', 'deploymentJob'])
      && hash.test(payload.sourcePins.queueHelper) && hash.test(payload.sourcePins.deploymentJob)
      && (payload.rollbackImage === undefined || operation === 'dispatch' && payload.rollback === true
        && exact(payload.rollbackImage, ['imageDigest', 'previousImageDigest', 'tree', 'configDigest', 'applicationModel'])
        && image.test(payload.rollbackImage.imageDigest) && (payload.rollbackImage.previousImageDigest === null || image.test(payload.rollbackImage.previousImageDigest))
        && sha.test(payload.rollbackImage.tree) && hash.test(payload.rollbackImage.configDigest) && hash.test(payload.rollbackImage.applicationModel))
      && (payload.preserveImage === undefined || operation === 'dispatch'
        && exact(payload.preserveImage, ['baselineCommit', 'imageDigest', 'tree', 'configDigest', 'applicationModel', 'cleanupAction'])
        && sha.test(payload.preserveImage.baselineCommit) && image.test(payload.preserveImage.imageDigest) && sha.test(payload.preserveImage.tree)
        && hash.test(payload.preserveImage.configDigest) && hash.test(payload.preserveImage.applicationModel) && hash.test(payload.preserveImage.cleanupAction)), 'transport_input_invalid');
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
  inspectTarget, inspectRuntime, inspectRemote, configureTarget, safety, checkServices, inspectBackup, inspectConfigurationPreimage, prepareRollbackImage, prepareBaselineImage }) {
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
    try { return await callback(...args); } catch (error) { deny(reason, false, error); }
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
    async inspectConfigurationPreimage(options) {
      if (inspectConfigurationPreimage === undefined) return null;
      assert(exact(options, ['operationId', 'since']) && validId(options.operationId) && date(options.since), 'preimage_operation_invalid');
      assert(typeof inspectConfigurationPreimage === 'function', 'preimage_reader_invalid');
      const row = await invoke(inspectConfigurationPreimage, [options], 'preimage_unproven');
      if (row === null) return null;
      assert(exact(row, ['absenceVerified', 'preimageDigest', 'configuredTargets']) && row.absenceVerified === true && hash.test(row.preimageDigest)
        && Array.isArray(row.configuredTargets) && row.configuredTargets.length === targets.size
        && new Set(row.configuredTargets.map(value => value.targetId)).size === targets.size
        && row.configuredTargets.every(value => exact(value, ['targetId', 'gitCommit', 'configDigest'])
          && targets.has(value.targetId) && sha.test(value.gitCommit) && value.configDigest === target(value.targetId).configDigest), 'preimage_unproven');
      return structuredClone(row);
    },
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
      const dispatch = payload(t, operationId, rollback);
      if (prepareBaselineImage !== undefined) {
        assert(typeof prepareBaselineImage === 'function', 'baseline_preparation_invalid');
        const row = await invoke(prepareBaselineImage, [Object.freeze({ targetId, operationId, since, rollback })], 'baseline_preparation_unproven');
        assert(exact(row, ['baselineCommit', 'imageDigest', 'tree', 'configDigest', 'applicationModel', 'cleanupAction'])
          && row.baselineCommit === t.baseline.commit && row.imageDigest === t.baseline.imageDigest && row.tree === t.baseline.tree
          && row.configDigest === t.baseline.configDigest && hash.test(row.applicationModel) && hash.test(row.cleanupAction), 'baseline_preparation_unproven');
        dispatch.preserveImage = Object.freeze(structuredClone(row));
      }
      if (rollback && prepareRollbackImage !== undefined) {
        assert(typeof prepareRollbackImage === 'function', 'rollback_preparation_invalid');
        const row = await invoke(prepareRollbackImage, [Object.freeze({ targetId, operationId, since })], 'rollback_preparation_unproven');
        assert(exact(row, ['imageDigest', 'previousImageDigest', 'tree', 'configDigest', 'applicationModel'])
          && row.imageDigest === t.baseline.imageDigest && row.tree === t.baseline.tree && row.configDigest === t.baseline.configDigest
          && (row.previousImageDigest === null || image.test(row.previousImageDigest)) && hash.test(row.applicationModel), 'rollback_preparation_unproven');
        dispatch.rollbackImage = Object.freeze(structuredClone(row));
      }
      try { await transport.run('dispatch', dispatch); }
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
