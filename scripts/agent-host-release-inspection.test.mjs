import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import wire from './lib/agent-host-release-contract.cjs';
import { qualifyReleaseInspectionIdentity, qualifyRootMonitor, qualifyDetailedReleaseOutcomes,
  assertVerifiedReleaseDelivery, loadReleaseInspectionCustody, readReleaseInspectionSource,
  releaseDeliveryEvidenceSchema, closedReleaseControllerIdentity } from './lib/agent-host-release-inspection.mjs';
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
  const m={baseline:{dataDigest:h(4),schemaDigest:h(5)},postObservation:{baselineSequenceDigest:h(6),fixture:{memoryId:id(8),eventId:id(9),summaryDigest:h(7)},runtimeResume:{databaseSettingsDigest:h(8),ingressSettingsDigest:h(9),cadences:[{name:'poll',behaviorDigest:h(1)}]}}};
  const smoke={kind:'smoke',emptyActivityCount:0,populatedActivityCount:1,negativePathStatus:401,backendCommit:commit,frontendCommit:commit,memoryId:id(8),renderedEventId:id(9),renderedSummaryDigest:h(7),fixtureRows:{authUsers:1,authSessions:1,recentMemory:1},providerRequests:0,externalActions:0,noUnownedChanges:true};
  const cleanup={kind:'fixture_cleanup',fixtureAbsent:true,authAbsent:true,eventAbsent:true,databaseReadOnly:true,activeOtherSessions:0,dataDigest:h(4),schemaDigest:h(5),sequenceDigest:h(6),providerRequests:0,externalActions:0};
  const resume={kind:'runtime_resume',backendCommit:commit,frontendCommit:commit,observationSeconds:300,fixtureAbsent:true,healthy:true,databaseSettingsDigest:h(8),ingressSettingsDigest:h(9),cadences:m.postObservation.runtimeResume.cadences,cadenceEvidence:[{name:'poll',behaviorDigest:h(1),behaviorVerified:true,completedTicks:1}]};
  return {release:{snapshot:{manifest:m}},journal:[{operation:'smoke',outcome:{evidence:{postObservation:smoke}}},{operation:'fixture_cleanup',outcome:{evidence:{postObservation:cleanup}}},{operation:'runtime_resume',outcome:{evidence:{postObservation:resume}}},{operation:'observe',outcome:{evidence:{observationSeconds:1200}}}]};
}
test('detailed evidence retains actual fixture, data/raw-sequence parity and restored behavior',()=>{
  const state=outcomes(),pin=identity().inspection; assert.equal(qualifyDetailedReleaseOutcomes(state,pin).restoredActivitySeconds,300);
  for(const mutate of [s=>s.journal[0].outcome.evidence.postObservation.providerRequests=1,s=>s.journal[0].outcome.evidence.postObservation.memoryId=id(99),s=>s.journal[1].outcome.evidence.postObservation.sequenceDigest=h(1),s=>s.journal[1].outcome.evidence.postObservation.dataDigest=h(1),s=>s.journal[2].outcome.evidence.postObservation.observationSeconds=299,s=>s.journal[2].outcome.evidence.postObservation.cadenceEvidence[0].completedTicks=0,s=>s.journal[2].outcome.evidence.postObservation.databaseSettingsDigest=h(1)]){
    const changed=structuredClone(state); mutate(changed); assert.throws(()=>qualifyDetailedReleaseOutcomes(changed,pin));
  }
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
  input.evidence.releaseDelivery={provenance:'worker.verified_governed_release_delivery',trust:'untrusted_evidence',value:synthetic};
  assert.equal(providerInputSchema.safeParse(input).success,true,JSON.stringify(providerInputSchema.safeParse(input).error?.issues));
  for(const mutate of [i=>i.evidence.releaseDelivery.value.binding.commit='c'.repeat(40),i=>i.evidence.releaseDelivery.value.binding.executionId=id(9),i=>i.contract.nativeBoundary.releaseInspection.minimumObservationSeconds=1201,i=>delete i.contract.nativeBoundary.releaseInspection,i=>i.evidence.releaseDelivery.value.claimBoundary.modelAuthority=true]){
    const changed=structuredClone(input);mutate(changed);assert.equal(providerInputSchema.safeParse(changed).success,false);
  }
  assert.throws(()=>assertVerifiedReleaseDelivery(JSON.parse(JSON.stringify(synthetic)),x),/genuine_bound_handle/);
});
