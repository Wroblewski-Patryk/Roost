import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';import path from 'node:path';
import contract from './lib/agent-host-release-contract.cjs';
import revalidation from './lib/agent-host-release-baseline-revalidation.cjs';
import {fixture,hash} from './fixtures/release-compose-contract.cjs';
const now=new Date('2026-10-04T14:00:00.000Z');
const require=createRequire(import.meta.url),{require:ts}=require('tsx/cjs/api');
const {releaseWindowError}=ts(path.resolve('src/modules/agent-runtime/governed-release-contract.ts'),import.meta.url);
function setup({ordinary=false}={}){
 const f=fixture(),input={...f.s,manifestDigest:contract.releaseDigest(f.m),requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
  releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('a'),
  releaserRevision:'2026-10-04T12:00:00.000Z',expiresAt:'2026-10-04T14:45:00.000Z',
  baselineRestart:{releaseId:randomUUID(),closureId:randomUUID(),expectedVersion:hash('b'),consentDigest:hash('c')}};
 if(ordinary)delete input.baselineRestart;
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
test('extension is unavailable outside retained Compose or with an unrelated predecessor',()=>{
 for(const change of [i=>i.predecessor={releaseId:randomUUID(),expectedVersion:hash('a')},i=>i.manifest.deployment.provider='coolify',i=>i.manifest.cleanup.archiveRepository=true]){
  const i=setup();change(i);assert.equal(contract.createReleaseSchema.safeParse(i).success,false);assert.ok(error(i));
 }
});

test('ordinary Compose fresh nine-read proof binds old manifest without fabricating restart or changing historicalclock',()=>{
 const i=setup({ordinary:true}),before=structuredClone(i);assert.equal(contract.createReleaseSchema.safeParse(i).success,true);assert.equal(error(i),null);
 assert.equal(i.baselineRevalidation.baselineRestartDigest,contract.releaseDigest(null));assert.equal(i.baselineRestart,undefined);assert.deepEqual(i,before);
 assert.equal(i.manifest.baseline.observedAt,'2026-10-04T12:00:00.000Z');assert.equal(i.manifestDigest,contract.releaseDigest(i.manifest));
 assert.equal(releaseWindowError(i,new Date('2026-10-04T15:00:00.000Z'),now),null);
});
test('ordinary old clock without proof stillfailsreleasewindow; validproof doesnotextend backup or credentials',()=>{
 const i=setup({ordinary:true});delete i.baselineRevalidation;assert.equal(releaseWindowError(i,new Date('2026-10-04T15:00:00.000Z'),now),'release_prerequisite_stale');
 const proof=setup({ordinary:true});assert.equal(releaseWindowError(proof,new Date('2026-10-04T14:30:00.000Z'),now),'release_window_invalid');
 const late=setup({ordinary:true});late.manifest.backup.restoreVerifiedAt='2026-10-03T13:59:59.999Z';late.manifest.backup.capturedAt='2026-10-03T13:59:00.000Z';late.manifestDigest=contract.releaseDigest(late.manifest);Object.assign(late.baselineRevalidation,revalidation.baselineRevalidationBindings(late,contract.releaseDigest));seal(late);assert.equal(error(late),null);assert.equal(releaseWindowError(late,new Date('2026-10-04T15:00:00.000Z'),now),'release_prerequisite_stale');
});
test('ordinary proof supports separately grant-bound Gitpublicationbase without changing runtimebindings',()=>{
 const i=setup({ordinary:true});i.gitPublicationBase={commit:'e'.repeat(40),tree:'f'.repeat(40)};assert.equal(contract.createReleaseSchema.safeParse(i).success,true);assert.equal(error(i),null);
 assert.equal(i.baselineRevalidation.baseCommit,i.manifest.baseline.commit);assert.equal(i.baselineRevalidation.baselineRestartDigest,contract.releaseDigest(null));
});
for(const [name,mutate]of [
 ['application',i=>i.applicationId=randomUUID()],['host',i=>i.hostId=randomUUID()],['candidatecommit',i=>i.commit='f'.repeat(40)],['candidatetree',i=>i.candidateTree='f'.repeat(40)],
 ['target',i=>i.manifest.deployment.targets[0].targetId='other'],['basecommit',i=>i.baseCommit='f'.repeat(40)],['basetree',i=>i.baseTree='f'.repeat(40)],
 ['manifestcommit',i=>i.manifest.baseline.commit='f'.repeat(40)],['config',i=>i.manifest.baseline.configDigest=hash('f')],['schema',i=>i.manifest.baseline.schemaDigest=hash('f')],['data',i=>i.manifest.baseline.dataDigest=hash('f')],['health',i=>i.manifest.baseline.healthDigest=hash('f')],
 ['image',i=>i.manifest.deployment.targets[0].baseline.images[0].imageDigest='sha256:'+hash('f')],['source',i=>i.manifest.deployment.targets[0].baseline.sourceDigest=hash('f')],['mount',i=>i.manifest.deployment.targets[0].baseline.configuration.services[0].mountDigest=hash('f')],
 ['rollback',i=>i.manifest.rollback.configDigest=hash('f')],['backup',i=>i.manifest.backup.restoreDigest=hash('1')],['protectedimages',i=>i.manifest.cleanup.protectedResourceIds=[]],['receipt',i=>i.baselineRevalidation.receiptDigest=hash('f')],
 ['fakeRestartDigest',i=>i.baselineRevalidation.baselineRestartDigest=hash('f')]
])test('ordinary refuses swapped '+name,()=>{const i=setup({ordinary:true});mutate(i);i.manifestDigest=contract.releaseDigest(i.manifest);assert.ok(error(i));});
for(const name of revalidation.requiredParity)test('ordinary requires true '+name,()=>{const i=setup({ordinary:true});i.baselineRevalidation[name]=false;seal(i);assert.ok(error(i));});
for(const name of revalidation.zeroCounts)test('ordinary requires zero '+name,()=>{const i=setup({ordinary:true});i.baselineRevalidation[name]=1;seal(i);assert.ok(error(i));});
for(const key of revalidation.readKeys)test('ordinary requires exact fresh read '+key,()=>{
 const stale=setup({ordinary:true});stale.baselineRevalidation.actualReadTimes[key]=new Date(now.getTime()-300001).toISOString();seal(stale);assert.equal(error(stale),'release_prerequisite_stale');
 const future=setup({ordinary:true});future.baselineRevalidation.actualReadTimes[key]=new Date(now.getTime()+1).toISOString();seal(future);assert.equal(error(future),'release_prerequisite_stale');
 const missing=setup({ordinary:true});delete missing.baselineRevalidation.actualReadTimes[key];seal(missing);assert.ok(error(missing));
 const missingDigest=setup({ordinary:true});delete missingDigest.baselineRevalidation.actualReadDigests[key];seal(missingDigest);assert.ok(error(missingDigest));
});
test('ordinary five-minute interval accepts exact boundary and refuses outerclock stale/future/extra ninthread',()=>{
 const i=setup({ordinary:true});assert.equal(error(i,new Date(now.getTime()+300000)),null);assert.equal(error(i,new Date(now.getTime()+300001)),'release_prerequisite_stale');assert.equal(error(i,new Date(now.getTime()-1)),'release_prerequisite_stale');
 const j=setup({ordinary:true});j.baselineRevalidation.actualReadTimes.extra=now.toISOString();seal(j);assert.ok(error(j));
});
for(const [name,change]of [
 ['predecessor',i=>i.predecessor={releaseId:randomUUID(),expectedVersion:hash('a')}],['adoption',i=>i.baselineAdoption={}],['successor',i=>i.successorBasis={}],['published',i=>i.publishedGitBasis={}],
 ['nullRestart',i=>i.baselineRestart=null],['emptyRestart',i=>i.baselineRestart={}],['unknownRestart',i=>i.baselineRestart={mode:'ordinary'}],
 ['otherProvider',i=>i.manifest.deployment.provider='coolify'],['certification',i=>i.manifest.schemaVersion='roost-release-manifest-v1'],['otherPurpose',i=>i.manifest.purpose='certification'],['archived',i=>i.manifest.cleanup.archiveRepository=true],['missingTarget',i=>i.manifest.deployment.targets=[]],['extraTarget',i=>i.manifest.deployment.targets.push(structuredClone(i.manifest.deployment.targets[0]))]
])test('ordinary refuses wrongfamily or mixed '+name,()=>{const i=setup({ordinary:true});change(i);assert.equal(error(i),'release_baseline_revalidation_invalid');});
test('restart tuple hashes unchanged; binding layer doesnotreplace separatepublished-basis validation',()=>{
 const i=setup();assert.equal(i.baselineRevalidation.baselineRestartDigest,contract.releaseDigest(i.baselineRestart));assert.equal(error(i),null);
 const snapshot={...i,publishedGitBasis:{historicalSnapshotOnly:true}};assert.equal(error(snapshot),null);
 const ordinary=setup({ordinary:true});ordinary.baselineRevalidation.baseline.dataDigest=hash('f');ordinary.baselineRevalidation.baselineDigest=contract.releaseDigest(ordinary.baselineRevalidation.baseline);seal(ordinary);assert.equal(error(ordinary),'release_baseline_revalidation_binding_changed');
});
test('unknown restarttuple and restart withnewpublicationpair denied; absentextension leaveslegacy behavior alone',()=>{
 for(const tuple of [{},null,{releaseId:randomUUID(),expectedVersion:hash('a'),closureId:randomUUID(),consentDigest:hash('b'),extra:true}]){const i=setup();i.baselineRestart=tuple;assert.equal(error(i),'release_baseline_revalidation_invalid');}
 const i=setup();i.gitPublicationBase={commit:'e'.repeat(40),tree:'f'.repeat(40)};assert.equal(error(i),'release_baseline_revalidation_invalid');assert.equal(contract.createReleaseSchema.safeParse(i).success,false);
 const legacy=setup();delete legacy.baselineRevalidation;assert.equal(error(legacy),null);
});
