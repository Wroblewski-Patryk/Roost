// Counterfactual compatible envelope fixture; no native, model or API effects.
import {randomUUID} from 'node:crypto';
import shared from '../lib/agent-host-release-contract.cjs';
import compose from '../lib/agent-host-release-compose-state.cjs';
import {createCompatibleRecoveryContract} from '../lib/agent-host-release-compatible-recovery.cjs';
import ingress from '../lib/agent-host-release-compose-ingress-fence.cjs';
import {fixture as originalFixture,hash as H,image} from './release-compose-contract.cjs';
const clone=structuredClone,sha=x=>x.repeat(40),now=Date.parse('2026-10-04T12:10:00.000Z');
const api=createCompatibleRecoveryContract({manifestSchema:shared.manifestSchema,composeConfigurationSchema:compose.composeConfigurationSchema,
 composeRuntimeServiceSchema:compose.composeRuntimeServiceSchema,releaseNativeClosureSchema:shared.releaseNativeClosureSchema,
 releaseDigest:shared.releaseDigest,composeConfigurationDigest:compose.composeConfigurationDigest});
const d=shared.releaseDigest;
function reseal(input){const r=input.compatibleArtifactRecovery;r.currentEntry.evidenceDigest=api.compatibleRecoveryEntryDigest(r.currentEntry);
 r.nativeClosure.evidenceDigest=r.currentEntry.evidenceDigest;r.scopeAudit.scopeDigest=api.compatibleRecoveryScopeDigest(input);}
function sealInventory(entry){entry.projectInventory.digest=api.compatibleRecoveryInventoryDigest(entry.projectInventory);
 for(const v of [...entry.services,...entry.cadences])if(v.presence==='absent'||v.declarationDigest){v.inventoryDigest=entry.projectInventory.digest;v.observedAt=entry.projectInventory.observedAt;}}
function rehash(m,s){const t=m.deployment.targets[0];t.configDigest=compose.composeConfigurationDigest(t.configuration);
 t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);
 m.deployment.configDigest=d([{targetId:t.targetId,configDigest:t.configDigest}]);m.rollback.configDigest=d([{targetId:t.targetId,configDigest:t.rollbackConfigDigest}]);m.baseline.configDigest=d([{targetId:t.targetId,configDigest:t.baseline.configDigest}]);
 for(const[k,mode]of [['deployment',false],['rollback',true],['baseline','baseline']])m[k].artifactSetDigest=shared.sourceArtifactDigest(m,s,mode);}
function native(executionId){return{ownedTreeReceipt:{version:'roost-windows-job-v2',attempt:executionId,rootExit:0,jobClosed:true,cleanup:true,activeProcesses:0,
 assignedBeforeResume:true,resumed:true,killOnClose:true,breakaway:false,sourceSha256:H('a')},managedAdmission:{qualification:'signed_native_v1',evidenceDigest:H('b'),jobSourceDigest:H('a')}};}
export function compatibleFixture(){const f=originalFixture(),t=f.target;
 const cadence={name:'scheduler',role:'cadence',source:'built',expectedState:'paused',mountDigest:H('9')};
 for(const c of[t.configuration,t.rollbackConfiguration,t.baseline.configuration])c.services.push(clone(cadence));
 t.baseline.images.push({name:'scheduler',imageDigest:image('4')});f.m.cleanup.protectedResourceIds.push(H('9'),image('4'));
 f.m.observation={seconds:1200,intervalSeconds:30,maxFailures:0};
 f.m.postObservation={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,
  controllerDigest:H('a'),fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-1,markerDigest:H('b'),summaryDigest:H('c')},
  baselineSequenceDigest:H('8'),budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:H('7'),ingressSettingsDigest:H('6'),observationSeconds:300,
   cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:H('2')},{name:'scheduler',behavior:'restore_existing_loop',behaviorDigest:H('3')}]}};
 rehash(f.m,f.s);
 const old={...clone(f.s),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaserAgentId:randomUUID(),releaseExecutionId:randomUUID(),manifestDigest:d(f.m)};
 const priorId=randomUUID(),op=randomUUID(),outcomeId=randomUUID(),closureId=randomUUID(),revocationId=randomUUID(),issuer=randomUUID();
 const rows=t.configuration.services.map((v,i)=>({name:v.name,role:v.role,containerId:H(String(i+1)),imageDigest:v.role==='database'?v.imageDigest:image('f'),
  mountDigest:v.mountDigest,state:v.role==='database'?'running':'exited',health:v.role==='database'?'healthy':null,exitCode:v.role==='migration'?1:0,createdAt:'2026-10-04T12:00:03.000Z'}));
 const evidence={composeRecovery:{configuration:clone(t.rollbackConfiguration),services:clone(rows)},healthy:false,schemaDigest:f.m.baseline.schemaDigest,dataDigest:f.m.baseline.dataDigest,observedAt:'2026-10-04T12:05:00.000Z'};
 const receipt={releaseId:priorId,applicationId:old.applicationId,hostId:old.hostId,issuerUserId:issuer,failedOperationId:op,failedOutcomeId:outcomeId,
  failedEvidenceDigest:d(evidence),consentDigest:H('c'),evidence};
 const closure={id:closureId,release_id:priorId,failed_operation_id:op,failed_outcome_id:outcomeId,consent_digest:receipt.consentDigest,
  closure_digest:d(receipt),revocation_id:revocationId,snapshot:receipt,created_at:'2026-10-04T12:06:00.000Z'};
 const state={status:'failed',release:{id:priorId,snapshot:old,issuer_user_id:issuer},expectedVersion:H('d'),failedClosures:[closure],revocations:[{id:revocationId}],
  journal:[{id:op,operation:'rollback',outcome:{id:outcomeId,status:'reconciled',reconciledStatus:'failed',evidence}}]};
 const m=clone(f.m),target=m.deployment.targets[0],commit=sha('7'),tree=sha('8');
 target.configuration.gitCommit=commit;target.configuration.sourceDigest=H('4');target.sourceDigest=H('4');m.repository.candidateBranch='codex/greenlet-repair';
 m.postObservation.candidateCommit=commit;m.postObservation.candidateTree=tree;
 const input={requestId:randomUUID(),taskId:randomUUID(),applicationId:old.applicationId,hostId:old.hostId,releaserAgentId:old.releaserAgentId,
  releaseExecutionId:randomUUID(),reviewId:randomUUID(),materialVersion:H('5'),commit,candidateTree:tree,baseCommit:old.baseCommit,baseTree:old.baseTree,manifest:m};
 rehash(m,input);input.manifestDigest=d(m);
 const images=target.configuration.services.filter(v=>v.source==='built').map(v=>({name:v.name,imageDigest:image('7'),commit,tree}));
 m.cleanup.protectedResourceIds.push(image('7'));input.manifestDigest=d(m);
 const db=rows.find(v=>v.role==='database');
 const inventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:target.targetId,observedAt:'2026-10-04T12:09:00.000Z',projectServiceSetComplete:true,physicalServices:[clone(db)],digest:H('0')};
 const currentServices=t.rollbackConfiguration.services.map(v=>v.role==='database'?{...clone(db),presence:'present',declarationDigest:d(v),inventoryDigest:H('0'),observedAt:inventory.observedAt}:
  {presence:'absent',name:v.name,role:v.role,source:v.source,declarationDigest:d(v),mountDigest:v.mountDigest,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:H('0'),observedAt:inventory.observedAt});
 const entry={schemaVersion:'roost-compose-down-entry-v1',observedAt:'2026-10-04T12:09:00.000Z',targetId:target.targetId,configuration:clone(t.rollbackConfiguration),services:currentServices,projectInventory:inventory,
  historicalServiceReferences:rows.map(v=>({name:v.name,containerId:v.containerId,imageDigest:v.imageDigest,failedEvidenceDigest:d(evidence)})),
  imageAvailability:t.baseline.images.map(v=>({...v,present:false})),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,
  database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,running:true,healthy:true,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},
  cadences:m.postObservation.runtimeResume.cadences.map(v=>({presence:'absent',name:v.name,behaviorDigest:v.behaviorDigest,held:true,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:H('0'),observedAt:inventory.observedAt})),
  databaseSettingsDigest:m.postObservation.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:m.postObservation.runtimeResume.ingressSettingsDigest,
  ingressBlocked:true,activeDeploymentCount:0,publicHealth:{healthy:false,healthDigest:H('6')},evidenceDigest:H('0')};
 entry.ingressFence={schemaVersion:'roost-compose-proxy-network-fence-v1',observedAt:entry.observedAt,targetId:entry.targetId,
  networkId:H('b'),subnet:'192.0.2.0/24',proxyId:H('c'),proxyPid:4321,namespaceDigest:H('d'),databaseContainerId:db.containerId,
  databaseIpv4:'192.0.2.2',proxyIpv4:'192.0.2.6',port:8000,ruleComment:'roost-release-hold-'+H('e').slice(0,32),ruleDigest:H('f'),
  originalRulesDigest:H('a'),observedRulesDigest:H('b'),projectNetworkExclusive:true,publishedPortsAbsent:true,rulePresent:true,evidenceDigest:H('0')};
 entry.ingressFence.evidenceDigest=ingress.composeIngressFenceDigest(entry.ingressFence);
 sealInventory(entry);
 const sourceId=randomUUID(),buildId=randomUUID();
 const build={schemaVersion:'roost-compatible-artifact-build-proof-v1',observedAt:'2026-10-04T12:07:00.000Z',executionId:buildId,sourceExecutionId:sourceId,commit,tree,images:clone(images),
  artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,nativeReceiptDigest:H('a'),signedNativeVerified:true,ownedJobClosed:true,sourceUnchanged:true,evidenceDigest:H('0')};
 build.evidenceDigest=api.compatibleRecoveryCompatibilityDigest(build);
 const compatibility={schemaVersion:'roost-compose-replacement-compatibility-v1',observedAt:'2026-10-04T12:08:00.000Z',commit,tree,artifactSetDigest:m.deployment.artifactSetDigest,
  configurationDigest:m.deployment.configDigest,images:clone(images),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,
  backupDigest:m.backup.digest,linuxImageVerified:true,asyncBridgeVerified:true,migrationImportVerified:true,restoredSchemaCompatible:true,nonOwnedDataUnchanged:true,sequencesUnchanged:true,
  providerRequests:0,externalActions:0,ownedJobClosed:true,sourceExecutionId:sourceId,buildExecutionId:buildId,nativeReceiptDigest:build.nativeReceiptDigest,evidenceDigest:H('0')};
 compatibility.evidenceDigest=api.compatibleRecoveryCompatibilityDigest(compatibility);
 input.compatibleArtifactRecovery={schemaVersion:'roost-compose-compatible-artifact-recovery-v1',prior:{releaseId:priorId,expectedVersion:state.expectedVersion,closureId,closureDigest:closure.closure_digest,
  failedOperationId:op,failedOutcomeId:outcomeId,failedEvidenceDigest:d(evidence),previousManifestDigest:old.manifestDigest},currentEntry:entry,
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId:priorId,operationId:op,agentHostId:input.hostId,evidenceDigest:H('0'),checkpointDigest:H('9'),controllerPid:1234,
   registeredChildCount:7,allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:'2026-10-04T12:09:01.000Z'},
  replacement:{commit,tree,artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,images:clone(images),buildReceiptDigest:build.evidenceDigest,
   compatibilityReceiptDigest:d(compatibility),schemaDigest:m.baseline.schemaDigest,schemaChangeAllowed:false},
  publication:{mode:'new_exact_commit',baseCommit:old.commit,baseTree:old.candidateTree},scopeAudit:{taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('2'),scopeDigest:H('0')},
  failurePolicy:{mode:'freeze_protected_database',automaticHistoricalRollback:false,dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true}};
 reseal(input);
 const sourceView={current:true,roleIssues:[],materialVersion:input.materialVersion,approvalCommit:commit,
  execution:{id:sourceId,taskId:input.taskId,applicationId:input.applicationId,agentHostId:input.hostId,status:'completed',leaseToken:null,leaseExpiresAt:null,contextInvalidatedAt:null,errorState:null,
   metadata:{resultRevision:{commit,workingTree:'clean'}},verification:{...native(sourceId),codingTests:{schemaVersion:'roost-coding-tests-v1',passed:true,digest:H('1')},
    localCommit:{schemaVersion:'roost-local-commit-v1',executionId:sourceId,commit,tree,testDigest:H('1'),baselineCommit:old.commit,branch:m.repository.candidateBranch,remotePush:false,deployment:false}}},
  contract:{assignment:{agentId:randomUUID()},nativeBoundary:{profile:'coding-local'},modelSelection:{schemaVersion:'roost-managed-hermes-backend-v1',backend:'codex_responses'}},
  decision:{id:input.reviewId,decision:'approve',materialVersion:input.materialVersion,verifierId:randomUUID(),evidence:{reviewedCommit:commit}}};
 const a=input.compatibleArtifactRecovery.scopeAudit,scopeView={current:true,roleIssues:[],materialVersion:a.materialVersion,approvalCommit:commit,
  execution:{id:a.executionId,taskId:a.taskId,applicationId:input.applicationId,agentHostId:input.hostId,status:'completed',leaseToken:null,leaseExpiresAt:null,errorState:null,contextInvalidatedAt:null,
   changedFiles:[],completedAt:'2026-10-04T12:09:10.000Z',verification:{...native(a.executionId),readOnlyAudit:{schemaVersion:'roost-readonly-audit-v1',verdict:'verified',evidenceDigest:H('3'),digest:H('4'),preTree:H('5'),postTree:H('5'),gitState:'unchanged',processState:'unchanged',dockerState:'unchanged',nativeTools:[]}}},
  contract:{assignment:{agentId:input.releaserAgentId},nativeBoundary:{profile:'inspect-readonly',inspectReadOnly:{kind:'auditor'}},access:{sandbox:'read-only',externalWrites:false,tools:['repository_read'],permissions:['repository_read']}},
  decision:{id:a.reviewId,decision:'approve',materialVersion:a.materialVersion,verifierId:randomUUID(),createdAt:'2026-10-04T12:09:11.000Z',evidence:{reviewedCommit:commit,evidence:[
   {kind:'artifact',verdict:'pass',reference:'roost-release-compatible-artifact-scope:'+a.scopeDigest},{kind:'test',verdict:'pass',reference:'offline fixture only'}]}}};
 return{state,input,entry,build,compatibility,sourceView,scopeView,closedValidator:()=>null,buildValidator:()=>null};
}
