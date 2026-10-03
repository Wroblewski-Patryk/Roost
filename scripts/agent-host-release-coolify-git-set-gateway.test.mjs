import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { coolifyGitSetDeploymentId, createCoolifyGitSetGateway, createFixedCoolifyGitSetSshTransport, coolifyGitSetRollbackPreparationPhp, coolifyGitSetBaselinePreservationPhp }
  from './lib/agent-host-release-coolify-git-set-gateway.mjs';
import { dockerfileConfigurationFields, dockerfileConfigurationDigest } from './lib/agent-host-release-dockerfile-state.mjs';
import { createHash } from 'node:crypto';

const releaseId = '12345678-1234-1234-1234-123456789abc', operationId = 'operation-1';
const commit = 'a'.repeat(40), tree = 'b'.repeat(40), baseCommit = 'c'.repeat(40), baseTree = 'd'.repeat(40);
const configDigest = '1'.repeat(64), schemaDigest = '2'.repeat(64), dataDigest = '3'.repeat(64);
const imageDigest = `sha256:${'4'.repeat(64)}`, since = '2026-10-02T00:00:00.000Z';
const sourcePins = { queueHelper: '5'.repeat(64), deploymentJob: '6'.repeat(64) };
const targetId = 'testweb';
function setup(changes = {}) {
  const target = { targetId, name: 'test-web', dockerfile: '/apps/web/Dockerfile', configDigest,
    baseline: { commit: baseCommit, tree: baseTree, imageDigest, configDigest } };
  const manifest = { purpose: 'application_release', cleanup: { archiveRepository: false },
    deployment: { provider: 'coolify_git_set', targets: [target], schemaDigest }, baseline: { dataDigest } };
  const calls = []; let queue = null;
  const state = { targetId, buildPack: 'dockerfile', dockerfile: target.dockerfile, configDigest, schemaDigest,
    gitCommit: commit, autoDeploy: false };
  const transport = { async run(action, payload) { calls.push({ action, payload });
    if (action === 'dispatch') queue = { targetId, deploymentId: payload.deploymentId, commit: payload.commit,
      status: 'queued', createdAt: since }; return { queue }; } };
  const callbacks = {
    inspectTarget: async () => ({ ...state }),
    inspectRuntime: async () => ({ targetId, commit, tree, imageDigest, configDigest, schemaDigest, healthy: true,
      deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }) }),
    inspectRemote: async () => ({ mainCommit: commit }),
    configureTarget: async ({ commit: nextCommit }) => { state.gitCommit = nextCommit; },
    safety: async () => ({ activeTrading: 0, openOrders: 0, openPositions: 0, schemaDigest, dataDigest }),
    checkServices: async () => ({ healthy: true, healthDigest: '7'.repeat(64), dataDigest }),
    inspectBackup: async () => ({ digest: '8'.repeat(64), bytes: 100, capturedAt: since,
      restoreVerifiedAt: since, restoreDigest: '8'.repeat(64) })
  };
  const gateway = createCoolifyGitSetGateway({ manifest, binding: { commit, candidateTree: tree }, releaseId,
    sourcePins, transport, ...callbacks, ...changes });
  return { gateway, manifest, state, calls, transport, callbacks, setQueue: row => { queue = row; } };
}
test('preimage reader wrapper retains non-enumerable causes for bounded diagnostics and historical omission is null', async () => {
  assert.equal(await setup().gateway.inspectConfigurationPreimage({}), null);
  const cause = Error('release_native_response_unproven'), f = setup({ inspectConfigurationPreimage: async () => { throw cause; } });
  await assert.rejects(f.gateway.inspectConfigurationPreimage({ operationId, since }), error => {
    assert.equal(error.message, 'release_git_set_gateway_preimage_unproven'); assert.equal(error.cause, cause);
    assert.equal(Object.keys(error).includes('cause'), false); assert.equal(JSON.stringify(error).includes(cause.message), false); return true;
  });
});

test('deterministic queue identity binds release, operation, target and mode', () => {
  const input = { releaseId, operationId, targetId };
  assert.match(coolifyGitSetDeploymentId(input), /^r[a-f0-9]{23}$/);
  assert.equal(coolifyGitSetDeploymentId(input), coolifyGitSetDeploymentId(input));
  for (const next of [{ ...input, operationId: 'operation-2' }, { ...input, targetId: 'api' },
    { ...input, rollback: true }, { ...input, releaseId: '87654321-1234-1234-1234-123456789abc' }])
    assert.notEqual(coolifyGitSetDeploymentId(input), coolifyGitSetDeploymentId(next));
  assert.throws(() => coolifyGitSetDeploymentId({ ...input, operationId: "bad'; code" }), /identity_invalid/);
});

test('health authority accepts reordered sealed keys and rejects changed basis', async () => {
  const f = setup();
  const reordered = { baseline: f.manifest.baseline, deployment: f.manifest.deployment,
    cleanup: f.manifest.cleanup, purpose: f.manifest.purpose };
  assert.equal((await f.gateway.checkServices(reordered)).healthy, true);
  await assert.rejects(f.gateway.checkServices({ ...reordered, baseline: { dataDigest: '9'.repeat(64) } }), /manifest_changed/);
});

test('dispatch reads exact absence, queues normal operation and reads durable receipt', async () => {
  const f = setup(); const result = await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.deepEqual(f.calls.map(call => call.action), ['read', 'dispatch', 'read']);
  assert.equal(result.deploymentId, coolifyGitSetDeploymentId({ releaseId, operationId, targetId }));
  await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 1);
});

test('lost dispatch reply remains uncertain and exact readback avoids duplicate mutation', async () => {
  const f = setup(), run = f.transport.run;
  f.transport.run = async (...args) => { const receipt = await run(...args); if (args[0] === 'dispatch') throw Error('Bearer private'); return receipt; };
  await assert.rejects(f.gateway.deployTarget(targetId, commit, { since, operationId }), error =>
    error.uncertain === true && error.message === 'release_git_set_gateway_dispatch_result_uncertain');
  const proof = await f.gateway.listDeployments(targetId, { since, operationId });
  assert.equal(proof.deployments.length, 1); assert.equal(proof.absenceVerified, false);
  await f.gateway.deployTarget(targetId, commit, { since, operationId });
  assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 1);
});

test('changed remote, auto deployment, config and live activity block dispatch', async () => {
  for (const kind of ['remote', 'auto', 'config', 'live']) {
    const f = setup(kind === 'remote' ? { inspectRemote: async () => ({ mainCommit: baseCommit }) }
      : kind === 'live' ? { safety: async () => ({ activeTrading: 1, openOrders: 0, openPositions: 0, schemaDigest, dataDigest }) } : {});
    if (kind === 'auto') f.state.autoDeploy = true;
    if (kind === 'config') f.state.configDigest = '9'.repeat(64);
    await assert.rejects(f.gateway.deployTarget(targetId, commit, { since, operationId }));
    assert.equal(f.calls.filter(call => call.action === 'dispatch').length, 0);
  }
});

test('config callback receives only allowed pin and immutable scope; changes fail closed', async () => {
  const calls = [], f = setup({ configureTarget: async value => { calls.push(value); } });
  await f.gateway.configure(targetId, configDigest, 'candidate');
  assert.deepEqual(calls, [{ targetId, expectedConfigDigest: configDigest, commit, mode: 'candidate' }]);
  f.state.dockerfile = '/other/Dockerfile';
  await assert.rejects(f.gateway.configure(targetId, configDigest, 'candidate'), /target_state_unproven/);
  assert.equal(calls.length, 1);
});

test('rollback preserves the target-specific baseline SHA rather than repository main', async () => {
  const f = setup(); await f.gateway.configure(targetId, configDigest, 'rollback');
  assert.equal(f.state.gitCommit, baseCommit);
  const receipt = await f.gateway.deployTarget(targetId, baseCommit, { since, operationId, rollback: true });
  assert.equal(receipt.commit, baseCommit); assert.equal(f.calls.find(call => call.action === 'dispatch').payload.rollback, true);
});

test('exact rollback preparation is dispatch-only, sealed to baseline and never invoked by read/reconciliation', async () => {
  let prepares = 0;
  const f = setup({ prepareRollbackImage: async options => { prepares++; assert.ok(Object.isFrozen(options));
    return { imageDigest, previousImageDigest: null, tree: baseTree, configDigest, applicationModel: '9'.repeat(64) }; } });
  await f.gateway.configure(targetId, configDigest, 'rollback');
  await f.gateway.listDeployments(targetId, { since, operationId, rollback: true }); assert.equal(prepares, 0);
  await f.gateway.deployTarget(targetId, baseCommit, { since, operationId, rollback: true }); assert.equal(prepares, 1);
  const dispatch = f.calls.find(call => call.action === 'dispatch');
  assert.ok(Object.isFrozen(dispatch.payload.rollbackImage)); assert.equal(dispatch.payload.rollbackImage.imageDigest, imageDigest);
  await f.gateway.deployTarget(targetId, baseCommit, { since, operationId, rollback: true }); assert.equal(prepares, 1);
  for (const change of [{ imageDigest: `sha256:${'a'.repeat(64)}` }, { tree }, { configDigest: 'a'.repeat(64) }]) {
    const denied = setup({ prepareRollbackImage: async () => ({ imageDigest, previousImageDigest: null,
      tree: baseTree, configDigest, applicationModel: '9'.repeat(64), ...change }) });
    await denied.gateway.configure(targetId, configDigest, 'rollback');
    await assert.rejects(denied.gateway.deployTarget(targetId, baseCommit, { since, operationId, rollback: true }), /rollback_preparation_unproven/);
    assert.equal(denied.calls.some(call => call.action === 'dispatch'), false);
  }
});

test('fixed transport admits only typed rollback image data for dispatch, not read or candidate', async () => {
  const f = sshFixture({ stdout: '{"ok":true,"queue":null}', exitCode: 0 });
  const payload = { ...transportPayload(), rollback: true, rollbackImage: { imageDigest, previousImageDigest: null,
    tree: baseTree, configDigest, applicationModel: '9'.repeat(64) } };
  await f.transport.run('dispatch', payload);
  assert.equal(f.calls[0].write, true); assert.match(f.calls[0].stdin, /roost_prepare_rollback\(\$application/);
  assert.doesNotMatch(f.calls[0].stdin, /config_hash\s*=|isConfigurationChanged\(true\)/);
  await assert.rejects(f.transport.run('read', payload), /transport_input_invalid/);
  await assert.rejects(f.transport.run('dispatch', { ...payload, rollback: false }), /transport_input_invalid/);
  await assert.rejects(f.transport.run('dispatch', { ...payload, rollbackImage: { ...payload.rollbackImage, command: 'private' } }), /transport_input_invalid/);
  assert.equal(f.calls.length, 1);
});

test('baseline preservation is dispatch-only for candidate and rollback, sealed to original image with no reconcile effects', async () => {
  let preparations = 0;
  const f = setup({ prepareBaselineImage: async options => { preparations++; assert.ok(Object.isFrozen(options));
    return { baselineCommit: baseCommit, imageDigest, tree: baseTree, configDigest, applicationModel: '9'.repeat(64), cleanupAction: '0'.repeat(64) }; } });
  await f.gateway.listDeployments(targetId, { since, operationId }); assert.equal(preparations, 0);
  await f.gateway.deployTarget(targetId, commit, { since, operationId }); assert.equal(preparations, 1);
  const dispatch = f.calls.find(row => row.action === 'dispatch'); assert.ok(Object.isFrozen(dispatch.payload.preserveImage));
  assert.equal(dispatch.payload.preserveImage.baselineCommit, baseCommit); assert.equal(dispatch.payload.preserveImage.imageDigest, imageDigest);
  await f.gateway.deployTarget(targetId, commit, { since, operationId }); assert.equal(preparations, 1);
  const transport = sshFixture({ stdout: '{"ok":true,"queue":null}', exitCode: 0 });
  await transport.transport.run('dispatch', dispatch.payload);
  assert.match(transport.calls[0].stdin, /CleanupDocker\.php/); assert.match(transport.calls[0].stdin, /count\(\$regular\)\+2>\$keep/);
  await assert.rejects(transport.transport.run('read', dispatch.payload), /transport_input_invalid/);
  await assert.rejects(transport.transport.run('dispatch', { ...dispatch.payload,
    preserveImage: { ...dispatch.payload.preserveImage, cleanupAction: 'invalid' } }), /transport_input_invalid/);
  const bad = setup({ prepareBaselineImage: async () => ({ ...dispatch.payload.preserveImage, baselineCommit: commit }) });
  await assert.rejects(bad.gateway.deployTarget(targetId, commit, { since, operationId }), /baseline_preparation_unproven/);
  assert.equal(bad.calls.some(row => row.action === 'dispatch'), false);
});

const phpBinary = process.env.ROOST_TEST_PHP_BINARY ?? 'php';
let phpAvailable = false; try { execFileSync(phpBinary, ['-v'], { stdio: 'ignore', timeout: 5000 }); phpAvailable = true; } catch {}
test('actual fixed PHP preparation reuses exact image and refuses source/config/queue/alias drift without rebuild', { skip: !phpAvailable }, () => {
  const configuration = Object.fromEntries(dockerfileConfigurationFields.map(key => [key, null]));
  Object.assign(configuration, { build_pack: 'dockerfile', dockerfile_location: '/apps/web/Dockerfile' });
  const hashed = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const topology = { applicationId: '4', projectId: '2', environmentId: '3', destinationId: '5', destinationType: 'docker', serverId: '6' };
  const sealed = dockerfileConfigurationDigest({ configuration, environmentHash: hashed([]), storageHash: hashed({ files: [], persistent: [] }), topology });
  const p = { ...transportPayload(), commit: baseCommit, rollback: true,
    rollbackImage: { imageDigest, previousImageDigest: `sha256:${'a'.repeat(64)}`, tree: baseTree, configDigest: sealed, applicationModel: '9'.repeat(64) },
    preserveImage: { baselineCommit: baseCommit, imageDigest, tree: baseTree, configDigest: sealed, applicationModel: '9'.repeat(64), cleanupAction: '9'.repeat(64) } };
  const program = String.raw`<?php
namespace App\Models {class ApplicationDeploymentQueue {static function whereIn($k,$v){return new self;}function exists(){return $GLOBALS['controls']['queue']??false;}}}
namespace {error_reporting(0);ini_set('display_errors','0');
class Items implements IteratorAggregate {function getIterator():Traversable{return new ArrayIterator([]);}function merge($x){return $this;}function count(){return $GLOBALS['controls']['additional']??0;}}
class Settings {function __get($k){return ['is_auto_deploy_enabled'=>false,'is_build_server_enabled'=>$GLOBALS['controls']['buildserver']??false,'docker_images_to_keep'=>$GLOBALS['controls']['keep']??8][$k]??null;}function toArray(){return [];}}
class Application {public $id=4,$uuid='testweb',$git_commit_sha,$build_pack='dockerfile',$dockerfile=null,$docker_registry_image_name=null,$settings,$environment_variables,$environment_variables_preview,$persistentStorages,$fileStorages,$additional_servers,$environment,$environment_id=3,$destination_id=5,$destination_type='docker',$destination;
 function __construct($p){$this->git_commit_sha=$p['commit'];$this->settings=new Settings;foreach(['environment_variables','environment_variables_preview','persistentStorages','fileStorages','additional_servers'] as $k)$this->$k=new Items;$this->environment=(object)['project_id'=>2];$this->destination=(object)['server'=>(object)['id'=>6,'settings'=>(object)['disable_application_image_retention'=>$GLOBALS['controls']['disable']??false]]];if($GLOBALS['controls']['inline']??false)$this->dockerfile='FROM image';if($GLOBALS['controls']['registry']??false)$this->docker_registry_image_name='private';}
 function refresh(){return $this;}function toArray(){return $GLOBALS['configuration'];}function isConfigurationChanged($save=false){if($save)throw new Exception('save prohibited');return $GLOBALS['controls']['changed']??false;}}
${coolifyGitSetRollbackPreparationPhp}
${coolifyGitSetBaselinePreservationPhp}
$p=json_decode(base64_decode('__PAYLOAD__'),true);$configuration=json_decode(base64_decode('__CONFIG__'),true);$controls=json_decode(base64_decode('__CONTROLS__'),true);
$commands=[];$alias=$controls['alias']??$p['rollbackImage']['previousImageDigest'];$preservedAlias=$controls['preservedAlias']??$p['preserveImage']['imageDigest'];$p['rollback']=!($controls['candidate']??false);$a=new Application($p);if($controls['config']??false){$p['rollbackImage']['configDigest']=str_repeat('0',64);$p['preserveImage']['configDigest']=str_repeat('0',64);}
try{$prepare=($controls['preserve']??false)?'roost_preserve_baseline':'roost_prepare_rollback';$prepare($a,$p,fn($path)=>(($controls['source']??false)||(($controls['cleanupSource']??false)&&str_contains($path,'CleanupDocker.php')))?str_repeat('0',64):$p['rollbackImage']['applicationModel'],function($command)use(&$commands,&$alias,&$preservedAlias,$p,$controls){$commands[]=$command;
 if(str_starts_with($command,'docker images --format '))return $controls['refs']??'';
 if(str_starts_with($command,'docker image tag -- ')){if(str_contains($command,'roost-baseline-'))$preservedAlias=$p['preserveImage']['imageDigest'];else $alias=$p['rollbackImage']['imageDigest'];return '';}
 if(str_contains($command,$p['rollbackImage']['imageDigest']))return ($controls['absent']??false)?'':(($controls['mismatch']??false)?'sha256:'.str_repeat('f',64):$p['rollbackImage']['imageDigest']);if(str_contains($command,'roost-baseline-'))return $preservedAlias;return $alias;});echo json_encode(['ok'=>true,'commands'=>$commands]);}
catch(Throwable $e){echo json_encode(['ok'=>false,'commands'=>$commands]);}}
`;
  const run = controls => JSON.parse(execFileSync(phpBinary, [], { input: program.replace('__PAYLOAD__', Buffer.from(JSON.stringify(p)).toString('base64'))
    .replace('__CONFIG__', Buffer.from(JSON.stringify(configuration)).toString('base64')).replace('__CONTROLS__', Buffer.from(JSON.stringify(controls)).toString('base64')),
    encoding: 'utf8', timeout: 5000, maxBuffer: 16384 }));
  for (const controls of [{}, { alias: '' }, { alias: imageDigest }]) {
    const result = run(controls); assert.equal(result.ok, true); assert.equal(result.commands.filter(x => x.startsWith('docker image tag')).length, controls.alias === imageDigest ? 0 : 1);
    assert.ok(result.commands.every(x => /^docker image (?:inspect|tag) /.test(x))); assert.ok(result.commands.every(x => !/build|remove|prune/.test(x)));
  }
  for (const controls of [{ source: true }, { config: true }, { changed: true }, { queue: true }, { absent: true }, { mismatch: true },
    { alias: `sha256:${'f'.repeat(64)}` }, { inline: true }, { registry: true }, { buildserver: true }, { additional: 1 }]) {
    const result = run(controls); assert.equal(result.ok, false, JSON.stringify(controls)); assert.equal(result.commands.some(x => x.startsWith('docker image tag')), false);
  }
  const created = run({ preserve: true, candidate: true, preservedAlias: '', changed: true });
  assert.equal(created.ok, true); assert.equal(created.commands.filter(x => x.startsWith('docker image tag')).length, 1);
  assert.ok(created.commands.find(x => x.startsWith('docker image tag')).includes(`testweb:roost-baseline-${baseCommit}`));
  const verified = run({ preserve: true }); assert.equal(verified.ok, true); assert.equal(verified.commands.some(x => x.startsWith('docker image tag')), false);
  for (const controls of [{ keep: 0 }, { keep: 2 }, { keep: 3, refs: 'testweb:newer1\ntestweb:newer2' }, { disable: true },
    { absent: true }, { mismatch: true }, { source: true }, { cleanupSource: true }, { config: true }, { queue: true },
    { preservedAlias: `sha256:${'f'.repeat(64)}` }, { preservedAlias: '' }, { refs: 'foreign:tag' }]) {
    const result = run({ preserve: true, ...controls }); assert.equal(result.ok, false, JSON.stringify(controls));
    assert.equal(result.commands.some(x => x.startsWith('docker image tag')), false);
  }
});

test('wrong queue identity, old timestamp or source commit cannot prove reconciliation', async () => {
  for (const change of [{ deploymentId: 'r' + '9'.repeat(23) }, { targetId: 'another' }, { commit: baseCommit },
    { createdAt: '2026-10-01T00:00:00.000Z' }]) {
    const f = setup(); f.setQueue({ targetId, deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }),
      commit, status: 'finished', createdAt: since, ...change });
    await assert.rejects(f.gateway.listDeployments(targetId, { since, operationId }), /queue_identity_changed/);
  }
});

test('unscoped target, absent correlation and runtime metadata extras are refused', async () => {
  const f = setup({ inspectRuntime: async () => ({ targetId, commit, tree, imageDigest, configDigest, schemaDigest,
    healthy: true, deploymentId: operationId, environment: { ACCESS_TOKEN: 'private' } }) });
  await assert.rejects(f.gateway.inspectRuntime(targetId), /runtime_unproven/);
  await assert.rejects(f.gateway.inspectTarget('unowned'), /target_outside_scope/);
  await assert.rejects(f.gateway.deployTarget(targetId, commit, { since }), /identity_invalid/);
});

function sshFixture(reply) {
  const calls = []; return { calls, transport: createFixedCoolifyGitSetSshTransport({ sshBinary: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
    sshHost: 'installation-vps', runOwned: async descriptor => { calls.push(descriptor); return reply; } }) };
}
const transportPayload = () => ({ targetId, dockerfile: '/apps/web/Dockerfile',
  deploymentId: coolifyGitSetDeploymentId({ releaseId, operationId, targetId }), commit, rollback: false, sourcePins });

test('fixed SSH descriptor streams bounded PHP data on stdin with pinned host verification', async () => {
  const f = sshFixture({ stdout: '{"ok":true,"queue":null}', exitCode: 0, stderr: 'ignored private text' });
  assert.deepEqual(await f.transport.run('read', transportPayload()), { queue: null });
  const call = f.calls[0]; assert.equal(call.args.at(-1), 'docker exec -i coolify php');
  assert.ok(call.args.includes('StrictHostKeyChecking=yes')); assert.equal(call.write, false);
  assert.match(call.stdin, /queue_application_deployment\(application:/);
  assert.match(call.stdin, /Cache::lock/); assert.match(call.stdin, /hash_file/);
  assert.doesNotMatch(call.stdin, /ApplicationDeploymentQueue::create|DB::insert|INSERT INTO/);
  assert.equal(call.maxOutputBytes, 8192);
});

test('transport rejects injected path and unexpected output without exposing values', async () => {
  const f = sshFixture({ stdout: '{"ok":true,"queue":null,"token":"private"}', exitCode: 0 });
  await assert.rejects(f.transport.run('read', { ...transportPayload(), dockerfile: '/apps/../private' }), /transport_input_invalid/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.transport.run('dispatch', transportPayload()), error => error.uncertain === true
    && error.message === 'release_git_set_gateway_response_unproven' && !error.message.includes('private'));
  assert.throws(() => createFixedCoolifyGitSetSshTransport({ sshBinary: 'ssh', sshHost: 'host;cat', runOwned: () => {} }), /transport_config_invalid/);
});

test('transport neither retries uncertain result nor persists raw error output', async () => {
  const f = sshFixture({ stdout: 'private failure log', exitCode: 1, stderr: 'secret' });
  await assert.rejects(f.transport.run('dispatch', transportPayload()), error => error.uncertain === true
    && error.message === 'release_git_set_gateway_response_invalid');
  assert.equal(f.calls.length, 1);
});

test('reader exceptions are sanitized and caller manifest mutation cannot widen target scope', async () => {
  const f = setup({ inspectRemote: async () => { throw Error('Bearer private-token'); } });
  await assert.rejects(f.gateway.inspectRemote(), error => error.message === 'release_git_set_gateway_remote_unproven');
  f.manifest.deployment.targets.push({ targetId: 'another' });
  await assert.rejects(f.gateway.inspectTarget('another'), /target_outside_scope/);
});
