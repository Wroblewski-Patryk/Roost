// Controlled broker + real Compose adapter. Synthetic evidence only; no native
// processes, API, credentials, Git writes or deployments are performed.
import test from 'node:test';import assert from 'node:assert/strict';import{randomUUID,createHash}from'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';import compose from './lib/agent-host-release-compose-state.cjs';
import{fixture,hash,image}from'./fixtures/release-compose-contract.cjs';
import{runReleaseStep,nextReleaseOperation}from'./lib/agent-host-release-broker.mjs';
import{createCoolifyComposeAdapter}from'./lib/agent-host-release-coolify-compose.mjs';
import{coolifyGitSetDeploymentId}from'./lib/agent-host-release-coolify-git-set-gateway.mjs';
const H=hash('9'),digest=contract.releaseDigest,clone=structuredClone;
function basis({ownedResource=false}={}){const epoch=Date.now()-600000,atOffset=ms=>new Date(epoch+ms).toISOString(),f=fixture(),{m,s,target:t}=f,extra={name:'proactive',role:'cadence',source:'built',expectedState:'paused',mountDigest:hash('5')};
 for(const cfg of [t.configuration,t.baseline.configuration,t.rollbackConfiguration])cfg.services.push(clone(extra));
 t.baseline.images.push({name:'proactive',imageDigest:image('4')});m.cleanup.protectedResourceIds.push(image('4'),hash('5'));
 if(ownedResource)m.cleanup.ownedResourceIds.push('owned-recovery-fixture');
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);
 for(const [key,c]of[['deployment',t.configDigest],['baseline',t.baseline.configDigest],['rollback',t.rollbackConfigDigest]])m[key].configDigest=digest([{targetId:t.targetId,configDigest:c}]);
 m.deployment.artifactSetDigest=contract.sourceArtifactDigest(m,s);m.baseline.artifactSetDigest=contract.sourceArtifactDigest(m,s,'baseline');m.rollback.artifactSetDigest=contract.sourceArtifactDigest(m,s,true);
 const releaseId=randomUUID(),manifestDigest=digest(m),params=(value,target=false)=>({commit:value.commit??s.commit,artifactSetDigest:value.artifactSetDigest,configDigest:value.configDigest,schemaDigest:value.schemaDigest,...(target?{targetId:t.targetId}:{})}),
 intent=(operation,parameters)=>({requestId:randomUUID(),operation,manifestDigest,commit:s.commit,baseCommit:s.baseCommit,expectedVersion:H,
  observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest},parameters}),
 candidate={id:randomUUID(),operation:'deploy',createdAt:atOffset(180000),intent:intent('deploy',params(m.deployment,true))},
 candidateQueueId=coolifyGitSetDeploymentId({releaseId,operationId:candidate.id,targetId:t.targetId,rollback:false}),
 baselineServices=f.evidence('baseline').composeTargets[0].runtime.services.filter(r=>r.role!=='migration').map(row=>Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]]))),
 services=t.configuration.services.map((d,i)=>({name:d.name,role:d.role,containerId:hash(['6','7','8','9','a'][i]),imageDigest:d.source==='image'?d.imageDigest:image('f'),mountDigest:d.mountDigest,
  state:d.role==='database'?'running':d.role==='migration'?'exited':'created',health:d.role==='database'?'healthy':null,exitCode:d.role==='migration'?1:0,createdAt:atOffset(182000),
  ...(d.source==='built'?{commit:s.commit,tree:s.candidateTree,deploymentId:candidateQueueId}:{})})),
 images=services.filter(r=>r.role!=='database').map(({name,imageDigest,commit,tree,deploymentId})=>({name,imageDigest,commit,tree,deploymentId,
  imageRef:`${t.targetId}_${name}:${s.commit}`,createdAt:atOffset(181000),buildRevision:'unknown',revisionLabel:null,treeLabel:null})),
 protectedRollbackImages=clone(t.baseline.images),presentRollbackImageDigests=[...new Set([...t.baseline.images.map(r=>r.imageDigest),image('e')])].sort(),
 partial={schemaVersion:'roost-compose-failed-partial-runtime-v2',images,candidateConfigDigest:t.configDigest,databaseReadOnly:true,activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,
  protectedRollbackImages,presentRollbackImageDigests,publicHealth:{healthy:false,healthDigest:hash('0')},sourceAttribution:'failed_queue_exact_reference_and_runtime_environment',candidateCodeProvenanceVerified:false},
 recovery={schemaVersion:'roost-compose-recovery-observation-v1',kind:'queue_failed_partial',releaseId,operationId:candidate.id,since:candidate.createdAt,targetId:t.targetId,phase:'candidate',requestedCommit:s.commit,requestedTree:s.candidateTree,deploymentId:candidateQueueId,
  queue:{targetId:t.targetId,deploymentId:candidateQueueId,commit:s.commit,status:'failed',createdAt:atOffset(181000),finishedAt:atOffset(185000)},controlPlaneQuiescent:true,configuration:clone(t.configuration),baselineCommit:s.baseCommit,baselineTree:s.baseTree,migrationSchemaVerified:true,baselineServices,services,partial},
 candidateEvidence={composeRecovery:recovery,deploymentIds:[{targetId:t.targetId,deploymentId:candidateQueueId}],artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,healthDigest:hash('0'),healthy:false,observedAt:atOffset(190000),currentServiceSetDigest:compose.composeRuntimeSetDigest(services)},
 configuration={id:randomUUID(),operation:'rollback_config',createdAt:atOffset(240000),intent:intent('rollback_config',params(m.rollback)),outcome:{status:'succeeded',evidence:{deployedCommit:s.baseCommit,artifactSetDigest:m.rollback.artifactSetDigest,configDigest:m.rollback.configDigest,schemaDigest:m.rollback.schemaDigest,observedAt:atOffset(250000)}}},
 rollback={id:randomUUID(),operation:'rollback',createdAt:atOffset(300000),intent:intent('rollback',params(m.rollback,true)),outcome:{status:'uncertain',evidence:{observedAt:atOffset(310000)}}};
 candidate.outcome={status:'failed',evidence:candidateEvidence};
 const at=new Date().toISOString(),snapshot={...s,releaseId,manifestDigest,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:H,releaserRevision:at,expiresAt:new Date(Date.now()+3600000).toISOString(),readinessDigest:H,configurationDigest:H},
 state={release:{id:releaseId,manifestDigest,snapshot:Object.fromEntries(Object.entries(snapshot).filter(([key])=>key!=='releaseId'))},status:'active',expectedVersion:H,journal:[...['push','pr','review','merge','deploy_config'].map(operation=>({id:randomUUID(),operation,intent:{parameters:{}},outcome:{status:'succeeded'}})),candidate,configuration,rollback]};
 return{...f,s:snapshot,candidate,candidateEvidence,configuration,rollback,state,params,intent};}
function absence(f,operation=f.rollback){const p=f.candidateEvidence.composeRecovery.partial,r=f.candidateEvidence.composeRecovery,
 recovery={...clone(r),kind:'queue_absent_partial',operationId:operation.id,since:operation.createdAt,phase:'rollback',requestedCommit:f.s.baseCommit,requestedTree:f.s.baseTree,
  deploymentId:coolifyGitSetDeploymentId({releaseId:f.s.releaseId,operationId:operation.id,targetId:f.target.targetId,rollback:true}),queue:null,configuration:clone(f.target.rollbackConfiguration)};
 delete recovery.partial;recovery.partialRollbackAbsence={schemaVersion:'roost-compose-partial-rollback-absence-v1',candidateOperation:{id:f.candidate.id,operation:'deploy',createdAt:f.candidate.createdAt,intent:clone(f.candidate.intent)},candidateEvidence:clone(f.candidateEvidence),candidateEvidenceDigest:digest(f.candidateEvidence),images:clone(p.images),databaseReadOnly:true,activeOtherSessions:0,ownedTransactions:0,projectServiceSetComplete:true,protectedRollbackImages:clone(p.protectedRollbackImages),presentRollbackImageDigests:clone(p.presentRollbackImageDigests),publicHealth:{healthy:false,healthDigest:hash('0')},retryOrdinal:1};
 return{composeRecovery:recovery,deploymentIds:[],configDigest:f.m.rollback.configDigest,schemaDigest:f.m.baseline.schemaDigest,dataDigest:f.m.baseline.dataDigest,healthDigest:hash('0'),healthy:false,observedAt:new Date().toISOString(),currentServiceSetDigest:compose.composeRuntimeSetDigest(r.services),absenceVerified:true};}
function setup(options){const f=basis(options),calls=[],queues=new Map(),state=f.state;let absenceEvidence=absence(f),failDispatch=false;
 const runtime=o=>{const row=f.evidence(true).composeTargets[0],q=queues.get(o.operationId);assert(q);row.runtime.deploymentId=q.deploymentId;row.binding.deploymentId=q.deploymentId;row.binding.queue=clone(q);
  for(const service of row.runtime.services){if(service.role==='database'){Object.assign(service,f.candidateEvidence.composeRecovery.services.find(r=>r.role==='database'));continue;}
   service.containerId=createHash('sha256').update(q.deploymentId+service.name).digest('hex');service.createdAt=q.createdAt;service.deploymentId=q.deploymentId;}
  for(const image of row.binding.images)image.deploymentId=q.deploymentId;return {...row,healthy:true};},
 gateway={inspectConfiguration:async()=>clone(f.target.rollbackConfiguration),inspectBaseline:async()=>{throw Error('baseline replay forbidden');},inspectBackup:async()=>f.m.backup,
  readQueue:async o=>{calls.push({kind:'queue_read',o});return clone(queues.get(o.operationId)??null);},
  inspectRecovery:async o=>{calls.push({kind:'absence_read',o});return clone(absenceEvidence);},
  configure:async()=>{calls.push({kind:'config_replay'});throw Error('config replay forbidden');},
  deployTarget:async o=>{calls.push({kind:o.rollback?'rollback_dispatch':'candidate_dispatch',o});assert.equal(o.rollback,true);if(failDispatch)throw Error('lost response');
   queues.set(o.operationId,{targetId:o.targetId,deploymentId:o.deploymentId,commit:f.s.baseCommit,status:'finished',createdAt:o.since,finishedAt:o.since});},
  inspectRuntime:async(_target,o)=>{calls.push({kind:'runtime_read',o});const op=state.journal.at(-1);return runtime({...o,operationId:op.id});},
  safety:async()=>({quiescent:true,schemaDigest:f.m.baseline.schemaDigest,dataDigest:f.m.baseline.dataDigest}),
  checkServices:async()=>({healthy:true,healthDigest:f.m.baseline.healthDigest,dataDigest:f.m.baseline.dataDigest})},
 adapter=createCoolifyComposeAdapter({gateway,now:()=>Date.now(),sleep:async()=>{throw Error('unexpected wait');}}),
 api=async(route,{body})=>{calls.push({kind:'api',route,body});if(route.endsWith('/operations')){const op={id:randomUUID(),operation:body.operation,createdAt:new Date().toISOString(),intent:body,outcome:null};state.journal.push(op);return{...state,operation:op,replayed:false};}
  const op=state.journal.find(r=>route.includes(r.id));assert(op);op.outcome=body;return state;},
 args={state,client:{hostId:f.s.hostId,agentId:f.s.releaserAgentId},api,coolify:adapter,assertWriter:async()=>calls.push({kind:'writer'}),inspectCheckout:async()=>calls.push({kind:'checkout_read'}),
  github:{inspect:async()=>({remoteBase:f.s.commit,remoteTree:f.s.candidateTree}),push:async()=>{calls.push({kind:'Git_replay'});throw Error('Git replay forbidden');},reconcile:async()=>{throw Error('Git reconcile forbidden');}},resources:{inspectCapacity:async()=>calls.push({kind:'capacity_read'})}};
 return{...f,calls,queues,gateway,adapter,args,setEvidence:e=>{absenceEvidence=e;},setDispatchFailure:()=>{failDispatch=true;},nextAbsence:()=>absence(f,state.journal.at(-1))};}
const noEffects=x=>assert.equal(x.calls.filter(c=>['rollback_dispatch','candidate_dispatch','config_replay','Git_replay'].includes(c.kind)).length,0);
test('controlled full v2 partial/rollback-config/absence fixture qualifies both complete wire and actual persisted lineage',()=>{const x=setup(),e=absence(x);
 assert.equal(contract.composeFailedPartialEvidenceError(x.s,x.candidateEvidence,x.candidate),null);
 assert.equal(contract.composePartialRollbackAbsenceEvidenceError(x.s,e,x.rollback),null);assert.equal(contract.composePartialRollbackAbsenceJournalError(x.s,x.rollback,e,x.state.journal),null);
 assert.equal(e.healthy,false);assert.equal(e.deployedCommit,undefined);assert.deepEqual(e.deploymentIds,[]);
});
test('uncertain rollback reconciles ABSENT through reads only; new fresh rollback performs exactly one dispatch without Git/candidate/config replay',async()=>{const x=setup(),before=x.state.journal.length;
 assert.equal(nextReleaseOperation(x.state),'reconcile');await runReleaseStep({...x.args,reconciliationOnly:true});noEffects(x);
 assert.equal(x.state.journal.length,before);assert.equal(x.rollback.outcome.status,'reconciled');assert.equal(x.rollback.outcome.reconciledStatus,'absent');assert.equal(x.rollback.outcome.observationOnly,true);
 assert.deepEqual(x.calls.find(c=>c.kind==='absence_read').o.operationIntent,x.rollback.intent);assert.equal(nextReleaseOperation(x.state),'rollback');
 await runReleaseStep(x.args);assert.equal(x.calls.filter(c=>c.kind==='rollback_dispatch').length,1);assert.equal(x.calls.filter(c=>['candidate_dispatch','config_replay','Git_replay'].includes(c.kind)).length,0);
 const fresh=x.state.journal.at(-1);assert.notEqual(fresh.id,x.rollback.id);assert.equal(fresh.operation,'rollback');assert.equal(fresh.outcome.status,'succeeded');assert.equal(nextReleaseOperation(x.state),'observe');
 assert.equal(x.state.journal.filter(o=>o.operation==='deploy').length,1);assert.equal(x.state.journal.filter(o=>o.operation==='rollback_config').length,1);
});
test('reconciliationOnly with already proven absence grants no effect; fresh intent remains a separate call',async()=>{const x=setup();await runReleaseStep({...x.args,reconciliationOnly:true});
 const before=x.state.journal.length,r=await runReleaseStep({...x.args,reconciliationOnly:true});assert.equal(r.reconciliationOnlyComplete,true);assert.equal(x.state.journal.length,before);noEffects(x);
});
test('one successful rollback and observation allow owned resource cleanup then final cleanup without bypassing ownership protection',async()=>{
 const x=setup({ownedResource:true});await runReleaseStep({...x.args,reconciliationOnly:true});await runReleaseStep(x.args);
 const rollback=x.state.journal.at(-1);assert.equal(rollback.outcome.status,'succeeded');
 x.state.journal.push({id:randomUUID(),operation:'observe',createdAt:new Date().toISOString(),intent:x.intent('observe',{mode:'rollback'}),
  outcome:{status:'succeeded',observationOnly:true,evidence:{...clone(rollback.outcome.evidence),observationSeconds:x.m.observation.seconds}}});
 assert.equal(nextReleaseOperation(x.state),'cleanup_resource');
 const resourceId=x.m.cleanup.ownedResourceIds[0],owned={resourceId,temporary:true,kind:'container',id:hash('b')};
 x.args.resources.removeResource=async(_manifest,_binding,id)=>{assert.equal(id,resourceId);x.calls.push({kind:'cleanup_effect'});return{resourceIds:[id],absenceVerified:true,resourcePresent:false};};
 const apiBefore=x.calls.filter(c=>c.kind==='api').length;
 for(const row of [{...owned,temporary:false},{...owned,imageDigest:x.target.baseline.images[0].imageDigest}]){
  x.args.resources.ownedResource=async()=>row;await assert.rejects(runReleaseStep(x.args),/release_cleanup_protected_resource/);
  assert.equal(x.calls.filter(c=>c.kind==='cleanup_effect').length,0);assert.equal(x.calls.filter(c=>c.kind==='api').length,apiBefore);
 }
 x.args.resources.ownedResource=async()=>owned;await runReleaseStep(x.args);
 assert.equal(x.state.journal.at(-1).operation,'cleanup_resource');assert.equal(x.state.journal.at(-1).outcome.status,'succeeded');
 assert.equal(x.calls.filter(c=>c.kind==='cleanup_effect').length,1);assert.equal(x.calls.filter(c=>c.kind==='rollback_dispatch').length,1);
 assert.equal(nextReleaseOperation(x.state),'cleanup');
});
test('lost response of fresh rollback cannot authorize a second retry even when new queue absence wire is valid',async()=>{const x=setup();await runReleaseStep({...x.args,reconciliationOnly:true});x.setDispatchFailure();
 await runReleaseStep(x.args);assert.equal(x.calls.filter(c=>c.kind==='rollback_dispatch').length,1);assert.equal(x.state.journal.at(-1).outcome.status,'uncertain');
 const current=x.state.journal.at(-1),e=x.nextAbsence();assert.equal(contract.composePartialRollbackAbsenceEvidenceError(x.s,e,current),null);x.setEvidence(e);
 await assert.rejects(runReleaseStep({...x.args,reconciliationOnly:true}),/partial_rollback_absence|recovery_unproven|no_effect_diagnosis/);
 assert.equal(x.calls.filter(c=>c.kind==='rollback_dispatch').length,1);assert.equal(current.outcome.status,'uncertain');
});
test('adapter refuses partial rollback absence without the complete durable rollback intent',async()=>{const x=setup();await assert.rejects(x.adapter.reconcileDeployment(x.m,x.s,{rollback:true,operationId:x.rollback.id,since:x.rollback.createdAt,targetId:x.target.targetId}),/recovery_unproven/);noEffects(x);});
for(const [name,mutate]of Object.entries({
 missingCandidate:x=>x.state.journal.splice(x.state.journal.indexOf(x.candidate),1),candidateNotFailed:x=>x.candidate.outcome.status='succeeded',
 missingRollbackConfig:x=>x.state.journal.splice(x.state.journal.indexOf(x.configuration),1),rollbackConfigFailed:x=>x.configuration.outcome.status='failed',
 configDigest:x=>x.configuration.outcome.evidence.configDigest=hash('0'),extraCandidate:x=>x.state.journal.splice(x.state.journal.length-1,0,{...clone(x.candidate),id:randomUUID()}),
 candidateEvidence:x=>x.candidate.outcome.evidence.dataDigest=hash('0'),wrongManifest:x=>x.rollback.intent.manifestDigest=hash('0')
}))test('broker refuses forged persisted absence lineage '+name,async()=>{const x=setup();mutate(x);await assert.rejects(runReleaseStep({...x.args,reconciliationOnly:true}),/partial_rollback_absence|recovery_unproven|no_effect_diagnosis/);
 assert.equal(x.rollback.outcome.status,'uncertain');noEffects(x);assert.equal(x.calls.filter(c=>c.kind==='api').length,0);
});
for(const [name,mutate]of Object.entries({
 serviceIdentity:e=>e.composeRecovery.services[0].containerId=hash('e'),databaseImage:e=>e.composeRecovery.services.find(r=>r.role==='database').imageDigest=image('0'),
 imageMetadata:e=>e.composeRecovery.partialRollbackAbsence.images[0].buildRevision='f'.repeat(40),data:e=>e.dataDigest=hash('0'),schema:e=>e.schemaDigest=hash('0'),
 healthyClaim:e=>e.healthy=true,fakeVersion:e=>e.deployedCommit='c'.repeat(40),missingImage:e=>e.composeRecovery.partialRollbackAbsence.presentRollbackImageDigests.pop(),
 imageSet:e=>e.composeRecovery.partialRollbackAbsence.protectedRollbackImages[0].imageDigest=image('0'),DBWrites:e=>e.composeRecovery.partialRollbackAbsence.databaseReadOnly=false,
 foreignSession:e=>e.composeRecovery.partialRollbackAbsence.activeOtherSessions=1,ownedTransaction:e=>e.composeRecovery.partialRollbackAbsence.ownedTransactions=1,
 queuePresent:e=>e.composeRecovery.queue={targetId:e.composeRecovery.targetId,deploymentId:e.composeRecovery.deploymentId,commit:e.composeRecovery.requestedCommit,status:'failed',createdAt:e.composeRecovery.since,finishedAt:e.composeRecovery.since},
 retryOrdinal:e=>e.composeRecovery.partialRollbackAbsence.retryOrdinal=2
}))test('adapter and broker refuse changed current partial absence '+name,async()=>{const x=setup(),e=absence(x);mutate(e);x.setEvidence(e);
 await assert.rejects(runReleaseStep({...x.args,reconciliationOnly:true}),/recovery_unproven|partial_rollback_absence/);assert.equal(x.rollback.outcome.status,'uncertain');noEffects(x);
});
