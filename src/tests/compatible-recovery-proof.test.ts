// Synthetic DB/receipt facts only; no API/DB/native/model/application effects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { qualifyCompatibleRecoveryProof, compatibleRecoveryBuildProofCallback, compatibleRecoveryProofSnapshotMatches,
 compatibleRecoveryPublicPayloadDigest, type CompatibleRecoveryProofFacts } from '../modules/agent-runtime/compatible-recovery-proof';
const shared=require(resolve(__dirname,'../../scripts/lib/agent-host-release-contract.cjs'));
const compose=require(resolve(__dirname,'../../scripts/lib/agent-host-release-compose-state.cjs'));
const {fixture:composeFixture,hash:H,image}=require(resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));
const clone=structuredClone,d=shared.releaseDigest,stamp='2026-10-04T12:10:00.000Z';
function wireFixture(): any {const f=composeFixture(),m=f.m,t=f.target,cadence={name:'scheduler',role:'cadence',source:'built',expectedState:'paused',mountDigest:H('9')};
 for(const c of[t.configuration,t.rollbackConfiguration,t.baseline.configuration])c.services.push(clone(cadence));
 t.baseline.images.push({name:'scheduler',imageDigest:image('4')});m.cleanup.protectedResourceIds.push(H('9'),image('4'));
 m.postObservation={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,controllerDigest:H('1'),
  fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-1,markerDigest:H('2'),summaryDigest:H('3')},
  baselineSequenceDigest:H('4'),budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:H('5'),ingressSettingsDigest:H('6'),observationSeconds:300,
   cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:H('7')},{name:'scheduler',behavior:'restore_existing_loop',behaviorDigest:H('8')}]}};
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);
 for(const[k,v]of[['deployment',t.configDigest],['rollback',t.rollbackConfigDigest],['baseline',t.baseline.configDigest]])m[k].configDigest=d([{targetId:t.targetId,configDigest:v}]);
 for(const[k,mode]of[['deployment',false],['rollback',true],['baseline','baseline']] as const)m[k].artifactSetDigest=shared.sourceArtifactDigest(m,f.s,mode);
 const input: any={...f.s,...Object.fromEntries(['requestId','taskId','applicationId','hostId','releaseExecutionId','releaserAgentId','releaserCredentialId','reviewId'].map(k=>[k,randomUUID()])),
  credentialVersion:1,materialVersion:H('1'),releaserRevision:stamp,expiresAt:'2026-10-04T13:00:00.000Z',manifest:m,manifestDigest:d(m)};
 const declaration=t.baseline.configuration.services.find((v: any)=>v.role==='database'),db={name:declaration.name,role:'database',containerId:H('a'),imageDigest:declaration.imageDigest,mountDigest:declaration.mountDigest,
  state:'running',health:'healthy',exitCode:0,createdAt:'2026-10-01T12:00:00.000Z'},inventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:t.targetId,observedAt:stamp,projectServiceSetComplete:true,physicalServices:[db],digest:H('0')};
 inventory.digest=shared.compatibleRecoveryInventoryDigest(inventory);
 const r={schemaVersion:'roost-compose-compatible-artifact-recovery-v1',prior:{releaseId:randomUUID(),expectedVersion:H('1'),closureId:randomUUID(),closureDigest:H('2'),
  failedOperationId:randomUUID(),failedOutcomeId:randomUUID(),failedEvidenceDigest:H('3'),previousManifestDigest:H('4')},
  currentEntry:{schemaVersion:'roost-compose-down-entry-v1',observedAt:stamp,targetId:t.targetId,configuration:clone(t.rollbackConfiguration),projectInventory:inventory,
   services:t.baseline.configuration.services.map((v: any)=>v.role==='database'?{...db,presence:'present',declarationDigest:d(v),inventoryDigest:inventory.digest,observedAt:stamp}:
    {presence:'absent',name:v.name,role:v.role,source:'built',declarationDigest:d(v),mountDigest:v.mountDigest,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:stamp}),
   historicalServiceReferences:t.baseline.configuration.services.map((v: any,i: number)=>({name:v.name,containerId:H(String(i+1)),imageDigest:v.imageDigest??image('f'),failedEvidenceDigest:H('3')})),
   imageAvailability:t.baseline.images.map((v: any)=>({...v,present:false})),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,
   database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,running:true,healthy:true,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},
   cadences:m.postObservation.runtimeResume.cadences.map((v: any)=>({presence:'absent',name:v.name,behaviorDigest:v.behaviorDigest,held:true,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:stamp})),
   databaseSettingsDigest:m.postObservation.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:m.postObservation.runtimeResume.ingressSettingsDigest,ingressBlocked:true,activeDeploymentCount:0,
   publicHealth:{healthy:false,healthDigest:H('5')},evidenceDigest:H('0')},
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId:randomUUID(),operationId:randomUUID(),agentHostId:input.hostId,evidenceDigest:H('0'),checkpointDigest:H('5'),
   controllerPid:1234,registeredChildCount:7,allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:stamp},
  replacement:{commit:input.commit,tree:input.candidateTree,artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,
   images:t.configuration.services.filter((v: any)=>v.source==='built').map((v: any)=>({name:v.name,imageDigest:image('f'),commit:input.commit,tree:input.candidateTree})),
   buildReceiptDigest:H('6'),compatibilityReceiptDigest:H('7'),schemaDigest:m.baseline.schemaDigest,schemaChangeAllowed:false},
  publication:{mode:'new_exact_commit',baseCommit:'e'.repeat(40),baseTree:'f'.repeat(40)},
  scopeAudit:{taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('8'),scopeDigest:H('0')},
  failurePolicy:{mode:'freeze_protected_database',automaticHistoricalRollback:false,dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true}};
 r.currentEntry.evidenceDigest=shared.compatibleRecoveryEntryDigest(r.currentEntry);r.nativeClosure.evidenceDigest=r.currentEntry.evidenceDigest;
  input.compatibleArtifactRecovery=r;r.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(input);return input;
}

function seal(v: any) { const { evidenceDigest, ...body } = v; v.evidenceDigest=d(body); }
function native(executionId: string) { return { ownedTreeReceipt: { version:'roost-windows-job-v2',attempt:executionId,rootExit:0,jobClosed:true,cleanup:true,activeProcesses:0,
 assignedBeforeResume:true,resumed:true,killOnClose:true,breakaway:false,sourceSha256:H('1') }, managedAdmission:{ qualification:'signed_native_v1',evidenceDigest:H('2'),jobSourceDigest:H('1') } }; }
function fixture(): CompatibleRecoveryProofFacts {
 const input=wireFixture(),r=input.compatibleArtifactRecovery,workspaceId=randomUUID(),owner=randomUUID(),sourceId=randomUUID(),attemptId=randomUUID();
 input.manifest.cleanup.protectedResourceIds.push(image('f'));input.manifestDigest=d(input.manifest);
 const build={schemaVersion:'roost-compatible-artifact-build-proof-v1',observedAt:'2026-10-04T12:07:00.000Z',executionId:attemptId,sourceExecutionId:sourceId,
  commit:input.commit,tree:input.candidateTree,images:clone(r.replacement.images),artifactSetDigest:r.replacement.artifactSetDigest,configurationDigest:r.replacement.configurationDigest,
  nativeReceiptDigest:H('3'),signedNativeVerified:true,ownedJobClosed:true,sourceUnchanged:true,evidenceDigest:H('0')};seal(build);
 const compatibility={schemaVersion:'roost-compose-replacement-compatibility-v1',observedAt:'2026-10-04T12:08:00.000Z',commit:input.commit,tree:input.candidateTree,
  artifactSetDigest:r.replacement.artifactSetDigest,configurationDigest:r.replacement.configurationDigest,images:clone(r.replacement.images),schemaDigest:input.manifest.baseline.schemaDigest,
  dataDigest:input.manifest.baseline.dataDigest,sequenceDigest:input.manifest.postObservation.baselineSequenceDigest,backupDigest:input.manifest.backup.digest,
  linuxImageVerified:true,asyncBridgeVerified:true,migrationImportVerified:true,restoredSchemaCompatible:true,nonOwnedDataUnchanged:true,sequencesUnchanged:true,providerRequests:0,externalActions:0,
  ownedJobClosed:true,sourceExecutionId:sourceId,buildExecutionId:attemptId,nativeReceiptDigest:build.nativeReceiptDigest,evidenceDigest:H('0')};seal(compatibility);
 r.replacement.buildReceiptDigest=build.evidenceDigest;r.replacement.compatibilityReceiptDigest=d(compatibility);r.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(input);
 const sourceActor=randomUUID(),sourceVerifier=randomUUID(),scopeVerifier=randomUUID();
 const sourceContract={assignment:{agentId:sourceActor},nativeBoundary:{profile:'coding-local'},modelSelection:{schemaVersion:'roost-managed-hermes-backend-v1',backend:'codex_responses'}};
 const sourceView={current:true,roleIssues:[],materialVersion:input.materialVersion,approvalCommit:input.commit,
  execution:{id:sourceId,taskId:input.taskId,workspaceId,applicationId:input.applicationId,agentHostId:input.hostId,status:'completed',attempt:1,checkpointVersion:1,
   completedAt:'2026-10-04T12:06:00.000Z',leaseToken:null,leaseExpiresAt:null,contextInvalidatedAt:null,errorState:null,changedFiles:['backend/pyproject.toml'],
   finalResponse:'Synthetic completed coding result, not an actual execution.',summary:'Fixture',prompt:'Fixture',
   metadata:{executionContract:sourceContract,resultRevision:{commit:input.commit,workingTree:'clean'}},verification:{...native(sourceId),codingTests:{schemaVersion:'roost-coding-tests-v1',passed:true,digest:H('4')},
    localCommit:{schemaVersion:'roost-local-commit-v1',executionId:sourceId,commit:input.commit,tree:input.candidateTree,testDigest:H('4'),baselineCommit:r.publication.baseCommit,
     branch:input.manifest.repository.candidateBranch,remotePush:false,deployment:false}}},contract:sourceContract,
  decision:{id:input.reviewId,decision:'approve',materialVersion:input.materialVersion,verifierId:sourceVerifier,createdAt:'2026-10-04T12:06:01.000Z',evidence:{reviewedCommit:input.commit}}};
 const scopeContract={assignment:{agentId:input.releaserAgentId},nativeBoundary:{profile:'inspect-readonly',inspectReadOnly:{kind:'auditor'}},modelSelection:{schemaVersion:'roost-managed-hermes-backend-v1',backend:'codex_responses'},
  access:{sandbox:'read-only',externalWrites:false,tools:['repository_read'],permissions:['repository_read']}};
 const scopeView={current:true,roleIssues:[],materialVersion:r.scopeAudit.materialVersion,approvalCommit:input.commit,
  execution:{id:r.scopeAudit.executionId,taskId:r.scopeAudit.taskId,workspaceId,applicationId:input.applicationId,agentHostId:input.hostId,status:'completed',attempt:1,checkpointVersion:1,
   completedAt:'2026-10-04T12:09:00.000Z',leaseToken:null,leaseExpiresAt:null,contextInvalidatedAt:null,errorState:null,changedFiles:[],
   finalResponse:'CHANGES_REQUIRED: runtime recovery is pending. Fictional audit.',summary:'Fixture negative history retained',prompt:'Fixture',metadata:{executionContract:scopeContract},
   verification:{...native(r.scopeAudit.executionId),readOnlyAudit:{schemaVersion:'roost-readonly-audit-v1',verdict:'verified',evidenceDigest:H('5'),preTree:H('6'),postTree:H('6'),gitState:'unchanged',processState:'unchanged',dockerState:'unchanged',nativeTools:[]}}},
  contract:scopeContract,decision:{id:r.scopeAudit.reviewId,decision:'approve',materialVersion:r.scopeAudit.materialVersion,verifierId:scopeVerifier,createdAt:'2026-10-04T12:09:01.000Z',
   evidence:{reviewedCommit:input.commit,evidence:[{kind:'artifact',verdict:'pass',reference:'roost-release-compatible-artifact-scope:'+r.scopeAudit.scopeDigest},
    {kind:'artifact',verdict:'pass',reference:'roost-compatible-artifact-build:'+build.evidenceDigest},
    {kind:'artifact',verdict:'pass',reference:'roost-compatible-artifact-restore:'+d(compatibility)},
    {kind:'test',verdict:'pass',reference:'roost-compatible-native-test-receipts:'+build.nativeReceiptDigest}]}}};
 const metadata={schemaVersion:'roost-compatible-recovery-native-provenance-v1',classification:'owner_verified_native_receipt',nativeAttemptId:attemptId,
  nativeAttemptKind:'root_owned_windows_job_run',nativeAttemptIsAgentExecution:false,sourceExecutionId:sourceId,privateSignedRecordDigest:H('7'),jobReceiptDigest:build.nativeReceiptDigest,
  toolchainDigest:H('8'),sourceCASDigest:H('9'),publicPayloadDigest:compatibleRecoveryPublicPayloadDigest(build,compatibility),build,compatibility};
 const record={id:randomUUID(),workspaceId,applicationId:input.applicationId,type:'test',source:'human',reference:'roost-compatible-native-build:'+input.commit+':'+metadata.privateSignedRecordDigest,
  observedAt:new Date(compatibility.observedAt),createdAt:new Date('2026-10-04T12:08:01.000Z'),verifiedAt:new Date('2026-10-04T12:08:02.000Z'),updatedAt:new Date('2026-10-04T12:08:02.000Z'),
  verificationStatus:'verified',verifiedByType:'user',verifiedById:owner,metadata};
 return {workspaceId,input,issuerUserId:owner,primaryOwnerUserId:owner,records:[record],sourceView,scopeView,previousClosureCreatedAt:'2026-10-04T12:05:00.000Z',nativeAttemptAgentExecutionId:null,now:new Date(stamp)};
}
function good(facts: CompatibleRecoveryProofFacts) { const q=qualifyCompatibleRecoveryProof(facts);assert(!('error' in q));return q; }
test('owner-verified normal DB provenance qualifies without claiming server OS/private-HMAC verification or release authority',()=>{const f=fixture(),before=clone(f),q=good(f);
 assert.deepEqual(f,before);assert.equal(q.snapshot.classification,'owner_verified_native_receipt');assert.equal(q.snapshot.serverOperatingSystemAttestation,false);
 assert.equal(q.snapshot.serverPrivateSignatureVerification,false);assert.equal(q.snapshot.releaseAuthority,false);assert.equal(q.snapshot.nativeAttemptIsAgentExecution,false);
 assert.notEqual(q.snapshot.nativeAttemptId,q.snapshot.sourceExecutionId);assert.equal(f.scopeView.execution.finalResponse,before.scopeView.execution.finalResponse);});
test('qualified process brand supplies exact synchronous pure-factory callback; copied JSON flags do not',()=>{const f=fixture(),q=good(f),meta=f.records[0].metadata,callback=compatibleRecoveryBuildProofCallback(q.proof);
 assert.equal(callback(meta.build,meta.compatibility,f.input),null);assert.equal(shared.compatibleRecoveryReplacementError(f.input,f.sourceView,meta.build,meta.compatibility,f.now,callback),null);
 assert.notEqual(compatibleRecoveryBuildProofCallback(clone(q.proof))(meta.build,meta.compatibility,f.input),null);
 assert.notEqual(callback({...meta.build,commit:'0'.repeat(40)},meta.compatibility,f.input),null);});
const changes: Record<string,(f:any)=>void>={noRecords:f=>f.records=[],duplicates:f=>f.records.push(clone(f.records[0])),wrongWorkspace:f=>f.records[0].workspaceId=randomUUID(),wrongApp:f=>f.records[0].applicationId=randomUUID(),
 metadataFlagsOnly:f=>f.records[0].metadata={nativeVerified:true},unverified:f=>f.records[0].verificationStatus='unverified',rejected:f=>f.records[0].verificationStatus='rejected',stale:f=>f.records[0].verificationStatus='stale',
 agentVerifier:f=>f.records[0].verifiedByType='agent',wrongVerifier:f=>f.records[0].verifiedById=randomUUID(),ownerChanged:f=>f.primaryOwnerUserId=randomUUID(),
 missingLookup:f=>delete f.nativeAttemptAgentExecutionId,actualRoostExecution:f=>f.nativeAttemptAgentExecutionId=f.records[0].metadata.nativeAttemptId,
 relabelNativeAttempt:f=>f.records[0].metadata.nativeAttemptIsAgentExecution=true,wrongAttempt:f=>f.records[0].metadata.nativeAttemptId=randomUUID(),wrongCodingExecution:f=>f.records[0].metadata.sourceExecutionId=randomUUID(),
 keyHandoff:f=>f.records[0].metadata.privateKey='fictional prohibited key',falseServerAttestation:f=>f.records[0].metadata.classification='server_cryptographic_os_attestation',
 publicPayloadTamper:f=>f.records[0].metadata.publicPayloadDigest=H('0'),signedRecordReferenceDrift:f=>f.records[0].metadata.privateSignedRecordDigest=H('0'),jobDigest:f=>f.records[0].metadata.jobReceiptDigest=H('0'),
 wrongBuildSource:f=>f.records[0].metadata.build.sourceExecutionId=randomUUID(),oldBuildCommit:f=>f.records[0].metadata.build.commit=f.input.baseCommit,
 wrongImages:f=>f.records[0].metadata.compatibility.images[0].imageDigest=image('0'),schemaDrift:f=>f.records[0].metadata.compatibility.schemaDigest=H('0'),dataDrift:f=>f.records[0].metadata.compatibility.dataDigest=H('0'),
 sequenceDrift:f=>f.records[0].metadata.compatibility.sequenceDigest=H('0'),providerCalls:f=>f.records[0].metadata.compatibility.providerRequests=1,
 beforeOwnerVerification:f=>f.scopeView.execution.completedAt='2026-10-04T12:08:01.000Z',verifiedBeforeCreate:f=>f.records[0].verifiedAt=new Date('2026-10-04T12:08:00.000Z'),
 createdBeforeObservation:f=>f.records[0].createdAt=new Date('2026-10-04T12:07:00.000Z'),futureProof:f=>f.records[0].metadata.compatibility.observedAt='2026-10-04T12:11:00.000Z',
 oldProof:f=>f.now=new Date('2026-10-05T12:11:00.000Z'),sourceBasisStale:f=>f.sourceView.current=false,scopeBasisStale:f=>f.scopeView.current=false,
 wrongCurrentMaterial:f=>f.sourceView.materialVersion=H('0'),scopeMaterialChanged:f=>f.scopeView.decision.materialVersion=H('0'),scopeWrongReference:f=>f.scopeView.decision.evidence.evidence[0].reference='old-scope',
 missingBuildLink:f=>f.scopeView.decision.evidence.evidence.splice(1,1),missingCompatibilityLink:f=>f.scopeView.decision.evidence.evidence.splice(2,1),negativeBuildLink:f=>f.scopeView.decision.evidence.evidence[1].verdict='fail',
 dirtyScope:f=>f.scopeView.execution.changedFiles=['backend/pyproject.toml'],unsignedScope:f=>f.scopeView.execution.verification.managedAdmission.qualification='boolean',
 liveScopeChild:f=>f.scopeView.execution.verification.ownedTreeReceipt.activeProcesses=1,scopeIsCoder:f=>f.scopeView.execution.id=f.sourceView.execution.id,
 scopeMissingManagedPolicy:f=>delete f.scopeView.contract.modelSelection,
 missingCodingActor:f=>delete f.sourceView.contract.assignment.agentId,cancelledScope:f=>f.scopeView.execution.cancelRequestedAt=new Date('2026-10-04T12:08:03.000Z'),
 sameReviewerAsCoder:f=>f.scopeView.decision.verifierId=f.sourceView.contract.assignment.agentId,wrongSourceHost:f=>f.sourceView.execution.agentHostId=randomUUID(),scopeLeaseLive:f=>f.scopeView.execution.leaseToken=randomUUID()};
for(const[name,change]of Object.entries(changes))test('refuses '+name,()=>{const f=fixture();change(f);assert('error' in qualifyCompatibleRecoveryProof(f));});
test('exact live reread succeeds; metadata, status, provenance, code/scope material and literal audit drift invalidate snapshot',()=>{const f=fixture(),q=good(f);assert.equal(compatibleRecoveryProofSnapshotMatches(q.snapshot,clone(f)),true);
 for(const change of[(x:any)=>x.records[0].metadata.toolchainDigest=H('0'),(x:any)=>x.records[0].updatedAt=new Date('2026-10-04T12:09:02.000Z'),
  (x:any)=>x.records[0].verificationStatus='stale',(x:any)=>x.sourceView.decision.evidence.extra='changed',(x:any)=>x.scopeView.execution.finalResponse+=' changed']){
   const next=clone(f);change(next);assert.equal(compatibleRecoveryProofSnapshotMatches(q.snapshot,next),false);
 }
 const clockOnly=clone(f);clockOnly.now=new Date('2026-10-04T12:10:01.000Z');assert.equal(compatibleRecoveryProofSnapshotMatches(q.snapshot,clockOnly),true);});
test('Prisma Date values remain bound in basis digest, including reviewer chronology',()=>{const f=fixture();f.sourceView.decision.createdAt=new Date(f.sourceView.decision.createdAt);f.scopeView.decision.createdAt=new Date(f.scopeView.decision.createdAt);
 const q=good(f),next=clone(f);next.sourceView.decision.createdAt=new Date('2026-10-04T12:06:02.000Z');assert.equal(compatibleRecoveryProofSnapshotMatches(q.snapshot,next),false);});
test('only known server snapshot fields may be projected; unknown capabilities cannot be stripped to manufacture ordinary input',()=>{const f=fixture(),q=good(f),meta=f.records[0].metadata;
 const snapshot={...f.input,readinessDigest:H('a'),configurationDigest:H('b'),releaseId:randomUUID()};assert.equal(compatibleRecoveryBuildProofCallback(q.proof)(meta.build,meta.compatibility,snapshot),null);
 const unknown={...snapshot,publishedGitBasis:{}};assert.notEqual(compatibleRecoveryBuildProofCallback(q.proof)(meta.build,meta.compatibility,unknown),null);});
