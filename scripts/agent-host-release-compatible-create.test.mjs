// Full wire parsing only. These synthetic inputs are not granted/live evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import shared from './lib/agent-host-release-contract.cjs';
import compose from './lib/agent-host-release-compose-state.cjs';
import {fixture as composeFixture,hash as H,image} from './fixtures/release-compose-contract.cjs';
const clone=structuredClone,d=shared.releaseDigest,stamp='2026-10-04T12:10:00.000Z';
function fixture(){const f=composeFixture(),m=f.m,t=f.target,cadence={name:'scheduler',role:'cadence',source:'built',expectedState:'paused',mountDigest:H('9')};
 for(const c of[t.configuration,t.rollbackConfiguration,t.baseline.configuration])c.services.push(clone(cadence));
 t.baseline.images.push({name:'scheduler',imageDigest:image('4')});m.cleanup.protectedResourceIds.push(H('9'),image('4'));
 m.postObservation={schemaVersion:'roost-release-post-observation-v1',kind:'synthetic_recent_activity',candidateCommit:f.s.commit,candidateTree:f.s.candidateTree,controllerDigest:H('1'),
  fixture:{fixtureId:randomUUID(),userId:randomUUID(),sessionId:randomUUID(),eventId:randomUUID(),traceId:randomUUID(),memoryId:-1,markerDigest:H('2'),summaryDigest:H('3')},
  baselineSequenceDigest:H('4'),budget:{providerRequests:0,externalActions:0},runtimeResume:{approved:true,databaseSettingsDigest:H('5'),ingressSettingsDigest:H('6'),observationSeconds:300,
   cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:H('7')},{name:'scheduler',behavior:'restore_existing_loop',behaviorDigest:H('8')}]}};
 t.configDigest=compose.composeConfigurationDigest(t.configuration);t.rollbackConfigDigest=compose.composeConfigurationDigest(t.rollbackConfiguration);t.baseline.configDigest=compose.composeConfigurationDigest(t.baseline.configuration);
 for(const[k,v]of[['deployment',t.configDigest],['rollback',t.rollbackConfigDigest],['baseline',t.baseline.configDigest]])m[k].configDigest=d([{targetId:t.targetId,configDigest:v}]);
 for(const[k,mode]of[['deployment',false],['rollback',true],['baseline','baseline']])m[k].artifactSetDigest=shared.sourceArtifactDigest(m,f.s,mode);
 const input={...f.s,...Object.fromEntries(['requestId','taskId','applicationId','hostId','releaseExecutionId','releaserAgentId','releaserCredentialId','reviewId'].map(k=>[k,randomUUID()])),
  credentialVersion:1,materialVersion:H('1'),releaserRevision:stamp,expiresAt:'2026-10-04T13:00:00.000Z',manifest:m,manifestDigest:d(m)};
 const declaration=t.baseline.configuration.services.find(v=>v.role==='database'),db={name:declaration.name,role:'database',containerId:H('a'),imageDigest:declaration.imageDigest,mountDigest:declaration.mountDigest,
  state:'running',health:'healthy',exitCode:0,createdAt:'2026-10-01T12:00:00.000Z'},inventory={schemaVersion:'roost-compose-project-inventory-v1',targetId:t.targetId,observedAt:stamp,projectServiceSetComplete:true,physicalServices:[db],digest:H('0')};
 inventory.digest=shared.compatibleRecoveryInventoryDigest(inventory);
 const r={schemaVersion:'roost-compose-compatible-artifact-recovery-v1',prior:{releaseId:randomUUID(),expectedVersion:H('1'),closureId:randomUUID(),closureDigest:H('2'),
  failedOperationId:randomUUID(),failedOutcomeId:randomUUID(),failedEvidenceDigest:H('3'),previousManifestDigest:H('4')},
  currentEntry:{schemaVersion:'roost-compose-down-entry-v1',observedAt:stamp,targetId:t.targetId,configuration:clone(t.rollbackConfiguration),projectInventory:inventory,
   services:t.baseline.configuration.services.map(v=>v.role==='database'?{...db,presence:'present',declarationDigest:d(v),inventoryDigest:inventory.digest,observedAt:stamp}:
    {presence:'absent',name:v.name,role:v.role,source:'built',declarationDigest:d(v),mountDigest:v.mountDigest,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:stamp}),
   historicalServiceReferences:t.baseline.configuration.services.map((v,i)=>({name:v.name,containerId:H(String(i+1)),imageDigest:v.imageDigest??image('f'),failedEvidenceDigest:H('3')})),
   imageAvailability:t.baseline.images.map(v=>({...v,present:false})),schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,sequenceDigest:m.postObservation.baselineSequenceDigest,
   database:{containerId:db.containerId,imageDigest:db.imageDigest,mountDigest:db.mountDigest,running:true,healthy:true,readOnlyFence:true,activeOtherSessions:0,ownedTransactions:0},
   cadences:m.postObservation.runtimeResume.cadences.map(v=>({presence:'absent',name:v.name,behaviorDigest:v.behaviorDigest,held:true,containerId:null,imageDigest:null,state:'absent',absenceVerified:true,inventoryDigest:inventory.digest,observedAt:stamp})),
   databaseSettingsDigest:m.postObservation.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:m.postObservation.runtimeResume.ingressSettingsDigest,ingressBlocked:true,activeDeploymentCount:0,
   publicHealth:{healthy:false,healthDigest:H('5')},evidenceDigest:H('0')},
  nativeClosure:{schemaVersion:'roost-release-owner-native-closure-v1',releaseId:randomUUID(),operationId:randomUUID(),agentHostId:input.hostId,evidenceDigest:H('0'),checkpointDigest:H('5'),
   controllerPid:1234,registeredChildCount:7,allChildrenClosed:true,nativeProcessesAbsent:true,writerAbsent:true,observedAt:stamp},
  replacement:{commit:input.commit,tree:input.candidateTree,artifactSetDigest:m.deployment.artifactSetDigest,configurationDigest:m.deployment.configDigest,
   images:t.configuration.services.filter(v=>v.source==='built').map(v=>({name:v.name,imageDigest:image('f'),commit:input.commit,tree:input.candidateTree})),
   buildReceiptDigest:H('6'),compatibilityReceiptDigest:H('7'),schemaDigest:m.baseline.schemaDigest,schemaChangeAllowed:false},
  publication:{mode:'new_exact_commit',baseCommit:'e'.repeat(40),baseTree:'f'.repeat(40)},
  scopeAudit:{taskId:randomUUID(),executionId:input.releaseExecutionId,reviewId:randomUUID(),materialVersion:H('8'),scopeDigest:H('0')},
  failurePolicy:{mode:'freeze_protected_database',automaticHistoricalRollback:false,dataRestoreAllowed:false,volumeDeletionAllowed:false,keepIngressBlocked:true,keepCadencesHeld:true}};
 r.currentEntry.evidenceDigest=shared.compatibleRecoveryEntryDigest(r.currentEntry);r.nativeClosure.evidenceDigest=r.currentEntry.evidenceDigest;
 input.compatibleArtifactRecovery=r;r.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(input);return input;
}
function reseal(input){input.manifestDigest=d(input.manifest);input.compatibleArtifactRecovery.scopeAudit.scopeDigest=shared.compatibleRecoveryScopeDigest(input);}
test('shared module resolves its lazy additive schema without a loader cycle; full exact body parses',()=>{const x=fixture(),before=clone(x),out=shared.createReleaseSchema.parse(x);
 assert.deepEqual(out,x);assert.deepEqual(x,before);assert.equal(out.compatibleArtifactRecovery.currentEntry.projectInventory.physicalServices.length,1);
 assert.equal(typeof shared.compatibleRecoveryAdmissionError,'function');assert.equal(typeof shared.compatibleRecoveryReplacementError,'function');
 assert.equal(shared.compatibleRecoveryFailureState({journal:[]}).healthyRollbackProven,false);});
test('ordinary legacy body has no implicit compatible recovery capability',()=>{const x=fixture();delete x.compatibleArtifactRecovery;const parsed=shared.createReleaseSchema.parse(x);
 assert.equal(Object.hasOwn(parsed,'compatibleArtifactRecovery'),false);assert.equal(shared.compatibleRecoveryScopeDigest(parsed),null);});
for(const value of[null,false,true,{},[],undefined,'recovery',1])test('malformed opt-in never falls through to ordinary parsing: '+String(value),()=>{const x=fixture();x.compatibleArtifactRecovery=value;assert.equal(shared.createReleaseSchema.safeParse(x).success,false);});
for(const key of['recoveryOnly','predecessor','baselineRestart','baselineAdoption','baselineRevalidation','gitPublicationBase','publishedGitBasis','successorBasis'])test('full create rejects combined capability '+key,()=>{const x=fixture();
 x[key]=key==='predecessor'?{releaseId:randomUUID(),expectedVersion:H('0')}:key==='gitPublicationBase'?{commit:'e'.repeat(40),tree:'f'.repeat(40)}:{};
 assert.equal(shared.createReleaseSchema.safeParse(x).success,false);});
for(const key of['predecessor','baselineRestart','gitPublicationBase','recoveryOnly','baselineAdoption','baselineRevalidation'])test('explicit undefined companion does not hide combined capability '+key,()=>{const x=fixture();x[key]=undefined;
 assert.equal(shared.createReleaseSchema.safeParse(x).success,false);});
const changes={scopeDigest:x=>x.compatibleArtifactRecovery.scopeAudit.scopeDigest=H('0'),manifestDigest:x=>x.manifestDigest=H('0'),
 oldReplacementCommit:x=>x.compatibleArtifactRecovery.replacement.commit=x.baseCommit,wrongReplacementTree:x=>x.compatibleArtifactRecovery.replacement.tree='9'.repeat(40),
 wrongArtifact:x=>x.compatibleArtifactRecovery.replacement.artifactSetDigest=H('0'),wrongConfig:x=>x.compatibleArtifactRecovery.replacement.configurationDigest=H('0'),
 schemaDrift:x=>x.compatibleArtifactRecovery.replacement.schemaDigest=H('0'),currentDataDrift:x=>x.compatibleArtifactRecovery.currentEntry.dataDigest=H('0'),
 currentTarget:x=>x.compatibleArtifactRecovery.currentEntry.targetId='foreign',wrongSequence:x=>x.compatibleArtifactRecovery.currentEntry.sequenceDigest=H('0'),
 borrowedAuditExecution:x=>x.compatibleArtifactRecovery.scopeAudit.executionId=randomUUID(),sourceReviewBorrowedAsScope:x=>x.compatibleArtifactRecovery.scopeAudit.reviewId=x.reviewId,
 coderTaskBorrowedAsScope:x=>x.compatibleArtifactRecovery.scopeAudit.taskId=x.taskId,publicationIsCandidate:x=>x.compatibleArtifactRecovery.publication.baseCommit=x.commit,
 schemaChangeAllowed:x=>x.compatibleArtifactRecovery.replacement.schemaChangeAllowed=true,healthyRollbackClaim:x=>x.compatibleArtifactRecovery.failurePolicy.automaticHistoricalRollback=true,
 nativeStillRunning:x=>x.compatibleArtifactRecovery.nativeClosure.writerAbsent=false,absenceHasLiveId:x=>x.compatibleArtifactRecovery.currentEntry.services.find(v=>v.presence==='absent').containerId=H('0'),
 rawOwnerCommand:x=>x.compatibleArtifactRecovery.command='run arbitrary command',rawEnvironment:x=>x.compatibleArtifactRecovery.currentEntry.environment={PASSWORD:'fictional'}};
for(const[n,change]of Object.entries(changes))test('full create refuses '+n,()=>{const x=fixture();change(x);if(!['scopeDigest','manifestDigest'].includes(n))reseal(x);assert.equal(shared.createReleaseSchema.safeParse(x).success,false);});
test('historical baseline and rollback remain untouched by parsing/exported helpers',()=>{const x=fixture(),before=clone({baseline:x.manifest.baseline,rollback:x.manifest.rollback,images:x.manifest.deployment.targets[0].baseline.images});
 shared.createReleaseSchema.parse(x);shared.compatibleRecoveryScopeDigest(x);assert.deepEqual({baseline:x.manifest.baseline,rollback:x.manifest.rollback,images:x.manifest.deployment.targets[0].baseline.images},before);});
