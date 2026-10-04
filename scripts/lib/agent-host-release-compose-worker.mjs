import { z } from 'zod';
import {configureComposeWithQualifiedModelCas} from './agent-host-release-compose-config.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { physicalIdentity } from './agent-host-native-footprint.mjs';
import { runReleaseNativeProcess, hasReleaseProcessScope, minimalReleaseEnvironment } from './agent-host-release-process.mjs';
import { createComposeStateInspector } from './agent-host-release-compose-inspector.mjs';
import { createComposeReleaseGateway, createFixedComposeQueueTransport } from './agent-host-release-compose-gateway.mjs';
import { composePhasePolicySchema, composePhaseArtifactFile, renderComposePhaseCommands,
  composeControllerPolicyRecord, qualifyComposePhaseArtifact } from './agent-host-release-compose-controller.mjs';
import { createCoolifyComposeAdapter } from './agent-host-release-coolify-compose.mjs';
import { composeConfigurationDigest, qualifyComposeRuntime, qualifyComposeRetainedBaseline } from './agent-host-release-compose-state.mjs';
import { permanentReleaseOwnershipSchema } from './agent-host-release-git-set-worker.mjs';
import { createComposeHealthProbe, composeHealthSettingsSchema, probeComposeIngressBlocked, observeRestoredComposeRuntime } from './agent-host-release-compose-health.mjs';
import { coolifyHttpsJson } from './agent-host-release-coolify.mjs';
import { buildReleaseFingerprintCommand, releaseFingerprintTimeoutSchema } from './agent-host-release-fingerprint.mjs';
import { coolifyGitSetDeploymentId } from './agent-host-release-coolify-git-set-gateway.mjs';
import contract from './agent-host-release-contract.cjs';
import { installedActivitySettingsSchema, createActivityReleaseAdapter } from './agent-host-release-activity-adapter.mjs';
import { createInstalledActivityTransport } from './agent-host-release-activity-installed.mjs';

const hex=z.string().regex(/^[a-f0-9]{64}$/),alias=z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);
const file=z.string().min(3).max(1000).refine(v=>path.isAbsolute(v)&&path.normalize(v)===v);
const sealedFile=z.object({file,sha256:hex}).strict(),pg=z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,62}$/);
const origin=z.string().url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';});
export const installedComposeReleaseSchema=z.object({sshHost:alias,sshAddressFamily:z.enum(['auto','ipv4','ipv6']).optional(),workspaceRoot:file,
 ownershipFile:file,baselineObservation:sealedFile,
 phases:z.object({candidate:z.object({policy:sealedFile,artifact:sealedFile}).strict(),rollback:z.object({policy:sealedFile,artifact:sealedFile}).strict()}).strict(),
 sourcePins:z.object({queueHelper:hex,deploymentJob:hex,applicationModel:hex,composeParser:hex,dockerHelper:hex,applicationsController:hex,controllerRenderer:hex}).strict(),
 source:z.object({sshHost:alias,container:hex,user:pg,database:pg}).strict(),
 fingerprintTimeoutMs:releaseFingerprintTimeoutSchema.min(30000).max(300000).optional(),
 capacity:z.object({minDiskBytes:z.number().int().positive(),minMemoryBytes:z.number().int().positive(),maxLoad1:z.number().positive().max(100)}).strict(),
 coolify:z.object({origin,certificateSha256:hex.optional()}).strict(),health:composeHealthSettingsSchema,
 activity:installedActivitySettingsSchema.optional()
}).strict().superRefine((v,c)=>{if(v.sshHost!==v.source.sshHost)c.addIssue({code:'custom',message:'installation_scope_invalid'});});
const deny=(reason,cause)=>{throw Object.assign(Error(`release_compose_installation_${reason}`,cause?{cause}:undefined),{retryable:false,releaseBlocked:true});};
const check=(v,r)=>{if(!v)deny(r);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const quote=v=>`'${v.replaceAll("'","'\\''")}'`;
const inside=(parent,child)=>{const r=path.relative(parent,child);return r===''||!r.startsWith('..')&&!path.isAbsolute(r);};
const bootstrap="require '/var/www/html/vendor/autoload.php';$app=require '/var/www/html/bootstrap/app.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();";
const queueRead=String.raw`$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();$q=App\Models\ApplicationDeploymentQueue::where('application_id',$a->id)->where('deployment_uuid',$p['deploymentId'])->first();
echo json_encode($q?['targetId'=>$a->uuid,'deploymentId'=>$q->deployment_uuid,'commit'=>$q->commit,'status'=>$q->status,'createdAt'=>$q->created_at->toISOString(),'finishedAt'=>$q->finished_at?->toISOString()]:null,JSON_THROW_ON_ERROR);`;
// Only a content-addressed file owned by this installation may be staged. It is
// never logged, and changing an existing artifact is refused before mutation.
const stagePhp=String.raw`$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();
if(!preg_match('/^roost-release-[a-f0-9-]{36}-(candidate|rollback)-[a-f0-9]{64}\.json$/',$p['name']))throw new Exception('scope');
$dir='/var/www/html/storage/app/applications/'.$a->uuid;$target=$dir.'/'.$p['name'];
if(!is_dir($dir)||is_link($dir)||is_link($target)||realpath($dir)!==$dir)throw new Exception('path');
$bytes=base64_decode($p['bytes'],true);if(!is_string($bytes)||strlen($bytes)>131072||hash('sha256',$bytes)!==$p['sha256'])throw new Exception('content');
json_decode($bytes,true,32,JSON_THROW_ON_ERROR);
if(file_exists($target)){if(hash_file('sha256',$target)!==$p['sha256'])throw new Exception('changed');}
else{$f=fopen($target,'x');if(!$f)throw new Exception('create');if(fwrite($f,$bytes)!==strlen($bytes)){fclose($f);throw new Exception('write');}fflush($f);fclose($f);chmod($target,0600);}
if(is_link($target)||hash_file('sha256',$target)!==$p['sha256'])throw new Exception('readback');echo '{"staged":true}';`;
const capacityCommand="set -eu; dockerRoot=$(docker info --format '{{.DockerRootDir}}'); disk=$(df -PB1 -- \"$dockerRoot\" | awk 'NR==2{print $4}'); memory=$(awk '/^MemAvailable:/{printf \"%.0f\",$2*1024}' /proc/meminfo); load=$(cut -d ' ' -f1 /proc/loadavg); printf '{\"diskBytes\":%s,\"memoryBytes\":%s,\"load1\":%s}' \"$disk\" \"$memory\" \"$load\"";

// The post-observation stages may deliberately resume cadence state, but may
// never replace a container, image, mount or accepted source binding.
export function qualifyActivityRuntimeEvidence(snapshot,current,evidence){
 const last=current?.journal?.at(-1),observation=current?.journal?.slice(0,-1).filter(r=>r.operation==='observe'
  &&(r.outcome?.status==='succeeded'||r.outcome?.status==='reconciled'&&r.outcome.reconciledStatus==='succeeded')).at(-1);
 check(current?.release?.id===snapshot.releaseId&&contract.postObservationOperations.includes(last?.operation)
  &&['candidate','rollback'].includes(observation?.intent?.parameters?.mode),'activity_runtime_intent_unproven');
 const rollback=observation.intent.parameters.mode==='rollback',proof=observation.outcome.evidence;
 check(!contract.composeEvidenceError(snapshot,proof,rollback)&&proof.healthy===true
  &&proof.observationSeconds>=snapshot.manifest.observation.seconds,'activity_observation_unproven');
 const prior=proof.composeTargets[0],keys=['name','role','containerId','imageDigest','mountDigest','createdAt','commit','tree','deploymentId'];
 const pins=rows=>rows.map(r=>Object.fromEntries(keys.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))).sort((a,b)=>a.name.localeCompare(b.name));
 check(evidence.binding.queue.status==='finished'&&evidence.binding.commit===proof.deployedCommit&&evidence.binding.tree===proof.deployedTree
  &&contract.releaseDigest(evidence.binding)===contract.releaseDigest(prior.binding)
  &&composeConfigurationDigest(evidence.configuration)===composeConfigurationDigest(prior.configuration)
  &&contract.releaseDigest(pins(evidence.runtime.services))===contract.releaseDigest(pins(prior.runtime.services)), 'activity_runtime_binding_changed');
 return {commit:proof.deployedCommit,tree:proof.deployedTree,services:evidence.runtime.services};
}

/** Fixed per-installation wiring. Dependency substitutions exist for source
 * tests only; no executable/module/SQL comes from settings or a model. */
export function createInstalledComposeRelease({settings,state,backup,github,coolifyCredential,activitySeed},dependencies={}){
 const cfg=installedComposeReleaseSchema.parse(settings),s=structuredClone(state?.release?.snapshot),m=contract.manifestSchema.parse(s?.manifest);
 check(contract.isComposeManifest(m)&&m.cleanup.ownedResourceIds.length===0&&typeof dependencies.readReleaseState==='function'
  &&github&&typeof github.inspect==='function'&&typeof coolifyCredential==='string'&&coolifyCredential.length>=8,'binding_invalid');
 const t=m.deployment.targets[0],snapshotDigest=contract.releaseDigest(state.release.snapshot);s.releaseId=state.release.id;
 check(Boolean(m.postObservation)===Boolean(cfg.activity),'activity_installation_binding_changed');
 if(cfg.activity)check(typeof activitySeed==='string'&&/^[a-f0-9]{64}$/.test(activitySeed)
  &&typeof dependencies.assertNativeClosed==='function','activity_native_capability_required');
 check(new URL(cfg.coolify.origin).origin===new URL(m.deployment.controllerUrl).origin,'controller_origin_changed');
 const identity=dependencies.identity??physicalIdentity,read=dependencies.readFile??readFileSync,native=dependencies.nativeProcess??runReleaseNativeProcess;
 const httpsJson=dependencies.coolifyJson??coolifyHttpsJson;
 const healthProbe=(dependencies.createHealthProbe??createComposeHealthProbe)({publicUrl:m.deployment.url,health:cfg.health});
 const rootIdentity=identity(cfg.workspaceRoot),checkoutIdentity=identity(m.repository.canonicalDir),gitIdentity=identity(path.join(m.repository.canonicalDir,'.git'));
 const rendererFile=fileURLToPath(new URL('./agent-host-release-compose-controller.mjs',import.meta.url));
 const rendererIdentity=identity(rendererFile,false);check(hash(read(rendererFile))===cfg.sourcePins.controllerRenderer,'controller_renderer_changed');
 check(inside(cfg.workspaceRoot,m.repository.canonicalDir)&&!inside(cfg.workspaceRoot,cfg.ownershipFile),'ownership_path_invalid');
 const seals=new Map();
 const bytesFor=(filename,expected)=>{
  check(!inside(cfg.workspaceRoot,filename),'private_path_invalid');const id=identity(filename,false),b=read(filename);
  check(Buffer.isBuffer(b)&&b.length>0&&b.length<=131072&&(!expected||hash(b)===expected),'private_file_unproven');
  const old=seals.get(filename);check(!old||old.id===id&&old.hash===hash(b),'private_file_changed');seals.set(filename,{id,hash:hash(b)});return b;
 };
 const ownership=permanentReleaseOwnershipSchema.parse(JSON.parse(bytesFor(cfg.ownershipFile)));
 check(ownership.applicationId===s.applicationId&&ownership.canonicalDir===m.repository.canonicalDir&&ownership.repositoryUrl===m.repository.url
  &&contract.releaseDigest(ownership.targetIds)===contract.releaseDigest([t.targetId])
  &&contract.releaseDigest(ownership.protectedResourceIds)===contract.releaseDigest(m.cleanup.protectedResourceIds),'ownership_binding_changed');
 const baseline=JSON.parse(bytesFor(cfg.baselineObservation.file,cfg.baselineObservation.sha256));
 const database=t.baseline.configuration.services.find(r=>r.role==='database');
 check(baseline.observed===true&&baseline.migrationSchemaVerified===true&&baseline.healthy===true
  &&baseline.commit===t.baseline.commit&&baseline.tree===t.baseline.tree&&baseline.configDigest===t.baseline.configDigest
  &&['schemaDigest','dataDigest','healthDigest'].every(k=>baseline[k]===m.baseline[k])
  &&contract.releaseDigest(baseline.images)===contract.releaseDigest(t.baseline.images)
  &&Array.isArray(baseline.services)&&new Set(baseline.services.map(r=>r.name)).size===baseline.services.length
  &&baseline.services.every(r=>t.baseline.configuration.services.some(d=>d.name===r.name&&d.role===r.role&&d.mountDigest===r.mountDigest
   &&r.imageDigest===(d.source==='image'?d.imageDigest:t.baseline.images.find(i=>i.name===r.name)?.imageDigest)&&/^[a-f0-9]{64}$/.test(r.containerId)))
  &&t.baseline.configuration.services.every(d=>d.role==='migration'||baseline.services.some(r=>r.name===d.name)), 'baseline_observation_unproven');
 const baselineDatabase=baseline.services.find(r=>r.name===database.name);
 check(baselineDatabase?.containerId===cfg.source.container,'database_source_binding_changed');
 const policies={},artifacts={};
 for(const mode of ['candidate','rollback']){
  const row=cfg.phases[mode];policies[mode]=composePhasePolicySchema.parse({...JSON.parse(bytesFor(row.policy.file,row.policy.sha256)),releaseId:state.release.id});
  artifacts[mode]=bytesFor(row.artifact.file,row.artifact.sha256);const p=policies[mode],expected=mode==='rollback'?t.rollbackConfiguration:t.configuration;
  check(p.phase===mode&&p.targetId===t.targetId&&p.commit===(mode==='rollback'?t.baseline.commit:s.commit)
   &&p.tree===(mode==='rollback'?t.baseline.tree:s.candidateTree)&&p.artifactDigest===row.artifact.sha256
   &&p.phaseConfigDigest===(mode==='rollback'?t.rollbackConfigDigest:t.configDigest)
   &&contract.releaseDigest(p.sourcePins)===contract.releaseDigest(cfg.sourcePins)
   &&contract.releaseDigest(composeControllerPolicyRecord(p))===contract.releaseDigest(expected.controllerPolicy),'phase_binding_changed');
 }
 const assertClone=async(manifest=m)=>{
  check(hash(read(rendererFile))===cfg.sourcePins.controllerRenderer&&identity(rendererFile,false)===rendererIdentity,'controller_renderer_changed');
  check(contract.releaseDigest(manifest)===contract.releaseDigest(m)&&identity(cfg.workspaceRoot)===rootIdentity
   &&identity(m.repository.canonicalDir)===checkoutIdentity&&identity(path.join(m.repository.canonicalDir,'.git'))===gitIdentity,'clone_changed');
  for(const[f,v]of seals)check(identity(f,false)===v.id&&hash(read(f))===v.hash,'private_file_changed');return{canonicalDir:m.repository.canonicalDir,present:true};
 };
 const ssh=async({command,stdin='',timeoutMs=25000,maxOutputBytes=32768})=>{
  await assertClone();if(!dependencies.nativeProcess)check(hasReleaseProcessScope(),'owned_process_scope_required');
  const af=cfg.sshAddressFamily==='ipv4'?['-4']:cfg.sshAddressFamily==='ipv6'?['-6']:[];
  let out;try{out=await native('ssh',{argv:[...af,'-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10',cfg.sshHost,command],
   cwd:os.tmpdir(),input:stdin,durationMs:timeoutMs,maxBytes:maxOutputBytes});}catch(e){deny('ssh_unavailable',e);}
  await assertClone();check(Buffer.byteLength(out)<=maxOutputBytes,'response_size_invalid');return out.toString('utf8');
 };
 const php=async(program,payload={})=>{
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64');let value;
  try{value=JSON.parse(await ssh({command:'docker exec -i coolify php',stdin:`<?php\nerror_reporting(0);ini_set('display_errors','0');try{$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);${bootstrap}${program}}catch(Throwable $e){echo '{"unproven":true}';exit(1);}`}));}catch(e){deny('response_unproven',e);}return value;
 };
 const git=async(args,maxBytes=131072)=>{await assertClone();return native('git',{argv:['--no-replace-objects','-c',`core.hooksPath=${process.platform==='win32'?'NUL':'/dev/null'}`,'-c','core.fsmonitor=false','-C',m.repository.canonicalDir,...args],cwd:m.repository.canonicalDir,
  environment:{...minimalReleaseEnvironment(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},durationMs:10000,maxBytes});};
 const targetDef={targetId:t.targetId,composePath:t.composePath,repositoryUrl:m.repository.url,branch:m.repository.defaultBranch,
  services:t.configuration.services.map(({name,role,source,expectedState})=>({name,role,source,expectedState}))};
 const inspector=(dependencies.createInspector??createComposeStateInspector)({targets:[targetDef],
  sourcePins:{queueHelper:cfg.sourcePins.queueHelper,deploymentJob:cfg.sourcePins.deploymentJob,controllerRenderer:cfg.sourcePins.controllerRenderer},transport:ssh,
  sourceForCommit:async(commit,composePath)=>{check(/^[a-f0-9]{40}$/.test(commit)&&composePath===t.composePath,'git_scope_invalid');return hash(await git(['show',`${commit}:${composePath.slice(1)}`]));},
  treeForCommit:async commit=>{check(/^[a-f0-9]{40}$/.test(commit),'git_scope_invalid');const out=(await git(['rev-parse',`${commit}^{tree}`],4096)).toString('utf8').trim();check(/^[a-f0-9]{40}$/.test(out),'tree_unproven');return out;},
  readDeployment:payload=>php(queueRead,payload),
  readControllerPolicy:async({controllerObserved})=>Object.values(policies).map(composeControllerPolicyRecord).find(p=>Object.entries(controllerObserved).every(([key,value])=>p[key]===value))??null,
  readImageBinding:async({queue,configuration})=>{check(queue.commit===t.baseline.commit&&configuration.controllerPolicy?.phase==='rollback'
   &&configuration.controllerPolicy.artifactDigest===policies.rollback.artifactDigest,'baseline_adoption_changed');
   return{kind:'sealed_baseline_adoption',commit:t.baseline.commit,tree:t.baseline.tree,artifactDigest:policies.rollback.artifactDigest,
    rendererDigest:cfg.sourcePins.controllerRenderer,images:t.baseline.images};}
 });
 const observeConfig=async()=>{
  const app=await httpsJson({url:`${new URL(cfg.coolify.origin).origin}/api/v1/applications/${t.targetId}`,method:'GET',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256});
  check(app?.uuid===t.targetId&&[s.commit,t.baseline.commit].includes(app.git_commit_sha),'live_source_pin_changed');
  return inspector.inspectConfiguration(t.targetId,app.git_commit_sha);
 };
 const databaseObservation=async()=>{
  const configuration=await observeConfig(),digest=composeConfigurationDigest(configuration);
  const phase=digest===t.baseline.configDigest?'baseline':digest===t.configDigest?'candidate':digest===t.rollbackConfigDigest?'rollback':null;
  check(phase,'database_configuration_changed');
  const observed=await inspector.inspectLegacyBaseline(t.targetId,configuration.gitCommit);
  check(composeConfigurationDigest(observed.configuration)===digest,'database_configuration_changed');
  const rows=observed.services.filter(r=>r.role==='database'),row=rows[0];
  check(rows.length===1&&row.name===database.name&&row.imageDigest===database.imageDigest&&row.mountDigest===database.mountDigest
   &&/^[a-f0-9]{64}$/.test(row.containerId)&&row.state==='running'&&row.health==='healthy','database_runtime_changed');
  if(row.containerId!==baselineDatabase.containerId){
   const context=live.get(t.targetId);check(phase!=='baseline'&&context?.rollback===(phase==='rollback'),'database_recreation_unproven');
   const q=await raw.readQueue(context);check(q?.status==='finished'&&q.commit===configuration.gitCommit,'database_recreation_unproven');
   const e=await inspector.readEvidence(q);
   const current=cfg.activity?await dependencies.readReleaseState():null;
   if(current?.journal?.at(-1)?.operation==='runtime_resume')qualifyActivityRuntimeEvidence(s,current,e);
   else qualifyComposeRuntime({expected:{configuration,configDigest:digest},...e});
   check(e.runtime.services.filter(r=>r.role==='database').length===1
    &&e.runtime.services.some(r=>r.role==='database'&&r.name===row.name&&r.containerId===row.containerId
      &&r.imageDigest===row.imageDigest&&r.mountDigest===row.mountDigest),'database_recreation_unproven');
  }
  return {row,observed,configDigest:digest};
 };
 const withDatabase=async action=>{
  const before=await databaseObservation(),result=await action({...cfg.source,container:before.row.containerId},before);
  const after=await databaseObservation();
  check(before.configDigest===after.configDigest&&contract.releaseDigest(before.row)===contract.releaseDigest(after.row),'database_changed_during_measurement');
  return result;
 };
 const readFingerprint=async source=>{const output=(await ssh({command:'bash -s',stdin:buildReleaseFingerprintCommand(source,cfg.fingerprintTimeoutMs??60000)+'\n',timeoutMs:cfg.fingerprintTimeoutMs??60000})).trim().split(/\r?\n/);
  check(output.length===2&&output.every(r=>/^[a-f0-9]{64}\s+-\s*$/.test(r)),'fingerprint_unproven');return{schemaDigest:output[0].slice(0,64),dataDigest:output[1].slice(0,64)};};
 const fingerprint=()=>withDatabase(readFingerprint);
 const safety=()=>withDatabase(async(source,{observed})=>{
  check(t.configuration.services.filter(r=>r.role==='cadence').every(r=>observed.services.some(x=>x.name===r.name&&x.role==='cadence'
   &&['paused','created','exited'].includes(x.state)&&x.exitCode===0&&x.health===null)),'cadence_activity_present');
  const sql=`BEGIN READ ONLY; SELECT json_build_object('readOnlyFence',EXISTS(SELECT 1 FROM pg_db_role_setting s JOIN pg_database d ON d.oid=s.setdatabase JOIN pg_roles r ON r.oid=s.setrole WHERE d.datname=current_database() AND r.rolname=current_user AND 'default_transaction_read_only=on'=ANY(s.setconfig)), 'activeOtherSessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active'))::text; COMMIT;`;
  let row;try{row=JSON.parse(await ssh({command:`docker exec -i ${quote(source.container)} psql -X -qAt -v ON_ERROR_STOP=1 -U ${quote(source.user)} -d ${quote(source.database)}`,stdin:sql}));}catch(e){deny('maintenance_unproven',e);}
  check(row?.readOnlyFence===true&&row.activeOtherSessions===0,'maintenance_unproven');return{quiescent:true,...await readFingerprint(source)};
 });
 const pins={queueHelper:cfg.sourcePins.queueHelper,deploymentJob:cfg.sourcePins.deploymentJob,applicationModel:cfg.sourcePins.applicationModel,composeParser:cfg.sourcePins.composeParser};
 const transport=createFixedComposeQueueTransport({sshBinary:process.platform==='win32'?'C:\\Windows\\System32\\OpenSSH\\ssh.exe':'/usr/bin/ssh',sshHost:cfg.sshHost,
  runOwned:async d=>({exitCode:0,stdout:await ssh({command:d.args.at(-1),stdin:d.stdin,timeoutMs:d.timeoutMs,maxOutputBytes:d.maxOutputBytes})})});
 const checkIntent=async(options,configuration=false,reconciliation=false)=>{
  const current=await dependencies.readReleaseState(),last=current?.journal?.at(-1);
  check(current?.release?.id===s.releaseId&&['active','reconciliation_required'].includes(current.status)
   &&contract.releaseDigest(current.release.snapshot)===snapshotDigest
   &&Array.isArray(current.journal)&&current.journal.slice(0,-1).every(r=>['succeeded','failed'].includes(r.outcome?.status)
    ||r.outcome?.status==='reconciled'&&['succeeded','failed','absent'].includes(r.outcome.reconciledStatus))
   &&last?.operation===(configuration?options.rollback?'rollback_config':'deploy_config':options.rollback?'rollback':'deploy')
   &&/^[a-f0-9-]{36}$/.test(last.id)&&Number.isFinite(Date.parse(last.createdAt))&&(!last.outcome||configuration&&reconciliation&&last.outcome.status==='uncertain')
   &&(configuration?last.intent?.parameters?.commit===(options.rollback?t.baseline.commit:s.commit)
     &&last.intent.parameters.configDigest===(options.rollback?m.rollback.configDigest:m.deployment.configDigest)
     &&last.intent.parameters.artifactSetDigest===(options.rollback?m.rollback.artifactSetDigest:m.deployment.artifactSetDigest)
     &&last.intent.parameters.schemaDigest===m.deployment.schemaDigest
    :last.id===options.operationId&&last.createdAt===options.since&&last.intent?.parameters?.targetId===t.targetId),'phase_intent_unproven');
  return last;
 };
 const preparePhase=async(mode,options)=>{
  await checkIntent({...options,rollback:mode==='rollback'});const p=policies[mode],configuration=await observeConfig();
  check(composeConfigurationDigest(configuration)===p.phaseConfigDigest,'phase_configuration_changed');
  const observed=await inspector.inspectLegacyBaseline(t.targetId,configuration.gitCommit);
  const refs=[...new Set(p.services.flatMap(r=>[r.imageDigest,...(r.source==='image'?[r.imageRef]:[])]))];
  const identities=[];for(const ref of refs){const imageDigest=(await ssh({command:`docker image inspect --format '{{.Id}}' -- ${quote(ref)}`})).trim();identities.push({imageRef:ref,imageDigest});}
  const actual=[];for(const row of observed.services){check(/^[a-f0-9]{64}$/.test(row.containerId),'service_identity_unproven');
   const mounts=JSON.parse(await ssh({command:`docker container inspect --format '{{json .Mounts}}' -- ${quote(row.containerId)}`}));
   actual.push({name:row.name,imageDigest:row.imageDigest,mounts});}
  return qualifyComposePhaseArtifact({policy:p,artifactBytes:artifacts[mode],configurationDigest:composeConfigurationDigest(configuration),sourcePins:cfg.sourcePins,
   services:actual,imageIdentities:identities,rendererDigest:cfg.sourcePins.controllerRenderer,
   settingsInvariantDigest:observed.controllerObserved.settingsInvariantDigest,runtimeInvariantDigest:observed.controllerObserved.runtimeInvariantDigest});
 };
 const configurePhase=async({mode,commit})=>{
  const intent=await checkIntent({rollback:mode==='rollback'},true);
  await assertClone();const before=await observeConfig(),prior=composeConfigurationDigest(before);
  check(mode==='candidate'?[t.baseline.configDigest,t.configDigest].includes(prior):[t.configDigest,t.rollbackConfigDigest].includes(prior),'configuration_preimage_changed');
  if(mode==='candidate')check((await github.inspect(m,{allowArchived:false})).remoteBase===s.commit,'remote_commit_changed');
  check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');
  const p=policies[mode];check((await php(stagePhp,{targetId:t.targetId,name:composePhaseArtifactFile(p),bytes:artifacts[mode].toString('base64'),sha256:p.artifactDigest})).staged===true,'artifact_stage_unproven');
  check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');
  check(p.commit===commit,'phase_binding_changed');
  const url=`${new URL(cfg.coolify.origin).origin}/api/v1/applications/${t.targetId}`;
  await configureComposeWithQualifiedModelCas({policy:p,scope:{targetId:t.targetId,repositoryPath:new URL(m.repository.url).pathname.slice(1).replace(/\.git$/,''),branch:m.repository.defaultBranch},
   readApplication:()=>httpsJson({url,method:'GET',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256}),
   patchApplication:body=>httpsJson({url,method:'PATCH',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256,body}),php,
   beforeEffect:async()=>{await assertClone();check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');check(composeConfigurationDigest(await observeConfig())===prior,'configuration_preimage_changed');}});
 };
 const raw=createComposeReleaseGateway({releaseId:state.release.id,expected:{configuration:t.configuration,configDigest:t.configDigest},
  rollbackExpected:{configuration:t.rollbackConfiguration,configDigest:t.rollbackConfigDigest},candidatePolicy:policies.candidate,rollbackPolicy:policies.rollback,
  binding:{commit:s.commit,tree:s.candidateTree,baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree},sourcePins:pins,
  repositoryPath:new URL(m.repository.url).pathname.slice(1).replace(/\.git$/,''),transport,readConfiguration:observeConfig,
  readRuntime:inspector.readRuntime,readBuildImages:inspector.readBuildImages,assertSafety:safety,inspectRemote:async()=>({mainCommit:(await github.inspect(m,{allowArchived:false})).remoteBase}),
  prepareCandidatePhase:o=>preparePhase('candidate',o),prepareRollbackPhase:o=>preparePhase('rollback',o),
  configureTarget:configurePhase
 });
 const live=new Map();for(const row of state.journal??[])if(['deploy','rollback'].includes(row.operation))live.set(t.targetId,{operationId:row.id,since:row.createdAt,rollback:row.operation==='rollback',targetId:t.targetId});
 const services=async(_manifest,options={})=>{
  const expectedCommit=options.baseline?t.baseline.commit:options.rollback?t.baseline.commit:s.commit;
  const result=await healthProbe({expectedCommit});
  check(typeof result?.healthy==='boolean'&&typeof result.versionVerified==='boolean'&&hex.safeParse(result.healthDigest).success
   &&Array.isArray(result.observations)&&result.observations.length===2&&new Set(result.observations.map(r=>r.surface)).size===2
   &&['backend','frontend'].every(surface=>result.observations.some(r=>r.surface===surface&&typeof r.healthy==='boolean'&&typeof r.versionVerified==='boolean'))
   &&result.versionVerified===result.observations.every(r=>r.versionVerified===true)
   &&result.healthy===result.observations.every(r=>r.healthy===true)&&(!result.healthy||result.versionVerified),'version_health_unproven');
  return{healthy:result.healthy&&result.versionVerified,healthDigest:result.healthDigest,dataDigest:(await fingerprint()).dataDigest};
 };
 const recoveryObservation=async(options)=>{
  await assertClone();const current=await dependencies.readReleaseState(),operation=current?.journal?.find(r=>r.id===options.operationId);
  check(current?.release?.id===s.releaseId&&contract.releaseDigest(current.release.snapshot)===snapshotDigest
   &&operation?.operation===(options.rollback?'rollback':'deploy')&&operation.createdAt===options.since
   &&operation.intent?.parameters?.targetId===t.targetId,'recovery_operation_unproven');
  const quiescent=async()=>{const q=await php("echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()]);");
   check(q.activeDeployments===0,'recovery_control_plane_active');};
  const normalize=rows=>rows.map(row=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]]))).sort((a,b)=>a.name.localeCompare(b.name));
  await quiescent();const queue=await raw.readQueue(options),configuration=await observeConfig();
  check(queue===null||['failed','cancelled-by-user'].includes(queue.status),'recovery_queue_not_terminal');
  const expected=options.rollback?t.rollbackConfigDigest:t.configDigest;
  check(composeConfigurationDigest(configuration)===expected,'recovery_configuration_changed');
  const before=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit),services=normalize(before.services),baselineServices=normalize(baseline.services);
  check(composeConfigurationDigest(before.configuration)===expected,'recovery_configuration_changed');
  const proof=qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,services,baselineServices});
  const safe=await safety(),health=await servicesProbeBaseline();
  check(safe.schemaDigest===m.baseline.schemaDigest&&safe.dataDigest===m.baseline.dataDigest
   &&health.healthy===true&&health.healthDigest===m.baseline.healthDigest&&health.dataDigest===m.baseline.dataDigest,'recovery_baseline_health_changed');
  const after=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit);await quiescent();
  check(contract.releaseDigest(services)===contract.releaseDigest(normalize(after.services))
   &&composeConfigurationDigest(after.configuration)===expected&&contract.releaseDigest(queue)===contract.releaseDigest(await raw.readQueue(options)), 'recovery_changed_during_inspection');
  const composeRecovery={schemaVersion:'roost-compose-recovery-observation-v1',kind:queue===null?'queue_absent':'queue_failed',
   releaseId:s.releaseId,operationId:options.operationId,since:options.since,targetId:t.targetId,phase:options.rollback?'rollback':'candidate',
   requestedCommit:options.rollback?t.baseline.commit:s.commit,requestedTree:options.rollback?t.baseline.tree:s.candidateTree,
   deploymentId:coolifyGitSetDeploymentId({releaseId:s.releaseId,operationId:options.operationId,targetId:t.targetId,rollback:options.rollback===true}),
   queue,controlPlaneQuiescent:true,configuration,baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree,migrationSchemaVerified:true,baselineServices,services};
  const evidence={composeRecovery,deploymentIds:queue===null?[]:[{targetId:t.targetId,deploymentId:composeRecovery.deploymentId}],deployedCommit:t.baseline.commit,deployedTree:t.baseline.tree,artifactSetDigest:m.baseline.artifactSetDigest,
   configDigest:options.rollback?m.rollback.configDigest:m.deployment.configDigest,schemaDigest:safe.schemaDigest,dataDigest:safe.dataDigest,
   healthDigest:health.healthDigest,healthy:true,observedAt:new Date((dependencies.now??Date.now)()).toISOString(),
   deployedSetDigest:contract.releaseDigest([{targetId:t.targetId,runtimeSetDigest:proof.runtimeSetDigest}]),...(queue===null?{absenceVerified:true}:{})};
  check(contract.composeRecoveryEvidenceError(s,evidence,operation)===null,'recovery_observation_unproven');return evidence;
 };
 const servicesProbeBaseline=()=>services(m,{baseline:true});
 const configurationAbsenceObservation=async options=>{
  await assertClone();check(options.rollback!==true,'configuration_absence_candidate_only');
  const operation=await checkIntent(options,true,true);
  check(operation.id===options.operationId&&operation.createdAt===options.since,'configuration_absence_operation_changed');
  const quiescent=async()=>{const q=await php(String.raw`$a=App\Models\Application::where('uuid',$p['targetId'])->firstOrFail();$since=Carbon\Carbon::parse($p['since']);echo json_encode(['activeDeployments'=>App\Models\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count(),'targetDeploymentsSinceIntent'=>App\Models\ApplicationDeploymentQueue::where('application_id',$a->id)->where(function($q)use($since){$q->where('created_at','>=',$since)->orWhere('updated_at','>=',$since)->orWhere('finished_at','>=',$since);})->count()],JSON_THROW_ON_ERROR);`,{targetId:t.targetId,since:options.since});
   check(q.activeDeployments===0&&q.targetDeploymentsSinceIntent===0,'configuration_absence_control_plane_unproven');};
  const normalize=rows=>rows.map(row=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]]))).sort((a,b)=>a.name.localeCompare(b.name));
  await quiescent();const configuration=await observeConfig();
  check(composeConfigurationDigest(configuration)===t.baseline.configDigest,'configuration_absence_preimage_changed');
  const before=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit),baselineServices=normalize(baseline.services),services=normalize(before.services);
  check(baseline.observed===true&&baseline.migrationSchemaVerified===true&&composeConfigurationDigest(before.configuration)===t.baseline.configDigest,'configuration_absence_baseline_unproven');
  const proof=qualifyComposeRetainedBaseline({configuration:t.baseline.configuration,images:t.baseline.images,services,baselineServices});
  const safe=await safety(),health=await servicesProbeBaseline();
  check(safe.schemaDigest===m.baseline.schemaDigest&&safe.dataDigest===m.baseline.dataDigest&&health.healthy===true&&health.healthDigest===m.baseline.healthDigest&&health.dataDigest===m.baseline.dataDigest,'configuration_absence_data_or_health_changed');
  const after=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit),safeAfter=await safety(),healthAfter=await servicesProbeBaseline();await quiescent();
  check(contract.releaseDigest(services)===contract.releaseDigest(normalize(after.services))&&composeConfigurationDigest(after.configuration)===t.baseline.configDigest
   &&safeAfter.schemaDigest===safe.schemaDigest&&safeAfter.dataDigest===safe.dataDigest&&healthAfter.healthy===true&&healthAfter.healthDigest===health.healthDigest&&healthAfter.dataDigest===health.dataDigest,'configuration_absence_changed_during_inspection');
  const last=await checkIntent(options,true,true);check(last.id===operation.id&&last.createdAt===operation.createdAt,'configuration_absence_operation_changed');await assertClone();
  const evidence={composeConfigAbsence:{schemaVersion:'roost-compose-config-absence-v1',releaseId:s.releaseId,operationId:operation.id,since:operation.createdAt,targetId:t.targetId,
   requestedCommit:s.commit,requestedTree:s.candidateTree,configuration,baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree,migrationSchemaVerified:true,controlPlaneQuiescent:true,noCandidateQueue:true,baselineServices,services},
   deployedCommit:t.baseline.commit,deployedTree:t.baseline.tree,artifactSetDigest:m.baseline.artifactSetDigest,configDigest:m.baseline.configDigest,schemaDigest:safe.schemaDigest,dataDigest:safe.dataDigest,
   healthDigest:health.healthDigest,healthy:true,observedAt:new Date((dependencies.now??Date.now)()).toISOString(),absenceVerified:true,deploymentIds:[],deployedSetDigest:contract.releaseDigest([{targetId:t.targetId,runtimeSetDigest:proof.runtimeSetDigest}])};
  check(contract.composeConfigAbsenceEvidenceError(s,evidence,operation)===null,'configuration_absence_observation_unproven');return evidence;
 };
 const adapter=createCoolifyComposeAdapter({now:dependencies.now,sleep:dependencies.sleep,gateway:{
  inspectConfiguration:observeConfig,
  inspectBaseline:async()=>{await assertClone();check(baseline.observed===true&&baseline.migrationSchemaVerified===true,'baseline_observation_unproven');const o=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit);
   check(composeConfigurationDigest(o.configuration)===t.baseline.configDigest&&o.services.length===baseline.services.length
    &&o.services.every(r=>baseline.services.some(b=>b.name===r.name&&b.role===r.role&&b.imageDigest===r.imageDigest&&b.mountDigest===r.mountDigest
      &&(r.role!=='database'||r.containerId===b.containerId))),'baseline_runtime_changed');
   const f=await fingerprint(),h=await services(m,{baseline:true});return{...baseline,...f,healthDigest:h.healthDigest,healthy:h.healthy};},
  inspectRuntime:async()=>{const context=live.get(t.targetId);check(context,'current_queue_required');const q=await raw.readQueue(context);check(q?.status==='finished'&&q.commit!=='HEAD','finished_queue_required');const e=await inspector.readEvidence(q);
   return{targetId:t.targetId,...e,healthy:e.runtime.services.every(r=>['app','database'].includes(r.role)?r.health==='healthy':r.role==='migration'?r.state==='exited'&&r.exitCode===0:['paused','created','exited'].includes(r.state))};},
  readQueue:async o=>{live.set(t.targetId,o);return raw.readQueue(o);},inspectRecovery:recoveryObservation,inspectConfigurationAbsence:configurationAbsenceObservation,
  configure:(_id,mode)=>configurePhase({mode,commit:mode==='rollback'?t.baseline.commit:s.commit}),
  deployTarget:async o=>{live.set(t.targetId,o);return raw.deploy(o);},safety,checkServices:services,
  inspectBackup:async()=>{check(['digest','bytes','capturedAt','restoreVerifiedAt','restoreDigest'].every(k=>backup?.[k]===m.backup[k]),'backup_changed');return backup;}
 }});
 const resources={assertClone,async inspectCapacity(){const c=JSON.parse(await ssh({command:capacityCommand})),q=await php("echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()]);");
  check(Number.isSafeInteger(c.diskBytes)&&c.diskBytes>=cfg.capacity.minDiskBytes&&Number.isSafeInteger(c.memoryBytes)&&c.memoryBytes>=cfg.capacity.minMemoryBytes
   &&Number.isFinite(c.load1)&&c.load1<=cfg.capacity.maxLoad1&&q.activeDeployments===0,'capacity_unproven');return{available:true,...c,activeDeployments:0};},
  async verifyRetention(){await assertClone();await observeConfig();check(m.cleanup.ownedResourceIds.length===0,'disposable_resources_unsupported');return{applicationActive:true,targetId:t.targetId,
   protectedResourcesDigest:contract.releaseDigest(ownership.protectedResourceIds),absenceVerified:true,resourceIds:[]};},
  ownedResource(){deny('disposable_resources_unsupported');},cleanupLocal(){deny('permanent_repository_deletion_prohibited');},cleanupCoolifyApplication(){deny('permanent_application_deletion_prohibited');}};
 if(cfg.activity){
  const facade=createInstalledActivityTransport({manifest:m,binding:s,settings:cfg.activity,seed:activitySeed,
   installation:{sshHost:cfg.sshHost,frontendMetaName:cfg.health.frontendMetaName},baselineServices:baseline.services,
   readScopeBytes:async({file,sha256,maxBytes})=>{check(maxBytes===131072,'activity_file_bound_invalid');return bytesFor(file,sha256);},
   readRuntime:async options=>{
    await assertClone();const current=await dependencies.readReleaseState(),context=live.get(t.targetId);check(context,'activity_current_queue_required');
    const q=await raw.readQueue(context);check(q?.status==='finished'&&q.commit!=='HEAD','activity_finished_queue_required');
    const e=await inspector.readEvidence(q),r=qualifyActivityRuntimeEvidence(s,current,e);
    check(r.commit===options.commit&&r.tree===options.tree&&current.journal.at(-1).id===options.operationId,'activity_runtime_version_changed');
    return {observedAt:new Date().toISOString(),targetId:t.targetId,...r};
   },fullFingerprint:fingerprint,readReleaseState:dependencies.readReleaseState,ssh,nativeProcess:native,assertNativeClosed:dependencies.assertNativeClosed,
   probeIngressBlocked:()=>probeComposeIngressBlocked({publicUrl:m.deployment.url,health:cfg.health}),
   healthProbe:input=>observeRestoredComposeRuntime(input,{probeHealth:healthProbe,
    readCadenceTicks:options=>facade.readCadenceTicks(options),now:dependencies.now,sleep:dependencies.sleep})
  });
  Object.assign(resources,createActivityReleaseAdapter({manifest:m,binding:s,settings:cfg.activity,seed:activitySeed,
   readState:dependencies.readReleaseState,transport:facade.transport}));
 }
 return Object.freeze({coolify:adapter,resources:Object.freeze(resources),assertClone,safety});
}
