import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { coolifyHttpsJson, coolifyTransportFailureDiagnostic, isCoolifyTransportFailureDiagnosticCode } from './lib/agent-host-release-coolify.mjs';
import { configureComposeWithQualifiedModelCas, composeConfigurationFailureStage, composeConfigurationTransportDiagnostic,
 isComposeConfigurationTransportDiagnostic } from './lib/agent-host-release-compose-config.mjs';
import { renderComposePhaseCommands } from './lib/agent-host-release-compose-controller.mjs';
import { releaseEffectDiagnostic } from './lib/agent-host-release-broker.mjs';
import { persistReleaseWorkerDiagnostic } from './lib/agent-host-release-worker.mjs';

const h=c=>c.repeat(64),sha=c=>c.repeat(40),token='fictional-private-token';
const url='https://release.example.test/api/v1/applications/fixtureapp';
const stages=['before_get','patch','unchanged_get','qualification_read','apply','final_get','pre_effect_before_patch','pre_effect_before_apply'];
function fixture(){
 const policy={schemaVersion:'roost-compose-phase-policy-v1',releaseId:'12345678-1234-1234-1234-123456789abc',
  policyId:'22345678-1234-1234-1234-123456789abc',targetId:'fixtureapp',phase:'candidate',commit:sha('c'),tree:sha('e'),
  composePath:'/compose.yml',baseDirectory:'/',rawCompose:false,preserveRepository:false,useBuildServer:false,
  originalConfigDigest:h('1'),phaseConfigDigest:h('2'),artifactDigest:h('3'),rendererDigest:h('f'),
  settingsInvariantDigest:h('a'),runtimeInvariantDigest:h('b'),
  services:[['app','app','built'],['migrate','migration','built'],['db','database','image']].map(([name,role,source])=>
   ({name,role,source,imageDigest:'sha256:'+h('a'),imageRef:source==='image'?'postgres:15':'fixture/'+name,mountDigest:h('b')})),
  sourcePins:{queueHelper:h('3'),deploymentJob:h('4'),applicationModel:h('5'),composeParser:h('6'),dockerHelper:h('7'),
   applicationsController:h('8'),controllerRenderer:h('f')}};
 const commands=renderComposePhaseCommands(policy),before={uuid:'fixtureapp',git_commit_sha:sha('0'),
  docker_compose_custom_build_command:'',docker_compose_custom_start_command:''};
 const desired={uuid:'fixtureapp',git_commit_sha:policy.commit,docker_compose_custom_build_command:commands.build,
  docker_compose_custom_start_command:commands.start};
 const calls=[];
 const options={policy,scope:{targetId:'fixtureapp',repositoryPath:'example/private-app',branch:'main'},
  readApplication:()=>coolifyHttpsJson({url,token}),patchApplication:body=>coolifyHttpsJson({url,method:'PATCH',body,token}),
  beforeEffect:async()=>{calls.push('guard');},php:async(_source,p)=>{calls.push(p.operation);return p.operation==='qualify'
   ?{validationRejected:true,rejectedFields:['docker_compose_custom_build_command','docker_compose_custom_start_command']}
   :{applied:true,targetId:'fixtureapp'};}};
 return {before,desired,calls,options};
}
function transportMock(t,steps){
 const requests=[];
 t.mock.method(https,'request',(target,options,callback)=>{
  const request=new EventEmitter(),step=steps.shift();assert(step,'unexpected additional HTTPS request');
  request.destroy=()=>{request.destroyed=true;if(step.destroyError)request.emit('error',step.destroyError);};
  request.end=body=>{requests.push({method:options.method,bodyBytes:body===undefined?0:Buffer.byteLength(body)});
   assert.equal(target.href,url);assert.equal(options.timeout,10000);assert.equal(options.rejectUnauthorized,true);
   assert.equal(options.agent,false);assert.equal(options.minVersion,'TLSv1.2');
   queueMicrotask(()=>{
    if(step.event==='request_error'){request.emit('error',step.error);return;}
    if(step.event==='timeout'){request.emit('timeout');return;}
    const response=new EventEmitter();response.statusCode=step.status??200;response.headers={};
    response.destroy=()=>{response.destroyed=true;};callback(response);
    if(response.destroyed)return;
    if(step.event==='response_error'){response.emit('error',step.error);return;}
    response.emit('data',Buffer.from(JSON.stringify(step.body??{})));response.emit('end');
   });
  };
  return request;
 });
 return requests;
}
const native=(code='ECONNRESET')=>Object.assign(Error('fictional-private-native-message'),{code,privateDetails:token});
const reject422={status:422};
const qualification=()=>({validationRejected:true,rejectedFields:['docker_compose_custom_build_command','docker_compose_custom_start_command']});

for(const [event,errno] of [['request_error','ENOTFOUND'],['request_error','EAI_AGAIN'],['request_error','ECONNREFUSED'],
 ['request_error','ETIMEDOUT'],['request_error','ERR_TLS_CERT_ALTNAME_INVALID'],['request_error','CERT_HAS_EXPIRED'],
 ['response_error','ECONNRESET'],['response_error','EPIPE']])test('actual HTTPS callback records only fixed '+event+'/'+errno,async t=>{
 const original=native(errno),requests=transportMock(t,[{event,error:original}]);
 await assert.rejects(coolifyHttpsJson({url,token}),error=>{
  assert.equal(error.message,'release_coolify_transport_uncertain');assert.equal(error.uncertain,false);assert.equal(error.retryable,false);
  assert.equal(error.cause,original);assert.equal(Object.prototype.propertyIsEnumerable.call(error,'cause'),false);
  assert.deepEqual(coolifyTransportFailureDiagnostic(error),{event,errno});
  assert.equal(JSON.stringify(error).includes(token),false);assert.equal(JSON.stringify(error).includes('native-message'),false);return true;
 });
 assert.equal(requests.length,1);
});

test('PATCH timeout keeps its exact stage through outer wrapper and safe persisted broker diagnostic',async t=>{
 const f=fixture(),requests=transportMock(t,[{body:f.before},{event:'timeout',destroyError:native()}]);
 let failure;
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>{
  failure=error;assert.equal(error.message,'release_coolify_transport_uncertain');assert.equal(error.uncertain,true);
  assert.equal(error.retryable,false);assert.equal(composeConfigurationFailureStage(error),'patch');
  assert.deepEqual(coolifyTransportFailureDiagnostic(error),{event:'timeout'});return true;
 });
 const wrapped=Object.assign(Error('release_coolify_compose_configuration_mutation_uncertain',{cause:failure}),
  {uncertain:true,retryable:false,transportDiagnostic:'transport_uncertain'});
 const expected='release_compose_config_patch_timeout';
 assert.equal(composeConfigurationTransportDiagnostic(wrapped),expected);assert.equal(releaseEffectDiagnostic(wrapped),expected);
 const dir=mkdtempSync(path.join(os.tmpdir(),'compose-config-diagnostic-'));
 try{
  assert.equal(persistReleaseWorkerDiagnostic(path.join(dir,'config.json'),'uncertainty',releaseEffectDiagnostic(wrapped)),true);
  const bytes=readFileSync(path.join(dir,'release-worker-diagnostic.json'),'utf8'),record=JSON.parse(bytes);
  assert.equal(record.reason,expected);assert.deepEqual(Object.keys(record).sort(),['observedAt','phase','reason']);
  for(const privateValue of [token,'example.test','native-message','docker compose'])assert(!bytes.includes(privateValue));
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.deepEqual(requests.map(r=>r.method),['GET','PATCH']);assert.deepEqual(f.calls,['guard']);
});

test('initial response failure is before_get and causes no effect or retry',async t=>{
 const f=fixture(),requests=transportMock(t,[{event:'response_error',error:native()}]);
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>
  composeConfigurationTransportDiagnostic(error)==='release_compose_config_before_get_response_error_econnreset');
 assert.equal(requests.length,1);assert.deepEqual(f.calls,[]);
});

test('only literal HTTP422 reaches one qualified CAS and the final read',async t=>{
 const f=fixture(),requests=transportMock(t,[{body:f.before},reject422,{body:f.before},{body:f.desired}]);
 assert.deepEqual(await configureComposeWithQualifiedModelCas(f.options),{route:'qualified_installed_model_cas',validationRulesChanged:false});
 assert.deepEqual(requests.map(r=>r.method),['GET','PATCH','GET','GET']);assert.deepEqual(f.calls,['guard','qualify','guard','apply']);
});

test('failed unchanged_get after HTTP422 cannot reach qualification or apply',async t=>{
 const f=fixture(),requests=transportMock(t,[{body:f.before},reject422,{event:'request_error',error:native('EAI_AGAIN')}]);
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>
  composeConfigurationTransportDiagnostic(error)==='release_compose_config_unchanged_get_request_error_eai_again');
 assert.deepEqual(requests.map(r=>r.method),['GET','PATCH','GET']);assert.deepEqual(f.calls,['guard']);
});

test('failed final_get remains uncertain after one apply and never replays it',async t=>{
 const f=fixture(),requests=transportMock(t,[{body:f.before},reject422,{body:f.before},{event:'response_error',error:native('ECONNRESET')}]);
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>
  composeConfigurationTransportDiagnostic(error)==='release_compose_config_final_get_response_error_econnreset');
 assert.deepEqual(requests.map(r=>r.method),['GET','PATCH','GET','GET']);assert.deepEqual(f.calls,['guard','qualify','guard','apply']);
});

for(const stage of ['pre_effect_before_patch','pre_effect_before_apply'])test('guard GET failure retains '+stage+' before any protected effect',async t=>{
 const f=fixture(),steps=stage==='pre_effect_before_patch'?[{body:f.before},{event:'request_error',error:native('ENOTFOUND')}]
  :[{body:f.before},reject422,{body:f.before},{event:'request_error',error:native('ENOTFOUND')}];
 const requests=transportMock(t,steps);let guards=0;
 f.options.beforeEffect=async()=>{guards++;if(stage==='pre_effect_before_patch'||guards===2)await coolifyHttpsJson({url,token});};
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>
  composeConfigurationTransportDiagnostic(error)==='release_compose_config_'+stage+'_request_error_enotfound');
 assert.equal(requests.filter(r=>r.method==='PATCH').length,stage==='pre_effect_before_patch'?0:1);
 assert(!f.calls.includes('apply'));assert.equal(f.calls.includes('qualify'),stage==='pre_effect_before_apply');
});

for(const stage of ['qualification_read','apply'])test('native '+stage+' stage survives in RAM without inventing an HTTPS event',async t=>{
 const f=fixture(),original=Error('release_child_native_exit_failed'),requests=transportMock(t,[{body:f.before},reject422,{body:f.before}]);
 f.options.php=async(_source,p)=>{f.calls.push(p.operation);if(p.operation===(stage==='apply'?'apply':'qualify'))throw original;return qualification();};
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>{
  assert.equal(composeConfigurationFailureStage(error),stage);assert.equal(composeConfigurationTransportDiagnostic(error),null);
  assert.equal(coolifyTransportFailureDiagnostic(error),null);
  if(stage==='apply'){assert.equal(error.message,'release_compose_controller_result_uncertain');assert.equal(error.cause,original);assert.equal(error.uncertain,true);}
  else assert.equal(error,original);
  assert.equal(error.retryable,stage==='apply'?false:undefined);return true;
 });
 assert.equal(requests.length,3);assert.equal(f.calls.filter(c=>c==='apply').length,stage==='apply'?1:0);
});

test('spoofed exception labels cannot manufacture trusted stage or transport metadata',async t=>{
 const forged=Object.assign(Error('release_coolify_transport_uncertain'),{configurationStage:'patch',event:'request_error',
  errno:'ENOTFOUND',code:'ENOTFOUND',transportDiagnostic:'release_compose_config_patch_request_error_enotfound'});
 assert.equal(composeConfigurationFailureStage(forged),null);assert.equal(composeConfigurationTransportDiagnostic(forged),null);
 assert.equal(coolifyTransportFailureDiagnostic(forged),null);
 const f=fixture();transportMock(t,[{body:f.before}]);f.options.patchApplication=async()=>{throw forged;};
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>{
  assert.equal(error,forged);assert.equal(composeConfigurationFailureStage(error),'patch');
  assert.equal(composeConfigurationTransportDiagnostic(error),null);return true;
 });
});

test('unknown or getter errno never leaks and does not change transport denial',async t=>{
 const getter=Error('fictional-private-native-message');Object.defineProperty(getter,'code',{get(){throw Error(token);}});
 const requests=transportMock(t,[{event:'request_error',error:native(token)},{event:'request_error',error:getter}]);
 for(let i=0;i<2;i++)await assert.rejects(coolifyHttpsJson({url,token}),error=>{
  assert.equal(error.message,'release_coolify_transport_uncertain');assert.deepEqual(coolifyTransportFailureDiagnostic(error),{event:'request_error'});
  assert(!JSON.stringify(error).includes(token));return true;
 });
 assert.equal(requests.length,2);
});

test('exact diagnostic predicate rejects arbitrary suffixes and foreign stages',()=>{
 for(const stage of stages){
  assert(isComposeConfigurationTransportDiagnostic('release_compose_config_'+stage+'_timeout'));
  assert(isComposeConfigurationTransportDiagnostic('release_compose_config_'+stage+'_request_error_enotfound'));
  assert(isComposeConfigurationTransportDiagnostic('release_compose_config_'+stage+'_response_error_econnreset'));
 }
 for(const value of ['release_compose_config_patch_timeout_private','release_compose_config_patch_request_error_secret',
  'release_compose_config_deploy_timeout','release_compose_config_patch_timeout_econnreset','release_compose_config_patch_request_error_ENOTFOUND',
  'release_compose_config_patch_timeout\nBearer private','private-value',null,{}])assert.equal(isComposeConfigurationTransportDiagnostic(value),false);
 assert(isCoolifyTransportFailureDiagnosticCode('request_error_enotfound'));assert(!isCoolifyTransportFailureDiagnosticCode('request_error_private'));
});

test('bounded cause traversal retains genuine metadata only within five nodes',async t=>{
 const f=fixture();transportMock(t,[{body:f.before},{event:'request_error',error:native('ECONNREFUSED')}]);let failure;
 await assert.rejects(configureComposeWithQualifiedModelCas(f.options),error=>{failure=error;return true;});
 let wrapped=failure;for(let i=0;i<4;i++)wrapped=Error('private outer',{cause:wrapped});
 assert.equal(composeConfigurationTransportDiagnostic(wrapped),'release_compose_config_patch_request_error_econnrefused');
 wrapped=Error('private outer',{cause:wrapped});assert.equal(composeConfigurationTransportDiagnostic(wrapped),null);
 const cycle=Error('private outer');cycle.cause=cycle;assert.equal(composeConfigurationTransportDiagnostic(cycle),null);
});
