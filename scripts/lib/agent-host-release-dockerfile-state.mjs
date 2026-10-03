import { createHash } from 'node:crypto';
import { coolifyConfigurationFields, coolifyUnsupportedConfigurationFields } from './agent-host-release-coolify.mjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/, image = /^sha256:[a-f0-9]{64}$/;
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const fail = (reason, cause) => { throw Object.assign(Error(`release_dockerfile_state_${reason}`, cause ? { cause } : undefined), { retryable: false }); };
const check = (value, reason) => { if (!value) fail(reason); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

// Runtime commit pins and queue timestamps are deliberately absent. The digest
// seals effective build/runtime configuration, secret hashes, storage, topology
// and the existing Dockerfile path; pinning an authorized SHA cannot change it.
export const dockerfileConfigurationFields = Object.freeze([...new Set([...coolifyConfigurationFields,
  ...coolifyUnsupportedConfigurationFields, 'build_pack', 'git_repository', 'git_branch', 'dockerfile_location',
  'dockerfile', 'dockerfile_target_build', 'install_command', 'build_command', 'docker_registry_image_name',
  'docker_registry_image_tag', 'custom_healthcheck_found', 'use_build_server', 'is_build_server_enabled',
  'is_gpu_enabled', 'gpu_driver', 'gpu_count', 'gpu_device_ids', 'gpu_options', 'is_static',
  'is_spa', 'is_multiple_server_deployment_enabled', 'is_watch_enabled', 'watch_paths'])]);

export function dockerfileConfigurationDigest(snapshot) {
  check(exact(snapshot, ['configuration', 'environmentHash', 'storageHash', 'topology'])
    && exact(snapshot.configuration, dockerfileConfigurationFields) && snapshot.configuration.build_pack === 'dockerfile'
    && hash.test(snapshot.environmentHash) && hash.test(snapshot.storageHash)
    && exact(snapshot.topology, ['applicationId', 'projectId', 'environmentId', 'destinationId', 'destinationType', 'serverId']), 'configuration_invalid');
  return digest(snapshot);
}

const php = String.raw`
error_reporting(0);ini_set('display_errors','0');
try {
require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
function canonical($v){if(is_object($v))$v=get_object_vars($v);if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=canonical($x);}return $v;}
function encoded($v){return json_encode(canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);}
function hashed($v){return hash('sha256',encoded($v));}
function rows($v){usort($v,fn($a,$b)=>strcmp(hashed($a),hashed($b)));return $v;}
function pick($v,$keys){$r=[];foreach($keys as $key)$r[$key]=$v[$key]??null;return $r;}
if(hash_file('sha256','/var/www/html/bootstrap/helpers/applications.php')!==$p['sourcePins']['queueHelper']
 ||hash_file('sha256','/var/www/html/app/Jobs/ApplicationDeploymentJob.php')!==$p['sourcePins']['deploymentJob'])throw new Exception('source');
$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();$raw=$a->toArray();$settings=$a->settings?->toArray()??[];
if($a->build_pack!=='dockerfile'||$a->dockerfile_location!==$p['dockerfile'])throw new Exception('scope');
$configuration=[];foreach($p['configurationFields'] as $key)$configuration[$key]=$raw[$key]??$settings[$key]??null;
$env=[];foreach($a->environment_variables->merge($a->environment_variables_preview) as $item){$v=$item->toArray();$v['value']=$item->value;
 if(!is_string($v['key']??null)||!is_string($v['value']))throw new Exception('environment');
 $env[]=pick($v,['key','value','is_build_time','is_runtime','is_preview','is_literal','is_multiline','is_shown_once']);}
$persistent=[];foreach($a->persistentStorages as $item)$persistent[]=pick($item->toArray(),['name','mount_path','host_path','is_readonly','resource_type']);
$files=[];foreach($a->fileStorages as $item){if(!is_string($item->content))throw new Exception('storage');
 $r=pick($item->toArray(),['fs_path','mount_path','is_directory','is_based_on_git','is_readonly']);$r['contentDigest']=hashed($item->content);$files[]=$r;}
$topology=['applicationId'=>(string)$a->id,'projectId'=>(string)$a->environment->project_id,'environmentId'=>(string)$a->environment_id,
 'destinationId'=>(string)$a->destination_id,'destinationType'=>$a->destination_type,'serverId'=>(string)$a->destination->server->id];
$snapshot=['configuration'=>$configuration,'environmentHash'=>hashed(rows($env)),'storageHash'=>hashed(['persistent'=>rows($persistent),'files'=>rows($files)]),'topology'=>$topology];
echo encoded(['targetId'=>$a->uuid,'applicationId'=>(string)$a->id,'buildPack'=>$a->build_pack,'dockerfile'=>$a->dockerfile_location,
 'configDigest'=>hashed($snapshot),'schemaDigest'=>$p['schemaDigest'],'gitCommit'=>$a->git_commit_sha,
 'autoDeploy'=>$settings['is_auto_deploy_enabled']??null,'topologyDigest'=>hashed($topology)]);
}catch(Throwable $e){echo '{"unproven":true}';exit(1);}
`;
// Some existing Dockerfile services have no HEALTHCHECK. Docker's inspect
// template uses strict map lookups, so optional Health must use index/with.
const containerFormat = '{"id":{{json .Id}},"imageId":{{json .Image}},"imageRef":{{json .Config.Image}},"createdAt":{{json .Created}},"applicationId":{{json (index .Config.Labels "coolify.applicationId")}},"deploymentId":{{json (index .Config.Labels "coolify.deploymentId")}},"running":{{json .State.Running}},"health":{{with (index .State "Health")}}{{json .Status}}{{else}}null{{end}}}';
const imageFormat = '{"imageId":{{json .Id}},"createdAt":{{json .Created}},"repoDigests":{{json .RepoDigests}}}';

/**
 * transport executes only these fixed descriptors through the scoped SSH child.
 * expectedDeploymentId and readDeployment bind a sealed current queue (or an
 * explicitly recorded baseline queue). Missing legacy provenance is refused.
 * treeForCommit must read the pinned canonical Git repo; it is not build-info.
 */
export function createDockerfileStateGateway({ targets, schemaDigest, sourcePins, transport,
  expectedDeploymentId, readDeployment, treeForCommit }) {
  check(Array.isArray(targets) && targets.length >= 1 && targets.length <= 6
    && new Set(targets.map(t => t.targetId)).size === targets.length && targets.every(t => id(t.targetId)
      && typeof t.dockerfile === 'string' && /^\/[A-Za-z0-9._/-]+$/.test(t.dockerfile)
      && !t.dockerfile.split('/').some(part => ['.', '..'].includes(part)))
    && hash.test(schemaDigest) && exact(sourcePins, ['queueHelper', 'deploymentJob'])
    && hash.test(sourcePins.queueHelper) && hash.test(sourcePins.deploymentJob)
    && [transport, expectedDeploymentId, readDeployment, treeForCommit].every(fn => typeof fn === 'function'), 'gateway_config_invalid');
  targets = structuredClone(targets); sourcePins = structuredClone(sourcePins);
  const target = targetId => { const row = targets.find(t => t.targetId === targetId); check(row, 'target_outside_scope'); return row; };
  const run = async (operation, command, stdin = '') => {
    let output; try { output = await transport({ operation, command, stdin, timeoutMs: 15000, maxOutputBytes: 16384, write: false }); }
    catch (error) { fail('transport_unproven', error); }
    check(typeof output === 'string' && Buffer.byteLength(output) <= 16384, 'response_invalid'); return output;
  };
  const json = async (...args) => { const output = await run(...args); try { return JSON.parse(output); } catch { fail('response_invalid'); } };
  const snapshot = async targetId => {
    const t = target(targetId), payload = { targetId, dockerfile: t.dockerfile, sourcePins, schemaDigest,
      configurationFields: dockerfileConfigurationFields };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const row = await json('dockerfile_configuration', 'docker exec -i coolify php',
      `<?php\n$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);\n${php}`);
    check(exact(row, ['targetId', 'applicationId', 'buildPack', 'dockerfile', 'configDigest', 'schemaDigest', 'gitCommit', 'autoDeploy', 'topologyDigest'])
      && row.targetId === targetId && /^[1-9][0-9]{0,15}$/.test(row.applicationId) && row.buildPack === 'dockerfile'
      && row.dockerfile === t.dockerfile && hash.test(row.configDigest) && row.schemaDigest === schemaDigest
      && sha.test(row.gitCommit) && typeof row.autoDeploy === 'boolean' && hash.test(row.topologyDigest), 'configuration_unproven');
    return row;
  };
  const inspectTarget = async targetId => {
    const row = await snapshot(targetId); return Object.fromEntries(['targetId', 'buildPack', 'dockerfile', 'configDigest',
      'schemaDigest', 'gitCommit', 'autoDeploy'].map(key => [key, row[key]]));
  };
  const inspectRuntime = async targetId => {
    target(targetId); const before = await snapshot(targetId);
    const ids = (await run('dockerfile_containers', `docker container ls -a --no-trunc --filter ${quote(`label=coolify.applicationId=${before.applicationId}`)} --format '{{.ID}}'`))
      .trim().split(/\r?\n/).filter(Boolean);
    check(ids.length === 1 && hash.test(ids[0]), 'container_conflict');
    const state = await json('dockerfile_container', `docker container inspect --format ${quote(containerFormat)} -- ${quote(ids[0])}`);
    check(exact(state, ['id', 'imageId', 'imageRef', 'createdAt', 'applicationId', 'deploymentId', 'running', 'health'])
      && state.id === ids[0] && image.test(state.imageId) && typeof state.imageRef === 'string'
      && date(state.createdAt) && state.applicationId === before.applicationId && typeof state.running === 'boolean'
      && [null, 'starting', 'healthy', 'unhealthy'].includes(state.health), 'container_unproven');
    // A mutable image tag alone is insufficient; it must agree with the actual
    // inspected image ID, target, finished queue SHA and container creation time.
    const match = state.imageRef.match(/^([A-Za-z0-9][A-Za-z0-9_-]{0,79}):([a-f0-9]{40})$/);
    check(match && match[1] === targetId, 'image_ref_unproven'); const commit = match[2];
    const inspected = await json('dockerfile_image', `docker image inspect --format ${quote(imageFormat)} -- ${quote(state.imageRef)}`);
    check(exact(inspected, ['imageId', 'createdAt', 'repoDigests']) && inspected.imageId === state.imageId
      && date(inspected.createdAt) && Date.parse(inspected.createdAt) <= Date.parse(state.createdAt)
      && Array.isArray(inspected.repoDigests) && inspected.repoDigests.length <= 30
      && inspected.repoDigests.every(value => typeof value === 'string' && value.length <= 500), 'image_identity_changed');
    let deploymentId, queue, tree;
    try { deploymentId = await expectedDeploymentId(targetId); check(id(deploymentId), 'queue_identity_required');
      queue = await readDeployment({ targetId, deploymentId }); tree = await treeForCommit(commit); }
    catch { fail('queue_or_tree_unproven'); }
    check(exact(queue, ['targetId', 'deploymentId', 'commit', 'status', 'createdAt', 'finishedAt'])
      && queue.targetId === targetId && queue.deploymentId === deploymentId && queue.commit === commit
      && queue.status === 'finished' && date(queue.createdAt) && date(queue.finishedAt)
      && Date.parse(queue.createdAt) <= Date.parse(state.createdAt) && Date.parse(state.createdAt) <= Date.parse(queue.finishedAt)
      && (!state.deploymentId || state.deploymentId === deploymentId) && sha.test(tree), 'queue_provenance_changed');
    const after = await snapshot(targetId);
    check(after.configDigest === before.configDigest && after.topologyDigest === before.topologyDigest, 'configuration_changed_during_inspection');
    return { targetId, commit, tree, imageDigest: state.imageId, configDigest: after.configDigest, schemaDigest,
      healthy: state.running && (state.health === null || state.health === 'healthy'), deploymentId };
  };
  return Object.freeze({ inspectTarget, inspectRuntime, snapshot });
}
