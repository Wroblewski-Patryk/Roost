import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {composeTemplateQualificationPhp} from './lib/agent-host-release-compose-template.mjs';
import {composeControllerInvariantPhp} from './lib/agent-host-release-compose-inspector.mjs';
const php=process.env.ROOST_TEST_PHP_BINARY??'php';
function fixture(){const target='fixturetarget',template={services:{app:{container_name:'app-fixturetarget-123456789',image:'image:sealed',
 environment:{DATABASE_URL:'${DATABASE_URL}',MODE:'${MODE:-migrate}',EMPTY:'${EMPTY:-fallback}',OPTIONAL:'${OPTIONAL:-fallback}',
  BLANK:'${BLANK:-}',APP_BUILD_REVISION:'__AUTHORIZED_COMMIT__',COOLIFY_CONTAINER_NAME:'app-fixturetarget-123456789'},
 depends_on:{db:{condition:'service_healthy'}},volumes:['data:/data'],ports:['8080:8080']},db:{container_name:'db-fixturetarget-123456789',image:'db:sealed',
 environment:{USER:'${DB_USER:-app}',COOLIFY_CONTAINER_NAME:'db-fixturetarget-123456789'},volumes:['dbdata:/var/lib/db']}},
 volumes:{data:{name:'fixturetarget_data'},dbdata:{name:'fixturetarget_dbdata'}}},live=structuredClone(template),declared=structuredClone(template);
 for(const [name,s]of Object.entries(live.services)){s.container_name=name+'-fixturetarget-987654321';s.environment.COOLIFY_CONTAINER_NAME=s.container_name;}
 Object.assign(live.services.app.environment,{DATABASE_URL:'synthetic-connection',MODE:'migrate',EMPTY:'',OPTIONAL:'fallback',BLANK:''});live.services.db.environment.USER='stored-user';
 for(const s of Object.values(declared.services)){delete s.container_name;delete s.environment.COOLIFY_CONTAINER_NAME;}
 return{target,template,live,declared,normal:[{key:'DATABASE_URL',value:'synthetic-connection',is_preview:false},
 {key:'DB_USER',value:'stored-user',is_preview:false},{key:'EMPTY',value:'',is_preview:false}],preview:[]};}
function run(f){const payload=Buffer.from(JSON.stringify(f)).toString('base64'),invariants=composeControllerInvariantPhp.includes(composeTemplateQualificationPhp)
 ?composeControllerInvariantPhp.replace(composeTemplateQualificationPhp,''):composeControllerInvariantPhp,program=String.raw`
 namespace Symfony\Component\Yaml { class Yaml {public static function parse($raw){return json_decode($raw,true,32,JSON_THROW_ON_ERROR);}} }
 namespace { ${invariants} ${composeTemplateQualificationPhp}
 $p=json_decode(base64_decode('${payload}',true),true,32,JSON_THROW_ON_ERROR);
 $a=(object)['uuid'=>$p['target'],'environment_variables'=>array_map(fn($x)=>(object)$x,$p['normal']),
  'environment_variables_preview'=>array_map(fn($x)=>(object)$x,$p['preview']),'docker_compose_raw'=>json_encode($p['declared'],JSON_THROW_ON_ERROR)];
 $before=roost_compose_hash([$p['live'],$p['template'],$p['normal'],$p['preview'],$p['declared']]);
 try{$qualified=roost_compose_qualified_template($a,$p['live'],$p['template']);$ok=true;$result=['qualified'=>$qualified,'digest'=>roost_compose_hash($qualified)];}
 catch(Throwable $e){$ok=false;$result=['reason'=>$e->getMessage()==='release_compose_template_unproven'?'unproven':'unexpected'];}
 echo json_encode(['passed'=>$ok,'inputsUnchanged'=>$before===roost_compose_hash([$p['live'],$p['template'],$p['normal'],$p['preview'],$p['declared']]),...$result],JSON_THROW_ON_ERROR);
 }`;
 let output;try{output=execFileSync(php,['-r',program],{encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:131072});}
 catch(e){throw Error('synthetic_php_failed: '+String(e.stdout??e.stderr??'').slice(0,1000));}return JSON.parse(output);}
test('actual PHP restores only sealed simple env refs and generated physical name, preserves every other field',()=>{
 const f=fixture(),r=run(f);assert.equal(r.passed,true);assert.equal(r.inputsUnchanged,true);assert.equal(r.qualified.services.app.environment.DATABASE_URL,'${DATABASE_URL}');
 assert.equal(r.qualified.services.app.environment.MODE,'${MODE:-migrate}');assert.equal(r.qualified.services.app.environment.COOLIFY_CONTAINER_NAME,'app-fixturetarget-123456789');
 assert.equal(r.qualified.services.app.container_name,undefined);assert.deepEqual(r.qualified.services.app.volumes,f.template.services.app.volumes);
 assert.deepEqual(r.qualified.services.app.depends_on,f.template.services.app.depends_on);assert(!JSON.stringify(r.qualified).includes('synthetic-connection'));
});
test('unchanged supported env expression remains preparse even if value is not persisted',()=>{
 const f=fixture();f.live.services.app.environment.DATABASE_URL=f.template.services.app.environment.DATABASE_URL;f.normal=f.normal.filter(r=>r.key!=='DATABASE_URL');
 assert.equal(run(f).passed,true);
});
test('fixed Coolify parser uses persisted empty exactly rather than shell default fallback',()=>{
 const f=fixture();assert.equal(run(f).passed,true);f.live.services.app.environment.EMPTY='fallback';assert.equal(run(f).passed,false);
});
test('explicit empty default is allowed only for absent key; persisted nonempty overrides default',()=>{
 const f=fixture();assert.equal(run(f).passed,true);f.normal.push({key:'BLANK',value:'set',is_preview:false});assert.equal(run(f).passed,false);
 f.live.services.app.environment.BLANK='set';assert.equal(run(f).passed,true);
});
test('generated-name template can retain exact supported fallback expression',()=>{
 const f=fixture();f.template.services.app.environment.COOLIFY_CONTAINER_NAME='${COOLIFY_CONTAINER_NAME:-app-fixturetarget}';assert.equal(run(f).passed,true);
});
test('contradictory preview values remain unused; separate metadata seal remains required',()=>{
 const f=fixture();f.preview.push({key:'DATABASE_URL',value:'preview-connection',is_preview:true});const r=run(f);
 assert.equal(r.passed,true);assert.equal(r.qualified.services.app.environment.DATABASE_URL,'${DATABASE_URL}');
 f.preview[0].value='changed-preview-connection';assert.equal(run(f).passed,true);
});
test('preview-only value cannot resolve missing normal ref and never overrides explicit default',()=>{
 const f=fixture();f.normal=f.normal.filter(r=>r.key!=='DATABASE_URL');f.preview.push({key:'DATABASE_URL',value:'synthetic-connection',is_preview:true});
 assert.equal(run(f).passed,false);f.live.services.app.environment.DATABASE_URL=f.template.services.app.environment.DATABASE_URL;
 f.preview.push({key:'OPTIONAL',value:'preview-other',is_preview:true});assert.equal(run(f).passed,true);
 f.live.services.app.environment.OPTIONAL='preview-other';assert.equal(run(f).passed,false);
});
test('unchanged literal declared container name is verified exactly, not ignored by builtin normalization',()=>{
 const f=fixture();f.declared.services.app.container_name='owner-override';f.template.services.app.container_name='owner-override';f.live.services.app.container_name='owner-override';
 f.template.services.app.environment.COOLIFY_CONTAINER_NAME='owner-override';f.live.services.app.environment.COOLIFY_CONTAINER_NAME='owner-override';
 assert.equal(run(f).passed,true);f.live.services.app.container_name='app-fixturetarget-987654321';assert.equal(run(f).passed,false);
});
const refused={
 secretValueDrift:f=>f.live.services.app.environment.DATABASE_URL='different-connection',persistedValueDrift:f=>f.normal[0].value='different-connection',
 literalDrift:f=>{f.template.services.app.environment.LITERAL='original';f.live.services.app.environment.LITERAL='changed';},
 missingRequired:f=>f.normal=f.normal.filter(r=>r.key!=='DATABASE_URL'),defaultDrift:f=>f.live.services.app.environment.OPTIONAL='different',
 nullValue:f=>f.normal[0].value=null,numericValue:f=>f.normal[0].value=123,
 duplicateSame:f=>f.normal.push({...f.normal[0]}),duplicateConflict:f=>f.normal.push({...f.normal[0],value:'changed'}),
 previewDuplicate:f=>f.preview.push({key:'OTHER',value:'other',is_preview:true},{key:'OTHER',value:'other',is_preview:true}),previewMalformed:f=>f.preview.push({key:'OTHER',value:'other',is_preview:false}),
 normalFlagMissing:f=>delete f.normal[0].is_preview,normalFlagAmbiguous:f=>f.normal[0].is_preview='false',
 normalPreviewFlag:f=>f.normal[0].is_preview=true,
 badEnvKey:f=>f.normal[0].key='BAD KEY',missingEnvField:f=>delete f.live.services.app.environment.MODE,
 extraEnvField:f=>f.live.services.app.environment.EXTRA='unknown',tableShape:f=>f.live.services.app.environment=['MODE=migrate'],
 wrongGeneratedService:f=>f.live.services.app.environment.COOLIFY_CONTAINER_NAME='db-fixturetarget-987654321',
 wrongGeneratedTarget:f=>{f.live.services.app.container_name='app-othertarget-987654321';f.live.services.app.environment.COOLIFY_CONTAINER_NAME=f.live.services.app.container_name;},
 wrongGeneratedTimestamp:f=>{f.live.services.app.container_name='app-fixturetarget-12';f.live.services.app.environment.COOLIFY_CONTAINER_NAME=f.live.services.app.container_name;},
 generatedEnvNameMismatch:f=>f.live.services.app.environment.COOLIFY_CONTAINER_NAME='app-fixturetarget-123456789',
 declaredContainerOverride:f=>f.declared.services.app.container_name='app-fixturetarget-123456789',
 declaredEnvOverride:f=>f.declared.services.app.environment.COOLIFY_CONTAINER_NAME='app-fixturetarget-123456789',
 persistedNameOverride:f=>f.normal.push({key:'COOLIFY_CONTAINER_NAME',value:'app-fixturetarget-123456789',is_preview:false}),
 persistedEmptyName:f=>f.normal.push({key:'COOLIFY_CONTAINER_NAME',value:'',is_preview:false}),missingDeclaredSource:f=>f.declared={},
 dependency:f=>f.live.services.app.depends_on.db.condition='service_started',volume:f=>f.live.services.app.volumes[0]='other:/data',
 globalVolume:f=>f.live.volumes.data.name='foreign',image:f=>f.live.services.app.image='image:other',
 build:f=>f.live.services.app.build={context:'.'},ports:f=>f.live.services.app.ports[0]='9090:8080',command:f=>f.live.services.app.command=['other'],
 foreignService:f=>f.live.services.other=structuredClone(f.live.services.app),unknownService:f=>delete f.live.services.db,
 wrongTemplateName:f=>f.template.services.app.container_name='app-othertarget-123456789',
 generatedNoPhysicalName:f=>delete f.live.services.app.container_name,
};
for(const [name,change]of Object.entries(refused))test('actual PHP template refusal '+name,()=>{const f=fixture();change(f);const r=run(f);assert.equal(r.passed,false);assert.equal(r.inputsUnchanged,true);assert.equal(r.reason,'unproven');});
for(const expression of ['prefix-${VAR}','${VAR}-suffix','${VAR:-${OTHER}}','${VAR:+other}','${VAR?fail}','${VAR-default}','${1VAR}','${ VAR}','${VAR','${VAR:-$(echo x)}','$VAR'])
 test('actual PHP rejects unsupported expression '+expression,()=>{const f=fixture();f.template.services.app.environment.MODE=expression;f.live.services.app.environment.MODE=expression;
 const r=run(f);assert.equal(r.passed,false);assert.equal(r.reason,'unproven');});
