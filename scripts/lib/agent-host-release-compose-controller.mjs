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
const immutableCandidate = z.object({mode:z.literal('qualified_immutable_images'),replacementImagesDigest:hash,buildProofDigest:hash}).strict();
const replacementRow = z.object({name:id,imageDigest:image,commit:sha,tree:sha}).strict();
const serviceOrder=(a,b)=>a.name<b.name?-1:a.name>b.name?1:0;
export function composeReplacementImagesDigest(images){
 const rows=parse(z.array(replacementRow).length(4),images,'replacement_images_invalid');
 check(new Set(rows.map(r=>r.name)).size===4,'replacement_images_invalid');
 return digest(rows.slice().sort(serviceOrder));
}
const replacementFor=p=>p.services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:r.imageDigest,commit:p.commit,tree:p.tree}));
const immutableShape=p=>p.phase==='candidate'&&p.services.length===5&&new Set(p.services.map(r=>r.name)).size===5
 &&p.services.filter(r=>r.role==='app').length===1&&p.services.filter(r=>r.role==='migration').length===1&&p.services.filter(r=>r.role==='database').length===1
 &&p.services.every(r=>(r.source==='image')===(r.role==='database'))&&p.services.filter(r=>r.role==='cadence').length===2
 &&p.services.filter(r=>r.source==='built').length===4&&p.services.filter(r=>r.source==='built').every(r=>r.imageRef===r.imageDigest)
 &&p.candidateExecution.replacementImagesDigest===digest(replacementFor(p).sort(serviceOrder));
const instant=z.string().datetime({offset:true});
const immutablePhysical=z.object({name:id,role:z.literal('database'),containerId:hash,imageDigest:image,mountDigest:hash,
 state:z.literal('running'),health:z.literal('healthy'),exitCode:z.literal(0)}).strict();
const immutableInventory=z.object({targetId:id,observedAt:instant,projectServiceSetComplete:z.literal(true),services:z.array(immutablePhysical).length(1),digest:hash}).strict();
const immutableAbsence=z.object({name:id,role:z.enum(['app','migration','cadence']),source:z.literal('built'),mountDigest:hash,policyServiceDigest:hash,
 absenceVerified:z.literal(true),inventoryDigest:hash,observedAt:instant}).strict();
export const composeImmutableCandidateEntrySchema=z.object({schemaVersion:z.literal('roost-compose-immutable-candidate-entry-v1'),targetId:id,policyDigest:hash,
 observedAt:instant,inventory:immutableInventory,absences:z.array(immutableAbsence).length(4),evidenceDigest:hash}).strict();
const immutableEntrySchema=composeImmutableCandidateEntrySchema;
const replacementMetadataSchema=z.array(z.object({name:id,imageDigest:image,buildRevision:sha,revisionLabel:sha.nullable(),treeLabel:sha.nullable()}).strict()).length(4);

const composePhasePolicyObject = z.object({ schemaVersion: z.literal('roost-compose-phase-policy-v1'),
  releaseId: z.string().uuid(), policyId: z.string().uuid(), targetId: id, phase: z.enum(['candidate', 'rollback']), commit: sha, tree: sha,
  composePath: location, baseDirectory: z.union([z.literal('/'), location]),
  rawCompose: z.literal(false), preserveRepository: z.literal(false), useBuildServer: z.literal(false),
  originalConfigDigest: hash, phaseConfigDigest: hash,
  artifactDigest: hash, rendererDigest: hash, settingsInvariantDigest: hash, runtimeInvariantDigest: hash,
  candidateExecution:immutableCandidate.optional(),
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
    || policy.rendererDigest !== policy.sourcePins.controllerRenderer
    ||policy.candidateExecution!==undefined&&!immutableShape(policy))
    context.addIssue({ code: 'custom', message: 'phase_service_set_invalid' });
});

export const composePhaseCapabilitySchema = z.object({ schemaVersion: z.literal('roost-compose-phase-capability-v1'),
  releaseId: z.string().uuid(), policyId: z.string().uuid(), targetId: id, phase: z.enum(['candidate', 'rollback']), commit: sha, tree: sha,
  policyDigest: hash, artifactDigest: hash, artifactFile: z.string().regex(/^roost-release-[a-f0-9-]{36}-(?:candidate|rollback)-[a-f0-9]{64}\.json$/),
  phaseConfigDigest: hash, buildCommandDigest: hash, startCommandDigest: hash,
  rendererDigest: hash, settingsInvariantDigest: hash, runtimeInvariantDigest: hash,
  services: composePhasePolicyObject.shape.services, sourcePins: composePhasePolicyObject.shape.sourcePins,
  candidateExecution:immutableCandidate.optional(),entryQualification:immutableEntrySchema.optional(),replacementImageMetadata:replacementMetadataSchema.optional() }).strict().superRefine((p,c)=>{
   if(p.candidateExecution===undefined){if(p.entryQualification!==undefined||p.replacementImageMetadata!==undefined)c.addIssue({code:'custom',message:'immutable_candidate_scope_required'});}
   else if(!immutableShape(p)||!immutableEntrySchema.safeParse(p.entryQualification).success||!replacementMetadataSchema.safeParse(p.replacementImageMetadata).success
    ||!immutableCapabilityBindings(p))c.addIssue({code:'custom',message:'immutable_candidate_capability_invalid'});
  });
function immutableCapabilityBindings(p){
 const e=p.entryQualification,built=p.services.filter(r=>r.source==='built'),db=p.services.find(r=>r.role==='database'),actual=e.inventory.services[0];
 return e.targetId===p.targetId&&e.policyDigest===p.policyDigest&&e.inventory.targetId===p.targetId&&e.inventory.observedAt===e.observedAt
  &&e.evidenceDigest===composeImmutableCandidateEntryDigest(e)&&e.inventory.digest===composeImmutableCandidateInventoryDigest(e.inventory)
  &&actual.name===db.name&&actual.imageDigest===db.imageDigest&&actual.mountDigest===db.mountDigest
  &&new Set(e.absences.map(r=>r.name)).size===4&&built.every(r=>e.absences.some(v=>v.name===r.name&&v.role===r.role&&v.mountDigest===r.mountDigest
    &&v.policyServiceDigest===digest(r)&&v.inventoryDigest===e.inventory.digest&&v.observedAt===e.observedAt))
  &&new Set(p.replacementImageMetadata.map(r=>r.name)).size===4&&built.every(r=>p.replacementImageMetadata.some(v=>v.name===r.name&&v.imageDigest===r.imageDigest
    &&v.buildRevision===p.commit&&(v.revisionLabel===null||v.revisionLabel===p.commit)&&(v.treeLabel===null||v.treeLabel===p.tree)));
}

export function composePhaseArtifactFile(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  return `roost-release-${p.policyId}-${p.phase}-${p.artifactDigest}.json`;
}

export function composePhasePolicyDigest(policy) {
  return digest(parse(composePhasePolicySchema, policy, 'policy_invalid'));
}

export function composePhaseChecksumBytes(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  return Buffer.from(`${p.artifactDigest}  /artifacts/${composePhaseArtifactFile(p)}\n`);
}

// Docker evaluates json's arity only in the mismatch branch. A changed alias
// therefore exits nonzero without shell substitution or an unchecked output.
const imageIdentityCommand = (reference, expected) =>
  `docker image inspect --format '{{if ne .Id "${expected}"}}{{json}}{{end}}' -- ${reference}`;

/** Fixed commands are rendered only from an installed, exact grant-bound policy. */
export function renderComposePhaseCommands(policy) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  const suffix = p.baseDirectory === '/' ? '' : p.baseDirectory;
  const project = `--project-name ${p.targetId} --project-directory .${suffix}`;
  const databaseImages = p.services.filter(service => service.source === 'image')
    .map(service => imageIdentityCommand(service.imageRef, service.imageDigest)).join(' && ');
  const cadence = p.services.filter(service => service.role === 'cadence').map(service => service.name).sort();
  const active = p.services.filter(service => service.role !== 'cadence').map(service => service.name).sort();
  const start = file => {
    const compose = `docker compose ${project} --env-file .${suffix}/.env -f ${file}`;
    const create = cadence.length ? `${compose} create --no-build --pull never --force-recreate ${cadence.join(' ')} && ` : '';
    return `${create}${compose} up -d --no-build --pull never ${active.join(' ')}`;
  };
  if (p.phase === 'candidate'&&!p.candidateExecution) return Object.freeze({
    build: `${databaseImages} && docker compose ${project} --env-file /artifacts/build-time.env -f .${suffix}${p.composePath} build --pull --build-arg APP_BUILD_REVISION=${p.commit}`,
    start: `${databaseImages} && ${start(`.${suffix}${p.composePath}`)}`
  });
  const artifact = composePhaseArtifactFile(p), destination = `/artifacts/${artifact}`;
  const copy = `docker cp coolify:/var/www/html/storage/app/applications/${p.targetId}/${artifact} ${destination} && docker cp coolify:/var/www/html/storage/app/applications/${p.targetId}/${artifact}.sha256 ${destination}.sha256`;
  const verify = `sha256sum -c ${destination}.sha256`;
  const images = [...new Set(p.services.map(service => service.imageDigest))].sort()
    .map(value => imageIdentityCommand(value, value)).join(' && ');
  return Object.freeze({
    build: `${copy} && ${verify} && ${images} && docker compose ${project} --env-file /artifacts/build-time.env -f ${destination} config --no-env-resolution --services --quiet`,
    start: `${p.candidateExecution?copy+' && ':''}${verify} && ${images} && ${databaseImages} && ${start(destination)}`
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

export function composeImmutableCandidateInventoryDigest(value){const {digest:_,...body}=parse(immutableInventory,value,'immutable_entry_invalid');return digest(body);}
export function composeImmutableCandidateEntryDigest(value){const {evidenceDigest:_,...body}=parse(immutableEntrySchema,value,'immutable_entry_invalid');return digest(body);}
// This qualifies factual inputs from the installed reader. The Worker must
// independently verify their native/build provenance and exact owner authority.
export function qualifyImmutableCandidateEntry({policy,services,entryQualification,replacementImageMetadata,now=Date.now()}){
 const p=parse(composePhasePolicySchema,policy,'policy_invalid');check(p.candidateExecution,'immutable_candidate_scope_required');
 const e=parse(immutableEntrySchema,entryQualification,'immutable_entry_invalid'),metadata=parse(replacementMetadataSchema,replacementImageMetadata,'replacement_metadata_invalid');
 const db=p.services.find(r=>r.role==='database'),actual=services,physical=e.inventory.services[0],at=Date.parse(e.observedAt);
 check(Number.isFinite(now)&&at<=now&&now-at<=300000&&e.inventory.observedAt===e.observedAt,'immutable_entry_stale');
 check(e.targetId===p.targetId&&e.inventory.targetId===p.targetId&&e.policyDigest===composePhasePolicyDigest(p)
  &&e.inventory.digest===composeImmutableCandidateInventoryDigest(e.inventory)&&e.evidenceDigest===composeImmutableCandidateEntryDigest(e),'immutable_entry_binding_changed');
 check(actual.length===1&&actual[0].name===db.name&&actual[0].imageDigest===db.imageDigest&&composeMountDigest(actual[0].mounts)===db.mountDigest
  &&physical.name===db.name&&physical.imageDigest===db.imageDigest&&physical.mountDigest===db.mountDigest,'immutable_entry_database_changed');
 const built=p.services.filter(r=>r.source==='built');
 check(new Set(e.absences.map(r=>r.name)).size===4&&built.every(row=>e.absences.some(r=>r.name===row.name&&r.role===row.role&&r.mountDigest===row.mountDigest
  &&r.policyServiceDigest===digest(row)&&r.inventoryDigest===e.inventory.digest&&r.observedAt===e.observedAt)),'immutable_entry_absence_unproven');
 check(new Set(metadata.map(r=>r.name)).size===4&&built.every(row=>metadata.some(r=>r.name===row.name&&r.imageDigest===row.imageDigest
  &&r.buildRevision===p.commit&&(r.revisionLabel===null||r.revisionLabel===p.commit)&&(r.treeLabel===null||r.treeLabel===p.tree))),'replacement_metadata_changed');
 return{entryQualification:e,replacementImageMetadata:metadata};
}

export function qualifyComposePhaseArtifact({ policy, artifactBytes, configurationDigest, sourcePins, services, imageIdentities,
  rendererDigest, settingsInvariantDigest, runtimeInvariantDigest,entryQualification,replacementImageMetadata,now=Date.now() }) {
  const p = parse(composePhasePolicySchema, policy, 'policy_invalid');
  check(Buffer.isBuffer(artifactBytes) && artifactBytes.length > 0 && artifactBytes.length <= 131072
    && bytesDigest(artifactBytes) === p.artifactDigest, 'artifact_changed');
  check(configurationDigest === p.phaseConfigDigest && digest(sourcePins) === digest(p.sourcePins), 'configuration_changed');
  check(rendererDigest === p.rendererDigest && settingsInvariantDigest === p.settingsInvariantDigest
    && runtimeInvariantDigest === p.runtimeInvariantDigest, 'controller_invariant_changed');
  const immutable=p.candidateExecution!==undefined;
  check(immutable||entryQualification===undefined&&replacementImageMetadata===undefined,'immutable_candidate_scope_required');
  const actual = parse(z.array(z.object({ name: id, imageDigest: image, mounts: z.array(mountSchema).max(30) }).strict()).min(immutable?1:2).max(12),
    services, 'services_invalid');
  const qualification=immutable?qualifyImmutableCandidateEntry({policy:p,services:actual,entryQualification,replacementImageMetadata,now}):null;
  check(new Set(actual.map(row => row.name)).size === actual.length
    && actual.every(row => p.services.some(service => service.name === row.name))
    && p.services.every(row => actual.some(service => service.name === row.name)
      ||(immutable?qualification.entryQualification.absences.some(absent=>absent.name===row.name):row.role === 'migration')), 'service_set_changed');
  for (const declared of p.services) {
    const row = actual.find(service => service.name === declared.name);
    if (!row && (immutable||declared.role === 'migration')) continue;
    check(composeMountDigest(row.mounts) === declared.mountDigest, 'mount_changed');
    if (p.phase === 'candidate') check(row.imageDigest === declared.imageDigest, 'candidate_image_changed');
    if (declared.source === 'image') check(row.imageDigest === declared.imageDigest, 'database_image_changed');
  }
  const resolved = parse(z.array(z.object({ imageDigest: image, imageRef: z.string().max(300).regex(/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/) }).strict()).min(1).max(24),
    imageIdentities, 'images_invalid');
  for (const row of p.services) {
    if (!immutable&&p.phase === 'candidate' && row.role === 'migration' && !actual.some(service => service.name === row.name)) continue;
    check(resolved.some(value => value.imageRef === row.imageDigest && value.imageDigest === row.imageDigest)
    && (row.source === 'built' || resolved.some(value => value.imageRef === row.imageRef && value.imageDigest === row.imageDigest)), 'image_identity_changed');
  }
  if(immutable){const refs=[...new Set(p.services.flatMap(r=>[r.imageDigest,...(r.source==='image'?[r.imageRef]:[])]))].sort();
   check(new Set(resolved.map(r=>r.imageRef)).size===resolved.length&&digest(resolved.map(r=>r.imageRef).sort())===digest(refs),'image_identity_changed');}
  let document; try { document = JSON.parse(artifactBytes.toString('utf8')); } catch { deny('artifact_invalid'); }
  {
    check(document?.services && !Array.isArray(document.services)
      && Object.keys(document.services).length === p.services.length
      && p.services.every(row => Object.hasOwn(document.services, row.name)), 'artifact_service_set_changed');
    for (const row of p.services) {
      const service = document.services[row.name];
      check(service && typeof service === 'object' && (p.phase === 'rollback'||immutable
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
    services: structuredClone(p.services), sourcePins: structuredClone(p.sourcePins),
    ...(immutable?{candidateExecution:structuredClone(p.candidateExecution),...qualification}:{}) });
}

/** The queue rechecks the actual installed config/file/images/mounts before dispatch. */
export const composePhaseValidationPhp = String.raw`
function roost_phase_canonical($v){if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=roost_phase_canonical($x);}return $v;}
function roost_phase_hash($v){return hash('sha256',json_encode(roost_phase_canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));}
function roost_phase_mount_hash($mounts){$out=[];$dest=[];foreach($mounts as $m){$r=[];foreach(['Type','Name','Source','Destination','Driver','Mode','RW','Propagation'] as $key)$r[$key]=$m[$key]??null;
 if(isset($dest[$r['Destination']]))throw new Exception('mount');$dest[$r['Destination']]=true;$out[]=$r;}
 usort($out,fn($a,$b)=>strcmp($a['Destination'],$b['Destination']));return roost_phase_hash($out);}
function roost_phase_exact_keys($v,$keys){if(!is_array($v))return false;$actual=array_keys($v);sort($actual,SORT_STRING);sort($keys,SORT_STRING);return $actual===$keys;}
function roost_phase_immutable_entry($cap){
 $mode=$cap['candidateExecution'];$e=$cap['entryQualification']??null;$meta=$cap['replacementImageMetadata']??null;
 if($cap['phase']!=='candidate'||!roost_phase_exact_keys($mode,['mode','replacementImagesDigest','buildProofDigest'])
  ||$mode['mode']!=='qualified_immutable_images'||!preg_match('/^[a-f0-9]{64}$/',$mode['buildProofDigest'])
  ||!roost_phase_exact_keys($e,['schemaVersion','targetId','policyDigest','observedAt','inventory','absences','evidenceDigest'])
  ||$e['schemaVersion']!=='roost-compose-immutable-candidate-entry-v1'||$e['targetId']!==$cap['targetId']||$e['policyDigest']!==$cap['policyDigest'])throw new Exception('phase-immutable-entry');
 $body=$e;unset($body['evidenceDigest']);
 if(!is_string($e['observedAt'])||!preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/',$e['observedAt']))throw new Exception('phase-immutable-entry');
 $time=(float)(new DateTimeImmutable($e['observedAt']))->format('U.u');$now=microtime(true);
 if($time>$now||$now-$time>300||roost_phase_hash($body)!==$e['evidenceDigest'])throw new Exception('phase-immutable-entry');
 $inv=$e['inventory'];if(!roost_phase_exact_keys($inv,['targetId','observedAt','projectServiceSetComplete','services','digest'])
  ||$inv['targetId']!==$cap['targetId']||$inv['observedAt']!==$e['observedAt']||$inv['projectServiceSetComplete']!==true||!is_array($inv['services'])||count($inv['services'])!==1)throw new Exception('phase-immutable-inventory');
 $body=$inv;unset($body['digest']);if(roost_phase_hash($body)!==$inv['digest'])throw new Exception('phase-immutable-inventory');
 $db=$inv['services'][0];if(!roost_phase_exact_keys($db,['name','role','containerId','imageDigest','mountDigest','state','health','exitCode'])
  ||$db['role']!=='database'||!preg_match('/^[a-f0-9]{64}$/',$db['containerId'])||$db['state']!=='running'||$db['health']!=='healthy'||$db['exitCode']!==0)throw new Exception('phase-immutable-database');
 if(count($cap['services'])!==5||!is_array($e['absences'])||count($e['absences'])!==4||!is_array($meta)||count($meta)!==4)throw new Exception('phase-immutable-services');
 $names=[];$built=[];$roles=[];$absence=[];$metadata=[];
 foreach($e['absences'] as $a){if(!roost_phase_exact_keys($a,['name','role','source','mountDigest','policyServiceDigest','absenceVerified','inventoryDigest','observedAt'])
  ||isset($absence[$a['name']])||$a['source']!=='built'||$a['absenceVerified']!==true||$a['inventoryDigest']!==$inv['digest']||$a['observedAt']!==$e['observedAt'])throw new Exception('phase-immutable-absence');$absence[$a['name']]=$a;}
 foreach($meta as $i){if(!roost_phase_exact_keys($i,['name','imageDigest','buildRevision','revisionLabel','treeLabel'])||isset($metadata[$i['name']]))throw new Exception('phase-immutable-metadata');$metadata[$i['name']]=$i;}
 foreach($cap['services'] as $s){if(!roost_phase_exact_keys($s,['name','role','source','imageDigest','imageRef','mountDigest'])||!in_array($s['source'],['built','image'],true)||isset($names[$s['name']]))throw new Exception('phase-immutable-services');$names[$s['name']]=true;$roles[]=$s['role'];
  if(($s['source']==='image')!==($s['role']==='database'))throw new Exception('phase-immutable-services');
  if($s['source']==='image'){if($s['name']!==$db['name']||$s['imageDigest']!==$db['imageDigest']||$s['mountDigest']!==$db['mountDigest'])throw new Exception('phase-immutable-database');continue;}
  $a=$absence[$s['name']]??null;$i=$metadata[$s['name']]??null;
  if(!$a||$a['role']!==$s['role']||$a['mountDigest']!==$s['mountDigest']||$a['policyServiceDigest']!==roost_phase_hash($s)||$s['imageRef']!==$s['imageDigest'])throw new Exception('phase-immutable-absence');
  if(!$i||$i['imageDigest']!==$s['imageDigest']||$i['buildRevision']!==$cap['commit']||($i['revisionLabel']!==null&&$i['revisionLabel']!==$cap['commit'])||($i['treeLabel']!==null&&$i['treeLabel']!==$cap['tree']))throw new Exception('phase-immutable-metadata');
  $built[]=['name'=>$s['name'],'imageDigest'=>$s['imageDigest'],'commit'=>$cap['commit'],'tree'=>$cap['tree']];
 }
 sort($roles,SORT_STRING);if($roles!==['app','cadence','cadence','database','migration'])throw new Exception('phase-immutable-services');
 usort($built,fn($a,$b)=>strcmp($a['name'],$b['name']));if(roost_phase_hash($built)!==$mode['replacementImagesDigest'])throw new Exception('phase-immutable-images');return $e;
}
function roost_validate_compose_phase($a,$cap,$readFile,$readSource,$run,$readInvariants){
 $immutable=array_key_exists('candidateExecution',$cap);$entry=$immutable?roost_phase_immutable_entry($cap):null;
 if(!$immutable&&(array_key_exists('entryQualification',$cap)||array_key_exists('replacementImageMetadata',$cap)))throw new Exception('phase-immutable-scope');
 if($cap['schemaVersion']!=='roost-compose-phase-capability-v1'||!in_array($cap['phase'],['candidate','rollback'],true)
  ||$a->settings->is_raw_compose_deployment_enabled!==false||$a->settings->is_preserve_repository_enabled!==false
  ||$a->settings->is_build_server_enabled!==false||hash('sha256',$a->docker_compose_custom_build_command??'')!==$cap['buildCommandDigest']
  ||hash('sha256',$a->docker_compose_custom_start_command??'')!==$cap['startCommandDigest'])throw new Exception('phase');
 foreach(['docker_compose_custom_build_command','docker_compose_custom_start_command'] as $field)
  if(preg_match(App\Support\ValidationPatterns::SHELL_SAFE_COMMAND_PATTERN,$a->$field??'')!==1)throw new Exception('phase-command');
 $invariants=$readInvariants($a);foreach(['settingsInvariantDigest','runtimeInvariantDigest'] as $key)
  if(($invariants[$key]??null)!==$cap[$key])throw new Exception('phase-invariant');
 foreach(['dockerHelper'=>'/var/www/html/bootstrap/helpers/docker.php','applicationsController'=>'/var/www/html/app/Http/Controllers/Api/ApplicationsController.php'] as $key=>$path)
  if($readSource($path)!==$cap['sourcePins'][$key])throw new Exception('phase-source');
 if($cap['artifactFile']!=='roost-release-'.$cap['policyId'].'-'.$cap['phase'].'-'.$cap['artifactDigest'].'.json')throw new Exception('phase-path');
 $bytes=$readFile('/var/www/html/storage/app/applications/'.$a->uuid.'/'.$cap['artifactFile']);
 if(!is_string($bytes)||strlen($bytes)>131072||hash('sha256',$bytes)!==$cap['artifactDigest'])throw new Exception('phase-artifact');
 if(($cap['phase']==='rollback'||$immutable)&&$readFile('/var/www/html/storage/app/applications/'.$a->uuid.'/'.$cap['artifactFile'].'.sha256')!==$cap['artifactDigest'].'  /artifacts/'.$cap['artifactFile']."\n")throw new Exception('phase-checksum');
 $doc=json_decode($bytes,true,32,JSON_THROW_ON_ERROR);$services=$doc['services']??null;
 if(!is_array($services)||count($services)!==count($cap['services']))throw new Exception('phase-services');
 $ids=trim($run('docker container ls -a --no-trunc --filter '.escapeshellarg('label=com.docker.compose.project='.$a->uuid).' --format '.escapeshellarg('{{.ID}}')));
 $ids=$ids===''?[]:preg_split('/\R/',$ids);if($immutable?count($ids)!==1:(count($ids)>count($cap['services'])||count($ids)<count($cap['services'])-1))throw new Exception('phase-runtime');$rows=[];
 foreach($ids as $id){if(!preg_match('/^[a-f0-9]{64}$/',$id))throw new Exception('phase-container');
 $format=$immutable?'{"name":{{json (index .Config.Labels "com.docker.compose.service")}},"containerId":{{json .Id}},"imageDigest":{{json .Image}},"mounts":{{json .Mounts}},"state":{{json .State.Status}},"health":{{json (index .State.Health "Status")}},"exitCode":{{json .State.ExitCode}}}':'{"name":{{json (index .Config.Labels "com.docker.compose.service")}},"imageDigest":{{json .Image}},"mounts":{{json .Mounts}}}';
 $row=json_decode($run('docker container inspect --format '.escapeshellarg($format).' -- '.escapeshellarg($id)),true,32,JSON_THROW_ON_ERROR);
 if(isset($rows[$row['name']]))throw new Exception('phase-duplicate');$rows[$row['name']]=$row;}
 if(array_diff(array_keys($rows),array_column($cap['services'],'name')))throw new Exception('phase-runtime');
 if($immutable){$db=$entry['inventory']['services'][0];$row=$rows[$db['name']]??null;
  if(!$row||$row['containerId']!==$db['containerId']||$row['imageDigest']!==$db['imageDigest']||roost_phase_mount_hash($row['mounts'])!==$db['mountDigest']
   ||$row['state']!==$db['state']||$row['health']!==$db['health']||$row['exitCode']!==$db['exitCode'])throw new Exception('phase-immutable-database');}
 foreach($cap['services'] as $s){$name=$s['name'];$service=$services[$name]??null;$row=$rows[$name]??null;
 if(!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/',$name)||!preg_match('/^sha256:[a-f0-9]{64}$/',$s['imageDigest'])
  ||!is_array($service))throw new Exception('phase-service');
 if(($cap['phase']==='rollback'||$immutable)&&(array_key_exists('build',$service)||($service['image']??null)!==($s['source']==='built'?$s['imageDigest']:$s['imageRef'])))throw new Exception('phase-service');
 if($cap['phase']==='candidate'&&!$immutable&&(($s['source']==='built')!==array_key_exists('build',$service)
   ||($s['source']==='image'&&($service['image']??null)!==$s['imageRef'])))throw new Exception('phase-service');
 if($s['role']!=='cadence'){$dependencies=$service['depends_on']??[];if(!is_array($dependencies))throw new Exception('phase-dependencies');
  $names=array_is_list($dependencies)?$dependencies:array_keys($dependencies);foreach($names as $name){$allowed=false;
   foreach($cap['services'] as $declared)if($declared['name']===$name&&$declared['role']!=='cadence')$allowed=true;
   if(!$allowed)throw new Exception('phase-dependencies');}}
 if($immutable&&$s['source']==='built'){
  if($row)throw new Exception('phase-immutable-absence');
  $format='{"imageDigest":{{json .Id}},"environment":{{json .Config.Env}},"labels":{{json .Config.Labels}}}';
  $i=json_decode($run('docker image inspect --format '.escapeshellarg($format).' -- '.escapeshellarg($s['imageDigest'])),true,32,JSON_THROW_ON_ERROR);
  $revisions=[];foreach($i['environment']??[] as $v)if(str_starts_with($v,'APP_BUILD_REVISION='))$revisions[]=substr($v,19);
  $labels=$i['labels']??[];$expected=array_values(array_filter($cap['replacementImageMetadata'],fn($m)=>$m['name']===$s['name']))[0];
  if($i['imageDigest']!==$s['imageDigest']||$revisions!==[$cap['commit']]||($labels['org.opencontainers.image.revision']??null)!==$expected['revisionLabel']
   ||($labels['io.roost.release.tree']??null)!==$expected['treeLabel'])throw new Exception('phase-image-metadata');
  continue;
 }
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
