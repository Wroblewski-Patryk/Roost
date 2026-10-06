import {createHash} from 'node:crypto';
import {composePhasePolicySchema,renderComposePhaseCommands} from './agent-host-release-compose-controller.mjs';
import {composeControllerInvariantPhp} from './agent-host-release-compose-inspector.mjs';
import {coolifyTransportFailureDiagnostic,isCoolifyTransportFailureDiagnosticCode} from './agent-host-release-coolify.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),fields=['git_commit_sha','docker_compose_custom_build_command','docker_compose_custom_start_command'];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=(code,cause)=>{throw Object.assign(Error(code,cause?{cause}:undefined),{retryable:false,uncertain:code==='release_compose_controller_result_uncertain'});};
const configurationFailureMetadata=new WeakMap();
const configurationStages=['before_get','patch','unchanged_get','qualification_read','apply','final_get','pre_effect_before_patch','pre_effect_before_apply'];
const diagnosticPrefix='release_compose_config_';
const atStage=async(stage,callback)=>{try{return await callback();}catch(error){
 if(error&&(typeof error==='object'||typeof error==='function'))configurationFailureMetadata.set(error,stage);throw error;
}};
export function composeConfigurationFailureStage(error){
 for(let depth=0;error&&depth<5;depth++,error=error.cause){const stage=configurationFailureMetadata.get(error);if(stage)return stage;}
 return null;
}
export function isComposeConfigurationTransportDiagnostic(value){
 return typeof value==='string'&&configurationStages.some(stage=>value.startsWith(diagnosticPrefix+stage+'_')
  &&isCoolifyTransportFailureDiagnosticCode(value.slice((diagnosticPrefix+stage+'_').length)));
}
/** Stage and event must both come from trusted callbacks, never model/error labels. */
export function composeConfigurationTransportDiagnostic(error){
 const stage=composeConfigurationFailureStage(error),transport=coolifyTransportFailureDiagnostic(error);
 if(!stage||!transport)return null;
 const result=diagnosticPrefix+stage+'_'+transport.event+(transport.errno?'_'+transport.errno.toLowerCase():'');
 return isComposeConfigurationTransportDiagnostic(result)?result:null;
}
export function composeConfigurationFields(a){if(!a||!fields.every(k=>Object.hasOwn(a,k)&&(typeof a[k]==='string'||a[k]===null)))fail('release_compose_configuration_identity_invalid');return Object.fromEntries(fields.map(k=>[k,a[k]]));}
export function isExplicitConfigurationValidationRejection(e){return e?.message==='release_coolify_response_unproven'&&e.httpStatus===422;}
export const composeConfigurationCasPhp=String.raw`
function roost_compose_config_fields($a){return ['git_commit_sha'=>$a->git_commit_sha,'docker_compose_custom_build_command'=>$a->docker_compose_custom_build_command,'docker_compose_custom_start_command'=>$a->docker_compose_custom_start_command];}
function roost_compose_config_qualify($a,$p,$readSource,$validate,$invariants){
 $keys=['git_commit_sha','docker_compose_custom_build_command','docker_compose_custom_start_command'];
 if(array_keys($p['fields'])!==$keys||array_keys($p['expectedFields'])!==$keys||$a->uuid!==$p['targetId']||$a->build_pack!=='dockercompose'||$a->docker_compose_location!==$p['composePath']||$a->git_repository!==$p['repositoryPath']||$a->git_branch!==$p['branch'])throw new Exception('scope');
 $paths=['applicationModel'=>'/var/www/html/app/Models/Application.php','applicationsController'=>'/var/www/html/app/Http/Controllers/Api/ApplicationsController.php'];
 foreach($paths as $key=>$path)if($readSource($path)!==$p['sourcePins'][$key])throw new Exception('source');
 if(roost_compose_config_fields($a)!==$p['expectedFields'])throw new Exception('preimage');
 foreach(['settingsInvariantDigest','runtimeInvariantDigest'] as $key)if(($invariants($a)[$key]??null)!==$p[$key])throw new Exception('invariant');
 if(!preg_match('/^[a-f0-9]{40}$/',$p['fields']['git_commit_sha']))throw new Exception('commit');
 foreach(['docker_compose_custom_build_command'=>'buildCommandDigest','docker_compose_custom_start_command'=>'startCommandDigest'] as $field=>$digest)if(!is_string($p['fields'][$field])||strlen($p['fields'][$field])<1||strlen($p['fields'][$field])>32768||hash('sha256',$p['fields'][$field])!==$p[$digest])throw new Exception('command');
 $failed=$validate($p['fields']);ksort($failed);
 $expected=array_values(array_filter(['docker_compose_custom_build_command','docker_compose_custom_start_command'],fn($field)=>strlen($p['fields'][$field])>1000));if(count($expected)===0||array_keys($failed)!==$expected)throw new Exception('validation');
 foreach($failed as $field=>$reasons){$codes=array_keys($reasons);sort($codes);if($codes!==['Max'])throw new Exception('validation');}
 return ['validationRejected'=>true,'rejectedFields'=>$expected];
}
function roost_compose_config_cas($p,$readSource,$validate,$invariants,$transaction,$loadLocked){
 return $transaction(function()use($p,$readSource,$validate,$invariants,$loadLocked){$a=$loadLocked($p['targetId']);roost_compose_config_qualify($a,$p,$readSource,$validate,$invariants);$before=$a->attributesToArray();
 foreach($p['fields'] as $key=>$value)$a->$key=$value;$a->save();
 // Requery the persisted row under the same lock. Unlike refresh(), the same
 // model query preserves default count projections as well as stored strings.
 $a = $loadLocked($p['targetId']);$after=$a->attributesToArray();
 foreach(array_unique(array_merge(array_keys($before),array_keys($after)))as$key)if(!in_array($key,['git_commit_sha','docker_compose_custom_build_command','docker_compose_custom_start_command','updated_at'],true)&&($before[$key]??null)!==($after[$key]??null))throw new Exception('other_field');
 if(roost_compose_config_fields($a)!==$p['fields'])throw new Exception('readback');foreach(['settingsInvariantDigest','runtimeInvariantDigest']as$key)if(($invariants($a)[$key]??null)!==$p[$key])throw new Exception('invariant');return ['applied'=>true,'targetId'=>$a->uuid];});
}`;
export const composeConfigurationProductionPhp=composeControllerInvariantPhp+composeConfigurationCasPhp+String.raw`
$readSource=fn($path)=>is_file($path)&&!is_link($path)?hash_file('sha256',$path):null;
$validate=function($body){if(!function_exists('sharedDataApplications'))throw new Exception('validator');$rules=sharedDataApplications();foreach(['docker_compose_custom_build_command','docker_compose_custom_start_command']as$field){$r=$rules[$field]??null;if(!is_array($r)||!in_array('string',$r,true)||!in_array('max:1000',$r,true)||count(array_filter($r,fn($v)=>is_string($v)&&str_starts_with($v,'regex:')))!==1)throw new Exception('rules');}$validator=Illuminate\Support\Facades\Validator::make($body,$rules);$validator->passes();return $validator->failed();};
$invariants=fn($a)=>roost_compose_controller_invariants($a);
if($p['operation']==='qualify'){$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();echo json_encode(roost_compose_config_qualify($a,$p,$readSource,$validate,$invariants),JSON_THROW_ON_ERROR);}
elseif($p['operation']==='apply'){echo json_encode(roost_compose_config_cas($p,$readSource,$validate,$invariants,fn($run)=>Illuminate\Support\Facades\DB::transaction($run),fn($uuid)=>App\Models\Application::where('uuid',$uuid)->lockForUpdate()->firstOrFail()),JSON_THROW_ON_ERROR);}else throw new Exception('operation');`;
/** Fixed installation callback; a packet never supplies a command/program. */
export async function configureComposeWithQualifiedModelCas({policy,scope,readApplication,patchApplication,php,beforeEffect}){
 const p=composePhasePolicySchema.parse(policy),commands=renderComposePhaseCommands(p);
 if(!scope||scope.targetId!==p.targetId||!['readApplication','patchApplication','php','beforeEffect'].every(k=>typeof ({readApplication,patchApplication,php,beforeEffect})[k]==='function'))fail('release_compose_configuration_identity_invalid');
 const before=await atStage('before_get',readApplication),expectedFields=composeConfigurationFields(before),desired={git_commit_sha:p.commit,docker_compose_custom_build_command:commands.build,docker_compose_custom_start_command:commands.start};
 if(before.uuid!==p.targetId)fail('release_compose_configuration_identity_invalid');
 await atStage('pre_effect_before_patch',beforeEffect);try{await atStage('patch',()=>patchApplication(desired));return {route:'normal_https'};}catch(error){if(!isExplicitConfigurationValidationRejection(error))throw error;}
 const unchanged=await atStage('unchanged_get',readApplication);if(unchanged.uuid!==p.targetId||!same(composeConfigurationFields(unchanged),expectedFields))fail('release_compose_controller_result_uncertain');
 const payload={operation:'qualify',targetId:p.targetId,composePath:p.composePath,repositoryPath:scope.repositoryPath,branch:scope.branch,expectedFields,fields:desired,sourcePins:p.sourcePins,settingsInvariantDigest:p.settingsInvariantDigest,runtimeInvariantDigest:p.runtimeInvariantDigest,buildCommandDigest:hash(commands.build),startCommandDigest:hash(commands.start)};
 const expectedRejected=fields.slice(1).filter(field=>Buffer.byteLength(desired[field])>1000);
 const qualification=await atStage('qualification_read',()=>php(composeConfigurationProductionPhp,payload));if(!expectedRejected.length||qualification?.validationRejected!==true||!same(qualification.rejectedFields,expectedRejected))fail('release_compose_configuration_identity_invalid');
 await atStage('pre_effect_before_apply',beforeEffect);let proof;try{proof=await atStage('apply',()=>php(composeConfigurationProductionPhp,{...payload,operation:'apply'}));}catch(error){fail('release_compose_controller_result_uncertain',error);}
 if(proof?.applied!==true||proof.targetId!==p.targetId)fail('release_compose_controller_result_uncertain');const after=await atStage('final_get',readApplication);if(after.uuid!==p.targetId||!same(composeConfigurationFields(after),desired))fail('release_compose_controller_result_uncertain');return {route:'qualified_installed_model_cas',validationRulesChanged:false};
}
