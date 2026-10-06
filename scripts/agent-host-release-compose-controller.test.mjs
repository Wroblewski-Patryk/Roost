import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { composePhasePolicySchema, composePhaseArtifactFile, composePhasePolicyDigest, renderComposePhaseCommands,
  composeMountDigest, qualifyComposePhaseArtifact, composePhaseValidationPhp, composeControllerPolicyRecord, composePhaseChecksumBytes } from './lib/agent-host-release-compose-controller.mjs';
import { createImmutableComposeRollback, composeRollbackDocumentDigest } from './lib/agent-host-release-compose-gateway.mjs';

const hash = c => c.repeat(64), sha = c => c.repeat(40), image = c => `sha256:${hash(c)}`;
const bytesDigest = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const mounts = [{ Type: 'volume', Name: 'fixture_data', Source: '/var/lib/docker/volumes/fixture_data/_data',
    Destination: '/var/lib/postgresql/data', Driver: 'local', Mode: 'rw', RW: true, Propagation: '' }];
  const original = { services: { app: { build: '.', env_file: ['.env'], labels: ['fixture=true'], depends_on: ['db'] },
    migrate: { build: '.', command: ['migrate'], restart: 'no' }, db: { image: 'pgvector/pgvector:pg15', volumes: ['data:/var/lib/postgresql/data'] } },
    networks: { fixture: { external: true } }, volumes: { data: { name: 'fixture_data' } } };
  const transformed = createImmutableComposeRollback({ document: original, sourceDocumentDigest: composeRollbackDocumentDigest(original),
    images: [{ name: 'app', imageDigest: image('a') }, { name: 'migrate', imageDigest: image('b') }] });
  const artifactBytes = Buffer.from(JSON.stringify(transformed.document));
  const services = [{ name: 'app', role: 'app', source: 'built', imageDigest: image('a'), imageRef: `fixtureapp_app:${sha('c')}`, mountDigest: composeMountDigest([]) },
    { name: 'migrate', role: 'migration', source: 'built', imageDigest: image('b'), imageRef: `fixtureapp_migrate:${sha('c')}`, mountDigest: composeMountDigest([]) },
    { name: 'db', role: 'database', source: 'image', imageDigest: image('d'), imageRef: 'pgvector/pgvector:pg15', mountDigest: composeMountDigest(mounts) }];
  const policy = { schemaVersion: 'roost-compose-phase-policy-v1', releaseId: '12345678-1234-1234-1234-123456789abc', targetId: 'fixtureapp',
    policyId: '22345678-1234-1234-1234-123456789abc', rendererDigest: hash('f'), settingsInvariantDigest: hash('a'), runtimeInvariantDigest: hash('b'),
    phase: 'rollback', commit: sha('c'), tree: sha('e'), composePath: '/docker-compose.coolify.yml', baseDirectory: '/',
    rawCompose: false, preserveRepository: false, useBuildServer: false, originalConfigDigest: hash('1'), phaseConfigDigest: hash('2'),
    artifactDigest: bytesDigest(artifactBytes), services,
    sourcePins: { queueHelper: hash('3'), deploymentJob: hash('4'), applicationModel: hash('5'), composeParser: hash('6'),
      dockerHelper: hash('7'), applicationsController: hash('8'), controllerRenderer: hash('f') } };
  const preflight = { policy, artifactBytes, configurationDigest: policy.phaseConfigDigest, sourcePins: policy.sourcePins,
    services: services.map(service => ({ name: service.name, imageDigest: service.imageDigest, mounts: service.name === 'db' ? mounts : [] })),
    rendererDigest: policy.rendererDigest, settingsInvariantDigest: policy.settingsInvariantDigest, runtimeInvariantDigest: policy.runtimeInvariantDigest,
    imageIdentities: [...services.map(service => ({ imageRef: service.imageDigest, imageDigest: service.imageDigest })),
      { imageRef: 'pgvector/pgvector:pg15', imageDigest: image('d') }] };
  return { ...preflight, mounts, document: transformed.document, preflight };
}

test('trusted phase renders supported normal build and immutable no-build rollback commands only', () => {
  const f = fixture(), commands = renderComposePhaseCommands(f.policy), file = composePhaseArtifactFile(f.policy);
  assert.match(commands.build, /^docker cp coolify:\/var\/www\/html\/storage\/app\/applications\/fixtureapp\//);
  assert(commands.build.includes(file)); assert(commands.build.includes(`sha256sum -c /artifacts/${file}.sha256`));
  assert.match(commands.build, /config --quiet$/); assert.doesNotMatch(commands.build, /\bbuild --pull\b/);
  assert.match(commands.start, /up -d --no-build --pull never app db migrate$/);
  assert(commands.start.includes('pgvector/pgvector:pg15')); assert(commands.start.includes(image('d')));
  assert(commands.start.includes('--project-name fixtureapp --project-directory .'));
  const candidate = renderComposePhaseCommands({ ...f.policy, phase: 'candidate', baseDirectory: '/subdirectory' });
  assert.match(candidate.build, /build --pull$/); assert(candidate.build.includes('./subdirectory/docker-compose.coolify.yml'));
  assert.match(candidate.start, /--no-build --pull never app db migrate$/); assert.doesNotMatch(candidate.start, /docker cp/);
  assert(candidate.build.indexOf('pgvector/pgvector:pg15') < candidate.build.indexOf('build --pull'));
});

test('start creates cadence without execution, then starts only app/database/migration in both phases', () => {
  const f = fixture(); f.policy.services.push({ ...f.policy.services[0], name: 'maintenance', role: 'cadence' },
    { ...f.policy.services[0], name: 'proactive', role: 'cadence' });
  for (const phase of ['candidate', 'rollback']) {
    const command = renderComposePhaseCommands({ ...f.policy, phase }).start;
    assert.match(command, /create --no-build --pull never --force-recreate maintenance proactive &&/);
    assert.match(command, /up -d --no-build --pull never app db migrate$/);
    assert.doesNotMatch(command, /up[^&]*\b(?:maintenance|proactive)\b/);
    assert(command.indexOf('create --no-build') < command.indexOf('up -d'));
  }
});

test('selected app services cannot indirectly start cadence through a declared dependency', () => {
  const f = fixture(), doc = structuredClone(f.document); doc.services.maintenance = { image: image('a') };
  f.policy.services.push({ ...f.policy.services[0], name: 'maintenance', role: 'cadence' });
  f.services.push({ ...f.services[0], name: 'maintenance' });
  doc.services.app.depends_on = { maintenance: { condition: 'service_started' } };
  f.artifactBytes = Buffer.from(JSON.stringify(doc)); f.policy.artifactDigest = bytesDigest(f.artifactBytes);
  assert.throws(() => qualifyComposePhaseArtifact(f), /cadence_dependency_unsafe/);
});

test('policy rejects caller shell, unqualified topology flags and escaped artifact paths', () => {
  const f = fixture();
  for (const change of [{ command: 'private' }, { composePath: '/a/../private' }, { baseDirectory: '/a//private' },
    { targetId: 'x;private' }, { rawCompose: true }, { preserveRepository: true }, { useBuildServer: true },
    { services: f.policy.services.map(row => ({ ...row, imageRef: 'x;private' })) }])
    assert.throws(() => renderComposePhaseCommands({ ...f.policy, ...change }), /policy_invalid/);
  assert.equal(composePhasePolicySchema.safeParse(f.policy).success, true);
});

test('mount digest includes volume identity/source/RW and canonicalizes order without exposing values', () => {
  const f = fixture(), first = composeMountDigest(f.mounts);
  assert.equal(first, composeMountDigest(f.mounts.map(row => Object.fromEntries(Object.entries(row).reverse()))));
  for (const change of [{ Name: 'other' }, { Source: '/different' }, { RW: false }, { Destination: '/different' }])
    assert.notEqual(composeMountDigest([{ ...f.mounts[0], ...change }]), first);
  assert.throws(() => composeMountDigest([f.mounts[0], f.mounts[0]]), /mounts_invalid/);
});

test('exact artifact capability binds phase/config/source/images/mounts and code-rendered command hashes', () => {
  const f = fixture(), cap = qualifyComposePhaseArtifact(f.preflight), commands = renderComposePhaseCommands(f.policy);
  assert.equal(cap.policyDigest, composePhasePolicyDigest(f.policy)); assert.equal(cap.phase, 'rollback');
  assert.equal(cap.artifactDigest, f.policy.artifactDigest); assert.equal(cap.buildCommandDigest, bytesDigest(commands.build));
  assert.equal(cap.startCommandDigest, bytesDigest(commands.start)); assert.equal(cap.phaseConfigDigest, f.policy.phaseConfigDigest);
  assert.equal(cap.artifactFile, composePhaseArtifactFile(f.policy)); assert.equal(cap.targetId, f.policy.targetId);
  const record = composeControllerPolicyRecord(f.policy); assert.equal(record.rendererDigest, cap.rendererDigest);
  assert.equal(record.buildCommandDigest, cap.buildCommandDigest); assert.equal(record.artifactDigest, cap.artifactDigest);
  assert.deepEqual(renderComposePhaseCommands({ ...f.policy, releaseId: '32345678-1234-1234-1234-123456789abc' }), commands);
  assert.notEqual(composePhasePolicyDigest({ ...f.policy, releaseId: '32345678-1234-1234-1234-123456789abc' }), cap.policyDigest);
});

test('changed bytes/config/source/DB alias/images/mount or service list deny capability', () => {
  for (const change of [
    f => { f.artifactBytes = Buffer.concat([f.artifactBytes, Buffer.from(' ')]); },
    f => { f.configurationDigest = hash('9'); },
    f => { f.sourcePins = { ...f.sourcePins, dockerHelper: hash('9') }; },
    f => { f.rendererDigest = hash('9'); },
    f => { f.settingsInvariantDigest = hash('9'); },
    f => { f.runtimeInvariantDigest = hash('9'); },
    f => { f.services[2].imageDigest = image('9'); },
    f => { f.services[2].mounts[0].Name = 'other'; },
    f => { f.services.pop(); },
    f => { f.services[1].name = f.services[0].name; },
    f => { f.imageIdentities.pop(); },
    f => { f.imageIdentities[0].imageDigest = image('9'); }
  ]) {
    const f = fixture(), input = structuredClone(f.preflight); input.artifactBytes = Buffer.from(input.artifactBytes); change(input);
    assert.throws(() => qualifyComposePhaseArtifact(input));
  }
});

test('artifact content cannot retain build or replace a protected database', () => {
  for (const change of [doc => { doc.services.app.build = '.'; }, doc => { doc.services.db.image = 'postgres:latest'; },
    doc => { delete doc.services.migrate; }, doc => { doc.services.unexpected = { image: image('a') }; }]) {
    const f = fixture(), input = structuredClone(f.preflight), document = JSON.parse(Buffer.from(input.artifactBytes).toString());
    change(document); input.artifactBytes = Buffer.from(JSON.stringify(document)); input.policy.artifactDigest = bytesDigest(input.artifactBytes);
    assert.throws(() => qualifyComposePhaseArtifact(input), /artifact_(?:image|service_set)_changed/);
  }
});

test('candidate capability permits only missing declared migration before first queue; no other absence is accepted', () => {
  const f = fixture(), input = { ...f.preflight, policy: { ...f.policy, phase: 'candidate' } };
  const doc = structuredClone(f.document); doc.services.app.build = '.'; doc.services.migrate.build = '.';
  input.artifactBytes = Buffer.from(JSON.stringify(doc)); input.policy.artifactDigest = bytesDigest(input.artifactBytes);
  input.services = f.services.filter(row => row.name !== 'migrate');
  input.imageIdentities = f.imageIdentities.filter(row => row.imageDigest !== image('b'));
  assert.equal(qualifyComposePhaseArtifact(input).phase, 'candidate');
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: input.services.filter(row => row.name !== 'app') }));
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: input.services.filter(row => row.name !== 'db') }));
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: [...input.services, { ...f.services[0], name: 'other' }] }), /service_set_changed/);
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, policy: { ...input.policy, phase: 'rollback' } }), /image_identity_changed/);
});

test('rollback without a baseline migrator still requires its sealed image and complete artifact', () => {
  const f = fixture(), input = { ...f.preflight, services: f.services.filter(row => row.name !== 'migrate') };
  assert.equal(qualifyComposePhaseArtifact(input).phase, 'rollback');
  assert.deepEqual(renderComposePhaseCommands(input.policy), renderComposePhaseCommands(f.policy));
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, imageIdentities: input.imageIdentities.filter(row => row.imageDigest !== image('b')) }), /image_identity_changed/);
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: input.services.filter(row => row.name !== 'app') }), /(?:service_set_changed|services_invalid)/);
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: input.services.filter(row => row.name !== 'db') }), /(?:service_set_changed|services_invalid)/);
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, services: [...input.services, input.services[0]] }), /service_set_changed/);
  const document = structuredClone(f.document); delete document.services.migrate;
  const artifactBytes = Buffer.from(JSON.stringify(document));
  assert.throws(() => qualifyComposePhaseArtifact({ ...input, artifactBytes, policy: { ...input.policy, artifactDigest: bytesDigest(artifactBytes) } }), /artifact_service_set_changed/);
});

const php = process.env.ROOST_TEST_PHP_BINARY ?? 'php';
let phpAvailable = false; try { execFileSync(php, ['-v'], { stdio: 'ignore', timeout: 5000 }); phpAvailable = true; } catch {}
test('identical fixed PHP rechecks installed command/file/code/images/mounts using bounded Docker descriptors', { skip: !phpAvailable }, () => {
  const f = fixture(), cap = qualifyComposePhaseArtifact(f.preflight), commands = renderComposePhaseCommands(f.policy);
const program = String.raw`<?php
class FixtureValidationPatterns {const SHELL_SAFE_COMMAND_PATTERN='/^[a-zA-Z0-9 \t._\-\/=:@,+\[\]{}#%^~&"\x27]+$/';}class_alias('FixtureValidationPatterns','App\\Support\\ValidationPatterns');
${composePhaseValidationPhp}
$input=json_decode(base64_decode('__INPUT__'),true);$controls=json_decode(base64_decode('__CONTROLS__'),true);$cap=$input['cap'];$calls=[];
$a=(object)['uuid'=>$cap['targetId'],'docker_compose_custom_build_command'=>$input['commands']['build'],
 'docker_compose_custom_start_command'=>$input['commands']['start'],'settings'=>(object)['is_raw_compose_deployment_enabled'=>false,
 'is_preserve_repository_enabled'=>false,'is_build_server_enabled'=>false]];
if(isset($controls['command']))$a->docker_compose_custom_start_command='other';if(isset($controls['mode']))$a->settings->is_raw_compose_deployment_enabled=true;
if(isset($controls['invalid_shell'])){$a->docker_compose_custom_start_command='docker compose --env-file "$PWD/.env" up -d';$cap['startCommandDigest']=hash('sha256',$a->docker_compose_custom_start_command);}
$readFile=fn($path)=>isset($controls['file'])?'changed':(str_ends_with($path,'.sha256')?(isset($controls['checksum'])?'changed':$cap['artifactDigest'].'  /artifacts/'.$cap['artifactFile']."\n"):$input['artifact']);
$readSource=fn($path)=>isset($controls['source'])?str_repeat('0',64):(str_contains($path,'docker.php')?$cap['sourcePins']['dockerHelper']:$cap['sourcePins']['applicationsController']);
$run=function($command)use(&$calls,$controls,$input,$cap){$calls[]=$command;
 if(str_starts_with($command,'docker container ls')&&isset($controls['missingMigrator']))return str_repeat('1',64)."\n".str_repeat('3',64);
 if(str_starts_with($command,'docker container ls'))return implode("\n",array_map(fn($i)=>str_repeat((string)$i,64),range(1,isset($controls['missing'])?2:3)));
 if(str_starts_with($command,'docker container inspect')){preg_match('/([1-3]){64}/',$command,$m);$index=(int)$m[1]-1;$row=$input['services'][$index];
  if(isset($controls['duplicate'])&&$index===1)$row['name']='app';if(isset($controls['mount'])&&$row['name']==='db')$row['mounts'][0]['Name']='other';
  if(isset($controls['database'])&&$row['name']==='db')$row['imageDigest']='sha256:'.str_repeat('9',64);return json_encode($row);}
 if(str_starts_with($command,'docker image inspect')){foreach($input['identities'] as $row)if(str_ends_with($command,"'".$row['imageRef']."'")||str_ends_with($command,'"'.$row['imageRef'].'"'))return isset($controls['image'])?'sha256:'.str_repeat('9',64):$row['imageDigest'];}
 throw new Exception('unexpected-command');};
$invariants=fn($application)=>['settingsInvariantDigest'=>isset($controls['invariant'])?str_repeat('0',64):$cap['settingsInvariantDigest'],'runtimeInvariantDigest'=>$cap['runtimeInvariantDigest']];
try{$ok=roost_validate_compose_phase($a,$cap,$readFile,$readSource,$run,$invariants);echo json_encode(['ok'=>$ok,'calls'=>$calls]);}
catch(Throwable $e){echo json_encode(['ok'=>false,'reason'=>$e->getMessage(),'calls'=>$calls]);}
`;
  const input = { cap, commands, artifact: f.artifactBytes.toString(), services: f.services, identities: f.imageIdentities };
  const run = (controls = {}, data = input) => JSON.parse(execFileSync(php, [], { encoding: 'utf8', timeout: 5000,
    input: program.replace('__INPUT__', Buffer.from(JSON.stringify(data)).toString('base64'))
      .replace('__CONTROLS__', Buffer.from(JSON.stringify(controls)).toString('base64')) }));
  const qualified = run(); assert.equal(qualified.ok, true, JSON.stringify(qualified)); assert(qualified.calls.length >= 7);
  assert(qualified.calls.every(command => /^docker (?:container (?:ls|inspect)|image inspect) /.test(command)));
  for (const controls of [{ command: true }, { invalid_shell: true }, { checksum: true }, { mode: true }, { file: true }, { source: true }, { missing: true },
    { duplicate: true }, { mount: true }, { database: true }, { image: true }, { invariant: true }]) assert.equal(run(controls).ok, false);
  const candidate = structuredClone(f.preflight); candidate.artifactBytes = Buffer.from(candidate.artifactBytes);
  candidate.policy.phase = 'candidate'; const doc = JSON.parse(candidate.artifactBytes.toString());
  doc.services.app.build = '.'; doc.services.migrate.build = '.'; candidate.artifactBytes = Buffer.from(JSON.stringify(doc));
  candidate.policy.artifactDigest = bytesDigest(candidate.artifactBytes);
  candidate.services = candidate.services.filter(row => row.name !== 'migrate');
  const candidateCap = qualifyComposePhaseArtifact(candidate);
  const candidateInput = { ...input, cap: candidateCap, commands: renderComposePhaseCommands(candidate.policy), artifact: candidate.artifactBytes.toString() };
  assert.equal(run({ missingMigrator: true }, candidateInput).ok, true);
  const rollbackMissing = run({ missingMigrator: true });
  assert.equal(rollbackMissing.ok, true);
  assert(rollbackMissing.calls.some(command => command.startsWith('docker image inspect') && command.includes(image('b'))));
  assert.equal(run({ missingMigrator: true }, { ...input, identities: input.identities.filter(row => row.imageDigest !== image('b')) }).ok, false);
  assert.equal(run({ missingMigrator: true, image: true }).ok, false);
  assert.equal(run({ missing: true }, candidateInput).ok, false);
});
