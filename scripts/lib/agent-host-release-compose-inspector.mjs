import { createHash } from 'node:crypto';
import { z } from 'zod';
import { composeConfigurationSchema, composeConfigurationDigest, composeRuntimeSchema,
  composeRuntimeBindingSchema, qualifyComposeRuntime } from './agent-host-release-compose-state.mjs';

const hash = z.string().regex(/^[a-f0-9]{64}$/), sha = z.string().regex(/^[a-f0-9]{40}$/);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const instant = z.string().datetime({ offset: true });
const path = z.string().max(200).regex(/^\/[A-Za-z0-9._/-]+$/)
  .refine(v => !v.slice(1).split('/').some(p => ['', '.', '..'].includes(p)));
const service = z.object({ name: id, role: z.enum(['app','migration','cadence','database']),
  source: z.enum(['built','image']), expectedState: z.enum(['running','paused','completed']) }).strict();
const targetSchema = z.object({ targetId: id, composePath: path, repositoryUrl: z.string().url(),
  branch: z.string().min(1).max(200), services: z.array(service).min(3).max(12) }).strict();
const queueSchema = composeRuntimeBindingSchema.shape.queue;
const configurationFields = composeConfigurationSchema.innerType().shape;
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const digest = v => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const fail = (reason, cause) => { throw Object.assign(Error(`release_compose_inspector_${reason}`, cause === undefined ? undefined : { cause }), { retryable: false }); };
const check = (ok, reason) => { if (!ok) fail(reason); };
const parse = (schema, value, reason) => { const result = schema.safeParse(value); if (!result.success) fail(reason); return result.data; };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64');

/** Shared by the fixed reader and queue controller; one invariant projection. */
export const composeControllerInvariantPhp = String.raw`
function roost_compose_canonical($v){if(is_object($v))$v=get_object_vars($v);if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=roost_compose_canonical($x);}return $v;}
function roost_compose_hash($v){return hash('sha256',json_encode(roost_compose_canonical($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));}
function roost_compose_normalize($d,$targetId){foreach($d['services'] as $name=>&$s){
 if(isset($s['container_name'])&&preg_match('/^'.preg_quote($name.'-'.$targetId,'/').'(-[0-9]{6,20})?$/',$s['container_name']))unset($s['container_name']);
 foreach(['APP_BUILD_REVISION','SOURCE_COMMIT'] as $key){if(isset($s['environment'][$key]))$s['environment'][$key]='__AUTHORIZED_COMMIT__';if(isset($s['build']['args'][$key]))$s['build']['args'][$key]='__AUTHORIZED_COMMIT__';}
 if(isset($s['build'])&&isset($s['image']))$s['image']='__BUILT_SERVICE_'.$name.'__';
 if(isset($s['labels'])&&is_array($s['labels'])){foreach($s['labels'] as $key=>$value){
  if(is_string($key)&&$key==='coolify.name'&&preg_match('/^'.preg_quote(str_replace('_','-',$name).'-'.$targetId,'/').'(-[0-9]{6,20})?$/',$value))unset($s['labels'][$key]);
  elseif(is_string($key)&&$key==='coolify.version'&&preg_match('/^[0-9]+\.[0-9]+\.[0-9]+(?:[-.+][A-Za-z0-9.+_-]+)?$/',$value))unset($s['labels'][$key]);
  elseif(is_int($key)&&is_string($value)&&preg_match('/^coolify\.name='.preg_quote(str_replace('_','-',$name).'-'.$targetId,'/').'(-[0-9]{6,20})?$/',$value))unset($s['labels'][$key]);
  elseif(is_int($key)&&is_string($value)&&preg_match('/^coolify\.version=[0-9]+\.[0-9]+\.[0-9]+(?:[-.+][A-Za-z0-9.+_-]+)?$/',$value))unset($s['labels'][$key]);}}
 }unset($s);return $d;}
// Persisted cast attributes must not depend on which lazy relations a caller
// read first. Environment and storage relations have their own complete seals.
function roost_compose_configuration_projection($a){$raw=$a->attributesToArray();$settings=$a->settings?->attributesToArray()??[];
 foreach(['id','uuid','name','description','created_at','updated_at','deleted_at','status','config_hash','git_commit_sha','docker_compose','docker_compose_raw','last_online_at','restart_count','last_restart_at','last_restart_type','server_status','settings','additional_servers','destination'] as $key)unset($raw[$key]);
 foreach(['id','application_id','created_at','updated_at'] as $key)unset($settings[$key]);return ['attributes'=>$raw,'settings'=>$settings];}
function roost_compose_controller_invariants($a){$projection=roost_compose_configuration_projection($a);
 foreach(['attributes','settings'] as $part){unset($projection[$part]['docker_compose_custom_build_command'],$projection[$part]['docker_compose_custom_start_command']);}
 $runtime=roost_compose_normalize(Symfony\Component\Yaml\Yaml::parse($a->docker_compose??''),$a->uuid);
 foreach($runtime['services'] as &$s){unset($s['build'],$s['image']);}unset($s);
 return ['settingsInvariantDigest'=>roost_compose_hash($projection),'runtimeInvariantDigest'=>roost_compose_hash($runtime)];}
`;

// The fixed reader hashes effective secrets locally inside Coolify. Neither
// raw environment values, storage contents nor configuration are returned.
const configurationPhp = String.raw`
error_reporting(0);ini_set('display_errors','0');
try {
require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
${composeControllerInvariantPhp}
function canon($v){if(is_object($v))$v=get_object_vars($v);if(is_array($v)){if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as $k=>$x)$v[$k]=canon($x);}return $v;}
function hashed($v){return hash('sha256',json_encode(canon($v),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));}
function rows($v){usort($v,fn($a,$b)=>strcmp(hashed($a),hashed($b)));return $v;}
function pick($v,$keys){$r=[];foreach($keys as $key)$r[$key]=$v[$key]??null;return $r;}
if(hash_file('sha256','/var/www/html/bootstrap/helpers/applications.php')!==$p['sourcePins']['queueHelper']
 ||hash_file('sha256','/var/www/html/app/Jobs/ApplicationDeploymentJob.php')!==$p['sourcePins']['deploymentJob'])throw new Exception('source');
$a=App\Models\Application::where('uuid',$p['target']['targetId'])->firstOrFail();$raw=$a->attributesToArray();$settings=$a->settings?->attributesToArray()??[];
if($a->build_pack!=='dockercompose'||$a->docker_compose_location!==$p['target']['composePath']||$a->git_branch!==$p['target']['branch'])throw new Exception('scope');
$repository=preg_replace('/\.git$/','',$p['target']['repositoryUrl']);
if(!in_array($a->git_repository,[$repository,preg_replace('#^https://github.com/#','',$repository)],true))throw new Exception('repository');
$doc=Symfony\Component\Yaml\Yaml::parse($a->docker_compose_raw??'');
$effective=Symfony\Component\Yaml\Yaml::parse($a->docker_compose??'');
$names=array_keys($doc['services']??[]);sort($names);$wanted=array_column($p['target']['services'],'name');sort($wanted);
if($names!==$wanted||!is_array($effective['services']??null))throw new Exception('services');
foreach($p['target']['services'] as $s){$d=$doc['services'][$s['name']];if(($s['source']==='built')!==isset($d['build']))throw new Exception('source');}
// Only the authorized build revision and Coolify-generated container identity
// are normalized. Every other effective compose value remains sealed.
$doc=roost_compose_normalize($doc,$a->uuid);$effective=roost_compose_normalize($effective,$a->uuid);
$env=[];foreach($a->environment_variables->merge($a->environment_variables_preview) as $item){$v=$item->toArray();$v['value']=$item->value;
 if(!is_string($v['key']??null)||!is_string($v['value']))throw new Exception('environment');
 if(in_array($v['key'],['APP_BUILD_REVISION','SOURCE_COMMIT'],true))$v['value']='__AUTHORIZED_COMMIT__';
 $env[]=pick($v,['key','value','is_build_time','is_runtime','is_preview','is_literal','is_multiline','is_shown_once']);}
$persistent=[];foreach($a->persistentStorages as $item)$persistent[]=pick($item->toArray(),['name','mount_path','host_path','is_readonly','resource_type']);
$files=[];foreach($a->fileStorages as $item){if(!is_string($item->content))throw new Exception('storage');$r=pick($item->toArray(),['fs_path','mount_path','is_directory','is_based_on_git','is_readonly']);$r['contentDigest']=hashed($item->content);$files[]=$r;}
// Operational counters and source SHA are not deployment configuration. All
// remaining persisted attributes/settings (including secret hashes) are sealed.
$projection=roost_compose_configuration_projection($a);$raw=$projection['attributes'];$settings=$projection['settings'];
$invariants=roost_compose_controller_invariants($a);
$controllerObserved=['buildCommandDigest'=>hash('sha256',$raw['docker_compose_custom_build_command']??''),
 'startCommandDigest'=>hash('sha256',$raw['docker_compose_custom_start_command']??''),
 'settingsInvariantDigest'=>$invariants['settingsInvariantDigest'],'runtimeInvariantDigest'=>$invariants['runtimeInvariantDigest']];
$serviceMounts=[];foreach($effective['services'] as $name=>$s){
 if(isset($s['configs'])||isset($s['secrets'])||isset($s['tmpfs']))throw new Exception('unsupported_mount');
 $mounts=[];foreach($s['volumes']??[] as $v){
  if(is_string($v)){$parts=explode(':',$v);if(count($parts)<2||count($parts)>3)throw new Exception('mount');
   $source=$parts[0];$destination=$parts[1];$mode=$parts[2]??'rw';$type=str_starts_with($source,'/')?'bind':'volume';
  }elseif(is_array($v)){$type=$v['type']??'volume';$source=$v['source']??'';$destination=$v['target']??'';$mode=($v['read_only']??false)?'ro':'rw';
   if(isset($v['bind'])||isset($v['volume'])||isset($v['tmpfs']))throw new Exception('unsupported_mount_option');
  }else throw new Exception('mount');
  if(!in_array($type,['volume','bind'],true)||!in_array($mode,['ro','rw'],true)||!is_string($source)||!is_string($destination)
   ||str_contains($source,'$')||str_contains($destination,'$'))throw new Exception('mount');
  if($type==='volume'){$definition=$effective['volumes'][$source]??null;if(!is_array($definition)||!isset($definition['name']))throw new Exception('volume_name');$source=$definition['name'];}
  $mounts[]=['type'=>$type,'source'=>$source,'destination'=>$destination,'mode'=>$mode];
 }$serviceMounts[]=['name'=>$name,'mounts'=>$mounts];}
$topology=['applicationId'=>(string)$a->id,'projectId'=>(string)$a->environment->project_id,'environmentId'=>(string)$a->environment_id,
 'destinationId'=>(string)$a->destination_id,'destinationType'=>class_basename($a->destination_type),'serverId'=>(string)$a->destination->server->id];
echo json_encode(['targetId'=>$a->uuid,'gitCommit'=>$a->git_commit_sha,'autoDeploy'=>$settings['is_auto_deploy_enabled']??null,
 'composeDigest'=>hashed(['declared'=>$doc,'effective'=>$effective]),
 'environmentDigest'=>hashed(['variables'=>rows($env),'services'=>array_map(fn($s)=>pick($s,['environment','env_file']),$effective['services'])]),
 'storageDigest'=>hashed(['persistent'=>rows($persistent),'files'=>rows($files)]),'settingsDigest'=>hashed(['attributes'=>$raw,'settings'=>$settings]),
 'runtimePolicyDigest'=>hashed(array_map(fn($s)=>pick($s,['command','entrypoint','healthcheck','depends_on','restart','deploy']),$effective['services'])),
 'topology'=>$topology,'controllerObserved'=>$controllerObserved,'serviceMounts'=>$serviceMounts],JSON_THROW_ON_ERROR);
}catch(Throwable $e){echo '{"unproven":true}';exit(1);}
`;

// docker inspect has optional Health/labels. Reading full inspect via the fixed
// host program permits hashing Env and mount/config values without returning
// them. Completed containers are deliberately included; missing is not success.
const runtimePython = String.raw`
import base64,json,subprocess,hashlib,sys,re,time
p=json.loads(base64.b64decode(PAYLOAD))
deadline=time.monotonic()+20
def hashed(v): return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def budget():
 remaining=deadline-time.monotonic()
 if remaining<=0: raise Exception()
 return min(10,remaining)
def docker(*args): return json.loads(subprocess.check_output(['docker',*args],stderr=subprocess.DEVNULL,timeout=budget()))
try:
 ids=subprocess.check_output(['docker','container','ls','-a','--no-trunc','--filter','label=com.docker.compose.project='+p['targetId'],'--format','{{.ID}}'],stderr=subprocess.DEVNULL,timeout=budget()).decode().split()
 if len(ids)>24: raise Exception()
 containers=docker('container','inspect',*ids) if ids else []
 services=[]; images=[];declaredMountDigests=[]
 for declaration in p['services']:
  name=declaration['name']; matches=[c for c in containers if c['Config'].get('Labels',{}).get('com.docker.compose.service')==name]
  declared=[]
  for m in next(s for s in p['serviceMounts'] if s['name']==name)['mounts']:
   if m['type']=='volume':
    volume=docker('volume','inspect',m['source'])[0]
    if volume['Name']!=m['source']: raise Exception()
    declared.append({'Type':'volume','Name':volume['Name'],'Source':volume['Mountpoint'],'Destination':m['destination'],'Driver':volume['Driver'],'Mode':m['mode'],'RW':m['mode']=='rw','Propagation':''})
   else:
    if not m['source'].startswith('/') or not m['destination'].startswith('/'): raise Exception()
    declared.append({'Type':'bind','Name':None,'Source':m['source'],'Destination':m['destination'],'Driver':None,'Mode':m['mode'],'RW':m['mode']=='rw','Propagation':'rprivate'})
  declaredMountDigests.append({'name':name,'mountDigest':hashed(sorted(declared,key=lambda m:m['Destination']))})
  if len(matches)>1: raise Exception()
  c=matches[0] if matches else None
  ref=c['Config']['Image'] if c else (p['targetId']+'_'+name+':'+p['observedCommit'] if declaration['source']=='built' else None)
  image=None
  if ref:
   try: image=docker('image','inspect',ref)[0]
   except subprocess.CalledProcessError: pass
  if image:
   labels=image['Config'].get('Labels') or {}; env=image['Config'].get('Env') or []
   revisions=[v.split('=',1)[1] for v in env if v.startswith('APP_BUILD_REVISION=')]
   revisionLabel=labels.get('org.opencontainers.image.revision');treeLabel=labels.get('io.roost.release.tree')
   for v in [revisionLabel,treeLabel,*revisions]:
    if v is not None and v!='unknown' and not re.fullmatch('[a-f0-9]{40}',v): raise Exception()
   if not re.fullmatch('[A-Za-z0-9._/:-]{1,500}',ref): raise Exception()
   images.append({'name':name,'imageDigest':image['Id'],'imageRef':ref,'createdAt':image['Created'],
    'revisionLabel':revisionLabel,'treeLabel':treeLabel,
    'buildRevision':revisions[0] if len(revisions)==1 else None})
  if not c: continue
  labels=c['Config'].get('Labels') or {}
  if labels.get('coolify.applicationId')!=p['applicationId'] or labels.get('com.docker.compose.project')!=p['targetId']: raise Exception()
  deploymentLabel=labels.get('coolify.deploymentId');composeVersion=labels.get('com.docker.compose.version')
  if deploymentLabel is not None and not re.fullmatch('[A-Za-z0-9][A-Za-z0-9_-]{0,79}',deploymentLabel): raise Exception()
  if composeVersion is not None and not re.fullmatch('[A-Za-z0-9.+_-]{1,40}',composeVersion): raise Exception()
  if not image or image['Id']!=c['Image']: raise Exception()
  state=c['State']; env=c['Config'].get('Env') or []
  runtimeRevisions=[v.split('=',1)[1] for v in env if v.startswith('APP_BUILD_REVISION=')]
  runtimeRevision=runtimeRevisions[0] if len(runtimeRevisions)==1 else None
  if runtimeRevision is not None and runtimeRevision!='unknown' and not re.fullmatch('[a-f0-9]{40}',runtimeRevision): raise Exception()
  env=[(v.split('=',1)[0]+'=__AUTHORIZED_COMMIT__' if v.startswith(('APP_BUILD_REVISION=','SOURCE_COMMIT=')) else v) for v in env]
  mounts=sorted([{k:m.get(k) for k in ['Type','Name','Source','Destination','Driver','Mode','RW','Propagation']} for m in c.get('Mounts',[])],key=lambda m:m['Destination'])
  runtimeConfig={'environment':sorted(env),'command':c['Config'].get('Cmd'),'entrypoint':c['Config'].get('Entrypoint'),
   'healthcheck':c['Config'].get('Healthcheck'),'host':c['HostConfig']}
  # Generated logging paths and container links are not runtime policy.
  runtimeConfig['host'].pop('ContainerIDFile',None)
  services.append({'name':name,'role':declaration['role'],'containerId':c['Id'],'imageDigest':c['Image'],'imageRef':ref,
   'mountDigest':hashed(mounts),'runtimeConfigDigest':hashed(runtimeConfig),
   'state':'paused' if state.get('Paused') else 'running' if state.get('Running') else state.get('Status'),
   'health':(state.get('Health') or {}).get('Status'),'exitCode':state.get('ExitCode'),'createdAt':c['Created'],
   'deploymentLabel':deploymentLabel,'composeVersion':composeVersion,'runtimeRevision':runtimeRevision})
 unknown=[c for c in containers if c['Config'].get('Labels',{}).get('com.docker.compose.service') not in [s['name'] for s in p['services']]]
 if unknown: raise Exception()
 print(json.dumps({'services':services,'images':images,'declaredMountDigests':declaredMountDigests}))
except Exception:
 print('{"unproven":true}');sys.exit(1)
`;

const metadataSchema = z.object({ targetId: id, gitCommit: z.union([sha,z.literal('HEAD')]), autoDeploy: z.boolean(),
  composeDigest: hash, environmentDigest: hash, storageDigest: hash, settingsDigest: hash, runtimePolicyDigest: hash,
  topology: configurationFields.topology,controllerObserved:z.object({buildCommandDigest:hash,startCommandDigest:hash,
    settingsInvariantDigest:hash,runtimeInvariantDigest:hash}).strict(),
  serviceMounts:z.array(z.object({name:id,mounts:z.array(z.object({type:z.enum(['volume','bind']),source:z.string().max(1000),
    destination:z.string().max(1000),mode:z.enum(['ro','rw'])}).strict()).max(30)}).strict()).min(3).max(12) }).strict();
const controllerPolicySchema = z.object({schemaVersion:z.literal('roost-compose-controller-policy-v1'),
  phase:z.enum(['baseline','candidate','rollback']),rendererDigest:hash,artifactDigest:hash,
  buildCommandDigest:hash,startCommandDigest:hash,settingsInvariantDigest:hash,runtimeInvariantDigest:hash}).strict();
const imageRowSchema = z.object({ name: id, imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  imageRef: z.string().max(500), createdAt: instant, revisionLabel: sha.nullable(), treeLabel: sha.nullable(),
  buildRevision: z.union([sha,z.literal('unknown')]).nullable() }).strict();
const observedServiceSchema = composeRuntimeSchema.shape.services.element.omit({ commit:true,tree:true,deploymentId:true })
  .extend({ imageRef:z.string().max(500),runtimeConfigDigest:hash,deploymentLabel:id.nullable(),composeVersion:z.string().max(40).nullable(),
    runtimeRevision:z.union([sha,z.literal('unknown')]).nullable() }).strict();

/** Trusted installation callbacks, never packet-selected code. sourceForCommit
 * reads the canonical Git compose blob and returns its SHA256 source digest. */
export function createComposeStateInspector({ targets, sourcePins, transport, sourceForCommit, treeForCommit, readDeployment, readControllerPolicy, readImageBinding }) {
  const scoped = parse(z.array(targetSchema).min(1).max(6),targets,'configuration_invalid');
  const pins = parse(configurationFields.sourcePins,sourcePins,'configuration_invalid');
  check(new Set(scoped.map(t=>t.targetId)).size===scoped.length && [transport,sourceForCommit,treeForCommit,readDeployment].every(f=>typeof f==='function'),'configuration_invalid');
  const target = targetId => { const t=scoped.find(t=>t.targetId===targetId);check(t,'target_outside_scope');return t; };
  const run = async (operation, command, stdin) => {
    let output;try { output=await transport({operation,command,stdin,timeoutMs:25000,maxOutputBytes:32768,write:false}); } catch (error) { fail('transport_unproven',error); }
    if (typeof output==='object' && output!==null) {check(output.exitCode===0,'transport_unproven');output=output.stdout;}
    check(typeof output==='string'&&Buffer.byteLength(output)<=32768,'response_invalid');
    try{return JSON.parse(output);}catch{fail('response_invalid');}
  };
  const metadata = async t => parse(metadataSchema,await run('compose_configuration','docker exec -i coolify php',
    `<?php\n$p=json_decode(base64_decode('${encode({target:t,sourcePins:pins})}',true),true,32,JSON_THROW_ON_ERROR);\n${configurationPhp}`),'configuration_unproven');
  const observe = async (targetId, observedCommit) => {
    const t=target(targetId);parse(sha,observedCommit,'commit_invalid');
    const before=await metadata(t);check(before.targetId===targetId,'configuration_unproven');
    const live=parse(z.object({services:z.array(observedServiceSchema).max(12),images:z.array(imageRowSchema).max(12),
      declaredMountDigests:z.array(z.object({name:id,mountDigest:hash}).strict()).min(3).max(12)}).strict(),
      await run('compose_runtime','python3 -',`PAYLOAD='${encode({...t,serviceMounts:before.serviceMounts,applicationId:before.topology.applicationId,observedCommit})}'\n${runtimePython}`),'runtime_unproven');
    check(new Set(live.services.map(s=>s.name)).size===live.services.length&&new Set(live.images.map(s=>s.name)).size===live.images.length,'service_conflict');
    const after=await metadata(t);check(digest(before)===digest(after),'configuration_changed_during_inspection');
    const missingDeclared=t.services.filter(s=>!live.services.some(r=>r.name===s.name)).map(s=>s.name);
    let sourceDigest;try {sourceDigest=await sourceForCommit(observedCommit,t.composePath);}catch{fail('source_unproven');}
    parse(hash,sourceDigest,'source_unproven');
    let controllerPolicy;
    if(readControllerPolicy!==undefined){check(typeof readControllerPolicy==='function','configuration_invalid');
      let value;try{value=await readControllerPolicy({targetId,observedCommit,controllerObserved:structuredClone(before.controllerObserved)});}catch{fail('controller_unproven');}
      if(value!==null&&value!==undefined){controllerPolicy=parse(controllerPolicySchema,value,'controller_unproven');
        check(controllerPolicy.rendererDigest===pins.controllerRenderer
          &&Object.entries(before.controllerObserved).every(([key,value])=>controllerPolicy[key]===value),'controller_changed');}}
    check(live.declaredMountDigests.length===t.services.length&&new Set(live.declaredMountDigests.map(s=>s.name)).size===t.services.length
      &&t.services.every(s=>live.declaredMountDigests.some(r=>r.name===s.name)),'mount_declaration_unproven');
    const declarations=t.services.map(s=>({...s,mountDigest:live.declaredMountDigests.find(r=>r.name===s.name).mountDigest,
      ...(s.source==='image'?{imageDigest:live.images.find(r=>r.name===s.name)?.imageDigest}:{})}));
    const {controllerObserved,serviceMounts,...publicMetadata}=before;
    const configuration={...publicMetadata,buildPack:'dockercompose',composePath:t.composePath,repositoryUrl:t.repositoryUrl,branch:t.branch,
      sourcePins:pins,sourceDigest,services:declarations,
      ...(controllerPolicy?{controllerPolicy}:{})};
    return {configuration,observedCommit,services:live.services,images:live.images,missingDeclared,controllerObserved,
      controllerInvariants:pins.controllerRenderer?{rendererDigest:pins.controllerRenderer,settingsInvariantDigest:controllerObserved.settingsInvariantDigest,
        runtimeInvariantDigest:controllerObserved.runtimeInvariantDigest}:null,
      provenance:'observed_legacy_baseline',queue:null,qualified:false};
  };
  const inspectConfiguration = async (targetId, commit) => {
    const observed=await observe(targetId,commit);
    return parse(composeConfigurationSchema,observed.configuration,'release_configuration_unprepared');
  };
  const evidence = async input => {
    const q=parse(queueSchema,input,'queue_unproven'), t=target(q.targetId);
    check(Date.parse(q.createdAt)<=Date.parse(q.finishedAt),'queue_unproven');
    let readBack;try{readBack=await readDeployment({targetId:q.targetId,deploymentId:q.deploymentId});}catch{fail('queue_unproven');}
    check(digest(parse(queueSchema,readBack,'queue_unproven'))===digest(q),'queue_identity_changed');
    const observed=await observe(q.targetId,q.commit), configuration=parse(composeConfigurationSchema,observed.configuration,'release_configuration_unprepared');
    check(observed.missingDeclared.length===0&&configuration.gitCommit===q.commit,'declared_service_missing');
    let tree;try{tree=await treeForCommit(q.commit);}catch{fail('tree_unproven');}parse(sha,tree,'tree_unproven');
    let adoption;
    if(configuration.controllerPolicy?.phase==='rollback'){
      check(typeof readImageBinding==='function','rollback_image_binding_required');
      try{adoption=await readImageBinding({queue:structuredClone(q),configuration:structuredClone(configuration),
        services:structuredClone(observed.services),images:structuredClone(observed.images),tree});}catch{fail('rollback_image_binding_unproven');}
      adoption=parse(z.object({kind:z.literal('sealed_baseline_adoption'),commit:sha,tree:sha,artifactDigest:hash,rendererDigest:hash,
        images:z.array(z.object({name:id,imageDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/)}).strict()).min(2).max(11)}).strict(),adoption,'rollback_image_binding_unproven');
      check(adoption.commit===q.commit&&adoption.tree===tree&&adoption.artifactDigest===configuration.controllerPolicy.artifactDigest
        &&adoption.rendererDigest===configuration.controllerPolicy.rendererDigest
        &&adoption.images.length===t.services.filter(s=>s.source==='built').length&&new Set(adoption.images.map(s=>s.name)).size===adoption.images.length,'rollback_image_binding_unproven');
    }
    const images=t.services.filter(s=>s.source==='built').map(s=>{
      const image=observed.images.find(r=>r.name===s.name), live=observed.services.find(r=>r.name===s.name);
      const sourceBound=adoption?adoption.images.some(r=>r.name===s.name&&r.imageDigest===image?.imageDigest)
        &&live?.runtimeRevision===q.commit&&[image?.imageDigest,`${q.targetId}_${s.name}:${q.commit}`].includes(image?.imageRef)
        :image?.imageRef===`${q.targetId}_${s.name}:${q.commit}`&&image?.buildRevision===q.commit;
      check(image&&live&&image.imageDigest===live.imageDigest&&sourceBound&&(!image.revisionLabel||image.revisionLabel===q.commit)
        &&(!image.treeLabel||image.treeLabel===tree)&&(!live.deploymentLabel||live.deploymentLabel===q.deploymentId)
        &&Date.parse(image.createdAt)<=Date.parse(live.createdAt)
        &&Date.parse(live.createdAt)>=Date.parse(q.createdAt)&&Date.parse(live.createdAt)<=Date.parse(q.finishedAt),'image_provenance_unproven');
      return {name:s.name,imageDigest:image.imageDigest,commit:q.commit,tree,deploymentId:q.deploymentId};
    });
    const runtime={targetId:q.targetId,deploymentId:q.deploymentId,services:observed.services.map(s=>{
      const {imageRef,runtimeConfigDigest,deploymentLabel,composeVersion,runtimeRevision,...row}=s;
      return {...row,...(t.services.find(d=>d.name===s.name).source==='built'?{commit:q.commit,tree,deploymentId:q.deploymentId}:{})};
    })};
    const binding={commit:q.commit,tree,deploymentId:q.deploymentId,queue:q,images};
    try{readBack=await readDeployment({targetId:q.targetId,deploymentId:q.deploymentId});}catch{fail('queue_unproven');}
    check(digest(parse(queueSchema,readBack,'queue_unproven'))===digest(q),'queue_changed_during_inspection');
    parse(composeRuntimeSchema,runtime,'runtime_unproven');parse(composeRuntimeBindingSchema,binding,'binding_unproven');
    return {configuration,runtime,binding};
  };
  return Object.freeze({ inspectLegacyBaseline:observe, inspectConfiguration,
    async readRuntime(queue){return (await evidence(queue)).runtime;},
    async readBuildImages(queue){return (await evidence(queue)).binding.images;},
    readEvidence:evidence,
    async inspectRuntime({queue,expected}) {const e=await evidence(queue);return qualifyComposeRuntime({...e,expected});}
  });
}
