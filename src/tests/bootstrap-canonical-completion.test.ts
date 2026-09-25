import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {canonicalCompletionFixture} from './bootstrap-canonical-completion-fixture';
import {createCanonicalBootstrapCompletion} from '../modules/api-keys/bootstrap-canonical-completion';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {validateCompletion} from '../modules/api-keys/bootstrap-canonical-completion-contract';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

for(const purpose of ['first_enrollment','owner_recovery'] as const)test(`canonical completion: ${purpose}, existing credential, one bound transaction, restart/read purity`,async()=>{
 const f=await canonicalCompletionFixture(purpose),r=await f.adapter.complete(f.input);
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.credentialActivated,true);assert.equal(r.completionRecorded,true);assert.deepEqual(f.stats(),{writes:11,activations:1});
 assert.deepEqual(f.state().histories.map(h=>h.state),['dispatched','acknowledged']);assert.deepEqual(f.state().tickets.map(h=>h.state),['dispatched','completed']);
 assert.deepEqual(f.verifications.map(v=>v.kind),['peer','completion','binding']);
 assert.equal(new Set([...f.verifications.map(v=>v.db),...f.providerDbs,...f.calls.filter(c=>c.sql.startsWith('INSERT INTO')||c.sql.startsWith('UPDATE ')).map(c=>c.db)]).size,1);
 for(const flag of Object.keys(lifecycleFlags))assert.equal((r as any)[flag],false);
 const before=f.state(),writes=f.stats().writes;
 const replay=await f.factory().complete(structuredClone(f.input));assert.equal(replay.ok,true);assert.ok('idempotent' in replay&&replay.idempotent);
 assert.equal((await f.factory().inspect(f.input)).completionRecorded,true);assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,writes);
 assert.ok(f.calls.filter(c=>c.sql.startsWith('INSERT INTO')||c.sql.startsWith('UPDATE ')).every(c=>c.mode==='write'));
 assert.ok(!f.calls.some(c=>/INSERT INTO api_keys|fetch\(|http[s]?:\/\//.test(c.sql)));
});
test('canonical completion: no dependency defaults or response-digest activation',async()=>{
 const f=await canonicalCompletionFixture();
 assert.equal((await createCanonicalBootstrapCompletion().complete(f.input)).ok,false);
 for(const override of [{verifier:undefined},{credentialFacts:undefined},{decisionAuthority:{}},{qualification:'production'}]){
  assert.equal((await createCanonicalBootstrapCompletion({...f.deps,...override} as any).complete(f.input)).ok,false);
 }
 assert.equal((await f.adapter.complete({responseDigest:f.input.completion.payload.responseDigest})).ok,false);assert.equal(f.stats().activations,0);
});
for(const kind of ['peer','completion','binding'])test(`canonical completion: invalid ${kind} verifier denies before mutation`,async()=>{
 const f=await canonicalCompletionFixture();f.controls.verify=kind;assert.equal((await f.adapter.complete(f.input)).ok,false);assert.equal(f.stats().writes,0);
 assert.equal(f.verifications.at(-1)?.kind,kind);
});
for(const provider of ['missing','possession'])test(`canonical completion: credential provider ${provider} denies`,async()=>{
 const f=await canonicalCompletionFixture();f.controls.provider=provider;assert.equal((await f.adapter.complete(f.input)).ok,false);assert.equal(f.stats().activations,0);assert.equal(f.providerDbs.length,1);
});
test('canonical completion: strict signed bindings, times, generations and actual credential facts',async()=>{
 const f=await canonicalCompletionFixture();
 // Obtain the exact public context used by the real adapter without writing.
 let context:any;f.deps.verifier.verify=async(_db,r)=>{context=r.context;return false;};await f.factory().complete(f.input);assert.ok(context);
 validateCompletion(f.input,context);
 const mutate:Array<(v:any,s:any)=>void>=[
  v=>v.binding.payload.command.operationId=v.binding.payload.command.completionOperationId,
  v=>v.binding.payload.command.attemptId=randomUUID(),v=>v.binding.payload.command.ticketId=randomUUID(),v=>v.binding.payload.command.decisionId=randomUUID(),
  v=>v.binding.payload.command.expectedRevision++,v=>v.binding.payload.command.expectedDigest='0'.repeat(64),v=>v.binding.payload.command.ownerEpoch++,
  v=>v.binding.payload.command.claimGeneration++,v=>v.binding.payload.command.ownerId=randomUUID(),v=>v.binding.payload.command.completionOperationId=randomUUID(),
  v=>v.binding.payload.dispatchPredecessor.writerXid='900',v=>v.binding.payload.dispatchPredecessor.eventId=randomUUID(),
  v=>v.binding.payload.sealDigest='0'.repeat(64),v=>v.binding.payload.ticketEnvelopeDigest='0'.repeat(64),v=>v.binding.payload.requestId=randomUUID(),
  v=>v.binding.payload.hostGeneration=randomUUID(),v=>v.binding.payload.installationGeneration=randomUUID(),v=>v.binding.payload.credential.epoch++,
  v=>v.binding.payload.credential.fingerprint='0'.repeat(64),v=>v.binding.payload.handoffId=randomUUID(),v=>v.binding.payload.handoffResponseDigest='0'.repeat(64),
  v=>v.binding.payload.credentialApprovalDigest='0'.repeat(64),v=>v.binding.payload.peerDigest='0'.repeat(64),v=>v.binding.payload.completionDigest='0'.repeat(64),
  v=>v.binding.payload.issuedAt=f.d.f.iso(1000),v=>v.binding.payload.completedAt=f.d.f.iso(-1000),
  v=>v.peer.payload.peerAddress='127.0.0.1',v=>v.peer.payload.serverName='foreign.example.org',v=>v.peer.payload.pin='0'.repeat(64),
  v=>v.peer.payload.certificateEpoch++,v=>v.peer.payload.expiresAt=f.d.f.iso(-1),v=>v.peer.payload.observedAt=f.d.f.iso(1000),
  v=>v.completion.payload.responseDigest='0'.repeat(64),v=>v.completion.payload.requestId=randomUUID(),v=>v.completion.payload.credential.id=randomUUID(),
  (_v,s)=>s.credential.active=true,(_v,s)=>s.credential.revokedAt=f.d.f.iso(-1),(_v,s)=>s.credential.credential.epoch++,
  (_v,s)=>s.credential.hostId=randomUUID(),(_v,s)=>s.handoff.ackDeadline=f.d.f.iso(-1),(_v,s)=>s.ticket.revoked=true,
  (_v,s)=>s.dispatch.state='delivery_unknown',(_v,s)=>s.dispatch.state='cancelled',(_v,s)=>s.dispatch.state='reconciliation_required',
  (_v,s)=>s.at=f.d.f.iso(30000),(_v,s)=>s.fence=String(Number(s.fence)+1),v=>v.unexpected=true
 ];
 for(const [index,change] of mutate.entries()){
  const v=structuredClone(f.input),s=structuredClone(context);change(v,s);
  assert.throws(()=>validateCompletion(v,s),`mutation ${index}`);
 }
 assert.equal(f.stats().writes,0);
});
test('canonical completion: 20 independent factories race, one activation and immutable exact replay',async()=>{
 const f=await canonicalCompletionFixture();const results=await Promise.all(Array.from({length:20},()=>f.factory().complete(structuredClone(f.input))));
 assert.ok(results.some(r=>r.ok),JSON.stringify(results));assert.equal(f.stats().activations,1);assert.equal(f.stats().writes,11);
 assert.equal(results.filter(r=>r.ok&&!r.idempotent).length,1);
 const conflict=structuredClone(f.input);conflict.binding.signature='d'.repeat(128);
 assert.equal((await f.factory().complete(conflict)).ok,false);assert.equal(f.stats().activations,1);
});
for(let write=1;write<=11;write++)test(`canonical completion: rollback at write ${write}, zero activation and unchanged dispatch`,async()=>{
 const f=await canonicalCompletionFixture(),before=f.state(),head=structuredClone(f.d.head()),fence=f.d.f.state().fence;
 f.controls.write=write;const r=await f.adapter.complete(f.input);assert.equal(r.ok,false);assert.equal(r.retryable,false);
 assert.deepEqual(f.state(),before);assert.deepEqual(f.d.head(),head);assert.equal(f.d.f.state().fence,fence);assert.equal(f.stats().activations,0);assert.equal(f.stats().writes,write);
});
for(const fault of ['precommit','proof','false','lost','readback','missing','mismatch','receipt'])test(`canonical completion: ${fault}, no false success or retry`,async()=>{
 const f=await canonicalCompletionFixture();if(fault==='false')f.falseAck();else if(fault==='lost')f.lost();else f.controls.fault=fault;
 const r=await f.adapter.complete(f.input);assert.equal(r.ok,false);assert.equal(r.retryable,false);assert.equal(r.completionRecorded,false);assert.equal(r.credentialActivated,false);
 assert.ok('reconciliationRequired' in r&&r.reconciliationRequired);assert.equal(f.stats().activations,['lost','readback','missing','mismatch','receipt'].includes(fault)?1:0);
});
for(const stage of ['verify','provider'])test(`canonical completion: source drift during ${stage} invalidates bound proof`,async()=>{
 const f=await canonicalCompletionFixture();if(stage==='verify')f.controls.afterVerify=()=>f.d.f.drift();else f.controls.afterProvider=()=>f.d.f.drift();
 assert.equal((await f.adapter.complete(f.input)).ok,false);assert.equal(f.stats().writes,0);
});
for(const guard of ['body','disabled'])test(`canonical completion: ${guard} catalog denies`,async()=>{
 const f=await canonicalCompletionFixture();f.controls.guard=guard;assert.equal((await f.adapter.complete(f.input)).ok,false);assert.equal(f.stats().writes,0);
});
test('canonical completion: terminal dispatch is retained, never activated by completion',async()=>{
 const f=await canonicalCompletionFixture();await f.d.step('require_reconciliation');const head=structuredClone(f.d.head());
 assert.equal((await f.adapter.complete(f.input)).ok,false);assert.deepEqual(f.d.head(),head);assert.equal(f.stats().activations,0);
});
test('canonical completion: drift immediately before COMMIT rolls back activation and all histories',async()=>{
 const f=await canonicalCompletionFixture(),before=f.state(),head=structuredClone(f.d.head());
 f.controls.beforeCommit=()=>f.d.f.drift();const r=await f.adapter.complete(f.input);
 assert.equal(r.ok,false);assert.equal(r.retryable,false);assert.equal(f.stats().writes,11);assert.equal(f.stats().activations,0);
 assert.deepEqual(f.state(),before);assert.deepEqual(f.d.head(),head);
});
test('canonical completion: callbacks cannot mutate public credential or authority without detection',async()=>{
 for(const change of [(s:any)=>s.credential.credential.id=randomUUID(),(s:any)=>s.credential.active=true,(s:any)=>s.handoff.state='revoked',
  (s:any)=>s.registration.record.signed.payload.intent.channel.certificateEpoch++,(s:any)=>s.sourceDigest='9'.repeat(64)]){
  const f=await canonicalCompletionFixture();f.controls.afterProvider=()=>f.changeContext(change);
  assert.equal((await f.adapter.complete(f.input)).ok,false);assert.equal(f.stats().writes,0);
 }
});
test('canonical completion: revoked authority between first snapshot and write lock denies',async()=>{
 const f=await canonicalCompletionFixture(),transaction=f.deps.transaction;
 const deps={...f.deps,transaction:async<T>(mode:'read'|'write',work:any):Promise<T>=>{
  if(mode==='write')f.d.f.revise();return transaction(mode,work) as Promise<T>;
 }};
 assert.equal((await createCanonicalBootstrapCompletion(deps).complete(f.input)).ok,false);assert.equal(f.stats().writes,0);
});
