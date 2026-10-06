'use strict';
// Pure negative qualification. No transport, filesystem/process/key access or
// OS attestation. Installed readers and normal journals supply factual inputs.
const {z}=require('zod');
const id=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),sha=z.string().regex(/^[a-f0-9]{40}$/),image=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const name=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),at=z.string().datetime({offset:true});
const code='release_compatible_failure_unproven',check=(v,why=code)=>{if(!v)throw Error(why);},iso=v=>v instanceof Date?v.toISOString():v;
const read=(v,k)=>v?.[k]??v?.[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())];
const effective=o=>o?.status==='reconciled'?(o.reconciledStatus??o.reconciled_status):o?.status;
const ordered=rows=>rows.slice().sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
function createCompatibleFailureContract(base){
 for(const key of ['manifestSchema','intentSchema','compatibleArtifactRecoverySchema','composeConfigurationSchema','composeRuntimeServiceSchema','composeIngressFenceSchema'])check(typeof base?.[key]?.safeParse==='function','compatible_failure_base_schema_required');
 for(const key of ['releaseDigest','composeConfigurationDigest','compatibleRecoveryScopeDigest','qualifyComposeIngressFence'])check(typeof base?.[key]==='function','compatible_failure_base_digest_required');
 check(typeof base.composeRuntimeServiceSchema.omit==='function','compatible_failure_runtime_object_required');
 const d=base.releaseDigest,same=(a,b)=>d(a??null)===d(b??null),native=base.composeRuntimeServiceSchema.omit({commit:true,tree:true,deploymentId:true}).strict();
 const queue=z.object({targetId:name,deploymentId:name,commit:sha,status:z.enum(['queued','in_progress','finished','failed','cancelled-by-user']),createdAt:at,finishedAt:at.nullable()}).strict();
 const absence=z.object({name,role:z.enum(['app','migration','cadence']),source:z.literal('built'),mountDigest:hash,declarationDigest:hash,
  containerId:z.null(),imageDigest:z.null(),state:z.literal('absent'),absenceVerified:z.literal(true)}).strict();
 const inventory=z.object({schemaVersion:z.literal('roost-compatible-failure-project-inventory-v1'),targetId:name,observedAt:at,projectServiceSetComplete:z.literal(true),
  services:z.array(native).min(1).max(5),absentServices:z.array(absence).max(4),digest:hash}).strict();
 const scan=z.object({schemaVersion:z.literal('roost-compatible-failure-queue-scan-v1'),targetId:name,from:at,through:at,observedAt:at,
  scanComplete:z.literal(true),rows:z.array(queue).max(32),digest:hash}).strict();
 const metadata=z.object({name,imageDigest:image,buildRevision:sha,revisionLabel:sha,treeLabel:sha}).strict();
 const reference=z.object({operationId:id,outcomeId:id,evidenceDigest:hash,deploymentId:name}).strict();
 const marker=z.object({schemaVersion:z.literal('roost-compatible-recovery-negative-v1'),kind:z.enum(['configuration_absent','deployment_absent','deployment_failed','observation_failed']),
  releaseId:id,operationId:id,operation:z.enum(['deploy_config','deploy','observe']),since:at,requestId:id,intentDigest:hash,targetId:name,
  requestedCommit:sha,requestedTree:sha,phase:z.enum(['entry','candidate']),configuration:base.composeConfigurationSchema,queueScan:scan,currentQueue:queue.nullable(),
  projectInventory:inventory,imageMetadata:z.array(metadata).max(4),database:z.object({containerId:hash,imageDigest:image,mountDigest:hash,readOnlyFence:z.literal(true),activeOtherSessions:z.literal(0),ownedTransactions:z.literal(0)}).strict(),
  ingressFence:base.composeIngressFenceSchema,successfulDeployment:reference.optional(),observationSeconds:z.number().int().nonnegative().optional(),
  evidenceDigest:hash}).strict();
 const evidence=z.object({compatibleRecoveryFailure:marker,observedAt:at,configDigest:hash,schemaDigest:hash,dataDigest:hash,sequenceDigest:hash,
  healthDigest:hash,healthy:z.literal(false),currentServiceSetDigest:hash,deploymentIds:z.array(z.object({targetId:name,deploymentId:name}).strict()).max(1)}).strict();
 const without=(value,key)=>Object.fromEntries(Object.entries(value).filter(([k])=>k!==key));
 const inventoryDigest=v=>d(without(v,'digest')),scanDigest=v=>d(without(v,'digest')),markerDigest=v=>d(without(v,'evidenceDigest'));
 const servicesDigest=rows=>d(ordered(rows));
 const safe=fn=>(...args)=>{try{fn(...args);return null;}catch{return code;}};
 function context(snapshot){
  check(base.manifestSchema.safeParse(snapshot?.manifest).success&&base.compatibleArtifactRecoverySchema.safeParse(snapshot?.compatibleArtifactRecovery).success);
  const m=snapshot.manifest,r=snapshot.compatibleArtifactRecovery,t=m.deployment.targets[0];
  check(id.safeParse(snapshot.releaseId).success&&m.schemaVersion==='roost-release-manifest-v2'&&m.deployment.provider==='coolify_compose'&&m.purpose==='application_release'
   &&snapshot.manifestDigest===d(m)&&r.scopeAudit.scopeDigest===base.compatibleRecoveryScopeDigest(snapshot)
   &&r.replacement.commit===snapshot.commit&&r.replacement.tree===snapshot.candidateTree
   &&['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis'].every(k=>snapshot[k]===undefined)
   &&r.failurePolicy.mode==='freeze_protected_database'&&r.failurePolicy.automaticHistoricalRollback===false&&r.failurePolicy.dataRestoreAllowed===false
   &&r.failurePolicy.volumeDeletionAllowed===false&&r.failurePolicy.keepIngressBlocked===true&&r.failurePolicy.keepCadencesHeld===true);
  return{m,r,t};
 }
 function qualify(snapshot,input,operation,{now=Date.now(),readSuccessfulDeployment}={}){
  const e=evidence.parse(input),v=e.compatibleRecoveryFailure,{m,r,t}=context(snapshot),intent=base.intentSchema.parse(operation.intent),created=iso(read(operation,'createdAt'));
  const n=now instanceof Date?now.getTime():Number(now),epoch=s=>Date.parse(s),fresh=s=>Number.isFinite(epoch(s))&&epoch(s)<=n&&n-epoch(s)<=300000;
  check(Number.isFinite(n)&&fresh(e.observedAt)&&fresh(v.projectInventory.observedAt)&&fresh(v.queueScan.observedAt)&&epoch(e.observedAt)>=epoch(created));
  check(v.releaseId===snapshot.releaseId&&v.operationId===operation.id&&v.operation===operation.operation&&v.operation===intent.operation&&v.since===created
   &&v.requestId===intent.requestId&&v.intentDigest===d(intent)&&v.targetId===t.targetId&&v.requestedCommit===snapshot.commit&&v.requestedTree===snapshot.candidateTree
   &&intent.manifestDigest===snapshot.manifestDigest&&intent.commit===snapshot.commit&&intent.baseCommit===snapshot.baseCommit);
  if(v.operation==='observe')check(intent.parameters.mode==='candidate');
  else check(intent.parameters.commit===snapshot.commit&&intent.parameters.artifactSetDigest===m.deployment.artifactSetDigest
   &&intent.parameters.configDigest===m.deployment.configDigest&&intent.parameters.schemaDigest===m.deployment.schemaDigest
   &&(v.operation!=='deploy'||intent.parameters.targetId===t.targetId));
  check(v.evidenceDigest===markerDigest(v)&&v.projectInventory.digest===inventoryDigest(v.projectInventory)&&v.queueScan.digest===scanDigest(v.queueScan));
  check(v.configuration.targetId===t.targetId&&same(v.configuration,v.phase==='entry'?r.currentEntry.configuration:t.configuration));
  check(e.configDigest===d([{targetId:t.targetId,configDigest:base.composeConfigurationDigest(v.configuration)}])
   &&e.schemaDigest===m.baseline.schemaDigest&&e.dataDigest===m.baseline.dataDigest&&e.sequenceDigest===r.currentEntry.sequenceDigest);
  const inv=v.projectInventory,rows=inv.services,absent=inv.absentServices,decl=v.configuration.services,all=[...rows,...absent],db=rows.filter(q=>q.role==='database');
  check(inv.targetId===t.targetId&&epoch(inv.observedAt)<=epoch(e.observedAt)&&rows.length+absent.length===5
   &&new Set(all.map(q=>q.name)).size===5&&new Set(rows.map(q=>q.containerId)).size===rows.length
   &&same(all.map(q=>q.name).sort(),decl.map(q=>q.name).sort())&&e.currentServiceSetDigest===servicesDigest(rows));
  check(all.every(q=>{const p=decl.find(p=>p.name===q.name);return p&&p.role===q.role&&p.mountDigest===q.mountDigest;})
   &&absent.every(q=>q.declarationDigest===d(decl.find(p=>p.name===q.name))));
  check(db.length===1&&db[0].state==='running'&&db[0].health==='healthy'&&db[0].exitCode===0
   &&['containerId','imageDigest','mountDigest'].every(k=>db[0][k]===r.currentEntry.database[k]&&db[0][k]===v.database[k]));
  base.qualifyComposeIngressFence(v.ingressFence,{targetId:t.targetId,databaseContainerId:db[0].containerId,now:n});
  check(base.composeIngressFenceSchema.safeParse(r.currentEntry.ingressFence).success&&epoch(v.ingressFence.observedAt)<=epoch(e.observedAt)
   &&same(without(without(v.ingressFence,'observedAt'),'evidenceDigest'),without(without(r.currentEntry.ingressFence,'observedAt'),'evidenceDigest')));
  const built=rows.filter(q=>q.role!=='database');
  check(v.imageMetadata.length===built.length&&new Set(v.imageMetadata.map(q=>q.name)).size===built.length
   &&built.every(q=>{const expected=r.replacement.images.find(i=>i.name===q.name),actual=v.imageMetadata.find(i=>i.name===q.name);
    return expected&&actual&&q.imageDigest===expected.imageDigest&&actual.imageDigest===q.imageDigest&&actual.buildRevision===snapshot.commit
     &&actual.revisionLabel===snapshot.commit&&actual.treeLabel===snapshot.candidateTree
     &&(q.role!=='cadence'||['created','paused','exited'].includes(q.state)&&q.health===null&&q.exitCode===0);
   }));
  const qs=v.queueScan;check(qs.targetId===t.targetId&&qs.through===e.observedAt&&epoch(qs.observedAt)<=epoch(e.observedAt)
   &&epoch(qs.from)<=epoch(qs.through)&&new Set(qs.rows.map(q=>q.deploymentId)).size===qs.rows.length
   &&qs.rows.every(q=>q.targetId===t.targetId&&epoch(q.createdAt)>=epoch(qs.from)&&epoch(q.createdAt)<=epoch(qs.through)
    &&(q.finishedAt===null||epoch(q.finishedAt)>=epoch(q.createdAt)&&epoch(q.finishedAt)<=epoch(e.observedAt))));
  const absentKind=v.kind==='configuration_absent'||v.kind==='deployment_absent';
  if(absentKind){
   check(v.kind===(v.operation==='deploy_config'?'configuration_absent':v.operation==='deploy'?'deployment_absent':'invalid')
    &&v.phase===(v.operation==='deploy_config'?'entry':'candidate')&&v.currentQueue===null&&qs.rows.length===0&&qs.from===created
    &&v.successfulDeployment===undefined&&v.observationSeconds===undefined&&built.length===0&&absent.length===4&&e.deploymentIds.length===0);
  }else{
   check(v.phase==='candidate'&&v.currentQueue!==null&&qs.rows.length===1&&same(qs.rows[0],v.currentQueue));
   const q=v.currentQueue;let deploymentOperation=operation;
   if(v.kind==='observation_failed'){
    check(v.operation==='observe'&&v.successfulDeployment!==undefined&&Number.isInteger(v.observationSeconds)&&typeof readSuccessfulDeployment==='function');
    const prior=readSuccessfulDeployment({releaseId:snapshot.releaseId,operationId:v.successfulDeployment.operationId,outcomeId:v.successfulDeployment.outcomeId});
    check(prior&&prior.operation==='deploy'&&prior.id===v.successfulDeployment.operationId&&prior.outcome?.id===v.successfulDeployment.outcomeId
     &&effective(prior.outcome)==='succeeded'&&d(prior.outcome.evidence)===v.successfulDeployment.evidenceDigest
     &&(read(prior,'releaseId')===snapshot.releaseId)&&epoch(iso(read(prior,'createdAt')))<=epoch(created));
    const p=base.intentSchema.parse(prior.intent);check(p.operation==='deploy'&&p.manifestDigest===snapshot.manifestDigest&&p.commit===snapshot.commit
     &&p.baseCommit===snapshot.baseCommit&&p.parameters.targetId===t.targetId&&p.parameters.commit===snapshot.commit
     &&p.parameters.artifactSetDigest===m.deployment.artifactSetDigest&&p.parameters.configDigest===m.deployment.configDigest&&p.parameters.schemaDigest===m.deployment.schemaDigest);
    const pe=prior.outcome.evidence,images=pe.composeTargets?.[0]?.binding?.images,live=pe.composeTargets?.[0]?.runtime?.services?.filter(v=>r.replacement.images.some(i=>i.name===v.name));
    check(pe.healthy===true&&pe.deployedCommit===snapshot.commit&&pe.deployedTree===snapshot.candidateTree&&pe.artifactSetDigest===r.replacement.artifactSetDigest
     &&pe.configDigest===r.replacement.configurationDigest&&pe.schemaDigest===e.schemaDigest&&pe.dataDigest===e.dataDigest
     &&same(pe.deploymentIds,[{targetId:t.targetId,deploymentId:q.deploymentId}])&&v.successfulDeployment.deploymentId===q.deploymentId
     &&Array.isArray(images)&&same(ordered(images.map(i=>({name:i.name,imageDigest:i.imageDigest,commit:i.commit,tree:i.tree}))),ordered(r.replacement.images))
     &&Array.isArray(live)&&live.length===4&&same(ordered(live.map(i=>({name:i.name,imageDigest:i.imageDigest,commit:i.commit,tree:i.tree}))),ordered(r.replacement.images))
     &&pe.composeTargets?.length===1&&pe.composeTargets[0].targetId===t.targetId&&same(pe.composeTargets[0].binding.queue,q)
     &&pe.composeTargets[0].binding.commit===snapshot.commit&&pe.composeTargets[0].binding.tree===snapshot.candidateTree
     &&q.status==='finished'&&epoch(q.finishedAt)<=epoch(created));deploymentOperation=prior;
   }else check(v.kind==='deployment_failed'&&v.operation==='deploy'&&v.successfulDeployment===undefined&&v.observationSeconds===undefined&&q.status==='failed');
   const since=iso(read(deploymentOperation,'createdAt')),expected='r'+d([snapshot.releaseId,deploymentOperation.id,t.targetId,'candidate']).slice(0,23);
   check(q.deploymentId===expected&&q.commit===snapshot.commit&&q.finishedAt!==null&&qs.from===since
    &&epoch(q.createdAt)>=epoch(since)&&epoch(q.createdAt)<=epoch(q.finishedAt)
    &&built.every(row=>epoch(row.createdAt)>=epoch(q.createdAt)&&epoch(row.createdAt)<=epoch(q.finishedAt))
    &&same(e.deploymentIds,[{targetId:t.targetId,deploymentId:q.deploymentId}]));
  }
 }
 const error=safe(qualify);
 function outcomeError(snapshot,operation,outcome,options){
  const err=error(snapshot,outcome?.evidence,operation,options);if(err)return err;
  const absent=outcome.evidence.compatibleRecoveryFailure.kind.endsWith('_absent');
  return outcome.status==='reconciled'&&outcome.observationOnly===true&&outcome.reconciledStatus===(absent?'absent':'failed')?null:code;
 }
 function disposition(kind){check(['configuration_absent','deployment_absent','deployment_failed','observation_failed'].includes(kind));return Object.freeze({
  schemaVersion:'roost-compatible-negative-disposition-v1',terminalFreeze:true,outcome:kind.endsWith('_absent')?'absent':'failed',
  retryAllowed:false,rollbackAllowed:false,dataRestoreAllowed:false,successProven:false,releaseAuthority:false,keepIngressBlocked:true,keepCadencesHeld:true});}
 function result(snapshot,e,operation,options){const err=error(snapshot,e,operation,options);
  return err?Object.freeze({status:'uncertain',resolved:false,reason:code,retryAllowed:false,rollbackAllowed:false,releaseAuthority:false}):Object.freeze({
   status:'reconciled',reconciledStatus:e.compatibleRecoveryFailure.kind.endsWith('_absent')?'absent':'failed',observationOnly:true,evidence:e,disposition:disposition(e.compatibleRecoveryFailure.kind)});}
 return Object.freeze({compatibleFailureEvidenceSchema:evidence,compatibleFailureMarkerSchema:marker,compatibleFailureProjectInventorySchema:inventory,compatibleFailureQueueScanSchema:scan,
  compatibleFailureInventoryDigest:inventoryDigest,compatibleFailureQueueScanDigest:scanDigest,compatibleFailureMarkerDigest:markerDigest,compatibleFailureServiceSetDigest:servicesDigest,
  compatibleFailureEvidenceError:error,compatibleFailureOutcomeError:outcomeError,compatibleFailureDisposition:disposition,qualifyCompatibleFailureResult:result});
}
module.exports={createCompatibleFailureContract};
