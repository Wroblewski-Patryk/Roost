// Shared wire supporting fixtures only; no API/SQL/native/model effects.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';import compose from './lib/agent-host-release-compose-state.cjs';import ingress from './lib/agent-host-release-compose-ingress-fence.cjs';
import {fixture as originalFixture,hash as H,image as I} from './fixtures/release-compose-contract.cjs';
const d=shared.releaseDigest,clone=structuredClone,api=shared;
function compatibleFailureFixture(kind='deployment_failed'){
 const f=originalFixture(),m=f.m,t=f.target,s={...f.s,releaseId:randomUUID(),manifestDigest:''},clock=Date.now();
 const extra={name:'proactive',role:'cadence',source:'built',expectedState:'paused',mountDigest:H('9')};for(const cfg of [t.configuration,t.baseline.configuration,t.rollbackConfiguration])cfg.services.push(clone(extra));t.baseline.images.push({name:'proactive',imageDigest:I('4')});m.cleanup.protectedResourceIds.push(H('9'),I('4'),I('7'));
 m.postObservation={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:s.commit,candidateTree:s.candidateTree,controllerDigest:H('1'),fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-1,markerDigest:H('2'),summaryDigest:H('3')},baselineSequenceDigest:H('8'),budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:H('7'),ingressSettingsDigest:H('6'),observationSeconds:300,cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:H('1')},{name:'proactive',behavior:'restore_existing_loop',behaviorDigest:H('2')}]}};
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);
 for(const[k,v]of [['deployment',t.configDigest],['baseline',t.baseline.configDigest],['rollback',t.rollbackConfigDigest]])m[k].configDigest=d([{targetId:t.targetId,configDigest:v}]);for(const[k,mode]of [['deployment',false],['baseline','baseline'],['rollback',true]])m[k].artifactSetDigest=shared.sourceArtifactDigest(m,s,mode);s.manifestDigest=d(m);
 const decl=t.configuration.services,dbDecl=decl.find(v=>v.role==='database'),db={name:dbDecl.name,role:'database',containerId:H('a'),imageDigest:dbDecl.imageDigest,mountDigest:dbDecl.mountDigest,state:'running',health:'healthy',exitCode:0,createdAt:new Date(clock-86400000).toISOString()};
 const originalAt=new Date(clock-60000).toISOString(),originalInventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:t.targetId,observedAt:originalAt,projectServiceSetComplete:true,physicalServices:[db],digest:H('0')};originalInventory.digest=shared.compatibleRecoveryInventoryDigest(originalInventory);
 const entry={schemaVersion:'roost-compose-down-entry-v1',observedAt:originalAt,targetId:t.targetId,configuration:clone(t.rollbackConfiguration),projectInventory:originalInventory,
  services:t.rollbackConfiguration.services.map(v=>v.role==='database'?{...db,presence:'present',declarationDigest:d(v),inventoryDigest:originalInventory.digest,observedAt:originalAt}:{presence:'absent',name:v.name,role:v.role,source:'built',declarationDigest:d(v),mountDigest:v.mountDigest,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:originalInventory.digest,observedAt:originalAt}),
  historicalServiceReferences:decl.map((v,n)=>({name:v.name,containerId:H(String(n+1)),imageDigest:v.imageDigest??I('f'),failedEvidenceDigest:H('0')})),imageAvailability:t.baseline.images.map(v=>({...v,present:false})),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,
  database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,running:true,healthy:true,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},
  cadences:m.postObservation.runtimeResume.cadences.map(v=>({presence:'absent',name:v.name,behaviorDigest:v.behaviorDigest,held:true,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:originalInventory.digest,observedAt:originalAt})),databaseSettingsDigest:H('7'),ingressSettingsDigest:H('6'),ingressBlocked:true,activeDeploymentCount:0,publicHealth:{healthy:false,healthDigest:H('0')},evidenceDigest:H('0')};entry.evidenceDigest=shared.compatibleRecoveryEntryDigest(entry);
 const images=decl.filter(v=>v.source==='built').map(v=>({name:v.name,imageDigest:I('7'),commit:s.commit,tree:s.candidateTree}));
 s.compatibleArtifactRecovery={schemaVersion:'roost-compose-compatible-artifact-recovery-v1',prior:{releaseId:randomUUID(),expectedVersion:H('1'),closureId:randomUUID(),closureDigest:H('2'),failedOperationId:randomUUID(),failedOutcomeId:randomUUID(),failedEvidenceDigest:H('3'),previousManifestDigest:H('4')},currentEntry:entry,
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId:randomUUID(),operationId:randomUUID(),agentHostId:randomUUID(),evidenceDigest:entry.evidenceDigest,checkpointDigest:H('5'),controllerPid:1234,registeredChildCount:10,allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:originalAt},
  replacement:{commit:s.commit,tree:s.candidateTree,artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,images,buildReceiptDigest:H('6'),compatibilityReceiptDigest:H('7'),schemaDigest:m.baseline.schemaDigest,schemaChangeAllowed:false},publication:{mode:'new_exact_commit',baseCommit:'e'.repeat(40),baseTree:'f'.repeat(40)},scopeAudit:{taskId:randomUUID(),executionId:randomUUID(),reviewId:randomUUID(),materialVersion:H('8'),scopeDigest:H('0')},failurePolicy:{mode:'freeze_protected_database',automaticHistoricalRollback:false,dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true}};
 s.compatibleArtifactRecovery.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(s);
 const observedAt=new Date(clock-1).toISOString(),createdAt=new Date(clock-20000).toISOString(),operationName=kind==='configuration_absent'?'deploy_config':kind==='observation_failed'?'observe':'deploy';
 const intent=op=>({requestId:randomUUID(),operation:op,manifestDigest:s.manifestDigest,commit:s.commit,baseCommit:s.baseCommit,expectedVersion:H('9'),observed:{commit:s.commit,baseCommit:s.commit,baseTree:s.candidateTree,manifestDigest:s.manifestDigest},parameters:op==='observe'?{mode:'candidate'}:{commit:s.commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest,...(op==='deploy'?{targetId:t.targetId}:{})}});
 const operation={id:randomUUID(),releaseId:s.releaseId,operation:operationName,createdAt,intent:intent(operationName)};
 const deploy=kind==='observation_failed'?{id:randomUUID(),releaseId:s.releaseId,operation:'deploy',createdAt:new Date(clock-40000).toISOString(),intent:intent('deploy')}:operation;
 const currentQueue=kind.endsWith('_absent')?null:{targetId:t.targetId,deploymentId:'r'+d([s.releaseId,deploy.id,t.targetId,'candidate']).slice(0,23),commit:s.commit,status:kind==='observation_failed'?'finished':'failed',createdAt:new Date(clock-(kind==='observation_failed'?35000:15000)).toISOString(),finishedAt:new Date(clock-(kind==='observation_failed'?25000:5000)).toISOString()};
 const built=kind.endsWith('_absent')?[]:decl.filter(v=>v.source==='built').map((v,n)=>({name:v.name,role:v.role,containerId:H(String(n+1)),imageDigest:I('7'),mountDigest:v.mountDigest,state:v.role==='migration'?'exited':v.role==='app'?kind==='observation_failed'?'running':'created':'created',health:v.role==='app'&&kind==='observation_failed'?'unhealthy':null,exitCode:v.role==='migration'&&kind==='deployment_failed'?1:0,createdAt:new Date(clock-(kind==='observation_failed'?30000:10000)).toISOString()}));
 const configuration=clone(kind==='configuration_absent'?entry.configuration:t.configuration),inventory={schemaVersion:'roost-compatible-failure-project-inventory-v1',targetId:t.targetId,observedAt,projectServiceSetComplete:true,services:[clone(db),...built],absentServices:configuration.services.filter(v=>v.role!=='database'&&!built.some(q=>q.name===v.name)).map(v=>({name:v.name,role:v.role,source:'built',mountDigest:v.mountDigest,declarationDigest:d(v),containerId:null,imageDigest:null,state:'absent',absenceVerified:true})),digest:H('0')};
 const queueScan={schemaVersion:'roost-compatible-failure-queue-scan-v1',targetId:t.targetId,from:deploy.createdAt,through:observedAt,observedAt,scanComplete:true,rows:currentQueue?[clone(currentQueue)]:[],digest:H('0')};
 const fence={schemaVersion:'roost-compose-proxy-network-fence-v1',observedAt,targetId:t.targetId,networkId:H('c'),subnet:'10.42.0.0/24',proxyId:H('d'),proxyPid:1234,namespaceDigest:H('e'),databaseContainerId:db.containerId,databaseIpv4:'10.42.0.2',proxyIpv4:'10.42.0.3',port:8000,ruleComment:'roost-release-hold-'+'ab'.repeat(16),ruleDigest:H('f'),originalRulesDigest:H('1'),observedRulesDigest:H('2'),projectNetworkExclusive:true,publishedPortsAbsent:true,rulePresent:true,evidenceDigest:H('0')};fence.evidenceDigest=ingress.composeIngressFenceDigest(fence);
 entry.ingressFence=clone(fence);entry.ingressFence.observedAt=originalAt;entry.ingressFence.evidenceDigest=ingress.composeIngressFenceDigest(entry.ingressFence);entry.evidenceDigest=shared.compatibleRecoveryEntryDigest(entry);s.compatibleArtifactRecovery.nativeClosure.evidenceDigest=entry.evidenceDigest;s.compatibleArtifactRecovery.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(s);
 const marker={schemaVersion:'roost-compatible-recovery-negative-v1',kind,releaseId:s.releaseId,operationId:operation.id,operation:operationName,since:createdAt,requestId:operation.intent.requestId,intentDigest:d(operation.intent),targetId:t.targetId,requestedCommit:s.commit,requestedTree:s.candidateTree,phase:kind==='configuration_absent'?'entry':'candidate',configuration,queueScan,currentQueue,projectInventory:inventory,
  imageMetadata:built.map(v=>({name:v.name,imageDigest:v.imageDigest,buildRevision:s.commit,revisionLabel:s.commit,treeLabel:s.candidateTree})),database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},ingressFence:fence,evidenceDigest:H('0')};
 const evidence={compatibleRecoveryFailure:marker,observedAt,configDigest:d([{targetId:t.targetId,configDigest:compose.composeConfigurationDigest(configuration)}]),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:entry.sequenceDigest,healthDigest:H('0'),healthy:false,currentServiceSetDigest:api.compatibleFailureServiceSetDigest(inventory.services),deploymentIds:currentQueue?[{targetId:t.targetId,deploymentId:currentQueue.deploymentId}]:[]};
 if(kind==='observation_failed'){
  const pe={healthy:true,deployedCommit:s.commit,deployedTree:s.candidateTree,artifactSetDigest:m.deployment.artifactSetDigest,configDigest:m.deployment.configDigest,schemaDigest:evidence.schemaDigest,dataDigest:evidence.dataDigest,deploymentIds:clone(evidence.deploymentIds),composeTargets:[{targetId:t.targetId,binding:{commit:s.commit,tree:s.candidateTree,queue:clone(currentQueue),images:images.map(v=>({...v,deploymentId:currentQueue.deploymentId}))},runtime:{services:images.map(v=>({...v,deploymentId:currentQueue.deploymentId}))}}]};
  deploy.outcome={id:randomUUID(),status:'succeeded',evidence:pe};marker.successfulDeployment={operationId:deploy.id,outcomeId:deploy.outcome.id,evidenceDigest:d(pe),deploymentId:currentQueue.deploymentId};marker.observationSeconds=60;
 }
 reseal(evidence);const options={now:clock,readSuccessfulDeployment:ref=>ref.operationId===deploy.id&&ref.outcomeId===deploy.outcome?.id?deploy:null};return{s,m,t,evidence,operation,deploy,options,api};
}
function reseal(e){const v=e.compatibleRecoveryFailure;v.projectInventory.digest=api.compatibleFailureInventoryDigest(v.projectInventory);v.queueScan.digest=api.compatibleFailureQueueScanDigest(v.queueScan);v.evidenceDigest=api.compatibleFailureMarkerDigest(v);e.currentServiceSetDigest=api.compatibleFailureServiceSetDigest(v.projectInventory.services);}
const outcome=f=>({requestId:randomUUID(),status:'reconciled',reconciledStatus:f.evidence.compatibleRecoveryFailure.kind.endsWith('_absent')?'absent':'failed',observationOnly:true,evidence:f.evidence});
const canonicalNever=()=>assert.fail('negative evidence reached ordinary healthy-baseline validator');
test('shared module initializes without a loader cycle and exports the fixed negative factory API',()=>{
 for(const key of ['compatibleFailureEvidenceSchema','compatibleFailureMarkerSchema','compatibleFailureProjectInventorySchema','compatibleFailureQueueScanSchema'])assert.equal(typeof shared[key].safeParse,'function');
 for(const key of ['compatibleFailureEvidenceError','compatibleFailureOutcomeError','compatibleFailureDisposition','qualifyCompatibleFailureResult'])assert.equal(typeof shared[key],'function');
});
for(const kind of ['configuration_absent','deployment_absent','deployment_failed','observation_failed'])test('shared outcome routes exact '+kind+' through dedicated qualification only',()=>{
 const f=compatibleFailureFixture(kind),body=outcome(f);assert.equal(shared.outcomeSchema.safeParse(body).success,true);
 assert.equal(shared.compatibleRecoveryOutcomeError(f.s,f.operation,body,canonicalNever,f.options),null);
 assert.equal(shared.qualifyCompatibleFailureResult(f.s,body.evidence,f.operation,f.options).disposition.successProven,false);
});
test('trusted separate releaseId option binds a snapshot without inventing identity from marker',()=>{
 const f=compatibleFailureFixture('deployment_absent'),body=outcome(f),s={...f.s};delete s.releaseId;
 assert.equal(shared.compatibleRecoveryOutcomeError(s,f.operation,body,canonicalNever,{...f.options,releaseId:f.s.releaseId}),null);
 assert.notEqual(shared.compatibleRecoveryOutcomeError(s,f.operation,body,canonicalNever,f.options),null);
 assert.notEqual(shared.compatibleRecoveryOutcomeError(f.s,f.operation,body,canonicalNever,{...f.options,releaseId:randomUUID()}),null);
});
for(const [name,change]of Object.entries({success:b=>{b.status='succeeded';delete b.reconciledStatus;},normalFailed:b=>{b.status='failed';delete b.reconciledStatus;},effectful:b=>b.observationOnly=false,wrongResult:b=>b.reconciledStatus='succeeded',wrongKind:b=>b.evidence.compatibleRecoveryFailure.kind='unknown',wrongImage:b=>b.evidence.compatibleRecoveryFailure.projectInventory.services[1].imageDigest=I('f'),wrongData:b=>b.evidence.dataDigest=H('0'),wrongRequest:b=>b.evidence.compatibleRecoveryFailure.requestId=randomUUID(),oldHealthy:b=>b.evidence.deployedCommit='c'.repeat(40),extra:b=>b.evidence.compatibleRecoveryFailure.command='private'}))test('shared negative routing refuses '+name,()=>{
 const f=compatibleFailureFixture(),b=outcome(f);change(b);reseal(b.evidence);assert.notEqual(shared.compatibleRecoveryOutcomeError(f.s,f.operation,b,canonicalNever,f.options),null);
});
test('observation negative cannot supply detached queue or bypass normal successful journal lookup',()=>{
 const f=compatibleFailureFixture('observation_failed'),b=outcome(f);
 assert.notEqual(shared.compatibleRecoveryOutcomeError(f.s,f.operation,b,canonicalNever,{now:f.options.now}),null);
 assert.notEqual(shared.compatibleRecoveryOutcomeError(f.s,f.operation,b,canonicalNever,{...f.options,readSuccessfulDeployment:()=>null}),null);
 f.deploy.outcome.evidence.composeTargets[0].runtime.services[0].imageDigest=I('f');
 assert.notEqual(shared.compatibleRecoveryOutcomeError(f.s,f.operation,b,canonicalNever,f.options),null);
});
test('ordinary runtime evidence keeps strict historic schema and rejects new negative fields without a marker',()=>{
 const f=originalFixture(),base={requestId:randomUUID(),status:'succeeded',observationOnly:false,evidence:{...f.evidence(false),observedAt:new Date().toISOString()}};
 assert.equal(shared.outcomeSchema.safeParse(base).success,true);assert.equal(shared.composeEvidenceError(f.s,base.evidence),null);
 for(const added of [{sequenceDigest:H('0')},{currentServiceSetDigest:H('0')},{deploymentIds:[]}])assert.equal(shared.outcomeSchema.safeParse({...base,evidence:{...base.evidence,...added}}).success,false);
});
test('new marker refuses mixed positive/legacy evidence and incompatible empty queue shapes',()=>{
 const f=compatibleFailureFixture(),b=outcome(f);
 for(const added of [{deployedCommit:f.s.commit},{composeRecovery:{}},{composeTargets:[]},{healthy:true},{deploymentIds:[]}])assert.equal(shared.outcomeSchema.safeParse({...b,evidence:{...b.evidence,...added}}).success,false);
 const a=compatibleFailureFixture('deployment_absent'),o=outcome(a);o.evidence.deploymentIds=[{targetId:a.t.targetId,deploymentId:'not-absent'}];assert.equal(shared.outcomeSchema.safeParse(o).success,false);
 const undefinedMarker={...b,evidence:{...b.evidence,compatibleRecoveryFailure:undefined}};assert.equal(shared.outcomeSchema.safeParse(undefinedMarker).success,false);
});
test('ordinary or recovery-only scope cannot borrow a compatible negative marker',()=>{
 const f=compatibleFailureFixture('deployment_absent'),b=outcome(f),s={...f.s};delete s.compatibleArtifactRecovery;
 assert.notEqual(shared.compatibleRecoveryOutcomeError(s,f.operation,b,canonicalNever,f.options),null);
 const mixed={...f.s,recoveryOnly:{}};assert.notEqual(shared.compatibleRecoveryOutcomeError(mixed,f.operation,b,canonicalNever,f.options),null);
});
test('failed/absent own negative outcome remains frozen with no rollback or candidate retry permission',()=>{
 const f=compatibleFailureFixture('deployment_absent'),b=outcome(f);
 assert.equal(shared.compatibleFailureOutcomeError(f.s,f.operation,b,f.options),null);
 const disposition=shared.compatibleFailureDisposition(b.evidence.compatibleRecoveryFailure.kind);
 assert.equal(disposition.terminalFreeze,true);for(const key of ['retryAllowed','rollbackAllowed','dataRestoreAllowed','successProven','releaseAuthority'])assert.equal(disposition[key],false);
});
test('generic outcome schema never admits compatible negative evidence as success or an effectful failure',()=>{
 const f=compatibleFailureFixture('deployment_absent'),b=outcome(f);assert.equal(shared.outcomeSchema.safeParse(b).success,true);
 for(const value of [{...b,status:'succeeded',reconciledStatus:undefined},{...b,status:'failed',reconciledStatus:undefined},
  {...b,reconciledStatus:'succeeded'},{...b,reconciledStatus:'failed'},{...b,observationOnly:false}])assert.equal(shared.outcomeSchema.safeParse(value).success,false);
});
