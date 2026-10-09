import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {executionContractSchema} from './lib/agent-host-execution-packet.mjs';
import shared from './lib/agent-host-release-inspection-contract.cjs';
import {validPacketFixture} from './fixtures/execution-packet.mjs';
import wire from './lib/agent-host-release-contract.cjs';
import {compatibleConfigClosureFixture}from'./fixtures/release-compatible-config-closure.mjs';
import {createRequire}from'node:module';import path from'node:path';import{fileURLToPath}from'node:url';
const pin={schemaVersion:'roost-governed-release-inspection-v1',commit:'a'.repeat(40),tree:'b'.repeat(40),
 manifestDigest:'c'.repeat(64),scopeDigest:'d'.repeat(64),imageDigest:'sha256:'+'e'.repeat(64),minimumObservationSeconds:1200,minimumRestoredActivitySeconds:300};
test('static inspection is admitted only on the existing read-only auditor boundary',()=>{
 const c=validPacketFixture().packet.contract;
 c.nativeBoundary={profile:'inspect-readonly',readPaths:['README.md'],runtime:{required:false,ports:[]},inspectReadOnly:{kind:'auditor'},releaseInspection:pin};
 assert.equal(executionContractSchema.safeParse(c).success,true);
 c.nativeBoundary.inspectReadOnly={kind:'verifier',verifiedExecutionId:randomUUID(),verifiedEvidenceDigest:'a'.repeat(64)};
 assert.equal(executionContractSchema.safeParse(c).success,false);
});
test('future selection contains only UUID selectors, never evidence or a path',()=>{
 const v={schemaVersion:'roost-release-verification-selection-v1',releaseId:randomUUID(),custodyEvidenceId:randomUUID()};
 assert.equal(shared.releaseVerificationSelectionSchema.safeParse(v).success,true);
 for(const extra of [{file:'C:/foreign.json'},{evidence:{healthy:true}},{releaseAuthority:true}])assert.equal(shared.releaseVerificationSelectionSchema.safeParse({...v,...extra}).success,false);
 assert.equal(shared.releaseVerificationSelectionSchema.safeParse({...v,custodyEvidenceId:'../foreign'}).success,false);
});
test('serialization cannot omit the fixed outcome or stored-provenance validators',()=>{
 const args={inspection:pin,applicationId:randomUUID(),hostId:randomUUID(),agentId:randomUUID()};
 assert.throws(()=>shared.assertCompletedReleaseInspection({},args),/canonical_validator_required/);
 assert.throws(()=>shared.assertCompletedReleaseInspection({},{...args,validateOutcome:()=>null}),/stored_proof_validator_required/);
});
// These generated closure/phase rows are counterfactual protocol inputs only.
// Parent Git uses the real canonical validator; current runtime is an injected
// qualification boundary in this pure test, never native or production proof.
const req=createRequire(import.meta.url),{require:ts}=req('tsx/cjs/api');
const backend=ts(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/modules/agent-runtime/governed-release-contract.ts'),import.meta.url);
const d=wire.releaseDigest,H=c=>c.repeat(64),clone=structuredClone;
function continuationInspectionFixture(){const f=compatibleConfigClosureFixture(),parent=f.state,old=f.s,closureAt=f.clock+1;
 old.requestId=randomUUID();parent.release.workspaceId=randomUUID();
 for(const row of parent.journal){row.releaseId=parent.release.id;row.outcome.operationId=row.id;row.outcome.requestId=randomUUID();row.outcome.observationOnly=row.outcome.status==='reconciled';}
 const receipt={...clone(f.body),releaseId:parent.release.id,applicationId:old.applicationId,hostId:old.hostId,issuerUserId:parent.release.issuerUserId,
  failedOutcomeId:f.operation.outcome.id,failedEvidenceDigest:d(f.operation.outcome.evidence)};
 const revocationId=randomUUID(),closure={id:randomUUID(),releaseId:parent.release.id,failedOperationId:f.operation.id,failedOutcomeId:f.operation.outcome.id,
  expectedVersion:receipt.expectedVersion,closureDigest:d(receipt),consentDigest:receipt.consentDigest,revocationId,snapshot:receipt,createdAt:new Date(closureAt).toISOString()};
 parent.failedClosures=[closure];parent.revocations=[{id:revocationId}];parent.expectedVersion=H('d');parent.status='failed';
 const body=clone(old);delete body.releaseId;body.manifest.observation.seconds=1200;body.manifest.postObservation.runtimeResume.observationSeconds=300;
 body.manifestDigest=d(body.manifest);body.compatibleConfigurationContinuation={releaseId:parent.release.id,closureId:closure.id,closureDigest:closure.closureDigest,
  gitOperationIds:Object.fromEntries(parent.journal.slice(0,4).map(o=>[o.operation,o.id]))};
 body.compatibleArtifactRecovery.scopeAudit.scopeDigest=wire.compatibleRecoveryScopeDigest(body);
 const basis={schemaVersion:'roost-compatible-configuration-continuation-basis-v1',releaseId:parent.release.id,expectedVersion:parent.expectedVersion,
  closureId:closure.id,closureDigest:closure.closureDigest,previousManifestDigest:old.manifestDigest,journalDigest:d(parent.journal),failedOperationId:f.operation.id,
  failedOutcomeId:f.operation.outcome.id,failedEvidenceDigest:d(f.operation.outcome.evidence),applicationId:old.applicationId,hostId:old.hostId,taskId:old.taskId,
  reviewId:old.reviewId,materialVersion:old.materialVersion,commit:old.commit,tree:old.candidateTree,repository:clone(old.manifest.repository),
  publication:{baseCommit:old.compatibleArtifactRecovery.publication.baseCommit,baseTree:old.compatibleArtifactRecovery.publication.baseTree,pullRequestNumber:4},
  git:parent.journal.slice(0,4).map(o=>({operation:o.operation,operationId:o.id,outcomeId:o.outcome.id,intentDigest:d(o.intent),outcomeDigest:d(o.outcome),evidenceDigest:d(o.outcome.evidence)}))};
 body.compatibleContinuationBasis=basis;const state={status:'completed',release:{id:randomUUID(),applicationId:old.applicationId,hostId:old.hostId,
  workspaceId:parent.release.workspaceId,snapshot:body,manifestDigest:body.manifestDigest},journal:[],revocations:[],failedClosures:[]};
 const m=body.manifest,p=m.postObservation,target=m.deployment.targets[0],image=body.compatibleArtifactRecovery.replacement.images[0].imageDigest;
 const phases=['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
 let tick=closureAt+1000;for(const operation of phases){const createdAt=new Date(tick).toISOString();tick+=(operation==='observe'?1200000:operation==='runtime_resume'?300000:1000);
  const observedAt=new Date(tick).toISOString(),parameters=['deploy_config','deploy'].includes(operation)?{commit:body.commit,artifactSetDigest:m.deployment.artifactSetDigest,
   configDigest:m.deployment.configDigest,schemaDigest:m.deployment.schemaDigest,...(operation==='deploy'?{targetId:target.targetId}:{})}:operation==='observe'?{mode:'candidate'}:
   ['smoke','fixture_cleanup','runtime_resume'].includes(operation)?{postObservationDigest:d(p)}:{resourceIds:m.cleanup.ownedResourceIds};
  const evidence={observedAt},common={postObservationDigest:d(p),fixtureDigest:d(p.fixture),controllerDigest:p.controllerDigest,targetId:target.targetId,commit:body.commit,tree:body.candidateTree};
  if(operation==='observe'){const deploymentId='fixture-candidate',services=target.configuration.services.map((v,i)=>({name:v.name,role:v.role,containerId:H(String(i+1)),
   imageDigest:v.source==='built'?image:v.imageDigest,mountDigest:v.mountDigest,state:v.role==='migration'?'exited':v.role==='cadence'?'paused':'running',
   health:['app','database'].includes(v.role)?'healthy':null,exitCode:0,createdAt,...(v.source==='built'?{commit:body.commit,tree:body.candidateTree,deploymentId}:{})}));
   Object.assign(evidence,{healthy:true,observationSeconds:1200,composeTargets:[{targetId:target.targetId,configuration:clone(target.configuration),runtime:{targetId:target.targetId,deploymentId,services},
    binding:{commit:body.commit,tree:body.candidateTree,deploymentId,queue:{targetId:target.targetId,deploymentId,commit:body.commit,status:'finished',createdAt,finishedAt:createdAt},
     images:services.filter(v=>v.role!=='database').map(v=>({name:v.name,imageDigest:v.imageDigest,commit:body.commit,tree:body.candidateTree,deploymentId}))}}]});}
  if(operation==='fixture_cleanup')evidence.postObservation={...common,kind:'fixture_cleanup',fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,
   activeOtherSessions:0,dataDigest:m.baseline.dataDigest,schemaDigest:m.baseline.schemaDigest,sequenceDigest:p.baselineSequenceDigest,
   providerRequests:0,externalActions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true};
  if(operation==='runtime_resume')evidence.postObservation={...common,kind:'runtime_resume',backendCommit:body.commit,frontendCommit:body.commit,schemaDigest:m.baseline.schemaDigest,
   observationSeconds:300,fixtureAbsent:true,healthy:true,nativeChildrenClosed:true,databaseSettingsDigest:p.runtimeResume.databaseSettingsDigest,ingressSettingsDigest:p.runtimeResume.ingressSettingsDigest,
   services:target.configuration.services.map((v,i)=>({name:v.name,role:v.role,containerId:H(String(i+1)),imageDigest:v.imageDigest??image,mountDigest:v.mountDigest,
    state:v.role==='migration'?'exited':'running',health:['app','database'].includes(v.role)?'healthy':null,exitCode:0,createdAt})),cadences:clone(p.runtimeResume.cadences),
   cadenceEvidence:p.runtimeResume.cadences.map((v,i)=>({name:v.name,behaviorDigest:v.behaviorDigest,behaviorVerified:true,completedTicks:1,executionState:i?'skipped':'executed',summaryDigest:H('1'),observedAt}))};
  if(operation==='smoke')evidence.postObservation={...common,kind:'smoke',emptyActivityCount:0,populatedActivityCount:1,negativePathStatus:401,backendCommit:body.commit,frontendCommit:body.commit,
   memoryId:p.fixture.memoryId,renderedEventId:p.fixture.eventId,renderedSummaryDigest:p.fixture.summaryDigest,emptyRenderDigest:H('1'),populatedRenderDigest:H('2'),schemaDigest:m.baseline.schemaDigest,
   nonOwnedDataDigest:m.baseline.dataDigest,sequenceDigest:p.baselineSequenceDigest,fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},providerRequests:0,externalActions:0,
   noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,nativeChildrenClosed:true};
  const operationId=randomUUID();state.journal.push({id:operationId,releaseId:state.release.id,operation,createdAt,intent:{requestId:randomUUID(),operation,
   manifestDigest:body.manifestDigest,commit:body.commit,baseCommit:body.baseCommit,expectedVersion:H('9'),observed:{commit:body.commit,baseCommit:body.commit,baseTree:body.candidateTree,manifestDigest:body.manifestDigest},parameters},
   outcome:{id:randomUUID(),operationId,requestId:randomUUID(),status:'succeeded',observationOnly:false,evidence}});
 }
 const inspection={...pin,commit:body.commit,tree:body.candidateTree,manifestDigest:body.manifestDigest,scopeDigest:wire.compatibleRecoveryScopeDigest(body),imageDigest:image};
 const args={inspection,applicationId:body.applicationId,hostId:body.hostId,agentId:randomUUID(),publicationState:parent,now:tick+1000,
  qualifyStoredSnapshot:s=>s.release.snapshot,validateOutcome:(r,o,v,j)=>r.id===parent.release.id?backend.releaseOutcomeError(r,o,v,j):null};
 const resealParent=()=>{basis.journalDigest=d(parent.journal);basis.git=parent.journal.slice(0,4).map(o=>({operation:o.operation,operationId:o.id,outcomeId:o.outcome.id,
  intentDigest:d(o.intent),outcomeDigest:d(o.outcome),evidenceDigest:d(o.outcome.evidence)}));};
 return{state,args,parent,body,basis,closure,receipt,resealParent};
}
test('continuation independently retains canonical parent four and current seven without altering either journal',()=>{const f=continuationInspectionFixture(),before=JSON.stringify([f.parent,f.state]);
 const facts=shared.assertCompletedReleaseInspection(f.state,f.args);assert.equal(facts.phaseCount,7);assert.equal(facts.ownPhaseCount,7);assert.equal(facts.inheritedPhaseCount,4);
 assert.equal(facts.effectivePhaseCount,11);assert.equal(facts.inheritedPublication.operationsSummary[0].operationId,f.parent.journal[0].id);
 assert.equal(facts.inheritedPublication.operationsSummary[0].observedAt,f.parent.journal[0].outcome.evidence.observedAt);
 assert.equal(facts.inheritedPublication.claimBoundary.currentNativeCapability,false);assert.equal(JSON.stringify([f.parent,f.state]),before);
});
for(const [name,change]of Object.entries({missingParent:f=>delete f.args.publicationState,activeParent:f=>f.parent.status='active',truncated:f=>f.parent.truncated=true,
 foreignWorkspace:f=>f.parent.release.workspaceId=randomUUID(),foreignApp:f=>f.parent.release.applicationId=randomUUID(),foreignHost:f=>f.parent.release.hostId=randomUUID(),
 foreignReleaser:f=>f.parent.release.snapshot.releaserAgentId=randomUUID(),foreignBase:f=>f.parent.release.snapshot.baseCommit='e'.repeat(40),
 version:f=>f.parent.expectedVersion=H('0'),missingClosure:f=>f.parent.failedClosures=[],revocation:f=>f.parent.revocations=[],closureDigest:f=>f.closure.closureDigest=H('0'),
 nativeClosure:f=>{f.receipt.nativeClosure.writerAbsent=false;f.closure.closureDigest=d(f.receipt);f.basis.closureDigest=f.closure.closureDigest;f.body.compatibleConfigurationContinuation.closureDigest=f.closure.closureDigest;f.body.compatibleArtifactRecovery.scopeAudit.scopeDigest=wire.compatibleRecoveryScopeDigest(f.body);f.args.inspection.scopeDigest=wire.compatibleRecoveryScopeDigest(f.body);},
 gitCommit:f=>f.parent.journal[0].outcome.evidence.remoteCommit='f'.repeat(40),pr:f=>f.parent.journal[2].outcome.evidence.pullRequestNumber=9,
 rejectedReview:f=>f.parent.journal[2].outcome.evidence.reviewApproved=false,uncertainMerge:f=>f.parent.journal[3].outcome.status='uncertain',
 futureGitClock:f=>f.parent.journal[0].outcome.evidence.observedAt=new Date(f.args.now+1000).toISOString(),outcomeParentId:f=>f.parent.journal[0].outcome.operationId=randomUUID(),
 currentReplaysGit:f=>f.state.journal[0].id=f.parent.journal[0].id,currentReplaysOutcome:f=>f.state.journal[0].outcome.id=f.parent.journal[0].outcome.id,
 ownMissing:f=>f.state.journal.pop(),ownFakeGit:f=>f.state.journal.unshift(clone(f.parent.journal[0])),ownAbsent:f=>f.state.journal[0].outcome.status='failed',
 shortObservation:f=>f.state.journal[2].outcome.evidence.observationSeconds=1199,shortResume:f=>f.state.journal[5].outcome.evidence.postObservation.observationSeconds=299,
 data:f=>f.state.journal[4].outcome.evidence.postObservation.dataDigest=H('0'),sequence:f=>f.state.journal[4].outcome.evidence.postObservation.sequenceDigest=H('0'),
 currentBeforeClosure:f=>f.state.journal[0].createdAt=new Date(Date.parse(f.closure.createdAt)-1).toISOString()
}))test('independent continuation inspection refuses '+name+' even when caller refreshes journal digests',()=>{const f=continuationInspectionFixture();change(f);f.resealParent();assert.throws(()=>shared.assertCompletedReleaseInspection(f.state,f.args));});
