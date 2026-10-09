import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import wire from './lib/agent-host-release-contract.cjs';
import { qualifyReleaseInspectionIdentity, qualifyRootMonitor, qualifyDetailedReleaseOutcomes,
  assertVerifiedReleaseDelivery, loadReleaseInspectionCustody, readReleaseInspectionSource,
  releaseDeliveryEvidenceSchema, releaseDeliveryDetailSchema, closedReleaseControllerIdentity,
  projectQualifiedReleaseNormal,inheritedReleasePublicationSchema } from './lib/agent-host-release-inspection.mjs';
import { validPacketFixture, pinReadyFixture } from './fixtures/execution-packet.mjs';
import { prepareProviderInput, providerInputSchema } from './lib/agent-host-provider-input.mjs';

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`, h=n=>String(n).repeat(64), commit='a'.repeat(40);
test('closed-controller record keeps full physical run/archive joins and original chronology',()=>{
  const state={release:{id:id(1)},journal:[]},ref={file:'fixture-only.json',sha256:h(1),physicalIdentityDigest:h(2),bytes:12,nlink:1,regularFile:true};
  const run={schemaVersion:'roost-private-new-candidate-worker-run-v1',phase:'official_worker_closed',code:0,releaseId:id(1),controllerPid:1234,
    controllerIdentity:{pid:1234,creationTime:'134000000000000000',executablePathDigest:h(3),executableDigest:h(4)},closedAt:'2026-01-01T00:00:00.000Z'};
  const root={schemaVersion:'roost-private-new-candidate-worker-closure-v1',status:'completed',releaseId:id(1),runReference:ref,archiveReference:ref,journalDigest:wire.releaseDigest([]),observedAt:'2026-01-01T00:00:01.000Z'};
  const args={state,runSource:{bytes:Buffer.from(JSON.stringify(run)),reference:ref},closureSource:{bytes:Buffer.from(JSON.stringify(root)),reference:ref},archiveReference:ref,now:Date.parse('2026-01-01T00:00:02.000Z')};
  assert.deepEqual(closedReleaseControllerIdentity(args),run.controllerIdentity);
  for(const mutate of [x=>x.code=1,x=>x.phase='official_worker_running',x=>x.closedAt='2026-01-01T00:00:03.000Z',x=>x.controllerPid=4321]){
    const changed=structuredClone(run);mutate(changed);assert.throws(()=>closedReleaseControllerIdentity({...args,runSource:{...args.runSource,bytes:Buffer.from(JSON.stringify(changed))}}));
  }
  const changed=structuredClone(root);changed.archiveReference={...ref,physicalIdentityDigest:h(9)};
  assert.throws(()=>closedReleaseControllerIdentity({...args,closureSource:{...args.closureSource,bytes:Buffer.from(JSON.stringify(changed))}}));
});
function identity() {
  const inspection={schemaVersion:'roost-governed-release-inspection-v1',commit,tree:'b'.repeat(40),manifestDigest:h(1),scopeDigest:h(2),imageDigest:'sha256:'+h(3),minimumObservationSeconds:1200,minimumRestoredActivitySeconds:300};
  const claimed={id:id(1),taskId:id(2),applicationId:id(3),agentHostId:id(4),metadata:{releaseVerification:{schemaVersion:'roost-release-verification-selection-v1',releaseId:id(5),custodyEvidenceId:id(6)}}};
  const contract={assignment:{agentId:id(7)},access:{sandbox:'read-only',externalWrites:false,tools:['repository_read'],permissions:['repository_read']},singleTask:{applicationId:id(3)},nativeBoundary:{profile:'inspect-readonly',inspectReadOnly:{kind:'auditor'},releaseInspection:inspection}};
  const normalContext={schemaVersion:'roost-governed-release-inspection-context-v1',executionId:id(1),taskId:id(2),applicationId:id(3),agentHostId:id(4),release:{release:{id:id(5)}}};
  return {claimed,contract,normalContext,inspection};
}
test('normal claimed selectors join the exact readonly auditor declaration',()=>{
  const x=identity(); assert.equal(qualifyReleaseInspectionIdentity(x).selection.releaseId,id(5));
  for(const mutate of [x=>x.normalContext.executionId=id(9),x=>x.normalContext.agentHostId=id(9),x=>x.normalContext.applicationId=id(9),x=>x.contract.singleTask.applicationId=id(9),x=>x.claimed.metadata.releaseVerification.releaseId=id(9),x=>x.contract.nativeBoundary.inspectReadOnly.kind='code-reviewer',x=>x.contract.access.externalWrites=true,x=>x.contract.access.tools.push('terminal')]){
    const changed=structuredClone(x); mutate(changed); assert.throws(()=>qualifyReleaseInspectionIdentity(changed));
  }
});
test('JSON or caller-made evidence cannot acquire the private Worker handle',()=>{
  const x=identity(); for(const fake of [{},{schemaVersion:'roost-worker-release-delivery-handle-v1',digest:h(1)},JSON.parse(JSON.stringify({digest:h(2)}))]) assert.throws(()=>assertVerifiedReleaseDelivery(fake,x),/genuine_bound_handle/);
});
test('custody lookup admits only its UUID-selected physical regular file and rejects link substitution',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roost-inspection-test-')); t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'release-inspection-'+id(6)+'.json'); fs.writeFileSync(file,'{"synthetic":true}');
  assert.equal(loadReleaseInspectionCustody(id(6),{stateDirectory:dir}).reference.file,file);
  assert.throws(()=>loadReleaseInspectionCustody('../arbitrary',{stateDirectory:dir}));
  fs.linkSync(file,path.join(dir,'second.json')); assert.throws(()=>readReleaseInspectionSource(file),/physical_source/);
});
function outcomes(){
  const m={deployment:{targetId:'example-app'},baseline:{dataDigest:h(4),schemaDigest:h(5)},postObservation:{controllerDigest:h(3),baselineSequenceDigest:h(6),fixture:{memoryId:-8,eventId:id(9),summaryDigest:h(7)},runtimeResume:{databaseSettingsDigest:h(8),ingressSettingsDigest:h(9),cadences:[{name:'maintenance',behavior:'restore_existing_loop',behaviorDigest:h(1)},{name:'proactive',behavior:'restore_existing_loop',behaviorDigest:h(2)}]}}};
  const common={postObservationDigest:wire.releaseDigest(m.postObservation),fixtureDigest:wire.releaseDigest(m.postObservation.fixture),controllerDigest:m.postObservation.controllerDigest,targetId:m.deployment.targetId,commit,tree:identity().inspection.tree};
  const smoke={...common,kind:'smoke',emptyActivityCount:0,populatedActivityCount:1,negativePathStatus:401,backendCommit:commit,frontendCommit:commit,memoryId:-8,renderedEventId:id(9),renderedSummaryDigest:h(7),emptyRenderDigest:h(1),populatedRenderDigest:h(2),schemaDigest:h(5),nonOwnedDataDigest:h(4),sequenceDigest:h(6),fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},providerRequests:0,externalActions:0,noUnownedChanges:true,fixtureOwned:true,ingressBlocked:true,cadencesHeld:true,nativeChildrenClosed:true};
  const cleanup={...common,kind:'fixture_cleanup',fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,activeOtherSessions:0,dataDigest:h(4),schemaDigest:h(5),sequenceDigest:h(6),providerRequests:0,externalActions:0,nativeChildrenClosed:true,sequencesUnchanged:true,noUnownedChanges:true};
  const services=['app','db','migrate','maintenance','proactive'].map((name,n)=>({name,role:['app','database','migration','cadence','cadence'][n],containerId:h(n+1),imageDigest:'sha256:'+h(n+1),mountDigest:h(n+1),state:n===2?'exited':'running',health:n<2?'healthy':null,exitCode:0,createdAt:'2026-01-01T12:00:00.000Z'}));
  const resume={...common,kind:'runtime_resume',backendCommit:commit,frontendCommit:commit,schemaDigest:h(5),observationSeconds:300,fixtureAbsent:true,healthy:true,nativeChildrenClosed:true,databaseSettingsDigest:h(8),ingressSettingsDigest:h(9),services,cadences:m.postObservation.runtimeResume.cadences,cadenceEvidence:m.postObservation.runtimeResume.cadences.map((c,n)=>({name:c.name,behaviorDigest:c.behaviorDigest,behaviorVerified:true,completedTicks:n+1,executionState:n?'skipped':'executed',summaryDigest:h(n+1),observedAt:'2026-01-01T12:30:00.000Z'}))};
  return {release:{snapshot:{manifest:m}},journal:[{operation:'smoke',outcome:{evidence:{postObservation:smoke}}},{operation:'fixture_cleanup',outcome:{evidence:{postObservation:cleanup}}},{operation:'runtime_resume',outcome:{evidence:{postObservation:resume}}},{operation:'observe',outcome:{evidence:{observationSeconds:1200}}}]};
}
test('detailed evidence retains actual fixture, data/raw-sequence parity and restored behavior',()=>{
  const state=outcomes(),pin=identity().inspection; assert.equal(qualifyDetailedReleaseOutcomes(state,pin).restoredActivitySeconds,300);
  for(const mutate of [s=>s.journal[0].outcome.evidence.postObservation.providerRequests=1,s=>s.journal[0].outcome.evidence.postObservation.memoryId=id(99),s=>s.journal[1].outcome.evidence.postObservation.sequenceDigest=h(1),s=>s.journal[1].outcome.evidence.postObservation.dataDigest=h(1),s=>s.journal[2].outcome.evidence.postObservation.observationSeconds=299,s=>s.journal[2].outcome.evidence.postObservation.cadenceEvidence[0].completedTicks=0,s=>s.journal[2].outcome.evidence.postObservation.databaseSettingsDigest=h(1)]){
    const changed=structuredClone(state); mutate(changed); assert.throws(()=>qualifyDetailedReleaseOutcomes(changed,pin));
  }
});
test('new qualification carries exact canonical journal details and preserves both actual cadence states',()=>{
  const state=outcomes(),before=structuredClone(state),result=qualifyDetailedReleaseOutcomes(state,identity().inspection),raw=op=>state.journal.find(r=>r.operation===op).outcome.evidence.postObservation;
  assert.deepEqual(result.details,{smoke:raw('smoke'),fixtureCleanup:raw('fixture_cleanup'),runtimeResume:raw('runtime_resume')});
  assert.deepEqual(state,before);assert.deepEqual(result.details.runtimeResume.cadenceEvidence.map(e=>[e.name,e.executionState,e.completedTicks]),[['maintenance','executed',1],['proactive','skipped',2]]);
  assert.deepEqual(result.details.runtimeResume.cadences,state.release.snapshot.manifest.postObservation.runtimeResume.cadences);
  assert.equal(result.details.smoke.providerRequests,0);assert.equal(result.details.smoke.externalActions,0);
  assert.equal(result.details.smoke.emptyActivityCount,0);assert.equal(result.details.smoke.populatedActivityCount,1);assert.equal(result.details.smoke.negativePathStatus,401);
  assert.equal(result.details.fixtureCleanup.sequencesUnchanged,true);assert.equal(result.details.fixtureCleanup.noUnownedChanges,true);
});
for(const [name,change] of Object.entries({empty:s=>s.smoke.emptyActivityCount=1,populated:s=>s.smoke.populatedActivityCount=2,auth:s=>s.smoke.negativePathStatus=200,provider:s=>s.smoke.providerRequests=1,external:s=>s.smoke.externalActions=1,missingRender:s=>delete s.smoke.emptyRenderDigest,cleanupRows:s=>s.fixtureCleanup.noUnownedChanges=false,cleanupSequence:s=>s.fixtureCleanup.sequencesUnchanged=false,cleanupAuth:s=>s.fixtureCleanup.authAbsent=false,cleanupData:s=>s.fixtureCleanup.dataDigest=h(9),cleanupSchema:s=>s.fixtureCleanup.schemaDigest=h(9),missingTicks:s=>s.runtimeResume.cadenceEvidence.pop(),duplicateTicks:s=>s.runtimeResume.cadenceEvidence[1]=structuredClone(s.runtimeResume.cadenceEvidence[0]),duplicateCadence:s=>s.runtimeResume.cadences[1]=structuredClone(s.runtimeResume.cadences[0]),zeroTick:s=>s.runtimeResume.cadenceEvidence[0].completedTicks=0,behavior:s=>s.runtimeResume.cadenceEvidence[0].behaviorDigest=h(9),unverified:s=>s.runtimeResume.cadenceEvidence[0].behaviorVerified=false,unknownExecution:s=>s.runtimeResume.cadenceEvidence[1].executionState='unknown',wrongKind:s=>s.fixtureCleanup=structuredClone(s.smoke),wrongResumeKind:s=>s.runtimeResume=structuredClone(s.smoke),target:s=>s.runtimeResume.targetId='other-app',unknownField:s=>s.smoke.operatorSummary='Invented claim'})){
  test('typed actual detail refuses '+name,()=>{const details=qualifyDetailedReleaseOutcomes(outcomes(),identity().inspection).details;change(details);assert.equal(releaseDeliveryDetailSchema.safeParse(details).success,false);});
}
test('manifest binding is independent of syntactically valid detailed outcome values',()=>{
  for(const key of ['postObservationDigest','fixtureDigest','controllerDigest','targetId','commit','tree']){const state=outcomes();for(const row of state.journal.filter(r=>r.outcome.evidence.postObservation))row.outcome.evidence.postObservation[key]=key==='targetId'?'other-app':key==='commit'||key==='tree'?'f'.repeat(40):h(9);assert.throws(()=>qualifyDetailedReleaseOutcomes(state,identity().inspection));}
});
function monitoring(){
  const base=Date.parse('2026-01-01T12:00:00.000Z'),at=n=>new Date(base+n*1000).toISOString();
  const state={release:{id:id(5),manifestDigest:h(1)},journal:[{operation:'observe',createdAt:at(0)},{operation:'runtime_resume',outcome:{evidence:{observedAt:at(1500)}}}]};
  const rows=Array.from({length:52},(_,n)=>({schemaVersion:'roost-private-new-candidate-worker-status-v1',observedAt:at(n*30),releaseId:id(5),manifestDigest:h(1),status:n===51?'completed':'active',rootSupervisionSeconds:30,autonomousDaemonClaimed:false,externalNotificationProven:false,journalDigest:n===51?wire.releaseDigest(state.journal):h(2),operations:[]}));
  return {state,rows,now:base+1530000,bytes:rows=>Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n'))};
}
test('Root monitoring requires complete bounded chronological coverage without autonomous claims',()=>{
  const x=monitoring(); assert.equal(qualifyRootMonitor(x.bytes(x.rows),x.state,x.now).maxGapMilliseconds,30000);
  for(const mutate of [r=>r.splice(10,1),r=>r.splice(10,2),r=>r[10].releaseId=id(9),r=>r[10].autonomousDaemonClaimed=true,r=>r.at(-1).journalDigest=h(9),r=>r.at(-1).status='active',r=>r.splice(0,4),r=>r[10].observedAt=r[9].observedAt]){
    const rows=structuredClone(x.rows); mutate(rows); assert.throws(()=>qualifyRootMonitor(x.bytes(rows),x.state,x.now));
  }
});
test('ordinary inputs preserve absent channel; unqualified handles and injected JSON are refused',()=>{
  const f=validPacketFixture(),o={fresh:{taskContext:f.taskContext,applicationContext:f.applicationContext},claimed:f.claimed,currentCommit:commit,assertAuthority(){}};
  const envelope=prepareProviderInput(o); assert.equal(envelope.evidence.releaseDelivery,undefined);
  assert.throws(()=>prepareProviderInput({...o,releaseDelivery:{digest:h(1)}}));
  const changed=structuredClone(envelope); changed.evidence.releaseDelivery={provenance:'worker.verified_governed_release_delivery',trust:'untrusted_evidence',value:{}};
  assert.equal(providerInputSchema.safeParse(changed).success,false);
  const x=identity(); f.packet.contract.nativeBoundary={...x.contract.nativeBoundary,readPaths:['release.json'],runtime:{required:false,ports:[]}}; f.packet.contract.access=x.contract.access; f.packet.procedureComposition.fields.tools=['repository_read']; pinReadyFixture(f);
  assert.throws(()=>prepareProviderInput({...o,repositoryEvidence:{schemaVersion:'roost-readonly-repository-evidence-v1',head:commit,branch:f.packet.contract.singleTask.branch,files:[{path:'release.json',mimeType:'text/plain',content:'{}',sha256:h(1)}],tree:h(2),processDigest:h(3),dockerDigest:h(4),digest:h(5)}}));
});
test('public evidence schema joins exact declaration and claim but is never a live custody capability',()=>{
  const f=validPacketFixture(),x=identity(),o={fresh:{taskContext:f.taskContext,applicationContext:f.applicationContext},claimed:f.claimed,currentCommit:commit,assertAuthority(){}};
  const input=structuredClone(prepareProviderInput(o)),at='2026-01-01T12:30:00.000Z';
  input.contract.nativeBoundary={...x.contract.nativeBoundary,readPaths:['release.json'],runtime:{required:false,ports:[]}};
  input.contract.access={...input.contract.access,...x.contract.access};
  const synthetic={schemaVersion:'roost-governed-release-delivery-evidence-v1',binding:{executionId:input.identity.executionId,taskId:input.identity.taskId,applicationId:input.identity.applicationId,hostId:id(4),releaseId:id(5),commit,tree:'b'.repeat(40),manifestDigest:h(1),scopeDigest:h(2),imageDigest:'sha256:'+h(3)},normal:{contextObservedAt:at,journalDigest:h(1),operationCount:11,operationsSummary:Array.from({length:11},()=>({operation:'synthetic-only',evidenceDigest:h(2),observedAt:at}))},native:{archiveDigest:h(3),checkpointDigest:h(4),registeredChildCount:12,currentOsObservedAt:at,closedChildren:true},monitor:{digest:h(5),samples:52,firstAt:at,lastAt:at,maxGapMilliseconds:30000},postObservation:{observationSeconds:1200,restoredActivitySeconds:300,fixtureAbsent:true,nonOwnedDataDigest:h(6),sequenceDigest:h(7),databaseSettingsDigest:h(8),ingressSettingsDigest:h(9)},claimBoundary:{rootSupervised:true,autonomousDaemon:false,serverOsAttestation:false,modelAuthority:false}};
  assert.equal(releaseDeliveryEvidenceSchema.safeParse(synthetic).success,true);
  assert.equal(releaseDeliveryEvidenceSchema.parse(synthetic).postObservation.details,undefined,'legacy proof does not invent detailed facts');
  input.evidence.releaseDelivery={provenance:'worker.verified_governed_release_delivery',trust:'untrusted_evidence',value:synthetic};
  assert.equal(providerInputSchema.safeParse(input).success,true,JSON.stringify(providerInputSchema.safeParse(input).error?.issues));
  const generated=qualifyDetailedReleaseOutcomes(outcomes(),x.inspection);synthetic.postObservation=generated;
  assert.equal(providerInputSchema.safeParse(input).success,true,JSON.stringify(providerInputSchema.safeParse(input).error?.issues));
  assert.deepEqual(providerInputSchema.parse(input).evidence.releaseDelivery.value.postObservation.details,generated.details,'typed provider input preserves actual detail');
  for(const mutate of [v=>v.postObservation.details.runtimeResume.databaseSettingsDigest=h(1),v=>v.postObservation.details.runtimeResume.ingressSettingsDigest=h(1),v=>v.postObservation.details.fixtureCleanup.dataDigest=h(1),v=>v.postObservation.restoredActivitySeconds=301,v=>v.binding.tree='c'.repeat(40)]){
    const changed=structuredClone(synthetic);mutate(changed);assert.equal(releaseDeliveryEvidenceSchema.safeParse(changed).success,false);
  }
  const oversized=structuredClone(synthetic);oversized.normal.operationsSummary[0].operation='x'.repeat(32768);assert.equal(releaseDeliveryEvidenceSchema.safeParse(oversized).success,false,'32KiB bound remains enforced');
  for(const mutate of [i=>i.evidence.releaseDelivery.value.binding.commit='c'.repeat(40),i=>i.evidence.releaseDelivery.value.binding.executionId=id(9),i=>i.contract.nativeBoundary.releaseInspection.minimumObservationSeconds=1201,i=>delete i.contract.nativeBoundary.releaseInspection,i=>i.evidence.releaseDelivery.value.claimBoundary.modelAuthority=true]){
    const changed=structuredClone(input);mutate(changed);assert.equal(providerInputSchema.safeParse(changed).success,false);
  }
  assert.throws(()=>assertVerifiedReleaseDelivery(JSON.parse(JSON.stringify(synthetic)),x),/genuine_bound_handle/);
});
function continuationDeliveryFixture(){const x=identity(),at='2026-01-01T13:00:00.000Z',parentAt='2026-01-01T11:00:00.000Z';
 const inheritedPublication={schemaVersion:'roost-governed-release-inherited-publication-v1',releaseId:id(50),closureId:id(51),closureDigest:h(1),nativeClosureDigest:h(2),revocationId:id(52),
  closedAt:'2026-01-01T11:01:00.000Z',parentManifestDigest:h(3),journalDigest:h(4),commit,tree:x.inspection.tree,baseCommit:'c'.repeat(40),baseTree:'d'.repeat(40),pullRequestNumber:4,operationCount:4,
  operationsSummary:['push','pr','review','merge'].map((operation,n)=>({operation,operationId:id(60+n),outcomeId:id(70+n),intentDigest:h(n+1),outcomeDigest:h(n+2),evidenceDigest:h(n+3),createdAt:parentAt,observedAt:parentAt})),
  claimBoundary:{historicalOwnerClosure:true,currentNativeCapability:false,serverOsAttestation:false}};
 const state=outcomes();state.release.id=x.claimed.metadata.releaseVerification.releaseId;
 state.journal=['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'].map(operation=>({operation,outcome:{evidence:{observedAt:at}}}));
 const facts={journalDigest:wire.releaseDigest(state.journal),ownPhaseCount:7,inheritedPublication};
 const normal=projectQualifiedReleaseNormal(state,at,facts),postObservation=qualifyDetailedReleaseOutcomes(outcomes(),x.inspection);
 const value={schemaVersion:'roost-governed-release-delivery-evidence-v1',binding:{executionId:x.claimed.id,taskId:x.claimed.taskId,applicationId:x.claimed.applicationId,hostId:x.claimed.agentHostId,
  releaseId:state.release.id,commit,tree:x.inspection.tree,manifestDigest:x.inspection.manifestDigest,scopeDigest:x.inspection.scopeDigest,imageDigest:x.inspection.imageDigest},normal,
  native:{archiveDigest:h(1),checkpointDigest:h(2),registeredChildCount:7,currentOsObservedAt:at,closedChildren:true},
  monitor:{digest:h(3),samples:52,firstAt:at,lastAt:at,maxGapMilliseconds:30000},postObservation,
  claimBoundary:{rootSupervised:true,autonomousDaemon:false,serverOsAttestation:false,modelAuthority:false}};
 return {value,x,state,facts};
}
test('typed continuation has seven own phases, four immutable historical Git summaries and explicit effective provenance',()=>{
 const f=continuationDeliveryFixture(),before=structuredClone(f.state),v=releaseDeliveryEvidenceSchema.parse(f.value);
 assert.equal(v.normal.operationCount,7);assert.equal(v.normal.inheritedPublication.operationCount,4);assert.equal(v.normal.effectiveOperationCount,11);
 assert.deepEqual(v.normal.effectiveOperationsSummary.slice(0,4).map(r=>r.provenance),Array(4).fill('inherited_publication'));
 assert.deepEqual(v.normal.effectiveOperationsSummary.slice(4).map(r=>r.provenance),Array(7).fill('current_release'));
 assert.equal(v.normal.inheritedPublication.operationsSummary[0].observedAt,'2026-01-01T11:00:00.000Z');
 assert.deepEqual(f.state,before);assert.equal(v.native.registeredChildCount,7,'native proof belongs to current release only');
 assert.equal(v.normal.inheritedPublication.claimBoundary.currentNativeCapability,false);
 assert.equal(v.postObservation.details.smoke.negativePathStatus,401);assert.equal(v.postObservation.details.runtimeResume.cadenceEvidence.length,2);
 assert.throws(()=>assertVerifiedReleaseDelivery(v,f.x),/genuine_bound_handle/);
});
for(const [name,change]of Object.entries({
 missingDetails:v=>delete v.postObservation.details,sevenFakeGit:v=>v.normal.operationsSummary[0].operation='push',
 inventedInheritedCount:v=>v.normal.inheritedPublication.operationCount=11,ownCount:v=>v.normal.operationCount=11,
 wrongParentCommit:v=>v.normal.inheritedPublication.commit='e'.repeat(40),wrongParentTree:v=>v.normal.inheritedPublication.tree='e'.repeat(40),
 parentSameRelease:v=>v.normal.inheritedPublication.releaseId=v.binding.releaseId,foreignCurrentRelease:v=>v.normal.effectiveOperationsSummary[4].releaseId=id(99),
 fabricatedOldClock:v=>v.normal.effectiveOperationsSummary[0].observedAt='2026-01-01T12:00:00.000Z',
 swappedProvenance:v=>v.normal.effectiveOperationsSummary[0].provenance='current_release',omittedOperationId:v=>delete v.normal.inheritedPublication.operationsSummary[0].operationId,
 duplicateGitId:v=>v.normal.inheritedPublication.operationsSummary[1].operationId=v.normal.inheritedPublication.operationsSummary[0].operationId,
 duplicateOutcomeId:v=>v.normal.inheritedPublication.operationsSummary[1].outcomeId=v.normal.inheritedPublication.operationsSummary[0].outcomeId,
 reversedGit:v=>v.normal.inheritedPublication.operationsSummary.reverse(),gitAfterClosure:v=>v.normal.inheritedPublication.operationsSummary[0].observedAt='2026-01-01T13:00:00.000Z',
 revivedHistoricalNative:v=>v.normal.inheritedPublication.claimBoundary.currentNativeCapability=true,
 rootClaims:v=>v.normal.inheritedPublication.operatorClaim='Root says success',changedHash:v=>v.normal.effectiveOperationsSummary[0].evidenceDigest=h(9),
 extraInherited:v=>v.normal.inheritedPublication.operationsSummary.push(structuredClone(v.normal.inheritedPublication.operationsSummary[0])),
 shortObservation:v=>v.postObservation.observationSeconds=1199,shortActivity:v=>v.postObservation.restoredActivitySeconds=299,
 tooBig:v=>v.normal.effectiveOperationsSummary[4].operation='x'.repeat(32768)
}))test('typed continuation refuses '+name,()=>{const v=continuationDeliveryFixture().value;change(v);assert.equal(releaseDeliveryEvidenceSchema.safeParse(v).success,false);});
test('provider strict schema preserves both provenance sets without claiming a custody handle',()=>{
 const f=validPacketFixture(),x=continuationDeliveryFixture(),o={fresh:{taskContext:f.taskContext,applicationContext:f.applicationContext},claimed:f.claimed,currentCommit:commit,assertAuthority(){}};
 const input=structuredClone(prepareProviderInput(o));input.contract.nativeBoundary={...x.x.contract.nativeBoundary,readPaths:['release.json'],runtime:{required:false,ports:[]}};
 input.contract.access={...input.contract.access,...x.x.contract.access};const v=x.value;
 Object.assign(v.binding,{executionId:input.identity.executionId,taskId:input.identity.taskId,applicationId:input.identity.applicationId});
 input.evidence.releaseDelivery={provenance:'worker.verified_governed_release_delivery',trust:'untrusted_evidence',value:v};
 assert.equal(providerInputSchema.safeParse(input).success,true,JSON.stringify(providerInputSchema.safeParse(input).error?.issues));
 const parsed=providerInputSchema.parse(input);assert.equal(parsed.evidence.releaseDelivery.value.normal.operationCount,7);
 assert.deepEqual(parsed.evidence.releaseDelivery.value.normal.inheritedPublication.operationsSummary,v.normal.inheritedPublication.operationsSummary);
 assert.equal(parsed.evidence.releaseDelivery.value.normal.effectiveOperationCount,11);
 assert.throws(()=>assertVerifiedReleaseDelivery(v,x.x),/genuine_bound_handle/);
 assert.equal(inheritedReleasePublicationSchema.safeParse({...v.normal.inheritedPublication,releaseAuthority:true}).success,false);
});
