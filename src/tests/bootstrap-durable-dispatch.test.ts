import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dispatchFixture} from './bootstrap-dispatch-fixture';
import {createDurableDispatchAdapter} from '../modules/api-keys/bootstrap-dispatch-prisma';
import {dispatchDigest,inspectDispatchHistory} from '../modules/api-keys/bootstrap-dispatch-contract';
import {createAttestedBootstrapComposition} from '../modules/api-keys/bootstrap-attested-composition';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

test('source-only durable bootstrap dispatch and completion',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);

 await t.test('first enrollment and recovery preserve the single attempt and all authority bindings',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=await dispatchFixture(purpose),before=f.f.state();
   await f.through('completed');assert.deepEqual(f.ledger().map(e=>e.record.state),['sealed_ready','claimed_not_sent','send_started','delivered','completion_started','completed']);
   assert.equal(f.head()?.authority.credentialEpoch,purpose==='first_enrollment'?1:2);assert.equal(f.head()?.authority.purpose,purpose);
   assert.deepEqual(f.f.state(),before);assert.equal(f.ledger().length,6);assert.equal(new Set(f.ledger().map(e=>e.writerXid)).size,6);
   const r=await f.adapter.inspect(f.scope);assert.equal(r.ok,true);for(const [k,v] of Object.entries(lifecycleFlags))assert.equal((r as any)[k],v);
   assert.equal(new Set(f.dbs).size,f.dbs.length);assert.equal(inspectDispatchHistory(f.ledger().map(e=>e.record)).length,6);
  }
 });
 await t.test('20 claims across independent factories share one committed owner',async()=>{
  const f=await dispatchFixture();await f.step('prepare');const requests=Array.from({length:20},()=>f.command('claim'));
  const results=await Promise.all(requests.map(c=>f.factory().execute(c)));assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(f.ledger().length,2);assert.equal(f.head()?.ownerEpoch,1);assert.equal(f.head()?.claimGeneration,1);
  const win=results.find(r=>r.ok)!;assert.equal(win.ok&&win.sendAuthorized,false);
 });
 await t.test('restart before send: explicit expired-lease resume advances high water and fences old owner',async()=>{
  const f=await dispatchFixture();await f.through('claimed_not_sent');const old=f.command('start_send'),oldOwner=f.head()?.ownerId;
  assert.equal((await f.factory().execute(f.command('resume'))).ok,false);
  f.at(10001);const resumed=await f.factory().execute(f.command('resume'));assert.equal(resumed.ok,true);
  assert.notEqual(f.head()?.ownerId,oldOwner);assert.equal(f.head()?.claimGeneration,2);assert.equal(f.head()?.ownerEpoch,2);
  assert.equal((await f.adapter.execute(old)).ok,false);
  assert.equal((await f.adapter.execute(f.command('start_send',{ownerId:old.ownerId,ownerEpoch:1,claimGeneration:1}))).ok,false);
  await f.step('start_send');
 });
 await t.test('restart after send or completion start: inspection is unknown and no lease expiry restores work',async()=>{
  for(const state of ['send_started','completion_started'] as const){const f=await dispatchFixture();await f.through(state);f.at(10001);
   const before=structuredClone(f.ledger()),r=await f.factory().inspect(f.scope);assert.equal(r.ok,true);
   assert.equal(r.ok&&r.reconciliationRequired,true);assert.equal(r.ok&&r.sendAuthorized,false);assert.equal(r.ok&&r.completionAuthorized,false);
   for(const action of ['claim','resume','start_send','start_complete','complete'] as const)assert.equal((await f.factory().execute(f.command(action))).ok,false,action);
   assert.deepEqual(f.ledger(),before);
  }
 });
 await t.test('lease expiry before start and between commit/readback denies send and completion permits',async()=>{
  for(const state of ['claimed_not_sent','delivered'] as const){const f=await dispatchFixture();await f.through(state);f.at(10001);
   assert.equal((await f.adapter.execute(f.command(state==='delivered'?'start_complete':'start_send'))).ok,false);
  }
  const f=await dispatchFixture();await f.through('claimed_not_sent');const base=f.deps.transaction;
  const adapter=createDurableDispatchAdapter({...f.deps,transaction:async(mode,work)=>{const r=await base(mode,work);if(mode==='write')f.at(10001);return r;}});
  const r=await adapter.execute(f.command('start_send'));assert.equal(r.ok,false);assert.equal('error'in r&&r.error,'reconciliation_required');
  assert.equal(f.head()?.state,'send_started');assert.equal((await f.factory().execute(f.command('resume'))).ok,false);
 });
 await t.test('owner, credential, host, authority and source-fence drift never grant ownership',async()=>{
  for(const cause of ['owner','credential','host','revision','fence','signature','lifecycle','issuer']){
   const f=await dispatchFixture();await f.step('prepare');const c=f.command('claim');
   if(cause==='owner')f.f.objects().find(o=>o.table==='workspaces')!.row.owner_user_id=randomUUID();
   else if(cause==='credential')f.f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row.record.target.epoch++;
   else if(cause==='host')f.f.lifecycle.find(l=>l.intent.kind==='host')!.intent.hostFingerprint='f'.repeat(64);
   else if(cause==='revision')f.f.revise();else if(cause==='fence')f.f.drift();else f.f.fault(cause);
   assert.equal((await f.adapter.execute(c)).ok,false,cause);assert.equal(f.ledger().length,1,cause);
  }
  const f=await dispatchFixture();await f.step('prepare');f.controls.atWrite=()=>f.f.drift();
  assert.equal((await f.adapter.execute(f.command('claim'))).ok,false);assert.equal(f.ledger().length,1);
 });
 await t.test('stale authority remains inspectable without mutation or writer authority',async()=>{
  for(const cause of ['expiry','revision','revoke']){const f=await dispatchFixture();await f.through('send_started');
   if(cause==='expiry')f.at(60001);else if(cause==='revision')f.f.revise();else assert.equal((await f.f.execute('terminal',{action:'revoke'})).ok,true);
   const before=structuredClone(f.ledger()),r=await f.factory().inspect(f.scope);assert.equal(r.ok,true,cause);
   assert.equal(r.ok&&r.authorityCurrent,false);assert.equal(r.ok&&r.reconciliationRequired,true);
   assert.equal((await f.factory().execute(f.command('require_reconciliation'))).ok,false);
   assert.equal((await f.factory().inspect({...f.scope,binding:{...f.scope.binding,workspaceId:randomUUID()}})).ok,false);
   assert.deepEqual(f.ledger(),before);
  }
 });
 await t.test('20 completion owners race once; final completion is idempotent only exact operation and response',async()=>{
  const f=await dispatchFixture();await f.through('delivered');const starts=Array.from({length:20},()=>f.command('start_complete'));
  const results=await Promise.all(starts.map(c=>f.factory().execute(c)));assert.equal(results.filter(r=>r.ok&&r.completionAuthorized).length,1);
  const final=f.command('complete');const completed=await f.factory().execute(final);assert.equal(completed.ok,true);
  const repeat=await f.factory().execute(final);assert.equal(repeat.ok,true);assert.equal(repeat.ok&&repeat.idempotent,true);
  assert.equal(repeat.ok&&repeat.completionAuthorized,false);assert.equal(f.ledger().length,6);
  for(const extra of [{responseDigest:'f'.repeat(64)},{completionOperationId:randomUUID()},{operationId:randomUUID()}])
   assert.equal((await f.factory().execute({...final,...extra})).ok,false);
 });
 await t.test('20 final completion writers produce one terminal append',async()=>{
  const f=await dispatchFixture();await f.through('completion_started');const commands=Array.from({length:20},()=>f.command('complete'));
  const results=await Promise.all(commands.map(c=>f.factory().execute(c)));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.ledger().length,6);
 });
 await t.test('rollback and false/lost COMMIT ACK at every normal phase never return a work permit',async()=>{
  const phases=['prepare','claim','start_send','outcome','start_complete','complete'] as const;
  for(const fault of ['insert','rollback','false','lost'])for(let i=0;i<phases.length;i++){
   const f=await dispatchFixture();for(let j=0;j<i;j++)await f.step(phases[j]);
   f.controls.phase=phases[i];f.controls.fault=fault;const r=await f.adapter.execute(f.command(phases[i]));
   assert.equal(r.ok,false,`${fault}:${phases[i]}`);assert.equal('error'in r&&r.error,'reconciliation_required');
   assert.equal(r.sendAuthorized,false);assert.equal(r.completionAuthorized,false);assert.equal('retryable'in r&&r.retryable,false);
   assert.equal(f.ledger().length,i+(fault==='lost'?1:0),`${fault}:${phases[i]}`);
   f.clear();if(fault==='lost'&&['start_send','start_complete','complete'].includes(phases[i])){
    assert.equal((await f.factory().execute(f.command('resume'))).ok,false);
   }
  }
 });
 await t.test('missing, mismatched, unavailable or invalid receipts after commit fail closed',async()=>{
  for(const fault of ['readback','missing','mismatch','receipt']){const f=await dispatchFixture();await f.through('claimed_not_sent');
   f.controls.phase='start_send';f.controls.fault=fault;const r=await f.adapter.execute(f.command('start_send'));
   assert.equal(r.ok,false,fault);assert.equal('error'in r&&r.error,fault==='receipt'?'denied':'reconciliation_required');
   assert.equal(r.sendAuthorized,false);f.clear();assert.equal((await f.factory().execute(f.command('resume'))).ok,false);
  }
 });
 await t.test('unknown and reconciliation retain history; terminal recovery closes rather than resends',async()=>{
  const f=await dispatchFixture();await f.through('send_started');await f.step('unknown');f.at(10001);
  const r=await f.factory().execute(f.command('require_reconciliation'));assert.equal(r.ok,true);
  for(const extra of [{evidenceDigest:null},{decisionId:randomUUID()},{expectedRevision:1},{expectedDigest:'f'.repeat(64)}])
   assert.equal((await f.factory().execute(f.command('reconcile',extra))).ok,false);
  await f.step('reconcile');assert.equal(f.head()?.state,'terminal_failed');await f.step('recover');assert.equal(f.head()?.state,'cancelled');
  for(const action of ['prepare','claim','resume','start_send','start_complete','complete','recover'] as const)
   assert.equal((await f.factory().execute(f.command(action))).ok,false);
  assert.deepEqual(f.ledger().map(e=>e.record.state),['sealed_ready','claimed_not_sent','send_started','delivery_unknown','reconciliation_required','terminal_failed','cancelled']);
 });
 await t.test('cancellation allowed only before possible send or after explicit terminal reconciliation',async()=>{
  for(const state of ['sealed_ready','claimed_not_sent','send_started','delivered','completion_started','completed'] as const){
   const f=await dispatchFixture();await f.through(state);const r=await f.adapter.execute(f.command('cancel'));
   assert.equal(r.ok,['sealed_ready','claimed_not_sent'].includes(state),state);
  }
 });
 await t.test('terminal transitions also fail closed on rollback and uncertain commit',async()=>{
  for(const action of ['unknown','require_reconciliation','reconcile','recover','cancel'] as const)for(const fault of ['rollback','false','lost']){
   const f=await dispatchFixture();await f.through(action==='cancel'?'claimed_not_sent':'send_started');
   if(action==='reconcile'||action==='recover')await f.step('unknown');if(action==='recover')await f.step('reconcile');
   const n=f.ledger().length;f.controls.phase=action;f.controls.fault=fault;const r=await f.adapter.execute(f.command(action));
   assert.equal(r.ok,false);assert.equal('error'in r&&r.error,'reconciliation_required');assert.equal(f.ledger().length,n+(fault==='lost'?1:0));
  }
 });
 await t.test('all status paths are read-only and absent/copied dependencies and malformed commands deny',async()=>{
  const f=await dispatchFixture();await f.through('send_started');const before=structuredClone(f.ledger()),counts=f.counts(),start=f.calls.length;
  for(let i=0;i<5;i++)assert.equal((await f.factory().inspect(f.scope)).ok,true);
  assert.deepEqual(f.ledger(),before);assert.deepEqual(f.counts(),counts);assert.ok(f.calls.slice(start).every(c=>c.mode==='read'&&!/^(INSERT|UPDATE|DELETE)\b|FOR UPDATE/.test(c.sql)));
  assert.equal((await createDurableDispatchAdapter().execute(f.command('claim'))).ok,false);
  assert.equal((await createDurableDispatchAdapter({...f.deps,decisionAuthority:{...f.reader}}).execute(f.command('claim'))).ok,false);
  for(const extra of [{force:true},{endpoint:'https://invalid.example'},{authority:{}},{leaseMs:30001},{operationId:'invalid'}])
   assert.equal((await f.adapter.execute({...f.command('claim'),...extra})).ok,false);
  for(const guard of ['missing','disabled','body']){f.controls.guard=guard;assert.equal((await f.adapter.inspect(f.scope)).ok,false);}f.controls.guard='';
  f.controls.doubleCallback=true;assert.equal((await f.factory().inspect(f.scope)).ok,false);f.controls.doubleCallback=false;
  f.controls.fabricated=true;assert.equal((await f.factory().inspect(f.scope)).ok,false);
 });
 await t.test('history tampering, ABA, digest/fence changes and missing Events are rejected',async()=>{
  for(const mutate of [(e:any[])=>e.pop(),(e:any[])=>e[1].record.ownerEpoch=0,(e:any[])=>e[1].record.claimGeneration=0,
   (e:any[])=>e[1].record.previousDigest='f'.repeat(64),(e:any[])=>e[1].fence='1',(e:any[])=>e[1].verified=false,
   (e:any[])=>e[1].eventId=e[0].eventId]){
   const f=await dispatchFixture();await f.through('claimed_not_sent');const stale=f.command('start_send');mutate(f.ledger());
   assert.equal((await f.factory().execute(stale)).ok,false);
  }
 });
 await t.test('durable composition: 20 restarted factory callers exchange and complete exactly once',async()=>{
  const f=await dispatchFixture();await f.through('claimed_not_sent');const h=f.head()!;let exchanged=0,completed=0;
  const deps={qualification:'synthetic_durable_composition_v1' as const,dispatch:f.adapter,
   exchange:async()=>{exchanged++;assert.equal(f.head()?.state,'send_started');return {publicSyntheticResponse:true};},
   complete:async()=>{completed++;assert.equal(f.head()?.state,'completion_started');}};
  const q={...f.scope,ownerId:h.ownerId,ownerEpoch:h.ownerEpoch,claimGeneration:h.claimGeneration,expectedRevision:h.revision,expectedDigest:dispatchDigest(h)};
  const results=await Promise.all(Array.from({length:20},()=>createAttestedBootstrapComposition({...deps,dispatch:f.factory()}).runClaimed(q)));
  assert.equal(results.filter(r=>r.ok).length,1);assert.equal(exchanged,1);assert.equal(completed,1);assert.equal(f.head()?.state,'completed');
  assert.equal((await createAttestedBootstrapComposition(deps).runClaimed(q)).ok,false);assert.equal(exchanged,1);
  assert.equal((await createAttestedBootstrapComposition({...deps,dispatch:{...f.adapter}}).runClaimed(q)).ok,false);
 });
 await t.test('exchange/completion loss and lost start ACK never retry external effects',async()=>{
  for(const fault of ['exchange','completion','start_send','start_complete']){const f=await dispatchFixture();await f.through('claimed_not_sent');let sends=0,completes=0;
   if(fault.startsWith('start_')){f.controls.phase=fault;f.controls.fault='lost';}
   const h=f.head()!,deps={qualification:'synthetic_durable_composition_v1' as const,dispatch:f.adapter,
    exchange:async()=>{sends++;if(fault==='exchange')throw Error('synthetic loss');return {synthetic:true};},
    complete:async()=>{completes++;if(fault==='completion')throw Error('synthetic completion loss');}};
   const q={...f.scope,ownerId:h.ownerId,ownerEpoch:h.ownerEpoch,claimGeneration:h.claimGeneration,expectedRevision:h.revision,expectedDigest:dispatchDigest(h)};
   assert.equal((await createAttestedBootstrapComposition(deps).runClaimed(q)).ok,false);f.clear();
   assert.equal((await createAttestedBootstrapComposition({...deps,dispatch:f.factory()}).runClaimed(q)).ok,false);
   assert.equal(sends,fault==='start_send'?0:1);assert.equal(completes,fault==='completion'?1:0);
  }
 });
 await t.test('no runtime process latch, DB/network/process/key effects or default composition',()=>{
  const source=readFileSync('src/modules/api-keys/bootstrap-attested-composition.ts','utf8');assert.ok(!source.includes('attempted'));
  for(const path of ['bootstrap-dispatch-prisma','bootstrap-durable-composition']){
   const text=readFileSync(`src/modules/api-keys/${path}.ts`,'utf8');assert.doesNotMatch(text,/new PrismaClient|process\.env|https?:\/\/|\bfetch\(|\bconnect\(/);
  }
  assert.equal(effects,0);
 });
});
