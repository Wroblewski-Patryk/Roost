// Counterfactual offline fixtures. No API, native process, Docker, key or app effects.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';
import compose from './lib/agent-host-release-compose-state.cjs';
import {createCompatibleRecoveryContract} from './lib/agent-host-release-compatible-recovery.cjs';
import {fixture as originalFixture,hash as H,image} from './fixtures/release-compose-contract.cjs';
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
function fixture(){const f=originalFixture(),t=f.target;
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
test('import/factory is inert and base schema dependency is explicit',()=>{assert.throws(()=>createCompatibleRecoveryContract({}));assert(Object.isFrozen(api));assert.equal(typeof api.compatibleRecoveryAdmissionError,'function');});
test('genuine-shaped closed down entry admits new exact source without promoting absent historical images or old health',()=>{const f=fixture(),before=clone(f.state);assert(shared.manifestSchema.safeParse(f.input.manifest).success);
 assert(api.compatibleArtifactRecoverySchema.safeParse(f.input.compatibleArtifactRecovery).success);assert.equal(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);
 assert.deepEqual(f.state,before);assert(f.entry.imageAvailability.every(v=>!v.present));assert.equal(f.entry.publicHealth.healthy,false);assert.equal(f.input.manifest.baseline.observedAt,f.state.release.snapshot.manifest.baseline.observedAt);
 assert.equal(api.compatibleRecoveryFailureState({journal:[]}).healthyRollbackProven,false);assert.equal(f.entry.projectInventory.physicalServices.length,1);
 assert.equal(f.entry.services.filter(v=>v.presence==='absent').length,4);assert(f.entry.services.filter(v=>v.presence==='absent').every(v=>v.containerId===null&&v.imageDigest===null));
 assert(f.entry.cadences.every(v=>v.presence==='absent'&&v.held===true&&v.containerId===null));});
test('canonical FAILED validator is mandatory; metadata-shaped closure alone does not suffice',()=>{const f=fixture();assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now),null);
 assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now,()=> 'canonical_refusal'),null);});
test('actual fresh reinspection clocks are separate from stable audited scope and remain fully grant-bound',()=>{const f=fixture(),beforeScope=api.compatibleRecoveryScopeDigest(f.input),beforeGrant=d(f.input);
 f.entry.observedAt='2026-10-04T12:09:02.000Z';f.entry.projectInventory.observedAt='2026-10-04T12:09:02.000Z';f.entry.publicHealth.healthDigest=H('0');
 f.input.compatibleArtifactRecovery.nativeClosure.observedAt='2026-10-04T12:09:03.000Z';sealInventory(f.entry);reseal(f.input);
 assert.equal(api.compatibleRecoveryScopeDigest(f.input),beforeScope);assert.notEqual(d(f.input),beforeGrant);assert.equal(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);
 f.entry.services[0].containerId=H('0');assert.notEqual(api.compatibleRecoveryScopeDigest(f.input),beforeScope);});
const admissionChanges={version:f=>f.state.expectedVersion=H('0'),active:f=>f.state.status='active',closure:f=>f.state.failedClosures=[],revocation:f=>f.state.revocations=[],
 outcome:f=>f.state.journal[0].outcome.id=randomUUID(),sourceReplay:f=>f.input.commit=f.state.release.snapshot.commit,taskReplay:f=>f.input.taskId=f.state.release.snapshot.taskId,
 host:f=>f.input.hostId=randomUUID(),target:f=>f.entry.targetId='another',extraService:f=>f.entry.services.pop(),dbImage:f=>f.entry.database.imageDigest=image('0'),
 dbMount:f=>f.entry.services.find(v=>v.role==='database').mountDigest=H('0'),dbContainer:f=>f.entry.database.containerId=H('0'),writer:f=>f.input.compatibleArtifactRecovery.nativeClosure.writerAbsent=false,
 data:f=>f.entry.dataDigest=H('0'),schema:f=>f.entry.schemaDigest=H('0'),sequence:f=>f.entry.sequenceDigest=H('0'),transaction:f=>f.entry.database.ownedTransactions=1,
 activeDeploy:f=>f.entry.activeDeploymentCount=1,healthyEntry:f=>f.entry.publicHealth.healthy=true,resumedCadence:f=>f.entry.cadences[0].held=false,
 unknownSettings:f=>f.entry.databaseSettingsDigest=H('0'),cadenceSource:f=>f.entry.cadences[0].behaviorDigest=H('0'),stale:f=>f.entry.observedAt='2026-10-04T12:00:00.000Z',
 future:f=>f.entry.observedAt='2026-10-04T12:11:00.000Z',nativeClock:f=>f.input.compatibleArtifactRecovery.nativeClosure.observedAt='2026-10-04T12:08:59.000Z',
 nativeCheckpoint:f=>f.input.compatibleArtifactRecovery.nativeClosure.agentHostId=randomUUID(),allOldImagesPresent:f=>f.entry.imageAvailability.forEach(v=>v.present=true),
 borrowedMain:f=>f.input.compatibleArtifactRecovery.publication.baseCommit=sha('9'),borrowedTree:f=>f.input.compatibleArtifactRecovery.publication.baseTree=sha('9'),
 oldBranch:f=>f.input.manifest.repository.candidateBranch=f.state.release.snapshot.manifest.repository.candidateBranch};
for(const[n,change]of Object.entries(admissionChanges))test('admission refuses '+n+' even after envelope reseal',()=>{const f=fixture();change(f);f.input.manifestDigest=d(f.input.manifest);reseal(f.input);assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);});
for(const key of['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','publishedGitBasis','successorBasis','gitPublicationBase'])test('exclusive mode refuses '+key,()=>{const f=fixture();f.input[key]={};assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);});
test('historical health/clock/images remain historical; arbitrary health adoption is refused',()=>{for(const k of['observedAt','healthDigest','dataDigest']){const f=fixture();f.input.manifest.baseline[k]=k==='observedAt'?'2026-10-04T12:09:00.000Z':H('0');f.input.manifestDigest=d(f.input.manifest);reseal(f.input);assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);}});
// Realistic topology from inspected retained proof: only DB is a managed app
// container; the four non-running forensic anchors are not app services.
const absenceChanges={borrowedHistoricalContainer:f=>{const v=f.entry.services.find(v=>v.role==='app'),old=f.state.journal[0].outcome.evidence.composeRecovery.services.find(v=>v.role==='app');
 Object.assign(v,old,{presence:'present'});delete v.source;delete v.absenceVerified;},
 absentWithPhysicalId:f=>f.entry.services.find(v=>v.role==='app').containerId=H('0'),absentWithImage:f=>f.entry.services.find(v=>v.role==='app').imageDigest=image('0'),
 noAbsenceProof:f=>f.entry.services.find(v=>v.role==='app').absenceVerified=false,wrongDeclaration:f=>f.entry.services.find(v=>v.role==='app').declarationDigest=H('0'),
 missingPhysicalDb:f=>f.entry.projectInventory.physicalServices=[],unmanagedAnchorAsApp:f=>{const v=clone(f.state.journal[0].outcome.evidence.composeRecovery.services[0]);v.name='forensic_anchor';f.entry.projectInventory.physicalServices.push(v);},
 unknownPhysicalService:f=>f.entry.projectInventory.physicalServices.push(clone(f.state.journal[0].outcome.evidence.composeRecovery.services[0])),
 unboundedInventory:f=>f.entry.projectInventory.projectServiceSetComplete=false,
 staleInventory:f=>f.entry.projectInventory.observedAt='2026-10-04T12:00:00.000Z',futureInventory:f=>f.entry.projectInventory.observedAt='2026-10-04T12:10:01.000Z',
 absentCadenceHasHistoricalId:f=>f.entry.cadences[0].containerId=f.entry.historicalServiceReferences.find(v=>v.name===f.entry.cadences[0].name).containerId,
 historicalRefsRewritten:f=>f.entry.historicalServiceReferences[0].containerId=H('0')};
for(const[n,change]of Object.entries(absenceChanges))test('actual DB-only inventory refuses '+n+' after metadata reseal',()=>{const f=fixture();change(f);sealInventory(f.entry);reseal(f.input);
 assert.notEqual(api.compatibleRecoveryAdmissionError(f.state,f.input,now,f.closedValidator),null);});
test('replacement requires new signed coding result/current independent decision/Linux restore proof and core callback',()=>{const f=fixture(),before=clone(f.input);assert.equal(api.compatibleRecoveryReplacementError(f.input,f.sourceView,f.build,f.compatibility,now,f.buildValidator),null);
 assert.deepEqual(f.input,before);assert.notEqual(api.compatibleRecoveryReplacementError(f.input,f.sourceView,f.build,f.compatibility,now),null);
 assert.notEqual(api.compatibleRecoveryReplacementError(f.input,f.sourceView,f.build,f.compatibility,now,()=> 'bad_native_pair'),null);});
const replacementChanges={staleReview:f=>f.sourceView.current=false,roleIssue:f=>f.sourceView.roleIssues=['invalid'],reject:f=>f.sourceView.decision.decision='reject',wrongReview:f=>f.sourceView.decision.id=randomUUID(),
 oldCommit:f=>f.sourceView.approvalCommit=sha('a'),wrongMaterial:f=>f.sourceView.decision.materialVersion=H('0'),sameActor:f=>f.sourceView.decision.verifierId=f.sourceView.contract.assignment.agentId,
 releaserEdits:f=>f.sourceView.contract.assignment.agentId=f.input.releaserAgentId,unsigned:f=>f.sourceView.execution.verification.managedAdmission.qualification='boolean',
 childOpen:f=>f.sourceView.execution.verification.ownedTreeReceipt.activeProcesses=1,noTests:f=>delete f.sourceView.execution.verification.codingTests,
 oldLocalBase:f=>f.sourceView.execution.verification.localCommit.baselineCommit=f.input.baseCommit,
 wrongBranch:f=>f.sourceView.execution.verification.localCommit.branch='codex/old-branch',coderPush:f=>f.sourceView.execution.verification.localCommit.remotePush=true,
 failedTest:f=>f.sourceView.execution.verification.codingTests.passed=false,wrongLocalTree:f=>f.sourceView.execution.verification.localCommit.tree=sha('9'),
 replacementTree:f=>f.input.compatibleArtifactRecovery.replacement.tree=sha('9'),replacementImage:f=>f.input.compatibleArtifactRecovery.replacement.images[0].imageDigest=image('9'),
 missingImage:f=>f.input.compatibleArtifactRecovery.replacement.images.pop(),schemaChange:f=>f.input.compatibleArtifactRecovery.replacement.schemaChangeAllowed=true,
 noLinux:f=>f.compatibility.linuxImageVerified=false,noBridge:f=>f.compatibility.asyncBridgeVerified=false,noMigration:f=>f.compatibility.migrationImportVerified=false,
 alteredData:f=>f.compatibility.dataDigest=H('0'),alteredSequence:f=>f.compatibility.sequenceDigest=H('0'),provider:f=>f.compatibility.providerRequests=1,
 staleProof:f=>f.compatibility.observedAt='2026-10-03T12:00:00.000Z',futureProof:f=>f.compatibility.observedAt='2026-10-04T12:11:00.000Z',
 noBuildSignature:f=>f.build.signedNativeVerified=false,extraBuildField:f=>f.build.claim='no authoritative evidence',copiedCoder:f=>f.build.sourceExecutionId=randomUUID(),rawSecret:f=>f.compatibility.rawEnvironment={PASSWORD:'fixture'}};
for(const[n,change]of Object.entries(replacementChanges))test('replacement refuses '+n+' even after metadata reseal',()=>{const f=fixture();change(f);
 f.build.evidenceDigest=api.compatibleRecoveryCompatibilityDigest(f.build);f.compatibility.evidenceDigest=api.compatibleRecoveryCompatibilityDigest(f.compatibility);
 f.input.compatibleArtifactRecovery.replacement.buildReceiptDigest=f.build.evidenceDigest;f.input.compatibleArtifactRecovery.replacement.compatibilityReceiptDigest=d(f.compatibility);reseal(f.input);
 assert.notEqual(api.compatibleRecoveryReplacementError(f.input,f.sourceView,f.build,f.compatibility,now,f.buildValidator),null);});
test('scope requires separate exact normal independent review after closure; negative semantic audit is not automatically passed',()=>{const f=fixture();assert.equal(api.compatibleRecoveryAuditError(f.scopeView,f.input,f.sourceView,f.state),null);
 assert.notEqual(api.compatibleRecoveryAuditError({...f.scopeView,current:false},f.input,f.sourceView,f.state),null);});
test('retained signed readonly projection need not invent an omitted receipt digest',()=>{const f=fixture();delete f.scopeView.execution.verification.readOnlyAudit.digest;
 assert.equal(api.compatibleRecoveryAuditError(f.scopeView,f.input,f.sourceView,f.state),null);delete f.scopeView.execution.verification.readOnlyAudit.evidenceDigest;
 assert.notEqual(api.compatibleRecoveryAuditError(f.scopeView,f.input,f.sourceView,f.state),null);});
const auditChanges={oldAudit:f=>f.scopeView.execution.completedAt='2026-10-04T12:05:00.000Z',borrowedReview:f=>f.scopeView.decision.id=f.input.reviewId,
 sameCoder:f=>f.scopeView.execution.id=f.sourceView.execution.id,sameVerifier:f=>f.scopeView.decision.verifierId=f.sourceView.contract.assignment.agentId,
 wrongArtifact:f=>f.scopeView.decision.evidence.evidence[0].reference='old-scope',negative:f=>f.scopeView.decision.evidence.evidence[0].verdict='fail',
 noNative:f=>f.scopeView.execution.verification.managedAdmission.qualification='boolean',dirty:f=>f.scopeView.execution.changedFiles=['backend/pyproject.toml'],
 changedSource:f=>f.scopeView.execution.verification.readOnlyAudit.postTree=H('0'),effectTools:f=>f.scopeView.contract.access.tools=['repository_write']};
for(const[n,change]of Object.entries(auditChanges))test('scope audit refuses '+n,()=>{const f=fixture();change(f);assert.notEqual(api.compatibleRecoveryAuditError(f.scopeView,f.input,f.sourceView,f.state),null);});
function journal(f,through){return api.compatibleRecoveryOperations.slice(0,through).map(operation=>({id:randomUUID(),operation,intent:{operation,manifestDigest:f.input.manifestDigest,commit:f.input.commit},outcome:{status:'succeeded'}}));}
function intent(f,operation,through=0){const merged=through>=4,r=f.input.compatibleArtifactRecovery;return{operation,manifestDigest:f.input.manifestDigest,commit:f.input.commit,baseCommit:f.input.baseCommit,
 observed:{commit:f.input.commit,manifestDigest:f.input.manifestDigest,baseCommit:merged?f.input.commit:r.publication.baseCommit,baseTree:merged?f.input.candidateTree:r.publication.baseTree},
 parameters:operation==='observe'?{mode:'candidate'}:['deploy','deploy_config'].includes(operation)?{commit:f.input.commit,configDigest:r.replacement.configurationDigest,artifactSetDigest:r.replacement.artifactSetDigest,schemaDigest:r.replacement.schemaDigest,...operation==='deploy'?{targetId:f.input.manifest.deployment.targetId}:{}}:{}};}
test('fresh grant has its OWN new Git sequence; historical operations are not a shortcut',()=>{const f=fixture(),state={status:'active',release:{snapshot:f.input},journal:[]};
 assert.equal(api.nextCompatibleRecoveryOperation(state),'push');assert.equal(api.compatibleRecoveryIntentError(state,intent(f,'push')),null);
 assert.notEqual(api.compatibleRecoveryIntentError(state,intent(f,'deploy_config')),null);state.journal=journal(f,4);assert.equal(api.nextCompatibleRecoveryOperation(state),'deploy_config');
 assert.equal(api.compatibleRecoveryIntentError(state,intent(f,'deploy_config',4)),null);assert.notEqual(api.compatibleRecoveryIntentError(state,intent(f,'push',4)),null);});
test('rollback/failure/uncertainty freeze rather than promising recovery to absent images',()=>{const f=fixture();for(const status of['failed','uncertain','absent']){const rows=journal(f,6);rows.at(-1).outcome={status};const state={status:'active',release:{snapshot:f.input},journal:rows};
 assert.equal(api.nextCompatibleRecoveryOperation(state),status==='uncertain'?'reconcile':'frozen');const q=api.compatibleRecoveryFailureState(state);assert.equal(q.frozen,true);assert.equal(q.healthyRollbackProven,false);assert.equal(q.keepCadencesHeld,true);assert.equal(q.releaseAuthority,false);
 assert.notEqual(api.compatibleRecoveryIntentError(state,intent(f,'rollback',6)),null);}
 const state={status:'active',release:{snapshot:f.input},journal:journal(f,6)};state.journal.at(-1).outcome=null;assert.equal(api.nextCompatibleRecoveryOperation(state),'reconcile');assert.equal(api.compatibleRecoveryFailureState(state).normalReconciliationRequired,true);});
test('no effect follows unresolved prior; observe uses candidate and full original duration',()=>{const f=fixture(),state={status:'active',release:{snapshot:f.input},journal:journal(f,6)};
 assert.equal(api.compatibleRecoveryIntentError(state,intent(f,'observe',6)),null);const bad=intent(f,'observe',6);bad.parameters.mode='rollback';assert.notEqual(api.compatibleRecoveryIntentError(state,bad),null);
 state.journal[0].outcome=null;assert.throws(()=>api.nextCompatibleRecoveryOperation(state));});
test('initial down-entry stays fenced; successful-shaped records do not certify baseline or rollback',()=>{const q=api.compatibleRecoveryFailureState({journal:[]});assert.equal(q.keepIngressBlocked,true);assert.equal(q.keepCadencesHeld,true);
 const after=api.compatibleRecoveryFailureState({journal:[{operation:'runtime_resume',outcome:{status:'succeeded'}}]});assert.equal(after.newHealthyBaselineCertified,false);assert.equal(after.historicalBaselineCertified,false);assert.equal(after.healthyRollbackProven,false);});
test('real isolated empty/populated smoke precedes fixture cleanup and cadence restoration; cleanup cannot bypass it',()=>{const f=fixture(),state={status:'active',release:{snapshot:f.input},journal:journal(f,7)};
 assert.equal(api.nextCompatibleRecoveryOperation(state),'smoke');assert.notEqual(api.compatibleRecoveryIntentError(state,intent(f,'fixture_cleanup',7)),null);
 assert.notEqual(api.compatibleRecoveryIntentError(state,intent(f,'runtime_resume',7)),null);
 state.journal=journal(f,8);assert.equal(api.nextCompatibleRecoveryOperation(state),'fixture_cleanup');assert.equal(api.compatibleRecoveryIntentError(state,intent(f,'fixture_cleanup',8)),null);
 state.journal=journal(f,9);assert.equal(api.nextCompatibleRecoveryOperation(state),'runtime_resume');});
test('successful runtime outcome needs canonical full queue/service qualification; response-only green flags fail',()=>{const f=fixture(),operation={operation:'observe',intent:intent(f,'observe',6)},outcome={status:'succeeded',evidence:{healthy:true,deployedCommit:f.input.commit,deployedTree:f.input.candidateTree,
 artifactSetDigest:f.input.manifest.deployment.artifactSetDigest,configDigest:f.input.manifest.deployment.configDigest,schemaDigest:f.input.manifest.baseline.schemaDigest,dataDigest:f.input.manifest.baseline.dataDigest,observationSeconds:1200}};
 assert.equal(api.compatibleRecoveryOutcomeError(f.input,operation,outcome,()=>null),null);
 assert.notEqual(api.compatibleRecoveryOutcomeError(f.input,operation,outcome),null);assert.notEqual(api.compatibleRecoveryOutcomeError(f.input,operation,outcome,()=> 'queue_mismatch'),null);
 outcome.evidence.observationSeconds=1199;assert.notEqual(api.compatibleRecoveryOutcomeError(f.input,operation,outcome,()=>null),null);
 outcome.evidence.observationSeconds=1200;outcome.evidence.deployedCommit=f.state.release.snapshot.commit;assert.notEqual(api.compatibleRecoveryOutcomeError(f.input,operation,outcome,()=>null),null);});
