// Installation-only schema qualification. Importing this module performs no I/O.
// Runtime callers may use the reader/qualifier; installation DDL is explicit.
import {createHash} from 'node:crypto';

export const composeConfigurationSchemaFields=Object.freeze([
 'docker_compose_custom_build_command','docker_compose_custom_start_command'
]);
const fail=reason=>{throw Object.assign(Error('release_compose_configuration_schema_'+reason),{retryable:false});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function qualifyComposeConfigurationSchema(rows,{requireText=true}={}){
 if(typeof requireText!=='boolean'||!Array.isArray(rows)||rows.length!==2)fail('unproven');
 const normalized=rows.slice().sort((a,b)=>String(a?.name).localeCompare(String(b?.name)));
 if(!normalized.every((r,i)=>r&&same(Object.keys(r).sort(),['maxLength','name','type'])
   &&r.name===composeConfigurationSchemaFields[i]
   &&(r.type==='text'&&r.maxLength===null||r.type==='character varying'&&r.maxLength===255)))fail('unsupported');
 const text=normalized.every(r=>r.type==='text'),legacy=normalized.every(r=>r.type==='character varying');
 if(!text&&!legacy)fail('mixed');
 if(requireText&&!text)fail('capacity_insufficient');
 return Object.freeze({schemaVersion:'roost-compose-configuration-schema-v1',fields:normalized,
  capacityQualified:text,installationChangeRequired:legacy,
  digest:createHash('sha256').update(JSON.stringify(normalized)).digest('hex')});
}

// No application/environment values leave this bounded metadata reader.
export const composeConfigurationSchemaPhp=String.raw`
function roost_compose_configuration_schema(){
 $table=Illuminate\Support\Facades\DB::selectOne("SELECT count(*) AS count FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='applications' AND table_type='BASE TABLE'");if((int)$table->count!==1)throw new Exception('schema_table');
 $rows=Illuminate\Support\Facades\DB::select("SELECT column_name AS name,data_type AS type,character_maximum_length AS \"maxLength\" FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='applications' AND column_name IN ('docker_compose_custom_build_command','docker_compose_custom_start_command') ORDER BY column_name");
 $out=[];foreach($rows as$r)$out[]=['name'=>$r->name,'type'=>$r->type,'maxLength'=>$r->maxLength===null?null:(int)$r->maxLength];
 $names=['docker_compose_custom_build_command','docker_compose_custom_start_command'];
 if(count($out)!==2||array_column($out,'name')!==$names)throw new Exception('schema_missing');
 foreach($out as$r)if(!(($r['type']==='text'&&$r['maxLength']===null)||($r['type']==='character varying'&&$r['maxLength']===255)))throw new Exception('schema_unsupported');
 if($out[0]['type']!==$out[1]['type'])throw new Exception('schema_mixed');return $out;
}`;
export const composeConfigurationSchemaReadPhp=composeConfigurationSchemaPhp+String.raw`
echo json_encode(['schema'=>roost_compose_configuration_schema()],JSON_THROW_ON_ERROR);`;

// The operator supplies only an explicit mode and previously observed metadata.
// Rehearsal always rolls back. Apply is not invoked by a runtime Worker.
export const composeConfigurationSchemaInstallationPhp=composeConfigurationSchemaPhp+String.raw`
function roost_compose_configuration_data(){
 $hash=hash_init('sha256');$count=0;$bytes=0;
 foreach(Illuminate\Support\Facades\DB::cursor('SELECT to_jsonb(a)::text AS row FROM applications a ORDER BY id')as$r){
  $count++;$bytes+=strlen($r->row);if($count>10000||$bytes>67108864)throw new Exception('data_bound');hash_update($hash,$r->row."\n");
 }return ['count'=>$count,'digest'=>hash_final($hash)];
}
function roost_compose_configuration_idle(){
 $r=Illuminate\Support\Facades\DB::selectOne("SELECT count(*) AS count FROM application_deployment_queues WHERE status IS NULL OR status NOT IN ('finished','failed','cancelled','canceled','cancelled-by-user')");
 if((int)$r->count!==0)throw new Exception('queue_active');
}
if(!is_array($p)||array_keys($p)!==['operation','expectedSchema','expectedData']||!in_array($p['operation'],['rehearse','apply'],true)||!is_array($p['expectedSchema'])||($p['operation']==='rehearse'?$p['expectedData']!==null:!is_array($p['expectedData'])))throw new Exception('request');
$connection=Illuminate\Support\Facades\DB::connection();if($connection->getDriverName()!=='pgsql'||$connection->transactionLevel()!==0)throw new Exception('connection');
$connection->beginTransaction();
try{
 Illuminate\Support\Facades\DB::statement("SET LOCAL lock_timeout='5s'");Illuminate\Support\Facades\DB::statement("SET LOCAL statement_timeout='30s'");
 $tables=Illuminate\Support\Facades\DB::selectOne("SELECT count(*) AS count FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN ('applications','application_deployment_queues') AND table_type='BASE TABLE'");if((int)$tables->count!==2)throw new Exception('installation_tables');
 Illuminate\Support\Facades\DB::statement('LOCK TABLE applications IN ACCESS EXCLUSIVE MODE');
 Illuminate\Support\Facades\DB::statement('LOCK TABLE application_deployment_queues IN SHARE MODE');
 roost_compose_configuration_idle();$beforeSchema=roost_compose_configuration_schema();if($beforeSchema!==$p['expectedSchema'])throw new Exception('schema_preimage');
 $before=roost_compose_configuration_data();if($p['operation']==='apply'&&$before!==$p['expectedData'])throw new Exception('rehearsal_data_changed');$changed=$beforeSchema[0]['type']==='character varying';
 if($changed){
  Illuminate\Support\Facades\DB::statement('ALTER TABLE applications ALTER COLUMN docker_compose_custom_build_command TYPE text');
  Illuminate\Support\Facades\DB::statement('ALTER TABLE applications ALTER COLUMN docker_compose_custom_start_command TYPE text');
 }
 $afterSchema=roost_compose_configuration_schema();if(array_column($afterSchema,'type')!==['text','text'])throw new Exception('schema_readback');
 $after=roost_compose_configuration_data();if($before!==$after)throw new Exception('data_changed');roost_compose_configuration_idle();
 if($p['operation']==='rehearse')$connection->rollBack();else $connection->commit();
 $finalSchema=roost_compose_configuration_schema();if($finalSchema!==($p['operation']==='rehearse'?$beforeSchema:$afterSchema))throw new Exception('final_schema');
 $final=roost_compose_configuration_data();if($before!==$final)throw new Exception('final_data');
 echo json_encode(['operation'=>$p['operation'],'changed'=>$changed,'rolledBack'=>$p['operation']==='rehearse','committed'=>$p['operation']==='apply','beforeSchema'=>$beforeSchema,'testedSchema'=>$afterSchema,'finalSchema'=>$finalSchema,'before'=>$before,'after'=>$after,'final'=>$final,'queueIdle'=>true,'ownedFields'=>['docker_compose_custom_build_command','docker_compose_custom_start_command'],'rawRowsIncluded'=>false],JSON_THROW_ON_ERROR);
}catch(Throwable$e){if($connection->transactionLevel()>0)$connection->rollBack();throw $e;}`;

export function qualifyComposeConfigurationSchemaInstallationReceipt(receipt,{operation,expectedSchema}={}){
 if(!['rehearse','apply'].includes(operation))fail('operation');
 const before=qualifyComposeConfigurationSchema(expectedSchema,{requireText:false}),tested=qualifyComposeConfigurationSchema(receipt?.testedSchema),final=qualifyComposeConfigurationSchema(receipt?.finalSchema,{requireText:operation==='apply'});
 const keys=['operation','changed','rolledBack','committed','beforeSchema','testedSchema','finalSchema','before','after','final','queueIdle','ownedFields','rawRowsIncluded'].sort();
 if(!receipt||!same(Object.keys(receipt).sort(),keys)||receipt.operation!==operation||receipt.changed!==before.installationChangeRequired
  ||receipt.rolledBack!==(operation==='rehearse')||receipt.committed!==(operation==='apply')
  ||!same(receipt.beforeSchema,before.fields)||!same(final.fields,operation==='rehearse'?before.fields:tested.fields)
  ||receipt.queueIdle!==true||receipt.rawRowsIncluded!==false||!same(receipt.ownedFields,composeConfigurationSchemaFields))fail('receipt_unproven');
 const data=receipt.before;if(!data||!same(Object.keys(data).sort(),['count','digest'])||!Number.isSafeInteger(data.count)||data.count<0||data.count>10000||!hex(data.digest)||!same(data,receipt.after)||!same(data,receipt.final))fail('data_parity');
 return Object.freeze({operation,capacityQualified:operation==='apply'||!before.installationChangeRequired,dataCount:data.count,dataDigest:data.digest,rolledBack:receipt.rolledBack,committed:receipt.committed,automaticRuntimeMigration:false,rawRowsIncluded:false});
}

export function prepareComposeConfigurationSchemaInstallationRequest({operation,expectedSchema,rehearsalReceipt}={}){
 const before=qualifyComposeConfigurationSchema(expectedSchema,{requireText:false});
 if(operation==='rehearse'){
  if(rehearsalReceipt!==undefined)fail('rehearsal_input');
  return{operation,expectedSchema:before.fields,expectedData:null};
 }
 if(operation!=='apply')fail('operation');
 // A lost or invalid rehearsal reply is not permission to retry or apply.
 const proof=qualifyComposeConfigurationSchemaInstallationReceipt(rehearsalReceipt,{operation:'rehearse',expectedSchema:before.fields});
 if(!proof.rolledBack||proof.committed)fail('rehearsal_required');
 return{operation,expectedSchema:before.fields,expectedData:{count:proof.dataCount,digest:proof.dataDigest}};
}
