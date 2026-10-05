import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import revalidation from './lib/agent-host-release-baseline-revalidation.cjs';
import {fixture,hash} from './fixtures/release-compose-contract.cjs';
const now=new Date('2026-10-04T14:00:00.000Z');
function setup(){
 const f=fixture(),input={...f.s,manifestDigest:contract.releaseDigest(f.m),requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
  releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('a'),
  releaserRevision:'2026-10-04T12:00:00.000Z',expiresAt:'2026-10-04T14:45:00.000Z',
  baselineRestart:{releaseId:randomUUID(),closureId:randomUUID(),expectedVersion:hash('b'),consentDigest:hash('c')}};
 const v={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',...revalidation.baselineRevalidationBindings(input,contract.releaseDigest),
  receiptDigest:hash('d'),observedAt:now.toISOString(),actualReadTimes:Object.fromEntries(revalidation.readKeys.map(k=>[k,now.toISOString()])),
  actualReadDigests:Object.fromEntries(revalidation.readKeys.map(k=>[k,hash('e')])),...Object.fromEntries(revalidation.requiredParity.map(k=>[k,true])),
  ...Object.fromEntries(revalidation.zeroCounts.map(k=>[k,0]))};
 input.baselineRevalidation=v;seal(input);return input;
}
function seal(input){input.baselineRevalidation.revalidationDigest=revalidation.baselineRevalidationDigest(input.baselineRevalidation,contract.releaseDigest);}
function error(input,at=now){return revalidation.baselineRevalidationError(input,contract.baselineRevalidationSchema,contract.releaseDigest,at);}
test('fresh actual owner attestation binds historical exact manifest without rewriting any timestamp',()=>{
 const i=setup(),before=structuredClone(i);assert.equal(contract.createReleaseSchema.safeParse(i).success,true);assert.equal(error(i),null);
 assert.deepEqual(i,before);assert.equal(i.manifest.baseline.observedAt,'2026-10-04T12:00:00.000Z');
 assert.equal(i.manifestDigest,contract.releaseDigest(i.manifest));
});
test('timestamp-only receipt and unknown fields cannot qualify',()=>{
 const i=setup();i.baselineRevalidation={observedAt:now.toISOString()};assert.equal(contract.createReleaseSchema.safeParse(i).success,false);assert.ok(error(i));
 for(const key of ['baseline','actualReadTimes','actualReadDigests','receiptDigest','targetBaselineDigest']){const j=setup();delete j.baselineRevalidation[key];assert.ok(error(j));}
 const j=setup();j.baselineRevalidation.nativeAttestation=true;assert.ok(error(j));
 const k=setup();k.baselineRevalidation=null;assert.ok(error(k));
});
for(const [name,mutate] of [
 ['application',i=>i.applicationId=randomUUID()],['host',i=>i.hostId=randomUUID()],['candidate commit',i=>i.commit='f'.repeat(40)],
 ['candidate tree',i=>i.candidateTree='f'.repeat(40)],['target',i=>i.manifest.deployment.targets[0].targetId='another'],
 ['input base',i=>i.baseCommit='f'.repeat(40)],['input base tree',i=>i.baseTree='f'.repeat(40)],
 ['base commit',i=>i.manifest.baseline.commit='f'.repeat(40)],['config',i=>i.manifest.baseline.configDigest=hash('f')],
 ['data',i=>i.manifest.baseline.dataDigest=hash('f')],['schema',i=>i.manifest.baseline.schemaDigest=hash('f')],
 ['health',i=>i.manifest.baseline.healthDigest=hash('f')],['image',i=>i.manifest.deployment.targets[0].baseline.images[0].imageDigest='sha256:'+hash('f')],
 ['source',i=>i.manifest.deployment.targets[0].baseline.sourceDigest=hash('f')],['service',i=>i.manifest.deployment.targets[0].baseline.configuration.services[0].mountDigest=hash('f')],
 ['rollback',i=>i.manifest.rollback.configDigest=hash('f')],['backup',i=>i.manifest.backup.restoreDigest=hash('e')],
 ['protected resources',i=>i.manifest.cleanup.protectedResourceIds=[]],['closure',i=>i.baselineRestart.closureId=randomUUID()],
 ['receipt integrity',i=>i.baselineRevalidation.receiptDigest=hash('f')]
])test('refuses changed '+name,()=>{const i=setup();mutate(i);i.manifestDigest=contract.releaseDigest(i.manifest);assert.ok(error(i));});
test('mismatched snapshot fails even after recomputing every claimed receipt digest',()=>{
 const i=setup();i.baselineRevalidation.baseline.dataDigest=hash('f');i.baselineRevalidation.baselineDigest=contract.releaseDigest(i.baselineRevalidation.baseline);seal(i);
 assert.equal(error(i),'release_baseline_revalidation_binding_changed');
});
for(const name of revalidation.requiredParity)test('requires '+name,()=>{const i=setup();i.baselineRevalidation[name]=false;seal(i);assert.ok(error(i));});
for(const name of revalidation.zeroCounts)test('requires zero '+name,()=>{const i=setup();i.baselineRevalidation[name]=1;seal(i);assert.ok(error(i));});
test('receipt and each actual read have an independent five-minute window with no future times',()=>{
 const i=setup();assert.equal(error(i,new Date(now.getTime()+300000)),null);assert.equal(error(i,new Date(now.getTime()+300001)),'release_prerequisite_stale');
 for(const key of ['observedAt',...revalidation.readKeys])for(const offset of [-300001,1]){
  const j=setup(),at=new Date(now.getTime()+offset).toISOString();if(key==='observedAt')j.baselineRevalidation.observedAt=at;else j.baselineRevalidation.actualReadTimes[key]=at;seal(j);
  assert.equal(error(j),'release_prerequisite_stale',key+' '+offset);
 }
});
test('fresh wrapper cannot restamp an old actual component read',()=>{const i=setup();i.baselineRevalidation.actualReadTimes.inventory=i.manifest.baseline.observedAt;seal(i);assert.equal(error(i),'release_prerequisite_stale');});
test('extension is unavailable without a retained Compose baseline restart',()=>{
 for(const change of [i=>delete i.baselineRestart,i=>i.predecessor={releaseId:randomUUID(),expectedVersion:hash('a')},i=>i.manifest.deployment.provider='coolify',i=>i.manifest.cleanup.archiveRepository=true]){
  const i=setup();change(i);assert.equal(contract.createReleaseSchema.safeParse(i).success,false);assert.ok(error(i));
 }
});
