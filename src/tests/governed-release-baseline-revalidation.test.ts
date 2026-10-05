import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createReleaseSchema,releaseDigest,releaseWindowError} from '../modules/agent-runtime/governed-release-contract';
const {fixture,hash}=require(path.resolve(__dirname,'../../scripts/fixtures/release-compose-contract.cjs'));
const revalidation=require(path.resolve(__dirname,'../../scripts/lib/agent-host-release-baseline-revalidation.cjs'));
const now=new Date('2026-10-04T14:00:00.000Z'),credentialExpiry=new Date('2026-10-04T15:00:00.000Z');
function setup(){
 const f=fixture(),input:any={...f.s,manifestDigest:releaseDigest(f.m),requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
  releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('a'),
  releaserRevision:'2026-10-04T12:00:00.000Z',expiresAt:'2026-10-04T14:45:00.000Z',
  baselineRestart:{releaseId:randomUUID(),closureId:randomUUID(),expectedVersion:hash('b'),consentDigest:hash('c')}};
 input.baselineRevalidation={schemaVersion:'roost-release-baseline-revalidation-v1',source:'root_actual_readonly_baseline_parity',...revalidation.baselineRevalidationBindings(input,releaseDigest),
  receiptDigest:hash('d'),observedAt:now.toISOString(),actualReadTimes:Object.fromEntries(revalidation.readKeys.map((k:string)=>[k,now.toISOString()])),
  actualReadDigests:Object.fromEntries(revalidation.readKeys.map((k:string)=>[k,hash('e')])),...Object.fromEntries(revalidation.requiredParity.map((k:string)=>[k,true])),
  ...Object.fromEntries(revalidation.zeroCounts.map((k:string)=>[k,0]))};
 seal(input);return input;
}
function seal(i:any){i.baselineRevalidation.revalidationDigest=revalidation.baselineRevalidationDigest(i.baselineRevalidation,releaseDigest);}
test('validated supplemental read admits the old exact baseline without altering manifest, approval, readiness or expiry',()=>{
 const i=setup(),before=structuredClone(i);assert.equal(createReleaseSchema.safeParse(i).success,true);
 assert.equal(releaseWindowError(i,credentialExpiry,now),null);assert.deepEqual(i,before);
 assert.equal(i.manifest.baseline.observedAt,'2026-10-04T12:00:00.000Z');
 const {baselineRevalidation:_,...old}=i;assert.equal(releaseWindowError(old,credentialExpiry,now),'release_prerequisite_stale');
});
test('legacy prerequisite and release windows keep their existing limits',()=>{
 const i=setup();delete i.baselineRevalidation;i.manifest.baseline.observedAt=now.toISOString();
 assert.equal(releaseWindowError(i,credentialExpiry,now),null);
 i.manifest.baseline.observedAt=new Date(now.getTime()-3600000).toISOString();assert.equal(releaseWindowError(i,credentialExpiry,now),null);
 i.manifest.baseline.observedAt=new Date(now.getTime()-3600001).toISOString();assert.equal(releaseWindowError(i,credentialExpiry,now),'release_prerequisite_stale');
});
test('a timestamp-only or null supplemental object cannot bypass stale baseline rejection',()=>{
 for(const v of [null,{}, {observedAt:now.toISOString()}]){const i=setup();i.baselineRevalidation=v;assert.equal(createReleaseSchema.safeParse(i).success,false);assert.equal(releaseWindowError(i,credentialExpiry,now),'release_baseline_revalidation_invalid');}
});
test('five-minute freshness applies to actual component reads as well as the sealed receipt',()=>{
 for(const mutate of [(i:any)=>i.baselineRevalidation.observedAt='2026-10-04T13:54:59.999Z',(i:any)=>i.baselineRevalidation.actualReadTimes.health='2026-10-04T13:54:59.999Z',
  (i:any)=>i.baselineRevalidation.actualReadTimes.inventory='2026-10-04T14:00:00.001Z']){const i=setup();mutate(i);seal(i);assert.equal(releaseWindowError(i,credentialExpiry,now),'release_prerequisite_stale');}
});
test('fresh supplemental parity cannot extend the one-hour or credential-bound grant expiry',()=>{
 for(const expiresAt of ['2026-10-04T15:00:00.001Z','2026-10-04T14:00:00.000Z']){const i=setup();i.expiresAt=expiresAt;assert.equal(releaseWindowError(i,credentialExpiry,now),'release_window_invalid');}
 assert.equal(releaseWindowError(setup(),new Date('2026-10-04T14:30:00.000Z'),now),'release_window_invalid');
});
test('fresh supplemental parity cannot revive stale backup restore evidence',()=>{
 const i=setup();i.manifest.backup.capturedAt=i.manifest.backup.restoreVerifiedAt='2026-10-03T13:59:59.999Z';i.manifestDigest=releaseDigest(i.manifest);
 Object.assign(i.baselineRevalidation,revalidation.baselineRevalidationBindings(i,releaseDigest));seal(i);
 assert.equal(createReleaseSchema.safeParse(i).success,true);assert.equal(releaseWindowError(i,credentialExpiry,now),'release_prerequisite_stale');
});
test('future historical baseline or restore timestamp is still refused',()=>{
 for(const change of [(i:any)=>i.manifest.baseline.observedAt='2026-10-04T14:01:00.001Z',(i:any)=>i.manifest.backup.restoreVerifiedAt='2026-10-04T14:01:00.001Z']){
  const i=setup();change(i);i.manifestDigest=releaseDigest(i.manifest);Object.assign(i.baselineRevalidation,revalidation.baselineRevalidationBindings(i,releaseDigest));seal(i);
  assert.equal(releaseWindowError(i,credentialExpiry,now),'release_prerequisite_stale');
 }
});
test('changed manifest facts and unsafe queue prevent server admission even when the wrapper timestamp is fresh',()=>{
 for(const change of [(i:any)=>i.baseCommit='f'.repeat(40),(i:any)=>i.baseTree='f'.repeat(40),(i:any)=>i.manifest.baseline.dataDigest=hash('f'),(i:any)=>i.manifest.deployment.targets[0].baseline.images[0].imageDigest='sha256:'+hash('f'),
  (i:any)=>i.baselineRevalidation.candidateQueueCount=1,(i:any)=>i.baselineRevalidation.databaseReadOnly=false]){
  const i=setup();change(i);i.manifestDigest=releaseDigest(i.manifest);seal(i);
  assert.equal(createReleaseSchema.safeParse(i).success,false);assert.ok(releaseWindowError(i,credentialExpiry,now));
 }
});
