// Fictional read-store fixtures only. No DB/API/native/model/application effects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { loadCompatibleRecoveryProof, type CompatibleRecoveryReadStore } from '../modules/agent-runtime/compatible-recovery-store';
import { compatibleRecoveryPublicPayloadDigest, compatibleRecoveryBuildProofCallback, compatibleRecoveryProofSnapshotMatches, type CompatibleRecoveryProofFacts } from '../modules/agent-runtime/compatible-recovery-proof';
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

function harness(f=fixture()) {
 const calls: Array<{name:string,args:any}>=[];
 const prior=f.input.compatibleArtifactRecovery.prior;
 const previous:any={release:{id:prior.releaseId,workspace_id:f.workspaceId,snapshot:{applicationId:f.input.applicationId,hostId:f.input.hostId}},expectedVersion:prior.expectedVersion,
  failedClosures:[{id:prior.closureId,release_id:prior.releaseId,closure_digest:prior.closureDigest,created_at:f.previousClosureCreatedAt}]};
 const values:any={workspace:{id:f.workspaceId,ownerUserId:f.issuerUserId},membership:{workspaceId:f.workspaceId,userId:f.issuerUserId,role:'owner'},records:clone(f.records),execution:null};
 const method=(name:string,key:string)=>async(args:any)=>{calls.push({name,args:clone(args)});return values[key];};
 const prohibited=()=>assert.fail('read-only proof adapter attempted a mutation');
 const tx={workspace:{findUnique:method('workspace.findUnique','workspace'),update:prohibited},
  workspaceMembership:{findFirst:method('workspaceMembership.findFirst','membership'),create:prohibited},
  applicationEvidence:{findMany:method('applicationEvidence.findMany','records'),create:prohibited,update:prohibited},
  agentExecution:{findFirst:method('agentExecution.findFirst','execution'),create:prohibited,update:prohibited}} as unknown as CompatibleRecoveryReadStore;
 const run=()=>loadCompatibleRecoveryProof(tx,f.workspaceId,f.input,f.issuerUserId,f.sourceView,f.scopeView,previous,f.now);
 return {f,calls,values,previous,tx,run};
}
test('loads exact authoritative DB facts and performs real native-attempt namespace lookup before returning a brand',async()=>{
 const h=harness(),q=await h.run();assert(!('error'in q));assert.deepEqual(h.calls.map(v=>v.name),['workspace.findUnique','workspaceMembership.findFirst','applicationEvidence.findMany','agentExecution.findFirst']);
 assert.deepEqual(h.calls[0].args,{where:{id:h.f.workspaceId},select:{id:true,ownerUserId:true}});
 assert.deepEqual(h.calls[1].args.where,{workspaceId:h.f.workspaceId,userId:h.f.issuerUserId,role:'owner'});
 const args=h.calls[2].args,r=h.f.input.compatibleArtifactRecovery;
 assert.deepEqual(args.where,{workspaceId:h.f.workspaceId,applicationId:h.f.input.applicationId,type:'test',source:'human',verificationStatus:'verified',
  reference:{startsWith:'roost-compatible-native-build:'+h.f.input.commit+':'},metadata:{path:['build','evidenceDigest'],equals:r.replacement.buildReceiptDigest}});
 assert.equal(args.take,2);assert.deepEqual(args.orderBy,{createdAt:'desc'});assert.equal(args.select.metadata,true);assert.equal(args.select.url,undefined);
 assert.deepEqual(h.calls[3].args,{where:{id:h.f.records[0].metadata.nativeAttemptId,workspaceId:h.f.workspaceId},select:{id:true}});
 assert.deepEqual(q.build,h.f.records[0].metadata.build);assert.deepEqual(q.compatibility,h.f.records[0].metadata.compatibility);
 assert.equal(q.snapshot.serverOperatingSystemAttestation,false);assert.equal(q.snapshot.serverPrivateSignatureVerification,false);
 assert.equal(compatibleRecoveryBuildProofCallback(q.proof)(q.build,q.compatibility,h.f.input),null);
});
const changes:Record<string,(h:ReturnType<typeof harness>)=>void>={
 ownerMissing:h=>h.values.workspace=null,ownerChanged:h=>h.values.workspace.ownerUserId=randomUUID(),membershipMissing:h=>h.values.membership=null,
 adminIsNotOwner:h=>h.values.membership.role='admin',membershipWrongWorkspace:h=>h.values.membership.workspaceId=randomUUID(),
 noEvidence:h=>h.values.records=[],ambiguousEvidence:h=>h.values.records.push(clone(h.values.records[0])),
 crossWorkspaceRecord:h=>h.values.records[0].workspaceId=randomUUID(),crossApplicationRecord:h=>h.values.records[0].applicationId=randomUUID(),
 wrongEvidenceSource:h=>h.values.records[0].source='agent',verifiedByAgent:h=>h.values.records[0].verifiedByType='agent',unverifiedRecord:h=>h.values.records[0].verificationStatus='unverified',
 metadataNotObject:h=>h.values.records[0].metadata='not native evidence',invalidNativeId:h=>h.values.records[0].metadata.nativeAttemptId='invalid',
 actualAgentExecution:h=>h.values.execution={id:h.f.records[0].metadata.nativeAttemptId},unconfirmedLookup:h=>h.values.execution=undefined,
 malformedLookup:h=>h.values.execution={},wrongLookupSubject:h=>h.values.execution={id:randomUUID()},payloadMutation:h=>h.values.records[0].metadata.build.commit=h.f.input.baseCommit,
 signaturePointerMutation:h=>h.values.records[0].metadata.privateSignedRecordDigest=H('0'),jobDigestMutation:h=>h.values.records[0].metadata.jobReceiptDigest=H('0'),
 sourceBasisChanged:h=>h.f.sourceView.current=false,scopeBasisChanged:h=>h.f.scopeView.current=false,
 wrongPriorWorkspace:h=>h.previous.release.workspace_id=randomUUID(),wrongPriorRelease:h=>h.previous.release.id=randomUUID(),wrongPriorVersion:h=>h.previous.expectedVersion=H('0'),
 wrongPriorApplication:h=>h.previous.release.snapshot.applicationId=randomUUID(),wrongPriorHost:h=>h.previous.release.snapshot.hostId=randomUUID(),
 closureMissing:h=>h.previous.failedClosures=[],closureAmbiguous:h=>h.previous.failedClosures.push(clone(h.previous.failedClosures[0])),
 closureForeignRelease:h=>h.previous.failedClosures[0].release_id=randomUUID(),closureDigestDrift:h=>h.previous.failedClosures[0].closure_digest=H('0'),
 closureMissingClock:h=>delete h.previous.failedClosures[0].created_at,closureFuture:h=>h.previous.failedClosures[0].created_at='2026-10-04T12:11:00.000Z'};
for(const[name,change]of Object.entries(changes))test('DB adapter refuses '+name,async()=>{const h=harness();change(h);assert('error'in await h.run());});
test('missing owner/ambiguous evidence refuses before native lookup and produces no brand',async()=>{const owner=harness();owner.values.workspace.ownerUserId=randomUUID();assert('error'in await owner.run());assert.deepEqual(owner.calls.map(v=>v.name),['workspace.findUnique']);
 const records=harness();records.values.records.push(clone(records.values.records[0]));assert('error'in await records.run());assert(!records.calls.some(v=>v.name==='agentExecution.findFirst'));});
test('request-supplied server proof cannot be stripped into authority; no DB call occurs',async()=>{for(const value of[undefined,{},true]){const h=harness();h.f.input.compatibleRecoveryProof=value;
 assert('error'in await h.run());assert.deepEqual(h.calls,[]);}});
test('camel normal closure aliases work without copying another historical closure time',async()=>{const h=harness(),c=h.previous.failedClosures[0];
 h.previous.release.workspaceId=h.previous.release.workspace_id;delete h.previous.release.workspace_id;
 c.releaseId=c.release_id;delete c.release_id;c.closureDigest=c.closure_digest;delete c.closure_digest;c.createdAt=new Date(c.created_at);delete c.created_at;
 const q=await h.run();assert(!('error'in q));assert.equal(q.snapshot.scopeDigest,h.f.input.compatibleArtifactRecovery.scopeAudit.scopeDigest);});
test('later authoritative reload detects changed metadata against saved snapshot without pretending it is OS-verified',async()=>{const h=harness(),first=await h.run();assert(!('error'in first));
 assert.equal(compatibleRecoveryProofSnapshotMatches(first.snapshot,{...h.f,records:h.values.records}),true);
 h.values.records[0].metadata.sourceCASDigest=H('0');const second=await h.run();assert(!('error'in second));
 assert.notEqual(second.snapshot.metadataDigest,first.snapshot.metadataDigest);assert.equal(compatibleRecoveryProofSnapshotMatches(first.snapshot,{...h.f,records:h.values.records}),false);
 assert.equal(second.snapshot.serverOperatingSystemAttestation,false);});
