import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {composePhasePolicySchema,composePhaseCapabilitySchema,composePhasePolicyDigest,composePhaseArtifactFile,composePhaseChecksumBytes,
 composeControllerPolicyRecord,renderComposePhaseCommands,composeMountDigest,composeReplacementImagesDigest,
 composeImmutableCandidateInventoryDigest,composeImmutableCandidateEntryDigest,qualifyComposePhaseArtifact,composePhaseValidationPhp} from './lib/agent-host-release-compose-controller.mjs';
const H=x=>x.repeat(64),S=x=>x.repeat(40),I=x=>'sha256:'+H(x),bytes=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>bytes(JSON.stringify(canonical(v))),clone=structuredClone;
function fixture(){
 const mounts=[{Type:'volume',Name:'fixture_data',Source:'/var/lib/docker/volumes/fixture_data/_data',Destination:'/var/lib/postgresql/data',Driver:'local',Mode:'rw',RW:true,Propagation:''}];
 const services=[['app','app','a'],['migrate','migration','b'],['maintenance','cadence','c'],['proactive','cadence','d'],['db','database','e']].map(([name,role,letter])=>({name,role,source:role==='database'?'image':'built',imageDigest:I(letter),imageRef:role==='database'?'pgvector/pgvector:pg15':I(letter),mountDigest:composeMountDigest(role==='database'?mounts:[])}));
 const doc={services:Object.fromEntries(services.map(r=>[r.name,{image:r.imageRef,...(r.role==='database'?{volumes:['data:/var/lib/postgresql/data']}:{environment:{APP_BUILD_REVISION:S('f')},env_file:['.env']}),...(r.role==='migration'?{command:['migrate'],restart:'no'}:{}),...(r.role==='app'?{depends_on:['db']}:{})}])),volumes:{data:{name:'fixture_data'}},networks:{fixture:{external:true}}};
 const artifactBytes=Buffer.from(JSON.stringify(doc)),at=new Date(Date.now()-1000).toISOString();
 const policy={schemaVersion:'roost-compose-phase-policy-v1',releaseId:'12345678-1234-1234-1234-123456789abc',policyId:'22345678-1234-1234-1234-123456789abc',targetId:'fixtureapp',phase:'candidate',commit:S('f'),tree:S('9'),composePath:'/docker-compose.coolify.yml',baseDirectory:'/',rawCompose:false,preserveRepository:false,useBuildServer:false,originalConfigDigest:H('1'),phaseConfigDigest:H('2'),artifactDigest:bytes(artifactBytes),rendererDigest:H('3'),settingsInvariantDigest:H('4'),runtimeInvariantDigest:H('5'),services,
  sourcePins:{queueHelper:H('6'),deploymentJob:H('7'),applicationModel:H('8'),composeParser:H('9'),dockerHelper:H('a'),applicationsController:H('b'),controllerRenderer:H('3')},
  candidateExecution:{mode:'qualified_immutable_images',replacementImagesDigest:composeReplacementImagesDigest(services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:r.imageDigest,commit:S('f'),tree:S('9')}))),buildProofDigest:H('c')}};
 const db={name:'db',role:'database',containerId:H('1'),imageDigest:I('e'),mountDigest:services.at(-1).mountDigest,state:'running',health:'healthy',exitCode:0};
 const inventory={targetId:policy.targetId,observedAt:at,projectServiceSetComplete:true,services:[db],digest:H('0')};inventory.digest=composeImmutableCandidateInventoryDigest(inventory);
 const entryQualification={schemaVersion:'roost-compose-immutable-candidate-entry-v1',targetId:policy.targetId,policyDigest:composePhasePolicyDigest(policy),observedAt:at,inventory,
  absences:services.filter(r=>r.source==='built').map(r=>({name:r.name,role:r.role,source:'built',mountDigest:r.mountDigest,policyServiceDigest:digest(r),absenceVerified:true,inventoryDigest:inventory.digest,observedAt:at})),evidenceDigest:H('0')};entryQualification.evidenceDigest=composeImmutableCandidateEntryDigest(entryQualification);
 const replacementImageMetadata=services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:r.imageDigest,buildRevision:policy.commit,revisionLabel:null,treeLabel:null}));
 const input={policy,artifactBytes,configurationDigest:policy.phaseConfigDigest,sourcePins:policy.sourcePins,services:[{name:'db',imageDigest:I('e'),mounts}],imageIdentities:[...services.map(r=>({imageRef:r.imageDigest,imageDigest:r.imageDigest})),{imageRef:services.at(-1).imageRef,imageDigest:I('e')}],rendererDigest:policy.rendererDigest,settingsInvariantDigest:policy.settingsInvariantDigest,runtimeInvariantDigest:policy.runtimeInvariantDigest,entryQualification,replacementImageMetadata};
 return{...input,input,mounts,doc,db};
}
function copy(){const f=fixture();return{...clone(f.input),artifactBytes:Buffer.from(f.artifactBytes)};}
const refreshEntry=x=>{x.entryQualification.inventory.digest=composeImmutableCandidateInventoryDigest(x.entryQualification.inventory);x.entryQualification.evidenceDigest=composeImmutableCandidateEntryDigest(x.entryQualification);};
test('immutable candidate binds exact four replacement images and DB-only qualified entry',()=>{
 const f=fixture(),cap=qualifyComposePhaseArtifact(f.input);assert(composePhasePolicySchema.safeParse(f.policy).success);assert(composePhaseCapabilitySchema.safeParse(cap).success);
 assert.deepEqual(cap.candidateExecution,f.policy.candidateExecution);assert.deepEqual(cap.entryQualification,f.entryQualification);assert.deepEqual(cap.replacementImageMetadata,f.replacementImageMetadata);
 assert.equal(cap.policyDigest,composePhasePolicyDigest(f.policy));assert.equal(cap.buildCommandDigest,bytes(renderComposePhaseCommands(f.policy).build));assert.equal(cap.phase,'candidate');
 assert.equal(composeReplacementImagesDigest(f.policy.services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:r.imageDigest,commit:f.policy.commit,tree:f.policy.tree})).reverse()),f.policy.candidateExecution.replacementImagesDigest);
});
test('fixed immutable build AND start copy/checksum sealed artifact and never rebuild, pull or execute cadence',()=>{
 const f=fixture(),commands=renderComposePhaseCommands(f.policy),file=composePhaseArtifactFile(f.policy);
 for(const command of Object.values(commands)){assert(command.startsWith(`docker cp coolify:/var/www/html/storage/app/applications/${f.policy.targetId}/${file} `));assert(command.includes(`sha256sum -c /artifacts/${file}.sha256`));for(const r of f.policy.services)assert(command.includes(r.imageDigest));assert.doesNotMatch(command,/(?:^|\s)build --pull\b|--build-arg|\bpull (?!never)/);}
 assert.match(commands.build,/config --no-env-resolution --services --quiet$/);assert.match(commands.start,/create --no-build --pull never --force-recreate maintenance proactive &&/);assert.match(commands.start,/up -d --no-build --pull never app db migrate$/);
 assert.doesNotMatch(commands.start,/up[^&]*\b(?:maintenance|proactive)\b/);assert.equal(composePhaseChecksumBytes(f.policy).toString(),`${f.policy.artifactDigest}  /artifacts/${file}\n`);
});
test('ordinary candidate and rollback keep exact original commands, records and capability keys',()=>{
 const f=fixture(),legacy=clone(f.policy);delete legacy.candidateExecution;
 const inspect=(ref,value)=>`docker image inspect --format '{{if ne .Id "${value}"}}{{json}}{{end}}' -- ${ref}`;
 const db=inspect(legacy.services.at(-1).imageRef,I('e')),project='--project-name fixtureapp --project-directory .';
 const start=file=>`docker compose ${project} --env-file ./.env -f ${file} create --no-build --pull never --force-recreate maintenance proactive && docker compose ${project} --env-file ./.env -f ${file} up -d --no-build --pull never app db migrate`;
 const candidate={build:`${db} && docker compose ${project} --env-file /artifacts/build-time.env -f ./docker-compose.coolify.yml build --pull --build-arg APP_BUILD_REVISION=${legacy.commit}`,start:`${db} && ${start('./docker-compose.coolify.yml')}`};assert.deepEqual(renderComposePhaseCommands(legacy),candidate);
 assert.equal(composePhasePolicyDigest(legacy),digest(legacy));const record=composeControllerPolicyRecord(legacy);assert.deepEqual(Object.keys(record).sort(),['schemaVersion','phase','rendererDigest','artifactDigest','buildCommandDigest','startCommandDigest','settingsInvariantDigest','runtimeInvariantDigest'].sort());assert.equal(record.buildCommandDigest,bytes(candidate.build));
 legacy.phase='rollback';const file=composePhaseArtifactFile(legacy),destination='/artifacts/'+file,verify=`sha256sum -c ${destination}.sha256`,images=[...new Set(legacy.services.map(r=>r.imageDigest))].sort().map(v=>inspect(v,v)).join(' && ');
 const rollback={build:`docker cp coolify:/var/www/html/storage/app/applications/fixtureapp/${file} ${destination} && docker cp coolify:/var/www/html/storage/app/applications/fixtureapp/${file}.sha256 ${destination}.sha256 && ${verify} && ${images} && docker compose ${project} --env-file /artifacts/build-time.env -f ${destination} config --no-env-resolution --services --quiet`,start:`${verify} && ${images} && ${db} && ${start(destination)}`};assert.deepEqual(renderComposePhaseCommands(legacy),rollback);
 const input={...f.input,policy:legacy,services:legacy.services.map(r=>({name:r.name,imageDigest:r.imageDigest,mounts:r.role==='database'?f.mounts:[]}))};delete input.entryQualification;delete input.replacementImageMetadata;
 const cap=qualifyComposePhaseArtifact(input);assert(!('candidateExecution'in cap));assert(!('entryQualification'in cap));assert(!('replacementImageMetadata'in cap));
});
for(const [name,change]of Object.entries({rollback:p=>p.phase='rollback',mode:p=>p.candidateExecution.mode='unchecked',extra:p=>p.candidateExecution.command='private',wrongDigest:p=>p.candidateExecution.replacementImagesDigest=H('0'),invalidProof:p=>p.candidateExecution.buildProofDigest='unknown',wrongCommit:p=>p.commit=S('0'),wrongTree:p=>p.tree=S('0'),mutableBuiltRef:p=>p.services[0].imageRef='fixture:latest',wrongRoles:p=>p.services[2].role='app',missingService:p=>p.services.pop()}))test('opt-in policy refuses '+name,()=>{const f=fixture();change(f.policy);assert.equal(composePhasePolicySchema.safeParse(f.policy).success,false);assert.throws(()=>renderComposePhaseCommands(f.policy),/policy_invalid/);});
const denials={missingQualification:x=>delete x.entryQualification,missingMetadata:x=>delete x.replacementImageMetadata,unboundPolicy:x=>x.entryQualification.policyDigest=H('0'),inventedDigest:x=>x.entryQualification.evidenceDigest=H('0'),stale:x=>{x.entryQualification.observedAt=new Date(Date.now()-300001).toISOString();x.entryQualification.inventory.observedAt=x.entryQualification.observedAt;refreshEntry(x);},future:x=>{x.entryQualification.observedAt=new Date(Date.now()+1000).toISOString();x.entryQualification.inventory.observedAt=x.entryQualification.observedAt;refreshEntry(x);},missingDB:x=>x.services=[],foreign:x=>x.services.push({name:'foreign',imageDigest:I('0'),mounts:[]}),partialApp:x=>x.services.push({name:'app',imageDigest:I('a'),mounts:[]}),DBimage:x=>x.services[0].imageDigest=I('0'),DBmount:x=>x.services[0].mounts[0].Name='other',DBcontainerAbsent:x=>x.entryQualification.inventory.services=[],DBunhealthy:x=>x.entryQualification.inventory.services[0].health='unhealthy',inventoryIncomplete:x=>x.entryQualification.inventory.projectServiceSetComplete=false,missingAbsence:x=>x.entryQualification.absences.pop(),duplicateAbsence:x=>x.entryQualification.absences[1]=clone(x.entryQualification.absences[0]),wrongAbsenceRole:x=>{x.entryQualification.absences[0].role='cadence';refreshEntry(x);},wrongAbsenceMount:x=>{x.entryQualification.absences[0].mountDigest=H('0');refreshEntry(x);},wrongDeclaration:x=>{x.entryQualification.absences[0].policyServiceDigest=H('0');refreshEntry(x);},unverifiedAbsence:x=>x.entryQualification.absences[0].absenceVerified=false,wrongAbsenceInventory:x=>{x.entryQualification.absences[0].inventoryDigest=H('0');refreshEntry(x);},wrongMetadataCommit:x=>x.replacementImageMetadata[0].buildRevision=S('0'),unknownRevision:x=>x.replacementImageMetadata[0].buildRevision='unknown',wrongImageMetadata:x=>x.replacementImageMetadata[0].imageDigest=I('0'),missingMetadataImage:x=>x.replacementImageMetadata.pop(),duplicateMetadata:x=>x.replacementImageMetadata[1]=clone(x.replacementImageMetadata[0]),wrongRevisionLabel:x=>x.replacementImageMetadata[0].revisionLabel=S('0'),wrongTreeLabel:x=>x.replacementImageMetadata[0].treeLabel=S('0'),imageMissing:x=>x.imageIdentities.shift(),imageSubstituted:x=>x.imageIdentities[0].imageDigest=I('0'),imageExtra:x=>x.imageIdentities.push({imageRef:I('0'),imageDigest:I('0')}),duplicateIdentity:x=>x.imageIdentities.push(clone(x.imageIdentities[0])),sourcePin:x=>x.sourcePins.dockerHelper=H('0'),settingsInvariant:x=>x.settingsInvariantDigest=H('0'),runtimeInvariant:x=>x.runtimeInvariantDigest=H('0')};
for(const [name,change]of Object.entries(denials))test('typed immutable capability refuses '+name,()=>{const x=copy();change(x);assert.throws(()=>qualifyComposePhaseArtifact(x));});
for(const [name,change]of Object.entries({build:d=>d.services.app.build='.',mutableImage:d=>d.services.app.image='app:latest',DBalias:d=>d.services.db.image='postgres:latest',missing:d=>delete d.services.proactive,extra:d=>d.services.foreign={image:I('0')},cadenceDependency:d=>d.services.app.depends_on=['maintenance']}))test('sealed artifact refuses '+name,()=>{const x=copy(),d=JSON.parse(x.artifactBytes.toString());change(d);x.artifactBytes=Buffer.from(JSON.stringify(d));x.policy.artifactDigest=bytes(x.artifactBytes);x.entryQualification.policyDigest=composePhasePolicyDigest(x.policy);refreshEntry(x);assert.throws(()=>qualifyComposePhaseArtifact(x));});
test('exact labels may be present while unqualified data cannot be passed into an ordinary policy',()=>{const x=copy();for(const m of x.replacementImageMetadata){m.revisionLabel=x.policy.commit;m.treeLabel=x.policy.tree;}assert(composePhaseCapabilitySchema.safeParse(qualifyComposePhaseArtifact(x)).success);delete x.policy.candidateExecution;assert.throws(()=>qualifyComposePhaseArtifact(x),/immutable_candidate_scope_required/);});
test('replacement digest uses the same byte ordering as PHP for allowed mixed-case service names',()=>{
 const f=fixture(),names={app:'aApp',migrate:'BMigration',maintenance:'aCadence',proactive:'ZCadence'};
 for(const row of f.policy.services)row.name=names[row.name]??row.name;
 for(const row of f.replacementImageMetadata)row.name=names[row.name]??row.name;
 f.doc.services=Object.fromEntries(Object.entries(f.doc.services).map(([name,row])=>[names[name]??name,row]));
 f.artifactBytes=Buffer.from(JSON.stringify(f.doc));f.input.artifactBytes=f.artifactBytes;f.policy.artifactDigest=bytes(f.artifactBytes);
 const images=f.policy.services.filter(r=>r.source==='built').map(r=>({name:r.name,imageDigest:r.imageDigest,commit:f.policy.commit,tree:f.policy.tree}));
 const expected=digest(images.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0));
 f.policy.candidateExecution.replacementImagesDigest=composeReplacementImagesDigest(images);
 assert.equal(f.policy.candidateExecution.replacementImagesDigest,expected);
 f.entryQualification.policyDigest=composePhasePolicyDigest(f.policy);
 for(const row of f.entryQualification.absences){row.name=names[row.name]??row.name;row.policyServiceDigest=digest(f.policy.services.find(s=>s.name===row.name));}
 refreshEntry(f.input);assert(composePhaseCapabilitySchema.safeParse(qualifyComposePhaseArtifact(f.input)).success);
 if(phpAvailable){const r=phpRun(f);assert.equal(r.ok,true,JSON.stringify(r));}
});
test('changed valid build-proof hash requires a newly bound actual entry rather than reusing the prior qualification',()=>{const x=copy();x.policy.candidateExecution.buildProofDigest=H('0');assert.throws(()=>qualifyComposePhaseArtifact(x),/immutable_entry_binding_changed/);});
for(const [name,change]of Object.entries({entry:cap=>cap.entryQualification.policyDigest=H('0'),proof:cap=>cap.entryQualification.evidenceDigest=H('0'),images:cap=>cap.candidateExecution.replacementImagesDigest=H('0'),metadata:cap=>cap.replacementImageMetadata[0].buildRevision=S('0'),DB:cap=>cap.entryQualification.inventory.services[0].imageDigest=I('0'),absence:cap=>cap.entryQualification.absences[0].policyServiceDigest=H('0'),extra:cap=>cap.entryQualification.ownerCommand='private'}))test('strict capability schema refuses independently swapped '+name,()=>{const cap=qualifyComposePhaseArtifact(fixture().input);change(cap);assert.equal(composePhaseCapabilitySchema.safeParse(cap).success,false);});

const php=process.env.ROOST_TEST_PHP_BINARY??'php';let phpAvailable=false;try{execFileSync(php,['-v'],{stdio:'ignore',timeout:5000});phpAvailable=true;}catch{}
function phpRun(f,controls={}){
 const cap=qualifyComposePhaseArtifact(f.input),data={cap,commands:renderComposePhaseCommands(f.policy),artifact:f.artifactBytes.toString(),mounts:f.mounts,metadata:f.replacementImageMetadata};
 const program=String.raw`<?php
class FixturePatterns {const SHELL_SAFE_COMMAND_PATTERN='/^[a-zA-Z0-9 \t._\-\/=:@,+\[\]{}#%^~&"\x27]+$/';}class_alias('FixturePatterns','App\\Support\\ValidationPatterns');
${composePhaseValidationPhp}
$in=json_decode(base64_decode('__INPUT__'),true);$c=json_decode(base64_decode('__CONTROLS__'),true);$cap=$in['cap'];$calls=[];
if(isset($c['capMode']))$cap['candidateExecution']['mode']='unchecked';if(isset($c['proof']))$cap['candidateExecution']['buildProofDigest']='unknown';
if(isset($c['digest']))$cap['candidateExecution']['replacementImagesDigest']=str_repeat('0',64);
if(isset($c['scope']))$cap['phase']='rollback';if(isset($c['entry']))$cap['entryQualification']['evidenceDigest']=str_repeat('0',64);
if(isset($c['extra']))$cap['candidateExecution']['command']='private';
$a=(object)['uuid'=>$cap['targetId'],'docker_compose_custom_build_command'=>$in['commands']['build'],'docker_compose_custom_start_command'=>$in['commands']['start'],
 'settings'=>(object)['is_raw_compose_deployment_enabled'=>false,'is_preserve_repository_enabled'=>false,'is_build_server_enabled'=>false]];
$readFile=fn($p)=>str_ends_with($p,'.sha256')?(isset($c['checksum'])?'changed':$cap['artifactDigest'].'  /artifacts/'.$cap['artifactFile']."\n"):$in['artifact'];
$readSource=fn($p)=>str_contains($p,'docker.php')?$cap['sourcePins']['dockerHelper']:$cap['sourcePins']['applicationsController'];
$run=function($cmd)use(&$calls,$in,$cap,$c){$calls[]=$cmd;
 if(str_starts_with($cmd,'docker container ls'))return isset($c['missingDB'])?'':(isset($c['foreign'])?str_repeat('1',64)."\n".str_repeat('2',64):str_repeat('1',64));
 if(str_starts_with($cmd,'docker container inspect'))return json_encode(['name'=>'db','containerId'=>isset($c['DBid'])?str_repeat('2',64):str_repeat('1',64),'imageDigest'=>isset($c['DBimage'])?'sha256:'.str_repeat('0',64):$cap['entryQualification']['inventory']['services'][0]['imageDigest'],
  'mounts'=>isset($c['mount'])?[]:$in['mounts'],'state'=>'running','health'=>isset($c['unhealthy'])?'unhealthy':'healthy','exitCode'=>0]);
 if(str_starts_with($cmd,'docker image inspect')){
  foreach($cap['services'] as $s)if((str_ends_with($cmd,"'".$s['imageDigest']."'")||str_ends_with($cmd,'"'.$s['imageDigest'].'"'))){if(str_contains($cmd,'environment')){
   $m=array_values(array_filter($in['metadata'],fn($i)=>$i['name']===$s['name']))[0];$env=['APP_BUILD_REVISION='.($c['unknownRevision']??false?'unknown':$cap['commit'])];if(isset($c['duplicateRevision']))$env[]='APP_BUILD_REVISION='.$cap['commit'];
   return json_encode(['imageDigest'=>isset($c['image'])?'sha256:'.str_repeat('0',64):$s['imageDigest'],'environment'=>$env,'labels'=>['org.opencontainers.image.revision'=>isset($c['revisionLabel'])?str_repeat('0',40):$m['revisionLabel'],'io.roost.release.tree'=>isset($c['treeLabel'])?str_repeat('0',40):$m['treeLabel']]]);}
   return isset($c['image'])?'sha256:'.str_repeat('0',64):$s['imageDigest'];}
  $db=array_values(array_filter($cap['services'],fn($s)=>$s['role']==='database'))[0];if((str_ends_with($cmd,"'".$db['imageRef']."'")||str_ends_with($cmd,'"'.$db['imageRef'].'"')))return isset($c['alias'])?'sha256:'.str_repeat('0',64):$db['imageDigest'];
 }
 throw new Exception('unexpected');};
try{$ok=roost_validate_compose_phase($a,$cap,$readFile,$readSource,$run,fn($a)=>['settingsInvariantDigest'=>$cap['settingsInvariantDigest'],'runtimeInvariantDigest'=>$cap['runtimeInvariantDigest']]);echo json_encode(['ok'=>$ok,'calls'=>$calls]);}
catch(Throwable $e){echo json_encode(['ok'=>false,'reason'=>$e->getMessage(),'calls'=>$calls]);}
`;
 return JSON.parse(execFileSync(php,[],{input:program.replace('__INPUT__',Buffer.from(JSON.stringify(data)).toString('base64')).replace('__CONTROLS__',Buffer.from(JSON.stringify(controls)).toString('base64')),encoding:'utf8',timeout:5000}));
}
test('identical fixed PHP atomically rechecks DB-only inventory, immutable metadata and artifact checksum', {skip:!phpAvailable},()=>{const r=phpRun(fixture());assert.equal(r.ok,true,JSON.stringify(r));assert(r.calls.every(c=>/^docker (?:container (?:ls|inspect)|image inspect) /.test(c)));assert.equal(r.calls.filter(c=>c.includes('environment')).length,4);});
for(const name of ['capMode','proof','digest','scope','entry','extra','checksum','missingDB','foreign','DBid','DBimage','mount','unhealthy','image','alias','unknownRevision','duplicateRevision','revisionLabel','treeLabel'])test('identical PHP refuses '+name,{skip:!phpAvailable},()=>{const r=phpRun(fixture(),{[name]:true});assert.equal(r.ok,false);assert.match(r.reason,/^phase(?:-|$)/);});
