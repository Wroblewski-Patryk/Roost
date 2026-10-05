import { createHash } from 'node:crypto';
import { z } from 'zod';

const hash = z.string().regex(/^[a-f0-9]{64}$/), sha = z.string().regex(/^[a-f0-9]{40}$/);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/), image = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const location = z.string().max(200).regex(/^\/[A-Za-z0-9._/-]+$/)
  .refine(value => !value.slice(1).split('/').some(part => ['', '.', '..'].includes(part)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const bytesDigest = value => createHash('sha256').update(value).digest('hex');
const deny = reason => { throw Object.assign(Error(`release_compose_controller_${reason}`), { retryable: false }); };
const check = (value, reason) => { if (!value) deny(reason); };
const parse = (schema, value, reason) => { const result = schema.safeParse(value); if (!result.success) deny(reason); return result.data; };
const composePhasePolicyObject = z.object({ schemaVersion: z.literal('roost-compose-phase-policy-v1'),
  releaseId: z.string().uuid(), policyId: z.string().uuid(), targetId: id, phase: z.enum(['candidate', 'rollback']), commit: sha, tree: sha,
  composePath: location, baseDirectory: z.union([z.literal('/'), location]),
  rawCompose: z.literal(false), preserveRepository: z.literal(false), useBuildServer: z.literal(false),
  originalConfigDigest: hash, phaseConfigDigest: hash,
  artifactDigest: hash, rendererDigest: hash, settingsInvariantDigest: hash, runtimeInvariantDigest: hash,
  services: z.array(z.object({ name: id, role: z.enum(['app', 'migration', 'cadence', 'database']), source: z.enum(['built', 'image']), imageDigest: image,
    imageRef: z.string().max(300).regex(/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/), mountDigest: hash }).strict()).min(3).max(12),
  sourcePins: z.object({ queueHelper: hash, deploymentJob: hash, applicationModel: hash, composeParser: hash,
    dockerHelper: hash, applicationsController: hash, controllerRenderer: hash }).strict()
}).strict();
export const composePhasePolicySchema = composePhasePolicyObject.superRefine((policy, context) => {
  if (new Set(policy.services.map(row => row.name)).size !== policy.services.length
    || policy.services.filter(row => row.source === 'image').length !== 1
    || policy.services.filter(row => row.role === 'migration').length !== 1
    || policy.services.filter(row => row.role === 'app').length !== 1
    || policy.services.some(row => (row.source === 'image') !== (row.role === 'database'))
    || policy.rendererDigest !== policy.sourcePins.controllerRenderer)
    context.addIssue({ code: 'custom', message: 'phase_service_set_invalid' });
});

export const composePhaseCapabilitySchema = z.object({ schemaVersion: z.literal('roost-compose-phase-capability-v1'),
  releaseId: z.string().uuid(), policyId: z.string().uuid(), targetId: id, phase: z.enum(['candidate', 'rollback']), commit: sha, tree: sha,
  policyDigest: hash, artifactDigest: hash, artifactFile: z.string().regex(/^roost-release-[a-f0-9-]{36}-(?:candidate|rollback)-[a-f0-9]{64}\.json$/),
  phaseConfigDigest: hash, buildCommandDigest: hash, startCommandDigest: hash,
  rendererDigest: hash, settingsInvariantDigest: hash, runtimeInvariantDigest: hash,
  services: composePhasePolicyObject.shape.services, sourcePins: composePhasePolicyObject.shape.sourcePins }).strict();

export function composePhaseArtifactFile(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  return `roost-release-${p.policyId}-${p.phase}-${p.artifactDigest}.json`;
}

export function composePhasePolicyDigest(policy) {
  return digest(parse(composePhasePolicySchema, policy, 'policy_invalid'));
}

/** Fixed commands are rendered only from an installed, exact grant-bound policy. */
export function renderComposePhaseCommands(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  const suffix = p.baseDirectory === '/' ? '' : p.baseDirectory;
  const project = `--project-name ${p.targetId} --project-directory "$PWD${suffix}"`;
  const databaseImages = p.services.filter(service => service.source === 'image')
    .map(service => `test "$(docker image inspect --format '{{.Id}}' -- ${service.imageRef})" = ${service.imageDigest}`).join(' && ');
  const cadence = p.services.filter(service => service.role === 'cadence').map(service => service.name).sort();
  const active = p.services.filter(service => service.role !== 'cadence').map(service => service.name).sort();
  const start = file => {
    const compose = `docker compose ${project} --env-file "$PWD${suffix}/.env" -f ${file}`;
    const create = cadence.length ? `${compose} create --no-build --pull never --force-recreate ${cadence.join(' ')} && ` : '';
    return `${create}${compose} up -d --no-build --pull never ${active.join(' ')}`;
  };
  if (p.phase === 'candidate') return Object.freeze({
    build: `${databaseImages} && docker compose ${project} --env-file /artifacts/build-time.env -f "$PWD${suffix}${p.composePath}" build --pull`,
    start: `${databaseImages} && ${start(`"$PWD${suffix}${p.composePath}"`)}`
  });
  const artifact = composePhaseArtifactFile(p), destination = `/artifacts/${artifact}`;
  const copy = `docker cp coolify:/var/www/html/storage/app/applications/${p.targetId}/${artifact} ${destination}`;
  const verify = `printf '%s  %s\\n' ${p.artifactDigest} ${destination} | sha256sum -c -`;
  const images = [...new Set(p.services.map(service => service.imageDigest))].sort()
    .map(value => `test "$(docker image inspect --format '{{.Id}}' -- ${value})" = ${value}`).join(' && ');
  return Object.freeze({
    build: `${copy} && ${verify} && ${images} && docker compose ${project} --env-file /artifacts/build-time.env -f ${destination} config --quiet`,
    start: `${verify} && ${images} && ${databaseImages} && ${start(destination)}`
  });
}

/** Hash-only canonical record; inspector must independently hash installed commands and invariants. */
export function composeControllerPolicyRecord(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid'), commands = renderComposePhaseCommands(p);
  return Object.freeze({ schemaVersion: 'roost-compose-controller-policy-v1', phase: p.phase,
    rendererDigest: p.rendererDigest, artifactDigest: p.artifactDigest,
    buildCommandDigest: bytesDigest(commands.build), startCommandDigest: bytesDigest(commands.start),
    settingsInvariantDigest: p.settingsInvariantDigest, runtimeInvariantDigest: p.runtimeInvariantDigest });
}

const mountSchema = z.object({ Type: z.enum(['volume', 'bind', 'tmpfs']), Name: z.string().max(500).optional(),
  Source: z.string().max(1000), Destination: z.string().max(1000), Driver: z.string().max(100).optional(),
  Mode: z.string().max(100), RW: z.boolean(), Propagation: z.string().max(100) }).strict();
export function composeMountDigest(mounts) {
  const rows = parse(z.array(mountSchema).max(30), mounts, 'mounts_invalid');
  check(new Set(rows.map(row => row.Destination)).size === rows.length, 'mounts_invalid');
  return digest(rows.map(row => ({ Type: row.Type, Name: row.Name ?? null, Source: row.Source,
    Destination: row.Destination, Driver: row.Driver ?? null, Mode: row.Mode, RW: row.RW, Propagation: row.Propagation }))
    .sort((a, b) => a.Destination < b.Destination ? -1 : a.Destination > b.Destination ? 1 : 0));
}

export function qualifyComposePhaseArtifact({ policy, artifactBytes, configurationDigest, sourcePins, services, imageIdentities,
  rendererDigest, settingsInvariantDigest, runtimeInvariantDigest }) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  check(Buffer.isBuffer(artifactBytes) && artifactBytes.length > 0 && artifactBytes.length <= 131072
    && bytesDigest(artifactBytes) === p.artifactDigest, 'artifact_changed');
  check(configurationDigest === p.phaseConfigDigest && digest(sourcePins) === digest(p.sourcePins), 'configuration_changed');
  check(rendererDigest === p.rendererDigest && settingsInvariantDigest === p.settingsInvariantDigest
    && runtimeInvariantDigest === p.runtimeInvariantDigest, 'controller_invariant_changed');
  const actual = parse(z.array(z.object({ name: id, imageDigest: image, mounts: z.array(mountSchema).max(30) }).strict()).min(2).max(12),
    services, 'services_invalid');
  check(new Set(actual.map(row => row.name)).size === actual.length
    && actual.every(row => p.services.some(service => service.name === row.name))
    && p.services.every(row => actual.some(service => service.name === row.name)
      || row.role === 'migration'), 'service_set_changed');
  for (const declared of p.services) {
    const row = actual.find(service => service.name === declared.name);
    if (!row && declared.role === 'migration') continue;
    check(composeMountDigest(row.mounts) === declared.mountDigest, 'mount_changed');
    if (p.phase === 'candidate') check(row.imageDigest === declared.imageDigest, 'candidate_image_changed');
    if (declared.source === 'image') check(row.imageDigest === declared.imageDigest, 'database_image_changed');
  }
  const resolved = parse(z.array(z.object({ imageDigest: image, imageRef: z.string().max(300).regex(/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/) }).strict()).min(1).max(24),
    imageIdentities, 'images_invalid');
  for (const row of p.services) {
    if (p.phase === 'candidate' && row.role === 'migration' && !actual.some(service => service.name === row.name)) continue;
    check(resolved.some(value => value.imageRef === row.imageDigest && value.imageDigest === row.imageDigest)
    && (row.source === 'built' || resolved.some(value => value.imageRef === row.imageRef && value.imageDigest === row.imageDigest)), 'image_identity_changed');
  }
  let document; try { document = JSON.parse(artifactBytes.toString('utf8')); } catch { deny('artifact_invalid'); }
  {
    check(document?.services && !Array.isArray(document.services)
      && Object.keys(document.services).length === p.services.length
      && p.services.every(row => Object.hasOwn(document.services, row.name)), 'artifact_service_set_changed');
    for (const row of p.services) {
      const service = document.services[row.name];
      check(service && typeof service === 'object' && (p.phase === 'rollback'
        ? !Object.hasOwn(service, 'build') && service.image === (row.source === 'built' ? row.imageDigest : row.imageRef)
        : Object.hasOwn(service, 'build') === (row.source === 'built')
          && (row.source === 'built' || service.image === row.imageRef)), 'artifact_image_changed');
      if (row.role !== 'cadence') {
        const dependencies = service.depends_on ?? [];
        check(Array.isArray(dependencies) || dependencies && typeof dependencies === 'object', 'artifact_dependencies_invalid');
        const names = Array.isArray(dependencies) ? dependencies : Object.keys(dependencies);
        check(names.every(name => typeof name === 'string' && p.services.some(dependency => dependency.name === name && dependency.role !== 'cadence')),
          'cadence_dependency_unsafe');
      }
    }
  }
  const commands = renderComposePhaseCommands(p);
  return Object.freeze({ schemaVersion: 'roost-compose-phase-capability-v1', releaseId: p.releaseId, targetId: p.targetId,
    policyId: p.policyId, phase: p.phase, commit: p.commit, tree: p.tree,
    policyDigest: digest(p), artifactDigest: p.artifactDigest, artifactFile: composePhaseArtifactFile(p),
    phaseConfigDigest: p.phaseConfigDigest, buildCommandDigest: bytesDigest(commands.build), startCommandDigest: bytesDigest(commands.start),
    rendererDigest: p.rendererDigest, settingsInvariantDigest: p.settingsInvariantDigest, runtimeInvariantDigest: p.runtimeInvariantDigest,
    services: structuredClone(p.services), sourcePins: structuredClone(p.sourcePins) });
}

/** The queue rechecks the actual installed config/file/images/mounts before dispatch. */
export const composePhaseValidationPhp = String.raw`
function roost_phase_canonical($v){if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=roost_phase_canonical($x);}return $v;}
function roost_phase_hash($v){return hash('sha256',json_encode(roost_phase_canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));}
function roost_phase_mount_hash($mounts){$out=[];$dest=[];foreach($mounts as $m){$r=[];foreach(['Type','Name','Source','Destination','Driver','Mode','RW','Propagation'] as $key)$r[$key]=$m[$key]??null;
 if(isset($dest[$r['Destination']]))throw new Exception('mount');$dest[$r['Destination']]=true;$out[]=$r;}
 usort($out,fn($a,$b)=>strcmp($a['Destination'],$b['Destination']));return roost_phase_hash($out);}
function roost_validate_compose_phase($a,$cap,$readFile,$readSource,$run,$readInvariants){
 if($cap['schemaVersion']!=='roost-compose-phase-capability-v1'||!in_array($cap['phase'],['candidate','rollback'],true)
  ||$a->settings->is_raw_compose_deployment_enabled!==false||$a->settings->is_preserve_repository_enabled!==false
  ||$a->settings->is_build_server_enabled!==false||hash('sha256',$a->docker_compose_custom_build_command??'')!==$cap['buildCommandDigest']
  ||hash('sha256',$a->docker_compose_custom_start_command??'')!==$cap['startCommandDigest'])throw new Exception('phase');
 $invariants=$readInvariants($a);foreach(['settingsInvariantDigest','runtimeInvariantDigest'] as $key)
  if(($invariants[$key]??null)!==$cap[$key])throw new Exception('phase-invariant');
 foreach(['dockerHelper'=>'/var/www/html/bootstrap/helpers/docker.php','applicationsController'=>'/var/www/html/app/Http/Controllers/Api/ApplicationsController.php'] as $key=>$path)
  if($readSource($path)!==$cap['sourcePins'][$key])throw new Exception('phase-source');
 if($cap['artifactFile']!=='roost-release-'.$cap['policyId'].'-'.$cap['phase'].'-'.$cap['artifactDigest'].'.json')throw new Exception('phase-path');
 $bytes=$readFile('/var/www/html/storage/app/applications/'.$a->uuid.'/'.$cap['artifactFile']);
 if(!is_string($bytes)||strlen($bytes)>131072||hash('sha256',$bytes)!==$cap['artifactDigest'])throw new Exception('phase-artifact');
 $doc=json_decode($bytes,true,32,JSON_THROW_ON_ERROR);$services=$doc['services']??null;
 if(!is_array($services)||count($services)!==count($cap['services']))throw new Exception('phase-services');
 $ids=trim($run('docker container ls -a --no-trunc --filter '.escapeshellarg('label=com.docker.compose.project='.$a->uuid).' --format '.escapeshellarg('{{.ID}}')));
 $ids=$ids===''?[]:preg_split('/\R/',$ids);if(count($ids)>count($cap['services'])||count($ids)<count($cap['services'])-1)throw new Exception('phase-runtime');$rows=[];
 foreach($ids as $id){if(!preg_match('/^[a-f0-9]{64}$/',$id))throw new Exception('phase-container');
 $format='{"name":{{json (index .Config.Labels "com.docker.compose.service")}},"imageDigest":{{json .Image}},"mounts":{{json .Mounts}}}';
 $row=json_decode($run('docker container inspect --format '.escapeshellarg($format).' -- '.escapeshellarg($id)),true,32,JSON_THROW_ON_ERROR);
 if(isset($rows[$row['name']]))throw new Exception('phase-duplicate');$rows[$row['name']]=$row;}
 if(array_diff(array_keys($rows),array_column($cap['services'],'name')))throw new Exception('phase-runtime');
 foreach($cap['services'] as $s){$name=$s['name'];$service=$services[$name]??null;$row=$rows[$name]??null;
 if(!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/',$name)||!preg_match('/^sha256:[a-f0-9]{64}$/',$s['imageDigest'])
  ||!is_array($service))throw new Exception('phase-service');
 if($cap['phase']==='rollback'&&(array_key_exists('build',$service)||($service['image']??null)!==($s['source']==='built'?$s['imageDigest']:$s['imageRef'])))throw new Exception('phase-service');
 if($cap['phase']==='candidate'&&(($s['source']==='built')!==array_key_exists('build',$service)
   ||($s['source']==='image'&&($service['image']??null)!==$s['imageRef'])))throw new Exception('phase-service');
 if($s['role']!=='cadence'){$dependencies=$service['depends_on']??[];if(!is_array($dependencies))throw new Exception('phase-dependencies');
  $names=array_is_list($dependencies)?$dependencies:array_keys($dependencies);foreach($names as $name){$allowed=false;
   foreach($cap['services'] as $declared)if($declared['name']===$name&&$declared['role']!=='cadence')$allowed=true;
   if(!$allowed)throw new Exception('phase-dependencies');}}
 if(!$row&&$cap['phase']==='candidate'&&$s['role']==='migration')continue;
 if(!$row&&$cap['phase']==='rollback'&&$s['role']==='migration'){
  if(trim($run('docker image inspect --format '.escapeshellarg('{{.Id}}').' -- '.escapeshellarg($s['imageDigest'])))!==$s['imageDigest'])throw new Exception('phase-image');
  continue;
 }
 if(!$row||roost_phase_mount_hash($row['mounts'])!==$s['mountDigest'])throw new Exception('phase-service');
 if($cap['phase']==='candidate'&&$row['imageDigest']!==$s['imageDigest'])throw new Exception('phase-image');
 $inspect=fn($ref)=>trim($run('docker image inspect --format '.escapeshellarg('{{.Id}}').' -- '.escapeshellarg($ref)));
 if($inspect($s['imageDigest'])!==$s['imageDigest']||($s['source']==='image'&&($row['imageDigest']!==$s['imageDigest']||$inspect($s['imageRef'])!==$s['imageDigest'])))throw new Exception('phase-image');
 }
 return true;
}
`;
