import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createComposeStateInspector, composeControllerInvariantPhp } from './lib/agent-host-release-compose-inspector.mjs';
import { composeConfigurationDigest } from './lib/agent-host-release-compose-state.mjs';

const h=c=>c.repeat(64),sha=c=>c.repeat(40),image=c=>`sha256:${h(c)}`;
test('sealed template bytes reach each fixed reader, while changed hash/encoding fails before transport',async()=>{
 const f=fixture(),bytes=Buffer.from(JSON.stringify({services:{app:{environment:{MODE:'${MODE:-safe}'}}}})),
  packet={sha256:createHash('sha256').update(bytes).digest('hex'),bytesBase64:bytes.toString('base64')};
 f.options.configurationTemplate=packet;
 await f.inspector().inspectConfiguration(f.target.targetId,f.commit);
 const readers=f.calls.filter(c=>c.operation==='compose_configuration');assert.equal(readers.length,2);
 for(const call of readers){const encoded=call.stdin.match(/base64_decode\('([A-Za-z0-9+/=]+)'/)[1];
  assert.deepEqual(JSON.parse(Buffer.from(encoded,'base64')).configurationTemplate,packet);
  assert.match(call.stdin,/roost_compose_effective_document\(\$a,\$p\['configurationTemplate'\]/);}
 for(const bad of [{...packet,sha256:h('f')},{...packet,bytesBase64:packet.bytesBase64+'='},{...packet,program:'anything'}]){
  const g=fixture();g.options.configurationTemplate=bad;assert.throws(g.inspector,/template_invalid/);assert.equal(g.calls.length,0);}
});
test('shared projection selects cast attributes while environment/storage keep independent seals',async()=>{
 assert.match(composeControllerInvariantPhp,/\$raw=\$a->attributesToArray\(\)/);
 assert.match(composeControllerInvariantPhp,/\$a->settings\?->attributesToArray\(\)/);
 assert.doesNotMatch(composeControllerInvariantPhp,/\$a->toArray\(\)|\$a->settings\?->toArray\(\)/);
 const f=fixture();await f.inspector().inspectConfiguration(f.target.targetId,f.commit);
 const source=f.calls.find(c=>c.operation==='compose_configuration').stdin;
 assert.match(source,/'environmentDigest'=>hashed\(\['variables'=>rows\(\$env\),'services'=>array_map/);
 assert.match(source,/'storageDigest'=>hashed\(\['persistent'=>rows\(\$persistent\),'files'=>rows\(\$files\)\]\)/);
});
const phpAvailable=spawnSync('php',['-v'],{encoding:'utf8',windowsHide:true,timeout:3000}).status===0;
test('native PHP projection ignores loaded relations but every persisted cast change invalidates digest',{skip:!phpAvailable},()=>{
 const program=String.raw`<?php
${composeControllerInvariantPhp}
class ProjectionFixtureModel {
 public $attributes;public $relations=[];public $settings=null;public $toArrayCalls=0;
 function __construct($attributes){$this->attributes=$attributes;}
 function attributesToArray(){return $this->attributes;}
 function toArray(){$this->toArrayCalls++;return array_merge($this->attributes,$this->relations);}
}
$settings=new ProjectionFixtureModel(['id'=>7,'application_id'=>9,'is_auto_deploy_enabled'=>false,'retained_null'=>null,'retained_list'=>['second','first'],'retained_cast_number'=>1.5]);
$a=new ProjectionFixtureModel(['id'=>9,'uuid'=>'fixture-target','git_commit_sha'=>'HEAD','git_branch'=>'main','source_id'=>13,'destination_id'=>15,'docker_compose_custom_build_command'=>null,'retained_cast_bool'=>false,'retained_cast_object'=>['preserved'=>true],'retained_secret_attribute'=>'fictional-only-value']);$a->settings=$settings;
$before=roost_compose_configuration_projection($a);$beforeHash=roost_compose_hash($before);
foreach(['environment_variables','environment_variables_preview','persistent_storages','file_storages','unrelated_loaded_relation'] as$key)$a->relations[$key]=[['id'=>77,'changing'=>true]];
$settings->relations['unrelated_loaded_relation']=['different'];$after=roost_compose_configuration_projection($a);
$changed=[];foreach([['attributes','git_branch','other'],['attributes','destination_id',16],['attributes','retained_cast_bool',true],['attributes','retained_secret_attribute','different-fictional-only-value'],['settings','is_auto_deploy_enabled',true],['settings','retained_list',['first','second']],['settings','retained_cast_number',2.5],['settings','retained_null','non-null']] as[$part,$key,$value]){$copy=$after;$copy[$part][$key]=$value;$changed[]=$beforeHash!==roost_compose_hash($copy);}
echo json_encode(['stable'=>$beforeHash===roost_compose_hash($after),'changed'=>$changed,'legacyToArrayCalled'=>$a->toArrayCalls+$settings->toArrayCalls,
 'attributeKeys'=>array_keys($after['attributes']),'settingsKeys'=>array_keys($after['settings']),
 'typesPreserved'=>is_bool($after['attributes']['retained_cast_bool'])&&is_array($after['attributes']['retained_cast_object'])&&$after['settings']['retained_null']===null&&is_float($after['settings']['retained_cast_number']),
 'relationKeysAbsent'=>!array_key_exists('environment_variables',$after['attributes'])&&!array_key_exists('unrelated_loaded_relation',$after['settings'])],JSON_THROW_ON_ERROR);`;
 const raw=execFileSync('php',[],{input:program,encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8192,stdio:['pipe','pipe','pipe']});
 const result=JSON.parse(raw);assert.equal(result.stable,true);assert.equal(result.legacyToArrayCalled,0);assert.equal(result.typesPreserved,true);assert.equal(result.relationKeysAbsent,true);
 assert.equal(result.changed.length,8);assert(result.changed.every(Boolean));
 assert(result.attributeKeys.includes('source_id'));assert(result.attributeKeys.includes('retained_secret_attribute'));assert(result.settingsKeys.includes('is_auto_deploy_enabled'));
 assert(!result.attributeKeys.includes('id'));assert(!result.attributeKeys.includes('uuid'));assert(!result.settingsKeys.includes('application_id'));
});
function fixture() {
  const commit=sha('a'), tree=sha('b'), targetId='fixtureapp';
  const target={targetId,composePath:'/docker-compose.coolify.yml',repositoryUrl:'https://github.com/fixture/private-app',branch:'main',
    services:[['app','app','built','running'],['migrate','migration','built','completed'],['maintenance','cadence','built','running'],
      ['proactive','cadence','built','running'],['db','database','image','running']].map(([name,role,source,expectedState])=>({name,role,source,expectedState}))};
  const metadata={targetId,gitCommit:commit,autoDeploy:false,composeDigest:h('1'),environmentDigest:h('2'),storageDigest:h('3'),
    settingsDigest:h('4'),runtimePolicyDigest:h('5'),topology:{applicationId:'10',projectId:'1',environmentId:'2',destinationId:'3',destinationType:'StandaloneDocker',serverId:'0'},
    serviceMounts:target.services.map(s=>({name:s.name,mounts:[]})),
    controllerObserved:{buildCommandDigest:h('6'),startCommandDigest:h('7'),settingsInvariantDigest:h('8'),runtimeInvariantDigest:h('9')}};
  const runtime={services:target.services.map((s,i)=>({name:s.name,role:s.role,containerId:h(String(i+1)),imageDigest:image(s.source==='built'?'c':'d'),
    mountDigest:h(String(i+1)),state:s.role==='migration'?'exited':'running',health:['app','database'].includes(s.role)?'healthy':null,
    exitCode:0,createdAt:s.source==='built'?'2026-10-04T12:00:01.000Z':'2026-10-01T12:00:00.000Z',
    imageRef:s.source==='built'?`${targetId}_${s.name}:${commit}`:'fixture/database:15',runtimeConfigDigest:h('e'),deploymentLabel:null,composeVersion:'2.38.2',runtimeRevision:s.source==='built'?commit:null})),
    declaredMountDigests:target.services.map((s,i)=>({name:s.name,mountDigest:h(String(i+1))})),
    images:target.services.map(s=>({name:s.name,imageDigest:image(s.source==='built'?'c':'d'),imageRef:s.source==='built'?`${targetId}_${s.name}:${commit}`:'fixture/database:15',
      createdAt:s.source==='built'?'2026-10-04T12:00:00.500Z':'2026-10-01T11:00:00.000Z',revisionLabel:null,treeLabel:null,buildRevision:s.source==='built'?commit:null}))};
  const queue={targetId,deploymentId:'finishedqueue',commit,status:'finished',createdAt:'2026-10-04T12:00:00.000Z',finishedAt:'2026-10-04T12:00:02.000Z'};
  const calls=[];let changeMetadata=false,reads=0;
  const options={targets:[target],sourcePins:{queueHelper:h('a'),deploymentJob:h('b'),controllerRenderer:h('c')},
    transport:async d=>{calls.push(d);return JSON.stringify(d.operation==='compose_configuration'?{...metadata,...(changeMetadata&&++reads>1?{storageDigest:h('f')}:{})}:runtime);},
    sourceForCommit:async(c,p)=>{assert.equal(c,commit);assert.equal(p,target.composePath);return h('f');},treeForCommit:async c=>{assert.equal(c,commit);return tree;},
    readDeployment:async()=>structuredClone(queue)};
  return {commit,tree,target,metadata,runtime,queue,calls,options,inspector:()=>createComposeStateInspector(options),changeMetadata:()=>{changeMetadata=true;}};
}

test('fixed read-only descriptors qualify complete actual five-service runtime including exited migrator',async()=>{
  const f=fixture(),i=f.inspector(),configuration=await i.inspectConfiguration(f.target.targetId,f.commit);
  const proof=await i.inspectRuntime({queue:f.queue,expected:{configuration,configDigest:composeConfigurationDigest(configuration)}});
  assert.equal(proof.commit,f.commit);assert.equal(proof.services.length,5);
  assert.equal(proof.services.find(s=>s.name==='migrate').state,'exited');
  assert(f.calls.every(d=>d.write===false&&d.timeoutMs<=25000&&d.maxOutputBytes<=32768));
  assert(f.calls.every(d=>['docker exec -i coolify php','python3 -'].includes(d.command)));
  assert(f.calls.some(d=>d.stdin.includes("'container','ls','-a'")));
  assert(f.calls.some(d=>d.stdin.includes("if labels.get('coolify.applicationId')!=p['applicationId']")));
});

test('legacy HEAD/autodeploy observation reports missing migrator and unknown images without fake queue or attestation',async()=>{
  const f=fixture();f.metadata.gitCommit='HEAD';f.metadata.autoDeploy=true;
  f.runtime.services=f.runtime.services.filter(s=>s.name!=='migrate');f.runtime.images=f.runtime.images.filter(s=>s.name!=='migrate');
  f.runtime.images.filter(i=>i.name!=='db').forEach(i=>{i.buildRevision='unknown';});
  const i=f.inspector(),r=await i.inspectLegacyBaseline(f.target.targetId,f.commit);
  assert.deepEqual(r.missingDeclared,['migrate']);assert.equal(r.configuration.gitCommit,'HEAD');assert.equal(r.configuration.autoDeploy,true);
  assert.equal(r.queue,null);assert.equal(r.qualified,false);assert(r.services.every(s=>!('commit'in s)&&!('tree'in s)&&!('deploymentId'in s)));
  await assert.rejects(i.readRuntime(f.queue),/release_configuration_unprepared/);
});

test('complete legacy observation still cannot masquerade as strict prepared deployment configuration',async()=>{
  const f=fixture();f.metadata.gitCommit='HEAD';f.metadata.autoDeploy=true;
  await assert.rejects(f.inspector().inspectConfiguration(f.target.targetId,f.commit),/release_configuration_unprepared/);
});

test('supplied finished queue is independently read before and after inspection, changed or absent row fails',async()=>{
  for(const kind of ['absent','different','changed-after']){
    const f=fixture();let reads=0;
    f.options.readDeployment=async()=>{reads++;return kind==='absent'?null:kind==='different'||kind==='changed-after'&&reads===2?{...f.queue,commit:sha('f')}:f.queue;};
    await assert.rejects(f.inspector().readEvidence(f.queue),/queue_(unproven|identity_changed|changed_during_inspection)/);
  }
});

for(const [label,change] of [
  ['unknown image build revision',f=>{f.runtime.images[0].buildRevision='unknown';}],
  ['changed immutable image',f=>{f.runtime.images[0].imageDigest=image('f');}],
  ['incorrect service version',f=>{f.runtime.images[0].imageRef=`${f.target.targetId}_app:${sha('f')}`;}],
  ['mismatched actual OCI revision',f=>{f.runtime.images[0].revisionLabel=sha('f');}],
  ['mismatched actual tree label',f=>{f.runtime.images[0].treeLabel=sha('f');}],
  ['mismatched deployment label',f=>{f.runtime.services[0].deploymentLabel='anotherqueue';}],
  ['container from before finished queue',f=>{f.runtime.services[0].createdAt='2026-10-03T12:00:00.000Z';}],
  ['image created after container',f=>{f.runtime.images[0].createdAt='2026-10-04T12:00:02.000Z';}]
])test(`image provenance rejects ${label}`,async()=>{const f=fixture();change(f);await assert.rejects(f.inspector().readEvidence(f.queue),/image_provenance_unproven/);});

test('failed migration, unhealthy app and database mount change cannot qualify successful deployment',async()=>{
  for(const change of [f=>{f.runtime.services[1].exitCode=1;},f=>{f.runtime.services[0].health='unhealthy';},f=>{f.runtime.services[4].mountDigest=h('f');}]){
    const f=fixture(),i=f.inspector(),configuration=await i.inspectConfiguration(f.target.targetId,f.commit);change(f);
    await assert.rejects(i.inspectRuntime({queue:f.queue,expected:{configuration,configDigest:composeConfigurationDigest(configuration)}}),/migration_failed|service_health_unproven|service_binding_changed/);
  }
});

test('prequeue configuration includes declared mount identity of missing migrator without inventing runtime',async()=>{
  const f=fixture();f.runtime.services=f.runtime.services.filter(s=>s.name!=='migrate');f.runtime.images=f.runtime.images.filter(s=>s.name!=='migrate');
  const i=f.inspector(),c=await i.inspectConfiguration(f.target.targetId,f.commit);
  assert.equal(c.services.length,5);assert.equal(c.services.find(s=>s.name==='migrate').mountDigest,h('2'));
  assert.equal(c.environmentDigest,f.metadata.environmentDigest);
  await assert.rejects(i.readRuntime(f.queue),/declared_service_missing/);
});

test('rollback uses actual immutable image IDs only with independently sealed baseline adoption and phase capability',async()=>{
  const f=fixture();const policy={schemaVersion:'roost-compose-controller-policy-v1',phase:'rollback',rendererDigest:h('c'),artifactDigest:h('d'),...f.metadata.controllerObserved};
  f.options.readControllerPolicy=async()=>policy;
  f.runtime.images.filter(i=>i.name!=='db').forEach(i=>{i.buildRevision='unknown';i.imageRef=i.imageDigest;});
  f.runtime.services.filter(s=>s.name!=='db').forEach(s=>{s.imageRef=s.imageDigest;});
  const adoption={kind:'sealed_baseline_adoption',commit:f.commit,tree:f.tree,artifactDigest:policy.artifactDigest,rendererDigest:policy.rendererDigest,
    images:f.runtime.images.filter(i=>i.name!=='db').map(i=>({name:i.name,imageDigest:i.imageDigest}))};
  f.options.readImageBinding=async()=>adoption;
  assert.equal((await f.inspector().readEvidence(f.queue)).binding.images.length,4);
  for(const bad of [{...adoption,artifactDigest:h('f')},{...adoption,images:adoption.images.slice(1)},
    {...adoption,images:adoption.images.map((i,n)=>n?i:{...i,imageDigest:image('f')})}]){
    f.options.readImageBinding=async()=>bad;
    await assert.rejects(f.inspector().readEvidence(f.queue),/rollback_image_binding_unproven|image_provenance_unproven/);
  }
  f.options.readImageBinding=async()=>adoption;f.runtime.services[0].runtimeRevision='unknown';
  await assert.rejects(f.inspector().readEvidence(f.queue),/image_provenance_unproven/);
});

test('baseline adoption cannot weaken ordinary candidate image provenance',async()=>{
  const f=fixture();f.runtime.images[0].buildRevision='unknown';f.options.readImageBinding=async()=>{throw Error('must not be called');};
  await assert.rejects(f.inspector().readEvidence(f.queue),/image_provenance_unproven/);
});

function immutableCandidateFixture(){
 const f=fixture(),policy={schemaVersion:'roost-compose-controller-policy-v1',phase:'candidate',rendererDigest:h('c'),artifactDigest:h('d'),...f.metadata.controllerObserved};
 f.options.readControllerPolicy=async()=>policy;
 for(const i of f.runtime.images.filter(i=>i.name!=='db')){i.imageRef=i.imageDigest;i.revisionLabel=f.commit;i.treeLabel=f.tree;i.createdAt='2026-10-03T12:00:00.000Z';}
 for(const s of f.runtime.services.filter(s=>s.name!=='db'))s.imageRef=s.imageDigest;
 const images=f.runtime.images.filter(i=>i.name!=='db').map(i=>({name:i.name,imageDigest:i.imageDigest,commit:f.commit,tree:f.tree}));
 const adoption={kind:'sealed_immutable_candidate',commit:f.commit,tree:f.tree,artifactDigest:policy.artifactDigest,rendererDigest:policy.rendererDigest,
  buildProofDigest:h('e'),replacementImagesDigest:(()=>{const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;return createHash('sha256').update(JSON.stringify(canonical([...images].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)))).digest('hex');})(),images};
 f.options.readCandidateImageBinding=async()=>adoption;return{f,adoption};
}
test('explicit immutable candidate preserves image provenance and finished queue timing',async()=>{
 const {f}=immutableCandidateFixture(),e=await f.inspector().readEvidence(f.queue);
 assert.equal(e.binding.images.length,4);assert(e.binding.images.every(i=>i.commit===f.commit&&i.tree===f.tree));
});
for(const[label,mutate]of[
 ['wrong image same commit',(f,a)=>a.images[0].imageDigest=image('f')],
 ['duplicate image role',(f,a)=>a.images[0].name=a.images[1].name],
 ['changed image-set digest',(f,a)=>a.replacementImagesDigest=h('f')],
 ['missing build proof',(f,a)=>delete a.buildProofDigest],
 ['unknown proof field',(f,a)=>a.verified=true],
 ['mutable image reference',f=>f.runtime.images[0].imageRef='latest'],
 ['missing image revision',f=>f.runtime.images[0].revisionLabel=null],
 ['missing tree binding',f=>f.runtime.images[0].treeLabel=null],
 ['unknown build revision',f=>f.runtime.images[0].buildRevision='unknown'],
 ['old container despite new image',f=>f.runtime.services[0].createdAt='2026-10-03T12:00:00.000Z'],
 ['wrong runtime revision',f=>f.runtime.services[0].runtimeRevision=sha('f')]
])test('immutable candidate refuses '+label,async()=>{const{f,adoption}=immutableCandidateFixture();mutate(f,adoption);await assert.rejects(f.inspector().readEvidence(f.queue),/candidate_image_binding_unproven|image_provenance_unproven/);});

test('changed configuration between fixed reads fails closed without retry',async()=>{
  const f=fixture();f.changeMetadata();await assert.rejects(f.inspector().inspectLegacyBaseline(f.target.targetId,f.commit),/configuration_changed_during_inspection/);
  assert.equal(f.calls.length,3);
});

test('hash-only controller policy must match actual command/invariant hashes and fixed renderer pin',async()=>{
  const f=fixture();const policy={schemaVersion:'roost-compose-controller-policy-v1',phase:'candidate',rendererDigest:h('c'),artifactDigest:h('d'),...f.metadata.controllerObserved};
  f.options.readControllerPolicy=async({controllerObserved})=>{assert.deepEqual(controllerObserved,f.metadata.controllerObserved);return policy;};
  const r=await f.inspector().inspectLegacyBaseline(f.target.targetId,f.commit);
  assert.deepEqual(r.configuration.controllerPolicy,policy);
  assert.deepEqual(r.controllerInvariants,{rendererDigest:h('c'),settingsInvariantDigest:h('8'),runtimeInvariantDigest:h('9')});
  f.options.readControllerPolicy=async()=>({...policy,buildCommandDigest:h('f')});
  await assert.rejects(f.inspector().inspectLegacyBaseline(f.target.targetId,f.commit),/controller_changed/);
});

test('unsafe target/path, outside target, oversized response and secret-bearing extra metadata are refused',async()=>{
  const f=fixture();assert.throws(()=>createComposeStateInspector({...f.options,targets:[{...f.target,composePath:'/a/../private'}]}),/configuration_invalid/);
  await assert.rejects(f.inspector().inspectLegacyBaseline('outside',f.commit),/target_outside_scope/);
  f.options.transport=async()=> 'x'.repeat(32769);await assert.rejects(f.inspector().inspectLegacyBaseline(f.target.targetId,f.commit),/response_invalid/);
  f.options.transport=async()=>JSON.stringify({...f.metadata,environment:{TOKEN:'do-not-emit'}});
  await assert.rejects(f.inspector().inspectLegacyBaseline(f.target.targetId,f.commit),e=>e.message==='release_compose_inspector_configuration_unproven'&&!e.message.includes('do-not-emit'));
});
