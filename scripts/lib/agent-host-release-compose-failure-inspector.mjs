import {z} from 'zod';
import {createHash} from 'node:crypto';
import contract from './agent-host-release-contract.cjs';
import {composeConfigurationSchema,composeConfigurationDigest,composeRuntimeServiceSchema} from './agent-host-release-compose-state.mjs';
import {buildReleaseFingerprintCommand} from './agent-host-release-fingerprint.mjs';

const hash=z.string().regex(/^[a-f0-9]{64}$/),pg=z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,62}$/),uuid=z.string().uuid();
const sourceSchema=z.object({container:hash,user:pg,database:pg,sshHost:z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/).optional()}).strict();
const bytesDigest=b=>createHash('sha256').update(b).digest('hex');
const nativeService=composeRuntimeServiceSchema.omit({commit:true,tree:true,deploymentId:true}).strict();
const check=(v,why)=>{if(!v)throw Error('release_compatible_failure_read_'+why);},same=(a,b)=>contract.releaseDigest(a??null)===contract.releaseDigest(b??null);
const quote=v=>"'"+v.replaceAll("'","'\\''")+"'",iso=v=>v instanceof Date?v.toISOString():v;
const settled=o=>o?.status==='reconciled'?o.reconciledStatus:o?.status;
const uncertain=()=>Object.freeze({status:'uncertain',resolved:false,reason:'release_compatible_failure_read_unproven',retryAllowed:false,rollbackAllowed:false,releaseAuthority:false});
const bootstrap="require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();";
// The complete target window includes late updates to older queues so they
// cannot disappear through a created-at-only filter. Such ambiguity refuses.
export const compatibleFailureQueueScanPhp=String.raw`$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();$from=Carbon\Carbon::parse($p['from']);
$query=App\Models\ApplicationDeploymentQueue::where('application_id',$a->id)->where(function($q)use($from){$q->where('created_at','>=',$from)->orWhere('updated_at','>=',$from)->orWhere('finished_at','>=',$from);});
$count=(clone $query)->count();$rows=(clone $query)->orderBy('created_at')->orderBy('id')->limit(33)->get()->map(fn($q)=>['targetId'=>$a->uuid,'deploymentId'=>$q->deployment_uuid,'commit'=>$q->commit,'status'=>$q->status,'createdAt'=>$q->created_at->toISOString(),'finishedAt'=>$q->finished_at?->toISOString()])->values();
echo json_encode(['scanComplete'=>$count<=32,'totalRows'=>$count,'activeDeployments'=>App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count(),'rows'=>$rows],JSON_THROW_ON_ERROR);`;
export const compatibleFailureSequenceSql="BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT format('SELECT jsonb_build_object(''schema'',%L,''sequence'',%L,''lastValue'',last_value,''isCalled'',is_called)::text FROM %I.%I;',n.nspname,c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname\n\\gexec\nCOMMIT;";
export const compatibleFailureDatabaseFenceSql="BEGIN READ ONLY; SELECT json_build_object('readOnlyFence',EXISTS(SELECT 1 FROM pg_db_role_setting s JOIN pg_database d ON d.oid=s.setdatabase JOIN pg_roles r ON r.oid=s.setrole WHERE d.datname=current_database() AND r.rolname=current_user AND 'default_transaction_read_only=on'=ANY(s.setconfig)), 'activeOtherSessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active'),'ownedTransactions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL AND state<>'idle'))::text; COMMIT;";
const frame=(snapshot,current,operationId)=>{const{releaseId:_,...body}=snapshot;
 check(current?.release?.id===snapshot.releaseId&&same(current.release.snapshot,body)&&Array.isArray(current.journal)&&current.journal.length<=contract.compatibleRecoveryOperations.length
  &&new Set(current.journal.map(v=>v.id)).size===current.journal.length,'normal_immutable_snapshot');
 const op=current.journal.find(v=>v.id===operationId);check(op&&op.releaseId===snapshot.releaseId&&current.journal.at(-1).id===op.id&&['deploy_config','deploy','observe'].includes(op.operation)
  &&(!op.outcome||op.outcome.status==='uncertain'||op.outcome.status==='reconciled'&&['absent','failed'].includes(op.outcome.reconciledStatus)),'exact_terminal_operation');
 contract.intentSchema.parse(op.intent);check(op.intent.operation===op.operation&&op.intent.manifestDigest===snapshot.manifestDigest&&op.intent.commit===snapshot.commit,'normal_own_intent');return op;};
const deploymentPrior=(s,current,op)=>{if(op.operation!=='observe')return null;
 const index=current.journal.findIndex(v=>v.id===op.id),prior=current.journal.slice(0,index).filter(v=>v.operation==='deploy'&&settled(v.outcome)==='succeeded').at(-1);
 check(prior&&prior.outcome?.id&&prior.releaseId===s.releaseId,'actual_successful_deployment_required');return prior;};
const queueReadSchema=z.object({scanComplete:z.literal(true),totalRows:z.number().int().min(0).max(32),activeDeployments:z.literal(0),rows:contract.compatibleFailureQueueScanSchema.shape.rows}).strict();
const imageMetadataSchema=z.array(z.object({name:z.string(),imageDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/),buildRevision:z.string(),revisionLabel:z.string().nullable(),treeLabel:z.string().nullable()}).strict()).max(4);

/** Installed code supplies fixed native transports/inspectors. Settings and
 * model JSON never select a program, command, inspector or assertion callback.
 * Returned JSON is qualified evidence; the owner still needs genuine native
 * closure before recording it. No OS capability is minted by this reader. */
export async function readCompatibleRecoveryFailure({snapshot,operationId,source},dependencies){
 try{
  uuid.parse(operationId);source=sourceSchema.parse(source);check(snapshot?.releaseId&&snapshot.compatibleArtifactRecovery,'compatible_scope');
  contract.manifestSchema.parse(snapshot.manifest);contract.compatibleArtifactRecoverySchema.parse(snapshot.compatibleArtifactRecovery);
  const {readCurrentState,readConfiguration,entryInspector,candidateInspector,transport,readIngressFence,probeHealth,assertClone,now=Date.now}=dependencies??{};
  check([readCurrentState,readConfiguration,transport,readIngressFence,probeHealth,assertClone,now].every(f=>typeof f==='function')
   &&typeof entryInspector?.inspectLegacyBaseline==='function'&&typeof candidateInspector?.inspectLegacyBaseline==='function','fixed_dependencies');
  const actual=async fn=>{await assertClone();const value=await fn();await assertClone();return value;};
  const target=snapshot.manifest.deployment.targets[0],started=now(),current=await actual(readCurrentState),op=frame(snapshot,current,operationId),prior=deploymentPrior(snapshot,current,op),deployment=prior??op;
  const read=async(operation,command,stdin='',maxOutputBytes=32768,timeoutMs=25000)=>{await assertClone();const out=await transport({operation,command,stdin,write:false,maxOutputBytes,timeoutMs});await assertClone();
   const value=typeof out==='object'&&out!==null?(check(out.exitCode===0,'native_channel_exit'),out.stdout):out;
   check((typeof value==='string'||Buffer.isBuffer(value))&&Buffer.byteLength(value)<=maxOutputBytes,'native_output_bound');return value.toString();};
  const config=composeConfigurationSchema.parse(await actual(readConfiguration)),phase=same(config,snapshot.compatibleArtifactRecovery.currentEntry.configuration)?'entry':same(config,target.configuration)?'candidate':null;
  check(phase,'unknown_current_configuration');const inspector=phase==='entry'?entryInspector:candidateInspector;
  const observed=await actual(()=>inspector.inspectLegacyBaseline(target.targetId,config.gitCommit));check(same(observed.configuration,config)&&Array.isArray(observed.services)&&Array.isArray(observed.missingDeclared),'complete_fixed_runtime');
  const rows=observed.services.map(v=>nativeService.parse(Object.fromEntries(Object.keys(nativeService.shape).map(k=>[k,v[k]]))));
  const declared=config.services,missing=declared.filter(v=>!rows.some(r=>r.name===v.name));
  check(same(missing.map(v=>v.name).sort(),observed.missingDeclared.slice().sort())&&rows.length+missing.length===5&&new Set(rows.map(v=>v.name)).size===rows.length,'actual_declared_absences');
  const db=rows.find(v=>v.role==='database');check(db&&db.containerId===source.container&&db.containerId===snapshot.compatibleArtifactRecovery.currentEntry.database.containerId,'protected_database');
  const queue=async()=>{const payload=Buffer.from(JSON.stringify({targetId:target.targetId,from:iso(deployment.createdAt)})).toString('base64');
   const script=`<?php\nerror_reporting(0);ini_set('display_errors','0');try{$p=json_decode(base64_decode('${payload}',true),true,32,JSON_THROW_ON_ERROR);${bootstrap}${compatibleFailureQueueScanPhp}}catch(Throwable $e){echo '{"unproven":true}';exit(1);}`;
   const result=queueReadSchema.parse(JSON.parse(await read('compatible_failure_queues','docker exec -i coolify php',script)));check(result.totalRows===result.rows.length,'complete_queue_count');return result;};
  const q=await queue();check(q.rows.length<=1,'unrelated_or_ambiguous_queue');const sqlCommand=`docker exec -i ${quote(db.containerId)} psql -X -qAt -v ON_ERROR_STOP=1 -U ${quote(source.user)} -d ${quote(source.database)}`;
  const fence=async()=>{const v=JSON.parse(await read('compatible_failure_database_fence',sqlCommand,compatibleFailureDatabaseFenceSql));check(v.readOnlyFence===true&&v.activeOtherSessions===0&&v.ownedTransactions===0,'database_not_held');return v;};
  const fingerprint=async()=>{const out=(await read('compatible_failure_fingerprint','bash -s',buildReleaseFingerprintCommand({...source,container:db.containerId},60000)+'\n',512,65000)).trim().split(/\r?\n/);
   check(out.length===2&&out.every(v=>/^[a-f0-9]{64}  -$/.test(v)),'full_fingerprint');const sequence=(await read('compatible_failure_sequences',sqlCommand,compatibleFailureSequenceSql,1048576)).split(/\r?\n/).filter(Boolean);
   for(const line of sequence){const v=JSON.parse(line);check(Object.keys(v).length===4&&typeof v.schema==='string'&&typeof v.sequence==='string'&&Number.isInteger(v.lastValue)&&typeof v.isCalled==='boolean','sequence_hashes_only');}
   return{schemaDigest:out[0].slice(0,64),dataDigest:out[1].slice(0,64),sequenceDigest:bytesDigest(sequence.sort().join('\n')+'\n')};};
  const beforeFence=await fence(),fp=await fingerprint(),ingress=await actual(()=>readIngressFence({source,configuration:config,services:rows}));
  const built=rows.filter(v=>v.role!=='database'),imageProgram=`import json,subprocess,time,re\ndeadline=time.monotonic()+20\ncache={}\nrows=json.loads(${JSON.stringify(JSON.stringify(built.map(({name,imageDigest})=>({name,imageDigest}))))})\nout=[]\nfor row in rows:\n remaining=deadline-time.monotonic()\n assert remaining>0\n if row['imageDigest'] not in cache: cache[row['imageDigest']]=json.loads(subprocess.check_output(['docker','image','inspect',row['imageDigest']],stderr=subprocess.DEVNULL,timeout=min(10,remaining)))[0]\n value=cache[row['imageDigest']]\n assert value['Id']==row['imageDigest']\n env=value['Config'].get('Env') or [];labels=value['Config'].get('Labels') or {}\n revisions=[v.split('=',1)[1] for v in env if v.startswith('APP_BUILD_REVISION=')]\n assert len(revisions)==1 and re.fullmatch('[a-f0-9]{40}',revisions[0])\n assert all(v is None or re.fullmatch('[a-f0-9]{40}',v) for v in [labels.get('org.opencontainers.image.revision'),labels.get('io.roost.release.tree')])\n out.append(dict(row,buildRevision=revisions[0],revisionLabel=labels.get('org.opencontainers.image.revision'),treeLabel=labels.get('io.roost.release.tree')))\nprint(json.dumps(out))\n`;
  const imageMetadata=imageMetadataSchema.parse(JSON.parse(await read('compatible_failure_images','python3 -',imageProgram))),health=await actual(()=>probeHealth({expectedCommit:snapshot.commit}));
  check(health?.healthy===false&&hash.safeParse(health.healthDigest).success,'actual_unhealthy_probe_required');
  const after=await actual(()=>inspector.inspectLegacyBaseline(target.targetId,config.gitCommit)),runtimeReadAt=new Date(now()).toISOString(),configAfter=await actual(readConfiguration),afterFence=await fence(),fpAfter=await fingerprint(),ingressAfter=await actual(()=>readIngressFence({source,configuration:config,services:rows})),qAfter=await queue(),queueReadAt=new Date(now()).toISOString(),stateAfter=await actual(readCurrentState);
  const stableIngress=value=>{const v=structuredClone(value);delete v.observedAt;delete v.evidenceDigest;return v;};
  check(same(observed,after)&&same(config,configAfter)&&same(beforeFence,afterFence)&&same(fp,fpAfter)&&same(stableIngress(ingress),stableIngress(ingressAfter))&&same(q,qAfter)&&same(current,stateAfter)
   &&now()-started>=0&&now()-started<=300000,'changed_during_fresh_read');
  const observedAt=new Date(now()).toISOString(),inventory={schemaVersion:'roost-compatible-failure-project-inventory-v1',targetId:target.targetId,observedAt:runtimeReadAt,projectServiceSetComplete:true,services:rows,
   absentServices:missing.map(v=>({name:v.name,role:v.role,source:v.source,mountDigest:v.mountDigest,declarationDigest:contract.releaseDigest(v),containerId:null,imageDigest:null,state:'absent',absenceVerified:true})),digest:'0'.repeat(64)};
  inventory.digest=contract.compatibleFailureInventoryDigest(inventory);
  const scan={schemaVersion:'roost-compatible-failure-queue-scan-v1',targetId:target.targetId,from:iso(deployment.createdAt),through:observedAt,observedAt:queueReadAt,scanComplete:true,rows:q.rows,digest:'0'.repeat(64)};scan.digest=contract.compatibleFailureQueueScanDigest(scan);
  const currentQueue=q.rows[0]??null,kind=op.operation==='deploy_config'?'configuration_absent':op.operation==='observe'?'observation_failed':currentQueue?'deployment_failed':'deployment_absent';
  const marker={schemaVersion:'roost-compatible-recovery-negative-v1',kind,releaseId:snapshot.releaseId,operationId:op.id,operation:op.operation,since:iso(op.createdAt),requestId:op.intent.requestId,intentDigest:contract.releaseDigest(op.intent),targetId:target.targetId,
   requestedCommit:snapshot.commit,requestedTree:snapshot.candidateTree,phase,configuration:config,queueScan:scan,currentQueue,projectInventory:inventory,imageMetadata,
   database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},ingressFence:ingressAfter,evidenceDigest:'0'.repeat(64),
   ...(prior?{successfulDeployment:{operationId:prior.id,outcomeId:prior.outcome.id,evidenceDigest:contract.releaseDigest(prior.outcome.evidence),deploymentId:currentQueue?.deploymentId},observationSeconds:Math.floor((now()-Date.parse(iso(op.createdAt)))/1000)}:{})};
  marker.evidenceDigest=contract.compatibleFailureMarkerDigest(marker);
  const evidence={compatibleRecoveryFailure:marker,observedAt,configDigest:contract.releaseDigest([{targetId:target.targetId,configDigest:composeConfigurationDigest(config)}]),...fp,healthDigest:health.healthDigest,
   healthy:false,currentServiceSetDigest:contract.compatibleFailureServiceSetDigest(rows),deploymentIds:currentQueue?[{targetId:target.targetId,deploymentId:currentQueue.deploymentId}]:[]};
  return contract.qualifyCompatibleFailureResult(snapshot,evidence,op,{now:now(),readSuccessfulDeployment:ref=>{const v=current.journal.find(v=>v.id===ref.operationId);return v&&v.outcome?.id===ref.outcomeId&&ref.releaseId===snapshot.releaseId?v:null;}});
 }catch{return uncertain();}
}
