import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {v3WritePhases} from '../modules/api-keys/bootstrap-proof-issuance';
import {captureV3Projection,projectV3Sources,createV3ProjectionReader,projectionSetDigest,projectionDomains,projectionRecordDigest,sortProjectionRows,
 type ProjectionEvidence,type ProjectionAnchor} from '../modules/api-keys/bootstrap-proof-projection';
import {projectionFixture,projectionTransactionFixture,rehashEvidence,commitmentOf} from './bootstrap-proof-projection-fixture';
import {copy,hash} from './bootstrap-proof-issuance-fixture';
import {proofId} from './bootstrap-proof-persistence-fixture';

function closed(result:ReturnType<typeof projectV3Sources>){
 assert.equal(result.sendPermit,false);assert.equal(result.persistenceQualified,false);assert.equal(result.cryptographyQualified,false);
 for(const key of Object.keys(lifecycleFlags))assert.equal((result as any)[key],false);
}

test('v76 exact own-XID/receipt lineage projection: source model only',async t=>{
 let effects=0;const forbidden=()=>{effects++;throw Error('forbidden private/external operation');};
 for(const method of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign','verify'] as const)t.mock.method(crypto,method,forbidden);
 for(const method of ['connect','createConnection'] as const)t.mock.method(net,method,forbidden);t.mock.method(net.Server.prototype,'listen',forbidden);t.mock.method(tls,'connect',forbidden);
 for(const module of [http,https])for(const method of ['request','get'] as const)t.mock.method(module,method,forbidden);
 for(const method of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,method,forbidden);t.mock.method(dns.promises,method,forbidden);}
 t.mock.method(globalThis,'fetch',forbidden);for(const method of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,method,forbidden);
 const logs:unknown[]=[];for(const method of ['log','warn','error'] as const)t.mock.method(console,method,(...args:unknown[])=>logs.push(args));

 for(const recovery of [false,true])await t.test(`${recovery?'recovery':'first'}: all six phases project exactly to immutable baseline`,()=>{
  const f=projectionFixture(recovery),original=copy(f.baseline);assert.ok(Object.isFrozen(f.baseline.before.rows[0]));
  for(const phase of v3WritePhases){const evidence=f.evidence(phase),before=copy(evidence),result=projectV3Sources(f.plan,f.baseline,evidence,phase);closed(result);
   assert.equal(result.projectedSourceSetDigest,f.baseline.before.sourceSetDigest);assert.equal(result.projectedAuthorityRevision,f.plan.authority.authorityRevision);
   assert.equal(result.projectedAuthorityDigest,f.plan.authority.authorityDigest);assert.notEqual(result.finalSourceSetDigest,result.projectedSourceSetDigest);
   assert.equal(BigInt(result.toFence)-BigInt(result.fromFence),BigInt(evidence.epochs.length));assert.deepEqual(evidence,before);
  }
  assert.deepEqual(f.baseline,original);
  const final=f.evidence(),fanout=final.mutations.filter(m=>m.authorityChange);
  assert.equal(fanout.length,10);assert.equal(new Set(fanout.map(m=>m.authorityChange!.decisionId)).size,2);
  for(const head of final.after.heads)assert.equal(BigInt(head.revision)-BigInt(f.baseline.before.heads.find(h=>h.decisionId===head.decisionId)!.revision),5n);
  assert.equal(final.mutations.filter(m=>m.beforeDigest!==null).length,recovery?2:0);
 });

 await t.test('explicit shared epochs and separate nested epochs both account for every row/receipt/Event exactly once',()=>{
  const f=projectionFixture();for(const shared of [true,false]){
   const e=f.evidence('seal',shared),r=projectV3Sources(f.plan,f.baseline,e,'seal');closed(r);
   assert.equal(e.epochs.reduce((n,x)=>n+x.memberCount,0),e.mutations.length);
   assert.equal(e.epochs.reduce((n,x)=>n+x.receiptCount,0),e.receipts.length);
   assert.equal(new Set(e.receipts.map(r=>r.event.id)).size,e.receipts.length);
   assert.ok(e.receipts.some(r=>r.parentReceiptId!==null));assert.ok(e.epochs.some(x=>x.guard==='statement_guard'));
   assert.equal(e.epochs.some(x=>x.members.length>1),shared);assert.equal(e.epochs.some(x=>x.guard==='nested_guard'),!shared);
  }
 });

 await t.test('fanout eligibility is anchored in decision row bindings; inactive decisions cannot be silently added or omitted',()=>{
  const f=projectionFixture(false,false),e=f.evidence();closed(projectV3Sources(f.plan,f.baseline,e,'seal'));
  assert.equal(e.mutations.filter(m=>m.authorityChange).length,5);
  const inactive=e.after.heads.find(h=>!h.fanout)!;assert.equal(inactive.revision,'2');
  const forged=copy(e);forged.after.heads.find(h=>!h.fanout)!.fanout=true;rehashEvidence(forged,f.baseline);
  assert.throws(()=>projectV3Sources(f.plan,f.baseline,forged,'seal'));
 });

 await t.test('immutable anchor denies caller rebase, stale heads, omitted coverage, duplicate rows and dishonest fanout inventory',()=>{
  const f=projectionFixture();
  const mutations:((b:any)=>void)[]=[
   b=>b.before.fence='51',b=>b.writerXid='99',b=>b.operationId=proofId(),b=>b.planDigest=hash('f'),b=>b.workspaceId=proofId(),
   b=>b.before.factsDigest=hash('f'),b=>b.before.coverage.pop(),b=>b.before.coverage.reverse(),b=>b.before.rows.pop(),
   b=>b.before.rows.push(copy(b.before.rows[0])),b=>b.before.rows.reverse(),b=>b.before.heads.pop(),
   b=>b.before.heads[0].revision='1',b=>b.before.heads[0].fanout=false,b=>b.before.heads.push(copy(b.before.heads[0]))
  ];
  for(const change of mutations){const b=copy(f.baseline) as ProjectionAnchor;change(b);b.before.sourceSetDigest=projectionSetDigest(b.before.rows);b.digest=projectionRecordDigest(projectionDomains.anchor,b);
   const e=f.evidence();e.anchorDigest=b.digest;rehashEvidence(e,b);assert.throws(()=>projectV3Sources(f.plan,b,e,'seal'));
  }
  const b=copy(f.baseline.before);b.rows[0].digest=hash('f');b.sourceSetDigest=projectionSetDigest(b.rows);assert.throws(()=>captureV3Projection(f.plan,b));
 });

 for(const phase of v3WritePhases)await t.test(`${phase}: foreign additions/deletions/owner-lifecycle-issuer-key-decision drift and ABA deny`,()=>{
  const f=projectionFixture(),base=f.evidence(phase);
  for(const source of ['workspace','membership','identity','host','issuer','proof_key','proof_attachment','decision','decision_revision','decision_acceptance','owner_auth','credential','handoff','anchor','attestation_key','dispatch','completion']){
   for(const change of ['digest','binding','delete']){
    const e=copy(base),row=e.after.rows.find(r=>r.source===source)!;
    if(change==='digest')row.digest=hash('f');else if(change==='binding')row.bindingDigest=hash('f');else e.after.rows.splice(e.after.rows.indexOf(row),1);
    rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,phase),`${source}:${change}`);
   }
  }
  for(const change of [(e:ProjectionEvidence)=>{e.after.rows.push({source:'proof_link',key:proofId(),digest:hash('e'),bindingDigest:hash('e')});e.after.rows=sortProjectionRows(e.after.rows);},
   (e:ProjectionEvidence)=>{e.after.factsDigest=hash('f');},(e:ProjectionEvidence)=>{e.after.fence=String(BigInt(e.after.fence)+2n);}]){
   const e=copy(base);change(e);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,phase));
  }
  // An ABA may restore all row values but cannot erase its two fence epochs.
  const e=copy(base),original=copy(e.after.rows[0]);e.after.rows[0].digest=hash('f');e.after.rows[0]=original;e.after.fence=String(BigInt(e.after.fence)+2n);
  rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,phase));
 });

 await t.test('every mutation rejects wrong XID/operation/phase/slot/root/before/after/causal source even with fresh self-hashes',()=>{
  const f=projectionFixture(),base=f.evidence();
  const changes:((m:ProjectionEvidence['mutations'][number])=>void)[]=[
   m=>m.writerXid='99',m=>m.operationId=proofId(),m=>m.phase='reservation',m=>m.id=proofId(),m=>m.slot='foreign',m=>m.parentId=proofId(),
   m=>m.beforeDigest=hash('f'),m=>m.after.bindingDigest=hash('f'),m=>m.after.key=proofId(),m=>m.after.source='credential',m=>m.epoch='1'
  ];
  for(const n of [1,7,base.mutations.length-1])for(const change of changes){const e=copy(base);change(e.mutations[n]);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));}
  for(const key of ['decisionId','revision','previousDigest','source','sourceKey','sourceDigest','causeMutationId','action']){
   const e=copy(base),m=e.mutations.find(m=>m.authorityChange)!;(m.authorityChange as any)[key]=key==='revision'?'99':key==='source'?'credential':key==='action'?'revoke':hash('f');
   m.after.bindingDigest=proofDigest(m.authorityChange);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));
  }
 });

 await t.test('every receipt family and nested receipt rejects wrong subject/Event/digest/XID/operation/parent/cardinality',()=>{
  const f=projectionFixture(),base=f.evidence();
  const representatives=[...new Map(base.receipts.map((r,n)=>[`${r.family}:${!!r.parentReceiptId}`,n])).values()];
  const changes:((r:ProjectionEvidence['receipts'][number])=>void)[]=[
   r=>{r.writerXid=r.event.writerXid='99';},r=>{r.operationId=r.event.operationId=proofId();},r=>{r.subjectId=r.event.subjectId=proofId();},
   r=>{r.rowDigest=r.event.subjectDigest=hash('f');},r=>{r.parentReceiptId=r.event.parentReceiptId=proofId();},r=>{r.epoch=r.event.epoch='1';},
   r=>{r.event.workspaceId=proofId();},r=>{r.event.receiptId=proofId();},r=>{r.event.source='credential';},r=>{r.event.launchAuthority=true as any;}
  ];
  for(const n of representatives)for(const change of changes){const e=copy(base);change(e.receipts[n]);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));}
  for(const change of [(e:ProjectionEvidence)=>e.receipts.pop(),(e:ProjectionEvidence)=>e.receipts.push(copy(e.receipts[0])),
   (e:ProjectionEvidence)=>{e.receipts[1].nativeReceiptKey=e.receipts[0].nativeReceiptKey;},
   (e:ProjectionEvidence)=>{e.receipts[1].event.id=e.receipts[0].event.id;},(e:ProjectionEvidence)=>e.mutations.pop(),(e:ProjectionEvidence)=>e.mutations.push(copy(e.mutations[0]))]){
   const e=copy(base);change(e);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));
  }
 });

 await t.test('duplicate/shared epoch, gaps, regression, borrowed root and hidden nested receipts cannot use latest fence wins',()=>{
  const f=projectionFixture(),base=f.evidence();
  const changes:((e:ProjectionEvidence)=>void)[]=[
   e=>e.epochs.pop(),e=>e.epochs.splice(1,1),e=>e.epochs.push(copy(e.epochs.at(-1)!)),e=>e.epochs.reverse(),
   e=>{e.epochs[2].revision=e.epochs[1].revision;},e=>{e.epochs[2].writerXid='99';},e=>{e.epochs[2].operationId=proofId();},
   e=>{e.epochs[2].rootId=e.mutations.at(-1)!.id;},e=>{e.epochs[2].driverId=e.mutations.at(-1)!.id;},e=>{e.epochs[3].memberCount++;},
   e=>{e.epochs[3].receiptCount++;},e=>{e.epochs[3].eventCount++;},e=>{e.epochs[3].members.push(e.epochs[3].members[0]);e.epochs[3].memberCount++;},
   e=>{e.epochs[3].receipts.pop();e.epochs[3].receiptCount--;e.epochs[3].eventCount--;},
   e=>{e.epochs[3].id=e.receipts[0].event.id;},e=>{e.epochs[3].nativeReceiptKey=e.receipts[0].nativeReceiptKey;},
   e=>{e.epochs[3].nativeReceiptKey=e.epochs[1].nativeReceiptKey;},e=>{e.epochs[2].guard='row_guard';},e=>{e.epochs[3].phase='seal';}
  ];
  for(const [n,change] of changes.entries()){const e=copy(base);change(e);rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'),String(n));}
  // Coherent shared-epoch forgery joining TWO independent roots still denies.
  const e=f.evidence(),first=e.mutations.find(m=>m.slot==='channel-generation')!,second=e.mutations.find(m=>m.slot==='channel-grant')!;
  second.epoch=first.epoch;const own=e.epochs.find(x=>x.revision===first.epoch)!;own.members.push(second.id);own.memberCount++;
  rehashEvidence(e,f.baseline);assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));
 });

 await t.test('twenty concurrent readers distinguish complete own lineage from foreign same-workspace deltas without rebase',async()=>{
  const f=projectionFixture(),baseline=copy(f.baseline),evidence=f.evidence();
  const results=await Promise.all(Array.from({length:20},async(_,n)=>{
   const e=copy(evidence);if(n%2){e.epochs[n%e.epochs.length].writerXid='99';rehashEvidence(e,f.baseline);}
   await Promise.resolve();try{return projectV3Sources(f.plan,f.baseline,e,'seal');}catch{return null;}
  }));
  assert.equal(results.filter(Boolean).length,10);results.filter(Boolean).forEach(r=>closed(r!));assert.deepEqual(f.baseline,baseline);
  assert.equal(new Set(results.filter(Boolean).map(r=>r!.lineageDigest)).size,1);
 });

 await t.test('post-phase reader pins earlier native rows/receipts/epochs; a self-consistent rewrite cannot rebase or retry',async()=>{
  const f=projectionFixture();let current=f.evidence('reservation');
  const reader=createV3ProjectionReader({qualification:'source_only_canonical_projection_port_v3',read:async()=>({anchor:f.baseline,evidence:current})}),db={} as any;
  await reader.verify(db,f.plan,'reservation');current=f.evidence('ticket');
  const m=current.mutations[0];m.after.digest=hash('f');
  current.after.rows.find(r=>r.source===m.after.source&&r.key===m.after.key)!.digest=m.after.digest;
  for(const r of current.receipts.filter(r=>r.subjectId===m.id)){r.rowDigest=r.event.subjectDigest=m.after.digest;}
  rehashEvidence(current,f.baseline);
  // This could be a valid first observation of a different native generated
  // row, but it is NOT the previously observed immutable reservation.
  assert.doesNotThrow(()=>projectV3Sources(f.plan,f.baseline,current,'ticket'));
  await assert.rejects(reader.verify(db,f.plan,'ticket'));
  current=f.evidence('ticket');await assert.rejects(reader.verify(db,f.plan,'ticket'));
  const otherDb={} as any;await assert.rejects(reader.verify(otherDb,f.plan,'ticket'));
 });

 await t.test('phase skip/regression and mixed operation on one Db never repair the verified prefix',async()=>{
  const f=projectionFixture();let current=f.evidence('reservation');
  const reader=createV3ProjectionReader({qualification:'source_only_canonical_projection_port_v3',read:async()=>({anchor:f.baseline,evidence:current})}),db={} as any;
  await reader.verify(db,f.plan,'reservation');current=f.evidence('channel');await assert.rejects(reader.verify(db,f.plan,'channel'));
  current=f.evidence('reservation');await assert.rejects(reader.verify(db,f.plan,'reservation'));
  const clean=createV3ProjectionReader({qualification:'source_only_canonical_projection_port_v3',read:async()=>({anchor:f.baseline,evidence:current})}),another={} as any;
  await clean.verify(another,f.plan,'reservation');current=f.evidence('ticket');await clean.verify(another,f.plan,'ticket');
  current=f.evidence('reservation');await assert.rejects(clean.verify(another,f.plan,'reservation'));
 });

 await t.test('exact native receipt and Event digests cannot change between phases despite unchanged semantic fields',async()=>{
  for(const field of ['nativeReceiptKey','nativeReceiptDigest','nativeEventDigest'] as const){
   const f=projectionFixture();let current=f.evidence('reservation');const db={} as any;
   const reader=createV3ProjectionReader({qualification:'source_only_canonical_projection_port_v3',read:async()=>({anchor:f.baseline,evidence:current})});
   await reader.verify(db,f.plan,'reservation');current=f.evidence('ticket');
   current.receipts.find(r=>r.phase==='reservation')![field]=field==='nativeReceiptKey'?'projection:changed':hash('f');
   rehashEvidence(current,f.baseline);assert.doesNotThrow(()=>projectV3Sources(f.plan,f.baseline,current,'ticket'));
   await assert.rejects(reader.verify(db,f.plan,'ticket'));
  }
 });

 for(const recovery of [false,true])await t.test(`${recovery?'recovery':'first'}: same rule precommit and independent committed readback, exact replay pure`,async()=>{
  const f=projectionTransactionFixture(recovery),r=await f.issue();assert.equal(r.ok,true);closed((r as any).proof);
  assert.equal(f.stats.writes,6);assert.equal(new Set(f.calls.filter(c=>c.mode==='write').map(c=>c.id)).size,1);
  assert.notEqual(f.calls.at(-1)!.id,f.calls[0].id);assert.equal(f.calls.at(-1)!.mode,'read');
  const before=f.state(),writes=f.stats.writes,start=f.calls.length,replay=await f.issue();assert.equal(replay.ok,true);assert.equal((replay as any).replayed,true);
  assert.deepEqual(f.state(),before);assert.equal(f.stats.writes,writes);assert.ok(f.calls.slice(start).every(c=>c.mode==='read'));
 });

 for(const fault of [...v3WritePhases,'commit','false-commit'])await t.test(`${fault}: no partial committed projection and no retry/repair`,async()=>{
  const f=projectionTransactionFixture();f.faults.value=fault;const r=await f.issue();assert.equal(r.ok,false);assert.equal(r.retryable,false);assert.equal(f.state(),null);
  const writes=f.stats.writes;f.faults.value='';assert.equal((await f.issue()).ok,false);assert.equal(f.stats.writes,writes);
 });
 for(const fault of ['lost-ack','readback'])await t.test(`${fault}: preserved immutable commitment reconciles read-only`,async()=>{
  const f=projectionTransactionFixture();f.faults.value=fault;assert.equal((await f.issue()).ok,false);assert.ok(f.state());
  const before=f.state(),writes=f.stats.writes;f.faults.value='';assert.equal((await f.reconcile()).ok,true);assert.deepEqual(f.state(),before);assert.equal(f.stats.writes,writes);
 });

 await t.test('post-COMMIT changed/missing lineage or commitment cannot rebase even with internally valid hashes',async()=>{
  const f=projectionTransactionFixture();assert.equal((await f.issue()).ok,true);const writes=f.stats.writes,before=f.state();
  f.faults.readback=packet=>{packet.evidence.mutations[0].after.digest=hash('f');rehashEvidence(packet.evidence,packet.anchor);};
  assert.equal((await f.reconcile()).ok,false);assert.equal(f.stats.writes,writes);assert.deepEqual(f.state(),before);
  const g=projectionFixture(),e=g.evidence(),result=projectV3Sources(g.plan,g.baseline,e,'seal'),commitment=commitmentOf(result);
  const port={qualification:'source_only_canonical_projection_port_v3' as const,read:async()=>({anchor:g.baseline,evidence:e})};
  for(const key of Object.keys(commitment).filter(k=>k!=='version')){
   const changed:any={...commitment,[key]:key.endsWith('Fence')||key==='writerXid'?'999':hash('f')};
   await assert.rejects(createV3ProjectionReader(port).verify({} as any,g.plan,'seal',changed));
  }
 });

 await t.test('default/missing port, unknown fields, extra operation and phase replay fail closed before granting anything',async()=>{
  const f=projectionFixture(),e=f.evidence();
  await assert.rejects(createV3ProjectionReader().verify({} as any,f.plan,'seal'));
  await assert.rejects(createV3ProjectionReader({qualification:'untrusted',read:async()=>({anchor:f.baseline,evidence:e})} as any).verify({} as any,f.plan,'seal'));
  for(const through of v3WritePhases.slice(0,-1))assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,through));
  const foreign=projectionFixture();assert.throws(()=>projectV3Sources(foreign.plan,f.baseline,e,'seal'));
  assert.throws(()=>projectV3Sources(f.plan,{...f.baseline,rebase:true},e,'seal'));
  let getters=0;const invalid=Object.defineProperty(copy(e),'hidden',{enumerable:true,get(){getters++;return true;}});
  assert.throws(()=>projectV3Sources(f.plan,f.baseline,invalid,'seal'));assert.equal(getters,0);
 });

 await t.test('bounded record-ledger encoding keeps v72 record limits and rejects getters, sparse arrays and aggregate overflow',()=>{
  const f=projectionFixture();let getters=0;
  const e=f.evidence();Object.defineProperty(e.receipts,'0',{enumerable:true,get(){getters++;return null;}});
  assert.throws(()=>projectV3Sources(f.plan,f.baseline,e,'seal'));assert.equal(getters,0);
  const sparse=f.evidence();delete (sparse.receipts as any)[0];assert.throws(()=>projectV3Sources(f.plan,f.baseline,sparse,'seal'));
  const noncanonical=f.evidence();(noncanonical.receipts[0] as any).extra='e\u0301';assert.throws(()=>projectV3Sources(f.plan,f.baseline,noncanonical,'seal'));
  const large=f.evidence();(large.receipts[0] as any).extra='x'.repeat(131073);assert.throws(()=>projectV3Sources(f.plan,f.baseline,large,'seal'));
  const aggregate=f.evidence();aggregate.receipts=Array.from({length:20},()=>({...copy(aggregate.receipts[0]),extra:'x'.repeat(60000)}));
  assert.throws(()=>projectV3Sources(f.plan,f.baseline,aggregate,'seal'));
 });

 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
