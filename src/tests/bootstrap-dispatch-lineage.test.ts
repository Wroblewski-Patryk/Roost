import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {dispatchFixture} from './bootstrap-dispatch-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {dispatchDigest} from '../modules/api-keys/bootstrap-dispatch-contract';
import {classifyDispatchFence,linkDispatchReceipt} from '../modules/api-keys/bootstrap-dispatch-lineage';
import {createAttestedBootstrapComposition} from '../modules/api-keys/bootstrap-attested-composition';

test('source-only canonical dispatch receipt lineage',async t=>{
 await t.test('first enrollment and recovery link every committed child to the same exact canonical heads',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){
   const f=await dispatchFixture(purpose),sourceBefore=f.f.state();await f.through('completed');
   const entries=f.ledger(),anchor=entries[0].record.lineage.anchor;
   for(let i=0;i<entries.length;i++){
    assert.deepEqual(entries[i].record.lineage.anchor,anchor);
    assert.deepEqual(entries[i].record.lineage.previous,i?linkDispatchReceipt(entries[i-1]):null);
    assert.equal(entries[i].fence,anchor.sealReceipt.fence);
   }
   const r=await f.factory().inspect(f.scope);assert.ok(r.ok);
   assert.equal(r.authorityCurrent,true);assert.equal(r.historyIntegrity,true);assert.equal(r.head?.state,'completed');
   assert.equal(r.canonical.attempt.state,'consumed');assert.equal(r.canonical.ticketCurrent.record.state,'consumed');
   assert.equal(r.canonical.completionRecorded,false);assert.equal(r.canonical.credentialActivated,false);
   assert.equal(r.canonical.completionBlocker,'signed_bootstrap_completion_required');
   assert.equal(r.fenceLineage.status,'exact_seal_epoch');assert.equal(r.fenceLineage.complete,true);
   assert.deepEqual(r.lastReceipt,linkDispatchReceipt(entries.at(-1)!));assert.deepEqual(f.f.state(),sourceBefore);
  }
 });
 await t.test('every predecessor receipt component is necessary even when record hashes are recomputed',async()=>{
  for(const field of ['operationId','eventId','recordDigest','requestDigest','rowDigest','writerXid','fence']){
   const f=await dispatchFixture();await f.through('claimed_not_sent');const e=f.ledger().at(-1)!;
   (e.record.lineage.previous as any)[field]=field.endsWith('Id')?randomUUID():field.endsWith('Digest')?'f'.repeat(64):'99999';
   e.recordDigest=dispatchDigest(e.record);const n=f.counts().writes;
   const r=await f.factory().inspect(f.scope);assert.equal(r.ok,false,field);assert.equal(r.historyIntegrity,false,field);
   assert.equal((await f.factory().execute(f.command('start_send'))).ok,false);assert.equal(f.counts().writes,n);
  }
 });
 await t.test('twenty fresh factories at each phase append exactly one next receipt',async()=>{
  const f=await dispatchFixture();
  for(const action of ['prepare','claim','start_send','outcome','start_complete','complete'] as const){
   const previous=f.ledger().length?linkDispatchReceipt(f.ledger().at(-1)!):null,n=f.ledger().length;
   const commands=Array.from({length:20},()=>f.command(action));
   const results=await Promise.all(commands.map(c=>f.factory().execute(c)));
   assert.equal(results.filter(r=>r.ok).length,1,action);assert.equal(f.ledger().length,n+1);
   assert.deepEqual(f.head()?.lineage.previous,previous);
  }
  const r=await f.factory().inspect(f.scope);assert.ok(r.ok);assert.equal(r.historyIntegrity,true);assert.equal(r.authorityCurrent,true);
 });
 await t.test('gaps, duplicate history, replayed receipts and foreign anchors fail closed',async()=>{
  const foreign=await dispatchFixture();await foreign.step('prepare');
  for(const fault of ['gap','duplicate','replayed','missing','foreign','anchor','request','sealEpoch']){
   const f=await dispatchFixture();await f.through('send_started');const rows=f.ledger(),e=rows.at(-1)!;
   if(fault==='gap')rows.splice(1,1);
   else if(fault==='duplicate')rows.push(structuredClone(e));
   else if(fault==='replayed')e.eventId=rows[0].eventId;
   else if(fault==='missing')e.record.lineage.previous=null;
   else if(fault==='foreign')e.record.lineage.anchor=structuredClone(foreign.head()!.lineage.anchor);
   else if(fault==='anchor')e.record.lineage.anchor.ticketHead.receipt.rowDigest='f'.repeat(64);
   else if(fault==='request')e.requestDigest='f'.repeat(64);
   else e.record.lineage.anchor.sealReceipt.fence='99999';
   e.recordDigest=dispatchDigest(e.record);
   const r=await f.factory().inspect(f.scope);assert.equal(r.ok,false,fault);assert.equal(r.historyIntegrity,false,fault);
   const denied=await f.factory().execute(f.command('outcome'));assert.equal(denied.ok,false);assert.equal(denied.sendAuthorized,false);
  }
 });
 await t.test('canonical seal receipt set gaps, duplicate IDs and substituted source receipts deny reconstruction',async()=>{
  for(const fault of ['missingHead','duplicateEvent','foreignWriter','changedReceipt','incomplete','missingRoot']){
   const f=await dispatchFixture();await f.through('claimed_not_sent');const op=f.f.operations().get(f.scope.attemptId)!;
   if(fault==='missingHead')op.receipts=op.receipts.filter((r:any)=>r.table!=='worker_bootstrap_heads');
   else if(fault==='missingRoot')op.receipts=op.receipts.filter((r:any)=>r.table!=='worker_bootstrap_attempts');
   else if(fault==='duplicateEvent')op.receipts[1].eventId=op.receipts[0].eventId;
   else if(fault==='foreignWriter')op.receipts[0].writerXid='9999';
   else if(fault==='changedReceipt')op.receipts[0].receiptId=randomUUID();
   else op.complete=false;
   const r=await f.factory().inspect(f.scope);assert.equal(r.ok,false,fault);assert.equal(r.historyIntegrity,false);
   assert.equal((await f.factory().execute(f.command('start_send'))).ok,false);
  }
 });
 await t.test('unrelated source epochs preserve history but never become own dispatch epochs',async()=>{
  for(const state of ['claimed_not_sent','send_started','completion_started'] as const){
   const f=await dispatchFixture();await f.through(state);f.f.drift();f.f.drift();
   const before=structuredClone(f.ledger()),start=f.calls.length,dbs=f.dbs.length,r=await f.factory().inspect(f.scope);assert.ok(r.ok);
   assert.equal(f.dbs.length-dbs,1);assert.equal(r.historyIntegrity,true);assert.equal(r.authorityCurrent,false);
   assert.equal(r.fenceLineage.status,'foreign_source_epoch');assert.equal(r.fenceLineage.complete,false);assert.equal(r.fenceLineage.ownSourceEpochs,0);
   assert.ok(f.calls.slice(start).every(c=>c.mode==='read'&&!/FOR UPDATE|^(INSERT|UPDATE|DELETE)/.test(c.sql)));
   assert.equal(r.effectiveState,state==='claimed_not_sent'?state:'delivery_unknown');
   const result=await f.factory().execute(f.command(state==='claimed_not_sent'?'start_send':'resume'));
   assert.equal(result.ok,false);assert.equal(result.sendAuthorized,false);assert.equal(result.completionAuthorized,false);
   assert.equal(!result.ok&&result.retryable,false);assert.equal(!result.ok&&result.reconciliationRequired,state!=='claimed_not_sent');
   assert.deepEqual(f.ledger(),before);
   assert.equal(classifyDispatchFence(r.anchor,'1').status,'fence_regression');
  }
 });
 await t.test('expired and revoked authority retain separately verified history within one read snapshot',async()=>{
  for(const change of ['expiry','revoke','revision']){
   const f=await dispatchFixture();await f.through('completion_started');
   if(change==='expiry')f.at(60001);else if(change==='revision')f.f.revise();else assert.equal((await f.f.execute('terminal',{action:'revoke'})).ok,true);
   const count=f.dbs.length,r=await f.factory().inspect(f.scope);assert.ok(r.ok,change);
   assert.equal(f.dbs.length-count,1);assert.equal(r.historyIntegrity,true);assert.equal(r.authorityCurrent,false);
   assert.equal(r.effectiveState,'delivery_unknown');assert.equal(r.retryable,false);assert.equal(r.completionAuthorized,false);
  }
 });
 await t.test('later audited ticket revocation is drift, not a missing seal-operation receipt',async()=>{
  const f=await dispatchFixture();await f.through('send_started');
  const predecessor=f.f.objects().filter(o=>o.table==='worker_bootstrap_lifecycle_events').at(-1)!,later=structuredClone(predecessor);
  const record:any=later.row.record;
  record.id=randomUUID();record.revision++;record.previousDigest=predecessor.row.record_digest;
  record.action='revoke';record.state='revoked';record.revoked=true;
  later.row.id=record.id;later.row.revision=record.revision;later.row.previous_digest=record.previousDigest;
  later.row.record_digest=reviewDigest(record);later.row.writer_xid='9000';
  later.rowId=record.id;later.digest=reviewDigest(later.row);later.receiptId=randomUUID();later.eventId=randomUUID();
  later.writerXid='9000';f.f.drift();later.fence=String(f.f.state().fence);f.f.objects().push(later);
  const before=f.f.state(),r=await f.factory().inspect(f.scope);assert.ok(r.ok);
  assert.equal(r.authorityCurrent,false);assert.equal(r.historyIntegrity,true);assert.equal(r.effectiveState,'delivery_unknown');
  assert.equal(r.canonical.ticketAtSeal.revision,record.revision-1);
  assert.equal(r.canonical.ticketCurrent.record.revoked,true);assert.equal(r.canonical.ticketCurrent.record.revision,record.revision);
  assert.equal((await f.factory().execute(f.command('outcome'))).ok,false);assert.deepEqual(f.f.state(),before);
  const missing=f.f.operations().get(f.scope.attemptId)!;missing.receipts=missing.receipts.filter((r:any)=>r.table!=='worker_bootstrap_heads');
  const denied=await f.factory().inspect(f.scope);assert.equal(denied.ok,false);assert.equal(denied.historyIntegrity,false);
 });
 await t.test('unknown, reconcile, recover and cancel preserve every causal predecessor through fresh factories',async()=>{
  const f=await dispatchFixture();await f.through('send_started');
  for(const action of ['unknown','require_reconciliation','reconcile','recover'] as const){
   const predecessor=linkDispatchReceipt(f.ledger().at(-1)!);
   assert.equal((await f.factory().execute(f.command(action))).ok,true);
   assert.deepEqual(f.head()?.lineage.previous,predecessor);
   const r=await f.factory().inspect(f.scope);assert.ok(r.ok);assert.equal(r.historyIntegrity,true);
  }
  assert.equal(f.head()?.state,'cancelled');assert.equal((await f.factory().execute(f.command('prepare'))).ok,false);
  const c=await dispatchFixture();await c.through('claimed_not_sent');const previous=linkDispatchReceipt(c.ledger().at(-1)!);
  await c.step('cancel');assert.deepEqual(c.head()?.lineage.previous,previous);
 });
 await t.test('false ACK rolls back lineage; lost ACK reconstructs a single immutable receipt with no retry',async()=>{
  for(const fault of ['rollback','false','lost','readback']){
   const f=await dispatchFixture();await f.through('claimed_not_sent');const before=structuredClone(f.ledger());
   f.controls.phase='start_send';f.controls.fault=fault;
   const r=await f.factory().execute(f.command('start_send'));assert.equal(r.ok,false);assert.equal(r.sendAuthorized,false);
   f.clear();const status=await f.factory().inspect(f.scope);assert.ok(status.ok);assert.equal(status.historyIntegrity,true);
   if(fault==='rollback'||fault==='false')assert.deepEqual(f.ledger(),before);
   else{
    assert.equal(f.ledger().length,before.length+1);assert.equal(status.effectiveState,'delivery_unknown');
    assert.deepEqual(f.head()?.lineage.previous,linkDispatchReceipt(before.at(-1)!));
    assert.equal((await f.factory().execute(f.command('resume'))).ok,false);
   }
  }
 });
 await t.test('drift after external send suppresses completion and any restarted exchange',async()=>{
  const f=await dispatchFixture();await f.through('claimed_not_sent');const h=f.head()!;let sent=0,completed=0;
  const q={...f.scope,ownerId:h.ownerId,ownerEpoch:h.ownerEpoch,claimGeneration:h.claimGeneration,expectedRevision:h.revision,expectedDigest:dispatchDigest(h)};
  const deps={qualification:'synthetic_durable_composition_v1' as const,dispatch:f.factory(),
   exchange:async()=>{sent++;f.f.drift();return {synthetic:true};},complete:async()=>{completed++;}};
  assert.equal((await createAttestedBootstrapComposition(deps).runClaimed(q)).ok,false);
  assert.equal((await createAttestedBootstrapComposition({...deps,dispatch:f.factory()}).runClaimed(q)).ok,false);
  const r=await f.factory().inspect(f.scope);assert.ok(r.ok);assert.equal(r.effectiveState,'delivery_unknown');
  assert.equal(sent,1);assert.equal(completed,0);assert.equal(r.historyIntegrity,true);assert.equal(r.authorityCurrent,false);
 });
 await t.test('source-only lineage adds no transport, signing, process state or default client',()=>{
  for(const name of ['bootstrap-dispatch-lineage','bootstrap-dispatch-prisma']){
   const source=readFileSync(`src/modules/api-keys/${name}.ts`,'utf8');
   assert.doesNotMatch(source,/new PrismaClient|process\.env|\bfetch\(|\bconnect\(|createPrivateKey|generateKeyPair|child_process/);
  }
 });
});
