import { z } from 'zod';
import {configureComposeWithQualifiedModelCas} from './agent-host-release-compose-config.mjs';
import {composeConfigurationSchemaReadPhp,qualifyComposeConfigurationSchema} from './agent-host-release-compose-config-schema.mjs';
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { physicalIdentity } from './agent-host-native-footprint.mjs';
import { runReleaseNativeProcess, hasReleaseProcessScope, minimalReleaseEnvironment } from './agent-host-release-process.mjs';
import { createComposeStateInspector } from './agent-host-release-compose-inspector.mjs';
import { createComposeReleaseGateway, createFixedComposeQueueTransport } from './agent-host-release-compose-gateway.mjs';
import { composePhasePolicySchema, composePhaseArtifactFile, composePhaseChecksumBytes, renderComposePhaseCommands,
  composeControllerPolicyRecord, qualifyComposePhaseArtifact, composeReplacementImagesDigest, composePhasePolicyDigest,
  composeImmutableCandidateInventoryDigest, composeImmutableCandidateEntryDigest } from './agent-host-release-compose-controller.mjs';
import { createCoolifyComposeAdapter } from './agent-host-release-coolify-compose.mjs';
import { composeConfigurationDigest, composeRuntimeSetDigest, qualifyComposeRuntime, qualifyComposeRetainedBaseline } from './agent-host-release-compose-state.mjs';
import { permanentReleaseOwnershipSchema } from './agent-host-release-git-set-worker.mjs';
import { createComposeHealthProbe, composeHealthSettingsSchema, probeComposeIngressBlocked, observeRestoredComposeRuntime } from './agent-host-release-compose-health.mjs';
import { coolifyHttpsJson } from './agent-host-release-coolify.mjs';
import { buildReleaseFingerprintCommand, releaseFingerprintTimeoutSchema } from './agent-host-release-fingerprint.mjs';
import { coolifyGitSetDeploymentId } from './agent-host-release-coolify-git-set-gateway.mjs';
import contract from './agent-host-release-contract.cjs';
import { installedActivitySettingsSchema, createActivityReleaseAdapter } from './agent-host-release-activity-adapter.mjs';
import { createInstalledActivityTransport, activityCompatibleIngressInstallationSchema, qualifyCandidateIngressScope, activityRestorationDigests } from './agent-host-release-activity-installed.mjs';
import { imageRetentionPolicySchema, retainedImageAnchor, qualifyRetentionImage, qualifyRetentionAnchor } from './agent-host-image-retention.mjs';
import ingressFenceContract from './agent-host-release-compose-ingress-fence.cjs';
import {readCompatibleRecoveryFailure as readFixedCompatibleFailure} from './agent-host-release-compose-failure-inspector.mjs';

const hex=z.string().regex(/^[a-f0-9]{64}$/),alias=z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);
const file=z.string().min(3).max(1000).refine(v=>path.isAbsolute(v)&&path.normalize(v)===v);
const sealedFile=z.object({file,sha256:hex}).strict(),pg=z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,62}$/);
const origin=z.string().url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/';});
export const installedComposeReleaseSchema=z.object({sshHost:alias,sshAddressFamily:z.enum(['auto','ipv4','ipv6']).optional(),workspaceRoot:file,
 ownershipFile:file,baselineObservation:sealedFile,
 phases:z.object({candidate:z.object({policy:sealedFile,artifact:sealedFile}).strict(),rollback:z.object({policy:sealedFile,artifact:sealedFile}).strict()}).strict(),
 recoveryEntryTemplate:sealedFile.optional(),
 recoveryPreviousManifest:sealedFile.optional(),
 recoveryMaterializationTemplate:sealedFile.optional(),
 compatibleRecovery:z.object({previousManifest:sealedFile,entryTemplate:sealedFile,materializationTemplate:sealedFile}).strict().optional(),
 compatibleIngress:activityCompatibleIngressInstallationSchema.optional(),
 sourcePins:z.object({queueHelper:hex,deploymentJob:hex,applicationModel:hex,composeParser:hex,dockerHelper:hex,applicationsController:hex,controllerRenderer:hex}).strict(),
 source:z.object({sshHost:alias,container:hex,user:pg,database:pg}).strict(),
 fingerprintTimeoutMs:releaseFingerprintTimeoutSchema.min(30000).max(300000).optional(),
 capacity:z.object({minDiskBytes:z.number().int().positive(),minMemoryBytes:z.number().int().positive(),maxLoad1:z.number().positive().max(100)}).strict(),
 coolify:z.object({origin,certificateSha256:hex.optional()}).strict(),health:composeHealthSettingsSchema,
 activity:installedActivitySettingsSchema.optional(),
 imageRetention:z.object({policy:sealedFile}).strict().optional()
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
if(!preg_match('/^roost-release-[a-f0-9-]{36}-(candidate|rollback)-[a-f0-9]{64}\.json(?:\.sha256)?$/',$p['name']))throw new Exception('scope');
$dir='/var/www/html/storage/app/applications/'.$a->uuid;$target=$dir.'/'.$p['name'];
if(!is_dir($dir)||is_link($dir)||is_link($target)||realpath($dir)!==$dir)throw new Exception('path');
$bytes=base64_decode($p['bytes'],true);if(!is_string($bytes)||strlen($bytes)>131072||hash('sha256',$bytes)!==$p['sha256'])throw new Exception('content');
if(str_ends_with($p['name'],'.sha256')){$artifact=substr($p['name'],0,-7);if(!preg_match('/-([a-f0-9]{64})\.json$/',$artifact,$parts)||$bytes!==$parts[1].'  /artifacts/'.$artifact."\n")throw new Exception('checksum');}
else json_decode($bytes,true,32,JSON_THROW_ON_ERROR);
if(file_exists($target)){if(hash_file('sha256',$target)!==$p['sha256'])throw new Exception('changed');}
else{$f=fopen($target,'x');if(!$f)throw new Exception('create');if(fwrite($f,$bytes)!==strlen($bytes)){fclose($f);throw new Exception('write');}fflush($f);fclose($f);chmod($target,0600);}
if(is_link($target)||hash_file('sha256',$target)!==$p['sha256'])throw new Exception('readback');echo '{"staged":true}';`;
const capacityCommand="set -eu; dockerRoot=$(docker info --format '{{.DockerRootDir}}'); disk=$(df -PB1 -- \"$dockerRoot\" | awk 'NR==2{print $4}'); memory=$(awk '/^MemAvailable:/{printf \"%.0f\",$2*1024}' /proc/meminfo); load=$(cut -d ' ' -f1 /proc/loadavg); printf '{\"diskBytes\":%s,\"memoryBytes\":%s,\"load1\":%s}' \"$disk\" \"$memory\" \"$load\"";

/** Exact installation opt-in; legacy snapshots retain their original wire.
 * Retention never proves a healthy runtime or a compatible image build. */
export function qualifyComposeImageRetentionPolicy(value,snapshot){
 const policy=imageRetentionPolicySchema.parse(value),m=contract.manifestSchema.parse(snapshot.manifest),t=m.deployment.targets[0];
 check(contract.isComposeManifest(m)&&m.purpose==='application_release'&&policy.scopeDigest===contract.releaseDigest(m),'retention_scope_changed');
 const built=t.baseline.configuration.services.filter(r=>r.source==='built'),database=t.baseline.configuration.services.filter(r=>r.role==='database');
 check(database.length===1&&built.every(r=>['app','migration','cadence'].includes(r.role)),'retention_service_scope_invalid');
 const replacement=snapshot.compatibleArtifactRecovery?.replacement;
 if(replacement)qualifyCompatibleRecoveryBuildSnapshot(snapshot);
 const images=built.map(r=>{const rows=(replacement?.images??t.baseline.images).filter(i=>i.name===r.name);check(rows.length===1,'retention_baseline_image_unproven');return rows[0].imageDigest;});
 const exact=[...new Set(images)].sort();check(contract.releaseDigest([...policy.images].sort())===contract.releaseDigest(exact)
  &&!policy.images.includes(database[0].imageDigest)&&policy.images.every(i=>m.cleanup.protectedResourceIds.includes(i)),'retention_images_changed');
 return{...policy,images:exact};
}
export function composeImageRetentionJournalFile(policyFile,policy,releaseId){
 const parsed=imageRetentionPolicySchema.parse(policy);check(path.isAbsolute(policyFile)&&path.normalize(policyFile)===policyFile&&z.string().uuid().safeParse(releaseId).success,'retention_policy_path_invalid');
 const target=path.join(path.dirname(policyFile),`image-retention-journal-${parsed.scopeDigest}-${releaseId}.json`);
 check(target!==policyFile,'retention_journal_policy_collision');return target;
}
const retentionEnvironment=observed=>{const env=observed?.Config?.Env??[];check(Array.isArray(env)&&env.length<=200&&env.every(v=>typeof v==='string'&&v.length<=8192),'retention_environment_unproven');
 check(env.every(v=>{const at=v.indexOf('=');return at>0&&(!/(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|SIGNING_KEY|ENCRYPTION_KEY|CREDENTIAL|SESSION_KEY|DATABASE_URL)/i.test(v.slice(0,at))||v.slice(at+1)==='');}),'retention_sensitive_image_environment_forbidden');return env;};
export function qualifyComposeRetentionObservation(image,anchor,plan){
 const i=qualifyRetentionImage(image,plan),a=qualifyRetentionAnchor(anchor,plan),env=retentionEnvironment(image);
 check(contract.releaseDigest(retentionEnvironment(anchor))===contract.releaseDigest(env),'retention_application_environment_added');
 return{...a,environmentFromImageOnly:true,environmentDigest:contract.releaseDigest(env),imageMetadataDigest:contract.releaseDigest(i)};
}
/** Fixed native transports and journal IO are supplied only by installed code.
 * An uncertain create is queried by its deterministic name, never repeated. */
export function createComposeImageRetention({policy,snapshot,ssh,readJournal,writeJournal,assertEffect,now=()=>Date.now()}){
 const p=qualifyComposeImageRetentionPolicy(policy,snapshot),m=snapshot.manifest,t=m.deployment.targets[0];
 check([ssh,readJournal,writeJournal,assertEffect].every(f=>typeof f==='function'),'retention_fixed_callbacks_required');
 const binding={installationId:p.installationId,scopeDigest:p.scopeDigest,manifestDigest:contract.releaseDigest(m),releaseId:snapshot.releaseId,
  applicationId:snapshot.applicationId,targetId:t.targetId,policyDigest:contract.releaseDigest(p)};
 const load=async()=>{const j=await readJournal();if(j===null)return{schemaVersion:'roost-compose-image-retention-journal-v1',binding,anchors:{},pending:null};
  check(j?.schemaVersion==='roost-compose-image-retention-journal-v1'&&contract.releaseDigest(j.binding)===contract.releaseDigest(binding)
   &&j.anchors&&typeof j.anchors==='object'&&!Array.isArray(j.anchors)&&(!j.pending||/^sha256:[a-f0-9]{64}$/.test(j.pending.image)),'retention_journal_scope_changed');return structuredClone(j);};
 const imageRead=async image=>{let v;try{v=JSON.parse(await ssh({command:`docker image inspect --format '{{json .}}' -- ${quote(image)}`,maxOutputBytes:65536}));}catch(e){deny('retention_image_missing',e);}return v;};
 const anchorRead=async plan=>{const ids=(await ssh({command:`docker container ls --all --no-trunc --filter ${quote('name=^/'+plan.name+'$')} --format '{{.ID}}'`,maxOutputBytes:1024})).trim().split(/\r?\n/).filter(Boolean);
  check(ids.length<=1&&ids.every(i=>/^[a-f0-9]{64}$/.test(i)),'retention_anchor_identity_unproven');if(!ids.length)return null;
  return JSON.parse(await ssh({command:`docker container inspect --format '{{json .}}' -- ${quote(ids[0])}`,maxOutputBytes:65536}));};
 const desired=additional=>{check(Array.isArray(additional)&&additional.every(i=>/^sha256:[a-f0-9]{64}$/.test(i)),'retention_extra_images_invalid');
  const database=t.baseline.configuration.services.find(r=>r.role==='database');check(!additional.includes(database.imageDigest),'retention_database_anchor_forbidden');
  return imageRetentionPolicySchema.parse({...p,images:[...new Set([...p.images,...additional])].sort()});};
 const observe=async({additionalImages=[],effect=null}={})=>{const effective=desired(additionalImages),j=await load(),proofs=[];let created=0;
  for(const image of effective.images){const plan=retainedImageAnchor(effective,image),imageObservation=await imageRead(image);qualifyRetentionImage(imageObservation,plan);retentionEnvironment(imageObservation);let anchor=await anchorRead(plan);
   if(!anchor){check(effect,'retention_anchor_required');check(!j.pending,'retention_uncertain_create_no_retry');await assertEffect(effect);
    const pending={image,name:plan.name,planDigest:contract.releaseDigest(plan),effect:structuredClone(effect),at:new Date(now()).toISOString()};j.pending=pending;await writeJournal(j);
    await assertEffect(effect);let createError;try{const argv=[plan.argv[0],'--pull','never',...plan.argv.slice(1)],out=(await ssh({command:'docker '+argv.map(quote).join(' '),maxOutputBytes:1024})).trim();check(/^[a-f0-9]{64}$/.test(out),'retention_create_result_unproven');created++;}catch(e){createError=e;}
    // An inspect failure or absence after dispatch preserves the durable intent.
    try{anchor=await anchorRead(plan);}catch(e){throw Object.assign(Error('release_compose_installation_retention_create_uncertain',{cause:e}),{uncertain:true,retryable:false,releaseBlocked:true});}
    if(!anchor)throw Object.assign(Error('release_compose_installation_retention_create_uncertain',createError?{cause:createError}:undefined),{uncertain:true,retryable:false,releaseBlocked:true});
   }
   const proof=qualifyComposeRetentionObservation(await imageRead(image),anchor,plan);proofs.push(proof);
   if(!effect&&j.pending?.image===image){check(j.pending.name===plan.name&&j.pending.planDigest===contract.releaseDigest(plan),'retention_pending_identity_changed');
    j.anchors[image]={...proof,observedAt:new Date(now()).toISOString(),effect:j.pending.effect,readbackVerified:true,reconciledByActualInspection:true};j.pending=null;await writeJournal(j);}
   if(effect){await assertEffect(effect);check(!j.pending||j.pending.image===image&&j.pending.planDigest===contract.releaseDigest(plan),'retention_pending_identity_changed');
    j.anchors[image]={...proof,observedAt:new Date(now()).toISOString(),effect:structuredClone(effect),readbackVerified:true};if(j.pending?.image===image)j.pending=null;await writeJournal(j);}
  }
  // A missing anchor never authorizes retry. Only an exact actual readback of
  // an already-created owned anchor can reconcile the local durable intent.
  return{schemaVersion:'roost-compose-image-retention-evidence-v1',...binding,baselineImages:snapshot.compatibleArtifactRecovery?[]:[...p.images],
   ...(snapshot.compatibleArtifactRecovery?{replacementImages:[...p.images],historicalRollbackExecutable:false}:{}),additionalImages:[...new Set(additionalImages)].sort(),anchors:proofs,
   observedAt:new Date(now()).toISOString(),pendingCreate:j.pending?{image:j.pending.image,name:j.pending.name}:null,createdAnchors:created,
   observationOnly:effect===null,allStopped:true,applicationEnvironmentAdded:false,mounts:0,network:'none',runtimeStarted:false,deploymentOrHealthProof:false,
   journalDigest:contract.releaseDigest(j)};};
 return Object.freeze({inspect:options=>observe(options),ensure:options=>observe(options)});
}

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

// Failure attribution only. This does not attest a deployed/healthy candidate
// or adopt changed containers as the retained baseline.
export function qualifyFailedComposePartialRuntime({snapshot,operation,queue,observed,baselineServices,presentRollbackImageDigests}){
 const t=snapshot.manifest.deployment.targets[0],commit=snapshot.commit,tree=snapshot.candidateTree;
 const deploymentId=coolifyGitSetDeploymentId({releaseId:snapshot.releaseId,operationId:operation.id,targetId:t.targetId,rollback:false});
 check(operation.operation==='deploy'&&operation.intent?.parameters?.targetId===t.targetId&&queue?.targetId===t.targetId
  &&queue.deploymentId===deploymentId&&queue.commit===commit&&queue.status==='failed'&&Number.isFinite(Date.parse(queue.finishedAt))
  &&Date.parse(queue.createdAt)>=Date.parse(operation.createdAt)&&Date.parse(queue.finishedAt)>=Date.parse(queue.createdAt),'partial_exact_failed_queue');
 const declarations=t.configuration.services,rows=observed.services;
 check(declarations.length===5&&rows.length===5&&new Set(rows.map(r=>r.name)).size===5&&new Set(rows.map(r=>r.containerId)).size===5
  &&observed.missingDeclared.length===0&&declarations.every(d=>rows.some(r=>r.name===d.name&&r.role===d.role)),'partial_complete_service_set');
 const images=[],unknownBuild=observed.images.some(r=>r.buildRevision==='unknown');
 for(const d of declarations){const r=rows.find(r=>r.name===d.name);
  check(/^[a-f0-9]{64}$/.test(r.containerId)&&!baselineServices.some(x=>x.containerId===r.containerId)&&r.mountDigest===d.mountDigest&&Date.parse(r.createdAt)>=Date.parse(queue.createdAt)
   &&Date.parse(r.createdAt)<=Date.parse(queue.finishedAt),'partial_owned_service_identity');
  if(d.role==='database'){const prior=baselineServices.find(x=>x.name===d.name&&x.role==='database');
   check(prior&&r.imageDigest===d.imageDigest&&r.imageDigest===prior.imageDigest&&r.mountDigest===prior.mountDigest
    &&r.containerId!==prior.containerId&&r.state==='running'&&r.health==='healthy'&&r.exitCode===0,'partial_protected_database');
  }else{check(r.runtimeRevision===commit&&r.imageRef===`${t.targetId}_${d.name}:${commit}`,'partial_candidate_revision');
   const image=observed.images.find(x=>x.name===d.name);check(image&&image.imageDigest===r.imageDigest&&image.imageRef===r.imageRef
    &&(image.buildRevision===commit||unknownBuild&&image.buildRevision==='unknown')&&(image.revisionLabel===null||image.revisionLabel===commit)
    &&(image.treeLabel===null||image.treeLabel===tree),'partial_candidate_image');
   if(unknownBuild)check(Number.isFinite(Date.parse(image.createdAt))&&Date.parse(image.createdAt)>=Date.parse(queue.createdAt)
    &&Date.parse(image.createdAt)<=Date.parse(r.createdAt),'partial_image_creation_unproven');
   check(d.role==='migration'?r.state==='exited'&&r.exitCode===1&&r.health===null:r.state==='created'&&r.exitCode===0&&r.health===null,'partial_exact_failure_states');
   images.push({name:d.name,imageDigest:r.imageDigest,commit,tree,deploymentId,...(unknownBuild?{
    imageRef:image.imageRef,createdAt:image.createdAt,buildRevision:image.buildRevision,revisionLabel:image.revisionLabel,treeLabel:image.treeLabel}:{})});}
 }
 const required=[...new Set([...t.baseline.images.map(x=>x.imageDigest),...t.configuration.services.filter(x=>x.source==='image').map(x=>x.imageDigest)])].sort();
 check(required.length>0&&contract.releaseDigest(required)===contract.releaseDigest(presentRollbackImageDigests.slice().sort()),'partial_retained_images_present');
 const services=rows.map(row=>({...Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]])),...(row.role==='database'?{}:{commit,tree,deploymentId})})).sort((a,b)=>a.name.localeCompare(b.name));
 return{services,images:images.sort((a,b)=>a.name.localeCompare(b.name)),protectedRollbackImages:structuredClone(t.baseline.images),presentRollbackImageDigests:required,
  ...(unknownBuild?{sourceAttribution:'failed_queue_exact_reference_and_runtime_environment',candidateCodeProvenanceVerified:false}:{})};
}

/** Old scope stays immutable. A fresh failed entry is separate read evidence. */
export function qualifyRecoveryOnlyEntryState({snapshot,previousState,currentEvidence,now}){
 const r=snapshot?.recoveryOnly,old=previousState?.release?.snapshot,last=previousState?.journal?.at(-1);
 check(contract.releaseHasRecoveryOnly(snapshot)&&previousState?.release?.id===r.releaseId&&previousState.status==='failed'
  &&previousState.expectedVersion===r.expectedVersion&&old?.manifestDigest===r.previousManifestDigest
  &&contract.releaseDigest(old.manifest)===r.previousManifestDigest
  &&contract.releaseRecoveryOnlyManifestMatches(old.manifest,snapshot.manifest)
  &&['taskId','applicationId','hostId','commit','candidateTree','baseCommit','baseTree','releaserAgentId'].every(k=>old[k]===snapshot[k]),'recovery_only_previous_scope_changed');
 const closure=previousState.failedClosures?.find(c=>c.id===r.closureId),receipt=closure?.snapshot;
 const digest=closure?.closureDigest??closure?.closure_digest,revocation=closure?.revocationId??closure?.revocation_id;
 check(receipt&&digest===r.closureDigest&&contract.releaseDigest(receipt)===r.closureDigest
  &&previousState.revocations?.some(v=>v.id===revocation)
  &&last?.id===r.failedOperationId&&last.operation==='rollback'&&last.outcome?.id===r.failedOutcomeId
  &&(last.outcome.status==='failed'||last.outcome.status==='reconciled'&&last.outcome.reconciledStatus==='failed')
  &&contract.releaseDigest(last.outcome.evidence)===r.failedEvidenceDigest
  &&contract.composeFailedRollbackPartialJournalError({...old,releaseId:r.releaseId},last,last.outcome.evidence,previousState.journal)===null
  &&contract.releaseRecoveryOnlyEntryError(old,snapshot,receipt)===null,'recovery_only_previous_closure_unproven');
 if(currentEvidence!==undefined){
  qualifyFreshFailedEntryEvidence({oldSnapshot:old,failedOperation:last,saved:r.currentEvidence,currentEvidence,now});
 }
 return {oldSnapshot:old,failedOperation:last,closureReceipt:receipt};
}

export function qualifyFreshFailedEntryEvidence({oldSnapshot,failedOperation,saved,currentEvidence,now}){
 const stable=e=>{const x=structuredClone(e);delete x.observedAt;delete x.healthDigest;delete x.composeRecovery.partialRollbackFailure.publicHealth.healthDigest;return x;};
 const at=now instanceof Date?now.getTime():Number(now),observed=Date.parse(currentEvidence?.observedAt);
 check(contract.composeFailedRollbackPartialEvidenceError({...oldSnapshot,releaseId:saved.composeRecovery.releaseId},currentEvidence,failedOperation)===null
  &&Number.isFinite(at)&&Number.isFinite(observed)&&observed<=at&&at-observed<=300000
  &&contract.releaseDigest(stable(currentEvidence))===contract.releaseDigest(stable(saved)),'recovery_only_fresh_entry_unproven');
 return currentEvidence;
}

export function qualifyClosedFailedComposeEntry(previousState){
 const old=previousState?.release?.snapshot,last=previousState?.journal?.at(-1),closure=previousState?.failedClosures?.at(-1),receipt=closure?.snapshot;
 check(previousState?.status==='failed'&&old?.manifestDigest===contract.releaseDigest(old.manifest)&&contract.isComposeManifest(old.manifest)
  &&contract.manifestSchema.safeParse(old.manifest).success&&contract.releaseDigest(receipt)===(closure?.closureDigest??closure?.closure_digest)
  &&previousState.revocations?.some(v=>v.id===(closure.revocationId??closure.revocation_id))
  &&receipt.failedOperationId===last?.id&&receipt.failedOutcomeId===last.outcome?.id
  &&(last.outcome.status==='failed'||last.outcome.status==='reconciled'&&last.outcome.reconciledStatus==='failed')
  &&receipt.failedEvidenceDigest===contract.releaseDigest(last.outcome.evidence)
  &&contract.composeFailedRollbackPartialJournalError({...old,releaseId:previousState.release.id},last,last.outcome.evidence,previousState.journal)===null
  &&contract.composeFailedRollbackPartialClosureBindingError({...old,releaseId:previousState.release.id},receipt)===null,'closed_failed_entry_unproven');
 return{oldSnapshot:old,failedOperation:last,closureReceipt:receipt,saved:receipt.absenceRevalidation.currentEvidence};
}

/** Read-only old-scope reader. It never loads/executes an old renderer or admits a new effect. */
export function createComposeRecoveryEntryReader({settings,previousState},dependencies={}){
 const cfg=installedComposeReleaseSchema.parse(settings),qualified=qualifyClosedFailedComposeEntry(previousState),old=qualified.oldSnapshot,m=old.manifest,target=m.deployment.targets[0];
 check(cfg.recoveryEntryTemplate&&typeof dependencies.readReleaseState==='function','recovery_entry_reader_binding_invalid');
 const identity=dependencies.identity??physicalIdentity,read=dependencies.readFile??readFileSync,native=dependencies.nativeProcess??runReleaseNativeProcess;
 const seals=new Map(),bytesFor=(file,expected)=>{const id=identity(file,false),bytes=read(file);check(!inside(cfg.workspaceRoot,file)&&Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=131072&&hash(bytes)===expected,'recovery_entry_reader_private_seal');seals.set(file,{id,digest:hash(bytes)});return bytes;};
 const owner=permanentReleaseOwnershipSchema.parse(JSON.parse(bytesFor(cfg.ownershipFile,hash(read(cfg.ownershipFile))))),baseline=JSON.parse(bytesFor(cfg.baselineObservation.file,cfg.baselineObservation.sha256));
 check(owner.applicationId===old.applicationId&&owner.canonicalDir===m.repository.canonicalDir&&owner.repositoryUrl===m.repository.url
  &&contract.releaseDigest(owner.targetIds)===contract.releaseDigest([target.targetId])
  &&contract.releaseDigest(owner.protectedResourceIds)===contract.releaseDigest(m.cleanup.protectedResourceIds),'recovery_entry_reader_ownership_changed');
 const renderer=target.baseline.controllerInvariants.rendererDigest;
 check(cfg.sourcePins.controllerRenderer===renderer&&cfg.sshHost===cfg.source.sshHost&&inside(cfg.workspaceRoot,m.repository.canonicalDir)
  &&new URL(cfg.coolify.origin).origin===new URL(m.deployment.controllerUrl).origin
  &&baseline.observed===true&&baseline.healthy===true&&baseline.migrationSchemaVerified===true&&baseline.commit===target.baseline.commit
  &&baseline.tree===target.baseline.tree&&baseline.configDigest===target.baseline.configDigest
  &&baseline.observedAt===m.baseline.observedAt&&['schemaDigest','dataDigest','healthDigest'].every(k=>baseline[k]===m.baseline[k])
  &&contract.releaseDigest(baseline.images)===contract.releaseDigest(target.baseline.images),'recovery_entry_reader_old_scope_changed');
 let materializationTemplate;
 for(const phase of['candidate','rollback']){
  const row=cfg.phases[phase],policy=composePhasePolicySchema.parse({...JSON.parse(bytesFor(row.policy.file,row.policy.sha256)),releaseId:previousState.release.id}),artifact=bytesFor(row.artifact.file,row.artifact.sha256),config=phase==='candidate'?target.configuration:target.rollbackConfiguration;
  check(policy.phase===phase&&policy.targetId===target.targetId&&policy.commit===(phase==='candidate'?old.commit:target.baseline.commit)
   &&policy.tree===(phase==='candidate'?old.candidateTree:target.baseline.tree)&&policy.rendererDigest===renderer
   &&policy.artifactDigest===hash(artifact)&&policy.artifactDigest===config.controllerPolicy.artifactDigest
   &&policy.phaseConfigDigest===(phase==='candidate'?target.configDigest:target.rollbackConfigDigest)
   &&contract.releaseDigest(policy.sourcePins)===contract.releaseDigest(cfg.sourcePins),'recovery_entry_reader_old_policy_changed');
  if(phase==='candidate')materializationTemplate=qualifyRecoveryMaterializationTemplate({previousManifest:m,bytes:artifact,reference:row.artifact});
 }
 check(Boolean(m.postObservation)===Boolean(cfg.activity),'recovery_entry_reader_activity_scope_changed');
 if(cfg.activity){const policy=JSON.parse(bytesFor(cfg.activity.policy.file,cfg.activity.policy.sha256)),runtime=JSON.parse(bytesFor(cfg.activity.runtimeSettings.file,cfg.activity.runtimeSettings.sha256));
  check(policy.postObservationDigest===contract.releaseDigest(m.postObservation)&&policy.targetId===target.targetId&&policy.applicationId===old.applicationId
   &&runtime.targetId===target.targetId&&runtime.database.containerId===baseline.services.find(r=>r.role==='database').containerId,'recovery_entry_reader_activity_scope_changed');}
 const oldEntryTemplate=bytesFor(cfg.recoveryEntryTemplate.file,cfg.recoveryEntryTemplate.sha256);
 check(hash(oldEntryTemplate)===qualified.saved.composeRecovery.configuration.controllerPolicy.artifactDigest,'recovery_entry_reader_template_changed');
 const rootId=identity(cfg.workspaceRoot),repoId=identity(m.repository.canonicalDir),gitId=identity(path.join(m.repository.canonicalDir,'.git'));
 const assertClone=async()=>{check(identity(cfg.workspaceRoot)===rootId&&identity(m.repository.canonicalDir)===repoId&&identity(path.join(m.repository.canonicalDir,'.git'))===gitId,'recovery_entry_reader_clone_changed');for(const[file,v]of seals)check(identity(file,false)===v.id&&hash(read(file))===v.digest,'recovery_entry_reader_private_seal_changed');};
 const ssh=async({command,stdin='',timeoutMs=25000,maxOutputBytes=32768})=>{await assertClone();if(!dependencies.nativeProcess)check(hasReleaseProcessScope(),'owned_process_scope_required');const af=cfg.sshAddressFamily==='ipv4'?['-4']:cfg.sshAddressFamily==='ipv6'?['-6']:[];const output=await native('ssh',{argv:[...af,'-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10',cfg.sshHost,command],cwd:os.tmpdir(),input:stdin,durationMs:timeoutMs,maxBytes:maxOutputBytes});await assertClone();check(Buffer.byteLength(output)<=maxOutputBytes,'response_size_invalid');return output.toString('utf8');};
 const php=async(program,payload={})=>{const encoded=Buffer.from(JSON.stringify(payload)).toString('base64');return JSON.parse(await ssh({command:'docker exec -i coolify php',stdin:`<?php\nerror_reporting(0);ini_set('display_errors','0');try{$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);${bootstrap}${program}}catch(Throwable $e){echo '{"unproven":true}';exit(1);}`}));};
 const git=async(args,maxBytes=131072)=>{await assertClone();return native('git',{argv:['--no-replace-objects','-c',`core.hooksPath=${process.platform==='win32'?'NUL':'/dev/null'}`,'-c','core.fsmonitor=false','-C',m.repository.canonicalDir,...args],cwd:m.repository.canonicalDir,environment:{...minimalReleaseEnvironment(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},durationMs:10000,maxBytes});};
 const readFingerprint=async source=>{const out=(await ssh({command:'bash -s',stdin:buildReleaseFingerprintCommand(source,cfg.fingerprintTimeoutMs??60000)+'\n',timeoutMs:cfg.fingerprintTimeoutMs??60000})).trim().split(/\r?\n/);check(out.length===2&&out.every(v=>/^[a-f0-9]{64}\s+-\s*$/.test(v)),'fingerprint_unproven');return{schemaDigest:out[0].slice(0,64),dataDigest:out[1].slice(0,64)};};
 const readDatabaseFence=async source=>JSON.parse(await ssh({command:`docker exec -i ${quote(source.container)} psql -X -qAt -v ON_ERROR_STOP=1 -U ${quote(source.user)} -d ${quote(source.database)}`,stdin:"BEGIN READ ONLY; SELECT json_build_object('readOnlyFence',EXISTS(SELECT 1 FROM pg_db_role_setting s JOIN pg_database d ON d.oid=s.setdatabase JOIN pg_roles r ON r.oid=s.setrole WHERE d.datname=current_database() AND r.rolname=current_user AND 'default_transaction_read_only=on'=ANY(s.setconfig)),'activeOtherSessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active'),'ownedTransactions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL AND state<>'idle'))::text; COMMIT;"}));
 const healthProbe=(dependencies.createHealthProbe??createComposeHealthProbe)({publicUrl:m.deployment.url,health:cfg.health});
 return Object.freeze({async inspect(){await assertClone();check(contract.releaseDigest(await dependencies.readReleaseState())===contract.releaseDigest(previousState),'recovery_entry_reader_closed_state_changed');const result=await readFixedRecoveryEntry({old,previousState,closureReceipt:qualified.closureReceipt,saved:qualified.saved,cfg,materializationTemplate,assertClone,ssh,php,git,healthProbe,readDatabaseFence,readFingerprint,createInspector:dependencies.createInspector??createComposeStateInspector,now:dependencies.now??Date.now,readCurrentState:dependencies.readReleaseState});await assertClone();return{state:'failed',evidence:result.currentEvidence,closureReceipt:qualified.closureReceipt};}});
}

export function qualifyRecoveryOnlyConfigurationPreimage({snapshot,current,configuration}){
 const {releaseId,...bound}=snapshot??{},last=current?.journal?.[0],p=last?.intent?.parameters,r=snapshot?.recoveryOnly;
 check(contract.releaseHasRecoveryOnly(snapshot)&&current?.release?.id===releaseId&&current.status==='active'
  &&contract.releaseDigest(current.release.snapshot)===contract.releaseDigest(bound)
  &&current.journal?.length===1&&last.operation==='rollback_config'&&!last.outcome
  &&contract.intentSchema.safeParse(last.intent).success&&last.intent.operation==='rollback_config'
  &&last.intent.manifestDigest===snapshot.manifestDigest&&last.intent.commit===snapshot.commit
  &&last.intent.baseCommit===snapshot.baseCommit&&p.commit===snapshot.manifest.rollback.commit
  &&p.configDigest===snapshot.manifest.rollback.configDigest&&p.artifactSetDigest===snapshot.manifest.rollback.artifactSetDigest
  &&p.schemaDigest===snapshot.manifest.rollback.schemaDigest
  &&composeConfigurationDigest(configuration)===composeConfigurationDigest(r.currentEvidence.composeRecovery.configuration),'recovery_only_configuration_preimage_unproven');
 return true;
}

export function qualifyInstalledDatabaseSource({snapshot,baselineDatabase,database,container}){
 if(snapshot.compatibleArtifactRecovery){const e=contract.compatibleRecoveryEntrySchema.parse(snapshot.compatibleArtifactRecovery.currentEntry),r=e.services.find(v=>v.role==='database');
  check(r?.presence==='present'&&r.containerId===container&&r.name===database.name&&r.imageDigest===database.imageDigest&&r.mountDigest===database.mountDigest
   &&r.state==='running'&&r.health==='healthy'&&r.exitCode===0&&e.database.containerId===container&&e.database.readOnlyFence===true
   &&e.database.activeOtherSessions===0&&e.database.ownedTransactions===0&&e.schemaDigest===snapshot.manifest.baseline.schemaDigest
   &&e.dataDigest===snapshot.manifest.baseline.dataDigest,'compatible_database_source_binding_changed');return true;}
 if(baselineDatabase?.containerId===container)return true;
 const e=contract.releaseHasRecoveryOnly(snapshot)?snapshot.recoveryOnly.currentEvidence:null,r=e?.composeRecovery.services.find(v=>v.role==='database'),p=e?.composeRecovery.partialRollbackFailure;
 check(r?.containerId===container&&r.name===database.name&&r.imageDigest===database.imageDigest&&r.mountDigest===database.mountDigest
  &&r.state==='running'&&r.health==='healthy'&&r.exitCode===0&&p.databaseReadOnly===true&&p.activeOtherSessions===0&&p.ownedTransactions===0
  &&p.projectServiceSetComplete===true&&e.schemaDigest===snapshot.manifest.baseline.schemaDigest&&e.dataDigest===snapshot.manifest.baseline.dataDigest,'database_source_binding_changed');return true;
}

export function qualifyCandidateIngressRuntime(snapshot,current,evidence,operationId,{allowUnhealthyApp=false}={}){
 const op=qualifyCandidateIngressScope(snapshot,current,operationId),t=snapshot.manifest.deployment.targets[0],q=evidence?.binding?.queue;
 const id=coolifyGitSetDeploymentId({releaseId:snapshot.releaseId,operationId:op.id,targetId:t.targetId,rollback:false});
 check(q?.status==='finished'&&q.targetId===t.targetId&&q.deploymentId===id&&q.commit===snapshot.commit
  &&Date.parse(q.createdAt)>=Date.parse(op.createdAt)&&Date.parse(q.finishedAt)>=Date.parse(q.createdAt)
  &&Date.parse(q.finishedAt)<=Date.now()&&evidence.targetId===t.targetId&&evidence.binding.commit===snapshot.commit
  &&evidence.binding.tree===snapshot.candidateTree,'candidate_ingress_exact_finished_queue_required');
 const runtime=allowUnhealthyApp?{...evidence.runtime,services:evidence.runtime.services.map(v=>v.role==='app'?{...v,health:'healthy'}:v)}:evidence.runtime;
 qualifyComposeRuntime({expected:{configuration:t.configuration,configDigest:t.configDigest},configuration:evidence.configuration,runtime,binding:evidence.binding});
 if(allowUnhealthyApp)check(evidence.runtime.services.filter(v=>v.role==='app').every(v=>['healthy','starting','unhealthy'].includes(v.health)),'candidate_hold_actual_health_unproven');
 const rows=evidence.runtime.services,r=snapshot.compatibleArtifactRecovery;
 check(rows.length===5&&new Set(rows.map(v=>v.containerId)).size===5&&rows.filter(v=>v.role==='cadence').every(v=>['paused','created','exited'].includes(v.state)&&v.exitCode===0&&v.health===null)
  &&r.replacement.images.length===4&&r.replacement.images.every(v=>rows.some(row=>row.name===v.name&&row.imageDigest===v.imageDigest))
  &&rows.some(v=>v.role==='database'&&v.containerId===r.currentEntry.database.containerId&&v.imageDigest===r.currentEntry.database.imageDigest&&v.mountDigest===r.currentEntry.database.mountDigest),
  'candidate_ingress_replacement_or_database_changed');
 return{commit:snapshot.commit,tree:snapshot.candidateTree,services:rows};
}

// Server provenance is owner-verified evidence, never a current OS observation.
const compatibleProofSchema=z.object({schemaVersion:z.literal('roost-compatible-recovery-proof-snapshot-v1'),classification:z.literal('owner_verified_native_receipt'),
 workspaceId:z.string().uuid(),applicationId:z.string().uuid(),issuerUserId:z.string().uuid(),evidenceId:z.string().uuid(),recordDigest:hex,metadataDigest:hex,
 requestDigest:hex,manifestDigest:hex,scopeDigest:hex,publicPayloadDigest:hex,buildReceiptDigest:hex,compatibilityReceiptDigest:hex,
 privateSignedRecordDigest:hex,jobReceiptDigest:hex,toolchainDigest:hex,sourceCASDigest:hex,nativeAttemptId:z.string().uuid(),nativeAttemptIsAgentExecution:z.literal(false),
 sourceExecutionId:z.string().uuid(),sourceBasisDigest:hex,scopeBasisDigest:hex,serverOperatingSystemAttestation:z.literal(false),
 serverPrivateSignatureVerification:z.literal(false),releaseAuthority:z.literal(false)}).strict();
export function qualifyCompatibleRecoveryBuildSnapshot(snapshot){
 const r=contract.compatibleArtifactRecoverySchema.parse(snapshot?.compatibleArtifactRecovery),p=compatibleProofSchema.parse(snapshot.compatibleRecoveryProof);
 const input=structuredClone(snapshot);for(const k of['compatibleRecoveryProof','readinessDigest','configurationDigest','releaseId'])delete input[k];
 check(contract.createReleaseSchema.safeParse(input).success&&p.requestDigest===contract.releaseDigest(input)&&p.applicationId===snapshot.applicationId
  &&p.manifestDigest===snapshot.manifestDigest&&p.scopeDigest===r.scopeAudit.scopeDigest&&p.buildReceiptDigest===r.replacement.buildReceiptDigest
  &&p.compatibilityReceiptDigest===r.replacement.compatibilityReceiptDigest&&p.sourceExecutionId!==r.scopeAudit.executionId
  &&p.nativeAttemptId!==p.sourceExecutionId&&p.nativeAttemptId!==r.scopeAudit.executionId,'compatible_build_provenance_unproven');return p;
}
export function qualifyCompatibleRecoveryEntryState({snapshot,previousState,currentEntry,now,admittedAt}){
 qualifyCompatibleRecoveryBuildSnapshot(snapshot);
 const validate=(state,receipt)=>{try{const q=qualifyClosedFailedComposeEntry(state);return contract.releaseDigest(q.closureReceipt)===contract.releaseDigest(receipt)?null:'closed_prior_changed';}catch{return'closed_prior_unproven';}};
 check(Number.isFinite(Date.parse(admittedAt))&&contract.compatibleRecoveryAdmissionError(previousState,snapshot,new Date(admittedAt),validate)===null,'compatible_previous_scope_changed');
 const prior=snapshot.compatibleArtifactRecovery.prior,closure=previousState.failedClosures.find(v=>v.id===prior.closureId);
 if(currentEntry!==undefined){const e=contract.compatibleRecoveryEntrySchema.parse(currentEntry),at=now instanceof Date?now.getTime():Number(now),observed=Date.parse(e.observedAt),inventoryAt=Date.parse(e.projectInventory.observedAt);
  const candidate={...snapshot,compatibleArtifactRecovery:{...snapshot.compatibleArtifactRecovery,currentEntry:e}};
  check(Number.isFinite(at)&&observed<=at&&at-observed<=300000&&inventoryAt<=observed&&at-inventoryAt<=300000
   &&e.evidenceDigest===contract.compatibleRecoveryEntryDigest(e)&&e.projectInventory.digest===contract.compatibleRecoveryInventoryDigest(e.projectInventory)
   &&contract.compatibleRecoveryScopeDigest(candidate)===snapshot.compatibleArtifactRecovery.scopeAudit.scopeDigest,'compatible_fresh_entry_changed');
 }
 return{oldSnapshot:previousState.release.snapshot,closureReceipt:closure.snapshot};
}
export function qualifyCompatibleRecoveryConfigurationPreimage({snapshot,current,configuration}){
 const r=snapshot.compatibleArtifactRecovery,last=current?.journal?.at(-1),before=current?.journal?.slice(0,-1);
 const{releaseId:_,...wireSnapshot}=snapshot;
 check(r&&current.release?.id===snapshot.releaseId&&['active','reconciliation_required'].includes(current.status)&&contract.releaseDigest(current.release.snapshot)===contract.releaseDigest(wireSnapshot),'compatible_configuration_scope_changed');
 check(before?.length===4&&before.every((v,i)=>v.operation===['push','pr','review','merge'][i]&&(v.outcome?.status==='succeeded'||v.outcome?.status==='reconciled'&&v.outcome.reconciledStatus==='succeeded'))
  &&last.operation==='deploy_config'&&!last.outcome&&last.intent?.parameters?.commit===snapshot.commit&&last.intent.parameters.configDigest===snapshot.manifest.deployment.configDigest
  &&last.intent.parameters.artifactSetDigest===snapshot.manifest.deployment.artifactSetDigest&&last.intent.parameters.schemaDigest===snapshot.manifest.deployment.schemaDigest
  &&composeConfigurationDigest(configuration)===composeConfigurationDigest(r.currentEntry.configuration),'compatible_configuration_preimage_unproven');return true;
}
export function qualifyCompatiblePhysicalEntry({snapshot,observed,now}){
 const r=snapshot.compatibleArtifactRecovery,e=contract.compatibleRecoveryEntrySchema.parse(r?.currentEntry),t=snapshot.manifest.deployment.targets[0],db=e.services.find(v=>v.role==='database');
 check(Array.isArray(observed?.services)&&observed.services.length===1&&Array.isArray(observed.missingDeclared)
  &&contract.releaseDigest(observed.missingDeclared.slice().sort())===contract.releaseDigest(t.configuration.services.filter(v=>v.source==='built').map(v=>v.name).sort())
  &&['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].every(k=>observed.services[0][k]===db[k])
  &&observed.services[0].role==='database'&&db.presence==='present'&&db.state==='running'&&db.health==='healthy'&&db.exitCode===0
  &&e.services.filter(v=>v.presence==='absent').length===4&&e.services.filter(v=>v.role!=='database').every(v=>v.presence==='absent'&&v.containerId===null&&v.imageDigest===null),
  'compatible_actual_project_inventory_changed');
 check(Number.isFinite(now),'compatible_actual_read_clock_invalid');return observed.services[0];
}
export function qualifyCompatibleReplacementMetadata({snapshot,policy,images}){
 const r=snapshot.compatibleArtifactRecovery,p=composePhasePolicySchema.parse(policy);qualifyCompatibleRecoveryBuildSnapshot(snapshot);
 check(p.targetId===snapshot.manifest.deployment.targetId&&p.phase==='candidate'&&p.commit===snapshot.commit&&p.tree===snapshot.candidateTree
  &&p.candidateExecution?.mode==='qualified_immutable_images'&&p.candidateExecution.buildProofDigest===r.replacement.buildReceiptDigest
  &&p.candidateExecution.replacementImagesDigest===composeReplacementImagesDigest(r.replacement.images)
  &&p.services.filter(v=>v.source==='built').every(v=>r.replacement.images.some(i=>i.name===v.name&&i.imageDigest===v.imageDigest&&v.imageRef===i.imageDigest))
  &&Array.isArray(images)&&images.length===4,'compatible_replacement_policy_changed');
 return p.services.filter(v=>v.source==='built').map(v=>{const image=images.find(i=>i.name===v.name),o=image?.observation,env=o?.Config?.Env??[],labels=o?.Config?.Labels??{},revisions=env.filter(x=>typeof x==='string'&&x.startsWith('APP_BUILD_REVISION=')).map(x=>x.slice(19));
  check(o?.Id===v.imageDigest&&revisions.length===1&&revisions[0]===snapshot.commit
   &&labels['org.opencontainers.image.revision']===snapshot.commit
   &&labels['io.roost.release.tree']===snapshot.candidateTree,'compatible_actual_image_metadata_changed');
  return{name:v.name,imageDigest:v.imageDigest,buildRevision:revisions[0],revisionLabel:labels['org.opencontainers.image.revision']??null,treeLabel:labels['io.roost.release.tree']??null};});
}
export function compatibleCandidateEntryWitness({snapshot,policy,observed,observedAt}){
 const p=composePhasePolicySchema.parse(policy),db=qualifyCompatiblePhysicalEntry({snapshot,observed,now:Date.parse(observedAt)});
 check(p.targetId===snapshot.manifest.deployment.targetId&&p.phase==='candidate'&&p.commit===snapshot.commit&&p.tree===snapshot.candidateTree
  &&p.candidateExecution?.mode==='qualified_immutable_images','compatible_candidate_entry_policy_changed');
 const inventory={targetId:p.targetId,observedAt,projectServiceSetComplete:true,services:[Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode'].map(k=>[k,db[k]]))],digest:'0'.repeat(64)};
 inventory.digest=composeImmutableCandidateInventoryDigest(inventory);
 const entry={schemaVersion:'roost-compose-immutable-candidate-entry-v1',targetId:p.targetId,policyDigest:composePhasePolicyDigest(p),observedAt,inventory,
  absences:p.services.filter(v=>v.source==='built').map(v=>({name:v.name,role:v.role,source:'built',mountDigest:v.mountDigest,policyServiceDigest:contract.releaseDigest(v),absenceVerified:true,inventoryDigest:inventory.digest,observedAt})),evidenceDigest:'0'.repeat(64)};
 entry.evidenceDigest=composeImmutableCandidateEntryDigest(entry);return entry;
}
export function qualifyCompatibleSettingsRead({snapshot,value,now}){
 const e=snapshot.compatibleArtifactRecovery.currentEntry,at=now instanceof Date?now.getTime():Number(now),t=Date.parse(value?.observedAt);
 check(Number.isFinite(at)&&Number.isFinite(t)&&t<=at&&at-t<=300000&&value.sequenceDigest===snapshot.manifest.postObservation.baselineSequenceDigest
  &&value.databaseSettingsDigest===e.databaseSettingsDigest&&value.ingressSettingsDigest===e.ingressSettingsDigest&&value.ingressBlocked===true,
  'compatible_native_settings_unproven');
 check(e.ingressFence&&value.ingressFence&&Date.parse(value.ingressFence.observedAt)<=t,'compatible_native_ingress_fence_stale');
 ingressFenceContract.qualifyComposeIngressFence(value.ingressFence,{targetId:e.targetId,databaseContainerId:e.database.containerId,now:at});
 const stableFence=v=>{const x=structuredClone(v);delete x.observedAt;delete x.evidenceDigest;return x;};
 check(contract.releaseDigest(stableFence(value.ingressFence))===contract.releaseDigest(stableFence(e.ingressFence)),'compatible_native_ingress_fence_changed');
 return value;
}

// Read the protected database and current proxy namespace before application
// containers exist. The installed SSH transport still owns every native child.
export const compatibleSequenceReadSql="BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT format('SELECT jsonb_build_object(''schema'',%L,''sequence'',%L,''lastValue'',last_value,''isCalled'',is_called)::text FROM %I.%I;',n.nspname,c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' ORDER BY n.nspname,c.relname\n\\gexec\nCOMMIT;";
export function compatibleRoleReadSql(database){
 const db=database;check(db&&[db.adminUser,db.adminDatabase,db.applicationUser,db.applicationDatabase].every(x=>/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(x)),'compatible_settings_database_names_unproven');
 const u="'"+db.applicationUser+"'",n="'"+db.applicationDatabase+"'";
 return `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT json_build_object('roleExists',EXISTS(SELECT 1 FROM pg_roles WHERE rolname=${u}),'databaseExists',EXISTS(SELECT 1 FROM pg_database WHERE datname=${n}),'adminSuperuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),'roleConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname=${u}) AND setdatabase=(SELECT oid FROM pg_database WHERE datname=${n})),'[]'::json),'globalRoleConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=(SELECT oid FROM pg_roles WHERE rolname=${u}) AND setdatabase=0),'[]'::json),'databaseConfig',COALESCE((SELECT to_json(setconfig) FROM pg_db_role_setting WHERE setrole=0 AND setdatabase=(SELECT oid FROM pg_database WHERE datname=${n})),'[]'::json),'serverReadOnly',(SELECT reset_val FROM pg_settings WHERE name='default_transaction_read_only'),'activeOtherSessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=${n} AND pid<>pg_backend_pid() AND state='active'),'ownedTransactions',(SELECT count(*) FROM pg_stat_activity WHERE datname=${n} AND pid<>pg_backend_pid() AND xact_start IS NOT NULL AND state<>'idle'))::text; COMMIT;`;
}
const compatibleSettingsReadProgram=String.raw`
import base64,hashlib,json,re,subprocess
from datetime import datetime,timezone
controller=base64.b64decode('__ROOST_CONTROLLER__')
request=json.loads(base64.b64decode('__ROOST_INPUT__'))
def require(ok):
    if not ok: raise RuntimeError('compatible-settings-unproven')
require(hashlib.sha256(controller).hexdigest()==request['controllerDigest'])
scope={'__name__':'_roost_fixed_compatible_read'}
exec(compile(controller,'<sealed-ingress-controller>','exec'),scope)
policy=request['policy'];db=request['database']
scope['validate']({'operation':'read','policy':policy},request['controllerDigest'])
def fence():
    value=scope['Controller']({'operation':'read','policy':policy}).execute()
    require(value['effects']==0 and value['removed'] is False and value['receipt']['rulePresent'] is True)
    return value['receipt']
def stable(v): return {k:x for k,x in v.items() if k not in {'observedAt','evidenceDigest'}}
def sql(user,database,query,limit):
    r=subprocess.run(['docker','exec','-i',db['containerId'],'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d',database],input=query.encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=25)
    require(r.returncode==0 and len(r.stdout)<=limit and len(r.stderr)<=1024)
    if r.stderr:
        # PostgreSQL's administrative collation warning does not invalidate a
        # completed read. Accept its exact standard frame for that database only.
        require(user==db['adminUser'] and database==db['adminDatabase'] and database!=db['applicationDatabase'])
        lines=r.stderr.decode().splitlines()
        require(len(lines)==3 and lines[0]=='WARNING:  database "'+database+'" has a collation version mismatch')
        require(re.fullmatch(r'DETAIL:  The database was created using collation version [0-9.]+, but the operating system provides version [0-9.]+\.',lines[1]) is not None)
        require(lines[2]=='HINT:  Rebuild all objects in this database that use the default collation and run ALTER DATABASE '+database+' REFRESH COLLATION VERSION, or build PostgreSQL with the right library version.')
    return r.stdout.decode()
def role():
    v=json.loads(sql(db['adminUser'],db['adminDatabase'],request['roleSql'],8192))
    require(v['roleExists'] is True and v['databaseExists'] is True and v['adminSuperuser'] is True and v['activeOtherSessions']==0 and v['ownedTransactions']==0)
    effective=v['serverReadOnly'];require(effective in {'on','off'})
    for key in ['databaseConfig','globalRoleConfig','roleConfig']:
        rows=v[key];require(isinstance(rows,list) and len(rows)<=32)
        require(all(isinstance(x,str) and 0<len(x)<=1024 and '=' in x and not any(c in x for c in '\x00\r\n') for x in rows))
        require(len({x.split('=',1)[0] for x in rows})==len(rows))
        settings=[x for x in rows if x.startswith('default_transaction_read_only=')]
        require(len(settings)<=1 and all(x in {'default_transaction_read_only=on','default_transaction_read_only=off'} for x in settings))
        if settings: effective=settings[0].split('=',1)[1]
    require(effective=='on' and 'default_transaction_read_only=on' in v['roleConfig'])
    require([x for x in v['roleConfig'] if not x.startswith('default_transaction_read_only=')]==[x for x in db['originalRoleConfig'] if not x.startswith('default_transaction_read_only=')])
    return v
before=fence();roleBefore=role()
lines=sql(db['applicationUser'],db['applicationDatabase'],request['sequenceSql'],1048576).splitlines()
lines=[x for x in lines if x]
for line in lines:
    v=json.loads(line)
    require(set(v)=={'schema','sequence','lastValue','isCalled'} and isinstance(v['schema'],str) and isinstance(v['sequence'],str) and type(v['lastValue']) is int and abs(v['lastValue'])<=9007199254740991 and type(v['isCalled']) is bool)
sequence=hashlib.sha256(''.join(x+'\n' for x in sorted(lines,key=lambda x:x.encode('utf-16-be'))).encode()).hexdigest()
roleAfter=role();after=fence()
require(roleBefore==roleAfter and stable(before)==stable(after))
print(json.dumps({'observedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'sequenceDigest':sequence,'databaseSettingsDigest':request['settingsDigests']['databaseSettingsDigest'],'ingressSettingsDigest':request['settingsDigests']['ingressSettingsDigest'],'ingressBlocked':True,'ingressFence':after},separators=(',',':')))
`;
export function createCompatibleSettingsReader({snapshot,runtimeSettingsBytes,ingressPolicyBytes,ingressControllerBytes,expectedControllerDigest,historicalDatabase,ssh,assertUnchanged,now=Date.now}){
 check([runtimeSettingsBytes,ingressPolicyBytes,ingressControllerBytes].every(b=>Buffer.isBuffer(b)&&b.length>0&&b.length<=131072)&&typeof ssh==='function'&&typeof assertUnchanged==='function','compatible_settings_reader_binding_unproven');
 check(hash(ingressControllerBytes)===expectedControllerDigest,'compatible_settings_program_unproven');
 const raw=JSON.parse(runtimeSettingsBytes),digests=activityRestorationDigests(raw),policy=JSON.parse(ingressPolicyBytes),e=contract.compatibleRecoveryEntrySchema.parse(snapshot.compatibleArtifactRecovery.currentEntry);
 check(raw.targetId===e.targetId&&(raw.database.containerId===e.database.containerId||(historicalDatabase?.role==='database'&&raw.database.containerId===historicalDatabase.containerId))&&policy.targetId===e.targetId&&policy.databaseContainerId===e.database.containerId&&policy.controllerProgramDigest===expectedControllerDigest
  &&digests.databaseSettingsDigest===e.databaseSettingsDigest&&digests.ingressSettingsDigest===e.ingressSettingsDigest,'compatible_settings_scope_unproven');
 const policyFields=['networkId','subnet','proxyId','proxyPid','namespaceDigest','databaseIpv4','proxyIpv4','ruleComment','originalRulesDigest'];
 check(policyFields.every(k=>policy[k]===e.ingressFence[k]),'compatible_settings_policy_unproven');
 const request={database:{...raw.database,containerId:e.database.containerId},policy,controllerDigest:expectedControllerDigest,settingsDigests:digests,roleSql:compatibleRoleReadSql(raw.database),sequenceSql:compatibleSequenceReadSql};
 const program=compatibleSettingsReadProgram.replace('__ROOST_CONTROLLER__',ingressControllerBytes.toString('base64')).replace('__ROOST_INPUT__',Buffer.from(JSON.stringify(request)).toString('base64'));
 check(Buffer.byteLength(program)<=131072,'compatible_settings_program_bound');
 return async({source,configuration,services})=>{
  const target=snapshot.manifest.deployment?.targets?.find(v=>v.targetId===e.targetId),allowed=[e.configuration,...(target?.configuration?[target.configuration]:[])];
  const current=allowed.find(v=>contract.releaseDigest(configuration)===contract.releaseDigest(v)),databaseRows=Array.isArray(services)?services.filter(v=>v.role==='database'):[];
  check(source?.container===e.database.containerId&&source.user===raw.database.applicationUser&&source.database===raw.database.applicationDatabase&&current
   &&Array.isArray(services)&&services.length>=1&&services.length<=5&&new Set(services.map(v=>v.name)).size===services.length&&databaseRows.length===1
   &&['containerId','imageDigest','mountDigest'].every(k=>databaseRows[0][k]===e.database[k])&&services.every(v=>current.services.some(d=>d.name===v.name&&d.role===v.role&&d.mountDigest===v.mountDigest)),'compatible_settings_current_binding_unproven');
  await assertUnchanged();const output=await ssh({command:'python3 -',stdin:program,timeoutMs:120000,maxOutputBytes:8192});await assertUnchanged();
  let value;try{check(typeof output==='string'&&Buffer.byteLength(output)<=8192,'compatible_settings_output_bound');value=JSON.parse(output);}catch{deny('compatible_settings_output_unproven');}
  const shape=z.object({observedAt:z.string().datetime(),sequenceDigest:hex,databaseSettingsDigest:hex,ingressSettingsDigest:hex,ingressBlocked:z.literal(true),ingressFence:ingressFenceContract.composeIngressFenceSchema}).strict();
  check(shape.safeParse(value).success,'compatible_settings_output_unproven');return qualifyCompatibleSettingsRead({snapshot,value,now:now()});
 };
}
/** The installation maps fixed readers only; packets cannot select a channel. */
export function createInstalledCompatibleFailureReader({snapshot,source},dependencies){
 const s=structuredClone(snapshot),m=s.manifest;
 check(s.compatibleArtifactRecovery&&['readCurrentState','readConfiguration','transport','readCompatibleRecoverySettings','probeHealth','assertClone'].every(k=>typeof dependencies?.[k]==='function'),
  'compatible_failure_fixed_dependencies_required');
 return async(_manifest,_binding,options)=>{
  check(contract.releaseDigest(_manifest)===contract.releaseDigest(m)&&_binding.releaseId===s.releaseId&&_binding.commit===s.commit
   &&_binding.candidateTree===s.candidateTree&&_binding.manifestDigest===s.manifestDigest&&z.object({operationId:z.string().uuid()}).strict().safeParse(options).success,'compatible_failure_reader_scope_changed');
  return readFixedCompatibleFailure({snapshot:s,operationId:options.operationId,source},{readCurrentState:dependencies.readCurrentState,
   readConfiguration:dependencies.readConfiguration,entryInspector:dependencies.entryInspector,candidateInspector:dependencies.candidateInspector,
   transport:async descriptor=>{check(descriptor.write===false,'compatible_failure_read_effect_forbidden');return dependencies.transport(descriptor);},
   readIngressFence:async input=>{const settings=qualifyCompatibleSettingsRead({snapshot:s,value:await dependencies.readCompatibleRecoverySettings(input),now:(dependencies.now??Date.now)()});return settings.ingressFence;},
   probeHealth:dependencies.probeHealth,assertClone:dependencies.assertClone,now:dependencies.now??Date.now});
 };
}


async function readFixedRecoveryEntry({old,previousState,closureReceipt,saved,cfg,materializationTemplate,assertClone,ssh,php,git,healthProbe,readDatabaseFence,readFingerprint,createInspector,now,readCurrentState}){
 const started=now();
  const entry=saved.composeRecovery,failure=entry.partialRollbackFailure;
  const target=old.manifest.deployment.targets[0],oldConfiguration=entry.configuration;
  const originalCurrent=await readCurrentState();
  const oldInspector=createInspector({targets:[{targetId:target.targetId,composePath:target.composePath,repositoryUrl:old.manifest.repository.url,branch:old.manifest.repository.defaultBranch,
   services:oldConfiguration.services.map(({name,role,source,expectedState})=>({name,role,source,expectedState}))}],
   sourcePins:oldConfiguration.sourcePins,configurationTemplate:{sha256:hash(materializationTemplate),bytesBase64:materializationTemplate.toString('base64')},transport:ssh,
   sourceForCommit:async(commit,composePath)=>{check(commit===oldConfiguration.gitCommit&&composePath===target.composePath,'recovery_only_old_source_changed');return hash(await git(['show',`${commit}:${composePath.slice(1)}`]));},
   treeForCommit:async commit=>{const out=(await git(['rev-parse',`${commit}^{tree}`],4096)).toString('utf8').trim();check(/^[a-f0-9]{40}$/.test(out),'tree_unproven');return out;},
   readDeployment:p=>php(queueRead,p),readControllerPolicy:async({controllerObserved})=>Object.entries(controllerObserved).every(([k,v])=>oldConfiguration.controllerPolicy[k]===v)?oldConfiguration.controllerPolicy:null});
  const candidateOperation=failure.candidateOperation,candidateExpected=failure.candidateEvidence.composeRecovery.queue;
  const candidateQueue=await php(queueRead,{targetId:target.targetId,deploymentId:candidateExpected.deploymentId});
  const oldQueue=await php(queueRead,{targetId:target.targetId,deploymentId:entry.deploymentId});
  const absenceId=failure.absenceEvidence.composeRecovery.deploymentId;
  const absent=await php(queueRead,{targetId:target.targetId,deploymentId:absenceId});
  check(contract.releaseDigest(candidateQueue)===contract.releaseDigest(candidateExpected)
   &&contract.releaseDigest(oldQueue)===contract.releaseDigest(entry.queue)&&absent===null,'recovery_only_original_queues_changed');
  const quiescent=async()=>{const q=await php("echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()]);");check(q.activeDeployments===0,'recovery_control_plane_active');};
  await quiescent();const before=await oldInspector.inspectLegacyBaseline(target.targetId,oldConfiguration.gitCommit);
  check(composeConfigurationDigest(before.configuration)===composeConfigurationDigest(oldConfiguration),'recovery_only_old_configuration_changed');
  const required=failure.presentRollbackImageDigests.slice().sort(),present=[];
  for(const ref of required)present.push((await ssh({command:`docker image inspect --format '{{.Id}}' -- ${quote(ref)}`})).trim());
  const partial=qualifyFailedComposePartialRuntime({snapshot:{...old,releaseId:previousState.release.id},operation:candidateOperation,queue:candidateQueue,
   observed:before,baselineServices:entry.baselineServices,presentRollbackImageDigests:present});
  check(contract.releaseDigest(partial.services)===contract.releaseDigest(entry.services)&&contract.releaseDigest(partial.images)===contract.releaseDigest(failure.images),'recovery_only_failed_runtime_changed');
  const db=before.services.find(r=>r.role==='database'),source={...cfg.source,container:db.containerId},fence=await readDatabaseFence(source),fp=await readFingerprint(source),health=await healthProbe({expectedCommit:old.commit});
  check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0&&fp.schemaDigest===old.manifest.baseline.schemaDigest
   &&fp.dataDigest===old.manifest.baseline.dataDigest&&health.healthy===false&&hex.safeParse(health.healthDigest).success,'recovery_only_data_fence_health_unproven');
  const after=await oldInspector.inspectLegacyBaseline(target.targetId,oldConfiguration.gitCommit),fenceAfter=await readDatabaseFence(source),fpAfter=await readFingerprint(source);await quiescent();
  check(contract.releaseDigest(before)===contract.releaseDigest(after)&&contract.releaseDigest(fence)===contract.releaseDigest(fenceAfter)
   &&contract.releaseDigest(fp)===contract.releaseDigest(fpAfter)
   &&contract.releaseDigest(candidateQueue)===contract.releaseDigest(await php(queueRead,{targetId:target.targetId,deploymentId:candidateExpected.deploymentId}))
   &&await php(queueRead,{targetId:target.targetId,deploymentId:absenceId})===null
   &&contract.releaseDigest(oldQueue)===contract.releaseDigest(await php(queueRead,{targetId:target.targetId,deploymentId:entry.deploymentId}))
   &&contract.releaseDigest(originalCurrent)===contract.releaseDigest(await readCurrentState()),'recovery_only_entry_changed_during_read');
  const currentEvidence=structuredClone(saved);currentEvidence.observedAt=new Date(now()).toISOString();currentEvidence.healthDigest=health.healthDigest;
  currentEvidence.composeRecovery.partialRollbackFailure.publicHealth.healthDigest=health.healthDigest;
  check(now()-started<=300000,'recovery_only_read_window_exceeded');
  qualifyFreshFailedEntryEvidence({oldSnapshot:old,failedOperation:previousState.journal.at(-1),saved,currentEvidence,now:now()});await assertClone();
  return{currentEvidence,closureReceipt,context:{oldSnapshot:old,previousState:structuredClone(previousState),configuration:oldConfiguration,inspector:oldInspector,candidateOperation,candidateQueue,baselineServices:entry.baselineServices,protectedImageDigests:required}};
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
 const retentionPolicy=cfg.imageRetention?qualifyComposeImageRetentionPolicy(JSON.parse(bytesFor(cfg.imageRetention.policy.file,cfg.imageRetention.policy.sha256)),s):null;
 const retentionJournalFile=retentionPolicy?composeImageRetentionJournalFile(cfg.imageRetention.policy.file,retentionPolicy,s.releaseId):null;
 const retentionDirectoryIdentity=retentionPolicy?identity(path.dirname(retentionJournalFile)):null;
 if(retentionPolicy)check(!inside(cfg.workspaceRoot,retentionJournalFile)&&!seals.has(retentionJournalFile),'retention_journal_path_invalid');
 const baseline=JSON.parse(bytesFor(cfg.baselineObservation.file,cfg.baselineObservation.sha256));
 const recovery=contract.releaseHasRecoveryOnly(s),compatible=s.compatibleArtifactRecovery!==undefined;
 if(compatible){const proof=qualifyCompatibleRecoveryBuildSnapshot(s);check(proof.workspaceId===(state.release.workspaceId??state.release.workspace_id)
   &&proof.issuerUserId===(state.release.issuerUserId??state.release.issuer_user_id),'compatible_authoritative_grant_owner_changed');
  check(cfg.compatibleRecovery&&cfg.compatibleIngress&&cfg.activity&&cfg.imageRetention&&(dependencies.readCompatibleRecoverySettings===undefined||typeof dependencies.readCompatibleRecoverySettings==='function'),'compatible_installation_dependencies_required');}
 else check(cfg.compatibleRecovery===undefined&&cfg.compatibleIngress===undefined,'compatible_installation_without_scope');
 check(s.recoveryOnly===undefined?cfg.recoveryEntryTemplate===undefined&&cfg.recoveryPreviousManifest===undefined&&cfg.recoveryMaterializationTemplate===undefined
  :recovery&&cfg.recoveryEntryTemplate&&cfg.recoveryPreviousManifest&&cfg.recoveryMaterializationTemplate,'recovery_only_installation_unproven');
 const previousFile=compatible?cfg.compatibleRecovery.previousManifest:cfg.recoveryPreviousManifest;
 const previousManifest=recovery||compatible?contract.manifestSchema.parse(JSON.parse(bytesFor(previousFile.file,previousFile.sha256))):null;
 if(recovery)check(contract.releaseDigest(previousManifest)===s.recoveryOnly.previousManifestDigest
  &&contract.releaseRecoveryOnlyManifestMatches(previousManifest,m),'recovery_only_previous_manifest_changed');
 if(compatible)check(contract.releaseDigest(previousManifest)===s.compatibleArtifactRecovery.prior.previousManifestDigest,'compatible_previous_manifest_changed');
 const historicalManifest=previousManifest??m,historicalTarget=historicalManifest.deployment.targets[0];
 const database=t.baseline.configuration.services.find(r=>r.role==='database');
 check(baseline.observed===true&&baseline.migrationSchemaVerified===true&&baseline.healthy===true
  &&baseline.commit===historicalTarget.baseline.commit&&baseline.tree===historicalTarget.baseline.tree&&baseline.configDigest===historicalTarget.baseline.configDigest
  &&(!(recovery||compatible)||baseline.observedAt===historicalManifest.baseline.observedAt)
  &&['schemaDigest','dataDigest','healthDigest'].every(k=>baseline[k]===historicalManifest.baseline[k])
  &&contract.releaseDigest(baseline.images)===contract.releaseDigest(historicalTarget.baseline.images)
  &&Array.isArray(baseline.services)&&new Set(baseline.services.map(r=>r.name)).size===baseline.services.length
  &&baseline.services.every(r=>historicalTarget.baseline.configuration.services.some(d=>d.name===r.name&&d.role===r.role&&d.mountDigest===r.mountDigest
   &&r.imageDigest===(d.source==='image'?d.imageDigest:historicalTarget.baseline.images.find(i=>i.name===r.name)?.imageDigest)&&/^[a-f0-9]{64}$/.test(r.containerId)))
  &&historicalTarget.baseline.configuration.services.every(d=>d.role==='migration'||baseline.services.some(r=>r.name===d.name)), 'baseline_observation_unproven');
 const baselineDatabase=baseline.services.find(r=>r.name===database.name);
 qualifyInstalledDatabaseSource({snapshot:s,baselineDatabase,database,container:cfg.source.container});
 const policies={},artifacts={};let recoveryContext=null,compatibleContext=null;
 const oldEntryTemplate=recovery?bytesFor(cfg.recoveryEntryTemplate.file,cfg.recoveryEntryTemplate.sha256):null;
 if(recovery)check(cfg.recoveryEntryTemplate.sha256===s.recoveryOnly.currentEvidence.composeRecovery.configuration.controllerPolicy?.artifactDigest,'recovery_only_entry_template_changed');
 const recoveryMaterializationTemplate=recovery?qualifyRecoveryMaterializationTemplate({previousManifest,bytes:bytesFor(cfg.recoveryMaterializationTemplate.file,cfg.recoveryMaterializationTemplate.sha256),reference:cfg.recoveryMaterializationTemplate}):null;
 const compatibleMaterializationTemplate=compatible?qualifyRecoveryMaterializationTemplate({previousManifest,bytes:bytesFor(cfg.compatibleRecovery.materializationTemplate.file,cfg.compatibleRecovery.materializationTemplate.sha256),reference:cfg.compatibleRecovery.materializationTemplate}):null;
 if(compatible){const entryBytes=bytesFor(cfg.compatibleRecovery.entryTemplate.file,cfg.compatibleRecovery.entryTemplate.sha256);
  check(hash(entryBytes)===s.compatibleArtifactRecovery.currentEntry.configuration.controllerPolicy?.artifactDigest,'compatible_entry_template_changed');}
 for(const mode of ['candidate','rollback']){
  const row=cfg.phases[mode];policies[mode]=composePhasePolicySchema.parse({...JSON.parse(bytesFor(row.policy.file,row.policy.sha256)),releaseId:state.release.id});
  artifacts[mode]=bytesFor(row.artifact.file,row.artifact.sha256);const p=policies[mode],expected=mode==='rollback'?t.rollbackConfiguration:t.configuration;
  check(p.phase===mode&&p.targetId===t.targetId&&p.commit===(mode==='rollback'?t.baseline.commit:s.commit)
   &&p.tree===(mode==='rollback'?t.baseline.tree:s.candidateTree)&&p.artifactDigest===row.artifact.sha256
   &&p.phaseConfigDigest===(mode==='rollback'?t.rollbackConfigDigest:t.configDigest)
   &&contract.releaseDigest(p.sourcePins)===contract.releaseDigest(cfg.sourcePins)
   &&contract.releaseDigest(composeControllerPolicyRecord(p))===contract.releaseDigest(expected.controllerPolicy),'phase_binding_changed');
  if(compatible)check(mode==='candidate'?p.candidateExecution?.mode==='qualified_immutable_images'&&p.candidateExecution.buildProofDigest===s.compatibleArtifactRecovery.replacement.buildReceiptDigest
    &&p.candidateExecution.replacementImagesDigest===composeReplacementImagesDigest(s.compatibleArtifactRecovery.replacement.images):p.candidateExecution===undefined,'compatible_phase_execution_changed');
  else check(p.candidateExecution===undefined,'immutable_candidate_without_compatible_scope');
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
 const readCompatibleRecoverySettings=compatible?(dependencies.readCompatibleRecoverySettings??(()=>{
   const file=fileURLToPath(new URL('./agent-host-release-compose-ingress-runtime.py',import.meta.url)),program=read(file),id=identity(file,false);
   check(Buffer.isBuffer(program)&&program.length>0&&program.length<=131072&&hash(program)===cfg.compatibleIngress.controllerProgramDigest,'compatible_settings_program_unproven');
   seals.set(file,{id,hash:hash(program)});
   return createCompatibleSettingsReader({snapshot:s,runtimeSettingsBytes:bytesFor(cfg.activity.runtimeSettings.file,cfg.activity.runtimeSettings.sha256),ingressPolicyBytes:bytesFor(cfg.compatibleIngress.policy.file,cfg.compatibleIngress.policy.sha256),ingressControllerBytes:program,expectedControllerDigest:cfg.compatibleIngress.controllerProgramDigest,historicalDatabase:baselineDatabase,ssh,assertUnchanged:assertClone,now:dependencies.now??Date.now});
  })()):undefined;
  let retentionJournalSource=null,lastRetentionEvidence=null;
 const readRetentionJournal=async()=>{check(identity(path.dirname(retentionJournalFile))===retentionDirectoryIdentity,'retention_directory_changed');
  if(!existsSync(retentionJournalFile)){check(!retentionJournalSource,'retention_journal_disappeared');return null;}
  const id=identity(retentionJournalFile,false),bytes=read(retentionJournalFile);check(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=1048576,'retention_journal_unproven');
  if(retentionJournalSource)check(id===retentionJournalSource.id&&hash(bytes)===retentionJournalSource.hash,'retention_journal_changed');retentionJournalSource={id,hash:hash(bytes)};return JSON.parse(bytes);};
 const writeRetentionJournal=async value=>{await assertClone();check(identity(path.dirname(retentionJournalFile))===retentionDirectoryIdentity,'retention_directory_changed');
  if(retentionJournalSource){check(identity(retentionJournalFile,false)===retentionJournalSource.id&&hash(read(retentionJournalFile))===retentionJournalSource.hash,'retention_journal_changed');}
  else check(!existsSync(retentionJournalFile),'retention_journal_collision');
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');check(bytes.length<=1048576,'retention_journal_unproven');writeFileSync(retentionJournalFile,bytes,{flag:retentionJournalSource?'w':'wx',mode:0o600,flush:true});
  const id=identity(retentionJournalFile,false);check(read(retentionJournalFile).equals(bytes)&&(!retentionJournalSource||id===retentionJournalSource.id),'retention_journal_readback_unproven');retentionJournalSource={id,hash:hash(bytes)};};
 const assertRetentionEffect=async effect=>{const current=await dependencies.readReleaseState(),last=current?.journal?.at(-1);
  check(current?.release?.id===s.releaseId&&['active','reconciliation_required'].includes(current.status)&&contract.releaseDigest(current.release.snapshot)===snapshotDigest
   &&last?.id===effect.operationId&&last.operation===effect.operation&&last.createdAt===effect.since&&!last.outcome
   &&['deploy_config','rollback_config','deploy','rollback'].includes(last.operation),'retention_durable_intent_required');};
 const imageRetention=retentionPolicy?createComposeImageRetention({policy:retentionPolicy,snapshot:s,ssh,readJournal:readRetentionJournal,writeJournal:writeRetentionJournal,
  assertEffect:assertRetentionEffect,now:dependencies.now??Date.now}):null;
 const php=async(program,payload={})=>{
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64');let value;
  try{value=JSON.parse(await ssh({command:'docker exec -i coolify php',stdin:`<?php\nerror_reporting(0);ini_set('display_errors','0');try{$p=json_decode(base64_decode('${encoded}',true),true,32,JSON_THROW_ON_ERROR);${bootstrap}${program}}catch(Throwable $e){echo '{"unproven":true}';exit(1);}`}));}catch(e){deny('response_unproven',e);}return value;
 };
 const git=async(args,maxBytes=131072)=>{await assertClone();return native('git',{argv:['--no-replace-objects','-c',`core.hooksPath=${process.platform==='win32'?'NUL':'/dev/null'}`,'-c','core.fsmonitor=false','-C',m.repository.canonicalDir,...args],cwd:m.repository.canonicalDir,
  environment:{...minimalReleaseEnvironment(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},durationMs:10000,maxBytes});};
 const targetDef={targetId:t.targetId,composePath:t.composePath,repositoryUrl:m.repository.url,branch:m.repository.defaultBranch,
  services:t.configuration.services.map(({name,role,source,expectedState})=>({name,role,source,expectedState}))};
 // Immutable commands consume their new executable artifact; Coolify still
 // stores the repository parser's build materialization as configuration.
 const materialization=compatible?compatibleMaterializationTemplate:artifacts.candidate;
 const configurationTemplate={sha256:hash(materialization),bytesBase64:materialization.toString('base64')};
 const inspector=(dependencies.createInspector??createComposeStateInspector)({targets:[targetDef],configurationTemplate,
  sourcePins:{queueHelper:cfg.sourcePins.queueHelper,deploymentJob:cfg.sourcePins.deploymentJob,controllerRenderer:cfg.sourcePins.controllerRenderer},transport:ssh,
  sourceForCommit:async(commit,composePath)=>{check(/^[a-f0-9]{40}$/.test(commit)&&composePath===t.composePath,'git_scope_invalid');return hash(await git(['show',`${commit}:${composePath.slice(1)}`]));},
  treeForCommit:async commit=>{check(/^[a-f0-9]{40}$/.test(commit),'git_scope_invalid');const out=(await git(['rev-parse',`${commit}^{tree}`],4096)).toString('utf8').trim();check(/^[a-f0-9]{40}$/.test(out),'tree_unproven');return out;},
  readDeployment:payload=>php(queueRead,payload),
  readControllerPolicy:async({controllerObserved})=>{
   const current=await dependencies.readReleaseState();
   check(current?.release?.id===s.releaseId&&contract.releaseDigest(current.release.snapshot)===snapshotDigest
    &&Array.isArray(current.journal),'controller_release_binding_changed');
   // An admitted baseline may retain the preceding release's rollback commands.
   // Their bytes do not identify the phase: the current durable journal does.
   const rollbackStarted=current.journal.some(r=>['rollback_config','rollback'].includes(r.operation));
   const records=[composeControllerPolicyRecord(policies.candidate),rollbackStarted
    ?composeControllerPolicyRecord(policies.rollback):t.baseline.configuration.controllerPolicy].filter(Boolean);
   return records.find(p=>Object.entries(controllerObserved).every(([key,value])=>p[key]===value))??null;
  },
  readImageBinding:async({queue,configuration})=>{check(queue.commit===t.baseline.commit&&configuration.controllerPolicy?.phase==='rollback'
   &&configuration.controllerPolicy.artifactDigest===policies.rollback.artifactDigest,'baseline_adoption_changed');
   return{kind:'sealed_baseline_adoption',commit:t.baseline.commit,tree:t.baseline.tree,artifactDigest:policies.rollback.artifactDigest,
    rendererDigest:cfg.sourcePins.controllerRenderer,images:t.baseline.images};},
  ...(compatible?{readCandidateImageBinding:async({queue,configuration})=>{qualifyCompatibleRecoveryBuildSnapshot(s);const p=policies.candidate;
   check(queue.commit===s.commit&&configuration.controllerPolicy?.phase==='candidate'&&configuration.controllerPolicy.artifactDigest===p.artifactDigest
    &&composeConfigurationDigest(configuration)===t.configDigest,'compatible_candidate_binding_changed');
   return{kind:'sealed_immutable_candidate',commit:s.commit,tree:s.candidateTree,artifactDigest:p.artifactDigest,rendererDigest:p.rendererDigest,
    buildProofDigest:p.candidateExecution.buildProofDigest,replacementImagesDigest:p.candidateExecution.replacementImagesDigest,images:s.compatibleArtifactRecovery.replacement.images};}}:{}),
 });
 const compatibleEntryInspector=compatible?(dependencies.createInspector??createComposeStateInspector)({targets:[targetDef],
  configurationTemplate:{sha256:hash(compatibleMaterializationTemplate),bytesBase64:compatibleMaterializationTemplate.toString('base64')},
  sourcePins:s.compatibleArtifactRecovery.currentEntry.configuration.sourcePins,transport:ssh,
  sourceForCommit:async(commit,composePath)=>{check(commit===s.compatibleArtifactRecovery.currentEntry.configuration.gitCommit&&composePath===t.composePath,'compatible_old_source_changed');return hash(await git(['show',`${commit}:${composePath.slice(1)}`]));},
  treeForCommit:async commit=>(await git(['rev-parse',`${commit}^{tree}`],4096)).toString('utf8').trim(),readDeployment:payload=>php(queueRead,payload),
  readControllerPolicy:async({controllerObserved})=>{const p=s.compatibleArtifactRecovery.currentEntry.configuration.controllerPolicy;return Object.entries(controllerObserved).every(([k,v])=>p[k]===v)?p:null;}}):null;
 const observeConfig=async()=>{
  const app=await httpsJson({url:`${new URL(cfg.coolify.origin).origin}/api/v1/applications/${t.targetId}`,method:'GET',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256});
  check(app?.uuid===t.targetId&&[s.commit,t.baseline.commit].includes(app.git_commit_sha),'live_source_pin_changed');
  const entry=recoveryContext?.configuration?.controllerPolicy;
  if(entry&&app.git_commit_sha===recoveryContext.configuration.gitCommit
   &&typeof app.docker_compose_custom_build_command==='string'&&typeof app.docker_compose_custom_start_command==='string'
   &&hash(Buffer.from(app.docker_compose_custom_build_command))===entry.buildCommandDigest
   &&hash(Buffer.from(app.docker_compose_custom_start_command))===entry.startCommandDigest)
   return recoveryContext.inspector.inspectConfiguration(t.targetId,app.git_commit_sha);
  const compatibleEntry=s.compatibleArtifactRecovery?.currentEntry.configuration;
  if(compatibleEntry&&app.git_commit_sha===compatibleEntry.gitCommit&&typeof app.docker_compose_custom_build_command==='string'&&typeof app.docker_compose_custom_start_command==='string'
   &&hash(Buffer.from(app.docker_compose_custom_build_command))===compatibleEntry.controllerPolicy.buildCommandDigest&&hash(Buffer.from(app.docker_compose_custom_start_command))===compatibleEntry.controllerPolicy.startCommandDigest)
   return compatibleEntryInspector.inspectConfiguration(t.targetId,app.git_commit_sha);
  return inspector.inspectConfiguration(t.targetId,app.git_commit_sha);
 };
 const databaseObservation=async()=>{
  const configuration=await observeConfig(),digest=composeConfigurationDigest(configuration);
  const oldEntry=recoveryContext&&digest===composeConfigurationDigest(recoveryContext.configuration);
  const compatibleEntry=compatible&&digest===composeConfigurationDigest(s.compatibleArtifactRecovery.currentEntry.configuration);
  const phase=digest===t.baseline.configDigest?'baseline':digest===t.configDigest?'candidate':digest===t.rollbackConfigDigest?'rollback':oldEntry?'recovery_entry':compatibleEntry?'compatible_entry':null;
  check(phase,'database_configuration_changed');
  const observed=await(oldEntry?recoveryContext.inspector:compatibleEntry?compatibleEntryInspector:inspector).inspectLegacyBaseline(t.targetId,configuration.gitCommit);
  check(composeConfigurationDigest(observed.configuration)===digest,'database_configuration_changed');
  const rows=observed.services.filter(r=>r.role==='database'),row=rows[0];
  check(rows.length===1&&row.name===database.name&&row.imageDigest===database.imageDigest&&row.mountDigest===database.mountDigest
   &&/^[a-f0-9]{64}$/.test(row.containerId)&&row.state==='running'&&row.health==='healthy','database_runtime_changed');
  if(row.containerId!==baselineDatabase.containerId){
   if(compatible&&observed.services.length===1){qualifyCompatiblePhysicalEntry({snapshot:s,observed,now:(dependencies.now??Date.now)()});
    const source={...cfg.source,container:row.containerId},fence=await readDatabaseFence(source),fp=await readFingerprint(source);
    check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0&&fp.schemaDigest===m.baseline.schemaDigest&&fp.dataDigest===m.baseline.dataDigest,'compatible_database_safety_unproven');
    return{row,observed,configDigest:digest};}
   if(recoveryContext){
    const current=await dependencies.readReleaseState(),last=current?.journal?.at(-1),entry=recoveryContext;
    check(current?.release?.id===s.releaseId&&contract.releaseDigest(current.release.snapshot)===snapshotDigest,'recovery_only_current_scope_changed');
    const configPending=current.journal.length===1&&last.operation==='rollback_config'&&!last.outcome;
    const rollbackPending=current.journal.length===2&&current.journal[0].operation==='rollback_config'
     &&(current.journal[0].outcome?.status==='succeeded'||current.journal[0].outcome?.status==='reconciled'&&current.journal[0].outcome.reconciledStatus==='succeeded')
     &&last.operation==='rollback'&&!last.outcome;
    const beforeIntent=current.journal.length===0;
    const oldRuntime=observed.services.every(r=>r.role==='database'||r.runtimeRevision===entry.oldSnapshot.commit);
    if((beforeIntent||configPending||rollbackPending)&&oldRuntime){
     check(digest===composeConfigurationDigest(entry.configuration)||!beforeIntent&&digest===t.rollbackConfigDigest,'recovery_only_runtime_configuration_changed');
     const proof=qualifyFailedComposePartialRuntime({snapshot:{...entry.oldSnapshot,releaseId:s.recoveryOnly.releaseId},operation:entry.candidateOperation,
      queue:entry.candidateQueue,observed,baselineServices:entry.baselineServices,presentRollbackImageDigests:entry.protectedImageDigests});
     check(contract.releaseDigest(proof.services)===contract.releaseDigest(s.recoveryOnly.currentEvidence.composeRecovery.services)
      &&contract.releaseDigest(proof.images)===contract.releaseDigest(s.recoveryOnly.currentEvidence.composeRecovery.partialRollbackFailure.images),'recovery_only_runtime_entry_changed');
     const source={...cfg.source,container:row.containerId},fence=await readDatabaseFence(source),fp=await readFingerprint(source);
     check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0
      &&fp.schemaDigest===m.baseline.schemaDigest&&fp.dataDigest===m.baseline.dataDigest,'recovery_only_database_safety_unproven');
     return{row,observed,configDigest:digest,partial:proof};
    }
   }
   const partial=await failedPartialContext(configuration,observed);
   if(partial){const source={...cfg.source,container:row.containerId},fence=await readDatabaseFence(source),fp=await readFingerprint(source);
    check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0
     &&fp.schemaDigest===m.baseline.schemaDigest&&fp.dataDigest===m.baseline.dataDigest,'partial_database_safety_unproven');
    return {row,observed,configDigest:digest,partial};}
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
 const readDatabaseFence=async(source)=>{
  const sql=`BEGIN READ ONLY; SELECT json_build_object('readOnlyFence',EXISTS(SELECT 1 FROM pg_db_role_setting s JOIN pg_database d ON d.oid=s.setdatabase JOIN pg_roles r ON r.oid=s.setrole WHERE d.datname=current_database() AND r.rolname=current_user AND 'default_transaction_read_only=on'=ANY(s.setconfig)), 'activeOtherSessions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state='active'),'ownedTransactions',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL AND state<>'idle'))::text; COMMIT;`;
  try{return JSON.parse(await ssh({command:`docker exec -i ${quote(source.container)} psql -X -qAt -v ON_ERROR_STOP=1 -U ${quote(source.user)} -d ${quote(source.database)}`,stdin:sql}));}catch(e){deny('maintenance_unproven',e);}
 };
 const safety=()=>withDatabase(async(source,{observed})=>{
  if(compatible&&observed.services.length===1)qualifyCompatiblePhysicalEntry({snapshot:s,observed,now:(dependencies.now??Date.now)()});
  else check(t.configuration.services.filter(r=>r.role==='cadence').every(r=>observed.services.some(x=>x.name===r.name&&x.role==='cadence'
   &&['paused','created','exited'].includes(x.state)&&x.exitCode===0&&x.health===null)),'cadence_activity_present');
  const row=await readDatabaseFence(source);
  check(row?.readOnlyFence===true&&row.activeOtherSessions===0,'maintenance_unproven');return{quiescent:true,...row,...await readFingerprint(source)};
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
  check(!compatible||mode==='candidate','compatible_historical_rollback_forbidden');
  await checkIntent({...options,rollback:mode==='rollback'});const p=policies[mode],configuration=await observeConfig();
  if(imageRetention){lastRetentionEvidence=await imageRetention.inspect();check(lastRetentionEvidence.pendingCreate===null,'retention_pending_effect_unproven');}
  check(composeConfigurationDigest(configuration)===p.phaseConfigDigest,'phase_configuration_changed');
  const observed=await inspector.inspectLegacyBaseline(t.targetId,configuration.gitCommit);
  const refs=[...new Set(p.services.flatMap(r=>[r.imageDigest,...(r.source==='image'?[r.imageRef]:[])]))];
  const identities=[];for(const ref of refs){const imageDigest=(await ssh({command:`docker image inspect --format '{{.Id}}' -- ${quote(ref)}`})).trim();identities.push({imageRef:ref,imageDigest});}
  const actual=[];for(const row of observed.services){check(/^[a-f0-9]{64}$/.test(row.containerId),'service_identity_unproven');
   const mounts=JSON.parse(await ssh({command:`docker container inspect --format '{{json .Mounts}}' -- ${quote(row.containerId)}`}));
   actual.push({name:row.name,imageDigest:row.imageDigest,mounts});}
  let entryQualification,replacementImageMetadata;
  if(compatible){qualifyCompatiblePhysicalEntry({snapshot:s,observed,now:(dependencies.now??Date.now)()});const images=[];
   for(const r of s.compatibleArtifactRecovery.replacement.images)images.push({name:r.name,observation:JSON.parse(await ssh({command:`docker image inspect --format '{{json .}}' -- ${quote(r.imageDigest)}`,maxOutputBytes:65536}))});
   replacementImageMetadata=qualifyCompatibleReplacementMetadata({snapshot:s,policy:p,images});
   const after=await inspector.inspectLegacyBaseline(t.targetId,configuration.gitCommit);check(contract.releaseDigest(after)===contract.releaseDigest(observed),'compatible_entry_changed_during_phase_read');
   entryQualification=compatibleCandidateEntryWitness({snapshot:s,policy:p,observed:after,observedAt:new Date((dependencies.now??Date.now)()).toISOString()});
  }
  return qualifyComposePhaseArtifact({policy:p,artifactBytes:artifacts[mode],configurationDigest:composeConfigurationDigest(configuration),sourcePins:cfg.sourcePins,
   services:actual,imageIdentities:identities,rendererDigest:cfg.sourcePins.controllerRenderer,
   settingsInvariantDigest:observed.controllerObserved.settingsInvariantDigest,runtimeInvariantDigest:observed.controllerObserved.runtimeInvariantDigest,
   ...(compatible?{entryQualification,replacementImageMetadata,now:(dependencies.now??Date.now)()}: {})});
 };
 const configurePhase=async({mode,commit})=>{
  check(!compatible||mode==='candidate','compatible_historical_rollback_forbidden');
  check(!recovery||mode==='rollback','recovery_only_candidate_configuration_forbidden');
  const intent=await checkIntent({rollback:mode==='rollback'},true);
  await assertClone();const before=await observeConfig(),prior=composeConfigurationDigest(before);
  const ordinaryPreimage=mode==='candidate'?[t.baseline.configDigest,t.configDigest].includes(prior):[t.configDigest,t.rollbackConfigDigest].includes(prior);
  if(compatible){check(compatibleContext,'compatible_entry_inspection_required');qualifyCompatibleRecoveryConfigurationPreimage({snapshot:s,current:await dependencies.readReleaseState(),configuration:before});
   await inspectCompatibleRecoveryEntry({previousState:compatibleContext.previousState});}
  else if(!ordinaryPreimage&&recovery&&mode==='rollback'){
   check(recoveryContext,'recovery_only_entry_inspection_required');
   qualifyRecoveryOnlyConfigurationPreimage({snapshot:s,current:await dependencies.readReleaseState(),configuration:before});
   await inspectRecoveryEntry({previousState:recoveryContext.previousState});
  }else check(ordinaryPreimage,'configuration_preimage_changed');
  if(mode==='candidate')check((await github.inspect(m,{allowArchived:false})).remoteBase===s.commit,'remote_commit_changed');
  check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');
  if(imageRetention)lastRetentionEvidence=await imageRetention.ensure({effect:{operationId:intent.id,operation:intent.operation,since:intent.createdAt}});
  check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');
  const p=policies[mode];check((await php(stagePhp,{targetId:t.targetId,name:composePhaseArtifactFile(p),bytes:artifacts[mode].toString('base64'),sha256:p.artifactDigest})).staged===true,'artifact_stage_unproven');
  check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');
  check(p.commit===commit,'phase_binding_changed');
  if(mode==='rollback'||p.candidateExecution){
   const checksum=composePhaseChecksumBytes(p);
   check((await php(stagePhp,{targetId:t.targetId,name:composePhaseArtifactFile(p)+'.sha256',bytes:checksum.toString('base64'),sha256:hash(checksum)})).staged===true,'artifact_stage_unproven');
   check((await checkIntent({rollback:true},true)).id===intent.id,'phase_intent_changed');
  }
  const url=`${new URL(cfg.coolify.origin).origin}/api/v1/applications/${t.targetId}`;
  await configureComposeWithQualifiedModelCas({policy:p,scope:{targetId:t.targetId,repositoryPath:new URL(m.repository.url).pathname.slice(1).replace(/\.git$/,''),branch:m.repository.defaultBranch},
   readApplication:()=>httpsJson({url,method:'GET',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256}),
   patchApplication:body=>httpsJson({url,method:'PATCH',token:coolifyCredential,certificateSha256:cfg.coolify.certificateSha256,body}),php,configurationTemplate,
   beforeEffect:async()=>{await assertClone();check((await checkIntent({rollback:mode==='rollback'},true)).id===intent.id,'phase_intent_changed');check(composeConfigurationDigest(await observeConfig())===prior,'configuration_preimage_changed');}});
 };
 const raw=createComposeReleaseGateway({releaseId:state.release.id,expected:{configuration:t.configuration,configDigest:t.configDigest},
  rollbackExpected:{configuration:t.rollbackConfiguration,configDigest:t.rollbackConfigDigest},candidatePolicy:policies.candidate,rollbackPolicy:policies.rollback,
  binding:{commit:s.commit,tree:s.candidateTree,baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree},sourcePins:pins,
  repositoryPath:new URL(m.repository.url).pathname.slice(1).replace(/\.git$/,''),transport,readConfiguration:observeConfig,configurationTemplate,
  readRuntime:inspector.readRuntime,readBuildImages:inspector.readBuildImages,assertSafety:safety,inspectRemote:async()=>({mainCommit:(await github.inspect(m,{allowArchived:false})).remoteBase}),
  prepareCandidatePhase:o=>preparePhase('candidate',o),prepareRollbackPhase:o=>preparePhase('rollback',o),
  configureTarget:configurePhase
 });
 const live=new Map();for(const row of state.journal??[])if(['deploy','rollback'].includes(row.operation))live.set(t.targetId,{operationId:row.id,since:row.createdAt,rollback:row.operation==='rollback',targetId:t.targetId});
 const failedPartialContext=async(configuration,observed)=>{
  const current=await dependencies.readReleaseState();check(current?.release?.id===s.releaseId&&contract.releaseDigest(current.release.snapshot)===snapshotDigest,'partial_release_changed');
  const index=current.journal.findIndex(r=>r.operation==='deploy'&&(!r.outcome||r.outcome.status==='uncertain'
   ||(r.outcome.status==='failed'||r.outcome.status==='reconciled'&&r.outcome.reconciledStatus==='failed')&&r.outcome.evidence?.composeRecovery?.kind==='queue_failed_partial'));
  if(index<0)return null;const operation=current.journal[index],later=current.journal.slice(index+1),digest=composeConfigurationDigest(configuration);
  if(![t.configDigest,t.rollbackConfigDigest].includes(digest)||later.some(r=>!['rollback_config','rollback'].includes(r.operation)))return null;
  if(operation.outcome?.evidence?.composeRecovery?.kind==='queue_failed_partial')check(contract.composeRecoveryEvidenceError(s,operation.outcome.evidence,operation)===null,'partial_saved_failure_unproven');
  const queue=await raw.readQueue({operationId:operation.id,since:operation.createdAt,targetId:t.targetId,rollback:false});if(queue?.status!=='failed')return null;
  // A rollback that has begun replacing services must use its own finished
  // queue qualification. Only the still-exact failed candidate is exempted.
  if(observed.services.some(r=>r.role!=='database'&&r.runtimeRevision!==s.commit))return null;
  const required=[...new Set([...t.baseline.images.map(x=>x.imageDigest),...t.configuration.services.filter(x=>x.source==='image').map(x=>x.imageDigest)])].sort(),present=[];
  for(const ref of required)present.push((await ssh({command:`docker image inspect --format '{{.Id}}' -- ${quote(ref)}`})).trim());
  const proof=qualifyFailedComposePartialRuntime({snapshot:s,operation,queue,observed,baselineServices:baseline.services,presentRollbackImageDigests:present});
  return{operation,queue,proof};
 };
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
  check(!compatible,'compatible_failure_requires_frozen_entry_reinspection');
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
  if(options.rollback&&queue===null){
   const partial=await failedPartialContext(configuration,before);
   if(partial?.operation.outcome?.evidence?.composeRecovery?.partial?.schemaVersion==='roost-compose-failed-partial-runtime-v2'){
    const candidateEvidence=partial.operation.outcome.evidence,safe=await safety(),health=await healthProbe({expectedCommit:s.commit});
    check(contract.releaseDigest(partial.proof.services)===contract.releaseDigest(candidateEvidence.composeRecovery.services)
     &&contract.releaseDigest(partial.proof.images)===contract.releaseDigest(candidateEvidence.composeRecovery.partial.images)
     &&safe.readOnlyFence===true&&safe.activeOtherSessions===0&&safe.ownedTransactions===0
     &&safe.schemaDigest===m.baseline.schemaDigest&&safe.dataDigest===m.baseline.dataDigest
     &&health.healthy===false&&hex.safeParse(health.healthDigest).success,'partial_data_fence_health_unproven');
    const after=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit),fresh=await failedPartialContext(after.configuration,after);await quiescent();
    check(fresh&&contract.releaseDigest(services)===contract.releaseDigest(normalize(after.services))
     &&contract.releaseDigest(partial.proof)===contract.releaseDigest(fresh.proof)
     &&composeConfigurationDigest(after.configuration)===expected&&await raw.readQueue(options)===null,'partial_changed_during_read');
    const composeRecovery={schemaVersion:'roost-compose-recovery-observation-v1',kind:'queue_absent_partial',releaseId:s.releaseId,
     operationId:options.operationId,since:options.since,targetId:t.targetId,phase:'rollback',requestedCommit:t.baseline.commit,
     requestedTree:t.baseline.tree,deploymentId:coolifyGitSetDeploymentId({releaseId:s.releaseId,operationId:options.operationId,targetId:t.targetId,rollback:true}),
     queue:null,controlPlaneQuiescent:true,configuration,baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree,
     migrationSchemaVerified:true,baselineServices,services:partial.proof.services,
     partialRollbackAbsence:{schemaVersion:'roost-compose-partial-rollback-absence-v1',candidateOperation:{id:partial.operation.id,
      operation:'deploy',createdAt:partial.operation.createdAt,intent:partial.operation.intent},candidateEvidence,
      candidateEvidenceDigest:contract.releaseDigest(candidateEvidence),images:partial.proof.images,databaseReadOnly:true,
      activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,protectedRollbackImages:partial.proof.protectedRollbackImages,
      presentRollbackImageDigests:partial.proof.presentRollbackImageDigests,publicHealth:{healthy:false,healthDigest:health.healthDigest},retryOrdinal:1}};
    const evidence={composeRecovery,deploymentIds:[],configDigest:m.rollback.configDigest,schemaDigest:safe.schemaDigest,dataDigest:safe.dataDigest,
     healthDigest:health.healthDigest,healthy:false,observedAt:new Date((dependencies.now??Date.now)()).toISOString(),
     currentServiceSetDigest:composeRuntimeSetDigest(composeRecovery.services),absenceVerified:true};
    check(contract.composePartialRollbackAbsenceJournalError(s,operation,evidence,current.journal)===null,'partial_observation_unproven');return evidence;
   }
  }
  if(options.rollback&&queue?.status==='failed'){
   const partial=await failedPartialContext(configuration,before),index=current.journal.findIndex(r=>r.id===operation.id),absence=current.journal[index-1];
   if(partial?.operation.outcome?.evidence?.composeRecovery?.partial?.schemaVersion==='roost-compose-failed-partial-runtime-v2'
    &&absence?.outcome?.evidence?.composeRecovery?.kind==='queue_absent_partial'){
    const candidateEvidence=partial.operation.outcome.evidence,absenceEvidence=absence.outcome.evidence,safe=await safety(),health=await healthProbe({expectedCommit:s.commit});
    check(contract.releaseDigest(partial.proof.services)===contract.releaseDigest(candidateEvidence.composeRecovery.services)
     &&contract.releaseDigest(partial.proof.images)===contract.releaseDigest(candidateEvidence.composeRecovery.partial.images)
     &&safe.readOnlyFence===true&&safe.activeOtherSessions===0&&safe.ownedTransactions===0
     &&safe.schemaDigest===m.baseline.schemaDigest&&safe.dataDigest===m.baseline.dataDigest
     &&health.healthy===false&&hex.safeParse(health.healthDigest).success,'partial_data_fence_health_unproven');
    const after=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit),fresh=await failedPartialContext(after.configuration,after);await quiescent();
    check(fresh&&contract.releaseDigest(services)===contract.releaseDigest(normalize(after.services))
     &&contract.releaseDigest(partial.proof)===contract.releaseDigest(fresh.proof)
     &&composeConfigurationDigest(after.configuration)===expected
     &&contract.releaseDigest(queue)===contract.releaseDigest(await raw.readQueue(options)),'partial_changed_during_read');
    const composeRecovery={schemaVersion:'roost-compose-recovery-observation-v1',kind:'queue_failed_rollback_partial',releaseId:s.releaseId,
     operationId:options.operationId,since:options.since,targetId:t.targetId,phase:'rollback',requestedCommit:t.baseline.commit,
     requestedTree:t.baseline.tree,deploymentId:queue.deploymentId,queue,controlPlaneQuiescent:true,configuration,
     baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree,migrationSchemaVerified:true,baselineServices,services:partial.proof.services,
     partialRollbackFailure:{schemaVersion:'roost-compose-failed-rollback-partial-v1',candidateOperation:{id:partial.operation.id,
      operation:'deploy',createdAt:partial.operation.createdAt,intent:partial.operation.intent},candidateEvidence,
      candidateEvidenceDigest:contract.releaseDigest(candidateEvidence),images:partial.proof.images,databaseReadOnly:true,
      activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,protectedRollbackImages:partial.proof.protectedRollbackImages,
      presentRollbackImageDigests:partial.proof.presentRollbackImageDigests,publicHealth:{healthy:false,healthDigest:health.healthDigest},retryOrdinal:1,
      absenceOperation:{id:absence.id,operation:'rollback',createdAt:absence.createdAt,intent:absence.intent},absenceEvidence,
      absenceEvidenceDigest:contract.releaseDigest(absenceEvidence)}};
    const evidence={composeRecovery,deploymentIds:[{targetId:t.targetId,deploymentId:queue.deploymentId}],configDigest:m.rollback.configDigest,
     schemaDigest:safe.schemaDigest,dataDigest:safe.dataDigest,healthDigest:health.healthDigest,healthy:false,
     observedAt:new Date((dependencies.now??Date.now)()).toISOString(),currentServiceSetDigest:composeRuntimeSetDigest(composeRecovery.services)};
    const saved=operation.outcome?.status==='reconciled'&&operation.outcome.reconciledStatus==='failed'
     ?operation.outcome.evidence:null;
    const stable=e=>{const v=structuredClone(e);delete v.observedAt;delete v.healthDigest;
     delete v.composeRecovery.partialRollbackFailure.publicHealth.healthDigest;return v;};
    check(contract.composeFailedRollbackPartialEvidenceError(s,evidence,operation)===null
     &&contract.composeFailedRollbackPartialJournalError(s,operation,saved??evidence,current.journal)===null
     &&(!saved||contract.releaseDigest(stable(saved))===contract.releaseDigest(stable(evidence))),'partial_observation_unproven');return evidence;
   }
  }
  if(!options.rollback&&queue?.status==='failed'&&before.services.length===5&&before.services.some(r=>r.role==='migration'&&r.exitCode===1)){
   const partial=await failedPartialContext(configuration,before);
   if(partial){const safe=await safety(),health=await healthProbe({expectedCommit:s.commit});
    check(safe.readOnlyFence===true&&safe.activeOtherSessions===0&&safe.ownedTransactions===0&&safe.schemaDigest===m.baseline.schemaDigest
     &&safe.dataDigest===m.baseline.dataDigest&&health.healthy===false&&hex.safeParse(health.healthDigest).success,'partial_data_fence_health_unproven');
    const after=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit);await quiescent();
    check(contract.releaseDigest(services)===contract.releaseDigest(normalize(after.services))&&composeConfigurationDigest(after.configuration)===expected
     &&contract.releaseDigest(queue)===contract.releaseDigest(await raw.readQueue(options)),'partial_changed_during_read');
    const r={schemaVersion:'roost-compose-recovery-observation-v1',kind:'queue_failed_partial',releaseId:s.releaseId,operationId:options.operationId,since:options.since,targetId:t.targetId,
     phase:'candidate',requestedCommit:s.commit,requestedTree:s.candidateTree,deploymentId:queue.deploymentId,queue,controlPlaneQuiescent:true,configuration,
     baselineCommit:t.baseline.commit,baselineTree:t.baseline.tree,migrationSchemaVerified:true,baselineServices,services:partial.proof.services,
     partial:{schemaVersion:partial.proof.sourceAttribution?'roost-compose-failed-partial-runtime-v2':'roost-compose-failed-partial-runtime-v1',...partial.proof,databaseReadOnly:true,activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,
      publicHealth:{healthy:false,healthDigest:health.healthDigest},candidateConfigDigest:t.configDigest}};
    delete r.partial.services;
    const evidence={composeRecovery:r,deploymentIds:[{targetId:t.targetId,deploymentId:queue.deploymentId}],artifactSetDigest:m.deployment.artifactSetDigest,
     configDigest:m.deployment.configDigest,schemaDigest:safe.schemaDigest,dataDigest:safe.dataDigest,healthDigest:health.healthDigest,healthy:false,
     observedAt:new Date((dependencies.now??Date.now)()).toISOString(),currentServiceSetDigest:composeRuntimeSetDigest(r.services)};
    check(contract.composeRecoveryEvidenceError(s,evidence,operation)===null,'partial_observation_unproven');
    if(imageRetention){check(partial.proof.sourceAttribution&&partial.proof.images.length===t.configuration.services.filter(d=>d.source==='built').length,'retention_failed_build_attribution_required');
     const current=await dependencies.readReleaseState(),last=current.journal.at(-1),effect=last.id===operation.id&&!last.outcome
      ?{operationId:last.id,operation:last.operation,since:last.createdAt}:null;
     lastRetentionEvidence=await imageRetention.ensure({additionalImages:partial.proof.images.map(i=>i.imageDigest),effect});
     check(lastRetentionEvidence.pendingCreate===null,'retention_pending_effect_unproven');
    }return evidence;
   }
  }
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
  check(!compatible,'compatible_configuration_absence_requires_down_entry_proof');
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
 const inspectRecoveryEntry=async({previousState})=>{
  await assertClone();check(recovery,'recovery_only_inspection_required');qualifyComposeConfigurationSchema((await php(composeConfigurationSchemaReadPhp)).schema);
  const qualified=qualifyRecoveryOnlyEntryState({snapshot:s,previousState}),originalCurrent=await dependencies.readReleaseState();
  check(originalCurrent?.release?.id===s.releaseId&&originalCurrent.status==='active'&&contract.releaseDigest(originalCurrent.release.snapshot)===snapshotDigest
   &&(originalCurrent.journal.length===0||originalCurrent.journal.length===1&&originalCurrent.journal[0].operation==='rollback_config'&&!originalCurrent.journal[0].outcome),'recovery_only_entry_phase_changed');
  const result=await readFixedRecoveryEntry({old:qualified.oldSnapshot,previousState,closureReceipt:qualified.closureReceipt,saved:s.recoveryOnly.currentEvidence,cfg,materializationTemplate:recoveryMaterializationTemplate,assertClone,ssh,php,git,healthProbe,readDatabaseFence,readFingerprint,createInspector:dependencies.createInspector??createComposeStateInspector,now:dependencies.now??Date.now,readCurrentState:dependencies.readReleaseState});
  qualifyRecoveryOnlyEntryState({snapshot:s,previousState,currentEvidence:result.currentEvidence,now:(dependencies.now??Date.now)()});recoveryContext=result.context;return{currentEvidence:result.currentEvidence,closureReceipt:result.closureReceipt};
 };
 const inspectCompatibleRecoveryEntry=async({previousState})=>{
  await assertClone();check(compatible,'compatible_inspection_required');qualifyComposeConfigurationSchema((await php(composeConfigurationSchemaReadPhp)).schema);
  const admittedAt=state.release.createdAt??state.release.created_at,q=qualifyCompatibleRecoveryEntryState({snapshot:s,previousState,admittedAt}),originalCurrent=await dependencies.readReleaseState();
  check(originalCurrent?.release?.id===s.releaseId&&['active','reconciliation_required'].includes(originalCurrent.status)&&contract.releaseDigest(originalCurrent.release.snapshot)===snapshotDigest
   &&(originalCurrent.release.createdAt??originalCurrent.release.created_at)===admittedAt,'compatible_entry_grant_changed');
  if(originalCurrent.journal.length<=4)check(originalCurrent.status==='active'&&['push','pr','review','merge','deploy_config'].includes(contract.nextCompatibleRecoveryOperation(originalCurrent)),'compatible_entry_phase_changed');
  else qualifyCompatibleRecoveryConfigurationPreimage({snapshot:s,current:originalCurrent,configuration:s.compatibleArtifactRecovery.currentEntry.configuration});
  const saved=s.compatibleArtifactRecovery.currentEntry,quiescent=async()=>{const q=await php("echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()]);");check(q.activeDeployments===0,'compatible_active_deployment');};
  await quiescent();const before=await compatibleEntryInspector.inspectLegacyBaseline(t.targetId,saved.configuration.gitCommit);
  check(composeConfigurationDigest(before.configuration)===composeConfigurationDigest(saved.configuration),'compatible_current_configuration_changed');
  const row=qualifyCompatiblePhysicalEntry({snapshot:s,observed:before,now:(dependencies.now??Date.now)()}),source={...cfg.source,container:row.containerId};
  const fence=await readDatabaseFence(source),fp=await readFingerprint(source),settings=qualifyCompatibleSettingsRead({snapshot:s,value:await readCompatibleRecoverySettings({source,configuration:before.configuration,services:before.services}),now:(dependencies.now??Date.now)()}),health=await healthProbe({expectedCommit:saved.configuration.gitCommit});
  check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0&&fp.schemaDigest===m.baseline.schemaDigest&&fp.dataDigest===m.baseline.dataDigest
   &&settings.sequenceDigest===m.postObservation.baselineSequenceDigest&&settings.databaseSettingsDigest===saved.databaseSettingsDigest&&settings.ingressSettingsDigest===saved.ingressSettingsDigest
   &&settings.ingressBlocked===true&&health.healthy===false&&hex.safeParse(health.healthDigest).success,'compatible_current_protected_settings_unproven');
  const availabilityProgram=`import json,subprocess\nids=set(subprocess.check_output(['docker','image','ls','--no-trunc','--quiet'],stderr=subprocess.DEVNULL,timeout=15).decode().split())\nassert len(ids)<=512 and all(__import__('re').fullmatch('sha256:[a-f0-9]{64}',v) for v in ids)\nrows=json.loads(${JSON.stringify(JSON.stringify(saved.imageAvailability.map(({name,imageDigest})=>({name,imageDigest}))))})\nprint(json.dumps([dict(v,present=v['imageDigest'] in ids) for v in rows]))\n`;
  const imageAvailability=JSON.parse(await ssh({command:'python3 -',stdin:availabilityProgram,maxOutputBytes:8192}));
  check(contract.releaseDigest(imageAvailability)===contract.releaseDigest(saved.imageAvailability),'compatible_historical_image_availability_changed');
  const after=await compatibleEntryInspector.inspectLegacyBaseline(t.targetId,saved.configuration.gitCommit),fenceAfter=await readDatabaseFence(source),fpAfter=await readFingerprint(source),settingsAfter=qualifyCompatibleSettingsRead({snapshot:s,value:await readCompatibleRecoverySettings({source,configuration:after.configuration,services:after.services}),now:(dependencies.now??Date.now)()});await quiescent();
  const settingsStable=value=>{const x=structuredClone(Object.fromEntries(['sequenceDigest','databaseSettingsDigest','ingressSettingsDigest','ingressBlocked','ingressFence'].map(k=>[k,value[k]])));if(x.ingressFence){delete x.ingressFence.observedAt;delete x.ingressFence.evidenceDigest;}return x;};
  check(contract.releaseDigest(before)===contract.releaseDigest(after)&&contract.releaseDigest(fence)===contract.releaseDigest(fenceAfter)&&contract.releaseDigest(fp)===contract.releaseDigest(fpAfter)
   &&contract.releaseDigest(settingsStable(settings))===contract.releaseDigest(settingsStable(settingsAfter))
   &&contract.releaseDigest(await dependencies.readReleaseState())===contract.releaseDigest(originalCurrent),'compatible_entry_changed_during_read');
  const observedAt=new Date((dependencies.now??Date.now)()).toISOString(),physical=Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]]));
  const inventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:t.targetId,observedAt,projectServiceSetComplete:true,physicalServices:[physical],digest:'0'.repeat(64)};inventory.digest=contract.compatibleRecoveryInventoryDigest(inventory);
  const currentEntry={...structuredClone(saved),observedAt,projectInventory:inventory,configuration:before.configuration,imageAvailability,schemaDigest:fp.schemaDigest,dataDigest:fp.dataDigest,
   sequenceDigest:settings.sequenceDigest,databaseSettingsDigest:settings.databaseSettingsDigest,ingressSettingsDigest:settings.ingressSettingsDigest,ingressBlocked:settings.ingressBlocked,
   ...(settings.ingressFence?{ingressFence:settings.ingressFence}:{}),publicHealth:{healthy:false,healthDigest:health.healthDigest}};
  currentEntry.services=saved.services.map(v=>v.presence==='present'?{...physical,presence:'present',declarationDigest:contract.releaseDigest(before.configuration.services.find(d=>d.name===v.name)),inventoryDigest:inventory.digest,observedAt}
   :{...v,declarationDigest:contract.releaseDigest(before.configuration.services.find(d=>d.name===v.name)),inventoryDigest:inventory.digest,observedAt});
  currentEntry.cadences=saved.cadences.map(v=>({...v,inventoryDigest:inventory.digest,observedAt}));currentEntry.evidenceDigest=contract.compatibleRecoveryEntryDigest(currentEntry);
  qualifyCompatibleRecoveryEntryState({snapshot:s,previousState,currentEntry,now:(dependencies.now??Date.now)(),admittedAt});await assertClone();
  compatibleContext={previousState:structuredClone(previousState)};return{currentEntry,closureReceipt:q.closureReceipt};
 };
 let activityFacade;
 const ingressIntentFile=(id,hold=false)=>{check(/^[a-f0-9-]{36}$/.test(id),'candidate_ingress_operation_invalid');return path.join(path.dirname(cfg.compatibleIngress.policy.file),`roost-compose-candidate-ingress-${s.releaseId}-${id}${hold?'-hold':''}.json`);};
 const ingressIntent=async(options,{write=false,proof}={})=>{
  await assertClone();const current=await dependencies.readReleaseState(),op=qualifyCandidateIngressScope(s,current,options.operationId,{writes:write});
  const context=live.get(t.targetId);check(context?.operationId===op.id&&!context.rollback,'candidate_ingress_context_changed');
  const hold=proof?.hold===true,q=await raw.readQueue(context),e=await inspector.readEvidence(q),r=qualifyCandidateIngressRuntime(s,current,e,op.id,{allowUnhealthyApp:hold}),source={...cfg.source,container:r.services.find(v=>v.role==='database').containerId};
  const fence=await readDatabaseFence(source);check(fence.readOnlyFence===true&&fence.activeOtherSessions===0&&fence.ownedTransactions===0,'candidate_ingress_database_fence_changed');
  const filename=ingressIntentFile(op.id,hold),parent=path.dirname(filename),parentIdentity=identity(parent),identityDigest=contract.releaseDigest(r.services.map(v=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','createdAt','commit','tree','deploymentId'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))).sort((a,b)=>a.name.localeCompare(b.name)));
  const basis={schemaVersion:'roost-compose-candidate-ingress-intent-v1',releaseId:s.releaseId,operationId:op.id,manifestDigest:s.manifestDigest,
   deploymentId:q.deploymentId,configurationDigest:composeConfigurationDigest(e.configuration),runtimeIdentityDigest:identityDigest,policySha256:cfg.compatibleIngress.policy.sha256,
   controllerProgramDigest:cfg.compatibleIngress.controllerProgramDigest,activityControllerDigest:contract.releaseDigest(cfg.activity)};
  const actualPolicy=JSON.parse(bytesFor(cfg.compatibleIngress.policy.file,cfg.compatibleIngress.policy.sha256));
  if(write&&hold){const previous=JSON.parse(bytesFor(ingressIntentFile(op.id)));check(Object.keys(basis).every(k=>previous[k]===basis[k])
    &&previous.retryAuthorized===false&&previous.beforeFence?.rulePresent===true&&!existsSync(filename),'candidate_hold_original_open_intent_required');
   const bytes=Buffer.from(JSON.stringify({...basis,createdAt:new Date().toISOString(),retryAuthorized:false,hold:true,openIntentDigest:hash(bytesFor(ingressIntentFile(op.id)))})),fd=openSync(filename,'wx',0o600);
   try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}check(identity(parent)===parentIdentity,'candidate_hold_parent_changed');
  }else if(write){check(proof&&proof.operationId===op.id&&hex.safeParse(proof.runtimeDigest).success&&hex.safeParse(proof.parityDigest).success
    &&proof.policyDigest===contract.releaseDigest(actualPolicy)
    &&proof.receipt?.rulePresent===true&&!inside(cfg.workspaceRoot,filename)&&!existsSync(filename),'candidate_ingress_no_retry_or_scope_unproven');
   ingressFenceContract.qualifyComposeIngressFence(proof.receipt,{targetId:t.targetId,databaseContainerId:source.container});
   check(['targetId','networkId','subnet','proxyId','proxyPid','namespaceDigest','databaseContainerId','databaseIpv4','proxyIpv4','ruleComment','originalRulesDigest'].every(k=>proof.receipt[k]===actualPolicy[k]),'candidate_ingress_actual_policy_changed');
   const bytes=Buffer.from(JSON.stringify({...basis,createdAt:new Date().toISOString(),runtimeDigest:proof.runtimeDigest,parityDigest:proof.parityDigest,policyDigest:proof.policyDigest,
    beforeFence:proof.receipt,retryAuthorized:false}));
   const fd=openSync(filename,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}check(identity(parent)===parentIdentity,'candidate_ingress_parent_changed');
  }
  const bytes=bytesFor(filename),saved=JSON.parse(bytes);
  check(Object.keys(basis).every(k=>saved[k]===basis[k])&&saved.retryAuthorized===false
   &&(hold?saved.hold===true&&saved.openIntentDigest===hash(bytesFor(ingressIntentFile(op.id))):saved.beforeFence?.rulePresent===true
   &&hex.safeParse(saved.runtimeDigest).success&&hex.safeParse(saved.parityDigest).success&&saved.policyDigest===contract.releaseDigest(actualPolicy)),'candidate_ingress_saved_intent_changed');
  await assertClone();return{intentDigest:hash(bytes)};
 };
 const adapter=createCoolifyComposeAdapter({now:dependencies.now,sleep:dependencies.sleep,gateway:{
  inspectConfiguration:observeConfig,
  inspectBaseline:async()=>{await assertClone();
   if(imageRetention){lastRetentionEvidence=await imageRetention.inspect();check(lastRetentionEvidence.pendingCreate===null,'retention_pending_effect_unproven');}
   // Read the installed controller capacity before the broker records a write
   // intent. Installation DDL remains an explicit operator operation.
   qualifyComposeConfigurationSchema((await php(composeConfigurationSchemaReadPhp)).schema);
   check(baseline.observed===true&&baseline.migrationSchemaVerified===true,'baseline_observation_unproven');const o=await inspector.inspectLegacyBaseline(t.targetId,t.baseline.commit);
   check(composeConfigurationDigest(o.configuration)===t.baseline.configDigest&&o.services.length===baseline.services.length
    &&o.services.every(r=>baseline.services.some(b=>b.name===r.name&&b.role===r.role&&b.imageDigest===r.imageDigest&&b.mountDigest===r.mountDigest
      &&(r.role!=='database'||r.containerId===b.containerId))),'baseline_runtime_changed');
   const f=await fingerprint(),h=await services(m,{baseline:true});return{...baseline,...f,healthDigest:h.healthDigest,healthy:h.healthy,
    ...(lastRetentionEvidence?{imageRetention:lastRetentionEvidence}:{})};},
  inspectRuntime:async(_id,options={})=>{const context=live.get(t.targetId);check(context,'current_queue_required');const q=await raw.readQueue(context);check(q?.status==='finished'&&q.commit!=='HEAD','finished_queue_required');const e=await inspector.readEvidence(q);
   if(imageRetention){const built=t.configuration.services.filter(r=>r.source==='built'),images=built.map(d=>{const row=e.binding.images.find(r=>r.name===d.name),runtime=e.runtime.services.find(r=>r.name===d.name);
     check(row&&runtime&&row.imageDigest===runtime.imageDigest&&row.commit===q.commit&&row.tree===(context.rollback?t.baseline.tree:s.candidateTree)&&row.deploymentId===q.deploymentId,'retention_finished_built_image_unproven');return row.imageDigest;});
    check(e.configuration.gitCommit===q.commit&&composeConfigurationDigest(e.configuration)===(context.rollback?t.rollbackConfigDigest:t.configDigest),'retention_runtime_configuration_changed');
    const current=await dependencies.readReleaseState(),operation=current.journal.find(r=>r.id===context.operationId);
    check(operation?.operation===(context.rollback?'rollback':'deploy')&&operation.intent?.parameters?.targetId===t.targetId&&operation.createdAt===context.since,'retention_exact_finished_intent_required');
    if(options.operationEffect===true){await checkIntent(context);check(!operation.outcome,'retention_effect_unresolved_intent_required');}
    const effect=options.operationEffect===true?{operationId:operation.id,operation:operation.operation,since:operation.createdAt}:null;
    lastRetentionEvidence=await imageRetention.ensure({additionalImages:images,effect});check(lastRetentionEvidence.pendingCreate===null,'retention_pending_effect_unproven');
   }
   return{targetId:t.targetId,...e,healthy:e.runtime.services.every(r=>['app','database'].includes(r.role)?r.health==='healthy':r.role==='migration'?r.state==='exited'&&r.exitCode===0:['paused','created','exited'].includes(r.state))};},
  readQueue:async o=>{live.set(t.targetId,o);return raw.readQueue(o);},inspectRecovery:recoveryObservation,inspectConfigurationAbsence:configurationAbsenceObservation,
  configure:(_id,mode)=>configurePhase({mode,commit:mode==='rollback'?t.baseline.commit:s.commit}),
  deployTarget:async o=>{live.set(t.targetId,o);return raw.deploy(o);},safety,checkServices:services,
  ...(compatible?{
   openCandidateIngress:async o=>{check(activityFacade&&!o.rollback,'candidate_ingress_adapter_required');const current=await dependencies.readReleaseState();
    qualifyCandidateIngressScope(s,current,o.operationId,{writes:true});await checkIntent(o);return activityFacade.openCandidateIngress({operationId:o.operationId,commit:s.commit,tree:s.candidateTree});},
   inspectCandidateIngress:async()=>{check(activityFacade,'candidate_ingress_adapter_required');const context=live.get(t.targetId);check(context&&!context.rollback,'candidate_ingress_context_required');
    const proof=await activityFacade.readCandidateIngress({operationId:context.operationId,commit:s.commit,tree:s.candidateTree});
    if(!proof.blocked)await ingressIntent(context);return proof;},
   holdCandidateIngress:async o=>{check(activityFacade&&!o.rollback,'candidate_hold_adapter_required');await checkIntent(o);
    return activityFacade.holdCandidateIngress({operationId:o.operationId,commit:s.commit,tree:s.candidateTree});}
  }:{}),
  inspectBackup:async()=>{check(['digest','bytes','capturedAt','restoreVerifiedAt','restoreDigest'].every(k=>backup?.[k]===m.backup[k]),'backup_changed');return backup;}
 }});
 const resources={assertClone,async inspectCapacity(){const c=JSON.parse(await ssh({command:capacityCommand})),q=await php("echo json_encode(['activeDeployments'=>App\\Models\\ApplicationDeploymentQueue::whereIn('status',['queued','in_progress'])->count()]);");
  check(Number.isSafeInteger(c.diskBytes)&&c.diskBytes>=cfg.capacity.minDiskBytes&&Number.isSafeInteger(c.memoryBytes)&&c.memoryBytes>=cfg.capacity.minMemoryBytes
   &&Number.isFinite(c.load1)&&c.load1<=cfg.capacity.maxLoad1&&q.activeDeployments===0,'capacity_unproven');return{available:true,...c,activeDeployments:0};},
  async inspectImageRetention(){check(imageRetention,'retention_installation_opt_in_required');await assertClone();
   const additional=lastRetentionEvidence?.additionalImages??[];lastRetentionEvidence=await imageRetention.inspect({additionalImages:additional});return structuredClone(lastRetentionEvidence);},
  async verifyRetention(){await assertClone();await observeConfig();check(m.cleanup.ownedResourceIds.length===0,'disposable_resources_unsupported');if(imageRetention){
   const current=await dependencies.readReleaseState(),observation=current.journal.filter(r=>r.operation==='observe'&&(r.outcome?.status==='succeeded'||r.outcome?.status==='reconciled'&&r.outcome.reconciledStatus==='succeeded')).at(-1),proof=observation?.outcome?.evidence;
   check(proof&&contract.composeEvidenceError(s,proof,observation.intent?.parameters?.mode==='rollback')===null,'retention_final_observation_unproven');
   const expected=t.configuration.services.filter(r=>r.source==='built'),row=proof.composeTargets?.find(r=>r.targetId===t.targetId);
   check(row?.binding?.queue?.status==='finished'&&row.binding.images.length===expected.length&&expected.every(d=>row.binding.images.some(i=>i.name===d.name)),'retention_final_complete_build_set');
   lastRetentionEvidence=await imageRetention.inspect({additionalImages:row.binding.images.map(i=>i.imageDigest)});check(lastRetentionEvidence.pendingCreate===null,'retention_pending_effect_unproven');
  }return{applicationActive:true,targetId:t.targetId,
   protectedResourcesDigest:contract.releaseDigest(ownership.protectedResourceIds),absenceVerified:true,resourceIds:[],...(lastRetentionEvidence?{imageRetention:structuredClone(lastRetentionEvidence)}:{})};},
  ownedResource(){deny('disposable_resources_unsupported');},cleanupLocal(){deny('permanent_repository_deletion_prohibited');},cleanupCoolifyApplication(){deny('permanent_application_deletion_prohibited');}};
 if(cfg.activity){
  const facade=createInstalledActivityTransport({manifest:m,binding:s,settings:cfg.activity,seed:activitySeed,compatibleIngress:cfg.compatibleIngress,
   installation:{sshHost:cfg.sshHost,frontendMetaName:cfg.health.frontendMetaName},baselineServices:baseline.services,
   readScopeBytes:async({file,sha256,maxBytes})=>{check(maxBytes===131072,'activity_file_bound_invalid');return bytesFor(file,sha256);},
   readRuntime:async options=>{
    await assertClone();const current=await dependencies.readReleaseState(),context=live.get(t.targetId);check(context,'activity_current_queue_required');
    const q=await raw.readQueue(context);check(q?.status==='finished'&&q.commit!=='HEAD','activity_finished_queue_required');
    const candidatePurpose=['candidate_ingress','candidate_hold'].includes(options.purpose),e=await inspector.readEvidence(q),r=candidatePurpose?qualifyCandidateIngressRuntime(s,current,e,options.operationId,{allowUnhealthyApp:options.purpose==='candidate_hold'}):qualifyActivityRuntimeEvidence(s,current,e);
    check(r.commit===options.commit&&r.tree===options.tree&&(candidatePurpose||current.journal.at(-1).id===options.operationId),'activity_runtime_version_changed');
    return {observedAt:new Date().toISOString(),targetId:t.targetId,...r};
   },fullFingerprint:fingerprint,readReleaseState:dependencies.readReleaseState,ssh,nativeProcess:native,assertNativeClosed:dependencies.assertNativeClosed,
   authorizeCandidateIngress:compatible?proof=>ingressIntent(proof,{write:true,proof}):undefined,
   probeIngressBlocked:()=>probeComposeIngressBlocked({publicUrl:m.deployment.url,health:cfg.health}),
   healthProbe:input=>observeRestoredComposeRuntime(input,{probeHealth:healthProbe,
    readCadenceTicks:options=>facade.readCadenceTicks(options),now:dependencies.now,sleep:dependencies.sleep})
  });
  activityFacade=facade;
  Object.assign(resources,createActivityReleaseAdapter({manifest:m,binding:s,settings:cfg.activity,seed:activitySeed,
   readState:dependencies.readReleaseState,transport:facade.transport}));
 }
 const readCompatibleFailure=compatible?createInstalledCompatibleFailureReader({snapshot:s,source:cfg.source},{readCurrentState:dependencies.readReleaseState,
  readConfiguration:observeConfig,entryInspector:compatibleEntryInspector,candidateInspector:inspector,transport:ssh,
  readCompatibleRecoverySettings,probeHealth:healthProbe,assertClone,now:dependencies.now??Date.now}):null;
 const compatibleMethods=compatible?{inspect:async()=>deny('compatible_historical_baseline_unavailable'),configureRollback:async()=>deny('compatible_historical_rollback_forbidden'),rollback:async()=>deny('compatible_historical_rollback_forbidden'),
  readCompatibleRecoveryFailure:readCompatibleFailure,
  health:async(a,b,o={})=>{check(o.rollback!==true,'compatible_historical_rollback_forbidden');return adapter.health(a,b,o);},
  observe:async(a,b,o={})=>{check(o.rollback!==true,'compatible_historical_rollback_forbidden');return adapter.observe(a,b,o);},
  reconcileDeployment:async(a,b,o={})=>{check(o.rollback!==true,'compatible_historical_rollback_forbidden');return adapter.reconcileDeployment(a,b,o);},
  reconcileConfiguration:async(a,b,o={})=>{check(o.rollback!==true,'compatible_historical_rollback_forbidden');return adapter.reconcileConfiguration(a,b,o);},
  configureCandidate:async(_m,_s)=>{check(contract.releaseDigest(_m)===contract.releaseDigest(m)&&_s.releaseId===s.releaseId&&_s.commit===s.commit,'compatible_candidate_scope_changed');
   await safety();check(['digest','bytes','capturedAt','restoreVerifiedAt','restoreDigest'].every(k=>backup?.[k]===m.backup[k]),'backup_changed');await configurePhase({mode:'candidate',commit:s.commit});
   check(composeConfigurationDigest(await observeConfig())===t.configDigest,'compatible_configuration_readback_unproven');
   return{commit:s.commit,deployedCommit:s.commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest};}}:{};
 return Object.freeze({coolify:Object.freeze({...adapter,...compatibleMethods,inspectRecoveryEntry,inspectCompatibleRecoveryEntry}),resources:Object.freeze(resources),assertClone,safety,
  ...(imageRetention?{imageRetention:Object.freeze({inspect:async()=>{lastRetentionEvidence=await imageRetention.inspect({additionalImages:lastRetentionEvidence?.additionalImages??[]});return structuredClone(lastRetentionEvidence);},
   lastEvidence:()=>lastRetentionEvidence?structuredClone(lastRetentionEvidence):null,journalFile:retentionJournalFile})}:{})});
}

// Persisted Coolify Compose uses the old candidate build document even when rollback commands are selected.
export function qualifyRecoveryMaterializationTemplate({previousManifest,bytes,reference}){const target=previousManifest?.deployment?.targets?.[0];check(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=131072&&reference?.sha256===hash(bytes)&&hash(bytes)===target?.configuration?.controllerPolicy?.artifactDigest,'recovery_materialization_template_changed');let doc;try{doc=JSON.parse(bytes);}catch{deny('recovery_materialization_template_invalid');}check(doc?.services&&!Array.isArray(doc.services)&&contract.releaseDigest(Object.keys(doc.services).sort())===contract.releaseDigest(target.configuration.services.map(r=>r.name).sort()),'recovery_materialization_template_services_changed');return bytes;}
